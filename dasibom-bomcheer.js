// 다시봄 공용 '봄이 리액션' — 성취/완료 순간에 봄이가 등장해 칭찬하고 목소리로 말한다.
// (2026-07-24 Macho: 구입 축하가 좋았으니 다른 콘텐츠 성취 순간에도)
// 사용: window.BomCheer.show({ title:'딩동댕!', msg:'다 맞히셨어요, 대단하세요!', face:'bom_cheer.png', emoji:'🎉' })
// - 목소리: bom_voice.js가 있으면 BomVoice.say로 자동 낭독(무료 ElevenLabs, 문장 캐시)
// - 독립앱: window.DASIBOM_BOM===false 면 봄이 없이 중립 카드
(function () {
  if (window.BomCheer) return;
  var bomOn = function () { return window.DASIBOM_BOM !== false; };
  var ov, faceEl, titleEl, msgEl, emojiEl, okBtn, hideTo;

  function injectCSS() {
    if (document.getElementById('bomcheer-css')) return;
    var st = document.createElement('style'); st.id = 'bomcheer-css';
    st.textContent =
      '.bch-ov{position:fixed;inset:0;z-index:9996;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(20,40,30,.42);opacity:0;transition:opacity .25s;pointer-events:none}' +
      '.bch-ov.on{opacity:1;pointer-events:auto}' +
      '.bch-card{position:relative;width:100%;max-width:320px;background:#FFFDF7;border:4px solid #EAF3EC;border-radius:28px;padding:38px 24px 26px;text-align:center;box-shadow:0 24px 60px -20px rgba(0,0,0,.4);transform:scale(.7) translateY(24px);transition:transform .3s cubic-bezier(.2,1.2,.4,1)}' +
      '.bch-ov.on .bch-card{transform:scale(1) translateY(0)}' +
      '.bch-face{position:absolute;top:-46px;left:50%;transform:translateX(-50%);width:96px;height:96px;object-fit:contain;filter:drop-shadow(0 6px 12px rgba(0,0,0,.25))}' +
      '.bch-emoji{font-size:56px;line-height:1;margin-bottom:6px}' +
      '.bch-emoji.hasface{margin-top:34px}' +
      '.bch-title{color:#0e9d7d;font-weight:900;font-size:20px;margin-bottom:8px;letter-spacing:-.01em}' +
      '.bch-msg{color:#3a4a3e;font-weight:600;font-size:15.5px;line-height:1.65;word-break:keep-all;margin-bottom:18px}' +
      '.bch-bubble{position:relative;background:#F0FAF4;border:1px solid #cfeadd;border-radius:18px;padding:13px 16px;margin-bottom:18px}' +
      '.bch-bubble:before{content:"";position:absolute;top:-7px;left:26px;width:12px;height:12px;background:#F0FAF4;border-left:1px solid #cfeadd;border-top:1px solid #cfeadd;transform:rotate(45deg)}' +
      '.bch-bubble .bch-msg{margin:0;color:#1e5f4a}' +
      '.bch-ok{width:100%;padding:13px 0;border:0;border-radius:18px;background:#0e9d7d;color:#fff;font-weight:900;font-size:15px;cursor:pointer;font-family:inherit}' +
      '.bch-ok:active{transform:scale(.96)}' +
      '.bch-spark{position:absolute;top:6px;font-size:19px;pointer-events:none;opacity:0}' +
      '@keyframes bchSpark{0%{opacity:0;transform:translateY(0) scale(.4)}30%{opacity:1}100%{opacity:0;transform:translateY(-28px) scale(.8)}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function ensure() {
    if (ov) return;
    injectCSS();
    ov = document.createElement('div'); ov.className = 'bch-ov';
    ov.innerHTML =
      '<div class="bch-card" role="dialog" aria-label="봄이 축하">' +
      '<img class="bch-face" alt="봄이" style="display:none">' +
      '<div class="bch-spark" style="left:14%"></div><div class="bch-spark" style="left:30%"></div>' +
      '<div class="bch-spark" style="left:50%"></div><div class="bch-spark" style="left:68%"></div><div class="bch-spark" style="left:84%"></div>' +
      '<div class="bch-emoji"></div>' +
      '<div class="bch-title"></div>' +
      '<div class="bch-bubble"><div class="bch-msg"></div></div>' +
      '<button class="bch-ok">좋아요! 👍</button>' +
      '</div>';
    document.body.appendChild(ov);
    faceEl = ov.querySelector('.bch-face'); titleEl = ov.querySelector('.bch-title');
    msgEl = ov.querySelector('.bch-msg'); emojiEl = ov.querySelector('.bch-emoji'); okBtn = ov.querySelector('.bch-ok');
    okBtn.addEventListener('click', hide);
    ov.addEventListener('click', function (e) { if (e.target === ov) hide(); });
  }

  function fireSparks() {
    var sp = ov.querySelectorAll('.bch-spark'); var em = ['✨', '🌸', '⭐', '💫', '✨'];
    sp.forEach(function (s, i) { s.textContent = em[i]; s.style.animation = 'none'; void s.offsetWidth; s.style.animation = 'bchSpark 1s ease-out ' + (0.1 + i * 0.07) + 's forwards'; });
  }

  function hide() { if (ov) { ov.classList.remove('on'); ov.setAttribute('aria-hidden', 'true'); } if (window.BomVoice) try { BomVoice.stop(); } catch (e) {} clearTimeout(hideTo); }

  function show(opts) {
    opts = opts || {}; ensure();
    var withBom = bomOn();
    var title = opts.title || (withBom ? '봄이가 응원해요!' : '완료!');
    var msg = opts.msg || '';
    emojiEl.textContent = opts.emoji || (withBom ? '' : '🎉');
    emojiEl.className = 'bch-emoji' + (withBom ? ' hasface' : '');
    titleEl.textContent = title;
    msgEl.textContent = msg;
    if (withBom) { faceEl.src = '/img/' + (opts.face || 'bom_cheer.png'); faceEl.style.display = ''; okBtn.textContent = '고마워 봄아! 👍'; }
    else { faceEl.style.display = 'none'; okBtn.textContent = '좋아요! 👍'; }
    ov.classList.add('on'); ov.setAttribute('aria-hidden', 'false');
    fireSparks();
    // 목소리 — 봄이가 직접 말한다(무료 ElevenLabs, 문장 캐시). 카드가 아직 떠 있을 때만 재생.
    if (withBom && window.BomVoice && BomVoice.say) {
      try { BomVoice.say((title ? title + '. ' : '') + msg, function () { return ov && ov.classList.contains('on'); }); } catch (e) {}
    }
    clearTimeout(hideTo);
    hideTo = setTimeout(hide, opts.hold || 6500);   // 오래 안 닫으면 자동으로 살짝 뒤 사라짐
  }

  window.BomCheer = { show: show, hide: hide };
})();
