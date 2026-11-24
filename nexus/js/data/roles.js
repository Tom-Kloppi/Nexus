window.Nexus = window.Nexus || {};

Nexus.ALL_ROLE_IDS = [
  "climate",
  "privacy",
  "investor",
  "visionary",
  "networker",
  "controller"
];

/* Metrik-Farben Abgabe: Öko grün, Verlässlichkeit rot, Finanz gelb, Innovation weiß, Image blau, Komfort braun. */
Nexus.ROLE_POINT_TYPES = {
  eco: { key: "eco", label: "Öko", short: "Öko", color: "#2f9a62" },
  trust: { key: "trust", label: "Verlässlichkeit", short: "Fest", color: "#E02020" },
  finance: { key: "finance", label: "Finanz", short: "Finanz", color: "#F0C000" },
  innovation: { key: "innovation", label: "Innovation", short: "Neu", color: "#F7F4EC" },
  image: { key: "image", label: "Image", short: "Image", color: "#1560E0" },
  comfort: { key: "comfort", label: "Komfort", short: "Komfort", color: "#8B5A2B" }
};

Nexus.ROLE_POINT_TARGET = 10;
Nexus.VICTORY_POINT_TARGET = 10;

function nexusRoleSheet(pointKey, how) {
  var pt = Nexus.ROLE_POINT_TYPES[pointKey];
  return {
    pointKey: pointKey,
    pointLabel: pt.label,
    pointShort: pt.short,
    pointColor: pt.color,
    how: how,
    subGoals: [
      {
        id: "role_points",
        label: pt.label + " auf 10",
        maxContribution: 100,
        higherIsBetter: true,
        metricKey: "rolePoints",
        need: Nexus.ROLE_POINT_TARGET,
        worth: 1,
        steps: [{ stage: 1, metricValue: Nexus.ROLE_POINT_TARGET, cumulativePercent: 100 }]
      }
    ]
  };
}

Nexus.ROLES = {
  climate: Object.assign(
    {
      id: "climate",
      name: "Grüne Stadt",
      alignment: "Umwelt",
      character: "Mira Blüte",
      party: "ÖZP",
      pitch: "Wind, Recycling und Parks — saubere Entscheidungen."
    },
    nexusRoleSheet("eco", "Öko-Punkte über Windkraft, Recycling, Parks und grüne Aufträge.")
  ),
  privacy: Object.assign(
    {
      id: "privacy",
      name: "Datenfestung",
      alignment: "Sicherheit",
      character: "Isabella Roth",
      party: "PPP",
      pitch: "Verwaltung, Kohle-Stabilität und verlässliche Strukturen."
    },
    nexusRoleSheet("trust", "Verlässlichkeit über Verwaltungsbüro, Kohlekraftwerk, Bahnhof und Sicherheits-Events.")
  ),
  investor: Object.assign(
    {
      id: "investor",
      name: "Dealmacherin",
      alignment: "Wirtschaft",
      character: "Maria Hinterberger",
      party: "Wnd",
      pitch: "Großunternehmen, Serverfarm und Stall-Handel."
    },
    nexusRoleSheet("finance", "Finanz-Punkte über Großunternehmen, Serverfarm, Lager und Handel.")
  ),
  visionary: Object.assign(
    {
      id: "visionary",
      name: "Morgenstadt",
      alignment: "Zukunft",
      character: "Jürgen Weiß",
      party: "PdZ",
      pitch: "Atom, Fabrik und Bahnhof — Technik sichtbar machen."
    },
    nexusRoleSheet("innovation", "Innovation über Atom, Fabrik, Bahnhof und Tech-Events.")
  ),
  networker: Object.assign(
    {
      id: "networker",
      name: "Querverkehr",
      alignment: "Image",
      character: "Thomas Smurf",
      party: "—",
      pitch: "Wohnen, Kleinunternehmen und Parks — sichtbar bleiben."
    },
    nexusRoleSheet("image", "Image über Wohnen, Kleinunternehmen, Parks und Kooperation.")
  ),
  controller: Object.assign(
    {
      id: "controller",
      name: "Komfortzone",
      alignment: "Komfort",
      character: "Heinz Kohle",
      party: "AfAP",
      pitch: "Solar, E-Taxi und Lager — Alltag erleichtern."
    },
    nexusRoleSheet("comfort", "Komfort über Solar, E-Taxistand, Lagerfläche und Alltags-Events.")
  )
};

Nexus.ROLES_BY_ID = {};
Nexus.ALL_ROLE_IDS.forEach(function (id) {
  Nexus.ROLES_BY_ID[id] = Nexus.ROLES[id];
});

Nexus.SCORE_TRACK_ROLE = {
  eco: "climate",
  trust: "privacy",
  finance: "investor",
  innovation: "visionary",
  image: "networker",
  comfort: "controller"
};

Nexus.scoreTrackOwnerColor = function (state, key) {
  if (Nexus.ROLE_POINT_TYPES && Nexus.ROLE_POINT_TYPES[key]) {
    return Nexus.ROLE_POINT_TYPES[key].color;
  }
  return "#888888";
};
