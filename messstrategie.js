// Messen mit Prüfröhrchen nach der Dräger-Messstrategie 1.5 (Feuerwehr): Messvorgehen bei Bränden, bei bekannten und bei
// unbekannten Gefahrstoffen (Blatt A–E), Auswertung, Simultantest-Sets. Einsatztoleranzwerte (ETW) nach vfdb-Richtlinie 10/01,
// Anlage 1 (Stand Januar 2023). Nur Daten und reine Logik – läuft im Browser (window.GSZMessen) und in Node (Tests).
// Quellen im Dropbox-App-Ordner: Einsatz › Messen › „Messstrategie Dräger 1.5“, „Simultantest-Sets Dräger – Produktinfo“,
// „Einsatztoleranzwerte ETW (vfdb 2023)“. Maßgeblich bleiben Aufdruck und Gebrauchsanweisung des jeweiligen Röhrchens.
'use strict';
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.GSZMessen = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  const QUELLE = 'Dräger Messstrategie 1.5 · ETW nach vfdb-RL 10/01 (2023)';

  // ---------------------------------------------------------------- Röhrchen des Messkonzepts (Nr. 1–18, Blatt A–E)
  // stufen: Hubzahlen mit Messdauer und Messbereich; empf = in der Messanleitung hervorgehoben (optimale Hubzahl für den ETW-Bereich)
  // ex/pid: Stoff kann in hohen Konzentrationen auch mit einem katalytischen Ex-Sensor bzw. einem PID erfasst werden
  // folge: falls positiv, ebenfalls messen
  const R = [
    { nr: 1, name: 'Säuretest', qualitativ: true, stufen: [{ n: 1, s: 3, empf: true }], umschlag: ['blauviolett', 'rosagelb'] },
    { nr: 2, name: 'Ammoniak 5/a', stoff: 'Ammoniak', etw1: 160, etw4: 110, ex: true, pid: true, umschlag: ['gelb', 'blau'],
      stufen: [{ n: 1, s: 10, von: 50, bis: 600, empf: true }, { n: 10, s: 60, von: 5, bis: 70 }],
      zeigt: 'Basische Gase und Dämpfe: Ammoniak, Anilin, Ethylendiamin, Hydrazin.',
      folgeText: 'Ggf. weiter mit Nr. 3 (Polytest), um andere Gefahrstoffe auszuschließen.' },
    { nr: 3, name: 'Polytest', qualitativ: true, stufen: [{ n: 5, s: 90, empf: true }], umschlag: ['weiß', 'braun, grün bzw. violett (je nach Substanz)'],
      farben: ['braun', 'grün', 'violett'] },
    { nr: 4, name: 'Schwefelwasserstoff 2/b', stoff: 'Schwefelwasserstoff', etw1: 27, etw4: 20, pid: true, umschlag: ['weiß', 'braun'],
      stufen: [{ n: 1, s: 30, von: 2, bis: 60, empf: true }], zeigt: 'Zeigt auch Mercaptane an, jedoch nur in hohen Konzentrationen.', folge: [18] },
    { nr: 5, name: 'Kohlenstoffmonoxid', stoff: 'Kohlenstoffmonoxid', etw1: 83, etw4: 33, ex: true, sensor: 'Messung mit CO-Sensor (Dräger Pac oder X-am)',
      stufen: [], zeigt: 'Der Dräger CO-Sensor (XXS LC) weist nur relevante Querempfindlichkeit gegenüber Ethen, Ethin und Wasserstoff auf.' },
    { nr: 6, name: 'Perchlorethylen 2/a', stoff: 'Perchlorethylen', etw1: 230, etw4: 120, umschlag: ['gelb', 'graublau'],
      stufen: [{ n: 1, s: 30, von: 20, bis: 300, empf: true }, { n: 5, s: 180, von: 2, bis: 40 }], zeigt: 'Chlorkohlenwasserstoffe, Halogene.',
      folge: [10, 12], folgeText: 'Falls positiv: Nr. 10 (Chlor) und Nr. 12 (Phosgen) ebenfalls messen und auf Zersetzungsprodukte prüfen.' },
    { nr: 7, name: 'Toluol 100/a', stoff: 'Toluol', etw1: 560, etw4: 310, ex: true, pid: true, umschlag: ['weiß', 'braunviolett'],
      stufen: [{ n: 10, s: 90, von: 100, bis: 1800, empf: true }], zeigt: 'Hauptsächlich aromatische Kohlenwasserstoffe, sowie Xylole, Benzol, Benzin-Kohlenwasserstoffe, Toluol.' },
    { nr: 8, name: 'Aceton 100/b', stoff: 'Aceton', etw1: null, etw4: 500, ex: true, pid: true, umschlag: ['hellgelb', 'gelb'],
      stufen: [{ n: 10, s: 240, von: 100, bis: 12000, empf: true }], zeigt: 'Ketone (z. B. Aceton), Aldehyde.' },
    { nr: 9, name: 'Ethylacetat 200/a', stoff: 'Ethylacetat', etw1: null, etw4: null, ex: true, pid: true, umschlag: ['orange', 'grünbraun'],
      stufen: [{ n: 20, s: 300, von: 200, bis: 3000, empf: true }], zeigt: 'Hauptsächlich Benzin-Kohlenwasserstoffe, sowie Alkohole, Aromaten, Ester, Ether, Aldehyde, Ketone.' },
    { nr: 10, name: 'Chlor 0,2/a', stoff: 'Chlor', etw1: 2, etw4: 1, umschlag: ['weiß', 'gelb-orange'],
      stufen: [{ n: 1, s: 20, von: 3, bis: 30 }, { n: 10, s: 180, von: 0.2, bis: 3, empf: true }], zeigt: 'Brom, Chlordioxid, Stickstoffdioxid werden auch angezeigt.' },
    { nr: 11, name: 'Nitrose Gase 0,2/a', stoff: 'Stickstoffdioxid', etw1: 12, etw4: 8.2, umschlag: ['graugrün', 'blaugrau'],
      stufen: [{ n: 5, s: 75, von: 0.2, bis: 6, empf: true }],
      zeigt: 'Chlor und Ozon werden auch angezeigt und verfälschen ggf. das Messergebnis. Stickstoffdioxid über 300 ppm kann die Anzeigeschicht ausbleichen.' },
    { nr: 12, name: 'Phosgen 0,02/a', stoff: 'Phosgen', etw1: 0.3, etw4: 0.08, umschlag: ['weiß', 'rot'],
      stufen: [{ n: 20, s: 360, von: 0.02, bis: 1, empf: true }], zeigt: 'Phosgen in hohen Konzentrationen kann die Anzeigeschicht ausbleichen.' },
    { nr: 13, name: 'Phosphorwasserstoff 0,1/c', stoff: 'Phosphorwasserstoff', etw1: 2, etw4: 0.5, pid: true, umschlag: ['gelb', 'rot'],
      stufen: [{ n: 1, s: 60, von: 0.5, bis: 3, empf: true }, { n: 3, s: 150, von: 0.1, bis: 1 }],
      zeigt: 'Zeigt auch Schwefelwasserstoff und Arsenwasserstoff an, jedoch mit unterschiedlicher Empfindlichkeit.',
      folge: [17], folgeText: 'Falls positiv: Nr. 17 (Blausäure) ebenfalls messen, um Phosphorwasserstoff zu bestätigen.' },
    { nr: 14, name: 'Formaldehyd 0,2/a', stoff: 'Formaldehyd', etw1: null, etw4: 1, umschlag: ['weiß', 'rosa'],
      stufen: [{ n: 10, s: 90, von: 0.5, bis: 3, empf: true }, { n: 20, s: 180, von: 0.2, bis: 2.5 }],
      zeigt: 'Zeigt mit gelb-brauner Verfärbung Styrol, Acrolein, Diesel und Furfurylalkohol an.' },
    { nr: 15, name: 'Kohlenstoffdioxid 0,5%/a', stoff: 'Kohlenstoffdioxid', einheit: 'Vol.-%', etw1: null, etw4: 1, umschlag: ['weiß', 'violett'],
      stufen: [{ n: 1, s: 30, von: 0.5, bis: 10, empf: true }],
      zeigt: 'Schwefeldioxid wird im vergleichbaren Konzentrationsbereich ebenfalls angezeigt, jedoch mit dreifach geringerer Empfindlichkeit.',
      folge: [18], folgeText: 'Falls positiv: Nr. 18 (Schwefeldioxid) ebenfalls messen, um Kohlenstoffdioxid zu bestätigen.' },
    { nr: 16, name: 'Salzsäure 0,2/a', stoff: 'Salzsäure', etw1: 22, etw4: 11, umschlag: ['blau', 'gelb'],
      stufen: [{ n: 2, s: 25, von: 3, bis: 20, empf: true }, { n: 10, s: 120, von: 0.2, bis: 3 }], zeigt: 'Zeigt auch viele andere sauer reagierende Substanzen an!' },
    { nr: 17, name: 'Blausäure 0,5/a', stoff: 'Blausäure', etw1: 7.1, etw4: 3.5, umschlag: ['gelb', 'rot'],
      stufen: [{ n: 2, s: 30, von: 5, bis: 50 }, { n: 10, s: 150, von: 0.5, bis: 5, empf: true }],
      zeigt: 'Phosphorwasserstoff wird auch angezeigt. Schwefelwasserstoff färbt die Vorschicht dunkelbraun.',
      folge: [13], folgeText: 'Falls positiv: Nr. 13 (Phosphorwasserstoff) ebenfalls messen.' },
    { nr: 18, name: 'Schwefeldioxid 0,5/a', stoff: 'Schwefeldioxid', etw1: 0.75, etw4: 0.75, umschlag: ['blaugrau', 'weiß'],
      stufen: [{ n: 10, s: 180, von: 1, bis: 25 }, { n: 20, s: 360, von: 0.5, bis: 5, empf: true }],
      zeigt: 'Schwefelwasserstoff wird auch angezeigt. Gleichzeitige Anwesenheit von Stickstoffdioxid verkürzt die Anzeige.',
      folge: [4], folgeText: 'Falls positiv: Nr. 4 (Schwefelwasserstoff) ebenfalls messen.' },
  ];
  for (const r of R) { if (!r.einheit) r.einheit = 'ppm'; if (!r.folgeText && r.folge) r.folgeText = `Falls positiv: ${r.folge.map(n => 'Nr. ' + n + ' (' + R.find(x => x.nr === n).name.replace(/ [\d,%/a-c]+$/, '') + ')').join(' und ')} ebenfalls messen.`; }
  const roehrchen = nr => R.find(r => r.nr === Number(nr)) || null;
  const BLATT = {
    A: { titel: 'Blatt A', text: 'Ex/OX mit Mehrgasmessgerät, dann Universalindikator bzw. Säuretest', nr: [1] },
    B: { titel: 'Blatt B', text: 'sauer reagierende Stoffe', nr: [16, 17, 18],
      ende: 'Wenn alle Röhrchen ohne Anzeige sind, weiter auf Blatt C.',
      hinweise: ['Zeigt das Universalindikator-Papier eine orange-rote Färbung (pH < 7) und tritt bei den Röhrchen auf Blatt B keine Verfärbung auf, kann ggf. auch eine schwerflüchtige Säure (Schwefelsäure, Phosphorsäure, Sulfonsäure) vorliegen.',
        'Stickstoffdioxid reagiert mit Wasser zu Salpetersäure. Ggf. mit Röhrchen Nr. 11 (Nitrose Gase) auf Stickstoffdioxid prüfen.'] },
    C: { titel: 'Blatt C', text: 'basische Stoffe und Polytest', nr: [2, 3] },
    D: { titel: 'Blatt D', text: 'organische und oxidierbare Stoffe', nr: [4, 5, 6, 7, 8, 9],
      hinweise: ['Ist eine Verfärbung des Polytests eingetreten, sollte zusätzlich Blatt E abgearbeitet werden, da die Stoffe auf Blatt E sonst nicht sicher ausgeschlossen werden können.'] },
    E: { titel: 'Blatt E', text: 'Halogene, Stickoxide, Phosgen, Phosphin, Formaldehyd, CO₂', nr: [10, 11, 12, 13, 14, 15],
      ende: 'Falls alle Röhrchen ohne Anzeige: weiter mit Blatt D (organische Stoffe unterhalb der Nachweisgrenze des Polytests) und Nr. 17 (Blausäure), da diese nur in hohen Konzentrationen vom Säuretest erfasst wird.' },
  };
  const HINWEISE = [
    'Das Messvorgehen ist geeignet für Gase und Dämpfe, bedingt für Flüssigkeiten.',
    'Während der Messung kontinuierlich auf explosive Atmosphäre prüfen und ggf. Gegenmaßnahmen einleiten.',
    'Die Ergebnisse geben Indizien, um welchen Stoff bzw. welche Stoffgruppe es sich handeln kann – eine eindeutige Identifizierung erfordert i. d. R. weitere Analysemethoden.',
    'Ergebnisse möglichst mit einer zweiten, unabhängigen Methode bestätigen (z. B. Röhrchen und Gasmessgerät).',
    'Eine positive Anzeige heißt nicht, dass ausschließlich dieser Stoff vorhanden ist. Zur Sicherheit alle Röhrchen des Messkonzepts, mindestens alle des jeweiligen Blattes messen.',
    'Röhrchenmessungen sind Momentaufnahmen: an verschiedenen Orten (Bodennähe, unter der Decke) und zu verschiedenen Zeiten wiederholen.',
    'Parallel kontinuierlich mit Mehrgasmessgerät und PID messen – deren Sensoren erfassen manche Stoffe erst in hohen Konzentrationen und ersetzen die Röhrchen nicht.',
  ];
  // Untere Nachweisgrenzen des Polytest bei 5 Hüben (ppm)
  const POLYTEST_GRENZEN = [['Aceton', 2000], ['Acetylen', 10], ['Arsenwasserstoff', 1], ['Benzol', 50], ['Butan', 100], ['Ethylen', 50], ['Kohlenstoffmonoxid', 5],
    ['Octan', 10], ['Perchlorethylen', 20], ['Propan', 500], ['Schwefelkohlenstoff', 1], ['Schwefelwasserstoff', 2], ['Styrol', 10], ['Toluol bzw. Xylol', 10]];
  const POLYTEST_NICHT = 'Nicht angezeigt werden z. B. Methan, Ethan, Wasserstoff, Kohlenstoffdioxid.';

  // ---------------------------------------------------------------- Ablauf bei unbekannten Gefahrstoffen
  // z = { fluessig: true|false|null, ph: 'sauer'|'neutral'|'basisch'|null, erg: { [nr]: { anzeige: true|false, wert, huebe } } }
  // Ergebnis: { schritte: [{ nr, blatt, grund }], naechste: { art: 'frage-fluessig'|'frage-ph'|'roehrchen'|'fertig', nr? }, optional: [nr], blaetter: [..] }
  function plan(z) {
    z = z || {}; const erg = z.erg || {};
    const pos = nr => !!(erg[nr] && erg[nr].anzeige === true), neg = nr => !!(erg[nr] && erg[nr].anzeige === false), da = nr => pos(nr) || neg(nr);
    const schritte = [], drin = new Set(), blaetter = ['A'];
    // Folgeröhrchen („falls positiv, ebenfalls testen“) stehen direkt hinter dem auslösenden Röhrchen
    const add = (nr, blatt, grund = '') => {
      if (drin.has(nr)) return;
      drin.add(nr); schritte.push({ nr, blatt, grund });
      const r = roehrchen(nr);
      if (pos(nr) && r.folge) for (const f of r.folge) add(f, 'Folge', `weil Nr. ${nr} angezeigt hat`);
    };
    let frage = null;
    const blattB = () => { blaetter.push('B'); for (const n of BLATT.B.nr) add(n, 'B'); return BLATT.B.nr.every(neg); };
    const blattD = (grund = '') => { if (!blaetter.includes('D')) blaetter.push('D'); for (const n of BLATT.D.nr) add(n, 'D', grund); };
    const blattE = (grund = '') => { if (!blaetter.includes('E')) blaetter.push('E'); for (const n of BLATT.E.nr) add(n, 'E', grund); return BLATT.E.nr.every(neg); };
    const blattC = () => {
      blaetter.push('C'); add(2, 'C');
      if (!da(2)) return;
      if (pos(2)) return;                                     // basische Gase – Polytest nur optional („ggf.“)
      add(3, 'C');
      if (!da(3)) return;
      if (pos(3)) { blattD(); blattE('Polytest hat angezeigt – Blatt E zusätzlich'); }
      else if (blattE()) { blattD('alle Röhrchen auf Blatt E ohne Anzeige'); add(17, 'Folge', 'Blausäure wird vom Säuretest nur in hohen Konzentrationen erfasst'); }
    };
    if (z.fluessig === null || z.fluessig === undefined) frage = 'frage-fluessig';
    else if (z.fluessig) {
      if (!z.ph) frage = 'frage-ph';
      else if (z.ph === 'sauer') { if (blattB()) blattC(); }
      else blattC();
    } else {
      add(1, 'A');
      if (pos(1)) { if (blattB()) blattC(); }
      else if (neg(1)) blattC();
    }
    const offen = schritte.find(s => !da(s.nr));
    const naechste = frage ? { art: frage } : offen ? { art: 'roehrchen', nr: offen.nr, blatt: offen.blatt } : { art: 'fertig' };
    const optional = R.map(r => r.nr).filter(n => !drin.has(n) && n !== 1 && !(z.fluessig && n === 1));
    if (pos(2) && !drin.has(3)) optional.sort((a, b) => (b === 3) - (a === 3));
    return { schritte, naechste, optional, blaetter };
  }

  // ---------------------------------------------------------------- Auswertung (Messstrategie S. 21)
  const AUSWERTUNG = {
    1: 'Sauer reagierende Substanzen wie Salzsäure', 2: 'Basische Gase wie Ammoniak, Hydrazin, Anilin und Ethylendiamin', 4: 'Schwefelwasserstoff',
    5: 'Kohlenstoffmonoxid – Querempfindlichkeit des Dräger-XXS-CO-Sensors auf Ethen, Ethin und Wasserstoff beachten',
    6: 'Chlorkohlenwasserstoffe wie Perchlorethylen, Halogene', 7: 'Aromatische Kohlenwasserstoffe wie Xylol, Benzol, Benzin-Kohlenwasserstoffe, Toluol',
    8: 'Ketone (z. B. Aceton), Aldehyde', 9: 'Alkohole, Aromaten, Ester, Ether, Aldehyde, Ketone',
    10: 'Chlor, Brom (blassere Anzeige, gleiche Empfindlichkeit), Chlordioxid (andere Empfindlichkeit), Stickstoffdioxid (blassere Anzeige, geringere Empfindlichkeit); Chlor kann die Anzeigeschicht anderer Röhrchen ausbleichen',
    11: 'Nitrose Gase (Stickstoffmonoxid und Stickstoffdioxid); Chlor und Ozon werden ebenfalls angezeigt und verfälschen ggf. das Ergebnis',
    13: 'Phosphorwasserstoff; Arsenwasserstoff und Schwefelwasserstoff in unterschiedlicher Empfindlichkeit',
    14: 'Formaldehyd; zeigt außerdem mit gelbbrauner Farbe Styrol, Vinylacetat, Acetaldehyd, Acrolein, Diesel und Furfurylalkohol an',
    15: 'Kohlenstoffdioxid; Schwefeldioxid (mit 3-fach geringerer Empfindlichkeit)', 16: 'Salzsäure; zeigt auch viele andere sauer reagierende Substanzen an',
    17: 'Blausäure; Phosphorwasserstoff (Schwefelwasserstoff färbt die Vorschicht dunkelbraun)', 18: 'Schwefeldioxid, Schwefelwasserstoff',
  };
  function auswerten(z) {
    const erg = (z && z.erg) || {}, pos = nr => !!(erg[nr] && erg[nr].anzeige === true), neg = nr => !!(erg[nr] && erg[nr].anzeige === false);
    const aus = [];
    for (const r of R) if (pos(r.nr) && AUSWERTUNG[r.nr]) aus.push({ nr: [r.nr], art: 'hinweis', text: AUSWERTUNG[r.nr] });
    if (pos(4) && pos(18)) aus.push({ nr: [4, 18], art: 'bestaetigt', text: 'Bestätigung Schwefelwasserstoff' });
    if (pos(12)) aus.push({ nr: [12], art: 'bestaetigt', text: 'Bestätigung Phosgen' });
    if (pos(13) && pos(17)) aus.push({ nr: [13, 17], art: 'bestaetigt', text: 'Bestätigung Phosphorwasserstoff' });
    if (pos(15) && neg(18)) aus.push({ nr: [15, 18], art: 'bestaetigt', text: 'Bestätigung Kohlenstoffdioxid (Nr. 15 positiv, Nr. 18 negativ)' });
    if (z && z.ph === 'sauer' && BLATT.B.nr.every(neg)) aus.push({ nr: [], art: 'hinweis', text: 'pH < 7 ohne Anzeige auf Blatt B: ggf. schwerflüchtige Säure (Schwefelsäure, Phosphorsäure, Sulfonsäure)' });
    return aus;
  }
  // Ex-Sensor und PID als Zusatzinformation (Messstrategie S. 21)
  function exPid(ex, pid) {
    if (ex === null || ex === undefined || pid === null || pid === undefined) return null;
    if (ex && pid) return { text: 'Anzeige Ex und PID', stoffe: ['Ammoniak', 'Toluol', 'Ethylacetat', 'Aceton'] };
    if (ex) return { text: 'Anzeige Ex, keine Anzeige PID', stoffe: ['Kohlenstoffmonoxid', 'Methan (Erdgas)'] };
    if (pid) return { text: 'keine Anzeige Ex, Anzeige PID', stoffe: ['Phosphorwasserstoff', 'Schwefelwasserstoff'] };
    return { text: 'keine Anzeige Ex und PID', stoffe: ['alle weiteren nicht aufgeführten Stoffe der ETW-Liste'] };
  }
  const EX_PID_HINWEIS = 'Einige Stoffe werden von Sensoren in Gasmessgeräten erst in hohen Konzentrationen erfasst – die Werte der Gasmessgeräte sind nur Zusatzinformation und ersetzen das Messkonzept mit Röhrchen nicht.';

  // ---------------------------------------------------------------- Bewertung eines Messwerts gegen ETW und Messbereich
  const zahl = v => { if (v === null || v === undefined || String(v).trim() === '') return null; const z = Number(String(v).replace(',', '.').trim()); return Number.isFinite(z) ? z : null; };
  function bewerten(r, wert, huebe) {
    const w = zahl(wert);
    if (!r || w === null) return null;
    const st = (r.stufen || []).find(s => s.n === Number(huebe)) || null;
    const bereich = st && st.bis !== undefined ? { von: st.von, bis: st.bis } : null;
    const aus = { wert: w, einheit: r.einheit, stufe: 'unter', text: '', bereich: '' };
    if (r.etw1 !== null && r.etw1 !== undefined && w >= r.etw1) { aus.stufe = 'etw1'; aus.text = `ETW-1 (${zahlText(r.etw1)} ${r.einheit}) erreicht`; }
    else if (r.etw4 !== null && r.etw4 !== undefined && w >= r.etw4) { aus.stufe = 'etw4'; aus.text = `ETW-4 (${zahlText(r.etw4)} ${r.einheit}) erreicht${r.etw1 ? `, unter ETW-1 (${zahlText(r.etw1)})` : ''}`; }
    else if (r.etw4 !== null && r.etw4 !== undefined) aus.text = `unter ETW-4 (${zahlText(r.etw4)} ${r.einheit})`;
    else { aus.stufe = 'ohne'; aus.text = 'kein ETW festgelegt'; }
    if (bereich && w > bereich.bis) aus.bereich = `über dem Messbereich (${zahlText(bereich.von)}–${zahlText(bereich.bis)} ${r.einheit}) – mit weniger Hüben wiederholen`;
    else if (bereich && w > 0 && w < bereich.von) aus.bereich = `unter dem Messbereich (ab ${zahlText(bereich.von)} ${r.einheit})${(r.stufen || []).some(s => s.n > Number(huebe)) ? ' – mit mehr Hüben wiederholen' : ''}`;
    return aus;
  }
  function zahlText(z) { if (z === null || z === undefined) return '–'; return String(Math.round(z * 1000) / 1000).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  // ---------------------------------------------------------------- Brände: Simultantest-Sets und Einzelröhrchen (Messstrategie S. 10)
  // marken: [1. Markierung, 2. Markierung] in ppm (null = keine); Leitsubstanzen-Set: 1. Marke = ETW-4, 2. Marke = ETW-1
  const SETS = [
    { id: 'leit', name: 'Simultantest Leitsubstanzen vfdb (Brandrauch)', huebe: 20, bestellnr: '8101736', brand: true,
      hinweis: 'Markierungen nach vfdb-RL 10/01: 1. Marke = ETW-4, 2. Marke = ETW-1.',
      kanaele: [{ name: 'Kohlenstoffmonoxid', marken: [33, 83], etw4: 33, etw1: 83 }, { name: 'Blausäure', marken: [3.5, 7.1], etw4: 3.5, etw1: 7.1 },
        { name: 'Salzsäure', marken: [11, 22], etw4: 11, etw1: 22, anm: 'Die Messstrategie 1.5 nennt auf dem Brand-Blatt 5,4 ppm für ETW-4; vfdb (2023) und Dräger-Produktinformation nennen 11 ppm. Maßgeblich ist die Markierung auf dem Röhrchen.' },
        { name: 'Nitrose Gase', marken: [8.2, 12], etw4: 8.2, etw1: 12 }, { name: 'Formaldehyd', marken: [1, null], etw4: 1, etw1: null, anm: 'ETW-1 von vfdb nicht festgelegt.' }] },
    { id: 'set1', name: 'Simultantest-Set I (anorganische Brandgase)', huebe: 10, bestellnr: '8101735', brand: true,
      kanaele: [{ name: 'Kohlenstoffmonoxid', marken: [30, 150], etw4: 33, etw1: 83 }, { name: 'Blausäure', marken: [null, 9.5], etw4: 3.5, etw1: 7.1 },
        { name: 'Salzsäure', marken: [2, 10], etw4: 11, etw1: 22, gruppe: 'Mineralsäuren', anm: 'Kanal „Saure Gase“ (Leitstoff Salzsäure).' }, { name: 'Nitrose Gase (NO₂)', marken: [null, 2.5], etw4: 8.2, etw1: 12 },
        { name: 'Ammoniak', marken: [30, 150], etw4: 110, etw1: 160, gruppe: 'Amine', anm: 'Kanal „Basische Gase“ (Leitstoff Ammoniak).' }] },
    { id: 'set2', name: 'Simultantest-Set II (anorganische Brandgase)', huebe: null, bestellnr: '8101736',
      kanaele: [{ name: 'Schwefeldioxid', marken: [null, 10], etw4: 0.75, etw1: 0.75 }, { name: 'Chlor', marken: [null, 2.5], etw4: 1, etw1: 2 },
        { name: 'Schwefelwasserstoff', marken: [5, 25], etw4: 20, etw1: 27 }, { name: 'Phosphorwasserstoff', marken: [null, 0.3], etw4: 0.5, etw1: 2 },
        { name: 'Phosgen', marken: [null, 0.5], etw4: 0.08, etw1: 0.3 }] },
    { id: 'set3', name: 'Simultantest-Set III (organische Dämpfe)', huebe: null, bestellnr: '8101770',
      kanaele: [{ name: 'Ketone (Aceton)', marken: [500, 2500], etw4: 500, etw1: null, gruppe: 'Ketone' }, { name: 'Aromaten (Toluol)', marken: [50, 250], etw4: 310, etw1: 560, gruppe: 'Aromaten' },
        { name: 'Alkohole (Methanol)', marken: [200, 1000], etw4: 720, etw1: null, gruppe: 'Alkohole' }, { name: 'Aliphatische KW (n-Hexan)', marken: [50, 100], etw4: 2900, etw1: 2900, gruppe: 'Benzinkohlenwasserstoffe' },
        { name: 'Chlorierte KW (Perchlorethylen)', marken: [20, 100], etw4: 120, etw1: 230, gruppe: 'Chlorkohlenwasserstoffe' }] },
    // Begasung (Container, Laderäume): je Kanal eine Markierung (Dräger-Produktinformation Simultantest-Sets)
    { id: 'beg1', name: 'Simultantest-Set Begasung I', huebe: null, bestellnr: '8103410', begasung: true,
      kanaele: [{ name: 'Formaldehyd', marken: [1, null], etw4: 1, etw1: null }, { name: 'Phosphorwasserstoff', marken: [0.1, null], etw4: 0.5, etw1: 2 },
        { name: 'Blausäure', marken: [10, null], etw4: 3.5, etw1: 7.1 }, { name: 'Methylbromid', marken: [5, null], etw4: null, etw1: null }, { name: 'Ammoniak', marken: [50, null], etw4: 110, etw1: 160 }] },
    { id: 'beg2', name: 'Simultantest-Set Begasung II', huebe: null, bestellnr: '8103380', begasung: true,
      kanaele: [{ name: 'Formaldehyd', marken: [1, null], etw4: 1, etw1: null }, { name: 'Phosphorwasserstoff', marken: [0.3, null], etw4: 0.5, etw1: 2 },
        { name: 'Blausäure', marken: [10, null], etw4: 3.5, etw1: 7.1 }, { name: 'Methylbromid', marken: [0.5, null], etw4: null, etw1: null }, { name: 'Ethylenoxid', marken: [1, null], etw4: 14, etw1: 45 }] },
  ];
  // Einzelröhrchen nach dem Simultantest bei Bränden (Messstrategie S. 10): Nr. und Hubzahl
  const BRAND_EINZEL = [{ nr: 17, huebe: 10 }, { nr: 16, huebe: 2 }, { nr: 11, huebe: 2 }, { nr: 14, huebe: 10 }];
  const BRAND_MEHRGAS = ['ex', 'o2', 'co', 'co2'];
  // Ablesung am Simultantest: 0 = keine Anzeige, 1 = 1. Marke erreicht, 2 = 2. Marke erreicht → Bewertung gegen ETW
  function kanalBewerten(k, stufe) {
    stufe = Number(stufe);
    if (!stufe) return { stufe: 'unter', text: k.marken[0] !== null ? `unter ${zahlText(k.marken[0])} ppm` : (k.marken[1] !== null ? `unter ${zahlText(k.marken[1])} ppm` : 'keine Anzeige') };
    const ab = stufe === 2 ? k.marken[1] : k.marken[0];
    if (ab === null || ab === undefined) return null;
    const s = k.etw1 !== null && k.etw1 !== undefined && ab >= k.etw1 ? 'etw1' : k.etw4 !== null && k.etw4 !== undefined && ab >= k.etw4 ? 'etw4' : 'unter';
    return { stufe: s, text: `mindestens ${zahlText(ab)} ppm` };
  }

  // ---------------------------------------------------------------- Querempfindlichkeiten: welches Röhrchen zeigt (auch) welchen Stoff an
  // Aus den Stoffblättern (Kapitel III, Seite s) und der Messstrategie (Blatt A–E, Auswertung S. 21). nr = Röhrchen des Messkonzepts.
  // stoffe: ausdrücklich genannte Stoffe oder Stoffgruppen (siehe GRUPPEN). Angezeigt heißt: Verfärbung – die Skala gilt nur für den Hauptstoff.
  const QUER = [
    { r: 'Formaldehyd 0,2/a', nr: 14, s: 47, stoffe: ['Styrol', 'Vinylacetat', 'Acetaldehyd', 'Acrolein', 'Dieselkraftstoff', 'Furfurylalkohol'], wie: 'mit gelbbrauner Farbe (Formaldehyd: rosa)', farbe: 'gelbbraun' },
    { r: 'Ethylenoxid 1/a', s: 44, stoffe: ['Styrol', 'Vinylacetat', 'Acetaldehyd'], wie: 'mit gelbbrauner Farbe', farbe: 'gelbbraun' },
    { r: 'Ethylenoxid 1/a', s: 44, stoffe: ['Formaldehyd', 'Ethylenglykol'], wie: 'gleiche Verfärbung – Ethylenoxid-Messung dann nicht möglich' },
    { r: 'Aceton 100/b', nr: 8, s: 25, stoffe: ['Ketone', 'Aldehyde'], wie: 'andere Ketone mit unterschiedlicher Empfindlichkeit' },
    { r: 'Ammoniak 5/a', nr: 2, s: 28, stoffe: ['Amine', 'Hydrazin', 'Anilin', 'Ethylendiamin'], wie: 'andere basische Stoffe, z. B. organische Amine' },
    { r: 'Anilin 0,5/a', s: 29, stoffe: ['Ether', 'Ketone', 'Ester', 'Aromaten', 'Benzinkohlenwasserstoffe'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Arsenwasserstoff 0,05/a', s: 30, stoffe: ['Phosphorwasserstoff', 'Antimonwasserstoff'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Benzol 5/b', s: 31, stoffe: ['Benzinkohlenwasserstoffe', 'Aromaten'], wie: 'mit unterschiedlicher Empfindlichkeit, keine Unterscheidung möglich' },
    { r: 'Chlor 0,2/a', nr: 10, s: 33, stoffe: ['Brom'], wie: 'gleiche Empfindlichkeit, blassere Farbe' },
    { r: 'Chlor 0,2/a', nr: 10, s: 33, stoffe: ['Chlordioxid', 'Stickstoffdioxid'], wie: 'Chlordioxid mit unterschiedlicher, Stickstoffdioxid mit geringerer Empfindlichkeit (blasser)' },
    { r: 'Chlorbenzol 5/a', s: 34, stoffe: ['Chlorkohlenwasserstoffe'], wie: 'andere Chlorkohlenwasserstoffe mit unterschiedlicher Empfindlichkeit' },
    { r: 'Chloroform 2/b', s: 36, stoffe: ['Chlorkohlenwasserstoffe'], wie: 'andere Chlorkohlenwasserstoffe mit unterschiedlicher Empfindlichkeit' },
    { r: 'Salzsäure 0,2/a', nr: 16, s: 37, stoffe: ['Mineralsäuren', 'sauer reagierende Stoffe'], wie: 'andere saure Gase mit unterschiedlicher Empfindlichkeit' },
    { r: 'Blausäure 0,5/a', nr: 17, s: 38, stoffe: ['Phosphorwasserstoff'], wie: 'wird mit angezeigt (Blatt B)' },
    { r: 'Cyclohexylamin 2/a', s: 39, stoffe: ['Amine', 'Ammoniak'], wie: 'andere basische Stoffe' },
    { r: 'Epichlorhydrin 5/c', s: 40, stoffe: ['Chlorkohlenwasserstoffe', 'Halogene', 'Mineralsäuren'], wie: 'Chlorkohlenwasserstoffe mit unterschiedlicher Empfindlichkeit; freie Halogene und Halogenwasserstoffsäuren werden ebenfalls angezeigt' },
    { r: 'Essigsäure 5/a', s: 41, stoffe: ['organische Säuren'], wie: 'gleiche Farbe, teils unterschiedliche Empfindlichkeit' },
    { r: 'Essigsäure 5/a', s: 41, stoffe: ['Mineralsäuren'], wie: 'mit roter Farbe und unterschiedlicher Empfindlichkeit', farbe: 'rot' },
    { r: 'Ethanol 100/a', s: 42, stoffe: ['Methanol', 'Tetrahydrofuran'], wie: 'mit ähnlicher Empfindlichkeit' },
    { r: 'Ethanol 100/a', s: 42, stoffe: ['Alkohole'], wie: 'keine Unterscheidung der Alkohole; höhere Alkohole mit stark abnehmender Empfindlichkeit' },
    { r: 'Fluor 0,1/a', s: 45, stoffe: ['Stickstoffdioxid', 'Chlor', 'Chlordioxid'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Fluorwasserstoff 0,5/a', s: 46, stoffe: ['Mineralsäuren', 'Salzsäure', 'Salpetersäure'], wie: 'werden ebenfalls angezeigt' },
    { r: 'Hexan 10/a', s: 48, stoffe: ['Benzinkohlenwasserstoffe'], wie: 'mit unterschiedlicher Empfindlichkeit, keine Unterscheidung möglich' },
    { r: 'Hexan 10/a', s: 48, stoffe: ['Kohlenstoffmonoxid'], wie: 'mit etwas geringerer Empfindlichkeit als n-Hexan' },
    { r: 'Hydrazin 0,25/a', s: 49, stoffe: ['Amine', 'Ammoniak'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Kohlenstoffdioxid 0,5%/a', nr: 15, s: 50, stoffe: ['Schwefeldioxid'], wie: 'mit dreifach geringerer Empfindlichkeit' },
    { r: 'Schwefelkohlenstoff 5/a', s: 51, stoffe: ['Benzinkohlenwasserstoffe', 'Aromaten'], wie: 'aliphatische und aromatische Kohlenwasserstoffe mit unterschiedlicher Empfindlichkeit' },
    { r: 'Methanol 20/a', s: 53, stoffe: ['Alkohole'], wie: 'keine Unterscheidung der Alkohole; höhere Alkohole mit stark abnehmender Empfindlichkeit' },
    { r: 'Methanol 20/a', s: 53, stoffe: ['Ether', 'Xylole'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Mercaptan 0,1/a', s: 54, stoffe: ['Propylmercaptan', 'tert.-Butylmercaptan', 'Mercaptane'], wie: 'mit geringerer Empfindlichkeit' },
    { r: 'Phosphorwasserstoff 0,1/c', nr: 13, s: 55, stoffe: ['Arsenwasserstoff', 'Schwefelwasserstoff'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Salpetersäure 1/a', s: 56, stoffe: ['Stickstoffdioxid'], wie: '50 ppm Stickstoffdioxid zeigen wie 3 ppm Salpetersäure' },
    { r: 'Schwefeldioxid 0,5/a', nr: 18, s: 57, stoffe: ['Schwefelwasserstoff'], wie: 'wird mit angezeigt (Blatt B)' },
    { r: 'Schwefelwasserstoff 2/b', nr: 4, s: 58, stoffe: ['Mercaptane'], wie: 'nur in hohen Konzentrationen (Blatt D)' },
    { r: 'Nitrose Gase 0,2/a', nr: 11, s: 59, stoffe: ['Chlor', 'Ozon', 'Stickstoffmonoxid'], wie: 'Chlor und Ozon mit unterschiedlicher Empfindlichkeit, Stickstoffmonoxid erhöht die Anzeige' },
    { r: 'Styrol 10/b', s: 60, stoffe: ['Xylole', 'Toluol', 'Butadien', 'Ethylbenzol'], wie: 'stören die Anzeige (reagieren mit dem Formaldehyd-Schwefelsäure-System)' },
    { r: 'Perchlorethylen 2/a', nr: 6, s: 61, stoffe: ['Chlorkohlenwasserstoffe', 'Halogene', 'Mineralsäuren'], wie: 'andere Chlorkohlenwasserstoffe, freie Halogene und Halogenwasserstoffsäuren' },
    { r: 'Tetrachlorkohlenstoff 1/a', s: 62, stoffe: ['Chlorpikrin', 'Phosgen'], wie: 'mit etwa gleicher Empfindlichkeit' },
    { r: 'Toluol 100/a', nr: 7, s: 63, stoffe: ['Xylole'], wie: 'etwa gleiche Empfindlichkeit, blauviolette Farbe', farbe: 'blauviolett' },
    { r: 'Toluol 100/a', nr: 7, s: 63, stoffe: ['Benzol'], wie: 'färbt die ganze Anzeigeschicht diffus gelbbraun', farbe: 'gelbbraun' },
    { r: 'Toluol 100/a', nr: 7, s: 63, stoffe: ['Benzinkohlenwasserstoffe'], wie: 'färben die ganze Anzeigeschicht diffus rötlich-braun', farbe: 'rötlich-braun' },
    { r: 'Toluol 100/a', nr: 7, s: 63, stoffe: ['Aromaten'], wie: 'hauptsächlich aromatische Kohlenwasserstoffe (Blatt D)' },
    { r: 'Trichlorethan 50/d', s: 65, stoffe: ['Chlorkohlenwasserstoffe'], wie: 'mit unterschiedlicher Empfindlichkeit' },
    { r: 'Benzinkohlenwasserstoffe 10/a', s: 66, stoffe: ['Benzinkohlenwasserstoffe', 'Octan'], wie: 'außer n-Octan auch andere organische und anorganische Verbindungen' },
    { r: 'Trichlorethylen 50/a', s: 67, stoffe: ['Chlorkohlenwasserstoffe', 'Halogene', 'Mineralsäuren'], wie: 'Chlorkohlenwasserstoffe mit unterschiedlicher Empfindlichkeit; freie Halogene und Halogenwasserstoffsäuren werden ebenfalls angezeigt' },
    { r: 'Vinylchlorid 100/a', s: 68, stoffe: ['C=C-Doppelbindung'], wie: 'viele organische Verbindungen mit C=C-Doppelbindung, keine Unterscheidung möglich' },
    { r: 'Ethylacetat 200/a', nr: 9, stoffe: ['Benzinkohlenwasserstoffe', 'Alkohole', 'Aromaten', 'Ester', 'Ether', 'Aldehyde', 'Ketone'], wie: 'zeigt hauptsächlich Benzin-Kohlenwasserstoffe, daneben Alkohole, Aromaten, Ester, Ether, Aldehyde und Ketone (Blatt D)' },
    { r: 'Polytest', nr: 3, stoffe: ['Aceton', 'Acetylen', 'Arsenwasserstoff', 'Benzol', 'Butan', 'Ethylen', 'Kohlenstoffmonoxid', 'Octan', 'Perchlorethylen', 'Propan', 'Schwefelkohlenstoff', 'Schwefelwasserstoff', 'Styrol', 'Toluol', 'Xylole'],
      wie: 'qualitativ – Nachweisgrenzen bei 5 Hüben siehe Auswertung' },
    { r: 'Säuretest', nr: 1, stoffe: ['sauer reagierende Stoffe', 'Mineralsäuren', 'Salzsäure'], wie: 'qualitativ (Blatt A)' },
    { r: 'Kohlenstoffmonoxid (CO-Sensor)', nr: 5, stoffe: ['Ethen', 'Ethin', 'Wasserstoff'], wie: 'Querempfindlichkeit des Dräger-XXS-CO-Sensors' },
  ];
  // ausdrücklich NICHT angezeigt bzw. stört nicht (Auswahl aus den Stoffblättern)
  const NICHT = [
    { r: 'Aceton 100/b', s: 25, stoffe: ['Ester'], text: 'Ester werden nicht angezeigt.' },
    { r: 'Chlorbenzol 5/a', s: 34, stoffe: ['Methylenchlorid', 'Dichlormethan'], text: 'Methylenchlorid stört die Anzeige nicht.' },
    { r: 'Ethanol 100/a', s: 42, stoffe: ['Benzinkohlenwasserstoffe', 'Ketone', 'Ester', 'Ether', 'Chlorkohlenwasserstoffe', 'Formaldehyd', 'Benzol', 'Toluol'], text: 'Aliphatische Benzinkohlenwasserstoffe, Ketone, Ester, Ether, Halogenkohlenwasserstoffe sowie Formaldehyd, Benzol und Toluol werden nicht angezeigt.' },
    { r: 'Methanol 20/a', s: 53, stoffe: ['Benzinkohlenwasserstoffe', 'Ketone', 'Ester', 'Chlorkohlenwasserstoffe', 'Benzol'], text: 'Aliphatische Benzinkohlenwasserstoffe, Ketone, Ester, Halogenkohlenwasserstoffe und Benzol werden nicht angezeigt.' },
    { r: 'Toluylendiisocyanat 0,02/a', s: 64, stoffe: ['Isocyanate'], text: 'Andere Isocyanate werden nicht angezeigt.' },
    { r: 'Polytest', nr: 3, stoffe: ['Methan', 'Ethan', 'Wasserstoff', 'Kohlenstoffdioxid'], text: 'Nicht angezeigt werden z. B. Methan, Ethan, Wasserstoff, Kohlenstoffdioxid.' },
  ];
  // Stoffgruppen mit Beispielen (Zuordnung für die Suche; die Empfindlichkeit für einzelne Stoffe einer Gruppe ist meist unterschiedlich)
  const GRUPPEN = {
    'Ketone': ['Aceton', 'Butanon', 'Methylethylketon', 'MEK', 'Methylisobutylketon', 'MIBK', 'Cyclohexanon'],
    'Aldehyde': ['Formaldehyd', 'Acetaldehyd', 'Acrolein', 'Propionaldehyd'],
    'Alkohole': ['Methanol', 'Ethanol', 'Propanol', 'Isopropanol', '2-Propanol', 'Butanol'],
    'Aromaten': ['Benzol', 'Toluol', 'Xylol', 'Xylole', 'Ethylbenzol', 'Styrol', 'Cumol'],
    'Benzinkohlenwasserstoffe': ['Benzin', 'Ottokraftstoff', 'Waschbenzin', 'Hexan', 'n-Hexan', 'Heptan', 'Octan', 'Oktan'],
    'Chlorkohlenwasserstoffe': ['Dichlormethan', 'Methylenchlorid', 'Chloroform', 'Trichlormethan', 'Tetrachlorkohlenstoff', 'Tetrachlormethan', 'Trichlorethen', 'Trichlorethylen',
      'Perchlorethylen', 'Tetrachlorethen', 'Chlorbenzol', 'Trichlorethan', 'Vinylchlorid', 'Epichlorhydrin'],
    'Amine': ['Methylamin', 'Dimethylamin', 'Trimethylamin', 'Triethylamin', 'Anilin', 'Cyclohexylamin', 'Ethylendiamin', 'Hydrazin'],
    'Ester': ['Ethylacetat', 'Butylacetat', 'Methylacetat', 'Vinylacetat'],
    'Ether': ['Diethylether', 'Tetrahydrofuran', 'THF', 'MTBE'],
    'Mineralsäuren': ['Salzsäure', 'Chlorwasserstoff', 'Salpetersäure', 'Flusssäure', 'Fluorwasserstoff', 'Bromwasserstoff', 'Schwefelsäure', 'Phosphorsäure'],
    'organische Säuren': ['Essigsäure', 'Ameisensäure', 'Propionsäure'],
    'Halogene': ['Chlor', 'Brom', 'Fluor', 'Iod'],
    'Mercaptane': ['Methylmercaptan', 'Methanthiol', 'Ethylmercaptan', 'Propylmercaptan', 'tert.-Butylmercaptan'],
    'C=C-Doppelbindung': ['Ethylen', 'Ethen', 'Propen', 'Propylen', 'Butadien', 'Styrol', 'Vinylchlorid', 'Vinylacetat'],
    'sauer reagierende Stoffe': ['Salzsäure', 'Chlorwasserstoff', 'Salpetersäure', 'Essigsäure', 'Schwefeldioxid'],
    'Isocyanate': ['Methylisocyanat', 'Hexamethylendiisocyanat', 'HDI', 'MDI'],
  };
  const ALIAS = { 'diesel': 'Dieselkraftstoff', 'xylol': 'Xylole', 'oktan': 'Octan', 'blausäure': 'Cyanwasserstoff', 'phosphin': 'Phosphorwasserstoff', 'ethin': 'Acetylen', 'acetylen': 'Ethin' };
  const norm = t => String(t || '').toLowerCase().replace(/[‐-]/g, '-').trim();
  // Suche: q → { direkt: [Treffer mit ausdrücklich genanntem Stoff], gruppe: [Treffer über die Stoffgruppe], nicht: [ausdrücklich nicht], sets: [Simultantest-Kanäle] }
  function quersuche(q) {
    const n = norm(q); if (n.length < 3) return { direkt: [], gruppe: [], nicht: [], sets: [] };
    const namen = new Set([n]); if (ALIAS[n]) namen.add(norm(ALIAS[n]));
    // Stoffname passt, wenn ein Wort darin mit der Eingabe beginnt (Diesel → Dieselkraftstoff, Xylol → Xylole, Hexan → n-Hexan)
    const woerter = t => norm(t).split(/[^a-zäöüß0-9]+/).filter(Boolean);
    const passt = stoff => [...namen].some(x => norm(stoff) === x || (x.length >= 4 && woerter(stoff).some(w => w.startsWith(x))));
    // Gruppe: nur bei genauem Treffer eines Beispiels oder des Gruppennamens (Brom ≠ Bromwasserstoff, Butanon ≠ Butan)
    const gruppenVon = Object.entries(GRUPPEN).filter(([g, l]) => [...namen].some(x => norm(g) === x || l.some(m => norm(m) === x))).map(([g]) => g);
    const direkt = [], gruppe = [];
    for (const e of QUER) {
      const d = e.stoffe.filter(s => !GRUPPEN[s] && passt(s));
      if (d.length) direkt.push({ ...e, treffer: d });
    }
    for (const e of QUER) {
      const g = e.stoffe.filter(s => GRUPPEN[s] && gruppenVon.includes(s));
      if (g.length && !direkt.some(x => x.r === e.r) && !gruppe.some(x => x.r === e.r)) gruppe.push({ ...e, treffer: g });
    }
    const nicht = NICHT.filter(e => e.stoffe.some(s => passt(s) || (GRUPPEN[s] && gruppenVon.includes(s))));
    const sets = [];
    for (const s of SETS) for (const k of s.kanaele) if (passt(k.name) || (k.gruppe && gruppenVon.includes(k.gruppe))) sets.push({ set: s, kanal: k, ueberGruppe: !passt(k.name) });
    return { direkt, gruppe, nicht, sets, gruppen: gruppenVon };
  }

  // ---------------------------------------------------------------- Messwerte des Mehrgasmessgeräts
  const MEHRGAS = [
    { id: 'ex', name: 'Ex', einheit: '% UEG', warn: v => v >= 10, warnText: 'ab 10 % UEG: Ex-Gefahr – Zündquellen meiden' },
    { id: 'o2', name: 'O₂', einheit: 'Vol.-%', warn: v => v < 19 || v > 23, warnText: 'unter 19 bzw. über 23 Vol.-%' },
    { id: 'co', name: 'CO', einheit: 'ppm', warn: v => v >= 33, warnText: 'ab ETW-4 (33 ppm)' },
    { id: 'co2', name: 'CO₂', einheit: 'Vol.-%', warn: v => v >= 1, warnText: 'ab ETW-4 (1 Vol.-%)' },
    { id: 'pid', name: 'PID', einheit: 'ppm', warn: () => false, warnText: '' },
  ];

  return { QUELLE, ROEHRCHEN: R, roehrchen, BLATT, HINWEISE, POLYTEST_GRENZEN, POLYTEST_NICHT, plan, auswerten, AUSWERTUNG, exPid, EX_PID_HINWEIS,
    bewerten, zahl, zahlText, SETS, BRAND_EINZEL, BRAND_MEHRGAS, kanalBewerten, MEHRGAS, QUER, NICHT, GRUPPEN, quersuche,
    // Fotos der Stoffblätter (Seite) zu den Röhrchen des Messkonzepts – Dateien im App-Ordner unter _App/Roehrchen (nicht öffentlich)
    BILD_SEITE: { 2: 28, 4: 58, 6: 61, 7: 63, 8: 25, 10: 33, 11: 59, 12: 32, 13: 55, 14: 47, 15: 50, 16: 37, 17: 38, 18: 57 } };
});
