// 다시봄 공용 '기기연동 안내'(2026-07-24 Macho) ─────────────────────────────
// 육성 콘텐츠(맞고·화분·어항)는 로그인 계정에 저장돼야 폰을 바꿔도·웹에서도 이어진다.
// 그런데 비로그인(익명) 사용자는 기기마다 계정이 달라 이 좋은 기능을 모른다.
// → 익명 사용자에게만, 딱 한 번, 부드럽게 안내한다. (로그인 유도만 — auth는 절대 안 건드림)
//
// 사용: 페이지에 window.SYNC_NUDGE = { app:'matgo'|'plant'|'guppy', what:'정원'|'어항'|'맞고 기록' } 정의 후 이 스크립트 로드.
//   ★소셜 세션 보호: 로그인 복원(최대 4.5초)을 기다렸다가, '끝까지 익명일 때만' 배너를 띄운다.
//     절대 signInAnonymously를 부르지 않는다(카카오/네이버 세션을 익명으로 갈아치우면 데이터가 남의 것이 됨).
(function () {
  var CFG = window.SYNC_NUDGE || {};
  var APP = CFG.app || 'game';
  var WHAT = CFG.what || '기록';
  var SEEN_KEY = 'dsb_syncnudge_' + APP;   // 한 번 닫으면 다시 안 뜬다(시니어 UX: 안내는 1회)
  try { if (localStorage.getItem(SEEN_KEY)) return; } catch (e) {}

  // firebase.auth 준비 대기(다른 스크립트가 로드). 없으면 조용히 종료.
  function whenAuth(cb, tries) {
    tries = tries || 0;
    if (window.firebase && firebase.auth && typeof firebase.auth === 'function') { cb(); return; }
    if (tries > 40) return;   // 10초 안에 firebase 없으면 포기
    setTimeout(function () { whenAuth(cb, tries + 1); }, 250);
  }

  whenAuth(function () {
    // 소셜 로그인 복원을 기다린다 — 로그인 유저면 배너를 아예 안 띄운다.
    var decided = false, waited = 0;
    var timer = setInterval(function () {
      var u = firebase.auth().currentUser;
      waited += 300;
      if (u && !u.isAnonymous) { decided = true; clearInterval(timer); return; }   // 로그인 유저 → 안내 불필요
      if (waited >= 4500 && !decided) {   // 4.5초까지 기다려도 로그인 아님 → 익명으로 확정
        decided = true; clearInterval(timer);
        showBanner();
      }
    }, 300);
  });

  function showBanner() {
    if (document.getElementById('dsbSyncNudge')) return;
    var css = document.createElement('style'); css.textContent =
      '#dsbSyncNudge{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(140%);z-index:9994;' +
      'width:min(92vw,420px);background:#143D2E;color:#FFF6E9;border-radius:18px;padding:14px 16px;' +
      'box-shadow:0 14px 40px -10px rgba(0,0,0,.5);font-family:inherit;transition:transform .45s cubic-bezier(.2,1.1,.4,1);' +
      'display:flex;align-items:center;gap:12px}' +
      '#dsbSyncNudge.on{transform:translateX(-50%) translateY(0)}' +
      '#dsbSyncNudge .sn-emoji{font-size:30px;flex-shrink:0}' +
      '#dsbSyncNudge .sn-body{flex:1;min-width:0}' +
      '#dsbSyncNudge .sn-title{font-weight:900;font-size:15px;margin-bottom:2px;letter-spacing:-.01em}' +
      '#dsbSyncNudge .sn-sub{font-size:12.5px;opacity:.9;line-height:1.45;word-break:keep-all}' +
      '#dsbSyncNudge .sn-go{flex-shrink:0;background:#F5C24B;color:#3A2A00;font-weight:900;font-size:13px;border:0;' +
      'border-radius:12px;padding:9px 12px;cursor:pointer;font-family:inherit;white-space:nowrap}' +
      '#dsbSyncNudge .sn-x{position:absolute;top:6px;right:9px;background:none;border:0;color:#FFF6E9;opacity:.6;' +
      'font-size:18px;cursor:pointer;line-height:1;padding:2px 6px}';
    document.head.appendChild(css);

    var el = document.createElement('div'); el.id = 'dsbSyncNudge';
    el.innerHTML =
      '<button class="sn-x" aria-label="닫기">✕</button>' +
      '<span class="sn-emoji">🔒</span>' +
      '<div class="sn-body">' +
        '<div class="sn-title">로그인하면 폰을 바꿔도 그대로예요</div>' +
        '<div class="sn-sub">지금은 이 기기에만 ' + WHAT + '이 저장돼요. 로그인하면 다른 기기·웹에서도 이어서 즐길 수 있어요.</div>' +
      '</div>' +
      '<button class="sn-go">로그인</button>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('on'); }); });

    function dismiss() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} el.classList.remove('on'); setTimeout(function () { el.remove(); }, 500); }
    el.querySelector('.sn-x').addEventListener('click', dismiss);
    el.querySelector('.sn-go').addEventListener('click', function () { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} location.href = '/?login=1'; });
    // 20초 두면 조용히 접힘(닫음으로 기록하진 않음 — 다음에 한 번 더 볼 기회)
    setTimeout(function () { if (document.body.contains(el) && el.classList.contains('on')) { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 500); } }, 20000);
  }
})();
