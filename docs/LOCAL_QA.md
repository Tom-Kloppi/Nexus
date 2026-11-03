# Lokale Sichtprüfung — Overhaul 2

Die Cloud-Umgebung hat kein verlässliches WebGL. Alles in dieser Liste ist am echten Rechner zu prüfen. Haken nur setzen, wenn es mit den Augen stimmt.

## Start

1. `python3 -m pip install -r requirements.txt`
2. `python3 -m uvicorn server.app:app --host 127.0.0.1 --port 8765`
3. `http://127.0.0.1:8765/index.html` — Konsole ohne Fehler.
4. Dieselbe Partie einmal ohne Server (`cd nexus && python3 -m http.server 8765`). Der Wurf muss als lokal gekennzeichnet sein.

## Brett

- [ ] 30 Felder anklicken: leeres Nachbarfeld öffnet das Menü, fremdes Feld erklärt warum, Leitstand öffnet Cloud/lokal.
- [ ] Ringstraße und sechs Randanschlüsse schließen die Lücke im äußeren Ring.
- [ ] Bus fährt die selbst gelegte Linie, Pkw/Transporter/Rad bleiben auf der Spur, auch in Kurven.
- [ ] Elektrofahrzeuge werden häufiger, wenn Garagen, Solar und E-Linien da sind.
- [ ] Freie Felder grau, eigene farbig, bebautes Feld färbt kurz ein, bebaubarer Rand pulsiert.
- [ ] Schule, Bäckerei, Supermarkt, Klinik, Parkhaus, Busbahnhof, Solar, Wind, Umspannwerk sind der Zone zuordenbar.
- [ ] Nacht bleibt lesbar (dunkelblau, Laternen-Glow, keine schwarze Platte).
- [ ] Gras, Wüste, Wasser: Hügel oder Dünen, Wasserfläche, ferne Windräder, Wolken. Plattenrand nicht als harte Kante.

## Debug (`?debug`)

- [ ] FPS-Zeile bei voller Stadt (4–6 Spieler, viele Felder).
- [ ] Kamera-Extrem, Tag/Nacht, Biom, Dichte 0 und 2, Wireframe der Pick-Flächen.

## Auflösung

- [ ] 1280×720: kein Scrollbalken im Dock, Fan und Menü bleiben im Bild.
- [ ] 1920×1080: Canvas füllt den Viewport, Overlays decken nicht die Mitte.
- [ ] Tablet-Breite (um 800 px): Ziele-Tabs, Fan, Hilfe.

## Partie

- [ ] Kurzpartie zu Ende, alle sechs Rollen einmal am Tisch.
- [ ] Risiko-Modal vor dem Wurf, Ereigniskarte nennt Ursache.
- [ ] Undo in der Bauphase, Speichern/Laden im Überblick.
- [ ] Schlussbilanz nennt Erneuerbare, Autarkie, Datenschutz, Komfort, Resilienz.
