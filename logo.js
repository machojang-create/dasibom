// 다시봄 공용 로고 — 나중에 이 파일 하나만 수정하면 전 페이지 교체됩니다.
(function(){
  // 다시봄 꽃 로고(2026-07-22 교체) — img/dasibom_flower_logo.svg와 동일 도형
  var SVG = '<svg width="34" height="34" viewBox="0 0 512 512" style="flex-shrink:0">'
    +'<defs><linearGradient id="dsbPetal" x1="0" y1="0" x2="0.9" y2="1">'
    +'<stop offset="0" stop-color="#FFD95E"/><stop offset="0.55" stop-color="#FFC531"/><stop offset="1" stop-color="#F5A800"/>'
    +'</linearGradient><linearGradient id="dsbLeaf" x1="0" y1="0" x2="1" y2="1">'
    +'<stop offset="0" stop-color="#AACD3E"/><stop offset="1" stop-color="#7FAF22"/></linearGradient></defs>'
    +'<path d="M 268 296 C 258 372 226 420 172 446" stroke="#5C9E31" stroke-width="15" fill="none" stroke-linecap="round"/>'
    +'<path d="M 266 382 C 300 344 356 338 384 356 C 370 398 306 416 266 382 Z" fill="url(#dsbLeaf)"/>'
    +'<g fill="url(#dsbPetal)" fill-opacity="0.93"><g transform="rotate(-9 256 232)">'
    +'<path transform="translate(256 232)" d="M 0 -10 C -56 -38 -80 -100 -50 -138 C -34 -158 -14 -160 0 -148 C 14 -160 34 -158 50 -138 C 80 -100 56 -38 0 -10 Z"/>'
    +'<path transform="translate(256 232) rotate(72)" d="M 0 -10 C -56 -38 -80 -100 -50 -138 C -34 -158 -14 -160 0 -148 C 14 -160 34 -158 50 -138 C 80 -100 56 -38 0 -10 Z"/>'
    +'<path transform="translate(256 232) rotate(144)" d="M 0 -10 C -56 -38 -80 -100 -50 -138 C -34 -158 -14 -160 0 -148 C 14 -160 34 -158 50 -138 C 80 -100 56 -38 0 -10 Z"/>'
    +'<path transform="translate(256 232) rotate(216)" d="M 0 -10 C -56 -38 -80 -100 -50 -138 C -34 -158 -14 -160 0 -148 C 14 -160 34 -158 50 -138 C 80 -100 56 -38 0 -10 Z"/>'
    +'<path transform="translate(256 232) rotate(288)" d="M 0 -10 C -56 -38 -80 -100 -50 -138 C -34 -158 -14 -160 0 -148 C 14 -160 34 -158 50 -138 C 80 -100 56 -38 0 -10 Z"/>'
    +'</g></g></svg>';

  var TEXT = '<div style="display:flex;flex-direction:column;gap:0px;line-height:1">'
    +'<span style="font-family:\'Nanum Myeongjo\',serif;font-size:17px;font-weight:800;color:#1F2A1A;line-height:1.15">다시봄</span>'
    +'<span style="font-size:9px;letter-spacing:2px;color:#8AAA7A;font-weight:700">DASIBOM</span>'
    +'</div>';

  var INNER = SVG + TEXT;

  function inject(el){
    if(!el || el._logoInjected) return;
    el._logoInjected = true;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '10px';
    el.style.textDecoration = 'none';
    el.innerHTML = INNER;
  }

  function scan(){
    document.querySelectorAll('[data-dasibom-logo]').forEach(inject);
  }

  window.DasibomLogo = { inject: inject, scan: scan };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();
