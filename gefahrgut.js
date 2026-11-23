// Gefahrgut-Wissen ohne Netz: Nummer zur Kennzeichnung der Gefahr (Gefahrnummer, ADR 5.3.2.3), UN-Nummern mit deutscher
// Benennung (ADR Tabelle A), Absperr- und Schutzabstände nach dem Emergency Response Guidebook 2024 (ERG, Leitfäden und
// Tabelle 1 für giftige Gase beim Einatmen) und die Regeln der FwDV 500. Die Daten stehen in gefahrgut-daten.js
// (erzeugt mit werkzeuge/gefahrgut-daten.js). Läuft im Browser (window.GSZGefahrgut) und in Node (require, Tests).
'use strict';
(function (wurzel, fabrik) {
  const daten = (typeof module === 'object' && module.exports) ? (() => { try { return require('./gefahrgut-daten'); } catch { return null; } })()
    : wurzel.GSZGefahrgutDaten;
  const m = fabrik(daten || {});
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZGefahrgut = m;
})(typeof self !== 'undefined' ? self : this, function (D) {
  const K = D.kemler || { ziffern: {}, nummern: {}, x: '' };

  // ------------------------------------------------------------------ Gefahrnummer (Kemler-Zahl)
  // „X423“, „x 423“, „ 33 “ → { code: 'X423', x: true, text, teile: [{ ziffer, text }], bekannt }
  function gefahrnummer(eingabe) {
    const roh = String(eingabe || '').toUpperCase().replace(/[^0-9X]/g, '');
    const m = /^(X?)(\d{2,3})$/.exec(roh);
    if (!m) return null;
    const code = m[1] + m[2], x = !!m[1];
    const text = K.nummern[code] || '';
    // Ziffern einzeln: erste Ziffer Hauptgefahr, weitere Zusatzgefahren; verdoppelt = Verstärkung; 0 = keine Zusatzgefahr
    const z = m[2].split('');
    const teile = [];
    z.forEach((ziffer, i) => {
      if (ziffer === '0' && i > 0) { teile.push({ ziffer, text: 'keine weitere Gefahr' }); return; }
      if (i > 0 && ziffer === z[i - 1]) { teile[teile.length - 1].verstaerkt = true; return; }
      teile.push({ ziffer, text: K.ziffern[ziffer] || '' });
    });
    return { code, x, text, xText: x ? (K.x || 'reagiert gefährlich mit Wasser') : '', teile, bekannt: !!text };
  }
  // Gefahrnummer + UN-Nummer als Warntafel gültig? (nach ADR Tabelle A, wenn die Daten vorliegen)
  function tafelPasst(kemler, un) {
    const e = unEintraege(un);
    if (!e.length || !kemler) return null;
    const k = String(kemler).toUpperCase().replace(/\s/g, '');
    return e.some(x => x.gefahrnummer && x.gefahrnummer.toUpperCase() === k);
  }

  // ------------------------------------------------------------------ UN-Nummern
  const unNorm = un => { const m = /(\d{4})/.exec(String(un || '')); return m ? m[1] : ''; };
  // → [{ name, klasse, gefahrnummer }] (deutsche Benennung nach ADR, sonst leer)
  function unEintraege(un) {
    const u = unNorm(un);
    return ((D.un && D.un[u]) || []).map(([name, klasse, gefahrnummer]) => ({ name, klasse: klasse || '', gefahrnummer: gefahrnummer || '' }));
  }
  // Suche in den Benennungen (offline): „chlor“ → [{ un, name, klasse, gefahrnummer }]
  function unSuchen(text, max = 30) {
    const q = String(text || '').trim().toLowerCase();
    if (q.length < 3 || !D.un) return [];
    const aus = [];
    for (const [un, l] of Object.entries(D.un)) for (const [name, klasse, g] of l) {
      const n = String(name).toLowerCase(), pos = n.indexOf(q);
      if (pos >= 0) aus.push({ un, name, klasse: klasse || '', gefahrnummer: g || '', rang: (pos === 0 ? 0 : 1) * 1000 + n.length });
    }
    return aus.sort((a, b) => a.rang - b.rang).slice(0, max).map(({ rang, ...x }) => x);
  }

  // ------------------------------------------------------------------ ERG 2024: Leitfäden und Abstände
  // Werte mit „+“ (z. B. „11.0+“ km) stehen als { km: 11, plus: true }
  const abst = w => w ? { absperren_m: w[0], tag_km: w[1], nacht_km: w[2], tag_plus: !!w[3], nacht_plus: !!w[4] } : null;
  // → { un, leitfaeden: [{ nr, name, tih, polymer, nurWasser, titel, absperren_m, absperren_fest_m, gross_m, grossRichtung, grossText, brand_m, brandText, tabelle1 }],
  //     tih: [{ name, wasser, land, klein, gross, tabelle3 }], wasser: [{ name, gase }], tabelle3 }
  function erg(un) {
    const u = unNorm(un);
    const gesehen = new Set(), leitfaeden = [];
    for (const [nr, name, tih, polymer, nurWasser] of (D.ergUn && D.ergUn[u]) || []) {
      const key = nr + '|' + name;
      if (gesehen.has(key)) continue;
      gesehen.add(key);
      const l = (D.ergLf && D.ergLf[nr]) || [];
      leitfaeden.push({ nr, name, tih: !!tih, polymer: !!polymer, nurWasser: !!nurWasser, titel: l[0] || '', absperren_m: l[1] ?? null, absperren_fest_m: l[2] ?? null,
        gross_m: l[3] ?? null, grossRichtung: l[4] || '', grossText: l[5] || '', brand_m: l[6] ?? null, brandText: l[7] || '', tabelle1: !!l[8] });
    }
    const tih = ((D.tih && D.tih[u]) || []).map(([name, wasser, land, klein, gross, t3]) => ({ name, wasser: !!wasser, land: !!land, klein: abst(klein), gross: abst(gross), tabelle3: !!t3 }));
    const wasser = ((D.wasser && D.wasser[u]) || []).map(([name, gase]) => ({ name, gase }));
    const t3 = D.t3 && D.t3[u] ? { name: D.t3[u].name, behaelter: D.t3[u].behaelter.map(([art, absperren_m, tag, nacht]) => ({ art, absperren_m,
      tag: tag.map(([km, plus]) => ({ km, plus: !!plus })), nacht: nacht.map(([km, plus]) => ({ km, plus: !!plus })) })) } : null;
    return { un: u, leitfaeden, tih, wasser, tabelle3: t3 };
  }

  // Empfehlung für die ersten Minuten nach ERG für eine UN-Nummer:
  // → { un, absperren_m, absperren_fest_m, schutz: { klein, gross, tabelle3 } | null, gross_m, grossRichtung, brand_m, brandText, leitfaeden, tih, wasser, tabelle3, hinweise[] }
  function absperrung(un) {
    const e = erg(un);
    const lf = e.leitfaeden, hinweise = [];
    const zahlen = l => l.filter(x => typeof x === 'number' && x > 0);
    // Tabelle 1: Zeilen für Austritte an Land (nicht „in Wasser“); gibt es nur „in Wasser“, gilt sie nur dafür
    const land = e.tih.filter(t => !t.wasser), inWasser = e.tih.filter(t => t.wasser);
    const groesste = (l, k) => l.map(t => t[k]).filter(Boolean).reduce((a, b) => (!a || b.absperren_m > a.absperren_m ? b : a), null);
    const schutz = land.length ? { klein: groesste(land, 'klein'), gross: groesste(land, 'gross'), tabelle3: land.some(t => t.tabelle3) } : null;
    const schutzWasser = inWasser.length ? { klein: groesste(inWasser, 'klein'), gross: groesste(inWasser, 'gross') } : null;
    const absperren_m = Math.max(0, ...zahlen(lf.map(x => x.absperren_m)), ...(schutz && schutz.klein ? [schutz.klein.absperren_m] : [])) || null;
    const fest = zahlen(lf.map(x => x.absperren_fest_m));
    const gross = lf.filter(x => x.gross_m).sort((a, b) => b.gross_m - a.gross_m)[0] || null;
    const brand = lf.filter(x => x.brand_m).sort((a, b) => b.brand_m - a.brand_m)[0] || null;
    if (lf.some(x => x.polymer)) hinweise.push('Kann gefährlich polymerisieren (ERG-Leitfaden mit „P“).');
    if (e.wasser.length) hinweise.push('Bildet mit Wasser giftige Gase: ' + [...new Set(e.wasser.map(w => w.gase).filter(Boolean))].join(', ') + '.');
    if (!schutz && schutzWasser) hinweise.push('Nur beim Austritt in ein Gewässer giftig beim Einatmen (ERG Tabelle 1, „in Wasser“) – Abstände unten.');
    return { un: e.un, absperren_m, absperren_fest_m: fest.length ? Math.max(...fest) : null, schutz, schutzWasser,
      gross_m: gross ? gross.gross_m : null, grossRichtung: gross ? gross.grossRichtung : '', grossText: gross ? gross.grossText : '',
      brand_m: brand ? brand.brand_m : null, brandText: brand ? brand.brandText : '',
      leitfaeden: lf, tih: e.tih, wasser: e.wasser, tabelle3: e.tabelle3, hinweise };
  }
  // Windklasse der ERG-Tabelle 3: 0 schwach (< 10 km/h), 1 mäßig (10–20), 2 stark (> 20)
  const windklasse = kmh => kmh === null || kmh === undefined ? null : kmh < 10 ? 0 : kmh <= 20 ? 1 : 2;
  // Tag oder Nacht (ERG: „Nacht“ = zwischen Sonnenuntergang und Sonnenaufgang) – Sonnenstand nach NOAA, genau genug für ±5 min
  function istNacht(lat, lon, d = new Date()) {
    const rad = Math.PI / 180, tag = Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 0))) / 864e5);
    const g = 2 * Math.PI / 365 * (tag - 1 + (d.getUTCHours() - 12) / 24);
    const gl = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dek = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = Math.acos(Math.min(1, Math.max(-1, Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(dek)) - Math.tan(lat * rad) * Math.tan(dek)))) / rad;
    const mittag = 720 - 4 * lon - gl, auf = mittag - 4 * ha, unter = mittag + 4 * ha;      // Minuten nach Mitternacht (UTC)
    const jetzt = d.getUTCHours() * 60 + d.getUTCMinutes();
    return jetzt < auf || jetzt > unter;
  }

  // Regelwerk für die Bereiche: Grundlage ist das Gefahrstoffkonzept Rheinland-Pfalz; die FwDV 500 gilt nur nach Freigabe
  // (zentral umschaltbar in der App, lage.js). → [{ titel, text, quelle }]
  const fwdv500 = () => Array.isArray(D.fwdv500) ? D.fwdv500 : [];
  const rlp = () => Array.isArray(D.rlp) ? D.rlp : [];
  const GRUNDLAGEN = {
    rlp: { name: 'Gefahrstoffkonzept RLP', lang: 'Gefahrstoffkonzept Rheinland-Pfalz', gefahrenbereich_m: 50, absperrbereich_m: null,
      gefahrText: 'zunächst 50 m im Umkreis, solange kein näheres Erkundungsergebnis vorliegt', absperrText: 'ausreichend Bewegungsfläche für nachrückende Kräfte (keine feste Meterzahl)' },
    fwdv500: { name: 'FwDV 500', lang: 'FwDV 500 (2022)', gefahrenbereich_m: 50, absperrbereich_m: 100,
      gefahrText: 'kürzester Abstand ca. 50 m', absperrText: 'kürzester Abstand ca. 100 m' },
  };
  const regeln = grundlage => grundlage === 'fwdv500' ? fwdv500() : rlp();

  // ------------------------------------------------------------------ Warntafel aus erkanntem Text
  // OCR-Text (zwei Zeilen) bzw. Eingabe → { kemler, un } – oben 2–3 Ziffern (ggf. mit X), unten 4 Ziffern
  function warntafelText(text) {
    const t = String(text || '').toUpperCase().replace(/[OQD]/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
    const zeilen = t.split(/\n+/).map(z => z.replace(/[^0-9X]/g, '')).filter(Boolean);
    let kemler = '', un = '';
    for (const z of zeilen) {
      if (!un && /^\d{4}$/.test(z)) { un = z; continue; }
      if (!kemler && /^X?\d{2,3}$/.test(z)) { kemler = z; continue; }
    }
    if (!un || !kemler) {
      const alle = t.replace(/[^0-9X]+/g, ' ').trim().split(' ').filter(Boolean);
      if (!un) un = alle.find(z => /^\d{4}$/.test(z)) || '';
      if (!kemler) kemler = alle.find(z => /^X?\d{2,3}$/.test(z)) || '';
    }
    return { kemler, un };
  }

  // ------------------------------------------------------------------ Wind
  const RICHTUNG = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const RICHTUNG_LANG = { N: 'Nord', NNO: 'Nordnordost', NO: 'Nordost', ONO: 'Ostnordost', O: 'Ost', OSO: 'Ostsüdost', SO: 'Südost', SSO: 'Südsüdost',
    S: 'Süd', SSW: 'Südsüdwest', SW: 'Südwest', WSW: 'Westsüdwest', W: 'West', WNW: 'Westnordwest', NW: 'Nordwest', NNW: 'Nordnordwest' };
  const grad360 = g => ((Number(g) % 360) + 360) % 360;
  const himmelsrichtung = g => RICHTUNG[Math.round(grad360(g) / 22.5) % 16];
  // Wind kommt aus g° → zieht nach (g + 180)°
  const ausbreitungsrichtung = g => grad360(Number(g) + 180);
  // Windstärke nach Beaufort aus km/h
  function beaufort(kmh) {
    const G = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
    const b = G.findIndex(x => kmh < x);
    return b < 0 ? 12 : b;
  }

  // ------------------------------------------------------------------ Ausbreitung: Keule („Ausbreitungsolive“) in Zugrichtung
  // Grundlage: Stufenmodell der vfdb-Richtlinie 10/05 (HLFS, Lernunterlage „Schadstoffausbreitung“). Stufe 2 legt eine Keule
  // in Zugrichtung; solange nicht bekannt ist, welcher Stoff in welcher Menge austritt, mit 90° Öffnungswinkel (nach MET 60°
  // bzw. 45°). Bei Windstille oder umlaufendem Wind ein Kreis von 500 m bis 1000 m um die Austrittsstelle. Die Wolkenfront
  // zieht etwa mit der Windgeschwindigkeit: nach t Minuten höchstens v · t weit (Annahme: der Wind bleibt gleich).
  const AUSBREITUNG = { winkel: [90, 60, 45], minuten: [5, 10, 15, 30, 60], still_kmh: 1, schwach_kmh: 3.6, still_m: 500, still_bis_m: 1000 };
  function ausbreitung(kmh, minuten) {
    if (kmh === null || kmh === undefined || kmh === '') return null;
    const v = Number(kmh), t = Number(minuten);
    if (!isFinite(v) || v < 0 || !isFinite(t) || t <= 0) return null;
    return { still: v < AUSBREITUNG.still_kmh, schwach: v < AUSBREITUNG.schwach_kmh, laenge_m: Math.round(v / 3.6 * 60 * t) };
  }
  // Umriss der Olive in Polarkoordinaten um die Austrittsstelle: grad = Abweichung von der Zugrichtung, anteil = Anteil der
  // Länge. Spitz an der Austrittsstelle (dort genau der Öffnungswinkel), vorne gerundet; beginnt und endet an der Austrittsstelle.
  function olivenForm(winkel = 90, n = 36, rund = 0.22) {
    const w = Math.min(170, Math.max(10, Number(winkel) || 90)), aus = [];
    for (let i = 0; i <= n; i++) {
      const g = -w / 2 + w * i / n, c = Math.cos(g / w * Math.PI);
      aus.push({ grad: g, anteil: i === 0 || i === n ? 0 : Math.pow(Math.max(0, c), rund) });
    }
    return aus;
  }
  // Dreht der Wind laut Vorhersage innerhalb der nächsten Minuten um mehr als grenze Grad? → erster solcher Eintrag oder null
  function windDreht(vorhersage, vonGrad, minuten, jetzt = Date.now(), grenze = 45) {
    const bis = jetzt + Math.max(60, Number(minuten) || 0) * 60e3;
    for (const v of vorhersage || []) {
      const t = Date.parse(v.zeit);
      if (!(t > jetzt) || t > bis || v.richtung === null || v.richtung === undefined) continue;
      const d = Math.abs(((Number(v.richtung) - Number(vonGrad)) % 360 + 540) % 360 - 180);
      if (d > grenze) return { ...v, um: Math.round(d) };
    }
    return null;
  }

  // ------------------------------------------------------------------ Anfahrt: Koordinaten, Peilung, Prüfung der Route
  // Koordinaten aus einer Eingabe bzw. einem Link lesen: „50.2263, 7.8317“, „50,2263 7,8317“, „N 50° 13.578' E 7° 49.902'“,
  // „50°13'34.7"N 7°49'54.1"E“, Links von Google Maps (…/@50.22,7.83,17z, ?q=50.22,7.83, destination=…), Apple Karten (ll=, q=, daddr=)
  // und „geo:50.22,7.83“ → { lat, lon } oder null. Nur plausible Werte (Breite ±90, Länge ±180).
  function koordinatenLesen(eingabe) {
    const t = String(eingabe || '').trim();
    if (!t) return null;
    const ok = (lat, lon) => isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0)
      ? { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 } : null;
    const zahl = x => Number(String(x).replace(',', '.'));
    // Links und geo:-Adressen
    let m = /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(t) ||
      /[?&](?:q|ll|query|destination|daddr|sll|center)=(?:loc:)?(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i.exec(t) ||
      /^geo:(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/i.exec(t);
    if (m) return ok(zahl(m[1]), zahl(m[2]));
    if (/^https?:\/\//i.test(t)) return null;
    // Grad, Minuten, Sekunden mit Himmelsrichtung (vor oder hinter der Zahl)
    const teil = '([NSOEW])?\\s*(\\d{1,3}(?:[.,]\\d+)?)\\s*°\\s*(?:(\\d{1,2}(?:[.,]\\d+)?)\\s*[\'′’]\\s*)?(?:(\\d{1,2}(?:[.,]\\d+)?)\\s*(?:"|″|”|\'\')\\s*)?([NSOEW])?';
    m = new RegExp('^\\s*' + teil + '[\\s,;/]*' + teil + '\\s*$', 'i').exec(t);
    if (m) {
      // steht vor beiden Zahlen ein Buchstabe, gehört der Buchstabe hinter der ersten Zahl (m[5]) schon zur zweiten
      const wert = (h, g, mi, se) => { const v = zahl(g) + (mi ? zahl(mi) / 60 : 0) + (se ? zahl(se) / 3600 : 0); h = String(h || '').toUpperCase(); return { v: /[SW]/.test(h) ? -v : v, h }; };
      const a = wert(m[1] || m[5], m[2], m[3], m[4]), b = wert(m[6] || m[10] || (m[1] && m[5] ? m[5] : ''), m[7], m[8], m[9]);
      if (/[OEW]/.test(a.h) || /[NS]/.test(b.h)) return ok(b.v, a.v);
      return ok(a.v, b.v);
    }
    // zwei Dezimalzahlen: „50.2263, 7.8317“ bzw. „50,2263 7,8317“ bzw. „50.2263 7.8317“
    m = /^\s*(-?\d{1,2}[.,]\d{3,})\s*[,;\s/]\s*(-?\d{1,3}[.,]\d{3,})\s*$/.exec(t);
    if (m) return ok(zahl(m[1]), zahl(m[2]));
    return null;
  }
  const RAD = Math.PI / 180;
  // Entfernung in Metern (Haversine) und Peilung in Grad (0 = Nord) von a nach b
  function abstandM(a, b) {
    const R = 6371008.8, dp = (b.lat - a.lat) * RAD, dl = (b.lon - a.lon) * RAD;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function peilung(a, b) {
    const y = Math.sin((b.lon - a.lon) * RAD) * Math.cos(b.lat * RAD);
    const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lon - a.lon) * RAD);
    return grad360(Math.atan2(y, x) / RAD);
  }
  const winkelDiff = (a, b) => Math.abs(((Number(a) - Number(b)) % 360 + 540) % 360 - 180);

  // Abstände für die Anfahrt. Absperrgrenze = Grenze des Gefahrenbereichs, bis zu der man heranfährt: der größte Wert aus
  // Gefahrenbereich der Grundlage (RLP bzw. FwDV 500: 50 m), ERG-Erstabsperrung, den stoffabhängigen Abständen der
  // ABC-Taschenkarte RLP (LFV RLP, Stand März 2023, „Zusätzliche Hinweise FwDV 500“: Klasse 1.1/1.2/1.3/1.5/1.6 Gefahrenbereich
  // 500 m und Absperrbereich 1 000 m; Gase in Tank- bzw. Kesselwagen oder Industrietanks 300 m und 1 000 m; entzündbare
  // Flüssigkeiten in Tanks 50 m und 300 m) und – bei Brand bzw. Explosionsgefahr – dem ERG-Wert für den Brand eines Tanks,
  // ohne solchen Wert den Explosionsabständen der FwDV 500 (Gefahrenbereich mindestens 500 m, Absperrbereich 1 000 m).
  // → { grenze_m, grund, absperr_m, absperrGrund, gefahr_m, erg_m, brand_m, schutz_m, schutzNacht, klasse: { k1, k2, k3 }, hinweise[] }
  const TASCHENKARTE = 'ABC-Taschenkarte RLP 2023';
  function anfahrtAbstaende(un, { grundlage = 'rlp', nacht = false, brand = false, tank = false } = {}) {
    const gl = GRUNDLAGEN[grundlage] || GRUNDLAGEN.rlp, a = un ? absperrung(un) : null;
    const klassen = un ? unEintraege(un).map(e => String(e.klasse || '')) : [];
    const k1 = klassen.some(k => /^1\.[12356]/.test(k)), k2 = klassen.some(k => /^2(\.|\b|$)/.test(k)), k3 = klassen.some(k => /^3(\.|\b|$)/.test(k));
    const erg_m = a && a.absperren_m ? a.absperren_m : null;
    const s = a && a.schutz && a.schutz.klein ? a.schutz.klein : null;
    const schutz_m = s ? Math.round((nacht ? s.nacht_km : s.tag_km) * 1000) : a && a.gross_m ? a.gross_m : null;
    const brand_m = a && a.brand_m ? a.brand_m : null;
    let grenze_m = gl.gefahrenbereich_m, grund = `Gefahrenbereich (${gl.name})`, absperr_m = gl.absperrbereich_m || null, absperrGrund = absperr_m ? gl.name : '';
    const hoeher = (m, text) => { if (m && m > grenze_m) { grenze_m = m; grund = text; } };
    const aussen = (m, text) => { if (m && m > (absperr_m || 0)) { absperr_m = m; absperrGrund = text; } };
    hoeher(erg_m, `ERG-Erstabsperrung für UN ${a && a.un}`);
    if (k1) { hoeher(500, `Explosivstoff Klasse 1 (${TASCHENKARTE})`); aussen(1000, TASCHENKARTE); }
    if (tank && k2) { hoeher(300, `Gas im Tank- bzw. Kesselwagen oder Industrietank (${TASCHENKARTE})`); aussen(1000, TASCHENKARTE); }
    if (tank && k3) aussen(300, TASCHENKARTE);
    if (brand) {
      if (brand_m) hoeher(brand_m, `ERG: Brand eines Tanks, UN ${a.un}`);
      else { hoeher(500, 'Explosions- oder Zerknallgefahr (FwDV 500: mindestens 500 m)'); aussen(1000, 'FwDV 500'); }
    }
    if (absperr_m && absperr_m <= grenze_m) { absperr_m = null; absperrGrund = ''; }
    return { grenze_m, grund, absperr_m, absperrGrund, gefahr_m: gl.gefahrenbereich_m, erg_m, brand_m, schutz_m, schutzNacht: nacht,
      klasse: { k1, k2, k3 }, hinweise: a ? a.hinweise : [] };
  }

  // Route des Routendienstes gegen Wind und Bereiche prüfen.
  // route: [{ lat, lon }] vom Start bis zur Einsatzstelle; ort: Einsatzstelle; vonGrad: Wind kommt aus (null = unbekannt/Windstille);
  // grenze_m: Absperrgrenze; zone: { laenge_m, winkel } Bereich in Windrichtung (Keule ab der Einsatzstelle).
  // → { ankunftGrad, abweichung, bewertung: 'gut' | 'seitlich' | 'gegen' | null, imWindM, kritisch: [[pkte]], durchGefahr, rest_m }
  function routePruefen(route, ort, { vonGrad = null, grenze_m = 50, zone = { laenge_m: 1000, winkel: 90 } } = {}) {
    const leer = { ankunftGrad: null, abweichung: null, bewertung: null, imWindM: 0, kritisch: [], durchGefahr: false, rest_m: null };
    if (!Array.isArray(route) || route.length < 2 || !ort) return leer;
    // dichter abtasten (höchstens 20 m je Schritt), damit kurze Abschnitte in der Keule nicht durchrutschen
    const pk = [route[0]];
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], d = abstandM(a, b), n = Math.min(400, Math.ceil(d / 20));
      for (let k = 1; k <= n; k++) pk.push({ lat: a.lat + (b.lat - a.lat) * k / n, lon: a.lon + (b.lon - a.lon) * k / n });
    }
    const dist = pk.map(p => abstandM(ort, p));
    const rest_m = dist[dist.length - 1];
    // Ankunft: letzter Eintritt in den Kreis um die Einsatzstelle (doppelte Absperrgrenze, mindestens 250 m)
    const rAn = Math.max(2 * grenze_m, 250);
    let ein = -1;
    for (let i = pk.length - 1; i > 0; i--) if (dist[i] <= rAn && dist[i - 1] > rAn) { ein = i; break; }
    const ankunftGrad = ein > 0 ? peilung(ort, pk[ein]) : (dist[0] > grenze_m ? peilung(ort, pk[0]) : null);
    // durch den Gefahrenbereich hindurch (hinein und wieder hinaus, bevor die Route endet)?
    let drin = false, durchGefahr = false;
    for (let i = 0; i < pk.length; i++) { if (dist[i] <= grenze_m) drin = true; else if (drin) { durchGefahr = true; break; } }
    let imWindM = 0, kritisch = [], lauf = null;
    const zug = vonGrad === null || vonGrad === undefined ? null : ausbreitungsrichtung(vonGrad);
    if (zug !== null && zone && zone.laenge_m > 0) {
      const halb = (zone.winkel || 90) / 2;
      const inZone = i => dist[i] > grenze_m && dist[i] <= zone.laenge_m && winkelDiff(peilung(ort, pk[i]), zug) <= halb;
      for (let i = 0; i < pk.length; i++) {
        if (inZone(i)) { if (!lauf) { lauf = i > 0 ? [pk[i - 1]] : []; kritisch.push(lauf); } lauf.push(pk[i]); if (i > 0 && inZone(i - 1)) imWindM += abstandM(pk[i - 1], pk[i]); }
        else if (lauf) { lauf.push(pk[i]); lauf = null; }
      }
      kritisch = kritisch.filter(t => t.length > 1);
    }
    const abweichung = ankunftGrad !== null && vonGrad !== null && vonGrad !== undefined ? Math.round(winkelDiff(ankunftGrad, vonGrad)) : null;
    const bewertung = abweichung === null ? null : abweichung <= 45 ? 'gut' : abweichung <= 100 ? 'seitlich' : 'gegen';
    return { ankunftGrad, abweichung, bewertung, imWindM: Math.round(imWindM), kritisch, durchGefahr, rest_m: Math.round(rest_m) };
  }

  return { gefahrnummer, tafelPasst, unEintraege, unSuchen, erg, absperrung, windklasse, istNacht, fwdv500, rlp, regeln, GRUNDLAGEN, warntafelText,
    koordinatenLesen, abstandM, peilung, winkelDiff, anfahrtAbstaende, routePruefen,
    himmelsrichtung, ausbreitungsrichtung, beaufort, RICHTUNG_LANG, AUSBREITUNG, ausbreitung, olivenForm, windDreht,
    quellen: D.quellen || {}, hatDaten: () => !!(D.un || D.ergUn) };
});
