// Stoffinformationen der Dräger-Messstrategie 1.5 (Kapitel III, 44 Stoffe der ETW-Liste) – übertragen aus den Stoffblättern.
// CAS, UN und ETW nach vfdb-RL 10/01, Anlage 1 (Stand Januar 2023); Abweichungen des Stoffblatts stehen in „anm“.
// Felder: simultan = [Set I, Set II, Set III, Leitsubstanzen Brandrauch]; pid = [Smart PID, Responsefaktor, PID HC, Responsefaktor];
// ex = [katalytisch, infrarot]; catex = [Anzeige bei 50 % UEG mit Methan-, mit Nonan-Justage]; nfpa = [Gesundheit, Brand, Reaktion, Besonders]
'use strict';
(function (wurzel, daten) {
  if (typeof module === 'object' && module.exports) module.exports = daten;
  else wurzel.GSZMessStoffe = daten;
})(typeof self !== 'undefined' ? self : this, [
 {
  "name": "Aceton",
  "cas": "67-64-1",
  "un": "1090",
  "etw1": null,
  "etw4": 500.0,
  "einheit": "ppm",
  "ueg": "2,5 Vol.-%",
  "nfpa": [
   "1",
   "3",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "süßlich",
  "aggregat": "flüssig",
  "flammpunkt": "-20 °C",
  "zuendtemperatur": "528 °C",
  "roehrchen": [
   {
    "name": "Aceton 100/b",
    "bestellnr": "CH22901",
    "huebe": "10",
    "messdauer": "240",
    "umschlag": "hellgelb → gelb",
    "stufen": [
     {
      "n": 10,
      "s": 240
     }
    ],
    "nr": 8
   }
  ],
  "messung": "",
  "auswertung": "Andere Ketone werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Aldehyde werden ebenfalls angezeigt, nicht jedoch Ester. Ammoniak stört die Anzeige durch eine gelb-braune Färbung der Anzeigeschicht.",
  "polytest": "ab 2000 ppm",
  "simultan": [
   "Nein",
   "Nein",
   "Ja",
   "Nein"
  ],
  "pid": [
   "Ja",
   "ACTO/1,15",
   "Ja",
   "ACET/1,04"
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "31 % UEG",
   "größer Messbereich (Wert über 100 % UEG)"
  ],
  "cms": "Aceton 40 – 600 ppm (Bestellnummer 6406470)",
  "microtube": "Messbereich: 25 – 5000 ppm / Messdauer: 20 – 500 s / Temperatur: 0 – 30 °C (Bestellnummer 8610470)",
  "seite": 25,
  "anm": []
 },
 {
  "name": "Acrolein",
  "cas": "107-02-8",
  "un": "1092",
  "etw1": 0.1,
  "etw4": 0.1,
  "einheit": "ppm",
  "ueg": "2,8 Vol.-%",
  "nfpa": [
   "4",
   "3",
   "3",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "flüssig",
  "flammpunkt": "-26 °C",
  "zuendtemperatur": "215 °C",
  "roehrchen": [
   {
    "name": "Formaldehyd 0,2/a",
    "bestellnr": "6733081",
    "huebe": "10 o. 20",
    "messdauer": "90 o. 180",
    "umschlag": "weiß → rosa",
    "stufen": [
     {
      "n": 10,
      "s": 90
     },
     {
      "n": 20,
      "s": 180
     }
    ],
    "nr": 14
   }
  ],
  "messung": "Durch Schrumpfschlauch verdeckte innere Röhrchenspitzen abbrechen; dazu ein Röhrchenende festhalten und das andere so weit biegen, bis die innere Spitze abbricht. Den Vorgang für die zweite Spitze wiederholen. Danach äußere Röhrchenenden öffnen Acrolein ist mit diesem Röhrchen nur schwer messbar – ggf. Hubzahl erhöhen",
  "auswertung": "Styrol, Vinylacetat und Acetaldehyd werden mit gelbbrauner Farbe ebenfalls angezeigt. Acrolein, Dieselkraftstoff und Furfurylalkohol werden mit gelbbrauner Farbe ebenfalls angezeigt. Eine quantitative Messung von Acrolein ist u.a. aufgrund der hohen Stoffreaktivität nicht zuverlässig möglich und sollte durch andere Messtechnik erfolgen.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Ja",
   "ACRO/3,58"
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 26,
  "anm": []
 },
 {
  "name": "Acrylnitril",
  "cas": "107-13-1",
  "un": "1093",
  "etw1": 1.7,
  "etw4": 0.48,
  "einheit": "ppm",
  "ueg": "2,8 Vol.-%",
  "nfpa": [
   "4",
   "3",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "flüssig",
  "flammpunkt": "-5 °C",
  "zuendtemperatur": "480 °C",
  "roehrchen": [
   {
    "name": "Acrylnitril 0,2/a",
    "bestellnr": "8103701",
    "huebe": "5 o. 20",
    "messdauer": "60 o. 240",
    "umschlag": "gelb → rot",
    "stufen": [
     {
      "n": 5,
      "s": 60
     },
     {
      "n": 20,
      "s": 240
     }
    ]
   }
  ],
  "messung": "Durch Schrumpfschlauch verdeckte innere Röhrchenspitzen abbrechen; dazu ein Röhrchenende festhalten und das andere so weit biegen, bis die innere Spitze abbricht. Den Vorgang für die zweite Spitze wiederholen. Danach äußere Röhrchenenden öffnen. Zwei Messbereiche!",
  "auswertung": "Bei 4 ppm Acrylnitril kein Einfluss durch: 1000 ppm Aceton, 20 ppm Benzol, 1000 ppm Ethylacetat. In Gegenwart von 500 ppm Ethanol, 1000 ppm n-Hexan oder 100 ppm Toluol wird Acrylnitril mit geringerer Empfindlichkeit angezeigt und eine Konzentrationsbestimmung ist nicht möglich. In Gegenwart von 400 ppm Butadien wird die Anzeige von 4 ppm Acrylnitril weitgehend unterdrückt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 27,
  "anm": []
 },
 {
  "name": "Ammoniak",
  "cas": "7664-41-7",
  "un": "1005",
  "etw1": 160.0,
  "etw4": 110.0,
  "einheit": "ppm",
  "ueg": "15,4 Vol.-%",
  "nfpa": [
   "3",
   "1",
   "0",
   ""
  ],
  "gasdichte": "leichter als Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "630 °C",
  "roehrchen": [
   {
    "name": "Ammoniak 5/a",
    "bestellnr": "CH20501",
    "huebe": "1 o. 10",
    "messdauer": "10 o. 60",
    "umschlag": "gelb → blau",
    "stufen": [
     {
      "n": 1,
      "s": 10
     },
     {
      "n": 10,
      "s": 60
     }
    ],
    "nr": 2
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Andere basische Stoffe wie z. B. organische Amine werden ebenfalls angezeigt. Keine Störung der Anzeige durch: 300 ppm Nitrose Gase, 2000 ppm Schwefeldioxid, 2000 ppm Schwefelwasserstoff.",
  "polytest": "Nein",
  "simultan": [
   "Ja",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   ">15",
   "Ja",
   "RF über dem definierten Limit"
  ],
  "ex": [
   "Ja",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "57 % UEG",
   "größer Messbereich (Wert über 100 % UEG)"
  ],
  "cms": "Ammoniak 100 – 2000 ppm (Bestellnummer 6406570)",
  "microtube": "Messbereich: 1 – 100 ppm / Messdauer: 3 – 45 s / Temperatur: 0 - 40 °C (Bestellnummer 8610020)",
  "seite": 28,
  "anm": []
 },
 {
  "name": "Anilin",
  "cas": "62-53-3",
  "un": "1547",
  "etw1": 12.0,
  "etw4": 3.0,
  "einheit": "ppm",
  "ueg": "1,2 Vol.-%",
  "nfpa": [
   "3",
   "2",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "aminartig",
  "aggregat": "flüssig",
  "flammpunkt": "76 °C",
  "zuendtemperatur": "630 °C",
  "roehrchen": [
   {
    "name": "Anilin 0,5/a",
    "bestellnr": "6733171",
    "huebe": "20",
    "messdauer": "240",
    "umschlag": "hellgelb → hellgrün",
    "stufen": [
     {
      "n": 20,
      "s": 240
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Bei gleichzeitiger Anwesenheit methylierter Aniline kann Anilin allein nicht gemessen werden. Ether, Ketone, Ester, Aromaten und Benzine werden ebenfalls an gezeigt, jedoch mit unterschiedlicher Empfindlichkeit.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "1,9",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 29,
  "anm": []
 },
 {
  "name": "Arsenwasserstoff",
  "cas": "7784-42-1",
  "un": "2188",
  "etw1": 0.17,
  "etw4": 0.04,
  "einheit": "ppm",
  "ueg": "3,9 Vol.-%",
  "nfpa": [
   "4",
   "4",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "geruchlos, infolge von Verunreinigungen oft unangenehm knoblauchartig",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "285 °C",
  "roehrchen": [
   {
    "name": "Arsenwasserstoff 0,05/a",
    "bestellnr": "CH25001",
    "huebe": "20",
    "messdauer": "360",
    "umschlag": "weiß → grauviolett",
    "stufen": [
     {
      "n": 20,
      "s": 360
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "0,04 ppm Arsenwasserstoff führen zu einer Anzeige knapp unter der 0,05 ppm Markierung. Phosphorwasserstoff und Antimonwasserstoff werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Schwefelwasserstoff, Mercaptane, Ammoniak und Salzsäure stören im Bereich ihrer AGW-Werte nicht. Kohlenstoffmonoxid und Schwefeldioxid stören im Bereich ihrer AGW-Werte ebenfalls nicht.",
  "polytest": "ab 1 ppm",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 30,
  "anm": []
 },
 {
  "name": "Benzol",
  "cas": "71-43-2",
  "un": "1114",
  "etw1": null,
  "etw4": 20.0,
  "einheit": "ppm",
  "ueg": "1,2 Vol.-%",
  "nfpa": [
   "2",
   "3",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "charakteristisch",
  "aggregat": "flüssig",
  "flammpunkt": "-11 °C",
  "zuendtemperatur": "555 °C",
  "roehrchen": [
   {
    "name": "Benzol 5/b",
    "bestellnr": "6728071",
    "huebe": "20",
    "messdauer": "480",
    "umschlag": "weiß → braungrün",
    "stufen": [
     {
      "n": 20,
      "s": 480
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Viele Benzinkohlenwasserstoffe werden ebenfalls angezeigt, jedoch alle mit unterschiedlicher Empfindlichkeit. Eine Differenzierung ist nicht möglich. Andere Aromaten werden ebenfalls angezeigt.",
  "polytest": "ab 50 ppm",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "BENZ/0,62",
   "Ja",
   "C6H6/0,50"
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "25 % UEG",
   "85 % UEG"
  ],
  "cms": "Benzol 10 – 250 ppm (Bestellnummer 6406280)",
  "microtube": "Messbereich: 1 – 150 ppb / Messdauer: 100 – 900 s / Temperatur: 10 – 30 °C (Bestellnummer 8610600)",
  "seite": 31,
  "anm": []
 },
 {
  "name": "Carbonylchlorid (Phosgen)",
  "cas": "75-44-5",
  "un": "1076",
  "etw1": 0.3,
  "etw4": 0.08,
  "einheit": "ppm",
  "ueg": "n.b",
  "nfpa": [
   "4",
   "0",
   "1",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "in hoher Verdünnung süßlicher, konzentriert fauliger Obstgeruch",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Phosgen 0,02/a",
    "bestellnr": "8101521",
    "huebe": "20 o. 40",
    "messdauer": "360 o. 720",
    "umschlag": "weiß → rot",
    "stufen": [
     {
      "n": 20,
      "s": 360
     },
     {
      "n": 40,
      "s": 720
     }
    ],
    "nr": 12
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Chlor und Salzsäure ergeben Plusfehler und führen in hohen Konzentrationen zu einem Ausbleichen der Anzeige. Phosgen-Konzentrationen oberhalb von 30 ppm führen ebenfalls zu einem Ausbleichen der Anzeige.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Ja",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Phosgen 0,05 – 2 ppm (Bestellnummer 6406340)",
  "microtube": "",
  "seite": 32,
  "anm": []
 },
 {
  "name": "Chlor",
  "cas": "7782-50-5",
  "un": "1017",
  "etw1": 2.0,
  "etw4": 1.0,
  "einheit": "ppm",
  "ueg": "n.b",
  "nfpa": [
   "4",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Chlor 0,2/a",
    "bestellnr": "CH24301",
    "huebe": "1 o. 10",
    "messdauer": "10 o. 180",
    "umschlag": "weiß → gelborange",
    "stufen": [
     {
      "n": 1,
      "s": 10
     },
     {
      "n": 10,
      "s": 180
     }
    ],
    "nr": 10
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Brom wird mit gleicher Empfindlichkeit, jedoch mit blasserer Farbe angezeigt. Chlordioxid wird mit unterschiedlicher Empfindlichkeit angezeigt. Stickstoffdioxid wird ebenfalls angezeigt, jedoch mit blasserer Farbe und geringerer Empfindlichkeit.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Ja",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Chlor 0,2 – 10 ppm (Bestellnummer 6406010)",
  "microtube": "Messbereich: 50 – 5000 ppb / Messdauer: 10 – 400 s / Temperatur: 0 – 40 °C (Bestellnummer 8610010)",
  "seite": 33,
  "anm": []
 },
 {
  "name": "Chlorbenzol",
  "cas": "108-90-7",
  "un": "1134",
  "etw1": 150.0,
  "etw4": 150.0,
  "einheit": "ppm",
  "ueg": "1,3 Vol.-%",
  "nfpa": [
   "3",
   "2",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "benzolähnlich",
  "aggregat": "flüssig",
  "flammpunkt": "28 °C",
  "zuendtemperatur": "590 °C",
  "roehrchen": [
   {
    "name": "Chlorbenzol 5/a",
    "bestellnr": "6728761",
    "huebe": "10",
    "messdauer": "180",
    "umschlag": "blau → gelbgrau",
    "stufen": [
     {
      "n": 10,
      "s": 180
     }
    ]
   }
  ],
  "messung": "Beide Röhrchen öffnen und miteinander verbinden.",
  "auswertung": "Andere Chlorkohlenwasserstoffe werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Methylenchlorid stört die Anzeige nicht. Chlor und Salzsäure werden im Bereich ihrer Grenzwerte in der Vorschicht adsorbiert und stören in diesen Konzentrationen nicht.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "CIBz/0,77",
   "Ja",
   "CIBz/0,47"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 34,
  "anm": []
 },
 {
  "name": "Chlorcyan",
  "cas": "506-77-4",
  "un": "1589",
  "etw1": null,
  "etw4": 0.3,
  "einheit": "ppm",
  "ueg": "n.b",
  "nfpa": [
   "4",
   "0",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "–",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Chlorcyan 0,25/a",
    "bestellnr": "CH19801",
    "huebe": "16",
    "messdauer": "240",
    "umschlag": "weiß → rosa",
    "stufen": [
     {
      "n": 16,
      "s": 240
     }
    ]
   }
  ],
  "messung": "Durch Biegen des Röhrchens um ca. 45° an der mit 2 schwarzen Punkten gekennzeichneten Bruchstelle die Reagenzampulle öffnen, Ampullenflüssigkeit auf die Anzeigeschicht schleudern, bis diese völlig benetzt ist. Hübe durchführen bis Farbe von Anzeige und Farbvergleichsschicht übereinstimmen.",
  "auswertung": "Hubzahl: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 – Konzentr. (ppm): 5 | 2,5 | 1,6 | 1,2 | 1 | 0,8 | 0,6 | 0,5 | 0,42 | 0,36 | 0,31 | 0,28 | 0,25. Liegt bei weniger als 16 Hüben Farbgleichheit vor, ist der ETW 4h überschritten.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 35,
  "anm": []
 },
 {
  "name": "Chloroform (Trichlormethan)",
  "cas": "67-66-3",
  "un": "1888",
  "etw1": 64.0,
  "etw4": 40.0,
  "einheit": "ppm",
  "ueg": "n.b",
  "nfpa": [
   "2",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "süßlich",
  "aggregat": "flüssig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Chloroform 2/b",
    "bestellnr": "6728861",
    "huebe": "3",
    "messdauer": "180",
    "umschlag": "weiß → violett",
    "stufen": [
     {
      "n": 3,
      "s": 180
     }
    ]
   }
  ],
  "messung": "Beide Röhrchen öffnen und miteinander verbinden. Pumpe nach Gebrauch mit Luft spülen.",
  "auswertung": "Zwei Messbereiche mit unterschiedlichen Hubzahlen. Andere Chlorkohlenwasserstoffe werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 36,
  "anm": []
 },
 {
  "name": "Chlorwasserstoff (Salzsäure, Gas)",
  "cas": "7647-01-0",
  "un": "1050 (1789)",
  "etw1": 22.0,
  "etw4": 11.0,
  "einheit": "ppm",
  "ueg": "n.b",
  "nfpa": [
   "3",
   "0",
   "1",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig, leicht löslich in Wasser",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Salzsäure 0,2/a",
    "bestellnr": "8103481",
    "huebe": "2 o. 10",
    "messdauer": "24 o. 120",
    "umschlag": "blau → gelb",
    "stufen": [
     {
      "n": 2,
      "s": 24
     },
     {
      "n": 10,
      "s": 120
     }
    ],
    "nr": 16
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Keine Störung der Anzeige durch 10 ppm H2S und 2 ppm SO2. Andere saure Gase werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Chlor verfärbt die Anzeigenschicht grau. Der gleichzeitige Einfluss von Chlor führt zu erhöhten HCI-Anzeigen.",
  "polytest": "Nein",
  "simultan": [
   "Ja",
   "Nein",
   "Nein",
   "Ja"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Salzsäure 1 – 25 ppm (Bestellnummer 6406090)",
  "microtube": "",
  "seite": 37,
  "anm": []
 },
 {
  "name": "Cyanwasserstoff (Blausäure)",
  "cas": "74-90-8",
  "un": "1051, 1614 (1613)",
  "etw1": 7.1,
  "etw4": 3.5,
  "einheit": "ppm",
  "ueg": "5,4 Vol.-%",
  "nfpa": [
   "4",
   "4",
   "1",
   ""
  ],
  "gasdichte": "leichter als Luft",
  "geruch": "bittermandelartig",
  "aggregat": "flüssig oder gasförmig",
  "flammpunkt": "< -20 °C",
  "zuendtemperatur": "535 °C",
  "roehrchen": [
   {
    "name": "Blausäure 0,5/a",
    "bestellnr": "8103601",
    "huebe": "2 o. 10",
    "messdauer": "30 o. 150",
    "umschlag": "gelb → rot",
    "stufen": [
     {
      "n": 2,
      "s": 30
     },
     {
      "n": 10,
      "s": 150
     }
    ],
    "nr": 17
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "30 ppm Schwefelwasserstoff, 300 ppm Ammoniak, 40 ppm Schwefeldioxid, 20 ppm Stickstoffdioxid sowie 1000 ppm Salzsäure stören die Anzeige nicht. Schwefelwasserstoff färbt die Vorschicht dunkelbraun. Ammoniak-Konzentrationen oberhalb 300 ppm können die Anzeige am Anfang der Schicht wieder entfärben. Keine Störung der Anzeige durch Acrylnitril bis 1000 ppm. In Gegenwart von Phosphorwasserstoff ist eine Blausäure-Messung nicht möglich.",
  "polytest": "Nein",
  "simultan": [
   "Ja",
   "Nein",
   "Nein",
   "Ja"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Ja",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "Blausäure 2 – 50 ppm (Bestellnummer 6406100)",
  "microtube": "Messbereich: 0,5 – 50 ppm / Messdauer: 20 – 180 s / Temperatur: 0 – 40 °C (Bestellnummer 8610520)",
  "seite": 38,
  "anm": []
 },
 {
  "name": "Cyclohexylamin",
  "cas": "108-91-8",
  "un": "2357",
  "etw1": 8.6,
  "etw4": 5.4,
  "einheit": "ppm",
  "ueg": "1,6 Vol.-%",
  "nfpa": [
   "3",
   "3",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "aminartig",
  "aggregat": "flüssig",
  "flammpunkt": "27 °C",
  "zuendtemperatur": "275 °C",
  "roehrchen": [
   {
    "name": "Cyclohexylamin 2/a",
    "bestellnr": "6728931",
    "huebe": "10",
    "messdauer": "240",
    "umschlag": "gelb → blau",
    "stufen": [
     {
      "n": 10,
      "s": 240
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Andere basische Stoffe wie z. B. organische Amine und Ammoniak werden ebenfalls angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 39,
  "anm": []
 },
 {
  "name": "Epichlorhydrin (1-Chlor-2,3-epoxypropan)",
  "cas": "106-89-8",
  "un": "2023",
  "etw1": 24.0,
  "etw4": 14.0,
  "einheit": "ppm",
  "ueg": "2,3 Vol.-%",
  "nfpa": [
   "3",
   "2",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "flüssig",
  "flammpunkt": "28 °C",
  "zuendtemperatur": "385 °C",
  "roehrchen": [
   {
    "name": "Epichlorhydrin 5/c",
    "bestellnr": "6728111",
    "huebe": "20",
    "messdauer": "480",
    "umschlag": "hellgrau → gelborange",
    "stufen": [
     {
      "n": 20,
      "s": 480
     }
    ]
   }
  ],
  "messung": "Durch Hülse verdeckte innere Röhrchenspitzen abbrechen: dazu ein Röhrchenende festhalten und das andere soweit biegen, bis die innere Spitze abbricht. Den Vorgang für die zweite innere Spitze wiederholen. Dann beide äußere Spitzen des Röhrchens öffnen.",
  "auswertung": "Andere Chlorkohlenwasserstoffe werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Unter Einfluss freier Halogene und Halogenwasserstoffsäuren im Bereich ihrer AGW-Werte ist eine Epichlorhydrin-Messung nicht möglich, da diese ebenfalls angezeigt werden. Benzinkohlenwasserstoffe führen zu einer Verkürzung der Anzeige.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Ja",
   "RF über dem definierten Limit"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 40,
  "anm": []
 },
 {
  "name": "Essigsäure",
  "cas": "64-19-7",
  "un": "2789",
  "etw1": null,
  "etw4": 20.0,
  "einheit": "ppm",
  "ueg": "4 Vol.-%",
  "nfpa": [
   "2",
   "2",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend, beißender Essiggeruch",
  "aggregat": "flüssig",
  "flammpunkt": "38,5 °C",
  "zuendtemperatur": "485 °C",
  "roehrchen": [
   {
    "name": "Essigsäure 5/a",
    "bestellnr": "6722101",
    "huebe": "3",
    "messdauer": "30",
    "umschlag": "blauviolett → gelb",
    "stufen": [
     {
      "n": 3,
      "s": 30
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "In Gegenwart anderer Säuren ist eine Essigsäure-Messung nicht möglich. Organische Säuren werden mit gleicher Farbe, jedoch teilweise mit unterschiedlicher Empfindlichkeit angezeigt. Mineralsäuren, z. B. Salzsäure, werden mit unterschiedlicher Empfindlichkeit und roter Farbe angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "26 % UEG",
   "89 % UEG"
  ],
  "cms": "Essigsäure 2 – 50 ppm (Bestellnummer: 6406330)",
  "microtube": "Messbereich: 2 – 50 ppm / Messdauer: 20 – 170 s / Temperatur: 0 – 30 °C (Bestellnummer: 8610330)",
  "seite": 41,
  "anm": []
 },
 {
  "name": "Ethanol (Alkohol)",
  "cas": "64-17-5",
  "un": "1170",
  "etw1": null,
  "etw4": 3000.0,
  "einheit": "ppm",
  "ueg": "3,1 Vol.-%",
  "nfpa": [
   "0",
   "2",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "charakteristisch",
  "aggregat": "flüssig",
  "flammpunkt": "22 °C (bei 70 Vol.-%) 29 °C (bei 30 Vol.-%)",
  "zuendtemperatur": "400 °C",
  "roehrchen": [
   {
    "name": "Ethanol 100/a",
    "bestellnr": "8103761",
    "huebe": "6",
    "messdauer": "90",
    "umschlag": "gelb → mintgrün",
    "stufen": [
     {
      "n": 6,
      "s": 90
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Bei Messungen ≤ 10 °C ist ein rötlicher Vorlauf der Verfärbung zu beobachten, der zur Auswertung der gesamten Länge der Verfärbung mit abgelesen werden muss. Eine Differenzierung verschiedener Alkohole ist nicht möglich. Methanol und Tetrahydrofuran werden mit ähnlicher Empfindlichkeit angezeigt. Höhermolekulare Alkohole werden mit stark abnehmender Empfindlichkeit angezeigt. ≤ 250 ppm Acetaldehyd und ≤ 200 ppm Xylol werden nicht angezeigt. Aliphatische Benzinkohlenwasserstoffe, Ketone, Ester, Ether, Halogenkohlenwasserstoffe sowie Formaldehyd, Benzol und Toluol werden nicht angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "10",
   "Ja",
   "EtOH/12,3"
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "33 % UEG",
   "größer Messbereich (Wert über 100 % UEG)"
  ],
  "cms": "Ethanol 100 – 2.500 ppm --> ET W 4h überschreitet Messbereich (Bestellnummer: 6406370)",
  "microtube": "",
  "seite": 42,
  "anm": []
 },
 {
  "name": "Ethylendiamin",
  "cas": "107-15-3",
  "un": "1604",
  "etw1": 9.7,
  "etw4": 6.1,
  "einheit": "ppm",
  "ueg": "2,7 Vol.-%",
  "nfpa": [
   "3",
   "2",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "ammoniakartig",
  "aggregat": "flüssig",
  "flammpunkt": "34 °C",
  "zuendtemperatur": "400 °C",
  "roehrchen": [
   {
    "name": "Ammoniak 5/a",
    "bestellnr": "CH20501",
    "huebe": "10 o. 1",
    "messdauer": "60 o. 1",
    "umschlag": "gelb → blau",
    "stufen": []
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Andere basische Stoffe wie z. B. organische Amine werden ebenfalls angezeigt. Ethylendiamin bildet mit dem Kohlenstoffdioxid aus der Umgebungsluft und Wasser ein festes Carbonat, was eine quantitative Messung unter Einsatzbedingungen stark erschwert. 6,1 ppm Ethylendiamin ergeben bei n = 20 auf der Ammoniak-Skala n = 10 eine Anzeige von ca. 18,5 ppm. Dabei ist eine Abweichung von +/- 40 % des Messwertes möglich – Sicherheitsfaktor beachten!",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 43,
  "anm": [
   "Druckfehler im Stoffblatt: Dort steht „Ethanol 100/a, Hübe 10 o. 1, Messdauer 60 o. 1“. Bestellnummer CH20501 und der Hinweis (Ammoniak-Skala) gehören zum Röhrchen Ammoniak 5/a."
  ]
 },
 {
  "name": "Ethylenoxid",
  "cas": "75-21-8",
  "un": "1040",
  "etw1": 45.0,
  "etw4": 14.0,
  "einheit": "ppm",
  "ueg": "2,6 Vol.-%",
  "nfpa": [
   "4",
   "4",
   "3",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "süßlich etherisch",
  "aggregat": "gasförmig",
  "flammpunkt": "-57 °C",
  "zuendtemperatur": "435 °C",
  "roehrchen": [
   {
    "name": "Ethylenoxid 1/a",
    "bestellnr": "6728961",
    "huebe": "20",
    "messdauer": "480",
    "umschlag": "weiß → rosa",
    "stufen": [
     {
      "n": 20,
      "s": 480
     }
    ]
   }
  ],
  "messung": "Beide Röhrchen öffnen und miteinander verbinden. Vor der Messung ist die Reagenzampulle zu brechen.",
  "auswertung": "In Gegenwart von Formaldehyd und Ethylenglykol ist die Ethylenoxid-Messung nicht möglich, beide geben die gleiche Verfärbung. Styrol, Vinylacetat und Acetaldehyd werden mit gelbbrauner Farbe ebenfalls angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "Ethylenoxid 0,4 – 5 ppm --> ETW 4h und 1h überschreiten Messbereich5 (Bestellnummer: 6406580)",
  "microtube": "Messbereich: 0,2 – 10 ppm / Messdauer: 100 – 500 s / Temperatur: 10 – 30 °C (Bestellnummer: 8610580)",
  "seite": 44,
  "anm": []
 },
 {
  "name": "Fluor",
  "cas": "7782-41-4",
  "un": "1045",
  "etw1": 5.0,
  "etw4": 2.3,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "4",
   "0",
   "4",
   "W (durchgestrichen)"
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Fluor 0,1/a",
    "bestellnr": "8101491",
    "huebe": "20",
    "messdauer": "300",
    "umschlag": "weiß → gelb",
    "stufen": [
     {
      "n": 20,
      "s": 300
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Stickstoffdioxid, Chlor und Chlordioxid werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Messbereichserweiterung: Messbereich 0,05 bis 1 ppm bei n = 40 Hüben, abgelesenen Skalenwert durch 2 dividieren.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 45,
  "anm": []
 },
 {
  "name": "Fluorwasserstoff (Flusssäure)",
  "cas": "7664-39-3",
  "un": "1052 (1790)",
  "etw1": 24.0,
  "etw4": 12.0,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "4",
   "0",
   "2",
   ""
  ],
  "gasdichte": "leichter als Luft",
  "geruch": "stechend",
  "aggregat": "flüssig oder gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Fluorwasserstoff 0,5/a",
    "bestellnr": "8103251",
    "huebe": "2 o. 10",
    "messdauer": "25 o. 120",
    "umschlag": "blauviolett → gelb",
    "stufen": [
     {
      "n": 2,
      "s": 25
     },
     {
      "n": 10,
      "s": 120
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Mineralsäuren wie z. B. Salzsäure oder Salpetersäure werden ebenfalls angezeigt. Basische Gase wie z. B. Ammoniak verursachen Minusfehler bzw. können eine Anzeige ganz verhindern.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 46,
  "anm": []
 },
 {
  "name": "Formaldehyd",
  "cas": "50-00-0",
  "un": "1198, 2209",
  "etw1": null,
  "etw4": 1.0,
  "einheit": "ppm",
  "ueg": "7 Vol.-%",
  "nfpa": [
   "2",
   "4",
   "0",
   ""
  ],
  "gasdichte": "ungefähr gleich Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "32 … 61 °C Formaldehydlösungen",
  "zuendtemperatur": "430 °C",
  "roehrchen": [
   {
    "name": "Formaldehyd 0,2/a",
    "bestellnr": "6733081",
    "huebe": "10 o. 20",
    "messdauer": "90 o. 180",
    "umschlag": "weiß → rosa",
    "stufen": [
     {
      "n": 10,
      "s": 90
     },
     {
      "n": 20,
      "s": 180
     }
    ],
    "nr": 14
   }
  ],
  "messung": "Durch Schrumpfschlauch verdeckte innere Röhrchenspitzen abbrechen; dazu ein Röhrchenende festhalten und das andere so weit biegen, bis die innere Spitze abbricht. Den Vorgang für die zweite Spitze wiederholen. Danach äußere Röhrchenenden öffnen. Zwei Messbereiche!",
  "auswertung": "Styrol, Vinylacetat und Acetaldehyd werden mit gelbbrauner Farbe ebenfalls angezeigt.Acrolein, Dieselkraftstoff und Furfurylalkohol werden mit gelbbrauner Farbe ebenfalls angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Ja"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "Formaldehyd 0,2 – 5 ppm (Bestellnummer: 6406540)",
  "microtube": "Messbereich: 0,15 – 3 ppm / Messdauer: 300 – 600 s / Temperatur: 0 – 40 °C (Bestellnummer: 8610100)",
  "seite": 47,
  "anm": []
 },
 {
  "name": "n-Hexan",
  "cas": "110-54-3",
  "un": "1208",
  "etw1": 2900.0,
  "etw4": 2900.0,
  "einheit": "ppm",
  "ueg": "1 Vol.-%",
  "nfpa": [
   "1",
   "3",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "schwach benzinartig",
  "aggregat": "flüssig",
  "flammpunkt": "< -20 °C",
  "zuendtemperatur": "230 °C",
  "roehrchen": [
   {
    "name": "Hexan 10/a",
    "bestellnr": "8103681",
    "huebe": "1 o. 5",
    "messdauer": "15 o. 75",
    "umschlag": "weiß → grünbraun",
    "stufen": [
     {
      "n": 1,
      "s": 15
     },
     {
      "n": 5,
      "s": 75
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Viele Benzinkohlenwasserstoffe werden ebenfalls angezeigt, jedoch alle mit unterschiedlicher Empfindlichkeit. Eine Differenzierung ist nicht möglich. Aromaten werden nur mit sehr geringer Empfindlichkeit angezeigt. Kohlenstoffmonoxid wird mit etwas geringerer Empfindlichkeit als n-Hexan angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Ja",
   "Nein"
  ],
  "pid": [
   "Ja",
   "5,30",
   "Ja",
   "HEXA/4,1"
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "21 % UEG",
   "73 % UEG"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 48,
  "anm": []
 },
 {
  "name": "Hydrazin",
  "cas": "302-01-2",
  "un": "2029",
  "etw1": 13.0,
  "etw4": 3.1,
  "einheit": "ppm",
  "ueg": "4,7 Vol.-%",
  "nfpa": [
   "4",
   "4",
   "3",
   ""
  ],
  "gasdichte": "ungefähr gleich Luft",
  "geruch": "ammoniakartig",
  "aggregat": "flüssig",
  "flammpunkt": "40 °C",
  "zuendtemperatur": "270 °C",
  "roehrchen": [
   {
    "name": "Hydrazin 0,25/a",
    "bestellnr": "CH31801",
    "huebe": "10 o. 20",
    "messdauer": "60 o. 120",
    "umschlag": "gelb → blau",
    "stufen": [
     {
      "n": 10,
      "s": 60
     },
     {
      "n": 20,
      "s": 120
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Andere basische Stoffe wie z. B. organische Amine und Ammoniak werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Ja",
   "RF –"
  ],
  "ex": [
   "Ja",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 49,
  "anm": []
 },
 {
  "name": "Kohlenstoffdioxid",
  "cas": "124-38-9",
  "un": "1013",
  "etw1": null,
  "etw4": 10000.0,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "2",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "geruchlos",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Kohlenstoffdioxid 0,5%/a",
    "bestellnr": "CH31401",
    "huebe": "1",
    "messdauer": "30",
    "umschlag": "weiß → violett",
    "stufen": [
     {
      "n": 1,
      "s": 30
     }
    ],
    "nr": 15
   }
  ],
  "messung": "",
  "auswertung": "Anzeige 1 % entspricht 10.000 ppm. Schwefelwasserstoff gibt im Bereich des AGW-Wertes keine Anzeige. Schwefeldioxid wird im vergleichbaren Konzentrationsbereich ebenfalls angezeigt, jedoch mit dreifach geringerer Empfindlichkeit.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Kohlenstoffdioxid 1.000 – 25.000 ppm (Bestellnummer: 6406070)",
  "microtube": "Messbereich: 200 – 50.000 ppb / Messdauer: 2 – 120 s / Temperatur: 0 – 30 °C (Bestellnummer: 8610190)",
  "seite": 50,
  "anm": []
 },
 {
  "name": "Kohlenstoffdisulfid (Schwefelkohlenstoff)",
  "cas": "75-15-0",
  "un": "1131",
  "etw1": 160.0,
  "etw4": 100.0,
  "einheit": "ppm",
  "ueg": "0,6 Vol.-%",
  "nfpa": [
   "3",
   "4",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "nach faulem Rettich",
  "aggregat": "flüssig",
  "flammpunkt": "< -20 °C",
  "zuendtemperatur": "95 °C",
  "roehrchen": [
   {
    "name": "Schwefelkohlenstoff 5/a",
    "bestellnr": "6728351",
    "huebe": "11",
    "messdauer": "180",
    "umschlag": "weiß → braungrün",
    "stufen": [
     {
      "n": 11,
      "s": 180
     }
    ]
   }
  ],
  "messung": "ACHTUNG: In Räumen, in denen Schwefelkohlenstoff-Konzentrationen oder andere Gase und Dämpfe im Ex-Bereich vorkommen können, darf dieses Röhrchen nicht eingesetzt werden. Die Anzeigeschicht erwärmt sich.",
  "auswertung": "Aliphatische und aromatische Kohlenwasserstoffe werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Eine Schwefelkohlenstoff-Messung ist in solchen Fällen nicht möglich. Ebenso bei Anwesenheit von Kohlenstoffmonoxid und Schwefelwasserstoff.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "1,05",
   "Ja",
   "CS2/0,86"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor! Achtung, Stoff hat Temperaturklasse T6 – Eignung Ex-Schutz der Geräte prüfen!)",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 51,
  "anm": []
 },
 {
  "name": "Kohlenstoffmonoxid",
  "cas": "630-08-0",
  "un": "1016",
  "etw1": 83.0,
  "etw4": 33.0,
  "einheit": "ppm",
  "ueg": "11,3 Vol.-%",
  "nfpa": [
   "2",
   "4",
   "0",
   ""
  ],
  "gasdichte": "leichter bis gleich Luft",
  "geruch": "geruchlos",
  "aggregat": "gasförmig",
  "flammpunkt": "-191,6 °C",
  "zuendtemperatur": "605 °C",
  "roehrchen": [
   {
    "name": "Kohlenstoffmonoxid 2/a",
    "bestellnr": "6733051",
    "huebe": "2 o. 10",
    "messdauer": "50 o. 240",
    "umschlag": "weiß → bräunlich rosagrün",
    "stufen": [
     {
      "n": 2,
      "s": 50
     },
     {
      "n": 10,
      "s": 240
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Keinen Einfluss auf die Anzeige von 10 ppm CO haben jeweils: 100 ppm Schwefelwasserstoff, 50 ppm Schwefeldioxid, 15 ppm Stickstoffdioxid, 10 ppm CO + 200 ppm Oktan: Anzeige ca. 30 ppm, 10 ppm CO + 40 ppm Butadien: Anzeige ca. 15 ppm, 10 ppm CO + 30 (100) ppm Benzol: Anzeige ca. 15 (20 – 30) ppm, 10 ppm CO + 40 ppm Chloroform: Anzeige ca. 60 ppm, 10 (60) ppm Acetylen: Anzeige ca. 5 (15) ppm. Durch Vorschalten eines Kohlevorsatzröhrchens (CH 24101) können 10 ppm CO noch in Gegenwart von 10000 ppm n-Oktan gemessen werden.",
  "polytest": "ab 5 ppm",
  "simultan": [
   "Ja",
   "Nein",
   "Nein",
   "Ja"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "32 % UEG",
   "größer Messbereich (Wert über 100 % UEG)"
  ],
  "cms": "Kohlenstoffmonoxid 5 – 150 ppm (Bestellnummer: 6406080)",
  "microtube": "Messbereich: 2 – 1.000 ppm / Messdauer: 5 – 300 s / Temperatur: 10 – 40 °C (Bestellnummer: 8610080)",
  "seite": 52,
  "anm": []
 },
 {
  "name": "Methanol",
  "cas": "67-56-1",
  "un": "1230",
  "etw1": null,
  "etw4": 720.0,
  "einheit": "ppm",
  "ueg": "6 Vol.-%",
  "nfpa": [
   "1",
   "3",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "angenehm bis stechend",
  "aggregat": "flüssig",
  "flammpunkt": "9 °C",
  "zuendtemperatur": "440 °C",
  "roehrchen": [
   {
    "name": "Methanol 20/a",
    "bestellnr": "8103801",
    "huebe": "5 o. 15",
    "messdauer": "120 o. 360",
    "umschlag": "gelb → mintgrün",
    "stufen": [
     {
      "n": 5,
      "s": 120
     },
     {
      "n": 15,
      "s": 360
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Eine Differenzierung verschiedener Alkohole ist nicht möglich. Höhermolekulare Alkohole werden mit stark abnehmender Empfindlichkeit angezeigt. Ether und Xylol werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. ≤ 25 ppm Formaldehyd, ≤ 50 ppm Acetaldehyd und ≤ 50 ppm Toluol werden nicht angezeigt. Aliphatische Benzinkohlenwasserstoffe, Ketone, Ester, Halogenkohlenwasserstoffe und Benzol werden nicht angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Ja",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "42 % UEG",
   "größer Messbereich (Wert über 100 % UEG)"
  ],
  "cms": "Methanol 10 – 500 ppm --> ETW 4h und 1h überschreiten Messbereich (Bestellnummer: 6406380)",
  "microtube": "Messbereich: 10 – 5.000 ppm / Messdauer: 20 – 450 s / Temperatur: 10 – 35 °C (Bestellnummer: 8610380)",
  "seite": 53,
  "anm": [
   "Das Stoffblatt der Messstrategie nennt ETW-1 2.100 ppm, ETW-4 730 ppm; hier gilt die vfdb-Liste 2023.",
   "Das Stoffblatt nennt UN 1016; hier gilt die vfdb-Liste (1230)."
  ]
 },
 {
  "name": "Methylmercaptan (Methanthiol)",
  "cas": "74-93-1",
  "un": "1064",
  "etw1": 23.0,
  "etw4": 14.0,
  "einheit": "ppm",
  "ueg": "4,1 Vol.-%",
  "nfpa": [
   "2",
   "4",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "faulig stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "-18 °C",
  "zuendtemperatur": "360 °C",
  "roehrchen": [
   {
    "name": "Mercaptan 0,1/a",
    "bestellnr": "8103281",
    "huebe": "2 o. 10",
    "messdauer": "40 o. 180",
    "umschlag": "gelb → rot",
    "stufen": [
     {
      "n": 2,
      "s": 40
     },
     {
      "n": 10,
      "s": 180
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Propylmercaptan und tert.-Butylmercaptan werden angezeigt, jedoch mit geringerer Empfindlichkeit. 4 ppm Ethylen, 30 ppm CO, 10 ppm Tetrahydrothiophen und 100 ppm H2S stören die Anzeige nicht. H2S färbt die Vorschicht schwarz.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Ja",
   "RF –"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 54,
  "anm": []
 },
 {
  "name": "Phosphorwasserstoff (Phosphin)",
  "cas": "7803-51-2",
  "un": "2199",
  "etw1": 2.0,
  "etw4": 0.5,
  "einheit": "ppm",
  "ueg": "1 Vol.-%",
  "nfpa": [
   "4",
   "4",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "nach Knoblauch oder faulem Fisch",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "ca. 100 °C",
  "roehrchen": [
   {
    "name": "Phosphorwasserstoff 0,1/c",
    "bestellnr": "8103711",
    "huebe": "1 o. 3",
    "messdauer": "60 o. 150",
    "umschlag": "gelb → rot",
    "stufen": [
     {
      "n": 1,
      "s": 60
     },
     {
      "n": 3,
      "s": 150
     }
    ],
    "nr": 13
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Maximal 6 ppm Schwefeldioxid oder 15 ppm Chlorwasserstoff stören die Anzeige nicht. Höhere Konzentrationen ergeben Plus-Fehler. Ammoniak (>100 ppm) ergeben Minus-Fehler.Arsenwasserstoff und Schwefelwasserstoff werden mit unterschiedlicher Empfindlichkeit angezeigt. 30 ppm Blausäure stören nicht.",
  "polytest": "teilweise",
  "simultan": [
   "Nein",
   "Ja",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "4,35",
   "Ja",
   "PH3/3,94"
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Phosphorwasserstoff 0,1 – 2,5 ppm (Bestellnummer: 6406400)",
  "microtube": "Messbereich: 50 – 5.000 ppb / Messdauer: 20 – 90 s / Temperatur: 5 – 30 °C (Bestellnummer: 8610400)",
  "seite": 55,
  "anm": []
 },
 {
  "name": "Salpetersäure",
  "cas": "7697-37-2",
  "un": "2031 (2032)",
  "etw1": 24.0,
  "etw4": 6.0,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "4",
   "0",
   "1",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "flüssig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Salpetersäure 1/a",
    "bestellnr": "6728311",
    "huebe": "10 o. 20",
    "messdauer": "120 o. 240",
    "umschlag": "blau → gelb",
    "stufen": [
     {
      "n": 10,
      "s": 120
     },
     {
      "n": 20,
      "s": 240
     }
    ]
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Schwefelwasserstoff und Stickstoffdioxid stören im Bereich ihrer AGW-Werte nicht, 50 ppm Stickstoffdioxid gibt eine Anzeige wie 3 ppm Salpetersäure. In Gegenwart anderer Mineral-säuren ist eine Salpetersäure-Messung nicht möglich. Chlor verfärbt die Anzeigeschicht grau, die Auswertung wird dadurch erschwert. Außerdem führt die gleichzeitige Anwesenheit von Chlor im Bereich des AGW-Wertes zu leicht erhöhten Salpetersäure-Anzeigen.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 56,
  "anm": []
 },
 {
  "name": "Schwefeldioxid",
  "cas": "7446-09-5",
  "un": "1079",
  "etw1": 0.75,
  "etw4": 0.75,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "3",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Schwefeldioxid 0,5/a",
    "bestellnr": "6728491",
    "huebe": "10 o. 20",
    "messdauer": "180 o. 360",
    "umschlag": "graublau → weiß",
    "stufen": [
     {
      "n": 10,
      "s": 180
     },
     {
      "n": 20,
      "s": 360
     }
    ],
    "nr": 18
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Unter Einfluss von H2S ist eine Messung nicht möglich. Stickstoffdioxid verkürzt die Anzeige.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Ja",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Schwefeldioxid 0,4 – 10 ppm (Bestellnummer: 6406110)",
  "microtube": "Messbereich: 0,05 – 5 ppm / Messdauer: 20 – 480 s / Temperatur: 0 – 30 °C (Bestellnummer: 8610110)",
  "seite": 57,
  "anm": []
 },
 {
  "name": "Schwefelwasserstoff",
  "cas": "7783-06-4",
  "un": "1053",
  "etw1": 27.0,
  "etw4": 20.0,
  "einheit": "ppm",
  "ueg": "4,3 Vol.-%",
  "nfpa": [
   "4",
   "4",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "nach faulen Eiern, Geruchswarnung setzt bei höheren Konzentrationen aus",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "270 °C",
  "roehrchen": [
   {
    "name": "Schwefelwasserstoff 2/b",
    "bestellnr": "8101961",
    "huebe": "1",
    "messdauer": "30",
    "umschlag": "weiß → hellbraun",
    "stufen": [
     {
      "n": 1,
      "s": 30
     }
    ],
    "nr": 4
   }
  ],
  "messung": "",
  "auswertung": "Schwefeldioxid, Salzsäure und Mercaptan stören im Bereich ihrer AGW-Werte nicht. Messbereichserweiterung Messbereich 1 bis 30 ppm bei n = 2 Hüben, abgelesenen Skalenwert durch 2 dividieren.",
  "polytest": "ab 2 ppm",
  "simultan": [
   "Nein",
   "Ja",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "3,00",
   "Ja",
   "H2S/3,82"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Ja",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Schwefelwasserstoff 2 – 50 ppm (Bestellnummer: 6406050)",
  "microtube": "Messbereich: 1 – 50 ppm / Messdauer: 5 – 350 s / Temperatur: 0 – 40 °C (Bestellnummer: 8610050)",
  "seite": 58,
  "anm": []
 },
 {
  "name": "Stickstoffdioxid (Nitrose Gase, zusammen mit NO)",
  "cas": "10102-44-0",
  "un": "1067",
  "etw1": 12.0,
  "etw4": 8.2,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "3",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "gasförmig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Nitrose Gase 0,2/a",
    "bestellnr": "8103661",
    "huebe": "5",
    "messdauer": "30 o. 75",
    "umschlag": "graugrün → blaugrau",
    "stufen": [],
    "nr": 11
   }
  ],
  "messung": "",
  "auswertung": "Bei Stickstoffdioxid in Konzentrationen oberhalb etwa 300 ppm kann die Anzeigeschicht ausbleichen. Chlor und Ozon werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit und können das Messergebnis verfälschen. Stickstoffmonoxid wird auch angezeigt und erhöht bei gleichzeitigem Auftreten die Messwertanzeige.",
  "polytest": "Nein",
  "simultan": [
   "Ja",
   "Nein",
   "Nein",
   "Ja"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Stickstoffdioxid 0,5 – 25 ppm (Bestellnummer: 6406120)",
  "microtube": "Messbereich: 0,25 – 25 ppm / Messdauer: 10 – 210 s / Temperatur: 10 – 40 °C (Bestellnummer: 8610120)",
  "seite": 59,
  "anm": []
 },
 {
  "name": "Styrol",
  "cas": "100-42-5",
  "un": "2055",
  "etw1": null,
  "etw4": 40.0,
  "einheit": "ppm",
  "ueg": "0,97 Vol.-%",
  "nfpa": [
   "2",
   "3",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "süßlich",
  "aggregat": "flüssig",
  "flammpunkt": "32 °C",
  "zuendtemperatur": "490 °C",
  "roehrchen": [
   {
    "name": "Styrol 10/b",
    "bestellnr": "6733141",
    "huebe": "20",
    "messdauer": "180",
    "umschlag": "weiß → rotbraun",
    "stufen": [
     {
      "n": 20,
      "s": 180
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Andere organische Verbindungen, die mit dem Formaldehyd-Schwefelsäuresystem ebenfalls reagieren, stören die Anzeige. Eine Styrol-Messung ist in solchen Fällen nicht möglich. Störende Verbindungen sind z. B. Xylol(e), Toluol, Butadien, Ethylbenzol. Keine Störung der Anzeige durch: 200 ppm Methanol, 500 ppm Octan, 400 ppm Ethylacetat.",
  "polytest": "Ja",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "Styr/0,84",
   "Ja",
   "Styr/0,44"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Ja",
  "catex": [
   "11 % UEG",
   "38 % UEG"
  ],
  "cms": "Styrol 2 – 40 ppm (Bestellnummer: 6406560)",
  "microtube": "",
  "seite": 60,
  "anm": []
 },
 {
  "name": "Perchlorethylen (Tetrachlorethen)",
  "cas": "127-18-4",
  "un": "1897",
  "etw1": 230.0,
  "etw4": 120.0,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "2",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "etherisch",
  "aggregat": "flüssig",
  "flammpunkt": "–",
  "zuendtemperatur": "> 650 °C",
  "roehrchen": [
   {
    "name": "Perchlorethylen 2/a",
    "bestellnr": "8101501",
    "huebe": "1 o. 5",
    "messdauer": "30 o. 180",
    "umschlag": "gelb → graublau",
    "stufen": [
     {
      "n": 1,
      "s": 30
     },
     {
      "n": 5,
      "s": 180
     }
    ],
    "nr": 6
   }
  ],
  "messung": "Zwei Messbereiche!",
  "auswertung": "Andere Chlorkohlenwasserstoffe, freie Halogene sowie Halogenwasserstoffsäuren werden ebenfalls angezeigt. Benzindämpfe führen zu einer Verkürzung der Anzeige, wenn sie folgende Konzentrationen überschreiten: 50 ppm bei 5 Hüben bzw. 500 ppm bei 1 Hub.",
  "polytest": "Ja",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "0,62",
   "Ja",
   "PCE/0,62"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "Messbereich: 1 – 500 ppm / Messdauer: 25 – 240 s / Temperatur: 10 – 30 °C (Bestellnummer: 8610040)",
  "seite": 61,
  "anm": []
 },
 {
  "name": "Tetrachlorkohlenstoff (Tetrachlormethan)",
  "cas": "56-23-5",
  "un": "1846",
  "etw1": 13.0,
  "etw4": 7.6,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "3",
   "0",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "unangenehm süßlich",
  "aggregat": "flüssig",
  "flammpunkt": "–",
  "zuendtemperatur": "–",
  "roehrchen": [
   {
    "name": "Tetrachlorkohlenstoff 1/a",
    "bestellnr": "8101021",
    "huebe": "5 o. 10",
    "messdauer": "180 o. 360",
    "umschlag": "weiß → gelb",
    "stufen": [
     {
      "n": 5,
      "s": 180
     },
     {
      "n": 10,
      "s": 360
     }
    ]
   }
  ],
  "messung": "Durch Schrumpfschlauch verdeckte innere Röhrchenspitzen abbrechen: dazu ein Röhrchenende, das unter dem Keramikverbinder steckt und den Keramikverbinder festhalten und soweit biegen, bis die innere Spitze bricht. Den Vorgang für die zweite Spitze wiederholen. Zwei Messbereiche!",
  "auswertung": "Chlorpikrin und Phosgen werden mit etwa gleicher Empfindlichkeit angezeigt, so dass eine Tetrachlorkohlenstoff-Messung in deren Gegenwart nicht möglich ist. Keine Störung der Anzeige durch: 1 ppm Chlor, 5 ppm Salzsäure, 20 ppm Methylbromid, 1000 ppm Aceton.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 62,
  "anm": []
 },
 {
  "name": "Toluol",
  "cas": "108-88-3",
  "un": "1294",
  "etw1": 560.0,
  "etw4": 310.0,
  "einheit": "ppm",
  "ueg": "1,0 Vol.-%",
  "nfpa": [
   "2",
   "3",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "charakteristisch",
  "aggregat": "flüssig",
  "flammpunkt": "6 °C",
  "zuendtemperatur": "535 °C",
  "roehrchen": [
   {
    "name": "Toluol 100/a",
    "bestellnr": "8101731",
    "huebe": "10",
    "messdauer": "90",
    "umschlag": "weiß → braunviolett",
    "stufen": [
     {
      "n": 10,
      "s": 90
     }
    ],
    "nr": 7
   }
  ],
  "messung": "",
  "auswertung": "Xylole werden ebenfalls mit etwa gleicher Empfindlichkeit angezeigt, jedoch mit blauvioletter Farbe. Benzol färbt die gesamte Anzeigeschicht diffus gelbbraun. Benzinkohlenwasserstoffe färben die gesamte Anzeigeschicht diffus rötlich-braun. Methanol, Ethanol, Aceton und Ethylacetat stören im Bereich ihrer AGW-Werte nicht.",
  "polytest": "ab 10 ppm",
  "simultan": [
   "Nein",
   "Nein",
   "Ja",
   "Nein"
  ],
  "pid": [
   "Ja",
   "TOLU/0,7",
   "Ja",
   "TOLU/0,56"
  ],
  "ex": [
   "Ja",
   "Ja"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "21 % UEG",
   "73 % UEG"
  ],
  "cms": "Toluol 10 – 300 ppm --> ETW 4h und 1h überschreiten Messbereich (Bestellnummer: 6406250)",
  "microtube": "Messbereich: 10 – 1.000 ppm / Messdauer: 6 – 360 s / Temperatur: 0 – 40 °C (Bestellnummer: 8610250)",
  "seite": 63,
  "anm": []
 },
 {
  "name": "Toluoldiisocyanat (TDI) (Toluylendiisocyanat)",
  "cas": "91-08-7 / 584-84-9",
  "un": "2078",
  "etw1": 0.083,
  "etw4": 0.021,
  "einheit": "ppm",
  "ueg": "0,9 Vol.-%",
  "nfpa": [
   "3",
   "1",
   "3",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "stechend",
  "aggregat": "flüssig",
  "flammpunkt": "127 °C",
  "zuendtemperatur": "620 °C",
  "roehrchen": [
   {
    "name": "Toluylendiisocyanat 0,02/a",
    "bestellnr": "6724501",
    "huebe": "25",
    "messdauer": "1200",
    "umschlag": "weiß → orange",
    "stufen": [
     {
      "n": 25,
      "s": 1200
     }
    ]
   }
  ],
  "messung": "Vor der Messung ist die untere Reagenzampulle zu brechen und die Ampullenflüssigkeit völlig auf die Anzeigeschicht zu bringen, so dass sich diese gelb färbt. Dann ist die obere Reagenzampulle zu brechen und die Ampullenflüssigkeit auf die Anzeigeschicht zu bringen, die sich dabei wieder entfärbt. Nach Durchführen der 25 Hübe vor der Auswertung 15 min warten. Gebrauchsanweisung für detaillierte Messanleitung beachten!",
  "auswertung": "Anzeige erst nach 15 min auswerten! Die Konzentrationsbestimmung erfolgt mit einem Farbvergleichsröhrchen → Gebrauchsanweisung beachten! Andere Isocyanate werden nicht angezeigt. Keine Störung der Anzeige durch: 5 ppm Anilin, 10 ppm Benzylamin, 5 ppm Toluol, 20 ppm Benzol. Mercaptane entfärben die Anzeige.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Ja",
   "Nein"
  ],
  "haut": "Nein",
  "gewoehnung": "Nein",
  "catex": [
   "keine Angabe",
   "keine Angabe"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 64,
  "anm": []
 },
 {
  "name": "1, 1, 1-Trichlorethan",
  "cas": "71-55-6",
  "un": "2831",
  "etw1": 600.0,
  "etw4": 380.0,
  "einheit": "ppm",
  "ueg": "8 Vol.-%",
  "nfpa": [
   "2",
   "1",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "etherisch milder, chloroformähnlicher Geruch",
  "aggregat": "flüssig",
  "flammpunkt": "–",
  "zuendtemperatur": "490 °C",
  "roehrchen": [
   {
    "name": "Trichlorethan 50/d",
    "bestellnr": "CH21101",
    "huebe": "2 + 3 Desorptionshübe an reiner Luft",
    "messdauer": "90",
    "umschlag": "grau → braunrot",
    "stufen": []
   }
  ],
  "messung": "Beide Röhrchen öffnen und miteinander verbinden. Nach 2 Hüben 3 weitere (Desorptions-)Hübe an reiner Luft durchführen.",
  "auswertung": "Andere Chlorkohlenwasserstoffe werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. In Gegenwart von aromatischen Kohlenwasserstoffen ist die Anzeige zu niedrig, z. B. beträgt die Anzeige bei 200 ppm 1, 1, 1-Trichlorethan und 200 ppm Toluol nur 1/4, d. h. 50 ppm.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 65,
  "anm": []
 },
 {
  "name": "1, 1, 2-Trichlorethan",
  "cas": "79-00-5",
  "un": "3082",
  "etw1": null,
  "etw4": 25.0,
  "einheit": "ppm",
  "ueg": "n.b.",
  "nfpa": [
   "2",
   "1",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "angenehm",
  "aggregat": "flüssig",
  "flammpunkt": "–",
  "zuendtemperatur": "460 °C",
  "roehrchen": [
   {
    "name": "Benzinkohlenwasserstoffe 10/a",
    "bestellnr": "8101691",
    "huebe": "2",
    "messdauer": "60",
    "umschlag": "weiß → braungrün",
    "stufen": [
     {
      "n": 2,
      "s": 60
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "1, 1, 2-Trichlorethan (ppm) = 10 bei 25 ppm Anzeige, 25 bei 100 ppm Anzeige, 50 bei 250 ppm Anzeige. Außer n-Octan werden auch andere organische und anorganische Verbindungen angezeigt.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Nein",
   "",
   "Nein",
   ""
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "–",
  "microtube": "",
  "seite": 66,
  "anm": []
 },
 {
  "name": "Trichlorethen (Trichlorethylen)",
  "cas": "79-01-6",
  "un": "1710",
  "etw1": null,
  "etw4": 100.0,
  "einheit": "ppm",
  "ueg": "7,9 Vol.-%",
  "nfpa": [
   "2",
   "1",
   "0",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "süßlich etherisch",
  "aggregat": "flüssig",
  "flammpunkt": "Ein Flammpunkt kann nicht bestimmt werden.",
  "zuendtemperatur": "410 °C",
  "roehrchen": [
   {
    "name": "Trichlorethylen 50/a",
    "bestellnr": "8101881",
    "huebe": "5",
    "messdauer": "90",
    "umschlag": "hellgrau → orange",
    "stufen": [
     {
      "n": 5,
      "s": 90
     }
    ]
   }
  ],
  "messung": "",
  "auswertung": "Andere Chlorkohlenwasserstoffe werden ebenfalls angezeigt, jedoch mit unterschiedlicher Empfindlichkeit. Bei Anwesenheit freier Halogene und Halogenwasserstoffsäuren im Bereich ihrer AGW-Werte ist eine Trichlorethylen-Messung nicht möglich, da diese ebenfalls angezeigt werden. Benzinkohlenwasserstoffe führen zu einer Verkürzung der Anzeige.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "TCE/0,75",
   "Ja",
   "TCE/0,53"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Ja"
  ],
  "haut": "Ja",
  "gewoehnung": "Nein",
  "catex": [
   "–",
   "–"
  ],
  "cms": "– (Bestellnummer: 6406320)",
  "microtube": "Messbereich: 0,25 – 50 ppm / Messdauer: 20 – 270 s / Temperatur: 0 – 40 °C (Bestellnummer: 8110320)",
  "seite": 67,
  "anm": []
 },
 {
  "name": "Vinylchlorid",
  "cas": "75-01-4",
  "un": "1086",
  "etw1": 1200.0,
  "etw4": 820.0,
  "einheit": "ppm",
  "ueg": "3,8 Vol.-%",
  "nfpa": [
   "2",
   "4",
   "2",
   ""
  ],
  "gasdichte": "schwerer als Luft",
  "geruch": "süßlich",
  "aggregat": "gasförmig",
  "flammpunkt": "-78 °C",
  "zuendtemperatur": "415 °C",
  "roehrchen": [
   {
    "name": "Vinylchlorid 100/a",
    "bestellnr": "CH19601",
    "huebe": "1 bis 18",
    "messdauer": "max. 180",
    "umschlag": "violett → hellbraun",
    "stufen": []
   }
  ],
  "messung": "Luft- oder Gasprobe mit so vielen Hüben durch das Röhrchen saugen, bis der Farbton der Anzeigeschicht mit der Farbvergleichsschicht übereinstimmt.",
  "auswertung": "Hubzahl (ppm): 1 (3000), 2 (1500), 3 (1000), 4 (750), 5 (610), 6 (500), 7 (400), 8 (330), 9 (270), 10 (220), 11 (200), 14 (150), 18 (100). Viele organische Verbindungen mit C = C-Doppelbindungen werden ebenfalls angezeigt, jedoch alle mit unterschiedlicher Empfindlichkeit. Eine Differenzierung ist nicht möglich.",
  "polytest": "Nein",
  "simultan": [
   "Nein",
   "Nein",
   "Nein",
   "Nein"
  ],
  "pid": [
   "Ja",
   "VC/1,65",
   "Ja",
   "VC/1,97"
  ],
  "ex": [
   "Nein* (*Achtung, Stoff vergiftet den Sensor!)",
   "Nein"
  ],
  "haut": "Ja",
  "gewoehnung": "Ja",
  "catex": [
   "–",
   "–"
  ],
  "cms": "Vinylchlorid 10 – 250 ppm --> ETW 4h und 1h überschreiten Messbereich (Bestellnummer: 6406230)",
  "microtube": "",
  "seite": 68,
  "anm": []
 }
]);
