# NEXUS — Spielregeln (Post-Playtest)

Diese Datei beschreibt, was das Spiel **im Code tun soll** laut [`DESIGN.md`](DESIGN.md) und [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md). Bei Abweichung: DESIGN gewinnt, dann Code anpassen.

**Freeze:** Branch `prototype` = NEXUS 2.1 (fünf Ressourcen, alte Zonen).

## Setup

- 2 bis 6 Spieler, ein Gerät (Hot-Seat). Ab 4 Spielern Hex-Radius 4 statt 3; Homes auf den Ecken, nicht überlappend.
- Spiellänge: Kurz 15 / Standard 20 / Lang 25 Runden.
- Start: 3× Energie, Geld, Bandbreite; **Kontrollbüro** in einer Hex-Ecke; Startcoupon (erstes Feld kostenlos, muss im ersten Zug).
- Sechs Wahlversprechen werden gemischt; nacheinander geheim anschauen, dann Spieler 1.

## Ziel

Kein Spurensummen-Rennen. Jedes Versprechen hat Unterziele (u. a. auf Image, Komfort, Umwelt, Sicherheit und abgeleiteten Metriken). Fortschritt in **Prozent**. ≥ 100 % nach voller Runde = Sofortsieg. Sonst höchster Prozentwert nach letzter Runde.

## Ablauf eines Zugs

1. Zugübergabe (private Infos verdeckt)
2. Produktion automatisch zu Zugbeginn (eigene Fabriken + Home)
3. Risiko: vier abgeleitete Zahlen, dann offener d100. Ereignis erklärt Ursache und Gegenmaßnahme. Im letzten Kapitel kann ein Großereignis kommen.
4. Bauphase: Feldmenü (bauen, ausbauen, abreißen, Halt, Parkhaus, Busbahnhof, Linie, Cloud/lokal), drei offene Projektkarten, **Handelsangebot**, Standard, SAE, Zugende

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

**Ausbau:** jedes eigene Feld Stufe 0–2. Jede Stufe +1 auf den Primärertrag (Home auf alle drei). Kosten laut `ZONE_UPGRADE_*`. Sichtbar am 3D-Gebäude.

**Abriss:** Nicht-Home, Geld-Rückzahlung, nur wenn das restliche eigene Netz am Home hängt.

**Brett-Rand:** Gewerbe / Hügel / Berge, kein Wasser-Catan. Ein Großbauwerk pro Kachel, Autos auf dem **geteilten Kantennetz** (von Feld zu Feld, nicht im Kreis um eine Parzelle). Ampeln an Kreuzungen sind Präsentation.

## Geräte

Cloud vs. lokal (Kosten nur noch in den 3 Ressourcen). Lokal → Risiko runter / lokal-%. Upkeep in Bandbreite. **Sichtbarkeit:** jedes gebaute Gerät ist auf dem Brett und in der öffentlichen Spieleransicht sichtbar.

## Karten, Handel, Standards, SAE

Projektmarkt: drei offene Karten, Kauf wirkt sofort, keine Pflicht-Hand. Förderkarten bleiben im Posteingang. SAE 0–5 mit Technik-Toren (Sensor, Datenzentrum, V2X, lokal ab Stufe 5). Handel ist ein **Angebot** (Kurs + Menge), Annahme/Ablehnung im Partnerzug oder als Unterbrechung — kein Sofort-Tausch.

**Offen:** mit anderem Offen handelbar; Rabatt `OPEN_STANDARD_DISCOUNT` auf den Aufpreis nicht selbst produzierter Ware; Tausch füllt `standardsBonusVolume`.  
**Proprietär:** nur mit anderem Proprietär; kein Rabatt; gemischte Paare blockieren (Versuch gegen Proprietär → `blockedTradesCaused`).

## Wahlversprechen

IDs: climate, privacy, investor, visionary, networker, controller — Labels/Cast in `data/roles.js` und `docs/CAST_22_9.md`.

## Öffentlich vs. privat

Öffentlich: Name, Ausrichtung, Standard, SAE, Zonenzahl, **alle** gebauten Geräte, Feld-Ausbau.  
Privat: Ressourcen, Spuren, Hand, Versprechen-Details, Risiko. Nacht/Handoff leakt Rolle und Wallet nicht.

**Anleitung:** Overlay, keine eigene Zugphase. Copy in `data/tutorial.js`.

