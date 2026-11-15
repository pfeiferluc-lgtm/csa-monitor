// Einsatz-Teil der App „Gefahrstoffzug TE Miehlen“ (Programm und Web-App): Stoffsuche mit GESTIS-Einsatzbildschirm,
// Stoffdatenblatt, Beständigkeiten unserer Ausrüstung, PSA, Einsatz-Ordner mit Dateien (offline) und Beständigkeitslisten
// mit Gerätebildern. Eigene Sicherheitsdatenblätter liest sdb-import.js ein (gleicher Einsatzbildschirm).
// Daten kommen über GSZ.adapter.einsatz (web-start.js: Dropbox-App-Ordner; start.js/main.js: Dropbox-Ordner auf dem Rechner).
// Ansichten: #einsatz · #stoff/<zvg>[/datenblatt|bestaendigkeit|psa|eh] · #sdb/<id>[/…] · #ordner/<pfad> · #datei/<pfad> · #geraet/<ordner>
// Zoomen (Finger) ist in der App gesperrt und nur in Dokumenten (#datei, Original eines Datenblatts) erlaubt.
'use strict';
(() => {
  const S = window.GSZStoffdaten, G = window.GSZGestis, B = window.GSZBestaendigkeit, SP = window.GSZSpeicher;
  const BL = 'Beständigkeitslisten';
  const ORDNER_REIHE = [BL, 'A-Lage', 'B-Lage', 'C-Lage', 'Führungsunterstützung', 'Messen', 'Probenahme'];

  const css = `
  /* Finger-Zoom nur in Dokumenten (html.zoom-frei) */
  html { touch-action: pan-x pan-y; }
  html.zoom-frei { touch-action: auto; }
  .ez { --rund: .8rem; font-size: 16px; color: var(--ink); max-width: 62rem; margin: 0 auto; display: flex; flex-direction: column; gap: .8rem;
    padding: calc(.7rem + var(--frei-oben)) calc(.8rem + var(--sicher-rechts)) calc(1.4rem + var(--sicher-unten)) calc(.8rem + var(--sicher-links)); }
  .ez.mit-leiste { padding-bottom: calc(var(--leiste-h, calc(5.6rem + var(--sicher-unten))) + 1.2rem); }
  .ez .knopf { font-size: .95rem; padding: .45rem .75rem; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: .35rem; }
  .ez .knopf svg { width: 1.1em; height: 1.1em; flex: none; }
  .ez h2 { margin: 0 0 .55rem; font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; color: var(--ink2); }
  .ez-kopf { display: flex; align-items: center; gap: .7rem; padding: .3rem .7rem .3rem .45rem; }
  .ez-kopf img { height: 3.4rem; width: auto; aspect-ratio: 19 / 25; object-fit: cover; border-radius: .45rem; flex: none; }
  .ez-kopf .zur { flex: none; padding: .45rem .6rem; }
  .ez-titel { flex: 1; min-width: 0; }
  .ez-titel h1 { margin: 0; font-size: 1.35rem; line-height: 1.15; overflow-wrap: anywhere; -webkit-hyphens: manual; hyphens: manual; }
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
  .ez-import { position: relative; overflow: hidden; cursor: pointer; }
  .ez-import input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; font-size: 16px; }
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
  .ez-ok b { font-size: 1rem; line-height: 1.2; -webkit-hyphens: manual; hyphens: manual; overflow-wrap: break-word; }
  .ez-ok small { color: var(--muted); font-size: .78rem; }
  .ez-status { font-size: .78rem; color: var(--muted); display: flex; gap: .4rem .8rem; flex-wrap: wrap; align-items: center; justify-content: center; text-align: center; }
  .ez-status .knopf { font-size: .8rem; padding: .3rem .6rem; }
  /* Dateiliste */
  .ez-dateien { list-style: none; margin: 0; padding: 0; }
  .ez-dateien li { display: flex; align-items: center; gap: .3rem; border-bottom: 1px solid var(--line); }
  .ez-dateien a { flex: 1; min-width: 0; display: grid; grid-template-columns: 2.2rem minmax(0, 1fr) auto; gap: .2rem .7rem; align-items: center; padding: .6rem .45rem;
    color: var(--ink); text-decoration: none; border-radius: .4rem; }
  .ez-dateien a:hover { background: var(--surface2); }
  .ez-dateien .typ { width: 2.2rem; height: 2.6rem; border-radius: .3rem; display: flex; align-items: center; justify-content: center; font-size: .62rem;
    font-weight: 800; color: #fff; background: var(--c, var(--muted)); letter-spacing: .02em; }
  .ez-dateien b { font-weight: 600; overflow-wrap: break-word; -webkit-hyphens: auto; hyphens: auto; line-height: 1.25; }
  .ez-dateien small { color: var(--muted); font-size: .75rem; display: block; margin-top: .1rem; }
  .ez-dateien .off { font-size: .72rem; color: var(--good); white-space: nowrap; }
  .ez-dateien .off.nein { color: var(--muted); }
  /* Verfügbarkeit einer Datei (Web-App): unsichtbare Auswahl über einem Schild – Antippen öffnet die Auswahl des iPhones */
  .ez-verf { position: relative; flex: none; display: inline-flex; align-items: center; gap: .25rem; font-size: .72rem; font-weight: 600; white-space: nowrap;
    padding: .3rem .5rem; border-radius: 1rem; border: 1px solid var(--rand); color: var(--ink2); background: var(--surface2); margin-right: .2rem; }
  .ez-verf.an { color: var(--good); border-color: color-mix(in srgb, var(--good) 55%, var(--rand)); }
  .ez-verf.teil { color: var(--ser); }
  .ez-verf select { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; font-size: 16px; cursor: pointer; -webkit-appearance: none; appearance: none; }
  .ez-verf-zeile { display: flex; gap: .4rem .6rem; flex-wrap: wrap; align-items: center; margin-top: .7rem; font-size: .8rem; color: var(--muted); }
  .ez-verf-zeile .knopf { font-size: .8rem; padding: .3rem .6rem; }
  .ez-leer { color: var(--muted); padding: .8rem .2rem; font-size: .9rem; line-height: 1.45; }
  /* Ausbreitung: sinkt ab / steigt auf */
  .ez-ausbr { display: grid; grid-template-columns: 3.4rem minmax(0, 1fr); gap: .15rem .8rem; align-items: center; padding: .75rem .9rem;
    border-radius: var(--rund); background: color-mix(in srgb, var(--c) 16%, var(--surface)); border: 2px solid var(--c); color: var(--ink); }
  .ez-ausbr.schwer { --c: var(--ser); } .ez-ausbr.leicht { --c: var(--akzent); } .ez-ausbr.gleich, .ez-ausbr.unbekannt { --c: #8a96a3; }
  .ez-ausbr .pfeil { grid-row: span 3; width: 3.4rem; height: 3.4rem; border-radius: 50%; background: var(--c); color: #fff; display: flex; align-items: center; justify-content: center; }
  .ez-ausbr .pfeil svg { width: 2.3rem; height: 2.3rem; }
  .ez-ausbr b { font-size: 1.25rem; line-height: 1.15; letter-spacing: .02em; }
  .ez-ausbr .was { font-size: .9rem; line-height: 1.35; color: var(--ink2); }
  .ez-ausbr .was strong { color: var(--ink); }
  .ez-ausbr .lvz { grid-column: 2; font-size: .8rem; color: var(--muted); }
  .ez-ausbr ul { grid-column: 1 / -1; list-style: none; margin: .45rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; font-size: .84rem; line-height: 1.35; }
  .ez-ausbr li { padding-left: 1.2rem; position: relative; color: var(--ink2); }
  .ez-ausbr li::before { content: "•"; position: absolute; left: .3rem; color: var(--c); font-weight: 800; }
  .ez-ausbr li.warn { color: var(--ink); font-weight: 600; } .ez-ausbr li.warn::before { content: "!"; color: var(--crit); }
  .ez-ausbr li i { font-style: normal; color: var(--muted); }
  /* Einsatzbildschirm */
  .ez-oben { display: flex; gap: .9rem; align-items: flex-start; flex-wrap: wrap; }
  .ez-tafel { flex: none; }
  .ez-tafel svg { display: block; }
  .ez-symbole { display: flex; gap: .35rem; flex-wrap: wrap; align-items: center; }
  .ez-symbole figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: .15rem; width: 4.6rem; }
  .ez-symbole figcaption { font-size: .62rem; color: var(--ink2); text-align: center; line-height: 1.15; width: 100%; overflow-wrap: anywhere;
    -webkit-hyphens: manual; hyphens: manual; }
  .ez-symbole svg { display: block; }
  .ez-signal { display: inline-block; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: .25rem .6rem; border-radius: .4rem;
    color: #fff; background: var(--crit); font-size: .85rem; }
  .ez-signal.achtung { background: var(--ser); }
  .ez-kw { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-flow: row dense; gap: .55rem; }
  .ez-kw div { background: var(--surface2); border: 1px solid var(--line); border-radius: .55rem; padding: .5rem .6rem; min-width: 0; }
  .ez-kw span { display: block; font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; overflow-wrap: break-word; -webkit-hyphens: manual; hyphens: manual; }
  .ez-hand { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .45rem; }
  .ez-hand li { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .5rem; padding: .45rem .55rem; border-radius: .5rem; background: var(--surface2);
    border: 1px solid var(--line); border-left: .3rem solid var(--c, var(--rand)); }
  .ez-hand b { font-weight: 600; overflow-wrap: anywhere; }
  .ez-hand small { flex-basis: 100%; color: var(--ink2); font-size: .78rem; line-height: 1.35; }
  .ez-kw b { display: block; font-size: 1.02rem; overflow-wrap: anywhere; line-height: 1.25; margin-top: .1rem; }
  .ez-kw small { display: block; font-size: .74rem; color: var(--ink2); margin-top: .15rem; line-height: 1.3; overflow-wrap: anywhere; }
  .ez-kw .gross { grid-column: span 2; }
  .ez-kw .luft b { color: var(--c, var(--ink)); }
  .ez-zeilen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; }
  .ez-zeilen li { font-size: .92rem; line-height: 1.35; padding-left: 1.4rem; position: relative; }
  .ez-zeilen li::before { content: attr(data-z); position: absolute; left: 0; top: 0; width: 1.1rem; text-align: center; font-weight: 800; color: var(--c, var(--muted)); }
  .ez-zeilen.gut li { --c: var(--good); } .ez-zeilen.schlecht li { --c: var(--crit); }
  .ez-zweispaltig { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: .9rem; }
  .ez-codes { list-style: none; margin: 0; padding: 0; font-size: .88rem; line-height: 1.35; display: flex; flex-direction: column; gap: .25rem; }
  .ez-codes b { display: inline-block; min-width: 3.4rem; }
  .ez-hs li { display: grid; grid-template-columns: 4.1rem minmax(0, 1fr); gap: .5rem; }
  .ez-hs b { min-width: 0; }
  .ez-transport { display: flex; gap: .5rem .9rem; flex-wrap: wrap; align-items: center; font-size: .92rem; }
  .ez-transport .kl { font-weight: 700; }
  .ez-unwahl { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .55rem; }
  .ez-unwahl button { font: inherit; font-size: .8rem; padding: .3rem .6rem; border-radius: 1rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; }
  .ez-unwahl button.an { background: var(--akzent); border-color: var(--akzent); color: #fff; font-weight: 600; }
  .ez-leiste { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: var(--surface); box-shadow: 0 -4px 16px rgba(0,0,0,.25);
    border-top: 1px solid var(--rand); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem;
    padding: .55rem max(calc(.7rem + var(--sicher-rechts)), calc((100vw - 62rem) / 2 + .7rem)) calc(.55rem + var(--sicher-unten))
      max(calc(.7rem + var(--sicher-links)), calc((100vw - 62rem) / 2 + .7rem)); }
  .ez-leiste a { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .15rem; padding: .45rem .3rem; border-radius: .6rem; text-decoration: none;
    color: var(--ink); background: var(--surface2); border: 1px solid var(--rand); font-weight: 700; font-size: .88rem; text-align: center; line-height: 1.15; min-width: 0; }
  .ez-leiste a span { max-width: 100%; overflow-wrap: anywhere; -webkit-hyphens: manual; hyphens: manual; }
  .ez-leiste a svg { width: 1.35rem; height: 1.35rem; color: var(--akzent); }
  .ez-leiste a.an { background: var(--akzent); border-color: var(--akzent); color: #fff; }
  .ez-leiste a.an svg { color: #fff; }
  .ez-quelle { font-size: .75rem; color: var(--muted); line-height: 1.4; }
  /* Erste Hilfe und Dekontamination */
  .ez-eh + .ez-eh { margin-top: .85rem; padding-top: .75rem; border-top: 1px solid var(--line); }
  .ez-eh h3 { display: flex; align-items: center; gap: .45rem; margin: 0 0 .4rem; font-size: .95rem; color: var(--ink); }
  .ez-eh h3 svg { width: 1.35rem; height: 1.35rem; flex: none; color: var(--c, var(--akzent)); }
  .ez-eh-mehr { margin-top: .8rem; }
  .ez-eh-mehr summary { cursor: pointer; font-size: .85rem; color: var(--ink2); }
  .ez-eh-mehr .ez-zeilen { margin-top: .45rem; }
  .ez-warn .ez-zeilen { margin-top: .35rem; }
  .ez-warn .ez-zeilen li { font-size: .88rem; }
  .ez-p b { display: inline-block; min-width: 0; margin-right: .3rem; font-size: .78rem; color: var(--ink2); }
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
  /* Gerät anlegen */
  .ez-formular { display: flex; flex-direction: column; gap: .8rem; }
  .ez-formular label.feld { display: flex; flex-direction: column; gap: .3rem; font-size: .8rem; color: var(--ink2); font-weight: 600; }
  .ez-formular input[type=text], .ez-formular select, .ez-formular textarea { font: inherit; font-size: 16px; padding: .6rem .7rem; border-radius: .55rem;
    border: 1px solid var(--eingabe-rand, var(--rand)); background: var(--eingabe, var(--surface2)); color: var(--ink); width: 100%; box-sizing: border-box; margin: 0;
    -webkit-appearance: none; appearance: none; }
  .ez-formular textarea { min-height: 4.5rem; resize: vertical; }
  .ez-formular select { padding-right: 2.2rem; background-repeat: no-repeat; background-position: right .8rem center; background-size: .8rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%238a96a3' stroke-width='2'/%3E%3C/svg%3E"); }
  .ez-formular .reihe { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr); gap: .6rem; }
  .ez-wahl { display: flex; gap: .7rem; align-items: center; flex-wrap: wrap; }
  .ez-wahl .vorschau { width: 4.6rem; height: 4.6rem; border-radius: .5rem; background: #fff; border: 1px solid var(--line); object-fit: contain; }
  .ez-wahl .namen { font-size: .8rem; color: var(--ink2); overflow-wrap: anywhere; flex: 1; min-width: 8rem; }
  .ez-formular .los { background: var(--akzent) !important; border-color: var(--akzent) !important; color: #fff !important; font-weight: 700; padding: .7rem 1rem !important; }
  .ez-formular .los:disabled { opacity: .5; }
  /* Datei */
  .ez-datei-leiste { display: flex; gap: .45rem; flex-wrap: wrap; align-items: center; }
  .ez-zoomgruppe { display: inline-flex; align-items: center; gap: .4rem; white-space: nowrap; }
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
  @media (max-width: 480px) {
    .ez-suche .los span { display: none; }
    .ez-suche .los { padding: .6rem .85rem !important; }
    /* Hell/Dunkel steckt auf dem Handy im Zahnrad-Menü – mehr Platz für den Titel */
    .ez-kopf:has(.einst:not([hidden])) .modus { display: none; }
    .ez-titel h1 { font-size: 1.08rem; }
    .ez-leiste a { font-size: .8rem; }
    .ez-ausbr b { font-size: 1.12rem; }
  }
  @media (max-width: 360px) { .ez-suche input { font-size: 16px; padding: .7rem; } }
  @media (max-width: 380px) { .ez-ordner { gap: .5rem; } .ez-ok { padding: .75rem .65rem .7rem; } .ez-kw { gap: .4rem; } .ez-kw div { padding: .45rem .5rem; }
    .ez-leiste { gap: .35rem; } .ez-leiste a { font-size: .74rem; padding: .4rem .2rem; } .ez-hs li { grid-template-columns: 3.7rem minmax(0, 1fr); } }`;
  const stil = document.createElement('style');
  stil.textContent = css;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Zoomen mit den Fingern: in der App gesperrt, in Dokumenten erlaubt
  const VIEWPORT_ZU = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  const VIEWPORT_AUF = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=6, user-scalable=yes, viewport-fit=cover';
  function zoomErlauben(an) {
    const m = document.querySelector('meta[name="viewport"]');
    if (m && m.getAttribute('content') !== (an ? VIEWPORT_AUF : VIEWPORT_ZU)) m.setAttribute('content', an ? VIEWPORT_AUF : VIEWPORT_ZU);
    document.documentElement.classList.toggle('zoom-frei', !!an);
  }
  const zoomSperren = e => { if (!document.documentElement.classList.contains('zoom-frei') && e.cancelable) e.preventDefault(); };
  document.addEventListener('gesturestart', zoomSperren, { passive: false });          // Safari (iPhone, iPad)
  document.addEventListener('gesturechange', zoomSperren, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) zoomSperren(e); }, { passive: false });
  zoomErlauben(false);

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
    runter: SVG('<path d="M12 4v15M5 12l7 7 7-7"/>', '0 0 24 24').replace('stroke-width="2"', 'stroke-width="2.6"'),
    hoch: SVG('<path d="M12 20V5M5 12l7-7 7 7"/>', '0 0 24 24').replace('stroke-width="2"', 'stroke-width="2.6"'),
    quer: SVG('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>', '0 0 24 24').replace('stroke-width="2"', 'stroke-width="2.4"'),
    frage: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14"/>'),
    bild: SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>'),
    kreuz: SVG('<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>'),
    auge: SVG('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    haut: SVG('<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0v6M17 12V9a1.5 1.5 0 0 1 3 0v5c0 4.4-3 7.5-7 7.5-3 0-5-1.5-6.6-4L4 14a1.5 1.5 0 0 1 2.6-1.5L8 14"/>'),
    lunge: SVG('<path d="M12 3v9M12 11c-1.2 1-2.6.4-3-1M12 11c1.2 1 2.6.4 3-1M8.5 7C5.8 7 4 12.5 4 16c0 2.4 1.2 4 3 4s3-1.3 3-3.5V9M15.5 7c2.7 0 4.5 5.5 4.5 9 0 2.4-1.2 4-3 4s-3-1.3-3-3.5V9"/>'),
    mund: SVG('<path d="M3 12c2.5-3 5.6-4.5 9-4.5s6.5 1.5 9 4.5c-2.5 3-5.6 4.5-9 4.5S5.5 15 3 12z"/><path d="M3 12h18"/>'),
    person: SVG('<circle cx="12" cy="7" r="3.5"/><path d="M4.5 21c0-4.4 3.4-7.5 7.5-7.5s7.5 3.1 7.5 7.5"/>'),
    dusche: SVG('<path d="M5 21V8a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4"/><path d="M10 8h8"/><path d="M11 12v1.5M14 12v2.5M17 12v1.5M12.5 16v1.5M15.5 16v2"/>'),
    welle: SVG('<path d="M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>'),
    tonne: SVG('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>'),
  };
  // Stoffnamen lesbar: „Wasserstoffperoxid 35 ... <50 %“ → „Wasserstoffperoxid 35 bis < 50 %“
  const nameSchoen = n => String(n || '').replace(/\s?(?:\.\.\.|…)\s?/g, ' bis ').replace(/([<>≤≥])(?=\d)/g, '$1 ').replace(/\s{2,}/g, ' ').trim();
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
      if (g.info) {
        try { const inf = B.infoLesen(await (await ad().datei(g.info)).text()); g.kategorieInfo = inf.kategorie; g.infoText = inf.text; }
        catch { /* ohne Angaben */ }
      }
      liste.push(g);
    }
    geraeteCache = liste;
    return liste;
  }
  const kategorie = g => g.kategorieInfo || (g.daten && g.daten.geraet && g.daten.geraet.kategorie) || 'Sonstiges';
  const stufeBadge = (stufe, text) => `<span class="ez-stufe ${esc(stufe)}">${esc(text || B.STUFE_TEXT[stufe] || stufe)}</span>`;
  const STUFE_FARBE = { gut: 'var(--good)', bedingt: '#c48a00', nicht: 'var(--crit)', gemischt: 'var(--ser)' };
  const pruefBadge = g => !g.daten ? '' : g.daten.auswertung && g.daten.auswertung.geprueft
    ? `<span class="ez-gepr" title="geprüft${g.daten.auswertung.pruefung && g.daten.auswertung.pruefung.am ? ' am ' + esc(datumZeit(g.daten.auswertung.pruefung.am)) : ''}">geprüft</span>`
    : '<span class="ez-ungeprueft" title="automatisch ausgelesen – noch nicht mit dem Original abgeglichen">ungeprüft</span>';
  async function fotoEinsetzen(container) {
    for (const img of container.querySelectorAll('img[data-foto]')) {
      // nicht ladbar oder kein lesbares Bild (z. B. HEIC am PC): Platzhalter statt kaputtem Bild
      const ersatz = () => { if (!img.isConnected) return; const p = document.createElement('span'); p.className = img.className || 'ez-bild';
        p.textContent = 'Bild nicht lesbar'; p.style.cssText = 'display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.72rem;min-height:3rem;text-align:center'; img.replaceWith(p); };
      img.addEventListener('error', ersatz, { once: true });
      try { img.src = await objektUrl(img.dataset.foto); } catch { ersatz(); }
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
      <form id="ez-form" role="search"><input type="search" id="ez-q" placeholder="${innerWidth <= 480 ? 'Stoff, UN- oder CAS-Nr.' : 'Stoff, UN-Nr., CAS-Nr. oder Summenformel'}" enterkeyhint="search"
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Stoff suchen"><button class="knopf los" type="submit">${I.suche}<span>Suchen</span></button></form>
      <div class="ez-art" id="ez-art">z. B. „Ammoniak“, „1005“, „7664-41-7“ oder „NH3“</div>
      <div id="ez-erg"></div>
      <div class="ez-chips" id="ez-letzte"></div>
      <div class="ez-aktionen"><label class="knopf ez-import">${I.blatt}<span>Sicherheitsdatenblatt importieren <small style="opacity:.75">(Bild oder PDF)</small></span>
        <input type="file" id="ez-sdb-datei" accept="image/*,application/pdf,.pdf" multiple aria-label="Sicherheitsdatenblatt importieren (Bild oder PDF)"></label></div>
      <div id="ez-eigene"></div>`;
    eEl.appendChild(k);
    const o = document.createElement('section');
    o.innerHTML = '<nav class="ez-ordner" id="ez-ordner" aria-label="Einsatz-Ordner"></nav>';
    eEl.appendChild(o);
    const st = document.createElement('div');
    st.className = 'ez-status'; st.id = 'ez-status';
    eEl.appendChild(st);
    const f = k.querySelector('#ez-form'), q = k.querySelector('#ez-q');
    const imp = k.querySelector('#ez-sdb-datei');
    imp.addEventListener('change', () => {
      const liste = [...imp.files]; imp.value = '';
      if (!liste.length) return;
      if (window.GSZSdbImport && GSZSdbImport.importieren) GSZSdbImport.importieren(liste); else meldung('Import nicht verfügbar.');
    });
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
      `<ul class="ez-treffer">${r.treffer.map(t => `<li><a href="#stoff/${esc(t.zvg)}"><b>${esc(nameSchoen(t.name))}</b><span class="pfeil">›</span>
        <small>${t.cas ? 'CAS ' + esc(t.cas) : 'ohne CAS-Nr.'}${r.art === 'un' ? (t.unOk ? ` · <span class="ok">UN ${esc(r.wert)} ✓</span>` : t.unOk === false ? ' · Treffer über die GESTIS-Nr., nicht über die UN-Nr.' : '') : ''}</small></a></li>`).join('')}</ul>`;
  }
  async function letzteZeigen() {
    const el = eEl.querySelector('#ez-letzte');
    if (!el) return;
    const l = await zuletzt(10);
    el.innerHTML = l.length ? l.map(s => `<a class="ez-chip" href="#stoff/${esc(s.zvg)}" title="zuletzt geöffnet ${esc(datumZeit(s.zeit))} – auch offline">${esc(nameSchoen(s.name))}</a>`).join('') : '';
  }
  async function eigeneZeigen() {
    const el = eEl.querySelector('#ez-eigene');
    if (!el) return;
    let l = [];
    try { l = (await SP.alle('sdb')).map(x => x.wert).sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))).slice(0, 6); } catch { /* ohne */ }
    el.innerHTML = l.length ? `<h2 style="margin-top:.9rem">Eigene Datenblätter</h2><ul class="ez-treffer">${l.map(d => `<li><a href="#sdb/${esc(d.id)}">
      <b>${esc(nameSchoen((d.claude && d.claude.name) || (d.ocr && d.ocr.name) || d.name || 'Sicherheitsdatenblatt'))}</b><span class="pfeil">›</span>
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
      const anzeige = esc(n).replace('Führungsunterstützung', 'Führungs&shy;unterstützung').replace('Beständigkeitslisten', 'Beständigkeits&shy;listen');
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
      const off = d.filter(x => x.offline).length, nurOnline = d.filter(x => x.wahl === 'online').length;
      teile.push(`Offline verfügbar: ${off} von ${d.length - nurOnline} Dateien` + (nurOnline ? ` · ${nurOnline} nur online` : ''));
    } else teile.push(`${d.length} Dateien im Dropbox-Ordner`);
    if (listeStand) teile.push('Stand ' + datumZeit(listeStand));
    if (listeFehler) teile.push('⚠ ' + listeFehler);
    if (a.fortschritt && a.fortschritt()) teile.push(a.fortschritt());
    el.innerHTML = teile.map(t => `<span>${esc(t)}</span>`).join('') + '<button class="knopf" id="ez-abgleich">Abgleichen</button>';
    el.querySelector('#ez-abgleich').addEventListener('click', () => { listeHolen(true); meldung('Wird abgeglichen …', 2500); });
    const gewollt = d.filter(x => x.wahl !== 'online'), offline = gewollt.filter(x => x.offline).length;
    GSZ.kachelInfo('einsatz', `Stoffsuche · ${d.length} Datei${d.length === 1 ? '' : 'en'} in den Ordnern` +
      (a.art === 'web' ? ` · <span class="${offline === gewollt.length ? 'gut' : 'warn'}">${offline} offline</span>` : ''));
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
  const TEILE = { '': 'Übersicht', datenblatt: 'Stoffdatenblatt', bestaendigkeit: 'Beständigkeiten', psa: 'PSA', eh: 'Erste Hilfe · Dekontamination' };
  function symbol(art, code, groesse) {
    const Y = window.GSZSymbole;
    if (Y && Y[art]) { try { return Y[art](code, { groesse }); } catch { /* unten */ } }
    return `<span style="display:inline-flex;width:${groesse}px;height:${groesse}px;align-items:center;justify-content:center;border:2px solid var(--crit);` +
      `transform:rotate(45deg) scale(.7);font-size:11px"><span style="transform:rotate(-45deg)">${esc(code)}</span></span>`;
  }
  const ghsText = c => (window.GSZSymbole && GSZSymbole.GHS_TEXT && GSZSymbole.GHS_TEXT[c]) || c;
  // kurze Unterschriften (HTML mit Trennstellen), damit sie unter dem Symbol bleiben; der volle Text steht im title
  const GHS_KURZ = { GHS01: 'Explosiv', GHS02: 'Entzündbar', GHS03: 'Brand&shy;fördernd', GHS04: 'Gase unter Druck', GHS05: 'Ätzend', GHS06: 'Giftig',
    GHS07: 'Reizend, gesundheits&shy;schädlich', GHS08: 'Gesundheits&shy;gefahr', GHS09: 'Umwelt&shy;gefährlich' };
  const adrText = z => (window.GSZSymbole && GSZSymbole.ADR_TEXT && GSZSymbole.ADR_TEXT[z]) || '';
  // ---------------------------------------------------------------- Ausbreitung: sinkt das Gas bzw. sinken die Dämpfe ab oder steigen sie auf?
  // Grundlage: Luftvergleichszahl (relative Gas- bzw. Dampfdichte, Luft = 1) aus GESTIS bzw. Datenblatt, sonst aus der Molmasse
  // (M / 28,96 g/mol – nur bei reinen Stoffen, die gasförmig oder flüssig sind), sonst die Aussagen im Text des Datenblatts.
  const LUFT_SATZ = /[^.!?\n]*(?:(?:schwerer|leichter) als Luft|breite[nt] sich[^.!?\n]{0,40}(?:am|über den|in Boden)|in Bodennähe|(?:Kanalisation|Kanäle), Keller)[^.!?\n]*[.!?]?/gi;
  function dampfdruckHpa(t) {
    const z = zahl(t);
    if (z === null || S.leerWert(t)) return null;
    const e = /mbar|hpa/i.test(t) ? 1 : /kpa/i.test(t) ? 10 : /\bbar\b/i.test(t) ? 1000 : /\bpa\b/i.test(t) ? 0.01 : /mm\s?hg|torr/i.test(t) ? 1.333 : null;
    return e === null ? null : z * e;
  }
  function ausbreitung(stoff) {
    const k = stoff.kennwerte, zust = String(stoff.aggregatzustand || ''), eig = String(stoff.eigenschaften || '');
    const gas = /gas/i.test(zust), fest = /fest/i.test(zust) && !gas && !/flüssig/i.test(zust);
    const gemisch = /lösung|gemisch|zubereitung/i.test(zust) || stoff.bestandteile.length > 1;
    let lvz = S.leerWert(k.luftvergleichszahl) ? null : zahl(k.luftvergleichszahl), herkunft = 'angabe';
    if (lvz !== null && (lvz <= 0 || lvz > 60)) lvz = null;
    const M = zahl(stoff.molmasse);
    if (lvz === null && M && !fest && !gemisch) { lvz = Math.round(M / 28.96 * 100) / 100; herkunft = 'molmasse'; }
    // Sätze aus dem Datenblatt
    const saetze = [];
    for (const kap of stoff.kapitel || []) for (const m of String(kap.text || '').match(LUFT_SATZ) || []) {
      const t = m.replace(/\s+/g, ' ').trim();
      if (t.length > 8 && !/^P\d{3}/.test(t) && !saetze.some(x => x.toLowerCase() === t.toLowerCase())) saetze.push(t.length > 220 ? t.slice(0, 217) + ' …' : t);
    }
    if (lvz === null && fest && !saetze.length) return null;           // Feststoff: keine nennenswerten Dämpfe
    let art;
    const grenze = String(k.luftvergleichszahl || '').trim();
    if (lvz !== null && herkunft === 'angabe' && /^>/.test(grenze) && lvz >= 1) art = 'schwer';            // „> 1“
    else if (lvz !== null && herkunft === 'angabe' && /^</.test(grenze) && lvz <= 1) art = 'leicht';       // „< 1“
    else if (lvz !== null) art = lvz > 1.05 ? 'schwer' : lvz < 0.95 ? 'leicht' : 'gleich';
    else if (saetze.some(x => /schwerer als Luft|am Boden|Bodennähe/i.test(x))) { art = 'schwer'; herkunft = 'text'; }
    else if (saetze.some(x => /leichter als Luft/i.test(x))) { art = 'leicht'; herkunft = 'text'; }
    else art = 'unbekannt';
    const wer = gas ? 'Gas' : 'Dämpfe';
    const staerke = lvz === null ? '' : art === 'schwer' ? (lvz >= 1.3 ? 'deutlich ' : 'etwas ') : art === 'leicht' ? (lvz < 0.8 ? 'deutlich ' : 'etwas ') : '';
    const zahlText = lvz === null ? '' : herkunft === 'angabe' ? S.wertTeilen(k.luftvergleichszahl).wert : String(lvz).replace('.', ',');
    const titel = { schwer: gas ? 'Sinkt ab' : 'Dämpfe sinken ab', leicht: gas ? 'Steigt auf' : 'Dämpfe steigen auf',
                    gleich: gas ? 'Verteilt sich' : 'Dämpfe verteilen sich', unbekannt: 'Ausbreitung unklar' }[art];
    const vergleich = { schwer: 'schwerer als Luft', leicht: 'leichter als Luft', gleich: 'etwa so schwer wie Luft', unbekannt: '' }[art];
    const was = art === 'unbekannt' ? `Keine Angabe zur Dichte ${gas ? 'des Gases' : 'der Dämpfe'} im Datenblatt.`
      : `${wer} ${gas ? 'ist' : 'sind'} <strong>${staerke}${vergleich}</strong>${herkunft === 'text' ? ' (laut Datenblatt)' : ''}`;
    const lvzText = lvz === null ? '' : herkunft === 'angabe' ? `Luftvergleichszahl ${zahlText} (Luft = 1)` : herkunft === 'molmasse' ? `Luftvergleichszahl ≈ ${zahlText} (aus der Molmasse berechnet)` : '';
    const punkte = [];
    const v = (einzahl, mehrzahl) => gas ? einzahl : mehrzahl;          // „Gas sammelt sich“ / „Dämpfe sammeln sich“
    if (art === 'schwer') punkte.push(staerke === 'etwas ' ? `${v('Sinkt', 'Sinken')} langsam ab, ${v('wird', 'werden')} von Wind und Luftbewegung leicht verwirbelt – Senken, Kanäle und Keller trotzdem beachten.`
      : `${v('Sammelt', 'Sammeln')} sich am Boden, in Senken, Kanälen, Kellern und Gruben – ${v('kann', 'können')} weit fließen und dort lange stehen bleiben.`);
    if (art === 'leicht') punkte.push(staerke === 'etwas ' ? `${v('Steigt', 'Steigen')} nur langsam auf und ${v('verteilt', 'verteilen')} sich mit der Luftbewegung.`
      : `${v('Verdünnt', 'Verdünnen')} sich im Freien schnell – in Gebäuden Ansammlung unter Decken und Dächern möglich.`);
    if (art === 'gleich') punkte.push(`${v('Verteilt', 'Verteilen')} sich mit der Luftbewegung in alle Richtungen.`);
    if (art === 'unbekannt') punkte.push('Im Zweifel mit Ansammlung in Bodennähe rechnen (die meisten Gase und Dämpfe sind schwerer als Luft).');
    // verflüssigtes Gas: kalte, schwere Wolke beim Austritt
    const { t } = transportListe(stoff);
    const verfluessigt = gas && ((t && /^2/.test(t.klasse || '') && /^[23]/.test(t.code || '')) || /verflüssigt|tiefkalt|tiefgekühlt/i.test(eig + ' ' + zust + ' ' + (t ? t.bezeichnung || '' : '')));
    if (verfluessigt && art !== 'schwer') punkte.push({ warn: true, text: 'Tritt es flüssig aus, bildet sich zunächst eine kalte, schwere Wolke (oft als Nebel sichtbar) in Bodennähe.' });
    // Flüssigkeiten: gesättigtes Dampf-Luft-Gemisch und Flüchtigkeit
    if (!gas && !S.leerWert(k.dampfLuftGemisch)) {
      const d = zahl(k.dampfLuftGemisch), w = S.wertTeilen(k.dampfLuftGemisch);
      if (d !== null) punkte.push(`Gesättigtes Dampf-Luft-Gemisch: ${esc(w.wert)}${w.zusatz ? ' ' + esc(w.zusatz) : ''} – ${d > 1.05 ? 'schwerer als Luft' : d < 0.95 ? 'leichter als Luft' : 'kaum schwerer als Luft'}.`);
    }
    const dd = dampfdruckHpa(k.dampfdruck), siede = S.leerWert(k.siedepunkt) ? null : zahl(k.siedepunkt);
    if (!gas && !fest && ((dd !== null && dd < 1) || (dd === null && siede !== null && siede > 150)))
      punkte.push('Verdunstet bei Umgebungstemperatur kaum – Dämpfe vor allem bei Erwärmung oder im Brandfall.');
    // Sätze aus dem Datenblatt; „Gas ist schwerer als Luft.“ wiederholt nur die Überschrift, wenn es eine Zahl gibt
    const nurVergleich = /^(?:das |die |der )?(?:gas|dämpfe|dampf|dampf-luft-gemische?)\s+(?:ist|sind)\s+(?:schwerer|leichter) als luft\.?$/i;
    for (const x of saetze.filter(x => lvz === null || !nurVergleich.test(x)).slice(0, 3)) punkte.push({ zitat: true, text: x });
    return { art, titel, was, lvzText, punkte, lvz, herkunft, gas };
  }
  function ausbreitungHtml(stoff) {
    const a = ausbreitung(stoff);
    if (!a) return '';
    const pfeil = { schwer: I.runter, leicht: I.hoch, gleich: I.quer, unbekannt: I.frage }[a.art];
    const quelle = stoff.quelle === 'gestis' ? 'GESTIS' : 'Datenblatt';
    return `<section class="ez-ausbr ${a.art}" aria-label="Ausbreitung"><span class="pfeil">${pfeil}</span><b>${esc(a.titel)}</b><div class="was">${a.was}</div>
      ${a.lvzText ? `<div class="lvz">${esc(a.lvzText)}</div>` : ''}
      ${a.punkte.length ? `<ul>${a.punkte.map(p => typeof p === 'string' ? `<li>${p}</li>` : p.zitat ? `<li>„${esc(p.text)}“ <i>(${quelle})</i></li>`
        : `<li class="warn">${esc(p.text)}</li>`).join('')}</ul>` : ''}</section>`;
  }
  function kennwerteHtml(stoff) {
    const k = stoff.kennwerte;
    const da = v => !S.leerWert(v);
    // Kachel: Hauptwert groß, Bedingung bzw. Zusatz klein darunter
    const kachel = (titel, roh, zus = '', klasse = '') => {
      if (!da(roh)) return '';
      const w = S.wertTeilen(roh);
      const z = [w.zusatz ? esc(w.zusatz) : '', zus].filter(Boolean).join(' · ');
      return `<div class="${klasse}"><span>${esc(titel)}</span><b>${esc(w.wert)}</b>${z ? `<small>${z}</small>` : ''}</div>`;
    };
    const agw = () => {
      if (!da(k.agw)) return '';
      const t = S.wertSchoen(k.agw);
      if (t.includes(' · ')) return `<div class="gross"><span>Grenzwert (AGW)</span><b>${esc(t)}</b></div>`;
      const w = S.wertTeilen(k.agw);
      const umgerechnet = w.zusatz && /ml\/m³|ppm/.test(w.wert) && /mg\/m³/.test(w.zusatz);
      return `<div><span>Grenzwert (AGW)</span><b>${esc(w.wert)}</b>${w.zusatz ? `<small>${umgerechnet ? 'entspricht ' : ''}${esc(w.zusatz)}</small>` : ''}</div>`;
    };
    const wgk = () => {
      if (!da(k.wgk)) return '';
      const m = /^(WGK\s?\d)\s*[–-]\s*(.+)$/.exec(String(k.wgk).trim());
      return m ? `<div><span>Wasser\u00adgefährdung</span><b>${esc(m[1])}</b><small>${esc(m[2])}</small></div>` : kachel('Wasser\u00adgefährdung', k.wgk);
    };
    const grenzen = [da(k.ueg) && 'UEG ' + S.wertSchoen(k.ueg), da(k.oeg) && 'OEG ' + S.wertSchoen(k.oeg)].filter(Boolean);
    const teile = [
      da(stoff.aggregatzustand) ? `<div><span>Aggregatzustand</span><b>${esc(stoff.aggregatzustand)}</b>${stoff.eigenschaften ? `<small>${esc(stoff.eigenschaften)}</small>` : ''}</div>` : '',
      kachel('Molare Masse', stoff.molmasse, stoff.formel ? 'Formel ' + esc(stoff.formel) : ''),
      kachel('Siedepunkt', k.siedepunkt),
      kachel('Flammpunkt', k.flammpunkt),
      grenzen.length ? `<div class="gross"><span>Explosionsgrenzen</span><b>${esc(grenzen.join(' · '))}</b>${da(k.explosionsgruppe) ? `<small>Explosionsgruppe ${esc(k.explosionsgruppe)}</small>` : ''}</div>` : '',
      kachel('Zündtemperatur', k.zuendtemperatur, da(k.temperaturklasse) ? 'Temperaturklasse ' + esc(k.temperaturklasse) : ''),
      kachel('Dampfdruck', k.dampfdruck),
      kachel('Dichte', k.dichte),
      kachel('Schmelzpunkt', k.schmelzpunkt),
      kachel('Wasserlöslichkeit', k.loeslichkeit),
      kachel('pH-Wert', k.ph),
      agw(),
      wgk(),
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
    const ghs = g.piktogramme.map(c => `<figure title="${esc(ghsText(c))}">${symbol('ghs', c, 54)}<figcaption>${GHS_KURZ[c] || esc(ghsText(c))}</figcaption></figure>`).join('');
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
    return `<section class="kachel ez-karte"><h2>Gefahrenhinweise (H-Sätze)</h2><ul class="ez-codes ez-hs">${l.map(h => `<li><b>${esc(h.code)}</b><span>${esc(h.text)}</span></li>`).join('')}</ul>
      ${g.einstufung.length ? `<details style="margin-top:.5rem"><summary class="ez-klein" style="cursor:pointer">Einstufung nach CLP</summary><ul class="ez-zeilen" style="margin-top:.4rem">${g.einstufung.map(x => `<li data-z="•">${esc(x)}</li>`).join('')}</ul></details>` : ''}</section>`;
  }
  // Der eigentliche Einsatzbildschirm
  function uebersichtHtml(stoff, basis) {
    const kurz = [stoff.cas.length ? 'CAS ' + stoff.cas.slice(0, 3).join(', ') : '', stoff.transport.un ? 'UN ' + stoff.transport.un : '', stoff.eg ? 'EG ' + stoff.eg : ''].filter(Boolean).join(' · ');
    return `
      ${stoff.offline ? `<div class="ez-warn">Offline – gespeicherter Stand vom ${esc(datumZeit(stoff.abgerufen))}.</div>` : ''}
      ${stoff.anmerkung ? `<div class="ez-warn blau">${esc(stoff.anmerkung)}</div>` : ''}
      ${ausbreitungHtml(stoff)}
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
  // ---------------------------------------------------------------- Erste Hilfe und Dekontamination (Reiter „EH/Dekon“)
  // Nur Angaben aus GESTIS bzw. dem Datenblatt: Erste-Hilfe-Abschnitt, P-Sätze der Kennzeichnung, Freisetzung (Reinigung,
  // Aufnehmen, Neutralisieren), Hygiene/Handschutz, Reaktionen mit Wasser, Löslichkeit, Gewässergefährdung, Entsorgung.
  const EH_TEILE = [['allgemein', 'Allgemein · Selbstschutz', 'person', 'var(--ink2)'], ['augen', 'Augen', 'auge', 'var(--akzent)'],
    ['haut', 'Haut', 'haut', 'var(--ser)'], ['einatmen', 'Einatmen', 'lunge', '#2bb3c0'], ['verschlucken', 'Verschlucken', 'mund', '#c25bd6']];
  const WASSER_GEFAHR = /reagiert[^.;]{0,40}mit wasser|mit wasser[^.;]{0,50}(?:reagiert|heftig|gefährlich|entsteh|entwickel|bildet|zersetz)|nicht mit wasser|kein(?:en)? (?:kontakt mit )?wasser|wasser(?:zutritt)? (?:vermeiden|fernhalten)|vor (?:wasser|feuchtigkeit) schützen|starke[rn]? wärmeentwicklung/i;
  const DEKON_PERSON = /spül|abwasch|waschen|dusche|kleidung|ausziehen|entfernen|aufnehmen|abtupf|abreib|seife|polyethylenglykol|\bpeg\b|festgefroren/i;
  const DEKON_TUN = /reinig|dekontamin|abspül|abwasch|waschen|spülen|neutralis|aufnehm|aufsaug|bindemittel|universalbinder|vorreinig|abwisch|kleidung[^.]{0,40}(?:wechseln|ausziehen|lüften|entfernen)|(?:wechseln|ausziehen|lüften|entfernen)[^.]{0,40}kleidung/i;
  const ARBEITSPLATZ = /pausen|arbeitsende|nahrungs|genussmittel|straßen- und arbeitskleidung|aufbewahrungsmöglichkeit|hautpflege|hautschutzplan|arbeitsplatz/i;
  const betrifftPerson = /\bhaut\b|hautreinigung|augen|körper|person|betroffene|verletzte/i;
  const saetzeVon = l => l.flatMap(x => String(x).replace(/([.!?])\s+(?=[A-ZÄÖÜ])/g, '$1\u0001').split('\u0001')).map(x => x.trim()).filter(Boolean);
  const UMWELT = /kanalisation|gewässer|abwasser|erdreich|löschwasser|grundwasser|in die umwelt/i;
  const liste_ = (l, z = '•') => `<ul class="ez-zeilen">${l.map(x => `<li data-z="${z}">${esc(x)}</li>`).join('')}</ul>`;
  function pSaetze(stoff, re) { return (stoff.ghs.p || []).filter(p => re.test(p.code)).map(p => ({ code: p.code, text: p.text })); }
  function ehHtml(stoff) {
    const e = { allgemein: [], einatmen: [], haut: [], augen: [], verschlucken: [], arzt: [], ...(stoff.ersteHilfe || {}) };
    const bloecke = EH_TEILE.filter(([k]) => (e[k] || []).length)
      .map(([k, titel, ic, farbe]) => `<div class="ez-eh" style="--c:${farbe}"><h3>${I[ic]}${esc(titel)}</h3>${liste_(e[k])}</div>`);
    const p = pSaetze(stoff, /^P3[0-6]\d/);                          // Erste Hilfe laut Kennzeichnung (P301 … P364)
    const pHtml = p.length ? `<ul class="ez-zeilen ez-p">${p.map(x => `<li data-z="•"><b>${esc(x.code)}</b>${esc(x.text)}</li>`).join('')}</ul>` : '';
    const quelle = stoff.quelle === 'gestis' ? 'GESTIS' : 'dem Datenblatt';
    return `<section class="kachel ez-karte" id="ez-eh"><h2>Erste Hilfe</h2>
      ${bloecke.length ? bloecke.join('') : `<div class="ez-leer">Keine Angaben zur Ersten Hilfe in ${quelle}.${p.length ? ' Hinweise aus der Kennzeichnung:' : ''}</div>${pHtml}`}
      ${bloecke.length && p.length ? `<details class="ez-eh-mehr"><summary>Laut Kennzeichnung (P-Sätze, ${p.length})</summary>${pHtml}</details>` : ''}
      ${(e.arzt || []).length ? `<details class="ez-eh-mehr"><summary>Hinweise für den Arzt (${e.arzt.length})</summary>${liste_(e.arzt)}</details>` : ''}
    </section>`;
  }
  function dekonHtml(stoff) {
    const e = { haut: [], augen: [], ...(stoff.ersteHilfe || {}) };
    const gesehen = new Set();
    const neu = l => l.map(x => String(x).trim()).filter(x => x && !gesehen.has(x.toLowerCase()) && gesehen.add(x.toLowerCase()));
    const alle = [...(stoff.freisetzung || []), ...(stoff.reaktionen || []), ...(e.haut || []), ...(stoff.dekon || []), ...((stoff.psa || {}).hygiene || [])];
    // Wasser: Kennzeichnung (EUH014, EUH029, H260, H261, P223, P231+P232) und Sätze aus dem Datenblatt
    const hWasser = [...(stoff.ghs.h || []), ...(stoff.ghs.euh || [])].filter(h => /^(EUH014|EUH029|H260|H261)$/.test(h.code)).map(h => `${h.code}: ${h.text}`);
    const pWasser = pSaetze(stoff, /^P(223|231\+P232|232)$/).map(x => `${x.code}: ${x.text}`);
    const wasser = neu([...hWasser, ...pWasser, ...alle.filter(x => WASSER_GEFAHR.test(x))]);
    // Hinweise aus Freisetzung, Hygiene, Hand- und Körperschutz (und Claudes „dekon“) satzweise: Personen bzw. Sachen
    const kandidaten = saetzeVon([...(stoff.dekon || []), ...(stoff.freisetzung || []), ...((stoff.psa || {}).hygiene || []), ...((stoff.psa || {}).hand || []),
      ...((stoff.psa || {}).koerper || [])]).filter(x => DEKON_TUN.test(x) && !ARBEITSPLATZ.test(x) && !UMWELT.test(x) && !WASSER_GEFAHR.test(x));
    const personen = neu([...(e.haut || []).filter(x => DEKON_PERSON.test(x)), ...kandidaten.filter(x => betrifftPerson.test(x))])
      .concat(neu(pSaetze(stoff, /^P3(0[23]|5[23]|6[1-4])/).map(x => `${x.code}: ${x.text}`)));
    const sachen = neu(kandidaten.filter(x => !betrifftPerson.test(x)));
    const k = stoff.kennwerte || {};
    const umwelt = [
      !S.leerWert(k.loeslichkeit) ? `Wasserlöslichkeit: ${S.wertSchoen(k.loeslichkeit)}` : '',
      !S.leerWert(k.wgk) ? `Wassergefährdung: ${S.wertSchoen(k.wgk)}` : '',
      ...neu((stoff.freisetzung || []).filter(x => UMWELT.test(x) && !/:$/.test(x.trim()))),
    ].filter(Boolean);
    const entsorgung = (stoff.entsorgung || []).filter(x => !(/abfallschlüssel/i.test(x) && x.length > 160));
    const block = (titel, ic, farbe, l) => l.length ? `<div class="ez-eh" style="--c:${farbe}"><h3>${I[ic]}${esc(titel)}</h3>${liste_(l)}</div>` : '';
    const inhalt = [block('Personen (Haut, Kleidung)', 'person', 'var(--akzent)', personen), block('Schutzkleidung, Geräte, Flächen', 'dusche', '#2bb3c0', sachen),
      block('Wasser und Umwelt', 'welle', 'var(--good)', umwelt)].filter(Boolean);
    return `<section class="kachel ez-karte" id="ez-dekon"><h2>Dekontamination</h2>
      ${wasser.length ? `<div class="ez-warn rot" style="margin-bottom:.8rem"><b>Achtung – Wasser:</b> Der Stoff reagiert mit Wasser bzw. Feuchtigkeit. Vor einer Dekon mit Wasser beachten:${liste_(wasser, '!')}</div>` : ''}
      ${inhalt.length ? inhalt.join('') : '<div class="ez-leer">Keine Angaben zur Reinigung im Datenblatt.</div>'}
      ${entsorgung.length ? `<details class="ez-eh-mehr"><summary>Entsorgung (${entsorgung.length})</summary>${liste_(entsorgung)}</details>` : ''}
      <div class="ez-klein" style="margin-top:.8rem">Zusammengestellt aus ${stoff.quelle === 'gestis' ? 'GESTIS' : 'dem Sicherheitsdatenblatt'}. Ablauf der Dekontamination nach FwDV 500 und Weisung der Einsatzleitung.</div>
    </section>`;
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
    sEl.appendChild(kopf({ titel: nameSchoen(stoff.name) || 'Unbekannter Stoff', unter: esc(unter), eltern: teil ? basis.slice(1) : eltern }));
    const inhaltEl = document.createElement('div');
    inhaltEl.style.cssText = 'display:flex;flex-direction:column;gap:.8rem';
    if (extra) inhaltEl.insertAdjacentHTML('beforeend', extra);
    if (!teil) inhaltEl.insertAdjacentHTML('beforeend', uebersichtHtml(stoff, basis));
    else if (teil === 'datenblatt') { inhaltEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte">${datenblattHtml(stoff)}</section><div class="ez-quelle">${quelleHtml(stoff)}</div>`); }
    else if (teil === 'psa') inhaltEl.insertAdjacentHTML('beforeend', psaHtml(stoff));
    else if (teil === 'eh') inhaltEl.insertAdjacentHTML('beforeend', ehHtml(stoff) + dekonHtml(stoff) + `<div class="ez-quelle">${quelleHtml(stoff)}</div>`);
    else if (teil === 'bestaendigkeit') inhaltEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Unsere Ausrüstung · ${esc(stoff.name)}</h2><div id="ez-best">
      <div class="ez-leer">wird geladen …</div></div></section>`);
    sEl.appendChild(inhaltEl);
    const leiste = document.createElement('nav');
    leiste.className = 'ez-leiste';
    leiste.setAttribute('aria-label', 'Stoff');
    leiste.innerHTML = [['datenblatt', 'Stoff&shy;daten&shy;blatt', I.blatt], ['bestaendigkeit', 'Bestän&shy;dig&shy;keiten', I.schild], ['psa', 'PSA', I.psa],
      ['eh', 'EH/<wbr>Dekon', I.kreuz]]
      .map(([t, n, ic]) => `<a href="${teil === t ? basis : basis + '/' + t}" class="${teil === t ? 'an' : ''}"${teil ? ' data-ersetzen="1"' : ''}>${ic}<span>${n}</span></a>`).join('');
    sEl.appendChild(leiste);
    leisteBeobachten(sEl, leiste);
    // Bedienung
    for (const b of sEl.querySelectorAll('.ez-unwahl button')) b.addEventListener('click', () => { unWahl.set(stoff.zvg || stoff.id, b.dataset.un); stoff.transport = stoff.transporte.find(t => t.un === b.dataset.un) || stoff.transport; stoffSeite(stoff, basis, teil, { eltern, extra, ziel, nachher }); });
    for (const a of sEl.querySelectorAll('a[data-cas]')) a.addEventListener('click', e => { e.preventDefault(); suchenUndZeigen(a.dataset.cas); });
    if (nachher) nachher(sEl);
    if (teil === 'datenblatt') datenblattSuche(sEl, stoff);
    if (teil === 'bestaendigkeit') bestaendigkeitHtml(stoff, sEl.querySelector('#ez-best'));
    if (teil === 'psa') { const z = sEl.querySelector('#ez-psa-unsere .ez-leer').parentElement; bestaendigkeitHtml(stoff, z, { nurKategorie: 'Schutzkleidung' })
      .then(() => { if (!z.querySelector('.ez-geraete') && !z.querySelector('.ez-leer')) z.insertAdjacentHTML('beforeend', '<div class="ez-leer">Keine Schutzkleidung mit Beständigkeitsliste hinterlegt.</div>'); }); }
  }
  // Abstand unten = tatsächliche Höhe der Leiste (zweizeilige Beschriftung, Home-Balken), damit nichts darunter verschwindet
  let leisteRO = null;
  function leisteBeobachten(el, leiste) {
    if (leisteRO) leisteRO.disconnect();
    if (!window.ResizeObserver) return;
    leisteRO = new ResizeObserver(() => { if (leiste.isConnected && leiste.offsetHeight) el.style.setProperty('--leiste-h', leiste.offsetHeight + 'px'); });
    leisteRO.observe(leiste);
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
    const web = a.art === 'web' && !!a.verfuegbarkeitSetzen;
    const alle = dateien.filter(d => !d.ordner && d.pfad.startsWith(pfad + '/'));
    k.innerHTML = `<ul class="ez-dateien">${unter.map(u => `<li><a href="#ordner/${kodiere(pfad + '/' + u.name)}"><span class="typ" style="--c:var(--akzent)">${I.ordner}</span>
        <span><b>${esc(u.name)}</b><small>${u.anzahl} Datei${u.anzahl === 1 ? '' : 'en'}</small></span><span class="off">›</span></a></li>`).join('')}
      ${liste.map(d => { const [t, c] = TYP[endung(d.name)] || [endung(d.name).toUpperCase().slice(0, 4) || 'DATEI', '#6b7480'];
        return `<li><a href="#datei/${kodiere(d.pfad)}"><span class="typ" style="--c:${c}">${esc(t)}</span>
        <span><b>${esc(d.name.replace(/\.[^.]+$/, ''))}</b><small>${esc(groesse(d.groesse))}${d.geaendert ? ' · ' + esc(datumZeit(d.geaendert)) : ''}</small></span></a>${web ? verfWahl(d) : ''}</li>`; }).join('')}</ul>
      ${web && alle.length > 1 ? `<div class="ez-verf-zeile"><span>Alle ${alle.length} Dateien dieses Ordners:</span>
        <button class="knopf" data-alle="offline">auch offline</button><button class="knopf" data-alle="online">nur online</button></div>` : ''}
      ${web ? '<div class="ez-klein" style="margin-top:.6rem">„Auch offline“: die Datei liegt auf diesem Gerät und öffnet sich ohne Netz. „Nur online“: spart Speicher, öffnet sich nur mit Netz. Antippen des Schilds rechts ändert die Wahl.</div>' : ''}`;
    if (web) verfBedienung(k, alle);
  }
  // Verfügbarkeit einer Datei (nur Web-App): Schild mit unsichtbarer Auswahl
  function verfWahl(d) {
    const online = d.wahl === 'online';
    const text = online ? 'nur online' : d.offline ? '✓ offline' : 'lädt …';
    return `<label class="ez-verf ${online ? '' : d.offline ? 'an' : 'teil'}" title="${online ? 'Nur online – wird nicht auf dem Gerät gespeichert' : d.offline ? 'Auf dem Gerät gespeichert – auch ohne Netz' : 'Wird auf das Gerät geladen'}">${esc(text)} ▾
      <select data-verf="${esc(d.pfad)}" aria-label="Verfügbarkeit: ${esc(d.name)}"><option value="offline"${online ? '' : ' selected'}>Auch offline (auf dem Gerät speichern)</option>
      <option value="online"${online ? ' selected' : ''}>Nur online (nicht speichern)</option></select></label>`;
  }
  async function verfSetzen(pfade, wert) {
    try {
      await ad().verfuegbarkeitSetzen(pfade, wert);
      const n = pfade.length === 1 ? `„${pfade[0].split('/').pop().replace(/\.[^.]+$/, '')}“` : `${pfade.length} Dateien`;
      meldung(wert === 'online' ? `${n}: nur online – vom Gerät entfernt.` : `${n}: auch offline – ${navigator.onLine === false ? 'wird geladen, sobald Netz da ist' : 'wird auf das Gerät geladen'}.`, 4000);
    } catch (e) { meldung('Ändern nicht möglich: ' + e.message, 6000); }
    await listeHolen(false);
    schilderAktualisieren();
  }
  // Schilder „✓ offline / nur online“ in der offenen Ansicht auf den neuen Stand bringen (Datei- und Geräteansicht werden nicht neu aufgebaut)
  function schilderAktualisieren() {
    for (const sel of document.querySelectorAll('select[data-verf]')) {
      const d = dateiInfo(sel.dataset.verf), l = sel.closest('.ez-verf');
      if (d && l && document.activeElement !== sel) l.outerHTML = verfWahl(d);
    }
  }
  function verfBedienung(el, alle = []) {
    el.addEventListener('change', e => { const sel = e.target.closest('select[data-verf]'); if (sel) verfSetzen([sel.dataset.verf], sel.value); });
    el.addEventListener('click', e => { const b = e.target.closest('[data-alle]'); if (b) verfSetzen(alle.map(d => d.pfad), b.dataset.alle); });
  }
  // Beständigkeitslisten: Geräte als Bilder
  async function geraeteSeite(k) {
    k.innerHTML = '<div class="ez-leer">wird geladen …</div>';
    const G_ = await geraete();
    const neuKnopf = ad() && ad().geraetDateien ? `<div class="ez-aktionen" style="margin:0 0 .8rem"><a class="knopf" href="#geraet-neu" style="font-weight:700">${I.plus}Gerät oder PSA anlegen</a></div>` : '';
    if (!G_.length) {
      k.innerHTML = neuKnopf + `<div class="ez-leer">Noch keine Geräte. ${neuKnopf ? '„Gerät oder PSA anlegen“ antippen: Name, Gruppe, Foto und die Original-Beständigkeitsliste (PDF oder Fotos) wählen – fertig.' :
        'Je Gerät einen Ordner anlegen (z. B. „27 ELRO Schlauchpumpe“) mit Foto (Dateiname beginnt mit „Foto“) und Original-Beständigkeitsliste (PDF oder Fotos).'}` +
        ' Der Mac-Helfer erstellt daraus die geordnete Fassung.</div>';
      return;
    }
    const kats = ['Alle', ...B.KATEGORIEN.filter(c => G_.some(g => kategorie(g) === c))];
    let f = 'Alle';
    const zeigen = () => {
      const sicht = G_.filter(g => f === 'Alle' || kategorie(g) === f).sort((a, b) => (Number(a.nr) || 999) - (Number(b.nr) || 999) || a.name.localeCompare(b.name, 'de'));
      k.innerHTML = neuKnopf + `<div class="ez-filter">${kats.map(c => `<button class="${c === f ? 'an' : ''}" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div>
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
        <div class="zeile" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">${d || g.kategorieInfo ? `<span class="ez-chip">${esc(kategorie(g))}</span>` : ''}${pruefBadge(g)}</div>
        ${d && d.geraet.hersteller ? `<div class="ez-hinweis">Hersteller: ${esc(d.geraet.hersteller)}</div>` : ''}
        ${d && d.geraet.werkstoffe.length ? `<div class="ez-hinweis">Werkstoffe: ${esc(d.geraet.werkstoffe.join(', '))}</div>` : ''}
        ${d && d.geraet.info ? `<div class="ez-hinweis">${esc(d.geraet.info)}</div>` : !d && g.infoText ? `<div class="ez-hinweis">${esc(g.infoText)}</div>` : ''}
        ${L ? `<div class="ez-klein">${esc([L.titel, L.stand && 'Stand ' + L.stand, L.bedingungen].filter(Boolean).join(' · '))}</div>` : ''}
        ${d && d.auswertung ? `<div class="ez-klein">${d.auswertung.geprueft ? 'Geprüft' + (d.auswertung.pruefung && d.auswertung.pruefung.am ? ' am ' + esc(datumZeit(d.auswertung.pruefung.am)) : '') :
          'Automatisch ausgelesen am ' + esc(datumZeit(d.auswertung.am)) + ' – noch nicht mit dem Original abgeglichen.'}${d.auswertung.anmerkung ? ' ' + esc(d.auswertung.anmerkung) : ''}</div>` : ''}
        ${g.fehler ? `<div class="ez-warn rot">${esc(g.fehler)}</div>` : ''}
        ${!d && g.quellen.length ? '<div class="ez-warn">Die Liste ist noch nicht ausgewertet – der Mac-Helfer erstellt die geordnete Fassung, sobald er läuft. Bis dahin gilt das Original.</div>' : ''}
        ${!g.quellen.length ? '<div class="ez-warn">Noch keine Beständigkeitsliste hinterlegt.</div>' : ''}
        ${ad() && ad().geraetDateien ? `<div><a class="knopf" href="#geraet-neu/${kodiere(g.ordner)}">${I.bild}Bearbeiten: Foto, Liste, Gruppe</a></div>` : ''}
      </div></div>
      ${g.quellen.length ? `<h2 style="margin-top:.8rem">Original</h2><ul class="ez-dateien">${g.quellen.map(q => { const [t, c] = TYP[endung(q)] || ['DATEI', '#6b7480'];
        const info = dateiInfo(q); return `<li><a href="#datei/${kodiere(q)}"><span class="typ" style="--c:${c}">${esc(t)}</span><span><b>${esc(q.split('/').pop().replace(/\.[^.]+$/, ''))}</b>
        <small>${esc(groesse(info && info.groesse))}</small></span></a>${info && ad().art === 'web' && ad().verfuegbarkeitSetzen ? verfWahl(info) : ''}</li>`; }).join('')}</ul>` : ''}`;
    gEl.appendChild(kopfK);
    verfBedienung(kopfK);
    fotoEinsetzen(kopfK);
    if (!L) return;
    const t = document.createElement('section');
    t.className = 'kachel ez-karte';
    const sp = L.spalten;
    t.innerHTML = `<h2>Geordnete Beständigkeitsliste (${d.eintraege.length} Einträge)</h2>
      <input type="search" class="ez-db-suche" placeholder="Stoff oder CAS-Nr. suchen" aria-label="In der Liste suchen">
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

  // ---------------------------------------------------------------- Gerät oder PSA anlegen bzw. bearbeiten (#geraet-neu[/<ordner>])
  // Legt Einsatz/Beständigkeitslisten/<Nr> <Bezeichnung>/ an: Foto.jpg, Original-Liste(n), info.txt („Kategorie: …“ + Angaben).
  // Den Rest (geordnete Fassung) erledigt der Mac-Helfer.
  const neuEl = ansichtElement('geraetneu');
  const dateiName = n => String(n || '').normalize('NFC').replace(/[\/\\:*?"<>|\u0000-\u001f]/g, '-').replace(/^[.\s]+/, '').replace(/\s+/g, ' ').trim().slice(0, 100);
  async function fotoVerkleinern(datei, max = 1600) {
    try {
      const bmp = await createImageBitmap(datei);
      const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      if (bmp.close) bmp.close();
      return await new Promise((ok, nein) => c.toBlob(b => b ? ok(b) : nein(new Error('Bild nicht lesbar')), 'image/jpeg', 0.85));
    } catch { return datei; }          // z. B. HEIC am Rechner: unverändert hochladen
  }
  async function geraetNeuSeite(ordner) {
    neuEl.innerHTML = '';
    const a = ad();
    if (a && a.verbunden() && !dateien.length) await listeHolen(false);
    const alle = a && a.verbunden() ? await geraete() : [];
    const g = ordner ? alle.find(x => x.ordner === ordner) : null;
    neuEl.appendChild(kopf({ titel: g ? 'Gerät bearbeiten' : 'Gerät oder PSA anlegen', unter: g ? esc((g.nr ? g.nr + ' · ' : '') + g.name) : BL,
                             eltern: g ? 'geraet/' + kodiere(ordner) : 'ordner/' + kodiere(BL) }));
    const k = document.createElement('section');
    k.className = 'kachel ez-karte';
    neuEl.appendChild(k);
    if (!a || !a.geraetDateien) { k.innerHTML = '<div class="ez-leer">Hier nicht möglich.</div>'; return; }
    if (!a.verbunden()) {
      k.innerHTML = '<div class="ez-leer">Die Geräte liegen im Dropbox-App-Ordner – dazu einmal mit Dropbox verbinden.</div>' + (a.verbinden ? '<button class="knopf" id="gn-verb">Mit Dropbox verbinden</button>' : '');
      const v = k.querySelector('#gn-verb'); if (v) v.addEventListener('click', () => a.verbinden());
      return;
    }
    if (ordner && !g) { k.innerHTML = '<div class="ez-leer">Gerät nicht gefunden.</div>'; return; }
    const nummern = alle.map(x => Number(x.nr)).filter(Boolean);
    const vorschlag = String(nummern.length ? Math.max(...nummern) + 1 : 1);
    const katJetzt = g ? kategorie(g) : '';
    k.innerHTML = `<form class="ez-formular" id="gn-form" novalidate>
      ${g ? '' : `<div class="reihe"><label class="feld">Nr.<input type="text" id="gn-nr" inputmode="numeric" maxlength="3" placeholder="${vorschlag}"></label>
        <label class="feld">Bezeichnung<input type="text" id="gn-name" maxlength="80" placeholder="z. B. Tychem TK Gasschutzanzug" autocomplete="off"></label></div>`}
      <label class="feld">Gruppe<select id="gn-kat">${B.KATEGORIEN.map(c => `<option${c === (katJetzt || 'Schutzkleidung') ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <span class="ez-klein" style="font-weight:400">„Schutzkleidung“ erscheint im Einsatzbildschirm auch unter PSA.</span></label>
      <div class="feld" style="display:flex;flex-direction:column;gap:.35rem"><span class="ez-klein" style="font-weight:600;color:var(--ink2)">Foto</span>
        <div class="ez-wahl"><img class="vorschau" id="gn-foto-bild" alt=""${g && g.foto ? ` data-foto="${esc(g.foto)}"` : ' hidden'}>
          <label class="knopf ez-import">${I.kamera}<span>${g && g.foto ? 'Foto ersetzen' : 'Foto aufnehmen oder wählen'}</span><input type="file" id="gn-foto" accept="image/*"></label></div></div>
      <div class="feld" style="display:flex;flex-direction:column;gap:.35rem"><span class="ez-klein" style="font-weight:600;color:var(--ink2)">Beständigkeitsliste des Herstellers</span>
        <div class="ez-wahl"><label class="knopf ez-import">${I.blatt}<span>${g && g.quellen.length ? 'Weitere Liste hinzufügen' : 'Liste wählen (PDF oder Fotos)'}</span>
          <input type="file" id="gn-liste" accept="application/pdf,.pdf,image/*" multiple></label>
          <div class="namen" id="gn-liste-namen">${g && g.quellen.length ? 'vorhanden: ' + esc(g.quellen.map(q => q.split('/').pop()).join(', ')) : ''}</div></div></div>
      <label class="feld">Werkstoffe und Hinweise (freiwillig)<textarea id="gn-info" placeholder="z. B. Werkstoff Schlauch: CSM (Hypalon)">${esc(g ? g.infoText || '' : '')}</textarea>
        <span class="ez-klein" style="font-weight:400">Hilft der Auswertung, die passende Spalte der Liste zu wählen.</span></label>
      <button class="knopf los" type="submit" id="gn-los">${g ? 'Speichern' : 'Gerät anlegen'}</button>
      <div class="ez-klein" id="gn-status"></div></form>`;
    fotoEinsetzen(k);
    const form = k.querySelector('#gn-form'), fotoFeld = k.querySelector('#gn-foto'), listeFeld = k.querySelector('#gn-liste');
    let foto = null, listen = [];
    fotoFeld.addEventListener('change', () => {
      foto = fotoFeld.files[0] || null;
      const img = k.querySelector('#gn-foto-bild');
      if (foto) { img.src = URL.createObjectURL(foto); img.hidden = false; }
    });
    listeFeld.addEventListener('change', () => {
      listen = [...listeFeld.files];
      k.querySelector('#gn-liste-namen').textContent = listen.length ? 'gewählt: ' + listen.map(f => f.name || 'Foto').join(', ') : '';
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const los = k.querySelector('#gn-los'), status = k.querySelector('#gn-status');
      const name = g ? '' : dateiName(k.querySelector('#gn-name').value);
      if (!g && !name) { meldung('Bitte eine Bezeichnung eingeben.'); k.querySelector('#gn-name').focus(); return; }
      const nr = g ? '' : (k.querySelector('#gn-nr').value.replace(/\D/g, '') || vorschlag);
      const ziel = g ? g.ordner : dateiName(`${nr.padStart(2, '0')} ${name}`);
      if (!g && alle.some(x => x.ordner.toLowerCase() === ziel.toLowerCase())) { meldung('Ein Gerät mit diesem Namen gibt es schon.'); return; }
      const vorhanden = new Set(dateien.filter(d => !d.ordner && ordnerVon(d.pfad) === BL + '/' + ziel).map(d => d.name.toLowerCase()));
      const frei = n => { let x = n, i = 2; const p = n.lastIndexOf('.'); while (vorhanden.has(x.toLowerCase())) x = p > 0 ? `${n.slice(0, p)} (${i++})${n.slice(p)}` : `${n} (${i++})`; vorhanden.add(x.toLowerCase()); return x; };
      const hoch = [], weg = [];
      if (foto) {
        const b = await fotoVerkleinern(foto);
        const fn = 'Foto.' + (b.type === 'image/jpeg' ? 'jpg' : (endung(foto.name) || 'jpg'));
        if (g && g.foto && g.foto.split('/').pop() !== fn) weg.push(g.foto.split('/').pop());
        hoch.push({ name: fn, blob: b });
      }
      let seite = dateien.filter(d => ordnerVon(d.pfad) === BL + '/' + ziel && /^Liste Seite \d+/i.test(d.name)).length;
      for (const l of listen) {
        const bild = /^image\//.test(l.type) || istBild(l.name);
        const n = bild ? `Liste Seite ${++seite}.${endung(l.name) || 'jpg'}` : dateiName(l.name) || 'Liste.pdf';
        hoch.push({ name: frei(/^(foto|bild|ger(ä|ae)t|photo|image)/i.test(n) ? 'Liste ' + n : n), blob: l });
      }
      const kat = k.querySelector('#gn-kat').value, info = k.querySelector('#gn-info').value.trim();
      if (!g || kat !== katJetzt || info !== (g.infoText || '')) hoch.push({ name: g && g.info ? g.info.split('/').pop() : 'info.txt', blob: new Blob([`Kategorie: ${kat}\n${info ? info + '\n' : ''}`], { type: 'text/plain' }) });
      if (g && !hoch.length) { meldung('Nichts geändert.'); return; }
      los.disabled = true; status.textContent = 'Wird gespeichert …';
      try {
        await a.geraetDateien(ziel, hoch, { loeschen: weg }, (n, von) => { status.textContent = `Wird hochgeladen … ${n} von ${von}`; });
      } catch (f) { los.disabled = false; status.textContent = ''; meldung('Speichern nicht möglich: ' + f.message, 8000); return; }
      geraeteCache = null; urlCache.clear();
      await listeHolen(true);
      GSZ.zeige('geraet/' + kodiere(ziel), true);
      meldung(g ? 'Gespeichert.' : listen.length ? `„${name}“ angelegt – der Mac-Helfer wertet die Liste aus, sobald er läuft.` : `„${name}“ angelegt. Die Beständigkeitsliste lässt sich über „Bearbeiten“ nachreichen.`, 7000);
    });
  }
  GSZ.ansicht('geraet-neu', { element: neuEl, titel: p => p ? 'Gerät bearbeiten' : 'Gerät anlegen', anzeigen(param) { geraetNeuSeite(dekodiere(param || '')); } });

  // Datei anzeigen: PDF (pdf.js), Bild, Text; sonst teilen bzw. mit Standardprogramm öffnen
  const dEl = ansichtElement('dateiansicht');
  let pdfLaden = null, pdfAbmelden = null;
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
    const info = pfad && dateiInfo(pfad);
    leiste.innerHTML = knoepfe.map(([a, t, ic]) => `<button class="knopf" data-a="${a}">${ic}${esc(t)}</button>`).join('') +
      (info && ad() && ad().art === 'web' && ad().verfuegbarkeitSetzen ? verfWahl(info) : '') + `<span class="ez-klein">${esc(groesse(blob.size))}</span>`;
    if (info) verfBedienung(leiste);
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
    leiste.insertAdjacentHTML('beforeend', `<span style="flex:1"></span><span class="ez-zoomgruppe"><button class="knopf" data-z="-" aria-label="kleiner">−</button>
      <span class="ez-klein" id="ez-zoom">100 %</span><button class="knopf" data-z="+" aria-label="größer">+</button>
      <span class="ez-klein" id="ez-seitenzahl">${doc.numPages} Seite${doc.numPages === 1 ? '' : 'n'}</span></span>`);
    flaeche.innerHTML = '<div class="ez-pdf-rahmen"><div class="ez-seiten"></div></div>';
    const seiten = flaeche.querySelector('.ez-seiten');
    const breite = () => Math.max(260, flaeche.clientWidth - 28);
    const gerendert = new Map();
    let schaerfe = 1;                    // Faktor für das Zoomen mit den Fingern (visualViewport.scale)
    const stand = () => zoom + '|' + schaerfe;
    const beob = new IntersectionObserver(ein => { for (const e of ein) if (e.isIntersecting) zeichne(Number(e.target.dataset.s)); }, { rootMargin: '600px 0px' });
    const vv = window.visualViewport;
    if (pdfAbmelden) pdfAbmelden();
    if (vv) {
      const nachSchaerfen = () => {
        const sc = Math.min(Math.max(vv.scale || 1, 1), 3);
        if (Math.abs(sc - schaerfe) < 0.3 || !seiten.isConnected) return;
        schaerfe = sc;
        for (const c of seiten.querySelectorAll('canvas')) { const r = c.getBoundingClientRect(); if (r.bottom > -800 && r.top < innerHeight + 800) zeichne(Number(c.dataset.s)); }
      };
      const beiGroesse = () => { clearTimeout(beiGroesse.t); beiGroesse.t = setTimeout(nachSchaerfen, 350); };
      vv.addEventListener('resize', beiGroesse);
      pdfAbmelden = () => { vv.removeEventListener('resize', beiGroesse); pdfAbmelden = null; };
    }
    async function zeichne(n) {
      const platz = seiten.querySelector(`[data-s="${n}"]`);
      if (!platz || gerendert.get(n) === stand()) return;
      const fuer = stand();
      gerendert.set(n, fuer);
      const seite = await doc.getPage(n);
      const v1 = seite.getViewport({ scale: 1 });
      const massstab = breite() / v1.width * zoom;
      const v = seite.getViewport({ scale: massstab });
      // Auflösung: Bildschirm × Finger-Zoom, höchstens rund 16 Mio. Bildpunkte je Seite (Grenze von Safari)
      const dpr = Math.min(Math.min(window.devicePixelRatio || 1, 3) * schaerfe, Math.sqrt(16e6 / (v.width * v.height)));
      const c = document.createElement('canvas');
      c.width = Math.floor(v.width * dpr); c.height = Math.floor(v.height * dpr);
      c.style.width = Math.floor(v.width) + 'px'; c.style.height = Math.floor(v.height) + 'px';
      await seite.render({ canvasContext: c.getContext('2d'), viewport: seite.getViewport({ scale: massstab * dpr }) }).promise;
      if (gerendert.get(n) !== fuer) return;
      c.dataset.s = n;
      const jetzt = seiten.querySelector(`[data-s="${n}"]`);
      if (!jetzt) return;
      if (jetzt.tagName === 'CANVAS') beob.unobserve(jetzt);
      jetzt.replaceWith(c);
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
    verlassen() { zoomErlauben(false); if (pdfAbmelden) pdfAbmelden(); },
    async anzeigen(param) {
      const pfad = dekodiere(param);
      zoomErlauben(true);
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
    schilderAktualisieren();
  }

  // Einsatz-Seite öffnen und suchen (eindeutige CAS/UN öffnet den Stoff direkt)
  function suchenUndZeigen(text) { GSZ.zeige('einsatz'); suchen(text, true); }

  // für sdb-import.js und die Tests
  window.GSZEinsatz = { stoffSeite, stoffElement: sEl, dateiZeigen, kopf, ansichtElement, esc, datumZeit, groesse, meldung, I, zoomErlauben,
    ehHtml, dekonHtml,
    listeHolen, geraete, get dateien() { return dateien; }, stoffHolen, suchen: suchenUndZeigen, symbol };
})();
