# NEXUS starten (lokal)

Kenney-`.glb` laden nur über HTTP — **nicht** per `file://`.

## Schritte

1. Terminal öffnen und in den Spielordner wechseln:

```bash
cd nexus
```

(Repo-Root ist `Nexus/`; der Server muss **in** `nexus/` laufen.)

2. Lokalen Server starten:

```bash
python -m http.server
```

Oder mit Port:

```bash
python -m http.server 8000
```

3. Browser öffnen:

```
http://127.0.0.1:8000/
```

bzw. `http://127.0.0.1:8000/index.html`

4. Grafik in den Einstellungen auf **Balance**, **Hoch** oder **Ultra** (nicht Minimal/Leistung).

5. Partie starten. Kenney-Gebäude erscheinen auf besetzten Feldern (Pad/Rim = Besitzfarbe).

## Stoppen

Im Terminal `Ctrl+C`.

## Falls Modelle fehlen

- Hard-Reload: `Ctrl+F5`
- Prüfen, ob die Adresse mit `http://` beginnt (nicht `file:///…`)
- Server wirklich aus `nexus/` gestartet (dann existieren `vendor/kenney/…` und `index.html` unter `/`)

## Kenney Car-/Graveyard-Props nachziehen

Werkstatt nutzt ausgewählte Props aus Car Kit + Graveyard Kit unter `nexus/vendor/kenney/car/` und `…/graveyard/`. Neu holen (PowerShell, braucht Netz):

```powershell
powershell -File tools/fetch_kenney_props.ps1
```

Kenney liefert den Zip nur mit Browser-Referer; das Skript setzt das.
