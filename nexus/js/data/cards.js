window.Nexus = window.Nexus || {};

/* NEXUS 2.1 – Abschnitt 8.8: Innovationsstapel (Playtest-Startwerte) */
Nexus.INNOVATION_CARDS = [
  {
    id: "heat-pump",
    name: "Wärmepumpen-Pilot",
    category: "green",
    text: "Quartierswärme senkt den Verbrauch.",
    effects: { efficiency: 3 }
  },
  {
    id: "pv-facade",
    name: "PV-Fassade",
    category: "green",
    text: "Gebäudehülle erzeugt Strom.",
    effects: { energy: 2, efficiency: 1 }
  },
  {
    id: "green-ppa",
    name: "Grünstrom-PPA",
    category: "green",
    text: "Langfristiger Ökostromvertrag.",
    effects: { energy: 3 }
  },
  {
    id: "storage-dispatch",
    name: "Speicher-Dispatch",
    category: "green",
    text: "Batterien glätten Lastspitzen.",
    effects: { efficiency: 2, compute: 1 }
  },
  {
    id: "load-shift",
    name: "Lastverschiebung",
    category: "green",
    text: "Verbrauch wandert in Schwachlastzeiten.",
    effects: { efficiency: 2 }
  },
  {
    id: "zero-trust",
    name: "Zero-Trust-Architektur",
    category: "privacy",
    text: "Zugriffe werden streng segmentiert.",
    effects: { privacy: 2 }
  },
  {
    id: "on-device-ai",
    name: "On-Device-KI",
    category: "privacy",
    text: "Auswertung bleibt auf dem Gerät.",
    effects: { privacy: 1, compute: 1 }
  },
  {
    id: "data-minimization",
    name: "Datensparsamkeit",
    category: "privacy",
    text: "Nur nötige Daten werden erhoben.",
    effects: { privacy: 2 }
  },
  {
    id: "v2g-pilot",
    name: "V2G-Pilot",
    category: "mobility",
    text: "Fahrzeuge speisen ins Netz zurück.",
    effects: { energy: 1, connectivity: 1 }
  },
  {
    id: "sae-software",
    name: "SAE-Softwarestack",
    category: "mobility",
    text: "Gemeinsame Software für Assistenzstufen.",
    effects: { compute: 2 }
  },
  {
    id: "maas",
    name: "Mobility-as-a-Service",
    category: "mobility",
    text: "Verkehrsmittel werden gebündelt gebucht.",
    effects: { connectivity: 2 }
  },
  {
    id: "open-hub",
    name: "Open-Source-Hub",
    category: "general",
    text: "Offene Firmware für Heimgeräte.",
    effects: { hardware: 1, connectivity: 1 }
  },
  {
    id: "civic-tech",
    name: "Civic-Tech-Plattform",
    category: "general",
    text: "Beteiligung der Stadtgesellschaft.",
    effects: { data: 2 }
  },
  {
    id: "campus-5g",
    name: "5G-Campusnetz",
    category: "general",
    text: "Lokales Netz für Gewerbe und Infra.",
    effects: { connectivity: 2 }
  },
  {
    id: "digital-twin",
    name: "Digitaler Zwilling",
    category: "general",
    text: "Das Quartier wird als Modell simuliert.",
    effects: { data: 1, compute: 1 }
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
