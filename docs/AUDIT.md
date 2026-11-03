# Audit — Stand vor Overhaul 2

**Stand:** `main` @ `a9049da` (Visuals/UI 3.1). Sicherung: Tag `pre-overhaul-2`.  
**Methode:** Code ist die Wahrheit. DESIGN/GAME beschreiben den Vertrag 3.0/3.1, nicht alles, was diese Runde ändern soll. Kein Python-Backend im Repo. Kein WebGL-Lauf in dieser VM vorausgesetzt.

## Was spielbar ist

- Hot-Seat, 2–6 Spieler, Rollen mit öffentlicher Ausrichtung und geheimer Stufenkurve.
- Drei Ressourcen, vier Spuren, Expand nur am eigenen Netz, Ausbau 0–2, Abriss nur wenn das Home verbunden bleibt.
- Produktion zu Zugbeginn, Solar mit gewichtetem Würfel, Wohn-Bandbreite nur mit eigenem Datenzentrum.
- Geräte Cloud/lokal, Handel als Angebot, SAE 0–5 nur mit V2X oder Ladenetz.
- WebGL-Stadt (Three r158, vendored): Kantenstraßen, Autos, Besitzfarbe, Biom, Nacht-Laternen ohne PointLight pro Laterne.

## Befunde

### P1 — muss

1. **Risiko ist ein Zähler, keine Ursache.** `player.risk` wächst durch Cloud-Upkeep, unsichere DCs und Event-Effekte (`state.js`). Die Zahl sagt nicht, welcher Hebel sie senkt. Ereignisse kommen jede zweite Runde aus einem Stapel (`EVENT_EVERY_N_TURNS`), nicht aus dem Spielstand. Datenschutz-Sieg hängt an diesem Zähler.
2. **Kartenleiste ist Klickstrecke ohne Bild.** Handlimit, Nachziehen, untere Leiste (`index.html` Tray). Karten sind kleine Effekt-Boni. Kein offener Markt, kein Feld-Kontext.
3. **Mobilität ist ein Stub.** Verkehrsfeld: +1 Geld-Basis und +1 Komfort. SAE ist ein Aufpreis. Keine Haltestelle, kein Busbahnhof, keine Linie, kein Antrieb. Straßen-Graph ist nur Darstellung in `board3d.js` und deckt den Deko-Ring außerhalb des Spielradius nicht ab — dort bleiben die Lücken.
4. **Rollen summieren über 100 %.** climate/privacy/investor/networker/controller: Teilziel-Caps 110. visionary: 112. Sofortsieg ist damit für breite Rollen leichter. Mobilität fehlt in jedem Versprechen (CAST hat sie bewusst gestrichen; der Auftrag holt sie zurück).
5. **Kein Spielbogen.** Runden sind gleichförmig. Kein Kapitel, kein Großereignis, keine Schlussbilanz zu Erneuerbaren, Autarkie, Datenschutz, Komfort, Resilienz.
6. **Würfel sind `Math.random` im Client.** Transparent in der Gewichtung (`PRODUCTION_DICE`), aber nicht serverseitig und der Produktionswurf zeigt keine Schwellen vor dem Ergebnis.
7. **Stadt-Lesbarkeit und Füllung.** Unkontrollierte Felder sind schon bebaut, aber generisch. Besitz färbt Dach-Akzente, nicht konsequent entsättigt vs. koloriert. Fahrzeuge haben Richtung und Ampel-Halt, aber wenig Typen, keine Spur, kaum Beschleunigen. Kulisse ist Platte, Kegel-Berge, eine Silhouette.
8. **UI-Dichte.** Dock scrollt (`dock-scroll`). Tray ist dauerhaft da. Hilfe ist Tutorial-Overlay plus ein Glossar-Modal für Spur/Stufe/Prozent, keine einheitlichen Tooltips mit Beispiel.
9. **Fehlende Partie-Hülle.** Ende-Screen und Neustart existieren. Undo, Speicherstand, Schwierigkeit, Einsteiger, Ereignisprotokoll als eigene Ansicht und eine Dialog-Engine fehlen.

### P2 — soll

- Sound-Hooks, Juice bei Bau/Karte/Wurf.
- Tastatur, Kontrast, bereits okabe-nahe Spielerfarben weiter beschriften.
- Ladehinweis, Sprache ehrlich als „nur Deutsch“.
- Debug hinter `?debug` (FPS, Picking, Kamera, Tag/Nacht, Biom, Dichte, Wireframe).
- Simulierte Bot-Partien mit Siegquoten.

### P3 — kann

- Weitere Landmarken-Varianten, Vögel/Wolken feiner, zweite Sprache.
- Echte Intro-Texte (Engine jetzt, Inhalt später).
- Multiplayer. DESIGN sperrt das bis nach Hot-Seat. Dieser Lauf bleibt Hot-Seat; der Server würfelt nur.

## Backlog-Reihenfolge

P1 vollständig vor P2/P3: Risiko → Karten/Feldmenü → Mobilität → Bogen/Glossar/Dialog-Stub → Partie-Hülle → Stadt/Fahrzeuge/Landschaft → Layout/Tooltips. Danach Sound, A11y, Debug, Tests, Doku.

## Annahmen für die Umsetzung

- Neue Regellogik liegt in eigenen Dateien ohne DOM und ohne Three. `state.js` bleibt die Fassade. Sonst wird die Datei unbeherrschbar und Sub-Agenten überschreiben sich.
- `player.risk` bleibt die Metrik der Datenschutz-Rolle, wird aber aus Faktoren plus abklingendem Schock **abgeleitet**.
- Teilziel-Caps werden auf 100 % zurückgesetzt und um ein Mobilitäts-Teilziel ergänzt.
- Karten: offener Dreier-Markt, Effekt sofort, keine Pflicht-Hand. Geschenkte Karten bleiben eine kleine Inbox.
- Server: FastAPI, nur Würfel plus statische Dateien. Fällt er aus, würfelt der Client sichtbar lokal, damit die Datei trotzdem startet.
