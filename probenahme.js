// Probenahme CBRN – interaktive Anleitung nach der BBK-Kurzanleitung (Forschung im Bevölkerungsschutz Band 5) mit Hintergründen
// aus den BBK-Empfehlungen für die Probenahme. Die Inhalte (Texte, Materialfotos, Piktogramme) liegen im Dropbox-App-Ordner unter
// Einsatz/_App/Probenahme (anleitung.json und Bilder) – nicht in der öffentlichen Web-App. Diese Datei zeigt sie nur an.
// Ansichten: #probe (Probe wählen, Ablauf, Grundsätze, Checkliste, Formulare, genommene Proben), #probe/<Code> (Anleitung).
'use strict';
(function () {
  const E = window.GSZEinsatz;
  if (!E || !window.GSZ) return;
  const esc = E.esc, meldung = E.meldung;
  const ORDNER = '_App/Probenahme/', DATEI = ORDNER + 'anleitung.json', LS = 'gsz-probenahme';
  const SVG = (inhalt, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
  const ICON = {
    haken: SVG('<path d="m5 12 5 5 9-10"/>', 2.6), pfeil: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    doku: SVG('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
    neu: SVG('<path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 10A8 8 0 0 0 6 6L4 10M4 14a8 8 0 0 0 14 4l2-4"/>'),
    probe: SVG('<path d="M9 3h6M10 3v4l-4 8a4 4 0 0 0 3.6 6h4.8A4 4 0 0 0 18 15l-4-8V3"/><path d="M8 14h8"/>'),
  };
  const KAT = { C: ['Chemisch', 'C', 'var(--ser)'], B: ['Biologisch', 'B', 'var(--good)'], RN: ['Radiologisch / nuklear', 'RN', 'var(--akzent)'] };
  const uhr = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // ---------------------------------------------------------------- Zustand: Fortschritt je Probenart, genommene Proben (auf dem Gerät)
  let z = (() => { try { return JSON.parse(localStorage.getItem(LS) || 'null') || {}; } catch { return {}; } })();
  z.fortschritt = z.fortschritt || {}; z.proben = Array.isArray(z.proben) ? z.proben : []; z.check = z.check || {}; z.kat = z.kat || 'C';
  const sichern = () => { try { localStorage.setItem(LS, JSON.stringify(z)); } catch { /* voll */ } };
  const bericht = () => window.GSZBericht && window.GSZBericht.aktiv() ? window.GSZBericht : null;

  // ---------------------------------------------------------------- Inhalte aus dem App-Ordner
  let daten = null, datenStand = '';
  async function laden() {
    const a = E.ad && E.ad();
    const info = (E.dateien || []).find(d => !d.ordner && String(d.pfad).normalize('NFC') === DATEI);
    if (!a || !info) return daten;
    const stand = `${info.rev || ''}|${info.groesse || ''}`;
    if (daten && stand === datenStand) return daten;
    try { daten = JSON.parse(await (await a.datei(info.pfad)).text()); datenStand = stand; } catch { /* alter Stand */ }
    return daten;
  }
  const bildDa = n => n && (E.dateien || []).some(d => !d.ordner && String(d.pfad).normalize('NFC') === ORDNER + n);
  async function bilderLaden(c) {
    for (const img of c.querySelectorAll('img[data-pbild]')) {
      try { img.src = await E.objektUrl(img.dataset.pbild); } catch { img.closest('[data-bildrahmen]') ? img.closest('[data-bildrahmen]').hidden = true : img.remove(); }
    }
  }
  const abbHtml = g => g && g.bild && bildDa(g.bild) ? `<figure class="pr-abb"><img data-pbild="${ORDNER}${esc(g.bild)}" alt="${esc(g.bildtext || '')}"><figcaption>${esc(g.bildtext || '')}</figcaption></figure>` : '';
  const bild = (n, alt, klasse = '') => bildDa(n) ? `<span class="pr-bild ${klasse}" data-bildrahmen><img data-pbild="${ORDNER}${esc(n)}" alt="${esc(alt)}"></span>` : '';

  // ---------------------------------------------------------------- Stile
  const st = document.createElement('style');
  st.textContent = `
  .pr-arten { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: .55rem; margin-top: .6rem; }
  .pr-art { display: grid; grid-template-columns: 3.4rem 1fr auto; gap: .15rem .75rem; align-items: center; padding: .55rem .8rem .55rem .55rem; min-height: 4.2rem; border-radius: .6rem;
    background: var(--surface2); border: 1px solid var(--line); color: var(--ink); text-decoration: none; }
  .pr-art .pr-bild { grid-row: span 2; width: 3.4rem; height: 3.4rem; }
  .pr-art b { font-size: 1rem; } .pr-art small { grid-column: 2; color: var(--ink2); font-size: max(13px, .8125rem); }
  .pr-art .code { grid-row: 1 / span 2; grid-column: 3; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ink2); font-size: .85rem; }
  .pr-bild { display: inline-flex; align-items: center; justify-content: center; background: #fff; border-radius: .4rem; overflow: hidden; flex: none; }
  .pr-bild img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
  .pr-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
  .pr-mat { display: grid; grid-template-columns: 44px 1fr 6.5rem; gap: .6rem; align-items: center; padding: .35rem .5rem; border-radius: .55rem; background: var(--surface2); border: 1px solid var(--line);
    cursor: pointer; min-height: 3.4rem; }
  .pr-mat input { width: 26px; height: 26px; margin: 0 9px; accent-color: var(--akzent-voll, #2563c9); }
  .pr-mat .pr-bild { width: 6.5rem; height: 2.9rem; }
  .pr-mat.an { opacity: .62; } .pr-mat.an span.name { text-decoration: line-through; }
  .pr-schritt { display: grid; grid-template-columns: 5.2rem 1fr; gap: .4rem .85rem; padding: .7rem .75rem; border-radius: .65rem; background: var(--surface2); border: 1px solid var(--line);
    border-left: 4px solid var(--rand); }
  .pr-schritt.jetzt { border-color: var(--akzent); border-left-color: var(--akzent); box-shadow: inset 0 0 0 1px var(--akzent); }
  .pr-schritt.erledigt { border-left-color: var(--good); }
  .pr-schritt .pr-bild { width: 5.2rem; height: 5.2rem; grid-row: span 2; align-self: start; }
  .pr-schritt .kopf { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
  .pr-schritt .buchst { min-width: 2rem; height: 2rem; border-radius: .4rem; display: inline-grid; place-items: center; font-weight: 800; background: var(--surface3, var(--surface)); border: 1px solid var(--line); }
  .pr-schritt.erledigt .buchst { background: var(--good-voll, #1d7a43); border-color: var(--good-voll, #1d7a43); color: #fff; }
  .pr-schritt.jetzt .buchst { background: var(--akzent-voll, #2563c9); border-color: var(--akzent-voll, #2563c9); color: #fff; }
  .pr-schritt ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .2rem; } .pr-schritt li { line-height: 1.35; }
  .pr-schritt p { margin: 0; color: var(--ink2); font-size: .92rem; }
  .pr-schritt .zusatz { font-size: max(13px, .8125rem); font-weight: 700; color: var(--ser); }
  .pr-schritt .knopf { justify-self: start; grid-column: 2; }
  @media (max-width: 480px) { .pr-schritt { grid-template-columns: 4rem 1fr; } .pr-schritt .pr-bild { width: 4rem; height: 4rem; } }
  .pr-fort { display: flex; align-items: center; gap: .6rem; font-size: .9rem; color: var(--ink2); margin: .2rem 0 .6rem; }
  .pr-fort i { flex: 1; height: .5rem; border-radius: 999px; background: var(--line); overflow: hidden; } .pr-fort i b { display: block; height: 100%; width: var(--p); background: var(--good); }
  .pr-hinweis { padding: .6rem .75rem; border-radius: .55rem; border-left: 4px solid var(--ser); background: var(--surface2); font-size: .92rem; margin-bottom: .7rem; }
  .pr-punkte { margin: .3rem 0 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .3rem; font-size: .92rem; line-height: 1.4; }
  .pr-quelle { font-size: max(13px, .8125rem); color: var(--muted); }
  .pr-ablauf { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; counter-reset: ab; }
  .pr-ablauf li { display: grid; grid-template-columns: 2rem 1fr; gap: .1rem .6rem; padding: .5rem .6rem; border-radius: .55rem; background: var(--surface2); border: 1px solid var(--line); }
  .pr-ablauf li::before { counter-increment: ab; content: counter(ab); grid-row: span 3; width: 1.8rem; height: 1.8rem; border-radius: 999px; display: grid; place-items: center; font-weight: 700;
    background: var(--surface3, var(--surface)); border: 1px solid var(--line); }
  .pr-ablauf small { color: var(--ink2); }
  .pr-check label { display: flex; gap: .6rem; align-items: flex-start; padding: .45rem .2rem; border-bottom: 1px solid var(--line); cursor: pointer; min-height: 44px; }
  .pr-check input { width: 24px; height: 24px; flex: none; accent-color: var(--akzent-voll, #2563c9); margin-top: .05rem; }
  .pr-felder { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: .55rem; }
  .pr-felder label { display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; font-weight: 600; color: var(--ink2); }
  .pr-felder input, .pr-felder textarea { font: inherit; font-size: 16px; font-weight: 400; min-height: 44px; padding: .45rem .65rem; border-radius: .5rem; border: 1px solid var(--rand-stark, var(--rand));
    background: var(--eingabe, var(--surface2)); color: var(--ink); box-sizing: border-box; width: 100%; }
  .pr-proben { width: 100%; border-collapse: collapse; font-size: .88rem; } .pr-proben td, .pr-proben th { text-align: left; padding: .4rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  .pr-proben th { font-size: max(13px, .78rem); color: var(--ink2); font-weight: 600; }
  .pr-abb { margin: .7rem 0 .2rem; } .pr-abb img { width: 100%; max-width: 32rem; background: #fff; border-radius: .4rem; display: block; }
  .pr-abb figcaption { font-size: max(13px, .8125rem); color: var(--ink2); margin-top: .3rem; }
  .pr-schema { width: 100%; max-width: 40rem; background: #fff; border-radius: .4rem; display: block; }
  `;
  document.head.appendChild(st);

  // ---------------------------------------------------------------- Ansicht
  const el = E.ansichtElement('probeansicht');
  const neu = kopf => { el.innerHTML = ''; el.appendChild(E.kopf(kopf)); const c = document.createElement('div'); c.className = 'pr-inhalt'; el.appendChild(c); return c; };
  async function zeigen(param) {
    const teile = String(param || '').split('/').map(decodeURIComponent);
    const c0 = neu({ titel: 'Probenahme', unter: 'CBRN – nach BBK', eltern: 'start' });
    c0.innerHTML = '<div class="ez-leer">wird geladen …</div>';
    const a = E.ad && E.ad();
    if (a && a.verbunden && a.verbunden() && !(E.dateien || []).length && E.listeHolen) await E.listeHolen(false);
    await laden();
    if (!daten || !Array.isArray(daten.arten)) {
      c0.innerHTML = `<section class="kachel ez-karte"><div class="ez-leer">Die Anleitung liegt im Dropbox-App-Ordner (Einsatz › _App › Probenahme). ${a && a.verbinden && !(a.verbunden && a.verbunden()) ? 'Dazu einmal mit Dropbox verbinden.' : 'Die Datei „anleitung.json“ fehlt dort noch.'}</div></section>`;
      return;
    }
    if (teile[0]) return artZeigen(teile[0]);
    startZeigen();
  }
  const artVon = code => daten.arten.find(x => x.code === code) || null;
  const formulare = () => (E.dateien || []).filter(d => !d.ordner && /^Probenahme\/[^/]+\.pdf$/i.test(String(d.pfad).normalize('NFC')));

  function startZeigen() {
    const c = neu({ titel: 'Probenahme', unter: 'CBRN – nach BBK-Kurzanleitung', eltern: 'start' });
    const k = KAT[z.kat] ? z.kat : 'C';
    const arten = daten.arten.filter(x => x.kategorie === k);
    const em = daten.empfehlungen || {};
    const fort = code => { const f = z.fortschritt[code]; const x = artVon(code); if (!f || !x) return ''; const n = (f.schritte || []).length; return n ? ` · ${n}/${x.schritte.length} Schritte` : ''; };
    c.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Welche Probe?</h2>
        <div class="ms-seg" role="radiogroup" aria-label="Art der Lage">${Object.entries(KAT).map(([id, [name]]) => `<button type="button" role="radio" data-kat="${id}" aria-checked="${id === k}" aria-pressed="${id === k}">${esc(name)}<small>${daten.arten.filter(x => x.kategorie === id).length} Probenarten</small></button>`).join('')}</div>
        <div class="pr-arten">${arten.map(x => `<a class="pr-art" href="#probe/${encodeURIComponent(x.code)}">${bild(x.schritte[0] && x.schritte[0].bild, '')}<b>${esc(x.titel)}</b>
          <small>${esc(x.material.length)} Materialien · ${x.schritte.length} Schritte${fort(x.code)}</small><span class="code">${esc(x.code)}</span></a>`).join('')}</div></section>
      ${z.proben.length ? `<section class="kachel ez-karte"><h2>Genommene Proben</h2>${probenTabelle()}</section>` : ''}
      ${daten.ablauf && daten.ablauf.schritte ? `<section class="kachel ez-karte"><h2>Ablauf der CBRN-Probenahme</h2>
        ${daten.ablauf.beschreibung ? `<div class="pr-quelle" style="margin-bottom:.5rem">${esc(daten.ablauf.beschreibung)}</div>` : ''}
        <ol class="pr-ablauf">${daten.ablauf.schritte.map(s => `<li><b>${esc(s.aktion || s)}</b>${s.wer ? `<small>${esc(s.wer)}</small>` : ''}${s.aufgabe ? `<span>${esc(s.aufgabe)}</span>` : ''}</li>`).join('')}</ol>
        ${bildDa(daten.ablauf.bild) ? `<details class="ez-mehr" style="margin-top:.6rem"><summary>Original-Ablaufschema (BBK)</summary><div class="inhalt"><img class="pr-schema" data-pbild="${ORDNER}${esc(daten.ablauf.bild)}" alt="Ablaufschema der CBRN-Probenahme"></div></details>` : ''}
        <div class="pr-quelle" style="margin-top:.5rem">BBK-Empfehlungen, S. ${esc(daten.ablauf.seite || 150)}</div></section>` : ''}
      ${em.checkliste_einsatzort && em.checkliste_einsatzort.punkte ? `<section class="kachel ez-karte"><h2>Checkliste für den Einsatzort</h2><div class="pr-check">${em.checkliste_einsatzort.punkte.map((p, i) =>
        `<label><input type="checkbox" data-check="${i}"${z.check[i] ? ' checked' : ''}><span>${esc(p)}</span></label>`).join('')}</div>
        <div class="ez-aktionen"><button type="button" class="knopf" data-check-neu>${ICON.neu}Checkliste zurücksetzen</button></div><div class="pr-quelle">BBK-Empfehlungen, S. ${esc(em.checkliste_einsatzort.seite || 153)}</div></section>` : ''}
      ${(em.grundsaetze || []).length ? `<section class="kachel ez-karte"><h2>Grundsätze</h2>${em.grundsaetze.map(g => `<details class="ez-mehr"><summary>${esc(g.titel)}</summary><div class="inhalt"><ul class="pr-punkte">${(g.punkte || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>${abbHtml(g)}
        <div class="pr-quelle">BBK-Empfehlungen, S. ${esc(g.seite)}</div></div></details>`).join('')}</section>` : ''}
      ${formulare().length ? `<section class="kachel ez-karte"><h2>Unterlagen</h2><ul class="ez-dateien">${formulare().map(d => `<li><a href="#datei/${encodeURIComponent(d.pfad)}"><span class="typ" style="--c:#d64045">PDF</span><span><b>${esc(d.name.replace(/\.pdf$/i, ''))}</b></span></a></li>`).join('')}</ul></section>` : ''}
      <div class="pr-quelle">${esc(daten.quelle || 'BBK: Kurzanleitung für die CBRN-Probenahme; Empfehlungen für die Probenahme zur Gefahrenabwehr im Bevölkerungsschutz (Forschung im Bevölkerungsschutz Band 5).')}</div>`);
    c.addEventListener('click', ev => {
      const b = ev.target.closest('[data-kat]'); if (b) { z.kat = b.dataset.kat; sichern(); startZeigen(); return; }
      if (ev.target.closest('[data-check-neu]')) { z.check = {}; sichern(); startZeigen(); }
    });
    c.addEventListener('change', ev => { const i = ev.target.closest('[data-check]'); if (i) { z.check[i.dataset.check] = i.checked; sichern(); } });
    bilderLaden(c);
  }
  function probenTabelle(code) {
    const l = z.proben.filter(p => !code || p.code === code);
    return l.length ? `<table class="pr-proben"><tr><th>Nr.</th><th>Probe</th><th>Zeit</th><th>Ort / Bemerkung</th></tr>${l.map(p => `<tr><td><b>${esc(p.nr)}</b></td><td>${esc(p.code)} ${esc(p.titel)}</td>
      <td>${esc(uhr(p.zeit))}</td><td>${esc([p.ort, p.bemerkung].filter(Boolean).join(' · '))}</td></tr>`).join('')}</table>` : '';
  }
  // ---------------------------------------------------------------- Anleitung einer Probenart
  function artZeigen(code) {
    const x = artVon(code);
    if (!x) { const c = neu({ titel: 'Probenahme', unter: 'CBRN', eltern: 'probe' }); c.innerHTML = '<section class="kachel ez-karte"><div class="ez-leer">Probenart nicht gefunden.</div></section>'; return; }
    const kat = KAT[x.kategorie] || KAT.C, em = daten.empfehlungen || {}, gruppe = em[x.kategorie.toLowerCase()] || {};
    const f = z.fortschritt[code] = z.fortschritt[code] || { material: [], schritte: [] };
    const c = neu({ titel: `${x.code} · ${x.titel}`, unter: `Probenahme · ${kat[0]}`, eltern: 'probe' });
    const jetzt = x.schritte.findIndex((s, i) => !f.schritte.includes(i));
    const nMat = f.material.length, nSchr = f.schritte.length;
    const hint = (x.hinweise || []).map(h => esc(h)).join('<br>');
    const naechsteNr = () => { const n = z.proben.length + 1; return `P-${String(n).padStart(2, '0')}`; };
    c.insertAdjacentHTML('beforeend', `${hint ? `<div class="pr-hinweis">${hint}</div>` : ''}
      <section class="kachel ez-karte" id="pr-material"><h2>1 · Material bereitlegen</h2>
        <div class="pr-fort"><span>${nMat}/${x.material.length}</span><i style="--p:${Math.round(nMat / Math.max(1, x.material.length) * 100)}%"><b></b></i></div>
        <ul class="pr-liste">${x.material.map((m, i) => `<li><label class="pr-mat${f.material.includes(i) ? ' an' : ''}"><input type="checkbox" data-mat="${i}"${f.material.includes(i) ? ' checked' : ''}>
          <span class="name">${esc(m.name)}</span>${bild(m.bild, m.name) || '<span></span>'}</label></li>`).join('')}</ul></section>
      <section class="kachel ez-karte" id="pr-durchfuehrung"><h2>2 · Durchführung</h2>
        <div class="pr-fort"><span>${nSchr}/${x.schritte.length}</span><i style="--p:${Math.round(nSchr / Math.max(1, x.schritte.length) * 100)}%"><b></b></i></div>
        <ol class="pr-liste">${x.schritte.map((s, i) => { const fertig = f.schritte.includes(i);
          return `<li class="pr-schritt${fertig ? ' erledigt' : i === jetzt ? ' jetzt' : ''}" data-schritt="${i}">${bild(s.bild, 'Piktogramm Schritt ' + s.buchstabe) || '<span></span>'}
            <div><div class="kopf"><span class="buchst">${esc(s.buchstabe)}</span>${s.zusatz ? `<span class="zusatz">${esc(s.zusatz)}</span>` : ''}</div>
            ${(s.punkte || []).some(p => p.art === 'punkt') ? `<ul>${s.punkte.map(p => p.art === 'punkt' ? `<li>${esc(p.text)}</li>` : `</ul><p>${esc(p.text)}</p><ul>`).join('')}</ul>` : (s.punkte || []).map(p => `<p>${esc(p.text)}</p>`).join('')}</div>
            <button type="button" class="knopf${fertig ? '' : i === jetzt ? ' los' : ''}" data-erledigt="${i}" aria-pressed="${fertig}">${fertig ? ICON.haken + 'Erledigt' : 'Erledigt'}</button></li>`; }).join('')}</ol>
        ${(x.schluss || []).length ? `<div class="pr-hinweis" style="margin-top:.7rem;border-left-color:var(--akzent)">${x.schluss.map(esc).join('<br>')}</div>` : ''}
        <div class="ez-aktionen"><button type="button" class="knopf" data-neu>${ICON.neu}Neu beginnen</button></div></section>
      <section class="kachel ez-karte" id="pr-erfassen"><h2>3 · Probe erfassen</h2>
        <div class="pr-felder"><label>Probennummer<input data-feld="nr" value="${esc(naechsteNr())}" autocomplete="off"></label>
          <label>Probenahmestelle<input data-feld="ort" placeholder="z. B. Ziffer 2, Lache vor dem Tor" autocomplete="off"></label>
          <label style="grid-column:1/-1">Bemerkung<input data-feld="bemerkung" placeholder="z. B. Gegenprobe, Blindprobe, pH 3, 8 °C" autocomplete="off"></label></div>
        <div class="ez-aktionen"><button type="button" class="knopf los" data-erfassen>${ICON.probe}Probe erfassen${bericht() ? ' (auch ins Einsatztagebuch)' : ''}</button>
          ${formulare().filter(d => /begleitschein/i.test(d.name)).map(d => `<a class="knopf" href="#datei/${encodeURIComponent(d.pfad)}">${ICON.doku}Probenbegleitschein</a>`).join('')}</div>
        ${probenTabelle(code)}</section>
      ${(em.probenarten && em.probenarten[code]) || Object.keys(gruppe).length ? `<section class="kachel ez-karte"><h2>Hintergrund (BBK-Empfehlungen)</h2>
        ${em.probenarten && em.probenarten[code] ? `<details class="ez-mehr" open><summary>Zu dieser Probe</summary><div class="inhalt"><ul class="pr-punkte">${(em.probenarten[code].punkte || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>${abbHtml(em.probenarten[code])}<div class="pr-quelle">S. ${esc(em.probenarten[code].seite)}</div></div></details>` : ''}
        ${Object.entries(gruppe).map(([k2, g]) => `<details class="ez-mehr"><summary>${esc({ schutz: 'Schutz der Einsatzkräfte', dekon: 'Dekontamination', desinfektion: 'Desinfektion', verpackung: 'Verpackung', transport: 'Transport' }[k2] || k2)}</summary>
          <div class="inhalt"><ul class="pr-punkte">${(g.punkte || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>${abbHtml(g)}<div class="pr-quelle">S. ${esc(g.seite)}</div></div></details>`).join('')}</section>` : ''}
      <div class="pr-quelle">BBK-Kurzanleitung für die CBRN-Probenahme, S. ${esc((x.seiten || []).join('–'))}.</div>`);
    c.addEventListener('change', ev => {
      const m = ev.target.closest('[data-mat]'); if (!m) return;
      const i = Number(m.dataset.mat); f.material = m.checked ? [...new Set([...f.material, i])] : f.material.filter(v => v !== i); sichern();
      m.closest('.pr-mat').classList.toggle('an', m.checked);
      const fo = c.querySelector('#pr-material .pr-fort'); fo.querySelector('span').textContent = `${f.material.length}/${x.material.length}`; fo.querySelector('i').style.setProperty('--p', Math.round(f.material.length / x.material.length * 100) + '%');
    });
    c.addEventListener('click', ev => {
      const b = ev.target.closest('[data-erledigt]');
      if (b) { const i = Number(b.dataset.erledigt); f.schritte = f.schritte.includes(i) ? f.schritte.filter(v => v !== i) : [...f.schritte, i]; sichern(); artZeigen(code);
        const n = x.schritte.findIndex((s, j) => !f.schritte.includes(j)); const ziel = n >= 0 ? el.querySelector(`[data-schritt="${n}"]`) : el.querySelector('#pr-erfassen');
        if (ziel && !f.schritte.includes(n) && f.schritte.includes(i)) ziel.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      if (ev.target.closest('[data-neu]')) { if (!confirm('Material und Schritte dieser Probe zurücksetzen?')) return; z.fortschritt[code] = { material: [], schritte: [] }; sichern(); artZeigen(code); return; }
      if (ev.target.closest('[data-erfassen]')) {
        const w = n => (c.querySelector(`[data-feld="${n}"]`).value || '').trim();
        const p = { nr: w('nr') || naechsteNr(), code: x.code, titel: x.titel, ort: w('ort'), bemerkung: w('bemerkung'), zeit: Date.now() };
        z.proben.push(p); sichern();
        const b2 = bericht(); if (b2) b2.eintragen(`Probe ${p.nr} genommen: ${x.code} ${x.titel}${p.ort ? ' · ' + p.ort : ''}${p.bemerkung ? ' · ' + p.bemerkung : ''}`, 'probe');
        meldung(`Probe ${p.nr} erfasst${b2 ? ' und ins Einsatztagebuch eingetragen' : ''}.`, 4000);
        artZeigen(code);
      }
    });
    bilderLaden(c);
  }

  GSZ.ansicht('probe', { element: el, titel: () => 'Probenahme', anzeigen(p) { zeigen(p); } });
  window.GSZProbenahme = { zeigen, daten: () => daten, proben: () => z.proben };
})();
