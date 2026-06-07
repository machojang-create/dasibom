/**
 * 다시봄 Service Worker
 * 전략: Network First (최신 콘텐츠 우선) + 오프라인 폴백
 */

// ※ 배포 시마다 버전 숫자를 올려주세요 (구 캐시 자동 삭제됨)
const CACHE_NAME   = 'dasibom-v2';
const OFFLINE_PAGE = '/404.html';

// 설치 시 오프라인 폴백 페이지만 캐시
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([OFFLINE_PAGE, '/manifest.json']);
    })
  );
  self.skipWaiting();
});

// 활성화 시 이전 버전 캐시 삭제
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First
self.addEventListener('fetch', function(e) {
  // POST 요청, 외부 도메인, Firebase 요청은 서비스 워커 우회
  if (
    e.request.method !== 'GET' ||
    !e.request.url.startsWith(self.location.origin) ||
    e.request.url.includes('firebaseio.com') ||
    e.request.url.includes('googleapis.com')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(resp) {
        // health_data.json은 캐시해 두어 오프라인에서도 마지막 데이터 표시
        if (e.request.url.includes('health_data.json')) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, respClone);
          });
        }
        return resp;
      })
      .catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match(OFFLINE_PAGE);
        });
      })
  );
});
