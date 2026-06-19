/* ════════ 봄이 공용 음성 모듈 ════════
   BomVoice.say(text, mp3?)  — mp3 있으면 그걸 재생(실패 시 텍스트를 브라우저 음성으로),
                                없으면 브라우저 음성(ko-KR, 아동 피치)으로 text 읽기.
   토글: localStorage 'dasibom_bomvoice' (챗봇 음성 토글과 공유). 브라우저 정책상 첫 터치 후 작동.
   ※ 고정 대사는 voice/ 의 MP3(클로바로 교체 시 품질업), 동적 튜토리얼은 브라우저 음성 폴백.
   ══════════════════════════════════════ */
(function () {
  if (window.BomVoice) return;
  var audio = new Audio();
  function isOn() { try { return localStorage.getItem('dasibom_bomvoice') !== '0'; } catch (e) { return true; } }
  function pickKo() {
    try { var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; var ko = vs.filter(function (v) { return /ko/i.test(v.lang); }); return ko[0] || null; } catch (e) { return null; }
  }
  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text).replace(/[🌸✦→·]/g, ' '));
      u.lang = 'ko-KR'; u.pitch = 1.6; u.rate = 1.0;       // 피치 ↑ = 어린 소녀 느낌
      var v = pickKo(); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  // 일부 브라우저는 voices가 늦게 로드됨 — 미리 깨워두기
  try { if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); }; } } catch (e) {}

  window.BomVoice = {
    isOn: isOn,
    setOn: function (v) { try { localStorage.setItem('dasibom_bomvoice', v ? '1' : '0'); } catch (e) {} if (!v) this.stop(); },
    say: function (text, mp3) {
      if (!isOn() || !text) return;
      if (mp3) {
        try {
          audio.pause(); audio.src = mp3; audio.currentTime = 0;
          var p = audio.play();
          if (p && p.catch) p.catch(function () { speak(text); });
          return;
        } catch (e) {}
      }
      speak(text);
    },
    stop: function () { try { audio.pause(); } catch (e) {} try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
  };
})();
