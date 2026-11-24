window.Nexus = window.Nexus || {};

/*
 * Abgabe-Feldkatalog: 4 Bau-Tabs, Metrik-Tags, Kosten, Erträge. Keine Regeln.
 *
 * WE-Kalibrierung (§2.B): w_E = w_G = w_D = 1; Karma ±1 ≈ 2 WE Oneshot.
 * Synergie-Caps (EV): Fabrik-Nachbar +0.25 erwartet (Ideal ≤ +0.5);
 *   Großunt.-Kurve erwartet ≈ 2.5 bei primaryBase 3; Kohle-Ideal 3 → EV 2.5.
 * Horizont-Checks: Rollen/Lanes bei H≈8–12; Portfolios ε_p≈0.25–0.30
 *   (Park-Pakete günstiger/früher, Bulk-Pakete teurer — Rule 2.B.4/5).
 */
(function (Nexus) {
  var METRIC = {
    eco: "eco",
    trust: "trust",
    finance: "finance",
    innovation: "innovation",
    image: "image",
    comfort: "comfort"
  };

  function tile(def) {
    return def;
  }

  Nexus.BUILD_TABS = [
    { id: "energy", label: "Strom" },
    { id: "commerce", label: "Geld" },
    { id: "data", label: "Daten" },
    { id: "misc", label: "Sonstiges" }
  ];

  Nexus.BUILD_TILES = {
    "energy-wind": tile({
      id: "energy-wind",
      tab: "energy",
      type: "energy",
      variant: "wind",
      label: "Windkraft",
      shortLabel: "Wind",
      cost: { energy: 2, money: 2 },
      primary: "energy",
      primaryBase: 2,
      metrics: [METRIC.eco],
      karmaOnBuild: 0
    }),
    "energy-nuclear": tile({
      id: "energy-nuclear",
      tab: "energy",
      type: "energy",
      variant: "nuclear",
      label: "Atomkraftwerk",
      shortLabel: "Atom",
      cost: { energy: 3, money: 5, bandwidth: 2 },
      primary: "energy",
      primaryBase: 3,
      metrics: [METRIC.innovation],
      karmaOnBuild: -1
    }),
    "energy-coal": tile({
      id: "energy-coal",
      tab: "energy",
      type: "energy",
      variant: "coal",
      label: "Kohlekraftwerk",
      shortLabel: "Kohle",
      cost: { energy: 2, money: 4, bandwidth: 1 },
      primary: "energy",
      primaryBase: 3,
      metrics: [METRIC.trust],
      karmaOnBuild: -1
    }),
    "energy-solar": tile({
      id: "energy-solar",
      tab: "energy",
      type: "energy",
      variant: "solar",
      label: "Solarfarm",
      shortLabel: "Solar",
      cost: { energy: 2, money: 2, bandwidth: 1 },
      primary: "energy",
      primaryBase: 2,
      metrics: [METRIC.comfort],
      karmaOnBuild: 0
    }),
    "commerce-factory": tile({
      id: "commerce-factory",
      tab: "commerce",
      type: "commerce",
      variant: "factory",
      label: "Fabrik",
      shortLabel: "Fabrik",
      cost: { energy: 2, money: 3, bandwidth: 1 },
      primary: "money",
      primaryBase: 2,
      adjacentResidentialBonus: true,
      metrics: [METRIC.innovation],
      karmaOnBuild: 0
    }),
    "commerce-small": tile({
      id: "commerce-small",
      tab: "commerce",
      type: "commerce",
      variant: "small",
      label: "Kleinunternehmen",
      shortLabel: "Kleinunt.",
      cost: { energy: 2, money: 2 },
      primary: "money",
      primaryBase: 2,
      metrics: [METRIC.image],
      karmaOnBuild: 0
    }),
    "commerce-large": tile({
      id: "commerce-large",
      tab: "commerce",
      type: "commerce",
      variant: "large",
      label: "Großunternehmen",
      shortLabel: "Großunt.",
      cost: { energy: 3, money: 5, bandwidth: 2 },
      primary: "money",
      primaryBase: 3,
      enterpriseCurve: true,
      metrics: [METRIC.finance],
      karmaOnBuild: 0
    }),
    "commerce-recycle": tile({
      id: "commerce-recycle",
      tab: "commerce",
      type: "commerce",
      variant: "recycle",
      label: "Recyclingstätte",
      shortLabel: "Recycling",
      cost: { energy: 2, money: 2, bandwidth: 1 },
      primary: "money",
      primaryBase: 1,
      secondary: "energy",
      secondaryBase: 1,
      metrics: [METRIC.eco],
      karmaOnBuild: 0
    }),
    "data-residential": tile({
      id: "data-residential",
      tab: "data",
      type: "residential",
      variant: null,
      label: "Wohnen",
      shortLabel: "Wohnen",
      cost: { energy: 2, money: 2 },
      primary: "bandwidth",
      primaryBase: 2,
      metrics: [METRIC.image],
      karmaOnBuild: 0
    }),
    "data-server": tile({
      id: "data-server",
      tab: "data",
      type: "server",
      variant: null,
      label: "Serverfarm",
      shortLabel: "Server",
      cost: { energy: 3, money: 5, bandwidth: 3 },
      primary: "bandwidth",
      primaryBase: 3,
      metrics: [METRIC.finance],
      karmaOnBuild: 0
    }),
    "data-taxi": tile({
      id: "data-taxi",
      tab: "data",
      type: "taxi",
      variant: null,
      label: "E-Taxistand",
      shortLabel: "E-Taxi",
      cost: { energy: 2, money: 2, bandwidth: 1 },
      primary: "money",
      primaryBase: 4,
      upkeep: { energy: 1, bandwidth: 1 },
      metrics: [METRIC.comfort],
      karmaOnBuild: 0
    }),
    "data-admin": tile({
      id: "data-admin",
      tab: "data",
      type: "admin",
      variant: null,
      label: "Verwaltungsbüro",
      shortLabel: "Verwaltung",
      cost: { energy: 2, money: 2, bandwidth: 1 },
      primary: "bandwidth",
      primaryBase: 2,
      metrics: [METRIC.trust],
      karmaOnBuild: 1
    }),
    "misc-yard": tile({
      id: "misc-yard",
      tab: "misc",
      type: "yard",
      variant: null,
      label: "Lagerfläche",
      shortLabel: "Lager",
      cost: { energy: 2, money: 3 },
      primary: "money",
      primaryBase: 1,
      metrics: [METRIC.comfort, METRIC.finance],
      karmaOnBuild: 0
    }),
    "misc-station": tile({
      id: "misc-station",
      tab: "misc",
      type: "station",
      variant: null,
      label: "Bahnhof",
      shortLabel: "Bahnhof",
      cost: { energy: 3, money: 4, bandwidth: 2 },
      primary: "money",
      primaryBase: 1,
      secondary: "bandwidth",
      secondaryBase: 1,
      metrics: [METRIC.innovation, METRIC.trust],
      karmaOnBuild: 0
    }),
    "misc-park": tile({
      id: "misc-park",
      tab: "misc",
      type: "park",
      variant: null,
      label: "Park",
      shortLabel: "Park",
      cost: { energy: 2, money: 3 },
      primary: null,
      metrics: [METRIC.eco, METRIC.image],
      karmaOnBuild: 0
    })
  };

  Nexus.BUILD_TILE_IDS = Object.keys(Nexus.BUILD_TILES);

  Nexus.tilesForTab = function (tabId) {
    return Nexus.BUILD_TILE_IDS.filter(function (id) {
      return Nexus.BUILD_TILES[id].tab === tabId;
    }).map(function (id) {
      return Nexus.BUILD_TILES[id];
    });
  };

  Nexus.tilesForMetric = function (metricKey) {
    return Nexus.BUILD_TILE_IDS.filter(function (id) {
      return (Nexus.BUILD_TILES[id].metrics || []).indexOf(metricKey) >= 0;
    });
  };

  Nexus.tileMatchesMetric = function (tileId, metricKey) {
    var def = Nexus.BUILD_TILES[tileId];
    return !!(def && (def.metrics || []).indexOf(metricKey) >= 0);
  };

  Nexus.tileIdFromZone = function (zone) {
    if (!zone) {
      return null;
    }
    if (zone.tileId && Nexus.BUILD_TILES[zone.tileId]) {
      return zone.tileId;
    }
    var type = zone.type;
    var variant = zone.variant || zone.trafficMode || null;
    var i;
    var ids = Nexus.BUILD_TILE_IDS;
    for (i = 0; i < ids.length; i++) {
      var def = Nexus.BUILD_TILES[ids[i]];
      if (def.type === type && (def.variant || null) === (variant || null)) {
        return def.id;
      }
    }
    /* Legacy-Brücken */
    if (type === "energy" && variant === "transformer") {
      return "energy-coal";
    }
    if (type === "commerce" && variant === "enterprise") {
      return "commerce-large";
    }
    if (type === "datacenter") {
      return variant === "secure" ? "data-server" : "data-admin";
    }
    if (type === "traffic") {
      return "data-taxi";
    }
    if (type === "workshop") {
      return "commerce-factory";
    }
    if (type === "residential") {
      return "data-residential";
    }
    if (type === "park") {
      return "misc-park";
    }
    return null;
  };

  Nexus.KARMA = {
    MIN: -5,
    MAX: 5,
    START: 0
  };

  Nexus.STALL = {
    SLOTS: 3,
    ACCEPTS_PER_TURN: 2
  };

  Nexus.VICTORY_POINT_TARGET = 10;

  Nexus.STANDING_GOALS = [
    { id: "same3", label: "3× denselben Typ bauen/ausbauen", need: 3, repeat: true, kind: "sameType" },
    { id: "build5", label: "5 Felder deiner Metrik", need: 5, repeat: true, kind: "buildMetric" },
    { id: "upgrade3", label: "3 Metrik-Felder ausbauen", need: 3, repeat: true, kind: "upgradeMetric" },
    { id: "neighbor3", label: "3 Metrik-Felder neben Nachbarn", need: 3, repeat: true, kind: "neighborMetric" },
    { id: "karma4", label: "Karma ≥ +4 halten", need: 4, repeat: false, kind: "karmaHold" },
    { id: "karma5", label: "Karma = +5 halten", need: 5, repeat: false, kind: "karmaHoldExact" },
    { id: "trades3", label: "3 Stall-Annahmen", need: 3, repeat: false, kind: "stallAccept", once: true },
    { id: "gift1", label: "1 Schenkung genehmigen", need: 1, repeat: false, kind: "giftApprove", once: true }
  ];
})(window.Nexus);
