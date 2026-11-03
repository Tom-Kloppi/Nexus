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
        maxContribution: 40,
        higherIsBetter: true,
        metricKey: "environmentScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 5 },
          { stage: 2, metricValue: 4, cumulativePercent: 11 },
          { stage: 3, metricValue: 7, cumulativePercent: 22 },
          { stage: 4, metricValue: 11, cumulativePercent: 34 },
          { stage: 5, metricValue: 15, cumulativePercent: 40 }
        ]
      },
      {
        id: "green_innovation_cards",
        label: "Grüne Innovationskarten",
        maxContribution: 25,
        higherIsBetter: true,
        metricKey: "greenInnovationCards",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 3 },
          { stage: 2, metricValue: 2, cumulativePercent: 8 },
          { stage: 3, metricValue: 3, cumulativePercent: 14 },
          { stage: 4, metricValue: 4, cumulativePercent: 21 },
          { stage: 5, metricValue: 5, cumulativePercent: 25 }
        ]
      },
      {
        id: "image_score",
        label: "Image-Spur (sichtbare Begrünung / Öffis)",
        maxContribution: 20,
        higherIsBetter: true,
        metricKey: "imageScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 2 },
          { stage: 2, metricValue: 4, cumulativePercent: 6 },
          { stage: 3, metricValue: 7, cumulativePercent: 11 },
          { stage: 4, metricValue: 11, cumulativePercent: 17 },
          { stage: 5, metricValue: 15, cumulativePercent: 20 }
        ]
      },
      {
        id: "renewable_mobility",
        label: "Erneuerbare Buslinie (Halte an Solarstrom)",
        maxContribution: 15,
        higherIsBetter: true,
        metricKey: "renewableMobility",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 3 },
          { stage: 2, metricValue: 2, cumulativePercent: 6 },
          { stage: 3, metricValue: 3, cumulativePercent: 9 },
          { stage: 4, metricValue: 4, cumulativePercent: 12 },
          { stage: 5, metricValue: 5, cumulativePercent: 15 }
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
        maxContribution: 30,
        higherIsBetter: true,
        metricKey: "securityScore",
        steps: [
          { stage: 1, metricValue: 12, cumulativePercent: 4 },
          { stage: 2, metricValue: 24, cumulativePercent: 8 },
          { stage: 3, metricValue: 40, cumulativePercent: 14 },
          { stage: 4, metricValue: 60, cumulativePercent: 22 },
          { stage: 5, metricValue: 80, cumulativePercent: 30 }
        ]
      },
      {
        id: "own_risk_score",
        label: "Niedriges eigenes Risiko-Level",
        maxContribution: 24,
        higherIsBetter: false,
        metricKey: "ownRiskScore",
        steps: [
          { stage: 1, metricValue: 16, cumulativePercent: 3 },
          { stage: 2, metricValue: 11, cumulativePercent: 7 },
          { stage: 3, metricValue: 7, cumulativePercent: 12 },
          { stage: 4, metricValue: 4, cumulativePercent: 18 },
          { stage: 5, metricValue: 1, cumulativePercent: 24 }
        ]
      },
      {
        id: "local_processing_ratio",
        label: "Anteil lokal verarbeiteter Geräte",
        maxContribution: 16,
        higherIsBetter: true,
        metricKey: "localProcessingRatio",
        steps: [
          { stage: 1, metricValue: 25, cumulativePercent: 2 },
          { stage: 2, metricValue: 45, cumulativePercent: 5 },
          { stage: 3, metricValue: 65, cumulativePercent: 8 },
          { stage: 4, metricValue: 85, cumulativePercent: 12 },
          { stage: 5, metricValue: 100, cumulativePercent: 16 }
        ]
      },
      {
        id: "shielded_mobility",
        label: "Abgeschirmte SAE (lokal oder gesichert)",
        maxContribution: 30,
        higherIsBetter: true,
        metricKey: "shieldedSae",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 4 },
          { stage: 2, metricValue: 2, cumulativePercent: 10 },
          { stage: 3, metricValue: 3, cumulativePercent: 16 },
          { stage: 4, metricValue: 4, cumulativePercent: 23 },
          { stage: 5, metricValue: 5, cumulativePercent: 30 }
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
        maxContribution: 32,
        higherIsBetter: true,
        metricKey: "comfortScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 4 },
          { stage: 2, metricValue: 4, cumulativePercent: 10 },
          { stage: 3, metricValue: 7, cumulativePercent: 18 },
          { stage: 4, metricValue: 11, cumulativePercent: 27 },
          { stage: 5, metricValue: 15, cumulativePercent: 32 }
        ]
      },
      {
        id: "security_score",
        label: "Sicherheits-Spur (Wohlhaben)",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "securityScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 15 },
          { stage: 4, metricValue: 11, cumulativePercent: 23 },
          { stage: 5, metricValue: 15, cumulativePercent: 28 }
        ]
      },
      {
        id: "trade_volume",
        label: "Handelsvolumen (Wohnraum gegen Ressourcen)",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "tradeVolume",
        steps: [
          { stage: 1, metricValue: 8, cumulativePercent: 3 },
          { stage: 2, metricValue: 16, cumulativePercent: 8 },
          { stage: 3, metricValue: 28, cumulativePercent: 15 },
          { stage: 4, metricValue: 40, cumulativePercent: 23 },
          { stage: 5, metricValue: 55, cumulativePercent: 28 }
        ]
      },
      {
        id: "commerce_served",
        label: "Wohnen an eigenen Buslinien",
        maxContribution: 12,
        higherIsBetter: true,
        metricKey: "commerceServed",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 2 },
          { stage: 2, metricValue: 2, cumulativePercent: 4 },
          { stage: 3, metricValue: 3, cumulativePercent: 7 },
          { stage: 4, metricValue: 4, cumulativePercent: 10 },
          { stage: 5, metricValue: 5, cumulativePercent: 12 }
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
        maxContribution: 22,
        higherIsBetter: true,
        metricKey: "imageScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 2 },
          { stage: 2, metricValue: 4, cumulativePercent: 6 },
          { stage: 3, metricValue: 7, cumulativePercent: 11 },
          { stage: 4, metricValue: 11, cumulativePercent: 17 },
          { stage: 5, metricValue: 15, cumulativePercent: 22 }
        ]
      },
      {
        id: "comfort_score",
        label: "Komfort-Spur",
        maxContribution: 22,
        higherIsBetter: true,
        metricKey: "comfortScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 2 },
          { stage: 2, metricValue: 4, cumulativePercent: 6 },
          { stage: 3, metricValue: 7, cumulativePercent: 11 },
          { stage: 4, metricValue: 11, cumulativePercent: 17 },
          { stage: 5, metricValue: 15, cumulativePercent: 22 }
        ]
      },
      {
        id: "environment_score",
        label: "Umwelt-Spur",
        maxContribution: 22,
        higherIsBetter: true,
        metricKey: "environmentScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 2 },
          { stage: 2, metricValue: 4, cumulativePercent: 6 },
          { stage: 3, metricValue: 7, cumulativePercent: 11 },
          { stage: 4, metricValue: 11, cumulativePercent: 17 },
          { stage: 5, metricValue: 15, cumulativePercent: 22 }
        ]
      },
      {
        id: "security_score",
        label: "Sicherheits-Spur",
        maxContribution: 22,
        higherIsBetter: true,
        metricKey: "securityScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 2 },
          { stage: 2, metricValue: 4, cumulativePercent: 6 },
          { stage: 3, metricValue: 7, cumulativePercent: 11 },
          { stage: 4, metricValue: 11, cumulativePercent: 17 },
          { stage: 5, metricValue: 15, cumulativePercent: 22 }
        ]
      },
      {
        id: "sae_level",
        label: "SAE-Stufe der eigenen Flotte",
        maxContribution: 12,
        higherIsBetter: true,
        metricKey: "saeLevel",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 2 },
          { stage: 2, metricValue: 2, cumulativePercent: 4 },
          { stage: 3, metricValue: 3, cumulativePercent: 7 },
          { stage: 4, metricValue: 4, cumulativePercent: 10 },
          { stage: 5, metricValue: 5, cumulativePercent: 12 }
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
        maxContribution: 38,
        higherIsBetter: true,
        metricKey: "imageScore",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 4 },
          { stage: 2, metricValue: 2, cumulativePercent: 11 },
          { stage: 3, metricValue: 4, cumulativePercent: 20 },
          { stage: 4, metricValue: 5, cumulativePercent: 31 },
          { stage: 5, metricValue: 8, cumulativePercent: 38 }
        ]
      },
      {
        id: "environment_score",
        label: "Umwelt-Spur (nachhaltiges Mittelmaß)",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "environmentScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 3 },
          { stage: 2, metricValue: 4, cumulativePercent: 8 },
          { stage: 3, metricValue: 7, cumulativePercent: 15 },
          { stage: 4, metricValue: 11, cumulativePercent: 23 },
          { stage: 5, metricValue: 15, cumulativePercent: 28 }
        ]
      },
      {
        id: "distinct_trade_partners",
        label: "Handelspartner-Anteil",
        maxContribution: 22,
        higherIsBetter: true,
        metricKey: "tradePartnerRatio",
        steps: [
          { stage: 1, metricValue: 20, cumulativePercent: 2 },
          { stage: 2, metricValue: 40, cumulativePercent: 7 },
          { stage: 3, metricValue: 60, cumulativePercent: 12 },
          { stage: 4, metricValue: 80, cumulativePercent: 18 },
          { stage: 5, metricValue: 100, cumulativePercent: 22 }
        ]
      },
      {
        id: "linked_districts",
        label: "Fremde Halte an eigenen Linien",
        maxContribution: 12,
        higherIsBetter: true,
        metricKey: "linkPartnerRatio",
        steps: [
          { stage: 1, metricValue: 20, cumulativePercent: 2 },
          { stage: 2, metricValue: 40, cumulativePercent: 5 },
          { stage: 3, metricValue: 60, cumulativePercent: 8 },
          { stage: 4, metricValue: 80, cumulativePercent: 10 },
          { stage: 5, metricValue: 100, cumulativePercent: 12 }
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
        maxContribution: 40,
        higherIsBetter: true,
        metricKey: "comfortScore",
        steps: [
          { stage: 1, metricValue: 2, cumulativePercent: 5 },
          { stage: 2, metricValue: 4, cumulativePercent: 11 },
          { stage: 3, metricValue: 7, cumulativePercent: 22 },
          { stage: 4, metricValue: 11, cumulativePercent: 34 },
          { stage: 5, metricValue: 15, cumulativePercent: 40 }
        ]
      },
      {
        id: "zone_control_count",
        label: "Anzahl kontrollierter Zonen (Ausbau)",
        maxContribution: 28,
        higherIsBetter: true,
        metricKey: "zoneControlCount",
        steps: [
          { stage: 1, metricValue: 5, cumulativePercent: 3 },
          { stage: 2, metricValue: 8, cumulativePercent: 8 },
          { stage: 3, metricValue: 11, cumulativePercent: 15 },
          { stage: 4, metricValue: 14, cumulativePercent: 23 },
          { stage: 5, metricValue: 18, cumulativePercent: 28 }
        ]
      },
      {
        id: "money_throughput",
        label: "Kumulierte Geldproduktion (schnelle Lösungen)",
        maxContribution: 20,
        higherIsBetter: true,
        metricKey: "moneyThroughput",
        steps: [
          { stage: 1, metricValue: 40, cumulativePercent: 2 },
          { stage: 2, metricValue: 100, cumulativePercent: 6 },
          { stage: 3, metricValue: 180, cumulativePercent: 11 },
          { stage: 4, metricValue: 280, cumulativePercent: 17 },
          { stage: 5, metricValue: 400, cumulativePercent: 20 }
        ]
      },
      {
        id: "parking_sites",
        label: "Parkplätze und Parkhäuser",
        maxContribution: 12,
        higherIsBetter: true,
        metricKey: "parkingSites",
        steps: [
          { stage: 1, metricValue: 1, cumulativePercent: 2 },
          { stage: 2, metricValue: 2, cumulativePercent: 4 },
          { stage: 3, metricValue: 4, cumulativePercent: 7 },
          { stage: 4, metricValue: 6, cumulativePercent: 10 },
          { stage: 5, metricValue: 8, cumulativePercent: 12 }
        ]
      }
    ]
  }
};

Nexus.ROLES_BY_ID = {};
Nexus.ALL_ROLE_IDS.forEach(function (id) {
  Nexus.ROLES_BY_ID[id] = Nexus.ROLES[id];
});
