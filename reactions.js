// 다시봄 공용 '감정 표현' 반응 바 ─────────────────────────────────────────────
// 사용법: window.DasibomReactions.mount(el, scope)  — scope는 콘텐츠 고유키
// 저장소: Firestore 'reactions/{scope}' 문서에 감정별 누적 카운트.
// 같은 기기에서는 감정당 1번만(localStorage), 취소는 없음(시니어 혼란 방지).
(function(){
  if (window.DasibomReactions) return;

  var EMOTIONS = [
    { key:'like',    e:'❤️', label:'좋아요' },
    { key:'warm',    e:'🥰', label:'따뜻해요' },
    { key:'touched', e:'😢', label:'뭉클해요' },
    { key:'happy',   e:'😊', label:'흐뭇해요' },
    { key:'funny',   e:'😂', label:'웃겨요' },
    { key:'best',    e:'👍', label:'최고예요' },
    { key:'thanks',  e:'🙏', label:'감사해요' },
    { key:'cheer',   e:'💪', label:'힘나요' }
  ];

  function injectCSS(){
    if (document.getElementById('dbr-style')) return;
    var st = document.createElement('style'); st.id='dbr-style';
    st.textContent = ''+
      '.dbr-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px}'+
      '.dbr-btn{display:inline-flex;align-items:center;gap:5px;min-height:44px;padding:8px 14px;border-radius:50px;'+
      ' border:1.5px solid #DDE3D2;background:#fff;font-size:14px;font-weight:700;color:#4a5a42;cursor:pointer;'+
      ' font-family:inherit;transition:transform .12s,background .15s;white-space:nowrap}'+
      '.dbr-btn:active{transform:scale(1.12)}'+
      '.dbr-btn .dbr-e{font-size:17px;line-height:1}'+
      '.dbr-btn .dbr-n{font-size:12.5px;color:#8a9a80;font-weight:800;min-width:12px}'+
      '.dbr-btn.on{background:#EFEAD9;border-color:#C9A961;color:#6B5320}'+
      '.dbr-btn.on .dbr-n{color:#9A7B3F}'+
      'body.dark .dbr-btn{background:#241f1a;border-color:#3d342a;color:#d8c9b0}'+
      'body.dark .dbr-btn.on{background:#33492A;border-color:#7A9A5E;color:#e9e2d2}';
    (document.head||document.documentElement).appendChild(st);
  }

  function lsKey(scope){ return 'dbr_' + scope; }
  function myReacts(scope){ try{ return JSON.parse(localStorage.getItem(lsKey(scope)))||{}; }catch(e){ return {}; } }
  function saveMy(scope, m){ try{ localStorage.setItem(lsKey(scope), JSON.stringify(m)); }catch(e){} }

  function mount(el, scope){
    if (!el || el._dbr) return;
    el._dbr = 1; injectCSS();
    el.classList.add('dbr-bar');
    var mine = myReacts(scope);
    var counts = {};

    function render(){
      el.innerHTML = EMOTIONS.map(function(em){
        var n = counts[em.key] || 0;
        return '<button type="button" class="dbr-btn'+(mine[em.key]?' on':'')+'" data-k="'+em.key+'" aria-label="'+em.label+'">'+
          '<span class="dbr-e">'+em.e+'</span>'+em.label+(n>0?'<span class="dbr-n">'+n+'</span>':'')+
        '</button>';
      }).join('');
    }
    render();

    function load(){
      try{
        firebase.firestore().collection('reactions').doc(scope).get().then(function(snap){
          if (snap.exists) counts = snap.data() || {};
          render();
        }).catch(function(){});
      }catch(e){}
    }

    el.addEventListener('click', function(ev){
      var btn = ev.target.closest('.dbr-btn'); if(!btn) return;
      var k = btn.dataset.k;
      if (mine[k]) return; // 감정당 한 번만
      mine[k] = 1; saveMy(scope, mine);
      counts[k] = (counts[k]||0) + 1;
      render();
      function write(){
        var upd = {}; upd[k] = firebase.firestore.FieldValue.increment(1);
        firebase.firestore().collection('reactions').doc(scope)
          .set(upd, { merge:true }).catch(function(){});
      }
      try{
        var u = firebase.auth().currentUser;
        if (u) write();
        else firebase.auth().signInAnonymously().then(write).catch(function(){});
      }catch(e){}
    });

    (function init(){ if (window.firebase && firebase.firestore) load(); else setTimeout(init, 400); })();
  }

  window.DasibomReactions = { mount: mount };
})();
