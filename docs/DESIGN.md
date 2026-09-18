# NEXUS — Ziel-Design (Post-Playtest)

**Quelle:** `docs/concepts/projektkonzept.pdf` (Mechanik) + `docs/concepts/nexuskonzeptblatt.pdf` (UI/Hot-Seat).  
**Playtest-Briefing (Prototyp-Stimme, Teaser/Todo):** [`docs/PLAYTEST_AENDERUNGSLISTE.md`](PLAYTEST_AENDERUNGSLISTE.md) — historisch vom Interview am Freeze; bei Konflikt gewinnt **diese** Datei.  
**Freeze:** Branch `prototype` = spielbarer Stand vor diesem Redesign (NEXUS 2.1).  
**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug.

## Setting

Spieler = Stadtteilmanager (Testgebiet). Geheimes **Wahlversprechen** statt alter Rollenziele. Wer am Ende laut eigenem Versprechen führt → Bürgermeister.  
Hot-Seat, 2–3 Spieler, ein Gerät — bleibt. **LAN/WLAN-Multiplayer:** erst nach Verlassen von Hot-Seat (Gate), nicht in diesem Zyklus.

## Präsentation / Board

- **Default-Theme:** Tageslicht (`data-theme="light"` / `nexus-theme` Default `light`). Toggle = **Nachtstadt** (eigene Palette), kein invertiertes Chrome.
- **Layout:** App-Shell als CSS-Grid: Topbar, Board, Dock, Kartenfach. Chrome überlagert das Spielfeld nicht. Schmale Breite: Dock hinter „Ziele“, Board bleibt die Fläche.
- **Board:** SVG-Stadt, **keine** flachen Eurogame-Plättchen. Aufsicht **steiler von oben** (leichte Axonometrie, kein WebGL). Kacheln als Prisma. **Ein** großes 3D-Gebäude (oder ein Wohnungsblock aus wenigen verbundenen Boxen) pro Spielkachel — Google-Maps-3D-Lesart, keine vollgepflasterte Skyline. Startfeld = **Kontrollbüro / Leitstand**, kein Cottage. Kleine Gimmicks (Bäume, Dachtechnik, Randparken) auf jeder Parzelle. Landnutzung lesbar (**Typ vor Owner-Ring**): Wohnen = Wohnungsblock, Solar = Solarfarm mit Leitstand, Trafo = Umspannwerk, DC = eine Halle (Ausbau = extra Flügel), Verkehr = Busbahnhof oder Parkplatz mit Ladestationen. **Straßen sind keine Kacheln:** sie umringen die Hex-Kanten. Autos fahren auf diesem Kantennetz und parken am Straßenrand sowie auf Feld-Parkplätzen. Parks nur **Deko**. **Rand des Boards:** Felder, Hügel, Berge — **kein** Catan-Wasser. Kein WebGL, kein Foto-Board.
- **Nacht:** Fenster/Lichter nur nach öffentlichen Regeln (kein Leak lokaler Geräte); Handoff/Reveal dimmt das Board.
- **Investor-Metrik** `moneyThroughput` = kumuliertes **Geld**, nicht Gesamtproduktion.
- **Verkehr:** Stub-Ertrag + Lesbarkeit; **+1 Komfort** beim Bau. Feld = Gebäude (nicht das Straßennetz). Volle Mobilitätslogik = später.

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

Kein Sofort-Tausch. Spieler A bietet **Kurs + Menge** (geben/wollen). Spieler B nimmt an oder lehnt ab — im eigenen Zug oder als Hot-Seat-Unterbrechung (Zugübergabe, dann zurück). Ressourcen wechseln erst bei Annahme. Hot-Seat: keine Rollen/Wallets der anderen Person zeigen.

### Offen vs. proprietär (bestehende Semantik, klarer)

Gleiche Wahl = handelbar. **Offen+Offen:** `OPEN_STANDARD_DISCOUNT` auf den Aufpreis, wenn die abgegebene Ressource nicht kürzlich selbst produziert wurde; erfolgreicher Tausch zählt `standardsBonusVolume`. **Proprietär+Proprietär:** handelbar, kein Rabatt. **Gemischt:** blockiert. Versuch gegen ein proprietäres Gegenüber erhöht dessen `blockedTradesCaused`. Streak zählt Runden auf derselben Wahl.

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

## Wahlversprechen (Rollen)

Sechs IDs bleiben (`climate`, `privacy`, `investor`, `visionary`, `networker`, `controller`), Labels/Alignments werden zu Versprechen umbenannt. Unterziele mappen auf die 4 Spuren + vorhandene Metriken (Risiko, lokal %, SAE, Handel, Streaks). Konkrete Steps in `nexus/js/data/roles.js`.

## Agent-Ownership (Parallel)

| Agent | Darf schreiben | Darf nicht |
| --- | --- | --- |
| Data | `nexus/js/data/*` | state/render/main |
| Logic | `nexus/js/state.js`, `nexus/js/roles.js` | data/*, render, HTML |
| UI | `nexus/js/render.js`, `nexus/js/main.js`, `nexus/index.html`, `nexus/style.css`, `icons.js` | state Regeln, data Balance |
| Docs | `docs/GAME.md`, `README.md`, `AGENTS.md` (nur Abschnitte die DESIGN zitieren) | Spielcode |

Nach JS/CSS: `?v=` in `index.html` erhöhen (UI-Agent oder Integrator).
