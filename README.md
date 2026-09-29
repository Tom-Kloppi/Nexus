# NEXUS

Hot-Seat-Brettspiel im Browser: Stadtteilmanager, IoT, Abwägung. Seminarfachprojekt am Herbartgymnasium Oldenburg.

**2–6 Personen, ein Gerät.** Jeder hat ein geheimes **Wahlversprechen**. Wer dessen Profil auf 100 % bringt, wird Bürgermeister.

**Spielen:** [`nexus/index.html`](nexus/index.html) im Browser (oder `python3 -m http.server` im Ordner `nexus/`). Kein npm.

```bash
git checkout main && git pull
cd nexus && python3 -m http.server 8765
# http://127.0.0.1:8765/index.html
```

## Stand

| Ref | Bedeutung |
| --- | --- |
| **`main`** | Aktuell: WebGL-Stadt, 2–6 Spieler, öffentliche Gadgets, Anleitung. Vertrag: [`docs/DESIGN.md`](docs/DESIGN.md) |
| **`prototype`** | Freeze NEXUS 2.1 (5 Ressourcen) |
| **`archive/main-pre-webgl-cast-5bc5`** | `main` direkt vor 3.0 |

Geschichte der Wellen: [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Spiel (kurz)

Drei Ressourcen (Energie, Geld, Bandbreite), vier Spuren (Image, Komfort, Umwelt, Sicherheit), Felder Wohnen / Energie / Datenzentrum / Verkehr plus Leitstand. Geräte Cloud oder lokal (Mechanik), sichtbar für alle. Standards, Handelsangebot, SAE, Karten, Ereignisse.

Ausführlich: [`docs/GAME.md`](docs/GAME.md). Figuren: [`docs/CAST_22_9.md`](docs/CAST_22_9.md).

## Tech

HTML/CSS/JS. Regeln `state.js`, HUD `render.js`, Distrikt `board3d.js` + vendored Three.js. Kein Bundler, kein Backend.

## Docs für Agents

Einstieg: [`AGENTS.md`](AGENTS.md). Karte: Vertrag `DESIGN.md` → Ist-Regeln `GAME.md` → Geschichte `CHANGELOG.md`. Nicht als Vertrag: Playtest-Liste, UPDATE_CONCEPT, CITY_3D_CUTS (Schnitte), CAST (Figuren-Details).
