# NEXUS 2.1 — Spielregeln (Stand im Code)

Diese Datei beschreibt, was das Spiel **wirklich tut**. Quelle: `nexus/js/`.

## Setup

- 2 oder 3 Spieler, ein Gerät (Hot-Seat).
- Spiellänge: Kurz 15 / Standard 20 / Lang 25 Runden.
- Jeder startet mit 3 von jeder Ressource, einem Smart Home in einer Hex-Ecke und einem **Startcoupon** (erstes Feld kostenlos, muss im ersten Zug gesetzt werden).
- Sechs Rollen werden gemischt; jeder bekommt eine geheime. Nacheinander im Modal anschauen, dann beginnt Spieler 1.

## Ziel

Kein Siegpunkt-Rennen. Jede Rolle hat drei Unterziele. Der Fortschritt wird in **Prozent** angezeigt. Wer nach einer vollen Runde **≥ 100 %** hat, gewinnt sofort (bei mehreren der mit dem höheren Wert, sonst wer in der Reihenfolge weiter vorn steht). Sonst gewinnt nach der letzten Runde, wer den höchsten Prozentwert hat.

## Ablauf eines Zugs

1. **Zugübergabe** — Gerät weitergeben, private Infos sind verdeckt.
2. **Produktion** — alle eigenen ungenutzten Fabriken + Home gleichzeitig.
3. **Ereignis** — in jeder geraden Runde für den aktiven Spieler.
4. **Bauphase** — Felder, Geräte, Karten, Handel, Standard, SAE, Zugende.

Am Zugende laufen Geräteeffekte (Energie sparen, Daten, Cloud-Risiko, Peak-Load-Effizienz). Cloud-Upkeep in Konnektivität: ohne Bezahlung sind Cloud-Effekte in dieser Auswertung aus.

## Ressourcen

Energie, Daten, Rechenleistung, Bauteile, Konnektivität.

## Hex-Distrikt

Axiales Hex mit Radius 3 (37 Felder). Homes auf drei Ecken. Neue Felder nur **benachbart** zum eigenen Netz, nicht auf Home-Slots.

| Feld | Primär | Sekundär |
| --- | --- | --- |
| Wohngebiet | Daten 2 | — |
| Gewerbe | Bauteile 2 | Rechenleistung 1 |
| Infrastruktur | Konnektivität 2 | — |
| Energieversorgung | Energie 3 | — |
| Smart Home | +1 aller fünf, kein Würfel | — |

Fabrik-Ertrag = `max(1, Basis + W6-Modifikator)`:

| Ergebnis | Mod | Gewicht |
| --- | --- | --- |
| Wartung/Ausfall | −1 | 1 |
| Normalbetrieb | 0 | 2 |
| Guter Lauf | +1 | 2 |
| Boom | +2 | 1 |

Boom zieht eine **grüne** Innovationskarte. Speicherbatterie setzt einen negativen Modifikator auf 0. Ein neu gekauftes Feld produziert erst nächste Runde.

## Geräte — Cloud vs. lokal

Cloud: günstiger, **Risiko/Zug**, **Konnekt.-Upkeep**. Lokal: voller Effekt, kein Upkeep. Upgrade Cloud → lokal gegen Kostendifferenz.

| Gerät | Effekt |
| --- | --- |
| Smart-Thermostat / Shading | −1 Energie/Runde |
| Kamera-Netzwerk | +1 Daten/Runde; lokal zählt zum Datenschutz-Schild |
| Ladesäule | einmalig 1 Innovationskarte |
| Home Hub | nur lokal; nächster Bau −1 der teuersten Ressource; lokal = Schild |
| Smart Lock | einmalig −1 Risiko |
| HEMS | braucht Gewerbe; verdoppelt Energie-Sparen der anderen Geräte |
| Speicherbatterie | nur lokal, braucht Energiezone; fängt −1 Fabrik-Mod |
| V2X / Ladesäulen-Netz | braucht Infra; schaltet SAE frei. Netz: SAE kostet 1 Konnekt. weniger |
| Peak-Load-Control | braucht Gewerbe zum Bau; +1 Effizienzpunkt/Runde |

**Datenschutz-Schild** (blockt das Datenleck-Ereignis): lokale Kamera **oder** lokaler Hub **oder** ≥ 75 % der gebauten Geräte lokal.

## Karten

Einmal pro Zug automatisch eine Innovationskarte (Handlimit 4), zusätzlich frei nachziehbar. Kategorien: Grün, Datenschutz, Mobilität, Allgemein.

- Ressourcen-Effekte gehen ins Wallet.
- `efficiency` → Effizienzpunkte (Klimaingenieur).
- `privacy` → senkt Risiko (Datenschützerin).

## Handel und Standards

Standard ist öffentlich: **Offen** oder **Proprietär** (Start: offen). Handel nur bei gleichem Standard. 1:1 in der UI. Wer eine Ressource in den letzten 2 Runden nicht selbst produziert hat, zahlt Premium (2). Zwei offene Spieler können den Premium mildern.

Proprietärer Partner, den man nicht bedienen kann, kann der Kontrolleurin **blockierte Handelsversuche** einbringen.

## SAE

Level 0–5. Braucht V2X oder Ladesäulen-Netz. Kosten steigen mit dem Level; Ladenetz −1 Konnektivität.

## Rollen

| Rolle | Unterziele |
| --- | --- |
| Klimaingenieur | Effizienzpunkte, lokaler Geräteanteil, grüne Karten |
| Datenschützerin | niedriges Risiko, lokaler Anteil, abgewehrte Datenlecks |
| Investorin | kumulierte Produktion, Handelsvolumen, Fabrikzahl |
| Visionär | SAE-Level, lokale Geräte, Innovationskarten gesamt |
| Netzwerker | Runden im offenen Standard, Handelspartner-Anteil, Standards-Bonus |
| Kontrolleurin | Runden proprietär, Ressourcen-Monopole, blockierte Handel |

Bei 2 Spielern werden Handels-/Blockade-Ziele etwas herunterskaliert.

## Öffentliche vs. private Info

Sichtbar für andere: Name, Ausrichtung, Standard, SAE, Zonenzahl, **Cloud-Geräte**. Privat: Ressourcen, Hand, geheimes Ziel, lokale Geräte, Effizienzpunkte, Risiko.
