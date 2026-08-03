/* ══════════════════════════════════════════════════════════════════════
   봄이 생활비서 챗 UI (dasibom-bomlife-ui.js) — Phase 3+4 (2026-07-30)
   · dasibom-bomlife.js(엔진) + DasibomPoints(저장) 위에 얹는 대화 표면.
   · 사용자가 말하면 BomLife.ask로 라우팅 → DB답변/캡처확인/AI폴백.
   · 캡처("기억해둘까요?")는 [네, 기억할게요]/[아니요] 버튼으로 승인받아 저장.
   · AI 폴백은 chatBom(무릎 아파요 등 열린 질문)만.  TTS 없음(텍스트).
   공개: window.BomLifeUI.open() / .close() / .toggle()
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__dsbBomLifeUI) return; window.__dsbBomLifeUI = true;

  function ensureEngine(cb) {
    if (window.BomLife) return cb();
    var s = document.createElement('script'); s.src = '/dasibom-bomlife.js';
    s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }

  var CSS =
    ".blf-fab{position:fixed;left:14px;bottom:16px;z-index:99980;display:flex;align-items:center;gap:8px;" +
    "background:linear-gradient(145deg,#6E8060,#4C6140);color:#fff;border:none;border-radius:50px;padding:11px 16px 11px 12px;" +
    "box-shadow:0 10px 24px -10px rgba(60,80,50,.6);cursor:pointer;font-family:inherit;font-weight:800;font-size:15px}" +
    ".blf-fab img{width:30px;height:30px;border-radius:50%;background:#fff;object-fit:cover}" +
    ".blf-wrap{position:fixed;inset:0;z-index:99995;display:none;align-items:flex-end;justify-content:center;background:rgba(20,30,20,.32)}" +   /* a11y 아이콘(99990)보다 위 — 열면 덮는다 */
    ".blf-wrap.on{display:flex}" +
    ".blf-panel{width:100%;max-width:520px;height:min(86vh,720px);background:#FBF9F3;border-radius:24px 24px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -12px 40px -12px rgba(0,0,0,.4)}" +
    ".blf-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(145deg,#6E8060,#4C6140);color:#fff}" +
    ".blf-head img{width:38px;height:38px;border-radius:50%;background:#fff;object-fit:cover}" +
    ".blf-head .t{flex:1}.blf-head .t b{font-size:17px;font-weight:900}.blf-head .t small{display:block;font-size:12px;opacity:.9}" +
    ".blf-x{background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1}" +
    ".blf-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}" +
    ".blf-row{display:flex;gap:8px;max-width:88%}" +
    ".blf-row.me{align-self:flex-end}.blf-row.bom{align-self:flex-start}" +
    ".blf-av{width:30px;height:30px;border-radius:50%;background:#fff;object-fit:cover;flex:none;align-self:flex-end}" +
    ".blf-bub{padding:12px 15px;border-radius:18px;font-size:16px;line-height:1.6;word-break:keep-all;white-space:pre-wrap}" +
    ".blf-row.bom .blf-bub{background:#fff;border:1px solid #E7E1D3;color:#33402E;border-bottom-left-radius:6px}" +
    ".blf-row.me .blf-bub{background:#5E7A4C;color:#fff;border-bottom-right-radius:6px}" +
    ".blf-confirm{display:flex;gap:8px;margin-top:8px}" +
    ".blf-confirm button{flex:1;border:none;border-radius:12px;padding:11px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit}" +
    ".blf-yes{background:#5E7A4C;color:#fff}.blf-no{background:#EDE7DA;color:#6b5a48}" +
    ".blf-input{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #ECE5D6;background:#fff}" +
    ".blf-input input{flex:1;border:1px solid #DDD6C8;border-radius:14px;padding:13px 14px;font-size:16px;font-family:inherit;outline:none}" +
    ".blf-send{background:linear-gradient(145deg,#8FA877,#5E7A4C);color:#fff;border:none;border-radius:14px;padding:0 18px;font-size:16px;font-weight:800;cursor:pointer}" +
    ".blf-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 12px;background:#fff}" +
    ".blf-chip{background:#F1EEE6;border:1px solid #E2DBCB;color:#5b4a38;border-radius:50px;padding:8px 12px;font-size:13.5px;cursor:pointer;font-family:inherit;font-weight:600}" +
    "body.ts-2 .blf-fab{zoom:.87}body.ts-3 .blf-fab{zoom:.77}";

  var wrap, log, input, booted = false;
  function boot() {
    if (booted) return; booted = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    wrap = document.createElement('div'); wrap.className = 'blf-wrap';
    wrap.innerHTML =
      '<div class="blf-panel" role="dialog" aria-label="봄이 생활비서">' +
        '<div class="blf-head"><img src="/img/bom_smile.png" alt="봄이"><div class="t"><b>봄이 생활비서</b><small>일정·생일·공과금·약, 제가 기억해요</small></div><button class="blf-x" aria-label="닫기">✕</button></div>' +
        '<div class="blf-log"></div>' +
        '<div class="blf-chips"></div>' +
        '<div class="blf-input"><input type="text" placeholder="예: 내일 뭐 해?  ·  아들 생일 5월 20일" aria-label="봄이에게 말하기"><button class="blf-send">보내기</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    log = wrap.querySelector('.blf-log');
    input = wrap.querySelector('.blf-input input');
    wrap.querySelector('.blf-x').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('.blf-send').addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    // 첫 인사 + 예시 칩
    bom('안녕하세요! 저는 봄이예요. 일정·생일·공과금·약을 기억해 드려요. 편하게 말씀해 보세요 🌸');
    var chips = wrap.querySelector('.blf-chips');
    ['내일 뭐 해?', '이번 주에 뭐 중요해?', '아들 생일 언제야?', '이번 달 공과금'].forEach(function (c) {
      var b = document.createElement('button'); b.className = 'blf-chip'; b.textContent = c;
      b.addEventListener('click', function () { input.value = c; submit(); }); chips.appendChild(b);
    });
  }

  function row(kind) { var r = document.createElement('div'); r.className = 'blf-row ' + kind; log.appendChild(r); log.scrollTop = log.scrollHeight; return r; }
  function me(text) { var r = row('me'); r.innerHTML = '<div class="blf-bub"></div>'; r.querySelector('.blf-bub').textContent = text; log.scrollTop = log.scrollHeight; }
  function bom(text) { var r = row('bom'); r.innerHTML = '<img class="blf-av" src="/img/bom_smile.png" alt="봄이"><div class="blf-bub"></div>'; r.querySelector('.blf-bub').textContent = text; log.scrollTop = log.scrollHeight; return r; }
  function thinking() { return bom('…'); }

  // AI 폴백 — chatBom(열린 질문만). 실패해도 조용히 안내.
  function aiCall(query, cb) {
    try {
      var f = firebase.app().functions('asia-northeast3').httpsCallable('chatBom');
      f({ message: query }).then(function (r) { cb((r && r.data && r.data.text) || '지금은 대답을 준비하지 못했어요. 잠시 후 다시 물어봐 주세요.'); })
        .catch(function () { cb('지금은 대답을 준비하지 못했어요. 잠시 후 다시 물어봐 주세요.'); });
    } catch (e) { cb('지금은 대답을 준비하지 못했어요. 잠시 후 다시 물어봐 주세요.'); }
  }

  function submit() {
    var text = (input.value || '').trim(); if (!text) return;
    input.value = ''; me(text);
    var th = thinking();
    window.BomLife.ask(text, function (res) {
      th.remove();
      if (res.kind === 'confirm') {
        var r = bom(res.text);
        var box = document.createElement('div'); box.className = 'blf-confirm';
        box.innerHTML = '<button class="blf-yes">네, 기억할게요</button><button class="blf-no">아니요</button>';
        r.appendChild(box);
        box.querySelector('.blf-yes').addEventListener('click', function () {
          box.remove();
          window.BomLife.saveFact(res.capture, function (err) { bom(err ? '앗, 저장이 잘 안 됐어요. 잠시 후 다시 알려주세요.' : '네, 기억해 뒀어요! 때가 되면 알려드릴게요 🌸'); });
        });
        box.querySelector('.blf-no').addEventListener('click', function () { box.remove(); bom('네, 안 할게요. 필요하면 언제든 말씀해 주세요.'); });
      } else {
        bom(res.text || '음… 제가 잘 못 알아들었어요. 다시 한 번 말씀해 주세요.');
      }
    }, { ai: aiCall });
  }

  var _briefedAt = 0;
  function open() {
    ensureEngine(function () {
      boot(); wrap.classList.add('on');
      // 인앱 리마인드: 열면 오늘~임박 일정을 먼저 브리핑(하루 1회)
      if (window.BomLife && window.BomLife.todayBriefing) {
        var today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
        var last = null; try { last = localStorage.getItem('dsb_blf_briefed'); } catch (e) {}
        if (last !== today) {
          window.BomLife.todayBriefing(function (txt) {
            if (txt) { bom(txt); try { localStorage.setItem('dsb_blf_briefed', today); } catch (e) {} }
          });
        }
      }
      setTimeout(function () { input && input.focus(); }, 100);
    });
  }
  function close() { if (wrap) wrap.classList.remove('on'); }
  function toggle() { if (wrap && wrap.classList.contains('on')) close(); else open(); }

  // 플로팅 런처(자동) — data-no-blf-fab 있으면 숨김
  function addFab() {
    if (document.querySelector('.blf-fab') || document.body.hasAttribute('data-no-blf-fab')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var b = document.createElement('button'); b.className = 'blf-fab';
    b.innerHTML = '<img src="/img/bom_fab.png" alt="">봄이 비서';
    b.addEventListener('click', open); document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFab); else addFab();

  window.BomLifeUI = { open: open, close: close, toggle: toggle };
})();
