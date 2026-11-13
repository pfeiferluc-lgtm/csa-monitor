// Startseite und Übungsanwesenheit – gemeinsam für das Programm CSA-Monitor (Mac/Windows) und die Web-App (Handy).
// Wird hinter monitor.html geladen. Die Plattform (start.js bzw. web-start.js) ruft auf:
//   GSZ.einrichten(adapter)  adapter = {
//       geraet: 'Mac · CSA-Monitor 1.2.0',                  steht in jeder Meldung
//       speichern(meldung) -> Promise<{ ok, text?, aktion?, daten? }>   Meldung verschlüsselt ablegen
//       einstellungen?(knopf)                                Zahnrad-Menü (nur Web-App)
//       verbinden?()                                         neu mit Dropbox verbinden (Web-App, Schreibrecht)
//   }
//   GSZ.daten(daten)         neue Daten: { leute, anwesenheit: { eingerichtet, personen, uebungen }, ausstehend, quelle }
//   GSZ.zeige('start' | 'monitor' | 'anwesenheit')
// Ansichten über die Adresse (#start, #monitor, #anwesenheit), damit „Zurück“ (auch Wischen am iPhone) funktioniert.
// Erfasste Anwesenheiten gehen in einen Postausgang (im Gerätespeicher) und werden von dort übertragen – ohne Netz
// bleiben sie erhalten und werden später gesendet. Excel übernimmt die Meldungen beim Öffnen der Personaltabelle.
'use strict';
(() => {
  const css = `
  body[data-ansicht="start"] > :not(#startseite):not(#anmeldung):not(#update):not(#web-meldung):not(#einst):not(script):not(style),
  body[data-ansicht="anwesenheit"] > :not(#anwesenheit):not(#anmeldung):not(#update):not(#web-meldung):not(#einst):not(script):not(style),
  body[data-ansicht="monitor"] > #startseite, body[data-ansicht="monitor"] > #anwesenheit,
  body:not([data-ansicht]) > #startseite, body:not([data-ansicht]) > #anwesenheit { display: none !important; }
  body[data-ansicht="start"], body[data-ansicht="anwesenheit"] { padding: 0; gap: 0; display: block; min-height: 100vh; min-height: 100svh; }
  .gsz-ansicht { --rund: .8rem; font-size: 16px; color: var(--ink); }
  .logo-hell { object-fit: contain !important; border-radius: 0 !important; }
  :root:not(.hell) .logo-hell, :root.hell .logo-dunkel:not(.allein) { display: none !important; }

  /* Startseite */
  #startseite { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: calc(1.5rem + env(safe-area-inset-top)) 1.2rem calc(1.2rem + env(safe-area-inset-bottom)); gap: 1.8rem; }
  .st-oben { display: flex; flex-direction: column; align-items: center; text-align: center; gap: .35rem; }
  .st-logo { width: 9.5rem; height: 9.5rem; display: flex; align-items: center; justify-content: center; margin-bottom: .6rem; }
  .st-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 1.4rem; box-shadow: var(--schatten); }
  .st-logo img.logo-hell { box-shadow: none; }
  #startseite h1 { margin: 0; font-size: 2.35rem; letter-spacing: .01em; line-height: 1.1; }
  .st-te { font-size: 1.45rem; font-weight: 600; color: var(--ink2); }
  .st-kreis { font-size: .9rem; color: var(--muted); letter-spacing: .04em; }
  .st-kacheln { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem; width: min(46rem, 100%); }
  .st-kachel { display: flex; flex-direction: column; gap: .45rem; padding: 1.3rem 1.3rem 1.15rem; border-radius: var(--rund);
    background: var(--surface); box-shadow: var(--schatten); color: var(--ink); text-decoration: none; position: relative;
    border-top: .3rem solid var(--c); transition: transform .12s ease, box-shadow .12s ease; -webkit-tap-highlight-color: transparent; }
  .st-kachel:hover { transform: translateY(-2px); }
  .st-kachel:active { transform: translateY(0); }
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
  .st-fuss { display: flex; gap: .8rem 1.2rem; align-items: center; justify-content: center; flex-wrap: wrap; color: var(--muted);
    font-size: .8rem; text-align: center; max-width: 46rem; }
  .st-fuss label { display: inline-flex; gap: .4rem; align-items: center; cursor: pointer; }
  .st-fuss .knopf { font-size: .95rem; }

  /* Übungsanwesenheit */
  #anwesenheit { max-width: 56rem; margin: 0 auto; padding: calc(.7rem + env(safe-area-inset-top)) .8rem 7.5rem;
    display: flex; flex-direction: column; gap: .8rem; }
  .aw-kopf { display: flex; align-items: center; gap: .8rem; padding: .55rem .8rem; }
  .aw-kopf img { width: 2.9rem; height: 2.9rem; object-fit: cover; border-radius: .45rem; flex: none; }
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
    border-top: 1px solid var(--rand); padding: .65rem max(.9rem, calc((100vw - 56rem) / 2 + .9rem)) calc(.65rem + env(safe-area-inset-bottom));
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
    .st-kacheln { grid-template-columns: 1fr; gap: .8rem; }
    .st-logo { width: 7.2rem; height: 7.2rem; }
    #startseite { justify-content: flex-start; gap: 1.3rem; }
    #startseite h1 { font-size: 1.95rem; }
    .st-te { font-size: 1.2rem; }
    .st-kachel { padding: 1rem 1rem .95rem; }
    .aw-felder { grid-template-columns: 1fr; }
    .aw-kopf { gap: .5rem; padding: .5rem .55rem; }
    .aw-kopf img { width: 2.4rem; height: 2.4rem; }
    .aw-titel h1 { font-size: 1.15rem; }
    .aw-zt { display: none; }                               /* Haus-Symbol ohne „Start“ */
    .gsz-ansicht .aw-kopf .knopf { padding: .45rem .6rem; }
    #anwesenheit { padding-left: .5rem; padding-right: .5rem; }
    .aw-uebung, .aw-liste { padding: .7rem .65rem .8rem; }
    .aw-werkzeuge input { flex-basis: 100%; }
    .aw-filter { display: flex; width: 100%; }              /* Filter über die ganze Breite, Knöpfe teilen sich den Platz */
    .aw-filter button { flex: 1 1 auto; padding: .5rem .35rem; }
    .aw-leiste { gap: .1rem .7rem; padding-left: .75rem; padding-right: .75rem; }
  }
  @media (max-width: 400px) {
    .aw-lang { display: none; }
    .aw-kurz { display: inline; }
  }
  @media (max-width: 360px) {
    .aw-kopf { gap: .4rem; }
    .aw-kopf img { width: 2rem; height: 2rem; }
    .aw-titel h1 { font-size: 1.05rem; }
    .aw-titel div { font-size: .72rem; }
    .gsz-ansicht .aw-kopf .knopf { padding: .4rem .5rem; }
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
  const ICON_LISTE = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="7" width="30" height="36" rx="4" opacity=".25"/><path d="M18 7h12v6H18z"/><path d="m16 25 5 5 11-11"/></svg>';

  // ---------------------------------------------------------------- Aufbau
  const start = document.createElement('main');
  start.id = 'startseite';
  start.className = 'gsz-ansicht';
  start.innerHTML = `
    <div class="st-oben">
      <div class="st-logo">${logos()}</div>
      <h1>Gefahrstoffzug</h1>
      <div class="st-te">Teileinheit Miehlen</div>
      <div class="st-kreis">Rhein-Lahn-Kreis</div>
    </div>
    <nav class="st-kacheln" aria-label="Menü">
      <a class="st-kachel" href="#monitor" id="st-monitor" style="--c:var(--good)">${ICON_MONITOR}<span class="pfeil">›</span>
        <b>CSA-Monitor</b><span>Belastungsübung der CSA-Träger: Ampel, Planung, Zeitstrahl</span><em id="st-monitor-info">wird geladen …</em></a>
      <a class="st-kachel" href="#anwesenheit" id="st-anw" style="--c:var(--akzent)">${ICON_LISTE}<span class="pfeil">›</span>
        <b>Übungsanwesenheit</b><span>Anwesenheit erfassen und Belastungsübungen eintragen</span><em id="st-anw-info">wird geladen …</em></a>
    </nav>
    <div class="st-fuss">
      <span id="st-quelle"></span>
      <label><input type="checkbox" id="st-direkt"> beim Start direkt den CSA-Monitor zeigen</label>
      <span><button class="knopf" id="st-modus" title="Hell / Dunkel">◐</button>
      <button class="knopf" id="st-einst" title="Einstellungen" hidden>⚙</button></span>
    </div>`;
  const anw = document.createElement('main');
  anw.id = 'anwesenheit';
  anw.className = 'gsz-ansicht';
  anw.innerHTML = `
    <header class="kachel aw-kopf">
      ${logos()}
      <div class="aw-titel"><h1>Übungs&shy;anwesenheit</h1><div>Gefahrstoffzug · Teileinheit&nbsp;Miehlen</div></div>
      <a class="knopf" href="#start" id="aw-zurueck" title="Startseite" aria-label="Startseite">${ICON_HAUS}<span class="aw-zt">Start</span></a>
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
  document.body.appendChild(anw);

  // Startseite im Kopf des Monitors: schmales Haus-Symbol (der Monitor wählt die Schrift nach der Breite des Kopfes)
  const rechts = document.querySelector('.kopfleiste .rechts');
  if (rechts) {
    const k = document.createElement('a');
    k.className = 'knopf'; k.href = '#start'; k.id = 'mon-start'; k.title = 'Startseite'; k.setAttribute('aria-label', 'Startseite');
    k.style.cssText = 'text-decoration:none;display:inline-flex;align-items:center;';
    k.innerHTML = ICON_HAUS;
    rechts.insertBefore(k, rechts.firstChild);
  }

  // ---------------------------------------------------------------- Zustand
  let D = null, adapter = {}, ansicht = null;
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
  const TITEL = { start: 'Gefahrstoffzug · Teileinheit Miehlen', monitor: 'CSA-Monitor', anwesenheit: 'Übungsanwesenheit' };
  function zeige(a, ersetzen = false) {
    if (!['start', 'monitor', 'anwesenheit'].includes(a)) a = 'start';
    if (location.hash !== '#' + a) {
      if (ersetzen) history.replaceState(null, '', '#' + a); else location.hash = a;
    }
    anwenden(a);
  }
  function anwenden(a) {
    const vorher = ansicht;
    ansicht = a;
    document.body.dataset.ansicht = a;
    document.title = TITEL[a];
    // Startseite und Anwesenheit mit fester Grundschrift (der Monitor passt seine Schrift selbst an den Bildschirm an)
    if (a !== 'monitor') document.documentElement.style.fontSize = (innerWidth <= 640 ? 15 : 16) + 'px';
    if (vorher === 'anwesenheit' && a !== 'anwesenheit') sofortUebertragen();
    if (a === 'monitor') { try { zeichnen(); } catch { /* noch keine Daten */ } }   // eslint-disable-line no-undef
    if (a === 'start') startZeichnen();
    if (a === 'anwesenheit') { if (!sitzung) uebungWaehlen(heuteIso(), null); anwZeichnen(); }
    if (vorher !== a) window.scrollTo(0, 0);
  }
  addEventListener('hashchange', () => anwenden((location.hash || '#start').slice(1)));
  addEventListener('resize', () => { if (ansicht && ansicht !== 'monitor') document.documentElement.style.fontSize = (innerWidth <= 640 ? 15 : 16) + 'px'; });

  // ---------------------------------------------------------------- Startseite
  function startZeichnen() {
    $('st-direkt').checked = SP.get('gsz-start') === 'monitor';
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
  $('st-direkt').addEventListener('change', e => SP.set('gsz-start', e.target.checked ? 'monitor' : null));

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
      if (ansicht === 'start') startZeichnen();
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
  for (const id of ['st-modus', 'aw-modus']) $(id).addEventListener('click', () => {
    const hell = document.documentElement.classList.toggle('hell');
    try { localStorage.setItem('csa-modus', hell ? 'hell' : 'dunkel'); } catch { /* privat */ }
  });

  // ---------------------------------------------------------------- Schnittstelle zur Plattform
  function daten(neu, ohneSenden = false) {
    D = neu;
    if (ansicht === 'start') startZeichnen();
    if (ansicht === 'anwesenheit') anwZeichnen();
    if (!ohneSenden && ausgang.length) senden();
  }
  function einrichten(a) {
    adapter = a || {};
    if (adapter.einstellungen) {
      for (const id of ['st-einst', 'aw-einst']) {
        $(id).hidden = false;
        $(id).addEventListener('click', e => { e.stopPropagation(); adapter.einstellungen(e.currentTarget); });
      }
    }
    // Startansicht: Adresse (#…), sonst gemerkte Wahl „direkt zum Monitor“, sonst Startseite
    const h = (location.hash || '').slice(1);
    if (['start', 'monitor', 'anwesenheit'].includes(h)) anwenden(h);
    else zeige(SP.get('gsz-start') === 'monitor' ? 'monitor' : 'start', true);
    if (ausgang.length) setTimeout(senden, 1500);
  }
  window.GSZ = { einrichten, daten, zeige, get ausgang() { return ausgang.slice(); } };
})();
