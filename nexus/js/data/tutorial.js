window.Nexus = window.Nexus || {};

/* Schritttexte der Anleitung. Ablauf und Spotlight: main.js / render.js.
   Lore: Graulstedde / #GGW — angepasst an sichtbare Rollen (kein Geheimhaltungsschild). */
Nexus.TUTORIAL_SECTIONS = [
  { id: "story", title: "Geschichte" },
  { id: "setup", title: "Start" },
  { id: "hud", title: "Oberfläche" },
  { id: "district", title: "Distrikt & Ziele" },
  { id: "actions", title: "Zug & Karten" },
  { id: "build", title: "Bauen & Geräte" },
  { id: "trade", title: "Handel & Ereignisse" },
  { id: "hotseat", title: "Übergabe & Ende" }
];

Nexus.TUTORIAL_STEPS = [
  {
    id: "story-graulstedde",
    section: "story",
    scene: "setup",
    target: "#setup-screen h2",
    title: "Graulstedde braucht Wechsel",
    body: "Nach langer Amtszeit von Bürgermeister Günter Grotte-Wabenbauer startete #GünterGehWeg. Die Stadt wählt ein Pilotprojekt: Kandidatinnen und Kandidaten beweisen in zugelosten Stadtteilen, dass Wahlversprechen auch umgesetzt werden — Wohnen, Energie, Netze, Sicherheit und Alltag."
  },
  {
    id: "story-coop",
    section: "story",
    scene: "setup",
    target: "#setup-screen .setup-note",
    title: "Diskurs am einen Tisch",
    body: "Ihr teilt euch ein Gerät (Hot-Seat). Die Grundwerte unterscheiden sich, aber die Stadt braucht Kompromisse: handeln, Linien teilen, Risiken senken. Am Tisch sind Rolle, Ziele und Kasse sichtbar — damit Anfänger mitlernen können, nicht hinter Geheimnissen."
  },
  {
    id: "story-win",
    section: "story",
    scene: "setup",
    target: "#setup-length",
    title: "Probezeit und Auswertung",
    body: "In der Probezeit sammelt jede Person Rollenpunkte der eigenen Art. Wer zuerst 10 Punkte nach einem vollen Tag hat, wird Bürgermeister. Sonst entscheiden die verbleibenden Tage: die meisten Punkte — nicht Würfelglück."
  },
  {
    id: "setup-welcome",
    section: "setup",
    scene: "setup",
    target: "#setup-screen h2",
    title: "Neue Partie",
    body: "Hier startet jede Partie. Weiter, Zurück und Beenden — oder Pfeil rechts, Enter, Pfeil links und Escape. Inhalt springt zu einem Thema."
  },
  {
    id: "setup-count",
    section: "setup",
    scene: "setup",
    target: "#setup-player-count",
    title: "Spielerzahl",
    body: "Zwei bis sechs Personen. Ab vier Personen wird der Distrikt um einen Hex-Ring größer. Die Regeln bleiben gleich, nur Platz und Tempo wachsen."
  },
  {
    id: "setup-length",
    section: "setup",
    scene: "setup",
    target: "#setup-length",
    title: "Spiellänge",
    body: "Kurz, Standard oder Lang legt die Probezeit in Tagen fest (10 / 14 / 18). Punkte kommen aus Entscheidungen — nicht aus Zufallssiegen."
  },
  {
    id: "setup-table",
    section: "setup",
    scene: "setup",
    target: "#setup-screen .setup-note",
    title: "Was alle sehen",
    body: "Rollen, Ziele, Kassen und gebaute Geräte sind am Tisch öffentlich. Die Übergabe sagt nur „du bist dran“. So bleibt NEXUS ein Lernspiel, kein Versteckspiel."
  },
  {
    id: "setup-gear",
    section: "setup",
    scene: "setup",
    target: "#setup-screen .js-settings-btn",
    title: "Darstellung",
    body: "Zahnrad: Tageslicht/Nachtstadt, UI-Größe, Board-Qualität und Biom. Einstellungen bleiben auf diesem Gerät gespeichert."
  },
  {
    id: "setup-theme",
    section: "setup",
    scene: "setup",
    settings: "setup",
    target: "#setup-screen .js-theme-pick",
    title: "Licht",
    body: "Tag und Nacht ändern Farben und Stadtlicht. Zahlen und Besitz bleiben lesbar."
  },
  {
    id: "setup-scale",
    section: "setup",
    scene: "setup",
    settings: "setup",
    target: "#setup-screen .settings-scale",
    title: "UI-Größe",
    body: "Klein, Normal oder Groß skaliert Schriften und Knöpfe. Die Regeln ändern sich nicht."
  },
  {
    id: "setup-start",
    section: "setup",
    scene: "setup",
    target: "#btn-start-game",
    title: "Partie starten",
    body: "Startet mit Spielerzahl und Länge. Weiter in der Anleitung öffnet nur einen Übungsdistrikt. Beenden legt ihn weg."
  },
  {
    id: "hud-round",
    section: "hud",
    scene: "build",
    target: ".brand",
    title: "Verbleibende Tage",
    body: "Oben links: wie viele Tage der Probezeit noch bleiben. Am letzten Tag wird ausgewertet, falls niemand vorher 10 Punkte hat."
  },
  {
    id: "hud-turn",
    section: "hud",
    scene: "build",
    target: "#turn-row",
    title: "Wer dran ist",
    body: "Jeder Chip zeigt Farbe und Figur. Der aktive Zug ist hervorgehoben. Fremde Chips zeigen öffentliche Daten — inklusive Fortschritt der Rolle."
  },
  {
    id: "hud-wallet",
    section: "hud",
    scene: "build",
    target: ".wallet",
    title: "Ressourcen",
    body: "Energie, Geld und Bandbreite. Große Zahl = Vorrat, kleine mit Tilde = erwarteter Ertrag. Produktion kommt zu Zugbeginn als Flug von den Feldern."
  },
  {
    id: "hud-risk",
    section: "hud",
    scene: "build",
    target: ".risk-pill",
    title: "Risiko",
    body: "Zeigt die größte Ursache und die Schwelle. Ab Schwelle öffnet sich eine Ereigniskarte mit Wahl — die Folge steht vorher auf der Kachel."
  },
  {
    id: "hud-goal",
    section: "hud",
    scene: "build",
    target: "#goal-pill",
    title: "Rollenpunkte",
    body: "Dein Fortschritt in der eigenen Punktart (Farbe/Icon). Andere Arten siehst du nicht — nur was für deine Figur zählt."
  },
  {
    id: "dock-toggle",
    section: "district",
    scene: "build",
    target: "#dock",
    targetSheet: "#btn-dock-toggle",
    title: "Ziele und Feld",
    body: "Große Bildschirme: Seitenpanel. Schmal: „Ziele“ öffnet dasselbe Panel über dem Brett."
  },
  {
    id: "map",
    section: "district",
    scene: "build",
    target: "#map-viewport",
    title: "Distrikt",
    body: "Hex-Stadt. Straßen auf den Kanten, ein Hauptgebäude pro Feld. Rechtsziehen = Orbit, Linksziehen = Schieben, Rad = Zoom."
  },
  {
    id: "map-controls",
    section: "district",
    scene: "build",
    target: ".map-controls",
    title: "Zoom",
    body: "Plus/Minus und der Kreis setzen die Kamera zurück, damit Randfelder wieder im Bild sind."
  },
  {
    id: "coach",
    section: "district",
    scene: "build",
    target: "#table-hint",
    title: "Hinweiszeile",
    body: "Kurzer Satz, was der Zug gerade braucht. Toasts poppen darüber auf und verschwinden von selbst."
  },
  {
    id: "home-tile",
    section: "district",
    scene: "build",
    target: "#district-canvas",
    fallback: "#map-viewport",
    title: "Kontrollbüro",
    body: "Dein Startfeld. Jede Runde etwas von allen drei Ressourcen. Antippen: Geräte am Leitstand."
  },
  {
    id: "expand-tile",
    section: "district",
    scene: "build",
    target: "#district-canvas",
    fallback: "#map-viewport",
    title: "Nachbarfeld",
    body: "Leere Nachbarn kannst du bebauen. Erstes Feld oft als Startcoupon gratis. Danach kosten Ressourcen. Jeder Typ hat einen Einzeiler, was er tut."
  },
  {
    id: "legend",
    section: "district",
    scene: "build",
    dock: true,
    legend: true,
    target: "#board-legend",
    title: "Landnutzung",
    body: "Wohnen, Energie, Rechenzentrum, Verkehr. Der farbige Rand zeigt Besitz. Gebäudetyp vor Besitzfarbe lesen."
  },
  {
    id: "goals",
    section: "district",
    scene: "build",
    dock: true,
    target: "#goal-panel",
    title: "Wahlversprechen",
    body: "Figur, Punktart und Stand. Punkte entstehen an der Ursache (Bau, Karte, Ereignis, Handel) und fliegen zur Rolle. Bürgermeister = 10 Punkte oder beste Punktzahl am Limit."
  },
  {
    id: "tracks",
    section: "district",
    scene: "build",
    dock: true,
    target: "#goal-panel",
    title: "Stadtwerte vs. Sieg",
    body: "Image, Komfort, Umwelt und Sicherheit wirken weiter in Risiko und Events. Der Sieg läuft nur über deine Rollenpunkte — die Spurensumme gewinnt nicht."
  },
  {
    id: "zone",
    section: "district",
    scene: "zone",
    dock: true,
    target: "#zone-inspect",
    title: "Feld prüfen",
    body: "Typ, Besitzer, Ertrag. Eigene Felder: Aktionen im Feldmenü. Abriss nur, wenn das Netz zum Kontrollbüro verbunden bleibt. Das Büro selbst bleibt."
  },
  {
    id: "hand",
    section: "actions",
    scene: "build",
    target: "#project-fan",
    title: "Projekte",
    body: "Drei offene Projektkarten. Icon, Name, Vorzeichen und Menge. Langer Satz nur bei Halten. Kauf wirkt sofort und kann Rollenpunkte geben."
  },
  {
    id: "trade-btn",
    section: "actions",
    scene: "build",
    target: "#btn-trade",
    title: "Handeln",
    body: "Angebot mit Partner, Ressource und Menge. Beide Kassen sind vorher sichtbar. Getauscht wird erst bei Annahme."
  },
  {
    id: "end-btn",
    section: "actions",
    scene: "build",
    target: "#btn-end-round",
    title: "Zug beenden",
    body: "Schließt deinen Zug. In Runde 1 erst nach dem Startcoupon. Danach Übergabe an die nächste Person."
  },
  {
    id: "expand-types",
    section: "build",
    scene: "expand",
    target: "#expand-choices",
    title: "Feldtyp",
    body: "Wohnen (Bandbreite, braucht Rechenzentrum), Solar/Umspannwerk, ein Rechenzentrum (offen oder geschlossen), Parkplatz/Verkehr. Einzeiler auf der Kachel erklärt den Sinn."
  },
  {
    id: "expand-variant",
    section: "build",
    scene: "expand-variant",
    target: "#expand-variants",
    title: "Rechenzentrum",
    body: "Pro Person nur eines. Offen = günstiger, mehr Risiko. Geschlossen = teurer, sicherer. Später kannst du den Modus gegen Kosten wechseln."
  },
  {
    id: "devices",
    section: "build",
    scene: "home",
    target: "#device-list",
    title: "Geräte",
    body: "Cloud fällt bei Stromausfall aus und hebt Risiko. Lokal bleibt und stärkt Sicherheit. Alles Gebaute ist auf dem Brett sichtbar."
  },
  {
    id: "device-modes",
    section: "build",
    scene: "home-device",
    target: "#inspect-card",
    title: "Cloud oder lokal",
    body: "Cloud günstiger, braucht Bandbreite. Lokal teurer, läuft weiter. Jede Wahl braucht sichtbares Feedback am Gebäude."
  },
  {
    id: "trade-modal",
    section: "trade",
    scene: "trade",
    target: "#trade-modal .trade-actions",
    fallback: "#trade-modal .modal-card",
    title: "Handelsangebot",
    body: "Partner, Gabe, Wunsch, Mengen. Angebot senden legt es hin. Abbrechen schließt nur das Fenster."
  },
  {
    id: "trade-respond",
    section: "trade",
    scene: "trade_respond",
    target: "#trade-respond-modal .trade-actions",
    fallback: "#trade-respond-modal .modal-card",
    title: "Angebot prüfen",
    body: "Annehmen tauscht 1:1. Ablehnen verwirft. Die getippte Menge ist die Menge — kein Aufpreis."
  },
  {
    id: "event",
    section: "trade",
    scene: "event",
    target: "#event-choices",
    fallback: "#event-modal .modal-card",
    title: "Ereignis",
    body: "Karte nennt Ursache und Wahl. Effekte treffen Ressourcen, Spuren, Risiko oder Rollenpunkte — immer mit klarem Vorzeichen. Kein reiner Glückssieg."
  },
  {
    id: "role-reveal",
    section: "hotseat",
    scene: "role_reveal",
    target: "#btn-role-reveal-ok",
    fallback: "#role-reveal-modal .modal-card",
    title: "Rollen zeigen",
    body: "Zu Beginn erscheinen alle Figuren und Versprechen gemeinsam. Danach weiß der Tisch, wer worauf spielt."
  },
  {
    id: "handoff",
    section: "hotseat",
    scene: "handoff",
    target: "#btn-handoff-ok",
    fallback: "#handoff-modal .modal-card",
    title: "Zugübergabe",
    body: "Nur „du bist dran“. Kein Verdunkeln von Rolle oder Kasse — das Brett bleibt lesbar."
  },
  {
    id: "public-player",
    section: "hotseat",
    scene: "public",
    target: "#public-player-devices",
    fallback: "#public-player-modal .modal-card",
    title: "Öffentliche Ansicht",
    body: "Fremde Chips: Figur, Ausrichtung, Zonen, Geräte, Rollenfortschritt. So bleibt Kooperation und Konkurrenz nachvollziehbar."
  },
  {
    id: "end-screen",
    section: "hotseat",
    scene: "gameover",
    target: "#btn-restart",
    fallback: "#end-screen .modal-card",
    title: "Spielende",
    body: "Sofortsieg bei 10 Punkten nach voller Runde, sonst die meisten Rollenpunkte am Limit. Neue Partie führt zurück zum Start."
  },
  {
    id: "hud-gear",
    section: "hud",
    scene: "build",
    target: "#app .settings-wrap--hud .js-settings-btn",
    title: "Darstellung im Spiel",
    body: "Dieselbe Wahl wie am Start, ohne die Partie zu verlassen. Hilfe öffnet die Anleitung erneut."
  },
  {
    id: "hud-settings",
    section: "hud",
    scene: "build",
    settings: "hud",
    target: "#app .settings-wrap--hud .settings-panel",
    title: "Nacht und Größe",
    body: "Schalter wirken sofort. Danach Anleitung beenden oder mit Zurück noch einmal schauen."
  }
];
