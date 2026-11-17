// „Was ist neu“: Neuigkeiten je Version (neueste zuerst). Die Startseite zeigt die neueste Version einmal als Karte,
// „Was ist neu“ im Fuß der Startseite zeigt alle. Läuft im Browser (window.GSZNeuigkeiten) und in Node (require, Tests).
'use strict';
(function (wurzel, daten) {
  if (typeof module === 'object' && module.exports) module.exports = daten;
  else wurzel.GSZNeuigkeiten = daten;
})(typeof self !== 'undefined' ? self : this, [
  { version: '2.2.3', datum: '2026-11-17', punkte: [
    'Neue Symbole auf der Startseite: Blaulicht für den Einsatz, Klemmbrett mit Abhakliste und Stoppuhr für die Übungen.',
  ] },
  { version: '2.2.2', datum: '2026-11-17', punkte: [
    'Beständigkeiten: Das farbige Band an den Geräten zeigt die Bedeutung des Zeichens jetzt vollständig (z. B. „geringe oder keine Beeinträchtigung des Materials, beständig“); die Zeile wächst mit.',
  ] },
  { version: '2.2.1', datum: '2026-11-17', punkte: [
    'Neue Piktogramme für die Reiter einer Stoffseite und kürzere Beschriftungen (Datenblatt, Beständigkeit, PSA, EH/Dekon, Absperren), die auch auf kleinen iPhones in höchstens zwei Zeilen passen.',
    'Die Karte liegt beim Scrollen nicht mehr über der Reiterleiste.',
  ] },
  { version: '2.2.0', datum: '2026-11-17', punkte: [
    'Wind vom DWD am eigenen Standort (GPS); die App zeigt, wo du gerade bist (Straße und Ort).',
    'Karte im Reiter „Wind/Absperren“: Gefahrenbereich, Erstabsperrung und Zone in Windrichtung maßstäblich auf der Karte – Grundlage ist dein Standort.',
    'Unfallort verschieben: Markierung ziehen oder „Unfallort = Kartenmitte“; „Unfallort = mein Standort“ setzt zurück.',
    'Google Maps (mit Satellit) nach Hinterlegen eines Google-Schlüssels, sonst OpenStreetMap.',
  ] },
  { version: '2.1.1', datum: '2026-11-17', punkte: [
    'Beständigkeitslisten: Anordnung der Geräte wählbar – Liste, Symbole, 2×2, 3×3, 4×4 oder Groß (wird auf dem Gerät gemerkt).',
    'Lange Überschriften passen sich der Breite an und werden nur an sinnvollen Stellen getrennt; am iPhone steht der Handschuh-Knopf nur im Kopf, wenn der Modus an ist (Schalter auf der Startseite und im ⚙-Menü).',
  ] },
  { version: '2.1.0', datum: '2026-11-17', punkte: [
    'Warntafel eintippen oder fotografieren: Gefahrnummer wird erklärt (z. B. 268 = giftiges Gas, ätzend), dazu Stoffname nach ADR und Absperrabstand – auch ohne Netz.',
    'Wind vom Deutschen Wetterdienst mit Ausbreitungsrichtung und Vorhersage; Wind vor Ort lässt sich eingeben.',
    'Bereiche nach dem Gefahrstoffkonzept Rheinland-Pfalz (Gefahrenbereich zunächst 50 m), ergänzt um Anhaltswerte des ERG 2024 je UN-Nummer (Tag/Nacht, großer Austritt, Brand) und eine Skizze in Windrichtung. Die FwDV 500 gilt nur nach Freigabe (Schieberegler mit Freigabe-PIN).',
    'Einsatz-Dokumentation: Tagebuch mit Uhrzeit, Messwerte (Ex, O₂, CO, CO₂), geöffnete Stoffe und Wind – am Ende als Bericht (Drucken/PDF) und in der Dropbox.',
    'Ohne Mac auswerten: Listen und Datenblätter direkt mit der Claude-API (eigener Schlüssel, Einstellungen › Claude ohne Mac).',
    'Eigene Sicherheitsdatenblätter stehen über die Dropbox auf allen Geräten bereit.',
    'Beständigkeitslisten: widersprüchliche Angaben und verrutschte Verweiszeilen („… siehe …“ mit eigenen Werten) werden markiert.',
    'Benachrichtigung aufs Handy, wenn der Mac-Helfer eine Liste ausgewertet oder geprüft bzw. ein Datenblatt fertig hat (Web-App vom Home-Bildschirm, ⚙ › Benachrichtigungen).',
    'Hell/Dunkel folgt dem Gerät (◐: Automatisch → Hell → Dunkel); Handschuh-Modus mit großer Schrift und großen Knöpfen an- und ausschaltbar.',
  ] },
  { version: '2.0.13', datum: '2026-11-16', punkte: ['Gerätebilder lassen sich zuschneiden und zoomen.'] },
  { version: '2.0.12', datum: '2026-11-16', punkte: ['Zeichen der Listen (z. B. ○, A) mit Kurzdefinition im Band; Liste direkt am Gerät prüfen lassen; neue Symbole für Einsatz und Übungen.'] },
  { version: '2.0.11', datum: '2026-11-16', punkte: ['Importierte Sicherheitsdatenblätter wahlweise mit Claude oder der Texterkennung lesen, mit Fortschrittsbalken.'] },
  { version: '2.0.10', datum: '2026-11-16', punkte: ['Neues Layout für alle Einsatz-Seiten; grünes bzw. rotes Band mit Zeit oder Klasse an den Geräten.'] },
]);
