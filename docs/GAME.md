# NEXUS — Spielregeln (Post-Playtest)

Diese Datei beschreibt, was das Spiel **im Code tun soll** laut [`DESIGN.md`](DESIGN.md) und [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md). Bei Abweichung: DESIGN gewinnt, dann Code anpassen.

**Freeze:** Branch `prototype` = NEXUS 2.1 (fünf Ressourcen, alte Zonen).

## Setup

- 2 bis 3 Spieler, ein Gerät (Hot-Seat). Homes auf den Ecken, nicht überlappend. Hex-Radius 3.
- Probezeit: Kurz 10 / Standard 14 / Lang 18 **Tage** (Anzeige: verbleibende Tage).
- Start: 3× Energie, Geld, Bandbreite; **Kontrollbüro** in einer Hex-Ecke; Startcoupon (erstes Feld kostenlos, muss im ersten Zug).
- Sechs Charaktere im Pool; pro Partie werden so viele Rollen gezogen wie Spieler. Einmal offen gezeigt. Danach beginnt Spieler 1.

## Ziel

Kein Spurensummen-Rennen. Jede Rolle hat **eine Punktart** (Öko / Verlässlichkeit / Finanz / Innovation / Image / Komfort). Ziel 10 Punkte. Sofortsieg bei 10 nach voller Runde, sonst die meisten am Rundenlimit. Punkte aus Bau, Linie, Handel, Projekt, Ereignis — nicht aus Würfelglück.

## Ablauf eines Zugs

1. „Du bist dran.“ Rollen, Ziele und Kassen bleiben sichtbar.
2. Produktion automatisch zu Zugbeginn (eigene Fabriken + Home)
3. Risiko: eine Zahl, die größte Ursache, ein Satz. Dann der offene Wurf. Trifft er, ein Ereignis mit einer Lage, zwei Wahlen und einem Satz zum Zielkonflikt.
4. Bauphase: Kacheln am Feld (Typ, Preis, Ertrag, One-Liner), drei Projektkarten, Handel, Abriss wenn Netz verbunden, Zugende. Max. ein Rechenzentrum (offen/geschlossen). Kein Ausbau, keine Assistenz/SAE, kein Standard.

Cloud-Upkeep in Bandbreite. Ohne Zahlung: Cloud-Effekte in der Auswertung aus.

## Ressourcen

Energie, Geld, Bandbreite.

## Wertungsspuren

Image, Komfort, Umwelt, Sicherheit (`player.scores`). Öffentlich nur soweit die UI es zeigt; unter Hot-Seat-Schutz wie private Infos behandeln.

## Hex-Distrikt

Radius 3. Homes auf den Hex-Ecken (`homePositionsForCount`). Expand nur benachbart zum eigenen Netz.

| Feld | Variante | Ertrag / Regel |
| --- | --- | --- |
| Wohngebiet | — | Bandbreite; **0**, solange kein eigenes Datenzentrum |
| Energie | Solar | 2 Energie fest, Umwelt+ (Bau/Ernte) |
| Energie | Transformator | 3 Energie fest, −Geld je Einheit, Umwelt− nur beim Bau |
| Datenzentrum | offen / geschlossen | **max. 1**; offen = Risiko, geschlossen = sicherer; umschaltbar |
| Verkehr | Parkplatz / Parkhaus / Busbahnhof | Erstes Feld +1 Komfort. Halt, Linie (Diesel/Elektro/erneuerbar). |
| Kontrollbüro | — | +1 aller drei Ressourcen |

Neu gebautes Feld produziert erst nächste Runde.

**Nachbarschaftsdruck:** einmal pro Zug neben fremdem Feld → +1 Image, Nachbar +1 Risiko.

**Erste Tage (1–2):** Dock-Agenda Nachbarfeld → Datenzentrum → später Linie/Deal (kein neues Tutorial-System).

**Abriss** im Feldmenü, wenn das Netz zum Büro verbunden bleibt. **Ausbau** im Feldmenü.

**Brett-Rand:** Gewerbe / Hügel / Berge, kein Wasser-Catan. Ein Großbauwerk pro Kachel, Autos auf dem **geteilten Kantennetz** (von Feld zu Feld, nicht im Kreis um eine Parzelle). Ampeln an Kreuzungen sind Präsentation.

## Geräte

Cloud vs. lokal (Kosten nur noch in den 3 Ressourcen). Lokal → Risiko runter / lokal-%. Upkeep in Bandbreite. **Sichtbarkeit:** jedes gebaute Gerät ist auf dem Brett und in der öffentlichen Spieleransicht sichtbar.

## Karten, Handel, Linien

Projektmarkt: drei offene Karten. Kategorie gibt passende Rollenpunkte beim Kauf. Satz nur beim Halten.

Linien: Diesel +Komfort, Elektro +Image, erneuerbar +Umwelt; Streifen auf der Kante, Bus darauf. Assistenz/SAE entfernt.

Handel = **Angebot**. Beide Kassen vorher sichtbar. Kein Aufpreis, keine Standardsperre.

## Wahlversprechen

IDs: climate, privacy, investor, visionary, networker, controller — Labels/Cast in `data/roles.js` und `docs/CAST_22_9.md`.

## Öffentlich vs. privat

Am Tisch sichtbar: Name, Gesicht, Rolle, Zielstand, Kasse, Risiko, Hand der Person am Zug, alle gebauten Geräte. Nacht und Übergabe blenden das nicht aus.

**Anleitung:** Overlay, keine eigene Zugphase. Copy in `data/tutorial.js`.

