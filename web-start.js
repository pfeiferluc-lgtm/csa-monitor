// CSA-Monitor als Web-App (iPhone, iPad, jeder Browser). Holt die Personaltabelle über die Dropbox-Schnittstelle,
// entschlüsselt sie nur auf diesem Gerät (excel-kern.js) und setzt die Daten in die Monitor-Seite (monitor.html).
// Anmeldung bei Dropbox mit PKCE und Code zum Einfügen (kein Server, keine Weiterleitung nötig); Zugriff nur lesend.
// Die Dropbox-App hat nur Zugriff auf ihren eigenen App-Ordner (Dropbox/Apps/CSA-Monitor …); dort legt Excel nach jedem
// Speichern eine verschlüsselte Kopie der Personaltabelle ab (Modul Web_Makros). Pfade sind relativ zu diesem Ordner.
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
  };

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
      code_challenge_method: 'S256', token_access_type: 'offline', scope: 'files.metadata.read files.content.read' });
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
    zugang = j.access_token; zugangBis = Date.now() + (j.expires_in - 120) * 1000;
  }
  async function zugriff() {
    if (zugang && Date.now() < zugangBis) return zugang;
    const rt = SP.get('csa-dbx-refresh');
    if (!rt) { const e = new Error('Nicht bei Dropbox angemeldet.'); e.anmelden = true; throw e; }
    try {
      const j = await tokenAnfrage({ grant_type: 'refresh_token', refresh_token: rt });
      zugang = j.access_token; zugangBis = Date.now() + (j.expires_in - 120) * 1000;
      return zugang;
    } catch (e) {
      if (e.dropbox === 'invalid_grant') { SP.set('csa-dbx-refresh', null); e.anmelden = true; }
      throw e;
    }
  }
  async function dropbox(url, optionen, nochmal = true) {
    const t = await zugriff();
    const r = await fetch(url, { method: 'POST', ...optionen, headers: { Authorization: 'Bearer ' + t, ...(optionen.headers || {}) } });
    if (r.status === 401 && nochmal) { zugang = null; return dropbox(url, optionen, false); }
    if (!r.ok) {
      const text = await r.text().catch(() => '');
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

  // ---------------------------------------------------------------- Oberfläche
  const stil = document.createElement('style');
  stil.textContent = `
  #anmeldung { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
    background: var(--page); overflow: auto; padding: 1rem; }
  #anmeldung[hidden] { display: none; }
  #anmeldung .box { width: min(30rem, 100%); background: var(--surface); box-shadow: var(--schatten); border-radius: .8rem;
    padding: 1.4rem 1.4rem 1.2rem; display: flex; flex-direction: column; gap: .75rem; font-size: 16px; }
  #anmeldung .kopf { display: flex; align-items: center; gap: .9rem; }
  #anmeldung .kopf img { width: 3.2rem; height: 3.2rem; object-fit: contain; border-radius: .4rem; }
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
  #web-meldung { position: fixed; left: 50%; bottom: 1.5rem; transform: translateX(-50%); z-index: 60; background: var(--surface2);
    box-shadow: var(--schatten); border-left: 4px solid var(--warn); border-radius: .55rem; padding: .6rem .9rem; font-size: 14px;
    color: var(--ink); max-width: 92vw; }
  #web-meldung[hidden] { display: none; }`;
  document.head.appendChild(stil);

  const logo = document.querySelector('.kopfleiste .logo');
  const box = document.createElement('div');
  box.id = 'anmeldung';
  box.innerHTML = `
    <form class="box" autocomplete="off">
      <div class="kopf">${logo && logo.src ? `<img src="${logo.src}" alt="">` : ''}
        <div><h2>CSA-Monitor</h2><div class="unter">Gefahrstoffzug Rhein-Lahn-Kreis · Teileinheit Miehlen</div></div></div>
      <p id="a-text">Wird geladen …</p>
      <div id="a-appkey" hidden><input type="text" id="a-appkey-feld" placeholder="App-Schlüssel der Dropbox-App" autocapitalize="off" spellcheck="false"></div>
      <div id="a-dropbox" hidden>
        <a class="knopf los aus" id="a-anmelden" target="_blank" rel="noopener">1. Bei Dropbox anmelden</a>
        <button type="button" class="klein-link" id="a-link-kopieren">Öffnet sich nichts? Anmeldelink kopieren und in Safari öffnen</button>
        <p class="hinweis" style="margin:.6rem 0">Dropbox öffnet sich in einem eigenen Fenster. Dort anmelden, „Zulassen“ tippen, den angezeigten Code kopieren, das Fenster schließen („Fertig“) und den Code hier einfügen:</p>
        <input type="text" id="a-code" placeholder="Code von Dropbox einfügen" autocapitalize="off" spellcheck="false">
      </div>
      <div id="a-kennwort" hidden>
        <input type="password" id="a-kw" placeholder="Kennwort der Personaltabelle">
        <label style="margin-top:.6rem"><input type="checkbox" id="a-merken"> Kennwort auf diesem Gerät merken</label>
      </div>
      <div class="fehler" id="a-fehler"></div>
      <button type="submit" class="knopf los" id="a-los" hidden>Weiter</button>
      <div class="hinweis" id="a-hinweis">Gelesen werden nur Name, Vorname, letzte Übung und „Fällig bis“ aus „CSA-Träger aktiv“.
        Die Datei wird nur auf diesem Gerät entschlüsselt.</div>
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
    <button data-a="pfad">Dateipfad in der Dropbox ändern</button><button data-a="abmelden">Von Dropbox abmelden</button>
    <div class="klein">Web-App ${K.stand || ''}</div>`;
  document.body.appendChild(menue);
  zahnrad.addEventListener('click', e => { e.stopPropagation(); menue.hidden = !menue.hidden; });
  document.addEventListener('click', () => { menue.hidden = true; });
  // Vollbild gibt es auf dem iPhone nicht (die installierte Web-App läuft ohnehin ohne Adresszeile)
  const vb = document.getElementById('vollbild');
  if (vb && !document.documentElement.requestFullscreen) vb.style.display = 'none';

  function hinweis(text, dauer = 6000) {
    meldung.textContent = text; meldung.hidden = false;
    clearTimeout(hinweis.t);
    if (dauer) hinweis.t = setTimeout(() => { meldung.hidden = true; }, dauer);
  }

  // ---------------------------------------------------------------- Ablauf
  let kennwort = SP.get('csa-kennwort');
  let letzteDatei = null, letzterStand = '', schritt = '', angezeigt = false, beschaeftigt = false;

  function ansicht(was, text, fehler = '') {
    schritt = was;
    box.hidden = false;
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

  function auswerten(bytes, stand) {
    const leute = window.ExcelKern.csaTraeger(window.XLSX, krypto, bytes, kennwort);
    if (!leute.length) throw new Error('In „CSA-Träger aktiv“ steht niemand.');
    DATEN = { leute, app: true, erzeugt: new Date().toISOString().slice(0, 16),   // eslint-disable-line no-undef
              quelle: `Kopie der Personaltabelle im App-Ordner der Dropbox, gespeichert am ${zeit(stand)}` };
    box.hidden = true; angezeigt = true;
    zeichnen();                                                                     // eslint-disable-line no-undef
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
        if (!appKey() || !SP.get('csa-dbx-refresh')) { ansicht('dropbox', 'Einmal mit Dropbox verbinden. Die Web-App liest dann nur ihren eigenen App-Ordner in der Dropbox – nichts sonst.'); return; }
        if (!pfad()) { ansicht('fehler', 'Kein Dateipfad eingestellt.', 'Über das Zahnrad › „Dateipfad in der Dropbox ändern“ einstellen.'); return; }
        const m = await metadaten();
        kennung = m.content_hash || m.rev; stand = m.server_modified;
        if (!erzwingen && angezeigt && kennung === letzterStand) return;
        if (!angezeigt) ansicht('laden', 'Personaltabelle wird aus der Dropbox geladen …');
        bytes = await herunterladen();
      }
      letzteDatei = { bytes, stand, kennung };
      if (window.ExcelKern.istVerschluesselt(bytes) && !kennwort) { ansicht('kennwort', 'Die Personaltabelle hat ein Kennwort zum Öffnen. Bitte eingeben:'); return; }
      if (!angezeigt) ansicht('laden', 'Wird entschlüsselt …');
      await new Promise(r => setTimeout(r, 30));                     // Anzeige aktualisieren lassen
      auswerten(bytes, stand);
      letzterStand = kennung;
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
      try { await codeEinloesen(code); $a('a-code').value = ''; laden(true); }
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
    if (a === 'kennwort') { SP.set('csa-kennwort', null); hinweis('Das gespeicherte Kennwort ist gelöscht. Beim nächsten Start fragt die Web-App wieder.'); }
    if (a === 'pfad') {
      const neu = prompt('Pfad der Kopie im App-Ordner der Dropbox (beginnt mit /):', pfad());
      if (neu && neu.trim()) { SP.set('csa-pfad', neu.trim()); letzterStand = ''; angezeigt = false; laden(true); }
    }
    if (a === 'abmelden') {
      if (!confirm('Von Dropbox abmelden? Danach muss die Web-App neu verbunden werden.')) return;
      SP.set('csa-dbx-refresh', null); SP.set('csa-dbx-verifier', null); SP.set('csa-dbx-verifier-key', null);
      zugang = null; angezeigt = false; letzterStand = '';
      ansicht('dropbox', 'Einmal mit Dropbox verbinden. Die Web-App liest dann nur ihren eigenen App-Ordner in der Dropbox – nichts sonst.');
    }
  });

  // regelmäßig und beim Zurückkehren in die App auf eine neu gespeicherte Datei prüfen
  setInterval(() => { if (!document.hidden && angezeigt) laden(); }, MINUTE);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && angezeigt) laden(); });

  // Offline-Betrieb und Aktualisierung der Web-App selbst
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Betrieb weiter */ });
  }

  laden(true);
})();
