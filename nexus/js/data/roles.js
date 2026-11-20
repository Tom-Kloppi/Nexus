window.Nexus = window.Nexus || {};

Nexus.ALL_ROLE_IDS = [
  "climate",
  "privacy",
  "investor",
  "visionary",
  "networker",
  "controller"
];

/* Eine Punktart pro Rolle. Sieg = 10 Rollenpunkte (oder meiste am Rundenlimit). */
Nexus.ROLE_POINT_TYPES = {
  eco: { key: "eco", label: "Ökopunkte", short: "Öko", color: "#2f9a62" },
  trust: { key: "trust", label: "Verlässlichkeit", short: "Fest", color: "#2a6fdb" },
  finance: { key: "finance", label: "Finanzpunkte", short: "Finanz", color: "#c4a23a" },
  innovation: { key: "innovation", label: "Innovationspunkte", short: "Neu", color: "#7a45c4" },
  image: { key: "image", label: "Imagepunkte", short: "Image", color: "#c43a5a" },
  comfort: { key: "comfort", label: "Komfortpunkte", short: "Komfort", color: "#d06a22" }
};

Nexus.ROLE_POINT_TARGET = 10;

function nexusRoleSheet(pointKey, how) {
  var pt = Nexus.ROLE_POINT_TYPES[pointKey];
  return {
    pointKey: pointKey,
    pointLabel: pt.label,
    pointShort: pt.short,
    pointColor: pt.color,
    how: how,
    /* Kompatibilität: ein „Unterziel“ = Rollenpunkte bis 10 */
    subGoals: [
      {
        id: "role_points",
        label: pt.label + " sammeln",
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
      pitch: "Solar, Öko-Linien und saubere Entscheidungen."
    },
    nexusRoleSheet(
      "eco",
      "Ökopunkte aus Solar/Erneuerbar-Linien, grünen Projekten und Umwelt-Ereignissen."
    )
  ),
  privacy: Object.assign(
    {
      id: "privacy",
      name: "Datenfestung",
      alignment: "Sicherheit",
      character: "Isabella Roth",
      party: "PPP",
      pitch: "Lokal rechnen, Risiken klein halten."
    },
    nexusRoleSheet(
      "trust",
      "Verlässlichkeit aus sicherem Rechenzentrum, lokalen Geräten und Cyber-Entscheidungen."
    )
  ),
  investor: Object.assign(
    {
      id: "investor",
      name: "Dealmacherin",
      alignment: "Wirtschaft",
      character: "Maria Hinterberger",
      party: "Wnd",
      pitch: "Handeln und die Stadt liquide halten."
    },
    nexusRoleSheet("finance", "Finanzpunkte aus Handel, Geldfluss und Wirtschafts-Ereignissen.")
  ),
  visionary: Object.assign(
    {
      id: "visionary",
      name: "Morgenstadt",
      alignment: "Zukunft",
      character: "Jürgen Weiß",
      party: "PdZ",
      pitch: "Neue Technik und smarte Linien."
    },
    nexusRoleSheet(
      "innovation",
      "Innovationspunkte aus Projekten, Elektro-/Öko-Linien und Zukunfts-Ereignissen."
    )
  ),
  networker: Object.assign(
    {
      id: "networker",
      name: "Querverkehr",
      alignment: "Image",
      character: "Thomas Smurf",
      party: "—",
      pitch: "Fremde Halte anbinden und sichtbar bleiben."
    },
    nexusRoleSheet("image", "Imagepunkte aus fremden Halten, Kooperation und Image-Ereignissen.")
  ),
  controller: Object.assign(
    {
      id: "controller",
      name: "Komfortzone",
      alignment: "Komfort",
      character: "Heinz Kohle",
      party: "AfAP",
      pitch: "Parken, Linien und Alltag erleichtern."
    },
    nexusRoleSheet(
      "comfort",
      "Komfortpunkte aus Verkehrsfeldern, Diesel-Linien und Alltags-Ereignissen."
    )
  )
};

Nexus.ROLES_BY_ID = {};
Nexus.ALL_ROLE_IDS.forEach(function (id) {
  Nexus.ROLES_BY_ID[id] = Nexus.ROLES[id];
});
