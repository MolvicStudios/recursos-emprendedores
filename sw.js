/* ==============================================
   Recursos para Emprendedores — Service Worker
   Cache-first para assets estáticos, network-first
   para el JSON de datos (siempre fresco).
   ============================================== */

var CACHE_NAME = 'rec-emp-v1';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/cookies-banner.js',
  '/img/favicon.svg',
  '/terminos.html',
  '/privacidad.html',
  '/cookies.html'
];

// ---- Instalación: pre-cachear assets estáticos ----
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activar inmediatamente sin esperar a que cierren pestañas anteriores
  self.skipWaiting();
});

// ---- Activación: limpiar cachés antiguas ----
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  // Tomar control de todas las pestañas abiertas
  self.clients.claim();
});

// ---- Estrategia de fetch ----
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Solo interceptar peticiones del mismo origen
  if (url.origin !== self.location.origin) return;

  // JSON de datos: network-first (contenido fresco, fallback a caché)
  if (url.pathname.endsWith('emprendedores.json')) {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Assets estáticos: cache-first (rápido, fallback a red)
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        // Cachear nuevas peticiones GET exitosas
        if (response.ok && event.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
