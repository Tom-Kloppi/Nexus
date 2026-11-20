window.Nexus = window.Nexus || {};

/* Fachbegriffe für Tooltips. Kurz, mit Beispiel, ohne Regelablauf. */
Nexus.GLOSSARY = {
  energie: {
    title: "Energie",
    short: "Strom im Quartier. Solar schwankt, der Transformator ist stabil und kostet Geld.",
    example: "Eine Solarfarm mit Basis 3 würfelt meist 2–4 Energie.",
    figure: "bolt"
  },
  geld: {
    title: "Geld",
    short: "Bauen, Linien und der Transformator brauchen Geld. Verkehr und Wohnen an der Linie bringen welches ein.",
    example: "Ein Parkhaus kostet 4 Geld und 2 Energie und liefert danach Solar vom Dach.",
    figure: "coin"
  },
  bandbreite: {
    title: "Bandbreite",
    short: "Datenleitung. Wohnen erzeugt sie nur mit eigenem Datenzentrum. Cloud-Geräte verbrauchen sie als Upkeep.",
    example: "Zwei Cloud-Kameras können mehr Upkeep ziehen, als ein Wohnfeld liefert.",
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
    short: "Zählt Cloud-Geräte und offene Rechenzentren; lokale Geräte und geschlossene RZ ziehen ab.",
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
    short: "Nur Cloud ohne Lokalbetrieb, oder nur Transformator ohne Solar.",
    example: "Cloud ohne lokales Gerät: +4. Ein Home Hub und etwas Solar ziehen das runter.",
    figure: "link"
  },
  verkehrslast: {
    title: "Verkehrslast",
    short: "Parkplätze ohne Linie erzeugen Last. Haltestellen, E-Bus und Parkhaus mit Ladesäule nehmen sie weg.",
    example: "Ein Parkplatz ohne Halt: Last 2. Dieselbe Kachel an einer E-Linie: Last 0.",
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
    short: "Spürbare Annehmlichkeit: Wohnlage, Bus, Parkhaus, smarte Geräte.",
    example: "Eine neue Buslinie und ein Parkhaus geben Komfort, den man am Tisch sieht.",
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
    short: "Verbindung eigener oder fremder Haltestellen über den Straßengraphen. Braucht einen Busbahnhof.",
    example: "Zwei Halten, 3 Kanten entfernt: 4 Geld und 1 Bandbreite. E-Antrieb senkt danach den Energiebedarf.",
    figure: "bus"
  }
};

Nexus.glossaryEntry = function (id) {
  return Nexus.GLOSSARY[id] || null;
};
