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
  // info.txt: „Kategorie: Pumpen“ (oder „Gruppe:“) legt die Gruppe in der App fest (z. B. Schutzkleidung → erscheint unter PSA);
  // „Spalten: FKM; PTFE“ legt fest, welche Spalten (Werkstoffe bzw. Ausführungen) der Liste für unser Gerät gelten.
  // Der Rest sind Angaben zum Gerät (Werkstoffe, Hinweise) für die Auswertung.
  const KAT_ZEILE = /^[ \t]*(?:kategorie|gruppe)[ \t]*:[ \t]*(.*?)[ \t]*$/im;
  const SPALTEN_ZEILE = /^[ \t]*spalten[ \t]*:[ \t]*(.*?)[ \t]*$/im;
  // „Bild: Hintergrund=weiß; Format=1:1; Größe=groß; Darstellung=füllen“: wie das Gerätefoto in der App erscheint (nur Anzeige)
  const BILD_ZEILE = /^[ \t]*bild[ \t]*:[ \t]*(.*?)[ \t]*$/im;
  const APP_ZEILE = /^[ \t]*(?:kategorie|gruppe|spalten|bild)[ \t]*:.*$/im;
  const BILD_WAHL = {
    hintergrund: { auto: 'Automatisch', weiss: 'Weiß', hell: 'Hellgrau', dunkel: 'Dunkelgrau', schwarz: 'Schwarz', rot: 'Rot' },
    format: { '4:3': 'Quer 4:3', '1:1': 'Quadrat 1:1', '3:4': 'Hoch 3:4', '16:9': 'Breit 16:9' },
    groesse: { klein: 'Klein', mittel: 'Mittel', gross: 'Groß' },
    darstellung: { ganz: 'Ganz zeigen', fuellen: 'Rahmen füllen' },
  };
  // zoom (1–5) und Ausschnitt x/y (Mittelpunkt in %, 0–100): Bild im Rahmen vergrößert und verschoben – das Foto selbst bleibt unverändert
  const BILD_STANDARD = { hintergrund: 'auto', format: '4:3', groesse: 'mittel', darstellung: 'ganz', zoom: 1, x: 50, y: 50 };
  const BILD_KNOEPFE = ['hintergrund', 'format', 'groesse', 'darstellung'];
  const zwischen = (n, a, b) => Math.min(b, Math.max(a, n));
  const BILD_NAME = { hintergrund: 'Hintergrund', format: 'Format', groesse: 'Größe', darstellung: 'Darstellung' };
  const BILD_WORT = { hintergrund: { weiss: 'weiß', hell: 'hellgrau', dunkel: 'dunkelgrau' }, groesse: { gross: 'groß' }, darstellung: { fuellen: 'füllen' } };
  const flach = t => String(t || '').trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const BILD_ALIAS = {
    hintergrund: { automatisch: 'auto', auto: 'auto', weiss: 'weiss', hellgrau: 'hell', hell: 'hell', grau: 'hell', dunkelgrau: 'dunkel', dunkel: 'dunkel', schwarz: 'schwarz', rot: 'rot' },
    format: { '4:3': '4:3', quer: '4:3', '1:1': '1:1', quadrat: '1:1', quadratisch: '1:1', '3:4': '3:4', hoch: '3:4', '16:9': '16:9', breit: '16:9' },
    groesse: { klein: 'klein', mittel: 'mittel', gross: 'gross' },
    darstellung: { ganz: 'ganz', 'ganz zeigen': 'ganz', fuellen: 'fuellen', ausfuellen: 'fuellen', 'rahmen fuellen': 'fuellen' },
  };
  function bildLesen(zeile) {
    const b = { ...BILD_STANDARD };
    for (const teil of String(zeile || '').split(/;|,(?!\d)/)) {           // „Zoom=2,5“: Komma vor Ziffer gehört zur Zahl
      const m = /^\s*([^=:]+?)\s*[=:]\s*(.+?)\s*$/.exec(teil);
      if (!m) continue;
      const k = { hintergrund: 'hintergrund', format: 'format', groesse: 'groesse', grosse: 'groesse', darstellung: 'darstellung',
                  zoom: 'zoom', ausschnitt: 'ausschnitt' }[flach(m[1])];
      if (k === 'zoom') { const z = parseFloat(m[2].replace(',', '.')); if (z > 0) b.zoom = zwischen(z > 10 ? z / 100 : z, 1, 5); continue; }
      if (k === 'ausschnitt') {
        const n = (m[2].match(/\d+(?:[.,]\d+)?/g) || []).map(x => parseFloat(x.replace(',', '.')));
        if (n.length >= 2) { b.x = zwischen(n[0], 0, 100); b.y = zwischen(n[1], 0, 100); }
        continue;
      }
      const w = k && BILD_ALIAS[k][flach(m[2]).replace(/\s+/g, ' ')];
      if (w) b[k] = w;
    }
    return b;
  }
  // nur Abweichungen vom Standard; alles Standard → '' (keine Zeile)
  function bildText(b) {
    if (!b) return '';
    const teile = BILD_KNOEPFE.filter(k => b[k] && b[k] !== BILD_STANDARD[k] && BILD_WAHL[k][b[k]])
      .map(k => `${BILD_NAME[k]}=${(BILD_WORT[k] && BILD_WORT[k][b[k]]) || b[k]}`);
    const z = Math.round(zwischen(Number(b.zoom) || 1, 1, 5) * 100), x = Math.round(zwischen(Number(b.x ?? 50), 0, 100)), y = Math.round(zwischen(Number(b.y ?? 50), 0, 100));
    if (z !== 100) teile.push(`Zoom=${z} %`);
    if (x !== 50 || y !== 50) teile.push(`Ausschnitt=${x}/${y}`);
    return teile.join('; ');
  }
  function kategorieAus(wort) {
    const w = String(wort || '').trim().toLowerCase();
    if (!w) return '';
    return KATEGORIEN.find(k => k.toLowerCase() === w) || KATEGORIEN.find(k => w.startsWith(k.toLowerCase().slice(0, 5))) ||
      (/psa|schutz|anzug|handschuh|stiefel|kleid|maske/.test(w) ? 'Schutzkleidung' : /schlauch/.test(w) ? 'Schläuche' : /pumpe/.test(w) ? 'Pumpen' : '');
  }
  function infoLesen(t) {
    const roh = String(t || '').replace(/\r/g, '');
    const m = KAT_ZEILE.exec(roh), sp = SPALTEN_ZEILE.exec(roh);
    const spalten = sp ? sp[1].split(sp[1].includes(';') ? ';' : ',').map(x => x.trim()).filter(Boolean) : [];
    const bild = BILD_ZEILE.exec(roh);
    return { kategorie: m ? kategorieAus(m[1]) : '', spalten, bild: bildLesen(bild ? bild[1] : ''),
             text: roh.replace(new RegExp(APP_ZEILE.source + '\\n?', 'gim'), '').trim() };
  }
  // info.txt aus den Angaben der App zusammensetzen
  function infoText({ kategorie = '', spalten = [], bild = null, text = '' } = {}) {
    const b = bildText(bild);
    return (kategorie ? `Kategorie: ${kategorie}\n` : '') + (spalten.length ? `Spalten: ${spalten.join('; ')}\n` : '') + (b ? `Bild: ${b}\n` : '') +
      (String(text).trim() ? String(text).trim() + '\n' : '');
  }
  // für die Prüfsumme des Mac-Helfers: geänderte Kategorie, Spaltenwahl oder Bildanzeige ist kein Grund, die Liste neu auszuwerten
  function infoOhneKategorie(t) { return String(t || '').replace(new RegExp(APP_ZEILE.source + '\\r?\\n?', 'gim'), ''); }
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
    '- kopf.relevant: die ids der Spalten, die für das Gerät gelten, soweit bekannt (aus den Angaben zum Gerät, z. B. Werkstoff des Schlauchs); sonst []. Sind die Spalten keine verschiedenen Werkstoffe, sondern Prüfnormen für dasselbe Gerät (z. B. "EN ISO 374" und "ASTM F739"), gib die europäische Norm an (EN bzw. EN ISO).',
    '- kopf.legende: alle Bewertungszeichen bzw. -klassen mit Bedeutung und stufe: "gut" (beständig/sehr gut/gut/geeignet), "bedingt" (bedingt/eingeschränkt beständig), "nicht" (nicht beständig/ungeeignet) oder "unbekannt" (nicht geprüft/keine Angabe).',
    '  Steht die Legende nicht auf diesen Seiten, gib die Zeichen trotzdem an und beginne text mit „vorläufig:“ – ein späterer Teil mit der Legende ersetzt den Text.',
    '  Festlegung der Feuerwehr: Jede angegebene Zeit gilt als beständig, ob kurz oder lang. Bei art "permeation" bekommen Zeitklassen stufe "gut"; ebenso Klassen wie „beständig mindestens 3 Stunden“. Texte wie in der Liste; darüber keine Anmerkung.',
    '- kopf.werkstoffe: Werkstoffe des Geräts, falls aus Liste oder Geräteangaben ersichtlich; kopf.hinweise: wichtige allgemeine Hinweise der Liste (Konzentration, Temperatur, Gewährleistung) in kurzen Sätzen.',
    '- eintraege: jede Zeile der Tabelle ein Eintrag: stoff (Name wie in der Liste, mit Zusätzen wie "wässrig"), cas (nur, wenn in der Liste angegeben), konz (Konzentration, falls angegeben), temp (Temperatur, falls angegeben), werte (ein Wert je Spalte in der Reihenfolge von kopf.spalten: das Zeichen bzw. die Klasse oder die Durchbruchzeit in Minuten wie ">480"; "" für leer), seite (Seitennummer der Vorlage), hinweis (Fußnote oder Bemerkung zur Zeile). Verweiszeilen wie "Bleichlauge – siehe Natriumhypochloritlauge" als Eintrag mit leeren werten und dem Verweis in hinweis.',
    '- anmerkung: was unsicher oder unleserlich war; leer, wenn alles eindeutig war.',
  ].join('\n');

  // ------------------------------------------------------------------ Prüfung auf Wunsch (App: „Liste prüfen lassen“)
  // Die App legt pruefen.json in den Geräteordner; der Mac-Helfer lässt Claude die Liste ein zweites Mal unabhängig lesen und jede
  // übertragene Zeile mit dem Original vergleichen. Keine Abweichung → „geprüft“; sonst stehen die Abweichungen in auswertung.pruefung.
  const PRUEF_DATEI = 'pruefen.json';
  const PRUEF_SCHEMA = O({
    abweichungen: L(O({ seite: T, stoff: T, feld: T, liste: T, original: T })),
    fehlende_zeilen: L(O({ seite: T, stoff: T })),
    anmerkung: T,
  });
  const PRUEF_ANWEISUNG = [
    'Du prüfst für die Feuerwehr (Gefahrstoffzug), ob eine Chemikalien-Beständigkeitsliste fehlerfrei aus dem Original übertragen wurde.',
    'Du bekommst einen Teil des Originals (PDF-Seiten oder Bilder) und die daraus übertragenen Zeilen als Tabelle.',
    '',
    'Es ist sicherheitskritisch. Vergleiche jede übertragene Zeile, die auf diesen Seiten bzw. Bildern steht, Zeichen für Zeichen mit dem Original:',
    '- Stoffname, CAS-Nr., Konzentration, Temperatur und jeden Wert in jeder Spalte (Zeichen, Klasse oder Zeit genau wie gedruckt, z. B. ">480", "<=120", "●", "○", "A").',
    '- Steht jeder Wert in der richtigen Spalte und in der richtigen Zeile?',
    '- Fehlen Zeilen dieser Seiten in der Übertragung? Dann in fehlende_zeilen.',
    'Melde nur echte Abweichungen: feld ist "stoff", "cas", "konz", "temp" oder die Kennung der Spalte; liste = was übertragen wurde, original = was im Original steht.',
    'Keine Abweichung sind: Leerzeichen, Schreibweise von Einheiten (20°C / 20 °C), Zeilenumbrüche, getrennt übertragene Angaben (z. B. „flüssig / 20 °C“ als konz „flüssig“ und temp „20 °C“).',
    'Ist ein Zeichen im Original nicht sicher lesbar, nenne es in anmerkung statt als Abweichung. Stimmt alles: abweichungen und fehlende_zeilen leer.',
  ].join('\n');

  // ------------------------------------------------------------------ Kompakte Antwort (eine oder mehrere Teile) → bestaendigkeit.json
  const text = v => (v === null || v === undefined) ? '' : String(v).replace(/\s+/g, ' ').trim();
  function minutenAus(roh) {
    const m = /(\d+(?:[.,]\d+)?)/.exec(String(roh || ''));
    return m ? Number(m[1].replace(',', '.')) : null;
  }
  // Stufe eines Rohwerts nach Legende bzw. Durchbruchzeit.
  // Festlegung der TE (Lucas, 15.11.2026): Bei Permeationslisten gilt jede eingetragene Durchbruchzeit als beständig –
  // ob kurz oder lang. Die Zeit steht in der App immer daneben. Leer heißt „keine Angabe“.
  const OHNE_ANGABE = /^(nicht\s+(geprüft|getestet|untersucht|bekannt)|keine\s+angaben?|k\.\s?a\.?)$/i;
  // Zeichen ohne Fußnotenzeichen: „+⁵“ → „+“, „○¹⁾“ → „○“ (die Fußnote ändert die Bewertung nicht, sie steht als Hinweis dabei)
  const zeichenKern = roh => text(roh).replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰⁾⁽*]+/g, '').replace(/\s*\(.*\)\s*$/, '').trim();
  // Die Legende der Liste geht vor: In der Lutz-Liste heißt „-“ „starker Angriff, unbeständig“, in der IBS-Liste „keine Angabe“
  // (17.11.2026: vorher galt „-“ immer als „keine Angabe“ – 1352 Zellen der Lutz-Liste standen deshalb grau statt rot).
  function stufeAus(roh, kopf) {
    const r = text(roh);
    if (!r) return 'unbekannt';
    if (kopf.art === 'permeation' && minutenAus(r) !== null) return 'gut';
    const kernR = zeichenKern(r);
    const leg = (kopf.legende || []).find(l => text(l.zeichen) && text(l.zeichen) === r) || (kernR && kernR !== r && (kopf.legende || []).find(l => text(l.zeichen) && text(l.zeichen) === kernR));
    if (leg && STUFEN.includes(leg.stufe)) return leg.stufe;
    if (r === '-' || r === '–' || r === '?') return 'unbekannt';
    if (OHNE_ANGABE.test(r)) return 'unbekannt';                  // „nicht geprüft“ ist keine Bewertung
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
    const art = ['werkstoff', 'permeation', 'eignung'].includes(kopf.art) ? kopf.art : 'werkstoff';
    // In der Legende wie bei den Werten: bei Permeationslisten ist jede Zeitangabe „beständig“ (siehe stufeAus)
    const legende = (kopf.legende || []).map(l => ({ zeichen: text(l.zeichen), text: text(l.text),
      stufe: art === 'permeation' && minutenAus(l.zeichen) !== null ? 'gut' : STUFEN.includes(l.stufe) ? l.stufe : 'unbekannt' }));
    const k = { art, legende };
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
    const g = ordnerName(ordner), inf = infoLesen(info);
    const anmerkungen = teile.map(t => text(t.anmerkung)).filter(Boolean);
    if (unsicher.length) anmerkungen.push('Unsicher gelesen: ' + [...new Set(unsicher)].slice(0, 30).join(', '));
    return {
      format: FORMAT,
      geraet: { nr: g.nr, name: g.name, kategorie: inf.kategorie || (KATEGORIEN.includes(text(kopf.kategorie)) ? text(kopf.kategorie) : 'Sonstiges'),
                hersteller: text(kopf.hersteller), werkstoffe: (kopf.werkstoffe || []).map(text).filter(Boolean),
                info: text(inf.text) },
      liste: { titel: text(kopf.titel), dateien, art: k.art, stand: text(kopf.stand), bedingungen: text(kopf.bedingungen),
               spalten, relevant, legende, hinweise: (kopf.hinweise || []).map(text).filter(Boolean) },
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
    for (const e of d.eintraege) {
      e.werte = e.werte || {};
      for (const s of d.liste.spalten) {
        const w = e.werte[s.id];
        if (!w) { e.werte[s.id] = { roh: '', stufe: 'unbekannt' }; continue; }
        // als „unbekannt“ gespeichert, nach der Legende aber bewertet (z. B. „-“ = unbeständig, „+⁵“ = beständig): nachbewerten
        if ((!w.stufe || w.stufe === 'unbekannt') && text(w.roh)) { const neu = stufeAus(w.roh, d.liste); if (neu !== 'unbekannt') w.stufe = neu; }
      }
    }
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
  // Kern des Namens ohne Zusätze (Konzentration, Temperatur, wässrig, Lösung …) für den Vergleich
  const ZUSAETZE = /\b(waessrig|wasserfrei|loesung|loesungen|konz|konzentriert|verduennt|techn|technisch|rein|reinst|gesaettigt|fluessig|fest|gasfoermig|gas|dampf|dampfe|ca|bis|und|oder|in|wasser|ige?|iger|minus)\b/g;
  // Mengen und Temperaturen samt Zahl: „30 %“, „30,5 %ige“, „10 bis 30 %“, „65 proz.“, „1 M“, „0,1 N“, „20 °C“, „minus 196 °C“
  const ZAHL = String.raw`\b\d+(?:\s\d+)?(?:\s(?:bis|und|oder)\s\d+(?:\s\d+)?)?\s?`;
  const MENGE = new RegExp(ZAHL + String.raw`(?:%|(?:proz\w*|gew\w*|vol\w*|ppm|mol\w*|m|n|c|grad\w*)(?=\s|$))`, 'g');
  // Andere Zahlen gehören zum Namen und bleiben stehen: „Freon 30“ (= Dichlormethan) ist nicht „Freon 11“,
  // „1,1,1-Trichlorethan“ nicht „1,1,2-Trichlorethan“ (15.11.2026: Dichlormethan zeigte alle Freon-Zeilen der TESIMAX-Liste).
  function kern(s) { return grund(s).replace(MENGE, ' ').replace(ZUSAETZE, ' ').replace(/\s+/g, ' ').trim(); }
  // CAS-Nummer nur als Ziffern ohne führende Nullen – so passen auch gedruckte Varianten wie „1330--20-7“ oder „000075-44-5“;
  // eine Zelle kann mehrere Nummern enthalten („75-35-4, 540-59-0“)
  const casZiffern = c => String(c || '').replace(/\D/g, '').replace(/^0+/, '');
  const casAus = zelle => String(zelle || '').split(/[,;/]|\s+(?:und|u\.)\s+/).map(casZiffern).filter(z => z.length >= 5);

  // stoff: { name, synonyme[], cas[] } → Treffer [{ eintrag, art: 'cas'|'name'|'aehnlich' }]
  function finde(liste, stoff) {
    const cas = new Set((stoff.cas || []).map(casZiffern).filter(z => z.length >= 5));
    const namen = [stoff.name, ...(stoff.synonyme || [])].filter(Boolean);
    const voll = new Set(namen.map(grund)), kerne = new Set(namen.map(kern).filter(k => k.length >= 3));
    const treffer = [];
    for (const e of liste.eintraege) {
      if (e.cas && casAus(e.cas).some(z => cas.has(z))) { treffer.push({ eintrag: e, art: 'cas' }); continue; }
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

  // ------------------------------------------------------------------ Widersprüche innerhalb einer Liste
  // Dieselbe Zeile – gleicher Stoff (CAS-Nummer, sonst voller Name) bei gleicher Konzentration, Temperatur und gleichem Zusatz
  // („wässrig“, „konz.“) – steht mehrfach in der Liste, und die relevanten Spalten sind verschieden bewertet. Das kann ein
  // Lesefehler sein oder ein echter Unterschied der Herstellerliste (z. B. verschiedene Prüfnormen) – die App zeigt beides an,
  // im Zweifel gilt die ungünstigere Angabe.
  function zeilenSchluessel(e, { nurZusatz = false } = {}) {
    const g = grund(e.stoff);
    const zusatz = [...(g.match(MENGE) || []).map(x => x.replace(/\s+/g, '')), ...(g.match(ZUSAETZE) || []).filter(w => !/^(und|oder|in|bis|ca)$/.test(w)),
      grund(e.konz).replace(/\s+/g, ''), grund(e.temp).replace(/\s+/g, '')].filter(Boolean).sort().join(' ');
    if (nurZusatz) return 'stoff|' + zusatz;
    const c = casAus(e.cas);
    return (c.length ? 'cas:' + c.sort().join('+') : 'name:' + kern(e.stoff)) + '|' + zusatz;
  }
  function stufenVon(e, liste) {
    const ids = liste.relevant && liste.relevant.length ? liste.relevant : liste.spalten.map(s => s.id);
    return ids.map(id => (e.werte && e.werte[id] && e.werte[id].stufe) || 'unbekannt');
  }
  // eintraege: Zeilen einer Liste (oder die Treffer für einen Stoff) → [{ schluessel, eintraege: [e, …] }] mit abweichender Bewertung
  // gleicherStoff: alle Zeilen meinen denselben Stoff (Treffer für einen Stoff) – dann zählt nur der Zusatz (Konzentration usw.)
  function widersprueche(eintraege, liste, { gleicherStoff = false } = {}) {
    if (!liste || !Array.isArray(eintraege)) return [];
    const gruppen = new Map();
    for (const e of eintraege) {
      const st = stufenVon(e, liste);
      if (st.every(x => x === 'unbekannt')) continue;                 // Verweiszeilen, Zeilen ohne Angabe
      const k = zeilenSchluessel(e, { nurZusatz: gleicherStoff });
      if (!gleicherStoff && (k.startsWith('name:|') || /^name:.{0,2}\|/.test(k))) continue;
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push({ e, st: st.join('/') });
    }
    const aus = [];
    for (const [schluessel, l] of gruppen) if (l.length > 1 && new Set(l.map(x => x.st)).size > 1) aus.push({ schluessel, eintraege: l.map(x => x.e) });
    return aus;
  }

  // Verweiszeilen mit Werten („Isopropylalkohol siehe Isopropanol“ mit eigener Bewertung): in der Vorlage sind dort oft Zeilen
  // verrutscht (17.11.2026: IBS-Schlauchliste S. 6 und S. 10 – die Werte stehen im Verweis, die echte Zeile ist leer).
  const VERWEIS = /(^|\s)(siehe|s\.)\s+\S/i;
  // Teilweise Verweise (ELRO: „siehe Ölsäure (Elastomere)“, Kunststoffe und Metalle direkt bewertet) sind gewollt – auffällig ist
  // nur ein Verweis, der fast in jeder Spalte (mindestens 80 %) eigene Werte trägt.
  function verweisMitWerten(eintraege) {
    return (eintraege || []).filter(e => {
      if (!(VERWEIS.test(String(e.stoff || '')) || /^\s*(siehe|s\.)\s/i.test(String(e.hinweis || '')))) return false;
      const w = Object.values(e.werte || {}), voll = w.filter(x => x && x.roh && !/^[-–?]$/.test(String(x.roh).trim())).length;
      return w.length > 0 && voll >= Math.max(1, Math.ceil(w.length * 0.8));
    });
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
      const wid = widersprueche(basis.map(t => t.eintrag), g.daten.liste, { gleicherStoff: true });
      const widEintraege = new Set(wid.flatMap(w => w.eintraege)), verweis = new Set(verweisMitWerten(basis.map(t => t.eintrag)));
      for (const t of treffer) { if (widEintraege.has(t.eintrag)) t.widerspruch = true; if (verweis.has(t.eintrag)) t.verweis = true; }
      return { geraet: g, treffer, stufe, nurAehnlich: !sicher.length, widerspruch: wid.length > 0 || verweis.size > 0 };
    });
    return ergebnis.sort((a, b) => (RANG_LISTE[a.stufe] - RANG_LISTE[b.stufe]) ||
      String(a.geraet.ordner).localeCompare(String(b.geraet.ordner), 'de', { numeric: true }));
  }

  return { FORMAT, DATEI, PRUEF_DATEI, PRUEF_SCHEMA, PRUEF_ANWEISUNG, STUFEN, STUFE_TEXT, KATEGORIEN, BILD_WAHL, BILD_STANDARD, bildLesen, bildText, ordnerEinteilen, ordnerName, infoLesen, infoText, infoOhneKategorie, kategorieAus, SCHEMA, ANWEISUNG, ausClaude, stufeAus,
           pruefen, gesamtStufe, grund, kern, finde, fuerStoff, widersprueche, zeilenSchluessel, verweisMitWerten, zeichenKern };
});
