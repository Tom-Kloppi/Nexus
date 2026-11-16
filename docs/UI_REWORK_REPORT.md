# UI Rework — Bericht

Branch `ui-rework`, von `visual-fix-3` (`f115965`). Nicht gemergt. Geschaut und danach gebaut im lokalen Browser mit GPU. Partie: 2 Personen, Tag und Nacht, 1920×1080 und 1280×720 bei UI-Skala 1,2. Smoke: `node tools/sim.js 0` → ok.

Bilder: `docs/ui-rework/`.

## Regeln

| Vorher | Nachher | Warum |
| --- | --- | --- |
| Rolle, Ziel und Kasse hinter dem Schild | Alles am Tisch, Übergabe ist „du bist dran“ | Niemand dreht sich weg. Dagegen spielen geht nur, wenn man das Ziel sieht. |
| Fünf Stufen, Prozent, versteckte Metriken | Zwei Rechnungen, zusammen 10 Punkte, `haben/brauchen` | Man kann es am Zug nachrechnen. 10 Punkte sind weiter 100 % im alten Siegpfad. |
| Ausbau 0–2 und Abriss | Nicht im Menü | Der Zug war Typ, Preis, Ertrag. Der Rest hat nur verlängert. |
| Offen / proprietär, Aufpreis, Rabatt, Sperre | Handel ist die getippte Menge, beide Kassen stehen davor | Die Folge stand nicht an der Wahl. |
| SAE nur im Leitstand, Linie ohne Bild | Assistenz-Zahl als Pfosten, Streifen auf der Kante, Bus darauf | Man soll sagen können, welche Linie welche Felder trifft. |
| Elektro-Linie ohne Extra | Elektro +1 Image, Diesel +1 Komfort, Öko +1 Umwelt | Drei Antriebe, drei sichtbare Folgen. |
| Risiko: vier Aufsätze vor dem Wurf | Größte Ursache, Schwelle, ein Satz | Der Stapel hat den Wurf verdeckt. Die Rechnung im Code bleibt. |
| Punkt unsichtbar in einer Prozentzahl | `+N Spur` fliegt von der Ursache zur Rolle, unter einer Sekunde, ohne Freeze | Man sieht, woher der Punkt kommt. |

## Rollen

Rechnung aus den Schwellen, nicht aus einer Bot-Partie. Ein guter Zug ist eine Tat, die die Rechnung um ihren Schritt hebt. Ernten zählt mit, wenn die Spur davon kommt. Alle sechs sind geändert, weil die alte Leiter zu versteckt, zu langsam oder mit dem Brett nicht erreichbar war.

| Rolle | Vorher | Nachher | Gute Züge bis 10 | Geändert |
| --- | --- | --- | --- | --- |
| Mira, Umwelt | Umwelt 15, 5 grüne Karten, Image 15, 5 Öko-Halte | Umwelt 6×1, Öko-Halte 2×2 | etwa 8: Solar gibt Umwelt, eine Linie mit zwei Halten die restlichen 4 | ja, Karten und Image gestrichen |
| Isabella, Sicherheit | Sicherheit 80, Risiko „niedrig ist besser“, Lokal-Prozent, SAE 5 | 3 lokale Geräte ×2, 2 sichere Rechenzentren ×2 | etwa 8–9 Bauten, dazwischen Ernten | ja, 80 und der Prozentnebel waren nicht spielbar |
| Maria, Wirtschaft | Komfort 15, Sicherheit 15, Handel 55 | Handel 8×1, Komfort 2×1 | etwa 6–8, vier kleine Tausche plus zwei Komfortpunkte | ja, 55 war ein Grind |
| Jürgen, Zukunft | vier Spuren auf 15 und SAE 5 | Assistenz 3×2, Komfort 4×1 | etwa 8–10, Stufe 3 braucht ein Rechenzentrum | ja, „alles gleich“ hat niemand am Zug gespürt |
| Thomas, Image | Image 8, Umwelt 15, zwei Prozentsätze | Image 5×1, Handel 5×1 | etwa 9: Linie mit fremdem Halt, dann Image pro Zug, Handel daneben | ja, Prozente gestrichen |
| Heinz, Komfort | Komfort 15, 18 Zonen, 400 Geld, 8 Parkpunkte | Komfort 6×1, Parken 2×2 | etwa 8: erstes Verkehrsfeld, ein Parkhaus (zählt 2), Linien füllen den Rest | ja, 18 Zonen passen nicht aufs Brett |

Der 2p-/6p-Faktor auf die Schwellen ist weg. Sonst stünde auf der Karte eine andere Zahl als die, die zählt.

## A bis F

**A — Fläche und Skala. Erledigt.** Bei 1280×720 und Skala 1,2 lagen „Handeln“ und „Zug beenden“ im Bild, ohne Seiten-Scroll (`after-1280-scale.png`). Gesichter sitzen ganz im Kreis und bleiben bei der Übergabe (`after-roles.png`, `after-night-1920.png`). Das Schild blendet sie nicht mehr aus.

**B — Menüs. Erledigt, Ereignis-Text nach dem Foto nachgezogen.** Feldwahl ist eine Kachel mit Name und Vorzeichen (`after-build.png` gegen `before-build.png`). Projekt- und Handkarten: Farbe, Icon, Plus/Minus. Der Satz nur beim Halten. Das fotografierte Ereignis war noch der alte Ursachenstapel (`after-event.png`). Danach hängt der Wurf nur noch als Zahl am Satz, die Begründung bleibt der eine Satz darunter.

**C — Sprache und Ziele. Erledigt.** Knöpfe sagen den nächsten Handgriff. „Zug beenden“ erklärt im Titel, warum er wartet („Erst das gratis Nachbarfeld bauen.“). Die sechs Rollen stehen mit Gesicht, Richtung und `Punkte/10` in der Leiste. Die Rechnung der Person am Zug steht oben rechts und im Zielpanel.

**D — Systeme. Teilweise.** Bauen, Handel, Risiko und Karten sind nachgerechnet und geklickt. Handel zeigte „Du gibst 1 Energie, du bekommst 1 Geld“ plus beide Kassen. Risiko war ein Satz und ein Wurf (`after-risk.png`). Die Linie als Streifen und der Assistenz-Pfosten sind im Brett-Code. In dieser Partie reichte die Kasse nach dem Gratis-Parkplatz nicht für Bahnhof und einen zweiten Halt, deshalb gibt es kein Foto einer gesetzten Linie. Cloud und lokal bleiben zwei Kacheln mit einem Satz; der Unterschied (Ausfall, Sicherheit) steht daran.

**E — Ort. Erledigt.** Unten die Zugknöpfe. Am Feld die Kacheln dieses Feldes. Oben die Personen. Rechts in der Leiste `1/10` der Person am Zug. Die Bauphase sagt „Feld antippen zum Bauen.“

**F — Punkte. Erledigt, mit einer Grenze am Foto.** `after-flight.png` zeigt `+4 Umwelt` auf dem Weg nach oben, ohne dass der Tisch stehen bleibt. Dieser eine Flug startete noch am zuletzt gebauten Feld, weil die Handkarte keine eigene Ursache gesetzt hatte. Das ist danach korrigiert: eine Handkarte startet an der Karte. Komfort von Heinz ging im selben Zug von 0/10 auf 1/10, als der Parkplatz lag.

## Gestrichene Menüpunkte

Ausbau, Abriss, Büro ausbauen, Standard offen, Standard proprietär, „Alle Geräte im Leitstand“, der SAE-Kasten im Leitstand (die Stufe heißt am Feld Assistenz), der vierteilige Risiko-Aufsatz, die Prozent-Erklärung im Zielpanel.

## Nicht verifiziert

- Eine wirklich gesetzte Buslinie und ihr Bus auf der Kante. Der Code zeichnet sie, die Partie kam nicht hin.
- Das Ereignis-Layout nach dem gekürzten Satz. Das Foto ist der Stand davor.
- Der Würfelserver `server/app.py` lief nicht. Der Wurf kam aus dem lokalen Beutel, die Fläche hat Zahl und Folge gezeigt.
- Sechs Personen gleichzeitig, und der UI-Skala-Regler selbst. Die Skala 1,2 kam über die Variable, die Knöpfe lagen im 1280er Bild.
- Ob jede Rolle in einer echten Partie bei Zug 8 anschlägt. Die Tabelle ist die Rechnung aus `roles.js`, kein Bot-Lauf über 20 Runden.
