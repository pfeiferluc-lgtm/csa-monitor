// Gemeinsame Regeln der Auswertung von Beständigkeitslisten – für den Mac-Helfer (werkzeuge/gsz-helfer.mjs, Claude Code) und
// die App selbst (claude-direkt.js, Claude-API ohne Mac): Anfragetext je Teil, Prüfanfrage, Seitennummern, Zusammensetzen der
// Teile, Prüfergebnis und die Prüfsumme der Quelle, an der der Helfer eine Auswertung aus der App erkennt.
// Läuft im Browser (window.GSZAuswertung) und in Node (require).
'use strict';
(function (wurzel, fabrik) {
  const B = (typeof module === 'object' && module.exports) ? require('./bestaendigkeit') : wurzel.GSZBestaendigkeit;
  const m = fabrik(B);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else wurzel.GSZAuswertung = m;
})(typeof self !== 'undefined' ? self : this, function (B) {
  const TEIL_SEITEN = 6, TEIL_BILDER = 6;
  const tx = v => (v === null || v === undefined) ? '' : String(v).replace(/\s+/g, ' ').trim();
  const hatSpalten = d => !!(d && d.ist_liste !== false && d.kopf && Array.isArray(d.kopf.spalten) && d.kopf.spalten.some(s => s && tx(s.id)));
  const teilKurz = t => t.art === 'pdf' ? `S. ${t.von}–${t.bis}` : `${t.bilder.length} Bild${t.bilder.length === 1 ? '' : 'er'}`;
  // Seitenbereiche eines PDFs: [[1, 6], [7, 12], …]
  function bereiche(seiten, je = TEIL_SEITEN) { const b = []; for (let von = 1; von <= seiten; von += je) b.push([von, Math.min(seiten, von + je - 1)]); return b; }

  // Teil-Beschreibung im Anfragetext. ganz: das beigefügte PDF ist die ganze Liste (App: ein PDF für alle Teile, im Zwischenspeicher)
  function teilZeile(teil, nr, anzahl, { pruefung = false } = {}) {
    if (teil.art !== 'pdf') return `Teil ${nr} von ${anzahl}: ${teil.bilder.length} Bild${teil.bilder.length === 1 ? '' : 'er'} der Liste (` +
      (pruefung ? teil.bilder.map(b => b.name).join(', ') : teil.bilder.map((b, k) => `Bild ${k + 1} = ${b.name}`).join(', ')) + ').' +
      (pruefung ? '' : ' Gib in seite die aufgedruckte Seitennummer an, sonst den Dateinamen des Bildes.');
    const kopf = `Teil ${nr} von ${anzahl}: ${teil.name}, Seiten ${teil.von}–${teil.bis} von ${teil.seiten}.`;
    if (teil.seiten <= teil.bis - teil.von + 1) return kopf;
    if (teil.ganz) return kopf + ` Das beigefügte PDF ist die ganze Liste – ${pruefung ? 'prüfe' : 'übertrage'} nur die Seiten ${teil.von} bis ${teil.bis} (Seitenzählung des PDFs)` +
      (pruefung ? '.' : `; gib in seite diese Seitennummer an (${teil.von} bis ${teil.bis}).`);
    return kopf + (pruefung ? ` Das beigefügte PDF enthält nur diese Seiten (Seite 1 des PDFs = Seite ${teil.von} des Originals).`
      : ` Das beigefügte PDF enthält nur diese Seiten – gib in seite die Seitennummer des Originals an (${teil.von} bis ${teil.bis}).`);
  }

  function teilText({ ordner, infoText, teil, nr, anzahl, bezug, bezugNr }) {
    const z = [`Gefahrstoffzug-App: Beständigkeitsliste für das Gerät „${ordner}“ übertragen.`,
      infoText ? 'Angaben zum Gerät (info.txt):\n' + infoText : 'Angaben zum Gerät: keine (keine info.txt).', teilZeile(teil, nr, anzahl)];
    if (bezug) {
      z.push(`Die Liste wird in Teilen übertragen. Kopf aus Teil ${bezugNr}: Verwende genau diese spalten in derselben Reihenfolge (werte[k] gehört zu spalten[k]) und diese legende; ergänze in legende nur Zeichen, die dort fehlen. Titel, Hersteller, Werkstoffe und Hinweise müssen nicht wiederholt werden.\n` +
        JSON.stringify({ art: bezug.art, spalten: bezug.spalten, legende: bezug.legende }));
    } else if (anzahl > 1) {
      z.push('Die Liste wird in Teilen übertragen; lege kopf vollständig an (spalten, legende) – die weiteren Teile übernehmen ihn.');
    }
    z.push('Übertrage jede Tabellenzeile dieses Teils als Eintrag.');
    return z.join('\n\n');
  }

  function pruefText({ ordner, d, teil, nr, anzahl, zeilen, alle }) {
    const sp = d.liste.spalten.map(s => s.id);
    const kopf = ['Seite', 'Stoff', 'CAS', 'Konz.', 'Temp.', ...sp].join(' | ');
    const tabelle = zeilen.map(e => [e.seite, e.stoff, e.cas, e.konz, e.temp, ...sp.map(id => (e.werte[id] && e.werte[id].roh) || '')].join(' | '));
    return [`Gefahrstoffzug-App: Prüfung der Beständigkeitsliste für das Gerät „${ordner}“.`,
      teilZeile(teil, nr, anzahl, { pruefung: true }),
      `Spalten in dieser Reihenfolge: ${d.liste.spalten.map(s => `${s.id} = ${s.name}`).join('; ')}.`,
      `Legende: ${(d.liste.legende || []).map(l => `${l.zeichen || '(leer)'} = ${l.text}`).join('; ')}.`,
      ...(Object.keys(B.fussnoten(d.liste)).length ? [`Fußnoten der Liste: ${Object.entries(B.fussnoten(d.liste)).map(([z, t]) => `${B.hoch(z)} = ${t}`).join('; ')}. Fußnotenzeichen gehören zum Wert.`] : []),
      alle ? 'Übertragene Zeilen der ganzen Liste – prüfe nur die, die auf diesen Seiten bzw. Bildern stehen; fehlende Zeilen nur für diese Seiten melden:'
           : `Übertragene Zeilen dieser Seiten (${zeilen.length}):`,
      kopf, ...tabelle].join('\n');
  }
  // Zeilen eines Teils für die Prüfung: bei genau einem PDF über die Seitenzahl, sonst alle
  function pruefZeilen(d, teile, teil) {
    const einPdf = teile.every(t => t.art === 'pdf') && new Set(teile.map(t => t.name)).size === 1;
    return { alle: !einPdf, zeilen: einPdf ? d.eintraege.filter(e => { const n = Number(e.seite); return n >= teil.von && n <= teil.bis; }) : d.eintraege };
  }

  // Seitennummern eines PDF-Teils ab Seite 7 usw.: Hat Claude im Teil-PDF gezählt (1–6 statt 7–12), aufs Original umrechnen.
  function seitenKorrigieren(d, teil) {
    if (!d || teil.art !== 'pdf' || teil.ganz || teil.von <= 1 || !Array.isArray(d.eintraege)) return d;
    const zahl = e => { const n = Number(tx(e && e.seite)); return Number.isInteger(n) && n > 0 ? n : null; };
    const zahlen = d.eintraege.map(zahl).filter(n => n !== null);
    const laenge = teil.bis - teil.von + 1;
    if (!zahlen.length || zahlen.some(n => n > laenge)) return d;
    return { ...d, eintraege: d.eintraege.map(e => zahl(e) === null ? e : { ...e, seite: String(zahl(e) + teil.von - 1) }) };
  }

  // Antworten der Teile → Eingabe für ausClaude(). ausClaude nimmt Spalten und Legende aus dem ersten Teil; deshalb steht
  // vorne der Bezugskopf (erster Teil mit Spalten), ergänzt um Angaben der übrigen Teile. Weichen die Spalten eines Teils
  // trotz Vorgabe ab, werden seine Werte über die Spalten-Kennung zugeordnet.
  function teileZusammensetzen(antworten) {
    const daten = antworten.filter(t => t && t.ist_liste !== false && t.kopf);
    const ref = daten.find(hatSpalten);
    if (!ref) return daten;                             // ausClaude meldet „keine Liste“ bzw. „keine Spalten“
    const refIds = ref.kopf.spalten.map(s => tx(s && s.id));
    const hinweise = [];
    const teile = daten.map(t => {
      const ids = (t.kopf.spalten || []).map(s => tx(s && s.id));
      if (t === ref || !ids.some(Boolean) || ids.join('\u0000') === refIds.join('\u0000')) return t;
      const idx = refIds.map(id => ids.indexOf(id));
      hinweise.push(`Teil ${antworten.indexOf(t) + 1}: Spalten abweichend erkannt (${ids.join(', ')}) und über die Kennung zugeordnet.`);
      return { ...t, eintraege: (t.eintraege || []).map(e => ({ ...e, werte: idx.map(j => (j >= 0 ? tx((e.werte || [])[j]) : '')) })) };
    });
    const kopf = { ...ref.kopf };
    for (const k of ['titel', 'hersteller', 'stand', 'bedingungen', 'kategorie']) if (!tx(kopf[k])) kopf[k] = daten.map(t => tx(t.kopf[k])).find(Boolean) || '';
    // Legende aus dem Bezugsteil, fehlende Zeichen aus den übrigen Teilen. Hatte der Bezugsteil die Legende nur vorläufig
    // angenommen und ein späterer Teil sie gefunden, gilt der spätere Text (15.11.2026: Schlauchliste IBS, Legende auf S. 11).
    const VORLAEUFIG = /vorläufig|angenommen|nicht (auf|in) (den |diesem |dieser )?(seiten?|teil|vorlage)|abgleichen/i;
    const legende = [...(ref.kopf.legende || [])];
    for (const l of daten.flatMap(t => t.kopf.legende || [])) {
      if (!l || !tx(l.zeichen)) continue;
      const i = legende.findIndex(x => tx(x.zeichen) === tx(l.zeichen));
      if (i < 0) legende.push(l);
      else if (VORLAEUFIG.test(tx(legende[i].text)) && !VORLAEUFIG.test(tx(l.text))) legende[i] = l;
    }
    kopf.legende = legende;
    kopf.hinweise = [...new Set(daten.flatMap(t => (t.kopf.hinweise || []).map(tx)).filter(Boolean))];
    // Fußnoten aller Teile (stehen oft nur auf einzelnen Seiten), je Zeichen einmal
    const fn = new Map();
    for (const f of daten.flatMap(t => t.kopf.fussnoten || [])) if (f && tx(f.zeichen) && tx(f.text) && !fn.has(tx(f.zeichen))) fn.set(tx(f.zeichen), { zeichen: tx(f.zeichen), text: tx(f.text) });
    kopf.fussnoten = [...fn.values()];
    // Die Werkstoffe beschreibt jeder Teil aus denselben Geräteangaben neu, jedes Mal etwas anders (15.11.2026, TESIMAX:
    // 19 Einträge aus 5 Teilen). Es gilt die Beschreibung des Bezugsteils, sonst die erste vorhandene.
    const werkstoffe = t => (t.kopf.werkstoffe || []).map(tx).filter(Boolean);
    kopf.werkstoffe = werkstoffe(ref).length ? werkstoffe(ref) : (daten.map(werkstoffe).find(l => l.length) || []);
    // Anmerkungen mit Teilnummer, damit sie sich dem Original zuordnen lassen
    if (antworten.length > 1) for (let i = 0; i < teile.length; i++) {
      const a = tx(teile[i].anmerkung);                 // nennt Claude den Teil schon selbst („Teil 1 (S. 1–6). …“), nicht doppeln
      if (a && !/^Teil \d/.test(a)) teile[i] = { ...teile[i], anmerkung: `Teil ${antworten.indexOf(daten[i]) + 1}: ${a}` };
    }
    teile[0] = { ...teile[0], kopf, anmerkung: [tx(teile[0].anmerkung), ...hinweise].filter(Boolean).join(' ') };
    return teile;
  }

  // Prüfergebnis eines Teils einsammeln
  // Fehlt in der Übertragung nur ein Fußnotenzeichen („+“ – Original „+⁵“), ist das keine Abweichung: Das Zeichen wird ergänzt.
  function pruefTeil(daten) {
    const alle = ((daten && daten.abweichungen) || []).filter(x => x && (tx(x.stoff) || tx(x.feld)))
      .map(x => ({ seite: tx(x.seite), stoff: tx(x.stoff), feld: tx(x.feld), liste: tx(x.liste), original: tx(x.original) }));
    const fe = ((daten && daten.fehlende_zeilen) || []).filter(x => x && tx(x.stoff)).map(x => ({ seite: tx(x.seite), stoff: tx(x.stoff) }));
    const fussnoten = alle.filter(x => B.nurFussnote(x.liste, x.original));
    return { abweichungen: alle.filter(x => !fussnoten.includes(x)), fehlend: fe, fussnoten, anmerkung: tx(daten && daten.anmerkung) };
  }
  // Zeile zu einer Abweichung: gleiche Seite und gleicher Stoff (Schreibweise egal); nur eindeutig
  const name = s => B.grund(s).replace(/\s+/g, '');      // „Salpetersäure 65 %“ = „Salpetersäure 65%“
  function zeileZu(d, x) {
    const s = name(x.stoff), seite = e => !x.seite || String(e.seite) === String(x.seite);
    let l = d.eintraege.filter(e => name(e.stoff) === s && seite(e));
    if (l.length !== 1) l = d.eintraege.filter(e => name(e.stoff) === s);
    if (l.length !== 1 && s) l = d.eintraege.filter(e => seite(e) && name(e.stoff) && (name(e.stoff).includes(s) || s.includes(name(e.stoff))));
    return l.length === 1 ? l[0] : null;
  }
  // Fußnotenzeichen in die Fassung übernehmen → Anzahl ergänzter Zellen
  function fussnotenErgaenzen(d, liste) {
    let n = 0;
    for (const x of liste || []) {
      const e = zeileZu(d, x), f = B.grund(x.feld);
      const sp = e && d.liste.spalten.find(s => s.id === x.feld || B.grund(s.id) === f || B.grund(s.name) === f);
      if (!sp) continue;
      const wert = B.ohneErklaerung(x.original);
      e.werte[sp.id] = { ...(e.werte[sp.id] || {}), roh: wert, stufe: B.stufeAus(wert, d.liste) };
      n++;
    }
    return n;
  }
  // Ergebnis der Prüfung in die Fassung schreiben (geprüft, wenn keine Abweichung; eine von Hand geprüfte Fassung bleibt geprüft)
  function pruefungEintragen(d, { von, modell, teile, abweichungen, fehlend, anmerkungen, fussnoten = [] }) {
    const ergaenzt = fussnotenErgaenzen(d, fussnoten);
    if (fussnoten.length) anmerkungen = [...anmerkungen, `${ergaenzt} fehlende Fußnotenzeichen ergänzt (z. B. ${fussnoten.slice(0, 3).map(x => `${x.stoff} · ${x.feld}: „${B.ohneErklaerung(x.original)}“`).join('; ')}).`];
    const ok = !abweichungen.length && !fehlend.length;
    const ergebnis = { von, am: new Date().toISOString(), modell,
      umfang: `${d.eintraege.length} Zeilen in ${teile} Teil${teile === 1 ? '' : 'en'} unabhängig ein zweites Mal mit dem Original verglichen`,
      ergebnis: ok ? 'keine Abweichung' : `${abweichungen.length} Abweichung${abweichungen.length === 1 ? '' : 'en'}${fehlend.length ? `, ${fehlend.length} fehlende Zeile${fehlend.length === 1 ? '' : 'n'}` : ''}`,
      abweichungen: abweichungen.slice(0, 300), fehlende_zeilen: fehlend.slice(0, 200), anmerkung: anmerkungen.join(' '), fussnoten_ergaenzt: ergaenzt };
    const aw = d.auswertung || (d.auswertung = {});
    const vonHand = aw.geprueft === true && aw.pruefung && !/Lesedurchgang/.test(String(aw.pruefung.von || ''));
    if (vonHand) aw.pruefung_auto = ergebnis;
    else { aw.pruefung = ergebnis; aw.geprueft = ok; }
    return { ok, vonHand, ergebnis };
  }

  // Prüfsumme der Quelle, die App und Mac-Helfer gleich berechnen können: Name (NFC) und Größe der Original-Listen (Reihenfolge
  // wie ordnerEinteilen) und info.txt ohne die App-Zeilen. Die App schreibt sie als auswertung.quelle_app.hash; der Helfer
  // erkennt daran, dass die Liste schon ausgewertet ist (er selbst rechnet zusätzlich mit der Änderungszeit).
  function quelleAppText(quellen, infoOhneApp) {
    return quellen.map(q => `${String(q.name).normalize('NFC')}\u0000${Number(q.groesse) || 0}`).join('\n') + '\ninfo\u0000' + String(infoOhneApp || '');
  }

  return { TEIL_SEITEN, TEIL_BILDER, tx, hatSpalten, teilKurz, bereiche, teilText, pruefText, pruefZeilen, seitenKorrigieren, teileZusammensetzen,
    pruefTeil, pruefungEintragen, quelleAppText, zeileZu, fussnotenErgaenzen };
});
