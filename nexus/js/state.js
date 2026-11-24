window.Nexus = window.Nexus || {};

(function (Nexus) {
  var C = Nexus.CONSTANTS;
  var KEYS = Nexus.RESOURCE_KEYS;
  var SCORE_KEYS = Nexus.SCORE_KEYS || ["image", "comfort", "environment", "security"];
  var ZONE_TYPES = Nexus.ZONE_TYPES;

  var LEGACY_RESOURCE_MAP = {
    data: "bandwidth",
    connectivity: "bandwidth",
    hardware: "money",
    compute: "money"
  };

  function emptyResources() {
    var res = {};
    KEYS.forEach(function (key) {
      res[key] = 0;
    });
    return res;
  }

  function emptyScores() {
    var scores = {};
    SCORE_KEYS.forEach(function (key) {
      scores[key] = 0;
    });
    return scores;
  }

  function cloneScores(scores) {
    var next = emptyScores();
    SCORE_KEYS.forEach(function (key) {
      next[key] = (scores && scores[key]) || 0;
    });
    return next;
  }

  function normalizeCost(cost) {
    var next = {};
    if (!cost) {
      return next;
    }
    Object.keys(cost).forEach(function (key) {
      var mapped = LEGACY_RESOURCE_MAP[key] || key;
      if (KEYS.indexOf(mapped) === -1) {
        return;
      }
      next[mapped] = (next[mapped] || 0) + (cost[key] || 0);
    });
    return next;
  }

  function cloneResources(resources) {
    var next = {};
    KEYS.forEach(function (key) {
      next[key] = resources[key] || 0;
    });
    if (resources && resources.unlimited) {
      next.unlimited = true;
    }
    return next;
  }

  function addLog(state, playerName, text) {
    var log = [{ round: state.round, playerName: playerName, text: text }].concat(state.log);
    if (log.length > C.LOG_LIMIT) {
      log = log.slice(0, C.LOG_LIMIT);
    }
    return log;
  }

  function formatCost(cost) {
    return KEYS.filter(function (key) {
      return (cost[key] || 0) > 0;
    })
      .map(function (key) {
        return cost[key] + " " + Nexus.RESOURCE_SHORT[key];
      })
      .join(", ");
  }

  function formatEffects(effects) {
    if (!effects) {
      return "";
    }
    var parts = [];
    KEYS.forEach(function (key) {
      if (effects[key]) {
        parts.push("+" + effects[key] + " " + Nexus.RESOURCE_SHORT[key]);
      }
    });
    SCORE_KEYS.forEach(function (key) {
      if (effects[key]) {
        var label = (Nexus.SCORE_LABELS && Nexus.SCORE_LABELS[key]) || key;
        parts.push((effects[key] > 0 ? "+" : "") + effects[key] + " " + label);
      }
    });
    if (effects.karma) {
      parts.push((effects.karma > 0 ? "+" : "") + effects.karma + " Karma");
    }
    if (effects.ownSp) {
      parts.push((effects.ownSp > 0 ? "+" : "") + effects.ownSp + " SP");
    }
    if (effects.freeZoneClaim) {
      parts.push("+" + effects.freeZoneClaim + " Freifeld");
    }
    if (effects.risk) {
      parts.push((effects.risk > 0 ? "+" : "") + effects.risk + " Risiko");
    }
    return parts.join(" · ");
  }

  function cloudUpkeepCost(player) {
    if (!player) {
      return 0;
    }
    var amount = 0;
    Nexus.DEVICES.forEach(function (device) {
      if (player.devices[device.id] === "cloud") {
        amount += device.cloudUpkeep || 0;
      }
    });
    return amount;
  }

  function canAfford(resources, cost) {
    if (resources && resources.unlimited) {
      return true;
    }
    cost = normalizeCost(cost);
    return KEYS.every(function (key) {
      return (resources[key] || 0) >= (cost[key] || 0);
    });
  }

  function subtractCost(resources, cost) {
    if (resources && resources.unlimited) {
      return cloneResources(resources);
    }
    var next = cloneResources(resources);
    cost = normalizeCost(cost);
    KEYS.forEach(function (key) {
      next[key] -= cost[key] || 0;
    });
    return next;
  }

  function upgradeCost(cloudCost, localCost) {
    cloudCost = normalizeCost(cloudCost);
    localCost = normalizeCost(localCost);
    var cost = {};
    KEYS.forEach(function (key) {
      var diff = (localCost[key] || 0) - (cloudCost[key] || 0);
      if (diff > 0) {
        cost[key] = diff;
      }
    });
    return cost;
  }

  function applyHubDiscount(cost) {
    var next = {};
    KEYS.forEach(function (key) {
      if ((cost[key] || 0) > 0) {
        next[key] = cost[key];
      }
    });
    var keys = KEYS.filter(function (key) {
      return (next[key] || 0) > 0;
    });
    if (keys.length === 0) {
      return next;
    }
    keys.sort(function (a, b) {
      var byAmount = next[b] - next[a];
      if (byAmount !== 0) {
        return byAmount;
      }
      return C.HUB_DISCOUNT_TIE_ORDER.indexOf(a) - C.HUB_DISCOUNT_TIE_ORDER.indexOf(b);
    });
    var chosen = keys[0];
    next[chosen] -= 1;
    if (next[chosen] <= 0) {
      delete next[chosen];
    }
    return next;
  }

  function rawBuildCost(device, mode, currentMode) {
    if (currentMode === "cloud" && mode === "local") {
      return upgradeCost(device.costs.cloud, device.costs.local);
    }
    return normalizeCost(device.costs[mode]);
  }

  function applyWorkshopDiscount(player, cost) {
    if (!player || !player.workshopDiscountPending || !cost) {
      return { cost: cost, used: false };
    }
    var next = Object.assign({}, cost);
    if ((next.money || 0) > 0) {
      next.money -= 1;
      if (next.money <= 0) {
        delete next.money;
      }
      return { cost: next, used: true };
    }
    return { cost: cost, used: false };
  }

  function defaultVariantFor(zoneType) {
    if (zoneType === "energy") {
      return "wind";
    }
    if (zoneType === "commerce") {
      return "small";
    }
    /* Legacy */
    if (zoneType === "datacenter") {
      return "insecure";
    }
    if (zoneType === "traffic") {
      return "taxi";
    }
    return null;
  }

  function variantDefFor(zoneType, variant) {
    if (zoneType === "energy") {
      return (Nexus.ENERGY_VARIANTS && Nexus.ENERGY_VARIANTS[variant]) || null;
    }
    if (zoneType === "datacenter") {
      return (Nexus.DATACENTER_VARIANTS && Nexus.DATACENTER_VARIANTS[variant]) || null;
    }
    if (zoneType === "commerce") {
      return (Nexus.COMMERCE_VARIANTS && Nexus.COMMERCE_VARIANTS[variant]) || null;
    }
    if (zoneType === "traffic") {
      if (variant === "depot") {
        variant = "taxi";
      }
      return (Nexus.TRAFFIC_VARIANTS && Nexus.TRAFFIC_VARIANTS[variant]) || null;
    }
    return null;
  }

  function emptyGoalProgress() {
    return {
      sameType: {},
      buildMetric: 0,
      upgradeMetric: 0,
      neighborMetric: 0,
      trades3: 0,
      gift1: 0,
      karma4Active: false,
      karma5Active: false,
      completedOnce: {}
    };
  }

  function emptyStallSlots() {
    var n = (Nexus.STALL && Nexus.STALL.SLOTS) || 3;
    var slots = [];
    var i;
    for (i = 0; i < n; i++) {
      slots.push(null);
    }
    return slots;
  }

  function clampKarma(value) {
    var min = Nexus.KARMA && Nexus.KARMA.MIN != null ? Nexus.KARMA.MIN : -5;
    var max = Nexus.KARMA && Nexus.KARMA.MAX != null ? Nexus.KARMA.MAX : 5;
    var n = Number(value);
    if (!isFinite(n)) {
      n = Nexus.KARMA && Nexus.KARMA.START != null ? Nexus.KARMA.START : 0;
    }
    return Math.max(min, Math.min(max, n));
  }

  function applyKarma(state, playerId, delta, reason) {
    if (!delta) {
      return state;
    }
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player) {
      return state;
    }
    var nextKarma = clampKarma((player.karma || 0) + delta);
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { karma: nextKarma })
    );
    if (reason) {
      next.log = addLog(
        next,
        player.name,
        "Karma " + (delta > 0 ? "+" : "") + delta + " · " + reason + " (jetzt " + nextKarma + ")."
      );
    }
    if (Nexus.Goals && Nexus.Goals.syncKarmaGoals) {
      next = Nexus.Goals.syncKarmaGoals(next, playerId);
    }
    return next;
  }

  /* Bau-Spec aus tileId oder type/variant — Kosten/Erträge aus BUILD_TILES. */
  function resolveBuildSpec(zoneType, variant, tileId) {
    var tiles = Nexus.BUILD_TILES;
    if (tileId && tiles && tiles[tileId]) {
      var fromId = tiles[tileId];
      return {
        tileId: fromId.id,
        type: fromId.type,
        variant: fromId.variant || null,
        def: fromId
      };
    }
    var typeDef = zoneType && ZONE_TYPES[zoneType];
    var resolvedVariant = variant;
    if (typeDef && typeDef.variants && typeDef.variants.length) {
      resolvedVariant = variant || defaultVariantFor(zoneType);
    } else if (variant == null) {
      resolvedVariant = defaultVariantFor(zoneType);
    }
    var inferred =
      Nexus.tileIdFromZone &&
      Nexus.tileIdFromZone({ type: zoneType, variant: resolvedVariant || null });
    if (inferred && tiles && tiles[inferred]) {
      var fromType = tiles[inferred];
      return {
        tileId: fromType.id,
        type: fromType.type,
        variant: fromType.variant || null,
        def: fromType
      };
    }
    return {
      tileId: inferred || null,
      type: zoneType,
      variant: resolvedVariant || null,
      def: null
    };
  }

  function tileBuildCost(spec, player) {
    if (player && (player.freeZoneClaims || 0) > 0) {
      return {};
    }
    if (spec && spec.def && spec.def.cost) {
      return normalizeCost(spec.def.cost);
    }
    return null;
  }

  function normalizeTrafficMode(zone) {
    if (!zone || zone.type !== "traffic") {
      return null;
    }
    var mode = zone.trafficMode || zone.variant || "garage";
    if (mode === "depot") {
      return "taxi";
    }
    if (mode === "taxi" || mode === "garage") {
      return mode;
    }
    return "garage";
  }

  function countPlayerDatacenters(state, playerId) {
    return playerFactoryZones(state, playerId).filter(function (zone) {
      return zone.type === "datacenter" || zone.type === "server" || zone.type === "admin";
    }).length;
  }

  /* DC-Limit entfällt — API bleibt als No-Op für Alt-UI. */
  function maxDatacentersFor() {
    return 999;
  }

  function datacenterCapInfo(state, playerId) {
    var have = countPlayerDatacenters(state, playerId);
    var owned = playerZones(state, playerId).length;
    return {
      have: have,
      max: 999,
      per: 0,
      owned: owned,
      nextAt: 0,
      allowed: true,
      label: "ohne Limit"
    };
  }

  function countAdjacentResidential(state, q, r) {
    if (!Nexus.neighbors) {
      return 0;
    }
    var n = 0;
    Nexus.neighbors(q, r).forEach(function (nb) {
      var z = zoneAt(state, nb.q, nb.r);
      if (z && z.type === "residential") {
        n += 1;
      }
    });
    return n;
  }

  function isEnterpriseZone(zone) {
    if (!zone || zone.type !== "commerce") {
      return false;
    }
    if (zone.variant === "enterprise" || zone.variant === "large") {
      return true;
    }
    var def = zone.tileId && Nexus.BUILD_TILES && Nexus.BUILD_TILES[zone.tileId];
    return !!(def && def.enterpriseCurve);
  }

  function enterpriseMatureBase(state, playerId, zone) {
    var curve = C.ENTERPRISE_MATURE || [5, 3, 1];
    var list = playerFactoryZones(state, playerId)
      .filter(function (item) {
        return isEnterpriseZone(item);
      })
      .slice()
      .sort(function (a, b) {
        var ra = a.builtRound || 0;
        var rb = b.builtRound || 0;
        if (ra !== rb) {
          return ra - rb;
        }
        return String(a.id).localeCompare(String(b.id));
      });
    var index = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === zone.id) {
        index = i;
        break;
      }
    }
    return curve[Math.min(index, curve.length - 1)] || 1;
  }

  function enterpriseYieldAmount(state, playerId, zone) {
    var mature = enterpriseMatureBase(state, playerId, zone);
    var ramp = C.ENTERPRISE_RAMP || [1, 3, 5];
    var built = zone.builtRound != null ? zone.builtRound : state.round;
    var age = Math.max(0, (state.round || 1) - built);
    /* Erste Ernte = Runde nach Bau → age 1: Ramp[0], age 2: Ramp[1], danach Reife. */
    var step = Math.min(ramp.length - 1, Math.max(0, age - 1));
    if (age <= 0) {
      step = 0;
    }
    return Math.min(mature, ramp[step] || mature);
  }

  function resolveZoneYieldDef(zone) {
    if (!zone) {
      return null;
    }
    var tileId =
      zone.tileId ||
      (Nexus.tileIdFromZone ? Nexus.tileIdFromZone(zone) : null);
    var tile = tileId && Nexus.BUILD_TILES && Nexus.BUILD_TILES[tileId];
    if (tile) {
      var energyVar =
        tile.type === "energy" && tile.variant
          ? variantDefFor("energy", tile.variant)
          : null;
      return Object.assign({}, ZONE_TYPES[tile.type] || {}, tile, energyVar || {}, {
        variant: tile.variant || null,
        tileId: tile.id,
        /* Katalog-Felder: feste Erträge, kein Produktionswürfel. */
        dice: false,
        stable: true
      });
    }
    var typeDef = ZONE_TYPES[zone.type];
    if (!typeDef) {
      return null;
    }
    var variant = zone.variant || defaultVariantFor(zone.type);
    if (zone.type === "traffic") {
      variant = normalizeTrafficMode(zone) || variant || "taxi";
    }
    var variantDef = variantDefFor(zone.type, variant);
    if (variantDef) {
      return Object.assign({}, typeDef, variantDef, { variant: variant, tileId: tileId });
    }
    return Object.assign({}, typeDef, { variant: variant, tileId: tileId });
  }

  function bumpScores(scores, hint) {
    var next = cloneScores(scores);
    if (!hint) {
      return next;
    }
    SCORE_KEYS.forEach(function (key) {
      if (hint[key]) {
        next[key] = Math.max(0, next[key] + hint[key]);
      }
    });
    return next;
  }

  /* ---------- Spieler-Helfer ---------- */

  function currentPlayer(state) {
    return state.players[state.currentPlayerIndex];
  }

  function replacePlayer(state, playerId, patch) {
    var players = state.players.map(function (player) {
      if (player.id !== playerId) {
        return player;
      }
      return Object.assign({}, player, patch);
    });
    return Object.assign({}, state, { players: players });
  }

  function playerZones(state, playerId) {
    return state.zones.filter(function (zone) {
      return zone.ownerId === playerId;
    });
  }

  function playerFactoryZones(state, playerId) {
    return playerZones(state, playerId).filter(function (zone) {
      return zone.type !== "home";
    });
  }

  function playerHasZoneType(state, playerId, zoneType) {
    return playerFactoryZones(state, playerId).some(function (zone) {
      return zone.type === zoneType;
    });
  }

  /* Rollenpunkte nur für die eigene Punktart — kein RNG-Sieg. */
  function rolePointKeyFor(player) {
    var role = Nexus.ROLES_BY_ID && Nexus.ROLES_BY_ID[player.roleId];
    return role && role.pointKey ? role.pointKey : null;
  }

  function awardTypedRolePoints(state, playerId, pointKey, amount, reason, opts) {
    if (!amount || !pointKey || !Nexus.awardRolePoints) {
      return state;
    }
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player || rolePointKeyFor(player) !== pointKey) {
      return state;
    }
    return Nexus.awardRolePoints(state, playerId, amount, reason, opts);
  }

  function stripRolePoints(state, playerId, amount, reason, opts) {
    if (!amount || !Nexus.awardRolePoints) {
      return state;
    }
    opts = opts || {};
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player) {
      return state;
    }
    /* Skandal/Presse: höchstens ein gezielter Punktverlust pro Person und Tag. */
    if (opts.oncePerDay && player.contestHitRound === state.round) {
      return state;
    }
    return Nexus.awardRolePoints(state, playerId, -Math.abs(amount), reason || "Konter");
  }

  function sideDealDef(dealId) {
    return (Nexus.SIDE_DEALS && Nexus.SIDE_DEALS[dealId]) || null;
  }

  function acceptSideDeal(state, playerId, dealId) {
    var def = sideDealDef(dealId);
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!def || !player || player.sideDeal) {
      return state;
    }
    var days = Math.max(1, def.days || 3);
    return replacePlayer(
      state,
      playerId,
      Object.assign({}, player, {
        sideDeal: {
          id: def.id,
          title: def.title,
          track: def.track,
          need: def.need || 1,
          progress: 0,
          deadlineRound: state.round + days - 1,
          rewardResources: def.rewardResources || null,
          rewardRolePoints: def.rewardRolePoints || 0,
          failRolePoints: def.failRolePoints || 0,
          failResources: def.failResources || null
        }
      })
    );
  }

  function resolveSideDeal(state, playerId, success) {
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player || !player.sideDeal) {
      return state;
    }
    var deal = player.sideDeal;
    var resources = cloneResources(player.resources);
    var bag = success ? deal.rewardResources : deal.failResources;
    if (bag) {
      KEYS.forEach(function (key) {
        if (bag[key]) {
          resources[key] = Math.max(0, (resources[key] || 0) + (success ? bag[key] : -Math.abs(bag[key])));
        }
      });
    }
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, {
        sideDeal: null,
        resources: resources,
        flowGain: success && deal.rewardResources ? Object.assign({}, player.flowGain || {}, deal.rewardResources) : player.flowGain,
        lastRolePointReason: deal.title
      })
    );
    if (success && deal.rewardRolePoints && Nexus.awardRolePoints) {
      /* Deal darf den letzten Siegpunkt bringen — kein Contest-Cap. */
      next = Nexus.awardRolePoints(next, playerId, deal.rewardRolePoints, deal.title + " · Deal erfüllt");
    }
    if (!success && deal.failRolePoints && Nexus.awardRolePoints) {
      next = Nexus.awardRolePoints(next, playerId, -Math.abs(deal.failRolePoints), deal.title + " · Deal geplatzt");
    }
    next.log = addLog(
      next,
      player.name,
      success
        ? "Hinterzimmer-Deal erfüllt: " + deal.title + "."
        : "Hinterzimmer-Deal geplatzt: " + deal.title + "."
    );
    next.lastScoreCause = { kind: "sideDeal", label: deal.title };
    return next;
  }

  function tickSideDeal(state, playerId, track, amount) {
    amount = amount || 1;
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player || !player.sideDeal || player.sideDeal.track !== track) {
      return state;
    }
    var deal = Object.assign({}, player.sideDeal, {
      progress: (player.sideDeal.progress || 0) + amount
    });
    var next = replacePlayer(state, playerId, Object.assign({}, player, { sideDeal: deal }));
    if (deal.progress >= deal.need) {
      return resolveSideDeal(next, playerId, true);
    }
    return next;
  }

  function checkSideDealDeadline(state, playerId) {
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player || !player.sideDeal) {
      return state;
    }
    if (state.round > player.sideDeal.deadlineRound) {
      return resolveSideDeal(state, playerId, false);
    }
    return state;
  }

  function rankPlayersByRolePoints(state) {
    return (state.players || [])
      .slice()
      .sort(function (a, b) {
        var da = (b.rolePoints || 0) - (a.rolePoints || 0);
        if (da) {
          return da;
        }
        return String(a.id).localeCompare(String(b.id));
      });
  }

  function disruptForeignZone(state, actorId) {
    var candidates = (state.zones || []).filter(function (zone) {
      return (
        zone.ownerId &&
        zone.ownerId !== actorId &&
        zone.type !== "home" &&
        !zone.disrupted
      );
    });
    if (!candidates.length) {
      return { state: state, zone: null };
    }
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    var zones = state.zones.map(function (zone) {
      return zone.id === pick.id ? Object.assign({}, zone, { disrupted: true }) : zone;
    });
    return {
      state: Object.assign({}, state, { zones: zones }),
      zone: pick
    };
  }

  /* Sofort-SP beim Bau entfallen — Dauerziele (Goals) vergeben own-Metrik-Punkte. */
  function awardBuildRolePoints(state, playerId, zoneType, variant, zone) {
    var tileId =
      (zone && zone.tileId) ||
      (Nexus.tileIdFromZone
        ? Nexus.tileIdFromZone({ type: zoneType, variant: variant || null })
        : null);
    if (Nexus.Goals && Nexus.Goals.onBuild && tileId) {
      var result = Nexus.Goals.onBuild(state, playerId, tileId, zone || {
        type: zoneType,
        variant: variant || null,
        tileId: tileId,
        ownerId: playerId
      });
      return result && result.state ? result.state : state;
    }
    return state;
  }

  /* Offen/Zu-Rechenzentrum entfernt — No-Op für Alt-Aufrufer. */
  function setDatacenterMode(state) {
    return state;
  }

  function zoneUpgradeLevel(zone) {
    if (!zone) {
      return 0;
    }
    var level = zone.upgradeLevel || 0;
    var max = C.ZONE_UPGRADE_MAX || 1;
    if (level < 0) {
      return 0;
    }
    return level > max ? max : level;
  }

  function zonePrimaryBase(zone, state, player) {
    var def = resolveZoneYieldDef(zone);
    if (!def || !def.primary) {
      return 0;
    }
    if (state && player && isEnterpriseZone(zone)) {
      return enterpriseYieldAmount(state, player.id, zone) + zoneUpgradeLevel(zone);
    }
    if (state && def.adjacentResidentialBonus) {
      return (
        (def.primaryBase || 0) +
        countAdjacentResidential(state, zone.q, zone.r) +
        zoneUpgradeLevel(zone)
      );
    }
    return (def.primaryBase || 0) + zoneUpgradeLevel(zone);
  }

  function homeBaseProduction(zone) {
    var yieldMap = emptyResources();
    var amount = C.HOME_BASE_YIELD + zoneUpgradeLevel(zone);
    KEYS.forEach(function (key) {
      yieldMap[key] = amount;
    });
    return yieldMap;
  }

  function playerHomeZone(state, playerId) {
    var found = null;
    playerZones(state, playerId).forEach(function (zone) {
      if (zone.type === "home") {
        found = zone;
      }
    });
    return found;
  }

  /* ---------- Geräte ---------- */

  function getBuildOffer(state, deviceId, mode, options) {
    options = options || {};
    var player = currentPlayer(state);
    var device = Nexus.DEVICES_BY_ID[deviceId];
    var currentMode = player.devices[deviceId];
    var offer = {
      allowed: false,
      reason: "",
      cost: {},
      usedHubDiscount: false,
      usedLocalHardwareDiscount: false,
      isUpgrade: false
    };

    if (!device || (mode !== "cloud" && mode !== "local")) {
      offer.reason = "Ungültige Auswahl.";
      return offer;
    }
    if (state.turnPhase !== "build" && !options.ignorePhase) {
      offer.reason = "Jetzt kann nicht gebaut werden.";
      return offer;
    }
    if (currentMode === "local") {
      offer.reason = "Bereits lokal gebaut.";
      return offer;
    }
    if (currentMode === "cloud" && mode === "cloud") {
      offer.reason = "Cloud steht. Aufwerten auf lokal möglich.";
      return offer;
    }
    if (currentMode === "cloud" && mode === "local") {
      offer.isUpgrade = true;
    }
    if (device.requiresZoneType && !playerHasZoneType(state, player.id, device.requiresZoneType)) {
      offer.reason = "Benötigt Zone: " + (ZONE_TYPES[device.requiresZoneType] || {}).label + ".";
      return offer;
    }
    if (device.localOnly && mode === "cloud") {
      offer.reason = "Nur lokal verfügbar.";
      return offer;
    }
    if (!device.costs[mode]) {
      offer.reason = "Modus nicht verfügbar.";
      return offer;
    }

    var cost = rawBuildCost(device, mode, currentMode);
    if (player.hubDiscountPending) {
      cost = applyHubDiscount(cost);
      offer.usedHubDiscount = true;
    }
    if (player.localHardwareDiscountPending && mode === "local" && (cost.money || 0) > 0) {
      cost = Object.assign({}, cost);
      cost.money -= 1;
      if (cost.money <= 0) {
        delete cost.money;
      }
      offer.usedLocalHardwareDiscount = true;
    }
    if (player.workshopDiscountPending) {
      var workshop = applyWorkshopDiscount(player, cost);
      cost = workshop.cost;
      if (workshop.used) {
        offer.usedWorkshopDiscount = true;
      }
    }

    offer.cost = cost;
    if (!canAfford(player.resources, cost)) {
      offer.reason = "Nicht genug Ressourcen.";
      return offer;
    }
    offer.allowed = true;
    return offer;
  }

  function effectFactor(mode, modifiers) {
    if (mode === "local") {
      return 1;
    }
    if (modifiers.cloudDisabled) {
      return 0;
    }
    if (modifiers.cloudHalfEffect) {
      return 0.5;
    }
    return 1;
  }

  function hasLocalPrivacyShield(player) {
    if (player.devices.camera === "local") {
      return true;
    }
    if (player.devices.edge === "local" || player.devices.hub === "local") {
      return true;
    }
    return Nexus.localDeviceRatio(player) >= 75;
  }

  function tryPrivacyShieldEvent(state, player) {
    if (!hasLocalPrivacyShield(player)) {
      return null;
    }
    return {
      id: "privacy-shield",
      title: "Datenleck abgewehrt",
      text: "Ein Datenleck wurde durch lokale Absicherung neutralisiert.",
      auto: true,
      requiresCloudCamera: false,
      isPrivacyShield: true,
      choices: [
        {
          id: "ok",
          label: "Verstanden",
          summary: "Ereignis ohne Effekt abgewehrt",
          effects: { privacyShield: true }
        }
      ]
    };
  }

  function shuffleCopy(list) {
    var arr = list.slice();
    var i;
    for (i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function buildIdDeck(spec) {
    var deck = [];
    spec.forEach(function (item) {
      var n;
      for (n = 0; n < item.count; n++) {
        deck.push(item.id);
      }
    });
    return shuffleCopy(deck);
  }

  function buildEventDeck() {
    return buildIdDeck(Nexus.EVENT_DECK_SPEC);
  }

  function buildInnovationDeck() {
    var catalog = Nexus.STADT_AKTEN || Nexus.INNOVATION_CARDS || [];
    return shuffleCopy(
      catalog.map(function (card) {
        return card.id;
      })
    );
  }

  function cardById(id) {
    return (
      (Nexus.STADT_AKTEN_BY_ID && Nexus.STADT_AKTEN_BY_ID[id]) ||
      (Nexus.INNOVATION_CARDS_BY_ID && Nexus.INNOVATION_CARDS_BY_ID[id]) ||
      null
    );
  }

  function refillDeck(deck, discard) {
    if (deck.length) {
      return { deck: deck, discard: discard };
    }
    return { deck: shuffleCopy(discard), discard: [] };
  }

  function drawEventFromDeck(state, player) {
    var filled = refillDeck((state.eventDeck || []).slice(), (state.eventDiscard || []).slice());
    var deck = filled.deck;
    var discard = filled.discard;
    var skipped = [];
    var event = null;
    var id;
    while (deck.length) {
      id = deck.shift();
      var def = Nexus.EVENTS_BY_ID[id];
      if (!def) {
        continue;
      }
      if (def.requiresCloudCamera && player.devices.camera !== "cloud") {
        skipped.push(id);
        continue;
      }
      if (def.sideDealOnly && player.sideDeal) {
        skipped.push(id);
        continue;
      }
      event = Object.assign({}, def);
      discard.push(id);
      break;
    }
    deck = deck.concat(skipped);
    if (!event && skipped.length) {
      filled = refillDeck([], skipped);
      deck = filled.deck;
      id = deck.shift();
      event = Object.assign({}, Nexus.EVENTS_BY_ID[id]);
      discard.push(id);
    }
    if (event && event.id === "data-leak" && hasLocalPrivacyShield(player)) {
      event = tryPrivacyShieldEvent(state, player);
    }
    return { event: event, eventDeck: deck, eventDiscard: discard };
  }

  function drawInnovationFromDeck(state, preferredCategory, preferredKind) {
    var filled = refillDeck(
      (state.innovationDeck || []).slice(),
      (state.innovationDiscard || []).slice()
    );
    var deck = filled.deck;
    var discard = filled.discard;
    if (!deck.length) {
      return { card: null, innovationDeck: deck, innovationDiscard: discard };
    }
    var idx = 0;
    var i;
    var def;
    if (preferredKind || preferredCategory) {
      for (i = 0; i < deck.length; i++) {
        def = cardById(deck[i]);
        if (!def) {
          continue;
        }
        if (preferredKind && def.kind !== preferredKind) {
          continue;
        }
        if (preferredCategory && def.category !== preferredCategory) {
          continue;
        }
        idx = i;
        break;
      }
    }
    var id = deck.splice(idx, 1)[0];
    discard.push(id);
    return {
      card: cardById(id),
      innovationDeck: deck,
      innovationDiscard: discard
    };
  }

  function makeHandCard(card) {
    return {
      id: card.id,
      kind: card.kind || "briefing",
      name: card.name,
      category: card.category,
      text: card.text,
      effects: card.effects || {},
      mandate: card.mandate || null,
      pressure: card.pressure || null
    };
  }

  function addCardToHand(player, card) {
    return Object.assign({}, player, {
      handCards: (player.handCards || []).concat([makeHandCard(card)]),
      greenInnovationCards:
        (player.greenInnovationCards || 0) + (card.category === "green" ? 1 : 0),
      innovationCardsTotal: (player.innovationCardsTotal || 0) + 1
    });
  }

  function applyCardEffects(player, card) {
    var effects = card.effects || {};
    var resources = cloneResources(player.resources);
    var mapped = normalizeCost(effects);
    KEYS.forEach(function (key) {
      if (mapped[key]) {
        resources[key] += mapped[key];
      }
    });
    var scores = bumpScores(player.scores, effects);
    var next = Object.assign({}, player, {
      resources: resources,
      scores: scores,
      risk: Math.max(0, player.risk + (effects.risk || 0))
    });
    if (effects.ownSp) {
      next.rolePoints = Math.max(0, (next.rolePoints || 0) + effects.ownSp);
    }
    if (effects.freeZoneClaim) {
      next.freeZoneClaims = (next.freeZoneClaims || 0) + effects.freeZoneClaim;
    }
    return next;
  }

  function grantInnovationCards(state, player, count, preferredCategory) {
    var nextState = state;
    var nextPlayer = player;
    var granted = [];
    var n;
    for (n = 0; n < count; n++) {
      var drawn = drawInnovationFromDeck(nextState, preferredCategory);
      nextState = Object.assign({}, nextState, {
        innovationDeck: drawn.innovationDeck,
        innovationDiscard: drawn.innovationDiscard
      });
      if (!drawn.card) {
        break;
      }
      nextPlayer = addCardToHand(nextPlayer, drawn.card);
      granted.push(drawn.card);
    }
    return { state: nextState, player: nextPlayer, cards: granted };
  }

  function maybeAutoDrawInnovation(state) {
    var player = currentPlayer(state);
    if (!player || player.drewInnovationThisTurn) {
      return state;
    }
    if ((player.handCards || []).length >= C.HAND_LIMIT) {
      return state;
    }
    if (!(state.innovationDeck || []).length && !(state.innovationDiscard || []).length) {
      return state;
    }
    var granted = grantInnovationCards(state, player, 1, null);
    if (!granted.cards[0]) {
      return state;
    }
    var nextPlayer = Object.assign({}, granted.player, { drewInnovationThisTurn: true });
    var next = replacePlayer(granted.state, player.id, nextPlayer);
    var kindLabel =
      (Nexus.STADT_AKTE_KIND_LABELS && Nexus.STADT_AKTE_KIND_LABELS[granted.cards[0].kind]) ||
      "Akte";
    next.log = addLog(
      next,
      player.name,
      "Stadtakte gezogen (" + kindLabel + "): " + granted.cards[0].name + "."
    );
    return next;
  }

  function enterBuildPhase(state) {
    var next = Object.assign({}, state, { turnPhase: "build", riskPreview: state.riskPreview || null });
    if (Nexus.Projects) {
      next = Nexus.Projects.ensureMarket(next);
    }
    return maybeAutoDrawInnovation(next);
  }

  function mandateNeedLabel(need) {
    if (!need) {
      return "Auftrag";
    }
    if (need.upgrade) {
      return "Ausbau ×" + (need.count || 1);
    }
    if (need.tileId && Nexus.BUILD_TILES && Nexus.BUILD_TILES[need.tileId]) {
      var tile = Nexus.BUILD_TILES[need.tileId];
      return (tile.shortLabel || tile.label || need.tileId) + " ×" + (need.count || 1);
    }
    var typeDef = ZONE_TYPES[need.buildType];
    var label = (typeDef && typeDef.shortLabel) || need.buildType || "Bau";
    if (need.buildVariant) {
      var vDef = variantDefFor(need.buildType, need.buildVariant);
      if (vDef && vDef.shortLabel) {
        label = vDef.shortLabel;
      } else if (vDef && vDef.label) {
        label = vDef.label;
      }
    }
    return label + " ×" + (need.count || 1);
  }

  function activateMandate(player, card) {
    var need = (card.mandate && card.mandate.need) || {};
    var reward = (card.mandate && card.mandate.reward) || card.effects || {};
    var active = (player.activeMandates || []).concat([
      {
        cardId: card.id,
        name: card.name,
        progress: 0,
        need: Object.assign({}, need),
        reward: Object.assign({}, reward),
        label: mandateNeedLabel(need)
      }
    ]);
    return Object.assign({}, player, {
      activeMandates: active,
      innovationCardsTotal: (player.innovationCardsTotal || 0) + 1,
      greenInnovationCards:
        (player.greenInnovationCards || 0) + (card.category === "green" ? 1 : 0)
    });
  }

  function mandateMatches(entry, event) {
    if (!entry || !entry.need || !event) {
      return false;
    }
    var need = entry.need;
    if (need.upgrade) {
      return !!event.upgrade;
    }
    if (need.tileId) {
      return event.tileId === need.tileId;
    }
    if (!event.buildType) {
      return false;
    }
    if (need.buildType && event.buildType !== need.buildType) {
      return false;
    }
    if (need.buildVariant && event.buildVariant !== need.buildVariant) {
      return false;
    }
    return true;
  }

  function tickMandates(state, playerId, event) {
    var player = null;
    (state.players || []).forEach(function (p) {
      if (p.id === playerId) {
        player = p;
      }
    });
    if (!player || !(player.activeMandates || []).length) {
      return state;
    }
    var completed = [];
    var remaining = [];
    var changed = false;
    (player.activeMandates || []).forEach(function (entry) {
      var nextEntry = Object.assign({}, entry, {
        need: Object.assign({}, entry.need),
        reward: Object.assign({}, entry.reward)
      });
      if (mandateMatches(entry, event)) {
        nextEntry.progress = (entry.progress || 0) + 1;
        changed = true;
      }
      var needCount = (entry.need && entry.need.count) || 1;
      if (nextEntry.progress >= needCount) {
        completed.push(nextEntry);
        changed = true;
      } else {
        remaining.push(nextEntry);
      }
    });
    if (!changed) {
      return state;
    }
    var nextPlayer = Object.assign({}, player, { activeMandates: remaining });
    var karmaPending = [];
    completed.forEach(function (entry) {
      nextPlayer = applyCardEffects(nextPlayer, { effects: entry.reward || {} });
      if (entry.reward && entry.reward.karma) {
        karmaPending.push({ delta: entry.reward.karma, name: entry.name });
      }
      nextPlayer = Object.assign({}, nextPlayer, {
        playedCards: (nextPlayer.playedCards || []).concat([
          { id: entry.cardId, name: entry.name, kind: "mandate", text: "Mandat erfüllt" }
        ])
      });
    });
    var next = replacePlayer(state, playerId, nextPlayer);
    karmaPending.forEach(function (item) {
      next = applyKarma(next, playerId, item.delta, item.name);
    });
    completed.forEach(function (entry) {
      next.log = addLog(next, player.name, "Mandat erfüllt: " + entry.name + ".");
    });
    if (completed.length) {
      next.lastScoreCause = { kind: "mandate", label: completed[0].name };
    }
    return next;
  }

  function playInnovationCard(state, index, opts) {
    opts = opts || {};
    if (state.turnPhase !== "build") {
      return state;
    }
    if (state.pendingPressure) {
      return state;
    }
    var player = currentPlayer(state);
    if (!player) {
      return state;
    }
    var hand = (player.handCards || []).slice();
    if (index < 0 || index >= hand.length) {
      return state;
    }
    var card = hand[index];
    var kind = card.kind || "briefing";
    if (kind === "pressure") {
      if (!opts.targetId || opts.targetId === player.id) {
        return state;
      }
      var targetOk = (state.players || []).some(function (p) {
        return p.id === opts.targetId;
      });
      if (!targetOk) {
        return state;
      }
      hand.splice(index, 1);
      var nextPlayer = Object.assign({}, player, { handCards: hand });
      var next = replacePlayer(state, player.id, nextPlayer);
      next.pendingPressure = {
        card: makeHandCard(card),
        fromId: player.id,
        toId: opts.targetId
      };
      next.log = addLog(
        next,
        player.name,
        "Druckstück: " + card.name + " — Antwort ausstehend."
      );
      return next;
    }
    hand.splice(index, 1);
    var played = Object.assign({}, card);
    var updated;
    if (kind === "mandate") {
      updated = activateMandate(Object.assign({}, player, { handCards: hand }), card);
      updated = Object.assign({}, updated, {
        playedCards: (player.playedCards || []).concat([
          { id: card.id, name: card.name, kind: "mandate", text: card.text }
        ])
      });
      return Object.assign({}, replacePlayer(state, player.id, updated), {
        log: addLog(state, player.name, "Mandat angenommen: " + card.name + "."),
        lastScoreCause: { kind: "mandate", label: card.name }
      });
    }
    updated = Object.assign({}, applyCardEffects(player, card), {
      handCards: hand,
      playedCards: (player.playedCards || []).concat([played])
    });
    var nextBrief = Object.assign({}, replacePlayer(state, player.id, updated), {
      log: addLog(state, player.name, "Briefing: " + card.name + "."),
      lastScoreCause: { kind: "card", label: card.name }
    });
    if (card.effects && card.effects.karma) {
      nextBrief = applyKarma(nextBrief, player.id, card.effects.karma, card.name);
    }
    return nextBrief;
  }

  function resolvePressure(state, choice) {
    var pending = state.pendingPressure;
    if (!pending || !pending.card || !pending.toId) {
      return state;
    }
    var from = null;
    var to = null;
    (state.players || []).forEach(function (p) {
      if (p.id === pending.fromId) {
        from = p;
      }
      if (p.id === pending.toId) {
        to = p;
      }
    });
    if (!to) {
      return Object.assign({}, state, { pendingPressure: null });
    }
    var pressure = pending.card.pressure || {};
    var pay = pressure.pay || {};
    var next = state;
    var nextTo = to;
    var nextFrom = from;
    if (choice === "pay") {
      if (!canAfford(to.resources, pay)) {
        choice = "risk";
      } else {
        nextTo = Object.assign({}, to, { resources: subtractCost(to.resources, pay) });
        if (nextFrom && (pressure.karmaGain || pressure.imageGain)) {
          var gain = pressure.karmaGain || pressure.imageGain || 0;
          if (pressure.karmaGain) {
            /* Karma nach replacePlayer via applyKarma. */
          } else {
            nextFrom = Object.assign({}, nextFrom, {
              scores: bumpScores(nextFrom.scores, { image: gain })
            });
          }
        }
      }
    }
    if (choice !== "pay") {
      var karmaHit = pressure.orKarma != null ? pressure.orKarma : pressure.orRisk || 2;
      if (pressure.orKarma != null) {
        nextTo = Object.assign({}, nextTo, {
          karma: clampKarma((nextTo.karma || 0) - karmaHit)
        });
      } else {
        nextTo = Object.assign({}, nextTo, {
          risk: Math.max(0, (nextTo.risk || 0) + karmaHit),
          riskShock: Math.max(0, (nextTo.riskShock || 0) + karmaHit)
        });
      }
    }
    next = replacePlayer(next, nextTo.id, nextTo);
    if (nextFrom && nextFrom.id !== nextTo.id) {
      next = replacePlayer(next, nextFrom.id, nextFrom);
    }
    if (choice === "pay" && nextFrom && pressure.karmaGain) {
      next = applyKarma(next, nextFrom.id, pressure.karmaGain, pending.card.name);
    }
    if (choice !== "pay" && pressure.orKarma != null && Nexus.Goals && Nexus.Goals.syncKarmaGoals) {
      next = Nexus.Goals.syncKarmaGoals(next, nextTo.id);
    }
    var fromName = (nextFrom && nextFrom.name) || "Akte";
    next = Object.assign({}, next, {
      pendingPressure: null,
      log: addLog(
        next,
        to.name,
        choice === "pay"
          ? "Druckstück akzeptiert (" + pending.card.name + ") — gezahlt."
          : "Druckstück abgelehnt (" + pending.card.name + ") — Karma."
      ),
      lastScoreCause: { kind: "pressure", label: pending.card.name }
    });
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    return next;
  }

  function pickEventForPlayer(state, player) {
    return drawEventFromDeck(state, player);
  }

  /* ---------- Fabrik-Produktion (Abschnitt 3.2 / 3.3) ---------- */

  function diceWeightTotal() {
    return Nexus.PRODUCTION_DICE.reduce(function (sum, die) {
      return sum + die.weight;
    }, 0);
  }

  function rollProductionDie() {
    var i;
    for (i = 0; i < Nexus.PRODUCTION_DICE.length; i++) {
      if (Nexus.PRODUCTION_DICE[i].modifier === 0) {
        return Nexus.PRODUCTION_DICE[i];
      }
    }
    return { id: "normal", modifier: 0, label: "Normal", weight: 1 };
  }

  function yieldAmount(base, modifier) {
    return Math.max(C.FACTORY_MIN_YIELD, base + modifier);
  }

  function expectedYieldForBase(base) {
    var total = diceWeightTotal();
    var weighted = Nexus.PRODUCTION_DICE.reduce(function (sum, die) {
      return sum + yieldAmount(base, die.modifier) * die.weight;
    }, 0);
    return weighted / total;
  }

  function produceForZone(zone, modifier, player, state) {
    if (zone.type === "home") {
      return null;
    }
    var def = resolveZoneYieldDef(zone);
    if (!def || !def.primary) {
      return null;
    }
    var base = zonePrimaryBase(zone, state, player);
    var amount;
    var moneySpent = 0;
    var energySpent = 0;
    var bandwidthSpent = 0;
    /* Katalog-Tiles und stabile Varianten: feste Ernte. Wohnen braucht kein RZ. */
    if (def.stable || def.tileId || zone.type === "commerce" || zone.type === "residential") {
      amount = base;
      if (zone.variant === "transformer" && zone.type === "energy") {
        moneySpent = amount * (C.TRANSFORMER_MONEY_PER_ENERGY || 1);
        if ((player.resources.money || 0) < moneySpent) {
          amount = 0;
          moneySpent = 0;
        }
      }
      if (def.upkeep) {
        energySpent = def.upkeep.energy || 0;
        bandwidthSpent = def.upkeep.bandwidth || 0;
        moneySpent += def.upkeep.money || 0;
        if (
          (player.resources.energy || 0) < energySpent ||
          (player.resources.bandwidth || 0) < bandwidthSpent ||
          (player.resources.money || 0) < (def.upkeep.money || 0)
        ) {
          amount = 0;
          energySpent = 0;
          bandwidthSpent = 0;
          moneySpent = zone.variant === "transformer" ? 0 : moneySpent;
          if (def.upkeep.money) {
            moneySpent = 0;
          }
        }
      }
    } else {
      amount = yieldAmount(base, modifier);
    }
    var harvestHint = null;
    if (def.harvestScoreHint) {
      harvestHint = def.harvestScoreHint;
    }
    var result = {
      primary: { resource: def.primary, amount: amount },
      moneySpent: moneySpent,
      energySpent: energySpent,
      bandwidthSpent: bandwidthSpent,
      scoreHint: harvestHint,
      riskDelta: 0
    };
    if (def.secondary && amount > 0) {
      result.secondary = {
        resource: def.secondary,
        amount: (def.secondaryBase || 0) + zoneUpgradeLevel(zone)
      };
    }
    return result;
  }

  function produceForZoneType(zoneTypeId, modifier) {
    return produceForZone({ type: zoneTypeId, variant: defaultVariantFor(zoneTypeId) }, modifier, {
      resources: emptyResources(),
      id: "_"
    }, { zones: [] });
  }

  function expectedByResource(state) {
    var player = currentPlayer(state);
    var expected = homeBaseProduction(player ? playerHomeZone(state, player.id) : null);
    if (!player) {
      return expected;
    }
    playerFactoryZones(state, player.id).forEach(function (zone) {
      var def = resolveZoneYieldDef(zone);
      if (!def || !def.primary) {
        return;
      }
      var base = zonePrimaryBase(zone, state, player);
      expected[def.primary] += base;
      if (def.secondary) {
        expected[def.secondary] = (expected[def.secondary] || 0) + (def.secondaryBase || 0);
      }
      if (zone.variant === "transformer" && zone.type === "energy") {
        expected.money -= base * (C.TRANSFORMER_MONEY_PER_ENERGY || 1);
      }
      if (def.upkeep) {
        expected.energy -= def.upkeep.energy || 0;
        expected.bandwidth -= def.upkeep.bandwidth || 0;
        expected.money -= def.upkeep.money || 0;
      }
    });
    expected.bandwidth -= cloudUpkeepCost(player);
    return expected;
  }

  function zoneAt(state, q, r) {
    var found = null;
    state.zones.forEach(function (zone) {
      if (zone.q === q && zone.r === r) {
        found = zone;
      }
    });
    return found;
  }

  function isExpandableSlot(state, q, r) {
    var player = currentPlayer(state);
    if (!player || zoneAt(state, q, r)) {
      return false;
    }
    var inside = Nexus.boardSlots().some(function (slot) {
      return slot.q === q && slot.r === r;
    });
    if (!inside) {
      return false;
    }
    var homeSlots =
      Nexus.homePositionsForCount && state.players
        ? Nexus.homePositionsForCount(state.players.length)
        : Nexus.HOME_POSITIONS;
    var reservedHome = homeSlots.some(function (pos) {
      return pos.q === q && pos.r === r;
    });
    if (reservedHome) {
      return false;
    }
    if (!C.EXPAND_REQUIRES_ADJACENT) {
      return true;
    }
    return playerZones(state, player.id).some(function (zone) {
      return Nexus.isAdjacent(zone, { q: q, r: r });
    });
  }

  function getExpandCost(state) {
    var player = currentPlayer(state);
    if (player && (player.freeZoneClaims || 0) > 0) {
      return {};
    }
    var owned = player ? playerFactoryZones(state, player.id).length : 0;
    var extra = Math.max(0, owned - C.START_ZONE_COUNT);
    var cost = { money: 2 + extra };
    if (extra >= 1) {
      cost.energy = 1;
    }
    if (extra >= 3) {
      cost.bandwidth = 1;
    }
    return cost;
  }

  function getExpandOffer(state, q, r, zoneType, variant, tileId) {
    var offer = {
      allowed: false,
      reason: "",
      cost: {},
      tileId: null,
      variant: null
    };
    var player = currentPlayer(state);
    if (state.turnPhase !== "build") {
      offer.reason = "Erweitern nur in der Bauphase.";
      return offer;
    }
    var spec = resolveBuildSpec(zoneType, variant, tileId);
    if (!spec.type || Nexus.ZONE_TYPE_KEYS.indexOf(spec.type) === -1) {
      offer.reason = "Ungültiger Zonentyp.";
      return offer;
    }
    if (!spec.def && !(ZONE_TYPES[spec.type] && !Nexus.BUILD_TILES)) {
      offer.reason = "Unbekanntes Feld.";
      return offer;
    }
    var typeDef = ZONE_TYPES[spec.type];
    if (typeDef && typeDef.variants && typeDef.variants.length && spec.variant) {
      if (typeDef.variants.indexOf(spec.variant) === -1) {
        offer.reason = "Ungültige Variante.";
        return offer;
      }
    }
    if (!isExpandableSlot(state, q, r)) {
      offer.reason = "Dieses Feld kann nicht bebaut werden.";
      return offer;
    }
    var cost = tileBuildCost(spec, player);
    if (cost == null) {
      offer.reason = "Keine Baukosten für dieses Feld.";
      return offer;
    }
    offer.cost = cost;
    offer.tileId = spec.tileId;
    offer.variant = spec.variant;
    offer.type = spec.type;
    if (!canAfford(player.resources, offer.cost)) {
      offer.reason = "Nicht genug Ressourcen.";
      return offer;
    }
    offer.allowed = true;
    return offer;
  }

  function canAffordExpandSlot(state, q, r) {
    if (!isExpandableSlot(state, q, r) || state.turnPhase !== "build") {
      return false;
    }
    return Nexus.ZONE_TYPE_KEYS.some(function (key) {
      return getExpandOffer(state, q, r, key).allowed;
    });
  }

  /* Einmal pro Zug: neben fremdem Feld → +1 Image, Nachbar +1 Risiko. */
  function applyNeighborhoodPressure(state, builderId, q, r) {
    var builder = null;
    (state.players || []).forEach(function (p) {
      if (p.id === builderId) {
        builder = p;
      }
    });
    if (!builder || builder.neighborhoodPressureUsed || !Nexus.neighbors) {
      return state;
    }
    var foreignIds = [];
    var seen = {};
    Nexus.neighbors(q, r).forEach(function (n) {
      var z = zoneAt(state, n.q, n.r);
      if (z && z.ownerId && z.ownerId !== builderId && !seen[z.ownerId]) {
        seen[z.ownerId] = true;
        foreignIds.push(z.ownerId);
      }
    });
    if (!foreignIds.length) {
      return state;
    }
    var next = replacePlayer(
      state,
      builderId,
      Object.assign({}, builder, {
        scores: bumpScores(builder.scores, { image: 1 }),
        neighborhoodPressureUsed: true
      })
    );
    foreignIds.forEach(function (oid) {
      var victim = null;
      next.players.forEach(function (p) {
        if (p.id === oid) {
          victim = p;
        }
      });
      if (!victim) {
        return;
      }
      var notices = (victim.pendingNotices || []).slice();
      notices.push("Nachbarschaftsdruck: +1 Risiko — " + builder.name + " hat neben dich gebaut.");
      next = replacePlayer(
        next,
        oid,
        Object.assign({}, victim, {
          riskShock: (victim.riskShock || 0) + 1,
          pendingNotices: notices
        })
      );
    });
    next.log = addLog(
      next,
      builder.name,
      "Nachbarschaftsdruck: +1 Image · benachbarte Stadt +1 Risiko."
    );
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    return next;
  }

  function buyZone(state, q, r, zoneType, variant, tileId) {
    var offer = getExpandOffer(state, q, r, zoneType, variant, tileId);
    if (!offer.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var spec = resolveBuildSpec(zoneType, variant, tileId || offer.tileId);
    var resolvedType = offer.type || spec.type;
    var resolvedVariant = offer.variant != null ? offer.variant : spec.variant;
    var resolvedTileId = offer.tileId || spec.tileId;
    var tileDef = spec.def || (resolvedTileId && Nexus.BUILD_TILES && Nexus.BUILD_TILES[resolvedTileId]);
    var scores = cloneScores(player.scores);
    var newZone = {
      id: "zone-" + q + "-" + r,
      q: q,
      r: r,
      type: resolvedType,
      variant: resolvedVariant,
      tileId: resolvedTileId,
      ownerId: player.id,
      upgradeLevel: 0,
      harvested: true, /* erst ab nächster Runde produktiv */
      lastYield: null,
      trafficMode: resolvedType === "taxi" ? "taxi" : null,
      busStop: false,
      builtRound: state.round || 1
    };
    var zones = state.zones.concat([newZone]);
    var usedCoupon = Object.keys(offer.cost).length === 0 && (player.freeZoneClaims || 0) > 0;
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, offer.cost),
      freeZoneClaims: usedCoupon ? player.freeZoneClaims - 1 : player.freeZoneClaims || 0,
      scores: scores,
      hasDepot: false,
      workshopDiscountPending: !!player.workshopDiscountPending
    });
    var label =
      (tileDef && (tileDef.label || tileDef.shortLabel)) ||
      (ZONE_TYPES[resolvedType] && ZONE_TYPES[resolvedType].label) ||
      resolvedType;
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    next = consumeDevBuildOnceForZone(next, resolvedType, resolvedVariant, newZone.trafficMode, false);
    next = awardBuildRolePoints(next, player.id, resolvedType, resolvedVariant, newZone);
    if (tileDef && tileDef.karmaOnBuild) {
      next = applyKarma(next, player.id, tileDef.karmaOnBuild, label);
    }
    var why = Nexus.WHY && Nexus.WHY[resolvedTileId || resolvedType] ? " " + Nexus.WHY[resolvedTileId || resolvedType] : "";
    next.log = addLog(
      next,
      player.name,
      (usedCoupon
        ? "Startfeld gewählt: " + label + "."
        : "Zone erweitert: " + label + " für " + formatCost(offer.cost) + ".") + why
    );
    next.lastScoreCause = { q: q, r: r, label: label };
    next = applyNeighborhoodPressure(next, player.id, q, r);
    if (resolvedType === "energy" && resolvedVariant === "solar") {
      next = tickSideDeal(next, player.id, "buildSolar", 1);
    }
    if (resolvedType === "residential") {
      next = tickSideDeal(next, player.id, "buildResidential", 1);
    }
    if (resolvedType === "taxi") {
      next = tickSideDeal(next, player.id, "buildTraffic", 1);
    }
    next = tickMandates(next, player.id, {
      buildType: resolvedType,
      buildVariant: resolvedVariant || null,
      tileId: resolvedTileId || null
    });
    if (resolvedTileId && tileMatchesPlayerMetric(resolvedTileId, player)) {
      next = tickContractProgress(next, player.id, { buildMetric: 1 });
    }
    return next;
  }

  /* Darstellungshilfe: vorhandene Bau-/Ertragsregeln als Vorschau, keine neuen Regeln. */
  function describeZoneBuild(state, zoneType, variant) {
    var typeDef = ZONE_TYPES[zoneType];
    var resolvedVariant = variant || defaultVariantFor(zoneType);
    var variantDef = variantDefFor(zoneType, resolvedVariant);
    var yieldDef = typeDef
      ? resolveZoneYieldDef({ type: zoneType, variant: resolvedVariant })
      : null;
    var label = typeDef ? typeDef.label : zoneType;
    if (variantDef && variantDef.label && variantDef.label !== typeDef.label) {
      label += " · " + variantDef.label;
    }
    var onBuild = emptyScores();
    var riskOnBuild = 0;
    if (variantDef && variantDef.scoreHint) {
      onBuild = bumpScores(onBuild, variantDef.scoreHint);
    }
    if (typeDef && typeDef.scoreHint && !variantDef) {
      onBuild = bumpScores(onBuild, typeDef.scoreHint);
    }
    if (variantDef && variantDef.riskOnBuild) {
      riskOnBuild = variantDef.riskOnBuild;
    }
    if (zoneType === "traffic") {
      var previewPlayer = currentPlayer(state);
      var hasTraffic = previewPlayer && playerFactoryZones(state, previewPlayer.id).some(function (zone) {
        return zone.type === "traffic";
      });
      if (!hasTraffic) {
        onBuild = bumpScores(onBuild, { comfort: 1 });
      }
    }
    var production = null;
    if (yieldDef && yieldDef.primary) {
      production = {
        resource: yieldDef.primary,
        amount: yieldDef.primaryBase || 0,
        dice: !!yieldDef.dice,
        stable: !!yieldDef.stable,
        moneyPerEnergy:
          yieldDef.stable && resolvedVariant === "transformer"
            ? C.TRANSFORMER_MONEY_PER_ENERGY || 1
            : 0,
        upkeep: yieldDef.upkeep ? Object.assign({}, yieldDef.upkeep) : null,
        harvestScoreHint: yieldDef.harvestScoreHint
          ? Object.assign({}, yieldDef.harvestScoreHint)
          : null
      };
    }
    var buildSpec = resolveBuildSpec(zoneType, resolvedVariant, null);
    var tileDef = buildSpec.def;
    if (tileDef) {
      label = tileDef.label || label;
      if (tileDef.primary) {
        production = {
          resource: tileDef.primary,
          amount: tileDef.primaryBase || 0,
          dice: false,
          stable: true,
          moneyPerEnergy: 0,
          upkeep: tileDef.upkeep ? Object.assign({}, tileDef.upkeep) : null,
          harvestScoreHint: null,
          secondary: tileDef.secondary || null,
          secondaryBase: tileDef.secondaryBase || 0
        };
      } else {
        production = null;
      }
    }
    var flags = {
      residentialNeedsDc: false,
      transformerUpkeep: false,
      taxiUpkeep: false,
      solarDice: false,
      dcUnlocksBandwidth: false,
      insecureRisk: false,
      trafficInfrastructure: false,
      producesNextRound: true,
      karmaOnBuild: tileDef ? tileDef.karmaOnBuild || 0 : 0
    };
    if (production && production.upkeep) {
      flags.taxiUpkeep = true;
    }
    if (zoneType === "energy" && (resolvedVariant === "nuclear" || resolvedVariant === "coal")) {
      flags.nuclearRisk = resolvedVariant === "nuclear";
    }
    if (zoneType === "commerce" && (resolvedVariant === "factory" || (tileDef && tileDef.adjacentResidentialBonus))) {
      flags.factoryAdjacent = true;
    }
    if (zoneType === "commerce" && (resolvedVariant === "enterprise" || resolvedVariant === "large" || (tileDef && tileDef.enterpriseCurve))) {
      flags.enterpriseCurve = true;
      flags.enterpriseRamp = (C.ENTERPRISE_RAMP || [1, 3, 5]).join("→");
      flags.enterpriseMature = (C.ENTERPRISE_MATURE || [5, 3, 1]).join("→");
    }
    var devices = (Nexus.DEVICES || [])
      .filter(function (device) {
        return device.requiresZoneType === zoneType;
      })
      .map(function (device) {
        return {
          id: device.id,
          name: device.name,
          shortName: device.shortName
        };
      });
    var playerForCost = currentPlayer(state);
    var cost = tileBuildCost(buildSpec, playerForCost);
    return {
      type: zoneType,
      variant: resolvedVariant || null,
      tileId: buildSpec.tileId,
      label: label,
      cost: cost || {},
      production: production,
      onBuild: onBuild,
      riskOnBuild: 0,
      karmaOnBuild: flags.karmaOnBuild,
      flags: flags,
      devices: devices,
      upkeep: production && production.upkeep ? production.upkeep : null,
      harvestScoreHint:
        production && production.harvestScoreHint ? production.harvestScoreHint : null
    };
  }

  function zoneUpgradeCost(level) {
    var cost = {
      money: (C.ZONE_UPGRADE_MONEY_BASE || 3) + level * (C.ZONE_UPGRADE_MONEY_STEP || 2)
    };
    if (level >= 1 && (C.ZONE_UPGRADE_ENERGY || 0) > 0) {
      cost.energy = C.ZONE_UPGRADE_ENERGY;
    }
    return cost;
  }

  function describeZoneUpgrade(state, zoneId) {
    var preview = {
      allowed: false,
      reason: "",
      cost: {},
      fromLevel: 0,
      toLevel: 0,
      production: null,
      flags: {
        homeAllResources: false,
        transformerUpkeep: false,
        residentialNeedsDc: false,
        maxed: false
      }
    };
    var player = currentPlayer(state);
    var zone = (state.zones || []).filter(function (item) {
      return item.id === zoneId;
    })[0];
    if (!player || !zone) {
      preview.reason = "missing_zone";
      return preview;
    }
    preview.fromLevel = zoneUpgradeLevel(zone);
    preview.toLevel = preview.fromLevel + 1;
    preview.flags.homeAllResources = zone.type === "home";
    if (state.turnPhase !== "build") {
      preview.reason = "wrong_phase";
      return preview;
    }
    if (zone.ownerId !== player.id) {
      preview.reason = "not_owner";
      return preview;
    }
    if (preview.fromLevel >= (C.ZONE_UPGRADE_MAX || 1)) {
      preview.flags.maxed = true;
      preview.reason = "maxed";
      return preview;
    }
    preview.cost = zoneUpgradeCost(preview.fromLevel);
    if (zone.type === "home") {
      var homeFrom = C.HOME_BASE_YIELD + preview.fromLevel;
      preview.production = {
        resource: "all",
        fromAmount: homeFrom,
        toAmount: homeFrom + 1
      };
    } else {
      var def = resolveZoneYieldDef(zone);
      if (def && def.primary) {
        var fromBase = zonePrimaryBase(zone);
        preview.production = {
          resource: def.primary,
          fromAmount: fromBase,
          toAmount: fromBase + 1,
          dice: !!def.dice,
          stable: !!def.stable,
          moneyPerEnergy: def.stable ? C.TRANSFORMER_MONEY_PER_ENERGY || 1 : 0
        };
        preview.flags.transformerUpkeep = !!def.stable;
      }
    }
    preview.flags.residentialNeedsDc = false;
    if (!canAfford(player.resources, preview.cost)) {
      preview.reason = "cannot_afford";
      return preview;
    }
    preview.allowed = true;
    return preview;
  }

  function upgradeZone(state, zoneId) {
    var preview = describeZoneUpgrade(state, zoneId);
    if (!preview.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var zones = state.zones.map(function (zone) {
      if (zone.id !== zoneId) {
        return zone;
      }
      return Object.assign({}, zone, { upgradeLevel: preview.toLevel });
    });
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, preview.cost)
    });
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    next.log = addLog(
      next,
      player.name,
      "Feld ausgebaut auf Stufe " + preview.toLevel + " für " + formatCost(preview.cost) + "."
    );
    var upgradedZone = null;
    (next.zones || []).forEach(function (z) {
      if (z.id === zoneId) {
        upgradedZone = z;
      }
    });
    if (Nexus.Goals && Nexus.Goals.onUpgrade && upgradedZone) {
      var upgradeTileId =
        upgradedZone.tileId ||
        (Nexus.tileIdFromZone ? Nexus.tileIdFromZone(upgradedZone) : null);
      if (upgradeTileId) {
        var upResult = Nexus.Goals.onUpgrade(next, player.id, upgradeTileId);
        next = upResult && upResult.state ? upResult.state : next;
        if (tileMatchesPlayerMetric(upgradeTileId, player)) {
          next = tickContractProgress(next, player.id, { upgradeMetric: 1 });
        }
      }
    }
    next = tickSideDeal(next, player.id, "upgrade", 1);
    next = tickMandates(next, player.id, { upgrade: true });
    return next;
  }

  function playerNetworkConnectedWithout(state, playerId, omitZoneId) {
    var remaining = playerZones(state, playerId).filter(function (zone) {
      return zone.id !== omitZoneId;
    });
    var home = remaining.filter(function (zone) {
      return zone.type === "home";
    })[0];
    if (!home) {
      return false;
    }
    var seen = {};
    var queue = [home];
    seen[home.id] = true;
    while (queue.length) {
      var cur = queue.shift();
      remaining.forEach(function (zone) {
        if (!seen[zone.id] && Nexus.isAdjacent(cur, zone)) {
          seen[zone.id] = true;
          queue.push(zone);
        }
      });
    }
    return remaining.every(function (zone) {
      return !!seen[zone.id];
    });
  }

  function demolishRefund(zone) {
    return {
      money: (C.DEMOLISH_REFUND_MONEY || 1) + zoneUpgradeLevel(zone) * (C.DEMOLISH_REFUND_PER_LEVEL || 1)
    };
  }

  function describeDemolish(state, zoneId) {
    var preview = {
      allowed: false,
      reason: "",
      refund: { money: 0 },
      lostProduction: null,
      flags: {
        isHome: false,
        disconnects: false,
        losesComfort: false,
        losesEnvironment: false,
        residentialNeedsDc: false
      }
    };
    var player = currentPlayer(state);
    var zone = (state.zones || []).filter(function (item) {
      return item.id === zoneId;
    })[0];
    if (!player || !zone) {
      preview.reason = "missing_zone";
      return preview;
    }
    preview.flags.isHome = zone.type === "home";
    preview.refund = demolishRefund(zone);
    if (zone.type !== "home") {
      var def = resolveZoneYieldDef(zone);
      if (def && def.primary) {
        preview.lostProduction = {
          resource: def.primary,
          amount: zonePrimaryBase(zone),
          dice: !!def.dice,
          stable: !!def.stable
        };
      }
      if (zone.type === "traffic") {
        preview.flags.losesComfort = true;
      }
      if (zone.type === "energy" && zone.variant === "solar") {
        preview.flags.losesEnvironment = true;
      }
      preview.flags.residentialNeedsDc = false;
    }
    if (state.turnPhase !== "build") {
      preview.reason = "wrong_phase";
      return preview;
    }
    if (zone.ownerId !== player.id) {
      preview.reason = "not_owner";
      return preview;
    }
    if (zone.type === "home") {
      preview.reason = "is_home";
      return preview;
    }
    if (!playerNetworkConnectedWithout(state, player.id, zone.id)) {
      preview.flags.disconnects = true;
      preview.reason = "disconnects";
      return preview;
    }
    preview.allowed = true;
    return preview;
  }

  function demolishZone(state, zoneId) {
    var preview = describeDemolish(state, zoneId);
    if (!preview.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var gone = null;
    (state.zones || []).forEach(function (zone) {
      if (zone.id === zoneId) {
        gone = zone;
      }
    });
    var zones = state.zones.filter(function (zone) {
      return zone.id !== zoneId;
    });
    var resources = cloneResources(player.resources);
    resources.money = (resources.money || 0) + (preview.refund.money || 0);
    var nextPlayer = Object.assign({}, player, { resources: resources });
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    if (gone) {
      next = consumeDevBuildOnceForZone(
        next,
        gone.type,
        gone.variant,
        gone.trafficMode,
        gone.busStop
      );
      if (Nexus.Goals && Nexus.Goals.onDemolish) {
        var demoTileId =
          gone.tileId || (Nexus.tileIdFromZone ? Nexus.tileIdFromZone(gone) : null);
        if (demoTileId) {
          next = Nexus.Goals.onDemolish(next, player.id, demoTileId, zoneUpgradeLevel(gone));
        }
      }
    }
    next.log = addLog(
      next,
      player.name,
      "Feld abgerissen, +" + (preview.refund.money || 0) + " Geld."
    );
    return next;
  }

  function recommendExpandType(state) {
    if (isHotSeatShield(state) || state.turnPhase !== "build") {
      return null;
    }
    var player = currentPlayer(state);
    if (!player) {
      return null;
    }
    var expected = expectedByResource(state);
    var lowest = KEYS[0];
    KEYS.forEach(function (key) {
      if ((expected[key] || 0) < (expected[lowest] || 0)) {
        lowest = key;
      }
    });
    if (lowest === "energy") {
      return {
        type: "energy",
        variant: "wind",
        tileId: "energy-wind",
        reasonKey: "low_energy",
        resource: "energy"
      };
    }
    if (lowest === "money") {
      return {
        type: "commerce",
        variant: "small",
        tileId: "commerce-small",
        reasonKey: "low_money",
        resource: "money"
      };
    }
    return {
      type: "residential",
      variant: null,
      tileId: "data-residential",
      reasonKey: "low_bandwidth",
      resource: "bandwidth"
    };
  }

  function recommendExpandSlot(state) {
    if (!recommendExpandType(state)) {
      return null;
    }
    var found = null;
    Nexus.boardSlots().forEach(function (slot) {
      if (found) {
        return;
      }
      if (canAffordExpandSlot(state, slot.q, slot.r)) {
        found = { q: slot.q, r: slot.r };
      }
    });
    return found;
  }

  /* ---------- Spielaufbau ---------- */

  function createEmptyPlayer(id, name, colorIndex, roleId) {
    var resources = emptyResources();
    KEYS.forEach(function (key) {
      resources[key] = C.START_RESOURCES;
    });
    var devices = {};
    Nexus.DEVICES.forEach(function (device) {
      devices[device.id] = null;
    });
    return {
      id: id,
      name: name,
      colorIndex: colorIndex,
      roleId: roleId,
      resources: resources,
      scores: emptyScores(),
      devices: devices,
      risk: 0,
      riskShock: 0,
      neighborhoodPressureUsed: false,
      pendingNotices: [],
      hasDepot: false,
      greenInnovationCards: 0,
      privacyShieldEvents: 0,
      cumulativeProduction: 0,
      cumulativeMoneyProduction: 0,
      tradeVolume: 0,
      tradePartners: [],
      standardsChoice: "open",
      standardStreak: 0,
      standardsBonusVolume: 0,
      blockedTradesCaused: 0,
      blockedTradeKeysThisTurn: [],
      rolePoints: 0,
      karma: Nexus.KARMA && Nexus.KARMA.START != null ? Nexus.KARMA.START : 0,
      goalProgress: emptyGoalProgress(),
      stallSlots: emptyStallSlots(),
      stallAcceptsThisTurn: 0,
      activeContract: null,
      pendingContractOffer: null,
      transferRequestsThisTurn: {},
      transfersReceived: 0,
      blackmailUsed: false,
      blockTransferThisRound: false,
      doubleHarvestZoneId: null,
      innovationCardsTotal: 0,
      handCards: [],
      activeMandates: [],
      playedCards: [],
      drewInnovationThisTurn: false,
      freeZoneClaims: 1,
      productionHistory: {},
      hubDiscountPending: false,
      localHardwareDiscountPending: false,
      workshopDiscountPending: false,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false },
      pendingEvent: null,
      lastProduction: emptyResources(),
      flowOrigins: { energy: [], money: [], bandwidth: [] },
      survivedMajor: false,
      sideDeal: null
    };
  }

  function createSetupState() {
    return {
      screen: "setup",
      playerCount: 3,
      gameLengthId: "standard"
    };
  }

  function startGame(playerCount, gameLengthId, options) {
    options = options || {};
    playerCount = Math.max(C.MIN_PLAYERS, Math.min(C.MAX_PLAYERS, Number(playerCount) || 3));
    C.HEX_RADIUS = Nexus.hexRadiusForPlayerCount(playerCount);
    Nexus.HOME_POSITIONS = Nexus.homePositionsForCount(playerCount);
    var gameLength =
      Nexus.GAME_LENGTHS.filter(function (g) {
        return g.id === gameLengthId;
      })[0] || Nexus.GAME_LENGTHS[1];

    var roleIds = Nexus.assignRoles(playerCount);
    var players = [];
    var zones = [];
    var homes = Nexus.HOME_POSITIONS;
    var i;
    for (i = 0; i < playerCount; i++) {
      var id = "p" + (i + 1);
      var roleIndex = Nexus.ALL_ROLE_IDS ? Nexus.ALL_ROLE_IDS.indexOf(roleIds[i]) : i;
      if (roleIndex < 0) {
        roleIndex = i;
      }
      var starter = createEmptyPlayer(id, "Spieler " + (i + 1), roleIndex, roleIds[i]);
      var startAmount = C.START_RESOURCES;
      if (options.difficulty === "easy") {
        startAmount = 5;
      } else if (options.difficulty === "hard") {
        startAmount = 2;
      }
      if (options.devRun) {
        KEYS.forEach(function (key) {
          starter.resources[key] = 999;
        });
        starter.resources.unlimited = true;
      } else {
        KEYS.forEach(function (key) {
          starter.resources[key] = startAmount;
        });
      }
      players.push(starter);
      var homePos = homes[i];
      zones.push({
        id: "home-" + id,
        q: homePos.q,
        r: homePos.r,
        type: "home",
        ownerId: id,
        upgradeLevel: 0,
        harvested: false,
        lastYield: null
      });
    }

    var started = {
      screen: "game",
      round: 1,
      maxRounds: gameLength.rounds || C.MAX_ROUNDS,
      gameLengthLabel: gameLength.label,
      hexRadius: C.HEX_RADIUS,
      currentPlayerIndex: 0,
      turnPhase: "role_reveal",
      roleRevealIndex: 0,
      spinningOutcomes: null,
      eventDeck: buildEventDeck(),
      eventDiscard: [],
      innovationDeck: buildInnovationDeck(),
      innovationDiscard: [],
      players: players,
      zones: zones,
      tradeOffers: [],
      tradeSession: null,
      pendingTransfers: [],
      finalScores: null,
      winnerId: null,
      difficulty: options.difficulty || "normal",
      beginner: !!options.beginner,
      devRun: !!options.devRun,
      devBuildOnce: {},
      busLines: [],
      projectMarket: [],
      majorArmed: false,
      majorFired: false,
      log: [
        {
          round: 1,
          playerName: null,
          text: "Neues Spiel: " + playerCount + " Spieler, " + gameLength.rounds + " Wochen Probezeit. Jeder hat einen Startcoupon für ein kostenloses Feld."
        }
      ]
    };
    if (Nexus.Arc) {
      started = Nexus.Arc.stamp(started);
    }
    if (Nexus.Projects) {
      started = Nexus.Projects.ensureMarket(started);
    }
    if (Nexus.Risk) {
      started = Nexus.Risk.syncState(started, { decay: false });
    }
    return started;
  }

  function acknowledgeRoleReveal(state) {
    if (state.turnPhase !== "role_reveal") {
      return state;
    }
    var next = Object.assign({}, state, {
      turnPhase: "produce",
      roleRevealIndex: state.players.length,
      log: addLog(state, null, state.players[0].name + " beginnt.")
    });
    return maybeRollKarmaEvent(next);
  }

  function roleRevealPlayer(state) {
    if (state.turnPhase !== "role_reveal") {
      return null;
    }
    return state.players[state.roleRevealIndex] || null;
  }

  function isHotSeatShield() {
    /* Geheimhaltung ist aufgehoben. Hot-Seat bleibt die Reihenfolge, nicht das Versteck. */
    return false;
  }

  function remainingHarvestCount(state) {
    var player = currentPlayer(state);
    if (!player) {
      return 0;
    }
    return playerFactoryZones(state, player.id).filter(function (zone) {
      return !zone.harvested;
    }).length + (playerHomeNeedsHarvest(state, player.id) ? 1 : 0);
  }

  function skipEmptyProduce(state) {
    var player = currentPlayer(state);
    if (!player) {
      return Object.assign({}, state, {
        turnPhase: "build",
        spinningOutcomes: null
      });
    }
    var next = replacePlayer(
      Object.assign({}, state, { spinningOutcomes: null }),
      player.id,
      Object.assign({}, player, { lastProduction: emptyResources(), flowGain: emptyResources(), flowSpend: emptyResources() })
    );
    return advanceAfterAllHarvest(next);
  }

  function playerHomeZone(state, playerId) {
    var found = null;
    playerZones(state, playerId).forEach(function (zone) {
      if (zone.type === "home") {
        found = zone;
      }
    });
    return found;
  }

  function playerHomeNeedsHarvest(state, playerId) {
    var home = playerHomeZone(state, playerId);
    return home && !home.harvested;
  }

  function advanceAfterAllHarvest(state) {
    var player = currentPlayer(state);
    var gained = KEYS.filter(function (key) {
      return player.lastProduction[key] > 0;
    })
      .map(function (key) {
        return "+" + player.lastProduction[key] + " " + Nexus.RESOURCE_SHORT[key];
      })
      .join(", ");
    var next = Object.assign({}, state, {
      spinningOutcomes: null
    });
    next.log = addLog(
      next,
      player.name,
      gained ? "Produktion: " + gained + "." : "Produktion ohne Ertrag."
    );

    if (Nexus.Arc) {
      next = Nexus.Arc.stamp(next);
    }
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
      var cityEvent = Nexus.Risk.cityEvent(next, currentPlayer(next));
      if (cityEvent) {
        var riskPlayer = currentPlayer(next);
        next = replacePlayer(next, riskPlayer.id, Object.assign({}, riskPlayer, { pendingEvent: cityEvent }));
        next.turnPhase = "event";
        next.log = addLog(next, riskPlayer.name, "Ereignis: " + cityEvent.title + ". Risiko " + (riskPlayer.risk || 0) + ".");
        return next;
      }
    }
    /* Periodischer Deck-Draw entfernt: Ereignisse nur über Risiko-Schwelle (DESIGN). */
    return enterBuildPhase(next);
  }

  function beginHarvestAllSimultaneous(state) {
    var player = currentPlayer(state);
    if (state.turnPhase !== "produce" || !player || state.spinningOutcomes) {
      return state;
    }
    var pending = playerFactoryZones(state, player.id).filter(function (zone) {
      return !zone.harvested && !zone.disrupted;
    });
    var homePending = playerHomeNeedsHarvest(state, player.id);
    if (!pending.length && !homePending) {
      /* Gestörte Felder trotzdem freigeben, sonst bleiben sie ewig tot. */
      var clearedOnly = state.zones.map(function (zone) {
        if (zone.ownerId === player.id && zone.disrupted) {
          return Object.assign({}, zone, { disrupted: false, harvested: true, lastYield: null });
        }
        return zone;
      });
      return skipEmptyProduce(Object.assign({}, state, { zones: clearedOnly }));
    }

    var outcomes = [];
    var zones = state.zones.map(function (zone) {
      if (zone.ownerId === player.id && zone.disrupted && !zone.harvested) {
        return Object.assign({}, zone, {
          disrupted: false,
          harvested: true,
          lastYield: null,
          lastDieId: "sabotage"
        });
      }
      if (zone.type === "home" && zone.ownerId === player.id && !zone.harvested) {
        var homeYield = homeBaseProduction(zone);
        outcomes.push({
          zoneId: zone.id,
          dieId: "home",
          modifier: 0,
          yield: {
            primary: { resource: "energy", amount: homeYield.energy },
            homeBundle: homeYield
          },
          staggerIndex: 0,
          isHome: true
        });
        return Object.assign({}, zone, {
          lastYield: {
            primary: { resource: "energy", amount: homeYield.energy },
            homeBundle: homeYield
          },
          lastDieId: "home"
        });
      }
      var staggerIndex = -1;
      var i;
      for (i = 0; i < pending.length; i++) {
        if (pending[i].id === zone.id) {
          staggerIndex = homePending ? i + 1 : i;
          break;
        }
      }
      if (staggerIndex === -1) {
        return zone;
      }
      var die = rollProductionDie();
      var modifier = applyStorageBatteryModifier(state, player, die.modifier);
      var produced = produceForZone(zone, modifier, player, state);
      if (!produced) {
        return zone;
      }
      var dieId = zone.type === "energy" && resolveZoneYieldDef(zone).stable ? "stable" : die.id;
      outcomes.push({
        zoneId: zone.id,
        dieId: dieId,
        modifier: dieId === "stable" ? 0 : die.modifier,
        roll: die.roll || null,
        dieLabel: die.label || "",
        fieldBase: zonePrimaryBase(zone),
        yield: produced,
        staggerIndex: staggerIndex
      });
      return Object.assign({}, zone, { lastYield: produced, lastDieId: dieId });
    });

    if (!outcomes.length) {
      return skipEmptyProduce(state);
    }

    return Object.assign({}, state, {
      turnPhase: "spinning",
      spinningOutcomes: outcomes,
      zones: zones
    });
  }

  function completeHarvestAll(state) {
    if (state.turnPhase !== "spinning") {
      return state;
    }
    if (!state.spinningOutcomes || !state.spinningOutcomes.length) {
      return skipEmptyProduce(state);
    }
    var player = currentPlayer(state);
    var resources = cloneResources(player.resources);
    var scores = cloneScores(player.scores);
    var risk = player.risk || 0;
    var lastProduction = emptyResources();
    var flowSpend = emptyResources();
    var flowOrigins = { energy: [], money: [], bandwidth: [] };
    var cumulative = player.cumulativeProduction || 0;
    var cumulativeMoney = player.cumulativeMoneyProduction || 0;
    var harvestIds = {};
    var revealDelayByZone = {};
    var boomDraws = 0;
    var envFromHarvest = 0;

    state.spinningOutcomes.forEach(function (outcome) {
      harvestIds[outcome.zoneId] = true;
      revealDelayByZone[outcome.zoneId] = outcome.staggerIndex * C.HARVEST_STAGGER_MS;
      if (outcome.isHome) {
        var bundle = outcome.yield && outcome.yield.homeBundle;
        if (!bundle) {
          return;
        }
        var homeZone = null;
        state.zones.forEach(function (zone) {
          if (zone.id === outcome.zoneId) {
            homeZone = zone;
          }
        });
        KEYS.forEach(function (key) {
          var amount = bundle[key] || 0;
          resources[key] += amount;
          lastProduction[key] += amount;
          cumulative += amount;
          if (key === "money") {
            cumulativeMoney += amount;
          }
          if (amount && homeZone && flowOrigins[key]) {
            flowOrigins[key].push({ q: homeZone.q, r: homeZone.r });
          }
        });
        return;
      }
      if (!outcome.yield || !outcome.yield.primary) {
        return;
      }
      if (outcome.yield.moneySpent) {
        resources.money = Math.max(0, resources.money - outcome.yield.moneySpent);
        flowSpend.money += outcome.yield.moneySpent;
      }
      if (outcome.yield.energySpent) {
        resources.energy = Math.max(0, resources.energy - outcome.yield.energySpent);
        flowSpend.energy += outcome.yield.energySpent;
      }
      if (outcome.yield.bandwidthSpent) {
        resources.bandwidth = Math.max(0, resources.bandwidth - outcome.yield.bandwidthSpent);
        flowSpend.bandwidth += outcome.yield.bandwidthSpent;
      }
      var originZone = null;
      state.zones.forEach(function (zone) {
        if (zone.id === outcome.zoneId) {
          originZone = zone;
        }
      });
      resources[outcome.yield.primary.resource] =
        (resources[outcome.yield.primary.resource] || 0) + outcome.yield.primary.amount;
      lastProduction[outcome.yield.primary.resource] =
        (lastProduction[outcome.yield.primary.resource] || 0) + outcome.yield.primary.amount;
      cumulative += outcome.yield.primary.amount;
      if (outcome.yield.primary.resource === "money") {
        cumulativeMoney += outcome.yield.primary.amount;
      }
      if (originZone && outcome.yield.primary.amount && flowOrigins[outcome.yield.primary.resource]) {
        flowOrigins[outcome.yield.primary.resource].push({ q: originZone.q, r: originZone.r });
      }
      if (outcome.yield.secondary) {
        resources[outcome.yield.secondary.resource] =
          (resources[outcome.yield.secondary.resource] || 0) + outcome.yield.secondary.amount;
        lastProduction[outcome.yield.secondary.resource] =
          (lastProduction[outcome.yield.secondary.resource] || 0) + outcome.yield.secondary.amount;
        cumulative += outcome.yield.secondary.amount;
        if (outcome.yield.secondary.resource === "money") {
          cumulativeMoney += outcome.yield.secondary.amount;
        }
        if (originZone && outcome.yield.secondary.amount && flowOrigins[outcome.yield.secondary.resource]) {
          flowOrigins[outcome.yield.secondary.resource].push({ q: originZone.q, r: originZone.r });
        }
      }
      if (outcome.yield.scoreHint) {
        var hint = Object.assign({}, outcome.yield.scoreHint);
        if (hint.environment) {
          envFromHarvest += hint.environment;
          delete hint.environment;
        }
        scores = bumpScores(scores, hint);
      }
      if (outcome.yield.riskDelta && !Nexus.Risk) {
        risk += outcome.yield.riskDelta;
      }
      if (outcome.dieId === "boom") {
        boomDraws += 1;
      }
    });
    if (envFromHarvest > 1) {
      envFromHarvest = 1;
    }
    if (envFromHarvest < -1) {
      envFromHarvest = -1;
    }
    var harvestCause = null;
    if (envFromHarvest) {
      scores = bumpScores(scores, { environment: envFromHarvest });
      state.spinningOutcomes.forEach(function (outcome) {
        if (harvestCause || !outcome.yield || !outcome.yield.scoreHint || !outcome.yield.scoreHint.environment) {
          return;
        }
        state.zones.forEach(function (zone) {
          if (zone.id === outcome.zoneId) {
            harvestCause = { q: zone.q, r: zone.r, label: "Ernte" };
          }
        });
      });
    }

    var zones = state.zones.map(function (zone) {
      if (harvestIds[zone.id]) {
        return Object.assign({}, zone, {
          harvested: true,
          revealDelay: revealDelayByZone[zone.id] || 0
        });
      }
      return zone;
    });

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      scores: scores,
      risk: risk,
      lastProduction: lastProduction,
      flowGain: Object.assign(emptyResources(), lastProduction),
      flowSpend: flowSpend,
      flowOrigins: flowOrigins,
      cumulativeProduction: cumulative,
      cumulativeMoneyProduction: cumulativeMoney,
      productionHistory: markProductionHistory(player, state, lastProduction)
    });

    var next = replacePlayer(
      Object.assign({}, state, { zones: zones, spinningOutcomes: null }),
      player.id,
      nextPlayer
    );
    if (boomDraws > 0) {
      var boomGrant = grantInnovationCards(next, nextPlayer, boomDraws, "green");
      next = replacePlayer(boomGrant.state, player.id, boomGrant.player);
      if (boomGrant.cards[0]) {
        next.log = addLog(
          next,
          player.name,
          "Boom: Karte „" + boomGrant.cards[0].name + "“."
        );
      }
    }
    if (harvestCause) {
      next.lastScoreCause = harvestCause;
    }
    return advanceAfterAllHarvest(next);
  }

  function harvestAnimationMs(state) {
    var outcomes = state.spinningOutcomes || [];
    var count = outcomes.length;
    if (!count) {
      return 0;
    }
    var onlyHome = outcomes.every(function (outcome) {
      return outcome.isHome;
    });
    if (onlyHome) {
      return C.HOME_HARVEST_MS;
    }
    return C.TILE_SPIN_MS + Math.max(0, count - 1) * C.HARVEST_STAGGER_MS;
  }

  function victoryPointTarget() {
    return Nexus.VICTORY_POINT_TARGET || Nexus.ROLE_POINT_TARGET || 10;
  }

  function ownVictoryPoints(player) {
    var pts = Math.max(0, player && player.rolePoints ? player.rolePoints : 0);
    /* Karma −5: Anzeige-Malus −1 (effektiv need 11). */
    if (player && (player.karma || 0) <= -5) {
      pts = Math.max(0, pts - 1);
    }
    return pts;
  }

  function compareVictory(a, b) {
    var da = ownVictoryPoints(b) - ownVictoryPoints(a);
    if (da) {
      return da;
    }
    var dk = (b.karma || 0) - (a.karma || 0);
    if (dk) {
      return dk;
    }
    return String(a.id).localeCompare(String(b.id));
  }

  function finalizeGame(state, winnerId, winReason) {
    var target = victoryPointTarget();
    var finalScores = state.players.map(function (p) {
      var progress = Nexus.computeRoleProgress(state, p);
      var pts = ownVictoryPoints(p);
      return {
        playerId: p.id,
        playerName: p.name,
        roleId: p.roleId,
        rolePoints: pts,
        karma: p.karma || 0,
        totalPercent: progress.totalPercent,
        subGoals: progress.subGoals
      };
    });
    var winner = state.players.filter(function (p) {
      return p.id === winnerId;
    })[0];
    var winnerName = winner ? winner.name : "Unbekannt";
    var reasonText =
      winReason === "instant"
        ? winnerName + " hat " + target + " Siegpunkte der eigenen Metrik erreicht!"
        : "Auswertung nach " + state.maxRounds + " Wochen Probezeit" +
          (winner ? " — " + winnerName + " gewinnt (Punkte, bei Gleichstand Karma)." : ".");
    return Object.assign({}, state, {
      turnPhase: "gameover",
      winnerId: winnerId,
      winReason: winReason,
      finalScores: finalScores,
      evaluation: Nexus.Arc ? Nexus.Arc.evaluate(state) : null,
      log: addLog(state, null, reasonText)
    });
  }

  /* Sieg nur über own-Metrik-SP ≥ Ziel; Risiko ist kein Siegpfad. */
  function checkInstantWinAtRoundEnd(state) {
    var target = victoryPointTarget();
    var contenders = state.players.filter(function (p) {
      return ownVictoryPoints(p) >= target;
    });
    if (!contenders.length) {
      return null;
    }
    contenders.sort(compareVictory);
    return finalizeGame(state, contenders[0].id, "instant");
  }

  function resolveFallbackWinner(state) {
    var ranked = state.players.slice().sort(compareVictory);
    return finalizeGame(state, ranked[0].id, "fallback");
  }

  function applyEventChoice(state, choiceId, extra) {
    extra = extra || {};
    var player = currentPlayer(state);
    if (state.turnPhase !== "event" || !player || !player.pendingEvent) {
      return state;
    }
    var event = player.pendingEvent;
    var choice = null;
    event.choices.forEach(function (item) {
      if (item.id === choiceId) {
        choice = item;
      }
    });
    if (!choice) {
      return state;
    }
    if (choice.needsResourcePick && !extra.resource) {
      return state;
    }
    if (choice.needsPlayerPick && !extra.playerId) {
      return state;
    }

    var effects = choice.effects || {};
    var spend = effects.spend || {};
    if (!canAfford(player.resources, spend)) {
      return state;
    }
    if (effects.spendOwnRolePoints) {
      if ((player.rolePoints || 0) < effects.spendOwnRolePoints) {
        return state;
      }
    }

    var resources = subtractCost(player.resources, spend);
    var flowSpend = Object.assign(emptyResources(), player.flowSpend || {});
    var flowGain = Object.assign(emptyResources(), player.flowGain || player.lastProduction || {});
    Object.keys(spend).forEach(function (key) {
      if (spend[key]) {
        flowSpend[key] = (flowSpend[key] || 0) + spend[key];
      }
    });
    if (choice.needsResourcePick && extra.resource) {
      flowGain[extra.resource] = (flowGain[extra.resource] || 0) + (choice.pickAmount || 0);
    }
    if (choice.needsResourcePick) {
      resources[extra.resource] += choice.pickAmount;
    }
    var mappedGain = normalizeCost(effects);
    KEYS.forEach(function (key) {
      if (mappedGain[key]) {
        resources[key] += mappedGain[key];
        flowGain[key] = (flowGain[key] || 0) + mappedGain[key];
      }
    });

    var shock = Math.max(0, (player.riskShock || 0) + (effects.risk || 0));
    var risk = Math.max(0, player.risk + (effects.risk || 0));

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      scores: bumpScores(player.scores, effects),
      risk: risk,
      riskShock: shock,
      privacyShieldEvents: player.privacyShieldEvents + (effects.privacyShield ? 1 : 0),
      localHardwareDiscountPending:
        effects.localHardwareDiscount || effects.localMoneyDiscount
          ? true
          : player.localHardwareDiscountPending,
      roundModifiers: {
        cloudDisabled: !!(player.roundModifiers.cloudDisabled || effects.cloudDisabled),
        cloudHalfEffect: !!(player.roundModifiers.cloudHalfEffect || effects.cloudHalfEffect)
      },
      pendingEvent: null,
      flowGain: flowGain,
      flowSpend: flowSpend,
      survivedMajor: !!(player.survivedMajor || event.major)
    });
    if (effects.spendOwnRolePoints) {
      nextPlayer.rolePoints = Math.max(0, (nextPlayer.rolePoints || 0) - effects.spendOwnRolePoints);
      nextPlayer.lastRolePointDelta = -effects.spendOwnRolePoints;
      nextPlayer.lastRolePointReason = event.title || "Presse-Deal";
    }

    var next = replacePlayer(state, player.id, nextPlayer);
    var greenDraws = effects.greenInnovation || 0;
    var anyDraws = (effects.innovationCard || 0) + (effects.innovation || 0);
    if (greenDraws > 0) {
      var greenGrant = grantInnovationCards(next, nextPlayer, greenDraws, "green");
      next = replacePlayer(greenGrant.state, player.id, greenGrant.player);
      nextPlayer = greenGrant.player;
    }
    if (anyDraws > 0) {
      var anyGrant = grantInnovationCards(next, nextPlayer, anyDraws, null);
      next = replacePlayer(anyGrant.state, player.id, anyGrant.player);
      nextPlayer = anyGrant.player;
    }
    if (effects.acceptSideDeal) {
      next = acceptSideDeal(next, player.id, effects.acceptSideDeal);
    }
    if (effects.rolePoints && effects.pointKey && effects.rolePoints > 0) {
      /* Random-Events: Progress ja, aber nicht der letzte Siegpunkt. Deals sind separat uncapped. */
      next = awardTypedRolePoints(
        next,
        player.id,
        effects.pointKey,
        effects.rolePoints,
        event.title || "Ereignis",
        { contest: effects.contest !== false }
      );
    }
    if (effects.contestStripTarget && extra.playerId && extra.playerId !== player.id) {
      next = stripRolePoints(
        next,
        extra.playerId,
        effects.contestStripTarget,
        event.title || "Skandal",
        { oncePerDay: true }
      );
      var targetName = "";
      (next.players || []).forEach(function (item) {
        if (item.id === extra.playerId) {
          targetName = item.name;
        }
      });
      next.log = addLog(next, player.name, "Konter gegen " + (targetName || "Mitspieler") + ".");
    }
    if (effects.sabotageForeign) {
      var hit = disruptForeignZone(next, player.id);
      next = hit.state;
      if (hit.zone) {
        next.log = addLog(
          next,
          player.name,
          "Sabotage: Feld " + hit.zone.q + "," + hit.zone.r + " liefert einen Tag nichts."
        );
      } else {
        next.log = addLog(next, player.name, "Sabotage: kein fremdes Feld gefunden.");
      }
    }
    if (effects.protestSweep) {
      var ranked = rankPlayersByRolePoints(next);
      ranked.forEach(function (item) {
        next = stripRolePoints(next, item.id, 1, "Bürgerprotest");
      });
      if (ranked[0]) {
        next = stripRolePoints(next, ranked[0].id, 1, "Protest · Führende");
        next.log = addLog(next, ranked[0].name, "Als Führende*r zusätzlich unter Druck.");
      }
      if (ranked.length > 1) {
        var weak = ranked[ranked.length - 1];
        next = replacePlayer(
          next,
          weak.id,
          Object.assign({}, next.players.filter(function (p) { return p.id === weak.id; })[0], {
            resources: (function () {
              var res = cloneResources(
                next.players.filter(function (p) {
                  return p.id === weak.id;
                })[0].resources
              );
              res.energy = Math.max(0, (res.energy || 0) - 1);
              return res;
            })()
          })
        );
        next.log = addLog(next, weak.name, "Als Schlusslicht: −1 Energie durch den Protest.");
      }
    }
    if (effects.karma) {
      next = applyKarma(next, player.id, effects.karma, event.title || "Ereignis");
    }
    if (effects.blackmail) {
      next = applyKarmaBlackmail(next, player.id);
    }

    var logText = event.title + " → " + choice.label + ".";
    if (choice.needsResourcePick) {
      logText =
        event.title +
        " → " +
        choice.label +
        " (+" +
        choice.pickAmount +
        " " +
        Nexus.RESOURCE_SHORT[extra.resource] +
        ").";
    }
    next.log = addLog(next, player.name, logText);
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    /* Karma-Zugbeginn → Ernte; Risiko/sonstige Events → Bau. */
    if (event.resumePhase === "produce" || event.source === "karma") {
      next.turnPhase = "produce";
      return next;
    }
    next.turnPhase = "build";
    return enterBuildPhase(next);
  }

  function canChooseEventOption(state, choiceId) {
    var player = currentPlayer(state);
    if (!player || !player.pendingEvent) {
      return false;
    }
    var choice = null;
    player.pendingEvent.choices.forEach(function (item) {
      if (item.id === choiceId) {
        choice = item;
      }
    });
    if (!choice) {
      return false;
    }
    var effects = choice.effects || {};
    if (!canAfford(player.resources, effects.spend || {})) {
      return false;
    }
    if (effects.spendOwnRolePoints && (player.rolePoints || 0) < effects.spendOwnRolePoints) {
      return false;
    }
    if (effects.acceptSideDeal && player.sideDeal) {
      return false;
    }
    if (choice.needsPlayerPick && (state.players || []).length < 2) {
      return false;
    }
    return true;
  }

  function buildDevice(state, deviceId, mode) {
    var offer = getBuildOffer(state, deviceId, mode);
    if (!offer.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var device = Nexus.DEVICES_BY_ID[deviceId];
    var isNewBuild = !player.devices[deviceId];
    var devices = Object.assign({}, player.devices);
    devices[deviceId] = mode;

    var hubDiscountPending = player.hubDiscountPending;
    if (offer.usedHubDiscount) {
      hubDiscountPending = false;
    }
    if (isNewBuild && (deviceId === "edge" || device.nextDeviceDiscount)) {
      hubDiscountPending = true;
    }

    var localHardwareDiscountPending = player.localHardwareDiscountPending;
    if (offer.usedLocalHardwareDiscount) {
      localHardwareDiscountPending = false;
    }
    var workshopDiscountPending = player.workshopDiscountPending;
    if (offer.usedWorkshopDiscount) {
      workshopDiscountPending = false;
    }

    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, offer.cost),
      devices: devices,
      hubDiscountPending: hubDiscountPending,
      localHardwareDiscountPending: localHardwareDiscountPending,
      workshopDiscountPending: workshopDiscountPending
    });

    var next = replacePlayer(state, player.id, nextPlayer);
    if (mode === "local" && (device.localKarmaOnBuild || 0) !== 0 && typeof applyKarma === "function") {
      next = applyKarma(next, player.id, device.localKarmaOnBuild, device.shortName + " lokal");
    }
    var metrics = device.metrics || [];
    var role = Nexus.ROLES_BY_ID && Nexus.ROLES_BY_ID[player.roleId];
    var ownKey = role && role.pointKey;
    if (ownKey && metrics.indexOf(ownKey) >= 0 && isNewBuild) {
      next = awardRolePoints
        ? awardRolePoints(next, player.id, 0, device.shortName)
        : next;
      /* Metrik-Match zählt für Geräte-Ziele; SP nur über Goals-Engine. */
    }
    var logText = device.shortName + (offer.isUpgrade ? " → lokal" : " " + mode) + ".";
    var shouldDraw =
      (device.drawCardOnBuild && isNewBuild) ||
      (mode === "local" && device.localDrawCardOnBuild && isNewBuild);
    if (shouldDraw) {
      var granted = grantInnovationCards(next, currentPlayer(next) || nextPlayer, 1, null);
      next = replacePlayer(granted.state, player.id, granted.player);
      if (granted.cards[0]) {
        logText += " Akte: " + granted.cards[0].name + ".";
      }
    }
    next.log = addLog(next, player.name, logText);
    var home = playerHomeZone(state, player.id);
    next.lastScoreCause = home
      ? { q: home.q, r: home.r, label: device.shortName }
      : { kind: "card", label: device.shortName };
    return next;
  }

  function applyOngoingEffects(player) {
    var modifiers = player.roundModifiers || {};
    var upkeep = cloudUpkeepCost(player);
    var cloudOnline = upkeep === 0 || canAfford(player.resources, { bandwidth: upkeep });
    var baseSave = 0;
    var bandwidthGain = 0;
    var moneyGain = 0;
    var karmaPressure = 0;
    var hemsLocal = player.devices.hems === "local";
    var scoreHint = emptyScores();

    Nexus.DEVICES.forEach(function (device) {
      var mode = player.devices[device.id];
      if (!mode) {
        return;
      }
      if (mode === "cloud") {
        karmaPressure += device.cloudKarmaRisk || 0;
      }
      if (device.id === "hems" && device.localDoublesEnergySave) {
        return;
      }
      var factor = effectFactor(mode, modifiers);
      if (mode === "cloud" && !cloudOnline) {
        factor = 0;
      }
      var save =
        mode === "local" && device.localEnergySave != null
          ? device.localEnergySave
          : device.energySave || 0;
      baseSave += save * factor;
      var bw =
        mode === "local" && device.localBandwidthGain != null
          ? device.localBandwidthGain
          : device.bandwidthGain != null
            ? device.bandwidthGain
            : device.dataGain || 0;
      bandwidthGain += bw * factor;
      var cash =
        mode === "local" && device.localMoneyGain != null
          ? device.localMoneyGain
          : device.moneyGain || 0;
      moneyGain += cash * factor;
    });

    var hemsFactor = hemsLocal ? 1 : player.devices.hems === "cloud" && cloudOnline ? 0.5 : 0;
    var energySave = baseSave * (1 + (hemsLocal ? 1 : hemsFactor));
    var energyGranted = Math.floor(energySave);
    var bandwidthGranted = Math.floor(bandwidthGain);
    var moneyGranted = Math.floor(moneyGain);

    var resources = cloneResources(player.resources);
    if (cloudOnline && upkeep > 0) {
      resources.bandwidth -= upkeep;
    }
    resources.energy += energyGranted;
    resources.bandwidth += bandwidthGranted;
    resources.money += moneyGranted;

    var parts = [];
    if (upkeep > 0 && cloudOnline) {
      parts.push("Cloud −" + upkeep + " Daten");
    } else if (upkeep > 0) {
      parts.push("Cloud offline (Daten fehlen)");
    }
    if (energySave > 0) {
      parts.push("Spar " + energySave + " Energie");
    }
    if (bandwidthGranted > 0) {
      parts.push("+" + bandwidthGranted + " Daten");
    }
    if (moneyGranted > 0) {
      parts.push("+" + moneyGranted + " Geld");
    }
    if (karmaPressure > 0) {
      parts.push("Cloud-Druck " + karmaPressure);
    }
    if (parts.length === 0) {
      parts.push("keine Geräteeffekte");
    }

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      scores: bumpScores(player.scores, scoreHint),
      pendingCloudKarma: (player.pendingCloudKarma || 0) + karmaPressure,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false }
    });

    return { player: nextPlayer, logText: "Zugende: " + parts.join(", ") + ".", karmaPressure: karmaPressure };
  }

  function endTurn(state) {
    if (state.turnPhase !== "build") {
      return state;
    }
    var player = currentPlayer(state);
    var result = applyOngoingEffects(player);
    var endedPlayer = Object.assign({}, result.player, {
      drewInnovationThisTurn: false,
      blockedTradeKeysThisTurn: [],
      neighborhoodPressureUsed: false,
      stallAcceptsThisTurn: 0,
      transferRequestsThisTurn: {}
    });
    var next = replacePlayer(state, player.id, endedPlayer);
    next.log = addLog(next, player.name, result.logText);
    var pressure = result.karmaPressure || endedPlayer.pendingCloudKarma || 0;
    if (pressure > 0 && typeof applyKarma === "function") {
      var roll = Math.random();
      var chance = Math.min(0.85, 0.15 * pressure);
      if (roll < chance) {
        next = applyKarma(next, player.id, -1, "Cloud-Druck");
        next = replacePlayer(
          next,
          player.id,
          Object.assign({}, currentPlayer(next), { pendingCloudKarma: 0 })
        );
      } else {
        next = replacePlayer(
          next,
          player.id,
          Object.assign({}, currentPlayer(next), { pendingCloudKarma: 0 })
        );
      }
    }
    if (Nexus.Mobility) {
      next = Nexus.Mobility.applyTick(next);
    }

    var nextIndex = state.currentPlayerIndex + 1;
    if (nextIndex >= state.players.length) {
      var instantWin = checkInstantWinAtRoundEnd(next);
      if (instantWin) {
        return instantWin;
      }
      var newRound = state.round + 1;
      if (newRound > state.maxRounds) {
        return resolveFallbackWinner(next);
      }
      next.round = newRound;
      next.currentPlayerIndex = 0;
      next.turnPhase = "handoff";
      next.zones = next.zones.map(function (zone) {
        return Object.assign({}, zone, { harvested: false, lastYield: null, lastDieId: null });
      });
      next.players = next.players.map(function (p) {
        return Object.assign({}, updateStandardStreak(p, state.round + 1), {
          blockTransferThisRound: false
        });
      });
      next = tickActiveContracts(next);
      next.log = addLog(next, null, "Woche " + newRound + " beginnt. Gerät an " + next.players[0].name + " weitergeben.");
    } else {
      next.currentPlayerIndex = nextIndex;
      next.turnPhase = "handoff";
      next.log = addLog(next, null, "Gerät an " + next.players[nextIndex].name + " weitergeben.");
    }
    return next;
  }

  function acknowledgeHandoff(state) {
    if (state.turnPhase !== "handoff") {
      return state;
    }
    var player = currentPlayer(state);
    var session = state.tradeSession;
    if (session && session.phase === "to_partner") {
      return Object.assign({}, state, {
        turnPhase: "trade_respond",
        log: addLog(state, player ? player.name : null, "prüft ein Handelsangebot.")
      });
    }
    if (session && session.phase === "to_owner") {
      return Object.assign({}, state, {
        turnPhase: "build",
        tradeSession: null,
        log: addLog(state, player ? player.name : null, "setzt den Zug fort.")
      });
    }
    var resumed = Object.assign({}, state, {
      turnPhase: "produce",
      log: addLog(state, player ? player.name : null, "übernimmt.")
    });
    if (player) {
      if ((player.pendingNotices || []).length) {
        resumed = replacePlayer(
          resumed,
          player.id,
          Object.assign({}, player, { pendingNotices: [] })
        );
      }
      resumed = checkSideDealDeadline(resumed, player.id);
      /* Zugbeginn: Karma-Event vor Ernte. */
      resumed = maybeRollKarmaEvent(resumed);
    }
    return resumed;
  }

  function updateStandardStreak(player, round) {
    if (!player.standardsChoice) {
      return Object.assign({}, player, { standardStreak: 0 });
    }
    return Object.assign({}, player, { standardStreak: (player.standardStreak || 0) + 1 });
  }

  function markProductionHistory(player, state, lastProduction) {
    var history = Object.assign({}, player.productionHistory || {});
    KEYS.forEach(function (key) {
      if ((lastProduction[key] || 0) > 0) {
        var rounds = (history[key] || []).slice();
        rounds.push(state.round);
        history[key] = rounds.slice(-4);
      }
    });
    return history;
  }

  function hasRecentProduction(player, resource, currentRound) {
    var rounds = (player.productionHistory || {})[resource] || [];
    return rounds.some(function (round) {
      return currentRound - round <= C.TRADE_RECENT_ROUNDS;
    });
  }

  function canTradeWith(fromPlayer, toPlayer) {
    if (!fromPlayer || !toPlayer) {
      return { allowed: false, reason: "Partner fehlt." };
    }
    return { allowed: true, reason: "" };
  }

  function recordBlockedTradeAttempt(state, partnerId) {
    var player = currentPlayer(state);
    var partner = state.players.filter(function (p) {
      return p.id === partnerId;
    })[0];
    if (!player || !partner || player.id === partner.id) {
      return state;
    }
    if (!player.standardsChoice || !partner.standardsChoice) {
      return state;
    }
    if (player.standardsChoice === partner.standardsChoice) {
      return state;
    }
    if (partner.standardsChoice !== "proprietary") {
      return state;
    }
    var logged = player.blockedTradeKeysThisTurn || [];
    if (logged.indexOf(partnerId) !== -1) {
      return state;
    }
    var nextPlayer = Object.assign({}, player, {
      blockedTradeKeysThisTurn: logged.concat([partnerId])
    });
    var nextPartner = Object.assign({}, partner, {
      blockedTradesCaused: (partner.blockedTradesCaused || 0) + 1
    });
    var next = replacePlayer(state, player.id, nextPlayer);
    next = replacePlayer(next, partner.id, nextPartner);
    next.log = addLog(
      next,
      player.name,
      "Handel mit " + partner.name + " am proprietären System gescheitert."
    );
    return next;
  }

  function getPublicPlayerView(state, playerId) {
    var player = state.players.filter(function (p) {
      return p.id === playerId;
    })[0];
    if (!player) {
      return null;
    }
    var role = Nexus.ROLES_BY_ID[player.roleId];
    var devices = [];
    var gadgets = boardGadgetsFor(player);
    Nexus.DEVICES.forEach(function (device) {
      var mode = gadgets[device.id];
      if (mode) {
        devices.push({
          id: device.id,
          name: device.name,
          shortName: device.shortName || device.name,
          mode: mode
        });
      }
    });
    return {
      id: player.id,
      name: player.name,
      colorIndex: player.colorIndex,
      alignment: role ? role.alignment : "—",
      rolePoints: player.rolePoints || 0,
      zoneCount: playerZones(state, player.id).length,
      factoryCount: playerFactoryZones(state, player.id).length,
      devices: devices
    };
  }

  function tradeGiveAmount(baseAmount, isPremium) {
    if (!isPremium) {
      return baseAmount;
    }
    return baseAmount * 2;
  }

  function getTradeOffer(state, partnerId, giveKey, giveAmount, wantKey, wantAmount) {
    var offer = {
      allowed: false,
      reason: "",
      giveCost: giveAmount,
      wantGain: wantAmount,
      flags: {
        openDiscount: false,
        proprietaryPair: false,
        mixedBlocked: false,
        premiumSurcharge: false,
        sameStandard: false
      }
    };
    var player = currentPlayer(state);
    var partner = state.players.filter(function (p) {
      return p.id === partnerId;
    })[0];
    if (state.turnPhase !== "build") {
      offer.reason = "wrong_phase";
      return offer;
    }
    if (!partner || !player || partner.id === player.id) {
      offer.reason = "bad_partner";
      return offer;
    }
    var compatibility = canTradeWith(player, partner);
    offer.flags.sameStandard = !!compatibility.allowed;
    offer.flags.mixedBlocked = !compatibility.allowed;
    offer.flags.proprietaryPair =
      player.standardsChoice === "proprietary" && partner.standardsChoice === "proprietary";
    if (!compatibility.allowed) {
      offer.reason = compatibility.reason === "Unterschiedliche Standards blockieren den Handel."
        ? "mixed_standard"
        : "no_standard";
      return offer;
    }
    if (giveAmount <= 0 || wantAmount <= 0) {
      offer.reason = "bad_amount";
      return offer;
    }
    offer.flags.premiumSurcharge = false;
    offer.flags.openDiscount = false;
    offer.giveCost = giveAmount;
    offer.wantGain = wantAmount;
    var spend = {};
    spend[giveKey] = offer.giveCost;
    if (!canAfford(player.resources, spend)) {
      offer.reason = "cannot_afford";
      return offer;
    }
    if ((partner.resources[wantKey] || 0) < wantAmount) {
      offer.reason = "partner_short";
      return offer;
    }
    offer.allowed = true;
    offer.giveKey = giveKey;
    offer.wantKey = wantKey;
    offer.giveAmount = giveAmount;
    offer.wantAmount = wantAmount;
    offer.partnerName = partner.name;
    return offer;
  }

  function nextTradeOfferId(state) {
    var max = 0;
    (state.tradeOffers || []).forEach(function (item) {
      var num = parseInt(String(item.id || "").replace("trade-", ""), 10) || 0;
      if (num > max) {
        max = num;
      }
    });
    return "trade-" + (max + 1);
  }

  function findTradeOffer(state, offerId) {
    var found = null;
    (state.tradeOffers || []).forEach(function (item) {
      if (item.id === offerId) {
        found = item;
      }
    });
    return found;
  }

  function pendingTradeOffersFor(state, playerId) {
    return (state.tradeOffers || []).filter(function (item) {
      return item.status === "pending" && item.toId === playerId;
    });
  }

  function proposeTrade(state, partnerId, giveKey, giveAmount, wantKey, wantAmount) {
    var preview = getTradeOffer(state, partnerId, giveKey, giveAmount, wantKey, wantAmount);
    if (!preview.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var entry = {
      id: nextTradeOfferId(state),
      fromId: player.id,
      toId: partnerId,
      giveKey: giveKey,
      giveAmount: giveAmount,
      wantKey: wantKey,
      wantAmount: wantAmount,
      giveCost: preview.giveCost,
      wantGain: preview.wantGain,
      flags: preview.flags,
      status: "pending"
    };
    var next = Object.assign({}, state, {
      tradeOffers: (state.tradeOffers || []).concat([entry])
    });
    next.log = addLog(
      next,
      player.name,
      "Handelsangebot an " +
        preview.partnerName +
        ": " +
        preview.giveCost +
        " " +
        Nexus.RESOURCE_SHORT[giveKey] +
        " gegen " +
        wantAmount +
        " " +
        Nexus.RESOURCE_SHORT[wantKey] +
        "."
    );
    return next;
  }

  function beginTradeInterrupt(state, offerId) {
    var player = currentPlayer(state);
    var offer = findTradeOffer(state, offerId);
    if (!player || !offer || offer.status !== "pending" || offer.fromId !== player.id) {
      return state;
    }
    if (state.turnPhase !== "build") {
      return state;
    }
    var toIndex = -1;
    var fromIndex = state.currentPlayerIndex;
    state.players.forEach(function (item, index) {
      if (item.id === offer.toId) {
        toIndex = index;
      }
    });
    if (toIndex < 0) {
      return state;
    }
    var next = Object.assign({}, state, {
      currentPlayerIndex: toIndex,
      turnPhase: "handoff",
      tradeSession: {
        offerId: offer.id,
        fromIndex: fromIndex,
        toIndex: toIndex,
        phase: "to_partner"
      }
    });
    next.log = addLog(next, player.name, "übergibt das Gerät für das Handelsangebot.");
    return next;
  }

  function walletsAllowStoredOffer(state, offer) {
    var from = state.players.filter(function (p) {
      return p.id === offer.fromId;
    })[0];
    var to = state.players.filter(function (p) {
      return p.id === offer.toId;
    })[0];
    if (!from || !to) {
      return false;
    }
    var spendFrom = {};
    spendFrom[offer.giveKey] = offer.giveCost;
    var spendTo = {};
    spendTo[offer.wantKey] = offer.wantAmount;
    return canAfford(from.resources, spendFrom) && canAfford(to.resources, spendTo);
  }

  function settleStoredTrade(state, offer) {
    var from = state.players.filter(function (p) {
      return p.id === offer.fromId;
    })[0];
    var to = state.players.filter(function (p) {
      return p.id === offer.toId;
    })[0];
    var fromResources = subtractCost(from.resources, (function () {
      var spend = {};
      spend[offer.giveKey] = offer.giveCost;
      return spend;
    })());
    fromResources[offer.wantKey] = (fromResources[offer.wantKey] || 0) + offer.wantGain;
    var toResources = subtractCost(to.resources, (function () {
      var spend = {};
      spend[offer.wantKey] = offer.wantAmount;
      return spend;
    })());
    toResources[offer.giveKey] = (toResources[offer.giveKey] || 0) + offer.giveCost;

    var fromPartners = (from.tradePartners || []).slice();
    if (fromPartners.indexOf(to.id) === -1) {
      fromPartners.push(to.id);
    }
    var toPartners = (to.tradePartners || []).slice();
    if (toPartners.indexOf(from.id) === -1) {
      toPartners.push(from.id);
    }
    var bonusVolume = 0;
    if (from.standardsChoice === "open" && to.standardsChoice === "open") {
      bonusVolume = offer.giveCost + offer.wantAmount;
    }
    var nextFrom = Object.assign({}, from, {
      resources: fromResources,
      tradeVolume: (from.tradeVolume || 0) + offer.giveCost + offer.wantGain,
      tradePartners: fromPartners,
      standardsBonusVolume: (from.standardsBonusVolume || 0) + bonusVolume
    });
    var nextTo = Object.assign({}, to, {
      resources: toResources,
      tradeVolume: (to.tradeVolume || 0) + offer.giveCost + offer.wantAmount,
      tradePartners: toPartners,
      standardsBonusVolume: (to.standardsBonusVolume || 0) + bonusVolume
    });
    var next = replacePlayer(state, from.id, nextFrom);
    next = replacePlayer(next, to.id, nextTo);
    /* Handel selbst gibt keine Siegpunkte mehr — nur Hinterzimmer-Deals. */
    next = tickSideDeal(next, from.id, "trade", 1);
    next = tickSideDeal(next, to.id, "trade", 1);
    next.log = addLog(
      next,
      to.name,
      "nimmt Handel an: " +
        offer.giveCost +
        " " +
        Nexus.RESOURCE_SHORT[offer.giveKey] +
        " ↔ " +
        offer.wantAmount +
        " " +
        Nexus.RESOURCE_SHORT[offer.wantKey] +
        "."
    );
    return next;
  }

  function closeTradeResponse(state, offerId, status) {
    var offers = (state.tradeOffers || []).map(function (item) {
      if (item.id !== offerId) {
        return item;
      }
      return Object.assign({}, item, { status: status });
    });
    var session = state.tradeSession;
    if (session && session.offerId === offerId) {
      return Object.assign({}, state, {
        tradeOffers: offers,
        currentPlayerIndex: session.fromIndex,
        turnPhase: "handoff",
        tradeSession: Object.assign({}, session, { phase: "to_owner" })
      });
    }
    return Object.assign({}, state, { tradeOffers: offers });
  }

  function respondTrade(state, offerId, accept) {
    var player = currentPlayer(state);
    var offer = findTradeOffer(state, offerId);
    if (!player || !offer || offer.status !== "pending") {
      return state;
    }
    if (offer.toId !== player.id) {
      return state;
    }
    var inInterrupt = state.turnPhase === "trade_respond";
    var inOwnBuild = state.turnPhase === "build";
    if (!inInterrupt && !inOwnBuild) {
      return state;
    }
    if (!accept) {
      var declined = closeTradeResponse(state, offerId, "declined");
      declined.log = addLog(declined, player.name, "lehnt das Handelsangebot ab.");
      return declined;
    }
    if (!walletsAllowStoredOffer(state, offer)) {
      var failed = closeTradeResponse(state, offerId, "expired");
      failed.log = addLog(failed, player.name, "Handel nicht mehr erfüllbar.");
      return failed;
    }
    var settled = settleStoredTrade(state, offer);
    settled.lastScoreCause = { kind: "trade", label: "Handel" };
    return closeTradeResponse(settled, offerId, "accepted");
  }

  function executeTrade(state, partnerId, giveKey, giveAmount, wantKey, wantAmount) {
    return proposeTrade(state, partnerId, giveKey, giveAmount, wantKey, wantAmount);
  }

  function setStandardsChoice(state) {
    return state;
  }

  function countResourceMonopolies(state, playerId) {
    var counts = {};
    KEYS.forEach(function (key) {
      counts[key] = { total: 0, owned: 0 };
    });
    state.zones.forEach(function (zone) {
      if (zone.type === "home") {
        return;
      }
      var typeDef = resolveZoneYieldDef(zone) || ZONE_TYPES[zone.type];
      if (!typeDef || !typeDef.primary || !counts[typeDef.primary]) {
        return;
      }
      counts[typeDef.primary].total += 1;
      if (zone.ownerId === playerId) {
        counts[typeDef.primary].owned += 1;
      }
      if (typeDef.secondary && counts[typeDef.secondary]) {
        counts[typeDef.secondary].total += 1;
        if (zone.ownerId === playerId) {
          counts[typeDef.secondary].owned += 1;
        }
      }
    });
    var monopolies = 0;
    KEYS.forEach(function (key) {
      if (counts[key].total > 0 && counts[key].owned === counts[key].total) {
        monopolies += 1;
      }
    });
    return monopolies;
  }

  function applyStorageBatteryModifier(state, player, modifier) {
    if (modifier >= 0 || !player.devices.storage_battery) {
      return modifier;
    }
    return 0;
  }

  function getInnovationDrawOffer(state) {
    var offer = { allowed: false, reason: "", cost: {} };
    var player = currentPlayer(state);
    if (state.turnPhase !== "build") {
      offer.reason = "Nur in der Bauphase.";
      return offer;
    }
    if (!player || player.drewInnovationThisTurn) {
      offer.reason = "Diese Runde bereits gezogen.";
      return offer;
    }
    if (!(state.innovationDeck || []).length && !(state.innovationDiscard || []).length) {
      offer.reason = "Stapel leer.";
      return offer;
    }
    if ((player.handCards || []).length >= C.HAND_LIMIT) {
      offer.reason = "Hand voll — zuerst eine Karte ausspielen.";
      return offer;
    }
    offer.allowed = true;
    return offer;
  }

  function drawInnovationCard(state) {
    var offer = getInnovationDrawOffer(state);
    if (!offer.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var marked = Object.assign({}, player, { drewInnovationThisTurn: true });
    var granted = grantInnovationCards(replacePlayer(state, player.id, marked), marked, 1, null);
    if (!granted.cards[0]) {
      return state;
    }
    var next = replacePlayer(granted.state, player.id, granted.player);
    next.log = addLog(next, player.name, "Stadtakte gezogen: " + granted.cards[0].name + ".");
    return next;
  }

  function canEndTurn(state) {
    var player = currentPlayer(state);
    if (state.turnPhase !== "build" || !player) {
      return false;
    }
    if (state.pendingPressure) {
      return false;
    }
    return (player.freeZoneClaims || 0) === 0;
  }

  function canBuyDevice(state, deviceId) {
    var player = currentPlayer(state);
    if (!player || player.devices[deviceId] === "local") {
      return false;
    }
    return (
      getBuildOffer(state, deviceId, "cloud", { ignorePhase: true }).allowed ||
      getBuildOffer(state, deviceId, "local", { ignorePhase: true }).allowed
    );
  }

  /* Alle gebauten Gadgets sind auf dem Brett öffentlich (Cloud und lokal). Nacht/Handoff leakt trotzdem keine Rolle/Wallet. */
  function boardGadgetsFor(owner) {
    var out = {};
    if (!owner || !owner.devices) {
      return out;
    }
    Nexus.DEVICES.forEach(function (device) {
      var mode = owner.devices[device.id];
      if (mode) {
        out[device.id] = mode;
      }
    });
    return out;
  }

  /* Ansicht für die Anleitung: klont den Übungsstand, damit die echte Oberfläche
     (Phasen, Beispielkarte, öffentliches Gerät) sichtbar wird.
     Keine neue turnPhase, keine Wertung, keine Regeländerung.
     Das konkrete Wahlversprechen wird hier nicht ausgelesen; die Endkarte
     nutzt den normalen Spielende-Pfad, damit die echte Wertung erscheint. */
  function cloneTutorialPlayer(player) {
    return Object.assign({}, player, {
      resources: Object.assign({}, player.resources),
      scores: Object.assign({}, player.scores),
      devices: Object.assign({}, player.devices),
      handCards: (player.handCards || []).slice(),
      playedCards: (player.playedCards || []).slice(),
      roundModifiers: Object.assign({}, player.roundModifiers || {}),
      pendingEvent: null
    });
  }

  function tutorialView(state, scene) {
    var next = Object.assign({}, state, {
      tutorialPractice: true,
      players: (state.players || []).map(cloneTutorialPlayer),
      zones: (state.zones || []).slice(),
      innovationDeck: (state.innovationDeck || []).slice(),
      tradeOffers: [],
      tradeSession: null,
      spinningOutcomes: null,
      finalScores: null,
      winnerId: null,
      winReason: null
    });
    var me = next.currentPlayerIndex || 0;
    var other = me === 0 ? 1 : 0;

    function patchAt(index, partial) {
      if (!next.players[index]) {
        return;
      }
      next.players[index] = Object.assign({}, next.players[index], partial);
    }

    if (scene === "role_reveal") {
      next.turnPhase = "role_reveal";
      next.roleRevealIndex = 0;
      return next;
    }
    if (scene === "handoff") {
      next.turnPhase = "handoff";
      return next;
    }
    if (scene === "event") {
      next.turnPhase = "event";
      patchAt(me, { pendingEvent: (Nexus.EVENTS || [])[0] || null });
      return next;
    }
    if (scene === "trade_respond") {
      next.turnPhase = "build";
      next.roleRevealIndex = next.players.length;
      if (next.players[other] && next.players[me]) {
        next.tradeOffers = [
          {
            id: "tutorial-offer",
            fromId: next.players[other].id,
            toId: next.players[me].id,
            giveKey: "energy",
            giveAmount: 1,
            wantKey: "money",
            wantAmount: 1,
            giveCost: 1,
            wantGain: 1,
            flags: {},
            status: "pending"
          }
        ];
      }
      return next;
    }
    if (scene === "gameover") {
      next.turnPhase = "build";
      next.roleRevealIndex = next.players.length;
      return finalizeGame(next, next.players[me].id, "rounds");
    }

    next.turnPhase = "build";
    next.roleRevealIndex = next.players.length;

    if (scene === "cards" && next.innovationDeck.length) {
      patchAt(me, { handCards: [next.innovationDeck[0]], drewInnovationThisTurn: false });
      next.innovationDeck = next.innovationDeck.slice(1);
    }
    if (scene === "public" && next.players[other]) {
      patchAt(other, {
        devices: Object.assign({}, next.players[other].devices, {
          camera: "cloud",
          lock: "local"
        })
      });
    }
    if (false && scene === "sae" && next.players[me]) {
      patchAt(me, {
        devices: Object.assign({}, next.players[me].devices, { v2x: "cloud" })
      });
    }
    return next;
  }

  /* ---------- Track C: Karma-Events, Stall, Transfer, Aufträge ---------- */

  function findPlayerById(state, playerId) {
    var found = null;
    (state.players || []).forEach(function (p) {
      if (p.id === playerId) {
        found = p;
      }
    });
    return found;
  }

  function karmaEventChance(karma) {
    var abs = Math.abs(karma || 0);
    var table = Nexus.KARMA_EVENT_CHANCE || {};
    if (table[abs] != null) {
      return table[abs];
    }
    if (abs <= 1) {
      return 0;
    }
    if (abs === 2) {
      return 0.25;
    }
    if (abs === 3) {
      return 0.5;
    }
    return 1;
  }

  function pickKarmaEventDef(player, polarity) {
    var rolePool =
      (Nexus.KARMA_CHARACTER_EVENTS && Nexus.KARMA_CHARACTER_EVENTS[player.roleId]) || [];
    var generic = (Nexus.KARMA_GENERIC_EVENTS || []).filter(function (e) {
      return e.polarity === polarity;
    });
    var charPool = rolePool.filter(function (e) {
      return e.polarity === polarity;
    });
    var pool = charPool.concat(generic);
    if (!pool.length) {
      return null;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function applyKarmaBlackmail(state, playerId) {
    var player = findPlayerById(state, playerId);
    if (!player || player.blackmailUsed) {
      return state;
    }
    var target = victoryPointTarget();
    if ((player.rolePoints || 0) < target) {
      return state;
    }
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, {
        rolePoints: Math.min(player.rolePoints || 0, target - 1),
        blackmailUsed: true,
        lastRolePointReason: "Leak / Blackmail"
      })
    );
    next.log = addLog(next, player.name, "Blackmail: Siegpunkte auf " + (target - 1) + " gesetzt.");
    return next;
  }

  function maybeRollKarmaEvent(state) {
    var player = currentPlayer(state);
    if (!player || player.pendingEvent) {
      return state;
    }
    var karma = player.karma || 0;
    var abs = Math.abs(karma);
    if (abs < 2) {
      return state;
    }
    var polarity = karma > 0 ? "good" : "bad";
    var def = null;
    if (abs >= 5) {
      def =
        polarity === "good"
          ? Nexus.KARMA_EXTREME_GOOD
          : Nexus.KARMA_EXTREME_BAD;
    } else {
      var chance = karmaEventChance(karma);
      if (Math.random() >= chance) {
        return state;
      }
      def = pickKarmaEventDef(player, polarity);
    }
    if (!def) {
      return state;
    }
    var pending = Object.assign({}, def, {
      source: "karma",
      resumePhase: "produce"
    });
    var next = replacePlayer(
      state,
      player.id,
      Object.assign({}, player, { pendingEvent: pending })
    );
    next.turnPhase = "event";
    next.log = addLog(next, player.name, "Karma-Ereignis: " + pending.title + ".");
    return next;
  }

  function normalizeStallSide(side) {
    if (!side || !side.amount || side.amount < 1) {
      return null;
    }
    if (side.kind === "sp") {
      return { kind: "sp", amount: Math.floor(side.amount) };
    }
    var resource = side.resource || side.key;
    if (KEYS.indexOf(resource) === -1) {
      return null;
    }
    return { kind: "resource", resource: resource, amount: Math.floor(side.amount) };
  }

  function stallSideLabel(side) {
    if (!side) {
      return "—";
    }
    if (side.kind === "sp") {
      return side.amount + " SP";
    }
    return side.amount + " " + (Nexus.RESOURCE_SHORT[side.resource] || side.resource);
  }

  function canPayStallSide(player, side) {
    if (!side) {
      return false;
    }
    if (side.kind === "sp") {
      return (player.rolePoints || 0) >= side.amount;
    }
    var cost = {};
    cost[side.resource] = side.amount;
    return canAfford(player.resources, cost);
  }

  function payStallSide(player, side) {
    if (side.kind === "sp") {
      return Object.assign({}, player, {
        rolePoints: Math.max(0, (player.rolePoints || 0) - side.amount),
        lastRolePointDelta: -side.amount,
        lastRolePointReason: "Stall"
      });
    }
    var cost = {};
    cost[side.resource] = side.amount;
    return Object.assign({}, player, {
      resources: subtractCost(player.resources, cost)
    });
  }

  function gainStallSide(player, side) {
    if (side.kind === "sp") {
      var target = victoryPointTarget();
      var nextPts = Math.min(target, (player.rolePoints || 0) + side.amount);
      return Object.assign({}, player, {
        rolePoints: nextPts,
        lastRolePointDelta: nextPts - (player.rolePoints || 0),
        lastRolePointReason: "Stall"
      });
    }
    var res = cloneResources(player.resources);
    res[side.resource] = (res[side.resource] || 0) + side.amount;
    return Object.assign({}, player, { resources: res });
  }

  function setStallSlot(state, slotIndex, offer) {
    var player = currentPlayer(state);
    if (!player || state.turnPhase !== "build") {
      return state;
    }
    var slots = (player.stallSlots || emptyStallSlots()).slice();
    var max = (Nexus.STALL && Nexus.STALL.SLOTS) || 3;
    if (slotIndex < 0 || slotIndex >= max) {
      return state;
    }
    if (!offer) {
      slots[slotIndex] = null;
    } else {
      var give = normalizeStallSide(offer.give);
      var want = normalizeStallSide(offer.want);
      if (!give || !want) {
        return state;
      }
      slots[slotIndex] = { give: give, want: want };
    }
    return replacePlayer(state, player.id, Object.assign({}, player, { stallSlots: slots }));
  }

  function clearStallSlot(state, slotIndex) {
    return setStallSlot(state, slotIndex, null);
  }

  function acceptStall(state, sellerId, slotIndex) {
    var buyer = currentPlayer(state);
    if (!buyer || state.turnPhase !== "build" || sellerId === buyer.id) {
      return state;
    }
    var maxAccept = (Nexus.STALL && Nexus.STALL.ACCEPTS_PER_TURN) || 2;
    if ((buyer.stallAcceptsThisTurn || 0) >= maxAccept) {
      return state;
    }
    var seller = findPlayerById(state, sellerId);
    if (!seller) {
      return state;
    }
    var slot = (seller.stallSlots || [])[slotIndex];
    if (!slot || !slot.give || !slot.want) {
      return state;
    }
    /* Bieter gibt give, will want; Annehmende zahlen want, erhalten give. */
    if (!canPayStallSide(seller, slot.give) || !canPayStallSide(buyer, slot.want)) {
      return state;
    }
    var nextSeller = payStallSide(seller, slot.give);
    nextSeller = gainStallSide(nextSeller, slot.want);
    var nextBuyer = payStallSide(buyer, slot.want);
    nextBuyer = gainStallSide(nextBuyer, slot.give);
    nextBuyer = Object.assign({}, nextBuyer, {
      stallAcceptsThisTurn: (buyer.stallAcceptsThisTurn || 0) + 1
    });
    var next = replacePlayer(state, seller.id, nextSeller);
    next = replacePlayer(next, buyer.id, nextBuyer);
    next.log = addLog(
      next,
      buyer.name,
      "Stall von " +
        seller.name +
        ": gibt " +
        stallSideLabel(slot.give) +
        ", will " +
        stallSideLabel(slot.want) +
        "."
    );
    if (slot.give.kind === "resource" && slot.want.kind === "resource") {
      next = applyKarma(next, buyer.id, 1, "Fairer Stall-Tausch");
    }
    if (Nexus.Goals && Nexus.Goals.onStallAccept) {
      var traded = Nexus.Goals.onStallAccept(next, buyer.id);
      next = traded && traded.state ? traded.state : next;
    }
    return next;
  }

  function zoneOriginalBuildCost(zone) {
    var tileId =
      (zone && zone.tileId) ||
      (zone && Nexus.tileIdFromZone ? Nexus.tileIdFromZone(zone) : null);
    var def = tileId && Nexus.BUILD_TILES && Nexus.BUILD_TILES[tileId];
    return def && def.cost ? normalizeCost(def.cost) : {};
  }

  function canRequestTransfer(state, zoneId) {
    var player = currentPlayer(state);
    var preview = {
      allowed: false,
      reason: "",
      zone: null,
      cost: {}
    };
    if (!player || state.turnPhase !== "build") {
      preview.reason = "wrong_phase";
      return preview;
    }
    var zone = null;
    (state.zones || []).forEach(function (z) {
      if (z.id === zoneId) {
        zone = z;
      }
    });
    if (!zone) {
      preview.reason = "missing_zone";
      return preview;
    }
    preview.zone = zone;
    preview.cost = zoneOriginalBuildCost(zone);
    if (zone.type === "home") {
      preview.reason = "is_home";
      return preview;
    }
    if (!zone.ownerId || zone.ownerId === player.id) {
      preview.reason = "own_or_empty";
      return preview;
    }
    if ((player.transferRequestsThisTurn || {})[zoneId]) {
      preview.reason = "already_requested";
      return preview;
    }
    if (player.blockTransferThisRound) {
      preview.reason = "blocked";
      return preview;
    }
    var ownerHasBlock = false;
    (state.players || []).forEach(function (p) {
      if (p.id === zone.ownerId && p.blockTransferThisRound) {
        ownerHasBlock = true;
      }
    });
    if (ownerHasBlock) {
      preview.reason = "blocked";
      return preview;
    }
    var adjacent = playerZones(state, player.id).some(function (own) {
      return Nexus.isAdjacent(own, zone);
    });
    if (!adjacent) {
      preview.reason = "not_adjacent";
      return preview;
    }
    preview.allowed = true;
    return preview;
  }

  function requestTransfer(state, zoneId) {
    var preview = canRequestTransfer(state, zoneId);
    if (!preview.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var zone = preview.zone;
    var req = {
      id: "xfer-" + (state.round || 1) + "-" + player.id + "-" + zoneId,
      zoneId: zone.id,
      requesterId: player.id,
      ownerId: zone.ownerId,
      round: state.round || 1,
      cost: preview.cost
    };
    var pending = (state.pendingTransfers || []).filter(function (item) {
      return !(item.zoneId === zoneId && item.requesterId === player.id);
    });
    pending.push(req);
    var requests = Object.assign({}, player.transferRequestsThisTurn || {});
    requests[zoneId] = true;
    var next = replacePlayer(
      state,
      player.id,
      Object.assign({}, player, { transferRequestsThisTurn: requests })
    );
    next = Object.assign({}, next, { pendingTransfers: pending });
    next.log = addLog(
      next,
      player.name,
      "Übertragung angefragt: Feld " + zone.q + "," + zone.r + "."
    );
    return next;
  }

  function findPendingTransfer(state, transferId) {
    var found = null;
    (state.pendingTransfers || []).forEach(function (item) {
      if (item.id === transferId) {
        found = item;
      }
    });
    return found;
  }

  function clearPendingTransfer(state, transferId) {
    return Object.assign({}, state, {
      pendingTransfers: (state.pendingTransfers || []).filter(function (item) {
        return item.id !== transferId;
      })
    });
  }

  function transferZoneOwnership(state, zoneId, newOwnerId) {
    var zones = (state.zones || []).map(function (zone) {
      if (zone.id !== zoneId) {
        return zone;
      }
      return Object.assign({}, zone, { ownerId: newOwnerId });
    });
    return Object.assign({}, state, { zones: zones });
  }

  function tileMatchesPlayerMetric(tileId, player) {
    var key = rolePointKeyFor(player);
    return !!(key && Nexus.tileMatchesMetric && Nexus.tileMatchesMetric(tileId, key));
  }

  function resolveTransfer(state, transferId, decision, opts) {
    opts = opts || {};
    var player = currentPlayer(state);
    var req = findPendingTransfer(state, transferId);
    if (!player || !req || state.turnPhase !== "build") {
      return state;
    }
    if (player.id !== req.ownerId) {
      return state;
    }
    var zone = null;
    (state.zones || []).forEach(function (z) {
      if (z.id === req.zoneId) {
        zone = z;
      }
    });
    if (!zone || zone.ownerId !== req.ownerId) {
      return clearPendingTransfer(state, transferId);
    }
    var requester = findPlayerById(state, req.requesterId);
    if (!requester) {
      return clearPendingTransfer(state, transferId);
    }
    var next = state;
    if (decision === "reject") {
      var mode = opts.rejectMode || "karma";
      if (mode === "resource") {
        var penalty =
          opts.resourceCost ||
          (Nexus.REJECT_OFFER_COST && Nexus.REJECT_OFFER_COST.resources) ||
          { money: 1 };
        if (!canAfford(player.resources, penalty)) {
          mode = "karma";
        } else {
          next = replacePlayer(
            next,
            player.id,
            Object.assign({}, player, {
              resources: subtractCost(player.resources, penalty)
            })
          );
          next.log = addLog(next, player.name, "Übertragung abgelehnt (−Ressourcen).");
        }
      }
      if (mode === "karma") {
        next = applyKarma(next, player.id, -1, "Übertragung abgelehnt");
      }
      return clearPendingTransfer(next, transferId);
    }

    if (decision === "buy") {
      var cost = req.cost || zoneOriginalBuildCost(zone);
      if (!canAfford(requester.resources, cost)) {
        return state;
      }
      var paidBuyer = Object.assign({}, requester, {
        resources: subtractCost(requester.resources, cost),
        transfersReceived: (requester.transfersReceived || 0) + 1
      });
      var ownerRes = cloneResources(player.resources);
      Object.keys(cost).forEach(function (key) {
        ownerRes[key] = (ownerRes[key] || 0) + (cost[key] || 0);
      });
      var paidOwner = Object.assign({}, player, { resources: ownerRes });
      next = replacePlayer(next, requester.id, paidBuyer);
      next = replacePlayer(next, player.id, paidOwner);
      next = transferZoneOwnership(next, zone.id, requester.id);
      next = clearPendingTransfer(next, transferId);
      next = tickContractProgress(next, requester.id, { transfersIn: 1 });
      next.log = addLog(
        next,
        player.name,
        "Feld verkauft an " + requester.name + " für " + formatCost(cost) + "."
      );
      return next;
    }

    if (decision === "gift") {
      var tileId =
        zone.tileId || (Nexus.tileIdFromZone ? Nexus.tileIdFromZone(zone) : null);
      next = transferZoneOwnership(next, zone.id, requester.id);
      var giftedRequester = Object.assign({}, findPlayerById(next, requester.id), {
        transfersReceived: (requester.transfersReceived || 0) + 1
      });
      next = replacePlayer(next, requester.id, giftedRequester);
      if (tileId && tileMatchesPlayerMetric(tileId, player)) {
        next = Nexus.awardRolePoints
          ? Nexus.awardRolePoints(next, player.id, 1, "Schenkung")
          : next;
      } else {
        next = applyKarma(next, player.id, 1, "Schenkung (fremde Metrik)");
      }
      if (Nexus.Goals && Nexus.Goals.onGiftApprove) {
        var giftResult = Nexus.Goals.onGiftApprove(next, player.id);
        next = giftResult && giftResult.state ? giftResult.state : next;
      }
      next = clearPendingTransfer(next, transferId);
      next = tickContractProgress(next, requester.id, { transfersIn: 1 });
      next.log = addLog(next, player.name, "Feld an " + requester.name + " geschenkt.");
      return next;
    }
    return state;
  }

  function makeActiveContract(def) {
    return {
      id: def.id,
      kind: def.kind,
      label: def.label,
      weeksLeft: def.weeks || Nexus.CONTRACT_DEFAULT_WEEKS || 4,
      progress: 0,
      need: def.need || def.amount || 0,
      resource: def.resource || null,
      amount: def.amount || 0,
      rewardSp: def.rewardSp || 1,
      rewardKarma: def.rewardKarma || 0,
      failKarma: def.failKarma != null ? def.failKarma : -1,
      needKarma: def.needKarma || 0,
      holdWeeks: def.holdWeeks || 0,
      holdProgress: 0
    };
  }

  function offerContract(state, contractId) {
    var player = currentPlayer(state);
    if (!player || player.activeContract) {
      return state;
    }
    var def = Nexus.CONTRACTS_BY_ID && Nexus.CONTRACTS_BY_ID[contractId];
    if (!def) {
      return state;
    }
    /* Angebot als pendingContractOffer — Annehmen/Ablehnen separat. */
    return replacePlayer(
      state,
      player.id,
      Object.assign({}, player, { pendingContractOffer: makeActiveContract(def) })
    );
  }

  function acceptContract(state) {
    var player = currentPlayer(state);
    if (!player || !player.pendingContractOffer || player.activeContract) {
      return state;
    }
    var active = Object.assign({}, player.pendingContractOffer);
    return replacePlayer(
      state,
      player.id,
      Object.assign({}, player, {
        activeContract: active,
        pendingContractOffer: null
      })
    );
  }

  function rejectContractOffer(state, rejectMode) {
    var player = currentPlayer(state);
    if (!player || !player.pendingContractOffer) {
      return state;
    }
    var next = replacePlayer(
      state,
      player.id,
      Object.assign({}, player, { pendingContractOffer: null })
    );
    var mode = rejectMode || "karma";
    if (mode === "resource") {
      var penalty =
        (Nexus.REJECT_OFFER_COST && Nexus.REJECT_OFFER_COST.resources) || { money: 1 };
      if (canAfford(player.resources, penalty)) {
        next = replacePlayer(
          next,
          player.id,
          Object.assign({}, findPlayerById(next, player.id), {
            resources: subtractCost(player.resources, penalty),
            pendingContractOffer: null
          })
        );
        next.log = addLog(next, player.name, "Auftrag abgelehnt (−Ressourcen).");
        return next;
      }
    }
    next = applyKarma(next, player.id, -1, "Auftrag abgelehnt");
    return next;
  }

  function completeActiveContract(state, playerId, success) {
    var player = findPlayerById(state, playerId);
    if (!player || !player.activeContract) {
      return state;
    }
    var contract = player.activeContract;
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { activeContract: null })
    );
    if (success) {
      if (contract.rewardSp && Nexus.awardRolePoints) {
        next = Nexus.awardRolePoints(next, playerId, contract.rewardSp, contract.label || "Auftrag");
      }
      if (contract.rewardKarma) {
        next = applyKarma(next, playerId, contract.rewardKarma, contract.label || "Auftrag");
      }
      next.log = addLog(next, player.name, "Auftrag erfüllt: " + (contract.label || contract.id) + ".");
    } else {
      if (contract.failKarma) {
        next = applyKarma(next, playerId, contract.failKarma, "Auftrag gescheitert");
      }
      next.log = addLog(next, player.name, "Auftrag gescheitert: " + (contract.label || contract.id) + ".");
    }
    return next;
  }

  function fulfillDonateContract(state) {
    var player = currentPlayer(state);
    if (!player || !player.activeContract || player.activeContract.kind !== "donate") {
      return state;
    }
    var contract = player.activeContract;
    var cost = {};
    cost[contract.resource] = contract.amount;
    if (!canAfford(player.resources, cost)) {
      return state;
    }
    var next = replacePlayer(
      state,
      player.id,
      Object.assign({}, player, {
        resources: subtractCost(player.resources, cost)
      })
    );
    return completeActiveContract(next, player.id, true);
  }

  function tickContractProgress(state, playerId, flags) {
    flags = flags || {};
    var player = findPlayerById(state, playerId);
    if (!player || !player.activeContract) {
      return state;
    }
    var contract = Object.assign({}, player.activeContract);
    var changed = false;
    if (contract.kind === "buildMetric" && flags.buildMetric) {
      contract.progress = (contract.progress || 0) + flags.buildMetric;
      changed = true;
    }
    if (contract.kind === "upgradeMetric" && flags.upgradeMetric) {
      contract.progress = (contract.progress || 0) + flags.upgradeMetric;
      changed = true;
    }
    if (contract.kind === "transfersIn" && flags.transfersIn) {
      contract.progress = (contract.progress || 0) + flags.transfersIn;
      changed = true;
    }
    if (!changed) {
      return state;
    }
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { activeContract: contract })
    );
    if (contract.need && contract.progress >= contract.need) {
      next = completeActiveContract(next, playerId, true);
    }
    return next;
  }

  function tickActiveContracts(state) {
    var next = state;
    (state.players || []).forEach(function (p) {
      if (!p.activeContract) {
        return;
      }
      var contract = Object.assign({}, p.activeContract);
      if (contract.kind === "karmaHold") {
        if ((p.karma || 0) >= (contract.needKarma || 3)) {
          contract.holdProgress = (contract.holdProgress || 0) + 1;
        } else {
          contract.holdProgress = 0;
        }
        if (contract.holdWeeks && contract.holdProgress >= contract.holdWeeks) {
          next = completeActiveContract(
            replacePlayer(next, p.id, Object.assign({}, findPlayerById(next, p.id), { activeContract: contract })),
            p.id,
            true
          );
          return;
        }
      }
      contract.weeksLeft = (contract.weeksLeft || 1) - 1;
      if (contract.weeksLeft <= 0) {
        next = completeActiveContract(
          replacePlayer(next, p.id, Object.assign({}, findPlayerById(next, p.id), { activeContract: contract })),
          p.id,
          false
        );
      } else {
        next = replacePlayer(
          next,
          p.id,
          Object.assign({}, findPlayerById(next, p.id), { activeContract: contract })
        );
      }
    });
    return next;
  }

  /* C5 Handkarten-Stubs: einfache Effekte; UI verdrahtet später. */
  function playHandCard(state, handIndex, extra) {
    extra = extra || {};
    var player = currentPlayer(state);
    if (!player || state.turnPhase !== "build") {
      return state;
    }
    var hand = (player.handCards || []).slice();
    if (handIndex < 0 || handIndex >= hand.length) {
      return state;
    }
    var card = hand[handIndex];
    var def =
      (Nexus.HAND_CARD_DEFS_BY_ID && Nexus.HAND_CARD_DEFS_BY_ID[card.id]) || card;
    var effects = def.effects || card.effects || {};
    hand.splice(handIndex, 1);
    var nextPlayer = Object.assign({}, player, {
      handCards: hand,
      playedCards: (player.playedCards || []).concat([card.id || def.id])
    });
    var next = replacePlayer(state, player.id, nextPlayer);

    if (effects.spend && !canAfford(nextPlayer.resources, effects.spend)) {
      return state;
    }
    if (effects.spend) {
      nextPlayer = Object.assign({}, nextPlayer, {
        resources: subtractCost(nextPlayer.resources, effects.spend)
      });
      next = replacePlayer(next, player.id, nextPlayer);
    }
    var gain = normalizeCost(effects);
    if (Object.keys(gain).length) {
      var res = cloneResources(nextPlayer.resources);
      KEYS.forEach(function (key) {
        if (gain[key]) {
          res[key] += gain[key];
        }
      });
      nextPlayer = Object.assign({}, nextPlayer, { resources: res });
      next = replacePlayer(next, player.id, nextPlayer);
    }
    if (effects.karma) {
      next = applyKarma(next, player.id, effects.karma, def.name || "Handkarte");
    }
    if (effects.freeZoneClaim) {
      nextPlayer = findPlayerById(next, player.id);
      next = replacePlayer(
        next,
        player.id,
        Object.assign({}, nextPlayer, {
          freeZoneClaims: (nextPlayer.freeZoneClaims || 0) + effects.freeZoneClaim
        })
      );
    }
    if (effects.freeUpgrade) {
      var upgradeable = playerFactoryZones(next, player.id).filter(function (z) {
        return zoneUpgradeLevel(z) < (C.ZONE_UPGRADE_MAX || 1);
      });
      if (upgradeable.length) {
        var pick = upgradeable[Math.floor(Math.random() * upgradeable.length)];
        next = Object.assign({}, next, {
          zones: next.zones.map(function (z) {
            return z.id === pick.id
              ? Object.assign({}, z, { upgradeLevel: zoneUpgradeLevel(z) + 1 })
              : z;
          })
        });
        if (Nexus.Goals && Nexus.Goals.onUpgrade) {
          var tid = pick.tileId || (Nexus.tileIdFromZone && Nexus.tileIdFromZone(pick));
          if (tid) {
            var up = Nexus.Goals.onUpgrade(next, player.id, tid);
            next = up && up.state ? up.state : next;
          }
        }
      }
    }
    if (effects.scandal && extra.playerId && extra.playerId !== player.id) {
      next = stripRolePoints(next, extra.playerId, 1, def.name || "Skandal", { oncePerDay: true });
      next = applyKarma(next, extra.playerId, -1, "Skandal");
      next = applyKarma(next, player.id, -1, "Skandal ausgelöst");
    }
    if (effects.offerContract) {
      var pool = Nexus.CONTRACTS || [];
      if (pool.length) {
        var cid = pool[Math.floor(Math.random() * pool.length)].id;
        next = offerContract(next, cid);
      }
    }
    if (effects.blockTransfer) {
      nextPlayer = findPlayerById(next, player.id);
      next = replacePlayer(
        next,
        player.id,
        Object.assign({}, nextPlayer, { blockTransferThisRound: true })
      );
    }
    if (effects.doubleHarvest) {
      /* Stub: merkt Zone; Ernte-Hook folgt mit D2. */
      nextPlayer = findPlayerById(next, player.id);
      next = replacePlayer(
        next,
        player.id,
        Object.assign({}, nextPlayer, {
          doubleHarvestZoneId: extra.zoneId || null
        })
      );
    }
    next.log = addLog(next, player.name, "Karte gespielt: " + (def.name || card.name || card.id) + ".");
    return next;
  }

  function previewBuildPoints(state, tileId, q, r) {
    var player = currentPlayer(state);
    if (!Nexus.Goals || !Nexus.Goals.previewBuildPoints || !player) {
      return 0;
    }
    return Nexus.Goals.previewBuildPoints(state, player, tileId, {
      q: q,
      r: r,
      ownerId: player.id
    });
  }

  Nexus.createSetupState = createSetupState;
  Nexus.startGame = startGame;
  Nexus.tutorialView = tutorialView;
  Nexus.acknowledgeRoleReveal = acknowledgeRoleReveal;
  Nexus.acknowledgeHandoff = acknowledgeHandoff;
  Nexus.isHotSeatShield = isHotSeatShield;
  Nexus.roleRevealPlayer = roleRevealPlayer;
  Nexus.currentPlayer = currentPlayer;
  Nexus.playerZones = playerZones;
  Nexus.skipEmptyProduce = skipEmptyProduce;
  Nexus.playerFactoryZones = playerFactoryZones;
  Nexus.setStandardsChoice = setStandardsChoice;
  Nexus.getTradeOffer = getTradeOffer;
  Nexus.recordBlockedTradeAttempt = recordBlockedTradeAttempt;
  Nexus.getPublicPlayerView = getPublicPlayerView;
  Nexus.boardGadgetsFor = boardGadgetsFor;
  Nexus.executeTrade = executeTrade;
  Nexus.proposeTrade = proposeTrade;
  Nexus.beginTradeInterrupt = beginTradeInterrupt;
  Nexus.respondTrade = respondTrade;
  Nexus.pendingTradeOffersFor = pendingTradeOffersFor;
  Nexus.findTradeOffer = findTradeOffer;
  Nexus.countResourceMonopolies = countResourceMonopolies;
  Nexus.beginHarvestAllSimultaneous = beginHarvestAllSimultaneous;
  Nexus.completeHarvestAll = completeHarvestAll;
  Nexus.harvestAnimationMs = harvestAnimationMs;
  Nexus.remainingHarvestCount = remainingHarvestCount;
  Nexus.applyEventChoice = applyEventChoice;
  Nexus.canChooseEventOption = canChooseEventOption;
  Nexus.buildDevice = buildDevice;
  Nexus.getBuildOffer = getBuildOffer;
  Nexus.buyZone = buyZone;
  Nexus.setDatacenterMode = setDatacenterMode;
  Nexus.awardTypedRolePoints = awardTypedRolePoints;
  Nexus.getExpandOffer = getExpandOffer;
  Nexus.getExpandCost = getExpandCost;
  Nexus.isExpandableSlot = isExpandableSlot;
  Nexus.canAffordExpandSlot = canAffordExpandSlot;
  Nexus.zoneAt = zoneAt;
  Nexus.expectedYieldForBase = expectedYieldForBase;
  Nexus.expectedByResource = expectedByResource;


  Nexus.endTurn = endTurn;
  Nexus.canEndTurn = canEndTurn;
  function stampCause(next, state, cause) {
    if (!next || next === state || !cause) {
      return next;
    }
    next.lastScoreCause = cause;
    return next;
  }

  Nexus.takeProject = function (state, index) {
    if (!Nexus.Projects) {
      return state;
    }
    var card = (state.projectMarket || [])[index];
    var next = Nexus.Projects.take(state, index);
    if (next !== state) {
      var catMap = {
        green: { key: "eco", amount: 1 },
        privacy: { key: "trust", amount: 1 },
        mobility: { key: "innovation", amount: 1 },
        general: { key: "image", amount: 1 }
      };
      var award = card && catMap[card.category];
      if (award) {
        var who = currentPlayer(state);
        if (who) {
          next = awardTypedRolePoints(next, who.id, award.key, award.amount, card.name || "Projekt");
        }
      }
      if (Nexus.Risk) {
        next = Nexus.Risk.syncState(next, { decay: false });
      }
    }
    return stampCause(next, state, { kind: "card", label: "Karte" });
  };
  /* Dev-Run: Ereignis sofort öffnen (keine Risiko-Schwelle). */
  Nexus.devForceEvent = function (state, eventId) {
    if (!state || !state.devRun) {
      return state;
    }
    var def = Nexus.EVENTS_BY_ID && Nexus.EVENTS_BY_ID[eventId];
    if (!def) {
      return state;
    }
    var player = currentPlayer(state);
    if (!player) {
      return state;
    }
    var card = Object.assign({}, def, {
      choices: (def.choices || []).map(function (c) {
        return Object.assign({}, c, { effects: Object.assign({}, c.effects || {}) });
      })
    });
    var next = Object.assign({}, state, { turnPhase: "event" });
    return replacePlayer(next, player.id, { pendingEvent: card });
  };

  /* Dev-Run: Special einmalig im Baumenü freischalten (nicht sofort umbauen). */
  Nexus.devForceSpecialTile = function (state, kind) {
    if (!state || !state.devRun) {
      return state;
    }
    if (kind === "depot" || kind === "bus-stop") {
      kind = "taxi";
    }
    var allowed = { garage: 1, taxi: 1, park: 1, workshop: 1 };
    if (!allowed[kind]) {
      return state;
    }
    var once = Object.assign({}, state.devBuildOnce || {});
    once[kind] = true;
    var labels = {
      garage: "Garagen",
      taxi: "E-Taxi-Station",
      park: "Park",
      workshop: "Werkstatt"
    };
    var next = Object.assign({}, state, {
      devBuildOnce: once,
      turnPhase: "build"
    });
    next.log = addLog(
      next,
      "Dev",
      (labels[kind] || kind) + " einmalig freigeschaltet — im Baumenü unter … bauen."
    );
    return next;
  };

  function clearDevBuildOnce(state, kind) {
    if (!state || !state.devBuildOnce || !state.devBuildOnce[kind]) {
      return state;
    }
    var once = Object.assign({}, state.devBuildOnce);
    delete once[kind];
    return Object.assign({}, state, { devBuildOnce: once });
  }

  function consumeDevBuildOnceForZone(state, zoneType, variant, trafficMode, busStop) {
    var next = state;
    if (zoneType === "park") {
      next = clearDevBuildOnce(next, "park");
    } else if (zoneType === "workshop") {
      next = clearDevBuildOnce(next, "workshop");
    } else if (zoneType === "traffic") {
      if (trafficMode === "taxi" || variant === "taxi" || variant === "depot" || trafficMode === "depot") {
        next = clearDevBuildOnce(next, "taxi");
        next = clearDevBuildOnce(next, "depot");
      } else {
        next = clearDevBuildOnce(next, "garage");
      }
    }
    return next;
  }

  /* Bus/Linien entfernt — Stubs halten alte Aufrufe harmlos. */
  Nexus.placeBusStop = function (state) {
    return state;
  };
  Nexus.setTrafficMode = function (state) {
    return state;
  };
  Nexus.openBusLine = function (state) {
    return state;
  };
  Nexus.normalizeTrafficMode = normalizeTrafficMode;
  Nexus.canBuyDevice = canBuyDevice;
  Nexus.getInnovationDrawOffer = getInnovationDrawOffer;
  Nexus.drawInnovationCard = drawInnovationCard;
  Nexus.playInnovationCard = playInnovationCard;
  Nexus.playHandCard = playInnovationCard;
  Nexus.resolvePressure = resolvePressure;
  Nexus.tickMandates = tickMandates;
  Nexus.canAfford = canAfford;
  Nexus.formatCost = formatCost;
  Nexus.formatEffects = formatEffects;
  Nexus.describeZoneBuild = describeZoneBuild;
  /* Präsentation: Ertragszeile für Produktions-View (keine neuen Regeln). */
  function zoneProdSummary(state, zone) {
    if (!zone || !ZONE_TYPES[zone.type]) {
      return null;
    }
    var typeDef = ZONE_TYPES[zone.type];
    var def = resolveZoneYieldDef(zone);
    var level = zoneUpgradeLevel(zone);
    var variant = zone.variant || defaultVariantFor(zone.type);
    var variantDef = variantDefFor(zone.type, variant);
    var title = typeDef.label || zone.type;
    if (variantDef && variantDef.label && variantDef.label !== typeDef.label) {
      title = variantDef.label;
    }
    if (level > 0) {
      title += " · Stufe " + level;
    }
    var lines = [];
    var owner = null;
    (state.players || []).forEach(function (person) {
      if (person.id === zone.ownerId) {
        owner = person;
      }
    });
    var labels = Nexus.RESOURCE_LABELS || {};
    if (zone.type === "home") {
      var homeYield = homeBaseProduction(zone);
      ["energy", "money", "bandwidth"].forEach(function (key) {
        if (homeYield[key]) {
          lines.push("+" + homeYield[key] + " " + (labels[key] || key));
        }
      });
    } else if (def && def.primary) {
      var base = zonePrimaryBase(zone, state, owner);
      var prefix = def.dice ? "~" : "+";
      lines.push(prefix + base + " " + (labels[def.primary] || def.primary));
      if (def.secondary) {
        lines.push(
          "+" +
            ((def.secondaryBase || 0) + zoneUpgradeLevel(zone)) +
            " " +
            (labels[def.secondary] || def.secondary)
        );
      }
      if (zone.variant === "transformer") {
        lines.push("−" + base * (C.TRANSFORMER_MONEY_PER_ENERGY || 1) + " Geld");
      }
      if (def.upkeep) {
        if (def.upkeep.energy) {
          lines.push("−" + def.upkeep.energy + " " + (labels.energy || "energy"));
        }
        if (def.upkeep.bandwidth) {
          lines.push("−" + def.upkeep.bandwidth + " " + (labels.bandwidth || "bandwidth"));
        }
        if (def.upkeep.money) {
          lines.push("−" + def.upkeep.money + " " + (labels.money || "money"));
        }
      }
    } else {
      lines.push("kein Ressourcenertrag");
    }
    return {
      title: title,
      lines: lines,
      q: zone.q,
      r: zone.r,
      zoneId: zone.id
    };
  }
  Nexus.zoneProdSummary = zoneProdSummary;
  Nexus.describeZoneUpgrade = describeZoneUpgrade;
  Nexus.upgradeZone = upgradeZone;
  Nexus.describeDemolish = describeDemolish;
  Nexus.demolishZone = demolishZone;
  Nexus.recommendExpandType = recommendExpandType;
  Nexus.recommendExpandSlot = recommendExpandSlot;
  Nexus.datacenterCapInfo = datacenterCapInfo;
  Nexus.maxDatacentersFor = maxDatacentersFor;
  Nexus.zoneUpgradeLevel = zoneUpgradeLevel;
  Nexus.cloudUpkeepCost = cloudUpkeepCost;
  Nexus.clampKarma = clampKarma;
  Nexus.applyKarma = applyKarma;
  Nexus.resolveBuildSpec = resolveBuildSpec;
  Nexus.victoryPointTarget = victoryPointTarget;
  Nexus.ownVictoryPoints = ownVictoryPoints;
  Nexus.checkInstantWinAtRoundEnd = checkInstantWinAtRoundEnd;
  Nexus.resolveFallbackWinner = resolveFallbackWinner;
  Nexus.maybeRollKarmaEvent = maybeRollKarmaEvent;
  Nexus.applyKarmaBlackmail = applyKarmaBlackmail;
  Nexus.setStallSlot = setStallSlot;
  Nexus.clearStallSlot = clearStallSlot;
  Nexus.acceptStall = acceptStall;
  Nexus.canRequestTransfer = canRequestTransfer;
  Nexus.requestTransfer = requestTransfer;
  Nexus.resolveTransfer = resolveTransfer;
  Nexus.offerContract = offerContract;
  Nexus.acceptContract = acceptContract;
  Nexus.rejectContractOffer = rejectContractOffer;
  Nexus.fulfillDonateContract = fulfillDonateContract;
  Nexus.tickActiveContracts = tickActiveContracts;
  Nexus.tickContractProgress = tickContractProgress;
  Nexus.playHandCard = playHandCard;
  Nexus.previewBuildPoints = previewBuildPoints;

  /* Track-B Smoke: Shape, tileId/Kosten, Ernte, Karma, Sieg. */
  Nexus.runSmokeCheck = function () {
    if (KEYS.length !== 3) {
      throw new Error("RESOURCE_KEYS length");
    }
    var state = startGame(2, "short");
    if (state.maxRounds !== 12) {
      throw new Error("short weeks 12");
    }
    var longGame = startGame(2, "standard");
    if (longGame.maxRounds !== 16) {
      throw new Error("standard weeks 16");
    }
    var player = state.players[0];
    if (
      player.karma == null ||
      !player.goalProgress ||
      !player.stallSlots ||
      player.stallSlots.length !== 3 ||
      player.stallAcceptsThisTurn == null ||
      player.activeContract !== null
    ) {
      throw new Error("player shape Track B");
    }
    state = Object.assign({}, state, { turnPhase: "build", screen: "game", currentPlayerIndex: 0 });
    var home = playerZones(state, player.id)[0];
    var pick = null;
    Nexus.HEX_DIRS.forEach(function (dir) {
      var q = home.q + dir.q;
      var r = home.r + dir.r;
      if (!pick && isExpandableSlot(state, q, r)) {
        pick = { q: q, r: r };
      }
    });
    if (!pick) {
      throw new Error("no expand slot");
    }
    /* Startcoupon: erstes Feld gratis */
    var windOffer = getExpandOffer(state, pick.q, pick.r, "energy", "wind", "energy-wind");
    if (!windOffer.allowed || Object.keys(windOffer.cost).length) {
      throw new Error("free claim wind");
    }
    state = buyZone(state, pick.q, pick.r, "energy", "wind", "energy-wind");
    var built = zoneAt(state, pick.q, pick.r);
    if (!built || built.tileId !== "energy-wind" || built.variant !== "wind") {
      throw new Error("buyZone tileId");
    }
    state = Object.assign({}, state, {
      players: state.players.map(function (p, idx) {
        if (idx !== 0) {
          return p;
        }
        return Object.assign({}, p, {
          resources: Object.assign(cloneResources(p.resources), {
            money: 30,
            energy: 30,
            bandwidth: 30
          }),
          freeZoneClaims: 0
        });
      })
    });
    var pick2 = null;
    Nexus.HEX_DIRS.forEach(function (dir) {
      var q = built.q + dir.q;
      var r = built.r + dir.r;
      if (!pick2 && isExpandableSlot(state, q, r)) {
        pick2 = { q: q, r: r };
      }
    });
    if (!pick2) {
      throw new Error("no second slot");
    }
    var coalCost = Nexus.BUILD_TILES["energy-coal"].cost;
    var coalOffer = getExpandOffer(state, pick2.q, pick2.r, null, null, "energy-coal");
    if (!coalOffer.allowed || coalOffer.cost.energy !== coalCost.energy || coalOffer.cost.money !== coalCost.money) {
      throw new Error("tile cost from BUILD_TILES");
    }
    state = buyZone(state, pick2.q, pick2.r, null, null, "energy-coal");
    if (currentPlayer(state).karma !== -1) {
      throw new Error("karmaOnBuild coal");
    }
    var coalZone = zoneAt(state, pick2.q, pick2.r);
    if (!coalZone || coalZone.tileId !== "energy-coal") {
      throw new Error("coal tileId");
    }
    var pick3 = null;
    Nexus.HEX_DIRS.forEach(function (dir) {
      var q = coalZone.q + dir.q;
      var r = coalZone.r + dir.r;
      if (!pick3 && isExpandableSlot(state, q, r)) {
        pick3 = { q: q, r: r };
      }
    });
    if (pick3) {
      state = buyZone(state, pick3.q, pick3.r, "residential", null, "data-residential");
      var resZone = zoneAt(state, pick3.q, pick3.r);
      var resYield = produceForZone(resZone, 0, currentPlayer(state), state);
      if (!resYield || resYield.primary.resource !== "bandwidth" || resYield.primary.amount !== 2) {
        throw new Error("residential without DC");
      }
      state = demolishZone(state, resZone.id);
      state = buyZone(state, pick3.q, pick3.r, "taxi", null, "data-taxi");
      var taxiZone = zoneAt(state, pick3.q, pick3.r);
      var taxiYield = produceForZone(taxiZone, 0, currentPlayer(state), state);
      var taxiBase =
        (Nexus.BUILD_TILES["data-taxi"] && Nexus.BUILD_TILES["data-taxi"].primaryBase) || 2;
      if (
        !taxiYield ||
        taxiYield.primary.amount !== taxiBase ||
        taxiYield.energySpent !== 1 ||
        taxiYield.bandwidthSpent !== 1
      ) {
        throw new Error("taxi upkeep produce");
      }
    }
    var solarPreview = describeZoneBuild(state, "energy", "solar");
    if (!solarPreview.tileId || solarPreview.tileId !== "energy-solar" || !solarPreview.production || solarPreview.production.amount !== 2) {
      throw new Error("solar preview tile");
    }
    var dcCap = datacenterCapInfo(state, currentPlayer(state).id);
    if (!dcCap.allowed) {
      throw new Error("dc cap must allow");
    }
    if (setDatacenterMode(state, "x", "secure") !== state) {
      throw new Error("dc mode noop");
    }
    /* Sieg: 10 own-SP, Tiebreak Karma */
    var winState = Object.assign({}, state, {
      players: state.players.map(function (p, idx) {
        return Object.assign({}, p, {
          rolePoints: idx === 0 ? 10 : 10,
          karma: idx === 0 ? 2 : 4
        });
      })
    });
    var instant = checkInstantWinAtRoundEnd(winState);
    if (!instant || instant.winnerId !== state.players[1].id) {
      throw new Error("win karma tiebreak");
    }
    var fallback = resolveFallbackWinner(
      Object.assign({}, state, {
        players: state.players.map(function (p, idx) {
          return Object.assign({}, p, {
            rolePoints: idx === 0 ? 7 : 5,
            karma: 0
          });
        })
      })
    );
    if (!fallback || fallback.winnerId !== state.players[0].id) {
      throw new Error("fallback own SP");
    }
    if (ZONE_TYPES.home.label.indexOf("Kontroll") === -1) {
      throw new Error("home label");
    }
    if (C.MAX_PLAYERS !== 3 || Nexus.ALL_ROLE_IDS.length !== 6) {
      throw new Error("cast: max 3 players, 6 roles");
    }
    var awarded = Nexus.awardRolePoints(
      {
        players: [{ id: "partial", roleId: "climate", rolePoints: 3, karma: 0 }],
        zones: [],
        busLines: [],
        log: []
      },
      "partial",
      2,
      "test"
    );
    if ((awarded.players[0].rolePoints || 0) !== 5) {
      throw new Error("awardRolePoints");
    }
    if (!Nexus.Goals || !Nexus.Goals.onBuild || !Nexus.Goals.onUpgrade || !Nexus.Goals.onDemolish) {
      throw new Error("Goals hooks");
    }
    if (typeof Nexus.setStallSlot !== "function" || typeof Nexus.acceptStall !== "function") {
      throw new Error("Stall APIs");
    }
    if (typeof Nexus.requestTransfer !== "function" || typeof Nexus.resolveTransfer !== "function") {
      throw new Error("Transfer APIs");
    }
    if (typeof Nexus.maybeRollKarmaEvent !== "function") {
      throw new Error("Karma event API");
    }
    if (typeof Nexus.previewBuildPoints !== "function") {
      throw new Error("previewBuildPoints");
    }
    /* Stall round-trip */
    state = Object.assign({}, state, { turnPhase: "build", currentPlayerIndex: 0 });
    state = Nexus.setStallSlot(state, 0, {
      give: { kind: "resource", resource: "energy", amount: 1 },
      want: { kind: "resource", resource: "money", amount: 1 }
    });
    if (!state.players[0].stallSlots[0] || state.players[0].stallSlots[0].give.amount !== 1) {
      throw new Error("setStallSlot");
    }
    state = Nexus.clearStallSlot(state, 0);
    if (state.players[0].stallSlots[0] !== null) {
      throw new Error("clearStallSlot");
    }
    if (
      !Nexus.KARMA_GENERIC_EVENTS ||
      !Nexus.KARMA_GENERIC_EVENTS.length ||
      !Nexus.KARMA_EXTREME_GOOD
    ) {
      throw new Error("karma event data missing (boot/index script order)");
    }
    return "ok";
  };
})(window.Nexus);
