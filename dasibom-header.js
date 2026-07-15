/* ════════ 다시봄 공용 카드 헤더 ════════
   ★확정 규칙(Macho 2026-07-14): 카드 페이지 헤더는 전부 이 배치.
       왼쪽 = [← 홈으로] 버튼   /   오른쪽 = 그 카드 제목
   - 로고는 홈 화면에만 둔다(카드 안엔 안 넣음). 예전엔 페이지마다 로고가
     왼쪽/오른쪽 제각각이고 홈 버튼도 위치가 달라서 통일함.
   - 어르신용이라 '홈으로'는 글자로 크게(로고만 두면 홈 가는 법을 모름). 터치 44px 이상.

   사용법:
     <header data-dasibom-header data-title="그때 그 시절" data-accent="#c8784a"></header>
     <script src="/dasibom-header.js"></script>
   - <header> 자체의 배경·sticky·여백은 각 페이지 CSS 그대로 유지되고, '안쪽 내용만' 표준으로 교체됨.
     (카드마다 브랜드 색이 달라서 data-accent로 그 카드 색을 넘김)
   - 헤더에 다른 버튼(예: 맞고의 음악/효과음)을 남겨야 하면 그 요소에 data-dbh-keep 를 달면
     [홈으로] 와 [제목] 사이에 그대로 보존됨.
   ══════════════════════════════════════ */
(function () {
  var CSS =
    '[data-dasibom-header]{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
    // 왼쪽: 홈으로 (어르신 터치 고려 — 최소 44px)
    '.dbh-home{display:inline-flex;align-items:center;gap:5px;border:1.5px solid currentColor;' +
    'background:rgba(255,255,255,.75);font-size:15px;font-weight:700;padding:0 15px;min-height:44px;' +
    'border-radius:50px;text-decoration:none;cursor:pointer;font-family:inherit;white-space:nowrap;flex:none}' +
    '.dbh-home:active{opacity:.6}' +
    // 오른쪽: 카드 제목
    '.dbh-title{font-size:18px;font-weight:800;letter-spacing:-.3px;font-family:inherit;' +
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;min-width:0}' +
    // 좁은 화면에선 글자·여백만 줄이고 터치 높이 44px는 절대 유지(어르신 손가락 기준)
    '@media(max-width:400px){.dbh-home{font-size:13.5px;padding:0 12px}.dbh-title{font-size:16px}}';

  function inject(el) {
    if (!el || el._dbhDone) return;
    el._dbhDone = true;

    var title = el.getAttribute('data-title') || '';
    var accent = el.getAttribute('data-accent') || '';

    // 헤더에 남겨둘 요소(맞고의 음악/효과음 버튼 등)
    var keep = [].slice.call(el.querySelectorAll('[data-dbh-keep]'));

    var home = document.createElement('a');
    home.className = 'dbh-home';
    home.href = '/?home=1';
    home.textContent = '← 홈으로';

    var t = document.createElement('span');
    t.className = 'dbh-title';
    t.textContent = title;

    if (accent) { home.style.color = accent; t.style.color = accent; }

    el.innerHTML = '';
    el.appendChild(home);
    keep.forEach(function (k) { el.appendChild(k); });
    el.appendChild(t);
  }

  function scan() {
    if (!document.getElementById('dbh-css')) {
      var s = document.createElement('style');
      s.id = 'dbh-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    document.querySelectorAll('[data-dasibom-header]').forEach(inject);
  }

  window.DasibomHeader = { inject: inject, scan: scan };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();
