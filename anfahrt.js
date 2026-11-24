// Anfahrt zur Einsatzstelle (erste Phase, Ansicht #anfahrt): Einsatzort (Adresse, Koordinaten, Link aus der Alarmierung, Karte
// oder eigener Standort), Stoff falls schon bekannt (UN-Nr., Warntafel oder Benennung – ohne Netz), Wind am Einsatzort (DWD über
// Bright Sky), Absperrgrenze (Gefahrstoffkonzept RLP bzw. FwDV 500, ergänzt um ERG 2024) und die empfohlene Anfahrtsrichtung mit
// dem Wind im Rücken. Die Route kommt zur Vorschau vom freien OSRM-Routendienst (OpenStreetMap): Die App prüft, aus welcher
// Richtung sie die Einsatzstelle erreicht und ob sie durch den Bereich in Windrichtung führt. Die Routenführung selbst startet
// in Apple Karten bzw. Google Maps – Ziel ist die Einsatzstelle (Festlegung Lucas, 23.11.2026).
// Der Einsatzort wird Unfallort der Lagekarte und Vorschlag für „Einsatzort“ beim Beginn der Einsatz-Dokumentation.
// Aufbau seit 2.13.0 (Wunsch Lucas 24.11.2026): Karte immer im Vollbild (Straße oder Hybrid), Einsatzstelle per Tippen; Einsatzort,
// Stoff, Anfahrt und Hinweise als Fenster darüber, einzeln ein- und ausblendbar; unten fest „Eintreffen in … min“ und die Navigation.
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
  const PHOTON = 'https://photon.komoot.io';           // Suche mit Orten von Interesse (POI), OpenStreetMap-Daten, Betreiber komoot
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
    tafel: SVG('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 12h18"/>'),
    info: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
    ebenen: SVG('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
    ziel: SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="7"/>'),
    route: SVG('<path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M8 17h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6"/>'),
    zu: SVG('<path d="M6 6l12 12M18 6 6 18"/>', 2.4),
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
  const rund6 = x => Math.round(Number(x) * 1e6) / 1e6;
  async function adresseSuchen(text, mitte = null) {
    const q = `${NOMINATIM}?format=jsonv2&q=${encodeURIComponent(text)}&countrycodes=de&limit=6&addressdetails=1&accept-language=de&viewbox=${UMGEBUNG}`;
    const l = await json(q);
    return (Array.isArray(l) ? l : []).map(x => {
      const a = x.address || {}, n = trefferName(x), poi = x.name && x.name !== a.road ? x.name : '';
      const t = { lat: rund6(x.lat), lon: rund6(x.lon), name: n, titel: poi || n, unter: poi ? n.replace(poi + ', ', '') : [a.municipality, a.county].filter(Boolean).join(', '),
        art: artText({ osm_key: x.category, osm_value: x.type, type: x.addresstype }), quelle: 'adresse' };
      t.km = mitte ? GG.abstandM(mitte, t) / 1000 : null;
      return t;
    }).filter(x => isFinite(x.lat) && isFinite(x.lon));
  }

  // ---------------------------------------------------------------- Suche mit Orten von Interesse (POI, seit 2.14.0)
  // Photon (OpenStreetMap-Daten, komoot): Namen von Firmen, Schulen, Geschäften, Einrichtungen – gewichtet auf den Kartenausschnitt.
  // Arten („Schule“, „Kita Nastätten“, „Tankstelle“): alle benannten Orte dieser Art im Umkreis der Kartenmitte bzw. des genannten
  // Orts, nach Entfernung. Eigene Objekte (Alarm- und Einsatzpläne) auch ohne Netz.
  const ARTEN = [
    [/^(grund|real|gesamt|haupt|berufs|förder|foerder)?schulen?$|^gymnasium$/, 'Schulen', ['amenity:school']],
    [/^(kitas?|kindergärten|kindergarten|kindertagesstätten?)$/, 'Kitas', ['amenity:kindergarten', 'amenity:childcare']],
    [/^(krankenhaus|krankenhäuser|kliniken?|klinikum)$/, 'Krankenhäuser', ['amenity:hospital', 'amenity:clinic']],
    [/^(arzt|ärzte|arztpraxis|praxis)$/, 'Arztpraxen', ['amenity:doctors']],
    [/^apotheken?$/, 'Apotheken', ['amenity:pharmacy']],
    [/^(pflegeheime?|altenheime?|seniorenheime?|altersheime?|seniorenresidenz)$/, 'Pflege- und Seniorenheime', ['amenity:nursing_home', 'amenity:social_facility']],
    [/^tankstellen?$/, 'Tankstellen', ['amenity:fuel']],
    [/^(feuerwehr|feuerwehrhaus|feuerwehrhäuser|gerätehaus|feuerwache)$/, 'Feuerwehren', ['amenity:fire_station']],
    [/^(polizei|polizeiinspektion|polizeiwache)$/, 'Polizei', ['amenity:police']],
    [/^(rathaus|rathäuser|verwaltung|verbandsgemeinde)$/, 'Rathäuser', ['amenity:townhall']],
    [/^(kirchen?|kapellen?)$/, 'Kirchen', ['amenity:place_of_worship']],
    [/^(supermarkt|supermärkte|discounter)$/, 'Supermärkte', ['shop:supermarket']],
    [/^baumärkte?$|^baumarkt$/, 'Baumärkte', ['shop:doityourself', 'shop:hardware']],
    [/^(hotels?|pension|gasthof)$/, 'Hotels', ['tourism:hotel', 'tourism:guest_house']],
    [/^(campingplatz|campingplätze|camping)$/, 'Campingplätze', ['tourism:camp_site']],
    [/^(sporthallen?|turnhallen?|sportplatz|sportplätze|stadion)$/, 'Sportstätten', ['leisure:sports_centre', 'leisure:sports_hall', 'leisure:stadium', 'leisure:pitch']],
    [/^(schwimmbad|hallenbad|freibad)$/, 'Bäder', ['leisure:swimming_pool', 'leisure:water_park', 'amenity:swimming_pool']],
    [/^(bahnhof|bahnhöfe|haltepunkt)$/, 'Bahnhöfe', ['railway:station', 'railway:halt']],
    [/^(kläranlagen?|klaeranlage)$/, 'Kläranlagen', ['man_made:wastewater_plant']],
    [/^(wasserwerk|hochbehälter|hochbehaelter|wasserturm)$/, 'Wasserversorgung', ['man_made:water_works', 'man_made:reservoir_covered', 'man_made:water_tower']],
    [/^umspannwerke?$/, 'Umspannwerke', ['power:substation']],
    [/^(firma|firmen|betrieb|betriebe|industrie|industriegebiet|gewerbegebiet|gewerbe)$/, 'Gewerbe und Industrie', ['landuse:industrial', 'man_made:works', 'landuse:commercial']],
    [/^(parkplatz|parkplätze)$/, 'Parkplätze', ['amenity:parking']],
    [/^friedhöfe?$|^friedhof$/, 'Friedhöfe', ['landuse:cemetery', 'amenity:grave_yard']],
    [/^(landeplatz|hubschrauberlandeplatz|helipad)$/, 'Hubschrauberlandeplätze', ['aeroway:helipad', 'aeroway:heliport']],
  ];
  const FUELL = /^(in|im|bei|beim|nahe|nähe|am|an|der|die|das|den|dem|um|von|rund|alle)$/;
  // „Kita Nastätten“ → { name: 'Kitas', tags, ort: 'nastätten' }; keine Art → null
  function artLesen(text) {
    const w = String(text).toLowerCase().split(/[\s,;]+/).filter(Boolean);
    for (let i = 0; i < w.length; i++) for (const [re, name, tags] of ARTEN) if (re.test(w[i])) return { name, tags, ort: w.filter((x, j) => j !== i && !FUELL.test(x)).join(' ') };
    return null;
  }
  // Art eines Treffers (OSM-Schlüssel und -Wert) in Worten
  const OSM_ART = { 'amenity:school': 'Schule', 'amenity:kindergarten': 'Kita', 'amenity:childcare': 'Kinderbetreuung', 'amenity:hospital': 'Krankenhaus', 'amenity:clinic': 'Klinik',
    'amenity:doctors': 'Arztpraxis', 'amenity:pharmacy': 'Apotheke', 'amenity:nursing_home': 'Pflegeheim', 'amenity:social_facility': 'Soziale Einrichtung', 'amenity:fuel': 'Tankstelle',
    'amenity:fire_station': 'Feuerwehr', 'building:fire_station': 'Feuerwehr', 'amenity:police': 'Polizei', 'amenity:townhall': 'Rathaus', 'amenity:place_of_worship': 'Kirche',
    'amenity:parking': 'Parkplatz', 'amenity:restaurant': 'Gaststätte', 'shop:supermarket': 'Supermarkt', 'shop:doityourself': 'Baumarkt', 'tourism:hotel': 'Hotel',
    'tourism:guest_house': 'Pension', 'tourism:camp_site': 'Campingplatz', 'leisure:sports_centre': 'Sportstätte', 'leisure:sports_hall': 'Sporthalle', 'leisure:pitch': 'Sportplatz',
    'leisure:swimming_pool': 'Bad', 'railway:station': 'Bahnhof', 'railway:halt': 'Haltepunkt', 'man_made:wastewater_plant': 'Kläranlage', 'man_made:water_works': 'Wasserwerk',
    'man_made:reservoir_covered': 'Hochbehälter', 'power:substation': 'Umspannwerk', 'landuse:industrial': 'Gewerbe/Industrie', 'man_made:works': 'Werk', 'landuse:commercial': 'Gewerbe',
    'landuse:cemetery': 'Friedhof', 'aeroway:helipad': 'Hubschrauberlandeplatz', 'place:city': 'Stadt', 'place:town': 'Stadt', 'place:village': 'Ort', 'place:hamlet': 'Ortsteil',
    'place:suburb': 'Ortsteil', 'place:isolated_dwelling': 'Einzelgehöft', 'place:farm': 'Hof', 'boundary:administrative': 'Gemeinde' };
  const OSM_GRUPPE = { shop: 'Geschäft', office: 'Firma/Büro', craft: 'Handwerk', industrial: 'Industrie', tourism: 'Tourismus', leisure: 'Freizeit', amenity: 'Einrichtung',
    building: 'Gebäude', highway: 'Straße', man_made: 'Anlage', historic: 'Denkmal', natural: 'Natur', landuse: 'Fläche', railway: 'Bahn', waterway: 'Gewässer' };
  function artText(p) {
    const k = p.osm_key || '', v = p.osm_value || '';
    if (p.type === 'house' || (k === 'building' && (v === 'yes' || v === 'house' || v === 'residential')) || (k === 'place' && v === 'house')) return 'Adresse';
    if (k === 'highway' && !/bus_stop/.test(v)) return 'Straße';
    if (k === 'highway' && v === 'bus_stop') return 'Haltestelle';
    return OSM_ART[k + ':' + v] || OSM_GRUPPE[k] || 'Ort';
  }
  function photonTreffer(f, mitte) {
    const p = f.properties || {}, c = (f.geometry && f.geometry.coordinates) || [];
    const strasse = [p.street, p.housenumber].filter(Boolean).join(' '), ort = p.city || p.town || p.village || p.locality || p.district || '';
    const name = p.name && p.name !== p.street ? p.name : '';
    const adresse = [strasse, [p.postcode, ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const t = { lat: rund6(c[1]), lon: rund6(c[0]), titel: name || adresse || p.name || '', unter: name ? adresse || [p.county, p.state].filter(Boolean).join(', ') : [p.county].filter(Boolean).join(', '),
      art: artText(p), quelle: 'poi', land: p.countrycode || '' };
    t.name = name && adresse ? `${name}, ${adresse}` : t.titel;
    t.km = mitte ? GG.abstandM(mitte, t) / 1000 : null;
    return t;
  }
  const photonListe = (j, mitte) => ((j && j.features) || []).filter(f => f.geometry && Array.isArray(f.geometry.coordinates)).map(f => photonTreffer(f, mitte)).filter(t => isFinite(t.lat) && isFinite(t.lon) && t.titel);
  // freie Suche, gewichtet auf die Mitte; erst im Umkreis (ca. 50 km), sonst in Deutschland
  async function photonSuchen(text, mitte) {
    const q = `${PHOTON}/api/?q=${encodeURIComponent(text)}&lang=de&limit=10&lat=${mitte.lat.toFixed(5)}&lon=${mitte.lon.toFixed(5)}`;
    const box = `&bbox=${(mitte.lon - 0.7).toFixed(3)},${(mitte.lat - 0.45).toFixed(3)},${(mitte.lon + 0.7).toFixed(3)},${(mitte.lat + 0.45).toFixed(3)}`;
    let l = photonListe(await json(q + box), mitte);
    if (!l.length) l = photonListe(await json(q), mitte).filter(t => !t.land || t.land === 'DE');
    return l;
  }
  // alle benannten Orte einer Art im Umkreis (km), nach Entfernung
  async function photonUmkreis(mitte, tags, km) {
    const j = await json(`${PHOTON}/reverse?lat=${mitte.lat.toFixed(5)}&lon=${mitte.lon.toFixed(5)}&lang=de&limit=15&radius=${km}${tags.map(t => '&osm_tag=' + encodeURIComponent(t)).join('')}`);
    return photonListe(j, mitte).sort((a, b) => a.km - b.km);
  }
  // Ortsname → Mittelpunkt (der nächste Ort dieses Namens, höchstens 100 km entfernt)
  async function photonOrt(name, mitte) {
    const l = photonListe(await json(`${PHOTON}/api/?q=${encodeURIComponent(name)}&lang=de&limit=5&lat=${mitte.lat.toFixed(5)}&lon=${mitte.lon.toFixed(5)}&osm_tag=place`), mitte);
    return l.filter(t => t.km <= 100).sort((a, b) => a.km - b.km)[0] || null;
  }
  // eigene Objekte (ohne Netz): alle Wörter der Eingabe müssen vorkommen
  function eigeneSuchen(text, mitte) {
    const w = String(text).toLowerCase().split(/[\s,;]+/).filter(x => x && !FUELL.test(x));
    if (!w.length) return [];
    return EIGENE.filter(o => { const h = (o.titel + ' ' + o.such).toLowerCase(); return w.every(x => h.includes(x)); })
      .map(o => ({ ...o, name: o.titel, art: 'Eigenes Objekt', quelle: 'objekt', km: mitte ? GG.abstandM(mitte, o) / 1000 : null }));
  }
  // doppelte Treffer (gleicher Ort, ähnlicher Name, unter 80 m) zusammenfassen – der erste bleibt
  function zusammenfuehren(l) {
    const aus = [];
    const n = x => String(x || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    for (const t of l) {
      if (aus.some(a => GG.abstandM(a, t) < 80 && (n(a.titel) === n(t.titel) || n(a.titel).includes(n(t.titel)) || n(t.titel).includes(n(a.titel))))) continue;
      aus.push(t);
    }
    return aus;
  }
  // Route vom Standort zur Einsatzstelle (OSRM, mit Ausweichrouten) → [{ punkte, m, s, steps }]
  let routeCache = null;
  async function routenHolen(start, ziel) {
    const k = [start.lat, start.lon, ziel.lat, ziel.lon].map(x => x.toFixed(4)).join(',');
    if (routeCache && routeCache.k === k && Date.now() - routeCache.zeit < ROUTE_GUELTIG_MS) return routeCache.routen;
    const j = await json(`${OSRM}${start.lon},${start.lat};${ziel.lon},${ziel.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`);
    if (!j || j.code !== 'Ok' || !Array.isArray(j.routes) || !j.routes.length) throw new Error(j && j.message ? j.message : 'keine Route gefunden');
    const routen = j.routes.map(r => ({ roh: r, punkte: ((r.geometry && r.geometry.coordinates) || []).map(([lon, lat]) => ({ lat, lon })), m: r.distance, s: r.duration,
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
  /* Bühne: Karte im Vollbild unter der Titelleiste, darüber Leiste (Fenster), Werkzeuge (Karte), Fenster und die untere Leiste */
  body[data-ansicht="anfahrt"] { overflow: hidden; overscroll-behavior: none; }
  /* #anfahrtansicht > …: die Seitenregel „höchstens 62rem breit, mittig“ für Einsatzseiten gilt hier nicht */
  #anfahrtansicht > .af-buehne { position: fixed; z-index: 1; top: var(--kopf-hoehe, 3.5rem); left: 0; right: 0; bottom: 0; width: auto; max-width: none; margin: 0; padding: 0; background: var(--page); }
  .af-karte { position: absolute; z-index: 0; isolation: isolate; top: 0; bottom: var(--sicher-unten, 0px); left: var(--sicher-links, 0px); right: var(--sicher-rechts, 0px); background: #dfe3e8; }
  .af-karte .leaflet-bottom { margin-bottom: calc(var(--af-unten-h, 4rem) + 1rem); }
  .af-ueber { position: absolute; z-index: 5; }
  .af-leiste { top: .5rem; left: calc(.5rem + var(--sicher-links, 0px)); right: calc(4.4rem + var(--sicher-rechts, 0px)); display: flex; gap: .4rem; overflow-x: auto; scrollbar-width: none; padding: 2px; }
  .af-leiste::-webkit-scrollbar { display: none; }
  .af-chip { flex: none; position: relative; display: inline-flex; align-items: center; gap: .35rem; min-height: 42px; padding: .35rem .75rem; border-radius: 999px; border: 1px solid var(--rand);
    background: var(--surface); color: var(--ink); font: inherit; font-size: max(13px, .84rem); font-weight: 650; box-shadow: 0 2px 10px rgba(0, 0, 0, .28); cursor: pointer; }
  .af-chip svg { width: 1.05rem; height: 1.05rem; flex: none; }
  .af-chip[aria-pressed="true"] { background: var(--akzent-voll); border-color: var(--akzent-voll); color: #fff; }
  .af-chip .kurz { display: none; }
  @media (max-width: 440px) { .af-chip { padding: .35rem .6rem; gap: .3rem; } .af-chip .lang { display: none; } .af-chip .kurz { display: inline; } .af-chip[data-af-auf="hinweise"] { padding: .35rem .7rem; } }
  .af-chip i { position: absolute; top: 2px; right: 4px; width: .6rem; height: .6rem; border-radius: 50%; background: var(--c, var(--crit)); border: 2px solid var(--surface); }
  .af-chip i[hidden] { display: none; }
  /* Werkzeuge: eine Spalte; reicht die Höhe nicht (Handy quer), bricht sie nach links in eine zweite Spalte um */
  .af-werkzeuge { top: .5rem; right: calc(.5rem + var(--sicher-rechts, 0px)); display: flex; flex-direction: column; flex-wrap: wrap-reverse; align-content: flex-start; gap: .35rem;
    max-height: calc(100% - var(--af-unten-h, 4rem) - 1.5rem - var(--sicher-unten, 0px)); }
  .af-werkzeuge > * { box-sizing: border-box; width: 3.4rem; min-height: 3rem; border-radius: .7rem; border: 1px solid var(--rand); background: var(--surface); color: var(--ink);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .1rem; font: inherit; font-size: 12px; font-weight: 650; line-height: 1.1;
    text-decoration: none; box-shadow: 0 2px 10px rgba(0, 0, 0, .28); cursor: pointer; padding: .25rem 0; }
  .af-werkzeuge svg { width: 1.25rem; height: 1.25rem; }
  .af-werkzeuge .zoom { font-size: 1.45rem; font-weight: 500; min-height: 2.7rem; }
  .af-werkzeuge .af-ebene-an { background: var(--akzent-voll); border-color: var(--akzent-voll); color: #fff; }
  .af-fenster { top: 3.7rem; left: calc(.5rem + var(--sicher-links, 0px)); width: min(26rem, calc(100% - 5.1rem - var(--sicher-links, 0px) - var(--sicher-rechts, 0px)));
    bottom: calc(var(--af-unten-h, 4rem) + 1rem + var(--sicher-unten, 0px)); overflow: hidden; pointer-events: none; display: flex; flex-direction: column; gap: .5rem; }
  /* Fenster teilen sich die Höhe der Spalte und scrollen jeweils in sich (Kopf mit × bleibt stehen); die Spalte selbst scrollt nicht –
     sie lässt Berührungen zur Karte durch und ließe sich auf dem Gerät nicht wischen */
  .af-panel { pointer-events: auto; display: flex; flex-direction: column; flex: none; min-height: 0; max-height: 100%; overflow: hidden; box-sizing: border-box;
    background: var(--surface); border: 1px solid var(--rand); border-radius: .9rem; box-shadow: 0 6px 22px rgba(0, 0, 0, .32); }
  .af-panel[hidden] { display: none; }
  .af-panel-kopf { flex: none; display: flex; align-items: center; gap: .5rem; padding: .35rem .4rem .35rem .85rem; border-bottom: 1px solid var(--line); }
  #anfahrtansicht .af-panel-kopf h2 { margin: 0; flex: 1; font-size: 1.05rem; font-weight: 650; color: var(--ink); text-transform: none; letter-spacing: 0; }
  .af-panel-kopf h2 small { font-weight: 500; color: var(--muted); font-size: max(13px, .8rem); }
  .af-panel-kopf button { flex: none; width: 44px; height: 44px; border: 0; border-radius: .55rem; background: transparent; color: var(--ink2); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .af-panel-kopf button svg { width: 1.2rem; height: 1.2rem; }
  .af-panel-inhalt { padding: .75rem .85rem .85rem; flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .af-unten { left: calc(.5rem + var(--sicher-links, 0px)); right: calc(.5rem + var(--sicher-rechts, 0px)); bottom: calc(.5rem + var(--sicher-unten, 0px)); z-index: 6;
    background: var(--surface); border: 1px solid var(--rand); border-radius: .9rem; box-shadow: 0 6px 22px rgba(0, 0, 0, .35); padding: .6rem .7rem;
    display: flex; flex-wrap: wrap; align-items: center; gap: .55rem .8rem; }
  @media (min-width: 760px) { .af-unten { right: auto; width: min(26rem, calc(100% - 5.1rem)); box-sizing: border-box; } }
  /* niedrige Bildschirme (Handy quer): untere Leiste einzeilig und breiter – Text links, Knöpfe rechts –, damit Fenster Platz haben */
  @media (max-height: 500px) and (min-width: 600px) {
    .af-unten { width: min(44rem, calc(100% - 9rem - var(--sicher-links, 0px) - var(--sicher-rechts, 0px))); flex-wrap: nowrap; padding: .4rem .55rem; gap: .6rem; }
    .af-unten-zeile { flex: 1 1 auto; } .af-unten-zeile > svg { width: 2rem; height: 2rem; }
    .af-unten-text b { font-size: 1rem; } .af-unten-text small { font-size: 13px; }
    .af-unten-knoepfe { flex: 0 0 auto; } .af-unten-knoepfe .knopf { min-height: 2.75rem !important; padding: .3rem .8rem; } }
  .af-unten-zeile { display: flex; align-items: center; gap: .6rem; flex: 1 1 14rem; min-width: 0; }
  .af-unten-zeile > svg { width: 2.5rem; height: 2.5rem; flex: none; }
  .af-unten-zeile > svg.af-unten-ort { color: var(--crit); width: 1.8rem; height: 1.8rem; }
  .af-unten-text { min-width: 0; }
  .af-unten-text b { display: block; font-size: 1.12rem; line-height: 1.2; font-variant-numeric: tabular-nums; }
  .af-unten-text small { display: block; color: var(--ink2); font-size: max(13px, .82rem); line-height: 1.3; margin-top: .1rem; }
  .af-unten-knoepfe { display: flex; gap: .45rem; flex: 1 1 11rem; }
  .af-unten-knoepfe .knopf { flex: 1; min-height: 3rem !important; font-weight: 700; }
  .af-unten-knoepfe .knopf svg { width: 1.1rem; height: 1.1rem; }
  .af-suche { display: flex; gap: .45rem; }
  .af-suche input, .af-stoff input { flex: 1; min-width: 0; font: inherit; font-size: 17px; padding: .65rem .75rem; border-radius: .55rem; border: 1px solid var(--rand);
    background: var(--surface2); color: var(--ink); box-sizing: border-box; width: 100%; }
  .af-suche button { flex: none; }
  .af-knoepfe { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .55rem; }
  .af-knoepfe .knopf { font-size: .88rem; }
  .af-treffer { list-style: none; margin: .55rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
  .af-treffer button { width: 100%; text-align: left; font: inherit; display: flex; flex-direction: column; gap: .1rem; padding: .6rem .75rem; min-height: 44px;
    border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .af-treffer button { flex-direction: row; align-items: center; gap: .6rem; }
  .af-treffer-text { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
  .af-treffer button b { font-weight: 600; overflow-wrap: anywhere; } .af-treffer button small { color: var(--muted); font-size: max(13px, .8125rem); }
  .af-nr { flex: none; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: var(--akzent-voll); color: #fff; font-weight: 700; font-size: .85rem; display: flex; align-items: center; justify-content: center; }
  .af-km { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .gk-treffer { background: none; border: 0; }
  .gk-vorschlag { background: none; border: 0; } .gk-vorschlag svg { display: block; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .45)); }
  .af-unten-text small[data-af-vorschlag-name] { color: var(--ink); font-weight: 600; }
  .gk-treffer span { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; box-sizing: border-box; border-radius: 50%; background: #2563c9; color: #fff;
    border: 2px solid #fff; font: 700 13px/1 system-ui, -apple-system, sans-serif; box-shadow: 0 1px 4px rgba(0, 0, 0, .5); }
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
  .af-navi .af-start { flex: 1 1 100%; min-height: 3.4rem !important; font-size: 1.12rem !important; }
  .af-navi-extern { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; margin-top: .6rem; }
  .af-navi-extern > span { font-size: max(13px, .84rem); color: var(--muted); flex: 0 0 auto; }
  .af-navi-extern .knopf { flex: 1 1 8rem; font-size: .9rem; }
  .af-navi-extern .knopf.zweit { flex: 1 1 100%; }
  .af-navi-extern .knopf svg { width: 1.05rem; height: 1.05rem; }
  .af-wind-zeile { margin-top: .75rem; font-size: max(13px, .84rem); color: var(--ink2); line-height: 1.4; }
  .af-kompass { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .35rem; margin-top: .45rem; }
  .af-kompass button { font: inherit; font-weight: 700; padding: .55rem 0; min-height: 44px; border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .af-kompass button.an { background: var(--akzent-voll); color: #fff; border-color: var(--akzent-voll); }
  .af-seg { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem; margin-top: .6rem; }
  .af-seg button { font: inherit; font-size: .86rem; font-weight: 600; padding: .5rem .4rem; min-height: 44px; border-radius: .55rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .af-seg button[aria-pressed="true"], .af-seg button[aria-checked="true"] { background: var(--akzent-voll); border-color: var(--akzent-voll); color: #fff; }
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
    ['Erkunden', 'Anfahrt nach Windrichtung, Meldebild und Topografie der Einsatzstelle; Erkundung auf Distanz (Fernglas).', 'Präsentation „Einsätze mit Gefährlichen Stoffen und Gütern“ (2025), Folie 27'],
    ['Erstmaßnahmen', 'GAMS: Gefahren erkennen – Absichern – Menschenrettung unter Eigenschutz – Spezialkräfte nachfordern.', 'Gefahrstoffkonzept RLP, 3.1'],
  ];
  // Objekte mit eigener Regel für die Anfahrt (Alarm- und Einsatzpläne): Hinweis, wenn der Einsatzort im Umkreis liegt
  const FW_MIEHLEN = { lat: 50.22629, lon: 7.83449, name: 'Feuerwehrhaus Miehlen' };
  // eigene Objekte für die Suche (auch ohne Netz)
  const EIGENE = [
    { titel: 'Polynt Composites Germany GmbH', unter: 'Kieselstraße 2, 56357 Miehlen · Alarm- und Einsatzplan', lat: 50.21814, lon: 7.83955, such: 'polynt composites kieselstraße aep werk' },
    { titel: 'Feuerwehrhaus Miehlen', unter: 'Krämergasse 22, 56357 Miehlen · Bereitstellungsraum AEP Polynt', lat: 50.22629, lon: 7.83449, such: 'feuerwehr feuerwehrhaus gerätehaus bahnhofstraße bereitstellungsraum ffw' },
  ];
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

  // ---------------------------------------------------------------- Ansicht: Karte im Vollbild, darüber Fenster zum Ein- und Ausblenden
  const FENSTER = [['ort', 'Einsatzort', ICON.ort, 'Ort'], ['stoff', 'Stoff', ICON.tafel, 'Stoff'], ['anfahrt', 'Anfahrt', ICON.anfahrt, 'Anfahrt'], ['hinweise', 'Hinweise', ICON.info, '']];
  const schmal = () => innerWidth < 760;
  let offen = new Set();
  // offene Fenster je Gerät; ohne Wahl: ohne Einsatzstelle „Einsatzort“, mit Einsatzstelle auf breiten Bildschirmen „Anfahrt“
  const offenLaden = () => { const l = LS.get('gsz-anfahrt-fenster'); return new Set(Array.isArray(l) ? l : z.ziel ? (schmal() ? [] : ['anfahrt']) : ['ort']); };
  const offenSichern = () => LS.set('gsz-anfahrt-fenster', [...offen]);
  const el = E.ansichtElement('anfahrtansicht');
  let karte = null, karteLaedt = null, lauf = 0, vorschlag = null, takt = null;
  function zeigen() {
    lauf++;
    if (karte) { try { karte.zerstoeren(); } catch { /* schon weg */ } karte = null; }
    kartenStand = ''; vorschlag = null;
    z = laden();
    offen = offenLaden();
    el.innerHTML = '';
    el.appendChild(E.kopf({ titel: 'Anfahrt', unter: 'Einsatzort, Wind, Absperrgrenze und Route', eltern: 'start' }));
    const kopf = (id, titel, zusatz = '') => `<div class="af-panel-kopf"><h2>${titel}${zusatz}</h2><button type="button" data-af-zu="${id}" aria-label="${titel} ausblenden" title="Ausblenden">${ICON.zu}</button></div>`;
    el.insertAdjacentHTML('beforeend', `<div class="af-buehne" data-af-buehne>
      <div class="af-karte" data-af-karte></div>
      <div class="af-ueber af-leiste" role="toolbar" aria-label="Fenster ein- und ausblenden">${FENSTER.map(([id, t, ic, k]) =>
        `<button type="button" class="af-chip" data-af-auf="${id}" aria-pressed="false" aria-label="${t}" title="${t}">${ic}<span class="lang">${t}</span>${k ? `<span class="kurz">${k}</span>` : ''}<i data-af-marke="${id}" hidden></i></button>`).join('')}</div>
      <div class="af-ueber af-werkzeuge" role="toolbar" aria-label="Karte">
        <button type="button" data-af-k="ebene" title="Kartenart wechseln"></button>
        <button type="button" class="zoom" data-af-k="plus" aria-label="Karte vergrößern" title="Vergrößern">+</button>
        <button type="button" class="zoom" data-af-k="minus" aria-label="Karte verkleinern" title="Verkleinern">−</button>
        <button type="button" data-af-k="stelle" title="Einsatzstelle zeigen">${ICON.ziel}<span>Stelle</span></button>
        <button type="button" data-af-k="route" title="Ganze Route zeigen">${ICON.route}<span>Route</span></button>
        <a href="#lagekarte" title="Lagekarte">${ICON.karte}<span>Lage</span></a></div>
      <div class="af-ueber af-fenster" data-af-fenster>
        <section class="af-panel" data-panel="ort" id="af-ort">${kopf('ort', 'Einsatzort')}<div class="af-panel-inhalt" data-af-ort></div></section>
        <section class="af-panel" data-panel="stoff" id="af-stoff">${kopf('stoff', 'Stoff', ' <small>falls bekannt</small>')}<div class="af-panel-inhalt" data-af-stoff></div></section>
        <section class="af-panel" data-panel="anfahrt" id="af-ergebnis">${kopf('anfahrt', 'Anfahrt')}<div class="af-panel-inhalt" data-af-ergebnis></div></section>
        <section class="af-panel" data-panel="hinweise" id="af-merk">${kopf('hinweise', 'Hinweise')}<div class="af-panel-inhalt">
          <div class="lg-legende" style="margin-top:0"><span><i style="--c:#e5484d"></i>Gefahrenbereich (Absperrgrenze)</span><span><i style="--c:#26a95b"></i>Absperrbereich</span><span><i style="--c:#1f9d55"></i>Anfahrt gegen den Wind</span><span><i style="--c:#8e4ec6"></i>Bereich in Windrichtung</span><span><i style="--c:#2f6fe0"></i>Route der Navigation</span><span><i style="--c:#1f9d55"></i>bessere Route (gestrichelt)</span><span><i style="--c:#7b8794"></i>andere Route (gestrichelt)</span><span><i style="--c:#4c8df0"></i>mein Standort</span></div>
          <div class="lg-klein" style="margin:.5rem 0 .6rem">Einsatzstelle setzen oder verschieben: auf die Karte tippen. Kartenart rechts oben (Straße bzw. Hybrid mit Luftbild).</div>
          <b style="font-size:.95rem">Merkpunkte zur Anfahrt</b>
          <ul class="af-merk lg-klein" style="padding-left:1.05rem;margin:.35rem 0 0">${MERK.map(([t, x, q]) => `<li><b>${esc(t)}:</b> ${esc(x)} <i>(${esc(q)})</i></li>`).join('')}</ul></div></section>
      </div>
      <div class="af-ueber af-unten" data-af-unten aria-live="polite"></div>
    </div>`);
    for (const b of el.querySelectorAll('[data-af-auf]')) b.addEventListener('click', () => {
      const id = b.dataset.afAuf, auf = !offen.has(id);
      if (auf) offen.add(id); else offen.delete(id);
      offenSichern(); fensterZeigen(auf ? id : undefined);   // nur beim Öffnen als „zuletzt geöffnet“ nach hinten
    });
    for (const b of el.querySelectorAll('[data-af-zu]')) b.addEventListener('click', () => { offen.delete(b.dataset.afZu); offenSichern(); fensterZeigen(); });
    for (const b of el.querySelectorAll('[data-af-k]')) b.addEventListener('click', () => kartenKnopf(b.dataset.afK));
    // Höhe der unteren Leiste → Freiraum für Fenster und Kartenränder
    const unten = el.querySelector('[data-af-unten]'), buehne = el.querySelector('[data-af-buehne]');
    if (window.ResizeObserver) {
      // untere Leiste: Freiraum setzen und (im nächsten Bild) die Fenster neu verteilen
      new ResizeObserver(() => { buehne.style.setProperty('--af-unten-h', unten.offsetHeight + 'px'); layoutPlanen(); }).observe(unten);
      // Inhalt eines Fensters ändert sich (Treffer, Ergebnis, Stoff …): neu verteilen. Beobachtet werden nur die Inhalte selbst, nicht die
      // Fenster – deren Höhe setzt fensterLayout, das gäbe sonst eine Schleife der Beobachter.
      const inhaltRo = new ResizeObserver(() => layoutPlanen());
      const beobachten = () => { for (const i of el.querySelectorAll('.af-panel-inhalt > *')) inhaltRo.observe(i); };
      beobachten();
      new MutationObserver(() => { beobachten(); layoutPlanen(); }).observe(el.querySelector('[data-af-fenster]'), { childList: true, subtree: true });
    }
    ebeneKnopf();
    fensterZeigen();
    requestAnimationFrame(() => { if (begrenzen()) fensterZeigen(); });
    ortZeigen(); stoffZeigen(); ergebnisZeigen();
    karteZeigen();
    if (z.ziel) zielGesetzt({ neu: false });
    else untenZeigen();
    // Eintreffzeit läuft mit (Uhrzeit), solange die Seite offen ist
    clearInterval(takt);
    takt = setInterval(() => { if (!el.isConnected || !el.classList.contains('aktiv')) return; if (!document.hidden) untenZeigen(); }, 30000);
  }
  // Jedes offene Fenster braucht Platz für Kopf und etwas Inhalt (ca. 150 px). Passen nicht alle in die Spalte, gehen die zuerst
  // geöffneten zu (die Reihenfolge der Menge ist die Reihenfolge des Öffnens); „neu“ bleibt in jedem Fall offen.
  const FENSTER_MIN_PX = 150;
  function begrenzen(neu) {
    const f = el.querySelector('[data-af-fenster]');
    const h = f ? f.clientHeight : 0;
    if (!h) return false;
    const max = Math.max(1, Math.floor((h + 8) / (FENSTER_MIN_PX + 8)));
    let geaendert = false;
    while (offen.size > max) { const alt = [...offen].find(x => x !== neu); if (!alt) break; offen.delete(alt); geaendert = true; }
    if (geaendert) offenSichern();
    return geaendert;
  }
  function fensterZeigen(neu) {
    if (neu && offen.has(neu)) { offen.delete(neu); offen.add(neu); }      // zuletzt geöffnet = zuletzt in der Menge
    begrenzen(neu);
    for (const [id] of FENSTER) {
      const p = el.querySelector(`[data-panel="${id}"]`), b = el.querySelector(`[data-af-auf="${id}"]`);
      if (p) p.hidden = !offen.has(id);
      if (b) b.setAttribute('aria-pressed', String(offen.has(id)));
    }
    layoutPlanen();
  }
  function fensterAuf(id, auf = true) { if (auf) offen.add(id); else offen.delete(id); offenSichern(); fensterZeigen(auf ? id : undefined); }
  // Höhe gerecht verteilen: Fenster, die mit weniger als ihrem Anteil auskommen, bekommen ihre volle Höhe; der Rest geht zu gleichen
  // Teilen an die großen, die dann in sich scrollen. (Das Schrumpfen des Browsers nach Größe drückte kleine Fenster bis auf den Kopf zusammen.)
  function fensterLayout() {
    const f = el.querySelector('[data-af-fenster]');
    if (!f) return;
    const offenP = [...f.querySelectorAll('.af-panel:not([hidden])')];
    for (const p of f.querySelectorAll('.af-panel')) p.style.maxHeight = '';
    if (!offenP.length) return;
    const H = f.clientHeight - 8 * (offenP.length - 1);
    if (H <= 0) return;
    const bedarf = offenP.map(p => { const k = p.querySelector('.af-panel-kopf'), i = p.querySelector('.af-panel-inhalt'); return (k ? k.offsetHeight : 0) + (i ? i.scrollHeight : 0) + 2; });
    const zu = [];
    let rest = H, n = offenP.length;
    for (const x of bedarf.map((b, i) => ({ b, i })).sort((a, b) => a.b - b.b)) { const h = Math.min(x.b, rest / n); zu[x.i] = h; rest -= h; n--; }
    offenP.forEach((p, i) => { p.style.maxHeight = Math.floor(zu[i]) + 'px'; });
  }
  let layoutGeplant = false;
  const layoutPlanen = () => { if (layoutGeplant) return; layoutGeplant = true; requestAnimationFrame(() => { layoutGeplant = false; fensterLayout(); }); };
  // Drehen bzw. Größe ändern: wieder begrenzen und verteilen
  addEventListener('resize', () => { if (el.isConnected && el.classList.contains('aktiv')) { if (begrenzen()) fensterZeigen(); else layoutPlanen(); } });
  // Marken an den Leistenknöpfen: Anfahrt rot/gelb bei ungünstiger Route, Stoff blau, wenn gesetzt
  function markenZeigen(art) {
    const m = (id, farbe) => { const i = el.querySelector(`[data-af-marke="${id}"]`); if (!i) return; i.hidden = !farbe; if (farbe) i.style.setProperty('--c', farbe); };
    m('anfahrt', art === 'gegen' ? 'var(--crit)' : art === 'seitlich' ? 'var(--warn)' : '');
    m('stoff', z.stoff ? 'var(--akzent)' : '');
  }

  // ---------------------------------------------------------------- Einsatzort
  let treffer = null, sucht = false, suchFehler = '';
  function ortZeigen() {
    const ziel = el.querySelector('[data-af-ort]');
    if (!ziel) return;
    if (z.ziel) {
      const quelle = { adresse: 'Adresse', koordinaten: 'Koordinaten', karte: 'auf der Karte gesetzt', gps: 'mein Standort', poi: 'aus der Suche', objekt: 'eigenes Objekt' }[z.ziel.quelle] || '';
      ziel.innerHTML = `<div class="af-gewaehlt">${ICON.ort}<div><b data-af-zielname>${esc(z.ziel.name || 'Einsatzort')}</b>
          <small>${z.ziel.lat.toFixed(5)}, ${z.ziel.lon.toFixed(5)}${quelle ? ' · ' + esc(quelle) : ''}</small></div>
          <button type="button" class="knopf" data-af="anders">${ICON.neu}Ändern</button></div>`;
      ziel.querySelector('[data-af="anders"]').addEventListener('click', () => { z.ziel = null; treffer = null; sichern(); wind = null; routen = null; vorschlag = null; fensterAuf('ort');
        ortZeigen(); ergebnisZeigen(); karteAktualisieren(); untenZeigen(); const f = el.querySelector('#af-adresse'); if (f) f.focus(); });
      return;
    }
    ziel.innerHTML = `<form class="af-suche" data-af-form role="search" novalidate>
        <input type="search" id="af-adresse" placeholder="Adresse, Firma, Schule …" aria-label="Einsatzort: Adresse, Firma, Einrichtung, Art (z. B. Kita), Koordinaten oder Kartenlink"
          autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(z.eingabe || '')}">
        <button type="submit" class="knopf los">${ICON.lupe}Suchen</button></form>
      <div class="af-knoepfe"><button type="button" class="knopf" data-af="gps">${ICON.gps}Mein Standort</button></div>
      <div class="lg-klein" style="margin-top:.45rem">Auch Firmen und Einrichtungen („Kapp Chemie“, „Paulinenstift“) oder eine Art – „Kita Nastätten“, „Tankstelle“, „Pflegeheim“ – rund um den Kartenausschnitt. Oder einfach auf die Karte tippen.</div>
      <div data-af-treffer>${trefferHtml()}</div>
      <div class="af-quelle">Suche: OpenStreetMap (Photon, Nominatim). Koordinaten, Kartenlinks und eigene Objekte gehen auch ohne Netz.</div>`;
    const form = ziel.querySelector('[data-af-form]'), f = ziel.querySelector('#af-adresse');
    form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(suchTakt); f.blur(); suchen(f.value); });
    // Vorschläge beim Tippen (Photon und eigene Objekte, nicht Nominatim – dessen Regeln verbieten Suchen beim Tippen)
    f.addEventListener('input', () => { clearTimeout(suchTakt); const t = f.value; suchTakt = setTimeout(() => suchen(t, { voll: false }), 450); });
    ziel.querySelector('[data-af="gps"]').addEventListener('click', async () => {
      try { const s = await LG.standortHolen({ gps: true }); vorschlagen({ lat: s.lat, lon: s.lon, name: '', quelle: 'gps' }); }
      catch (e) { meldung(e.message, 7000); }
    });
    trefferBeleben();
  }
  const kmText = km => km === null || km === undefined ? '' : km < 1 ? Math.round(km * 1000 / 10) * 10 + ' m' : String(Math.round(km * 10) / 10).replace('.', ',') + ' km';
  function trefferHtml() {
    if (suchFehler) return `<div class="ez-warn" style="margin-top:.55rem">${esc(suchFehler)}</div>`;
    if (!treffer) return sucht ? '<div class="lg-klein" style="margin-top:.55rem">Suche …</div>' : '';
    if (!treffer.length) return sucht ? '<div class="lg-klein" style="margin-top:.55rem">Suche …</div>' :
      '<div class="ez-warn" style="margin-top:.55rem">Nichts gefunden. Ort ergänzen (z. B. „Hauptstraße 5, Nastätten“), Koordinaten eingeben oder auf die Karte tippen.</div>';
    return (trefferKopf ? `<div class="lg-klein" style="margin:.6rem 0 0"><b>${esc(trefferKopf)}</b></div>` : '') +
      `<ul class="af-treffer">${treffer.map((t, i) => `<li><button type="button" data-af-treffer="${i}"><span class="af-nr">${i + 1}</span><span class="af-treffer-text"><b>${esc(t.titel)}</b>
        <small>${esc([t.art, t.unter].filter(Boolean).join(' · '))}${t.km !== null && t.km !== undefined ? ` · <span class="af-km">${kmText(t.km)}</span>` : ''}</small></span></button></li>`).join('')}</ul>` +
      (sucht ? '<div class="lg-klein" style="margin-top:.45rem">weitere Treffer werden gesucht …</div>' : '');
  }
  function trefferBeleben() {
    const box = el.querySelector('[data-af-treffer]');
    if (!box) return;
    box.innerHTML = trefferHtml();
    for (const b of box.querySelectorAll('[data-af-treffer]')) b.addEventListener('click', () => waehlen(treffer[Number(b.dataset.afTreffer)]));
  }
  const waehlen = t => { if (t) vorschlagen({ lat: t.lat, lon: t.lon, name: t.name || t.titel, quelle: t.quelle === 'objekt' || t.quelle === 'poi' ? t.quelle : 'adresse', ausSuche: true }); };
  // Mitte für die Gewichtung: Kartenmitte, sonst eigener Standort, sonst Miehlen
  function suchMitte() {
    try { if (karte) { const m = karte.mitte(); if (m && isFinite(m.lat)) return m; } } catch { /* unten */ }
    const st = LS.get('gsz-ort');
    return st && isFinite(st.lat) ? st : MIEHLEN;
  }
  // Treffer als nummerierte Punkte auf die Karte; nach der vollen Suche den Ausschnitt darauf einpassen
  function trefferAufKarte(einpassen) {
    if (!karte || z.ziel) return;
    karte.setzen({ treffer: treffer && treffer.length ? treffer.map((t, i) => ({ lat: t.lat, lon: t.lon, nr: i + 1, titel: t.titel })) : null });
    if (einpassen && treffer && treffer.length) karte.zeigeBereich(treffer.slice(0, 10).map(t => ({ lat: t.lat, lon: t.lon })));
  }
  let suchLauf = 0, suchTakt = null, trefferKopf = '';
  async function suchen(text, { voll = true } = {}) {
    text = String(text || '').trim();
    if (voll) { z.eingabe = text; sichern(); }
    const mein = ++suchLauf;
    suchFehler = ''; trefferKopf = '';
    if (!text) { treffer = null; sucht = false; trefferBeleben(); trefferAufKarte(false); return; }
    const k = GG.koordinatenLesen(text);
    if (k) {
      if (voll) { vorschlagen({ ...k, name: '', quelle: 'koordinaten', ausSuche: true }); return; }
      treffer = [{ ...k, titel: `${k.lat.toFixed(5)}, ${k.lon.toFixed(5)}`, art: 'Koordinaten', unter: 'Suchen tippen zum Übernehmen', quelle: 'koordinaten', km: null }];
      trefferBeleben(); return;
    }
    if (/^https?:\/\//i.test(text)) { if (voll) { suchFehler = 'In diesem Link stehen keine Koordinaten. Adresse eintippen oder auf die Karte tippen.'; treffer = null; trefferBeleben(); } return; }
    if (!voll && text.length < 3) return;
    const mitte = suchMitte(), art = artLesen(text);
    const eigene = eigeneSuchen(text, mitte);
    sucht = true;
    treffer = eigene.length ? eigene : (voll ? [] : treffer);
    trefferBeleben();
    let um = mitte, umName = 'der Kartenmitte';
    const auftraege = [];
    if (art) auftraege.push((async () => {
      if (art.ort) { const o = await photonOrt(art.ort, mitte); if (o) { um = o; umName = o.titel; } }
      return photonUmkreis(um, art.tags, art.ort ? 6 : 8).then(l => l.map(t => ({ ...t, km: GG.abstandM(um, t) / 1000, kmUm: GG.abstandM(um, t) / 1000 })));
    })());
    else auftraege.push(photonSuchen(text, mitte));
    if (voll && !art) auftraege.push(adresseSuchen(text, mitte));
    const erg = await Promise.allSettled(auftraege);
    if (mein !== suchLauf) return;
    const online = erg.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    let l = zusammenfuehren([...eigene, ...online]);
    if (art) { const rest = l.filter(t => t.quelle !== 'objekt').sort((a, b) => (a.kmUm ?? a.km) - (b.kmUm ?? b.km)); l = [...l.filter(t => t.quelle === 'objekt'), ...rest]; trefferKopf = `${art.name} im Umkreis von ${umName} (Entfernung ab ${um === mitte ? 'Kartenmitte' : umName})`; }
    treffer = l.slice(0, 15);
    sucht = false;
    const fehl = erg.find(r => r.status === 'rejected');
    if (!treffer.length && fehl) suchFehler = `Suche ${fehl.reason && fehl.reason.message ? fehl.reason.message : 'nicht möglich'}. Koordinaten eingeben oder auf die Karte tippen.`;
    if (voll && treffer.length === 1 && !art) { waehlen(treffer[0]); return; }
    trefferBeleben();
    trefferAufKarte(voll);
  }
  function zielSetzen(ziel) {
    z.ziel = { lat: ziel.lat, lon: ziel.lon, name: ziel.name || '', quelle: ziel.quelle || 'adresse' };
    treffer = null; suchFehler = ''; suchLauf++; clearTimeout(suchTakt);
    sichern();
    zielGesetzt({ neu: true });
  }
  // Einsatzort steht: Unfallort der Lagekarte, Ortsname nachladen, Wind am Einsatzort, Karte, Route
  function zielGesetzt({ neu }) {
    const mein = lauf;
    if (window.GSZKarte && (neu || !GSZKarte.unfallort())) GSZKarte.unfallortSetzen(z.ziel, 'anfahrt');
    ortZeigen();
    vorschlag = null;
    // nach dem Setzen: Suchfenster zu, auf breiten Bildschirmen das Ergebnis auf (auf dem Handy bleibt die Karte frei – unten steht das Wichtigste)
    if (neu) { offen.delete('ort'); if (!schmal()) offen.add('anfahrt'); offenSichern(); fensterZeigen(); }
    if (!z.ziel.name) { const ziel = z.ziel; LG.ortName(ziel).then(n => { if (mein !== lauf || z.ziel !== ziel || !n) return; z.ziel.name = n; sichern(); const b = el.querySelector('[data-af-zielname]'); if (b) b.textContent = n; untenZeigen(); }).catch(() => {}); }
    if (neu) { wind = null; routen = null; routeFehler = ''; }
    ergebnisZeigen();
    karteAktualisieren(neu);
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
    if (!box) return;
    if (!z.ziel) { box.innerHTML = '<div class="lg-klein">Erst die Einsatzstelle setzen – auf die Karte tippen oder im Fenster „Einsatzort“ suchen.</div>'; markenZeigen(''); untenZeigen(); return; }
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
    const bw = routenBewerten(), gw = gewaehlt(bw);
    if (gw) werte.push(`<div class="af-wert" style="--c:var(--akzent)"><b>${meter(gw.r.m)}</b><span>${gw === bw.alt ? 'Ausweichroute' : 'Route'}${gw.r.s ? ` · ca. ${Math.max(1, Math.round(gw.r.s / 60))} min ohne Sonderrechte` : ''}${routeStart && routeStart.standard ? ' · ab Miehlen (Standort nicht verfügbar)' : ' · ab meinem Standort'}</span></div>`);
    // Prüfung der Route
    let pruef = '', pruefArt = '';
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
      pruefArt = bw.alt && z.routeWahl !== 'schnell' ? 'gut' : art;
    }
    // Navigation in der App (Hauptweg, führt bis zur Absperrgrenze); Apple Karten und Google Maps als Ausweichweg zur Adresse
    const ziel = `${z.ziel.lat},${z.ziel.lon}`;
    const apple = `https://maps.apple.com/?daddr=${ziel}&dirflg=d`, google = `https://www.google.com/maps/dir/?api=1&destination=${ziel}&travelmode=driving`;
    const zuerst = LS.get(NAVI) === 'google' ? 'google' : 'apple';
    const knopf = (art, href, text, extra = '') => `<a class="knopf${extra}" data-af-navi="${art}" href="${esc(href)}" target="_blank" rel="noopener">${ICON.navi}${text}</a>`;
    const kn = [knopf('apple', apple, 'Apple Karten'), knopf('google', google, 'Google Maps')];
    if (zuerst === 'google') kn.reverse();
    if (bw && bw.zwischen) kn.push(knopf('google', `${google}&waypoints=${bw.zwischen.lat.toFixed(6)},${bw.zwischen.lon.toFixed(6)}`, `Google Maps über Anfahrt aus ${esc(richtung(bw.alt.p.ankunftGrad))} (Zwischenpunkt)`, ' zweit'));
    const nav = window.GSZNavigation;
    const wahlHtml = bw && bw.alt ? `<div class="af-seg" role="radiogroup" aria-label="Route für die Navigation" style="margin-top:.85rem">
        <button type="button" role="radio" data-af-route="empfohlen" aria-checked="${z.routeWahl !== 'schnell'}">Aus ${esc(richtung(bw.alt.p.ankunftGrad))} · empfohlen</button>
        <button type="button" role="radio" data-af-route="schnell" aria-checked="${z.routeWahl === 'schnell'}">Schnellste · aus ${esc(richtung(bw.haupt.p.ankunftGrad))}</button></div>` : '';
    const navHtml = !nav || (routen && !routen.length) ? '' : wahlHtml;   // „Navigation starten“ steht in der unteren Leiste
    const obj = OBJEKTE.find(o => GG.abstandM(o, z.ziel) <= o.umkreis_m);
    const objHtml = obj ? `<div class="ez-warn af-objekt" style="margin-top:.8rem"><b>${esc(obj.name)}:</b> ${esc(obj.text)} <i>(${esc(obj.quelle)})</i>
      ${obj.bereitstellung ? `<div class="af-knoepfe">${nav ? `<button type="button" class="knopf" data-af-start-bereit>${ICON.navi}Navigation zum Bereitstellungsraum</button>` : ''}<a class="knopf" data-af-navi="${zuerst}" href="${esc(zuerst === 'google' ? `https://www.google.com/maps/dir/?api=1&destination=${obj.bereitstellung.lat},${obj.bereitstellung.lon}&travelmode=driving` : `https://maps.apple.com/?daddr=${obj.bereitstellung.lat},${obj.bereitstellung.lon}&dirflg=d`)}" target="_blank" rel="noopener">${ICON.navi}${nav ? (zuerst === 'google' ? 'Google Maps' : 'Apple Karten') : 'Route zum Bereitstellungsraum'} (${esc(obj.bereitstellung.name)})</a></div>` : ''}</div>` : '';
    box.innerHTML = kern + `<div class="af-werte">${werte.join('')}</div>` + pruef + objHtml +
      (dreht ? `<div class="ez-warn" style="margin-top:.7rem"><b>Achtung:</b> Laut Vorhersage dreht der Wind bis ${uhrzeit(dreht.zeit)} auf ${esc(richtung(dreht.richtung))} (${Math.round(dreht.richtung)}°).</div>` : '') +
      (ab.hinweise && ab.hinweise.length ? `<div class="ez-warn" style="margin-top:.7rem">${ab.hinweise.map(esc).join('<br>')}</div>` : '') +
      navHtml + `<div class="af-navi-extern"><span>${nav ? 'Statt der Navigation in der App:' : 'Route mit'}</span>${kn.join('')}</div>
      <div class="af-quelle">${nav ? 'Die Navigation in der App (unten) führt über die gewählte Route bis zur Absperrgrenze und sagt an. ' : ''}Apple Karten und Google Maps führen zur Adresse – sie kennen die Gefahr nicht: an der Absperrgrenze selbst halten.${routen && routen.length ? ' Routen: OpenStreetMap (OSRM).' : ''}</div>
      <div class="af-wind-zeile">${quelle ? quelle + ' ' : ''}<a href="#" data-af-wind="neu">Wind neu abrufen</a> · <a href="#" data-af-wind="vorort">${m ? 'Wind vor Ort ändern' : 'Wind vor Ort eingeben'}</a>${m ? ' · <a href="#" data-af-wind="dwd">DWD-Wert verwenden</a>' : ''}</div>
      <div data-af-kompass ${von === null && !windLaedt ? '' : 'hidden'}><div class="lg-klein" style="margin-top:.5rem">Der Wind kommt aus …</div><div class="af-kompass">${[['N', 0], ['NO', 45], ['O', 90], ['SO', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]]
        .map(([t, g]) => `<button type="button" data-af-windwahl="${g}" class="${m && GG.himmelsrichtung(m.richtung) === t ? 'an' : ''}">${t}</button>`).join('')}</div></div>`;
    for (const a of box.querySelectorAll('[data-af-navi]')) a.addEventListener('click', () => navigieren(a.dataset.afNavi));
    markenZeigen(pruefArt);
    untenZeigen();
    const bs = box.querySelector('[data-af-start-bereit]');
    if (bs) bs.addEventListener('click', () => navStarten({ bereitstellung: OBJEKTE.find(o => GG.abstandM(o, z.ziel) <= o.umkreis_m).bereitstellung }));
    for (const b of box.querySelectorAll('[data-af-route]')) b.addEventListener('click', () => { z.routeWahl = b.dataset.afRoute; sichern(); ergebnisZeigen(); karteAktualisieren(); });
    for (const a of box.querySelectorAll('[data-af-wind]')) a.addEventListener('click', e => {
      e.preventDefault();
      const w = a.dataset.afWind;
      if (w === 'neu') { z.windManuell = null; sichern(); windLaden(true); }
      if (w === 'vorort') box.querySelector('[data-af-kompass]').hidden = false;
      if (w === 'dwd') { z.windManuell = null; sichern(); ergebnisZeigen(); karteAktualisieren(); }
    });
    for (const b of box.querySelectorAll('[data-af-windwahl]')) b.addEventListener('click', () => { z.windManuell = { richtung: Number(b.dataset.afWindwahl), zeit: Date.now() }; sichern(); ergebnisZeigen(); karteAktualisieren(); });
  }
  // ---------------------------------------------------------------- Navigation in der App (navigation.js)
  const gewaehlt = bw => bw && bw.alt && z.routeWahl !== 'schnell' ? bw.alt : bw && bw.haupt;
  const routeText = x => x && x.p.ankunftGrad !== null ? `Anfahrt aus ${richtung(x.p.ankunftGrad)}${x.strasse ? ' über ' + x.strasse : ''}` : '';
  let navStartet = false;
  async function navStarten({ bereitstellung = null } = {}) {
    const NV = window.GSZNavigation, NLg = window.GSZNaviLogik;
    if (!NV || !NLg || !z.ziel || navStartet) return;
    if (NV.laeuft() && NV.zeigen) { NV.zeigen(); return; }
    navStartet = true;
    try {
      // Standort jetzt (GPS); liegt er weit vom Start der berechneten Route, Route ab hier neu
      let st = null;
      try { st = await LG.standortHolen({ gps: true }); } catch (e) { meldung(e.message + ' Die Navigation wartet auf GPS.', 6000); }
      if (bereitstellung) {
        const start = st && !st.standard ? st : routeStart || MIEHLEN;
        let l;
        try { l = await routenHolen(start, bereitstellung); } catch (e) { meldung('Keine Route zum Bereitstellungsraum (' + e.message + ') – Apple Karten oder Google Maps nutzen.', 7000); return; }
        await NV.starten({ art: 'bereitstellung', ziel: { ...bereitstellung }, grenze_m: 0, grund: 'Bereitstellungsraum', route: NLg.routeAufbereiten(l[0].roh), routeText: bereitstellung.name,
          holeRoute: async pos => { const l2 = await routenHolen(pos, bereitstellung); return { route: NLg.routeAufbereiten(l2[0].roh), text: bereitstellung.name }; },
          tagebuch: t => { const b = bericht(); if (b) b.eintragen(t, 'system'); }, beiEnde: () => { if (el.isConnected) ergebnisZeigen(); } });
        return;
      }
      if (st && !st.standard && (!routeStart || GG.abstandM(st, routeStart) > 300)) {
        try { routen = await routenHolen(st, z.ziel); routeStart = st; routeFehler = ''; } catch { /* bisherige Route */ }
      }
      if (!routen || !routen.length) {
        await routeLaden();
        if (!routen || !routen.length) { meldung('Ohne Route keine Navigation in der App' + (routeFehler ? ` (${routeFehler})` : '') + ' – Apple Karten oder Google Maps nutzen.', 7000); return; }
      }
      const x = gewaehlt(routenBewerten());
      const ab = abstaende(), von = windStill() ? null : windVon();
      await NV.starten({ ziel: { ...z.ziel }, grenze_m: ab.grenze_m, grund: ab.grund, absperr_m: ab.absperr_m, wind: { von },
        zone: von !== null ? { laenge_m: zoneLaenge(ab), winkel: ZONE_WINKEL } : null,
        route: NLg.routeAufbereiten(x.r.roh), kritisch: x.p.kritisch, routeText: routeText(x),
        holeRoute: async pos => {
          const l = await routenHolen(pos, z.ziel);
          routen = l; routeStart = pos;
          const y = gewaehlt(routenBewerten());
          return { route: NLg.routeAufbereiten(y.r.roh), text: routeText(y), kritisch: y.p.kritisch };
        },
        tagebuch: t => { const b = bericht(); if (b) b.eintragen(t, 'system'); },
        beiEnde: () => { if (el.isConnected) { ergebnisZeigen(); karteAktualisieren(); } } });
      untenZeigen();
    } finally { navStartet = false; }
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

  // ---------------------------------------------------------------- Karte (Vollbild): Einsatzstelle per Tippen, Kartenart, Freiraum der Überblendungen
  function polster() {
    const r = sel => { const e = el.querySelector(sel); return e && !e.hidden && e.getClientRects().length ? e.getBoundingClientRect() : null; };
    const k = r('[data-af-karte]'), leiste = r('.af-leiste'), werk = r('.af-werkzeuge'), unten = r('[data-af-unten]');
    const panels = [...el.querySelectorAll('.af-panel:not([hidden])')];
    const fenster = panels.length && !schmal() ? r('[data-af-fenster]') : null;
    if (!k) return { oben: 24, unten: 24, links: 24, rechts: 24 };
    return { oben: Math.max(24, (leiste ? leiste.bottom - k.top : 0) + 16), unten: Math.max(24, (unten ? k.bottom - unten.top : 0) + 16),
      links: Math.max(24, (fenster ? fenster.right - k.left : 0) + 16), rechts: Math.max(24, (werk ? k.right - werk.left : 0) + 12) };
  }
  function kartenOpts() {
    const st = LS.get('gsz-ort');
    const ich = st && st.gps && !st.standard ? st : null;
    const basis = { ebene: GSZKarte.ebeneGewaehlt ? GSZKarte.ebeneGewaehlt() : 'strasse', zoomPos: false, massstabPos: 'bottomright', ziehbar: false, unfallText: 'Einsatzstelle', beiTippen: tippen, vorschlag, polster,
      standort: ich, ohneStandortEinpassen: true, google: LG.googleSchluessel ? LG.googleSchluessel() : '', mitte: ich || st || MIEHLEN,
      treffer: !z.ziel && Array.isArray(treffer) && treffer.length ? treffer.map((t, i) => ({ lat: t.lat, lon: t.lon, nr: i + 1, titel: t.titel })) : null,
      beiTreffer: i => waehlen(treffer && treffer[i]) };
    if (!z.ziel) return { ...basis, keinUnfallort: true, unfallort: null, gefahr_m: null, absperr_m: null, ergAbs_m: null, zone: null, olive: null, still: null, zugGrad: null, anfahrt: null,
      route: null, routeKritisch: [], routeAlt: null };
    const ab = abstaende(), von = windVon(), still = windStill(), kmh = windKmh();
    const zug = von === null || still ? null : GG.ausbreitungsrichtung(von);
    const fw = LG.grundlage && LG.grundlage() === 'fwdv500';
    const bw = routenBewerten(), gw = gewaehlt(bw), andere = bw && bw.alt ? (gw === bw.alt ? bw.haupt : bw.alt) : null;
    const L = zoneLaenge(ab);
    return { ...basis, keinUnfallort: false,
      unfallort: z.ziel, gefahr_m: ab.grenze_m, absperr_m: ab.absperr_m || (fw && ab.grenze_m < 100 ? 100 : null), ergAbs_m: null, zone: null,
      olive: zug !== null ? { laenge_m: L, winkel: ZONE_WINKEL, text: `Bereich in Windrichtung (Annahme ${meter(L)}, Keule ${ZONE_WINKEL}°)`, kurz: `in Windrichtung bis ${meter(L)}` } : null,
      still: von !== null && still ? { m: GG.AUSBREITUNG.still_m, text: 'Windstille: Kreis 500 m (bis 1 km)', kurz: 'Windstille: 500 m (bis 1 km)' } : null,
      zugGrad: zug,
      anfahrt: von !== null && !still ? { vonGrad: von, winkel: 90, innen_m: ab.grenze_m, aussen_m: Math.max(ab.grenze_m * 3, ab.grenze_m + 250), kurz: `Anfahrt aus ${GG.himmelsrichtung(von)}`,
        text: `Anfahrt mit dem Wind im Rücken (aus ${richtung(von)})${kmh !== null && kmh < GG.AUSBREITUNG.schwach_kmh ? ' – Wind sehr leicht, Richtung unsicher' : ''}` } : null,
      // blau die Route der Navigation (gewählt), grün gestrichelt die andere; rot, wo die blaue durch den Bereich in Windrichtung führt
      route: gw ? gw.r.punkte : null, routeKritisch: [...(gw ? gw.p.kritisch : []), ...(andere ? andere.p.kritisch : [])], routeAlt: andere ? andere.r.punkte : null,
      routeAltFarbe: andere && andere === bw.alt ? '#1f9d55' : '#7b8794' };
  }
  async function karteZeigen() {
    const kEl = el.querySelector('[data-af-karte]');
    if (!kEl || !window.GSZKarte) return;
    if (karte) { karteAktualisieren(); return; }
    if (karteLaedt) return;
    const mein = lauf;
    // ohne Einsatzstelle: Karte um den eigenen Standort (sonst Miehlen)
    if (!z.ziel && !(LS.get('gsz-ort') || {}).gps) await LG.standortHolen().catch(() => null);
    if (mein !== lauf) return;
    karteLaedt = (async () => {
      try { karte = await GSZKarte.zeigen(kEl, kartenOpts()); }
      catch (e) { kEl.innerHTML = `<div class="ez-leer" style="padding:4rem 1rem">Karte nicht verfügbar (${esc(e.message)}). Einsatzort über das Fenster „Einsatzort“ suchen.</div>`; karte = null; }
    })();
    await karteLaedt; karteLaedt = null;
    if (mein !== lauf) return;
    karteAktualisieren(true);
  }
  // Ausschnitt neu einpassen, wenn sich Einsatzort, Bereiche oder Windrichtung ändern (nicht bei jeder neuen Route)
  let kartenStand = '';
  function karteAktualisieren(einpassen = false) {
    if (!karte) return;
    const o = kartenOpts();
    karte.setzen(o.unfallort ? o : { ...o, unfallort: undefined });
    const st = z.ziel ? [z.ziel.lat, z.ziel.lon, o.gefahr_m, o.absperr_m, o.zugGrad, o.olive && o.olive.laenge_m, o.still && o.still.m].join('|') : 'leer';
    if (einpassen || st !== kartenStand) { const neu = kartenStand !== st; kartenStand = st; if (z.ziel || einpassen || neu && st !== 'leer') karte.zentrieren(); }
  }
  // Auswahl der Einsatzstelle (Tippen, Suchtreffer, Koordinaten, Standort): erst nur eine Markierung – Wind, Bereiche, Ausbreitung
  // und Route erst nach „Bestätigen“ (Wunsch Lucas 24.11.2026). Ein weiterer Tipp auf die Karte verschiebt die Markierung.
  let vorschlagNr = 0;
  function vorschlagen(ort, { zentrieren = true } = {}) {
    const nr = ++vorschlagNr;
    vorschlag = { lat: ort.lat, lon: ort.lon, name: ort.name || '', quelle: ort.quelle || 'karte', ausSuche: !!ort.ausSuche || !!(vorschlag && vorschlag.ausSuche) };
    if (karte) {
      karte.setzen({ vorschlag });
      if (zentrieren && GSZKarte.ziel) karte.zeigeBereich([0, 90, 180, 270].map(g => GSZKarte.ziel(ort.lat, ort.lon, g, 180)));
    }
    // auf dem Handy das Suchfenster zu, damit die Markierung zu sehen ist (unten steht die Rückfrage)
    if (schmal() && offen.has('ort')) { offen.delete('ort'); fensterZeigen(); }
    untenZeigen();
    if (!vorschlag.name) LG.ortName(vorschlag).then(n => { if (n && nr === vorschlagNr && vorschlag) { vorschlag.name = n; untenZeigen(); } }).catch(() => {});
  }
  function tippen(ort) {
    if (window.GSZNavigation && GSZNavigation.laeuft() && !document.querySelector('.nv[hidden]')) return;
    vorschlagen({ lat: ort.lat, lon: ort.lon, name: '', quelle: 'karte' }, { zentrieren: false });
  }
  function vorschlagFertig(uebernehmen) {
    const v = vorschlag;
    vorschlag = null; vorschlagNr++;
    if (karte) karte.setzen({ vorschlag: null });
    if (uebernehmen && v) { zielSetzen({ lat: v.lat, lon: v.lon, name: v.name || '', quelle: v.quelle || 'karte' }); return; }
    // verworfen: aus der Suche zurück zur Trefferliste
    if (v && v.ausSuche && !z.ziel) fensterAuf('ort');
    untenZeigen();
  }
  function ebeneKnopf() {
    const b = el.querySelector('[data-af-k="ebene"]');
    if (!b) return;
    const hybrid = GSZKarte.ebeneGewaehlt && GSZKarte.ebeneGewaehlt() === 'hybrid';
    b.innerHTML = `${ICON.ebenen}<span>${hybrid ? 'Hybrid' : 'Straße'}</span>`;
    b.classList.toggle('af-ebene-an', hybrid);
    b.setAttribute('aria-label', `Kartenart: ${hybrid ? 'Hybrid (Luftbild)' : 'Straßenkarte'} – tippen zum Wechseln`);
  }
  function kartenKnopf(w) {
    if (w === 'ebene') {
      const neu = GSZKarte.ebeneGewaehlt && GSZKarte.ebeneGewaehlt() === 'hybrid' ? 'strasse' : 'hybrid';
      LS.set('gsz-karte-ebene', neu); ebeneKnopf();
      if (karte) karte.ebeneSetzen(neu);
      meldung(neu === 'hybrid' ? 'Hybrid: Luftbild mit Straßen- und Ortsnamen.' : 'Straßenkarte (OpenStreetMap).', 2500);
      return;
    }
    if (!karte) return;
    if (w === 'plus') karte.zoomen(1);
    if (w === 'minus') karte.zoomen(-1);
    if (w === 'stelle') { if (z.ziel) karte.zentrieren(); else meldung('Noch keine Einsatzstelle – auf die Karte tippen.', 3000); }
    if (w === 'route') { const bw = routenBewerten(); const p = bw && bw.haupt ? [...bw.haupt.r.punkte, ...(bw.alt ? bw.alt.r.punkte : []), z.ziel] : []; if (p.length) karte.zeigeBereich(p); else meldung('Keine Route vorhanden.', 3000); }
  }

  // ---------------------------------------------------------------- Untere Leiste: Eintreffen, Anfahrtsrichtung, Navigation
  // Eintreffen an der Absperrgrenze: Fahrzeit der Route (ohne Sonderrechte) anteilig bis zur Absperrgrenze
  const eintreffSpeicher = new WeakMap();
  function eintreffen(x, grenze_m) {
    if (!x || !x.r) return null;
    const NLg = window.GSZNaviLogik;
    let e = eintreffSpeicher.get(x.r);
    if (!e || e.grenze !== grenze_m) {
      let bis = x.r.m;
      if (NLg && x.r.roh) { try { const r = NLg.routeAufbereiten(x.r.roh); bis = r.m ? NLg.grenzeEntlang(r, z.ziel, grenze_m) * (x.r.m / r.m) : x.r.m; } catch { /* ganze Route */ } }
      e = { grenze: grenze_m, m: bis, s: x.r.m > 0 ? x.r.s * bis / x.r.m : x.r.s };
      eintreffSpeicher.set(x.r, e);
    }
    return e;
  }
  function untenZeigen() {
    const box = el.querySelector('[data-af-unten]');
    if (!box) return;
    const knopf = (attr, text, haupt = false, ic = '') => `<button type="button" class="knopf${haupt ? ' los' : ''}" ${attr}>${ic}${text}</button>`;
    if (vorschlag) {
      box.innerHTML = `<div class="af-unten-zeile">${ICON.ort.replace('<svg', '<svg class="af-unten-ort"')}<div class="af-unten-text"><b>${z.ziel ? 'Einsatzstelle hierher verschieben?' : 'Einsatzstelle hier?'}</b>
          <small data-af-vorschlag-name>${esc(vorschlag.name || 'Ort wird ermittelt …')}</small><small>${vorschlag.lat.toFixed(5)}, ${vorschlag.lon.toFixed(5)} · zum Verschieben auf die Karte tippen</small></div></div>
        <div class="af-unten-knoepfe">${knopf('data-af-v="ja"', 'Bestätigen', true, ICON.ok)}${knopf('data-af-v="nein"', 'Verwerfen')}</div>`;
      box.querySelector('[data-af-v="ja"]').addEventListener('click', () => vorschlagFertig(true));
      box.querySelector('[data-af-v="nein"]').addEventListener('click', () => vorschlagFertig(false));
      return;
    }
    if (!z.ziel) {
      box.innerHTML = `<div class="af-unten-zeile">${ICON.ort.replace('<svg', '<svg class="af-unten-ort"')}<div class="af-unten-text"><b>Einsatzstelle setzen</b>
          <small>Auf die Karte tippen – oder suchen: Adresse, Firma, Einrichtung, Koordinaten. Danach bestätigen.</small></div></div>
        <div class="af-unten-knoepfe">${knopf('data-af-u="suche"', 'Suchen', false, ICON.lupe)}</div>`;
      box.querySelector('[data-af-u="suche"]').addEventListener('click', () => { fensterAuf('ort'); const f = el.querySelector('#af-adresse'); if (f) setTimeout(() => f.focus(), 50); });
      return;
    }
    const ab = abstaende(), von = windVon(), still = windStill(), bw = routenBewerten(), x = gewaehlt(bw);
    const e = eintreffen(x, ab.grenze_m);
    let titel;
    if (routen && !routen.length) titel = 'Vor Ort (unter 150 m)';
    else if (e) { const min = Math.max(1, Math.round(e.s / 60)); titel = `Eintreffen in ${min} min · ${uhrzeit(Date.now() + e.s * 1000)}`; }
    else if (routeLaedt) titel = 'Eintreffen wird berechnet …';
    else titel = routeFehler ? 'Eintreffen: ohne Route nicht berechenbar' : 'Eintreffen: –';
    const teile = [von === null ? (windLaedt ? 'Wind wird abgerufen' : 'Windrichtung unbekannt') : still ? 'Windstille' : `Anfahrt aus ${richtung(von)}`];
    if (e) teile.push(`${meter(e.m)} bis zur Absperrgrenze (${meter(ab.grenze_m)})`); else teile.push(`Absperrgrenze ${meter(ab.grenze_m)}`);
    const nav = window.GSZNavigation;
    const navKnopf = nav && !(routen && !routen.length) ? knopf(`data-af-start ${routeLaedt && !routen ? 'disabled' : ''}`, nav.laeuft() ? 'Navigation öffnen' : 'Navigation starten', true, ICON.navi) : '';
    box.innerHTML = `<div class="af-unten-zeile">${von !== null && !still ? fahrtPfeil(GG.ausbreitungsrichtung(von)) : ICON.ort.replace('<svg', '<svg class="af-unten-ort"')}
        <div class="af-unten-text"><b data-af-eintreffen>${esc(titel)}</b><small>${esc(teile.join(' · '))}${e ? ' · ohne Sonderrechte' : ''}</small></div></div>
      ${navKnopf ? `<div class="af-unten-knoepfe">${navKnopf}</div>` : ''}`;
    const st = box.querySelector('[data-af-start]');
    if (st) st.addEventListener('click', () => navStarten());
  }

  GSZ.ansicht('anfahrt', { element: el, titel: () => 'Anfahrt', anzeigen() { zeigen(); } });
  window.GSZAnfahrt = { zeigen, ortText, laden, routenBewerten: () => routenBewerten() };
})();
