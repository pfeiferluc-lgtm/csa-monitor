// Sicherheitsdatenblatt (SDB) lesen ohne Internet: Text (Textebene eines PDFs über pdf.js oder Texterkennung von Fotos
// über Tesseract) → einheitliches Stoffobjekt der App (stoffdaten.js). Rückfall, wenn Claude nicht erreichbar ist.
// Schnittstelle:
//   sdbLesen(text, { dateiname })  → Stoffobjekt (quelle 'sdb'); wirft nie, bei Unbrauchbarem fast leer mit anmerkung
//   abschnitteTeilen(text)          → { 1: '…', 2: '…', … 16: '…' } (Nummern nach REACH Anhang II, auch bei alten SDB)
// Verträgt Kopf-/Fußzeilen auf jeder Seite, zweispaltige Texte aus „pdftotext -layout“, Texte ohne Layout,
// Überschriften wie „ABSCHNITT 9: …“, „9. Physikalische …“, „9.1 Angaben …“, englische SDB („SECTION 9“), alte SDB nach
// 91/155/EWG bzw. 2001/58/EG (Abschnitt 2 und 3 vertauscht) und typische Fehler der Texterkennung (l/1, O/0, S/5 in Codes).
// Läuft im Browser (window.GSZSdbParser, braucht window.GSZStoffdaten) und in Node (require); ohne weitere Abhängigkeiten.
'use strict';
(function (wurzel, fabrik) {
  const S = (typeof module === 'object' && module.exports) ? require('./stoffdaten') : wurzel.GSZStoffdaten;
  const m = fabrik(S);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZSdbParser = m;
})(typeof self !== 'undefined' ? self : this, function (S) {
  const QUELLE_TEXT = 'Sicherheitsdatenblatt – Texterkennung';

  // ------------------------------------------------------------------ Amtliche H- und EUH-Sätze (CLP, Anhang III, deutsch)
  // Wortlaut der Verordnung (EG) Nr. 1272/2008 in der geltenden Fassung; Platzhalter <…> sind weggelassen.
  const H_SAETZE = {
    H200: 'Instabil, explosiv.',
    H201: 'Explosiv, Gefahr der Massenexplosion.',
    H202: 'Explosiv; große Gefahr durch Splitter, Spreng- und Wurfstücke.',
    H203: 'Explosiv; Gefahr durch Feuer, Luftdruck oder Splitter, Spreng- und Wurfstücke.',
    H204: 'Gefahr durch Feuer oder Splitter, Spreng- und Wurfstücke.',
    H205: 'Gefahr der Massenexplosion bei Feuer.',
    H206: 'Gefahr durch Feuer, Druckstoß oder Sprengstücke; erhöhte Explosionsgefahr, wenn das Desensibilisierungsmittel reduziert wird.',
    H207: 'Gefahr durch Feuer oder Sprengstücke; erhöhte Explosionsgefahr, wenn das Desensibilisierungsmittel reduziert wird.',
    H208: 'Gefahr durch Feuer; erhöhte Explosionsgefahr, wenn das Desensibilisierungsmittel reduziert wird.',
    H220: 'Extrem entzündbares Gas.',
    H221: 'Entzündbares Gas.',
    H222: 'Extrem entzündbares Aerosol.',
    H223: 'Entzündbares Aerosol.',
    H224: 'Flüssigkeit und Dampf extrem entzündbar.',
    H225: 'Flüssigkeit und Dampf leicht entzündbar.',
    H226: 'Flüssigkeit und Dampf entzündbar.',
    H228: 'Entzündbarer Feststoff.',
    H229: 'Behälter steht unter Druck: Kann bei Erwärmung bersten.',
    H230: 'Kann auch in Abwesenheit von Luft explosionsartig reagieren.',
    H231: 'Kann auch in Abwesenheit von Luft bei erhöhtem Druck und/oder erhöhter Temperatur explosionsartig reagieren.',
    H232: 'Kann sich bei Kontakt mit Luft spontan entzünden.',
    H240: 'Erwärmung kann Explosion verursachen.',
    H241: 'Erwärmung kann Brand oder Explosion verursachen.',
    H242: 'Erwärmung kann Brand verursachen.',
    H250: 'Entzündet sich in Berührung mit Luft von selbst.',
    H251: 'Selbsterhitzungsfähig; kann in Brand geraten.',
    H252: 'In großen Mengen selbsterhitzungsfähig; kann in Brand geraten.',
    H260: 'In Berührung mit Wasser entstehen entzündbare Gase, die sich spontan entzünden können.',
    H261: 'In Berührung mit Wasser entstehen entzündbare Gase.',
    H270: 'Kann Brand verursachen oder verstärken; Oxidationsmittel.',
    H271: 'Kann Brand oder Explosion verursachen; starkes Oxidationsmittel.',
    H272: 'Kann Brand verstärken; Oxidationsmittel.',
    H280: 'Enthält Gas unter Druck; kann bei Erwärmung explodieren.',
    H281: 'Enthält tiefgekühltes Gas; kann Kälteverbrennungen oder -verletzungen verursachen.',
    H290: 'Kann gegenüber Metallen korrosiv sein.',
    H300: 'Lebensgefahr bei Verschlucken.',
    H301: 'Giftig bei Verschlucken.',
    H302: 'Gesundheitsschädlich bei Verschlucken.',
    H304: 'Kann bei Verschlucken und Eindringen in die Atemwege tödlich sein.',
    H310: 'Lebensgefahr bei Hautkontakt.',
    H311: 'Giftig bei Hautkontakt.',
    H312: 'Gesundheitsschädlich bei Hautkontakt.',
    H314: 'Verursacht schwere Verätzungen der Haut und schwere Augenschäden.',
    H315: 'Verursacht Hautreizungen.',
    H317: 'Kann allergische Hautreaktionen verursachen.',
    H318: 'Verursacht schwere Augenschäden.',
    H319: 'Verursacht schwere Augenreizung.',
    H330: 'Lebensgefahr bei Einatmen.',
    H331: 'Giftig bei Einatmen.',
    H332: 'Gesundheitsschädlich bei Einatmen.',
    H334: 'Kann bei Einatmen Allergie, asthmaartige Symptome oder Atembeschwerden verursachen.',
    H335: 'Kann die Atemwege reizen.',
    H336: 'Kann Schläfrigkeit und Benommenheit verursachen.',
    H340: 'Kann genetische Defekte verursachen.',
    H341: 'Kann vermutlich genetische Defekte verursachen.',
    H350: 'Kann Krebs erzeugen.',
    H350i: 'Kann bei Einatmen Krebs erzeugen.',
    H351: 'Kann vermutlich Krebs erzeugen.',
    H360: 'Kann die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen.',
    H360F: 'Kann die Fruchtbarkeit beeinträchtigen.',
    H360D: 'Kann das Kind im Mutterleib schädigen.',
    H360FD: 'Kann die Fruchtbarkeit beeinträchtigen. Kann das Kind im Mutterleib schädigen.',
    H360Fd: 'Kann die Fruchtbarkeit beeinträchtigen. Kann vermutlich das Kind im Mutterleib schädigen.',
    H360Df: 'Kann das Kind im Mutterleib schädigen. Kann vermutlich die Fruchtbarkeit beeinträchtigen.',
    H361: 'Kann vermutlich die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen.',
    H361f: 'Kann vermutlich die Fruchtbarkeit beeinträchtigen.',
    H361d: 'Kann vermutlich das Kind im Mutterleib schädigen.',
    H361fd: 'Kann vermutlich die Fruchtbarkeit beeinträchtigen. Kann vermutlich das Kind im Mutterleib schädigen.',
    H362: 'Kann Säuglinge über die Muttermilch schädigen.',
    H370: 'Schädigt die Organe.',
    H371: 'Kann die Organe schädigen.',
    H372: 'Schädigt die Organe bei längerer oder wiederholter Exposition.',
    H373: 'Kann die Organe schädigen bei längerer oder wiederholter Exposition.',
    'H300+H310': 'Lebensgefahr bei Verschlucken oder Hautkontakt.',
    'H300+H330': 'Lebensgefahr bei Verschlucken oder Einatmen.',
    'H310+H330': 'Lebensgefahr bei Hautkontakt oder Einatmen.',
    'H300+H310+H330': 'Lebensgefahr bei Verschlucken, Hautkontakt oder Einatmen.',
    'H301+H311': 'Giftig bei Verschlucken oder Hautkontakt.',
    'H301+H331': 'Giftig bei Verschlucken oder Einatmen.',
    'H311+H331': 'Giftig bei Hautkontakt oder Einatmen.',
    'H301+H311+H331': 'Giftig bei Verschlucken, Hautkontakt oder Einatmen.',
    'H302+H312': 'Gesundheitsschädlich bei Verschlucken oder Hautkontakt.',
    'H302+H332': 'Gesundheitsschädlich bei Verschlucken oder Einatmen.',
    'H312+H332': 'Gesundheitsschädlich bei Hautkontakt oder Einatmen.',
    'H302+H312+H332': 'Gesundheitsschädlich bei Verschlucken, Hautkontakt oder Einatmen.',
    H400: 'Sehr giftig für Wasserorganismen.',
    H410: 'Sehr giftig für Wasserorganismen mit langfristiger Wirkung.',
    H411: 'Giftig für Wasserorganismen, mit langfristiger Wirkung.',
    H412: 'Schädlich für Wasserorganismen, mit langfristiger Wirkung.',
    H413: 'Kann für Wasserorganismen schädlich sein, mit langfristiger Wirkung.',
    H420: 'Schädigt die öffentliche Gesundheit und die Umwelt durch Ozonabbau in der äußeren Atmosphäre.',
  };
  // Ergänzende Gefahrenmerkmale und Kennzeichnungselemente (CLP, Anhang II) sowie die EU-Gefahrenklassen von 2023
  const EUH_SAETZE = {
    EUH001: 'In trockenem Zustand explosiv.',
    EUH006: 'Mit und ohne Luft explosionsfähig.',
    EUH014: 'Reagiert heftig mit Wasser.',
    EUH018: 'Kann bei Verwendung explosionsfähige/entzündbare Dampf/Luft-Gemische bilden.',
    EUH019: 'Kann explosionsfähige Peroxide bilden.',
    EUH029: 'Entwickelt bei Berührung mit Wasser giftige Gase.',
    EUH031: 'Entwickelt bei Berührung mit Säure giftige Gase.',
    EUH032: 'Entwickelt bei Berührung mit Säure sehr giftige Gase.',
    EUH044: 'Explosionsgefahr bei Erhitzen unter Einschluss.',
    EUH059: 'Die Ozonschicht schädigend.',
    EUH066: 'Wiederholter Kontakt kann zu spröder oder rissiger Haut führen.',
    EUH070: 'Giftig bei Berührung mit den Augen.',
    EUH071: 'Wirkt ätzend auf die Atemwege.',
    EUH201: 'Enthält Blei. Nicht für den Anstrich von Gegenständen verwenden, die von Kindern gekaut oder gelutscht werden könnten.',
    EUH201A: 'Achtung! Enthält Blei.',
    EUH202: 'Cyanacrylat. Gefahr. Klebt innerhalb von Sekunden Haut und Augenlider zusammen. Darf nicht in die Hände von Kindern gelangen.',
    EUH203: 'Enthält Chrom(VI). Kann allergische Reaktionen hervorrufen.',
    EUH204: 'Enthält Isocyanate. Kann allergische Reaktionen hervorrufen.',
    EUH205: 'Enthält epoxidhaltige Verbindungen. Kann allergische Reaktionen hervorrufen.',
    EUH206: 'Achtung! Nicht zusammen mit anderen Produkten verwenden, da gefährliche Gase (Chlor) freigesetzt werden können.',
    EUH207: 'Achtung! Enthält Cadmium. Bei der Verwendung entstehen gefährliche Dämpfe. Hinweise des Herstellers beachten. Sicherheitsanweisungen einhalten.',
    EUH208: 'Enthält einen sensibilisierenden Stoff. Kann allergische Reaktionen hervorrufen.',
    EUH209: 'Kann bei Verwendung leicht entzündbar werden.',
    EUH209A: 'Kann bei Verwendung entzündbar werden.',
    EUH210: 'Sicherheitsdatenblatt auf Anfrage erhältlich.',
    EUH211: 'Achtung! Beim Sprühen können gefährliche lungengängige Tröpfchen entstehen. Aerosol oder Nebel nicht einatmen.',
    EUH212: 'Achtung! Bei der Verwendung können gefährliche lungengängige Stäube entstehen. Staub nicht einatmen.',
    EUH380: 'Kann beim Menschen endokrine Störungen verursachen.',
    EUH381: 'Steht in dem Verdacht, beim Menschen endokrine Störungen zu verursachen.',
    EUH401: 'Zur Vermeidung von Risiken für Mensch und Umwelt die Gebrauchsanleitung einhalten.',
    EUH430: 'Kann endokrine Störungen in der Umwelt verursachen.',
    EUH431: 'Steht in dem Verdacht, endokrine Störungen in der Umwelt zu verursachen.',
    EUH440: 'Anreicherung in der Umwelt und in lebenden Organismen einschließlich Menschen.',
    EUH441: 'Starke Anreicherung in der Umwelt und in lebenden Organismen einschließlich Menschen.',
    EUH450: 'Kann lang anhaltende und diffuse Verschmutzung von Wasserressourcen verursachen.',
    EUH451: 'Kann sehr lang anhaltende und diffuse Verschmutzung von Wasserressourcen verursachen.',
  };
  // Gültige P-Nummern (nur zur Prüfung von Texterkennungs-Ergebnissen; die Texte kommen aus dem Datenblatt)
  const P_NUMMERN = new Set(('101 102 103 201 202 203 210 211 212 220 221 222 223 230 231 232 233 234 235 236 240 241 242 243 244 ' +
    '250 251 260 261 262 263 264 265 270 271 272 273 280 281 282 283 284 285 301 302 303 304 305 306 307 308 309 310 311 312 313 ' +
    '314 315 316 317 318 319 320 321 322 330 331 332 333 334 335 336 337 338 340 341 342 350 351 352 353 360 361 362 363 364 370 ' +
    '371 372 373 374 375 376 377 378 380 381 390 391 401 402 403 404 405 406 407 410 411 412 413 420 422 501 502 503').split(' '));
  // Stichworte je P-Satz: Ein Text gehört nur dann zu einem Code, wenn er dazu passt (verhindert vertauschte Zuordnungen,
  // wenn Codes und Texte im Text ohne Layout getrennt stehen).
  const P_STICHWORT = {
    P101: /arzt|rat/i, P102: /kinder/i, P103: /lesen|anweisung|etikett/i, P201: /anweisung/i, P202: /hinweis|lesen|verstanden/i,
    P210: /hitze|zünd|funken|flamme/i, P211: /sprüh|flamme|zünd/i, P220: /kleidung|brennbar|fern/i, P222: /luft/i, P223: /wasser/i,
    P231: /inert|gas/i, P232: /feucht/i, P233: /verschlossen|dicht/i, P234: /original/i, P235: /kühl/i, P240: /erden/i,
    P241: /explosionsgeschützt|geräte/i, P242: /funken|werkzeug/i, P243: /elektrostatisch|entladung/i, P244: /öl|fett/i,
    P250: /schleifen|stoßen|reiben/i, P251: /durchstechen|verbrennen/i, P260: /einatmen/i, P261: /einatmen/i,
    P262: /augen|haut|kleidung/i, P263: /schwangerschaft|stillzeit/i, P264: /wasch/i, P270: /essen|trinken|rauchen/i,
    P271: /freien|belüftet/i, P272: /kleidung/i, P273: /umwelt/i, P280: /handschuh|schutzkleidung|augenschutz|gesichtsschutz|schutzbrille/i,
    P282: /kälte/i, P283: /flamm/i, P284: /atemschutz/i, P301: /verschlucken/i, P302: /haut/i, P303: /haut/i, P304: /einatmen/i,
    P305: /augen/i, P306: /kleidung/i, P308: /exposition|betroffen/i, P310: /gift|arzt/i, P311: /gift|arzt/i, P312: /unwohl|gift|arzt/i,
    P313: /ärzt|arzt/i, P314: /unwohl|ärzt/i, P315: /ärzt|arzt/i, P320: /behandlung/i, P321: /behandlung/i, P330: /mund/i,
    P331: /erbrechen/i, P332: /hautreizung/i, P333: /hautreizung|ausschlag/i, P334: /wasser|verband/i, P335: /partikel/i,
    P336: /vereist|auftauen/i, P337: /augenreizung/i, P338: /kontaktlinsen/i, P340: /frische luft|atmung/i, P342: /atemwege/i,
    P351: /spül/i, P352: /wasser|wasch/i, P353: /haut|wasser|dusch/i, P360: /kleidung|haut/i, P361: /kleidung|ausziehen/i,
    P362: /kleidung|ausziehen/i, P363: /kleidung|wasch/i, P364: /wasch/i, P370: /brand/i, P371: /großbrand/i, P372: /explosion/i,
    P373: /brandbekämpfung|feuer/i, P375: /entfernung/i, P376: /undicht/i, P377: /gas|undicht/i, P378: /lösch/i, P380: /räumen/i,
    P381: /zündquellen|undicht/i, P390: /verschüttet|aufnehmen/i, P391: /verschüttet|aufnehmen/i, P401: /aufbewahr|lager/i,
    P402: /trocken/i, P403: /belüftet/i, P404: /geschlossen/i, P405: /verschluss/i, P406: /korrosion/i, P407: /luftspalt|stapel/i,
    P410: /sonne/i, P411: /temperatur/i, P412: /temperatur|50/i, P413: /schüttgut|temperatur/i, P420: /getrennt/i,
    P501: /entsorg|zuführen|beseitig/i, P502: /wiederverwend|wiederverwert/i, P503: /entsorg|wiederverw/i,
  };

  // ------------------------------------------------------------------ Abschnitte (REACH Anhang II)
  const ABSCHNITTE = [null,
    { titel: 'Bezeichnung des Stoffs bzw. des Gemischs und des Unternehmens',
      re: /^(?:bezeichnung des (?:stoff|gemisch|produkt|zubereitung)|stoff.{0,4}zubereitungs.{0,8}firmenbezeichnung|stoff.{0,6}firmenbezeichnung|identifi(?:zierung|kation|cation)\b)/i },
    { titel: 'Mögliche Gefahren', re: /^(?:m[öo]gliche gefahren|gefahrenidentifi|gefahrenermittlung|hazards? identification)/i },
    { titel: 'Zusammensetzung/Angaben zu Bestandteilen', re: /^(?:zusammensetzung|composition|angaben zu (?:den )?bestandteilen)/i },
    { titel: 'Erste-Hilfe-Maßnahmen', re: /^(?:erste.?hilfe|first.?aid)/i },
    { titel: 'Maßnahmen zur Brandbekämpfung', re: /^(?:ma\S{0,3}nahmen zur brandbek|brandbek[äa]mpfung|fire.?fighting)/i },
    { titel: 'Maßnahmen bei unbeabsichtigter Freisetzung', re: /^(?:ma\S{0,3}nahmen bei unbeabsichtigter|accidental release)/i },
    { titel: 'Handhabung und Lagerung', re: /^(?:handhabung und lagerung|handling and storage)/i },
    { titel: 'Begrenzung und Überwachung der Exposition/Persönliche Schutzausrüstungen',
      re: /^(?:begrenzung und [üu]berwachung der exposition|expositionsbegrenzung|exposure controls?)/i },
    { titel: 'Physikalische und chemische Eigenschaften', re: /^(?:physikalische und chemische eigenschaften|physical and chemical properties)/i },
    { titel: 'Stabilität und Reaktivität', re: /^(?:stabilit[äa]t und reaktivit[äa]t|stability and reactivity)/i },
    { titel: 'Toxikologische Angaben', re: /^(?:toxikologische angaben|angaben zur toxikologie|toxicological information)/i },
    { titel: 'Umweltbezogene Angaben',
      re: /^(?:umweltbezogene angaben|umweltspezifische angaben|angaben zur [öo]kologie|[öo]kologische angaben|ecological information)/i },
    { titel: 'Hinweise zur Entsorgung', re: /^(?:hinweise? zur entsorgung|disposal considerations)/i },
    { titel: 'Angaben zum Transport', re: /^(?:angaben zum transport|transport ?information|transportvorschriften)/i },
    { titel: 'Rechtsvorschriften', re: /^(?:rechtsvorschriften|angaben zu rechtsvorschriften|vorschriften\b|regulatory information)/i },
    { titel: 'Sonstige Angaben', re: /^(?:sonstige angaben|other information)/i },
  ];
  const titelNr = t => { for (let n = 1; n <= 16; n++) if (ABSCHNITTE[n].re.test(t)) return n; return 0; };

  // ------------------------------------------------------------------ kleine Helfer
  const LEER_WERT = /(?:nicht (?:anwendbar|bestimmt|verfügbar|relevant|ermittelt|zutreffend|vorhanden|untersucht|geprüft|festgelegt|gemessen|bekannt|durch verordnung festgelegt)|keine (?:daten|angaben?|informationen?|werte?)|liegen keine|n\.\s?[abv]\.?$|^n\.?\s?[abv]\.?$|not (?:applicable|determined|available|relevant)|no (?:data|information)|^(?:-+|–|—|\/|\?|k\.\s?a\.?|entfällt|keine?|ohne)\.?$)/i;
  const istLeer = w => { const t = String(w || '').trim(); return !t || (LEER_WERT.test(t) && !/\d/.test(t.replace(/\d+\/\d+\/?(?:eg|ewg|eu)/gi, ''))); };
  const ein = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const ohneSatzzeichen = s => ein(s).replace(/^[\s:;,.\-–|]+|[\s:;,|]+$/g, '');
  const woerter = s => ein(s).toLowerCase().replace(/[^a-zäöüß0-9 ]+/g, ' ').split(' ').filter(w => w.length > 2);
  // Anteil der Wörter von b, die in a vorkommen (Prüfung von Gefahrenhinweis-Texten gegen die Tabelle)
  function aehnlich(a, b) {
    const A = new Set(woerter(a)), B = woerter(b);
    if (!B.length) return 0;
    return B.filter(w => A.has(w)).length / B.length;
  }
  const istEnglisch = s => (String(s).match(/\b(?:the|and|with|from|may|causes?|harmful|toxic|fatal|wear|keep|use|do not|if|of|in case|contact|skin|eyes?)\b/gi) || []).length >= 2;
  // Zeilen des Absatzes zu Text verbinden (Trennstriche am Zeilenende auflösen)
  function verbinden(zeilen) {
    let aus = '';
    for (const z0 of zeilen) {
      const z = ein(z0);
      if (!z) continue;
      if (!aus) { aus = z; continue; }
      if (/[a-zäöüß]-$/.test(aus) && /^[a-zäöüß]/.test(z) && !/^(?:und|oder|bzw|sowie)\b/.test(z)) aus = aus.slice(0, -1) + z;
      else aus += ' ' + z;
    }
    return aus;
  }
  // Text in Sätze teilen (für Listenfelder: ein Punkt je Eintrag)
  const ABKUERZUNG = /(?:^|[\s(])(?:z|d|u|o|s|v|i|n|a|ca|bzw|ggf|evtl|inkl|exkl|max|min|nr|bzgl|etc|usw|vgl|gem|lt|sog|dr|fa|tel|fax|abs|art|kap|abschn|pkt|ziff|mind|ab|zzgl|sek|std|temp|konz|rel|dyn|kin|ggü|allg|eigtl|insb|z\.\s?b|d\.\s?h|u\.\s?a|o\.\s?ä|u\.\s?u|z\.\s?z|n\.\s?a\.\s?g|a\.\s?n\.\s?g|[A-ZÄÖÜa-zäöü])\.$/i;
  function saetze(t) {
    const x = ein(t);
    if (!x) return [];
    const aus = [];
    let rest = x;
    const re = /[.!?]\s+(?=[A-ZÄÖÜ„"(])/g;
    let start = 0, m;
    while ((m = re.exec(rest))) {
      const kopf = rest.slice(start, m.index + 1);
      if (ABKUERZUNG.test(kopf)) continue;
      aus.push(kopf.trim());
      start = m.index + m[0].length;
    }
    aus.push(rest.slice(start).trim());
    return aus.filter(s => s && !/^[.\-–:]+$/.test(s));
  }
  // Aufzählung ohne Verb („Wassersprühstrahl, Schaum, Kohlendioxid“) in einzelne Einträge teilen
  function aufzaehlung(s) {
    const t = ein(s).replace(/\.$/, '');
    if (/\b(?:ist|sind|kann|können|werden|wird|verwenden|abstimmen|benutzen|nicht|keine?|bei|für|zum|zur|mit allen|alle)\b/i.test(t)) return [ein(s)];
    const teile = t.split(/\s*[,;]\s*|\s+(?:oder|und)\s+(?=[A-ZÄÖÜ])/).map(x => x.trim()).filter(Boolean);
    if (teile.length < 2 || teile.some(x => x.split(' ').length > 5)) return [ein(s)];
    return teile;
  }
  const uniq = a => [...new Set(a.filter(Boolean))];

  // ------------------------------------------------------------------ Text vorbereiten
  const LIGATUREN = { 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl' };
  function zeileSaeubern(z) {
    if (z === '\f') return z;
    let t = z.replace(/\t/g, '    ').replace(/[  -   　]/g, ' ').replace(/[­​-‍﻿]/g, '')
      .replace(/[ﬁﬂﬀﬃﬄ]/g, c => LIGATUREN[c]).replace(/[▐▌█■□◦▪]/g, ' ').replace(/[º˚]/g, '°');
    t = t.replace(/\s*\|+\s*/g, m => (m.length > 2 ? '   ' : ' '));                  // Tabellenrahmen der Texterkennung
    t = t.replace(/^[\s‚'’`´_~«»*•·\[\]{}]+(?=\S)/, m => ' '.repeat(m.length)).replace(/[\s‚'’`´_~|\[\]]+$/, '');
    return t;
  }
  function vorbereiten(text) {
    let roh = String(text == null ? '' : text);
    if (roh.normalize) roh = roh.normalize('NFC');
    roh = roh.replace(/\r\n?/g, '\n').replace(/\f/g, '\n\f\n')
      .replace(/(\/\s?c?m)\?(?=[\s).,;]|$)/gm, '$1³')                                 // „mg/m?“ → „mg/m³“
      .replace(/\b(?:GHS|SGH)\s?[O0o]\s?([1-9])\b/g, 'GHS0$1')                          // „GHSO5“ → „GHS05“
      .replace(/\bABSCHN[I1l|!]TT/g, 'ABSCHNITT').replace(/\bAbschn[i1l|!]tt/g, 'Abschnitt');
    const zeilen = roh.split('\n').map(zeileSaeubern);
    const voll = zeilen.filter(z => z.trim() && z !== '\f');
    const layout = voll.length > 0 && voll.filter(z => /\S\s{3,}\S/.test(z)).length / voll.length >= 0.12;
    return { zeilen, layout };
  }

  // Kopf- und Fußzeilen: Seitenangaben und Zeilen, die auf (fast) jeder Seite gleich wiederkehren
  const SEITE_RE = /\b(?:seite|page|seiten|blatt)\s*:?\s*(\d{1,3})\s*(?:von|of|\/|aus)\s*(\d{1,3})\b/i;
  const muell = z => { const t = z.trim(); return !t || (t.length < 15 && !/[A-Za-zÄÖÜäöüß]{3}/.test(t)); };
  function kopfzeilenEntfernen(zeilen) {
    const n = zeilen.length;
    const seite = new Array(n).fill(false);
    let gesamt = 0;
    zeilen.forEach((z, i) => { const m = SEITE_RE.exec(z); if (m && +m[1] <= +m[2] && +m[1] > 0) { seite[i] = true; gesamt = Math.max(gesamt, +m[2]); } });
    const kand = [];
    zeilen.forEach((z, i) => {
      if (seite[i]) return;
      const m = /(?:^\s*|\s{2,})(\d{1,3})\s?\/\s?(\d{1,3})(?=\s{2,}|\s*$)/.exec(z);
      if (m && +m[1] <= +m[2] && +m[2] > 1 && +m[1] > 0) kand.push({ i, y: +m[2] });
    });
    const proY = {};
    kand.forEach(k => { proY[k.y] = (proY[k.y] || 0) + 1; });
    for (const k of kand) if (proY[k.y] >= 2 && proY[k.y] >= k.y * 0.4) { seite[k.i] = true; gesamt = Math.max(gesamt, k.y); }
    const seiten = Math.max(gesamt, zeilen.filter(z => z === '\f').length + 1, 1);
    const mindest = seiten >= 2 ? Math.max(2, Math.ceil(seiten * 0.4)) : 3;
    const schluessel = zeilen.map(z => ein(z).toLowerCase().replace(/\d/g, '#'));
    const pos = {};
    schluessel.forEach((k, i) => { if (k && k !== '\f') (pos[k] = pos[k] || []).push(i); });
    const ALLGEMEIN = /^(?:nicht|keine?|kein|n\.?\s?[abv]\.?|ja|nein|-+|–|\.|:|siehe|see|#+[.,]?#*\s*%?|[a-zäöü]?)$|^(?:nicht|keine?|kein)\b/;
    const wiederholt = new Array(n).fill(false);
    for (const [k, p] of Object.entries(pos)) {
      if (p.length < mindest || ALLGEMEIN.test(k) || k.replace(/[^a-zäöüß#]/g, '').length < 2) continue;
      const abstand = Math.min(...p.slice(1).map((x, j) => x - p[j]));
      if (abstand < 15) continue;
      p.forEach(x => { wiederholt[x] = true; });
    }
    const kopf = i => seite[i] || wiederholt[i];
    const nachbar = (i, r) => {
      for (const d of [-1, 1]) {
        for (let j = i + d, s = 0; j >= 0 && j < n && s < r; j += d) {
          if (zeilen[j] === '\f' || muell(zeilen[j])) continue;
          if (kopf(j)) return true;
          s++;
          break;
        }
      }
      return false;
    };
    const weg = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (seite[i]) weg[i] = true;
      else if (wiederholt[i] && (ein(zeilen[i]).length >= 25 || nachbar(i, 1))) weg[i] = true;
    }
    // Reste der Texterkennung zwischen Kopfzeilen und Leerzeilen an Seitenumbrüchen mit entfernen
    for (let i = 0; i < n; i++) {
      if (weg[i] || !(muell(zeilen[i]) || zeilen[i] === '\f')) continue;
      let a = i - 1; while (a >= 0 && !weg[a] && (muell(zeilen[a]) || zeilen[a] === '\f')) a--;
      let b = i + 1; while (b < n && !weg[b] && (muell(zeilen[b]) || zeilen[b] === '\f')) b++;
      if ((a >= 0 && weg[a]) || (b < n && weg[b])) weg[i] = true;
    }
    const bleiben = [], entfernt = [];
    zeilen.forEach((z, i) => { if (z === '\f') return; (weg[i] ? entfernt : bleiben).push(z); });
    return { zeilen: bleiben, entfernt, seiten };
  }
  // Randvermerk „Fort-/set-/zung“ (Fortsetzung eines Unterabschnitts auf der nächsten Seite)
  function randvermerkeEntfernen(zeilen) {
    return zeilen.map((z, i) => {
      if (/^\s*Fort-(?=\s|$)/.test(z) && zeilen.slice(i + 1, i + 3).some(x => /^\s*set-?(?=\s|$)/.test(x))) return z.replace(/Fort-/, '     ');
      if (/^\s*set-?(?=\s|$)/.test(z) || /^\s*setPr/.test(z)) return z.replace(/set-?/, '    ');
      if (/^\s*zung(?=\s|$)/.test(z)) return z.replace(/zung/, '    ');
      return z;
    });
  }

  // ------------------------------------------------------------------ Abschnitte finden
  // Kandidaten: „ABSCHNITT 9: …“ (stark), „9. Physikalische …“ / „9  PHYSIKALISCHE …“ (mit passendem Titel), Nummer allein
  // mit Titel in der nächsten Zeile (Text ohne Layout), Titel allein (Texterkennung hat die Nummer verloren), Unterabschnitt
  // „9.1 …“ (nur als Notbehelf). Gewählt wird die Folge mit aufsteigender Nummer und größtem Gewicht.
  function kandidaten(zeilen) {
    const aus = [];
    const naechste = (i, k = 3) => { const r = []; for (let j = i + 1; j < zeilen.length && r.length < k; j++) if (zeilen[j].trim()) r.push({ j, t: zeilen[j].trim() }); return r; };
    zeilen.forEach((z, i) => {
      const t = z.trim().replace(/^[^A-Za-zÄÖÜäöü0-9]+/, '').replace(/^[a-z]\s+(?=[A-ZÄÖÜ]{3})/, '').replace(/\s+/g, ' ');
      if (!t) return;
      let m;
      if ((m = /^(?:ABSCHNITT|Abschnitt|SECTION|Section|RUBRIK|Rubrik)\s*:?\s*(\d{1,2})\s*(?:[:.\-–]\s*)?(.*)$/.exec(t))) {
        const nr = +m[1];
        if (nr < 1 || nr > 16) return;
        let titel = m[2].replace(/[*]+$/, '').trim();
        if (!titel) { const w = naechste(i, 1)[0]; if (w && titelNr(w.t)) titel = w.t; }
        aus.push({ i, dok: nr, kw: titelNr(titel), titel, gewicht: 4 });
        return;
      }
      if ((m = /^([1-9]|1[0-6])(?:\s*[.):]\s*|\s+)([A-Za-zÄÖÜäöü].{3,})$/.exec(t)) && !/^\d+[.,]\d/.test(t)) {
        const titel = m[2].replace(/[*]+$/, '').trim(), kw = titelNr(titel);
        if (kw && (kw === +m[1] || Math.abs(kw - +m[1]) === 1)) aus.push({ i, dok: +m[1], kw, titel, gewicht: 3 });
        else if (kw) aus.push({ i, dok: kw, kw, titel, gewicht: 2 });
        return;
      }
      if ((m = /^([1-9]|1[0-6])\.?$/.exec(t))) {
        const nr = +m[1];
        for (const w of naechste(i, 3)) {
          const kw = titelNr(w.t);
          if (kw && (kw === nr || Math.abs(kw - nr) === 1) && w.t.length < 110) { aus.push({ i, dok: nr, kw, titel: w.t, gewicht: 3, titelZeile: w.j }); break; }
          if (/^\d/.test(w.t)) continue;
        }
        return;
      }
      if ((m = /^([1-9]|1[0-6])\s*[.,]\s*(\d{1,2})\.?(?:\s*[.,]\s*\d{1,2}\.?)?\s+([A-Za-zÄÖÜäöü].*)$/.exec(t))) {
        aus.push({ i, dok: +m[1], kw: +m[1], titel: '', gewicht: 0.3, unter: true });
        return;
      }
      const kw = titelNr(t);
      if (kw && t.length <= 110 && !/:\s*\S/.test(t)) {
        const gross = (t.match(/[A-ZÄÖÜ]/g) || []).length / Math.max(1, (t.match(/[A-Za-zÄÖÜäöüß]/g) || []).length);
        aus.push({ i, dok: kw, kw, titel: t.replace(/[*]+$/, ''), gewicht: gross > 0.7 ? 1.5 : 0.8 });
      }
    });
    return aus;
  }
  function abschnitteFinden(zeilen) {
    const k = kandidaten(zeilen);
    // gewichtete längste aufsteigende Folge (nach Nummer im Datenblatt)
    const best = k.map(c => c.gewicht), vor = k.map(() => -1);
    for (let a = 0; a < k.length; a++) {
      for (let b = 0; b < a; b++) {
        if (k[b].dok < k[a].dok && best[b] + k[a].gewicht > best[a]) { best[a] = best[b] + k[a].gewicht; vor[a] = b; }
      }
    }
    let ende = -1;
    best.forEach((w, a) => { if (ende < 0 || w > best[ende]) ende = a; });
    const folge = [];
    for (let a = ende; a >= 0; a = vor[a]) folge.unshift(k[a]);
    const teile = {};
    folge.forEach((c, j) => {
      const von = c.unter ? c.i : (c.titelZeile != null ? c.titelZeile + 1 : c.i + 1);
      const bis = j + 1 < folge.length ? folge[j + 1].i : zeilen.length;
      const nr = c.kw || c.dok;
      const zl = zeilen.slice(von, Math.max(von, bis));
      if (teile[nr]) teile[nr].zeilen.push(...zl);
      else teile[nr] = { nr, dok: c.dok, titel: c.titel, zeilen: zl, start: c.i };
    });
    const kopf = zeilen.slice(0, folge.length ? folge[0].i : 0);
    return { teile, kopf, anzahl: folge.filter(c => !c.unter).length };
  }

  // ------------------------------------------------------------------ Bezeichner und Werte
  const PRAEFIX = /^(?:\d{1,2}(?:\s*[.,]\s*\d{1,2}){1,3}\.?\s+|[-–•·*]\s+|[a-z]\)\s+|\(\w\)\s+)/;
  // Zeile in Spalten (Lücken ab zwei Leerzeichen) → [{ t, col }]
  function segmente(z) {
    const aus = [], re = /\S+(?: \S+)*/g;
    let m;
    while ((m = re.exec(z))) aus.push({ t: m[0], col: m.index });
    return aus;
  }
  const SATZ = /\b(?:ist|sind|wird|werden|kann|können|muss|müssen|soll|sollte|erforderlich|notwendig|tragen|verwenden|benutzen|vermeiden)\b/i;
  // Nach einem erkannten Bezeichner: Zusatz („(bei 20 °C)“, „[°C]“) und Wert trennen
  function wertNachLabel(t, ende, layout) {
    const nach = t.slice(ende);
    let m;
    if ((m = /^\s*[:：]\s*/.exec(nach))) return { zusatz: '', wert: nach.slice(m[0].length) };
    if (layout && (m = /^(.*?)\s{2,}(?=\S)/.exec(nach)) && m[1].length <= 50) {
      const z = m[1], k = z.indexOf(':');
      if (k >= 0) return { zusatz: z.slice(0, k).trim(), wert: (z.slice(k + 1) + ' ' + nach.slice(m[0].length)).trim() };
      return { zusatz: z.trim(), wert: nach.slice(m[0].length) };
    }
    if ((m = /^([^:]{0,50}?)\s*:\s*/.exec(nach)) && !SATZ.test(m[1])) return { zusatz: m[1].trim(), wert: nach.slice(m[0].length) };
    if (/^\s+[a-zäöü]/.test(nach) && SATZ.test(nach)) return { zusatz: '', wert: t, satz: true };
    return { zusatz: '', wert: nach.trim(), offen: true };
  }
  const LABEL_AEHNLICH = /^[A-ZÄÖÜ][^.:!?]{1,48}:(?:\s|$)/;
  // Einträge eines Abschnitts nach bekannten Bezeichnern: [{ k, label, zusatz, text, zeilen, offen }]
  function eintraege(zeilen, labels, layout) {
    const aus = [];
    let akt = null, labelSpalte = null, leer = 0;
    for (let i = 0; i < zeilen.length; i++) {
      const roh = zeilen[i];
      if (!roh.trim()) { leer++; continue; }
      const einr = roh.search(/\S/), t0 = roh.trim(), t = t0.replace(PRAEFIX, '');
      let treffer = null;
      for (const [k, re] of labels) { const m = re.exec(t); if (m) { treffer = { k, m }; break; } }
      const inWertspalte = layout && akt && akt.col != null && labelSpalte != null && einr > labelSpalte + 6 && einr >= akt.col - 3;
      if (treffer && !inWertspalte) {
        const w = wertNachLabel(t, treffer.m[0].length, layout);
        const seg = segmente(roh);
        const wertSeg = seg.find(s => s.col > einr + treffer.m[0].length);
        akt = { k: treffer.k, label: treffer.m[0], zusatz: w.zusatz, wert: w.wert ? [w.wert] : [], i, col: wertSeg ? wertSeg.col : null, offen: !!w.offen };
        aus.push(akt);
        labelSpalte = labelSpalte == null ? einr : Math.min(labelSpalte, einr);
        leer = 0;
        continue;
      }
      if (/^:\s*/.test(t0) && akt && !akt.wert.length) { akt.wert.push(t0.replace(/^:\s*/, '')); leer = 0; continue; }
      const fremd = (!layout || !akt || einr <= (labelSpalte == null ? 0 : labelSpalte) + 2) && LABEL_AEHNLICH.test(t) && !/^(?:BEI|Bei|Nach|Mit|Kein|Nicht)\b/.test(t);
      if (fremd || (PRAEFIX.test(t0) && /^\d/.test(t0))) {
        let label = t, wert = '';
        const gap = layout ? /\s{2,}/.exec(t) : null;
        if (t.includes(':') && (!gap || t.indexOf(':') < gap.index)) { label = t.slice(0, t.indexOf(':')); wert = t.slice(t.indexOf(':') + 1).trim(); }
        else if (gap) { label = t.slice(0, gap.index); wert = t.slice(gap.index).trim(); }
        akt = { k: null, label: ein(label), zusatz: '', wert: wert ? [wert] : [], i, col: null, ueberschrift: !fremd };
        aus.push(akt); leer = 0;
        continue;
      }
      const fortsetzung = akt && (inWertspalte || (leer === 0) || !akt.wert.length || (layout && einr > (labelSpalte || 0) + 6));
      if (fortsetzung) akt.wert.push(t0.replace(/^:\s*/, ''));
      else { akt = { k: null, label: '', zusatz: '', wert: [t0], i, col: null }; aus.push(akt); }
      leer = 0;
    }
    return aus.map(e => ({ ...e, text: verbinden(e.wert) }));
  }
  const alle = (es, k) => es.filter(e => e.k === k);
  const ersterText = (es, k) => { const e = es.find(x => x.k === k && x.text); return e ? e.text : ''; };

  // ------------------------------------------------------------------ Abschnitt 1: Name, Hersteller; Kopf: Stand
  const NAME_LABEL = /^(?:handelsname|produktname|produktbezeichnung|bezeichnung des (?:stoff(?:e?s)?|gemisch(?:e?s)?|produkt(?:e?s)?|erzeugnisses)(?:\s*\/\s*der zubereitung)?|stoffname|produktidentifikator|trade ?name|product ?name|product identifier|bezeichnung)\b/i;
  const SYNONYM_LABEL = /^(?:synonyme?|andere bezeichnungen|weitere bezeichnungen|other means of identification)\b/i;
  const ANDERE_LABEL = /^(?:artikel|art\.?-?nr|registrier|reach|eg-|ec[- ]|einecs|cas|index|summenformel|formel|molmasse|chemische|verwendung|relevante|1\.\d|ufi|sdb|version|stoff\s*\/|stoff\b|zubereitung)/i;
  function nameAufraeumen(n) {
    return ein(n).replace(/^["„“'«]+|["“”'»*]+$/g, '').replace(/([a-zäöüß]),(?=[a-zäöüß])/g, '$1, ').replace(/\s*[:;,]$/, '').trim();
  }
  function namenFinden(z1, layout) {
    const namen = [], synonyme = [];
    const wertAus = (t, re, i) => {
      let rest = t, m, tiefe = 0;
      while ((m = re.exec(rest)) && tiefe++ < 3) {
        const w = wertNachLabel(rest, m[0].length, layout);
        rest = (layout ? (segmente(w.wert)[0] || { t: '' }).t : w.wert).trim();
        re = NAME_LABEL;
      }
      if (rest) return rest;
      for (let j = i + 1; j < Math.min(z1.length, i + 5); j++) {
        const x = z1[j].trim().replace(/^:\s*/, '');
        if (!x || x.length < 3 && !/[A-Za-z]{2}/.test(x)) continue;
        if (NAME_LABEL.test(x) || SYNONYM_LABEL.test(x) || ANDERE_LABEL.test(x) || /^\d+(?:[.,]\d+)+\s/.test(x)) return '';
        return layout ? segmente(x)[0].t : x;
      }
      return '';
    };
    z1.forEach((z, i) => {
      const t = z.trim().replace(PRAEFIX, '');
      if (NAME_LABEL.test(t)) { const w = nameAufraeumen(wertAus(t, NAME_LABEL, i)); if (w && !/^(?:keine?|-+)$/i.test(w) && !ANDERE_LABEL.test(w)) namen.push(w); }
      else if (SYNONYM_LABEL.test(t)) { const w = wertAus(t, SYNONYM_LABEL, i); if (w && !/^(?:keine?|-+)$/i.test(w)) synonyme.push(...w.split(/\s*;\s*/)); }
    });
    return { namen: uniq(namen), synonyme: uniq(synonyme.map(nameAufraeumen)) };
  }
  const FIRMA_LABEL = /^(?:firmenname|firma|hersteller(?:\s*(?:[\/,]|und)\s*(?:importeur|lieferant|vertreiber|händler))*|lieferant|inverkehrbringer|unternehmen|company(?: name)?|manufacturer|supplier)\b/i;
  const FIRMA = /\b(?:GmbH|AG|KG|SE|Ltd|Inc|S\.?A\.?S?|B\.?V\.?|S\.?r\.?l\.?|Co\.?|mbH|e\.\s?K\.|OHG|Holding|Pharma|Chemie|Werke?)\b/i;
  function herstellerFinden(z1, kopfZeilen, layout) {
    const sauber = w => ein(w).replace(/\s*(?:Tel\.?|Telefon|Fax|E-?Mail|www\.).*$/i, '').replace(/[,;:]+$/, '').trim();
    const ab = Math.max(0, z1.findIndex(z => /^\s*1\s*[.,]\s*3\b/.test(z)));
    for (let i = ab; i < z1.length; i++) {
      const roh = z1[i], t = roh.trim().replace(PRAEFIX, '');
      const m = FIRMA_LABEL.exec(t);
      if (!m) continue;
      const w = wertNachLabel(t, m[0].length, layout);
      let wert = layout ? ((segmente(w.wert)[0] || { t: '' }).t) : w.wert;
      if (!wert || /:$/.test(wert) || /^(?:vertrieb|lieferant|importeur)\b/i.test(wert)) {
        const col = roh.search(/\S/);
        for (let j = i + 1; j < Math.min(z1.length, i + 4); j++) {
          if (!z1[j].trim() || /^\s*:\s*$/.test(z1[j])) continue;
          const s = layout ? segmente(z1[j]).find(x => Math.abs(x.col - col) <= 4) || segmente(z1[j])[0] : { t: z1[j].trim() };
          wert = s ? s.t.replace(/^:\s*/, '') : '';
          break;
        }
      }
      if (sauber(wert)) return sauber(wert);
    }
    for (let i = ab + 1; i < Math.min(z1.length, ab + 6); i++) {
      const x = (segmente(z1[i])[0] || { t: '' }).t;
      if (FIRMA.test(x) && !/:/.test(x)) return sauber(x);
    }
    for (const z of kopfZeilen) { const m = /Hersteller\s*\/?\s*Lieferant\s*:?\s+(.+?)(?:\s{2,}|\s+(?:Überarbeitung|Datum|Version)\b|$)/i.exec(z.trim()); if (m) return sauber(m[1]); }
    return '';
  }
  // Stand aus den Kopf- und Fußzeilen: Überarbeitungs-, Ausgabe-, Druckdatum, Version
  const DATUM = /\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})\b|\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2})\.?\s(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s(\d{4})\b/i;
  const MONATE = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
  function datumText(m) {
    const z = n => String(n).padStart(2, '0');
    if (m[1]) return `${z(m[1])}.${z(m[2])}.${m[3].length === 2 ? '20' + m[3] : m[3]}`;
    if (m[4]) return `${m[6]}.${m[5]}.${m[4]}`;
    if (m[7]) return `${z(m[7])}.${z(m[8])}.${m[9]}`;
    return `${z(m[10])}.${z(MONATE.indexOf(m[11].toLowerCase()) + 1)}.${m[12]}`;
  }
  const STAND_LABELS = [
    ['ueberarbeitet', /(?:überarbeitet\s+am|überarbeitung(?:sdatum)?|aktualisiert\s+am|aktualisierungsdatum|revisionsdatum|bearbeitungsdatum|geändert\s+am|änderungsdatum|revision\s+date|date\s+of\s+revision)\s*:?/i],
    ['druck', /(?:druckdatum|gedruckt\s+am|print(?:ing)?\s+date)\s*:?/i],
    ['erste', /datum\s+der\s+ersten\s+ausgabe\s*:?/i],
    ['letzte', /datum\s+der\s+letzten\s+ausgabe\s*:?/i],
    ['ausgabe', /(?:ausgabedatum|ausgabestand|ausgabe\s+vom|herausgegeben\s+am|erstellt\s+am|datum\s+der\s+erstellung|erstellungsdatum|issue\s+date|date\s+of\s+issue)\s*:?/i],
    ['datum', /(?:^|\s)datum\s*:/i],
    ['version', /(?:version(?:snummer)?|revisions?-?\s?nr\.?|revision|überarbeitungsnummer|aktualisierung)\s*:?/i],
  ];
  function standFinden(zeilen, layout) {
    const w = {};
    for (let i = 0; i < zeilen.length; i++) {
      const z = zeilen[i];
      const treffer = [];
      for (const [k, re] of STAND_LABELS) {
        const g = new RegExp(re.source, 'gi');
        let m;
        while ((m = g.exec(z))) {
          if (treffer.some(t => m.index < t.ende && m.index + m[0].length > t.start)) continue;
          treffer.push({ k, start: m.index, ende: m.index + m[0].length });
        }
      }
      treffer.sort((a, b) => a.start - b.start);
      const offen = [];
      treffer.forEach((t, j) => {
        if (w[t.k]) return;
        const bis = j + 1 < treffer.length ? treffer[j + 1].start : z.length;
        const rest = z.slice(t.ende, bis);
        if (t.k === 'version') { const m = /^\s*:?\s*(\d+(?:[.,]\d+)*[a-z]?)\b/i.exec(rest); if (m) w.version = m[1]; else offen.push(t); return; }
        const m = DATUM.exec(rest.slice(0, 40));
        if (m) w[t.k] = datumText(m); else offen.push(t);
      });
      if (!offen.length) continue;
      // Wert in der nächsten Zeile: nach Spalte (Layout) bzw. nach Reihenfolge
      for (let j = i + 1; j < Math.min(zeilen.length, i + 4); j++) {
        const nz = zeilen[j];
        if (!nz.trim()) continue;
        const tok = [], re = /\S+/g;
        let m;
        while ((m = re.exec(nz))) tok.push({ t: m[0], col: m.index });
        const passt = (t, k) => k === 'version' ? /^\d+(?:[.,]\d+)*[a-z]?$/i.test(t) : DATUM.test(t);
        offen.forEach((o, n) => {
          if (w[o.k]) return;
          let kand = null;
          if (layout) kand = tok.filter(x => passt(x.t, o.k) && Math.abs(x.col - o.start) <= 8)[0];
          if (!kand && tok.length === treffer.length) kand = passt(tok[treffer.indexOf(o)].t, o.k) ? tok[treffer.indexOf(o)] : null;
          if (!kand && offen.length === 1) kand = tok.find(x => passt(x.t, o.k));
          if (kand) w[o.k] = o.k === 'version' ? kand.t : datumText(DATUM.exec(kand.t));
        });
        if (offen.every(o => w[o.k]) || DATUM.test(nz)) break;
      }
    }
    const teile = [];
    const haupt = w.ueberarbeitet ? `überarbeitet am ${w.ueberarbeitet}` : w.ausgabe ? `Ausgabe ${w.ausgabe}` : w.datum ? `Datum ${w.datum}` : w.letzte ? `Ausgabe ${w.letzte}` : '';
    if (haupt) teile.push(haupt);
    if (w.version) teile.push(`Version ${w.version}`);
    if (w.druck && !haupt.includes(w.druck)) teile.push(`Druckdatum ${w.druck}`);
    return teile.join(', ');
  }

  // ------------------------------------------------------------------ Abschnitt 2: Kennzeichnung (GHS/CLP)
  const OCR_ZIFFER = { O: '0', o: '0', l: '1', I: '1', '|': '1', S: '5', B: '8', Z: '2' };
  const CODE_RE = /(^|[^A-Za-z0-9])(EUH|H|P)\s?([0-9OolISBZ|]{3})([A-Za-z]{0,2})(?![0-9])/g;
  // Gültiger Code aus einem Treffer (Texterkennung: „PS01“ → P501, „H3l4“ → H314); Zusatzbuchstaben nur, wenn bekannt
  function codeAus(typ, ziffern, zusatz) {
    if ((ziffern.match(/\d/g) || []).length < 2) return null;
    const z = ziffern.replace(/[OolISBZ|]/g, c => OCR_ZIFFER[c]);
    if (!/^\d{3}$/.test(z)) return null;
    if (typ === 'P') return P_NUMMERN.has(z) ? { code: 'P' + z, laenge: 0 } : null;
    const tab = typ === 'EUH' ? EUH_SAETZE : H_SAETZE;
    for (let n = zusatz.length; n >= 0; n--) if (tab[typ + z + zusatz.slice(0, n)]) return { code: typ + z + zusatz.slice(0, n), laenge: n };
    return null;
  }
  // Alle Codes einer Zeile, Kombinationen „P303 + P361 + P353“ zusammengefasst → [{ code, start, ende, plus }]
  function codesInZeile(z) {
    const aus = [];
    const re = new RegExp(CODE_RE.source, 'g');
    let m;
    while ((m = re.exec(z))) {
      const start = m.index + m[1].length;
      const c = codeAus(m[2], m[3], m[4]);
      if (!c) { re.lastIndex = start + 1; continue; }
      let ende = start + m[0].length - m[1].length - (m[4].length - c.laenge);
      const teile = [c.code];
      let plus = false, k;
      const weiter = /^\s*\+\s*(EUH|H|P)\s?([0-9OolISBZ|]{3})([A-Za-z]{0,2})(?![0-9])/;
      while ((k = weiter.exec(z.slice(ende)))) {
        const c2 = codeAus(k[1], k[2], k[3]);
        if (!c2 || c2.code[0] !== c.code[0]) break;
        teile.push(c2.code);
        ende += k[0].length - (k[3].length - c2.laenge);
      }
      if (/^\s*\+/.test(z.slice(ende))) { plus = true; ende += /^\s*\+/.exec(z.slice(ende))[0].length; }
      aus.push({ code: teile.join('+'), start, ende, plus });
      re.lastIndex = ende;
    }
    return aus;
  }
  const GHS_STOPP = /^\s*(?:\d+(?:\.\d+)+\.?\s|signalwort|gefahrenhinweis|sicherheitshinweis|ergänzende|zusätzliche|besondere kennzeichnung|gefahrenbestimmende|kennzeichnungselemente|gefahrenpiktogramm|piktogramm|prävention|reaktion|lagerung|entsorgung|allgemein(?:es)?\s*:|enthält\s*:|hazard statement|precautionary|signal word|response|storage|disposal|prevention|einstufung|sonstige gefahren)/i;
  // Codes mit Text aus Zeilen lesen: [{ code, text }] (Text kann leer sein)
  function codesLesen(zeilen, layout) {
    const aus = [];
    for (let i = 0; i < zeilen.length; i++) {
      const z = zeilen[i];
      const cs = codesInZeile(z);
      cs.forEach((c, n) => {
        let code = c.code, plus = c.plus;
        let text = z.slice(c.ende, n + 1 < cs.length ? cs[n + 1].start : z.length);
        if (layout) text = text.replace(/^\s+/, '').split(/\s{3,}/)[0];
        text = text.replace(/^[\s:\-–]+/, '');
        const codeSpalte = c.start;
        const teile = [text];
        if (n === cs.length - 1) {
          for (let j = i + 1; j < Math.min(zeilen.length, i + 8); j++) {
            const x = zeilen[j];
            if (!x.trim()) break;
            const xc = codesInZeile(x);
            if (plus && xc.length && xc[0].start <= x.search(/\S/) + 2 && xc[0].code[0] === code[0]) {
              code += '+' + xc[0].code; plus = xc[0].plus;
              teile.push(x.slice(xc[0].ende).replace(/^[\s:\-–]+/, ''));
              if (xc.length > 1) break;
              continue;
            }
            if (xc.length && xc[0].start <= (layout ? Math.max(codeSpalte + 2, x.search(/\S/) + 2) : x.search(/\S/) + 2)) break;
            if (GHS_STOPP.test(x.trim()) && !(layout && x.search(/\S/) > codeSpalte + 4)) break;
            if (layout) {
              const rechts = segmente(x).filter(s => s.col > codeSpalte + 1);
              if (!rechts.length) break;
              teile.push(rechts.map(s => s.t).join(' '));
            } else {
              const bisher = verbinden(teile);
              const t = x.trim();
              if (/[.!]$/.test(bisher) && !/^[a-zäöü(]/.test(t) && !(t.length <= 25 && /\.$/.test(t))) break;
              teile.push(t);
            }
          }
        }
        aus.push({ code, text: verbinden(teile).replace(/\s*\(?siehe abschnitt.*$/i, '').slice(0, 400).trim() });
      });
    }
    return aus;
  }
  const amtlich = code => code.startsWith('EUH') ? EUH_SAETZE[code] : H_SAETZE[code] ||
    (code.includes('+') ? code.split('+').map(c => H_SAETZE[c]).filter(Boolean).join(' ') : '');
  // Text zum Code prüfen: H/EUH gegen die amtliche Tabelle, P gegen Stichworte
  function textPasst(code, text) {
    if (!text || text.length < 6 || codesInZeile(text).length) return false;
    if (code[0] === 'P') {
      if (Object.values(H_SAETZE).some(h => aehnlich(text, h) >= 0.8 && woerter(text).length <= woerter(h).length + 3)) return false;
      if (istEnglisch(text)) return true;
      const sw = P_STICHWORT[code.split('+')[0]];
      return !sw || sw.test(text);
    }
    const a = amtlich(code);
    if (!a) return true;
    if (istEnglisch(text)) return false;
    return aehnlich(text, a) >= 0.6 && woerter(text).length <= woerter(a).length * 2 + 4;
  }
  function ghsCodes(z2, z16, layout) {
    const roh = codesLesen(z2, layout);
    const volltext = {};
    for (const c of codesLesen(z16 || [], layout)) if (c.code[0] !== 'P' && textPasst(c.code, c.text) && !volltext[c.code]) volltext[c.code] = c.text;
    const h = [], euh = [], p = [];
    const gesehen = {};
    for (const c of roh) {
      const ziel = c.code.startsWith('EUH') ? euh : c.code[0] === 'H' ? h : p;
      const gut = textPasst(c.code, c.text) ? c.text.replace(/\s*[;,]$/, '') : '';
      if (gesehen[c.code]) { if (gut && !gesehen[c.code].text) gesehen[c.code].text = gut; continue; }
      const e = { code: c.code, text: gut };
      gesehen[c.code] = e;
      ziel.push(e);
    }
    for (const e of [...h, ...euh]) if (!e.text) e.text = volltext[e.code] || amtlich(e.code) || '';
    // P-Kombinationen: Teile, die schon in einer Kombination stehen, nicht doppelt aufführen
    const inKombi = new Set(p.filter(e => e.code.includes('+')).flatMap(e => e.code.split('+')));
    return { h, euh, p: p.filter(e => e.code.includes('+') || !inKombi.has(e.code) || e.text) };
  }

  const PIKTO_NAMEN = [
    ['GHS01', /explodierende\s+bombe|\bbombe\b|exploding bomb/i], ['GHS03', /flamme\s+über\s+(?:einem\s+)?kreis|flame over circle/i],
    ['GHS02', /\bflamme\b|\bflame\b/i], ['GHS04', /gasflasche|gas cylinder/i], ['GHS05', /ätzwirkung|\bätzend|corrosion/i],
    ['GHS06', /totenkopf|skull/i], ['GHS07', /ausrufezeichen|exclamation/i], ['GHS08', /gesundheitsgefahr|health hazard/i],
    ['GHS09', /\bumwelt\b|environment/i],
  ];
  function piktogrammeFinden(z2) {
    const codes = [];
    z2.forEach(z => { const re = /\bGHS\s?0?([1-9])\b/g; let m; while ((m = re.exec(z))) codes.push('GHS0' + m[1]); });
    if (codes.length) return uniq(codes);
    const namen = [];
    z2.forEach((z, i) => {
      if (!/piktogramm|gefahrensymbol|pictogram/i.test(z)) return;
      for (let j = i; j < Math.min(z2.length, i + 5); j++) {
        let t = j === i ? z.slice(z.search(/piktogramm|gefahrensymbol|pictogram/i)).replace(/^\S+\s*:?/, '') : z2[j];
        if (j > i && (GHS_STOPP.test(t.trim()) || /H\d{3}/.test(t))) break;
        t = t.replace(/ätzwirkung auf (?:die )?haut|ätz-\/reizwirkung/gi, '');
        for (const [code, re] of PIKTO_NAMEN) if (re.test(t)) { namen.push(code); if (code === 'GHS03') t = t.replace(re, ''); }
      }
    });
    return uniq(namen);
  }
  // Piktogramme aus H-Sätzen ableiten (CLP Anhang I; Vorrangregeln nach Art. 26)
  function piktogrammeAusH(codes) {
    const hs = new Set((codes || []).flatMap(c => String(c.code || c).split('+')).map(c => (/^H\d{3}/.exec(c) || [''])[0]).filter(Boolean));
    const hat = l => l.some(c => hs.has(c));
    const p = new Set();
    if (hat(['H200', 'H201', 'H202', 'H203', 'H204', 'H240', 'H241'])) p.add('GHS01');
    if (hat(['H220', 'H221', 'H222', 'H223', 'H224', 'H225', 'H226', 'H228', 'H232', 'H241', 'H242', 'H250', 'H251', 'H252', 'H260', 'H261'])) p.add('GHS02');
    if (hat(['H270', 'H271', 'H272'])) p.add('GHS03');
    if (hat(['H280', 'H281'])) p.add('GHS04');
    if (hat(['H290', 'H314', 'H318'])) p.add('GHS05');
    if (hat(['H300', 'H301', 'H310', 'H311', 'H330', 'H331'])) p.add('GHS06');
    if (hat(['H304', 'H334', 'H340', 'H341', 'H350', 'H351', 'H360', 'H361', 'H370', 'H371', 'H372', 'H373'])) p.add('GHS08');
    if (hat(['H400', 'H410', 'H411'])) p.add('GHS09');
    const g07 = ['H302', 'H312', 'H332', 'H315', 'H317', 'H319', 'H335', 'H336', 'H420'].filter(c => hs.has(c)).filter(c => {
      if (p.has('GHS06') && ['H302', 'H312', 'H332'].includes(c)) return false;
      if (p.has('GHS05') && ['H315', 'H319'].includes(c)) return false;
      if (hs.has('H334') && ['H315', 'H317', 'H319'].includes(c)) return false;
      return true;
    });
    if (g07.length) p.add('GHS07');
    return [...p].sort();
  }
  function signalwortFinden(z2) {
    const norm = w => (/^(?:gefahr|danger)$/i.test(w) ? 'Gefahr' : 'Achtung');
    const WORT = '(GEFAHR|Gefahr|ACHTUNG|Achtung|Danger|DANGER|Warning|WARNING)';
    for (let i = 0; i < z2.length; i++) {
      const m = /signalwort|signal word/i.exec(z2[i]);
      if (!m) continue;
      const rest = z2[i].slice(m.index + m[0].length);
      const w = new RegExp('^\\s*:?\\s*["„“]?\\s*' + WORT + '\\b').exec(rest);
      if (w) return norm(w[1]);
      if (/^\s*:?\s*(?:nicht erforderlich|kein(?:es)?|entfällt|none|-|nicht zutreffend)/i.test(rest)) return '';
      for (let j = i + 1; j < Math.min(z2.length, i + 7); j++) {
        const t = z2[j];
        const w2 = new RegExp('(?:^|\\s)' + WORT + '\\s*$').exec(t) || new RegExp('^\\s*:?\\s*' + WORT + '\\b').exec(t);
        if (w2) return norm(w2[1]);
        if (/gefahrenhinweis|hazard statement|\bH\d{3}\b/i.test(t)) break;
      }
    }
    for (const z of z2) { const m = new RegExp('^\\s*:?\\s*' + WORT + '\\s*!?$').exec(z); if (m) return norm(m[1]); }
    return '';
  }
  const KLASSE = /\b(?:Unst\.?\s?Expl\.?|Expl\.?\s?\d(?:\.\d)?|Flam\.?\s?(?:Gas|Liq|Sol)\.?\s?\d[AB]?|Aerosol\s?\d|Ox\.?\s?(?:Gas|Liq|Sol)\.?\s?\d|Press\.?\s?Gas(?:\s?\((?:Comp|Liq|Ref\.?\s?Liq|Diss)\.?\))?|Self-?react\.?\s?[A-G]{1,2}|Pyr\.?\s?(?:Liq|Sol)\.?\s?\d|Self-?heat\.?\s?\d|Water-?react\.?\s?\d|Org\.?\s?Perox\.?\s?[A-G]{1,2}|Met\.?\s?Corr\.?\s?\d|Desen\.?\s?Expl\.?\s?\d|Acute\s?Tox\.?\s?\d|Skin\s?Corr\.?\s?\d[ABC]?|Skin\s?Irrit\.?\s?\d|Eye\s?Dam\.?\s?\d|Eye\s?Irrit\.?\s?\d|Resp\.?\s?Sens\.?\s?\d[AB]?|Skin\s?Sens\.?\s?\d[AB]?|Muta\.?\s?\d[AB]?|Carc\.?\s?\d[AB]?|Repr\.?\s?\d[AB]?|Lact\.|STOT\s?(?:SE|RE)\s?\d|Asp\.?\s?Tox\.?\s?\d|Aquatic\s?(?:Acute|Chronic)\s?\d|Ozone\s?\d?|Augenreiz\.?\s?\d|Aqu\.?\s?(?:akut|chron)\.?\s?\d|Hautreiz\.?\s?\d|Hautätz\.?\s?\d[ABC]?|Akut\.?\s?Tox\.?\s?\d|Augenschäd\.?\s?\d)/gi;
  const NICHT_EINGESTUFT = /kein(?:e|en)?\s+gefährliche[nrs]?\s+(?:stoff|gemisch|produkt|zubereitung)|nicht\s+als\s+gefährlich(?:e[nrs]?)?\s+(?:stoff|gemisch|zubereitung)?\s*(?:eingestuft|klassifiziert)|erfüllt\s+nicht\s+die\s+(?:kriterien|klassifizierungskriterien)|nicht\s+eingestuft|nicht\s+kennzeichnungspflichtig|not\s+classified|keine\s+einstufung/i;
  function einstufungFinden(z2, hCodes, zAlle) {
    const ende = z2.findIndex(z => /kennzeichnungselemente|^\s*2\s*[.,]\s*2\b/i.test(z));
    const zone = ende > 0 ? z2.slice(0, ende) : z2;
    const aus = [];
    for (const z of zone) {
      const hz = codesInZeile(z).filter(c => c.code[0] === 'H').map(c => c.code);
      const kl = (z.match(KLASSE) || []).map(ein);
      if (kl.length) { kl.forEach((k, n) => aus.push(k + (hz[n] && kl.length === hz.length ? ', ' + hz[n] : ''))); if (hz.length && kl.length !== hz.length) aus.push(hz.join(', ')); continue; }
      const lang = /([A-ZÄÖÜ][^:]{3,60}?(?:Kategorie|Kat\.|Typ|Category|Type)\s*[0-9A-G]{1,2}[AB]?)/.exec(z);
      if (lang) aus.push(ein(lang[1]) + (hz.length ? ', ' + hz.join(', ') : ''));
    }
    if (aus.length) return uniq(aus);
    if (hCodes.length) return [];
    const alt = [];
    const SYM = /\b(Xn|Xi|T\+|T|F\+|F|C|O|N|E)\s*[-–]?\s+(Ätzend|Brandfördernd|Umweltgefährlich|Gesundheitsschädlich|Reizend|Sehr giftig|Giftig|Hochentzündlich|Leichtentzündlich|Explosionsgefährlich|Entzündlich)\b/;
    z2.forEach((z, i) => {
      const s = SYM.exec(z);
      if (s) alt.push(`${s[2]} (${s[1]})`);
      const r = /^\s*(R\s?\d{1,2}(?:\s?\/\s?\d{1,2})*)\s+([A-ZÄÖÜ].{5,})$/.exec(z.trim());
      if (r) alt.push(`${r[1].replace(/\s/g, '')}: ${verbinden([r[2], ...(z2[i + 1] && /^\s{8,}[a-zäöü]/.test(z2[i + 1]) ? [z2[i + 1]] : [])]).split(/\s{3,}/)[0]}`);
    });
    if (alt.length) return uniq(alt);
    const frei = [];
    z2.forEach((z, i) => {
      if (!/^\s*(?:gefahrenhinweise?|besondere gefahrenhinweise)\s*:?\s*$/i.test(z)) return;
      const txt = [];
      for (let j = i + 1; j < z2.length && z2[j].trim() && txt.length < 4; j++) txt.push(z2[j]);
      frei.push(...saetze(verbinden(txt)));
    });
    if (frei.length) return frei.slice(0, 4);
    if (zAlle.some(z => NICHT_EINGESTUFT.test(z))) return ['nicht eingestuft'];
    return [];
  }

  // ------------------------------------------------------------------ Abschnitt 3: Zusammensetzung
  const ANTEIL_RE = /(?:[<>≤≥]=?\s*\d+(?:[.,]\d+)?\s*(?:[-–]|bis)\s*[<>≤≥]=?\s*\d+(?:[.,]\d+)?\s*%?|\d+(?:[.,]\d+)?\s*<\s*c\s*(?:<|≤)\s*\d+(?:[.,]\d+)?\s*%?|\d+(?:[.,]\d+)?\s*(?:<|≤)\s*c\b\s*%?|c\s*[<>≤≥]=?\s*\d+(?:[.,]\d+)?\s*%?|[<>≤≥]=?\s*\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s*(?:[-–]|bis)\s*\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s*%)/;
  const casOcr = z => z.replace(/\b[\dOolI]{2,7}\s?[-‐–]\s?[\dOolI]{2}\s?[-‐–]\s?[\dOolI]\b/g, t => (/\d/.test(t) ? t.replace(/[Oo]/g, '0').replace(/[lI]/g, '1') : t));
  function casIn(z) {
    const aus = [], re = /(?:^|[^\d-])(\d{2,7})\s?[-‐–]\s?(\d{2})\s?[-‐–]\s?(\d)(?![\d-])/g;
    let m;
    while ((m = re.exec(casOcr(z)))) { const c = `${m[1]}-${m[2]}-${m[3]}`; if (S.istCas(c)) aus.push({ cas: c, start: m.index + m[0].indexOf(m[1]), ende: re.lastIndex }); }
    return aus;
  }
  function egGueltig(t) {
    const m = /^(\d{3})-(\d{3})-(\d)$/.exec(t);
    if (!m) return false;
    const z = (m[1] + m[2]).split('').map(Number);
    return z.reduce((s, x, i) => s + x * (i + 1), 0) % 11 === Number(m[3]);
  }
  const KENNUNG = /^(?:\*?\d{3}-\d{3}-\d|\d{2,7}-\d{2}-\d|\d{3}-\d{3}-\d{2}-[\dX]|01-\d{10}-\d{2}(?:-[\dX]{4})?|nicht zugewiesen|not assigned|[-–*\/]+|ein[ec]cs.*|elincs.*|cas.*|eg-?nr.*|reach.*|index.*)$/i;
  const ALT_EINSTUFUNG = /^(?:(?:Xn|Xi|T\+?|F\+?|C|O|N|E)(?:\s*[-–,]\s*\S.*)?|R\s?\d.*|[-\d\/]+-?)$/;
  const istNamensteil = s => {
    const t = s.trim();
    if ((t.match(/[A-Za-zÄÖÜäöüß]/g) || []).length < 3) return false;
    if (KENNUNG.test(t) || ANTEIL_RE.test(t) && t.replace(ANTEIL_RE, '').trim().length < 3) return false;
    if (new RegExp(KLASSE.source, 'i').test(t) || codesInZeile(t).length || ALT_EINSTUFUNG.test(t)) return false;
    if (/gesundheitsschädlich|reizend|ätzend|giftig|umweltgefährlich|brandfördernd|entzündlich|m-fa[ck]tor|kategorie/i.test(t)) return false;
    return true;
  };
  // Einstufung aus Text: Klassen und H-Sätze paarweise („Acute Tox. 4, H302; Eye Irrit. 2, H319“), sonst alte R-Sätze
  function einstufungText(text) {
    const kl = (text.match(KLASSE) || []).map(ein);
    const hz = uniq(codesInZeile(text).filter(c => c.code[0] === 'H').map(c => c.code));
    if (kl.length && kl.length === hz.length) return kl.map((k, i) => `${k}, ${hz[i]}`).join('; ');
    if (kl.length || hz.length) return [kl.join(', '), hz.join(', ')].filter(Boolean).join('; ');
    const sym = uniq((text.match(/(?:^|\s)(Xn|Xi|T\+|F\+|[TFCONE])(?=\s|,|$)/g) || []).map(s => s.trim()));
    const r = (text.match(/R\s?\d{1,2}(?:\s?[-\/]\s?\d{1,2})*-?(?:\s+[-\d\/]+)*/g) || []).join('').replace(/\s+/g, '');
    return [sym.join(', '), r].filter(Boolean).join('; ');
  }
  const anteilText = a => { const t = ein(a).replace(/\s*%$/, ' %'); return /%/.test(t) ? t : t + ' %'; };
  // CAS → Name aus dem ganzen Text („Natriumcumolsulfonat (CAS: 28348-53-0)“, „Essigsäure; CAS-Nr.: 64-19-7“, „122-99-6 2-Phenoxyethanol“)
  function casNamen(zeilen) {
    const nm = {};
    for (const z of zeilen) {
      for (const c of casIn(z)) {
        if (nm[c.cas]) continue;
        const vor = z.slice(0, c.start).replace(/\(?\s*(?:CAS(?:-?Nr\.?|-Nummer)?|CAS No\.?)\s*:?\s*$/i, '').replace(/[;,(]\s*$/, '').trim();
        const nach = z.slice(c.ende).replace(/^\s*\)?\s*[:;,]?\s*/, '').trim();
        const v = (segmente(vor).pop() || { t: '' }).t, n = (segmente(nach)[0] || { t: '' }).t;
        if (istNamensteil(v) && v.length <= 80 && /\(\s*CAS|CAS-?Nr|;\s*$/i.test(z.slice(0, c.start + 1) + ';')) nm[c.cas] = v.replace(/[:;,]$/, '');
        else if (!v.trim() && istNamensteil(n) && n.length <= 80) nm[c.cas] = n.replace(/[:;,]$/, '');
      }
    }
    return nm;
  }
  function bestandteileLesen(z3, layout, nameZuCas) {
    const aus = [];
    const stoppZeile = t => /^(?:\*|hinweis|wortlaut|die erklärung|der volle|nach verordnung|gemäß verordnung|zusätzliche hinweise|anmerkung|einstufung nach|enthaltener stoff\s+gefahrenklasse|volltext|for the full text)/i.test(t);
    if (layout) {
      const zeilen = z3.map(z => casOcr(z));
      const startZeile = i => casIn(zeilen[i]).length || segmente(zeilen[i]).some(s => ANTEIL_RE.test(s.t) && s.t.replace(ANTEIL_RE, '').trim().length < 4);
      let i = 0;
      while (i < zeilen.length) {
        if (!zeilen[i].trim() || !startZeile(i) || stoppZeile(zeilen[i].trim())) { i++; continue; }
        const block = [i];
        let j = i + 1;
        for (; j < zeilen.length; j++) {
          const t = zeilen[j].trim();
          if (!t) { const n = zeilen.slice(j + 1).findIndex(x => x.trim()); const k = n < 0 ? -1 : j + 1 + n; if (k < 0 || startZeile(k) || stoppZeile(zeilen[k].trim()) || !casIn(zeilen.slice(i, j).join(' ')).length) break; continue; }
          if (stoppZeile(t)) break;
          if (startZeile(j)) {
            const hatCas = block.some(b => casIn(zeilen[b]).length);
            if (hatCas || casIn(zeilen[j]).length === 0 || !segmente(zeilen[j]).some(s => istNamensteil(s.t))) { if (hatCas || block.length > 0 && segmente(zeilen[j]).some(s => istNamensteil(s.t))) break; }
          }
          block.push(j);
        }
        const erste = segmente(zeilen[block[0]]);
        const nameSeg = erste.find(s => istNamensteil(s.t)) || (block[1] != null ? segmente(zeilen[block[1]]).find(s => istNamensteil(s.t)) : null);
        const name = [];
        if (nameSeg) {
          for (const b of block) {
            const s = segmente(zeilen[b]).find(x => Math.abs(x.col - nameSeg.col) <= 3);
            if (s && istNamensteil(s.t)) name.push(s.t);
            else if (name.length && b !== block[0]) break;
          }
        }
        const text = block.map(b => zeilen[b]).join('\n');
        const cas = (casIn(text)[0] || {}).cas || '';
        const am = ANTEIL_RE.exec(segmente(zeilen[block[0]]).filter(s => !casIn(s.t).length).map(s => s.t).join('   ')) || ANTEIL_RE.exec(text.replace(/\d{2,7}-\d{2}-\d/g, ''));
        const rest = block.map(b => segmente(zeilen[b]).filter(s => !(nameSeg && Math.abs(s.col - nameSeg.col) <= 3 && istNamensteil(s.t))).map(s => s.t).join(' ')).join(' ');
        let nameText = verbinden(name).replace(/\s*\*$/, '').replace(/,$/, '');
        if (!nameText && cas && nameZuCas[cas]) nameText = nameZuCas[cas];
        if (cas || nameText) aus.push({ name: nameText, cas, anteil: am ? anteilText(am[0]) : '', einstufung: einstufungText(rest) });
        i = Math.max(j, i + 1);
      }
    } else {
      z3.forEach((z0, i) => {
        const z = casOcr(z0);
        for (const c of casIn(z)) {
          if (aus.some(b => b.cas === c.cas)) continue;
          let rest = (z.slice(0, c.start) + ' ' + z.slice(c.ende)).replace(/01-\d{10}-\d{2}(?:-[\dX]{4})?/g, ' ').replace(/\*?\d{3}-\d{3}-\d(?:\d-[\dX])?/g, ' ');
          const am = ANTEIL_RE.exec(rest);
          if (am) rest = rest.replace(am[0], ' ');
          let name = ein(rest.replace(/\b(?:CAS(?:-?Nr\.?)?|EINECS\/ELINCS|EINECS|ELINCS|EG-?Nr\.?|Index-?Nr\.?|REACH)\b\s*:?/gi, ' ')
            .replace(new RegExp(KLASSE.source, 'gi'), ' ').replace(/\b(?:EUH|H)\s?\d{3}[A-Za-z]{0,2}\b/g, ' ').replace(/-{2,}|[;|]/g, ' ')).replace(/^[,.:\s]+|[,.:\s]+$/g, '');
          if (name && z3[i + 1] && /^\s*[a-zäöü][a-zäöü ,.-]+$/.test(z3[i + 1]) && !/\d/.test(z3[i + 1])) name = verbinden([name, z3[i + 1]]);
          if (!istNamensteil(name)) name = nameZuCas[c.cas] || '';
          aus.push({ name: name.replace(/,$/, ''), cas: c.cas, anteil: am ? anteilText(am[0]) : '', einstufung: einstufungText(z) });
        }
      });
    }
    // Einstufung aus einer zweiten Tabelle („Enthaltener Stoff · Gefahrenklasse · H-Satz“) über den Namensanfang zuordnen
    for (const b of aus) {
      if (/\b(?:[A-Z][a-z]+\.?\s?){1,2}\d|H\d{3}/.test(b.einstufung) || !b.name) continue;
      const anfang = b.name.toLowerCase().replace(/[^a-zäöüß]/g, '').slice(0, 8);
      if (anfang.length < 5) continue;
      const i = z3.findIndex(z => z.trim().toLowerCase().replace(/[^a-zäöüß]/g, '').startsWith(anfang) && (new RegExp(KLASSE.source, 'i').test(z) || /H\s?\d{3}/.test(z)));
      if (i < 0) continue;
      const txt = [z3[i]];
      for (let j = i + 1; j < Math.min(z3.length, i + 4); j++) { if (!z3[j].trim() || aus.some(x => x !== b && x.name && z3[j].trim().toLowerCase().startsWith(x.name.toLowerCase().slice(0, 6)))) break; txt.push(z3[j]); }
      const e = einstufungText(txt.join(' '));
      if (e) b.einstufung = e;
    }
    return aus.filter(b => b.cas || (b.name && b.anteil));
  }

  // ------------------------------------------------------------------ Abschnitt 4 bis 6
  const EH_LABELS = [
    ['allgemein', /^(?:allgemeine?\s+(?:hinweise?|angaben|anmerkungen|informationen)|allgemein(?:es)?\b|general(?: information| advice)?\b|hinweise? für (?:den )?ersthelfer|schutz der ersthelfer|selbstschutz)/i],
    ['hautaugen', /^(?:nach\s+)?haut-?\s*und\s+augenkontakt/i],
    ['einatmen', /^(?:nach\s+(?:dem\s+)?(?:einatmen|inhalation|inhalieren)|bei\s+einatmen|einatmen|inhalation|einatmung)\b/i],
    ['haut', /^(?:nach\s+|bei\s+)?(?:haut-?\s*(?:oder|und)\s*haarkontakt|hautkontakt|kontakt mit der haut|berührung mit der haut|haut\b|skin(?: contact)?\b)/i],
    ['augen', /^(?:nach\s+|bei\s+)?(?:augenkontakt|kontakt mit den augen|berührung mit den augen|augen\b|eyes?(?: contact)?\b)/i],
    ['verschlucken', /^(?:nach\s+|bei\s+)?(?:aufnahme durch\s+)?(?:verschlucken|ingestion|orale aufnahme)\b/i],
  ];
  function ersteHilfeLesen(z4, layout) {
    const e = { allgemein: [], einatmen: [], haut: [], augen: [], verschlucken: [], arzt: [] };
    const ende = z4.findIndex(z => /^\s*4\s*[.,]\s*[23]\b|wichtigste akute|hinweise auf ärztliche|^\s*symptome\b/i.test(z));
    const es = eintraege(ende > 0 ? z4.slice(0, ende) : z4, EH_LABELS, layout);
    let ersterLabel = false;
    for (const x of es) {
      if (x.k) ersterLabel = true;
      const s = saetze(x.text).filter(t => !istLeer(t) && !/^beschreibung der erste-hilfe/i.test(t));
      if (!s.length) continue;
      if (x.k === 'hautaugen') { e.haut.push(...s); e.augen.push(...s); }
      else if (x.k) e[x.k].push(...s);
      else if (!ersterLabel) e.allgemein.push(...s);
    }
    // 4.2 Symptome und 4.3 Hinweise für den Arzt (ohne die Überschriften)
    if (ende > 0) {
      const rest = z4.slice(ende).map(x => ein(x).replace(/^\s*4\s*[.,]\s*[23]\.?\s*/, '')
        .replace(/^(?:wichtigste akute und verzögert auftretende symptome und wirkungen|wichtigste symptome und wirkungen|hinweise auf ärztliche soforthilfe oder spezialbehandlung|hinweise für den arzt)\s*:?\s*/i, ''))
        .filter(Boolean).join(' ');
      e.arzt = uniq(saetze(rest).filter(t => !istLeer(t) && t.length > 3)).slice(0, 12);
    }
    return e;
  }
  // Abschnitt 13: Entsorgung (kurz)
  function entsorgungLesen(z13) {
    const t = z13.map(x => ein(x).replace(/^\s*13\s*[.,]\s*\d\.?\s*/, '')
      .replace(/^(?:abschnitt\s*13\s*:?\s*)?(?:hinweise zur entsorgung|verfahren der abfallbehandlung|verfahren zur abfallbehandlung)\s*:?\s*/i, ''))
      .filter(Boolean).join(' ');
    return uniq(saetze(t).filter(x => !istLeer(x) && x.length > 3 && !/^abschnitt\s*13\b/i.test(x) && !(/abfallschlüssel/i.test(x) && x.length > 160))).slice(0, 8);
  }
  const LOESCH_LABELS = [
    ['ungeeignet', /^(?:(?:aus sicherheitsgründen\s+)?ungeeignete?\s+löschmittel|löschmittel,?\s+die aus sicherheitsgründen nicht|ungeeignet\b|unsuitable)/i],
    ['geeignet', /^(?:geeignete?\s+löschmittel|löschmittel\s*[-–]?\s*geeignet|geeignet\b|suitable extinguishing)/i],
    ['loeschmittel', /^(?:löschmittel|extinguishing media)\b/i],
    ['gefahren', /^(?:besondere\s+(?:vom|von dem|von der|von)\s+.{0,40}?ausgehende\s+gefahren|besondere\s+gefahren|besondere\s+gefährdungen|gefährliche\s+(?:verbrennungs|zersetzungs)produkte|spezielle\s+risiken|gefahrbestimmende\s+(?:rauch|brand)gase|bei\s+brand\s+kann\s+entstehen|mögliche\s+verbrennungsprodukte|special hazards|hazardous combustion)/i],
    ['psa', /^(?:besondere\s+schutzausrüstung|spezielle\s+schutzausrüstung|schutzausrüstung|persönliche schutzausrüstung|protective equipment)/i],
    ['hinweise', /^(?:hinweise? für die brandbekämpfung|spezielle verfahren|zusätzliche hinweise|weitere (?:hinweise|informationen?|angaben)|sonstige (?:hinweise|angaben)|advice for firefighters)/i],
    ['brandklasse', /^brandklasse\b/i],
  ];
  const PSA_WORT = /atemschutz|atemgerät|schutzanzug|schutzkleidung|schutzbrille|handschuh|vollschutz|chemikalienschutz|isoliergerät|umluftunabhängig|umgebungsluftunabhängig/i;
  function loeschmittelLesen(z5, layout) {
    const l = { geeignet: [], ungeeignet: [], brandklasse: '', hinweise: [], psaBrand: [], gefahrenBrand: [] };
    const es = eintraege(z5, LOESCH_LABELS, layout);
    const allg = [];
    for (const x of es) {
      if (!x.text || istLeer(x.text) && x.k !== 'ungeeignet') continue;
      const s = saetze(x.text).filter(t => !istLeer(t));
      if (x.k === 'geeignet') l.geeignet.push(...s.flatMap(aufzaehlung));
      else if (x.k === 'ungeeignet') l.ungeeignet.push(...s.filter(t => !/^kein(?:e|\(e,er\))?\.?$/i.test(t)).flatMap(aufzaehlung));
      else if (x.k === 'loeschmittel') allg.push(...s.flatMap(aufzaehlung));
      else if (x.k === 'gefahren') l.gefahrenBrand.push(...s.filter(t => !/^keine?\.?$/i.test(t)));
      else if (x.k === 'psa') l.psaBrand.push(...s);
      else if (x.k === 'brandklasse') l.brandklasse = ohneSatzzeichen(x.text);
      else for (const t of s) (PSA_WORT.test(t) ? l.psaBrand : l.hinweise).push(t);
    }
    if (!l.geeignet.length) l.geeignet.push(...allg);
    return l;
  }
  function freisetzungLesen(z6, layout) {
    const ende = z6.findIndex(z => /^\s*6\s*[.,]\s*4\b|verweis auf andere abschnitte/i.test(z));
    const es = eintraege(ende > 0 ? z6.slice(0, ende) : z6, [], layout);
    const aus = [];
    for (const x of es) {
      const label = ein(x.label);
      for (const t of saetze(x.text)) {
        if (istLeer(t) || /^(?:siehe|see)\b|abschnitt\s+\d+\s*(?:und|,)|^\d+\.\d/i.test(t) && t.length < 60) continue;
        aus.push(/einsatzkräfte|größere[n]? mengen|großen mengen|kleine[n]? mengen/i.test(label) ? `${label.replace(/:$/, '')}: ${t}` : t);
      }
    }
    return uniq(aus);
  }

  // ------------------------------------------------------------------ Abschnitt 8: Grenzwerte und Schutzausrüstung
  const AGW_WERT = /\d+(?:[.,]\d+)?\s*(?:ppm|ml\/m[³3]|mg\/m[³3]|f\/m³|fasern\/m³)(?:\s*\((?:ppm|ml\/m[³3])\))?(?:\s*[–\-,;\/]\s*\d+(?:[.,]\d+)?\s*(?:ppm|ml\/m[³3]|mg\/m[³3]))?/i;
  function agwLesen(z8, layout, nameZuCas) {
    const ende = z8.findIndex(z => /^\s*8\s*[.,]\s*2\b|begrenzung und überwachung der exposition|^\s*persönliche schutz/i.test(z));
    const zone = ende > 0 ? z8.slice(0, ende) : z8;
    const aus = [];
    let stoff = '', kopf = null;
    for (let i = 0; i < zone.length; i++) {
      const z = zone[i];
      const c = casIn(z)[0];
      if (c) {
        const vor = z.slice(0, c.start).replace(/[;,]?\s*CAS(?:-?Nr\.?)?\s*:?\s*$/i, '').trim();
        stoff = istNamensteil(vor) && !/dnel|pnec/i.test(vor) ? vor.replace(/[;:,]$/, '') : (nameZuCas[c.cas] || stoff);
      }
      if (/dnel|dmel|pnec|derived|biologische?r? grenzwert|\bbgw\b|kurzzeitwert|früher/i.test(z)) continue;
      if (layout && /\bppm\b/i.test(z) && /mg\/m/i.test(z) && !/\d/.test(z.replace(/m[³3]/g, ''))) { kopf = { ppm: z.search(/\bppm\b/i), mg: z.search(/mg\/m/i) }; continue; }
      if (kopf && c) {
        const tok = segmente(z.slice(c.ende)).filter(s => /^\d+(?:[.,]\d+)?$/.test(s.t));
        const bei = (col) => tok.find(s => Math.abs(s.col + c.ende - col) <= 7);
        const name = (segmente(z.slice(c.ende))[0] || { t: '' }).t;
        const p = bei(kopf.ppm), mg = bei(kopf.mg);
        const teile = [p ? `${p.t} ppm` : '', mg ? `${mg.t} mg/m³` : ''].filter(Boolean);
        if (teile.length) aus.push(`${istNamensteil(name) ? name + ': ' : ''}${teile.join(', ')}`);
        continue;
      }
      if (!/(?:agw|arbeitsplatzgrenzwert|\bmak\b|mak-wert|trgs\s*900|grenzwert|\btlv\b|\boel\b)/i.test(z) || /kein(?:e|en)?\s+(?:wert|grenzwert|arbeitsplatzgrenzwert)|nicht festgelegt|keine stoffe/i.test(z)) continue;
      let m = AGW_WERT.exec(z);
      if (!m && zone[i + 1] && !casIn(zone[i + 1]).length) m = AGW_WERT.exec(zone[i + 1]);
      if (!m) continue;
      const art = /\bmak\b|mak-wert/i.test(z) && !/agw|arbeitsplatzgrenzwert/i.test(z) ? ' (MAK-Wert)' : '';
      aus.push(`${stoff && !new RegExp(stoff.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(m[0]) ? stoff + ': ' : ''}${ein(m[0])}${art}`);
    }
    const u = uniq(aus);
    if (u.length === 1) return u[0].replace(/^[^:]+:\s*(?=\d)/, '');
    return u.join('; ');
  }
  const PSA_LABELS = [
    ['atem', /^(?:atemschutz(?:gerät)?|atemgerät|respiratory protection|schutz der atemwege)\b/i],
    ['hand', /^(?:handschutz|hand protection|schutzhandschuhe|hand-?\s*und\s+hautschutz)\b/i],
    ['augen', /^(?:augen-?\s*\/?\s*(?:und\s+)?gesichtsschutz|augenschutz|gesichtsschutz|augen\b|eye(?:\/face)? protection)/i],
    ['haut', /^(?:hautschutz|schutz der haut(?:\s*\/\s*des körpers)?|haut-? und körperschutz|skin protection)\b/i],
    ['koerper', /^(?:körperschutz|schutz des körpers|schutzkleidung|sonstige schutzmaßnahmen|sonstige schutzausrüstung|body protection|skin and body)\b/i],
    ['hygiene', /^(?:(?:allgemeine\s+)?(?:schutz-? und )?hygienemaßnahmen|besondere hygienemaßnahmen|hygiene\b|schutz der ersthelfer)/i],
    ['sonst', /^(?:begrenzung und überwachung der umweltexposition|umweltexposition|environmental exposure|technische schutzmaßnahmen|geeignete technische steuerungseinrichtungen|technische maßnahmen|zusätzliche hinweise zur gestaltung|persönliche schutzausrüstung|individuelle schutzmaßnahmen|persönliche schutzmaßnahmen|begrenzung und überwachung)/i],
  ];
  const MATERIAL = /(?:nitril(?:-?chloropren)?(?:kautschuk|latex|gummi)?(?:\s*2-?\s*schichtsystem)?|\bNBR\b|butyl(?:kautschuk)?|\bIIR\b|chloropren(?:kautschuk)?|\bCR\b|neopren|fluor(?:kautschuk|elastomer)|\bFKM\b|viton|naturkautschuk|naturlatex|\bNR\b|\blatex\b|polyvinylchlorid|\bPVC\b|polyvinylalkohol|\bPVA\b|polyethylen|laminat(?:folie)?|\bleder\b)(?:\s*\([^)]{2,30}\))?/i;
  function handschuheLesen(text) {
    const t = ein(text);
    if (!t || !MATERIAL.test(t)) return [];
    const teile = [];
    const re = new RegExp(MATERIAL.source, 'gi');
    let m;
    const treffer = [];
    while ((m = re.exec(t))) treffer.push({ i: m.index, t: m[0] });
    const verschieden = uniq(treffer.map(x => x.t.toLowerCase().replace(/\s*\(.*\)$/, '').replace(/kautschuk|gummi|latex/, '')));
    const stuecke = verschieden.length > 1 ? treffer.filter((x, k) => k === 0 || x.i - treffer[k - 1].i > 25).map((x, k, a) => t.slice(Math.max(0, k ? x.i - 10 : 0), k + 1 < a.length ? a[k + 1].i - 10 : t.length)) : [t];
    for (const st of stuecke) {
      const mat = MATERIAL.exec(st);
      if (!mat) continue;
      let material = ein(mat[0]).replace(/^(.)/, c => c.toUpperCase());
      const dm = /(?:dicke|stärke|thickness)\s*:?\s*([<>≥≤]?\s*\d+(?:[.,]\d+)?\s*mm)/i.exec(st) || /([<>≥≤]?\s*\d+(?:[.,]\d+)?\s*mm)\b/.exec(st);
      const zm = /(?:durchbruch\S*|permeation\S*|tragedauer|breakthrough\S*)[^0-9<>≥≤]{0,30}((?:[<>≥≤]=?\s*)?\d+(?:[.,]\d+)?\s*(?:min(?:uten)?\.?|h\b|std\.?|stunden)?(?:\s*,\s*[<>≥≤]=?\s*\d+\s*(?:min(?:uten)?\.?|h\b))?)/i.exec(st)
        || /((?:[<>≥≤]=?\s*)?\d+\s*(?:min(?:uten)?|Min)\b)/.exec(st);
      const zeit = zm ? ein(zm[1]).replace(/\.$/, '') : '';
      let stufe = 'unbekannt';
      if (/nicht geeignet|ungeeignet|not suitable|nicht beständig/i.test(st)) stufe = 'nicht';
      else if (zeit) {
        const zahlen = (zeit.match(/\d+(?:[.,]\d+)?/g) || []).map(x => parseFloat(x.replace(',', '.')) * (/h\b|std|stunden/i.test(zeit) ? 60 : 1));
        const max = Math.max(...zahlen);
        stufe = !/</.test(zeit) && max >= 480 ? 'gut' : 'bedingt';
      } else {
        const lv = /(?:level|klasse|schutzindex|permeationslevel)\s*:?\s*\[?\s*(\d)/i.exec(st);
        if (lv) stufe = +lv[1] >= 6 ? 'gut' : 'bedingt';
        else if (/geeignet(?:es|e)? (?:material|handschuh)|als geeignet|empfohlen/i.test(st)) stufe = 'gut';
      }
      teile.push({ material, dicke: dm ? ein(dm[1]) : '', zeit, stufe });
    }
    return teile.filter((x, k, a) => a.findIndex(y => y.material.toLowerCase() === x.material.toLowerCase()) === k);
  }
  function psaLesen(z8, layout) {
    const p = { atem: [], koerper: [], augen: [], hand: [], handMaterialien: [], hygiene: [] };
    let ab = z8.findIndex(z => /^\s*8\s*[.,]\s*2\b/.test(z));
    if (ab < 0) ab = z8.findIndex(z => /persönliche schutz|individuelle schutz/i.test(z));
    const es = eintraege(ab >= 0 ? z8.slice(ab) : z8, PSA_LABELS, layout);
    const handText = [];
    for (const x of es) {
      if (!x.k || x.k === 'sonst' || !x.text) continue;
      const s = saetze(x.text).filter(t => !/^\d+\.\d/.test(t));
      if (!s.length) continue;
      if (x.k === 'haut') { if (/handschuh/i.test(x.text)) { p.hand.push(...s); handText.push(x.text); } else p.koerper.push(...s); }
      else if (x.k === 'hand') { p.hand.push(...s); handText.push(x.text); }
      else p[x.k].push(...s);
    }
    p.handMaterialien = handschuheLesen(handText.join(' '));
    for (const k of ['atem', 'koerper', 'augen', 'hand', 'hygiene']) p[k] = uniq(p[k]);
    return p;
  }

  // ------------------------------------------------------------------ Abschnitt 9: Kennwerte
  const KENN_LABELS = [
    ['aggregat', /^(?:aggregatzustand|zustand(?:\s+bei\s+20\s*°?\s*C)?|physikalischer zustand|physical state|form)\b/i],
    ['aussehen', /^(?:aussehen|erscheinungsbild|appearance)\b/i],
    ['farbe', /^(?:farbe|colou?r)\b/i],
    ['geruchsschwelle', /^(?:geruchsschwelle|odou?r threshold)/i],
    ['geruch', /^(?:geruch|odou?r)\b/i],
    ['ph', /^(?:ph-?wert|ph\b)/i],
    ['schmelzpunkt', /^(?:schmelzpunkt|schmelzbereich|schmelz-?\s*\/?\s*gefrierpunkt|gefrierpunkt|erstarrungspunkt|stockpunkt|melting point|freezing point)/i],
    ['siedepunkt', /^(?:siedepunkt|siedebeginn|siedebereich|anfangssiedepunkt|siedetemperatur|boiling point|initial boiling)/i],
    ['flammpunkt', /^(?:flammpunkt|flash ?point)/i],
    ['verdampfung', /^(?:verdampfungsgeschwindigkeit|verdunstungszahl|evaporation rate)/i],
    ['entzuendbarkeit', /^(?:entzündbarkeit|entzündlichkeit|flammability)/i],
    ['zuendtemperatur', /^(?:zündtemperatur|selbstentzündungstemperatur|entzündungstemperatur|auto-?ignition temperature|ignition temperature)/i],
    ['zersetzung', /^(?:zersetzungstemperatur|decomposition temperature)/i],
    ['ueg', /^(?:untere explosionsgrenze|explosionsgrenze,? unten|ueg|lower explosion limit|lel)\b/i],
    ['oeg', /^(?:obere explosionsgrenze|explosionsgrenze,? oben|oeg|upper explosion limit|uel)\b/i],
    ['exgrenzen', /^(?:explosionsgrenzen|explosive limits|explosion limits)/i],
    ['dampfdruck', /^(?:dampfdruck|vapou?r pressure)/i],
    ['dampfdichte', /^(?:relative dampfdichte|dampfdichte|relative gasdichte|gasdichte|vapou?r density|relative dichte,?\s*gas)/i],
    ['reldichte', /^(?:relative dichte|relative density|spezifisches gewicht)/i],
    ['schuettdichte', /^(?:schüttdichte|bulk density)/i],
    ['dichte', /^(?:dichte|density)\b/i],
    ['wasserloeslichkeit', /^(?:wasserlöslichkeit|löslichkeit in\s*(?:\/\s*mischbarkeit mit\s*)?wasser|mischbarkeit mit wasser|water solubility|solubility in water)/i],
    ['loeslichkeit', /^(?:löslichkeit(?:\(en\))?|mischbarkeit|solubility)/i],
    ['verteilung', /^(?:verteilungskoeffizient|n-oc?k?tanol|partition coefficient)/i],
    ['viskositaet', /^(?:viskosität|dyn\.?\s*viskosität|dynamische viskosität|kinematische viskosität|viscosity)/i],
    ['explosiv', /^(?:explosive eigenschaften|explosionsgefahr|explosive properties)/i],
    ['oxidierend', /^(?:oxidierende eigenschaften|brandfördernde eigenschaften|oxidi[sz]ing properties)/i],
    ['molmasse', /^(?:molare masse|molmasse|molekulargewicht|molar mass|molecular weight)/i],
    ['temperaturklasse', /^temperaturklasse/i],
    ['explosionsgruppe', /^explosionsgruppe/i],
    ['kritisch', /^(?:kritische temperatur|kritischer druck)/i],
    ['zustand', /^zustandsänderungen?/i],
    ['sonstig', /^(?:sonstige angaben|weitere angaben|other information|sicherheitsrelevante daten|angaben zu den grundlegenden)/i],
  ];
  const EINHEIT = /(°C|K|mg\/l|g\/l|g\/cm³|g\/cm3|g\/ml|kg\/m³|hPa|kPa|bar|mbar|Pa|g\/mol|kg\/kmol|%|Vol\.?-?%|mPa\s?\*?\s?s|mm²\/s)/;
  // Wert aufbereiten: Einheit oder Bedingung aus dem Bezeichner übernehmen („Dichte (bei 20 °C)“, „Schmelzpunkt [°C]“)
  function kennwert(x) {
    let w = ein(x.text).replace(/^:\s*/, '').replace(/\s*\|$/, '');
    let zusatz = ein(x.zusatz);
    if (x.offen && !zusatz) {
      const m = /^((?:bei|at)\s+-?\d+(?:[.,]\d+)?\s*°\s?C|\([^)]{1,30}\)|\[[^\]]{1,12}\]|,[^0-9]{1,25}?\([^)]{1,15}\))\s*(.*)$/i.exec(w);
      if (m && m[2]) { zusatz = m[1]; w = m[2]; }
    }
    if (istLeer(w)) return '';
    const eh = new RegExp('[\\[(]\\s*' + EINHEIT.source + '\\s*[\\])]').exec(zusatz);
    if (eh && /^[<>≤≥~ca.\s]*-?\d+(?:[.,]\d+)?(?:\s*[-–]\s*-?\d+(?:[.,]\d+)?)?$/.test(w)) w += ' ' + eh[1];
    const bed = /(?:bei\s+)?-?\d+(?:[.,]\d+)?\s*°\s?C(?:\s*,\s*\d+(?:[.,]\d+)?\s*(?:bar|hPa|kPa|mbar))?/i.exec(zusatz.replace(/\[[^\]]*\]/g, ''));
    if (bed && !/°\s?C/.test(w)) w += ` (${bed[0].replace(/°\s?C/, '°C').replace(/(\d)°C/, '$1 °C')})`;
    if (/wasser\s*=\s*1/i.test(zusatz) && !/wasser/i.test(w)) w += ' (Wasser = 1)';
    return w;
  }
  // Text ohne Layout: Liste der Bezeichner, danach Liste der Werte → Zuordnung nach Plausibilität (dynamische Programmierung)
  const PLAUSIBEL = {
    temp: v => /°\s?C|°F|\bK\b/.test(v), ph: v => /^\s*(?:ca\.?\s*)?\d/.test(v) && !/°C\s*$/.test(v), dichte: v => /g\/(?:cm|ml|l)|kg\/m|^\s*(?:ca\.?\s*)?\d+[.,]\d+\s*$/.test(v),
    druck: v => /hPa|kPa|bar|\bPa\b|mm\s?Hg/i.test(v), loes: v => /lösl|misch|g\/l|unlösl/i.test(v), auss: v => /flüssig|fest|gas|pulver|granulat|farb|klar|viskos|paste|kristall/i.test(v),
    farbe: v => /farb|weiß|gelb|rot|blau|grün|braun|schwarz|klar/i.test(v), geruch: v => /geruch|riech|charakteristisch|stechend|parfüm|aromatisch|mild|säuerlich/i.test(v),
    visk: v => /mPa|mm²|cP/i.test(v), expl: v => /explos/i.test(v), oxid: v => /brandförd|oxid/i.test(v), vert: v => /log|pow|kow|octanol|verteilung|^\s*-?\d/i.test(v),
  };
  const ART = { schmelzpunkt: 'temp', siedepunkt: 'temp', flammpunkt: 'temp', zuendtemperatur: 'temp', zersetzung: 'temp', ph: 'ph', dichte: 'dichte', reldichte: 'dichte',
    dampfdruck: 'druck', loeslichkeit: 'loes', wasserloeslichkeit: 'loes', aussehen: 'auss', aggregat: 'auss', farbe: 'farbe', geruch: 'geruch', viskositaet: 'visk',
    explosiv: 'expl', oxidierend: 'oxid', verteilung: 'vert' };
  function listenZuordnen(es) {
    let a = -1, b = -1;
    for (let i = 0; i < es.length; i++) {
      let j = i;
      while (j < es.length && es[j].k && !es[j].text) j++;
      if (j - i > b - a) { a = i; b = j; }
    }
    if (b - a < 4) return;
    const labels = es.slice(a, b);
    const quelle = es.slice(b).find(x => !x.k && x.wert.length >= labels.length);
    if (!quelle) return;
    const werte = [];
    for (const z of quelle.wert) {
      const t = ein(z);
      if (werte.length && (/^[a-zäöü(]/.test(t) && !/^(?:in|ca|fast|nicht|keine?|leicht|vollständig|mischbar|farblos|flüssig|fest|gasförmig|charakteristisch|geruchlos)\b/.test(t) || /[,\-]$/.test(werte[werte.length - 1]))) werte[werte.length - 1] += ' ' + t;
      else werte.push(t);
    }
    const n = labels.length, m = werte.length;
    if (m < n || m > n + 6) return;
    const punkte = (lab, txt) => { const art = ART[lab.k]; if (istLeer(txt)) return 1; if (!art) return 0.2; return PLAUSIBEL[art](txt) ? 1 : -1; };
    const best = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(-Infinity)), wahl = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    best[0][0] = 0;
    for (let i = 1; i <= n; i++) for (let j = i; j <= m; j++) for (let k = 1; k <= j - i + 1 && k <= 4; k++) {
      if (best[i - 1][j - k] === -Infinity) continue;
      const s = best[i - 1][j - k] + punkte(labels[i - 1], werte.slice(j - k, j).join(' ')) - 0.6 * (k - 1);
      if (s > best[i][j]) { best[i][j] = s; wahl[i][j] = k; }
    }
    if (best[n][m] === -Infinity) return;
    for (let i = n, j = m; i > 0; i--) { const k = wahl[i][j]; labels[i - 1].text = werte.slice(j - k, j).join(' '); labels[i - 1].offen = false; j -= k; }
    quelle.text = '';
  }
  function eigenschaftenLesen(z9, layout) {
    let es = eintraege(z9, KENN_LABELS, layout);
    es = es.flatMap(x => (x.k === 'zustand' && x.wert.length ? eintraege(x.wert, KENN_LABELS, false) : [x]));
    if (!layout) listenZuordnen(es);
    const w = {};
    for (const x of es) if (x.k && !w[x.k]) { const v = kennwert(x); if (v) w[x.k] = v; }
    const kw = {};
    for (const k of ['siedepunkt', 'schmelzpunkt', 'flammpunkt', 'zuendtemperatur', 'temperaturklasse', 'explosionsgruppe', 'dampfdruck', 'ph', 'ueg', 'oeg']) if (w[k]) kw[k] = w[k];
    kw.dichte = w.dichte || w.reldichte || (w.schuettdichte ? w.schuettdichte + ' (Schüttdichte)' : '');
    if (w.dampfdichte) kw.luftvergleichszahl = w.dampfdichte.replace(/\s*\((?:Luft|air)\s*=\s*1\)/i, '');
    kw.loeslichkeit = (w.wasserloeslichkeit || (w.loeslichkeit && (/wasser/i.test(w.loeslichkeit) || !/lösungsmittel|organisch/i.test(w.loeslichkeit)) ? w.loeslichkeit : '') || '').replace(/^in wasser\s*:\s*/i, '');
    if (w.exgrenzen && !kw.ueg) {
      const m = /(\d+(?:[.,]\d+)?)\s*(?:[-–]|bis)\s*(\d+(?:[.,]\d+)?)\s*(Vol\.?\s*-?\s*%|%|g\/m³)/i.exec(w.exgrenzen);
      if (m) { kw.ueg = `${m[1]} ${m[3]}`; kw.oeg = `${m[2]} ${m[3]}`; }
    }
    const zustandText = [w.aggregat, w.aussehen].filter(Boolean).join(' ');
    let agg = '';
    if (/tiefkalt/i.test(zustandText) && /gas/i.test(zustandText)) agg = 'gasförmig (tiefkalt verflüssigt)';
    else if (/verflüssigt|unter druck/i.test(zustandText) && /gas/i.test(zustandText)) agg = 'gasförmig (unter Druck verflüssigt)';
    else if (/\bgas\b|gasförmig|\bgaseous\b/i.test(zustandText)) agg = 'gasförmig';
    else if (/flüssig|liquid|lösung|flüssigkeit|emulsion|gel\b/i.test(zustandText)) agg = 'flüssig';
    else if (/\bfest\b|pulver|granulat|kristall|solid|powder|tablette|feststoff|pastös|paste/i.test(zustandText)) agg = 'fest';
    const farbe = [w.aussehen && w.aggregat !== w.aussehen ? w.aussehen.replace(/^(?:flüssig|fest|gasförmig|feststoff|flüssigkeit)\s*,?\s*/i, '') : '', w.farbe].filter(x => x && !/^(?:flüssig|fest|gasförmig)\.?$/i.test(x));
    const eig = [...uniq(farbe)];
    if (w.geruch) eig.push(/geruch|riecht/i.test(w.geruch) ? w.geruch : `Geruch: ${w.geruch}`);
    let molmasse = w.molmasse || '';
    return { kw, aggregatzustand: agg, eigenschaften: eig.join(', '), molmasse };
  }

  // ------------------------------------------------------------------ Abschnitt 10: Reaktionen
  const REAKT_LABELS = [
    ['reaktivitaet', /^(?:reaktivität|reactivity)\b/i], ['stabilitaet', /^(?:chemische stabilität|stabilität(?: und reaktivität)?|chemical stability)\b/i],
    ['gefahr', /^(?:möglichkeit(?:en)? gefährlicher reaktionen|gefährliche reaktionen|possibility of hazardous)/i],
    ['bedingungen', /^(?:zu vermeidende bedingungen|conditions to avoid)/i], ['stoffe', /^(?:unverträgliche (?:materialien|stoffe)|zu vermeidende stoffe|incompatible materials)/i],
    ['zersetzung', /^(?:gefährliche zersetzungsprodukte|zersetzungsprodukte|hazardous decomposition)/i], ['risiken', /^(?:spezielle risiken|besondere risiken)/i],
  ];
  function reaktionenLesen(z10, layout) {
    const aus = [];
    const vor = { bedingungen: 'Zu vermeiden: ', stoffe: 'Unverträglich mit: ', zersetzung: 'Gefährliche Zersetzungsprodukte: ' };
    for (const x of eintraege(z10, REAKT_LABELS, layout)) {
      if (!x.text || istLeer(x.text) || x.ueberschrift && !x.wert.length) continue;
      if (x.k === 'stabilitaet' && /^(?:das (?:produkt|material) ist )?(?:chemisch )?stabil\b|^stabil unter/i.test(x.text)) continue;
      const s = saetze(x.text).filter(t => !istLeer(t) && !/^kein(?:e|\(e,er\))?\.?$/i.test(t));
      if (!s.length) continue;
      if (vor[x.k] && s.join(' ').length < 160) aus.push(vor[x.k] + s.join(' ').replace(/^(?:Gefährliche Zersetzungsprodukte|Zersetzungsprodukte)\s*:\s*/i, ''));
      else aus.push(...s);
    }
    return uniq(aus);
  }

  // ------------------------------------------------------------------ Abschnitt 14: Transport (Straße/ADR bevorzugt)
  const KLASSEN_TEXT = { 1: 'Explosive Stoffe und Gegenstände mit Explosivstoff', 2: 'Gase', '2.1': 'Entzündbare Gase', '2.2': 'Nicht entzündbare, nicht giftige Gase',
    '2.3': 'Giftige Gase', 3: 'Entzündbare flüssige Stoffe', '4.1': 'Entzündbare feste Stoffe', '4.2': 'Selbstentzündliche Stoffe',
    '4.3': 'Stoffe, die in Berührung mit Wasser entzündbare Gase entwickeln', '5.1': 'Entzündend (oxidierend) wirkende Stoffe', '5.2': 'Organische Peroxide',
    '6.1': 'Giftige Stoffe', '6.2': 'Ansteckungsgefährliche Stoffe', 7: 'Radioaktive Stoffe', 8: 'Ätzende Stoffe', 9: 'Verschiedene gefährliche Stoffe und Gegenstände' };
  const TRANS_LABELS = [
    ['un', /^(?:un-?\s*(?:nummer|nr\.?|no\.?|number)(?:\s+oder\s+id-?nummer)?|id-?nummer|un\/id-?(?:nr\.?|no\.?))/i],
    ['bezeichnung', /^(?:ordnungsgemäße\s+un-?versandbezeichnung|un-?versandbezeichnung|offizielle\s+benennung(?:\s+für\s+die\s+beförderung)?|versandbezeichnung|proper\s+shipping\s+name|technische\s+benennung|bezeichnung\s+des\s+gutes)/i],
    ['klasse', /^(?:transportgefahrenklassen?|gefahrklassen?|gefahrenklassen?|klasse|class)\b/i],
    ['vg', /^(?:verpackungsgruppe|packing\s+group|vg)\b/i],
    ['umwelt', /^(?:umweltgefahren|umweltgefährdend|environmental\s+hazards?|meeresschadstoff|marine\s+pollutant)/i],
    ['kemler', /^(?:nummer\s+zur\s+kennzeichnung\s+der\s+gefahr|gefahrnummer|gefahrennummer|kemler(?:-?zahl)?|hazard\s+identification\s+number)/i],
    ['tunnel', /^(?:tunnelbeschränkungscode|tunnelcode|tunnel\s+restriction(?:\s+code)?|tunnelbeschränkung)/i],
    ['code', /^(?:klassifizierungscode|classification\s+code)/i],
    ['zettel', /^(?:gefahrzettel|gefahrenzettel|zettel|label|etiketten?)\b/i],
  ];
  const ANDERER_TRAEGER = /\b(?:IMDG|ICAO|IATA|ADN|Seeschiff|Seetransport|Lufttransport|Luftfracht|Binnenschiff|Sea|Air)\b/;
  const ZETTEL_RE = /\b(1(?:\.[1-6])?|2\.[1-3]|3|4\.[1-3]|5\.[12]|6\.[12]|7[A-E]?|8|9A?)\b/g;
  const KEIN_GEFAHRGUT = /kein(?:e|en)?\s+gefahrgut|nicht\s+als\s+gefahrgut|kein\s+gefährliches\s+gut|not\s+(?:classified|regulated)\s+as\s+(?:a\s+)?dangerous|unterliegt\s+nicht\s+den\s+(?:transport|gefahrgut)vorschriften/i;
  function transportLesen(z14, layout) {
    const t = { un: '', bezeichnung: '', kemler: '', klasse: '', klassenText: '', verpackungsgruppe: '', gefahrzettel: [], umweltgefaehrdend: '', tunnel: '', code: '' };
    if (!z14.length) return t;
    const ganz = z14.join('\n'), flach = ein(ganz);
    if (KEIN_GEFAHRGUT.test(flach) && !/\bUN\s?-?\s?\d{4}\b/.test(flach)) { t.bezeichnung = 'kein Gefahrgut im Sinne der Transportvorschriften'; return t; }
    // Block für Straße/Schiene (ADR/RID) vor den anderen Verkehrsträgern
    const ab = z14.findIndex(z => /\b(?:ADR|RID|Straße|Strasse|Landtransport|road)\b/i.test(z));
    const bis = ab >= 0 ? z14.findIndex((z, i) => i > ab && ANDERER_TRAEGER.test(z) && !/\bADR\b/.test(z)) : -1;
    const block = ab >= 0 ? z14.slice(ab, bis > ab ? bis : z14.length) : z14;
    const es = [...eintraege(block, TRANS_LABELS, layout), ...eintraege(z14, TRANS_LABELS, layout)];
    const erst = k => { const e = es.find(x => x.k === k && x.text && !istLeer(x.text)); return e ? ein(e.text).replace(/^(?:ADR\/RID|ADR|RID)\s*[:,]?\s*/i, '') : ''; };
    let m;
    if ((m = /(?:UN\s?-?\s?)?(\d{4})\b/.exec(erst('un')))) t.un = m[1];
    if (!t.un && (m = /\bUN\s?-?\s?(?:Nr\.?|Nummer|No\.?)?\s*:?\s*(\d{4})\b/i.exec(ein(block.join(' ')) + ' ' + flach))) t.un = m[1];
    // Kurzform „UN 1824 NATRIUMHYDROXIDLÖSUNG, 8, II, (E)“
    const kurz = /\bUN\s?(\d{4}),?\s+([A-ZÄÖÜ][^,]{3,120}?),\s*([1-9](?:\.\d)?)\s*(?:\([^)]*\))?\s*,\s*(?:VG\s*)?(III|II|I)\b(?:\s*,\s*\(([A-E](?:\/[A-E])?)\))?/.exec(flach);
    if (kurz) {
      if (!t.un) t.un = kurz[1];
      t.bezeichnung = ein(kurz[2]); t.klasse = kurz[3]; t.verpackungsgruppe = kurz[4];
      if (kurz[5]) t.tunnel = kurz[5];
    }
    const bez = erst('bezeichnung');
    if (bez) t.bezeichnung = ohneSatzzeichen(bez.replace(/^UN\s?\d{4}\s*,?\s*/i, '').replace(/\s*(?:IMDG|IATA|ICAO)\b.*$/i, ''));
    const kl = erst('klasse');
    if (kl && (m = /\b([1-9](?:\.\d)?)\b/.exec(kl))) t.klasse = m[1];
    const vg = erst('vg');
    if (vg && (m = /\b(III|II|I)\b/.exec(vg))) t.verpackungsgruppe = m[1];
    if ((m = /\b(X?\d{2,3})\b/.exec(erst('kemler')))) t.kemler = m[1];
    const tu = erst('tunnel').replace(/tunnel\w*/gi, '');
    if ((m = /\(?\b([A-E](?:\s*\/\s*[A-E])?)\b\)?/.exec(tu))) t.tunnel = m[1].replace(/\s+/g, '');
    if ((m = /\b(\d?[A-Z]{1,4}\d{0,2})\b/.exec(erst('code')))) t.code = m[1];
    const ze = erst('zettel');
    if (ze) t.gefahrzettel = uniq(ze.match(ZETTEL_RE) || []);
    if (!t.gefahrzettel.length && t.klasse) t.gefahrzettel = [t.klasse];
    const um = erst('umwelt');
    if (um) t.umweltgefaehrdend = /\bnein\b|\bno\b|\bnicht\b/i.test(um) ? 'nein' : /\bja\b|\byes\b|umweltgefährdend|meeresschadstoff/i.test(um) ? 'ja' : '';
    t.klassenText = KLASSEN_TEXT[t.klasse] || '';
    return t;
  }

  // ------------------------------------------------------------------ Abschnitt 15: Wassergefährdung; Stoffkennungen
  function wgkLesen(z15, alleZeilen) {
    const t = ein((z15.length ? z15 : alleZeilen).join(' '));
    const m = /\bWGK\s*:?\s*([123])\b|wassergefährdungsklasse\s*(?:\(WGK\))?\s*(?:nach\s+\S+\s*)?:?\s*([123])\b/i.exec(t);
    if (m) { const n = m[1] || m[2]; return `WGK ${n} – ${['', 'schwach', 'deutlich', 'stark'][n]} wassergefährdend`; }
    if (/nicht wassergefährdend|\bnwg\b/i.test(t)) return 'nicht wassergefährdend';
    if (/allgemein wassergefährdend|\bawg\b/i.test(t)) return 'allgemein wassergefährdend';
    return '';
  }
  function kennungen(z1, z3, z9) {
    const t = [...z1, ...z3].join('\n');
    const r = { eg: '', index: '', formel: '', molmasse: '' };
    let m;
    if ((m = /\b(?:EG|EC|EINECS)[- ]?(?:Nr\.?|Nummer|No\.?)?\s*:?\s*(\d{3}-\d{3}-\d)\b/i.exec(t)) && egGueltig(m[1])) r.eg = m[1];
    if ((m = /\bIndex[- ]?(?:Nr\.?|Nummer|No\.?)?\s*:?\s*(\d{3}-\d{3}-\d{2}-[\dX])\b/i.exec(t))) r.index = m[1];
    if ((m = /(?:Summenformel|Molekularformel|Molekülformel|chemische Formel|molecular formula)\s*:?\s*([A-Z][A-Za-z0-9()·.]{0,30})/i.exec(t))) r.formel = m[1];
    if ((m = /(?:Molmasse|Molare Masse|Molekulargewicht|Molekularmasse|Molgewicht|molar mass|molecular weight)\s*(?:\([^)]*\))?\s*:?\s*(\d+(?:[.,]\d+)?)/i.exec([...z1, ...z3, ...z9].join('\n')))) r.molmasse = m[1] + ' g/mol';
    return r;
  }

  // ------------------------------------------------------------------ Zusammenbau
  function zerlegen(text) {
    const { zeilen: roh, layout } = vorbereiten(text);
    const k = kopfzeilenEntfernen(roh);
    const zeilen = randvermerkeEntfernen(k.zeilen);
    return { layout, zeilen, entfernt: k.entfernt, ...abschnitteFinden(zeilen) };
  }
  // { nr: text } der 16 Abschnitte
  function abschnitteTeilen(text) {
    const aus = {};
    try {
      const { teile } = zerlegen(String(text || ''));
      for (const [nr, t] of Object.entries(teile)) if (+nr >= 1 && +nr <= 16) aus[nr] = t.zeilen.map(z => z.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch { /* leer */ }
    return aus;
  }
  function lesenIntern(text, dateiname) {
    const { layout, zeilen, entfernt, teile, kopf, anzahl } = zerlegen(text);
    const z = n => (teile[n] ? teile[n].zeilen : []);
    const anm = [];
    const nameZuCas = casNamen(zeilen);
    const nm = namenFinden(z(1).length ? z(1) : zeilen.slice(0, 80), layout);
    const hersteller = herstellerFinden(z(1), [...kopf, ...entfernt], layout);
    const stand = standFinden([...entfernt, ...kopf, ...z(1).slice(0, 12), ...z(16)], layout);
    const { h, euh, p } = ghsCodes(z(2).length ? z(2) : zeilen, z(16), layout);
    let pikto = piktogrammeFinden(z(2));
    if (!pikto.length && h.length) { pikto = piktogrammeAusH(h); if (pikto.length) anm.push('Piktogramme aus den H-Sätzen abgeleitet.'); }
    // ältere Datenblätter (vor CLP): R-Sätze und alte Gefahrensymbole statt H-Sätze und GHS-Piktogramme
    let einstufung = einstufungFinden(z(2), h, zeilen);
    const z2 = z(2).length ? z(2) : z(3);
    if (!h.length && /\bR\s?\d{2}(?:\/\d{2})*\b/.test(z2.join(' '))) {
      anm.push('Älteres Datenblatt (vor CLP): Einstufung mit R-Sätzen und alten Gefahrensymbolen, ohne H-Sätze und GHS-Piktogramme – Angaben am Original prüfen.');
      if (!einstufung.length) {
        const ALT = { 'T+': 'Sehr giftig', T: 'Giftig', Xn: 'Gesundheitsschädlich', Xi: 'Reizend', C: 'Ätzend', 'F+': 'Hochentzündlich', F: 'Leichtentzündlich', O: 'Brandfördernd', E: 'Explosionsgefährlich', N: 'Umweltgefährlich' };
        einstufung = uniq(z2.map(x => /^\s*(T\+|F\+|Xn|Xi|T|C|F|O|E|N)\s{2,}(\S.*)$/.exec(x)).filter(Boolean).map(m => `${m[1]} ${ein(m[2]) || ALT[m[1]]} (altes Symbol)`))
          .concat(z2.map(x => /^\s*(R\s?\d{2}(?:\/\d{2})*)\s+(\S.*)$/.exec(x)).filter(Boolean).map(m => `${m[1].replace(/\s/g, '')} ${ein(m[2])}`));
      }
    }
    const bestandteile = bestandteileLesen(z(3), layout, nameZuCas);
    const eig = eigenschaftenLesen(z(9), layout);
    const ken = kennungen(z(1), z(3), z(9));
    const cas = uniq([...bestandteile.map(b => b.cas), ...Object.keys(nameZuCas)]).filter(c => S.istCas(c));
    if (anzahl < 4) anm.push('Die Abschnitte des Datenblatts wurden kaum erkannt – Angaben unvollständig, bitte das Original prüfen.');
    else { const fehlen = [1, 2, 3, 5, 8, 9, 14].filter(n => !teile[n]); if (fehlen.length) anm.push(`Nicht gefunden: Abschnitt ${fehlen.join(', ')}.`); }
    const kapitel = [];
    for (let n = 1; n <= 16; n++) if (teile[n]) kapitel.push({ titel: `Abschnitt ${n}: ${ABSCHNITTE[n].titel}`, text: teile[n].zeilen.map(x => x.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim() });
    return S.normalisieren({
      quelle: 'sdb', quelleText: QUELLE_TEXT, name: nm.namen[0] || String(dateiname || '').replace(/\.[^.]+$/, ''),
      synonyme: [...nm.synonyme, ...nm.namen.slice(1)], hersteller, stand, cas, eg: ken.eg, index: ken.index, formel: ken.formel,
      molmasse: eig.molmasse || ken.molmasse, bestandteile, aggregatzustand: eig.aggregatzustand, eigenschaften: eig.eigenschaften,
      kennwerte: { ...eig.kw, agw: agwLesen(z(8), layout, nameZuCas), wgk: wgkLesen(z(15), zeilen) },
      ghs: { piktogramme: pikto, signalwort: signalwortFinden(z(2)), h, euh, p, einstufung },
      transport: transportLesen(z(14), layout), loeschmittel: loeschmittelLesen(z(5), layout), freisetzung: freisetzungLesen(z(6), layout),
      psa: psaLesen(z(8), layout), ersteHilfe: ersteHilfeLesen(z(4), layout), reaktionen: reaktionenLesen(z(10), layout),
      entsorgung: entsorgungLesen(z(13)), kapitel, anmerkung: anm.join(' '),
    });
  }
  function sdbLesen(text, { dateiname = '' } = {}) {
    try { return lesenIntern(String(text == null ? '' : text), dateiname); }
    catch (e) {
      return S.normalisieren({ quelle: 'sdb', quelleText: QUELLE_TEXT, name: String(dateiname || '').replace(/\.[^.]+$/, ''),
        anmerkung: `Das Datenblatt ließ sich nicht auswerten (${e.message}) – bitte das Original ansehen.` });
    }
  }

  return { sdbLesen, abschnitteTeilen, QUELLE_TEXT, H_SAETZE, EUH_SAETZE, _intern: { lesenIntern } };
});
