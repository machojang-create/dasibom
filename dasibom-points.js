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
  var POINT_ICON = '🌸';
  var _refUrl = null;   // 공유 링크 캐시(클릭 시 동기 공유용)

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
  function toast(msg) {
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#33492A;color:#F5F1E8;' +
        'padding:13px 22px;border-radius:50px;font-size:15px;font-weight:800;z-index:99999;box-shadow:0 12px 28px -12px rgba(0,0,0,.5);' +
        "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:88vw;text-align:center;opacity:0;transition:opacity .3s";
      document.body.appendChild(d);
      requestAnimationFrame(function () { d.style.opacity = '1'; });
      clearTimeout(_t); _t = setTimeout(function () { d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 300); }, 2600);
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
        try {
          var uid = firebase.auth().currentUser.uid;
          firebase.firestore().collection('users').doc(uid).get().then(function (d) {
            cb((d.exists && d.data().dsbPoints) || 0);
          }).catch(function () { cb(null); });
        } catch (e) { cb(null); }
      });
    },
    // 내 공유 링크(?ref=토큰 포함) 발급. 한 번 받으면 캐시(_refUrl)해서 클릭 시 즉시 사용.
    refLink: function (cb) {
      if (_refUrl) { cb(_refUrl); return; }
      whenReady(function () {
        var f = fn('createRefLink'); if (!f) { cb(null); return; }
        f({}).then(function (r) {
          var t = r && r.data && r.data.token;
          _refUrl = t ? (location.origin + '/?ref=' + t) : null;
          cb(_refUrl);
        }).catch(function () { cb(null); });
      });
    },
    name: POINT_NAME, icon: POINT_ICON,

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
        '<div class="dsbpt-bal"><span class="dsbpt-ic">' + POINT_ICON + '</span>' +
        '<span class="dsbpt-num" data-dsbpt-badge>0</span><span class="dsbpt-unit">' + POINT_NAME + '</span></div>' +
        '<p class="dsbpt-desc">친구가 내 링크로 들어오면 <b>' + POINT_ICON + ' 80' + POINT_NAME + '</b>을 드려요.<br>좋은 걸 나누고 ' + POINT_NAME + '도 모아보세요.</p>' +
        '<button class="dsbpt-btn" type="button">친구에게 알리고 ' + POINT_NAME + ' 받기 →</button>' +
        '</div>';
      injectCSS();
      host.querySelector('.dsbpt-btn').addEventListener('click', function () { DasibomPoints.invite(); });
      this.balance(function (b) { if (b != null) fillBadges(b); });
      this.refLink(function () {});   // ★링크 미리 발급(클릭 시 즉시 공유되도록)
    }
  };

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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', handleReferral);
  else handleReferral();
})();
