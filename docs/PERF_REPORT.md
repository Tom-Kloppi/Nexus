# Leistung — Bericht

Stand: 3. November 2026, Europa/Berlin. Rückkehrpunkt ist der Tag `pre-perf` auf `743567e`. Regeln, Balancing und Karteninhalte sind unverändert. `node tools/sim.js 0` bleibt `ok`.

## Ursache

Der Hänger sitzt nicht in der Rollenlogik. `acknowledgeRoleReveal` ändert nur den Index. Teuer wird der erste Aufbau der 3D-Stadt, und der lief mitten in dieser Ansicht.

Beleg, vorher, `node tools/stress.js` mit einer THREE-Attrappe, 4 Spieler:

| Messung | Vorher |
| --- | --- |
| Meshes beim ersten `sync` in `role_reveal` | 854 |
| `dispose`-Aufrufe | 0 |
| Meshes nach dem Durchklicken bis `produce` | 1570 |

Mechanismus:

1. `startGame` setzt `screen` auf `game` und `turnPhase` auf `role_reveal`. Der erste `Nexus.render` ruft `Board3D.sync`.
2. `ensure` hat sofort `buildStaticCity` gebaut, `sync` danach Straßen, alle Felder und Fahrzeuge. Das passiert auf dem Klick „Partie starten“, also während die Rollenkarte schon offen ist.
3. `fingerprint` enthielt `turnPhase`. Der letzte Klick „Verstanden“ stellt auf `produce` und hat die Stadt ein zweites Mal gebaut.
4. `clearGroup` hat Kinder nur aus der Szene genommen, Geometrien und geklonte Materialien nicht mit `dispose` freigegeben. Ampeln und Lichtpools klonen Materialien (`board3d.js`, früher um die Licht-Schleife).

Keine Endlosschleife in der Pfadsuche, kein `MutationObserver`, kein zweites `requestAnimationFrame`, das sich pro Klick stapelt. Die Animationsschleife lief aber schon während der Rollenansicht und hat jedes Frame Autos, Vögel und die ganze Szene gezeichnet.

Nach dem Fix, derselbe Test mit `--expect-fix`:

| Messung | Nachher |
| --- | --- |
| Meshes in `role_reveal` | 0 |
| Szenenknoten nach einem vollen Aufbau | 740 |
| Dieselben Knoten nach sechs weiteren Aufbauten | 740 |
| `dispose`-Aufrufe in der Attrappe | etwa 2500 |

`role_reveal` baut keine Stadt. Die Schleife steht. Der Aufbau beginnt erst bei `produce`, in Scheiben von 8–12 ms, mit dem Balken „Stadt wird aufgebaut“. Der Fingerabdruck der Stadt ignoriert die Zugphase, solange sie nicht die Bauphase ist. Sonst würde jede Ernte die Stadt neu erzeugen.

## Änderungen

| Commit-Thema | Dateien |
| --- | --- |
| Stadt nicht in der Rollenansicht, Freigabe, Scheiben, Instancing | `nexus/js/board3d.js` |
| Stufen, Kalibrierung, Governor | `nexus/js/quality.js`, `tools/quality.test.js` |
| Menü, Absturzwächter, Debug, tote Hand | `nexus/js/main.js`, `nexus/js/ui-overhaul.js`, `nexus/js/render.js`, `nexus/index.html`, `nexus/overhaul.css`, `nexus/js/data/tutorial.js` |
| Messung | `tools/stress.js`, `tools/glstub.js` |

Wände, Zylinder und Kugeln eines Feldes landen in `InstancedMesh` pro Material. Dächer bleiben eigene Meshes, damit die Besitzerfarbe weiter per Materialtausch sitzt. Picking bleibt auf den flachen Hitboxen. Pins und der Ernte-Chip sind absichtlich keine Instanzen, weil sie sich drehen oder skalieren.

Die alte Handleiste (`#hand-fan`) ist aus dem DOM, aus `render.js` und aus dem Klickhandler. Die Anleitung zeigt auf den Projektfächer.

## Stufen

Quelle: `nexus/js/quality.js`, Tabelle `TABLE`. Auszug:

| | Niedrig | Mittel | Hoch |
| --- | --- | --- | --- |
| Pixel-Cap | 1 | 1,25 | 1,75 |
| Render-Scale | 0,65 | 0,85 | 1 |
| Antialias | aus | aus | an |
| Schatten | aus | aus | aus |
| Nebel | an | an | an |
| Wolken / Vögel / Windräder | 2 / 2 / 2 | 4 / 4 / 4 | 6 / 8 / 5 |
| Props-Faktor | 0,65 | 0,95 | 1,25 |
| Autos | 12 | 22 | 36 |
| Kenney-GLB | aus | an | an |
| Partikel | aus | an | an |
| Backdrop-Blur | aus | aus | an |
| FPS-Cap | 30 | 60 | 60 |
| Render nur bei Bewegung | ja | ja | ja |
| Scheibe | 8 ms | 10 ms | 12 ms |

Menü: nur die drei Presets. Legacy `auto`/`minimal`/`ultra` mappt auf Mittel/Niedrig/Hoch. Software-Renderer fällt auf Niedrig. `?quality=` gewinnt gegen das Menü.

## Governor

`pushFrame` in `quality.js`. Ziel 16,7 ms oder 33,4 ms.

- Ein Frame über 100 ms zählt als Spitze und senkt die Scale nicht.
- Zehn langsame Frames senken die Render-Scale in 0,1-Schritten bis 0,55.
- Nach 240 ruhigen Frames und 8 s Pause steigt die Scale wieder; die Preset-Stufe bleibt fest.
- `tools/quality.test.js` prüft stabile Folge, Dauerlast (nur Scale), Spitze, Oszillation, Software-Renderer, Absturzwächter und URL-Migration.

Absturzwächter: `localStorage` `nexus-session-open` wird beim Laden gesetzt und nach 8 s gelöscht. Steht er beim nächsten Start noch, startet das Spiel eine Stufe tiefer und zeigt einen Toast.

## Annahmen

- Leere Framezeiten sind ein brauchbarer erster Anker, kein Ersatz für ein Profil der vollen Stadt.
- Schatten sind abgeschaltet. Gebackene Lichtpools der Laternen bleiben.
- Instancing gilt für die Baukasten-Körper, nicht für Dächer und nicht für jedes Prop-Sprite.
- Ein Stufenwechsel im Lauf tauscht die Autozahl und die Auflösung. Die Gebäudezahl zieht nach, wenn die Stadt ohnehin neu entsteht.

## Ungeprüft

Headless Chrome hat in Overhaul 2 kein Bild geliefert. Diese Runde hat die Stadt nur in der THREE-Attrappe gezählt, nicht auf deinem Laptop. FPS, Draw Calls, Nacht, Minimal gegen Ultra und das Menü sind visuell ungeprüft. Die Checkliste steht in `docs/LOCAL_QA.md` unter Leistung.

## Offen

- Ein GPU-Benchmark mit einer kleinen Szene vor dem Stadtaufbau wäre ehrlicher als 700 ms Leerlauf.
- Prop-Billboards sind noch nicht instanziiert.
- Der Governor baut die Stadt nicht bei jedem Stufenwechsel neu, damit er nicht selbst zum Ruckler wird.

## Nächster Schritt

Einmal `?debug=1` und `?quality=low` auf dem Laptop, Rollen durchklicken, den kopierten Perf-Bericht und bei Bedarf ein Chrome-Leistungsprofil schicken.
