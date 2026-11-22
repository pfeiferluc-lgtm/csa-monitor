// Aussehen „Einsatztablet“ (ab 2.5.0): ein Erscheinungsbild für das ganze Programm nach dem Vorbild verkaufter Einsatz-
// programme (Feuer Software EinsatzApp/EinsatzTablet, fireplan.pad, DIVERA 24/7, Tablet Command): rote Titelleiste,
// ruhige Flächen mit Kopfstreifen und Bezeichnung–Wert-Zeilen, Listen mit farbiger Kante, große Schaltflächen, Leiste unten
// mit roter Markierung, Symbolraster als Schnellzugriff; Dunkel als Grundform für den Einsatz bei Nacht, Hell für Tageslicht.
// Wird als letztes Skript geladen und überschreibt die Grundstile der Ansichten (Regeln mit :root davor, damit sie gewinnen).
// Logos: auf der roten Leiste das Original (dunkler Grund); auf hellem Grund die Fassung mit schwarzer Schrift.
'use strict';
(() => {
  const css = `
  /* ------------------------------------------------------------ Farben und Maße */
  :root { --bar: #b3261e; --bar2: #9b2019; --bar-ink: #fff; --rot: #d0302a; --rund: .5rem;
    --page: #111214; --surface: #1b1c20; --surface2: #24262b; --kopf: #17181b; --line: #2c2e34; --rand: #3a3d45;
    --ink: #f2f3f5; --ink2: #c5c8ce; --muted: #8f949c; --schatten: 0 0 0 1px var(--line); --leiste-bg: #18191c; }
  :root.hell { --page: #eceef1; --surface: #ffffff; --surface2: #f4f5f7; --kopf: #ffffff; --line: #e0e3e7; --rand: #ccd1d8;
    --ink: #14171a; --ink2: #3b424a; --muted: #67707a; --schatten: 0 0 0 1px var(--line), 0 1px 2px rgba(16, 24, 40, .05); --leiste-bg: #ffffff; }
  :root body:not([data-ansicht="monitor"]) #statusband { background: var(--bar) !important; }

  /* ------------------------------------------------------------ Barrierefreiheit (WCAG 2.1 AA, Prüfung 2.5.1)
     Schriftfarben: im Dunkeln helle, im Hellen dunkle Töne – jeweils mindestens 4,5:1 zum Grund.
     Füllfarben unter weißer Schrift: immer die dunklen Töne (--…-voll, ≥ 5:1), Gelb mit dunkler Schrift. */
  :root { --crit: #f05252; --good: #26a95b; --ser: #f0794a; --akzent: #4c8df0;
    --crit-voll: #c62828; --good-voll: #1d7a43; --ser-voll: #c2410c; --akzent-voll: #2563c9; --bedingt-voll: #8a6100; --grau-voll: #5f6873; }
  :root.hell { --crit: #c62828; --good: #1b7f42; --ser: #c2410c; --akzent: #1f62c4; --muted: #5f6873; --akzent-voll: #1f62c4; }
  :root .ez-stufe.gut { --c: var(--good-voll); } :root .ez-stufe.bedingt { --c: var(--bedingt-voll); } :root .ez-stufe.nicht { --c: var(--crit-voll); }
  :root .ez-stufe.gemischt { --c: var(--ser-voll); } :root .ez-stufe.unbekannt, :root .ez-stufe.keine, :root .ez-stufe.offen { --c: var(--grau-voll); }
  :root .ez-signal { background: var(--crit-voll); } :root .ez-signal.achtung { background: var(--ser-voll); }
  :root .ez-aegl tr.a1 td:first-child b { background: var(--bedingt-voll); } :root .ez-aegl tr.a2 td:first-child b { background: var(--ser-voll); }
  :root .ez-aegl tr.a3 td:first-child b { background: var(--crit-voll); }
  :root .ez-dateien .typ { background: color-mix(in srgb, var(--c, var(--muted)) 80%, #000); }
  :root .ez .knopf[style*="var(--crit)"] { background: var(--rot) !important; border-color: var(--rot) !important; color: #fff !important; }
  :root .ez-filter button.an, :root .ez-anordnung button[aria-checked="true"], :root .ez-unwahl button.an, :root .lg-kompass button.an,
  :root #st-handschuh[aria-pressed="true"], :root .aw-chip.gewaehlt, :root .aw-filter button.an, :root .aw-bue[aria-pressed="true"] {
    background: var(--akzent-voll) !important; border-color: var(--akzent-voll) !important; color: #fff !important; }
  :root .aw-speichern:not(.x) { background: var(--akzent-voll) !important; border-color: var(--akzent-voll) !important; }
  :root .aw-p.bue .aw-haken { background: var(--akzent-voll); border-color: var(--akzent-voll); }
  :root .lg-regel::before { background: var(--akzent-voll); }
  :root [data-lg-k-info] a, :root .lg-klein a, :root .ez-klein a { color: var(--akzent); }
  :root.hell .ez-gepr, :root.hell small .gut, :root.hell .ez-status .gut, :root.hell .ez-verf.an { color: var(--good); }
  :root.hell .ez-tabelle td.gut { color: #176b38; }
  /* grauer Kleintext auf getönten Kästen (Ausbreitung, Spaltenwahl): etwas dunkler */
  :root.hell .ez-ausbr .lvz, :root.hell .ez-ausbr .ueber, :root.hell .ez-spalte small { color: #4b535c; }
  /* farbiges Band an den Geräten und Schilder mit Farbe im Stil-Attribut (PSA): dunkle Füllung unter weißer Schrift */
  :root .ez-band.gut { background: var(--good-voll); } :root .ez-band.nicht { background: var(--crit-voll); }
  :root .ez-band.bedingt { background: var(--bedingt-voll); } :root .ez-band.gemischt { background: var(--ser-voll); }
  :root .ez-stufe[style*="var(--crit)"] { --c: var(--crit-voll) !important; } :root .ez-stufe[style*="var(--ser)"] { --c: var(--ser-voll) !important; }
  :root .ez-stufe[style*="var(--akzent)"] { --c: var(--akzent-voll) !important; } :root .ez-stufe[style*="var(--good)"] { --c: var(--good-voll) !important; }
  :root.hell .ez-aegl .legende span[style*="#b88a00"] { --c: #8a6100 !important; }

  /* Tippflächen: mindestens 44 px (Bedienung mit Handschuhen); Filter und Segmente einheitlich eckig */
  :root .ez .knopf, :root .gsz-ansicht .knopf { min-height: 44px; min-width: 44px; }
  :root .lg-regel button { min-height: 44px; }

  /* Feinschliff nach der Design-Kritik (2.5.1) */
  /* „jetzt“ (Tag/Nacht nach Sonnenstand, Wind der ERG-Tabelle) nicht unterstreichen – sah aus wie ein Link */
  :root .lg-abstand b.jetzt, :root .lg-abstand b:not(.jetzt) + b.jetzt { text-decoration: none; }
  :root .lg-abstand b.jetzt::after { content: " · jetzt"; font-size: .62em; font-weight: 700; color: var(--muted); letter-spacing: .02em; }
  :root .ez-tabelle td.jetzt, :root .lg-t3 span.jetzt { text-decoration: none; background: color-mix(in srgb, var(--akzent) 14%, transparent); border-radius: .25rem; padding: 0 .2rem; }
  /* ohne laufenden Einsatz: Titel zurückhaltend, der rote Knopf ist die Aufforderung */
  :root .eb-status:not(.laeuft) .eb-titel { font-size: .95rem; color: var(--muted); letter-spacing: .06em; }
  /* Schalter RLP ⟷ FwDV 500 wie die übrigen Knöpfe eckig */
  :root .lg-regel { border-radius: .55rem; } :root .lg-regel::before, :root .lg-regel button { border-radius: .4rem; }
  /* Trennlinie vor „Sicherheitsdatenblatt importieren“ durchgezogen */
  :root .ez-import-zeile { border-top-style: solid; border-top-color: var(--line); }
  :root .ez-un, :root .lg-voll-auf, :root .lg-voll-zu { min-height: 44px; }
  :root .ez-filter button, :root .ez-anordnung button, :root .lg-seg button, :root .lg-kompass button { min-height: 44px; min-width: 44px; border-radius: .45rem; }
  :root .st-suche input, :root .ez-suchfeld input, :root .st-suche button { min-height: 44px; }
  :root .ez-anordnung button { min-width: 44px; }
  :root .ez-db-suche, :root .eb-feld input, :root .eb-feld select, :root .aw-werkzeuge input, :root .st-fuss select { min-height: 44px; }
  :root .st-neu .zu { width: 44px; height: 44px; }
  :root .ez details > summary, :root .gsz-ansicht details > summary { min-height: 44px; display: flex; align-items: center; gap: .35rem; }

  /* ------------------------------------------------------------ Titelleiste (alle Ansichten) */
  :root .ez > .ez-kopf { background: var(--bar); color: var(--bar-ink); border-bottom: 0; box-shadow: 0 1px 0 rgba(0, 0, 0, .3); gap: .45rem;
    padding-top: calc(.45rem + var(--frei-oben)); padding-bottom: .45rem; min-height: calc(3.6rem + var(--frei-oben)); }
  :root .ez > .ez-kopf .ez-titel h1 { color: #fff; font-size: 1.22rem; font-weight: 700; letter-spacing: 0; }
  :root .ez > .ez-kopf .ez-titel div { color: rgba(255, 255, 255, .8); font-size: .78rem; }
  :root .ez > .ez-kopf .knopf, :root .ue-kopf .knopf { background: transparent !important; border: 0 !important; color: #fff !important;
    box-shadow: none !important; min-width: 44px; min-height: 44px; border-radius: .5rem; padding: .4rem .55rem; }
  /* Anwesenheit: Knöpfe so groß wie bisher (der Titel braucht die Breite), nur hell auf Rot */
  :root .aw-kopf .knopf { background: rgba(255, 255, 255, .1) !important; border: 1px solid rgba(255, 255, 255, .35) !important; color: #fff !important; box-shadow: none !important; }
  :root .ez > .ez-kopf .knopf:hover, :root .aw-kopf .knopf:hover, :root .ue-kopf .knopf:hover { background: rgba(255, 255, 255, .14) !important; }
  :root .ez > .ez-kopf .knopf[aria-pressed="true"] { background: rgba(255, 255, 255, .24) !important; }
  :root .ez > .ez-kopf .knopf svg { width: 1.3rem; height: 1.3rem; }
  :root .ez > .ez-kopf .eb-chip { background: #fff; color: var(--bar); box-shadow: none; } :root .ez > .ez-kopf .eb-chip i { background: var(--bar); }
  /* Logo auf Rot: das Original (dunkler Grund) – in Hell und Dunkel */
  /* (stärker als die Hell/Dunkel-Regel der Logos in oberflaeche.js) */
  :root .ez-kopf img.logo-hell:not(.x):not(.y), :root .st-logo img.logo-hell:not(.x):not(.y), :root .aw-kopf img.logo-hell:not(.x):not(.y) { display: none !important; }
  :root .ez-kopf img.logo-dunkel:not(.x):not(.y), :root .st-logo img.logo-dunkel:not(.x):not(.y), :root .aw-kopf img.logo-dunkel:not(.x):not(.y) { display: block !important; }
  :root .ez > .ez-kopf img { height: 2.7rem; border-radius: .35rem; box-shadow: 0 0 0 1px rgba(255, 255, 255, .25); }

  /* ------------------------------------------------------------ Flächen, Überschriften, Knöpfe */
  :root .kachel { border-radius: var(--rund); box-shadow: var(--schatten); }
  :root .ez { gap: .7rem; }
  :root .ez h2, :root .gsz-ansicht h2 { font-size: .72rem; letter-spacing: .09em; color: var(--muted); font-weight: 800; }
  /* Kopfstreifen einer Fläche: erste Überschrift über die ganze Breite, abgesetzt */
  :root .ez-karte > h2:first-child { margin: -.8rem -.9rem .75rem; padding: .6rem .9rem; background: var(--surface2); border-bottom: 1px solid var(--line);
    border-radius: var(--rund) var(--rund) 0 0; color: var(--ink2); }
  :root .ez-bereich > h2 { margin: .35rem .15rem .45rem; color: var(--muted); }
  :root .ez .knopf, :root .gsz-ansicht .knopf { border-radius: .45rem; background: var(--surface2); border: 1px solid var(--rand); color: var(--ink);
    font-weight: 600; min-height: 44px; box-shadow: none; }
  :root .ez .knopf:hover, :root .gsz-ansicht .knopf:hover { border-color: var(--muted); }
  :root .ez .knopf.los, :root .knopf.primaer { background: var(--rot) !important; border-color: var(--rot) !important; color: #fff !important; }
  :root .ez-warn { border-radius: .45rem; }
  :root .ez-chip { border-radius: .4rem; }

  /* ------------------------------------------------------------ Suche */
  :root .ez-held { padding: .8rem .9rem .9rem; }
  :root .ez-held-kopf b { font-size: 1.05rem; }
  :root .ez-held-kopf small { border-radius: .3rem; color: var(--muted); border-color: var(--rand); }
  :root .ez-suchfeld { border-radius: .5rem; border: 1px solid var(--rand); background: var(--surface2); min-height: 3.4rem; }
  :root .ez-suchfeld:focus-within { border-color: var(--rot); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rot) 25%, transparent); }
  :root .ez-los { border-radius: .45rem; background: var(--rot); }
  :root .ez-un { border-radius: .45rem; }
  :root .ez-un[aria-pressed="true"] { background: var(--rot); border-color: var(--rot); }
  :root .ez-import-knopf { border-radius: .5rem; }
  :root .ez-import-knopf .sym { border-radius: .4rem; background: color-mix(in srgb, var(--rot) 16%, transparent); color: var(--rot); }

  /* ------------------------------------------------------------ Listen mit farbiger Kante (Unterlagen, Treffer, Zuletzt) */
  :root #ez-ordner { display: flex; flex-direction: column; gap: 0; background: var(--surface); border-radius: var(--rund); box-shadow: var(--schatten); overflow: hidden; }
  :root #ez-ordner .ez-ok { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: .75rem; row-gap: .05rem;
    align-items: center; min-height: 3.6rem; padding: .6rem .85rem .6rem .75rem; border-radius: 0; box-shadow: none; background: transparent;
    border: 0; border-left: 4px solid var(--c); border-bottom: 1px solid var(--line); }
  :root #ez-ordner .ez-ok:last-child { border-bottom: 0; }
  :root #ez-ordner .ez-ok::after { content: "›"; grid-column: 3; grid-row: 1 / span 2; color: var(--muted); font-size: 1.4rem; }
  :root #ez-ordner .ez-ok .sym { grid-column: 1; grid-row: 1 / span 2; width: 2.5rem; height: 2.5rem; border-radius: .4rem; margin: 0; }
  :root #ez-ordner .ez-ok b { grid-column: 2; grid-row: 1; font-size: 1rem; margin: 0; }
  :root #ez-ordner .ez-ok small { grid-column: 2; grid-row: 2; margin: 0; }
  :root #ez-ordner .ez-ok .fotos { grid-column: 2 / span 2; grid-row: 3; margin-top: .4rem; }
  :root #ez-ordner .ez-ok:hover { background: var(--surface2); }
  :root .ez-treffer a { border-radius: .45rem; border-left: 4px solid var(--rot); }

  /* ------------------------------------------------------------ Stoff: Kennwerte als Bezeichnung–Wert-Zeilen */
  :root .ez-kw { gap: 0 1.2rem; }
  :root .ez-kw > div:not(.ez-ausbr) { background: transparent; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; padding: .55rem .1rem .6rem; }
  :root .ez-ausbr { border-radius: .45rem; }

  /* ------------------------------------------------------------ Leiste unten (Reiter einer Stoffseite) */
  :root .ez-leiste { background: var(--leiste-bg); border-top: 1px solid var(--line); box-shadow: 0 -2px 10px rgba(0, 0, 0, .18); gap: 0;
    padding-top: 0; padding-bottom: var(--sicher-unten); }
  :root .ez-leiste a { border-radius: 0; background: transparent; border: 0; border-top: 3px solid transparent; color: var(--muted); padding: .5rem .2rem .6rem; }
  :root .ez-leiste a svg { color: var(--muted); }
  :root .ez-leiste a.an { color: var(--ink); background: color-mix(in srgb, var(--rot) 10%, transparent); border-top-color: var(--rot); }
  :root .ez-leiste a.an svg { color: var(--rot); }

  /* ------------------------------------------------------------ Einsatz: Status wie in der EinsatzApp (Zeitzeile, große Knöpfe) */
  :root #eb-start-karte { padding: 0; overflow: hidden; }
  .eb-status { padding: .85rem .95rem .95rem; display: flex; flex-direction: column; gap: .6rem; }
  .eb-status.laeuft { border-left: 5px solid var(--rot); }
  .eb-titel { font-size: 1.15rem; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; }
  .eb-status.laeuft .eb-titel { color: var(--rot); }
  .eb-stichwort { font-size: 1rem; color: var(--ink2); margin-top: -.35rem; }
  .eb-zeiten { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .eb-zeiten > div { display: flex; flex-direction: column; align-items: center; gap: .1rem; padding: .55rem .3rem; text-align: center; }
  .eb-zeiten > div + div { border-left: 1px solid var(--line); }
  .eb-zeiten small { font-size: .7rem; color: var(--muted); }
  .eb-zeiten b { font-size: 1.35rem; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
  .eb-zeiten span { font-size: .7rem; color: var(--muted); }
  .eb-knoepfe { display: flex; gap: .5rem; flex-wrap: wrap; }
  .eb-knoepfe .knopf { flex: 1 1 9rem; min-height: 3rem !important; font-size: 1rem !important; }

  /* ------------------------------------------------------------ Einsatz-Seite: zwei Spalten auf Tablet und Computer, auf dem Handy eine */
  :root #einsatz .ez-saeule { display: contents; }
  :root #einsatz .ez-saeule > * { width: 100%; max-width: 62rem; margin-left: auto; margin-right: auto; box-sizing: border-box; }
  @media (min-width: 1100px) {
    :root #einsatz { --rand-l: max(calc(.9rem + var(--sicher-links)), calc((100vw - 78rem) / 2)); --rand-r: max(calc(.9rem + var(--sicher-rechts)), calc((100vw - 78rem) / 2));
      display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: .8rem 1rem; align-items: start; }
    :root #einsatz > .ez-kopf { grid-column: 1 / -1; }
    :root #einsatz > .ez-saeule { display: flex; flex-direction: column; gap: .8rem; width: auto; max-width: none; margin: 0; min-width: 0; }
    :root #einsatz .ez-saeule > * { max-width: none; }
  }

  /* ------------------------------------------------------------ Stoff-Übersicht: auf Tablet und Computer zwei Spalten (Flächen ungeteilt) */
  @media (min-width: 1100px) {
    :root #stoffansicht > .ez-stoff-inhalt.uebersicht { display: block !important; columns: 2; column-gap: 1rem; max-width: 78rem; }
    :root #stoffansicht > .ez-stoff-inhalt.uebersicht > * { break-inside: avoid; margin: 0 0 .8rem; }
  }

  /* ------------------------------------------------------------ Startseite: rote Leiste mit Uhr und Suche, Bereiche, Schnellzugriff */
  :root .st-held { background: var(--bar); color: #fff; border-bottom: 0; box-shadow: 0 1px 0 rgba(0, 0, 0, .3); }
  :root #startseite h1 { color: #fff; }
  :root .st-ueber { color: rgba(255, 255, 255, .72); } :root .st-te { color: rgba(255, 255, 255, .9); }
  :root .st-uhr b { color: #fff; } :root .st-uhr span { color: rgba(255, 255, 255, .78); }
  :root .st-logo img { box-shadow: 0 0 0 1px rgba(255, 255, 255, .25); }
  :root .st-suche { background: #fff; border: 0; border-radius: .5rem; box-shadow: 0 2px 10px rgba(0, 0, 0, .25); }
  :root .st-suche input { color: #14171a; } :root .st-suche input::placeholder { color: #6b7380; } :root .st-suche svg { color: #6b7380; }
  :root .st-suche button { background: var(--bar2); border-radius: .4rem; }
  :root .st-lage a, :root .st-lage span { background: rgba(255, 255, 255, .14); border-color: rgba(255, 255, 255, .25); color: #fff; border-radius: .4rem; }
  :root .st-lage svg { color: #fff; }
  :root .st-lage .laeuft { background: #fff; color: var(--bar); border-color: #fff; }
  :root #startseite .st-kachel { display: grid; grid-template-columns: 3.2rem minmax(0, 1fr); column-gap: .9rem; row-gap: .15rem; align-content: center;
    border-radius: var(--rund); border-left-width: 5px; min-height: 0; padding: 1rem 2.4rem 1rem 1rem; }
  :root #startseite .st-kachel > svg { grid-column: 1; grid-row: 1 / span 3; width: 3.2rem; height: 3.2rem; align-self: center; }
  :root #startseite .st-kachel > b { grid-column: 2; font-size: 1.35rem; }
  :root #startseite .st-kachel > span:not(.pfeil) { grid-column: 2; font-size: .88rem; }
  :root #startseite .st-kachel > em { grid-column: 2; border-radius: .35rem; margin-top: .35rem; }
  :root #startseite .st-kachel .pfeil { top: 50%; transform: translateY(-50%); right: 1rem; }
  .st-schnell h2 { margin: 0 0 .55rem; }
  .st-module { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .6rem; }
  .st-modul { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .45rem; padding: .85rem .35rem .75rem; min-height: 5.8rem;
    background: var(--surface); box-shadow: var(--schatten); border-radius: var(--rund); color: var(--ink); text-decoration: none; font-weight: 700; font-size: .84rem;
    line-height: 1.15; text-align: center; -webkit-tap-highlight-color: transparent; border: 0; font-family: inherit; cursor: pointer; }
  .st-modul:hover { background: var(--surface2); }
  .st-modul svg { width: 2rem; height: 2rem; color: var(--rot); flex: none; }
  .st-modul.grau svg { color: var(--ink2); }
  @media (max-width: 640px) { .st-module { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 340px) { .st-module { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

  /* ------------------------------------------------------------ Übungen und Anwesenheit: dieselbe rote Leiste */
  :root #uebungen { justify-content: flex-start; padding-top: 0; gap: 1.2rem; }
  :root .ue-kopf { width: calc(100% + 2.4rem + var(--sicher-links) + var(--sicher-rechts)); margin: 0 calc(-1.2rem - var(--sicher-rechts)) 0 calc(-1.2rem - var(--sicher-links));
    max-width: none; background: var(--bar); color: #fff; padding: calc(.6rem + var(--frei-oben)) calc(1.2rem + var(--sicher-rechts)) .6rem calc(1.2rem + var(--sicher-links)); }
  :root .ue-kopf h1 { color: #fff; font-size: 1.35rem; }
  :root .aw-kopf { background: var(--bar); color: #fff; box-shadow: none; }
  :root .aw-titel h1 { color: #fff; } :root .aw-titel div { color: rgba(255, 255, 255, .8); }
  /* Knöpfe der Leiste 44 px (Handschuh): dafür enger gesetzt, damit der Titel wie bisher passt und das Logo die Höhe füllt */
  @media (max-width: 640px) {
    :root .aw-kopf { gap: .3rem; }
    :root .aw-titel { margin-left: .2rem; }
    :root .aw-titel h1 { font-size: 1.08rem; }
  }
  @media (max-width: 400px) {
    :root .aw-kopf { gap: .25rem; }
    :root .aw-titel h1 { font-size: 1rem; }
  }
  @media (max-width: 374px) {
    :root .aw-kopf { gap: .25rem; }
    :root .gsz-ansicht .aw-kopf .knopf { min-width: 40px; padding-left: .3rem; padding-right: .3rem; }
    :root .aw-titel h1 { font-size: 1rem; }
    :root .aw-titel div { font-size: .68rem; }
  }

  /* ------------------------------------------------------------ CSA-Monitor: rote Leiste, Kennzahlen als weiße Schilder (Farbe der Zahl bleibt) */
  :root .kopfleiste { background: var(--bar); color: #fff; box-shadow: 0 1px 0 rgba(0, 0, 0, .3); }
  :root .kopfleiste .titel h1 { color: #fff; } :root .kopfleiste .titel .unter { color: rgba(255, 255, 255, .8); }
  :root .kopfleiste .kennz { border-left-color: rgba(255, 255, 255, .28); gap: .5rem; }
  :root .kopfleiste .bereit, :root .kopfleiste .kpi { background: #fff; color: #14171a; border: 0; border-radius: .45rem; padding: .3rem .75rem; }
  :root .kopfleiste .bereit span, :root .kopfleiste .kpi span, :root .kopfleiste .bereit b small { color: #4b535c; }
  :root .kopfleiste .bereit b { color: #14171a; }
  :root .kopfleiste .kpi b { filter: saturate(1.2) brightness(.85); }
  :root .kopfleiste .ring .spur { stroke: #e3e6ea; }
  :root .kopfleiste .uhr b { color: #fff; } :root .kopfleiste .uhr span { color: rgba(255, 255, 255, .8); }
  :root .kopfleiste .knopf { background: transparent !important; border: 1px solid rgba(255, 255, 255, .4) !important; color: #fff !important; box-shadow: none !important; }
  :root .kopfleiste img.logo-hell:not(.x):not(.y) { display: none !important; }
  :root .kopfleiste img.logo-dunkel:not(.x):not(.y) { display: block !important; }
  `;
  // WCAG 2.2 · 2.4.11 (Fokus nicht verdeckt): Ein Element, das den Tastaturfokus bekommt, wird unter feststehenden Leisten
  // hervorgeholt – Reiterleiste der Stoffseite unten, Leiste der Anwesenheit unten, Anordnen-Leiste oben
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!(el instanceof Element) || el === document.body) return;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (!r.height) return;
      let oben = 0, unten = innerHeight;
      for (const l of document.querySelectorAll('.ez-leiste, .aw-leiste, .ez-ordnen-leiste')) {
        if (l.contains(el)) continue;
        const s = getComputedStyle(l), b = l.getBoundingClientRect();
        if (s.display === 'none' || s.visibility === 'hidden' || !b.height || !b.width || !/fixed|sticky/.test(s.position)) continue;
        if (b.top > innerHeight / 2) unten = Math.min(unten, b.top); else if (b.top <= 1 + parseFloat(s.top || 0) + 8) oben = Math.max(oben, b.bottom);
      }
      if (r.bottom > unten - 4) window.scrollBy(0, r.bottom - unten + 12);
      else if (r.top < oben + 4) window.scrollBy(0, r.top - oben - 12);
    });
  });
  const st = document.createElement('style');
  st.id = 'gsz-aussehen';
  st.textContent = css;
  document.head.appendChild(st);
})();
