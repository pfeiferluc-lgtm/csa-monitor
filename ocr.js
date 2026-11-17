// Text aus Sicherheitsdatenblättern holen – auf dem Gerät, ohne Internet:
//   PDF mit Textebene → Text direkt (pdf.js), sonst Seiten als Bild rendern → Texterkennung (tesseract.js 7, deutsch)
//   Fotos/Bilder → verkleinern (lange Kante ≤ 2400 px, auch für das Hochladen) → Texterkennung
// Die Dateien der Texterkennung (ocr/…) lädt jedes Gerät beim ersten Gebrauch; danach liegen sie im Speicher der App.
// window.GSZOcr = { textAus(dateien, fortschritt) → { text, seiten, art }, bildVerkleinern(blob) → Blob, vorbereiten(), verfuegbar }
'use strict';
(() => {
  const MAX_KANTE = 2400, MAX_SEITEN = 30;
  let tesseract = null, worker = null, workerLaedt = null;

  const skript = src => new Promise((ok, fehler) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fehler(new Error(`${src} lässt sich nicht laden`));
    document.head.appendChild(s);
  });
  async function pdfjs() {
    if (!window.pdfjsLib) await skript('pdf.min.js');
    if (!window.pdfjsLib) throw new Error('PDF-Leser fehlt');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    return window.pdfjsLib;
  }
  const absolut = p => new URL(p, location.href).href;
  // Worker der Texterkennung (einmal je Sitzung); fortschritt(text, anteil)
  async function arbeiter(fortschritt) {
    if (worker) return worker;
    if (workerLaedt) return workerLaedt;
    workerLaedt = (async () => {
      if (!window.Tesseract) await skript('ocr/tesseract.min.js');
      tesseract = window.Tesseract;
      if (!tesseract) throw new Error('Texterkennung nicht verfügbar');
      fortschritt && fortschritt('Texterkennung wird vorbereitet …', 0);
      worker = await tesseract.createWorker('deu', 1, {
        workerPath: absolut('ocr/worker.min.js'), corePath: absolut('ocr/'), langPath: absolut('ocr/'), gzip: true, workerBlobURL: false,
        logger: m => { if (laufend && m.status === 'recognizing text') laufend(m.progress || 0); },
      });
      return worker;
    })();
    try { return await workerLaedt; } finally { workerLaedt = null; }
  }
  let laufend = null;
  async function erkennen(bild, aufFortschritt) {
    const w = await arbeiter();
    laufend = aufFortschritt;
    try { const { data } = await w.recognize(bild); return data.text || ''; } finally { laufend = null; }
  }

  // Bild laden und verkleinern (gibt eine Leinwand und ein JPEG zurück)
  async function bildLaden(blob) {
    let quelle;
    try { quelle = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
    catch {
      quelle = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fehler(new Error('Bild lässt sich nicht öffnen (Format?)'));
        i.src = URL.createObjectURL(blob); });
    }
    const w = quelle.width || quelle.naturalWidth, h = quelle.height || quelle.naturalHeight;
    const f = Math.min(1, MAX_KANTE / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * f); c.height = Math.round(h * f);
    c.getContext('2d').drawImage(quelle, 0, 0, c.width, c.height);
    return c;
  }
  const alsJpeg = c => new Promise(ok => c.toBlob(b => ok(b), 'image/jpeg', 0.82));
  async function bildVerkleinern(blob) { return alsJpeg(await bildLaden(blob)); }

  // Text einer PDF-Datei: Textebene, Zeilen nach Position zusammengesetzt
  async function pdfText(blob) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
    const seiten = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_SEITEN); n++) {
      const inhalt = await (await doc.getPage(n)).getTextContent();
      const zeilen = [];
      let y = null, zeile = [];
      for (const it of inhalt.items) {
        if (!('str' in it)) continue;
        const iy = Math.round(it.transform[5]);
        if (y !== null && Math.abs(iy - y) > 2) { zeilen.push(zeile.join('')); zeile = []; }
        zeile.push(it.str + (it.hasEOL ? '' : ''));
        if (it.hasEOL) { zeilen.push(zeile.join('')); zeile = []; y = null; continue; }
        y = iy;
      }
      if (zeile.length) zeilen.push(zeile.join(''));
      seiten.push(zeilen.map(z => z.replace(/\s+$/, '')).join('\n'));
    }
    return { doc, seiten, seitenzahl: doc.numPages };
  }
  async function pdfSeiteAlsBild(doc, n) {
    const seite = await doc.getPage(n);
    const v1 = seite.getViewport({ scale: 1 });
    const massstab = Math.min(2.8, MAX_KANTE / Math.max(v1.width, v1.height));
    const v = seite.getViewport({ scale: massstab });
    const c = document.createElement('canvas');
    c.width = Math.floor(v.width); c.height = Math.floor(v.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await seite.render({ canvasContext: ctx, viewport: v }).promise;
    return c;
  }

  // dateien: [{ name, typ, blob }] → { text, art: 'pdf-text' | 'ocr' | 'gemischt', seiten }
  async function textAus(dateien, fortschritt = () => {}) {
    const texte = [];
    let ocr = 0, pdfTextSeiten = 0, gesamt = 0;
    // Seiten zählen (für den Fortschritt)
    const plan = [];
    for (const d of dateien) {
      if (/pdf/i.test(d.typ) || /\.pdf$/i.test(d.name)) {
        fortschritt(`${d.name}: Textebene wird gelesen …`, 0);
        const p = await pdfText(d.blob);
        const zeichen = p.seiten.join('').replace(/\s/g, '').length;
        if (zeichen >= 200 * Math.min(p.seiten.length, 3)) { texte.push(p.seiten.join('\n\n')); pdfTextSeiten += p.seiten.length; continue; }
        for (let n = 1; n <= Math.min(p.seitenzahl, MAX_SEITEN); n++) plan.push({ art: 'pdfseite', doc: p.doc, n, name: d.name });
      } else plan.push({ art: 'bild', blob: d.blob, name: d.name });
    }
    gesamt = plan.length;
    for (let i = 0; i < plan.length; i++) {
      const s = plan[i];
      const titel = `Seite ${i + 1} von ${gesamt}`;
      fortschritt(`${titel}: wird vorbereitet …`, i / gesamt);
      const bild = s.art === 'bild' ? await bildLaden(s.blob) : await pdfSeiteAlsBild(s.doc, s.n);
      await arbeiter(t => fortschritt(t, i / gesamt));
      const text = await erkennen(bild, p => fortschritt(`${titel}: Texterkennung ${Math.round(p * 100)} %`, (i + p) / gesamt));
      texte.push(text);
      ocr++;
    }
    fortschritt('Text gelesen', 1);
    return { text: texte.join('\n\n'), art: ocr && pdfTextSeiten ? 'gemischt' : ocr ? 'ocr' : 'pdf-text', seiten: pdfTextSeiten + ocr };
  }

  // im Hintergrund einmal laden (Rechenkern, Sprachdaten) – danach geht die Texterkennung auch ohne Netz
  async function vorbereiten() {
    try { await arbeiter(); return true; } catch { return false; }
  }
  async function beenden() { if (worker) { try { await worker.terminate(); } catch { /* egal */ } worker = null; } }

  // ---------------------------------------------------------------- Warntafel (orange Tafel: oben Gefahrnummer, unten UN-Nummer)
  // Orange Flächen suchen (verkleinert), die beiden größten übereinanderliegenden Felder sind die Hälften der Tafel.
  function orangeFelder(c) {
    const f = Math.min(1, 240 / Math.max(c.width, c.height));
    const w = Math.max(1, Math.round(c.width * f)), h = Math.max(1, Math.round(c.height * f));
    const k = document.createElement('canvas'); k.width = w; k.height = h;
    const x = k.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h);
    const px = x.getImageData(0, 0, w, h).data, maske = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      maske[i] = r > 140 && r - b > 85 && r - g > 25 && g > 45 && g < 205 && b < 120 ? 1 : 0;
    }
    const nr = new Int32Array(w * h), felder = [];
    for (let i = 0; i < w * h; i++) {
      if (!maske[i] || nr[i]) continue;
      const id = felder.length + 1, stapel = [i]; nr[i] = id;
      let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      while (stapel.length) {
        const j = stapel.pop(), jx = j % w, jy = (j - jx) / w; n++;
        if (jx < x0) x0 = jx; if (jx > x1) x1 = jx; if (jy < y0) y0 = jy; if (jy > y1) y1 = jy;
        for (const d of [j - 1, j + 1, j - w, j + w]) if (d >= 0 && d < w * h && maske[d] && !nr[d] && Math.abs((d % w) - jx) <= 1) { nr[d] = id; stapel.push(d); }
      }
      felder.push({ n, x0: x0 / f, y0: y0 / f, x1: (x1 + 1) / f, y1: (y1 + 1) / f });
    }
    const gross = felder.filter(a => a.n > w * h * 0.004).sort((a, b) => b.n - a.n).slice(0, 6);
    if (!gross.length) return null;
    const A = gross[0], bA = A.x1 - A.x0, hA = A.y1 - A.y0;
    // Partner: ähnlich breit, waagrecht überlappend, direkt darüber oder darunter
    const B = gross.slice(1).find(b => { const bb = b.x1 - b.x0, ueber = Math.min(A.x1, b.x1) - Math.max(A.x0, b.x0);
      const abstand = b.y0 >= A.y1 ? b.y0 - A.y1 : A.y0 - b.y1;
      return bb > bA * 0.6 && bb < bA * 1.6 && ueber > Math.min(bA, bb) * 0.6 && abstand > -hA * 0.1 && abstand < hA * 0.6; });
    if (B) { const [o, u] = A.y0 < B.y0 ? [A, B] : [B, A]; return { oben: o, unten: u }; }
    // nur ein Feld (Trennlinie nicht erkannt): in der Mitte teilen
    const mitte = (A.y0 + A.y1) / 2;
    return { oben: { ...A, y1: mitte }, unten: { ...A, y0: mitte } };
  }
  // Ausschnitt → schwarze Ziffern auf weißem Grund, Höhe ca. 120 px, mit Rand
  function ziffernBild(c, r) {
    const rx = Math.max(0, r.x0), ry = Math.max(0, r.y0), rw = Math.min(c.width - rx, r.x1 - r.x0), rh = Math.min(c.height - ry, r.y1 - r.y0);
    const s = Math.min(4, 120 / Math.max(1, rh)), w = Math.max(1, Math.round(rw * s)), h = Math.max(1, Math.round(rh * s)), rand = 30;
    const k = document.createElement('canvas'); k.width = w + 2 * rand; k.height = h + 2 * rand;
    const x = k.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, k.width, k.height);
    x.drawImage(c, rx, ry, rw, rh, rand, rand, w, h);
    const d = x.getImageData(0, 0, k.width, k.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; const v = l < 105 ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = v; }
    x.putImageData(d, 0, 0);
    return k;
  }
  async function warntafel(blob, fortschritt = () => {}) {
    fortschritt('Foto wird vorbereitet …', 0);
    const c = await bildLaden(blob);
    const felder = orangeFelder(c);
    const w = await arbeiter(fortschritt);
    const ziffern = '0123456789X';
    fortschritt('Nummern werden gelesen …', 0.1);
    try {
      if (felder) {
        await w.setParameters({ tessedit_char_whitelist: ziffern, tessedit_pageseg_mode: '7' });
        const oben = (await erkennen(ziffernBild(c, felder.oben))).replace(/[^0-9X]/g, '');
        fortschritt('Nummern werden gelesen …', 0.55);
        const unten = (await erkennen(ziffernBild(c, felder.unten))).replace(/[^0-9X]/g, '');
        const t = window.GSZGefahrgut ? GSZGefahrgut.warntafelText(oben + '\n' + unten) : { kemler: oben, un: unten };
        if (t.un || t.kemler) return { ...t, text: oben + ' / ' + unten, tafel: true };
      }
      // keine Tafel gefunden: ganzes Bild lesen
      await w.setParameters({ tessedit_char_whitelist: ziffern, tessedit_pageseg_mode: '6' });
      const text = await erkennen(c);
      const t = window.GSZGefahrgut ? GSZGefahrgut.warntafelText(text) : { kemler: '', un: (/\d{4}/.exec(text) || [''])[0] };
      return { ...t, text, tafel: false };
    } finally {
      try { await w.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' }); } catch { /* egal */ }
    }
  }

  window.GSZOcr = { textAus, bildVerkleinern, vorbereiten, beenden, pdfText, warntafel, verfuegbar: () => typeof WebAssembly === 'object' };
})();
