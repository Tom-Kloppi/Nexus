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
    short: "Zählt Cloud-Geräte ohne lokale Absicherung, unsichere Datenzentren und hohe SAE-Stufen ohne lokales V2X.",
    example: "Zwei Cloud-Geräte (6) und ein unsicheres Rechenzentrum (4) ergeben 10, bevor Schlösser abziehen.",
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
    short: "Proprietärer Standard, nur Cloud ohne Lokalbetrieb, nur Transformator ohne Solar.",
    example: "Proprietär und kein lokales Gerät: +8. Offener Standard und ein Home Hub ziehen das runter.",
    figure: "link"
  },
  verkehrslast: {
    title: "Verkehrslast",
    short: "Parkplätze ohne Linie erzeugen Last. Haltestellen, E-Bus und Parkhaus mit Ladesäule nehmen sie weg.",
    example: "Ein Parkplatz ohne Halt: Last 2. Dieselbe Kachel an einer E-Linie: Last 0.",
    figure: "bus"
  },
  sae: {
    title: "SAE-Stufe",
    short: "Assistenz bis vollautomatisch, Stufen 0–5. Höher braucht Sensorik, Rechnen und V2X und wird störanfälliger.",
    example: "Stufe 4 verlangt V2X und 2 Bandbreite. Stufe 5 zusätzlich lokales V2X oder ein gesichertes Datenzentrum.",
    figure: "bus"
  },
  v2x: {
    title: "V2X",
    short: "Fahrzeug spricht mit Kreuzung und Netz. Cloud-V2X erhöht die Cyber-Exposition, lokales V2X nicht.",
    example: "SAE 4 ohne V2X ist gesperrt. Mit lokalem V2X zählt die Stufe für das Teilziel „abgeschirmte Mobilität“.",
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
    short: "Spürbare Annehmlichkeit: Wohnlage, Bus, Parkhaus, SAE, smarte Geräte.",
    example: "Eine neue Buslinie gibt bis zu +2 Komfort auf Wohn-Haltestellen, Diesel zusätzlich +1 für Autostadt.",
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
