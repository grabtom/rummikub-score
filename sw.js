// Minimal app-shell service worker: cache-first for everything in the shell.
// Bump CACHE on every deploy so clients pick up new files.
const CACHE = 'rummikub-score-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/share.js',
  './js/timer.js',
  './js/timer-ui.js',
  './js/util.js',
  './js/views/games-list.js',
  './js/views/new-game.js',
  './js/i18n.js',
  './js/swipe.js',
  './js/settings-ui.js',
  './js/views/scoreboard.js',
  './js/views/import.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
