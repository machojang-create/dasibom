/* ════════ 다시봄 포인트 — 클라이언트 공용 모듈 (2026-07-18) ════════
   ★포인트는 서버(Functions)에서만 지급된다. 이 모듈은 '요청'만 하고 잔액을 보여줄 뿐,
     스스로 포인트를 만들지 않는다(만들어도 규칙이 막음).

   콘텐츠 페이지에서:
     <script src="/dasibom-points.js?v=1"></script>
     // 사용자가 '실제 행동'을 한 뒤 한 줄:
     DasibomPoints.earn('nostalgia');   // 하루 1회/콘텐츠, 지급되면 토스트로 +10 표시
   키(서버 지급표와 일치): attend·memoir·brain·arcade·matgo·nostalgia·trendy·
     dream·maeum·gag·debate·maeumlab
   ※건강돋보기(health)는 지급/공유 없음(법적 리스크 — release_blockers #4).

   공유 적립: 페이지 URL에 ?ref=<토큰>이 있으면(친구가 보낸 링크로 들어온 것),
   로드 시 자동으로 claimReferral 호출 → 공유자에게 포인트(수신자는 1회만 집계).
   내 공유 링크는 DasibomPoints.refLink(cb) 로 발급.
   ══════════════════════════════════════════════════════════ */
(function () {
  if (window.DasibomPoints) return;

  function fn(name) {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.functions === 'function')
        return firebase.app().functions('asia-northeast3').httpsCallable(name);
    } catch (e) {}
    return null;
  }
  // firebase 준비(익명 로그인 포함)될 때까지 대기 후 콜백. 대부분 페이지는 bom_voice.js가 부팅.
  function whenReady(cb, tries) {
    tries = tries || 0;
    try {
      if (window.firebase && firebase.apps && firebase.apps.length &&
          typeof firebase.functions === 'function' && firebase.auth && firebase.auth().currentUser) {
        return cb();
      }
    } catch (e) {}
    if (tries > 50) return;            // ~10초 후 포기(조용히)
    setTimeout(function () { whenReady(cb, tries + 1); }, 200);
  }

  var _t;
  function toast(msg) {
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#33492A;color:#F5F1E8;' +
        'padding:13px 22px;border-radius:50px;font-size:15px;font-weight:800;z-index:99999;box-shadow:0 12px 28px -12px rgba(0,0,0,.5);' +
        "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:88vw;text-align:center;opacity:0;transition:opacity .3s";
      document.body.appendChild(d);
      requestAnimationFrame(function () { d.style.opacity = '1'; });
      clearTimeout(_t); _t = setTimeout(function () { d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 300); }, 2600);
    } catch (e) {}
  }

  var DasibomPoints = {
    // 콘텐츠 이용 적립(하루 1회/콘텐츠). silent=true면 토스트 없이.
    earn: function (event, opt) {
      opt = opt || {};
      // 하루 1회는 서버가 최종 판정하지만, 로컬 플래그로 불필요한 호출을 줄임
      var day = new Date().toISOString().slice(0, 10);
      var lk = 'dsbpt_' + event + '_' + day;
      try { if (localStorage.getItem(lk)) return; } catch (e) {}
      whenReady(function () {
        var f = fn('awardPoints'); if (!f) return;
        f({ event: event }).then(function (r) {
          try { localStorage.setItem(lk, '1'); } catch (e) {}   // 오늘은 더 안 부름(지급/이미받음 무관)
          var d = r && r.data;
          if (d && d.ok && d.awarded && !opt.silent) toast('🌸 다시봄 포인트 +' + d.awarded);
        }).catch(function () {});
      });
    },
    // 잔액 조회(본인 users 문서 읽기 — 규칙상 읽기 허용)
    balance: function (cb) {
      whenReady(function () {
        try {
          var uid = firebase.auth().currentUser.uid;
          firebase.firestore().collection('users').doc(uid).get().then(function (d) {
            cb((d.exists && d.data().dsbPoints) || 0);
          }).catch(function () { cb(null); });
        } catch (e) { cb(null); }
      });
    },
    // 내 공유 링크(?ref=토큰 포함) 발급
    refLink: function (cb) {
      whenReady(function () {
        var f = fn('createRefLink'); if (!f) { cb(null); return; }
        f({}).then(function (r) {
          var t = r && r.data && r.data.token;
          cb(t ? (location.origin + '/?ref=' + t) : null);
        }).catch(function () { cb(null); });
      });
    }
  };

  // ── 공유 유입 자동 처리: ?ref= 있으면 저장했다가 로그인 후 1회 claim ──
  function handleReferral() {
    var t = null;
    try {
      t = new URLSearchParams(location.search).get('ref');
      if (t) localStorage.setItem('dsb_ref', t);
      else t = localStorage.getItem('dsb_ref');
      if (!t || !/^[a-f0-9]{18}$/.test(t)) return;
      if (localStorage.getItem('dsb_ref_claimed')) return;   // 이 기기는 이미 처리
    } catch (e) { return; }
    whenReady(function () {
      var f = fn('claimReferral'); if (!f) return;
      f({ token: t }).then(function () {
        try { localStorage.setItem('dsb_ref_claimed', '1'); } catch (e) {}  // 성공/실패 무관 1회로 종결
      }).catch(function () {});
    });
  }

  window.DasibomPoints = DasibomPoints;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', handleReferral);
  else handleReferral();
})();
