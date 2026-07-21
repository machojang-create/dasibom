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
      '@media (prefers-reduced-motion:reduce){.dsbpt-toast{animation:none !important}.dsbpt-petal{display:none}}';
    document.head.appendChild(s);
  }
  function toast(msg) {
    try {
      _ensureToastCss();
      var d = document.createElement('div');
      d.className = 'dsbpt-toast';
      d.innerHTML = withPetal(msg);
      d.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#33492A;color:#F5F1E8;' +
        'padding:13px 22px;border-radius:50px;font-size:15px;font-weight:800;z-index:99999;box-shadow:0 12px 28px -12px rgba(0,0,0,.5);' +
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
          p.style.cssText = 'position:fixed;left:50%;bottom:112px;z-index:99999;font-size:' + (14 + Math.random() * 8) + 'px;' +
            'pointer-events:none;--px:' + Math.round(Math.cos(ang) * dist) + 'px;--py:' + Math.round(Math.sin(ang) * dist - 26) + 'px;' +
            '--pr:' + Math.round(-40 + Math.random() * 80) + 'deg;' +
            'animation:dsbptPetal ' + (0.9 + Math.random() * 0.5) + 's ease-out ' + (i * 0.06) + 's both';
          p.innerHTML = PETAL_SVG;
          document.body.appendChild(p);
          (function (pp) { setTimeout(function () { pp.remove(); }, 1900); })(p);
        }
      }
      clearTimeout(_t); _t = setTimeout(function () { d.style.transition = 'opacity .3s'; d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 300); }, 2600);
    } catch (e) {}
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
    // 콘텐츠 '실제 이용' 적립 — 페이지 열기만으론 안 주고, 일정 시간 머무름 + 조작 1회 후 지급.
    //   React 파일럿 등 내부를 몰라도 붙는 범용 방식(탭만 훑는 어뷰징 차단).
    earnOnEngage: function (event, opt) {
      opt = opt || {};
      var sec = opt.seconds || 8;
      // 오늘 이미 받았으면 아예 리스너 안 검
      try { var day = new Date().toISOString().slice(0, 10); if (localStorage.getItem('dsbpt_' + event + '_' + day)) return; } catch (e) {}
      var timeOk = false, interacted = false, done = false, self = this;
      var evs = ['pointerdown', 'keydown', 'touchstart'];
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

  // 화면의 모든 잔액 배지 갱신
  function fillBadges(n) {
    var els = document.querySelectorAll('[data-dsbpt-badge]');
    for (var i = 0; i < els.length; i++) els[i].textContent = Number(n).toLocaleString();
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
    mountMasterPetalTool();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
