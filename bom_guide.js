/* ════════ 봄이 컨텐츠 가이드 — 공용 모듈 ════════
   페이지 사용법:
     1) <script src="bom_guide.js?v=1" defer></script>
     2) window.BOM_GUIDES = { 키: {face:'bom_grin.png', title:'...', text:'...'}, ... };
     3) 안내할 버튼/링크에 data-bomguide="키"
   동작: 해당 버튼 '최초 터치' 시 봄이 가이드 팝업 → 알겠어요 누르면 원래 동작(클릭/이동) 실행.
   1회만: localStorage 'dasibom_tut_<키>' (홈 컨텐츠 가이드와 키 공유 가능).
   ════════════════════════════════════════════ */
(function () {
  if (window.__bomGuideLoaded) return;
  window.__bomGuideLoaded = true;

  var CSS =
    '.bgz-ov{position:fixed;inset:0;z-index:9000;background:rgba(28,38,30,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:24px}' +
    '.bgz-ov.on{display:flex}' +
    '.bgz-card{position:relative;background:#fff;border-radius:26px;max-width:360px;width:100%;padding:30px 24px 24px;text-align:center;box-shadow:0 24px 60px -18px rgba(0,0,0,.45);animation:bgzPop .34s cubic-bezier(.2,.9,.3,1.2);font-family:inherit}' +
    '@keyframes bgzPop{from{opacity:0;transform:translateY(22px) scale(.93)}to{opacity:1;transform:none}}' +
    '.bgz-face{width:98px;height:98px;object-fit:contain;margin:-70px auto 8px;display:block;filter:drop-shadow(0 8px 16px rgba(0,0,0,.2))}' +
    '.bgz-title{font-size:20px;font-weight:800;color:#143D2E;margin-bottom:11px}' +
    '.bgz-text{font-size:calc(15.5px * var(--ts,1));line-height:1.85;color:#485a4d;margin-bottom:22px}' +
    '.bgz-ok{width:100%;padding:15px;border:none;border-radius:50px;background:linear-gradient(145deg,#13d3a6,#0e9d7d);color:#fff;font-size:16.5px;font-weight:800;cursor:pointer;font-family:inherit}' +
    '.bgz-ok:active{transform:scale(.98)}' +
    'body.dark .bgz-card,html.dsb-dark .bgz-card{background:#262E26}' +
    'body.dark .bgz-title{color:#EFE6D0}body.dark .bgz-text{color:#c8bba4}';

  var ov, faceEl, titleEl, textEl, okBtn, _pendingEl = null;

  function seen(k) { try { return !!localStorage.getItem('dasibom_tut_' + k); } catch (e) { return false; } }
  function markSeen(k) { try { localStorage.setItem('dasibom_tut_' + k, '1'); } catch (e) {} }

  function ensure() {
    if (ov) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    ov = document.createElement('div'); ov.className = 'bgz-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML =
      '<div class="bgz-card"><img class="bgz-face" alt="봄이">' +
      '<div class="bgz-title"></div><div class="bgz-text"></div>' +
      '<button type="button" class="bgz-ok">알겠어요 🌸</button></div>';
    document.body.appendChild(ov);
    faceEl = ov.querySelector('.bgz-face'); titleEl = ov.querySelector('.bgz-title');
    textEl = ov.querySelector('.bgz-text'); okBtn = ov.querySelector('.bgz-ok');
    okBtn.addEventListener('click', function () { var el = _pendingEl; close(); if (el) { try { el.click(); } catch (e) {} } });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  }
  function open(k, el) {
    var g = (window.BOM_GUIDES || {})[k]; if (!g) return false;
    ensure();
    faceEl.src = 'img/' + (g.face || 'bom_smile.png');
    titleEl.textContent = g.title || '';
    textEl.textContent = g.text || '';
    _pendingEl = el || null;
    ov.classList.add('on'); ov.setAttribute('aria-hidden', 'false');
    return true;
  }
  function close() { if (ov) { ov.classList.remove('on'); ov.setAttribute('aria-hidden', 'true'); } _pendingEl = null; }

  // 모든 data-bomguide 요소 — 최초 터치 가로채기(캡처). 동적 생성 버튼도 위임으로 자동 적용.
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-bomguide]');
    if (!t) return;
    var k = t.getAttribute('data-bomguide');
    if (!k || seen(k)) return;                       // 이미 본 것 → 원래 동작 그대로
    if (!(window.BOM_GUIDES || {})[k]) return;       // 가이드 텍스트 미정의 → 통과
    e.preventDefault(); e.stopPropagation();
    markSeen(k); open(k, t);
  }, true);

  window.BomGuide = { open: open, reset: function (k) { try { localStorage.removeItem('dasibom_tut_' + k); } catch (e) {} } };
})();
