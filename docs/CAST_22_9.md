# Cast 22.9 — Charakter-Stand

Quelle: Charakter-PDF *Überarbeiteter Entwurf Charaktere (22.9.26)*. **Vertrag bleibt [`DESIGN.md`](DESIGN.md).** IDs unverändert. Nicht die Unterziele hier und in DESIGN gleichzeitig pflegen.

## Mapping

| PDF | ID | Label | Ausrichtung | Punktart (10) |
| --- | --- | --- | --- | --- |
| Mira Blüte (ÖZP) | `climate` | Grüne Stadt | Umwelt | Ökopunkte |
| Isabella Roth (PPP) | `privacy` | Datenfestung | Sicherheit | Verlässlichkeit |
| Maria Hinterberger (Wnd) | `investor` | Dealmacherin | Wirtschaft | Finanzpunkte |
| Jürgen Weiß (PdZ) | `visionary` | Morgenstadt | Zukunft | Innovationspunkte |
| Thomas Smurf | `networker` | Querverkehr | Image | Imagepunkte |
| Heinz Kohle (AfAP) | `controller` | Komfortzone | Komfort | Komfortpunkte |

Partei-Kürzel liegen als `party` / `character` auf dem Rollenobjekt (nur Reveal, nicht Turn-Chip).

## Cuts (PDF oder alte Rolle → nicht gebaut)

- Start-Viertelfarben und Start-Ressource je Figur (Solar/Kohle/Wind/Kern/Wohnen/Wasser): Spiel startet weiter 3× Energie/Geld/Bandbreite; Energie-Felder bleiben Solar/Transformator.
- Fortbewegung als Regel (Fahrrad, Auto, Segeln, E-Auto, Bahn): Flavor, keine neuen Feldtypen.
- Reichensteuer abschaffen: kein Steuerscreen (DESIGN „fehlt“).
- `climate`: lokal-% gestrichen (PDF = Umweltpunkte, nicht Edge-Compute).
- `investor`: `moneyThroughput` + Zonenzahl gestrichen; PDF = Komfort & Sicherheit plus Abhängigkeit vom Handel.
- `visionary`: SAE-Leiter, lokale Geräte, Innovationskarten-Zählung gestrichen; PDF = alle Ziele gleichwertig.
- Overhaul 2 setzt jede Rolle auf 100 % und gibt ein Mobilitäts-Teilziel (erneuerbare Halte, abgeschirmte SAE, Wohnen an der Linie, SAE-Stufe, fremde Halte, Parkhaus/Bahnhof). Schwellen stehen in `nexus/js/data/roles.js`, nicht hier.
- `networker`: Open-Standard-Streak und Standards-Bonus-Volumen gestrichen; PDF = Image + Umwelt + Zusammenarbeit.
- `controller`: Proprietär-Streak, Ressourcen-Monopole, blockierte Handelsversuche gestrichen; PDF = Komfort/Auto-Infra, nicht Lock-in.
- Keine neuen Ressourcen, keine neuen Geräte-IDs.

## 2p / 6p Skalierung

Die Zahl auf der Karte gilt für 2 bis 6 Personen. Der stille Faktor auf Handels- und Zonenschwellen ist weg, weil er die angezeigte Rechnung verändert hätte.
