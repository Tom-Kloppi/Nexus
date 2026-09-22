# NEXUS — Spielregeln (Post-Playtest)

Diese Datei beschreibt, was das Spiel **im Code tun soll** laut [`DESIGN.md`](DESIGN.md). Bei Abweichung: DESIGN gewinnt, dann Code anpassen.

**Freeze:** Branch `prototype` = NEXUS 2.1 (fünf Ressourcen, alte Zonen).

## Setup

- 2 oder 3 Spieler, ein Gerät (Hot-Seat).
- Spiellänge: Kurz 15 / Standard 20 / Lang 25 Runden.
- Start: 3× Energie, Geld, Bandbreite; **Kontrollbüro** in einer Hex-Ecke; Startcoupon (erstes Feld kostenlos, muss im ersten Zug).
- Sechs Wahlversprechen werden gemischt; nacheinander geheim anschauen, dann Spieler 1.

## Ziel

Kein Spurensummen-Rennen. Jedes Versprechen hat Unterziele (u. a. auf Image, Komfort, Umwelt, Sicherheit und abgeleiteten Metriken). Fortschritt in **Prozent**. ≥ 100 % nach voller Runde = Sofortsieg. Sonst höchster Prozentwert nach letzter Runde.

## Ablauf eines Zugs

1. Zugübergabe (private Infos verdeckt)
2. Produktion automatisch zu Zugbeginn (eigene Fabriken + Home)
3. Ereignis (gerade Runden)
4. Bauphase: Felder (bauen / ausbauen / abreißen), Geräte, Karten, **Handelsangebot**, Standard, SAE, Zugende

Cloud-Upkeep in Bandbreite. Ohne Zahlung: Cloud-Effekte in der Auswertung aus.

## Ressourcen

Energie, Geld, Bandbreite.

## Wertungsspuren

Image, Komfort, Umwelt, Sicherheit (`player.scores`). Öffentlich nur soweit die UI es zeigt; unter Hot-Seat-Schutz wie private Infos behandeln.

## Hex-Distrikt

Radius 3. Homes auf drei Ecken. Expand nur benachbart zum eigenen Netz.

| Feld | Variante | Ertrag / Regel |
| --- | --- | --- |
| Wohngebiet | — | Bandbreite; **0**, solange kein eigenes Datenzentrum |
| Energie | Solar | Energie mit Würfel-Mod |
| Energie | Transformator | stabile Energie, kostet Geld pro Einheit |
| Datenzentrum | Unsicher | günstig, erhöht Risiko |
| Datenzentrum | Sicher | teurer, stärkt Sicherheit |
| Verkehr | — | Stub, wenig Geld; +1 Komfort beim Bau. Grafik: Busbahnhof oder Parkplatz mit Ladestationen **auf** dem Feld. Straßen liegen auf den Kanten aller Felder, nicht als eigener Feldtyp. |
| Kontrollbüro | — | +1 aller drei Ressourcen, kein Würfel; +1 je Ausbaustufe |

Solar nutzt PRODUCTION_DICE (Ausfall…Boom). Boom → grüne Innovationskarte. Neu gebautes Feld produziert erst nächste Runde.

**Ausbau:** jedes eigene Feld Stufe 0–2. Jede Stufe +1 auf den Primärertrag (Home auf alle drei). Kosten laut `ZONE_UPGRADE_*`. Sichtbar am 3D-Gebäude.

**Abriss:** Nicht-Home, Geld-Rückzahlung, nur wenn das restliche eigene Netz am Home hängt.

**Brett-Rand:** Gewerbe / Hügel / Berge, kein Wasser-Catan. Ein Großbauwerk pro Kachel, Autos auf dem **geteilten Kantennetz** (von Feld zu Feld, nicht im Kreis um eine Parzelle). Ampeln an Kreuzungen sind Präsentation.

## Geräte

Cloud vs. lokal (Kosten nur noch in den 3 Ressourcen). Lokal → Datenschutz-Schild-Logik bleibt. Upkeep in Bandbreite.

## Karten, Handel, Standards, SAE

Handlimit und SAE 0–5 bleiben. Handel ist ein **Angebot** (Kurs + Menge), Annahme/Ablehnung im Partnerzug oder als Unterbrechung — kein Sofort-Tausch.

**Offen:** mit anderem Offen handelbar; Rabatt `OPEN_STANDARD_DISCOUNT` auf den Aufpreis nicht selbst produzierter Ware; Tausch füllt `standardsBonusVolume`.  
**Proprietär:** nur mit anderem Proprietär; kein Rabatt; gemischte Paare blockieren (Versuch gegen Proprietär → `blockedTradesCaused`).

## Wahlversprechen

IDs: climate, privacy, investor, visionary, networker, controller — Labels politisch/Versprechen. Unterziele in `data/roles.js`.

## Öffentlich vs. privat

Öffentlich: Name, Ausrichtung, Standard, SAE, Zonenzahl, Cloud-Geräte.  
Privat: Ressourcen, Spuren, Hand, Versprechen-Details, lokale Geräte, Risiko.
