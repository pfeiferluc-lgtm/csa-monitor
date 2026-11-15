// Beständigkeitslisten: Format der geordneten Fassung (bestaendigkeit.json), Auswertung über Claude (Mac-Helfer) und
// Abgleich mit einem Stoff (Einsatzbildschirm › Beständigkeiten). Gemeinsam für App und Mac-Helfer.
//
// Ablage im Dropbox-App-Ordner: Einsatz/Beständigkeitslisten/<Gerät>/ mit
//   Foto des Geräts      Bilddatei, deren Name mit „Foto“, „Bild“ oder „Gerät“ beginnt (sonst: das einzige Bild neben PDFs)
//   Original-Liste(n)    PDF und/oder Bilder (Fotos/Scans der Liste)
//   info.txt             optional: Werkstoffe und Hinweise zum Gerät, z. B. „Werkstoff Schlauch: CSM (Hypalon)“
//   bestaendigkeit.json  geordnete Fassung – legt der Mac-Helfer an (ungeprüft), Claude prüft sie auf Zuruf
//
// Stufen: gut (beständig) · bedingt · nicht (nicht beständig) · unbekannt (keine Angabe/nicht geprüft)
// Läuft im Browser (window.GSZBestaendigkeit) und in Node (require).
'use strict';
(function (wurzel, fabrik) {
  const m = fabrik();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZBestaendigkeit = m;
})(typeof self !== 'undefined' ? self : this, function () {
  const FORMAT = 'gsz-bestaendigkeit-1';
  const STUFEN = ['gut', 'bedingt', 'nicht', 'unbekannt'];
  const STUFE_TEXT = { gut: 'beständig', bedingt: 'bedingt beständig', nicht: 'nicht beständig', unbekannt: 'keine Angabe',
                       gemischt: 'je nach Werkstoff verschieden', offen: 'Liste noch nicht ausgewertet', keine: 'Stoff nicht in der Liste' };
  const RANG = { nicht: 0, bedingt: 1, unbekannt: 2, gut: 3 };          // schlechteste Stufe gewinnt
  const KATEGORIEN = ['Schutzkleidung', 'Abdichten', 'Auffangen', 'Pumpen', 'Schläuche', 'Fahrzeuge', 'Sonstiges'];
  const DATEI = 'bestaendigkeit.json';

  // ------------------------------------------------------------------ Dateien eines Geräteordners einordnen
  const BILD = /\.(jpe?g|png|webp|gif|heic|heif)$/i, PDF = /\.pdf$/i;
  const FOTO_NAME = /^(foto|bild|ger(ä|ae)t|photo|image)/i;
  // dateien: Namen im Geräteordner → { foto, quellen: [Namen der Original-Listen], info }
  function ordnerEinteilen(dateien) {
    const namen = (dateien || []).filter(n => n && !n.startsWith('.') && !/^bestaendigkeit(\..*)?\.json$/i.test(n));
    const bilder = namen.filter(n => BILD.test(n)), pdfs = namen.filter(n => PDF.test(n));
    let foto = bilder.find(n => FOTO_NAME.test(n)) || null;
    if (!foto && bilder.length === 1 && pdfs.length) foto = bilder[0];
    const quellen = [...pdfs, ...bilder.filter(n => n !== foto)].sort((a, b) => a.localeCompare(b, 'de'));
    const info = namen.find(n => /^info\.(txt|md)$/i.test(n)) || null;
    return { foto, quellen, info };
  }
  // Ordnername „27 ELRO Schlauchpumpe“ bzw. „Nr.27 ELRO …“ → { nr: '27', name: 'ELRO Schlauchpumpe' }
  function ordnerName(ordner) {
    const m = /^\s*(?:nr\.?\s*)?(\d{1,3})[\s._-]+(.+)$/i.exec(String(ordner || ''));
    return m ? { nr: m[1], name: m[2].trim() } : { nr: '', name: String(ordner || '').trim() };
  }

  // ------------------------------------------------------------------ Claude: Anweisung und kompaktes Antwortformat
  // Kompakt (spart Ausgabe bei langen Tabellen): Werte je Eintrag als Liste in der Reihenfolge von kopf.spalten.
  const T = { type: 'string' };
  const L = items => ({ type: 'array', items });
  const O = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
  const KOPF = O({
    titel: T, hersteller: T, art: T, stand: T, bedingungen: T, kategorie: T,
    spalten: L(O({ id: T, name: T })),
    relevant: L(T),
    legende: L(O({ zeichen: T, text: T, stufe: T })),
    schwellen: O({ gut_ab_minuten: T, bedingt_ab_minuten: T }),
    werkstoffe: L(T),
    hinweise: L(T),
  });
  const EINTRAG = O({ stoff: T, cas: T, konz: T, temp: T, werte: L(T), seite: T, hinweis: T });
  const SCHEMA = O({ ist_liste: { type: 'boolean' }, kopf: KOPF, eintraege: L(EINTRAG), anmerkung: T });

  const ANWEISUNG = [
    'Du überträgst für die Feuerwehr (Gefahrstoffzug) eine Chemikalien-Beständigkeitsliste eines Herstellers in ein festes Datenformat. Die Liste gehört zu einem Ausrüstungsgegenstand (z. B. Chemikalienschutzanzug, Handschuh, Pumpe, Schlauch, Auffangbehälter, Dichtkissen).',
    '',
    'Es ist sicherheitskritisch: Ein Lesefehler („beständig“ statt „nicht beständig“) kann im Einsatz Menschen gefährden. Deshalb:',
    '- Übertrage jeden Eintrag genau so, wie er in der Liste steht. Nichts erfinden, nichts aus eigenem Wissen ergänzen, keine Einträge zusammenfassen oder weglassen.',
    '- Bewertungszeichen genau unterscheiden (z. B. ● gefüllt = sehr gut, ○ leer = gut, △ = bedingt, ✕ = nicht beständig). Ist ein Zeichen nicht sicher erkennbar, schreibe "?" und nenne den Stoff in anmerkung.',
    '- Leere Zellen bleiben "" (= keine Angabe / nicht geprüft).',
    '',
    'Felder:',
    '- ist_liste: false, wenn die Vorlage keine Beständigkeits- oder Permeationsliste ist (dann alles andere leer).',
    '- kopf.titel: Titel der Liste; hersteller; stand (Datum/Jahr); bedingungen (z. B. "bei 20 °C, sofern nicht anders angegeben").',
    '- kopf.art: "werkstoff" (Beständigkeit von Werkstoffen, meist Zeichen oder Klassen), "permeation" (Durchbruchzeiten in Minuten, z. B. für Schutzanzüge oder Handschuhe) oder "eignung" (geeignet/nicht geeignet für ein Produkt, z. B. Bindemittel).',
    '- kopf.kategorie: eine aus Schutzkleidung, Abdichten, Auffangen, Pumpen, Schläuche, Fahrzeuge, Sonstiges.',
    '- kopf.spalten: die Bewertungsspalten der Liste in der Reihenfolge der Tabelle, je { id: kurze Kennung wie "NBR", "PTFE", "Edelstahl 316L" oder "Durchbruchzeit", name: ausgeschriebener Name, z. B. "NBR (Nitrilkautschuk)" }.',
    '- kopf.relevant: die ids der Spalten, die für das Gerät gelten, soweit bekannt (aus den Angaben zum Gerät, z. B. Werkstoff des Schlauchs); sonst [] (dann gelten alle).',
    '- kopf.legende: alle Bewertungszeichen bzw. -klassen mit Bedeutung und stufe: "gut" (beständig/sehr gut/gut/geeignet), "bedingt" (bedingt/eingeschränkt beständig), "nicht" (nicht beständig/ungeeignet) oder "unbekannt" (nicht geprüft/keine Angabe).',
    '- kopf.schwellen: nur bei art "permeation": ab wie vielen Minuten Durchbruchzeit "gut" bzw. "bedingt" gilt, wenn die Liste das vorgibt; sonst "480" und "30".',
    '- kopf.werkstoffe: Werkstoffe des Geräts, falls aus Liste oder Geräteangaben ersichtlich; kopf.hinweise: wichtige allgemeine Hinweise der Liste (Konzentration, Temperatur, Gewährleistung) in kurzen Sätzen.',
    '- eintraege: jede Zeile der Tabelle ein Eintrag: stoff (Name wie in der Liste, mit Zusätzen wie "wässrig"), cas (nur, wenn in der Liste angegeben), konz (Konzentration, falls angegeben), temp (Temperatur, falls angegeben), werte (ein Wert je Spalte in der Reihenfolge von kopf.spalten: das Zeichen bzw. die Klasse oder die Durchbruchzeit in Minuten wie ">480"; "" für leer), seite (Seitennummer der Vorlage), hinweis (Fußnote oder Bemerkung zur Zeile). Verweiszeilen wie "Bleichlauge – siehe Natriumhypochloritlauge" als Eintrag mit leeren werten und dem Verweis in hinweis.',
    '- anmerkung: was unsicher oder unleserlich war; leer, wenn alles eindeutig war.',
  ].join('\n');

  // ------------------------------------------------------------------ Kompakte Antwort (eine oder mehrere Teile) → bestaendigkeit.json
  const text = v => (v === null || v === undefined) ? '' : String(v).replace(/\s+/g, ' ').trim();
  function minutenAus(roh) {
    const m = /(\d+(?:[.,]\d+)?)/.exec(String(roh || ''));
    return m ? Number(m[1].replace(',', '.')) : null;
  }
  // Stufe eines Rohwerts nach Legende bzw. Durchbruchzeit
  function stufeAus(roh, kopf) {
    const r = text(roh);
    if (!r || r === '-' || r === '–') return 'unbekannt';
    if (r === '?') return 'unbekannt';
    const leg = (kopf.legende || []).find(l => text(l.zeichen) && text(l.zeichen) === r);
    if (leg && STUFEN.includes(leg.stufe)) return leg.stufe;
    if (kopf.art === 'permeation') {
      const min = minutenAus(r);
      if (min === null) return 'unbekannt';
      const gut = Number(kopf.schwellen && kopf.schwellen.gut_ab_minuten) || 480;
      const bed = Number(kopf.schwellen && kopf.schwellen.bedingt_ab_minuten) || 30;
      if (/^</.test(r)) return min <= bed ? 'nicht' : 'bedingt';
      return min >= gut ? 'gut' : min >= bed ? 'bedingt' : 'nicht';
    }
    if (/^(nicht|ungeeignet|nein|unbeständig|x|✕|✗|×)/i.test(r)) return 'nicht';
    if (/^(bedingt|eingeschränkt|begrenzt)/i.test(r)) return 'bedingt';
    if (/^(beständig|sehr gut|gut|geeignet|ja|\+)/i.test(r)) return 'gut';
    return 'unbekannt';
  }
  // teile: Antworten von Claude (kompakt, je Seitenbereich); geraet: { ordner, info }
  function ausClaude(teile, { ordner = '', info = '', dateien = [], modell = '', quelleHash = '', jetzt = new Date() } = {}) {
    teile = (Array.isArray(teile) ? teile : [teile]).filter(t => t && t.ist_liste !== false && t.kopf);
    if (!teile.length) throw new Error('Claude hat in der Vorlage keine Beständigkeitsliste gefunden.');
    const kopf = teile[0].kopf;
    const spalten = (kopf.spalten || []).map(s => ({ id: text(s.id), name: text(s.name) || text(s.id) })).filter(s => s.id);
    if (!spalten.length) throw new Error('In der Liste wurden keine Bewertungsspalten erkannt.');
    const legende = (kopf.legende || []).map(l => ({ zeichen: text(l.zeichen), text: text(l.text), stufe: STUFEN.includes(l.stufe) ? l.stufe : 'unbekannt' }));
    const k = { art: ['werkstoff', 'permeation', 'eignung'].includes(kopf.art) ? kopf.art : 'werkstoff', legende, schwellen: kopf.schwellen || {} };
    const eintraege = [], unsicher = [];
    for (const t of teile) for (const e of t.eintraege || []) {
      const stoff = text(e.stoff);
      if (!stoff) continue;
      const werte = {};
      spalten.forEach((s, i) => { const roh = text((e.werte || [])[i]); werte[s.id] = { roh, stufe: stufeAus(roh, k) }; if (roh === '?') unsicher.push(stoff); });
      eintraege.push({ stoff, cas: text(e.cas).replace(/\s/g, ''), konz: text(e.konz), temp: text(e.temp), werte,
                       seite: text(e.seite), hinweis: text(e.hinweis) });
    }
    const relevant = (kopf.relevant || []).map(text).filter(id => spalten.some(s => s.id === id));
    const g = ordnerName(ordner);
    const anmerkungen = teile.map(t => text(t.anmerkung)).filter(Boolean);
    if (unsicher.length) anmerkungen.push('Unsicher gelesen: ' + [...new Set(unsicher)].slice(0, 30).join(', '));
    return {
      format: FORMAT,
      geraet: { nr: g.nr, name: g.name, kategorie: KATEGORIEN.includes(text(kopf.kategorie)) ? text(kopf.kategorie) : 'Sonstiges',
                hersteller: text(kopf.hersteller), werkstoffe: (kopf.werkstoffe || []).map(text).filter(Boolean),
                info: text(info) },
      liste: { titel: text(kopf.titel), dateien, art: k.art, stand: text(kopf.stand), bedingungen: text(kopf.bedingungen),
               spalten, relevant, legende, schwellen: k.art === 'permeation' ? { gut_ab_minuten: text(k.schwellen.gut_ab_minuten) || '480',
               bedingt_ab_minuten: text(k.schwellen.bedingt_ab_minuten) || '30' } : null,
               hinweise: (kopf.hinweise || []).map(text).filter(Boolean) },
      eintraege,
      auswertung: { von: 'Mac-Helfer (Claude)', am: jetzt.toISOString(), modell, geprueft: false, pruefung: null,
                    quelle_hash: quelleHash, anmerkung: anmerkungen.join(' ') },
    };
  }

  // ------------------------------------------------------------------ Datei prüfen (beim Laden in der App)
  function pruefen(d) {
    if (!d || d.format !== FORMAT || !d.liste || !Array.isArray(d.eintraege)) throw new Error('Keine geordnete Beständigkeitsliste (Format unbekannt).');
    d.liste.spalten = (d.liste.spalten || []).filter(s => s && s.id);
    d.liste.relevant = (d.liste.relevant || []).filter(id => d.liste.spalten.some(s => s.id === id));
    d.geraet = d.geraet || {};
    d.auswertung = d.auswertung || { geprueft: false };
    for (const e of d.eintraege) { e.werte = e.werte || {}; for (const s of d.liste.spalten) if (!e.werte[s.id]) e.werte[s.id] = { roh: '', stufe: 'unbekannt' }; }
    return d;
  }

  // Gesamtstufe eines Eintrags für das Gerät: schlechteste der relevanten Spalten. Fehlt in einer relevanten Spalte die
  // Angabe, ist das Gerät insgesamt „unbekannt“ (es sei denn, eine andere Spalte ist „nicht“ oder „bedingt“).
  function gesamtStufe(eintrag, liste) {
    const ids = liste.relevant && liste.relevant.length ? liste.relevant : liste.spalten.map(s => s.id);
    const stufen = ids.map(id => (eintrag.werte[id] && eintrag.werte[id].stufe) || 'unbekannt');
    if (!stufen.length) return 'unbekannt';
    if (!liste.relevant || !liste.relevant.length) {
      // ohne festgelegte Spalten (mehrere Werkstoffe zur Auswahl): bestes Ergebnis zählt nicht – das Gerät ist nur so gut
      // wie der Werkstoff, aus dem es besteht. Ohne Zuordnung deshalb: alle gleich → diese Stufe, sonst „unbekannt“ (gemischt)
      const bekannt = stufen.filter(s => s !== 'unbekannt');
      if (!bekannt.length) return 'unbekannt';
      if (liste.spalten.length === 1) return bekannt[0];
      return bekannt.every(s => s === bekannt[0]) && bekannt.length === stufen.length ? bekannt[0] : 'gemischt';
    }
    return stufen.reduce((a, b) => (RANG[b] < RANG[a] ? b : a), 'gut');
  }

  // ------------------------------------------------------------------ Abgleich mit einem Stoff
  const ERSETZEN = [[/ß/g, 'ss'], [/ä/g, 'ae'], [/ö/g, 'oe'], [/ü/g, 'ue'], [/[àáâ]/g, 'a'], [/[èéê]/g, 'e']];
  function grund(s) {
    let t = String(s || '').normalize('NFC').toLowerCase();
    for (const [a, b] of ERSETZEN) t = t.replace(a, b);
    return t.replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Kern des Namens ohne Zusätze (Konzentration, wässrig, Lösung …) für den Vergleich
  const ZUSAETZE = /\b(waessrig|wasserfrei|loesung|loesungen|konz|konzentriert|verduennt|techn|technisch|rein|reinst|gesaettigt|fluessig|fest|gasfoermig|gas|dampf|dampfe|ca|bis|und|oder|in|wasser|ige?|iger)\b/g;
  // Prozentangaben („30 %“, „10 % ige“) zuerst, dann Zusätze
  function kern(s) { return grund(s).replace(/\d+(?:\s\d+)?\s?%/g, ' ').replace(/\b\d+\b/g, ' ').replace(ZUSAETZE, ' ').replace(/\s+/g, ' ').trim(); }

  // stoff: { name, synonyme[], cas[] } → Treffer [{ eintrag, art: 'cas'|'name'|'aehnlich' }]
  function finde(liste, stoff) {
    const cas = new Set((stoff.cas || []).map(c => String(c).trim()));
    const namen = [stoff.name, ...(stoff.synonyme || [])].filter(Boolean);
    const voll = new Set(namen.map(grund)), kerne = new Set(namen.map(kern).filter(k => k.length >= 3));
    const treffer = [];
    for (const e of liste.eintraege) {
      if (e.cas && cas.has(e.cas)) { treffer.push({ eintrag: e, art: 'cas' }); continue; }
      const g = grund(e.stoff), k = kern(e.stoff);
      if (voll.has(g) || (k.length >= 3 && kerne.has(k))) treffer.push({ eintrag: e, art: 'name' });
    }
    if (treffer.length) return treffer;
    // ähnlich: Kern des Listeneintrags beginnt mit dem Kern des Stoffnamens (z. B. „Salzsäure 30 %“ zu „Salzsäure“)
    for (const e of liste.eintraege) {
      const k = kern(e.stoff);
      if (k.length < 4) continue;
      for (const s of kerne) if (s.length >= 4 && (k.startsWith(s + ' ') || s.startsWith(k + ' '))) { treffer.push({ eintrag: e, art: 'aehnlich' }); break; }
    }
    return treffer;
  }

  // Alle Geräte für einen Stoff: geraete = [{ ordner, daten (bestaendigkeit.json) | null, foto, quellen }]
  // → [{ geraet, treffer: [{ eintrag, art, stufe }], stufe }] sortiert: beständig zuerst, dann bedingt, nicht, ohne Angabe
  function fuerStoff(geraete, stoff) {
    const RANG_LISTE = { gut: 0, bedingt: 1, gemischt: 2, nicht: 3, unbekannt: 4, offen: 5, keine: 6 };
    const ergebnis = geraete.map(g => {
      if (!g.daten) return { geraet: g, treffer: [], stufe: 'offen' };                     // Liste noch nicht ausgewertet
      const treffer = finde(g.daten.liste ? g.daten : { eintraege: [] }, stoff).map(t => ({ ...t, stufe: gesamtStufe(t.eintrag, g.daten.liste) }));
      if (!treffer.length) return { geraet: g, treffer, stufe: 'keine' };                   // Stoff steht nicht in der Liste
      const sicher = treffer.filter(t => t.art !== 'aehnlich');
      const basis = sicher.length ? sicher : treffer;
      // mehrere Zeilen (z. B. Konzentrationen): die schlechteste bekannte Stufe zählt für die Übersicht
      const bekannt = basis.map(t => t.stufe).filter(s => s !== 'unbekannt');
      const SCHLECHT = { gut: 0, bedingt: 1, gemischt: 2, nicht: 3 };
      const stufe = bekannt.length ? bekannt.reduce((a, b) => (SCHLECHT[b] > SCHLECHT[a] ? b : a)) : 'unbekannt';
      return { geraet: g, treffer, stufe, nurAehnlich: !sicher.length };
    });
    return ergebnis.sort((a, b) => (RANG_LISTE[a.stufe] - RANG_LISTE[b.stufe]) ||
      String(a.geraet.ordner).localeCompare(String(b.geraet.ordner), 'de', { numeric: true }));
  }

  return { FORMAT, DATEI, STUFEN, STUFE_TEXT, KATEGORIEN, ordnerEinteilen, ordnerName, SCHEMA, ANWEISUNG, ausClaude, stufeAus,
           pruefen, gesamtStufe, grund, kern, finde, fuerStoff };
});
