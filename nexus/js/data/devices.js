window.Nexus = window.Nexus || {};

/* 9 Leitstand-Geräte: 6 Einzel-Metrik + 3 Doppel. Cloud günstig/riskant, Lokal teurer + Benefit. */
(function (Nexus) {
  function device(def) {
    return def;
  }

  Nexus.DEVICES = [
    device({
      id: "thermo",
      name: "Thermostat",
      shortName: "Thermostat",
      metrics: ["comfort"],
      effectText: "Cloud: −1 Energie/Runde. Lokal: −2 Energie und Karma+1 beim Bau.",
      costs: {
        cloud: { money: 1 },
        local: { money: 2, energy: 1 }
      },
      cloudKarmaRisk: 1,
      cloudUpkeep: 0,
      energySave: 1,
      localEnergySave: 2,
      localKarmaOnBuild: 1,
      bandwidthGain: 0
    }),
    device({
      id: "camera",
      name: "Kamera-Netz",
      shortName: "Kamera",
      metrics: ["image"],
      effectText: "Cloud: +1 Daten/Runde, Karma-Risiko. Lokal: +1 Daten ohne Leak-Risiko.",
      costs: {
        cloud: { money: 2, bandwidth: 1 },
        local: { money: 3, energy: 1, bandwidth: 1 }
      },
      cloudKarmaRisk: 2,
      cloudUpkeep: 1,
      energySave: 0,
      bandwidthGain: 1,
      localBandwidthGain: 1
    }),
    device({
      id: "lock",
      name: "Smart-Schloss",
      shortName: "Schloss",
      metrics: ["trust"],
      effectText: "Cloud: günstig. Lokal: Karma+1 beim Bau.",
      costs: {
        cloud: { money: 1, bandwidth: 1 },
        local: { money: 2, energy: 1, bandwidth: 1 }
      },
      cloudKarmaRisk: 1,
      cloudUpkeep: 0,
      energySave: 0,
      bandwidthGain: 0,
      localKarmaOnBuild: 1
    }),
    device({
      id: "hems",
      name: "Öko-Manager",
      shortName: "Öko-Mgr",
      metrics: ["eco"],
      effectText: "Cloud: −1 Energie. Lokal: verdoppelt Energie-Sparen anderer Geräte.",
      costs: {
        cloud: { money: 2, bandwidth: 1 },
        local: { money: 3, energy: 2 }
      },
      cloudKarmaRisk: 1,
      cloudUpkeep: 1,
      energySave: 1,
      localDoublesEnergySave: true,
      bandwidthGain: 0
    }),
    device({
      id: "ledger",
      name: "Abrechnungs-KI",
      shortName: "Ledger",
      metrics: ["finance"],
      effectText: "Cloud: +1 Geld/Runde, schwankend. Lokal: +1 Geld stabil, weniger Karma-Swing.",
      costs: {
        cloud: { money: 2 },
        local: { money: 3, bandwidth: 1 }
      },
      cloudKarmaRisk: 2,
      cloudUpkeep: 0,
      moneyGain: 1,
      localMoneyGain: 1,
      energySave: 0,
      bandwidthGain: 0
    }),
    device({
      id: "lab",
      name: "Sensorlabor",
      shortName: "Labor",
      metrics: ["innovation"],
      effectText: "Cloud: Chance auf Akte. Lokal: beim Bau 1 Akte ziehen.",
      costs: {
        cloud: { money: 2, bandwidth: 1 },
        local: { money: 3, energy: 1, bandwidth: 1 }
      },
      cloudKarmaRisk: 1,
      cloudUpkeep: 1,
      energySave: 0,
      bandwidthGain: 0,
      localDrawCardOnBuild: true,
      cloudDrawChance: 0.35
    }),
    device({
      id: "charger",
      name: "Ladesäule",
      shortName: "Lader",
      metrics: ["comfort", "finance"],
      effectText: "Beim Bau 1 Akte. Lokal: kein Cloud-Upkeep, Karma+0.",
      costs: {
        cloud: { energy: 2, money: 1, bandwidth: 1 },
        local: { energy: 3, money: 2, bandwidth: 1 }
      },
      cloudKarmaRisk: 1,
      cloudUpkeep: 1,
      energySave: 0,
      bandwidthGain: 0,
      drawCardOnBuild: true
    }),
    device({
      id: "edge",
      name: "Edge-Hub",
      shortName: "Edge",
      metrics: ["innovation", "trust"],
      effectText: "Nächstes Gerät −1 Geld. Lokal bevorzugt: Cloud teurer und riskant.",
      costs: {
        cloud: { money: 4, energy: 2, bandwidth: 2 },
        local: { money: 3, energy: 2 }
      },
      cloudKarmaRisk: 3,
      cloudUpkeep: 2,
      energySave: 0,
      bandwidthGain: 0,
      nextDeviceDiscount: 1
    }),
    device({
      id: "facade",
      name: "Fassaden-Steuerung",
      shortName: "Fassade",
      metrics: ["eco", "image"],
      effectText: "Cloud: −1 Energie. Lokal: −1 Energie und Karma+1 beim Bau.",
      costs: {
        cloud: { money: 1, bandwidth: 1 },
        local: { money: 2, energy: 1 }
      },
      cloudKarmaRisk: 1,
      cloudUpkeep: 0,
      energySave: 1,
      localEnergySave: 1,
      localKarmaOnBuild: 1,
      bandwidthGain: 0
    })
  ];

  Nexus.DEVICES_BY_ID = {};
  Nexus.DEVICES.forEach(function (d) {
    Nexus.DEVICES_BY_ID[d.id] = d;
  });
})(window.Nexus);
