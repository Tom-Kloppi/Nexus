# Agent-Plan — NEXUS Post-Playtest

Ausführung gegen `docs/DESIGN.md`. Parallel nur mit Ownership unten.

## Phase 0 — Done (Orchestrator)

- [x] Branch `prototype` = Freeze 2.1, remote `origin/prototype`
- [x] `docs/DESIGN.md` Vertrag
- [x] Concept-PDFs unter `docs/concepts/`

## Phase 1 — Parallel

### A — Data (`nexus/js/data/*`)

1. `constants.js`: `RESOURCE_KEYS` → energy/money/bandwidth; Labels/Farben; Zone-Keys residential/energy/datacenter/traffic; `TRANSFORMER_MONEY_PER_ENERGY`; Home-Yield 1×3 Ressourcen; HUB_DISCOUNT_TIE_ORDER anpassen.
2. Zone-Typen mit `variants` wo nötig (`solar`/`transformer`, `insecure`/`secure`).
3. `devices.js`: alle Kosten/Effekte auf 3 Ressourcen; Effekte dürfen Spuren erhöhen (`environment`, `security`, `comfort`, `image`) oder `risk` senken.
4. `cards.js` / `events.js`: Effekte nur erlaubte Keys; tote Ressourcen-Keys entfernen/ersetzen.
5. `roles.js` (data): Labels als Wahlversprechen; Subgoals auf Spuren/Metriken laut DESIGN.

### B — Logic (`state.js`, `roles.js`)

1. Wallet nur 3 Keys; `scores` Objekt an Spielern.
2. Expand: Variantenwahl energy/datacenter.
3. Produktion: Solar=Würfel; Transformer=stabil + Money-Kosten; Residential-Bandbreite nur mit eigenem Datenzentrum; Home +1×3.
4. Datenzentrum insecure → Risiko; secure → security-Spur.
5. `computeRoleProgress` / Metriken an neue Rollen-Steps anbinden; tote Metrik-Keys entfernen oder aliasen.
6. Handel/SAE/Geräte-Kosten gegen neue Ressourcen.

### C — UI (`render.js`, `main.js`, `index.html`, CSS, icons)

1. HUD: 3 Ressourcen + 4 Spuren (kompakt).
2. Expand-UI: Typ + Variante.
3. Texte: Stadtteilmanager / Wahlversprechen.
4. Resource-Picks in Events/Trade auf 3 Keys.
5. `?v=` bumpen.

### D — Docs

1. `docs/GAME.md` an DESIGN + Code angleichen (was der Code tut).
2. `README.md` + `AGENTS.md` aktualisieren; GitHub-Description separat via `gh`.

## Phase 2 — Integrator

- Smoke: Setup → Reveal → ein Expand energy solar → ein DC → Wohnen → Zugende ohne Console-Error.
- Commit auf `main`, Push, `gh repo edit --description`.

## Inkonsistenz-Regel

Bei Konflikt gewinnt `docs/DESIGN.md`. Nicht „weiterdenken“ über DESIGN hinaus.
