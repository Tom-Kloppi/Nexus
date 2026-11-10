# VISUAL_FIX3_BRIEF: Visuals und UI, Welle 3

Stand: Commit 8afcf84 (05.11.2026). Auftraggeber: Tom. Gehört nach `docs/VISUAL_FIX3_BRIEF.md`.
Grundregel: keine grundlegenden Mechaniken ändern. DESIGN.md bleibt Vertrag, Regeln bleiben in state.js.
Hot-Seat-Schutz (`isHotSeatShield`) darf durch nichts hier aufgeweicht werden.

## Befund aus dem Code (bitte selbst gegenprüfen)

1. Build-Highlight: `mats.buildPulse = lambert("#3ee0c4")` (board3d.js, buildMaterials) ist fest cyan. Der Ring entsteht im Zweig der unbebauten Felder (`rebuildTiles`, `new THREE.Mesh(geo.cyl6, mats.buildPulse)`) und wird in der Animationsschleife über `buildRings` pulsiert.
2. Graustufen: `desaturateGroup(group)` tauscht nur Materialien der Gruppe aus und überspringt `mats.grass`, `mats.grassDeep`, `mats.lot`. Danach werden `addGreenPatches` und `dressTileProps` aufgerufen, diese Props sind also nicht entsättigt. Das Biom-Pad (`padKey = "grass"`) bleibt farbig.
3. Neuzeichnen: `fingerprint(state, ui)` enthält `ui.inspectedZoneId`, `ui.homeOpen`, die Phase build/play und den Zustand aller Zonen. Jede Änderung führt in `sync()` zu `tearDownCity()` und einem kompletten phasenweisen Neuaufbau (static, roads, dress, tiles, Autos, Busse). Das ist die Ursache für das ständige Neuladen.
4. Autos: `CAR_COUNT = 16`, überschrieben durch `q.carCount` aus quality.js. `spawnCars()` setzt Fahrzeuge auf `graph.keys[i % length]`, Spur fest `lane = ±0.38`. Modell: `geo.car = BoxGeometry(0.85, 0.48, 1.85)`, Bus über `busBody()`. Kein Parken, keine Lichter.
5. Gebäude und Props: die Dichte der 3D-Modelle pro Feld ist niedrig (`dressTileProps`, `board-props.js`, Zähler `dressingCounts`).

## Aufgaben

### A. Feldfarben
1. Highlight bebaubarer Felder (Ring/Glow) in einem Pastellton der Farbe des Spielers am Zug. Nicht mehr cyan. Gilt auch für das empfohlene Feld (`rec`).
2. Unbebaute Felder komplett in Graustufen: Boden, Gras, Bäume, Büsche, Props, Gebäude, auch Patches und Dressing. Auch kein bläuliches Gras. Fehlender Fall ist `addGreenPatches` und `dressTileProps` nach `desaturateGroup`. Lösung bevorzugt über einen zentralen Entsättigungspfad (zum Beispiel eigene graue Materialsätze), nicht durch nachträgliches Durchtraversieren.
3. Bebaute Felder eines Spielers: alle Gebäude vollständig in der Farbpalette der Spielerfarbe (Abstufungen davon). Kein reines Schwarz oder Weiß. Props dürfen bunt bleiben.
4. Beim Bauen wechselt das Feld von grau zu Farbe. Kurze Übergangsanimation ist erwünscht, aber optional.

### B. Kein unnötiges Neuzeichnen
1. `fingerprint` darf keine UI-Zustände enthalten (Inspektion, Menüs, Home-Dialog, Spielerwechsel). Diese dürfen höchstens Highlights umschalten, nie die Stadt abbauen.
2. Beim Bau wird nur das betroffene Feld neu gebaut (Dispose nur dieser Gruppe). Ein Komplettaufbau passiert nur bei Spielstart, Biom-, Theme- oder Qualitätswechsel.
3. Nachweis: Zähler für `tearDownCity` und `rebuildTiles`-Aufrufe in einem Testlauf, vorher und nachher im Report.

### C. Fahrzeuge
1. Deutlich mehr Fahrzeuge, trotzdem performant: InstancedMesh pro Fahrzeugtyp, keine eigene Mesh pro Auto. Anzahl hängt an den bestehenden Qualitätsstufen.
2. Bessere Modelle, vor allem Bus (Fenster, Räder, Proportionen). Kleine Variantenzahl reicht, wenn sie gut aussieht.
3. Sinnvolles Spawnen (an Rändern oder Parkplätzen, nicht aus dem Nichts auf Kreuzungen) und Parken am Straßenrand, inklusive Ausparken und Einfädeln.
4. Scheinwerfer mit sichtbarem Lichtkegel bei Nacht. Günstige Variante (additiver Kegel oder Billboard) statt echter SpotLights. Echte Lichter nur, wenn die Messung es erlaubt.

### D. Mehr 3D-Inhalt und Filler-Modelle
1. Mehr sichtbare Dreiecke und Objekte pro Feld, über die Qualitätsstufen skalierbar. Fester Messwert: Dreiecke pro Frame vorher und nachher.
2. **Frage an Cursor (bitte beantworten, bevor etwas gebaut wird):** In welchem Format und in welchem Ordner soll Tom Filler-Modelle liefern (er hat freie Unity-Assets)? AGENTS.md verbietet derzeit eine GLTF-Bibliothek. Vorschlag prüfen: Modelle offline über ein Skript in `tools/` zu kompakten JS-Geometriedaten backen, oder einen kleinen vendored Loader erlauben. Bitte beide Wege mit Aufwand, Dateigröße und Performance bewerten, einen empfehlen und die Lieferanleitung für Tom schreiben (Dateiformat, Polygonlimit, Ursprung, Maßstab, Namenskonvention, Lizenzhinweis in einer Credits-Datei).

### E. Ressourcenfluss sichtbar machen
1. Nach allen Dialogfenstern, aber bevor der Spieler handeln kann: 3 Sekunden Pause für Gewinne, dann 3 Sekunden Pause für Verluste.
2. Gewinne: grüne Partikel oder kleine 3D-Objekte fliegen aus den produzierenden Feldern zur Ressourcenanzeige der UI. Verluste: rote Partikel fließen aus der Ressourcenanzeige in die betroffenen Felder oder weg davon.
3. Berechnung der Bildschirmposition über Projektion der Feldmitte in UI-Koordinaten. Qualitätsstufen beachten (weniger Partikel bei niedriger Stufe). Das Einfrieren sperrt nur Eingaben, nicht die Kamera-Idle-Animation.
4. Hot-Seat: Animation erst nach dem Aufheben des Schutzes für den Spieler am Zug, es darf nichts über andere Spieler sichtbar werden.

### F. Würfel
1. `dice.js` und die Darstellung sind aus Spielersicht unübersichtlich. Bitte zuerst analysieren und kurz berichten, was aktuell passiert. Danach eine klare Darstellung bauen: ein Würfel, sichtbarer Wurf, Ergebnis gegen die Feldzahl deutlich markiert, Folge (Ausfall bis Boom) in einem Satz.
2. Die Regel bleibt transparent (Wurf gegen Feldzahl). Keine verdeckten oder gacha-artigen Effekte. Serverseitiges Würfeln über `server/app.py` unverändert lassen.

### G. Karten
1. Handkarten ohne weiße UI-Leiste. Sie schweben am unteren Rand wie UNO-Handkarten (leichter Fächer, Hover hebt eine Karte an).
2. Nachziehstapel entfernen.
3. Karteninhalt: Titel, Kategorie über Farbe, Wirkung über Icons mit Plus oder Minus und Menge. Kein Fließtext auf der Karte, ausführlicher Text nur im Hover.

### H. Obere Leiste, Ziele, Charaktere
1. Obere UI-Leiste auf Kollisionen und visuelles Durcheinander prüfen (alle Viewport-Größen 1280x720 bis 1920x1080 sowie UI-Skalierung). Ergebnis als Screenshot-Vergleich.
2. Die Zielanzeige steht doppelt (oben und rechts). Rechts funktional machen (klickbar, vollständig), oben streichen.
3. Charakter-Icons oben nicht mehr klickbar. Alle Spieler nebeneinander mit Rolle und Icon. Um jedes Icon ein sehr gut sichtbarer Ring, der die Gesamtfortschrittsanzeige in 25-Prozent-Schritten zeigt.
4. **Achtung Geheimhaltung:** Rollen und Ziele sind laut README geheim. Bitte in DESIGN.md prüfen, was öffentlich ist. Angezeigt werden darf nur, was öffentlich ist (öffentliche Ausrichtung statt geheimes Ziel). Die 25-Prozent-Stufung dient dazu, keine genauen Werte zu verraten. Bei Konflikt mit DESIGN stoppen und fragen.

### I. Ereigniskarten
1. Weniger Text, weniger Durcheinander, mehr Lerneffekt: ein klarer Satz zur Situation, die Wahl mit sichtbaren Folgen als Icons, darunter ein kurzer Lernsatz (Warum ist das ein Zielkonflikt bei Smart City?).
2. Inhalte liegen in `js/data/`, Layout in `render.js` (`renderEventModal`).

## Arbeitsweise
1. Lokaler Lauf auf Toms Rechner mit GPU und echtem Browser. Der Agent soll das Spiel selbst starten, Screenshots machen (Rolle wählen, Bauphase, Nacht, Kameraextreme) und seine Änderungen damit prüfen. Browser-Automatisierung nur als Hilfswerkzeug außerhalb der Spiellogik, nichts davon ins ausgelieferte Spiel.
2. Alles auf eigenem Branch, nicht auf main. Merge erst nach manueller Inspektion durch Tom.
3. Mehrere Subagents erlaubt, der Hauptagent koordiniert.
4. Bibliotheken nur, wenn essenziell, herausragend für Optimierung oder für alternative Rendermöglichkeiten. Begründung dann im Report.
5. Nach jeder JS/CSS-Änderung `?v=` in `nexus/index.html` erhöhen. Bei Vertragsänderung DESIGN.md und CHANGELOG ergänzen.
6. Abschlussreport in `docs/VISUAL_FIX3_REPORT.md`: pro Aufgabe A bis I erledigt, teilweise oder nicht, mit Messwerten (FPS, Dreiecke, Neuaufbau-Zähler) und Screenshots. Offene Punkte ehrlich nennen.
