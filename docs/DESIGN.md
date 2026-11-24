# NEXUS — Ziel-Design (Abgabe)

**Diese Datei ist Vertrag.** Code und `docs/GAME.md` folgen ihr. Abweichungen = Bug. Wellen: [`CHANGELOG.md`](CHANGELOG.md).  
**Freeze:** Branch `prototype` = 2.1. Charaktere: [`CAST_22_9.md`](CAST_22_9.md).

**Grafik:** Straßen auf Kanten; WebGL Three.js vendored; Kenney-`.glb` unter `nexus/vendor/kenney/`.

---

## Setting

Hot-Seat **2–3** Personen, ein Gerät. Sechs Charaktere im Pool (Zufall). Rollen, Kassen, Ziele, Fortschritt **öffentlich**.  
Probephase: **12 Wochen** (3 Monate) oder **16 Wochen** (4 Monate). Setup-Hinweis: nur wer sein **Wahlversprechen** erfüllt, kommt als Bürgermeisterin in Betracht — deshalb zählen nur Punkte der eigenen Metrik.

---

## Sieg

- **10 Siegpunkte** der **eigenen** Metrik (`eco` / `trust` / `finance` / `innovation` / `image` / `comfort`).
- Check nach voller Woche; am Limit: höchste eigene Punktzahl; **Tiebreak = höheres Karma**.
- Contest/Skandal: der **10.** eigene Punkt kommt nicht aus Kontern (Cap bei 9).

### Metrik-Farben

| Key | Label | Farbe |
| --- | --- | --- |
| eco | Öko | Grün |
| trust | Verlässlichkeit | Rot |
| finance | Finanz | Gelb |
| innovation | Innovation | Weiß |
| image | Image | Blau |
| comfort | Komfort | Braun |

Spielerfarben (Rollenreihenfolge): Grün, Rot, Gelb, Weiß, Blau, **Dunkelbraun** (Heinz Kohle).

---

## Ressourcen

Genau 3: `energy`, `money`, `bandwidth` (Label **Daten**). Start 3/3/3.

---

## Karma (−5…+5)

Ersetzt Risiko. Start 0. Beeinflusst Event-Chancen zu Zugbeginn und Tiebreak.

| Karma | Event |
| --- | --- |
| −1…+1 | keines |
| ±2 | 25 % gut/schlecht |
| ±3 | 50 % |
| ±4 | 100 % |
| +5 | extremes Gut (große Ressourcenspende) |
| −5 | extremes Schlecht (Leak/Blackmail bei Siegversuch → 9 SP; solange −5 effektiver Malus) |

Ablehnen von Übertragung/Auftrags-/Event-Angeboten: **Karma −1** oder Ressourcenstrafe.

---

## Felder (15 + Home)

Bau-Tabs: **Strom / Geld / Daten / Sonstiges**. Katalog: `nexus/js/data/build-tiles.js` (autoritative Zahlen).

**WE-Annahmen (Balance):** `w_E = w_G = w_D = 1`; Karma ±1 ≈ 2 WE Oneshot. Synergie nur erwartet/gedeckelt (Fabrik-Nachbar, Großunt.-Kurve). Rollen A–D und Lanes nahe bei H≈8–12; Portfolios innerhalb ε_p (Park-Pakete früher/günstiger, Bulk-Pakete teurer — kein Best-in-Slot).

| ID | Kosten | Ertrag / Hinweis |
| --- | --- | --- |
| `energy-wind` | 2E 2G | +2E |
| `energy-nuclear` | 3E 5G 2D | +3E, Karma−1 |
| `energy-coal` | 2E 4G 1D | +3E, Karma−1 |
| `energy-solar` | 2E 2G 1D | +2E |
| `commerce-small` | 2E 2G | +2G |
| `commerce-large` | 3E 5G 2D | +3G (Reife-Kurve) |
| `commerce-factory` | 2E 3G 1D | +2G (+Wohn-Nachbar, Cap) |
| `commerce-recycle` | 2E 2G 1D | +1G +1E |
| `data-residential` | 2E 2G | +2D |
| `data-server` | 3E 5G 3D | +3D |
| `data-taxi` | 2E 2G 1D | +4G, Upkeep −1E −1D |
| `data-admin` | 2E 2G 1D | +2D, Karma+1 |
| `misc-park` | 2E 3G | — (kein Primary) |
| `misc-yard` | 2E 3G | +1G |
| `misc-station` | 3E 4G 2D | +1G +1D |

- Strom: Wind (eco), Atom (innovation), Kohle (trust), Solar (comfort)
- Geld: Fabrik (innovation), Kleinunternehmen (image), Großunternehmen (finance), Recycling (eco)
- Daten: Wohnen (image), Serverfarm (finance), E-Taxistand (comfort), Verwaltung (trust)
- Sonstiges: Lager (comfort+finance), Bahnhof (innovation+trust), Park (eco+image)

Kein Buslinien-System. Kein Datenzentrum-Limit / Offen-Zu / „Wohnen ohne DC = 0“.  
Ausbau eine Stufe. Abriss wenn Netz verbunden. Metrik-eigene Tiles im Menü **grün**. Aktionen mit SP zeigen Badge (Farbe + Anzahl).

**Nachbarschaft:** einmal/Zug neben Fremdem → Image-Flavor / Karma-Hooks laut State (kein altes Risiko-Shock).

---

## Dauerziele & Aufträge

Dauerziele (eigene Metrik): same3, build5, upgrade3, neighbor3, karma4/5 halten, trades3, gift1 — siehe `STANDING_GOALS`.  
Sonderaufträge: max 1 aktiv, Restwochen, Ablehnen kostet. Spenden unwiderruflich per Button.

---

## Tile-Übertragung

Angrenzend anfragbar. Eigentümer: **Schenken** (Geber +1 SP wenn Metrik passt) oder **Verkauf** zum Originalpreis. Ablehnen kostet.

---

## Stall-Handel (Hay Day)

- 3 öffentliche Slots pro Person („ich gebe / ich will“: Ressourcen und/oder 1 own-SP).
- Eigenen Zug: Slots beliebig setzen.
- Fremde Annahmen: max **2/Zug**, **sofort**, ohne Bieter-Bestätigung.
- Ersetzt den alten Partner-Bestätigungs-Handel.

---

## Handkarten

Limit 5. Typen u. a. Ressourcengeschenk, Umwandlung, Zufalls-Ausbau, Freifeld, Skandal (−1 SP), Imagepflege, Auftragsangebot. Details in Daten/State.

---

## Zug (Woche)

1. Karma-Event-Wurf  
2. Ernte automatisch  
3. Bau / Ausbau / Abriss / Karten / Stall / Übertragung  
4. Auftrags-Buttons  
5. Zugende → nächste Person; nach allen: Woche+1, Fristen, Siegcheck  

---

## Was bewusst fehlt

Koalition, Material-Transport, Online-Multiplayer, Leitstand-Geräte-Pfad, Catch-up, zweite Tutorial-Phase.

## Agent-Ownership

Siehe `AGENTS.md`. Regeln nur `state.js` (+ risk/mobility/projects/arc ohne DOM). Nach JS/CSS `?v=` in `index.html`.
