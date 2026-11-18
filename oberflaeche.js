// Hauptmenü („Einsatz“ und „Übungen“), Übungen-Menü und Übungsanwesenheit – gemeinsam für das Programm
// „Gefahrstoffzug TE Miehlen“ (Mac/Windows, früher CSA-Monitor) und die Web-App (Handy). Die Einsatz-Ansichten kommen aus
// einsatz.js und melden sich mit GSZ.ansicht(…) an. Wird hinter monitor.html geladen. Die Plattform (start.js bzw.
// web-start.js) ruft auf:
//   GSZ.einrichten(adapter)  adapter = {
//       geraet: 'Mac · CSA-Monitor 1.2.0',                  steht in jeder Meldung
//       speichern(meldung) -> Promise<{ ok, text?, aktion?, daten? }>   Meldung verschlüsselt ablegen
//       einstellungen?(knopf)                                Zahnrad-Menü (nur Web-App)
//       verbinden?()                                         neu mit Dropbox verbinden (Web-App, Schreibrecht)
//   }
//   GSZ.daten(daten)         neue Daten: { leute, anwesenheit: { eingerichtet, personen, uebungen }, ausstehend, quelle }
//   GSZ.zeige('start' | 'uebungen' | 'monitor' | 'anwesenheit' | 'einsatz' | …)
//   adapter.personalAnfordern?()  wird aufgerufen, sobald eine Übungen-Ansicht die Personaltabelle braucht (Kennwort erst dann)
// Ansichten über die Adresse (#start, #uebungen, #monitor, #anwesenheit, #einsatz, #stoff/…), damit „Zurück“ (auch Wischen
// am iPhone) funktioniert.
// Erfasste Anwesenheiten gehen in einen Postausgang (im Gerätespeicher) und werden von dort übertragen – ohne Netz
// bleiben sie erhalten und werden später gesendet. Excel übernimmt die Meldungen beim Öffnen der Personaltabelle.
'use strict';
(() => {
  const css = `
  /* Alle Ansichten außer dem Monitor sind <main class="gsz-ansicht">; sichtbar ist nur die aktive. Fest stehende Ebenen
     (Anmeldung, Hinweise, Menüs) tragen die Klasse gsz-ebene bzw. ihre ids. */
  body[data-ansicht]:not([data-ansicht="monitor"]) > :not(main.gsz-ansicht.aktiv):not(.gsz-ebene):not(#anmeldung):not(#update):not(#web-meldung):not(#einst):not(#statusband):not(script):not(style),
  body[data-ansicht="monitor"] > main.gsz-ansicht, body:not([data-ansicht]) > main.gsz-ansicht,
  body > main.gsz-ansicht:not(.aktiv) { display: none !important; }
  body[data-ansicht]:not([data-ansicht="monitor"]) { padding: 0; gap: 0; display: block; min-height: 100vh; min-height: 100svh; }
  .gsz-ansicht { --rund: .8rem; font-size: 16px; color: var(--ink); }
  .logo-hell { object-fit: contain !important; border-radius: 0 !important; }
  :root:not(.hell) .logo-hell, :root.hell .logo-dunkel:not(.allein) { display: none !important; }

  /* Übungen-Menü (zentriert) und Bausteine des Hauptmenüs */
  #uebungen { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: calc(1.5rem + var(--frei-oben)) calc(1.2rem + var(--sicher-rechts)) calc(1.2rem + var(--sicher-unten)) calc(1.2rem + var(--sicher-links));
    gap: 1.8rem; }
  .st-kacheln { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem; width: min(46rem, 100%); }
  .st-kachel { display: flex; flex-direction: column; gap: .45rem; padding: 1.3rem 1.3rem 1.15rem; border-radius: var(--rund);
    background: var(--surface); box-shadow: var(--schatten); color: var(--ink); text-decoration: none; position: relative;
    border-top: .3rem solid var(--c); transition: background-color .12s ease; -webkit-tap-highlight-color: transparent; }
  .st-kachel:hover { background: color-mix(in srgb, var(--c) 5%, var(--surface)); }
  .st-kachel:active { background: color-mix(in srgb, var(--c) 10%, var(--surface)); }
  .st-kachel:focus-visible { outline: 3px solid var(--akzent); outline-offset: 2px; }
  .st-kachel svg { width: 2.6rem; height: 2.6rem; color: var(--c); }
  .st-kachel > b { font-size: 1.35rem; }
  .st-kachel > span { color: var(--ink2); font-size: .92rem; line-height: 1.35; }
  .st-kachel em b { font-size: 1.05em; }
  .st-kachel em { font-style: normal; font-size: .88rem; color: var(--ink); background: var(--surface2); border: 1px solid var(--line);
    border-radius: .5rem; padding: .4rem .55rem; margin-top: .25rem; line-height: 1.35; min-height: 2.3em; }
  .st-kachel em .warn { color: var(--ser); font-weight: 600; }
  .st-kachel em .gut { color: var(--good); font-weight: 600; }
  .st-kachel .pfeil { position: absolute; right: 1.1rem; top: 1.1rem; font-size: 1.4rem; color: var(--muted); }

  /* Hauptmenü: schlichte Kopfleiste (folgt Hell/Dunkel, hell mit dem Logo in schwarzer Schrift), Uhrzeit und Schnellsuche;
     darunter Einsatz und Übungen, zuletzt geöffnete Stoffe. Farbe nur mit Bedeutung: rot Einsatz, blau Bedienung. */
  #startseite { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; }
  body[data-ansicht="start"] #statusband { background: var(--kopf); }
  .st-held { background: var(--kopf); color: var(--ink); border-bottom: 1px solid var(--line);
    padding: calc(1rem + var(--frei-oben)) calc(1.25rem + var(--sicher-rechts)) 1.1rem calc(1.25rem + var(--sicher-links)); }
  .st-held-innen { width: min(60rem, 100%); margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
  .st-kopfzeile { display: flex; align-items: center; gap: 1rem; }
  .st-marke { display: flex; align-items: center; gap: .85rem; min-width: 0; flex: 1; }
  .st-logo { height: 3.6rem; flex: none; display: flex; align-items: center; }
  .st-logo img { height: 100%; width: auto; aspect-ratio: 19 / 25; object-fit: cover; border-radius: .5rem; display: block; }
  .st-name { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
  .st-ueber { font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--muted); }
  #startseite h1 { margin: 0; font-size: 1.8rem; line-height: 1.05; font-weight: 800; color: var(--ink); }
  .st-te { font-size: .95rem; font-weight: 600; color: var(--ink2); }
  .st-uhr { display: flex; flex-direction: column; align-items: flex-end; font-variant-numeric: tabular-nums; flex: none; }
  .st-uhr b { font-size: 1.8rem; font-weight: 800; line-height: 1; }
  .st-uhr span { font-size: .76rem; color: var(--muted); margin-top: .25rem; }
  .st-suche { display: flex; align-items: center; gap: .55rem; background: var(--surface); border: 1px solid var(--rand); border-radius: .75rem;
    padding: .3rem .3rem .3rem .85rem; }
  .st-suche:focus-within { border-color: var(--akzent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--akzent) 25%, transparent); }
  .st-suche svg { width: 1.2rem; height: 1.2rem; color: var(--muted); flex: none; }
  .st-suche input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 17px; color: var(--ink);
    padding: .62rem 0; margin: 0; -webkit-appearance: none; appearance: none; }
  .st-suche input::placeholder { color: var(--muted); }
  .st-suche input::-webkit-search-cancel-button { display: none; }
  .st-suche button { font: inherit; font-size: .95rem; font-weight: 700; color: #fff; background: var(--akzent); border: 0; border-radius: .55rem;
    padding: .68rem 1.05rem; cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
  .st-suche button:active { filter: brightness(.9); }
  /* Lage auf einen Blick: laufender Einsatz, Wind (zuletzt abgerufen), Grundlage der Bereiche */
  .st-lage { display: flex; flex-wrap: wrap; gap: .4rem; }
  .st-lage[hidden] { display: none; }
  .st-lage a, .st-lage span { display: inline-flex; align-items: center; gap: .4rem; font-size: .82rem; font-weight: 600; color: var(--ink2); text-decoration: none;
    background: var(--surface2); border: 1px solid var(--line); border-radius: .5rem; padding: .32rem .6rem; }
  .st-lage .laeuft { background: var(--crit); border-color: var(--crit); color: #fff; }
  .st-lage svg { width: 1rem; height: 1rem; flex: none; color: var(--akzent); }
  .st-inhalt { width: min(60rem, 100%); margin: 0 auto; box-sizing: border-box; flex: 1; display: flex; flex-direction: column; gap: 1.2rem;
    padding: 1.2rem calc(1.25rem + var(--sicher-rechts)) calc(1.1rem + var(--sicher-unten)) calc(1.25rem + var(--sicher-links)); }
  #startseite .st-kacheln { width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem; }
  #startseite .st-kachel { padding: 1.2rem 1.2rem 1.1rem; min-height: 10rem; border-top: 0; border-left: .3rem solid var(--c); border-radius: .75rem; }
  #startseite .st-kachel svg { width: 2.8rem; height: 2.8rem; }
  #startseite .st-kachel > b { font-size: 1.45rem; }
  #st-einsatz-info:empty { display: none; }
  /* Was ist neu */
  .st-neu { position: relative; background: var(--surface); box-shadow: var(--schatten); border-radius: 1rem; padding: .85rem 2.6rem .85rem 1rem; border-left: 4px solid var(--akzent); }
  .st-neu h2 { margin: 0 0 .4rem; font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--akzent); }
  .st-neu ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .3rem; font-size: .9rem; line-height: 1.4; }
  .st-neu .zu { position: absolute; top: .45rem; right: .45rem; width: 2.2rem; height: 2.2rem; border-radius: 50%; border: 0; background: var(--surface2); color: var(--ink2); font-size: 1.2rem; cursor: pointer; }
  .st-neu a, .st-alle-neu { color: var(--akzent); font-weight: 600; }
  #st-handschuh { display: inline-flex; align-items: center; gap: .35rem; } #st-handschuh svg { width: 1.1rem; height: 1.1rem; }
  #st-handschuh[aria-pressed="true"] { background: var(--akzent); color: #fff; border-color: var(--akzent); }
  #gsz-neu-ebene { position: fixed; inset: 0; z-index: 70; background: rgba(0, 0, 0, .55); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  #gsz-neu-ebene > div { background: var(--surface); color: var(--ink); border-radius: 1rem; box-shadow: var(--schatten); max-width: 40rem; width: 100%; max-height: 85vh; overflow: auto; padding: 1rem 1.2rem; }
  #gsz-neu-ebene h2 { margin: 0 0 .6rem; } #gsz-neu-ebene h3 { margin: .9rem 0 .3rem; font-size: .95rem; }
  #gsz-neu-ebene ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .25rem; font-size: .92rem; line-height: 1.4; }
  .st-zuletzt h2 { margin: 0 0 .55rem; font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--ink2); }
  .st-chips { display: flex; gap: .55rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding: .15rem .1rem .45rem; }
  .st-chips::-webkit-scrollbar { display: none; }
  .st-chip { flex: none; display: inline-flex; align-items: center; gap: .6rem; padding: .45rem .8rem .45rem .45rem; border-radius: .85rem;
    background: var(--surface); box-shadow: var(--schatten); color: var(--ink); text-decoration: none; max-width: 15rem; -webkit-tap-highlight-color: transparent; }
  .st-chip span { font-size: .9rem; font-weight: 600; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .st-chip .ez-mini-tafel { flex: none; }
  #startseite .st-fuss { margin-top: auto; padding-top: .6rem; border-top: 1px solid var(--line); width: 100%; max-width: none; justify-content: space-between; }
  .st-fuss select { font: inherit; font-size: 16px; padding: .25rem .4rem; border-radius: .4rem; border: 1px solid var(--rand);
    background: var(--surface2); color: var(--ink); }
  .ue-kopf { width: min(46rem, 100%); display: flex; align-items: center; gap: .8rem; }
  .ue-kopf h1 { margin: 0; font-size: 1.9rem; flex: 1; }
  .ue-kopf .knopf { text-decoration: none; display: inline-flex; align-items: center; gap: .35rem; }
  .st-fuss { display: flex; gap: .8rem 1.2rem; align-items: center; justify-content: center; flex-wrap: wrap; color: var(--muted);
    font-size: .8rem; text-align: center; max-width: 46rem; }
  .st-fuss label { display: inline-flex; gap: .4rem; align-items: center; cursor: pointer; }
  .st-fuss .knopf { font-size: .95rem; }

  /* Übungsanwesenheit */
  #anwesenheit { max-width: 56rem; margin: 0 auto; display: flex; flex-direction: column; gap: .8rem;
    padding: calc(.7rem + var(--frei-oben)) calc(.8rem + var(--sicher-rechts)) calc(7.5rem + var(--sicher-unten)) calc(.8rem + var(--sicher-links)); }
  /* Logo über die volle Höhe der Leiste: mindestens so hoch wie Titel und Unterzeile (dann bestimmt das Logo die Höhe),
     Breite im Umriss der hellen Fassung (1184 × 1555) – das quadratische Original wird seitlich auf denselben Umriss
     beschnitten (dort nur dunkelblauer Rand), damit Hell und Dunkel gleich breit sind und der Titel gleich umbricht */
  .aw-kopf { display: flex; align-items: center; gap: .8rem; padding: .3rem .8rem .3rem .45rem; }
  .aw-kopf img { height: 3.4rem; width: auto; aspect-ratio: 19 / 25; object-fit: cover; border-radius: .45rem; flex: none; }
  .aw-te { white-space: nowrap; }
  .aw-titel { flex: 1; min-width: 0; }
  /* „Übungs­anwesenheit“ trennt nur, wenn die Zeile zu schmal ist (weiches Trennzeichen im Titel) */
  .aw-titel h1 { margin: 0; font-size: 1.35rem; line-height: 1.15; -webkit-hyphens: manual; hyphens: manual; overflow-wrap: break-word; }
  .aw-titel div { color: var(--muted); font-size: .8rem; line-height: 1.3; }
  .aw-kopf .knopf, .aw-leiste .knopf { text-decoration: none; white-space: nowrap; }
  .aw-kopf .knopf { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; flex: none; }
  .aw-kopf .knopf svg { width: 1.1em; height: 1.1em; flex: none; }
  .gsz-ansicht .knopf { font-size: .95rem; padding: .45rem .75rem; }
  .gsz-ansicht h2 { margin: 0 0 .55rem; font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; color: var(--ink2); }
  .aw-uebung, .aw-liste { padding: .8rem .9rem .9rem; }
  .aw-felder { display: grid; grid-template-columns: 11rem minmax(0, 1fr); gap: .7rem; }
  .aw-felder label { display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; color: var(--ink2); }
  .aw-felder input { font: inherit; font-size: 16px; height: 2.75em; line-height: 1.2; padding: 0 .65rem; margin: 0;
    border-radius: .5rem; border: 2px solid var(--eingabe-rand); background: var(--eingabe); color: var(--ink);
    min-width: 0; width: 100%; box-sizing: border-box; display: block; -webkit-appearance: none; appearance: none; }
  /* Safari (iPhone) zeichnet Datumsfelder sonst höher als Textfelder und zentriert den Wert; die Auswahl öffnet sich weiter */
  .aw-felder input[type=date] { -webkit-appearance: none; appearance: none; line-height: calc(2.75em - 4px); }   /* Wert mittig */
  .aw-felder input[type=date]::-webkit-date-and-time-value { text-align: left; margin: 0; }
  .aw-chips { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .7rem; }
  .aw-chip { font: inherit; font-size: .82rem; padding: .35rem .6rem; border-radius: 1rem; border: 1px solid var(--rand);
    background: var(--surface2); color: var(--ink2); cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent;
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .aw-chip.gewaehlt { background: var(--akzent); border-color: var(--akzent); color: #fff; font-weight: 600; }
  .aw-chip.geplant:not(.gewaehlt) { border-style: dashed; }
  .aw-chip small { opacity: .8; }
  .aw-hinweis { margin-top: .6rem; font-size: .85rem; color: var(--ink2); line-height: 1.4; }
  .aw-hinweis b { color: var(--ink); }
  .aw-werkzeuge { display: flex; gap: .5rem .7rem; flex-wrap: wrap; align-items: center; margin-bottom: .55rem; }
  .aw-werkzeuge input { flex: 1 1 12rem; font: inherit; font-size: 16px; padding: .5rem .65rem; border-radius: .5rem;
    border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); min-width: 0; margin: 0;
    -webkit-appearance: none; appearance: none; }
  .aw-filter { display: inline-flex; border: 1px solid var(--rand); border-radius: .55rem; overflow: hidden; }
  .aw-filter button { font: inherit; font-size: .82rem; border: 0; background: var(--surface2); color: var(--ink2); padding: .45rem .65rem;
    cursor: pointer; border-right: 1px solid var(--rand); }
  .aw-filter button:last-child { border-right: 0; }
  .aw-filter button.an { background: var(--akzent); color: #fff; font-weight: 600; }
  #aw-personen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .aw-p { display: grid; grid-template-columns: 2.6rem minmax(0, 1fr) auto; gap: .65rem; align-items: center;
    padding: .45rem .35rem; border-bottom: 1px solid var(--line); cursor: pointer; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent; border-radius: .4rem; }
  .aw-p:hover { background: var(--surface2); }
  .aw-haken { width: 2.3rem; height: 2.3rem; border-radius: .55rem; border: 2px solid var(--rand); background: var(--surface2);
    color: transparent; font-size: 1.35rem; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer;
    padding: 0; }
  .aw-p.da .aw-haken { background: var(--good); border-color: var(--good); color: #fff; }
  .aw-p.bue .aw-haken { background: var(--akzent); border-color: var(--akzent); }
  .aw-name { min-width: 0; line-height: 1.25; }
  .aw-name b { font-weight: 600; }
  .aw-name small { display: block; color: var(--muted); font-size: .74rem; margin-top: .1rem; }
  .aw-name .csa { display: inline-block; font-size: .66rem; font-weight: 700; color: var(--akzent); border: 1px solid var(--akzent);
    border-radius: .3rem; padding: 0 .25rem; margin-left: .35rem; vertical-align: .1rem; }
  .aw-name .faellig { color: var(--c); font-weight: 600; }
  .aw-bue { font: inherit; font-size: .8rem; font-weight: 700; padding: .5rem .6rem; border-radius: .55rem; border: 2px solid var(--rand);
    background: var(--surface2); color: var(--ink2); cursor: pointer; white-space: nowrap; }
  .aw-bue[aria-pressed="true"] { background: var(--akzent); border-color: var(--akzent); color: #fff; }
  .aw-p.ehemalig .aw-name { opacity: .6; }
  .aw-leer { color: var(--muted); padding: .8rem .2rem; font-size: .9rem; }
  .aw-warnung { padding: .75rem .9rem; border-left: .3rem solid var(--ser); background: var(--ser-t); border-radius: .55rem;
    font-size: .9rem; line-height: 1.4; }
  .aw-warnung .knopf { margin-top: .5rem; }
  .aw-leiste { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: var(--surface); box-shadow: 0 -4px 16px rgba(0,0,0,.25);
    border-top: 1px solid var(--rand); padding: .65rem max(calc(.9rem + var(--sicher-rechts)), calc((100vw - 56rem) / 2 + .9rem))
      calc(.65rem + var(--sicher-unten)) max(calc(.9rem + var(--sicher-links)), calc((100vw - 56rem) / 2 + .9rem));
    display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "summe knopf" "status knopf"; gap: .15rem .9rem;
    align-items: center; }
  .aw-summe { grid-area: summe; font-weight: 700; font-size: 1.02rem; }
  .aw-kurz { display: none; }
  .aw-status { grid-area: status; font-size: .8rem; color: var(--muted); line-height: 1.3; }
  .aw-status.ok { color: var(--good); }
  .aw-status.fehler { color: var(--crit); }
  .aw-speichern { grid-area: knopf; background: var(--akzent) !important; border-color: var(--akzent) !important; color: #fff !important;
    font-weight: 700; padding: .6rem 1.2rem !important; font-size: 1rem !important; }
  .aw-speichern:disabled { opacity: .45; cursor: default; }
  @media (max-width: 640px) {
    .st-kacheln, #startseite .st-kacheln { grid-template-columns: 1fr; gap: .8rem; }
    #startseite .st-kachel { min-height: 0; padding: 1.15rem 1.1rem 1.05rem; }
    #startseite .st-kachel svg { width: 3rem; height: 3rem; }
    #startseite .st-kachel > b { font-size: 1.45rem; }
    .ue-kopf h1 { font-size: 1.55rem; }
    #uebungen { justify-content: flex-start; gap: 1.3rem; }
    .st-held { padding: calc(.85rem + var(--frei-oben)) calc(1rem + var(--sicher-rechts)) 1rem calc(1rem + var(--sicher-links)); }
    .st-held-innen { gap: .85rem; }
    .st-kopfzeile { flex-direction: column-reverse; align-items: stretch; gap: .55rem; }
    .st-uhr { flex-direction: row; align-items: baseline; justify-content: flex-end; gap: .45rem; }
    .st-uhr b { font-size: 1.05rem; } .st-uhr span { margin-top: 0; }
    .st-logo { height: 3.5rem; }
    .st-marke { gap: .75rem; }
    #startseite h1 { font-size: 1.65rem; }
    .st-te { font-size: .95rem; }
    .st-ueber { font-size: .66rem; letter-spacing: .12em; } .st-bks { display: none; }
    .st-inhalt { padding: 1.1rem calc(.9rem + var(--sicher-rechts)) calc(1rem + var(--sicher-unten)) calc(.9rem + var(--sicher-links)); gap: 1.1rem; }
    .st-suche button { padding: .72rem .85rem; }
    #startseite .st-fuss { justify-content: center; }
    .st-kachel { padding: 1rem 1rem .95rem; }
    .aw-felder { grid-template-columns: 1fr; }
    .aw-kopf { gap: .5rem; padding: .3rem .55rem .3rem .4rem; }
    .aw-kopf img { height: 3.6rem; }                        /* Titel 1.15rem × 1.15 + Unterzeile 2 × .8rem × 1.3 = 3.4rem */
    .aw-titel h1 { font-size: 1.15rem; }
    .aw-trenn { display: none; }                            /* Unterzeile zweizeilig: Gefahrstoffzug / Teileinheit Miehlen */
    .aw-te { display: block; }
    .aw-zt { display: none; }                               /* Haus-Symbol ohne „Start“ */
    .gsz-ansicht .aw-kopf .knopf { padding: .45rem .6rem; }
    #anwesenheit { padding-left: calc(.5rem + var(--sicher-links)); padding-right: calc(.5rem + var(--sicher-rechts)); }
    .aw-uebung, .aw-liste { padding: .7rem .65rem .8rem; }
    .aw-werkzeuge input { flex-basis: 100%; }
    .aw-filter { display: flex; width: 100%; }              /* Filter über die ganze Breite, Knöpfe teilen sich den Platz */
    .aw-filter button { flex: 1 1 auto; padding: .5rem .35rem; }
    .aw-leiste { gap: .1rem .7rem; padding-left: calc(.75rem + var(--sicher-links)); padding-right: calc(.75rem + var(--sicher-rechts)); }
  }
  @media (max-width: 380px) {
    .st-logo { height: 3.2rem; }
    #startseite h1 { font-size: 1.5rem; }
    .st-suche { padding-left: .7rem; } .st-suche svg { display: none; }
    .st-suche button { padding: .7rem .75rem; font-size: .9rem; }
  }
  @media (max-width: 400px) {
    .aw-lang { display: none; }
    .aw-kurz { display: inline; }
  }
  @media (max-width: 374px) {                                /* Titel darf zweizeilig werden: */
    .aw-kopf { gap: .4rem; }
    .aw-kopf img { height: 4.3rem; }                        /* 2 × 1.05rem × 1.15 + 2 × .72rem × 1.3 = 4.29rem */
    .aw-titel h1 { font-size: 1.05rem; }
    .aw-titel div { font-size: .72rem; }
    .gsz-ansicht .aw-kopf .knopf { padding: .4rem .5rem; }
  }
  @media (max-width: 360px) {
    .aw-speichern { padding: .55rem .85rem !important; }
    .st-kachel em { font-size: .84rem; }
  }`;
  const stil = document.createElement('style');
  stil.textContent = css;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Hilfsfunktionen
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SP = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* privat */ } },
  };
  const p2 = n => String(n).padStart(2, '0');
  const isoVon = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const heuteIso = () => isoVon(new Date());
  const jetzt = () => { const d = new Date(); return `${isoVon(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const alsDatum = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const kurz = iso => { const d = alsDatum(iso); return `${TAGE[d.getDay()]} ${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`; };
  const lang = iso => { const d = alsDatum(iso); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`; };
  const tageBis = iso => Math.round((alsDatum(iso) - alsDatum(heuteIso())) / 864e5);
  const norm = s => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  // wie Excel (Basis_Makros.Schluessel) und excel-kern.js
  const schluessel = (n, v) => (norm(n).toLowerCase() + '|' + norm(v).toLowerCase())
    .replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ /g, '');
  const neueKennung = () => {
    const z = new Uint8Array(6);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(z) : z.forEach((_, i) => { z[i] = Math.random() * 256; });
    const d = new Date();
    return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${[...z].map(b => b.toString(16).padStart(2, '0')).join('')}`;
  };

  // Logos aus dem Kopf des Monitors (dunkel = Original, hell = schwarze Schrift auf transparentem Grund)
  const logoDunkel = (document.querySelector('.kopfleiste .logo-dunkel') || document.querySelector('.kopfleiste .logo') || {}).src || '';
  const logoHell = (document.querySelector('.kopfleiste .logo-hell') || {}).src || '';
  const logos = (klasse = '') => (logoDunkel ? `<img class="${klasse} logo-dunkel${logoHell ? '' : ' allein'}" src="${logoDunkel}" alt="">` : '') +
                                 (logoHell ? `<img class="${klasse} logo-hell" src="${logoHell}" alt="">` : '');

  const ICON_MONITOR = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="24" cy="24" r="18" opacity=".25"/><path d="M24 6a18 18 0 0 1 17.1 23.6"/><path d="M24 15v10l6 4"/></svg>';
  const ICON_HAUS = '<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>';
  // Einsatz: Blaulicht (Rundumkennleuchte mit blauer Kuppel und Lichtstrahlen); Übungen: Klemmbrett mit Abhakliste
  // (Übungsanwesenheit) und Stoppuhr (CSA-Belastungsübung)
  const ICON_EINSATZ = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<g stroke="#bcd7ff" stroke-width="2.6"><path d="M24 3.5v5M11.4 8.9l3.4 3.4M36.6 8.9l-3.4 3.4M4.5 21.5h5M38.5 21.5h5"/></g>' +
    '<path d="M13.5 33V25a10.5 10.5 0 0 1 21 0v8Z" fill="#2f7dff" stroke="currentColor"/>' +
    '<path d="M18.6 30.5v-5.3a5.4 5.4 0 0 1 5.4-5.4" stroke="#e3eeff" stroke-width="2.4"/>' +
    '<rect x="9.5" y="33" width="29" height="6.6" rx="2.2" fill="currentColor" fill-opacity=".28"/>' +
    '<path d="M7 43.5h34"/></svg>';
  const ICON_UEBUNGEN = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="6.5" y="8" width="23" height="34" rx="3.4" fill="currentColor" fill-opacity=".12"/>' +
    '<path d="M13 10V5.6h10V10Z" fill="currentColor" fill-opacity=".45"/>' +
    '<path d="M11 17.6l2.1 2.1 3.7-4.2M19.6 18.2h5.6M11 26.1l2.1 2.1 3.7-4.2M19.6 26.7h4.4M11 34.4h6"/>' +
    '<circle cx="34.5" cy="33.5" r="9" style="fill:var(--surface)"/><circle cx="34.5" cy="33.5" r="9" fill="currentColor" fill-opacity=".14"/>' +
    '<path d="M34.5 24.5v-2.8M31.7 21.7h5.6M40.8 27.2l1.6-1.6M34.5 28.8v4.7l3.1 2"/></svg>';
  const ICON_LUPE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>';
  const ICON_LISTE = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="7" width="30" height="36" rx="4" opacity=".25"/><path d="M18 7h12v6H18z"/><path d="m16 25 5 5 11-11"/></svg>';

  // Symbole des Schnellzugriffs (Linien, Farbe aus dem Stil)
  const MSVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const MODUL = {
    tafel: MSVG('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 12h18"/>'),
    karte: MSVG('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
    schild: MSVG('<path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    doku: MSVG('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
    ordner: MSVG('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  };

  // ---------------------------------------------------------------- Aufbau
  const start = document.createElement('main');
  start.id = 'startseite';
  start.className = 'gsz-ansicht';
  const logoOriginal = logoDunkel || logoHell;           // dunkler Kopf: Original-Logo (dunkelblauer Grund)
  start.innerHTML = `
    <header class="st-held">
      <div class="st-held-innen">
        <div class="st-kopfzeile">
          <div class="st-marke">
            ${logoDunkel || logoHell ? `<div class="st-logo" role="img" aria-label="Logo Gefahrstoffzug Rhein-Lahn-Kreis">${logos()}</div>` : ''}
            <div class="st-name"><span class="st-ueber"><span class="st-bks">Brand- und Katastrophenschutz · </span>Rhein-Lahn-Kreis</span>
              <h1>Gefahrstoffzug</h1><div class="st-te">Teileinheit Miehlen</div></div>
          </div>
          <div class="st-uhr" aria-label="Uhrzeit"><b id="st-zeit"></b><span id="st-datum"></span></div>
        </div>
        <form class="st-suche" id="st-suche" role="search" novalidate>
          ${ICON_LUPE}<input type="search" id="st-q" placeholder="Stoff, UN-Nr. oder CAS-Nr." aria-label="Stoff, UN-Nr. oder CAS-Nr. suchen"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
          <button type="submit">Suchen</button>
        </form>
        <div class="st-lage" id="st-lage" hidden></div>
      </div>
    </header>
    <div class="st-inhalt">
      <nav class="st-kacheln gross" aria-label="Hauptmenü">
        <a class="st-kachel st-haupt" href="#einsatz" id="st-einsatz" style="--c:var(--crit)">${ICON_EINSATZ}<span class="pfeil">›</span>
          <b>Einsatz</b><span>Stoffsuche (GESTIS), Beständigkeitslisten und Unterlagen für A-, B- und C-Lagen</span><em id="st-einsatz-info"></em></a>
        <a class="st-kachel" href="#uebungen" id="st-uebungen" style="--c:var(--akzent)">${ICON_UEBUNGEN}<span class="pfeil">›</span>
          <b>Übungen</b><span>CSA-Monitor (Belastungsübung) und Übungsanwesenheit</span><em id="st-uebungen-info">Personaltabelle wird beim Öffnen geladen</em></a>
      </nav>
      <section class="st-schnell" aria-label="Schnellzugriff"><h2>Schnellzugriff</h2>
        <nav class="st-module">
          <button type="button" class="st-modul" data-st-ziel="suche">${ICON_LUPE}Stoff suchen</button>
          <button type="button" class="st-modul" data-st-ziel="tafel">${MODUL.tafel}Warntafel</button>
          <a class="st-modul" href="#lagekarte">${MODUL.karte}Lagekarte</a>
          <a class="st-modul" href="#ordner/${encodeURIComponent('Beständigkeitslisten')}">${MODUL.schild}Beständig&shy;keit</a>
          <a class="st-modul" href="#doku">${MODUL.doku}Einsatz-Doku</a>
          <button type="button" class="st-modul" data-st-ziel="unterlagen">${MODUL.ordner}Unterlagen</button>
          <a class="st-modul grau" href="#monitor">${ICON_MONITOR}CSA-Monitor</a>
          <a class="st-modul grau" href="#anwesenheit">${ICON_LISTE}Anwesen&shy;heit</a>
        </nav></section>
      <section class="st-neu" id="st-neu" hidden aria-live="polite"></section>
      <section class="st-zuletzt" id="st-zuletzt" hidden><h2>Zuletzt geöffnet</h2><div class="st-chips" id="st-chips"></div></section>
      <div class="st-fuss">
        <label>beim Start <select id="st-direkt"><option value="">Hauptmenü</option><option value="einsatz">Einsatz</option>
          <option value="monitor">CSA-Monitor</option></select> zeigen</label>
        <span><button class="knopf" id="st-handschuh" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 21v-4.5L5 13V8.5a1.5 1.5 0 0 1 3 0V11V5.5a1.5 1.5 0 0 1 3 0V10V4.5a1.5 1.5 0 0 1 3 0V10V6a1.5 1.5 0 0 1 3 0v8.5l-2 2.2V21z"/><path d="M7.5 18.5h8"/></svg><span data-gross-text="stand">Handschuh-Modus: aus</span></button>
        <button class="knopf" id="st-modus" title="Hell / Dunkel">◐</button>
        <button class="knopf" id="st-einst" title="Einstellungen" hidden>⚙</button></span>
        <span><a href="#" class="st-alle-neu" id="st-alle-neu">Was ist neu</a> · <span id="st-version"></span></span>
      </div>
    </div>`;
  const ue = document.createElement('main');
  ue.id = 'uebungen';
  ue.className = 'gsz-ansicht';
  ue.innerHTML = `
    <div class="ue-kopf"><h1>Übungen</h1>
      <a class="knopf" href="#start" title="Hauptmenü" aria-label="Hauptmenü">${ICON_HAUS}<span class="aw-zt">Menü</span></a>
      <button class="knopf" id="ue-modus" title="Hell / Dunkel">◐</button>
      <button class="knopf" id="ue-einst" title="Einstellungen" hidden>⚙</button></div>
    <nav class="st-kacheln" aria-label="Übungen">
      <a class="st-kachel" href="#monitor" id="st-monitor" style="--c:var(--good)">${ICON_MONITOR}<span class="pfeil">›</span>
        <b>CSA-Monitor</b><span>Belastungsübung der CSA-Träger: Ampel, Planung, Zeitstrahl</span><em id="st-monitor-info">wird geladen …</em></a>
      <a class="st-kachel" href="#anwesenheit" id="st-anw" style="--c:var(--akzent)">${ICON_LISTE}<span class="pfeil">›</span>
        <b>Übungsanwesenheit</b><span>Anwesenheit erfassen und Belastungsübungen eintragen</span><em id="st-anw-info">wird geladen …</em></a>
    </nav>
    <div class="st-fuss"><span id="st-quelle"></span></div>`;
  const anw = document.createElement('main');
  anw.id = 'anwesenheit';
  anw.className = 'gsz-ansicht';
  anw.innerHTML = `
    <header class="kachel aw-kopf">
      ${logos()}
      <div class="aw-titel"><h1>Übungs&shy;anwesenheit</h1><div>Gefahrstoffzug<span class="aw-trenn"> · </span><span class="aw-te">Teileinheit Miehlen</span></div></div>
      <a class="knopf" href="#uebungen" id="aw-zurueck" title="Übungen" aria-label="Übungen">${ICON_HAUS}<span class="aw-zt">Übungen</span></a>
      <button class="knopf" id="aw-modus" title="Hell / Dunkel">◐</button>
      <button class="knopf" id="aw-einst" title="Einstellungen" hidden>⚙</button>
    </header>
    <div class="aw-warnung" id="aw-warnung" hidden></div>
    <section class="kachel aw-uebung">
      <h2>Übung</h2>
      <div class="aw-felder">
        <label>Datum<input type="date" id="aw-datum" required></label>
        <label>Thema<input type="text" id="aw-thema" placeholder="z. B. Dekon-Übung" maxlength="80" autocomplete="off"></label>
      </div>
      <div class="aw-chips" id="aw-chips"></div>
      <div class="aw-hinweis" id="aw-info"></div>
    </section>
    <section class="kachel aw-liste">
      <h2>Wer war da?</h2>
      <div class="aw-werkzeuge">
        <input type="search" id="aw-suche" placeholder="Name suchen …" autocomplete="off">
        <div class="aw-filter" id="aw-filter" role="group" aria-label="Filter">
          <button data-f="alle" class="an">Alle</button><button data-f="csa">CSA-Träger</button><button data-f="da">anwesend</button><button data-f="fehlt">fehlt</button>
        </div>
      </div>
      <ul id="aw-personen"></ul>
      <div class="aw-leer" id="aw-leer" hidden></div>
    </section>
    <div class="aw-leiste" role="region" aria-label="Speichern">
      <div class="aw-summe" id="aw-summe"></div>
      <div class="aw-status" id="aw-status"></div>
      <button class="knopf aw-speichern" id="aw-speichern">Speichern</button>
    </div>`;
  document.body.appendChild(start);
  document.body.appendChild(ue);
  document.body.appendChild(anw);

  // Startseite im Kopf des Monitors: schmales Haus-Symbol (der Monitor wählt die Schrift nach der Breite des Kopfes)
  const rechts = document.querySelector('.kopfleiste .rechts');
  if (rechts) {
    const k = document.createElement('a');
    k.className = 'knopf'; k.href = '#uebungen'; k.id = 'mon-start'; k.title = 'Übungen'; k.setAttribute('aria-label', 'Übungen');
    k.style.cssText = 'text-decoration:none;display:inline-flex;align-items:center;';
    k.innerHTML = ICON_HAUS;
    rechts.insertBefore(k, rechts.firstChild);
  }

  // ---------------------------------------------------------------- Zustand
  let D = null, adapter = {}, ansicht = null, ansichtParam = '';
  let filter = 'alle', suche = '';
  // laufende Erfassung (eine je Übung): Kennung = Datei im App-Ordner; spätere Fassungen ersetzen frühere
  let sitzung = null;
  let ausgang = [];             // noch nicht übertragene Meldungen (Postausgang, im Gerätespeicher)
  let sendet = false, sendeFehler = null, wiederholen = null, merkenTimer = null;
  try { sitzung = JSON.parse(SP.get('gsz-anw-sitzung') || 'null'); } catch { sitzung = null; }
  try { ausgang = JSON.parse(SP.get('gsz-anw-ausgang') || '[]'); } catch { ausgang = []; }
  if (sitzung && (!sitzung.kennung || Date.now() - (sitzung.beginn || 0) > 18 * 3600 * 1000)) sitzung = null;
  const sichern = () => { SP.set('gsz-anw-sitzung', sitzung ? JSON.stringify(sitzung) : null); SP.set('gsz-anw-ausgang', JSON.stringify(ausgang)); };

  // ---------------------------------------------------------------- Ansichten
  // Adresse: #name oder #name/parameter (z. B. #stoff/001100/psa); andere Teile (einsatz.js) melden Ansichten mit GSZ.ansicht an
  const TITEL = { start: 'Gefahrstoffzug TE Miehlen', uebungen: 'Übungen', monitor: 'CSA-Monitor', anwesenheit: 'Übungsanwesenheit' };
  const ELEMENT = { start, uebungen: ue, anwesenheit: anw };
  const PERSONAL = new Set(['uebungen', 'monitor', 'anwesenheit']);   // brauchen die Personaltabelle
  const fremde = {};          // name -> { element, titel(param), anzeigen(param, info), verlassen(), einrichten(adapter) }
  const scrollStand = new Map();
  const teile = h => { const t = String(h || '').replace(/^#/, ''); const i = t.indexOf('/'); return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 1)]; };
  const bekannt = a => a in ELEMENT || a === 'monitor' || a in fremde;
  function zeige(ziel, ersetzen = false) {
    let [a, param] = teile(ziel);
    if (!bekannt(a)) { a = 'start'; param = ''; }
    const h = '#' + a + (param ? '/' + param : '');
    if (location.hash !== h) {
      // eigener Verlauf mit Tiefe: „Zurück“ in der App geht nur dann im Browserverlauf zurück, wenn es dort einen Schritt gibt
      const tiefe = (history.state && history.state.tiefe) || 0;
      if (ersetzen) history.replaceState({ tiefe }, '', h); else history.pushState({ tiefe: tiefe + 1 }, '', h);
    }
    anwenden(a, param);
  }
  // „Zurück“-Knopf der Ansichten: im Verlauf zurück, sonst zur übergeordneten Ansicht (ersetzt den Eintrag)
  function zurueck(eltern = 'start') {
    if (history.state && history.state.tiefe > 0) history.back(); else zeige(eltern, true);
  }
  // interne Links (#…) über zeige(), damit jeder Schritt im eigenen Verlauf steht
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.target || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const ziel = a.getAttribute('href');
    if (!ziel || ziel === '#') return;
    e.preventDefault();
    zeige(ziel, !!a.dataset.ersetzen);       // Reiter derselben Seite (z. B. PSA ↔ Datenblatt) ersetzen den Verlaufseintrag
  });
  function anwenden(a, param = '', { zurueck = false } = {}) {
    const vorher = ansicht, vorherParam = ansichtParam;
    if (vorher !== null) scrollStand.set(vorher + '/' + vorherParam, window.scrollY);
    ansicht = a; ansichtParam = param;
    document.body.dataset.ansicht = a;
    const el = ELEMENT[a] || (fremde[a] && fremde[a].element);
    for (const m of document.querySelectorAll('body > main.gsz-ansicht')) m.classList.toggle('aktiv', m === el);
    document.title = (fremde[a] && fremde[a].titel ? fremde[a].titel(param) : TITEL[a]) || TITEL.start;
    // feste Grundschrift außer im Monitor (der passt seine Schrift selbst an den Bildschirm an)
    grundschrift();
    if (vorher === 'anwesenheit' && a !== 'anwesenheit') sofortUebertragen();
    if (vorher && vorher !== a && fremde[vorher] && fremde[vorher].verlassen) { try { fremde[vorher].verlassen(); } catch (e) { console.error(e); } }
    if (adapter.ansichtGewechselt) { try { adapter.ansichtGewechselt(a); } catch (e) { console.error(e); } }
    if (PERSONAL.has(a) && adapter.personalAnfordern) adapter.personalAnfordern(a);
    if (a === 'monitor') { try { zeichnen(); } catch { /* noch keine Daten */ } }   // eslint-disable-line no-undef
    if (a === 'start') hauptmenueZeichnen();
    if (a === 'uebungen') startZeichnen();
    if (a === 'anwesenheit') { if (!sitzung) uebungWaehlen(heuteIso(), null); anwZeichnen(); }
    if (fremde[a]) { try { fremde[a].anzeigen(param, { vorher, vorherParam, zurueck }); } catch (e) { console.error(e); } }
    if (vorher !== a || vorherParam !== param) {
      const y = zurueck ? scrollStand.get(a + '/' + param) : 0;
      window.scrollTo(0, y || 0);
      if (zurueck && y) requestAnimationFrame(() => window.scrollTo(0, y));        // nach dem Aufbau noch einmal
    }
  }
  const verlaufGeaendert = () => {
    const [a, p] = teile(location.hash || '#start');
    if (a === ansicht && p === ansichtParam) return;
    anwenden(bekannt(a) ? a : 'start', bekannt(a) ? p : '', { zurueck: true });
  };
  addEventListener('popstate', verlaufGeaendert);
  addEventListener('hashchange', verlaufGeaendert);
  addEventListener('resize', grundschrift);
  // Handschuh-Modus (html.gross): größere Schrift und Knöpfe auf den Einsatz-Seiten – an- und ausschaltbar (Kopf der
  // Einsatz-Seiten, Fuß der Startseite, Einstellungen); gilt für dieses Gerät
  function grundschrift() {
    if (!ansicht || ansicht === 'monitor') return;
    const basis = innerWidth <= 640 ? 15 : 16, gross = document.documentElement.classList.contains('gross') && !['start', 'uebungen', 'anwesenheit'].includes(ansicht);
    document.documentElement.style.fontSize = (gross ? Math.round(basis * 1.2) : basis) + 'px';
  }
  function grossKnoepfe(liste) {
    const an = document.documentElement.classList.contains('gross');
    for (const k of liste || document.querySelectorAll('[data-gross-knopf]')) { k.setAttribute('aria-pressed', String(an));
      k.title = an ? 'Handschuh-Modus ist an (große Schrift und Knöpfe) – tippen zum Ausschalten' : 'Handschuh-Modus einschalten: große Schrift und Knöpfe';
      const t = k.querySelector('[data-gross-text]'); if (t && t.dataset.grossText === 'stand') t.textContent = 'Handschuh-Modus: ' + (an ? 'an' : 'aus'); }
  }
  function grossWechseln() {
    const an = document.documentElement.classList.toggle('gross');
    SP.set('gsz-gross', an ? '1' : '');
    grundschrift(); grossKnoepfe();
    return an;
  }
  // Knopf anmelden – er steht beim Anlegen oft noch nicht im Dokument, deshalb seinen Zustand direkt setzen
  function grossKnopf(k) { if (!k) return; k.dataset.grossKnopf = '1'; k.addEventListener('click', grossWechseln); grossKnoepfe([k]); }
  if (SP.get('gsz-gross') === '1') document.documentElement.classList.add('gross');

  // Hauptmenü
  const kachelInfos = {};
  // ---------------------------------------------------------------- Was ist neu (app/neuigkeiten.js)
  const NEU = Array.isArray(window.GSZNeuigkeiten) ? window.GSZNeuigkeiten : [];
  function neuZeichnen() {
    const el = $('st-neu'), n = NEU[0];
    if (!el || !n || SP.get('gsz-neu-gesehen') === n.version) { if (el) el.hidden = true; return; }
    el.innerHTML = `<h2>Neu in Version ${esc(n.version)}</h2><ul>${n.punkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <button class="zu" type="button" aria-label="Ausblenden" title="Ausblenden">×</button>`;
    el.hidden = false;
    el.querySelector('.zu').addEventListener('click', () => { SP.set('gsz-neu-gesehen', n.version); el.hidden = true; });
  }
  function alleNeuigkeiten() {
    let e = document.getElementById('gsz-neu-ebene');
    if (e) e.remove();
    e = document.createElement('div'); e.id = 'gsz-neu-ebene'; e.className = 'gsz-ebene';
    e.innerHTML = `<div role="dialog" aria-modal="true" aria-label="Was ist neu"><h2>Was ist neu</h2>${NEU.map(n => `<h3>Version ${esc(n.version)}${n.datum ? ` · ${esc(n.datum.split('-').reverse().join('.'))}` : ''}</h3>
      <ul>${n.punkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`).join('')}<p><button class="knopf" type="button">Schließen</button></p></div>`;
    const zu = () => { e.remove(); if (NEU[0]) { SP.set('gsz-neu-gesehen', NEU[0].version); neuZeichnen(); } };
    e.addEventListener('click', ev => { if (ev.target === e || ev.target.closest('button')) zu(); });
    document.body.appendChild(e);
  }
  $('st-alle-neu').addEventListener('click', ev => { ev.preventDefault(); alleNeuigkeiten(); });
  setTimeout(() => grossKnopf($('st-handschuh')), 0);

  // Lagezeile: laufender Einsatz (Einsatz-Dokumentation), Wind (zuletzt abgerufen, ≤ 1 h) bzw. vor Ort bestimmt (≤ 6 h)
  function lageZeichnen() {
    const el = $('st-lage');
    if (!el) return;
    const lies = k => { try { return JSON.parse(SP.get(k) || 'null'); } catch { return null; } };
    const GG = window.GSZGefahrgut, teile = [];
    const ein = lies('gsz-einsatz-aktiv');
    if (ein && ein.beginn && !ein.ende) {
      const d = new Date(ein.beginn), min = Math.max(0, Math.round((Date.now() - ein.beginn) / 60000));
      teile.push(`<a class="laeuft" href="#doku">Einsatz läuft seit ${p2(d.getHours())}:${p2(d.getMinutes())} (${min} min)${ein.stichwort ? ' · ' + esc(ein.stichwort) : ''}</a>`);
    }
    const man = lies('gsz-wind-manuell'), w0 = lies('gsz-wind'), w = w0 && w0.art !== 'windy' ? w0 : null;
    const von = man && Date.now() - man.zeit < 6 * 3600e3 ? man.richtung : w && Date.now() - (w.abgerufen || 0) < 3600e3 ? w.richtung : null;
    if (von !== null && von !== undefined && GG) {
      const r = GG.himmelsrichtung(von), zug = GG.himmelsrichtung(GG.ausbreitungsrichtung(von));
      const pfeil = `<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(${Math.round(GG.ausbreitungsrichtung(von))} 12 12)"><path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
      const kmh = !(man && Date.now() - man.zeit < 6 * 3600e3) && w && w.kmh !== null && w.kmh !== undefined ? ` · ${Math.round(w.kmh)} km/h` : '';
      teile.push(`<a href="#lagekarte">${pfeil}Wind aus ${esc(GG.RICHTUNG_LANG[r] || r)}${kmh} → ${esc(zug)}</a>`);
    }
    el.innerHTML = teile.join('');
    el.hidden = !teile.length;
  }
  function hauptmenueZeichnen() {
    uhrStellen();
    lageZeichnen();
    zuletztZeichnen();
    neuZeichnen();
    const w = SP.get('gsz-start') || '';
    $('st-direkt').value = ['einsatz', 'monitor'].includes(w) ? w : '';
    if (kachelInfos.einsatz) $('st-einsatz-info').innerHTML = kachelInfos.einsatz;
    const L = (D && D.leute) || [];
    if (L.length) {
      const h = heuteIso(), bereit = L.filter(p => p.faellig && p.faellig >= h).length, ueber = L.length - bereit;
      const offen = (D.ausstehend || 0) + ausgang.length;
      $('st-uebungen-info').innerHTML = `<b>${bereit} / ${L.length}</b> CSA-Träger einsatzbereit` +
        (ueber ? ` · <span class="warn">${ueber}&nbsp;überfällig</span>` : '') +
        (offen ? `<br><span class="warn">${offen} Erfassung${offen > 1 ? 'en' : ''} noch nicht in Excel übernommen</span>` : '');
    }
  }
  function kachelInfo(name, html) { kachelInfos[name] = html; if (ansicht === 'start') hauptmenueZeichnen(); }
  // Uhrzeit und Datum im Kopf des Hauptmenüs
  const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function uhrStellen() {
    const d = new Date();
    $('st-zeit').textContent = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
    $('st-datum').textContent = `${innerWidth <= 640 ? TAGE[d.getDay()] : WOCHENTAG[d.getDay()]}, ${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
  uhrStellen();
  setInterval(() => { if (ansicht === 'start' && !document.hidden) { uhrStellen(); lageZeichnen(); } }, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ansicht === 'start') uhrStellen(); });
  // Schnellzugriff: Stoffsuche bzw. Warntafel auf der Einsatz-Seite öffnen, zu den Unterlagen springen
  for (const b of start.querySelectorAll('[data-st-ziel]')) b.addEventListener('click', () => {
    const z = b.dataset.stZiel;
    zeige('einsatz');
    setTimeout(() => {
      if (z === 'suche') { const q = $('ez-q'); if (q) q.focus(); }
      if (z === 'tafel') { const k = $('ez-tafel-knopf'); if (k && k.getAttribute('aria-pressed') !== 'true') k.click(); }
      if (z === 'unterlagen') { const o = $('ez-ordner'); if (o) o.scrollIntoView({ block: 'start' }); }
    }, 60);
  });
  // Schnellsuche: wie die Suche der Einsatz-Seite (eindeutige UN-/CAS-Nr. öffnet den Stoff direkt)
  $('st-suche').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('st-q').value.trim();
    $('st-q').blur();
    if (!q || !window.GSZEinsatz || !GSZEinsatz.suchen) { zeige('einsatz'); return; }
    $('st-q').value = '';
    GSZEinsatz.suchen(q);
  });
  // zuletzt geöffnete Stoffe (aus dem Gerätespeicher – auch offline)
  async function zuletztZeichnen() {
    const E = window.GSZEinsatz;
    if (!E || !E.zuletzt) return;
    let l = [];
    try { l = await E.zuletzt(8); } catch { l = []; }
    $('st-zuletzt').hidden = !l.length;
    $('st-chips').innerHTML = l.map(x => `<a class="st-chip" href="#stoff/${esc(x.zvg)}" title="${esc(E.nameSchoen ? E.nameSchoen(x.name) : x.name)}">` +
      `${E.miniTafel ? E.miniTafel(x.stoff && x.stoff.transport) : ''}<span>${esc(E.nameSchoen ? E.nameSchoen(x.name) : x.name)}</span></a>`).join('');
  }

  // ---------------------------------------------------------------- Startseite
  function startZeichnen() {
    if (!D) return;
    const h = heuteIso(), L = D.leute || [];
    const bereit = L.filter(p => p.faellig && p.faellig >= h).length;
    const ueber = L.length - bereit;
    const bald = L.filter(p => p.faellig && p.faellig >= h && tageBis(p.faellig) <= 60).length;
    $('st-monitor-info').innerHTML = L.length
      ? `<b>${bereit} / ${L.length}</b> einsatzbereit` + (ueber ? ` · <span class="warn">${ueber}&nbsp;überfällig</span>` : ' · <span class="gut">keiner überfällig</span>') +
        (bald ? ` · ${bald}&nbsp;fällig in ≤&nbsp;60&nbsp;Tagen` : '') + (L.some(p => p.vorlaeufig) ? '<br><small>mit Belastungsübungen aus der App (vorläufig)</small>' : '')
      : 'keine Daten';
    const U = (D.anwesenheit && D.anwesenheit.uebungen) || [];
    const vorbei = U.filter(u => u.datum <= h && Object.keys(u.marken).length);
    const letzte = vorbei[vorbei.length - 1], naechste = U.find(u => u.datum > h);
    const anz = u => Object.keys(u.marken).length;
    const teile = [];
    if (letzte) teile.push(`letzte Übung <b>${kurz(letzte.datum)}</b>${letzte.thema ? ' ' + esc(letzte.thema) : ''} · ${anz(letzte)} anwesend`);
    if (naechste) teile.push(`nächste ${kurz(naechste.datum)}${naechste.thema ? ' ' + esc(naechste.thema) : ''}`);
    const offen = (D.ausstehend || 0) + ausgang.length;
    if (offen) teile.push(`<span class="warn">${offen} Erfassung${offen > 1 ? 'en' : ''} noch nicht in Excel übernommen</span>`);
    if (D.anwesenheit && !D.anwesenheit.eingerichtet) teile.push('<span class="warn">Reiter „Übungsanwesenheit“ in Excel noch nicht eingerichtet</span>');
    $('st-anw-info').innerHTML = teile.length ? teile.join('<br>') : 'noch keine Übung erfasst';
    $('st-quelle').textContent = D.quelle ? `Daten: ${D.quelle}` : '';
  }
  $('st-direkt').addEventListener('change', e => SP.set('gsz-start', e.target.value || null));

  // ---------------------------------------------------------------- Übungsanwesenheit: Daten
  const uebungen = () => (D && D.anwesenheit && D.anwesenheit.uebungen) || [];
  const personen = () => (D && D.anwesenheit && D.anwesenheit.personen) || [];
  // Übungen eines Tages (aus Excel, aus der Dropbox und aus dem Postausgang)
  function uebungenAm(datum) {
    const liste = uebungen().filter(u => u.datum === datum).map(u => ({ datum: u.datum, thema: u.thema || '' }));
    for (const m of ausgang) if (m.datum === datum && !liste.some(u => !m.thema || u.thema.toLowerCase() === m.thema.toLowerCase())) liste.push({ datum, thema: m.thema || '' });
    return liste;
  }
  function gewaehlteUebung() {
    if (!sitzung) return null;
    const am = uebungen().filter(u => u.datum === sitzung.datum);
    if (am.length <= 1) return am[0] || null;
    return am.find(u => norm(u.thema).toLowerCase() === norm(sitzung.themaAlt || sitzung.thema).toLowerCase()) || am[0];
  }
  // Stand der gewählten Übung: Excel/Dropbox + Postausgang + laufende Erfassung (jeweils nach Zeit)
  function marken() {
    const u = gewaehlteUebung();
    const m = { ...(u ? u.marken : {}) };
    if (!sitzung) return m;
    const liste = [];
    for (const a of ausgang) if (a.datum === sitzung.datum) for (const e of a.eintraege) liste.push(e);
    for (const e of Object.values(sitzung.eintraege)) liste.push(e);
    liste.sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)));
    for (const e of liste) { const k = schluessel(e.name, e.vorname); if (e.wert) m[k] = e.wert; else delete m[k]; }
    return m;
  }
  const csaInfo = () => new Map((D && D.leute || []).map(p => [schluessel(p.name, p.vorname), p]));

  // Quote im laufenden Jahr: Übungen mit Einträgen bis heute während der Mitgliedschaft
  function quoten() {
    const h = heuteIso(), jahr = h.slice(0, 4);
    const U = uebungen().filter(u => u.datum.startsWith(jahr) && u.datum <= h && Object.keys(u.marken).length);
    const q = new Map();
    for (const p of personen()) {
      const relevant = U.filter(u => (!p.seit || u.datum >= p.seit) && (!p.bis || u.datum <= p.bis));
      const da = U.filter(u => u.marken[p.schluessel]).length;
      if (relevant.length) q.set(p.schluessel, { da, von: relevant.length });
    }
    return q;
  }

  // ---------------------------------------------------------------- Übungsanwesenheit: Erfassen
  function uebungWaehlen(datum, thema) {
    if (sitzung && sitzung.datum === datum && (thema === null || norm(thema) === norm(sitzung.thema))) return;
    zumAusgang(true);
    const am = uebungenAm(datum);
    const t = thema !== null ? thema : (am[0] ? am[0].thema : '');
    sitzung = { kennung: neueKennung(), beginn: Date.now(), datum, thema: t, themaAlt: t, themaGeaendert: false, eintraege: {}, version: 0, offen: false };
    sichern();
  }
  function setzen(p, wert) {
    if (!sitzung) uebungWaehlen(heuteIso(), null);
    sitzung.eintraege[p.schluessel] = { name: p.name, vorname: p.vorname, wert, zeit: jetzt() };
    sitzung.version++;
    sitzung.offen = true;
    sichern();
    anwZeichnen();
    clearTimeout(merkenTimer);
    merkenTimer = setTimeout(() => { zumAusgang(); senden(); }, 2500);
  }
  // laufende Erfassung als Meldung in den Postausgang (ersetzt eine ältere Fassung derselben Erfassung)
  function zumAusgang(nurWennOffen = true) {
    clearTimeout(merkenTimer);
    if (!sitzung || (nurWennOffen && !sitzung.offen)) return;
    const eintraege = Object.values(sitzung.eintraege);
    if (!eintraege.length && !sitzung.themaGeaendert) { sitzung.offen = false; sichern(); return; }
    const m = { kennung: sitzung.kennung, stand: jetzt(), geraet: adapter.geraet || '', datum: sitzung.datum,
                thema: sitzung.themaGeaendert ? norm(sitzung.thema) : '', eintraege };
    ausgang = ausgang.filter(a => a.kennung !== m.kennung);
    ausgang.push(m);
    sitzung.offen = false;
    sichern();
  }
  function sofortUebertragen() { zumAusgang(); senden(); }

  async function senden() {
    if (sendet || !ausgang.length || !adapter.speichern) { statusZeigen(); return; }
    sendet = true;
    statusZeigen();
    clearTimeout(wiederholen);
    try {
      while (ausgang.length) {
        const m = ausgang[0];
        const r = await adapter.speichern(m);
        if (!r || r.ok === false) { const e = new Error((r && r.text) || 'Speichern nicht möglich.'); e.aktion = r && r.aktion; throw e; }
        // erst entfernen, wenn in der Zwischenzeit keine neuere Fassung derselben Erfassung entstanden ist
        ausgang = ausgang.filter(a => !(a.kennung === m.kennung && a.stand === m.stand));
        sendeFehler = null;
        sichern();
        if (r.daten) daten(r.daten, true);
      }
    } catch (e) {
      sendeFehler = { text: e.message, aktion: e.aktion };
      wiederholen = setTimeout(senden, e.aktion === 'verbinden' ? 5 * 60 * 1000 : 30 * 1000);
    } finally {
      sendet = false;
      statusZeigen();
      if (ansicht === 'uebungen') startZeichnen();
      if (ansicht === 'start') hauptmenueZeichnen();
    }
  }
  addEventListener('online', () => senden());
  document.addEventListener('visibilitychange', () => { if (document.hidden) sofortUebertragen(); else senden(); });
  addEventListener('pagehide', () => zumAusgang());

  // ---------------------------------------------------------------- Übungsanwesenheit: Anzeige
  function statusZeigen() {
    const st = $('aw-status'), knopf = $('aw-speichern');
    if (!st) return;
    const offen = sitzung && sitzung.offen;
    const wartend = ausgang.length;
    st.className = 'aw-status';
    if (sendet) st.textContent = 'Wird übertragen …';
    else if (sendeFehler && wartend) { st.textContent = `Nicht übertragen: ${sendeFehler.text} – wird erneut versucht.`; st.classList.add('fehler'); }
    else if (offen) st.textContent = 'Änderungen werden gleich gespeichert …';
    else if (sitzung && (Object.keys(sitzung.eintraege).length || sitzung.themaGeaendert)) {
      st.textContent = '✓ Gespeichert – Excel übernimmt es beim nächsten Öffnen der Personaltabelle.'; st.classList.add('ok');
    } else st.textContent = 'Antippen = anwesend · BÜ = Belastungsübung (CSA-Träger)';
    knopf.disabled = sendet || (!offen && !wartend);
    knopf.textContent = wartend && !offen && !sendet ? 'Erneut senden' : 'Speichern';
    leisteAbstand();
    // Hinweise
    const w = $('aw-warnung');
    let t = '';
    if (D && D.anwesenheit && !D.anwesenheit.eingerichtet) {
      t = 'In der Personaltabelle fehlt noch der Reiter „Übungsanwesenheit“ (bzw. der Übertragungsschlüssel). Erfassen ist erst möglich, ' +
          'wenn er in Excel eingerichtet und die Personaltabelle gespeichert ist.';
    } else if (sendeFehler && sendeFehler.aktion === 'verbinden') {
      t = esc(sendeFehler.text) + (adapter.verbinden ? '<br><button class="knopf" id="aw-verbinden">Mit Dropbox neu verbinden</button>' : '');
    }
    w.innerHTML = t;
    w.hidden = !t;
    const v = $('aw-verbinden');
    if (v) v.addEventListener('click', () => adapter.verbinden());
  }

  // Inhalt endet über der festen Speichern-Leiste, auch wenn sie durch Umbrüche höher wird
  function leisteAbstand() {
    const l = document.querySelector('.aw-leiste');
    if (!l || ansicht !== 'anwesenheit') return;
    anw.style.paddingBottom = `calc(${Math.ceil(l.getBoundingClientRect().height)}px + 1.2rem)`;
  }
  addEventListener('resize', () => leisteAbstand());

  // nur bei Änderung neu aufbauen – sonst ginge ein Antippen während einer Aktualisierung im Hintergrund verloren
  function setzeHtml(el, html) {
    if (el.dataset.html === html) return;
    el.innerHTML = html;
    el.dataset.html = html;
  }

  function anwZeichnen() {
    if (ansicht !== 'anwesenheit') return;
    if (!sitzung) uebungWaehlen(heuteIso(), null);
    const h = heuteIso();
    $('aw-datum').value = sitzung.datum;
    if (document.activeElement !== $('aw-thema')) $('aw-thema').value = sitzung.thema || '';

    // Übungen zur Auswahl: heute, die letzten 5 und die nächsten 3
    const U = uebungen();
    const vorbei = U.filter(u => u.datum <= h).slice(-5).reverse(), kommend = U.filter(u => u.datum > h).slice(0, 3);
    const chips = [];
    if (!U.some(u => u.datum === h)) chips.push({ datum: h, thema: '', text: 'Heute', neu: true });
    for (const u of [...kommend.reverse(), ...vorbei]) chips.push({ datum: u.datum, thema: u.thema || '', text: kurz(u.datum) + (u.thema ? ' · ' + u.thema : ''),
      anz: Object.keys(u.marken).length, geplant: u.datum > h });
    chips.sort((a, b) => b.datum.localeCompare(a.datum));
    setzeHtml($('aw-chips'), chips.map((c, i) => {
      const gew = c.datum === sitzung.datum && (!c.thema || norm(c.thema).toLowerCase() === norm(sitzung.themaAlt).toLowerCase() || uebungenAm(c.datum).length <= 1);
      return `<button class="aw-chip${gew ? ' gewaehlt' : ''}${c.geplant ? ' geplant' : ''}" data-i="${i}">${esc(c.text)}` +
             (c.anz ? ` <small>· ${c.anz} ✓</small>` : '') + '</button>';
    }).join(''));
    $('aw-chips').onclick = e => {
      const b = e.target.closest('.aw-chip');
      if (!b) return;
      const c = chips[Number(b.dataset.i)];
      uebungWaehlen(c.datum, c.thema);
      anwZeichnen();
    };

    // Personen
    const m = marken(), csa = csaInfo(), q = quoten();
    const u = gewaehlteUebung();
    const P = personen().filter(p => m[p.schluessel] || ((!p.seit || p.seit <= sitzung.datum) && (!p.bis || p.bis >= sitzung.datum)))
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
    const s = norm(suche).toLowerCase();
    const sichtbar = P.filter(p => (!s || `${p.name} ${p.vorname} ${p.vorname} ${p.name}`.toLowerCase().includes(s)) &&
      (filter === 'alle' || (filter === 'csa' && p.csa) || (filter === 'da' && m[p.schluessel]) || (filter === 'fehlt' && !m[p.schluessel])));
    setzeHtml($('aw-personen'), sichtbar.map(p => {
      const w = m[p.schluessel] || '', c = csa.get(p.schluessel), qq = q.get(p.schluessel);
      let faellig = '';
      if (p.csa && c) {
        if (!c.faellig) faellig = '<span class="faellig" style="--c:var(--crit)">keine Belastungsübung erfasst</span>';
        else {
          const t = tageBis(c.faellig), farbe = t < 0 ? 'var(--crit)' : t <= 30 ? 'var(--ser)' : t <= 60 ? 'var(--warn)' : 'var(--good)';
          faellig = `<span class="faellig" style="--c:${farbe}">${t < 0 ? 'überfällig seit ' + lang(c.faellig) : 'fällig bis ' + lang(c.faellig)}</span>` +
                    (c.vorlaeufig ? ' (vorläufig)' : '');
        }
      }
      const unten = [faellig, qq ? `${qq.da} von ${qq.von} Übungen ${h.slice(0, 4)}` : ''].filter(Boolean).join(' · ');
      return `<li class="aw-p${w ? ' da' : ''}${w === 'B' ? ' bue' : ''}${p.bis && p.bis < h ? ' ehemalig' : ''}" data-k="${esc(p.schluessel)}">` +
        `<button class="aw-haken" aria-pressed="${!!w}" aria-label="anwesend">✓</button>` +
        `<span class="aw-name"><b>${esc(p.name)}</b>, ${esc(p.vorname)}${p.csa ? '<span class="csa">CSA</span>' : ''}` +
        (unten ? `<small>${unten}</small>` : '') + '</span>' +
        (p.csa ? `<button class="aw-bue" aria-pressed="${w === 'B'}" title="Belastungsübung durchgeführt">BÜ</button>` : '<span></span>') + '</li>';
    }).join(''));
    const leer = $('aw-leer');
    leer.hidden = sichtbar.length > 0;
    leer.textContent = P.length ? 'Niemand passt zum Filter.' : 'In der Personaltabelle stehen noch keine Personen.';

    // Übersicht
    const da = P.filter(p => m[p.schluessel]).length, bue = P.filter(p => m[p.schluessel] === 'B').length;
    const mitglieder = P.filter(p => (!p.seit || p.seit <= sitzung.datum) && (!p.bis || p.bis >= sitzung.datum)).length;
    $('aw-summe').innerHTML = `${da} anwesend` +
      (bue ? ` · ${bue} <span class="aw-lang">mit Belastungsübung</span><span class="aw-kurz">BÜ</span>` : '') +
      (mitglieder ? ` · ${Math.round(da / mitglieder * 100)} %` : '');
    const am = uebungenAm(sitzung.datum);
    let info = `<b>${lang(sitzung.datum)}</b>` + (sitzung.datum > h ? ' (geplant)' : sitzung.datum === h ? ' (heute)' : '') + ' – ';
    if (u && u.ausstehend) info += 'Übung mit Erfassungen, die Excel noch nicht übernommen hat.';
    else if (u) info += 'Übung aus der Personaltabelle – Änderungen werden übernommen.';
    else info += 'neue Übung – Excel legt sie beim Übernehmen an.';
    if (am.length > 1) info += ` Am selben Tag: ${am.map(x => esc(x.thema || 'ohne Thema')).join(', ')} – oben auswählen.`;
    if (bue) info += ' Belastungsübungen kommen mit dem Übungsdatum in „CSA-Träger aktiv“.';
    $('aw-info').innerHTML = info;
    statusZeigen();
  }

  // Bedienung
  $('aw-personen').addEventListener('click', e => {
    const li = e.target.closest('.aw-p');
    if (!li) return;
    const p = personen().find(x => x.schluessel === li.dataset.k);
    if (!p) return;
    const w = marken()[p.schluessel] || '';
    if (e.target.closest('.aw-bue')) setzen(p, w === 'B' ? 'X' : 'B');
    else setzen(p, w ? '' : 'X');
  });
  $('aw-datum').addEventListener('change', e => {
    const v = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    uebungWaehlen(v, null);
    anwZeichnen();
  });
  $('aw-thema').addEventListener('input', e => {
    if (!sitzung) return;
    sitzung.thema = e.target.value;
    sitzung.themaGeaendert = norm(sitzung.thema) !== norm(sitzung.themaAlt);
    sitzung.offen = sitzung.themaGeaendert || Object.keys(sitzung.eintraege).length > 0;
    sitzung.version++;
    sichern();
    statusZeigen();
    clearTimeout(merkenTimer);
    merkenTimer = setTimeout(() => { zumAusgang(); senden(); }, 2500);
  });
  $('aw-suche').addEventListener('input', e => { suche = e.target.value; anwZeichnen(); });
  $('aw-filter').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.f;
    for (const x of $('aw-filter').children) x.classList.toggle('an', x === b);
    anwZeichnen();
  });
  $('aw-speichern').addEventListener('click', () => { zumAusgang(false); senden(); });
  function modusWechseln() {
    if (window.GSZModus) { GSZModus.wechseln(); return; }
    const hell = document.documentElement.classList.toggle('hell');
    try { localStorage.setItem('csa-modus', hell ? 'hell' : 'dunkel'); } catch { /* privat */ }
  }
  function modusKnopf(knopf) { if (!knopf) return; knopf.addEventListener('click', modusWechseln); if (window.GSZModus) GSZModus.knopf(knopf); }
  for (const id of ['st-modus', 'ue-modus', 'aw-modus']) modusKnopf($(id));
  const einstKnoepfe = [];
  function einstellungenKnopf(knopf) {
    einstKnoepfe.push(knopf);
    if (adapter.einstellungen) { knopf.hidden = false; knopf.addEventListener('click', e => { e.stopPropagation(); adapter.einstellungen(e.currentTarget); }); }
  }

  // ---------------------------------------------------------------- Schnittstelle zur Plattform
  function daten(neu, ohneSenden = false) {
    D = neu;
    if (ansicht === 'start') hauptmenueZeichnen();
    if (ansicht === 'uebungen') startZeichnen();
    if (ansicht === 'anwesenheit') anwZeichnen();
    if (!ohneSenden && ausgang.length) senden();
  }
  function einrichten(a) {
    adapter = a || {};
    for (const id of ['st-einst', 'ue-einst', 'aw-einst']) einstellungenKnopf($(id));
    for (const k of einstKnoepfe.splice(0)) if (!['st-einst', 'ue-einst', 'aw-einst'].includes(k.id)) einstellungenKnopf(k);
    if (adapter.version) $('st-version').textContent = adapter.version;
    for (const f of Object.values(fremde)) if (f.einrichten) { try { f.einrichten(adapter); } catch (e) { console.error(e); } }
    // Startansicht: Adresse (#…), sonst gemerkte Wahl (Einsatz bzw. CSA-Monitor), sonst Hauptmenü
    const [h, p] = teile(location.hash || '');
    if (bekannt(h)) anwenden(h, p);
    else { const w = SP.get('gsz-start'); zeige(w === 'monitor' || w === 'einsatz' ? w : 'start', true); }
    if (ausgang.length) setTimeout(senden, 1500);
  }
  // Ansicht anmelden (einsatz.js): element = <main class="gsz-ansicht">, wird an den body gehängt
  function ansichtAnmelden(name, def) {
    fremde[name] = def;
    if (def.element && !def.element.parentNode) { def.element.classList.add('gsz-ansicht'); document.body.appendChild(def.element); }
  }
  window.GSZ = { einrichten, daten, zeige, zurueck, ansicht: ansichtAnmelden, kachelInfo, modusKnopf, einstellungenKnopf, logos, logoOriginal, grossKnopf, grossWechseln, alleNeuigkeiten,
                 get aktuell() { return { ansicht, param: ansichtParam }; }, get adapter() { return adapter; },
                 get ausgang() { return ausgang.slice(); } };
})();
