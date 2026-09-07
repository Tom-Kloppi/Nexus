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

  function getBuildOffer(state, deviceId, mode, options) {
    options = options || {};
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
    if (state.phase !== "build" && !options.ignorePhase) {
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

  function pickEvent(state) {
    var eligible = Nexus.EVENTS.filter(function (event) {
      if (!event.requiresCloudCamera) {
        return true;
      }
      return state.devices.camera === "cloud";
    });
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  function bandWeightTotal() {
    return C.PRODUCTION_BANDS.reduce(function (sum, band) {
      return sum + band.weight;
    }, 0);
  }

  function expectedYieldPerPlot() {
    var total = bandWeightTotal();
    var weighted = C.PRODUCTION_BANDS.reduce(function (sum, band) {
      return sum + band.amount * band.weight;
    }, 0);
    return weighted / total;
  }

  function rollProductionBand() {
    var pick = Math.random() * bandWeightTotal();
    var i;
    for (i = 0; i < C.PRODUCTION_BANDS.length; i++) {
      pick -= C.PRODUCTION_BANDS[i].weight;
      if (pick <= 0) {
        return C.PRODUCTION_BANDS[i];
      }
    }
    return C.PRODUCTION_BANDS[C.PRODUCTION_BANDS.length - 1];
  }

  function expectedByResource(state) {
    var expected = emptyResources();
    var per = expectedYieldPerPlot();
    state.plots.forEach(function (plot) {
      expected[plot.resource] += per;
    });
    return expected;
  }

  function plotAt(state, q, r) {
    var found = null;
    state.plots.forEach(function (plot) {
      if (plot.q === q && plot.r === r) {
        found = plot;
      }
    });
    return found;
  }

  function isExpandableSlot(state, q, r) {
    if (plotAt(state, q, r)) {
      return false;
    }
    var inside = Nexus.allSlots(C.HEX_RADIUS).some(function (slot) {
      return slot.q === q && slot.r === r;
    });
    if (!inside) {
      return false;
    }
    if (!C.EXPAND_REQUIRES_ADJACENT) {
      return true;
    }
    return state.plots.some(function (plot) {
      return Nexus.isAdjacent(plot, { q: q, r: r });
    });
  }

  function getExpandCost(state) {
    var extra = Math.max(0, state.plots.length - C.START_PLOT_COUNT);
    var cost = { hardware: 2 + extra };
    if (extra >= 1) {
      cost.energy = 1;
    }
    if (extra >= 3) {
      cost.connectivity = 1;
    }
    return cost;
  }

  function getExpandOffer(state, q, r, resource) {
    var offer = { allowed: false, reason: "", cost: getExpandCost(state) };
    if (state.phase !== "build") {
      offer.reason = "Erweitern nur in der Bauphase.";
      return offer;
    }
    if (KEYS.indexOf(resource) === -1) {
      offer.reason = "Ungültige Ressource.";
      return offer;
    }
    if (!isExpandableSlot(state, q, r)) {
      offer.reason = "Dieses Feld kann nicht bebaut werden.";
      return offer;
    }
    if (!canAfford(state.resources, offer.cost)) {
      offer.reason = "Nicht genug Ressourcen.";
      return offer;
    }
    offer.allowed = true;
    return offer;
  }

  function buyPlot(state, q, r, resource) {
    var offer = getExpandOffer(state, q, r, resource);
    if (!offer.allowed) {
      return state;
    }
    var plots = state.plots.concat([
      {
        id: "plot-" + q + "-" + r + "-" + state.plots.length,
        q: q,
        r: r,
        resource: resource,
        lastBand: null,
        lastAmount: 0,
        harvested: true
      }
    ]);
    return Object.assign({}, state, {
      plots: plots,
      resources: subtractCost(state.resources, offer.cost),
      log: addLog(
        state,
        "Feld erweitert: " + Nexus.RESOURCE_LABELS[resource] + " für " + formatCost(offer.cost) + "."
      )
    });
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
    var plots = Nexus.START_PLOTS.map(function (plot, index) {
      return {
        id: "plot-start-" + index,
        q: plot.q,
        r: plot.r,
        resource: plot.resource,
        lastBand: null,
        lastAmount: 0,
        harvested: false
      };
    });
    return {
      round: 1,
      phase: "produce",
      resources: resources,
      devices: devices,
      plots: plots,
      spinningPlotId: null,
      spinningOutcome: null,
      risk: 0,
      efficiencyPoints: 0,
      innovationBonus: 0,
      privacyAdjustment: 0,
      hubDiscountPending: false,
      localHardwareDiscountPending: false,
      roundModifiers: { cloudDisabled: false, cloudHalfEffect: false },
      pendingEvent: null,
      lastProduction: emptyResources(),
      lastGain: null,
      log: [{ round: 1, text: "Tippe ein Feld an, um zu ernten." }]
    };
  }

  function remainingHarvestCount(state) {
    return state.plots.filter(function (plot) {
      return !plot.harvested;
    }).length;
  }

  function advanceAfterHarvest(state) {
    if (remainingHarvestCount(state) > 0) {
      return Object.assign({}, state, {
        phase: "produce",
        spinningPlotId: null,
        spinningOutcome: null
      });
    }

    var gained = KEYS.filter(function (key) {
      return state.lastProduction[key] > 0;
    })
      .map(function (key) {
        return "+" + state.lastProduction[key] + " " + Nexus.RESOURCE_SHORT[key];
      })
      .join(", ");
    var next = Object.assign({}, state, {
      phase: "build",
      spinningPlotId: null,
      spinningOutcome: null,
      log: addLog(state, gained ? "Ernte abgeschlossen: " + gained + "." : "Ernte ohne Ertrag.")
    });

    if (state.round % C.EVENT_EVERY_N_ROUNDS === 0) {
      next.phase = "event";
      next.pendingEvent = pickEvent(next);
      next.log = addLog(next, "Ereignis: " + next.pendingEvent.title + ".");
    }
    return next;
  }

  function beginHarvestPlot(state, plotId) {
    if (state.phase !== "produce" || state.spinningPlotId) {
      return state;
    }
    var target = null;
    state.plots.forEach(function (plot) {
      if (plot.id === plotId && !plot.harvested) {
        target = plot;
      }
    });
    if (!target) {
      return state;
    }
    var band = rollProductionBand();
    return Object.assign({}, state, {
      phase: "spinning",
      spinningPlotId: plotId,
      spinningOutcome: {
        plotId: plotId,
        band: band.id,
        amount: band.amount,
        resource: target.resource
      },
      plots: state.plots.map(function (plot) {
        if (plot.id !== plotId) {
          return plot;
        }
        return Object.assign({}, plot, {
          lastBand: band.id,
          lastAmount: band.amount
        });
      })
    });
  }

  function completeHarvestPlot(state) {
    if (state.phase !== "spinning" || !state.spinningOutcome) {
      return state;
    }
    var outcome = state.spinningOutcome;
    var resources = cloneResources(state.resources);
    var lastProduction = cloneResources(state.lastProduction);
    resources[outcome.resource] += outcome.amount;
    lastProduction[outcome.resource] += outcome.amount;

    var plots = state.plots.map(function (plot) {
      if (plot.id !== outcome.plotId) {
        return plot;
      }
      return Object.assign({}, plot, {
        harvested: true,
        lastBand: outcome.band,
        lastAmount: outcome.amount
      });
    });

    var next = Object.assign({}, state, {
      resources: resources,
      lastProduction: lastProduction,
      lastGain: {
        resource: outcome.resource,
        amount: outcome.amount,
        band: outcome.band,
        plotId: outcome.plotId
      },
      plots: plots,
      log: addLog(
        state,
        Nexus.RESOURCE_SHORT[outcome.resource] +
          (outcome.amount > 0 ? " +" + outcome.amount : " Ausfall") +
          "."
      )
    });
    return advanceAfterHarvest(next);
  }

  function beginHarvestAll(state) {
    if (state.phase !== "produce") {
      return state;
    }
    var pending = state.plots.filter(function (plot) {
      return !plot.harvested;
    });
    if (!pending.length) {
      return state;
    }
    return beginHarvestPlot(state, pending[0].id);
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

    return Object.assign({}, state, {
      resources: subtractCost(state.resources, offer.cost),
      devices: devices,
      risk: risk,
      innovationBonus: innovationBonus,
      hubDiscountPending: hubDiscountPending,
      localHardwareDiscountPending: localHardwareDiscountPending,
      log: addLog(state, device.shortName + (offer.isUpgrade ? " lokal" : " " + mode) + ".")
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

    return Object.assign({}, state, {
      resources: resources,
      risk: state.risk + addedRisk,
      efficiencyPoints: state.efficiencyPoints + energySave,
      log: addLog(state, "Nacht: " + parts.join(", ") + ".")
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
    next.round += 1;
    next.lastProduction = emptyResources();
    next.lastGain = null;
    next.plots = next.plots.map(function (plot) {
      return Object.assign({}, plot, {
        harvested: false,
        lastBand: null,
        lastAmount: 0
      });
    });

    if (next.round > C.MAX_ROUNDS) {
      next.phase = "ended";
      next.score = computeScore(next);
      next.log = addLog(next, "15 Runden vorbei.");
    } else {
      next.phase = "produce";
      next.pendingEvent = null;
      next.spinningPlotId = null;
      next.spinningOutcome = null;
      next.log = addLog(next, "Morgen. Tag " + next.round + " – tippe Felder an.");
    }
    return next;
  }

  function canEndRound(state) {
    return state.phase === "build";
  }

  function canBuyDevice(state, deviceId) {
    if (state.devices[deviceId] === "local") {
      return false;
    }
    return (
      getBuildOffer(state, deviceId, "cloud", { ignorePhase: true }).allowed ||
      getBuildOffer(state, deviceId, "local", { ignorePhase: true }).allowed
    );
  }

  Nexus.createInitialState = createInitialState;
  Nexus.beginHarvestPlot = beginHarvestPlot;
  Nexus.completeHarvestPlot = completeHarvestPlot;
  Nexus.beginHarvestAll = beginHarvestAll;
  Nexus.remainingHarvestCount = remainingHarvestCount;
  Nexus.applyEventChoice = applyEventChoice;
  Nexus.canChooseEventOption = canChooseEventOption;
  Nexus.buildDevice = buildDevice;
  Nexus.getBuildOffer = getBuildOffer;
  Nexus.buyPlot = buyPlot;
  Nexus.getExpandOffer = getExpandOffer;
  Nexus.getExpandCost = getExpandCost;
  Nexus.isExpandableSlot = isExpandableSlot;
  Nexus.plotAt = plotAt;
  Nexus.expectedYieldPerPlot = expectedYieldPerPlot;
  Nexus.expectedByResource = expectedByResource;
  Nexus.endRound = endRound;
  Nexus.canEndRound = canEndRound;
  Nexus.canBuyDevice = canBuyDevice;
  Nexus.computeScore = computeScore;
  Nexus.canAfford = canAfford;
  Nexus.formatCost = formatCost;
})(window.Nexus);
