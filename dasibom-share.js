/* ════════ 다시봄 공유 + 유입 측정 공용 모듈 (2026-07-16) ════════
   ① 유입 측정: utm/referrer 최초 유입(first-touch)을 기록하고, 광고 테스트의
      '측정기' 역할. logTraffic 함수로 visit/전환 이벤트를 서버에 집계.
   ② 공유: DasibomShare.share({title,text,url}) — navigator.share(모바일 카톡 등),
      없으면 클립보드 복사. 공유 클릭도 전환 이벤트로 집계.

   페이지에 <script src="/dasibom-share.js?v=1"></script> 한 줄.
   - 로드 시 자동으로 first-touch 저장 + track('visit') 1회(세션당).
   - 버튼: <button data-share>친구에게 알려주기</button>  또는
           DasibomShare.share({title, text, url}) 직접 호출.
   - 전환 표시: DasibomShare.track('memoir_start') 등.
   ※ firebase functions가 있을 때만 서버 집계(대부분 페이지는 bom_voice.js가 부팅).
     없으면 조용히 로컬 저장만 — 측정이 콘텐츠를 방해하지 않음.
   ════════════════════════════════════════════════════ */
(function () {
  if (window.DasibomShare) return;
  var FT_KEY = 'dasibom_ft';          // first-touch (localStorage, 최초 유입)
  var SESS_KEY = 'dasibom_visited';   // 세션당 visit 1회

  function refSrc() {
    var r = document.referrer || '';
    if (!r) return 'direct';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (/naver/.test(h)) return 'naver';
      if (/google/.test(h)) return 'google';
      if (/daum|kakao/.test(h)) return 'kakao';
      if (/instagram|facebook|fb\./.test(h)) return 'sns';
      if (/dasibomlife/.test(h)) return 'direct';
      return h.slice(0, 30);
    } catch (e) { return 'direct'; }
  }

  function firstTouch() {
    try {
      var saved = localStorage.getItem(FT_KEY);
      if (saved) return JSON.parse(saved);
      var p = new URLSearchParams(location.search);
      var ft = {
        src: (p.get('utm_source') || refSrc()),
        med: (p.get('utm_medium') || ''),
        camp: (p.get('utm_campaign') || ''),
        ref: (document.referrer || '').slice(0, 120),
        land: location.pathname,
        t: Date.now()
      };
      localStorage.setItem(FT_KEY, JSON.stringify(ft));
      return ft;
    } catch (e) { return { src: 'direct', camp: '' }; }
  }

  // firebase functions 준비되면 logTraffic 호출(최대 ~8초 대기). 없으면 스킵.
  function callLog(event) {
    var ft = firstTouch();
    var payload = { event: event, src: ft.src || 'direct', med: ft.med || '', camp: ft.camp || '' };
    var tries = 0;
    (function go() {
      try {
        if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.functions === 'function') {
          firebase.app().functions('asia-northeast3').httpsCallable('logTraffic')(payload).catch(function () {});
          return;
        }
      } catch (e) {}
      if (++tries > 40) return;      // ~8초 후 포기(측정 실패는 조용히)
      setTimeout(go, 200);
    })();
  }

  var DasibomShare = {
    firstTouch: firstTouch,
    // 전환 이벤트 집계
    track: function (event) { callLog(event); },
    // 공유 실행
    share: function (opt) {
      opt = opt || {};
      var url = opt.url || location.href;
      var title = opt.title || document.title || '다시봄';
      var text = opt.text || '';
      // ★모든 콘텐츠 공유가 곧 꽃잎 초대가 되도록: 내 추천 토큰을 링크에 동기로 부착
      //   (친구가 이 링크로 들어오면 points.js가 자동 claim → 나에게 꽃잎 80)
      var withReward = false;
      try {
        var tk = window.DasibomPoints && DasibomPoints.refToken && DasibomPoints.refToken();
        if (tk && url.indexOf('ref=') < 0) {
          url += (url.indexOf('?') < 0 ? '?' : '&') + 'ref=' + tk;
          withReward = true;
        }
      } catch (e) {}
      this.track('share_click');
      var self = this;
      var hint = function () {
        if (!withReward) return;
        var nm = (window.DasibomPoints && DasibomPoints.name) || '꽃잎';
        var ic = (window.DasibomPoints && DasibomPoints.iconSvg) || '';
        toastHtml(ic + ' 친구가 이 링크로 들어오면 <b>' + nm + ' 80장</b>을 드려요!');
      };
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url })
          .then(function () { self.track('share_open'); setTimeout(hint, 400); })
          .catch(function () {});
        return;
      }
      // 폴백: 클립보드 복사
      var done = function () { self.track('share_open'); toast('링크를 복사했어요. 붙여넣기로 보내주세요 🌱'); setTimeout(hint, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () { legacyCopy(url, done); });
      } else { legacyCopy(url, done); }
    }
  };

  /* ══ 공용 공유 폼(2026-07-20 Macho 확정): ↗공유하기 · 💬카카오톡 · (선택)🖼이미지 저장.
     이메일 없음(시니어 미사용). 건강돋보기 제외. 모든 공유 링크에 ?ref= 자동 부착 → 꽃잎 80.
     페이지에서: window.DSB_SHARE={title,text,url?,image?()} 선언만 하면 자동 장착. ══ */
  function withRef(url) {
    try {
      var tk = window.DasibomPoints && DasibomPoints.refToken && DasibomPoints.refToken();
      if (tk && url.indexOf('ref=') < 0) url += (url.indexOf('?') < 0 ? '?' : '&') + 'ref=' + tk;
    } catch (e) {}
    return url;
  }
  function rewardHint() {
    var nm = (window.DasibomPoints && DasibomPoints.name) || '꽃잎';
    var ic = (window.DasibomPoints && DasibomPoints.iconSvg) || '';
    toastHtml(ic + ' 친구가 이 링크로 들어오면 <b>' + nm + ' 80장</b>을 드려요!');
  }
  var KAKAO_JS_KEY = '870c36c36fea1421ed701cefe6fc6562'; // 공개 웹 키(index와 동일)
  function ensureKakao(cb) {
    if (window.Kakao && Kakao.isInitialized && Kakao.isInitialized()) { cb(true); return; }
    if (window.Kakao) { try { Kakao.init(KAKAO_JS_KEY); } catch (e) {} cb(!!(Kakao.isInitialized && Kakao.isInitialized())); return; }
    var s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = function () { try { Kakao.init(KAKAO_JS_KEY); } catch (e) {} cb(!!(window.Kakao && Kakao.isInitialized())); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function mountShareBar(opt) {
    opt = opt || {};
    if (document.getElementById('dsbShareBar')) return;
    var st = document.createElement('style');
    st.textContent =
      '#dsbShareBar{max-width:640px;margin:30px auto 26px;padding:0 18px}' +
      '#dsbShareBar .dsb-sb-title{text-align:center;font-size:14.5px;font-weight:700;color:#8a6a48;margin-bottom:10px;' +
      "font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
      '#dsbShareBar .dsb-sb-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '@media(max-width:380px){#dsbShareBar .dsb-sb-row{grid-template-columns:1fr}}' +
      '#dsbShareBar button{border:none;border-radius:16px;min-height:54px;font-size:16.5px;font-weight:800;cursor:pointer;' +
      "font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;transition:transform .12s}" +
      '#dsbShareBar button:active{transform:scale(.96)}' +
      '#dsbShareBar .dsb-sb-web{background:rgba(35,30,24,.92);color:#fff;box-shadow:0 8px 20px -10px rgba(0,0,0,.45)}' +
      '#dsbShareBar .dsb-sb-kakao{background:#FEE500;color:#191600;box-shadow:0 8px 20px -10px rgba(180,160,0,.5)}';
    document.head.appendChild(st);
    var bar = document.createElement('section');
    bar.id = 'dsbShareBar';
    bar.innerHTML =
      '<div class="dsb-sb-title">마음에 드셨다면 친구에게 선물해 보세요 — 친구가 오면 꽃잎 80장을 드려요</div>' +
      '<div class="dsb-sb-row">' +
      '<button type="button" class="dsb-sb-web">↗ 공유하기</button>' +
      '<button type="button" class="dsb-sb-kakao">💬 카카오톡</button>' +
      '</div>';
    // 본문 흐름 속 맨 아래: footer 있으면 그 앞, 없으면(React 콘텐츠) body 끝
    var ft = document.querySelector('footer');
    if (ft && ft.parentNode) ft.parentNode.insertBefore(bar, ft);
    else document.body.appendChild(bar);
    ensureKakao(function () {});   // 미리 로드(클릭 순간 팝업 차단 방지)
    function urlNow() { return withRef(opt.url || (location.origin + location.pathname)); }
    function textNow() { return (opt.text || document.title || '다시봄') + '\n다시봄에서 같이 봐요!'; }
    bar.querySelector('.dsb-sb-web').addEventListener('click', function () {
      DasibomShare.track('share_click');
      var u = urlNow();
      if (navigator.share) {
        navigator.share({ title: opt.title || document.title, text: opt.text || '', url: u })
          .then(function () { DasibomShare.track('share_open'); setTimeout(rewardHint, 400); }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(function () { DasibomShare.track('share_open'); toast('링크를 복사했어요. 붙여넣기로 보내주세요 🌱'); setTimeout(rewardHint, 1200); });
      } else { legacyCopy(u, function () { toast('링크를 복사했어요'); setTimeout(rewardHint, 1200); }); }
    });
    bar.querySelector('.dsb-sb-kakao').addEventListener('click', function () {
      DasibomShare.track('share_click');
      var u2 = urlNow();
      ensureKakao(function (ok) {
        if (ok) {
          try {
            Kakao.Share.sendDefault({ objectType: 'text', text: textNow(), link: { mobileWebUrl: u2, webUrl: u2 } });
            DasibomShare.track('share_open'); setTimeout(rewardHint, 600);
            return;
          } catch (e) {}
        }
        if (navigator.share) navigator.share({ title: opt.title || document.title, url: u2 }).then(function(){ setTimeout(rewardHint,400); }).catch(function(){});
        else { legacyCopy(u2, function () { toast('링크를 복사했어요. 카카오톡에 붙여넣어 주세요'); setTimeout(rewardHint,1200); }); }
      });
    });
  }

  function legacyCopy(text, cb) {
    try {
      var ta = document.createElement('textarea'); ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta); cb && cb();
    } catch (e) {}
  }

  var _t;
  // 신뢰된 내부 마크업 전용(꽃잎 SVG 등) — 외부 문자열 넣지 말 것
  function toastHtml(html) {
    try {
      var d = document.createElement('div');
      d.innerHTML = html;
      d.style.cssText = 'position:fixed;left:50%;bottom:142px;transform:translateX(-50%);background:#5b3a1a;color:#FFF6E9;' +
        'padding:14px 22px;border-radius:50px;font-size:15px;font-weight:800;z-index:99999;box-shadow:0 10px 26px -12px rgba(0,0,0,.5);' +
        "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:88vw;text-align:center";
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 3600);
    } catch (e) {}
  }
  function toast(msg) {
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:#22301E;color:#F5F1E8;' +
        'padding:14px 22px;border-radius:50px;font-size:15px;font-weight:700;z-index:99999;box-shadow:0 10px 26px -12px rgba(0,0,0,.5);' +
        "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:88vw;text-align:center";
      document.body.appendChild(d);
      clearTimeout(_t); _t = setTimeout(function () { d.remove(); }, 3000);
    } catch (e) {}
  }

  window.DasibomShare = DasibomShare;

  function boot() {
    firstTouch();
    // 공용 공유 폼 자동 장착 — 페이지가 window.DSB_SHARE 선언한 경우만(건강돋보기는 선언 안 함)
    if (window.DSB_SHARE) { try { mountShareBar(window.DSB_SHARE); } catch (e) {} }
    // 세션당 방문 1회 집계
    try {
      if (!sessionStorage.getItem(SESS_KEY)) { sessionStorage.setItem(SESS_KEY, '1'); callLog('visit'); }
    } catch (e) {}
    // data-share 버튼 자동 연결
    var btns = document.querySelectorAll('[data-share]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          DasibomShare.share({
            title: b.getAttribute('data-share-title') || undefined,
            text: b.getAttribute('data-share-text') || undefined,
            url: b.getAttribute('data-share-url') || undefined
          });
        });
      })(btns[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
