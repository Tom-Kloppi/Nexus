# Stadt-3D — Auftrag und Schnitte

Präsentation only. Regeln, Geräte-IDs, `upgradeLevel` 0–2 und Hot-Seat-Privatsphäre bleiben wie in `docs/DESIGN.md`. Kein WebGL. Dieser Zweig ist unabhängig vom Tutorial-Zweig und kann später gemergt werden.

## Auftrag (umgeschrieben)

Baue das Brett als große Stadt, nicht als Dorf oder Acker. Pro Spielfeld ein extrudiertes SVG-Volumen (Google-Maps-Lesart, eine Masse plus wenige Boxen) und kleine monochrome Modelle, die mit dem bestehenden Feld-Ausbau (`upgradeLevel` 0–2) dazukommen. Hohe Häuser dürfen nicht abgeschnitten werden: der Kamerawinkel ist einstellbar (`localStorage` `nexus-cam-pitch`, 0 steil bis 100 flach, Default 58). Zu Zugbeginn dreht sich das Brett so, dass der Leitstand der aktiven Person unten liegt — jeder sieht dieselbe Art von Ansicht. Geräte bleiben Spieler-Gadgets; nur öffentliche (Cloud) oder eigene lokale Geräte bekommen ein Modell, und nur am passenden Feldtyp.

## Was auf den Kacheln liegt

| Feld | Stufe 0 | Stufe 1 dazu | Stufe 2 dazu |
| --- | --- | --- | --- |
| Wohnen | Podest + Wohnturm | Dachaufbau, zweite HVAC | zweiter Aufbau, Mast |
| Solar | Leitstand auf Asphalt, zwei Panelreihen | dritte Reihe | Panels auf dem Dach, Mast |
| Umspannwerk | Halle, ein Kessel, Traverse | zweiter Kessel | dritter Kessel, höherer Mast |
| Datenzentrum | Halle | Flügel | zwei Kühltürme, Schüssel |
| Busbahnhof | Halle, ein Bus, Vordach | zweiter Bus | dritter Bus, Mast |
| Parkplatz | Stellplätze, zwei Ladesäulen, Kiosk | dritte Säule, höheres Kiosk | extra Auto, Mast |
| Leitstand | Turm, Fahne, Schüssel | Anbau | Dachaufbau, Mast |

Gerät → Modell (nur Cloud, oder Lokal wenn das Feld dir gehört):

| Gerät | Modell | Wo |
| --- | --- | --- |
| `camera` | Mast mit Linse | Wohnen, Leitstand, Datenzentrum |
| `lock` | Türplatte | Wohnen, Leitstand, Datenzentrum |
| `shutters` | Fassadenlamellen | Wohnen |
| `hems` | Dachknoten | Wohnen |
| `hub` | Funkmast | nur Leitstand |
| `storage_battery` | Schrank | Solar und Umspannwerk |
| `v2x` | Dachschüssel | Verkehr |
| `charger`, `charging_network` | extra Ladesäule | Verkehr |

Leere Innenfelder sind Baulücken (Asphalt, Kran oder Baucontainer). Der Rand ist Gewerbehalle, Hügel oder Berg — keine Ackerfurchen. Parks bleiben Deko, mit einem kleinen Pavillon.

## Bewusst geschnitten (umkehrbar)

1. **Neue Geräte-IDs, vierte Ausbaustufe, WebGL/GLTF.** Vertrag in DESIGN. Zurückholen hieße einen neuen Zyklus, nicht diesen Zweig.
2. **Thermostat und Peak-Load als eigene Meshes.** Sie lesen sich wie HVAC bzw. Lamellen und würden den Turm zum Icon-Stapel machen. Wieder einbauen: in `deviceDressing` für `residential` `thermostat` → `roofNode`, `peak_load` → `finRow`.
3. **Jedes globale Gerät auf jedem Wohnfeld.** Hub, Thermostat, Peak-Load kleben nicht an jeder Parzelle. Hub nur am Leitstand. Die anderen Schnitte stehen in Zeile 2.
4. **Geräte pro Parzelle besitzen.** Gadgets bleiben am Spieler. Die Modelle sind ein Lesehilfe-Layer, keine neue Platzregel.
5. **Freie Orbit-Kamera.** Ein frei drehbares Brett bricht die Zusage „dieselbe Ansicht pro Person“. Winkel ist nur die Neigung (`nexus-cam-pitch`).
6. **Animiertes Drehen beim Zugwechsel.** `innerHTML` des Bretts wird neu gebaut; eine CSS-Drehung würde die Malreihenfolge (vorne verdeckt hinten) zerstören. Die Drehung ist deshalb sofort. Wer sie animieren will, muss die Kacheln frameweise nach Bildschirm-Y sortieren, nicht nur die Gruppe transformieren.
7. **Acker und Wiese im Spielfeld.** `artFarm` (Furchen, Scheune) und `artMeadow` (Büsche) sind Gewerbe bzw. Baulücke. Grünvarianten `.tile--grass.g-2/g-3` sind Graustufen. Rückbau: diese Funktionen und die Tokens `--lu-grass-*`, `--lu-farm-*`, `--lu-hill-*`, `--lu-res-*`, `--lu-home-*` aus dem Stand vor diesem Zweig holen. Hügel und Berge bleiben, nur steinfarbener.
8. **Volle Skyline aus vielen Türmen pro Hex.** Weiter ein Hauptkörper. Ausbau fügt Aufbauten hinzu, kein zweites Hochhausquartier.

Nacht zeigt weiterhin keine lokalen Geräte fremder Spieler: `gizmos` setzt ein Gerät nur bei `cloud` oder bei eigenem `local`.
