// Einheitliches Stoffobjekt für den Einsatzbildschirm – gemeinsam für App (Programm und Web-App) und Mac-Helfer.
// Quellen: GESTIS-Stoffdatenbank (gestis.js), Sicherheitsdatenblatt über die Texterkennung (sdb-parser.js) oder über
// Claude (Mac-Helfer bzw. Claude-App auf dem iPhone, Anweisung und Antwortformat unten).
// Alle Werte sind Texte (wie in der Quelle, mit Einheit), damit nichts beim Umrechnen verloren geht; Zahlen für Anzeigen
// (z. B. „schwerer als Luft“) liest die Oberfläche selbst aus dem Text (zahlAus).
// Läuft im Browser (window.GSZStoffdaten) und in Node (require).
'use strict';
(function (wurzel, fabrik) {
  const m = fabrik();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZStoffdaten = m;
})(typeof self !== 'undefined' ? self : this, function () {
  const FORMAT = 'gsz-stoff-1';

  // ------------------------------------------------------------------ Aufbau (leeres Stoffobjekt)
  function leer() {
    return {
      format: FORMAT,
      quelle: '',            // 'gestis' | 'sdb'
      quelleText: '',        // z. B. „GESTIS-Stoffdatenbank (IFA)“, „Sicherheitsdatenblatt – ausgewertet von Claude“
      name: '', synonyme: [], zvg: '', cas: [], eg: '', index: '',
      hersteller: '', stand: '',                          // nur Sicherheitsdatenblatt
      formel: '', molmasse: '',                           // molmasse als Text, z. B. „17,03 g/mol“
      bestandteile: [],                                   // [{ name, cas, anteil, einstufung }] (Gemische)
      aggregatzustand: '', eigenschaften: '', charakterisierung: '',
      kennwerte: {
        luftvergleichszahl: '',   // relative Gasdichte (Luft = 1)
        dampfLuftGemisch: '',     // relative Dichte des Dampf-Luft-Gemisches bei 20 °C (GESTIS)
        dichte: '', siedepunkt: '', schmelzpunkt: '', flammpunkt: '', zuendtemperatur: '', temperaturklasse: '',
        ueg: '', oeg: '', explosionsgruppe: '', dampfdruck: '', loeslichkeit: '', ph: '', agw: '', wgk: '',
      },
      ghs: { piktogramme: [], signalwort: '', h: [], euh: [], p: [], einstufung: [] },   // h/euh/p: [{ code, text }]
      transport: { un: '', bezeichnung: '', kemler: '', klasse: '', klassenText: '', verpackungsgruppe: '', gefahrzettel: [],
                   umweltgefaehrdend: '', tunnel: '', code: '' },
      transporte: [],         // alle Transport-Einträge (ein Stoff kann mehrere UN-Nummern haben); transport = der angezeigte
      loeschmittel: { geeignet: [], ungeeignet: [], brandklasse: '', hinweise: [], psaBrand: [], gefahrenBrand: [] },
      freisetzung: [],
      psa: { atem: [], koerper: [], augen: [], hand: [], handMaterialien: [], hygiene: [] },   // handMaterialien: [{ material, dicke, zeit, stufe }]
      ersteHilfe: { allgemein: [], einatmen: [], haut: [], augen: [], verschlucken: [], arzt: [] },   // arzt: Hinweise für den Arzt
      reaktionen: [],
      dekon: [],              // ausdrückliche Angaben zur Reinigung/Dekontamination (nur Claude; sonst leitet die Oberfläche sie ab)
      entsorgung: [],         // Entsorgung (GESTIS bzw. Abschnitt 13)
      gasflasche: '',
      kapitel: [],            // [{ titel, text }] vollständiges Datenblatt (GESTIS-Kapitel bzw. Abschnitte des Sicherheitsdatenblatts)
      anmerkung: '',          // Hinweis der Auswertung (z. B. „Abschnitt 9 auf dem Foto unleserlich“)
    };
  }

  // ------------------------------------------------------------------ Bereinigen: fehlende Felder ergänzen, Typen sichern
  const text = v => (v === null || v === undefined) ? '' : String(v).replace(/\s+/g, ' ').trim();
  const liste = v => (Array.isArray(v) ? v : (v ? [v] : [])).map(text).filter(Boolean);
  const satzListe = v => (Array.isArray(v) ? v : (v ? [v] : [])).map(x => String(x ?? '').trim()).filter(Boolean);
  const codeListe = v => (Array.isArray(v) ? v : []).map(x => {
    if (typeof x === 'string') { const m = /^((?:EUH|H|P)\d{3}[A-Za-z]{0,2}(?:\s*\+\s*(?:EUH|H|P)\d{3}[A-Za-z]{0,2})*)\s*[:\-–]?\s*(.*)$/.exec(x.trim());
      return m ? { code: m[1].replace(/\s+/g, ''), text: text(m[2]) } : { code: '', text: text(x) }; }
    return { code: text(x && x.code).replace(/\s+/g, ''), text: text(x && x.text) };
  }).filter(x => x.code || x.text);
  const GHS = /^GHS0[1-9]$/;
  function ghsCode(v) {
    const m = /(?:ghs|sgh)\s*0?([1-9])\b/i.exec(String(v || ''));
    return m ? 'GHS0' + m[1] : '';
  }

  function normalisieren(o) {
    const s = leer();
    if (!o || typeof o !== 'object') return s;
    for (const k of ['quelle', 'quelleText', 'name', 'zvg', 'eg', 'index', 'hersteller', 'stand', 'formel', 'molmasse',
                     'aggregatzustand', 'eigenschaften', 'charakterisierung', 'gasflasche', 'anmerkung']) s[k] = text(o[k]);
    s.synonyme = liste(o.synonyme);
    s.cas = [...new Set(liste(o.cas).map(c => c.replace(/\s/g, '')).filter(istCas))];
    s.bestandteile = (Array.isArray(o.bestandteile) ? o.bestandteile : []).map(b => ({
      name: text(b && b.name), cas: text(b && b.cas).replace(/\s/g, ''), anteil: text(b && b.anteil), einstufung: text(b && b.einstufung),
    })).filter(b => b.name || b.cas);
    const kw = o.kennwerte || {};
    for (const k of Object.keys(s.kennwerte)) s.kennwerte[k] = text(kw[k]);
    const g = o.ghs || {};
    s.ghs.piktogramme = [...new Set(liste(g.piktogramme).map(ghsCode).filter(c => GHS.test(c)))].sort();
    s.ghs.signalwort = text(g.signalwort).replace(/^["„“]|["“”]$/g, '');
    s.ghs.h = codeListe(g.h); s.ghs.euh = codeListe(g.euh); s.ghs.p = codeListe(g.p);
    s.ghs.einstufung = liste(g.einstufung);
    s.transport = transportNorm(o.transport);
    s.transporte = (Array.isArray(o.transporte) ? o.transporte : []).map(transportNorm).filter(x => x.un || x.bezeichnung);
    if (!s.transporte.length && (s.transport.un || s.transport.bezeichnung)) s.transporte = [{ ...s.transport, gefahrzettel: [...s.transport.gefahrzettel] }];
    const l = o.loeschmittel || {};
    for (const k of ['geeignet', 'ungeeignet', 'hinweise', 'psaBrand', 'gefahrenBrand']) s.loeschmittel[k] = satzListe(l[k]);
    s.loeschmittel.brandklasse = text(l.brandklasse);
    s.freisetzung = satzListe(o.freisetzung);
    const p = o.psa || {};
    for (const k of ['atem', 'koerper', 'augen', 'hand', 'hygiene']) s.psa[k] = satzListe(p[k]);
    s.psa.handMaterialien = (Array.isArray(p.handMaterialien) ? p.handMaterialien : []).map(h => ({
      material: text(h && h.material), dicke: text(h && h.dicke), zeit: text(h && h.zeit),
      stufe: ['gut', 'bedingt', 'nicht', 'unbekannt'].includes(h && h.stufe) ? h.stufe : 'unbekannt',
      fuer: text(h && h.fuer),      // optional: wofür die Angabe gilt (z. B. „Schwefelsäure 96 %“)
    })).filter(h => h.material);
    const e = o.ersteHilfe || {};
    for (const k of Object.keys(s.ersteHilfe)) s.ersteHilfe[k] = satzListe(e[k]);
    s.reaktionen = satzListe(o.reaktionen);
    s.dekon = satzListe(o.dekon);
    s.entsorgung = satzListe(o.entsorgung);
    s.kapitel = (Array.isArray(o.kapitel) ? o.kapitel : []).map(k => ({ titel: text(k && k.titel), text: String((k && k.text) || '').trim(),
      gruppe: text(k && k.gruppe) }))      // gruppe: Hauptkapitel (GESTIS), sonst leer
      .filter(k => k.titel || k.text);
    return s;
  }

  function transportNorm(t) {
    t = t || {};
    const r = {};
    for (const k of ['un', 'bezeichnung', 'kemler', 'klasse', 'klassenText', 'verpackungsgruppe', 'umweltgefaehrdend', 'tunnel', 'code']) r[k] = text(t[k]);
    r.un = r.un.replace(/^UN\s*/i, '').replace(/\D/g, '').slice(0, 4);
    // „33/30“ oder „X423/423“: angezeigt wird die erste Nummer (die übrigen stehen im Text)
    r.kemlerAlle = r.kemler;
    r.kemler = (r.kemler.split(/[\/,; ]+/)[0] || '').replace(/[^0-9X]/gi, '').toUpperCase().slice(0, 4);
    r.gefahrzettel = [...new Set(liste(t.gefahrzettel).flatMap(z => z.split(/[\/,;+ ]+/)).map(z => z.trim())
      .filter(z => /^(1(\.[1-6])?|2\.[1-3]|3|4\.[1-3]|5\.[12]|6\.[12]|7[A-E]?|8|9A?)$/.test(z)))];
    return r;
  }

  // CAS-Nummer mit Prüfziffer
  function istCas(c) {
    const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(String(c || '').trim());
    if (!m) return false;
    const ziffern = (m[1] + m[2]).split('').reverse();
    const summe = ziffern.reduce((s, z, i) => s + Number(z) * (i + 1), 0);
    return summe % 10 === Number(m[3]);
  }

  // Erste Zahl aus einem Text (deutsches Komma), z. B. „0,60“ → 0.6, „< -20 °C“ → -20
  function zahlAus(t) {
    const m = /(-|−|–)?\s*(\d+(?:[.,]\d+)?)/.exec(String(t || ''));
    if (!m) return null;
    const z = Number(m[2].replace(',', '.'));
    return m[1] ? -z : z;
  }

  // ------------------------------------------------------------------ Anzeige: Werte lesbar schreiben
  // „30 ... 215 °C“ → „30 bis 215 °C“, „-30 C°“ → „−30 °C“, „mg/m3“ → „mg/m³“, „8,5737 bar“ → „8,57 bar“, „<50 %“ → „< 50 %“.
  // Nur für die Anzeige – gespeichert bleibt der Originaltext.
  const LEER_WERT = /^(?:-|–|—|\/|n\.?\s?[ab]\.?|k\.?\s?a\.?|keine?\b.*|nicht\s+(?:bestimmt|anwendbar|verfügbar|vorhanden|zutreffend|relevant|ermittelt|geprüft|bekannt)\b.*|entfällt|unbekannt|not\s+(?:determined|applicable|available).*|no\s+data.*)$/i;
  function leerWert(t) { return !String(t || '').trim() || LEER_WERT.test(String(t).trim()); }
  const ZAHL = '[<>≤≥]?\\s?[-−]?\\s?\\d+(?:[.,]\\d+)?';
  function rundenText(z) {
    const n = Number(z.replace(',', '.'));
    if (!isFinite(n)) return z;
    const r = Math.abs(n) >= 1 ? n.toFixed(2) : Number(n.toPrecision(3)).toString();
    return r.replace('.', ',');
  }
  function wertSchoen(t) {
    let s = String(t ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    s = s.replace(/\s?C\s?°(?![CF])/g, ' °C').replace(/°\s+C\b/g, '°C').replace(/(\d)\s?°C/g, '$1 °C')          // Grad Celsius
      .replace(/(\d)\s?(?:\.\.\.|…|\.\s\.\s\.)\s?/g, '$1 bis ')                                                 // Bereich mit Punkten
      .replace(/\s(?:\.\.\.|…)\s?(?=[<>≤≥]?\s?[-−]?\d)/g, ' bis ')
      .replace(new RegExp(`(\\d)\\s+[-–]\\s+(?=${ZAHL})`, 'g'), '$1 bis ')                                       // „100 - 102“
      .replace(/(^|[\s(\/;:])-(?=\d)/g, '$1−')                                                                 // Minuszeichen
      .replace(/<\s?=/g, '≤').replace(/>\s?=/g, '≥')                                                          // „<=“ → „≤“
      .replace(/([<>≤≥])(?=[−\d])/g, '$1 ')                                                                    // „<50“ → „< 50“
      .replace(/\b(c|d)?m3\b/g, (m, v) => (v || '') + 'm³').replace(/\b(c|d)?m2\b/g, (m, v) => (v || '') + 'm²')
      .replace(/(\d+,\d{4,})(?!\d)/g, z => rundenText(z))                                                     // 8,5737 → 8,57
      .replace(/\s{2,}/g, ' ').trim();
    // Bereich in falscher Reihenfolge („−90,5 bis −95,4“) → aufsteigend
    s = s.replace(/(−?\d+(?:,\d+)?) bis (−?\d+(?:,\d+)?)/g, (m, a, b) => {
      const x = Number(a.replace('−', '-').replace(',', '.')), y = Number(b.replace('−', '-').replace(',', '.'));
      return isFinite(x) && isFinite(y) && x > y ? `${b} bis ${a}` : m;
    });
    return s;
  }
  // Hauptwert und Zusatz trennen: „1,18 g/cm³ (25 °C, 37 %ige Lösung)“ → { wert: '1,18 g/cm³', zusatz: 'bei 25 °C, 37 %ige Lösung' }
  function wertTeilen(t) {
    const s = wertSchoen(t);
    const m = /^(.+?)\s*\(([^()]+)\)\s*$/.exec(s);
    if (!m || !/\d/.test(m[1])) {
      const b = /^(.*\d.*?)\s+(bei\s+[<>≤≥]?\s?−?\d.*)$/.exec(s);            // „ca. 1,2 g/cm³ bei 20 °C“
      return b ? { wert: b[1], zusatz: b[2] } : { wert: s, zusatz: '' };
    }
    let z = m[2].trim();
    if (/^[<>≤≥]?\s?−?\d+(?:,\d+)?\s?°C\b/.test(z)) z = 'bei ' + z;
    return { wert: m[1].trim(), zusatz: z };
  }

  // ------------------------------------------------------------------ Claude: Anweisung und Antwortformat (Sicherheitsdatenblatt)
  const T = { type: 'string' };
  const L = items => ({ type: 'array', items });
  const O = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
  const CODE = O({ code: T, text: T });
  const SCHEMA = O({
    ist_datenblatt: { type: 'boolean' },
    name: T, synonyme: L(T), cas: L(T), eg: T, index: T, hersteller: T, stand: T, formel: T, molmasse: T,
    bestandteile: L(O({ name: T, cas: T, anteil: T, einstufung: T })),
    aggregatzustand: T, eigenschaften: T, charakterisierung: T,
    kennwerte: O({ luftvergleichszahl: T, dampfLuftGemisch: T, dichte: T, siedepunkt: T, schmelzpunkt: T, flammpunkt: T,
                   zuendtemperatur: T, temperaturklasse: T, ueg: T, oeg: T, explosionsgruppe: T, dampfdruck: T, loeslichkeit: T,
                   ph: T, agw: T, wgk: T }),
    ghs: O({ piktogramme: L(T), signalwort: T, h: L(CODE), euh: L(CODE), p: L(CODE), einstufung: L(T) }),
    transport: O({ un: T, bezeichnung: T, kemler: T, klasse: T, klassenText: T, verpackungsgruppe: T, gefahrzettel: L(T),
                   umweltgefaehrdend: T, tunnel: T, code: T }),
    loeschmittel: O({ geeignet: L(T), ungeeignet: L(T), brandklasse: T, hinweise: L(T), psaBrand: L(T), gefahrenBrand: L(T) }),
    freisetzung: L(T),
    psa: O({ atem: L(T), koerper: L(T), augen: L(T), hand: L(T), handMaterialien: L(O({ material: T, dicke: T, zeit: T, stufe: T })), hygiene: L(T) }),
    ersteHilfe: O({ allgemein: L(T), einatmen: L(T), haut: L(T), augen: L(T), verschlucken: L(T), arzt: L(T) }),
    reaktionen: L(T),
    dekon: L(T),
    entsorgung: L(T),
    gasflasche: T,
    anmerkung: T,
  });

  const SDB_ANWEISUNG = [
    'Du wertest für die Feuerwehr (Gefahrstoffzug) ein Sicherheitsdatenblatt (SDB) aus und überträgst die einsatzwichtigen Angaben in ein festes Datenformat. Die Vorlage sind Fotos, ein PDF oder der per Texterkennung gelesene Text eines SDB (meist nach REACH Anhang II mit 16 Abschnitten).',
    '',
    'Grundsätze:',
    '- Schreibe auf Deutsch. Ist das Datenblatt in einer anderen Sprache, übersetze sinngemäß.',
    '- Übernimm nur, was im Datenblatt steht. Nichts erfinden, nichts aus eigenem Wissen ergänzen – auch keine CAS-Nummern, UN-Nummern oder Kennwerte. Fehlt eine Angabe oder ist sie unleserlich, bleibt das Feld leer ("" bzw. []). Unsicheres oder Unleserliches in anmerkung nennen.',
    '- Werte mit Einheit und Bedingung so wie im Datenblatt, z. B. "0,79 g/cm³ (20 °C)", "-20 °C (geschlossener Tiegel)", "2,5 Vol.-%". Angaben wie "nicht anwendbar" oder "keine Daten verfügbar" nicht übernehmen (leer lassen).',
    '- Texte (Löschmittel, PSA, Maßnahmen) als kurze, vollständige Punkte – einer pro Listeneintrag, wie im Datenblatt, ohne Aufzählungszeichen.',
    '',
    'Felder:',
    '- ist_datenblatt: false, wenn die Vorlage kein Sicherheitsdatenblatt ist (dann alles andere leer).',
    '- name: Handelsname bzw. Stoffbezeichnung (Abschnitt 1.1); synonyme: weitere Bezeichnungen; hersteller: Lieferant (1.3); stand: Überarbeitungs- oder Druckdatum.',
    '- cas: CAS-Nummern des Stoffes bzw. der gefährlichen Bestandteile (1.1, 3.1/3.2); eg, index: EG- und Index-Nummer (bei Stoffen); formel: Summenformel; molmasse: molare Masse mit Einheit.',
    '- bestandteile: gefährliche Bestandteile aus Abschnitt 3 (name, cas, anteil wie "10–25 %", einstufung als Kurztext wie "Flam. Liq. 2, H225; Eye Irrit. 2, H319").',
    '- aggregatzustand: "gasförmig", "flüssig" oder "fest" (bei Bedarf mit Zusatz, z. B. "flüssig (unter Druck verflüssigtes Gas)"); eigenschaften: Farbe und Geruch (9.1); charakterisierung: was der Stoff ist (z. B. "Reinigungsmittel, alkalisch").',
    '- kennwerte (9.1, Arbeitsplatzgrenzwerte aus 8.1, WGK aus 15): luftvergleichszahl = relative Dampfdichte bzw. relative Gasdichte (Luft = 1), dampfLuftGemisch leer lassen, dichte, siedepunkt (Siedebeginn/Siedebereich), schmelzpunkt, flammpunkt, zuendtemperatur, temperaturklasse (z. B. "T1"), ueg und oeg (untere/obere Explosionsgrenze), explosionsgruppe, dampfdruck, loeslichkeit (Wasserlöslichkeit), ph, agw (Arbeitsplatzgrenzwert mit Einheit), wgk (Wassergefährdungsklasse, z. B. "WGK 1 – schwach wassergefährdend").',
    '- ghs (Abschnitt 2.2): piktogramme als Codes "GHS01" … "GHS09" (aus Text oder Abbildung, z. B. Flamme = GHS02, Ätzwirkung = GHS05, Totenkopf = GHS06, Ausrufezeichen = GHS07, Gesundheitsgefahr = GHS08, Umwelt = GHS09, Gasflasche = GHS04, Flamme über Kreis = GHS03, Bombe = GHS01); signalwort ("Gefahr" oder "Achtung"); h, euh und p als { code, text } (z. B. { "code": "H225", "text": "Flüssigkeit und Dampf leicht entzündbar." }; kombinierte P-Sätze wie "P303+P361+P353" als ein Code); einstufung: Gefahrenklassen und -kategorien als Kurztext.',
    '- transport (Abschnitt 14, Straße/ADR): un (nur die vierstellige Nummer), bezeichnung (offizielle Benennung), kemler (Nummer zur Kennzeichnung der Gefahr, falls angegeben), klasse (z. B. "3", "2.3", "8"), klassenText, verpackungsgruppe ("I", "II" oder "III"), gefahrzettel (Nummern der Gefahrzettel, z. B. ["3"] oder ["2.3", "8"]), umweltgefaehrdend ("ja"/"nein"), tunnel (Tunnelbeschränkungscode), code (Klassifizierungscode). Ist das Produkt kein Gefahrgut, bezeichnung = "kein Gefahrgut im Sinne der Transportvorschriften" und sonst leer.',
    '- loeschmittel (Abschnitt 5): geeignet, ungeeignet, brandklasse (falls genannt), hinweise (besondere Hinweise für die Brandbekämpfung, 5.3), psaBrand (Schutzausrüstung bei der Brandbekämpfung), gefahrenBrand (besondere Gefahren, gefährliche Verbrennungsprodukte, 5.2).',
    '- freisetzung (Abschnitt 6): personenbezogene Vorsichtsmaßnahmen, Umweltschutz und Verfahren zum Aufnehmen/Eindämmen.',
    '- psa (Abschnitt 8.2): atem (Atemschutz, mit Filtertyp und Kennfarbe, falls genannt), koerper, augen, hand (Text zum Handschutz), handMaterialien (je Handschuhmaterial: material, dicke, zeit = Durchbruchzeit, stufe = "gut" bei Durchbruchzeit ≥ 480 min bzw. als geeignet empfohlen, "bedingt" bei kürzerer Zeit oder Einschränkung, "nicht" bei ungeeignet, sonst "unbekannt"), hygiene.',
    '- ersteHilfe (Abschnitt 4): allgemein (auch Selbstschutz des Ersthelfers), einatmen, haut, augen, verschlucken, arzt (4.2 Symptome und 4.3 Hinweise für den Arzt, kurz).',
    '- dekon: alles, was das Datenblatt zur Reinigung bzw. Dekontamination von Personen, Kleidung, Ausrüstung, Geräten und Flächen sagt (z. B. aus 4, 6.3, 7.1, 8.2: „Kontaminierte Kleidung vor erneutem Tragen waschen“, „mit viel Wasser und Seife reinigen“, „Mit Neutralisationsmittel aufnehmen“, „Nicht mit Wasser in Berührung bringen“) – nur aus dem Datenblatt.',
    '- entsorgung (Abschnitt 13): kurze Punkte zur Entsorgung des Produkts, verunreinigter Bindemittel und Verpackungen.',
    '- reaktionen (Abschnitt 10): gefährliche Reaktionen, zu vermeidende Bedingungen und unverträgliche Stoffe, gefährliche Zersetzungsprodukte.',
    '- gasflasche: Farbkennzeichnung der Gasflasche, falls genannt.',
    '- anmerkung: ein bis zwei kurze Sätze, was fehlte, unleserlich war oder bei einem Gemisch zu beachten ist; leer, wenn alles eindeutig war.',
  ].join('\n');

  // Anfrage für die Claude-App (iPhone): nur Text (aus der Texterkennung), Antwort als JSON im obigen Format
  const MAX_TEXT = 60000;
  function anfrageText(ocrText, { id = '', dateiname = '' } = {}) {
    let inhalt = String(ocrText || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    let gekuerzt = false;
    if (inhalt.length > MAX_TEXT) { inhalt = inhalt.slice(0, MAX_TEXT); gekuerzt = true; }
    return [
      'Gefahrstoffzug-App: Bitte dieses Sicherheitsdatenblatt auswerten.' + (id ? ' (Auftrag ' + id + ')' : ''),
      '',
      SDB_ANWEISUNG,
      '',
      'Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in genau diesem Aufbau (alle Felder immer vorhanden, leere Werte als "" bzw. []), ohne Erklärungen, ohne Markdown:',
      JSON.stringify(beispielAntwort()),
      '',
      'Die Vorlage wurde per Texterkennung aus Fotos oder einem PDF gelesen' + (dateiname ? ' (' + dateiname + ')' : '') +
        '; einzelne Zeichen können verlesen, Tabellenspalten vermischt sein. Setze die Angaben sinnvoll zusammen, ohne etwas zu erfinden.',
      gekuerzt ? '(Der Text wurde am Ende gekürzt.)' : '',
      '',
      '--- VORLAGE ---',
      inhalt,
      '--- ENDE ---',
    ].filter((z, i, a) => z !== '' || a[i - 1] !== '').join('\n');
  }
  // Leeres Objekt im Antwortformat (für die Anfrage und die Tests)
  function beispielAntwort() {
    const leerAus = s => s.type === 'object' ? Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, leerAus(v)]))
      : s.type === 'array' ? [] : s.type === 'boolean' ? true : '';
    return leerAus(SCHEMA);
  }

  // Claudes Antwort (Text, auch mit ```json-Block oder Text drumherum) → Stoffobjekt
  function antwortLesen(antwort, quelleText = 'Sicherheitsdatenblatt – ausgewertet von Claude') {
    let t = typeof antwort === 'string' ? antwort.trim() : '';
    let daten = antwort && typeof antwort === 'object' ? antwort : null;
    if (!daten) {
      if (!t) throw new Error('Die Antwort ist leer.');
      const block = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
      if (block) t = block[1].trim();
      t = t.replace(/[“”„]/g, m => (m === '„' ? '"' : '"'));
      const start = t.indexOf('{');
      if (start < 0) throw new Error('In der Antwort steht kein Ergebnis im App-Format.');
      let tiefe = 0, inText = false, escape = false, ende = -1;
      for (let i = start; i < t.length; i++) {
        const c = t[i];
        if (inText) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') inText = false; continue; }
        if (c === '"') inText = true;
        else if (c === '{') tiefe++;
        else if (c === '}') { tiefe--; if (tiefe === 0) { ende = i; break; } }
      }
      if (ende < 0) throw new Error('Die Antwort ist unvollständig – vermutlich abgeschnitten.');
      let roh = t.slice(start, ende + 1);
      try { daten = JSON.parse(roh); } catch (e) {
        roh = roh.replace(/,\s*([}\]])/g, '$1');
        try { daten = JSON.parse(roh); } catch (f) { throw new Error('Die Antwort ist kein gültiges JSON: ' + f.message); }
      }
    }
    if (daten.ist_datenblatt === false) throw new Error('Claude hat in der Vorlage kein Sicherheitsdatenblatt gefunden.');
    const s = normalisieren({ ...daten, quelle: 'sdb', quelleText });
    if (!s.name && !s.cas.length && !s.transport.un) throw new Error('Die Auswertung enthält weder Namen noch CAS- oder UN-Nummer.');
    return s;
  }

  // ------------------------------------------------------------------ Zusammenführen (Claude ergänzt bzw. ersetzt die Texterkennung)
  // vorrang: Ergebnis mit Vorrang (Claude); rueckfall: Ergebnis der Texterkennung. Leere Felder füllt der Rückfall.
  function zusammenfuehren(vorrang, rueckfall) {
    const a = normalisieren(vorrang), b = normalisieren(rueckfall);
    const mische = (x, y) => {
      if (Array.isArray(x)) return x.length ? x : y;
      if (x && typeof x === 'object') { const r = {}; for (const k of Object.keys(x)) r[k] = mische(x[k], y ? y[k] : undefined); return r; }
      return x !== '' && x !== undefined ? x : (y ?? '');
    };
    const r = mische(a, b);
    r.quelle = a.quelle || b.quelle; r.quelleText = a.quelleText || b.quelleText;
    r.kapitel = b.kapitel.length ? b.kapitel : a.kapitel;      // Abschnitte bleiben die des gelesenen Textes
    return r;
  }

  return { FORMAT, leer, normalisieren, istCas, zahlAus, ghsCode, SCHEMA, SDB_ANWEISUNG, anfrageText, beispielAntwort,
           antwortLesen, zusammenfuehren, MAX_TEXT, wertSchoen, wertTeilen, leerWert };
});
