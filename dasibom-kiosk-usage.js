/* ════════ 다시봄 돌봄 — 어르신 콘텐츠 이용 측정 ════════
   왜: 센터 리포트에 '팩트에 의한 값만' 넣기 위함(Macho 지시 2026-07-15).
       감정점수·인지관찰 같은 AI 추측은 걷어냈고, 대신 실제로 측정 가능한
       '무엇을 얼마나 이용했는가'를 기록한다.

   언제만 기록하나 — 아래 둘 다일 때만:
     · sessionStorage.dasibom_kiosk_browse = '1'  (센터 태블릿의 구경 모드)
     · sessionStorage.dasibom_active_senior       (어느 어르신인지 확정)
   → 일반 개인 사용자(휴대폰)는 절대 기록하지 않는다.

   ★동의 범위: careconsent.html의 '서비스 이용 기록(이용한 콘텐츠·이용 시간)' 항목.
     대화 '내용'은 여기서 안 다룸(그건 care_sessions). 여기 남는 건 카드명·시간뿐.

   '이용 시간'의 정의(정직하게):
     화면이 보이는 상태 + 최근 60초 안에 실제 조작이 있었을 때만 초를 센다.
     태블릿을 켜둔 채 방치한 시간은 이용으로 치지 않는다.

   저장: care_usage/{centerId}_{seniorId}_{day}_{card}  (어르신·카드·날짜별 1문서)
        { centerId, seniorId, seniorName, card, day, seconds↑, visits↑, updatedAt }
   ═══════════════════════════════════════════════════════ */
(function () {
  if (window.__dsbUsage) return; window.__dsbUsage = true;

  // 경로 → 카드 이름(리포트에 그대로 표시. 헤더 제목과 같은 이름으로 통일)
  var CARDS = {
    '/nostalgia': '그때 그 시절', '/trendy': '말동무 사전', '/health': '건강 돋보기',
    '/arcade': '추억의 오락실', '/matgo': '봄이와 맞고', '/game': '오늘의 뇌 건강',
    '/library': '다시봄 서재', '/letter': '마음의 유언', '/people': '인물 지도',
    '/memoir': '나의 자서전', '/dream': '봄이의 꿈 풀이', '/gag': '오늘의 아재퀴즈',
    '/maeum': '마음결 성향 백서', '/debate': '대환장 토론장', '/maeumlab': '마음 실험실'
  };
  function cardName() {
    var p = (location.pathname || '').replace(/\/+$/, '') || '/';
    if (CARDS[p]) return CARDS[p];
    for (var k in CARDS) if (p.indexOf(k + '/') === 0) return CARDS[k];   // 하위경로(파일럿 등)
    return null;                                                          // 홈 등 카드가 아니면 기록 안 함
  }

  function senior() {
    try {
      if (sessionStorage.getItem('dasibom_kiosk_browse') !== '1') return null;
      var raw = sessionStorage.getItem('dasibom_active_senior');
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && s.id && s.centerId) ? s : null;
    } catch (e) { return null; }
  }

  var S = senior(), CARD = cardName();
  if (!S || !CARD) return;   // 개인 사용자거나 카드가 아니면 아무것도 안 함

  var day = (function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  var docId = [S.centerId, S.id, day, CARD].join('_').replace(/\//g, '-');

  var lastAct = Date.now(), pending = 0, firstFlush = true;
  ['pointerdown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true, capture: true });
  });

  // 10초마다: 보이는 중 + 최근 60초 내 조작이 있었으면 10초 적립
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastAct > 60000) return;   // 방치 시간은 제외
    pending += 10;
  }, 10000);

  // firestore 모듈 자립 — 파일럿(React)엔 firestore-compat이 안 실려 있음(가이드는 app/auth/functions만 로드).
  // 없으면 조용히 기록이 안 되므로 여기서 직접 채운다. app 초기화·로그인은 bom_voice.js의 부트가 처리.
  (function ensureFirestore() {
    var n = 0;
    var iv = setInterval(function () {
      try {
        if (window.firebase && typeof firebase.initializeApp === 'function' && typeof firebase.firestore !== 'function'
            && !document.querySelector('script[src*="firebase-firestore-compat"]')) {
          var s = document.createElement('script');
          s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
          s.async = false; document.head.appendChild(s);
        }
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') { clearInterval(iv); return; }
      } catch (e) {}
      if (++n > 40) clearInterval(iv);
    }, 300);
  })();

  function fbOk() {
    try { return !!(window.firebase && firebase.apps && firebase.apps.length && typeof firebase.firestore === 'function' && firebase.auth().currentUser); } catch (e) { return false; }
  }
  function flush() {
    if (!pending && !firstFlush) return;
    if (!fbOk()) return;
    var add = pending; pending = 0;
    var wasFirst = firstFlush; firstFlush = false;
    var FV = firebase.firestore.FieldValue;
    var payload = {
      centerId: S.centerId, seniorId: S.id, seniorName: S.name || '', card: CARD, day: day,
      seconds: FV.increment(add), updatedAt: FV.serverTimestamp()
    };
    if (wasFirst) payload.visits = FV.increment(1);   // 이 카드 진입 1회
    firebase.firestore().collection('care_usage').doc(docId)
      .set(payload, { merge: true })
      .catch(function (e) { pending += add; firstFlush = wasFirst; try { console.warn('[이용기록] 실패', e.code || e.message); } catch (_) {} });
  }

  // 진입 기록은 firebase 준비되면 바로, 이후 30초마다 + 화면 벗어날 때
  (function waitFb(n) {
    if (fbOk()) { flush(); return; }
    if ((n || 0) > 60) return;
    setTimeout(function () { waitFb((n || 0) + 1); }, 300);
  })(0);
  setInterval(flush, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
})();
