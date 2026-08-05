/* ── 판당 꽃잎 문지기 (2026-08-04 Macho 확정) ───────────────────────────
   하루 무료 횟수까지는 그냥 통과, 넘기면 "꽃잎 쓰시겠어요?"를 묻고 차감한다.
   오락실 3종(각 5판 무료·초과 5잎)과 맞고(10판 무료·초과 10잎)가 같은 화면을 쓴다.

   쓰는 법:
     DasibomGate.play('arcade_blast').then(function(r){ if(r.ok) 게임시작(); });
     DasibomGate.peek('matgo').then(function(r){ r.freeLeft 로 남은 무료판 표시 });

   ★무료 횟수·가격은 전부 서버(consumePlay)가 정한다. 여기 숫자는 화면 표시용 폴백일 뿐.
   ★서버를 못 부르면 '막지 않고 통과'시킨다 — 네트워크 때문에 놀지 못하는 일은 없어야 한다. */
(function () {
  if (window.DasibomGate) return;

  var LABEL = {
    arcade_blast: '블라스트', arcade_match3: '3매치',
    arcade_bubble: '버블슈터', matgo: '봄이 맞고'
  };

  function fn(name) {
    try {
      if (window.firebase && typeof firebase.functions === 'function' && firebase.apps && firebase.apps.length) {
        return firebase.app().functions('asia-northeast3').httpsCallable(name);
      }
    } catch (e) {}
    return null;
  }
  // firebase가 아직 안 올라왔을 수 있으니 잠깐 기다려준다(bom_voice.js가 띄워줌)
  function callSoon(name, payload, ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function go() {
        var f = fn(name);
        if (f) {
          f(payload).then(function (r) { resolve((r && r.data) || null); })
                    .catch(function () { resolve(null); });
          return;
        }
        if (Date.now() - t0 > (ms || 4000)) { resolve(null); return; }
        setTimeout(go, 200);
      })();
    });
  }

  // ── 물어보는 화면 ──
  function ask(game, cost, balance) {
    return new Promise(function (resolve) {
      var name = LABEL[game] || '이 놀이';
      var wrap = document.createElement('div');
      wrap.setAttribute('role', 'dialog');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:100020;background:rgba(40,30,20,.55);' +
        'display:flex;align-items:center;justify-content:center;padding:20px';
      var enough = balance >= cost;
      wrap.innerHTML =
        '<div style="background:#fffdf8;border-radius:22px;max-width:380px;width:100%;padding:26px 22px;' +
        'box-shadow:0 14px 44px rgba(0,0,0,.28);text-align:center;font-family:inherit">' +
          '<img src="/img/bom_' + (enough ? 'smile' : 'sulk_worry') + '.png" alt="봄이" ' +
            'style="width:96px;height:96px;object-fit:contain;margin-bottom:6px">' +
          '<div style="font-size:21px;font-weight:800;color:#4a3a28;line-height:1.5;margin-bottom:10px">' +
            (enough
              ? '오늘 ' + name + '<br>무료 판을 다 쓰셨어요'
              : '꽃잎이 조금 모자라요') +
          '</div>' +
          '<div style="font-size:17px;color:#7a6a55;line-height:1.65;margin-bottom:18px">' +
            (enough
              ? '꽃잎 <b style="color:#E8804B">' + cost + '개</b>로 한 판 더 하시겠어요?<br>' +
                '<span style="font-size:15px;color:#9a8a75">지금 가진 꽃잎 ' + balance + '개</span>'
              : '한 판에 꽃잎 ' + cost + '개가 필요한데<br>지금 ' + balance + '개를 가지고 계세요.<br>' +
                '<span style="font-size:15px;color:#9a8a75">내일이면 무료 판이 다시 채워져요</span>') +
          '</div>' +
          '<div style="display:flex;gap:10px">' +
            '<button data-go="0" style="flex:1;min-height:52px;border:2px solid #E0D5C4;background:#fff;' +
              'color:#7a6a55;border-radius:14px;font-size:18px;font-weight:700;cursor:pointer">' +
              (enough ? '다음에' : '알겠어요') + '</button>' +
            (enough
              ? '<button data-go="1" style="flex:1;min-height:52px;border:0;background:#E8804B;color:#fff;' +
                'border-radius:14px;font-size:18px;font-weight:800;cursor:pointer">한 판 더</button>'
              : '') +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap);
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-go]');
        if (!b && e.target !== wrap) return;
        var go = b && b.getAttribute('data-go') === '1';
        wrap.remove();
        resolve(!!go);
      });
    });
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:100020;' +
      'background:rgba(60,45,30,.94);color:#fff;padding:13px 20px;border-radius:16px;font-size:16px;' +
      'font-weight:700;max-width:86vw;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  window.DasibomGate = {
    // 지금 시작하면 공짜인지 물어만 보기(차감 안 함)
    peek: function (game) { return callSoon('consumePlay', { game: game, peek: true }, 3000); },

    // 실제로 한 판 쓰기 — 통과하면 {ok:true}
    play: function (game) {
      return callSoon('consumePlay', { game: game, peek: true }, 4000).then(function (p) {
        if (!p || !p.ok) return { ok: true, offline: true };   // 서버를 못 부르면 막지 않는다
        if (p.free) {
          return callSoon('consumePlay', { game: game }, 4000).then(function (r) {
            if (r && r.ok && r.freeLeft === 1) toast('오늘 무료 한 판이 남았어요');
            return { ok: true, free: true, freeLeft: r && r.freeLeft };
          });
        }
        return ask(game, p.cost, p.balance).then(function (yes) {
          if (!yes) return { ok: false, cancelled: true };
          return callSoon('consumePlay', { game: game }, 4000).then(function (r) {
            if (!r || !r.ok) { toast('꽃잎이 모자라요'); return { ok: false }; }
            toast('꽃잎 ' + r.spent + '개를 썼어요 · 남은 꽃잎 ' + r.balance + '개');
            return { ok: true, free: false };
          });
        });
      });
    }
  };
})();
