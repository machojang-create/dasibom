/* ════════ 다시봄 파일럿 공용 봄이 가이드 ════════
   파일럿 앱(React 등, 하위경로)에 <script src="/dasibom-bomguide.js"></script> + window.BOM_GUIDE={...} 로.
   좌하단에 봄이 등장 → 첫 방문 인사(+선택 미니투어), 이후엔 작은 봄이 버튼으로 상주(탭하면 다시).
   다시봄 bom_tutorial.js와 같은 컨셉이나, 하위경로 호스팅 대비 이미지 경로를 절대(/img/)로 사용.
   설정: window.BOM_GUIDE = { key, face, name, welcome, action?, tour?:[문자열|{text}] }
   1회 플래그: localStorage 'dasibom_tut_v2_<key>' (다시봄 bom_tutorial과 공유).
   ══════════════════════════════════════════════════ */
(function () {
  if (window.__dsbBomGuide) return; window.__dsbBomGuide = true;
  function cfg() { return window.BOM_GUIDE || null; }
  function honor() { try { return localStorage.getItem('dasibom_honorific') || '어르신'; } catch (e) { return '어르신'; } }
  function fill(s) { return String(s || '').replace(/\{호칭\}/g, honor()); }
  function seen(k) { try { return !!localStorage.getItem('dasibom_tut_v2_' + k); } catch (e) { return false; } }
  function markSeen(k) { try { localStorage.setItem('dasibom_tut_v2_' + k, '1'); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CSS =
    '.bg2-wrap{position:fixed;left:14px;bottom:16px;z-index:9400;display:none;align-items:flex-end;gap:10px;max-width:min(92vw,360px);' +
    "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
    '.bg2-wrap.on{display:flex}' +
    '.bg2-face{width:54px;height:54px;flex:none;border-radius:50%;background:#fff;object-fit:cover;object-position:center top;box-shadow:0 6px 16px -6px rgba(0,0,0,.4);border:2px solid #fff;cursor:pointer}' +
    '.bg2-bubble{position:relative;background:#fff;border:1px solid #DCEFE6;border-radius:18px 18px 18px 6px;box-shadow:0 16px 40px -18px rgba(0,0,0,.45);padding:15px 16px 14px;flex:1;min-width:0}' +
    '.bg2-bubble::before{content:"봄이";position:absolute;top:-9px;left:14px;font-size:10.5px;font-weight:800;color:#fff;background:#0E9C7D;padding:2px 8px;border-radius:50px}' +
    '.bg2-x{position:absolute;top:8px;right:10px;width:24px;height:24px;border:none;background:transparent;color:#9aa8a0;font-size:18px;line-height:1;cursor:pointer}' +
    '.bg2-title{font-size:13px;font-weight:800;color:#0B7E64;margin:2px 26px 6px 0}' +
    '.bg2-text{font-size:15px;line-height:1.72;color:#33402E;word-break:keep-all}' +
    '.bg2-action{font-size:13.5px;line-height:1.6;color:#0B7E64;background:#EDF8F3;border-radius:10px;padding:9px 11px;margin-top:10px;font-weight:600}' +
    '.bg2-dots{display:flex;gap:5px;margin-top:12px}.bg2-dot{width:6px;height:6px;border-radius:50%;background:#D6E5DD}.bg2-dot.on{background:#0E9C7D}' +
    '.bg2-btns{display:flex;gap:8px;margin-top:13px}' +
    '.bg2-btn{flex:1;padding:11px 10px;border-radius:50px;font-size:14px;font-weight:800;cursor:pointer;border:none;line-height:1.2;white-space:nowrap;font-family:inherit}' +
    '.bg2-primary{background:linear-gradient(145deg,#13d3a6,#0e9d7d);color:#fff}.bg2-ghost{background:#F1F4F0;color:#5c6b5a;border:1px solid #E2E9E0}' +
    '.bg2-spot{position:fixed;z-index:9399;border:3px solid #13d3a6;border-radius:14px;box-shadow:0 0 0 4000px rgba(20,40,30,.28);pointer-events:none;display:none}.bg2-spot.on{display:block}';

  var root, faceEl, bubbleEl, titleEl, textEl, actionEl, dotsEl, primaryBtn, ghostBtn, xBtn, spotEl, _idx = -1;

  // ── 봄이 프리미엄 음성: 파일럿엔 bom_voice.js가 없으므로 firebase compat과 함께 자체 로드 ──
  //   ★음성이 창 열고 한참 뒤 나오던 문제 해결: (1)페이지 로드 즉시 시작 (2)auth+functions 병렬 (3)환영대사 미리 합성.
  function ensureVoice() {
    if (window.BomVoice || window.__dsbGuideVoiceLoading) return;
    window.__dsbGuideVoiceLoading = true;
    var base = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-';
    function add(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb || null; s.onerror = cb || null; document.head.appendChild(s); }
    function afterCompat() {
      try {
        if (window.firebase && (!firebase.apps || !firebase.apps.length)) {
          firebase.initializeApp({ apiKey: 'AIzaSyAZAhBAsrKcXnznnx8_0oF2gyYC0WbvoP0', authDomain: 'mylife-650f0.firebaseapp.com', projectId: 'mylife-650f0', storageBucket: 'mylife-650f0.firebasestorage.app', messagingSenderId: '512010655611', appId: '1:512010655611:web:32b153b836b23ae96a8fde' });
        }
        firebase.auth().signInAnonymously().catch(function () {});
      } catch (e) {}
      add('/bom_voice.js?v=11', null);
      // 어르신 콘텐츠 이용 측정(센터 리포트의 팩트 지표) — 키오스크 구경 모드일 때만 동작.
      // 파일럿도 카드이므로 함께 로드. 개인 사용자에겐 아무 일도 하지 않음.
      add('/dasibom-kiosk-usage.js', null);
      // BomVoice 준비되는 즉시 환영 대사를 미리 합성 → 창 열 때 곧바로 재생(지연 숨김)
      var tries = 0;
      (function warm() {
        if (window.BomVoice && BomVoice.prefetch) {
          var g = cfg(); if (g) { try { BomVoice.prefetch(fill((g.name ? g.name + '. ' : '') + g.welcome)); } catch (e) {} }
          return;
        }
        if (++tries > 60) return;
        setTimeout(warm, 120);
      })();
    }
    // app-compat 먼저(필수 베이스), 그다음 auth+functions 병렬 로드
    add(base + 'app-compat.js', function () {
      var need = 2, done = function () { if (--need === 0) afterCompat(); };
      add(base + 'auth-compat.js', done);
      add(base + 'functions-compat.js', done);
    });
  }
  ensureVoice(); // ★즉시 시작 — 페이지 로드와 병렬로 음성 인프라 준비(가이드 열릴 때까지 안 기다림)
  function stopVoice() { if (window.BomVoice) { try { BomVoice.stop(); } catch (e) {} } }
  // ★음성 타이밍 통일 규칙: 텍스트는 항상 즉시 표시(절대 숨기지 않음), 봄이 음성은 준비되는 대로 재생.
  //   프리페치로 다음 대사를 미리 받아 음성이 텍스트를 최대한 바짝 따라오게 함(안 보이는 버그 없이).
  function say(t) { if (window.BomVoice && t) { try { BomVoice.say(fill(t)); } catch (e) {} } }
  // 자동 인사용: 빨리 준비되면 재생, 늦으면 스킵(창 열고 한참 뒤 어색한 음성 방지)
  function sayQuick(t) { if (window.BomVoice && t) { try { BomVoice.sayIfQuick ? BomVoice.sayIfQuick(fill(t), 2800) : BomVoice.say(fill(t)); } catch (e) {} } }
  function prefetch(t) { if (window.BomVoice && BomVoice.prefetch && t) { try { BomVoice.prefetch(fill(t)); } catch (e) {} } }

  // ── 섹션 스포트라이트: bom_tutorial.js와 동일 컨셉(오프스크린 가드 + rAF 추적) ──
  function clearSpot() { if (spotEl) spotEl.classList.remove('on'); }
  function highlight(sel) {
    if (!spotEl || !sel) { clearSpot(); return; }
    var t; try { t = document.querySelector(sel); } catch (e) { t = null; }
    if (!t) { clearSpot(); return; }
    try { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    var start = Date.now(), lastTop = null, stable = 0;
    (function place() {
      var r = t.getBoundingClientRect();
      var off = r.bottom < 44 || r.top > window.innerHeight - 44 || r.width === 0;
      spotEl.style.left = (r.left - 6) + 'px'; spotEl.style.top = (r.top - 6) + 'px';
      spotEl.style.width = (r.width + 12) + 'px'; spotEl.style.height = (r.height + 12) + 'px';
      spotEl.classList.toggle('on', !off);
      if (lastTop !== null && Math.abs(r.top - lastTop) < 0.5) stable++; else stable = 0;
      lastTop = r.top;
      if ((stable < 3 || Date.now() - start < 500) && Date.now() - start < 1600) requestAnimationFrame(place);
    })();
  }

  function ensure() {
    if (root) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.className = 'bg2-wrap';
    root.innerHTML =
      '<div class="bg2-bubble" role="dialog" aria-label="봄이 안내"><button class="bg2-x" aria-label="닫기">×</button>' +
      '<div class="bg2-title"></div><div class="bg2-text"></div><div class="bg2-action" style="display:none"></div>' +
      '<div class="bg2-dots" style="display:none"></div>' +
      '<div class="bg2-btns"><button class="bg2-btn bg2-primary"></button><button class="bg2-btn bg2-ghost"></button></div></div>' +
      '<img class="bg2-face" alt="봄이">';
    document.body.appendChild(root);
    spotEl = document.createElement('div'); spotEl.className = 'bg2-spot'; document.body.appendChild(spotEl);
    bubbleEl = root.querySelector('.bg2-bubble'); faceEl = root.querySelector('.bg2-face');
    titleEl = root.querySelector('.bg2-title'); textEl = root.querySelector('.bg2-text'); actionEl = root.querySelector('.bg2-action');
    dotsEl = root.querySelector('.bg2-dots'); primaryBtn = root.querySelector('.bg2-primary'); ghostBtn = root.querySelector('.bg2-ghost');
    xBtn = root.querySelector('.bg2-x');
    faceEl.src = '/img/' + ((cfg() && cfg().face) || 'bom_smile.png'); // ★절대경로 — 하위경로 호스팅 대비
    faceEl.addEventListener('click', function () { if (bubbleEl.style.display === 'none') openWelcome(); });
    xBtn.addEventListener('click', dismiss);
  }
  function collapse() { if (!root) return; bubbleEl.style.display = 'none'; root.classList.add('on'); }
  function openWelcome() {
    var g = cfg(); if (!g) return; _idx = -1; bubbleEl.style.display = ''; root.classList.add('on'); clearSpot();
    titleEl.textContent = g.name || ''; titleEl.style.display = g.name ? '' : 'none';
    textEl.innerHTML = esc(fill(g.welcome));
    if (g.action) { actionEl.innerHTML = '→ ' + esc(fill(g.action)); actionEl.style.display = ''; } else actionEl.style.display = 'none';
    dotsEl.style.display = 'none';
    var hasTour = g.tour && g.tour.length;
    primaryBtn.textContent = hasTour ? '구경시켜 주세요' : '알겠어요 🌸';
    primaryBtn.onclick = hasTour ? startTour : dismiss;
    ghostBtn.style.display = hasTour ? '' : 'none'; ghostBtn.textContent = '알겠어요'; ghostBtn.onclick = dismiss;
    sayQuick((g.name ? g.name + '. ' : '') + g.welcome); // 텍스트 즉시. 음성은 빨리 준비되면 재생, 늦으면 스킵
    if (hasTour) { var s0 = g.tour[0]; prefetch(typeof s0 === 'string' ? s0 : s0.text); } // 첫 스텝 미리 받아 음성 지연 최소화
    // 환영과 동시에 핵심 1곳 자동 포커싱(부담 없이) — g.focus 없으면 첫 sel 스텝을 짚어줌
    var _f = g.focus; if (!_f) { var _t = g.tour || []; for (var _i = 0; _i < _t.length; _i++) { if (_t[_i] && typeof _t[_i] === 'object' && _t[_i].sel) { _f = _t[_i].sel; break; } } }
    if (_f) highlight(_f); else clearSpot();
  }
  function startTour() { _idx = 0; renderStep(); }
  function renderStep() {
    var g = cfg(), steps = g.tour || [];
    if (_idx < 0 || _idx >= steps.length) { dismiss(); return; }
    titleEl.style.display = 'none'; actionEl.style.display = 'none';
    var s = steps[_idx]; var stext = typeof s === 'string' ? s : s.text;
    textEl.innerHTML = esc(fill(stext));
    if (s && s.sel) highlight(s.sel); else clearSpot();
    dotsEl.style.display = ''; dotsEl.innerHTML = '';
    for (var i = 0; i < steps.length; i++) { var d = document.createElement('span'); d.className = 'bg2-dot' + (i === _idx ? ' on' : ''); dotsEl.appendChild(d); }
    var last = _idx === steps.length - 1;
    primaryBtn.textContent = last ? '다 봤어요 🌸' : '다음 →';
    primaryBtn.onclick = function () { _idx++; renderStep(); };
    ghostBtn.style.display = ''; ghostBtn.textContent = '그만 볼게요'; ghostBtn.onclick = dismiss;
    say(stext); // 텍스트 즉시, 음성 준비되는 대로
    var nx = steps[_idx + 1]; if (nx) prefetch(typeof nx === 'string' ? nx : nx.text); // 다음 스텝 미리 받기
  }
  function dismiss() { var g = cfg(); if (g) markSeen(g.key); stopVoice(); clearSpot(); collapse(); }

  // ── 파일럿 홈 버튼 표준화 (2026-07-14) ────────────────────────────────
  // 카드 헤더 규칙(왼쪽=홈으로)은 네이티브가 dasibom-header.js로 맞춤. 파일럿은 React 빌드라
  // 소스를 다시 빌드해야 해서, 실측상 이미 '왼쪽 홈으로'인 건 그대로 두고 어긋난 것만 여기서 교정:
  //   · 터치 높이 40px → 44px (어르신 손가락 기준. dream/gag/maeum이 미달이었음)
  //   · 문구 '←홈으로'(gag) → '← 홈으로' 로 통일
  // React가 다시 그리면 지워질 수 있어 잠시 반복 적용.
  function normalizeHome() {
    var els = document.querySelectorAll('a,button');
    for (var i = 0; i < els.length; i++) {
      var e = els[i], t = (e.textContent || '').trim();
      if (/^←\s*홈(으로)?$/.test(t)) {
        if (t !== '← 홈으로') e.textContent = '← 홈으로';
        var s = e.style;
        s.minHeight = '44px'; s.display = 'inline-flex'; s.alignItems = 'center';
        return true;
      }
    }
    return false;
  }
  function watchHome() {
    var n = 0;
    var iv = setInterval(function () { normalizeHome(); if (++n > 20) clearInterval(iv); }, 500); // 10초간
  }

  function start() {
    var g = cfg(); if (!g || !g.key) return;
    ensure(); ensureVoice();
    watchHome();
    if (!seen(g.key)) prefetch((g.name ? g.name + '. ' : '') + g.welcome); // 환영 대사 미리 받아두기(음성-텍스트 최대한 함께)
    if (seen(g.key)) collapse(); else setTimeout(openWelcome, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 300);
  window.BomGuidePilot = { open: openWelcome, reset: function (k) { try { localStorage.removeItem('dasibom_tut_v2_' + (k || (cfg() && cfg().key))); } catch (e) {} } };
})();
