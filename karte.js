// Karte für Absperren und Ausbreitung (Reiter „Wind/Absperren“): maßstäblich auf Google Maps (mit API-Schlüssel, zentral in
// Einsatz/_App/Karte/karte.json) oder OpenStreetMap (Leaflet, ohne Schlüssel – Rückfall). Grundlage ist der Standort des
// Geräts (GPS). Den Unfallort kann man verschieben: Markierung ziehen oder „Unfallort = Kartenmitte“. Gezeichnet werden
// Gefahrenbereich (Grundlage RLP bzw. FwDV 500), ggf. Absperrbereich, die Erstabsperrung und die Schutz- bzw. Räumungszone
// nach ERG in Windrichtung (Quadrat in Windrichtung, so lang wie breit), die Ausbreitungsolive (Keule in Zugrichtung bis zur
// Wolkenfront nach der gewählten Zeit; bei Windstille ein Kreis) und der eigene Standort – jeweils mit Schild auf der Karte.
// Für die Anfahrt zusätzlich: der empfohlene Anfahrtssektor gegen den Wind (grüner Kreisring-Ausschnitt mit Schild) und die
// Route des Routendienstes (blau, Abschnitte durch Gefahrenbereich bzw. Ausbreitung rot).
// window.GSZKarte = { zeigen(el, opts) → { setzen(opts), zentrieren(), zeigeBereich(pkte), mitte(), zerstoeren() }, unfallort(), unfallortSetzen(), … }
'use strict';
(() => {
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } },
  };
  const UNFALL_GUELTIG_MS = 12 * 3600 * 1000;
  // Stecknadel für eine noch nicht bestätigte Einsatzstelle (Spitze unten mittig)
  const NADEL = '<svg viewBox="0 0 34 46" width="34" height="46" aria-hidden="true"><path d="M17 44C17 44 3 27.5 3 17a14 14 0 0 1 28 0c0 10.5-14 27-14 27z" fill="#e5484d" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>';
  const FARBE = { gefahr: '#e5484d', absperr: '#26a95b', erg: '#f0794a', zone: '#f2b01e', ich: '#4c8df0', olive: '#8e4ec6', still: '#8e4ec6',
    anfahrt: '#1f9d55', route: '#2f6fe0', kritisch: '#e5484d' };
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const meter = m => m >= 1000 ? String(Math.round(m / 100) / 10).replace('.', ',') + ' km' : Math.round(m) + ' m';
  const skript = src => new Promise((ok, fehler) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok;
    s.onerror = () => fehler(new Error('Karte lässt sich nicht laden (ohne Netz?)')); document.head.appendChild(s); });
  // Stildatei laden und abwarten – ohne sie rechnet Leaflet mit falschen Größen (fehlende Kacheln, verschobene Zeichnung)
  const stil = href => new Promise(ok => {
    let l = document.querySelector(`link[href="${href}"]`);
    if (l && l.dataset.geladen) { ok(); return; }
    if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
    const fertig = () => { l.dataset.geladen = '1'; ok(); };
    l.addEventListener('load', fertig, { once: true }); l.addEventListener('error', () => ok(), { once: true }); setTimeout(ok, 4000);
  });

  // ---------------------------------------------------------------- Unfallort (je Einsatz, 12 h gültig)
  function unfallort() { const u = LS.get('gsz-unfallort'); return u && Date.now() - u.zeit < UNFALL_GUELTIG_MS ? u : null; }
  function unfallortSetzen(ort, art = 'hand') { const u = ort ? { lat: ort.lat, lon: ort.lon, zeit: Date.now(), art } : null; LS.set('gsz-unfallort', u); return u; }

  // ---------------------------------------------------------------- Geometrie
  const RAD = Math.PI / 180;
  function ziel(lat, lon, grad, m) {
    const R = 6371008.8, d = m / R, b = grad * RAD, p1 = lat * RAD, l1 = lon * RAD;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: p2 / RAD, lon: ((l2 / RAD + 540) % 360) - 180 };
  }
  // Zone in Windrichtung: Quadrat, so lang wie breit, die Gefahrenstelle in der Mitte der windzugewandten Seite (ERG)
  function zonenPunkte(o, zugGrad, laenge) {
    const a = ziel(o.lat, o.lon, zugGrad - 90, laenge / 2), b = ziel(o.lat, o.lon, zugGrad + 90, laenge / 2);
    return [a, b, ziel(b.lat, b.lon, zugGrad, laenge), ziel(a.lat, a.lon, zugGrad, laenge)];
  }
  const hatZug = opts => opts.zugGrad !== null && opts.zugGrad !== undefined && isFinite(opts.zugGrad);
  // Anfahrtssektor: Kreisring-Ausschnitt um die Richtung mitteGrad (von der Einsatzstelle aus gesehen), Öffnung winkel, Radien innen/außen
  function sektorPunkte(o, mitteGrad, winkel, innen, aussen, n = 24) {
    const aus = [], innenPkte = [];
    for (let i = 0; i <= n; i++) {
      const g = mitteGrad - winkel / 2 + winkel * i / n;
      aus.push(ziel(o.lat, o.lon, g, aussen)); innenPkte.push(ziel(o.lat, o.lon, g, innen));
    }
    return aus.concat(innenPkte.reverse());
  }
  const anfahrtDa = opts => !!(opts.anfahrt && isFinite(opts.anfahrt.vonGrad) && opts.anfahrt.aussen_m > opts.anfahrt.innen_m);
  const anfahrtPunkte = (o, a) => sektorPunkte(o, a.vonGrad, a.winkel || 90, a.innen_m, a.aussen_m);
  // Ausbreitungsolive: Umriss aus GSZGefahrgut.olivenForm (spitz an der Austrittsstelle mit dem Öffnungswinkel, vorne gerundet)
  function olivenPunkte(o, zugGrad, laenge, winkel) {
    const GG = window.GSZGefahrgut;
    return GG.olivenForm(winkel).map(x => (x.anteil < 1e-9 ? { lat: o.lat, lon: o.lon } : ziel(o.lat, o.lon, zugGrad + x.grad, laenge * x.anteil)));
  }
  const oliveDa = opts => !!(opts.olive && opts.olive.laenge_m > 0 && hatZug(opts) && window.GSZGefahrgut);
  // Ausschnitt, der alles Gezeichnete umfasst
  function grenzen(o, opts) {
    if (opts.keinUnfallort) return [ziel(o.lat, o.lon, 0, 700), ziel(o.lat, o.lon, 90, 700), ziel(o.lat, o.lon, 180, 700), ziel(o.lat, o.lon, 270, 700)];
    const r = Math.max(opts.gefahr_m || 0, opts.absperr_m || 0, opts.ergAbs_m || 0, opts.still ? opts.still.m : 0, 60);
    const pkte = [ziel(o.lat, o.lon, 0, r), ziel(o.lat, o.lon, 90, r), ziel(o.lat, o.lon, 180, r), ziel(o.lat, o.lon, 270, r)];
    if (opts.zone && opts.zone.m && hatZug(opts)) pkte.push(...zonenPunkte(o, opts.zugGrad, opts.zone.m));
    if (oliveDa(opts)) pkte.push(...olivenPunkte(o, opts.zugGrad, opts.olive.laenge_m, opts.olive.winkel));
    if (anfahrtDa(opts)) pkte.push(...anfahrtPunkte(o, opts.anfahrt));
    if (opts.standort && !opts.ohneStandortEinpassen) pkte.push(opts.standort);
    return pkte;
  }
  // Meter je Bildpunkt (Web-Mercator, 256er Kacheln – Google und OpenStreetMap gleich)
  const meterJePunkt = (lat, zoom) => 156543.03392 * Math.cos(lat * RAD) / 2 ** zoom;
  // Schilder auf der Karte: Kreise beschriftet auf der Seite gegen die Zugrichtung (nördlich bzw. südlich des Unfallorts,
  // übereinander nach Radius); liegen zwei Schilder näher als 22 Bildpunkte beieinander, werden sie zusammengefasst. Kreise
  // unter 18 Bildpunkten Radius (weit herausgezoomt) stehen gesammelt in einem Schild über dem Unfallort. Die Olive ist an
  // ihrer Spitze beschriftet, die ERG-Zone an der äußeren Ecke. dy: Versatz des Schilds in Bildpunkten (nach unten positiv).
  function schilderPlanen(o, opts, mpp) {
    const aus = [], zug = hatZug(opts) ? opts.zugGrad : null;
    const seite = zug === null ? 0 : Math.cos(zug * RAD) > 0 ? 180 : 0;
    const kreise = [];
    if (opts.gefahr_m) kreise.push({ r: opts.gefahr_m, text: 'Gefahrenbereich ' + meter(opts.gefahr_m), art: 'gefahr' });
    if (opts.absperr_m) kreise.push({ r: opts.absperr_m, text: 'Absperrbereich ' + meter(opts.absperr_m), art: 'absperr' });
    if (opts.ergAbs_m && opts.ergAbs_m > (opts.gefahr_m || 0)) kreise.push({ r: opts.ergAbs_m, text: 'ERG: Erstabsperrung ' + meter(opts.ergAbs_m), art: 'erg' });
    if (opts.still && opts.still.m) kreise.push({ r: opts.still.m, text: opts.still.kurz || 'Windstille: ' + meter(opts.still.m), art: 'still' });
    kreise.sort((a, b) => a.r - b.r);
    let vorher = null;
    const klein = [];
    for (const k of kreise) {
      if (k.r / mpp < 18) { klein.push(k); continue; }
      if (vorher && (k.r - vorher.r) / mpp < 22) { vorher.text += ' · ' + k.text; vorher.r = k.r; continue; }
      vorher = { ...k }; aus.push(vorher);
    }
    for (const k of aus) k.p = ziel(o.lat, o.lon, seite, k.r);
    // Sammelschild am Unfallort: zur Seite der Ausbreitung hin, damit es am Kartenrand nicht abgeschnitten wird
    if (klein.length) {
      const text = klein.map(k => (k.art === 'erg' ? 'ERG ' + meter(k.r) : k.text)).join(' · ');
      const ost = zug === null ? 0 : Math.sin(zug * RAD) > 0.2 ? 1 : Math.sin(zug * RAD) < -0.2 ? -1 : 0;
      aus.push({ p: { lat: o.lat, lon: o.lon }, art: klein[0].art, text, dy: seite === 0 ? -27 : 27, dx: ost * Math.round((text.length * 6.3 + 18) / 2 - 12) });
    }
    // Olive und ERG-Zone: Schild innen nahe dem Ende (bleibt beim Einpassen sichtbar); liegen beide aufeinander, die Zone darunter
    const oliveM = oliveDa(opts) ? opts.olive.laenge_m * 0.84 : null;
    if (opts.zone && opts.zone.m && zug !== null && opts.zone.m / mpp >= 30) {
      const zoneM = opts.zone.m * 0.9;
      aus.push({ p: ziel(o.lat, o.lon, zug, zoneM), text: opts.zone.kurz || opts.zone.text || 'ERG-Zone', art: 'zone',
        dy: oliveM !== null && Math.abs(oliveM - zoneM) / mpp < 30 ? 26 : 0 });
    }
    if (oliveM !== null) aus.push({ p: ziel(o.lat, o.lon, zug, oliveM), text: opts.olive.kurz || opts.olive.text || 'Ausbreitung', art: 'olive', haupt: true });
    if (anfahrtDa(opts)) {
      const a = { p: ziel(o.lat, o.lon, opts.anfahrt.vonGrad, opts.anfahrt.aussen_m * 0.9), text: opts.anfahrt.kurz || 'Anfahrt', art: 'anfahrt', haupt: true };
      // Lage in Bildpunkten um den Unfallort (genähert) und Kasten des Schilds
      const kasten = x => { const px = (x.p.lon - o.lon) * Math.cos(o.lat * RAD) * 111320 / mpp + (x.dx || 0), py = -(x.p.lat - o.lat) * 110574 / mpp + (x.dy || 0);
        const b = x.text.length * 6.3 + 18; return { l: px - b / 2, r: px + b / 2, o: py - 10, u: py + 10 }; };
      const stoesst = x => { const k = kasten(x); return aus.some(y => { const m = kasten(y); return k.l < m.r + 4 && k.r > m.l - 4 && k.o < m.u + 2 && k.u > m.o - 2; }); };
      const platz = [0, 26, -26, 52, -52].map(dy => ({ ...a, dy })).find(x => !stoesst(x));
      if (platz) aus.push(platz);
    }
    return aus;
  }

  // ---------------------------------------------------------------- Kartenebenen: Straße (OpenStreetMap) bzw. Hybrid (Luftbild mit Beschriftung)
  // Hybrid = Esri World Imagery (lückenlos, auch außerhalb von Rheinland-Pfalz) + DOP20 Rheinland-Pfalz darüber (amtliches Luftbild,
  // Datenlizenz Deutschland – Namensnennung 2.0, erst ab Zoom 13) + Straßen- und Ortsnamen (CARTO Voyager, nur Beschriftung).
  // Gewählt je Gerät (gsz-karte-ebene); mit Google-Schlüssel stattdessen Google „Karte“ bzw. „Hybrid“.
  const ebeneGewaehlt = () => LS.get('gsz-karte-ebene') === 'hybrid' ? 'hybrid' : 'strasse';
  function ebenenErzeugen(L, art) {
    if (art !== 'hybrid') return [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap-Mitwirkende' })];
    return [
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19,
        attribution: '© Esri, Maxar' }),
      L.tileLayer.wms('https://geo4.service24.rlp.de/wms/rp_dop20.fcgi', { layers: 'rp_dop20', format: 'image/jpgpng', transparent: true, version: '1.1.1', minZoom: 13, maxZoom: 20,
        attribution: `©GeoBasis-DE / LVermGeoRP (${new Date().getFullYear()}), dl-de/by-2-0` }),
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 20,
        attribution: '© CARTO, © OpenStreetMap' }),
    ];
  }

  // ---------------------------------------------------------------- OpenStreetMap (Leaflet)
  async function leaflet() {
    await stil('karte/leaflet.css');
    if (!window.L) await skript('karte/leaflet.js');
    if (!window.L) throw new Error('Kartenbaustein fehlt.');
    return window.L;
  }
  function osmKarte(L, el, o, opts0 = {}) {
    // ohne Animationen: im Einsatz unnötig, und eine hängende Zoom-Animation blendet Kacheln und Zeichnung aus
    const karte = L.map(el, { zoomControl: false, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, inertia: false });
    if (opts0.zoomPos !== false) L.control.zoom({ position: opts0.zoomPos || 'topleft' }).addTo(karte);
    let grund = [];
    const ebeneSetzen = art => { for (const e of grund) karte.removeLayer(e); grund = ebenenErzeugen(L, art); for (const e of grund) { e.addTo(karte); if (e.bringToBack && e === grund[0]) e.bringToBack(); } };
    ebeneSetzen(opts0.ebene || 'strasse');
    if (opts0.beiTippen) karte.on('click', e => opts0.beiTippen({ lat: e.latlng.lat, lon: e.latlng.lng }));
    L.control.scale({ metric: true, imperial: false, position: opts0.massstabPos || 'bottomleft' }).addTo(karte);
    karte.setView([o.lat, o.lon], 17);
    // Größe nachführen (Seite baut sich auf, „Karte groß“, Drehen des Geräts)
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => karte.invalidateSize()); ro.observe(el); karte.on('unload', () => ro.disconnect()); }
    const ebenen = [], schildEbenen = [];
    const weg = () => { for (const e of ebenen.splice(0)) karte.removeLayer(e); };
    let unfall = null, stand = null;
    // Schilder je Zoomstufe neu planen (zusammenfassen bzw. weglassen)
    const schilder = () => {
      for (const e of schildEbenen.splice(0)) karte.removeLayer(e);
      if (!stand) return;
      const mpp = meterJePunkt(stand.o.lat, karte.getZoom());
      for (const x of schilderPlanen(stand.o, stand.opts, mpp))
        schildEbenen.push(L.marker([x.p.lat, x.p.lon], { interactive: false, keyboard: false, zIndexOffset: x.haupt ? 900 : 700,
          icon: L.divIcon({ className: 'gk-schild-anker', html: `<span class="gk-schild f-${x.art}"${x.dy || x.dx ? ` style="margin-top:${x.dy || 0}px;margin-left:${x.dx || 0}px"` : ''}>${esc(x.text)}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] }) }).addTo(karte));
    };
    karte.on('zoomend', schilder);
    return {
      art: 'osm',
      zeichnen(o2, opts, beiZug) {
        weg();
        stand = opts.keinUnfallort ? null : { o: o2, opts };
        const p = [o2.lat, o2.lon];
        if (opts.keinUnfallort) {
          if (opts.standort) ebenen.push(L.circleMarker([opts.standort.lat, opts.standort.lon], { radius: 7, color: '#fff', weight: 2.5, fillColor: FARBE.ich, fillOpacity: 1, interactive: false }).addTo(karte));
          if (opts.vorschlag) ebenen.push(L.marker([opts.vorschlag.lat, opts.vorschlag.lon], { interactive: false, keyboard: false, zIndexOffset: 1000,
            icon: L.divIcon({ className: 'gk-vorschlag', html: NADEL, iconSize: [34, 46], iconAnchor: [17, 44] }) }).addTo(karte));
          // Suchtreffer: nummerierte Punkte, Tipp wählt aus (Markierungen geben den Klick nicht an die Karte weiter)
          for (const [i, t] of (opts.treffer || []).entries()) {
            const m = L.marker([t.lat, t.lon], { title: t.titel, keyboard: true, zIndexOffset: 800 - i,
              icon: L.divIcon({ className: 'gk-treffer', html: `<span>${t.nr}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(karte);
            if (opts.beiTreffer) m.on('click', () => opts.beiTreffer(i));
            ebenen.push(m);
          }
          schilder();
          return;
        }
        if (opts.zone && opts.zone.m && hatZug(opts))
          ebenen.push(L.polygon(zonenPunkte(o2, opts.zugGrad, opts.zone.m).map(x => [x.lat, x.lon]), { color: FARBE.zone, weight: 2, fillOpacity: .18 }).bindTooltip(opts.zone.text || 'Zone in Windrichtung').addTo(karte));
        if (oliveDa(opts))
          ebenen.push(L.polygon(olivenPunkte(o2, opts.zugGrad, opts.olive.laenge_m, opts.olive.winkel).map(x => [x.lat, x.lon]),
            { color: FARBE.olive, weight: 2.5, fillColor: FARBE.olive, fillOpacity: .16, className: 'gk-olive' }).bindTooltip(opts.olive.text || 'Ausbreitung').addTo(karte));
        if (anfahrtDa(opts))
          ebenen.push(L.polygon(anfahrtPunkte(o2, opts.anfahrt).map(x => [x.lat, x.lon]), { color: FARBE.anfahrt, weight: 2, dashArray: '6 5', fillColor: FARBE.anfahrt, fillOpacity: .18, className: 'gk-anfahrt' })
            .bindTooltip(opts.anfahrt.text || 'Anfahrt').addTo(karte));
        if (opts.routeAlt && opts.routeAlt.length > 1)
          ebenen.push(L.polyline(opts.routeAlt.map(x => [x.lat, x.lon]), { color: opts.routeAltFarbe || FARBE.anfahrt, weight: 5, opacity: .95, dashArray: '10 8', className: 'gk-route-alt' })
            .bindTooltip(opts.routeAltFarbe && opts.routeAltFarbe !== FARBE.anfahrt ? 'Andere Route' : 'Andere Route mit Anfahrt gegen den Wind').addTo(karte));
        if (opts.route && opts.route.length > 1) {
          ebenen.push(L.polyline(opts.route.map(x => [x.lat, x.lon]), { color: '#fff', weight: 8, opacity: .85, interactive: false }).addTo(karte));
          ebenen.push(L.polyline(opts.route.map(x => [x.lat, x.lon]), { color: FARBE.route, weight: 5, opacity: .95, className: 'gk-route' }).bindTooltip('Route des Navis (Vorschau)').addTo(karte));
          for (const t of opts.routeKritisch || []) if (t.length > 1)
            ebenen.push(L.polyline(t.map(x => [x.lat, x.lon]), { color: FARBE.kritisch, weight: 6, opacity: 1, className: 'gk-route-kritisch' }).bindTooltip('Route durch Gefahrenbereich bzw. Ausbreitung').addTo(karte));
        }
        if (opts.still && opts.still.m) ebenen.push(L.circle(p, { radius: opts.still.m, color: FARBE.still, weight: 2, dashArray: '6 6', fillColor: FARBE.still, fillOpacity: .07 })
          .bindTooltip(opts.still.text || 'Windstille').addTo(karte));
        if (opts.ergAbs_m && opts.ergAbs_m > (opts.gefahr_m || 0)) ebenen.push(L.circle(p, { radius: opts.ergAbs_m, color: FARBE.erg, weight: 2, dashArray: '4 6', fill: false }).bindTooltip('ERG: sofort absperren ' + opts.ergAbs_m + ' m').addTo(karte));
        if (opts.absperr_m) ebenen.push(L.circle(p, { radius: opts.absperr_m, color: FARBE.absperr, weight: 2, dashArray: '8 6', fill: false }).bindTooltip('Absperrbereich ' + opts.absperr_m + ' m').addTo(karte));
        if (opts.gefahr_m) ebenen.push(L.circle(p, { radius: opts.gefahr_m, color: FARBE.gefahr, weight: 2.5, fillOpacity: .16 }).bindTooltip('Gefahrenbereich ' + opts.gefahr_m + ' m').addTo(karte));
        if (opts.standort) {
          if (opts.standort.genau) ebenen.push(L.circle([opts.standort.lat, opts.standort.lon], { radius: opts.standort.genau, color: FARBE.ich, weight: 1, fillOpacity: .08 }).addTo(karte));
          ebenen.push(L.circleMarker([opts.standort.lat, opts.standort.lon], { radius: 7, color: '#fff', weight: 2.5, fillColor: FARBE.ich, fillOpacity: 1 }).bindTooltip('Mein Standort').addTo(karte));
        }
        const ziehbar = opts.ziehbar !== false;
        unfall = L.marker(p, { draggable: ziehbar, autoPan: ziehbar, interactive: ziehbar, keyboard: false, title: ziehbar ? 'Unfallort – zum Verschieben ziehen' : opts.unfallText || 'Einsatzstelle',
          icon: L.divIcon({ className: 'gk-unfall', html: '<span></span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(karte);
        if (ziehbar) unfall.on('dragend', () => { const ll = unfall.getLatLng(); beiZug({ lat: ll.lat, lon: ll.lng }); });
        ebenen.push(unfall);
        // Vorschlag (angetippter Punkt, noch nicht übernommen)
        if (opts.vorschlag) ebenen.push(L.marker([opts.vorschlag.lat, opts.vorschlag.lon], { interactive: false, keyboard: false, zIndexOffset: 1000,
            icon: L.divIcon({ className: 'gk-vorschlag', html: NADEL, iconSize: [34, 46], iconAnchor: [17, 44] }) }).addTo(karte));
        schilder();
      },
      einpassen(pkte) { const r = rand(el, opts0);
        karte.fitBounds(L.latLngBounds(pkte.map(x => [x.lat, x.lon])), { paddingTopLeft: [r.links, r.oben], paddingBottomRight: [r.rechts, r.unten], maxZoom: 18, animate: false }); },
      ebeneSetzen,
      zoomen(d) { karte.setZoom(karte.getZoom() + d, { animate: false }); },
      mitte() { const c = karte.getCenter(); return { lat: c.lat, lon: c.lng }; },
      verschieben(x) { karte.setView([x.lat, x.lon], karte.getZoom(), { animate: false }); },
      groesse() { karte.invalidateSize(); },
      zerstoeren() { karte.remove(); },
    };
  }

  // ---------------------------------------------------------------- Google Maps (Maps JavaScript API, eigener Schlüssel)
  let googleLaedt = null;
  function googleLaden(schluessel) {
    if (window.google && google.maps && google.maps.Map) return Promise.resolve(google.maps);
    if (googleLaedt) return googleLaedt;
    googleLaedt = new Promise((ok, fehler) => {
      const zeit = setTimeout(() => fehler(new Error('Google Maps antwortet nicht.')), 15000);
      window.__gszGoogleBereit = () => { clearTimeout(zeit); ok(google.maps); };
      window.gm_authFailure = () => { clearTimeout(zeit); googleKaputt = true; fehler(new Error('Google lehnt den Schlüssel ab (Maps JavaScript API freigeschaltet? Einschränkungen?).')); };
      skript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(schluessel)}&v=weekly&language=de&region=DE&callback=__gszGoogleBereit`).catch(e => { clearTimeout(zeit); fehler(e); });
    });
    googleLaedt.catch(() => { googleLaedt = null; });
    return googleLaedt;
  }
  let googleKaputt = false;
  // Rand beim Einpassen: oben Platz unter der Windanzeige der Karte (sonst lägen Unfallort und Beschriftung darunter, v. a. im Querformat)
  function rand(el, opts0 = {}) {
    if (opts0.polster) { const p = opts0.polster(); return { oben: p.oben ?? 24, unten: p.unten ?? 24, links: p.links ?? 24, rechts: p.rechts ?? 24 }; }
    const w = el.parentElement && el.parentElement.querySelector('.lg-karte-wind');
    const r = w && w.getBoundingClientRect(), k = el.getBoundingClientRect();
    const oben = r && r.height ? Math.min(Math.round(r.bottom - k.top + 30), Math.round(k.height * 0.4)) : 24;
    return { oben: Math.max(24, oben), unten: 24, links: 24, rechts: 24 };
  }
  function googleKarte(g, el, o, opts0 = {}) {
    const karte = new g.Map(el, { center: { lat: o.lat, lng: o.lon }, zoom: 17, mapTypeId: opts0.ebene === 'strasse' ? 'roadmap' : 'hybrid', mapTypeControl: !opts0.ebene, scaleControl: true, streetViewControl: false, fullscreenControl: false,
      rotateControl: false, gestureHandling: 'greedy', clickableIcons: false, mapTypeControlOptions: { mapTypeIds: ['roadmap', 'hybrid'] } });
    const ebenen = [], schildEbenen = [];
    if (opts0.beiTippen) karte.addListener('click', e => opts0.beiTippen({ lat: e.latLng.lat(), lon: e.latLng.lng() }));
    const weg = () => { for (const e of ebenen.splice(0)) e.setMap(null); };
    const ll = x => ({ lat: x.lat, lng: x.lon });
    let stand = null;
    const schilder = () => {
      for (const e of schildEbenen.splice(0)) e.setMap(null);
      if (!stand) return;
      const mpp = meterJePunkt(stand.o.lat, karte.getZoom() || 17);
      for (const x of schilderPlanen(stand.o, stand.opts, mpp))
        schildEbenen.push(new g.Marker({ map: karte, position: ll(x.p), clickable: false, zIndex: x.haupt ? 1000 : 900,
          icon: { path: 'M 0 0', scale: 1, strokeOpacity: 0, fillOpacity: 0, labelOrigin: new g.Point(x.dx || 0, x.dy || 0) },
          label: { text: x.text, className: `gk-gschild f-${x.art}`, color: x.haupt ? '#ffffff' : '#111111', fontSize: '11px', fontWeight: '700' } }));
    };
    karte.addListener('zoom_changed', schilder);
    return {
      art: 'google',
      zeichnen(o2, opts, beiZug) {
        weg();
        stand = opts.keinUnfallort ? null : { o: o2, opts };
        const p = ll(o2);
        if (opts.keinUnfallort) {
          if (opts.standort) ebenen.push(new g.Marker({ map: karte, position: ll(opts.standort), clickable: false, icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: FARBE.ich, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 } }));
          if (opts.vorschlag) ebenen.push(new g.Marker({ map: karte, position: ll(opts.vorschlag), clickable: false, zIndex: 2000, title: 'Einsatzstelle (noch nicht bestätigt)' }));
          for (const [i, t] of (opts.treffer || []).entries()) {
            const m = new g.Marker({ map: karte, position: ll(t), title: t.titel, label: { text: String(t.nr), color: '#ffffff', fontWeight: '700', fontSize: '12px' },
              icon: { path: g.SymbolPath.CIRCLE, scale: 12, fillColor: '#2563c9', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 } });
            if (opts.beiTreffer) m.addListener('click', () => opts.beiTreffer(i));
            ebenen.push(m);
          }
          schilder();
          return;
        }
        if (opts.zone && opts.zone.m && hatZug(opts))
          ebenen.push(new g.Polygon({ map: karte, paths: zonenPunkte(o2, opts.zugGrad, opts.zone.m).map(ll), strokeColor: FARBE.zone, strokeWeight: 2, fillColor: FARBE.zone, fillOpacity: .2, clickable: false }));
        if (oliveDa(opts))
          ebenen.push(new g.Polygon({ map: karte, paths: olivenPunkte(o2, opts.zugGrad, opts.olive.laenge_m, opts.olive.winkel).map(ll), strokeColor: FARBE.olive, strokeWeight: 2.5,
            fillColor: FARBE.olive, fillOpacity: .18, clickable: false }));
        if (anfahrtDa(opts))
          ebenen.push(new g.Polygon({ map: karte, paths: anfahrtPunkte(o2, opts.anfahrt).map(ll), strokeColor: FARBE.anfahrt, strokeWeight: 2, fillColor: FARBE.anfahrt, fillOpacity: .22, clickable: false }));
        if (opts.routeAlt && opts.routeAlt.length > 1)
          ebenen.push(new g.Polyline({ map: karte, path: opts.routeAlt.map(ll), strokeOpacity: 0, clickable: false,
            icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: opts.routeAltFarbe || FARBE.anfahrt, strokeWeight: 5, scale: 3 }, offset: '0', repeat: '16px' }] }));
        if (opts.route && opts.route.length > 1) {
          ebenen.push(new g.Polyline({ map: karte, path: opts.route.map(ll), strokeColor: '#ffffff', strokeWeight: 8, strokeOpacity: .85, clickable: false }));
          ebenen.push(new g.Polyline({ map: karte, path: opts.route.map(ll), strokeColor: FARBE.route, strokeWeight: 5, strokeOpacity: .95, clickable: false }));
          for (const t of opts.routeKritisch || []) if (t.length > 1)
            ebenen.push(new g.Polyline({ map: karte, path: t.map(ll), strokeColor: FARBE.kritisch, strokeWeight: 6, strokeOpacity: 1, clickable: false }));
        }
        if (opts.still && opts.still.m) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.still.m, strokeColor: FARBE.still, strokeWeight: 2, strokeOpacity: .85,
          fillColor: FARBE.still, fillOpacity: .07, clickable: false }));
        if (opts.ergAbs_m && opts.ergAbs_m > (opts.gefahr_m || 0)) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.ergAbs_m, strokeColor: FARBE.erg, strokeWeight: 2, fillOpacity: 0, clickable: false }));
        if (opts.absperr_m) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.absperr_m, strokeColor: FARBE.absperr, strokeWeight: 2, fillOpacity: 0, clickable: false }));
        if (opts.gefahr_m) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.gefahr_m, strokeColor: FARBE.gefahr, strokeWeight: 2.5, fillColor: FARBE.gefahr, fillOpacity: .18, clickable: false }));
        if (opts.standort) ebenen.push(new g.Marker({ map: karte, position: ll(opts.standort), title: 'Mein Standort', clickable: false,
          icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: FARBE.ich, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 } }));
        const m = new g.Marker({ map: karte, position: p, draggable: opts.ziehbar !== false, clickable: opts.ziehbar !== false, title: opts.ziehbar === false ? opts.unfallText || 'Einsatzstelle' : 'Unfallort – zum Verschieben ziehen',
          icon: { path: g.SymbolPath.CIRCLE, scale: 11, fillColor: FARBE.gefahr, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 } });
        m.addListener('dragend', () => { const q = m.getPosition(); beiZug({ lat: q.lat(), lon: q.lng() }); });
        ebenen.push(m);
        if (opts.vorschlag) ebenen.push(new g.Marker({ map: karte, position: ll(opts.vorschlag), clickable: false, zIndex: 2000, title: 'Einsatzstelle (noch nicht bestätigt)' }));
        schilder();
      },
      ebeneSetzen(art) { karte.setMapTypeId(art === 'strasse' ? 'roadmap' : 'hybrid'); },
      zoomen(d) { karte.setZoom((karte.getZoom() || 15) + d); },
      einpassen(pkte) { const b = new g.LatLngBounds(), r = rand(el, opts0); for (const x of pkte) b.extend(ll(x)); karte.fitBounds(b, { top: r.oben, right: r.rechts, bottom: r.unten, left: r.links });
        g.event.addListenerOnce(karte, 'idle', () => { if (karte.getZoom() > 18) karte.setZoom(18); }); },
      mitte() { const c = karte.getCenter(); return { lat: c.lat(), lon: c.lng() }; },
      verschieben(x) { karte.setCenter(ll(x)); },
      groesse() { /* passt sich selbst an */ },
      zerstoeren() { weg(); for (const e of schildEbenen.splice(0)) e.setMap(null); el.innerHTML = ''; },
    };
  }

  // ---------------------------------------------------------------- Karte zeigen
  // opts: { unfallort, standort, gefahr_m, absperr_m, ergAbs_m, zone: { m, text, kurz }, olive: { laenge_m, winkel, text, kurz }, still: { m, text, kurz },
  //         zugGrad, google: Schlüssel | '', beiVerschieben(ort),
  //         ebene: 'strasse' | 'hybrid' (ohne Angabe: Straße bzw. Google wie bisher), zoomPos: Leaflet-Ecke | false, massstabPos: Leaflet-Ecke, ziehbar: false (Markierung fest),
  //         keinUnfallort: true (noch keine Einsatzstelle – nur Standort, Vorschlag und Suchtreffer), mitte: { lat, lon } (Kartenmitte ohne Einsatzstelle),
  //         treffer: [{ lat, lon, nr, titel }] (Suchtreffer, nur ohne Einsatzstelle), beiTreffer(i) (Tipp auf einen Treffer),
  //         beiTippen(ort) (Tippen auf die Karte), vorschlag: { lat, lon } (angetippter Punkt), polster() → { oben, unten, links, rechts } (Freiraum beim Einpassen) }
  async function zeigen(el, opts) {
    el.innerHTML = '';
    el.classList.add('gk-karte');
    let o = opts.unfallort || opts.standort || opts.mitte;
    let k = null;
    if (opts.google && !googleKaputt) {
      try { k = googleKarte(await googleLaden(opts.google), el, o, opts); }
      catch (e) { opts.fehler = e.message; k = null; el.innerHTML = ''; }
    }
    if (!k) k = osmKarte(await leaflet(), el, o, opts);
    const zeichnen = () => k.zeichnen(o, opts, neu => { o = neu; unfallortSetzen(neu, 'hand'); zeichnen(); if (opts.beiVerschieben) opts.beiVerschieben(neu); });
    zeichnen();
    await new Promise(r => requestAnimationFrame(() => r()));
    k.groesse();
    k.einpassen(grenzen(o, opts));
    return (window.GSZKarte.letzte = {
      art: k.art, fehler: opts.fehler || '', verschieben: x => k.verschieben(x),
      setzen(neu) { Object.assign(opts, neu); if (neu.unfallort) o = neu.unfallort; zeichnen(); },
      zentrieren() { k.einpassen(grenzen(o, opts)); },
      zeigeBereich(pkte) { if (pkte && pkte.length) k.einpassen(pkte); },
      ebeneSetzen(art) { opts.ebene = art; if (k.ebeneSetzen) k.ebeneSetzen(art); },
      zoomen: d => { if (k.zoomen) k.zoomen(d); },
      mitte: () => k.mitte(),
      unfallort: () => o,
      zerstoeren: () => k.zerstoeren(),
      groesse: () => k.groesse(),
    });
  }

  window.GSZKarte = { zeigen, unfallort, unfallortSetzen, ziel, zonenPunkte, olivenPunkte, sektorPunkte, schilderPlanen, meterJePunkt, leaflet, ebenenErzeugen, ebeneGewaehlt };
})();
