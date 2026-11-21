window.Nexus = window.Nexus || {};

/* Fachbegriffe für Tooltips. Kurz, mit Beispiel, ohne Regelablauf. */
Nexus.GLOSSARY = {
  energie: {
    title: "Energie",
    short: "Solar 2 fest (Umwelt+), Trafo 3 fest (Geld/Einheit), Atom 5 fest mit hohem Risiko.",
    example: "Atom liefert viel Strom, hebt aber die Cyber-/Risiko-Zahl stark.",
    figure: "bolt"
  },
  geld: {
    title: "Geld",
    short: "Fabrik und Unternehmen erzeugen Geld. Fabrik skaliert mit Wohn-Nachbarn; Unternehmen starten 1→3→5 und werden mit jedem weiteren schwächer (5→3→1).",
    example: "Zwei Wohnfelder neben der Fabrik: Basis +2. Das zweite Unternehmen reift nur noch auf 3.",
    figure: "coin"
  },
  bandbreite: {
    title: "Daten",
    short: "Wohnen und Rechenzentren liefern Daten. Wohnen nur mit eigenem DC. Pro 7 eigene Felder ein weiteres Rechenzentrum.",
    example: "Mit 8 Feldern darfst du ein zweites Rechenzentrum bauen. Cloud-Geräte brauchen Daten als Upkeep.",
    figure: "arrows"
  },
  daten: {
    title: "Daten",
    short: "Wohnen und Rechenzentren liefern Daten. Wohnen nur mit eigenem DC. Pro 7 eigene Felder ein weiteres Rechenzentrum.",
    example: "Mit 8 Feldern darfst du ein zweites Rechenzentrum bauen. Cloud-Geräte brauchen Daten als Upkeep.",
    figure: "arrows"
  },
  datenschutz: {
    title: "Datenschutz",
    short: "Wie viel beim Gerät bleibt. Lokal senkt die Cyber-Exposition, Cloud ist billiger und angreifbarer.",
    example: "Kamera lokal: teurer, taucht nicht in der Cyber-Zahl auf. Cloud: +3 Exposition.",
    figure: "shield"
  },
  cyber: {
    title: "Cyber-Exposition",
    short: "Zählt Cloud-Geräte und offene Rechenzentren; lokale Geräte und geschlossene Rechenzentren ziehen ab.",
    example: "Zwei Cloud-Geräte und ein offenes Rechenzentrum ergeben hohe Exposition, bevor Schlösser abziehen.",
    figure: "shield"
  },
  netzstress: {
    title: "Netzstress",
    short: "Energiebedarf aus Wohnen und Cloud abzüglich Solar, Transformator, Speicher und Solardach.",
    example: "Bedarf 6, Solar und Speicher liefern 4: Stress 2. Ein weiterer Solarhof kann ihn auf 0 setzen.",
    figure: "bolt"
  },
  abhaengigkeit: {
    title: "Abhängigkeit",
    short: "Fließt in die Cyber-Ursache: nur Cloud ohne Lokal, oder nur Trafo ohne Solar.",
    example: "Cloud ohne lokales Gerät erhöht Cyber. Hub und Solar ziehen das runter.",
    figure: "link"
  },
  verkehrslast: {
    title: "Verkehrslast",
    short: "Fließt in die Netz-Ursache: Parken ohne Linie. Halte, E-Bus und Solardach nehmen Last weg.",
    example: "Parkplatz ohne Halt erhöht Netz. An einer Elektro-Linie sinkt die Last.",
    figure: "bus"
  },
  sae: {
    title: "Assistenz (entfernt)",
    short: "Die alte SAE-Leiter ist aus dem Spiel. Linien und Geräte tragen den Verkehr weiter.",
    example: "Statt Assistenz-Stufen zählen Antrieb, Halte und sichtbare Linien auf der Straße.",
    figure: "bus"
  },
  v2x: {
    title: "V2X",
    short: "Fahrzeug spricht mit Kreuzung und Netz. Cloud-V2X erhöht die Cyber-Exposition, lokales V2X nicht.",
    example: "V2X bleibt als Gerät nutzbar; es gibt keine Assistenz-Stufen mehr, die es freischalten.",
    figure: "bus"
  },
  autarkie: {
    title: "Autarkie",
    short: "Anteil der Energie, den Solar, Speicher und Solardächer gegenüber dem Bedarf decken.",
    example: "Bedarf 8, eigene Erzeugung 6: Autarkie 75 %. Der Rest hängt am Transformator oder am Zukauf.",
    figure: "bolt"
  },
  erneuerbar: {
    title: "Erneuerbaren-Anteil",
    short: "Solar und regenerativ geladene Busse gegenüber Transformator und Diesel.",
    example: "Zwei Solarhöfe und eine Diesel-Linie: der Anteil steigt mit jedem E-Bus, der an Solar hängt.",
    figure: "leaf"
  },
  resilienz: {
    title: "Resilienz",
    short: "Ob lokale Geräte, Speicher und verteilte Erzeugung einen Ausfall abfedern.",
    example: "Beim Blackout laufen lokale Geräte weiter. Cloud steht. Ein Batteriespeicher fängt 1 Energie auf.",
    figure: "shield"
  },
  komfort: {
    title: "Komfort",
    short: "Spürbare Annehmlichkeit: Wohnlage, Garagen, E-Taxi, smarte Geräte.",
    example: "Garagen und eine E-Taxi-Station geben Komfort, den man am Tisch sieht.",
    figure: "leaf"
  },
  datenzentrum: {
    title: "Datenzentrum",
    short: "Schaltet Bandbreite aus Wohnen frei. Ungesichert ist billig und erhöht Cyber. Gesichert kostet und stützt Sicherheit.",
    example: "Ohne Datenzentrum ist die Wohn-Bandbreite 0, auch wenn das Feld schon steht.",
    figure: "arrows"
  },
  buslinie: {
    title: "Buslinie",
    short: "Früher Buslinie — entfernt. Mobilität läuft über Garagen und E-Taxi-Stationen.",
    example: "Zwei Halten, 3 Kanten entfernt: 4 Geld und 1 Bandbreite. E-Antrieb senkt danach den Energiebedarf.",
    figure: "bus"
  }
};

Nexus.glossaryEntry = function (id) {
  return Nexus.GLOSSARY[id] || null;
};
