// Service worker: bewaart de app zelf voor als je even geen netwerk hebt.
// De radiostream en Spotify gaan altijd live over het netwerk.
// Bij elke release gaat de versie omhoog, zodat alle bestanden tegelijk worden ververst.
const CACHE = 'kink-switch-1.0.0';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'archivo-black.woff2',
  'css/base.css',
  'css/home.css',
  'css/panels.css',
  'js/artists.js',
  'js/catch.js',
  'js/config.js',
  'js/dom.js',
  'js/icons.js',
  'js/log.js',
  'js/main.js',
  'js/silly.js',
  'js/state.js',
  'js/store.js',
  'js/switcher.js',
  'js/util.js',
  'js/wakelock.js',
  'js/kink/meta.js',
  'js/kink/radio.js',
  'js/spotify/api.js',
  'js/spotify/auth.js',
  'js/spotify/keepawake.js',
  'js/spotify/player.js',
  'js/spotify/reach.js',
  'js/ui/banner.js',
  'js/ui/diagnose.js',
  'js/ui/picker.js',
  'js/ui/settings.js',
  'js/ui/status.js',
  'js/ui/tiles.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Eerst het netwerk (altijd de nieuwste versie), anders uit de cache.
// cache: 'no-cache' vraagt de server of een bestand veranderd is, zodat je nooit een mix van oud en nieuw krijgt.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  // OAuth-terugkeer (?code=...) en gedeelde links nooit cachen
  if (url.search) {
    e.respondWith(fetch(e.request).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
