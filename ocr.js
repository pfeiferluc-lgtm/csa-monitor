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

  window.GSZOcr = { textAus, bildVerkleinern, vorbereiten, beenden, pdfText, verfuegbar: () => typeof WebAssembly === 'object' };
})();
