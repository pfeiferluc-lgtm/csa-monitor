// Anfahrt zur Einsatzstelle (erste Phase, Ansicht #anfahrt): Einsatzort (Adresse, Koordinaten, Link aus der Alarmierung, Karte
// oder eigener Standort), Stoff falls schon bekannt (UN-Nr., Warntafel oder Benennung – ohne Netz), Wind am Einsatzort (DWD über
// Bright Sky), Absperrgrenze (Gefahrstoffkonzept RLP bzw. FwDV 500, ergänzt um ERG 2024) und die empfohlene Anfahrtsrichtung mit
// dem Wind im Rücken. Die Route kommt zur Vorschau vom freien OSRM-Routendienst (OpenStreetMap): Die App prüft, aus welcher
// Richtung sie die Einsatzstelle erreicht und ob sie durch den Bereich in Windrichtung führt. Die Routenführung selbst startet
// in Apple Karten bzw. Google Maps – Ziel ist die Einsatzstelle (Festlegung Lucas, 23.11.2026).
// Der Einsatzort wird Unfallort der Lagekarte und Vorschlag für „Einsatzort“ beim Beginn der Einsatz-Dokumentation.
'use strict';
(() => {
  const E = window.GSZEinsatz, GG = window.GSZGefahrgut, LG = window.GSZLage;
  if (!E || !window.GSZ || !GG || !LG) return;
  const esc = E.esc, meldung = E.meldung;
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } },
  };
  const SPEICHER = 'gsz-anfahrt', NAVI = 'gsz-navi', GUELTIG_MS = 12 * 3600 * 1000, ROUTE_GUELTIG_MS = 10 * 60 * 1000;
  const MIEHLEN = { lat: 50.2263, lon: 7.8317, name: 'Miehlen', standard: true };
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const UMGEBUNG = '7.45,50.48,8.25,50.05';            // Rhein-Lahn-Kreis und Umgebung: Treffer dort zuerst (nicht begrenzt)
  const ZONE_MIN_M = 1000, ZONE_WINKEL = 90;           // Bereich in Windrichtung für die Prüfung der Route (Keule 90°)
  const zahlText = (z, st = 1) => String(Math.round(z * 10 ** st) / 10 ** st).replace('.', ',');
  const meter = m => m >= 1000 ? zahlText(m / 1000, 1) + ' km' : Math.round(m) + ' m';
  const p2 = n => String(n).padStart(2, '0');
  const uhrzeit = d => { d = new Date(d); return isNaN(d) ? '' : `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const richtung = g => { const r = GG.himmelsrichtung(g); return GG.RICHTUNG_LANG[r] || r; };
  const SVG = (inhalt, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
  const ICON = {
    anfahrt: SVG('<path d="M3 11 21 3l-8 18-2-8z"/>'),
    ort: SVG('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    gps: SVG('<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>'),
    karte: SVG('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
    lupe: SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
    weg: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
    neu: SVG('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
    navi: SVG('<path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z"/>'),
    ok: SVG('<path d="m5 12 5 5 9-10"/>', 2.6),
    warn: SVG('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
  };
  // Pfeil in Fahrtrichtung bei der Anfahrt (mit dem Wind, also in Zugrichtung; 0° = Norden/oben)
  const fahrtPfeil = grad => `<svg class="af-pfeil" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="2"/>
    <text x="24" y="9.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" opacity=".7">N</text>
    <g transform="rotate(${Math.round(grad)} 24 24)"><path d="M24 38V12M15 21l9-9 9 9" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

  // ---------------------------------------------------------------- Zustand (12 h gültig, je Gerät)
  // { ziel: { lat, lon, name, quelle: 'adresse' | 'koordinaten' | 'karte' | 'gps' }, eingabe, stoff: { un, name, kemler } | null, brand,
  //   windManuell: { richtung, zeit } | null, zeit }
  function laden() { const x = LS.get(SPEICHER); return x && Date.now() - (x.zeit || 0) < GUELTIG_MS ? x : { zeit: Date.now() }; }
  let z = laden();
  const sichern = () => { z.zeit = Date.now(); LS.set(SPEICHER, z); };
  // für die Einsatz-Dokumentation: Einsatzort der laufenden Anfahrt
  const ortText = () => { const x = laden(); return x.ziel ? (x.ziel.name || `${x.ziel.lat.toFixed(5)}, ${x.ziel.lon.toFixed(5)}`) : ''; };

  // ---------------------------------------------------------------- Netz
  async function json(url) {
    let r;
    try { r = await fetch(url, { headers: { Accept: 'application/json' } }); }
    catch (e) {
      // Programm (Electron): notfalls über den Hauptprozess
      if (window.csa && window.csa.wetter) { const x = await window.csa.wetter(url); if (!x.ok) throw new Error('Dienst antwortet mit ' + x.status); return JSON.parse(x.text); }
      throw new Error(navigator.onLine === false ? 'ohne Netz' : 'nicht erreichbar');
    }
    if (!r.ok) throw new Error('Dienst antwortet mit ' + r.status);
    return r.json();
  }
  // Adresse → Treffer [{ lat, lon, name, unter }] (OpenStreetMap/Nominatim; nur auf Knopfdruck, keine Suche beim Tippen)
  const trefferName = x => {
    const a = x.address || {};
    const strasse = [a.road || a.pedestrian || a.square || a.path || a.industrial, a.house_number].filter(Boolean).join(' ');
    const ort = a.village || a.town || a.city || a.hamlet || a.suburb || a.municipality || '';
    const poi = x.name && x.name !== a.road && x.name !== ort ? x.name : '';
    return [poi, strasse, [a.postcode, ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || x.display_name || '';
  };
  async function adresseSuchen(text) {
    const q = `${NOMINATIM}?format=jsonv2&q=${encodeURIComponent(text)}&countrycodes=de&limit=6&addressdetails=1&accept-language=de&viewbox=${UMGEBUNG}`;
    const l = await json(q);
    return (Array.isArray(l) ? l : []).map(x => ({ lat: Math.round(Number(x.lat) * 1e6) / 1e6, lon: Math.round(Number(x.lon) * 1e6) / 1e6, name: trefferName(x),
      unter: [(x.address || {}).municipality, (x.address || {}).county].filter(Boolean).join(', ') })).filter(x => isFinite(x.lat) && isFinite(x.lon));
  }
  // Route vom Standort zur Einsatzstelle (OSRM, mit Ausweichrouten) → [{ punkte, m, s, steps }]
  let routeCache = null;
  async function routenHolen(start, ziel) {
    const k = [start.lat, start.lon, ziel.lat, ziel.lon].map(x => x.toFixed(4)).join(',');
    if (routeCache && routeCache.k === k && Date.now() - routeCache.zeit < ROUTE_GUELTIG_MS) return routeCache.routen;
    const j = await json(`${OSRM}${start.lon},${start.lat};${ziel.lon},${ziel.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`);
    if (!j || j.code !== 'Ok' || !Array.isArray(j.routes) || !j.routes.length) throw new Error(j && j.message ? j.message : 'keine Route gefunden');
    const routen = j.routes.map(r => ({ punkte: ((r.geometry && r.geometry.coordinates) || []).map(([lon, lat]) => ({ lat, lon })), m: r.distance, s: r.duration,
      steps: ((r.legs && r.legs[0] && r.legs[0].steps) || []).map(st => ({ name: st.name || '', ref: st.ref || '', ort: st.maneuver && st.maneuver.location ? { lon: st.maneuver.location[0], lat: st.maneuver.location[1] } : null })) }));
    routeCache = { k, zeit: Date.now(), routen };
    return routen;
  }
  // Straße, über die die Route den Kreis um die Einsatzstelle erreicht (letzter Abschnitt, der außerhalb beginnt)
  function ankunftStrasse(route, ziel, rAn) {
    const aussen = route.steps.filter(st => st.ort && GG.abstandM(ziel, st.ort) > rAn);
    const st = aussen[aussen.length - 1];
    if (!st) return '';
    return st.ref && st.name ? `${st.ref} (${st.name})` : st.ref || st.name || '';
  }

  // ---------------------------------------------------------------- Stile
  const stil = document.createElement('style');
  stil.textContent = `
  #anfahrtansicht .af-inhalt { display: flex; flex-direction: column; gap: .9rem; }
  @media (min-width: 1100px) { #anfahrtansicht .af-inhalt { display: grid; grid-template-columns: minmax(0, 27rem) minmax(0, 1fr); align-items: start; }
    #anfahrtansicht .af-links, #anfahrtansicht .af-rechts { display: flex; flex-direction: column; gap: .9rem; min-width: 0; } }
  #anfahrtansicht .af-links, #anfahrtansicht .af-rechts { display: contents; }
  @media (min-width: 1100px) { #anfahrtansicht .af-links, #anfahrtansicht .af-rechts { display: flex; } }
  .af-suche { display: flex; gap: .45rem; }
  .af-suche input, .af-stoff input { flex: 1; min-width: 0; font: inherit; font-size: 17px; padding: .65rem .75rem; border-radius: .55rem; border: 1px solid var(--rand);
    background: var(--surface2); color: var(--ink); box-sizing: border-box; width: 100%; }
  .af-suche button { flex: none; }
  .af-knoepfe { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .55rem; }
  .af-knoepfe .knopf { font-size: .88rem; }
  .af-treffer { list-style: none; margin: .55rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
  .af-treffer button { width: 100%; text-align: left; font: inherit; display: flex; flex-direction: column; gap: .1rem; padding: .6rem .75rem; min-height: 44px;
    border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .af-treffer button b { font-weight: 600; } .af-treffer button small { color: var(--muted); font-size: max(13px, .8125rem); }
  .af-gewaehlt { display: flex; align-items: flex-start; gap: .6rem; }
  .af-gewaehlt > svg { width: 1.5rem; height: 1.5rem; color: var(--crit); flex: none; margin-top: .1rem; }
  .af-gewaehlt b { font-size: 1.05rem; line-height: 1.3; display: block; }
  .af-gewaehlt small { color: var(--muted); font-size: max(13px, .8125rem); }
  .af-gewaehlt .knopf { margin-left: auto; flex: none; }
  .af-chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .55rem; }
  .af-chips button { font: inherit; font-size: .84rem; font-weight: 600; padding: .4rem .7rem; min-height: 40px; border-radius: .55rem; border: 1px solid var(--rand);
    background: var(--surface2); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; gap: .35rem; }
  .af-kern { display: flex; align-items: center; gap: .9rem; }
  .af-pfeil { width: 4.4rem; height: 4.4rem; flex: none; color: var(--good); }
  .af-kern b.af-gross { font-size: 1.45rem; line-height: 1.15; display: block; }
  .af-kern span { color: var(--ink2); font-size: .92rem; line-height: 1.35; display: block; margin-top: .15rem; }
  .af-werte { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: .55rem; margin-top: .8rem; }
  .af-wert { background: var(--surface2); border-radius: .7rem; padding: .6rem .7rem; border-left: 4px solid var(--c, var(--akzent)); }
  .af-wert b { display: block; font-size: 1.35rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .af-wert span { font-size: max(13px, .8rem); color: var(--ink2); line-height: 1.3; display: block; margin-top: .15rem; overflow-wrap: anywhere; -webkit-hyphens: auto; hyphens: auto; }
  .af-pruefung { display: flex; gap: .55rem; align-items: flex-start; margin-top: .8rem; padding: .65rem .75rem; border-radius: .6rem; background: var(--surface2); line-height: 1.4; font-size: .92rem; }
  .af-pruefung > svg { width: 1.3rem; height: 1.3rem; flex: none; margin-top: .05rem; }
  .af-pruefung.gut { background: var(--good-t); } .af-pruefung.gut > svg { color: var(--good); }
  .af-pruefung.seitlich { background: var(--warn-t); } .af-pruefung.seitlich > svg { color: var(--warn); }
  .af-pruefung.gegen { background: var(--crit-t); } .af-pruefung.gegen > svg { color: var(--crit); }
  .af-navi { display: flex; gap: .55rem; flex-wrap: wrap; margin-top: .85rem; }
  .af-navi .knopf { flex: 1 1 9rem; min-height: 3rem !important; font-size: 1rem !important; font-weight: 700; }
  .af-navi .knopf svg { width: 1.15rem; height: 1.15rem; }
  .af-navi .knopf.zweit { flex: 1 1 100%; min-height: 2.6rem !important; font-size: .9rem !important; font-weight: 600; }
  .af-wind-zeile { margin-top: .75rem; font-size: max(13px, .84rem); color: var(--ink2); line-height: 1.4; }
  .af-kompass { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .35rem; margin-top: .45rem; }
  .af-kompass button { font: inherit; font-weight: 700; padding: .55rem 0; min-height: 44px; border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .af-kompass button.an { background: var(--akzent-voll); color: #fff; border-color: var(--akzent-voll); }
  .af-seg { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem; margin-top: .6rem; }
  .af-seg button { font: inherit; font-size: .86rem; font-weight: 600; padding: .5rem .4rem; min-height: 44px; border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .af-seg button[aria-pressed="true"], .af-seg button[aria-checked="true"] { background: var(--akzent-voll); border-color: var(--akzent-voll); color: #fff; }
  #anfahrtansicht .lg-karte { height: min(58vh, 30rem); }
  .af-merk li { margin-bottom: .35rem; line-height: 1.4; }
  #af-merk .af-merk-details { border-top: 0; margin-top: 0; padding-top: 0; }
  .af-quelle { font-size: max(13px, .78rem); color: var(--muted); margin-top: .5rem; line-height: 1.4; }
  `;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Merkpunkte zur Anfahrt (mit Fundstelle)
  const MERK = [
    ['Mit dem Wind anfahren', '„möglichst mit dem Wind anfahren; auf Windrichtungsänderungen achten“ – also mit dem Wind im Rücken, von der windzugewandten Seite (Luv).', 'FwDV 500, 1.5.3.1'],
    ['Abstand', 'bei unklarer Lage „eine sichere Entfernung, mindestens jedoch 50 m zum gemeldeten Objekt“; Fahrzeuge im Gefahrenbereich gelten bis zum Nachweis des Gegenteils als kontaminiert.', 'FwDV 500, 1.5.3.1'],
    ['Gelände', 'Fahrzeuge je nach Stoff (z. B. kalte oder Schwergase) nicht in Senken aufstellen, auf Gefälle achten; „Windrichtung und Gefälle beachten!“ Flüssiggas kann entgegen der Windrichtung bergab strömen.', 'FwDV 500, 1.5.3.1; ABC-Taschenkarte RLP 2023; Merkblatt Flüssiggas 7.008 (Bayern)'],
    ['Gefahrenbereich', 'ohne näheres Erkundungsergebnis zunächst 50 m im Umkreis annehmen und absperren; Stoffeigenschaften, Wind, Bebauung und Gelände berücksichtigen.', 'Gefahrstoffkonzept RLP, 3.1.2'],
    ['Stoffabhängig', 'Klasse 1.1, 1.2, 1.3, 1.5, 1.6: Gefahrenbereich 500 m, Absperrbereich 1 000 m · Gase in Tank-, Kesselwagen oder Industrietanks: 300 m und 1 000 m · entzündbare Flüssigkeiten in Tanks: 50 m und 300 m. „Solange Information fehlt, größte Gefahr annehmen.“', 'ABC-Taschenkarte RLP 2023 (Hinweise FwDV 500)'],
    ['Explosionsgefahr', 'Abstände erheblich erweitern und Deckung nutzen; bei Explosivstoffen, Munition oder mehreren m³ druckverflüssigter Gase unter Brandeinwirkung Gefahrenbereich mindestens 500 m, Absperrbereich 1 000 m.', 'FwDV 500, 1.5.3.5 und 4.4.2.1'],
    ['Unterwegs', 'bei Gasverdacht rüstet sich der Angriffstrupp oder die Führungskraft auf der Anfahrt mit dem Mehrgasmessgerät aus; vorgehende Kräfte legen Handys, Meldeempfänger und nicht ex-geschützte Funkgeräte ab. Bei A-Stoffen das Dosisleistungsmessgerät schon auf der Anfahrt einschalten.', 'ABC-Modulausbildung LfBK 2026, S. 340 f.; KatSDV 510'],
    ['Beim Aussteigen', 'auf Dampf, Rauch, Gerüche und Reizwirkung achten und Ex messen; bei ungewohnten Gerüchen, Reizwirkung oder 10 % UEG den Abstand sofort vergrößern.', 'Feuerwehr-Lehrbuch, S. 1036'],
    ['Erstmaßnahmen', 'GAMS: Gefahren erkennen – Absichern – Menschenrettung unter Eigenschutz – Spezialkräfte nachfordern.', 'Gefahrstoffkonzept RLP, 3.1'],
  ];
  // Objekte mit eigener Regel für die Anfahrt (Alarm- und Einsatzpläne): Hinweis, wenn der Einsatzort im Umkreis liegt
  const FW_MIEHLEN = { lat: 50.22629, lon: 7.83449, name: 'Feuerwehrhaus Miehlen' };
  const OBJEKTE = [
    { name: 'Polynt Composites Germany GmbH, Kieselstraße 2, Miehlen', lat: 50.21814, lon: 7.83955, umkreis_m: 500, bereitstellung: FW_MIEHLEN,
      text: 'Bereitstellungsraum ist das Feuerwehrgerätehaus Miehlen (Bahnhofstraße). Nachalarmierte Einheiten fahren nicht eigenständig zur Einsatzstelle – erst nach Registrierung mit Mannschaftsstärke und Einsatzmitteln und erteiltem Einsatzauftrag.',
      quelle: 'AEP Polynt, Entwurf 05/2026, Abschnitt 9.0' },
  ];


  // ---------------------------------------------------------------- Rechnen
  const nacht = () => { const o = z.ziel || MIEHLEN; try { return GG.istNacht(o.lat, o.lon); } catch { const h = new Date().getHours(); return h < 7 || h >= 18; } };
  const abstaende = () => GG.anfahrtAbstaende(z.stoff && z.stoff.un, { grundlage: LG.grundlage ? LG.grundlage() : 'rlp', nacht: nacht(), brand: !!z.brand, tank: !!z.tank });
  const windManuell = () => z.windManuell && Date.now() - z.windManuell.zeit < 6 * 3600 * 1000 ? z.windManuell : null;
  let wind = null, windFehler = '', windLaedt = false;
  const windVon = () => { const m = windManuell(); return m ? m.richtung : wind && wind.richtung !== null && wind.richtung !== undefined ? wind.richtung : null; };
  const windKmh = () => !windManuell() && wind && wind.kmh !== null && wind.kmh !== undefined && isFinite(wind.kmh) ? Number(wind.kmh) : null;
  const windStill = () => { const v = windKmh(); return v !== null && v < GG.AUSBREITUNG.still_kmh; };
  const zoneLaenge = ab => Math.max(ZONE_MIN_M, ab.schutz_m || 0);
  let routen = null, routeFehler = '', routeLaedt = false, routeStart = null;
  // Bewertung aller Routen; die erste ist die Vorschau dessen, was ein Navi voraussichtlich fährt
  function routenBewerten() {
    if (!routen || !routen.length || !z.ziel) return null;
    const ab = abstaende(), von = windStill() ? null : windVon();
    const opt = { vonGrad: von, grenze_m: ab.grenze_m, zone: { laenge_m: zoneLaenge(ab), winkel: ZONE_WINKEL } };
    const rAn = Math.max(2 * ab.grenze_m, 250);
    const l = routen.map(r => ({ r, p: GG.routePruefen(r.punkte, z.ziel, opt), strasse: ankunftStrasse(r, z.ziel, rAn) }));
    const haupt = l[0];
    const passt = x => x.p.bewertung === 'gut' && !x.p.imWindM && !x.p.durchGefahr;
    const alt = !passt(haupt) && von !== null ? l.slice(1).find(passt) || null : null;
    // Zwischenpunkt für Google Maps: dort, wo die Ausweichroute den Kreis um die Einsatzstelle erreicht
    let zwischen = null;
    if (alt) {
      const pk = alt.r.punkte;
      for (let i = pk.length - 1; i > 0; i--) if (GG.abstandM(z.ziel, pk[i]) <= rAn && GG.abstandM(z.ziel, pk[i - 1]) > rAn) { zwischen = pk[i - 1]; break; }
    }
    return { haupt, alt, zwischen };
  }

  // ---------------------------------------------------------------- Ansicht
  const el = E.ansichtElement('anfahrtansicht');
  let karte = null, karteLaedt = null, lauf = 0;
  function zeigen() {
    lauf++;
    if (karte) { try { karte.zerstoeren(); } catch { /* schon weg */ } karte = null; }
    kartenStand = '';
    z = laden();
    el.innerHTML = '';
    el.appendChild(E.kopf({ titel: 'Anfahrt', unter: 'Einsatzort, Wind, Absperrgrenze und Route', eltern: 'start' }));
    el.insertAdjacentHTML('beforeend', `<div class="af-inhalt"><div class="af-links">
      <section class="kachel ez-karte" id="af-ort"><h2>Einsatzort</h2><div data-af-ort></div></section>
      <section class="kachel ez-karte" id="af-stoff"><h2>Stoff <small style="font-weight:500;color:var(--muted)">falls bekannt</small></h2><div data-af-stoff></div></section>
      <section class="kachel ez-karte" id="af-ergebnis" hidden><h2>Anfahrt</h2><div data-af-ergebnis></div></section></div>
      <div class="af-rechts">
      <section class="kachel ez-karte" id="af-karte-k" hidden><h2>Karte</h2>
        <div class="lg-karte-rahmen" data-lg-karte-rahmen><div class="lg-karte" data-af-karte></div><div class="lg-karte-wind" data-lg-karte-wind hidden></div></div>
        <div class="lg-legende"><span><i style="--c:#1f9d55"></i>Anfahrt gegen den Wind</span><span><i style="--c:#8e4ec6"></i>Bereich in Windrichtung</span><span><i style="--c:#e5484d"></i>Gefahrenbereich (Absperrgrenze)</span><span><i style="--c:#26a95b"></i>Absperrbereich</span><span><i style="--c:#2f6fe0"></i>Route (Vorschau)</span><span><i style="--c:#4c8df0"></i>mein Standort</span></div>
        <div class="af-knoepfe"><button type="button" class="knopf" data-af-k="stelle">Einsatzstelle</button><button type="button" class="knopf" data-af-k="route">Ganze Route</button>
          <button type="button" class="knopf" data-af-k="mitte">Einsatzort = Kartenmitte</button><a class="knopf" href="#lagekarte">Lagekarte</a></div>
        <div class="lg-klein" style="margin-top:.45rem">Die rote Markierung lässt sich ziehen, wenn die Adresse nicht genau stimmt.</div></section>
      <section class="kachel ez-karte" id="af-merk"><h2>Merkpunkte zur Anfahrt</h2><details class="ez-mehr af-merk-details"><summary>${MERK.length} Punkte mit Fundstelle</summary><div class="inhalt">
        <ul class="af-merk lg-klein" style="padding-left:1.05rem;margin:.3rem 0 0">${MERK.map(([t, x, q]) => `<li><b>${esc(t)}:</b> ${esc(x)} <i>(${esc(q)})</i></li>`).join('')}</ul></div></details></section>
      </div></div>`);
    ortZeigen(); stoffZeigen();
    for (const b of el.querySelectorAll('[data-af-k]')) b.addEventListener('click', () => kartenKnopf(b.dataset.afK));
    if (z.ziel) zielGesetzt({ neu: false });
  }

  // ---------------------------------------------------------------- Einsatzort
  let treffer = null, sucht = false, suchFehler = '';
  function ortZeigen() {
    const ziel = el.querySelector('[data-af-ort]');
    if (!ziel) return;
    if (z.ziel) {
      const quelle = { adresse: 'Adresse', koordinaten: 'Koordinaten', karte: 'auf der Karte gesetzt', gps: 'mein Standort' }[z.ziel.quelle] || '';
      ziel.innerHTML = `<div class="af-gewaehlt">${ICON.ort}<div><b data-af-zielname>${esc(z.ziel.name || 'Einsatzort')}</b>
          <small>${z.ziel.lat.toFixed(5)}, ${z.ziel.lon.toFixed(5)}${quelle ? ' · ' + esc(quelle) : ''}</small></div>
          <button type="button" class="knopf" data-af="anders">${ICON.neu}Ändern</button></div>`;
      ziel.querySelector('[data-af="anders"]').addEventListener('click', () => { z.ziel = null; treffer = null; sichern(); wind = null; routen = null;
        el.querySelector('#af-ergebnis').hidden = true; el.querySelector('#af-karte-k').hidden = true; if (karte) { try { karte.zerstoeren(); } catch { /* */ } karte = null; }
        ortZeigen(); const f = el.querySelector('#af-adresse'); if (f) f.focus(); });
      return;
    }
    ziel.innerHTML = `<form class="af-suche" data-af-form role="search" novalidate>
        <input type="search" id="af-adresse" placeholder="Adresse oder Koordinaten" aria-label="Einsatzort: Adresse, Ort, Koordinaten oder Kartenlink"
          autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(z.eingabe || '')}">
        <button type="submit" class="knopf los">${ICON.lupe}Suchen</button></form>
      <div class="af-knoepfe"><button type="button" class="knopf" data-af="gps">${ICON.gps}Mein Standort</button>
        <button type="button" class="knopf" data-af="karte">${ICON.karte}Auf der Karte wählen</button></div>
      <div data-af-treffer>${trefferHtml()}</div>
      <div class="af-quelle">Adresssuche: OpenStreetMap (Nominatim). Koordinaten und Kartenlinks aus der Alarmierung gehen auch ohne Netz.</div>`;
    const form = ziel.querySelector('[data-af-form]'), f = ziel.querySelector('#af-adresse');
    form.addEventListener('submit', e => { e.preventDefault(); f.blur(); suchen(f.value); });
    ziel.querySelector('[data-af="gps"]').addEventListener('click', async () => {
      try { const s = await LG.standortHolen({ gps: true }); zielSetzen({ lat: s.lat, lon: s.lon, name: '', quelle: 'gps' }); }
      catch (e) { meldung(e.message, 7000); }
    });
    ziel.querySelector('[data-af="karte"]').addEventListener('click', async () => {
      const s = await LG.standortHolen().catch(() => MIEHLEN);
      zielSetzen({ lat: s.lat, lon: s.lon, name: '', quelle: 'karte' });
      meldung('Karte verschieben und „Einsatzort = Kartenmitte“ tippen – oder die rote Markierung ziehen.', 6000);
      setTimeout(() => { const k = el.querySelector('#af-karte-k'); if (k) k.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 300);
    });
    trefferBeleben();
  }
  function trefferHtml() {
    if (sucht) return '<div class="lg-klein" style="margin-top:.55rem">Suche …</div>';
    if (suchFehler) return `<div class="ez-warn" style="margin-top:.55rem">${esc(suchFehler)}</div>`;
    if (!treffer) return '';
    if (!treffer.length) return '<div class="ez-warn" style="margin-top:.55rem">Nichts gefunden. Ort ergänzen (z. B. „Hauptstraße 5, Nastätten“), Koordinaten eingeben oder auf der Karte wählen.</div>';
    return `<ul class="af-treffer">${treffer.map((t, i) => `<li><button type="button" data-af-treffer="${i}"><b>${esc(t.name)}</b>${t.unter ? `<small>${esc(t.unter)}</small>` : ''}</button></li>`).join('')}</ul>`;
  }
  function trefferBeleben() {
    const box = el.querySelector('[data-af-treffer]');
    if (!box) return;
    box.innerHTML = trefferHtml();
    for (const b of box.querySelectorAll('[data-af-treffer]')) b.addEventListener('click', () => { const t = treffer[Number(b.dataset.afTreffer)]; zielSetzen({ ...t, quelle: 'adresse' }); });
  }
  async function suchen(text) {
    text = String(text || '').trim();
    z.eingabe = text; sichern();
    if (!text) return;
    const k = GG.koordinatenLesen(text);
    if (k) { zielSetzen({ ...k, name: '', quelle: 'koordinaten' }); return; }
    if (/^https?:\/\//i.test(text)) { suchFehler = 'In diesem Link stehen keine Koordinaten. Adresse eintippen oder auf der Karte wählen.'; treffer = null; trefferBeleben(); return; }
    sucht = true; suchFehler = ''; treffer = null; trefferBeleben();
    try { treffer = await adresseSuchen(text); }
    catch (e) { suchFehler = `Adresssuche ${e.message}. Koordinaten eingeben oder auf der Karte wählen.`; treffer = null; }
    sucht = false;
    if (treffer && treffer.length === 1) { zielSetzen({ ...treffer[0], quelle: 'adresse' }); return; }
    trefferBeleben();
  }
  function zielSetzen(ziel) {
    z.ziel = { lat: ziel.lat, lon: ziel.lon, name: ziel.name || '', quelle: ziel.quelle || 'adresse' };
    treffer = null; suchFehler = '';
    sichern();
    zielGesetzt({ neu: true });
  }
  // Einsatzort steht: Unfallort der Lagekarte, Ortsname nachladen, Wind am Einsatzort, Karte, Route
  function zielGesetzt({ neu }) {
    const mein = lauf;
    if (window.GSZKarte && (neu || !GSZKarte.unfallort())) GSZKarte.unfallortSetzen(z.ziel, 'anfahrt');
    ortZeigen();
    el.querySelector('#af-ergebnis').hidden = false;
    el.querySelector('#af-karte-k').hidden = false;
    if (!z.ziel.name) LG.ortName(z.ziel).then(n => { if (mein !== lauf || !z.ziel || !n) return; z.ziel.name = n; sichern(); const b = el.querySelector('[data-af-zielname]'); if (b) b.textContent = n; }).catch(() => {});
    if (neu) { wind = null; routen = null; routeFehler = ''; }
    ergebnisZeigen();
    karteZeigen();
    windLaden();
    routeLaden();
    const b = bericht();
    if (neu && b) b.eintragen(`Anfahrt: Einsatzort ${z.ziel.name || z.ziel.lat.toFixed(5) + ', ' + z.ziel.lon.toFixed(5)}`, 'system');
  }
  const bericht = () => window.GSZBericht && GSZBericht.aktiv && GSZBericht.aktiv() ? GSZBericht : null;

  // ---------------------------------------------------------------- Stoff (offline: UN-Nr., Warntafel, Benennung nach ADR)
  let stoffTreffer = null;
  function stoffZeigen() {
    const ziel = el.querySelector('[data-af-stoff]');
    if (!ziel) return;
    const s = z.stoff;
    const seg = `<div class="af-seg" role="radiogroup" aria-label="Lage"><button type="button" role="radio" data-af-brand="0" aria-checked="${!z.brand}">Austritt / unklar</button>
      <button type="button" role="radio" data-af-brand="1" aria-checked="${!!z.brand}">Brand oder Explosionsgefahr</button></div>` +
      (s && (abstaende().klasse.k2 || abstaende().klasse.k3) ? `<div class="af-seg" style="grid-template-columns:1fr"><button type="button" data-af-tank aria-pressed="${!!z.tank}" aria-checked="${!!z.tank}">${z.tank ? '✓ ' : ''}Tank-, Kesselwagen oder Industrietank</button></div>` : '');
    if (s) {
      const e = GG.unEintraege(s.un)[0];
      ziel.innerHTML = `<div class="af-gewaehlt"><span style="flex:none">${E.miniTafel ? E.miniTafel({ un: s.un, kemler: s.kemler || (e && e.gefahrnummer) || '' }) : ''}</span>
        <div><b>UN ${esc(s.un)}${s.name || (e && e.name) ? ' · ' + esc(s.name || e.name) : ''}</b><small>${e && e.klasse ? 'Klasse ' + esc(e.klasse) : ''}${(s.kemler || (e && e.gefahrnummer)) ? ' · Gefahrnummer ' + esc(s.kemler || e.gefahrnummer) : ''}</small></div>
        <button type="button" class="knopf" data-af="stoff-weg" aria-label="Stoff entfernen">${ICON.weg}</button></div>${seg}
        <div class="af-knoepfe"><button type="button" class="knopf" data-af="gestis">${ICON.lupe}Stoff öffnen (GESTIS)</button></div>`;
      ziel.querySelector('[data-af="stoff-weg"]').addEventListener('click', () => { z.stoff = null; z.tank = false; sichern(); stoffZeigen(); neuRechnen(); });
      const tk = ziel.querySelector('[data-af-tank]');
      if (tk) tk.addEventListener('click', () => { z.tank = !z.tank; sichern(); stoffZeigen(); neuRechnen(); });
      ziel.querySelector('[data-af="gestis"]').addEventListener('click', () => { if (E.suchen) E.suchen(s.un); });
    } else {
      ziel.innerHTML = `<div class="af-stoff"><input id="af-stoff-q" placeholder="UN-Nr., Warntafel oder Name" aria-label="Stoff: UN-Nummer, Warntafel oder Name"
          autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></div>
        <div data-af-stoff-treffer></div><div class="af-chips" data-af-zuletzt></div>${seg}
        <div class="af-quelle">Ohne Stoff gilt der Gefahrenbereich nach ${esc(GG.GRUNDLAGEN[LG.grundlage ? LG.grundlage() : 'rlp'].lang)}; mit UN-Nummer ergänzend die ERG-Abstände.</div>`;
      const f = ziel.querySelector('#af-stoff-q');
      f.addEventListener('input', () => stoffEingabe(f.value));
      f.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (stoffTreffer && stoffTreffer.length === 1) stoffSetzen(stoffTreffer[0]); } });
      zuletztZeigen();
    }
    for (const b of ziel.querySelectorAll('[data-af-brand]')) b.addEventListener('click', () => {
      z.brand = b.dataset.afBrand === '1'; sichern();
      for (const x of ziel.querySelectorAll('[data-af-brand]')) x.setAttribute('aria-checked', String(x === b));
      neuRechnen();
    });
  }
  async function zuletztZeigen() {
    const box = el.querySelector('[data-af-zuletzt]');
    if (!box || !E.zuletzt) return;
    let l = [];
    try { l = (await E.zuletzt(12)).filter(x => x.stoff && x.stoff.transport && x.stoff.transport.un).slice(0, 4); } catch { l = []; }
    if (!box.isConnected || !l.length) return;
    box.innerHTML = `<span class="lg-klein" style="align-self:center">Zuletzt geöffnet:</span>` + l.map((x, i) => `<button type="button" data-af-zl="${i}">UN ${esc(x.stoff.transport.un)} · ${esc(E.nameSchoen ? E.nameSchoen(x.name) : x.name)}</button>`).join('');
    for (const b of box.querySelectorAll('[data-af-zl]')) b.addEventListener('click', () => { const x = l[Number(b.dataset.afZl)];
      stoffSetzen({ un: x.stoff.transport.un, name: E.nameSchoen ? E.nameSchoen(x.name) : x.name, kemler: x.stoff.transport.kemler || '' }); });
  }
  function stoffEingabe(text) {
    const box = el.querySelector('[data-af-stoff-treffer]');
    if (!box) return;
    const t = String(text || '').trim();
    stoffTreffer = null;
    let m = /^(X?\d{2,3})\s*[\/\s-]\s*(\d{4})$/i.exec(t);
    if (m) stoffTreffer = GG.unEintraege(m[2]).length ? [{ un: m[2], kemler: m[1].toUpperCase(), name: GG.unEintraege(m[2])[0].name }] : [{ un: m[2], kemler: m[1].toUpperCase(), name: '' }];
    else if ((m = /^(?:UN\s*)?(\d{4})$/i.exec(t))) stoffTreffer = GG.unEintraege(m[1]).length ? GG.unEintraege(m[1]).slice(0, 4).map(e => ({ un: m[1], name: e.name, kemler: e.gefahrnummer })) : [{ un: m[1], name: '', kemler: '' }];
    else if (t.length >= 3) stoffTreffer = GG.unSuchen(t, 8).map(e => ({ un: e.un, name: e.name, kemler: e.gefahrnummer }));
    if (!stoffTreffer) { box.innerHTML = ''; return; }
    if (!stoffTreffer.length) { box.innerHTML = '<div class="lg-klein" style="margin-top:.45rem">Keine Benennung gefunden – UN-Nummer von der Warntafel eingeben.</div>'; return; }
    box.innerHTML = `<ul class="af-treffer">${stoffTreffer.map((x, i) => `<li><button type="button" data-af-st="${i}"><b>UN ${esc(x.un)}${x.name ? ' · ' + esc(x.name) : ''}</b>${x.kemler ? `<small>Gefahrnummer ${esc(x.kemler)}</small>` : ''}</button></li>`).join('')}</ul>`;
    for (const b of box.querySelectorAll('[data-af-st]')) b.addEventListener('click', () => stoffSetzen(stoffTreffer[Number(b.dataset.afSt)]));
  }
  function stoffSetzen(s) {
    z.stoff = { un: s.un, name: s.name || '', kemler: s.kemler || '' }; sichern();
    stoffZeigen(); neuRechnen();
    const b = bericht(); if (b && z.ziel) b.eintragen(`Anfahrt: Stoff UN ${s.un}${s.name ? ' ' + s.name : ''}`, 'system');
  }
  function neuRechnen() { if (!z.ziel) return; ergebnisZeigen(); karteAktualisieren(); }

  // ---------------------------------------------------------------- Wind am Einsatzort
  async function windLaden(frisch = false) {
    if (!z.ziel) return;
    const mein = lauf, ziel = z.ziel;
    windLaedt = true; windFehler = '';
    try { wind = await LG.windAn(ziel, { frisch }); } catch (e) { windFehler = e.message; }
    windLaedt = false;
    if (mein !== lauf || z.ziel !== ziel) return;
    ergebnisZeigen(); karteAktualisieren();
  }
  // ---------------------------------------------------------------- Route (Vorschau und Prüfung)
  async function routeLaden() {
    if (!z.ziel) return;
    const mein = lauf, ziel = z.ziel;
    routeLaedt = true; routeFehler = '';
    ergebnisZeigen();
    try {
      routeStart = await LG.standortHolen().catch(() => MIEHLEN);
      if (GG.abstandM(routeStart, ziel) < 150) { routen = []; }
      else routen = await routenHolen(routeStart, ziel);
    } catch (e) { routeFehler = e.message; routen = null; }
    routeLaedt = false;
    if (mein !== lauf || z.ziel !== ziel) return;
    ergebnisZeigen(); karteAktualisieren();
  }

  // ---------------------------------------------------------------- Ergebnis: Anfahrtsrichtung, Werte, Prüfung, Navi
  function ergebnisZeigen() {
    const box = el.querySelector('[data-af-ergebnis]');
    if (!box || !z.ziel) return;
    const ab = abstaende(), von = windVon(), m = windManuell(), kmh = windKmh(), still = windStill();
    let kern;
    if (von === null) {
      kern = `<div class="af-kern"><div><b class="af-gross">${windLaedt ? 'Wind wird abgerufen …' : 'Windrichtung unbekannt'}</b>
        <span>${windLaedt ? 'DWD am Einsatzort' : `${windFehler ? 'Wind nicht abrufbar (' + esc(windFehler) + '). ' : ''}Windrichtung vor Ort bestimmen (Windsack, Fahnen, Rauch) – unten eingeben.`}</span></div></div>`;
    } else if (still) {
      kern = `<div class="af-kern"><div><b class="af-gross">Windstille</b><span>Richtung unsicher – Ausbreitung in alle Richtungen möglich (Kreis 500 bis 1 000 m). Anfahrt nach Lage, Abstand halten.</span></div></div>`;
    } else {
      const zug = GG.ausbreitungsrichtung(von);
      kern = `<div class="af-kern">${fahrtPfeil(zug)}<div><b class="af-gross">Anfahrt aus ${esc(richtung(von))}</b>
        <span>mit dem Wind im Rücken · Wind aus ${esc(GG.himmelsrichtung(von))} (${Math.round(von)}°)${kmh !== null ? `, ${Math.round(kmh)} km/h` : ''}${kmh !== null && kmh < GG.AUSBREITUNG.schwach_kmh ? ' – sehr leicht, Richtung unsicher' : ''}</span></div></div>`;
    }
    const dreht = von !== null && !m && wind && wind.vorhersage ? GG.windDreht(wind.vorhersage, von, 90) : null;
    const quelle = m ? `Wind vor Ort bestimmt um ${uhrzeit(m.zeit)}.` : wind ? `Wind am Einsatzort: DWD-Station ${wind.station ? esc(wind.station.name) + (wind.station.km ? ` (${zahlText(wind.station.km)} km)` : '') : ''}, Messung ${uhrzeit(wind.zeit)}${wind.alt ? ' · <b>Stand ohne Netz</b>' : ''}.` : '';
    // Werte
    const werte = [`<div class="af-wert" style="--c:var(--crit)"><b>${meter(ab.grenze_m)}</b><span>Absperrgrenze – ${esc(ab.grund)}</span></div>`];
    if (ab.absperr_m) werte.push(`<div class="af-wert" style="--c:var(--good)"><b>${meter(ab.absperr_m)}</b><span>Absperrbereich – ${esc(ab.absperrGrund)}</span></div>`);
    if (ab.schutz_m && von !== null && !still) werte.push(`<div class="af-wert" style="--c:var(--warn)"><b>${meter(ab.schutz_m)}</b><span>${z.stoff && GG.absperrung(z.stoff.un).schutz ? `ERG: Schutzabstand in Windrichtung (${ab.schutzNacht ? 'Nacht' : 'Tag'})` : 'ERG: Räumung in Windrichtung erwägen'}</span></div>`);
    if (ab.brand_m && !z.brand) werte.push(`<div class="af-wert" style="--c:var(--ser)"><b>${meter(ab.brand_m)}</b><span>bei Brand eines Tanks (ERG)</span></div>`);
    const bw = routenBewerten();
    if (bw && bw.haupt) werte.push(`<div class="af-wert" style="--c:var(--akzent)"><b>${meter(bw.haupt.r.m)}</b><span>Route${bw.haupt.r.s ? ` · ca. ${Math.max(1, Math.round(bw.haupt.r.s / 60))} min ohne Sonderrechte` : ''}${routeStart && routeStart.standard ? ' · ab Miehlen (Standort nicht verfügbar)' : ' · ab meinem Standort'}</span></div>`);
    // Prüfung der Route
    let pruef = '';
    if (routeLaedt && !routen) pruef = `<div class="af-pruefung">${ICON.navi}<span>Route wird geprüft …</span></div>`;
    else if (routeFehler) pruef = `<div class="af-pruefung">${ICON.navi}<span>Route nicht prüfbar (${esc(routeFehler)}). Die Navi-App startet trotzdem – auf der letzten Strecke selbst auf die Anfahrtsrichtung achten.</span></div>`;
    else if (routen && !routen.length) pruef = `<div class="af-pruefung">${ICON.ort}<span>Du bist schon an der Einsatzstelle (unter 150 m).</span></div>`;
    else if (bw && bw.haupt) {
      const p = bw.haupt.p, ueber = bw.haupt.strasse ? ` über ${esc(bw.haupt.strasse)}` : '';
      const aus = p.ankunftGrad !== null ? richtung(p.ankunftGrad) : '';
      const teile = [];
      let art = p.bewertung || '';
      if (!p.bewertung) teile.push(`Die Route erreicht die Einsatzstelle${aus ? ' aus ' + esc(aus) : ''}${ueber}. Ohne Windrichtung keine Bewertung.`);
      else if (p.bewertung === 'gut') teile.push(`<b>Passt:</b> Die Route kommt aus ${esc(aus)}${ueber} – mit dem Wind im Rücken.`);
      else if (p.bewertung === 'seitlich') teile.push(`<b>Seitlich zum Wind:</b> Die Route kommt aus ${esc(aus)}${ueber}. Auf der letzten Strecke auf Wind und Ausbreitung achten.`);
      else teile.push(`<b>Achtung:</b> Die Route kommt aus ${esc(aus)}${ueber} – <b>gegen den Wind, aus der möglichen Ausbreitung</b>.`);
      if (p.imWindM) { teile.push(`Sie führt etwa ${meter(p.imWindM)} durch den Bereich in Windrichtung (bis ${meter(zoneLaenge(ab))}, rot auf der Karte).`); art = 'gegen'; }
      if (p.durchGefahr) { teile.push('Sie führt durch die Absperrgrenze hindurch, an der Einsatzstelle vorbei.'); art = 'gegen'; }
      if (bw.alt) teile.push(`<b>Besser:</b> Die Ausweichroute${bw.alt.strasse ? ' über ' + esc(bw.alt.strasse) : ''} kommt aus ${esc(richtung(bw.alt.p.ankunftGrad))} (grün gestrichelt, ${meter(bw.alt.r.m)}). Im Navi diese Route wählen oder unten „Google Maps über …“.`);
      else if (art !== 'gut' && von !== null && !still) teile.push(`Letzte Strecke so wählen, dass ihr aus ${esc(richtung(von))} kommt, und an der Absperrgrenze (${meter(ab.grenze_m)}) halten.`);
      pruef = `<div class="af-pruefung ${art}">${art === 'gut' ? ICON.ok : art ? ICON.warn : ICON.navi}<span>${teile.join(' ')}</span></div>`;
    }
    // Navi-Knöpfe: zuletzt benutzte App vorn
    const ziel = `${z.ziel.lat},${z.ziel.lon}`;
    const apple = `https://maps.apple.com/?daddr=${ziel}&dirflg=d`, google = `https://www.google.com/maps/dir/?api=1&destination=${ziel}&travelmode=driving`;
    const zuerst = LS.get(NAVI) === 'google' ? 'google' : 'apple';
    const knopf = (art, href, text, haupt) => `<a class="knopf${haupt ? ' los' : ''}" data-af-navi="${art}" href="${esc(href)}" target="_blank" rel="noopener">${ICON.navi}${text}</a>`;
    const kn = [knopf('apple', apple, 'Apple Karten', zuerst === 'apple'), knopf('google', google, 'Google Maps', zuerst === 'google')];
    if (zuerst === 'google') kn.reverse();
    if (bw && bw.zwischen) kn.push(`<a class="knopf zweit" data-af-navi="google" href="${esc(`${google}&waypoints=${bw.zwischen.lat.toFixed(6)},${bw.zwischen.lon.toFixed(6)}`)}" target="_blank" rel="noopener">${ICON.navi}Google Maps über Anfahrt aus ${esc(richtung(bw.alt.p.ankunftGrad))} (Zwischenpunkt)</a>`);
    const obj = OBJEKTE.find(o => GG.abstandM(o, z.ziel) <= o.umkreis_m);
    const objHtml = obj ? `<div class="ez-warn af-objekt" style="margin-top:.8rem"><b>${esc(obj.name)}:</b> ${esc(obj.text)} <i>(${esc(obj.quelle)})</i>
      ${obj.bereitstellung ? `<div class="af-knoepfe"><a class="knopf" data-af-navi="${zuerst}" href="${esc(zuerst === 'google' ? `https://www.google.com/maps/dir/?api=1&destination=${obj.bereitstellung.lat},${obj.bereitstellung.lon}&travelmode=driving` : `https://maps.apple.com/?daddr=${obj.bereitstellung.lat},${obj.bereitstellung.lon}&dirflg=d`)}" target="_blank" rel="noopener">${ICON.navi}Route zum Bereitstellungsraum (${esc(obj.bereitstellung.name)})</a></div>` : ''}</div>` : '';
    box.innerHTML = kern + `<div class="af-werte">${werte.join('')}</div>` + pruef + objHtml +
      (dreht ? `<div class="ez-warn" style="margin-top:.7rem"><b>Achtung:</b> Laut Vorhersage dreht der Wind bis ${uhrzeit(dreht.zeit)} auf ${esc(richtung(dreht.richtung))} (${Math.round(dreht.richtung)}°).</div>` : '') +
      (ab.hinweise && ab.hinweise.length ? `<div class="ez-warn" style="margin-top:.7rem">${ab.hinweise.map(esc).join('<br>')}</div>` : '') +
      `<div class="af-navi">${kn.join('')}</div>
      <div class="af-quelle">Route startet zur Einsatzstelle. Das Navi kennt die Gefahr nicht: An der Absperrgrenze halten, Lage aus Abstand erkunden.${routen && routen.length ? ' Vorschau mit OpenStreetMap-Routing (OSRM) – das Navi kann anders fahren.' : ''}</div>
      <div class="af-wind-zeile">${quelle ? quelle + ' ' : ''}<a href="#" data-af-wind="neu">Wind neu abrufen</a> · <a href="#" data-af-wind="vorort">${m ? 'Wind vor Ort ändern' : 'Wind vor Ort eingeben'}</a>${m ? ' · <a href="#" data-af-wind="dwd">DWD-Wert verwenden</a>' : ''}</div>
      <div data-af-kompass ${von === null && !windLaedt ? '' : 'hidden'}><div class="lg-klein" style="margin-top:.5rem">Der Wind kommt aus …</div><div class="af-kompass">${[['N', 0], ['NO', 45], ['O', 90], ['SO', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]]
        .map(([t, g]) => `<button type="button" data-af-windwahl="${g}" class="${m && GG.himmelsrichtung(m.richtung) === t ? 'an' : ''}">${t}</button>`).join('')}</div></div>`;
    for (const a of box.querySelectorAll('[data-af-navi]')) a.addEventListener('click', () => navigieren(a.dataset.afNavi));
    for (const a of box.querySelectorAll('[data-af-wind]')) a.addEventListener('click', e => {
      e.preventDefault();
      const w = a.dataset.afWind;
      if (w === 'neu') { z.windManuell = null; sichern(); windLaden(true); }
      if (w === 'vorort') box.querySelector('[data-af-kompass]').hidden = false;
      if (w === 'dwd') { z.windManuell = null; sichern(); ergebnisZeigen(); karteAktualisieren(); }
    });
    for (const b of box.querySelectorAll('[data-af-windwahl]')) b.addEventListener('click', () => { z.windManuell = { richtung: Number(b.dataset.afWindwahl), zeit: Date.now() }; sichern(); ergebnisZeigen(); karteAktualisieren(); });
  }
  // Navi starten: App merken, laufenden Einsatz ins Tagebuch
  function navigieren(art) {
    LS.set(NAVI, art);
    const b = bericht();
    if (b && z.ziel) {
      const ab = abstaende(), von = windVon();
      b.eintragen(`Anfahrt gestartet (${art === 'google' ? 'Google Maps' : 'Apple Karten'}): ${z.ziel.name || z.ziel.lat.toFixed(5) + ', ' + z.ziel.lon.toFixed(5)}` +
        (von !== null && !windStill() ? `; Wind aus ${GG.himmelsrichtung(von)}, Anfahrt aus ${richtung(von)}` : '') + `; Absperrgrenze ${meter(ab.grenze_m)} (${ab.grund})`, 'system');
    }
    // Reihenfolge der Knöpfe erst beim nächsten Zeichnen ändern (der Link öffnet gerade)
  }

  // ---------------------------------------------------------------- Karte
  function kartenOpts() {
    const ab = abstaende(), von = windVon(), still = windStill(), kmh = windKmh();
    const zug = von === null || still ? null : GG.ausbreitungsrichtung(von);
    const fw = LG.grundlage && LG.grundlage() === 'fwdv500';
    const bw = routenBewerten();
    const L = zoneLaenge(ab);
    const st = LS.get('gsz-ort');
    return {
      unfallort: z.ziel, standort: st && st.gps && !st.standard ? st : null, ohneStandortEinpassen: true,
      gefahr_m: ab.grenze_m, absperr_m: ab.absperr_m || (fw && ab.grenze_m < 100 ? 100 : null), ergAbs_m: null,
      zone: null,
      olive: zug !== null ? { laenge_m: L, winkel: ZONE_WINKEL, text: `Bereich in Windrichtung (Annahme ${meter(L)}, Keule ${ZONE_WINKEL}°)`, kurz: `in Windrichtung bis ${meter(L)}` } : null,
      still: von !== null && still ? { m: GG.AUSBREITUNG.still_m, text: 'Windstille: Kreis 500 m (bis 1 km)', kurz: 'Windstille: 500 m (bis 1 km)' } : null,
      zugGrad: zug,
      anfahrt: von !== null && !still ? { vonGrad: von, winkel: 90, innen_m: ab.grenze_m, aussen_m: Math.max(ab.grenze_m * 3, ab.grenze_m + 250), kurz: `Anfahrt aus ${GG.himmelsrichtung(von)}`,
        text: `Anfahrt mit dem Wind im Rücken (aus ${richtung(von)})${kmh !== null && kmh < GG.AUSBREITUNG.schwach_kmh ? ' – Wind sehr leicht, Richtung unsicher' : ''}` } : null,
      route: bw && bw.haupt ? bw.haupt.r.punkte : null, routeKritisch: bw && bw.haupt ? bw.haupt.p.kritisch : [], routeAlt: bw && bw.alt ? bw.alt.r.punkte : null,
      google: LG.googleSchluessel ? LG.googleSchluessel() : '',
      beiVerschieben: ort => { z.ziel = { lat: ort.lat, lon: ort.lon, name: '', quelle: 'karte' }; sichern(); if (window.GSZKarte) GSZKarte.unfallortSetzen(z.ziel, 'anfahrt');
        ortZeigen(); LG.ortName(z.ziel).then(n => { if (n && z.ziel) { z.ziel.name = n; sichern(); ortZeigen(); } }).catch(() => {}); windLaden(); routeLaden(); },
    };
  }
  async function karteZeigen() {
    const kEl = el.querySelector('[data-af-karte]');
    if (!kEl || !window.GSZKarte || !z.ziel) return;
    if (karte) { karteAktualisieren(); return; }
    if (karteLaedt) return;
    const mein = lauf;
    karteLaedt = (async () => {
      try { karte = await GSZKarte.zeigen(kEl, kartenOpts()); }
      catch (e) { const k = el.querySelector('#af-karte-k'); if (k) k.querySelector('.lg-karte-rahmen').outerHTML = `<div class="ez-leer">Karte nicht verfügbar (${esc(e.message)}).</div>`; karte = null; }
    })();
    await karteLaedt; karteLaedt = null;
    if (mein !== lauf) return;
    karteAktualisieren(true);
  }
  // Ausschnitt neu einpassen, wenn sich Einsatzort, Bereiche oder Windrichtung ändern (nicht bei jeder neuen Route)
  let kartenStand = '';
  function karteAktualisieren(einpassen = false) {
    windAufKarte();
    if (!karte || !z.ziel) return;
    const o = kartenOpts();
    karte.setzen({ ...o, unfallort: z.ziel });
    const st = [z.ziel.lat, z.ziel.lon, o.gefahr_m, o.absperr_m, o.zugGrad, o.olive && o.olive.laenge_m, o.still && o.still.m].join('|');
    if (einpassen || st !== kartenStand) { kartenStand = st; karte.zentrieren(); }
  }
  function windAufKarte() {
    const w = el.querySelector('[data-lg-karte-wind]');
    if (!w) return;
    const von = windVon();
    if (von === null || windStill()) { w.hidden = true; return; }
    w.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(${Math.round(GG.ausbreitungsrichtung(von))} 12 12)"><path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg><span>Wind aus ${esc(richtung(von))} · Anfahrt aus ${esc(GG.himmelsrichtung(von))}</span>`;
    w.hidden = false;
  }
  function kartenKnopf(w) {
    if (!karte) return;
    if (w === 'stelle') karte.zentrieren();
    if (w === 'route') { const bw = routenBewerten(); const p = bw && bw.haupt ? [...bw.haupt.r.punkte, ...(bw.alt ? bw.alt.r.punkte : [])] : []; if (p.length) karte.zeigeBereich(p); else meldung('Keine Route vorhanden.', 3000); }
    if (w === 'mitte') { const m = karte.mitte(); kartenOpts().beiVerschieben(m); karte.setzen({ unfallort: { lat: m.lat, lon: m.lon } }); }
  }

  GSZ.ansicht('anfahrt', { element: el, titel: () => 'Anfahrt', anzeigen() { zeigen(); } });
  window.GSZAnfahrt = { zeigen, ortText, laden, routenBewerten: () => routenBewerten() };
})();
