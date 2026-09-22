# AGENTS.md — NEXUS

Anleitung für Coding-Agents. Ausführlicher Workflow + Quellen: [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md).

## Zuerst lesen

1. **Hard constraints:** `.cursor/rules/nexus.mdc` (immer geladen).
2. **Ziel-Design:** [`docs/DESIGN.md`](docs/DESIGN.md) — Vertrag Post-Playtest; bei Konflikt gewinnt DESIGN.
3. **Ist-Regeln:** [`docs/GAME.md`](docs/GAME.md) — nur wenn Verhalten unklar.
4. **Parallel-Plan:** [`docs/AGENT_PLAN.md`](docs/AGENT_PLAN.md) — Ownership, nicht umgehen.
5. **Playtest-Briefing:** [`docs/PLAYTEST_AENDERUNGSLISTE.md`](docs/PLAYTEST_AENDERUNGSLISTE.md) — Interview + Konzeptausbau (`docs/concepts/projektkonzept.pdf`); Teaser/Todo, kein zweiter Vertrag.
6. **Concept-Review (akzeptiert):** [`docs/UPDATE_CONCEPT.md`](docs/UPDATE_CONCEPT.md) — Begründung; Vertrag ist DESIGN. Nicht blind einlesen, nicht gegen Grafik-Nachzüge (Kanten-Straßen, Verkehr = Gebäude) ausspielen.
7. Motion-Skills (`.agents/skills/`) nur bei Animations-Aufgaben.

## Was das ist

Hot-seat Smart-City-Brettspiel (2–3 Spieler, ein Gerät), vanilla HTML/CSS/JS. Einstieg: `nexus/index.html`. Branch **`prototype`** = Freeze 2.1; Redesign auf **`main`**.

## Ownership

| Datei | Darf | Darf nicht |
| --- | --- | --- |
| `nexus/js/state.js` | Spiellogik | DOM |
| `nexus/js/render.js` | DOM/HUD | Regeln |
| `nexus/js/board3d.js` | Distrikt-WebGL | Regeln, App-Shell-Layout |
| `nexus/js/main.js` | Events, `commit()` | Lange Regelblöcke |
| `nexus/js/roles.js` | Versprechen, `computeRoleProgress` | Geräte bauen |
| `nexus/js/data/*.js` | Konstanten, Daten | Ablauf steuern |
| `docs/DESIGN.md` | Nur explizite Design-Änderung | Nebenbei umschreiben |
| `AGENTS.md`, `.cursor/rules/**`, `.cursorignore` | Agent-Doku / Constraints | Spielregeln erfinden |

`window.Nexus`-Namespace; Script-Reihenfolge in `nexus/index.html` nicht brechen (`vendor/three.min.js` vor `board3d.js`).

## Architektur (eine Zeile)

`main.js` → Regel in `state.js` → `Nexus.render(state, ui)` in `render.js` (Distrikt: `Nexus.Board3D.sync`). Details + Smoke: [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md#code-einstieg-pointers-nicht-vollständige-dateien).

## Konventionen

- UI-Sprache: Deutsch.
- Prefs: `localStorage` `nexus-theme`, `nexus-ui-scale`, `nexus-cam-pitch`.
- Nach JS/CSS: `?v=` in `nexus/index.html` erhöhen.
- Gewinner / Ressourcen / Zonen: siehe `docs/DESIGN.md` (nicht hier duplizieren).

## Nicht bauen ohne explizite Anfrage

React/Vue, Bundler, npm, Test-Frameworks, Online-Multiplayer, Accounts, Persistenz. Three.js nur vendored unter `nexus/vendor/` für das Distrikt-Board (siehe DESIGN). Offene Design-Lücken (Koalition, Transport, …) → DESIGN „fehlt“.

## Fallen (Hot-Seat)

- Kein Leak privater Infos in `role_reveal` / `handoff` (`isHotSeatShield`).
- Cloud-Geräte anderer öffentlich; lokale privat.
- Produktion auto zu Zugbeginn; 2-Spieler-Skalierung in `roles.js`.
- Bandbreite aus Wohnen ohne eigenes Datenzentrum = 0.
