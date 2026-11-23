// „Was ist neu“: Neuigkeiten je Version (neueste zuerst). Die Startseite zeigt die neueste Version einmal als Karte,
// „Was ist neu“ im Fuß der Startseite zeigt alle. Läuft im Browser (window.GSZNeuigkeiten) und in Node (require, Tests).
'use strict';
(function (wurzel, daten) {
  if (typeof module === 'object' && module.exports) module.exports = daten;
  else wurzel.GSZNeuigkeiten = daten;
})(typeof self !== 'undefined' ? self : this, [
  { version: '2.13.0', datum: '2026-11-24', punkte: [
    'Anfahrt neu aufgebaut: Die Karte füllt den ganzen Bildschirm. Einsatzort, Stoff, Anfahrt und Hinweise sind Fenster darüber – oben antippen zum Ein- und Ausblenden, × schließt. Die Wahl merkt sich das Gerät.',
    'Einsatzstelle per Tippen auf die Karte setzen – kein Ziehen mehr. Steht schon eine Einsatzstelle, fragt die App kurz nach („Einsatzstelle hierher setzen?“), damit beim Wischen nichts verrutscht.',
    'Unten immer sichtbar: „Eintreffen in … min · Uhrzeit“ (bis zur Absperrgrenze, ohne Sonderrechte), die Anfahrtsrichtung und „Navigation starten“.',
    'Kartenart rechts oben umschaltbar: Straße (OpenStreetMap) oder Hybrid – Luftbild mit Straßen- und Ortsnamen (in Rheinland-Pfalz das amtliche Luftbild DOP20). Die Navigation übernimmt die gewählte Kartenart.',
    'Auf der Karte ist blau die Route der Navigation; eine bessere Route steht grün gestrichelt daneben, eine schlechtere grau – rot, wo sie durch den Bereich in Windrichtung führt.',
  ] },
  { version: '2.12.0', datum: '2026-11-23', punkte: [
    'Neu: Navigation in der App – Anfahrt › „Navigation starten“. Führt mit GPS über die gewählte Route, mit Abbiegehinweisen, „Danach“, Sprachansage, Restweg und Ankunftszeit – und hält an der Absperrgrenze statt an der Adresse („Absperrgrenze erreicht – hier halten“).',
    'Ist die schnellste Route ungünstig (gegen den Wind, durch den Bereich in Windrichtung), fährt die Navigation die empfohlene Ausweichroute; umschaltbar „Aus West · empfohlen“ / „Schnellste“. Abseits der Route rechnet sie neu, vor dem Bereich in Windrichtung warnt sie.',
    'Minimieren: Die Navigation läuft mit Ansagen weiter, während man z. B. das Stoffdatenblatt liest – unten führt eine Leiste zurück. Einsatztagebuch: Start und Ankunft an der Absperrgrenze mit Uhrzeit. Bei Polynt auch „Navigation zum Bereitstellungsraum“.',
    'Apple Karten und Google Maps bleiben als Ausweichweg. Auf dem iPhone bitte den Bildschirm anlassen und die App im Vordergrund – im Hintergrund bekommt eine Web-App keinen Standort.',
  ] },
  { version: '2.11.0', datum: '2026-11-23', punkte: [
    'Neu: „Anfahrt“ – als erster, blauer Knopf im Schnellzugriff der Startseite und in Einsatz › Lage. Einsatzort als Adresse, Koordinaten oder Kartenlink aus der Alarmierung eingeben (oder auf der Karte bzw. „Mein Standort“), Stoff falls schon bekannt (UN-Nr., Warntafel oder Name, auch ohne Netz).',
    'Die App holt den Wind am Einsatzort (DWD) und zeigt groß, aus welcher Richtung ihr anfahren solltet – mit dem Wind im Rücken –, dazu die Absperrgrenze: Gefahrenbereich nach Gefahrstoffkonzept RLP, ERG-Erstabsperrung, Abstände der ABC-Taschenkarte RLP (z. B. Klasse 1: 500 m, Gas im Tankwagen: 300 m) und bei Brand oder Explosionsgefahr die größeren Werte.',
    'Routenführung mit einem Tipp in Apple Karten oder Google Maps (die zuletzt benutzte App steht vorn). Vorher prüft die App die Route: Kommt sie aus der Ausbreitung (gegen den Wind) oder führt durch den Bereich in Windrichtung, warnt sie, zeigt den Abschnitt rot auf der Karte und – wenn es eine gibt – eine Ausweichroute mit Anfahrt gegen den Wind.',
    'Der Einsatzort wird Unfallort der Lagekarte und Vorschlag für „Einsatzort“ in der Einsatz-Doku; läuft ein Einsatz, steht die Anfahrt im Einsatztagebuch. Bei Polynt weist die App auf den Bereitstellungsraum laut Alarm- und Einsatzplan hin.',
    'Unterlagen in der Dropbox mit Nummern-Namen sind umbenannt (z. B. „Messstrategie Dräger 1.5“, „Permeationsliste AlphaTec 58-430“). Neue Dateien mit langen Nummern, Datum oder Kürzeln im Namen benennt der Mac-Helfer künftig selbst nach Inhalt um – geprüfte Beständigkeitslisten bleiben geprüft.',
  ] },
  { version: '2.10.1', datum: '2026-11-23', punkte: [
    'Die Titelleiste mit „Zurück“ und „Menü“ bleibt beim Scrollen oben stehen – auf allen Seiten (Einsatz, Stoff, Messen, Probenahme, Geräte, Doku, Übungen, Anwesenheit, CSA-Monitor).',
    'Simultantest-Übersicht: jedes Set mit eigenem Kopfbalken (Name, Einsatzart, Hubzahl), Rahmen und Abstand – die Sets sind klar voneinander getrennt.',
  ] },
  { version: '2.10.0', datum: '2026-11-23', punkte: [
    'Neu: „Probenahme“ – Startseite › Schnellzugriff neben „Messen“ oder Einsatz › Lage. Interaktive Anleitung für alle 22 CBRN-Probenarten der BBK-Kurzanleitung: chemisch (C01–C10), biologisch (B01–B09), radiologisch/nuklear (RN01–RN03).',
    'Je Probe: Materialliste mit Fotos zum Abhaken, Schritte A, B, C … mit den Piktogrammen der Kurzanleitung und „Erledigt“ (der nächste Schritt ist markiert), Hinweise sowie Hintergrund aus den BBK-Empfehlungen (Schutz, Dekontamination bzw. Desinfektion, Transport).',
    'Probe erfassen: Probennummer, Probenahmestelle und Bemerkung – mit Uhrzeit in der Probenliste und, wenn ein Einsatz läuft, im Einsatztagebuch. Probenbegleitschein und Probenahmeprotokoll lassen sich direkt öffnen.',
    'Übersicht: Ablauf der CBRN-Probenahme mit Rollen und Aufgaben, Checkliste für den Einsatzort zum Abhaken und die Grundsätze (Team, Durchführung, Dokumentation, Verpackung, Transport).',
    'Die Inhalte der BBK-Unterlagen liegen nur im Dropbox-App-Ordner, nicht in der öffentlichen Web-App.',
  ] },
  { version: '2.9.0', datum: '2026-11-23', punkte: [
    'Messen: Bei den Röhrchen stehen jetzt Fotos – oben unbenutzt, darunter nach der Messung mit Farbumschlag (aus den Dräger-Stoffblättern, nur im Dropbox-App-Ordner, nicht öffentlich). Ohne Foto (Säuretest, Polytest, Ethylacetat) eine Zeichnung in den Farben des Umschlags.',
    'Querempfindlichkeiten: Jedes Röhrchen nennt, was es außerdem anzeigt (mit Quelle). Neue Suche „Was soll gemessen werden?“ – z. B. „Diesel“ findet Formaldehyd 0,2/a (gelbbraune Verfärbung); dazu Treffer über die Stoffgruppe, passende Simultantest-Kanäle und was ausdrücklich nicht angezeigt wird.',
    'Messung über Querempfindlichkeit: nur als Hinweis (Verfärbung ja/nein), ohne Konzentration und ETW-Bewertung – so auch im Einsatztagebuch vermerkt.',
    'Neue Übersicht „Simultantest-Sets“: alle Sets (Leitsubstanzen, I, II, III, Begasung I und II) mit Kanälen, Markierungen, Einordnung gegen ETW und welche der 44 ETW-Stoffe sie laut Stoffblättern anzeigen.',
    'Eine begonnene Messung bleibt offen, wenn man zwischendurch in ein Stoffblatt oder eine andere Lage wechselt.',
  ] },
  { version: '2.8.1', datum: '2026-11-23', punkte: [
    'Wind: Die App nennt, warum diese DWD-Station – es ist immer die nächste Station mit Windmessung zu deinem Standort. Misst eine nähere DWD-Station keinen Wind (bei Miehlen z. B. Oberbachheim, 6,6 km), steht das dabei; der Wind kommt dann z. B. aus Geisenheim (28,2 km).',
    'Standort: Ist keine Ortung möglich, steht deutlich „Standort nicht verfügbar – Wind gilt für Miehlen“; ist die letzte Ortung älter als 15 Minuten, steht die Uhrzeit dabei.',
  ] },
  { version: '2.8.0', datum: '2026-11-23', punkte: [
    'Neues Erscheinungsbild „Leitstand“ nach einer Designvorgabe mit den neuen Design-Skills: graphitgraue, flache Flächen; Rot nur noch für die Titelleiste und Gefahr, Blau für Bedienung (Hauptknöpfe, Suche, Auswahl, aktiver Reiter), Grün für in Ordnung.',
    'Ruhigere Seiten: Abschnittsköpfe in normaler Schreibung statt gesperrter Großbuchstaben, keine bunten Kategorie-Kanten mehr (Unterlagen, Startseite, Schnellzugriff, Erste Hilfe), Abstands-Kacheln mit kleinem Farbfeld statt farbiger Kante, große Zahlen in fester Ziffernbreite.',
    'Einheitlich: ein Auswahlstil für Segmente und Filter (blau, auch bei der Ausbreitungszeit), ein Stil für alle Eingabefelder (ohne Gelb), deutlicher Fokusrahmen; Mindestschrift 13 px.',
    'iPad hochkant: Einsatzseite und Stoffübersicht schon ab 744 px zweispaltig.',
  ] },
  { version: '2.7.0', datum: '2026-11-23', punkte: [
    'Neu: „Messen“ mit Prüfröhrchen nach der Dräger-Messstrategie 1.5 – Startseite › Schnellzugriff „Messen“ oder Einsatz › Lage. Drei Lagen: unbekannter Gefahrstoff, Brand, bekannter Gefahrstoff.',
    'Unbekannter Gefahrstoff: geführter Ablauf Blatt A–E – Flüssigkeit und Universalindikator bzw. Säuretest, danach immer das nächste Röhrchen. Folgeröhrchen („falls positiv, auch Nr. …“) erscheinen automatisch, die Auswertung zeigt Hinweise und Bestätigungen.',
    'Je Röhrchen: Hubzahl mit Empfehlung, Messbereich, Messdauer und Farbumschlag, ein großer Hubzähler mit Zeit und die Querempfindlichkeiten. Das Ergebnis wird sofort gegen ETW-4 und ETW-1 (vfdb 2023) bewertet – mit Hinweis, wenn der Wert außerhalb des Messbereichs liegt.',
    'Brand: Mehrgasmessgerät, Simultantest Leitsubstanzen vfdb oder Set I (erreichte Markierung antippen) und die Einzelröhrchen. Bekannter Stoff: die 44 Stoffblätter der ETW-Liste mit Röhrchen, Hinweisen und Anzeige von PID und Ex-Sensor.',
    'Läuft ein Einsatz, steht jedes Ergebnis im Einsatztagebuch; dazu ein Messprotokoll je Messort. Auf der Stoffseite (Reiter Absperren) führt „Mit Röhrchen messen“ direkt zum passenden Röhrchen.',
  ] },
  { version: '2.6.1', datum: '2026-11-23', punkte: [
    'Anordnen geht jetzt auch ohne Ziehen: den Griff eines Geräts antippen – dann erscheinen „Nach oben“, „Nach unten“, „Einrücken“, „Ausrücken“ und die Auswahl „Untergerät von“ (nach WCAG 2.2: jede Ziehbewegung braucht eine Alternative per Antippen, z. B. mit Handschuhen).',
    'Die Leiste „Anordnen“ mit „Rückgängig“ und „Fertig“ bleibt beim Blättern oben stehen und ist dabei schmaler; der Hilfetext steht darunter.',
    'Mit der Tastatur verschwindet das gewählte Element nicht mehr hinter feststehenden Leisten (Reiterleiste der Stoffseite, Leiste der Anwesenheit, Anordnen).',
  ] },
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
