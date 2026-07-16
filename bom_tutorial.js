/* ════════ 봄이 콘텐츠 튜토리얼 — 공용 모듈 (2026-07-10) ════════
   역할②(콘텐츠 가이드) 개편본. 콘텐츠 페이지에 '도착하면' 좌하단에 봄이가 떠서
   "여긴 이런 곳이에요"를 안내하고, 원하면 2~3단계 미니투어. 최초 1회 자동 등장 후에는
   작은 봄이 버튼으로 남아 탭하면 다시 도와줌(상시 도우미 통합).

   페이지 사용법:
     1) <script src="bom_voice.js?v=12" defer></script>   ← 음성(없어도 무음으로 동작)
     2) <script src="bom_tutorial.js?v=1" defer></script>
     3) <script>window.BOM_TUT = {
          key:'trendy',                    // 콘텐츠 식별자(1회 플래그 dasibom_tut_v2_<key>)
          face:'bom_grin.png',             // 봄이 표정
          name:'말동무 사전',              // (선택) 말풍선 상단 제목
          welcome:'{호칭}, 여기는 …',      // 진입 인사. {호칭}→저장된 할머니/할아버지
          action:'궁금한 시대를 하나 …',   // (선택) 핵심 한 걸음
          tour:[ '…', '…', '…' ]           // (선택) 미니투어 문구 배열. 없으면 투어 버튼 숨김
        };</script>
   대사는 전부 고정문구라 BomVoice.say 서버캐시로 최초1회만 합성(비용 사실상 0).
   ════════════════════════════════════════════════════════════ */
(function () {
  if (window.__bomTutLoaded) return;
  window.__bomTutLoaded = true;

  function cfg() { return window.BOM_TUT || null; }
  function honor() { try { return localStorage.getItem('dasibom_honorific') || '어르신'; } catch (e) { return '어르신'; } }
  function fill(s) { return String(s || '').replace(/\{호칭\}/g, honor()); }
  function seen(k) { try { return !!localStorage.getItem('dasibom_tut_v2_' + k); } catch (e) { return false; } }
  function markSeen(k) { try { localStorage.setItem('dasibom_tut_v2_' + k, '1'); } catch (e) {} }

  var CSS =
    '.bt-wrap{position:fixed;left:14px;bottom:16px;z-index:9400;display:none;align-items:flex-end;gap:10px;font-family:inherit;max-width:min(92vw,360px)}' +
    '.bt-wrap.on{display:flex}' +
    '.bt-face{width:54px;height:54px;flex:none;border-radius:50%;background:#fff;object-fit:cover;object-position:center top;box-shadow:0 6px 16px -6px rgba(0,0,0,.4);border:2px solid #fff;cursor:pointer;transition:transform .2s}' +
    '.bt-face:active{transform:scale(.94)}' +
    '.bt-face.pulse{animation:btPulse 2.4s ease-in-out infinite}' +
    '@keyframes btPulse{0%,100%{box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}50%{box-shadow:0 6px 22px -4px rgba(14,157,125,.7)}}' +
    '.bt-bubble{position:relative;background:#fff;border:1px solid #DCEFE6;border-radius:18px 18px 18px 6px;box-shadow:0 16px 40px -18px rgba(0,0,0,.45);padding:15px 16px 14px;min-width:0;flex:1;' +
    'animation:btPop .32s cubic-bezier(.2,.9,.3,1.15)}' +
    '@keyframes btPop{from{opacity:0;transform:translateY(12px) scale(.94)}to{opacity:1;transform:none}}' +
    '.bt-bubble::before{content:"봄이";position:absolute;top:-9px;left:14px;font-size:10.5px;font-weight:800;letter-spacing:.03em;color:#fff;background:#0E9C7D;padding:2px 8px;border-radius:50px}' +
    '.bt-x{position:absolute;top:8px;right:10px;width:24px;height:24px;border:none;background:transparent;color:#9aa8a0;font-size:18px;line-height:1;cursor:pointer;padding:0}' +
    '.bt-title{font-size:13px;font-weight:800;color:#0B7E64;margin:2px 26px 6px 0;line-height:1.3}' +
    '.bt-text{font-size:calc(15px * var(--ts,1));line-height:1.72;color:#33402E;word-break:keep-all}' +
    '.bt-action{font-size:calc(13.5px * var(--ts,1));line-height:1.6;color:#0B7E64;background:#EDF8F3;border-radius:10px;padding:9px 11px;margin-top:10px;font-weight:600}' +
    '.bt-action b{color:#0B7E64}' +
    '.bt-dots{display:flex;gap:5px;margin-top:12px}' +
    '.bt-dot{width:6px;height:6px;border-radius:50%;background:#D6E5DD;transition:background .2s}' +
    '.bt-dot.on{background:#0E9C7D}' +
    '.bt-btns{display:flex;gap:8px;margin-top:13px}' +
    '.bt-btn{flex:1;padding:11px 10px;border-radius:50px;font-size:calc(14px * var(--ts,1));font-weight:800;cursor:pointer;font-family:inherit;border:none;line-height:1.2;white-space:nowrap}' +
    '.bt-primary{background:linear-gradient(145deg,#13d3a6,#0e9d7d);color:#fff}' +
    '.bt-primary:active{transform:scale(.98)}' +
    '.bt-ghost{background:#F1F4F0;color:#5c6b5a;border:1px solid #E2E9E0}' +
    '.bt-ghost:active{transform:scale(.98)}' +
    /* 하이라이트 링(투어에서 특정 요소 강조 시) */
    '.bt-spot{position:fixed;z-index:9399;border:3px solid #13d3a6;border-radius:14px;box-shadow:0 0 0 4000px rgba(20,40,30,.28);pointer-events:none;transition:none;display:none}' +
    '.bt-spot.on{display:block}' +
    /* 다크 모드 */
    'body.dark .bt-bubble,html.dsb-dark .bt-bubble{background:#262E26;border-color:#38463a}' +
    'body.dark .bt-text{color:#e7ddc9}html.dsb-dark .bt-text{color:#e7ddc9}' +
    'body.dark .bt-title,html.dsb-dark .bt-title{color:#4FD6B6}' +
    'body.dark .bt-action,html.dsb-dark .bt-action{background:#1d3a31;color:#7ee0c6}' +
    'body.dark .bt-ghost,html.dsb-dark .bt-ghost{background:#313a31;color:#c8bba4;border-color:#3f4a3f}' +
    '@media (prefers-reduced-motion:reduce){.bt-bubble,.bt-face.pulse{animation:none}.bt-spot{transition:none}}';

  var root, faceEl, bubbleEl, titleEl, textEl, actionEl, dotsEl, btnsEl, primaryBtn, ghostBtn, xBtn, spotEl;
  var _tourIdx = -1;

  function ensure() {
    if (root) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.className = 'bt-wrap';
    root.innerHTML =
      '<div class="bt-bubble" role="dialog" aria-label="봄이 안내">' +
      '<button class="bt-x" aria-label="닫기">×</button>' +
      '<div class="bt-title"></div><div class="bt-text"></div><div class="bt-action" style="display:none"></div>' +
      '<div class="bt-dots" style="display:none"></div>' +
      '<div class="bt-btns"><button class="bt-btn bt-primary"></button><button class="bt-btn bt-ghost"></button></div>' +
      '</div>' +
      '<img class="bt-face" alt="봄이">';
    document.body.appendChild(root);
    spotEl = document.createElement('div'); spotEl.className = 'bt-spot'; document.body.appendChild(spotEl);

    bubbleEl = root.querySelector('.bt-bubble'); faceEl = root.querySelector('.bt-face');
    titleEl = root.querySelector('.bt-title'); textEl = root.querySelector('.bt-text');
    actionEl = root.querySelector('.bt-action'); dotsEl = root.querySelector('.bt-dots');
    btnsEl = root.querySelector('.bt-btns'); primaryBtn = root.querySelector('.bt-primary');
    ghostBtn = root.querySelector('.bt-ghost'); xBtn = root.querySelector('.bt-x');

    faceEl.src = '/img/' + ((cfg() && cfg().face) || 'bom_smile.png'); // 절대경로 — 하위경로(/trendy/ 등)에서 깨짐 방지
    faceEl.addEventListener('click', function () { if (bubbleEl.style.display === 'none') openWelcome(false); });
    xBtn.addEventListener('click', dismiss);
  }

  function stopVoice() { if (window.BomVoice) { try { BomVoice.stop(); } catch (e) {} } }
  /* bom_voice.js가 로드될 때까지 기다렸다가 실행. ★기존엔 'BomVoice 없으면 조용히 무시'라서
     로드가 말풍선보다 늦는 첫 방문엔 환영 설명이 무음이었음(2026-07-16 Macho 발견, 토론장에서.
     dasibom-bomguide.js와 같은 수술 — 두 파일은 항상 함께 고칠 것). */
  function whenVoice(cb, maxMs) {
    var t0 = Date.now();
    (function poll() {
      if (window.BomVoice) return cb();
      if (Date.now() - t0 >= (maxMs || 10000)) return;
      setTimeout(poll, 150);
    })();
  }
  // ★음성 타이밍 통일 규칙: 텍스트는 항상 즉시 표시, 봄이 음성은 준비되는 대로. 프리페치로 음성이 바짝 따라오게.
  function say(t) { if (!t) return; whenVoice(function () { try { BomVoice.say(fill(t)); } catch (e) {} }, 15000); }
  // 자동 인사용: 빨리 준비되면 재생, 늦으면 스킵(창 열고 한참 뒤 어색한 음성 방지)
  // "아직 환영 말풍선을 보고 계신가" — 음성 재생 직전에도 다시 묻는다(투어 진입·닫힘 후 뒷북 방지)
  function welcomeOn() { return _tourIdx < 0 && bubbleEl && bubbleEl.style.display !== 'none'; }
  function sayQuick(t) {
    if (!t) return;
    whenVoice(function () {
      if (!welcomeOn()) return;
      // 상한 9초: 첫 방문은 (모듈 로드→익명 로그인→합성 왕복)이 2.8초를 넘겨 환영이 통째로 버려졌음.
      // 말풍선이 계속 떠 있는 화면이라, 읽고 계시는 동안 몇 초 늦게 나오는 건 자연스럽다.
      try { BomVoice.sayIfQuick ? BomVoice.sayIfQuick(fill(t), 9000, welcomeOn) : BomVoice.say(fill(t)); } catch (e) {}
    }, 10000);
  }
  function prefetch(t) { if (!t) return; whenVoice(function () { try { if (BomVoice.prefetch) BomVoice.prefetch(fill(t)); } catch (e) {} }, 10000); }
  function clearSpot() { if (spotEl) spotEl.classList.remove('on'); }

  function showBubble() { bubbleEl.style.display = ''; faceEl.classList.remove('pulse'); }
  function collapse() { // 말풍선 숨기고 작은 봄이만 남김(상시 도우미)
    if (!root) return;
    bubbleEl.style.display = 'none'; clearSpot(); faceEl.classList.add('pulse');
    root.classList.add('on');
  }

  // 진입 인사 화면
  function openWelcome(autoVoice) {
    var g = cfg(); if (!g) return;
    _tourIdx = -1; clearSpot(); showBubble(); root.classList.add('on');
    titleEl.textContent = g.name || ''; titleEl.style.display = g.name ? '' : 'none';
    textEl.innerHTML = esc(fill(g.welcome));
    if (g.action) { actionEl.innerHTML = '→ ' + esc(fill(g.action)); actionEl.style.display = ''; }
    else actionEl.style.display = 'none';
    dotsEl.style.display = 'none';
    var hasTour = g.tour && g.tour.length;
    primaryBtn.textContent = hasTour ? '구경시켜 주세요' : '알겠어요 🌸';
    primaryBtn.onclick = hasTour ? startTour : dismiss;
    ghostBtn.style.display = hasTour ? '' : 'none';
    ghostBtn.textContent = '알겠어요';
    ghostBtn.onclick = dismiss;
    if (autoVoice !== false) {
      sayQuick((g.name ? g.name + '. ' : '') + g.welcome); // 텍스트 즉시. 음성은 빨리 준비되면 재생, 늦으면 스킵
      if (hasTour) { var s0 = g.tour[0]; prefetch(typeof s0 === 'string' ? s0 : s0.text); } // 첫 스텝 미리 받기
    }
    // 환영과 동시에 핵심 1곳 자동 포커싱(부담 없이) — g.focus 없으면 첫 sel 스텝을 짚어줌
    var _f = g.focus; if (!_f) { var _t = g.tour || []; for (var _i = 0; _i < _t.length; _i++) { if (_t[_i] && typeof _t[_i] === 'object' && _t[_i].sel) { _f = _t[_i].sel; break; } } }
    if (_f) highlight(_f); else clearSpot();
  }

  function startTour() { _tourIdx = 0; renderStep(); }
  function renderStep() {
    var g = cfg(); var steps = g.tour || [];
    if (_tourIdx < 0 || _tourIdx >= steps.length) { dismiss(); return; }
    showBubble();
    titleEl.style.display = 'none'; actionEl.style.display = 'none';
    var step = steps[_tourIdx];
    textEl.innerHTML = esc(fill(typeof step === 'string' ? step : step.text));
    // 진행 점
    dotsEl.style.display = ''; dotsEl.innerHTML = '';
    for (var i = 0; i < steps.length; i++) { var d = document.createElement('span'); d.className = 'bt-dot' + (i === _tourIdx ? ' on' : ''); dotsEl.appendChild(d); }
    // 하이라이트(선택): step.sel 있으면 그 요소 강조
    if (step && step.sel) highlight(step.sel); else clearSpot();
    var last = _tourIdx === steps.length - 1;
    primaryBtn.textContent = last ? '다 봤어요 🌸' : '다음 →';
    primaryBtn.onclick = function () { _tourIdx++; renderStep(); };
    ghostBtn.style.display = ''; ghostBtn.textContent = '그만 볼게요'; ghostBtn.onclick = dismiss;
    var _st = typeof step === 'string' ? step : step.text;
    say(_st); // 텍스트 즉시, 음성 준비되는 대로
    var nx = steps[_tourIdx + 1]; if (nx) prefetch(typeof nx === 'string' ? nx : nx.text); // 다음 스텝 미리 받기
  }

  function highlight(sel) {
    try {
      var t = document.querySelector(sel);
      if (!t) { clearSpot(); return; }
      t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 부드러운 스크롤이 진행되는 동안 링이 대상에 계속 붙어 따라감 → 스크롤이 멈추면 정렬 완료.
      // (한 번만 위치를 읽으면 스크롤 도중 값이라 어긋남 — 특히 긴 목록/먼 요소)
      var lastTop = null, stable = 0, start = Date.now();
      (function place() {
        var r = t.getBoundingClientRect();
        // 스크롤이 안 먹는 페이지(일부 transform 레이아웃 등)에서 대상이 화면 밖이면
        // 링을 숨겨 '깨진 딤 오버레이'를 방지 — 말풍선 안내만 남김(우아한 폴백).
        var offscreen = r.bottom < 44 || r.top > window.innerHeight - 44;
        spotEl.style.left = (r.left - 6) + 'px'; spotEl.style.top = (r.top - 6) + 'px';
        spotEl.style.width = (r.width + 12) + 'px'; spotEl.style.height = (r.height + 12) + 'px';
        spotEl.classList.toggle('on', !offscreen);
        if (lastTop !== null && Math.abs(r.top - lastTop) < 0.5) stable++; else stable = 0;
        lastTop = r.top;
        if ((stable < 3 || Date.now() - start < 500) && Date.now() - start < 1600) requestAnimationFrame(place); // 스크롤 시작 보장(≥500ms) + 멈춘 뒤 3프레임, 최대 1.6s
      })();
    } catch (e) { clearSpot(); }
  }

  function dismiss() { var g = cfg(); if (g) markSeen(g.key); stopVoice(); collapse(); }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  document.addEventListener('DOMContentLoaded', function () {
    var g = cfg(); if (!g || !g.key) return;
    ensure();
    if (seen(g.key)) { collapse(); }                 // 이미 본 콘텐츠 → 작은 도우미만
    else { prefetch((g.name ? g.name + '. ' : '') + g.welcome); setTimeout(function () { openWelcome(true); }, 900); } // 환영 대사 미리 받고 인사
  });

  // 외부에서 강제로 다시 열기(디버그/설정용)
  window.BomTut = {
    open: function () { ensure(); openWelcome(true); },
    reset: function (k) { try { localStorage.removeItem('dasibom_tut_v2_' + (k || (cfg() && cfg().key))); } catch (e) {} }
  };
})();
