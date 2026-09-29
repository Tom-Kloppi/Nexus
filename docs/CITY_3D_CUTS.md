# Stadt-3D — Schnitte (umkehrbar)

Präsentation. Vertrag: [`DESIGN.md`](DESIGN.md). Geschichte: [`CHANGELOG.md`](CHANGELOG.md) 3.0. Gemergt nach `main`.

## Stack

Three.js r158 vendored (`nexus/vendor/three.min.js`). Szene `nexus/js/board3d.js`. HUD `render.js`. Klicks: Raycast. Ein RAF-Loop — keine CSS-`offset-path`-Flotte.

Sichtbarkeit: **alle** gebauten Gadgets (`Nexus.boardGadgetsFor`).

## Ausbau / Geräte-Meshes

| Feld | Stufe 0 | Stufe 1 | Stufe 2 |
| --- | --- | --- | --- |
| Wohnen | Podest + Turm | Dachaufbau | zweiter Aufbau, Mast |
| Solar | Leitstand, zwei Panelreihen | dritte Reihe | Dach-Panels, Mast |
| Umspannwerk | Halle, ein Kessel | zweiter Kessel | dritter Kessel, Mast |
| Datenzentrum | Halle | Flügel | Kühltürme, Schüssel |
| Busbahnhof | Halle, Bus, Vordach | zweiter Bus | dritter Bus, Mast |
| Parkplatz | Stellplätze, Ladesäulen, Kiosk | extra Säule | extra Auto, Mast |
| Leitstand | Turm, Fahne, Schüssel | Anbau | Dachaufbau, Mast |

| Gerät | Modell | Wo |
| --- | --- | --- |
| `camera` | Mast mit Linse | Wohnen, Leitstand, DC |
| `lock` | Türplatte | Wohnen, Leitstand, DC |
| `shutters` | Fassadenlamellen | Wohnen |
| `hems` | Dachknoten | Wohnen |
| `hub` | Funkmast | Leitstand |
| `storage_battery` | Schrank | Solar, Umspannwerk |
| `v2x` | Schüssel | Verkehr |
| `charger`, `charging_network` | extra Ladesäule | Verkehr |

## Cuts

1. Keine neuen Geräte-IDs, keine 4. Ausbaustufe, keine GLTF-Bibliothek.
2. Thermostat / Peak-Load keine Extra-Meshes.
3. Hub nicht auf jedem Wohnfeld.
4. Gadgets bleiben Spieler-Inventar; Modelle nur Lesehilfe.
5. Keine CSS-Autos, keine Per-Hex-Straßenringe.
6. Kein zweites Hochhausquartier pro Hex.
7. Ampeln keine Spielregel.
8. Keine PointLights pro Laterne.
9. Kein Acker im Spielfeld.

Rückbau: `archive/main-pre-webgl-cast-5bc5` (SVG-Stadt) bzw. Commit vor der Cut-Notiz.
