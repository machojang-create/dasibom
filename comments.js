// 다시봄 공용 '한 줄 공감' 모듈 ───────────────────────────────────────────────
// 사용법: 페이지에 <div class="dbc" data-scope="고유키" data-title="제목"></div> 넣고
//         이 스크립트(+firebase compat app/auth/firestore)를 로드하면 자동 작동.
// 동적(예: 서재 글마다): window.DasibomComments.mount(el, scope, title)
// 저장소: Firestore 'comments' 컬렉션 {scope,text,uid,ts}. 규칙은 firestore.rules 참고.
(function(){
  if (window.DasibomComments) return;
  var MAX = 30; // 바이트
  var BAD = ['시발','씨발','병신','개새','좆','니미','fuck','sex','섹스'];

  function bytes(s){ try{ return new Blob([s]).size; }catch(e){ return (s||'').length; } }
  function esc(s){ return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function clean(t){ var s=t.replace(/\s/g,'').toLowerCase(); return !BAD.some(function(w){return s.indexOf(w)>=0;}); }
  function timeAgo(ms){ if(!ms) return ''; var s=Math.floor((Date.now()-ms)/1000); if(s<60)return '방금'; if(s<3600)return Math.floor(s/60)+'분 전'; if(s<86400)return Math.floor(s/3600)+'시간 전'; return Math.floor(s/86400)+'일 전'; }

  function injectCSS(){
    if (document.getElementById('dbc-style')) return;
    var st = document.createElement('style'); st.id = 'dbc-style';
    st.textContent = ''+
      '.dbc-comments{margin-top:18px;background:#fff;border-radius:22px;padding:22px 24px;box-shadow:0 10px 34px -20px rgba(0,0,0,.2)}'+
      '.dbc-head{font-size:16px;font-weight:800;color:#143D2E;margin-bottom:14px;display:flex;align-items:center;gap:9px}'+
      '.dbc-cnt{font-size:12.5px;font-weight:700;color:#0C7C62;background:rgba(12,124,98,.1);padding:2px 11px;border-radius:50px}'+
      '.dbc-form{display:flex;gap:8px}'+
      '.dbc-input{flex:1;min-width:0;padding:14px 16px;border:1.5px solid #DCE6DF;border-radius:14px;font-size:16px;font-family:inherit;outline:none;background:#FAFDFB;color:#1F2A1A}'+
      '.dbc-input:focus{border-color:#0e9d7d}'+
      '.dbc-send{padding:0 20px;border:none;border-radius:14px;background:linear-gradient(145deg,#13d3a6,#0e9d7d);color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap}'+
      '.dbc-send:disabled{opacity:.45;cursor:default}'+
      '.dbc-meta{display:flex;justify-content:space-between;align-items:center;margin:9px 4px 0;font-size:12px;color:#8AA294}'+
      '.dbc-byte.over{color:#e2574c;font-weight:700}'+
      '.dbc-list{margin-top:16px;display:flex;flex-direction:column;gap:9px}'+
      '.dbc-item{background:#F3F8F4;border-radius:14px;padding:11px 15px;font-size:15px;color:#2C3A30;line-height:1.6;display:flex;justify-content:space-between;align-items:center;gap:10px}'+
      '.dbc-item .dbc-txt{word-break:break-all}'+
      '.dbc-item .dbc-time{font-size:11px;color:#9DB0A2;flex-shrink:0;white-space:nowrap}'+
      '.dbc-empty{color:#9DB0A2;font-size:14px;text-align:center;padding:18px}'+
      'body.dark .dbc-comments{background:#262E26}'+
      'body.dark .dbc-head{color:#EFE6D0}'+
      'body.dark .dbc-input{background:#1d241d;border-color:#3a463c;color:#e9e2d2}'+
      'body.dark .dbc-item{background:#1f271f;color:#dfe6da}';
    (document.head||document.documentElement).appendChild(st);
  }

  function build(box){
    if (!box || box._dbc) return;
    var scope = box.getAttribute('data-scope'); if(!scope) return;
    box._dbc = 1; injectCSS();
    var title = box.getAttribute('data-title') || '한 줄 공감';
    box.classList.add('dbc-comments');
    box.innerHTML =
      '<div class="dbc-head"><span>💬 '+esc(title)+'</span><span class="dbc-cnt"></span></div>'+
      '<div class="dbc-form"><input type="text" class="dbc-input" placeholder="짧은 한마디로 마음을 나눠보세요" maxlength="30" autocomplete="off"><button class="dbc-send" disabled>남기기</button></div>'+
      '<div class="dbc-meta"><span class="dbc-byte">0/'+MAX+'</span><span class="dbc-hint">서로 따뜻한 말로 공감해요 🌸</span></div>'+
      '<div class="dbc-list"><div class="dbc-empty">불러오는 중…</div></div>';
    var input=box.querySelector('.dbc-input'), sendBtn=box.querySelector('.dbc-send'),
        byteEl=box.querySelector('.dbc-byte'), listEl=box.querySelector('.dbc-list'), cntEl=box.querySelector('.dbc-cnt');

    function refreshByte(){ var b=bytes(input.value); byteEl.textContent=b+'/'+MAX; var over=b>MAX; byteEl.className='dbc-byte'+(over?' over':''); sendBtn.disabled=over||input.value.trim().length===0; }
    input.addEventListener('input', refreshByte);

    function render(arr){
      if(!arr.length){ listEl.innerHTML='<div class="dbc-empty">아직 공감이 없어요. 첫 한마디를 남겨보세요 🌸</div>'; cntEl.textContent=''; return; }
      cntEl.textContent=arr.length+'개';
      listEl.innerHTML=arr.map(function(c){ return '<div class="dbc-item"><span class="dbc-txt">'+esc(c.text)+'</span><span class="dbc-time">'+timeAgo(c.ts)+'</span></div>'; }).join('');
    }
    function load(){
      try{
        firebase.firestore().collection('comments').where('scope','==',scope).limit(80).get()
          .then(function(snap){ var now=Date.now(); var arr=[]; snap.forEach(function(d){ var x=d.data(); var ms=(x.ts&&x.ts.toMillis)?x.ts.toMillis():0; if(ms<=now) arr.push({text:x.text, ts:ms}); }); arr.sort(function(a,b){return b.ts-a.ts;}); render(arr); })
          .catch(function(e){ listEl.innerHTML='<div class="dbc-empty">공감을 불러오지 못했어요. (규칙 배포 후 작동)</div>'; });
      }catch(e){}
    }
    function submit(){
      var t=input.value.trim(); if(!t||bytes(t)>MAX) return;
      if(!clean(t)){ alert('서로 따뜻한 말로 남겨주세요 🌸'); return; }
      sendBtn.disabled=true;
      function write(uid){ firebase.firestore().collection('comments').add({scope:scope,text:t,uid:uid,ts:firebase.firestore.FieldValue.serverTimestamp()})
        .then(function(){ input.value=''; refreshByte(); load(); })
        .catch(function(e){ alert('남기기 실패: '+(e.code||e.message)); sendBtn.disabled=false; }); }
      var un=firebase.auth().onAuthStateChanged(function(u){ un();   // 복원 대기 — 소셜 세션 보호
        if(u){ write(u.uid); } else { firebase.auth().signInAnonymously().then(function(r){ write(r.user.uid); }).catch(function(){ sendBtn.disabled=false; alert('잠시 후 다시 시도해 주세요'); }); }
      });
    }
    sendBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){ if(e.key==='Enter'&&!sendBtn.disabled) submit(); });

    function init(){ if(window.firebase&&firebase.firestore){ load(); } else { setTimeout(init,400); } }
    init();
  }

  function scan(root){ (root||document).querySelectorAll('.dbc[data-scope]').forEach(build); }
  window.DasibomComments = { mount:function(el,scope,title){ if(!el)return; el.setAttribute('data-scope',scope); if(title)el.setAttribute('data-title',title); build(el); }, scan:scan };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ scan(); }); else scan();
})();
