// 다시봄 효과음 + 인터랙션 사운드 (Web Audio 합성 — 외부 음원 파일 없음)
// 어느 페이지든 <script src="/fx.js"> 만 넣으면 자동으로 클릭·호버 소리 + 토글 버튼 부착.
// 브라우저 정책상 첫 사용자 터치 이후부터 소리가 납니다(무음 자동재생 차단 회피).
(function(){
  if (window.DasibomFX) return;
  var KEY = 'dasibom_sound';
  var on = (function(){ try { return localStorage.getItem(KEY) !== '0'; } catch(e){ return true; } })();
  var ctx = null, lastHover = 0, lastHoverEl = null, btn = null;

  function ac(){
    try {
      if (!ctx){ var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume();
    } catch(e){ return null; }
    return ctx;
  }
  function tone(freq, dur, gain, type, when){
    var c = ac(); if(!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      var t = c.currentTime + (when || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch(e){}
  }

  var lastBubble = 0;
  var FX = {
    click: function(){ if(!on) return; tone(523.25, 0.13, 0.07, 'sine'); tone(783.99, 0.16, 0.045, 'sine', 0.05); },
    hover: function(){ if(!on) return; var now = Date.now(); if(now - lastHover < 90) return; lastHover = now; tone(1046.5, 0.05, 0.015, 'sine'); },
    open:  function(){ if(!on) return; tone(440, 0.12, 0.05, 'sine'); tone(659.25, 0.16, 0.05, 'sine', 0.07); },
    // 팝업·챗창 닫힘 — 부드럽게 내려가는 두 음
    close: function(){ if(!on) return; tone(659.25, 0.11, 0.045, 'sine'); tone(440, 0.15, 0.045, 'sine', 0.06); },
    // 봄이 말풍선 등장 — 아주 가벼운 '톡'(자주 나므로 은은하게). 90ms 내 중복 방지.
    bubble:function(){ if(!on) return; var now=Date.now(); if(now-lastBubble<80) return; lastBubble=now; tone(784, 0.05, 0.028, 'sine'); tone(1046.5, 0.06, 0.03, 'sine', 0.03); },
    // 사용자 전송 — 짧게 올라가는 '핑'
    send:  function(){ if(!on) return; tone(523.25, 0.05, 0.038, 'sine'); tone(880, 0.07, 0.042, 'sine', 0.04); },
    // 구입 완료 — 따뜻하게 올라가는 세 음(동전 느낌)
    buy:   function(){ if(!on) return; tone(783.99, 0.09, 0.05, 'triangle'); tone(1046.5, 0.1, 0.055, 'triangle', 0.07); tone(1318.5, 0.14, 0.05, 'triangle', 0.15); },
    // 보상·달성 — 밝은 아르페지오
    reward:function(){ if(!on) return; tone(659.25, 0.1, 0.05, 'sine'); tone(880, 0.1, 0.05, 'sine', 0.08); tone(1318.5, 0.18, 0.055, 'sine', 0.16); },
    // 실패·불가 — 낮고 부드러운 두 음
    nope:  function(){ if(!on) return; tone(233.08, 0.14, 0.05, 'sine'); tone(185, 0.18, 0.05, 'sine', 0.05); },
    // 강조 CTA(핵심 버튼) — 자신감 있는 두 음
    cta:   function(){ if(!on) return; tone(587.33, 0.1, 0.06, 'sine'); tone(880, 0.15, 0.06, 'sine', 0.06); },
    isOn:  function(){ return on; },
    setOn: function(v){ on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch(e){} paint(); if(on){ ac(); tone(659.25, 0.12, 0.06, 'sine'); } }
  };
  window.DasibomFX = FX;

  function paint(){ if(btn){ btn.textContent = on ? '🔊' : '🔇'; btn.setAttribute('aria-label', on ? '효과음 끄기' : '효과음 켜기'); btn.style.opacity = on ? '1' : '.6'; } }
  function makeBtn(){
    if(document.getElementById('fx-sound-toggle')) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'fx-sound-toggle';
    btn.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:8000;width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.92);box-shadow:0 6px 18px -6px rgba(0,0,0,.32);font-size:20px;line-height:1;display:grid;place-items:center;transition:transform .2s,opacity .2s;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';
    btn.onmouseenter = function(){ btn.style.transform = 'scale(1.08)'; };
    btn.onmouseleave = function(){ btn.style.transform = 'scale(1)'; };
    btn.onclick = function(){ FX.setOn(!on); };
    paint();
    (document.body || document.documentElement).appendChild(btn);
  }

  var CARD_SEL = '.card,.gp-card,.ns-mini-pair,.wisdom-card-news,.ch-meaning-more,.story-modal-card';
  var CLICK_SEL = 'a[href],button,.card,.gp-card,.ch-cta-a,.ns-more-link,.ch-meaning-more,.dbc-send,.story-cta,[onclick]';
  // 액션별 판별 셀렉터(값싼 매칭용). 오탐 방지: 텍스트 매칭은 짧은 라벨(버튼/링크)에만.
  var CLOSE_SEL = '.bcp-x,.story-modal-close,.modal-close,.close,.lm-x,[data-close],[aria-label="닫기"],[aria-label*="닫"]';
  var CTA_SEL   = '.ch-cta-a,.story-cta,.btn-pkg,.shc-btn,.pv-pdf-btn,.btn-buy,[data-cta]';
  var BUY_SEL   = '[data-buy],.buy-btn,.pkg-buy,.shop-buy,.item-buy';
  var FAB_SEL   = '#bomFab,.bomchat-fab,#bomGreet';
  function matches(el, sel){ try { return el.matches(sel); } catch(e){ return false; } }
  function wire(){
    document.addEventListener('click', function(e){
      var el = e.target.closest(CLICK_SEL); if(!el) return;
      var txt = (el.textContent || '').trim();
      var isBtnLink = el.tagName === 'BUTTON' || el.tagName === 'A';
      // 1) 닫기
      if(matches(el, CLOSE_SEL) || (isBtnLink && txt.length <= 3 && /^[✕×✖⨯]$/.test(txt))){ FX.close(); return; }
      // 2) 구입/구매 (버튼·링크의 짧은 라벨만 텍스트로 인정)
      if(matches(el, BUY_SEL) || (isBtnLink && txt.length <= 14 && /(구입|구매|결제하기|사기|담기)/.test(txt))){ FX.buy(); return; }
      // 3) 강조 CTA
      if(matches(el, CTA_SEL)){ FX.cta(); return; }
      // 4) 봄이 열기(FAB·인사 말풍선) / 더보기류 → 열림음
      if(matches(el, FAB_SEL) || (el.classList && el.classList.contains('ch-meaning-more'))){ FX.open(); return; }
      // 5) 그 외 일반 버튼·링크
      FX.click();
    }, true);
    document.addEventListener('pointerover', function(e){ if(e.pointerType === 'touch') return; var el = e.target.closest(CARD_SEL); if(el && el !== lastHoverEl){ lastHoverEl = el; FX.hover(); } }, true);
    document.addEventListener('pointerout', function(e){ var to = e.relatedTarget; if(!to || !(to.closest && to.closest(CARD_SEL))) lastHoverEl = null; }, true);
    makeBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
