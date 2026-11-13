// Gemeinsamer Kern für das Desktop-Programm (Node) und die Web-App (Browser, iPhone):
//   Personaltabelle (.xlsm, auch mit Kennwort zum Öffnen) lesen:
//     - CSA-Träger (Name, Vorname, letzte Übung, fällig bis) aus „CSA-Träger aktiv“
//     - Übungsanwesenheit (Personen, Übungen, wer war da) aus „Übungsanwesenheit 2026“, „… 2027“ usw. (ein Reiter je
//       Jahr seit 14.11.2026, zusammengeführt) bzw. aus „Übungsanwesenheit“ (ältere Mappen)
//     - Übertragungsschlüssel (Name GSZ_Uebertragung), mit dem die App ihre Meldungen verschlüsselt
//   Meldungen der App (Anwesenheit einer Übung) als kleine, verschlüsselte .xlsx schreiben und lesen. Excel öffnet sie
//   mit dem Übertragungsschlüssel als Kennwort und übernimmt sie (Modul Anwesenheit_Makros der Personaltabelle).
// Verschlüsselung "Agile" (ECMA-376 4.4: AES-256 + SHA-512, wie Excel selbst). Die Rechenfunktionen werden übergeben:
//   krypto.hash(alg, bytes) -> Uint8Array          alg: 'sha512' | 'sha384' | 'sha256' | 'sha1'
//   krypto.aesCbc(bits, schluessel, iv, daten) -> Uint8Array      entschlüsseln (ohne Auffüllung, ganze 16-Byte-Blöcke)
//   krypto.aesCbcVer(bits, schluessel, iv, daten) -> Uint8Array   verschlüsseln (nur zum Schreiben von Meldungen)
//   krypto.zufall(n) -> Uint8Array                                 sichere Zufallszahlen (nur zum Schreiben)
// XLSX ist SheetJS (enthält auch den OLE-Container, XLSX.CFB).
// Entschlüsselt wird nur im Arbeitsspeicher.
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.ExcelKern = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BLATT = 'CSA-Träger aktiv';
  const BLATT_ANW = 'Übungsanwesenheit';
  const BLATT_PERSONAL = 'Personal aktiv';
  const NAME_SCHLUESSEL = 'GSZ_Uebertragung';    // Übertragungsschlüssel (verborgener Name in der Mappe)
  const ORDNER_MELDUNGEN = 'Anwesenheit';         // Unterordner im App-Ordner der Dropbox
  const MELDUNG_KENNUNG = 'GSZ-Anwesenheit';
  const MELDUNG_RUNDEN = 1000;  // Schlüssel ist zufällig (128 Bit) – viele Runden wie bei Kennwörtern sind unnötig
  const KOPFZEILE = 6;            // Überschriften
  const THEMA_ZEILE = 5;          // Übungsanwesenheit: Thema über dem Datum
  const ERSTE_ZEILE = 7;          // erste Person
  const SPALTE_NAME = 2, SPALTE_VORNAME = 3;   // B, C
  const KOPF_LETZTE = 'Letzte Übung', KOPF_FAELLIG = 'Fällig bis';

  // Blockschlüssel aus ECMA-376 (Agile Encryption)
  const BLOCK_PRUEF_EINGABE = new Uint8Array([0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79]);
  const BLOCK_PRUEF_WERT = new Uint8Array([0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e]);
  const BLOCK_SCHLUESSEL = new Uint8Array([0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6]);
  const BLOCK_HMAC_SCHLUESSEL = new Uint8Array([0x5f, 0xb2, 0xad, 0x01, 0x0c, 0xb9, 0xe1, 0xf6]);
  const BLOCK_HMAC_WERT = new Uint8Array([0xa0, 0x67, 0x7f, 0x02, 0xb2, 0x2c, 0x84, 0x33]);
  const SEGMENT = 4096;
  // Feste Ströme im Ordner "\x06DataSpaces" einer verschlüsselten Datei (genau so, wie Excel sie schreibt)
  const DATASPACES = {
    'Version': '3c0000004d006900630072006f0073006f00660074002e0043006f006e007400610069006e00650072002e004400610074006100530070006100630065007300010000000100000001000000',
    'DataSpaceMap': '08000000010000006800000001000000000000002000000045006e0063007200790070007400650064005000610063006b00610067006500320000005300740072006f006e00670045006e006300720079007000740069006f006e004400610074006100530070006100630065000000',
    'DataSpaceInfo/StrongEncryptionDataSpace': '0800000001000000320000005300740072006f006e00670045006e006300720079007000740069006f006e005400720061006e00730066006f0072006d000000',
    'TransformInfo/StrongEncryptionTransform/\u0006Primary': '58000000010000004c0000007b00460046003900410033004600300033002d0035003600450046002d0034003600310033002d0042004400440035002d003500410034003100430031004400300037003200340036007d004e0000004d006900630072006f0073006f00660074002e0043006f006e007400610069006e00650072002e0045006e006300720079007000740069006f006e005400720061006e00730066006f0072006d00000001000000010000000100000000000000000000000000000004000000',
  };

  class KennwortFehler extends Error {
    constructor(text) { super(text); this.code = 'KENNWORT'; this.name = 'KennwortFehler'; }
  }

  const norm = s => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const kopfNorm = s => norm(s).replace(/­/g, '').toLowerCase();

  // Vergleichsschlüssel für Namen wie in Excel (Basis_Makros.Schluessel): Groß/klein, ß/ss, Umlaute, Leerzeichen egal
  function schluessel(nachname, vorname) {
    return (norm(nachname).toLowerCase() + '|' + norm(vorname).toLowerCase())
      .replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ /g, '');
  }

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
  function alsBase64(b) {
    if (typeof Buffer !== 'undefined') return Buffer.from(b).toString('base64');
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function utf16le(s) {
    const z = new Uint8Array(s.length * 2);
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); z[2 * i] = c & 0xff; z[2 * i + 1] = c >> 8; }
    return z;
  }
  const utf8 = s => new TextEncoder().encode(s);
  const hexBytes = h => { const z = new Uint8Array(h.length / 2); for (let i = 0; i < z.length; i++) z[i] = parseInt(h.substr(2 * i, 2), 16); return z; };
  const alsBytes = x => x instanceof Uint8Array ? x : new Uint8Array(x);
  const le32 = n => { const z = new Uint8Array(4); new DataView(z.buffer).setUint32(0, n >>> 0, true); return z; };

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

  // HMAC mit SHA-512 (Blockgröße 128 Byte) aus der übergebenen Hash-Funktion
  function hmac512(hash, schl, daten) {
    let k = schl.length > 128 ? hash('sha512', schl) : schl;
    const innen = new Uint8Array(128), aussen = new Uint8Array(128);
    for (let i = 0; i < 128; i++) { const b = i < k.length ? k[i] : 0; innen[i] = b ^ 0x36; aussen[i] = b ^ 0x5c; }
    return hash('sha512', aussen, hash('sha512', innen, daten));
  }

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
    const schluesselWert = aes(kBits, ableiten(BLOCK_SCHLUESSEL), kSalz,
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
      teile.push(aes(dBits, schluesselWert, iv, roh.subarray(ab, Math.min(ab + SEGMENT, roh.length))));
    }
    const zip = verbinden(...teile).subarray(0, groesse);
    if (!istZip(zip)) throw new Error('Entschlüsseln ergab keine Excel-Datei.');
    return zip;
  }

  // Excel-Datei (ZIP) mit Kennwort verschlüsseln – genau wie Excel (AES-256, SHA-512, Datenintegrität per HMAC),
  // damit Excel sie mit dem Kennwort öffnet. Ergebnis: OLE-Container als Uint8Array.
  function verschluesseln(XLSX, krypto, zip, kennwort, runden = 100000) {
    zip = alsBytes(zip);
    if (!krypto.aesCbcVer || !krypto.zufall) throw new Error('Verschlüsseln ist hier nicht möglich.');
    const hash = (alg, ...teile) => alsBytes(krypto.hash(alg, verbinden(...teile)));
    const aesV = (k, iv, d) => alsBytes(krypto.aesCbcVer(256, k, iv, d));
    const zufall = n => alsBytes(krypto.zufall(n));
    const kSalz = zufall(16), dSalz = zufall(16), inhaltSchluessel = zufall(32), pruef = zufall(16), hmacSchl = zufall(64);

    let h = hash('sha512', kSalz, utf16le(String(kennwort)));
    for (let i = 0; i < runden; i++) h = hash('sha512', le32(i), h);
    const ableiten = block => hash('sha512', h, block).subarray(0, 32);
    const vEingabe = aesV(ableiten(BLOCK_PRUEF_EINGABE), kSalz, pruef);
    const vWert = aesV(ableiten(BLOCK_PRUEF_WERT), kSalz, hash('sha512', pruef));
    const vSchluessel = aesV(ableiten(BLOCK_SCHLUESSEL), kSalz, inhaltSchluessel);

    const groesse = new Uint8Array(8), dv = new DataView(groesse.buffer);
    dv.setUint32(0, zip.length % 4294967296, true);
    dv.setUint32(4, Math.floor(zip.length / 4294967296), true);
    const teile = [groesse];
    for (let i = 0, ab = 0; ab < zip.length; i++, ab += SEGMENT) {
      let seg = zip.subarray(ab, Math.min(ab + SEGMENT, zip.length));
      if (seg.length % 16) { const p = new Uint8Array(seg.length + 16 - (seg.length % 16)); p.set(seg); seg = p; }
      teile.push(aesV(inhaltSchluessel, hash('sha512', dSalz, le32(i)).subarray(0, 16), seg));
    }
    const paket = verbinden(...teile);
    const hmacSchlVer = aesV(inhaltSchluessel, hash('sha512', dSalz, BLOCK_HMAC_SCHLUESSEL).subarray(0, 16), hmacSchl);
    const hmacWertVer = aesV(inhaltSchluessel, hash('sha512', dSalz, BLOCK_HMAC_WERT).subarray(0, 16), hmac512(hash, hmacSchl, paket));

    const alg = 'saltSize="16" blockSize="16" keyBits="256" hashSize="64" cipherAlgorithm="AES" cipherChaining="ChainingModeCBC" hashAlgorithm="SHA512"';
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<encryption xmlns="http://schemas.microsoft.com/office/2006/encryption" xmlns:p="http://schemas.microsoft.com/office/2006/keyEncryptor/password" xmlns:c="http://schemas.microsoft.com/office/2006/keyEncryptor/certificate">' +
      `<keyData ${alg} saltValue="${alsBase64(dSalz)}"/>` +
      `<dataIntegrity encryptedHmacKey="${alsBase64(hmacSchlVer)}" encryptedHmacValue="${alsBase64(hmacWertVer)}"/>` +
      '<keyEncryptors><keyEncryptor uri="http://schemas.microsoft.com/office/2006/keyEncryptor/password">' +
      `<p:encryptedKey spinCount="${runden}" ${alg} saltValue="${alsBase64(kSalz)}" encryptedVerifierHashInput="${alsBase64(vEingabe)}" ` +
      `encryptedVerifierHashValue="${alsBase64(vWert)}" encryptedKeyValue="${alsBase64(vSchluessel)}"/>` +
      '</keyEncryptor></keyEncryptors></encryption>';
    const info = verbinden(new Uint8Array([4, 0, 4, 0, 0x40, 0, 0, 0]), utf8(xml));

    const cfb = XLSX.CFB.utils.cfb_new();
    for (const [name, hex] of Object.entries(DATASPACES)) XLSX.CFB.utils.cfb_add(cfb, '\u0006DataSpaces/' + name, hexBytes(hex));
    XLSX.CFB.utils.cfb_add(cfb, 'EncryptionInfo', info);
    XLSX.CFB.utils.cfb_add(cfb, 'EncryptedPackage', paket);
    // SheetJS legt zusätzlich einen kleinen Platzhalter-Strom an; Excel übergeht ihn.
    return alsBytes(XLSX.CFB.write(cfb, { type: 'array', fileType: 'cfb' }));
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
  // ISO-Datum + n Monate wie Excel EDATE (31.01. + 1 Monat = 28./29.02.)
  function monateDazu(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const z = new Date(Date.UTC(y, m - 1 + n, 1));
    const letzter = new Date(Date.UTC(z.getUTCFullYear(), z.getUTCMonth() + 1, 0)).getUTCDate();
    return `${z.getUTCFullYear()}-${p2(z.getUTCMonth() + 1)}-${p2(Math.min(d, letzter))}`;
  }

  // Datei (verschlüsselt oder nicht) -> SheetJS-Arbeitsmappe
  function mappeLesen(XLSX, krypto, datei, kennwort) {
    datei = alsBytes(datei);
    let zip = datei;
    if (istVerschluesselt(datei)) {
      if (kennwort === null || kennwort === undefined || kennwort === '') throw new KennwortFehler('Die Datei hat ein Kennwort.');
      zip = entschluesseln(XLSX, krypto, datei, kennwort);
    }
    return XLSX.read(zip, { type: 'array', bookVBA: false, cellFormula: false, cellHTML: false, cellStyles: false });
  }

  function blattZugriff(XLSX, wb, name) {
    const blattName = wb.SheetNames.find(n => norm(n) === norm(name));
    if (!blattName) return null;
    const ws = wb.Sheets[blattName];
    const zelle = (r, c) => ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
    const bereich = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const text = (r, c) => { const z = zelle(r, c); return z && z.v !== undefined && z.v !== null ? norm(z.v) : ''; };
    return { ws, zelle, text, zeilen: bereich.e.r + 1, spalten: bereich.e.c + 1 };
  }

  function csaAusMappe(XLSX, wb) {
    const b = blattZugriff(XLSX, wb, BLATT);
    if (!b) throw new Error(`Das Blatt „${BLATT}“ fehlt in der Excel-Datei.`);
    const d1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    const spalten = {};
    for (let c = 1; c <= b.spalten; c++) {
      const z = b.zelle(KOPFZEILE, c);
      if (z && z.v !== undefined && z.v !== null && !(norm(z.v) in spalten)) spalten[norm(z.v)] = c;
    }
    const cL = spalten[norm(KOPF_LETZTE)], cF = spalten[norm(KOPF_FAELLIG)];
    if (!cL || !cF) throw new Error(`Die Spalten „${KOPF_LETZTE}“ und „${KOPF_FAELLIG}“ fehlen in „${BLATT}“.`);
    const leute = [];
    for (let r = ERSTE_ZEILE; r <= b.zeilen; r++) {
      const n = b.text(r, SPALTE_NAME);
      if (n === '') break;
      leute.push({ name: n, vorname: b.text(r, SPALTE_VORNAME),
                   letzte: datum(XLSX, b.zelle(r, cL), d1904), faellig: datum(XLSX, b.zelle(r, cF), d1904) });
    }
    return leute;
  }

  // Reiter der Übungsanwesenheit: einer je Jahr („Übungsanwesenheit 2026“ …), in älteren Mappen einer ohne Jahr.
  // Ergebnis nach Jahr sortiert: [{ name, jahr }] (jahr 0 = Reiter ohne Jahr)
  function anwesenheitsBlaetter(wb) {
    const basis = norm(BLATT_ANW);
    return wb.SheetNames.map(name => {
      const n = norm(name);
      if (n === basis) return { name, jahr: 0 };
      const m = n.startsWith(basis + ' ') ? /^(\d{4})$/.exec(n.slice(basis.length + 1)) : null;
      return m ? { name, jahr: Number(m[1]) } : null;
    }).filter(Boolean).sort((a, b) => a.jahr - b.jahr);
  }

  // Übungsanwesenheit: Personen (Zeilen) und Übungen (Spalten mit Datum in Zeile 6, Thema in Zeile 5) aller Jahresreiter.
  // Personen werden über den Namen zusammengeführt: „seit“ aus dem frühesten Reiter, in dem sie stehen, „bis“ aus dem
  // jüngsten – so gilt die Mitgliedschaft über die Jahre hinweg. Fehlt der Reiter, kommen die Namen aus „Personal aktiv“
  // (eingerichtet = false).
  function anwesenheitAusMappe(XLSX, wb, leute) {
    const d1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    const csa = new Map(leute.map(p => [schluessel(p.name, p.vorname), p]));
    const person = (name, vorname, extra = {}) => {
      const k = schluessel(name, vorname), c = csa.get(k);
      return { name, vorname, schluessel: k, csa: !!c, csaLetzte: c ? c.letzte : null, csaFaellig: c ? c.faellig : null,
               seit: null, bis: null, ...extra };
    };
    const blaetter = anwesenheitsBlaetter(wb);
    if (!blaetter.length) {
      const p = blattZugriff(XLSX, wb, BLATT_PERSONAL), personen = [];
      if (p) for (let r = ERSTE_ZEILE; r <= p.zeilen; r++) {
        const n = p.text(r, SPALTE_NAME);
        if (n === '') break;
        personen.push(person(n, p.text(r, SPALTE_VORNAME)));
      }
      if (!personen.length) for (const l of leute) personen.push(person(l.name, l.vorname));
      return { eingerichtet: false, personen, uebungen: [] };
    }
    const personen = new Map(), uebungen = [];
    for (const { name: blattName } of blaetter) {
      const b = blattZugriff(XLSX, wb, blattName);
      if (!b) continue;
      // Spalten der Personenangaben über die Überschrift, Übungen = Spalten mit einem Datum in der Kopfzeile
      const kopf = {}, uebSpalten = [];
      for (let c = 1; c <= b.spalten; c++) {
        const z = b.zelle(KOPFZEILE, c);
        if (!z || z.v === undefined || z.v === null || z.v === '') continue;
        if (z.t === 'n' && z.v > 36000 && z.v < 80000 && c > SPALTE_VORNAME) uebSpalten.push(c);
        else { const k = kopfNorm(z.v); if (!(k in kopf)) kopf[k] = c; }
      }
      const cCSA = kopf.csa, cSeit = kopf['mitglied seit'] || kopf.seit, cBis = kopf.bis;
      const zeilen = [];
      for (let r = ERSTE_ZEILE; r <= b.zeilen; r++) {
        const n = b.text(r, SPALTE_NAME);
        if (n === '') break;
        const p = person(n, b.text(r, SPALTE_VORNAME), {
          seit: cSeit ? datum(XLSX, b.zelle(r, cSeit), d1904) : null, bis: cBis ? datum(XLSX, b.zelle(r, cBis), d1904) : null });
        if (!p.csa && cCSA && /csa/i.test(b.text(r, cCSA))) p.csa = true;
        const alt = personen.get(p.schluessel);
        if (!alt) personen.set(p.schluessel, p);
        else { alt.bis = p.bis; if (p.csa) alt.csa = true; }      // „seit“ bleibt aus dem früheren Jahr
        zeilen.push([r, p.schluessel]);
      }
      for (const c of uebSpalten) {
        const marken = {};
        for (const [r, k] of zeilen) {
          const w = b.text(r, c).toUpperCase();
          if (w === 'X' || w === 'B') marken[k] = w;
        }
        uebungen.push({ datum: datum(XLSX, b.zelle(KOPFZEILE, c), d1904), thema: b.text(THEMA_ZEILE, c), marken });
      }
    }
    return { eingerichtet: true, personen: [...personen.values()],
             uebungen: uebungen.filter(u => u.datum).sort((a, b2) => a.datum.localeCompare(b2.datum)) };
  }

  // Übertragungsschlüssel aus dem verborgenen Namen GSZ_Uebertragung (leer = noch nicht eingerichtet)
  function schluesselAusMappe(wb) {
    const namen = (wb.Workbook && wb.Workbook.Names) || [];
    const n = namen.find(x => x && x.Name === NAME_SCHLUESSEL && (x.Sheet === undefined || x.Sheet === null));
    if (!n || !n.Ref) return '';
    return String(n.Ref).replace(/^=/, '').replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim();
  }

  // Datei (verschlüsselt oder nicht) -> Liste der CSA-Träger (wie bisher)
  function csaTraeger(XLSX, krypto, datei, kennwort) {
    return csaAusMappe(XLSX, mappeLesen(XLSX, krypto, datei, kennwort));
  }

  // Datei -> { leute, anwesenheit, schluessel }
  function lesen(XLSX, krypto, datei, kennwort) {
    const wb = mappeLesen(XLSX, krypto, datei, kennwort);
    const leute = csaAusMappe(XLSX, wb);
    return { leute, anwesenheit: anwesenheitAusMappe(XLSX, wb, leute), schluessel: schluesselAusMappe(wb) };
  }

  // ---------------------------------------------------------------- Meldungen der App
  // meldung = { kennung, stand, geraet, datum, thema, eintraege: [{ name, vorname, wert: 'X'|'B'|'', zeit }] }
  //   kennung: eine Erfassung (gleiche Kennung = gleiche Datei, neuere Fassung ersetzt die ältere)
  //   wert:    X = anwesend, B = anwesend mit Belastungsübung, leer = nicht (mehr) anwesend
  //   thema:   nur gefüllt, wenn es in der App eingegeben oder geändert wurde
  const meldungDatei = m => `${m.datum}_${String(m.kennung).replace(/[^A-Za-z0-9-]/g, '')}.xlsx`;
  const istMeldungDatei = n => /^\d{4}-\d{2}-\d{2}_[A-Za-z0-9-]+\.xlsx$/.test(n);

  function meldungPruefen(m) {
    if (!m || !/^[A-Za-z0-9-]{6,40}$/.test(String(m.kennung || ''))) throw new Error('Meldung ohne gültige Kennung.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(m.datum || ''))) throw new Error('Meldung ohne gültiges Übungsdatum.');
    if (!Array.isArray(m.eintraege)) throw new Error('Meldung ohne Einträge.');
    for (const e of m.eintraege) {
      if (!norm(e.name)) throw new Error('Eintrag ohne Namen.');
      if (!['X', 'B', ''].includes(String(e.wert ?? ''))) throw new Error(`Unbekannter Eintrag „${e.wert}“.`);
    }
  }

  function meldungErstellen(XLSX, krypto, m, schl) {
    meldungPruefen(m);
    if (!schl) throw new Error('Die Personaltabelle hat noch keinen Übertragungsschlüssel (Reiter „Übungsanwesenheit“ einrichten).');
    const zeilen = [
      [MELDUNG_KENNUNG, '1'], ['Kennung', String(m.kennung)], ['Stand', String(m.stand || '')], ['Gerät', String(m.geraet || '')],
      ['Übung', String(m.datum)], ['Thema', norm(m.thema)], [],
      ['Name', 'Vorname', 'Eintrag', 'Zeit'],
      ...m.eintraege.map(e => [norm(e.name), norm(e.vorname), String(e.wert || ''), String(e.zeit || '')]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(zeilen.map(z => z.map(String)));
    ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 8 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Meldung');
    const zip = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
    return verschluesseln(XLSX, krypto, zip, schl, MELDUNG_RUNDEN);
  }

  function meldungLesen(XLSX, krypto, datei, schl) {
    const wb = mappeLesen(XLSX, krypto, datei, schl);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const z = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).map(r => r.map(norm));
    if (!z[0] || z[0][0] !== MELDUNG_KENNUNG) throw new Error('Die Datei ist keine Anwesenheitsmeldung.');
    const wert = titel => { const r = z.find(x => x[0] === titel); return r ? r[1] : ''; };
    const m = { kennung: wert('Kennung'), stand: wert('Stand'), geraet: wert('Gerät'), datum: wert('Übung'), thema: wert('Thema'), eintraege: [] };
    const ab = z.findIndex(x => x[0] === 'Name' && x[1] === 'Vorname');
    if (ab >= 0) for (const r of z.slice(ab + 1)) if (r[0]) m.eintraege.push({ name: r[0], vorname: r[1] || '', wert: (r[2] || '').toUpperCase(), zeit: r[3] || '' });
    meldungPruefen(m);
    return m;
  }

  // ---------------------------------------------------------------- noch nicht übernommene Meldungen einrechnen
  // Ergebnis: Kopie von daten, in der die Meldungen (nach Zeit) auf die Übungen angewendet sind; Übungen mit offenen
  // Meldungen haben ausstehend = true. Neue Belastungsübungen zählen im CSA-Monitor vorläufig (vorlaeufig = true).
  function uebungFinden(uebungen, datumIso, thema) {
    const gleicheTage = uebungen.filter(u => u.datum === datumIso);
    if (gleicheTage.length <= 1 || !thema) return gleicheTage[0] || null;
    return gleicheTage.find(u => norm(u.thema).toLowerCase() === norm(thema).toLowerCase()) || gleicheTage[0];
  }

  function zusammenfuehren(daten, meldungen) {
    const quelle = daten.anwesenheit || { eingerichtet: false, personen: [], uebungen: [] };
    const anw = { ...quelle, personen: quelle.personen.map(p => ({ ...p })),
                  uebungen: quelle.uebungen.map(u => ({ ...u, marken: { ...u.marken } })) };
    const bekannt = new Set(anw.personen.map(p => p.schluessel));
    const liste = [];
    for (const m of meldungen || []) for (const e of m.eintraege) liste.push({ m, e });
    liste.sort((a, b) => (a.e.zeit || a.m.stand || '').localeCompare(b.e.zeit || b.m.stand || ''));
    const themen = [...(meldungen || [])].sort((a, b) => String(a.stand).localeCompare(String(b.stand)));
    for (const m of themen) {
      let u = uebungFinden(anw.uebungen, m.datum, m.thema);
      if (!u) { u = { datum: m.datum, thema: '', marken: {}, neu: true }; anw.uebungen.push(u); }
      if (m.thema) u.thema = m.thema;
      u.ausstehend = true;
    }
    for (const { m, e } of liste) {
      const u = uebungFinden(anw.uebungen, m.datum, m.thema);
      const k = schluessel(e.name, e.vorname);
      if (!bekannt.has(k)) {
        anw.personen.push({ name: norm(e.name), vorname: norm(e.vorname), schluessel: k, csa: false, seit: null, bis: null, fremd: true });
        bekannt.add(k);
      }
      if (e.wert) u.marken[k] = e.wert; else delete u.marken[k];
    }
    anw.uebungen.sort((a, b) => a.datum.localeCompare(b.datum));
    const leute = (daten.leute || []).map(p => {
      const k = schluessel(p.name, p.vorname);
      let neu = null;
      for (const u of anw.uebungen) if (u.ausstehend && u.marken[k] === 'B' && (!neu || u.datum > neu)) neu = u.datum;
      return neu && (!p.letzte || neu > p.letzte) ? { ...p, letzte: neu, faellig: monateDazu(neu, 12), vorlaeufig: true } : { ...p };
    });
    return { ...daten, leute, anwesenheit: anw, ausstehend: (meldungen || []).length };
  }

  return { BLATT, BLATT_ANW, NAME_SCHLUESSEL, ORDNER_MELDUNGEN, KennwortFehler, entschluesseln, verschluesseln, csaTraeger,
           lesen, istVerschluesselt, schluessel, meldungDatei, istMeldungDatei, meldungErstellen, meldungLesen,
           zusammenfuehren, monateDazu };
});
