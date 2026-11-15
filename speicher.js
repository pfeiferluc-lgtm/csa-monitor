// Speicher auf dem Gerät (IndexedDB) für den Einsatz-Teil: zuletzt geöffnete Stoffe (offline wieder abrufbar), eigene
// Sicherheitsdatenblätter und – in der Web-App – die Dateien der Einsatz-Ordner für den Betrieb ohne Netz.
// window.GSZSpeicher = { hole, setze, loesche, alle, schluessel, leeren, belegt }
'use strict';
(() => {
  const NAME = 'gsz-einsatz', VERSION = 1;
  const SPEICHER = ['stoffe', 'sdb', 'dateien', 'meta'];
  let db = null;
  function oeffnen() {
    if (db) return db;
    db = new Promise((erfuellen, ablehnen) => {
      if (!window.indexedDB) { ablehnen(new Error('Kein Gerätespeicher (IndexedDB) verfügbar.')); return; }
      const r = indexedDB.open(NAME, VERSION);
      r.onupgradeneeded = () => { for (const s of SPEICHER) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); };
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); db = null; }; erfuellen(r.result); };
      r.onerror = () => ablehnen(r.error || new Error('Gerätespeicher lässt sich nicht öffnen.'));
      r.onblocked = () => ablehnen(new Error('Gerätespeicher ist blockiert (App in einem anderen Fenster offen?).'));
    });
    db.catch(() => { db = null; });
    return db;
  }
  async function vorgang(speicher, art, f) {
    const d = await oeffnen();
    return new Promise((erfuellen, ablehnen) => {
      const t = d.transaction(speicher, art);
      const s = t.objectStore(speicher);
      let ergebnis;
      const r = f(s);
      if (r) r.onsuccess = () => { ergebnis = r.result; };
      t.oncomplete = () => erfuellen(ergebnis);
      t.onerror = () => ablehnen(t.error);
      t.onabort = () => ablehnen(t.error || new Error('Speichern abgebrochen (Speicher voll?).'));
    });
  }
  const hole = (sp, k) => vorgang(sp, 'readonly', s => s.get(k));
  const setze = (sp, k, v) => vorgang(sp, 'readwrite', s => s.put(v, k));
  const loesche = (sp, k) => vorgang(sp, 'readwrite', s => s.delete(k));
  const leeren = sp => vorgang(sp, 'readwrite', s => s.clear());
  const schluessel = sp => vorgang(sp, 'readonly', s => s.getAllKeys());
  async function alle(sp) {
    const d = await oeffnen();
    return new Promise((erfuellen, ablehnen) => {
      const aus = [];
      const r = d.transaction(sp, 'readonly').objectStore(sp).openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { aus.push({ schluessel: c.key, wert: c.value }); c.continue(); } else erfuellen(aus); };
      r.onerror = () => ablehnen(r.error);
    });
  }
  // belegter Speicher (Schätzung des Browsers)
  async function belegt() {
    try { const e = await navigator.storage.estimate(); return { belegt: e.usage || 0, frei: (e.quota || 0) - (e.usage || 0) }; } catch { return null; }
  }
  window.GSZSpeicher = { hole, setze, loesche, alle, schluessel, leeren, belegt };
})();
