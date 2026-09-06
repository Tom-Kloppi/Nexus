window.Nexus = window.Nexus || {};

(function (Nexus) {
  var C = Nexus.CONSTANTS;
  var KEYS = Nexus.RESOURCE_KEYS;

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

  function addLog(state, text) {
    var log = [{ round: state.round, text: text }].concat(state.log);
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

  function getBuildOffer(state, deviceId, mode) {
    var device = Nexus.DEVICES_BY_ID[deviceId];
    var currentMode = state.devices[deviceId];
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
    if (state.phase !== "build") {
      offer.reason = "Jetzt kann nicht gebaut werden.";
      return offer;
    }
    if (currentMode === "local") {
      offer.reason = "Bereits lokal gebaut.";
      return offer;
    }
    if (currentMode === "cloud" && mode === "cloud") {
      offer.reason = "Cloud-Variante steht. Aufwerten auf lokal möglich.";
      return offer;
    }
    if (currentMode === "cloud" && mode === "local") {
      offer.isUpgrade = true;
    }

    var cost = rawBuildCost(device, mode, currentMode);
    if (state.hubDiscountPending) {
      cost = applyHubDiscount(cost);
      offer.usedHubDiscount = true;
    }
    if (state.localHardwareDiscountPending && mode === "local" && (cost.hardware || 0) > 0) {
      cost = Object.assign({}, cost);
      cost.hardware -= 1;
      if (cost.hardware <= 0) {
        delete cost.hardware;
      }
      offer.usedLocalHardwareDiscount = true;
    }

    offer.cost = cost;
    if (!canAfford(state.resources, cost)) {
      offer.reason = "Nicht genug Ressourcen (" + (formatCost(cost) || "kostenlos") + ").";
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

  function pickEvent(state) {
    var eligible = Nexus.EVENTS.filter(function (event) {
      if (!event.requiresCloudCamera) {
        return true;
      }
      return state.devices.camera === "cloud";
    });
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  function createInitialState() {
    var resources = emptyResources();
    KEYS.forEach(function (key) {
      resources[key] = C.START_RESOURCES;
    });
    var devices = {};
    Nexus.DEVICES.forEach(function (device) {
      devices[device.id] = null;
    });
    return {
      round: 1,
      phase: "roll",
      dice: [null, null],
      lastSum: null,
      resources: resources,
      devices: devices,
      risk: 0,
      efficiencyPoints: 0,
      innovationBonus: 0,
      privacyAdjustment: 0,
      hubDiscountPending: false,
      localHardwareDiscountPending: false,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false },
      pendingEvent: null,
      producedTiles: [],
      lastProduction: emptyResources(),
      log: [{ round: 1, text: "Partie gestartet. Würfle, um Runde 1 zu beginnen." }]
    };
  }

  function rollDice(state) {
    if (state.phase !== "roll") {
      return state;
    }
    var d1 = 1 + Math.floor(Math.random() * C.DICE_SIDES);
    var d2 = 1 + Math.floor(Math.random() * C.DICE_SIDES);
    var sum = d1 + d2;
    var producedTiles = [];
    var lastProduction = emptyResources();
    var resources = cloneResources(state.resources);

    Nexus.DISTRICT_TILES.forEach(function (tile) {
      if (tile.number === sum) {
        producedTiles.push(tile.id);
        lastProduction[tile.resource] += 1;
        resources[tile.resource] += 1;
      }
    });

    var logText;
    if (sum === 7) {
      logText = "Würfel " + d1 + "+" + d2 + "=7 – keine Produktion (7 bekommt später ein eigenes Ereignis).";
    } else if (producedTiles.length === 0) {
      logText = "Würfel " + d1 + "+" + d2 + "=" + sum + " – kein Feld trifft.";
    } else {
      var gained = KEYS.filter(function (key) {
        return lastProduction[key] > 0;
      })
        .map(function (key) {
          return "+" + lastProduction[key] + " " + Nexus.RESOURCE_SHORT[key];
        })
        .join(", ");
      logText = "Würfel " + d1 + "+" + d2 + "=" + sum + " → " + gained + ".";
    }

    var next = Object.assign({}, state, {
      dice: [d1, d2],
      lastSum: sum,
      resources: resources,
      producedTiles: producedTiles,
      lastProduction: lastProduction,
      log: addLog(state, logText)
    });

    if (state.round % C.EVENT_EVERY_N_ROUNDS === 0) {
      next.phase = "event";
      next.pendingEvent = pickEvent(next);
      next.log = addLog(next, "Ereignis: " + next.pendingEvent.title + ".");
    } else {
      next.phase = "build";
      next.pendingEvent = null;
    }
    return next;
  }

  function applyEventChoice(state, choiceId, extra) {
    extra = extra || {};
    if (state.phase !== "event" || !state.pendingEvent) {
      return state;
    }
    var event = state.pendingEvent;
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
    if (!canAfford(state.resources, spend)) {
      return state;
    }

    var resources = subtractCost(state.resources, spend);
    if (choice.needsResourcePick) {
      resources[extra.resource] += choice.pickAmount;
    }

    var risk = state.risk + (effects.risk || 0);
    if (risk < 0) {
      risk = 0;
    }

    var next = Object.assign({}, state, {
      resources: resources,
      risk: risk,
      efficiencyPoints: state.efficiencyPoints + (effects.efficiency || 0),
      innovationBonus: state.innovationBonus + (effects.innovation || 0),
      privacyAdjustment: state.privacyAdjustment + (effects.privacy || 0),
      localHardwareDiscountPending: effects.localHardwareDiscount
        ? true
        : state.localHardwareDiscountPending,
      roundModifiers: {
        cloudDisabled: !!(state.roundModifiers.cloudDisabled || effects.cloudDisabled),
        cloudHalfEffect: !!(state.roundModifiers.cloudHalfEffect || effects.cloudHalfEffect)
      },
      pendingEvent: null,
      phase: "build"
    });

    var logText = event.title + " → " + choice.label + " (" + choice.summary + ").";
    if (choice.needsResourcePick) {
      logText =
        event.title +
        " → " +
        choice.label +
        " (+" +
        choice.pickAmount +
        " " +
        Nexus.RESOURCE_SHORT[extra.resource] +
        ", +2 Risiko).";
    }
    next.log = addLog(next, logText);
    return next;
  }

  function canChooseEventOption(state, choiceId) {
    if (!state.pendingEvent) {
      return false;
    }
    var choice = null;
    state.pendingEvent.choices.forEach(function (item) {
      if (item.id === choiceId) {
        choice = item;
      }
    });
    if (!choice) {
      return false;
    }
    return canAfford(state.resources, (choice.effects && choice.effects.spend) || {});
  }

  function buildDevice(state, deviceId, mode) {
    var offer = getBuildOffer(state, deviceId, mode);
    if (!offer.allowed) {
      return state;
    }
    var device = Nexus.DEVICES_BY_ID[deviceId];
    var isNewBuild = !state.devices[deviceId];
    var devices = Object.assign({}, state.devices);
    devices[deviceId] = mode;

    var risk = state.risk;
    var innovationBonus = state.innovationBonus;
    if (isNewBuild && deviceId === "charger") {
      innovationBonus += C.CHARGER_INNOVATION_BONUS;
    }
    if (isNewBuild && deviceId === "lock") {
      risk = Math.max(0, risk - C.LOCK_RISK_REDUCTION);
    }

    var hubDiscountPending = state.hubDiscountPending;
    if (offer.usedHubDiscount) {
      hubDiscountPending = false;
    }
    if (isNewBuild && deviceId === "hub") {
      hubDiscountPending = true;
    }

    var localHardwareDiscountPending = state.localHardwareDiscountPending;
    if (offer.usedLocalHardwareDiscount) {
      localHardwareDiscountPending = false;
    }

    var action = offer.isUpgrade ? "auf lokal aufgewertet" : "gebaut (" + mode + ")";
    var costText = formatCost(offer.cost);
    var extras = [];
    if (isNewBuild && deviceId === "charger") {
      extras.push("+2 Innovation");
    }
    if (isNewBuild && deviceId === "lock") {
      extras.push("Risiko −1");
    }
    if (isNewBuild && deviceId === "hub") {
      extras.push("nächster Bau −1 Ressource");
    }
    if (offer.usedHubDiscount) {
      extras.push("Hub-Rabatt genutzt");
    }
    if (offer.usedLocalHardwareDiscount) {
      extras.push("Förder-Rabatt genutzt");
    }

    var logText =
      device.name +
      " " +
      action +
      (costText ? " für " + costText : " kostenlos") +
      (extras.length ? " (" + extras.join(", ") + ")" : "") +
      ".";

    return Object.assign({}, state, {
      resources: subtractCost(state.resources, offer.cost),
      devices: devices,
      risk: risk,
      innovationBonus: innovationBonus,
      hubDiscountPending: hubDiscountPending,
      localHardwareDiscountPending: localHardwareDiscountPending,
      log: addLog(state, logText)
    });
  }

  function applyOngoingEffects(state) {
    var modifiers = state.roundModifiers;
    var baseSave = 0;
    var dataGain = 0;
    var addedRisk = 0;
    var hemsMode = state.devices.hems;

    Nexus.DEVICES.forEach(function (device) {
      var mode = state.devices[device.id];
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
    });

    var hemsFactor = hemsMode ? effectFactor(hemsMode, modifiers) : 0;
    var energySave = baseSave * (1 + hemsFactor);
    var energyGranted = Math.floor(energySave);
    var dataGranted = Math.floor(dataGain);

    var resources = cloneResources(state.resources);
    resources.energy += energyGranted;
    resources.data += dataGranted;

    var parts = [];
    if (energySave > 0) {
      parts.push(
        "Energieeinsparung " +
          energySave +
          (energyGranted !== energySave ? " (gutschrift " + energyGranted + ")" : "")
      );
    }
    if (dataGranted > 0) {
      parts.push("+" + dataGranted + " Daten");
    }
    if (addedRisk > 0) {
      parts.push("Risiko +" + addedRisk);
    }
    if (modifiers.cloudDisabled) {
      parts.push("Stromausfall: Cloud ohne Effekt");
    }
    if (modifiers.cloudHalfEffect) {
      parts.push("Bandbreite: Cloud halber Effekt");
    }
    if (parts.length === 0) {
      parts.push("keine laufenden Effekte");
    }

    return Object.assign({}, state, {
      resources: resources,
      risk: state.risk + addedRisk,
      efficiencyPoints: state.efficiencyPoints + energySave,
      log: addLog(state, "Rundenende: " + parts.join(", ") + ".")
    });
  }

  function computeScore(state) {
    var efficiency = state.efficiencyPoints;
    var privacy = Math.max(0, C.PRIVACY_BASE - state.risk + state.privacyAdjustment);
    var innovation = state.innovationBonus;
    Nexus.DEVICES.forEach(function (device) {
      if (state.devices[device.id]) {
        innovation += device.id === "hems" ? C.HEMS_INNOVATION : C.DEVICE_INNOVATION;
      }
    });
    return {
      efficiency: efficiency,
      privacy: privacy,
      innovation: innovation,
      total: efficiency + privacy + innovation,
      risk: state.risk
    };
  }

  function endRound(state) {
    if (state.phase !== "build") {
      return state;
    }
    var next = applyOngoingEffects(state);
    next.roundModifiers = { cloudDisabled: false, cloudHalfEffect: false };
    next.producedTiles = [];
    next.round += 1;

    if (next.round > C.MAX_ROUNDS) {
      next.phase = "ended";
      next.score = computeScore(next);
      next.log = addLog(next, "Spielende nach " + C.MAX_ROUNDS + " Runden.");
    } else {
      next.phase = "roll";
      next.dice = [null, null];
      next.lastSum = null;
      next.pendingEvent = null;
      next.log = addLog(next, "Runde " + next.round + " beginnt. Bitte würfeln.");
    }
    return next;
  }

  function canEndRound(state) {
    return state.phase === "build";
  }

  Nexus.createInitialState = createInitialState;
  Nexus.rollDice = rollDice;
  Nexus.applyEventChoice = applyEventChoice;
  Nexus.canChooseEventOption = canChooseEventOption;
  Nexus.buildDevice = buildDevice;
  Nexus.getBuildOffer = getBuildOffer;
  Nexus.endRound = endRound;
  Nexus.canEndRound = canEndRound;
  Nexus.computeScore = computeScore;
  Nexus.canAfford = canAfford;
  Nexus.formatCost = formatCost;
})(window.Nexus);
