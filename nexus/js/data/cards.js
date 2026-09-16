window.Nexus = window.Nexus || {};

Nexus.INNOVATION_CARDS = [
  {
    id: "heat-pump",
    name: "Wärmepumpen-Pilot",
    category: "green",
    text: "Quartierswärme senkt den Verbrauch.",
    effects: { environment: 4 }
  },
  {
    id: "pv-facade",
    name: "PV-Fassade",
    category: "green",
    text: "Gebäudehülle erzeugt Strom.",
    effects: { energy: 2, environment: 2 }
  },
  {
    id: "green-ppa",
    name: "Grünstrom-PPA",
    category: "green",
    text: "Langfristiger Ökostromvertrag.",
    effects: { energy: 3, environment: 1 }
  },
  {
    id: "storage-dispatch",
    name: "Speicher-Dispatch",
    category: "green",
    text: "Batterien glätten Lastspitzen.",
    effects: { environment: 2, energy: 1 }
  },
  {
    id: "load-shift",
    name: "Lastverschiebung",
    category: "green",
    text: "Verbrauch wandert in Schwachlastzeiten.",
    effects: { environment: 2 }
  },
  {
    id: "zero-trust",
    name: "Zero-Trust-Architektur",
    category: "privacy",
    text: "Zugriffe werden streng segmentiert.",
    effects: { risk: -2, security: 1 }
  },
  {
    id: "on-device-ai",
    name: "On-Device-KI",
    category: "privacy",
    text: "Auswertung bleibt auf dem Gerät.",
    effects: { risk: -1, energy: 1, security: 1 }
  },
  {
    id: "data-minimization",
    name: "Datensparsamkeit",
    category: "privacy",
    text: "Nur nötige Daten werden erhoben.",
    effects: { risk: -2 }
  },
  {
    id: "v2g-pilot",
    name: "V2G-Pilot",
    category: "mobility",
    text: "Fahrzeuge speisen ins Netz zurück.",
    effects: { energy: 1, bandwidth: 1 }
  },
  {
    id: "sae-software",
    name: "SAE-Softwarestack",
    category: "mobility",
    text: "Gemeinsame Software für Assistenzstufen.",
    effects: { bandwidth: 2, comfort: 1 }
  },
  {
    id: "maas",
    name: "Mobility-as-a-Service",
    category: "mobility",
    text: "Verkehrsmittel werden gebündelt gebucht.",
    effects: { bandwidth: 2, image: 1 }
  },
  {
    id: "open-hub",
    name: "Open-Source-Hub",
    category: "general",
    text: "Offene Firmware für Heimgeräte.",
    effects: { money: 1, bandwidth: 1 }
  },
  {
    id: "civic-tech",
    name: "Civic-Tech-Plattform",
    category: "general",
    text: "Beteiligung der Stadtgesellschaft.",
    effects: { bandwidth: 2, image: 1 }
  },
  {
    id: "campus-5g",
    name: "5G-Campusnetz",
    category: "general",
    text: "Lokales Netz für Wohnen und Datenzentren.",
    effects: { bandwidth: 2 }
  },
  {
    id: "digital-twin",
    name: "Digitaler Zwilling",
    category: "general",
    text: "Das Quartier wird als Modell simuliert.",
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
