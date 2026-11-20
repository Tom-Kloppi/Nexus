window.Nexus = window.Nexus || {};

/* Projektkarten: kurz, spielbar, Kategorie steuert Rollenpunkt beim Kauf. */
Nexus.INNOVATION_CARDS = [
  {
    id: "heat-pump",
    name: "Wärmepumpen-Party",
    category: "green",
    text: "Das Quartier heizt mit Strom statt Öl. Weniger Schornstein, mehr Applaus.",
    effects: { environment: 2, energy: 1 }
  },
  {
    id: "pv-facade",
    name: "Sonnige Fassade",
    category: "green",
    text: "Die Hauswand verdient mit. Energie und Umwelt in einem Zug.",
    effects: { energy: 2, environment: 1 }
  },
  {
    id: "green-ppa",
    name: "Grünstrom-Deal",
    category: "green",
    text: "Langfristig Ökostrom — planbar statt Würfelwetter.",
    effects: { energy: 3, environment: 1 }
  },
  {
    id: "storage-dispatch",
    name: "Speicher-Trick",
    category: "green",
    text: "Batterien schlucken Spitzen. Das Netz atmet durch.",
    effects: { environment: 2, energy: 1 }
  },
  {
    id: "load-shift",
    name: "Nachtverbrauch",
    category: "green",
    text: "Waschmaschine um 2 Uhr? Die Last wandert, die Umwelt freut sich.",
    effects: { environment: 2 }
  },
  {
    id: "zero-trust",
    name: "Zero-Trust-Zaun",
    category: "privacy",
    text: "Jeder Zugriff braucht Ausweis. Hacker stehen vor der Tür.",
    effects: { risk: -2, security: 1 }
  },
  {
    id: "on-device-ai",
    name: "Hirn im Gerät",
    category: "privacy",
    text: "Auswertung bleibt lokal. Weniger Cloud, mehr Verlässlichkeit.",
    effects: { risk: -1, energy: 1, security: 1 }
  },
  {
    id: "data-minimization",
    name: "Weniger ist sicher",
    category: "privacy",
    text: "Nur nötige Daten speichern. Kleiner Angriffsraum.",
    effects: { risk: -2, security: 1 }
  },
  {
    id: "v2g-pilot",
    name: "Auto als Batterie",
    category: "mobility",
    text: "Parkende E-Autos speisen zurück. Zukunft, die man sieht.",
    effects: { energy: 1, bandwidth: 1, comfort: 1 }
  },
  {
    id: "line-software",
    name: "Linien-Software",
    category: "mobility",
    text: "Gemeinsame Software für Busse und Halte. Weniger Chaos an der Kreuzung.",
    effects: { bandwidth: 2, comfort: 1 }
  },
  {
    id: "maas",
    name: "Alles-Ticket",
    category: "mobility",
    text: "Bahn, Bus, Rad in einer App. Image und Bandbreite.",
    effects: { bandwidth: 2, image: 1 }
  },
  {
    id: "open-hub",
    name: "Offener Werkzeugkasten",
    category: "general",
    text: "Firmware frei für Heimgeräte. Partner können andocken.",
    effects: { money: 1, bandwidth: 1 }
  },
  {
    id: "civic-tech",
    name: "Mitmach-App",
    category: "general",
    text: "Bürger melden Löcher und Ideen. Image steigt, wenn du zuhörst.",
    effects: { bandwidth: 2, image: 1 }
  },
  {
    id: "campus-5g",
    name: "Campus-Funk",
    category: "general",
    text: "Lokales Netz für Wohnen und Rechenzentrum. Bandbreite ohne Drama.",
    effects: { bandwidth: 2 }
  },
  {
    id: "digital-twin",
    name: "Stadt-Doppelgänger",
    category: "general",
    text: "Das Quartier als Modell. Du testest, bevor du baust.",
    effects: { bandwidth: 1, energy: 1 }
  }
];

Nexus.INNOVATION_CATEGORY_LABELS = {
  green: "Grün",
  privacy: "Datenschutz",
  mobility: "Mobilität",
  general: "Allgemein"
};

Nexus.INNOVATION_CARDS_BY_ID = {};
Nexus.INNOVATION_CARDS.forEach(function (card) {
  Nexus.INNOVATION_CARDS_BY_ID[card.id] = card;
});
