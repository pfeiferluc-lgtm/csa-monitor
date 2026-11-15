// Web-App „Gefahrstoffzug TE Miehlen“ (iPhone, iPad, jeder Browser; früher CSA-Monitor): Hauptmenü mit Einsatz (einsatz.js)
// und Übungen (CSA-Monitor, Übungsanwesenheit). Einsatz-Ordner und Aufträge (Datenblatt auswerten) kommen aus dem Ordner
// „Einsatz“ bzw. „Auswertung“ des Dropbox-App-Ordners; die Dateien hält die App für den Betrieb ohne Netz auf dem Gerät.
// Die Personaltabelle wird erst geladen bzw. ihr Kennwort erst erfragt, wenn eine Übungen-Ansicht sie braucht.
// Holt die Personaltabelle über die Dropbox-Schnittstelle, entschlüsselt sie nur auf diesem Gerät (excel-kern.js) und
// setzt die Daten in die Seite (monitor.html + oberflaeche.js).
// Anmeldung bei Dropbox mit PKCE und Code zum Einfügen (kein Server, keine Weiterleitung nötig).
// Die Dropbox-App hat nur Zugriff auf ihren eigenen App-Ordner (Dropbox/Apps/CSA-Monitor …); dort legt Excel nach jedem
// Speichern eine verschlüsselte Kopie der Personaltabelle ab (Modul Web_Makros). Pfade sind relativ zu diesem Ordner.
// Übungsanwesenheit: Jede Erfassung wird verschlüsselt (Übertragungsschlüssel aus der Personaltabelle) als kleine Datei
// in den Unterordner „Anwesenheit“ hochgeladen (Schreibrecht nur dort, wo die App ohnehin hinkommt); Excel übernimmt
// sie beim Öffnen der Personaltabelle. Noch nicht übernommene Meldungen liest die Web-App mit ein.
// Einstellungen und Anmeldung liegen im Speicher dieser Web-App auf dem Gerät.
'use strict';
(() => {
  const K = window.CSA_KONFIG || {};
  const MINUTE = 60 * 1000;
  const SP = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* privat */ } },
  };
  const appKey = () => K.appKey || SP.get('csa-dbx-appkey') || '';
  const pfad = () => SP.get('csa-pfad') || K.pfad || '';

  // ---------------------------------------------------------------- Rechenfunktionen für den Lesekern
  const krypto = {
    hash(alg, bytes) {
      const f = alg === 'sha512' ? window.sha512 : alg === 'sha384' ? window.sha384 : null;
      if (!f) throw new Error(`Hash-Verfahren ${alg} wird in der Web-App nicht unterstützt.`);
      return new Uint8Array(f.arrayBuffer(bytes));
    },
    aesCbc: (bits, schluessel, iv, daten) => new window.aesjs.ModeOfOperation.cbc(schluessel, iv).decrypt(daten),
    aesCbcVer: (bits, schluessel, iv, daten) => new window.aesjs.ModeOfOperation.cbc(schluessel, iv).encrypt(daten),
    zufall: n => crypto.getRandomValues(new Uint8Array(n)),
  };
  // Rechte: Die Anmeldung fragt keine einzelnen Rechte an, sondern alle, die in der Dropbox-App unter „Permissions“
  // angehakt sind (files.metadata.read, files.content.read und für die Übungsanwesenheit files.content.write).
  // Würde der Link ein Recht verlangen, das dort fehlt, lehnte Dropbox die ganze Anmeldung ab. Ob Schreiben erlaubt
  // ist, steht danach in der Antwort von Dropbox (scope) – fehlt es, erklärt die App, was zu tun ist.
  const ORDNER = '/' + window.ExcelKern.ORDNER_MELDUNGEN;

  // ---------------------------------------------------------------- Dropbox
  const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const kopfJson = o => JSON.stringify(o).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  let zugang = null, zugangBis = 0;

  // Anmeldelink zu Dropbox. Er wird vorab als echter Link vorbereitet: Ein Fenster, das erst nach einer Berechnung
  // geöffnet wird, blockiert Safari (iPhone) stillschweigend. Der Prüfschlüssel (PKCE) bleibt gespeichert, bis die
  // Verbindung steht – so passt der Code auch dann, wenn die App beim Zurückwechseln neu geladen wurde.
  async function anmeldeLinkVorbereiten() {
    const a = $a('a-anmelden'), key = appKey();
    if (!key) { a.removeAttribute('href'); a.classList.add('aus'); return; }
    let verifier = SP.get('csa-dbx-verifier');
    if (!verifier || SP.get('csa-dbx-verifier-key') !== key) {
      verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
      SP.set('csa-dbx-verifier', verifier);
      SP.set('csa-dbx-verifier-key', key);
    }
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    if (appKey() !== key || SP.get('csa-dbx-verifier') !== verifier) return;   // inzwischen weitergetippt
    const p = new URLSearchParams({ client_id: key, response_type: 'code', code_challenge: challenge,
      code_challenge_method: 'S256', token_access_type: 'offline' });
    a.href = 'https://www.dropbox.com/oauth2/authorize?' + p;
    a.classList.remove('aus');
  }
  function anmeldungZuruecksetzen() {                     // Code ungültig/abgelaufen: neuer Prüfschlüssel, neuer Link
    SP.set('csa-dbx-verifier', null);
    SP.set('csa-dbx-verifier-key', null);
    return anmeldeLinkVorbereiten();
  }
  async function tokenAnfrage(felder) {
    const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: appKey(), ...felder }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error_description || j.error || `Dropbox antwortet mit ${r.status}`); e.dropbox = j.error; throw e; }
    return j;
  }
  async function codeEinloesen(code) {
    const j = await tokenAnfrage({ grant_type: 'authorization_code', code: code.trim(), code_verifier: SP.get('csa-dbx-verifier') || '' });
    SP.set('csa-dbx-refresh', j.refresh_token);
    SP.set('csa-dbx-verifier', null);
    SP.set('csa-dbx-verifier-key', null);
    if (j.scope) SP.set('csa-dbx-scope', j.scope);
    zugang = j.access_token; zugangBis = Date.now() + (j.expires_in - 120) * 1000;
  }
  // Schreibrecht im App-Ordner (files.content.write)? null = unbekannt (ältere Anmeldung)
  const darfSchreiben = () => { const sc = SP.get('csa-dbx-scope'); return sc === null ? null : /files\.content\.write/.test(sc); };
  async function zugriff() {
    if (zugang && Date.now() < zugangBis) return zugang;
    const rt = SP.get('csa-dbx-refresh');
    if (!rt) { const e = new Error('Nicht bei Dropbox angemeldet.'); e.anmelden = true; throw e; }
    try {
      const j = await tokenAnfrage({ grant_type: 'refresh_token', refresh_token: rt });
      zugang = j.access_token; zugangBis = Date.now() + (j.expires_in - 120) * 1000;
      if (j.scope) SP.set('csa-dbx-scope', j.scope);
      return zugang;
    } catch (e) {
      if (e.dropbox === 'invalid_grant') { SP.set('csa-dbx-refresh', null); e.anmelden = true; }
      throw e;
    }
  }
  async function dropbox(url, optionen, nochmal = true) {
    const t = await zugriff();
    const r = await fetch(url, { method: 'POST', ...optionen, headers: { Authorization: 'Bearer ' + t, ...(optionen.headers || {}) } });
    if (r.status === 401) {
      const text = await r.clone().text().catch(() => '');
      if (/missing_scope/.test(text)) {
        SP.set('csa-dbx-scope', 'ohne-schreibrecht');
        const e = new Error('Der Web-App fehlt das Schreibrecht in ihrem Dropbox-Ordner. In der Dropbox-App (dropbox.com/developers) ' +
                            'unter „Permissions“ „files.content.write“ anhaken, dann hier einmal neu mit Dropbox verbinden.');
        e.schreibrecht = true;
        throw e;
      }
      if (nochmal) { zugang = null; return dropbox(url, optionen, false); }
    }
    if (!r.ok) {
      if (optionen.roh409 && r.status === 409) return r;
      const text = await r.text().catch(() => '');
      if (optionen.fehltOk && r.status === 409 && /not_found/.test(text)) return null;
      if (r.status === 409 && /not_found/.test(text)) {
        throw new Error('Im App-Ordner der Dropbox liegt noch keine Kopie der Personaltabelle. Die Personaltabelle einmal ' +
                        'in Excel öffnen und speichern (am Mac oder Windows-PC) – Excel legt die Kopie dann automatisch ab.');
      }
      throw new Error(`Dropbox antwortet mit ${r.status}.`);
    }
    return r;
  }
  const metadaten = async () => (await dropbox('https://api.dropboxapi.com/2/files/get_metadata',
    { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: pfad() }) })).json();
  const herunterladen = async () => new Uint8Array(await (await dropbox('https://content.dropboxapi.com/2/files/download',
    { headers: { 'Dropbox-API-Arg': kopfJson({ path: pfad() }) } })).arrayBuffer());

  // Noch nicht von Excel übernommene Anwesenheitsmeldungen (Ordner /Anwesenheit im App-Ordner), nach Version zwischengespeichert
  const meldungenCache = new Map();   // Pfad -> { rev, meldung }
  async function meldungenLaden() {
    if (!uebertragung) return [];
    let r = await dropbox('https://api.dropboxapi.com/2/files/list_folder',
      { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: ORDNER, limit: 2000 }), fehltOk: true });
    if (!r) { meldungenCache.clear(); return []; }
    let j = await r.json();
    const eintraege = [...j.entries];
    while (j.has_more) {
      r = await dropbox('https://api.dropboxapi.com/2/files/list_folder/continue',
        { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cursor: j.cursor }) });
      j = await r.json();
      eintraege.push(...j.entries);
    }
    const dateien = eintraege.filter(e => e['.tag'] === 'file' && window.ExcelKern.istMeldungDatei(e.name));
    const pfade = new Set(dateien.map(e => e.path_lower));
    for (const k of [...meldungenCache.keys()]) if (!pfade.has(k)) meldungenCache.delete(k);
    for (const e of dateien) {
      const alt = meldungenCache.get(e.path_lower);
      if (alt && alt.rev === e.rev) continue;
      try {
        const bytes = new Uint8Array(await (await dropbox('https://content.dropboxapi.com/2/files/download',
          { headers: { 'Dropbox-API-Arg': kopfJson({ path: e.path_lower }) } })).arrayBuffer());
        meldungenCache.set(e.path_lower, { rev: e.rev, meldung: window.ExcelKern.meldungLesen(window.XLSX, krypto, bytes, uebertragung) });
      } catch { /* unlesbar (z. B. mit altem Schlüssel) – auslassen */ }
    }
    return [...meldungenCache.values()].map(x => x.meldung);
  }
  async function meldungHochladen(m) {
    if (!uebertragung) return { ok: false, text: 'Die Personaltabelle ist für die Übungsanwesenheit noch nicht eingerichtet (Reiter und Übertragungsschlüssel fehlen).' };
    if (!SP.get('csa-dbx-refresh')) return { ok: false, text: 'Nicht mit Dropbox verbunden.', aktion: 'verbinden' };
    if (darfSchreiben() === false) {
      return { ok: false, aktion: 'verbinden', text: 'Der Web-App fehlt das Schreibrecht in ihrem Dropbox-Ordner. In der Dropbox-App (dropbox.com/developers) ' +
               'unter „Permissions“ „files.content.write“ anhaken, dann hier einmal neu mit Dropbox verbinden.' };
    }
    const meldung = { ...m, geraet: geraetText() };
    try {
      const bytes = window.ExcelKern.meldungErstellen(window.XLSX, krypto, meldung, uebertragung);
      const pfadM = `${ORDNER}/${window.ExcelKern.meldungDatei(meldung)}`;
      const r = await dropbox('https://content.dropboxapi.com/2/files/upload', { headers: { 'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': kopfJson({ path: pfadM, mode: 'overwrite', autorename: false, mute: true }) }, body: bytes });
      const j = await r.json().catch(() => ({}));
      meldungenCache.set(pfadM.toLowerCase(), { rev: j.rev || 'neu', meldung });
      neuZusammensetzen();
      return { ok: true, daten: DATEN };          // eslint-disable-line no-undef
    } catch (e) {
      if (e.schreibrecht || e.anmelden) return { ok: false, text: e.message, aktion: 'verbinden' };
      return { ok: false, text: navigator.onLine === false ? 'kein Netz' : e.message };
    }
  }
  function geraetText() {
    const ua = navigator.userAgent || '';
    const art = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Browser';
    return `${art} · Web-App ${K.stand || ''}`.trim();
  }

  // ---------------------------------------------------------------- Oberfläche
  // Auf dem Home-Bildschirm installiert (eigenes Fenster ohne Adresszeile)? #app=1 nur für die automatischen Tests.
  const eigenstaendig = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
    new URLSearchParams(location.hash.slice(1)).get('app') === '1';
  // iOS 26 legt in der Web-App auf dem Home-Bildschirm eine Unschärfe über den Seitenanfang (unter der Statusleiste,
  // rund 40 pt tief) – Titel und Logo oben wirken verschwommen. Sie entfällt, wenn 4 px unter der Mitte des oberen
  // Rands ein fest stehendes Element liegt (mindestens 90 % so breit wie der Bildschirm, höher als 10 px) mit deckender
  // Hintergrundfarbe ohne backdrop-filter; die Statusleiste nimmt dann dessen Farbe an. Dieses Band hat die Farbe der
  // Seite; die Ansichten beginnen darunter (--frei-oben).
  if (eigenstaendig()) {
    document.documentElement.classList.add('eigenstaendig');
    const band = document.createElement('div');
    band.id = 'statusband'; band.setAttribute('aria-hidden', 'true');
    document.body.appendChild(band);
  }
  const stil = document.createElement('style');
  stil.textContent = `
  :root.eigenstaendig { --frei-oben: max(var(--sicher-oben), 12px); }
  #statusband { position: fixed; top: 0; left: 0; right: 0; height: var(--frei-oben); background: var(--page); z-index: 40; }
  #anmeldung { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
    background: var(--page); overflow: auto;
    padding: calc(1rem + var(--frei-oben)) calc(1rem + var(--sicher-rechts)) calc(1rem + var(--sicher-unten)) calc(1rem + var(--sicher-links)); }
  #anmeldung[hidden] { display: none; }
  #anmeldung .box { width: min(30rem, 100%); background: var(--surface); box-shadow: var(--schatten); border-radius: .8rem;
    padding: 1.4rem 1.4rem 1.2rem; display: flex; flex-direction: column; gap: .75rem; font-size: 16px; }
  #anmeldung .kopf { display: flex; align-items: center; gap: .9rem; }
  #anmeldung .kopf img { width: 3.2rem; height: 3.2rem; object-fit: contain; border-radius: .4rem; }
  :root:not(.hell) #anmeldung .logo-hell, :root.hell #anmeldung .logo-dunkel:not(.allein) { display: none; }
  #anmeldung h2 { margin: 0; font-size: 1.3rem; color: var(--ink); }
  #anmeldung .unter { color: var(--muted); font-size: .85rem; }
  #anmeldung p { margin: 0; color: var(--ink2); line-height: 1.4; }
  #anmeldung input[type=password], #anmeldung input[type=text] { font: inherit; font-size: 16px; padding: .6rem .7rem;
    border-radius: .45rem; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); width: 100%; box-sizing: border-box; }
  #anmeldung label { color: var(--ink2); font-size: .9rem; display: flex; gap: .5rem; align-items: center; }
  #anmeldung .los { background: var(--akzent); border-color: var(--akzent); color: #fff; font-weight: 600; padding: .55rem 1.2rem; font-size: 16px; }
  #anmeldung a.knopf { display: inline-block; text-decoration: none; text-align: center; }
  #anmeldung a.knopf.aus { opacity: .45; }
  #anmeldung .klein-link { background: none; border: 0; padding: 0; color: var(--muted); font: inherit; font-size: .8rem;
    text-decoration: underline; cursor: pointer; margin-top: .5rem; display: block; text-align: left; }
  #anmeldung .fehler { color: var(--crit); min-height: 1.2em; font-size: .9rem; }
  #anmeldung .hinweis { color: var(--muted); font-size: .8rem; line-height: 1.35; }
  #anmeldung [hidden] { display: none !important; }
  #einst-knopf { font-size: 1.05rem; }
  #einst { position: fixed; z-index: 55; right: .8rem; top: 4.5rem; background: var(--surface2); box-shadow: var(--schatten);
    border-radius: .55rem; padding: .4rem; display: flex; flex-direction: column; min-width: 15rem; font-size: 15px; }
  #einst[hidden] { display: none; }
  #einst button { text-align: left; background: none; border: 0; color: var(--ink); padding: .6rem .7rem; border-radius: .35rem; font: inherit; }
  #einst button:hover { background: var(--surface); }
  #einst .klein { color: var(--muted); font-size: .75rem; padding: .4rem .7rem; }
  #web-meldung { position: fixed; left: 50%; bottom: calc(1.5rem + var(--sicher-unten)); transform: translateX(-50%); z-index: 60; background: var(--surface2);
    box-shadow: var(--schatten); border-left: 4px solid var(--warn); border-radius: .55rem; padding: .6rem .9rem; font-size: 14px;
    color: var(--ink); max-width: 92vw; }
  #web-meldung[hidden] { display: none; }`;
  document.head.appendChild(stil);

  // Logos wie im Kopf des Monitors (hell: schwarze Schrift auf transparentem Grund, dunkel: Original)
  const lD = document.querySelector('.kopfleiste .logo-dunkel'), lH = document.querySelector('.kopfleiste .logo-hell');
  const logos = (lD && lD.getAttribute('src') ? `<img class="logo-dunkel${lH && lH.getAttribute('src') ? '' : ' allein'}" src="${lD.src}" alt="">` : '') +
                (lH && lH.getAttribute('src') ? `<img class="logo-hell" src="${lH.src}" alt="">` : '');
  const box = document.createElement('div');
  box.id = 'anmeldung';
  box.hidden = true;
  box.innerHTML = `
    <form class="box" autocomplete="off">
      <div class="kopf">${logos}
        <div><h2>Gefahrstoffzug</h2><div class="unter">Teileinheit Miehlen</div></div></div>
      <p id="a-text">Wird geladen …</p>
      <div id="a-appkey" hidden><input type="text" id="a-appkey-feld" placeholder="App-Schlüssel der Dropbox-App" autocapitalize="off" spellcheck="false"></div>
      <div id="a-dropbox" hidden>
        <a class="knopf los aus" id="a-anmelden" target="_blank" rel="noopener">1. Bei Dropbox anmelden</a>
        <button type="button" class="klein-link" id="a-link-kopieren">Öffnet sich nichts? Anmeldelink kopieren und in Safari öffnen</button>
        <p class="hinweis" style="margin:.6rem 0">Dropbox öffnet sich in einem eigenen Fenster. Dort anmelden, „Zulassen“ tippen, den angezeigten Code kopieren, das Fenster schließen („Fertig“) und den Code hier einfügen:</p>
        <input type="text" id="a-code" placeholder="Code von Dropbox einfügen" autocapitalize="off" spellcheck="false">
        <button type="button" class="klein-link" id="a-abbrechen" hidden>Abbrechen – mit der bisherigen Verbindung weiter</button>
      </div>
      <div id="a-kennwort" hidden>
        <input type="password" id="a-kw" placeholder="Kennwort der Personaltabelle">
        <label style="margin-top:.6rem"><input type="checkbox" id="a-merken"> Kennwort auf diesem Gerät merken</label>
      </div>
      <div class="fehler" id="a-fehler"></div>
      <button type="submit" class="knopf los" id="a-los" hidden>Weiter</button>
      <button type="button" class="klein-link" id="a-menue">Zurück zum Hauptmenü</button>
      <div class="hinweis" id="a-hinweis">Gelesen werden nur Namen, die Belastungsübungen („CSA-Träger aktiv“) und die
        Übungsanwesenheit – keine Kontaktdaten. Die Datei wird nur auf diesem Gerät entschlüsselt; Anwesenheitsmeldungen
        werden verschlüsselt in den eigenen App-Ordner der Dropbox geschrieben.</div>
    </form>`;
  document.body.appendChild(box);
  const meldung = document.createElement('div');
  meldung.id = 'web-meldung'; meldung.hidden = true;
  document.body.appendChild(meldung);
  const $a = id => document.getElementById(id);

  // Einstellungen (Zahnrad oben rechts)
  const rechts = document.querySelector('.kopfleiste .rechts');
  const zahnrad = document.createElement('button');
  zahnrad.className = 'knopf'; zahnrad.id = 'einst-knopf'; zahnrad.title = 'Einstellungen'; zahnrad.textContent = '⚙';
  if (rechts) rechts.appendChild(zahnrad);
  const menue = document.createElement('div');
  menue.id = 'einst'; menue.hidden = true;
  menue.innerHTML = `<button data-a="neu">Neu einlesen</button><button data-a="kennwort">Gespeichertes Kennwort löschen</button>
    <button data-a="pfad">Dateipfad in der Dropbox ändern</button><button data-a="verbinden">Mit Dropbox neu verbinden</button>
    <button data-a="abmelden">Von Dropbox abmelden</button>
    <button data-a="modus">Hell / Dunkel umschalten</button>
    <button data-a="abgleich">Einsatz-Ordner abgleichen</button><button data-a="offline-weg">Offline-Dateien vom Gerät löschen</button>
    <button data-a="kurzbefehl">Kurzbefehl „GSZ Claude“ laden (iPhone)</button>
    <div class="klein">Web-App ${K.stand || ''}</div>`;
  document.body.appendChild(menue);
  // Menü unter dem jeweiligen Zahnrad öffnen (Monitor, Startseite, Übungsanwesenheit)
  function menueOeffnen(knopf) {
    if (!menue.hidden) { menue.hidden = true; return; }
    const r = knopf.getBoundingClientRect();
    menue.style.top = Math.round(r.bottom + 6) + 'px';
    menue.style.right = Math.max(8, Math.round(innerWidth - r.right)) + 'px';
    menue.style.bottom = 'auto';
    menue.hidden = false;
    const m = menue.getBoundingClientRect();
    if (m.bottom > innerHeight - 8) { menue.style.top = 'auto'; menue.style.bottom = Math.round(innerHeight - r.top + 6) + 'px'; }
  }
  zahnrad.addEventListener('click', e => { e.stopPropagation(); menueOeffnen(zahnrad); });
  document.addEventListener('click', () => { menue.hidden = true; });
  // Vollbild gibt es auf dem iPhone nicht (die installierte Web-App läuft ohnehin ohne Adresszeile)
  const vb = document.getElementById('vollbild');
  if (vb && !document.documentElement.requestFullscreen) vb.style.display = 'none';

  // Hinweis unten; bleibt = wichtiger Hinweis, den der Ladehinweis nicht überschreibt (bis er abläuft)
  function hinweis(text, dauer = 6000, bleibt = false) {
    meldung.textContent = text; meldung.hidden = false;
    meldung.dataset.bleibt = bleibt ? '1' : '';
    clearTimeout(hinweis.t);
    if (dauer) hinweis.t = setTimeout(() => { meldung.hidden = true; meldung.dataset.bleibt = ''; }, dauer);
  }

  // ---------------------------------------------------------------- Ablauf
  let kennwort = SP.get('csa-kennwort');
  let letzteDatei = null, letzterStand = '', schritt = '', angezeigt = false, beschaeftigt = false;

  // Auf dem Home-Bildschirm hat die App einen eigenen Speicher (iOS): Eine Anmeldung aus Safari sieht sie nicht.
  // Einmal dort verbinden – danach bleibt die Verbindung, beim Start kommt höchstens die Kennwortfrage.
  const verbindenText = () => eigenstaendig()
    ? 'Die App auf dem Home-Bildschirm einmal mit Dropbox verbinden – sie hat einen eigenen Speicher und kennt die Anmeldung aus Safari nicht. Danach bleibt sie verbunden und fragt beim Start nur noch nach dem Kennwort der Personaltabelle.'
    : 'Einmal mit Dropbox verbinden. Die Web-App liest dann nur ihren eigenen App-Ordner in der Dropbox – nichts sonst.';

  // Das Anmeldefenster erscheint nur, wenn eine Übungen-Ansicht die Personaltabelle braucht (interaktiv) oder jemand für den
  // Einsatz-Teil „Mit Dropbox verbinden“ tippt; sonst wird die Abfrage zurückgehalten (wartet) und der Einsatz bleibt nutzbar.
  let interaktiv = false, wartet = null, zweck = 'uebungen';
  function ansicht(was, text, fehler = '') {
    if (was === 'laden') {                          // Ansicht bleibt sichtbar, nur ein kurzer Hinweis unten
      if (interaktiv && !angezeigt && !meldung.dataset.bleibt) hinweis(text, 0);
      return;
    }
    if (!interaktiv) { wartet = { was, text, fehler }; schritt = ''; return; }
    wartet = null;
    schritt = was;
    box.hidden = false;
    $a('a-abbrechen').hidden = !(was === 'dropbox' && angezeigt && SP.get('csa-dbx-refresh'));
    $a('a-text').textContent = text;
    $a('a-fehler').textContent = fehler;
    $a('a-appkey').hidden = !(was === 'dropbox' && !K.appKey);
    $a('a-dropbox').hidden = was !== 'dropbox';
    $a('a-kennwort').hidden = was !== 'kennwort';
    $a('a-los').hidden = !['dropbox', 'kennwort', 'fehler'].includes(was);
    $a('a-los').textContent = was === 'dropbox' ? '2. Verbinden' : was === 'kennwort' ? 'Öffnen' : 'Erneut versuchen';
    if (was === 'dropbox' && !K.appKey) $a('a-appkey-feld').value = SP.get('csa-dbx-appkey') || '';
    if (was === 'dropbox') anmeldeLinkVorbereiten();
    if (was === 'kennwort') setTimeout(() => $a('a-kw').focus(), 50);
  }

  const zeit = iso => { const d = new Date(iso), z = n => String(n).padStart(2, '0');
    return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()} um ${z(d.getHours())}:${z(d.getMinutes())}`; };

  // Personaltabelle (ohne Meldungen) und Übertragungsschlüssel; DATEN = Personaltabelle + noch nicht übernommene Meldungen
  let basis = null, uebertragung = '';
  function personalAnfordern() {
    interaktiv = true; zweck = 'uebungen';
    if (angezeigt) return;
    if (wartet && wartet.was !== 'fehler') { const w = wartet; ansicht(w.was, w.text, w.fehler); return; }
    wartet = null;
    if (!beschaeftigt) laden(true);
  }
  // Ansicht gewechselt (oberflaeche.js): Anmeldefenster der Übungen schließen, wenn man den Übungen-Teil verlässt
  const UEBUNGEN = ['uebungen', 'monitor', 'anwesenheit'];
  function ansichtGewechselt(a) {
    if (UEBUNGEN.includes(a)) return;
    if (zweck === 'uebungen') { interaktiv = false; if (!box.hidden && schritt) { wartet = { was: schritt, text: $a('a-text').textContent, fehler: '' }; box.hidden = true; schritt = ''; } }
  }
  function auswerten(bytes, stand) {
    const r = window.ExcelKern.lesen(window.XLSX, krypto, bytes, kennwort);
    if (!r.leute.length) throw new Error('In „CSA-Träger aktiv“ steht niemand.');
    if (r.schluessel !== uebertragung) meldungenCache.clear();
    uebertragung = r.schluessel || '';
    basis = { daten: { leute: r.leute, anwesenheit: r.anwesenheit },
              quelle: `Kopie der Personaltabelle im App-Ordner der Dropbox, gespeichert am ${zeit(stand)}` };
    box.hidden = true; angezeigt = true; wartet = null;
    if (!meldung.dataset.bleibt) meldung.hidden = true;
    neuZusammensetzen();
  }
  function neuZusammensetzen() {
    if (!basis) return;
    const z = window.ExcelKern.zusammenfuehren(basis.daten, [...meldungenCache.values()].map(x => x.meldung));
    DATEN = { ...z, app: true, erzeugt: new Date().toISOString().slice(0, 16), quelle: basis.quelle };   // eslint-disable-line no-undef
    zeichnen();                                                                     // eslint-disable-line no-undef
    if (window.GSZ) GSZ.daten(DATEN);                                               // eslint-disable-line no-undef
  }
  // noch nicht übernommene Meldungen holen (Fehler nur still melden – der Monitor läuft auch ohne)
  async function meldungenAktualisieren() {
    if (!uebertragung || test.get('test')) return;
    try {
      const vorher = [...meldungenCache.entries()].map(([k, v]) => k + v.rev).join('/');
      await meldungenLaden();
      const nachher = [...meldungenCache.entries()].map(([k, v]) => k + v.rev).join('/');
      if (vorher !== nachher) neuZusammensetzen();
    } catch { /* später erneut */ }
  }

  // Test ohne Dropbox: #test=<datei>&kw=<kennwort> (nur für die automatischen Tests)
  const test = new URLSearchParams(location.hash.slice(1));

  async function laden(erzwingen = false) {
    if (beschaeftigt) return;
    beschaeftigt = true;
    try {
      let bytes, stand, kennung;
      if (test.get('test')) {
        bytes = new Uint8Array(await (await fetch(test.get('test'))).arrayBuffer());
        stand = new Date().toISOString(); kennung = 'test';
        if (test.get('kw') && !kennwort) kennwort = test.get('kw');
      } else {
        if (!appKey() || !SP.get('csa-dbx-refresh')) { ansicht('dropbox', verbindenText()); return; }
        if (!pfad()) { ansicht('fehler', 'Kein Dateipfad eingestellt.', 'Über das Zahnrad › „Dateipfad in der Dropbox ändern“ einstellen.'); return; }
        const m = await metadaten();
        kennung = m.content_hash || m.rev; stand = m.server_modified;
        if (!erzwingen && angezeigt && kennung === letzterStand) { await meldungenAktualisieren(); return; }
        if (!angezeigt) ansicht('laden', 'Personaltabelle wird aus der Dropbox geladen …');
        bytes = await herunterladen();
      }
      letzteDatei = { bytes, stand, kennung };
      if (window.ExcelKern.istVerschluesselt(bytes) && !kennwort) { ansicht('kennwort', 'Die Personaltabelle hat ein Kennwort zum Öffnen. Bitte eingeben:'); return; }
      if (!angezeigt) ansicht('laden', 'Wird entschlüsselt …');
      await new Promise(r => setTimeout(r, 30));                     // Anzeige aktualisieren lassen
      auswerten(bytes, stand);
      letzterStand = kennung;
      await meldungenAktualisieren();
    } catch (e) {
      if (e.code === 'KENNWORT') {
        if (SP.get('csa-kennwort')) SP.set('csa-kennwort', null);
        kennwort = null;
        ansicht('kennwort', 'Die Personaltabelle hat ein Kennwort zum Öffnen. Bitte eingeben:', e.message === 'Die Datei hat ein Kennwort.' ? '' : e.message);
      } else if (e.anmelden) {
        ansicht('dropbox', 'Die Anmeldung bei Dropbox ist abgelaufen. Bitte neu verbinden.');
      } else if (angezeigt) {
        hinweis(`Aktualisieren nicht möglich (${e.message}) – angezeigt bleibt der letzte Stand.`);
      } else {
        ansicht('fehler', 'Die Personaltabelle konnte nicht geladen werden.', e.message);
      }
    } finally {
      beschaeftigt = false;
    }
  }

  $a('a-appkey-feld').addEventListener('input', () => {
    SP.set('csa-dbx-appkey', $a('a-appkey-feld').value.trim() || null);
    $a('a-fehler').textContent = '';
    anmeldeLinkVorbereiten();
  });
  const linkBereit = () => {
    if ($a('a-anmelden').getAttribute('href')) return true;
    $a('a-fehler').textContent = appKey() ? 'Einen Moment – der Anmeldelink wird vorbereitet. Bitte gleich noch einmal tippen.'
                                          : 'Bitte zuerst den App-Schlüssel eintragen.';
    if (appKey()) anmeldeLinkVorbereiten();
    return false;
  };
  $a('a-anmelden').addEventListener('click', e => {
    if (!linkBereit()) { e.preventDefault(); return; }
    $a('a-fehler').textContent = '';
    $a('a-text').textContent = 'Dropbox ist geöffnet. Nach „Zulassen“ den Code kopieren, das Dropbox-Fenster schließen und den Code unten einfügen.';
  });
  $a('a-link-kopieren').addEventListener('click', () => {
    if (!linkBereit()) return;
    const url = $a('a-anmelden').href;
    const ok = () => { $a('a-fehler').textContent = '';
      $a('a-text').textContent = 'Anmeldelink kopiert. In Safari in die Adresszeile einfügen und öffnen, bei Dropbox „Zulassen“, den Code kopieren und hier unten einfügen.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, () => prompt('Anmeldelink kopieren:', url));
    else prompt('Anmeldelink kopieren:', url);
  });

  box.addEventListener('submit', async e => {
    e.preventDefault();
    $a('a-fehler').textContent = '';
    if (schritt === 'dropbox') {
      const code = $a('a-code').value.trim();
      if (!code) { $a('a-fehler').textContent = 'Bitte den Code von Dropbox einfügen.'; return; }
      try {
        await codeEinloesen(code);
        $a('a-code').value = '';
        // Speicher dauerhaft halten (iOS räumt sonst bei Platzmangel womöglich auf); Verbindung bleibt gespeichert
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        hinweis('Mit Dropbox verbunden – die Verbindung bleibt auf diesem Gerät gespeichert. Künftig fragt die App höchstens nach dem Kennwort.', 9000, true);
        if (zweck === 'einsatz') { interaktiv = false; box.hidden = true; schritt = ''; einsatzMelden(); einsatzAbgleich(true); }
        laden(true);
      }
      catch (err) {
        if (err.dropbox === 'invalid_grant') {
          await anmeldungZuruecksetzen();
          $a('a-fehler').textContent = 'Der Code ist ungültig oder abgelaufen. Bitte noch einmal „1. Bei Dropbox anmelden“ tippen und den neuen Code einfügen.';
        } else {
          $a('a-fehler').textContent = `Verbinden fehlgeschlagen: ${err.message}`;
        }
      }
    } else if (schritt === 'kennwort') {
      const kw = $a('a-kw').value;
      if (!kw) { $a('a-fehler').textContent = 'Bitte das Kennwort eingeben.'; return; }
      kennwort = kw;
      $a('a-text').textContent = 'Wird entschlüsselt …';
      await new Promise(r => setTimeout(r, 30));
      try {
        auswerten(letzteDatei.bytes, letzteDatei.stand);
        letzterStand = letzteDatei.kennung;
        if ($a('a-merken').checked) SP.set('csa-kennwort', kw);
        $a('a-kw').value = '';
        meldungenAktualisieren();
      } catch (err) {
        kennwort = null;
        ansicht('kennwort', 'Die Personaltabelle hat ein Kennwort zum Öffnen. Bitte eingeben:', err.code === 'KENNWORT' ? err.message : `Fehler: ${err.message}`);
      }
    } else {
      laden(true);
    }
  });

  menue.addEventListener('click', e => {
    const a = e.target && e.target.dataset && e.target.dataset.a;
    if (!a) return;
    menue.hidden = true;
    if (a === 'neu') { laden(true); hinweis('Wird neu eingelesen …', 2500); }
    if (a === 'modus') { const hell = document.documentElement.classList.toggle('hell'); SP.set('csa-modus', hell ? 'hell' : 'dunkel');
      document.dispatchEvent(new Event('gsz-modus')); }
    if (a === 'kennwort') { SP.set('csa-kennwort', null); hinweis('Das gespeicherte Kennwort ist gelöscht. Beim nächsten Start fragt die Web-App wieder.'); }
    if (a === 'pfad') {
      const neu = prompt('Pfad der Kopie im App-Ordner der Dropbox (beginnt mit /):', pfad());
      if (neu && neu.trim()) { SP.set('csa-pfad', neu.trim()); letzterStand = ''; angezeigt = false; laden(true); }
    }
    if (a === 'verbinden') verbindenNeu();
    if (a === 'abgleich') { einsatzAbgleich(true); hinweis('Einsatz-Ordner werden abgeglichen …', 2500); }
    if (a === 'offline-weg') {
      if (!confirm('Alle offline gespeicherten Einsatz-Dateien von diesem Gerät löschen? Sie werden beim nächsten Abgleich neu geladen.')) return;
      window.GSZSpeicher.leeren('dateien').then(() => window.GSZSpeicher.setze('meta', 'einsatz-offline', {})).then(() => { offlineRevs = {}; einsatzMelden(); hinweis('Gelöscht.'); });
    }
    // als Download (wie Content-Disposition: attachment), sonst zeigt Safari die Datei als Text an; danach „Kurzbefehl hinzufügen“
    if (a === 'kurzbefehl') {
      const l = document.createElement('a');
      l.href = 'GSZ-Claude.shortcut'; l.download = 'GSZ Claude.shortcut';
      document.body.appendChild(l); l.click(); l.remove();
      hinweis('Kurzbefehl wird geladen – danach „Kurzbefehl hinzufügen“ wählen (ggf. in der Dateien-App unter „Downloads“ antippen).', 9000);
    }
    if (a === 'abmelden') {
      if (!confirm('Von Dropbox abmelden? Danach muss die Web-App neu verbunden werden.')) return;
      SP.set('csa-dbx-refresh', null); SP.set('csa-dbx-verifier', null); SP.set('csa-dbx-verifier-key', null);
      zugang = null; angezeigt = false; letzterStand = '';
      ansicht('dropbox', verbindenText());
    }
  });

  // neu mit Dropbox verbinden (z. B. für das Schreibrecht); die bisherige Verbindung bleibt, bis die neue steht
  function verbindenNeu() {
    interaktiv = true;
    ansicht('dropbox', 'Neu mit Dropbox verbinden – z. B. damit die Web-App Anwesenheiten speichern darf (Schreibrecht im eigenen ' +
      'App-Ordner; vorher in der Dropbox-App unter „Permissions“ „files.content.write“ anhaken).');
  }
  $a('a-abbrechen').addEventListener('click', () => { box.hidden = true; schritt = ''; });
  $a('a-menue').addEventListener('click', () => {
    box.hidden = true; schritt = ''; interaktiv = false;
    if (window.GSZ && UEBUNGEN.includes(GSZ.aktuell.ansicht)) GSZ.zeige('start'); else if (window.GSZ) GSZ.zeige(GSZ.aktuell.ansicht + (GSZ.aktuell.param ? '/' + GSZ.aktuell.param : ''), true);
  });

  // ---------------------------------------------------------------- Einsatz-Ordner (Dropbox-App-Ordner /Einsatz), offline auf dem Gerät
  // Liste über list_folder (rekursiv, danach nur Änderungen über den gespeicherten cursor); Dateien landen im Gerätespeicher
  // (IndexedDB, GSZSpeicher 'dateien', Schlüssel = path_lower) und sind dann ohne Netz da.
  const EINSATZ = '/Einsatz', AUSWERTUNG = '/Auswertung';
  const SPx = window.GSZSpeicher;
  let eintraege = null, einsatzStand = null, einsatzFehler = '', offlineRevs = null, abgleichLaeuft = null, fortschrittText = '';
  let wahl = {};                     // path_lower → 'online' (nur online); fehlt = auch offline (Standard)
  const beobachter = [];
  function einsatzMelden() { for (const f of beobachter) { try { f(); } catch { /* weiter */ } } }
  const verbundenDbx = () => !!(appKey() && SP.get('csa-dbx-refresh'));
  const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', txt: 'text/plain',
                 json: 'application/json', heic: 'image/heic' };
  const mimeVon = n => MIME[(/\.([a-z0-9]+)$/i.exec(n) || [, ''])[1].toLowerCase()] || 'application/octet-stream';
  async function gespeichertLaden() {
    if (eintraege) return;
    const m = await SPx.hole('meta', 'einsatz').catch(() => null);
    eintraege = new Map(((m && m.eintraege) || []).map(e => [e.lower, e]));
    einsatzStand = (m && m.stand) || null;
    offlineRevs = (await SPx.hole('meta', 'einsatz-offline').catch(() => null)) || {};
    wahl = (await SPx.hole('meta', 'einsatz-wahl').catch(() => null)) || {};
  }
  const relativ = e => { const d = e.path_display || e.path_lower; return d.toLowerCase().startsWith(EINSATZ.toLowerCase() + '/') ? d.slice(EINSATZ.length + 1) : null; };
  async function listeAktualisieren() {
    await gespeichertLaden();
    if (!verbundenDbx() || navigator.onLine === false) return false;
    const m = await SPx.hole('meta', 'einsatz').catch(() => null);
    let cursor = m && m.cursor, neu = cursor ? new Map(eintraege) : new Map(), j;
    const anwenden = liste => {
      for (const e of liste) {
        const pfad = relativ(e);
        if (!pfad) continue;
        if (e['.tag'] === 'deleted') { for (const k of [...neu.keys()]) if (k === e.path_lower || k.startsWith(e.path_lower + '/')) neu.delete(k); continue; }
        neu.set(e.path_lower, { lower: e.path_lower, pfad, name: pfad.split('/').pop(), ordner: e['.tag'] === 'folder', rev: e.rev || '',
                                groesse: e.size || 0, geaendert: e.server_modified || '' });
      }
    };
    const json = { 'Content-Type': 'application/json' };
    if (cursor) {
      const r = await dropbox('https://api.dropboxapi.com/2/files/list_folder/continue', { headers: json, body: JSON.stringify({ cursor }), roh409: true });
      if (r.status === 409) { cursor = null; neu = new Map(); }          // cursor ungültig (reset) → alles neu
      else { j = await r.json(); anwenden(j.entries); }
    }
    if (!cursor) {
      const r = await dropbox('https://api.dropboxapi.com/2/files/list_folder', { headers: json, roh409: true,
        body: JSON.stringify({ path: EINSATZ, recursive: true, include_deleted: false, limit: 2000 }) });
      if (r.status === 409) { eintraege = new Map(); einsatzStand = new Date().toISOString(); await SPx.setze('meta', 'einsatz', { eintraege: [], stand: einsatzStand }); return true; }
      j = await r.json(); anwenden(j.entries);
    }
    while (j && j.has_more) {
      j = await (await dropbox('https://api.dropboxapi.com/2/files/list_folder/continue', { headers: json, body: JSON.stringify({ cursor: j.cursor }) })).json();
      anwenden(j.entries);
    }
    eintraege = neu; einsatzStand = new Date().toISOString(); einsatzFehler = '';
    await SPx.setze('meta', 'einsatz', { eintraege: [...neu.values()], stand: einsatzStand, cursor: j ? j.cursor : cursor }).catch(() => {});
    // Dateien, die es nicht mehr gibt, aus dem Gerätespeicher entfernen
    for (const k of Object.keys(offlineRevs)) if (!neu.has(k)) { delete offlineRevs[k]; SPx.loesche('dateien', k).catch(() => {}); }
    await SPx.setze('meta', 'einsatz-offline', offlineRevs).catch(() => {});
    let wahlAlt = false;
    for (const k of Object.keys(wahl)) if (!neu.has(k)) { delete wahl[k]; wahlAlt = true; }
    if (wahlAlt) await SPx.setze('meta', 'einsatz-wahl', wahl).catch(() => {});
    return true;
  }
  async function herunterladenEinsatz(e) {
    const r = await dropbox('https://content.dropboxapi.com/2/files/download', { headers: { 'Dropbox-API-Arg': kopfJson({ path: e.lower }) } });
    const daten = await r.arrayBuffer();
    const blob = new Blob([daten], { type: mimeVon(e.name) });
    if (wahl[e.lower] === 'online') return blob;                 // nur online: nicht auf dem Gerät speichern
    try {
      // als Bytes (ArrayBuffer), nicht als Blob: Safari speichert Blobs in manchen Modi (privat, flüchtig) nicht
      await SPx.setze('dateien', e.lower, { rev: e.rev, daten, typ: blob.type });
      offlineRevs[e.lower] = e.rev;
      await SPx.setze('meta', 'einsatz-offline', offlineRevs);
    } catch (f) { const x = new Error('Gerätespeicher voll – Datei nur online verfügbar.'); x.voll = true; x.blob = blob; throw x; }
    return blob;
  }
  // Liste holen und alle Dateien offline speichern (nacheinander, im Hintergrund)
  let letzterVersuch = 0;
  function einsatzAbgleich(frisch = false) {
    if (abgleichLaeuft) return abgleichLaeuft;
    if (!verbundenDbx()) return Promise.resolve();
    letzterVersuch = Date.now();
    abgleichLaeuft = (async () => {
      try {
        await listeAktualisieren();
        einsatzMelden();
        const fehlen = [...eintraege.values()].filter(e => !e.ordner && offlineRevs[e.lower] !== e.rev && wahl[e.lower] !== 'online');
        let n = 0;
        for (const e of fehlen) {
          if (navigator.onLine === false) break;
          fortschrittText = `lädt ${++n} von ${fehlen.length} …`;
          if (n === 1 || n % 3 === 0) einsatzMelden();
          try { await herunterladenEinsatz(e); } catch (f) { if (f.voll) { einsatzFehler = f.message; break; } if (f.anmelden) throw f; }
        }
      } catch (e) {
        einsatzFehler = e.anmelden ? 'Dropbox-Anmeldung abgelaufen – neu verbinden' : navigator.onLine === false ? '' : e.message;
      } finally {
        fortschrittText = ''; abgleichLaeuft = null; einsatzMelden();
      }
    })();
    return abgleichLaeuft;
  }
  async function einsatzDatei(pfad) {
    await gespeichertLaden();
    const e = [...eintraege.values()].find(x => x.pfad === pfad) || [...eintraege.values()].find(x => x.pfad.toLowerCase() === String(pfad).toLowerCase());
    if (!e) throw new Error('Datei nicht gefunden.');
    const gespeichert = await SPx.hole('dateien', e.lower).catch(() => null);
    const alsBlob = g => g && (g.blob || (g.daten ? new Blob([g.daten], { type: g.typ || mimeVon(e.name) }) : null));   // bis 2.0.2 als Blob gespeichert
    if (gespeichert && (gespeichert.rev === e.rev || navigator.onLine === false || !verbundenDbx())) return alsBlob(gespeichert);
    if (wahl[e.lower] === 'online' && navigator.onLine === false) throw new Error('nur online verfügbar – gerade keine Verbindung');
    try { return await herunterladenEinsatz(e); }
    catch (f) { if (f.blob) return f.blob; if (gespeichert) return alsBlob(gespeichert); throw f; }
  }
  async function hochladen(pfadM, inhalt) {
    const r = await dropbox('https://content.dropboxapi.com/2/files/upload', { headers: { 'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': kopfJson({ path: pfadM, mode: 'overwrite', autorename: false, mute: true }) }, body: inhalt });
    return r.json().catch(() => ({}));
  }
  async function textHolen(pfadM) {
    const r = await dropbox('https://content.dropboxapi.com/2/files/download', { headers: { 'Dropbox-API-Arg': kopfJson({ path: pfadM }) }, fehltOk: true });
    return r ? r.text() : null;
  }
  const einsatzAdapter = {
    art: 'web',
    verbunden: verbundenDbx,
    verbinden() { interaktiv = true; zweck = 'einsatz'; ansicht('dropbox', 'Mit Dropbox verbinden, damit die Einsatz-Ordner und Beständigkeitslisten aus dem App-Ordner ' +
      'auf dieses Gerät kommen (danach auch offline). Die Personaltabelle wird dabei nicht geöffnet.'); },
    async liste({ frisch = false } = {}) {
      await gespeichertLaden();
      // selbsttätig höchstens einmal je Minute (auch nach Fehlern), sonst würden sich Abgleich und Neuzeichnen gegenseitig anstoßen
      if (verbundenDbx() && navigator.onLine !== false && (frisch || Date.now() - letzterVersuch > 60 * 1000)) einsatzAbgleich(frisch);
      return { dateien: [...eintraege.values()].map(e => ({ ...e, offline: !e.ordner && offlineRevs[e.lower] === e.rev,
                                                            wahl: e.ordner ? '' : wahl[e.lower] === 'online' ? 'online' : 'offline' })),
               stand: einsatzStand, quelle: 'dropbox', fehler: einsatzFehler };
    },
    // „nur online“ (vom Gerät entfernen) bzw. „auch offline“ (auf das Gerät laden) – je Datei, gilt nur für dieses Gerät
    async verfuegbarkeitSetzen(pfade, wert) {
      await gespeichertLaden();
      for (const p of [].concat(pfade)) {
        const e = [...eintraege.values()].find(x => x.pfad === p);
        if (!e || e.ordner) continue;
        if (wert === 'online') { wahl[e.lower] = 'online'; delete offlineRevs[e.lower]; await SPx.loesche('dateien', e.lower).catch(() => {}); }
        else delete wahl[e.lower];
      }
      await SPx.setze('meta', 'einsatz-wahl', wahl);
      await SPx.setze('meta', 'einsatz-offline', offlineRevs).catch(() => {});
      einsatzMelden();
      if (wert !== 'online' && verbundenDbx() && navigator.onLine !== false) { letzterVersuch = 0; einsatzAbgleich(false); }
    },
    // Gerät bzw. PSA in den Beständigkeitslisten anlegen oder ergänzen (Foto, Listen, info.txt); loeschen: Namen im Geräteordner
    async geraetDateien(ordner, dateienListe, { loeschen = [] } = {}, fortschritt = () => {}) {
      if (!verbundenDbx()) throw new Error('Nicht mit Dropbox verbunden.');
      if (darfSchreiben() === false) throw new Error('Der Web-App fehlt das Schreibrecht in ihrem Dropbox-Ordner (⚙ › Mit Dropbox neu verbinden).');
      if (navigator.onLine === false) throw new Error('Ohne Netz nicht möglich.');
      const o = String(ordner || '').replace(/[\/\\]/g, '-').trim();
      if (!o || o.startsWith('.')) throw new Error('Ungültiger Ordnername.');
      const basis = `${EINSATZ}/Beständigkeitslisten/${o}`;
      let n = 0;
      for (const d of dateienListe) {
        fortschritt(++n, dateienListe.length);
        await hochladen(`${basis}/${String(d.name).replace(/[\/\\]/g, '-')}`, new Uint8Array(await d.blob.arrayBuffer()));
      }
      for (const name of loeschen) {
        await dropbox('https://api.dropboxapi.com/2/files/delete_v2', { headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `${basis}/${String(name).replace(/[\/\\]/g, '-')}` }), fehltOk: true }).catch(() => {});
      }
      letzterVersuch = 0;
      await einsatzAbgleich(true);
    },
    datei: einsatzDatei,
    fortschritt: () => fortschrittText,
    beiAenderung: f => beobachter.push(f),
    // Datenblatt-Aufträge für den Mac-Helfer bzw. den Kurzbefehl (Ordner /Auswertung/<id>)
    async auftragAblegen(id, dateienListe, auftrag) {
      if (!verbundenDbx()) throw new Error('Nicht mit Dropbox verbunden.');
      if (darfSchreiben() === false) throw new Error('Der Web-App fehlt das Schreibrecht in ihrem Dropbox-Ordner.');
      for (const d of dateienListe) await hochladen(`${AUSWERTUNG}/${id}/${d.name}`, new Uint8Array(await d.blob.arrayBuffer()));
      await hochladen(`${AUSWERTUNG}/${id}/auftrag.json`, new TextEncoder().encode(JSON.stringify(auftrag, null, 1)));
    },
    async auftragErgebnis(id) {
      if (!verbundenDbx() || navigator.onLine === false) return null;
      const e = await textHolen(`${AUSWERTUNG}/${id}/ergebnis.json`);
      const i = await textHolen(`${AUSWERTUNG}/${id}/antwort-iphone.txt`);
      return { ergebnis: e ? JSON.parse(e) : null, antwortIphone: i || null };
    },
    async helfer() {
      if (!verbundenDbx() || navigator.onLine === false) return null;
      const t = await textHolen(`${AUSWERTUNG}/mac-helfer.json`).catch(() => null);
      try { return t ? JSON.parse(t) : null; } catch { return null; }
    },
    // Für den Kurzbefehl „GSZ Claude“: Claudes Antwort direkt in den Auftragsordner hochladen (Zugang gilt rund 4 Stunden)
    async iphoneZugang(id) {
      if (!verbundenDbx() || darfSchreiben() === false) return null;
      const t = await zugriff();
      return { url: 'https://content.dropboxapi.com/2/files/upload', auth: 'Bearer ' + t,
               arg: kopfJson({ path: `${AUSWERTUNG}/${id}/antwort-iphone.txt`, mode: 'overwrite', autorename: false, mute: true }) };
    },
  };
  addEventListener('online', () => { if (verbundenDbx()) einsatzAbgleich(false); });

  // Startseite und Übungsanwesenheit (oberflaeche.js)
  if (window.GSZ) {
    GSZ.einrichten({ speichern: meldungHochladen, einstellungen: menueOeffnen, verbinden: verbindenNeu, personalAnfordern,   // eslint-disable-line no-undef
                     ansichtGewechselt, einsatz: einsatzAdapter, version: `Web-App ${K.stand || ''}` });
  }

  // regelmäßig und beim Zurückkehren in die App auf eine neu gespeicherte Datei prüfen
  setInterval(() => { if (!document.hidden && angezeigt) laden(); }, MINUTE);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && angezeigt) laden(); });

  // Offline-Betrieb und Aktualisierung der Web-App selbst
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Betrieb weiter */ });
  }

  laden(true);
})();
