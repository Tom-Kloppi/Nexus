# Karten — Ist-Stand und drei Vorschläge

Vorschlag, kein Vertrag. Solange hier nichts nach `docs/DESIGN.md` wandert, bleibt das Spiel wie es ist. Stand: Branch `ui-rework`, 16 Innovationskarten, ein Markt und eine Hand auf derselben Liste.

## Ist-Stand

Es gibt **eine** Kartenliste, `nexus/js/data/cards.js`, 16 Stück in vier Farben: Grün, Datenschutz, Mobilität, Allgemein. Dieselbe Karte kann auf zwei Wegen ins Spiel kommen, und die Wege rechnen verschieden.

**Markt** (`nexus/js/projects.js`). Zu Beginn der Bauphase liegen drei Karten offen. Kaufen heißt sofort ausspielen, es gibt keine Hand dazwischen. Der Preis hängt nur an der Farbe, nicht an der Karte:

| Farbe | Preis |
| --- | --- |
| Grün, Allgemein | 2 Geld |
| Datenschutz | 1 Geld + 1 Bandbreite |
| Mobilität | 1 Geld + 1 Bandbreite |

Einsteiger senkt Geld um 1, mindestens 1. Nach dem Kauf rutscht die nächste Karte vom Stapel nach. Stapel leer: Ablage wird gemischt.

**Hand.** Dieselben Karten, aber **ohne Preis**. In der Bauphase darf einmal gezogen werden, Handlimit 4 (`HAND_LIMIT`). Ausspielen ist gratis und sofort. Der Nachziehstapel in der Leiste ist versteckt. Solange der Markt existiert, zieht die Bauphase die Hand **nicht** automatisch (`enterBuildPhase` füllt nur den Markt). Die Hand ist damit ein zweiter, halboffener Weg auf dieselben Daten.

**Was eine Karte tut.** Nur drei Sorten Wirkung, sofort, einmal:

- Ressourcen: Energie, Geld, Bandbreite, dazuaddiert.
- Spuren: Image, Komfort, Umwelt, Sicherheit, dazuaddiert, nicht unter 0.
- Risiko: `risk` auf den Schock, meist negativ.

Kein Dauer-Effekt, kein Ziel auf einem Feld, kein Mitspieler. Grüne Karten zählen zusätzlich `greenInnovationCards`. Keine aktuelle Rolle liest diesen Zähler. Die Spurwerte schon: Umwelt, Image und Komfort sind Rollenziele. Eine Karte kann also Punkte Richtung Sieg schieben, ohne dass das auf der Karte steht.

**Wo Kosten und Folgen ineinanderfallen.** Der Preis ist Farbe, die Folge ist Karte. Dadurch kauft man sich die gezahlte Ressource teilweise zurück.

| Karte | Preis | Folge | Was übrig bleibt |
| --- | --- | --- | --- |
| Open-Source-Hub | 2 Geld | +1 Geld, +1 Bandbreite | −1 Geld, +1 Bandbreite |
| V2G-Pilot | 1 Geld + 1 Bandbreite | +1 Energie, +1 Bandbreite | −1 Geld, +1 Energie. Bandbreite hebt sich auf |
| SAE-Softwarestack | 1 Geld + 1 Bandbreite | +2 Bandbreite, +1 Komfort | −1 Geld, +1 Bandbreite, +1 Komfort |
| Mobility-as-a-Service | 1 Geld + 1 Bandbreite | +2 Bandbreite, +1 Image | −1 Geld, +1 Bandbreite, +1 Image |

Open-Source-Hub ist der Fall „2 Geld zahlen, 1 Geld und 1 Bandbreite bekommen“. Auf der Hand ist dieselbe Karte gratis und damit ein anderes Spiel. Beides fühlt sich nach Kleingeld an, nicht nach einer Entscheidung.

**Gewinnen.** Zehn Punkte aus zwei Rechnungen der Rolle. Karten sind dafür ein Nebenkanal: sie füllen Spuren, die manche Rollen brauchen, und sie füllen die Kasse fürs Bauen. Sie sind kein eigener Siegweg. Streichen würde das Spiel nicht kaputtmachen. Behalten lohnt nur, wenn eine Karte etwas tut, das ein Gebäude nicht schon tut.

**Ereignisse** sind eine zweite Kartenart (Risiko ab 8). Die gehören nicht in diesen Vorschlag. Sie bleiben, wie sie sind, bis das Risiko selbst dran ist.

## Was jede Variante beantworten muss

- Wie kommt eine Karte in die Hand, und wie oft.
- Was sie darf, das Bauen nicht schon darf.
- Ob sie auf den Sieg einzahlt oder nur die Mittel dafür verschiebt.
- Ob sie andere Spieler berührt.
- Ob Markt und Hand beide bleiben.

Gemeinsam für alle drei: **eine Karte zahlt nie die Ressource zurück, die sie kostet.** Steht Geld im Preis, steht kein Geld in der Folge. Dieselbe Regel für Bandbreite und Energie.

## Vorschlag A — Hebel, kein Laden

Karten streichen als zweiten Geldbeutel. Eine Karte ist ein seltener Hebel auf die Spur, die zur Rolle passt, und sie setzt ein passendes Gebäude voraus.

**Bekommen.** Kein Markt. Zu Beginn der Bauphase, wenn die Hand unter 4 ist: eine Karte, aber nur wenn du das passende Gebäude hast. Solar zieht Grün, Rechenzentrum zieht Datenschutz, Linie oder Halt zieht Mobilität, sonst Allgemein. Nichts Passendes, nichts gezogen. Ausspielen bleibt in der Bauphase, höchstens eine pro Zug.

**Karten, Beispiele.**

- PV-Fassade. Voraussetzung Solar. Folge: +3 Umwelt. Kein Energiebonus, den Solar schon gibt.
- Zero-Trust. Voraussetzung sicheres Rechenzentrum. Folge: −2 Risiko, +2 Sicherheit.
- SAE-Softwarestack. Voraussetzung Linie mit Assistenz mindestens 1. Folge: +2 Komfort.
- Open-Source-Hub. Voraussetzung ein beliebiges eigenes Feld. Folge: +2 Bandbreite. Kostet nichts, ist aber die schwächste Karte.

**Sieg.** Direkt, aber schmal. Die Folge ist Spur oder Risiko, und Spur ist genau das, was die Rechnung der Rolle zählt. Wer nur kauft und nicht baut, zieht keine Karte.

**Andere Spieler.** Nein. Kein Klauen, kein Block.

**Streichen.** Den Markt streichen. Die Hand behalten. `greenInnovationCards` streichen, solange keine Rolle ihn liest. Preise streichen, weil die Voraussetzung das Bezahlen ersetzt.

**Spaß.** Die Karte fühlt sich verdient an. Du siehst das Solarfeld und weißt, dass daraus Umwelt werden kann, die Mira wirklich braucht. Kein „ich zahle 2 und kriege 1 zurück“.

## Vorschlag B — Tisch, nicht Tasche

Karten bleiben selten, aber sie sind der einzige Ort, an dem du jemand anderen anfasst. Ressourcen klauen ja, aber klein und sichtbar, nie die ganze Kasse.

**Bekommen.** Weiterhin drei offene Karten. Preis ist eine Ressource, die die Karte **nicht** erzeugt. Zusätzlich eine Karte auf die Hand zu Beginn der Bauphase, ohne Preis, Handlimit 3. Gekaufte Karten kommen auf die Hand und werden nicht sofort gespielt. Eine ausspielen pro Zug.

**Karten, Beispiele.**

- Netzabgabe. Preis 2 Geld. Wähle eine fremde Kasse: die gibt dir 1 Energie oder 1 Bandbreite, was sie mehr hat. Sie behält mindestens 1 von jeder Sorte. Folge für dich: kein Extra-Geld.
- Baustopp. Preis 1 Bandbreite. Ein benachbartes freies Feld ist bis zu deinem nächsten Zug nicht bebaubar.
- Tauschzwang. Preis 1 Energie. Du bietest 2 von einer Sorte und verlangst 2 von einer anderen. Die andere Person darf ablehnen, dann verfällt die Karte und du behältst den Preis nicht.
- Förderzusage. Preis 1 Geld. Folge: +3 Umwelt oder +3 Komfort, du wählst beim Ausspielen. Nicht beides.

**Sieg.** Nur indirekt. Die Karte verschiebt Mittel oder hält einen Zug auf. Punkte kommen weiter aus Feldern und Spuren. Wer nur stichelt und nicht baut, gewinnt nicht.

**Andere Spieler.** Ja, das ist der Punkt. Klauen ist gedeckelt (1 Ressource, Opfer behält 1). Block ist ein Feld, eine Runde. Nichts Verstecktes: die Karte liegt offen, der Tisch sieht den Griff in die Kasse.

**Streichen.** Nicht die Karten, sondern die Folgen, die nur „ein bisschen Geld“ sind. Open-Source-Hub in der jetzigen Form fliegt raus oder wird zum reinen Bandbreiten-Hebel ohne Geldrückfluss.

**Spaß.** Am Tisch wird geredet. „Die nimmt mir Bandbreite“ ist ein Satz, den man spielen kann. Risiko: bei 2 Personen ist Klauen hart, deshalb der Boden von 1. Bei 5–6 verteilt sich der Ärger.

## Vorschlag C — Fast streichen

Karten sind nicht der Weg zum Sieg und sollen es nicht werden. Der Markt fliegt raus. Übrig bleibt ein dünnes Deck als Würze, nicht als System.

**Bekommen.** Einmal pro Partie, am Anfang der zweiten Runde, zwei Karten auf die Hand. Danach nur noch, wenn ein Ereignis es sagt. Kein Kauf, kein Automat jedes Zug. Handlimit 2. Nicht ausspielen ist erlaubt, die Karte verfällt am Partieende.

**Karten, Beispiele.** Drei statt sechzehn, jede Farbe einer.

- Quartiersförderung. Sofort +2 Umwelt. Nur wenn du mindestens ein Solarfeld hast, sonst ist die Karte tot und wird abgeworfen.
- Datenminimierung. −2 Risiko. Nur wenn du ein Rechenzentrum hast.
- Nachtlinie. +2 Image. Nur wenn du eine Linie hast, die nicht dir allein gehört.

**Sieg.** Kaum. +2 auf einer Spur ist ein Schritt in einer Rechnung, die 6 oder 8 verlangt, und nur wenn das Gebäude schon steht. Wer die Karte nicht hat, baut denselben Sieg. Die Karte verkürzt, sie öffnet keinen neuen Weg.

**Andere Spieler.** Nein.

**Streichen.** Markt, Preise, Handlimit 4, automatisches Ziehen, alle Karten die Ressourcen erzeugen. Open-Source-Hub, V2G in der jetzigen Form und Digitaler Zwilling als +1/+1 fliegen mit. `greenInnovationCards` auch.

**Spaß.** Weniger Lesen, weniger „rechne Preis gegen Folge“. Die drei Karten sind Merkhilfe für das, was du schon gebaut hast. Wenn sich beim Spielen niemand dafür bückt, ist der nächste Schritt: Karten ganz weg und die Spur nur noch aus Feldern.

## Empfehlung, noch keine Entscheidung

A, wenn Karten sich nach der Stadt anfühlen sollen. B, wenn der Tisch laut werden soll. C, wenn die jetzige Dopplung vor allem stört und der Sieg aus Feldern kommen soll.

Nicht mischen. Markt plus Gratis-Hand plus Ressourcen-Folge ist der jetzige Zustand, und genau dort entsteht „2 Geld zahlen, 1 Geld zurück“.

## Smartphone, nur vorbereitet

Handel, Darstellung und die anderen Menüs sollen später ein Telefon in der unteren linken Ecke werden: bei Hover kommt es hoch, darin Apps. Das ist noch nicht das Verhalten.

Vorbereitet, unsichtbar: `nexus/js/phone.js` legt `#phone-dock` mit `hidden` an und merkt vier App-Fächer (`trade`, `settings`, `goals`, `guide`). Kein Hover, kein Verschieben der bestehenden Knöpfe und Dialoge. Die jetzige Oberfläche bleibt, wo sie ist.
