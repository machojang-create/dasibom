/* ════════ 다시봄 봄이 팝업 브랜딩 — 공용 모듈 (2026-07-17) ════════
   팝업(모달)이 뜨면 봄이가 **좌측 상단 모서리에 살짝 걸쳐** 고개를 내민다.
   봄이를 마스코트가 아니라 '브랜딩'으로 넓히기 위한 공용 규칙(Macho 지시).

   ★왜 fixed로 띄우나: 모달 박스들이 대부분 overflow-y:auto(내용 스크롤)라,
     박스 안에 음수 좌표로 넣으면 봄이가 잘린다. 게다가 박스 클래스명이 페이지마다
     제각각(.mm-box / .modal / …)이라 CSS만으론 통일 불가. → 박스 바깥(body)에
     fixed로 띄우고 박스 모서리를 따라다니게 한다(어떤 모달 구현에도 안 깨짐).

   사용법(페이지당 두 줄):
     <script src="/dasibom-bompop.js"></script>
     <script>BomPop.bind({ overlay:'#mmOverlay', box:'.mm-box', face:'bom_smile' });</script>
   opts: overlay(열림을 나타내는 요소) · box(모서리를 따라갈 상자) · openClass(기본 'on')
         · face(bom_smile·bom_grin·bom_wink·bom_calm …) · offset {x,y}
   ══════════════════════════════════════════════════════════ */
(function () {
  if (window.BomPop) return;

  var CSS =
    '.dsb-bompop{position:fixed;z-index:99998;width:78px;height:78px;border-radius:50%;padding:3px;' +
    'background:conic-gradient(from 210deg,#E3CE9C,#C9A961 40%,#F0E3C2 60%,#C9A961 85%,#E3CE9C);' +
    'box-shadow:0 10px 24px -10px rgba(60,45,10,.55);pointer-events:none;opacity:0;' +
    'transform:translateY(8px) scale(.8) rotate(-10deg);transition:opacity .28s ease,transform .34s cubic-bezier(.2,.9,.3,1.5);display:none}' +
    '.dsb-bompop.on{display:block;opacity:1;transform:translateY(0) scale(1) rotate(-8deg)}' +
    '.dsb-bompop img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center top;' +
    'background:#fff;border:2.5px solid #fff;display:block}' +
    '@media(max-width:480px){.dsb-bompop{width:62px;height:62px}}' +
    '@media (prefers-reduced-motion:reduce){.dsb-bompop{transition:none}}';

  var el = null, imgEl = null, curBox = null, raf = null;

  function ensure() {
    if (el) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('span'); el.className = 'dsb-bompop';
    imgEl = document.createElement('img'); imgEl.alt = '봄이';
    el.appendChild(imgEl); document.body.appendChild(el);
  }

  function place(box, off) {
    var r = box.getBoundingClientRect();
    if (!r.width) return;
    var size = el.offsetWidth || 78;
    // 좌측 상단 모서리에 살짝 걸치도록 — 박스 바깥으로 살짝 넘겨 배치
    el.style.left = Math.max(4, r.left - (off && off.x != null ? off.x : size * 0.34)) + 'px';
    el.style.top  = Math.max(4, r.top  - (off && off.y != null ? off.y : size * 0.42)) + 'px';
  }

  // 모달 내용이 바뀌며 크기·위치가 변할 수 있어 열려 있는 동안만 따라다닌다
  function track(box, off) {
    if (raf) cancelAnimationFrame(raf);
    (function loop() {
      if (!curBox) return;
      place(box, off);
      raf = requestAnimationFrame(loop);
    })();
  }

  var BomPop = {
    show: function (box, face, off) {
      if (!box) return;
      ensure();
      imgEl.src = '/img/' + (face || 'bom_smile') + '.png';
      curBox = box;
      place(box, off);
      el.classList.add('on');
      track(box, off);
    },
    hide: function () {
      curBox = null;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (el) el.classList.remove('on');
    },
    /* 오버레이의 열림(클래스 토글)을 지켜보다가 자동으로 붙였다 뗀다 */
    bind: function (opts) {
      opts = opts || {};
      var openClass = opts.openClass || 'on';
      function start() {
        var ov = typeof opts.overlay === 'string' ? document.querySelector(opts.overlay) : opts.overlay;
        if (!ov) return;
        function sync() {
          var open = ov.classList.contains(openClass);
          // ★박스는 반드시 이 오버레이 안에서 찾는다 — 한 페이지에 같은 클래스(.mm-box 등)를
          //   쓰는 팝업이 여러 개라 document 전역에서 찾으면 숨겨진 다른 팝업을 잡는다.
          var box = typeof opts.box === 'string' ? ov.querySelector(opts.box) : opts.box;
          if (open && box) BomPop.show(box, (typeof opts.face === 'function' ? opts.face() : opts.face), opts.offset);
          // ★내 팝업이 띄운 봄이일 때만 거둔다 — 다른 팝업이 열려 있는데 뺏으면 안 됨
          else if (curBox && ov.contains(curBox)) BomPop.hide();
        }
        new MutationObserver(sync).observe(ov, { attributes: true, attributeFilter: ['class', 'style'] });
        sync();
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    }
  };
  window.BomPop = BomPop;
})();
