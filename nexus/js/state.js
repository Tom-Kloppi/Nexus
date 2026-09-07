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
    if (effects.efficiency) {
      parts.push("+" + effects.efficiency + " Effizienz");
    }
    if (effects.privacy) {
      parts.push((effects.privacy > 0 ? "+" : "") + effects.privacy + " Datenschutz");
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
    return shuffleCopy(
      Nexus.INNOVATION_CARDS.map(function (card) {
        return card.id;
      })
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

  function drawInnovationFromDeck(state, preferredCategory) {
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
    if (preferredCategory) {
      for (i = 0; i < deck.length; i++) {
        if (Nexus.INNOVATION_CARDS_BY_ID[deck[i]].category === preferredCategory) {
          idx = i;
          break;
        }
      }
    }
    var id = deck.splice(idx, 1)[0];
    discard.push(id);
    return {
      card: Nexus.INNOVATION_CARDS_BY_ID[id],
      innovationDeck: deck,
      innovationDiscard: discard
    };
  }

  function makeHandCard(card) {
    return {
      id: card.id,
      name: card.name,
      category: card.category,
      text: card.text,
      effects: card.effects || {}
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
    KEYS.forEach(function (key) {
      if (effects[key]) {
        resources[key] += effects[key];
      }
    });
    return Object.assign({}, player, {
      resources: resources,
      efficiencyPoints: player.efficiencyPoints + (effects.efficiency || 0),
      privacyAdjustment: player.privacyAdjustment + (effects.privacy || 0)
    });
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
    next.log = addLog(
      next,
      player.name,
      "Innovationskarte automatisch: " + granted.cards[0].name + "."
    );
    return next;
  }

  function enterBuildPhase(state) {
    return maybeAutoDrawInnovation(Object.assign({}, state, { turnPhase: "build" }));
  }

  function playInnovationCard(state, index) {
    if (state.turnPhase !== "build") {
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
    var card = hand.splice(index, 1)[0];
    var nextPlayer = Object.assign({}, applyCardEffects(player, card), {
      handCards: hand,
      playedCards: (player.playedCards || []).concat([card])
    });
    return Object.assign({}, replacePlayer(state, player.id, nextPlayer), {
      log: addLog(state, player.name, "Innovationskarte ausgespielt: " + card.name + ".")
    });
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
    expected.connectivity -= cloudUpkeepCost(player);
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

  function canAffordExpandSlot(state, q, r) {
    if (!isExpandableSlot(state, q, r) || state.turnPhase !== "build") {
      return false;
    }
    return Nexus.ZONE_TYPE_KEYS.some(function (key) {
      return getExpandOffer(state, q, r, key).allowed;
    });
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
    var usedCoupon = Object.keys(offer.cost).length === 0 && (player.freeZoneClaims || 0) > 0;
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, offer.cost),
      freeZoneClaims: usedCoupon ? player.freeZoneClaims - 1 : player.freeZoneClaims || 0
    });
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    next.log = addLog(
      next,
      player.name,
      usedCoupon
        ? "Startfeld gewählt: " + ZONE_TYPES[zoneType].label + "."
        : "Zone erweitert: " + ZONE_TYPES[zoneType].label + " für " + formatCost(offer.cost) + "."
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
      standardsChoice: "open",
      standardStreak: 0,
      standardsBonusVolume: 0,
      blockedTradesCaused: 0,
      blockedTradeKeysThisTurn: [],
      saeLevel: 0,
      innovationCardsTotal: 0,
      handCards: [],
      playedCards: [],
      drewInnovationThisTurn: false,
      freeZoneClaims: 1,
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
      eventDeck: buildEventDeck(),
      eventDiscard: [],
      innovationDeck: buildInnovationDeck(),
      innovationDiscard: [],
      players: players,
      zones: zones,
      finalScores: null,
      winnerId: null,
      log: [
        {
          round: 1,
          playerName: null,
          text: "Neues Spiel: " + playerCount + " Spieler, " + gameLength.rounds + " Runden. Jeder hat einen Startcoupon für ein kostenloses Feld."
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

  function isHotSeatShield(state) {
    return state.turnPhase === "role_reveal" || state.turnPhase === "handoff";
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
        spinningOutcomes: null,
        spinningZoneId: null
      });
    }
    var next = replacePlayer(
      Object.assign({}, state, { spinningOutcomes: null, spinningZoneId: null }),
      player.id,
      Object.assign({}, player, { lastProduction: emptyResources(), lastGain: null })
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
      spinningOutcomes: null,
      spinningZoneId: null
    });
    next.log = addLog(
      next,
      player.name,
      gained ? "Produktion: " + gained + "." : "Produktion ohne Ertrag."
    );

    if (state.round % C.EVENT_EVERY_N_TURNS === 0) {
      var drawnEvent = pickEventForPlayer(next, player);
      next.eventDeck = drawnEvent.eventDeck;
      next.eventDiscard = drawnEvent.eventDiscard;
      if (drawnEvent.event) {
        next = replacePlayer(next, player.id, Object.assign({}, player, { pendingEvent: drawnEvent.event }));
        next.turnPhase = "event";
        next.log = addLog(next, player.name, "Ereignis: " + drawnEvent.event.title + ".");
        return next;
      }
    }
    return enterBuildPhase(next);
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
      return skipEmptyProduce(state);
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
      if (!produced) {
        return zone;
      }
      outcomes.push({
        zoneId: zone.id,
        dieId: die.id,
        modifier: die.modifier,
        yield: produced,
        staggerIndex: staggerIndex
      });
      return Object.assign({}, zone, { lastYield: produced, lastDieId: die.id });
    });

    if (!outcomes.length) {
      return skipEmptyProduce(state);
    }

    return Object.assign({}, state, {
      turnPhase: "spinning",
      spinningOutcomes: outcomes,
      spinningZoneId: null,
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
    var lastProduction = emptyResources();
    var cumulative = player.cumulativeProduction || 0;
    var harvestIds = {};
    var revealDelayByZone = {};
    var firstGain = null;

    state.spinningOutcomes.forEach(function (outcome) {
      harvestIds[outcome.zoneId] = true;
      revealDelayByZone[outcome.zoneId] = outcome.staggerIndex * C.HARVEST_STAGGER_MS;
      if (outcome.isHome) {
        var bundle = outcome.yield && outcome.yield.homeBundle;
        if (!bundle) {
          return;
        }
        KEYS.forEach(function (key) {
          var amount = bundle[key] || 0;
          resources[key] += amount;
          lastProduction[key] += amount;
          cumulative += amount;
        });
        if (!firstGain) {
          firstGain = { resource: "energy", amount: C.HOME_BASE_YIELD, zoneId: outcome.zoneId };
        }
        return;
      }
      if (!outcome.yield || !outcome.yield.primary) {
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
    var hadBoom = state.spinningOutcomes.some(function (outcome) {
      return outcome.dieId === "boom";
    });
    if (hadBoom) {
      var boomGrant = grantInnovationCards(next, nextPlayer, 1, "green");
      next = replacePlayer(boomGrant.state, player.id, boomGrant.player);
      if (boomGrant.cards[0]) {
        next.log = addLog(
          next,
          player.name,
          "Boom: Innovationskarte „" + boomGrant.cards[0].name + "“."
        );
      }
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
    KEYS.forEach(function (key) {
      if (effects[key]) {
        resources[key] += effects[key];
      }
    });

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
      privacyShieldEvents: player.privacyShieldEvents + (effects.privacyShield ? 1 : 0),
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
    var greenDraws = effects.greenInnovation || 0;
    var anyDraws = effects.innovationCard || 0;
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
    var upkeep = cloudUpkeepCost(player);
    var cloudOnline = upkeep === 0 || canAfford(player.resources, { connectivity: upkeep });
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
      if (mode === "cloud" && !cloudOnline) {
        factor = 0;
      }
      baseSave += (device.energySave || 0) * factor;
      dataGain += (device.dataGain || 0) * factor;
    });

    var peakMode = player.devices.peak_load;
    var efficiencyGain = 0;
    if (peakMode) {
      var peakFactor = effectFactor(peakMode, modifiers);
      if (peakMode === "cloud" && !cloudOnline) {
        peakFactor = 0;
      }
      efficiencyGain += (Nexus.DEVICES_BY_ID.peak_load.efficiencyPerRound || 0) * peakFactor;
    }

    var hemsFactor = 0;
    if (hemsMode) {
      hemsFactor = effectFactor(hemsMode, modifiers);
      if (hemsMode === "cloud" && !cloudOnline) {
        hemsFactor = 0;
      }
    }
    var energySave = baseSave * (1 + hemsFactor);
    var energyGranted = Math.floor(energySave);
    var dataGranted = Math.floor(dataGain);

    var resources = cloneResources(player.resources);
    if (cloudOnline && upkeep > 0) {
      resources.connectivity -= upkeep;
    }
    resources.energy += energyGranted;
    resources.data += dataGranted;

    var parts = [];
    if (upkeep > 0 && cloudOnline) {
      parts.push("Cloud −" + upkeep + " Konnekt.");
    } else if (upkeep > 0) {
      parts.push("Cloud offline (Konnekt. fehlt)");
    }
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
    var endedPlayer = Object.assign({}, result.player, {
      drewInnovationThisTurn: false,
      blockedTradeKeysThisTurn: []
    });
    var next = replacePlayer(state, player.id, endedPlayer);
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
      next.turnPhase = "handoff";
      next.zones = next.zones.map(function (zone) {
        return Object.assign({}, zone, { harvested: false, lastYield: null, lastDieId: null });
      });
      next.players = next.players.map(function (p) {
        return updateStandardStreak(p, state.round + 1);
      });
      next.log = addLog(next, null, "Runde " + newRound + " beginnt. Gerät an " + next.players[0].name + " weitergeben.");
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
    return Object.assign({}, state, {
      turnPhase: "produce",
      log: addLog(state, player ? player.name : null, "übernimmt.")
    });
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
    Nexus.DEVICES.forEach(function (device) {
      var mode = player.devices[device.id];
      if (mode === "cloud") {
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
      standardsChoice: player.standardsChoice,
      saeLevel: player.saeLevel || 0,
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
    next.log = addLog(next, player.name, "Innovationskarte gezogen: " + granted.cards[0].name + ".");
    return next;
  }

  function canEndTurn(state) {
    var player = currentPlayer(state);
    if (state.turnPhase !== "build" || !player) {
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

  Nexus.createSetupState = createSetupState;
  Nexus.startGame = startGame;
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
  Nexus.canAffordExpandSlot = canAffordExpandSlot;
  Nexus.zoneAt = zoneAt;
  Nexus.expectedYieldForBase = expectedYieldForBase;
  Nexus.expectedByResource = expectedByResource;
  Nexus.endTurn = endTurn;
  Nexus.canEndTurn = canEndTurn;
  Nexus.canBuyDevice = canBuyDevice;
  Nexus.getInnovationDrawOffer = getInnovationDrawOffer;
  Nexus.drawInnovationCard = drawInnovationCard;
  Nexus.playInnovationCard = playInnovationCard;
  Nexus.computeScore = computeScore;
  Nexus.canAfford = canAfford;
  Nexus.formatCost = formatCost;
  Nexus.formatEffects = formatEffects;
  Nexus.cloudUpkeepCost = cloudUpkeepCost;
})(window.Nexus);
