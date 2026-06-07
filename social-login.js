/**
 * 다시봄 — 소셜 로그인 공통 모듈
 * index.html / memoir_v8.html 공유 사용
 */

var KAKAO_APP_KEY = '870c36c36fea1421ed701cefe6fc6562';

function kakaoLogin(){
  function doKakao(){
    if(!Kakao.isInitialized()) Kakao.init(KAKAO_APP_KEY);
    Kakao.Auth.authorize({
      redirectUri: 'https://dasibomlife.com/auth/kakao/callback.html'
    });
  }
  if(window.Kakao){
    doKakao();
  } else {
    var s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    s.onload = doKakao;
    document.head.appendChild(s);
  }
}

function naverLogin(){
  var state = Math.random().toString(36).slice(2);
  sessionStorage.setItem('naver_state', state);
  location.href = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=bgI3PFJTzufz_2aWDfvF&redirect_uri=' + encodeURIComponent('https://dasibomlife.com/auth/naver/callback.html') + '&state=' + encodeURIComponent(state);
}
