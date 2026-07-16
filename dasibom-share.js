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
    var payload = { event: event, src: ft.src || 'direct', camp: ft.camp || '' };
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
      this.track('share_click');
      var self = this;
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url })
          .then(function () { self.track('share_open'); })
          .catch(function () {});
        return;
      }
      // 폴백: 클립보드 복사
      var done = function () { self.track('share_open'); toast('링크를 복사했어요. 붙여넣기로 보내주세요 🌱'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () { legacyCopy(url, done); });
      } else { legacyCopy(url, done); }
    }
  };

  function legacyCopy(text, cb) {
    try {
      var ta = document.createElement('textarea'); ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta); cb && cb();
    } catch (e) {}
  }

  var _t;
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
