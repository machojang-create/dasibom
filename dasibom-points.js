/* ════════ 다시봄 포인트 — 클라이언트 공용 모듈 (2026-07-18) ════════
   ★포인트는 서버(Functions)에서만 지급된다. 이 모듈은 '요청'만 하고 잔액을 보여줄 뿐,
     스스로 포인트를 만들지 않는다(만들어도 규칙이 막음).

   콘텐츠 페이지에서:
     <script src="/dasibom-points.js?v=1"></script>
     // 사용자가 '실제 행동'을 한 뒤 한 줄:
     DasibomPoints.earn('nostalgia');   // 하루 1회/콘텐츠, 지급되면 토스트로 +10 표시
   키(서버 지급표와 일치): attend·memoir·brain·arcade·matgo·nostalgia·trendy·
     dream·maeum·gag·debate·maeumlab
   ※건강돋보기(health)는 지급/공유 없음(법적 리스크 — release_blockers #4).

   공유 적립: 페이지 URL에 ?ref=<토큰>이 있으면(친구가 보낸 링크로 들어온 것),
   로드 시 자동으로 claimReferral 호출 → 공유자에게 포인트(수신자는 1회만 집계).
   내 공유 링크는 DasibomPoints.refLink(cb) 로 발급.
   ══════════════════════════════════════════════════════════ */
(function () {
  if (window.DasibomPoints) return;

  /* ★화폐 이름·아이콘 — 여기 한 줄만 바꾸면 전 페이지 반영.
     후보 아이콘: 🌸(분홍) 🌼(노랑) 🌷 🏵️ 💮 / 이름: 꽃잎·봄씨앗 등 */
  var POINT_NAME = '꽃잎';
  var POINT_ICON = '🌸'; // 순수 텍스트 문맥(시스템 공유문 등)용
  /* 화면 표시는 자체 SVG — 이모지 🌸가 윈도우 등에서 흰 별이 박힌 모양으로 렌더되어
     '별모양'으로 보이는 문제(2026-07-20 Macho 지적). 5장 꽃잎+진분홍 꽃술, 별 없음. */
  var PETAL_SVG = (function () {
    var petals = '';
    for (var a = 0; a < 360; a += 72) {
      petals += '<ellipse cx="12" cy="6.6" rx="3.5" ry="5.1" fill="#F79BB8" transform="rotate(' + a + ' 12 12)"/>';
    }
    return '<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.12em" aria-hidden="true">' +
      petals + '<circle cx="12" cy="12" r="2.7" fill="#E4587E"/></svg>';
  })();
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // 텍스트 속 🌸를 SVG 꽃잎으로 치환해 안전하게 HTML로
  function withPetal(s) { return escHtml(s).split(POINT_ICON).join(PETAL_SVG); }
  var _refUrl = null, _refToken = null;   // 공유 링크·토큰 캐시(클릭 시 동기 사용)

  // 실제 공유/복사 — 반드시 사용자 클릭 컨텍스트 안에서 동기 호출될 것
  function doShare(url) {
    var payload = {
      title: '다시봄 — 다시 오는 봄, 다시 보는 인생',
      text: '봄이랑 매일 도란도란, 옛 추억도 다시 보고. 같이 해요 🌸',
      url: url
    };
    if (navigator.share) { navigator.share(payload).catch(function () {}); return; }
    var done = function () { toast('링크를 복사했어요. 친구에게 붙여넣어 보내주세요 🌸'); };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(url).then(done).catch(function () { legacyCopy(url, done); });
    else legacyCopy(url, done);
  }

  function fn(name) {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.functions === 'function')
        return firebase.app().functions('asia-northeast3').httpsCallable(name);
    } catch (e) {}
    return null;
  }
  // firebase 준비(익명 로그인 포함)될 때까지 대기 후 콜백. 대부분 페이지는 bom_voice.js가 부팅.
  function whenReady(cb, tries) {
    tries = tries || 0;
    try {
      if (window.firebase && firebase.apps && firebase.apps.length &&
          typeof firebase.functions === 'function' && firebase.auth && firebase.auth().currentUser) {
        return cb();
      }
    } catch (e) {}
    if (tries > 50) return;            // ~10초 후 포기(조용히)
    setTimeout(function () { whenReady(cb, tries + 1); }, 200);
  }

  var _t;
  // 스프링 등장 + 적립일 땐 꽃잎이 흩날리는 연출(모션감소 설정 시 정적 페이드)
  function _ensureToastCss() {
    if (document.getElementById('dsbptToastCss')) return;
    var s = document.createElement('style'); s.id = 'dsbptToastCss';
    s.textContent =
      '@keyframes dsbptPop{0%{opacity:0;transform:translateX(-50%) translateY(18px) scale(.6)}' +
      '60%{opacity:1;transform:translateX(-50%) translateY(-4px) scale(1.06)}' +
      '80%{transform:translateX(-50%) translateY(1px) scale(.98)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}' +
      '@keyframes dsbptPetal{0%{opacity:0;transform:translate(0,0) scale(.5) rotate(0)}' +
      '18%{opacity:1}100%{opacity:0;transform:translate(var(--px),var(--py)) scale(1.15) rotate(var(--pr))}}' +
      '@keyframes dsbptBump{0%{transform:scale(1)}32%{transform:scale(1.26)}62%{transform:scale(.96)}100%{transform:scale(1)}}' +
      '[data-dsbpt-badge].dsbpt-bumped{display:inline-block;animation:dsbptBump .5s ease;color:#0e9d7d}' +
      /* ★동작 줄이기라도 '받았다'는 신호는 남긴다(2026-08-04): 예전엔 꽃잎을 통째로 숨겨
     "연출이 아예 안 나온다"가 됐다. 흩날리기만 없애고 잠깐 떠 있다 사라지게 한다. */
      '@media (prefers-reduced-motion:reduce){.dsbpt-toast{animation:none !important}' +
      '.dsbpt-petal{animation:dsbptPetalStill 1.1s ease-out both !important}' +
      '[data-dsbpt-badge].dsbpt-bumped{animation:none}}' +
      '@keyframes dsbptPetalStill{0%{opacity:0}20%{opacity:1}100%{opacity:0}}';
    document.head.appendChild(s);
  }
  function toast(msg) {
    try {
      _ensureToastCss();
      var d = document.createElement('div');
      d.className = 'dsbpt-toast';
      d.innerHTML = withPetal(msg);
      d.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#33492A;color:#F5F1E8;' +
        'padding:13px 22px;border-radius:50px;font-size:15px;font-weight:800;z-index:100010;box-shadow:0 12px 28px -12px rgba(0,0,0,.5);' +
        "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:88vw;text-align:center;" +
        'animation:dsbptPop .5s cubic-bezier(.34,1.7,.5,1) both';
      document.body.appendChild(d);
      // 적립(+N) 토스트에만 꽃잎 흩날리기
      if (/\+\d/.test(msg)) {
        for (var i = 0; i < 6; i++) {
          var p = document.createElement('div');
          p.className = 'dsbpt-petal';
          var ang = (-90 + (i - 2.5) * 26) * Math.PI / 180;    // 부채꼴 위쪽으로
          var dist = 54 + Math.random() * 46;
          p.style.cssText = 'position:fixed;left:50%;bottom:112px;z-index:100010;font-size:' + (14 + Math.random() * 8) + 'px;' +
            'pointer-events:none;--px:' + Math.round(Math.cos(ang) * dist) + 'px;--py:' + Math.round(Math.sin(ang) * dist - 26) + 'px;' +
            '--pr:' + Math.round(-40 + Math.random() * 80) + 'deg;' +
            'animation:dsbptPetal ' + (0.9 + Math.random() * 0.5) + 's ease-out ' + (i * 0.06) + 's both';
          p.innerHTML = PETAL_SVG;
          document.body.appendChild(p);
          (function (pp) { setTimeout(function () { pp.remove(); }, 1900); })(p);
        }
      }
      /* ★읽는 시간 규칙(2026-08-04 FGT ②): 2.6초 고정이라 "글씨가 빨리 사라진다"는 지적이 나왔다.
         시니어 기준 한글 3자/초 + 알아채는 시간 1.2초. 최소 4.5초, 최대 10초. */
      var _hold = Math.max(4500, Math.min(10000, 1200 + String(msg || '').length * 330));
      clearTimeout(_t); _t = setTimeout(function () { d.style.transition = 'opacity .3s'; d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 300); }, _hold);
    } catch (e) {}
  }

  /* ── 출석(하루 첫 활동) 봄이 팝업(2026-07-27 Macho) ──
     "출석 = 활동 인지"를 명확히: 오늘 첫 활동 때 봄이가 나와 꽃잎을 건넨다.
     작은 토스트로 스쳐 지나가면 어르신이 못 알아채므로 중앙 팝업으로. */
  function _ensureAttendCss() {
    if (document.getElementById('dsbattCss')) return;
    var s = document.createElement('style'); s.id = 'dsbattCss';
    s.textContent =
      '.dsbatt-ov{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(30,22,10,.42);backdrop-filter:blur(2px);transition:opacity .26s;' +
      "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;padding:24px}" +
      '.dsbatt-box{background:linear-gradient(160deg,#FFFDF7,#F5ECD6);border:1px solid #E7DCBE;border-radius:28px;' +
      'padding:26px 26px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 26px 60px -24px rgba(90,60,10,.6);' +
      'animation:dsbattPop .5s cubic-bezier(.34,1.7,.5,1) both}' +
      '@keyframes dsbattPop{0%{opacity:0;transform:translateY(22px) scale(.7)}60%{opacity:1;transform:translateY(-5px) scale(1.05)}100%{opacity:1;transform:translateY(0) scale(1)}}' +
      '.dsbatt-face{width:96px;height:96px;border-radius:50%;object-fit:cover;object-position:center top;background:#fff;' +
      'border:3px solid #fff;box-shadow:0 8px 20px -8px rgba(0,0,0,.35);margin:-58px auto 8px;display:block}' +
      '.dsbatt-t{font-size:22px;font-weight:900;color:#33492A;margin-top:4px}' +
      '.dsbatt-p{font-size:18px;font-weight:800;color:#5b3a1a;margin:10px 0 6px}' +
      '.dsbatt-p b{color:#D06A8C;font-size:22px}' +
      '.dsbatt-s{font-size:14px;line-height:1.6;color:#8a7a5c;word-break:keep-all;margin-bottom:16px}' +
      '.dsbatt-btn{display:block;width:100%;border:none;border-radius:50px;padding:15px;cursor:pointer;' +
      "font-family:inherit;font-weight:900;font-size:17px;color:#241B06;background:linear-gradient(145deg,#F2B8CE,#E58AAE)}" +
      '.dsbatt-btn:active{transform:scale(.99)}' +
      '.dsbatt-x{position:absolute;top:6px;right:6px;border:none;background:transparent;cursor:pointer;' +
      'font-size:26px;line-height:1;color:#A6977A;padding:12px;font-family:inherit}' + /* 터치 영역 50px — 어르신 손가락(2차 평가단 지적) */
      '.dsbatt-box{position:relative}' +
      '@media (prefers-reduced-motion:reduce){.dsbatt-box{animation:none}}';
    document.head.appendChild(s);
  }
  /* ★출석은 '눌러서 받는다'(2026-07-30 Macho 지적) ─────────────────────────
     예전: 6초 머무름+조작을 기다렸다가 사용자가 아무것도 안 눌러도 자동 지급 → 팝업이 늦게 뜨고,
           그 전에 나가면 출석 자체가 안 됐다. 게다가 7초 뒤 자동으로 닫혀 받기도 전에 사라졌다.
     지금: 들어오면 바로 봄이가 나와 [출석하고 꽃잎 받기] 버튼을 내민다. 눌러야 지급되고,
           받기 전에는 자동으로 닫히지 않는다(어르신이 놓칠 일 없음). 하루 1회는 서버가 최종 판정. */
  function attendPopup(opts) {
    opts = opts || {};
    try {
      if (document.getElementById('dsbAttendPop')) return;
      _ensureAttendCss();
      var face = (window.BOM_GUIDE && window.BOM_GUIDE.face) || 'bom_cheer.png';
      var wrap = document.createElement('div');
      wrap.id = 'dsbAttendPop'; wrap.className = 'dsbatt-ov';
      wrap.innerHTML =
        '<div class="dsbatt-box" role="dialog" aria-live="polite">' +
        // ★닫기 X(2026-08-01 100명 평가단 지적: "닫는 법을 몰라 겁난다") — 받지 않고도 닫을 수 있게
        '<button type="button" class="dsbatt-x" id="dsbattX" aria-label="닫기">✕</button>' +
        '<img class="dsbatt-face" src="/img/' + escHtml(face) + '" alt="봄이" onerror="this.src=\'/img/bom_smile.png\'">' +
        '<div class="dsbatt-t">오늘도 와주셨네요!</div>' +
        '<div class="dsbatt-p" id="dsbattMsg">' + PETAL_SVG + ' 출석 꽃잎을 챙겨드릴게요</div>' +
        '<div class="dsbatt-s" id="dsbattSub">아래 버튼을 눌러 오늘의 꽃잎을 받아가세요 🌸</div>' +
        '<button type="button" class="dsbatt-btn" id="dsbattGet">출석하고 꽃잎 받기</button>' +
        '</div>';
      document.body.appendChild(wrap);
      var closed = false, got = false;
      function close() { if (closed) return; closed = true; wrap.style.opacity = '0'; setTimeout(function () { wrap.remove(); }, 280); }
      var btn = wrap.querySelector('#dsbattGet');
      var xBtn = wrap.querySelector('#dsbattX');
      if (xBtn) xBtn.addEventListener('click', close);
      // ★속도 개선(2026-07-31 Macho: "지급이 5초라 느려"): 팝업이 뜨자마자 뒤에서 미리 받아둔다.
      //   서버 함수 콜드스타트(2~4초)를 '어르신이 팝업 읽는 몇 초'에 숨긴다. 표시는 버튼을 눌러야 —
      //   직접 '챙기는' 손맛은 유지(자동 닫힘 없음). 대개 누를 때쯤엔 이미 받아둬서 즉시 뜬다.
      var pf = { done: false, amount: 0, err: null, inflight: false, waiter: null };
      function startGrant() {
        if (pf.inflight || pf.done) return;
        pf.inflight = true;
        _grantAttend(function (err, amount) {
          pf.inflight = false; pf.done = true; pf.amount = amount; pf.err = err;
          if (pf.waiter) { var w = pf.waiter; pf.waiter = null; w(); }
        });
      }
      startGrant();                                          // 팝업 등장 즉시 프리페치
      function reveal() {
        var msg = wrap.querySelector('#dsbattMsg'), sub = wrap.querySelector('#dsbattSub');
        if (pf.amount > 0) {
          got = true; btn.disabled = false;
          msg.innerHTML = PETAL_SVG + ' 출석 꽃잎 <b>+' + pf.amount + '</b>';
          sub.textContent = '내일도 만나요. 자주 들를수록 꽃잎이 소복이 쌓인답니다.';
          btn.textContent = '고마워요 🌸';
          refreshBadges();                                   // 배지 숫자 롤업 연출
          setTimeout(close, 1600);  // 3.2s→1.6s: 받은 뒤 오래 떠 있어 멈춘 줄 안다는 지적(3차 채점단)
        } else if (!pf.err) {
          got = true; btn.disabled = false;
          msg.innerHTML = PETAL_SVG + ' 오늘 출석은 이미 하셨어요';
          sub.textContent = '내일 다시 오시면 새 꽃잎을 드릴게요 🌸';
          btn.textContent = '알겠어요';
          setTimeout(close, 1600);  // 3.2s→1.6s: 받은 뒤 오래 떠 있어 멈춘 줄 안다는 지적(3차 채점단)
        } else {
          msg.innerHTML = PETAL_SVG + ' 잠시 후 다시 시도해 주세요';
          sub.textContent = '연결이 잠깐 느렸나 봐요. 다시 한 번 눌러주세요.';
          btn.textContent = '다시 받기'; btn.disabled = false; got = false;
          pf.done = false; pf.err = null;                    // 다음 클릭에서 재시도
        }
      }
      btn.addEventListener('click', function () {
        if (got) { close(); return; }                        // 이미 받았으면 닫기
        if (pf.done) { reveal(); return; }                   // 미리 받아둠 → 즉시 표시(빠름)
        btn.disabled = true; btn.textContent = '꽃잎 담는 중… 🌸';
        pf.waiter = reveal; startGrant();                    // 진행 중이면 대기, 실패했으면 재시도
      });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      // ※받기 전에는 자동으로 닫지 않는다 — 놓쳐서 출석을 못 하는 일이 없도록.
    } catch (e) {}
  }

  // 실제 지급(서버가 하루 1회 판정) — cb(err, awarded)
  function _grantAttend(cb) {
    var day = new Date().toISOString().slice(0, 10);
    var lk = 'dsbpt_attend_' + day;
    whenReady(function () {
      var f = fn('awardPoints');
      if (!f) { cb(new Error('unavailable'), 0); return; }
      f({ event: 'attend' }).then(function (r) {
        try { localStorage.setItem(lk, '1'); } catch (e) {}
        var d = r && r.data;
        cb(null, (d && d.ok && d.awarded) ? d.awarded : 0);
      }).catch(function (e) { cb(e || new Error('fail'), 0); });
    });
  }

  // 오늘 아직 출석 전이면 들어오자마자 봄이가 출석 팝업을 내민다(지급은 버튼을 눌러야).
  function autoAttend() {
    try { if (localStorage.getItem('dsbpt_attend_' + new Date().toISOString().slice(0, 10))) return; } catch (e) {}
    setTimeout(function () { attendPopup(); }, 1200);   // 화면이 자리 잡은 직후 바로
  }

  var DasibomPoints = {
    // 콘텐츠 이용 적립(하루 1회/콘텐츠). silent=true면 토스트 없이.
    earn: function (event, opt) {
      opt = opt || {};
      // 하루 1회는 서버가 최종 판정하지만, 로컬 플래그로 불필요한 호출을 줄임
      var day = new Date().toISOString().slice(0, 10);
      var lk = 'dsbpt_' + event + '_' + day;
      try { if (localStorage.getItem(lk)) return; } catch (e) {}
      whenReady(function () {
        var f = fn('awardPoints'); if (!f) return;
        f({ event: event }).then(function (r) {
          try { localStorage.setItem(lk, '1'); } catch (e) {}   // 오늘은 더 안 부름(지급/이미받음 무관)
          var d = r && r.data;
          if (d && d.ok && d.awarded && !opt.silent) { toast(POINT_ICON + ' ' + POINT_NAME + ' +' + d.awarded); refreshBadges(); }
        }).catch(function () {});
      });
    },
    // 출석 — 봄이가 '받기' 버튼을 내밀고, 누르면 그때 지급(2026-07-30 Macho: "버튼을 눌러야 지급").
    //   하루 1회 판정은 서버(awardPoints attend)가 최종적으로 한다.
    attend: function () {
      try { if (localStorage.getItem('dsbpt_attend_' + new Date().toISOString().slice(0, 10))) return; } catch (e) {}
      attendPopup();
    },
    // 콘텐츠 '실제 이용' 적립 — 페이지 열기만으론 안 주고, 일정 시간 머무름 + 조작 1회 후 지급.
    //   React 파일럿 등 내부를 몰라도 붙는 범용 방식(탭만 훑는 어뷰징 차단).
    earnOnEngage: function (event, opt) {
      opt = opt || {};
      /* ★8초 → 3초 (2026-08-04 Macho "왜 8초나 머물러야 하나").
         원래 8초는 '탭만 훑는 어뷰징 차단'이 이유였는데, 다시 보니 근거가 약했다.
         서버에 이미 '콘텐츠당 하루 1회' 상한이 있어서 오래 머물지 않아도 더 받을 꽃잎이 없다.
         즉 어뷰징은 상한이 막고 있고 8초는 실사용자만 걸러내는 이중 장벽이었다.
         잠깐 들렀다 나가는 어르신이 못 받는 쪽이 훨씬 큰 손해다. */
      var sec = opt.seconds || 3;
      // 오늘 이미 받았으면 아예 리스너 안 검
      try { var day = new Date().toISOString().slice(0, 10); if (localStorage.getItem('dsbpt_' + event + '_' + day)) return; } catch (e) {}
      var timeOk = false, interacted = false, done = false, self = this;
      // 스크롤도 '이용'으로 인정 — 건강돋보기·직업 상담소처럼 읽기만 하는 화면은 누를 일이 없다(2026-08-04)
      var evs = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
      function onI() { interacted = true; go(); }
      function cleanup() { evs.forEach(function (e) { document.removeEventListener(e, onI, true); }); }
      function go() { if (done || !timeOk || !interacted) return; done = true; cleanup(); self.earn(event); }
      evs.forEach(function (e) { document.addEventListener(e, onI, true); });
      setTimeout(function () { timeOk = true; go(); }, sec * 1000);
    },

    // 잔액 조회(본인 users 문서 읽기 — 규칙상 읽기 허용)
    balance: function (cb) {
      whenReady(function () {
        // React 콘텐츠 페이지는 firestore-compat이 없음(bomguide는 app·auth·functions만 로드)
        // → 필요 시 여기서 한 번 로드(버전은 bomguide와 동일 9.23.0)
        function go() {
          try {
            var uid = firebase.auth().currentUser.uid;
            firebase.firestore().collection('users').doc(uid).get().then(function (d) {
              cb((d.exists && d.data().dsbPoints) || 0);
            }).catch(function () { cb(null); });
          } catch (e) { cb(null); }
        }
        if (typeof firebase.firestore === 'function') { go(); return; }
        var s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
        s.onload = go; s.onerror = function () { cb(null); };
        document.head.appendChild(s);
      });
    },
    // 내 공유 링크(?ref=토큰 포함) 발급. 한 번 받으면 캐시(_refUrl)해서 클릭 시 즉시 사용.
    refLink: function (cb) {
      if (_refUrl) { cb(_refUrl); return; }
      whenReady(function () {
        var f = fn('createRefLink'); if (!f) { cb(null); return; }
        f({}).then(function (r) {
          var t = r && r.data && r.data.token;
          _refToken = t || null;
          _refUrl = t ? (location.origin + '/?ref=' + t) : null;
          cb(_refUrl);
        }).catch(function () { cb(null); });
      });
    },
    // 꽃잎 소비(하수구) — 서버가 가격·잔액 판정. cb(err, {ok, spent|reason, balance})
    spend: function (item, cb) {
      whenReady(function () {
        var f = fn('spendPoints'); if (!f) { cb && cb({ code: 'unavailable' }); return; }
        f({ item: String(item) }).then(function (r) {
          var d = (r && r.data) || {};
          if (d.balance != null) fillBadges(d.balance);
          cb && cb(null, d);
        }).catch(function (e) { cb && cb(e); });
      });
    },
    // ── 앱 상태 서버 백업(육성 콘텐츠용) — users/{uid}/apps/{app} 문서 (규칙: 본인 하위컬렉션 허용) ──
    //   기기 localStorage가 날아가도(폰 교체·저장공간 정리) 계정에 화분·어항이 남는다.
    saveBlob: function (app, data, cb) {
      whenReady(function () {
        function go() {
          try {
            var uid = firebase.auth().currentUser.uid;
            firebase.firestore().collection('users').doc(uid).collection('apps').doc(String(app)).set({
              data: JSON.stringify(data), savedAt: Date.now()
            }).then(function () { cb && cb(null); }).catch(function (e) { cb && cb(e); });
          } catch (e) { cb && cb(e); }
        }
        if (typeof firebase.firestore === 'function') { go(); return; }
        var s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
        s.onload = go; s.onerror = function () { cb && cb(new Error('no firestore')); };
        document.head.appendChild(s);
      });
    },
    loadBlob: function (app, cb) {
      whenReady(function () {
        function go() {
          try {
            var uid = firebase.auth().currentUser.uid;
            firebase.firestore().collection('users').doc(uid).collection('apps').doc(String(app)).get()
              .then(function (d) {
                if (!d.exists) { cb && cb(null, null); return; }
                var v = d.data();
                var parsed = null; try { parsed = JSON.parse(v.data); } catch (e) {}
                cb && cb(null, { data: parsed, savedAt: v.savedAt || 0 });
              }).catch(function (e) { cb && cb(e); });
          } catch (e) { cb && cb(e); }
        }
        if (typeof firebase.firestore === 'function') { go(); return; }
        var s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
        s.onload = go; s.onerror = function () { cb && cb(new Error('no firestore')); };
        document.head.appendChild(s);
      });
    },
    // 동기 토큰 접근(공유 URL에 ?ref= 붙이기용) — refLink()가 미리 발급해두면 값이 있다
    refToken: function () { return _refToken; },
    name: POINT_NAME, icon: POINT_ICON, iconSvg: PETAL_SVG,

    // 친구에게 알리기(선물 프레임). ★공유·복사는 사용자 클릭 순간에 실행돼야 함
    //   (링크를 그때 비동기로 받으면 클릭 권한이 만료돼 공유창·복사가 막힘) →
    //   카드 마운트 때 미리 발급해둔 _refUrl을 동기적으로 쓴다.
    invite: function () {
      var url = _refUrl;
      if (!url) {   // 아직 준비 전(드묾) — 최선의 노력으로 발급 후 시도
        this.refLink(function (u) { if (u) doShare(u); else toast('잠시 후 다시 시도해 주세요'); });
        return;
      }
      doShare(url);
    },

    // 잔액+초대 카드를 elId 요소에 렌더. 시니어용 큰 글씨·큰 버튼.
    card: function (elId) {
      var host = typeof elId === 'string' ? document.getElementById(elId) : elId;
      if (!host) return;
      host.innerHTML =
        '<div class="dsbpt-card">' +
        '<div class="dsbpt-bal"><span class="dsbpt-ic">' + PETAL_SVG + '</span>' +
        '<span class="dsbpt-num" data-dsbpt-badge>0</span><span class="dsbpt-unit">' + POINT_NAME + '</span></div>' +
        '<p class="dsbpt-desc">친구가 내 링크로 들어오면 <b>' + PETAL_SVG + ' 80' + POINT_NAME + '</b>을 드려요.<br>좋은 걸 나누고 ' + POINT_NAME + '도 모아보세요.</p>' +
        '<button class="dsbpt-btn" type="button">친구에게 알리고 ' + POINT_NAME + ' 받기 →</button>' +
        '</div>';
      injectCSS();
      host.querySelector('.dsbpt-btn').addEventListener('click', function () { DasibomPoints.invite(); });
      this.balance(function (b) { if (b != null) fillBadges(b); });
      this.refLink(function () {});   // ★링크 미리 발급(클릭 시 즉시 공유되도록)
      loadMailbox(host);              // ✉️ 꽃잎 쪽지함(이벤트 지급) — 안 읽은 쪽지가 있을 때만 나타남
    }
  };

  /* ── 꽃잎 쪽지함(2026-07-21 Macho): 운영자가 보낸 이벤트 쪽지를 홈 카드 밑에 표시.
     수령은 반드시 버튼 액션(서버 claimMail) — 자동 지급 아님, 수령 기록=활동 신호. ── */
  function loadMailbox(host) {
    whenReady(function () {
      function go() {
        try {
          var uid = firebase.auth().currentUser.uid;
          firebase.firestore().collection('mailbox').doc(uid).collection('msgs')
            .orderBy('at', 'desc').limit(20).get().then(function (qs) {
              var msgs = [];
              qs.forEach(function (d) { var v = d.data(); if (!v.claimed) msgs.push({ id: d.id, t: v.title, b: v.body, a: v.amount || 0 }); });
              if (!msgs.length) return;
              var box = document.createElement('div');
              box.className = 'dsbpt-card';
              box.style.marginTop = '12px';
              var rows = msgs.map(function (m) {
                return '<div class="dsbpt-mail" data-mid="' + m.id + '" style="display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #F0E6D2;border-radius:16px;padding:12px 14px;margin-top:8px">' +
                  '<span style="font-size:22px">💌</span>' +
                  '<div style="flex:1;min-width:0;text-align:left"><div style="font-weight:800;font-size:15px;color:#4a3a26">' + escHtml(m.t) + '</div>' +
                  (m.b ? '<div style="font-size:13px;color:#8a6a48;margin-top:2px">' + escHtml(m.b) + '</div>' : '') + '</div>' +
                  '<button type="button" data-claim="' + m.id + '" style="flex:none;border:none;border-radius:50px;padding:10px 14px;font-weight:900;font-size:14px;color:#fff;background:linear-gradient(145deg,#ef8fae,#d96a90);cursor:pointer">' +
                  (m.a > 0 ? withPetal(m.a + POINT_NAME + ' 받기') : '확인') + '</button></div>';
              }).join('');
              box.innerHTML = '<div style="font-weight:900;font-size:17px;color:#5b3a1a">💌 나에게 온 쪽지 <span style="color:#d96a90">' + msgs.length + '</span>통</div>' + rows;
              host.appendChild(box);
              box.addEventListener('click', function (ev) {
                var btn = ev.target.closest('[data-claim]');
                if (!btn || btn.disabled) return;
                btn.disabled = true;
                var f = fn('claimMail'); if (!f) { btn.disabled = false; return; }
                f({ id: btn.getAttribute('data-claim') }).then(function (r) {
                  var d = r && r.data;
                  if (d && d.ok) {
                    if (d.amount > 0) toast('+' + d.amount + POINT_NAME + ' 받았어요! ' + POINT_ICON);
                    var row = btn.closest('.dsbpt-mail'); if (row) row.remove();
                    refreshBadges();
                  } else { btn.disabled = false; }
                }).catch(function () { btn.disabled = false; });
              });
            }).catch(function () {});
        } catch (e) {}
      }
      if (typeof firebase.firestore === 'function') { go(); return; }
      var s = document.createElement('script');
      s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
      s.onload = go; document.head.appendChild(s);
    });
  }

  // 배지 숫자 롤업 연출 — '내 꽃잎이 올라가는' 보상감(2026-07-31 Macho).
  //   증가할 때만 카운트업, 첫 표시·감소·reduced-motion은 즉시(산만함 방지). 소리는 전역 토글 준수.
  function _countUp(el, from, to) {
    _ensureToastCss();
    if (el._dsbptRaf) cancelAnimationFrame(el._dsbptRaf);   // 직전 롤업 취소(연속 획득 겹침 방지)
    var dur = 700, t0 = 0;
    try { if (window.DasibomFX && DasibomFX.reward) DasibomFX.reward(); } catch (e) {}
    el.classList.remove('dsbpt-bumped');
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);                  // easeOutCubic
      el.textContent = Math.round(from + (to - from) * e).toLocaleString();
      if (p < 1) { el._dsbptRaf = requestAnimationFrame(step); }
      else { el._dsbptRaf = 0; el.textContent = to.toLocaleString(); void el.offsetWidth; el.classList.add('dsbpt-bumped'); }
    }
    el._dsbptRaf = requestAnimationFrame(step);
  }
  // 화면의 모든 잔액 배지 갱신
  function fillBadges(n) {
    var to = Number(n) || 0;
    var reduce = false;
    try { reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
    var els = document.querySelectorAll('[data-dsbpt-badge]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var from = Number(String(el.textContent).replace(/[^0-9.\-]/g, '')) || 0;
      var inited = el.hasAttribute('data-dsbpt-init');
      // 처음 표시거나·감소·변화없음·과대점프(오류)·모션최소화 → 즉시. 실제 '증가'일 때만 롤업.
      if (!inited || reduce || to <= from || (to - from) > 100000) {
        if (el._dsbptRaf) { cancelAnimationFrame(el._dsbptRaf); el._dsbptRaf = 0; }   // 진행 중 롤업 있으면 중단
        el.textContent = to.toLocaleString();
      } else {
        _countUp(el, from, to);
      }
      el.setAttribute('data-dsbpt-init', '1');
    }
  }
  function refreshBadges() { DasibomPoints.balance(function (b) { if (b != null) fillBadges(b); }); }

  function legacyCopy(text, cb) {
    try {
      var ta = document.createElement('textarea'); ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta); cb && cb();
    } catch (e) {}
  }

  var _cssDone = false;
  function injectCSS() {
    if (_cssDone) return; _cssDone = true;
    var s = document.createElement('style');
    s.textContent =
      ".dsbpt-card{background:linear-gradient(150deg,#FBF6EA,#F3ECD8);border:1px solid #E7DCBE;border-radius:22px;" +
      "padding:22px 22px 20px;text-align:center;box-shadow:0 14px 34px -22px rgba(120,90,20,.5);" +
      "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:460px;margin:0 auto}" +
      ".dsbpt-bal{display:flex;align-items:center;justify-content:center;gap:8px}" +
      ".dsbpt-ic{font-size:30px}" +
      ".dsbpt-num{font-family:'Nanum Myeongjo','Batang',serif;font-size:40px;font-weight:800;color:#33492A;line-height:1}" +
      ".dsbpt-unit{font-size:18px;font-weight:800;color:#5C6152;align-self:flex-end;margin-bottom:5px}" +
      ".dsbpt-desc{margin:12px 0 16px;font-size:14.5px;line-height:1.65;color:#6B7261;word-break:keep-all}" +
      ".dsbpt-desc b{color:#A88434}" +
      ".dsbpt-btn{display:block;width:100%;border:none;border-radius:50px;padding:15px;cursor:pointer;" +
      "font-family:inherit;font-weight:800;font-size:16px;color:#241B06;background:linear-gradient(145deg,#D6B35F,#B8912F);" +
      "box-shadow:0 12px 26px -12px rgba(160,120,30,.7)}" +
      ".dsbpt-btn:active{transform:scale(.99)}";
    document.head.appendChild(s);
  }

  // ── 공유 유입 자동 처리: ?ref= 있으면 저장했다가 로그인 후 1회 claim ──
  function handleReferral() {
    var t = null;
    try {
      t = new URLSearchParams(location.search).get('ref');
      if (t) localStorage.setItem('dsb_ref', t);
      else t = localStorage.getItem('dsb_ref');
      if (!t || !/^[a-f0-9]{18}$/.test(t)) return;
      if (localStorage.getItem('dsb_ref_claimed')) return;   // 이 기기는 이미 처리
    } catch (e) { return; }
    whenReady(function () {
      var f = fn('claimReferral'); if (!f) return;
      f({ token: t }).then(function () {
        try { localStorage.setItem('dsb_ref_claimed', '1'); } catch (e) {}  // 성공/실패 무관 1회로 종결
      }).catch(function () {});
    });
  }

  window.DasibomPoints = DasibomPoints;
  DasibomPoints._fill = fillBadges;   // QA용: 잔액 배지 갱신/롤업 직접 구동

  // ── 마스터 전용 꽃잎 에디터(2026-07-21 Macho) — 운영자 이메일 로그인 시에만 보이는 테스트 버튼 ──
  //   지급은 전부 서버(adminGrantPoints, points_admin 기록). 일반 사용자에겐 렌더 자체가 안 됨.
  function mountMasterPetalTool() {
    whenReady(function () {
      try {
        var u = firebase.auth().currentUser;
        var email = (u && u.email) || '';
        var isMasterEmail = ['machojang@gmail.com', 'machojang@naver.com'].indexOf(email) >= 0;
        if (!isMasterEmail) {
          // 카카오 등 이메일 없는 커스텀 토큰 — admin_roles 승인 master/owner면 표시 (서버도 같은 기준으로 재검증)
          var check = function () {
            try {
              firebase.firestore().collection('admin_roles').doc(u.uid).get().then(function (r) {
                var d = r.exists ? r.data() : null;
                if (d && d.status === 'approved' && (d.role === 'master' || d.role === 'owner')) mountBtn();
              }).catch(function () {});
            } catch (e) {}
          };
          if (typeof firebase.firestore === 'function') { check(); }
          else {
            var s = document.createElement('script');
            s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
            s.onload = check; document.head.appendChild(s);
          }
          return;
        }
        mountBtn();
      } catch (e) {}
      function mountBtn() {
        if (document.getElementById('dsbMasterPetal')) return;
        var b = document.createElement('button');
        b.id = 'dsbMasterPetal';
        b.textContent = '🌸±';
        b.style.cssText = 'position:fixed;left:12px;bottom:16px;z-index:99991;width:46px;height:46px;border-radius:50%;' +
          'border:2px solid #f3c2d3;background:#fff;font-size:16px;font-weight:900;box-shadow:0 6px 16px -6px rgba(0,0,0,.35);cursor:pointer';
        b.onclick = function () {
          var v = window.prompt('꽃잎 지급/차감 (예: 1000, -500)', '1000');
          if (v == null) return;
          var amt = parseInt(v, 10);
          if (!amt) { toast('숫자를 입력해 주세요'); return; }
          var f = fn('adminGrantPoints'); if (!f) { toast('연결 대기 중'); return; }
          f({ amount: amt }).then(function (r) {
            var d = r && r.data;
            if (d && d.ok) { toast('🌸 ' + (amt > 0 ? '+' : '') + amt + ' → 잔액 ' + d.balance.toLocaleString()); }
            else toast('지급 실패');
          }).catch(function (e) { toast((e && e.message) || (e && e.code) || '권한 없음 또는 오류'); });
        };
        document.body.appendChild(b);
      }
    });
  }

  function boot() {
    handleReferral();
    // 공유 토큰 선발급 — 모든 콘텐츠의 공유 버튼이 클릭 순간 동기로 ?ref=를 붙일 수 있게
    DasibomPoints.refLink(function () {});
    autoAttend();   // 오늘 첫 활동 → 출석 꽃잎 + 봄이 팝업(어느 콘텐츠에서든)
    mountMasterPetalTool();
    // 결제 서버 예열(2026-07-21): 꽃잎 소비가 있는 페이지는 입장 즉시 spendPoints를 깨워둔다 —
    // 콜드 2.3초 → 실제 구매 시점엔 웜 0.1초. 실측 근거로 도입.
    if (/^\/(plant|guppy)/.test(location.pathname)) {
      whenReady(function () {
        var f = fn('spendPoints');
        if (f) f({ item: '__warm' }).catch(function () {});
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
