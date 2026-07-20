/* ════════ 다시봄 파일럿 공용 글씨크기 조절 ════════
   모든 파일럿 앱(React 등)에 <script src="/dasibom-fontsize.js"></script>로 로드.
   · 다시봄 a11y.js와 같은 localStorage 키 'dasibom_ts'(1/2/3)로 동기화 — 설정이 사이트 전체 공유.
   · body.ts-2/ts-3 에 zoom을 걸어 프레임워크 무관하게 전체 확대(Tailwind rem도 같이 커짐).
   · 우하단에 '가/가/가' 컨트롤. 다크모드는 각 앱 자체 유지(여긴 글씨만).
   ══════════════════════════════════════════════════ */
(function () {
  if (window.__dsbFs) return; window.__dsbFs = true;
  var KEY = 'dasibom_ts';
  function get() { try { return localStorage.getItem(KEY) || '1'; } catch (e) { return '1'; } }
  function apply(n) {
    document.body.classList.remove('ts-1', 'ts-2', 'ts-3');
    document.body.classList.add('ts-' + n);
  }
  var css =
    'body.ts-2{zoom:1.15}body.ts-3{zoom:1.3}' +
    '.dsb-fs{position:fixed;right:12px;bottom:16px;z-index:99990;display:flex;align-items:center;gap:1px;' +
    'background:#fff;border:1px solid #E6DECF;border-radius:50px;padding:5px 7px;box-shadow:0 6px 18px -8px rgba(80,54,24,.45);' +
    "font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
    '.dsb-fs .lbl{font-size:11px;color:#9a8f82;padding:0 4px 0 2px;user-select:none}' +
    '.dsb-fs button{border:none;background:transparent;cursor:pointer;color:#6b5a48;padding:2px 8px;border-radius:50px;line-height:1;font-weight:800;font-family:inherit}' +
    '.dsb-fs button.on{background:#7D5A50;color:#fff}' +
    '.dsb-fs .f1{font-size:13px}.dsb-fs .f2{font-size:17px}.dsb-fs .f3{font-size:21px}' +
    'body.dark .dsb-fs,html.dark .dsb-fs{background:#2a2320;border-color:#3d332a}' +
    'body.dark .dsb-fs button,html.dark .dsb-fs button{color:#c8bba4}';
  function init() {
    try {
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      var bar = document.createElement('div'); bar.className = 'dsb-fs'; bar.setAttribute('aria-label', '글씨 크기');
      bar.innerHTML =
        '<span class="lbl">글씨</span>' +
        '<button class="f1" data-ts="1">가</button>' +
        '<button class="f2" data-ts="2">가</button>' +
        '<button class="f3" data-ts="3">가</button>';
      document.body.appendChild(bar);
      function refresh() {
        var n = get(); apply(n);
        Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
          b.classList.toggle('on', b.getAttribute('data-ts') === n);
        });
      }
      bar.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b) return;
        try { localStorage.setItem(KEY, b.getAttribute('data-ts')); } catch (e) {}
        refresh();
      });
      refresh();
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
