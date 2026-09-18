# NEXUS — Update-Konzept (Review-Begründung)

**Status:** Tom hat die Review akzeptiert (Defaults Anhang B / §3.5 / §9). Akzeptierte Vertrags-Sätze stehen in `docs/DESIGN.md`. **Diese Datei ist kein Vertrag** — nur Begründung, Gap-Matrix, Ankreuz-Protokoll. Nicht gegen DESIGN oder gegen Toms Grafik-Nachzug ausspielen.

### Gates (dieser Branch)

| Gate | Inhalt | Stand |
| --- | --- | --- |
| 1 | Hygiene + First-turn-Copy | **shipped** — Geld-Throughput, privacy/efficiency auf Spuren, Coupon/DC-Hints |
| 2 | Art-Pfad A + Stadt-Lesen + Layout | **shipped, korrigiert** — steilere Aufsicht, Straßen auf Kanten, Verkehr = Busbahnhof/Parkplatz, metropolitan infrastructure |
| 3 | Motion-Lehre | **shipped** — Shake, Place-Pop, Ticks, Handoff-Dim, Coach-Kachel |
| 2b | Bau-Feedback + Kartentext | **shipped** — Expand zeigt Ertrag/Spuren/Warnungen; Handkarten clampen |
| 4 | Pfad-B Bitmap-Sprites | **nicht in diesem Zyklus** — geometrische Stadt-Sprache statt WebGL/Fotos |
| 5 | Event-Pass | **nicht in diesem Zyklus** |

**Korrektur (Tom, verbindlich in DESIGN):** Verkehrskacheln sind **keine Straßen**. Straßen liegen auf den **Kanten** jedes Felds. `traffic` = Busbahnhof oder Parkplatz mit Ladestationen. Kamera steiler von oben; Art metropolitan, nicht dörflich. Extrudierte SVG-Blöcke, Acker-Rand, Feld-Ausbau, Abriss-wenn-verbunden, Handel = Angebot.

**Nicht mehr als Vertrag lesen:** §3.2 Default „Score-Hint + sichtbare Straße“, §6.3 `traffic` = Asphalt-Hex, Wasser-Catan als Board-Rand. DESIGN und der Grafik-Nachzug schlagen diese Sätze.

Rollback: Tag `nexus-main-pre-overhaul` / Branch `backup/main-pre-overhaul`.

**Branch-Ziel:** `main` (Post-Playtest). Branch `prototype` bleibt Freeze NEXUS 2.1.  
**Stand der Analyse:** Code `main` @ `8f74c77` (Review-Zeitpunkt); Graphic-Oneshot danach auf `main`. Konzept-PDFs in `docs/concepts/`. **Nachzug (Tom):** [HexaUrbs](https://store.steampowered.com/app/3563120/HexaUrbs/) (Steam, HidingDev Games) als visuelle/Game-Feel-Referenz — Look und Hex-Lesbarkeit, nicht Genre oder Engine. Details: Abschnitt 6.1a.

---

## Executive Summary

NEXUS hat den **Regel-Kern des Post-Playtest** bereits im Code: drei Ressourcen, vier Wertungsspuren, Zonen-Varianten, Datenzentrum-Gate, geheime Wahlversprechen, Hot-Seat-Schild, Produktion zu Zugbeginn, SAE/Standards/Handel. Das ist spielbar, aber ** paletten- und feedback-arm**: das Board sind flache SVG-Hexes mit Resource-Icons und Würfel-Balken, Dark Mode ist umgekehrtes Chrome statt Stadt bei Nacht, und mehrere Systeme existieren nur als Stub oder Altlast (Verkehr, Effizienz-HUD, `privacy`-Effekte, Investor-Metrik).

Das **Projektkonzept** (`docs/concepts/projektkonzept.pdf`) und **DESIGN.md** sind sich beim Kern einig. Die großen Extra-Systeme des Konzepts (Koalition, Material-Transport, Umweltsteuer-Screen, Amortisierung, exklusive/öffentliche Felder, autonomes Fahren als Layer) sind in DESIGN bewusst **nicht zu bauen**. Empfehlung: das so lassen. Spaß und Verständlichkeit kommen nicht von einem zweiten Regelbuch, sondern von **lesbarem Board, klaren Reaktionen, erstem Zug der erklärt, und ein paar dünnen Loops die schon existieren**.

**Stärkste Empfehlungen (Default, bis Tom widerspricht):**

1. **Kein neues Framework, kein 3D-Engine, kein Backend.** Vanilla bleibt. Grafik über CSS/SVG (optional später Canvas-Licht), nicht WebGL.
2. **Grafik-Pfad A zuerst** (Tag-Palette, Zonen-Landnutzung, Wasser/Parks als Board-Sprache), **Pfad B** (illustrierte Dächer) erst nach Art-Entscheidung. Pfad C nur wenn B nicht reicht. **Look-Nordstern:** HexaUrbs + Referenzfoto (helle Hex-Stadt, Parks, Dächer) — **nicht** HexaUrbs als Echtzeit-3D-Builder kopieren.
3. **Dark Mode = Nachtstadt**, nicht Invert. Default-Theme nach dem Art-Pass auf **Tag** drehen (`data-theme="light"`), Nacht bleibt Option. HexaUrbs ist Tag-first; Nacht bleibt NEXUS-eigen (Hot-Seat).
4. **Motion nur als Lehrer:** illegale Aktion shake, Ressourcen-Ticks, Spur-Änderung, Produktion-Pulse, Handoff/Reveal. Spectacle (Karten-Tilt, Partikel) nachrangig. Tokens aus `nexus/transitions.css` / Skills `transitions-dev` + `transitions-polish`. Regeln bleiben in `nexus/js/state.js`.
5. **DESIGN-„fehlt“ bleibt fehlt** (Koalition, Transport-Layer, Umweltsteuer-UI, Amortisierung, Public/Exclusive, Autonomie-Layer, Nachbar-Miete). Höchstens Event-Karten-Themen, keine neuen Screens.
6. **Verkehr nicht zum Mini-Game machen**, aber aus dem Stub holen (Ertrag + 1–2 Geräte-Hooks, damit Visionär/SAE lesbar ist).
7. **Hygiene vor Spectacle:** Investor-Metrik `moneyThroughput` zählt aktuell Gesamtertrag; Effizienz-HUD hängt in der Luft; Karten/Events schreiben noch `privacy`.
8. **Lehre vor Tiefe:** erster Zug (Startcoupon, DC-Gate, Solar-Würfel) braucht Onboarding-Beats, kein Tutorial-Modus-Framework.
9. **Hot-Seat-Schild und öffentliche Ausrichtung bleiben hart.** Nacht-Look darf lokale Geräte nicht verraten.
10. **Umsetzung erst nach Review-Gates in Abschnitt 8.** Diese Datei allein ändert nichts am Spiel.
11. **Hot-Seat bleibt der Vertrag.** Gleiches-WLAN/Netz ist eine Design-Gabel (Abschnitt 3.5), kein kleines Feature — Default **A jetzt + C als späteres Gate**.

---

> ### Review erledigt
>
> Tom hat die Defaults akzeptiert. Orchestrator hat die akzeptierten Sätze nach `docs/DESIGN.md` übernommen. `prototype` bleibt Freeze 2.1. Offene Fragen ohne Tick (Effizienz-HUD, Gleichstand-Tie-Break, Event-Pass, 2p-`tradePartnerRatio`-Härte, Art-Quelle Pfad B) bleiben **Review-only** — nicht still in DESIGN erfinden.
>
> Ankreuz-Protokoll (unverändert als Record): [Anhang B](#anhang-b--entscheidungs-defaults-eine-seite-zum-abzeichnen) · [§3.5 Netz](#35-lokales-netz--gleiches-wlan--review-block) · [§9](#9-offene-fragen-an-tom).

### Ankreuz-Konvention

| Zeichen | Bedeutung |
| --- | --- |
| `[x]` | **Default** — gilt, bis du es austrägst und etwas anderes ankreuzt. |
| `[ ]` | Alternative in **diesem** Zyklus (Hot-Seat, vanilla, `main`). |
| `[ ] später / nach Hot-Seat` | **„Umsetzen, aber erst wenn wir von Hot-Seat weg sind.“** Nur bei Systemen, die an ein Gerät / Shield / Handoff hängen. Nicht bei Hygiene, First-Turn-Copy, Palette A, Metrik-Bugs. |

---

## 1. Zweck, Publikum, Verhältnis zu den Vertragsdateien

### 1.1 Wozu diese Datei

Diese Datei ist die **akzeptierte** Planung + Entscheidungsliste — kein zweites Regelbuch. Vertrag = `docs/DESIGN.md`.

### 1.2 Publikum

- Tom — Review ist erledigt (Protokoll Anhang B / §3.5 / §9)
- Agents, die danach einzelne Phasen umsetzen (Ownership wie in `docs/AGENT_PLAN.md` / `AGENTS.md`)
- Nicht: Spieler-Handbuch. Dafür bleiben `docs/GAME.md` und UI-Texte zuständig.

### 1.3 Verhältnis zu den anderen Docs

| Datei | Rolle jetzt | Was diese Datei darf / nicht darf |
| --- | --- | --- |
| `docs/DESIGN.md` | **Vertrag.** Code und `GAME.md` folgen ihr. | Review-Begründung hier. Akzeptierte Sätze sind übernommen. Diese Datei nicht gegen DESIGN ausspielen. |
| `docs/GAME.md` | Ist-Regeln, die der Code tun *soll* laut DESIGN | Nur lesen, wenn DESIGN unklar war. Nach Code-Änderungen später nachziehen, nicht hier. |
| `docs/AGENT_PLAN.md` | Parallel-Ownership, Phasen-Haken. Phase 1 done. | Nicht umgehen. Neue Arbeit = neue Phase *nach* Review, gleiche Datei-Grenzen. |
| `docs/concepts/projektkonzept.pdf` | Playtest-Nachbau: Feldtypen, 3 Ressourcen, Spuren, Systemideen, Setting | Quelle für Abschnitt 2 und 7. Wo DESIGN „fehlt“ sagt, gewinnt DESIGN. |
| `docs/concepts/nexuskonzeptblatt.pdf` | UI/Hot-Seat NEXUS **2.1** (fünf Ressourcen, creme/light) | UI-Referenz für Hot-Seat-Fluss, nicht für aktuelle Ressourcen. |
| HexaUrbs (Steam `3563120`) | Externe Look-/Feel-Referenz (Tom, Nachzug) | Stehlen: Hex-Lesbarkeit, Land-use, Parks/Wasser, Tile-Drop-Charme. Nicht: 3D-Engine, Sandbox, fehlende Ressourcen, Steam-Produktion. |
| `AGENTS.md` / `.cursor/rules/nexus.mdc` | Hard constraints | Jede Empfehlung hier respektiert: Logik nur `state.js`, UI nur `render.js`, keine neuen Deps, DE-UI, `?v=` später, kein Commit von Spielcode in diesem Auftrag. |

**Konfliktregel bleibt:** DESIGN schlägt diese Datei, GAME und Bauchgefühl. Wenn ein Vorschlag DESIGN bricht, steht er ausdrücklich als **DESIGN-Änderung (braucht Tom)** — nicht als stilles „machen wir mit“.

### 1.4 Was „akzeptiert“ heißt

- Tom hat Anhang B, §3.5 und §9-Defaults akzeptiert.
- Orchestrator hat die akzeptierten Sätze nach `docs/DESIGN.md` geschrieben.
- `prototype` unangetastet. Offene Unticks bleiben hier, nicht im Vertrag.

---

## 2. Ist-Stand: Code vs DESIGN vs Projektkonzept

### 2.1 Was im Code steht (Post-Playtest `main`)

**Einstieg:** `nexus/index.html` (Script-Reihenfolge: `data/*` → `icons.js` → `roles.js` → `state.js` → `render.js` → `main.js`, Cache-Buster `?v=18`). Kein npm, kein Bundler.

**Regelkern in `nexus/js/state.js` (kein DOM):** Setup 2/3 Spieler, Längen 15/20/25, Start 3× Energie/Geld/Bandbreite, Homes auf drei Ecken (`nexus/js/data/constants.js` `HOME_POSITIONS`), Adjacent-Expand, Startcoupon `freeZoneClaims: 1`, Phasen `role_reveal` → … → `produce` → ggf. `event` → `build` → `handoff`. `isHotSeatShield` = Reveal oder Handoff. Produktion auto zu Zugbeginn (`beginHarvestAllSimultaneous` / `completeHarvestAll`, Timer in `main.js`). Solar würfelt `PRODUCTION_DICE`; Transformer stabil, kostet `TRANSFORMER_MONEY_PER_ENERGY`. Residential-Bandbreite **0** ohne eigenes Datenzentrum. Cloud-Upkeep in Bandbreite; ohne Zahlung Cloud-Effekte aus. Handel 1:1, blockiert bei ungleichem Standard. SAE 0–5 braucht `v2x` oder `charging_network`. Sieg: `computeRoleProgress` ≥ 100 % nach voller Runde, sonst höchster Prozent nach letzter Runde.

**Versprechen in `nexus/js/data/roles.js` + Auswertung `nexus/js/roles.js`:** IDs `climate | privacy | investor | visionary | networker | controller`. Labels sind Versprechen (z. B. Umweltversprechen), Alignments öffentlich (Umwelt, Sicherheit, …). 2-Spieler-Skalierung nur für `tradeVolume`, `blockedTradesCaused`, `standardsBonusVolume`.

**Daten:** 11 Geräte in `nexus/js/data/devices.js` (Cloud/lokal, Spezial an Zonentyp), 12 Ereignis-Typen in `nexus/js/data/events.js`, 14 Innovationskarten in `nexus/js/data/cards.js`. Hex-Geometrie `nexus/js/data/tiles.js` (Radius 3, pointy-top SVG).

**UI in `nexus/js/render.js` + `nexus/style.css`:** SVG-Distrikt, Zoom/Pan, HUD Wallet + Risiko + Effizienz + Ziel-%, Dock mit Versprechen + Score-Tracks + Standards, Kartenfächer, Modals (Setup, Expand, Home/Geräte, Trade, Event, Reveal, Handoff, Public Player, Ende). Oberfläche Deutsch. Theme `localStorage` `nexus-theme` (Default **dark**), UI-Größe `nexus-ui-scale`.

**Motion, die schon existiert** (`nexus/transitions.css` + Teile von `style.css` / `render.js`):

- Motion-Tokens (`--duration-*`, `--ease-smooth-out`, …) und `prefers-reduced-motion`
- Number pop-in (`.t-digit-group`) auf Wallet/Runde/Risiko
- Modal open/close (`.t-modal`)
- Toast-Stack (`.t-stack`)
- Kartenfächer-Hover (`.t-avatar-group`)
- Theme-Toggle (`.t-toggle`)
- Hex `tile-pulse` wenn erntereif, `gacha-spin` Nadel auf Produktionsbalken, Harvest-Stagger `TILE_SPIN_MS` 900 / `HARVEST_STAGGER_MS` 120
- **Kein** Error-Shake, kein Spur-Pop, kein Tag/Nacht-Board, kein Place/Remove-Pop der Gebäude

**Board-Look jetzt:** flache Polygone, Füllfarbe = `ZONE_TYPE_COLORS` (gedämpftes Salbei/Sand/Graublau), Strich = Spielerfarbe, Icon = Resource-Stroke aus `icons.js`, unten Würfel-Balken. Leere Felder gestrichelt. Hintergrund Radial-Verlauf, kein Wasser, keine Parks, keine Dächer. `HEX_SHADOW_DY: 8` ist ein winziger Drop-Shadow, keine Isometrie.

**Hot-Seat-Sichtbarkeit (stimmt mit `docs/GAME.md`):** öffentlich Name, Alignment, Standard, SAE, Zonenzahl, Cloud-Geräte (`getPublicPlayerView`). Privat Ressourcen, Spuren, Hand, Versprechen-Details, lokale Geräte, Risiko. Shield blendet Wallet/Ziele auf „–“.

### 2.2 Was DESIGN verlangt und der Code grob erfüllt

| DESIGN | Code | Drift |
| --- | --- | --- |
| 3 Ressourcen, Start 3 | `RESOURCE_KEYS`, `START_RESOURCES` | Alte Keys tot in Logik; CSS/Icons hängen `data/compute/hardware/connectivity` noch mit |
| 4 Spuren, Sieg = Versprechen | `player.scores`, `computeRoleProgress` | Endscreen zeigt Rollenname — nach Gameover ok |
| Energy solar/transformer | Varianten + Würfel / Geldkosten | Transformer `environment: -1` beim Bau; Solar `+1` |
| DC insecure/secure + Gate | `riskOnBuild: 2` unsicher; Gate in `produceForZone` | DC selbst produziert auch Bandbreite (`primaryBase: 1`) — DESIGN betont vor allem das Gate |
| Residential Bandbreite; Smart-Home über Geräte; Nachbar optional später | Gate ja; Geräte am Home; **kein** Nachbar-Bonus | wie DESIGN-MVP |
| Traffic Stub | `primaryBase: 1` money | Geräte `v2x` / `charging_network` brauchen Traffic-Zone — Loop existiert, Ertrag/Lesbarkeit dünn |
| SAE money+bandwidth | `getSaeUpgradeCost` | plus Energie; Netz-Rabatt −1 Bandbreite |
| Hot-Seat / Reveal / Handoff | Phasen + Modals | Alignment öffentlich in Turn-Chips — laut GAME gewollt |
| Events/Karten auf 3 Ressourcen + 4 Spuren + Risiko | größtenteils | Rest `privacy` und `efficiency` (siehe Gaps) |
| 2p-Skalierung | drei Metriken | `tradePartnerRatio` unskaliert (bei 2p oft 100 % nach einem Handel) |

### 2.3 Was das Projektkonzept will (über DESIGN hinaus)

`docs/concepts/projektkonzept.pdf` (identisch mit Upload `projektkonzept_b364.pdf`, 2 Seiten):

- Solar vs Transformator; Umweltpunkte möglich — **in DESIGN+Code**
- DC unsicher/sicher; ohne DC kein Datenzugriff — **in DESIGN+Code** (als Bandbreiten-Gate)
- Wohnen: Smart-Home; **optional Nachbarn nützen / Miete** — DESIGN: nicht bauen
- Verkehr inhaltlich offen, mit Mobilitätsschicht — DESIGN: Stub, Autonomie-Layer nicht bauen
- 3 Ressourcen, 4 Spuren, geheimes Wahlversprechen, Bürgermeister — **Kern gebaut**
- Systemideen: Transport, Umweltsteuer, Risiko, Amortisierung, Event-Breite (Steuern, Inflation, Hacking, …), exclusive/public fields, autonomes Fahren zwischen Tiles, **Koalition** bei knappem Vorsprung, **starker Erklärungsfokus**

`docs/concepts/nexuskonzeptblatt.pdf` (4 Seiten, pixelbasiert, Text nicht extractable): UI von **NEXUS 2.1** — creme/light, fünf Ressourcen im HUD, Rollen noch „Datenschützerin / Netzwerker“, Geräte-Grid, Expand-Plus, Event-Dilemma, Zielbalken, Standards, Handfächer. Der **Hot-Seat-Fluss** ist im Redesign übernommen; das **Chrome-Look** der Blätter ist heller und näher am Referenzfoto als der aktuelle Dark-Earth-Look auf `main`.

### 2.4 Gap-Matrix

Legende: **ok** = gebaut und vertragskonform · **dünn** = existiert, Spaß/Lehre schwach · **alt** = Überbleibsel 2.1 · **fehlt-DESIGN** = absichtlich nicht bauen · **fehlt-Konzept** = im PDF, von DESIGN gestoppt · **visuell** = Regel ok, Lesbarkeit/Look nicht

| Thema | Konzept | DESIGN | Code | Empfehlung (Default) |
| --- | --- | --- | --- | --- |
| 3 Ressourcen / 4 Spuren / Versprechen-Sieg | ja | Vertrag | ok | behalten |
| Solar vs Transformer | ja | Vertrag | ok, visuell dünn | Art + Score-Feedback |
| DC-Gate | ja | Vertrag | ok, Lehre dünn | First-turn Beat |
| Traffic | offen | Stub | dünn | leicht anheben, kein Layer |
| Nachbar-Smart-Home / Miete | Idee | fehlt | — | **never** (jetzt) |
| Transport / Material auf Karte | Idee | fehlt | — | **never** |
| Umweltsteuer-Screen | Idee | fehlt | — | **never** als Screen; Event-Thema ok |
| Amortisierung über Runden | Idee | fehlt | — | **never** |
| Public / exclusive Felder | Idee | fehlt | — | **never** (Radius 3 zu eng) |
| Autonomes Fahren als Layer | Idee | fehlt | SAE-Zahl + 2 Geräte | SAE lesbar machen, kein Tile-Traffic |
| Koalition | Idee | fehlt | — | **never** |
| Risiko | ja | bleibt | ok, HUD-only | Motion + Nacht-Lesbarkeit |
| Events wirtschaftlich/politisch | breit | auf 3+4+Risiko | 12 Typen, IT-lastig | **defer** Inhalt, Engine nicht anfassen |
| Erklärungsfokus | explizit | implizit | Hints/Toasts, kein Coach | **implement** Lehre-Motion + Copy |
| Hot-Seat Shield | Konzeptblatt | Vertrag | ok | hart lassen; Nacht testen |
| Board = Stadt | — | — | visuell Gap vs Foto | **implement** Art-Pfad A→B |
| Dark = Nacht | — | Theme localStorage | Invert-Chrome | **implement** Night-Look |
| Effizienz-Punkte | 2.1-Klima | nicht mehr Kern | HUD + Peak-Load + Karten | **implement** aufräumen oder an Spur koppeln |
| `privacy`-Effekt-Key | 2.1 | tot | Karten/Events → Risiko | **implement** Hygiene |
| `moneyThroughput` | Investor-Geld | Metrik in roles | = `cumulativeProduction` (alles) | **implement** echte Geldsumme |
| 2p `tradePartnerRatio` | — | Skalierung erwähnt | unskaliert | **implement** prüfen |
| Innovation auto-draw | Konzeptblatt „jede Runde“ | bleibt | `maybeAutoDrawInnovation` | ok |
| Illegales Bauen | — | — | Button disabled, kein Shake | **implement** Shake (UI) |
| 3D-Stadt-Engine | Foto-Vibe | verboten (kein Framework) | — | **never** |

---

## 3. Game-Design: Spielbarkeit und Spaß

Jedes Thema: **dafür / dagegen / Alternative / Default.** DESIGN-Kern (geheime Versprechen, Shield, Produktion, DC-Gate, 2p-Skalierung, Sieg = Rollenfortschritt) wird **nicht zur Disposition** gestellt, nur geschärft.

### 3.1 Systeme, die DESIGN als fehlend markiert

#### Koalitionsregel (UI + Endspiel-Deal)

- **Dafür:** PDF will knappen Vorsprung nicht rein atomar auflösen; 3p-Sozialdruck; Seminar-Thema Politik.
- **Dagegen:** Hot-Seat-Deal auf einem Gerät ist peinlich oder leaked (wer das Modal sieht); bricht „höchste % gewinnt“; neuer Screen, neue Ownership, Playtest-Zeit. DESIGN verbietet es.
- **Alternative:** Bei Gleichstand sichtbare Tie-Break-Regel (z. B. niedrigeres Risiko, dann weniger Zonen) — kleine DESIGN-Änderung, keine Koalition.
- **Default: never.** Gleichstand später als Einzeiler in DESIGN, nicht als Deal.

Ankreuzen (Koalition hängt am Hot-Seat — Deal auf einem Bildschirm leaked):

- [x] nicht bauen (Default, DESIGN „fehlt“)
- [ ] nur Gleichstand-Tie-Break (kein Deal)
- [ ] später / nach Hot-Seat — Koalitions-UI, wenn jede Person ein eigenes Gerät hat

#### Material-Transport über die Karte

- **Dafür:** Smart-City-Logistik, Board bekommt Routen.
- **Dagegen:** Radius-3-Hex + 15–25 Runden verträgt kein Pathfinding-Mini. Explosion in `state.js`, Lehre tot. DESIGN verbietet es.
- **Alternative:** Event „Lieferengpass“ (−Geld oder −Energie), Traffic-Feld thematisiert Logistik ohne Tokens auf Kanten.
- **Default: never** als Layer; **defer** höchstens 1–2 Events.

#### Umweltsteuer als eigener Screen

- **Dafür:** politischer Hebel, Umweltversprechen spürbar für alle.
- **Dagegen:** eigener Screen = Regeln + UI + Balance. Steuer, die nur den Umwelt-Spieler freut, ist kingmaking.
- **Alternative:** Event „CO₂-Abgabe / Förderung“ mit Spend-or-Score, trifft alle, kein extra HUD.
- **Default: never** Screen; Event-Thema **defer** in Event-Pass.

#### Amortisierung über Runden

- **Dafür:** teure sichere DC / Transformer fühlen sich nach Investition an.
- **Dagegen:** versteckter Zukunftsnutzen ist genau das, was Erstspieler nicht lesen. Buchhaltung in State, schlechte Lehre. DESIGN verbietet es.
- **Alternative:** höhere Sofortkosten, klarer Sofortertrag (ist schon das Transformer-Modell: Geld jetzt, Energie jetzt).
- **Default: never.**

#### Public fields / exclusive districts

- **Dafür:** first-come Parks/Wasser wie im Referenzbild; Territorium.
- **Dagegen:** 37 Hexes, 3 Homes an Ecken — Exclusive macht Start-RNG unfair. Public braucht Neutral-Owner-Regeln.
- **Alternative:** visuell Parks/Wasser **ohne** Regel (leere Hexes = Grün, Ring = Wasser).
- **Default: never** als Regel; **implement** als Grafik.

#### Autonomes Fahren als eigener Layer

- **Dafür:** Visionär-Fantasy, SAE wird Ort statt Zahl.
- **Dagegen:** Token-Bewegung zwischen Tiles = zweites Spiel. DESIGN: SAE bleibt Zahl; Traffic Stub.
- **Alternative:** Traffic-Feld + V2X/Ladenetz sichtbar; SAE-Stufe als Icon am Home; Event Ausweichmanöver bleibt Dilemma.
- **Default: never** Layer; Traffic **leicht anheben** (3.2).

#### Nachbarschafts-Smart-Home-Miete

- **Dafür:** PDF-Idee, Networker/Investor-Fleisch.
- **Dagegen:** DESIGN MVP = nur eigenes Feld. Adjazenz-Graf + Miete + Hot-Seat-Info („wer profitiert?“).
- **Alternative:** später, nach stabilem First-Turn; dann eigene DESIGN-Klausel.
- **Default: never** in diesem Update-Zyklus.

### 3.2 Systeme, die existieren, aber dünn wirken

#### Verkehr (`traffic`)

- **Dafür aufwerten:** sonst ist der vierte Feldtyp nur „Geld 1“; Visionär braucht Traffic-Geräte für SAE; Board-Foto hat Straßenringe.
- **Dagegen voll ausbauen:** Mobilitäts-Sim. DESIGN sagt Stub.
- **Alternative A:** Ertrag `money: 1` + `comfort` oder `image` +1 beim Bau (Score-Hint wie Solar). **B:** zweite Variante (Bus vs. Logistik) — schon DESIGN-nah, mehr Expand-UI. **C:** nur Grafik (Asphalt-Hex), Regel unverändert.
- **Default: A** (kleiner Score-Hint + sichtbare Straße). Varianten = DESIGN-Änderung, nur wenn Tom will.

#### Geräte-Loop (Cloud vs lokal)

- **Dafür schärfen:** Kernlehre IoT; Upkeep + Risiko + Privacy-Shield existieren.
- **Dagegen neue Geräte:** 11 Stück, Home-Modal ist schon ein Grid; mehr = Scan-Lähmung.
- **Alternative:** keine neuen IDs; **Feedback** (Pips, Nacht-Fenster nur Cloud öffentlich), Copy Cloud/lokal in einem Satz, Shield-Event sichtbarer Toast.
- **Default:** keine neuen Geräte; Feedback + Copy. Extra-Gerät nur wenn eine Rolle nachweislich nicht 100 % erreichen kann (offen, Playtest).

#### Handel + Standards

- **Dafür:** Networker/Controller leben davon; Blockade zählt für Controller.
- **Dagegen mehr Trade-UI:** 1:1 reicht; Multi-Resource-Deals sprengen Hot-Seat (Partner sitzt nicht am Modal).
- **Alternative:** nach Fehlversuch Shake + Toast „Proprietär blockiert“ (Lehre). 2p: `tradePartnerRatio`-Stufen senken oder nach erstem Trade nicht 40 %-Sprung.
- **Default:** UI-Feedback ja; Regel-2p-Tuning ja (kleine roles.js-Änderung, DESIGN erwähnt Skalierung schon); keine neuen Trade-Formen.

Ankreuzen nur die **gleichzeitige** Trade-UI (Hot-Seat-Kopplung); 2p-Skalierung / Shake sind Hygiene, kein „nach Hot-Seat“:

- [x] 1:1-Modal auf einem Gerät behalten (Default)
- [ ] später / nach Hot-Seat — Partner bestätigt auf dem eigenen Gerät

#### Ereignisse

- **Dafür mehr Stadtpolitik:** PDF-Liste (Steuern, Genehmigung, Inflation, Hacking).
- **Dagegen Deck aufblasen:** 12 Typen, Gewichte in `EVENT_DECK`; jedes Event = Balance × 6 Rollen.
- **Alternative:** 3–5 Karten *ersetzen* oder *hinzufügen* im bestehenden Schema (`choices[].effects`), keine neue Engine.
- **Default: defer** Inhalt auf Phase „Event-Pass“ nach Art/Lehre; Engine **never** neu.

#### Innovationskarten

- **Dafür:** Boom → grüne Karte koppelt Solar an Klima; Kategorien existieren.
- **Dagegen:** viele Karten sind einmal +Ressource, wenig Board-Veränderung; `privacy: 2` schreibt Risiko runter, Label lügt.
- **Alternative:** Keys auf `security` / Spuren säubern; 1–2 Karten mit `scoreHint` statt nur Wallet.
- **Default:** Hygiene-Pass **implement**; neue Karten **defer**.

#### Produktion / Würfel

- **Dafür so lassen:** Gacha-Nadel ist das stärkste vorhandene „Fun-Feedback“.
- **Dagegen mehr Dice:** Transformer existiert genau als Gegenmodell.
- **Default:** Animation polish (Stagger, Reduced Motion ist da); keine zweiten Würfel.

### 3.3 Harte Kernregeln — nicht aufweichen

| Regel | Warum sie Spaß/Lehre trägt | Nicht tun |
| --- | --- | --- |
| Geheimes Wahlversprechen | Sechs Strategien, Deduktion über Alignment + Board | Versprechen öffentlich machen; Spurensumme als Sieg |
| Hot-Seat-Schild | Ein Gerät, kein Leak | Reveal-Body im DOM lassen wenn Modal „zu“; Nacht-Fenster = lokale Pips |
| Produktion auto Zugbeginn | Rhythmus, weniger Klick-Arbeit | Zurück zu manuellem Abernten aller Hexes |
| Bandbreite aus Wohnen nur mit eigenem DC | Erzwingt die Smart-City-Frage „wo liegen Daten?“ | Gate weichspülen oder globalen DC erlauben |
| 2p-Metrik-Skalierung | Handel/Blockade sonst unmöglich/trivial | Skalierung löschen; im Gegenteil `tradePartnerRatio` nachziehen |
| Sieger = `computeRoleProgress` | DESIGN-Kern nach Playtest | Highscore-Summe, „meiste Zonen“ |

**Alignment öffentlich** (Turn-Chip „Umwelt · Offen“): GAME sagt das bewusst, Konzeptblatt auch („nur Titel sichtbar“). Behalten. Wer das als zu leaky sieht, ist eine **DESIGN-Frage an Tom** (Abschnitt 9).

Ankreuzen nur für die **Hot-Seat-gekoppelten** Kernregeln (Produktion, DC-Gate, 2p-Skalierung, Sieg-% bleiben unberührt):

- [x] Shield + geheime Versprechen-Details + Handoff-Ritual **jetzt** hart lassen (Default)
- [ ] Alignment-Wort im Chip reduzieren (nur Farbe)
- [ ] später / nach Hot-Seat — Shield/Handoff durch per-Client-Fog ersetzen; Versprechen-UI neu schneiden

### 3.4 Catch-up, Endgame, Kingmaking

- **Ist:** Sofortsieg ab 100 % nach voller Runde; sonst höchste %. Kein Rubber-Band.
- **Dafür Catch-up:** Trailing-Spieler in 20 Runden aufgeben sonst.
- **Dagegen explizite Catch-up-Regel:** belohnt Falschen, bricht Versprechen-Treue.
- **Alternative:** Events treffen Reiche härter (Überproduktion gibt’s schon); sichtbare %-Lücke nur privat (schon so).
- **Default:** keine Catch-up-Regel. Endgame-Spannung über **sichtbaren Runden-Ticker + private %**, nicht über Almosen.

### 3.5 Lokales Netz / gleiches WLAN — Review-Block

Das ist eine **Design-Gabel**, kein Feature-Ticket. Heute: ein Gerät, `isHotSeatShield`, Reveal/Handoff, private lokale Geräte, Nacht-Leak-Regeln, Gerät-weitergeben-Chrome, geheime Versprechen in einem DOM. `AGENTS.md` / DESIGN: **kein Online-Multiplayer**, kein Backend, solange niemand fragt. Du fragst jetzt — also entscheiden, **nicht** stillschweigend WebRTC einziehen.

Ursprungsidee (oder Erinnerung) war oft **vernetztes** Mehrspiel, nicht nur Hot-Seat. Sobald zwei Browser denselben State teilen, kippen Shield, Handoff, Public-vs-Privat, Handel-Modal, Koalition, sogar welche Dächer nachts leuchten.

**Vanilla bleibt:** kein npm, kein Server im Schulnetz als Default. Jede Netz-Option muss ohne neues Backend auskommen oder explizit ein späteres Backend-Gate sein (das wäre schon über C hinaus).

| | A Hot-Seat only (Vertrag) | B Nur Recherche | C LAN später planen | D Dünner Netz-Proto jetzt |
| --- | --- | --- | --- | --- |
| **Dafür** | Alles Gebaute (Shield, Reveal, Nacht) stimmt; Präsentation auf einem Beamer; kein Sync-Risiko | Klärt Machbarkeit für die Seminar-Doku, ohne Architektur zu zerlegen | Hält die alte Netz-Idee fest, **nachdem** Hot-Seat-Lehre sitzt; DESIGN kann ein „fehlt bis Gate“ bekommen | Frühes Gefühl für zwei Geräte; Show-Effekt „WLAN“ |
| **Dagegen** | Wer getrennte Laptops wollte, bleibt bei Gerät-Weitergeben | Produziert Papier, kein Spiel; kann Erwartung wecken | Ohne C-Text vergessen wir das Gate; mit C-Text müssen Agents es nicht *bauen* | Sync, Cheating, Schul-WLAN, Leak, doppelte UI — sprengt den Zyklus |

**Default: A jetzt + C als späteres Gate** (wer lieber nur Papier will: **B+C**). **D nicht empfohlen.**

Ankreuzen — **genau eine** Linie:

- [ ] **A** Hot-Seat only — Vertrag behalten, Netz-Idee **verwerfen**
- [ ] **B** Nur Recherche dieses Zyklus — Machbarkeitsnotiz, **kein** Protokoll, kein Code
- [x] **A+C** Hot-Seat **jetzt**; LAN/WLAN (gleiches WLAN) als **späteres Gate** nach Verlassen von Hot-Seat (Default)
- [ ] **B+C** Recherche jetzt, Implementierung erst nach Hot-Seat
- [ ] **D** Dünnen Lokalnetz-Prototyp **jetzt** starten — nicht empfohlen (siehe unten)

**Warum D jetzt falsch wäre:** `state.js` ist ein einzelner autoritativer Store im Tab. Zweites Gerät braucht Transport, Host-Autorität, Disconnect, desync, Replay. Ohne Server: WebRTC auf Schul-WLAN (mDNS/ICE oft tot), oder ein Laptop-Host, den niemand wartet. Cheating = DevTools am Client; Info-Leak = falsche View statt Shield. UI müsste **gleichzeitig** Handoff (ein Gerät) und Live-Board (zwei Geräte) können. Night-Look, lokale Pips, Hand, % — heute ein `isHotSeatShield`-Schalter; morgen `viewerId`. Das ist Logic+UI+Docs parallel, nicht „ein Socket“.

**Technische Skizze (nicht bauen):** gleiches WLAN, **kein** öffentliches Backend.

- **Host-autoritativ:** nur der Host ruft `Nexus.*` auf `state.js` auf; Clients schicken Intents, bekommen Views. Regeln nicht auf jedem Client neu würfeln (Produktion-Dice).
- **WebRTC DataChannel:** peer-to-peer, theoretisch ohne Server; in der Praxis STUN/Turn oder lokales `localhost`-Relay. Firewall/AP-Isolation in Schulen.
- **BroadcastChannel / `localStorage`-Events:** nur **gleicher Browser, gleiches Profil** — das ist kein WLAN-Multiplayer.
- **QR-Handoff:** State (oder Kurz-Save) als Code, Gerät wechseln — bleibt **sequentiell**, ersetzt Hot-Seat-Modal, ist kein Live-Board.
- **Eigenes WS-Mini-Backend:** widerspricht „kein Backend bis gefragt“; nur wenn Tom später ein Gate „Server erlaubt“ tickt (nicht A–C).

**Was am bestehenden Vertrag bricht** (muss vor D oder vor dem C-Implementierungs-Gate neu in DESIGN):

- `isHotSeatShield` / Phasen `role_reveal` und `handoff` — Ersatz: per-client private View, kein Vollbild-Dim für alle
- Geheime Versprechen-UI — nur auf dem Client der Person, nicht „Modal dann weitergeben“
- Lokale vs Cloud-Geräte — fremde Clients dürfen lokale Pips/Nachtfenster nicht ableiten
- Handel — Partner sitzt am **eigenen** Modal, nicht am selben
- Koalition — auf getrennten Geräten plötzlich spielbar (deshalb §3.1 „später / nach Hot-Seat“)

**Grafik / UI / Motion unter der Gabel:**

- **Hot-Seat (A):** Handoff-Ritual ist Lehre und Privacy (Dim, „Ich bin …“, Board leer). Night-Look muss lokale Fenster verstecken. Chrome für Gerät-Weitergeben.
- **Live shared Board (nach C/D):** Board bleibt sichtbar für alle (HexaUrbs-Stadt durchgehend); Fog nur auf HUD/Hand/Spuren/%. Place-Pop sieht der Nachbar live. Handoff-Modal stirbt oder wird zu „Du bist dran“-Toast auf **einem** Client. Reveal wird Split-Screen-unfähig — jede Person liest Versprechen allein vor Spielstart.

---

## 4. Wo Spaß noch herkommt — ohne DESIGN zu sprengen

Priorität: Loops die **schon State haben**, aber nicht *fühlen*.

### 4.1 Economy-Loops

- **Energie- pallette:** Solar (Varianz, Umwelt) vs Transformer (stabil, Geld, Umwelt−). Board muss die zwei Dächer unterscheiden (Grafik). Transformer-Zahl im Inspect („−1 Geld / Energie“) größer.
- **Geld:** Traffic + Handel + offener Standard-Bonus (`standardsBonusVolume`). Investor braucht **echte** Geldproduktion als Metrik (Bug/Gap: `readMetric("moneyThroughput")` liest `cumulativeProduction`).
- **Bandbreite:** Wohnen×DC, Kamera, Cloud-Upkeep-Sink. First-Turn: ohne DC zeigt Inspect „Bandbreite 0 — kein Datenzentrum“ statt leerer Balken.
- **Nicht:** vierte Ressource, Lagerhaus-Token, Transportkosten.

### 4.2 Information Hiding (schon das Spiel)

- Cloud-Pips am fremden Home, lokale unsichtbar: gut. **Nachts** gleiche Regel.
- Public-Player-Modal existiert — wenig entdeckt. Default: Turn-Chip-Klick behalten, einmalig Toast „Öffentliche Geräte ansehen“.
- Nicht: verdeckte Zonen, Fog of War (Board ist geteilte Stadt).

Ankreuzen (lokale Geräte / Public-View hängen am Hot-Seat-Schild):

- [x] Cloud öffentlich, lokal privat, Public-Modal — **jetzt** so lassen (Default)
- [ ] Public-Modal prominenter (Toast), Regeln unverändert
- [ ] später / nach Hot-Seat — echte per-Client-Fog statt Shield; Live-Board für alle, HUD privat

### 4.3 Erste Züge unterrichten

Ist: `table-hint` + Startcoupon-Zwang (`canEndTurn` false solange Coupon). Kein Coach, kein Overlay.

Default-Beats (Copy + Motion, **keine** neue Phase in state außer ggf. Flag `ui.coachStep` in `main.js`):

1. Reveal: Versprechen, 3 Unterziele, „andere sehen nur die Ausrichtung“.
2. Handoff: Gerät drehen, „Ich bin …“.
3. Produktion Home: drei Resource-Ticks (+1).
4. Coupon: Nachbarhex pulsiert, Modal Feldtyp; wenn Wohnen ohne DC → Warnung eine Zeile. HexaUrbs-Steal: der **erste platzierte Hex soll sich wie Stadt anfühlen** (Dach/Park-Sprache), nicht wie ein leeres Eurogame-Plättchen — ohne Sandbox-Freiheit (Coupon bleibt ein Pflichtzug).
5. Optional DC vs Solar als „klassische erste Wahl“ in Hint, nicht erzwungen.

Dagegen volles Tutorial-Kampagnen-Skript: Pflege + überspringbar + DE-Textmenge. Alternative: ein Blatt „Schnellstart“ außerhalb des Spiels für die Präsentation.

### 4.4 Rollen-Fantasy erhöhen (ohne neue IDs)

| Rolle | Ist-Loop | Fun-Hebel ohne DESIGN-Bruch |
| --- | --- | --- |
| climate | Umwelt-Spur, lokal %, grüne Karten | Solar-Dächer + Parks; Effizienz-HUD nicht als Fake-Ziel |
| privacy | Risiko runter, lokal %, Security-Spur | Shield-Toast; unsicheres DC visuell „offen“ |
| investor | Throughput, Trade, Zonen | Metrik-Fix; Geld-Ticks |
| visionary | SAE, lokale Geräte, Karten | SAE-Leiste am Home; Traffic-Feld sieht nach Straße aus |
| networker | Open-Streak, Partner, Bonusvolumen | Standard-Pill animiert; 2p-Stufen |
| controller | Prop-Streak, Monopole, Blockaden | Shake bei Block; Monopoly-Hex-Ring |

### 4.5 Was wir nicht „noch einbauen“ nur weil es geht

Persistenz, Accounts, Koalition (außer §3.1-Tick), React, Test-Framework, npm — weiter **nicht**, solange niemand fragt (`AGENTS.md`). Netz: **nicht stillschweigend** — nur nach Tick in [§3.5](#35-lokales-netz--gleiches-wlan--review-block).

**HexaUrbs-Genre nicht importieren:** kein Sandbox-Modus mit unbegrenzten Tiles, kein Scoring-by-adjacency als Sieg, kein „Stadt in Minuten ohne Ressourcen“. NEXUS bleibt Hot-Seat-Brettspiel mit Wallet, Versprechen und Shield. Der Charme kommt daher, dass **dieselbe Expand-Aktion** (adjacent, schon in `buyZone`) visuell wie ein Stadtviertel wächst — nicht daher, dass Expand sich wie ein City-Builder-Pinsel anfühlt.

---

## 5. Animation / Interaktion / visuelle Reaktion

Ziel: **Verstehen und Timing**, nicht Cutscene. Architektur: `main.js` merkt State-Diff nach `commit()`, `render.js` setzt Klassen. `state.js` liefert höchstens schon vorhandene Zeitkonstanten (`harvestAnimationMs`) — **keine** DOM-Keys, keine Animation-Flags als Regeln.

Skills (nur konzeptionell, nicht in diesem Auftrag anwenden): `transitions-dev` (32 Rezepte, `t-*`) und `transitions-polish` (Tokens, Open/Close-Asymmetrie, Reduced Motion). `nexus/transitions.css` hat Tokens + Modal/Digit/Toast/Toggle/Avatar/Stack schon im Projekt.

### 5.1 Katalog

Prio **L** = Lehre (hoch) · **F** = Fun/Spectacle · **S** = schon da

| Beat | Prio | Rezept (Skill) | Wo | Hinweis |
| --- | --- | --- | --- | --- |
| Illegal / disabled Aktion | L | Error-state shake (`12`) | Expand-Kosten, Trade-Block, SAE ohne Gerät, End-Turn mit Coupon | Jetzt: Button `disabled`, null Motion |
| Resource-Tick | L+F | Number pop-in (`02`) | Wallet | **S** auf Änderung; nach Harvest erzwingen, auch +0 überspringen |
| Erwartungswert `~` | L | Text swap (`04`) | `.expect` | jetzt hartes TextContent, kein Motion |
| Risiko-Meter | L | Card resize / width token | `.risk-meter::after` | **S** width 250ms; Farbe bei Sprung kurz `danger` |
| Spur Image/Komfort/Umwelt/Sicherheit | L | Number pop + kurze Bar | `#score-tracks` | jetzt tot beim Ändern |
| Versprechen-% | L | Digit / Ring | Goal-Pill | nur eigene, Shield aus. Live-WLAN: % nur auf eigenem Client → [ ] später / nach Hot-Seat |
| Produktion Hex | L+F | vorhandenes gacha + Pulse | SVG | **S**; Needle-Settle polish; Reduced Motion: sofort settle |
| Home +1/+1/+1 | L | Digit + Mini-Pings | Home-Hex | kürzer (`HOME_HARVEST_MS` 280) |
| Feld platzieren | L | Success small / scale 0.96→1 | neuer Hex | HexaUrbs-Steal: kurzer „Tile sitzt“-Pop; **kein** Confetti, kein Kamera-Orbit |
| Gerät bauen | L | Icon swap / pip appear | Home-Pips + Modal | Cloud-Pip sichtbar für andere erst nach Handoff |
| Gerät fehlt / Upkeep fail | L | Shake + Toast | Wallet Bandbreite | Copy „Cloud offline“ **S** im Log |
| Event-Karte | L | Modal (`06`) | `#event-modal` | **S**; Titel `texts reveal` (`18`) einmal |
| Innovationskarte ziehen | F | Fan stagger | `.card-fan` | **S** hover; Draw = eine Karte `is-enter` |
| Handoff | L | Modal + Board dim | `#handoff-modal` | Board-Inhalte schon geleert; Dim als Privacy-Cue. Live-WLAN: Ritual fällt weg → [ ] später / nach Hot-Seat |
| Role Reveal | L | Modal + staged list | `#role-reveal-modal` | Unterziele stagger (`18`); nie im Hintergrund render. Getrennte Geräte: privates Solo-Reveal → [ ] später / nach Hot-Seat |
| Tag/Nacht Theme | F+L | 400–500ms Farb-Lerp, kein Blur auf Theme | `data-theme` + Board-Klassen | nicht `filter: invert` |
| Toast-Log | L | Banner stack (`32`) | `#toast-stack` | **S** |
| Karten-Hover | F | Avatar group (`11`) | Hand | **S**; nicht auf Modal-Karten |
| Gewinn | F | Success check (`10`) | Endscreen | einmal, reduced-motion = skip |
| Skeleton | — | — | — | unnötig (kein Netz) |
| Card tilt 3D | F niedrig | `19` | — | **nicht** auf Hex-Board (Motion-Sickness + Touch) |

### 5.2 Reihenfolge (Teaching vs Spectacle)

1. Illegal shake, Coupon-Pulse, DC-Gate-Copy, Resource-Tick nach Harvest, Spur-Tick  
2. Handoff-Dim, Reveal-Stagger, Event-Modal-Titel  
3. Place-Pop, Pip-Appear, Nacht-Fenster  
4. Win-Check, Card-Fan Enter  
5. **Nicht:** Partikel, Bildschirm-Shake bei Boom, 3D-Tilt der Stadt, HexaUrbs-Kamerafahrt / Mesh-Drop aus einer Engine

### 5.3 Reduced motion

Bereits global in `style.css` / `transitions.css`. Neue Board-Lichter: sofortiger Zustand, keine Pulse-Loops. Gacha: Nadel auf Endposition ohne Spin.

### 5.4 Anti-Pattern

- `setTimeout` als Regel („nach 2s darfst du bauen“) in `state.js`
- Animation, die private Zahlen bei Shield zeigt
- Längere Harvest-Stagger als jetzt (900ms+): 3 Spieler × viele Hexes wird langweilig, nicht episch — eher **kürzen** als verlängern (`transitions-polish`: Harvest ist Repeat-Motion → eher `--duration-fast`)

---

## 6. Grafik-Overhaul: isometrische Tag-Stadt

### 6.1 Art Direction (Zielbild)

Referenzfoto: heller isometrischer Stadt-Sim (Sims / Cities: Skylines), **ein großer Hex-Distrikt**, Ringstraße, Wasser drumherum, Innenkern **Parks/Bäume**, Dächer **weiß / Türkis / Ocker / warmes Wohnen**, Tageslicht, weiche Schatten, kein UI-Chrome auf der Stadt.

**HexaUrbs** (Steam, Casual/Indie hex-grid city builder, „coming soon“, HidingDev Games) trifft dasselbe Board-Ideal näher als Cities: Skylines: **eine lesbare Hex-Stadt aus Land-use-Kacheln** (House, Residential, Commercial, Nature/Parks, Industrial, Water), Taghell, spielerischer Sim-Charme, Adjazenz als Schönheit. Steam-Text: Stadt in Minuten, **ohne Ressourcenverwaltung**, Scoring- oder Sandbox-Modus, 3D.

Das ist **Look-Ziel**, nicht 1:1-Karte und nicht Genre-Ziel. Spiel braucht weiter 37 logische Hexes, Owner-Ränder, Expand-`+`, Inspect. Die Stadt ist Skin + Lesesprache, nicht neues Grid.

NEXUS-2.1-Konzeptblatt: creme, flache Hexes, Icons — gut für UI-Chrome, schlecht als „Stadt“. `main` Dark-Earth ist noch weiter vom Foto **und** von HexaUrbs.

### 6.1a HexaUrbs — stehlen vs. nicht kopieren

Kurzrecherche (Steam Store `app/3563120`, nicht durchgespielt): relaxter minimalistischer **3D-Hex-City-Builder**, Singleplayer. Kacheln strategisch nebeneinander → „beautiful and thriving city“. Zwei Modi: Scoring (begrenzte Tiles, Meilensteine) und Sandbox (unbegrenzt). Wasser an Land → Strände/Flüsse/Seen. Tags u. a. 3D, hex grid, relaxing, city builder. Systemanforderungen nennen eine GPU — also Engine-Produkt, nicht Brett-HTML.

| Stehlen (für NEXUS-Board) | Nicht kopieren |
| --- | --- |
| Sofort-Scan: Zone = Landnutzung, nicht Icon-auf-Pappe | Echtzeit-Builder / Sandbox-Pinsel |
| Helle isometrische Dächer, Parks als eigene Sprache, Wasser als Rahmen | 3D-Engine, Kamerafahrt, Mesh-Dichte, Steam-Licht/Post |
| Tile-Drop fühlt sich nach „Stadt wächst“ an (Place-Pop, adjacent Expand gibt’s schon) | „Keine Ressourcen“ — NEXUS *ist* Energie/Geld/Bandbreite + Versprechen |
| Wenig Chrome **auf** der Stadt; Board darf der Star sein | HUD weglassen; Hot-Seat braucht Wallet/Ziele/Handoff |
| Parks/Natur und Wasser als Lesbarkeit, nicht als Spreadsheet-Zellen | Water/Nature als eigene **Regel-Zonen** (DESIGN: 4 Typen + home; Deko bleibt Deko) |
| Commercial/Industrial-Look als Inspiration für DC/Energie-Dächer | Deren Zonentypen oder Adjacency-Highscore als Sieg |

**Default:** HexaUrbs justiert Pfad A/B (helle Land-use-Stadt, Parks, Wasser, Dächer). Es **rechtfertigt weder WebGL noch** eine vierte/fünfte Feldklasse „Park/Wasser zum Bauen“. NEXUS bleibt vanilla HTML/CSS/JS, Hot-Seat, DESIGN-Zonen.

### 6.2 Palette (Vorschlag)

**Tag (Default nach Art-Pass):** Himmel kühles Hellblau, Wasser desaturated teal-green (wie Foto), Parks mehrere Grüntöne + Herbstakzente sparsam, Dächer zone-coded (nicht Spieler-coded). Spielerfarbe nur **Ring/Stroke** (Salbei/Sand/Rose bleiben identifizierbar).

**Nacht:** Himmel indigo, Wasser fast schwarz-grün, Straßen laternen-warm, Fenster warm-gelb, Parks dunkler, UI-Chrome **nicht** schwarz-auf-schwarz: HUD Glass dunkler, Text hell, Kontrast WCAG anstreben.

Nicht: Generic Dark (`#161410` Pappe) und Generic Light (`#f3eee4` Papier) als einzige Differenz.

### 6.3 Hex- / Zonen-Sprache

| Zone / Variante | Tag-Board | Nacht | Regel-Lesbarkeit |
| --- | --- | --- | --- |
| leer | Rasen / lichter Park, gestrichelte Parzelle | dunkles Grün, keine Fenster | `+` nur adjacent |
| home | kleines helles Gebäude, Pips | eigene Fenster; fremd nur Cloud-Fenster | Home-Click |
| residential | dichte helle/türkise Dächer | viele Fenster | ohne DC: kein Bandbreiten-Glow |
| energy solar | flache PV-blaue Flächen | schwaches Panel-Glühen, kein Grid | vs Transformer |
| energy transformer | Klotz, Kabel, ocker | Funkeln an Isolatoren, kein PV | Geldkosten im Inspect |
| datacenter insecure | Kiste, sichtbare Käfige | kaltweiße Lichter, „offen“ | Risiko |
| datacenter secure | geschlossener Block, gedämpft | wenig Licht, Schild-Icon | Security-Hint |
| traffic | Asphalt + Spurmarkierung | Straßenlaternen | Stub-Ertrag |
| Wasser (nur Art) | Ring außerhalb Radius 3 | Spiegel, keine Tokens | nicht bebaubar, kein State |
| Kern-Park (nur Art) | Bäume auf ungebauten Innenhexes | Kronen-Silhouette | leere Hexes, keine Neutral-Regel |

Owner: Stroke 3.5px bleibt (schon in CSS). Nicht ganze Fläche einfärben — sonst stirbt die Dach-Sprache. HexaUrbs-Lesen: **Typ vor Owner** (Dach sagt Wohnen/Energie/DC; Ring sagt wer). Umgekehrt bleibt NEXUS ein farbiges Risiko-Spiel statt einer Stadt.

### 6.4 UI-Chrome vs Board

Foto hat **kein** HUD. Spiel braucht welches. Trennung:

- Board = Stadt (Tag/Nacht)
- Chrome = frosted glass, Outfit/Fraunces dürfen bleiben (schon Google Fonts; kein npm)
- Karten bleiben analoge Blätter (Konzeptblatt), nicht Mini-Gebäude
- Zoom/Pan behalten (`main.js` Map-Gesten)
- HexaUrbs: Stadt ist der Star, Chrome minimal — NEXUS darf das Board so behandeln, muss aber Hot-Seat-HUD behalten

Default-Theme heute `dark` in `index.html` — nach Art-Pass **Tag als Default**, Nacht Toggle-Label **„Nacht“** statt „Hellmodus“ (der Label lügt schon semantisch: `js-theme-toggle` „Hellmodus“ bei Default Dark).

### 6.5 Wie weit Vanilla reicht (ohne 3D-Engine)

| Technik | Kann | Kann nicht | Risiko |
| --- | --- | --- | --- |
| CSS Variablen + Hex-Fills | Palette, Nacht umschalten, Laternen via `box-shadow` auf SVG | Echte 3D-Dächer, Kamerafahrt | niedrig |
| SVG Sprites (viewBox Gebäude) | Silhouetten, Parks, Wasser-Pfad ums Grid | Tausende Polygone wie im Screenshot | mittel (Dateigröße, Draw-Order) |
| Isometric CSS (`rotateX` + `rotateZ`) | Fake-3D des **ganzen** Grids | Touch-Pan bricht; Text/Hit-Areas leiden | hoch, **nicht** Default |
| Canvas 2D Overlay | Nacht-Licht, weiches Water | Muss mit SVG-Hit-Test synchron | mittel |
| WebGL / Three.js / Tile-Engine | Foto-/HexaUrbs-Nähe | Framework, Deps, Ownership-Bruch, Hot-Seat-Perf auf Schul-Tablet; HexaUrbs *ist* dieses Lager | **out** |
| Foto als Board-Background | sofort „wow“ | Hex-Hitboxes passen nicht, Varianten unsichtbar, Nacht unmöglich fair | verführerisch, **nein** als Spielfeld |

**Default:** SVG-Hex-Grid behalten (Hit-Test, Expand, Harvest). Stadtcharakter durch **Fill, Overlay-Gruppen, Rand-Wasser, Park-Patterns**. Kein CSS-Isometric-Transform des Playfields.

### 6.6 Drei Konzepte

#### A — Conservative CSS-Restyle

- Nur `style.css` + wenig `render.js` (Klassen `hex-residential`, `is-night`, Wasser-`<g>`).
- Palette Tag, Zonenfarben land-use, gestrichelte Leere → Rasen, Drop-Shadow etwas klarer, HUD Glass an Tag/Nacht.
- **Aufwand:** klein (eine UI-Datei + Tokens). **Risiko:** niedrig. **Foto-Nähe:** niedrig–mittel (liest als buntes Brett, nicht als Skylines).
- **Dafür:** schnell, kein Art-Pipeline, Reduced-Motion easy, Ownership UI-Agent.
- **Dagegen:** bleibt „Eurogame-Hex“, nicht Referenzfoto/HexaUrbs. Trotzdem der richtige erste Schritt (Palette + Land-use), weil HexaUrbs-Fidelity ohne Art-Sprites unehrlich wäre.

#### B — Illustrierte Tiles + SVG-Stadt

- Pro Typ/Variante 1 SVG-Sprite (Dach-Cluster), Park-Tiles für Leer, Wasser-Ring, Home-Gebäude. Repeat durch `use`/`<image>` oder inline Paths in `icons.js` / neue `nexus/js/data/art.js` (nur Markup, keine Regeln).
- **Aufwand:** mittel–hoch (Art + Slice + Nacht-Variante oder CSS-Filter + Fenster-Layer). **Risiko:** mittel (unleserliche Mini-Dächer bei Zoom-out; muss Inspect/Icon-Fallback halten). **Foto-/HexaUrbs-Nähe:** hoch, wenn Sprites Land-use und Dächer zitieren (nicht Steam-Meshes klauen).
- **Dafür:** einziges Verfahren, das HexaUrbs-Lesen ohne Engine erreichen kann. Varianten (Solar vs Trafo) endlich scanbar.
- **Dagegen:** jemand muss Dächer zeichnen (oder bewusst geometrisch stilisieren, nicht photobashen — Lizenz).

#### C — Hybrid Sprite-Board

- A als Boden (Land-use, Straßennetz-Overlay), B-Sprites nur auf *owned* Hexes, Canvas-Licht nachts, evtl. leichte Parallax-Bäume.
- **Aufwand:** hoch (zwei Pipelines, z-index, Performance 37×Sprite + lights). **Risiko:** hoch (Sync Zoom, Shield, Harvest-Spin auf Sprites). **Foto-Nähe:** theoretisch höchste.
- **Dafür:** späterer End-Look.
- **Dagegen:** zu viel für den nächsten Block; Harvest-Gacha auf Sprite unsicher.

#### Empfehlung

**A sofort nach Freigabe (Palette + Nacht-Semantik + Wasser/Park-Lesen), parallel Art-Entscheidung für B.**  
**B als zweiter Gate**, sobald 4–5 Sprite-Silhouetten stehen (Home, Wohnen, Solar, Trafo, DC, Traffic, Park).  
**C nicht** in diesem Zyklus.  
Foto nicht als `background-image` unter Hexes legen. HexaUrbs-Screenshots nicht als Tilesheet (Rechte + 3D-Look passt nicht auf flache Hit-Hexes).

Stilisierte geometrische Dächer (CSS/SVG polygons, 3 Töne Licht/Schatten) können B *ohne* Bitmap nähern — bevorzugen, wenn keine Illustration geliefert wird. Das ist der ehrliche HexaUrbs-Kompromiss unter Vanilla.

### 6.7 Dark Mode = Nacht (nicht Invert)

Konkret:

- `html[data-theme="dark"]` setzt `--sky`, `--water`, `--park`, `--lamp`, `--window` und eine Klasse `is-night` auf `.city-plane`.
- Hex-Fills wechseln; UI-Ink bleibt hell auf dunklem Glass.
- Straßenlaternen: kleine Circles auf Traffic + Hex-Kanten, `opacity` an Theme.
- Fenster: Rechtecke nur wo **öffentliche** Gebäudeinfo erlaubt (owned+cloud oder eigenes Home im eigenen Zug). **Keine** Fensterdichte = lokale Gerätezahl für Fremde.
- Toggle-Copy: „Nachtstadt“ / „Tageslicht“.
- Transition ~400ms Farben, kein Blur (Polish: Theme-Change hat keinen Blur-Token).

**Dagegen** separates „High-Contrast“ vs Nacht: wenn nötig dritter Pref `nexus-contrast`, nicht mit Nacht vermischen.

### 6.8 Accessibility, Colorblind, Hot-Seat bei Nacht

- Zonen nicht nur Farbe: Form (PV-Streifen, Asphalt-Linien, DC-Kasten) + Icon-Fallback bei Zoom-out.
- Spieler-Identität = Stroke + Turn-Chip, nicht Dachfarbe.
- Colorblind: Solar-blau vs Wasser-teal unterscheiden (Kante, nicht nur Hue). Ocker-Wohnen vs Transformer-Ocker formen-unterscheiden.
- Kontrast HUD ≥ 4.5:1; Nacht-Board darf atmosphärisch dunkler sein, Inspect-Text nicht.
- `prefers-reduced-motion`: keine blinkenden Fenster.
- Shield: Stadt darf als Silhouette bleiben, **Zahlen, Pips lokal, Hand, Spuren, %** weg. Nachtlichter nicht als Leak-Kanal.
- Touch: Hit-Area bleibt Hex-Polygon, nicht nur Mini-Dach.

Ankreuzen (Nacht-Leak und Shield-Dim sind Hot-Seat-Kopplung; **Palette/Tag-Default nicht**):

- [x] Nacht jetzt bauen, Fenster nur nach Public-Regeln, Shield dimmt das Board (Default)
- [ ] Nacht-Look, aber Board bei Handoff nicht dimmen (riskanter Leak)
- [ ] später / nach Hot-Seat — Board bleibt für alle beleuchtet; Fenster/Pips strikt `viewerId`, kein Vollbild-Handoff

### 6.9 Fonts / Deps

Google Fonts im `index.html` sind schon Netz-Request, keine npm-Dep. Art-SVGs lokal. **Kein** neues Bildformat-Framework.

---

## 7. Was am Projektkonzept noch Arbeit ist (Pädagogik, nicht Regelmonster)

Seminarfachprojekt Herbartgymnasium (`README.md`): IoT-Abwägung, kein Quiz.

### 7.1 Lernziele, die das Spiel schon tragen kann

- Cloud vs lokal (Kosten, Risiko, Upkeep, Sichtbarkeit)
- Offen vs proprietär (Handel, Streak, Blockade)
- Energie: volatil-grün vs stabil-gekauft
- Daten: ohne Infrastruktur keine Nutzung der Wohn-Daten
- Politik: ein Versprechen, mehrere Unterziele, keine Allzweck-Stadt

Das Update soll diese Sätze **sichtbar** machen (Board, Motion, Copy), nicht fünf neue Seminar-Kapitel Regeln.

### 7.2 Rollen / Versprechen

IDs beibehalten. Konzeptblatt-Namen („Die Datenschützerin“) sind 2.1. Post-Playtest-Namen (Umweltversprechen …) sind richtig. Präsentation: Alignment-Wörter als „Partei-Farbe“, Unterziele als „Wahlprogramm“.

### 7.3 Lehre / Präsentation

- Erklärungsfokus steht wörtlich im PDF — höchstes offenes Konzept-Soll neben Grafik.
- Schnellstart 60s für die Demo: Shield, Coupon, DC-Gate, Solar-Würfel, % ist nicht Summe.
- Nacht-Toggle als Show-Effekt in der Präsentation, **danach** Tag zum Spielen (Lesbarkeit).

### 7.4 Out of Scope (Konzept darf träumen, Update nicht liefern)

Koalition, Transport-Tokens, Steuer-Screen, Amortisations-Ledger, autonome Token auf Kanten, exclusive Bezirke, Online, KI-Gegner, 3D-Engine, englische UI, Regelbuch-PDF-Generator.

### 7.5 Wo Konzept, Foto und HexaUrbs sich treffen

Alle drei wollen **einen lesbaren Stadtteil**, kein Spreadsheet. Parks/Wasser dürfen ** paletten-pädagogisch** sein (Umweltversprechen „sieht“ Grün; HexaUrbs macht Nature/Water zu First-Class-Tiles). In NEXUS bleiben sie **Deko**, ohne Umwelt-Punkte für dekorative Parks (sonst DESIGN-neue Ertragsquelle). Der Seminar-Unterschied zu HexaUrbs: bei uns erklärt das Board eine **Abwägung** (Solar vs Trafo, unsicher vs sicher), nicht nur eine schöne Stadt.

---

## 8. Phasenplan (technisch, kein Kalender)

### 8.1 Review-Gates (Tom)

1. **Gate 0 — diese Datei:** Kasten oben, **Anhang B**, **§3.5 Netz**, §9. DESIGN unangetastet bis Orchestrator-Pass.
2. **Gate 1 — Hygiene + Lehre-Copy** (klein, reversibel). Smoke `Nexus.runSmokeCheck()`.
3. **Gate 2 — Art-Pfad A + Nacht-Semantik.** Screenshot Tag/Nacht, Shield-Check, Colorblind-Stichprobe.
4. **Gate 3 — Motion-Lehre** (Shake, Ticks, Place-Pop). Reduced-motion.
5. **Gate 4 (optional) — Art-Pfad B Sprites.** Erst nach 2–3 Sprite-Freigaben.
6. **Gate 5 (optional) — Event-/Traffic-Mini-Pass.** Nur wenn Gate 2–3 sitzen.

`docs/DESIGN.md` nur zwischen Gate 0 und 1, und nur Sätze die Tom will (z. B. Traffic-Score-Hint, Theme-Default Tag, Metrik-Fix ist Bugfix ohne DESIGN-Text).

### 8.2 Jetzt nicht tun

- Spielcode in diesem Vorschlags-PR außer dieser Datei
- `DESIGN.md` / `GAME.md` rewrite
- `prototype`-Branch
- npm, Tests-Framework, WebGL, Foto als Map, HexaUrbs-Engine/Sandbox
- Netz-Multiplayer-Code (WebRTC/Server) — außer Tom tickt §3.5-**D** (nicht empfohlen); **A+C** = nur DESIGN-Gate-Satz später, kein Code jetzt
- Koalition, Transport, Steuer-UI, Amortisierung, Public/Exclusive, Autonomie-Layer, Nachbar-Miete
- Neue Geräte-IDs, neue Ressourcen, vierte Spur
- Isometric CSS auf das Live-Grid
- Tutorial-Engine mit eigenem `turnPhase`

### 8.3 Vorgeschlagene Implementierungsreihenfolge *nach* Freigabe

Ownership wie immer: Logic `state.js`/`roles.js`, UI `render.js`/`main.js`/`style.css`/`index.html`, Data `js/data/*`, Docs separat. Nach JS/CSS: `?v=` hoch.

**P0 — Hygiene (Logic+Data+UI, klein)**  
`moneyThroughput` = kumuliertes **Geld**, nicht Gesamtertrag. `privacy`-Effects auf `security`/`risk` klarziehen, Effizienz: entweder HUD entfernen und Peak-Load auf `environment` oder Effizienz als abgeleitete Metrik in DESIGN nachtragen (Tom). CSS-Leichen 5 Ressourcen. 2p `tradePartnerRatio`. Smoke erweitern um DC-Gate-Assert (optional).

**P1 — First-turn Copy**  
Inspect-Texte DC-Gate, Coupon-Hint, Toggle-Label Nacht/Tag. Keine neuen Systeme.

**P2 — Grafik A**  
Land-use Fills, Wasser-Ring, Park-Leere, Owner-Stroke behalten, Theme-Variablen Himmel/Wasser, Default Tag, Nacht-Board ohne Leak. `render.js` Hex-Klassen nach `type`+`variant`.

**P3 — Motion Lehre**  
Shake, Harvest-Wallet-Force-Pop, Score-Track-Pop, Place-scale, Handoff-Dim. Tokens, nicht Ad-hoc-ms. Polish-Pass auf Gacha-Länge.

**P4 — Traffic lesbar**  
Grafik Asphalt + Laternen; optional DESIGN-Mini Score-Hint.

**P5 — Art B**  
Sprites / geometrische Dächer, Fenster-Layer, Zoom-out-LOD (Icon statt Dach).

**P6 — Event-Themen**  
3 Karten analog PDF (Förderung, Engpass, Abgabe) im bestehenden Effect-Schema.

Jeder Schritt einzeln commitbar, spielbar halten, Shield-Regression manuell (Reveal → Hintergrund leer).

Kein **P-Netz** in dieser Reihenfolge (Default A+C). Erst nach DESIGN-Gate „Hot-Seat verlassen“.

---

## 9. Offene Fragen an Tom

Nur **2, 2b und 16** plus die Extra-Kästchen **später / nach Hot-Seat** sind Gerät-Gabeln. **1, 3–5, 7–15** ohne dieses Kästchen = Hygiene/Art in diesem Zyklus. Koalitions-*Deal* steht in §3.1, nicht in Frage 6.

1. **Default-Theme:** Tag als Standard nach Art-Pass — ja/nein? (heute Dark.)
   - [x] ja, Tag nach Art-Pass
   - [ ] nein, Dark/Nacht bleibt Default
2. **Alignment öffentlich:** zu leaky für eure Playtests oder gewollt pädagogisch?
   - [x] öffentlich lassen (Default, GAME)
   - [ ] nur Farbe, nicht das Wort
   - [ ] Alignment geheim (DESIGN-Änderung)
   - [ ] später / nach Hot-Seat — Alignment-Leak neu bewerten, wenn jede Person ein eigenes Display hat
2b. **Gerät-weitergeben-Chrome** (Handoff-Copy, Dim, „Ich bin …“):
   - [x] Ritual **jetzt** behalten (Default, Lehre + Privacy)
   - [ ] Copy kürzen, Dim lassen
   - [ ] später / nach Hot-Seat — Chrome entfernen zugunsten Live-Board + „du bist dran“ nur lokal
3. **Effizienz-Punkte:** HUD streichen, an Umwelt koppeln, oder als fünfte versteckte Metrik behalten (Peak-Load, grüne Karten)?
4. **Traffic:** nur Skin, oder +1 Komfort/Image beim Bau (kleine DESIGN-Erweiterung)?
5. **Art-Quelle für Pfad B:** geometrische SVG-Dächer aus Code, oder liefert jemand Illustrationen? Fotobash vom Referenzbild (Rechte)?
6. **Gleichstand:** niedrigen Risiko-Tie-Break nachrüsten, oder 1. Platz teilen? (Koalitions-Deal = §3.1 inkl. später / nach Hot-Seat.)
7. **Event-Pass:** in diesem Zyklus oder nach der Präsentation?
8. **2p `tradePartnerRatio`:** Stufen aggressiv senken — ja?
9. **Investor-Metrik:** Bestätigung, dass Throughput **nur Geld** zählen soll (Code weicht ab).
10. **Präsentations-Demo:** Nacht-Wow wichtiger als Erstspieler-Lesbarkeit auf Beamer?
11. **Konzeptblatt-Creme-UI** vs **Foto-/HexaUrbs-Stadt:** Chrome creme lassen und nur Board zur Stadt machen, oder beides Richtung Sim-Look?
12. **Google Fonts:** offline-Fallback für Schul-Rechner ohne Netz — brauchen wir System-Stack-only?
13. **HexaUrbs-Gewichtung:** reicht Look-Steal (Land-use, Parks, Tile-Pop), oder soll Pfad B explizit „so scanbar wie HexaUrbs-Screenshots“ heißen (mehr Art-Aufwand)?
14. **HexaUrbs Nature/Water:** visuell ja, als baubare Zonen **nein** — bestätigt? (Default: Deko-only, DESIGN unverändert.)
15. **HexaUrbs-Nacht:** deren Store ist Tag-first. NEXUS-Nacht trotzdem bauen, oder Tag-Stadt priorisieren und Nacht später? *(Leak-Regeln = §6.8, nicht diese Art-Priorität.)*
16. **Lokales Netz / gleiches WLAN:** nicht hier duplizieren — **eine** Zeile in [§3.5](#35-lokales-netz--gleiches-wlan--review-block). Default dort **A+C**.

---

## Anhang A — Dateikarte (zum Abhaken in Reviews)

- Regeln: `nexus/js/state.js`, `nexus/js/roles.js`
- Daten: `nexus/js/data/constants.js`, `tiles.js`, `devices.js`, `events.js`, `cards.js`, `roles.js`
- UI: `nexus/js/render.js`, `nexus/js/main.js`, `nexus/js/icons.js`, `nexus/index.html`, `nexus/style.css`, `nexus/transitions.css`
- Vertrag: `docs/DESIGN.md` · Ist: `docs/GAME.md` · Plan: `docs/AGENT_PLAN.md`
- PDFs: `docs/concepts/projektkonzept.pdf`, `docs/concepts/nexuskonzeptblatt.pdf`
- Look-Ref (extern): [HexaUrbs](https://store.steampowered.com/app/3563120/HexaUrbs/) — nicht im Repo, nicht klonen

## Anhang B — Entscheidungs-Defaults (eine Seite zum Abzeichnen)

Konvention: `[x]` Default · `[ ]` Alternative · `[ ] später / nach Hot-Seat` = **„Umsetzen, aber erst wenn wir von Hot-Seat weg sind.“** Defaults austragen, wenn du etwas anderes willst.

**D1 — DESIGN-„fehlt“** (Transport, Steuer-UI, Amortisierung, Exclusive, Autonomie-Layer, Nachbar-Miete) — kein Hot-Seat-Kästchen:

- [x] nicht bauen
- [ ] einzelne Idee doch nachtragen (welche: ___ )

**D1b — Koalition** (Hot-Seat-Gabel, §3.1):

- [x] nicht bauen
- [ ] nur Gleichstand-Tie-Break
- [ ] später / nach Hot-Seat

**D2 — Grafik** (kein Hot-Seat-Kästchen):

- [x] A dann B, nicht C, kein WebGL, kein Foto-Board; HexaUrbs = Look/Lesen
- [ ] nur A
- [ ] A+C Hybrid trotz Risiko

**D3 — Tag/Nacht-Palette** (kein Hot-Seat-Kästchen; Leak = D3b):

- [x] Nachtstadt-Look; Default nach Art-Pass = Tag
- [ ] Dark-Chrome bleibt Default

**D3b — Nacht-Leak / Shield-Dim** (§6.8):

- [x] Fenster nach Public-Regeln, Handoff dimmt (Default)
- [ ] später / nach Hot-Seat — Live-Board beleuchtet, Fog nur HUD/`viewerId`

**D4 — Motion Lehre** (Place-Pop, Ticks, Shake = dieses Zyklus). Handoff/Reveal-Ritual:

- [x] Lehre zuerst, Tokens, kein state-DOM; Handoff-Dim **jetzt**
- [ ] später / nach Hot-Seat — Handoff/Reveal durch Live-Turn-Toast ersetzen

**D5 — Traffic** (kein Hot-Seat-Kästchen):

- [x] Skin + später optional Score-Hint
- [ ] nur Skin
- [ ] Stub unverändert

**D6 — Geräte/Karten:** keine neuen IDs vor Hygiene — [x] ja

**D6b — lokale vs Cloud-Sichtbarkeit** (§4.2):

- [x] Cloud öffentlich, lokal privat **jetzt**
- [ ] später / nach Hot-Seat — per-Client-Fog

**D7 — Catch-up:** keine neue Siegregel — [x] ja

**D8 — First-turn Copy+Pulse** (kein Hot-Seat-Kästchen) — [x] ja, keine Tutorial-Phase

**D9 — Kernregeln** Produktion, DC-Gate, 2p, Sieg-%: unverändert — [x] ja

**D9b — Shield, geheime Versprechen-UI, Handoff** (§3.3):

- [x] hart lassen **jetzt**
- [ ] später / nach Hot-Seat — ersetzen durch per-Client-Views

**D10 — Lokales Netz / gleiches WLAN** (§3.5, genau eine Zeile):

- [ ] A — Hot-Seat only, Netz verwerfen
- [ ] B — nur Recherche
- [x] A+C — Hot-Seat jetzt, LAN/WLAN späteres Gate (Default)
- [ ] B+C
- [ ] D — Proto jetzt (nicht empfohlen)

*Ende des Vorschlags.*
