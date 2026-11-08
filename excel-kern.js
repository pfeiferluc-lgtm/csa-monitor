// Gemeinsamer Lesekern für das Desktop-Programm (Node) und die Web-App (Browser, iPhone):
// Personaltabelle (.xlsm, auch mit Kennwort zum Öffnen) -> CSA-Träger (Name, Vorname, letzte Übung, fällig bis).
// Verschlüsselung "Agile" (ECMA-376 4.4: AES + SHA-512). Die Rechenfunktionen werden übergeben:
//   krypto.hash(alg, bytes) -> Uint8Array          alg: 'sha512' | 'sha384' | 'sha256' | 'sha1'
//   krypto.aesCbc(bits, schluessel, iv, daten) -> Uint8Array   (ohne Auffüllung, ganze 16-Byte-Blöcke)
// XLSX ist SheetJS (enthält auch den Leser für den OLE-Container, XLSX.CFB).
// Entschlüsselt wird nur im Arbeitsspeicher.
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.ExcelKern = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BLATT = 'CSA-Träger aktiv';
  const KOPFZEILE = 6;            // Überschriften
  const ERSTE_ZEILE = 7;          // erste Person
  const SPALTE_NAME = 2, SPALTE_VORNAME = 3;   // B, C
  const KOPF_LETZTE = 'Letzte Übung', KOPF_FAELLIG = 'Fällig bis';

  // Blockschlüssel aus ECMA-376 (Agile Encryption)
  const BLOCK_PRUEF_EINGABE = new Uint8Array([0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79]);
  const BLOCK_PRUEF_WERT = new Uint8Array([0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e]);
  const BLOCK_SCHLUESSEL = new Uint8Array([0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6]);
  const SEGMENT = 4096;

  class KennwortFehler extends Error {
    constructor(text) { super(text); this.code = 'KENNWORT'; this.name = 'KennwortFehler'; }
  }

  const norm = s => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

  function verbinden(...teile) {
    let n = 0;
    for (const t of teile) n += t.length;
    const z = new Uint8Array(n);
    let i = 0;
    for (const t of teile) { z.set(t, i); i += t.length; }
    return z;
  }
  const gleich = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  function base64(s) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
    const bin = atob(s), z = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) z[i] = bin.charCodeAt(i);
    return z;
  }
  function utf16le(s) {
    const z = new Uint8Array(s.length * 2);
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); z[2 * i] = c & 0xff; z[2 * i + 1] = c >> 8; }
    return z;
  }
  const alsBytes = x => x instanceof Uint8Array ? x : new Uint8Array(x);

  function hashName(alg) {
    const n = String(alg || '').toUpperCase().replace('-', '');
    if (!['SHA1', 'SHA256', 'SHA384', 'SHA512'].includes(n)) throw new Error(`Hash-Verfahren ${alg} wird nicht unterstützt.`);
    return n.toLowerCase();
  }

  function attribut(xml, tag, name) {
    const el = xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>`));
    if (!el) return null;
    const a = el[0].match(new RegExp(`\\s${name}="([^"]*)"`));
    return a ? a[1] : null;
  }

  function strom(XLSX, cfb, name) {
    const e = XLSX.CFB.find(cfb, name);
    return e && e.content ? alsBytes(e.content) : null;
  }

  const istZip = b => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;
  const istVerschluesselt = b => !istZip(b);

  // Verschlüsselte Datei (OLE-Container mit EncryptionInfo und EncryptedPackage) -> entschlüsseltes .xlsm (ZIP)
  function entschluesseln(XLSX, krypto, datei, kennwort) {
    datei = alsBytes(datei);
    let cfb;
    try { cfb = XLSX.CFB.read(datei, { type: 'array' }); } catch (e) { throw new Error('Die Datei ist keine Excel-Datei.'); }
    const info = strom(XLSX, cfb, 'EncryptionInfo'), paket = strom(XLSX, cfb, 'EncryptedPackage');
    if (!info || !paket) throw new Error('Die Datei ist weder eine normale noch eine verschlüsselte Excel-Datei.');
    const dvI = new DataView(info.buffer, info.byteOffset, info.byteLength);
    const haupt = dvI.getUint16(0, true), neben = dvI.getUint16(2, true);
    if (haupt !== 4 || neben !== 4) throw new Error(`Diese Excel-Verschlüsselung (${haupt}.${neben}) wird nicht unterstützt.`);
    const xml = new TextDecoder('utf-8').decode(info.subarray(8));
    const hash = (alg, ...teile) => alsBytes(krypto.hash(alg, verbinden(...teile)));
    const aes = (bits, k, iv, d) => alsBytes(krypto.aesCbc(bits, k, iv, d.subarray(0, d.length - (d.length % 16))));

    // Schlüssel aus dem Kennwort (encryptedKey)
    const kAlg = hashName(attribut(xml, 'encryptedKey', 'hashAlgorithm'));
    const kSalz = base64(attribut(xml, 'encryptedKey', 'saltValue'));
    const kBits = Number(attribut(xml, 'encryptedKey', 'keyBits'));
    const kHash = Number(attribut(xml, 'encryptedKey', 'hashSize'));
    const runden = Number(attribut(xml, 'encryptedKey', 'spinCount'));
    let h = hash(kAlg, kSalz, utf16le(String(kennwort)));
    const zaehler = new Uint8Array(4), dvZ = new DataView(zaehler.buffer);
    for (let i = 0; i < runden; i++) { dvZ.setUint32(0, i, true); h = hash(kAlg, zaehler, h); }
    const ableiten = block => {
      const k = hash(kAlg, h, block), n = kBits / 8;
      if (k.length >= n) return k.subarray(0, n);
      const z = new Uint8Array(n).fill(0x36); z.set(k); return z;
    };
    const eingabe = aes(kBits, ableiten(BLOCK_PRUEF_EINGABE), kSalz,
      base64(attribut(xml, 'encryptedKey', 'encryptedVerifierHashInput'))).subarray(0, kSalz.length);
    const wert = aes(kBits, ableiten(BLOCK_PRUEF_WERT), kSalz,
      base64(attribut(xml, 'encryptedKey', 'encryptedVerifierHashValue'))).subarray(0, kHash);
    if (!gleich(hash(kAlg, eingabe), wert)) throw new KennwortFehler('Das Kennwort ist falsch.');
    const schluessel = aes(kBits, ableiten(BLOCK_SCHLUESSEL), kSalz,
      base64(attribut(xml, 'encryptedKey', 'encryptedKeyValue'))).subarray(0, kBits / 8);

    // Inhalt (keyData): Abschnitte zu 4096 Byte, IV je Abschnitt aus Salz und Abschnittsnummer
    const dAlg = hashName(attribut(xml, 'keyData', 'hashAlgorithm'));
    const dSalz = base64(attribut(xml, 'keyData', 'saltValue'));
    const dBlock = Number(attribut(xml, 'keyData', 'blockSize'));
    const dBits = Number(attribut(xml, 'keyData', 'keyBits'));
    const dvP = new DataView(paket.buffer, paket.byteOffset, paket.byteLength);
    const groesse = dvP.getUint32(4, true) * 4294967296 + dvP.getUint32(0, true);
    const roh = paket.subarray(8), teile = [], nr = new Uint8Array(4), dvN = new DataView(nr.buffer);
    for (let i = 0, ab = 0; ab < roh.length; i++, ab += SEGMENT) {
      dvN.setUint32(0, i, true);
      const iv = hash(dAlg, dSalz, nr).subarray(0, dBlock);
      teile.push(aes(dBits, schluessel, iv, roh.subarray(ab, Math.min(ab + SEGMENT, roh.length))));
    }
    const zip = verbinden(...teile).subarray(0, groesse);
    if (!istZip(zip)) throw new Error('Entschlüsseln ergab keine Excel-Datei.');
    return zip;
  }

  const p2 = n => String(n).padStart(2, '0');
  function datum(XLSX, zelle, d1904) {
    if (!zelle || zelle.v === undefined || zelle.v === null || zelle.v === '') return null;
    if (zelle.t === 'n') {
      const d = XLSX.SSF.parse_date_code(zelle.v, { date1904: d1904 });
      return d && d.y > 1900 ? `${d.y}-${p2(d.m)}-${p2(d.d)}` : null;
    }
    if (zelle.v instanceof Date) return `${zelle.v.getFullYear()}-${p2(zelle.v.getMonth() + 1)}-${p2(zelle.v.getDate())}`;
    const m = String(zelle.v).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    return m ? `${m[3]}-${p2(m[2])}-${p2(m[1])}` : null;
  }

  // Datei (verschlüsselt oder nicht) -> Liste der CSA-Träger
  function csaTraeger(XLSX, krypto, datei, kennwort) {
    datei = alsBytes(datei);
    let zip = datei;
    if (istVerschluesselt(datei)) {
      if (kennwort === null || kennwort === undefined || kennwort === '') throw new KennwortFehler('Die Datei hat ein Kennwort.');
      zip = entschluesseln(XLSX, krypto, datei, kennwort);
    }
    const wb = XLSX.read(zip, { type: 'array', bookVBA: false, cellFormula: false, cellHTML: false, cellStyles: false });
    const blattName = wb.SheetNames.find(n => norm(n) === norm(BLATT));
    if (!blattName) throw new Error(`Das Blatt „${BLATT}“ fehlt in der Excel-Datei.`);
    const ws = wb.Sheets[blattName];
    const d1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    const zelle = (r, c) => ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
    const bereich = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const spalten = {};
    for (let c = 1; c <= bereich.e.c + 1; c++) {
      const z = zelle(KOPFZEILE, c);
      if (z && z.v !== undefined && z.v !== null && !(norm(z.v) in spalten)) spalten[norm(z.v)] = c;
    }
    const cL = spalten[norm(KOPF_LETZTE)], cF = spalten[norm(KOPF_FAELLIG)];
    if (!cL || !cF) throw new Error(`Die Spalten „${KOPF_LETZTE}“ und „${KOPF_FAELLIG}“ fehlen in „${BLATT}“.`);
    const leute = [];
    for (let r = ERSTE_ZEILE; r <= bereich.e.r + 1; r++) {
      const n = zelle(r, SPALTE_NAME);
      if (!n || norm(n.v) === '') break;
      const v = zelle(r, SPALTE_VORNAME);
      leute.push({ name: norm(n.v), vorname: norm(v && v.v),
                   letzte: datum(XLSX, zelle(r, cL), d1904), faellig: datum(XLSX, zelle(r, cF), d1904) });
    }
    return leute;
  }

  return { BLATT, KennwortFehler, entschluesseln, csaTraeger, istVerschluesselt };
});
