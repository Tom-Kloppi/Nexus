# NEXUS — Ziel-Design (Post-Playtest)

**Quelle:** `docs/concepts/projektkonzept.pdf` (Mechanik) + `docs/concepts/nexuskonzeptblatt.pdf` (UI/Hot-Seat).  
**Freeze:** Branch `prototype` = spielbarer Stand vor diesem Redesign (NEXUS 2.1).  
**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug.

## Setting

Spieler = Stadtteilmanager (Testgebiet). Geheimes **Wahlversprechen** statt alter Rollenziele. Wer am Ende laut eigenem Versprechen führt → Bürgermeister.  
Hot-Seat, 2–3 Spieler, ein Gerät — bleibt. **LAN/WLAN-Multiplayer:** erst nach Verlassen von Hot-Seat (Gate), nicht in diesem Zyklus.

## Präsentation / Board

- **Default-Theme:** Tageslicht (`data-theme="light"` / `nexus-theme` Default `light`). Toggle = **Nachtstadt** (eigene Palette), kein invertiertes Chrome.
- **Board:** Landnutzung lesbar (Typ vor Owner-Stroke); Parks/Wasser nur **Deko**, keine neuen Feldtypen. Kein WebGL, kein Foto-Board.
- **Nacht:** Fenster/Lichter nur nach öffentlichen Regeln (kein Leak lokaler Geräte); Handoff/Reveal dimmt das Board.
- **Investor-Metrik** `moneyThroughput` = kumuliertes **Geld**, nicht Gesamtproduktion.
- **Verkehr:** Stub-Ertrag + Lesbarkeit; optional **+1 Komfort** beim Bau des Verkehrsfelds.

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
| `residential` | Produziert Bandbreite (Basis). Smart-Home-Upgrades über Geräte (bestehendes Device-Menü, Kosten auf 3 Ressourcen umbiegen). Nachbar-Bonus: optional später; MVP = nur eigenes Feld. |
| `traffic` | Stub: baubar, produziert wenig `money` oder `bandwidth`. Volle Mobilitätslogik = später. |
| `home` | Startfeld; Basis +1 aller 3 Ressourcen / Runde (wie früher Home). |

Beim Expand wählt der Spieler Typ; bei `energy`/`datacenter` zusätzlich die Variante.

## Was bleibt aus 2.1

- Hex Radius 3, Homes an Ecken, Adjacent-Expand
- Hot-Seat / Role-Reveal / Handoff
- Cloud vs lokal bei Geräten (lokaler Anteil → `security`)
- Offen / Proprietär Standard + 1:1-Handel (Ressourcen = die 3 neuen)
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
