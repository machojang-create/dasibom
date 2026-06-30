/* ════════════════════════════════════════════════════════════════
   다시봄 안부 신호 (attend.js) — B2G 출석 기록
   기획: "접속해서 무엇이든 활동하면 그날 출석 = 안부 신호"
   · 로그인(익명 포함) 사용자의 오늘 첫 방문을 users/{uid}에 기록
     { lastActiveAt: serverTimestamp, lastActiveDay: 'YYYY-MM-DD' }
   · 하루 1회(localStorage 가드), 실패는 무음(다음 방문에 재시도)
   · firebase가 없는 페이지에선 조용히 무동작
   · 관리자 안부 안전망(신호등)이 lastActiveDay로 판정(실데이터 연동 시)
   ════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__dsbAttend) return; window.__dsbAttend = true;

  function ok() {
    return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0
        && typeof firebase.auth === 'function' && typeof firebase.firestore === 'function';
  }

  function hook() {
    firebase.auth().onAuthStateChanged(function (u) {
      if (!u) return;
      var day = new Date().toISOString().slice(0, 10);
      try { if (localStorage.getItem('dasibom_attend_day') === day) return; } catch (e) {}
      firebase.firestore().collection('users').doc(u.uid)
        .set({
          lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastActiveDay: day,
          visitCount: firebase.firestore.FieldValue.increment(1) // 하루 1회 가드라 = 누적 '방문일수'
        }, { merge: true })
        .then(function () { try { localStorage.setItem('dasibom_attend_day', day); } catch (e) {} })
        .catch(function () { /* 오프라인·규칙 거부 시 조용히 통과 */ });
    });
  }

  // firebase 초기화가 늦는 페이지(자서전 등) 대비: 최대 ~12초 폴링 후 포기
  var tries = 0;
  (function poll() {
    if (ok()) { hook(); return; }
    if (++tries < 24) setTimeout(poll, 500);
  })();
})();
