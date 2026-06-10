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
      /* 공용 바 */
      '.dsb-a11y{position:fixed;bottom:16px;right:12px;z-index:99990;display:flex;align-items:center;gap:2px;',
      ' background:rgba(255,255,255,.96);border:1px solid #ddd6c8;border-radius:50px;padding:5px 9px;',
      ' box-shadow:0 3px 14px rgba(0,0,0,.16);font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif}',
      '.dsb-a11y-lbl{font-size:11px;color:#8a7f72;padding:0 3px 0 2px;user-select:none}',
      '.dsb-a11y button{border:none;background:transparent;color:#8a7f72;cursor:pointer;width:36px;height:36px;',
      ' border-radius:50%;font-weight:800;line-height:1;padding:0;font-family:inherit}',
      '.dsb-a11y .t1{font-size:13px}.dsb-a11y .t2{font-size:17px}.dsb-a11y .t3{font-size:21px}.dsb-a11y .dk{font-size:16px}',
      '.dsb-a11y button.on{background:#0e9d7d;color:#fff}',
      /* 네이티브 다크(index)에서 바 톤 맞춤 */
      'body.dark .dsb-a11y{background:rgba(30,34,30,.95);border-color:#3a403a}',
      'body.dark .dsb-a11y button{color:#cfc8b8}',
      'body.dark .dsb-a11y button.on{background:#0e9d7d;color:#fff}'
    ];
    if (!tsNative) css.push('body.ts-2{zoom:1.15}body.ts-3{zoom:1.3}');
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
  });
})();
