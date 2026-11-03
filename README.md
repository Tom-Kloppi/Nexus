# NEXUS

Hot-Seat-Brettspiel im Browser: Stadtteilmanager, IoT, Abwägung. Seminarfachprojekt am Herbartgymnasium Oldenburg.

**2–6 Personen, ein Gerät.** Jeder hat ein geheimes **Wahlversprechen**. Wer dessen Profil auf 100 % bringt, wird Bürgermeister.

**Spielen:** mit Würfelserver (empfohlen) oder lokal. Kein npm.

```bash
git checkout main && git pull
python3 -m pip install -r requirements.txt
python3 -m uvicorn server.app:app --host 127.0.0.1 --port 8765
# http://127.0.0.1:8765/index.html
```

Ohne Python-Server: `cd nexus && python3 -m http.server 8765`. Würfel fallen dann lokal und sind als `local` markiert.

## Stand

| Ref | Bedeutung |
| --- | --- |
| **`main`** | Aktuell (Overhaul 2): abgeleitetes Risiko, Projektmarkt, Mobilität, Stadtbausatz. Vertrag: [`docs/DESIGN.md`](docs/DESIGN.md), Entscheidungen: [`docs/DESIGN_DECISIONS.md`](docs/DESIGN_DECISIONS.md) |
| **`prototype`** | Freeze NEXUS 2.1 (5 Ressourcen) — bleibt erhalten |
| **`archive/main-pre-visuals-ui-d004`** | `main` direkt vor 3.1 |
| **`archive/main-pre-webgl-cast-5bc5`** | `main` direkt vor 3.0 |

Geschichte der Wellen: [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Spiel (kurz)

Drei Ressourcen (Energie, Geld, Bandbreite), vier Spuren (Image, Komfort, Umwelt, Sicherheit), Felder Wohnen / Energie / Datenzentrum / Verkehr plus Leitstand. Geräte Cloud oder lokal, sichtbar für alle. Risiko aus Cyber, Netz, Abhängigkeit und Verkehr, offen gewürfelt. Drei Projektkarten, Buslinien, SAE 0–5. Vier Kapitel bis zur Resilienz-Prüfung.

Ausführlich: [`docs/GAME.md`](docs/GAME.md). Figuren: [`docs/CAST_22_9.md`](docs/CAST_22_9.md).

## Tech

HTML/CSS/JS. Regeln `state.js` plus Module (`risk.js`, `mobility.js`, `projects.js`, `arc.js`). HUD `render.js`, Distrikt `board3d.js` und `board-kit.js`, vendored Three.js. Würfel: `server/app.py` (FastAPI). Kein Bundler.

## Docs für Agents

Einstieg: [`AGENTS.md`](AGENTS.md). Karte: Vertrag `DESIGN.md` → Ist-Regeln `GAME.md` → Geschichte `CHANGELOG.md`. Nicht als Vertrag: Playtest-Liste, UPDATE_CONCEPT, CITY_3D_CUTS (Schnitte), CAST (Figuren-Details).
