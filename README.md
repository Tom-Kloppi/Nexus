# NEXUS

Hot-Seat-Brettspiel im Browser: Stadtteilmanager in der nahen Zukunft, IoT und Abwägung statt Quiz. Seminarfachprojekt am Herbartgymnasium Oldenburg.

Zwei oder drei Personen am **selben Gerät**. Jeder hat ein geheimes **Wahlversprechen** und versucht, dessen Zielprofil auf 100 % zu bringen, bevor die Runden auslaufen. Wer gewinnt, wird Bürgermeister.

**Spielen:** [`nexus/index.html`](nexus/index.html) im Browser öffnen. Kein Install, kein Server.

## Stand

- **`main`** — Post-Playtest-Redesign (3 Ressourcen, 4 Wertungsspuren, neue Feldtypen). Vertrag: [`docs/DESIGN.md`](docs/DESIGN.md).
- **`prototype`** — eingefrorener NEXUS-2.1-Stand (5 Ressourcen, alte Zonen) zum Vergleichen.

## Features (Zielbild)

- Hex-Distrikt, Hot-Seat mit verdeckten Ressourcen/Zielen
- Ressourcen: Energie, Geld, Bandbreite
- Felder: Wohnen, Energie (Solar vs. Transformator), Datenzentrum (unsicher vs. sicher), Verkehr (Stub)
- Wertung: Image, Komfort, Umwelt, Sicherheit — gekoppelt an das Wahlversprechen
- Geräte Cloud oder lokal, Standards offen/proprietär, Handel, SAE, Karten & Ereignisse

Ausführlich: [`docs/GAME.md`](docs/GAME.md). Für Agents: [`AGENTS.md`](AGENTS.md), Plan: [`docs/AGENT_PLAN.md`](docs/AGENT_PLAN.md).

## Tech

Reines HTML, CSS und JavaScript. `state.js` / `render.js` / `js/data/`. SVG-Board. Kein npm, kein Bundler, kein Backend.

## Repo-Karte

```
nexus/                 Spielclient
docs/DESIGN.md         Ziel-Vertrag (Post-Playtest)
docs/GAME.md           Regeln = Code-Stand
docs/AGENT_PLAN.md     Parallel-Ownership für Agents
docs/concepts/         Konzept-PDFs
AGENTS.md              Agent-Konventionen
.cursor/rules/         immer-geladene Hard Constraints
```
