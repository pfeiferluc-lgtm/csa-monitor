// Eigenes Sicherheitsdatenblatt importieren (Bild oder PDF) – Einsatz-Teil der App „Gefahrstoffzug TE Miehlen“.
// Ablauf:
//   1. Ein Knopf „Sicherheitsdatenblatt importieren“ (Einsatz-Seite bzw. #sdb-neu): Bild(er) oder PDF wählen – am iPhone auch Foto aufnehmen
//   2. Sofort: Auftrag in den Dropbox-App-Ordner (Auswertung/<id>/) → der Mac-Helfer lässt ihn von Claude auswerten (Max-Abo)
//   3. Parallel auf dem Gerät: Text lesen (PDF-Textebene bzw. Texterkennung) und mit sdb-parser.js auswerten → erstes Ergebnis
//   4. Antwortet der Mac-Helfer nicht (Mac aus): „Mit Claude auf diesem iPhone auswerten“ – Kurzbefehl „GSZ Claude“ fragt die
//      Claude-App und legt die Antwort in den Auftragsordner (bzw. in die Zwischenablage, ohne Dropbox)
//   5. Ergebnis von Claude ersetzt das der Texterkennung (leere Felder füllt die Texterkennung) – Einsatzbildschirm (#sdb/<id>)
// Alles liegt im Gerätespeicher (GSZSpeicher 'sdb'), also auch ohne Netz wieder abrufbar.
'use strict';
(() => {
  const E = window.GSZEinsatz, S = window.GSZStoffdaten, SP = window.GSZSpeicher;
  if (!E) return;
  const { esc, datumZeit, meldung, I } = E;
  const KURZBEFEHL = 'GSZ Claude';
  const istIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ad = () => (GSZ.adapter && GSZ.adapter.einsatz) || null;
  const css = `
  .sdb-los { width: 100%; box-sizing: border-box; background: var(--akzent) !important; border-color: var(--akzent) !important; color: #fff !important;
    font-weight: 700; padding: .85rem 1rem !important; font-size: 1.05rem !important; }
  .sdb-mehr { margin-top: .55rem; font-size: .85rem; }
  .sdb-mehr summary { cursor: pointer; color: var(--ink2); }
  .sdb-los:disabled { opacity: .45; }
  .sdb-balken { height: .45rem; border-radius: .3rem; background: var(--surface2); border: 1px solid var(--line); overflow: hidden; margin-top: .45rem; }
  .sdb-balken i { display: block; height: 100%; background: var(--akzent); transition: width .3s; }
  .sdb-zeile { display: flex; gap: .45rem; flex-wrap: wrap; margin-top: .55rem; }
  /* Auswertung: Claude (über den Mac-Helfer) und Texterkennung (auf dem Gerät) – je Status, Fortschrittsbalken, Knopf */
  .sdb-auswertung { display: grid; grid-template-columns: repeat(auto-fit, minmax(15.5rem, 1fr)); gap: .7rem; }
  .sdb-weg { padding: .75rem .85rem .85rem; border-radius: .75rem; background: var(--surface); box-shadow: var(--schatten); display: flex; flex-direction: column; gap: .45rem; min-width: 0; }
  .sdb-weg .kopf { display: flex; align-items: baseline; gap: .2rem .5rem; flex-wrap: wrap; }
  .sdb-weg .kopf b { font-size: 1rem; } .sdb-weg .kopf small { font-size: .74rem; color: var(--muted); }
  .sdb-weg .status { font-size: .86rem; color: var(--ink2); line-height: 1.38; overflow-wrap: anywhere; }
  .sdb-weg .status.fertig { color: var(--good); font-weight: 600; } .sdb-weg .status.fehler { color: var(--crit); }
  .sdb-weg .sdb-balken { margin-top: 0; }
  .sdb-weg > .knopf { align-self: flex-start; margin-top: .15rem; }
  .sdb-weg > .knopf:disabled { opacity: .5; cursor: default; }
  .sdb-weg .sdb-mehr { margin-top: .1rem; }
  .sdb-balken.unbestimmt i { width: 35% !important; animation: sdb-lauf 1.5s ease-in-out infinite; }
  @keyframes sdb-lauf { 0% { transform: translateX(-110%); } 100% { transform: translateX(310%); } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------------------------------------------------------------- Speicher
  const neueId = () => {
    const d = new Date(), z = n => String(n).padStart(2, '0');
    const r = [...crypto.getRandomValues(new Uint8Array(3))].map(b => b.toString(16).padStart(2, '0')).join('');
    return `sdb-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}-${r}`;
  };
  const hole = id => SP.hole('sdb', id);
  const speichern = d => SP.setze('sdb', d.id, d);
  const fortschritt = new Map();          // id -> { text, anteil }
  const beobachter = new Set();
  const melden = (id, nurFortschritt = false) => { for (const f of beobachter) { try { f(id, nurFortschritt); } catch { /* weiter */ } } };

  function stoffVon(d) {
    const ocr = d.ocr ? S.normalisieren(d.ocr) : null, cl = d.claude ? S.normalisieren(d.claude) : null;
    const s = cl && ocr ? S.zusammenfuehren(cl, ocr) : cl || ocr || S.normalisieren({ quelle: 'sdb', quelleText: 'Sicherheitsdatenblatt', name: '' });
    if (!s.name) s.name = d.name.replace(/\.[^.]+$/, '') || 'Sicherheitsdatenblatt';
    s.id = d.id;
    return s;
  }
  // Claude-Auftrag unterwegs? (abgelegt, noch kein Ergebnis; ältere Datensätze mit Ergebnis gelten als erledigt)
  const auftragOffen = d => !!(d && d.auftrag && d.auftrag.abgelegt && !d.auftrag.erledigt && !(d.claude && !d.auftrag.id));
  const vonText = v => v === 'iphone' ? 'iPhone' : v === 'api' ? 'Claude-API' : 'Mac';
  function statusText(d) {
    if (auftragOffen(d) && d.claude) return `von Claude ausgewertet (${vonText(d.claudeVon)}) · wird erneut ausgewertet`;
    if (d.claude) return `von Claude ausgewertet (${vonText(d.claudeVon)})`;
    if (d.status === 'liest') return 'wird gelesen …';
    if (d.status === 'fehler') return 'Fehler beim Lesen';
    return auftragOffen(d) ? 'Texterkennung · Claude ausstehend' : 'Texterkennung';
  }

  // ---------------------------------------------------------------- Teilen über die Dropbox (Einsatz/Eigene Datenblätter/<id Name>/)
  // datenblatt.json (Ergebnisse ohne Dateien) und die Originale; andere Geräte übernehmen beides beim Abgleich (abgleichen()).
  const TEIL_BEREICH = 'Eigene Datenblätter';
  const ordnerName = d => (d.id + ' ' + (stoffVon(d).name || d.name || '')).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90);
  const geraetName = () => istIphone() ? 'iPhone/iPad' : (ad() && ad().art === 'web') ? 'Browser' : 'Programm';
  const datenOhneDateien = d => ({ format: 'gsz-sdb-1', id: d.id, zeit: d.zeit, name: d.name, dateien: d.dateien.map(f => ({ name: f.name, typ: f.typ, groesse: f.groesse })),
    text: d.text || '', textArt: d.textArt || '', ocr: d.ocr || null, claude: d.claude || null, claudeVon: d.claudeVon || '', claudeZeit: d.claudeZeit || '',
    geteiltVon: geraetName(), geteiltAm: new Date().toISOString() });
  async function teilen(id, { nurDaten = false } = {}) {
    const a = ad();
    if (!a || !a.ablegen || !a.verbunden() || navigator.onLine === false) return false;
    const d = await hole(id);
    if (!d || d.status === 'liest') return false;
    const ordner = (d.geteilt && d.geteilt.ordner) || ordnerName(d);
    const liste = [{ name: 'datenblatt.json', blob: new Blob([JSON.stringify(datenOhneDateien(d), null, 1)], { type: 'application/json' }) }];
    if (!nurDaten && !(d.geteilt && d.geteilt.dateien)) for (const f of d.dateien) if (f.blob) liste.push({ name: String(f.name).replace(/[\/\\]/g, '-'), blob: f.blob });
    try { await a.ablegen(TEIL_BEREICH, ordner, liste); } catch { return false; }
    const x = await hole(id);
    if (x) { x.geteilt = { ...(x.geteilt || {}), ordner, am: new Date().toISOString(), dateien: true }; await speichern(x); }
    return true;
  }
  // Geteilte Datenblätter der anderen Geräte übernehmen bzw. ihre neueren Ergebnisse (Claude) einspielen → Anzahl Änderungen
  let abgleichLaeuft = null;
  function abgleichen() {
    if (abgleichLaeuft) return abgleichLaeuft;
    abgleichLaeuft = (async () => {
      const a = ad();
      if (!a || !a.verbunden() || !a.datei) return 0;
      const re = /^Eigene Datenblätter\/([^/]+)\/datenblatt\.json$/i;
      const jsons = (E.dateien || []).filter(f => !f.ordner && re.test(String(f.pfad).normalize('NFC')));
      if (!jsons.length) return 0;
      const lokal = new Map((await SP.alle('sdb').catch(() => [])).map(x => [String(x.schluessel), x.wert]));
      const ausgeblendet = new Set((await SP.hole('meta', 'sdb-ausgeblendet').catch(() => null)) || []);
      let n = 0;
      for (const f of jsons) {
        const ordner = re.exec(String(f.pfad).normalize('NFC'))[1], id = ordner.split(' ')[0];
        const stand = String(f.rev || f.geaendert || f.groesse || '');
        const l = lokal.get(id);
        if (ausgeblendet.has(id) || (l && l.geteilt && l.geteilt.stand === stand)) continue;
        try {
          const j = JSON.parse(await (await a.datei(f.pfad)).text());
          if (!j || j.format !== 'gsz-sdb-1' || String(j.id) !== id) continue;
          if (l) {
            let neu = false;
            // Ergebnis eines anderen Geräts nur, wenn es nach der letzten Änderung auf diesem Gerät geteilt wurde
            const eigen = String(l.geaendert || l.claudeZeit || l.textZeit || '');
            if (j.claude && (!l.claude || String(j.geteiltAm || '') > eigen)) { l.claude = j.claude; l.claudeVon = j.claudeVon; l.claudeZeit = j.claudeZeit; neu = true; }
            if (!l.ocr && j.ocr) { l.ocr = j.ocr; neu = true; }
            l.geteilt = { ...(l.geteilt || {}), ordner, stand, dateien: true };
            await speichern(l); if (neu) n++;
          } else {
            await speichern({ ...j, status: 'gelesen', auftrag: null, fehler: '', fremd: true,
              dateien: (j.dateien || []).map(x => ({ ...x, pfad: `Eigene Datenblätter/${ordner}/${String(x.name).replace(/[\/\\]/g, '-')}` })),
              geteilt: { ordner, stand, dateien: true } });
            n++;
          }
        } catch { /* beim nächsten Abgleich */ }
      }
      return n;
    })();
    abgleichLaeuft.finally(() => { abgleichLaeuft = null; });
    return abgleichLaeuft;
  }
  // Dateien mit Inhalt (geteilte Datenblätter anderer Geräte: aus der Dropbox laden)
  async function mitInhalt(d) {
    const a = ad();
    return Promise.all(d.dateien.map(async f => f.blob ? f : { ...f, blob: await a.datei(f.pfad) }));
  }

  // ---------------------------------------------------------------- Ablauf
  async function verarbeiten(id) {
    const d = await hole(id);
    if (!d) return;
    // 1. Auftrag für den Mac-Helfer (Bilder verkleinert, PDFs unverändert), sofern mit Dropbox verbunden
    auftragAblegen(d).catch(() => {});
    // 2. Text auf dem Gerät lesen und auswerten
    await textLesen(id);
  }
  // Texterkennung auf dem Gerät (PDF-Textebene bzw. Texterkennung der Bilder) – auch einzeln über „Mit Texterkennung lesen“
  async function textLesen(id) {
    if (fortschritt.has(id)) return;                                     // läuft schon
    const d = await hole(id);
    if (!d) return;
    try {
      fortschritt.set(id, { text: 'Text wird gelesen …', anteil: 0 }); melden(id, true);
      const r = await window.GSZOcr.textAus(await mitInhalt(d), (text, anteil) => { fortschritt.set(id, { text, anteil }); melden(id, true); });
      const x = await hole(id);
      x.text = r.text; x.textArt = r.art; x.textZeit = new Date().toISOString();
      x.ocr = window.GSZSdbParser ? GSZSdbParser.sdbLesen(r.text, { dateiname: d.name }) : S.normalisieren({ quelle: 'sdb', quelleText: 'Sicherheitsdatenblatt – Texterkennung' });
      x.status = 'gelesen'; x.fehler = ''; x.geaendert = new Date().toISOString();
      await speichern(x);
      setTimeout(() => teilen(id, { nurDaten: !!(x.geteilt && x.geteilt.dateien) }), 0);
    } catch (e) {
      const x = await hole(id);
      x.status = 'fehler'; x.fehler = e.message;
      await speichern(x);
    } finally { fortschritt.delete(id); melden(id); }
  }
  // Auftrag für Claude in den App-Ordner (Auswertung/<Kennung>/) – der Mac-Helfer holt ihn ab. Erneut: eigene Kennung <id>-2, -3 …
  async function auftragAblegen(d, { erneut = false } = {}) {
    const a = ad();
    if (!a || !a.auftragAblegen || !a.verbunden()) throw new Error('Dafür braucht die App die Verbindung zum Dropbox-App-Ordner.');
    if (navigator.onLine === false) throw new Error('Ohne Netz nicht möglich.');
    const nummer = erneut ? ((d.auftrag && d.auftrag.nummer) || 1) + 1 : 1;
    const kennung = nummer > 1 ? `${d.id}-${nummer}` : d.id;
    const dateien = [];
    let n = 0;
    for (const f of await mitInhalt(d)) {
      n++;
      if (/pdf/i.test(f.typ) || /\.pdf$/i.test(f.name)) { if (f.blob.size < 25 * 1048576) dateien.push({ name: `datenblatt-${n}.pdf`, blob: f.blob }); }
      else { try { dateien.push({ name: `seite-${String(n).padStart(2, '0')}.jpg`, blob: await window.GSZOcr.bildVerkleinern(f.blob) }); } catch { /* Bild unlesbar */ } }
    }
    if (!dateien.length) throw new Error('Keine Datei, die Claude lesen kann.');
    await a.auftragAblegen(kennung, dateien, { format: 'gsz-auftrag-1', art: 'sdb', id: kennung, erstellt: new Date().toISOString(),
      geraet: `${istIphone() ? 'iPhone' : a.art === 'web' ? 'Browser' : 'Programm'} · Gefahrstoffzug-App`, dateien: dateien.map(x => x.name) });
    const x = await hole(d.id);
    x.auftrag = { id: kennung, nummer, abgelegt: new Date().toISOString(), fehler: '', erledigt: null };
    await speichern(x); melden(d.id);
  }
  // Ergebnis abholen (Mac-Helfer: ergebnis.json, Kurzbefehl: antwort-iphone.txt)
  async function ergebnisHolen(id) {
    const a = ad();
    if (!a || !a.auftragErgebnis) return false;
    const x0 = await hole(id);
    if (!x0) return false;
    const offen = auftragOffen(x0);
    if (!offen && x0.claude) return false;                                // nichts angefragt
    let r;
    try { r = await a.auftragErgebnis(offen ? x0.auftrag.id || id : id); } catch { return false; }
    if (!r) return false;
    const x = await hole(id);
    if (!x) return false;
    const jetzt = new Date().toISOString();
    if (offen && r.ergebnis && r.ergebnis.stoff) {
      x.claude = S.normalisieren({ ...r.ergebnis.stoff, quelle: 'sdb', quelleText: 'Sicherheitsdatenblatt – ausgewertet von Claude (Mac)' });
      x.claudeVon = 'mac'; x.claudeZeit = r.ergebnis.zeit || jetzt;
      x.auftrag = { ...x.auftrag, erledigt: jetzt, fehler: '' };
    } else if (offen && r.ergebnis && r.ergebnis.fehler) {
      x.auftrag = { ...x.auftrag, erledigt: jetzt, fehler: 'Claude (Mac): ' + r.ergebnis.fehler };
    } else if (r.antwortIphone && !x.claude) {
      // die Antwort der Claude-App erledigt auch einen offenen Auftrag an den Mac
      try { x.claude = S.antwortLesen(r.antwortIphone, 'Sicherheitsdatenblatt – ausgewertet von Claude (iPhone)'); x.claudeVon = 'iphone'; x.claudeZeit = jetzt;
            if (x.auftrag) x.auftrag = { ...x.auftrag, erledigt: jetzt, fehler: '' }; }
      catch (e) { x.auftrag = { ...(x.auftrag || {}), fehler: 'Antwort von Claude (iPhone) nicht lesbar: ' + e.message }; }
    } else return false;
    x.geaendert = new Date().toISOString();
    await speichern(x); melden(id);
    if (x.claude) setTimeout(() => teilen(id, { nurDaten: true }), 0);
    return true;
  }
  async function antwortUebernehmen(id, text) {
    const x = await hole(id);
    x.claude = S.antwortLesen(text, 'Sicherheitsdatenblatt – ausgewertet von Claude (iPhone)');
    x.claudeVon = 'iphone'; x.claudeZeit = new Date().toISOString();
    if (x.auftrag) x.auftrag = { ...x.auftrag, erledigt: x.claudeZeit, fehler: '' };
    x.geaendert = new Date().toISOString();
    await speichern(x); melden(id);
    setTimeout(() => teilen(id, { nurDaten: true }), 0);
  }
  // Text für die Claude-App: die einsatzwichtigen Abschnitte (Kurzbefehl-Links bleiben handlich)
  function anfrageFuer(d) {
    let text = d.text || '';
    const P = window.GSZSdbParser;
    if (P && P.abschnitteTeilen) {
      try {
        const ab = P.abschnitteTeilen(text);
        const teile = [1, 2, 3, 4, 5, 6, 8, 9, 10, 14, 15].map(n => ab[n] ? `ABSCHNITT ${n}\n${ab[n]}` : '').filter(Boolean);
        if (teile.join('').length > 400) text = teile.join('\n\n');
      } catch { /* ganzer Text */ }
    }
    if (text.length > 24000) text = text.slice(0, 24000);
    return S.anfrageText(text, { id: d.id, dateiname: d.name });
  }
  const kurzbefehlLink = eingabe => `shortcuts://run-shortcut?name=${encodeURIComponent(KURZBEFEHL)}&input=text&text=${encodeURIComponent(eingabe)}`;

  // ---------------------------------------------------------------- Importieren: Dateien wählen → gleich auswerten
  async function importieren(liste) {
    liste = [...(liste || [])].filter(f => f && f.size);
    if (!liste.length) return null;
    const id = neueId();
    const dateien = liste.map((f, i) => ({ name: f.name || `Seite ${i + 1}.jpg`, typ: f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg'), blob: f, groesse: f.size }));
    const d = { id, zeit: new Date().toISOString(), name: dateien[0].name, status: 'liest', dateien, text: '', ocr: null, claude: null, auftrag: null, fehler: '' };
    try { await speichern(d); } catch (e) { meldung('Speichern auf dem Gerät nicht möglich: ' + e.message, 8000); return null; }
    GSZ.zeige('sdb/' + id, GSZ.aktuell.ansicht === 'sdb-neu');
    verarbeiten(id);
    return id;
  }
  const nEl = E.ansichtElement('sdbneu');
  function neuZeichnen() {
    nEl.innerHTML = '';
    nEl.appendChild(E.kopf({ titel: 'Datenblatt importieren', unter: 'Einsatz', eltern: 'einsatz' }));
    const k = document.createElement('section');
    k.className = 'kachel ez-karte';
    k.innerHTML = `<label class="knopf ez-import sdb-los">${I.blatt}<span>Bild oder PDF wählen</span>
        <input type="file" id="sdb-dateien" accept="image/*,application/pdf,.pdf" multiple aria-label="Sicherheitsdatenblatt importieren (Bild oder PDF)"></label>
      <div class="ez-hinweis" style="margin-top:.8rem">Das Sicherheitsdatenblatt als PDF wählen oder die Seiten als Bilder (am iPhone auch direkt fotografieren).
        Die App liest Kennwerte, GHS, UN-Nummer, Löschmittel und PSA aus und zeigt sie wie einen GESTIS-Stoff an.</div>
      <div class="ez-klein" style="margin-top:.6rem">Bleibt auf diesem Gerät gespeichert. Mit Dropbox-Verbindung wertet zusätzlich Claude über deinen Mac aus.</div>`;
    nEl.appendChild(k);
    const inp = k.querySelector('#sdb-dateien');
    inp.addEventListener('change', () => { const l = [...inp.files]; inp.value = ''; importieren(l); });
  }
  GSZ.ansicht('sdb-neu', { element: nEl, titel: () => 'Datenblatt importieren', anzeigen() { neuZeichnen(); } });

  // ---------------------------------------------------------------- Ansicht: Ergebnis (Einsatzbildschirm)
  const rEl = E.ansichtElement('sdbansicht');
  let aktuell = null, abfrage = null, helferStand = null, helferZeit = 0, iphoneLink = '';
  const helferLebt = () => helferStand && helferStand.zeit && Date.now() - Date.parse(helferStand.zeit) < 3 * 60 * 1000;
  async function helferPruefen(abstand = 30 * 1000) {
    if (Date.now() - helferZeit < abstand) return;
    helferZeit = Date.now();
    try { helferStand = ad() && ad().helfer ? await ad().helfer() : null; } catch { helferStand = null; }
  }
  const uhr = t => { const d = new Date(t); return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const balken = anteil => anteil === 'unbestimmt' ? '<div class="sdb-balken unbestimmt"><i></i></div>'
    : typeof anteil === 'number' ? `<div class="sdb-balken" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(anteil * 100)}"><i style="width:${(anteil * 100).toFixed(1)}%"></i></div>` : '';
  // Zustand der Auswertung durch Claude: aus dem Auftrag und dem Lebenszeichen des Mac-Helfers (Auswertung/mac-helfer.json)
  const apiLauf = new Map();                   // id → { text, anteil }: Auswertung über die Claude-API läuft
  function claudeZustand(d) {
    if (apiLauf.has(d.id)) { const f = apiLauf.get(d.id); return { text: f.text, anteil: f.anteil }; }
    const a = ad(), offen = auftragOffen(d);
    const verbunden = !!(a && a.auftragAblegen && a.verbunden && a.verbunden());
    if (offen) {
      const w = helferStand && helferStand.arbeit, kennung = d.auftrag.id || d.id;
      if (w && w.art === 'sdb' && w.id === kennung) {
        const sek = Math.max(0, (Date.now() - Date.parse(w.seit)) / 1000);
        return { text: `Claude wertet aus … ${Math.min(95, Math.round(sek / 45 * 100))} % · seit ${uhr(w.seit)}`, anteil: Math.min(.95, sek / 45) };
      }
      if (!helferLebt()) return { text: 'Wartet auf den Mac-Helfer – Claude prüft nach, sobald dein Mac wieder erreichbar ist.', anteil: null, ohneMac: true };
      if (helferStand.pause_bis && Date.parse(helferStand.pause_bis) > Date.now()) return { text: `Pause bis ${uhr(helferStand.pause_bis)} – das Kontingent des Claude-Abos ist gerade erschöpft.`, anteil: null };
      if (w) return { text: `In der Warteschlange – der Mac-Helfer wertet gerade ${w.art === 'sdb' ? 'ein anderes Datenblatt' : `„${w.ordner || ''}“`} aus.`, anteil: 'unbestimmt' };
      return { text: 'In der Warteschlange – Claude beginnt in Kürze.', anteil: 'unbestimmt' };
    }
    if (d.claude) return { text: `✓ Von Claude ausgewertet (${vonText(d.claudeVon)})${d.claudeZeit ? ', ' + datumZeit(d.claudeZeit) : ''}`, klasse: 'fertig' };
    if (d.auftrag && d.auftrag.fehler) return { text: d.auftrag.fehler, klasse: 'fehler' };
    if (!verbunden) return { text: 'Braucht die Verbindung zum Dropbox-App-Ordner (⚙ › Mit Dropbox verbinden).', anteil: null, ohneMac: true };
    if (navigator.onLine === false) return { text: 'Ohne Netz – mit Netz prüft Claude nach.', anteil: null, ohneMac: true };
    return { text: 'Noch nicht ausgewertet.', anteil: null };
  }
  function auswertungHtml(d) {
    const a = ad(), offen = auftragOffen(d), f = fortschritt.get(d.id);
    const cl = claudeZustand(d);
    const kannClaude = !!(a && a.auftragAblegen && a.verbunden && a.verbunden()) && navigator.onLine !== false && !offen;
    // ohne Mac: Claude-App auf dem iPhone (Kurzbefehl) bzw. Anfrage kopieren
    const knoepfe = [];
    if (istIphone() && d.text) {
      knoepfe.push(`<a class="knopf" id="sdb-iphone" ${iphoneLink ? `href="${esc(iphoneLink)}"` : 'aria-disabled="true"'}>${I.neu}Mit Claude auf diesem iPhone auswerten</a>`);
      knoepfe.push('<button class="knopf" id="sdb-einfuegen">Antwort aus der Zwischenablage übernehmen</button>');
    }
    if (d.text) knoepfe.push('<button class="knopf" id="sdb-kopieren">Anfrage für Claude kopieren</button>');
    // Claude-API mit eigenem Schlüssel (liest PDF und Fotos selbst – wie der Mac-Helfer)
    if (window.GSZClaude) knoepfe.unshift(GSZClaude.bereit() ? `<button class="knopf" id="sdb-api">${I.neu}Mit Claude-API auswerten (ohne Mac)</button>`
      : '<a class="knopf" href="#claude">Claude ohne Mac einrichten (API-Schlüssel)</a>');
    const ohneMac = knoepfe.length && (!d.claude || offen) && !(offen && helferLebt()) ? `<details class="sdb-mehr"><summary>Ohne Mac mit Claude auswerten</summary><div class="sdb-zeile">${knoepfe.join('')}</div>
      ${istIphone() ? '<div class="ez-klein" style="margin-top:.4rem">Braucht einmalig den Kurzbefehl „GSZ Claude“: <a href="GSZ-Claude.shortcut" download="GSZ Claude.shortcut">hier laden</a>.</div>' : ''}</details>` : '';
    const tx = f ? { text: f.text, anteil: f.anteil || 0 }
      : d.status === 'fehler' ? { text: 'Text nicht lesbar: ' + d.fehler, klasse: 'fehler' }
      : d.ocr ? { text: `✓ Gelesen${d.textArt === 'pdf-text' ? ' (Textebene des PDFs)' : d.textArt === 'ocr' ? ' (Texterkennung der Bilder)' : ''}${d.textZeit ? ', ' + datumZeit(d.textZeit) : ''}`, klasse: 'fertig' }
      : { text: 'Noch nicht gelesen.' };
    return `<div class="sdb-auswertung" id="sdb-auswertung">
      <div class="sdb-weg" id="sdb-weg-claude"><div class="kopf"><b>Claude</b><small>über den Mac-Helfer – genauer</small></div>
        <div class="status ${cl.klasse || ''}">${esc(cl.text)}</div>${balken(cl.anteil)}
        <button type="button" class="knopf" id="sdb-claude"${kannClaude ? '' : ' disabled'}>${I.neu}${offen ? 'Claude ist angefragt' : d.claude || (d.auftrag && d.auftrag.abgelegt) ? 'Erneut mit Claude auswerten' : 'Mit Claude auswerten'}</button>${ohneMac}</div>
      <div class="sdb-weg" id="sdb-weg-ocr"><div class="kopf"><b>Texterkennung</b><small>auf diesem Gerät – auch ohne Netz</small></div>
        <div class="status ${tx.klasse || ''}">${esc(tx.text)}</div>${balken(tx.anteil)}
        <button type="button" class="knopf" id="sdb-ocr"${f ? ' disabled' : ''}>${I.blatt}${d.ocr || d.status === 'fehler' ? 'Erneut mit Texterkennung lesen' : 'Mit Texterkennung lesen'}</button></div>
    </div>`;
  }
  function bannerHtml(d) {
    const s = stoffVon(d);
    const cas = s.cas[0] || (s.bestandteile.find(b => b.cas) || {}).cas;
    return auswertungHtml(d) + `<div class="sdb-zeile"><a class="knopf" href="#sdb/${esc(d.id)}/original">${I.blatt}Original ansehen</a>
      ${cas ? `<button class="knopf" data-gestis="${esc(cas)}">${I.suche}GESTIS zu CAS ${esc(cas)}</button>` : ''}
      <button class="knopf" id="sdb-loeschen">Löschen</button></div>`;
  }
  // nur die Kästen neu zeichnen (Fortschritt), nicht den ganzen Einsatzbildschirm
  async function auswertungAktualisieren(id) {
    const box = rEl.querySelector('#sdb-auswertung');
    if (!box) return;
    const d = await hole(id);
    if (!d || !box.isConnected) return;
    const t = document.createElement('div');
    t.innerHTML = auswertungHtml(d);
    const neu = t.firstElementChild;
    box.replaceWith(neu);
    auswertungBedienung(neu, d);
  }
  async function zeichnen(id, teil) {
    const d = await hole(id);
    if (!d) { rEl.innerHTML = ''; rEl.appendChild(E.kopf({ titel: 'Datenblatt nicht gefunden', eltern: 'einsatz' })); return; }
    if (E.zoomErlauben) E.zoomErlauben(teil === 'original');          // Finger-Zoom nur im Original (Dokument)
    if (teil === 'original') {
      rEl.classList.remove('mit-leiste');
      rEl.innerHTML = '';
      rEl.appendChild(E.kopf({ titel: 'Original', unter: esc(stoffVon(d).name), eltern: 'sdb/' + id }));
      const liste = document.createElement('div');
      liste.style.cssText = 'display:flex;flex-direction:column;gap:.8rem';
      rEl.appendChild(liste);
      for (const f of d.dateien) { const box = document.createElement('div'); liste.appendChild(box); await E.dateiZeigen(box, { name: f.name, blob: f.blob, pfad: f.blob ? undefined : f.pfad }); }
      return;
    }
    const s = stoffVon(d);
    E.stoffSeite(s, '#sdb/' + id, teil || '', { eltern: 'einsatz', extra: bannerHtml(d), ziel: rEl, nachher: el => bedienung(el, d) });
  }
  function bedienung(el, d) {
    const g = el.querySelector('[data-gestis]');
    if (g) g.addEventListener('click', () => E.suchen(g.dataset.gestis));
    const w = el.querySelector('#sdb-loeschen');
    if (w) w.addEventListener('click', async () => {
      if (!confirm('Dieses Datenblatt löschen?')) return;
      const a = ad();
      if (d.geteilt && a && a.ablageLoeschen) {
        if (confirm('Auch für alle anderen Geräte löschen (aus der Dropbox)?\n\nOK = für alle löschen · Abbrechen = nur auf diesem Gerät ausblenden')) {
          try { await a.ablageLoeschen(TEIL_BEREICH, d.geteilt.ordner); } catch (e) { meldung('In der Dropbox nicht gelöscht: ' + e.message, 7000); }
        } else {
          const weg = (await SP.hole('meta', 'sdb-ausgeblendet').catch(() => null)) || [];
          await SP.setze('meta', 'sdb-ausgeblendet', [...new Set([...weg, d.id])]).catch(() => {});
        }
      }
      await SP.loesche('sdb', d.id); GSZ.zeige('einsatz', true);
    });
    const box = el.querySelector('#sdb-auswertung');
    if (box) auswertungBedienung(box, d);
  }
  function auswertungBedienung(el, d) {
    const api = el.querySelector('#sdb-api');
    if (api) api.addEventListener('click', async () => {
      if (apiLauf.has(d.id)) return;
      api.disabled = true;
      apiLauf.set(d.id, { text: 'Claude-API: wird vorbereitet …', anteil: 0.02 }); melden(d.id, true);
      try { await GSZClaude.sdbAuswerten(d.id, { fortschritt: (text, anteil) => { apiLauf.set(d.id, { text: 'Claude-API: ' + text, anteil }); melden(d.id, true); } }); }
      catch (e) { meldung('Claude-API: ' + e.message, 9000); }
      finally { apiLauf.delete(d.id); melden(d.id); }
    });
    const c = el.querySelector('#sdb-claude');
    if (c) c.addEventListener('click', async () => {
      c.disabled = true;
      try {
        const x = await hole(d.id);
        await auftragAblegen(x, { erneut: !!(x.auftrag && x.auftrag.abgelegt) });
        helferZeit = 0;
        meldung('An den Mac-Helfer übergeben – Claude wertet aus, sobald er dran ist. Der Balken zeigt den Stand.', 5500);
        auswertungAktualisieren(d.id);
      } catch (e) { c.disabled = false; meldung('Nicht möglich: ' + e.message, 7000); }
    });
    const o = el.querySelector('#sdb-ocr');
    if (o) o.addEventListener('click', () => { o.disabled = true; textLesen(d.id); });
    const k = el.querySelector('#sdb-kopieren');
    if (k) k.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(anfrageFuer(d)); meldung('Anfrage kopiert – in der Claude-App einfügen, Antwort kopieren und hier übernehmen.', 7000); }
      catch { meldung('Kopieren nicht möglich.'); }
    });
    const ei = el.querySelector('#sdb-einfuegen');
    if (ei) ei.addEventListener('click', async () => {
      try { await antwortUebernehmen(d.id, await navigator.clipboard.readText()); meldung('Claudes Antwort übernommen.'); }
      catch (e) { meldung('Übernehmen nicht möglich: ' + e.message, 7000); }
    });
    const ip = el.querySelector('#sdb-iphone');
    if (ip && !iphoneLink) linkVorbereiten(d).then(l => { if (l && ip.isConnected) { ip.href = l; ip.removeAttribute('aria-disabled'); } });
    if (ip) ip.addEventListener('click', e => { if (!ip.getAttribute('href')) { e.preventDefault(); meldung('Einen Moment – die Anfrage wird vorbereitet.'); } });
  }
  // Der Link muss fertig sein, bevor jemand tippt (Safari öffnet nichts, was erst nach einer Berechnung aufgerufen wird)
  async function linkVorbereiten(d) {
    let zugang = null;
    try { zugang = ad() && ad().iphoneZugang ? await ad().iphoneZugang(d.id) : null; } catch { zugang = null; }
    const eingabe = JSON.stringify({ format: 'gsz-claude-1', prompt: anfrageFuer(d), url: zugang ? zugang.url : '', auth: zugang ? zugang.auth : '', arg: zugang ? zugang.arg : '' });
    iphoneLink = kurzbefehlLink(eingabe);
    return iphoneLink;
  }
  // regelmäßig nach Claudes Ergebnis sehen, solange die Ansicht offen ist
  function abfrageStarten(id) {
    clearInterval(abfrage);
    const runde = async () => {
      if (document.hidden || !aktuell || aktuell.id !== id) return;
      const d = await hole(id);
      if (!d) { clearInterval(abfrage); return; }
      const offen = auftragOffen(d);
      await helferPruefen(offen ? 3500 : 30 * 1000);
      if (offen || (istIphone() && !d.claude)) { if (!(await ergebnisHolen(id)) && offen) auswertungAktualisieren(id); }
    };
    abfrage = setInterval(runde, 4000);
    runde();
  }
  GSZ.ansicht('sdb', {
    element: rEl, titel: () => 'Sicherheitsdatenblatt',
    async anzeigen(param) {
      const [id, teil = ''] = param.split('/');
      if (!aktuell || aktuell.id !== id) iphoneLink = '';
      aktuell = { id, teil };
      await helferPruefen();
      await zeichnen(id, teil);
      abfrageStarten(id);
    },
    verlassen() { aktuell = null; clearInterval(abfrage); if (E.zoomErlauben) E.zoomErlauben(false); },
  });
  // Fortschritt: nur die Kästen; neue Ergebnisse: ganzer Einsatzbildschirm
  beobachter.add((id, nurFortschritt) => { if (aktuell && aktuell.id === id && aktuell.teil !== 'original') { if (nurFortschritt) auswertungAktualisieren(id); else zeichnen(id, aktuell.teil); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && aktuell) ergebnisHolen(aktuell.id); });

  // Texterkennung einmal im Hintergrund laden (danach offline), wenn die App ruhig läuft und Netz da ist
  setTimeout(() => {
    try {
      if (navigator.onLine === false || localStorage.getItem('gsz-ocr-bereit') === '7' || !window.GSZOcr) return;
      if (/#test=|HeadlessChrome/.test(location.href + navigator.userAgent)) return;
      GSZOcr.vorbereiten().then(ok => { if (ok) { localStorage.setItem('gsz-ocr-bereit', '7'); GSZOcr.beenden(); } });
    } catch { /* später */ }
  }, 20000);

  window.GSZSdbImport = { statusText, verarbeiten, textLesen, auftragAblegen, auftragOffen, ergebnisHolen, antwortUebernehmen, anfrageFuer, importieren, teilen, abgleichen };
})();
