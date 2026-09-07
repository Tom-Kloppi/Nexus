window.Nexus = window.Nexus || {};

(function (Nexus) {
  var C = Nexus.CONSTANTS;
  var KEYS = Nexus.RESOURCE_KEYS;
  var ZONE_TYPES = Nexus.ZONE_TYPES;

  function emptyResources() {
    var res = {};
    KEYS.forEach(function (key) {
      res[key] = 0;
    });
    return res;
  }

  function cloneResources(resources) {
    var next = {};
    KEYS.forEach(function (key) {
      next[key] = resources[key] || 0;
    });
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

  function canAfford(resources, cost) {
    return KEYS.every(function (key) {
      return (resources[key] || 0) >= (cost[key] || 0);
    });
  }

  function subtractCost(resources, cost) {
    var next = cloneResources(resources);
    KEYS.forEach(function (key) {
      next[key] -= cost[key] || 0;
    });
    return next;
  }

  function upgradeCost(cloudCost, localCost) {
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
    return Object.assign({}, device.costs[mode]);
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

  function homeBaseProduction() {
    var yieldMap = emptyResources();
    KEYS.forEach(function (key) {
      yieldMap[key] = C.HOME_BASE_YIELD;
    });
    return yieldMap;
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
    if (player.localHardwareDiscountPending && mode === "local" && (cost.hardware || 0) > 0) {
      cost = Object.assign({}, cost);
      cost.hardware -= 1;
      if (cost.hardware <= 0) {
        delete cost.hardware;
      }
      offer.usedLocalHardwareDiscount = true;
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
    if (player.devices.hub === "local") {
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

  function pickEventForPlayer(player) {
    if (Math.random() < 0.35 && hasLocalPrivacyShield(player)) {
      var shield = tryPrivacyShieldEvent(null, player);
      if (shield) {
        return shield;
      }
    }
    return pickEvent(player);
  }

  /* ---------- Fabrik-Produktion (Abschnitt 3.2 / 3.3) ---------- */

  function diceWeightTotal() {
    return Nexus.PRODUCTION_DICE.reduce(function (sum, die) {
      return sum + die.weight;
    }, 0);
  }

  function rollProductionDie() {
    var total = diceWeightTotal();
    var pick = Math.random() * total;
    var i;
    for (i = 0; i < Nexus.PRODUCTION_DICE.length; i++) {
      pick -= Nexus.PRODUCTION_DICE[i].weight;
      if (pick <= 0) {
        return Nexus.PRODUCTION_DICE[i];
      }
    }
    return Nexus.PRODUCTION_DICE[Nexus.PRODUCTION_DICE.length - 1];
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

  function produceForZoneType(zoneTypeId, modifier) {
    if (zoneTypeId === "home") {
      return null;
    }
    var typeDef = ZONE_TYPES[zoneTypeId];
    var result = {
      primary: { resource: typeDef.primary, amount: yieldAmount(typeDef.primaryBase, modifier) }
    };
    if (typeDef.secondary) {
      result.secondary = {
        resource: typeDef.secondary,
        amount: yieldAmount(typeDef.secondaryBase, modifier)
      };
    }
    return result;
  }

  function expectedByResource(state) {
    var expected = homeBaseProduction();
    var player = currentPlayer(state);
    if (!player) {
      return expected;
    }
    playerFactoryZones(state, player.id).forEach(function (zone) {
      var typeDef = ZONE_TYPES[zone.type];
      expected[typeDef.primary] += expectedYieldForBase(typeDef.primaryBase);
      if (typeDef.secondary) {
        expected[typeDef.secondary] += expectedYieldForBase(typeDef.secondaryBase);
      }
    });
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
    var reservedHome = Nexus.HOME_POSITIONS.some(function (pos) {
      return pos.q === q && pos.r === r;
    });
    if (reservedHome) {
      return false;
    }
    if (!C.EXPAND_REQUIRES_ADJACENT) {
      return true;
    }
    return playerFactoryZones(state, player.id).some(function (zone) {
      return Nexus.isAdjacent(zone, { q: q, r: r });
    });
  }

  function getExpandCost(state) {
    var player = currentPlayer(state);
    var owned = player ? playerFactoryZones(state, player.id).length : 0;
    var extra = Math.max(0, owned - C.START_ZONE_COUNT);
    var cost = { hardware: 2 + extra };
    if (extra >= 1) {
      cost.energy = 1;
    }
    if (extra >= 3) {
      cost.connectivity = 1;
    }
    return cost;
  }

  function getExpandOffer(state, q, r, zoneType) {
    var offer = { allowed: false, reason: "", cost: getExpandCost(state) };
    var player = currentPlayer(state);
    if (state.turnPhase !== "build") {
      offer.reason = "Erweitern nur in der Bauphase.";
      return offer;
    }
    if (Nexus.ZONE_TYPE_KEYS.indexOf(zoneType) === -1) {
      offer.reason = "Ungültiger Zonentyp.";
      return offer;
    }
    if (!isExpandableSlot(state, q, r)) {
      offer.reason = "Dieses Feld kann nicht bebaut werden.";
      return offer;
    }
    if (!canAfford(player.resources, offer.cost)) {
      offer.reason = "Nicht genug Ressourcen.";
      return offer;
    }
    offer.allowed = true;
    return offer;
  }

  function buyZone(state, q, r, zoneType) {
    var offer = getExpandOffer(state, q, r, zoneType);
    if (!offer.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var zones = state.zones.concat([
      {
        id: "zone-" + q + "-" + r,
        q: q,
        r: r,
        type: zoneType,
        ownerId: player.id,
        harvested: true, /* erst ab nächster Runde produktiv */
        lastYield: null
      }
    ]);
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, offer.cost)
    });
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    next.log = addLog(
      next,
      player.name,
      "Zone erweitert: " + ZONE_TYPES[zoneType].label + " für " + formatCost(offer.cost) + "."
    );
    return next;
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
      devices: devices,
      risk: 0,
      efficiencyPoints: 0,
      innovationBonus: 0,
      privacyAdjustment: 0,
      greenInnovationCards: 0,
      privacyShieldEvents: 0,
      cumulativeProduction: 0,
      tradeVolume: 0,
      tradePartners: [],
      standardsChoice: null,
      standardStreak: 0,
      standardsBonusVolume: 0,
      blockedTradesCaused: 0,
      saeLevel: 0,
      innovationCardsTotal: 0,
      productionHistory: {},
      hubDiscountPending: false,
      localHardwareDiscountPending: false,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false },
      pendingEvent: null,
      lastProduction: emptyResources(),
      lastGain: null
    };
  }

  function createSetupState() {
    return {
      screen: "setup",
      playerCount: 3,
      gameLengthId: "standard"
    };
  }

  function startGame(playerCount, gameLengthId) {
    var gameLength =
      Nexus.GAME_LENGTHS.filter(function (g) {
        return g.id === gameLengthId;
      })[0] || Nexus.GAME_LENGTHS[1];

    var roleIds = Nexus.assignRoles(playerCount);
    var players = [];
    var zones = [];
    var i;
    for (i = 0; i < playerCount; i++) {
      var id = "p" + (i + 1);
      players.push(createEmptyPlayer(id, "Spieler " + (i + 1), i, roleIds[i]));
      var homePos = Nexus.HOME_POSITIONS[i];
      zones.push({
        id: "home-" + id,
        q: homePos.q,
        r: homePos.r,
        type: "home",
        ownerId: id,
        harvested: false,
        lastYield: null
      });
      Nexus.START_FACTORY_LAYOUT[i].forEach(function (spec) {
        zones.push({
          id: "zone-" + spec.q + "-" + spec.r,
          q: spec.q,
          r: spec.r,
          type: spec.type,
          ownerId: id,
          harvested: false,
          lastYield: null
        });
      });
    }

    return {
      screen: "game",
      round: 1,
      maxRounds: gameLength.rounds,
      gameLengthLabel: gameLength.label,
      currentPlayerIndex: 0,
      turnPhase: "role_reveal",
      roleRevealIndex: 0,
      spinningZoneId: null,
      spinningOutcomes: null,
      players: players,
      zones: zones,
      finalScores: null,
      winnerId: null,
      log: [
        {
          round: 1,
          playerName: null,
          text: "Neues Spiel: " + playerCount + " Spieler, " + gameLength.rounds + " Runden."
        }
      ]
    };
  }

  function acknowledgeRoleReveal(state) {
    if (state.turnPhase !== "role_reveal") {
      return state;
    }
    var nextIndex = state.roleRevealIndex + 1;
    if (nextIndex >= state.players.length) {
      return Object.assign({}, state, {
        turnPhase: "produce",
        roleRevealIndex: state.players.length,
        log: addLog(state, null, state.players[0].name + " beginnt.")
      });
    }
    return Object.assign({}, state, { roleRevealIndex: nextIndex });
  }

  function roleRevealPlayer(state) {
    if (state.turnPhase !== "role_reveal") {
      return null;
    }
    return state.players[state.roleRevealIndex] || null;
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
      turnPhase: "build",
      spinningOutcomes: null,
      spinningZoneId: null
    });
    next.log = addLog(
      next,
      player.name,
      gained ? "Produktion: " + gained + "." : "Produktion ohne Ertrag."
    );

    if (state.round % C.EVENT_EVERY_N_TURNS === 0) {
      var event = pickEventForPlayer(player);
      next = replacePlayer(next, player.id, Object.assign({}, player, { pendingEvent: event }));
      next.turnPhase = "event";
      next.log = addLog(next, player.name, "Ereignis: " + event.title + ".");
    }
    return next;
  }

  function beginHarvestAllSimultaneous(state) {
    var player = currentPlayer(state);
    if (state.turnPhase !== "produce" || !player || state.spinningOutcomes) {
      return state;
    }
    var pending = playerFactoryZones(state, player.id).filter(function (zone) {
      return !zone.harvested;
    });
    var homePending = playerHomeNeedsHarvest(state, player.id);
    if (!pending.length && !homePending) {
      return state;
    }

    var outcomes = [];
    var zones = state.zones.map(function (zone) {
      if (zone.type === "home" && zone.ownerId === player.id && !zone.harvested) {
        var homeYield = homeBaseProduction();
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
            primary: { resource: "energy", amount: C.HOME_BASE_YIELD },
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
      var produced = produceForZoneType(zone.type, modifier);
      outcomes.push({
        zoneId: zone.id,
        dieId: die.id,
        modifier: die.modifier,
        yield: produced,
        staggerIndex: staggerIndex
      });
      return Object.assign({}, zone, { lastYield: produced, lastDieId: die.id });
    });

    return Object.assign({}, state, {
      turnPhase: "spinning",
      spinningOutcomes: outcomes,
      spinningZoneId: null,
      zones: zones
    });
  }

  function completeHarvestAll(state) {
    if (state.turnPhase !== "spinning" || !state.spinningOutcomes || !state.spinningOutcomes.length) {
      return state;
    }
    var player = currentPlayer(state);
    var resources = cloneResources(player.resources);
    var lastProduction = emptyResources();
    var cumulative = player.cumulativeProduction || 0;
    var harvestIds = {};
    var revealDelayByZone = {};
    var firstGain = null;

    state.spinningOutcomes.forEach(function (outcome) {
      harvestIds[outcome.zoneId] = true;
      revealDelayByZone[outcome.zoneId] = outcome.staggerIndex * C.HARVEST_STAGGER_MS;
      if (outcome.isHome && outcome.yield.homeBundle) {
        KEYS.forEach(function (key) {
          var amount = outcome.yield.homeBundle[key] || 0;
          resources[key] += amount;
          lastProduction[key] += amount;
          cumulative += amount;
        });
        if (!firstGain) {
          firstGain = { resource: "energy", amount: C.HOME_BASE_YIELD, zoneId: outcome.zoneId };
        }
        return;
      }
      resources[outcome.yield.primary.resource] += outcome.yield.primary.amount;
      lastProduction[outcome.yield.primary.resource] += outcome.yield.primary.amount;
      cumulative += outcome.yield.primary.amount;
      if (!firstGain) {
        firstGain = {
          resource: outcome.yield.primary.resource,
          amount: outcome.yield.primary.amount,
          zoneId: outcome.zoneId
        };
      }
      if (outcome.yield.secondary) {
        resources[outcome.yield.secondary.resource] += outcome.yield.secondary.amount;
        lastProduction[outcome.yield.secondary.resource] += outcome.yield.secondary.amount;
        cumulative += outcome.yield.secondary.amount;
      }
    });

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
      lastProduction: lastProduction,
      cumulativeProduction: cumulative,
      lastGain: firstGain,
      productionHistory: markProductionHistory(player, state, lastProduction)
    });

    var next = replacePlayer(
      Object.assign({}, state, { zones: zones, spinningOutcomes: null, spinningZoneId: null }),
      player.id,
      nextPlayer
    );
    return advanceAfterAllHarvest(next);
  }

  function harvestAnimationMs(state) {
    var count = state.spinningOutcomes ? state.spinningOutcomes.length : 0;
    if (!count) {
      return 0;
    }
    return C.TILE_SPIN_MS + Math.max(0, count - 1) * C.HARVEST_STAGGER_MS;
  }

  function finalizeGame(state, winnerId, winReason) {
    var finalScores = state.players.map(function (p) {
      var progress = Nexus.computeRoleProgress(state, p);
      return {
        playerId: p.id,
        playerName: p.name,
        roleId: p.roleId,
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
        ? winnerName + " hat 100 % erreicht!"
        : "Fallback nach " + state.maxRounds + " Runden.";
    return Object.assign({}, state, {
      turnPhase: "gameover",
      winnerId: winnerId,
      winReason: winReason,
      finalScores: finalScores,
      log: addLog(state, null, reasonText)
    });
  }

  function checkInstantWinAtRoundEnd(state) {
    var winner = null;
    state.players.forEach(function (p) {
      var progress = Nexus.computeRoleProgress(state, p);
      if (progress.totalPercent >= 100) {
        winner = p;
      }
    });
    if (winner) {
      return finalizeGame(state, winner.id, "instant");
    }
    return null;
  }

  function resolveFallbackWinner(state) {
    var best = -1;
    var winnerId = state.players[0].id;
    state.players.forEach(function (p) {
      var pct = Nexus.computeRoleProgress(state, p).totalPercent;
      if (pct > best) {
        best = pct;
        winnerId = p.id;
      }
    });
    return finalizeGame(state, winnerId, "fallback");
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

    var effects = choice.effects || {};
    var spend = effects.spend || {};
    if (!canAfford(player.resources, spend)) {
      return state;
    }

    var resources = subtractCost(player.resources, spend);
    if (choice.needsResourcePick) {
      resources[extra.resource] += choice.pickAmount;
    }

    var risk = player.risk + (effects.risk || 0);
    if (risk < 0) {
      risk = 0;
    }

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      risk: risk,
      efficiencyPoints: player.efficiencyPoints + (effects.efficiency || 0),
      innovationBonus: player.innovationBonus + (effects.innovation || 0),
      privacyAdjustment: player.privacyAdjustment + (effects.privacy || 0),
      greenInnovationCards: player.greenInnovationCards + (effects.greenInnovation || 0),
      privacyShieldEvents: player.privacyShieldEvents + (effects.privacyShield ? 1 : 0),
      innovationCardsTotal:
        (player.innovationCardsTotal || 0) +
        (effects.greenInnovation || 0) +
        (effects.innovationCard || 0),
      localHardwareDiscountPending: effects.localHardwareDiscount
        ? true
        : player.localHardwareDiscountPending,
      roundModifiers: {
        cloudDisabled: !!(player.roundModifiers.cloudDisabled || effects.cloudDisabled),
        cloudHalfEffect: !!(player.roundModifiers.cloudHalfEffect || effects.cloudHalfEffect)
      },
      pendingEvent: null
    });

    var next = replacePlayer(state, player.id, nextPlayer);
    next.turnPhase = "build";

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
    return next;
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
    return canAfford(player.resources, (choice.effects && choice.effects.spend) || {});
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

    var risk = player.risk;
    var innovationBonus = player.innovationBonus;
    if (isNewBuild && deviceId === "charger") {
      innovationBonus += C.CHARGER_INNOVATION_BONUS;
    }
    if (isNewBuild && deviceId === "lock") {
      risk = Math.max(0, risk - C.LOCK_RISK_REDUCTION);
    }

    var innovationCardsTotal = player.innovationCardsTotal || 0;
    if (isNewBuild && deviceId === "charger") {
      innovationCardsTotal += 1;
    }

    var hubDiscountPending = player.hubDiscountPending;
    if (offer.usedHubDiscount) {
      hubDiscountPending = false;
    }
    if (isNewBuild && deviceId === "hub") {
      hubDiscountPending = true;
    }

    var localHardwareDiscountPending = player.localHardwareDiscountPending;
    if (offer.usedLocalHardwareDiscount) {
      localHardwareDiscountPending = false;
    }

    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, offer.cost),
      devices: devices,
      risk: risk,
      innovationBonus: innovationBonus,
      innovationCardsTotal: innovationCardsTotal,
      hubDiscountPending: hubDiscountPending,
      localHardwareDiscountPending: localHardwareDiscountPending
    });

    var next = replacePlayer(state, player.id, nextPlayer);
    next.log = addLog(
      next,
      player.name,
      device.shortName + (offer.isUpgrade ? " lokal" : " " + mode) + "."
    );
    return next;
  }

  function applyOngoingEffects(player) {
    var modifiers = player.roundModifiers;
    var baseSave = 0;
    var dataGain = 0;
    var addedRisk = 0;
    var hemsMode = player.devices.hems;

    Nexus.DEVICES.forEach(function (device) {
      var mode = player.devices[device.id];
      if (!mode) {
        return;
      }
      if (mode === "cloud") {
        addedRisk += device.cloudRiskPerRound;
      }
      if (device.id === "hems") {
        return;
      }
      var factor = effectFactor(mode, modifiers);
      baseSave += (device.energySave || 0) * factor;
      dataGain += (device.dataGain || 0) * factor;
      if (device.efficiencyPerRound && mode) {
        /* peak_load handled below */
      }
    });

    var peakMode = player.devices.peak_load;
    var efficiencyGain = 0;
    if (peakMode) {
      efficiencyGain +=
        (Nexus.DEVICES_BY_ID.peak_load.efficiencyPerRound || 0) * effectFactor(peakMode, modifiers);
    }

    var hemsFactor = hemsMode ? effectFactor(hemsMode, modifiers) : 0;
    var energySave = baseSave * (1 + hemsFactor);
    var energyGranted = Math.floor(energySave);
    var dataGranted = Math.floor(dataGain);

    var resources = cloneResources(player.resources);
    resources.energy += energyGranted;
    resources.data += dataGranted;

    var parts = [];
    if (energySave > 0) {
      parts.push("Spar " + energySave + " Energie");
    }
    if (dataGranted > 0) {
      parts.push("+" + dataGranted + " Daten");
    }
    if (addedRisk > 0) {
      parts.push("Risiko +" + addedRisk);
    }
    if (parts.length === 0) {
      parts.push("keine Geräteeffekte");
    }

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      risk: player.risk + addedRisk,
      efficiencyPoints: player.efficiencyPoints + energySave + efficiencyGain,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false }
    });

    return { player: nextPlayer, logText: "Zugende: " + parts.join(", ") + "." };
  }

  function computeScore(player) {
    var efficiency = player.efficiencyPoints;
    var privacy = Math.max(0, C.PRIVACY_BASE - player.risk + player.privacyAdjustment);
    var innovation = player.innovationBonus;
    Nexus.DEVICES.forEach(function (device) {
      if (player.devices[device.id]) {
        innovation += device.id === "hems" ? C.HEMS_INNOVATION : C.DEVICE_INNOVATION;
      }
    });
    return {
      efficiency: efficiency,
      privacy: privacy,
      innovation: innovation,
      total: efficiency + privacy + innovation,
      risk: player.risk
    };
  }

  function endTurn(state) {
    if (state.turnPhase !== "build") {
      return state;
    }
    var player = currentPlayer(state);
    var result = applyOngoingEffects(player);
    var next = replacePlayer(state, player.id, result.player);
    next.log = addLog(next, player.name, result.logText);

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
      next.turnPhase = "produce";
      next.zones = next.zones.map(function (zone) {
        return Object.assign({}, zone, { harvested: false, lastYield: null, lastDieId: null });
      });
      next.players = next.players.map(function (p) {
        return updateStandardStreak(p, state.round + 1);
      });
      next.log = addLog(next, null, "Runde " + newRound + " beginnt. " + next.players[0].name + " ist am Zug.");
    } else {
      next.currentPlayerIndex = nextIndex;
      next.turnPhase = "produce";
      next.log = addLog(next, null, next.players[nextIndex].name + " ist am Zug.");
    }
    return next;
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
    if (!fromPlayer.standardsChoice || !toPlayer.standardsChoice) {
      return { allowed: false, reason: "Beide Spieler brauchen eine Standards-Wahl." };
    }
    if (fromPlayer.standardsChoice === "open" && toPlayer.standardsChoice === "open") {
      return { allowed: true, reason: "" };
    }
    if (
      fromPlayer.standardsChoice === "proprietary" &&
      toPlayer.standardsChoice === "proprietary"
    ) {
      return { allowed: true, reason: "" };
    }
    return {
      allowed: false,
      reason: "Unterschiedliche Standards blockieren den Handel."
    };
  }

  function tradeGiveAmount(baseAmount, isPremium) {
    if (!isPremium) {
      return baseAmount;
    }
    return baseAmount * 2;
  }

  function getTradeOffer(state, partnerId, giveKey, giveAmount, wantKey, wantAmount) {
    var offer = { allowed: false, reason: "", giveCost: giveAmount, wantGain: wantAmount };
    var player = currentPlayer(state);
    var partner = state.players.filter(function (p) {
      return p.id === partnerId;
    })[0];
    if (state.turnPhase !== "build") {
      offer.reason = "Handel nur in der Bauphase.";
      return offer;
    }
    if (!partner || partner.id === player.id) {
      offer.reason = "Ungültiger Handelspartner.";
      return offer;
    }
    var compatibility = canTradeWith(player, partner);
    if (!compatibility.allowed) {
      offer.reason = compatibility.reason;
      return offer;
    }
    if (giveAmount <= 0 || wantAmount <= 0) {
      offer.reason = "Menge muss größer als 0 sein.";
      return offer;
    }
    var givePremium = !hasRecentProduction(player, giveKey, state.round);
    var wantPremium = !hasRecentProduction(partner, wantKey, state.round);
    offer.giveCost = tradeGiveAmount(giveAmount, givePremium);
    offer.wantGain = wantAmount;
    if (player.standardsChoice === "open" && partner.standardsChoice === "open" && givePremium) {
      offer.giveCost = Math.max(wantAmount, offer.giveCost - C.OPEN_STANDARD_DISCOUNT);
    }
    var spend = {};
    spend[giveKey] = offer.giveCost;
    if (!canAfford(player.resources, spend)) {
      offer.reason = "Nicht genug " + Nexus.RESOURCE_SHORT[giveKey] + ".";
      return offer;
    }
    if ((partner.resources[wantKey] || 0) < wantAmount) {
      offer.reason = partner.name + " hat nicht genug " + Nexus.RESOURCE_SHORT[wantKey] + ".";
      return offer;
    }
    offer.allowed = true;
    offer.giveKey = giveKey;
    offer.wantKey = wantKey;
    return offer;
  }

  function executeTrade(state, partnerId, giveKey, giveAmount, wantKey, wantAmount) {
    var offer = getTradeOffer(state, partnerId, giveKey, giveAmount, wantKey, wantAmount);
    if (!offer.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var partner = state.players.filter(function (p) {
      return p.id === partnerId;
    })[0];
    var playerResources = subtractCost(player.resources, (function () {
      var spend = {};
      spend[giveKey] = offer.giveCost;
      return spend;
    })());
    playerResources[wantKey] = (playerResources[wantKey] || 0) + offer.wantGain;
    var partnerResources = subtractCost(partner.resources, (function () {
      var spend = {};
      spend[wantKey] = wantAmount;
      return spend;
    })());
    partnerResources[giveKey] = (partnerResources[giveKey] || 0) + offer.giveCost;

    var playerPartners = (player.tradePartners || []).slice();
    if (playerPartners.indexOf(partner.id) === -1) {
      playerPartners.push(partner.id);
    }
    var partnerPartners = (partner.tradePartners || []).slice();
    if (partnerPartners.indexOf(player.id) === -1) {
      partnerPartners.push(player.id);
    }

    var bonusVolume = 0;
    if (player.standardsChoice === "open" && partner.standardsChoice === "open") {
      bonusVolume = offer.giveCost + wantAmount;
    }

    var nextPlayer = Object.assign({}, player, {
      resources: playerResources,
      tradeVolume: (player.tradeVolume || 0) + offer.giveCost + offer.wantGain,
      tradePartners: playerPartners,
      standardsBonusVolume: (player.standardsBonusVolume || 0) + bonusVolume
    });
    var nextPartner = Object.assign({}, partner, {
      resources: partnerResources,
      tradeVolume: (partner.tradeVolume || 0) + offer.giveCost + wantAmount,
      tradePartners: partnerPartners,
      standardsBonusVolume: (partner.standardsBonusVolume || 0) + bonusVolume
    });

    var next = replacePlayer(state, player.id, nextPlayer);
    next = replacePlayer(next, partner.id, nextPartner);
    next.log = addLog(
      next,
      player.name,
      "Handel mit " +
        partner.name +
        ": " +
        offer.giveCost +
        " " +
        Nexus.RESOURCE_SHORT[giveKey] +
        " ↔ " +
        wantAmount +
        " " +
        Nexus.RESOURCE_SHORT[wantKey] +
        "."
    );
    return next;
  }

  function setStandardsChoice(state, choice) {
    if (state.turnPhase !== "build") {
      return state;
    }
    if (choice !== "open" && choice !== "proprietary") {
      return state;
    }
    var player = currentPlayer(state);
    if (player.standardsChoice === choice) {
      return state;
    }
    var nextPlayer = Object.assign({}, player, {
      standardsChoice: choice,
      standardStreak: 0
    });
    var next = replacePlayer(state, player.id, nextPlayer);
    next.log = addLog(
      next,
      player.name,
      choice === "open" ? "Offener Standard gewählt." : "Proprietäres System gewählt."
    );
    return next;
  }

  function getSaeUpgradeCost(level) {
    return {
      connectivity: 1 + level,
      compute: 1,
      hardware: 1 + Math.floor(level / 2)
    };
  }

  function canUpgradeSae(state) {
    var player = currentPlayer(state);
    if (state.turnPhase !== "build" || !player) {
      return false;
    }
    if ((player.saeLevel || 0) >= C.SAE_MAX_LEVEL) {
      return false;
    }
    if (!player.devices.v2x && !player.devices.charging_network) {
      return false;
    }
    return canAfford(player.resources, getSaeUpgradeCost(player.saeLevel || 0));
  }

  function upgradeSae(state) {
    var player = currentPlayer(state);
    if (!canUpgradeSae(state)) {
      return state;
    }
    var level = player.saeLevel || 0;
    var cost = getSaeUpgradeCost(level);
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, cost),
      saeLevel: level + 1
    });
    var next = replacePlayer(state, player.id, nextPlayer);
    next.log = addLog(next, player.name, "SAE-Level " + (level + 1) + " erreicht.");
    return next;
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
      var typeDef = ZONE_TYPES[zone.type];
      if (!typeDef) {
        return;
      }
      counts[typeDef.primary].total += 1;
      if (zone.ownerId === playerId) {
        counts[typeDef.primary].owned += 1;
      }
      if (typeDef.secondary) {
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

  function canEndTurn(state) {
    return state.turnPhase === "build";
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

  Nexus.createSetupState = createSetupState;
  Nexus.startGame = startGame;
  Nexus.acknowledgeRoleReveal = acknowledgeRoleReveal;
  Nexus.roleRevealPlayer = roleRevealPlayer;
  Nexus.currentPlayer = currentPlayer;
  Nexus.playerZones = playerZones;
  Nexus.playerFactoryZones = playerFactoryZones;
  Nexus.setStandardsChoice = setStandardsChoice;
  Nexus.getTradeOffer = getTradeOffer;
  Nexus.executeTrade = executeTrade;
  Nexus.canUpgradeSae = canUpgradeSae;
  Nexus.upgradeSae = upgradeSae;
  Nexus.getSaeUpgradeCost = getSaeUpgradeCost;
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
  Nexus.getExpandOffer = getExpandOffer;
  Nexus.getExpandCost = getExpandCost;
  Nexus.isExpandableSlot = isExpandableSlot;
  Nexus.zoneAt = zoneAt;
  Nexus.expectedYieldForBase = expectedYieldForBase;
  Nexus.expectedByResource = expectedByResource;
  Nexus.endTurn = endTurn;
  Nexus.canEndTurn = canEndTurn;
  Nexus.canBuyDevice = canBuyDevice;
  Nexus.computeScore = computeScore;
  Nexus.canAfford = canAfford;
  Nexus.formatCost = formatCost;
})(window.Nexus);
