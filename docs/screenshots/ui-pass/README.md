# UI-Pass Screenshots

Lokaler Vision-Workflow für den Visual-Fix (Leitstand, Geräte, Tray, Settings).

## Was prüfen

1. **Settings:** Nachtmodus + Einsteiger als physische `nx-switch` (Grafik niedrig/mittel/hoch bleibt anderer Chat).
2. **Tray:** Aktions-Buttons getrennt vom Karten-Fan (`hand-fan`).
3. **Geräte-Modal:** 9 Geräte mit Metrik-Tags; Cloud zeigt Karma-Druck, Lokal teurer.
4. **HUD:** Keine Erste-Tage-Agenda, kein Chapter-Chip — nur Standing Goals.
5. **Board:** Windkraft nutzt Kenney `windmill` / `windmill-low` GLBs.

## Aufnehmen

```text
# Spiel lokal öffnen
nexus/index.html

# CDP-Shot (wie Abgabe-Board), Fokus Leitstand / Geräte / Tray
node tools/_save_cdp_shot.js docs/screenshots/ui-pass/<name>.png
```

Dateinamen-Vorschlag:

- `01-setup-switches.png`
- `02-tray-split.png`
- `03-devices-modal.png`
- `04-standing-goals.png`
- `05-board-wind.png`

## Hinweis

Keine neuen UI-Libraries. Cache-Bust: `?v=` in `nexus/index.html` nach CSS/JS-Änderungen erhöhen.
