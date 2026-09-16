window.Nexus = window.Nexus || {};

Nexus.RESOURCE_KEYS = ["energy", "money", "bandwidth"];

Nexus.RESOURCE_LABELS = {
  energy: "Energie",
  money: "Geld",
  bandwidth: "Bandbreite"
};

Nexus.RESOURCE_SHORT = {
  energy: "Energie",
  money: "Geld",
  bandwidth: "Bandbr."
};

Nexus.RESOURCE_COLORS = {
  energy: "#c4a56a",
  money: "#c08960",
  bandwidth: "#7d8fa3"
};

Nexus.SCORE_KEYS = ["image", "comfort", "environment", "security"];

Nexus.SCORE_LABELS = {
  image: "Image",
  comfort: "Komfort",
  environment: "Umwelt",
  security: "Sicherheit"
};

Nexus.ZONE_TYPE_KEYS = ["residential", "energy", "datacenter", "traffic"];

Nexus.ZONE_TYPES = {
  residential: {
    id: "residential",
    label: "Wohngebiet",
    shortLabel: "Wohnen",
    primary: "bandwidth",
    primaryBase: 2
  },
  energy: {
    id: "energy",
    label: "Energieversorgung",
    shortLabel: "Energie",
    primary: "energy",
    variants: ["solar", "transformer"]
  },
  datacenter: {
    id: "datacenter",
    label: "Datenzentrum",
    shortLabel: "Datenz.",
    primary: "bandwidth",
    variants: ["insecure", "secure"]
  },
  traffic: {
    id: "traffic",
    label: "Verkehr",
    shortLabel: "Verkehr",
    primary: "money",
    primaryBase: 1
  }
};

Nexus.ENERGY_VARIANTS = {
  solar: {
    id: "solar",
    label: "Solar",
    shortLabel: "Solar",
    primary: "energy",
    primaryBase: 3,
    dice: true,
    scoreHint: { environment: 1 }
  },
  transformer: {
    id: "transformer",
    label: "Transformer",
    shortLabel: "Transf.",
    primary: "energy",
    primaryBase: 2,
    dice: false,
    stable: true,
    scoreHint: { environment: -1 }
  }
};

Nexus.DATACENTER_VARIANTS = {
  insecure: {
    id: "insecure",
    label: "Ungesichert",
    shortLabel: "Offen",
    primary: "bandwidth",
    primaryBase: 1,
    risk: true,
    riskOnBuild: 2
  },
  secure: {
    id: "secure",
    label: "Gesichert",
    shortLabel: "Sicher",
    primary: "bandwidth",
    primaryBase: 1,
    scoreHint: { security: 1 }
  }
};

Nexus.ZONE_VARIANTS = {
  energy: [Nexus.ENERGY_VARIANTS.solar, Nexus.ENERGY_VARIANTS.transformer],
  datacenter: [Nexus.DATACENTER_VARIANTS.insecure, Nexus.DATACENTER_VARIANTS.secure]
};

Nexus.ZONE_TYPE_COLORS = {
  residential: "#7ec8d8",
  energy: "#6a9fd4",
  datacenter: "#8a9aaa",
  traffic: "#5c5f66"
};

Nexus.PRODUCTION_DICE = [
  { id: "fail", modifier: -1, weight: 1, label: "Wartung/Ausfall", color: "#8a5a52" },
  { id: "normal", modifier: 0, weight: 2, label: "Normalbetrieb", color: "#5d7468" },
  { id: "good", modifier: 1, weight: 2, label: "Guter Lauf", color: "#6d7f8d" },
  { id: "boom", modifier: 2, weight: 1, label: "Boom", color: "#b89a6a" }
];

Nexus.PLAYER_COLORS = ["#6e8b82", "#b89a6a", "#b07c86"];
Nexus.PLAYER_COLOR_NAMES = ["Salbei", "Sand", "Rose"];

Nexus.GAME_LENGTHS = [
  { id: "short", label: "Kurz", rounds: 15 },
  { id: "standard", label: "Standard", rounds: 20 },
  { id: "long", label: "Lang", rounds: 25 }
];

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
  EVENT_EVERY_N_TURNS: 2,
  HAND_LIMIT: 4,
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
  MAP_FIT_PADDING: 0.96,
  HUB_DISCOUNT_TIE_ORDER: ["energy", "money", "bandwidth"],
  TRANSFORMER_MONEY_PER_ENERGY: 1,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 3,
  TRADE_RECENT_ROUNDS: 2,
  OPEN_STANDARD_DISCOUNT: 1,
  SAE_MAX_LEVEL: 5,
  SAE_NETWORK_BANDWIDTH_DISCOUNT: 1
};
