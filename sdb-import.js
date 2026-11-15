// Eigenes Sicherheitsdatenblatt einlesen (Foto, Bild, PDF, Kamera) – Einsatz-Teil der App „Gefahrstoffzug TE Miehlen“.
// Ablauf:
//   1. Dateien wählen bzw. Seiten fotografieren (#sdb-neu)
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
  .sdb-quellen { display: flex; gap: .5rem; flex-wrap: wrap; }
  .sdb-quellen label { cursor: pointer; }
  .sdb-quellen input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .sdb-seiten { display: grid; grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr)); gap: .55rem; margin-top: .8rem; }
  .sdb-seite { position: relative; border-radius: .5rem; overflow: hidden; background: #fff; aspect-ratio: 3 / 4; display: flex; align-items: center;
    justify-content: center; border: 1px solid var(--rand); color: #555; font-size: .75rem; text-align: center; }
  .sdb-seite img { width: 100%; height: 100%; object-fit: cover; }
  .sdb-seite button { position: absolute; top: .25rem; right: .25rem; width: 1.8rem; height: 1.8rem; border-radius: 50%; border: 0; background: rgba(0,0,0,.65);
    color: #fff; font-size: 1rem; cursor: pointer; }
  .sdb-seite span { position: absolute; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.55); color: #fff; font-size: .68rem; padding: .15rem .3rem; }
  .sdb-los { width: 100%; margin-top: .9rem; background: var(--akzent) !important; border-color: var(--akzent) !important; color: #fff !important;
    font-weight: 700; padding: .75rem 1rem !important; font-size: 1.05rem !important; }
  .sdb-los:disabled { opacity: .45; }
  .sdb-balken { height: .45rem; border-radius: .3rem; background: var(--surface2); border: 1px solid var(--line); overflow: hidden; margin-top: .45rem; }
  .sdb-balken i { display: block; height: 100%; background: var(--akzent); transition: width .3s; }
  .sdb-zeile { display: flex; gap: .45rem; flex-wrap: wrap; margin-top: .55rem; }`;
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
  const melden = id => { for (const f of beobachter) { try { f(id); } catch { /* weiter */ } } };

  function stoffVon(d) {
    const ocr = d.ocr ? S.normalisieren(d.ocr) : null, cl = d.claude ? S.normalisieren(d.claude) : null;
    const s = cl && ocr ? S.zusammenfuehren(cl, ocr) : cl || ocr || S.normalisieren({ quelle: 'sdb', quelleText: 'Sicherheitsdatenblatt', name: '' });
    if (!s.name) s.name = d.name.replace(/\.[^.]+$/, '') || 'Sicherheitsdatenblatt';
    s.id = d.id;
    return s;
  }
  function statusText(d) {
    if (d.claude) return `von Claude ausgewertet (${d.claudeVon === 'iphone' ? 'iPhone' : 'Mac'})`;
    if (d.status === 'liest') return 'wird gelesen …';
    if (d.status === 'fehler') return 'Fehler beim Lesen';
    return d.auftrag && d.auftrag.abgelegt ? 'Texterkennung · Claude ausstehend' : 'Texterkennung';
  }

  // ---------------------------------------------------------------- Ablauf
  async function verarbeiten(id) {
    const d = await hole(id);
    if (!d) return;
    // 1. Auftrag für den Mac-Helfer (Bilder verkleinert, PDFs unverändert), sofern mit Dropbox verbunden
    auftragAblegen(d).catch(() => {});
    // 2. Text auf dem Gerät lesen und auswerten
    try {
      fortschritt.set(id, { text: 'Text wird gelesen …', anteil: 0 }); melden(id);
      const r = await window.GSZOcr.textAus(d.dateien, (text, anteil) => { fortschritt.set(id, { text, anteil }); melden(id); });
      const x = await hole(id);
      x.text = r.text; x.textArt = r.art;
      x.ocr = window.GSZSdbParser ? GSZSdbParser.sdbLesen(r.text, { dateiname: d.name }) : S.normalisieren({ quelle: 'sdb', quelleText: 'Sicherheitsdatenblatt – Texterkennung' });
      x.status = 'gelesen';
      await speichern(x);
    } catch (e) {
      const x = await hole(id);
      x.status = 'fehler'; x.fehler = e.message;
      await speichern(x);
    } finally { fortschritt.delete(id); melden(id); }
  }
  async function auftragAblegen(d) {
    const a = ad();
    if (!a || !a.auftragAblegen || !a.verbunden() || navigator.onLine === false) return;
    const dateien = [];
    let n = 0;
    for (const f of d.dateien) {
      n++;
      if (/pdf/i.test(f.typ) || /\.pdf$/i.test(f.name)) { if (f.blob.size < 25 * 1048576) dateien.push({ name: `datenblatt-${n}.pdf`, blob: f.blob }); }
      else { try { dateien.push({ name: `seite-${String(n).padStart(2, '0')}.jpg`, blob: await window.GSZOcr.bildVerkleinern(f.blob) }); } catch { /* Bild unlesbar */ } }
    }
    if (!dateien.length) return;
    await a.auftragAblegen(d.id, dateien, { format: 'gsz-auftrag-1', art: 'sdb', id: d.id, erstellt: new Date().toISOString(),
      geraet: `${istIphone() ? 'iPhone' : a.art === 'web' ? 'Browser' : 'Programm'} · Gefahrstoffzug-App`, dateien: dateien.map(x => x.name) });
    const x = await hole(d.id);
    x.auftrag = { abgelegt: new Date().toISOString(), fehler: '' };
    await speichern(x); melden(d.id);
  }
  // Ergebnis abholen (Mac-Helfer: ergebnis.json, Kurzbefehl: antwort-iphone.txt)
  async function ergebnisHolen(id) {
    const a = ad();
    if (!a || !a.auftragErgebnis) return false;
    let r;
    try { r = await a.auftragErgebnis(id); } catch { return false; }
    if (!r) return false;
    const x = await hole(id);
    if (!x || x.claude) return false;
    if (r.ergebnis && r.ergebnis.stoff) {
      x.claude = S.normalisieren({ ...r.ergebnis.stoff, quelle: 'sdb', quelleText: 'Sicherheitsdatenblatt – ausgewertet von Claude (Mac)' });
      x.claudeVon = 'mac'; x.claudeZeit = r.ergebnis.zeit || new Date().toISOString();
    } else if (r.antwortIphone) {
      try { x.claude = S.antwortLesen(r.antwortIphone, 'Sicherheitsdatenblatt – ausgewertet von Claude (iPhone)'); x.claudeVon = 'iphone'; x.claudeZeit = new Date().toISOString(); }
      catch (e) { x.auftrag = { ...(x.auftrag || {}), fehler: 'Antwort von Claude (iPhone) nicht lesbar: ' + e.message }; }
    } else if (r.ergebnis && r.ergebnis.fehler) {
      x.auftrag = { ...(x.auftrag || {}), fehler: 'Claude (Mac): ' + r.ergebnis.fehler };
    } else return false;
    await speichern(x); melden(id);
    return true;
  }
  async function antwortUebernehmen(id, text) {
    const x = await hole(id);
    x.claude = S.antwortLesen(text, 'Sicherheitsdatenblatt – ausgewertet von Claude (iPhone)');
    x.claudeVon = 'iphone'; x.claudeZeit = new Date().toISOString();
    await speichern(x); melden(id);
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

  // ---------------------------------------------------------------- Ansicht: neues Datenblatt
  const nEl = E.ansichtElement('sdbneu');
  let auswahl = [];                 // [{ name, typ, blob, url }]
  function neuZeichnen() {
    nEl.innerHTML = '';
    nEl.appendChild(E.kopf({ titel: 'Sicherheitsdatenblatt einlesen', unter: 'Einsatz', eltern: 'einsatz' }));
    const k = document.createElement('section');
    k.className = 'kachel ez-karte';
    const iphone = istIphone();
    k.innerHTML = `<div class="ez-hinweis">Alle Seiten fotografieren (oder Bilder bzw. das PDF wählen). Die App liest Kennwerte, GHS, UN-Nummer, Löschmittel und PSA aus –
      sofort auf dem Gerät per Texterkennung und genauer mit Claude, sobald dein Mac oder die Claude-App auf dem iPhone antwortet.</div>
      <div class="sdb-quellen" style="margin-top:.8rem">
        ${iphone || 'mediaDevices' in navigator ? `<label class="knopf">${I.kamera}Seite fotografieren<input type="file" accept="image/*" capture="environment" id="sdb-kamera"></label>` : ''}
        <label class="knopf">${I.blatt}Bilder oder PDF wählen<input type="file" accept="image/*,application/pdf,.pdf" multiple id="sdb-dateien"></label>
      </div>
      <div class="sdb-seiten" id="sdb-seiten"></div>
      <button class="knopf sdb-los" id="sdb-los" ${auswahl.length ? '' : 'disabled'}>Auswerten</button>
      <div class="ez-klein" style="margin-top:.6rem">Das Datenblatt bleibt auf diesem Gerät gespeichert. Mit Dropbox-Verbindung geht es zur Auswertung zusätzlich in den
        App-Ordner (Auswertung) – nur dein Mac bzw. deine Claude-App lesen es.</div>`;
    nEl.appendChild(k);
    const seiten = k.querySelector('#sdb-seiten');
    const zeigen = () => {
      seiten.innerHTML = auswahl.map((a, i) => `<div class="sdb-seite">${a.url ? `<img src="${a.url}" alt="">` : `<b>PDF</b>`}<button data-weg="${i}" aria-label="entfernen">×</button>
        <span>${esc(a.name)}</span></div>`).join('');
      k.querySelector('#sdb-los').disabled = !auswahl.length;
    };
    zeigen();
    const nehmen = liste => {
      for (const f of liste) {
        const typ = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg');
        auswahl.push({ name: f.name || `Seite ${auswahl.length + 1}.jpg`, typ, blob: f, url: /^image\//.test(typ) ? URL.createObjectURL(f) : null });
      }
      zeigen();
    };
    for (const id of ['sdb-kamera', 'sdb-dateien']) { const inp = k.querySelector('#' + id); if (inp) inp.addEventListener('change', () => { nehmen([...inp.files]); inp.value = ''; }); }
    seiten.addEventListener('click', e => { const b = e.target.closest('[data-weg]'); if (!b) return; auswahl.splice(Number(b.dataset.weg), 1); zeigen(); });
    k.querySelector('#sdb-los').addEventListener('click', async () => {
      if (!auswahl.length) return;
      const id = neueId();
      const d = { id, zeit: new Date().toISOString(), name: auswahl[0].name, status: 'liest', dateien: auswahl.map(a => ({ name: a.name, typ: a.typ, blob: a.blob, groesse: a.blob.size })),
                  text: '', ocr: null, claude: null, auftrag: null, fehler: '' };
      try { await speichern(d); } catch (e) { meldung('Speichern auf dem Gerät nicht möglich: ' + e.message, 8000); return; }
      for (const a of auswahl) if (a.url) URL.revokeObjectURL(a.url);
      auswahl = [];
      GSZ.zeige('sdb/' + id, true);
      verarbeiten(id);
    });
  }
  GSZ.ansicht('sdb-neu', { element: nEl, titel: () => 'Sicherheitsdatenblatt einlesen', anzeigen() { neuZeichnen(); } });

  // ---------------------------------------------------------------- Ansicht: Ergebnis (Einsatzbildschirm)
  const rEl = E.ansichtElement('sdbansicht');
  let aktuell = null, abfrage = null, helferStand = null, helferZeit = 0, iphoneLink = '';
  const helferLebt = () => helferStand && helferStand.zeit && Date.now() - Date.parse(helferStand.zeit) < 3 * 60 * 1000;
  async function helferPruefen() {
    if (Date.now() - helferZeit < 30 * 1000) return;
    helferZeit = Date.now();
    try { helferStand = ad() && ad().helfer ? await ad().helfer() : null; } catch { helferStand = null; }
  }
  function bannerHtml(d) {
    const f = fortschritt.get(d.id);
    const teile = [];
    if (f) teile.push(`<div class="ez-warn blau"><b>${esc(f.text)}</b><div class="sdb-balken"><i style="width:${Math.round((f.anteil || 0) * 100)}%"></i></div>
      <div class="ez-klein" style="margin-top:.35rem">Die erste Auswertung erscheint gleich hier; Claude verbessert sie danach.</div></div>`);
    if (d.status === 'fehler') teile.push(`<div class="ez-warn rot">Text nicht lesbar: ${esc(d.fehler)}</div>`);
    const a = ad();
    if (d.claude) {
      teile.push(`<div class="ez-warn" style="border-left-color:var(--good);background:var(--good-t)">✓ Ausgewertet von Claude (${d.claudeVon === 'iphone' ? 'Claude-App auf dem iPhone' : 'Mac-Helfer'})` +
        `${d.claudeZeit ? ' am ' + esc(datumZeit(d.claudeZeit)) : ''}. Leere Angaben ergänzt die Texterkennung.</div>`);
    } else if (!f) {
      const mac = d.auftrag && d.auftrag.abgelegt;
      let t = '';
      if (mac && helferLebt()) t = 'Claude (Mac-Helfer) wertet das Datenblatt aus – meist in unter einer Minute. Bis dahin gilt die Texterkennung.';
      else if (mac) t = 'Der Mac-Helfer meldet sich gerade nicht (Mac aus oder ohne Netz). Bis er antwortet, gilt die Texterkennung.';
      else if (a && a.verbunden && !a.verbunden()) t = 'Ohne Dropbox-Verbindung geht das Datenblatt nicht an den Mac – angezeigt wird die Texterkennung.';
      else if (navigator.onLine === false) t = 'Ohne Netz: Ergebnis der Texterkennung. Mit Netz wertet Claude nach.';
      else t = 'Angezeigt wird die Texterkennung.';
      if (d.auftrag && d.auftrag.fehler) t += ' ' + d.auftrag.fehler;
      const knoepfe = [];
      if (istIphone() && d.text) {
        knoepfe.push(`<a class="knopf" id="sdb-iphone" ${iphoneLink ? `href="${esc(iphoneLink)}"` : 'aria-disabled="true"'}>${I.neu}Mit Claude auf diesem iPhone auswerten</a>`);
        knoepfe.push('<button class="knopf" id="sdb-einfuegen">Antwort aus der Zwischenablage übernehmen</button>');
      }
      if (d.text) knoepfe.push('<button class="knopf" id="sdb-kopieren">Anfrage für Claude kopieren</button>');
      teile.push(`<div class="ez-warn">${esc(t)}${knoepfe.length ? `<div class="sdb-zeile">${knoepfe.join('')}</div>` : ''}
        ${istIphone() ? '<div class="ez-klein" style="margin-top:.4rem">Fehlt der Kurzbefehl „GSZ Claude“? <a href="GSZ-Claude.shortcut" download="GSZ Claude.shortcut">Hier laden</a> (einmalig, braucht die Claude-App).</div>' : ''}</div>`);
    }
    const s = stoffVon(d);
    const cas = s.cas[0] || (s.bestandteile.find(b => b.cas) || {}).cas;
    teile.push(`<div class="sdb-zeile"><a class="knopf" href="#sdb/${esc(d.id)}/original">${I.blatt}Original ansehen</a>
      ${cas ? `<button class="knopf" data-gestis="${esc(cas)}">${I.suche}GESTIS zu CAS ${esc(cas)}</button>` : ''}
      <button class="knopf" id="sdb-loeschen">Löschen</button></div>`);
    return teile.join('');
  }
  async function zeichnen(id, teil) {
    const d = await hole(id);
    if (!d) { rEl.innerHTML = ''; rEl.appendChild(E.kopf({ titel: 'Datenblatt nicht gefunden', eltern: 'einsatz' })); return; }
    if (teil === 'original') {
      rEl.classList.remove('mit-leiste');
      rEl.innerHTML = '';
      rEl.appendChild(E.kopf({ titel: 'Original', unter: esc(stoffVon(d).name), eltern: 'sdb/' + id }));
      const liste = document.createElement('div');
      liste.style.cssText = 'display:flex;flex-direction:column;gap:.8rem';
      rEl.appendChild(liste);
      for (const f of d.dateien) { const box = document.createElement('div'); liste.appendChild(box); await E.dateiZeigen(box, { name: f.name, blob: f.blob }); }
      return;
    }
    const s = stoffVon(d);
    E.stoffSeite(s, '#sdb/' + id, teil || '', { eltern: 'einsatz', extra: bannerHtml(d), ziel: rEl, nachher: el => bedienung(el, d) });
  }
  function bedienung(el, d) {
    const g = el.querySelector('[data-gestis]');
    if (g) g.addEventListener('click', () => E.suchen(g.dataset.gestis));
    const w = el.querySelector('#sdb-loeschen');
    if (w) w.addEventListener('click', async () => { if (!confirm('Dieses Datenblatt vom Gerät löschen?')) return; await SP.loesche('sdb', d.id); GSZ.zeige('einsatz', true); });
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
      if (!d || d.claude) { clearInterval(abfrage); return; }
      await helferPruefen();
      if (d.auftrag && d.auftrag.abgelegt || istIphone()) await ergebnisHolen(id);
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
    verlassen() { aktuell = null; clearInterval(abfrage); },
  });
  beobachter.add(id => { if (aktuell && aktuell.id === id && aktuell.teil !== 'original') zeichnen(id, aktuell.teil); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && aktuell) ergebnisHolen(aktuell.id); });

  // Texterkennung einmal im Hintergrund laden (danach offline), wenn die App ruhig läuft und Netz da ist
  setTimeout(() => {
    try {
      if (navigator.onLine === false || localStorage.getItem('gsz-ocr-bereit') === '7' || !window.GSZOcr) return;
      if (/#test=|HeadlessChrome/.test(location.href + navigator.userAgent)) return;
      GSZOcr.vorbereiten().then(ok => { if (ok) { localStorage.setItem('gsz-ocr-bereit', '7'); GSZOcr.beenden(); } });
    } catch { /* später */ }
  }, 20000);

  window.GSZSdbImport = { statusText, verarbeiten, ergebnisHolen, antwortUebernehmen, anfrageFuer };
})();
