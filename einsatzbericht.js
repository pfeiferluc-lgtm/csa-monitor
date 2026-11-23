// Einsatz-Dokumentation (Programm und Web-App), läuft nach einsatz.js:
//   #doku          Einsatz beginnen: Stichwort, Ort, Einsatztagebuch mit Uhrzeit, Messwerte (X-am 5000: Ex, O2, CO, CO2), geöffnete
//                  Stoffe (automatisch), Wind; Einsatz beenden → Bericht
//   #bericht/<id>  Bericht zum Drucken bzw. als PDF (heller Grund, Logo mit schwarzer Schrift), Ablage in der Dropbox
//                  (Einsatz/Einsatzberichte/<Datum Stichwort>/bericht.json und bericht.html)
// Der laufende Einsatz liegt im Gerät (localStorage) und übersteht Neustart und Funkloch; abgeschlossene Berichte im Gerätespeicher.
'use strict';
(() => {
  const E = window.GSZEinsatz, B = window.GSZBestaendigkeit, SP = window.GSZSpeicher;
  if (!E || !window.GSZ) return;
  const { esc, meldung, I } = E;
  const AKTIV = 'gsz-einsatz-aktiv';
  const p2 = n => String(n).padStart(2, '0');
  const uhr = t => { const d = new Date(t); return isNaN(d) ? '' : `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const datum = t => { const d = new Date(t); return isNaN(d) ? '' : `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`; };
  const dauer = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return (h ? h + ':' + p2(m) : String(m)) + ':' + p2(x); };
  const minuten = ms => Math.max(0, Math.round(ms / 60000));
  const neueId = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12) + '-' + Math.random().toString(36).slice(2, 6);
  const zahl = v => { const z = Number(String(v ?? '').replace(',', '.').trim()); return String(v ?? '').trim() !== '' && Number.isFinite(z) ? z : null; };

  // ---------------------------------------------------------------- Zustand
  let ein = null;
  try { ein = JSON.parse(localStorage.getItem(AKTIV) || 'null'); } catch { ein = null; }
  function sichern() { try { if (ein) localStorage.setItem(AKTIV, JSON.stringify(ein)); else localStorage.removeItem(AKTIV); } catch { /* voll/privat */ } }
  const aktiv = () => !!(ein && !ein.ende);
  function eintragen(text, art = 'notiz') { if (!ein) return; ein.tagebuch.unshift({ zeit: Date.now(), text: String(text).trim(), art }); sichern(); }

  // ---------------------------------------------------------------- Stile
  const stil = document.createElement('style');
  stil.textContent = `
  .eb-chip { display: inline-flex; align-items: center; gap: .45rem; padding: .35rem .7rem; border-radius: 999px; background: var(--crit); color: #fff;
    font-weight: 700; font-size: .85rem; text-decoration: none; box-shadow: var(--schatten); }
  .eb-chip i { width: .55rem; height: .55rem; border-radius: 50%; background: #fff; animation: eb-puls 1.6s ease-in-out infinite; }
  @keyframes eb-puls { 50% { opacity: .25; } } @media (prefers-reduced-motion: reduce) { .eb-chip i { animation: none; } }
  .eb-start { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; justify-content: space-between; }
  .eb-start b { font-size: 1.02rem; } .eb-start .ez-klein { flex-basis: 100%; }
  .eb-feld { display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; color: var(--ink2); font-weight: 600; }
  .eb-feld input, .eb-feld select, .eb-feld textarea { font: inherit; font-size: 16px; font-weight: 400; padding: .55rem .65rem; border-radius: .55rem;
    border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); width: 100%; box-sizing: border-box; }
  :root.gross .eb-feld input, :root.gross .eb-feld select, :root.gross .eb-feld textarea { font-size: 19px; }
  .eb-raster { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr)); gap: .55rem; }
  .eb-zeile { display: flex; gap: .5rem; flex-wrap: wrap; align-items: flex-end; }
  .eb-zeile > .eb-feld { flex: 1 1 12rem; }
  .eb-schnell { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .5rem; }
  .eb-schnell button { font: inherit; font-size: .8rem; padding: .35rem .6rem; border-radius: 999px; border: 1px solid var(--rand); background: var(--surface2); color: var(--ink); cursor: pointer; }
  .eb-liste { list-style: none; margin: .6rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
  .eb-liste li { display: grid; grid-template-columns: 3.2rem 1fr auto; gap: .5rem; align-items: baseline; font-size: .9rem; line-height: 1.35;
    padding: .4rem .5rem; border-radius: .5rem; background: var(--surface2); }
  .eb-liste li b.zeit { font-variant-numeric: tabular-nums; color: var(--akzent); }
  .eb-liste li button { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 1rem; }
  .eb-mess { display: flex; gap: .35rem; flex-wrap: wrap; }
  .eb-mess span { border-radius: .4rem; padding: 0 .35rem; background: var(--surface); border: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  .eb-mess span.warn { background: var(--crit-t); border-color: var(--crit); color: var(--crit); font-weight: 700; }
  /* Bericht: wie Papier (auch im dunklen Modus), beim Drucken nur der Bericht */
  .eb-papier { background: #fff; color: #111; border-radius: .6rem; padding: 1.4rem 1.5rem; box-shadow: var(--schatten); font-size: 14px; line-height: 1.45; }
  #berichtansicht .eb-papier h1, .eb-papier h1 { font-size: 1.35rem; margin: 0; color: #111; text-transform: none; letter-spacing: 0; }
  #berichtansicht .eb-papier h2, .eb-papier h2 { font-size: 1rem; margin: 1.1rem 0 .4rem; border-bottom: 1.5px solid #111; padding-bottom: .15rem; color: #111; text-transform: none; letter-spacing: 0; }
  .eb-papier table { width: 100%; border-collapse: collapse; font-size: 12.5px; } .eb-papier td, .eb-papier th { border-bottom: 1px solid #ccc; padding: .25rem .35rem; text-align: left; vertical-align: top; }
  .eb-papier .kopf { display: flex; justify-content: space-between; gap: 1rem; align-items: center; border-bottom: 3px solid #c8102e; padding-bottom: .6rem; }
  .eb-papier .kopf img { height: 64px; width: auto; }
  .eb-papier .klein { color: #555; font-size: 11.5px; } .eb-papier .warn { color: #b00020; font-weight: 700; }
  @media print {
    body[data-ansicht="bericht"] > :not(#berichtansicht), #berichtansicht > :not(.eb-papier) { display: none !important; }
    #berichtansicht { padding: 0 !important; background: #fff !important; } .eb-papier { box-shadow: none; padding: 0; border-radius: 0; }
    @page { margin: 14mm; }
  }`;
  document.head.appendChild(stil);

  // ---------------------------------------------------------------- Stoffe des Einsatzes automatisch merken (#stoff/<zvg>)
  // einsatz.js meldet jede angezeigte Stoffseite (Ereignis gsz-stoff)
  document.addEventListener('gsz-stoff', e => {
    const { zvg, stoff: s } = e.detail || {};
    if (!zvg || !s || !aktiv()) return;
    const eintrag = { zvg: String(zvg), name: E.nameSchoen(s.name), un: (s.transport && s.transport.un) || '', kemler: (s.transport && s.transport.kemler) || '', zeit: Date.now() };
    if (ein.stoffe.some(x => x.zvg === eintrag.zvg)) return;
    ein.stoffe.push(eintrag);
    eintragen(`Stoff geöffnet: ${eintrag.name}${eintrag.un ? ' (UN ' + eintrag.un + ')' : ''}`, 'stoff');
    chipZeigen();
  });

  // ---------------------------------------------------------------- Messwerte (X-am 5000: Ex, O2, CO, CO2)
  const KANAL = [
    { id: 'ex', name: 'Ex', einheit: '% UEG', auff: v => v >= 10, text: 'ab 10 % UEG' },
    { id: 'o2', name: 'O₂', einheit: 'Vol.-%', auff: v => v < 19 || v > 23, text: 'unter 19 bzw. über 23 Vol.-%' },
    { id: 'co', name: 'CO', einheit: 'ppm', auff: v => v > 30, text: 'über 30 ppm (AGW)' },
    { id: 'co2', name: 'CO₂', einheit: 'Vol.-%', auff: v => v > 0.5, text: 'über 0,5 Vol.-% (AGW)' },
  ];
  const messText = m => KANAL.filter(k => m.werte[k.id] !== null && m.werte[k.id] !== undefined)
    .map(k => `<span class="${k.auff(m.werte[k.id]) ? 'warn' : ''}" title="${k.auff(m.werte[k.id]) ? 'auffällig: ' + k.text : ''}">${k.name} ${String(m.werte[k.id]).replace('.', ',')} ${k.einheit}</span>`).join('') +
    (m.extra ? `<span>${esc(m.extra)}</span>` : '');

  // ---------------------------------------------------------------- Anzeige „Einsatz läuft“ (Einsatz-Seite, Kopf)
  function chipZeigen() {
    for (const el of document.querySelectorAll('[data-eb-chip]')) {
      el.innerHTML = aktiv() ? `<a class="eb-chip" href="#doku"><i></i>Einsatz seit ${uhr(ein.beginn)}${ein.stichwort ? ' · ' + esc(ein.stichwort) : ''}</a>` : '';
    }
    const k = document.getElementById('eb-start-karte');
    if (k) k.innerHTML = startKarteInhalt();
  }
  // Statuskarte wie in den Einsatzprogrammen: Titel, Stichwort, Zeitzeile (Beginn · Dauer · Einträge), große Knöpfe
  function startKarteInhalt() {
    if (aktiv()) {
      const min = minuten(Date.now() - ein.beginn), h = Math.floor(min / 60);
      return `<div class="eb-status laeuft"><div class="eb-titel">Einsatz läuft</div>${ein.stichwort ? `<div class="eb-stichwort">${esc(ein.stichwort)}${ein.ort ? ' · ' + esc(ein.ort) : ''}</div>` : ''}
        <div class="eb-zeiten"><div><small>Einsatzbeginn</small><b>${uhr(ein.beginn)}</b><span>${datum(ein.beginn)}</span></div>
          <div><small>Dauer</small><b>${h}:${p2(min % 60)}</b><span>Std:Min</span></div>
          <div><small>Einträge</small><b>${ein.tagebuch.length}</b><span>${ein.messungen.length} Messung${ein.messungen.length === 1 ? '' : 'en'} · ${ein.stoffe.length} Stoff${ein.stoffe.length === 1 ? '' : 'e'}</span></div></div>
        <div class="eb-knoepfe"><a class="knopf primaer" href="#doku">${I.blatt}Einsatztagebuch</a><a class="knopf" href="#lagekarte">Lagekarte</a></div></div>`;
    }
    return `<div class="eb-status"><div class="eb-titel">Kein laufender Einsatz</div>
      <div class="ez-klein">Einsatz beginnen: Tagebuch mit Uhrzeit, Messwerte, Stoffe und Wind – am Ende als Bericht (PDF) und in der Dropbox.</div>
      <div class="eb-knoepfe"><a class="knopf primaer" href="#doku">${I.plus}Einsatz beginnen</a></div></div>`;
  }
  // Karte auf der Einsatz-Seite (vor „Lage“), Chip im Kopf
  function einsatzSeiteErgaenzen() {
    const e = document.getElementById('einsatz');
    if (!e) return;
    if (!e.querySelector('#eb-start-karte')) {
      const ziel = e.querySelector('#lg-start') || e.querySelector('#ez-letzte-bereich');
      const k = document.createElement('section');
      k.className = 'kachel ez-karte'; k.id = 'eb-start-karte';
      if (ziel) ziel.before(k); else e.appendChild(k);
    }
    const kopf = e.querySelector('.ez-kopf .ez-titel');
    if (kopf && !kopf.querySelector('[data-eb-chip]')) kopf.insertAdjacentHTML('beforeend', '<div data-eb-chip style="margin-top:.3rem"></div>');
    chipZeigen();
  }
  addEventListener('hashchange', () => { if (/^#?einsatz$/.test(location.hash.replace(/^#/, '')) || location.hash === '#einsatz') setTimeout(einsatzSeiteErgaenzen, 0); });
  setInterval(() => { if (aktiv() && document.getElementById('eb-start-karte') && !document.hidden) chipZeigen(); }, 30000);

  // ---------------------------------------------------------------- Ansicht #doku
  const dEl = E.ansichtElement('dokuansicht');
  function dokuZeigen() {
    dEl.innerHTML = '';
    dEl.appendChild(E.kopf({ titel: 'Einsatz-Dokumentation', unter: aktiv() ? `läuft seit ${uhr(ein.beginn)} · ${datum(ein.beginn)}` : 'Einsatztagebuch, Messwerte, Stoffe', eltern: 'einsatz' }));
    if (!aktiv()) {
      dEl.insertAdjacentHTML('beforeend', `<section class="kachel ez-karte"><h2>Einsatz beginnen</h2>
        <div class="eb-zeile"><label class="eb-feld">Stichwort<input id="eb-stichwort" placeholder="z. B. ABC 2 – Gefahrstoffaustritt" maxlength="120" autocomplete="off"></label>
          <label class="eb-feld">Einsatzort<input id="eb-ort" placeholder="Straße, Ort" maxlength="160" autocomplete="off" value="${esc(window.GSZAnfahrt && GSZAnfahrt.ortText ? GSZAnfahrt.ortText() : '')}"></label></div>
        <p><button class="knopf" id="eb-beginnen" style="background:var(--crit);color:#fff;border-color:var(--crit)">${I.plus}Einsatz jetzt beginnen</button></p>
        <div class="ez-klein">Ab jetzt merkt sich die App jeden geöffneten Stoff mit Uhrzeit. Der Einsatz bleibt auch nach einem Neustart erhalten.</div></section>
        <section class="kachel ez-karte"><h2>Frühere Berichte</h2><div id="eb-alte"><div class="ez-leer">wird geladen …</div></div></section>`);
      dEl.querySelector('#eb-beginnen').addEventListener('click', () => {
        ein = { id: neueId(), beginn: Date.now(), stichwort: dEl.querySelector('#eb-stichwort').value.trim(), ort: dEl.querySelector('#eb-ort').value.trim(),
          tagebuch: [], messungen: [], stoffe: [], wind: [], ende: null, grundlage: window.GSZLage && GSZLage.grundlage ? GSZLage.grundlage() : 'rlp' };
        eintragen('Einsatz begonnen' + (ein.stichwort ? ': ' + ein.stichwort : ''), 'system');
        windMerken();
        dokuZeigen(); chipZeigen();
      });
      alteZeigen(dEl.querySelector('#eb-alte'));
      return;
    }
    dEl.insertAdjacentHTML('beforeend', `
      <section class="kachel ez-karte"><h2>Einsatz</h2>
        <div class="eb-zeile"><label class="eb-feld">Stichwort<input id="eb-stichwort" value="${esc(ein.stichwort)}" maxlength="120" autocomplete="off"></label>
          <label class="eb-feld">Einsatzort<input id="eb-ort" value="${esc(ein.ort)}" maxlength="160" autocomplete="off"></label></div>
        <div class="lg-knoepfe" style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.6rem"><button class="knopf" id="eb-wind">Wind festhalten</button></div>
        <div class="ez-klein" id="eb-wind-text" style="margin-top:.4rem">${ein.wind.length ? windZeile(ein.wind[ein.wind.length - 1]) : ''}</div></section>
      <section class="kachel ez-karte"><h2>Einsatztagebuch</h2>
        <form id="eb-tb" class="eb-zeile"><label class="eb-feld">Eintrag<input id="eb-tb-text" placeholder="Lage, Maßnahme, Rückmeldung …" maxlength="400" autocomplete="off" enterkeyhint="send"></label>
          <button class="knopf" type="submit">Eintragen</button></form>
        <div class="eb-schnell">${['Erkundung abgeschlossen', 'Gefahrenbereich festgelegt', 'Absperrung steht', 'Dekon-Platz aufgebaut', 'Messung begonnen', 'Nachalarmierung', 'Lagemeldung an ELW', 'Stoff identifiziert']
          .map(t => `<button type="button" data-schnell="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <ul class="eb-liste" id="eb-tb-liste"></ul></section>
      <section class="kachel ez-karte"><h2>Messwerte <small style="font-weight:400;color:var(--muted)">X-am 5000</small></h2>
        <form id="eb-mess"><div class="eb-raster">${KANAL.map(k => `<label class="eb-feld">${k.name} (${k.einheit})<input inputmode="decimal" data-kanal="${k.id}" autocomplete="off"></label>`).join('')}</div>
          <div class="eb-zeile" style="margin-top:.5rem"><label class="eb-feld">Messpunkt<input id="eb-mess-ort" placeholder="z. B. Kanaldeckel Hauptstraße, 20 m in Windrichtung" maxlength="160" autocomplete="off"></label>
            <label class="eb-feld">Weiterer Wert<input id="eb-mess-extra" placeholder="z. B. PID 12 ppm, pH 2" maxlength="120" autocomplete="off"></label>
            <button class="knopf" type="submit">Messung eintragen</button></div></form>
        <ul class="eb-liste" id="eb-mess-liste"></ul>
        <div class="ez-klein" style="margin-top:.4rem">Rot markiert: Ex ab 10 % UEG, O₂ unter 19 bzw. über 23 Vol.-%, CO über 30 ppm, CO₂ über 0,5 Vol.-% (AGW).</div></section>
      <section class="kachel ez-karte"><h2>Stoffe</h2><ul class="eb-liste" id="eb-stoffe"></ul>
        <div class="ez-klein" style="margin-top:.4rem">Jeder während des Einsatzes geöffnete Stoff kommt automatisch hierher.</div></section>
      <section class="kachel ez-karte"><h2>Einsatz beenden</h2>
        <p class="ez-klein" style="margin-top:0">Danach entsteht der Bericht (Drucken bzw. PDF) und wird – mit Dropbox-Verbindung – unter Einsatz › Einsatzberichte abgelegt.</p>
        <button class="knopf" id="eb-ende">Einsatz beenden und Bericht erstellen</button> <button class="knopf" id="eb-verwerfen">Verwerfen</button></section>`);
    const st = dEl.querySelector('#eb-stichwort'), ort = dEl.querySelector('#eb-ort');
    st.addEventListener('change', () => { ein.stichwort = st.value.trim(); sichern(); chipZeigen(); });
    ort.addEventListener('change', () => { ein.ort = ort.value.trim(); sichern(); });
    dEl.querySelector('#eb-tb').addEventListener('submit', e => { e.preventDefault(); const f = dEl.querySelector('#eb-tb-text'); if (!f.value.trim()) return; eintragen(f.value); f.value = ''; listenZeigen(); });
    for (const b of dEl.querySelectorAll('[data-schnell]')) b.addEventListener('click', () => { eintragen(b.dataset.schnell); listenZeigen(); meldung('Eingetragen: ' + b.dataset.schnell, 2000); });
    dEl.querySelector('#eb-mess').addEventListener('submit', e => {
      e.preventDefault();
      const werte = {};
      for (const f of dEl.querySelectorAll('[data-kanal]')) werte[f.dataset.kanal] = zahl(f.value);
      const extra = dEl.querySelector('#eb-mess-extra').value.trim(), mOrt = dEl.querySelector('#eb-mess-ort').value.trim();
      if (Object.values(werte).every(v => v === null) && !extra) { meldung('Bitte mindestens einen Messwert eintragen.'); return; }
      ein.messungen.unshift({ zeit: Date.now(), werte, extra, ort: mOrt });
      sichern();
      for (const f of dEl.querySelectorAll('[data-kanal]')) f.value = '';
      dEl.querySelector('#eb-mess-extra').value = '';
      listenZeigen();
    });
    dEl.querySelector('#eb-wind').addEventListener('click', async () => { await windMerken(true); dEl.querySelector('#eb-wind-text').innerHTML = ein.wind.length ? windZeile(ein.wind[ein.wind.length - 1]) : 'Wind nicht abrufbar.'; });
    dEl.querySelector('#eb-ende').addEventListener('click', beenden);
    dEl.querySelector('#eb-verwerfen').addEventListener('click', () => { if (!confirm('Laufenden Einsatz verwerfen? Alle Einträge gehen verloren.')) return; ein = null; sichern(); chipZeigen(); dokuZeigen(); });
    listenZeigen();
  }
  function listenZeigen() {
    const tb = dEl.querySelector('#eb-tb-liste'), ml = dEl.querySelector('#eb-mess-liste'), sl = dEl.querySelector('#eb-stoffe');
    if (!tb || !ein) return;
    tb.innerHTML = ein.tagebuch.map((t, i) => `<li><b class="zeit">${uhr(t.zeit)}</b><span>${esc(t.text)}</span>${t.art === 'system' ? '<span></span>' : `<button type="button" data-weg-tb="${i}" aria-label="Eintrag löschen">×</button>`}</li>`).join('') || '<li><span></span><span class="ez-klein">noch keine Einträge</span></li>';
    ml.innerHTML = ein.messungen.map((m, i) => `<li><b class="zeit">${uhr(m.zeit)}</b><span><span class="eb-mess">${messText(m)}</span>${m.ort ? `<span class="ez-klein">${esc(m.ort)}</span>` : ''}</span><button type="button" data-weg-mess="${i}" aria-label="Messung löschen">×</button></li>`).join('');
    sl.innerHTML = ein.stoffe.map(s => `<li><b class="zeit">${uhr(s.zeit)}</b><a href="#stoff/${esc(s.zvg)}">${esc(s.name)}${s.un ? ' · UN ' + esc(s.un) : ''}</a><span></span></li>`).join('') || '<li><span></span><span class="ez-klein">noch keine</span></li>';
    for (const b of tb.querySelectorAll('[data-weg-tb]')) b.addEventListener('click', () => { ein.tagebuch.splice(Number(b.dataset.wegTb), 1); sichern(); listenZeigen(); });
    for (const b of ml.querySelectorAll('[data-weg-mess]')) b.addEventListener('click', () => { ein.messungen.splice(Number(b.dataset.wegMess), 1); sichern(); listenZeigen(); });
  }
  const windZeile = w => w ? `Wind ${uhr(w.zeit)}: aus ${esc(w.text)}${w.kmh !== null && w.kmh !== undefined ? `, ${Math.round(w.kmh)} km/h` : ''} (${esc(w.quelle)})` : '';
  async function windMerken(laut = false) {
    if (!ein || !window.GSZLage || !window.GSZGefahrgut) return;
    try {
      let man = null; try { man = JSON.parse(localStorage.getItem('gsz-wind-manuell') || 'null'); } catch { man = null; }
      const w = man && Date.now() - man.zeit < 6 * 3600 * 1000 ? { richtung: man.richtung, kmh: null, quelle: 'vor Ort bestimmt' } : await GSZLage.wind();
      const r = GSZGefahrgut.himmelsrichtung(w.richtung);
      ein.wind.push({ zeit: Date.now(), richtung: w.richtung, kmh: w.kmh ?? null, text: `${GSZGefahrgut.RICHTUNG_LANG[r] || r} (${Math.round(w.richtung)}°)`,
        quelle: w.quelle || (w.station ? 'DWD ' + w.station.name : 'DWD') });
      sichern();
      if (laut) eintragen('Wind festgehalten: aus ' + ein.wind[ein.wind.length - 1].text, 'system');
    } catch (e) { if (laut) meldung('Wind nicht abrufbar: ' + e.message, 5000); }
  }
  async function beenden() {
    if (!aktiv()) return;
    if (!confirm('Einsatz jetzt beenden und den Bericht erstellen?')) return;
    ein.ende = Date.now();
    eintragen('Einsatz beendet', 'system');
    const bericht = ein;
    ein = null; sichern(); chipZeigen();
    await SP.setze('meta', 'bericht:' + bericht.id, bericht).catch(() => {});
    GSZ.zeige('bericht/' + bericht.id);
    ablegen(bericht);
  }
  async function alteZeigen(el) {
    let l = [];
    try { l = (await SP.alle('meta')).filter(x => String(x.schluessel).startsWith('bericht:')).map(x => x.wert).sort((a, b) => b.beginn - a.beginn); } catch { l = []; }
    el.innerHTML = l.length ? `<ul class="eb-liste">${l.slice(0, 30).map(b => `<li><b class="zeit">${uhr(b.beginn)}</b><a href="#bericht/${esc(b.id)}">${datum(b.beginn)} · ${esc(b.stichwort || 'ohne Stichwort')}</a>
      <span class="ez-klein">${b.abgelegt ? '✓ Dropbox' : ''}</span></li>`).join('')}</ul>` : '<div class="ez-leer">Noch keine Berichte auf diesem Gerät.</div>';
  }
  GSZ.ansicht('doku', { element: dEl, titel: () => 'Einsatz-Dokumentation', anzeigen() { dokuZeigen(); } });

  // ---------------------------------------------------------------- Bericht (#bericht/<id>)
  const bEl = E.ansichtElement('berichtansicht');
  const LOGO_HELL = () => { const i = document.querySelector('.kopfleiste .logo-hell'); return i && i.getAttribute('src') ? i.getAttribute('src') : ''; };
  function berichtHtml(b) {
    const logo = LOGO_HELL();
    const zeile = (z, t) => `<tr><td style="width:4.2rem;white-space:nowrap">${z}</td><td>${t}</td></tr>`;
    return `<article class="eb-papier">
      <div class="kopf"><div><h1>Einsatzbericht Gefahrstoffzug</h1><div>${esc(b.stichwort || 'ohne Stichwort')}${b.ort ? ' · ' + esc(b.ort) : ''}</div>
        <div class="klein">${datum(b.beginn)}, ${uhr(b.beginn)} bis ${b.ende ? uhr(b.ende) : 'läuft'} Uhr${b.ende ? ` · Dauer ${minuten(b.ende - b.beginn)} min` : ''}</div>
        <div class="klein">Bereiche nach ${b.grundlage === 'fwdv500' ? 'FwDV 500 (freigegeben)' : 'Gefahrstoffkonzept Rheinland-Pfalz'}</div></div>
        ${logo ? `<img src="${logo}" alt="GSZ Rhein-Lahn-Kreis">` : ''}</div>
      ${b.stoffe.length ? `<h2>Stoffe</h2><table>${b.stoffe.map(s => zeile(uhr(s.zeit), `${esc(s.name)}${s.un ? ' · UN ' + esc(s.un) : ''}${s.kemler ? ' · Gefahrnummer ' + esc(s.kemler) : ''}`)).join('')}</table>` : ''}
      ${b.wind.length ? `<h2>Wind</h2><table>${b.wind.map(w => zeile(uhr(w.zeit), `aus ${esc(w.text)}${w.kmh !== null && w.kmh !== undefined ? ', ' + Math.round(w.kmh) + ' km/h' : ''} – ${esc(w.quelle)}`)).join('')}</table>` : ''}
      ${b.messungen.length ? `<h2>Messwerte</h2><table><tr><th>Zeit</th><th>Werte</th><th>Messpunkt</th></tr>${[...b.messungen].reverse().map(m => `<tr><td>${uhr(m.zeit)}</td><td>${KANAL.filter(k => m.werte[k.id] !== null && m.werte[k.id] !== undefined)
        .map(k => `<span class="${k.auff(m.werte[k.id]) ? 'warn' : ''}">${k.name} ${String(m.werte[k.id]).replace('.', ',')} ${k.einheit}</span>`).join(' · ')}${m.extra ? ' · ' + esc(m.extra) : ''}</td><td>${esc(m.ort || '')}</td></tr>`).join('')}</table>` : ''}
      <h2>Einsatztagebuch</h2><table>${[...b.tagebuch].reverse().map(t => zeile(uhr(t.zeit), esc(t.text))).join('')}</table>
      <p class="klein" style="margin-top:1.2rem">Erstellt mit der App „Gefahrstoffzug TE Miehlen“ · ${datum(Date.now())} ${uhr(Date.now())}</p></article>`;
  }
  async function berichtZeigen(id) {
    bEl.innerHTML = '';
    bEl.appendChild(E.kopf({ titel: 'Einsatzbericht', unter: 'Drucken oder als PDF sichern', eltern: 'doku' }));
    const b = await SP.hole('meta', 'bericht:' + id).catch(() => null);
    if (!b) { bEl.insertAdjacentHTML('beforeend', '<div class="ez-leer">Bericht nicht gefunden.</div>'); return; }
    bEl.insertAdjacentHTML('beforeend', `<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="knopf" id="eb-drucken">${I.teilen}Drucken / als PDF</button>
      <button class="knopf" id="eb-ablegen">${b.abgelegt ? '✓ In der Dropbox – erneut ablegen' : 'In der Dropbox ablegen'}</button>
      <button class="knopf" id="eb-loeschen">${I.muell}Vom Gerät löschen</button></div>` + berichtHtml(b));
    bEl.querySelector('#eb-drucken').addEventListener('click', () => window.print());
    bEl.querySelector('#eb-ablegen').addEventListener('click', () => ablegen(b, true));
    bEl.querySelector('#eb-loeschen').addEventListener('click', async () => { if (!confirm('Bericht von diesem Gerät löschen? (Die Ablage in der Dropbox bleibt.)')) return;
      await SP.loesche('meta', 'bericht:' + id).catch(() => {}); GSZ.zeige('doku'); });
  }
  async function ablegen(b, laut = false) {
    const a = E.ad();
    if (!a || !a.verbunden() || !a.ablegen) { if (laut) meldung('Nicht mit der Dropbox verbunden – der Bericht bleibt auf diesem Gerät.', 6000); return; }
    const name = `${new Date(b.beginn).toISOString().slice(0, 10)} ${uhr(b.beginn).replace(':', '-')} ${String(b.stichwort || 'Einsatz').replace(/[\/\\:*?"<>|]/g, '-').slice(0, 60)}`.trim();
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Einsatzbericht ${esc(name)}</title><style>${stil.textContent.replace(/@media print[\s\S]*$/, '')}
      body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:1rem;background:#eee}.eb-papier{max-width:50rem;margin:auto}</style></head><body>${berichtHtml(b)}</body></html>`;
    const sauber = { ...b };
    try {
      await a.ablegen('Einsatzberichte', name, [{ name: 'bericht.json', blob: new Blob([JSON.stringify(sauber, null, 1)], { type: 'application/json' }) },
        { name: 'bericht.html', blob: new Blob([html], { type: 'text/html' }) }]);
      b.abgelegt = Date.now();
      await SP.setze('meta', 'bericht:' + b.id, b).catch(() => {});
      meldung('Bericht in der Dropbox abgelegt: Einsatz › Einsatzberichte › ' + name, 6000);
      if (GSZ.aktuell.ansicht === 'bericht') berichtZeigen(b.id);
    } catch (e) { meldung('Ablage nicht möglich: ' + e.message + ' – der Bericht bleibt auf diesem Gerät.', 8000); }
  }
  GSZ.ansicht('bericht', { element: bEl, titel: () => 'Einsatzbericht', anzeigen(p) { berichtZeigen(decodeURIComponent(p || '')); } });

  // Einsatz-Seite ergänzen, sobald sie aufgebaut ist
  const beobachter = new MutationObserver(() => { const e = document.getElementById('einsatz'); if (e && e.firstChild && !e.querySelector('#eb-start-karte')) einsatzSeiteErgaenzen(); });
  beobachter.observe(document.body, { childList: true, subtree: true });
  window.GSZBericht = { aktiv, get einsatz() { return ein; }, eintragen, berichtHtml, KANAL };
})();
