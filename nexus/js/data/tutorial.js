window.Nexus = window.Nexus || {};

/* Schritttexte der Anleitung. Ablauf und Spotlight leben in main.js / render.js.
   section: Gruppierung für das Inhaltsverzeichnis. */
Nexus.TUTORIAL_SECTIONS = [
  { id: "setup", title: "Start" },
  { id: "hud", title: "Oberfläche" },
  { id: "district", title: "Distrikt & Panel" },
  { id: "actions", title: "Karten & Zug" },
  { id: "build", title: "Bauen & Geräte" },
  { id: "trade", title: "Handel & Ereignisse" },
  { id: "hotseat", title: "Übergabe & Ende" }
];

Nexus.TUTORIAL_STEPS = [
  {
    id: "setup-welcome",
    section: "setup",
    scene: "setup",
    target: "#setup-screen h2",
    title: "Neue Partie",
    body: "Hier beginnt jede Partie. Die Stadtteilmanager teilen sich ein Gerät und geben es weiter. Weiter, Zurück und Beenden — oder Pfeil rechts, Enter, Pfeil links und Escape. Inhalt springt zu einem Thema."
  },
  {
    id: "setup-count",
    section: "setup",
    scene: "setup",
    target: "#setup-player-count",
    title: "Spielerzahl",
    body: "Wähle zwei oder drei Personen. Bei zwei Spielern bleiben die Regeln gleich, Handels- und Blockadeziele werden nur angepasst."
  },
  {
    id: "setup-length",
    section: "setup",
    scene: "setup",
    target: "#setup-length",
    title: "Spiellänge",
    body: "Kurz, Standard oder Lang legt die Rundenzahl fest. Wer zuerst 100 % des eigenen Versprechens erreicht, gewinnt früher. Sonst zählt am Ende die höchste Prozentzahl."
  },
  {
    id: "setup-privacy",
    section: "setup",
    scene: "setup",
    target: "#setup-screen .setup-note",
    title: "Sichtbar und privat",
    body: "Geräte in der Cloud und der gewählte Standard der anderen sind öffentlich. Ressourcen und Wahlversprechen sieht nur die Person, die gerade das Gerät hält."
  },
  {
    id: "setup-gear",
    section: "setup",
    scene: "setup",
    target: "#setup-screen .js-settings-btn",
    title: "Darstellung",
    body: "Das Zahnrad öffnet Tageslicht und UI-Größe. Beides gilt für dieses Gerät und bleibt gespeichert, auch nach dem Schließen."
  },
  {
    id: "setup-theme",
    section: "setup",
    scene: "setup",
    settings: "setup",
    target: "#setup-screen .js-theme-toggle",
    title: "Tageslicht",
    body: "Der Schalter wechselt zwischen Tageslicht und Nachtstadt. Es ändern sich die Farben, keine verdeckten Angaben."
  },
  {
    id: "setup-scale",
    section: "setup",
    scene: "setup",
    settings: "setup",
    target: "#setup-screen .settings-scale",
    title: "UI-Größe",
    body: "Schieber oder die Stufen Klein, Normal und Groß skalieren Schriften und Knöpfe. Das Spiel selbst bleibt dasselbe."
  },
  {
    id: "setup-start",
    section: "setup",
    scene: "setup",
    target: "#btn-start-game",
    title: "Partie starten",
    body: "Dieser Knopf startet eine echte Partie mit Spielerzahl und Länge. Weiter öffnet nur einen Übungsdistrikt zum Umschauen. Beenden legt ihn weg und bringt dich hierher zurück."
  },
  {
    id: "hud-round",
    section: "hud",
    scene: "build",
    target: ".brand",
    title: "Runde",
    body: "Oben links stehen Name und die laufende Runde gegen das Limit. Nach der letzten Runde wird verglichen, falls niemand vorher gewonnen hat."
  },
  {
    id: "hud-turn",
    section: "hud",
    scene: "build",
    target: "#turn-row",
    title: "Wer dran ist",
    body: "Jede Person hat einen Chip mit Farbe und öffentlicher Ausrichtung. Der aktive Zug ist hervorgehoben. Ein fremder Chip zeigt später nur öffentliche Daten, nie Geldbörse oder Versprechen."
  },
  {
    id: "hud-wallet",
    section: "hud",
    scene: "build",
    target: ".wallet",
    title: "Ressourcen",
    body: "Energie, Geld und Bandbreite. Die große Zahl ist dein Vorrat, die kleine mit Tilde der erwartete Ertrag. In der Übergabe stehen hier Striche."
  },
  {
    id: "hud-risk",
    section: "hud",
    scene: "build",
    target: ".risk-pill",
    title: "Risiko",
    body: "Cloud-Geräte treiben das Risiko. Die Leiste wächst mit dem Wert. Solange das Gerät übergeben wird, ist die Zahl verdeckt."
  },
  {
    id: "hud-goal",
    section: "hud",
    scene: "build",
    target: "#goal-pill",
    title: "Versprechen, kurz",
    body: "Der Balken ist dein eigener Fortschritt in Prozent. Er ist nur auf deinem Zug da. Die anderen sehen ihn nicht."
  },
  {
    id: "dock-toggle",
    section: "district",
    scene: "build",
    target: "#dock",
    targetSheet: "#btn-dock-toggle",
    title: "Ziele und Feld",
    body: "Auf großen Bildschirmen bleibt das Seitenpanel offen. Auf schmalen Geräten öffnet „Ziele“ dasselbe Panel über dem Brett."
  },
  {
    id: "dock-close",
    section: "district",
    scene: "build",
    dock: true,
    target: "#dock",
    targetSheet: "#btn-dock-close",
    title: "Panel auf dem Telefon",
    body: "„Fertig“ legt das Panel auf schmalen Bildschirmen wieder weg. Das Brett bleibt bedienbar. Auf großen Bildschirmen steht das Panel fest daneben."
  },
  {
    id: "map",
    section: "district",
    scene: "build",
    target: "#map-viewport",
    title: "Distrikt",
    body: "Das Sechseckfeld ist die Stadt. Straßen laufen an den Kanten, Gebäude stehen auf den Feldern. Ziehen verschiebt die Ansicht."
  },
  {
    id: "map-controls",
    section: "district",
    scene: "build",
    target: ".map-controls",
    title: "Zoom",
    body: "Plus und Minus holen heran oder weg. Der Kreis setzt die Ansicht zurück, damit auch Randfelder wieder im Bild sind."
  },
  {
    id: "coach",
    section: "district",
    scene: "build",
    target: "#table-hint",
    title: "Hinweiszeile",
    body: "Hier steht, was der Zug gerade von dir erwartet. Kurze Meldungen können zusätzlich darüber aufpoppen und verschwinden von selbst."
  },
  {
    id: "home-tile",
    section: "district",
    scene: "build",
    target: "#district-svg .hex-home[data-mine=\"1\"]",
    title: "Kontrollbüro",
    body: "Dein Startfeld produziert jede Runde etwas von allen drei Ressourcen. Antippen öffnet die Geräte am Leitstand."
  },
  {
    id: "expand-tile",
    section: "district",
    scene: "build",
    target: "#district-svg .tile--open.is-buyable",
    fallback: "#district-svg .tile--open",
    title: "Nachbarfeld",
    body: "Leere Nachbarfelder mit Plus kannst du bebauen. In der ersten Runde ist das erste Feld ein Startcoupon und kostet nichts. Danach kostet Bauen Ressourcen."
  },
  {
    id: "legend",
    section: "district",
    scene: "build",
    dock: true,
    legend: true,
    target: "#board-legend",
    title: "Landnutzung",
    body: "Die Farben erklären Wohnen, Energie, Rechenzentrum, Verkehr und die Natur am Rand. Der farbige Rand eines Feldes zeigt den Besitzer."
  },
  {
    id: "goals",
    section: "district",
    scene: "build",
    dock: true,
    target: "#goal-panel",
    title: "Wahlversprechen",
    body: "Name und Unterziele stehen nur hier und nur für dich. Bürgermeister wird, wer 100 % erreicht oder am Ende am nächsten dran ist."
  },
  {
    id: "tracks",
    section: "district",
    scene: "build",
    dock: true,
    target: "#tracks-card",
    title: "Stadtspuren",
    body: "Image, Komfort, Umwelt und Sicherheit. Gebäude und Karten schieben diese Werte. Gewonnen wird über das Versprechen, nicht über die Summe der Spuren."
  },
  {
    id: "zone",
    section: "district",
    scene: "zone",
    dock: true,
    target: "#zone-inspect",
    title: "Feld prüfen",
    body: "Typ, Besitzer und letzter Wurf. Eigene Felder kannst du ausbauen. Abreißen geht nur, wenn der Rest mit dem Kontrollbüro verbunden bleibt. Das Büro selbst bleibt stehen."
  },
  {
    id: "standards",
    section: "actions",
    scene: "build",
    dock: true,
    target: "#standards-bar",
    title: "Standard",
    body: "Offen oder proprietär. Gleich und gleich darf handeln, gemischt ist blockiert. Offen kann einen Rabatt geben, wenn du Ware abgibst, die du nicht selbst erzeugt hast."
  },
  {
    id: "draw",
    section: "actions",
    scene: "build",
    target: "#btn-draw-deck",
    title: "Nachziehen",
    body: "Einmal pro Bauphase eine Innovationskarte, solange die Hand nicht voll ist. Die Zahl auf dem Stapel ist der Rest."
  },
  {
    id: "played",
    section: "actions",
    scene: "build",
    target: "#played-pile",
    title: "Ausgespielt",
    body: "Gespielte Karten landen hier. Die oberste bleibt lesbar, der Zähler zeigt, wie viele schon liegen."
  },
  {
    id: "hand",
    section: "actions",
    scene: "build",
    target: "#hand-fan",
    title: "Hand",
    body: "Ohne Karten steht hier ein Hinweis. Karten kommen aus der Ernte oder über Nachziehen und lassen sich nur in der Bauphase spielen."
  },
  {
    id: "hand-card",
    section: "actions",
    scene: "cards",
    target: "#hand-fan .play-card",
    fallback: "#hand-fan",
    title: "Karte ausspielen",
    body: "Kategorie, Name und Effekt stehen auf der Karte. Antippen spielt sie. In der Übung liegt nur ein Beispiel, es wird nichts verbucht."
  },
  {
    id: "trade-btn",
    section: "actions",
    scene: "build",
    target: "#btn-trade",
    title: "Handeln",
    body: "Öffnet ein Angebot mit Partner, Ressource und Menge. Getauscht wird erst, wenn die andere Person annimmt."
  },
  {
    id: "end-btn",
    section: "actions",
    scene: "build",
    target: "#btn-end-round",
    title: "Zug beenden",
    body: "Schließt deinen Zug. In der ersten Runde erst, nachdem der Startcoupon als Feld liegt. Danach folgt die Übergabe."
  },
  {
    id: "expand-types",
    section: "build",
    scene: "expand",
    target: "#expand-choices",
    title: "Feldtyp",
    body: "Vier Typen: Wohnen, Energie, Rechenzentrum, Verkehr. Vor- und Nachteile stehen auf der Kachel. Zurück bricht den Bau ab, ohne zu bauen."
  },
  {
    id: "expand-variant",
    section: "build",
    scene: "expand-variant",
    target: "#expand-variants",
    title: "Variante",
    body: "Energie und Rechenzentrum brauchen eine zweite Wahl, etwa Solar oder Trafo, günstig oder abgesichert. Erst dann steht das Gebäude."
  },
  {
    id: "devices",
    section: "build",
    scene: "home",
    target: "#device-list",
    title: "Geräte",
    body: "Der Leitstand listet alle Geräte. Leere kannst du bauen. Cloud ist öffentlich und riskant, lokal bleibt privat."
  },
  {
    id: "home-upgrade",
    section: "build",
    scene: "home",
    target: "#btn-home-upgrade",
    fallback: "#home-upgrade-wrap",
    title: "Büro ausbauen",
    body: "Eine höhere Stufe bringt mehr Ertrag auf allen drei Ressourcen und kostet Geld, später auch Energie. Schließen legt das Fenster weg, ohne zu bauen."
  },
  {
    id: "device-modes",
    section: "build",
    scene: "home-device",
    target: "#inspect-card",
    title: "Cloud oder lokal",
    body: "Cloud ist günstiger, erzeugt Risiko und ist für andere sichtbar. Lokal kostet mehr und bleibt verdeckt. Manche Geräte gibt es nur lokal."
  },
  {
    id: "sae",
    section: "build",
    scene: "sae",
    target: "#sae-panel",
    title: "SAE-Stufe",
    body: "Mit einem Mobilitätsgerät kannst du die SAE-Stufe ausbauen. Sie zählt fürs Verkehr-Versprechen und ist kein eigenes Spielfeld."
  },
  {
    id: "trade-modal",
    section: "trade",
    scene: "trade",
    target: "#trade-modal .trade-actions",
    fallback: "#trade-modal .modal-card",
    title: "Handelsangebot",
    body: "Oben wählst du Partner, Gabe, Wunsch und Mengen. Angebot senden legt es hin. Jetzt übergeben reicht das Gerät sofort weiter. Abbrechen schließt nur das Fenster."
  },
  {
    id: "trade-respond",
    section: "trade",
    scene: "trade_respond",
    target: "#trade-respond-modal .trade-actions",
    fallback: "#trade-respond-modal .modal-card",
    title: "Angebot prüfen",
    body: "Die andere Person sieht nur dieses Angebot. Geldbörse und Versprechen bleiben zu. Annehmen tauscht, Ablehnen verwirft."
  },
  {
    id: "event",
    section: "trade",
    scene: "event",
    target: "#event-choices",
    fallback: "#event-modal .modal-card",
    title: "Ereignis",
    body: "Manche Züge bringen eine Wahl. Die Knöpfe nennen Kosten und Wirkung. In der Übung wird nichts verbucht."
  },
  {
    id: "role-reveal",
    section: "hotseat",
    scene: "role_reveal",
    target: "#btn-role-reveal-ok",
    fallback: "#role-reveal-modal .modal-card",
    title: "Versprechen zeigen",
    body: "Zu Beginn liest jede Person allein ihr Versprechen und gibt das Gerät weiter. Das Brett dahinter ist abgedunkelt. In der Übung bleiben die Ziele absichtlich verdeckt."
  },
  {
    id: "handoff",
    section: "hotseat",
    scene: "handoff",
    target: "#btn-handoff-ok",
    fallback: "#handoff-modal .modal-card",
    title: "Zugübergabe",
    body: "Vor dem Zug bestätigt die nächste Person, dass sie dran ist. Ressourcen und Versprechen sind verdeckt, bis sie den Knopf drückt."
  },
  {
    id: "public-player",
    section: "hotseat",
    scene: "public",
    target: "#public-player-devices",
    fallback: "#public-player-modal .modal-card",
    title: "Öffentliche Ansicht",
    body: "Fremde Chips zeigen Ausrichtung, Standard, Zonen und nur Cloud-Geräte. Lokale Geräte erscheinen hier nicht."
  },
  {
    id: "end-screen",
    section: "hotseat",
    scene: "gameover",
    target: "#btn-restart",
    fallback: "#end-screen .modal-card",
    title: "Spielende",
    body: "Sofortsieg bei 100 % nach einer vollen Runde, sonst die höchste Prozentzahl. Neue Partie führt zurück zum Start. Diese Übung wertet nicht."
  },
  {
    id: "hud-gear",
    section: "hud",
    scene: "build",
    target: "#app .settings-wrap--hud .js-settings-btn",
    title: "Darstellung im Spiel",
    body: "Dieselbe Wahl wie am Start, ohne die Partie zu verlassen. Das Zahnrad sitzt oben rechts neben den Zielen. Hilfe öffnet die Anleitung erneut."
  },
  {
    id: "hud-settings",
    section: "hud",
    scene: "build",
    settings: "hud",
    target: "#app .settings-wrap--hud .settings-panel",
    title: "Nacht und Größe",
    body: "Schalter und Stufen wirken sofort auf die ganze Oberfläche. Danach kannst du die Anleitung beenden oder mit Zurück noch einmal schauen."
  }
];
