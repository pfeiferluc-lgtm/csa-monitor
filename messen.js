// Messen mit Prüfröhrchen – interaktiv nach der Dräger-Messstrategie 1.5 (Daten und Ablauf: messstrategie.js, Stoffblätter:
// messstrategie-stoffe.js). Ansichten: #messen (Lage wählen, Protokoll), #messen/unbekannt (geführter Ablauf Blatt A–E),
// #messen/brand (Simultantest und Einzelröhrchen), #messen/bekannt[/<CAS>] (Stoffblatt und passendes Röhrchen).
// Je Röhrchen: Hubzahl wählen, Hübe zählen mit Messzeit, Ergebnis eintragen, sofort gegen ETW-4/ETW-1 bewertet.
// Läuft ein Einsatz, wird jedes Ergebnis ins Einsatztagebuch geschrieben; die Messwerte des Mehrgasmessgeräts auf Wunsch.
'use strict';
(function () {
  const M = window.GSZMessen, STOFFE = window.GSZMessStoffe || [], E = window.GSZEinsatz;
  if (!M || !E || !window.GSZ) return;
  const esc = E.esc, meldung = E.meldung;
  const LS = 'gsz-messen';
  const SVG = (inhalt, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
  const ICON = {
    roehrchen: SVG('<path d="M9 3h6M10 3v15a2 2 0 0 0 4 0V3"/><path d="M10 11h4"/>'),
    feuer: SVG('<path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 8 11.5c0-1.5.6-2.6 1.4-3.4.2 1.2.9 2 1.6 2.4C11 7.6 11.2 5 12 3z"/><path d="M6.5 14.5A5.5 5.5 0 0 0 12 21a5.5 5.5 0 0 0 5.5-6.5"/>'),
    frage: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
    stoff: SVG('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14"/>'), minus: SVG('<path d="M5 12h14"/>'),
    start: SVG('<path d="M7 4v16l13-8z"/>'), stop: SVG('<rect x="6" y="6" width="12" height="12" rx="1.5"/>'),
    haken: SVG('<path d="m5 12 5 5 9-10"/>', 2.6), kreuz: SVG('<path d="M6 6l12 12M18 6 6 18"/>', 2.4),
    pfeil: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>'), doku: SVG('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
    neu: SVG('<path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 10A8 8 0 0 0 6 6L4 10M4 14a8 8 0 0 0 14 4l2-4"/>'),
  };
  const zt = M.zahlText, uhr = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dauer = s => s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min` : `${Math.round(s)} s`;

  // ---------------------------------------------------------------- Zustand (auf dem Gerät gemerkt)
  let daten = (() => { try { return JSON.parse(localStorage.getItem(LS) || 'null') || { messungen: [] }; } catch { return { messungen: [] }; } })();
  if (!Array.isArray(daten.messungen)) daten.messungen = [];
  const sichern = () => { try { localStorage.setItem(LS, JSON.stringify(daten)); } catch { /* voll */ } };
  // laufende Messung je Lage: der Wechsel zwischen den Lagen (z. B. kurz ins Stoffblatt) setzt die offene Messung fort
  const aktiveMessung = lage => {
    let m = daten.messungen.find(x => !x.ende && (!lage || x.lage === lage));
    if (!m) {
      m = { id: 'm' + Date.now(), lage, beginn: Date.now(), ort: '', hoehe: '', trupp: '', mehrgas: {}, fluessig: null, ph: null, erg: {}, sets: {}, stoff: '' };
      daten.messungen.unshift(m); daten.messungen = daten.messungen.slice(0, 40);
    }
    if (daten.aktiv !== m.id) { daten.aktiv = m.id; sichern(); }
    return m;
  };
  const bericht = () => window.GSZBericht && window.GSZBericht.aktiv() ? window.GSZBericht : null;
  const tagebuch = text => { const b = bericht(); if (b) b.eintragen(text, 'messung'); };

  // ---------------------------------------------------------------- Stile
  const st = document.createElement('style');
  st.textContent = `
  .ms-lagen { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: .7rem; }
  .ms-lage { display: grid; grid-template-columns: 2.6rem 1fr auto; gap: .2rem .8rem; align-items: center; padding: .9rem 1rem; border-radius: .7rem; background: var(--surface2);
    border: 1px solid var(--line); border-left: 4px solid var(--c, var(--akzent)); color: var(--ink); text-decoration: none; min-height: 44px; }
  .ms-lage svg { width: 2rem; height: 2rem; color: var(--c, var(--akzent)); grid-row: span 2; }
  .ms-lage b { font-size: 1.05rem; } .ms-lage span { color: var(--ink2); font-size: .85rem; grid-column: 2; } .ms-lage .pf { grid-row: 1 / span 2; grid-column: 3; color: var(--muted); font-size: 1.4rem; }
  .ms-kopfzeile { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .55rem; }
  .ms-feld { display: flex; flex-direction: column; gap: .25rem; font-size: .78rem; color: var(--ink2); font-weight: 600; }
  .ms-feld input, .ms-feld select { font: inherit; font-size: 16px; font-weight: 400; min-height: 44px; padding: 0 .65rem; border-radius: .5rem; border: 1px solid var(--line);
    background: var(--surface2); color: var(--ink); box-sizing: border-box; width: 100%; font-variant-numeric: tabular-nums; }
  .ms-feld.warn input { border-color: var(--crit); box-shadow: inset 0 0 0 1px var(--crit); }
  .ms-feld small { font-weight: 400; color: var(--crit); min-height: 1em; }
  .ms-seg { display: flex; flex-wrap: wrap; gap: .4rem; }
  .ms-seg button { font: inherit; font-size: .9rem; font-weight: 600; min-height: 44px; padding: .4rem .8rem; border-radius: .5rem; border: 1px solid var(--line); background: var(--surface2);
    color: var(--ink); cursor: pointer; display: inline-flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: .05rem; text-align: left; }
  .ms-seg button small { font-weight: 400; font-size: .74rem; color: var(--ink2); }
  .ms-seg button[aria-pressed="true"] { background: var(--akzent-voll, #2563c9); border-color: var(--akzent-voll, #2563c9); color: #fff; }
  .ms-seg button[aria-pressed="true"] small { color: rgba(255,255,255,.88); }
  .ms-seg button .stern { font-size: .7rem; font-weight: 700; color: var(--good); }
  .ms-seg button[aria-pressed="true"] .stern { color: #fff; }
  .ms-schritte { display: flex; gap: .35rem; flex-wrap: wrap; margin: 0 0 .8rem; padding: 0; list-style: none; }
  .ms-schritte li { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .65rem; border-radius: 999px; border: 1px solid var(--line); background: var(--surface2); font-size: .8rem; font-weight: 600; color: var(--ink2); }
  .ms-schritte li.an { background: var(--akzent-voll, #2563c9); border-color: var(--akzent-voll, #2563c9); color: #fff; }
  .ms-schritte li.fertig { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--line)); }
  .ms-ablauf { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
  .ms-ablauf > li > button.zeile { width: 100%; display: grid; grid-template-columns: 2.6rem 1fr auto; gap: .2rem .7rem; align-items: center; text-align: left; font: inherit; color: var(--ink);
    padding: .55rem .7rem; min-height: 44px; border-radius: .6rem; border: 1px solid var(--line); background: var(--surface2); cursor: pointer; border-left: 4px solid var(--c, var(--line)); }
  .ms-ablauf .nr { font-weight: 800; font-size: .8rem; color: var(--ink2); font-variant-numeric: tabular-nums; }
  .ms-ablauf .zeile small { display: block; color: var(--ink2); font-size: .76rem; }
  .ms-ablauf .stand { font-size: .8rem; font-weight: 700; white-space: nowrap; }
  .ms-ablauf li.jetzt > button.zeile { border-color: var(--akzent); box-shadow: inset 0 0 0 1px var(--akzent); }
  .ms-frage { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .55rem; margin-top: .6rem; }
  .ms-frage button { font: inherit; min-height: 64px; padding: .7rem .9rem; border-radius: .7rem; border: 2px solid var(--line); background: var(--surface2); color: var(--ink); cursor: pointer;
    display: flex; align-items: center; gap: .7rem; text-align: left; font-weight: 600; }
  .ms-frage button i { width: 2.2rem; height: 2.2rem; border-radius: .45rem; flex: none; background: var(--f, var(--line)); border: 1px solid rgba(0,0,0,.25); }
  .ms-frage button small { display: block; font-weight: 400; color: var(--ink2); font-size: .8rem; }
  .ms-frage button[aria-pressed="true"] { border-color: var(--akzent); background: color-mix(in srgb, var(--akzent) 12%, var(--surface2)); }
  .ms-r { border: 1px solid var(--line); border-radius: .75rem; background: var(--surface); padding: .8rem .85rem; display: flex; flex-direction: column; gap: .65rem; margin-top: .45rem; }
  .ms-r-kopf { display: flex; align-items: flex-start; gap: .7rem; }
  .ms-r-kopf .nr { flex: none; min-width: 2.6rem; height: 2.6rem; border-radius: .5rem; display: grid; place-items: center; background: var(--surface2); border: 1px solid var(--line); font-weight: 800; font-variant-numeric: tabular-nums; }
  .ms-r-kopf h3 { margin: 0; font-size: 1.08rem; } .ms-r-kopf .etw { font-size: .82rem; color: var(--ink2); font-variant-numeric: tabular-nums; }
  .ms-tags { display: flex; gap: .3rem; margin-left: auto; flex-wrap: wrap; justify-content: flex-end; }
  .ms-tag { font-size: .7rem; font-weight: 800; padding: .12rem .4rem; border-radius: .3rem; color: #fff; background: var(--grau-voll, #5f6873); }
  .ms-tag.ex { background: #a33d12; } .ms-tag.pid { background: #8a5a00; }
  .ms-umschlag { display: flex; align-items: center; gap: .45rem; font-size: .88rem; flex-wrap: wrap; }
  .ms-umschlag i { width: 1.6rem; height: 1.1rem; border-radius: .25rem; border: 1px solid rgba(0,0,0,.3); display: inline-block; background: var(--f); }
  .ms-zaehler { display: grid; grid-template-columns: 1fr auto; gap: .6rem .9rem; align-items: center; padding: .7rem .8rem; border-radius: .65rem; background: var(--surface2); border: 1px solid var(--line); }
  .ms-zaehler .zahl { font-size: 2.6rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
  .ms-zaehler .zahl small { font-size: 1rem; font-weight: 600; color: var(--ink2); }
  .ms-zaehler .zeit { font-size: .85rem; color: var(--ink2); font-variant-numeric: tabular-nums; }
  .ms-zaehler .balken { grid-column: 1 / -1; height: .5rem; border-radius: 999px; background: var(--line); overflow: hidden; }
  .ms-zaehler .balken i { display: block; height: 100%; width: var(--p, 0%); background: var(--akzent); transition: width .2s; }
  .ms-zaehler .knoepfe { display: flex; gap: .45rem; grid-column: 1 / -1; flex-wrap: wrap; }
  .ms-hub { flex: 1 1 10rem; min-height: 64px !important; font-size: 1.15rem !important; font-weight: 800 !important; background: var(--akzent-voll, #2563c9) !important; border-color: var(--akzent-voll, #2563c9) !important; color: #fff !important; }
  .ms-zaehler.voll { border-color: var(--good); } .ms-zaehler.voll .balken i { background: var(--good); }
  .ms-erg { display: flex; flex-wrap: wrap; gap: .45rem; align-items: stretch; }
  .ms-erg .knopf { min-height: 52px; font-weight: 700; }
  .ms-erg .wert { display: flex; align-items: center; gap: .4rem; flex: 1 1 14rem; min-width: 0; max-width: 100%; }
  .ms-erg .wert input { flex: 1; min-width: 0; min-height: 52px; font-size: 1.3rem; font-weight: 700; padding: 0 .7rem; border-radius: .55rem; border: 1px solid var(--line);
    background: var(--surface2); color: var(--ink); font-variant-numeric: tabular-nums; }
  .ms-erg .wert span { font-weight: 700; color: var(--ink2); font-size: .9rem; flex: none; }
  .ms-bew { display: flex; flex-wrap: wrap; gap: .4rem .6rem; align-items: center; padding: .6rem .75rem; border-radius: .6rem; border-left: 5px solid var(--c, var(--line)); background: var(--surface2); }
  .ms-bew b { font-size: 1.05rem; font-variant-numeric: tabular-nums; }
  .ms-schild { display: inline-flex; align-items: center; padding: .2rem .6rem; border-radius: .35rem; font-weight: 800; font-size: .82rem; color: #fff; background: var(--c-voll, var(--grau-voll, #5f6873)); }
  .ms-hinweis { font-size: .85rem; color: var(--ink2); line-height: 1.45; } .ms-hinweis b { color: var(--ink); }
  .ms-folge { font-size: .85rem; font-weight: 700; color: var(--akzent); }
  .ms-auswertung { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
  .ms-auswertung li { padding: .5rem .7rem; border-radius: .55rem; background: var(--surface2); border-left: 4px solid var(--ser); font-size: .9rem; }
  .ms-auswertung li.bestaetigt { border-left-color: var(--crit); font-weight: 700; }
  .ms-kanal { display: grid; grid-template-columns: minmax(8rem, 1fr) auto; gap: .4rem .7rem; align-items: center; padding: .55rem 0; border-top: 1px solid var(--line); }
  .ms-kanal:first-of-type { border-top: 0; }
  .ms-kanal .ms-seg button { min-width: 5.4rem; }
  .ms-kanal .ms-bew { grid-column: 1 / -1; padding: .35rem .6rem; }
  @media (max-width: 560px) { .ms-kanal { grid-template-columns: 1fr; } }
  .ms-werte { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: .35rem .9rem; margin: 0; }
  .ms-werte div { display: flex; flex-direction: column; padding: .4rem 0; border-bottom: 1px solid var(--line); }
  .ms-werte dt { font-size: .74rem; color: var(--ink2); } .ms-werte dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
  .ms-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
  .ms-liste a { display: flex; justify-content: space-between; gap: .6rem; align-items: center; padding: .6rem .75rem; min-height: 44px; border-radius: .55rem; background: var(--surface2);
    border: 1px solid var(--line); color: var(--ink); text-decoration: none; }
  .ms-liste a small { color: var(--ink2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ms-proto { width: 100%; border-collapse: collapse; font-size: .86rem; }
  .ms-proto th, .ms-proto td { text-align: left; padding: .4rem .45rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  .ms-proto th { font-size: .74rem; color: var(--ink2); font-weight: 700; }
  .ms-proto td.w { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
  .ms-bild { margin: 0; display: flex; flex-direction: column; gap: .35rem; padding: .55rem .7rem .5rem; border-radius: .45rem; background: #fff; border: 1px solid var(--line); }
  .ms-bild > div { display: flex; flex-direction: column; gap: .1rem; }
  .ms-bild span { font-size: max(13px, .8125rem); color: #4b535c; font-weight: 600; }
  .ms-bild img, .ms-bild svg { width: 100%; max-width: 34rem; height: auto; display: block; }
  .ms-bild figcaption { font-size: max(12px, .75rem); color: #5f6873; }
  .ms-quer { font-size: .88rem; } .ms-quer > b { display: block; margin-bottom: .2rem; }
  .ms-quer ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .15rem; } .ms-quer li span { font-weight: 600; } .ms-quer small { color: var(--ink2); font-size: max(13px, .8125rem); }
  .ms-treffer { list-style: none; margin: .3rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
  .ms-treffer li { padding: .6rem .75rem; border-radius: .55rem; background: var(--surface2); border: 1px solid var(--line); display: flex; flex-direction: column; gap: .3rem; }
  .ms-treffer li .kopf { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .4rem .8rem; align-items: center; }
  .ms-treffer li small { color: var(--ink2); font-size: max(13px, .8125rem); }
  .ms-treffer .knopf { align-self: flex-start; }
  .ms-gruppe { margin: .9rem 0 .2rem; font-size: max(13px, .875rem); font-weight: 600; color: var(--ink2); }
  .ms-set-tab { width: 100%; border-collapse: collapse; font-size: .88rem; }
  .ms-set-tab th, .ms-set-tab td { text-align: left; padding: .45rem .4rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  .ms-set-tab th { font-size: max(13px, .78rem); color: var(--ink2); font-weight: 600; }
  .ms-set-tab td.z { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ms-set-bild { width: 100%; max-width: 26rem; border-radius: .5rem; background: #fff; display: block; }
  .ms-set { margin-top: 1.4rem; border: 1px solid var(--rand-stark, var(--rand)) !important; }
  .ms-set > .ms-set-kopf { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem .7rem; margin: -.8rem -.9rem .8rem; padding: .75rem 1rem .75rem .9rem;
    background: var(--surface3, var(--surface2)); border-bottom: 1px solid var(--rand-stark, var(--rand)); border-left: 6px solid var(--c, var(--akzent)); border-radius: var(--rund) var(--rund) 0 0; }
  .ms-set > .ms-set-kopf h2 { margin: 0 !important; padding: 0 !important; background: none !important; border: 0 !important; min-height: 0 !important; font-size: 1.15rem !important; font-weight: 700 !important; color: var(--ink) !important; flex: 1 1 14rem; }
  .ms-set-kopf .ms-schild { font-size: .8rem; }
  .ms-warn { padding: .6rem .75rem; border-radius: .55rem; border-left: 4px solid var(--crit); background: color-mix(in srgb, var(--crit) 10%, var(--surface2)); font-size: .88rem; }
  `;
  document.head.appendChild(st);

  // Farben der Röhrchen-Anzeigeschicht (nur zur Orientierung – maßgeblich ist das Röhrchen)
  const FARBE = { 'weiß': '#f3f3f0', 'hellgelb': '#f5e8a3', 'gelb': '#f0d23c', 'dunkelgelb': '#d9a915', 'orange': '#ef8a2c', 'gelb-orange': '#f2a53a', 'rot': '#d23a2e', 'rosa': '#f1a7c6',
    'rosagelb': '#f4c7a6', 'blau': '#2f6fd6', 'blauviolett': '#5a4bb6', 'violett': '#7a49b5', 'braun': '#7b4a25', 'braunviolett': '#6c3e5a', 'grün': '#3f9b4a', 'grünbraun': '#6a6a2c',
    'mintgrün': '#98d8b8', 'gelbbraun': '#b8893a', 'rötlich-braun': '#8f4a32', 'graublau': '#6f7f97', 'blaugrau': '#7088a5', 'graugrün': '#8b9b84', 'grau': '#9a9a9a', 'braunrot': '#8b3a2a', 'hellbraun': '#b8875a', 'gelbweiß': '#f6f0cf' };
  const farbe = t => { const k = String(t || '').toLowerCase().split(/[ ,(]/)[0]; return FARBE[k] || null; };
  const umschlagHtml = u => { if (!u) return ''; const [von, nach] = Array.isArray(u) ? u : String(u).split('→').map(x => x.trim());
    return `<div class="ms-umschlag"><span>Umschlag:</span>${farbe(von) ? `<i style="--f:${farbe(von)}"></i>` : ''}<b>${esc(von || '')}</b><span aria-hidden="true">→</span>${farbe(nach) ? `<i style="--f:${farbe(nach)}"></i>` : ''}<b>${esc(nach || '')}</b></div>`; };
  // Fotos der Röhrchen aus den Dräger-Stoffblättern – im App-Ordner unter _App/Roehrchen (nicht in der öffentlichen Web-App);
  // ohne Foto (Säuretest, Polytest, Ethylacetat) bzw. ohne Dropbox: schlichte Zeichnung in den Farben des Umschlags
  const BILD_ORDNER = '_App/Roehrchen/';
  const bildDa = n => (E.dateien || []).some(d => !d.ordner && String(d.pfad).normalize('NFC') === BILD_ORDNER + n);
  const rohrSvg = (r, an) => { const [von, nach] = Array.isArray(r.umschlag) ? r.umschlag : String(r.umschlag || '').split('→').map(x => x.trim());
    const f1 = farbe(von) || '#ecebe4', f2 = farbe(nach) || f1, striche = [0, 1, 2, 3, 4, 5].map(i => `<path d="M${70 + i * 34} 10v4" stroke="#56606b" stroke-width="1"/>`).join('');
    return `<svg viewBox="0 0 320 28" aria-hidden="true"><path d="M3 14 15 8.5h290l12 5.5-12 5.5H15z" fill="#eef3f6" stroke="#9aa6b2" stroke-width="1.2"/>
      <rect x="36" y="9.5" width="20" height="9" fill="#d9d2bd"/><rect x="60" y="9.5" width="190" height="9" fill="${f1}"/>${an ? `<rect x="60" y="9.5" width="78" height="9" fill="${f2}"/>` : ''}
      <rect x="252" y="9.5" width="10" height="9" fill="#d9d2bd"/>${striche}<path d="M58 9v10" stroke="#222" stroke-width="2"/></svg>`; };
  function bildHtml(r) {
    if (r.sensor) return '';
    const s = r.seite || (r.nr && M.BILD_SEITE[r.nr]);
    const u = s && bildDa(`S${s}-unbenutzt.jpg`), b = s && bildDa(`S${s}-benutzt.jpg`);
    const zeile = (titel, inhalt) => `<div><span>${titel}</span>${inhalt}</div>`;
    if (u && b) return `<figure class="ms-bild">${zeile('unbenutzt', `<img data-rbild="${BILD_ORDNER}S${s}-unbenutzt.jpg" alt="Röhrchen ${esc(r.name)} unbenutzt">`)}
      ${zeile('nach der Messung', `<img data-rbild="${BILD_ORDNER}S${s}-benutzt.jpg" alt="Röhrchen ${esc(r.name)} mit Farbumschlag">`)}<figcaption>Foto: Dräger-Messstrategie (Stoffblatt S. ${s}) · Gaseinlass links${r.quer ? ` · zeigt die Verfärbung durch den Hauptstoff${r.querFarbe ? ` – ${esc(r.quer)} färbt ${esc(r.querFarbe)}` : ''}` : ''}</figcaption></figure>`;
    return `<figure class="ms-bild">${zeile('unbenutzt', rohrSvg(r, false))}${zeile('nach der Messung', rohrSvg(r, true))}<figcaption>Zeichnung nach dem Farbumschlag · Gaseinlass links</figcaption></figure>`;
  }
  async function bilderLaden(c) {
    for (const img of c.querySelectorAll('img[data-rbild]')) {
      try { img.src = await E.objektUrl(img.dataset.rbild); } catch { const f = img.closest('div'); if (f) f.hidden = true; }
    }
  }
  const GRUPPE_TEXT = { 'Amine': 'organische Amine (basische Stoffe)', 'C=C-Doppelbindung': 'Verbindungen mit C=C-Doppelbindung', 'Halogene': 'freie Halogene',
    'Mineralsäuren': 'Mineralsäuren/Halogenwasserstoffsäuren', 'Benzinkohlenwasserstoffe': 'Benzin-Kohlenwasserstoffe' };
  const stoffText_ = x => GRUPPE_TEXT[x] || x;
  const querVon = r => M.QUER.filter(e => (r.nr && e.nr === r.nr) || e.r === r.name);
  function querHtml(r) {
    const l = querVon(r);
    if (!l.length) return r.zeigt ? `<div class="ms-hinweis"><b>Zeigt/Querempfindlichkeit:</b> ${esc(r.zeigt)}</div>` : '';
    return `<div class="ms-quer"><b>Zeigt auch an</b><ul>${l.map(e => `<li><span>${esc(e.stoffe.map(stoffText_).join(', '))}</span><small> – ${esc(e.wie)}${e.s ? ` · Stoffblatt S. ${e.s}` : ''}</small></li>`).join('')}</ul>
      ${r.zeigt ? `<div class="ms-hinweis" style="margin-top:.3rem">${esc(r.zeigt)}</div>` : ''}</div>`;
  }
  const STUFE = { unter: ['var(--good)', 'var(--good-voll, #1d7a43)', 'unter ETW-4'], etw4: ['var(--ser)', 'var(--ser-voll, #c2410c)', 'ab ETW-4'],
    etw1: ['var(--crit)', 'var(--crit-voll, #c62828)', 'ab ETW-1'], ohne: ['var(--line)', 'var(--grau-voll, #5f6873)', 'kein ETW'], neg: ['var(--good)', 'var(--good-voll, #1d7a43)', 'keine Anzeige'],
    pos: ['var(--ser)', 'var(--ser-voll, #c2410c)', 'Anzeige'] };
  const etwText = r => [r.etw1 !== null && r.etw1 !== undefined ? `ETW-1 ${zt(r.etw1)} ${r.einheit || 'ppm'}` : 'ETW-1 –', r.etw4 !== null && r.etw4 !== undefined ? `ETW-4 ${zt(r.etw4)} ${r.einheit || 'ppm'}` : 'ETW-4 –'].join(' · ');

  // ---------------------------------------------------------------- Röhrchen-Karte: Hubzahl, Hübe zählen, Ergebnis, Bewertung
  // r: Röhrchen (Messkonzept oder aus dem Stoffblatt); e: gemerktes Ergebnis; opt: { huebe, extraStufen, aendern(e), titelZusatz }
  const zaehler = new Map();            // Schlüssel -> { n, start, ziel }
  function ergebnisText(r, e) {
    if (!e) return '';
    if (r.qualitativ || r.sensor) return e.anzeige ? 'Anzeige' + (e.farbe ? ' (' + e.farbe + ')' : '') + (e.wert ? ' ' + zt(M.zahl(e.wert)) + ' ' + (r.einheit || 'ppm') : '') : 'keine Anzeige';
    return e.anzeige ? (e.wert !== '' && e.wert !== undefined && e.wert !== null ? `${zt(M.zahl(e.wert))} ${r.einheit || 'ppm'}` : 'Anzeige') : 'keine Verfärbung';
  }
  function bewertungVon(r, e) {
    if (!e) return null;
    if (!e.anzeige) return { stufe: 'neg', text: r.qualitativ ? 'keine Verfärbung' : `unter der Nachweisgrenze bei ${e.huebe || '?'} Hüben` };
    if (r.qualitativ) return { stufe: 'pos', text: 'Verfärbung – weiter nach Ablauf' };
    const b = M.bewerten(r, e.wert, e.huebe);
    return b || { stufe: 'pos', text: 'Anzeige ohne Wert' };
  }
  function roehrchenKarte(r, e, opt = {}) {
    const k = `${opt.schluessel || 'r'}-${r.nr || r.name}`;
    const stufen = [...(r.stufen || []), ...(opt.extraStufen || [])];
    const hz = Number((e && e.huebe) || opt.huebe || (stufen.find(s => s.empf) || stufen[0] || {}).n || 0) || 0;
    const st_ = stufen.find(s => s.n === hz);
    const z = zaehler.get(k);
    const bew = bewertungVon(r, e), farb = bew ? STUFE[bew.stufe] || STUFE.ohne : null;
    const tags = (r.ex ? '<span class="ms-tag ex" title="in hohen Konzentrationen auch mit katalytischem Ex-Sensor erfassbar">EX</span>' : '') +
      (r.pid ? '<span class="ms-tag pid" title="in hohen Konzentrationen auch mit PID erfassbar">PID</span>' : '');
    const zaehlerHtml = !stufen.length || r.sensor ? '' : (() => {
      const n = z ? z.n : 0, ziel = hz || null, sek = z && z.start ? Math.round((Date.now() - z.start) / 1000) : 0;
      return `<div class="ms-zaehler${ziel && n >= ziel ? ' voll' : ''}" data-zaehler="${esc(k)}" style="--p:${ziel ? Math.min(100, Math.round(n / ziel * 100)) : 0}%">
        <div class="zahl" aria-live="polite"><span data-hubzahl>${n}</span><small>${ziel ? ` / ${ziel} ${ziel === 1 ? 'Hub' : 'Hübe'}` : ' Hübe'}</small></div>
        <div class="zeit"><span data-zeit>${z && z.start ? dauer(sek) : '–'}</span>${st_ && st_.s ? ` von ca. ${dauer(st_.s)}` : ''}</div>
        <div class="balken" aria-hidden="true"><i></i></div>
        <div class="knoepfe"><button type="button" class="knopf ms-hub" data-hub="${esc(k)}">${ICON.plus}Hub gezählt</button>
          <button type="button" class="knopf" data-hub-minus="${esc(k)}" aria-label="Einen Hub zurück">${ICON.minus}</button>
          <button type="button" class="knopf" data-hub-null="${esc(k)}">Neu</button></div>
        <div class="ms-hinweis" style="grid-column:1/-1">${ziel && n >= ziel ? '<b>Hubzahl erreicht – Röhrchen ablesen.</b>' : 'Nach jedem Hub tippen, sobald die Hubende-Anzeige der Pumpe erscheint.'}</div></div>`;
    })();
    const stufenHtml = stufen.length > 1 ? `<div><div class="ms-hinweis" style="margin-bottom:.3rem">Hubzahl</div><div class="ms-seg" role="group" aria-label="Hubzahl">${stufen.map(s =>
      `<button type="button" data-huebe="${s.n}" aria-pressed="${s.n === hz}">${s.n} ${s.n === 1 ? 'Hub' : 'Hübe'}${s.empf ? ' <span class="stern">empfohlen</span>' : ''}<small>${s.s ? 'ca. ' + dauer(s.s) : ''}${s.bis !== undefined ? ` · ${zt(s.von)}–${zt(s.bis)} ${r.einheit || 'ppm'}` : ''}${s.quelle ? ' · ' + esc(s.quelle) : ''}</small></button>`).join('')}</div></div>`
      : stufen.length === 1 ? `<div class="ms-hinweis"><b>${stufen[0].n} ${stufen[0].n === 1 ? 'Hub' : 'Hübe'}</b>${stufen[0].s ? ` · ca. ${dauer(stufen[0].s)}` : ''}${stufen[0].bis !== undefined ? ` · Messbereich ${zt(stufen[0].von)}–${zt(stufen[0].bis)} ${r.einheit || 'ppm'}` : ''}</div>`
      : r.huebeText ? `<div class="ms-hinweis"><b>Hübe: ${esc(r.huebeText)}</b>${r.dauerText ? ` · Messdauer ${esc(r.dauerText)} s` : ''}</div>` : '';
    const wertFeld = !r.qualitativ;
    const ergHtml = `<div class="ms-erg" role="group" aria-label="Ergebnis">
        <button type="button" class="knopf" data-erg="nein" aria-pressed="${!!(e && !e.anzeige)}">${ICON.kreuz}${r.sensor ? 'Keine Anzeige' : 'Keine Verfärbung'}</button>
        ${r.farben ? r.farben.map(f => `<button type="button" class="knopf" data-erg="ja" data-farbe="${esc(f)}" aria-pressed="${!!(e && e.anzeige && e.farbe === f)}"><i style="display:inline-block;width:1rem;height:1rem;border-radius:.2rem;background:${farbe(f)}"></i>Verfärbung ${esc(f)}</button>`).join('')
          : r.qualitativ ? `<button type="button" class="knopf" data-erg="ja" aria-pressed="${!!(e && e.anzeige)}">${ICON.haken}Verfärbung</button>` : ''}
        ${wertFeld ? `<label class="wert"><span>${r.sensor ? 'Messwert' : 'Abgelesen'}</span><input inputmode="decimal" autocomplete="off" data-wert placeholder="Wert" value="${e && e.anzeige && e.wert !== undefined && e.wert !== null ? esc(String(e.wert).replace('.', ',')) : ''}" aria-label="Abgelesener Wert in ${esc(r.einheit || 'ppm')}"><span>${esc(r.einheit || 'ppm')}</span></label>
          <button type="button" class="knopf los" data-erg="wert">${ICON.haken}Übernehmen</button>` : ''}</div>`;
    const bewHtml = bew ? `<div class="ms-bew" style="--c:${farb[0]}"><span class="ms-schild" style="--c-voll:${farb[1]}">${esc(bew.stufe === 'unter' || bew.stufe === 'etw4' || bew.stufe === 'etw1' ? STUFE[bew.stufe][2] : STUFE[bew.stufe] ? STUFE[bew.stufe][2] : '')}</span>
        <b>${esc(ergebnisText(r, e))}</b><span>${esc(bew.text || '')}</span>${bew.bereich ? `<span class="ms-hinweis" style="flex-basis:100%"><b>Hinweis:</b> ${esc(bew.bereich)}</span>` : ''}</div>` : '';
    return `<div class="ms-r" data-roehrchen="${esc(k)}">
      <div class="ms-r-kopf">${r.nr ? `<span class="nr">${r.nr}</span>` : ''}<div><h3>${esc(r.name)}${opt.titelZusatz ? ` <small style="font-weight:400;color:var(--ink2)">${esc(opt.titelZusatz)}</small>` : ''}</h3>
        <div class="etw">${r.quer ? `Nachweis von ${esc(r.quer)} über Querempfindlichkeit – nur qualitativ` : r.qualitativ ? 'qualitativer Test' : r.sensor ? esc(r.sensor) + ' · ' + etwText(r) : etwText(r)}${r.bestellnr ? ` · Best.-Nr. ${esc(r.bestellnr)}` : ''}</div></div><div class="ms-tags">${tags}</div></div>
      ${bildHtml(r)}${umschlagHtml(r.umschlag)}
      ${stufenHtml}${zaehlerHtml}
      ${opt.quer ? '' : querHtml(r)}
      ${ergHtml}${bewHtml}
      ${r.folgeText && e && e.anzeige ? `<div class="ms-folge">${ICON.pfeil} ${esc(r.folgeText)}</div>` : ''}</div>`;
  }
  // Ereignisse einer Ansicht mit Röhrchen-Karten (Delegation); finde(k) -> { r, e, setzen(neu) }
  function kartenBedienen(el, finde, neuZeichnen) {
    el.addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t) return;
      const karte = t.closest('[data-roehrchen]'); if (!karte) return;
      const k = karte.dataset.roehrchen, f = finde(k); if (!f) return;
      if (t.dataset.huebe) { f.setzen({ ...(f.e || { anzeige: null }), huebe: Number(t.dataset.huebe) }, true); return; }
      if (t.dataset.hub || t.dataset.hubMinus || t.dataset.hubNull) {
        const z = zaehler.get(k) || { n: 0, start: 0 };
        if (t.dataset.hub) { if (!z.start) z.start = Date.now(); z.n++; if (navigator.vibrate) try { navigator.vibrate(18); } catch { /* egal */ } }
        else if (t.dataset.hubMinus) z.n = Math.max(0, z.n - 1);
        else { z.n = 0; z.start = 0; }
        zaehler.set(k, z);
        const ziel = Number((f.e && f.e.huebe) || f.huebe || 0);
        if (ziel && z.n === ziel && navigator.vibrate) try { navigator.vibrate([60, 60, 60]); } catch { /* egal */ }
        neuZeichnen(k, 'data-hub' + (t.dataset.hub ? '' : t.dataset.hubMinus ? '-minus' : '-null'));
        return;
      }
      if (t.dataset.erg) {
        const huebe = Number((f.e && f.e.huebe) || f.huebe || 0) || null;
        if (t.dataset.erg === 'nein') f.setzen({ anzeige: false, huebe, zeit: Date.now() });
        else if (t.dataset.erg === 'ja') f.setzen({ anzeige: true, farbe: t.dataset.farbe || '', huebe, zeit: Date.now() });
        else { const w = karte.querySelector('[data-wert]').value; if (M.zahl(w) === null) { meldung('Bitte den abgelesenen Wert eingeben (Zahl).', 3500); return; }
          f.setzen({ anzeige: M.zahl(w) > 0, wert: M.zahl(w), huebe, zeit: Date.now() }); }
      }
    });
    el.addEventListener('keydown', ev => { const i = ev.target.closest('[data-wert]'); if (i && ev.key === 'Enter') { ev.preventDefault(); i.closest('.ms-erg').querySelector('[data-erg="wert"]').click(); } });
  }
  // Zeitanzeige der laufenden Zähler
  setInterval(() => { for (const zEl of document.querySelectorAll('[data-zaehler]')) { const z = zaehler.get(zEl.dataset.zaehler); const s = zEl.querySelector('[data-zeit]');
    if (z && z.start && s) s.textContent = dauer(Math.round((Date.now() - z.start) / 1000)); } }, 1000);

  // ---------------------------------------------------------------- Kopf einer Messung: Ort, Höhe, Trupp, Mehrgasmessgerät
  const HOEHE = [['boden', 'Bodennähe'], ['150', 'ca. 1,50 m'], ['decke', 'unter der Raumdecke']];
  function kopfHtml(m, { pid = true } = {}) {
    const mg = m.mehrgas || {};
    return `<section class="kachel ez-karte" id="ms-kopf"><h2>Messung</h2>
      <div class="ms-kopfzeile"><label class="ms-feld">Messort<input data-feld="ort" value="${esc(m.ort || '')}" placeholder="z. B. 20 m in Windrichtung" autocomplete="off"></label>
        <label class="ms-feld">Messtrupp<input data-feld="trupp" value="${esc(m.trupp || '')}" placeholder="z. B. Trupp 1" autocomplete="off"></label></div>
      <div style="margin-top:.55rem"><div class="ms-hinweis" style="margin-bottom:.3rem">Höhe der Messung</div><div class="ms-seg" role="group" aria-label="Höhe der Messung">${HOEHE.map(([id, t]) =>
        `<button type="button" data-hoehe="${id}" aria-pressed="${m.hoehe === id}">${t}</button>`).join('')}</div></div>
      <h2 style="margin-top:1rem">Mehrgasmessgerät${pid ? ' und PID' : ''}</h2>
      <div class="ms-kopfzeile">${M.MEHRGAS.filter(k => pid || k.id !== 'pid').map(k => { const v = M.zahl(mg[k.id]); const w = v !== null && k.warn(v);
        return `<label class="ms-feld${w ? ' warn' : ''}">${k.name} (${k.einheit})<input inputmode="decimal" data-mehrgas="${k.id}" value="${mg[k.id] !== undefined && mg[k.id] !== null ? esc(String(mg[k.id]).replace('.', ',')) : ''}" autocomplete="off"><small>${w ? esc(k.warnText) : ''}</small></label>`; }).join('')}</div>
      <div class="ms-hinweis">Während der Messung kontinuierlich auf Ex/OX prüfen und ggf. Maßnahmen ergreifen.</div>
      ${bericht() ? `<div class="ez-aktionen"><button type="button" class="knopf" data-mehrgas-doku>${ICON.doku}Mehrgaswerte ins Einsatztagebuch</button></div>` : ''}</section>`;
  }
  function kopfBedienen(el, m, neu) {
    el.addEventListener('input', ev => {
      const f = ev.target.closest('[data-feld]'); if (f) { m[f.dataset.feld] = f.value; sichern(); return; }
      const g = ev.target.closest('[data-mehrgas]');
      if (g) { m.mehrgas = m.mehrgas || {}; m.mehrgas[g.dataset.mehrgas] = g.value.trim() === '' ? null : g.value.trim(); sichern();
        const k = M.MEHRGAS.find(x => x.id === g.dataset.mehrgas), v = M.zahl(g.value), w = !!(k && v !== null && k.warn(v)), feld = g.closest('.ms-feld');
        feld.classList.toggle('warn', w); feld.querySelector('small').textContent = w ? k.warnText : ''; }
    });
    el.addEventListener('change', ev => { if (ev.target.closest('[data-mehrgas]')) neu(); });
    el.addEventListener('click', ev => {
      const h = ev.target.closest('[data-hoehe]'); if (h) { m.hoehe = m.hoehe === h.dataset.hoehe ? '' : h.dataset.hoehe; sichern(); neu(); return; }
      if (ev.target.closest('[data-mehrgas-doku]')) {
        const b = bericht(); if (!b) return;
        const werte = {}; for (const k of b.KANAL) werte[k.id] = M.zahl((m.mehrgas || {})[k.id]);
        if (Object.values(werte).every(v => v === null) && M.zahl((m.mehrgas || {}).pid) === null) { meldung('Noch keine Messwerte eingetragen.', 3000); return; }
        b.einsatz.messungen.unshift({ zeit: Date.now(), werte, extra: M.zahl((m.mehrgas || {}).pid) !== null ? `PID ${zt(M.zahl(m.mehrgas.pid))} ppm` : '', ort: ortText(m) });
        b.eintragen(`Messung Mehrgasmessgerät${m.ort ? ' (' + m.ort + ')' : ''} übernommen`, 'messung');
        try { localStorage.setItem('gsz-einsatz-aktiv', JSON.stringify(b.einsatz)); } catch { /* voll */ }
        meldung('Mehrgaswerte ins Einsatztagebuch übernommen.', 3000);
      }
    });
  }
  const ortText = m => [m.ort, (HOEHE.find(h => h[0] === m.hoehe) || [])[1], m.trupp].filter(Boolean).join(' · ');
  function ergebnisInsTagebuch(m, r, e, zusatz = '') {
    const b = bewertungVon(r, e);
    tagebuch(`Röhrchen ${r.nr ? 'Nr. ' + r.nr + ' ' : ''}${r.name}${e.huebe ? ', ' + e.huebe + (e.huebe === 1 ? ' Hub' : ' Hübe') : ''}: ${ergebnisText(r, e)}${b && b.text && e.anzeige ? ' – ' + b.text : ''}${zusatz}${ortText(m) ? ' · ' + ortText(m) : ''}`);
  }

  // ---------------------------------------------------------------- Ansicht #messen
  const el = E.ansichtElement('messenansicht');
  let unterseite = '';
  const neu = kopfOpt => { el.innerHTML = ''; el.appendChild(E.kopf(kopfOpt)); const c = document.createElement('div'); c.className = 'ms-inhalt'; el.appendChild(c); return c; };
  function zeigen(param) {
    const teile = String(param || '').split('/').map(decodeURIComponent);
    unterseite = teile[0] || '';
    if (unterseite === 'unbekannt') return unbekanntZeigen();
    if (unterseite === 'brand') return brandZeigen();
    if (unterseite === 'bekannt') return bekanntZeigen(teile[1] || '');
    if (unterseite === 'protokoll') return protokollZeigen();
    if (unterseite === 'roehrchen') return roehrchenSeite(teile[1] || '', teile[2] || '');
    if (unterseite === 'simultan') return simultanZeigen();
    startZeigen();
  }
  function startZeigen() {
    const c = neu({ titel: 'Messen', unter: 'Prüfröhrchen nach Dräger-Messstrategie', eltern: 'start' });
    const letzte = daten.messungen.find(x => x.id === daten.aktiv && !x.ende);
    c.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Lage wählen</h2>
      <div class="ms-lagen">
        <a class="ms-lage" href="#messen/unbekannt" style="--c:var(--ser)">${ICON.frage}<b>Unbekannter Gefahrstoff</b><span>Geführter Ablauf Blatt A–E: Säuretest bzw. pH, dann Röhrchen nach Anzeige</span><span class="pf">›</span></a>
        <a class="ms-lage" href="#messen/brand" style="--c:var(--crit)">${ICON.feuer}<b>Brand</b><span>Mehrgasmessgerät, Simultantest (Leitsubstanzen bzw. Set I), Einzelröhrchen</span><span class="pf">›</span></a>
        <a class="ms-lage" href="#messen/bekannt" style="--c:var(--akzent)">${ICON.stoff}<b>Bekannter Gefahrstoff</b><span>44 Stoffe der ETW-Liste: passendes Röhrchen, Hübe, Anzeige von Sensoren</span><span class="pf">›</span></a>
        <a class="ms-lage" href="#messen/simultan" style="--c:var(--ink2)">${ICON.roehrchen}<b>Simultantest-Sets</b><span>Was misst welches Set: Kanäle, Markierungen, Bewertung gegen ETW</span><span class="pf">›</span></a>
      </div>
      ${letzte && letzte.lage !== 'einzel' ? `<div class="ez-aktionen"><a class="knopf" href="#messen/${letzte.lage || 'unbekannt'}">${ICON.pfeil}Laufende Messung fortsetzen (${esc(letzte.lage === 'brand' ? 'Brand' : letzte.lage === 'bekannt' ? 'bekannter Stoff' : 'unbekannter Stoff')}, seit ${uhr(letzte.beginn)})</a>
        <a class="knopf" href="#messen/protokoll">${ICON.doku}Protokoll</a></div>` : daten.messungen.length ? `<div class="ez-aktionen"><a class="knopf" href="#messen/protokoll">${ICON.doku}Protokoll der Messungen</a></div>` : ''}
    </section>
    <section class="kachel ez-karte" id="ms-was-karte"><h2>Was soll gemessen werden?</h2>
      <label class="ms-feld">Stoff oder Stoffgruppe – findet auch Röhrchen über Querempfindlichkeiten<input id="ms-was" type="search" placeholder="z. B. Diesel, Butanon, Xylol, Methanol, 1005" autocomplete="off"></label>
      <div id="ms-was-erg"></div></section>
    <section class="kachel ez-karte"><h2>Grundsätze</h2><ul class="ez-zeilen">${M.HINWEISE.map(h => `<li data-z="•">${esc(h)}</li>`).join('')}</ul>
      <div class="ez-klein" style="margin-top:.5rem">${esc(M.QUELLE)}. Maßgeblich sind Aufdruck und Gebrauchsanweisung des jeweiligen Röhrchens.</div></section>`);
    const was = c.querySelector('#ms-was'), erg = c.querySelector('#ms-was-erg');
    let t = null;
    was.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { erg.innerHTML = suchErgebnisHtml(was.value); }, 150); });
  }
  // ---------------------------------------------------------------- Suche: Stoffblatt, Röhrchen über Querempfindlichkeit, Simultantest, „wird nicht angezeigt“
  const stoffPasst = (s, q) => { const n = q.toLowerCase().trim(); if (!n) return false;
    return s.un.includes(n) || s.cas.includes(n) || s.name.toLowerCase().split(/[^a-zäöüß0-9]+/).some(w => w.length && w.startsWith(n)); };
  const roehrchenSchluessel = e => e.nr ? 'nr' + e.nr : 's' + e.s;
  function suchErgebnisHtml(q) {
    const n = String(q || '').trim(); if (n.length < 3) return '';
    const st = STOFFE.filter(s => stoffPasst(s, n)).slice(0, 6);
    const x = M.quersuche(n);
    const haupt = new Set(st.flatMap(s => s.roehrchen.map(rr => rr.name)));
    const direkt = x.direkt.filter(e => !haupt.has(e.r)), gruppe = x.gruppe.filter(e => !haupt.has(e.r));
    const knopf = (e, stoff) => e.nr === 5 ? '' : `<a class="knopf" href="#messen/roehrchen/${roehrchenSchluessel(e)}/${encodeURIComponent(stoff)}">${ICON.roehrchen}Mit diesem Röhrchen messen</a>`;
    const teil = [];
    if (st.length) teil.push(`<div class="ms-gruppe">Stoffblatt (eigenes Röhrchen)</div><ul class="ms-treffer">${st.map(s => `<li><div class="kopf"><b>${esc(s.name)}</b><small>UN ${esc(s.un)} · ETW-4 ${s.etw4 !== null ? zt(s.etw4) + ' ppm' : '–'}</small></div>
      <small>${esc(s.roehrchen.map(rr => rr.name).join(', '))}</small><a class="knopf" href="#messen/bekannt/${encodeURIComponent(s.cas.split(' ')[0])}">${ICON.pfeil}Stoffblatt und Röhrchen</a></li>`).join('')}</ul>`);
    if (direkt.length) teil.push(`<div class="ms-gruppe">Wird ausdrücklich angezeigt (Querempfindlichkeit)</div><ul class="ms-treffer">${direkt.map(e => `<li><div class="kopf"><b>${e.nr ? 'Nr. ' + e.nr + ' · ' : ''}${esc(e.r)}</b><small>${e.s ? 'Stoffblatt S. ' + e.s : 'Messstrategie'}</small></div>
      <span>${esc(e.treffer.map(stoffText_).join(', '))}: ${esc(e.wie)}</span>${knopf(e, e.treffer[0])}</li>`).join('')}</ul>`);
    if (gruppe.length) teil.push(`<div class="ms-gruppe">Über die Stoffgruppe${x.gruppen.length ? ' (' + esc(x.gruppen.map(stoffText_).join(', ')) + ')' : ''} – Empfindlichkeit unterschiedlich, nur Hinweis</div><ul class="ms-treffer">${gruppe.map(e => `<li><div class="kopf"><b>${e.nr ? 'Nr. ' + e.nr + ' · ' : ''}${esc(e.r)}</b><small>${e.s ? 'Stoffblatt S. ' + e.s : 'Messstrategie'}</small></div>
      <span>${esc(e.treffer.map(stoffText_).join(', '))}: ${esc(e.wie)}</span>${knopf(e, n)}</li>`).join('')}</ul>`);
    if (x.sets.length) teil.push(`<div class="ms-gruppe">Simultantest</div><ul class="ms-treffer">${x.sets.map(t => `<li><div class="kopf"><b>${esc(t.set.name)}</b><small>${t.ueberGruppe ? 'über die Stoffgruppe' : 'Kanal'}</small></div>
      <span>${esc(t.kanal.name)}: ${t.kanal.marken.filter(v => v !== null).map(v => zt(v) + ' ppm').join(' / ')}</span><a class="knopf" href="#messen/simultan">${ICON.pfeil}Simultantest-Übersicht</a></li>`).join('')}</ul>`);
    if (x.nicht.length) teil.push(`<div class="ms-gruppe">Wird ausdrücklich nicht angezeigt</div><ul class="ms-treffer">${x.nicht.map(e => `<li><div class="kopf"><b>${esc(e.r)}</b><small>${e.s ? 'Stoffblatt S. ' + e.s : 'Messstrategie'}</small></div><span>${esc(e.text)}</span></li>`).join('')}</ul>`);
    return teil.length ? teil.join('') + '<div class="ez-klein" style="margin-top:.6rem">Querempfindlichkeit heißt: Das Röhrchen verfärbt sich, die Skala gilt aber für seinen Hauptstoff – das Ergebnis ist ein Hinweis, keine Konzentration. Möglichst mit einer zweiten Methode bestätigen.</div>'
      : '<div class="ez-leer" style="margin-top:.5rem">Kein Röhrchen der Messstrategie zeigt diesen Stoff laut Unterlagen an. Polytest (Nr. 3) und PID können bei vielen organischen Stoffen einen Hinweis geben.</div>';
  }
  // ---------------------------------------------------------------- einzelnes Röhrchen (aus der Suche), auf Wunsch für einen Stoff über Querempfindlichkeit
  function roehrchenVon(key) {
    if (/^nr\d+$/.test(key)) { const r = M.roehrchen(key.slice(2)); return r ? { ...r, seite: M.BILD_SEITE[r.nr] } : null; }
    if (/^s\d+$/.test(key)) { const st = STOFFE.find(x => x.seite === Number(key.slice(1))); return st ? { ...roehrchenAusStoff(st, st.roehrchen[0]), stoffblatt: st } : null; }
    return null;
  }
  function roehrchenSeite(key, quer) {
    const r0 = roehrchenVon(key);
    const c = neu({ titel: r0 ? r0.name : 'Röhrchen', unter: quer ? `Messen · ${quer} über Querempfindlichkeit` : 'Messen · Röhrchen', eltern: 'messen' });
    if (!r0) { c.insertAdjacentHTML('beforeend', '<section class="kachel ez-karte"><div class="ez-leer">Röhrchen nicht gefunden.</div></section>'); return; }
    const m = aktiveMessung('einzel'); m.querErg = m.querErg || {};
    const k = key + '|' + quer, e = m.querErg[k];
    const qe = quer ? M.QUER.filter(x => (r0.nr && x.nr === r0.nr) || x.r === r0.name).find(x => x.stoffe.some(sx => sx.toLowerCase() === quer.toLowerCase())) || M.QUER.find(x => (r0.nr && x.nr === r0.nr) || x.r === r0.name) : null;
    const r = quer ? { ...r0, qualitativ: true, quer, umschlag: qe && qe.farbe ? [(Array.isArray(r0.umschlag) ? r0.umschlag[0] : String(r0.umschlag || '').split('→')[0].trim()), qe.farbe] : r0.umschlag, querFarbe: qe && qe.farbe } : r0;
    c.insertAdjacentHTML('beforeend', `${quer ? `<div class="ms-warn" style="border-left-color:var(--akzent);background:var(--akzent-t, rgba(92,157,245,.14));margin-bottom:.8rem">
        <b>${esc(quer)}</b> wird von ${esc(r0.name)} angezeigt${qe ? ': ' + esc(qe.wie) : ''}. Die Skala gilt für ${esc(r0.stoff || r0.name.replace(/ [\d,%/a-d]+$/, ''))} – das Ergebnis ist nur ein Hinweis (Verfärbung ja/nein), keine Konzentration von ${esc(quer)}. Möglichst mit einer zweiten Methode bestätigen.${qe && qe.s ? ` <span class="ez-klein">Quelle: Stoffblatt S. ${qe.s}.</span>` : ''}</div>` : ''}
      ${kopfHtml(m, { pid: true })}
      <section class="kachel ez-karte" id="ms-messen"><h2>Messen</h2>${roehrchenKarte(r, e, { schluessel: 'q', quer })}</section>
      ${r0.stoffblatt ? `<div class="ez-aktionen"><a class="knopf" href="#messen/bekannt/${encodeURIComponent(r0.stoffblatt.cas.split(' ')[0])}">${ICON.pfeil}Stoffblatt ${esc(kurz(r0.stoffblatt))}</a></div>` : ''}`);
    kopfBedienen(c, m, () => {});
    kartenBedienen(c, () => ({ r, e: m.querErg[k], huebe: (r.stufen.find(x => x.empf) || r.stufen[0] || {}).n, setzen(neu, nurHuebe) { m.querErg[k] = { ...neu, roehrchen: r0.name, quer }; sichern();
      if (!nurHuebe && typeof neu.anzeige === 'boolean') ergebnisInsTagebuch(m, r, neu, quer ? ` (auf ${quer} über Querempfindlichkeit)` : ''); roehrchenSeite(key, quer); } }),
      (kk, knopf) => { roehrchenSeite(key, quer); const b = el.querySelector(`[data-roehrchen="${kk}"] [${knopf}]`); if (b) b.focus(); });
    bilderLaden(c);
  }
  // ---------------------------------------------------------------- Übersicht: was misst welches Simultantest-Set
  function simultanZeigen() {
    const c = neu({ titel: 'Simultantest-Sets', unter: 'Messen · was misst welches Set', eltern: 'messen' });
    const IDX = { set1: 0, set2: 1, set3: 2, leit: 3 };
    const zweck = s => s.begasung ? 'Begasung (Container, Laderäume)' : s.brand ? 'Brand – nach dem Brand-Blatt der Messstrategie' : 'Brände und Unfälle – ergänzend';
    const marke = (kn, i) => { const v = kn.marken[i]; if (v === null || v === undefined) return '–'; const b = M.kanalBewerten(kn, i + 1);
      return `${zt(v)} ppm${b && b.stufe !== 'unter' ? `<br><small style="color:${b.stufe === 'etw1' ? 'var(--crit)' : 'var(--ser)'}">${b.stufe === 'etw1' ? 'ab ETW-1' : 'ab ETW-4'}</small>` : b ? '<br><small style="color:var(--good)">unter ETW-4</small>' : ''}`; };
    c.insertAdjacentHTML('beforeend', `${bildDa('Simultantest-Set.jpg') ? `<section class="kachel ez-karte"><h2>Simultantest-Set</h2><img class="ms-set-bild" data-rbild="${BILD_ORDNER}Simultantest-Set.jpg" alt="Dräger-Simultantest-Set mit Halter und Schlauch">
        <div class="ms-hinweis" style="margin-top:.4rem">Fünf Röhrchen werden gleichzeitig über einen Halter mit der Pumpe durchströmt. Abgelesen wird je Röhrchen, ob die 1. bzw. 2. Markierung erreicht ist. Foto: Dräger.</div></section>` : ''}
      ${M.SETS.map(s => { const i = IDX[s.id]; const auch = i === undefined ? [] : STOFFE.filter(x => /^ja/i.test(x.simultan[i] || '')).map(kurz);
        const art = s.begasung ? ['Begasung', 'var(--grau-voll, #5f6873)'] : s.brand ? ['Brand', 'var(--crit-voll, #c62828)'] : ['Brände und Unfälle', 'var(--ser-voll, #c2410c)'];
        return `<section class="kachel ez-karte ms-set" style="--c:${art[1]}"><div class="ms-set-kopf"><h2>${esc(s.name)}</h2>
            <span class="ms-schild" style="--c-voll:${art[1]}">${esc(art[0])}</span><span class="ms-schild" style="--c-voll:var(--grau-voll, #5f6873)">${s.huebe ? s.huebe + ' Hübe' : 'Hübe laut Anleitung'}</span></div>
          <div class="ms-hinweis" style="margin-bottom:.5rem">${esc(zweck(s))}${s.hinweis ? ' · ' + esc(s.hinweis) : ''}</div>
          <table class="ms-set-tab"><tr><th>Kanal</th><th>1. Marke</th><th>2. Marke</th><th>ETW-4 / ETW-1</th></tr>
          ${s.kanaele.map(kn => `<tr><td><b>${esc(kn.name)}</b>${kn.anm ? `<br><small class="ez-klein">${esc(kn.anm)}</small>` : ''}</td><td class="z">${marke(kn, 0)}</td><td class="z">${marke(kn, 1)}</td>
            <td class="z">${kn.etw4 !== null && kn.etw4 !== undefined ? zt(kn.etw4) : '–'} / ${kn.etw1 !== null && kn.etw1 !== undefined ? zt(kn.etw1) : '–'} ppm</td></tr>`).join('')}</table>
          ${auch.length ? `<div class="ms-hinweis" style="margin-top:.5rem"><b>Laut Stoffblättern zeigt das Set von den 44 ETW-Stoffen an:</b> ${esc(auch.join(', '))}.</div>` : ''}
          ${s.brand && !s.begasung ? `<div class="ez-aktionen"><a class="knopf" href="#messen/brand">${ICON.feuer}Bei Brand messen</a></div>` : ''}</section>`; }).join('')}
      <div class="ez-klein">Markierungen nach Dräger-Produktinformation Simultantest-Sets (2025); ETW nach vfdb-RL 10/01 (2023). Für Set II, III und die Begasungs-Sets nennen die Unterlagen keine Hubzahl – Gebrauchsanweisung des Sets beachten.</div>`);
    bilderLaden(c);
  }

  // ---------------------------------------------------------------- unbekannter Gefahrstoff
  function unbekanntZeigen(fokus) {
    const m = aktiveMessung('unbekannt');
    const p = M.plan(m);
    const c = neu({ titel: 'Unbekannter Gefahrstoff', unter: 'Messen · Blatt A–E', eltern: 'messen' });
    const pos = nr => !!(m.erg[nr] && m.erg[nr].anzeige === true), da = nr => !!(m.erg[nr] && typeof m.erg[nr].anzeige === 'boolean');
    const blattFertig = b => b === 'A' ? m.fluessig !== null && (m.fluessig ? !!m.ph : da(1)) : M.BLATT[b].nr.filter(n => p.schritte.some(s => s.nr === n)).every(da);
    const aktB = p.naechste.art === 'roehrchen' ? (p.schritte.find(s => s.nr === p.naechste.nr) || {}).blatt : p.naechste.art.startsWith('frage') ? 'A' : '';
    const schritteHtml = `<ol class="ms-schritte" aria-label="Messblätter">${['A', 'B', 'C', 'D', 'E'].filter(b => p.blaetter.includes(b)).map(b =>
      `<li class="${b === aktB ? 'an' : blattFertig(b) ? 'fertig' : ''}">${blattFertig(b) && b !== aktB ? ICON.haken.replace('<svg', '<svg style="width:1em;height:1em"') : ''}Blatt ${b}</li>`).join('')}${p.naechste.art === 'fertig' ? '<li class="fertig">Auswertung</li>' : ''}</ol>`;
    // Fragen von Blatt A
    const frageHtml = `<div class="ms-hinweis"><b>Flüssigkeit oder Spuren von Flüssigkeit sichtbar?</b></div>
      <div class="ms-frage"><button type="button" data-fluessig="ja" aria-pressed="${m.fluessig === true}"><i style="--f:#5b8fd6"></i><span>Ja<small>Universalindikator-Papier eintauchen</small></span></button>
        <button type="button" data-fluessig="nein" aria-pressed="${m.fluessig === false}"><i style="--f:#c9ced6"></i><span>Nein – gasförmiger Stoff / Dampf<small>weiter mit Nr. 1 Säuretest</small></span></button></div>
      ${m.fluessig ? `<div class="ms-hinweis" style="margin-top:.7rem"><b>Universalindikator-Papier: Verfärbung?</b></div>
      <div class="ms-frage"><button type="button" data-ph="sauer" aria-pressed="${m.ph === 'sauer'}"><i style="--f:linear-gradient(135deg,#ef8a2c,#d23a2e)"></i><span>pH &lt; 7 · orange/rot<small>weiter auf Blatt B</small></span></button>
        <button type="button" data-ph="neutral" aria-pressed="${m.ph === 'neutral'}"><i style="--f:linear-gradient(135deg,#f0d23c,#3f9b4a)"></i><span>pH ≈ 7 · gelb/grün<small>weiter auf Blatt C</small></span></button>
        <button type="button" data-ph="basisch" aria-pressed="${m.ph === 'basisch'}"><i style="--f:linear-gradient(135deg,#2f6fd6,#7a49b5)"></i><span>pH &gt; 7 · blau/violett<small>weiter auf Blatt C</small></span></button></div>` : ''}`;
    const zeile = (s, i) => {
      const r = M.roehrchen(s.nr), e = m.erg[s.nr], jetzt = p.naechste.nr === s.nr, offen = jetzt || fokus === s.nr;
      const b = bewertungVon(r, e), f = b ? STUFE[b.stufe] : null;
      return `<li class="${jetzt ? 'jetzt' : ''}" data-schritt="${s.nr}"><button type="button" class="zeile" data-auf="${s.nr}" aria-expanded="${offen}" style="--c:${f ? f[0] : jetzt ? 'var(--akzent)' : 'var(--line)'}">
        <span class="nr">Nr. ${s.nr}</span><span><b>${esc(r.name)}</b><small>${s.blatt === 'Folge' ? esc('Folgeröhrchen – ' + s.grund) : 'Blatt ' + s.blatt + (s.grund ? ' · ' + esc(s.grund) : '')}</small></span>
        <span class="stand" style="color:${f ? f[0] : 'var(--ink2)'}">${e ? esc(ergebnisText(r, e)) : jetzt ? 'jetzt messen' : 'offen'}</span></button>
        ${offen ? roehrchenKarte(r, e, { schluessel: 'u' }) : ''}</li>`;
    };
    const blattHinweise = p.blaetter.filter(b => M.BLATT[b] && (M.BLATT[b].hinweise || M.BLATT[b].ende)).map(b => [...(M.BLATT[b].hinweise || []), ...(M.BLATT[b].ende ? [M.BLATT[b].ende] : [])].map(t => `<li data-z="${b}">${esc(t)}</li>`).join('')).join('');
    c.insertAdjacentHTML('beforeend', `${kopfHtml(m)}
      <section class="kachel ez-karte" id="ms-ablauf"><h2>Ablauf</h2>${schritteHtml}
        ${frageHtml}
        ${p.schritte.length ? `<ol class="ms-ablauf" style="margin-top:.8rem">${p.schritte.map(zeile).join('')}</ol>` : ''}
        ${p.naechste.art === 'fertig' ? `<div class="ms-warn" style="margin-top:.8rem;border-left-color:var(--good);background:color-mix(in srgb,var(--good) 10%,var(--surface2))"><b>Ablauf abgeschlossen.</b> Zur Sicherheit sollten alle Röhrchen des Messkonzepts, mindestens alle des jeweiligen Blattes gemessen werden.</div>
          ${p.optional.length ? `<div class="ms-hinweis" style="margin-top:.6rem">Weitere Röhrchen des Messkonzepts:</div><div class="ms-seg" style="margin-top:.3rem">${p.optional.map(n => `<button type="button" data-zusatz="${n}">Nr. ${n} ${esc(M.roehrchen(n).name)}</button>`).join('')}</div>` : ''}` : ''}
        ${zusatzHtml(m)}
        ${blattHinweise ? `<details class="ez-mehr" style="margin-top:.7rem"><summary>Hinweise zu den Blättern</summary><div class="inhalt"><ul class="ez-zeilen">${blattHinweise}</ul></div></details>` : ''}
        <div class="ez-aktionen"><button type="button" class="knopf" data-neu>${ICON.neu}Neue Messung (anderer Ort/Zeitpunkt)</button><a class="knopf" href="#messen/protokoll">${ICON.doku}Protokoll</a></div></section>
      ${auswertungHtml(m)}`);
    kopfBedienen(c, m, () => { const a = el.querySelector('#ms-auswertung'); if (a) a.outerHTML = auswertungHtml(m); });
    c.addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.fluessig) { m.fluessig = t.dataset.fluessig === 'ja'; if (!m.fluessig) m.ph = null; sichern(); tagebuch(m.fluessig ? 'Messung: Flüssigkeit sichtbar – Universalindikator' : 'Messung: gasförmiger Stoff – Säuretest'); unbekanntZeigen(); return; }
      if (t.dataset.ph) { m.ph = t.dataset.ph; sichern(); tagebuch(`Messung: Universalindikator pH ${m.ph === 'sauer' ? '< 7 (orange/rot)' : m.ph === 'basisch' ? '> 7 (blau/violett)' : '≈ 7 (gelb/grün)'}`); unbekanntZeigen(); return; }
      if (t.dataset.auf) { const n = Number(t.dataset.auf); unbekanntZeigen(fokus === n ? undefined : n); return; }
      if (t.dataset.zusatz) { m.zusatz = [...new Set([...(m.zusatz || []), Number(t.dataset.zusatz)])]; sichern(); unbekanntZeigen(Number(t.dataset.zusatz)); return; }
      if (t.hasAttribute('data-neu')) { if (!confirm('Neue Messung beginnen? Die bisherige bleibt im Protokoll.')) return; m.ende = Date.now(); sichern(); aktiveMessung('unbekannt'); unbekanntZeigen(); }
    });
    const findeKarte = k => { const nr = Number(k.split('-').pop()); const r = M.roehrchen(nr); if (!r) return null;
      return { r, e: m.erg[nr], huebe: (r.stufen.find(s => s.empf) || {}).n, setzen(neu, nurHuebe) { m.erg[nr] = neu; sichern();
        if (!nurHuebe && typeof neu.anzeige === 'boolean') ergebnisInsTagebuch(m, r, neu);
        const vorher = M.plan(m);
        unbekanntZeigen(nurHuebe || (vorher.naechste.nr !== nr && neu.anzeige !== null && typeof neu.anzeige === 'boolean' ? undefined : nr));
        if (!nurHuebe && typeof neu.anzeige === 'boolean') { const n2 = M.plan(m).naechste; const ziel = n2.nr ? el.querySelector(`[data-schritt="${n2.nr}"]`) : el.querySelector('#ms-auswertung');
          if (ziel) ziel.scrollIntoView({ block: 'start', behavior: 'smooth' }); } } }; };
    kartenBedienen(c, findeKarte, (k, knopf) => { unbekanntZeigen(Number(k.split('-').pop())); const b = el.querySelector(`[data-roehrchen="${k}"] [${knopf}]`); if (b) b.focus(); });
    bilderLaden(c);
  }
  function auswertungHtml(m) {
    const aw = M.auswerten(m), mg = m.mehrgas || {}, ex = M.zahl(mg.ex), pid = M.zahl(mg.pid), xp = ex !== null && pid !== null ? M.exPid(ex > 0, pid > 0) : null;
    return `<section class="kachel ez-karte" id="ms-auswertung"><h2>Auswertung</h2>
        ${aw.length ? `<ul class="ms-auswertung">${aw.map(a => `<li class="${a.art}">${a.art === 'bestaetigt' ? '<b>Bestätigt:</b> ' : a.nr.length ? `<b>Hinweis auf</b> (Nr. ${a.nr.join(' + ')}): ` : ''}${esc(a.text)}</li>`).join('')}</ul>` : '<div class="ez-leer">Noch keine Anzeige.</div>'}
        ${xp ? `<div class="ms-hinweis" style="margin-top:.6rem"><b>${esc(xp.text)}:</b> ${esc(xp.stoffe.join(', '))}. ${esc(M.EX_PID_HINWEIS)}</div>` : '<div class="ms-hinweis" style="margin-top:.6rem">Ex- und PID-Wert oben eintragen: dann zeigt die Auswertung, welche Stoffe dazu passen.</div>'}
        <details class="ez-mehr" style="margin-top:.6rem"><summary>Untere Nachweisgrenzen des Polytest (5 Hübe)</summary><div class="inhalt"><dl class="ms-werte">${M.POLYTEST_GRENZEN.map(([s, w]) => `<div><dt>${esc(s)}</dt><dd>${zt(w)} ppm</dd></div>`).join('')}</dl>
          <div class="ms-hinweis" style="margin-top:.4rem">${esc(M.POLYTEST_NICHT)}</div></div></details></section>`;
  }
  function zusatzHtml(m) {
    const z = (m.zusatz || []).filter(n => !M.plan(m).schritte.some(s => s.nr === n));
    return z.length ? `<ol class="ms-ablauf" style="margin-top:.6rem">${z.map(n => { const r = M.roehrchen(n), e = m.erg[n];
      return `<li data-schritt="${n}"><button type="button" class="zeile" data-auf="${n}" style="--c:var(--line)"><span class="nr">Nr. ${n}</span><span><b>${esc(r.name)}</b><small>zusätzlich</small></span><span class="stand">${e ? esc(ergebnisText(r, e)) : 'offen'}</span></button>${roehrchenKarte(r, e, { schluessel: 'u' })}</li>`; }).join('')}</ol>` : '';
  }

  // ---------------------------------------------------------------- Brand
  function brandZeigen(fokus) {
    const m = aktiveMessung('brand');
    m.sets = m.sets || {}; m.setWahl = m.setWahl || 'leit';
    const c = neu({ titel: 'Messen bei Bränden', unter: 'Messen · Simultantest und Einzelröhrchen', eltern: 'messen' });
    const set = M.SETS.find(s => s.id === m.setWahl) || M.SETS[0];
    const werte = m.sets[set.id] || {};
    const k = 'brand-set-' + set.id, z = zaehler.get(k);
    const kanal = (kn, i) => { const w = werte[i], b = w !== undefined && w !== null ? M.kanalBewerten(kn, w) : null, f = b ? STUFE[b.stufe] : null;
      const knopf = (stufe, text) => `<button type="button" data-kanal="${i}" data-stufe="${stufe}" aria-pressed="${w === stufe}"${stufe && kn.marken[stufe - 1] === null ? ' disabled' : ''}>${text}</button>`;
      return `<div class="ms-kanal"><div><b>${esc(kn.name)}</b><div class="ms-hinweis">ETW-4 ${zt(kn.etw4)} · ETW-1 ${kn.etw1 !== null ? zt(kn.etw1) : '–'} ppm</div></div>
        <div class="ms-seg" role="group" aria-label="${esc(kn.name)}">${knopf(0, 'keine Anzeige')}${knopf(1, kn.marken[0] !== null ? `1. Marke<small>${zt(kn.marken[0])} ppm</small>` : '1. Marke<small>–</small>')}${knopf(2, kn.marken[1] !== null ? `2. Marke<small>${zt(kn.marken[1])} ppm</small>` : '2. Marke<small>–</small>')}</div>
        ${b ? `<div class="ms-bew" style="--c:${f[0]}"><span class="ms-schild" style="--c-voll:${f[1]}">${esc(f[2])}</span><span>${esc(b.text)}</span></div>` : ''}
        ${kn.anm ? `<div class="ms-hinweis" style="grid-column:1/-1">${esc(kn.anm)}</div>` : ''}</div>`; };
    const zaehlerHtml = `<div class="ms-zaehler${set.huebe && z && z.n >= set.huebe ? ' voll' : ''}" data-zaehler="${k}" style="--p:${set.huebe && z ? Math.min(100, Math.round(z.n / set.huebe * 100)) : 0}%">
      <div class="zahl"><span>${z ? z.n : 0}</span><small>${set.huebe ? ` / ${set.huebe} Hübe` : ' Hübe'}</small></div><div class="zeit"><span data-zeit>${z && z.start ? dauer(Math.round((Date.now() - z.start) / 1000)) : '–'}</span></div>
      <div class="balken" aria-hidden="true"><i></i></div>
      <div class="knoepfe"><button type="button" class="knopf ms-hub" data-set-hub>${ICON.plus}Hub gezählt</button><button type="button" class="knopf" data-set-hub-minus aria-label="Einen Hub zurück">${ICON.minus}</button><button type="button" class="knopf" data-set-hub-null>Neu</button></div>
      <div class="ms-hinweis" style="grid-column:1/-1">${set.huebe ? (z && z.n >= set.huebe ? '<b>Hubzahl erreicht – Markierungen ablesen.</b>' : 'Nach jedem Hub tippen.') : 'Hubzahl nach Gebrauchsanweisung des Sets.'}</div></div>`;
    c.insertAdjacentHTML('beforeend', `${kopfHtml(m, { pid: false })}
      <section class="kachel ez-karte" id="ms-set"><h2>Dräger-Simultantest</h2>
        <div class="ms-seg" role="group" aria-label="Simultantest-Set">${M.SETS.filter(s => !s.begasung).map(s => `<button type="button" data-set="${s.id}" aria-pressed="${s.id === set.id}">${esc(s.name.replace('Simultantest-', '').replace('Simultantest ', ''))}<small>${s.huebe ? s.huebe + ' Hübe' : 'Hübe laut Anleitung'}${s.brand ? ' · Brand-Blatt' : ''}</small></button>`).join('')}</div>
        <div class="ms-hinweis" style="margin:.5rem 0"><a href="#messen/simultan">Was misst welches Set?</a> · ${set.brand ? 'Bei Bränden nach der Messstrategie: Leitsubstanzen vfdb (20 Hübe) <b>oder</b> Set I (10 Hübe).' : 'Ergänzend, z. B. bei Verdacht auf weitere Brand- und Zersetzungsgase.'} ${set.hinweis ? esc(set.hinweis) : ''}</div>
        ${zaehlerHtml}
        <div style="margin-top:.6rem">${set.kanaele.map(kanal).join('')}</div></section>
      <section class="kachel ez-karte" id="ms-einzel"><h2>Dräger-Einzelröhrchen</h2><div class="ms-hinweis">Nach dem Brand-Blatt der Messstrategie mit diesen Hubzahlen.</div>
        ${M.BRAND_EINZEL.map(x => { const r = M.roehrchen(x.nr), e = (m.einzel || {})[x.nr];
          const extra = r.stufen.some(s => s.n === x.huebe) ? [] : [{ n: x.huebe, s: null, quelle: 'Brand-Blatt' }];
          return roehrchenKarte(r, e, { schluessel: 'b', huebe: x.huebe, extraStufen: extra, titelZusatz: `· Brand: ${x.huebe} Hübe` }); }).join('')}</section>
      <div class="ez-aktionen"><button type="button" class="knopf" data-neu>${ICON.neu}Neue Messung</button><a class="knopf" href="#messen/protokoll">${ICON.doku}Protokoll</a></div>`);
    kopfBedienen(c, m, () => {});
    c.addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.set) { m.setWahl = t.dataset.set; sichern(); brandZeigen(); return; }
      if (t.dataset.kanal !== undefined) { const i = Number(t.dataset.kanal), s = Number(t.dataset.stufe); m.sets[set.id] = m.sets[set.id] || {}; m.sets[set.id][i] = s; sichern();
        const kn = set.kanaele[i], b = M.kanalBewerten(kn, s); tagebuch(`Simultantest ${set.name.replace(/^Simultantest(-Set)? ?/, '')} · ${kn.name}: ${s ? s + '. Marke' : 'keine Anzeige'}${b ? ' – ' + b.text : ''}${ortText(m) ? ' · ' + ortText(m) : ''}`);
        brandZeigen(); const f = el.querySelector(`[data-kanal="${i}"][data-stufe="${s}"]`); if (f) f.focus(); return; }
      if (t.hasAttribute('data-set-hub') || t.hasAttribute('data-set-hub-minus') || t.hasAttribute('data-set-hub-null')) {
        const zz = zaehler.get(k) || { n: 0, start: 0 };
        if (t.hasAttribute('data-set-hub')) { if (!zz.start) zz.start = Date.now(); zz.n++; if (navigator.vibrate) try { navigator.vibrate(set.huebe && zz.n === set.huebe ? [60, 60, 60] : 18); } catch { /* egal */ } }
        else if (t.hasAttribute('data-set-hub-minus')) zz.n = Math.max(0, zz.n - 1); else { zz.n = 0; zz.start = 0; }
        zaehler.set(k, zz); brandZeigen(); const f = el.querySelector(t.hasAttribute('data-set-hub') ? '[data-set-hub]' : t.hasAttribute('data-set-hub-minus') ? '[data-set-hub-minus]' : '[data-set-hub-null]'); if (f) f.focus(); return; }
      if (t.hasAttribute('data-neu')) { if (!confirm('Neue Messung beginnen? Die bisherige bleibt im Protokoll.')) return; m.ende = Date.now(); sichern(); aktiveMessung('brand'); brandZeigen(); }
    });
    kartenBedienen(c, kk => { const nr = Number(kk.split('-').pop()), r = M.roehrchen(nr), x = M.BRAND_EINZEL.find(y => y.nr === nr); if (!r || !x) return null;
      return { r, e: (m.einzel || {})[nr], huebe: x.huebe, setzen(neu, nurHuebe) { m.einzel = m.einzel || {}; m.einzel[nr] = neu; sichern(); if (!nurHuebe && typeof neu.anzeige === 'boolean') ergebnisInsTagebuch(m, r, neu, ' (Brand)'); brandZeigen(); } }; },
      (kk, knopf) => { brandZeigen(); const b = el.querySelector(`[data-roehrchen="${kk}"] [${knopf}]`); if (b) b.focus(); });
    bilderLaden(c);
  }

  // ---------------------------------------------------------------- bekannter Gefahrstoff
  const kurz = s => s.name.replace(/\s*\(.*$/, '');
  const stoffVon = cas => STOFFE.find(s => s.cas.split(/\s*\/\s*/).includes(cas)) || null;
  const nfpaHtml = n => `<span title="NFPA 704: Gesundheit ${esc(n[0])}, Brand ${esc(n[1])}, Reaktion ${esc(n[2])}${n[3] ? ', ' + esc(n[3]) : ''}" style="display:inline-grid;grid-template-columns:repeat(3,1.6rem);gap:2px;font-weight:800;font-size:.85rem;text-align:center">
    <span style="background:#2457b3;color:#fff;border-radius:.2rem">${esc(n[0])}</span><span style="background:#c62828;color:#fff;border-radius:.2rem">${esc(n[1])}</span><span style="background:#f0d23c;color:#111;border-radius:.2rem">${esc(n[2])}</span></span>${n[3] ? ` <b>${esc(n[3])}</b>` : ''}`;
  function roehrchenAusStoff(s, rr) {
    if (rr.nr) { const r = M.roehrchen(rr.nr); return { ...r, bestellnr: rr.bestellnr || r.bestellnr, etw1: s.etw1, etw4: s.etw4, einheit: r.einheit, seite: s.seite }; }
    return { name: rr.name, bestellnr: rr.bestellnr, etw1: s.etw1, etw4: s.etw4, einheit: 'ppm', umschlag: rr.umschlag, stufen: rr.stufen || [], seite: s.seite,
      huebeText: rr.stufen && rr.stufen.length ? '' : rr.huebe, dauerText: rr.stufen && rr.stufen.length ? '' : rr.messdauer };
  }
  function bekanntZeigen(cas) {
    const s = cas ? stoffVon(cas) : null;
    const c = neu({ titel: s ? kurz(s) : 'Bekannter Gefahrstoff', unter: s ? `Messen · UN ${s.un} · CAS ${s.cas}` : 'Messen · 44 Stoffe der ETW-Liste', eltern: s ? 'messen/bekannt' : 'messen' });
    if (!s) {
      c.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Stoff wählen</h2>
        <label class="ms-feld">Suche (Name, UN- oder CAS-Nummer)<input id="ms-suche" type="search" placeholder="z. B. Ammoniak, 1005, 7664-41-7" autocomplete="off"></label>
        <ul class="ms-liste" id="ms-stoffe" style="margin-top:.6rem"></ul><div id="ms-bek-quer"></div>
        <div class="ez-klein" style="margin-top:.6rem">Stoffblätter der Dräger-Messstrategie 1.5 (Kapitel III); ETW nach vfdb-RL 10/01 (2023). Für andere Stoffe: Röhrchen nach Gebrauchsanweisung bzw. Dräger-Röhrchen-Handbuch.</div></section>`);
      const liste = el.querySelector('#ms-stoffe'), such = el.querySelector('#ms-suche');
      const fuellen = () => { const q = such.value.trim().toLowerCase();
        const t = STOFFE.filter(x => !q || x.name.toLowerCase().includes(q) || x.un.includes(q) || x.cas.includes(q));
        if (!t.length && q.length >= 3) liste.innerHTML = '<li class="ez-leer">Kein Stoffblatt – Röhrchen über Querempfindlichkeit:</li>';
        const quer = el.querySelector('#ms-bek-quer'); if (quer) quer.innerHTML = !t.length && q.length >= 3 ? suchErgebnisHtml(q) : '';
        if (!t.length && q.length >= 3) return;
        liste.innerHTML = t.map(x => `<li><a href="#messen/bekannt/${encodeURIComponent(x.cas.split(' ')[0])}"><span><b>${esc(x.name)}</b></span><small>UN ${esc(x.un)} · ${esc(x.roehrchen.map(r => r.name).join(', '))}</small></a></li>`).join('') || '<li class="ez-leer">Kein Stoff der Liste passt.</li>'; };
      such.addEventListener('input', fuellen); fuellen();
      return;
    }
    const m = aktiveMessung('bekannt');
    if (m.stoff !== s.cas) { m.stoff = s.cas; m.stoffErg = {}; sichern(); }
    const ja = v => /^ja/i.test(v || '');
    const zeile = (t, w) => w ? `<div><dt>${esc(t)}</dt><dd>${esc(w)}</dd></div>` : '';
    const anz = [['Polytest', s.polytest], ['Simultantest I', s.simultan[0]], ['Simultantest II', s.simultan[1]], ['Simultantest III', s.simultan[2]], ['Leitsubstanzen Brandrauch', s.simultan[3]],
      ['Dräger Smart PID', s.pid[0] + (ja(s.pid[0]) && s.pid[1] ? ' · ' + s.pid[1] : '')], ['Dräger PID HC', s.pid[2] + (ja(s.pid[2]) && s.pid[3] ? ' · ' + s.pid[3] : '')],
      ['Ex-Sensor katalytisch', s.ex[0]], ['Ex-Sensor infrarot', s.ex[1]], ['CatEx (Methan) bei 50 % UEG', s.catex[0]], ['CatEx (Nonan) bei 50 % UEG', s.catex[1]]];
    c.insertAdjacentHTML('beforeend', `
      ${s.anm.length ? `<div class="ms-warn" style="margin-bottom:.8rem">${s.anm.map(esc).join('<br>')}</div>` : ''}
      <section class="kachel ez-karte"><h2>Stoff</h2>
        <dl class="ms-werte">${zeile('ETW-1 (1 h)', s.etw1 !== null ? zt(s.etw1) + ' ppm' : 'nicht festgelegt')}${zeile('ETW-4 (4 h)', s.etw4 !== null ? zt(s.etw4) + ' ppm' : 'nicht festgelegt')}
          ${zeile('UEG', s.ueg)}${zeile('Gasdichte', s.gasdichte)}${zeile('Aggregatzustand', s.aggregat)}${zeile('Geruch', s.geruch)}${zeile('Flammpunkt', s.flammpunkt)}${zeile('Zündtemperatur', s.zuendtemperatur)}
          <div><dt>NFPA 704</dt><dd>${nfpaHtml(s.nfpa)}</dd></div></dl>
        ${ja(s.haut) || ja(s.gewoehnung) ? `<div class="ms-warn" style="margin-top:.6rem">${ja(s.haut) ? '<b>Hautresorptiv.</b> ' : ''}${ja(s.gewoehnung) ? '<b>Gefahr der Geruchsgewöhnung.</b>' : ''}</div>` : ''}</section>
      <section class="kachel ez-karte" id="ms-messen"><h2>Messen</h2>
        ${s.roehrchen.map((rr, i) => roehrchenKarte(roehrchenAusStoff(s, rr), (m.stoffErg || {})[i], { schluessel: 'k' + i })).join('')}
        ${s.messung ? `<div class="ms-hinweis" style="margin-top:.6rem"><b>Hinweise zur Messung:</b> ${esc(s.messung)}</div>` : ''}
        ${s.auswertung ? `<div class="ms-hinweis" style="margin-top:.4rem"><b>Hinweise zur Auswertung:</b> ${esc(s.auswertung)}</div>` : ''}</section>
      <section class="kachel ez-karte"><h2>Anzeige mit weiterer Messtechnik</h2><dl class="ms-werte">${anz.map(([t, w]) => zeile(t, w)).join('')}</dl>
        <div class="ms-hinweis" style="margin-top:.5rem">Ex-Sensoren zeigen erst ab sehr hohen Konzentrationen an, meist weit über dem ETW – zur Abschätzung der toxischen Gefahr immer Röhrchen verwenden. Sensoren können um ±30 % abweichen.</div>
        ${s.cms || s.microtube ? `<details class="ez-mehr" style="margin-top:.5rem"><summary>CMS-Chip und MicroTube</summary><div class="inhalt">${s.cms ? `<div><b>CMS-Chip</b> ${esc(s.cms)}</div>` : ''}${s.microtube ? `<div><b>MicroTube</b> ${esc(s.microtube)}</div>` : ''}</div></details>` : ''}
        <div class="ez-klein" style="margin-top:.5rem">Stoffblatt der Dräger-Messstrategie 1.5, S. ${s.seite}. ETW nach vfdb-RL 10/01 (2023).</div></section>`);
    kartenBedienen(c, k => { const i = Number(k.replace(/^k(\d+)-.*/, '$1')); const rr = s.roehrchen[i]; if (!rr) return null; const r = roehrchenAusStoff(s, rr);
      return { r, e: (m.stoffErg || {})[i], huebe: (r.stufen.find(x => x.empf) || r.stufen[0] || {}).n, setzen(neu, nurHuebe) { m.stoffErg = m.stoffErg || {}; m.stoffErg[i] = neu; sichern();
        if (!nurHuebe && typeof neu.anzeige === 'boolean') ergebnisInsTagebuch(m, r, neu, ' (' + kurz(s) + ')'); bekanntZeigen(cas); } }; },
      (k, knopf) => { bekanntZeigen(cas); const b = el.querySelector(`[data-roehrchen="${k}"] [${knopf}]`); if (b) b.focus(); });
    bilderLaden(c);
  }

  // ---------------------------------------------------------------- Protokoll
  function protokollZeilen(mm) {
    const z = [];
    if (mm.lage === 'unbekannt') {
      if (mm.fluessig !== null && mm.fluessig !== undefined) z.push(['Blatt A', mm.fluessig ? 'Flüssigkeit sichtbar' + (mm.ph ? ` – pH ${mm.ph === 'sauer' ? '< 7' : mm.ph === 'basisch' ? '> 7' : '≈ 7'}` : '') : 'gasförmig', '']);
      for (const [nr, e] of Object.entries(mm.erg || {})) { const r = M.roehrchen(nr); if (r && e && typeof e.anzeige === 'boolean') { const b = bewertungVon(r, e); z.push([`Nr. ${nr} ${r.name}${e.huebe ? ' · ' + e.huebe + ' H.' : ''}`, ergebnisText(r, e), b ? b.text : '', e.zeit]); } }
    } else if (mm.lage === 'brand') {
      for (const s of M.SETS) for (const [i, w] of Object.entries((mm.sets || {})[s.id] || {})) { const kn = s.kanaele[i], b = M.kanalBewerten(kn, w); z.push([`${s.name.replace(/^Simultantest(-Set)? ?/, '')}: ${kn.name}`, w ? w + '. Marke' : 'keine Anzeige', b ? b.text : '']); }
      for (const [nr, e] of Object.entries(mm.einzel || {})) { const r = M.roehrchen(nr); if (r && e && typeof e.anzeige === 'boolean') { const b = bewertungVon(r, e); z.push([`Nr. ${nr} ${r.name} · ${e.huebe || '?'} H.`, ergebnisText(r, e), b ? b.text : '', e.zeit]); } }
    } else if (mm.lage === 'einzel') {
      for (const [k, e] of Object.entries(mm.querErg || {})) { const r0 = roehrchenVon(k.split('|')[0]); if (!r0 || !e || typeof e.anzeige !== 'boolean') continue;
        const quer = k.split('|')[1]; const r = quer ? { ...r0, qualitativ: true, quer } : r0; const b = bewertungVon(r, e);
        z.push([`${r0.name}${quer ? ' auf ' + quer : ''}${e.huebe ? ' · ' + e.huebe + ' H.' : ''}`, ergebnisText(r, e), quer ? 'Querempfindlichkeit – nur Hinweis' : b ? b.text : '', e.zeit]); }
    } else if (mm.lage === 'bekannt') {
      const s = stoffVon(mm.stoff);
      if (s) for (const [i, e] of Object.entries(mm.stoffErg || {})) { const r = roehrchenAusStoff(s, s.roehrchen[i]); if (e && typeof e.anzeige === 'boolean') { const b = bewertungVon(r, e); z.push([`${kurz(s)}: ${r.name}${e.huebe ? ' · ' + e.huebe + ' H.' : ''}`, ergebnisText(r, e), b ? b.text : '', e.zeit]); } }
    }
    const mg = mm.mehrgas || {};
    const mgText = M.MEHRGAS.filter(k => M.zahl(mg[k.id]) !== null).map(k => `${k.name} ${zt(M.zahl(mg[k.id]))} ${k.einheit}`).join(' · ');
    if (mgText) z.unshift(['Mehrgasmessgerät', mgText, '']);
    return z;
  }
  function protokollZeigen() {
    const c = neu({ titel: 'Messprotokoll', unter: 'Messen', eltern: 'messen' });
    if (!daten.messungen.length) { c.insertAdjacentHTML('beforeend', '<section class="kachel ez-karte"><div class="ez-leer">Noch keine Messungen.</div></section>'); return; }
    c.insertAdjacentHTML('beforeend', daten.messungen.map(mm => { const z = protokollZeilen(mm);
      return `<section class="kachel ez-karte"><h2>${esc(mm.lage === 'brand' ? 'Brand' : mm.lage === 'einzel' ? 'Einzelne Röhrchen' : mm.lage === 'bekannt' ? 'Bekannter Stoff' + (stoffVon(mm.stoff) ? ': ' + kurz(stoffVon(mm.stoff)) : '') : 'Unbekannter Stoff')} · ${new Date(mm.beginn).toLocaleDateString('de-DE')} ${uhr(mm.beginn)}${mm.ende ? '–' + uhr(mm.ende) : ' (läuft)'}</h2>
        ${ortText(mm) ? `<div class="ms-hinweis" style="margin-bottom:.4rem">${esc(ortText(mm))}</div>` : ''}
        ${z.length ? `<table class="ms-proto"><tr><th>Messung</th><th>Ergebnis</th><th>Bewertung</th></tr>${z.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="w">${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</table>` : '<div class="ez-leer">Keine Ergebnisse.</div>'}
        ${!mm.ende ? `<div class="ez-aktionen"><a class="knopf" href="#messen/${mm.lage === 'einzel' ? '' : mm.lage || 'unbekannt'}${mm.lage === 'bekannt' && mm.stoff ? '/' + encodeURIComponent(mm.stoff) : ''}">${ICON.pfeil}Fortsetzen</a><button type="button" class="knopf" data-ende="${mm.id}">Messung abschließen</button></div>` : ''}</section>`; }).join('') +
      `<div class="ez-aktionen"><button type="button" class="knopf" id="ms-leeren">Alle abgeschlossenen Messungen von diesem Gerät löschen</button></div>`);
    c.addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.ende) { const mm = daten.messungen.find(x => x.id === t.dataset.ende); if (mm) { mm.ende = Date.now(); sichern(); tagebuch('Messung abgeschlossen'); } zeigen('protokoll'); }
      if (t.id === 'ms-leeren') { if (!confirm('Alle abgeschlossenen Messungen löschen? (Die Einträge im Einsatztagebuch bleiben.)')) return; daten.messungen = daten.messungen.filter(x => !x.ende); sichern(); zeigen('protokoll'); }
    });
  }

  GSZ.ansicht('messen', { element: el, titel: () => 'Messen', anzeigen(p) { zeigen(p); } });
  window.GSZMessenUI = { stoffVon, zeigen, daten: () => daten };
})();
