# Agent-Workflow — NEXUS Repo

Kurzleitfaden für Menschen (Tom) und Coding-Agents: Token sparen, richtige Docs zuerst, keine Tool-Fiktion.

## Was Tom installieren muss

**Pflicht: nichts.** NEXUS ist statisches HTML/CSS/JS — Spielen = `nexus/index.html` im Browser; Agent-Arbeit = Git + Editor (Cursor).

**Optional (Cursor):**

| Einstellung | Zweck |
| --- | --- |
| Projekt in Cursor öffnen | `AGENTS.md` + `.cursor/rules/nexus.mdc` werden automatisch geladen |
| [Rules](https://cursor.com/docs/rules) im Repo versionieren | Team-weite Hard Constraints (bereits unter `.cursor/rules/`) |
| `.cursorignore` / `.cursorindexingignore` | Große Binaries und Neben-Bibliotheken aus Standard-Kontext halten ([Ignore reference](https://cursor.com/docs/reference/ignore-file)) |
| Indexing → *Hierarchical Cursor Ignore* (falls angeboten) | Parent-`.cursorignore` in Monorepos — hier irrelevant |

Kein npm, kein Node, kein Test-Runner, kein MCP-Pflicht-Stack für dieses Repo.

## Best Practices (kurz, mit Quellen)

1. **AGENTS.md + schlanke Rules** — Repo-weite Anweisungen in `AGENTS.md`; Cursor-spezifische Hard Constraints in `.cursor/rules/*.mdc` (`alwaysApply: true` nur für das Nötigste). Regeln: kurz, verweisen auf Dateien statt Inhalte zu duplizieren ([Cursor Rules](https://cursor.com/docs/rules), [Agent best practices](https://cursor.com/blog/agent-best-practices)).
2. **Ignore-Dateien** — `.cursorignore`: Agent/Tab/@ blockiert (PDFs, Skill-Bulk). `.cursorindexingignore`: nur Index, Datei bleibt per `@` lesbar ([Ignore files help](https://cursor.com/help/customization/ignore-files.md)). **`AGENTS.md` und `docs/DESIGN.md` bewusst nicht ignoriert.**
3. **Lesepfad statt Dump** — Design-Vertrag → `docs/DESIGN.md`; Verhalten im Code unklar → `docs/GAME.md`; Parallel-Ownership → `docs/AGENT_PLAN.md`. Playtest-Briefing (Interview + Konzeptausbau, Teaser/Todo) → `docs/PLAYTEST_AENDERUNGSLISTE.md` — **nicht** über DESIGN stellen. `docs/UPDATE_CONCEPT.md` ist akzeptierte Review-Begründung (kein zweiter Vertrag); nur bei Concept-Fragen @-mention.
4. **Skills** — Motion unter `.agents/skills/` nur bei Animations-Tasks (siehe `AGENTS.md`); nicht in jeden Chat laden.
5. **Kein Ponytail-Skill** — Im Repo keine `/ponytail`-Skill-Datei; nichts zu installieren.

## Code-Einstieg (Pointers, nicht vollständige Dateien)

| Aufgabe | Zuerst lesen |
| --- | --- |
| Regel / Zug / Bau / Karten | `nexus/js/state.js` (exportiert `Nexus.*` am Dateiende) |
| DOM / HUD | `nexus/js/render.js` → `Nexus.render` |
| Distrikt-WebGL | `nexus/js/board3d.js` → `Nexus.Board3D` |
| Klicks / `commit()` | `nexus/js/main.js` |
| Wahlversprechen / Fortschritt | `nexus/js/roles.js` → `computeRoleProgress` |
| Konstanten / Geräte / Karten | `nexus/js/data/*.js` |
| Smoke nach Logik-Änderungen | Browser-Konsole: `Nexus.runSmokeCheck()` (`state.js`) |
| Cache-Bust nach JS/CSS | `?v=` in `nexus/index.html` erhöhen |

Architektur: `main.js` → `state.js` → `render.js` (siehe `AGENTS.md`).

## Parallel-Branches & Konfliktrisiken

| Bereich | Typische Branch | Konflikt mit Agent-Doku-PR |
| --- | --- | --- |
| Spielcode `nexus/**` | Feature / Overhaul | **Keiner** — diese PR touchiert kein `nexus/` |
| `docs/DESIGN.md`, `docs/GAME.md` | Design-Integrator | **Keiner** — out of scope |
| `docs/PLAYTEST_AENDERUNGSLISTE.md` | Playtest-Briefing | **Keiner** — nur Doku, kein `nexus/` |
| `docs/UPDATE_CONCEPT.md` | Concept-Proposal | **Keiner** — nur index-ignore, keine Inhaltsänderung |
| `AGENTS.md`, `.cursor/*`, `docs/AGENT_PLAN.md`, `docs/AGENT_WORKFLOW.md` | Agent-Optimize | **Gering** — merge-freundliche Zeilen; bei Konflikt: Hard Constraints aus beiden Seiten zusammenführen |
| `README.md` | Diverse | **Gering** — nur wenn gleichzeitig Repo-Karte geändert wird |

**Regel:** Agent, der am Spiel arbeitet, ändert nicht `AGENTS.md`/Rules ohne Absprache; Agent, der Doku optimiert, ändert nicht `nexus/**` (siehe `docs/AGENT_PLAN.md`).

## Checkliste vor Commit (Agents)

- [ ] Hard Constraints in `nexus.mdc` verletzt? (state/render-Trennung, Board-3D nur vendored, `?v=`)
- [ ] Nur erlaubte Dateien laut Auftrag / Ownership?
- [ ] Bei JS/CSS: `?v=` in `index.html` (Spiel-Agent); bei reiner Doku: entfällt
