// Lage im Einsatz: Wind (Deutscher Wetterdienst über Bright Sky), Standort, Bereiche nach dem Gefahrstoffkonzept RLP (Grundlage)
// bzw. der FwDV 500 (nur nach Freigabe, zentral umschaltbar mit Freigabe-PIN), ergänzt um Anhaltswerte des ERG 2024, mit Skizze;
// dazu die Warntafel (eintippen oder fotografieren). Läuft im Browser; Wissen und Daten aus gefahrgut.js.
// window.GSZLage = { wind, standortHolen, startHtml, beleben, stoffKarteHtml, stoffTeilHtml, warntafelOeffnen, skizzeSvg }
'use strict';
(() => {
  const GG = window.GSZGefahrgut;
  if (!GG) return;
  const MIEHLEN = { lat: 50.2263, lon: 7.8317, name: 'Miehlen', standard: true };
  const WIND_GUELTIG_MS = 20 * 60 * 1000, MANUELL_GUELTIG_MS = 6 * 60 * 60 * 1000;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const uhrzeit = d => { d = new Date(d); return isNaN(d) ? '' : `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } },
  };
  const zahlText = (z, st = 1) => String(Math.round(z * 10 ** st) / 10 ** st).replace('.', ',');
  const meter = m => m >= 1000 ? zahlText(m / 1000, 1) + ' km' : Math.round(m) + ' m';

  // ---------------------------------------------------------------- Regelwerk für die Bereiche (zentral für alle Geräte)
  // Einsatz/_App/Regelwerk/regelwerk.json = { grundlage: 'rlp' | 'fwdv500', pin: { salz, hash }, geaendert, von }. Ohne Datei gilt
  // das Gefahrstoffkonzept RLP. Auf die FwDV 500 umschalten geht nur mit der Freigabe-PIN (legt Lucas beim ersten Mal fest);
  // zurück zum Gefahrstoffkonzept jederzeit.
  const REGEL_PFAD = '_App/Regelwerk/regelwerk.json';
  let regelwerk = LS.get('gsz-regelwerk') || { grundlage: 'rlp' };
  const grundlage = () => regelwerk && regelwerk.grundlage === 'fwdv500' ? 'fwdv500' : 'rlp';
  const einsatz = () => window.GSZEinsatz || null;
  const melde = (t, ms) => { const E = einsatz(); if (E && E.meldung) E.meldung(t, ms); };
  let gespeichertAm = 0;
  async function regelwerkLaden() {
    // eben selbst umgestellt: die Liste der Dropbox kennt die neue Datei evtl. noch nicht – der eigene Stand gilt
    if (Date.now() - gespeichertAm < 3 * 60 * 1000) return regelwerk;
    const E = einsatz(), a = E && E.ad && E.ad();
    if (!a || !a.verbunden || !a.verbunden() || !a.datei) return regelwerk;
    const da = (E.dateien || []).some(d => !d.ordner && String(d.pfad).normalize('NFC') === REGEL_PFAD);
    if (!da) { if ((E.dateien || []).length && !regelwerk.geaendert) { regelwerk = { grundlage: 'rlp' }; LS.set('gsz-regelwerk', regelwerk); } return regelwerk; }
    try {
      const j = JSON.parse(await (await a.datei(REGEL_PFAD)).text());
      // es gilt der neuere Stand (Dropbox oder dieses Gerät)
      if (j && typeof j === 'object' && (!regelwerk.geaendert || !j.geaendert || String(j.geaendert) >= String(regelwerk.geaendert))) { regelwerk = j; LS.set('gsz-regelwerk', j); }
    } catch { /* gemerkter Stand */ }
    return regelwerk;
  }
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const pinHash = async (salz, pin) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salz + ':' + pin)));
  async function regelwerkSpeichern(neu) {
    const E = einsatz(), a = E && E.ad && E.ad();
    if (!a || !a.ablegen || !a.verbunden()) throw new Error('Dafür braucht die App die Verbindung zum Dropbox-App-Ordner.');
    if (navigator.onLine === false) throw new Error('Ohne Netz nicht möglich.');
    await a.ablegen('_App', 'Regelwerk', [{ name: 'regelwerk.json', blob: new Blob([JSON.stringify(neu, null, 1)], { type: 'application/json' }) }]);
    regelwerk = neu; LS.set('gsz-regelwerk', neu); gespeichertAm = Date.now();
  }
  async function umschalten(ziel) {
    if (ziel === grundlage()) return false;
    const neu = { ...regelwerk, grundlage: ziel, geaendert: new Date().toISOString(), von: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone/iPad' : 'Gerät' };
    if (ziel === 'fwdv500') {
      if (!regelwerk.pin) {
        if (!confirm('Grundlage ist das Gefahrstoffkonzept RLP. Die FwDV 500 gilt nur nach Freigabe durch Lucas Pfeifer.\n\nJetzt die Freigabe-PIN festlegen? Sie gilt danach für alle Geräte.')) return false;
        const p1 = prompt('Neue Freigabe-PIN (mindestens 4 Ziffern):', '');
        if (!p1 || !/^\d{4,12}$/.test(p1)) { melde('Keine gültige PIN – es bleibt beim Gefahrstoffkonzept RLP.', 5000); return false; }
        if (prompt('Freigabe-PIN wiederholen:', '') !== p1) { melde('Die PINs stimmen nicht überein.', 5000); return false; }
        const salz = hex(crypto.getRandomValues(new Uint8Array(16)));
        neu.pin = { salz, hash: await pinHash(salz, p1) };
      } else {
        const pin = prompt('FwDV 500 freigeben – Freigabe-PIN:', '');
        if (!pin) return false;
        if (await pinHash(regelwerk.pin.salz, pin) !== regelwerk.pin.hash) { melde('Falsche PIN – es bleibt beim Gefahrstoffkonzept RLP.', 6000); return false; }
      }
    }
    try { await regelwerkSpeichern(neu); } catch (e) { melde('Nicht umgestellt: ' + e.message, 7000); return false; }
    melde(`Grundlage für alle Geräte: ${GG.GRUNDLAGEN[ziel].lang}.`, 6000);
    return true;
  }
  // Schieberegler RLP ⟷ FwDV 500
  const reglerHtml = () => { const g = grundlage();
    return `<div class="lg-regel" role="radiogroup" aria-label="Grundlage für die Bereiche" data-stand="${g}">
      <button type="button" role="radio" aria-checked="${g === 'rlp'}" data-regel="rlp">Gefahrstoffkonzept RLP</button>
      <button type="button" role="radio" aria-checked="${g === 'fwdv500'}" data-regel="fwdv500">FwDV 500${g === 'fwdv500' ? '' : ' <small>Freigabe</small>'}</button></div>`; };

  // ---------------------------------------------------------------- Stile
  const stil = document.createElement('style');
  stil.textContent = `
  .lg-wind { display: grid; grid-template-columns: auto 1fr; gap: .2rem .9rem; align-items: center; }
  .lg-rose { width: 4.6rem; height: 4.6rem; grid-row: span 4; align-self: start; color: var(--ink); }
  .lg-wind b.gross { font-size: 1.15rem; } .lg-wind .zug { font-weight: 700; color: var(--akzent); }
  .lg-wind small, .lg-klein { font-size: .78rem; color: var(--muted); line-height: 1.35; }
  .lg-wind small.lg-standort { color: var(--ink2); }
  /* Karte (Google Maps bzw. OpenStreetMap) */
  /* eigene Ebene: die Ebenen der Karte (bis z-index 1000) dürfen nicht über Reiterleiste und Kopf liegen */
  .lg-karte-rahmen { position: relative; z-index: 0; isolation: isolate; margin: .2rem 0 .5rem; }
  .lg-karte { height: min(62vh, 26rem); border-radius: .8rem; overflow: hidden; background: #dfe3e8; border: 1px solid var(--rand); }
  .lg-karte-rahmen.gross .lg-karte { height: calc(100vh - 9rem); }
  .lg-karte-wind { position: absolute; top: .5rem; right: .5rem; z-index: 500; pointer-events: none; background: rgba(10, 12, 15, .78); color: #fff; border-radius: .6rem;
    padding: .3rem .55rem; font-size: .75rem; font-weight: 700; display: flex; align-items: center; gap: .35rem; max-width: 70%; }
  .lg-karte-wind svg { width: 1.1rem; height: 1.1rem; color: #ffd27a; flex: none; }
  .lg-karte-knoepfe { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: .45rem; }
  .lg-karte-knoepfe .knopf { font-size: .8rem; }
  .lg-legende { display: flex; flex-wrap: wrap; gap: .3rem .8rem; font-size: .74rem; color: var(--ink2); margin: .2rem 0 .5rem; }
  .lg-legende i { display: inline-block; width: .8rem; height: .8rem; border-radius: 50%; margin-right: .3rem; vertical-align: -.1rem; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 25%, transparent); }
  .gk-unfall span { display: block; width: 30px; height: 30px; border-radius: 50%; background: #e5484d; border: 3px solid #fff; box-shadow: 0 1px 5px rgba(0, 0, 0, .55); box-sizing: border-box; }
  .gk-unfall span::after { content: ""; position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: #fff; }
  .lg-knoepfe { display: flex; gap: .45rem; flex-wrap: wrap; margin-top: .55rem; }
  .lg-knoepfe .knopf { font-size: .84rem; }
  .lg-vorh { display: flex; gap: .35rem; overflow-x: auto; margin-top: .5rem; scrollbar-width: none; }
  .lg-vorh::-webkit-scrollbar { display: none; }
  .lg-vorh span { flex: none; display: flex; flex-direction: column; align-items: center; gap: .1rem; font-size: .72rem; color: var(--ink2);
    background: var(--surface2); border-radius: .5rem; padding: .3rem .45rem; min-width: 3.1rem; }
  .lg-vorh svg { width: 1.2rem; height: 1.2rem; color: var(--akzent); }
  .lg-kompass { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .35rem; margin-top: .5rem; }
  .lg-kompass button { font: inherit; font-weight: 700; padding: .55rem 0; border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .lg-kompass button.an { background: var(--akzent); color: #fff; border-color: var(--akzent); }
  .lg-abstaende { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: .55rem; }
  .lg-abstand { background: var(--surface2); border-radius: .7rem; padding: .6rem .7rem; border-left: 4px solid var(--c, var(--akzent)); }
  .lg-abstand b { display: block; font-size: 1.35rem; line-height: 1.1; }
  .lg-abstand span { font-size: .78rem; color: var(--ink2); line-height: 1.3; display: block; margin-top: .15rem; }
  .lg-skizze { width: 100%; max-width: 22rem; display: block; margin: .3rem auto 0; color: var(--ink); }
  .lg-skizze text { font: 600 11px system-ui, -apple-system, sans-serif; fill: currentColor; }
  .lg-abstand b.jetzt, .ez-tabelle th.jetzt, .ez-tabelle td.jetzt { color: var(--akzent); } .lg-abstand b:not(.jetzt) + b.jetzt, .lg-abstand b.jetzt { text-decoration: underline; text-underline-offset: 3px; }
  .ez-tabelle td.jetzt, .lg-t3 span.jetzt { font-weight: 800; color: var(--akzent); text-decoration: underline; text-underline-offset: 3px; }
  .lg-t3 { width: 100%; } .lg-t3 td { -webkit-hyphens: auto; hyphens: auto; } .lg-t3 td.km { white-space: nowrap; font-variant-numeric: tabular-nums; } .lg-t3 th small { font-weight: 500; }
  .lg-regel { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--surface2); border: 1px solid var(--rand); border-radius: 999px; padding: .2rem; margin: .1rem 0 .7rem; }
  .lg-regel::before { content: ""; position: absolute; top: .2rem; bottom: .2rem; left: .2rem; width: calc(50% - .2rem); border-radius: 999px; background: var(--akzent); transition: transform .25s ease; }
  .lg-regel[data-stand="fwdv500"]::before { transform: translateX(100%); background: var(--ser); }
  .lg-regel button { position: relative; z-index: 1; font: inherit; font-size: .82rem; font-weight: 700; border: 0; background: transparent; color: var(--ink2); padding: .5rem .4rem; border-radius: 999px; cursor: pointer; }
  .lg-regel button[aria-checked="true"] { color: #fff; } .lg-regel small { font-weight: 500; opacity: .8; }
  @media (prefers-reduced-motion: reduce) { .lg-regel::before { transition: none; } }
  .lg-ergaenzend { margin: .75rem 0 .35rem; font-size: .8rem; font-weight: 700; color: var(--ink2); text-transform: uppercase; letter-spacing: .05em; }
  .lg-quelle { font-size: .74rem; color: var(--muted); margin-top: .5rem; line-height: 1.35; }
  .lg-fwdv li { margin-bottom: .3rem; }
  /* Warntafel zum Eintippen */
  .lg-tafel-wahl { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .lg-tafel { width: 10.5rem; flex: none; background: #f57c00; border: .3rem solid #111; border-radius: .25rem; display: grid; grid-template-rows: 1fr 1fr; }
  .lg-tafel input { width: 100%; box-sizing: border-box; background: transparent; border: 0; text-align: center; font: 800 2.1rem/1.15 "Arial Narrow", Arial, sans-serif;
    color: #111; padding: .25rem 0; letter-spacing: .04em; outline: none; }
  .lg-tafel input::placeholder { color: rgba(0, 0, 0, .35); }
  .lg-tafel input:first-child { border-bottom: .3rem solid #111; }
  .lg-tafel-info { flex: 1 1 13rem; min-width: 0; display: flex; flex-direction: column; gap: .45rem; font-size: .9rem; line-height: 1.4; }
  .lg-tafel-info .gn b { font-size: 1.05rem; }
  .lg-tafel-info ul { margin: 0; padding-left: 1.05rem; }
  .lg-warn-x { color: var(--crit); font-weight: 700; }
  .lg-foto { position: relative; overflow: hidden; }
  .lg-foto input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; font-size: 16px; }
  `;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Symbole
  const SVGA = (inhalt, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
  const ICON = {
    wind: SVGA('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>'),
    ort: SVGA('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    neu: SVGA('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
    kamera: SVGA('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    tafel: SVGA('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 12h18"/>'),
    pfeil: SVGA('<path d="M12 21V4M5 11l7-7 7 7"/>'),
  };
  // Pfeil in Zugrichtung (0° = nach Norden/oben)
  const zugPfeil = grad => `<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(${Math.round(grad)} 12 12)"><path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  // Windrose: Pfeil zeigt, wohin der Wind zieht; Spitze außen mit „N“
  function rose(von) {
    const zug = GG.ausbreitungsrichtung(von);
    return `<svg class="lg-rose" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2"/>
      ${['N', 'O', 'S', 'W'].map((t, i) => { const a = i * Math.PI / 2; return `<text x="${50 + Math.sin(a) * 36}" y="${50 - Math.cos(a) * 36 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" opacity="${t === 'N' ? 1 : .55}">${t}</text>`; }).join('')}
      <g transform="rotate(${Math.round(zug)} 50 50)"><path d="M50 78 V24 M38 36 L50 22 L62 36" fill="none" stroke="var(--akzent)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  }

  // ---------------------------------------------------------------- Standort
  // Standort: GPS des Geräts (Grundlage für Wind und Karte); hat das Gerät den Standort verweigert, nur auf Knopfdruck neu fragen.
  // Ohne GPS: zuletzt bekannter Standort, sonst Miehlen.
  async function standortHolen({ gps = false } = {}) {
    const gemerkt = LS.get('gsz-ort');
    if (navigator.geolocation && (gps || LS.get('gsz-gps') !== false)) {
      try {
        const pos = await new Promise((ok, fehler) => navigator.geolocation.getCurrentPosition(ok, fehler, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60 * 1000 }));
        const ort = { lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lon: Math.round(pos.coords.longitude * 1e5) / 1e5, genau: Math.round(pos.coords.accuracy || 0),
          gps: true, zeit: Date.now(), name: '' };
        if (gemerkt && gemerkt.gps && gemerkt.name && Math.abs(gemerkt.lat - ort.lat) < 3e-4 && Math.abs(gemerkt.lon - ort.lon) < 3e-4) ort.name = gemerkt.name;
        LS.set('gsz-ort', ort); LS.set('gsz-gps', true);
        return ort;
      } catch (e) {
        if (e && e.code === 1) LS.set('gsz-gps', false);
        if (gps) throw new Error(e && e.code === 1 ? 'Standort nicht erlaubt (Einstellungen › Datenschutz › Ortungsdienste › Safari bzw. die App).' : 'Standort nicht ermittelbar.');
      }
    }
    return gemerkt || MIEHLEN;
  }
  // Ortsname zum Standort (OpenStreetMap/Nominatim, frei; gemerkt je ca. 10 m)
  async function ortName(ort) {
    if (!ort || ort.standard) return 'Miehlen (Standard)';
    const k = ort.lat.toFixed(4) + ',' + ort.lon.toFixed(4), cache = LS.get('gsz-ortnamen') || {};
    if (cache[k]) return cache[k];
    const j = await json(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${ort.lat}&lon=${ort.lon}&zoom=18&addressdetails=1&accept-language=de`);
    const a = (j && j.address) || {};
    const name = [[a.road, a.house_number].filter(Boolean).join(' '), a.village || a.town || a.city || a.hamlet || a.municipality || ''].filter(Boolean).join(', ') || (j && j.display_name) || '';
    if (name) { cache[k] = name; const n = Object.keys(cache); if (n.length > 60) delete cache[n[0]]; LS.set('gsz-ortnamen', cache); }
    return name;
  }
  const ortText = o => !o || o.standard ? 'Miehlen (Standard – Standort nicht verfügbar)' : `${o.name || 'wird ermittelt …'}${o.gps ? ` (GPS${o.genau ? ' ±' + o.genau + ' m' : ''})` : ''}`;

  // ---------------------------------------------------------------- Wind (DWD über Bright Sky – frei, ohne Schlüssel)
  async function json(url) {
    let r;
    try { r = await fetch(url, { headers: { Accept: 'application/json' } }); }
    catch (e) {
      // Programm (Electron): notfalls über den Hauptprozess
      if (window.csa && window.csa.wetter) { const x = await window.csa.wetter(url); if (!x.ok) throw new Error('Wetterdienst antwortet mit ' + x.status); return JSON.parse(x.text); }
      throw e;
    }
    if (!r.ok) throw new Error('Wetterdienst antwortet mit ' + r.status);
    return r.json();
  }
  const stationVon = (d, feld) => {
    const id = (d.weather && d.weather.fallback_source_ids && d.weather.fallback_source_ids[feld]) || (d.weather && d.weather.source_id);
    return (d.sources || []).find(s => s.id === id) || (d.sources || [])[0] || null;
  };
  async function windAbrufen(ort) {
    const q = `lat=${ort.lat}&lon=${ort.lon}&tz=Europe/Berlin`;
    const jetzt = new Date(), bis = new Date(jetzt.getTime() + 7 * 3600 * 1000);
    const [akt, vorh] = await Promise.all([
      json(`https://api.brightsky.dev/current_weather?${q}`),
      json(`https://api.brightsky.dev/weather?${q}&date=${encodeURIComponent(jetzt.toISOString())}&last_date=${encodeURIComponent(bis.toISOString())}`).catch(() => null),
    ]);
    const w = akt.weather || {};
    const richtung = w.wind_direction_10 ?? w.wind_direction_30 ?? w.wind_direction_60;
    const kmh = w.wind_speed_10 ?? w.wind_speed_30 ?? w.wind_speed_60;
    if (richtung === null || richtung === undefined) throw new Error('Keine Windmessung in der Nähe.');
    const st = stationVon(akt, 'wind_direction_10');
    return {
      richtung, kmh: kmh ?? null, boeen: w.wind_gust_speed_10 ?? w.wind_gust_speed_30 ?? null, temperatur: w.temperature ?? null,
      zeit: w.timestamp || jetzt.toISOString(), abgerufen: Date.now(), ort,
      station: st ? { name: st.station_name, km: Math.round((st.distance || 0) / 100) / 10 } : null,
      vorhersage: vorh && Array.isArray(vorh.weather) ? vorh.weather.filter(x => x.wind_direction !== null && new Date(x.timestamp) > jetzt).slice(0, 6)
        .map(x => ({ zeit: x.timestamp, richtung: x.wind_direction, kmh: x.wind_speed })) : [],
    };
  }
  // Wind: gemerkter Wert (≤ 20 min), sonst neu; manuell bestimmter Wind (≤ 6 h) hat Vorrang
  async function wind({ frisch = false, gps = false } = {}) {
    const alt = LS.get('gsz-wind');
    const ort = await standortHolen({ gps });
    const gleicherOrt = alt && alt.ort && Math.abs(alt.ort.lat - ort.lat) < 0.02 && Math.abs(alt.ort.lon - ort.lon) < 0.02;
    if (!frisch && !gps && alt && gleicherOrt && Date.now() - alt.abgerufen < WIND_GUELTIG_MS) return alt;
    try { const w = await windAbrufen(ort); LS.set('gsz-wind', w); return w; }
    catch (e) { if (alt) return { ...alt, alt: true, fehler: e.message }; throw e; }
  }
  function manuell() { const m = LS.get('gsz-wind-manuell'); return m && Date.now() - m.zeit < MANUELL_GUELTIG_MS ? m : null; }
  const windRichtung = w => { const m = manuell(); return m ? m.richtung : w ? w.richtung : null; };

  function windHtml(w, fehler) {
    const m = manuell();
    const von = m ? m.richtung : w ? w.richtung : null;
    if (von === null) return `<div class="lg-klein">${fehler ? 'Wind nicht abrufbar (' + esc(fehler) + ').' : 'Wind wird abgerufen …'}</div>`;
    const r = GG.himmelsrichtung(von), zug = GG.himmelsrichtung(GG.ausbreitungsrichtung(von));
    const kmh = !m && w && w.kmh !== null ? w.kmh : null;
    const staerke = kmh !== null ? `${Math.round(kmh)} km/h${w.boeen ? `, Böen ${Math.round(w.boeen)}` : ''} · ${GG.beaufort(kmh)} Bft` : '';
    const quelle = m ? `vor Ort bestimmt um ${uhrzeit(m.zeit)}` :
      `DWD ${w.station ? esc(w.station.name) + (w.station.km ? ` (${zahlText(w.station.km)} km entfernt)` : '') : ''}, Messung ${uhrzeit(w.zeit)}${w.alt ? ' · <b>Stand ohne Netz</b>' : ''}`;
    const stand = LS.get('gsz-ort') || (w && w.ort);
    const vorh = !m && w && w.vorhersage && w.vorhersage.length ? `<div class="lg-vorh" aria-label="Vorhersage">${w.vorhersage.map(v =>
      `<span>${uhrzeit(v.zeit)}${zugPfeil(GG.ausbreitungsrichtung(v.richtung))}<b>${GG.himmelsrichtung(v.richtung)}</b>${v.kmh !== null ? Math.round(v.kmh) + ' km/h' : ''}</span>`).join('')}</div>` : '';
    return `<div class="lg-wind">${rose(von)}
      <b class="gross">Wind aus ${esc(GG.RICHTUNG_LANG[r] || r)} (${Math.round(von)}°)</b>
      <span>Ausbreitung nach <span class="zug">${esc(GG.RICHTUNG_LANG[zug] || zug)}</span>${staerke ? ' · ' + staerke : ''}</span>
      <small>${quelle}</small><small class="lg-standort">📍 Standort: ${esc(ortText(stand))}</small></div>${vorh}
      <div class="lg-klein" style="margin-top:.45rem">Anfahrt und Aufstellung möglichst mit dem Wind im Rücken – also aus Richtung <b>${esc(GG.RICHTUNG_LANG[r] || r)}</b>.</div>`;
  }
  const kompassHtml = () => { const m = manuell(), r = m ? GG.himmelsrichtung(m.richtung) : '';
    return `<div class="lg-klein" style="margin-top:.6rem">Wind vor Ort bestimmt? Der Wind kommt aus …</div><div class="lg-kompass">${[['N', 0], ['NO', 45], ['O', 90], ['SO', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]]
      .map(([t, g]) => `<button type="button" data-wind="${g}" class="${t === r ? 'an' : ''}">${t}</button>`).join('')}</div>`; };

  // Karte „Wind“ mit Knöpfen; nachher: Rückruf nach jedem Neuzeichnen (z. B. Skizze aktualisieren)
  function windKarteBeleben(el, nachher) {
    const ziel = el.querySelector('[data-lg-wind]');
    if (!ziel) return;
    let w = LS.get('gsz-wind'), fehler = '';
    const zeichnen = () => {
      ziel.innerHTML = windHtml(w, fehler) + `<div class="lg-knoepfe">
        <button type="button" class="knopf" data-lg="neu">${ICON.neu}Neu abrufen</button>
        <button type="button" class="knopf" data-lg="gps">${ICON.ort}Standort neu bestimmen</button>
        ${manuell() ? '<button type="button" class="knopf" data-lg="dwd">DWD-Wert verwenden</button>' : '<button type="button" class="knopf" data-lg="manuell">Wind vor Ort eingeben</button>'}</div>
        <div data-lg-kompass hidden>${kompassHtml()}</div>`;
      ziel.querySelector('[data-lg="neu"]').addEventListener('click', () => laden({ frisch: true }));
      ziel.querySelector('[data-lg="gps"]').addEventListener('click', () => laden({ gps: true }));
      const dwd = ziel.querySelector('[data-lg="dwd"]'); if (dwd) dwd.addEventListener('click', () => { LS.set('gsz-wind-manuell', null); zeichnen(); });
      const man = ziel.querySelector('[data-lg="manuell"]'); if (man) man.addEventListener('click', () => { ziel.querySelector('[data-lg-kompass]').hidden = false; man.remove(); });
      for (const b of ziel.querySelectorAll('[data-wind]')) b.addEventListener('click', () => { LS.set('gsz-wind-manuell', { richtung: Number(b.dataset.wind), zeit: Date.now() }); zeichnen(); });
      if (nachher) nachher(windRichtung(w));
    };
    async function laden(opt = {}) {
      fehler = '';
      if (!w) zeichnen();
      try { w = await wind(opt); } catch (e) { fehler = e.message; }
      if (ziel.isConnected) zeichnen();
      const o = LS.get('gsz-ort');
      if (o && o.gps && !o.name) {
        try { const n = await ortName(o); const neu = LS.get('gsz-ort'); if (neu && neu.lat === o.lat && neu.lon === o.lon) { neu.name = n; LS.set('gsz-ort', neu); } if (ziel.isConnected) zeichnen(); }
        catch { /* ohne Ortsnamen */ }
      }
    }
    zeichnen();
    laden();
  }

  // ---------------------------------------------------------------- Absperrung
  // Skizze (nicht maßstäblich): Kreis = Erstabsperrung, Fläche in Zugrichtung = Schutzabstand (ERG) bzw. Gefahr in Windrichtung
  function skizzeSvg({ absperren_m, absperr_m, schutz_km, zone_m, zugGrad }) {
    const zug = zugGrad === null || zugGrad === undefined ? null : Math.round(zugGrad);
    const zone = zug === null ? '' : `<g transform="rotate(${zug} 150 150)">
        <path d="M150 150 L118 50 Q150 34 182 50 Z" fill="var(--warn)" fill-opacity=".28" stroke="var(--warn)" stroke-width="2"/>
        <path d="M150 128 V58 M141 70 L150 56 L159 70" fill="none" stroke="var(--warn)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;
    const zl = zug === null ? null : { x: 150 + Math.sin(zug * Math.PI / 180) * 118, y: 150 - Math.cos(zug * Math.PI / 180) * 118 };
    const anf = zug === null ? null : { x: 150 - Math.sin(zug * Math.PI / 180) * 112, y: 150 + Math.cos(zug * Math.PI / 180) * 112 };
    return `<svg class="lg-skizze" viewBox="0 0 300 300" role="img" aria-label="Skizze der Absperrung (nicht maßstäblich)">
      <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="4 5"/>
      ${zone}
      ${absperr_m ? '<circle cx="150" cy="150" r="78" fill="var(--good)" fill-opacity=".08" stroke="var(--good)" stroke-width="2" stroke-dasharray="6 5"/>' : ''}
      <circle cx="150" cy="150" r="46" fill="var(--crit)" fill-opacity=".2" stroke="var(--crit)" stroke-width="2.5"/>
      <circle cx="150" cy="150" r="6" fill="var(--crit)"/>
      <text x="150" y="${150 + 62}" text-anchor="middle">${absperren_m ? 'Gefahrenbereich ' + meter(absperren_m) : 'Gefahrenstelle'}</text>
      ${absperr_m ? `<text x="150" y="${150 + 94}" text-anchor="middle" style="opacity:.8">Absperrbereich ${meter(absperr_m)}</text>` : ''}
      ${zl ? `<text x="${zl.x > 200 ? 294 : zl.x < 100 ? 6 : zl.x}" y="${Math.min(288, Math.max(14, zl.y))}" text-anchor="${zl.x > 200 ? 'end' : zl.x < 100 ? 'start' : 'middle'}">${schutz_km ? 'ERG: Schutz ' + zahlText(schutz_km) + ' km' : zone_m ? 'ERG: Räumung ' + meter(zone_m) : 'Ausbreitung'}</text>` : ''}
      ${anf ? `<g transform="translate(${anf.x} ${anf.y})"><circle r="13" fill="var(--good)" fill-opacity=".25" stroke="var(--good)" stroke-width="2"/><text y="4" text-anchor="middle" style="font-size:10px">FW</text></g>` : ''}
      <g transform="translate(26 30)"><path d="M0 14 V-12 M-7 -4 L0 -13 L7 -4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><text x="0" y="28" text-anchor="middle">N</text></g>
      <text x="292" y="294" text-anchor="end" style="font-size:9px;opacity:.6">nicht maßstäblich</text></svg>`;
  }

  // Abstände für eine UN-Nummer (Inhalt der Karte bzw. des Reiters „Lage“)
  const km = (wert, plus) => wert === null || wert === undefined ? '–' : (plus ? '> ' : '') + zahlText(wert) + ' km';
  function jetztNacht() { const o = LS.get('gsz-ort') || MIEHLEN; try { return GG.istNacht(o.lat, o.lon); } catch { const h = new Date().getHours(); return h < 7 || h >= 18; } }
  function abstaendeHtml(un, { voll = false } = {}) {
    const a = un ? GG.absperrung(un) : null;
    const nacht = jetztNacht(), w = LS.get('gsz-wind'), wk = GG.windklasse(w && !manuell() ? w.kmh : null);
    const tn = (x, k) => x ? `<b class="${nacht ? '' : 'jetzt'}">Tag ${km(x.tag_km, x.tag_plus)}</b> · <b class="${nacht ? 'jetzt' : ''}">Nacht ${km(x.nacht_km, x.nacht_plus)}</b>` : '';
    const kacheln = [];
    const lfNr = a ? [...new Set(a.leitfaeden.map(l => l.nr + (l.polymer ? 'P' : '')))].join('/') : '';
    if (a && a.absperren_m) kacheln.push(`<div class="lg-abstand" style="--c:var(--crit)"><b>${meter(a.absperren_m)}</b><span>ERG: sofort in alle Richtungen absperren${a.absperren_fest_m ? ` (Feststoffe ${meter(a.absperren_fest_m)})` : ''} · Leitfaden ${esc(lfNr)}</span></div>`);
    if (a && a.schutz && a.schutz.klein) kacheln.push(`<div class="lg-abstand" style="--c:var(--warn)"><span>Kleiner Austritt (bis ca. 200 l): absperren ${meter(a.schutz.klein.absperren_m)}, Schutz in Windrichtung</span><b style="font-size:1.05rem">${tn(a.schutz.klein)}</b></div>`);
    if (a && a.schutz && a.schutz.gross) kacheln.push(`<div class="lg-abstand" style="--c:var(--ser)"><span>Großer Austritt: absperren ${meter(a.schutz.gross.absperren_m)}, Schutz in Windrichtung</span><b style="font-size:1.05rem">${tn(a.schutz.gross)}</b></div>`);
    if (a && !a.schutz && a.gross_m) kacheln.push(`<div class="lg-abstand" style="--c:var(--ser)"><b>${meter(a.gross_m)}</b><span>großer Austritt: Räumung ${a.grossRichtung ? 'in Windrichtung ' : ''}erwägen</span></div>`);
    if (a && a.brand_m) kacheln.push(`<div class="lg-abstand" style="--c:var(--ser)"><b>${meter(a.brand_m)}</b><span>${esc(a.brandText || 'Brand eines Tanks: in alle Richtungen absperren')}</span></div>`);
    if (a && !a.schutz && a.schutzWasser && a.schutzWasser.klein) kacheln.push(`<div class="lg-abstand" style="--c:var(--akzent)"><span>Austritt in ein Gewässer (giftige Gase): absperren ${meter(a.schutzWasser.klein.absperren_m)}, Schutz</span><b style="font-size:1.05rem">${tn(a.schutzWasser.klein)}</b></div>`);
    // Tabelle 3: große Austritte der sechs häufigen giftigen Gase je Behälter und Wind
    let t3 = '';
    if (a && a.tabelle3 && (voll || (a.schutz && a.schutz.tabelle3))) {
      const wert = (x, i) => `<span class="${i === wk ? 'jetzt' : ''}">${km(x.km, x.plus).replace(' km', '')}</span>`;
      t3 = `<details class="ez-mehr" style="margin-top:.55rem" ${voll ? 'open' : ''}><summary>Großer Austritt nach Behälter und Wind (ERG Tabelle 3)</summary><div class="inhalt">
        <table class="ez-tabelle lg-t3"><thead><tr><th>Behälter</th><th>absperren</th><th>Schutz ${nacht ? 'nachts' : 'tags'} in km<br><small>Wind schwach · mäßig · stark</small></th></tr></thead>
        <tbody>${a.tabelle3.behaelter.map(b => `<tr><td>${esc(b.art)}</td><td>${meter(b.absperren_m)}</td><td class="km">${(nacht ? b.nacht : b.tag).map(wert).join(' · ')}</td></tr>`).join('')}</tbody></table>
        <div class="lg-klein">${nacht ? 'Nachtwerte – jetzt ist Nacht' : 'Tagwerte – jetzt ist Tag'} (Sonnenstand). Wind: schwach unter 10 km/h, mäßig 10–20, stark über 20${wk !== null ? '; der aktuelle Wind ist hervorgehoben' : ''}.</div></div></details>`;
    }
    const gl = GG.GRUNDLAGEN[grundlage()], rg = GG.regeln(grundlage());
    const bereiche = `<div class="lg-abstaende" data-lg-bereiche><div class="lg-abstand" style="--c:var(--crit)"><b>${gl.gefahrenbereich_m} m</b><span>Gefahrenbereich – ${esc(gl.gefahrText)}</span></div>
      <div class="lg-abstand" style="--c:var(--good)"><b>${gl.absperrbereich_m ? gl.absperrbereich_m + ' m' : 'nach Lage'}</b><span>Absperrbereich – ${esc(gl.absperrText)}</span></div></div>`;
    const fwHtml = voll && rg.length ? `<div style="margin-top:.7rem"><b style="font-size:.88rem">${esc(gl.lang)}</b><ul class="lg-fwdv lg-klein" style="margin:.3rem 0 0;padding-left:1.05rem">${rg.map(f => `<li><b>${esc(f.titel)}:</b> ${esc(f.text)} <i>(${esc(f.quelle)})</i></li>`).join('')}</ul></div>` : '';
    const lf = a ? a.leitfaeden : [];
    const lfHtml = voll && lf.length ? `<div class="lg-klein" style="margin-top:.5rem">${[...new Map(lf.map(l => [l.nr + l.name, l])).values()].map(l => `ERG-Leitfaden <b>${esc(l.nr)}${l.polymer ? 'P' : ''}</b>${l.titel ? ' – ' + esc(l.titel) : ''}${l.name ? ` (${esc(l.name)})` : ''}`).join('<br>')}</div>` : '';
    const hinweise = a && a.hinweise.length ? `<div class="ez-warn" style="margin-top:.5rem">${a.hinweise.map(esc).join('<br>')}</div>` : '';
    const ohne = !a || (!a.absperren_m && !lf.length) ? `<div class="lg-klein">${un ? `Für UN ${esc(un)} liegen keine ERG-Anhaltswerte vor.` : 'Keine UN-Nummer bekannt – Bereiche nach Lage und Erkundung.'}</div>` : '';
    const schutz_km = a && a.schutz && a.schutz.klein ? (nacht ? a.schutz.klein.nacht_km : a.schutz.klein.tag_km) : null;
    return { html: reglerHtml() + bereiche + `<div class="lg-ergaenzend">Ergänzend${un ? ' für UN ' + esc(un) : ''}: Anhaltswerte nach ERG 2024</div>` +
      (kacheln.length ? `<div class="lg-abstaende">${kacheln.join('')}</div>` : '') + ohne + hinweise + t3 + lfHtml + fwHtml +
      `<div class="lg-quelle">Grundlage: ${esc(gl.lang)}${grundlage() === 'fwdv500' ? ' (freigegeben)' : ''}. Die ERG-Werte (Emergency Response Guidebook 2024, Tag/Nacht nach Sonnenstand) helfen beim Anpassen nach der Erkundung. Lage, Messwerte und Weisung der Einsatzleitung gehen vor.</div>`,
      gefahr_m: gl.gefahrenbereich_m, absperr_m: gl.absperrbereich_m, erg_m: a && a.absperren_m, schutz_km, zone_m: !schutz_km && a && a.gross_m ? a.gross_m : null };
  }

  // Karte auf der Übersicht eines Stoffs
  function stoffKarteHtml(stoff, basis) {
    const un = stoff && stoff.transport && stoff.transport.un;
    const ab = abstaendeHtml(un);
    return `<section class="kachel ez-karte" id="lg-karte"><h2>Absperren · Wind</h2>${ab.html}
      <div data-lg-wind style="margin-top:.7rem"></div>
      <div style="margin-top:.55rem"><a class="knopf" href="${esc(basis)}/lage" data-ersetzen="1">${ICON.wind}Skizze, FwDV 500 und alle Abstände</a></div></section>`;
  }
  // Reiter „Lage“ eines Stoffs
  function stoffTeilHtml(stoff) {
    const un = stoff && stoff.transport && stoff.transport.un;
    const ab = abstaendeHtml(un, { voll: true });
    return `<section class="kachel ez-karte"><h2>Wind</h2><div data-lg-wind></div></section>
      <section class="kachel ez-karte"><h2>Absperren${un ? ' · UN ' + esc(un) : ''}</h2>
        <div class="lg-karte-rahmen" data-lg-karte-rahmen><div class="lg-karte" data-lg-karte data-abs="${ab.gefahr_m || ''}" data-absperr="${ab.absperr_m || ''}" data-erg="${ab.erg_m || ''}" data-schutz="${ab.schutz_km || ''}" data-zone="${ab.zone_m || ''}"></div>
          <div class="lg-karte-wind" data-lg-karte-wind hidden></div></div>
        <div class="lg-legende"><span><i style="--c:#e5484d"></i>Gefahrenbereich</span>${ab.absperr_m ? '<span><i style="--c:#26a95b"></i>Absperrbereich</span>' : ''}${ab.erg_m && ab.erg_m > (ab.gefahr_m || 0) ? '<span><i style="--c:#f0794a"></i>ERG: sofort absperren</span>' : ''}${ab.schutz_km || ab.zone_m ? '<span><i style="--c:#f2b01e"></i>ERG: Zone in Windrichtung</span>' : ''}<span><i style="--c:#4c8df0"></i>mein Standort</span></div>
        <div class="lg-karte-knoepfe"><button type="button" class="knopf" data-lg-k="mitte">Unfallort = Kartenmitte</button><button type="button" class="knopf" data-lg-k="ich">Unfallort = mein Standort</button>
          <button type="button" class="knopf" data-lg-k="ganz">Alles zeigen</button><button type="button" class="knopf" data-lg-k="gross">Karte groß</button></div>
        <div class="lg-klein" data-lg-k-info></div>
        <div data-lg-skizze hidden data-abs="${ab.gefahr_m || ''}" data-absperr="${ab.absperr_m || ''}" data-schutz="${ab.schutz_km || ''}" data-zone="${ab.zone_m || ''}"></div>${ab.html}</section>`;
  }
  // ---------------------------------------------------------------- Karte: Google-Schlüssel (zentral) und Steuerung
  // Einsatz/_App/Karte/karte.json = { google: '<Schlüssel der Maps JavaScript API>' } – gilt für alle Geräte; ohne Schlüssel OpenStreetMap
  const KARTE_PFAD = '_App/Karte/karte.json';
  const googleSchluessel = () => { const k = LS.get('gsz-karte'); return k && k.google ? String(k.google) : ''; };
  async function karteEinstLaden() {
    const E = einsatz(), a = E && E.ad && E.ad();
    if (!a || !a.verbunden || !a.verbunden() || !a.datei) return;
    if (!(E.dateien || []).some(d => !d.ordner && String(d.pfad).normalize('NFC') === KARTE_PFAD)) { if ((E.dateien || []).length && !(LS.get('gsz-karte') || {}).lokal) LS.set('gsz-karte', null); return; }
    try { const j = JSON.parse(await (await a.datei(KARTE_PFAD)).text()); if (j && typeof j === 'object') LS.set('gsz-karte', j); } catch { /* gemerkter Stand */ }
  }
  async function googleEinrichten() {
    const alt = googleSchluessel();
    const k = prompt(alt ? 'Google-Maps-Schlüssel ändern (leer = entfernen, dann OpenStreetMap):' :
      'Schlüssel der Google Maps JavaScript API eingeben (Google Cloud › APIs › Anmeldedaten). Er gilt für alle Geräte:', alt);
    if (k === null) return false;
    const E = einsatz(), a = E && E.ad && E.ad();
    if (!a || !a.ablegen || !a.verbunden()) { melde('Dafür braucht die App die Verbindung zum Dropbox-App-Ordner.', 6000); return false; }
    const neu = { google: k.trim(), geaendert: new Date().toISOString(), lokal: true };
    try { await a.ablegen('_App', 'Karte', [{ name: 'karte.json', blob: new Blob([JSON.stringify({ google: neu.google, geaendert: neu.geaendert }, null, 1)], { type: 'application/json' }) }]); }
    catch (e) { melde('Nicht gespeichert: ' + e.message, 7000); return false; }
    LS.set('gsz-karte', neu);
    melde(neu.google ? 'Google Maps eingerichtet – gilt für alle Geräte.' : 'Google-Schlüssel entfernt – Karte von OpenStreetMap.', 6000);
    return true;
  }
  // Wind auf der Karte (oben rechts)
  function windAufKarte(el, von) {
    const z = el.querySelector('[data-lg-karte-wind]');
    if (!z) return;
    if (von === null || von === undefined) { z.hidden = true; return; }
    const r = GG.himmelsrichtung(von), zug = GG.himmelsrichtung(GG.ausbreitungsrichtung(von));
    z.innerHTML = `${zugPfeil(GG.ausbreitungsrichtung(von))}<span>Wind aus ${esc(GG.RICHTUNG_LANG[r] || r)} · Ausbreitung nach ${esc(GG.RICHTUNG_LANG[zug] || zug)}</span>`;
    z.hidden = false;
  }
  // Karte im Reiter „Wind/Absperren“ starten: Unfallort = gemerkter Unfallort, sonst mein Standort (GPS)
  async function karteStarten(el, kEl, zugJetzt) {
    if (!window.GSZKarte) return null;
    const info = el.querySelector('[data-lg-k-info]'), sk = el.querySelector('[data-lg-skizze]'), rahmen = el.querySelector('[data-lg-karte-rahmen]');
    const d = kEl.dataset, zahl = x => Number(x) || null;
    await karteEinstLaden().catch(() => {});
    const st = await standortHolen().catch(() => MIEHLEN);
    const u = GSZKarte.unfallort() || GSZKarte.unfallortSetzen(st, st.gps ? 'gps' : 'standard');
    const nacht = jetztNacht(), schutz = zahl(d.schutz), zoneM = schutz ? schutz * 1000 : zahl(d.zone);
    let k;
    const infoZeigen = async () => {
      const o = GSZKarte.unfallort() || u;
      const art = o.art === 'hand' ? 'von Hand gesetzt' : o.art === 'gps' ? 'mein Standort' : 'Standard';
      const zeile = name => `<b>Unfallort:</b> ${esc(name || `${o.lat.toFixed(5)}, ${o.lon.toFixed(5)}`)} <i>(${art})</i> · Karte: ${k && k.art === 'google' ? 'Google Maps' : 'OpenStreetMap'}` +
        `${k && k.fehler ? ' <span style="color:var(--crit)">(Google: ' + esc(k.fehler) + ')</span>' : ''} · <a href="#" data-lg-google>${googleSchluessel() ? 'Google-Schlüssel ändern' : 'Google Maps einrichten'}</a>`;
      info.innerHTML = zeile('');
      const g = () => { const a = info.querySelector('[data-lg-google]'); if (a) a.addEventListener('click', async e => { e.preventDefault(); if (await googleEinrichten()) neuAufbauen(); }); };
      g();
      try { const n = await ortName(o); if (n && info.isConnected) { info.innerHTML = zeile(n); g(); } } catch { /* Koordinaten bleiben */ }
    };
    try {
      k = await GSZKarte.zeigen(kEl, { unfallort: u, standort: st.standard ? null : st, gefahr_m: zahl(d.abs), absperr_m: zahl(d.absperr), ergAbs_m: zahl(d.erg),
        zone: zoneM ? { m: zoneM, text: schutz ? `ERG: Schutzabstand ${zahlText(schutz)} km in Windrichtung (${nacht ? 'Nacht' : 'Tag'})` : `ERG: Räumung in Windrichtung erwägen (${meter(zoneM)})` } : null,
        zugGrad: zugJetzt(), google: googleSchluessel(), beiVerschieben: () => infoZeigen() });
    } catch (e) {
      if (rahmen) rahmen.hidden = true;
      if (sk) sk.hidden = false;
      for (const b of el.querySelectorAll('[data-lg-k]')) b.hidden = true;
      info.textContent = 'Karte nicht verfügbar (' + e.message + ') – stattdessen die Skizze.';
      return null;
    }
    infoZeigen();
    for (const b of el.querySelectorAll('[data-lg-k]')) b.addEventListener('click', async () => {
      const w = b.dataset.lgK;
      if (w === 'mitte') { const m = k.mitte(); GSZKarte.unfallortSetzen(m, 'hand'); k.setzen({ unfallort: m }); infoZeigen(); }
      if (w === 'ich') {
        try { const s2 = await standortHolen({ gps: true }); GSZKarte.unfallortSetzen(s2, 'gps'); k.setzen({ unfallort: s2, standort: s2 }); k.zentrieren(); infoZeigen(); }
        catch (e) { melde(e.message, 7000); }
      }
      if (w === 'ganz') k.zentrieren();
      if (w === 'gross') { rahmen.classList.toggle('gross'); b.textContent = rahmen.classList.contains('gross') ? 'Karte klein' : 'Karte groß';
        setTimeout(() => { k.groesse(); k.zentrieren(); }, 60); }
    });
    return k;
  }

  // Ereignisse einer Seite anbinden (Wind laden, Skizze bzw. Karte nach Windrichtung zeichnen)
  function beleben(el) {
    const sk = el.querySelector('[data-lg-skizze]'), kEl = el.querySelector('[data-lg-karte]');
    let zug = null, karte = null;
    if (kEl) karteStarten(el, kEl, () => zug).then(k => { karte = k; if (k) k.setzen({ zugGrad: zug }); });
    windKarteBeleben(el, von => {
      zug = von === null || von === undefined ? null : GG.ausbreitungsrichtung(von);
      windAufKarte(el, von);
      if (karte) karte.setzen({ zugGrad: zug });
      if (sk) sk.innerHTML = skizzeSvg({ absperren_m: Number(sk.dataset.abs) || null, absperr_m: Number(sk.dataset.absperr) || null, schutz_km: Number(sk.dataset.schutz) || null, zone_m: Number(sk.dataset.zone) || null,
        zugGrad: von === null || von === undefined ? null : GG.ausbreitungsrichtung(von) });
    });
    if (sk && !sk.innerHTML) sk.innerHTML = skizzeSvg({ absperren_m: Number(sk.dataset.abs) || null, absperr_m: Number(sk.dataset.absperr) || null, schutz_km: Number(sk.dataset.schutz) || null, zone_m: Number(sk.dataset.zone) || null, zugGrad: null });
    // Regler: zentral umschalten (FwDV 500 nur mit Freigabe-PIN), danach die Seite neu aufbauen; Regelwerk aus der Dropbox nachladen
    for (const b of el.querySelectorAll('.lg-regel [data-regel]')) b.addEventListener('click', async () => { if (await umschalten(b.dataset.regel)) neuAufbauen(); });
    const vorher = grundlage();
    regelwerkLaden().then(() => { if (grundlage() !== vorher && el.isConnected) neuAufbauen(); });
  }

  function neuAufbauen() { if (window.GSZ && GSZ.aktuell) { const { ansicht, param } = GSZ.aktuell; if (ansicht === 'stoff' || ansicht === 'sdb') GSZ.zeige(ansicht + '/' + param, true); } }

  // ---------------------------------------------------------------- Einsatz-Start: Wind und Warntafel
  function startHtml() {
    return `<section class="ez-bereich" id="lg-start"><h2>Lage <small>Wind vom DWD, Warntafel</small></h2>
      <div class="kachel ez-karte"><div data-lg-wind></div></div></section>`;
  }

  // ---------------------------------------------------------------- Warntafel: eintippen oder fotografieren
  // ziel: Element, in das die Tafel kommt; suchen(text): Stoffsuche der Einsatz-Seite
  function warntafelOeffnen(ziel, { suchen, kemler = '', un = '' } = {}) {
    ziel.innerHTML = `<div class="kachel ez-karte" id="lg-warntafel"><h2>Warntafel</h2>
      <div class="lg-tafel-wahl"><div class="lg-tafel" role="group" aria-label="Warntafel">
          <input id="lg-kemler" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="4" placeholder="33" aria-label="Nummer zur Kennzeichnung der Gefahr (oben)" value="${esc(kemler)}">
          <input id="lg-un" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="1203" aria-label="UN-Nummer (unten)" value="${esc(un)}"></div>
        <div class="lg-tafel-info" id="lg-tafel-info"></div></div>
      <div class="lg-knoepfe"><label class="knopf lg-foto">${ICON.kamera}Warntafel fotografieren<input type="file" id="lg-foto" accept="image/*" capture="environment" aria-label="Warntafel fotografieren"></label>
        <button type="button" class="knopf" id="lg-suchen">Stoff zur UN-Nummer suchen</button></div>
      <div class="lg-klein" id="lg-foto-stand" style="margin-top:.4rem"></div>
      <div class="lg-quelle">Gefahrnummern nach ADR 2025 (5.3.2.3) · Benennungen nach ADR Tabelle A aus Wikipedia „Liste der UN-Nummern“ (CC BY-SA 4.0) · Gefahrenbereich nach Gefahrstoffkonzept RLP, ergänzend ERG 2024 – ohne Netz verfügbar.</div></div>`;
    const kF = ziel.querySelector('#lg-kemler'), uF = ziel.querySelector('#lg-un'), info = ziel.querySelector('#lg-tafel-info'), stand = ziel.querySelector('#lg-foto-stand');
    const zeigen = () => {
      const g = GG.gefahrnummer(kF.value), u = (uF.value.match(/\d{4}/) || [''])[0];
      const namen = u ? GG.unEintraege(u) : [];
      const passt = g && u ? GG.tafelPasst(g.code, u) : null;
      const a = u ? GG.absperrung(u) : null;
      info.innerHTML = (g ? `<div class="gn"><b>${esc(g.code)}</b> – ${g.text ? esc(g.text) : esc(g.teile.map(t => t.text + (t.verstaerkt ? ' (verstärkt)' : '')).filter(Boolean).join(', '))}
          ${g.x ? `<div class="lg-warn-x">X: ${esc(g.xText)}</div>` : ''}</div>` : kF.value.trim() ? '<div class="lg-klein">Gefahrnummer oben: 2–3 Ziffern, ggf. mit X davor.</div>' : '') +
        (u ? namen.length ? `<div><b>UN ${esc(u)}</b><ul>${namen.slice(0, 5).map(n => `<li>${esc(n.name)}${n.klasse ? ` <span class="lg-klein">Klasse ${esc(n.klasse)}${n.gefahrnummer ? ', Gefahrnr. ' + esc(n.gefahrnummer) : ''}</span>` : ''}</li>`).join('')}${namen.length > 5 ? `<li class="lg-klein">… und ${namen.length - 5} weitere</li>` : ''}</ul></div>`
          : `<div><b>UN ${esc(u)}</b> <span class="lg-klein">– keine Benennung gespeichert, bitte suchen.</span></div>` : '') +
        (passt === false ? '<div class="ez-warn">Diese Gefahrnummer gehört laut ADR zu keinem Eintrag dieser UN-Nummer – Ablesung prüfen.</div>' : '') +
        (u ? `<div>Gefahrenbereich zunächst <b>${GG.GRUNDLAGEN[grundlage()].gefahrenbereich_m} m</b> <span class="lg-klein">(${esc(GG.GRUNDLAGEN[grundlage()].name)})</span></div>` : '') +
        (a && a.absperren_m ? `<div class="lg-klein">Ergänzend nach ERG 2024: sofort ${meter(a.absperren_m)} rundum${a.schutz && a.schutz.klein ? `; Schutzabstand in Windrichtung ${jetztNacht() ? km(a.schutz.klein.nacht_km, a.schutz.klein.nacht_plus) + ' (Nacht)' : km(a.schutz.klein.tag_km, a.schutz.klein.tag_plus) + ' (Tag)'}` : ''}</div>` : '');
    };
    kF.addEventListener('input', () => { kF.value = kF.value.toUpperCase().replace(/[^0-9X]/g, ''); zeigen(); });
    uF.addEventListener('input', () => { uF.value = uF.value.replace(/\D/g, ''); zeigen(); if (uF.value.length === 4) uF.blur(); });
    ziel.querySelector('#lg-suchen').addEventListener('click', () => { const u = (uF.value.match(/\d{4}/) || [''])[0]; if (u && suchen) suchen(u); else uF.focus(); });
    const foto = ziel.querySelector('#lg-foto');
    foto.addEventListener('change', async () => {
      const datei = foto.files && foto.files[0]; foto.value = '';
      if (!datei) return;
      if (!window.GSZOcr || !GSZOcr.warntafel) { stand.textContent = 'Texterkennung nicht verfügbar – bitte eintippen.'; return; }
      stand.textContent = 'Warntafel wird gelesen …';
      try {
        const r = await GSZOcr.warntafel(datei, (t, anteil) => { stand.textContent = t + (anteil ? ` ${Math.round(anteil * 100)} %` : ''); });
        if (r.kemler) kF.value = r.kemler;
        if (r.un) uF.value = r.un;
        zeigen();
        stand.textContent = r.un || r.kemler ? `Gelesen: ${r.kemler || '?'} / ${r.un || '?'} – bitte mit der Tafel vergleichen.` : 'Keine Nummern erkannt – bitte näher heran, gerade und ohne Spiegelung fotografieren oder eintippen.';
      } catch (e) { stand.textContent = 'Nicht lesbar: ' + e.message; }
    });
    zeigen();
    return { kF, uF };
  }

  window.GSZLage = { wind, standortHolen, ortName, startHtml, beleben, stoffKarteHtml, stoffTeilHtml, warntafelOeffnen, skizzeSvg, windHtml, abstaendeHtml,
    grundlage, regelwerkLaden, umschalten, googleSchluessel };
})();
