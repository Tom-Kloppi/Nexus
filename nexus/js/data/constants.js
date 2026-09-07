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

/* NEXUS 2.1 – Abschnitt 3.2: Zone-Ressourcen-Zuordnung */
Nexus.ZONE_TYPE_KEYS = ["residential", "commercial", "infrastructure", "energy"];

Nexus.ZONE_TYPES = {
  residential: {
    id: "residential",
    label: "Wohngebiet",
    shortLabel: "Wohnen",
    primary: "data",
    primaryBase: 2
  },
  commercial: {
    id: "commercial",
    label: "Gewerbe",
    shortLabel: "Gewerbe",
    primary: "hardware",
    primaryBase: 2,
    secondary: "compute",
    secondaryBase: 1
  },
  infrastructure: {
    id: "infrastructure",
    label: "Infrastruktur",
    shortLabel: "Infra",
    primary: "connectivity",
    primaryBase: 2
  },
  energy: {
    id: "energy",
    label: "Energieversorgung",
    shortLabel: "Energie",
    primary: "energy",
    primaryBase: 3
  }
};

Nexus.ZONE_TYPE_COLORS = {
  residential: Nexus.RESOURCE_COLORS.data,
  commercial: Nexus.RESOURCE_COLORS.hardware,
  infrastructure: Nexus.RESOURCE_COLORS.connectivity,
  energy: Nexus.RESOURCE_COLORS.energy
};

/* NEXUS 2.1 – Abschnitt 3.3: W6-Produktionsmodifikator je Fabrik/Runde */
Nexus.PRODUCTION_DICE = [
  { id: "fail", modifier: -1, weight: 1, label: "Wartung/Ausfall", color: "#8a3a3a" },
  { id: "normal", modifier: 0, weight: 2, label: "Normalbetrieb", color: "#2f8f72" },
  { id: "good", modifier: 1, weight: 2, label: "Guter Lauf", color: "#3fa9dd" },
  { id: "boom", modifier: 2, weight: 1, label: "Boom", color: "#d7b44a" }
];

Nexus.PLAYER_COLORS = ["#3fd0c9", "#f0c14b", "#ff8fb0"];
Nexus.PLAYER_COLOR_NAMES = ["Türkis", "Amber", "Pink"];

Nexus.GAME_LENGTHS = [
  { id: "short", label: "Kurz", rounds: 15 },
  { id: "standard", label: "Standard", rounds: 20 },
  { id: "long", label: "Lang", rounds: 25 }
];

/* Hex-Distrikt mit 4 Feldern Seitenlänge (Radius 3). Homes auf drei Ecken. */
Nexus.HOME_POSITIONS = [
  { q: 3, r: -3 },
  { q: -3, r: 0 },
  { q: 0, r: 3 }
];

Nexus.ZONE_TYPES.home = {
  id: "home",
  label: "Smart Home",
  shortLabel: "Home",
  isHome: true
};

Nexus.ZONE_TYPE_COLORS.home = "#8b9cb8";

Nexus.CONSTANTS = {
  MAX_ROUNDS: 20,
  START_RESOURCES: 3,
  START_ZONE_COUNT: 1,
  PRIVACY_BASE: 20,
  EVENT_EVERY_N_TURNS: 2,
  INNOVATION_DRAW_COST: { compute: 2, data: 1 },
  DEVICE_INNOVATION: 2,
  HEMS_INNOVATION: 4,
  CHARGER_INNOVATION_BONUS: 2,
  LOCK_RISK_REDUCTION: 1,
  LOG_LIMIT: 40,
  HEX_RADIUS: 3,
  HEX_SIZE: 64,
  HEX_SHADOW_DY: 8,
  EXPAND_REQUIRES_ADJACENT: true,
  TILE_SPIN_MS: 900,
  HARVEST_STAGGER_MS: 120,
  HOME_HARVEST_MS: 280,
  FACTORY_MIN_YIELD: 1,
  HOME_BASE_YIELD: 1,
  MAP_MIN_SCALE: 0.28,
  MAP_MAX_SCALE: 2.8,
  MAP_FIT_PADDING: 0.92,
  MAP_ZOOM_OUT_BOARDS: 3,
  HUB_DISCOUNT_TIE_ORDER: ["connectivity", "energy", "data", "hardware", "compute"],
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 3,
  TRADE_RECENT_ROUNDS: 2,
  OPEN_STANDARD_DISCOUNT: 1,
  SAE_MAX_LEVEL: 5
};
