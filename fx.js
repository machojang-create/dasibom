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

  var FX = {
    click: function(){ if(!on) return; tone(523.25, 0.13, 0.07, 'sine'); tone(783.99, 0.16, 0.045, 'sine', 0.05); },
    hover: function(){ if(!on) return; var now = Date.now(); if(now - lastHover < 90) return; lastHover = now; tone(1046.5, 0.05, 0.015, 'sine'); },
    open:  function(){ if(!on) return; tone(440, 0.12, 0.05, 'sine'); tone(659.25, 0.16, 0.05, 'sine', 0.07); },
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
  function wire(){
    document.addEventListener('click', function(e){ var el = e.target.closest(CLICK_SEL); if(el){ if(el.classList && (el.classList.contains('ch-meaning-more') || el.classList.contains('story-modal-close'))) FX.open(); else FX.click(); } }, true);
    document.addEventListener('pointerover', function(e){ if(e.pointerType === 'touch') return; var el = e.target.closest(CARD_SEL); if(el && el !== lastHoverEl){ lastHoverEl = el; FX.hover(); } }, true);
    document.addEventListener('pointerout', function(e){ var to = e.relatedTarget; if(!to || !(to.closest && to.closest(CARD_SEL))) lastHoverEl = null; }, true);
    makeBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
