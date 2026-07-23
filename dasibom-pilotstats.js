// 다시봄 공용 '함께한 이웃' 참여 통계 ─────────────────────────────────────────
// 사용법: 페이지에서 window.DSB_STATS = { storeKey, docId, typeOf, msg } 정의 후 이 스크립트 로드.
//   storeKey: 결과가 쌓이는 localStorage 배열 키 (예: 'mindlab_past_results')
//   docId:    pilot_stats 문서 아이디 (예: 'maeumlab_' + 오늘)
//   typeOf:   (항목) => 유형 문자열(없으면 null) — 유형별 집계용
//   msg:      (n) => 배지 문구
// 원리: 3초마다 결과 배열 길이를 살펴 새 결과가 생기면 동네 카운트 +1, 따뜻한 배지로 알려준다.
(function () {
  var CFG = window.DSB_STATS; if (!CFG || !CFG.storeKey || !CFG.docId) return;
  var SEEN_KEY = 'dsb_stats_seen_' + CFG.storeKey;

  function ensureFs(cb, tries) {
    tries = tries || 0;
    if (window.firebase && typeof firebase.firestore === 'function') { cb(firebase.firestore()); return; }
    if (window.firebase && firebase.app && !document.getElementById('dsb-stats-fs')) {
      var sc = document.createElement('script'); sc.id = 'dsb-stats-fs';
      sc.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
      document.head.appendChild(sc);
    }
    if (tries > 60) return;
    setTimeout(function () { ensureFs(cb, tries + 1); }, 300);
  }
  function withUid(cb) {
    var un = firebase.auth().onAuthStateChanged(function (u) { un();   // 소셜 세션 보호
      if (u) cb(u.uid);
      else firebase.auth().signInAnonymously().then(function (r) { cb(r.user.uid); }).catch(function () {});
    });
  }
  function badge(text) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:110px;z-index:9997;background:#143D2E;color:#FFF6E9;border-radius:50px;padding:12px 22px;font-weight:800;font-size:15px;box-shadow:0 10px 28px rgba(0,0,0,.28);font-family:inherit;opacity:0;transition:opacity .4s;max-width:88vw;text-align:center';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '1'; }, 50);
    setTimeout(function () { el.style.opacity = '0'; }, 4600);
    setTimeout(function () { el.remove(); }, 5200);
  }
  function arrLen() {
    try { var a = JSON.parse(localStorage.getItem(CFG.storeKey) || '[]'); return Array.isArray(a) ? a.length : 0; } catch (e) { return 0; }
  }
  function latest() {
    try { var a = JSON.parse(localStorage.getItem(CFG.storeKey) || '[]'); return a[0] || a[a.length - 1] || null; } catch (e) { return null; }
  }

  ensureFs(function (fs) {
    withUid(function () {
      var seen = parseInt(localStorage.getItem(SEEN_KEY) || '', 10);
      if (isNaN(seen)) { seen = arrLen(); localStorage.setItem(SEEN_KEY, String(seen)); }   // 기존 기록은 셈에서 제외
      setInterval(function () {
        var n = arrLen();
        if (n <= seen) return;
        seen = n; localStorage.setItem(SEEN_KEY, String(seen));
        var upd = { count: firebase.firestore.FieldValue.increment(1) };
        var t = null;
        try { t = CFG.typeOf ? CFG.typeOf(latest()) : null; } catch (e) {}
        if (t) upd['t_' + String(t).slice(0, 24)] = firebase.firestore.FieldValue.increment(1);
        var ref = fs.collection('pilot_stats').doc(CFG.docId);
        ref.update(upd).catch(function () {
          var base = { count: 1 }; if (t) base['t_' + String(t).slice(0, 24)] = 1;
          ref.set(base).catch(function () {});
        });
        setTimeout(function () {
          ref.get().then(function (d) {
            var c = (d.exists && d.data().count) || 1;
            badge(CFG.msg ? CFG.msg(c) : ('🌸 오늘 ' + c + '번째로 함께했어요'));
          }).catch(function () {});
        }, 1200);
      }, 3000);
    });
  });
})();
