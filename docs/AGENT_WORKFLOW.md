# Agent-Workflow — NEXUS Repo

Token sparen, richtige Datei zuerst, keine Tool-Fiktion.

## Install

**Pflicht: nichts.** Spiel = `nexus/index.html`. Agent = Git + Editor.

Optional: Cursor lädt `AGENTS.md` und `.cursor/rules/nexus.mdc`. Ignore: PDFs/Skills aus dem Standardkontext; **`AGENTS.md`, `docs/DESIGN.md`, `docs/CHANGELOG.md` nicht ignorieren.**

Kein npm/Node/Test-Runner nötig.

## Lesepfad

| Frage | Datei |
| --- | --- |
| Was darf der Agent? | `AGENTS.md`, `.cursor/rules/nexus.mdc` |
| Was gilt jetzt (Vertrag)? | `docs/DESIGN.md` |
| Was tut der Code? | `docs/GAME.md` |
| Was hat sich wann geändert? | `docs/CHANGELOG.md` |
| Wer ist welche Figur? | `docs/CAST_22_9.md` |
| Welche Grafik bewusst fehlt? | `docs/CITY_3D_CUTS.md` |
| Playtest-Todo/Teaser | `docs/PLAYTEST_AENDERUNGSLISTE.md` — nicht über DESIGN |
| Warum die Defaults? | `docs/UPDATE_CONCEPT.md` — kein Vertrag |

Skills unter `.agents/skills/` nur bei Motion-Tasks.

## Code-Einstieg

| Aufgabe | Zuerst |
| --- | --- |
| Regel / Zug / Bau / Karten | `nexus/js/state.js` |
| DOM / HUD / Toasts | `nexus/js/render.js` |
| Distrikt-WebGL | `nexus/js/board3d.js` → `Nexus.Board3D` |
| Klicks / `commit()` | `nexus/js/main.js` |
| Versprechen | `nexus/js/roles.js` |
| Konstanten / Geräte / Karten / Anleitungstexte | `nexus/js/data/*.js` |
| Smoke | Konsole: `Nexus.runSmokeCheck()` |
| Cache | `?v=` in `nexus/index.html` |

`main.js` → `state.js` → `render.js` + `Board3D.sync`.

## Checkliste vor Commit

- [ ] `nexus.mdc`: state/render/board3d-Trennung, `?v=` bei JS/CSS
- [ ] Nur Dateien laut Auftrag
- [ ] Vertragsänderung? DESIGN + kurzer CHANGELOG-Block
- [ ] Reine Doku: kein `?v=`
