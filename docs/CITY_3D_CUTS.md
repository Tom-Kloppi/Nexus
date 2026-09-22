# Stadt-3D — Auftrag und Schnitte

Präsentation only. Regeln, Geräte-IDs, `upgradeLevel` 0–2 und Hot-Seat-Privatsphäre bleiben wie in `docs/DESIGN.md`. Dieser Zweig ist unabhängig vom Tutorial-Zweig und kann später gemergt werden. App-Shell (Topbar, Dock, Tray, Modal-Chrome) wird hier nicht umgebaut.

## Stack

- **Three.js r158**, vendored: `nexus/vendor/three.min.js` (UMD, `window.THREE`).
- Szene, Kamera, Autos, Ampeln: `nexus/js/board3d.js`.
- HUD bleibt `render.js` + HTML. Klicks: Raycast auf Hex-Volumen, gleiche Semantik wie zuvor (`hex-home` / `hex-owned` / `hex-empty`).
- Ein `requestAnimationFrame`-Loop für Autos, Ampeln, Seat-Lerp — keine CSS `offset-path`-Flotte.

## Auftrag (umgeschrieben)

Baue das Brett als große Stadt, nicht als Dorf. Pro Spielfeld ein **echtes extrudiertes Volumen** (Google-Maps-3D-Lesart, eine Masse plus wenige Boxen) und kleine monochrome Modelle, die mit dem Feld-Ausbau (`upgradeLevel` 0–2) dazukommen. Der Z-Buffer sortiert nach Bildtiefe, auch nach Seat-Yaw und freiem Orbit. Kamerawinkel: `localStorage` `nexus-cam-pitch` (0 steil bis 100 flach, Default 58) plus Rechts-/Mittel-Orbit. Zu Zugbeginn dreht sich das Brett so, dass der Leitstand der aktiven Person unten liegt. Geräte bleiben Spieler-Gadgets; nur öffentliche (Cloud) oder eigene lokale Geräte bekommen ein Modell, und nur am passenden Feldtyp. Nacht beleuchtet Fenster, Lampen und Ampeln nach denselben öffentlichen Regeln.

## Was auf den Kacheln liegt

| Feld | Stufe 0 | Stufe 1 dazu | Stufe 2 dazu |
| --- | --- | --- | --- |
| Wohnen | Podest + Wohnturm | Dachaufbau | zweiter Aufbau, Mast |
| Solar | Leitstand, zwei Panelreihen | dritte Reihe | Panels auf dem Dach, Mast |
| Umspannwerk | Halle, ein Kessel | zweiter Kessel | dritter Kessel, Mast |
| Datenzentrum | Halle | Flügel | Kühltürme, Schüssel |
| Busbahnhof | Halle, ein Bus, Vordach | zweiter Bus | dritter Bus, Mast |
| Parkplatz | Stellplätze, Ladesäulen, Kiosk | extra Säule | extra Auto, Mast |
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

Leere Innenfelder sind Baulücken oder Park-Deko. Der Rand ist Gewerbehalle, Hügel oder Berg — keine Ackerfurchen.

## Bewusst geschnitten (umkehrbar)

1. **Neue Geräte-IDs, vierte Ausbaustufe, GLTF-Bibliothek.** Vertrag in DESIGN. Zurückholen: neuer Zyklus, `nexus/vendor/models/` plus Loader — nicht dieser Zweig.
2. **Thermostat und Peak-Load als eigene Meshes.** Sie lesen sich wie HVAC bzw. Lamellen. Wieder einbauen: in `dressDevices` für `residential` `thermostat` → Dachknoten, `peak_load` → Lamellen.
3. **Jedes globale Gerät auf jedem Wohnfeld.** Hub nur am Leitstand.
4. **Geräte pro Parzelle besitzen.** Gadgets bleiben am Spieler. Die Modelle sind ein Lesehilfe-Layer.
5. **CSS-`offset-path`-Autos und SVG-Malreihenfolge.** Ersetzt durch Kantengraph + InstancedMesh. Rückbau nur sinnvoll zusammen mit SVG-Stadt.
6. **Per-Kachel-Straßenring.** Ein geteiltes Kantennetz; doppelte Fahrbahnen an Nachbarkanten entfallen. Rückbau: Ring-Shader/Mesh pro Hex.
7. **Volle Skyline aus vielen Türmen pro Hex.** Weiter ein Hauptkörper. Ausbau fügt Aufbauten hinzu.
8. **Echte Ampel-Logik als Spielregel.** Ampeln sind Präsentation (Takt + optional kurzes Halten). Kein Einfluss auf Ertrag, SAE oder Züge.
9. **Punktlichter pro Laterne.** Nacht = emissive Fenster/Lampen/Ampeln plus ein Directional/Hemi, keine 37 PointLights.
10. **Acker und Wiese im Spielfeld.** Rand bleibt steinfarbenes Gewerbe / Hügel. Grün nur Park-Deko.

Nacht zeigt weiterhin keine lokalen Geräte fremder Spieler: Gizmos nur bei `cloud` oder bei eigenem `local`.
