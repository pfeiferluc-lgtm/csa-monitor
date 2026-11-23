// Navigation in der App (Anfahrt, seit 2.12.0 – Wunsch Lucas 23.11.2026: „Route und Navigation möglichst in der App“).
// Führt mit GPS über die gewählte Route (OSRM, OpenStreetMap) und hält an der Absperrgrenze statt an der Adresse:
// Abbiegehinweise mit Entfernung, Sprachansage (deutsch), Restweg bis zur Absperrgrenze und Ankunftszeit, Warnung vor dem
// Bereich in Windrichtung, neue Route beim Verlassen der Strecke, Bildschirm bleibt an (Wake Lock).
// Teil 1 (Rechnen, auch in Node für Tests): window.GSZNaviLogik / module.exports
// Teil 2 (Oberfläche, nur im Browser): window.GSZNavigation = { starten(opts), laeuft(), beenden() }
// Grenzen der Web-App auf dem iPhone: Standort gibt es nur, solange die App im Vordergrund und der Bildschirm an ist.
'use strict';
(function (wurzel, fabrik) {
  const node = typeof module === 'object' && module.exports;
  const m = fabrik(node ? require('./gefahrgut') : wurzel.GSZGefahrgut);
  if (node) module.exports = m; else wurzel.GSZNaviLogik = m;
})(typeof self !== 'undefined' ? self : this, function (GG) {
  const RAD = Math.PI / 180;
  // OSRM-Route (routes[i] mit geometry geojson und steps) → { punkte, kum, m, s, schritte }
  function routeAufbereiten(r) {
    const punkte = ((r && r.geometry && r.geometry.coordinates) || []).map(([lon, lat]) => ({ lat, lon }));
    const kum = [0];
    for (let i = 1; i < punkte.length; i++) kum.push(kum[i - 1] + GG.abstandM(punkte[i - 1], punkte[i]));
    const route = { punkte, kum, m: kum[kum.length - 1] || 0, s: (r && r.duration) || 0, schritte: [] };
    let vonI = 0, kumAb = 0;
    for (const st of (r && r.legs && r.legs[0] && r.legs[0].steps) || []) {
      const mv = st.maneuver || {}, ort = mv.location ? { lon: mv.location[0], lat: mv.location[1] } : null;
      // Lage des Schritts auf der Route: Projektion des Manöverpunkts, immer vorwärts (Schleifen springen nicht zurück)
      if (ort && punkte.length > 1) { const p = projizieren(route, ort, { von: vonI }); kumAb = Math.max(kumAb, p.entlang_m); vonI = p.i; }
      route.schritte.push({ typ: mv.type || '', mod: mv.modifier || '', exit: mv.exit || 0, name: st.name || '', ref: st.ref || '', ort, kum_m: kumAb });
    }
    return route;
  }
  // Position auf die Route legen → { i (Abschnitt), entlang_m, quer_m, punkt }. von/bis begrenzen die Suche (Abschnitte).
  function projizieren(route, pos, { von = 0, bis = Infinity } = {}) {
    const P = route.punkte, n = P.length;
    if (n < 2) return { i: 0, entlang_m: 0, quer_m: n ? GG.abstandM(P[0], pos) : Infinity, punkt: P[0] || pos };
    const kx = Math.cos(pos.lat * RAD) * 111320, ky = 110574;
    let best = null;
    for (let i = Math.max(0, von); i < Math.min(n - 1, bis); i++) {
      const ax = (P[i].lon - pos.lon) * kx, ay = (P[i].lat - pos.lat) * ky, bx = (P[i + 1].lon - pos.lon) * kx, by = (P[i + 1].lat - pos.lat) * ky;
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      const qx = ax + t * dx, qy = ay + t * dy, d = Math.hypot(qx, qy);
      if (!best || d < best.quer_m - 0.01) best = { i, t, quer_m: d };
    }
    if (!best) return { i: 0, entlang_m: 0, quer_m: Infinity, punkt: P[0] };
    const a = P[best.i], b = P[best.i + 1];
    return { i: best.i, entlang_m: route.kum[best.i] + best.t * (route.kum[best.i + 1] - route.kum[best.i]), quer_m: best.quer_m,
      punkt: { lat: a.lat + (b.lat - a.lat) * best.t, lon: a.lon + (b.lon - a.lon) * best.t } };
  }
  // Wo erreicht die Route erstmals die Absperrgrenze (Kreis um die Einsatzstelle)? → Meter entlang der Route
  function grenzeEntlang(route, ziel, grenze_m) {
    const P = route.punkte;
    for (let i = 0; i < P.length; i++) {
      const d = GG.abstandM(ziel, P[i]);
      if (d <= grenze_m) {
        if (!i) return 0;
        const d0 = GG.abstandM(ziel, P[i - 1]), t = d0 > d ? Math.min(1, Math.max(0, (d0 - grenze_m) / (d0 - d))) : 1;
        return route.kum[i - 1] + t * (route.kum[i] - route.kum[i - 1]);
      }
    }
    return route.m;
  }
  // Schritte ohne eigenes Manöver: Start, Verlassen des Kreisverkehrs (steht schon in „die 2. Ausfahrt“), bloßer Namenswechsel
  const still = s => s.typ === 'depart' || s.typ === 'exit roundabout' || s.typ === 'exit rotary' ||
    (/^(new name|continue|notification|use lane)$/.test(s.typ) && (!s.mod || s.mod === 'straight'));
  // nächster Schritt nach der Position → { index, schritt, bis_m, danach }
  function naechster(route, entlang_m) {
    const l = route.schritte;
    for (let k = 0; k < l.length; k++) {
      if (still(l[k]) || l[k].kum_m <= entlang_m + 3) continue;
      let d = null;
      for (let j = k + 1; j < l.length; j++) if (!still(l[j])) { d = l[j]; break; }
      return { index: k, schritt: l[k], bis_m: l[k].kum_m - entlang_m, danach: d };
    }
    return null;
  }

  // ---------------------------------------------------------------- Anweisungen (deutsch)
  const RICHT = { left: 'links', right: 'rechts', 'slight left': 'leicht links', 'slight right': 'leicht rechts', 'sharp left': 'scharf links',
    'sharp right': 'scharf rechts', straight: 'geradeaus', uturn: 'wenden' };
  const gross = t => t ? t[0].toUpperCase() + t.slice(1) : t;
  const strasse = s => s.name && s.ref && !s.name.includes(s.ref) ? `${s.name} (${s.ref})` : s.name || s.ref || '';
  // → { text, symbol } – symbol: links, rechts, leicht-links, leicht-rechts, scharf-links, scharf-rechts, gerade, wenden, kreisel, ziel
  function anweisung(s) {
    if (!s) return { text: '', symbol: 'gerade' };
    const r = RICHT[s.mod] || '', str = strasse(s), auf = str ? ` auf ${str}` : '';
    const symbol = s.typ === 'arrive' ? 'ziel' : s.typ === 'depart' ? 'gerade' : /roundabout|rotary/.test(s.typ) && !/exit/.test(s.typ) ? 'kreisel' :
      s.mod === 'uturn' ? 'wenden' : s.mod ? s.mod.replace(' ', '-').replace('left', 'links').replace('right', 'rechts').replace('slight', 'leicht').replace('sharp', 'scharf').replace('straight', 'gerade') : 'gerade';
    let text;
    switch (s.typ) {
      case 'depart': text = `Losfahren${auf}`; break;
      case 'arrive': text = 'Einsatzstelle erreicht'; break;
      case 'turn': text = s.mod === 'uturn' ? 'Wenden' + auf : s.mod === 'straight' ? 'Geradeaus weiterfahren' + auf : `${gross(r)} abbiegen${auf}`; break;
      case 'end of road': text = `Am Ende der Straße ${r || 'abbiegen'}${r ? ' abbiegen' : ''}${auf}`; break;
      case 'new name': case 'continue': text = /left|right/.test(s.mod) ? `${gross(r)} halten${auf}` : s.mod === 'uturn' ? 'Wenden' + auf : `Weiter${auf}`; break;
      case 'merge': text = `Einfädeln${r && r !== 'geradeaus' ? ' nach ' + r : ''}${auf}`; break;
      case 'on ramp': text = `Auffahrt${r && r !== 'geradeaus' ? ' ' + r : ''} nehmen${auf}`; break;
      case 'off ramp': text = `Ausfahrt${r && r !== 'geradeaus' ? ' ' + r : ''} nehmen${auf}`; break;
      case 'fork': text = `An der Gabelung ${r || 'weiter'}${r ? ' halten' : ''}${auf}`; break;
      case 'roundabout': case 'rotary': text = s.exit ? `Im Kreisverkehr die ${s.exit}. Ausfahrt nehmen${auf}` : `In den Kreisverkehr fahren${auf}`; break;
      case 'roundabout turn': text = `Am Kreisverkehr ${r || 'weiter'}${r ? ' abbiegen' : ''}${auf}`; break;
      case 'exit roundabout': case 'exit rotary': text = `Kreisverkehr verlassen${auf}`; break;
      default: text = r && r !== 'geradeaus' ? `${gross(r)} halten${auf}` : `Weiter${auf}`;
    }
    return { text, symbol };
  }
  // Entfernung für Anzeige und Ansage
  function meterAnzeige(m) {
    if (m < 0) m = 0;
    if (m >= 1000) return String(Math.round(m / 100) / 10).replace('.', ',') + ' km';
    return (m >= 100 ? Math.round(m / 50) * 50 : Math.max(10, Math.round(m / 10) * 10)) + ' m';
  }
  function meterGesprochen(m) {
    if (m >= 1000) { const k = Math.round(m / 100) / 10; return (k === 1 ? 'einem' : String(k).replace('.', ',')) + ' Kilometer' + (k === 1 ? '' : 'n'); }
    return (m >= 100 ? Math.round(m / 50) * 50 : Math.max(10, Math.round(m / 10) * 10)) + ' Metern';
  }
  // Ansage für einen Schritt: weit vorher „In 300 Metern rechts abbiegen auf …“, kurz davor „Jetzt rechts abbiegen“
  function ansage(s, bis_m, jetzt = false) {
    const t = anweisung(s).text;
    if (!t) return '';
    const klein = t[0].toLowerCase() + t.slice(1);
    return jetzt ? 'Jetzt ' + klein : `In ${meterGesprochen(bis_m)} ${klein}`;
  }
  // Ansagepunkte je Geschwindigkeit (m/s): früh (ca. 20 s vorher, mindestens 250 m) und kurz davor (ca. 5 s, mindestens 40 m)
  const ansagePunkte = v => ({ frueh: Math.max(250, (v || 0) * 20), nah: Math.max(50, (v || 0) * 5) });

  return { routeAufbereiten, projizieren, grenzeEntlang, naechster, anweisung, ansage, meterAnzeige, meterGesprochen, ansagePunkte, strasse };
});

// ==================================================================== Teil 2: Oberfläche (nur im Browser)
if (typeof window !== 'undefined' && typeof document !== 'undefined') (() => {
  const NL = window.GSZNaviLogik, GG = window.GSZGefahrgut;
  if (!NL || !GG) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const uhr = t => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } } };
  const SVG = (inhalt, w = 2.4) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
  const PFEIL = {
    gerade: SVG('<path d="M12 21V4M6 10l6-6 6 6"/>', 2.8),
    links: SVG('<path d="M17 21v-8a3 3 0 0 0-3-3H5M10 5 5 10l5 5"/>', 2.8),
    rechts: SVG('<path d="M7 21v-8a3 3 0 0 1 3-3h9M14 5l5 5-5 5"/>', 2.8),
    'leicht-links': SVG('<path d="M15 21v-7L8 7M8 13V7h6"/>', 2.8),
    'leicht-rechts': SVG('<path d="M9 21v-7l7-7M16 13V7h-6"/>', 2.8),
    'scharf-links': SVG('<path d="M17 4v9L7 19M7 12v7h7"/>', 2.8),
    'scharf-rechts': SVG('<path d="M7 4v9l10 6M17 12v7h-7"/>', 2.8),
    wenden: SVG('<path d="M8 21V9a5 5 0 0 1 10 0v4M14 10l4 4 4-4"/>', 2.8),
    kreisel: SVG('<circle cx="12" cy="11" r="4"/><path d="M12 21v-6M15 8l3-3M18 5h-3M18 5v3"/>', 2.6),
    ziel: SVG('<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>', 2.6),
    stopp: SVG('<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M8 12h8"/>', 2.6),
  };
  const ICON = {
    ton: SVG('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>', 2),
    stumm: SVG('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="m17 9 5 6M22 9l-5 6"/>', 2),
    ziel: SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', 2),
    route: SVG('<path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M8 17h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6"/>', 2),
    klein: SVG('<path d="M6 15l6 6 6-6M12 21V9M4 3h16"/>', 2),
    zu: SVG('<path d="M6 6l12 12M18 6 6 18"/>', 2.4),
  };

  const stil = document.createElement('style');
  stil.textContent = `
  .nv { position: fixed; inset: 0; z-index: 4000; background: #0d1014; color: #fff; display: block; }
  .nv[hidden] { display: none; }
  body.nv-an { overflow: hidden; }
  body.nv-an > main.gsz-ansicht { visibility: hidden; }   /* Seite darunter ruht (auch ihre Karte) */
  /* Karte im sicheren Bereich (nicht unter Statusleiste, Aussparung und Home-Balken) */
  .nv-karte { position: absolute; top: var(--sicher-oben, 0px); bottom: var(--sicher-unten, 0px); left: var(--sicher-links, 0px); right: var(--sicher-rechts, 0px); background: #dfe3e8; }
  .nv-oben { position: absolute; z-index: 600; left: calc(.5rem + var(--sicher-links, 0px)); right: calc(.5rem + var(--sicher-rechts, 0px)); top: calc(.5rem + var(--sicher-oben, 0px));
    background: #14532d; border-radius: .9rem; padding: .7rem .85rem; box-shadow: 0 6px 22px rgba(0, 0, 0, .45); display: grid; grid-template-columns: auto 1fr; gap: .1rem .8rem; align-items: center; }
  .nv-oben.grenze { background: #b42318; } .nv-oben.warten { background: #262c35; }
  .nv-symbol { grid-row: span 2; width: 3.6rem; height: 3.6rem; display: flex; align-items: center; justify-content: center; }
  .nv-symbol svg { width: 3.3rem; height: 3.3rem; }
  .nv-weite { font-size: 2rem; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; }
  .nv-text { font-size: 1.12rem; font-weight: 650; line-height: 1.25; overflow-wrap: anywhere; }
  .nv-danach { grid-column: 1 / -1; margin-top: .45rem; padding-top: .4rem; border-top: 1px solid rgba(255, 255, 255, .25); font-size: .9rem; opacity: .92; display: flex; gap: .4rem; align-items: center; }
  .nv-danach svg { width: 1.2rem; height: 1.2rem; flex: none; }
  .nv-warn { grid-column: 1 / -1; margin-top: .45rem; background: rgba(0, 0, 0, .28); border-radius: .5rem; padding: .35rem .55rem; font-size: .9rem; font-weight: 650; }
  .nv-unten { position: absolute; z-index: 600; left: calc(.5rem + var(--sicher-links, 0px)); right: calc(.5rem + var(--sicher-rechts, 0px)); bottom: calc(.5rem + var(--sicher-unten, 0px));
    background: rgba(13, 16, 20, .94); border-radius: .9rem; padding: .6rem .7rem; box-shadow: 0 6px 22px rgba(0, 0, 0, .45); }
  .nv-rest { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .9rem; margin: 0 .15rem .55rem; }
  .nv-rest b { font-size: 1.35rem; font-variant-numeric: tabular-nums; } .nv-rest span { font-size: .88rem; color: #c9d1da; }
  .nv-knoepfe { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .4rem; }
  .nv-knoepfe button { font: inherit; font-size: .82rem; font-weight: 700; min-height: 48px; border-radius: .6rem; border: 1px solid rgba(255, 255, 255, .22); background: #1e242c; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .15rem; cursor: pointer; padding: .3rem .2rem; }
  .nv-knoepfe button svg { width: 1.25rem; height: 1.25rem; }
  .nv-knoepfe button.ende { background: #b42318; border-color: #b42318; }
  .nv-hinweis { font-size: .8rem; color: #c9d1da; margin: .45rem .15rem 0; line-height: 1.35; }
  .nv-hinweis:empty { display: none; }
  .nv-ich { width: 34px; height: 34px; } .nv-ich svg { width: 34px; height: 34px; display: block; filter: drop-shadow(0 1px 3px rgba(0, 0, 0, .5)); }
  .nv-zentrieren { position: absolute; z-index: 600; right: calc(.6rem + var(--sicher-rechts, 0px)); font: inherit; font-weight: 700; font-size: .85rem; border: 0; border-radius: 999px;
    padding: .55rem .9rem; min-height: 44px; background: #2563c9; color: #fff; box-shadow: 0 3px 12px rgba(0, 0, 0, .4); cursor: pointer; }
  .nv-zentrieren[hidden] { display: none; }
  .nv-pille { position: fixed; z-index: 3900; left: 50%; transform: translateX(-50%); bottom: calc(4.6rem + var(--sicher-unten, 0px)); max-width: calc(100% - 1.5rem);
    background: #14532d; color: #fff; border: 0; border-radius: 999px; padding: .6rem 1rem; min-height: 46px; font: inherit; font-weight: 700; font-size: .9rem;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .4); display: flex; align-items: center; gap: .5rem; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nv-pille[hidden] { display: none; } .nv-pille svg { width: 1.3rem; height: 1.3rem; flex: none; }
  .nv-pille.grenze { background: #b42318; }
  .nv .leaflet-control-attribution { font-size: 10px; }
  @media (orientation: landscape) and (max-height: 500px) {
    .nv-oben { right: auto; width: min(24rem, 46%); } .nv-unten { left: auto; width: min(24rem, 46%); }
    .nv-weite { font-size: 1.6rem; } .nv-symbol { width: 3rem; height: 3rem; } .nv-symbol svg { width: 2.7rem; height: 2.7rem; } }
  `;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Zustand einer laufenden Navigation
  let N = null;
  // Texte je Ziel: Einsatzstelle (Halt an der Absperrgrenze) bzw. Bereitstellungsraum (Halt am Ziel)
  const TEXTE = {
    einsatz: { ziel: 'Absperrgrenze', bis: 'bis zur Absperrgrenze', vor: 'vor der Absperrgrenze', weiter: 'Weiter bis zur Absperrgrenze', start: 'Navigation zur Einsatzstelle',
      da: 'Absperrgrenze erreicht. Hier halten und die Lage aus Abstand erkunden.', daText: 'Hier halten – Lage aus Abstand erkunden (Fernglas, Wind beobachten).',
      tagebuchDa: (luft, g) => `An der Absperrgrenze angekommen (${Math.round(luft)} m vor der Einsatzstelle, Absperrgrenze ${g})` },
    bereitstellung: { ziel: 'Bereitstellungsraum', bis: 'bis zum Bereitstellungsraum', vor: 'vor dem Bereitstellungsraum', weiter: 'Weiter zum Bereitstellungsraum', start: 'Navigation zum Bereitstellungsraum',
      da: 'Bereitstellungsraum erreicht. Registrieren und Einsatzauftrag abwarten.', daText: 'Registrieren (Stärke, Einsatzmittel) und Einsatzauftrag abwarten.',
      tagebuchDa: () => 'Im Bereitstellungsraum angekommen' },
  };
  const laeuft = () => !!N;

  async function leaflet() {
    if (window.GSZKarte && GSZKarte.leaflet) return GSZKarte.leaflet();
    throw new Error('Kartenbaustein fehlt.');
  }
  // Sprachansage (deutsch); auf dem iPhone erst nach einem Tipp möglich – der Start-Knopf ist dieser Tipp
  function sprechen(text, { dringend = false } = {}) {
    if (!N || !N.ton || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      if (dringend) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; u.rate = 1.0;
      const st = (speechSynthesis.getVoices() || []).find(v => /^de(-|_|$)/i.test(v.lang));
      if (st) u.voice = st;
      speechSynthesis.speak(u);
      N.letzteAnsage = text;
    } catch { /* ohne Ton */ }
  }
  async function wachHalten() {
    if (!N || !navigator.wakeLock || document.hidden) return;
    try { N.sperre = await navigator.wakeLock.request('screen'); N.sperre.addEventListener('release', () => { if (N) N.sperre = null; }); } catch { /* nicht möglich */ }
  }
  const sichtbarkeit = () => { if (N && !document.hidden && !N.sperre) wachHalten(); };

  // opts: { ziel, grenze_m, grund, absperr_m, wind: { von }, zone: { laenge_m, winkel }, route (aufbereitet), routeText, holeRoute(pos) → Promise(route),
  //         tagebuch(text), beiEnde(), apple, google }
  async function starten(opts) {
    if (N) beenden({ still: true });
    N = { ...opts, T: TEXTE[opts.art] || TEXTE.einsatz, ton: LS.get('gsz-navi-ton') !== false, pos: null, gps: false, entlang: 0, lastI: 0, abseits: 0, angesagt: new Set(), folgen: true,
      angekommen: false, neuBerechnen: false, letzteNeu: 0, start: Date.now(), hinweis: '' };
    N.grenzeAuf = NL.grenzeEntlang(N.route, N.ziel, N.grenze_m);
    N.kritisch = (N.kritisch || []).map(t => NL.projizieren(N.route, t[0]).entlang_m);
    document.body.classList.add('nv-an');
    const el = document.createElement('div');
    // gsz-ebene: sonst blendet die App Elemente neben den Ansichten aus
    el.className = 'nv gsz-ebene'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', N.T.start);
    el.innerHTML = `<div class="nv-karte" data-nv-karte></div>
      <div class="nv-oben warten" data-nv-oben aria-live="polite"></div>
      <button type="button" class="nv-zentrieren" data-nv="folgen" hidden>Zentrieren</button>
      <div class="nv-unten"><div class="nv-rest" data-nv-rest></div>
        <div class="nv-knoepfe"><button type="button" data-nv="ton"></button><button type="button" data-nv="uebersicht">${ICON.route}Übersicht</button>
          <button type="button" data-nv="klein">${ICON.klein}Minimieren</button><button type="button" class="ende" data-nv="ende">${ICON.zu}Beenden</button></div>
        <div class="nv-hinweis" data-nv-hinweis></div></div>`;
    document.body.appendChild(el);
    const pille = document.createElement('button');
    pille.type = 'button'; pille.className = 'nv-pille gsz-ebene'; pille.hidden = true;
    document.body.appendChild(pille);
    N.el = el; N.pille = pille;
    el.querySelector('[data-nv="ende"]').addEventListener('click', () => beenden());
    el.querySelector('[data-nv="klein"]').addEventListener('click', () => { el.hidden = true; document.body.classList.remove('nv-an'); pilleZeigen(); });
    pille.addEventListener('click', () => { el.hidden = false; pille.hidden = true; document.body.classList.add('nv-an'); if (N && N.karte) setTimeout(() => { N.karte.invalidateSize(); folgen(true); }, 50); });
    el.querySelector('[data-nv="ton"]').addEventListener('click', () => { N.ton = !N.ton; LS.set('gsz-navi-ton', N.ton); if (!N.ton && window.speechSynthesis) speechSynthesis.cancel(); tonKnopf(); });
    el.querySelector('[data-nv="uebersicht"]').addEventListener('click', () => uebersicht());
    el.querySelector('[data-nv="folgen"]').addEventListener('click', () => { N.folgen = true; el.querySelector('[data-nv="folgen"]').hidden = true; folgen(true); });
    tonKnopf();
    // Karte (OpenStreetMap)
    try {
      const L = await leaflet();
      const k = L.map(el.querySelector('[data-nv-karte]'), { zoomControl: false, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, inertia: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap-Mitwirkende' }).addTo(k);
      N.L = L; N.karte = k;
      k.on('dragstart', () => { if (!N) return; N.folgen = false; N.el.querySelector('[data-nv="folgen"]').hidden = false; folgenKnopfLage(); });
      zeichnen();
      const s = N.route.punkte[0] || N.ziel;
      k.setView([s.lat, s.lon], 16);
    } catch (e) { N.hinweis = 'Karte nicht verfügbar (' + e.message + ') – die Führung läuft ohne Karte.'; }
    folgenKnopfLage();
    anzeigen();
    // GPS
    if (navigator.geolocation) {
      N.watch = navigator.geolocation.watchPosition(p => position(p), f => {
        if (!N) return;
        N.hinweis = f && f.code === 1 ? 'Standort nicht erlaubt – ohne GPS keine Navigation. Ortung für die App erlauben oder Apple Karten bzw. Google Maps nutzen.' : 'GPS-Signal fehlt …';
        anzeigen();
      }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
    } else N.hinweis = 'Dieses Gerät liefert keinen Standort – Apple Karten bzw. Google Maps nutzen.';
    wachHalten();
    document.addEventListener('visibilitychange', sichtbarkeit);
    const erste = NL.naechster(N.route, 0);
    sprechen(`${N.T.start}${N.routeText ? ', ' + N.routeText : ''}. ${erste ? NL.ansage(erste.schritt, erste.bis_m) : ''}`.trim());
    if (N.tagebuch) N.tagebuch(N.art === 'bereitstellung' ? `Navigation in der App zum Bereitstellungsraum gestartet: ${N.ziel.name || ''}` :
      `Navigation in der App gestartet${N.routeText ? ' (' + N.routeText + ')' : ''}: ${N.ziel.name || 'Einsatzstelle'}; Absperrgrenze ${NL.meterAnzeige(N.grenze_m)}`);
    anzeigen();
    return true;
  }

  function tonKnopf() { const b = N && N.el.querySelector('[data-nv="ton"]'); if (b) b.innerHTML = N.ton ? `${ICON.ton}Ton an` : `${ICON.stumm}Ton aus`; }
  function folgenKnopfLage() { const u = N && N.el.querySelector('.nv-unten'), z = N && N.el.querySelector('[data-nv="folgen"]'); if (u && z) z.style.bottom = `calc(${u.offsetHeight}px + 1rem + var(--sicher-unten, 0px))`; }

  // Route, Bereiche und Einsatzstelle auf die Karte
  function zeichnen() {
    if (!N || !N.karte) return;
    const L = N.L, k = N.karte;
    for (const e of N.ebenen || []) k.removeLayer(e);
    N.ebenen = [];
    const add = e => { e.addTo(k); N.ebenen.push(e); return e; };
    const Z = window.GSZKarte;
    if (Z && N.wind && N.wind.von !== null && N.wind.von !== undefined && N.zone && N.zone.laenge_m)
      add(L.polygon(Z.olivenPunkte(N.ziel, GG.ausbreitungsrichtung(N.wind.von), N.zone.laenge_m, N.zone.winkel || 90).map(x => [x.lat, x.lon]),
        { color: '#8e4ec6', weight: 2, fillColor: '#8e4ec6', fillOpacity: .14, interactive: false }));
    if (N.absperr_m) add(L.circle([N.ziel.lat, N.ziel.lon], { radius: N.absperr_m, color: '#26a95b', weight: 2, dashArray: '8 6', fill: false, interactive: false }));
    if (N.grenze_m > 0) add(L.circle([N.ziel.lat, N.ziel.lon], { radius: N.grenze_m, color: '#e5484d', weight: 3, fillColor: '#e5484d', fillOpacity: .18, interactive: false }));
    const P = N.route.punkte.map(x => [x.lat, x.lon]);
    add(L.polyline(P, { color: '#ffffff', weight: 11, opacity: .9, interactive: false }));
    N.linie = add(L.polyline(P, { color: '#2f6fe0', weight: 7, opacity: 1, interactive: false, className: 'nv-route' }));
    add(L.circleMarker([N.ziel.lat, N.ziel.lon], { radius: 9, color: '#fff', weight: 3, fillColor: N.art === 'bereitstellung' ? '#1f9d55' : '#e5484d', fillOpacity: 1, interactive: false }));
    if (N.pos) ichZeichnen();
  }
  function ichZeichnen() {
    if (!N || !N.karte || !N.pos) return;
    const L = N.L, kurs = Math.round(N.kurs || 0);
    const html = `<svg viewBox="0 0 34 34" style="transform:rotate(${kurs}deg)"><circle cx="17" cy="17" r="15" fill="#fff"/><path d="M17 5 26 27 17 22 8 27z" fill="#2563c9"/></svg>`;
    if (!N.ich) N.ich = L.marker([N.pos.lat, N.pos.lon], { interactive: false, keyboard: false, zIndexOffset: 1000, icon: L.divIcon({ className: 'nv-ich', html, iconSize: [34, 34], iconAnchor: [17, 17] }) }).addTo(N.karte);
    else { N.ich.setLatLng([N.pos.lat, N.pos.lon]); const e = N.ich.getElement(); if (e) e.innerHTML = html; }
  }
  function folgen(sofort = false) {
    if (!N || !N.karte || !N.pos || !N.folgen) return;
    const v = N.tempo || 0, zoom = v > 19 ? 15 : v > 9 ? 16 : 17;
    N.karte.setView([N.pos.lat, N.pos.lon], sofort ? zoom : (Math.abs(N.karte.getZoom() - zoom) > 0 ? zoom : N.karte.getZoom()), { animate: false });
  }
  function uebersicht() {
    if (!N || !N.karte) return;
    N.folgen = false; N.el.querySelector('[data-nv="folgen"]').hidden = false; folgenKnopfLage();
    const pk = [...N.route.punkte.slice(Math.max(0, N.lastI)), N.ziel, ...(N.pos ? [N.pos] : [])];
    const o = N.el.querySelector('[data-nv-oben]').getBoundingClientRect(), u = N.el.querySelector('.nv-unten').getBoundingClientRect();
    N.karte.fitBounds(N.L.latLngBounds(pk.map(x => [x.lat, x.lon])), { paddingTopLeft: [24, o.bottom + 12], paddingBottomRight: [24, innerHeight - u.top + 12], maxZoom: 17, animate: false });
  }

  // ---------------------------------------------------------------- neue GPS-Position
  function position(p) {
    if (!N) return;
    const c = p.coords, pos = { lat: c.latitude, lon: c.longitude, genau: c.accuracy || 0 };
    const vorher = N.pos;
    N.gps = true; N.pos = pos;
    if (N.hinweis && /GPS|Standort/.test(N.hinweis)) N.hinweis = '';
    // Geschwindigkeit und Kurs: vom Gerät, sonst aus den letzten Positionen
    const dt = vorher && vorher.zeit ? (p.timestamp - vorher.zeit) / 1000 : 0, weg = vorher ? GG.abstandM(vorher, pos) : 0;
    pos.zeit = p.timestamp || Date.now();
    // Sprünge der Ortung (über ca. 250 km/h) zählen nicht als Geschwindigkeit
    N.tempo = Number.isFinite(c.speed) && c.speed !== null ? c.speed : dt > 0 && weg / dt < 70 ? weg / dt : (N.tempo || 0);
    if (Number.isFinite(c.heading) && c.heading !== null && N.tempo > 1) N.kurs = c.heading; else if (vorher && weg > 4) N.kurs = GG.peilung(vorher, pos);
    // auf die Route legen (vorwärts gesucht; weit weg: ganze Route)
    let pr = NL.projizieren(N.route, pos, { von: Math.max(0, N.lastI - 5), bis: N.lastI + 400 });
    if (pr.quer_m > 60) pr = NL.projizieren(N.route, pos);
    const grenzeAbseits = Math.max(45, Math.min(120, (pos.genau || 0) * 1.5));
    if (pr.quer_m > grenzeAbseits) N.abseits++; else { N.abseits = 0; N.lastI = pr.i; N.entlang = pr.entlang_m; }
    // an der Absperrgrenze? (Luftlinie zur Einsatzstelle bzw. Route bis zur Grenze gefahren)
    const luft = GG.abstandM(pos, N.ziel);
    if (!N.angekommen && (luft <= N.grenze_m + 25 || (N.abseits === 0 && N.grenzeAuf - N.entlang <= 15))) {
      N.angekommen = true; N.ankunft = Date.now();
      sprechen(N.T.da, { dringend: true });
      if (N.tagebuch) N.tagebuch(N.T.tagebuchDa(luft, NL.meterAnzeige(N.grenze_m)));
    }
    // von der Route abgekommen → neue Route (höchstens alle 20 s, nur mit Netz)
    if (!N.angekommen && N.abseits >= 3 && N.holeRoute && !N.neuBerechnen && Date.now() - N.letzteNeu > 20000) neueRoute();
    if (!N.angekommen && N.abseits === 0) ansagen();
    ichZeichnen(); folgen(); anzeigen();
  }
  async function neueRoute() {
    if (!N || navigator.onLine === false) { if (N) { N.hinweis = 'Abseits der Route – ohne Netz keine neue Route. Zur blauen Linie zurück oder nach Sicht.'; anzeigen(); } return; }
    N.neuBerechnen = true; N.letzteNeu = Date.now(); N.hinweis = 'Abseits der Route – neue Route wird berechnet …'; anzeigen();
    const mein = N;
    try {
      const r = await N.holeRoute(N.pos);
      if (N !== mein || !r) return;
      N.route = r.route; N.routeText = r.text || N.routeText; N.kritisch = (r.kritisch || []).map(t => NL.projizieren(N.route, t[0]).entlang_m);
      N.grenzeAuf = NL.grenzeEntlang(N.route, N.ziel, N.grenze_m);
      N.lastI = 0; N.abseits = 0; N.angesagt = new Set(); N.hinweis = '';
      const pr = NL.projizieren(N.route, N.pos); N.lastI = pr.i; N.entlang = pr.entlang_m;
      zeichnen();
      const n = NL.naechster(N.route, N.entlang);
      sprechen('Neue Route. ' + (n ? NL.ansage(n.schritt, n.bis_m) : ''), { dringend: true });
      if (N.tagebuch) N.tagebuch(`Navigation: neue Route${N.routeText ? ' (' + N.routeText + ')' : ''}`);
    } catch (e) { if (N === mein) N.hinweis = 'Neue Route nicht möglich (' + e.message + ') – nach Sicht zur Route zurück.'; }
    finally { if (N === mein) { N.neuBerechnen = false; anzeigen(); } }
  }
  // Ansagen: Abbiegen (früh und kurz davor), Bereich in Windrichtung voraus, Absperrgrenze näher als 500 m
  function ansagen() {
    const n = NL.naechster(N.route, N.entlang);
    const { frueh, nah } = NL.ansagePunkte(N.tempo);
    const rest = N.grenzeAuf - N.entlang;
    // nach der Absperrgrenze liegende Schritte nicht mehr ansagen
    if (n && n.schritt.kum_m < N.grenzeAuf - 5 && n.schritt.typ !== 'arrive') {
      const k = n.index;
      if (n.bis_m <= nah && !N.angesagt.has(k + ':nah')) { N.angesagt.add(k + ':nah'); N.angesagt.add(k + ':frueh'); sprechen(NL.ansage(n.schritt, n.bis_m, true)); }
      else if (n.bis_m <= frueh && !N.angesagt.has(k + ':frueh')) { N.angesagt.add(k + ':frueh'); sprechen(NL.ansage(n.schritt, n.bis_m)); }
    }
    for (const ab of N.kritisch || []) {
      const bis = ab - N.entlang;
      if (bis > 0 && bis <= 300 && !N.angesagt.has('wind:' + Math.round(ab))) { N.angesagt.add('wind:' + Math.round(ab)); sprechen('Achtung: Die Route führt gleich durch den Bereich in Windrichtung.', { dringend: true }); }
    }
    if (rest <= 500 && rest > 150 && !N.angesagt.has('grenze500')) { N.angesagt.add('grenze500'); sprechen(`Noch ${NL.meterGesprochen(rest)} ${N.T.bis}.`); }
  }

  // ---------------------------------------------------------------- Anzeige
  function anzeigen() {
    if (!N) return;
    const oben = N.el.querySelector('[data-nv-oben]'), rest = N.el.querySelector('[data-nv-rest]'), hinweis = N.el.querySelector('[data-nv-hinweis]');
    const bisGrenze = Math.max(0, N.grenzeAuf - N.entlang);
    if (N.angekommen) {
      oben.className = 'nv-oben' + (N.art === 'bereitstellung' ? '' : ' grenze');
      oben.innerHTML = `<div class="nv-symbol">${N.art === 'bereitstellung' ? PFEIL.ziel : PFEIL.stopp}</div><div class="nv-weite">${esc(N.T.ziel)}</div><div class="nv-text">${esc(N.T.daText)}</div>
        <div class="nv-warn">${N.art === 'bereitstellung' ? '' : NL.meterAnzeige(GG.abstandM(N.pos || N.ziel, N.ziel)) + ' bis zur Einsatzstelle · '}angekommen ${uhr(N.ankunft)}</div>`;
    } else {
      const n = NL.naechster(N.route, N.entlang);
      const s = n && n.schritt.kum_m < N.grenzeAuf - 5 ? n : null;
      const a = s ? NL.anweisung(s.schritt) : { text: N.T.weiter, symbol: 'gerade' };
      const bis = s ? s.bis_m : bisGrenze;
      const naechsteWind = (N.kritisch || []).map(x => x - N.entlang).filter(x => x > -50 && x < 1500).sort((x, y) => x - y)[0];
      const da = s && s.danach && s.danach.kum_m < N.grenzeAuf - 5 && s.danach.typ !== 'arrive' ? NL.anweisung(s.danach) : null;
      oben.className = 'nv-oben' + (N.gps ? '' : ' warten');
      oben.innerHTML = `<div class="nv-symbol">${PFEIL[a.symbol] || PFEIL.gerade}</div><div class="nv-weite">${NL.meterAnzeige(bis)}</div><div class="nv-text">${esc(a.text)}</div>` +
        (da ? `<div class="nv-danach">${PFEIL[da.symbol] || PFEIL.gerade}<span>Danach: ${esc(da.text)}</span></div>` : '') +
        (naechsteWind !== undefined ? `<div class="nv-warn">⚠ ${naechsteWind > 0 ? 'In ' + NL.meterAnzeige(naechsteWind) + ' ' : ''}durch den Bereich in Windrichtung</div>` : '');
    }
    const restZeit = N.route.m > 0 ? N.route.s * (bisGrenze / N.route.m) : 0;
    rest.innerHTML = N.angekommen ? `<b>Angekommen</b><span>${N.art === 'bereitstellung' ? esc(N.ziel.name || N.T.ziel) : `Absperrgrenze ${NL.meterAnzeige(N.grenze_m)} · ${esc(N.grund || '')}`}</span>` :
      `<b>${NL.meterAnzeige(bisGrenze)}</b><span>${esc(N.T.bis)}${N.grenze_m > 0 ? ` (${NL.meterAnzeige(N.grenze_m)})` : ''}</span><span>Ankunft ca. ${uhr(Date.now() + restZeit * 1000)}</span>${N.routeText ? `<span>${esc(N.routeText)}</span>` : ''}`;
    hinweis.textContent = N.hinweis || (!N.gps ? 'GPS wird gesucht … (Angaben ab Start der Route)' : !navigator.wakeLock ? 'Bildschirm bitte anlassen – im Hintergrund liefert das iPhone der Web-App keinen Standort.' : '');
    folgenKnopfLage();
    pilleZeigen();
  }
  function pilleZeigen() {
    if (!N || !N.el.hidden) { if (N) N.pille.hidden = true; return; }
    const n = NL.naechster(N.route, N.entlang), bis = Math.max(0, N.grenzeAuf - N.entlang);
    const a = n && n.schritt.kum_m < N.grenzeAuf - 5 ? NL.anweisung(n.schritt) : null;
    N.pille.className = 'nv-pille gsz-ebene' + (N.angekommen ? ' grenze' : '');
    N.pille.innerHTML = N.angekommen ? `${PFEIL.stopp}<span>${esc(N.T.ziel)} erreicht</span>` :
      `${PFEIL[a ? a.symbol : 'gerade'] || PFEIL.gerade}<span>${a ? esc(NL.meterAnzeige(n.bis_m) + ' · ' + a.text) : 'Navigation läuft'} · ${NL.meterAnzeige(bis)} ${esc(N.T.bis)}</span>`;
    N.pille.hidden = false;
  }

  function beenden({ still = false } = {}) {
    if (!N) return;
    const n = N;
    N = null;
    try { if (n.watch !== undefined && navigator.geolocation) navigator.geolocation.clearWatch(n.watch); } catch { /* egal */ }
    try { if (n.sperre) n.sperre.release(); } catch { /* egal */ }
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch { /* egal */ }
    try { if (n.karte) n.karte.remove(); } catch { /* egal */ }
    document.removeEventListener('visibilitychange', sichtbarkeit);
    n.el.remove(); n.pille.remove();
    document.body.classList.remove('nv-an');
    if (!still && n.tagebuch) n.tagebuch('Navigation beendet' + (n.angekommen ? '' : ` (${NL.meterAnzeige(Math.max(0, n.grenzeAuf - n.entlang))} ${n.T.vor})`));
    if (n.beiEnde) n.beiEnde();
  }

  function zeigen() { if (N && N.el.hidden) N.pille.click(); }
  window.GSZNavigation = { starten, beenden, laeuft, zeigen, zustand: () => N && { entlang: N.entlang, grenzeAuf: N.grenzeAuf, angekommen: N.angekommen, abseits: N.abseits, route: N.route, letzteAnsage: N.letzteAnsage } };
})();
