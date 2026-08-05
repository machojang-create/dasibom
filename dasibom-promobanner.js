/* ══════════════════════════════════════════════════════════════════════
   다시봄 홈 — 봄이의 추천 배너(자체 콘텐츠 광고)  (2026-08-01)
   · 섹션 사이에 "봄이가 골라주는 대표 콘텐츠"를 배너로 자동 삽입
   · 점수 = 인기도 × (아직 안 써본 정도) + 신규 가산점  → 안 가본 인기 콘텐츠를 우선 노출
   · 콘텐츠별 방문은 카드 클릭 시 기록(dasibom_content_visits) — 신규 유저는 전부 미이용 → 인기순
   · 실제 화면 스크린샷(정적, /img/promo/*.jpg) + 봄이 얼굴 + 반투명 추천 문구 + 입장하기
   데이터 배열(PROMO)만 늘리면 카테고리가 늘어도 자동 확장. 런타임 비용 0.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__dsbPromoDone) return;

  // ── 카테고리 대표 콘텐츠(1단계 수동, 이후 실측 인기도로 pop 교체) ──
  // pop: 인기 가중(0~100), isNew/newUntil(ms): 신규 노출 부스트, face: 봄이 표정
  // ★대표작 우선순위(Macho 확정 2026-08-01): 자서전·맞고·트로트가 이용률 최상위. 라디오(봄이 라디오 극장)는
  //   아직 미출시(is-soon)라 '입장' 배너 제외 — 정식 오픈 시 여기 한 줄 추가하면 자동 노출.
  var PROMO = [
    { cat: 'memory', key: 'memoir', color: '#A8875A', href: '/memoir', img: '/img/promo/memoir.jpg', face: 'bom_calm.png',
      title: '나만의 자서전', pop: 92,
      bom: '살아온 이야기를 한 편의 책으로. 봄이가 곁에서 도와드릴게요.' },
    { cat: 'play',   key: 'matgo',  color: '#7C9A6D', href: '/matgo',  img: '/img/promo/matgo.jpg',  face: 'bom_grin.png',
      title: '봄이와 맞고 한 판', pop: 90,
      bom: '심심하실 땐 저랑 화투 한 판 어때요? 오늘 운수도 볼 겸요 🎴' },
    { cat: 'memory', key: 'trot',   color: '#A8875A', href: '/trot',   img: '/img/promo/trot.jpg',   face: 'bom_cheer.png',
      title: '다시봄 트로트 연대기', pop: 86,
      bom: '그 시절 가수들의 이야기, 책장처럼 한 장씩 넘겨보세요 📖' }   /* 노래 트는 곳 아님 — 기대 정확히(2026-08-06 Macho) */,
    { cat: 'mind',   key: 'plant',  color: '#93859F', href: '/plant',  img: '/img/promo/plant.jpg',  face: 'bom_smile.png',
      title: '수다쟁이 화분', pop: 74,
      bom: '구수한 사투리로 말 거는 화분 친구, 물 한 번 주러 오실래요? 🌱' },
    { cat: 'life',   key: 'trendy', color: '#5F8794', href: '/trendy', img: '/img/promo/trendy.jpg', face: 'bom_fab.png',
      title: '말동무 사전', pop: 70,
      bom: '“그때 그 말” 기억나세요? 시대별 유행어를 함께 찾아봐요.' }
  ];

  // ── 콘텐츠별 방문 기록(미이용 판정용) ──
  var VKEY = 'dasibom_content_visits';
  function loadVisits() { try { return JSON.parse(localStorage.getItem(VKEY) || '{}') || {}; } catch (e) { return {}; } }
  function recordVisit(key) {
    if (!key) return;
    try { var v = loadVisits(); v[key] = Date.now(); localStorage.setItem(VKEY, JSON.stringify(v)); } catch (e) {}
  }
  // 홈 카드 클릭 → 그 콘텐츠 방문으로 기록(다음 방문부터 "안 써본 것" 판정에 반영)
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('.card[data-key]');
    if (a) recordVisit(a.getAttribute('data-key'));
  }, true);

  // ── 점수: 인기 × 미이용 + 신규가산 ──
  function unusedFactor(key) {
    var v = loadVisits()[key];
    if (!v) return 1.0;                       // 한 번도 안 써봄 → 최우선 발견 대상
    var days = (Date.now() - v) / 86400000;
    if (days < 3) return 0.15;                // 최근 이용 → 크게 감점(이미 아는 곳)
    if (days < 14) return 0.5;
    return 0.8;                               // 오래전 이용 → 다시 권할 만함
  }
  function score(it) {
    var s = it.pop * unusedFactor(it.key);
    if (it.isNew && it.newUntil && Date.now() < it.newUntil) s += 40;   // 신규 부스트
    return s;
  }
  function reasonChip(it) {
    if (it.isNew && it.newUntil && Date.now() < it.newUntil) return '✨ 새로 나왔어요';
    if (!loadVisits()[it.key] && it.pop >= 80) return '🔥 요즘 인기';
    return '🌸 봄이 추천';
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // hex → "R,G,B" (반투명 그라데이션용)
  function hexRgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  // ── 스타일(1회 주입) ──
  function injectCSS() {
    if (document.getElementById('dsb-promo-css')) return;
    var st = document.createElement('style'); st.id = 'dsb-promo-css';
    st.textContent = [
      '.dpb{--dpb-c:#7C9A6D;--dpb-rgb:124,154,109;display:block;position:relative;text-decoration:none;',
      '  border-radius:20px;overflow:hidden;margin:6px auto 20px;width:100%;min-height:140px;isolation:isolate;',
      '  box-shadow:0 10px 26px rgba(60,50,40,.16),0 2px 6px rgba(60,50,40,.10);background:rgb(var(--dpb-rgb));',
      '  transition:transform .12s ease, box-shadow .12s ease;}',
      '.dpb:active{transform:translateY(2px);box-shadow:0 6px 16px rgba(60,50,40,.18);}',
      // 실제 화면 = contain(전체 화면 축소 노출). 오른쪽 정렬, 남는 여백은 카테고리 색으로 채워짐.
      '.dpb-bg{position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);object-fit:contain;object-position:right center;z-index:0;display:block;}',
      // 카테고리 색 반투명 그라데이션 — 맨 왼쪽 완전 불투명 → 오른쪽 투명, 사진과 자연스럽게 섞임
      '.dpb-scrim{position:absolute;inset:0;z-index:1;',
      '  background:linear-gradient(100deg, rgba(var(--dpb-rgb),1) 0%, rgba(var(--dpb-rgb),1) 34%, rgba(var(--dpb-rgb),.72) 54%, rgba(var(--dpb-rgb),.30) 74%, rgba(var(--dpb-rgb),0) 92%);}',
      '.dpb-in{position:relative;z-index:2;display:flex;align-items:center;gap:12px;padding:14px 16px;min-height:140px;box-sizing:border-box;}',
      '.dpb-face{flex:0 0 auto;width:56px;height:56px;border-radius:50%;overflow:hidden;',
      '  border:2.5px solid rgba(255,255,255,.9);box-shadow:0 3px 8px rgba(0,0,0,.28);background:#fff;}',
      '.dpb-face img{width:100%;height:100%;object-fit:cover;display:block;}',
      '.dpb-txt{min-width:0;max-width:62%;display:flex;flex-direction:column;gap:2px;}',
      '.dpb-chip{align-self:flex-start;font-size:.72rem;font-weight:800;color:#fff;',
      '  background:rgba(255,255,255,.24);border-radius:999px;padding:2px 9px;margin-bottom:2px;letter-spacing:.2px;}',
      '.dpb-title{font-size:1.16rem;font-weight:900;color:#fff;line-height:1.2;text-shadow:0 1px 3px rgba(0,0,0,.32);',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dpb-msg{font-size:.9rem;font-weight:600;color:rgba(255,255,255,.96);line-height:1.35;text-shadow:0 1px 2px rgba(0,0,0,.28);',
      '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all;}',
      '.dpb-btn{align-self:flex-start;margin-top:8px;font-size:.86rem;font-weight:900;',
      '  color:var(--dpb-c);background:#fff;border-radius:11px;padding:6px 14px;box-shadow:0 2px 6px rgba(0,0,0,.2);}',
      '@media (max-width:560px){',
      '  .dpb{min-height:122px;}.dpb-in{min-height:122px;}',
      '  .dpb-face{width:46px;height:46px;}',
      '  .dpb-title{font-size:1.04rem;}.dpb-msg{font-size:.84rem;}.dpb-txt{max-width:66%;}',
      '}',
      '@media (prefers-reduced-motion: reduce){.dpb{transition:none;}}'
    ].join('');
    document.head.appendChild(st);
  }

  function bannerEl(it) {
    var a = document.createElement('a');
    a.className = 'dpb'; a.href = it.href;
    a.style.setProperty('--dpb-c', it.color);
    a.style.setProperty('--dpb-rgb', hexRgb(it.color));
    a.setAttribute('aria-label', it.title + ' 입장하기');
    a.addEventListener('click', function () { recordVisit(it.key); }, { capture: true });
    a.innerHTML =
      '<img class="dpb-bg" src="' + esc(it.img) + '" alt="' + esc(it.title) + ' 화면 미리보기" loading="lazy">' +
      '<div class="dpb-scrim"></div>' +
      '<div class="dpb-in">' +
      '  <div class="dpb-face"><img src="/img/' + esc(it.face) + '" alt="봄이" loading="lazy"></div>' +
      '  <div class="dpb-txt">' +
      '    <span class="dpb-chip">' + esc(reasonChip(it)) + '</span>' +
      '    <span class="dpb-title">' + esc(it.title) + '</span>' +
      '    <span class="dpb-msg">' + esc(it.bom) + '</span>' +
      '    <span class="dpb-btn">입장하기 →</span>' +
      '  </div>' +
      '</div>';
    return a;
  }

  function run() {
    var secs = Array.prototype.slice.call(document.querySelectorAll('.mk-sec'));
    if (secs.length < 2) return;                 // 홈이 아니면 조용히 종료
    window.__dsbPromoDone = true;
    injectCSS();

    // 점수 내림차순 정렬한 대기열
    var queue = PROMO.slice().sort(function (a, b) { return score(b) - score(a); });

    // 섹션 사이(마지막 섹션 제외)에 하나씩 삽입. 바로 앞 섹션과 같은 카테고리는 건너뛰어 중복 느낌 방지.
    var used = {};
    for (var i = 0; i < secs.length - 1; i++) {
      var precedingCat = secs[i].id ? secs[i].id.replace('sec-', '') : '';
      var pick = null;
      for (var q = 0; q < queue.length; q++) {
        var it = queue[q];
        if (used[it.key]) continue;
        if (it.cat === precedingCat) continue;   // 같은 카테고리 바로 뒤엔 안 붙임
        pick = it; break;
      }
      if (!pick) {                                // 남은 게 없으면(다 씀) 종료
        break;
      }
      used[pick.key] = 1;
      secs[i].insertAdjacentElement('afterend', bannerEl(pick));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
