// Auswertung ohne Mac: Die App fragt Claude direkt über die Claude-API – mit einem eigenen API-Schlüssel
// (console.anthropic.com), der nur auf diesem Gerät gespeichert wird. Gleiche Anweisungen, Formate und Regeln wie der
// Mac-Helfer (bestaendigkeit.js, auswertung.js, stoffdaten.js):
//   – Beständigkeitsliste auswerten (in Teilen zu 6 Seiten; das PDF geht einmal in den Zwischenspeicher von Claude)
//   – Liste prüfen (zweiter, unabhängiger Lesedurchgang; ohne Abweichung → „geprüft“)
//   – Sicherheitsdatenblatt auswerten (PDF bzw. Fotos und Text der Texterkennung)
// Läuft im Vordergrund (Bildschirm bleibt an, wo möglich). Fertige Teile bleiben im Gerätespeicher: Bricht die Auswertung
// ab (Funkloch, App geschlossen), geht sie beim nächsten Mal ab dem nächsten Teil weiter. Das Ergebnis trägt die Prüfsumme
// auswertung.quelle_app – daran erkennt der Mac-Helfer, dass die Liste schon ausgewertet ist.
// Ansicht #claude: Schlüssel und Modell. window.GSZClaude = { bereit, listeAuswerten, listePruefen, sdbAuswerten, geraetKarte, laeuft }
'use strict';
(() => {
  const E = window.GSZEinsatz, B = window.GSZBestaendigkeit, A = window.GSZAuswertung, S = window.GSZStoffdaten, SP = window.GSZSpeicher;
  if (!E || !B || !A || !window.GSZ) return;
  const { esc, meldung, I } = E;
  const MODELLE = { 'claude-opus-5': 'Claude Opus 5 – genaueste Auswertung (Standard)', 'claude-sonnet-5': 'Claude Sonnet 5 – schneller und günstiger' };
  const PREIS = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [3, 15] };     // US-$ je Million Token (Eingabe, Ausgabe) – Richtwert
  const MAX_AUSGABE = 64000, PDF_MAX = 30 * 1024 * 1024, PDF_MAX_SEITEN = 100;
  const BL = 'Beständigkeitslisten';

  // ---------------------------------------------------------------- Einstellungen (nur auf diesem Gerät)
  const LS_KEY = 'gsz-claude-api';
  const einst = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; } };
  const einstSetzen = e => { try { localStorage.setItem(LS_KEY, JSON.stringify(e)); } catch { /* privat */ } };
  const bereit = () => !!einst().schluessel;
  const modell = () => MODELLE[einst().modell] ? einst().modell : 'claude-opus-5';

  // ---------------------------------------------------------------- Bausteine laden
  const skript = src => new Promise((ok, fehler) => { const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => fehler(new Error(`${src} lässt sich nicht laden (ohne Netz?)`)); document.head.appendChild(s); });
  async function klient() {
    if (!window.GSZAnthropic) await skript('anthropic-sdk.js');
    if (!window.GSZAnthropic) throw new Error('Claude-Baustein fehlt.');
    const k = einst().schluessel;
    if (!k) throw new Error('Kein API-Schlüssel hinterlegt (Einstellungen › Claude ohne Mac).');
    return new window.GSZAnthropic({ apiKey: k, dangerouslyAllowBrowser: true, maxRetries: 3, timeout: 20 * 60 * 1000 });
  }
  async function pdfjs() {
    if (!window.pdfjsLib) await skript('pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    return window.pdfjsLib;
  }
  const base64 = async blob => { const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const sha256 = async daten => [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof daten === 'string' ? new TextEncoder().encode(daten) : daten))]
    .map(x => x.toString(16).padStart(2, '0')).join('');

  // Schema für output_config.format: jedes Objekt ohne weitere Felder; Einschränkungen, die die API nicht kennt, entfernen
  function apiSchema(s) {
    if (Array.isArray(s)) return s.map(apiSchema);
    if (!s || typeof s !== 'object') return s;
    const o = {};
    for (const [k, v] of Object.entries(s)) if (!['minLength', 'maxLength', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'pattern', 'minItems', 'maxItems', 'uniqueItems', '$schema', 'default', 'examples'].includes(k)) o[k] = apiSchema(v);
    if (o.type === 'object' || o.properties) o.additionalProperties = false;
    return o;
  }

  // Claude einmal fragen: Inhaltsblöcke hinein, JSON nach Schema heraus. Fehler mit verständlicher Meldung.
  async function fragen({ system, inhalt, schema, signal, aufZeichen }) {
    const c = await klient();
    let zeichen = 0;
    let m;
    try {
      const stream = c.messages.stream({ model: modell(), max_tokens: MAX_AUSGABE, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: inhalt }], output_config: { format: { type: 'json_schema', schema: apiSchema(schema) } } }, { signal });
      stream.on('text', t => { zeichen += t.length; if (aufZeichen) aufZeichen(zeichen); });
      m = await stream.finalMessage();
    } catch (e) {
      if (signal && signal.aborted) throw Object.assign(new Error('abgebrochen'), { abgebrochen: true });
      const st = e && e.status;
      if (st === 401) throw new Error('Der API-Schlüssel wird nicht angenommen (Einstellungen › Claude ohne Mac).');
      if (st === 400 && /credit|balance|billing/i.test(String(e.message))) throw new Error('Das Guthaben des API-Kontos reicht nicht (console.anthropic.com › Billing).');
      if (st === 429) throw new Error('Claude ist gerade ausgelastet bzw. das Limit des API-Kontos ist erreicht – später erneut.');
      if (st === 413) throw new Error('Die Datei ist für eine Anfrage zu groß.');
      throw new Error('Claude nicht erreichbar: ' + String((e && e.message) || e).slice(0, 200));
    }
    if (m.stop_reason === 'refusal') throw new Error('Claude hat die Auswertung abgelehnt.');
    if (m.stop_reason === 'max_tokens') throw new Error('Die Antwort war zu lang für eine Anfrage.');
    const text = m.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let daten;
    try { daten = JSON.parse(text); } catch { throw new Error('Claude hat kein Ergebnis im vorgegebenen Format geliefert.'); }
    return { daten, modell: m.model || modell(), nutzung: m.usage || {} };
  }

  // ---------------------------------------------------------------- Teile einer Liste (wie der Mac-Helfer)
  // PDFs: das ganze PDF je Teil (im Zwischenspeicher), Claude liest nur die Seiten des Teils. Geschützte oder sehr große
  // PDFs: die Seiten des Teils als Bilder. Fotos: in Gruppen zu 6. Doppelt hochgeladene Dateien nur einmal.
  async function seitenBilder(blob, von, bis, name) {
    const lib = await pdfjs(), doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise, aus = [];
    for (let n = von; n <= bis; n++) {
      const seite = await doc.getPage(n), v0 = seite.getViewport({ scale: 1 }), f = Math.min(3, 2000 / Math.max(v0.width, v0.height));
      const v = seite.getViewport({ scale: f }), c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await seite.render({ canvasContext: x, viewport: v }).promise;
      aus.push({ name: `${name} Seite ${n}`, blob: await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.85)) });
    }
    try { await doc.destroy(); } catch { /* egal */ }
    return aus;
  }
  async function teileBilden(g) {
    const a = E.ad(), teile = [], gesehen = new Map();
    let bilder = [];
    const bilderAbschliessen = () => { for (let i = 0; i < bilder.length; i += A.TEIL_BILDER) teile.push({ art: 'bilder', bilder: bilder.slice(i, i + A.TEIL_BILDER) }); bilder = []; };
    for (const q of g.quellen) {
      const name = q.split('/').pop(), blob = await a.datei(q);
      const summe = await sha256(await blob.arrayBuffer());
      if (gesehen.has(summe)) continue;                     // Kopie derselben Datei
      gesehen.set(summe, name);
      if (!/\.pdf$/i.test(name)) { bilder.push({ name, blob }); continue; }
      bilderAbschliessen();
      const kopf = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
      const geschuetzt = /\/Encrypt\b/.test(kopf);
      const lib = await pdfjs(), doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise, seiten = doc.numPages;
      try { await doc.destroy(); } catch { /* egal */ }
      for (const [von, bis] of A.bereiche(seiten)) {
        if (geschuetzt || blob.size > PDF_MAX || seiten > PDF_MAX_SEITEN) teile.push({ art: 'bilder', bilder: [], pdfBlob: blob, von, bis, seitenVon: name });
        else teile.push({ art: 'pdf', name, von, bis, seiten, ganz: true, blob });
      }
    }
    bilderAbschliessen();
    return teile;
  }
  async function teilBloecke(teil) {
    if (teil.art === 'pdf') return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await base64(teil.blob) }, cache_control: { type: 'ephemeral' } }];
    if (teil.pdfBlob && !teil.bilder.length) teil.bilder = await seitenBilder(teil.pdfBlob, teil.von, teil.bis, teil.seitenVon);
    const bloecke = [];
    for (const b of teil.bilder) {
      let blob = b.blob;
      if (!/^image\/(jpeg|png)$/.test(blob.type) || blob.size > 3.5 * 1048576) blob = await GSZOcr.bildVerkleinern(blob);
      bloecke.push({ type: 'image', source: { type: 'base64', media_type: blob.type || 'image/jpeg', data: await base64(blob) } });
    }
    return bloecke;
  }

  // ---------------------------------------------------------------- Laufende Arbeiten, Fortschritt, Bildschirm an
  const laeuft = new Map();                                   // Schlüssel (Ordner bzw. sdb:<id>) → Fortschritt
  const beobachter = new Set();
  const melden = schluessel => { for (const f of beobachter) { try { f(schluessel); } catch { /* weiter */ } } };
  let wach = null;
  async function wachHalten(an) {
    try {
      if (an && !wach && navigator.wakeLock) { wach = await navigator.wakeLock.request('screen'); wach.addEventListener('release', () => { wach = null; }); }
      if (!an && wach && !laeuft.size) { await wach.release(); wach = null; }
    } catch { wach = null; }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && laeuft.size) wachHalten(true); });
  const kosten = n => { const [ein, aus] = PREIS[modell()] || PREIS['claude-opus-5'];
    return ((n.input_tokens || 0) * ein + (n.cache_creation_input_tokens || 0) * ein * 1.25 + (n.cache_read_input_tokens || 0) * ein * 0.1 + (n.output_tokens || 0) * aus) / 1e6; };
  const dollar = x => '≈ ' + (x < 0.01 ? '< 0,01' : x.toFixed(2).replace('.', ',')) + ' $';
  const geraetText = () => /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone/iPad' : (E.ad() && E.ad().art === 'web') ? 'Browser' : 'Programm';

  // gemeinsamer Ablauf für Liste auswerten / prüfen
  async function arbeiten(g, art) {
    const a = E.ad();
    if (!a || !a.verbunden() || !a.geraetDateien) throw new Error('Dafür braucht die App die Verbindung zum Dropbox-App-Ordner.');
    if (!bereit()) throw new Error('Kein API-Schlüssel hinterlegt.');
    if (laeuft.has(g.ordner)) return;
    const abbruch = new AbortController();
    const w = { art, ordner: g.ordner, phase: 'vorbereiten', teil: 0, teile: 0, fertig: 0, seit: new Date().toISOString(), teil_seit: null, schnitt_ms: 0, kosten: 0, abbruch };
    laeuft.set(g.ordner, w); melden(g.ordner); wachHalten(true);
    try {
      await a.geraetDateien(g.ordner, [{ name: 'in-arbeit-app.json', blob: new Blob([JSON.stringify({ seit: w.seit, art, von: geraetText() })], { type: 'application/json' }) }]).catch(() => {});
      const infoText = g.info ? (await (await a.datei(g.info)).text()).replace(/\r/g, '').trim().slice(0, 4000) : '';
      const teile = await teileBilden(g);
      if (!teile.length) throw new Error('Keine Liste (PDF oder Bild) im Geräteordner.');
      Object.assign(w, { phase: art === 'pruefung' ? 'pruefen' : 'auswerten', teile: teile.length }); melden(g.ordner);
      const quellenInfo = g.quellen.map(q => ({ name: q.split('/').pop(), groesse: ((E.dateien || []).find(d => d.pfad === q) || {}).groesse || 0 }));
      const infoOhne = g.info ? B.infoOhneKategorie(infoText) : '';
      const hash = await sha256(A.quelleAppText(quellenInfo, infoOhne));
      const dauern = [];
      if (art === 'auswertung') {
        const antworten = [];
        let bezug = null, bezugNr = 0, mod = '';
        for (let i = 0; i < teile.length; i++) {
          const teil = teile[i], key = `claude-teil:${g.ordner}|${hash}|${teile.length}|${i}`;
          Object.assign(w, { teil: i + 1, teil_seit: new Date().toISOString(), zeichen: 0 }); melden(g.ordner);
          let erg = await SP.hole('meta', key).catch(() => null);
          if (!erg) {
            const t0 = Date.now();
            const inhalt = [...await teilBloecke(teil), { type: 'text', text: A.teilText({ ordner: g.ordner, infoText, teil, nr: i + 1, anzahl: teile.length, bezug, bezugNr }) }];
            const r = await fragen({ system: B.ANWEISUNG, schema: B.SCHEMA, inhalt, signal: abbruch.signal, aufZeichen: z => { w.zeichen = z; melden(g.ordner); } });
            erg = { daten: A.seitenKorrigieren(r.daten, teil), modell: r.modell };
            w.kosten += kosten(r.nutzung);
            await SP.setze('meta', key, erg).catch(() => {});
            dauern.push(Date.now() - t0);
          }
          antworten.push(erg.daten); mod = mod || erg.modell;
          if (!bezug && A.hatSpalten(erg.daten)) { bezug = erg.daten.kopf; bezugNr = i + 1; }
          Object.assign(w, { fertig: i + 1, schnitt_ms: dauern.length ? Math.round(dauern.reduce((x, y) => x + y, 0) / dauern.length) : w.schnitt_ms }); melden(g.ordner);
        }
        const fassung = B.ausClaude(A.teileZusammensetzen(antworten), { ordner: g.ordner, info: infoText, dateien: quellenInfo.map(q => q.name), modell: mod, quelleHash: '' });
        fassung.auswertung.von = `Claude-API (App auf ${geraetText()}, ohne Mac)`;
        fassung.auswertung.quelle_app = { hash, zeit: new Date().toISOString(), von: geraetText() };
        const dateien = [{ name: B.DATEI, blob: new Blob([JSON.stringify(fassung, null, 1) + '\n'], { type: 'application/json' }) }];
        if (g.daten && g.daten.auswertung && g.daten.auswertung.geprueft) dateien.unshift({ name: 'bestaendigkeit.alt.json', blob: new Blob([JSON.stringify(g.daten, null, 1)], { type: 'application/json' }) });
        await a.geraetDateien(g.ordner, dateien, { loeschen: ['in-arbeit-app.json', 'bestaendigkeit.fehler.json'] });
        for (let i = 0; i < teile.length; i++) await SP.loesche('meta', `claude-teil:${g.ordner}|${hash}|${teile.length}|${i}`).catch(() => {});
        meldung(`${g.name || g.ordner}: Liste ausgewertet – ${fassung.eintraege.length} Einträge (${dollar(w.kosten)}).`, 8000);
      } else {
        const d = B.pruefen(JSON.parse(await (await a.datei(`${BL}/${g.ordner}/${B.DATEI}`)).text()));
        const abweichungen = [], fehlend = [], anmerkungen = [];
        let mod = '';
        for (let i = 0; i < teile.length; i++) {
          const teil = teile[i];
          Object.assign(w, { teil: i + 1, teil_seit: new Date().toISOString(), zeichen: 0 }); melden(g.ordner);
          const t0 = Date.now();
          const { zeilen, alle } = A.pruefZeilen(d, teile, teil);
          const inhalt = [...await teilBloecke(teil), { type: 'text', text: A.pruefText({ ordner: g.ordner, d, teil, nr: i + 1, anzahl: teile.length, zeilen, alle }) }];
          const r = await fragen({ system: B.PRUEF_ANWEISUNG, schema: B.PRUEF_SCHEMA, inhalt, signal: abbruch.signal, aufZeichen: z => { w.zeichen = z; melden(g.ordner); } });
          const p = A.pruefTeil(r.daten);
          abweichungen.push(...p.abweichungen); fehlend.push(...p.fehlend); if (p.anmerkung) anmerkungen.push(`Teil ${i + 1}: ${p.anmerkung}`);
          mod = mod || r.modell; w.kosten += kosten(r.nutzung); dauern.push(Date.now() - t0);
          Object.assign(w, { fertig: i + 1, schnitt_ms: Math.round(dauern.reduce((x, y) => x + y, 0) / dauern.length) }); melden(g.ordner);
        }
        const { ok, ergebnis } = A.pruefungEintragen(d, { von: `Claude-API (App auf ${geraetText()}) – zweiter Lesedurchgang`, modell: mod, teile: teile.length, abweichungen, fehlend, anmerkungen });
        await a.geraetDateien(g.ordner, [{ name: B.DATEI, blob: new Blob([JSON.stringify(d, null, 1) + '\n'], { type: 'application/json' }) }],
          { loeschen: ['in-arbeit-app.json', B.PRUEF_DATEI] });
        meldung(`${g.name || g.ordner}: Prüfung fertig – ${ok ? 'keine Abweichung, jetzt geprüft' : ergebnis.ergebnis} (${dollar(w.kosten)}).`, 9000);
      }
      await E.listeHolen(true);
    } catch (e) {
      if (!e.abgebrochen) meldung(`${g.name || g.ordner}: ${e.message}`, 10000);
      else meldung('Abgebrochen – fertige Teile bleiben gespeichert, beim nächsten Mal geht es dort weiter.', 7000);
      await a.geraetDateien(g.ordner, [], { loeschen: ['in-arbeit-app.json'] }).catch(() => {});
      w.fehler = e.abgebrochen ? '' : e.message;
    } finally {
      laeuft.delete(g.ordner); melden(g.ordner); wachHalten(false);
    }
  }
  const listeAuswerten = g => arbeiten(g, 'auswertung');
  const listePruefen = g => arbeiten(g, 'pruefung');

  // ---------------------------------------------------------------- Sicherheitsdatenblatt
  async function sdbAuswerten(id, { fortschritt = () => {} } = {}) {
    const x0 = await SP.hole('sdb', id);
    if (!x0) throw new Error('Datenblatt nicht gefunden.');
    if (laeuft.has('sdb:' + id)) return;
    const w = { art: 'sdb', seit: new Date().toISOString(), zeichen: 0, abbruch: new AbortController() };
    laeuft.set('sdb:' + id, w); wachHalten(true);
    try {
      const a = E.ad(), inhalt = [], vorlage = [], notizen = [];
      let fotos = 0;
      fortschritt('Dateien werden vorbereitet …', 0.05);
      for (const f of x0.dateien) {
        const blob = f.blob || await a.datei(f.pfad);
        if (/pdf/i.test(f.typ || '') || /\.pdf$/i.test(f.name)) {
          const geschuetzt = /\/Encrypt\b/.test(new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer())));
          if (!geschuetzt && blob.size <= PDF_MAX) { inhalt.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await base64(blob) } }); vorlage.push('PDF ' + f.name); }
          else { for (const b of await seitenBilder(blob, 1, Math.min(20, (await (await pdfjs()).getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise).numPages), f.name)) {
            inhalt.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await base64(b.blob) } }); fotos++; }
            notizen.push(`${f.name} hat einen Kopierschutz bzw. ist sehr groß – als Seitenbilder beigefügt (höchstens 20 Seiten).`); }
        } else {
          const j = await GSZOcr.bildVerkleinern(blob);
          inhalt.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await base64(j) } }); fotos++;
        }
      }
      if (fotos) vorlage.unshift(fotos === 1 ? '1 Bild' : `${fotos} Bilder`);
      const ocr = String(x0.text || '').slice(0, S.MAX_TEXT || 60000);
      if (ocr) { inhalt.push({ type: 'text', text: 'Texterkennung des Handys (kann Zeichen verlesen oder Tabellenspalten vermischen):\n--- VORLAGE ---\n' + ocr + '\n--- ENDE ---' }); vorlage.push('Text der Texterkennung'); }
      if (!inhalt.length) throw new Error('Keine auswertbare Datei.');
      inhalt.push({ type: 'text', text: [`Gefahrstoffzug-App, Datenblatt ${id}: Bitte dieses Sicherheitsdatenblatt auswerten und im vorgegebenen Format antworten.`,
        `Vorlage: ${vorlage.join(', ')}.`, ...notizen, ocr && inhalt.length > 2 ? 'Bei Widersprüchen zwischen Texterkennung und Foto bzw. PDF gilt das Foto bzw. PDF.' : ''].filter(Boolean).join('\n') });
      fortschritt('Claude liest das Datenblatt …', 0.15);
      const r = await fragen({ system: S.SDB_ANWEISUNG, schema: S.SCHEMA, inhalt, signal: w.abbruch.signal,
        aufZeichen: z => fortschritt(`Claude schreibt das Ergebnis … (${Math.round(z / 100) / 10} Tsd. Zeichen)`, Math.min(0.95, 0.2 + z / 25000)) });
      const stoff = S.antwortLesen(r.daten, 'Sicherheitsdatenblatt – ausgewertet von Claude (Claude-API)');
      const x = await SP.hole('sdb', id);
      x.claude = stoff; x.claudeVon = 'api'; x.claudeZeit = new Date().toISOString(); x.geaendert = x.claudeZeit;
      if (x.auftrag && !x.auftrag.erledigt) x.auftrag = { ...x.auftrag, erledigt: x.claudeZeit, fehler: '' };
      await SP.setze('sdb', id, x);
      if (window.GSZSdbImport && GSZSdbImport.teilen) GSZSdbImport.teilen(id, { nurDaten: true });
      meldung(`Datenblatt ausgewertet (${dollar(kosten(r.nutzung))}).`, 6000);
      return x;
    } finally { laeuft.delete('sdb:' + id); wachHalten(false); }
  }

  // ---------------------------------------------------------------- Karte auf der Geräteseite
  async function helferOnline() {
    try { const h = E.ad() && E.ad().helfer ? await E.ad().helfer() : null; return !!(h && h.zeit && Date.now() - Date.parse(h.zeit) < 3 * 60 * 1000); } catch { return false; }
  }
  // el: Geräteseite; g: Gerät (aus geraete()); wird nach jedem Zeichnen der Seite aufgerufen
  async function geraetKarte(el, g) {
    if (!g || !g.quellen || !g.quellen.length) return;
    let k = el.querySelector('#cd-karte');
    if (!k) { k = document.createElement('section'); k.className = 'kachel ez-karte'; k.id = 'cd-karte'; const ziel = el.querySelector('#ez-liste-karte'); if (ziel) ziel.before(k); else el.appendChild(k); }
    const mac = await helferOnline();
    const zeichnen = () => {
      if (!k.isConnected) { beobachter.delete(zeichnen); return; }
      const w = laeuft.get(g.ordner);
      if (w) {
        const anteil = w.teile ? Math.min(0.99, (w.fertig + (w.fertig >= w.teil ? 0 : Math.min(0.9, (w.zeichen || 0) / 20000))) / w.teile) : 0;
        k.innerHTML = `<h2>${w.art === 'pruefung' ? 'Prüfung' : 'Auswertung'} mit Claude (ohne Mac)</h2>
          <div class="ez-fortschritt"><div class="titel">${w.phase === 'vorbereiten' ? 'Liste wird vorbereitet …' : `Teil ${w.teil} von ${w.teile}`} <span class="gross">${Math.round(anteil * 100)} %</span></div>
          <div class="balken ${w.teile ? '' : 'unbestimmt'}"><i style="width:${(anteil * 100).toFixed(1)}%"></i></div>
          <div class="zeile"><span>${w.zeichen ? `Claude schreibt … ${Math.round(w.zeichen / 100) / 10} Tsd. Zeichen` : w.teile ? 'Claude liest …' : ''}</span><span>${w.kosten ? dollar(w.kosten) : ''}</span></div></div>
          <div class="ez-klein" style="margin-top:.4rem">Bitte die App geöffnet lassen. Fertige Teile bleiben gespeichert.</div>
          <p><button class="knopf" id="cd-stopp">Abbrechen</button></p>`;
        k.querySelector('#cd-stopp').addEventListener('click', () => w.abbruch.abort());
        return;
      }
      const hatListe = !!g.daten;
      const knoepfe = bereit() ? `<div style="display:flex;gap:.45rem;flex-wrap:wrap">
          <button class="knopf" id="cd-auswerten">${I.neu}${hatListe ? 'Neu auswerten' : 'Jetzt auswerten'}</button>
          ${hatListe ? `<button class="knopf" id="cd-pruefen">${I.schild}Liste prüfen</button>` : ''}</div>`
        : `<a class="knopf" href="#claude">${I.plus}Einrichten (API-Schlüssel)</a>`;
      k.innerHTML = `<details class="ez-mehr" ${!hatListe && !mac ? 'open' : ''}><summary>Ohne Mac: mit Claude auf diesem Gerät ${hatListe ? 'neu auswerten oder prüfen' : 'auswerten'}</summary><div class="inhalt">
        <div>${mac ? 'Der Mac-Helfer ist online und übernimmt das kostenlos über das Claude-Abo. ' : 'Der Mac-Helfer ist gerade nicht erreichbar. '}
          Ohne Mac fragt die App Claude direkt über die Claude-API (eigener Schlüssel, Kosten je nach Länge etwa 0,20–2 $ pro Liste).</div>
        ${knoepfe}</div></details>`;
      const ausw = k.querySelector('#cd-auswerten'), pr = k.querySelector('#cd-pruefen');
      if (ausw) ausw.addEventListener('click', () => { if (hatListe && !confirm('Die Liste neu mit Claude auswerten? Die bisherige Fassung wird ersetzt (eine geprüfte wird als bestaendigkeit.alt.json gesichert).')) return; listeAuswerten(g); });
      if (pr) pr.addEventListener('click', () => listePruefen(g));
    };
    beobachter.add(s => { if (s === g.ordner) zeichnen(); });
    zeichnen();
  }

  // ---------------------------------------------------------------- Ansicht #claude: Einrichtung
  const cEl = E.ansichtElement('claudeansicht');
  function einrichtungZeigen() {
    const e = einst();
    cEl.innerHTML = '';
    cEl.appendChild(E.kopf({ titel: 'Claude ohne Mac', unter: 'Auswertung direkt über die Claude-API', eltern: 'einsatz' }));
    cEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Wozu?</h2>
      <p style="margin-top:0">Normalerweise wertet der Mac-Helfer Beständigkeitslisten und Sicherheitsdatenblätter über das Claude-Abo aus – dafür muss der Mac laufen.
      Mit einem eigenen API-Schlüssel erledigt die App das auf jedem Gerät selbst, auch am iPhone: Liste auswerten, Liste prüfen, Datenblatt auswerten.</p>
      <ul class="ez-zeilen"><li data-z="•">Schlüssel anlegen unter <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> (Konto mit Guthaben, getrennt vom Claude-Abo).</li>
      <li data-z="•">Kosten: Abrechnung nach Umfang – grob 0,20–2 $ je Liste, 0,10–0,50 $ je Datenblatt (Opus 5). Ein Ausgabenlimit im Konto ist empfehlenswert.</li>
      <li data-z="•">Der Schlüssel bleibt nur auf diesem Gerät gespeichert und geht nirgendwohin außer an Anthropic.</li></ul></section>
      <section class="kachel ez-karte"><h2>Einstellungen</h2>
        <label class="eb-feld">API-Schlüssel<input type="password" id="cd-schluessel" autocomplete="off" placeholder="${e.schluessel ? '•••• gespeichert – zum Ändern neu eingeben' : 'sk-ant-…'}"></label>
        <label class="eb-feld" style="margin-top:.5rem">Modell<select id="cd-modell">${Object.entries(MODELLE).map(([k, t]) => `<option value="${k}" ${k === modell() ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        <div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.7rem"><button class="knopf" id="cd-speichern">Speichern</button>
          <button class="knopf" id="cd-test" ${e.schluessel ? '' : 'disabled'}>Verbindung testen</button>
          <button class="knopf" id="cd-weg" ${e.schluessel ? '' : 'disabled'}>${I.muell}Schlüssel löschen</button></div>
        <div class="ez-klein" id="cd-stand" style="margin-top:.5rem">${e.schluessel ? 'Ein Schlüssel ist gespeichert.' : 'Noch kein Schlüssel gespeichert.'}</div></section>`);
    const feld = cEl.querySelector('#cd-schluessel'), stand = cEl.querySelector('#cd-stand');
    cEl.querySelector('#cd-speichern').addEventListener('click', () => {
      const neu = feld.value.trim(), x = einst();
      if (neu && !/^sk-ant-/.test(neu)) { stand.textContent = 'Das sieht nicht wie ein API-Schlüssel aus (beginnt mit sk-ant-).'; return; }
      if (neu) x.schluessel = neu;
      x.modell = cEl.querySelector('#cd-modell').value;
      einstSetzen(x); einrichtungZeigen(); meldung('Gespeichert.', 2500);
    });
    cEl.querySelector('#cd-test').addEventListener('click', async () => {
      stand.textContent = 'Wird getestet …';
      try { const c = await klient(); const m = await c.messages.create({ model: modell(), max_tokens: 16, messages: [{ role: 'user', content: 'Antworte nur mit: OK' }] });
        stand.textContent = `Verbindung in Ordnung (${m.model}).`; }
      catch (er) { stand.textContent = 'Fehler: ' + (er.status === 401 ? 'Schlüssel wird nicht angenommen.' : er.message); }
    });
    cEl.querySelector('#cd-weg').addEventListener('click', () => { if (!confirm('API-Schlüssel von diesem Gerät löschen?')) return; const x = einst(); delete x.schluessel; einstSetzen(x); einrichtungZeigen(); });
  }
  GSZ.ansicht('claude', { element: cEl, titel: () => 'Claude ohne Mac', anzeigen() { einrichtungZeigen(); } });

  window.GSZClaude = { bereit, modell, listeAuswerten, listePruefen, sdbAuswerten, geraetKarte, laeuft: () => [...laeuft.values()], apiSchema, fragen,
    beobachten: f => beobachter.add(f) };
})();
