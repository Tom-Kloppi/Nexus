# VISUAL FIX 3 — Bericht

Branch `visual-fix-3`. Gemessen im lokalen Browser mit GPU (Chromium über die IDE), Partie 2 Spieler, Nacht per Theme-Umschalter. Qualitätsgovernor dieses Laufs: Stufe **minimal**, Deckel **high** (FPS im Automationsfenster zeitweise niedrig). Deshalb sind Autos und Props unten am unteren Ende der Tabelle, nicht auf Ultra.

Screenshots: `docs/visual-fix3/`.

## Messung

| | Vorher (Tag, erste Stadt) | Nachher |
| --- | --- | --- |
| `tearDown` nach Spielstart | 1 | 1 |
| `tearDown` nach Phasenwechsel Risiko → Bau | 2 (+1) | 1 (+0) |
| `rebuildTiles` nach diesem Wechsel | 62 (+31) | 35 (+0) |
| `tearDown` nach Tag → Nacht | — | 2 (+1, Absicht) |
| `rebuildTiles` nach Nacht | — | 66 (ein kompletter Kacheldurchgang) |
| Dreiecke / Frame | 26 136 | 31 880 Tag, 23 952 Nacht |
| Draw-Calls | 485 | etwa 530 |
| FPS | 2, dann 29 | 28 |
| Autos im Lauf | 4 | 8 (Stufe minimal; Tabelle unten) |

Klick aufs Brett und Öffnen des Bau-Menüs haben `tearDown` und `rebuildTiles` nicht erhöht.

## A — Feldfarben — erledigt

Bebaubare Felder: Ring in einem Pastell der Farbe der Person am Zug, auch das empfohlene Feld (dieselbe Farbe, schnellerer Puls). Freie Felder werden über einen grauen Materialsatz gebaut (Boden, Gras, Props, Billboards), nicht erst hinterher durchlaufen. Eigene Gebäude nutzen vier Abstufungen der Spielerfarbe, kein reines Schwarz oder Weiß. Props und Geräte-Gizmos bleiben bunt. Der vorhandene Place-Pop ist der Farbwechsel beim Bauen.

Siehe `build-1920.png`, `night-1920.png`.

## B — Neuzeichnen — erledigt

`fingerprint` hängt nicht mehr an Inspektion, Home-Dialog, Phase oder Spielerwechsel. Highlights und Pick-Daten werden nur umgeschaltet. Ein Bau ersetzt die eine Kachelgruppe und die zugehörigen Instanz-Einträge. Komplettabriss nur bei Start, Biom, Theme, Qualität.

## C — Fahrzeuge — teilweise

Pro Typ ein `InstancedMesh` (Auto, Van, Bus, Fahrrad) plus ein additiver Kegel für Scheinwerfer, nur nachts. Spawn an Knoten mit wenig Ausfahrten, nicht bei `u = 0`. Zustand parken / ausfahren / fahren / einfahren. Stückzahlen in `quality.js`: minimal 8, low 14, medium 22, high 32, ultra 40. In diesem Lauf hat der Governor auf minimal gedrosselt, deshalb 8 Autos. Einen Bus aus der Nähe habe ich im Bild nicht isoliert geprüft.

## D — Filler — Schnittstelle, keine Modelle

Mehr kleine Kisten pro Feld, skaliert mit `props`. Dreiecke siehe Tabelle. Modelle fehlen. Ablage und Baker: unten und in `nexus/assets/fillers/inbox/README.md`. `python3 tools/bake_fillers.py` schreibt nach `nexus/js/data/fillers.js`. Keine GLTF-Bibliothek im Spiel.

## E — Ressourcenfluss — teilweise

Beim Eintritt in die Bauphase, nach den Dialogen und nur ohne Hot-Seat-Schild: 3 Sekunden grüne Punkte von eigenen Feldern zur Leiste, danach 3 Sekunden rote Punkte für bereits gebuchte Verluste (Transformator, Ereignis-Kosten). Eingaben sind gesperrt, Orbit/Pan nicht. Kamera-Idle läuft weiter. Cloud-Upkeep wird am Zugende unter dem Schild gebucht und deshalb hier nicht animiert. Den 3-Sekunden-Flug habe ich nicht als Standbild erwischt.

## F — Würfel — teilweise

`dice.js` und der Server bleiben. Der Produktionswurf ist ein d100, gemappt auf die vier Bänder (Ausfall, Normal, Gut, Boom) gegen die Feldzahl. Die alte SVG-Nadel hing an totem Markup. Während `spinning` zeigt `#dice-stage` eine Zahl, das getroffene Band und einen Satz. Nach dem Risikowurf bleibt dieselbe Bühne 2,8 Sekunden mit Wurf gegen die beiden Schwellen. Den kurzen Produktionswurf habe ich nicht fotografiert. Der Risiko-Dialog davor ist noch der alte Textblock (`before-build.png`).

## G — Karten — teilweise

Nachziehstapel ist aus dem Layout. Handkarten sind ein Fächer ohne Leiste (`hand-fan`): Titel, Kategorie als Farbe, Wirkung als Plus/Minus, Fließtext nur als Hover. In der Testpartie war die Hand leer, der Fächer also nicht im Bild. Die drei Projektkarten im Tray sind der Markt, nicht die Hand, und tragen weiter Kurztext.

## H — Leiste und Ziele — erledigt, mit einer Grenze

Oben kein zweites Prozent mehr (`goal-pill` bleibt zu). Rechts bleibt das volle eigene Versprechen, klickbar über „Ziele“ (`goals-night.png`). Das ist die sitzende Person nach dem Schild, nicht die anderen.

Chips sind keine Buttons mehr. Alle Personen stehen nebeneinander mit Icon und **öffentlicher Ausrichtung** (Sicherheit, Umwelt, …), nicht mit dem geheimen Titel (Datensicherheit, …) und nicht mit Unterzielen. Der Ring ist ein 25-Prozent-Raster (`--q`), plus ein farbiger Rand, damit 0 % nicht unsichtbar ist. Unter dem Schild bleibt „Verdeckt“.

Bei 1280 px bricht der Kapiteltext in der Leiste um (`build-1280.png`). Die zwei Chips und die Wallet überlappen sich dort nicht. 1920 px ist ruhiger (`goals-night.png`).

## I — Ereignisse — teilweise

`renderEventModal` zeigt einen Satz, die Wahl mit Icon und Plus/Minus, darunter den Lernsatz aus `Nexus.EVENT_LESSONS`. Ein Ereignis ist in der Testpartie nicht gefallen, das Layout also nicht im Screenshot.

## Bibliotheken

Keine neue Laufzeitbibliothek. Three.js r158 bleibt vendored. Filler werden offline gebacken.

## Offen

- Filler-GLBs von Tom, dann Baker laufen lassen.
- Würfelbühne und Ressourcenflug nicht als Standbild belegt.
- Bus aus der Nähe und Scheinwerferkegel bei mehr als 8 Autos nicht belegt (Governor auf minimal).
- Kapitelzeile bei 1280 px umbricht.
- Upkeep-Animation am Zugende wäre unter dem Schild und wurde weggelassen.
