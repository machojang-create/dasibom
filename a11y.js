/* ════════════════════════════════════════════════════════════════
   다시봄 공용 접근성 바 (a11y.js)
   — 모든 콘텐츠에서 같은 위치(우측 하단)·같은 기능·같은 설정 공유 —
   · 글씨 크기 3단계: body.ts-1/2/3  (저장: dasibom_ts)
   · 다크 모드 토글:                  (저장: dasibom_dark)
   페이지 분기:
   · <body data-ts-native>   → 페이지 자체 CSS(var(--ts))가 글씨를 키움 (index, memoir)
     없으면               → body zoom(1.15/1.3)으로 전체 확대
   · <body data-dark-native> → body.dark (페이지 자체 다크 CSS, index)
     없으면               → html.dsb-dark 스마트 반전(이미지·영상·캔버스는 원색 유지)
   구버전 컨트롤(.a11y-bar/.ts-bar/.font-ctrl/.hc-btn)은 일괄 숨기고
   구버전 저장키는 1회 마이그레이션 후 제거.
   ════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__dsbA11y) return; window.__dsbA11y = true;
  var TS_KEY = 'dasibom_ts', DARK_KEY = 'dasibom_dark';

  /* ── 공용 읽어주기(TTS) 제거됨 (2026-07-08 Macho 지시) ──
     브라우저 로봇 음성이 봄이(어린 소녀) 컨셉과 안 맞아 전면 삭제.
     낭독/읽어주기는 향후 봄이 튜토리얼 모드로 재도입 예정.
     혹시 남은 호출부가 있어도 크래시 안 나도록 no-op 스텁만 유지. */
  window.dsbSpeak = function () {};

  /* ── 구버전 설정 마이그레이션 (1회) ── */
  try {
    if (!localStorage.getItem(TS_KEY)) {
      var old = localStorage.getItem('dasibom-ts') || localStorage.getItem('memoir_ts');
      if (!old) {
        var px = parseInt(localStorage.getItem('dasibom_font_size') || '0', 10);
        var st = parseInt(localStorage.getItem('libFs') || localStorage.getItem('nsFs') || '0', 10);
        if (px >= 20 || st >= 4) old = '3'; else if (px >= 18 || st >= 2) old = '2';
      }
      if (old === '2' || old === '3') localStorage.setItem(TS_KEY, old);
    }
    if (!localStorage.getItem(DARK_KEY) && localStorage.getItem('dasibom-dark') === 'true') {
      localStorage.setItem(DARK_KEY, '1');
    }
    ['dasibom-ts', 'memoir_ts', 'dasibom-dark', 'dasibom_font_size', 'libFs', 'nsFs', 'memoir_hc', 'dasibom_high_contrast']
      .forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) {}

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var tsNative = document.body.hasAttribute('data-ts-native');
    var darkNative = document.body.hasAttribute('data-dark-native');

    /* ── 스타일 주입 ── */
    var css = [
      /* 구버전 컨트롤 일괄 숨김 (통일) */
      '.a11y-bar,.ts-bar,.font-ctrl,.hc-btn{display:none!important}',
      /* 글씨 바가 하단 콘텐츠·버튼을 가리지 않도록 본문 하단 여백 확보 (고정 footer는 페이지별 보정) */
      'body{padding-bottom:84px}',
      /* 공용 바 */
      '.dsb-a11y{position:fixed;bottom:16px;right:12px;z-index:99990;display:flex;align-items:center;gap:2px;',
      ' background:rgba(255,255,255,.96);border:1px solid #ddd6c8;border-radius:50px;padding:5px 9px;',
      ' box-shadow:0 3px 14px rgba(0,0,0,.16);font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif}',
      '.dsb-a11y-lbl{font-size:11px;color:#8a7f72;padding:0 3px 0 2px;user-select:none}',
      '.dsb-a11y button{border:none;background:transparent;color:#8a7f72;cursor:pointer;width:44px;height:44px;',
      ' border-radius:50%;font-weight:800;line-height:1;padding:0;font-family:inherit}',
      '.dsb-a11y .t1{font-size:13px}.dsb-a11y .t2{font-size:17px}.dsb-a11y .t3{font-size:21px}.dsb-a11y .dk{font-size:16px}',
      '.dsb-a11y button.on{background:#0e9d7d;color:#fff}',
      /* 네이티브 다크(index)에서 바 톤 맞춤 */
      'body.dark .dsb-a11y{background:rgba(30,34,30,.95);border-color:#3a403a}',
      'body.dark .dsb-a11y button{color:#cfc8b8}',
      'body.dark .dsb-a11y button.on{background:#0e9d7d;color:#fff}'
    ];
    // 페이지 전체 확대(줌) — 모든 글자·요소가 실제로 커짐.
    // --ts는 !important로 1 고정: 페이지에 남은 구버전 부분확대 CSS(calc(...*var(--ts)))와의 이중 확대 차단.
    if (!tsNative) css.push('body.ts-2{zoom:1.15;--ts:1 !important}body.ts-3{zoom:1.3;--ts:1 !important}');
    if (!darkNative) {
      css.push('html.dsb-dark{filter:invert(1) hue-rotate(180deg);background:#111}');
      css.push('html.dsb-dark img,html.dsb-dark video,html.dsb-dark canvas,html.dsb-dark iframe{filter:invert(1) hue-rotate(180deg)}');
    }
    var styleEl = document.createElement('style');
    styleEl.id = 'dsb-a11y-css';
    styleEl.textContent = css.join('\n');
    document.head.appendChild(styleEl);

    /* ── 바 생성 ── */
    var bar = document.createElement('div');
    bar.className = 'dsb-a11y';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '글씨 크기·다크 모드');
    bar.innerHTML =
      '<span class="dsb-a11y-lbl">글씨</span>' +
      '<button type="button" class="t1" data-ts="1" aria-label="보통 글씨" title="보통">가</button>' +
      '<button type="button" class="t2" data-ts="2" aria-label="크게" title="크게">가</button>' +
      '<button type="button" class="t3" data-ts="3" aria-label="아주 크게" title="아주 크게">가</button>' +
      '<button type="button" class="dk" aria-label="다크 모드" aria-pressed="false" title="다크 모드">🌙</button>';
    document.body.appendChild(bar);

    /* ── 글씨 크기 ── */
    function setTs(n) {
      n = String(n || '1');
      document.body.classList.remove('ts-1', 'ts-2', 'ts-3');
      document.body.classList.add('ts-' + n);
      try { localStorage.setItem(TS_KEY, n); } catch (e) {}
      bar.querySelectorAll('[data-ts]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-ts') === n);
      });
    }

    /* ── 다크 모드 ── */
    function setDark(on) {
      if (darkNative) document.body.classList.toggle('dark', !!on);
      else document.documentElement.classList.toggle('dsb-dark', !!on);
      try { localStorage.setItem(DARK_KEY, on ? '1' : '0'); } catch (e) {}
      var dk = bar.querySelector('.dk');
      dk.classList.toggle('on', !!on);
      dk.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    bar.querySelectorAll('[data-ts]').forEach(function (b) {
      b.addEventListener('click', function () { setTs(this.getAttribute('data-ts')); });
    });
    bar.querySelector('.dk').addEventListener('click', function () {
      var on = darkNative ? document.body.classList.contains('dark')
                          : document.documentElement.classList.contains('dsb-dark');
      setDark(!on);
    });

    /* ── 저장값 적용 ── */
    var ts = '1', dk = false;
    try { ts = localStorage.getItem(TS_KEY) || '1'; dk = localStorage.getItem(DARK_KEY) === '1'; } catch (e) {}
    setTs(ts); setDark(dk);

    /* ── 돌봄 키오스크 안내 배너 — 센터 공용 태블릿에서 대화 마치고 본 사이트 구경할 때 1회 안내 ──
       carechat.html이 전환 시 sessionStorage에 dasibom_kiosk_browse를 심어두면, 그 태블릿의
       이후 페이지 어디서든(공용 스크립트라) 이 배너가 한 번만 뜬다. */
    try {
      if (sessionStorage.getItem('dasibom_kiosk_browse') && !sessionStorage.getItem('dasibom_kiosk_banner_shown')) {
        sessionStorage.setItem('dasibom_kiosk_banner_shown', '1');
        var kb = document.createElement('div');
        kb.className = 'dsb-kiosk-banner';
        kb.innerHTML =
          '<span class="kb-face">🌱</span>' +
          // ★문구 정직성(2026-07-15): 어르신별 이용 기록(카드명·시간)을 남기기 시작했으므로
          //   "따로 저장은 안 된답니다"는 더 이상 사실이 아님 → 무엇이 남는지 그대로 알림.
          //   (남는 건 '무엇을 얼마나' 뿐. 보신 내용 자체는 저장하지 않음. 동의서와 같은 범위)
          '<span class="kb-txt">여긴 여러 어르신이 함께 쓰시는 태블릿이에요. 오늘 무엇을 하셨는지는 센터 선생님께 참여 기록으로만 남는답니다.' +
          ' 마음에 드는 게 있으시면, 나중에 개인 휴대폰으로 저를 다시 만나러 와주세요 — 그때는 제가 다 기억해둘게요 🌸</span>' +
          '<button type="button" class="kb-close">확인했어요</button>';
        var kbCss = document.createElement('style');
        kbCss.textContent =
          '.dsb-kiosk-banner{position:fixed;left:12px;right:12px;bottom:88px;z-index:99991;display:flex;align-items:center;gap:12px;' +
          'background:#33492A;color:#F5F1E8;border-radius:20px;padding:16px 18px;box-shadow:0 10px 30px rgba(0,0,0,.3);' +
          'max-width:640px;margin:0 auto;font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif}' +
          '.dsb-kiosk-banner .kb-face{font-size:26px;flex-shrink:0}' +
          '.dsb-kiosk-banner .kb-txt{flex:1;font-size:15.5px;line-height:1.6;font-weight:700}' +
          '.dsb-kiosk-banner .kb-close{flex-shrink:0;background:#C9A961;color:#1A2416;border:none;border-radius:12px;' +
          'padding:12px 16px;font-size:14.5px;font-weight:800;cursor:pointer;white-space:nowrap;font-family:inherit}';
        document.head.appendChild(kbCss);
        document.body.appendChild(kb);
        kb.querySelector('.kb-close').addEventListener('click', function () { kb.remove(); });
      }
    } catch (e) {}
  });
})();
