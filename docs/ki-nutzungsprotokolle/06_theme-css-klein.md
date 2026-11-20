# Protokollbogen – Nutzung von KI-Hilfsmitteln

| Feld | Eintrag |
| --- | --- |
| **Nutzungsanlass** | Kleiner Fix: Theme-Tokens Tag/Nacht in CSS angleichen |
| **KI-Tool (ggf. Version)** | Cursor (Composer / Agent) |
| **Datum / Uhrzeit** | 18.11.2026, ca. 23:10 |

## Beschreibung der Nutzung

- Problem: Overhaul-UI und Board wirkten bei Theme-Wechsel uneinheitlich (teilweise alte Farbwerte).
- Ziel: CSS-Variablen / Tokens so vorschlagen und anpassen, dass Light/Dark konsistent wirken.
- Geplante Verwendung: direkte Bearbeitung von `overhaul.css` / Style-Tokens; anschließend Sichtprüfung im Browser.

## Begründung für die Wahl des KI-Tools

- KI im Editor kennt Dateikontext und findet verstreute Farbstellen schneller.
- Kleiner, klar begrenzter Auftrag — geeignet für Agent-Hilfe.

## Prompting- / Ergebnisprotokoll

**Prompt (sinngemäß):**  
„Tag/Nacht-Theme: gleiche fehlende Tokens in overhaul.css an style.css / data-theme an. Keine neuen Libraries. Nach JS/CSS ?v= erhöhen. Nur Theme, keine Regeln.“

**Ergebnis (kurz):**  
Token-Nachzüge und angepasste Stellen; Cache-Bust `?v=` in index.html. Manuell im Browser Tag/Nacht geprüft.

## Reflexion der Nutzung und des Ergebnisses

- Qualität: technisch brauchbar; Feinschliff (Kontrast einzelner Buttons) noch von Hand.
- Eignung: sinnvoll für begrenzten CSS-Abgleich.
- Prompting: Ownership-Grenzen („keine Regeln“, „kein npm“) verhindert Scope-Creep.
- Ohne KI: Suchen/Ersetzen möglich, aber langsamer. Verständnis und Abnahme der Farben = Eigenleistung; KI-Output nicht ungeprüft übernommen.
