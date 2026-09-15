# AGENTS.md — NEXUS

Anleitung für Coding-Agents in diesem Repo.

## Zuerst lesen

1. **Hard constraints:** `.cursor/rules/nexus.mdc` (immer geladen).
2. **Ziel-Design:** [`docs/DESIGN.md`](docs/DESIGN.md) — Vertrag für Post-Playtest. Bei Regelkonflikt gewinnt DESIGN.
3. **Ist-Regeln im Code:** [`docs/GAME.md`](docs/GAME.md) — nur lesen wenn Verhalten unklar.
4. **Parallel-Plan:** [`docs/AGENT_PLAN.md`](docs/AGENT_PLAN.md) — Ownership, nicht umgehen.
5. Motion-Skills nur bei Animations-Aufgaben.

## Was das ist

NEXUS ist ein **hot-seat** Smart-City-Brettspiel im Browser (2–3 Spieler, ein Gerät). Spieler = Stadtteilmanager mit geheimem **Wahlversprechen**. Kein Server, kein Build, kein Framework. Einstieg: `nexus/index.html`.

Branch **`prototype`**: eingefrorener Stand NEXUS 2.1 (fünf Ressourcen, alte Zonen). Arbeit am Redesign läuft auf **`main`**.

## Dateikarte / Ownership

| Datei | Darf | Darf nicht |
| --- | --- | --- |
| `nexus/js/state.js` | Reine Spiellogik | DOM, CSS |
| `nexus/js/render.js` | DOM/SVG aus State | Regeln ändern |
| `nexus/js/main.js` | Events, Gesten, Prefs, `commit()` | Lange Regelblöcke |
| `nexus/js/roles.js` | Versprechen/Metriken, `computeRoleProgress` | Geräte bauen |
| `nexus/js/data/*.js` | Konstanten, Geräte, Karten, Events, Rollen, Hex | Ablauf steuern |
| `docs/DESIGN.md` | Nur Orchestrator / explizite Design-Änderung | „Nebenbei“ umschreiben |

Namespace: `window.Nexus`. Script-Reihenfolge in `index.html` nicht brechen.

## Architektur-Vertrag

```
Klick in main.js  →  Nexus.someRule(state, …) in state.js  →  neuer State
                  →  Nexus.render(state, ui) in render.js
```

## Kernmodell (Post-Playtest)

- Ressourcen: `energy`, `money`, `bandwidth`
- Spuren: `image`, `comfort`, `environment`, `security`
- Zonen: `residential`, `energy` (+solar/transformer), `datacenter` (+insecure/secure), `traffic`, `home`
- Gewinner = höchste / ≥100 % Versprechens-Erfüllung (`computeRoleProgress`), nicht Spurensumme

## UI-Konventionen

- Oberfläche: Deutsch.
- Theme/UI: `localStorage` `nexus-theme`, `nexus-ui-scale`.
- Nach JS/CSS: `?v=` aller betroffenen Tags in `nexus/index.html` erhöhen.

## Nicht bauen, solange niemand fragt

- React/Vue/Svelte, Bundler, npm, Test-Frameworks
- Online-Multiplayer, Accounts, Persistenz
- Koalition, Transport-Layer, Umweltsteuer-UI, Amortisierung (siehe DESIGN „fehlt“)

## Fallen

- Private Infos in `role_reveal` / `handoff` nicht leaken (`isHotSeatShield`).
- Cloud-Geräte anderer öffentlich, lokale privat.
- Produktion auto zu Zugbeginn.
- 2-Spieler: Metrik-Skalierung in `roles.js`.
- Bandbreite aus Wohnen ohne eigenes Datenzentrum = 0.
