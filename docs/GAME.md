# NEXUS — Spielregeln (Post-Playtest)

Diese Datei beschreibt, was das Spiel **im Code tun soll** laut [`DESIGN.md`](DESIGN.md) und [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md). Bei Abweichung: DESIGN gewinnt, dann Code anpassen.

**Freeze:** Branch `prototype` = NEXUS 2.1 (fünf Ressourcen, alte Zonen).

## Setup

- 2 bis 6 Spieler, ein Gerät (Hot-Seat). Ab 4 Spielern Hex-Radius 4 statt 3; Homes auf den Ecken, nicht überlappend.
- Spiellänge: Kurz 15 / Standard 20 / Lang 25 Runden.
- Start: 3× Energie, Geld, Bandbreite; **Kontrollbüro** in einer Hex-Ecke; Startcoupon (erstes Feld kostenlos, muss im ersten Zug).
- Sechs Rollen werden gemischt und einmal offen gezeigt. Danach beginnt Spieler 1.

## Ziel

Kein Spurensummen-Rennen. Jede Rolle hat zwei Rechnungen, zusammen 10 Punkte. Die Leiste zeigt `haben/brauchen` und `Punkte/10`. 10 Punkte nach einer vollen Runde = Sofortsieg. Sonst die meisten Punkte nach der letzten Runde.

## Ablauf eines Zugs

1. „Du bist dran.“ Rollen, Ziele und Kassen bleiben sichtbar.
2. Produktion automatisch zu Zugbeginn (eigene Fabriken + Home)
3. Risiko: eine Zahl, die größte Ursache, ein Satz. Dann der offene Wurf. Trifft er, ein Ereignis mit einer Lage, zwei Wahlen und einem Satz zum Zielkonflikt.
4. Bauphase: Kacheln am Feld (Typ, Preis, Ertrag), drei offene Projektkarten, **Handelsangebot** mit beiden Kassen, Assistenz am Leitstand, Zugende. Kein Ausbau, kein Abriss, kein Standard.

Cloud-Upkeep in Bandbreite. Ohne Zahlung: Cloud-Effekte in der Auswertung aus.

## Ressourcen

Energie, Geld, Bandbreite.

## Wertungsspuren

Image, Komfort, Umwelt, Sicherheit (`player.scores`). Öffentlich nur soweit die UI es zeigt; unter Hot-Seat-Schutz wie private Infos behandeln.

## Hex-Distrikt

Radius 3 (2–3 Spieler) bzw. 4 (4–6 Spieler). Homes auf den Hex-Ecken (`homePositionsForCount`). Expand nur benachbart zum eigenen Netz.

| Feld | Variante | Ertrag / Regel |
| --- | --- | --- |
| Wohngebiet | — | Bandbreite; **0**, solange kein eigenes Datenzentrum |
| Energie | Solar | Energie mit Würfel-Mod |
| Energie | Transformator | stabile Energie, kostet Geld pro Einheit |
| Datenzentrum | Unsicher | günstig, erhöht Risiko |
| Datenzentrum | Sicher | teurer, stärkt Sicherheit |
| Verkehr | Parkplatz / Parkhaus / Busbahnhof | Erstes Feld +1 Komfort. Haltestelle, Linie (Diesel, Elektro, erneuerbar), SAE mit Technik-Toren. Straßen auf den Kanten plus Randring. |
| Kontrollbüro | — | +1 aller drei Ressourcen, kein Würfel; +1 je Ausbaustufe |

Solar nutzt PRODUCTION_DICE (Ausfall…Boom). Boom → grüne Innovationskarte. Neu gebautes Feld produziert erst nächste Runde.

**Ausbau und Abriss** sind nicht im Zug.

**Brett-Rand:** Gewerbe / Hügel / Berge, kein Wasser-Catan. Ein Großbauwerk pro Kachel, Autos auf dem **geteilten Kantennetz** (von Feld zu Feld, nicht im Kreis um eine Parzelle). Ampeln an Kreuzungen sind Präsentation.

## Geräte

Cloud vs. lokal (Kosten nur noch in den 3 Ressourcen). Lokal → Risiko runter / lokal-%. Upkeep in Bandbreite. **Sichtbarkeit:** jedes gebaute Gerät ist auf dem Brett und in der öffentlichen Spieleransicht sichtbar.

## Karten, Handel, Standards, SAE

Projektmarkt: drei offene Karten. Kategorie ist die Farbe, Wirkung ist Icon plus Vorzeichen plus Menge, der Satz nur beim Halten. Kauf wirkt sofort. Förderkarten bleiben im Posteingang und spielen sich genauso.

Assistenz 0–5 mit denselben Toren wie bisher (Sensor, Datenzentrum, V2X, lokal ab Stufe 5). Die Stufe steht an der eigenen Linie. Diesel gibt beim Bau +1 Komfort, Elektro +1 Image, erneuerbar +1 Umwelt. Die Linie liegt als Streifen auf den Kanten zwischen ihren Feldern, der Bus fährt darauf.

Handel ist ein **Angebot** mit Gegenstand und Menge. Beide Kassen sind vorher sichtbar. Kein Aufpreis, kein Rabatt, keine Standardsperre. Annahme oder Ablehnung, kein Sofort-Tausch.

## Wahlversprechen

IDs: climate, privacy, investor, visionary, networker, controller — Labels/Cast in `data/roles.js` und `docs/CAST_22_9.md`.

## Öffentlich vs. privat

Am Tisch sichtbar: Name, Gesicht, Rolle, Zielstand, Kasse, Risiko, Hand der Person am Zug, alle gebauten Geräte. Nacht und Übergabe blenden das nicht aus.

**Anleitung:** Overlay, keine eigene Zugphase. Copy in `data/tutorial.js`.

