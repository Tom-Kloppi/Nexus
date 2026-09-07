# AGENTS.md — NEXUS

Anleitung für Coding-Agents, die in diesem Repo arbeiten.

## Was das ist

NEXUS 2.1 ist ein **hot-seat** Smart-City-Brettspiel im Browser (2–3 Spieler, ein Gerät). Kein Server, kein Build, kein Framework. Einstieg: `nexus/index.html` im Browser öffnen.

Ausführliche Spielregeln: [`docs/GAME.md`](docs/GAME.md). GitHub-Überblick: [`README.md`](README.md).

## Dateikarte

| Datei | Darf | Darf nicht |
| --- | --- | --- |
| `nexus/js/state.js` | Reine Spiellogik, immutable-ish State-Updates | DOM, `document`, CSS |
| `nexus/js/render.js` | DOM/SVG aus dem State zeichnen | Regeln ändern, Ressourcen verbuchen |
| `nexus/js/main.js` | Events, Map-Gesten, Prefs, `commit()` | Lange Regelblöcke (gehören nach `state.js`) |
| `nexus/js/roles.js` | Rollen zuweisen, Metriken, `computeRoleProgress` | Geräte bauen |
| `nexus/js/data/*.js` | Konstanten, Geräte, Karten, Events, Rollen, Hex-Layout | Ablauf steuern |
| `nexus/js/icons.js` | SVG-Icons | — |
| `nexus/style.css` | Look | — |
| `nexus/transitions.css` | Motion-Tokens aus transitions.dev | Ad-hoc-Keyframes ohne Tokens, wenn vermeidbar |

Namespace: `window.Nexus`. Script-Reihenfolge steht in `index.html` und muss erhalten bleiben.

## Architektur-Vertrag

```
Klick in main.js  →  Nexus.someRule(state, …) in state.js  →  neuer State
                  →  Nexus.render(state, ui) in render.js
```

`state.js` soll später netzwerkfähig bleiben: alle Regeln als reine Funktionen über ein Zustandsobjekt.

## Sieg und Metriken (nicht verwechseln)

- **Gewinner** = höchste / 100 % **Rollen-Zielerfüllung** (`Nexus.computeRoleProgress`).
- Es gibt **keinen** alten Drei-Säulen-Score mehr (`computeScore` ist entfernt).
- `efficiencyPoints` (HUD: Effizienz) zählt für den Klimaingenieur.
- Karteneffekt `privacy` senkt `risk` (Datenschützerin).
- `innovationCardsTotal` zählt gezogene Karten; die Ladesäule zieht wirklich eine Karte.
- Ladesäulen-Netz verbilligt SAE um 1 Konnektivität.

## UI-Konventionen

- Sprache der Oberfläche: Deutsch.
- Theme/UI-Größe: `localStorage` Keys `nexus-theme`, `nexus-ui-scale`.
- Nach Änderungen an JS oder CSS den Query-Parameter `?v=` **aller** betroffenen (besser: aller) Script-/CSS-Tags in `nexus/index.html` erhöhen. Sonst sieht Tom den alten Cache.

## Motion

Transitions liegen in `.agents/skills/transitions-dev/` und `.agents/skills/transitions-polish/`. Bestehende `t-*`-Klassen und Tokens in `nexus/transitions.css` wiederverwenden, nicht parallel neu erfinden.

## Nicht bauen, solange niemand fragt

- React/Vue/Svelte, Bundler, npm, Tests-Frameworks
- Accounts, Persistenz der Partie, Online-Multiplayer, Python-Backend
- KI-Gegner, variable Handelsmengen

## Typische Fallen

- Private Infos (Hand, Ressourcen, geheimes Ziel) dürfen in `role_reveal` / `handoff` nicht durchscheinen (`isHotSeatShield`).
- Cloud-Geräte anderer sind öffentlich, lokale Geräte nicht.
- Produktion läuft automatisch zu Zugbeginn; es gibt keinen Ernten-Button.
- 2-Spieler-Spiele skalieren einige Rollenmetriken in `roles.js` (`TWO_PLAYER_METRIC_SCALE`).
