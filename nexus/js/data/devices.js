window.Nexus = window.Nexus || {};

Nexus.DEVICES = [
  {
    id: "thermostat",
    name: "Smart-Thermostat",
    effectText: "Spart 1 Energie pro Runde.",
    costs: {
      cloud: { energy: 2, connectivity: 1 },
      local: { energy: 2, compute: 2, hardware: 1 }
    },
    cloudRiskPerRound: 1,
    energySave: 1,
    dataGain: 0
  },
  {
    id: "camera",
    name: "Smart-Kamera",
    effectText: "Erzeugt 1 Daten pro Runde.",
    costs: {
      cloud: { hardware: 1, connectivity: 1 },
      local: { hardware: 1, compute: 2 }
    },
    cloudRiskPerRound: 2,
    energySave: 0,
    dataGain: 1
  },
  {
    id: "shutters",
    name: "Rollladensteuerung",
    effectText: "Spart 1 Energie pro Runde.",
    costs: {
      cloud: { energy: 1, connectivity: 1 },
      local: { energy: 1, compute: 1, hardware: 1 }
    },
    cloudRiskPerRound: 1,
    energySave: 1,
    dataGain: 0
  },
  {
    id: "charger",
    name: "Ladesäule",
    effectText: "+2 Innovationspunkte beim Bau (einmalig).",
    costs: {
      cloud: { energy: 2, hardware: 1, connectivity: 1 },
      local: { energy: 3, hardware: 2, compute: 1 }
    },
    cloudRiskPerRound: 1,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "hub",
    name: "Sprachassistent / Hub",
    effectText: "Nächster Gerätebau kostet 1 Ressource weniger.",
    costs: {
      cloud: { data: 1, connectivity: 1 },
      local: { data: 1, compute: 2, hardware: 1 }
    },
    cloudRiskPerRound: 2,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "lock",
    name: "Smart Lock",
    effectText: "Senkt das Gesamtrisiko beim Bau einmalig um 1.",
    costs: {
      cloud: { hardware: 1, connectivity: 1 },
      local: { hardware: 1, compute: 1, energy: 1 }
    },
    cloudRiskPerRound: 1,
    energySave: 0,
    dataGain: 0
  },
  {
    id: "hems",
    name: "HEMS (Energiemanagement)",
    effectText: "Verdoppelt die Energieeinsparung aller anderen aktiven Geräte.",
    costs: {
      cloud: { energy: 2, data: 2, connectivity: 1 },
      local: { energy: 2, compute: 3, hardware: 2 }
    },
    cloudRiskPerRound: 2,
    energySave: 0,
    dataGain: 0
  }
];

Nexus.DEVICES_BY_ID = {};
Nexus.DEVICES.forEach(function (device) {
  Nexus.DEVICES_BY_ID[device.id] = device;
});
