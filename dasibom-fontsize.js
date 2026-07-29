/* ════════ 다시봄 파일럿 공용 글씨크기 조절 ════════
   모든 파일럿 앱(React 등)에 <script src="/dasibom-fontsize.js"></script>로 로드.
   · a11y.js와 같은 localStorage 키 'dasibom_ts'(1/2/3)로 동기화 — 설정이 사이트 전체 공유.
   · body.ts-2/ts-3 에 zoom을 걸어 프레임워크 무관하게 전체 확대(Tailwind rem도 같이 커짐).
   · ★2026-07-28 개편(Macho): 항상 펼쳐진 바 → '접이식 아이콘'. 평소엔 작은 '가' 아이콘 하나라
     게임앱의 빽빽한 버튼과 겹치지 않고, 누르면 보통/크게/아주크게가 펼쳐진다(언제든 줄이기 가능).
   ══════════════════════════════════════════════════ */
(function () {
  if (window.__dsbFs) return; window.__dsbFs = true;
  var KEY = 'dasibom_ts';
  function get() { try { return localStorage.getItem(KEY) || '1'; } catch (e) { return '1'; } }
  function apply(n) { document.body.classList.remove('ts-1', 'ts-2', 'ts-3'); document.body.classList.add('ts-' + n); }
  var LV = { '1': '보통', '2': '크게', '3': '아주 크게' };
  var css =
    'body.ts-2{zoom:1.15}body.ts-3{zoom:1.3}' +
    'body{padding-bottom:76px}' +                                    /* 하단 고정 아이콘이 맨 끝 버튼을 덮지 않게 여백 */
    /* 확대해도 아이콘/팝업은 항상 같은 크기(화면 안 가림) */
    'body.ts-2 .dsb-fs{zoom:0.8696}body.ts-3 .dsb-fs{zoom:0.7692}' +
    ".dsb-fs{position:fixed;right:14px;bottom:16px;z-index:99990;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
    /* 접힌 아이콘(fab) — 작아서 겹칠 자리가 거의 없다 */
    '.dsb-fs-fab{position:relative;width:50px;height:50px;border-radius:50%;background:#fff;border:1px solid #E6DECF;' +
    'box-shadow:0 6px 18px -8px rgba(80,54,24,.5);display:grid;place-items:center;cursor:pointer;color:#6b5a48;' +
    'font-weight:900;font-size:22px;line-height:1;padding:0;font-family:inherit;transition:transform .12s}' +
    '.dsb-fs-fab:active{transform:scale(.93)}' +
    '.dsb-fs-fab .cur{position:absolute;right:-3px;bottom:-3px;background:#7D5A50;color:#fff;font-size:9.5px;font-weight:800;' +
    'padding:1px 5px;border-radius:50px;border:1.5px solid #fff;letter-spacing:-.02em}' +
    /* 펼침 팝업 — 아이콘 위로, 오른쪽 정렬(화면 밖 안 나감) */
    '.dsb-fs-pop{position:absolute;right:0;bottom:60px;background:#fff;border:1px solid #E6DECF;border-radius:18px;' +
    'box-shadow:0 16px 40px -14px rgba(80,54,24,.5);padding:7px;min-width:172px;display:none;flex-direction:column;gap:4px}' +
    '.dsb-fs.open .dsb-fs-pop{display:flex;animation:dsbFsIn .22s cubic-bezier(.2,1,.4,1) both}' +
    '@keyframes dsbFsIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}' +
    '.dsb-fs-pop .ph{font-size:12px;font-weight:800;color:#a89a88;padding:4px 10px 2px}' +
    '.dsb-fs-pop button{display:flex;align-items:center;gap:12px;min-height:50px;padding:8px 14px;border:none;background:transparent;' +
    'border-radius:13px;cursor:pointer;color:#5b4a38;font-weight:800;font-family:inherit;text-align:left;width:100%}' +
    '.dsb-fs-pop button:active{background:#F3ECE0}' +
    '.dsb-fs-pop button.on{background:#7D5A50;color:#fff}' +
    '.dsb-fs-pop button .ga{width:30px;text-align:center;font-weight:900}' +
    '.dsb-fs-pop button .g1{font-size:15px}.dsb-fs-pop button .g2{font-size:19px}.dsb-fs-pop button .g3{font-size:24px}' +
    '.dsb-fs-pop button .nm{font-size:16px}' +
    'body.dark .dsb-fs-fab,html.dark .dsb-fs-fab{background:#2a2320;border-color:#3d332a;color:#c8bba4}' +
    'body.dark .dsb-fs-pop,html.dark .dsb-fs-pop{background:#2a2320;border-color:#3d332a}' +
    'body.dark .dsb-fs-pop button,html.dark .dsb-fs-pop button{color:#c8bba4}';
  function init() {
    try {
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      var wrap = document.createElement('div'); wrap.className = 'dsb-fs';
      wrap.innerHTML =
        '<button class="dsb-fs-fab" aria-label="글씨 크기 조절" aria-expanded="false">가<span class="cur"></span></button>' +
        '<div class="dsb-fs-pop" role="menu">' +
        '<div class="ph">글씨 크기</div>' +
        '<button data-ts="1" role="menuitem"><span class="ga g1">가</span><span class="nm">보통</span></button>' +
        '<button data-ts="2" role="menuitem"><span class="ga g2">가</span><span class="nm">크게</span></button>' +
        '<button data-ts="3" role="menuitem"><span class="ga g3">가</span><span class="nm">아주 크게</span></button>' +
        '</div>';
      document.body.appendChild(wrap);
      var fab = wrap.querySelector('.dsb-fs-fab'), curEl = wrap.querySelector('.cur');
      function refresh() {
        var n = get(); apply(n); curEl.textContent = LV[n] || '보통';
        Array.prototype.forEach.call(wrap.querySelectorAll('.dsb-fs-pop button'), function (b) {
          b.classList.toggle('on', b.getAttribute('data-ts') === n);
        });
      }
      function open(o) { wrap.classList.toggle('open', o); fab.setAttribute('aria-expanded', o ? 'true' : 'false'); }
      fab.addEventListener('click', function (e) { e.stopPropagation(); open(!wrap.classList.contains('open')); });
      wrap.querySelector('.dsb-fs-pop').addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b) return;
        try { localStorage.setItem(KEY, b.getAttribute('data-ts')); } catch (e) {}
        refresh(); open(false);
      });
      document.addEventListener('click', function () { open(false); });    // 바깥 탭 → 접기
      refresh();
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
