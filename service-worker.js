const CACHE_NAME = 'teacherschedule-v4';
const ASSETS = [
  'index.html',
  'style.css',
  'manifest.json',
  'icon.png',
  'src/main.js',
  'src/core/state.js',
  'src/utils/helpers.js',
  'src/services/authService.js',
  'src/services/storageService.js',
  'src/services/neisService.js',
  'src/services/firebaseService.js',
  'src/services/importExportService.js',
  'src/views/calendarView.js',
  'src/views/mealView.js',
  'src/views/contactView.js',
  'src/views/noticeView.js',
  'src/views/settingsView.js',
  'src/views/modalView.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 서비스 워커 설치 및 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 필수 자산 캐시 저장 중...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 서비스 워커 활성화 및 구버전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] 구버전 캐시 삭제:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 가로채기 (Stale-While-Revalidate 전략)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 나이스 Open API 및 Firebase 통신, 로컬 개발용 API 등 실시간 데이터 요청은 캐싱 방지
  if (url.includes('open.neis.go.kr') || 
      url.includes('firestore.googleapis.com') || 
      url.includes('firebase') || 
      url.startsWith('chrome-extension://') ||
      event.request.method !== 'GET') {
    return;
  }

  // 네트워크 우선(Network-First) 전략:
  //   온라인이면 항상 서버의 최신 파일을 받아 화면에 쓰고 캐시도 갱신한다.
  //   (재배포 직후 첫 새로고침에 예전 화면이 보이던 문제 해결)
  //   오프라인일 때만 캐시에 저장된 파일로 폴백한다.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('index.html');
          return undefined;
        })
      )
  );
});

// 새로운 서비스 워커의 즉각적인 활성화를 위한 강제 수신 통로
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[Service Worker] skipWaiting 신호 수신. 즉시 활성화 단계를 진행합니다.');
    self.skipWaiting();
  }
});
