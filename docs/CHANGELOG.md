# Changelog

Neueste Welle zuerst. Das ist die **Geschichte** des spielbaren Stands — nicht der Vertrag. Aktuelle Regeln: [`DESIGN.md`](DESIGN.md). Labels der Figuren: [`CAST_22_9.md`](CAST_22_9.md). Grafik-Schnitte: [`CITY_3D_CUTS.md`](CITY_3D_CUTS.md).

Neue spielbare Welle: hier einen Block anlegen (Datum, Branch, Warum, Regeln, Grafik). DESIGN nur ändern, wenn sich der Vertrag ändert.

## 3.0 — WebGL-Stadt, 6 Spieler, Anleitung (2026-09)

**Branch / Stand:** `main` (`1427ea0`). Zusammengeführt aus `cursor/city-3d-board-5bc5`, `cursor/six-player-cast-5bc5`, `cursor/tutorial-mode-c265`. Vorheriger `main`: `archive/main-pre-webgl-cast-5bc5`.

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
| `archive/playable-pre-graphic` | Spielbar, vor der Stadt-Grafik |
| `archive/v1-gacha` | Frühe Gacha-/Würfel-Lesart |
| `backup/main-pre-overhaul` | `main` vor dem großen Post-Playtest-Overhaul |

Feature-Branches unter `cursor/*` sind Arbeitsstände, keine Releases. Nach Merge gilt `main`.
