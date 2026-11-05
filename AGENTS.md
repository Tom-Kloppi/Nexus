# AGENTS.md — NEXUS

Anleitung für Coding-Agents. Workflow: [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md). Geschichte: [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Zuerst lesen

1. **Hard constraints:** `.cursor/rules/nexus.mdc` (immer geladen).
2. **Vertrag:** [`docs/DESIGN.md`](docs/DESIGN.md) — bei Konflikt gewinnt DESIGN.
3. **Ist-Regeln:** [`docs/GAME.md`](docs/GAME.md) — nur wenn Verhalten unklar.
4. **Geschichte / Wellen:** [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
5. **Ownership-Phasen:** [`docs/AGENT_PLAN.md`](docs/AGENT_PLAN.md).
6. **Figuren-Labels:** [`docs/CAST_22_9.md`](docs/CAST_22_9.md) — kein zweiter Vertrag.
7. **Playtest-Briefing:** [`docs/PLAYTEST_AENDERUNGSLISTE.md`](docs/PLAYTEST_AENDERUNGSLISTE.md) — Teaser/Todo, nicht über DESIGN.
8. **Concept-Review:** [`docs/UPDATE_CONCEPT.md`](docs/UPDATE_CONCEPT.md) — Begründung; Grafik-Nachzüge (Kanten-Straßen, Verkehr = Gebäude, später WebGL) nicht ausspielen.
9. Motion-Skills (`.agents/skills/`) nur bei Animations-Aufgaben.

Nicht laden: PDFs unter `docs/concepts/` außer der Auftrag es verlangt.

## Was das ist

Hot-Seat Smart-City (2–6 Spieler, ein Gerät). Einstieg `nexus/index.html`. **`prototype`** = Freeze 2.1. **`main`** = Redesign ab 3.0, Visuals/UI ab 3.1 (CHANGELOG). Vor-3.1: `archive/main-pre-visuals-ui-d004`.

## Ownership

| Datei | Darf | Darf nicht |
| --- | --- | --- |
| `nexus/js/state.js` | Spiellogik | DOM, Three |
| `nexus/js/render.js` | DOM/HUD, Anleitung-Chrome | Regeln |
| `nexus/js/board3d.js` | Distrikt-WebGL | Regeln, App-Shell-Layout |
| `nexus/js/main.js` | Events, `commit()` | Lange Regelblöcke |
| `nexus/js/roles.js` | Versprechen, `computeRoleProgress` | Geräte bauen |
| `nexus/js/data/*.js` | Konstanten, Daten, Tutorial-Copy | Ablauf steuern |
| `docs/DESIGN.md` | Nur explizite Design-Änderung | Nebenbei umschreiben |
| `docs/CHANGELOG.md` | Neue spielbare Welle dokumentieren | Regeln erfinden |
| `AGENTS.md`, `.cursor/rules/**` | Agent-Doku / Constraints | Spielregeln erfinden |

`window.Nexus`. Script-Reihenfolge in `nexus/index.html` nicht brechen (`vendor/three.min.js` vor `board3d.js`).

## Architektur

`main.js` → Regel in `state.js` → `Nexus.render` in `render.js` (Distrikt: `Nexus.Board3D.sync`). Smoke: [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md#code-einstieg-pointers-nicht-vollständige-dateien).

## Konventionen

- UI: Deutsch.
- Prefs: `nexus-theme`, `nexus-ui-scale`, `nexus-cam-pitch`, `nexus-board-quality`, `nexus-biome`.
- Nach JS/CSS: `?v=` in `nexus/index.html` erhöhen.
- Gewinner / Ressourcen / Zonen / Sichtbarkeit: nur DESIGN, nicht hier.

## Nicht bauen ohne explizite Anfrage

React/Vue, Bundler, npm, Test-Frameworks, Online-Multiplayer, Accounts, Persistenz, GLTF-Bibliothek. Three.js nur vendored unter `nexus/vendor/`. Lücken in DESIGN unter „fehlt“.

## Fallen (Hot-Seat)

- `isHotSeatShield`: kein Leak von Rolle, Wallet, Versprechen.
- Alle gebauten Geräte öffentlich; `Nexus.boardGadgetsFor`.
- Produktion zu Zugbeginn; 2p- und 5–6p-Skalierung in `roles.js`.
- Bandbreite aus Wohnen ohne eigenes Datenzentrum = 0.
- Anleitung = Overlay, keine neue `turnPhase`.
