# NEXUS — Ziel-Design (Post-Playtest)

**Quelle:** `docs/concepts/projektkonzept.pdf` (Mechanik, Konzeptausbau nach Playtest — Basis der neuen Versionen) + `docs/concepts/nexuskonzeptblatt.pdf` (UI/Hot-Seat).  
**Playtest-Briefing (Prototyp-Stimme, Teaser/Todo):** [`docs/PLAYTEST_AENDERUNGSLISTE.md`](PLAYTEST_AENDERUNGSLISTE.md) — Interview + Konzeptausbau; bei Konflikt gewinnt **diese** Datei.  
**Freeze:** Branch `prototype` = spielbarer Stand vor diesem Redesign (NEXUS 2.1).  
**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug. Wellen/Geschichte: [`CHANGELOG.md`](CHANGELOG.md) — kein Vertrag.  
**Concept-Review:** Tom hat die Defaults in `docs/UPDATE_CONCEPT.md` (Anhang B, §3.5, §9) akzeptiert. Akzeptierte Sätze stehen hier. Die Review-Datei bleibt Begründung — **kein** zweiter Vertrag.  
**Grafik-Nachzug (schlägt ältere Konzept-Defaults):** Straßen auf **Kanten**; `traffic` = Busbahnhof/Parkplatz/Parkhaus (**nicht** die Straße); WebGL-Stadt mit echten Volumen (Three.js, vendored), Gewerbe-/Hügel-Rand, Orbit-Kamera; Feld-Ausbau, Abriss nur wenn verbunden, Handel = Angebot.

**Overhaul 2** bleibt die Mechanik darunter, außer wo **UI Rework** sie ersetzt. Zahlen und Begründung: [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md).

Würfel sind raus. Produktion ist der feste Basisertrag des Gebäudes. Ein Ereignis kommt, wenn das sichtbare Risiko 8 oder höher ist, und öffnet direkt die Karte. Darunter passiert nichts.

**UI Rework (schlägt Overhaul 2, wo es widerspricht).** Branch `ui-rework`. Geheimhaltung ist aus. Hot-Seat bleibt die Reihenfolge an einem Gerät, nicht ein Versteck. Rollen, Ziele, Kassen und Fortschritt sind am Tisch sichtbar. Die Übergabe sagt nur „du bist dran“.

Sieg bleibt `computeRoleProgress`: **eine Punktart pro Rolle** (Öko / Verlässlichkeit / Finanz / Innovation / Image / Komfort), Ziel **10 Punkte**. Anzeige nur die eigenen Punkte. Punkte entstehen an der Ursache und fliegen zum Rollenchip — **kein RNG-Sieg**. Probezeit in **Tagen** (10 / 14 / 18); Direktsieg bei 10 nach vollem Tag, sonst meiste Punkte wenn die Tage aus sind.

**Feedback-Regel:** Jedes spielbare Element braucht Sinn und sichtbares Feedback (Icon, Partikel, One-Liner oder Brettänderung). Keine Feature-Leichen für Anfänger.

**Konter:** Skandal, Presse-Deal, Sabotage und Bürgerprotest können Progress drücken. Gezielter Punktverlust höchstens 1× pro Person und Tag. **Der letzte Siegpunkt (10) kommt nie aus Kontern** — Contest-Gewinne sind bei 9 gedeckelt.

Gestrichen: Assistenz/SAE-Leiter, offen/proprietär, Ausbau im Zug. **Abriss** wieder im Feldmenü (Netz muss verbunden bleiben). **Ein** Rechenzentrum pro Person (offen/geschlossen umschaltbar). Handel = Angebot mit beiden Kassen. Elektro-Linie +1 Image. Risiko zeigt Ursache und Schwelle. Kacheln: Icon, Name, Vorzeichen, Menge; Satz nur bei Halten.

## Setting

Spieler = Stadtteilmanager (Testgebiet). Geheimes **Wahlversprechen** statt alter Rollenziele. Wer am Ende laut eigenem Versprechen führt → Bürgermeister.

**Hot-Seat bleibt der Vertrag:** 2–6 Spieler, ein Gerät. **LAN/WLAN-Multiplayer:** erst nach Verlassen von Hot-Seat (Gate), nicht in diesem Zyklus — kein Spielprotokoll, kein WebRTC. Ein kleiner FastAPI-Prozess darf nur würfeln und Dateien ausliefern (`server/app.py`).

### Harte Kernregeln (nicht aufweichen)

- Rollen, Ziele, Kassen und Punkte sind am Tisch sichtbar. `role_reveal` zeigt alle Personen auf einmal. `handoff` ist nur „du bist dran“ und dimmt das Brett nicht.
- Nacht versteckt keine Rolle, keine Kasse und kein Ziel.
- Produktion **automatisch zu Zugbeginn**.
- Bandbreite aus Wohnen nur mit **eigenem** Datenzentrum.
- 2-Spieler: Metrik-Skalierung in `roles.js` bleibt; 5–6 Spieler leichte Hochskalierung von Handel/Zonen.
- Sieg = `computeRoleProgress`. Eine Punktart pro Rolle, 10 Punkte = 100 %. Sofort bei 10 nach voller Runde, sonst die meisten Punkte am Rundenlimit. Keine Spurensumme, **keine Catch-up-Regel**, kein Würfel-Gewinn.
- Geräte und Feld-Ausbau sind **öffentlich** (Cloud und lokal). Cloud vs lokal bleibt nur als Mechanik (Risiko, Upkeep, lokal %).
- Vanilla HTML/CSS/JS für Regeln und App-Chrome; **kein** React/Vue, keine Accounts, kein Spiel-Backend. Erlaubt ist nur der Würfelserver. Das **Distrikt-Board** darf eine vendored 3D-Engine (Three.js) oder Canvas nutzen — nur Präsentation, keine Regeln.

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
- **Verkehr:** Das Feld ist Parkplatz, Parkhaus (Solardach, Ladesäulen) oder Busbahnhof. Straßen, Haltestellen und Linien liegen auf dem Graphen. Nur das erste Verkehrsfeld gibt +1 Komfort.

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
| `energy` | `solar`: fester Basisertrag. `transformer`: stabile Produktion, kostet `money` pro Ertragseinheit (`TRANSFORMER_MONEY_PER_ENERGY`). Optional: Bau kann `environment` geben (Solar) oder kosten (Transformer). |
| `datacenter` | Pro Person **höchstens eines**. `insecure` (offen) günstig / Risiko. `secure` (geschlossen) teurer / sicher. Umschalten kostet Ressourcen. **Ohne eigenes DC:** Wohn-Bandbreite = 0. |
| `residential` | Produziert Bandbreite (Basis). Geräte (Kamera, Schloss, …) bleiben Gadgets im Device-Menü. **Feld-Ausbau** `upgradeLevel` 0–2 ist Monopoly-artig und sichtbar am 3D-Gebäude. Nachbar-Bonus: optional später; MVP = nur eigenes Feld. |
| `traffic` | Parkplatz, Parkhaus oder Busbahnhof. Erstes Feld +1 Komfort. Linien (Diesel/Elektro/erneuerbar): `mobility.js`. |
| `home` | Startfeld **Kontrollbüro**; Basis +1 aller 3 Ressourcen / Runde, plus +1 je `upgradeLevel`. |

Beim Expand wählt der Spieler Typ; bei `energy`/`datacenter` zusätzlich die Variante. UI: Typwahl **2×2**. Optional: empfohlenes Feld/Typ leuchtet aus den **eigenen** Engpässen (Ressourcen / Versprechen) — kein Leak fremder Privatinfos.

### Feld-Ausbau (alle Typen)

Ausbau ist nicht mehr im Zug (Logik bleibt für Smoke). Abriss ist im Feldmenü, wenn das Netz verbunden bleibt. Ein Feld ist Typ, Preis, Ertrag — auf der Kachel und am Haus.

### Abriss

Abriss im Feldmenü auf eigenen Nicht-Home-Feldern, wenn das Netz zum Kontrollbüro verbunden bleibt. Refund wie bisher.

### Handel = Angebot

Kein Sofort-Tausch. Spieler A bietet Menge gegen Menge, 1:1 auf einem Gerät. Beide sehen Gegenstand, Menge und beide Kassen, bevor sie ja oder nein sagen. Spieler B nimmt an oder lehnt ab. Ressourcen wechseln erst bei Annahme. Keine Multi-Resource-Deals. Kein Aufpreis, kein Rabatt: die getippte Menge ist die Menge.

### Offen vs. proprietär

Gestrichen. Jeder kann mit jedem handeln. Die Wahl hatte am Tisch keine Folge, die man vor dem Klick sah. `setStandardsChoice` ändert nichts mehr.

### Geräte / Karten

Keine neuen Geräte-IDs in diesem Zyklus; Loop über Feedback und Copy. Karten/Events: Effekte nur auf 3 Ressourcen + 4 Spuren + Risiko. `privacy` als Effect-Key ist tot (→ `security` / Risiko).

## Was bleibt aus 2.1

- Hex Radius 3 bei 2–3 Spielern, Radius 4 bei 4–6; Homes fair auf Hex-Ecken; Adjacent-Expand
- Hot-Seat / Role-Reveal / Handoff
- Cloud vs lokal bei Geräten als **Mechanik** (lokaler Anteil → `security`); Sichtbarkeit: alle eigenen Gadgets öffentlich
- Handels**angebot** (3 Ressourcen; Annahme/Ablehnung, kein Sofort-Tausch). Offen/proprietär **gestrichen**
- Innovationskarten + Ereignisse (Effekte nur noch auf 3 Ressourcen + 4 Spuren + Risiko)
- Linien mit Antrieb (Diesel/Elektro/erneuerbar); Assistenz/SAE **entfernt**

## Was bewusst fehlt (nicht bauen)

- Koalitionsregel UI
- Material-Transport über Karte
- Umweltsteuer als eigener Screen
- Amortisierung über Runden
- Public-fields / exclusive districts
- Autonomes Fahren / Assistenz-Leiter (SAE entfernt)
- Nachbarschafts-Smart-Home-Miete
- LAN/WLAN-Multiplayer bis Gate nach Hot-Seat
- Neue Geräte-IDs, neue Ressourcen, vierte Spur, neue Event-Engine
- Catch-up / Rubber-Band
- Zweite Tutorial-`turnPhase` (Overlay `data/tutorial.js` existiert; nicht erweitern zu einer Regelphase)

Event-Themen (Förderung, Engpass, Abgabe) höchstens später im **bestehenden** Effect-Schema — kein neuer Screen.

## Wahlversprechen (Rollen)

Sechs IDs: `climate`, `privacy`, `investor`, `visionary`, `networker`, `controller`. Figur, Rechnung und Stand sind für alle sichtbar. Schwellen: `nexus/js/data/roles.js`. Namen: [`CAST_22_9.md`](CAST_22_9.md).

## Agent-Ownership

Einmal in [`AGENTS.md`](../AGENTS.md). Nach JS/CSS: `?v=` in `index.html`.
