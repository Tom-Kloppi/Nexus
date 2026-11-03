# Changelog

Neueste Welle zuerst. Das ist die **Geschichte** des spielbaren Stands — nicht der Vertrag. Aktuelle Regeln: [`DESIGN.md`](DESIGN.md). Labels der Figuren: [`CAST_22_9.md`](CAST_22_9.md). Grafik-Schnitte: [`CITY_3D_CUTS.md`](CITY_3D_CUTS.md).

Neue spielbare Welle: hier einen Block anlegen (Datum, Branch, Warum, Regeln, Grafik). DESIGN nur ändern, wenn sich der Vertrag ändert.

## Overhaul 2 — Risiko, Markt, Mobilität, Stadt (2026-11)

**Branch / Stand:** `main`. Rückkehrpunkt: Tag `pre-overhaul-2`.

**Warum.** Risiko war ein Zähler ohne Ursache, Karten eine Leiste, Mobilität ein Stub, die Stadt wirkte leer.

**Regeln.** Abgeleitetes Risiko mit offenem d100, Projektmarkt mit drei Karten, Straßengraph mit Randring, Haltestellen, Busbahnhof, Linien, SAE-Tore, Kapitel und Schlussauswertung. Umwelt aus der Ernte höchstens ±1 pro Zug. Fremde Halte geben Image bis 8. Zahlen und Begründung: [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md).

**Präsentation.** Baukasten pro Zone, entsättigte freie Felder, Fahrzeuge mit Spur, Tempo und Elektro-Anteil, Kulisse je Biom, Feldmenü und Projektfächer, Tooltips mit Glossar. Debug hinter `?debug`. Würfelserver `server/app.py`.

**Smoke:** `node tools/sim.js 0`. Bot-Partien: `node tools/sim.js 36`.

## 3.1 — Visuals/UI-Overhaul (2026-10)

**Branch / Stand:** `main` (Merge von `cursor/visuals-ui-overhaul-d004`). Vorheriger `main`: `archive/main-pre-visuals-ui-d004` (`af71e2a`). Freeze 2.1 bleibt `prototype`.

**Warum.** Die WebGL-Stadt wirkte grau/dunkel, die Nacht war kaum spielbar, Laternen und Hitboxen stimmten nicht, die UI fraß Platz vom Brett, Rollen/Ziele und Ressourcen waren schwer lesbar.

**Regeln.** Unverändert gegenüber 3.0 (3 Ressourcen, 4 Spuren, Expand/Ausbau, Hot-Seat, öffentliche Geräte). Kein Balancing.

**Präsentation**
- Biom-Untergrund (Gras/Wüste/Wasser, Pref `nexus-biome`), große Platte, Nebel, Horizontkulisse.
- Tag heller/wärmer; Nacht dunkelblau mit genug Ambient/Mondlicht; Laternen = emissive + Glow + Boden-Lichtpools (keine PointLights).
- Stadtdichte: zonenabhängige Billboard-Props; unkontrollierte Felder schon bebaut; seedbasierte Grünflächen inkl. Teilflächen; Autos in Fahrtrichtung.
- Besitz: klar getrennte Spielerfarben auf der Pad-Fläche, leuchtender Rand, Dach-Akzent; Bebaubarkeit pulsierend; Picking auf flacher Boden-Hitbox.
- Kamera: Polar-/Zoom-/Pan-Clamps, Dämpfung, nicht unter den Boden.
- Layout: 3D-Canvas full-bleed; Topbar/Dock/Tray als halbtransparente Overlays; Dock standardmäßig Schiene, ausklappbar.
- Rollen-Steckbriefe mit SVG-Avataren; Glossar Spur/Stufe/Prozent; Bandwidth-Icon ↑↓; Ressourcen-Flugpartikel zur Wallet.

**Smoke:** `Nexus.runSmokeCheck()`. Cache-Bust `?v=` in `nexus/index.html`.

## 3.0 — WebGL-Stadt, 6 Spieler, Anleitung (2026-09)

**Branch / Stand:** damals `main` (`1427ea0`); jetzt Archiv-Vergleich über `archive/main-pre-visuals-ui-d004` bzw. History. Zusammengeführt aus `cursor/city-3d-board-5bc5`, `cursor/six-player-cast-5bc5`, `cursor/tutorial-mode-c265`. Vorheriger `main`: `archive/main-pre-webgl-cast-5bc5`.

**Warum.** Das SVG-Brett las sich nach Rotation falsch (Malreihenfolge), war auf Laptops zu schwer und fühlte sich wie ein Dorf an. Cast 22.9 braucht sechs Figuren am Tisch. Playtest wollte Erklärung, ohne eine neue `turnPhase`.

**Regeln**
- 2–6 Spieler; ab 4 Personen Hex-Radius 4, Homes fair auf den Ecken.
- Alle gebauten Geräte sind öffentlich (Cloud und lokal). Cloud/lokal bleibt Mechanik (Risiko, Upkeep, lokal %). Rolle, Wallet, Versprechen bleiben privat.
- Wahlversprechen-IDs unverändert, Labels/Unterziele = Charakter-Stand 22.9.

**Präsentation**
- Distrikt = vendored Three.js in `board3d.js` (Volumen, Z-Buffer, Kantenstraßen, Autos Feld→Feld).
- Besitz = Pastell der Spielerfarbe, keine Owner-Ringe. Leitstand zu Zugbeginn unten, Stadt voraus.
- Grafik-Preset Auto/Qualität/Balance/Leistung (`nexus-board-quality`). Orbit: rechts/mittel ziehen; Pan links; Zoom Rad.
- Chrome/Himmel teal statt reinblau. Toasts über dem Tray, nicht über „Zug beenden“.

**Anleitung.** Overlay + Spotlight (`data/tutorial.js`), keine Coach-`turnPhase`. Setup-Button „Anleitung“, Inhaltsverzeichnis, In-Game-Hilfe.

**Smoke:** `Nexus.runSmokeCheck()`.

## 2.2 — SVG-Stadt, Kantenstraßen, Ausbau (2026-09, vor WebGL)

**Branch:** in `archive/main-pre-webgl-cast-5bc5` / älteres `main`. Oneshot + Folgestand nach Playtest.

**Warum.** Flache Hexes mit Icons waren kein Stadtplan. Konzept: Straßen auf Kanten, Verkehr = Gebäude, ein Großbau pro Kachel.

**Was.** Extrudierte SVG-Blöcke, Acker- dann Gewerbe-Rand, Autos auf Hex-Ringen (später durch Kantennetz ersetzt), Feld-Ausbau 0–2, Abriss nur wenn verbunden, Handel = Angebot statt Sofort-Tausch. App-Shell CSS-Grid, Tag/Nacht. Noch 2–3 Spieler, lokale Geräte visuell privat.

## 2.1 — Freeze Prototyp

**Branch:** `prototype` (nicht löschen).

Fünf Ressourcen, alte Zonen, flaches Board. Vergleichsstand vor dem Redesign. Playtest-Stimme: [`PLAYTEST_AENDERUNGSLISTE.md`](PLAYTEST_AENDERUNGSLISTE.md).

## Ältere Archive

| Ref | Inhalt |
| --- | --- |
| `archive/main-pre-visuals-ui-d004` | `main` vor Visuals/UI 3.1 (`af71e2a`) |
| `archive/main-pre-webgl-cast-5bc5` | `main` vor WebGL/Cast/Anleitung 3.0 |
| `archive/playable-pre-graphic` | Spielbar, vor der Stadt-Grafik |
| `archive/v1-gacha` | Frühe Gacha-/Würfel-Lesart |
| `backup/main-pre-overhaul` | `main` vor dem großen Post-Playtest-Overhaul |
| `prototype` | Freeze NEXUS 2.1 — nicht löschen |

Feature-Branches unter `cursor/*` sind Arbeitsstände, keine Releases. Nach Merge gilt `main`.
