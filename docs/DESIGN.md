# NEXUS — Ziel-Design (Post-Playtest)

**Quelle:** `docs/concepts/projektkonzept.pdf` (Mechanik, Konzeptausbau nach Playtest — Basis der neuen Versionen) + `docs/concepts/nexuskonzeptblatt.pdf` (UI/Hot-Seat).  
**Playtest-Briefing (Prototyp-Stimme, Teaser/Todo):** [`docs/PLAYTEST_AENDERUNGSLISTE.md`](PLAYTEST_AENDERUNGSLISTE.md) — Interview + Konzeptausbau; bei Konflikt gewinnt **diese** Datei.  
**Freeze:** Branch `prototype` = spielbarer Stand vor diesem Redesign (NEXUS 2.1).  
**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug. Wellen/Geschichte: [`CHANGELOG.md`](CHANGELOG.md) — kein Vertrag.  
**Concept-Review:** Tom hat die Defaults in `docs/UPDATE_CONCEPT.md` (Anhang B, §3.5, §9) akzeptiert. Akzeptierte Sätze stehen hier. Die Review-Datei bleibt Begründung — **kein** zweiter Vertrag.  
**Grafik-Nachzug (schlägt ältere Konzept-Defaults):** Straßen auf **Kanten**; `traffic` = Garagen / E-Taxi-Station (**nicht** die Straße); WebGL-Stadt mit echten Volumen (Three.js, vendored), Gewerbe-/Hügel-Rand, Orbit-Kamera; Feld-Ausbau, Abriss nur wenn verbunden, Handel = Angebot.

**Overhaul 2** bleibt die Mechanik darunter, außer wo **UI Rework** sie ersetzt. Zahlen und Begründung: [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md).

Würfel sind raus. Produktion ist der feste Basisertrag des Gebäudes. **Risiko = Stadtdruck** (sichtbare Zahl + Top-Ursache Cyber/Netz, Schwelle **8**). Intern fließen Technik- und Stadtlast zusammen; am Tisch keine Vier-Spuren-Leiste. Ab 8 öffnet direkt die Ereigniskarte (Ursache/Gegensteuern auf der Karte). Darunter passiert nichts.

**UI Rework (schlägt Overhaul 2, wo es widerspricht).** Branch `ui-rework`. Geheimhaltung ist aus. Hot-Seat bleibt die Reihenfolge an einem Gerät, nicht ein Versteck. Rollen, Ziele, Kassen und Fortschritt sind am Tisch sichtbar. Die Übergabe sagt nur „du bist dran“.

Sieg bleibt `computeRoleProgress`: **eine Punktart pro Rolle** (Öko / Verlässlichkeit / Finanz / Innovation / Image / Komfort), Ziel **10 Punkte**. Anzeige nur die eigenen Punkte. Punkte entstehen an der Ursache und fliegen zum Rollenchip — **kein RNG-Sieg**. Probezeit in **Tagen** (10 / 14 / 18); Direktsieg bei 10 nach vollem Tag, sonst meiste Punkte wenn die Tage aus sind.

**Feedback-Regel:** Jedes spielbare Element braucht Sinn und sichtbares Feedback (Icon, Partikel, One-Liner oder Brettänderung). Keine Feature-Leichen für Anfänger.

**Konter:** Skandal, Presse-Deal, Sabotage und Bürgerprotest können Progress drücken. Gezielter Punktverlust höchstens 1× pro Person und Tag. **Der letzte Siegpunkt (10) kommt nie aus Kontern** — Contest-Gewinne aus Random-Events sind bei 9 gedeckelt. Random-Eventkarten geben keinen negativen Eigen-Rollenpunkt mehr (Presse/Protest/Strip bleiben).

**Hinterzimmer-Deal:** Event-Angebot (max. 1 aktiv). Geheim nur für die aktive Person (Ziel-Dock). Frist in Tagen; Erfolg = Ressourcen und/oder Rollenpunkt **ohne Contest-Cap (darf siegen)**; Fail = Punkt/Ressourcen privat. Handel selbst gibt keine Siegpunkte — nur solche Deals.

Gestrichen: Assistenz/SAE-Leiter, offen/proprietär, Ausbau im Zug. **Abriss** wieder im Feldmenü (Netz muss verbunden bleiben). **Ein** Rechenzentrum pro Person (offen/geschlossen umschaltbar). Handel = Angebot mit beiden Kassen. Risiko zeigt Ursache und Schwelle. Kacheln: Icon, Name, Vorzeichen, Menge; Satz nur bei Halten.

## Setting

Spieler = Stadtteilmanager (Testgebiet). Geheimes **Wahlversprechen** statt alter Rollenziele. Wer am Ende laut eigenem Versprechen führt → Bürgermeister.

**Hot-Seat bleibt der Vertrag:** 2–3 Spieler, ein Gerät. Sechs Charaktere/Rollen bleiben im Pool (Zufallsziehung). **LAN/WLAN-Multiplayer:** erst nach Verlassen von Hot-Seat (Gate), nicht in diesem Zyklus — kein Spielprotokoll, kein WebRTC. Ein kleiner FastAPI-Prozess darf nur würfeln und Dateien ausliefern (`server/app.py`).

### Harte Kernregeln (nicht aufweichen)

- Rollen, Ziele, Kassen und Punkte sind am Tisch sichtbar. `role_reveal` zeigt alle Personen auf einmal. `handoff` ist nur „du bist dran“ und dimmt das Brett nicht.
- Nacht versteckt keine Rolle, keine Kasse und kein Ziel.
- Produktion **automatisch zu Zugbeginn**.
- Daten aus Wohnen nur mit **eigenem** Datenzentrum; DC-Limit je 7 eigene Felder.
- 2-Spieler: Metrik-Skalierung in `roles.js` bleibt.
- Sieg = `computeRoleProgress`. Eine Punktart pro Rolle, 10 Punkte = 100 %. Sofort bei 10 nach voller Runde, sonst die meisten Punkte am Rundenlimit. Keine Spurensumme, **keine Catch-up-Regel**, kein Würfel-Gewinn.
- Geräte und Feld-Ausbau sind **öffentlich** (Cloud und lokal). Cloud vs lokal bleibt nur als Mechanik (Risiko, Upkeep, lokal %).
- Vanilla HTML/CSS/JS für Regeln und App-Chrome; **kein** React/Vue, keine Accounts, kein Spiel-Backend. Erlaubt ist nur der Würfelserver. Das **Distrikt-Board** darf eine vendored 3D-Engine (Three.js) oder Canvas nutzen — nur Präsentation, keine Regeln.

## Präsentation / Board

- **Default-Theme:** Tageslicht (`data-theme="light"` / `nexus-theme` Default `light`). Toggle = **Nachtstadt**. Chrome/Himmel **teal** (grün-blau), kein reines UI-Blau.
- **Layout:** 3D-Canvas füllt den Viewport; Topbar, Dock und Tray liegen als halbtransparente Overlays darüber. Dock standardmäßig kompakte Schiene, ausklappbar („Ziele“). Toasts über dem Tray, nicht über Primärknöpfe. Schmale Breite: Dock als Sheet.
- **Board-Stack:** WebGL-Stadt mit **Three.js r158** (`nexus/vendor/three.min.js` + vendored `GLTFLoader.js`), Szene in `nexus/js/board3d.js` (+ Look/Props/Kenney-Helfer). App-Shell bleibt HTML/CSS. `render.js` orchestriert HUD; das Canvas darf raycasten. Regeln nur in `state.js`. Offline: `python -m http.server` in `nexus/`. **Keine Voll-GLTF-Bibliothek:** erlaubt sind wenige gebakte Kenney-`.glb` (City Kit Commercial / Industrial / Suburban / Roads sowie ausgewählte Props aus Car Kit + Graveyard Kit, CC0) unter `nexus/vendor/kenney/…` — einmal laden, cachen, pro Feld clonen. Nachzug: `tools/fetch_kenney_props.ps1`. Minimal/Low bleiben Boxen/BoardKit; ab Medium Kenney-Meshes. Unkontrollierte Felder = kleine Suburban-/Industrie-Filler; Datenzentren = Commercial-Skyscraper. Fallback = bisherige prozedurale Volumen + Billboard-Sprites.
- **Board:** keine flachen Eurogame-Plättchen. Extrudierte Volumen, Z-Buffer nach Bildtiefe. **Ein** Hauptgebäude pro Spielkachel. Start = **Kontrollbüro**. Landnutzung lesbar (**Gebäudetyp vor Besitzfarbe**): Wohnen = Büro/Block (Commercial), Solar = Industrial-Solar, Trafo = Umspann/Industrie, Atom = Kühlturm/Tank (Industrial), DC = Halle, Fabrik/Unternehmen = Industrie/Commercial, Verkehr = Garagen / E-Taxi-Station, Park = Bäume, Werkstatt = Halle + Props. **Besitz:** klare Spielerfarbe auf der Pad-Fläche und leuchtender Rand — Kenney-Mesh-Farben unangetastet (kein Dach-Tint auf GLTF). **Straßen sind keine Kacheln:** ein geteiltes Netz auf den Hex-Kanten; Autos fahren Feld→Feld; Ampeln Präsentation. Unkontrollierte Felder dürfen schon bebaut/belebt aussehen. Untergrund = wählbares Biom (Gras/Wüste/Wasser, Pref `nexus-biome`) als große Platte mit Nebel/Kulisse — keine Catan-Wasserkacheln im Hex-Netz.
- **Kamera:** Zu Zugbeginn Leitstand der aktiven Person unten, Stadt voraus. Rechts-/Mittelziehen = Orbit, Linksziehen = Pan, Rad = Zoom; Polar-/Zoom-/Pan-Clamps, weiche Dämpfung, nicht unter den Boden. Native Kontextmenüs auf dem Board blockiert. Prefs: `nexus-cam-pitch`, `nexus-board-quality` (Auto / Qualität / Balance / Leistung), `nexus-biome`.
- **Look-Nordstern:** HexaUrbs — Look und Hex-Lesbarkeit, nicht Genre/Engine. Parks keine baubaren Zonen. Bebaubare Felder klar markiert; Picking auf flacher Boden-Hitbox.
- **Nacht:** dunkelblau/dunkelgrau mit genug Ambient und Mondlicht; Felder und Besitzfarben bleiben lesbar. Fenster/Laternen/Ampeln (emissive/Glow/Lichtpools, keine PointLights pro Laterne); Geräte-Gizmos öffentlich. Kein Leak von Rolle/Wallet/Versprechen. Handoff/Reveal dimmt das Board.
- **Motion = Lehre:** Shake, Ticks, Place-Pop, Produktion-Pulse/Flugpartikel, Handoff-Dim. Tokens `nexus/transitions.css`. First-turn: Copy + Pulse — **keine** `turnPhase` für Tutorial. **Anleitung** = Overlay (`data/tutorial.js`), optional, Spotlight auf echte UI. Rollen als Steckbriefe mit Avatar; Glossar Spur/Stufe/Prozent.
- **Investor-Metrik** `moneyThroughput` = kumuliertes **Geld**.
- **Verkehr:** Das Feld ist **Garagen** oder **E-Taxi-Station**. Keine Buslinien, keine Haltestellen, keine Linienbusse. Nur das erste Verkehrsfeld gibt +1 Komfort. **E-Taxi:** je Ernte +2 Geld und +1 Komfort, kostet 1 Energie + 1 Daten; Taxis nur am Stand (4er-Bucht), nicht im Fließverkehr. **Präsentation:** Filler-Pkw grau. Straßenrand-Taxistand (Bank) später — Hook offen, nicht spielbar.

## Ressourcen (genau 3)

| Key | Label | Kurz |
| --- | --- | --- |
| `energy` | Energie | Energie |
| `money` | Geld | Geld |
| `bandwidth` | Daten | Daten |

Start: 3 von jeder. Keine anderen Wallet-Keys. Alte Keys (`data`, `compute`, `hardware`, `connectivity`) sind **tot**. Intern bleibt der Key `bandwidth` (Kompatibilität); am Tisch heißt die Ressource **Daten**.

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

`ZONE_TYPE_KEYS = ["residential", "energy", "datacenter", "commerce", "traffic", "park", "workshop"]` (+ `home`).

| Typ | Varianten / Regel |
| --- | --- |
| `energy` | `solar`: **2** Energie fest, `environment` +1 beim Bau und (gedeckelt) bei der Ernte. `transformer`: **3** Energie fest, kostet `money` pro Einheit (`TRANSFORMER_MONEY_PER_ENERGY`), `environment` −1 nur beim Bau. `nuclear` (**Atom**): **5** Energie fest, hohes Risiko (`riskOnBuild` + laufend), `environment` −2 beim Bau. |
| `datacenter` | Produziert Daten. Limit: **1 DC je 7 eigene Felder** (`DC_TILES_PER = 7`, Anzeige „x/y · je 7 Felder“). `insecure` (offen) günstig / Risiko. `secure` (geschlossen) teurer / sicher. Umschalten kostet Ressourcen. **Ohne eigenes DC:** Wohn-Daten = 0. |
| `residential` | Produziert Daten (Basis), nur mit eigenem DC. Geräte bleiben Gadgets. **Feld-Ausbau** `upgradeLevel` 0–1. |
| `commerce` | Geld. `factory` (**Fabrik**): Basis + **+1 Geld je angrenzendem Wohnfeld**. `enterprise` (**Unternehmen**): Reife **5→3→1** je weiterem Unternehmen; Aufbau die ersten zwei Ernten **1→3→5** (gedeckelt auf die Reife). |
| `traffic` | `garage` (**Garagen**): kein Ressourcen-Primary. `taxi` (**E-Taxi-Station**): +2 Geld / +1 Komfort je Ernte, −1 Energie −1 Daten. Erstes Verkehrsfeld +1 Komfort. Keine Linien/Haltestellen. |
| `park` | Grünfläche: +1 Komfort / +1 Umwelt beim Bau, kein Ressourcen-Ertrag. |
| `workshop` | Werkstatt: einmaliger Geräte-Rabatt (`workshopDiscountPending`), +1 Image beim Bau. |
| `home` | Startfeld **Kontrollbüro**; Basis +1 aller 3 Ressourcen / Runde, plus +1 je `upgradeLevel`. |

Beim Expand: **Zwei-Layer-Baumenü** (Daten mit drittem Schritt). Layer 1 = 2×2 (Energie / Geld / Daten / …). Layer 2 = baubare Felder unter dem gewählten Tab (Energie: Solar/Umspann/Atom; Geld: Fabrik/Unternehmen; Daten: Wohnen + RZ-Hub; …: Garagen/E-Taxi/Park/Werkstatt). **Daten:** Wohnen → RZ-Hub → Layer 3 mit gestapelten Tabs **Offen / Geschlossen** (Kosten/Risiko/Ertrag, Tap baut). Zurück-Pfeil je eine Ebene. Optional: empfohlener Tab/Typ leuchtet aus den **eigenen** Engpässen — kein Leak fremder Privatinfos.

**Nachbarschaftsdruck:** Baust du direkt neben ein fremdes Feld, einmal pro Zug: du +1 Image, jeder angrenzende fremde Besitzer +1 Risiko (`riskShock`). Toast/Hinweis beim Handoff. Keine Miete, keine Koalition.

### Feld-Ausbau (alle Typen)

Ausbau ist nicht mehr im Zug (Logik bleibt für Smoke). Abriss ist im Feldmenü, wenn das Netz verbunden bleibt. Ein Feld ist Typ, Preis, Ertrag — auf der Kachel und am Haus.

### Abriss

Abriss im Feldmenü auf eigenen Nicht-Home-Feldern, wenn das Netz zum Kontrollbüro verbunden bleibt. Refund wie bisher.

### Handel = Angebot

Kein Sofort-Tausch. Spieler A bietet Menge gegen Menge, 1:1 auf einem Gerät. Beide sehen Gegenstand, Menge und beide Kassen, bevor sie ja oder nein sagen. Spieler B nimmt an oder lehnt ab. Ressourcen wechseln erst bei Annahme. Keine Multi-Resource-Deals. Kein Aufpreis, kein Rabatt: die getippte Menge ist die Menge. **Kein Rollenpunkt aus dem Handel selbst** — nur über Hinterzimmer-Deals.

### Offen vs. proprietär

Gestrichen. Jeder kann mit jedem handeln. Die Wahl hatte am Tisch keine Folge, die man vor dem Klick sah. `setStandardsChoice` ändert nichts mehr.

### Geräte / Karten

Keine neuen Geräte-IDs in diesem Zyklus; Loop über Feedback und Copy. `privacy` als Effect-Key ist tot (→ `security` / Risiko).

**Stadtakte (Hand):** Limit **5**. Drei Arten — Ressourcen bleiben Kasse/Brett, Karten sind Hebel:

| Art | Spiel | Wirkung |
| --- | --- | --- |
| **Briefing** | Sofort | Effekte auf 3 Ressourcen / 4 Spuren / Risiko. Kein Refund der eigenen Kosten-Ressource. |
| **Mandat** | Aktivieren | Track am Spieler (sichtbar). Fortschritt durch Bau/Ausbau; Abschluss = Belohnung. |
| **Druckstück** | Ziel wählen | Anderer Spieler wählt **zahlen/abgeben** oder **+Risiko**. Kein blinder Diebstahl. Contest-Caps bleiben (kein 10. Punkt aus Konter). |

**Ausschreibungen (Markt):** 3 offene **Briefings**; Kauf = sofort ausspielen (Preis nach Kategorie).  
**Ziehen:** 1× pro Bauphase eine Akte in die Hand, wenn unter Limit.  
Risiko-8-Events bleiben Tisch-Events; Grants können Akten in die Hand legen.

## Was bleibt aus 2.1

- Hex Radius 3; Homes fair auf Hex-Ecken; Adjacent-Expand
- Hot-Seat / Role-Reveal / Handoff
- Cloud vs lokal bei Geräten als **Mechanik** (lokaler Anteil → `security`); Sichtbarkeit: alle eigenen Gadgets öffentlich
- Handels**angebot** (3 Ressourcen; Annahme/Ablehnung, kein Sofort-Tausch). Offen/proprietär **gestrichen**
- Stadtakte (Briefing/Mandat/Druckstück) + Ausschreibungen + Ereignisse
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
- Leitstand-Geräte-Progressionspfad (Pitch: `docs/PITCH_LEITSTAND_PFAD.md`) — nicht in diesem Zyklus
- Catch-up / Rubber-Band
- Zweite Tutorial-`turnPhase` (Overlay `data/tutorial.js` existiert; nicht erweitern zu einer Regelphase)

Event-Themen (Förderung, Engpass, Abgabe) höchstens später im **bestehenden** Effect-Schema — kein neuer Screen.

## Wahlversprechen (Rollen)

Sechs IDs: `climate`, `privacy`, `investor`, `visionary`, `networker`, `controller`. Figur, Rechnung und Stand sind für alle sichtbar. Schwellen: `nexus/js/data/roles.js`. Namen: [`CAST_22_9.md`](CAST_22_9.md).

## Agent-Ownership

Einmal in [`AGENTS.md`](../AGENTS.md). Nach JS/CSS: `?v=` in `index.html`.
