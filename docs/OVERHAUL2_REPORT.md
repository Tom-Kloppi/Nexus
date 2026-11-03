# Overhaul 2 — Bericht

Stand: 3. November 2026, Europa/Berlin. Rückkehrpunkt ist der Tag `pre-overhaul-2` auf dem alten `main` (Commit `a9049da`). Kein Force-Push, keine umgeschriebene History.

Die Regeln im Code sind die Wahrheit. Begründung der geänderten Zahlen: [`DESIGN_DECISIONS.md`](DESIGN_DECISIONS.md). Sichtprüfung am eigenen Rechner: [`LOCAL_QA.md`](LOCAL_QA.md).

## Annahmen

- Neue Regelfunktionen liegen in eigenen Dateien ohne DOM und ohne Three. `state.js` bleibt die Fassade.
- `player.risk` bleibt die Datenschutz-Anzeige, wird aber aus dem Spielstand gesetzt, nicht mehr pro Cloud-Bau addiert.
- Rollen-Caps summieren sich wieder auf 100. Jede Rolle hat ein Mobilitäts-Teilziel.
- Projektmarkt mit drei offenen Karten, keine erzwungene Hand. Förderkarten bleiben ein Posteingang.
- Würfel: FastAPI, wenn er antwortet, sonst lokal und als Quelle markiert. Simulationen nutzen einen festen Seed.
- Keine neue Frontend-Bibliothek. Three.js r158 bleibt vendored. Gebäude sind weiter Gruppen pro Feld mit geteilten Materialien. Straßen, Autos, Fußgänger und Busse sind instanziiert.
- Intro-Texte sind ein Platzhalter. Die Dialog-Engine ist nur die Erweiterungstelle.

## 1. Risiko

Umgesetzt in `nexus/js/risk.js`, angebunden nach der Ernte als Phase `risk`.

Vier sichtbare Größen: Cyber-Exposition, Netzstress, Abhängigkeit, Verkehrslast. Die Vorschau zeigt Wert, Ursache, Gegenmaßnahme und die Chancen auf ein negatives und ein positives Ereignis, bevor der d100 fällt. Die Karte hängt Ursache, Gegenmaßnahme, Wurf und Schwelle an den Text. Lokale Geräte und ein Batteriespeicher mildern den Blackout. Positive Karten bleiben im Pool (Förderung, Anhörung, grüner Zuschuss, Überproduktion). Im Kapitel Resilienz ist ein Großereignis scharf.

36 Bot-Partien, 3 Spieler, Länge kurz, Schwierigkeit normal: 420 Ereignisse auf 1620 Prüfungen, Quote 0,259. Das liegt zwischen „selten“ und „ständig“. Keine Partie ist hängen geblieben.

## 2. Karten und Leisten

Die untere Kartenleiste hat viele Klicks erzeugt und die Entscheidung versteckt. Sie ist ausgeblendet.

Stattdessen: Kontextmenü am angeklickten Feld (bauen, ausbauen, abreißen, Halt, Busbahnhof, Parkhaus, Linie, Cloud oder lokal, SAE). Drei Projektkarten als Fächer, Kauf wirkt sofort. Förderkarten liegen daneben und werden von dort gespielt. Klick, Fehler und Würfel haben kurze WebAudio-Töne, kein neues Audio-Paket. Begründung steht in DESIGN_DECISIONS.

## 3. Mobilität

`nexus/js/mobility.js` baut den Graphen über alle Hex-Nachbarn im Spielfeldradius und hängt sechs Randknoten an die Ecken, untereinander zum Ring.

Haltestelle, Busbahnhof (einmal, wie das Datenzentrum), Parkhaus mit Solardach, Linie mit Diesel / Elektro / erneuerbar. SAE 1–5 hat Technik-Tore und ab Stufe 4 einen Risikoschock. Jede Rolle hat ein Teilziel, das an Halten, Antrieb, SAE oder Parken hängt.

Die 3D-Straßen nutzen den äußeren Tile-Ring plus die sechs Randportale, damit die Lücke im äußersten Ring geschlossen ist. Busse fahren `pathKeys` der gelegten Linien. Das ist implementiert und in der Cloud nicht im Bild geprüft.

## 4. Roter Faden

Vier Kapitel nach Rundenanteil: Grundversorgung, Vernetzung, Mobilität, Resilienz. Der Chip sitzt in der Topbar. Die Schlusskarte zeigt pro Person Erneuerbaren-Anteil, Autarkie, lokalen Geräteanteil, Komfort, Resilienz und einen kurzen Satz. Glossar in `glossary.js`, Tooltips verlinken die Begriffe. `dialog.js` hat einen Schritt („Lotse“, hebt `#stat-round` hervor). Keine fertigen Intro-Sätze.

## 5. Was die Simulation zusätzlich gebraucht hat

Undo in der Bauphase (bis zu acht Schnappschüsse, Taste `u`), Speichern und Laden unter `localStorage` (`nexus-save`), Schwierigkeit leicht/normal/schwer, Einsteiger (kein proprietärer Standard, billigere Halte und erste SAE-Stufe), Ereignisprotokoll über das bestehende Log, Neustart über den vorhandenen Knopf, Schlussauswertung.

Nicht gebaut: eine zweite Sprache, ein Ladebildschirm, ein vollständiges Tastaturspiel. Deutsch bleibt die einzige Oberfläche.

## 6. Stadt

`nexus/js/board-kit.js` wählt den Bautyp aus Zone und Seed, nicht aus Zufall zur Laufzeit: Wohnblock, Häuserzeile, Schule, Bäckerei, Klinik, Supermarkt, Solar, Wind, Umspannwerk, Datenzentrum, Busbahnhof, Parkhaus, Rathaus, Parkplatz. Maße und Dachfarbe variieren mit dem Seed. Props an der Straße bleiben die bestehende, zonengebundene Liste in `board-props.js`.

Freie Felder werden auf Grau gelegt. Eigene Felder behalten Pad, Rand und Dach in der Spielerfarbe. Der Einfaerb-Pop beim Bauen war schon da.

## 7. Farbe und Besitz

Siehe oben. Bebaubare Felder pulsieren weiter. Ein ungültiges Feld nennt im Menü und nach kurzem Hover den Grund.

## 8. Fahrzeuge

Pkw, Transporter, Bus und Rad teilen sich ein InstancedMesh und unterscheiden sich über die Skalierung. Spurversatz, Beschleunigen, Bremsen an Rot und kurzes Nachgeben an Kreuzungen. Der Elektro-Anteil folgt Garagen, Solar, Ladesäulen und Linien, die nicht Diesel sind. Fußgänger und Räder laufen auf dem Gehwegversatz, als kleine Instanzen, nicht als eigene Skelette. Linienbusse sind eine zweite Instanz und fahren die gelegten `pathKeys`.

## 9. Landschaft

Pro Biom zusätzliche Kulisse in `dressHorizon`: Gras mit Feld, Hof, Teich und Baumring, Wüste mit Dünen, Wasser mit einer großen Fläche. Dazu ferne Windräder, Dorfklötze, Wolken und Vögel. Nacht bleibt das vorhandene Dunkelblau mit emissiven Laternen und gebackenen Lichtpools. Keine PointLight pro Laterne.

## 10. Layout

Canvas bleibt full-bleed. Dock hat Tabs Ziele / Feld / Stadt, der Scrollcontainer ist `overflow: hidden`. Projektfächer und Feldmenü liegen über dem Brett. Spielerkarten, Ressourcenpartikel und Avatare aus 3.1 sind geblieben. Bandbreiten-Icon hatte schon Pfeil hoch und runter.

## 11. Hover-Hilfe

Ein Tooltip mit Titel, Kurztext, Beispiel und Mini-SVG. Glossarbegriffe über `data-gloss`, Risikozeilen inklusive. Deaktivierte Menüpunkte zeigen den Grund. Touch: langes Drücken. Überblick-Panel mit drei kurzen Seiten zu Bogen, Risiko und Mobilität.

## Weitere Dateien

| Bereich | Dateien |
| --- | --- |
| Regeln | `nexus/js/risk.js`, `dice.js`, `mobility.js`, `projects.js`, `arc.js`, `dialog.js`, `field-actions.js`, `state.js`, `data/roles.js`, `data/events.js`, `data/tutorial.js` |
| UI | `nexus/js/ui-overhaul.js`, `render.js`, `main.js`, `nexus/overhaul.css`, `nexus/index.html` |
| Stadt | `nexus/js/board-kit.js`, `board3d.js` |
| Server | `server/app.py`, `requirements.txt` |
| Doku | `docs/DESIGN.md`, `GAME.md`, `DESIGN_DECISIONS.md`, `CHANGELOG.md`, `CAST_22_9.md`, `LOCAL_QA.md`, `AUDIT.md`, `README.md`, `AGENTS.md` |
| Tests | `tools/boot.js`, `tools/sim.js` |

## Regelentscheidungen

Stehen ausformuliert in DESIGN_DECISIONS. Hier nur die Nachzüge aus der Balance:

- Umweltpunkte aus der Ernte sind auf ±1 pro Zug gedeckelt. Jede Solarfarm liefert weiter Energie. Sonst gewinnt, wer die meisten Felder vollstellt, bevor Datenschutz und Linien zählen.
- Eine Linie mit fremdem Halt gibt +1 Image pro Zug, bis Image 8. Die fünfte Gemeinwohl-Stufe liegt bei 8, damit diese Decke die Spur auch abschließt.

## Simulation

`node tools/sim.js 36` nach der letzten Kurve. Smoke `ok`. 36 von 36 Partien zu Ende, 0 hängen geblieben. Ereignisquote 0,259 (420/1620).

| Rolle | Siege / Sitze | Quote |
| --- | --- | --- |
| climate | 8/13 | 61,5 % |
| privacy | 3/22 | 13,6 % |
| investor | 6/18 | 33,3 % |
| visionary | 13/21 | 61,9 % |
| networker | 5/15 | 33,3 % |
| controller | 1/19 | 5,3 % |

Der Bot ist gierig: Solar und Komfort-Geräte laufen fast von allein, deshalb liegen Klima und Visionär vorn. Gemeinwohl gewinnt, wenn die fremde Linie steht. Der Controller baut Parkhäuser, scheitert aber oft an den hohen Geld- und Zonenschwellen. Keine Rolle ist bei 0 % oder 100 %. Das ist eine Bot-Meta, keine Aussage über einen Tisch mit Menschen.

## Abhängigkeiten

Keine neue Frontend-Bibliothek.

| Paket | Version | Lizenz | Größe im Env | Warum |
| --- | --- | --- | --- | --- |
| fastapi | 0.115.6 | MIT | ca. 1,0 MiB (Paketordner) | `GET /api/roll` und statische Dateien. Nicht ins Frontend gebundled. |
| uvicorn | 0.34.0 | BSD-3-Clause | ca. 0,4 MiB | Prozess, der `server.app` startet. |
| starlette, pydantic | transitiv | BSD / MIT | nicht extra gemessen | FastAPI zieht sie mit. |

Start: `python3 -m uvicorn server.app:app --host 127.0.0.1 --port 8765`. Ohne diesen Prozess würfelt das Spiel lokal und zeigt die Quelle.

## Was visuell ungeprüft ist

Headless Chrome (ANGLE/SwiftShader, 40 s und ein zweiter Lauf 25 s) hat die Seite geladen. Das DOM enthält danach den Projektfächer, den `ui-overhaul.js` erst zur Laufzeit einsetzt. Im Log kein `Uncaught` und kein `WebGL nicht verfügbar`. Ein Bild, eine Kamera und eine Nachtaufnahme gibt es nicht: der Prozess ist am Timeout hängen geblieben, dbus-Fehler, kein Frame.

Ungeprüft, bis [`LOCAL_QA.md`](LOCAL_QA.md) abgehakt ist: Picking an 30 Feldern, Ringstraße, Bus auf der Linie, Spur und Kurven, Elektro-Anteil, Nacht und Laternen, Biome, FPS bei voller Stadt, 1280×720, 1920×1080, Tablet, Wireframe, Dichte, Kamera-Extrem. Der Baukasten und die Kulisse sind nur gelesen und per `node --check` geprüft.

## Offen

- Intro-Texte. Die Engine steht, der Inhalt nicht.
- Controller ist für den Bot schwer (5 %). Ob das am Tisch auch so ist, weiß nur eine Partie.
- Gebäude sind nicht instanziiert, nur Materialien geteilt. Bei voller Stadt kann das die FPS drücken.
- Fußgänger sind Klötze, keine Sprites.
- Die alte Kartenleiste ist versteckt, nicht gelöscht.
- Kein Sprachumschalter, kein Ladebildschirm, keine volle Tastatursteuerung.
- Multiplayer bleibt draußen.

## Nächste Schritte

1. LOCAL_QA am eigenen Monitor, zuerst `?debug=1`.
2. Wenn die Ringstraße oder die Busse im Bild falsch liegen: nur `board3d.js`, die Regeln nicht anfassen.
3. Eine menschliche Kurzpartie pro Rolle, bevor die Kurven noch einmal bewegt werden. Der Bot belohnt Solar und Geräte pro Zug.
4. Intro-Schritte in `dialog.js` schreiben, wenn der Text steht.
