# Cast 22.9 — Charakter-Stand

Quelle: Charakter-PDF *Überarbeiteter Entwurf Charaktere (22.9.26)*. **Vertrag bleibt [`DESIGN.md`](DESIGN.md).** IDs unverändert. Nicht die Unterziele hier und in DESIGN gleichzeitig pflegen.

## Mapping

| PDF | ID | Label | Ausrichtung | Rechnung (10 Punkte) |
| --- | --- | --- | --- | --- |
| Frau Prof. Dr. Mira Blüte (ÖZP, Solar/grün) | `climate` | Grüne Stadt | Umwelt | Umwelt 6×1, Öko-Halte 2×2 |
| Dr. Isabella Roth (PPP, Kernenergie, Cyber) | `privacy` | Datenfestung | Sicherheit | lokale Geräte 3×2, sichere Rechenzentren 2×2 |
| Maria Hinterberger (Wnd, Immobilien, Handel) | `investor` | Dealmacherin | Wirtschaft | Handel 8×1, Komfort 2×1 |
| Jürgen Weiß (PdZ, Wind, Zukunft) | `visionary` | Morgenstadt | Zukunft | Assistenz 3×2, Komfort 4×1 |
| Dr. Thomas Smurf (Bahn, Augenhöhe) | `networker` | Querverkehr | Image | Image 5×1, Handel 5×1 |
| Heinz Kohle (AfAP, Auto-Komfort) | `controller` | Komfortzone | Komfort | Komfort 6×1, Parkhaus/Bahnhof 2×2 |

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
