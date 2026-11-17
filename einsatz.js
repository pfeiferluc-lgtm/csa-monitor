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
  /* Handschuh-Modus (html.gross): Grundschrift ×1,2 (setzt oberflaeche.js), dazu größere Schrift, Suchfelder und Leiste */
  :root.gross .ez { font-size: 19px; }
  :root.gross .ez-suchfeld input { font-size: 23px; }
  :root.gross .ez-db-suche, :root.gross .ez-formular input[type=text], :root.gross .ez-formular select, :root.gross .ez-formular textarea { font-size: 19px; }
  :root.gross .ez-leiste a { font-size: .95rem; padding: .7rem .3rem; } :root.gross .ez-leiste a svg { width: 1.75rem; height: 1.75rem; }
  .ez-kopf .gross-knopf { display: inline-flex; align-items: center; gap: .35rem; font-weight: 700; }
  @media (max-width: 480px) { .ez-kopf .gross-knopf[aria-pressed="false"] { display: none; } }
  .ez-kopf .gross-knopf svg { width: 1.25rem; height: 1.25rem; flex: none; }
  .ez-kopf .gross-knopf[aria-pressed="true"] { background: var(--akzent); color: #fff; border-color: var(--akzent); }
  /* Finger-Zoom nur in Dokumenten (html.zoom-frei) */
  html { touch-action: pan-x pan-y; }
  html.zoom-frei { touch-action: auto; }
  .ez { --rund: .8rem; --rand-l: calc(.8rem + var(--sicher-links)); --rand-r: calc(.8rem + var(--sicher-rechts));
    font-size: 16px; color: var(--ink); display: flex; flex-direction: column; gap: .8rem;
    padding: calc(.7rem + var(--frei-oben)) var(--rand-r) calc(1.4rem + var(--sicher-unten)) var(--rand-l); }
  /* Inhalt höchstens 62rem breit und mittig; der dunkle Kopf (auf der Einsatz-Seite samt Suche) läuft über die volle Breite */
  .ez > :not(.ez-kopf):not(.ez-leiste) { width: 100%; max-width: 62rem; margin-left: auto; margin-right: auto; box-sizing: border-box; }
  body:not([data-ansicht="uebungen"]):not([data-ansicht="anwesenheit"]):not([data-ansicht="monitor"]) #statusband { background: #10151c; }
  .ez.mit-leiste { padding-bottom: calc(var(--leiste-h, calc(5.6rem + var(--sicher-unten))) + 1.2rem); }
  .ez .knopf { font-size: .95rem; padding: .45rem .75rem; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: .35rem; }
  .ez .knopf svg { width: 1.1em; height: 1.1em; flex: none; }
  .ez h2 { margin: 0 0 .55rem; font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; color: var(--ink2); }
  .ez-kopf { display: flex; align-items: center; gap: .7rem; padding: .3rem .7rem .3rem .45rem; }
  /* Kopf aller Einsatz-Seiten wie das Hauptmenü: dunkel (in Hell und Dunkel gleich, daher das Original-Logo), über die volle Breite,
     unten die rot-weiße Warnmarkierung */
  .ez > .ez-kopf { position: relative; isolation: isolate; overflow: hidden; color: #fff; border-radius: 0 !important; box-shadow: none; gap: .75rem;
    margin: calc(-.7rem - var(--frei-oben)) calc(-1 * var(--rand-r)) .15rem calc(-1 * var(--rand-l));
    padding: calc(.85rem + var(--frei-oben)) max(var(--rand-r), calc((100% - 62rem) / 2 + var(--rand-r))) 1.3rem max(var(--rand-l), calc((100% - 62rem) / 2 + var(--rand-l)));
    background: radial-gradient(90% 190% at 100% 0%, rgba(214, 41, 48, .34) 0%, rgba(214, 41, 48, 0) 60%), linear-gradient(165deg, #141a23 0%, #0b0e13 82%); }
  .ez > .ez-kopf::before { content: ""; position: absolute; z-index: -1; right: -2.6rem; top: 50%; width: 9.5rem; height: 9.5rem; border-radius: 1.3rem;
    border: 1.5rem solid rgba(255, 255, 255, .04); transform: translateY(-50%) rotate(45deg); pointer-events: none; }
  .ez > .ez-kopf::after, #einsatz > .ez-held::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: .45rem;
    background: repeating-linear-gradient(-45deg, #d42a30 0 .85rem, #f2f2f2 .85rem 1.7rem); }
  .ez > .ez-kopf .ez-titel h1 { color: #fff; font-size: 1.45rem; font-weight: 800; letter-spacing: -.005em; }
  .ez > .ez-kopf .ez-titel div { color: rgba(255, 255, 255, .7); }
  .ez > .ez-kopf .knopf { background: rgba(255, 255, 255, .08) !important; border: 1px solid rgba(255, 255, 255, .2) !important; color: #fff !important; box-shadow: none !important; }
  .ez > .ez-kopf .knopf:hover { background: rgba(255, 255, 255, .15) !important; }
  .ez > .ez-kopf img.ez-logo { height: 3.3rem; width: 3.3rem; aspect-ratio: 1; object-fit: cover; border-radius: .8rem; flex: none;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, .15), 0 6px 18px rgba(0, 0, 0, .45); }
  /* Einsatz-Seite: Stoffsuche im dunklen Kopf (wie die Schnellsuche im Hauptmenü), Warnmarkierung erst darunter */
  #einsatz > .ez-kopf.mit-suche { padding-bottom: .4rem; }
  #einsatz > .ez-kopf.mit-suche::after { display: none; }
  #einsatz > .ez-held { position: relative; isolation: isolate; width: auto; max-width: none; color: #fff; border-radius: 0; box-shadow: none; background: #0b0e13;
    margin: -.85rem calc(-1 * var(--rand-r)) .15rem calc(-1 * var(--rand-l));      /* leicht überlappend: keine Haarlinie zum Kopf */
    padding: .6rem max(var(--rand-r), calc((100% - 62rem) / 2 + var(--rand-r))) 1.5rem max(var(--rand-l), calc((100% - 62rem) / 2 + var(--rand-l))); }
  #einsatz > .ez-held .ez-held-kopf b { color: #fff; }
  #einsatz > .ez-held .ez-held-kopf small { color: #fff; border-color: rgba(255, 255, 255, .35); }
  #einsatz > .ez-held .ez-suchfeld { background: #fff; border: 0; box-shadow: 0 12px 32px rgba(0, 0, 0, .38); }
  #einsatz > .ez-held .ez-suchfeld:focus-within { box-shadow: 0 0 0 3px rgba(229, 72, 77, .55), 0 12px 32px rgba(0, 0, 0, .38); }
  #einsatz > .ez-held .ez-suchfeld input { color: #0e1318; }
  #einsatz > .ez-held .ez-suchfeld input::placeholder { color: #7b8794; }
  #einsatz > .ez-held .ez-suchfeld .lupe { color: #687482; }
  #einsatz > .ez-held .ez-leeren { background: rgba(14, 19, 24, .1); color: #3c4753; }
  #einsatz > .ez-held .ez-los { background: #d42a30; }
  #einsatz > .ez-held .ez-un { background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, .22); color: #fff; }
  #einsatz > .ez-held .ez-un[aria-pressed="true"] { background: #d42a30; border-color: #d42a30; }
  #einsatz > .ez-held .ez-art { color: rgba(255, 255, 255, .7); }
  #einsatz > .ez-held .ez-art b { color: #7ee2a8; }
  #einsatz > .ez-held .ez-leer { color: rgba(255, 255, 255, .72); }
  #einsatz > .ez-held .ez-import-zeile { border-top-color: rgba(255, 255, 255, .16); }
  .ez-kopf img { height: 3.4rem; width: auto; aspect-ratio: 19 / 25; object-fit: cover; border-radius: .45rem; flex: none; }
  .ez-kopf .zur { flex: none; padding: .45rem .6rem; }
  .ez-titel { flex: 1; min-width: 0; }
  .ez-titel h1 { margin: 0; font-size: 1.35rem; line-height: 1.15; overflow: hidden; overflow-wrap: normal; -webkit-hyphens: manual; hyphens: manual; }
  .ez-titel h1.frei { -webkit-hyphens: auto; hyphens: auto; overflow-wrap: break-word; }
  .ez-titel div { color: var(--muted); font-size: .8rem; line-height: 1.3; overflow-wrap: anywhere; }
  .ez-karte { padding: .8rem .9rem .9rem; }
  .ez-hinweis { font-size: .85rem; color: var(--ink2); line-height: 1.4; }
  .ez-klein { font-size: .78rem; color: var(--muted); line-height: 1.35; }
  .ez-warn { padding: .7rem .85rem; border-left: .3rem solid var(--ser); background: var(--ser-t); border-radius: .55rem; font-size: .9rem; line-height: 1.4; }
  .ez-warn.rot { border-left-color: var(--crit); background: var(--crit-t); }
  .ez-warn.blau { border-left-color: var(--akzent); background: color-mix(in srgb, var(--akzent) 12%, var(--surface)); }
  .ez-warn .knopf { margin-top: .5rem; margin-right: .4rem; }
  /* Einsatz-Seite: Suche */
  .ez-held { border-radius: 1.1rem; padding: 1rem 1rem 1.05rem; box-shadow: var(--schatten);
    background: radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--akzent) 20%, transparent) 0%, transparent 62%), var(--surface); }
  .ez-held-kopf { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin: 0 .1rem .75rem; }
  .ez-held-kopf b { font-size: 1.2rem; letter-spacing: .01em; }
  .ez-held-kopf small { font-size: .68rem; font-weight: 800; letter-spacing: .08em; color: var(--akzent); border: 1px solid color-mix(in srgb, var(--akzent) 55%, transparent);
    border-radius: 1rem; padding: .15rem .55rem; }
  .ez-suchfeld { display: flex; align-items: center; gap: .3rem; min-height: 3.7rem; padding: .3rem .3rem .3rem .85rem; border-radius: .95rem;
    border: 2px solid var(--eingabe-rand); background: var(--eingabe); transition: border-color .15s, box-shadow .15s; }
  .ez-suchfeld:focus-within { border-color: var(--akzent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--akzent) 25%, transparent); }
  .ez-suchfeld .lupe { color: var(--muted); display: flex; flex: none; } .ez-suchfeld .lupe svg { width: 1.35rem; height: 1.35rem; }
  .ez-suchfeld input { flex: 1; min-width: 0; font: inherit; font-size: 20px; font-weight: 600; border: 0; background: transparent; color: var(--ink);
    padding: .55rem .2rem; -webkit-appearance: none; appearance: none; margin: 0; outline: none; border-radius: 0; }
  .ez-suchfeld input::placeholder { color: var(--muted); font-weight: 400; }
  .ez-suchfeld input::-webkit-search-cancel-button { -webkit-appearance: none; display: none; }
  .ez-leeren { flex: none; width: 2.3rem; height: 2.3rem; border-radius: 50%; border: 0; background: color-mix(in srgb, var(--ink) 12%, transparent);
    color: var(--ink2); font-size: 1.3rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
  .ez-leeren[hidden] { display: none; }
  .ez-los { flex: none; width: 3.05rem; height: 3.05rem; border-radius: .75rem; border: 0; background: var(--akzent); color: #fff; display: flex;
    align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .ez-los svg { width: 1.5rem; height: 1.5rem; }
  .ez-held-unter { display: flex; align-items: center; gap: .55rem .7rem; margin-top: .65rem; flex-wrap: wrap; }
  .ez-un { flex: none; font: inherit; font-size: .82rem; font-weight: 700; display: inline-flex; align-items: center; gap: .35rem; padding: .45rem .75rem; min-height: 2.4rem;
    border-radius: 2rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink2); cursor: pointer; box-sizing: border-box; }
  .ez-un svg { width: 1.05rem; height: 1.05rem; }
  .ez-un[aria-pressed="true"] { background: var(--akzent); border-color: var(--akzent); color: #fff; }
  .ez-art { flex: 1; min-width: 9rem; font-size: .8rem; color: var(--muted); line-height: 1.3; }
  .ez-art b { color: var(--good); font-weight: 700; }
  .ez-import-zeile { margin-top: .9rem; padding-top: .85rem; border-top: 1px dashed var(--rand); }
  .ez-import-knopf { display: flex; align-items: center; gap: .75rem; width: 100%; box-sizing: border-box; padding: .65rem .8rem; border-radius: .85rem; min-height: 3.6rem;
    background: var(--surface2); border: 1px solid var(--rand); color: var(--ink); cursor: pointer; position: relative; overflow: hidden; }
  .ez-import-knopf .sym { width: 2.4rem; height: 2.4rem; border-radius: .65rem; display: flex; align-items: center; justify-content: center; flex: none;
    background: color-mix(in srgb, var(--akzent) 18%, transparent); color: var(--akzent); }
  .ez-import-knopf .sym svg { width: 1.35rem; height: 1.35rem; }
  .ez-import-knopf b { display: block; font-size: .95rem; line-height: 1.2; } .ez-import-knopf small { display: block; font-size: .75rem; color: var(--muted); line-height: 1.3; margin-top: .1rem; }
  .ez-import-knopf .pfeil { margin-left: auto; color: var(--muted); font-size: 1.4rem; flex: none; }
  .ez-import, .ez-import-knopf { position: relative; overflow: hidden; cursor: pointer; }
  .ez-import input, .ez-import-knopf input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; font-size: 16px; }
  .ez-chips { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .6rem; }
  .ez-chip { font: inherit; font-size: .82rem; padding: .35rem .65rem; border-radius: 1rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; text-decoration: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ez-aktionen { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .7rem; }
  .ez-treffer { list-style: none; margin: .7rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
  .ez-treffer a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .15rem .6rem; padding: .65rem .75rem; border-radius: .75rem;
    background: var(--surface2); border: 1px solid var(--line); color: var(--ink); text-decoration: none; }
  .ez-treffer a:hover { border-color: var(--akzent); }
  .ez-treffer b { font-weight: 700; overflow-wrap: anywhere; }
  .ez-treffer small { grid-column: 1; color: var(--muted); font-size: .78rem; }
  .ez-treffer .pfeil { grid-row: 1 / span 2; grid-column: 2; align-self: center; color: var(--akzent); font-size: 1.4rem; }
  .ez-treffer .ok { color: var(--good); font-weight: 600; }
  /* Bereiche der Einsatz-Seite */
  .ez-bereich[hidden] { display: none; }
  .ez-bereich > h2 { display: flex; align-items: baseline; gap: .5rem; margin: .15rem .25rem .55rem; }
  .ez-bereich > h2 small { font-size: .72rem; font-weight: 600; color: var(--muted); text-transform: none; letter-spacing: 0; }
  /* zuletzt geöffnet: Karten mit kleiner Warntafel */
  .ez-letzte { display: flex; gap: .6rem; overflow-x: auto; scroll-snap-type: x proximity; padding: .15rem .15rem .55rem; margin: 0 -.15rem;
    -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .ez-letzte::-webkit-scrollbar { display: none; }
  .ez-zuletzt { flex: none; width: 9.4rem; scroll-snap-align: start; display: flex; flex-direction: column; gap: .5rem; padding: .7rem .7rem .65rem; border-radius: .95rem;
    background: var(--surface); box-shadow: var(--schatten); color: var(--ink); text-decoration: none; box-sizing: border-box; }
  .ez-zuletzt .name { font-weight: 700; font-size: .9rem; line-height: 1.2; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden; }
  .ez-zuletzt small { font-size: .7rem; color: var(--muted); margin-top: auto; }
  .ez-mini-tafel { display: inline-grid; grid-template-rows: auto auto; width: 4.5rem; background: #ec7c26; border: 2px solid #121212; border-radius: .2rem; overflow: hidden; }
  .ez-mini-tafel b { font: 800 .95rem/1.25 'DIN Alternate', Bahnschrift, Arial, Helvetica, sans-serif; color: #121212; text-align: center; letter-spacing: .05em; }
  .ez-mini-tafel b + b { border-top: 2px solid #121212; }
  .ez-mini-tafel.leer { background: var(--surface2); border-color: var(--rand); } .ez-mini-tafel.leer b { color: var(--muted); } .ez-mini-tafel.leer b + b { border-top-color: var(--rand); }
  /* Unterlagen */
  .ez-ordner { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; }
  .ez-ok { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto; align-items: center; gap: .1rem .75rem; padding: .85rem;
    border-radius: 1rem; background: var(--surface); box-shadow: var(--schatten); color: var(--ink); text-decoration: none; min-height: 4.7rem;
    -webkit-tap-highlight-color: transparent; box-sizing: border-box; min-width: 0; }
  .ez-ok .sym { grid-row: 1 / span 2; width: 2.8rem; height: 2.8rem; border-radius: .8rem; display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--c, var(--akzent)) 18%, transparent); color: var(--c, var(--akzent)); }
  .ez-ok .sym svg { width: 1.6rem; height: 1.6rem; }
  .ez-ok b { grid-column: 2; grid-row: 1; font-size: 1rem; line-height: 1.2; -webkit-hyphens: manual; hyphens: manual; overflow-wrap: break-word; align-self: end; min-width: 0; }
  .ez-ok small { grid-column: 2; grid-row: 2; color: var(--muted); font-size: .76rem; align-self: start; line-height: 1.3; min-width: 0; }
  .ez-ok small .gut { color: var(--good); font-weight: 700; }
  .ez-ok.breit { grid-column: 1 / -1; grid-template-columns: auto minmax(0, 1fr) auto; }
  .ez-ok .fotos { grid-row: 1 / span 2; grid-column: 3; display: flex; gap: .35rem; }
  .ez-ok .fotos:empty { display: none; }
  .ez-ok .fotos img, .ez-ok .fotos .ez-bild, .ez-ok .fotos .ez-bildmini { width: 2.8rem; height: 2.8rem; border-radius: .55rem; object-fit: cover; background: var(--bild-bg, #fff); border: 1px solid var(--line); flex: none; box-sizing: border-box; }
  .ez-ok .fotos .ez-bildmini img { width: 100%; height: 100%; border: 0; border-radius: 0; object-fit: cover; }
  /* Stand der Unterlagen */
  .ez-status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .45rem .8rem; padding: .7rem .85rem; border-radius: .95rem;
    background: var(--surface); box-shadow: var(--schatten); font-size: .78rem; color: var(--ink2); line-height: 1.35; }
  .ez-status .text { display: flex; flex-direction: column; gap: .1rem; min-width: 0; flex: 1; }
  .ez-status .knopf { font-size: .8rem; padding: .4rem .75rem; }
  .ez-status .fehler { color: var(--crit); }
  .ez-punkt { display: inline-block; width: .55rem; height: .55rem; border-radius: 50%; background: var(--good); margin-right: .4rem; vertical-align: .05em;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--good) 25%, transparent); }
  .ez-punkt.aus { background: var(--ser); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ser) 25%, transparent); }
  .ez-punkt.warte { background: var(--warn); box-shadow: 0 0 0 3px color-mix(in srgb, var(--warn) 25%, transparent); }
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
  .ez-ausbr { display: grid; grid-template-columns: 3.1rem minmax(0, 1fr); gap: .1rem .75rem; align-items: center; padding: .65rem .75rem;
    border-radius: .65rem; background: color-mix(in srgb, var(--c) 14%, var(--surface2)); border: 2px solid var(--c); color: var(--ink); min-width: 0; }
  .ez-kw > .ez-ausbr { grid-column: 1 / -1; }
  .ez-ausbr.schwer { --c: var(--ser); } .ez-ausbr.leicht { --c: var(--akzent); } .ez-ausbr.gleich, .ez-ausbr.unbekannt { --c: #8a96a3; }
  .ez-ausbr .pfeil { grid-row: span 3; width: 3.1rem; height: 3.1rem; border-radius: 50%; background: var(--c); color: #fff; display: flex; align-items: center; justify-content: center; }
  .ez-ausbr .pfeil svg { width: 2.1rem; height: 2.1rem; }
  .ez-ausbr .ueber { grid-column: 2; font-size: .68rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .ez-ausbr b { font-size: 1.2rem; line-height: 1.15; letter-spacing: .02em; }
  .ez-ausbr .was { font-size: .9rem; line-height: 1.35; color: var(--ink2); }
  .ez-ausbr .was strong { color: var(--ink); }
  .ez-ausbr .lvz { grid-column: 2; font-size: .8rem; color: var(--muted); }
  .ez-ausbr .was { grid-column: 2; }
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
  .ez-kw > div:not(.ez-ausbr) { background: var(--surface2); border: 1px solid var(--line); border-radius: .55rem; padding: .5rem .6rem; min-width: 0; }
  .ez-kw > div:not(.ez-ausbr) > span { display: block; font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; overflow-wrap: break-word; -webkit-hyphens: manual; hyphens: manual; }
  .ez-hand { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .45rem; }
  .ez-hand li { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .5rem; padding: .45rem .55rem; border-radius: .5rem; background: var(--surface2);
    border: 1px solid var(--line); border-left: .3rem solid var(--c, var(--rand)); }
  .ez-hand b { font-weight: 600; overflow-wrap: anywhere; }
  .ez-hand small { flex-basis: 100%; color: var(--ink2); font-size: .78rem; line-height: 1.35; }
  .ez-kw > div:not(.ez-ausbr) > b { display: block; font-size: 1.02rem; overflow-wrap: anywhere; line-height: 1.25; margin-top: .1rem; }
  .ez-kw > div:not(.ez-ausbr) > small { display: block; font-size: .74rem; color: var(--ink2); margin-top: .15rem; line-height: 1.3; overflow-wrap: anywhere; }
  .ez-kw > .gross { grid-column: span 2; }
  .ez-kw > .voll { grid-column: 1 / -1; }
  /* AEGL-Tabelle */
  .ez-aegl table { width: 100%; border-collapse: collapse; margin-top: .4rem; font-variant-numeric: tabular-nums; table-layout: fixed; }
  .ez-aegl th, .ez-aegl td { padding: .3rem .15rem; text-align: right; font-size: .84rem; white-space: nowrap; border-bottom: 1px solid var(--line); }
  .ez-aegl th { font-size: .68rem; color: var(--muted); font-weight: 600; text-transform: none; }
  .ez-aegl th:first-child, .ez-aegl td:first-child { text-align: left; width: 3.6rem; }
  .ez-aegl td:first-child b { display: inline-block; font-size: .72rem; font-weight: 800; color: #fff; background: var(--c); border-radius: .3rem; padding: .1rem .35rem; }
  .ez-aegl tr.a1 { --c: #b88a00; } .ez-aegl tr.a2 { --c: var(--ser); } .ez-aegl tr.a3 { --c: var(--crit); }
  .ez-aegl td.etw { background: color-mix(in srgb, var(--ser) 16%, transparent); font-weight: 700; }
  .ez-aegl tr:last-child td { border-bottom: 0; }
  .ez-aegl .legende { display: flex; flex-direction: column; gap: .2rem; margin-top: .5rem; font-size: .74rem; color: var(--ink2); line-height: 1.3; }
  .ez-aegl .legende i { font-style: normal; font-weight: 800; color: var(--c); white-space: nowrap; }
  .ez-aegl .kopfzeile { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .2rem .6rem; }
  .ez-aegl .kopfzeile > span { display: block; font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
  .ez-aegl .kopfzeile small { font-size: .7rem; color: var(--muted); }
  .ez-aegl a { color: var(--akzent); }
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
    border-top: 1px solid var(--rand); display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: .45rem;
    padding: .55rem max(calc(.7rem + var(--sicher-rechts)), calc((100vw - 62rem) / 2 + .7rem)) calc(.55rem + var(--sicher-unten))
      max(calc(.7rem + var(--sicher-links)), calc((100vw - 62rem) / 2 + .7rem)); }
  .ez-leiste a { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .15rem; padding: .45rem .3rem; border-radius: .6rem; text-decoration: none;
    color: var(--ink); background: var(--surface2); border: 1px solid var(--rand); font-weight: 700; font-size: .88rem; text-align: center; line-height: 1.15; min-width: 0; }
  .ez-leiste a span { max-width: 100%; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
    font-size: clamp(.62rem, 2.75vw, .84rem); line-height: 1.12; overflow-wrap: normal; word-break: normal; -webkit-hyphens: manual; hyphens: manual; }
  .ez-leiste a svg { width: 1.55rem; height: 1.55rem; color: var(--akzent); stroke-width: 1.9; flex: none; }
  :root.gross .ez-leiste a span { font-size: clamp(.72rem, 3.2vw, .98rem); }
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
  .ez-geraete > li > a, .ez-geraete > li > div { display: flex; align-items: stretch; border-radius: .65rem; background: var(--surface2); border: 1px solid var(--line);
    color: var(--ink); text-decoration: none; position: relative; overflow: hidden; }
  .ez-zeile-inhalt { flex: 1; min-width: 0; display: grid; grid-template-columns: 4.2rem minmax(0, 1fr); gap: .3rem .75rem; padding: .6rem; align-content: start; }
  /* Band rechts über die volle Höhe: grün beständig (mit Zeit bzw. Klasse), rot nicht beständig, gelb bedingt, grau ohne Angabe */
  .ez-band { flex: none; width: 5.6rem; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: .2rem; padding: .35rem .3rem; box-sizing: border-box; text-align: center; color: #fff; background: #6b7480; }
  .ez-band.gut { background: var(--good); } .ez-band.nicht { background: var(--crit); } .ez-band.bedingt { background: #c48a00; } .ez-band.gemischt { background: var(--ser); }
  .ez-band b { font-size: 1.25rem; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .ez-band.lang b { font-size: .95rem; }
  .ez-band small { font-size: .62rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; line-height: 1.15; opacity: .92; overflow-wrap: anywhere; }
  .ez-band em { font-style: normal; font-size: .68rem; font-weight: 700; line-height: 1.18; -webkit-hyphens: auto; hyphens: auto; overflow-wrap: break-word; max-width: 100%; }
  .ez-bild { width: 4.2rem; height: 4.2rem; border-radius: .45rem; background: var(--surface); border: 1px solid var(--line); object-fit: contain; grid-row: span 3;
    display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: .65rem; text-align: center; overflow: hidden; }
  /* Bild links über die ersten Zeilen, alles andere immer in der rechten Spalte (sonst rutschen weitere Listenzeilen unter das Bild) */
  .ez-zeile-inhalt > :not(.ez-bild) { grid-column: 2; min-width: 0; }
  .ez-geraete .ez-bild { grid-column: 1; grid-row: 1 / span 3; background: var(--bild-bg, var(--surface)); }
  .ez-geraete b { font-weight: 600; overflow-wrap: anywhere; }
  .ez-geraete .zeile { display: flex; gap: .4rem; flex-wrap: wrap; align-items: center; font-size: .8rem; color: var(--ink2); }
  .ez-geraete .eintrag { font-size: .8rem; color: var(--ink2); line-height: 1.35; display: flex; flex-direction: column; gap: .1rem; }
  .ez-geraete .eintrag + .eintrag { border-top: 1px solid var(--line); padding-top: .35rem; margin-top: .1rem; }
  .ez-geraete .eintrag .kopf { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .45rem; color: var(--ink); }
  .ez-geraete .eintrag .kopf .ez-stufe { font-size: .74rem; padding: .12rem .5rem; }
  .ez-geraete .eintrag i { color: var(--muted); font-style: normal; overflow-wrap: anywhere; }
  .ez-geraete .eintrag i b { color: var(--ink2); }
  .ez-ungeprueft { font-size: .68rem; font-weight: 700; color: var(--ser); border: 1px solid var(--ser); border-radius: .3rem; padding: 0 .3rem; white-space: nowrap; }
  .ez-gepr { font-size: .68rem; font-weight: 700; color: var(--good); border: 1px solid var(--good); border-radius: .3rem; padding: 0 .3rem; white-space: nowrap; }
  .ez-filter { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .6rem; }
  .ez-filter button { font: inherit; font-size: .8rem; padding: .3rem .6rem; border-radius: 1rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; }
  .ez-filter button.an { background: var(--akzent); border-color: var(--akzent); color: #fff; font-weight: 600; }
  .ez-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: .7rem; }
  /* Anordnung der Geräte (Liste, Symbole, 2×2, 3×3, 4×4, Groß) – gewählt mit .ez-anordnung, gemerkt je Gerät */
  .ez-raster-kopf { display: flex; flex-wrap: wrap; gap: .55rem .8rem; align-items: center; justify-content: space-between; margin: 0 0 .75rem; }
  .ez-raster-kopf .ez-filter { margin: 0; flex: 1 1 13rem; }
  .ez-anordnung { display: inline-flex; gap: .15rem; padding: .2rem; border-radius: .75rem; background: var(--surface2); border: 1px solid var(--rand); flex: none; margin-left: auto; }
  .ez-anordnung button { min-width: 2.35rem; height: 2.2rem; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: .55rem;
    background: transparent; color: var(--ink2); cursor: pointer; padding: 0 .35rem; font: inherit; font-size: .74rem; font-weight: 800; letter-spacing: -.02em; }
  .ez-anordnung button svg { width: 1.15rem; height: 1.15rem; }
  .ez-anordnung button[aria-checked="true"] { background: var(--akzent); color: #fff; }
  .ez-raster:not(.an-auto) a.bild-gross { grid-column: auto !important; }
  .ez-raster.an-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ez-raster.an-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
  .ez-raster.an-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem; }
  .ez-raster.an-3 .unter, .ez-raster.an-4 .unter { padding: .35rem .4rem .45rem; gap: .15rem; }
  .ez-raster.an-3 b, .ez-raster.an-4 b, .ez-raster.an-symbole b { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: break-word; -webkit-hyphens: auto; hyphens: auto; }
  .ez-raster.an-3 b { font-size: .78rem; -webkit-line-clamp: 3; } .ez-raster.an-3 small { font-size: .66rem; }
  .ez-raster.an-4 b { font-size: .68rem; -webkit-line-clamp: 3; line-height: 1.15; }
  .ez-raster.an-4 small, .ez-raster.an-4 .unter > span:last-child, .ez-raster.an-symbole small, .ez-raster.an-symbole .unter > span:last-child { display: none; }
  .ez-raster.an-symbole { grid-template-columns: repeat(auto-fill, minmax(4.7rem, 1fr)); gap: .75rem .5rem; }
  .ez-raster.an-symbole a { background: transparent; box-shadow: none; overflow: visible; align-items: stretch; text-align: center; }
  .ez-raster.an-symbole .foto { aspect-ratio: 1; border-radius: 1rem; box-shadow: var(--schatten); overflow: hidden; }
  .ez-raster.an-symbole .unter { padding: .35rem .05rem 0; align-items: center; }
  .ez-raster.an-symbole b { font-size: .68rem; font-weight: 600; -webkit-line-clamp: 2; line-height: 1.2; }
  .ez-raster.an-liste { grid-template-columns: 1fr; gap: .45rem; }
  .ez-raster.an-liste a { flex-direction: row; align-items: center; }
  .ez-raster.an-liste .foto { width: 4.4rem; flex: none; aspect-ratio: 1; align-self: stretch; }
  .ez-raster.an-liste .unter { flex: 1; min-width: 0; padding: .5rem .75rem; }
  .ez-raster.an-gross { grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr)); gap: .9rem; }
  .ez-raster.an-gross .foto { aspect-ratio: 16 / 10; } .ez-raster.an-gross b { font-size: 1.05rem; }
  .ez-raster a { display: flex; flex-direction: column; border-radius: .7rem; background: var(--surface); box-shadow: var(--schatten); overflow: hidden;
    color: var(--ink); text-decoration: none; }
  .ez-raster .foto { aspect-ratio: 4 / 3; background: var(--bild-bg, #fff); display: flex; align-items: center; justify-content: center; color: #6b7480; font-size: .75rem; overflow: hidden; }
  .ez-raster a.bild-gross { grid-column: span 2; }
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
  .ez-tabelle tr.wid > td:first-child { box-shadow: inset 4px 0 0 var(--warn); }
  .ez-gefahrnr { font-size: .86rem; line-height: 1.35; color: var(--ink2); } .ez-gefahrnr b { color: var(--ink); margin-right: .25rem; }
  .ez-gefahrnr .x { display: block; color: var(--crit); font-weight: 700; }
  #ez-tafel-platz:empty { display: none; } #ez-tafel-platz { margin-top: .7rem; color: var(--ink); }
  .ez-wid-zeichen, .ez-wid-text { color: var(--warn); font-weight: 700; } :root.hell .ez-wid-zeichen, :root.hell .ez-wid-text { color: #8a6100; }
  .ez-wid-badge { font-size: .68rem; font-weight: 700; color: #1a1300; background: var(--warn); border-radius: .3rem; padding: 0 .35rem; white-space: nowrap; }
  .ez-abw-wahl, .ez-abw-alle { display: flex; flex-wrap: wrap; gap: .35rem; margin: .35rem 0 .15rem; }
  .ez-abw-wahl .knopf, .ez-abw-alle .knopf { font-size: .78rem; padding: .35rem .6rem; }
  .ez-abw-wahl .knopf b { margin-left: .25rem; }
  li.ez-abw { margin-bottom: .45rem; }
  .ez-wid { display: flex; flex-direction: column; gap: .4rem; margin: .2rem 0 .6rem; } .ez-wid .ez-zeilen { margin: 0; } .ez-wid .knopf { align-self: flex-start; }
  .ez-legende { display: flex; gap: .4rem .8rem; flex-wrap: wrap; font-size: .78rem; color: var(--ink2); margin: .4rem 0 .6rem; }
  /* Auswertung durch den Mac-Helfer: Fortschritt */
  .ez-fortschritt { display: flex; flex-direction: column; gap: .35rem; }
  .ez-fortschritt .titel { display: flex; align-items: center; gap: .5rem; font-weight: 700; flex-wrap: wrap; }
  .ez-fortschritt .titel svg { width: 1.25rem; height: 1.25rem; flex: none; color: var(--akzent); }
  .ez-fortschritt .titel svg.dreht { animation: ez-drehen 1.8s linear infinite; }
  @keyframes ez-drehen { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .ez-fortschritt .titel svg.dreht { animation: none; } }
  .ez-fortschritt .balken { height: .75rem; border-radius: .5rem; background: var(--surface2); border: 1px solid var(--line); overflow: hidden; position: relative; }
  .ez-fortschritt .balken i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--akzent), color-mix(in srgb, var(--akzent) 65%, #fff)); transition: width .8s ease; }
  .ez-fortschritt .balken.unbestimmt i { width: 32%; animation: ez-laufen 1.5s ease-in-out infinite; }
  @keyframes ez-laufen { 0% { left: -32%; } 100% { left: 100%; } }
  @media (prefers-reduced-motion: reduce) { .ez-fortschritt .balken.unbestimmt i { animation: none; left: 0; width: 100%; opacity: .45; } }
  .ez-fortschritt .zeile { display: flex; justify-content: space-between; flex-wrap: wrap; gap: .2rem .8rem; font-size: .8rem; color: var(--ink2); }
  .ez-fortschritt .gross { font-variant-numeric: tabular-nums; font-weight: 800; color: var(--akzent); }
  .ez-raster .auswertung { font-size: .7rem; font-weight: 700; color: var(--akzent); }
  /* Spaltenwahl: welcher Werkstoff bzw. welche Ausführung gilt für unser Gerät */
  .ez-spalten { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .65rem; }
  .ez-spalte { font: inherit; display: flex; flex-direction: column; align-items: flex-start; gap: .05rem; padding: .45rem .75rem; min-height: 2.75rem; box-sizing: border-box;
    border-radius: .75rem; border: 2px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; text-align: left; max-width: 100%; }
  .ez-spalte b { font-size: .92rem; overflow-wrap: anywhere; } .ez-spalte small { font-size: .7rem; color: var(--muted); overflow-wrap: anywhere; }
  .ez-spalte.an { border-color: var(--akzent); background: color-mix(in srgb, var(--akzent) 16%, var(--surface2)); }
  .ez-spalte.an b::before { content: "✓ "; color: var(--akzent); }
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
  /* Gerätefoto im Rahmen – je Gerät einstellbar (info.txt „Bild:“): Hintergrund, Format, Größe, Darstellung */
  .ez-bildspalte { width: min(14rem, 100%); display: flex; flex-direction: column; gap: .45rem; }
  .ez-bildspalte.bild-klein { width: min(9rem, 100%); } .ez-bildspalte.bild-gross { width: min(24rem, 100%); }
  .ez-bildspalte > .knopf { align-self: flex-start; font-size: .8rem; padding: .3rem .6rem; display: inline-flex; align-items: center; gap: .3rem; text-decoration: none; }
  .ez-bildspalte > .knopf svg { width: 1em; height: 1em; }
  .ez-bildrahmen { display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: .6rem; width: 100%; box-sizing: border-box;
    aspect-ratio: 4 / 3; background: var(--bild-bg, #fff); border: 1px solid var(--line); }
  .ez-bildrahmen img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .ez-bildrahmen .leer { color: #6b7480; font-size: .8rem; }
  .bild-fuellen img, img.bild-fuellen { object-fit: cover !important; }
  /* Ausschnitt: Bild im Rahmen vergrößert (--bild-z) und um den Mittelpunkt (--bild-x/-y) verschoben – das Foto bleibt unverändert */
  .ez-bildrahmen img, .ez-raster .foto img, .ez-bildmini img { object-position: var(--bild-x, 50%) var(--bild-y, 50%);
    transform-origin: var(--bild-x, 50%) var(--bild-y, 50%); transform: scale(var(--bild-z, 1)); }
  .ez-bildmini { display: block; overflow: hidden; background: var(--bild-bg, #fff); }
  .ez-bildmini img { width: 100%; height: 100%; object-fit: contain; display: block; }
  a.ez-bildrahmen { position: relative; cursor: zoom-in; }
  a.ez-bildrahmen .lupe { position: absolute; right: .4rem; bottom: .4rem; width: 1.9rem; height: 1.9rem; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; background: rgba(0, 0, 0, .55); color: #fff; pointer-events: none; }
  a.ez-bildrahmen .lupe svg { width: 1rem; height: 1rem; }
  /* Bearbeiten: Ausschnitt mit dem Finger verschieben, mit zwei Fingern, Mausrad oder Regler zoomen */
  #gn-rahmen { touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }
  #gn-rahmen.zieht { cursor: grabbing; }
  #gn-rahmen img { pointer-events: none; -webkit-user-drag: none; }
  .ez-zoomzeile { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; }
  .ez-zoomzeile input[type=range] { flex: 1 1 8rem; min-width: 6rem; font-size: 16px; accent-color: var(--akzent); margin: 0; }
  .ez-zoomzeile .knopf { min-width: 2.3rem; padding: .3rem .55rem !important; font-weight: 800; }
  .ez-zoomzeile b { font-size: .82rem; min-width: 3.2rem; text-align: right; font-variant-numeric: tabular-nums; }
  /* Prüfung auf Wunsch */
  .ez-pruefen-zeile { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem .7rem; margin-top: .15rem; }
  .ez-pruefen-zeile .knopf.los { background: var(--akzent) !important; border-color: var(--akzent) !important; color: #fff !important; font-weight: 700; }
  .ez-pruefen-zeile .ez-klein { flex: 1; min-width: 12rem; }
  /* Gerät aus der Stoffsuche geöffnet: Hinweis oben, Liste auf den Stoff gefiltert */
  .ez-stoffbezug { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .8rem; margin-bottom: .8rem; }
  .ez-stoffbezug .knopf { margin: 0 !important; white-space: nowrap; }
  /* Lange Texte eingeklappt („Mehr zur Liste …“) */
  details.ez-mehr { border-top: 1px solid var(--line); padding-top: .45rem; margin-top: .1rem; }
  details.ez-mehr > summary { cursor: pointer; font-size: .84rem; font-weight: 600; color: var(--akzent); list-style: none; display: flex; align-items: center; gap: .4rem;
    -webkit-tap-highlight-color: transparent; }
  details.ez-mehr > summary::-webkit-details-marker { display: none; }
  details.ez-mehr > summary::before { content: "▸"; display: inline-block; transition: transform .15s ease; }
  details.ez-mehr[open] > summary::before { transform: rotate(90deg); }
  details.ez-mehr .inhalt { display: flex; flex-direction: column; gap: .55rem; margin-top: .5rem; font-size: .84rem; color: var(--ink2); line-height: 1.45; overflow-wrap: anywhere; }
  details.ez-mehr .inhalt b { display: block; color: var(--ink); font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; margin-bottom: .1rem; }
  /* Bearbeiten: Bildanzeige, Dateien, Gerät löschen */
  .ez-bildwahl { display: grid; grid-template-columns: minmax(0, 13rem) minmax(0, 1fr); gap: .9rem; align-items: start; }
  .ez-optionen { display: flex; flex-direction: column; gap: .65rem; min-width: 0; }
  .ez-optionen .gruppe { display: flex; flex-direction: column; gap: .3rem; }
  .ez-optionen .gruppe > span { font-size: .75rem; font-weight: 600; color: var(--ink2); }
  .ez-segment { display: flex; flex-wrap: wrap; gap: .35rem; }
  .ez-segment button { font: inherit; font-size: .8rem; padding: .4rem .65rem; border-radius: .5rem; border: 1px solid var(--rand); background: var(--surface2);
    color: var(--ink2); cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .ez-segment button.an { border-color: var(--akzent); background: color-mix(in srgb, var(--akzent) 18%, var(--surface2)); color: var(--ink); font-weight: 700; }
  .ez-farben button { width: 2.2rem; height: 2.2rem; padding: 0; border-radius: 50%; border: 2px solid var(--rand); background: var(--f); }
  .ez-farben button.auto { background: linear-gradient(135deg, #fff 0 50%, #2b3038 50% 100%); }
  .ez-farben button.an { outline: 3px solid var(--akzent); outline-offset: 2px; background: var(--f); }
  .ez-farben button.auto.an { background: linear-gradient(135deg, #fff 0 50%, #2b3038 50% 100%); }
  .ez-dateiliste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .45rem; }
  .ez-dateiliste li { display: grid; grid-template-columns: 2.7rem minmax(0, 1fr) auto; gap: .65rem; align-items: center; padding: .45rem .5rem;
    border-radius: .6rem; background: var(--surface2); border: 1px solid var(--line); }
  .ez-dateiliste .sym { width: 2.7rem; height: 2.7rem; border-radius: .45rem; display: flex; align-items: center; justify-content: center; font-size: .66rem;
    font-weight: 800; color: #fff; background: var(--c, #6b7480); overflow: hidden; }
  .ez-dateiliste .sym img { width: 100%; height: 100%; object-fit: cover; background: #fff; }
  .ez-dateiliste b { display: block; font-size: .88rem; font-weight: 600; overflow-wrap: anywhere; line-height: 1.25; }
  .ez-dateiliste small { display: block; font-size: .72rem; color: var(--muted); line-height: 1.3; }
  .knopf.weg { color: var(--crit) !important; border-color: color-mix(in srgb, var(--crit) 45%, var(--rand)) !important; display: inline-flex; align-items: center; gap: .3rem; }
  .knopf.weg svg { width: 1.05em; height: 1.05em; }
  .ez-gefahr { border: 1px solid color-mix(in srgb, var(--crit) 40%, var(--rand)); border-radius: .7rem; padding: .75rem .85rem; display: flex; flex-direction: column;
    gap: .5rem; align-items: flex-start; }
  @media (max-width: 640px) { .ez-bildwahl { grid-template-columns: 1fr; } .ez-bildwahl .ez-bildrahmen { max-width: 15rem; } }
  .ez-text { white-space: pre-wrap; font-size: .85rem; line-height: 1.45; overflow-wrap: anywhere; }
  @media (max-width: 900px) { .ez-ordner { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ez-kw { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) {
    .ez-held { padding: .9rem .8rem .95rem; }
    .ez-ordner { gap: .6rem; }
    .ez-ok:not(.breit) { display: flex; flex-direction: column; align-items: flex-start; gap: .45rem; min-height: 7.2rem; padding: .85rem .8rem .8rem; }
    .ez-ok:not(.breit) b { align-self: auto; } .ez-ok:not(.breit) small { align-self: auto; }
    .ez-ok.breit { grid-template-columns: auto minmax(0, 1fr); }
    .ez-ok.breit .fotos { grid-row: 3; grid-column: 1 / -1; margin-top: .45rem; }
  }
  @media (max-width: 640px) {
    .ez { --rand-l: calc(.5rem + var(--sicher-links)); --rand-r: calc(.5rem + var(--sicher-rechts)); gap: .65rem; }
    .ez-kopf { gap: .5rem; padding: .3rem .5rem .3rem .4rem; }
    .ez-kopf img { height: 3.1rem; }
    .ez-titel h1 { font-size: 1.15rem; }
    .ez-karte { padding: .7rem .7rem .8rem; }
    .ez-zweispaltig { grid-template-columns: 1fr; }
    .ez-symbole figure { width: 4.1rem; }
    .ez-kopf .knopf .lang { display: none; }
  }
  @media (max-width: 480px) {
    /* Hell/Dunkel steckt auf dem Handy im Zahnrad-Menü – mehr Platz für den Titel */
    .ez-kopf:has(.einst:not([hidden])) .modus { display: none; }
    .ez-titel h1 { font-size: 1.08rem; }
    .ez-leiste a { font-size: .8rem; }
    .ez-ausbr b { font-size: 1.12rem; }
  }
  @media (max-width: 360px) { .ez-suchfeld input { font-size: 17px; } .ez-suchfeld { padding-left: .6rem; } .ez-zuletzt { width: 8.6rem; } }
  @media (max-width: 380px) {
    .ez-zeile-inhalt { grid-template-columns: 3.6rem minmax(0, 1fr); gap: .3rem .6rem; }
    .ez-geraete .ez-bild { width: 3.6rem; height: 3.6rem; }
    .ez-band { width: 5rem; } .ez-band b { font-size: 1.05rem; } .ez-band.lang b { font-size: .82rem; } .ez-band em { font-size: .64rem; }
    .ez > .ez-kopf .ez-titel h1 { font-size: 1.25rem; }
  }
  @media (max-width: 380px) { .ez-ordner { gap: .5rem; } .ez-ok { padding: .75rem .65rem .7rem; } .ez-kw { gap: .4rem; } .ez-kw > div:not(.ez-ausbr) { padding: .45rem .5rem; } .ez-aegl th, .ez-aegl td { font-size: .76rem; padding: .28rem .1rem; } .ez-aegl th:first-child, .ez-aegl td:first-child { width: 3.3rem; }
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
    muell: SVG('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14"/>'),
    wind: SVG('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>'),
    tafel: SVG('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 12h18"/>'),
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
    pfeil: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>').replace('stroke-width="2"', 'stroke-width="2.6"'),
    ziffern: SVG('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>').replace('stroke-width="2"', 'stroke-width="2.4"'),
  };
  // Piktogramme der Reiter einer Stoffseite (24 × 24, gleiche Strichstärke): Datenblatt, Beständigkeit (Schild mit Tropfen),
  // PSA (Chemikalienschutzanzug), Erste Hilfe/Dekon (Kreuz mit Tropfen), Absperren (Ort im gestrichelten Gefahrenbereich)
  const REITER = {
    datenblatt: SVG('<path d="M6.5 2.8h7.6l4.4 4.4v13.9h-12z"/><path d="M14 2.8v4.5h4.5"/><path d="M9.2 11.5h6.3M9.2 14.7h6.3M9.2 17.9h4"/>'),
    bestaendigkeit: SVG('<path d="M12 2.6 4.6 5.6v5.7c0 4.6 3.1 8.2 7.4 9.9 4.3-1.7 7.4-5.3 7.4-9.9V5.6z"/><path d="M12 8.1c-1.9 2.5-2.9 4-2.9 5.3a2.9 2.9 0 0 0 5.8 0c0-1.3-1-2.8-2.9-5.3z"/>'),
    psa: SVG('<circle cx="12" cy="5.4" r="2.9"/><path d="M10.6 5.3h2.8"/><path d="M9.3 9.3 5.6 12l1.5 2 2.3-1.6V21h2.2l.4-4.6.4 4.6h2.2v-8.6l2.3 1.6 1.5-2-3.7-2.7"/>'),
    eh: SVG('<path d="M7.5 3.5h4.2v4.2h4.2v4.2h-4.2v4.2H7.5v-4.2H3.3V7.7h4.2z"/><path d="M18.2 13.6c-1.4 1.9-2.1 3-2.1 3.9a2.1 2.1 0 0 0 4.2 0c0-.9-.7-2-2.1-3.9z"/>'),
    lage: SVG('<circle cx="12" cy="12" r="9.2" stroke-dasharray="2.4 2.6"/><path d="M12 17.6s-3.7-3.3-3.7-6.4a3.7 3.7 0 0 1 7.4 0c0 3.1-3.7 6.4-3.7 6.4z"/><circle cx="12" cy="11.2" r="1.2"/>'),
  };
  // Stoffnamen lesbar: „Wasserstoffperoxid 35 ... <50 %“ → „Wasserstoffperoxid 35 bis < 50 %“
  const nameSchoen = n => String(n || '').replace(/\s?(?:\.\.\.|…)\s?/g, ' bis ').replace(/([<>≤≥])(?=\d)/g, '$1 ').replace(/\s{2,}/g, ' ').trim();
  const ORDNER_STIL = { [BL]: ['var(--good)', I.schild], 'A-Lage': ['#e3b100', SVG('<circle cx="12" cy="12" r="2"/><path d="M12 4a8 8 0 0 1 6.9 4L14 11M12 4a8 8 0 0 0-6.9 4L10 11M5.1 16A8 8 0 0 0 12 20l0-6M18.9 16A8 8 0 0 1 12 20"/>')],
    'B-Lage': ['#c25bd6', SVG('<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>')],
    'C-Lage': ['var(--ser)', SVG('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>')],
    'Führungsunterstützung': ['var(--akzent)', SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')],
    Messen: ['#2bb3c0', SVG('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6v4H9zM9 15h.01M12 15h.01M15 15h.01M9 18h6"/>')],
    Probenahme: ['#7e8a96', SVG('<path d="M9 3h6M10 3v15a2 2 0 0 0 4 0V3"/><path d="M10 10h4"/>')],
    'Eigene Datenblätter': ['#2b6cc4', SVG('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>')],
    Einsatzberichte: ['var(--crit)', SVG('<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>')] };
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
      (logo ? (GSZ.logoOriginal ? `<img class="ez-logo" src="${GSZ.logoOriginal}" alt="">` : GSZ.logos()) : '') +
      `<div class="ez-titel"><h1 lang="de">${trennstellen(esc(titel))}</h1>${unter ? `<div>${unter}</div>` : ''}</div>` +
      `<a class="knopf" href="${haus}" title="Hauptmenü" aria-label="Hauptmenü">${I.haus}<span class="lang">Menü</span></a>` +
      `<button class="knopf gross-knopf" type="button" aria-pressed="false" title="Handschuh-Modus: große Schrift und Knöpfe – an/aus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 21v-4.5L5 13V8.5a1.5 1.5 0 0 1 3 0V11V5.5a1.5 1.5 0 0 1 3 0V10V4.5a1.5 1.5 0 0 1 3 0V10V6a1.5 1.5 0 0 1 3 0v8.5l-2 2.2V21z"/><path d="M7.5 18.5h8"/></svg><span class="lang" data-gross-text>Handschuh</span></button>` +
      `<button class="knopf modus" title="Hell / Dunkel">◐</button><button class="knopf einst" title="Einstellungen" hidden>⚙</button>`;
    GSZ.modusKnopf(h.querySelector('.modus'));
    if (GSZ.grossKnopf) GSZ.grossKnopf(h.querySelector('.gross-knopf')); else h.querySelector('.gross-knopf').remove();
    GSZ.einstellungenKnopf(h.querySelector('.einst'));
    const z = h.querySelector('[data-zurueck]');
    if (z) z.addEventListener('click', () => GSZ.zurueck(z.dataset.zurueck));
    requestAnimationFrame(() => titelEinpassen(h));
    return h;
  }
  // Bevorzugte Trennstellen langer Wörter (weiches Trennzeichen), damit „Beständigkeits-/listen“ statt „Beständigkeitslist/en“
  const TRENN = [['Beständigkeitslisten', 'Beständigkeits\u00ADlisten'], ['Beständigkeiten', 'Beständig\u00ADkeiten'], ['Sicherheitsdatenblatt', 'Sicherheits\u00ADdaten\u00ADblatt'],
    ['Stoffdatenblatt', 'Stoff\u00ADdaten\u00ADblatt'], ['Führungsunterstützung', 'Führungs\u00ADunter\u00ADstützung'], ['Einsatzberichte', 'Einsatz\u00ADberichte'],
    ['Datenblätter', 'Daten\u00ADblätter'], ['Dokumentation', 'Dokumen\u00ADtation'], ['Schutzkleidung', 'Schutz\u00ADkleidung']];
  const trennstellen = t => TRENN.reduce((x, [w, m]) => x.split(w).join(m), t);
  // Titel einpassen: höchstens zwei Zeilen, ein einzelnes Wort möglichst in einer – sonst kleiner; erst ganz zuletzt freie Trennung
  function titelEinpassen(h) {
    const t = h && h.querySelector('.ez-titel h1');
    if (!t || !t.isConnected || !t.clientWidth) return;
    t.style.fontSize = ''; t.classList.remove('frei');
    const zeilen = () => Math.round(t.scrollHeight / (parseFloat(getComputedStyle(t).lineHeight) || 1));
    const einWort = !/\s/.test(t.textContent.trim());
    let gr = parseFloat(getComputedStyle(t).fontSize);
    while (gr > 14 && (t.scrollWidth > t.clientWidth + 1 || zeilen() > (einWort ? 1 : 2))) { gr -= 1; t.style.fontSize = gr + 'px'; }
    if (t.scrollWidth > t.clientWidth + 1 || zeilen() > 2) t.classList.add('frei');
  }
  addEventListener('resize', () => { clearTimeout(titelEinpassen.t); titelEinpassen.t = setTimeout(() => { for (const h of document.querySelectorAll('main.aktiv .ez-kopf')) titelEinpassen(h); }, 150); });
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
      if (i >= 0) { const u = rest.slice(0, i); if (!ordner && u.startsWith('_')) continue; const e = unter.get(u) || { name: u, anzahl: 0 }; if (!d.ordner) e.anzahl++; unter.set(u, e); continue; }
      if (d.ordner) { if (!ordner && rest.startsWith('_')) continue; if (!unter.has(rest)) unter.set(rest, { name: rest, anzahl: 0 }); continue; }
      if (/^(\.|liesmich\.txt$|bestaendigkeit.*\.json$|datenblatt\.json$|bericht\.json$)/i.test(rest)) continue;
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
      // Prüfauftrag aus der App (pruefen.json): wartet auf den Mac-Helfer, ggf. mit Fehlversuchen
      const pruef = namen.find(n => n.toLowerCase() === B.PRUEF_DATEI);
      if (pruef) { try { g.pruefAuftrag = JSON.parse(await (await ad().datei(`${BL}/${u.name}/${pruef}`)).text()) || {}; } catch { g.pruefAuftrag = {}; } }
      if (g.info) {
        try { const inf = B.infoLesen(await (await ad().datei(g.info)).text()); g.kategorieInfo = inf.kategorie; g.infoText = inf.text; g.spaltenWahl = inf.spalten; g.bild = inf.bild; }
        catch { /* ohne Angaben */ }
      }
      spaltenAnwenden(g);
      liste.push(g);
    }
    geraeteCache = liste;
    return liste;
  }
  // „Spalten:“ aus info.txt (unsere Werkstoffe bzw. Ausführung) geht vor dem Vorschlag der Auswertung
  function spaltenAnwenden(g) {
    const L = g.daten && g.daten.liste;
    if (!L) return;
    if (!g.relevantClaude) g.relevantClaude = [...(L.relevant || [])];
    const wahl = (g.spaltenWahl || []).filter(id => L.spalten.some(s => s.id === id));
    L.relevant = wahl.length ? wahl : [...g.relevantClaude];
    g.relevantVon = wahl.length ? 'wahl' : L.relevant.length ? 'auswertung' : '';
  }
  const kategorie = g => g.kategorieInfo || (g.daten && g.daten.geraet && g.daten.geraet.kategorie) || 'Sonstiges';
  // Bildanzeige je Gerät (info.txt „Bild:“): Hintergrund, Format (Seitenverhältnis), Größe, Darstellung (ganz zeigen / Rahmen füllen)
  const BILD_FARBE = { weiss: '#ffffff', hell: '#e3e7ec', dunkel: '#2b3038', schwarz: '#000000', rot: '#b3121b' };
  const bildVon = g => ({ ...B.BILD_STANDARD, ...((g && g.bild) || {}) });
  const bildStil = (b, mitFormat = true) => { const [w, h] = String(b.format || '').split(':').map(Number);
    const z = Number(b.zoom) || 1, x = Number(b.x ?? 50), y = Number(b.y ?? 50);
    return (mitFormat && w && h ? `aspect-ratio:${w} / ${h};` : '') + (BILD_FARBE[b.hintergrund] ? `--bild-bg:${BILD_FARBE[b.hintergrund]};` : '') +
      (z !== 1 || x !== 50 || y !== 50 ? `--bild-z:${Math.round(z * 1000) / 1000};--bild-x:${Math.round(x * 10) / 10}%;--bild-y:${Math.round(y * 10) / 10}%;` : ''); };
  const bildFuellen = b => b.darstellung === 'fuellen' ? ' bild-fuellen' : '';
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
  const ART_HINWEIS = 'Name, UN-Nr., CAS-Nr. oder Formel – z. B. 1005, 7664-41-7, NH3';
  const platzhalter = zahl => zahl ? (innerWidth <= 360 ? 'UN-Nummer' : 'UN-Nummer, z. B. 1005') : (innerWidth <= 360 ? 'Stoff oder Nummer' : 'Name, UN- oder CAS-Nr.');
  function einsatzAufbauen() {
    eEl.innerHTML = '';
    const kp = kopf({ titel: 'Einsatz', unter: 'Gefahrstoffzug · Teileinheit Miehlen', logo: true });
    kp.classList.add('mit-suche');
    const kpUnter = kp.querySelector('.ez-titel div');
    if (kpUnter) kpUnter.id = 'ez-kopf-status';
    eEl.appendChild(kp);
    // Stoffsuche
    const held = document.createElement('section');
    held.className = 'ez-held ez-suche';
    held.setAttribute('aria-label', 'Stoffsuche');
    held.innerHTML = `<div class="ez-held-kopf"><b>Stoff suchen</b><small>GESTIS</small></div>
      <form id="ez-form" class="ez-suchfeld" role="search"><span class="lupe">${I.suche}</span>
        <input type="search" id="ez-q" placeholder="${platzhalter(false)}" enterkeyhint="search" autocomplete="off" autocapitalize="off" autocorrect="off"
          spellcheck="false" aria-label="Stoff suchen: Name, UN-Nummer, CAS-Nummer oder Summenformel">
        <button type="button" class="ez-leeren" id="ez-leeren" aria-label="Eingabe löschen" hidden>×</button>
        <button type="submit" class="ez-los" aria-label="Suchen">${I.pfeil}</button></form>
      <div class="ez-held-unter"><button type="button" class="ez-un" id="ez-zahlen" aria-pressed="false" title="Zifferntastatur für UN-Nummern">${I.ziffern}UN-Nr.</button>
        ${window.GSZLage ? `<button type="button" class="ez-un" id="ez-tafel-knopf" aria-pressed="false" title="Warntafel eintippen oder fotografieren">${I.tafel}Warntafel</button>` : ''}
        <span class="ez-art" id="ez-art">${ART_HINWEIS}</span></div>
      <div id="ez-tafel-platz"></div>
      <div id="ez-erg"></div>
      <div class="ez-import-zeile"><label class="ez-import-knopf"><span class="sym">${I.blatt}</span>
        <span><b>Sicherheitsdatenblatt importieren</b><small>Foto oder PDF – Kennwerte, GHS, UN-Nr., Löschmittel und PSA</small></span><span class="pfeil">›</span>
        <input type="file" id="ez-sdb-datei" accept="image/*,application/pdf,.pdf" multiple aria-label="Sicherheitsdatenblatt importieren (Bild oder PDF)"></label></div>`;
    eEl.appendChild(held);
    // Lage: Wind vom DWD (Warntafel über den Knopf in der Suche)
    if (window.GSZLage) eEl.insertAdjacentHTML('beforeend', GSZLage.startHtml());
    // zuletzt geöffnet, eigene Datenblätter, Unterlagen, Stand
    const zl = document.createElement('section');
    zl.className = 'ez-bereich'; zl.id = 'ez-letzte-bereich'; zl.hidden = true;
    zl.innerHTML = '<h2>Zuletzt geöffnet <small>auch ohne Netz</small></h2><div class="ez-letzte" id="ez-letzte"></div>';
    eEl.appendChild(zl);
    const eg = document.createElement('section');
    eg.className = 'ez-bereich'; eg.id = 'ez-eigene';
    eEl.appendChild(eg);
    const o = document.createElement('section');
    o.className = 'ez-bereich';
    o.innerHTML = '<h2>Unterlagen</h2><nav class="ez-ordner" id="ez-ordner" aria-label="Einsatz-Ordner"></nav>';
    eEl.appendChild(o);
    const st = document.createElement('div');
    st.className = 'ez-status'; st.id = 'ez-status';
    eEl.appendChild(st);
    // Bedienung
    const f = held.querySelector('#ez-form'), q = held.querySelector('#ez-q'), leeren = held.querySelector('#ez-leeren'), zahlen = held.querySelector('#ez-zahlen');
    const imp = held.querySelector('#ez-sdb-datei');
    imp.addEventListener('change', () => {
      const liste = [...imp.files]; imp.value = '';
      if (!liste.length) return;
      if (window.GSZSdbImport && GSZSdbImport.importieren) GSZSdbImport.importieren(liste); else meldung('Import nicht verfügbar.');
    });
    const artZeigen = () => {
      const a = G.anfrageArt(q.value);
      held.querySelector('#ez-art').innerHTML = a ? `erkannt: <b>${esc(G.ART_TEXT[a.art])}${a.art !== 'name' ? ' ' + esc(a.wert) : ''}</b>` : esc(ART_HINWEIS);
      leeren.hidden = !q.value;
      return a;
    };
    q.value = suchText;
    artZeigen();
    f.addEventListener('submit', e => { e.preventDefault(); q.blur(); suchen(q.value, true); });
    q.addEventListener('input', () => {
      suchText = q.value;
      const a = artZeigen();
      clearTimeout(suchen.t);
      if (!q.value.trim()) { held.querySelector('#ez-erg').innerHTML = ''; suchErgebnis = null; return; }
      if (a && (a.art === 'name' ? q.value.trim().length >= 3 : a.art === 'formel' ? q.value.trim().length >= 2 : true)) suchen.t = setTimeout(() => suchen(q.value, false), 650);
    });
    leeren.addEventListener('click', () => { q.value = ''; suchText = ''; suchErgebnis = null; held.querySelector('#ez-erg').innerHTML = ''; artZeigen(); q.focus(); });
    // Zifferntastatur für UN-Nummern (am iPhone), wieder umschaltbar
    zahlen.addEventListener('click', () => {
      const an = zahlen.getAttribute('aria-pressed') !== 'true';
      zahlen.setAttribute('aria-pressed', String(an));
      q.setAttribute('inputmode', an ? 'numeric' : 'text');
      q.placeholder = platzhalter(an);
      q.focus();
    });
    const tafelKnopf = held.querySelector('#ez-tafel-knopf'), tafelPlatz = held.querySelector('#ez-tafel-platz');
    if (tafelKnopf) tafelKnopf.addEventListener('click', () => {
      const an = tafelKnopf.getAttribute('aria-pressed') !== 'true';
      tafelKnopf.setAttribute('aria-pressed', String(an));
      if (!an) { tafelPlatz.innerHTML = ''; return; }
      const { uF } = GSZLage.warntafelOeffnen(tafelPlatz, { suchen: t => { q.value = t; suchText = t; artZeigen(); suchen(t, true); } });
      uF.focus();
    });
    if (suchErgebnis) trefferZeigen(suchErgebnis);
  }
  let suchNr = 0;
  async function suchen(text, gezielt) {
    const nr = ++suchNr;
    if (!eEl.firstChild) einsatzAufbauen();
    const feld = eEl.querySelector('#ez-q');
    if (feld && feld.value !== text) {
      feld.value = text; suchText = text;
      const l = eEl.querySelector('#ez-leeren'), art = eEl.querySelector('#ez-art'), aa = G.anfrageArt(text);
      if (l) l.hidden = !text;
      if (art) art.innerHTML = aa ? `erkannt: <b>${esc(G.ART_TEXT[aa.art])}${aa.art !== 'name' ? ' ' + esc(aa.wert) : ''}</b>` : esc(ART_HINWEIS);
    }
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
    // UN-Nummer: Benennung nach ADR, Gefahrnummer und Absperrabstände (ERG) – auch ohne Netz
    const unInfo = () => {
      if (r.art !== 'un' || !window.GSZGefahrgut || !window.GSZLage) return '';
      const n = GSZGefahrgut.unEintraege(r.wert);
      if (!n.length) return '';
      return `<div class="kachel ez-karte" style="margin-top:.6rem"><h2>UN ${esc(r.wert)} nach ADR</h2><ul class="ez-zeilen">${n.slice(0, 6).map(x => `<li data-z="•">${esc(x.name)}${x.klasse ? ` · Klasse ${esc(x.klasse)}` : ''}${x.gefahrnummer ? ` · Gefahrnr. ${esc(x.gefahrnummer)}` : ''}</li>`).join('')}</ul>
        <p style="margin:.5rem 0 0"><button class="knopf" type="button" data-tafel-un="${esc(r.wert)}" data-tafel-k="${esc(n[0].gefahrnummer || '')}">${I.tafel}Warntafel, Gefahrnummer und Absperrabstände</button></p></div>`;
    };
    const unKnopf = () => { const b = erg.querySelector('[data-tafel-un]'); if (!b) return;
      b.addEventListener('click', () => { const platz = eEl.querySelector('#ez-tafel-platz'), k = eEl.querySelector('#ez-tafel-knopf');
        if (!platz) return; if (k) k.setAttribute('aria-pressed', 'true'); GSZLage.warntafelOeffnen(platz, { suchen: t => suchen(t, true), kemler: b.dataset.tafelK, un: b.dataset.tafelUn });
        platz.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); };
    if (!r.treffer.length) {
      erg.innerHTML = (r.offline ? `<div class="ez-warn">Keine Verbindung zu GESTIS (${esc(r.fehler)}). Offline sind nur zuletzt geöffnete Stoffe abrufbar – dieser ist nicht dabei.</div>`
        : `<div class="ez-leer">Kein Treffer in GESTIS für ${esc(G.ART_TEXT[r.art])} „${esc(r.wert)}“.` +
          (r.art === 'un' ? ' Für manche UN-Nummern (z. B. Gemische wie 1965 Flüssiggas) gibt es kein GESTIS-Datenblatt – nach dem Stoffnamen suchen.' : '') + '</div>') + unInfo();
      unKnopf();
      return;
    }
    erg.innerHTML = (r.offline ? '<div class="ez-warn" style="margin-top:.6rem">Offline – Treffer aus den zuletzt geöffneten Stoffen.</div>' : '') +
      `<ul class="ez-treffer">${r.treffer.map(t => `<li><a href="#stoff/${esc(t.zvg)}"><b>${esc(nameSchoen(t.name))}</b><span class="pfeil">›</span>
        <small>${t.cas ? 'CAS ' + esc(t.cas) : 'ohne CAS-Nr.'}${r.art === 'un' ? (t.unOk ? ` · <span class="ok">UN ${esc(r.wert)} ✓</span>` : t.unOk === false ? ' · Treffer über die GESTIS-Nr., nicht über die UN-Nr.' : '') : ''}</small></a></li>`).join('')}</ul>` + (r.offline ? unInfo() : '');
    unKnopf();
  }
  const datumKurz = d => { d = new Date(d); if (isNaN(d)) return ''; const h = new Date();
    const tag = d.toDateString() === h.toDateString() ? 'heute' : new Date(h - 864e5).toDateString() === d.toDateString() ? 'gestern' : `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`;
    return `${tag}, ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  function miniTafel(t) {
    return t && t.un ? `<span class="ez-mini-tafel" aria-label="Warntafel ${esc(t.kemler || '')} ${esc(t.un)}"><b>${esc(t.kemler || '–')}</b><b>${esc(t.un)}</b></span>`
      : '<span class="ez-mini-tafel leer" aria-label="kein Gefahrgut-Eintrag"><b>–</b><b>–</b></span>';
  }
  async function letzteZeigen() {
    const el = eEl.querySelector('#ez-letzte'), bereich = eEl.querySelector('#ez-letzte-bereich');
    if (!el) return;
    const l = await zuletzt(12);
    if (bereich) bereich.hidden = !l.length;
    el.innerHTML = l.map(s => `<a class="ez-zuletzt" href="#stoff/${esc(s.zvg)}" title="zuletzt geöffnet ${esc(datumZeit(s.zeit))} – auch offline">
      ${miniTafel(s.stoff && s.stoff.transport)}<span class="name">${esc(nameSchoen(s.name))}</span><small>${esc(datumKurz(s.zeit))}</small></a>`).join('');
  }
  async function eigeneZeigen() {
    const el = eEl.querySelector('#ez-eigene');
    if (!el) return;
    let l = [];
    try { l = (await SP.alle('sdb')).map(x => x.wert).sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))).slice(0, 6); } catch { /* ohne */ }
    el.hidden = !l.length;
    const geteilt = l.some(d => d.geteilt);
    // geteilte Datenblätter der anderen Geräte: abgleichen, sobald sich in der Dropbox etwas daran geändert hat
    const stand = dateien.filter(d => !d.ordner && /^Eigene Datenblätter\/[^/]+\/datenblatt\.json$/i.test(String(d.pfad).normalize('NFC'))).map(d => d.pfad + '|' + (d.rev || d.groesse || '')).join(',');
    if (stand && stand !== eigeneZeigen.stand && window.GSZSdbImport && GSZSdbImport.abgleichen) {
      eigeneZeigen.stand = stand;
      GSZSdbImport.abgleichen().then(n => { if (n) eigeneZeigen(); }).catch(() => { eigeneZeigen.stand = ''; });
    }
    el.innerHTML = l.length ? `<h2>Eigene Datenblätter <small>${geteilt ? 'für alle Geräte (Dropbox)' : 'auf diesem Gerät'}</small></h2><ul class="ez-treffer" style="margin-top:0">${l.map(d => `<li><a href="#sdb/${esc(d.id)}">
      <b>${esc(nameSchoen((d.claude && d.claude.name) || (d.ocr && d.ocr.name) || d.name || 'Sicherheitsdatenblatt'))}</b><span class="pfeil">›</span>
      <small>${esc(datumZeit(d.zeit))} · ${esc(window.GSZSdbImport ? GSZSdbImport.statusText(d) : '')}</small></a></li>`).join('')}</ul>` : '';
  }
  function ordnerZeigen() {
    const el = eEl.querySelector('#ez-ordner');
    if (!el) return;
    const { unter } = inhalt('');
    const namen = [...new Set([...ORDNER_REIHE, ...unter.map(u => u.name)])];
    const a = ad(), web = !!(a && a.art === 'web');
    const verbunden = !!(a && a.verbunden());
    el.innerHTML = namen.map(n => {
      const [farbe, icon] = ORDNER_STIL[n] || ['var(--akzent)', I.ordner];
      const dd = dateien.filter(d => !d.ordner && d.pfad.startsWith(n + '/') && !/(^|\/)(\.|liesmich\.txt$|bestaendigkeit.*\.json$|info\.(txt|md)$)/i.test(d.pfad));
      let meta;
      if (n === BL) { const g = inhalt(BL).unter.length; meta = g ? `${g} Gerät${g === 1 ? '' : 'e'} und PSA` : verbunden ? 'noch leer – Gerät anlegen' : '–'; }
      else meta = dd.length ? `${dd.length} Datei${dd.length === 1 ? '' : 'en'}` : verbunden ? 'noch leer' : '–';
      meta = esc(meta);
      if (web && dd.length) {
        const gewollt = dd.filter(d => d.wahl !== 'online'), off = gewollt.filter(d => d.offline).length;
        if (gewollt.length) meta += off === gewollt.length ? ' · <span class="gut">✓ offline</span>' : ` · ${off}/${gewollt.length} offline`;
      }
      const anzeige = esc(n).replace('Führungsunterstützung', 'Führungs&shy;unterstützung').replace('Beständigkeitslisten', 'Beständigkeits&shy;listen');
      return `<a class="ez-ok${n === BL ? ' breit' : ''}" href="#ordner/${kodiere(n)}" style="--c:${farbe}"><span class="sym">${icon}</span><b>${anzeige}</b><small>${meta}</small>` +
        `${n === BL ? '<span class="fotos" id="ez-bl-fotos"></span>' : ''}</a>`;
    }).join('');
    blFotos();
  }
  // Beständigkeitslisten-Kachel: Fotos der ersten Geräte
  async function blFotos() {
    const box = eEl.querySelector('#ez-bl-fotos');
    if (!box || !ad() || !ad().verbunden() || !dateien.length) return;
    let g = [];
    try { g = (await geraete()).filter(x => x.foto).slice(0, innerWidth <= 360 ? 3 : 4); } catch { return; }
    if (!box.isConnected) return;
    box.innerHTML = g.map(x => `<span class="ez-bildmini" style="${bildStil(bildVon(x), false)}"><img data-foto="${esc(x.foto)}" alt=""></span>`).join('');
    fotoEinsetzen(box);
  }
  function statusZeigen() {
    const el = eEl.querySelector('#ez-status'), kp = eEl.querySelector('#ez-kopf-status');
    const a = ad();
    const online = navigator.onLine !== false;
    const kopfText = (punkt, text) => { if (kp) kp.innerHTML = `<span class="ez-punkt ${punkt}"></span>${esc(text)}`; };
    if (!el) return;
    if (!a) { el.textContent = ''; kopfText(online ? '' : 'aus', online ? 'Online' : 'Offline'); return; }
    if (!a.verbunden()) {
      kopfText(online ? 'warte' : 'aus', online ? 'Online · Unterlagen nicht verbunden' : 'Offline · nur gespeicherte Stoffe');
      el.innerHTML = `<span class="text"><span>${a.art === 'web' ? 'Unterlagen: nicht mit Dropbox verbunden' : 'Dropbox-Ordner auf diesem Rechner nicht gefunden'}</span></span>` +
        (a.verbinden ? '<button class="knopf" id="ez-verbinden">Mit Dropbox verbinden</button>' : '');
      const v = el.querySelector('#ez-verbinden');
      if (v) v.addEventListener('click', () => a.verbinden());
      return;
    }
    const d = dateien.filter(x => !x.ordner);
    const teile = [];
    let gewollt = d, off = d.length;
    if (a.art === 'web') {
      gewollt = d.filter(x => x.wahl !== 'online'); off = gewollt.filter(x => x.offline).length;
      const nurOnline = d.length - gewollt.length;
      teile.push(`Offline verfügbar: ${off} von ${gewollt.length} Dateien` + (nurOnline ? ` · ${nurOnline} nur online` : ''));
    } else teile.push(`${d.length} Dateien im Dropbox-Ordner`);
    if (listeStand) teile.push('Stand ' + datumZeit(listeStand));
    const lauf = a.fortschritt && a.fortschritt();
    if (lauf) teile.push('Abgleich: ' + lauf);
    el.innerHTML = `<span class="text">${teile.map(t => `<span>${esc(t)}</span>`).join('')}${listeFehler ? `<span class="fehler">⚠ ${esc(listeFehler)}</span>` : ''}</span>` +
      '<button class="knopf" id="ez-abgleich">Abgleichen</button>';
    el.querySelector('#ez-abgleich').addEventListener('click', () => { listeHolen(true); meldung('Wird abgeglichen …', 2500); });
    if (!online) kopfText('aus', 'Offline · gespeicherte Daten');
    else if (lauf) kopfText('warte', 'Online · Unterlagen werden geladen');
    else if (a.art === 'web') kopfText(off === gewollt.length ? '' : 'warte', off === gewollt.length ? 'Online · Unterlagen offline bereit' : `Online · ${off} von ${gewollt.length} Unterlagen offline`);
    else kopfText('', 'Online · Dropbox-Ordner verbunden');
    GSZ.kachelInfo('einsatz', `Stoffsuche · ${d.length} Datei${d.length === 1 ? '' : 'en'} in den Ordnern` +
      (a.art === 'web' ? ` · <span class="${off === gewollt.length ? 'gut' : 'warn'}">${off} offline</span>` : ''));
  }
  addEventListener('online', () => { if (GSZ.aktuell.ansicht === 'einsatz') statusZeigen(); });
  addEventListener('offline', () => { if (GSZ.aktuell.ansicht === 'einsatz') statusZeigen(); });
  GSZ.ansicht('einsatz', {
    element: eEl, titel: () => 'Einsatz',
    anzeigen() { if (!eEl.firstChild) einsatzAufbauen(); letzteZeigen(); eigeneZeigen(); ordnerZeigen(); statusZeigen(); listeHolen(false);
      if (window.GSZLage) { const l = eEl.querySelector('#lg-start'); if (l) GSZLage.beleben(l); } },
    einrichten(adapter) {
      if (adapter.einsatz && adapter.einsatz.abruf) G.setzeAbruf(adapter.einsatz.abruf);
      if (adapter.einsatz && adapter.einsatz.beiAenderung) adapter.einsatz.beiAenderung(() => listeHolen(false));
      setTimeout(() => listeHolen(false), 300);
    },
  });

  // ---------------------------------------------------------------- Einsatzbildschirm (GESTIS und eigenes Datenblatt)
  const sEl = ansichtElement('stoffansicht');
  const TEILE = { '': 'Übersicht', datenblatt: 'Stoffdatenblatt', bestaendigkeit: 'Beständigkeiten', psa: 'PSA', eh: 'Erste Hilfe · Dekontamination', lage: 'Wind · Absperren' };
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
    return `<div class="ez-ausbr ${a.art}" role="group" aria-label="Ausbreitung von Gas bzw. Dämpfen"><span class="pfeil">${pfeil}</span>
      <span class="ueber">Ausbreitung · ${a.gas ? 'Gas' : 'Dämpfe'}</span><b>${esc(a.titel)}</b><div class="was">${a.was}</div>
      ${a.lvzText ? `<div class="lvz">${esc(a.lvzText)}</div>` : ''}
      ${a.punkte.length ? `<ul>${a.punkte.map(p => typeof p === 'string' ? `<li>${p}</li>` : p.zitat ? `<li>„${esc(p.text)}“ <i>(${quelle})</i></li>`
        : `<li class="warn">${esc(p.text)}</li>`).join('')}</ul>` : ''}</div>`;
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
      ausbreitungHtml(stoff),
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
      aeglHtml(stoff),
      wgk(),
    ].filter(Boolean);
    return teile.length ? `<div class="ez-kw">${teile.join('')}</div>` : '<div class="ez-leer">Keine Kennwerte vorhanden.</div>';
  }
  // AEGL (US EPA): Tabelle AEGL-1/2/3 × 10 min … 8 h; bei Gemischen für die Bestandteile (höchstens 3)
  const AEGL_TEXT = { 1: 'spürbares Unwohlsein, Reizung – vorübergehend', 2: 'schwere oder bleibende Gesundheitsschäden, Flucht erschwert', 3: 'Lebensgefahr' };
  function aeglHtml(stoff) {
    const A = window.GSZAegl;
    if (!A) return '';
    const liste = [];
    const eigene = A.fuer(stoff.cas || []);
    if (eigene) liste.push({ a: eigene, titel: '' });
    else for (const b of (stoff.bestandteile || [])) {
      const a = b.cas && A.fuer(b.cas);
      if (a && !liste.some(x => x.a.cas === a.cas)) liste.push({ a, titel: b.name + (b.anteil ? ` (${b.anteil})` : '') });
      if (liste.length >= 3) break;
    }
    if (!liste.length) return '';
    const etwDatei = dateien.find(d => !d.ordner && /einsatztoleranz|\betw\b/i.test(d.name));
    const zelle = (w, etw) => {
      const t = w === 'NR' ? '–' : w === 'ND' ? 'n. b.' : w;
      return `<td${etw ? ' class="etw"' : ''}${w === 'NR' ? ' title="nicht empfohlen (zu wenige Daten)"' : w === 'ND' ? ' title="nicht bestimmt"' : ''}>${esc(t)}</td>`;
    };
    const sterne = liste.some(x => x.a.werte.flat().some(w => /\*/.test(w)));
    return liste.map(({ a, titel }) => `<div class="voll ez-aegl"><div class="kopfzeile"><span>AEGL-Werte (US EPA)</span>
        <small>in ${esc(a.einheit === 'ppm' ? 'ppm (= ml/m³)' : a.einheit)} · ${esc(a.status)}${titel ? ' · ' + esc(titel) : ''}</small></div>
      <table><thead><tr><th></th>${A.ZEITEN.map(z => `<th>${esc(z)}</th>`).join('')}</tr></thead>
      <tbody>${a.werte.map((r, i) => `<tr class="a${i + 1}"><td><b>AEGL-${i + 1}</b></td>${r.map((w, j) => zelle(w, i === 1 && (j === 2 || j === 3))).join('')}</tr>`).join('')}</tbody></table>
      <div class="legende">${[1, 2, 3].map(n => `<span style="--c:${n === 1 ? '#b88a00' : n === 2 ? 'var(--ser)' : 'var(--crit)'}"><i>AEGL-${n}</i> ${AEGL_TEXT[n]}</span>`).join('')}
        <span>Hervorgehoben: AEGL-2 für 1 h und 4 h – der Einsatztoleranzwert (ETW, vfdb 10/01) entspricht meist diesen Werten.${etwDatei ? ` <a href="#datei/${kodiere(etwDatei.pfad)}">ETW-Liste öffnen</a>` : ''}</span>
        ${a.geruch ? `<span>Deutlich zu riechen ab ${esc(a.geruch)}.</span>` : ''}
        ${sterne ? `<span>* ≥ 10 %, ** ≥ 50 %, *** ≥ 100 % der unteren Explosionsgrenze${a.ueg ? ` (UEG laut EPA ${esc(a.ueg)})` : ''} – Explosionsgefahr beachten.</span>` : ''}
        <span>– = nicht empfohlen (zu wenige Daten) · Werte für die Bevölkerung, Stand ${esc(A.stand)}</span></div></div>`).join('');
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
        ${t ? gefahrnummerHtml(t.kemler) : ''}
        ${zettel ? `<div class="ez-symbole">${zettel}</div>` : ''}
      </div></div>
      ${ghs || g.signalwort ? `<div class="ez-oben" style="margin-top:.7rem;align-items:center"><div class="ez-symbole">${ghs}</div>
        ${g.signalwort ? `<span class="ez-signal ${/achtung/i.test(g.signalwort) ? 'achtung' : ''}">${esc(g.signalwort)}</span>` : ''}</div>`
        : '<div class="ez-klein" style="margin-top:.5rem">Keine GHS-Einstufung angegeben.</div>'}`;
  }
  // Bedeutung der Gefahrnummer (oben auf der Warntafel)
  function gefahrnummerHtml(kemler) {
    const g = window.GSZGefahrgut && kemler ? GSZGefahrgut.gefahrnummer(kemler) : null;
    if (!g) return '';
    const text = g.text || g.teile.map(x => x.text + (x.verstaerkt ? ' (verstärkt)' : '')).filter(Boolean).join(', ');
    return text ? `<div class="ez-gefahrnr"><b>${esc(g.code)}</b> ${esc(text)}${g.x ? `<span class="x">X: ${esc(g.xText)}</span>` : ''}</div>` : '';
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
      <section class="kachel ez-karte"><div class="ez-klein" style="margin-bottom:.45rem">${esc(kurz)}${stoff.synonyme.length ? ' · auch: ' + esc(stoff.synonyme.slice(0, 4).join(', ')) : ''}</div>
        <h2>Kennzeichnung · Gefahrenklasse · GHS</h2>${kennzeichnungHtml(stoff)}</section>
      ${window.GSZLage ? GSZLage.stoffKarteHtml(stoff, basis) : ''}
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
  // Stoff, aus dessen „Beständigkeiten“ bzw. „PSA“ ein Gerät geöffnet wird: Die Geräteseite zeigt dann in ihrer Liste nur die
  // passenden Zeilen (Adresse #geraet/<Gerät>/<Kennung>; Kennung = ZVG-Nr. bzw. sdb-<id> des eigenen Datenblatts)
  const stoffKontexte = new Map();
  const kontextVon = stoff => String(stoff.zvg || (stoff.id ? 'sdb-' + stoff.id : '')).replace(/[\/\s]/g, '');
  const stoffInfoVon = stoff => ({ name: stoff.name, synonyme: [...stoff.synonyme, ...stoff.bestandteile.map(b => b.name)],
    cas: [...stoff.cas, ...stoff.bestandteile.map(b => b.cas).filter(Boolean)], anzeige: nameSchoen(stoff.name) });
  async function bestaendigkeitHtml(stoff, ziel, { nurKategorie = null } = {}) {
    if (!ad() || !ad().verbunden()) { ziel.innerHTML = '<div class="ez-leer">Die Beständigkeitslisten liegen im Dropbox-App-Ordner – dazu einmal mit Dropbox verbinden.</div>'; return; }
    if (!dateien.length) await listeHolen(false);
    const G_ = await geraete();
    if (!G_.length) { ziel.innerHTML = `<div class="ez-leer">Noch keine Beständigkeitslisten hinterlegt (Ordner Einsatz › ${BL} im Dropbox-App-Ordner).</div>`; return; }
    const stoffInfo = stoffInfoVon(stoff);
    const kontext = kontextVon(stoff);
    if (kontext) stoffKontexte.set(kontext, stoffInfo);
    let erg = B.fuerStoff(G_, stoffInfo);
    if (nurKategorie) erg = erg.filter(e => kategorie(e.geraet) === nurKategorie);
    const kats = ['Alle', ...new Set(erg.map(e => kategorie(e.geraet)))];
    const zeigen = () => {
      const sicht = erg.filter(e => nurKategorie || bestFilter === 'Alle' || kategorie(e.geraet) === bestFilter);
      ziel.innerHTML = (nurKategorie || kats.length <= 2 ? '' : `<div class="ez-filter">${kats.map(k => `<button class="${k === bestFilter ? 'an' : ''}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>`) +
        (sicht.length ? `<ul class="ez-geraete">${sicht.map(e => geraetZeile(e, kontext)).join('')}</ul>` : '<div class="ez-leer">Keine Ausrüstung in dieser Gruppe.</div>') +
        '<div class="ez-klein" style="margin-top:.6rem">Bewertung nach den Herstellerlisten. Maßgeblich ist die Originalliste – Tippen öffnet das Gerät mit Original. ' +
        'Bei mehreren Zeilen (Konzentration, Temperatur) zählt in der Übersicht die ungünstigste.</div>';
      for (const b of ziel.querySelectorAll('.ez-filter button')) b.addEventListener('click', () => { bestFilter = b.dataset.k; zeigen(); });
      fotoEinsetzen(ziel);
    };
    zeigen();
  }
  // Stoffname aus der Liste lesbar: „Chlor , trocken“ → „Chlor, trocken“
  const stoffText = t => String(t || '').replace(/\s+([,;.)])/g, '$1').replace(/\(\s+/g, '(').replace(/\s{2,}/g, ' ').trim();
  // Bedeutung eines Zeichens laut Legende der Liste („○“ → „Gut beständig“), dazu eine Kurzform fürs Band
  // („geeignet für Voll- und Leerschlauchsystem, Dauerbetrieb“ → „geeignet“)
  const legendeText = (L, roh) => { const l = (L.legende || []).find(x => x.zeichen === roh); return l ? l.text : ''; };
  function kurzDefinition(t) {
    let k = String(t || '').split(/[,;.(]| – | - /)[0].trim();
    if (k.length > 24) k = k.split(/\s+(?:für|bei|nur|wenn)\s+/)[0].trim();
    if (k.length > 32) k = k.slice(0, 30).replace(/\s+\S*$/, '') + ' …';
    return k;
  }
  // Band rechts an der Gerätezeile: Farbe der Gesamtbewertung, dazu die Angabe, die sie bestimmt (Zeit bzw. Klasse; bei mehreren
  // Zeilen die ungünstigste – bei Durchbruchzeiten die kürzeste)
  function bandHtml(e) {
    const g = e.geraet, L = g.daten && g.daten.liste;
    const band = (zeichen, text, extra = '', def = '') => `<span class="ez-band ${esc(e.stufe)}${extra}" title="${esc(B.STUFE_TEXT[e.stufe] || '')}"><b>${esc(zeichen)}</b>${def ? `<em>${esc(def)}</em>` : ''}<small>${esc(text)}</small></span>`;
    if (e.stufe === 'offen') return band('…', 'noch offen');
    if (e.stufe === 'keine' || !L) return band('–', 'nicht in der Liste');
    if (e.stufe === 'gemischt') return band('±', 'gemischt');
    const ids = L.relevant.length ? L.relevant : L.spalten.map(s => s.id);
    const sicher = e.treffer.filter(t => t.art !== 'aehnlich'), basis = sicher.length ? sicher : e.treffer;
    const werte = [];
    for (const t of basis) for (const id of ids) { const w = t.eintrag.werte[id]; if (w && w.roh) werte.push({ roh: w.roh, stufe: w.stufe, id }); }
    if (e.stufe === 'unbekannt' || !werte.length) return band('?', 'keine Angabe');
    const passend = werte.filter(w => w.stufe === e.stufe), kand = passend.length ? passend : werte;
    const zahl = w => { const m = /(\d+(?:[.,]\d+)?)/.exec(w.roh); return m ? Number(m[1].replace(',', '.')) : Infinity; };
    const w = L.art === 'permeation' ? kand.reduce((a, b) => (zahl(b) < zahl(a) ? b : a)) : kand[0];
    const zeit = L.art === 'permeation' && /\d/.test(w.roh);
    const def = zeit ? '' : legendeText(L, w.roh);                          // Bedeutung des Zeichens laut Legende, ausgeschrieben
    const unter = zeit ? 'min' : ids.length > 1 || L.spalten.length > 1 ? w.id : (def ? '' : B.STUFE_TEXT[e.stufe] || '');
    return band(w.roh, unter, w.roh.length > 5 ? ' lang' : '', def);
  }
  function geraetZeile(e, kontext = '') {
    const g = e.geraet;
    const titel = (g.nr ? g.nr + ' · ' : '') + g.name;
    const eintraege = e.treffer.slice(0, 6).map(t => {
      const L = g.daten.liste;
      const ids = L.relevant.length ? L.relevant : L.spalten.map(s => s.id);
      const werte = ids.map(id => { const w = t.eintrag.werte[id]; const sp = L.spalten.find(s => s.id === id);
        // Durchbruchzeiten mit Einheit („Sykan 2: >480 min“) – bei Permeationslisten zählt die Zeit, nicht die Farbe
        const min = L.art === 'permeation' && w && /\d/.test(w.roh) && !/min/i.test(w.roh) ? ' min' : '';
        const bedeutung = !min && w && w.roh ? legendeText(L, w.roh) : '';
        return w && w.roh ? `${esc(sp ? sp.id : id)}: <b>${esc(w.roh)}${min}</b>${bedeutung ? ' ' + esc(bedeutung) : ''}` : ''; }).filter(Boolean).slice(0, 6).join(' · ');
      // Konzentration/Temperatur nur, wenn sie nicht schon im Stoffnamen steht („Salzsäure 37 %“ + „37 %“)
      const name = S.wertSchoen(stoffText(t.eintrag.stoff)).replace(/\s+/g, '');
      const zusatz = [t.eintrag.konz, t.eintrag.temp].filter(Boolean).map(x => S.wertSchoen(x)).filter(x => !name.includes(x.replace(/\s+/g, ''))).join(' · ');
      return `<div class="eintrag"><span class="kopf">${e.treffer.length > 1 ? stufeBadge(t.stufe) : '<span>Liste:</span>'}<span>„${esc(stoffText(t.eintrag.stoff))}“${zusatz ? ' ' + esc(zusatz) : ''}` +
        `${t.art === 'aehnlich' ? ' <i>(ähnlicher Name – prüfen)</i>' : ''}${t.widerspruch ? ' <i class="ez-wid-text">⚠ widerspricht einer anderen Zeile</i>' : ''}${t.verweis ? ' <i class="ez-wid-text">⚠ Verweiszeile mit eigenen Werten – Original prüfen</i>' : ''}</span></span>${werte ? `<i>${werte}</i>` : ''}${t.eintrag.hinweis ? `<i>${esc(t.eintrag.hinweis)}</i>` : ''}</div>`;
    }).join('');
    const rest = e.treffer.length > 6 ? `<div class="eintrag"><i>… und ${e.treffer.length - 6} weitere Zeilen</i></div>` : '';
    return `<li><a href="#geraet/${kodiere(g.ordner)}${kontext ? '/' + kodiere(kontext) : ''}" style="--c:${STUFE_FARBE[e.stufe] || 'var(--rand)'}"><div class="ez-zeile-inhalt">
      ${g.foto ? `<span class="ez-bild ez-bildmini${bildFuellen(bildVon(g))}" style="${bildStil(bildVon(g), false)}"><img data-foto="${esc(g.foto)}" alt=""></span>` : '<span class="ez-bild">kein Bild</span>'}
      <b>${esc(titel)}</b>
      <div class="zeile">${stufeBadge(e.stufe)}${e.nurAehnlich ? '<span class="ez-ungeprueft">nur ähnlicher Name</span>' : ''}${e.widerspruch ? '<span class="ez-wid-badge" title="Der Stoff steht mehrfach mit unterschiedlicher Bewertung in der Liste – im Original nachsehen; bis dahin gilt die ungünstigere Angabe">⚠ widersprüchlich</span>' : ''}${pruefBadge(g)}</div>
      ${eintraege}${rest}</div>${bandHtml(e)}</a></li>`;
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
    else if (teil === 'lage') inhaltEl.insertAdjacentHTML('beforeend', window.GSZLage ? GSZLage.stoffTeilHtml(stoff) : '<div class="ez-leer">Nicht verfügbar.</div>');
    else if (teil === 'bestaendigkeit') inhaltEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Unsere Ausrüstung · ${esc(stoff.name)}</h2><div id="ez-best">
      <div class="ez-leer">wird geladen …</div></div></section>`);
    sEl.appendChild(inhaltEl);
    const leiste = document.createElement('nav');
    leiste.className = 'ez-leiste';
    leiste.setAttribute('aria-label', 'Stoff');
    leiste.innerHTML = [['datenblatt', 'Daten&shy;blatt', REITER.datenblatt], ['bestaendigkeit', 'Bestän&shy;dig&shy;keit', REITER.bestaendigkeit], ['psa', 'PSA', REITER.psa],
      ['eh', 'EH/<wbr>Dekon', REITER.eh], ...(window.GSZLage ? [['lage', 'Ab&shy;sperren', REITER.lage]] : [])]
      .map(([t, n, ic]) => `<a href="${teil === t ? basis : basis + '/' + t}" class="${teil === t ? 'an' : ''}" title="${esc(TEILE[t] || '')}" aria-label="${esc(TEILE[t] || '')}"${teil ? ' data-ersetzen="1"' : ''}>${ic}<span aria-hidden="true">${n}</span></a>`).join('');
    sEl.appendChild(leiste);
    leisteBeobachten(sEl, leiste);
    // Bedienung
    for (const b of sEl.querySelectorAll('.ez-unwahl button')) b.addEventListener('click', () => { unWahl.set(stoff.zvg || stoff.id, b.dataset.un); stoff.transport = stoff.transporte.find(t => t.un === b.dataset.un) || stoff.transport; stoffSeite(stoff, basis, teil, { eltern, extra, ziel, nachher }); });
    for (const a of sEl.querySelectorAll('a[data-cas]')) a.addEventListener('click', e => { e.preventDefault(); suchenUndZeigen(a.dataset.cas); });
    if (nachher) nachher(sEl);
    if (window.GSZLage && (!teil || teil === 'lage')) GSZLage.beleben(sEl);
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
        document.dispatchEvent(new CustomEvent('gsz-stoff', { detail: { zvg, stoff } }));
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
    // Anordnung: gemerkte Wahl, sonst 2×2 auf dem Handy und 4×4 auf großen Bildschirmen
    const ANORDNUNG = [['liste', 'Liste', SVG('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>')],
      ['symbole', 'Symbole', SVG('<rect x="3.5" y="3.5" width="4" height="4" rx="1"/><rect x="10" y="3.5" width="4" height="4" rx="1"/><rect x="16.5" y="3.5" width="4" height="4" rx="1"/><rect x="3.5" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="16.5" y="10" width="4" height="4" rx="1"/><rect x="3.5" y="16.5" width="4" height="4" rx="1"/><rect x="10" y="16.5" width="4" height="4" rx="1"/>')],
      ['2', '2 × 2', '2×2'], ['3', '3 × 3', '3×3'], ['4', '4 × 4', '4×4'],
      ['gross', 'Groß', SVG('<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M6 20h12"/>')]];
    let anordnung = (() => { try { return localStorage.getItem('gsz-geraete-anordnung'); } catch { return null; } })();
    if (!ANORDNUNG.some(a => a[0] === anordnung)) anordnung = innerWidth <= 640 ? '2' : '4';
    const zeigen = () => {
      const sicht = G_.filter(g => f === 'Alle' || kategorie(g) === f).sort((a, b) => (Number(a.nr) || 999) - (Number(b.nr) || 999) || a.name.localeCompare(b.name, 'de'));
      k.innerHTML = neuKnopf + `<div class="ez-raster-kopf"><div class="ez-filter">${kats.map(c => `<button class="${c === f ? 'an' : ''}" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="ez-anordnung" role="radiogroup" aria-label="Anordnung der Geräte">${ANORDNUNG.map(([id, name, sym]) =>
          `<button type="button" role="radio" aria-checked="${id === anordnung}" data-ansicht-wahl="${id}" title="Anordnung: ${esc(name)}" aria-label="${esc(name)}">${sym}</button>`).join('')}</div></div>
        <div class="ez-raster an-${esc(anordnung)}">${sicht.map(g => { const b = bildVon(g); return `<a href="#geraet/${kodiere(g.ordner)}" class="bild-${esc(b.groesse)}${bildFuellen(b)}" title="${esc((g.nr ? g.nr + ' · ' : '') + g.name)}"><div class="foto" style="${bildStil(b)}">${g.foto ? `<img data-foto="${esc(g.foto)}" alt="">` : 'kein Bild'}</div>
          <div class="unter"><b>${esc((g.nr ? g.nr + ' · ' : '') + g.name)}</b><small>${esc(kategorie(g))} · ${g.daten ? `${g.daten.eintraege.length} Einträge` : g.quellen.length ? `<span data-auswertung="${esc(nfc(g.ordner))}">noch nicht ausgewertet</span>` : 'keine Liste'}</small>
          <span>${pruefBadge(g)}</span></div></a>`; }).join('')}</div>`;
      for (const b of k.querySelectorAll('.ez-filter button')) b.addEventListener('click', () => { f = b.dataset.k; zeigen(); });
      for (const b of k.querySelectorAll('[data-ansicht-wahl]')) b.addEventListener('click', () => {
        anordnung = b.dataset.ansichtWahl; try { localStorage.setItem('gsz-geraete-anordnung', anordnung); } catch { /* privat */ } zeigen(); });
      fotoEinsetzen(k);
    };
    zeigen();
    if (G_.some(g => !g.daten && g.quellen.length)) rasterBeobachten(k);
  }
  // Beständigkeitslisten-Übersicht: „wird ausgewertet · 40 %“ auf den Kacheln noch nicht ausgewerteter Geräte
  let rasterTimer = null;
  function rasterBeobachten(k) {
    clearInterval(rasterTimer);
    const runde = async () => {
      if (!k.isConnected || GSZ.aktuell.ansicht !== 'ordner') { clearInterval(rasterTimer); return; }
      if (document.hidden) return;
      let h = null;
      try { h = ad() && ad().helfer ? await ad().helfer() : null; } catch { h = null; }
      const w = h && h.arbeit && h.arbeit.art === 'bestaendigkeit' ? h.arbeit : null;
      const lebt = !!(h && h.zeit && Date.now() - Date.parse(h.zeit) < 3 * 60 * 1000);
      for (const el of k.querySelectorAll('[data-auswertung]')) {
        const dran = w && nfc(w.ordner) === el.dataset.auswertung;
        const pz = dran && w.teile ? Math.round(((Number(w.fertig) || 0) / w.teile) * 100) : 0;
        el.className = dran ? 'auswertung' : '';
        el.textContent = dran ? (w.teile ? `wird ausgewertet · Teil ${w.teil || 1}/${w.teile} (${pz} %)` : 'wird vorbereitet …') : lebt ? 'wartet auf Auswertung' : 'noch nicht ausgewertet (Mac-Helfer aus)';
      }
    };
    rasterTimer = setInterval(runde, 6000);
    runde();
  }
  GSZ.ansicht('ordner', {
    element: oEl, titel: p => dekodiere(p).split('/').pop(), verlassen() { clearInterval(rasterTimer); },
    async anzeigen(param) { const pfad = dekodiere(param); if (!dateien.length && ad() && ad().verbunden()) await listeHolen(false); ordnerSeite(pfad); },
  });

  // Gerät mit geordneter Liste
  const gEl = ansichtElement('geraetansicht');
  let geraetKontext = { ordner: '', kontext: '' };
  async function geraetSeite(ordner, kontext) {
    // ohne Angabe (neu zeichnen nach Spaltenwahl oder Auswertung): Stoffbezug derselben Seite behalten
    if (kontext === undefined) kontext = geraetKontext.ordner === ordner ? geraetKontext.kontext : '';
    geraetKontext = { ordner, kontext };
    gEl.innerHTML = '';
    if (!dateien.length && ad() && ad().verbunden()) await listeHolen(false);
    const g = (await geraete()).find(x => x.ordner === ordner) || (await geraete()).find(x => x.ordner.normalize('NFC') === String(ordner).normalize('NFC'));
    // Stoff aus der Stoffsuche (Gerät über „Beständigkeiten“ bzw. „PSA“ geöffnet); nach Neuladen aus dem Stoffspeicher
    let sf = kontext ? stoffKontexte.get(kontext) || null : null;
    if (!sf && /^\d{6}$/.test(kontext)) { try { sf = stoffInfoVon(await stoffHolen(kontext)); stoffKontexte.set(kontext, sf); } catch { sf = null; } }
    gEl.appendChild(kopf({ titel: g ? (g.nr ? g.nr + ' · ' : '') + g.name : ordner, unter: BL, eltern: 'ordner/' + kodiere(BL) }));
    if (!g) { gEl.insertAdjacentHTML('beforeend', '<div class="ez-leer">Gerät nicht gefunden.</div>'); return; }
    const d = g.daten, L = d && d.liste;
    const kopfK = document.createElement('section');
    kopfK.className = 'kachel ez-karte';
    const bild = bildVon(g), bearbeitbar = !!(ad() && ad().geraetDateien);
    // lange Texte (Angaben zum Gerät, Liste, Hinweise der Auswertung) eingeklappt – aufklappen bei Bedarf
    const infoTxt = (d && d.geraet.info) || (!d && g.infoText) || '';
    const infoLang = infoTxt.length > 180;
    const listeTxt = L ? [L.titel, L.stand && 'Stand ' + L.stand, L.bedingungen].filter(Boolean).join(' · ') : '';
    const anmerkung = d && d.auswertung && d.auswertung.anmerkung ? d.auswertung.anmerkung : '';
    const status = d && d.auswertung ? (d.auswertung.geprueft ? 'Geprüft' + (d.auswertung.pruefung && d.auswertung.pruefung.am ? ' am ' + datumZeit(d.auswertung.pruefung.am) : '') + ' – mit dem Original abgeglichen.'
      : 'Automatisch ausgelesen am ' + datumZeit(d.auswertung.am) + ' – noch nicht mit dem Original abgeglichen.') : '';
    const mehrTitel = [infoLang && 'Angaben zum Gerät', listeTxt && 'Liste', anmerkung && 'Hinweise der Auswertung'].filter(Boolean);
    // Prüfung auf Wunsch: Claude liest die Liste über den Mac ein zweites Mal und vergleicht jede Zeile mit dem Original
    const aw = d && d.auswertung, pr = aw && aw.pruefung, auto = aw && aw.pruefung_auto;
    // Abweichungen: je Punkt wählen, welche Angabe stimmt (Liste, Original oder eigener Wert); fehlende Zeilen ergänzen oder verwerfen
    const wahlKnopf = (art, i, text, quelle) => `<button type="button" class="knopf" data-abw="${quelle}|${art}|${i}">${text}</button>`;
    const abwListe = (p, quelle) => [...(p.abweichungen || []).map((a, i) => `<li data-z="•" class="ez-abw">${a.seite ? 'S. ' + esc(a.seite) + ' · ' : ''}<b>${esc(stoffText(a.stoff))}</b>` +
        `${a.feld ? ' · ' + esc(a.feld) : ''}: Liste „${esc(a.liste)}“ – Original „${esc(a.original)}“` +
        (bearbeitbar ? `<span class="ez-abw-wahl">${wahlKnopf('liste', i, `Liste stimmt <b>${esc(a.liste || 'leer')}</b>`, quelle)}${wahlKnopf('original', i, `Original <b>${esc(originalWert(a.original) || 'leer')}</b>`, quelle)}${wahlKnopf('eigen', i, 'anders …', quelle)}</span>` : '') + '</li>'),
      ...(p.fehlende_zeilen || []).map((f, i) => `<li data-z="•" class="ez-abw">${f.seite ? 'S. ' + esc(f.seite) + ' · ' : ''}<b>${esc(stoffText(f.stoff))}</b> fehlt in der Übertragung` +
        (bearbeitbar ? `<span class="ez-abw-wahl">${wahlKnopf('zeile', i, 'Zeile ergänzen …', quelle)}${wahlKnopf('keinfehler', i, 'kein Fehler', quelle)}</span>` : '') + '</li>')].join('');
    const alleKnoepfe = (p, quelle) => bearbeitbar && (p.abweichungen || []).length > 1 ? `<div class="ez-abw-alle">${wahlKnopf('alle-original', -1, 'Alle: Original übernehmen', quelle)}${wahlKnopf('alle-liste', -1, 'Alle: Liste stimmt', quelle)}</div>` : '';
    const entschiedenHtml = p => p && (p.entscheidungen || []).length ? `<details class="ez-mehr" style="margin-top:.4rem"><summary>Entschieden (${p.entscheidungen.length})</summary><div class="inhalt"><ul class="ez-zeilen">${p.entscheidungen.map(x =>
        `<li data-z="✓">${x.seite ? 'S. ' + esc(x.seite) + ' · ' : ''}<b>${esc(stoffText(x.stoff))}</b>${x.feld ? ' · ' + esc(x.feld) : ''}: ${x.gewaehlt === 'liste' ? 'Liste stimmt' : x.gewaehlt === 'original' ? 'Original übernommen' : x.gewaehlt === 'zeile' ? 'Zeile ergänzt' : x.gewaehlt === 'keinfehler' ? 'kein Fehler' : 'eigener Wert'}` +
        `${x.wert !== undefined && x.gewaehlt !== 'keinfehler' ? ` „${esc(x.wert)}“` : ''}${x.zeile_gefunden === false ? ' <i>(Zeile nicht eindeutig gefunden – im Original prüfen)</i>' : ''} <span class="ez-klein">${esc(datumZeit(x.am))}</span></li>`).join('')}</ul></div></details>` : '';
    const abwAnzahl = p => (p && ((p.abweichungen || []).length + (p.fehlende_zeilen || []).length)) || 0;
    const pruefHtml = !d ? '' : g.pruefAuftrag ? '<div class="ez-warn blau" id="ez-pruefung"><div class="ez-fortschritt"><div class="titel">Prüfung angefordert</div><div class="ez-klein">wird abgefragt …</div></div></div>'
      : (!aw.geprueft && abwAnzahl(pr) ? `<div class="ez-warn rot" id="ez-pruef-abw"><b>Zweiter Lesedurchgang: ${abwAnzahl(pr) === 1 ? '1 mögliche Abweichung' : abwAnzahl(pr) + ' mögliche Abweichungen'}</b> – bitte im Original nachsehen${bearbeitbar ? ' und je Punkt wählen, welche Angabe stimmt. Sind alle entschieden, gilt die Liste als geprüft' : ''}.
          ${alleKnoepfe(pr, 'pruefung')}<ul class="ez-zeilen">${abwListe(pr, 'pruefung')}</ul>${entschiedenHtml(pr)}</div>` : '') +
        (aw.geprueft && abwAnzahl(auto) ? `<div class="ez-warn" id="ez-pruef-abw"><b>Zweiter Lesedurchgang (Mac-Helfer): ${abwAnzahl(auto) === 1 ? '1 mögliche Abweichung' : abwAnzahl(auto) + ' mögliche Abweichungen'}</b> – die Fassung bleibt geprüft.
          <details class="ez-mehr"><summary>Anzeigen und entscheiden</summary><div class="inhalt">${alleKnoepfe(auto, 'pruefung_auto')}<ul class="ez-zeilen">${abwListe(auto, 'pruefung_auto')}</ul></div></details></div>` : '') +
        (aw.geprueft && pr && (pr.entscheidungen || []).length && !abwAnzahl(auto) ? `<div class="ez-klein" style="margin-top:.3rem">${entschiedenHtml(pr)}</div>` : '') +
        (bearbeitbar ? `<div class="ez-pruefen-zeile"><button type="button" class="knopf${aw.geprueft ? '' : ' los'}" id="ez-pruefen">${I.schild}${aw.geprueft || pr ? 'Erneut prüfen lassen' : 'Liste prüfen lassen'}</button>
          <span class="ez-klein">${aw.geprueft ? 'Claude liest die Liste über den Mac noch einmal und vergleicht jede Zeile mit dem Original.'
            : 'Claude liest die Liste über den Mac ein zweites Mal und vergleicht jede Zeile mit dem Original. Ohne Abweichung gilt sie danach als geprüft.'}</span></div>` : '');
    kopfK.innerHTML = `${sf && L ? `<div class="ez-warn blau ez-stoffbezug"><span>Aus der Stoffsuche: <b>${esc(sf.anzeige)}</b> – die Liste unten zeigt nur die passenden Zeilen.</span>
        <button class="knopf" type="button" id="ez-zur-liste">Zur Liste ↓</button></div>` : ''}<div class="ez-oben"><div class="ez-bildspalte bild-${esc(bild.groesse)}">
        ${g.foto ? `<a class="ez-bildrahmen${bildFuellen(bild)}" style="${bildStil(bild)}" href="#datei/${kodiere(g.foto)}" title="Antippen: Foto groß ansehen und zoomen" aria-label="Foto groß ansehen">
          <img data-foto="${esc(g.foto)}" alt="Foto ${esc(g.name)}"><span class="lupe">${I.suche}</span></a>`
          : `<div class="ez-bildrahmen" style="${bildStil(bild)}"><span class="leer">kein Foto</span></div>`}
        ${bearbeitbar ? `<a class="knopf" href="#geraet-neu/${kodiere(g.ordner)}" data-sprung="gn-bild">${I.bild}Bild anpassen</a>` : ''}</div>
      <div style="flex:1;min-width:13rem;display:flex;flex-direction:column;gap:.35rem">
        <div class="zeile" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">${d || g.kategorieInfo ? `<span class="ez-chip">${esc(kategorie(g))}</span>` : ''}${pruefBadge(g)}</div>
        ${d && d.geraet.hersteller ? `<div class="ez-hinweis">Hersteller: ${esc(d.geraet.hersteller)}</div>` : ''}
        ${d && d.geraet.werkstoffe.length ? `<div class="ez-hinweis">Werkstoffe: ${esc(d.geraet.werkstoffe.join(', '))}</div>` : ''}
        ${infoTxt && !infoLang ? `<div class="ez-hinweis">${esc(infoTxt)}</div>` : ''}
        ${status ? `<div class="ez-klein">${esc(status)}</div>` : ''}
        ${pruefHtml}
        ${mehrTitel.length ? `<details class="ez-mehr" id="ez-mehr-liste"><summary>Mehr: ${esc(mehrTitel.join(', '))}</summary><div class="inhalt">
          ${infoLang ? `<div><b>Angaben zum Gerät</b>${esc(infoTxt)}</div>` : ''}${listeTxt ? `<div><b>Liste</b>${esc(listeTxt)}</div>` : ''}
          ${anmerkung ? `<div><b>Hinweise der Auswertung</b>${esc(anmerkung)}</div>` : ''}</div></details>` : ''}
        ${g.fehler ? `<div class="ez-warn rot">${esc(g.fehler)}</div>` : ''}
        ${!d && g.quellen.length ? '<div class="ez-warn" id="ez-auswertung"><div class="ez-fortschritt"><div class="titel">Auswertung durch den Mac-Helfer</div><div class="ez-klein">wird abgefragt …</div></div></div>' : ''}
        ${!g.quellen.length ? '<div class="ez-warn">Noch keine Beständigkeitsliste hinterlegt.</div>' : ''}
        ${bearbeitbar ? `<div><a class="knopf" href="#geraet-neu/${kodiere(g.ordner)}">${I.bild}Bearbeiten: Foto, Bild, Listen, Gruppe · Löschen</a></div>` : ''}
      </div></div>
      ${g.quellen.length ? `<h2 style="margin-top:.8rem">Original</h2><ul class="ez-dateien">${g.quellen.map(q => { const [t, c] = TYP[endung(q)] || ['DATEI', '#6b7480'];
        const info = dateiInfo(q); return `<li><a href="#datei/${kodiere(q)}"><span class="typ" style="--c:${c}">${esc(t)}</span><span><b>${esc(q.split('/').pop().replace(/\.[^.]+$/, ''))}</b>
        <small>${esc(groesse(info && info.groesse))}</small></span></a>${info && ad().art === 'web' && ad().verfuegbarkeitSetzen ? verfWahl(info) : ''}</li>`; }).join('')}</ul>` : ''}`;
    gEl.appendChild(kopfK);
    verfBedienung(kopfK);
    const pk = kopfK.querySelector('#ez-pruefen');
    if (pk) pk.addEventListener('click', async () => {
      pk.disabled = true;
      const auftrag = JSON.stringify({ angefordert: new Date().toISOString(), von: ad().art === 'web' ? 'Web-App' : 'Programm' }, null, 1);
      try { await ad().geraetDateien(g.ordner, [{ name: B.PRUEF_DATEI, blob: new Blob([auftrag], { type: 'application/json' }) }]); }
      catch (e) { pk.disabled = false; meldung('Nicht möglich: ' + e.message, 7000); return; }
      geraeteCache = null;
      await listeHolen(true);
      meldung('Prüfung angefordert – der Mac-Helfer lässt Claude die Liste ein zweites Mal lesen und mit dem Original vergleichen.', 6500);
      geraetSeite(g.ordner);
    });
    if (g.pruefAuftrag && d) pruefungBeobachten(g);
    for (const b of kopfK.querySelectorAll('[data-abw]')) b.addEventListener('click', async () => {
      const [quelle, art, i] = b.dataset.abw.split('|');
      for (const x of kopfK.querySelectorAll('[data-abw]')) x.disabled = true;
      try { if (await abweichungEntscheiden(g, quelle, art, Number(i))) { geraeteCache = null; await listeHolen(true); geraetSeite(g.ordner); return; } }
      catch (e) { meldung('Nicht gespeichert: ' + e.message, 8000); }
      for (const x of kopfK.querySelectorAll('[data-abw]')) x.disabled = false;
    });
    const zurListe = kopfK.querySelector('#ez-zur-liste');
    if (zurListe) zurListe.addEventListener('click', () => { const z = document.getElementById('ez-liste-karte'); if (z) z.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    if (!d && g.quellen.length) auswertungBeobachten(g);
    fotoEinsetzen(kopfK);
    if (window.GSZClaude) GSZClaude.geraetKarte(gEl, g);
    if (!L) return;
    if (L.spalten.length > 1) gEl.appendChild(spaltenwahlKarte(g));
    const t = document.createElement('section');
    t.className = 'kachel ez-karte';
    t.id = 'ez-liste-karte';
    const sp = L.spalten;
    // Stoffe, die mehrfach mit unterschiedlicher Bewertung in der Liste stehen (gleiche CAS-Nr. bzw. gleicher Name, Konzentration, Temperatur)
    const wid = B.widersprueche(d.eintraege, L), verweise = B.verweisMitWerten(d.eintraege);
    const widSet = new Set([...wid.flatMap(w => w.eintraege), ...verweise]);
    const relIds = L.relevant.length ? L.relevant : sp.map(s => s.id);
    const widZeile = e => `<li>„${esc(stoffText(e.stoff))}“${e.cas ? ' · CAS ' + esc(e.cas) : ''}${e.seite ? ' · S. ' + esc(e.seite) : ''}: ` +
      relIds.map(id => { const w = e.werte[id]; return w && w.roh ? `${esc(id)} <b>${esc(w.roh)}</b> (${esc(B.STUFE_TEXT[w.stufe] || w.stufe)})` : ''; }).filter(Boolean).join(' · ') + '</li>';
    const widHtml = wid.length || verweise.length ? `<div class="ez-warn ez-wid" id="ez-wid">
      ${wid.length ? `<b>${wid.length === 1 ? '1 Stoff steht' : wid.length + ' Stoffe stehen'} mehrfach mit unterschiedlicher Bewertung in der Liste</b>
      <div class="ez-klein">Ein Lesefehler oder ein echter Unterschied der Herstellerliste – im Original nachsehen. Bis dahin gilt die ungünstigere Angabe.</div>
      ${wid.map(w => `<ul class="ez-zeilen">${w.eintraege.map(widZeile).join('')}</ul>`).join('')}` : ''}
      ${verweise.length ? `<b>${verweise.length === 1 ? '1 Verweiszeile hat' : verweise.length + ' Verweiszeilen haben'} eigene Werte („… siehe …“)</b>
      <div class="ez-klein">In der Vorlage sind hier vermutlich Zeilen verrutscht – die Werte gehören dann zu einer Nachbarzeile. Im Original nachsehen bzw. beim Hersteller klären.</div>
      <ul class="ez-zeilen">${verweise.map(widZeile).join('')}</ul>` : ''}
      <button type="button" class="knopf" id="ez-wid-filter" aria-pressed="false">Nur diese Zeilen zeigen</button></div>` : '';
    t.innerHTML = `<h2>Geordnete Beständigkeitsliste (${d.eintraege.length} Einträge)</h2>${widHtml}
      <input type="search" class="ez-db-suche" placeholder="Stoff oder CAS-Nr. suchen" aria-label="In der Liste suchen">
      <div class="ez-legende">${L.legende.map(l => `<span>${stufeBadge(l.stufe, l.zeichen || '–')} ${esc(l.text)}</span>`).join('')}
        ${L.art === 'permeation' ? '<span>Durchbruchzeiten in Minuten: Jede eingetragene Zeit gilt als beständig, ob kurz oder lang – die Zeit steht dabei.</span>' : ''}
        ${L.relevant.length ? `<span>Für das Gerät gelten: <b>${esc(L.relevant.join(', '))}</b> (umrandet)</span>` : ''}</div>
      <div class="ez-tabelle-rahmen"><table class="ez-tabelle"><thead><tr><th>Stoff</th><th>CAS</th><th>Konz./Temp.</th>${sp.map(s => `<th title="${esc(s.name)}">${esc(s.id)}</th>`).join('')}<th>Gerät</th><th>S.</th></tr></thead>
      <tbody></tbody></table></div><div class="ez-klein" id="ez-mehr" style="margin-top:.5rem"></div>
      ${L.hinweise.length ? `<details style="margin-top:.6rem"><summary class="ez-klein" style="cursor:pointer">Hinweise der Liste</summary><ul class="ez-zeilen" style="margin-top:.4rem">${L.hinweise.map(h => `<li data-z="•">${esc(h)}</li>`).join('')}</ul></details>` : ''}`;
    gEl.appendChild(t);
    const tb = t.querySelector('tbody'), feld = t.querySelector('.ez-db-suche'), mehr = t.querySelector('#ez-mehr');
    let grenze = 150, nurWid = false;
    const widKnopf = t.querySelector('#ez-wid-filter');
    if (widKnopf) widKnopf.addEventListener('click', () => { nurWid = !nurWid; widKnopf.setAttribute('aria-pressed', String(nurWid));
      widKnopf.textContent = nurWid ? 'Wieder alle Zeilen zeigen' : 'Nur diese Zeilen zeigen'; if (nurWid) feld.value = ''; grenze = 150; zeilen(); });
    // aus der Stoffsuche: Suchfeld mit dem Stoff vorbelegt, Zeilen wie in „Beständigkeiten“ über CAS-Nr. und Namen zugeordnet
    const sfTreffer = sf ? new Set(B.finde(d, sf).map(x => x.eintrag)) : null;
    if (sf) feld.value = sf.anzeige;
    const zeilen = () => {
      const roh = feld.value.trim(), q = B.grund(roh);
      const nurStoff = !!(sf && sfTreffer.size && roh === sf.anzeige);
      const treffer = (nurStoff ? d.eintraege.filter(e => sfTreffer.has(e)) : d.eintraege.filter(e => !q || B.grund(e.stoff).includes(q) || (e.cas && e.cas.includes(roh))))
        .filter(e => !nurWid || widSet.has(e));
      tb.innerHTML = treffer.slice(0, grenze).map(e => { const ges = B.gesamtStufe(e, L);
        return `<tr${widSet.has(e) ? ' class="wid" title="steht mehrfach mit unterschiedlicher Bewertung in der Liste"' : ''}><td>${widSet.has(e) ? '<span class="ez-wid-zeichen" aria-label="widersprüchlich">⚠</span> ' : ''}${esc(stoffText(e.stoff))}${e.hinweis ? `<br><span class="ez-klein">${esc(e.hinweis)}</span>` : ''}</td><td>${esc(e.cas)}</td><td>${esc([e.konz, e.temp].filter(Boolean).map(x => S.wertSchoen(x)).join(' · '))}</td>
        ${sp.map(s => { const w = e.werte[s.id] || { roh: '', stufe: 'unbekannt' }; return `<td class="w ${w.roh ? esc(w.stufe) : ''}${L.relevant.includes(s.id) ? ' rel' : ''}">${esc(w.roh)}</td>`; }).join('')}
        <td class="w ${esc(ges)}">${esc(ges === 'unbekannt' ? '–' : ges === 'gut' ? '✓' : ges === 'nicht' ? '✕' : ges === 'bedingt' ? '△' : '±')}</td><td>${esc(e.seite)}</td></tr>`; }).join('');
      mehr.innerHTML = nurStoff ? `${treffer.length === 1 ? '1 Eintrag passt' : treffer.length + ' Einträge passen'} zu „${esc(sf.anzeige)}“ (über CAS-Nr. bzw. Namen) · <a href="#" id="ez-ganz">ganze Liste zeigen</a>`
        : sf && !sfTreffer.size && roh === sf.anzeige ? `„${esc(sf.anzeige)}“ steht nicht in dieser Liste · <a href="#" id="ez-ganz">ganze Liste zeigen</a>`
        : treffer.length > grenze ? `${grenze} von ${treffer.length} Einträgen angezeigt · <a href="#" id="ez-alle">alle zeigen</a>` : `${treffer.length} Einträge`;
      const al = mehr.querySelector('#ez-alle'); if (al) al.addEventListener('click', e => { e.preventDefault(); grenze = Infinity; zeilen(); });
      const ganz = mehr.querySelector('#ez-ganz'); if (ganz) ganz.addEventListener('click', e => { e.preventDefault(); feld.value = ''; grenze = 150; zeilen(); });
    };
    feld.addEventListener('input', () => { grenze = 150; zeilen(); });
    zeilen();
  }
  // ---------------------------------------------------------------- Abweichungen der Prüfung entscheiden
  // „Original“ der Prüfung ohne Erklärung in Klammern („+⁵ (mit Fußnote 5)“ → „+⁵“, „(leer)“ → leer)
  const originalWert = t => { const x = String(t || '').trim(); return /^\(?leer\)?$/i.test(x) ? '' : x.replace(/\s*\(.*\)\s*$/, '').trim(); };
  // Zeile zu einer Abweichung: gleiche Seite und gleicher Stoff (Schreibweise egal); nur eindeutig
  function zeileZu(d, x) {
    const s = B.grund(x.stoff);
    let l = d.eintraege.filter(e => B.grund(e.stoff) === s && (!x.seite || String(e.seite) === String(x.seite)));
    if (l.length !== 1) l = d.eintraege.filter(e => B.grund(e.stoff) === s);
    if (l.length !== 1) l = d.eintraege.filter(e => (!x.seite || String(e.seite) === String(x.seite)) && (B.grund(e.stoff).includes(s) || s.includes(B.grund(e.stoff))));
    return l.length === 1 ? l[0] : null;
  }
  // Feld setzen: Spalte (Wert und Stufe) oder Stoff, CAS, Konzentration, Temperatur, Hinweis, Seite
  function feldSetzen(e, feld, wert, L) {
    const f = B.grund(feld);
    const sp = L.spalten.find(sp => sp.id === feld || B.grund(sp.id) === f || B.grund(sp.name) === f);
    if (sp) { e.werte[sp.id] = { ...(e.werte[sp.id] || {}), roh: wert, stufe: B.stufeAus(wert, L) }; return true; }
    const k = { stoff: 'stoff', name: 'stoff', cas: 'cas', 'cas nr': 'cas', konz: 'konz', konzentration: 'konz', temp: 'temp', temperatur: 'temp', hinweis: 'hinweis', bemerkung: 'hinweis', seite: 'seite' }[f.replace(/\s+/g, ' ')];
    if (k) { e[k] = wert; return true; }
    return false;
  }
  // quelle: 'pruefung' | 'pruefung_auto'; art: liste | original | eigen | alle-original | alle-liste | zeile | keinfehler; i: Nummer des Punkts
  async function abweichungEntscheiden(g, quelle, art, i) {
    const a = ad();
    const d = B.pruefen(JSON.parse(await (await a.datei(`${BL}/${g.ordner}/${B.DATEI}`)).text()));   // frisch aus der Dropbox
    const aw = d.auswertung, p = aw && aw[quelle];
    if (!p) throw new Error('Prüfergebnis nicht mehr vorhanden – Seite neu laden.');
    const L = d.liste, jetzt = new Date().toISOString(), von = /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone/iPad' : a.art === 'web' ? 'Browser' : 'Programm';
    const entsch = p.entscheidungen || (p.entscheidungen = []);
    const abw = p.abweichungen || [], fehl = p.fehlende_zeilen || [];
    const entscheiden = (x, wahl, wert) => { const z = zeileZu(d, x); const geaendert = !!(z && wahl !== 'liste' && feldSetzen(z, x.feld, wert, L));
      entsch.push({ seite: x.seite, stoff: x.stoff, feld: x.feld, liste: x.liste, original: x.original, gewaehlt: wahl, wert, zeile_gefunden: !!z, geaendert, am: jetzt, von }); };
    if (art === 'alle-original' || art === 'alle-liste') {
      if (!confirm(`${abw.length} Abweichungen: ${art === 'alle-original' ? 'überall den Wert aus dem Original übernehmen' : 'überall die Liste so lassen'}?`)) return false;
      for (const x of abw) entscheiden(x, art === 'alle-original' ? 'original' : 'liste', art === 'alle-original' ? originalWert(x.original) : x.liste);
      p.abweichungen = [];
    } else if (art === 'zeile' || art === 'keinfehler') {
      const f = fehl[i];
      if (!f) throw new Error('Punkt nicht mehr vorhanden – Seite neu laden.');
      if (art === 'zeile') {
        const t = prompt(`„${f.stoff}“ ergänzen – Werte in dieser Reihenfolge, mit ; getrennt:\n${L.spalten.map(x => x.id).join('; ')}`, '');
        if (t === null) return false;
        const werte = t.split(';').map(x => x.trim());
        const e = { stoff: f.stoff, cas: '', konz: '', temp: '', seite: f.seite || '', hinweis: 'von Hand ergänzt nach der Prüfung', werte: {} };
        L.spalten.forEach((x, k) => { const w = werte[k] || ''; e.werte[x.id] = { roh: w, stufe: B.stufeAus(w, L) }; });
        const nach = d.eintraege.findIndex(z => Number(z.seite) > Number(f.seite));
        if (nach >= 0) d.eintraege.splice(nach, 0, e); else d.eintraege.push(e);
        entsch.push({ seite: f.seite, stoff: f.stoff, feld: '', gewaehlt: 'zeile', wert: t, zeile_gefunden: true, geaendert: true, am: jetzt, von });
      } else entsch.push({ seite: f.seite, stoff: f.stoff, feld: '', gewaehlt: 'keinfehler', zeile_gefunden: true, geaendert: false, am: jetzt, von });
      fehl.splice(i, 1); p.fehlende_zeilen = fehl;
    } else {
      const x = abw[i];
      if (!x) throw new Error('Punkt nicht mehr vorhanden – Seite neu laden.');
      let wert = art === 'liste' ? x.liste : art === 'original' ? originalWert(x.original) : null;
      if (art === 'eigen') { wert = prompt(`Richtiger Wert für „${x.stoff}“${x.feld ? ' · ' + x.feld : ''} (leer = keine Angabe):`, originalWert(x.original)); if (wert === null) return false; wert = wert.trim(); }
      entscheiden(x, art, wert);
      abw.splice(i, 1); p.abweichungen = abw;
    }
    // alles entschieden: geprüft – von Hand, damit spätere automatische Prüfungen sie nicht zurückstufen
    const rest = (p.abweichungen || []).length + (p.fehlende_zeilen || []).length;
    if (!rest && quelle === 'pruefung' && !aw.geprueft) {
      aw.geprueft = true;
      p.von_vorher = p.von;
      p.von = `Abweichungen von Hand entschieden in der App (${von})`;
      p.ergebnis = `${entsch.length} Abweichung${entsch.length === 1 ? '' : 'en'} entschieden – geprüft`;
      p.am = jetzt;
    }
    await a.geraetDateien(g.ordner, [{ name: B.DATEI, blob: new Blob([JSON.stringify(d, null, 1) + '\n'], { type: 'application/json' }) }]);
    meldung(rest ? `Gespeichert – noch ${rest} offen.` : quelle === 'pruefung' ? 'Alle Abweichungen entschieden – die Liste gilt jetzt als geprüft.' : 'Gespeichert.', 6000);
    return true;
  }

  // Karte „Für unser Gerät gilt“: Spalten der Liste antippen (Werkstoff bzw. Ausführung) → info.txt „Spalten: …“
  function spaltenwahlKarte(g) {
    const L = g.daten.liste, k = document.createElement('section');
    k.className = 'kachel ez-karte'; k.id = 'ez-spaltenwahl';
    let auswahl = new Set(g.relevantVon === 'wahl' ? L.relevant : []);
    const kannSpeichern = !!(ad() && ad().geraetDateien);
    const hinweis = () => g.relevantVon === 'wahl' ? 'Festgelegt von euch.' : g.relevantVon === 'auswertung' ? `Vorschlag der Auswertung: ${L.relevant.join(', ')} – antippen und speichern, um es festzulegen.`
      : 'Noch nichts festgelegt – bewertet wird bis dahin die ungünstigste aller Spalten.';
    const zeichnen = () => {
      const anzeigen = auswahl.size ? auswahl : new Set(L.relevant);
      k.innerHTML = `<h2>Für unser Gerät gilt</h2>
        <div class="ez-hinweis">Die Liste bewertet mehrere Werkstoffe bzw. Ausführungen. Wähle, was unser Gerät betrifft – im Einsatz (Beständigkeiten, PSA) zählt dann nur das.</div>
        <div class="ez-spalten">${L.spalten.map(s => `<button type="button" class="ez-spalte${anzeigen.has(s.id) ? ' an' : ''}" data-id="${esc(s.id)}" aria-pressed="${anzeigen.has(s.id)}"${kannSpeichern ? '' : ' disabled'}>
          <b>${esc(s.id)}</b>${s.name && s.name !== s.id ? `<small>${esc(s.name)}</small>` : ''}</button>`).join('')}</div>
        <div class="ez-aktionen">${kannSpeichern ? `<button class="knopf los" id="ez-spalten-speichern" style="background:var(--akzent);border-color:var(--akzent);color:#fff;font-weight:700" disabled>Speichern</button>
          ${g.relevantVon === 'wahl' ? '<button class="knopf" id="ez-spalten-weg">Festlegung aufheben</button>' : ''}` : ''}</div>
        <div class="ez-klein" style="margin-top:.4rem" id="ez-spalten-hinweis">${esc(hinweis())}</div>`;
      for (const b of k.querySelectorAll('.ez-spalte')) b.addEventListener('click', () => {
        if (!auswahl.size) auswahl = new Set(L.relevant);           // vom Vorschlag aus weiter anpassen
        auswahl.has(b.dataset.id) ? auswahl.delete(b.dataset.id) : auswahl.add(b.dataset.id);
        const sp = k.querySelector('#ez-spalten-speichern');
        b.classList.toggle('an', auswahl.has(b.dataset.id)); b.setAttribute('aria-pressed', String(auswahl.has(b.dataset.id)));
        if (sp) sp.disabled = false;
        k.querySelector('#ez-spalten-hinweis').textContent = auswahl.size ? `Gewählt: ${[...auswahl].join(', ')} – noch nicht gespeichert.` : 'Nichts gewählt – speichern hebt die Festlegung auf.';
      });
      const sp = k.querySelector('#ez-spalten-speichern'), weg = k.querySelector('#ez-spalten-weg');
      if (sp) sp.addEventListener('click', () => speichern([...auswahl].filter(id => L.spalten.some(s => s.id === id))));
      if (weg) weg.addEventListener('click', () => speichern([]));
    };
    async function speichern(wahl) {
      const infoName = g.info ? g.info.split('/').pop() : 'info.txt';
      const inhalt = B.infoText({ kategorie: g.kategorieInfo || '', spalten: L.spalten.filter(s => wahl.includes(s.id)).map(s => s.id), bild: g.bild, text: g.infoText || '' });
      try { await ad().geraetDateien(g.ordner, [{ name: infoName, blob: new Blob([inhalt], { type: 'text/plain' }) }]); }
      catch (e) { meldung('Speichern nicht möglich: ' + e.message, 7000); return; }
      g.spaltenWahl = wahl; spaltenAnwenden(g);
      auswahl = new Set(g.relevantVon === 'wahl' ? L.relevant : []);
      meldung(wahl.length ? `Gespeichert: für unser Gerät gilt ${wahl.join(', ')}.` : 'Festlegung aufgehoben.', 4500);
      geraetSeite(g.ordner);                                         // Tabelle (umrandete Spalten) neu zeichnen
      listeHolen(true);
    }
    zeichnen();
    return k;
  }

  // Fortschritt der Auswertung (Lebenszeichen des Mac-Helfers in Auswertung/mac-helfer.json, Fehlervermerk im Geräteordner)
  let auswertungTimer = null, auswertungLief = false;
  function auswertungStoppen() { clearInterval(auswertungTimer); auswertungTimer = null; }
  const nfc = t => String(t || '').normalize('NFC');
  const uhr = d => { d = new Date(d); return isNaN(d) ? '' : `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  function fortschrittHtml(w, titel = 'Wird ausgewertet') {
    const dreht = I.neu.replace('<svg ', '<svg class="dreht" ');
    if (!w || w.phase === 'vorbereiten' || !w.teile) return `<div class="ez-fortschritt"><div class="titel">${dreht}Liste wird vorbereitet …</div>
      <div class="balken unbestimmt"><i></i></div><div class="zeile"><span>Herunterladen und in Teile aufteilen</span><span>seit ${esc(uhr(w && w.seit))}</span></div></div>`;
    const lauf = w.teil_seit ? Date.now() - Date.parse(w.teil_seit) : 0;
    const schnitt = Number(w.schnitt_ms) || 0;
    const imTeil = schnitt ? Math.min(.9, lauf / schnitt) : Math.min(.5, lauf / 240000);
    const anteil = Math.max(0, Math.min(.99, ((Number(w.fertig) || 0) + (w.fertig >= w.teil ? 0 : imTeil)) / w.teile));
    const rest = schnitt ? Math.max(1, Math.round(((w.teile - (Number(w.fertig) || 0)) * schnitt - (w.fertig >= w.teil ? 0 : lauf)) / 60000)) : 0;
    return `<div class="ez-fortschritt"><div class="titel">${dreht}${titel} <span class="gross">${Math.round(anteil * 100)} %</span></div>
      <div class="balken" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(anteil * 100)}"><i style="width:${(anteil * 100).toFixed(1)}%"></i></div>
      <div class="zeile"><span>Teil ${esc(w.teil || 1)} von ${esc(w.teile)}${w.fertig ? ` · ${esc(w.fertig)} fertig` : ''}</span><span>${rest ? `noch etwa ${rest} min · ` : ''}seit ${esc(uhr(w.seit))}</span></div></div>`;
  }
  async function auswertungZeigen(g) {
    const box = gEl.querySelector('#ez-auswertung');
    if (!box || GSZ.aktuell.ansicht !== 'geraet') { auswertungStoppen(); return; }
    const a = ad();
    let h = null;
    try { h = a && a.helfer ? await a.helfer() : null; } catch { h = null; }
    const lebt = !!(h && h.zeit && Date.now() - Date.parse(h.zeit) < 3 * 60 * 1000);
    const w = h && h.arbeit && h.arbeit.art === 'bestaendigkeit' && nfc(h.arbeit.ordner) === nfc(g.ordner) ? h.arbeit : null;
    let f = null;
    const fp = `${BL}/${g.ordner}/bestaendigkeit.fehler.json`;
    if (dateiInfo(fp)) { try { f = JSON.parse(await (await a.datei(fp)).text()); } catch { f = null; } }
    if (!box.isConnected) return;
    let html;
    if (w) html = fortschrittHtml(w);
    else if (auswertungLief) html = `<div class="ez-fortschritt"><div class="titel">${I.neu}Fertig – die geordnete Liste wird geladen …</div><div class="balken"><i style="width:100%"></i></div></div>`;
    else if (!lebt) html = `<b>Der Mac-Helfer meldet sich nicht</b> (Mac aus, im Ruhezustand oder ohne Netz${h && h.zeit ? `, zuletzt ${esc(datumZeit(h.zeit))}` : ''}). Die Auswertung startet, sobald er läuft. Bis dahin gilt das Original.`;
    else if (h.claude && h.claude.angemeldet === false) html = `<b>Claude ist auf dem Mac nicht angemeldet</b> – im Terminal „claude“ starten und anmelden. ${esc(h.claude.grund || '')}`;
    else if (h.pause_bis && Date.parse(h.pause_bis) > Date.now()) html = `<b>Pause bis ${esc(uhr(h.pause_bis))}</b> – das Kontingent des Claude-Abos ist gerade erschöpft. Danach geht es automatisch weiter.`;
    else if (f && f.anzahl) html = `<b>${f.naechster ? 'Letzter Versuch fehlgeschlagen' : 'Auswertung aufgegeben'}</b> (${esc(f.anzahl)}. Versuch): ${esc(f.fehler || '')}` +
      (f.naechster ? ` – nächster Versuch ab ${esc(uhr(f.naechster))}.` : ' – die Liste oder info.txt ändern, dann versucht es der Mac-Helfer erneut.');
    else if (h.arbeit) html = `<div class="ez-fortschritt"><div class="titel">In der Warteschlange</div><div class="balken"><i style="width:0"></i></div>
      <div class="zeile"><span>Der Mac-Helfer wertet gerade ${h.arbeit.art === 'sdb' ? 'ein Sicherheitsdatenblatt' : `„${esc(h.arbeit.ordner || '')}“`} aus – diese Liste ist danach dran.</span></div></div>`;
    else html = `<div class="ez-fortschritt"><div class="titel">In der Warteschlange</div><div class="balken unbestimmt"><i></i></div>
      <div class="zeile"><span>Der Mac-Helfer beginnt in Kürze (er wartet, bis die Dateien vollständig in der Dropbox sind).</span></div></div>`;
    box.innerHTML = html;
    box.className = 'ez-warn ' + (w || auswertungLief ? 'blau' : !lebt || (f && f.anzahl) ? (f && f.anzahl ? 'rot' : '') : 'blau');
    if (w) auswertungLief = true;
    else if (auswertungLief) { auswertungLief = false; await listeHolen(true); }
    if (dateiInfo(`${BL}/${g.ordner}/${B.DATEI}`)) { auswertungStoppen(); geraeteCache = null; if (GSZ.aktuell.ansicht === 'geraet') geraetSeite(g.ordner); }
  }
  function auswertungBeobachten(g) {
    auswertungStoppen(); auswertungLief = false;
    let n = 0;
    const runde = () => { if (document.hidden) return; if (++n % 5 === 0) listeHolen(true); auswertungZeigen(g); };
    auswertungTimer = setInterval(runde, 4000);
    auswertungZeigen(g);
  }
  // Fortschritt einer angeforderten Prüfung (Lebenszeichen des Mac-Helfers: arbeit.art = 'pruefung')
  let pruefTimer = null;
  function pruefungStoppen() { clearInterval(pruefTimer); pruefTimer = null; }
  async function pruefungZeigen(g, runde) {
    const box = gEl.querySelector('#ez-pruefung');
    if (!box || GSZ.aktuell.ansicht !== 'geraet') { pruefungStoppen(); return; }
    // fertig, sobald pruefen.json weg ist
    if (runde % 4 === 0) {
      await listeHolen(true);
      if (!dateiInfo(`${BL}/${g.ordner}/${B.PRUEF_DATEI}`)) { pruefungStoppen(); geraeteCache = null; if (GSZ.aktuell.ansicht === 'geraet') geraetSeite(g.ordner); return; }
    }
    let h = null;
    try { h = ad() && ad().helfer ? await ad().helfer() : null; } catch { h = null; }
    if (!box.isConnected) return;
    const lebt = !!(h && h.zeit && Date.now() - Date.parse(h.zeit) < 3 * 60 * 1000);
    const w = h && h.arbeit && h.arbeit.art === 'pruefung' && nfc(h.arbeit.ordner) === nfc(g.ordner) ? h.arbeit : null;
    const f = g.pruefAuftrag || {};
    let html;
    if (w) html = fortschrittHtml(w, 'Wird geprüft');
    else if (!lebt) html = `<b>Prüfung angefordert</b> – der Mac-Helfer meldet sich nicht (Mac aus, im Ruhezustand oder ohne Netz${h && h.zeit ? `, zuletzt ${esc(datumZeit(h.zeit))}` : ''}). Die Prüfung startet, sobald er läuft.`;
    else if (h.pause_bis && Date.parse(h.pause_bis) > Date.now()) html = `<b>Prüfung angefordert</b> – Pause bis ${esc(uhr(h.pause_bis))}, das Kontingent des Claude-Abos ist gerade erschöpft.`;
    else if (f.fehler) html = `<b>${(Number(f.versuche) || 0) >= 3 ? 'Prüfung aufgegeben' : 'Letzter Prüfversuch fehlgeschlagen'}</b> (${esc(f.versuche || 1)}. Versuch): ${esc(f.fehler)}` +
      ((Number(f.versuche) || 0) >= 3 ? ' – „Erneut prüfen lassen“ fordert sie neu an.' : ' – nächster Versuch in etwa 10 Minuten.');
    else if (h.arbeit) html = `<div class="ez-fortschritt"><div class="titel">Prüfung in der Warteschlange</div><div class="balken"><i style="width:0"></i></div>
      <div class="zeile"><span>Der Mac-Helfer arbeitet gerade an ${h.arbeit.art === 'sdb' ? 'einem Sicherheitsdatenblatt' : `„${esc(h.arbeit.ordner || '')}“`} – danach ist diese Prüfung dran.</span></div></div>`;
    else html = `<div class="ez-fortschritt"><div class="titel">Prüfung in der Warteschlange</div><div class="balken unbestimmt"><i></i></div>
      <div class="zeile"><span>Der Mac-Helfer beginnt in Kürze.</span></div></div>`;
    box.innerHTML = html;
    box.className = 'ez-warn ' + (f.fehler && !w ? 'rot' : 'blau');
  }
  function pruefungBeobachten(g) {
    pruefungStoppen();
    let n = 0;
    const runde = () => { if (document.hidden) return; pruefungZeigen(g, ++n); };
    pruefTimer = setInterval(runde, 4000);
    pruefungZeigen(g, 1);
  }
  GSZ.ansicht('geraet', { element: gEl, titel: p => dekodiere(String(p).split('/')[0]),
    anzeigen(param) { const [o, k] = String(param).split('/'); geraetSeite(dekodiere(o), k ? dekodiere(k) : ''); }, verlassen() { auswertungStoppen(); pruefungStoppen(); } });

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
  // „Bild anpassen“ auf der Geräteseite springt im Formular direkt zur Bildanzeige
  let sprungZiel = '';
  document.addEventListener('click', e => { const z = e.target.closest && e.target.closest('a[data-sprung]'); if (z) sprungZiel = z.dataset.sprung; }, true);
  async function geraetNeuSeite(ordner) {
    neuEl.innerHTML = '';
    const a = ad();
    if (a && a.verbunden() && !dateien.length) await listeHolen(false);
    const alle = a && a.verbunden() ? await geraete() : [];
    const g = ordner ? alle.find(x => x.ordner === ordner) || alle.find(x => x.ordner.normalize('NFC') === String(ordner).normalize('NFC')) : null;
    const titel = g ? (g.nr ? g.nr + ' · ' : '') + g.name : '';
    neuEl.appendChild(kopf({ titel: g ? 'Gerät bearbeiten' : 'Gerät oder PSA anlegen', unter: g ? esc(titel) : BL,
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
    const bild = bildVon(g), bildVorher = JSON.stringify(bild);
    const knoepfe = (schl, farben = false) => Object.entries(B.BILD_WAHL[schl]).map(([w, t]) => farben
      ? `<button type="button" data-w="${esc(w)}" class="${w === 'auto' ? 'auto' : ''}${bild[schl] === w ? ' an' : ''}" style="--f:${BILD_FARBE[w] || '#ffffff'}" title="${esc(t)}" aria-label="Hintergrund ${esc(t)}" aria-pressed="${bild[schl] === w}"></button>`
      : `<button type="button" data-w="${esc(w)}"${bild[schl] === w ? ' class="an"' : ''} aria-pressed="${bild[schl] === w}">${esc(t)}</button>`).join('');
    k.innerHTML = `<form class="ez-formular" id="gn-form" novalidate>
      ${g ? '' : `<div class="reihe"><label class="feld">Nr.<input type="text" id="gn-nr" inputmode="numeric" maxlength="3" placeholder="${vorschlag}"></label>
        <label class="feld">Bezeichnung<input type="text" id="gn-name" maxlength="80" placeholder="z. B. Tychem TK Gasschutzanzug" autocomplete="off"></label></div>`}
      <label class="feld">Gruppe<select id="gn-kat">${B.KATEGORIEN.map(c => `<option${c === (katJetzt || 'Schutzkleidung') ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <span class="ez-klein" style="font-weight:400">„Schutzkleidung“ erscheint im Einsatzbildschirm auch unter PSA.</span></label>
      <div class="feld" style="display:flex;flex-direction:column;gap:.35rem"><span class="ez-klein" style="font-weight:600;color:var(--ink2)">Foto</span>
        <div class="ez-wahl"><label class="knopf ez-import">${I.kamera}<span>${g && g.foto ? 'Foto ersetzen' : 'Foto aufnehmen oder wählen'}</span><input type="file" id="gn-foto" accept="image/*"></label>
          <div class="namen" id="gn-foto-name"></div></div></div>
      <div class="feld" id="gn-bild" style="display:flex;flex-direction:column;gap:.45rem"><span class="ez-klein" style="font-weight:600;color:var(--ink2)">Bildanzeige</span>
        <div class="ez-bildwahl">
          <div class="ez-bildrahmen${bildFuellen(bild)}" id="gn-rahmen" style="${bildStil(bild)}"><img id="gn-rahmen-bild" alt="Vorschau"${g && g.foto ? ` data-foto="${esc(g.foto)}"` : ' hidden'}>${g && g.foto ? '' : '<span class="leer" id="gn-rahmen-leer">noch kein Foto</span>'}</div>
          <div class="ez-optionen">
            <div class="gruppe"><span>Hintergrund</span><div class="ez-segment ez-farben" data-k="hintergrund">${knoepfe('hintergrund', true)}</div></div>
            <div class="gruppe"><span>Format</span><div class="ez-segment" data-k="format">${knoepfe('format')}</div></div>
            <div class="gruppe"><span>Größe</span><div class="ez-segment" data-k="groesse">${knoepfe('groesse')}</div></div>
            <div class="gruppe"><span>Darstellung</span><div class="ez-segment" data-k="darstellung">${knoepfe('darstellung')}</div></div>
            <div class="gruppe"><span>Ausschnitt</span><div class="ez-zoomzeile">
              <button type="button" class="knopf" id="gn-zoom-minus" aria-label="Verkleinern">−</button>
              <input type="range" id="gn-zoom" min="1" max="5" step="0.05" value="${esc(bild.zoom)}" aria-label="Zoom des Bildes">
              <button type="button" class="knopf" id="gn-zoom-plus" aria-label="Vergrößern">+</button><b id="gn-zoom-wert">${Math.round(bild.zoom * 100)} %</b></div>
              <div class="ez-zoomzeile"><button type="button" class="knopf" id="gn-ausschnitt-weg" style="min-width:0;font-weight:600">Ausschnitt zurücksetzen</button></div></div>
          </div></div>
        <span class="ez-klein" style="font-weight:400">Ausschnitt wählen: das Bild in der Vorschau mit dem Finger verschieben, mit zwei Fingern, dem Regler oder dem Mausrad zoomen – das Foto selbst bleibt unverändert.
          Gilt in der Übersicht, auf der Geräteseite und bei den Beständigkeiten. „Groß“ zeigt das Bild in der Übersicht doppelt breit; „Automatisch“ ist der weiße Rahmen wie bisher.</span></div>
      <div class="feld" style="display:flex;flex-direction:column;gap:.35rem"><span class="ez-klein" style="font-weight:600;color:var(--ink2)">Beständigkeitsliste des Herstellers</span>
        <div class="ez-wahl"><label class="knopf ez-import">${I.blatt}<span>${g && g.quellen.length ? 'Weitere Liste hinzufügen' : 'Liste wählen (PDF oder Fotos)'}</span>
          <input type="file" id="gn-liste" accept="application/pdf,.pdf,image/*" multiple></label>
          <div class="namen" id="gn-liste-namen"></div></div></div>
      <label class="feld">Werkstoff bzw. Ausführung unseres Geräts, Hinweise (freiwillig)<textarea id="gn-info" placeholder="z. B. „Anzug: SYKAN 2“ oder „Dichtung FKM, Gehäuse Edelstahl 1.4571“">${esc(g ? g.infoText || '' : '')}</textarea>
        <span class="ez-klein" style="font-weight:400">Enthält die Liste mehrere Werkstoffe oder Ausführungen, wählt die Auswertung damit die passende Spalte. Nach der Auswertung lässt sich die Spalte auf der Geräteseite auch direkt antippen („Für unser Gerät gilt“).</span></label>
      <button class="knopf los" type="submit" id="gn-los">${g ? 'Speichern' : 'Gerät anlegen'}</button>
      <div class="ez-klein" id="gn-status"></div></form>`;
    // Dateien des Geräts (nur beim Bearbeiten): einzeln löschen; dazu das ganze Gerät löschen
    const imOrdner = g ? dateien.filter(d => !d.ordner && ordnerVon(d.pfad) === BL + '/' + g.ordner) : [];
    const artVon = n => {
      const l = n.toLowerCase();
      if (g.foto && g.foto.split('/').pop().toLowerCase() === l) return ['foto', 'Foto des Geräts', '#2f8f5b'];
      if (l === B.DATEI) return ['auswertung', g.daten && g.daten.auswertung && g.daten.auswertung.geprueft ? 'Geordnete Fassung (geprüft)' : 'Geordnete Fassung (Auswertung)', 'var(--akzent)'];
      if (l === 'bestaendigkeit.fehler.json') return ['fehler', 'Fehlervermerk des Mac-Helfers', '#6b7480'];
      if (l === 'bestaendigkeit.alt.json') return ['alt', 'Sicherung einer früheren geprüften Fassung', '#6b7480'];
      if (l === B.PRUEF_DATEI) return ['sonst', 'Prüfauftrag für den Mac-Helfer (löschen bricht ihn ab)', '#6b7480'];
      if (g.info && g.info.split('/').pop().toLowerCase() === l) return null;                 // Angaben: oben im Formular
      if (g.quellen.some(q => q.split('/').pop().toLowerCase() === l)) return ['liste', 'Beständigkeitsliste', (TYP[endung(n)] || [, '#d64045'])[1]];
      return ['sonst', 'Datei', '#6b7480'];
    };
    const zeilen = imOrdner.map(d => ({ d, art: artVon(d.name) })).filter(x => x.art)
      .sort((x, y) => ['foto', 'liste', 'auswertung', 'alt', 'fehler', 'sonst'].indexOf(x.art[0]) - ['foto', 'liste', 'auswertung', 'alt', 'fehler', 'sonst'].indexOf(y.art[0]));
    if (g) {
      const k2 = document.createElement('section');
      k2.className = 'kachel ez-karte';
      k2.innerHTML = `<h2>Dateien des Geräts</h2>
        ${zeilen.length ? `<ul class="ez-dateiliste">${zeilen.map(({ d, art }) => `<li><span class="sym" style="--c:${art[2]}">${art[0] === 'foto' ? `<img data-foto="${esc(d.pfad)}" alt="">` : esc((TYP[endung(d.name)] || [endung(d.name).toUpperCase().slice(0, 4) || 'DATEI'])[0])}</span>
          <span><b>${esc(d.name)}</b><small>${esc(art[1])}${d.groesse ? ' · ' + esc(groesse(d.groesse)) : ''}</small></span>
          <button type="button" class="knopf weg" data-weg="${esc(d.name)}" data-art="${art[0]}" aria-label="${esc(d.name)} löschen">${I.muell}<span>Löschen</span></button></li>`).join('')}</ul>`
          : '<div class="ez-leer">Keine Dateien.</div>'}
        <div class="ez-klein" style="margin-top:.5rem">Gelöschtes liegt noch 30 Tage im Papierkorb der Dropbox und lässt sich dort wiederherstellen.</div>
        ${a.geraetLoeschen ? `<div class="ez-gefahr" style="margin-top:.9rem"><b>Gerät löschen</b>
          <span class="ez-klein">Entfernt „${esc(titel)}“ mit Foto, Listen und Auswertung aus dem Dropbox-App-Ordner.</span>
          <button type="button" class="knopf weg" id="gn-geraet-weg">${I.muell}<span>Gerät löschen</span></button></div>` : ''}`;
      neuEl.appendChild(k2);
      fotoEinsetzen(k2);
      k2.addEventListener('click', async e => {
        const b = e.target.closest('[data-weg]');
        if (b) {
          const name = b.dataset.weg, art = b.dataset.art;
          const listen = zeilen.filter(x => x.art[0] === 'liste');
          const abgeleitet = imOrdner.filter(d => /^bestaendigkeit\.(json|fehler\.json)$/i.test(d.name)).map(d => d.name);
          const weg = [name];
          let frage = `„${name}“ löschen?`;
          if (art === 'liste' && listen.length === 1) { frage = `Liste „${name}“ löschen? Es ist die einzige Liste – die geordnete Fassung wird mit gelöscht.`; weg.push(...abgeleitet); }
          else if (art === 'liste') frage = `Liste „${name}“ löschen? Der Mac-Helfer wertet die übrigen Listen danach neu aus.`;
          else if (art === 'foto') frage = 'Foto des Geräts löschen?';
          else if (art === 'auswertung') {
            frage = `${g.daten && g.daten.auswertung && g.daten.auswertung.geprueft ? 'Die GEPRÜFTE geordnete Fassung' : 'Die geordnete Fassung'} löschen? Der Mac-Helfer erstellt sie aus den Listen neu (dann ungeprüft).`;
            weg.push(...abgeleitet.filter(n => n.toLowerCase() !== name.toLowerCase()));
          }
          if (!confirm(frage)) return;
          b.disabled = true;
          try { await a.geraetDateien(g.ordner, [], { loeschen: [...new Set(weg)] }); }
          catch (f) { b.disabled = false; meldung('Löschen nicht möglich: ' + f.message, 7000); return; }
          geraeteCache = null; urlCache.clear();
          await listeHolen(true);
          meldung(weg.length === 1 ? `„${name}“ gelöscht.` : `„${name}“ und die geordnete Fassung gelöscht.`, 4500);
          geraetNeuSeite(g.ordner);
          return;
        }
        if (e.target.closest('#gn-geraet-weg')) {
          const n = zeilen.filter(x => x.art[0] === 'liste').length;
          if (!confirm(`Gerät „${titel}“ wirklich löschen – mit Foto, ${n === 1 ? 'Liste' : n + ' Listen'} und Auswertung?`)) return;
          try { await a.geraetLoeschen(g.ordner); }
          catch (f) { meldung('Löschen nicht möglich: ' + f.message, 7000); return; }
          geraeteCache = null; urlCache.clear();
          await listeHolen(true);
          GSZ.zeige('ordner/' + kodiere(BL), true);
          meldung(`„${titel}“ gelöscht.`, 5000);
        }
      });
    }
    fotoEinsetzen(k);
    const form = k.querySelector('#gn-form'), fotoFeld = k.querySelector('#gn-foto'), listeFeld = k.querySelector('#gn-liste');
    const rahmen = k.querySelector('#gn-rahmen');
    const zoomFeld = k.querySelector('#gn-zoom'), zoomWert = k.querySelector('#gn-zoom-wert');
    const bildAnwenden = () => {
      rahmen.setAttribute('style', bildStil(bild));
      rahmen.className = 'ez-bildrahmen' + bildFuellen(bild) + (rahmen.classList.contains('zieht') ? ' zieht' : '');
      if (document.activeElement !== zoomFeld) zoomFeld.value = String(bild.zoom);
      zoomWert.textContent = Math.round(bild.zoom * 100) + ' %';
      for (const seg of k.querySelectorAll('.ez-segment[data-k]')) for (const b of seg.querySelectorAll('button')) {
        const an = bild[seg.dataset.k] === b.dataset.w; b.classList.toggle('an', an); b.setAttribute('aria-pressed', String(an));
      }
    };
    k.addEventListener('click', e => {
      const b = e.target.closest('.ez-segment[data-k] button');
      if (!b) return;
      bild[b.closest('.ez-segment').dataset.k] = b.dataset.w;
      bildAnwenden();
    });
    // Ausschnitt: ein Finger bzw. Maus verschiebt, zwei Finger bzw. Mausrad zoomen (um den gewählten Mittelpunkt)
    const zwischen = (n, a, b) => Math.min(b, Math.max(a, n));
    const finger = new Map();
    let griff = null;
    const griffMerken = () => { griff = finger.size ? { finger: new Map(finger), x: bild.x, y: bild.y, zoom: bild.zoom } : null; };
    rahmen.addEventListener('pointerdown', e => {
      if (!k.querySelector('#gn-rahmen-bild') || k.querySelector('#gn-rahmen-bild').hidden) return;
      e.preventDefault();
      try { rahmen.setPointerCapture(e.pointerId); } catch { /* egal */ }
      finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      rahmen.classList.add('zieht');
      griffMerken();
    });
    rahmen.addEventListener('pointermove', e => {
      if (!finger.has(e.pointerId) || !griff) return;
      finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = rahmen.getBoundingClientRect();
      if (finger.size >= 2 && griff.finger.size >= 2) {
        const [a, b] = [...finger.values()], [a0, b0] = [...griff.finger.values()];
        bild.zoom = zwischen(griff.zoom * Math.hypot(a.x - b.x, a.y - b.y) / (Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1), 1, 5);
      } else {
        const p0 = griff.finger.get(e.pointerId);
        if (!p0) return;
        const f = Math.max(bild.zoom - 1, .35);                       // je stärker vergrößert, desto feiner
        bild.x = zwischen(griff.x - (e.clientX - p0.x) / r.width * 100 / f, 0, 100);
        bild.y = zwischen(griff.y - (e.clientY - p0.y) / r.height * 100 / f, 0, 100);
      }
      bildAnwenden();
    });
    const loslassen = e => { finger.delete(e.pointerId); if (!finger.size) rahmen.classList.remove('zieht'); griffMerken(); };
    rahmen.addEventListener('pointerup', loslassen);
    rahmen.addEventListener('pointercancel', loslassen);
    rahmen.addEventListener('wheel', e => { e.preventDefault(); bild.zoom = zwischen(bild.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 1, 5); bildAnwenden(); }, { passive: false });
    zoomFeld.addEventListener('input', () => { bild.zoom = zwischen(Number(zoomFeld.value) || 1, 1, 5); bildAnwenden(); });
    k.querySelector('#gn-zoom-minus').addEventListener('click', () => { bild.zoom = zwischen(Math.round((bild.zoom - .25) * 4) / 4, 1, 5); bildAnwenden(); });
    k.querySelector('#gn-zoom-plus').addEventListener('click', () => { bild.zoom = zwischen(Math.round((bild.zoom + .25) * 4) / 4, 1, 5); bildAnwenden(); });
    k.querySelector('#gn-ausschnitt-weg').addEventListener('click', () => { bild.zoom = 1; bild.x = 50; bild.y = 50; bildAnwenden(); });
    let foto = null, listen = [];
    fotoFeld.addEventListener('change', () => {
      foto = fotoFeld.files[0] || null;
      if (!foto) return;
      const img = k.querySelector('#gn-rahmen-bild'), leer = k.querySelector('#gn-rahmen-leer');
      img.src = URL.createObjectURL(foto); img.hidden = false;
      if (leer) leer.remove();
      k.querySelector('#gn-foto-name').textContent = 'neu: ' + (foto.name || 'Foto');
    });
    listeFeld.addEventListener('change', () => {
      listen = [...listeFeld.files];
      k.querySelector('#gn-liste-namen').textContent = listen.length ? 'gewählt: ' + listen.map(f => f.name || 'Foto').join(', ') : '';
    });
    if (sprungZiel) {
      const z = k.querySelector('#' + sprungZiel);
      sprungZiel = '';
      if (z) requestAnimationFrame(() => requestAnimationFrame(() => z.scrollIntoView({ block: 'start', behavior: 'smooth' })));
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const los = k.querySelector('#gn-los'), status = k.querySelector('#gn-status');
      const name = g ? '' : dateiName(k.querySelector('#gn-name').value);
      if (!g && !name) { meldung('Bitte eine Bezeichnung eingeben.'); k.querySelector('#gn-name').focus(); return; }
      const nr = g ? '' : (k.querySelector('#gn-nr').value.replace(/\D/g, '') || vorschlag);
      const ziel = g ? g.ordner : dateiName(`${nr.padStart(2, '0')} ${name}`);
      if (!g && alle.some(x => x.ordner.toLowerCase() === ziel.toLowerCase())) { meldung('Ein Gerät mit diesem Namen gibt es schon.'); return; }
      const imZiel = dateien.filter(d => !d.ordner && ordnerVon(d.pfad) === BL + '/' + ziel);
      const vorhanden = new Set(imZiel.map(d => d.name.toLowerCase()));
      const groesseVon = new Map(imZiel.map(d => [d.name.toLowerCase(), d.groesse]));
      const frei = n => { let x = n, i = 2; const p = n.lastIndexOf('.'); while (vorhanden.has(x.toLowerCase())) x = p > 0 ? `${n.slice(0, p)} (${i++})${n.slice(p)}` : `${n} (${i++})`; vorhanden.add(x.toLowerCase()); return x; };
      const hoch = [], weg = [], schonDa = [];
      if (foto) {
        const b = await fotoVerkleinern(foto);
        const fn = 'Foto.' + (b.type === 'image/jpeg' ? 'jpg' : (endung(foto.name) || 'jpg'));
        if (g && g.foto && g.foto.split('/').pop() !== fn) weg.push(g.foto.split('/').pop());
        hoch.push({ name: fn, blob: b });
      }
      let seite = imZiel.filter(d => /^Liste Seite \d+/i.test(d.name)).length;
      for (const l of listen) {
        const bildDatei = /^image\//.test(l.type) || istBild(l.name);
        let n = bildDatei ? `Liste Seite ${++seite}.${endung(l.name) || 'jpg'}` : dateiName(l.name) || 'Liste.pdf';
        if (/^(foto|bild|ger(ä|ae)t|photo|image)/i.test(n)) n = 'Liste ' + n;
        // dieselbe Liste noch einmal gewählt (gleicher Name, gleiche Größe): nicht als „… (2)“ doppelt ablegen
        if (!bildDatei && groesseVon.get(n.toLowerCase()) === l.size) { schonDa.push(n); continue; }
        hoch.push({ name: frei(n), blob: l });
      }
      const kat = k.querySelector('#gn-kat').value, info = k.querySelector('#gn-info').value.trim();
      const bildNeu = JSON.stringify(bild) !== bildVorher;
      if (!g || kat !== katJetzt || info !== (g.infoText || '') || bildNeu) hoch.push({ name: g && g.info ? g.info.split('/').pop() : 'info.txt',
        blob: new Blob([B.infoText({ kategorie: kat, spalten: g ? g.spaltenWahl || [] : [], bild, text: info })], { type: 'text/plain' }) });
      if (g && !hoch.length) { meldung(schonDa.length ? `„${schonDa.join('“, „')}“ ist schon vorhanden – nichts geändert.` : 'Nichts geändert.', 6000); return; }
      los.disabled = true; status.textContent = 'Wird gespeichert …';
      try {
        await a.geraetDateien(ziel, hoch, { loeschen: weg }, (n, von) => { status.textContent = `Wird hochgeladen … ${n} von ${von}`; });
      } catch (f) { los.disabled = false; status.textContent = ''; meldung('Speichern nicht möglich: ' + f.message, 8000); return; }
      geraeteCache = null; urlCache.clear();
      await listeHolen(true);
      GSZ.zeige('geraet/' + kodiere(ziel), true);
      const neuListen = listen.length - schonDa.length;
      meldung((g ? 'Gespeichert.' : neuListen ? `„${name}“ angelegt – der Mac-Helfer wertet die Liste aus, sobald er läuft.` : `„${name}“ angelegt. Die Beständigkeitsliste lässt sich über „Bearbeiten“ nachreichen.`) +
        (schonDa.length ? ` „${schonDa.join('“, „')}“ war schon vorhanden und wurde nicht doppelt abgelegt.` : ''), 7000);
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
    if (a.ansicht === 'einsatz') { ordnerZeigen(); statusZeigen(); eigeneZeigen(); }
    else if (a.ansicht === 'ordner') ordnerSeite(dekodiere(a.param));
    else statusZeigen();
    schilderAktualisieren();
  }

  // Einsatz-Seite öffnen und suchen (eindeutige CAS/UN öffnet den Stoff direkt)
  function suchenUndZeigen(text) { GSZ.zeige('einsatz'); suchen(text, true); }

  // für sdb-import.js und die Tests
  window.GSZEinsatz = { stoffSeite, stoffElement: sEl, dateiZeigen, kopf, ansichtElement, esc, datumZeit, groesse, meldung, I, zoomErlauben,
    ehHtml, dekonHtml,
    listeHolen, geraete, get dateien() { return dateien; }, stoffHolen, suchen: suchenUndZeigen, symbol, zuletzt, miniTafel, nameSchoen,
    stoffInfoVon, kategorie, pruefBadge, STUFE_FARBE, ad };
})();
