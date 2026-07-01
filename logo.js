// 다시봄 공용 로고 — 나중에 이 파일 하나만 수정하면 전 페이지 교체됩니다.
(function(){
  var SVG = '<svg width="34" height="34" viewBox="0 0 44 44" fill="none" style="flex-shrink:0">'
    +'<rect width="44" height="44" rx="12" fill="#F5F8F0"/>'
    +'<circle cx="22" cy="13" r="5" fill="#A5C87A"/>'
    +'<line x1="22" y1="5" x2="22" y2="3" stroke="#A5C87A" stroke-width="2" stroke-linecap="round"/>'
    +'<line x1="22" y1="23" x2="22" y2="21" stroke="#A5C87A" stroke-width="2" stroke-linecap="round"/>'
    +'<line x1="14" y1="13" x2="12" y2="13" stroke="#A5C87A" stroke-width="2" stroke-linecap="round"/>'
    +'<line x1="32" y1="13" x2="30" y2="13" stroke="#A5C87A" stroke-width="2" stroke-linecap="round"/>'
    +'<line x1="22" y1="38" x2="22" y2="26" stroke="#81C784" stroke-width="2.5" stroke-linecap="round"/>'
    +'<path d="M22 32 C18 30 15 27 17 24 C19 21 22 26 22 28" fill="#81C784"/>'
    +'<path d="M22 30 C26 28 29 25 27 22 C25 19 22 24 22 26" fill="#A5D6A7"/>'
    +'</svg>';

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
