# NEXUS — Ziel-Design (Post-Playtest)

**Quelle:** `docs/concepts/projektkonzept.pdf` (Mechanik) + `docs/concepts/nexuskonzeptblatt.pdf` (UI/Hot-Seat).  
**Freeze:** Branch `prototype` = spielbarer Stand vor diesem Redesign (NEXUS 2.1).  
**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug.  
**Concept-Review:** Tom hat die Defaults in `docs/UPDATE_CONCEPT.md` (Anhang B, §3.5, §9) akzeptiert. Akzeptierte Sätze stehen hier. Die Review-Datei bleibt Begründung — **kein** zweiter Vertrag.  
**Grafik-Nachzug (schlägt ältere Konzept-Defaults):** Straßen auf **Kanten**; `traffic` = Busbahnhof/Parkplatz (**nicht** die Straße); SVG-extrudierte Blöcke, Acker-Rand, steile Kamera; Feld-Ausbau, Abriss nur wenn verbunden, Handel = Angebot.

## Setting

Spieler = Stadtteilmanager (Testgebiet). Geheimes **Wahlversprechen** statt alter Rollenziele. Wer am Ende laut eigenem Versprechen führt → Bürgermeister.

**Hot-Seat bleibt der Vertrag:** 2–3 Spieler, ein Gerät. **LAN/WLAN-Multiplayer:** erst nach Verlassen von Hot-Seat (Gate), nicht in diesem Zyklus — kein Protokoll, kein WebRTC, kein Backend jetzt.

### Harte Kernregeln (nicht aufweichen)

- Geheimes Wahlversprechen; **Ausrichtung öffentlich** (Turn-Chip), Versprechen-Details privat.
- Hot-Seat-Schild + Handoff-Ritual **jetzt** hart (`role_reveal` / `handoff`, Board dimmen). Nacht-Look darf lokale Geräte nicht verraten.
- Produktion **automatisch zu Zugbeginn**.
- Bandbreite aus Wohnen nur mit **eigenem** Datenzentrum.
- 2-Spieler: Metrik-Skalierung in `roles.js` bleibt.
- Sieg = `computeRoleProgress` (Sofort ≥ 100 % nach voller Runde, sonst höchste %). Keine Spurensumme, **keine Catch-up-Regel**.
- Cloud-Geräte öffentlich, lokale privat.
- Vanilla HTML/CSS/JS; kein neues Framework, keine 3D-Engine, kein Backend in diesem Zyklus.

## Präsentation / Board

- **Default-Theme:** Tageslicht (`data-theme="light"` / `nexus-theme` Default `light`). Toggle = **Nachtstadt** (eigene Palette), kein invertiertes Chrome.
- **Layout:** App-Shell als CSS-Grid: Topbar, Board, Dock, Kartenfach. Chrome überlagert das Spielfeld nicht. Schmale Breite: Dock hinter „Ziele“, Board bleibt die Fläche.
- **Board:** SVG-Stadt, **keine** flachen Eurogame-Plättchen. Aufsicht **steiler von oben** (leichte Axonometrie, kein WebGL). Kacheln als Prisma. **Ein** großes 3D-Gebäude (oder ein Wohnungsblock aus wenigen verbundenen Boxen) pro Spielkachel — Google-Maps-3D-Lesart, keine vollgepflasterte Skyline. Startfeld = **Kontrollbüro / Leitstand**, kein Cottage. Kleine Gimmicks (Bäume, Dachtechnik, Randparken) auf jeder Parzelle. Landnutzung lesbar (**Typ vor Owner-Ring**): Wohnen = Wohnungsblock, Solar = Solarfarm mit Leitstand, Trafo = Umspannwerk, DC = eine Halle (Ausbau = extra Flügel), Verkehr = Busbahnhof oder Parkplatz mit Ladestationen. **Straßen sind keine Kacheln:** sie umringen die Hex-Kanten. Autos fahren auf diesem Kantennetz und parken am Straßenrand sowie auf Feld-Parkplätzen. Parks nur **Deko**. **Rand des Boards:** Felder, Hügel, Berge — **kein** Catan-Wasser. Kein WebGL, kein Foto-Board.
- **Look-Nordstern:** HexaUrbs (Steam) — Look und Hex-Lesbarkeit, **nicht** Genre, nicht Engine, nicht Sandbox, nicht „ohne Ressourcen“. Grafik-Pfad: A (Land-use / Tag-Nacht) dann geometrische SVG-Stadt (B-Nähe ohne Bitmap); **nicht** Hybrid-C, nicht WebGL, nicht Foto-Board. Parks/Natur nur Deko — keine baubaren Park-/Wasser-Zonen, keine Umweltpunkte für Deko-Grün.
- **Nacht:** Fenster/Lichter nur nach öffentlichen Regeln (kein Leak lokaler Geräte); Handoff/Reveal dimmt das Board.
- **Motion = Lehre:** illegal shake, Ressourcen-/Spur-Ticks, Place-Pop, Produktion-Pulse, Handoff-Dim. Spectacle nachrangig. Tokens in `nexus/transitions.css`. Regeln nur in `state.js` (kein DOM, kein `setTimeout` als Regel). First-turn: Copy + Pulse (Coupon, DC-Gate, Solar-Würfel) — **keine** Tutorial-Phase / keine neue `turnPhase`.
- **Investor-Metrik** `moneyThroughput` = kumuliertes **Geld**, nicht Gesamtproduktion.
- **Verkehr:** Stub-Ertrag + Lesbarkeit; **+1 Komfort** beim Bau. Feld = Gebäude (nicht das Straßennetz). Volle Mobilitätslogik = später. Älterer Konzept-Default „traffic = sichtbare Straße / Asphalt-Hex“ gilt **nicht**.

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

Jedes eigene Feld hat `upgradeLevel` 0–2 (Konstante `ZONE_UPGRADE_MAX`). Kosten: `money` = `ZONE_UPGRADE_MONEY_BASE + level × ZONE_UPGRADE_MONEY_STEP`, ab Stufe 1 zusätzlich `energy`. **Ertrag:** `primaryBase + upgradeLevel` (Home: `HOME_BASE_YIELD + upgradeLevel` auf allen drei Ressourcen). Transformator-Aufwand skaliert mit der neuen Energiemenge. Geräte bleiben separat (Cloud öffentlich, lokal privat). Ausbau ist am Gebäude lesbar (Höhe, Flügel, Dachtechnik, Kameras) — keine parallele Tech-Tree.

### Abriss

Eigenes Nicht-Home-Feld darf gegen Geld abgerissen werden (`DEMOLISH_REFUND_MONEY + upgradeLevel × DEMOLISH_REFUND_PER_LEVEL`), **nur** wenn das restliche Netz des Spielers über Nachbarschaft zum Home verbunden bleibt. UI zeigt Rückzahlung vs. verlorenen Ertrag.

### Handel = Angebot

Kein Sofort-Tausch. Spieler A bietet **Kurs + Menge** (geben/wollen), 1:1 auf **einem** Gerät. Spieler B nimmt an oder lehnt ab — im eigenen Zug oder als Hot-Seat-Unterbrechung (Zugübergabe, dann zurück). Ressourcen wechseln erst bei Annahme. Hot-Seat: keine Rollen/Wallets der anderen Person zeigen. Keine Multi-Resource-Deals, keine Partner-Bestätigung auf einem zweiten Gerät.

### Offen vs. proprietär (bestehende Semantik, klarer)

Gleiche Wahl = handelbar. **Offen+Offen:** `OPEN_STANDARD_DISCOUNT` auf den Aufpreis, wenn die abgegebene Ressource nicht kürzlich selbst produziert wurde; erfolgreicher Tausch zählt `standardsBonusVolume`. **Proprietär+Proprietär:** handelbar, kein Rabatt. **Gemischt:** blockiert. Versuch gegen ein proprietäres Gegenüber erhöht dessen `blockedTradesCaused`. Streak zählt Runden auf derselben Wahl.

### Geräte / Karten

Keine neuen Geräte-IDs in diesem Zyklus; Loop über Feedback und Copy. Karten/Events: Effekte nur auf 3 Ressourcen + 4 Spuren + Risiko. `privacy` als Effect-Key ist tot (→ `security` / Risiko).

## Was bleibt aus 2.1

- Hex Radius 3, Homes an Ecken, Adjacent-Expand
- Hot-Seat / Role-Reveal / Handoff
- Cloud vs lokal bei Geräten (lokaler Anteil → `security`)
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
- Tutorial-Engine / eigene Coach-`turnPhase`

Event-Themen (Förderung, Engpass, Abgabe) höchstens später im **bestehenden** Effect-Schema — kein neuer Screen.

## Wahlversprechen (Rollen)

Sechs IDs bleiben (`climate`, `privacy`, `investor`, `visionary`, `networker`, `controller`), Labels/Alignments werden zu Versprechen umbenannt. **Ausrichtung öffentlich** (Partei-Farbe); Unterziele = Wahlprogramm, nur privat. Unterziele mappen auf die 4 Spuren + vorhandene Metriken (Risiko, lokal %, SAE, Handel, Streaks). Konkrete Steps in `nexus/js/data/roles.js`.

## Agent-Ownership (Parallel)

| Agent | Darf schreiben | Darf nicht |
| --- | --- | --- |
| Data | `nexus/js/data/*` | state/render/main |
| Logic | `nexus/js/state.js`, `nexus/js/roles.js` | data/*, render, HTML |
| UI | `nexus/js/render.js`, `nexus/js/main.js`, `nexus/index.html`, `nexus/style.css`, `icons.js` | state Regeln, data Balance |
| Docs | `docs/GAME.md`, `README.md`, `AGENTS.md` (nur Abschnitte die DESIGN zitieren) | Spielcode |

Nach JS/CSS: `?v=` in `index.html` erhöhen (UI-Agent oder Integrator).
