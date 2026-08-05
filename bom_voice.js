/* ════════ 봄이 공용 음성 모듈 (ElevenLabs 프리미엄) ════════
   BomVoice.say(text)  — 서버(bomVoiceTTS Cloud Function)에서 봄이 목소리로 합성한 mp3를 재생.
                         서버가 텍스트 캐시(같은 문구 재사용)라 고정 멘트는 최초 1회만 실제 합성됨.
   ★적용 범위(Macho 확정 2026-07-07): 온보딩·콘텐츠가이드·상시챗봇 고정멘트·자서전질문+선물연출 등
     "정해진 대사"에만. 자유대화(AI 응답)는 음성 없이 텍스트만 — 여기서 say를 호출하지 않음.
   ★브라우저 기본음성 폴백 없음 — 프리미엄 실패 시 조용히 넘어감(어색한 로봇음성 방지).
   토글: localStorage 'dasibom_bomvoice'. 브라우저 정책상 첫 사용자 터치 후 재생됨.

   ★★음성 타이밍 표준 (Macho 확정 2026-07-13 — 모든 봄이 음성은 이 규칙을 따를 것) ★★
     "창 열고 한참 뒤 어색한 음성" 방지가 핵심. API 4종을 목적에 맞게:
       · say(text)              — 준비되는 대로 재생. 사용자 '상호작용'(버튼 클릭 등)으로 나오는 대사용.
                                  (버튼 누를 즈음엔 인프라 로드 끝났으니 바로 나옴)
       · sayIfQuick(text,maxMs) — maxMs(기본2800) 안에 준비되면 재생, 늦으면 스킵. ★'자동 인사'는 반드시 이걸로.
                                  (자동으로 뜨는 첫 대사가 5초 뒤 억지로 나오는 것 방지)
       · prefetch(text)         — 미리 합성만(재생X). 곧 나올 대사(환영/다음 스텝)를 로딩 중 미리 받아둠.
       · speakSynced(t,onStart,cap) — 텍스트를 음성과 '함께' 등장. memoir 인터뷰처럼 페이스가 느린 곳만.
     그리고 음성 인프라는 '가이드 열릴 때'가 아니라 '페이지 진입 즉시' 로드 시작할 것(가이드들 ensureVoice 참조).
     신규 카드/봄이 등장 지점 만들 때 이 표준 그대로. → 스킬 bom-voice-timing 참고.
   ══════════════════════════════════════════════════════════ */
(function () {
  if (window.BomVoice) return;
  var audio = new Audio();
  var FEATURE_ON = true;   // ★보이스 마스터 스위치 (ElevenLabs 연동 완료 — ON)

  // 1회성 마이그레이션: 프리미엄 보이스 출시 전(FEATURE_ON=false 시절)의 꺼짐 설정은
  // "소리가 안 나던 시절에 눌러본 기록"일 뿐이라 의미 없음 → 전원 켜짐으로 리셋.
  // 이후 사용자가 끄는 건 정상 저장·존중됨.
  try {
    if (!localStorage.getItem('dasibom_bomvoice_v2')) {
      localStorage.removeItem('dasibom_bomvoice');
      localStorage.setItem('dasibom_bomvoice_v2', '1');
    }
  } catch (e) {}
  var _mem = {};           // 세션 내 메모리 캐시: text → base64 dataURL (같은 문구 재요청 시 서버도 안 감)
  var _fn = null;

  // ── 자동재생 잠금 해제 ──────────────────────────────────────────────
  // 음성은 서버 왕복(1~2초) 뒤에 재생돼 사용자 제스처 스택을 벗어나므로 크롬이 차단함.
  // 첫 터치/클릭 시 '실제 길이가 있는' 무음 클립을 재생해 audio 요소를 깨워둠(길이0은 크롬이 재생으로 안 침).
  function _silentWav(){
    var sr=8000, n=1200, dl=n*2, len=44+dl, b=new Uint8Array(len), dv=new DataView(b.buffer);
    function s(o,str){ for(var i=0;i<str.length;i++) b[o+i]=str.charCodeAt(i); }
    s(0,'RIFF'); dv.setUint32(4,36+dl,true); s(8,'WAVE'); s(12,'fmt '); dv.setUint32(16,16,true);
    dv.setUint16(20,1,true); dv.setUint16(22,1,true); dv.setUint32(24,sr,true); dv.setUint32(28,sr*2,true);
    dv.setUint16(32,2,true); dv.setUint16(34,16,true); s(36,'data'); dv.setUint32(40,dl,true);
    var bin=''; for(var i=0;i<len;i++) bin+=String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,'+btoa(bin);
  }
  var _unlocked = false;
  function unlock() {
    if (_unlocked) return; _unlocked = true;
    try { audio.src = _silentWav(); var p = audio.play(); if (p && p.then) p.then(function(){},function(){}); } catch (e) {}
    ['pointerdown','touchstart','click','keydown'].forEach(function (ev) { document.removeEventListener(ev, unlock, true); });
  }
  ['pointerdown','touchstart','click','keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, true); });

  function isOn() { try { return FEATURE_ON && localStorage.getItem('dasibom_bomvoice') !== '0'; } catch (e) { return false; } }

  // ── ★음성 인프라 자립 (2026-07-14) ──────────────────────────────────────
  // 봄이 음성은 Cloud Function(bomVoiceTTS) 호출이라 firebase app+auth+**functions**와
  // '로그인'이 모두 있어야 난다. 예전엔 "페이지가 알아서 싣겠지"였는데 실제로 조사해보니
  // functions-compat을 실은 네이티브 카드가 people 하나뿐이었음 → 나머지는 봄이는 뜨는데
  // 소리만 안 나는 상태로 방치(Macho 지적 "보이스가 나오는 게 있고 안 나오는 게 있어").
  // → 이제 이 모듈이 '없는 것만' 스스로 채운다. 이미 있으면 아무것도 안 함(파일럿·people 등 영향 0).
  var FB_BASE = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-';
  var FB_CFG = {
    apiKey: 'AIzaSyAZAhBAsrKcXnznnx8_0oF2gyYC0WbvoP0', authDomain: 'mylife-650f0.firebaseapp.com',
    projectId: 'mylife-650f0', storageBucket: 'mylife-650f0.firebasestorage.app',
    messagingSenderId: '512010655611', appId: '1:512010655611:web:32b153b836b23ae96a8fde'
  };
  function hasMod(m) {
    try {
      if (m === 'app') return typeof firebase.initializeApp === 'function';
      if (m === 'auth') return typeof firebase.auth === 'function';
      if (m === 'functions') return typeof firebase.functions === 'function';
    } catch (e) {}
    return false;
  }
  // 페이지가 이미 <script>로 걸어둔 모듈이면 중복 주입하지 않고 기다리기만 함
  function tagPresent(m) { return !!document.querySelector('script[src*="firebase-' + m + '-compat"]'); }
  function addScript(src) {
    var s = document.createElement('script');
    s.src = src; s.async = false;   // 실행 순서 보장(app → auth/functions)
    document.head.appendChild(s);
  }
  var _booted = false;
  function boot() {
    if (_booted) return; _booted = true;
    // 페이지의 <script defer>들이 DOM에 다 올라온 뒤 판단(중복 주입 방지)
    function start() {
      ['app', 'auth', 'functions'].forEach(function (m) {
        if (!hasMod(m) && !tagPresent(m)) addScript(FB_BASE + m + '-compat.js');
      });
      var tries = 0;
      (function wait() {
        if (hasMod('app') && hasMod('auth') && hasMod('functions')) {
          try {
            if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FB_CFG);
            // 음성 함수는 인증을 요구 — 로그인 안 된 페이지면 익명으로(기존 로그인은 절대 안 건드림)
            firebase.auth().onAuthStateChanged(function (u) {
              if (!u) firebase.auth().signInAnonymously().catch(function () {});
            });
          } catch (e) {}
          return;
        }
        if (++tries > 100) { try { console.warn('[봄이보이스] firebase 모듈 로드 실패'); } catch (_) {} return; }
        setTimeout(wait, 100);
      })();
      watchdog();
    }
    // ★app-compat이 '나중에' 또 로드되면(예: game.html처럼 firebase를 JS로 동적 로드하는 페이지)
    //   window.firebase 네임스페이스가 새로 만들어지면서 우리가 등록해둔 functions가 통째로 사라진다.
    //   → 잠시 지켜보다가 functions만 없어졌으면 다시 채워 넣음. (실제로 game.html이 이 케이스였음)
    function watchdog() {
      var fixes = 0, ticks = 0;
      var iv = setInterval(function () {
        ticks++;
        try {
          if (hasMod('app') && !hasMod('functions') && fixes < 3) {
            fixes++; _fn = null;                       // 죽은 네임스페이스에 물린 콜러블 버림
            addScript(FB_BASE + 'functions-compat.js');
          }
        } catch (e) {}
        if (ticks > 20) clearInterval(iv);             // 약 20초만 감시 후 종료
      }, 1000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
  if (FEATURE_ON) boot();   // ★페이지 진입 즉시 준비 시작(대사가 나올 때 기다리지 않도록)

  // 캐시하지 않음 — 페이지가 firebase를 나중에 다시 로드하면(네임스페이스 교체) 캐시해둔 콜러블이
  // 죽은 앱을 물고 있어 조용히 실패함. 매번 새로 만드는 비용은 사실상 0.
  function getFn() {
    try {
      if (window.firebase && typeof firebase.functions === 'function' && firebase.apps && firebase.apps.length) {
        return firebase.app().functions('asia-northeast3').httpsCallable('bomVoiceTTS');
      }
    } catch (e) {}
    return null;
  }
  function playDataUrl(url) {
    try { audio.pause(); audio.src = url; audio.currentTime = 0; var p = audio.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  /* TTS용 정규화 — 이모지는 '서러게이트 쌍'(내부 2글자)이라 [🌸🎉…] 같은 문자 클래스는 반쪽 단위로
     매칭된다. 그래서 목록에 없는 이모지(🎙️ 등)도 앞 반쪽만 지워져 '고아 반쪽'이 남았고,
     ElevenLabs가 invalid_unicode(HTTP 400)로 전부 거부 → 해당 문구 영구 무음(2026-07-16 토론장 건).
     → 어차피 읽어줄 수 없는 글자들이므로: 모든 이모지(쌍)를 통째로 제거 + 홀로 남은 반쪽도 제거. */
  function clean(text) {
    return String(text || '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ') // 모든 이모지·아스트랄 문자(쌍 그대로)
      .replace(/[\uD800-\uDFFF]/g, ' ')                // 짝 잃은 반쪽(안전판 — 이게 400의 원인)
      .replace(/[☀-➿️‍✦→·]/g, ' ') // ☀~➿ 기호 + 변형선택자(FE0F)·ZWJ(200D)·✦→·
      .replace(/\s+/g, ' ').trim();
  }

  // firebase 준비 여부(앱 초기화 + 로그인까지) — memoir처럼 firebase를 늦게 로드하는 페이지 대응
  // 준비 = 앱 초기화 + 로그인 + ★functions 모듈까지. functions를 빼먹으면 아직 안 온 페이지에서
  // 호출했다가 조용히 실패함(무음). game.html처럼 firebase를 늦게 싣는 페이지 대응.
  function fbReady() {
    try {
      return !!(window.firebase && firebase.apps && firebase.apps.length
        && typeof firebase.functions === 'function'
        && firebase.auth && firebase.auth().currentUser);
    } catch (e) { return false; }
  }
  // firebase 준비되면 cb() 실행(최대 ~12초 폴링). 반환: 취소 함수.
  function whenReady(cb) {
    if (fbReady()) { cb(); return function () {}; }
    var tries = 0, timer = null, cancelled = false;
    (function poll() {
      if (cancelled) return;
      if (fbReady()) { cb(); return; }
      if (++tries > 40) { try { console.warn('[봄이보이스] firebase 대기 초과'); } catch (_) {} return; }
      timer = setTimeout(poll, 300);
    })();
    return function () { cancelled = true; if (timer) clearTimeout(timer); };
  }
  // 텍스트 → 오디오 dataURL 확보(메모리 캐시 우선 + 진행중 요청 중복방지). 반환: Promise<url|null>
  var _pending = {}; // text → Promise (prefetch와 say가 같은 문장을 두 번 합성하지 않도록)
  function fetchAudio(t) {
    if (_mem[t]) return Promise.resolve(_mem[t]);
    if (_pending[t]) return _pending[t];
    var p = new Promise(function (resolve) {
      whenReady(function () {
        var fn = getFn(); if (!fn) { delete _pending[t]; resolve(null); return; }
        fn({ text: t }).then(function (res) {
          delete _pending[t];
          var b64 = res && res.data && res.data.audioBase64;
          if (!b64) { resolve(null); return; }
          var url = 'data:audio/mpeg;base64,' + b64;
          _mem[t] = url; resolve(url);
        }).catch(function (e) { delete _pending[t]; try { console.warn('[봄이보이스] 합성 실패:', e && e.code, e && e.message); } catch (_) {} resolve(null); });
      });
    });
    _pending[t] = p;
    return p;
  }

  var _reqSeq = 0; // 최신 요청만 재생(질문을 빠르게 넘길 때 밀린 음성 방지)

  window.BomVoice = {
    isOn: isOn,
    setOn: function (v) { try { localStorage.setItem('dasibom_bomvoice', v ? '1' : '0'); } catch (e) {} if (!v) this.stop(); },
    // 단순 재생(준비되는 대로) — 온보딩·가이드·선물연출 등
    // stillWanted(선택): 재생 '직전'에 한 번 더 묻는 함수. false면 버림.
    //   (합성이 오래 걸리는 사이 어르신이 그 화면을 떠났으면 뒷북 음성을 내지 않기 위함)
    say: function (text, stillWanted) {
      if (!isOn()) return;
      var t = clean(text); if (!t) return;
      var my = ++_reqSeq;
      fetchAudio(t).then(function (url) {
        if (!url || my !== _reqSeq) return;
        if (stillWanted && !stillWanted()) return;
        playDataUrl(url);
      });
    },
    // ★빠르게 준비될 때만 재생(느리면 스킵) — 자동 인사가 창 열고 한참 뒤 어색하게 나오는 것 방지.
    //   미리 prefetch돼 있으면 즉시, 아니면 maxMs 안에 준비돼야 재생. 초과하면 조용히 넘어감.
    sayIfQuick: function (text, maxMs, stillWanted) {
      if (!isOn()) return;
      var t = clean(text); if (!t) return;
      var my = ++_reqSeq, dropped = false;
      var to = setTimeout(function () { dropped = true; }, maxMs || 2800);
      fetchAudio(t).then(function (url) {
        clearTimeout(to);
        if (dropped || my !== _reqSeq) return; // 너무 늦었거나 다음 요청에 밀림 → 재생 안 함
        if (stillWanted && !stillWanted()) return; // 그 화면을 이미 떠났으면 뒷북 금지
        if (url) playDataUrl(url);
      });
    },
    // ★타이핑과 음성 싱크: 오디오가 준비되면 onStart()(타이핑 시작)와 재생을 '동시에' 실행.
    //   준비가 capMs 넘게 걸리면(주로 첫 질문의 firebase 지연) 타이핑만 먼저 시작하고 음성은 도착 시 재생.
    speakSynced: function (text, onStart, capMs) {
      var t = clean(text);
      var my = ++_reqSeq;
      var started = false;
      function start() { if (started) return; started = true; try { onStart && onStart(); } catch (e) {} }
      if (!isOn() || !t) { start(); return; }
      var cap = setTimeout(start, capMs || 3500); // 안전판: 오래 걸려도 화면은 진행
      fetchAudio(t).then(function (url) {
        clearTimeout(cap);
        if (my !== _reqSeq) { start(); return; } // 이미 다음 질문으로 넘어감
        start();                                  // 타이핑 시작(이미 시작됐으면 무시)
        if (url) playDataUrl(url);                // 동시에 음성
      });
    },
    // 다음에 나올 문구를 미리 받아 캐시에 넣어둠(사용자가 넘기면 즉시 싱크)
    prefetch: function (text) {
      if (!isOn()) return;
      var t = clean(text); if (!t || _mem[t]) return;
      fetchAudio(t); // 결과는 _mem에만 저장, 재생 안 함
    },
    stop: function () { _reqSeq++; try { audio.pause(); } catch (e) {} }
  };
})();

/* ── 봄이 의상 갈아입히기 (2026-08-04) ────────────────────────────────
   봄이 그림은 41개 파일 120곳에서 img/bom_*.png 로 직접 참조된다.
   그 파일들을 전부 고치는 대신, 여기서 src만 갈아끼운다.
   기본(한복)은 원래 경로 그대로 두므로 아무것도 하지 않는다 = 위험 0. */
window.DasibomBomSkin = (function () {
  var KEY = 'dasibom_bom_outfit';
  var SETS = { hanbok: '', hoodie: 'bom/hoodie/', yellow: 'bom/yellow/' };   // 값은 img/ 아래 하위 폴더
  var cur = '';

  function pathFor(src) {
    // cur이 ''(한복)이면 원래 경로로 되돌리는 계산이 된다 — 그래야 갈아입기가 양방향이 된다
    // .../img/bom_smile.png  또는  .../img/bom/<의상>/bom_smile.png
    var m = String(src).match(/^(.*\/|)img\/(?:bom\/[^/]+\/)?(bom_[a-z_]+\.png)(\?.*)?$/);
    if (!m) return null;
    var want = m[1] + 'img/' + cur + m[2] + (m[3] || '');
    return want === src ? null : want;
  }
  function fix(el) {
    var want = pathFor(el.getAttribute('src') || '');
    if (want) el.setAttribute('src', want);
  }
  function sweep(root) {
    var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('img[src*="bom_"]') : [];
    for (var i = 0; i < list.length; i++) fix(list[i]);
  }

  function apply(name) {
    cur = SETS[name] || '';
    try { localStorage.setItem(KEY, name); } catch (e) {}
    sweep(document);
  }

  // 나중에 그려지는 봄이(팝업·말풍선·챗봇)도 잡는다
  function watch() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === 'attributes') { if (r.target.tagName === 'IMG') fix(r.target); continue; }
        for (var j = 0; j < r.addedNodes.length; j++) {
          var n = r.addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'IMG') fix(n); else sweep(n);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  var saved = 'hanbok';
  try { saved = localStorage.getItem(KEY) || 'hanbok'; } catch (e) {}
  cur = SETS[saved] || '';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { sweep(document); watch(); });
  else { sweep(document); watch(); }

  return {
    list: function () { return Object.keys(SETS); },
    get: function () { return saved; },
    set: function (n) { if (SETS[n] === undefined) return false; saved = n; apply(n); return true; }
  };
})();

/* ── [홈으로]·봄이 챗봇 자리 통일 (2026-08-04) ──────────────────────────
   전수 점검에서 나온 것들:
     · 아예 없음 3곳(온기·가족·자서전)
     · 스크롤 내리면 화면 밖으로 사라짐 6곳(건강돋보기는 2,129px 위)
     · 자리 어긋남 — 홈으로가 위오른쪽(구독)/아래왼쪽(시시콜콜), 봄이가 위왼쪽(자서전·맞고)
   20개 파일을 각각 고치는 대신 여기서 한 번에 맞춘다.
   ★기존 헤더 버튼은 건드리지 않는다. 헤더에서 빼내면 그 줄의 배치가 무너진다.
     대신 '스크롤로 사라지면' 그때 고정 칩을 띄운다. 없거나 자리가 틀린 페이지는 항상 띄운다. */
(function () {
  if (window.__dsbNav) return; window.__dsbNav = 1;

  var path = location.pathname.replace(/\/index\.html$/, '/');
  if (path === '/' || /\/index\.html$/.test(location.pathname) && path === '/') return;   // 홈에는 홈 버튼이 필요 없다
  if (path === '/' || path === '') return;

  function box(e) {
    if (!e) return null;
    var b = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (b.width < 6 || b.height < 6 || s.visibility === 'hidden' || +s.opacity < 0.1) return null;
    return b;
  }
  function findHome() {
    var els = document.querySelectorAll('a,button,div,span');
    for (var i = 0; i < els.length; i++) {
      var e = els[i], t = (e.textContent || '').replace(/\s+/g, ''), h = e.getAttribute('href') || '';
      var cls = typeof e.className === 'string' ? e.className : '';
      if (/홈으로|다시봄홈/.test(t) || h === '/' || h === '/index.html' || /dsb-exit/.test(cls)) {
        var bx = box(e);
        // '홈으로' 글자를 품은 큰 컨테이너(페이지 래퍼)를 버튼으로 오인하면 칩이 영영 숨는다
        if (bx && bx.width < 300 && bx.height < 120 && t.length < 20) return e;
      }
    }
    return null;
  }
  function findChat() {
    var els = document.querySelectorAll('a,button,div,img');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var id = (e.id || '') + ' ' + (typeof e.className === 'string' ? e.className : '');
      var img = e.querySelector && e.querySelector('img[src*="bom_"]');
      var self = e.tagName === 'IMG' && /bom_/.test(e.getAttribute('src') || '');
      if (!/bomchat|bom-chat|bomFab|chatFab|bcp-fab|bompop/i.test(id) && !img && !self) continue;
      var b = box(e);
      if (b && b.width < 200 && b.height < 200) return e;
    }
    return null;
  }

  // 표준 고정 칩 — 왼쪽 위, 48px 이상(시니어 터치 규격)
  var chip = document.createElement('a');
  chip.href = '/?home=1';   // ★표식 필수 — 없으면 홈이 인트로·복귀 경로를 타서 두 번 움직인다
  chip.setAttribute('aria-label', '다시봄 홈으로');
  chip.textContent = '← 홈으로';
  chip.style.cssText = 'position:fixed;left:12px;top:12px;z-index:99990;display:none;align-items:center;' +
    'min-height:48px;padding:0 18px;border-radius:24px;background:rgba(255,253,248,.96);color:#5A4632;' +
    'font:700 17px/1 "맑은 고딕",sans-serif;text-decoration:none;border:2px solid #E8C9A0;' +
    'box-shadow:0 4px 14px rgba(0,0,0,.18);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)';

  function place() {
    var home = findHome();
    var always = false;
    if (!home) always = true;                                  // 아예 없는 페이지
    else {
      var b = home.getBoundingClientRect();
      var topLeft = b.left < innerWidth / 2 && b.top < 180;
      if (!topLeft) { try { home.style.display = 'none'; } catch (e) {} always = true; }  // 자리가 틀린 페이지
    }
    document.body.appendChild(chip);

    function sync() {
      if (always) { chip.style.display = 'flex'; return; }
      var h = findHome();
      var vis = h && h.getBoundingClientRect().bottom > 4;      // 헤더 버튼이 아직 보이면 칩은 숨김
      chip.style.display = vis ? 'none' : 'flex';
    }
    sync();
    dodge();
    addEventListener('scroll', function(){ sync(); dodge(); }, { passive: true });
    addEventListener('resize', sync);

    /* 칩이 다른 고정 요소와 겹치면 그 아래로 내려준다.
       겹친 채로 두면 시니어가 엉뚱한 걸 누른다. */
    function dodge() {
      if (chip.style.display === 'none') return;
      chip.style.top = '12px';
      var c = chip.getBoundingClientRect(), push = 0;
      var all = document.querySelectorAll('body *');
      for (var i = 0; i < all.length; i++) {
        var e = all[i]; if (e === chip || chip.contains(e) || e.contains(chip)) continue;
        var st = getComputedStyle(e);
        if (st.position !== 'fixed' && st.position !== 'sticky') continue;
        if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity < 0.1) continue;
        if (st.pointerEvents === 'none') continue;   // 누를 수 없는 투명 덮개(튜토리얼 스포트라이트 등)는 장애물이 아니다
        var rh = e.getBoundingClientRect(); if (rh.height > innerHeight * 1.2) continue;   // 화면보다 큰 덮개도 제외
        var r = e.getBoundingClientRect();
        if (r.width < 8 || r.height < 8 || r.top > 240) continue;
        if (r.width > innerWidth * 0.96 && r.height > innerHeight * 0.8) continue;
        var ox = Math.min(c.right, r.right) - Math.max(c.left, r.left);
        var oy = Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top);
        if (ox > 6 && oy > 6) push = Math.max(push, r.bottom + 8);
      }
      if (push > 12) chip.style.top = Math.min(push, 200) + 'px';
    }

    // 봄이 챗봇 — 오른쪽 아래로 통일
    var c = findChat();
    if (c) {
      var cb = c.getBoundingClientRect();
      var rightBottom = cb.left > innerWidth / 2 && cb.top > innerHeight / 2;
      if (!rightBottom) {
        c.style.position = 'fixed';
        c.style.right = '16px'; c.style.bottom = '92px';
        c.style.left = 'auto'; c.style.top = 'auto';
        c.style.zIndex = '99985';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(place, 1200); });
  else setTimeout(place, 1200);
})();
