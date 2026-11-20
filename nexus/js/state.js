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

  function awardBuildRolePoints(state, playerId, zoneType, variant) {
    var map = {
      "energy:solar": { key: "eco", amount: 1, reason: "Solarfeld" },
      "energy:transformer": { key: "finance", amount: 1, reason: "Umspannwerk" },
      "residential:": { key: "comfort", amount: 1, reason: "Wohnen" },
      "datacenter:secure": { key: "trust", amount: 2, reason: "Sicheres Rechenzentrum" },
      "datacenter:insecure": { key: "trust", amount: 1, reason: "Offenes Rechenzentrum" },
      "traffic:": { key: "comfort", amount: 1, reason: "Verkehrsfeld" }
    };
    var spec = map[zoneType + ":" + (variant || "")] || map[zoneType + ":"];
    if (!spec) {
      return state;
    }
    return awardTypedRolePoints(state, playerId, spec.key, spec.amount, spec.reason);
  }

  function setDatacenterMode(state, zoneId, variant) {
    var player = currentPlayer(state);
    if (!player || state.turnPhase !== "build") {
      return state;
    }
    if (variant !== "secure" && variant !== "insecure") {
      return state;
    }
    var zone = null;
    (state.zones || []).forEach(function (item) {
      if (item.id === zoneId) {
        zone = item;
      }
    });
    if (!zone || zone.ownerId !== player.id || zone.type !== "datacenter") {
      return state;
    }
    if (zone.variant === variant) {
      return state;
    }
    var cost = variant === "secure" ? { money: 2, bandwidth: 1 } : { money: 1 };
    if (!canAfford(player.resources, cost)) {
      return state;
    }
    var scores = cloneScores(player.scores);
    var risk = player.risk || 0;
    if (variant === "secure") {
      scores = bumpScores(scores, { security: 1 });
    } else {
      risk += 2;
    }
    var zones = state.zones.map(function (item) {
      return item.id === zoneId ? Object.assign({}, item, { variant: variant }) : item;
    });
    var nextPlayer = Object.assign({}, player, {
      resources: subtractCost(player.resources, cost),
      scores: scores,
      risk: risk
    });
    var next = replacePlayer(Object.assign({}, state, { zones: zones }), player.id, nextPlayer);
    next = awardTypedRolePoints(
      next,
      player.id,
      "trust",
      variant === "secure" ? 1 : 0,
      variant === "secure" ? "Rechenzentrum geschlossen" : "Rechenzentrum geöffnet"
    );
    next.log = addLog(
      next,
      player.name,
      "Rechenzentrum jetzt " + (variant === "secure" ? "geschlossen" : "offen") + " · " + formatCost(cost) + "."
    );
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    return next;
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
    var next = Object.assign({}, state, { turnPhase: "build", riskPreview: state.riskPreview || null });
    if (Nexus.Projects) {
      return Nexus.Projects.ensureMarket(next);
    }
    return maybeAutoDrawInnovation(next);
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
      log: addLog(state, player.name, "Karte ausgespielt: " + card.name + "."),
      lastScoreCause: { kind: "card", label: card.name }
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
    var harvestHint = null;
    if (def.harvestScoreHint) {
      harvestHint = def.harvestScoreHint;
    } else if (def.scoreHint && !(zone.type === "energy" && def.stable)) {
      /* Trafo: Umwelt nur beim Bau (scoreHint), nicht jede Ernte. */
      harvestHint = def.scoreHint;
    }
    var result = {
      primary: { resource: def.primary, amount: amount },
      moneySpent: moneySpent,
      scoreHint: harvestHint,
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
    if (zoneType === "datacenter" && playerHasZoneType(state, player.id, "datacenter")) {
      offer.reason = "Du hast schon ein Rechenzentrum. Wechsle offen/geschlossen am Feld.";
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
      if (variantDef.riskOnBuild && !Nexus.Risk) {
        risk += variantDef.riskOnBuild;
      }
    }
    if (zoneType === "traffic") {
      var alreadyTraffic = playerFactoryZones(state, player.id).some(function (zone) {
        return zone.type === "traffic";
      });
      if (!alreadyTraffic) {
        scores = bumpScores(scores, { comfort: 1 });
      }
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
        lastYield: null,
        trafficMode: zoneType === "traffic" ? "lot" : null,
        busStop: false
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
    next = awardBuildRolePoints(next, player.id, zoneType, resolvedVariant);
    var whyKey =
      zoneType === "energy" ? resolvedVariant || "solar" : zoneType === "datacenter" ? resolvedVariant || "insecure" : zoneType;
    var why = Nexus.WHY && Nexus.WHY[whyKey] ? " " + Nexus.WHY[whyKey] : "";
    next.log = addLog(
      next,
      player.name,
      (usedCoupon
        ? "Startfeld gewählt: " + label + "."
        : "Zone erweitert: " + label + " für " + formatCost(offer.cost) + ".") + why
    );
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    next.lastScoreCause = { q: q, r: r, label: label };
    next = applyNeighborhoodPressure(next, player.id, q, r);
    if (zoneType === "energy" && resolvedVariant === "solar") {
      next = tickSideDeal(next, player.id, "buildSolar", 1);
    }
    if (zoneType === "residential") {
      next = tickSideDeal(next, player.id, "buildResidential", 1);
    }
    if (zoneType === "traffic") {
      next = tickSideDeal(next, player.id, "buildTraffic", 1);
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
    next = tickSideDeal(next, player.id, "upgrade", 1);
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
      finalScores: null,
      winnerId: null,
      difficulty: options.difficulty || "normal",
      beginner: !!options.beginner,
      devRun: !!options.devRun,
      busLines: [],
      projectMarket: [],
      majorArmed: false,
      majorFired: false,
      log: [
        {
          round: 1,
          playerName: null,
          text: "Neues Spiel: " + playerCount + " Spieler, " + gameLength.rounds + " Tage Probezeit. Jeder hat einen Startcoupon für ein kostenloses Feld."
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
    return Object.assign({}, state, {
      turnPhase: "produce",
      roleRevealIndex: state.players.length,
      log: addLog(state, null, state.players[0].name + " beginnt.")
    });
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
        : "Auswertung nach " + state.maxRounds + " Tagen Probezeit.";
    return Object.assign({}, state, {
      turnPhase: "gameover",
      winnerId: winnerId,
      winReason: winReason,
      finalScores: finalScores,
      evaluation: Nexus.Arc ? Nexus.Arc.evaluate(state) : null,
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
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
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
    if (mode === "local") {
      next = awardTypedRolePoints(next, player.id, "trust", 1, device.shortName + " lokal");
    } else if (isNewBuild) {
      next = awardTypedRolePoints(next, player.id, "innovation", 1, device.shortName + " Cloud");
    }
    var logText = device.shortName + (offer.isUpgrade ? " lokal" : " " + mode) + ".";
    if (isNewBuild && deviceId === "charger") {
      var granted = grantInnovationCards(next, nextPlayer, 1, null);
      next = replacePlayer(granted.state, player.id, granted.player);
      if (granted.cards[0]) {
        logText += " Innovationskarte: " + granted.cards[0].name + ".";
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
    if (addedRisk > 0 && !Nexus.Risk) {
      parts.push("Risiko +" + addedRisk);
    }
    if (parts.length === 0) {
      parts.push("keine Geräteeffekte");
    }

    var nextPlayer = Object.assign({}, player, {
      resources: resources,
      scores: bumpScores(player.scores, scoreHint),
      risk: Nexus.Risk ? player.risk : player.risk + addedRisk,
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
      blockedTradeKeysThisTurn: [],
      neighborhoodPressureUsed: false
    });
    var next = replacePlayer(state, player.id, endedPlayer);
    next.log = addLog(next, player.name, result.logText);
    if (Nexus.Mobility) {
      next = Nexus.Mobility.applyTick(next);
    }
    if (Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: true });
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
        return updateStandardStreak(p, state.round + 1);
      });
      next.log = addLog(next, null, "Tag " + newRound + " beginnt. Gerät an " + next.players[0].name + " weitergeben.");
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
  Nexus.placeBusStop = function (state, zoneId) {
    var next = Nexus.Mobility ? Nexus.Mobility.placeBusStop(state, zoneId) : state;
    if (next !== state && Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    var zone = null;
    (state.zones || []).forEach(function (item) {
      if (item.id === zoneId) {
        zone = item;
      }
    });
    return stampCause(next, state, zone ? { q: zone.q, r: zone.r, label: "Halt" } : null);
  };
  Nexus.setTrafficMode = function (state, zoneId, mode) {
    var next = Nexus.Mobility ? Nexus.Mobility.setTrafficMode(state, zoneId, mode) : state;
    if (next !== state && Nexus.Risk) {
      next = Nexus.Risk.syncState(next, { decay: false });
    }
    var zone = null;
    (state.zones || []).forEach(function (item) {
      if (item.id === zoneId) {
        zone = item;
      }
    });
    return stampCause(next, state, zone ? { q: zone.q, r: zone.r, label: mode === "garage" ? "Parkhaus" : "Busbahnhof" } : null);
  };
  Nexus.openBusLine = function (state, stopZoneIds, propulsion) {
    var next = Nexus.Mobility ? Nexus.Mobility.openLine(state, stopZoneIds, propulsion) : state;
    if (next !== state) {
      var who = currentPlayer(state);
      if (who) {
        if (propulsion === "renewable") {
          next = awardTypedRolePoints(next, who.id, "eco", 1, "Öko-Linie");
        } else if (propulsion === "electric") {
          next = awardTypedRolePoints(next, who.id, "innovation", 1, "Elektro-Linie");
          next = tickSideDeal(next, who.id, "lineElectric", 1);
        } else {
          next = awardTypedRolePoints(next, who.id, "comfort", 1, "Diesel-Linie");
        }
        var foreign = 0;
        (stopZoneIds || []).forEach(function (zid) {
          (state.zones || []).forEach(function (zone) {
            if (zone.id === zid && zone.ownerId && zone.ownerId !== who.id) {
              foreign += 1;
            }
          });
        });
        if (foreign) {
          next = awardTypedRolePoints(next, who.id, "image", Math.min(2, foreign), "Fremde Halte");
        }
      }
      if (Nexus.Risk) {
        next = Nexus.Risk.syncState(next, { decay: false });
      }
    }
    var zone = null;
    (state.zones || []).forEach(function (item) {
      if (stopZoneIds && item.id === stopZoneIds[0]) {
        zone = item;
      }
    });
    return stampCause(next, state, zone ? { q: zone.q, r: zone.r, label: "Linie" } : { kind: "line", label: "Linie" });
  };
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
    if (!trafficPreview.onBuild || trafficPreview.onBuild.comfort) {
      throw new Error("traffic preview comfort only on first lot");
    }
    var solarPreview = describeZoneBuild(state, "energy", "solar");
    if (!solarPreview.production || solarPreview.production.dice) {
      throw new Error("solar preview must be fixed yield");
    }
    if (solarPreview.production.amount !== 2) {
      throw new Error("solar base 2");
    }
    var trafoPreview = describeZoneBuild(state, "energy", "transformer");
    if (!trafoPreview.production || trafoPreview.production.amount !== 3 || !trafoPreview.production.stable) {
      throw new Error("transformer base 3 stable");
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
    if (zonePrimaryBase(upgraded) !== 3) {
      throw new Error("upgrade yield scale");
    }
    state = acceptSideDeal(state, currentPlayer(state).id, "lobby-upgrade");
    if (!currentPlayer(state).sideDeal || currentPlayer(state).sideDeal.track !== "upgrade") {
      throw new Error("sideDeal accept");
    }
    var homeUp = playerZones(state, currentPlayer(state).id).filter(function (zone) {
      return zone.type === "home";
    })[0];
    if (!homeUp) {
      throw new Error("sideDeal home");
    }
    state = upgradeZone(state, homeUp.id);
    if (!currentPlayer(state).sideDeal || currentPlayer(state).sideDeal.progress < 1) {
      throw new Error("sideDeal progress");
    }
    state = upgradeZone(state, homeUp.id);
    if (currentPlayer(state).sideDeal) {
      throw new Error("sideDeal should resolve");
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
    var beforePts0 = state.players[0].rolePoints || 0;
    var beforePts1 = state.players[1].rolePoints || 0;
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
    if ((state.players[0].rolePoints || 0) !== beforePts0 || (state.players[1].rolePoints || 0) !== beforePts1) {
      throw new Error("trade must not award role points");
    }
    var withDev = Object.assign({}, state, {
      players: state.players.map(function (p, idx) {
        if (idx !== 0) {
          return p;
        }
        var devices = Object.assign({}, p.devices);
        devices.camera = "local";
        devices.lock = "cloud";
        return Object.assign({}, p, { devices: devices });
      })
    });
    var giz = boardGadgetsFor(withDev.players[0]);
    if (giz.camera !== "local" || giz.lock !== "cloud") {
      throw new Error("boardGadgetsFor public local");
    }
    var pub = getPublicPlayerView(withDev, withDev.players[0].id);
    if (!pub || pub.devices.length < 2) {
      throw new Error("public view gadgets");
    }
    if (C.MAX_PLAYERS !== 3 || Nexus.ALL_ROLE_IDS.length !== 6) {
      throw new Error("cast: max 3 players, 6 roles");
    }
    function axialDist(q, r) {
      return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
    }
    function assertHomes(count) {
      var s = startGame(count, "short");
      var expectR = count > 3 ? 4 : 3;
      if (C.HEX_RADIUS !== expectR || s.hexRadius !== expectR) {
        throw new Error("hexRadius " + count);
      }
      if (s.players.length !== count || s.zones.length !== count) {
        throw new Error("home count " + count);
      }
      var seen = {};
      s.zones.forEach(function (zone) {
        if (zone.type !== "home") {
          throw new Error("non-home setup");
        }
        if (axialDist(zone.q, zone.r) !== expectR) {
          throw new Error("home ring " + count + " " + zone.q + "," + zone.r);
        }
        var key = zone.q + "," + zone.r;
        if (seen[key]) {
          throw new Error("dup home " + key);
        }
        seen[key] = true;
      });
    }
    [2, 3].forEach(assertHomes);
    var practice = tutorialView(startGame(2, "short"), "public");
    if (!practice.tutorialPractice || practice.players[1].devices.lock !== "local") {
      throw new Error("tutorial public gadget");
    }
    if (practice.players[0].roleId && practice.turnPhase !== "build") {
      throw new Error("tutorial view phase");
    }
    Nexus.ALL_ROLE_IDS.forEach(function (id) {
      var sum = 0;
      Nexus.ROLES[id].subGoals.forEach(function (goal) {
        sum += goal.steps[goal.steps.length - 1].cumulativePercent;
      });
      if (sum !== 100) {
        throw new Error("role cap " + id + " " + sum);
      }
    });
    var partialPlayer = {
      id: "partial",
      roleId: "climate",
      rolePoints: 3,
      scores: { image: 0, comfort: 0, environment: 0, security: 0 },
      devices: {},
      risk: 0
    };
    var partial = Nexus.computeRoleProgress({ players: [partialPlayer, { id: "other" }], zones: [], busLines: [] }, partialPlayer);
    if (!partial || partial.points !== 3 || partial.pointKey !== "eco") {
      throw new Error("partial goal " + (partial && partial.points));
    }
    var awarded = Nexus.awardRolePoints(
      { players: [Object.assign({}, partialPlayer)], zones: [], busLines: [], log: [] },
      "partial",
      2,
      "test"
    );
    if ((awarded.players[0].rolePoints || 0) !== 5) {
      throw new Error("awardRolePoints");
    }
    var fresh = startGame(3, "short");
    if (!fresh.projectMarket || fresh.projectMarket.length !== 3) {
      throw new Error("project market");
    }
    if (!Nexus.Mobility || !Nexus.Mobility.buildGraph(3).nodes["rim-0"]) {
      throw new Error("ring road");
    }
    var preview = Nexus.Risk.preview(fresh, fresh.players[0]);
    if (preview.pNeg + preview.pPos > 100 || preview.pNeg < 1) {
      throw new Error("risk odds");
    }
    return "ok";
  };
})(window.Nexus);
