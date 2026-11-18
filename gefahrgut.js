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

  // Wind aus den Komponenten u (von West nach Ost) und v (von Süd nach Nord) in m/s → { richtung: woher in Grad, ms }
  function windAusUV(u, v) {
    u = Number(u); v = Number(v);
    if (!isFinite(u) || !isFinite(v)) return { richtung: NaN, ms: NaN };
    return { richtung: grad360(270 - Math.atan2(v, u) * 180 / Math.PI), ms: Math.hypot(u, v) };
  }
  // Antwort der Windy Point Forecast API (v2) → Wind jetzt (zwischen den Vorhersagezeiten über u/v gemittelt) und die nächsten
  // Stunden. Mit Testschlüssel liefert Windy absichtlich vertauschte Daten und sagt das in „warning“ → test: true.
  function windyAuswerten(j, jetzt = Date.now()) {
    const ts = (j && Array.isArray(j.ts)) ? j.ts.map(Number) : [];
    const U = (j && j['wind_u-surface']) || [], V = (j && j['wind_v-surface']) || [], G = (j && j['gust-surface']) || [];
    const wert = (A, k) => (A[k] === null || A[k] === undefined || !isFinite(Number(A[k])) ? null : Number(A[k]));
    if (!ts.length) throw new Error('Windy liefert keine Daten für diesen Ort.');
    const b = ts.findIndex(t => t > jetzt);
    let u, v, g, zeit;
    if (b <= 0) { const k = b < 0 ? ts.length - 1 : 0; u = wert(U, k); v = wert(V, k); g = wert(G, k); zeit = ts[k]; }
    else {
      const a = b - 1, f = (jetzt - ts[a]) / (ts[b] - ts[a]);
      const mix = A => { const x = wert(A, a), y = wert(A, b); return x === null || y === null ? (x ?? y) : x + (y - x) * f; };
      u = mix(U); v = mix(V); g = mix(G); zeit = jetzt;
    }
    if (u === null || v === null) throw new Error('Windy liefert für diesen Ort keinen Wind.');
    const w = windAusUV(u, v), r1 = x => Math.round(x * 10) / 10;
    const vorhersage = ts.map((t, k) => ({ t, k })).filter(x => x.t > jetzt).slice(0, 6)
      .map(({ t, k }) => { const x = windAusUV(wert(U, k), wert(V, k)); return { zeit: new Date(t).toISOString(), richtung: Math.round(x.richtung), kmh: r1(x.ms * 3.6) }; })
      .filter(x => isFinite(x.richtung) && isFinite(x.kmh));
    return { richtung: Math.round(w.richtung), kmh: r1(w.ms * 3.6), boeen: g === null ? null : r1(g * 3.6), zeit: new Date(zeit).toISOString(), vorhersage,
      test: !!(j && j.warning), warnung: (j && j.warning) || '' };
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

  return { gefahrnummer, tafelPasst, unEintraege, unSuchen, erg, absperrung, windklasse, istNacht, fwdv500, rlp, regeln, GRUNDLAGEN, warntafelText,
    himmelsrichtung, ausbreitungsrichtung, beaufort, RICHTUNG_LANG, windAusUV, windyAuswerten, AUSBREITUNG, ausbreitung, olivenForm, windDreht,
    quellen: D.quellen || {}, hatDaten: () => !!(D.un || D.ergUn) };
});
