// Service Worker der Web-App CSA-Monitor: hält die App-Dateien für den Start ohne Netz bereit und holt bei
// Verbindung immer zuerst die neueste Fassung (so kommen Verbesserungen beim nächsten Öffnen von selbst an).
// Anfragen an Dropbox laufen unverändert durch und werden nie zwischengespeichert.
const CACHE = 'csa-monitor-202611081305';
const DATEIEN = ['./', 'index.html', 'xlsx.core.min.js', 'sha512.min.js', 'aes.js', 'excel-kern.js', 'konfig.js',
  'web-start.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n.startsWith('csa-monitor-') && n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;   // Dropbox usw.: nicht anfassen
  e.respondWith(
    fetch(e.request).then(antwort => {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); }
      return antwort;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(a => a || caches.match('index.html')))
  );
});
