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
    cost = normalizeCost(cost);
    return KEYS.every(function (key) {
      return (resources[key] || 0) >= (cost[key] || 0);
    });
  }

  function subtractCost(resources, cost) {
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

  function defaultVariantFor(zoneType) {
    if (zoneType === "energy") {
      return "solar";
    }
    if (zoneType === "datacenter") {
      return "insecure";
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
    return null;
  }

  function resolveZoneYieldDef(zone) {
    var typeDef = ZONE_TYPES[zone.type];
    if (!typeDef) {
      return null;
    }
    var variant = zone.variant || defaultVariantFor(zone.type);
    var variantDef = variantDefFor(zone.type, variant);
    if (variantDef) {
      return Object.assign({}, typeDef, variantDef, { variant: variant });
    }
    return Object.assign({}, typeDef, { variant: variant });
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

  function zoneUpgradeLevel(zone) {
    if (!zone) {
      return 0;
    }
    var level = zone.upgradeLevel || 0;
    var max = C.ZONE_UPGRADE_MAX || 2;
    if (level < 0) {
      return 0;
    }
    return level > max ? max : level;
  }

  function zonePrimaryBase(zone) {
    var def = resolveZoneYieldDef(zone);
    if (!def || !def.primary) {
      return 0;
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
    var mapped = normalizeCost(effects);
    KEYS.forEach(function (key) {
      if (mapped[key]) {
        resources[key] += mapped[key];
      }
    });
    var scores = bumpScores(player.scores, effects);
    return Object.assign({}, player, {
      resources: resources,
      scores: scores,
      risk: Math.max(0, player.risk + (effects.risk || 0))
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

  function produceForZone(zone, modifier, player, state) {
    if (zone.type === "home") {
      return null;
    }
    var def = resolveZoneYieldDef(zone);
    if (!def || !def.primary) {
      return null;
    }
    var base = zonePrimaryBase(zone);
    var amount;
    var moneySpent = 0;
    if (zone.type === "energy" && def.stable) {
      amount = base;
      moneySpent = amount * (C.TRANSFORMER_MONEY_PER_ENERGY || 1);
      if ((player.resources.money || 0) < moneySpent) {
        amount = 0;
        moneySpent = 0;
      }
    } else if (zone.type === "residential") {
      amount = playerHasZoneType(state, player.id, "datacenter")
        ? yieldAmount(base, modifier)
        : 0;
    } else {
      amount = yieldAmount(base, modifier);
    }
    var result = {
      primary: { resource: def.primary, amount: amount },
      moneySpent: moneySpent,
      scoreHint: def.scoreHint || null,
      riskDelta: def.risk ? 1 : 0
    };
    if (def.secondary) {
      result.secondary = {
        resource: def.secondary,
        amount: yieldAmount(def.secondaryBase, modifier)
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
    var hasDc = playerHasZoneType(state, player.id, "datacenter");
    playerFactoryZones(state, player.id).forEach(function (zone) {
      var def = resolveZoneYieldDef(zone);
      if (!def || !def.primary) {
        return;
      }
      var base = zonePrimaryBase(zone);
      if (zone.type === "residential" && !hasDc) {
        return;
      }
      if (zone.type === "energy" && def.stable) {
        expected[def.primary] += base;
        expected.money -= base * (C.TRANSFORMER_MONEY_PER_ENERGY || 1);
        return;
      }
      expected[def.primary] += expectedYieldForBase(base);
      if (def.secondary) {
        expected[def.secondary] += expectedYieldForBase(def.secondaryBase);
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
    var cost = { money: 2 + extra };
    if (extra >= 1) {
      cost.energy = 1;
    }
    if (extra >= 3) {
      cost.bandwidth = 1;
    }
    return cost;
  }

  function getExpandOffer(state, q, r, zoneType, variant) {
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
    var typeDef = ZONE_TYPES[zoneType];
    if (typeDef && typeDef.variants && typeDef.variants.length) {
      variant = variant || defaultVariantFor(zoneType);
      if (typeDef.variants.indexOf(variant) === -1) {
        offer.reason = "Ungültige Variante.";
        return offer;
      }
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
    offer.variant = variant || null;
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

  function buyZone(state, q, r, zoneType, variant) {
    var offer = getExpandOffer(state, q, r, zoneType, variant);
    if (!offer.allowed) {
      return state;
    }
    var player = currentPlayer(state);
    var resolvedVariant = offer.variant;
    var variantDef = variantDefFor(zoneType, resolvedVariant);
    var scores = cloneScores(player.scores);
    var risk = player.risk || 0;
    if (variantDef) {
      if (variantDef.scoreHint) {
        scores = bumpScores(scores, variantDef.scoreHint);
      }
      if (variantDef.riskOnBuild) {
        risk += variantDef.riskOnBuild;
      }
    }
    if (zoneType === "traffic") {
      scores = bumpScores(scores, { comfort: 1 });
    }
    var zones = state.zones.concat([
      {
        id: "zone-" + q + "-" + r,
        q: q,
        r: r,
        type: zoneType,
        variant: resolvedVariant,
        ownerId: player.id,
        upgradeLevel: 0,
        harvested: true, /* erst ab nächster Runde produktiv */
        lastYield: null
      }
    ]);
    var usedCoupon = Object.keys(offer.cost).length === 0 && (player.freeZoneClaims || 0) > 0;
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, offer.cost),
      freeZoneClaims: usedCoupon ? player.freeZoneClaims - 1 : player.freeZoneClaims || 0,
      scores: scores,
      risk: risk
    });
    var label = ZONE_TYPES[zoneType].label;
    if (variantDef && variantDef.label) {
      label += " (" + variantDef.label + ")";
    }
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    next.log = addLog(
      next,
      player.name,
      usedCoupon
        ? "Startfeld gewählt: " + label + "."
        : "Zone erweitert: " + label + " für " + formatCost(offer.cost) + "."
    );
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
    if (variantDef && variantDef.riskOnBuild) {
      riskOnBuild = variantDef.riskOnBuild;
    }
    if (zoneType === "traffic") {
      onBuild = bumpScores(onBuild, { comfort: 1 });
    }
    var production = null;
    if (yieldDef && yieldDef.primary) {
      production = {
        resource: yieldDef.primary,
        amount: yieldDef.primaryBase || 0,
        dice: !!yieldDef.dice,
        stable: !!yieldDef.stable,
        moneyPerEnergy: yieldDef.stable ? C.TRANSFORMER_MONEY_PER_ENERGY || 1 : 0
      };
    }
    var flags = {
      residentialNeedsDc: false,
      transformerUpkeep: false,
      solarDice: false,
      dcUnlocksBandwidth: false,
      insecureRisk: false,
      trafficInfrastructure: false,
      producesNextRound: true
    };
    if (zoneType === "residential") {
      var player = currentPlayer(state);
      flags.residentialNeedsDc = !(player && playerHasZoneType(state, player.id, "datacenter"));
    }
    if (production && production.stable) {
      flags.transformerUpkeep = true;
    }
    if (production && production.dice) {
      flags.solarDice = true;
    }
    if (zoneType === "datacenter") {
      flags.dcUnlocksBandwidth = true;
      if (resolvedVariant === "insecure" && riskOnBuild) {
        flags.insecureRisk = true;
      }
    }
    if (zoneType === "traffic") {
      flags.trafficInfrastructure = true;
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
    return {
      type: zoneType,
      variant: resolvedVariant || null,
      label: label,
      cost: getExpandCost(state),
      production: production,
      onBuild: onBuild,
      riskOnBuild: riskOnBuild,
      flags: flags,
      devices: devices
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
    if (preview.fromLevel >= (C.ZONE_UPGRADE_MAX || 2)) {
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
    if (zone.type === "residential") {
      preview.flags.residentialNeedsDc = !playerHasZoneType(state, player.id, "datacenter");
    }
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
      if (zone.type === "residential") {
        preview.flags.residentialNeedsDc = true;
      }
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
    var zones = state.zones.filter(function (zone) {
      return zone.id !== zoneId;
    });
    var resources = cloneResources(player.resources);
    resources.money = (resources.money || 0) + (preview.refund.money || 0);
    var nextPlayer = Object.assign({}, player, { resources: resources });
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
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
    var hasDc = playerHasZoneType(state, player.id, "datacenter");
    if (lowest === "energy") {
      return { type: "energy", variant: "solar", reasonKey: "low_energy", resource: "energy" };
    }
    if (lowest === "money") {
      return { type: "traffic", variant: null, reasonKey: "low_money", resource: "money" };
    }
    if (!hasDc) {
      return { type: "datacenter", variant: "secure", reasonKey: "need_dc", resource: "bandwidth" };
    }
    return { type: "residential", variant: null, reasonKey: "low_bandwidth", resource: "bandwidth" };
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
      lastProduction: emptyResources()
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
    playerCount = Math.max(C.MIN_PLAYERS, Math.min(C.MAX_PLAYERS, Number(playerCount) || C.MAX_PLAYERS));
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
        upgradeLevel: 0,
        harvested: false,
        lastYield: null
      });
    }

    return {
      screen: "game",
      round: 1,
      maxRounds: gameLength.rounds || C.MAX_ROUNDS,
      gameLengthLabel: gameLength.label,
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
        spinningOutcomes: null
      });
    }
    var next = replacePlayer(
      Object.assign({}, state, { spinningOutcomes: null }),
      player.id,
      Object.assign({}, player, { lastProduction: emptyResources() })
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
    var cumulative = player.cumulativeProduction || 0;
    var cumulativeMoney = player.cumulativeMoneyProduction || 0;
    var harvestIds = {};
    var revealDelayByZone = {};
    var boomDraws = 0;

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
          if (key === "money") {
            cumulativeMoney += amount;
          }
        });
        return;
      }
      if (!outcome.yield || !outcome.yield.primary) {
        return;
      }
      if (outcome.yield.moneySpent) {
        resources.money = Math.max(0, resources.money - outcome.yield.moneySpent);
      }
      resources[outcome.yield.primary.resource] =
        (resources[outcome.yield.primary.resource] || 0) + outcome.yield.primary.amount;
      lastProduction[outcome.yield.primary.resource] =
        (lastProduction[outcome.yield.primary.resource] || 0) + outcome.yield.primary.amount;
      cumulative += outcome.yield.primary.amount;
      if (outcome.yield.primary.resource === "money") {
        cumulativeMoney += outcome.yield.primary.amount;
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
      }
      if (outcome.yield.scoreHint) {
        scores = bumpScores(scores, outcome.yield.scoreHint);
      }
      if (outcome.yield.riskDelta) {
        risk += outcome.yield.riskDelta;
      }
      if (outcome.dieId === "boom") {
        boomDraws += 1;
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
      scores: scores,
      risk: risk,
      lastProduction: lastProduction,
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
    var best = 0;
    state.players.forEach(function (p) {
      var pct = Nexus.computeRoleProgress(state, p).totalPercent;
      if (pct >= 100 && (winner === null || pct > best)) {
        best = pct;
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
    var mappedGain = normalizeCost(effects);
    KEYS.forEach(function (key) {
      if (mappedGain[key]) {
        resources[key] += mappedGain[key];
      }
    });

    var risk = player.risk + (effects.risk || 0);
    if (risk < 0) {
      risk = 0;
    }

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      scores: bumpScores(player.scores, effects),
      risk: risk,
      privacyShieldEvents: player.privacyShieldEvents + (effects.privacyShield ? 1 : 0),
      localHardwareDiscountPending:
        effects.localHardwareDiscount || effects.localMoneyDiscount
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
    if (isNewBuild && deviceId === "lock") {
      risk = Math.max(0, risk - C.LOCK_RISK_REDUCTION);
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
      hubDiscountPending: hubDiscountPending,
      localHardwareDiscountPending: localHardwareDiscountPending
    });

    var next = replacePlayer(state, player.id, nextPlayer);
    var logText = device.shortName + (offer.isUpgrade ? " lokal" : " " + mode) + ".";
    if (isNewBuild && deviceId === "charger") {
      var granted = grantInnovationCards(next, nextPlayer, 1, null);
      next = replacePlayer(granted.state, player.id, granted.player);
      if (granted.cards[0]) {
        logText += " Innovationskarte: " + granted.cards[0].name + ".";
      }
    }
    next.log = addLog(next, player.name, logText);
    return next;
  }

  function applyOngoingEffects(player) {
    var modifiers = player.roundModifiers;
    var upkeep = cloudUpkeepCost(player);
    var cloudOnline = upkeep === 0 || canAfford(player.resources, { bandwidth: upkeep });
    var baseSave = 0;
    var bandwidthGain = 0;
    var addedRisk = 0;
    var hemsMode = player.devices.hems;
    var scoreHint = emptyScores();

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
      bandwidthGain += ((device.bandwidthGain != null ? device.bandwidthGain : device.dataGain) || 0) * factor;
      if (device.scoreGain && factor > 0) {
        SCORE_KEYS.forEach(function (key) {
          scoreHint[key] += (device.scoreGain[key] || 0) * factor;
        });
      }
    });

    var peakMode = player.devices.peak_load;
    if (peakMode) {
      var peakFactor = effectFactor(peakMode, modifiers);
      if (peakMode === "cloud" && !cloudOnline) {
        peakFactor = 0;
      }
      scoreHint.environment +=
        (Nexus.DEVICES_BY_ID.peak_load.environmentPerRound || 0) * peakFactor;
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
    var bandwidthGranted = Math.floor(bandwidthGain);

    var resources = cloneResources(player.resources);
    if (cloudOnline && upkeep > 0) {
      resources.bandwidth -= upkeep;
    }
    resources.energy += energyGranted;
    resources.bandwidth += bandwidthGranted;

    var parts = [];
    if (upkeep > 0 && cloudOnline) {
      parts.push("Cloud −" + upkeep + " Bandbr.");
    } else if (upkeep > 0) {
      parts.push("Cloud offline (Bandbr. fehlt)");
    }
    if (energySave > 0) {
      parts.push("Spar " + energySave + " Energie");
    }
    if (bandwidthGranted > 0) {
      parts.push("+" + bandwidthGranted + " Bandbr.");
    }
    if (addedRisk > 0) {
      parts.push("Risiko +" + addedRisk);
    }
    if (parts.length === 0) {
      parts.push("keine Geräteeffekte");
    }

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      scores: bumpScores(player.scores, scoreHint),
      risk: player.risk + addedRisk,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false }
    });

    return { player: nextPlayer, logText: "Zugende: " + parts.join(", ") + "." };
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
    var givePremium = !hasRecentProduction(player, giveKey, state.round);
    offer.flags.premiumSurcharge = givePremium;
    offer.giveCost = tradeGiveAmount(giveAmount, givePremium);
    offer.wantGain = wantAmount;
    if (player.standardsChoice === "open" && partner.standardsChoice === "open" && givePremium) {
      offer.giveCost = Math.max(wantAmount, offer.giveCost - C.OPEN_STANDARD_DISCOUNT);
      offer.flags.openDiscount = offer.giveCost < tradeGiveAmount(giveAmount, true);
    }
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
    return closeTradeResponse(settled, offerId, "accepted");
  }

  function executeTrade(state, partnerId, giveKey, giveAmount, wantKey, wantAmount) {
    return proposeTrade(state, partnerId, giveKey, giveAmount, wantKey, wantAmount);
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

  function getSaeUpgradeCost(level, player) {
    var cost = {
      bandwidth: 1 + level,
      money: 1 + Math.floor(level / 2),
      energy: 1
    };
    if (player && player.devices && player.devices.charging_network) {
      cost.bandwidth = Math.max(
        0,
        cost.bandwidth - (C.SAE_NETWORK_BANDWIDTH_DISCOUNT || C.SAE_NETWORK_CONNECTIVITY_DISCOUNT || 0)
      );
    }
    return cost;
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
    return canAfford(player.resources, getSaeUpgradeCost(player.saeLevel || 0, player));
  }

  function upgradeSae(state) {
    var player = currentPlayer(state);
    if (!canUpgradeSae(state)) {
      return state;
    }
    var level = player.saeLevel || 0;
    var cost = getSaeUpgradeCost(level, player);
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

  /* Ansicht für die Anleitung: klont den Übungsstand, damit die echte Oberfläche
     (Phasen, Beispielkarte, öffentliches Cloud-Gerät) sichtbar wird.
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
    if (scene === "sae" && next.players[me]) {
      patchAt(me, {
        devices: Object.assign({}, next.players[me].devices, { v2x: "cloud" })
      });
    }
    return next;
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
  Nexus.executeTrade = executeTrade;
  Nexus.proposeTrade = proposeTrade;
  Nexus.beginTradeInterrupt = beginTradeInterrupt;
  Nexus.respondTrade = respondTrade;
  Nexus.pendingTradeOffersFor = pendingTradeOffersFor;
  Nexus.findTradeOffer = findTradeOffer;
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
  Nexus.canAfford = canAfford;
  Nexus.formatCost = formatCost;
  Nexus.formatEffects = formatEffects;
  Nexus.describeZoneBuild = describeZoneBuild;
  Nexus.describeZoneUpgrade = describeZoneUpgrade;
  Nexus.upgradeZone = upgradeZone;
  Nexus.describeDemolish = describeDemolish;
  Nexus.demolishZone = demolishZone;
  Nexus.recommendExpandType = recommendExpandType;
  Nexus.recommendExpandSlot = recommendExpandSlot;
  Nexus.zoneUpgradeLevel = zoneUpgradeLevel;
  Nexus.cloudUpkeepCost = cloudUpkeepCost;

  /* ponytail: console smoke only; expand if CI lands */
  Nexus.runSmokeCheck = function () {
    if (KEYS.length !== 3) {
      throw new Error("RESOURCE_KEYS length");
    }
    if ((SCORE_KEYS || []).length !== 4) {
      throw new Error("SCORE_KEYS length");
    }
    var state = startGame(2, "short");
    var player = state.players[0];
    if (!player.scores || player.scores.environment === undefined) {
      throw new Error("scores missing");
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
    state = buyZone(state, pick.q, pick.r, "energy", "solar");
    var built = zoneAt(state, pick.q, pick.r);
    if (!built || built.variant !== "solar") {
      throw new Error("buyZone variant");
    }
    if (currentPlayer(state).scores.environment < 1) {
      throw new Error("solar environment hint");
    }
    var pick2 = null;
    Nexus.HEX_DIRS.forEach(function (dir) {
      var q = built.q + dir.q;
      var r = built.r + dir.r;
      if (!pick2 && isExpandableSlot(state, q, r)) {
        pick2 = { q: q, r: r };
      }
    });
    if (pick2) {
      state = buyZone(state, pick2.q, pick2.r, "traffic");
      if (currentPlayer(state).scores.comfort < 1) {
        throw new Error("traffic comfort hint");
      }
    }
    var trafficPreview = describeZoneBuild(state, "traffic");
    if (!trafficPreview.onBuild || trafficPreview.onBuild.comfort < 1) {
      throw new Error("traffic preview comfort");
    }
    var solarPreview = describeZoneBuild(state, "energy", "solar");
    if (!solarPreview.production || !solarPreview.production.dice) {
      throw new Error("solar preview dice");
    }
    var solar = zoneAt(state, pick.q, pick.r);
    state = Object.assign({}, state, {
      players: state.players.map(function (p, idx) {
        if (idx !== 0) {
          return p;
        }
        var rich = cloneResources(p.resources);
        rich.money = 20;
        rich.energy = 20;
        rich.bandwidth = 20;
        return Object.assign({}, p, { resources: rich });
      })
    });
    var upPreview = describeZoneUpgrade(state, solar.id);
    if (!upPreview.allowed) {
      throw new Error("upgrade preview " + upPreview.reason);
    }
    state = upgradeZone(state, solar.id);
    var upgraded = zoneAt(state, pick.q, pick.r);
    if (!upgraded || upgraded.upgradeLevel !== 1) {
      throw new Error("upgradeLevel");
    }
    if (zonePrimaryBase(upgraded) !== 4) {
      throw new Error("upgrade yield scale");
    }
    if (ZONE_TYPES.home.label.indexOf("Kontroll") === -1) {
      throw new Error("home label");
    }
    var rec = recommendExpandType(state);
    if (!rec || !rec.type) {
      throw new Error("recommend");
    }
    if (pick2) {
      var cut = describeDemolish(state, solar.id);
      if (cut.allowed) {
        throw new Error("demolish should disconnect");
      }
      var leaf = describeDemolish(state, zoneAt(state, pick2.q, pick2.r).id);
      if (!leaf.allowed) {
        throw new Error("demolish leaf " + leaf.reason);
      }
      var afterDemo = demolishZone(state, zoneAt(state, pick2.q, pick2.r).id);
      if (afterDemo.zones.length !== state.zones.length - 1) {
        throw new Error("demolish count");
      }
      state = afterDemo;
    }
    var partner = state.players[1];
    var beforeMoney = partner.resources.money;
    state = proposeTrade(state, partner.id, "energy", 1, "money", 1);
    if (!(state.tradeOffers || []).length) {
      throw new Error("proposeTrade");
    }
    var offerId = state.tradeOffers[0].id;
    state = Object.assign({}, state, { currentPlayerIndex: 1 });
    state = respondTrade(state, offerId, true);
    if (currentPlayer(state).resources.money === beforeMoney) {
      throw new Error("trade accept");
    }
    return "ok";
  };
})(window.Nexus);
