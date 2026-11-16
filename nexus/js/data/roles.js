window.Nexus = window.Nexus || {};

Nexus.ALL_ROLE_IDS = [
  "climate",
  "privacy",
  "investor",
  "visionary",
  "networker",
  "controller"
];

/* Ein Ziel = haben / brauchen × Wert. Summe der vollen Punkte ist 10, das sind 100 %. */
function nexusRoleGoal(id, label, metricKey, need, worth) {
  var max = need * worth * 10;
  return {
    id: id,
    label: label,
    maxContribution: max,
    higherIsBetter: true,
    metricKey: metricKey,
    need: need,
    worth: worth,
    steps: [{ stage: 1, metricValue: need, cumulativePercent: max }]
  };
}

Nexus.ROLES = {
  climate: {
    id: "climate",
    name: "Grüne Stadt",
    alignment: "Umwelt",
    character: "Mira Blüte",
    party: "ÖZP",
    pitch: "Solar ernten und eine Linie ohne Diesel fahren.",
    subGoals: [
      nexusRoleGoal("environment_score", "Umwelt aus Solar", "environmentScore", 6, 1),
      nexusRoleGoal("renewable_mobility", "Halte an Öko-Linie", "renewableMobility", 2, 2)
    ]
  },
  privacy: {
    id: "privacy",
    name: "Datenfestung",
    alignment: "Sicherheit",
    character: "Isabella Roth",
    party: "PPP",
    pitch: "Rechnen vor Ort, nicht in der Wolke.",
    subGoals: [
      nexusRoleGoal("local_devices", "Lokale Geräte", "localDeviceCount", 3, 2),
      nexusRoleGoal("secure_dc", "Sichere Rechenzentren", "secureDatacenters", 2, 2)
    ]
  },
  investor: {
    id: "investor",
    name: "Dealmacherin",
    alignment: "Wirtschaft",
    character: "Maria Hinterberger",
    party: "Wnd",
    pitch: "Tauschen, was die anderen brauchen.",
    subGoals: [
      nexusRoleGoal("trade_volume", "Gehandelte Menge", "tradeVolume", 8, 1),
      nexusRoleGoal("comfort_score", "Komfort", "comfortScore", 2, 1)
    ]
  },
  visionary: {
    id: "visionary",
    name: "Morgenstadt",
    alignment: "Zukunft",
    character: "Jürgen Weiß",
    party: "PdZ",
    pitch: "Assistenz an der Linie, Komfort in der Stadt.",
    subGoals: [
      nexusRoleGoal("sae_level", "Assistenz", "saeLevel", 3, 2),
      nexusRoleGoal("comfort_score", "Komfort", "comfortScore", 4, 1)
    ]
  },
  networker: {
    id: "networker",
    name: "Querverkehr",
    alignment: "Image",
    character: "Thomas Smurf",
    party: "—",
    pitch: "Fremde Halte anbinden und handeln.",
    subGoals: [
      nexusRoleGoal("image_score", "Image aus fremden Halten", "imageScore", 5, 1),
      nexusRoleGoal("trade_volume", "Gehandelte Menge", "tradeVolume", 5, 1)
    ]
  },
  controller: {
    id: "controller",
    name: "Komfortzone",
    alignment: "Komfort",
    character: "Heinz Kohle",
    party: "AfAP",
    pitch: "Parken und Linien, die den Alltag leicht machen.",
    subGoals: [
      nexusRoleGoal("comfort_score", "Komfort", "comfortScore", 6, 1),
      nexusRoleGoal("parking_sites", "Parkhaus und Bahnhof", "parkingSites", 2, 2)
    ]
  }
};

Nexus.ROLES_BY_ID = {};
Nexus.ALL_ROLE_IDS.forEach(function (id) {
  Nexus.ROLES_BY_ID[id] = Nexus.ROLES[id];
});
