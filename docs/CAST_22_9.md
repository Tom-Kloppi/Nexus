# Cast 22.9 — Charakter-Stand

Quelle: Charakter-PDF *Überarbeiteter Entwurf Charaktere (22.9.26)*. Vertrag bleibt `docs/DESIGN.md`. IDs unverändert.

## Mapping

| PDF | ID | Label | Ausrichtung | Unterziele im Code |
| --- | --- | --- | --- | --- |
| Frau Prof. Dr. Mira Blüte (ÖZP, Solar/grün) | `climate` | Radikale Ökologie | Umwelt | Umwelt-Spur, grüne Karten, Image |
| Dr. Isabella Roth (PPP, Kernenergie, Cyber) | `privacy` | Datensicherheit | Sicherheit | Sicherheits-Spur, niedriges Risiko, Lokal-% |
| Maria Hinterberger (Wnd, Immobilien, abhängig von Handel) | `investor` | Wirtschaftswunder | Wirtschaft | Komfort, Sicherheit, Handelsvolumen |
| Jürgen Weiß (PdZ, Wind, Eudämonismus) | `visionary` | Eudämonische Stadt | Zukunft | Image, Komfort, Umwelt, Sicherheit gleich |
| Dr. Thomas Smurf (Wasserkraft, Bahn, Augenhöhe) | `networker` | Gemeinwohl auf Augenhöhe | Image | Image, Umwelt, Handelspartner-Anteil |
| Heinz Kohle (AfAP, Kohle, Auto-Komfort) | `controller` | Autostadt und Komfort | Komfort | Komfort, Zonenausbau, Geld-Throughput |

Partei-Kürzel liegen als `party` / `character` auf dem Rollenobjekt (nur Reveal, nicht Turn-Chip).

## Cuts (PDF oder alte Rolle → nicht gebaut)

- Start-Viertelfarben und Start-Ressource je Figur (Solar/Kohle/Wind/Kern/Wohnen/Wasser): Spiel startet weiter 3× Energie/Geld/Bandbreite; Energie-Felder bleiben Solar/Transformator.
- Fortbewegung als Regel (Fahrrad, Auto, Segeln, E-Auto, Bahn): Flavor, keine neuen Feldtypen.
- Reichensteuer abschaffen: kein Steuerscreen (DESIGN „fehlt“).
- `climate`: lokal-% gestrichen (PDF = Umweltpunkte, nicht Edge-Compute).
- `investor`: `moneyThroughput` + Zonenzahl gestrichen; PDF = Komfort & Sicherheit plus Abhängigkeit vom Handel.
- `visionary`: SAE-Leiter, lokale Geräte, Innovationskarten-Zählung gestrichen; PDF = alle Ziele gleichwertig.
- `networker`: Open-Standard-Streak und Standards-Bonus-Volumen gestrichen; PDF = Image + Umwelt + Zusammenarbeit.
- `controller`: Proprietär-Streak, Ressourcen-Monopole, blockierte Handelsversuche gestrichen; PDF = Komfort/Auto-Infra, nicht Lock-in.
- Keine neuen Ressourcen, keine neuen Geräte-IDs.

## 2p / 6p Skalierung

- 2p: `tradeVolume` ×0,55, `zoneControlCount` ×0,75; `tradePartnerRatio` bleibt in `roles.js` für 1 Gegner gedämpft.
- 5–6p: `tradeVolume` ×1,25, `zoneControlCount` ×1,15 (größerer Handel, etwas mehr Zonenbedarf).
