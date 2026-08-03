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
  var TS_KEY = 'dasibom_ts', DARK_KEY = 'dasibom_dark', MO_KEY = 'dasibom_motion';

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
      /* ★움직임 줄이기(2026-08-04 FGT ②): 켜면 무한 반복 애니메이션이 멈추고 전환이 즉시 끝난다.
         진행 표시(스피너)까지 멈추면 멈춘 줄 알까 봐 .dsb-keepmotion은 예외로 둔다. */
      'html.dsb-nomotion *:not(.dsb-keepmotion):not(.dsb-keepmotion *){animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important;scroll-behavior:auto!important}',
      /* 글씨 바가 하단 콘텐츠·버튼을 가리지 않도록 본문 하단 여백 확보 (고정 footer는 페이지별 보정) */
      'body{padding-bottom:84px}',
      /* ★접이식 아이콘 개편(2026-07-28 Macho): 항상 펼쳐진 바 → 작은 '가' 아이콘 + 탭하면 팝업.
         평소 footprint가 작아 하단 콘텐츠·버튼과 안 겹치고, 언제든 눌러 글씨/다크 조절. */
      '.dsb-a11y{position:fixed;bottom:16px;right:12px;z-index:99990;font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif}',
      '.dsb-a11y .a-fab{position:relative;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.98);',
      ' border:1px solid #ddd6c8;box-shadow:0 6px 18px -8px rgba(0,0,0,.35);display:grid;place-items:center;cursor:pointer;',
      ' color:#6b5a48;font-weight:900;font-size:22px;line-height:1;padding:0;font-family:inherit;transition:transform .12s}',
      '.dsb-a11y .a-fab:active{transform:scale(.93)}',
      '.dsb-a11y .a-fab .cur{position:absolute;right:-3px;bottom:-3px;background:#0e9d7d;color:#fff;font-size:9.5px;',
      ' font-weight:800;padding:1px 5px;border-radius:50px;border:1.5px solid #fff;letter-spacing:-.02em}',
      '.dsb-a11y .a-pop{position:absolute;right:0;bottom:60px;background:#fff;border:1px solid #ddd6c8;border-radius:18px;',
      ' box-shadow:0 16px 40px -14px rgba(0,0,0,.4);padding:7px;min-width:190px;display:none;flex-direction:column;gap:3px}',
      '.dsb-a11y.open .a-pop{display:flex;animation:aPopIn .22s cubic-bezier(.2,1,.4,1) both}',
      '@keyframes aPopIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}',
      '.dsb-a11y .a-pop .ph{font-size:12px;font-weight:800;color:#a89a88;padding:4px 10px 2px}',
      '.dsb-a11y .a-pop button{display:flex;align-items:center;gap:12px;min-height:50px;padding:8px 14px;border:none;',
      ' background:transparent;border-radius:13px;cursor:pointer;color:#5b4a38;font-weight:800;font-family:inherit;text-align:left;width:100%}',
      '.dsb-a11y .a-pop button:active{background:#F1EEE6}',
      '.dsb-a11y .a-pop button.on{background:#0e9d7d;color:#fff}',
      '.dsb-a11y .a-pop .ga{width:30px;text-align:center;font-weight:900}',
      '.dsb-a11y .a-pop .t1{font-size:15px}.dsb-a11y .a-pop .t2{font-size:19px}.dsb-a11y .a-pop .t3{font-size:24px}',
      '.dsb-a11y .a-pop .nm{font-size:16px}',
      '.dsb-a11y .a-pop .dv{height:1px;background:#eee5d6;margin:4px 6px}',
      '.dsb-a11y .a-pop .dk .ic{width:30px;text-align:center;font-size:18px}',
      /* 네이티브 다크(index)에서 아이콘·팝업 톤 맞춤 */
      'body.dark .dsb-a11y .a-fab{background:#2a2e2a;border-color:#3a403a;color:#cfc8b8}',
      'body.dark .dsb-a11y .a-pop{background:#2a2e2a;border-color:#3a403a}',
      'body.dark .dsb-a11y .a-pop button{color:#cfc8b8}',
      'body.dark .dsb-a11y .a-pop .dv{background:#3a403a}',
      /* 확대해도 아이콘·팝업은 크기 고정 */
      'body.ts-2 .dsb-a11y{zoom:0.8696}',
      'body.ts-3 .dsb-a11y{zoom:0.7692}'
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

    /* ── 바 생성(접이식 아이콘 + 팝업) ── */
    var LV = { '1': '보통', '2': '크게', '3': '아주 크게' };
    var bar = document.createElement('div');
    bar.className = 'dsb-a11y';
    bar.innerHTML =
      '<button type="button" class="a-fab" aria-label="글씨 크기·다크 모드" aria-expanded="false">가<span class="cur"></span></button>' +
      '<div class="a-pop" role="menu">' +
      '<div class="ph">글씨 크기</div>' +
      '<button type="button" data-ts="1" role="menuitem"><span class="ga t1">가</span><span class="nm">보통</span></button>' +
      '<button type="button" data-ts="2" role="menuitem"><span class="ga t2">가</span><span class="nm">크게</span></button>' +
      '<button type="button" data-ts="3" role="menuitem"><span class="ga t3">가</span><span class="nm">아주 크게</span></button>' +
      '<div class="dv"></div>' +
      '<button type="button" class="dk" role="menuitemcheckbox" aria-pressed="false"><span class="ic">🌙</span><span class="nm">어두운 화면</span></button>' +
      '<button type="button" class="mo" role="menuitemcheckbox" aria-pressed="false"><span class="ic">🍃</span><span class="nm">움직임 줄이기</span></button>' +
      '</div>';
    document.body.appendChild(bar);
    var fab = bar.querySelector('.a-fab'), curEl = bar.querySelector('.cur');

    /* ── 글씨 크기 ── */
    function setTs(n) {
      n = String(n || '1');
      document.body.classList.remove('ts-1', 'ts-2', 'ts-3');
      document.body.classList.add('ts-' + n);
      try { localStorage.setItem(TS_KEY, n); } catch (e) {}
      curEl.textContent = LV[n] || '보통';
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

    /* ── 움직임 줄이기 (2026-08-04 FGT ②) ────────────────────────────
       "화면이 자꾸 바뀌어서 놓친다" · "움직이는 게 많아 어지럽다"(88세) 지적.
       기존 prefers-reduced-motion 규칙은 카드 등장·호버만 덮었고, 홈에서 계속 도는
       무한 애니메이션(히어로 확대·흐르는 배너·둥둥 뜨는 요소)은 그대로였다.
       OS 설정을 아는 어르신은 거의 없으므로 화면에서 직접 끌 수 있게 한다. */
    function setMotion(off) {
      document.documentElement.classList.toggle('dsb-nomotion', !!off);
      try { localStorage.setItem(MO_KEY, off ? '1' : '0'); } catch (e) {}
      var mo = bar.querySelector('.mo');
      mo.classList.toggle('on', !!off);
      mo.setAttribute('aria-pressed', off ? 'true' : 'false');
    }

    /* ── 펼침/접힘 ── */
    function open(o) { bar.classList.toggle('open', o); fab.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    fab.addEventListener('click', function (e) { e.stopPropagation(); open(!bar.classList.contains('open')); });
    bar.querySelector('.a-pop').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      if (b.classList.contains('dk')) {                 // 다크 토글 — 팝업은 열어둔 채(연속 조절 가능)
        var on = darkNative ? document.body.classList.contains('dark')
                            : document.documentElement.classList.contains('dsb-dark');
        setDark(!on);
      } else if (b.classList.contains('mo')) {          // 움직임 줄이기 — 팝업은 열어둔 채
        setMotion(!document.documentElement.classList.contains('dsb-nomotion'));
      } else if (b.hasAttribute('data-ts')) {           // 글씨 크기 — 고르면 접힘
        setTs(b.getAttribute('data-ts'));
        open(false);
      }
      setTimeout(reserveScrollAreas, 60);
    });
    document.addEventListener('click', function () { open(false); });   // 바깥 탭 → 접기

    /* ── 자체 스크롤 영역 하단 여백 예약 (2026-07-28 Macho 지적) ──
       body의 padding-bottom은 '페이지 스크롤'에만 걸린다. 서재 리더·건강 상세 패널·오락실 로비처럼
       스스로 스크롤하는 영역은 마지막 카드나 버튼이 이 바에 가려 아예 누를 수 없었다. */
    function reserveScrollAreas() {
      try {
        var br = bar.getBoundingClientRect();
        var need = Math.ceil(window.innerHeight - br.top) + 12;
        var z = tsNative ? 1 : (document.body.classList.contains('ts-3') ? 1.3
              : document.body.classList.contains('ts-2') ? 1.15 : 1);
        var pad = Math.ceil(need / z);
        var els = document.querySelectorAll('div,section,main,article,ul,ol');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el === bar || bar.contains(el) || el.contains(bar)) continue;
          var cs = getComputedStyle(el);
          if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') continue;
          var r = el.getBoundingClientRect();
          if (r.height < 160 || r.bottom < br.top + 8) continue;     // 바까지 닿지 않으면 둘 필요 없음
          if (el.scrollHeight <= el.clientHeight + 4) continue;       // 진짜 스크롤되는 곳만
          if (el.getAttribute('data-dsb-pad') === String(pad)) continue;
          if (!el.hasAttribute('data-dsb-pad')) el.setAttribute('data-dsb-pad0', cs.paddingBottom);
          var base = parseFloat(el.getAttribute('data-dsb-pad0')) || 0;
          if (base >= pad) continue;
          el.setAttribute('data-dsb-pad', String(pad));
          el.style.paddingBottom = pad + 'px';
        }
      } catch (e) {}
    }

    /* ── 저장값 적용 ── */
    var ts = '1', dk = false, mo = false;
    try {
      ts = localStorage.getItem(TS_KEY) || '1';
      dk = localStorage.getItem(DARK_KEY) === '1';
      /* 저장값이 없으면 OS의 '동작 줄이기' 설정을 따른다(설정해 둔 분은 별도 조작 없이 바로 적용). */
      var moSaved = localStorage.getItem(MO_KEY);
      mo = (moSaved === null)
        ? (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        : (moSaved === '1');
    } catch (e) {}
    setTs(ts); setDark(dk); setMotion(mo);

    reserveScrollAreas();
    setTimeout(reserveScrollAreas, 1500);        // 나중에 그려지는 패널까지
    window.addEventListener('load', reserveScrollAreas);
    window.addEventListener('resize', reserveScrollAreas);
    bar.addEventListener('click', function () { setTimeout(reserveScrollAreas, 60); });

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
