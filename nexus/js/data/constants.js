window.Nexus = window.Nexus || {};

Nexus.RESOURCE_KEYS = ["energy", "data", "compute", "hardware", "connectivity"];

Nexus.RESOURCE_LABELS = {
  energy: "Energie",
  data: "Daten",
  compute: "Rechenleistung",
  hardware: "Bauteile",
  connectivity: "Konnektivität"
};

Nexus.RESOURCE_SHORT = {
  energy: "Energie",
  data: "Daten",
  compute: "Rechenl.",
  hardware: "Bauteile",
  connectivity: "Konnekt."
};

Nexus.RESOURCE_COLORS = {
  energy: "#f0c14b",
  data: "#5b9dff",
  compute: "#c084fc",
  hardware: "#fb923c",
  connectivity: "#2dd4bf"
};

Nexus.CONSTANTS = {
  MAX_ROUNDS: 15,
  START_RESOURCES: 3,
  START_PLOT_COUNT: 5,
  PRIVACY_BASE: 20,
  EVENT_EVERY_N_ROUNDS: 2,
  DEVICE_INNOVATION: 2,
  HEMS_INNOVATION: 4,
  CHARGER_INNOVATION_BONUS: 2,
  LOCK_RISK_REDUCTION: 1,
  LOG_LIMIT: 28,
  HEX_RADIUS: 2,
  HEX_SIZE: 72,
  EXPAND_REQUIRES_ADJACENT: true,
  TILE_SPIN_MS: 900,
  HARVEST_STAGGER_MS: 120,
  HUB_DISCOUNT_TIE_ORDER: ["connectivity", "energy", "data", "hardware", "compute"],
  PRODUCTION_BANDS: [
    { id: "fail", amount: 0, weight: 8, label: "Ausfall", color: "#8a3a3a" },
    { id: "low", amount: 1, weight: 48, label: "Niedrig", color: "#c47a2c" },
    { id: "normal", amount: 2, weight: 34, label: "Normal", color: "#2f8f72" },
    { id: "high", amount: 3, weight: 10, label: "Viel", color: "#d7b44a" }
  ]
};

/* Start mit allen 5 Ressourcentypen, damit Planung sofort möglich ist */
Nexus.START_PLOTS = [
  { q: 0, r: 0, resource: "energy" },
  { q: 1, r: 0, resource: "data" },
  { q: 0, r: 1, resource: "hardware" },
  { q: -1, r: 1, resource: "compute" },
  { q: 1, r: -1, resource: "connectivity" }
];
