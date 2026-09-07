# NEXUS 2.1

Hot-Seat-Brettspiel im Browser über Smart City, IoT und autonomes Fahren. Seminarfachprojekt am Herbartgymnasium Oldenburg. Es geht um Abwägung — Cloud gegen lokale Verarbeitung, Komfort gegen Datenschutz — nicht um Quiz-Wissen.

Zwei oder drei Personen spielen am **selben Gerät**. Jeder hat eine **geheime Rolle** und versucht, deren Zielprofil auf 100 % zu bringen, bevor die Runden auslaufen.

**Spielen:** [`nexus/index.html`](nexus/index.html) im Browser öffnen. Kein Install, kein Server.

## Features

- Hex-Distrikt (Radius 3) mit Smart Homes, Zoom/Pan und automatischer Produktion
- Fünf Ressourcen, Fabrik-Gacha (Ausfall bis Boom) und Home-Grundversorgung
- Geräte Cloud oder lokal: Upkeep, Risiko, HEMS, Batterie, Peak Load, V2X, Ladesäulen-Netz
- SAE-Level 0–5 als Mobilitätsschicht
- Innovationskarten und Ereignisdeck (inkl. Datenleck vs. Privacy-Schild)
- Offene vs. proprietäre Standards und 1:1-Handel
- Sechs geheime Rollen mit gestuften Unterzielen
- Hot-Seat-Schutz: zwischen den Zügen bleiben Hand, Ressourcen und Ziele verdeckt
- Öffentliche Cloud-Geräte der anderen; lokale Verarbeitung bleibt privat
- Dark/Light-Theme und UI-Skalierung

Volle Regeln: [`docs/GAME.md`](docs/GAME.md). Für Agents: [`AGENTS.md`](AGENTS.md).

## Tech

Reines HTML, CSS und JavaScript. Zustand, Darstellung und Daten sind getrennt (`state.js` / `render.js` / `js/data/`). Das Board ist SVG. Es gibt bewusst **kein** npm, kein Bundler und kein Backend — Partien leben nur im Tab.

## Repo-Karte

```
nexus/                 Spielclient (hier starten)
  index.html
  style.css
  js/state.js          Regeln
  js/render.js         DOM/SVG
  js/main.js           Eingaben
  js/data/             Geräte, Karten, Events, Rollen, Hex
docs/GAME.md           Regeln aus dem Code
AGENTS.md              Konventionen für Coding-Agents
.cursor/rules/         Cursor-Projektregel
.agents/skills/        transitions.dev Motion-Skills
```

## Status

Lokaler Mehrspieler und Mobilität (SAE) sind spielbar. Online-Mehrspieler / Accounts sind nicht implementiert.
