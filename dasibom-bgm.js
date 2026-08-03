/* ══════════════════════════════════════════════════════════════════════
   다시봄 공용 배경음(dasibom-bgm.js) — 2026-07-30 Macho
   · 콘텐츠(카드)별 배경음을 각자 쓰지만, 켜고 끄는 스위치는 '하나'다.
     → 전역 저장키 dasibom_bgm('1'/'0'). 메인화면 좌측 하단 아이콘 하나로 전부 적용.
   · 사운드 ON이면 화면을 옮길 때마다 그 콘텐츠의 배경음이 자동으로 나온다.
     (페이지 이동이면 이전 음악은 브라우저가 정지 → '이전 음악 멈추고 새 음악' 이 자동으로 성립.
      같은 페이지에서 곡을 바꿀 땐 play(src)가 이전 것을 확실히 멈춘다.)
   · 브라우저 자동재생 정책: 사용자 제스처가 없으면 못 튼다 → 첫 터치에 조용히 이어 재생.
   공개 API: DasibomBGM.isOn() / .toggle() / .play(src) / .stop() / .setSrc(src)
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.DasibomBGM) return;

  var KEY = 'dasibom_bgm';
  var VOL = 0.3;

  // 콘텐츠(카드)별 배경음 — 새 음원이 준비되면 여기에만 한 줄 추가하면 전 사이트에 적용된다.
  var TRACKS = {
    '/matgo': '/audio/matgo_bgm.mp3',
    '/arcade': '/audio/arcade_bgm.mp3',
    '/plant': '/audio/plant_bgm.mp3',
    '/guppy': '/audio/guppy_bgm.mp3'
  };

  var audio = null, curSrc = null, kickBound = false;

  function on() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setOn(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  // 예전 페이지별 키에서 1회 승계(하나라도 켜져 있었으면 전체 ON으로 시작)
  try {
    if (localStorage.getItem(KEY) === null) {
      var legacy = ['matgo_bgm', 'arcade_bgm', 'plant_bgm', 'guppy_bgm'];
      var any = legacy.some(function (k) { return localStorage.getItem(k) === '1'; });
      setOn(any);
      legacy.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    }
  } catch (e) {}

  function trackForPath() {
    if (typeof window.PAGE_BGM === 'string' && window.PAGE_BGM) return window.PAGE_BGM;   // 페이지가 직접 지정
    var p = (location.pathname || '').replace(/\/+$/, '');                                // '/matgo/' → '/matgo'
    if (TRACKS[p]) return TRACKS[p];
    var seg = '/' + (p.split('/')[1] || '');
    return TRACKS[seg] || null;
  }

  function ensure(src) {
    if (audio && curSrc === src) return audio;
    if (audio) { try { audio.pause(); } catch (e) {} }                 // 곡이 바뀌면 이전 것 확실히 정지
    audio = new Audio(src); audio.loop = true; audio.volume = VOL; curSrc = src;
    return audio;
  }

  function play(src) {
    src = src || trackForPath(); if (!src) return false;
    var a = ensure(src);
    a.play().then(sync).catch(function () { bindKick(); });            // 자동재생 막히면 첫 터치 대기
    return true;
  }
  function stop() { if (audio) { try { audio.pause(); } catch (e) {} } sync(); }

  // 자동재생 차단 대응 — 첫 사용자 제스처에 조용히 재생
  function bindKick() {
    if (kickBound) return; kickBound = true;
    var kick = function () {
      document.removeEventListener('pointerdown', kick);
      document.removeEventListener('keydown', kick);
      kickBound = false;
      if (on()) { var s = trackForPath(); if (s) { var a = ensure(s); a.play().then(sync).catch(function () {}); } }
    };
    document.addEventListener('pointerdown', kick, { once: true });
    document.addEventListener('keydown', kick, { once: true });
  }

  function toggle() {
    var next = !on();
    setOn(next);
    if (next) play(); else stop();
    sync();
    return next;
  }

  /* ── 메인화면 좌측 하단 스위치(아이콘 하나로 전부 적용) ──
     body[data-bgm-toggle] 인 페이지(=홈)에만 그린다. 콘텐츠 페이지는 홈 스위치를 따라간다. */
  var CSS =
    ".dsb-bgm{position:fixed;left:14px;bottom:16px;z-index:99970;width:52px;height:52px;border-radius:50%;" +
    "background:#fff;border:1px solid #E6DECF;box-shadow:0 8px 20px -8px rgba(80,54,24,.45);cursor:pointer;" +
    "display:grid;place-items:center;font-size:23px;line-height:1;padding:0;font-family:inherit;transition:transform .12s}" +
    ".dsb-bgm:active{transform:scale(.93)}" +
    ".dsb-bgm .lbl{position:absolute;left:50%;transform:translateX(-50%);bottom:-17px;white-space:nowrap;" +
    "font-size:10.5px;font-weight:800;color:#8a7a63;letter-spacing:-.02em}" +
    ".dsb-bgm.off{background:#F3EFE6;color:#a99b85}" +
    "body.ts-2 .dsb-bgm{zoom:.87}body.ts-3 .dsb-bgm{zoom:.77}" +
    "body.dark .dsb-bgm,html.dark .dsb-bgm{background:#2a2320;border-color:#3d332a}";

  var btn = null;
  function sync() {
    if (!btn) return;
    var isOn = on();
    btn.classList.toggle('off', !isOn);
    btn.innerHTML = (isOn ? '🎵' : '🔇') + '<span class="lbl">' + (isOn ? '음악 켜짐' : '음악 꺼짐') + '</span>';
    btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    btn.setAttribute('aria-label', isOn ? '배경음악 끄기' : '배경음악 켜기');
  }
  function mount() {
    if (!document.body || !document.body.hasAttribute('data-bgm-toggle')) return;
    if (document.querySelector('.dsb-bgm')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dsb-bgm';
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    document.body.appendChild(btn);
    sync();
  }

  function init() {
    mount();
    if (on() && trackForPath()) play();      // 사운드 ON이면 이 콘텐츠 배경음 자동 재생
    else if (on()) bindKick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.DasibomBGM = { isOn: on, toggle: toggle, play: play, stop: stop, setSrc: function (s) { if (on()) play(s); else curSrc = s; }, _tracks: TRACKS };
})();
