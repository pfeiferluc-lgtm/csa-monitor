// Einsatz-Teil der App „Gefahrstoffzug TE Miehlen“ (Programm und Web-App): Stoffsuche mit GESTIS-Einsatzbildschirm,
// Stoffdatenblatt, Beständigkeiten unserer Ausrüstung, PSA, Einsatz-Ordner mit Dateien (offline) und Beständigkeitslisten
// mit Gerätebildern. Eigene Sicherheitsdatenblätter liest sdb-import.js ein (gleicher Einsatzbildschirm).
// Daten kommen über GSZ.adapter.einsatz (web-start.js: Dropbox-App-Ordner; start.js/main.js: Dropbox-Ordner auf dem Rechner).
// Ansichten: #einsatz · #stoff/<zvg>[/datenblatt|bestaendigkeit|psa] · #sdb/<id>[/…] · #ordner/<pfad> · #datei/<pfad> · #geraet/<ordner>
'use strict';
(() => {
  const S = window.GSZStoffdaten, G = window.GSZGestis, B = window.GSZBestaendigkeit, SP = window.GSZSpeicher;
  const BL = 'Beständigkeitslisten';
  const ORDNER_REIHE = [BL, 'A-Lage', 'B-Lage', 'C-Lage', 'Führungsunterstützung', 'Messen', 'Probenahme'];

  const css = `
  .ez { --rund: .8rem; font-size: 16px; color: var(--ink); max-width: 62rem; margin: 0 auto; display: flex; flex-direction: column; gap: .8rem;
    padding: calc(.7rem + var(--frei-oben)) calc(.8rem + var(--sicher-rechts)) calc(1.4rem + var(--sicher-unten)) calc(.8rem + var(--sicher-links)); }
  .ez.mit-leiste { padding-bottom: calc(5.6rem + var(--sicher-unten)); }
  .ez .knopf { font-size: .95rem; padding: .45rem .75rem; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: .35rem; }
  .ez .knopf svg { width: 1.1em; height: 1.1em; flex: none; }
  .ez h2 { margin: 0 0 .55rem; font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; color: var(--ink2); }
  .ez-kopf { display: flex; align-items: center; gap: .7rem; padding: .3rem .7rem .3rem .45rem; }
  .ez-kopf img { height: 3.4rem; width: auto; aspect-ratio: 19 / 25; object-fit: cover; border-radius: .45rem; flex: none; }
  .ez-kopf .zur { flex: none; padding: .45rem .6rem; }
  .ez-titel { flex: 1; min-width: 0; }
  .ez-titel h1 { margin: 0; font-size: 1.35rem; line-height: 1.15; overflow-wrap: anywhere; -webkit-hyphens: auto; hyphens: auto; }
  .ez-titel div { color: var(--muted); font-size: .8rem; line-height: 1.3; overflow-wrap: anywhere; }
  .ez-karte { padding: .8rem .9rem .9rem; }
  .ez-hinweis { font-size: .85rem; color: var(--ink2); line-height: 1.4; }
  .ez-klein { font-size: .78rem; color: var(--muted); line-height: 1.35; }
  .ez-warn { padding: .7rem .85rem; border-left: .3rem solid var(--ser); background: var(--ser-t); border-radius: .55rem; font-size: .9rem; line-height: 1.4; }
  .ez-warn.rot { border-left-color: var(--crit); background: var(--crit-t); }
  .ez-warn.blau { border-left-color: var(--akzent); background: color-mix(in srgb, var(--akzent) 12%, var(--surface)); }
  .ez-warn .knopf { margin-top: .5rem; margin-right: .4rem; }
  /* Suche */
  .ez-suche form { display: flex; gap: .5rem; }
  .ez-suche input { flex: 1; min-width: 0; font: inherit; font-size: 18px; padding: .75rem .85rem; border-radius: .6rem; border: 2px solid var(--eingabe-rand);
    background: var(--eingabe); color: var(--ink); -webkit-appearance: none; appearance: none; margin: 0; }
  .ez-suche input:focus { outline: 2px solid var(--akzent); outline-offset: 1px; }
  .ez-suche .los { background: var(--akzent) !important; border-color: var(--akzent) !important; color: #fff !important; font-weight: 700; padding: .6rem 1rem !important; }
  .ez-art { font-size: .8rem; color: var(--muted); margin-top: .4rem; min-height: 1.1em; }
  .ez-chips { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .6rem; }
  .ez-chip { font: inherit; font-size: .82rem; padding: .35rem .65rem; border-radius: 1rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; text-decoration: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ez-aktionen { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .7rem; }
  .ez-treffer { list-style: none; margin: .6rem 0 0; padding: 0; display: flex; flex-direction: column; }
  .ez-treffer a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .2rem .6rem; padding: .6rem .5rem; border-bottom: 1px solid var(--line);
    color: var(--ink); text-decoration: none; border-radius: .4rem; }
  .ez-treffer a:hover { background: var(--surface2); }
  .ez-treffer b { font-weight: 600; overflow-wrap: anywhere; }
  .ez-treffer small { grid-column: 1; color: var(--muted); font-size: .78rem; }
  .ez-treffer .pfeil { grid-row: 1 / span 2; grid-column: 2; align-self: center; color: var(--muted); font-size: 1.3rem; }
  .ez-treffer .ok { color: var(--good); font-weight: 600; }
  /* Ordner */
  .ez-ordner { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .7rem; }
  .ez-ok { display: flex; flex-direction: column; gap: .35rem; padding: .9rem .85rem .8rem; border-radius: var(--rund); background: var(--surface);
    box-shadow: var(--schatten); color: var(--ink); text-decoration: none; border-top: .28rem solid var(--c, var(--akzent)); min-height: 6.4rem;
    -webkit-tap-highlight-color: transparent; }
  .ez-ok svg { width: 1.9rem; height: 1.9rem; color: var(--c, var(--akzent)); }
  .ez-ok b { font-size: 1rem; line-height: 1.2; -webkit-hyphens: auto; hyphens: auto; overflow-wrap: break-word; }
  .ez-ok small { color: var(--muted); font-size: .78rem; }
  .ez-status { font-size: .78rem; color: var(--muted); display: flex; gap: .4rem .8rem; flex-wrap: wrap; align-items: center; justify-content: center; text-align: center; }
  .ez-status .knopf { font-size: .8rem; padding: .3rem .6rem; }
  /* Dateiliste */
  .ez-dateien { list-style: none; margin: 0; padding: 0; }
  .ez-dateien a { display: grid; grid-template-columns: 2.2rem minmax(0, 1fr) auto; gap: .2rem .7rem; align-items: center; padding: .6rem .45rem;
    border-bottom: 1px solid var(--line); color: var(--ink); text-decoration: none; border-radius: .4rem; }
  .ez-dateien a:hover { background: var(--surface2); }
  .ez-dateien .typ { width: 2.2rem; height: 2.6rem; border-radius: .3rem; display: flex; align-items: center; justify-content: center; font-size: .62rem;
    font-weight: 800; color: #fff; background: var(--c, var(--muted)); letter-spacing: .02em; }
  .ez-dateien b { font-weight: 600; overflow-wrap: anywhere; line-height: 1.25; }
  .ez-dateien small { color: var(--muted); font-size: .75rem; display: block; margin-top: .1rem; }
  .ez-dateien .off { font-size: .72rem; color: var(--good); white-space: nowrap; }
  .ez-dateien .off.nein { color: var(--muted); }
  .ez-leer { color: var(--muted); padding: .8rem .2rem; font-size: .9rem; line-height: 1.45; }
  /* Einsatzbildschirm */
  .ez-oben { display: flex; gap: .9rem; align-items: flex-start; flex-wrap: wrap; }
  .ez-tafel { flex: none; }
  .ez-tafel svg { display: block; }
  .ez-symbole { display: flex; gap: .35rem; flex-wrap: wrap; align-items: center; }
  .ez-symbole figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: .15rem; width: 4.6rem; }
  .ez-symbole figcaption { font-size: .62rem; color: var(--ink2); text-align: center; line-height: 1.15; }
  .ez-symbole svg { display: block; }
  .ez-signal { display: inline-block; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: .25rem .6rem; border-radius: .4rem;
    color: #fff; background: var(--crit); font-size: .85rem; }
  .ez-signal.achtung { background: var(--ser); }
  .ez-kw { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .55rem; }
  .ez-kw div { background: var(--surface2); border: 1px solid var(--line); border-radius: .55rem; padding: .5rem .6rem; min-width: 0; }
  .ez-kw span { display: block; font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; overflow-wrap: anywhere; }
  .ez-hand { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .45rem; }
  .ez-hand li { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .5rem; padding: .45rem .55rem; border-radius: .5rem; background: var(--surface2);
    border: 1px solid var(--line); border-left: .3rem solid var(--c, var(--rand)); }
  .ez-hand b { font-weight: 600; overflow-wrap: anywhere; }
  .ez-hand small { flex-basis: 100%; color: var(--ink2); font-size: .78rem; line-height: 1.35; }
  .ez-kw b { display: block; font-size: 1.02rem; overflow-wrap: anywhere; line-height: 1.25; margin-top: .1rem; }
  .ez-kw small { display: block; font-size: .74rem; color: var(--ink2); margin-top: .15rem; line-height: 1.25; }
  .ez-kw .gross { grid-column: span 2; }
  .ez-kw .luft b { color: var(--c, var(--ink)); }
  .ez-zeilen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; }
  .ez-zeilen li { font-size: .92rem; line-height: 1.35; padding-left: 1.4rem; position: relative; }
  .ez-zeilen li::before { content: attr(data-z); position: absolute; left: 0; top: 0; width: 1.1rem; text-align: center; font-weight: 800; color: var(--c, var(--muted)); }
  .ez-zeilen.gut li { --c: var(--good); } .ez-zeilen.schlecht li { --c: var(--crit); }
  .ez-zweispaltig { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: .9rem; }
  .ez-codes { list-style: none; margin: 0; padding: 0; font-size: .88rem; line-height: 1.35; display: flex; flex-direction: column; gap: .25rem; }
  .ez-codes b { display: inline-block; min-width: 3.4rem; }
  .ez-transport { display: flex; gap: .5rem .9rem; flex-wrap: wrap; align-items: center; font-size: .92rem; }
  .ez-transport .kl { font-weight: 700; }
  .ez-unwahl { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .55rem; }
  .ez-unwahl button { font: inherit; font-size: .8rem; padding: .3rem .6rem; border-radius: 1rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; }
  .ez-unwahl button.an { background: var(--akzent); border-color: var(--akzent); color: #fff; font-weight: 600; }
  .ez-leiste { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: var(--surface); box-shadow: 0 -4px 16px rgba(0,0,0,.25);
    border-top: 1px solid var(--rand); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem;
    padding: .55rem max(calc(.7rem + var(--sicher-rechts)), calc((100vw - 62rem) / 2 + .7rem)) calc(.55rem + var(--sicher-unten))
      max(calc(.7rem + var(--sicher-links)), calc((100vw - 62rem) / 2 + .7rem)); }
  .ez-leiste a { display: flex; flex-direction: column; align-items: center; gap: .15rem; padding: .45rem .3rem; border-radius: .6rem; text-decoration: none;
    color: var(--ink); background: var(--surface2); border: 1px solid var(--rand); font-weight: 700; font-size: .88rem; text-align: center; line-height: 1.15; }
  .ez-leiste a svg { width: 1.35rem; height: 1.35rem; color: var(--akzent); }
  .ez-leiste a.an { background: var(--akzent); border-color: var(--akzent); color: #fff; }
  .ez-leiste a.an svg { color: #fff; }
  .ez-quelle { font-size: .75rem; color: var(--muted); line-height: 1.4; }
  .ez-quelle a { color: var(--ink2); }
  /* Datenblatt */
  .ez-db details { border-bottom: 1px solid var(--line); }
  .ez-db summary { cursor: pointer; padding: .55rem .2rem; font-weight: 600; font-size: .9rem; list-style: none; display: flex; gap: .5rem; align-items: baseline; }
  .ez-db summary::-webkit-details-marker { display: none; }
  .ez-db summary::before { content: "▸"; color: var(--muted); width: .8rem; flex: none; }
  .ez-db details[open] summary::before { content: "▾"; }
  .ez-db .text { white-space: pre-wrap; font-size: .88rem; line-height: 1.45; color: var(--ink2); padding: 0 .2rem .8rem 1.5rem; overflow-wrap: anywhere; }
  .ez-db h3 { margin: 1rem 0 .2rem; font-size: .76rem; letter-spacing: .06em; color: var(--akzent); text-transform: uppercase; }
  .ez-db mark { background: color-mix(in srgb, var(--warn) 55%, transparent); color: inherit; border-radius: .15rem; }
  .ez-db-suche { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px; padding: .55rem .7rem; border-radius: .5rem; border: 1px solid var(--rand);
    background: var(--surface2); color: var(--ink); margin-bottom: .4rem; -webkit-appearance: none; appearance: none; }
  /* Beständigkeit */
  .ez-stufe { display: inline-flex; align-items: center; gap: .35rem; font-weight: 700; font-size: .82rem; padding: .2rem .55rem; border-radius: 1rem;
    color: #fff; background: var(--c); white-space: nowrap; }
  .ez-stufe.gut { --c: var(--good); } .ez-stufe.bedingt { --c: #c48a00; } .ez-stufe.nicht { --c: var(--crit); }
  .ez-stufe.gemischt { --c: var(--ser); } .ez-stufe.unbekannt, .ez-stufe.keine, .ez-stufe.offen { --c: #6b7480; }
  .ez-geraete { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .55rem; }
  .ez-geraete > li > a, .ez-geraete > li > div { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr); gap: .3rem .75rem; padding: .6rem;
    border-radius: .65rem; background: var(--surface2); border: 1px solid var(--line); color: var(--ink); text-decoration: none; border-left: .3rem solid var(--c, var(--rand)); }
  .ez-bild { width: 4.2rem; height: 4.2rem; border-radius: .45rem; background: var(--surface); border: 1px solid var(--line); object-fit: contain; grid-row: span 3;
    display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: .65rem; text-align: center; overflow: hidden; }
  .ez-geraete b { font-weight: 600; overflow-wrap: anywhere; }
  .ez-geraete .zeile { display: flex; gap: .4rem; flex-wrap: wrap; align-items: center; font-size: .8rem; color: var(--ink2); }
  .ez-geraete .eintrag { font-size: .8rem; color: var(--ink2); line-height: 1.35; }
  .ez-geraete .eintrag i { color: var(--muted); font-style: normal; }
  .ez-ungeprueft { font-size: .68rem; font-weight: 700; color: var(--ser); border: 1px solid var(--ser); border-radius: .3rem; padding: 0 .3rem; white-space: nowrap; }
  .ez-gepr { font-size: .68rem; font-weight: 700; color: var(--good); border: 1px solid var(--good); border-radius: .3rem; padding: 0 .3rem; white-space: nowrap; }
  .ez-filter { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .6rem; }
  .ez-filter button { font: inherit; font-size: .8rem; padding: .3rem .6rem; border-radius: 1rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; }
  .ez-filter button.an { background: var(--akzent); border-color: var(--akzent); color: #fff; font-weight: 600; }
  .ez-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: .7rem; }
  .ez-raster a { display: flex; flex-direction: column; border-radius: .7rem; background: var(--surface); box-shadow: var(--schatten); overflow: hidden;
    color: var(--ink); text-decoration: none; }
  .ez-raster .foto { aspect-ratio: 4 / 3; background: #fff; display: flex; align-items: center; justify-content: center; color: #6b7480; font-size: .75rem; }
  .ez-raster .foto img { width: 100%; height: 100%; object-fit: contain; }
  .ez-raster .unter { padding: .5rem .6rem .6rem; display: flex; flex-direction: column; gap: .25rem; }
  .ez-raster b { font-size: .9rem; line-height: 1.2; overflow-wrap: anywhere; }
  .ez-raster small { font-size: .72rem; color: var(--muted); }
  .ez-tabelle-rahmen { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--line); border-radius: .5rem; }
  .ez-tabelle { border-collapse: collapse; font-size: .82rem; width: 100%; }
  .ez-tabelle th, .ez-tabelle td { padding: .35rem .45rem; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  .ez-tabelle th { position: sticky; top: 0; background: var(--kopf); font-size: .72rem; color: var(--ink2); white-space: nowrap; }
  .ez-tabelle td.w { text-align: center; font-weight: 700; white-space: nowrap; }
  .ez-tabelle td.gut { background: var(--good-t); color: var(--good); } .ez-tabelle td.bedingt { background: var(--warn-t); color: #b07c00; }
  .ez-tabelle td.nicht { background: var(--crit-t); color: var(--crit); }
  :root.hell .ez-tabelle td.bedingt { color: #8a6100; }
  .ez-tabelle td.w.rel { outline: 2px solid var(--akzent); outline-offset: -2px; }
  .ez-legende { display: flex; gap: .4rem .8rem; flex-wrap: wrap; font-size: .78rem; color: var(--ink2); margin: .4rem 0 .6rem; }
  /* Datei */
  .ez-datei-leiste { display: flex; gap: .45rem; flex-wrap: wrap; align-items: center; }
  .ez-seiten { display: flex; flex-direction: column; align-items: center; gap: .6rem; }
  .ez-seiten canvas { background: #fff; box-shadow: var(--schatten); max-width: none; display: block; }
  .ez-seite-platz { background: var(--surface2); display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: .8rem; }
  .ez-pdf-rahmen { overflow: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
  .ez-bildansicht { max-width: 100%; height: auto; display: block; margin: 0 auto; background: #fff; border-radius: .4rem; }
  .ez-bildansicht.voll { max-width: none; }
  .ez-text { white-space: pre-wrap; font-size: .85rem; line-height: 1.45; overflow-wrap: anywhere; }
  @media (max-width: 900px) { .ez-ordner { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ez-kw { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) {
    .ez { padding-left: calc(.5rem + var(--sicher-links)); padding-right: calc(.5rem + var(--sicher-rechts)); gap: .65rem; }
    .ez-kopf { gap: .5rem; padding: .3rem .5rem .3rem .4rem; }
    .ez-kopf img { height: 3.1rem; }
    .ez-titel h1 { font-size: 1.15rem; }
    .ez-karte { padding: .7rem .7rem .8rem; }
    .ez-zweispaltig { grid-template-columns: 1fr; }
    .ez-symbole figure { width: 4.1rem; }
    .ez-kopf .knopf .lang { display: none; }
  }
  @media (max-width: 380px) { .ez-ordner { gap: .5rem; } .ez-ok { padding: .75rem .65rem .7rem; } .ez-kw { gap: .4rem; } }`;
  const stil = document.createElement('style');
  stil.textContent = css;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Hilfen
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const datumZeit = d => { d = new Date(d); return isNaN(d) ? '' : `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const groesse = b => !b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace('.', ',') + ' MB';
  const zahl = t => S.zahlAus(t);
  const kodiere = p => encodeURIComponent(p);
  const dekodiere = p => { try { return decodeURIComponent(p); } catch { return p; } };
  const endung = n => (/\.([a-z0-9]+)$/i.exec(n || '') || [, ''])[1].toLowerCase();
  const TYP = { pdf: ['PDF', '#d64045'], jpg: ['JPG', '#2f8f5b'], jpeg: ['JPG', '#2f8f5b'], png: ['PNG', '#2f8f5b'], heic: ['HEIC', '#2f8f5b'], webp: ['BILD', '#2f8f5b'],
    gif: ['GIF', '#2f8f5b'], doc: ['DOC', '#2b6cc4'], docx: ['DOCX', '#2b6cc4'], xls: ['XLS', '#1f7a45'], xlsx: ['XLSX', '#1f7a45'], xlsm: ['XLSM', '#1f7a45'],
    ppt: ['PPT', '#c4572b'], pptx: ['PPTX', '#c4572b'], txt: ['TXT', '#6b7480'], md: ['TXT', '#6b7480'], url: ['LINK', '#6b7480'], zip: ['ZIP', '#6b7480'] };
  const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    txt: 'text/plain', md: 'text/plain', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  const istBild = n => /^(jpe?g|png|gif|webp)$/.test(endung(n));
  const istPdf = n => endung(n) === 'pdf';
  const istText = n => /^(txt|md|csv|url)$/.test(endung(n));
  const SVG = (inhalt, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
  const I = {
    haus: SVG('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
    zurueck: SVG('<path d="m15 18-6-6 6-6"/>'),
    suche: SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    blatt: SVG('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'),
    schild: SVG('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    psa: SVG('<path d="M8 4h8l1 4-2 1v11H9V9L7 8z"/><path d="M10 13h4"/>'),
    ordner: SVG('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    raute: SVG('<path d="M12 2 22 12 12 22 2 12z"/><path d="M12 8v5"/><circle cx="12" cy="16" r=".6" fill="currentColor"/>'),
    kamera: SVG('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    teilen: SVG('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>'),
    extern: SVG('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'),
    neu: SVG('<path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 10A8 8 0 0 0 6 6L4 10M4 14a8 8 0 0 0 14 4l2-4"/>'),
  };
  const ORDNER_STIL = { [BL]: ['var(--good)', I.schild], 'A-Lage': ['#e3b100', SVG('<circle cx="12" cy="12" r="2"/><path d="M12 4a8 8 0 0 1 6.9 4L14 11M12 4a8 8 0 0 0-6.9 4L10 11M5.1 16A8 8 0 0 0 12 20l0-6M18.9 16A8 8 0 0 1 12 20"/>')],
    'B-Lage': ['#c25bd6', SVG('<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>')],
    'C-Lage': ['var(--ser)', SVG('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>')],
    'Führungsunterstützung': ['var(--akzent)', SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')],
    Messen: ['#2bb3c0', SVG('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6v4H9zM9 15h.01M12 15h.01M15 15h.01M9 18h6"/>')],
    Probenahme: ['#7e8a96', SVG('<path d="M9 3h6M10 3v15a2 2 0 0 0 4 0V3"/><path d="M10 10h4"/>')] };
  const meldung = (text, dauer = 5000) => {
    let m = document.getElementById('ez-meldung');
    if (!m) { m = document.createElement('div'); m.id = 'ez-meldung'; m.className = 'gsz-ebene'; document.body.appendChild(m);
      m.style.cssText = 'position:fixed;left:50%;bottom:calc(5.8rem + var(--sicher-unten));transform:translateX(-50%);z-index:61;background:var(--surface2);' +
        'box-shadow:var(--schatten);border-left:4px solid var(--akzent);border-radius:.55rem;padding:.6rem .9rem;font-size:14px;color:var(--ink);max-width:92vw;'; }
    m.textContent = text; m.hidden = false;
    clearTimeout(meldung.t);
    if (dauer) meldung.t = setTimeout(() => { m.hidden = true; }, dauer);
  };
  // Kopfzeile einer Ansicht: logo (nur Einsatz-Start), Titel, Unterzeile, Zurück (Elternansicht), Haus, ◐, ⚙
  function kopf({ titel, unter = '', eltern = null, logo = false, haus = '#start' }) {
    const h = document.createElement('header');
    h.className = 'kachel ez-kopf';
    h.innerHTML = (eltern ? `<button class="knopf zur" data-zurueck="${esc(eltern)}" title="Zurück" aria-label="Zurück">${I.zurueck}</button>` : '') +
      (logo ? GSZ.logos() : '') +
      `<div class="ez-titel"><h1>${esc(titel)}</h1>${unter ? `<div>${unter}</div>` : ''}</div>` +
      `<a class="knopf" href="${haus}" title="Hauptmenü" aria-label="Hauptmenü">${I.haus}<span class="lang">Menü</span></a>` +
      `<button class="knopf modus" title="Hell / Dunkel">◐</button><button class="knopf einst" title="Einstellungen" hidden>⚙</button>`;
    GSZ.modusKnopf(h.querySelector('.modus'));
    GSZ.einstellungenKnopf(h.querySelector('.einst'));
    const z = h.querySelector('[data-zurueck]');
    if (z) z.addEventListener('click', () => GSZ.zurueck(z.dataset.zurueck));
    return h;
  }
  function ansichtElement(id) { const m = document.createElement('main'); m.id = id; m.className = 'gsz-ansicht ez'; return m; }
  const ad = () => (GSZ.adapter && GSZ.adapter.einsatz) || null;

  // ---------------------------------------------------------------- Dateien der Einsatz-Ordner
  let dateien = [], listeStand = null, listeQuelle = '', listeFehler = '', laedt = null;
  async function listeHolen(frisch = false) {
    const a = ad();
    if (!a) return;
    if (laedt) return laedt;
    laedt = (async () => {
      try {
        const r = await a.liste({ frisch });
        dateien = r.dateien || []; listeStand = r.stand || null; listeQuelle = r.quelle || ''; listeFehler = r.fehler || '';
        geraeteCache = null;
      } catch (e) { listeFehler = e.message; }
      finally { laedt = null; }
      neuZeichnen();
    })();
    return laedt;
  }
  const ordnerVon = pfad => pfad.includes('/') ? pfad.slice(0, pfad.lastIndexOf('/')) : '';
  // Inhalt eines Ordners: Unterordner und Dateien (verborgen: LIESMICH.txt, bestaendigkeit*.json, Punktdateien)
  function inhalt(ordner) {
    const pre = ordner ? ordner + '/' : '';
    const unter = new Map(), liste = [];
    for (const d of dateien) {
      if (!d.pfad.startsWith(pre)) continue;
      const rest = d.pfad.slice(pre.length);
      if (!rest) continue;
      const i = rest.indexOf('/');
      if (i >= 0) { const u = rest.slice(0, i); const e = unter.get(u) || { name: u, anzahl: 0 }; if (!d.ordner) e.anzahl++; unter.set(u, e); continue; }
      if (d.ordner) { if (!unter.has(rest)) unter.set(rest, { name: rest, anzahl: 0 }); continue; }
      if (/^(\.|liesmich\.txt$|bestaendigkeit.*\.json$)/i.test(rest)) continue;
      liste.push(d);
    }
    return { unter: [...unter.values()].sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true })),
             dateien: liste.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true })) };
  }
  const dateiInfo = pfad => dateien.find(d => d.pfad === pfad);
  const urlCache = new Map();
  async function objektUrl(pfad) {
    if (urlCache.has(pfad)) return urlCache.get(pfad);
    const blob = await ad().datei(pfad);
    const u = URL.createObjectURL(blob);
    urlCache.set(pfad, u);
    return u;
  }

  // ---------------------------------------------------------------- Beständigkeitslisten (Geräte)
  let geraeteCache = null;
  async function geraete() {
    if (geraeteCache) return geraeteCache;
    const { unter } = inhalt(BL);
    const liste = [];
    for (const u of unter) {
      const namen = dateien.filter(d => !d.ordner && ordnerVon(d.pfad) === BL + '/' + u.name).map(d => d.pfad.slice(BL.length + u.name.length + 2));
      const e = B.ordnerEinteilen(namen);
      const g = { ordner: u.name, ...B.ordnerName(u.name), foto: e.foto ? `${BL}/${u.name}/${e.foto}` : null,
                  quellen: e.quellen.map(q => `${BL}/${u.name}/${q}`), info: e.info ? `${BL}/${u.name}/${e.info}` : null, daten: null, fehler: '' };
      const json = namen.find(n => n.toLowerCase() === B.DATEI);
      if (json) {
        try { g.daten = B.pruefen(JSON.parse(await (await ad().datei(`${BL}/${u.name}/${json}`)).text())); }
        catch (f) { g.fehler = 'Geordnete Fassung nicht lesbar: ' + f.message; }
      }
      if (g.daten && g.daten.geraet && g.daten.geraet.name && !g.name) g.name = g.daten.geraet.name;
      liste.push(g);
    }
    geraeteCache = liste;
    return liste;
  }
  const kategorie = g => (g.daten && g.daten.geraet && g.daten.geraet.kategorie) || 'Sonstiges';
  const stufeBadge = (stufe, text) => `<span class="ez-stufe ${esc(stufe)}">${esc(text || B.STUFE_TEXT[stufe] || stufe)}</span>`;
  const STUFE_FARBE = { gut: 'var(--good)', bedingt: '#c48a00', nicht: 'var(--crit)', gemischt: 'var(--ser)' };
  const pruefBadge = g => !g.daten ? '' : g.daten.auswertung && g.daten.auswertung.geprueft
    ? `<span class="ez-gepr" title="geprüft${g.daten.auswertung.pruefung && g.daten.auswertung.pruefung.am ? ' am ' + esc(datumZeit(g.daten.auswertung.pruefung.am)) : ''}">geprüft</span>`
    : '<span class="ez-ungeprueft" title="automatisch ausgelesen – noch nicht mit dem Original abgeglichen">ungeprüft</span>';
  async function fotoEinsetzen(container) {
    for (const img of container.querySelectorAll('img[data-foto]')) {
      try { img.src = await objektUrl(img.dataset.foto); } catch { img.replaceWith(Object.assign(document.createElement('span'), { textContent: 'kein Bild' })); }
    }
  }

  // ---------------------------------------------------------------- Stoffe: Abruf, Zwischenspeicher, zuletzt geöffnet
  const stoffCache = new Map();            // zvg -> Stoffobjekt (diese Sitzung)
  const unWahl = new Map();                // zvg -> gewählte UN-Nummer (bei mehreren Transport-Einträgen)
  async function stoffHolen(zvg, { un } = {}) {
    if (stoffCache.has(zvg)) return stoffCache.get(zvg);
    let stoff = null, offline = false;
    try {
      const roh = await G.datenblatt(zvg);
      stoff = G.auswerten(roh, { un });
      stoff.abgerufen = new Date().toISOString();
      speicherStoff(stoff);
    } catch (e) {
      const alt = await SP.hole('stoffe', zvg).catch(() => null);
      if (!alt) throw e;
      stoff = alt.stoff; offline = true; stoff.abgerufen = alt.zeit;
    }
    stoff.offline = offline;
    stoffCache.set(zvg, stoff);
    return stoff;
  }
  async function speicherStoff(stoff) {
    try {
      await SP.setze('stoffe', stoff.zvg, { zvg: stoff.zvg, name: stoff.name, cas: stoff.cas, un: stoff.transporte.map(t => t.un),
        formel: stoff.formel, synonyme: stoff.synonyme, zeit: new Date().toISOString(), stoff });
      const alle = await SP.alle('stoffe');
      if (alle.length > 80) for (const x of alle.sort((a, b) => String(a.wert.zeit).localeCompare(String(b.wert.zeit))).slice(0, alle.length - 80)) await SP.loesche('stoffe', x.schluessel);
    } catch { /* Speicher voll oder privat: ohne Zwischenspeicher weiter */ }
  }
  async function zuletzt(n = 8) {
    try { return (await SP.alle('stoffe')).map(x => x.wert).sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))).slice(0, n); }
    catch { return []; }
  }
  // offline: in den gespeicherten Stoffen suchen
  async function offlineSuchen(q) {
    const a = G.anfrageArt(q);
    const n = B.grund(q);
    const alle = await zuletzt(200);
    return alle.filter(s => a && (a.art === 'cas' ? (s.cas || []).includes(a.wert) : a.art === 'un' ? (s.un || []).includes(a.wert)
      : a.art === 'formel' ? s.formel === a.wert : [s.name, ...(s.synonyme || [])].some(x => B.grund(x).includes(n))))
      .map(s => ({ zvg: s.zvg, name: s.name, cas: (s.cas || [])[0] || '', offline: true }));
  }

  // ---------------------------------------------------------------- Ansicht: Einsatz (Start)
  const eEl = ansichtElement('einsatz');
  let suchErgebnis = null, suchText = '';
  function einsatzAufbauen() {
    eEl.innerHTML = '';
    eEl.appendChild(kopf({ titel: 'Einsatz', unter: 'Gefahrstoffzug · Teileinheit Miehlen', logo: true }));
    const k = document.createElement('section');
    k.className = 'kachel ez-karte ez-suche';
    k.innerHTML = `<h2>Stoffsuche · GESTIS</h2>
      <form id="ez-form" role="search"><input type="search" id="ez-q" placeholder="Stoff, UN-Nr., CAS-Nr. oder Summenformel" enterkeyhint="search"
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Stoff suchen"><button class="knopf los" type="submit">${I.suche}<span>Suchen</span></button></form>
      <div class="ez-art" id="ez-art">z. B. „Ammoniak“, „1005“, „7664-41-7“ oder „NH3“</div>
      <div id="ez-erg"></div>
      <div class="ez-chips" id="ez-letzte"></div>
      <div class="ez-aktionen"><a class="knopf" href="#sdb-neu">${I.kamera}Eigenes Sicherheitsdatenblatt einlesen</a></div>
      <div id="ez-eigene"></div>`;
    eEl.appendChild(k);
    const o = document.createElement('section');
    o.innerHTML = '<nav class="ez-ordner" id="ez-ordner" aria-label="Einsatz-Ordner"></nav>';
    eEl.appendChild(o);
    const st = document.createElement('div');
    st.className = 'ez-status'; st.id = 'ez-status';
    eEl.appendChild(st);
    const f = k.querySelector('#ez-form'), q = k.querySelector('#ez-q');
    q.value = suchText;
    f.addEventListener('submit', e => { e.preventDefault(); q.blur(); suchen(q.value, true); });
    q.addEventListener('input', () => {
      suchText = q.value;
      const a = G.anfrageArt(q.value);
      k.querySelector('#ez-art').textContent = a ? `erkannt: ${G.ART_TEXT[a.art]}` + (a.art !== 'name' ? ` ${a.wert}` : '') : 'z. B. „Ammoniak“, „1005“, „7664-41-7“ oder „NH3“';
      clearTimeout(suchen.t);
      if (a && (a.art === 'name' ? q.value.trim().length >= 3 : a.art === 'formel' ? q.value.trim().length >= 2 : true)) suchen.t = setTimeout(() => suchen(q.value, false), 650);
    });
    if (suchErgebnis) trefferZeigen(suchErgebnis);
  }
  let suchNr = 0;
  async function suchen(text, gezielt) {
    const nr = ++suchNr;
    if (!eEl.firstChild) einsatzAufbauen();
    const feld = eEl.querySelector('#ez-q');
    if (feld && feld.value !== text) { feld.value = text; suchText = text; }
    const erg = eEl.querySelector('#ez-erg');
    const a = G.anfrageArt(text);
    if (!a) { erg.innerHTML = ''; suchErgebnis = null; return; }
    erg.innerHTML = '<div class="ez-leer">Suche in GESTIS …</div>';
    let r;
    try {
      r = await G.suchen(text);
      if (r.art === 'un' && r.treffer.length) {
        // UN-Nummern: GESTIS trifft auch gleichlautende ZVG-Nummern – im Datenblatt nachsehen (und dabei gleich zwischenspeichern)
        await Promise.all(r.treffer.slice(0, 5).map(async t => {
          try { const roh = await G.datenblatt(t.zvg); t.unOk = G.hatUn(roh, r.wert);
            if (t.unOk && !stoffCache.has(t.zvg)) { const s = G.auswerten(roh, { un: r.wert }); s.abgerufen = new Date().toISOString(); stoffCache.set(t.zvg, s); speicherStoff(s); } }
          catch { t.unOk = null; }
        }));
        r.treffer.sort((x, y) => (y.unOk === true) - (x.unOk === true));
        for (const t of r.treffer) if (t.unOk) unWahl.set(t.zvg, r.wert);
      }
    } catch (e) {
      const off = await offlineSuchen(text);
      r = { art: a.art, wert: a.wert, treffer: off, offline: true, fehler: e.message };
    }
    if (nr !== suchNr) return;
    suchErgebnis = r;
    // Eindeutige Nummer (UN/CAS) mit genau einem passenden Stoff: gleich öffnen
    const passend = r.art === 'un' ? r.treffer.filter(t => t.unOk) : r.art === 'cas' ? r.treffer : [];
    if (gezielt && passend.length === 1 && !r.offline) { GSZ.zeige('stoff/' + passend[0].zvg); return; }
    trefferZeigen(r);
  }
  function trefferZeigen(r) {
    const erg = eEl.querySelector('#ez-erg');
    if (!erg) return;
    if (!r.treffer.length) {
      erg.innerHTML = r.offline ? `<div class="ez-warn">Keine Verbindung zu GESTIS (${esc(r.fehler)}). Offline sind nur zuletzt geöffnete Stoffe abrufbar – dieser ist nicht dabei.</div>`
        : `<div class="ez-leer">Kein Treffer in GESTIS für ${esc(G.ART_TEXT[r.art])} „${esc(r.wert)}“.` +
          (r.art === 'un' ? ' Für manche UN-Nummern (z. B. Gemische wie 1965 Flüssiggas) gibt es kein GESTIS-Datenblatt – nach dem Stoffnamen suchen.' : '') + '</div>';
      return;
    }
    erg.innerHTML = (r.offline ? '<div class="ez-warn" style="margin-top:.6rem">Offline – Treffer aus den zuletzt geöffneten Stoffen.</div>' : '') +
      `<ul class="ez-treffer">${r.treffer.map(t => `<li><a href="#stoff/${esc(t.zvg)}"><b>${esc(t.name)}</b><span class="pfeil">›</span>
        <small>${t.cas ? 'CAS ' + esc(t.cas) : 'ohne CAS-Nr.'}${r.art === 'un' ? (t.unOk ? ` · <span class="ok">UN ${esc(r.wert)} ✓</span>` : t.unOk === false ? ' · Treffer über die GESTIS-Nr., nicht über die UN-Nr.' : '') : ''}</small></a></li>`).join('')}</ul>`;
  }
  async function letzteZeigen() {
    const el = eEl.querySelector('#ez-letzte');
    if (!el) return;
    const l = await zuletzt(10);
    el.innerHTML = l.length ? l.map(s => `<a class="ez-chip" href="#stoff/${esc(s.zvg)}" title="zuletzt geöffnet ${esc(datumZeit(s.zeit))} – auch offline">${esc(s.name)}</a>`).join('') : '';
  }
  async function eigeneZeigen() {
    const el = eEl.querySelector('#ez-eigene');
    if (!el) return;
    let l = [];
    try { l = (await SP.alle('sdb')).map(x => x.wert).sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))).slice(0, 6); } catch { /* ohne */ }
    el.innerHTML = l.length ? `<h2 style="margin-top:.9rem">Eigene Datenblätter</h2><ul class="ez-treffer">${l.map(d => `<li><a href="#sdb/${esc(d.id)}">
      <b>${esc((d.claude && d.claude.name) || (d.ocr && d.ocr.name) || d.name || 'Sicherheitsdatenblatt')}</b><span class="pfeil">›</span>
      <small>${esc(datumZeit(d.zeit))} · ${esc(window.GSZSdbImport ? GSZSdbImport.statusText(d) : '')}</small></a></li>`).join('')}</ul>` : '';
  }
  function ordnerZeigen() {
    const el = eEl.querySelector('#ez-ordner');
    if (!el) return;
    const { unter } = inhalt('');
    const namen = [...new Set([...ORDNER_REIHE, ...unter.map(u => u.name)])];
    const anzahl = n => { const u = unter.find(x => x.name === n); return u ? u.anzahl : null; };
    el.innerHTML = namen.map(n => {
      const [farbe, icon] = ORDNER_STIL[n] || ['var(--akzent)', I.ordner];
      const a = anzahl(n);
      const geraeteZahl = n === BL ? inhalt(BL).unter.length : 0;
      const unterText = n === BL ? (geraeteZahl ? `${geraeteZahl} Gerät${geraeteZahl === 1 ? '' : 'e'}` : 'noch leer')
        : !a ? (ad() && ad().verbunden() ? 'noch leer' : '–') : `${a} Datei${a === 1 ? '' : 'en'}`;
      const anzeige = esc(n).replace('Führungsunterstützung', 'Führungs&shy;unterstützung');
      return `<a class="ez-ok" href="#ordner/${kodiere(n)}" style="--c:${farbe}">${icon}<b>${anzeige}</b><small>${esc(unterText)}</small></a>`;
    }).join('');
  }
  function statusZeigen() {
    const el = eEl.querySelector('#ez-status');
    if (!el) return;
    const a = ad();
    if (!a) { el.textContent = ''; return; }
    const teile = [];
    if (!a.verbunden()) {
      el.innerHTML = `<span>Ordner: ${a.art === 'web' ? 'nicht mit Dropbox verbunden' : 'Dropbox-Ordner auf diesem Rechner nicht gefunden'}</span>` +
        (a.verbinden ? '<button class="knopf" id="ez-verbinden">Mit Dropbox verbinden</button>' : '');
      const v = el.querySelector('#ez-verbinden');
      if (v) v.addEventListener('click', () => a.verbinden());
      return;
    }
    const d = dateien.filter(x => !x.ordner);
    if (a.art === 'web') {
      const off = d.filter(x => x.offline).length;
      teile.push(`Offline verfügbar: ${off} von ${d.length} Dateien`);
    } else teile.push(`${d.length} Dateien im Dropbox-Ordner`);
    if (listeStand) teile.push('Stand ' + datumZeit(listeStand));
    if (listeFehler) teile.push('⚠ ' + listeFehler);
    if (a.fortschritt && a.fortschritt()) teile.push(a.fortschritt());
    el.innerHTML = teile.map(t => `<span>${esc(t)}</span>`).join('') + '<button class="knopf" id="ez-abgleich">Abgleichen</button>';
    el.querySelector('#ez-abgleich').addEventListener('click', () => { listeHolen(true); meldung('Wird abgeglichen …', 2500); });
    GSZ.kachelInfo('einsatz', `Stoffsuche · ${d.length} Datei${d.length === 1 ? '' : 'en'} in den Ordnern` +
      (a.art === 'web' ? ` · <span class="${d.length && d.filter(x => x.offline).length === d.length ? 'gut' : 'warn'}">${d.filter(x => x.offline).length} offline</span>` : ''));
  }
  GSZ.ansicht('einsatz', {
    element: eEl, titel: () => 'Einsatz',
    anzeigen() { if (!eEl.firstChild) einsatzAufbauen(); letzteZeigen(); eigeneZeigen(); ordnerZeigen(); statusZeigen(); listeHolen(false); },
    einrichten(adapter) {
      if (adapter.einsatz && adapter.einsatz.abruf) G.setzeAbruf(adapter.einsatz.abruf);
      if (adapter.einsatz && adapter.einsatz.beiAenderung) adapter.einsatz.beiAenderung(() => listeHolen(false));
      setTimeout(() => listeHolen(false), 300);
    },
  });

  // ---------------------------------------------------------------- Einsatzbildschirm (GESTIS und eigenes Datenblatt)
  const sEl = ansichtElement('stoffansicht');
  const TEILE = { '': 'Übersicht', datenblatt: 'Stoffdatenblatt', bestaendigkeit: 'Beständigkeiten', psa: 'PSA' };
  function symbol(art, code, groesse) {
    const Y = window.GSZSymbole;
    if (Y && Y[art]) { try { return Y[art](code, { groesse }); } catch { /* unten */ } }
    return `<span style="display:inline-flex;width:${groesse}px;height:${groesse}px;align-items:center;justify-content:center;border:2px solid var(--crit);` +
      `transform:rotate(45deg) scale(.7);font-size:11px"><span style="transform:rotate(-45deg)">${esc(code)}</span></span>`;
  }
  const ghsText = c => (window.GSZSymbole && GSZSymbole.GHS_TEXT && GSZSymbole.GHS_TEXT[c]) || c;
  const adrText = z => (window.GSZSymbole && GSZSymbole.ADR_TEXT && GSZSymbole.ADR_TEXT[z]) || '';
  // Luftvergleichszahl (relative Gasdichte): aus GESTIS bzw. Datenblatt, sonst aus der Molmasse berechnet (M / 28,96)
  function luft(stoff) {
    const k = stoff.kennwerte;
    let w = zahl(k.luftvergleichszahl), berechnet = false;
    if (w === null && zahl(stoff.molmasse) && !/fest/.test(stoff.aggregatzustand)) { w = Math.round(zahl(stoff.molmasse) / 28.96 * 100) / 100; berechnet = true; }
    if (w === null) return null;
    const art = w > 1.05 ? 'schwer' : w < 0.95 ? 'leicht' : 'gleich';
    return { w, berechnet, art, text: berechnet ? String(w).replace('.', ',') : k.luftvergleichszahl,
             hinweis: art === 'schwer' ? '↓ schwerer als Luft – sammelt sich am Boden, in Senken und Kanälen' : art === 'leicht' ? '↑ leichter als Luft – steigt auf' : '≈ etwa so schwer wie Luft' };
  }
  function kennwerteHtml(stoff) {
    const k = stoff.kennwerte, l = luft(stoff);
    const kachel = (titel, wert, zus = '', klasse = '') => wert ? `<div class="${klasse}"><span>${esc(titel)}</span><b>${esc(wert)}</b>${zus ? `<small>${zus}</small>` : ''}</div>` : '';
    const teile = [
      kachel('Aggregatzustand', stoff.aggregatzustand, esc(stoff.eigenschaften || '')),
      kachel('Molare Masse', stoff.molmasse, stoff.formel ? 'Formel ' + esc(stoff.formel) : ''),
      l ? `<div class="luft gross" style="--c:${l.art === 'schwer' ? 'var(--ser)' : l.art === 'leicht' ? 'var(--akzent)' : 'var(--ink)'}"><span>Luftvergleichszahl (Luft = 1)</span>` +
          `<b>${esc(l.text)}</b><small>${esc(l.hinweis)}${l.berechnet ? ' · berechnet aus der Molmasse' : ''}</small></div>` : '',
      kachel('Dampfdichte (Dampf-Luft-Gemisch)', k.dampfLuftGemisch, 'Dichteverhältnis des gesättigten Dampf-Luft-Gemisches zu Luft'),
      kachel('Dichte', k.dichte),
      kachel('Siedepunkt', k.siedepunkt),
      kachel('Schmelzpunkt', k.schmelzpunkt),
      kachel('Flammpunkt', k.flammpunkt),
      kachel('Zündtemperatur', k.zuendtemperatur, k.temperaturklasse ? 'Temperaturklasse ' + esc(k.temperaturklasse) : ''),
      (k.ueg || k.oeg) ? kachel('Explosionsgrenzen', [k.ueg && 'UEG ' + k.ueg, k.oeg && 'OEG ' + k.oeg].filter(Boolean).join(' · '), k.explosionsgruppe ? 'Explosionsgruppe ' + esc(k.explosionsgruppe) : '', 'gross') : '',
      kachel('Dampfdruck', k.dampfdruck),
      kachel('Wasserlöslichkeit', k.loeslichkeit),
      kachel('pH-Wert', k.ph),
      kachel('Grenzwert (AGW)', k.agw),
      kachel('WGK', k.wgk),
    ].filter(Boolean);
    return teile.length ? `<div class="ez-kw">${teile.join('')}</div>` : '<div class="ez-leer">Keine Kennwerte vorhanden.</div>';
  }
  // gewählter Transport-Eintrag (ein Stoff kann mehrere UN-Nummern haben)
  function transportListe(stoff) {
    const T = stoff.transporte.length ? stoff.transporte : (stoff.transport.un || stoff.transport.bezeichnung ? [stoff.transport] : []);
    const gew = unWahl.get(stoff.zvg || stoff.id) || stoff.transport.un || (T[0] && T[0].un);
    return { T, t: T.find(x => x.un === gew) || T[0] || null };
  }
  // Kennzeichnung: Warntafel, Klasse mit Gefahrzetteln, GHS-Piktogramme und Signalwort – das Wichtigste auf einen Blick
  function kennzeichnungHtml(stoff) {
    const { T, t } = transportListe(stoff), g = stoff.ghs;
    const wahl = T.length > 1 ? `<div class="ez-unwahl">${T.map(x => `<button data-un="${esc(x.un)}" class="${x === t ? 'an' : ''}">UN ${esc(x.un)}</button>`).join('')}</div>` : '';
    const zettel = t ? (t.gefahrzettel || []).map(z => `<figure>${symbol('adr', z, 50)}<figcaption>${esc(z)}</figcaption></figure>`).join('') +
      (t.umweltgefaehrdend === 'ja' ? `<figure>${symbol('adr', 'umwelt', 50)}<figcaption>umwelt&shy;gefährdend</figcaption></figure>` : '') : '';
    const ghs = g.piktogramme.map(c => `<figure>${symbol('ghs', c, 54)}<figcaption>${esc(ghsText(c))}</figcaption></figure>`).join('');
    const tafel = t ? `<div class="ez-tafel">${window.GSZSymbole ? GSZSymbole.warntafel(t.kemler, t.un, { groesse: 128 }) : esc((t.kemler || '') + ' / ' + t.un)}</div>` : '';
    return wahl + `<div class="ez-oben">${tafel}
      <div style="flex:1;min-width:11rem;display:flex;flex-direction:column;gap:.4rem">
        ${t ? `<div class="ez-transport"><span class="kl">Klasse ${esc(t.klasse || '–')}</span><span>${esc(t.klassenText || adrText(t.klasse))}</span></div>`
          : '<div class="ez-hinweis">Kein Gefahrgut-Eintrag (UN-Nr.) vorhanden.</div>'}
        ${zettel ? `<div class="ez-symbole">${zettel}</div>` : ''}
      </div></div>
      ${ghs || g.signalwort ? `<div class="ez-oben" style="margin-top:.7rem;align-items:center"><div class="ez-symbole">${ghs}</div>
        ${g.signalwort ? `<span class="ez-signal ${/achtung/i.test(g.signalwort) ? 'achtung' : ''}">${esc(g.signalwort)}</span>` : ''}</div>`
        : '<div class="ez-klein" style="margin-top:.5rem">Keine GHS-Einstufung angegeben.</div>'}`;
  }
  function transportDetails(stoff) {
    const { t } = transportListe(stoff);
    if (!t) return '';
    const z = [t.bezeichnung ? `<div class="ez-hinweis">${esc(t.bezeichnung)}</div>` : '',
      `<div class="ez-klein">${[t.kemlerAlle ? 'Nummer zur Kennzeichnung der Gefahr ' + esc(t.kemlerAlle) : '', t.verpackungsgruppe ? 'Verpackungsgruppe ' + esc(t.verpackungsgruppe) : '',
        t.code ? 'Klassifizierungscode ' + esc(t.code) : ''].filter(Boolean).join(' · ')}</div>`,
      t.tunnel ? `<div class="ez-klein">Tunnel: ${esc(t.tunnel)}</div>` : ''].join('');
    return `<section class="kachel ez-karte"><h2>Gefahrgut · UN ${esc(t.un)}</h2>${z}</section>`;
  }
  function loeschHtml(l) {
    const teile = [];
    if (l.geeignet.length) teile.push(`<div><h2>Geeignete Löschmittel</h2><ul class="ez-zeilen gut">${l.geeignet.map(x => `<li data-z="✓">${esc(x)}</li>`).join('')}</ul></div>`);
    if (l.ungeeignet.length) teile.push(`<div><h2>Ungeeignete Löschmittel</h2><ul class="ez-zeilen schlecht">${l.ungeeignet.map(x => `<li data-z="✕">${esc(x)}</li>`).join('')}</ul></div>`);
    const kopfText = !l.geeignet.length && !l.ungeeignet.length ? (l.hinweise[0] || 'Keine Angaben zu Löschmitteln.') : '';
    return (kopfText ? `<div class="ez-hinweis" style="font-weight:600">${esc(kopfText)}</div>` : '') +
      (teile.length ? `<div class="ez-zweispaltig">${teile.join('')}</div>` : '') +
      (l.brandklasse ? `<div class="ez-klein" style="margin-top:.4rem">Brandklasse ${esc(l.brandklasse)}</div>` : '') +
      (l.gefahrenBrand.length ? `<div class="ez-hinweis" style="margin-top:.5rem">🔥 ${l.gefahrenBrand.map(esc).join(' ')}</div>` : '') +
      ((l.hinweise.length > (kopfText ? 1 : 0)) ? `<details style="margin-top:.5rem"><summary class="ez-klein" style="cursor:pointer">Verhaltensmaßregeln (${l.hinweise.length - (kopfText ? 1 : 0)})</summary>
        <ul class="ez-zeilen" style="margin-top:.4rem">${l.hinweise.slice(kopfText ? 1 : 0).map(x => `<li data-z="•">${esc(x)}</li>`).join('')}</ul></details>` : '');
  }
  function hSaetzeHtml(g) {
    const l = [...g.h, ...g.euh];
    if (!l.length) return '';
    return `<section class="kachel ez-karte"><h2>Gefahrenhinweise (H-Sätze)</h2><ul class="ez-codes">${l.map(h => `<li><b>${esc(h.code)}</b> ${esc(h.text)}</li>`).join('')}</ul>
      ${g.einstufung.length ? `<details style="margin-top:.5rem"><summary class="ez-klein" style="cursor:pointer">Einstufung nach CLP</summary><ul class="ez-zeilen" style="margin-top:.4rem">${g.einstufung.map(x => `<li data-z="•">${esc(x)}</li>`).join('')}</ul></details>` : ''}</section>`;
  }
  // Der eigentliche Einsatzbildschirm
  function uebersichtHtml(stoff, basis) {
    const kurz = [stoff.cas.length ? 'CAS ' + stoff.cas.slice(0, 3).join(', ') : '', stoff.transport.un ? 'UN ' + stoff.transport.un : '', stoff.eg ? 'EG ' + stoff.eg : ''].filter(Boolean).join(' · ');
    return `
      ${stoff.offline ? `<div class="ez-warn">Offline – gespeicherter Stand vom ${esc(datumZeit(stoff.abgerufen))}.</div>` : ''}
      ${stoff.anmerkung ? `<div class="ez-warn blau">${esc(stoff.anmerkung)}</div>` : ''}
      <section class="kachel ez-karte"><div class="ez-klein" style="margin-bottom:.45rem">${esc(kurz)}${stoff.synonyme.length ? ' · auch: ' + esc(stoff.synonyme.slice(0, 4).join(', ')) : ''}</div>
        <h2>Kennzeichnung · Gefahrenklasse · GHS</h2>${kennzeichnungHtml(stoff)}</section>
      <section class="kachel ez-karte"><h2>Kennwerte</h2>${kennwerteHtml(stoff)}</section>
      <section class="kachel ez-karte"><h2>Löschmittel</h2>${loeschHtml(stoff.loeschmittel)}</section>
      ${hSaetzeHtml(stoff.ghs)}
      ${transportDetails(stoff)}
      ${stoff.bestandteile.length ? `<section class="kachel ez-karte"><h2>Gefährliche Bestandteile</h2><ul class="ez-codes">${stoff.bestandteile.map(b =>
        `<li><b>${esc(b.anteil || '')}</b> ${esc(b.name)}${b.cas ? ` · CAS <a href="#" data-cas="${esc(b.cas)}">${esc(b.cas)}</a>` : ''}${b.einstufung ? `<br><span class="ez-klein">${esc(b.einstufung)}</span>` : ''}</li>`).join('')}</ul></section>` : ''}
      <div class="ez-quelle">${quelleHtml(stoff)}</div>`;
  }
  function quelleHtml(stoff) {
    if (stoff.quelle === 'gestis') return `Quelle: GESTIS-Stoffdatenbank des IFA (DGUV)${stoff.abgerufen ? ', abgerufen ' + esc(datumZeit(stoff.abgerufen)) : ''} · ` +
      `<a href="${esc(G.SEITE(stoff.zvg))}" target="_blank" rel="noopener">in GESTIS öffnen</a> · Angaben ohne Gewähr – Lage vor Ort und Herstellerangaben beachten.`;
    return `Quelle: ${esc(stoff.quelleText || 'eigenes Sicherheitsdatenblatt')}${stoff.hersteller ? ' · ' + esc(stoff.hersteller) : ''}${stoff.stand ? ' · Stand ' + esc(stoff.stand) : ''} · Angaben ohne Gewähr – maßgeblich ist das Datenblatt selbst.`;
  }
  function datenblattHtml(stoff) {
    if (!stoff.kapitel.length) return '<div class="ez-leer">Kein Volltext vorhanden.</div>';
    let gruppe = null;
    const teile = [];
    stoff.kapitel.forEach((k, i) => {
      if (k.gruppe && k.gruppe !== gruppe) { gruppe = k.gruppe; teile.push(`<h3>${esc(gruppe)}</h3>`); }
      teile.push(`<details data-i="${i}"><summary>${esc(k.titel || 'Abschnitt')}</summary><div class="text">${esc(k.text)}</div></details>`);
    });
    return `<input type="search" class="ez-db-suche" placeholder="Im Datenblatt suchen (z. B. Atemschutz, Wasser)" aria-label="Im Datenblatt suchen">
      <div class="ez-db">${teile.join('')}</div>`;
  }
  function datenblattSuche(container, stoff) {
    const f = container.querySelector('.ez-db-suche');
    if (!f) return;
    f.addEventListener('input', () => {
      const q = f.value.trim().toLowerCase();
      for (const d of container.querySelectorAll('.ez-db details')) {
        const k = stoff.kapitel[Number(d.dataset.i)];
        const treffer = !q || (k.titel + '\n' + k.text).toLowerCase().includes(q);
        d.style.display = treffer ? '' : 'none';
        d.open = !!q && treffer;
        const t = d.querySelector('.text');
        t.innerHTML = q && treffer ? esc(k.text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`) : esc(k.text);
      }
    });
  }
  // PSA: aus dem Datenblatt (Brandbekämpfung, Freisetzung, persönliche Schutzmaßnahmen) und unsere Schutzausrüstung
  const PSA_WORT = /schutz|atem|anzug|handschuh|brille|isolierger|umgebungsluft|vollmaske|filter|stiefel|kleidung/i;
  function psaKurz(stoff) {
    const alle = [...stoff.loeschmittel.psaBrand, ...stoff.freisetzung, ...stoff.psa.atem, ...stoff.psa.koerper].join(' ');
    const chips = [];
    if (/umgebungsluftunabhängig|Isoliergerät|Pressluftatmer|umluftunabhängig/i.test(alle)) chips.push(['Umluftunabhängiger Atemschutz', 'var(--crit)']);
    const f = /((?:Gas|Partikel|Kombinations)filter[^.,;]*?(?:[A-Z][A-Z0-9-]*(?:\s*[-\/]\s*[A-Z0-9-]+)*)?)(?:,?\s*Kennfarbe\s+([a-zäöü\/\- ]+))?/i.exec(stoff.psa.atem.join(' '));
    if (f) chips.push([f[1].trim() + (f[2] ? ` (${f[2].trim()})` : ''), 'var(--akzent)']);
    if (/Chemi(e|kalien)schutzanzug|CSA|Vollschutz/i.test(alle)) chips.push(['Chemikalienschutzanzug', 'var(--ser)']);
    return chips;
  }
  function psaHtml(stoff) {
    const p = stoff.psa;
    const liste = (titel, l, zeichen = '•') => l.length ? `<section class="kachel ez-karte"><h2>${esc(titel)}</h2><ul class="ez-zeilen">${l.map(x => `<li data-z="${zeichen}">${esc(x)}</li>`).join('')}</ul></section>` : '';
    const freis = stoff.freisetzung.filter(x => PSA_WORT.test(x));
    const chips = psaKurz(stoff);
    const hand = p.handMaterialien.length ? `<section class="kachel ez-karte"><h2>Handschutz – Materialien</h2><ul class="ez-hand">
      ${p.handMaterialien.map(h => `<li style="--c:${STUFE_FARBE[h.stufe] || 'var(--rand)'}"><b>${esc(h.material)}</b>${stufeBadge(h.stufe)}
        <small>${[h.dicke && 'Dicke ' + h.dicke, h.zeit && 'Durchbruchzeit ' + h.zeit, h.fuer && 'gilt für ' + h.fuer].filter(Boolean).map(esc).join(' · ')}</small></li>`).join('')}</ul>
      ${p.hand.length ? `<details style="margin-top:.5rem"><summary class="ez-klein" style="cursor:pointer">Hinweise zum Handschutz</summary><ul class="ez-zeilen" style="margin-top:.4rem">${p.hand.map(x => `<li data-z="•">${esc(x)}</li>`).join('')}</ul></details>` : ''}</section>`
      : liste('Handschutz', p.hand);
    return (chips.length ? `<section class="kachel ez-karte"><h2>Auf einen Blick</h2><div class="ez-chips" style="margin:0">${chips.map(([t, c]) =>
        `<span class="ez-stufe" style="--c:${c}">${esc(t)}</span>`).join('')}</div><div class="ez-klein" style="margin-top:.45rem">Abgeleitet aus den Texten unten – maßgeblich sind die Texte und die Lage.</div></section>` : '') +
      liste('Bei der Brandbekämpfung', stoff.loeschmittel.psaBrand) +
      liste('Bei Freisetzung', freis) +
      liste('Atemschutz', p.atem) + liste('Körperschutz', p.koerper) + liste('Augenschutz', p.augen) + hand +
      '<section class="kachel ez-karte" id="ez-psa-unsere"><h2>Unsere Schutzausrüstung</h2><div class="ez-leer">wird geladen …</div></section>' +
      `<div class="ez-quelle">${quelleHtml(stoff)}</div>`;
  }
  // Beständigkeiten unserer Ausrüstung für den Stoff
  let bestFilter = 'Alle';
  async function bestaendigkeitHtml(stoff, ziel, { nurKategorie = null } = {}) {
    if (!ad() || !ad().verbunden()) { ziel.innerHTML = '<div class="ez-leer">Die Beständigkeitslisten liegen im Dropbox-App-Ordner – dazu einmal mit Dropbox verbinden.</div>'; return; }
    if (!dateien.length) await listeHolen(false);
    const G_ = await geraete();
    if (!G_.length) { ziel.innerHTML = `<div class="ez-leer">Noch keine Beständigkeitslisten hinterlegt (Ordner Einsatz › ${BL} im Dropbox-App-Ordner).</div>`; return; }
    const stoffInfo = { name: stoff.name, synonyme: [...stoff.synonyme, ...stoff.bestandteile.map(b => b.name)], cas: [...stoff.cas, ...stoff.bestandteile.map(b => b.cas).filter(Boolean)] };
    let erg = B.fuerStoff(G_, stoffInfo);
    if (nurKategorie) erg = erg.filter(e => kategorie(e.geraet) === nurKategorie);
    const kats = ['Alle', ...new Set(erg.map(e => kategorie(e.geraet)))];
    const zeigen = () => {
      const sicht = erg.filter(e => nurKategorie || bestFilter === 'Alle' || kategorie(e.geraet) === bestFilter);
      ziel.innerHTML = (nurKategorie || kats.length <= 2 ? '' : `<div class="ez-filter">${kats.map(k => `<button class="${k === bestFilter ? 'an' : ''}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>`) +
        (sicht.length ? `<ul class="ez-geraete">${sicht.map(e => geraetZeile(e)).join('')}</ul>` : '<div class="ez-leer">Keine Ausrüstung in dieser Gruppe.</div>') +
        '<div class="ez-klein" style="margin-top:.6rem">Bewertung nach den Herstellerlisten. Maßgeblich ist die Originalliste – Tippen öffnet das Gerät mit Original. ' +
        'Bei mehreren Zeilen (Konzentration, Temperatur) zählt in der Übersicht die ungünstigste.</div>';
      for (const b of ziel.querySelectorAll('.ez-filter button')) b.addEventListener('click', () => { bestFilter = b.dataset.k; zeigen(); });
      fotoEinsetzen(ziel);
    };
    zeigen();
  }
  function geraetZeile(e) {
    const g = e.geraet;
    const titel = (g.nr ? g.nr + ' · ' : '') + g.name;
    const eintraege = e.treffer.slice(0, 6).map(t => {
      const L = g.daten.liste;
      const ids = L.relevant.length ? L.relevant : L.spalten.map(s => s.id);
      const werte = ids.map(id => { const w = t.eintrag.werte[id]; const sp = L.spalten.find(s => s.id === id);
        return w && w.roh ? `${esc(sp ? sp.id : id)}: <b>${esc(w.roh)}</b>` : ''; }).filter(Boolean).slice(0, 6).join(' · ');
      return `<div class="eintrag">${e.treffer.length > 1 ? stufeBadge(t.stufe) + ' ' : 'Liste: '}„${esc(t.eintrag.stoff)}“${t.eintrag.konz ? ' ' + esc(t.eintrag.konz) : ''}${t.eintrag.temp ? ' · ' + esc(t.eintrag.temp) : ''}` +
        `${t.art === 'aehnlich' ? ' <i>(ähnlicher Name – prüfen)</i>' : ''}${werte ? `<br><i>${werte}</i>` : ''}${t.eintrag.hinweis ? `<br><i>${esc(t.eintrag.hinweis)}</i>` : ''}</div>`;
    }).join('');
    const rest = e.treffer.length > 6 ? `<div class="eintrag"><i>… und ${e.treffer.length - 6} weitere Zeilen</i></div>` : '';
    return `<li><a href="#geraet/${kodiere(g.ordner)}" style="--c:${STUFE_FARBE[e.stufe] || 'var(--rand)'}">
      ${g.foto ? `<img class="ez-bild" data-foto="${esc(g.foto)}" alt="">` : '<span class="ez-bild">kein Bild</span>'}
      <b>${esc(titel)}</b>
      <div class="zeile">${stufeBadge(e.stufe)}${e.nurAehnlich ? '<span class="ez-ungeprueft">nur ähnlicher Name</span>' : ''}${pruefBadge(g)}</div>
      ${eintraege}${rest}</a></li>`;
  }

  // Seite des Einsatzbildschirms aufbauen: stoff (Stoffobjekt), basis (#stoff/<zvg> bzw. #sdb/<id>), teil
  function stoffSeite(stoff, basis, teil, { eltern = 'einsatz', extra = '', ziel = sEl, nachher = null } = {}) {
    const sEl = ziel;
    sEl.innerHTML = '';
    sEl.classList.add('mit-leiste');
    const unter = teil ? TEILE[teil] : [stoff.formel, stoff.aggregatzustand].filter(Boolean).join(' · ');
    sEl.appendChild(kopf({ titel: stoff.name || 'Unbekannter Stoff', unter: esc(unter), eltern: teil ? basis.slice(1) : eltern }));
    const inhaltEl = document.createElement('div');
    inhaltEl.style.cssText = 'display:flex;flex-direction:column;gap:.8rem';
    if (extra) inhaltEl.insertAdjacentHTML('beforeend', extra);
    if (!teil) inhaltEl.insertAdjacentHTML('beforeend', uebersichtHtml(stoff, basis));
    else if (teil === 'datenblatt') { inhaltEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte">${datenblattHtml(stoff)}</section><div class="ez-quelle">${quelleHtml(stoff)}</div>`); }
    else if (teil === 'psa') inhaltEl.insertAdjacentHTML('beforeend', psaHtml(stoff));
    else if (teil === 'bestaendigkeit') inhaltEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Unsere Ausrüstung · ${esc(stoff.name)}</h2><div id="ez-best">
      <div class="ez-leer">wird geladen …</div></div></section>`);
    sEl.appendChild(inhaltEl);
    const leiste = document.createElement('nav');
    leiste.className = 'ez-leiste';
    leiste.setAttribute('aria-label', 'Stoff');
    leiste.innerHTML = [['datenblatt', 'Stoffdatenblatt', I.blatt], ['bestaendigkeit', 'Beständigkeiten', I.schild], ['psa', 'PSA', I.psa]]
      .map(([t, n, ic]) => `<a href="${teil === t ? basis : basis + '/' + t}" class="${teil === t ? 'an' : ''}"${teil ? ' data-ersetzen="1"' : ''}>${ic}<span>${n}</span></a>`).join('');
    sEl.appendChild(leiste);
    // Bedienung
    for (const b of sEl.querySelectorAll('.ez-unwahl button')) b.addEventListener('click', () => { unWahl.set(stoff.zvg || stoff.id, b.dataset.un); stoff.transport = stoff.transporte.find(t => t.un === b.dataset.un) || stoff.transport; stoffSeite(stoff, basis, teil, { eltern, extra, ziel, nachher }); });
    for (const a of sEl.querySelectorAll('a[data-cas]')) a.addEventListener('click', e => { e.preventDefault(); suchenUndZeigen(a.dataset.cas); });
    if (nachher) nachher(sEl);
    if (teil === 'datenblatt') datenblattSuche(sEl, stoff);
    if (teil === 'bestaendigkeit') bestaendigkeitHtml(stoff, sEl.querySelector('#ez-best'));
    if (teil === 'psa') { const z = sEl.querySelector('#ez-psa-unsere .ez-leer').parentElement; bestaendigkeitHtml(stoff, z, { nurKategorie: 'Schutzkleidung' })
      .then(() => { if (!z.querySelector('.ez-geraete') && !z.querySelector('.ez-leer')) z.insertAdjacentHTML('beforeend', '<div class="ez-leer">Keine Schutzkleidung mit Beständigkeitsliste hinterlegt.</div>'); }); }
  }
  let stoffNr = 0;
  GSZ.ansicht('stoff', {
    element: sEl, titel: p => TEILE[(p.split('/')[1] || '')] + ' · Stoff',
    async anzeigen(param) {
      const [zvg, teil = ''] = param.split('/');
      const nr = ++stoffNr;
      if (!stoffCache.has(zvg)) { sEl.classList.remove('mit-leiste'); sEl.innerHTML = ''; sEl.appendChild(kopf({ titel: 'Stoff wird geladen …', eltern: 'einsatz' }));
        sEl.insertAdjacentHTML('beforeend', '<div class="ez-leer">Datenblatt wird aus GESTIS geholt …</div>'); }
      try {
        const stoff = await stoffHolen(zvg, { un: unWahl.get(zvg) });
        if (nr !== stoffNr) return;
        const un = unWahl.get(zvg);
        if (un && stoff.transporte.find(t => t.un === un)) stoff.transport = stoff.transporte.find(t => t.un === un);
        stoffSeite(stoff, '#stoff/' + zvg, TEILE[teil] !== undefined ? teil : '');
      } catch (e) {
        if (nr !== stoffNr) return;
        sEl.innerHTML = ''; sEl.appendChild(kopf({ titel: 'Stoff nicht abrufbar', eltern: 'einsatz' }));
        sEl.insertAdjacentHTML('beforeend', `<div class="ez-warn rot">GESTIS ist nicht erreichbar (${esc(e.message)}), und der Stoff ist nicht auf diesem Gerät gespeichert. Mit Netz erneut versuchen.</div>`);
      }
    },
  });

  // ---------------------------------------------------------------- Ordner und Dateien
  const oEl = ansichtElement('ordneransicht');
  function ordnerSeite(pfad) {
    oEl.innerHTML = '';
    const name = pfad.split('/').pop();
    const eltern = pfad.includes('/') ? 'ordner/' + kodiere(ordnerVon(pfad)) : 'einsatz';
    oEl.appendChild(kopf({ titel: name, unter: 'Einsatz' + (pfad.includes('/') ? ' › ' + esc(ordnerVon(pfad).split('/').join(' › ')) : ''), eltern }));
    const k = document.createElement('section');
    k.className = 'kachel ez-karte';
    oEl.appendChild(k);
    const a = ad();
    if (!a || !a.verbunden()) {
      k.innerHTML = `<div class="ez-leer">Die Dateien liegen im Dropbox-App-Ordner (Dropbox › Apps › CSA-Monitor TE Miehlen › Einsatz › ${esc(pfad)}).` +
        (a && a.verbinden ? ' Dazu einmal mit Dropbox verbinden.</div><button class="knopf" id="ez-o-verb">Mit Dropbox verbinden</button>' : '</div>');
      const v = k.querySelector('#ez-o-verb'); if (v) v.addEventListener('click', () => a.verbinden());
      return;
    }
    if (pfad === BL) { geraeteSeite(k); return; }
    const { unter, dateien: liste } = inhalt(pfad);
    if (!unter.length && !liste.length) {
      k.innerHTML = `<div class="ez-leer">Noch keine Dateien. Einfach in den Dropbox-App-Ordner legen: Dropbox › Apps › CSA-Monitor TE Miehlen › Einsatz › ${esc(pfad)} ` +
        '(am Mac, am PC oder mit der Dropbox-App am iPhone). Danach hier „Abgleichen“.</div>';
      return;
    }
    const web = a.art === 'web';
    k.innerHTML = `<ul class="ez-dateien">${unter.map(u => `<li><a href="#ordner/${kodiere(pfad + '/' + u.name)}"><span class="typ" style="--c:var(--akzent)">${I.ordner}</span>
        <span><b>${esc(u.name)}</b><small>${u.anzahl} Datei${u.anzahl === 1 ? '' : 'en'}</small></span><span class="off"></span></a></li>`).join('')}
      ${liste.map(d => { const [t, c] = TYP[endung(d.name)] || [endung(d.name).toUpperCase().slice(0, 4) || 'DATEI', '#6b7480'];
        return `<li><a href="#datei/${kodiere(d.pfad)}"><span class="typ" style="--c:${c}">${esc(t)}</span>
        <span><b>${esc(d.name.replace(/\.[^.]+$/, ''))}</b><small>${esc(groesse(d.groesse))}${d.geaendert ? ' · ' + esc(datumZeit(d.geaendert)) : ''}</small></span>
        <span class="off ${web && !d.offline ? 'nein' : ''}">${web ? (d.offline ? '✓ offline' : 'nur online') : ''}</span></a></li>`; }).join('')}</ul>`;
  }
  // Beständigkeitslisten: Geräte als Bilder
  async function geraeteSeite(k) {
    k.innerHTML = '<div class="ez-leer">wird geladen …</div>';
    const G_ = await geraete();
    if (!G_.length) {
      k.innerHTML = `<div class="ez-leer">Noch keine Geräte. Je Gerät einen Ordner anlegen (z. B. „27 ELRO Schlauchpumpe“) mit Foto (Dateiname beginnt mit „Foto“) und ` +
        'Original-Beständigkeitsliste (PDF oder Fotos). Der Mac-Helfer erstellt daraus die geordnete Fassung. Anleitung: LIESMICH.txt im Ordner.</div>';
      return;
    }
    const kats = ['Alle', ...B.KATEGORIEN.filter(c => G_.some(g => kategorie(g) === c))];
    let f = 'Alle';
    const zeigen = () => {
      const sicht = G_.filter(g => f === 'Alle' || kategorie(g) === f).sort((a, b) => (Number(a.nr) || 999) - (Number(b.nr) || 999) || a.name.localeCompare(b.name, 'de'));
      k.innerHTML = `<div class="ez-filter">${kats.map(c => `<button class="${c === f ? 'an' : ''}" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="ez-raster">${sicht.map(g => `<a href="#geraet/${kodiere(g.ordner)}"><div class="foto">${g.foto ? `<img data-foto="${esc(g.foto)}" alt="">` : 'kein Bild'}</div>
          <div class="unter"><b>${esc((g.nr ? g.nr + ' · ' : '') + g.name)}</b><small>${esc(kategorie(g))} · ${g.daten ? `${g.daten.eintraege.length} Einträge` : g.quellen.length ? 'noch nicht ausgewertet' : 'keine Liste'}</small>
          <span>${pruefBadge(g)}</span></div></a>`).join('')}</div>`;
      for (const b of k.querySelectorAll('.ez-filter button')) b.addEventListener('click', () => { f = b.dataset.k; zeigen(); });
      fotoEinsetzen(k);
    };
    zeigen();
  }
  GSZ.ansicht('ordner', {
    element: oEl, titel: p => dekodiere(p).split('/').pop(),
    async anzeigen(param) { const pfad = dekodiere(param); if (!dateien.length && ad() && ad().verbunden()) await listeHolen(false); ordnerSeite(pfad); },
  });

  // Gerät mit geordneter Liste
  const gEl = ansichtElement('geraetansicht');
  async function geraetSeite(ordner) {
    gEl.innerHTML = '';
    if (!dateien.length && ad() && ad().verbunden()) await listeHolen(false);
    const g = (await geraete()).find(x => x.ordner === ordner);
    gEl.appendChild(kopf({ titel: g ? (g.nr ? g.nr + ' · ' : '') + g.name : ordner, unter: BL, eltern: 'ordner/' + kodiere(BL) }));
    if (!g) { gEl.insertAdjacentHTML('beforeend', '<div class="ez-leer">Gerät nicht gefunden.</div>'); return; }
    const d = g.daten, L = d && d.liste;
    const kopfK = document.createElement('section');
    kopfK.className = 'kachel ez-karte';
    kopfK.innerHTML = `<div class="ez-oben"><div style="width:min(14rem,100%)">${g.foto ? `<img class="ez-bildansicht" data-foto="${esc(g.foto)}" alt="Foto ${esc(g.name)}">` : '<div class="ez-leer">kein Foto</div>'}</div>
      <div style="flex:1;min-width:13rem;display:flex;flex-direction:column;gap:.35rem">
        <div class="zeile" style="display:flex;gap:.4rem;flex-wrap:wrap">${d ? `<span class="ez-chip">${esc(kategorie(g))}</span>` : ''}${pruefBadge(g)}</div>
        ${d && d.geraet.hersteller ? `<div class="ez-hinweis">Hersteller: ${esc(d.geraet.hersteller)}</div>` : ''}
        ${d && d.geraet.werkstoffe.length ? `<div class="ez-hinweis">Werkstoffe: ${esc(d.geraet.werkstoffe.join(', '))}</div>` : ''}
        ${d && d.geraet.info ? `<div class="ez-hinweis">${esc(d.geraet.info)}</div>` : ''}
        ${L ? `<div class="ez-klein">${esc([L.titel, L.stand && 'Stand ' + L.stand, L.bedingungen].filter(Boolean).join(' · '))}</div>` : ''}
        ${d && d.auswertung ? `<div class="ez-klein">${d.auswertung.geprueft ? 'Geprüft' + (d.auswertung.pruefung && d.auswertung.pruefung.am ? ' am ' + esc(datumZeit(d.auswertung.pruefung.am)) : '') :
          'Automatisch ausgelesen am ' + esc(datumZeit(d.auswertung.am)) + ' – noch nicht mit dem Original abgeglichen.'}${d.auswertung.anmerkung ? ' ' + esc(d.auswertung.anmerkung) : ''}</div>` : ''}
        ${g.fehler ? `<div class="ez-warn rot">${esc(g.fehler)}</div>` : ''}
        ${!d && g.quellen.length ? '<div class="ez-warn">Die Liste ist noch nicht ausgewertet – der Mac-Helfer erstellt die geordnete Fassung, sobald er läuft. Bis dahin gilt das Original.</div>' : ''}
      </div></div>
      ${g.quellen.length ? `<h2 style="margin-top:.8rem">Original</h2><ul class="ez-dateien">${g.quellen.map(q => { const [t, c] = TYP[endung(q)] || ['DATEI', '#6b7480'];
        const info = dateiInfo(q); return `<li><a href="#datei/${kodiere(q)}"><span class="typ" style="--c:${c}">${esc(t)}</span><span><b>${esc(q.split('/').pop())}</b>
        <small>${esc(groesse(info && info.groesse))}</small></span><span class="off"></span></a></li>`; }).join('')}</ul>` : ''}`;
    gEl.appendChild(kopfK);
    fotoEinsetzen(kopfK);
    if (!L) return;
    const t = document.createElement('section');
    t.className = 'kachel ez-karte';
    const sp = L.spalten;
    t.innerHTML = `<h2>Geordnete Beständigkeitsliste (${d.eintraege.length} Einträge)</h2>
      <input type="search" class="ez-db-suche" placeholder="Stoff oder CAS-Nr. in der Liste suchen" aria-label="In der Liste suchen">
      <div class="ez-legende">${L.legende.map(l => `<span>${stufeBadge(l.stufe, l.zeichen || '–')} ${esc(l.text)}</span>`).join('')}
        ${L.art === 'permeation' && L.schwellen ? `<span>Durchbruchzeit: ab ${esc(L.schwellen.gut_ab_minuten)} min beständig, ab ${esc(L.schwellen.bedingt_ab_minuten)} min bedingt</span>` : ''}
        ${L.relevant.length ? `<span>Für das Gerät gelten: <b>${esc(L.relevant.join(', '))}</b> (umrandet)</span>` : ''}</div>
      <div class="ez-tabelle-rahmen"><table class="ez-tabelle"><thead><tr><th>Stoff</th><th>CAS</th><th>Konz./Temp.</th>${sp.map(s => `<th title="${esc(s.name)}">${esc(s.id)}</th>`).join('')}<th>Gerät</th><th>S.</th></tr></thead>
      <tbody></tbody></table></div><div class="ez-klein" id="ez-mehr" style="margin-top:.5rem"></div>
      ${L.hinweise.length ? `<details style="margin-top:.6rem"><summary class="ez-klein" style="cursor:pointer">Hinweise der Liste</summary><ul class="ez-zeilen" style="margin-top:.4rem">${L.hinweise.map(h => `<li data-z="•">${esc(h)}</li>`).join('')}</ul></details>` : ''}`;
    gEl.appendChild(t);
    const tb = t.querySelector('tbody'), feld = t.querySelector('.ez-db-suche'), mehr = t.querySelector('#ez-mehr');
    let grenze = 150;
    const zeilen = () => {
      const q = B.grund(feld.value);
      const treffer = d.eintraege.filter(e => !q || B.grund(e.stoff).includes(q) || (e.cas && e.cas.includes(feld.value.trim())));
      tb.innerHTML = treffer.slice(0, grenze).map(e => { const ges = B.gesamtStufe(e, L);
        return `<tr><td>${esc(e.stoff)}${e.hinweis ? `<br><span class="ez-klein">${esc(e.hinweis)}</span>` : ''}</td><td>${esc(e.cas)}</td><td>${esc([e.konz, e.temp].filter(Boolean).join(' · '))}</td>
        ${sp.map(s => { const w = e.werte[s.id] || { roh: '', stufe: 'unbekannt' }; return `<td class="w ${w.roh ? esc(w.stufe) : ''}${L.relevant.includes(s.id) ? ' rel' : ''}">${esc(w.roh)}</td>`; }).join('')}
        <td class="w ${esc(ges)}">${esc(ges === 'unbekannt' ? '–' : ges === 'gut' ? '✓' : ges === 'nicht' ? '✕' : ges === 'bedingt' ? '△' : '±')}</td><td>${esc(e.seite)}</td></tr>`; }).join('');
      mehr.innerHTML = treffer.length > grenze ? `${grenze} von ${treffer.length} Einträgen angezeigt · <a href="#" id="ez-alle">alle zeigen</a>` : `${treffer.length} Einträge`;
      const al = mehr.querySelector('#ez-alle'); if (al) al.addEventListener('click', e => { e.preventDefault(); grenze = Infinity; zeilen(); });
    };
    feld.addEventListener('input', () => { grenze = 150; zeilen(); });
    zeilen();
  }
  GSZ.ansicht('geraet', { element: gEl, titel: p => dekodiere(p), anzeigen(param) { geraetSeite(dekodiere(param)); } });

  // Datei anzeigen: PDF (pdf.js), Bild, Text; sonst teilen bzw. mit Standardprogramm öffnen
  const dEl = ansichtElement('dateiansicht');
  let pdfLaden = null;
  function pdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfLaden) return pdfLaden;
    pdfLaden = new Promise((erfuellen, ablehnen) => {
      const sc = document.createElement('script');
      sc.src = 'pdf.min.js';
      sc.onload = () => { if (window.pdfjsLib) { pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js'; erfuellen(window.pdfjsLib); } else ablehnen(new Error('pdf.js fehlt')); };
      sc.onerror = () => { pdfLaden = null; ablehnen(new Error('PDF-Anzeige nicht verfügbar')); };
      document.head.appendChild(sc);
    });
    return pdfLaden;
  }
  // allgemeine Anzeige: quelle = { name, blob } (z. B. aus dem eigenen Datenblatt) oder Pfad im Einsatz-Ordner
  async function dateiZeigen(ziel, { name, blob, pfad }) {
    const leiste = document.createElement('div');
    leiste.className = 'ez-datei-leiste';
    ziel.appendChild(leiste);
    const flaeche = document.createElement('section');
    flaeche.className = 'kachel ez-karte';
    flaeche.innerHTML = '<div class="ez-leer">wird geladen …</div>';
    ziel.appendChild(flaeche);
    try { if (!blob) blob = await ad().datei(pfad); }
    catch (e) { flaeche.innerHTML = `<div class="ez-warn rot">Die Datei ist nicht auf diesem Gerät gespeichert und gerade nicht abrufbar (${esc(e.message)}).</div>`; return; }
    const typ = MIME[endung(name)] || blob.type || 'application/octet-stream';
    const knoepfe = [];
    if (ad() && ad().oeffnenExtern && pfad) knoepfe.push(['extern', 'Mit Standardprogramm öffnen', I.extern]);
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: typ })] })) knoepfe.push(['teilen', 'Teilen / öffnen in …', I.teilen]);
    else if (!ad() || !ad().oeffnenExtern) knoepfe.push(['laden', 'Herunterladen', I.teilen]);
    leiste.innerHTML = knoepfe.map(([a, t, ic]) => `<button class="knopf" data-a="${a}">${ic}${esc(t)}</button>`).join('') + `<span class="ez-klein">${esc(groesse(blob.size))}</span>`;
    leiste.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'extern') ad().oeffnenExtern(pfad);
      if (b.dataset.a === 'teilen') { try { await navigator.share({ files: [new File([blob], name, { type: typ })], title: name }); } catch { /* abgebrochen */ } }
      if (b.dataset.a === 'laden') { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    });
    if (istBild(name)) {
      const u = URL.createObjectURL(blob);
      flaeche.innerHTML = `<img class="ez-bildansicht" src="${u}" alt="${esc(name)}" title="Tippen: vergrößern">`;
      const img = flaeche.querySelector('img');
      img.addEventListener('click', () => img.classList.toggle('voll'));
      flaeche.style.overflow = 'auto';
    } else if (istText(name)) {
      flaeche.innerHTML = `<div class="ez-text">${esc(await blob.text())}</div>`;
    } else if (istPdf(name)) {
      await pdfZeigen(flaeche, blob, leiste);
    } else {
      flaeche.innerHTML = `<div class="ez-leer">Diese Datei (${esc(endung(name).toUpperCase() || 'unbekannt')}) kann hier nicht angezeigt werden – ${ad() && ad().oeffnenExtern ? 'mit dem Standardprogramm öffnen' : 'über „Teilen / öffnen in …“ an eine passende App geben'}.</div>`;
    }
  }
  async function pdfZeigen(flaeche, blob, leiste) {
    let lib;
    try { lib = await pdfjs(); } catch (e) { flaeche.innerHTML = `<div class="ez-warn">PDF-Anzeige nicht verfügbar (${esc(e.message)}). Über „Teilen / öffnen in …“ öffnen.</div>`; return; }
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, disableFontFace: false }).promise;
    let zoom = 1;
    leiste.insertAdjacentHTML('beforeend', `<span style="flex:1"></span><button class="knopf" data-z="-">−</button><span class="ez-klein" id="ez-zoom">100 %</span><button class="knopf" data-z="+">+</button>
      <span class="ez-klein" id="ez-seitenzahl">${doc.numPages} Seite${doc.numPages === 1 ? '' : 'n'}</span>`);
    flaeche.innerHTML = '<div class="ez-pdf-rahmen"><div class="ez-seiten"></div></div>';
    const seiten = flaeche.querySelector('.ez-seiten');
    const breite = () => Math.max(260, flaeche.clientWidth - 28);
    const gerendert = new Map();
    const beob = new IntersectionObserver(ein => { for (const e of ein) if (e.isIntersecting) zeichne(Number(e.target.dataset.s)); }, { rootMargin: '600px 0px' });
    async function zeichne(n) {
      const platz = seiten.querySelector(`[data-s="${n}"]`);
      if (!platz || gerendert.get(n) === zoom) return;
      gerendert.set(n, zoom);
      const seite = await doc.getPage(n);
      const v1 = seite.getViewport({ scale: 1 });
      const massstab = breite() / v1.width * zoom;
      const v = seite.getViewport({ scale: massstab });
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const c = document.createElement('canvas');
      c.width = Math.floor(v.width * dpr); c.height = Math.floor(v.height * dpr);
      c.style.width = Math.floor(v.width) + 'px'; c.style.height = Math.floor(v.height) + 'px';
      await seite.render({ canvasContext: c.getContext('2d'), viewport: seite.getViewport({ scale: massstab * dpr }) }).promise;
      if (gerendert.get(n) !== zoom) return;
      c.dataset.s = n;
      platz.replaceWith(c);
      beob.observe(c);
    }
    async function aufbauen() {
      seiten.innerHTML = '';
      gerendert.clear();
      const s1 = await doc.getPage(1), v1 = s1.getViewport({ scale: 1 });
      for (let n = 1; n <= doc.numPages; n++) {
        const p = document.createElement('div');
        p.className = 'ez-seite-platz'; p.dataset.s = n; p.textContent = `Seite ${n}`;
        p.style.width = Math.floor(breite() * zoom) + 'px'; p.style.height = Math.floor(breite() * zoom * v1.height / v1.width) + 'px';
        seiten.appendChild(p); beob.observe(p);
      }
    }
    leiste.addEventListener('click', e => {
      const b = e.target.closest('[data-z]'); if (!b) return;
      zoom = Math.min(4, Math.max(.5, b.dataset.z === '+' ? zoom * 1.4 : zoom / 1.4));
      leiste.querySelector('#ez-zoom').textContent = Math.round(zoom * 100) + ' %';
      aufbauen();
    });
    await aufbauen();
  }
  GSZ.ansicht('datei', {
    element: dEl, titel: p => dekodiere(p).split('/').pop(),
    async anzeigen(param) {
      const pfad = dekodiere(param);
      dEl.innerHTML = '';
      const name = pfad.split('/').pop();
      dEl.appendChild(kopf({ titel: name.replace(/\.[^.]+$/, ''), unter: esc(ordnerVon(pfad).split('/').join(' › ')), eltern: ordnerVon(pfad).startsWith(BL + '/') ? 'geraet/' + kodiere(ordnerVon(pfad).slice(BL.length + 1)) : 'ordner/' + kodiere(ordnerVon(pfad)) }));
      if (!dateien.length && ad() && ad().verbunden()) await listeHolen(false);
      await dateiZeigen(dEl, { name, pfad });
    },
  });

  // ---------------------------------------------------------------- Neu zeichnen nach Änderungen
  function neuZeichnen() {
    const a = GSZ.aktuell;
    if (a.ansicht === 'einsatz') { ordnerZeigen(); statusZeigen(); }
    else if (a.ansicht === 'ordner') ordnerSeite(dekodiere(a.param));
    else statusZeigen();
  }

  // Einsatz-Seite öffnen und suchen (eindeutige CAS/UN öffnet den Stoff direkt)
  function suchenUndZeigen(text) { GSZ.zeige('einsatz'); suchen(text, true); }

  // für sdb-import.js und die Tests
  window.GSZEinsatz = { stoffSeite, stoffElement: sEl, dateiZeigen, kopf, ansichtElement, esc, datumZeit, groesse, meldung, I,
    listeHolen, geraete, get dateien() { return dateien; }, stoffHolen, suchen: suchenUndZeigen, symbol };
})();
