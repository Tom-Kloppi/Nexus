window.Nexus = window.Nexus || {};

Nexus.ALL_ROLE_IDS = [
  "climate",
  "privacy",
  "investor",
  "visionary",
  "networker",
  "controller"
];

Nexus.ROLES = {
  climate: {
    id: "climate",
    name: "Radikale Ökologie",
    alignment: "Umwelt",
    character: "Mira Blüte",
    party: "ÖZP",
    subGoals: [
      {
        id: "environment_score",
        label: "Umwelt-Spur (Fahrradstadt, Solarpflicht, Begrünung, Öffis)",
        maxContribution: 50,
        higherIsBetter: true,
        metricKey: "environmentScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 6 },
          { stage: 2, metricValue: 4, cumulativePercent: 14 },
          { stage: 3, metricValue: 7, cumulativePercent: 27 },
          { stage: 4, metricValue: 11, cumulativePercent: 42 },
          { stage: 5, metricValue: 15, cumulativePercent: 50 }
        ]
      },
      {
        id: "green_innovation_cards",
        label: "Grüne Innovationskarten",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "greenInnovationCards",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 4 },
          { stage: 2, metricValue: 2, cumulativePercent: 11 },
          { stage: 3, metricValue: 3, cumulativePercent: 20 },
          { stage: 4, metricValue: 4, cumulativePercent: 30 },
          { stage: 5, metricValue: 5, cumulativePercent: 35 }
        ]
      },
      {
        id: "image_score",
        label: "Image-Spur (sichtbare Begrünung / Öffis)",
        maxContribution: 25,
        higherIsBetter: true,
        metricKey: "imageScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 14 },
          { stage: 4, metricValue: 11, cumulativePercent: 21 },
          { stage: 5, metricValue: 15, cumulativePercent: 25 }
        ]
      }
    ]
  },
  privacy: {
    id: "privacy",
    name: "Datensicherheit",
    alignment: "Sicherheit",
    character: "Isabella Roth",
    party: "PPP",
    subGoals: [
      {
        id: "security_score",
        label: "Sicherheits-Spur (Cyberabwehr)",
        maxContribution: 45,
        higherIsBetter: true,
        metricKey: "securityScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 5 },
          { stage: 2, metricValue: 4, cumulativePercent: 13 },
          { stage: 3, metricValue: 7, cumulativePercent: 24 },
          { stage: 4, metricValue: 11, cumulativePercent: 37 },
          { stage: 5, metricValue: 15, cumulativePercent: 45 }
        ]
      },
      {
        id: "own_risk_score",
        label: "Niedriges eigenes Risiko-Level",
        maxContribution: 40,
        higherIsBetter: false,
        metricKey: "ownRiskScore",
        steps: [
          { stage: 1, metricValue: 18, cumulativePercent: 5 },
          { stage: 2, metricValue: 13, cumulativePercent: 12 },
          { stage: 3, metricValue: 9, cumulativePercent: 22 },
          { stage: 4, metricValue: 5, cumulativePercent: 34 },
          { stage: 5, metricValue: 2, cumulativePercent: 40 }
        ]
      },
      {
        id: "local_processing_ratio",
        label: "Anteil lokal verarbeiteter Geräte",
        maxContribution: 25,
        higherIsBetter: true,
        metricKey: "localProcessingRatio",
        steps: [
          { stage: 1, metricValue: 25, cumulativePercent: 3 },
          { stage: 2, metricValue: 45, cumulativePercent: 8 },
          { stage: 3, metricValue: 65, cumulativePercent: 14 },
          { stage: 4, metricValue: 85, cumulativePercent: 21 },
          { stage: 5, metricValue: 100, cumulativePercent: 25 }
        ]
      }
    ]
  },
  investor: {
    id: "investor",
    name: "Wirtschaftswunder",
    alignment: "Wirtschaft",
    character: "Maria Hinterberger",
    party: "Wnd",
    subGoals: [
      {
        id: "comfort_score",
        label: "Komfort-Spur (Wohlhaben)",
        maxContribution: 40,
        higherIsBetter: true,
        metricKey: "comfortScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 5 },
          { stage: 2, metricValue: 4, cumulativePercent: 12 },
          { stage: 3, metricValue: 7, cumulativePercent: 22 },
          { stage: 4, metricValue: 11, cumulativePercent: 34 },
          { stage: 5, metricValue: 15, cumulativePercent: 40 }
        ]
      },
      {
        id: "security_score",
        label: "Sicherheits-Spur (Wohlhaben)",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "securityScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 4 },
          { stage: 2, metricValue: 4, cumulativePercent: 10 },
          { stage: 3, metricValue: 7, cumulativePercent: 19 },
          { stage: 4, metricValue: 11, cumulativePercent: 29 },
          { stage: 5, metricValue: 15, cumulativePercent: 35 }
        ]
      },
      {
        id: "trade_volume",
        label: "Handelsvolumen (Wohnraum gegen Ressourcen)",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "tradeVolume",
        steps: [
          { stage: 1, metricValue: 10, cumulativePercent: 4 },
          { stage: 2, metricValue: 20, cumulativePercent: 10 },
          { stage: 3, metricValue: 35, cumulativePercent: 19 },
          { stage: 4, metricValue: 55, cumulativePercent: 29 },
          { stage: 5, metricValue: 75, cumulativePercent: 35 }
        ]
      }
    ]
  },
  visionary: {
    id: "visionary",
    name: "Eudämonische Stadt",
    alignment: "Zukunft",
    character: "Jürgen Weiß",
    party: "PdZ",
    subGoals: [
      {
        id: "image_score",
        label: "Image-Spur",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "imageScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 14 },
          { stage: 4, metricValue: 11, cumulativePercent: 22 },
          { stage: 5, metricValue: 15, cumulativePercent: 28 }
        ]
      },
      {
        id: "comfort_score",
        label: "Komfort-Spur",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "comfortScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 14 },
          { stage: 4, metricValue: 11, cumulativePercent: 22 },
          { stage: 5, metricValue: 15, cumulativePercent: 28 }
        ]
      },
      {
        id: "environment_score",
        label: "Umwelt-Spur",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "environmentScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 14 },
          { stage: 4, metricValue: 11, cumulativePercent: 22 },
          { stage: 5, metricValue: 15, cumulativePercent: 28 }
        ]
      },
      {
        id: "security_score",
        label: "Sicherheits-Spur",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "securityScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 14 },
          { stage: 4, metricValue: 11, cumulativePercent: 22 },
          { stage: 5, metricValue: 15, cumulativePercent: 28 }
        ]
      }
    ]
  },
  networker: {
    id: "networker",
    name: "Gemeinwohl auf Augenhöhe",
    alignment: "Image",
    character: "Thomas Smurf",
    party: "—",
    subGoals: [
      {
        id: "image_score",
        label: "Image-Spur (Zusammenarbeit)",
        maxContribution: 45,
        higherIsBetter: true,
        metricKey: "imageScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 5 },
          { stage: 2, metricValue: 4, cumulativePercent: 13 },
          { stage: 3, metricValue: 7, cumulativePercent: 24 },
          { stage: 4, metricValue: 11, cumulativePercent: 37 },
          { stage: 5, metricValue: 15, cumulativePercent: 45 }
        ]
      },
      {
        id: "environment_score",
        label: "Umwelt-Spur (nachhaltiges Mittelmaß)",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "environmentScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 4 },
          { stage: 2, metricValue: 4, cumulativePercent: 10 },
          { stage: 3, metricValue: 7, cumulativePercent: 19 },
          { stage: 4, metricValue: 11, cumulativePercent: 29 },
          { stage: 5, metricValue: 15, cumulativePercent: 35 }
        ]
      },
      {
        id: "distinct_trade_partners",
        label: "Handelspartner-Anteil",
        maxContribution: 30,
        higherIsBetter: true,
        metricKey: "tradePartnerRatio",
        steps: [
          { stage: 1, metricValue: 20, cumulativePercent: 3 },
          { stage: 2, metricValue: 40, cumulativePercent: 9 },
          { stage: 3, metricValue: 60, cumulativePercent: 16 },
          { stage: 4, metricValue: 80, cumulativePercent: 24 },
          { stage: 5, metricValue: 100, cumulativePercent: 30 }
        ]
      }
    ]
  },
  controller: {
    id: "controller",
    name: "Autostadt und Komfort",
    alignment: "Komfort",
    character: "Heinz Kohle",
    party: "AfAP",
    subGoals: [
      {
        id: "comfort_score",
        label: "Komfort-Spur (Auto-Infrastruktur)",
        maxContribution: 50,
        higherIsBetter: true,
        metricKey: "comfortScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 6 },
          { stage: 2, metricValue: 4, cumulativePercent: 14 },
          { stage: 3, metricValue: 7, cumulativePercent: 27 },
          { stage: 4, metricValue: 11, cumulativePercent: 42 },
          { stage: 5, metricValue: 15, cumulativePercent: 50 }
        ]
      },
      {
        id: "zone_control_count",
        label: "Anzahl kontrollierter Zonen (Ausbau)",
        maxContribution: 35,
        higherIsBetter: true,
        metricKey: "zoneControlCount",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 4 },
          { stage: 2, metricValue: 3, cumulativePercent: 10 },
          { stage: 3, metricValue: 4, cumulativePercent: 19 },
          { stage: 4, metricValue: 5, cumulativePercent: 29 },
          { stage: 5, metricValue: 6, cumulativePercent: 35 }
        ]
      },
      {
        id: "money_throughput",
        label: "Kumulierte Geldproduktion (schnelle Lösungen)",
        maxContribution: 25,
        higherIsBetter: true,
        metricKey: "moneyThroughput",
        steps: [
          { stage: 1, metricValue: 8, cumulativePercent: 3 },
          { stage: 2, metricValue: 18, cumulativePercent: 8 },
          { stage: 3, metricValue: 32, cumulativePercent: 14 },
          { stage: 4, metricValue: 50, cumulativePercent: 21 },
          { stage: 5, metricValue: 70, cumulativePercent: 25 }
        ]
      }
    ]
  }
};

Nexus.ROLES_BY_ID = {};
Nexus.ALL_ROLE_IDS.forEach(function (id) {
  Nexus.ROLES_BY_ID[id] = Nexus.ROLES[id];
});
