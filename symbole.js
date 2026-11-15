// Gefahrensymbole als SVG für die Einsatz-App: GHS-Piktogramme nach CLP, ADR-Gefahrzettel samt Kennzeichen für
// umweltgefährdende Stoffe und die orangefarbene Warntafel – ohne Abhängigkeiten.
// Jede Funktion liefert SVG-Text ohne externe Verweise, ohne Skripte und ohne IDs; die Symbole lassen sich daher beliebig
// oft auf einer Seite einsetzen (innerHTML, data:-URL, Datei). Feste Farben, damit sie im hellen und im dunklen Modus
// gleich aussehen.
// Raster: viewBox 0 0 100 100 (Rauten), Warntafel 0 0 400 300 (Millimeter). Vorlagen: CLP Anhang V, ADR 5.2.2.2
// (Gefahrzettel), 5.2.1.8 (umweltgefährdend) und 5.3.2.2 (Warntafel) – leicht vereinfacht, mit etwas kräftigeren Linien
// und größerer Klassennummer, damit die Symbole auch bei 36–48 px klar erkennbar bleiben.
// Läuft im Browser (window.GSZSymbole) und in Node (require).
'use strict';
(function (wurzel, fabrik) {
  const m = fabrik();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZSymbole = m;
})(typeof self !== 'undefined' ? self : this, function () {
  // ------------------------------------------------------------------ Farben und Schrift (fest, nicht über CSS)
  const FARBEN = {
    rot: '#e3000f', orange: '#f07d00', gruen: '#00873e', blau: '#2f6eb5', gelb: '#ffe500',
    schwarz: '#161616', weiss: '#ffffff',
    kante: '#8c8c8c',                                   // dünne Außenkante weißer Zettel (sonst auf Weiß unsichtbar)
    tafel: '#ec7c26',                                   // Warntafel, RAL 2011 Tieforange
    ersatzGrund: '#eceef1', ersatzRand: '#8b929c', ersatzText: '#4b525c',
  };
  const F = FARBEN;
  const SCHRIFT = 'Arial, Helvetica, sans-serif';
  const SCHRIFT_TAFEL = 'DIN Alternate, Bahnschrift, Arial, Helvetica, sans-serif';   // DIN-ähnlich wie auf echten Tafeln

  // ------------------------------------------------------------------ Hilfen
  const r2 = n => Math.round(n * 100) / 100;
  const P = (x, y) => r2(x) + ',' + r2(y);
  const leer = v => v === null || v === undefined;
  // Text für XML: Sonderzeichen maskieren, in XML unzulässige Steuerzeichen entfernen
  function esc(t) {
    return String(leer(t) ? '' : t).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
      .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  const raute = (r, cx = 50, cy = 50) => `M${P(cx, cy - r)}L${P(cx + r, cy)}L${P(cx, cy + r)}L${P(cx - r, cy)}Z`;
  const kreis = (cx, cy, r) => `M${P(cx - r, cy)}a${r2(r)},${r2(r)} 0 1,0 ${r2(2 * r)},0a${r2(r)},${r2(r)} 0 1,0 ${r2(-2 * r)},0Z`;
  // Punkt im Abstand r unter dem Winkel w (Grad; 0 = rechts, positiv im Uhrzeigersinn wie in SVG)
  const polar = (cx, cy, r, w) => [cx + r * Math.cos(w * Math.PI / 180), cy + r * Math.sin(w * Math.PI / 180)];
  const vieleck = punkte => 'M' + punkte.map(p => P(p[0], p[1])).join('L') + 'Z';
  function stern(cx, cy, ra, ri, n, start = -90) {
    const p = [];
    for (let i = 0; i < 2 * n; i++) p.push(polar(cx, cy, i % 2 ? ri : ra, start + i * 180 / n));
    return vieleck(p);
  }
  const pfad = (d, farbe, extra = '') => `<path d="${d}" fill="${farbe}"${extra}/>`;
  const strich = (d, farbe, breite, extra = '') => `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${breite}"${extra}/>`;
  const RUND = ' stroke-linecap="round" stroke-linejoin="round"';
  const text = (t, x, y, groesse, farbe, extra = '') => `<text x="${r2(x)}" y="${r2(y)}" font-family="${SCHRIFT}" ` +
    `font-weight="700" font-size="${r2(groesse)}" fill="${farbe}" text-anchor="middle"${extra}>${esc(t)}</text>`;
  // Inhalt aus dem 100er-Kasten mit Maßstab s so setzen, dass dessen Mitte (50/50) auf (cx, cy) liegt
  const setze = (inhalt, cx, cy, s) => `<g transform="translate(${r2(cx - 50 * s)} ${r2(cy - 50 * s)}) scale(${s})">${inhalt}</g>`;
  const zahl = (v, standard) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : standard; };
  const titelOder = (titel, standard) => (!leer(titel) && String(titel).trim()) ? String(titel) : standard;
  function kopf(breite, hoehe, viewBox, titel, klasse) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${r2(breite)}" height="${r2(hoehe)}" ` +
      `role="img" aria-label="${esc(titel)}" class="${klasse}"><title>${esc(titel)}</title>`;
  }

  // ------------------------------------------------------------------ Symbole im 100er-Kasten
  // f = Farbe des Symbols, g = Grundfarbe (für Aussparungen, die den Untergrund zeigen sollen)
  const FLAMME = 'M50,1C54,9 60,17 60,29C62,23 65,18 69,13C74,21 77,31 75,40C78,36 82,34 85,31C89,41 89.5,50 87,59' +
    'C83.5,76 69,86 50,86C31,86 16.5,76 13,59C10.5,50 11,42 16,34C19,37 22,39 25,42C24,32 27,22 31,16C35,22 39,26 40,31' +
    'C40,18 45,8 50,1Z';
  const FLAMME_INNEN = 'M50,46C52,52 55,56 55.5,61C57.5,59 59.5,57.5 61,55C64.5,60 66.5,66 66,71C65.5,78 59,82.5 50,82.5' +
    'C41,82.5 34.5,78 34,71C33.5,66 35.5,60 39,55C40.5,57.5 42.5,59 44.5,61C45,56 48,52 50,46Z';
  // Flamme über Kreis: Zungen um die obere Hälfte des Rings, unten verdeckt der Ring die Flamme
  const FLAMME_KREIS = 'M50,2C54,10 59.5,17 59.5,27C61.5,22 65,17 68.5,12C72.5,20 75,28 74,35C77,32 80.5,30 83.5,27.5' +
    'C87,38 87,51 82,61C79,66 74,69.5 67.5,70L32.5,70C26,69.5 21,66 18,61C13,51 13,38 16.5,27.5C19.5,30 23,32 26,35' +
    'C25,28 27.5,20 31.5,12C35,17 38.5,22 40.5,27C40.5,17 46,10 50,2Z';
  const FLAMME_KREIS_INNEN = 'M50,31C52.5,36.5 56,40 56,44C56,47 53.5,48.5 50,48.5C46.5,48.5 44,47 44,44C44,40 47.5,36.5 50,31Z' +
    'M31,40C32.8,43.5 35,46 35,49C35,51.2 33.4,52.5 31.5,52.5C29.6,52.5 28.2,51.2 28.2,49C28.2,46 30,43.5 31,40Z' +
    'M69,40C70,43.5 71.8,46 71.8,49C71.8,51.2 70.4,52.5 68.5,52.5C66.6,52.5 65,51.2 65,49C65,46 67.2,43.5 69,40Z';
  const GASFLASCHE = 'M16.5,41.5H67C71.5,41.5 75,43 76.5,45.5H79V44H85C86.5,44 87.5,45 87.5,46.5H91V53.5H87.5' +
    'C87.5,55 86.5,56 85,56H79V54.5H76.5C75,57 71.5,58.5 67,58.5H16.5A8.5,8.5 0 0 1 16.5,41.5Z';
  const SCHAEDEL = 'M50,9C64.5,9 76,19.5 76,34C76,43.5 71.5,50 65,53.5L64.5,62C64.5,67.5 60.5,71.5 55,71.5H45' +
    'C39.5,71.5 35.5,67.5 35.5,62L35,53.5C28.5,50 24,43.5 24,34C24,19.5 35.5,9 50,9Z';
  const SCHAEDEL_INNEN = 'M33,37C33,32.5 36.5,30 40.5,30C44.5,30 48,32.5 48,37C48,41 44.5,43.5 40.5,43.5C36.5,43.5 33,41 33,37Z' +
    'M52,37C52,32.5 55.5,30 59.5,30C63.5,30 67,32.5 67,37C67,41 63.5,43.5 59.5,43.5C55.5,43.5 52,41 52,37Z' +
    'M50,45.5C52.5,48.5 54.5,51.5 53.5,53C52.5,54 47.5,54 46.5,53C45.5,51.5 47.5,48.5 50,45.5Z';
  const SILHOUETTE = 'M51,5C62.5,5 71,13.5 71,25C71,32 68,37.5 63.5,41L64,47C73,50.5 84,53.5 89,60C91.5,63.5 92.5,68 93,72' +
    'L95,97H6L8,73C8.5,66 10,61.5 14,58.5C21,53 31,51 39,49.5L40.5,44C37.5,43 35.5,41 35.5,38L33.5,34.5L35,33L32.8,31' +
    'L33.8,28.8L30,25.5L33.5,18C34.5,10 42,5 51,5Z';
  const HAND = 'M100,58.5L96.5,58.5C94.5,58.5 93.5,57 92.5,54.5C91.5,52 90,50.5 88,50.5C86,50.5 85.3,52.5 86.1,55' +
    'C86.6,56.6 86.6,58 86,59.5A3,3 0 0 1 80,59.8L64,60C60.5,60 59.5,64 63,64.4C60,64.8 59.6,68.4 63.5,68.6' +
    'C60.7,69 61,72.4 64.3,72.6C62,73 62.6,76.2 65.5,76.2L100,76.5Z';
  const FISCH = 'M0,-7L9,-1.5C17,-10 40,-12 56,-4C59,-2.5 61,-1 62,0.5C60,2.5 57,4 54,5C40,10 18,9 9,1.5L0,7L2.5,0Z';
  const BODEN = 'M2,97L2,94C12,92.5 19,89 23,84C25.5,81 28,79.5 31,79L40,79C43,82 45,86 47,89L84,89L86,86L89,88L91,84.5' +
    'L94,87L96,85L98,97Z';
  const STAMM = 'M24,82C27,76 28.5,66 29,56L29.5,40L28,22L26.5,7L29.5,6.5L31.5,22L33.5,36L35,40L35,56C35.5,66 37,76 41,82Z';
  const AESTE = 'M30.5,44L19,36.5L14,24M19,36.5L8.5,39.5M33,34L44,23L47,10M44,23L56,25.5M31,22L25.5,8';

  // Tropfen (Spitze oben) mit Mittelpunkt der Rundung bei (x, y)
  const tropfen = (x, y, r) => `M${P(x, y - 2.6 * r)}C${P(x + 0.8 * r, y - 1.4 * r)} ${P(x + r, y - 0.6 * r)} ${P(x + r, y)}` +
    `A${r2(r)},${r2(r)} 0 1 1 ${P(x - r, y)}C${P(x - r, y - 0.6 * r)} ${P(x - 0.8 * r, y - 1.4 * r)} ${P(x, y - 2.6 * r)}Z`;
  // Dampf: kleine Wellenlinie nach oben
  const dampf = (x, y) => `M${P(x, y)}c-1.6,-2 1.6,-3.6 0,-6.4`;
  // Reagenzglas: geschlossenes Ende bei (x, y), Öffnung in Richtung w (Grad), vordere Hälfte mit Flüssigkeit
  function reagenzglas(x, y, w, f, g) {
    return `<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(w)})">` + pfad('M4.4,-4.4H30V4.4H4.4A4.4,4.4 0 0 1 4.4,-4.4Z', g) +
      pfad('M16,-4.4H30V4.4H16Z', f) + strich('M30,-4.4H4.4A4.4,4.4 0 0 0 4.4,4.4H30', f, 2.2, RUND) + '</g>';
  }
  // Keil (Strahl der Explosion) vom Mittelpunkt (cx, cy) in Richtung w bis zur Länge l, Grundbreite 2·h
  function keil(cx, cy, w, l, h) {
    const [x0, y0] = polar(cx, cy, 8, w), nx = -Math.sin(w * Math.PI / 180), ny = Math.cos(w * Math.PI / 180);
    return vieleck([[x0 + nx * h, y0 + ny * h], polar(cx, cy, l, w), [x0 - nx * h, y0 - ny * h]]);
  }

  const SYMBOL = {
    flamme: f => pfad(FLAMME + FLAMME_INNEN, f, ' fill-rule="evenodd"') + pfad('M20,91H80V97.5H20Z', f),
    flammeKreis: (f, g) => pfad(FLAMME_KREIS + FLAMME_KREIS_INNEN, f, ' fill-rule="evenodd"') +
      `<circle cx="50" cy="69" r="14.5" fill="${g}" stroke="${f}" stroke-width="6.5"/>` + pfad('M23,91H77V97H23Z', f),
    bombe(f) {
      const cx = 38, cy = 60;
      let strahlen = '', splitter = '';
      for (const [w, l] of [[-97, 40], [-74, 54], [-52, 50], [-31, 60], [-11, 58], [9, 47], [29, 32], [62, 24], [-124, 34],
                            [-150, 30], [177, 34], [152, 28]]) strahlen += keil(cx, cy, w, l, 3.6);
      for (const [w, l, gr] of [[-86, 52, 4], [-41, 62, 4.5], [-2, 56, 4], [20, 52, 3.5], [-136, 42, 4], [162, 35, 3.5],
                                [-111, 50, 3]]) {
        const [x, y] = polar(cx, cy, l, w);
        splitter += vieleck([polar(x, y, gr, w), polar(x, y, gr * 0.75, w + 125), polar(x, y, gr * 0.8, w + 235)]);
      }
      return pfad(strahlen + splitter, f) + `<circle cx="${cx}" cy="${cy}" r="13" fill="${f}"/>`;
    },
    gasflasche: f => pfad(GASFLASCHE, f, ' transform="rotate(-17 50 50)"'),
    aetzend(f, g) {
      return reagenzglas(45, 20, 165, f, g) + reagenzglas(55, 20, 15, f, g) +
        pfad(tropfen(17, 38.5, 1.9) + tropfen(17, 46, 1.9) + tropfen(83, 38.5, 1.9) + tropfen(83, 46, 1.9), f) +
        pfad('M1,60H12.8A4.2,4.2 0 0 0 21.2,60H33V68H1Z', f) +
        strich(dampf(12.5, 57) + dampf(17, 56) + dampf(21.5, 57) + dampf(80, 56) + dampf(84.5, 55.5), f, 1.4, RUND) +
        `<path d="${HAND}" fill="${g}" stroke="${f}" stroke-width="2.2" stroke-linejoin="round"/>` +
        strich('M63,64.4H79M63.5,68.6H78M64.3,72.6H77', f, 1.6, RUND);
    },
    totenkopf(f, g) {
      const o = 3, schaft = 7, knopf = 5.2, knochen = [[12, 50, 88, 86], [88, 50, 12, 86]], enden = [];
      for (const [x1, y1, x2, y2] of knochen) {
        const l = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / l, dy = (y2 - y1) / l;
        for (const [x, y, s] of [[x1, y1, -1], [x2, y2, 1]]) {
          for (const k of [-1, 1]) enden.push([x + s * dx - dy * 4 * k, y + s * dy + dx * 4 * k]);
        }
      }
      const schaefte = knochen.map(([x1, y1, x2, y2]) => `M${P(x1, y1)}L${P(x2, y2)}`).join('');
      const knoepfe = r => enden.map(([x, y]) => kreis(x, y, r)).join('');
      return strich(schaefte, f, schaft + 2 * o) + pfad(knoepfe(knopf + o), f) + strich(schaefte, g, schaft) + pfad(knoepfe(knopf), g) +
        `<path d="${SCHAEDEL}" fill="${f}" stroke="${f}" stroke-width="${2 * o}" stroke-linejoin="round"/>` + pfad(SCHAEDEL, g) +
        pfad(SCHAEDEL_INNEN, f) + strich('M45.5,60V67M50,60V67.5M54.5,60V67', f, 1.8, RUND);
    },
    ausrufezeichen: f => pfad('M50,4C56,4 60.8,8.5 60.4,14.5L56.6,62C56.3,66 53.6,68.5 50,68.5C46.4,68.5 43.7,66 43.4,62' +
      'L39.6,14.5C39.2,8.5 44,4 50,4Z' + kreis(50, 85, 9.5), f),
    gesundheit: (f, g) => pfad(SILHOUETTE, f) + pfad(stern(47, 74, 15.5, 6.5, 8), g),
    umwelt(f, g) {
      return strich('M3,56.5H86', f, 2.2) + pfad(BODEN + STAMM, f) + strich(AESTE, f, 3, RUND) +
        '<g transform="translate(42 88) rotate(-28)">' +
        `<path d="${FISCH}" fill="${g}" stroke="${f}" stroke-width="2.4" stroke-linejoin="round"/>` +
        pfad(kreis(53, -1, 1.9), f) + strich('M46,-6C48.5,-2 48.5,2 46,5.5', f, 1.6, RUND) + '</g>';
    },
    biogefahr(f, g) {
      // Aufbau nach dem üblichen Konstruktionsraster (Einheit u): große Kreise r = 15u im Abstand 11u, Aussparungen
      // r = 10,5u im Abstand 16u, Ring 3,5u breit mit 1u Abstand zu den Sicheln, Loch und Schlitze in der Mitte
      const u = 1.75, cx = 50, cy = 54, R = 15 * u, r = 10.5 * u, e = 11 * u, i = 16 * u;
      const t = ((R * R - r * r) / (i - e) + e + i) / 2, s = Math.sqrt(R * R - (t - e) * (t - e));
      let sicheln = '', schlitze = '';
      for (const w of [-90, 30, 150]) {
        const ax = Math.cos(w * Math.PI / 180), ay = Math.sin(w * Math.PI / 180);
        const pt = (tt, ss) => P(cx + tt * ax - ss * ay, cy + tt * ay + ss * ax);
        sicheln += `M${pt(t, s)}A${r2(R)},${r2(R)} 0 1 1 ${pt(t, -s)}A${r2(r)},${r2(r)} 0 1 0 ${pt(t, s)}Z`;
        schlitze += `M${pt(0, 0)}L${pt(6.5 * u, 0)}`;
      }
      const ring = 9.25 * u;
      return pfad(sicheln, f) + `<circle cx="${cx}" cy="${cy}" r="${r2(ring)}" fill="none" stroke="${g}" stroke-width="${r2(5.5 * u)}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r2(ring)}" fill="none" stroke="${f}" stroke-width="${r2(3.5 * u)}"/>` +
        strich(schlitze, g, r2(u)) + `<circle cx="${cx}" cy="${cy}" r="${r2(2 * u)}" fill="${g}"/>`;
    },
    strahlung(f) {
      const cx = 50, cy = 50, R = 9.2, ri = 1.5 * R, ra = 5 * R;
      let d = kreis(cx, cy, R);
      for (const w of [-150, -30, 90]) {
        d += `M${P(...polar(cx, cy, ri, w - 30))}L${P(...polar(cx, cy, ra, w - 30))}A${r2(ra)},${r2(ra)} 0 0 1 ` +
          `${P(...polar(cx, cy, ra, w + 30))}L${P(...polar(cx, cy, ri, w + 30))}A${r2(ri)},${r2(ri)} 0 0 0 ${P(...polar(cx, cy, ri, w - 30))}Z`;
      }
      return pfad(d, f);
    },
    batterien(f, g) {
      const umriss = ` stroke="${g}" stroke-width="2.5" stroke-linejoin="round"`;
      return pfad('M12,22A11,4 0 0 1 34,22V86A11,4 0 0 1 12,86ZM19,16H27V20H19Z', f, umriss) +
        pfad('M28,43A9,3 0 0 1 46,43V94A9,3 0 0 1 28,94ZM33,37H41V41H33Z', f, umriss) +
        pfad('M50,56H88A4,14 0 0 1 88,84H50ZM91,66H95V74H91Z', f, umriss) +
        strich('M66,56L70,64L65,70L71,78', g, 2.2, RUND) + setze(pfad(FLAMME + FLAMME_INNEN, f, ' fill-rule="evenodd"'), 68, 38, 0.3);
    },
  };

  // ------------------------------------------------------------------ GHS-Piktogramme
  const GHS_TEXT = {
    GHS01: 'Explosiv',
    GHS02: 'Entzündbar',
    GHS03: 'Oxidierend (brandfördernd)',
    GHS04: 'Gase unter Druck',
    GHS05: 'Ätzend',
    GHS06: 'Akut giftig',
    GHS07: 'Reizend / gesundheitsschädlich',
    GHS08: 'Gesundheitsgefahr',
    GHS09: 'Umweltgefährlich',
  };
  const GHS_CODES = Object.keys(GHS_TEXT);
  // [Symbol, Mitte x, Mitte y, Maßstab]
  const GHS_DEF = {
    GHS01: ['bombe', 52, 52, 0.6],
    GHS02: ['flamme', 50, 50, 0.56],
    GHS03: ['flammeKreis', 50, 50, 0.56],
    GHS04: ['gasflasche', 50, 50, 0.66],
    GHS05: ['aetzend', 50, 52, 0.66],
    GHS06: ['totenkopf', 50, 50, 0.62],
    GHS07: ['ausrufezeichen', 50, 50, 0.54],
    GHS08: ['gesundheit', 50, 50, 0.6],
    GHS09: ['umwelt', 50, 50, 0.62],
  };
  const GHS_AUSSEN = 49.6, GHS_INNEN = GHS_AUSSEN - 6 * Math.SQRT2;   // roter Rand 6 Einheiten breit

  // 'GHS01', 'ghs02', 'GHS2', 2, '02' → 'GHS0x'; sonst ''
  function ghsCode(v) {
    const m = /^\s*(?:ghs|sgh)?\s*0?([1-9])\s*$/i.exec(String(leer(v) ? '' : v));
    return m ? 'GHS0' + m[1] : '';
  }

  function ghs(code, { groesse = 64, titel } = {}) {
    const c = ghsCode(code), g = zahl(groesse, 64);
    if (!c) {
      const t = titelOder(titel, 'Unbekanntes GHS-Piktogramm' + (String(leer(code) ? '' : code).trim() ? ' (' + String(code).trim() + ')' : ''));
      return kopf(g, g, '0 0 100 100', t, 'gsz-symbol gsz-ghs gsz-ersatz') +
        `<path d="${raute(GHS_INNEN + 3.3)}" fill="${F.ersatzGrund}" stroke="${F.ersatzRand}" stroke-width="6.6"/>` +
        text('?', 50, 66, 46, F.ersatzText) + '</svg>';
    }
    const [sym, x, y, s] = GHS_DEF[c];
    return kopf(g, g, '0 0 100 100', titelOder(titel, GHS_TEXT[c]), 'gsz-symbol gsz-ghs') +
      pfad(raute(GHS_AUSSEN), F.rot) + pfad(raute(GHS_INNEN), F.weiss) + setze(SYMBOL[sym](F.schwarz, F.weiss), x, y, s) + '</svg>';
  }

  // ------------------------------------------------------------------ ADR-Gefahrzettel
  const ADR_TEXT = {
    '1': 'Explosive Stoffe und Gegenstände mit Explosivstoff',
    '1.4': 'Explosive Stoffe und Gegenstände mit geringer Explosionsgefahr (Unterklasse 1.4)',
    '1.5': 'Sehr unempfindliche explosive Stoffe mit Massenexplosionsgefahr (Unterklasse 1.5)',
    '1.6': 'Extrem unempfindliche Gegenstände ohne Massenexplosionsgefahr (Unterklasse 1.6)',
    '2.1': 'Entzündbare Gase',
    '2.2': 'Nicht entzündbare, nicht giftige Gase',
    '2.3': 'Giftige Gase',
    '3': 'Entzündbare flüssige Stoffe',
    '4.1': 'Entzündbare feste Stoffe, selbstzersetzliche Stoffe und desensibilisierte explosive feste Stoffe',
    '4.2': 'Selbstentzündliche Stoffe',
    '4.3': 'Stoffe, die in Berührung mit Wasser entzündbare Gase entwickeln',
    '5.1': 'Entzündend (oxidierend) wirkende Stoffe',
    '5.2': 'Organische Peroxide',
    '6.1': 'Giftige Stoffe',
    '6.2': 'Ansteckungsgefährliche Stoffe',
    '7A': 'Radioaktive Stoffe, Kategorie I-WEISS',
    '7B': 'Radioaktive Stoffe, Kategorie II-GELB',
    '7C': 'Radioaktive Stoffe, Kategorie III-GELB',
    '7D': 'Radioaktive Stoffe (Großzettel)',
    '7E': 'Spaltbare Stoffe',
    '8': 'Ätzende Stoffe',
    '9': 'Verschiedene gefährliche Stoffe und Gegenstände',
    '9A': 'Lithiumbatterien (verschiedene gefährliche Stoffe und Gegenstände)',
    'umwelt': 'Umweltgefährdender Stoff',
  };
  const ADR_ZETTEL = Object.keys(ADR_TEXT);
  const W = F.weiss, S = F.schwarz;
  const FL = ['flamme', 50, 29, 0.38];
  // grund: ganze Fläche; oben/unten: Hälften bis zur Außenkante; innenOben/innenUnten: Hälften innerhalb der Innenlinie
  // (außen bleibt ein weißer Rand); streifen: 'voll' (4.1) oder 'oben' (9); sym: [Symbol, x, y, Maßstab];
  // nr: Nummer in der unteren Ecke; kante: dünne graue Außenkante (weißer Rand, auf Weiß sonst unsichtbar)
  const ADR_DEF = {
    '1': { grund: F.orange, sym: ['bombe', 52, 28, 0.44], nr: '1' },
    '1.4': { grund: F.orange, gross: '1.4', nr: '1' },
    '1.5': { grund: F.orange, gross: '1.5', nr: '1' },
    '1.6': { grund: F.orange, gross: '1.6', nr: '1' },
    '2.1': { grund: F.rot, sym: FL, nr: '2' },
    '2.2': { grund: F.gruen, sym: ['gasflasche', 50, 30, 0.5], nr: '2' },
    '2.3': { grund: W, sym: ['totenkopf', 50, 28, 0.44], nr: '2', kante: true },
    '3': { grund: F.rot, sym: FL, nr: '3' },
    '4.1': { grund: W, streifen: 'voll', sym: FL, nr: '4', kante: true },
    '4.2': { oben: W, unten: F.rot, sym: FL, nr: '4', kante: true },
    '4.3': { grund: F.blau, sym: FL, nr: '4' },
    '5.1': { grund: F.gelb, sym: ['flammeKreis', 50, 29, 0.38], nr: '5.1' },
    '5.2': { oben: F.rot, unten: F.gelb, sym: FL, nr: '5.2' },
    '6.1': { grund: W, sym: ['totenkopf', 50, 28, 0.44], nr: '6', kante: true },
    '6.2': { grund: W, sym: ['biogefahr', 50, 28, 0.42], nr: '6', kante: true },
    '7A': { grund: W, radioaktiv: 1, nr: '7', kante: true },
    '7B': { grund: W, innenOben: F.gelb, radioaktiv: 2, nr: '7', kante: true },
    '7C': { grund: W, innenOben: F.gelb, radioaktiv: 3, nr: '7', kante: true },
    '7D': { grund: W, innenOben: F.gelb, radioaktiv: 0, nr: '7', kante: true },
    '7E': { grund: W, spaltbar: true, nr: '7', kante: true },
    '8': { grund: W, innenUnten: S, sym: ['aetzend', 50, 30, 0.5], nr: '8', nrFarbe: W, kante: true },
    '9': { grund: W, streifen: 'oben', nr: '9', unterstrichen: true, kante: true },
    '9A': { grund: W, streifen: 'oben', sym: ['batterien', 50, 66, 0.3], nr: '9', unterstrichen: true, kante: true },
  };
  // Maße: Kante bei 49,5 (Halbdiagonale), Innenlinie 1,8 breit mit 3,5 Abstand zur Kante (≈ 5 mm bei 100 mm Zettel)
  const RA = 49.5, LB = 1.8, RL = RA - (3.5 + LB / 2) * Math.SQRT2, RL_AUSSEN = RA - 3.5 * Math.SQRT2;
  const halbe = (r, oben) => oben ? `M${P(50 - r, 50)}L${P(50, 50 - r)}L${P(50 + r, 50)}Z` : `M${P(50 - r, 50)}L${P(50, 50 + r)}L${P(50 + r, 50)}Z`;

  // Senkrechte Streifen (4.1, 9): Breite der Raute in 13 gleiche Teile, gefärbt die geraden (beide Spitzen und die Mitte)
  function streifen(nurOben) {
    const b = 2 * RA / 13, h = x => RA - Math.abs(x - 50);
    let d = '';
    for (let i = 0; i < 13; i += 2) {
      const x0 = 50 - RA + i * b, x1 = x0 + b, xs = x0 < 50 && x1 > 50 ? [x0, 50, x1] : [x0, x1];
      const oben = xs.map(x => [x, 50 - h(x)]);
      const unten = nurOben ? [[x1, 50], [x0, 50]] : xs.slice().reverse().map(x => [x, 50 + h(x)]);
      d += vieleck(oben.concat(unten));
    }
    return d;
  }

  // 'zettel' vereinheitlichen: '7a' → '7A', '2,1' → '2.1', '1.1D' → '1', 'Umwelt' → 'umwelt', '7' → '7D'
  function adrZettel(v) {
    const t = String(leer(v) ? '' : v).trim().toUpperCase().replace(/\s+/g, '').replace(',', '.').replace(/^(NR\.?|KLASSE)/, '');
    if (/^UMWELT/.test(t)) return 'umwelt';
    if (/^1(\.[123])?[A-S]?$/.test(t)) return '1';
    const m = /^1\.([456])[A-S]?$/.exec(t);
    if (m) return '1.' + m[1];
    if (t === '7') return '7D';
    return ADR_DEF[t] ? t : '';
  }

  function adrInhalt(z) {
    const d = ADR_DEF[z], teile = [];
    // Grund
    if (d.oben) teile.push(pfad(raute(RA), d.oben), pfad(halbe(RA, false), d.unten));
    else teile.push(pfad(raute(RA), d.grund));
    if (d.streifen) teile.push(pfad(streifen(d.streifen === 'oben'), d.streifen === 'oben' ? S : F.rot));
    if (d.innenOben) teile.push(pfad(halbe(RL, true), d.innenOben));
    if (d.innenUnten) teile.push(pfad(halbe(RL_AUSSEN, false), d.innenUnten));
    // Innenlinie
    teile.push(`<path d="${raute(RL)}" fill="none" stroke="${S}" stroke-width="${LB}"/>`);
    // Symbol bzw. Inhalt der oberen Hälfte
    if (d.sym) teile.push(setze(SYMBOL[d.sym[0]](S, d.innenUnten ? W : (d.oben || d.grund)), d.sym[1], d.sym[2], d.sym[3]));
    if (d.gross) teile.push(text(d.gross, 50, 45, 26, S, ' letter-spacing="-0.5"'));
    if (d.radioaktiv !== undefined) {
      const n = d.radioaktiv;
      teile.push(setze(SYMBOL.strahlung(S), 50, 30, 0.32), strich(`M${P(50 - RL, 50)}H${r2(50 + RL)}`, S, 1.2));
      if (n) {
        teile.push(`<text x="50" y="57.5" font-family="${SCHRIFT}" font-weight="700" font-size="6.4" fill="${S}" ` +
          `text-anchor="middle">RADIOACTIVE<tspan fill="${F.rot}" dx="1">${'I'.repeat(n)}</tspan></text>`);
        teile.push(text('CONTENTS', 38, 61.6, 2.2, S, ' text-anchor="end"').replace('text-anchor="middle" ', ''),
          text('ACTIVITY', 38, 64.6, 2.2, S, ' text-anchor="end"').replace('text-anchor="middle" ', ''),
          strich('M38.8,61.6H62M38.8,64.6H62', '#9a9a9a', 0.5));
        if (n > 1) teile.push(`<rect x="42" y="66.3" width="16" height="6" fill="none" stroke="${S}" stroke-width="0.5"/>`,
          text('TRANSPORT INDEX', 50, 68.4, 1.6, S));
      } else teile.push(text('RADIOACTIVE', 50, 59, 8, S));
    }
    if (d.spaltbar) {
      teile.push(text('FISSILE', 50, 45.5, 11, S), strich(`M${P(50 - RL, 50)}H${r2(50 + RL)}`, S, 1.2),
        `<rect x="34" y="54" width="32" height="14" fill="none" stroke="${S}" stroke-width="0.7"/>`,
        text('CRITICALITY', 50, 57.6, 2.8, S), text('SAFETY INDEX', 50, 60.6, 2.8, S));
    }
    // Nummer in der unteren Ecke
    const lang = d.nr.length > 1, nf = d.nrFarbe || S;
    teile.push(text(d.nr, 50, lang ? 81 : 85.5, lang ? 13 : 15, nf));
    if (d.unterstrichen) teile.push(pfad('M45.8,87.2H54.2V88.8H45.8Z', nf));
    if (d.kante) teile.push(`<path d="${raute(RA)}" fill="none" stroke="${F.kante}" stroke-width="0.7"/>`);
    return teile.join('');
  }

  // Kennzeichen für umweltgefährdende Stoffe (ADR 5.2.1.8.3): weiße Raute mit schwarzem Rand, toter Baum und Fisch
  const umweltInhalt = () => `<path d="${raute(RA - 1.8)}" fill="${W}" stroke="${S}" stroke-width="2.6"/>` +
    setze(SYMBOL.umwelt(S, W), 50, 50, 0.6);

  function adr(zettel, { groesse = 64, titel } = {}) {
    const z = adrZettel(zettel), g = zahl(groesse, 64);
    if (!z) {
      const roh = String(leer(zettel) ? '' : zettel).trim(), anzeige = roh ? roh.slice(0, 6) : '?';
      const fs = Math.min(30, 56 / (0.62 * Math.max(anzeige.length, 1)));
      return kopf(g, g, '0 0 100 100', titelOder(titel, 'Unbekannter Gefahrzettel' + (roh ? ' (' + roh + ')' : '')),
        'gsz-symbol gsz-adr gsz-ersatz') +
        `<path d="${raute(RA - 1.5)}" fill="${F.ersatzGrund}" stroke="${F.ersatzRand}" stroke-width="3"/>` +
        text(anzeige, 50, 50 + fs * 0.36, fs, F.ersatzText) + '</svg>';
    }
    return kopf(g, g, '0 0 100 100', titelOder(titel, ADR_TEXT[z]), 'gsz-symbol gsz-adr') +
      (z === 'umwelt' ? umweltInhalt() : adrInhalt(z)) + '</svg>';
  }

  // ------------------------------------------------------------------ Warntafel (ADR 5.3.2.2)
  // 400 × 300 mm, schwarzer Rand 15 mm, waagrechte Trennlinie 15 mm, Ziffern 100 mm hoch
  function feldText(v, un) {
    let t = String(leer(v) ? '' : v).replace(/\s+/g, '').toUpperCase();
    if (un) t = t.replace(/^UN/, '');
    return t;
  }
  function ziffern(t, mitte) {
    if (!t) return '';
    const fs = 140, breite = [...t].reduce((s, c) => s + (/[0-9]/.test(c) ? 0.6 : 0.68), 0) * fs;
    const passen = breite > 350 ? ' textLength="350" lengthAdjust="spacingAndGlyphs"' : '';
    return `<text x="200" y="${r2(mitte + 50)}" font-family="${SCHRIFT_TAFEL}" font-weight="700" font-size="${fs}" ` +
      `fill="${S}" text-anchor="middle"${passen}>${esc(t)}</text>`;
  }
  function warntafel(kemler, un, { groesse = 120, titel } = {}) {
    const oben = feldText(kemler, false), unten = feldText(un, true), b = zahl(groesse, 120);
    const standard = oben || unten ? `Warntafel: Nummer zur Kennzeichnung der Gefahr ${oben || '–'}, UN-Nummer ${unten || '–'}`
      : 'Warntafel ohne Nummern';
    return kopf(b, b * 0.75, '0 0 400 300', titelOder(titel, standard), 'gsz-symbol gsz-warntafel') +
      `<rect x="0.5" y="0.5" width="399" height="299" rx="9" fill="${S}"/>` +
      `<rect x="15" y="15" width="370" height="127.5" rx="2" fill="${F.tafel}"/>` +
      `<rect x="15" y="157.5" width="370" height="127.5" rx="2" fill="${F.tafel}"/>` +
      ziffern(oben, 78.75) + ziffern(unten, 221.25) + '</svg>';
  }

  return { ghs, adr, warntafel, GHS_TEXT, ADR_TEXT, GHS_CODES, ADR_ZETTEL, ghsCode, adrZettel, esc, FARBEN };
});
