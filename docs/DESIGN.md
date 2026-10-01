# NEXUS — Ziel-Design (Post-Playtest)

**Quelle:** `docs/concepts/projektkonzept.pdf` (Mechanik, Konzeptausbau nach Playtest — Basis der neuen Versionen) + `docs/concepts/nexuskonzeptblatt.pdf` (UI/Hot-Seat).  
**Playtest-Briefing (Prototyp-Stimme, Teaser/Todo):** [`docs/PLAYTEST_AENDERUNGSLISTE.md`](PLAYTEST_AENDERUNGSLISTE.md) — Interview + Konzeptausbau; bei Konflikt gewinnt **diese** Datei.  
**Freeze:** Branch `prototype` = spielbarer Stand vor diesem Redesign (NEXUS 2.1).  
**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug. Wellen/Geschichte: [`CHANGELOG.md`](CHANGELOG.md) — kein Vertrag.  
**Concept-Review:** Tom hat die Defaults in `docs/UPDATE_CONCEPT.md` (Anhang B, §3.5, §9) akzeptiert. Akzeptierte Sätze stehen hier. Die Review-Datei bleibt Begründung — **kein** zweiter Vertrag.  
**Grafik-Nachzug (schlägt ältere Konzept-Defaults):** Straßen auf **Kanten**; `traffic` = Busbahnhof/Parkplatz (**nicht** die Straße); WebGL-Stadt mit echten Volumen (Three.js, vendored), Gewerbe-/Hügel-Rand, Orbit-Kamera; Feld-Ausbau, Abriss nur wenn verbunden, Handel = Angebot.

## Setting

Spieler = Stadtteilmanager (Testgebiet). Geheimes **Wahlversprechen** statt alter Rollenziele. Wer am Ende laut eigenem Versprechen führt → Bürgermeister.

**Hot-Seat bleibt der Vertrag:** 2–6 Spieler, ein Gerät. **LAN/WLAN-Multiplayer:** erst nach Verlassen von Hot-Seat (Gate), nicht in diesem Zyklus — kein Protokoll, kein WebRTC, kein Backend jetzt.

### Harte Kernregeln (nicht aufweichen)

- Geheimes Wahlversprechen; **Ausrichtung öffentlich** (Turn-Chip), Versprechen-Details privat.
- Hot-Seat-Schild + Handoff-Ritual **jetzt** hart (`role_reveal` / `handoff`, Board dimmen). Nacht darf **keine** Rolle, kein Wallet und keine Versprechen-Details verraten.
- Produktion **automatisch zu Zugbeginn**.
- Bandbreite aus Wohnen nur mit **eigenem** Datenzentrum.
- 2-Spieler: Metrik-Skalierung in `roles.js` bleibt; 5–6 Spieler leichte Hochskalierung von Handel/Zonen.
- Sieg = `computeRoleProgress` (Sofort ≥ 100 % nach voller Runde, sonst höchste %). Keine Spurensumme, **keine Catch-up-Regel**.
- Geräte und Feld-Ausbau sind **öffentlich** (Cloud und lokal). Cloud vs lokal bleibt nur als Mechanik (Risiko, Upkeep, lokal %).
- Vanilla HTML/CSS/JS für Regeln und App-Chrome; **kein** React/Vue, **kein** Online-Backend, keine Accounts. Das **Distrikt-Board** darf eine vendored 3D-Engine (Three.js) oder Canvas nutzen — nur Präsentation, keine Regeln.

## Präsentation / Board

- **Default-Theme:** Tageslicht (`data-theme="light"` / `nexus-theme` Default `light`). Toggle = **Nachtstadt**. Chrome/Himmel **teal** (grün-blau), kein reines UI-Blau.
- **Layout:** 3D-Canvas füllt den Viewport; Topbar, Dock und Tray liegen als halbtransparente Overlays darüber. Dock standardmäßig kompakte Schiene, ausklappbar („Ziele“). Toasts über dem Tray, nicht über Primärknöpfe. Schmale Breite: Dock als Sheet.
- **Board-Stack:** WebGL-Stadt mit **Three.js r158** (`nexus/vendor/three.min.js`), Szene in `nexus/js/board3d.js` (+ Look/Props-Helfer). App-Shell bleibt HTML/CSS. `render.js` orchestriert HUD; das Canvas darf raycasten. Regeln nur in `state.js`. Offline: `python -m http.server` in `nexus/`. Kein Foto-Board, keine GLTF-Bibliothek — prozedurale Low-Poly-Volumen und Billboard-Sprites.
- **Board:** keine flachen Eurogame-Plättchen. Extrudierte Volumen, Z-Buffer nach Bildtiefe. **Ein** Hauptgebäude pro Spielkachel. Start = **Kontrollbüro**. Landnutzung lesbar (**Gebäudetyp vor Besitzfarbe**): Wohnen = Block, Solar = Farm mit Leitstand, Trafo = Umspannwerk, DC = Halle (Ausbau = Flügel), Verkehr = Busbahnhof oder Parkplatz. **Besitz:** klare Spielerfarbe auf der Pad-Fläche, leuchtender Rand, Dach-Akzent in Spielerfarbe. **Straßen sind keine Kacheln:** ein geteiltes Netz auf den Hex-Kanten; Autos fahren Feld→Feld; Ampeln Präsentation. Parks nur Deko (seedbasiert, auch Teilflächen). Unkontrollierte Felder dürfen schon bebaut/belebt aussehen. Untergrund = wählbares Biom (Gras/Wüste/Wasser, Pref `nexus-biome`) als große Platte mit Nebel/Kulisse — keine Catan-Wasserkacheln im Hex-Netz. Rand: Gewerbe, Hügel, Berge.
- **Kamera:** Zu Zugbeginn Leitstand der aktiven Person unten, Stadt voraus. Rechts-/Mittelziehen = Orbit, Linksziehen = Pan, Rad = Zoom; Polar-/Zoom-/Pan-Clamps, weiche Dämpfung, nicht unter den Boden. Native Kontextmenüs auf dem Board blockiert. Prefs: `nexus-cam-pitch`, `nexus-board-quality` (Auto / Qualität / Balance / Leistung), `nexus-biome`.
- **Look-Nordstern:** HexaUrbs — Look und Hex-Lesbarkeit, nicht Genre/Engine. Parks keine baubaren Zonen. Bebaubare Felder klar markiert; Picking auf flacher Boden-Hitbox.
- **Nacht:** dunkelblau/dunkelgrau mit genug Ambient und Mondlicht; Felder und Besitzfarben bleiben lesbar. Fenster/Laternen/Ampeln (emissive/Glow/Lichtpools, keine PointLights pro Laterne); Geräte-Gizmos öffentlich. Kein Leak von Rolle/Wallet/Versprechen. Handoff/Reveal dimmt das Board.
- **Motion = Lehre:** Shake, Ticks, Place-Pop, Produktion-Pulse/Flugpartikel, Handoff-Dim. Tokens `nexus/transitions.css`. First-turn: Copy + Pulse — **keine** `turnPhase` für Tutorial. **Anleitung** = Overlay (`data/tutorial.js`), optional, Spotlight auf echte UI. Rollen als Steckbriefe mit Avatar; Glossar Spur/Stufe/Prozent.
- **Investor-Metrik** `moneyThroughput` = kumuliertes **Geld**.
- **Verkehr:** Stub-Ertrag; **+1 Komfort** beim Bau. Feld = Gebäude, nicht das Straßennetz.

## Ressourcen (genau 3)

| Key | Label | Kurz |
| --- | --- | --- |
| `energy` | Energie | Energie |
| `money` | Geld | Geld |
| `bandwidth` | Bandbreite | Bandbr. |

Start: 3 von jeder. Keine anderen Wallet-Keys. Alte Keys (`data`, `compute`, `hardware`, `connectivity`) sind **tot**.

## Wertungsspuren (genau 4)

| Key | Label |
| --- | --- |
| `image` | Image |
| `comfort` | Komfort |
| `environment` | Umwelt |
| `security` | Sicherheit |

Spieler speichern `scores: { image, comfort, environment, security }` (Integers ≥ 0).  
Sieg = `computeRoleProgress` gegen das Wahlversprechen (Unterziele auf diesen Spuren / abgeleiteten Metriken). Kein Summen-Highscore über alle Spuren.

## Feldtypen

`ZONE_TYPE_KEYS = ["residential", "energy", "datacenter", "traffic"]` (+ `home`).

| Typ | Varianten / Regel |
| --- | --- |
| `energy` | `solar`: Würfel-Produktion (bestehende PRODUCTION_DICE). `transformer`: stabile Produktion, kostet `money` pro Ertragseinheit (Konstante `TRANSFORMER_MONEY_PER_ENERGY`). Optional: Bau kann `environment` geben (Solar) oder kosten (Transformer). |
| `datacenter` | `insecure` günstig / unsicher (+Risiko). `secure` teurer / sicher. **Ohne eigenes Datenzentrum:** Spieler hat keinen Zugriff auf Bandbreiten-Ertrag aus Wohnfeldern (Wallet-`bandwidth` aus Residential = 0 bis DC existiert). |
| `residential` | Produziert Bandbreite (Basis). Geräte (Kamera, Schloss, …) bleiben Gadgets im Device-Menü. **Feld-Ausbau** `upgradeLevel` 0–2 ist Monopoly-artig und sichtbar am 3D-Gebäude. Nachbar-Bonus: optional später; MVP = nur eigenes Feld. |
| `traffic` | Stub: baubar, produziert wenig `money`. **+1 Komfort** beim Bau. Grafik: Busbahnhof oder Parkplatz mit Ladestationen **auf** dem Feld. |
| `home` | Startfeld **Kontrollbüro**; Basis +1 aller 3 Ressourcen / Runde, plus +1 je `upgradeLevel`. |

Beim Expand wählt der Spieler Typ; bei `energy`/`datacenter` zusätzlich die Variante. UI: Typwahl **2×2**. Optional: empfohlenes Feld/Typ leuchtet aus den **eigenen** Engpässen (Ressourcen / Versprechen) — kein Leak fremder Privatinfos.

### Feld-Ausbau (alle Typen)

Jedes eigene Feld hat `upgradeLevel` 0–2 (Konstante `ZONE_UPGRADE_MAX`). Kosten: `money` = `ZONE_UPGRADE_MONEY_BASE + level × ZONE_UPGRADE_MONEY_STEP`, ab Stufe 1 zusätzlich `energy`. **Ertrag:** `primaryBase + upgradeLevel` (Home: `HOME_BASE_YIELD + upgradeLevel` auf allen drei Ressourcen). Transformator-Aufwand skaliert mit der neuen Energiemenge. Geräte bleiben separat (alle gebauten Gadgets öffentlich, Cloud und lokal). Ausbau ist am Gebäude lesbar (Höhe, Flügel, Dachtechnik, Kameras) — keine parallele Tech-Tree.

### Abriss

Eigenes Nicht-Home-Feld darf gegen Geld abgerissen werden (`DEMOLISH_REFUND_MONEY + upgradeLevel × DEMOLISH_REFUND_PER_LEVEL`), **nur** wenn das restliche Netz des Spielers über Nachbarschaft zum Home verbunden bleibt. UI zeigt Rückzahlung vs. verlorenen Ertrag.

### Handel = Angebot

Kein Sofort-Tausch. Spieler A bietet **Kurs + Menge** (geben/wollen), 1:1 auf **einem** Gerät. Spieler B nimmt an oder lehnt ab — im eigenen Zug oder als Hot-Seat-Unterbrechung (Zugübergabe, dann zurück). Ressourcen wechseln erst bei Annahme. Hot-Seat: keine Rollen/Wallets der anderen Person zeigen. Keine Multi-Resource-Deals, keine Partner-Bestätigung auf einem zweiten Gerät.

### Offen vs. proprietär (bestehende Semantik, klarer)

Gleiche Wahl = handelbar. **Offen+Offen:** `OPEN_STANDARD_DISCOUNT` auf den Aufpreis, wenn die abgegebene Ressource nicht kürzlich selbst produziert wurde; erfolgreicher Tausch zählt `standardsBonusVolume`. **Proprietär+Proprietär:** handelbar, kein Rabatt. **Gemischt:** blockiert. Versuch gegen ein proprietäres Gegenüber erhöht dessen `blockedTradesCaused`. Streak zählt Runden auf derselben Wahl.

### Geräte / Karten

Keine neuen Geräte-IDs in diesem Zyklus; Loop über Feedback und Copy. Karten/Events: Effekte nur auf 3 Ressourcen + 4 Spuren + Risiko. `privacy` als Effect-Key ist tot (→ `security` / Risiko).

## Was bleibt aus 2.1

- Hex Radius 3 bei 2–3 Spielern, Radius 4 bei 4–6; Homes fair auf Hex-Ecken; Adjacent-Expand
- Hot-Seat / Role-Reveal / Handoff
- Cloud vs lokal bei Geräten als **Mechanik** (lokaler Anteil → `security`); Sichtbarkeit: alle eigenen Gadgets öffentlich
- Offen / Proprietär Standard + Handels**angebot** (Ressourcen = die 3 neuen; Annahme/Ablehnung, kein Sofort-Tausch)
- Innovationskarten + Ereignisse (Effekte nur noch auf 3 Ressourcen + 4 Spuren + Risiko)
- SAE-Level als Mobilitätszahl (Visionär/Verkehr); Kosten in `money`+`bandwidth`

## Was bewusst fehlt (nicht bauen)

- Koalitionsregel UI
- Material-Transport über Karte
- Umweltsteuer als eigener Screen
- Amortisierung über Runden
- Public-fields / exclusive districts
- Autonomes Fahren als eigener Layer
- Nachbarschafts-Smart-Home-Miete
- LAN/WLAN-Multiplayer bis Gate nach Hot-Seat
- Neue Geräte-IDs, neue Ressourcen, vierte Spur, neue Event-Engine
- Catch-up / Rubber-Band
- Zweite Tutorial-`turnPhase` (Overlay `data/tutorial.js` existiert; nicht erweitern zu einer Regelphase)

Event-Themen (Förderung, Engpass, Abgabe) höchstens später im **bestehenden** Effect-Schema — kein neuer Screen.

## Wahlversprechen (Rollen)

Sechs IDs: `climate`, `privacy`, `investor`, `visionary`, `networker`, `controller`. **Ausrichtung öffentlich** (Turn-Chip); Unterziele privat. Mapping, Cuts, 2p/6p-Skalierung: nur [`CAST_22_9.md`](CAST_22_9.md) und `nexus/js/data/roles.js` — hier nicht duplizieren.

## Agent-Ownership

Einmal in [`AGENTS.md`](../AGENTS.md). Nach JS/CSS: `?v=` in `index.html`.
