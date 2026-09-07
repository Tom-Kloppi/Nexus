window.Nexus = window.Nexus || {};

/* NEXUS 2.1 – Abschnitt 2.4: Phase-2-Rollen (climate, privacy, investor) */
Nexus.PHASE2_ROLE_IDS = ["climate", "privacy", "investor"];

Nexus.ROLES = {
  climate: {
    id: "climate",
    name: "Der Klimaingenieur",
    alignment: "Umwelt",
    subGoals: [
      {
        id: "energy_efficiency",
        label: "Energieeffizienz-Fortschritt",
        maxContribution: 45,
        higherIsBetter: true,
        metricKey: "energyEfficiency",
        steps: [
          { stage: 1, metricValue: 8, cumulativePercent: 5 },
          { stage: 2, metricValue: 18, cumulativePercent: 13 },
          { stage: 3, metricValue: 32, cumulativePercent: 25 },
          { stage: 4, metricValue: 50, cumulativePercent: 40 },
          { stage: 5, metricValue: 70, cumulativePercent: 45 }
        ]
      },
      {
        id: "local_processing_ratio",
        label: "Anteil lokal verarbeiteter Geräte",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "localProcessingRatio",
        steps: [
          { stage: 1, metricValue: 25, cumulativePercent: 4 },
          { stage: 2, metricValue: 45, cumulativePercent: 10 },
          { stage: 3, metricValue: 65, cumulativePercent: 19 },
          { stage: 4, metricValue: 85, cumulativePercent: 31 },
          { stage: 5, metricValue: 100, cumulativePercent: 35 }
        ]
      },
      {
        id: "green_innovation_cards",
        label: "Grüne Innovationskarten",
        maxContribution: 30,
        higherIsBetter: true,
        metricKey: "greenInnovationCards",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 3 },
          { stage: 2, metricValue: 2, cumulativePercent: 9 },
          { stage: 3, metricValue: 3, cumulativePercent: 17 },
          { stage: 4, metricValue: 4, cumulativePercent: 27 },
          { stage: 5, metricValue: 5, cumulativePercent: 30 }
        ]
      }
    ]
  },
  privacy: {
    id: "privacy",
    name: "Die Datenschützerin",
    alignment: "Datenschutz",
    subGoals: [
      {
        id: "own_risk_score",
        label: "Niedriges eigenes Risiko-Level",
        maxContribution: 55,
        higherIsBetter: false,
        metricKey: "ownRiskScore",
        steps: [
          { stage: 1, metricValue: 18, cumulativePercent: 6 },
          { stage: 2, metricValue: 13, cumulativePercent: 16 },
          { stage: 3, metricValue: 9, cumulativePercent: 31 },
          { stage: 4, metricValue: 5, cumulativePercent: 49 },
          { stage: 5, metricValue: 2, cumulativePercent: 55 }
        ]
      },
      {
        id: "local_processing_ratio",
        label: "Anteil lokal verarbeiteter Geräte",
        maxContribution: 40,
        higherIsBetter: true,
        metricKey: "localProcessingRatio",
        steps: [
          { stage: 1, metricValue: 25, cumulativePercent: 4 },
          { stage: 2, metricValue: 45, cumulativePercent: 12 },
          { stage: 3, metricValue: 65, cumulativePercent: 22 },
          { stage: 4, metricValue: 85, cumulativePercent: 36 },
          { stage: 5, metricValue: 100, cumulativePercent: 40 }
        ]
      },
      {
        id: "privacy_shield_events",
        label: "Abgewehrte Datenschutz-Ereignisse",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "privacyShieldEvents",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 4 },
          { stage: 2, metricValue: 2, cumulativePercent: 10 },
          { stage: 3, metricValue: 3, cumulativePercent: 19 },
          { stage: 4, metricValue: 4, cumulativePercent: 31 },
          { stage: 5, metricValue: 5, cumulativePercent: 35 }
        ]
      }
    ]
  },
  investor: {
    id: "investor",
    name: "Die Investorin",
    alignment: "Wirtschaft",
    subGoals: [
      {
        id: "total_resource_throughput",
        label: "Kumulierte Ressourcenproduktion",
        maxContribution: 55,
        higherIsBetter: true,
        metricKey: "totalResourceThroughput",
        steps: [
          { stage: 1, metricValue: 20, cumulativePercent: 6 },
          { stage: 2, metricValue: 45, cumulativePercent: 16 },
          { stage: 3, metricValue: 80, cumulativePercent: 31 },
          { stage: 4, metricValue: 130, cumulativePercent: 49 },
          { stage: 5, metricValue: 180, cumulativePercent: 55 }
        ]
      },
      {
        id: "trade_volume",
        label: "Abgeschlossenes Handelsvolumen",
        maxContribution: 40,
        higherIsBetter: true,
        metricKey: "tradeVolume",
        steps: [
          { stage: 1, metricValue: 10, cumulativePercent: 4 },
          { stage: 2, metricValue: 20, cumulativePercent: 12 },
          { stage: 3, metricValue: 35, cumulativePercent: 22 },
          { stage: 4, metricValue: 55, cumulativePercent: 36 },
          { stage: 5, metricValue: 75, cumulativePercent: 40 }
        ]
      },
      {
        id: "zone_control_count",
        label: "Anzahl kontrollierter Zonen",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "zoneControlCount",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 4 },
          { stage: 2, metricValue: 3, cumulativePercent: 10 },
          { stage: 3, metricValue: 4, cumulativePercent: 19 },
          { stage: 4, metricValue: 5, cumulativePercent: 31 },
          { stage: 5, metricValue: 6, cumulativePercent: 35 }
        ]
      }
    ]
  }
};

Nexus.ROLES_BY_ID = {};
Nexus.PHASE2_ROLE_IDS.forEach(function (id) {
  Nexus.ROLES_BY_ID[id] = Nexus.ROLES[id];
});
