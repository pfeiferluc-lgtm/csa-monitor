// Karte für Absperren und Ausbreitung (Reiter „Wind/Absperren“): maßstäblich auf Google Maps (mit API-Schlüssel, zentral in
// Einsatz/_App/Karte/karte.json) oder OpenStreetMap (Leaflet, ohne Schlüssel – Rückfall). Grundlage ist der Standort des
// Geräts (GPS). Den Unfallort kann man verschieben: Markierung ziehen oder „Unfallort = Kartenmitte“. Gezeichnet werden
// Gefahrenbereich (Grundlage RLP bzw. FwDV 500), ggf. Absperrbereich, die Erstabsperrung und die Schutz- bzw. Räumungszone
// nach ERG in Windrichtung (Quadrat in Windrichtung, so lang wie breit) und der eigene Standort.
// window.GSZKarte = { zeigen(el, opts) → { setzen(opts), zentrieren(), mitte(), zerstoeren() }, unfallort(), unfallortSetzen(), googleSchluessel… }
'use strict';
(() => {
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } },
  };
  const UNFALL_GUELTIG_MS = 12 * 3600 * 1000;
  const FARBE = { gefahr: '#e5484d', absperr: '#26a95b', erg: '#f0794a', zone: '#f2b01e', ich: '#4c8df0' };
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
  // Ausschnitt, der alles Gezeichnete umfasst
  function grenzen(o, opts) {
    const r = Math.max(opts.gefahr_m || 0, opts.absperr_m || 0, opts.ergAbs_m || 0, 60);
    const pkte = [ziel(o.lat, o.lon, 0, r), ziel(o.lat, o.lon, 90, r), ziel(o.lat, o.lon, 180, r), ziel(o.lat, o.lon, 270, r)];
    if (opts.zone && opts.zone.m && opts.zugGrad !== null && opts.zugGrad !== undefined) pkte.push(...zonenPunkte(o, opts.zugGrad, opts.zone.m));
    if (opts.standort) pkte.push(opts.standort);
    return pkte;
  }

  // ---------------------------------------------------------------- OpenStreetMap (Leaflet)
  async function leaflet() {
    await stil('karte/leaflet.css');
    if (!window.L) await skript('karte/leaflet.js');
    if (!window.L) throw new Error('Kartenbaustein fehlt.');
    return window.L;
  }
  function osmKarte(L, el, o) {
    // ohne Animationen: im Einsatz unnötig, und eine hängende Zoom-Animation blendet Kacheln und Zeichnung aus
    const karte = L.map(el, { zoomControl: true, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, inertia: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap-Mitwirkende' }).addTo(karte);
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(karte);
    karte.setView([o.lat, o.lon], 17);
    // Größe nachführen (Seite baut sich auf, „Karte groß“, Drehen des Geräts)
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => karte.invalidateSize()); ro.observe(el); karte.on('unload', () => ro.disconnect()); }
    const ebenen = [];
    const weg = () => { for (const e of ebenen.splice(0)) karte.removeLayer(e); };
    let unfall = null;
    return {
      art: 'osm',
      zeichnen(o2, opts, beiZug) {
        weg();
        const p = [o2.lat, o2.lon];
        if (opts.zone && opts.zone.m && opts.zugGrad !== null && opts.zugGrad !== undefined)
          ebenen.push(L.polygon(zonenPunkte(o2, opts.zugGrad, opts.zone.m).map(x => [x.lat, x.lon]), { color: FARBE.zone, weight: 2, fillOpacity: .18 }).bindTooltip(opts.zone.text || 'Zone in Windrichtung').addTo(karte));
        if (opts.ergAbs_m && opts.ergAbs_m > (opts.gefahr_m || 0)) ebenen.push(L.circle(p, { radius: opts.ergAbs_m, color: FARBE.erg, weight: 2, dashArray: '4 6', fill: false }).bindTooltip('ERG: sofort absperren ' + opts.ergAbs_m + ' m').addTo(karte));
        if (opts.absperr_m) ebenen.push(L.circle(p, { radius: opts.absperr_m, color: FARBE.absperr, weight: 2, dashArray: '8 6', fill: false }).bindTooltip('Absperrbereich ' + opts.absperr_m + ' m').addTo(karte));
        if (opts.gefahr_m) ebenen.push(L.circle(p, { radius: opts.gefahr_m, color: FARBE.gefahr, weight: 2.5, fillOpacity: .16 }).bindTooltip('Gefahrenbereich ' + opts.gefahr_m + ' m').addTo(karte));
        if (opts.standort) {
          if (opts.standort.genau) ebenen.push(L.circle([opts.standort.lat, opts.standort.lon], { radius: opts.standort.genau, color: FARBE.ich, weight: 1, fillOpacity: .08 }).addTo(karte));
          ebenen.push(L.circleMarker([opts.standort.lat, opts.standort.lon], { radius: 7, color: '#fff', weight: 2.5, fillColor: FARBE.ich, fillOpacity: 1 }).bindTooltip('Mein Standort').addTo(karte));
        }
        unfall = L.marker(p, { draggable: true, autoPan: true, title: 'Unfallort – zum Verschieben ziehen',
          icon: L.divIcon({ className: 'gk-unfall', html: '<span></span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(karte);
        unfall.on('dragend', () => { const ll = unfall.getLatLng(); beiZug({ lat: ll.lat, lon: ll.lng }); });
        ebenen.push(unfall);
      },
      einpassen(pkte) { karte.fitBounds(L.latLngBounds(pkte.map(x => [x.lat, x.lon])), { padding: [24, 24], maxZoom: 18, animate: false }); },
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
  function googleKarte(g, el, o) {
    const karte = new g.Map(el, { center: { lat: o.lat, lng: o.lon }, zoom: 17, mapTypeId: 'hybrid', scaleControl: true, streetViewControl: false, fullscreenControl: false,
      rotateControl: false, gestureHandling: 'greedy', clickableIcons: false, mapTypeControlOptions: { mapTypeIds: ['roadmap', 'hybrid'] } });
    const ebenen = [];
    const weg = () => { for (const e of ebenen.splice(0)) e.setMap(null); };
    const ll = x => ({ lat: x.lat, lng: x.lon });
    return {
      art: 'google',
      zeichnen(o2, opts, beiZug) {
        weg();
        const p = ll(o2);
        if (opts.zone && opts.zone.m && opts.zugGrad !== null && opts.zugGrad !== undefined)
          ebenen.push(new g.Polygon({ map: karte, paths: zonenPunkte(o2, opts.zugGrad, opts.zone.m).map(ll), strokeColor: FARBE.zone, strokeWeight: 2, fillColor: FARBE.zone, fillOpacity: .2, clickable: false }));
        if (opts.ergAbs_m && opts.ergAbs_m > (opts.gefahr_m || 0)) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.ergAbs_m, strokeColor: FARBE.erg, strokeWeight: 2, fillOpacity: 0, clickable: false }));
        if (opts.absperr_m) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.absperr_m, strokeColor: FARBE.absperr, strokeWeight: 2, fillOpacity: 0, clickable: false }));
        if (opts.gefahr_m) ebenen.push(new g.Circle({ map: karte, center: p, radius: opts.gefahr_m, strokeColor: FARBE.gefahr, strokeWeight: 2.5, fillColor: FARBE.gefahr, fillOpacity: .18, clickable: false }));
        if (opts.standort) ebenen.push(new g.Marker({ map: karte, position: ll(opts.standort), title: 'Mein Standort', clickable: false,
          icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: FARBE.ich, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 } }));
        const m = new g.Marker({ map: karte, position: p, draggable: true, title: 'Unfallort – zum Verschieben ziehen',
          icon: { path: g.SymbolPath.CIRCLE, scale: 11, fillColor: FARBE.gefahr, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 } });
        m.addListener('dragend', () => { const q = m.getPosition(); beiZug({ lat: q.lat(), lon: q.lng() }); });
        ebenen.push(m);
      },
      einpassen(pkte) { const b = new g.LatLngBounds(); for (const x of pkte) b.extend(ll(x)); karte.fitBounds(b, 24);
        g.event.addListenerOnce(karte, 'idle', () => { if (karte.getZoom() > 18) karte.setZoom(18); }); },
      mitte() { const c = karte.getCenter(); return { lat: c.lat(), lon: c.lng() }; },
      verschieben(x) { karte.setCenter(ll(x)); },
      groesse() { /* passt sich selbst an */ },
      zerstoeren() { weg(); el.innerHTML = ''; },
    };
  }

  // ---------------------------------------------------------------- Karte zeigen
  // opts: { unfallort, standort, gefahr_m, absperr_m, ergAbs_m, zone: { m, text }, zugGrad, google: Schlüssel | '', beiVerschieben(ort) }
  async function zeigen(el, opts) {
    el.innerHTML = '';
    el.classList.add('gk-karte');
    let o = opts.unfallort || opts.standort;
    let k = null;
    if (opts.google && !googleKaputt) {
      try { k = googleKarte(await googleLaden(opts.google), el, o); }
      catch (e) { opts.fehler = e.message; k = null; el.innerHTML = ''; }
    }
    if (!k) k = osmKarte(await leaflet(), el, o);
    const zeichnen = () => k.zeichnen(o, opts, neu => { o = neu; unfallortSetzen(neu, 'hand'); zeichnen(); if (opts.beiVerschieben) opts.beiVerschieben(neu); });
    zeichnen();
    await new Promise(r => requestAnimationFrame(() => r()));
    k.groesse();
    k.einpassen(grenzen(o, opts));
    return (window.GSZKarte.letzte = {
      art: k.art, fehler: opts.fehler || '', verschieben: x => k.verschieben(x),
      setzen(neu) { Object.assign(opts, neu); if (neu.unfallort) o = neu.unfallort; zeichnen(); },
      zentrieren() { k.einpassen(grenzen(o, opts)); },
      mitte: () => k.mitte(),
      unfallort: () => o,
      zerstoeren: () => k.zerstoeren(),
      groesse: () => k.groesse(),
    });
  }

  window.GSZKarte = { zeigen, unfallort, unfallortSetzen, ziel, zonenPunkte };
})();
