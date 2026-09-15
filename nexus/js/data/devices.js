window.Nexus = window.Nexus || {};

Nexus.DEVICES = [
  {
    id: "thermostat",
    name: "Smart-Thermostat",
    shortName: "Thermostat",
    effectText: "Spart 1 Energie pro Runde.",
    costs: {
      cloud: { money: 1 },
      local: { money: 2, energy: 1 }
    },
    cloudRiskPerRound: 1,
    cloudUpkeep: 1,
    energySave: 1,
    bandwidthGain: 0,
    scoreGain: { comfort: 1 }
  },
  {
    id: "camera",
    name: "Kamera-Netzwerk",
    shortName: "Kamera",
    effectText: "Erzeugt 1 Bandbreite pro Runde.",
    costs: {
      cloud: { money: 2, bandwidth: 1 },
      local: { money: 3, energy: 2 }
    },
    cloudRiskPerRound: 4,
    cloudUpkeep: 2,
    energySave: 0,
    bandwidthGain: 1
  },
  {
    id: "shutters",
    name: "Smart Shading",
    shortName: "Shading",
    effectText: "Spart 1 Energie pro Runde.",
    costs: {
      cloud: { money: 1, bandwidth: 1 },
      local: { money: 2, energy: 1 }
    },
    cloudRiskPerRound: 2,
    cloudUpkeep: 1,
    energySave: 1,
    bandwidthGain: 0,
    scoreGain: { comfort: 1 }
  },
  {
    id: "charger",
    name: "Ladesäule",
    shortName: "Ladesäule",
    effectText: "Zieht beim Bau einmalig 1 Innovationskarte.",
    costs: {
      cloud: { energy: 2, money: 1, bandwidth: 1 },
      local: { energy: 3, money: 2, bandwidth: 1 }
    },
    cloudRiskPerRound: 1,
    cloudUpkeep: 1,
    energySave: 0,
    bandwidthGain: 0
  },
  {
    id: "hub",
    name: "Home Hub",
    shortName: "Hub",
    effectText: "Nächster Gerätebau kostet 1 Ressource weniger. Nur lokal.",
    localOnly: true,
    costs: {
      local: { money: 3, energy: 3 }
    },
    cloudRiskPerRound: 0,
    cloudUpkeep: 0,
    energySave: 0,
    bandwidthGain: 0
  },
  {
    id: "lock",
    name: "Smart Lock",
    shortName: "Schloss",
    effectText: "Senkt das Gesamtrisiko beim Bau einmalig um 1. Lokal: +1 Sicherheit.",
    costs: {
      cloud: { money: 1, bandwidth: 1 },
      local: { money: 1, energy: 1, bandwidth: 1 }
    },
    cloudRiskPerRound: 1,
    cloudUpkeep: 1,
    energySave: 0,
    bandwidthGain: 0,
    scoreGain: { security: 1 }
  },
  {
    id: "hems",
    name: "HEMS (Energiemanagement)",
    shortName: "HEMS",
    effectText: "Verdoppelt die Energieeinsparung aller anderen aktiven Geräte.",
    requiresZoneType: "residential",
    isSpecial: true,
    costs: {
      cloud: { money: 2, bandwidth: 1 },
      local: { money: 3, energy: 2 }
    },
    cloudRiskPerRound: 3,
    cloudUpkeep: 1,
    energySave: 0,
    bandwidthGain: 0,
    scoreGain: { environment: 1 }
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
      local: { money: 3, energy: 2 }
    },
    cloudRiskPerRound: 0,
    energySave: 0,
    bandwidthGain: 0,
    scoreGain: { environment: 1 }
  },
  {
    id: "v2x",
    name: "V2X-Sender",
    shortName: "V2X",
    effectText: "Voraussetzung für SAE-Level-Ausbau im Mobilitätsnetz.",
    requiresZoneType: "traffic",
    isSpecial: true,
    costs: {
      cloud: { money: 2, bandwidth: 1 },
      local: { money: 3, energy: 2 }
    },
    cloudRiskPerRound: 4,
    cloudUpkeep: 2,
    energySave: 0,
    bandwidthGain: 0
  },
  {
    id: "charging_network",
    name: "Ladesäulen-Netz",
    shortName: "Ladenetz",
    effectText: "Ermöglicht SAE-Ausbau. SAE-Kosten: −1 Bandbreite.",
    requiresZoneType: "traffic",
    isSpecial: true,
    costs: {
      cloud: { money: 2 },
      local: { money: 3, energy: 1 }
    },
    cloudRiskPerRound: 2,
    cloudUpkeep: 1,
    energySave: 0,
    bandwidthGain: 0
  },
  {
    id: "peak_load",
    name: "Peak-Load-Control",
    shortName: "Peak Load",
    effectText: "+1 Effizienzpunkt pro Runde. Bau nur mit Wohngebiet.",
    requiresZoneType: "residential",
    isSpecial: true,
    costs: {
      cloud: { money: 1, bandwidth: 1 },
      local: { money: 2, energy: 1 }
    },
    cloudRiskPerRound: 2,
    cloudUpkeep: 1,
    energySave: 0,
    bandwidthGain: 0,
    efficiencyPerRound: 1
  }
];

Nexus.DEVICES_BY_ID = {};
Nexus.DEVICES.forEach(function (device) {
  Nexus.DEVICES_BY_ID[device.id] = device;
});
