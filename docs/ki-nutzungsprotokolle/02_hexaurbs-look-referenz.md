# Protokollbogen – Nutzung von KI-Hilfsmitteln

| Feld | Eintrag |
| --- | --- |
| **Nutzungsanlass** | Look-Referenz HexaUrbs: was übernehmen wir fürs Board? |
| **KI-Tool (ggf. Version)** | Cursor (Composer) + Steam-Store-Recherche |
| **Datum / Uhrzeit** | 10.10.2026, ca. 19:15 |

## Beschreibung der Nutzung

- Problem: Board soll „Stadt“ lesen, nicht Spreadsheet — Look-Nordstern HexaUrbs, ohne das Genre zu kopieren.
- Ziel: Stichpunkte aus Screenshots/Beschreibung: Tile-Rand, Straße, Silhouette, Farbe sparsam.
- Geplante Verwendung: Checkliste für Grafik-Wellen; Abgrenzung „Look ja / Gameplay nein“ in DESIGN.

## Begründung für die Wahl des KI-Tools

- KI kann Store-Texte und sichtbare Muster strukturieren und gegen unser Hex-Kanten-Straßen-Modell spiegeln.
- Schneller als nur mündlich „sieht irgendwie cool aus“.

## Prompting- / Ergebnisprotokoll

**Prompt (sinngemäß):**  
„Schau HexaUrbs auf Steam an. Was lernen wir für unser Hex-Board (Kantenstraßen, Besitzfarben, Hot-Seat)? Liste Learnings und was wir bewusst nicht kopieren.“

**Ergebnis (kurz):**  
Learnings u. a.: dunkler Hex-Rand, gelbe Straßenlinie, Silhouette = Dichte/Ausbau, Farbe sparsam, Landmark pro Spezialfeld. Nicht kopieren: Per-Tile-Straßenring als Regel, Sandbox-Builder, fehlende Ownership-Farben.

## Reflexion der Nutzung und des Ergebnisses

- Qualität: hilfreich als strukturierte Beobachtung; Screenshots selbst angeschaut, nicht blind übernommen.
- Eignung: gut für Prioritätenliste vor dem Umbau von Parkplatz/Bahnhof/Rändern.
- Prompting: Fokus auf „lernen vs. nicht kopieren“ verhindert Feature-Creep.
- Ohne KI: manuelles Moodboard möglich; KI half beim Abgleich mit unseren Hard Constraints (keine GLTF-Bibliothek, Regeln nur in state.js).
