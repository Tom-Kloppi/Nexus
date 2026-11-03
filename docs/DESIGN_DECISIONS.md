# Design-Entscheidungen — Overhaul 2

Code schlägt ältere Sätze in DESIGN, soweit diese Datei das ausdrücklich ändert. Begründung steht hier, nicht nur im Diff.

## Risiko

Der Zähler `player.risk` bleibt die Metrik für Datensicherheit, wird aber abgeleitet:

- Cyber: Cloud-Geräte, unsicheres Datenzentrum, hohe SAE ohne lokales V2X. Lokal, Schloss, Hub, gesichertes DC ziehen ab.
- Netz: Wohn- und Cloud-Bedarf minus Solar, Transformator, Speicher, Solardach.
- Abhängigkeit: proprietärer Standard, Cloud ohne Lokalgerät, nur Transformator.
- Verkehr: Parken ohne Linie. Halte und E-Bus mildern.

Summe 0–16/12/10/12 plus Schock (Ereignisse), gedeckelt bei 40. Schock fällt um 1 pro eigenem Zugende.

Wahrscheinlichkeit steht vor dem Wurf: negativ etwa `6 + 1,35 × Basis`, gedeckelt, plus Großereignis im letzten Kapitel. Positiv, wenn die Basis klein ist. Wurf ist ein offener d100. Die Karte nennt Ursache und Gegenmaßnahme. Stromausfall schaltet Cloud aus, lokale Geräte bleiben, Speicher gibt 1 Energie.

Leere Stadt zählt beim Risiko-Teilziel nicht als „sicher“: zur Zahl kommen `max(0, 6 − Felder − Geräte)`.

## Karten

Die Pflicht-Hand entfällt. Drei Projektkarten liegen offen, Kauf spielt sie sofort. Kosten nach Kategorie, im Einsteiger-Modus 1 Geld weniger. Geschenkte Karten (Ereignis, Boom) bleiben eine Inbox und nutzen den alten Ausspiel-Pfad.

Aktionen am Feld kommen aus `FieldActions` (bauen, ausbauen, abreißen, Halt, Busbahnhof, Parkhaus, Linie, SAE, Geräte).

## Mobilität

Straßengraph: jede Kachel im Radius plus sechs Randknoten `rim-0`…`rim-5`, untereinander zum Ring verbunden und an die Hex-Ecken gehängt. Damit hat der äußere Ring einen Anschluss, nicht nur Innenkanten.

Haltestelle: 2 Geld (Einsteiger 1) auf eigenem Nicht-Leitstand. Busbahnhof auf einer Verkehrsfläche (3 Geld, 1 Bandbreite) schaltet Linien frei, analog zum Datenzentrum. Parkhaus: 4 Geld, 2 Energie, einmalig +1 Komfort und +1 Umwelt, danach +1 Energie pro Zug (Solardach). Weitere Parkhäuser zählen fürs Teilziel, nicht noch einmal für die Spur.

Linie: mindestens zwei Halte, Weg über den Graphen, Kosten `2 + Kanten` Geld (Einsteiger `1 + Kanten`) und 1 Bandbreite, ab SAE 3 eine weitere. Antrieb: Diesel immer; Elektro braucht Energiefläche, Ladesäule oder Parkhaus; erneuerbar braucht Solar oder Speicher. Einmalig Komfort über Wohn-Halte (max 2), Diesel +1 Komfort, erneuerbar +1 Umwelt, fremde Halte +1 Image. Pro Zug höchstens +3 Energie und +2 Geld.

Erstes Verkehrsfeld: +1 Komfort. Weitere Parkplätze nicht noch einmal, sonst gewinnt Flächen-Spam.

SAE: Stufe 1 nur Geld. Stufe 2 Sensorik. Stufe 3 eigenes Datenzentrum. Stufe 4 V2X. Stufe 5 lokales V2X oder gesichertes DC. Ab Stufe 4 Schock, weil die Technik ausfällt, wenn Cyber oder Netz schlecht sind.

## Rollen auf 100 %

Die Caps lagen bei 110–112 und sind auf 100 zurückgesetzt. Jede Rolle hat ein Mobilitäts-Teilziel: erneuerbare Halte, abgeschirmte SAE, Wohnen an der Linie, SAE-Stufe, fremde Halte, Parkhaus/Bahnhof. Schwellen für Sicherheit, Geld und Zonen sind an den Ertrag pro Zug angepasst, damit ein einzelnes Feld nicht zur Runde 8 alles vollmacht. Datensicherheit bekommt das große SAE-Teilziel, damit „nur lokal und nichts weiter“ nicht reicht.

## Bogen

Vier Kapitel nach Rundenanteil: Grundversorgung, Vernetzung, Mobilität, Resilienz. Im letzten Kapitel ist ein Großereignis bewaffnet (Blackout, Datenabfluss, Verkehrskollaps), einmal, mit erhöhter Schwelle. Die Schlussbilanz nennt Erneuerbaren-Anteil, Autarkie, lokalen Geräteanteil, Komfort, Resilienz.

## Würfel

`Nexus.Dice` zieht aus einem Beutel. FastAPI `/api/roll` und WebSocket `/ws` füllen ihn mit `secrets`. Ohne Server nach 400 ms lokal, Quelle wird angezeigt (`server`, `local`, `seed`). Der Produktionswurf mappt d100 auf die bekannten Gewichte und zeigt die Schwelle.

## Partie-Hülle

Undo nur aus der Bauphase, höchstens acht Schnappschüsse, ohne Stapel im Schnappschuss. Speicher über `localStorage`. Schwierigkeit: leicht Start 5 und geringere Ereignis-Chance, schwer Start 2 und höhere Chance. Einsteiger: kein proprietärer Standard, billigere erste SAE-Stufe, billigere Halte und Linien.

Dialog-Engine: ein Platzhalter-Schritt, kein fertiges Intro.

## Ernte-Umwelt und Linien-Image

Mehrere Solarfarmen liefern weiter jeweils Energie. Die Umwelt-Spur bekommt daraus höchstens +1 pro eigener Ernte, ein Umspannwerk höchstens −1. Der Ertrag stapelt, die Punktespur sagt nur „ihr fahrt erneuerbar“. Sonst entscheidet die Zahl der Solarfelder die Partie, bevor Mobilität und Datenschutz ins Spiel kommen.

Eine eigene Linie mit mindestens einem fremden Halt gibt +1 Image pro Zug, solange Image unter 8 liegt. Die fünfte Stufe des Gemeinwohl-Versprechens liegt bei 8, also genau an dieser Decke. Frühere Stufen bleiben bei 1, 2, 4 und 5.

## Was bewusst nicht gebaut wurde

Kein Multiplayer. Der Server würfelt nur und liefert die Dateien aus. Keine neue Frontend-Bibliothek: Three bleibt vendored, UI bleibt HTML/CSS/JS. Neue Geräte-IDs gibt es nicht.
