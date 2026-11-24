window.Nexus = window.Nexus || {};

Nexus.RESOURCE_KEYS = ["energy", "money", "bandwidth"];

Nexus.RESOURCE_LABELS = {
  energy: "Energie",
  money: "Geld",
  bandwidth: "Daten"
};

Nexus.RESOURCE_SHORT = {
  energy: "Energie",
  money: "Geld",
  bandwidth: "Daten"
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

/* Typen für Board/State; konkrete Baukosten/Metriken in build-tiles.js. */
Nexus.ZONE_TYPES = {
  residential: { id: "residential", label: "Wohnen", shortLabel: "Wohnen", primary: "bandwidth", primaryBase: 2 },
  energy: { id: "energy", label: "Strom", shortLabel: "Strom", primary: "energy", variants: ["wind", "nuclear", "coal", "solar"] },
  commerce: { id: "commerce", label: "Geld", shortLabel: "Geld", primary: "money", variants: ["factory", "small", "large", "recycle"] },
  server: { id: "server", label: "Serverfarm", shortLabel: "Server", primary: "bandwidth", primaryBase: 3 },
  taxi: { id: "taxi", label: "E-Taxistand", shortLabel: "E-Taxi", primary: "money", primaryBase: 2 },
  admin: { id: "admin", label: "Verwaltungsbüro", shortLabel: "Verwaltung", primary: "bandwidth", primaryBase: 2 },
  yard: { id: "yard", label: "Lagerfläche", shortLabel: "Lager", primary: "money", primaryBase: 1 },
  station: { id: "station", label: "Bahnhof", shortLabel: "Bahnhof", primary: "money", primaryBase: 1 },
  park: { id: "park", label: "Park", shortLabel: "Park", primary: null }
};

Nexus.ENERGY_VARIANTS = {
  wind: { id: "wind", label: "Windkraft", shortLabel: "Wind", primary: "energy", primaryBase: 2, dice: false },
  nuclear: { id: "nuclear", label: "Atomkraftwerk", shortLabel: "Atom", primary: "energy", primaryBase: 5, dice: false, stable: true },
  coal: { id: "coal", label: "Kohlekraftwerk", shortLabel: "Kohle", primary: "energy", primaryBase: 3, dice: false, stable: true },
  solar: { id: "solar", label: "Solarfarm", shortLabel: "Solar", primary: "energy", primaryBase: 2, dice: false },
  /* Legacy-Aliase */
  transformer: { id: "coal", label: "Kohlekraftwerk", shortLabel: "Kohle", primary: "energy", primaryBase: 3, dice: false, stable: true }
};

Nexus.COMMERCE_VARIANTS = {
  factory: { id: "factory", label: "Fabrik", shortLabel: "Fabrik", primary: "money", primaryBase: 2, adjacentResidentialBonus: true },
  small: { id: "small", label: "Kleinunternehmen", shortLabel: "Kleinunt.", primary: "money", primaryBase: 1 },
  large: { id: "large", label: "Großunternehmen", shortLabel: "Großunt.", primary: "money", primaryBase: 3, enterpriseCurve: true },
  recycle: { id: "recycle", label: "Recyclingstätte", shortLabel: "Recycling", primary: "money", primaryBase: 1, secondary: "energy", secondaryBase: 1 },
  enterprise: { id: "large", label: "Großunternehmen", shortLabel: "Großunt.", primary: "money", primaryBase: 3, enterpriseCurve: true }
};

Nexus.DATACENTER_VARIANTS = {};
Nexus.TRAFFIC_VARIANTS = {};

Nexus.ZONE_VARIANTS = {
  energy: [
    Nexus.ENERGY_VARIANTS.wind,
    Nexus.ENERGY_VARIANTS.nuclear,
    Nexus.ENERGY_VARIANTS.coal,
    Nexus.ENERGY_VARIANTS.solar
  ],
  commerce: [
    Nexus.COMMERCE_VARIANTS.factory,
    Nexus.COMMERCE_VARIANTS.small,
    Nexus.COMMERCE_VARIANTS.large,
    Nexus.COMMERCE_VARIANTS.recycle
  ]
};

Nexus.ZONE_TYPE_COLORS = {
  residential: "#7ec8d8",
  energy: "#6a9fd4",
  commerce: "#c4a06a",
  server: "#8a9aaa",
  taxi: "#5c5f66",
  admin: "#9a8a72",
  yard: "#a09070",
  station: "#6a7a8a",
  park: "#6aaa6a"
};

Nexus.ZONE_TYPE_KEYS = [
  "residential",
  "energy",
  "commerce",
  "server",
  "taxi",
  "admin",
  "yard",
  "station",
  "park"
];

Nexus.PRODUCTION_DICE = [
  { id: "fail", modifier: -1, weight: 1, label: "Wartung/Ausfall", color: "#8a5a52" },
  { id: "normal", modifier: 0, weight: 2, label: "Normalbetrieb", color: "#5d7468" },
  { id: "good", modifier: 1, weight: 2, label: "Guter Lauf", color: "#6d7f8d" },
  { id: "boom", modifier: 2, weight: 1, label: "Boom", color: "#b89a6a" }
];

/* Themenfarben = Figuren-Reihenfolge ALL_ROLE_IDS.
   Mira grün, Isabella rot, Maria gelb, Weiß weiß, Smurf blau, Heinz dunkelbraun. */
Nexus.PLAYER_COLORS = ["#1FA83A", "#E02020", "#F0C000", "#F7F4EC", "#1560E0", "#4A2F1F"];
Nexus.PLAYER_COLOR_NAMES = ["Grün", "Rot", "Gelb", "Weiß", "Blau", "Dunkelbraun"];
Nexus.UNCLAIMED_GRAY = "#E2E2E2";

/* Probephase in Wochen (3 bzw. 4 Monate). */
Nexus.GAME_LENGTHS = [
  { id: "short", label: "3 Monate · 12 Wochen", rounds: 12 },
  { id: "standard", label: "4 Monate · 16 Wochen", rounds: 16 }
];

/* Sechs Hex-Ecken, Uhrzeigersinn ab Nordost. Fairer Spread: 2 gegenüber, 3 jeder zweite, 4 Raute, 5 eine Lücke, 6 alle. */
Nexus.HEX_CORNER_AXIAL = function (radius) {
  var r = radius;
  return [
    { q: r, r: -r },
    { q: r, r: 0 },
    { q: 0, r: r },
    { q: -r, r: r },
    { q: -r, r: 0 },
    { q: 0, r: -r }
  ];
};

Nexus.HOME_CORNER_PICKS = {
  2: [0, 3],
  3: [0, 4, 2],
  4: [0, 2, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5]
};

Nexus.hexRadiusForPlayerCount = function (playerCount) {
  var base = Nexus.CONSTANTS.HEX_RADIUS_BASE;
  return playerCount > 3 ? base + 1 : base;
};

Nexus.homePositionsForCount = function (playerCount) {
  var n = Math.max(2, Math.min(3, Number(playerCount) || 3));
  var corners = Nexus.HEX_CORNER_AXIAL(Nexus.hexRadiusForPlayerCount(n));
  return Nexus.HOME_CORNER_PICKS[n].map(function (index) {
    return corners[index];
  });
};

Nexus.HOME_POSITIONS = [
  { q: 3, r: -3 },
  { q: -3, r: 0 },
  { q: 0, r: 3 }
];

Nexus.ZONE_TYPES.home = {
  id: "home",
  label: "Kontrollbüro",
  shortLabel: "Leitstand",
  isHome: true
};

Nexus.ZONE_TYPE_COLORS.home = "#8b9cb8";

Nexus.CONSTANTS = {
  MAX_ROUNDS: 20,
  START_RESOURCES: 3,
  START_ZONE_COUNT: 1,
  EVENT_EVERY_N_TURNS: 2,
  HAND_LIMIT: 5,
  LOCK_RISK_REDUCTION: 1,
  LOG_LIMIT: 40,
  HEX_RADIUS_BASE: 3,
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
  SAE_NETWORK_BANDWIDTH_DISCOUNT: 1,
  ZONE_UPGRADE_MAX: 1,
  ZONE_UPGRADE_MONEY_BASE: 3,
  ZONE_UPGRADE_MONEY_STEP: 2,
  ZONE_UPGRADE_ENERGY: 1,
  DEMOLISH_REFUND_MONEY: 1,
  DEMOLISH_REFUND_PER_LEVEL: 1,
  /* 1 Rechenzentrum je 7 eigene Felder (inkl. Leitstand). */
  DC_TILES_PER: 7,
  ENTERPRISE_MATURE: [5, 3, 1],
  ENTERPRISE_RAMP: [1, 3, 5]
};
