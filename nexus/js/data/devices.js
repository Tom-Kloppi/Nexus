window.Nexus = window.Nexus || {};

Nexus.DEVICES = [
  {
    id: "thermostat",
    name: "Smart-Thermostat",
    shortName: "Thermostat",
    effectText: "Spart 1 Energie pro Runde.",
    costs: {
      cloud: { hardware: 1 },
      local: { hardware: 2, compute: 1 }
    },
    cloudRiskPerRound: 1,
    cloudUpkeep: 1,
    energySave: 1,
    dataGain: 0
  },
  {
    id: "camera",
    name: "Kamera-Netzwerk",
    shortName: "Kamera",
    effectText: "Erzeugt 1 Daten pro Runde.",
    costs: {
      cloud: { hardware: 2, data: 1 },
      local: { hardware: 3, compute: 2 }
    },
    cloudRiskPerRound: 4,
    cloudUpkeep: 2,
    energySave: 0,
    dataGain: 1
  },
  {
    id: "shutters",
    name: "Smart Shading",
    shortName: "Shading",
    effectText: "Spart 1 Energie pro Runde.",
    costs: {
      cloud: { hardware: 1, data: 1 },
      local: { hardware: 2, compute: 1 }
    },
    cloudRiskPerRound: 2,
    cloudUpkeep: 1,
    energySave: 1,
    dataGain: 0
  },
  {
    id: "charger",
    name: "Ladesäule",
    shortName: "Ladesäule",
    effectText: "+2 Innovationspunkte beim Bau (einmalig).",
    costs: {
      cloud: { energy: 2, hardware: 1, connectivity: 1 },
      local: { energy: 3, hardware: 2, compute: 1 }
    },
    cloudRiskPerRound: 1,
    cloudUpkeep: 1,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "hub",
    name: "Home Hub",
    shortName: "Hub",
    effectText: "Nächster Gerätebau kostet 1 Ressource weniger. Nur lokal.",
    localOnly: true,
    costs: {
      local: { hardware: 3, compute: 3 }
    },
    cloudRiskPerRound: 0,
    cloudUpkeep: 0,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "lock",
    name: "Smart Lock",
    shortName: "Schloss",
    effectText: "Senkt das Gesamtrisiko beim Bau einmalig um 1.",
    costs: {
      cloud: { hardware: 1, connectivity: 1 },
      local: { hardware: 1, compute: 1, energy: 1 }
    },
    cloudRiskPerRound: 1,
    cloudUpkeep: 1,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "hems",
    name: "HEMS (Energiemanagement)",
    shortName: "HEMS",
    effectText: "Verdoppelt die Energieeinsparung aller anderen aktiven Geräte.",
    requiresZoneType: "commercial",
    isSpecial: true,
    costs: {
      cloud: { hardware: 2, data: 1 },
      local: { hardware: 3, compute: 2 }
    },
    cloudRiskPerRound: 3,
    cloudUpkeep: 1,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "storage_battery",
    name: "Speicherbatterie",
    shortName: "Batterie",
    effectText: "Neutralisiert pro Runde einen negativen Fabrik-Modifikator (−1).",
    requiresZoneType: "energy",
    isSpecial: true,
    localOnly: true,
    costs: {
      local: { hardware: 3, energy: 2 }
    },
    cloudRiskPerRound: 0,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "v2x",
    name: "V2X-Sender",
    shortName: "V2X",
    effectText: "Voraussetzung für SAE-Level-Ausbau im Mobilitätsnetz.",
    requiresZoneType: "infrastructure",
    isSpecial: true,
    costs: {
      cloud: { hardware: 2, data: 1 },
      local: { hardware: 3, compute: 2 }
    },
    cloudRiskPerRound: 4,
    cloudUpkeep: 2,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "charging_network",
    name: "Ladesäulen-Netz",
    shortName: "Ladenetz",
    effectText: "Ermöglicht SAE-Ausbau und Mobilitätsbonus.",
    requiresZoneType: "infrastructure",
    isSpecial: true,
    costs: {
      cloud: { hardware: 2 },
      local: { hardware: 3, compute: 1 }
    },
    cloudRiskPerRound: 2,
    cloudUpkeep: 1,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "peak_load",
    name: "Peak-Load-Control",
    shortName: "Peak Load",
    effectText: "+1 Effizienzpunkte pro Runde in der Gewerbezone.",
    requiresZoneType: "commercial",
    isSpecial: true,
    costs: {
      cloud: { hardware: 1, data: 1 },
      local: { hardware: 2, compute: 1 }
    },
    cloudRiskPerRound: 2,
    cloudUpkeep: 1,
    energySave: 0,
    dataGain: 0,
    efficiencyPerRound: 1
  }
];

Nexus.DEVICES_BY_ID = {};
Nexus.DEVICES.forEach(function (device) {
  Nexus.DEVICES_BY_ID[device.id] = device;
});
