// „Was ist neu“: Neuigkeiten je Version (neueste zuerst). Die Startseite zeigt die neueste Version einmal als Karte,
// „Was ist neu“ im Fuß der Startseite zeigt alle. Läuft im Browser (window.GSZNeuigkeiten) und in Node (require, Tests).
'use strict';
(function (wurzel, daten) {
  if (typeof module === 'object' && module.exports) module.exports = daten;
  else wurzel.GSZNeuigkeiten = daten;
})(typeof self !== 'undefined' ? self : this, [
  { version: '2.6.0', datum: '2026-11-23', punkte: [
    'Untergeräte: Zubehör lässt sich einem Gerät unterordnen – z. B. die Schläuche unter die Schlauchpumpe. Es steht dann eingerückt darunter: in der Übersicht der Beständigkeitslisten, im Reiter „Beständigkeit“ eines Stoffs (Pumpe und Schläuche direkt untereinander) und auf der Geräteseite („Teil von“ bzw. „Untergeräte“).',
    'Beständigkeitslisten › „Anordnen“: Geräte am Griff frei in die gewünschte Reihenfolge ziehen (Finger oder Maus). Auf die Mitte eines anderen Geräts gezogen, wird es dessen Untergerät; an den oberen oder unteren Rand gezogen, steht es davor bzw. dahinter. Mit „Rückgängig“ zurücknehmen; auch per Tastatur (Pfeiltasten am Griff).',
    'Reihenfolge und Untergeräte gelten für alle Geräte (zentral im Dropbox-App-Ordner); die Ordner der Geräte bleiben unverändert. Untergerät lässt sich auch beim Bearbeiten eines Geräts wählen („Untergerät von“).',
    'Besser lesbar nach einer Barrierefreiheitsprüfung (WCAG 2.1 AA): Alle Texte haben genug Kontrast zum Grund – Statusschilder (beständig, bedingt, nicht beständig), „GEFAHR“, AEGL-Schilder und ausgewählte Knöpfe in kräftigeren Farben, graue Hinweise etwas dunkler.',
    'Alle Knöpfe, Filter und Eingabefelder sind mindestens 44 Bildpunkte groß – gut mit Handschuhen zu treffen.',
    'Die aktuelle Tag/Nacht-Angabe der ERG-Abstände ist mit „· jetzt“ markiert statt unterstrichen (sah aus wie ein Link); „Kein laufender Einsatz“ ist zurückhaltender, der rote Knopf ist die Aufforderung.',
  ] },
  { version: '2.5.0', datum: '2026-11-18', punkte: [
    'Neues Erscheinungsbild für das ganze Programm nach dem Vorbild verkaufter Einsatzprogramme (EinsatzTablet und EinsatzApp von Feuer Software, fireplan.pad, DIVERA 24/7, Tablet Command): rote Titelleiste auf allen Seiten, ruhige Flächen mit Kopfstreifen, Listen mit farbiger Kante, große Schaltflächen.',
    'Startseite: Schnellzugriff als Symbolraster (Stoff suchen, Warntafel, Lagekarte, Beständigkeit, Einsatz-Doku, Unterlagen, CSA-Monitor, Anwesenheit).',
    'Einsatz: Statusfläche wie in der EinsatzApp – „Einsatz läuft“ mit Zeitzeile (Beginn, Dauer, Einträge) und großen Knöpfen; Unterlagen als Liste.',
    'Tablet und Computer: Einsatzseite und Stoffübersicht zweispaltig (links Suche, Einsatz und Lage, rechts Unterlagen bzw. Kennwerte).',
    'Stoffseite: Kennwerte als Bezeichnung–Wert-Zeilen, Reiterleiste unten mit roter Markierung; CSA-Monitor und Übungen mit derselben roten Leiste.',
  ] },
  { version: '2.4.1', datum: '2026-11-18', punkte: [
    'Windy ist wieder ausgebaut: Der Wind kommt nur noch vom DWD (Messung der nächsten Station, frei, ohne Schlüssel).',
  ] },
  { version: '2.4.0', datum: '2026-11-18', punkte: [
    'Sachlicheres Aussehen nach dem Vorbild professioneller Einsatzprogramme: schlichte Kopfleiste passend zu Hell und Dunkel (hell mit dem Logo in schwarzer Schrift), keine Warnstreifen und Farbverläufe mehr, ruhige Reiterleiste. Farbe steht nur noch für eine Bedeutung.',
    'Startseite: Lagezeile mit laufendem Einsatz und aktuellem Wind; Einsatz und Übungen als schlichte Kacheln.',
    'Neue Lagekarte (Einsatz › Lage › Lagekarte): Unfallort, Wind, Gefahrenbereich und Ausbreitungsolive schon, bevor der Stoff bekannt ist.',
    'Karte im Vollbild: Zeit und Öffnungswinkel liegen dann unten auf der Karte, „Schließen“ oben rechts.',
    'Beständigkeitsliste eines Geräts: die Spalten, die für unser Gerät gelten, stehen vorn gleich nach dem Stoff und sind eingerahmt; die Stoffspalte bleibt beim seitlichen Wischen stehen.',
    'Auf dem iPhone lässt sich die Seite nicht mehr über den Rand hinausziehen.',
  ] },
  { version: '2.3.0', datum: '2026-11-18', punkte: [
    'Ausbreitungsolive auf der Karte (Reiter „Absperren“): Keule in Zugrichtung mit dem aktuellen Wind. Knöpfe 5, 10, 15, 30 und 60 min zeigen, wie weit die Wolkenfront dann ist; „seit Austritt“ zeigt sie jetzt und läuft mit; „aus“ blendet sie aus.',
    'Öffnungswinkel wählbar: 90°, solange Stoff und Menge unbekannt sind, sonst 60° oder 45° nach MET (Stufenmodell der vfdb-Richtlinie 10/05). Bei Windstille ein Kreis von 500 m (bis 1000 m).',
    'Alles auf der Karte ist beschriftet: Gefahrenbereich, Absperrbereich, ERG-Erstabsperrung, ERG-Zone und die Olive mit Zeit und Länge. Weit herausgezoomt stehen die Kreise gesammelt am Unfallort.',
    'Winddaten wählbar: DWD (Messung der nächsten Station, frei) oder Windy (Modellvorhersage genau am Standort, z. B. ICON-D2; braucht einen Windy-Schlüssel, der für alle Geräte gilt). Dazu „Windy-Karte öffnen“.',
  ] },
  { version: '2.2.5', datum: '2026-11-17', punkte: [
    'Fußnoten der Beständigkeitslisten: Die Prüfung beachtet sie jetzt. Fehlt in der Übertragung nur ein Fußnotenzeichen („+“ statt „+⁵“), zählt das nicht mehr als Abweichung – das Zeichen wird ergänzt.',
    'Auf der Geräteseite stehen die Fußnoten der Liste im Wortlaut unter der Tabelle, an jeder betroffenen Zeile steht der Text der Fußnote (z. B. „5 · FKM: FKM in säurebeständiger Ausführung“). In den Beständigkeiten eines Stoffs erscheint er, wenn er eine Spalte des Geräts betrifft.',
    'Ältere Prüfergebnisse, die nur fehlende Fußnotenzeichen melden, lassen sich mit einem Knopf übernehmen.',
    'Fasspumpe Lutz (Ansaugrohr): Die 16 gemeldeten „Abweichungen“ waren nur Fußnotenzeichen – am Original bestätigt und übernommen, Fußnoten 1–7 ergänzt.',
  ] },
  { version: '2.2.4', datum: '2026-11-17', punkte: [
    'Prüfung einer Beständigkeitsliste: Bei Abweichungen auf der Geräteseite je Punkt wählen, welche Angabe stimmt – „Liste stimmt“, „Original“ oder ein eigener Wert; fehlende Zeilen ergänzen oder verwerfen. Sind alle entschieden, gilt die Liste als geprüft.',
    'Wichtige Korrektur: Bedeutet „-“ laut Legende einer Liste „unbeständig“ (Lutz-Fasspumpe), zeigt die App das jetzt rot statt grau („keine Angabe“) – betrifft 17 Stoffe der Lutz-Pumpe.',
    'Werte mit Fußnotenzeichen (z. B. „+⁵“) werden richtig eingestuft.',
  ] },
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
