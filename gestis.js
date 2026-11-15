// GESTIS-Stoffdatenbank (IFA/DGUV): Suche und Datenblatt, umgesetzt in das Stoffobjekt der App (stoffdaten.js).
// Schnittstelle der öffentlichen GESTIS-Seite (gestis.dguv.de): Die Suche ist frei, das Datenblatt braucht den
// öffentlichen Schlüssel der Seite (steht dort in env-config.js). Der Server erlaubt Abrufe aus dem Browser (CORS).
// Abgerufen wird nur, was jemand gezielt sucht oder öffnet – kein Massenabruf.
// Läuft im Browser (window.GSZGestis) und in Node (require); ohne Abhängigkeiten außer stoffdaten.js.
'use strict';
(function (wurzel, fabrik) {
  const S = (typeof module === 'object' && module.exports) ? require('./stoffdaten') : wurzel.GSZStoffdaten;
  const m = fabrik(S);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZGestis = m;
})(typeof self !== 'undefined' ? self : this, function (S) {
  const API = 'https://gestis-api.dguv.de/api/';
  const SCHLUESSEL = 'dddiiasjhduuvnnasdkkwUUSHhjaPPKMasd';     // öffentlicher Schlüssel der GESTIS-Webseite
  const SEITE = zvg => `https://gestis.dguv.de/data?name=${encodeURIComponent(zvg)}`;
  let abruf = (url, opt) => fetch(url, opt);                     // Programm (Electron): über den Hauptprozess

  // ------------------------------------------------------------------ Suche
  // Art der Eingabe: CAS, UN, EG, Summenformel oder Name
  function anfrageArt(eingabe) {
    const q = String(eingabe || '').trim().replace(/\s+/g, ' ');
    if (!q) return null;
    let m;
    if ((m = /^(\d{2,7})\s*-\s*(\d{2})\s*-\s*(\d)$/.exec(q))) return { art: 'cas', wert: `${m[1]}-${m[2]}-${m[3]}` };
    if ((m = /^(?:UN[\s-]?(?:Nr\.?\s*)?)?(\d{4})$/i.exec(q))) return { art: 'un', wert: m[1] };
    if ((m = /^(\d{3})\s*-\s*(\d{3})\s*-\s*(\d)$/.exec(q))) return { art: 'eg', wert: `${m[1]}-${m[2]}-${m[3]}` };
    const f = q.replace(/\s/g, '').replace(/[₀-₉]/g, z => String(z.charCodeAt(0) - 8320));
    if (/^(?:[A-Z][a-z]?\d*|\(|\)\d*|[·.*]\d*)+$/.test(f) && /[A-Z]/.test(f) && f.length <= 40 &&
        (/\d/.test(f) || (f.match(/[A-Z]/g) || []).length >= 2) && !/^[A-Z][a-z]+$/.test(f)) {
      return { art: 'formel', wert: f.replace(/[·.*]/g, '*') };
    }
    return { art: 'name', wert: q };
  }
  const ART_TEXT = { cas: 'CAS-Nr.', un: 'UN-Nr.', eg: 'EG-Nr.', formel: 'Summenformel', name: 'Name' };

  async function jsonHolen(url, mitSchluessel) {
    const r = await abruf(url, mitSchluessel ? { headers: { Authorization: 'Bearer ' + SCHLUESSEL, Accept: 'application/json' } } : { headers: { Accept: 'application/json' } });
    if (!r.ok) { const e = new Error(`GESTIS antwortet mit ${r.status}`); e.status = r.status; throw e; }
    return r.json();
  }
  const norm = s => String(s || '').toLowerCase().normalize('NFC').replace(/ß/g, 'ss').replace(/[^a-z0-9äöü]+/g, ' ').trim();

  // → [{ zvg, name, cas, rang }]; Namen: genaue Treffer zuerst, dann Anfang, dann enthalten (GESTIS-Reihenfolge bei Gleichstand)
  async function suchen(eingabe) {
    const a = anfrageArt(eingabe);
    if (!a) return { art: null, treffer: [] };
    const p = a.art === 'name' ? `stoffname=${encodeURIComponent(a.wert)}&exact=false`
      : a.art === 'formel' ? `summenformel=${encodeURIComponent(a.wert)}&exact=true`
      : `nummern=${encodeURIComponent(a.wert)}&exact=true`;
    let liste = await jsonHolen(`${API}search/de?${p}`);
    if (a.art === 'formel' && !liste.length) liste = await jsonHolen(`${API}search/de?summenformel=${encodeURIComponent(a.wert)}&exact=false`);
    let treffer = (Array.isArray(liste) ? liste : []).map((t, i) => ({ zvg: String(t.zvg_nr || ''), name: String(t.name || ''),
      cas: String(t.cas_nr || ''), rang: i })).filter(t => t.zvg);
    if (a.art === 'name') {
      const q = norm(a.wert);
      const stufe = t => { const n = norm(t.name); return n === q ? 0 : n.startsWith(q + ' ') || n === q ? 1 : n.startsWith(q) ? 2 :
        n.split(' ').some(w => w.startsWith(q)) ? 3 : n.includes(q) ? 4 : 5; };
      treffer = treffer.map(t => ({ ...t, s: stufe(t) })).sort((x, y) => x.s - y.s || x.name.length - y.name.length || x.rang - y.rang)
        .map(({ s, ...t }) => t);
    }
    return { art: a.art, wert: a.wert, treffer: treffer.slice(0, 40) };
  }

  async function datenblatt(zvg) {
    const z = String(zvg || '').replace(/\D/g, '');
    if (!z) throw new Error('Ungültige ZVG-Nummer');
    return jsonHolen(`${API}article/de/${z.padStart(6, '0')}`, true);
  }

  // ------------------------------------------------------------------ HTML der Kapitel → Text
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', deg: '°', middot: '·',
                auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', micro: 'µ', sup2: '²', sup3: '³',
                le: '≤', ge: '≥', plusmn: '±', times: '×', bull: '•', hellip: '…', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”' };
  function entities(t) {
    return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (g, e) => e[0] === '#'
      ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      : (ENT[e] !== undefined ? ENT[e] : g));
  }
  // Zeilen: Zeilenumbrüche aus <br>, Tabellenzeilen und Absätzen; Zellen mit „ | “ getrennt bleiben in einer Zeile
  function htmlZeilen(html) {
    let h = String(html || '');
    h = h.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, ' [Bild:$1] ');
    h = h.replace(/<sub>\s*([^<]*)<\/sub>/gi, '$1').replace(/<sup>\s*([^<]*)<\/sup>/gi, '^$1');
    h = h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(tr|p|div|li|h\d|table)>/gi, '\n').replace(/<\/t[dh]>/gi, '\t');
    h = entities(h.replace(/<[^>]+>/g, ' '));
    return h.split('\n').map(z => z.split('\t').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | '))
      .map(z => z.replace(/\^(\d)/g, (g, d) => ({ 2: '²', 3: '³' }[d] || d))).filter(Boolean);
  }
  const htmlText = html => htmlZeilen(html).join('\n');

  // Kapitel des Datenblatts: [{ drnr, titel, zeilen, html }]
  function unterkapitel(roh) {
    const aus = [];
    for (const hk of (roh && roh.hauptkapitel) || []) {
      const haupt = htmlZeilen(hk.ueberschrift || '').join(' ');
      for (const uk of hk.unterkapitel || []) {
        const zeilen = htmlZeilen(uk.text || '');
        aus.push({ haupt: hk.drnr, hauptTitel: haupt, drnr: String(uk.drnr || ''), zeilen, html: uk.text || '' });
      }
    }
    return aus;
  }

  // ------------------------------------------------------------------ Hilfen zum Auslesen
  const istLabel = z => /:\s*$/.test(z) && z.length < 90;
  // Wert nach einer Beschriftung (nächste Zeile bzw. Rest der Zeile)
  function wertNach(zeilen, muster, { ab = 0 } = {}) {
    for (let i = ab; i < zeilen.length; i++) {
      const z = zeilen[i];
      const m = muster.exec(z);
      if (!m) continue;
      const rest = z.slice(m.index + m[0].length).replace(/^\s*[:|]\s*/, '').trim();
      if (rest && !/^\|/.test(rest)) return { wert: rest, i };
      if (i + 1 < zeilen.length && !istLabel(zeilen[i + 1])) return { wert: zeilen[i + 1], i: i + 1 };
    }
    return null;
  }
  // Block: Zeilen nach einer Beschriftung bis zur nächsten Beschriftung
  function block(zeilen, muster, ende = istLabel) {
    const i = zeilen.findIndex(z => muster.test(z));
    if (i < 0) return [];
    const aus = [];
    for (let j = i + 1; j < zeilen.length; j++) {
      if (ende(zeilen[j])) break;
      if (/^Quelle:/.test(zeilen[j])) break;
      aus.push(zeilen[j]);
    }
    return aus;
  }
  const ohneQuelle = zeilen => {
    const aus = [];
    for (let i = 0; i < zeilen.length; i++) {
      if (/^Quelle:?$/.test(zeilen[i])) { i++; continue; }                     // „Quelle:“ + Nummern
      if (/^Quelle:/.test(zeilen[i]) || /^\d{5}(\s+\d{5})*$/.test(zeilen[i])) continue;
      aus.push(zeilen[i]);
    }
    return aus;
  };
  const saetze = zeilen => zeilen.flatMap(z => z.split(/\s*\|\s*/)).map(z => z.trim()).filter(z => z && !/^Quelle/.test(z));

  // ------------------------------------------------------------------ Datenblatt → Stoffobjekt
  // optionen.un: gesuchte UN-Nummer (dieser Transport-Eintrag wird angezeigt)
  function auswerten(roh, { un = '' } = {}) {
    const s = S.leer();
    s.quelle = 'gestis';
    s.quelleText = 'GESTIS-Stoffdatenbank (IFA)';
    s.name = String(roh.name || '');
    s.zvg = String(roh.zvgnummer_mit_null || roh.zvgnummer || '');
    s.synonyme = (roh.aliases || []).map(a => a && a.name).filter(Boolean);
    const K = unterkapitel(roh);
    // ein Unterkapitel kann doppelt vorkommen (z. B. 1303 leer im Kopf und gefüllt unter „Vorschriften“): das ausführlichere nehmen
    const kap = nr => K.filter(k => k.drnr === nr).sort((a, b) => b.zeilen.length - a.zeilen.length)[0];
    const zeilen = nr => { const k = kap(nr); return k ? ohneQuelle(k.zeilen) : []; };

    // Identifikation
    const id = zeilen('0100');
    const nach = re => { const w = wertNach(id, re); return w ? w.wert : ''; };
    const cas = nach(/^CAS Nr:?/);
    if (cas) s.cas = [cas];
    s.eg = nach(/^EG Nr:?/);
    s.index = nach(/^INDEX Nr:?/);

    // Charakterisierung
    const agg = zeilen('0303').filter(z => !/^AGGREGATZUSTAND/.test(z)).join(' ');
    s.aggregatzustand = /Gas\b/.test(agg) ? 'gasförmig' : /wässrige Lösung/i.test(agg) ? 'flüssig (wässrige Lösung)' :
      /Flüssigkeit|flüssig/.test(agg) ? 'flüssig' : /Feststoff|fest/.test(agg) ? 'fest' : agg.replace(/Der Stoff ist.*$/, '').trim();
    s.eigenschaften = zeilen('0304').filter(z => !/^EIGENSCHAFTEN/.test(z)).join(', ');
    s.charakterisierung = zeilen('0305').filter(z => !/^CHEMISCHE CHARAKTERISIERUNG/.test(z)).join(' ');

    // Formel und Molmasse
    const f = zeilen('0400');
    if (f.length) s.formel = f[0].split('|')[0].split('/')[0].trim();
    const mm = wertNach(f, /^Molare Masse:?/);
    if (mm) s.molmasse = mm.wert;

    // Kennwerte
    const kw = s.kennwerte;
    const einfach = (nr, re) => { const w = wertNach(zeilen(nr), re); return w ? mitBedingung(zeilen(nr), w) : ''; };
    kw.schmelzpunkt = einfach('0602', /^Schmelzpunkt:?/);
    kw.siedepunkt = einfach('0603', /^Siedepunkt:?/);
    kw.flammpunkt = einfach('0607', /^Flammpunkt:?/);
    kw.zuendtemperatur = einfach('0608', /^Zündtemperatur:?/);
    const tk = wertNach(zeilen('0608'), /^Temperaturklasse:?/);
    kw.temperaturklasse = tk ? tk.wert : '';
    const ex = zeilen('0609');
    const ueg = wertNach(ex, /^Untere Explosionsgrenze:?/), oeg = wertNach(ex, /^Obere Explosionsgrenze:?/);
    // „14 Mol.-% (Ideales Gas: Mol.-% = Vol.-%)“ → „14 Vol.-%“ (bei Gasen ist Mol.-% gleich Vol.-%)
    const vol = w => w ? w.wert.replace(/Mol\.-%\s*\(Ideales Gas: Mol\.-% = Vol\.-%\)/, 'Vol.-%') : '';
    kw.ueg = vol(ueg); kw.oeg = vol(oeg);
    const eg = wertNach(ex, /^Explosionsgruppe:?/);
    kw.explosionsgruppe = eg ? eg.wert : '';
    kw.dampfdruck = einfach('0605', /^Dampfdruck:?/);
    kw.loeslichkeit = einfach('0613', /^Löslichkeit:?/);
    kw.ph = einfach('0614', /^pH-Wert:?/);
    dichteAuswerten(zeilen('0604'), kw);
    // Grenzwerte, Wassergefährdung, Gasflasche
    const agw = zeilen('1201').filter(z => !/^TRGS 900/.test(z));
    // „20 ml/m³“ + „14 mg/m³“ → „20 ml/m³ (14 mg/m³)“; Stäube, Nebel: „0,02 mg/m³“ + „bezogen auf die alveolengängige Fraktion“ → „0,02 mg/m³ (A-Fraktion)“
    const werte = [];
    agw.forEach((z, i) => {
      if (werte.length >= 2 || !/(ml\/m³|mg\/m³|ppm|mg\/m3)/.test(z) || !/^(\d|[<>≤])/.test(z)) return;
      const bez = /^bezogen auf (?:die )?(alveolengängige|einatembare)/i.exec(agw[i + 1] || '');
      werte.push({ w: z, f: bez ? (/alveolen/i.test(bez[1]) ? 'A-Fraktion' : 'E-Fraktion') : '' });
    });
    kw.agw = werte.length === 2 && !werte[0].f && !werte[1].f ? `${werte[0].w} (${werte[1].w})` : werte.map(x => x.w + (x.f ? ` (${x.f})` : '')).join(' · ');
    const wgk = zeilen('1106').find(z => /WGK\s*\d|nicht wassergefährdend|awg/i.test(z));
    kw.wgk = wgk ? wgk.replace(/\s*-\s*/, ' – ') : '';
    const gf = zeilen('1105').filter(z => !/^FARBKENNZEICHNUNG/.test(z));
    s.gasflasche = gf.join(' ').replace(/\[Bild:[^\]]*\]\s*/g, '').replace(/\s*\/\s*\(/, ' (').trim();

    // GHS
    ghsAuswerten(kap('1303'), s.ghs);
    // Transport
    s.transporte = transportAuswerten(zeilen('1108'));
    const t = (un && s.transporte.find(x => x.un === un)) || s.transporte[0];
    if (t) s.transport = { ...t };
    // Brand, Freisetzung, PSA, Erste Hilfe, Reaktionen
    brandAuswerten(zeilen('0809'), s.loeschmittel);
    s.freisetzung = saetze(zeilen('0808').filter(z => !/^MASSNAHMEN BEI UNBEABSICHTIGTER/.test(z)));
    psaAuswerten(zeilen('0806'), s.psa);
    ersteHilfeAuswerten(zeilen('0703'), s.ersteHilfe);
    s.reaktionen = saetze(zeilen('0619').filter(z => !/^GEFÄHRLICHES REAKTIONSVERHALTEN/.test(z)));
    s.entsorgung = saetze(zeilen('0807').filter(z => !/^ENTSORGUNG$/.test(z)));

    // vollständiges Datenblatt (ohne Literatur und Links), Unterkapitel mit Titel, gruppiert nach Hauptkapitel
    const TITEL = { '0100': 'IDENTIFIKATION', '0400': 'FORMEL' };
    const gross = z => z && z.length < 120 && /^[A-ZÄÖÜ0-9 ()\-–,./&:]+$/.test(z) && /[A-ZÄÖÜ]{3}/.test(z);
    const schoen = t => String(t || '').replace(/\s+/g, ' ').trim();     // GESTIS-Überschriften bleiben in Großbuchstaben (Anzeige wie Kapitelköpfe)
    s.kapitel = K.filter(k => !['0900', '1400'].includes(k.haupt) && k.zeilen.length && !(k.haupt === '1300'))
      .map(k => {
        const ersteGross = gross(k.zeilen[0]) && k.drnr !== '0400';
        return { gruppe: schoen(k.hauptTitel || ''), titel: TITEL[k.drnr] || (ersteGross ? schoen(k.zeilen[0]) : schoen(k.hauptTitel || '')),
                 text: ohneQuelleText(k.zeilen.slice(ersteGross ? 1 : 0)) };
      }).filter(k => k.text);
    return S.normalisieren(s);
  }
  // Quellenangaben im Volltext behalten, aber kompakt („Quelle: 00440“)
  function ohneQuelleText(zeilen) {
    const aus = [];
    for (let i = 0; i < zeilen.length; i++) {
      if (/^Quelle:?$/.test(zeilen[i]) && /^\d{5}/.test(zeilen[i + 1] || '')) { i++; continue; }
      if (/^\d{5}(\s+\d{5})*$/.test(zeilen[i])) continue;
      aus.push(zeilen[i]);
    }
    return aus.join('\n');
  }
  // „Wert: -33,4 °C“ + „Temperatur: 20 °C“ / Zusatz → „-33,4 °C (20 °C)“
  function mitBedingung(zeilen, w) {
    const nachher = zeilen.slice(w.i + 1, w.i + 5);
    const temp = nachher.findIndex(z => /^Temperatur:?$/.test(z));
    let wert = w.wert;
    if (temp >= 0 && nachher[temp + 1] && !istLabel(nachher[temp + 1])) wert += ` (${nachher[temp + 1]})`;
    return wert;
  }
  function dichteAuswerten(z, kw) {
    // Abschnitte: GASDICHTE, DICHTE, RELATIVE GASDICHTE, RELATIVE DICHTE DES DAMPF-LUFT-GEMISCHES, DICHTE DER FLÜSSIGEN PHASE …
    const teile = [];
    for (let i = 0; i < z.length; i++) {
      if (/^(DICHTE|GASDICHTE|RELATIVE GASDICHTE|RELATIVE DICHTE DES DAMPF-LUFT-GEMISCHES|DICHTE DER FLÜSSIGEN PHASE[^|]*|SCHÜTTDICHTE)$/.test(z[i])) teile.push({ titel: z[i], ab: i });
    }
    teile.forEach((t, j) => { t.zeilen = z.slice(t.ab + 1, j + 1 < teile.length ? teile[j + 1].ab : z.length); });
    const wert = t => {
      const w = wertNach(t.zeilen, /^Wert:?$/);
      if (!w) return '';
      const zus = [];
      const temp = wertNach(t.zeilen, /^Temperatur:?$/);
      if (temp) zus.push(temp.wert);
      for (const x of t.zeilen.slice(w.i + 1)) if (!istLabel(x) && x !== (temp && temp.wert) && !/^bei \d/.test(x) && !/^Quelle/.test(x) &&
        !/^Dichte(verhältnis| der)/.test(x) && x.length < 60) zus.push(x);
      return w.wert + (zus.length ? ` (${zus.join(', ')})` : '');
    };
    for (let i = teile.length - 1; i >= 0; i--) if (!teile[i].zeilen.some(x => /^Wert:?$/.test(x))) teile.splice(i, 1);   // Überschrift des Kapitels
    const relGas = teile.find(t => t.titel === 'RELATIVE GASDICHTE');
    if (relGas) kw.luftvergleichszahl = wert(relGas).replace(/\s*\(.*\)$/, '');
    const gemisch = teile.find(t => t.titel === 'RELATIVE DICHTE DES DAMPF-LUFT-GEMISCHES');
    if (gemisch) kw.dampfLuftGemisch = wert(gemisch).replace(/\s*\(.*\)$/, '') + ' (20 °C)';
    const dichte = teile.find(t => t.titel === 'DICHTE') || teile.find(t => /^DICHTE DER FLÜSSIGEN PHASE/.test(t.titel)) ||
      teile.find(t => t.titel === 'GASDICHTE');
    if (dichte) kw.dichte = wert(dichte) + (dichte.titel === 'GASDICHTE' && !/\(/.test(wert(dichte)) ? ' (Gas, 0 °C)' : '') +
      (/^DICHTE DER FLÜSSIGEN PHASE/.test(dichte.titel) ? ' (Flüssigkeit am Siedepunkt)' : '');
  }
  function ghsAuswerten(k, g) {
    if (!k) return;
    const html = k.html || '';
    g.piktogramme = [...new Set((html.match(/alt="(ghs\d{2})"/gi) || []).map(a => S.ghsCode(a)))].filter(Boolean);
    const z = ohneQuelle(k.zeilen).filter(x => !/^\[Bild:/.test(x));
    const ab = re => z.findIndex(x => re.test(x));
    const bis = (von, ...res) => { const aus = []; for (let i = von + 1; i < z.length; i++) { if (res.some(r => r.test(z[i]))) break; aus.push(z[i]); } return aus; };
    const ENDE = [/^Kennzeichnung:/, /^Signalwort/, /^Gefahrenhinweise/, /^Ergänzende Gefahrenhinweise/, /^Sicherheitshinweise/,
                  /^Sonstige Gefahren/, /^Stand:/, /^geprüft:/, /^Herstellerangabe/, /^Der Stoff ist gelistet/, /^Die (hier zitierte|Kennzeichnung)/];
    const i1 = ab(/^Einstufung:/);
    if (i1 >= 0) g.einstufung = bis(i1, ...ENDE).flatMap(x => x.split(' | '));
    const i2 = ab(/^Signalwort/);
    if (i2 >= 0) g.signalwort = (bis(i2, ...ENDE)[0] || '').replace(/["„“”]/g, '').trim();
    const codes = (re) => { const i = ab(re); if (i < 0) return []; return bis(i, ...ENDE).flatMap(x => x.split(' | ')).map(x => {
      const m = /^((?:EUH|H|P)\d{3}[A-Za-z]{0,2}(?:\s*\+\s*(?:EUH|H|P)\d{3}[A-Za-z]{0,2})*)\s*:\s*(.*)$/.exec(x.trim());
      return m ? { code: m[1].replace(/\s+/g, ''), text: m[2] } : null; }).filter(Boolean); };
    g.h = codes(/^Gefahrenhinweise\s*-\s*H-Sätze/);
    g.euh = codes(/^Ergänzende Gefahrenhinweise/);
    g.p = codes(/^Sicherheitshinweise\s*-\s*P-Sätze/);
  }
  // 1108: je UN-Nummer ein Eintrag
  function transportAuswerten(z) {
    const aus = [];
    let akt = null;
    const zettel = t => t.split(/[\/,]/).map(x => x.trim()).filter(Boolean);
    for (let i = 0; i < z.length; i++) {
      const x = z[i];
      let m;
      if ((m = /^UN-Nummer:\s*(\d{4})/.exec(x))) { akt = { un: m[1], gefahrzettel: [] }; aus.push(akt); continue; }
      if (!akt) continue;
      if ((m = /^Gefahrgut-Bezeichnung:\s*(.*)$/.exec(x))) akt.bezeichnung = m[1];
      else if ((m = /^Nummer zur Kennzeichnung der Gefahr:\s*(.*)$/.exec(x))) akt.kemler = m[1];
      else if ((m = /^Klasse:\s*([0-9.]+)\s*(?:\((.*)\))?/.exec(x))) { akt.klasse = m[1]; akt.klassenText = m[2] || ''; }
      else if ((m = /^Verpackungsgruppe:\s*(.*)$/.exec(x))) akt.verpackungsgruppe = m[1] === '-' ? '' : m[1];
      else if ((m = /^Gefahrzettel:\s*(.*)$/.exec(x))) akt.gefahrzettel = zettel(m[1]);
      else if (/Fisch und Baum/.test(x)) akt.umweltgefaehrdend = 'ja';
      else if (/^Klassifizierungscode/.test(x) && z[i + 1] && !istLabel(z[i + 1])) akt.code = z[i + 1];
      else if (/^Tunnelbeschränkungen/.test(x)) {
        const t = [];
        for (let j = i + 1; j < z.length && !/^\d{4}$/.test(z[j]) && !/^UN-Nummer/.test(z[j]) && !/^Quelle/.test(z[j]); j++) t.push(z[j]);
        akt.tunnel = t.join(' ');
      }
    }
    for (const t of aus) if (!t.umweltgefaehrdend) t.umweltgefaehrdend = 'nein';
    return aus;
  }
  function brandAuswerten(z, l) {
    const teile = { };
    let akt = null;
    for (const x of z) {
      if (/^MASSNAHMEN BEI BRÄNDEN/.test(x)) continue;
      const m = /^(Brandklasse|Geeignete Löschmittel|Ungeeignete Löschmittel|Verhaltensmaßregeln|Persönliche Schutzausrüstung bei der Brandbekämpfung):\s*(.*)$/.exec(x);
      if (m) { akt = m[1]; teile[akt] = teile[akt] || []; if (m[2]) teile[akt].push(m[2]); continue; }
      if (akt) teile[akt].push(x); else (teile.Verhaltensmaßregeln = teile.Verhaltensmaßregeln || []).push(x);
    }
    const bk = teile.Brandklasse || [];
    l.brandklasse = bk.length ? bk.join(' – ') : '';
    l.geeignet = saetze(teile['Geeignete Löschmittel'] || []);
    l.ungeeignet = saetze(teile['Ungeeignete Löschmittel'] || []);
    l.hinweise = saetze(teile.Verhaltensmaßregeln || []);
    // PSA bei der Brandbekämpfung: Ausrüstung → psaBrand; „können gefährliche Stoffe freigesetzt werden“ + Stoffe → gefahrenBrand
    const psa = saetze(teile['Persönliche Schutzausrüstung bei der Brandbekämpfung'] || []);
    const stoffe = [];
    for (const x of psa) {
      if (/Atemschutz|Schutzanzug|Schutzkleidung|tragen|Vollschutz|Isoliergerät/i.test(x)) l.psaBrand.push(x);
      else if (/freigesetzt werden|entstehen|bilden sich|bildet sich/i.test(x)) l.gefahrenBrand.push(x);
      else stoffe.push(x);
    }
    if (stoffe.length) {
      if (l.gefahrenBrand.length && /freigesetzt werden\.?$/.test(l.gefahrenBrand[l.gefahrenBrand.length - 1])) {
        l.gefahrenBrand[l.gefahrenBrand.length - 1] = l.gefahrenBrand[l.gefahrenBrand.length - 1].replace(/\.?$/, ': ') + stoffe.join(', ');
      } else l.gefahrenBrand.push('Mögliche Brandgase: ' + stoffe.join(', '));
    }
  }
  function psaAuswerten(z, p) {
    const teile = {};
    let akt = null;
    for (const x of z) {
      if (/^PERSÖNLICHE SCHUTZMASSNAHMEN/.test(x)) continue;
      const m = /^(Körperschutz|Atemschutz|Augenschutz|Handschutz|Arbeitshygiene|Hautschutz):\s*(.*)$/.exec(x);
      if (m) { akt = m[1]; teile[akt] = teile[akt] || []; if (m[2]) teile[akt].push(m[2]); continue; }
      if (akt) teile[akt].push(x);
    }
    p.koerper = saetze(teile['Körperschutz'] || []);
    p.atem = saetze(teile.Atemschutz || []);
    p.augen = saetze(teile.Augenschutz || []);
    p.hygiene = saetze([...(teile.Arbeitshygiene || []), ...(teile.Hautschutz || [])]);
    const hand = saetze(teile.Handschutz || []);
    // Handschuhmaterialien nach Überschriften „Geeignet sind …“, „… nicht länger als 2 Stunden …“, „Nicht geeignet …“
    let stufe = null, zeit = '', fuer = '';
    const text = [];
    for (const x of hand) {
      let m;
      if ((m = /^(?:Nachfolgende Daten gelten für|Für)\s+(.+?)\s*:?\s*$/i.exec(x)) && /%|Lösung|konz|rein/i.test(x)) { fuer = m[1].replace(/\s*:$/, ''); text.push(x); continue; }
      if (/^Geeignet sind Handschuhe/i.test(x)) { stufe = 'gut'; zeit = ((m = /\(Durchbruchzeit\s*([^)]*)\)/.exec(x)) ? m[1] : ''); text.push(x); continue; }
      if (/nicht länger als .* tragen/i.test(x)) { stufe = 'bedingt'; zeit = ((m = /\(Durchbruchzeit\s*([^)]*)\)/.exec(x)) ? m[1] : ''); text.push(x); continue; }
      if (/^Nicht geeignet/i.test(x)) { stufe = 'nicht'; zeit = ''; text.push(x); continue; }
      if (stufe && /^[A-ZÄÖÜ][^.:]{2,120}$/.test(x) && / - /.test(x) && !/^(Die|Bei|Im|Nachfolgende|Als|Geeignete|Informationen)\b/.test(x)) {
        const d = /\((\d[^)]*mm)\)/.exec(x);
        p.handMaterialien.push({ material: x.replace(/\s*\([^)]*\)/g, '').trim(), dicke: d ? d[1] : '', zeit, stufe, fuer });
        continue;
      }
      if (/^(Die Zeitangaben|Im Zweifelsfall|Bei einer ca\.)/.test(x)) stufe = null;
      text.push(x);
    }
    p.hand = text;
  }
  // Erste Hilfe (GESTIS 0703): Abschnitte stehen als eigene Zeile („Augen:“, „Haut:“, „Atmungsorgane:“, „Verschlucken:“,
  // „Hinweise für den Arzt:“, „Empfehlungen:“, „Anmerkung:“). Zeilen wie „So schnell wie möglich:“ gehören zum Text und werden
  // mit der folgenden Zeile verbunden. Im Arzt-Teil stehen wieder „Augen: …“ usw. (Symptome) – die bleiben beim Arzt.
  function ersteHilfeAuswerten(z, e) {
    const ZIEL = { augen: 'augen', haut: 'haut', atmungsorgane: 'einatmen', einatmen: 'einatmen', inhalation: 'einatmen', verschlucken: 'verschlucken',
                   'hinweise für den arzt': 'arzt', 'hinweise für den ersthelfer': 'allgemein', ersthelfer: 'allgemein', selbstschutz: 'allgemein',
                   allgemein: 'allgemein', 'allgemeine hinweise': 'allgemein', empfehlungen: 'empfehlung', anmerkung: null };
    let akt = null, imArzt = false;
    const dazu = (k, t) => {
      const l = e[k], letzte = l[l.length - 1];
      if (letzte && /:$/.test(letzte) && !/^-/.test(t)) l[l.length - 1] = letzte + ' ' + t; else l.push(t);
    };
    for (let x of z) {
      if (/^ERSTE HILFE/.test(x)) continue;
      x = x.replace(/\s*\[\s*\d{2,5}(?:\s*,\s*\d{2,5})*\s*\]/g, '').trim();          // Quellennummern [07979, 00330]
      if (!x) continue;
      const m = /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß ]{1,38}):\s*(.*)$/.exec(x);
      const name = m ? m[1].trim().toLowerCase() : '';
      if (m && name in ZIEL && (!imArzt || ['hinweise für den arzt', 'empfehlungen', 'anmerkung'].includes(name))) {
        akt = ZIEL[name]; imArzt = akt === 'arzt';
        if (m[2] && akt) x = m[2]; else continue;
      }
      // „Empfehlungen“: „… dem Arzt angeben“ gilt für jeden Helfer, der Rest (Spüllösungen, Medikamente) ist für den Arzt
      if (akt === 'empfehlung') dazu(/arzt angeben|giftinformation|notruf|notarzt/i.test(x) ? 'allgemein' : 'arzt', x);
      else if (akt) dazu(akt, x);
    }
    for (const k of Object.keys(e)) e[k] = e[k].map(t => t.replace(/:$/, '').trim()).filter(Boolean);
  }

  // Passt die gesuchte UN-Nummer zum Datenblatt? (Die GESTIS-Suche nach Nummern trifft auch gleichlautende ZVG-Nummern.)
  function hatUn(roh, un) {
    const k = unterkapitel(roh).find(x => x.drnr === '1108');
    return !!k && k.zeilen.some(z => new RegExp('^UN-Nummer:\\s*' + un + '\\b').test(z));
  }

  return { API, SEITE, anfrageArt, ART_TEXT, suchen, datenblatt, auswerten, hatUn, htmlText, htmlZeilen, unterkapitel,
           setzeAbruf: f => { abruf = f; } };
});
