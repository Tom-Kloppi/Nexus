# Protokollbogen – Nutzung von KI-Hilfsmitteln

| Feld | Eintrag |
| --- | --- |
| **Nutzungsanlass** | Idee: Risiko am Tisch lesbar machen (weniger Spuren) |
| **KI-Tool (ggf. Version)** | Cursor (Composer) |
| **Datum / Uhrzeit** | 02.11.2026, ca. 14:05 |

## Beschreibung der Nutzung

- Problem: Intern viele Risikofaktoren; am Tisch wirkt eine Vier-Spuren-Leiste überladen.
- Ziel: Vorschlag, wie man „Stadtdruck“ mit einer Zahl + einer Ursache (z. B. Cyber/Netz) erklärt, Schwelle 8.
- Geplante Verwendung: Designentscheidung + spätere HUD-Copy; Logik bleibt in risk.js, UI vereinfachen.

## Begründung für die Wahl des KI-Tools

- Schnelles Abwägen „was sieht der Spieler“ vs. „was rechnet die Engine“.
- Gut für kurze Pro/Contra-Listen ohne neuen Mechanik-Screen.

## Prompting- / Ergebnisprotokoll

**Prompt (sinngemäß):**  
„Risiko soll Event ab 8 auslösen. Intern mehrere Faktoren. Am Tisch keine vier Leisten. Schlage 2–3 UI-Modelle vor (eine Zahl + Ursache). Keine neuen Regeln erfinden.“

**Ergebnis (kurz):**  
Varianten: (A) eine Zahl + Top-Ursache Cyber|Netz; (B) Ampel + Kurztext; (C) nur Toast bei ≥8. Empfehlung A mit Ursache auf der Eventkarte wiederholen.

## Reflexion der Nutzung und des Ergebnisses

- Qualität: brauchbar; Gruppe/DESIGN nahm Variante A.
- Eignung: Klärung der Darstellung, nicht der Formel.
- Prompting: „keine neuen Regeln“ war wichtig — sonst schlägt KI oft Extra-Systeme vor.
- Ohne KI: Skizze auf Papier reicht; KI lieferte Benennungen (Cyber/Netz) zum Abstimmen.
