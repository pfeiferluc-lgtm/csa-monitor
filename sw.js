// Service Worker der Web-App „Gefahrstoffzug TE Miehlen“: hält die App-Dateien für den Start ohne Netz bereit und holt bei
// Verbindung immer zuerst die neueste Fassung (so kommen Verbesserungen beim nächsten Öffnen von selbst an).
// Immer beim Server nachfragen (no-cache), sonst liefert der Browser bis zu 10 Minuten lang die alte Fassung aus seinem Zwischenspeicher.
// Anfragen an Dropbox und GESTIS laufen unverändert durch und werden hier nie zwischengespeichert (Stoffe und Einsatz-Dateien
// speichert die App selbst im Gerätespeicher). Die Liste der Dateien setzt web-bauen.js ein.
const CACHE = 'gsz-app-202611180202';
const DATEIEN = ["./","index.html","xlsx.core.min.js","sha512.min.js","aes.js","excel-kern.js","konfig.js","stoffdaten.js","gestis.js","bestaendigkeit.js","speicher.js","symbole.js","aegl.js","sdb-parser.js","ocr.js","auswertung.js","neuigkeiten.js","oberflaeche.js","gefahrgut-daten.js","gefahrgut.js","karte.js","lage.js","einsatz.js","einsatzbericht.js","claude-direkt.js","sdb-import.js","web-start.js","pdf.min.js","pdf.worker.min.js","karte/leaflet.js","karte/leaflet.css","ocr/tesseract.min.js","ocr/worker.min.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN.map(d => new Request(d, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => (n.startsWith('gsz-app-') || n.startsWith('csa-monitor-')) && n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;   // Dropbox, GESTIS usw.: nicht anfassen
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(antwort => {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); }
      return antwort;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(a => a || caches.match('index.html')))
  );
});

// Benachrichtigungen des Mac-Helfers (Web-Push, verschlüsselt): { titel, text, ziel } – Tippen öffnet die App an dieser Stelle
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { text: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titel || 'Gefahrstoffzug TE Miehlen',
    { body: d.text || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.ziel || 'gsz', data: { ziel: d.ziel || '' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const ziel = new URL('./' + ((e.notification.data && e.notification.data.ziel) || ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(fenster => {
    const f = fenster[0];
    if (f) { if (f.navigate) f.navigate(ziel).catch(() => {}); return f.focus(); }
    return self.clients.openWindow(ziel);
  }));
});
