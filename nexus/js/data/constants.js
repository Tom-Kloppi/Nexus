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

Nexus.CONSTANTS = {
  MAX_ROUNDS: 15,
  START_RESOURCES: 2,
  PRIVACY_BASE: 20,
  EVENT_EVERY_N_ROUNDS: 2,
  DICE_COUNT: 2,
  DICE_SIDES: 6,
  DEVICE_INNOVATION: 2,
  HEMS_INNOVATION: 4,
  CHARGER_INNOVATION_BONUS: 2,
  LOCK_RISK_REDUCTION: 1,
  LOG_LIMIT: 40,
  HUB_DISCOUNT_TIE_ORDER: ["connectivity", "energy", "data", "hardware", "compute"]
};

Nexus.DISTRICT_TILES = [
  { id: 1, resource: "energy", number: 6 },
  { id: 2, resource: "data", number: 8 },
  { id: 3, resource: "compute", number: 5 },
  { id: 4, resource: "hardware", number: 9 },
  { id: 5, resource: "connectivity", number: 4 },
  { id: 6, resource: "energy", number: 10 }
];
