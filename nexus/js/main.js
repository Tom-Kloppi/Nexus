window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createInitialState();
  var ui = {
    expandSlot: null,
    inspectedDevice: null,
    investorAwaitingResource: false
  };
  var harvestTimer = null;
  var autoQueue = false;

  function commit(next) {
    var prevGain = state.lastGain;
    state = next;
    if (state.phase !== "build") {
      ui.expandSlot = null;
    }
    if (state.phase !== "event") {
      ui.investorAwaitingResource = false;
    }
    Nexus.render(state, ui);

    if (state.lastGain && state.lastGain !== prevGain) {
      var gain = state.lastGain;
      if (gain.amount > 0) {
        Nexus.pushToast(
          "+" + gain.amount + " " + Nexus.RESOURCE_LABELS[gain.resource],
          Nexus.RESOURCE_COLORS[gain.resource]
        );
      } else {
        Nexus.pushToast("Ausfall", "#ff6b7a");
      }
    }
  }

  function scheduleCompleteHarvest(clickX, clickY) {
    window.clearTimeout(harvestTimer);
    harvestTimer = window.setTimeout(function () {
      var outcome = state.spinningOutcome;
      commit(Nexus.completeHarvestPlot(state));
      if (outcome && clickX != null) {
        Nexus.spawnFloat(outcome.resource, outcome.amount, clickX, clickY);
      }
      if (autoQueue && state.phase === "produce" && Nexus.remainingHarvestCount(state) > 0) {
        window.setTimeout(function () {
          startHarvest(findNextPlotId());
        }, Nexus.CONSTANTS.HARVEST_STAGGER_MS);
      } else {
        autoQueue = false;
      }
    }, Nexus.CONSTANTS.TILE_SPIN_MS);
  }

  function findNextPlotId() {
    var found = null;
    state.plots.forEach(function (plot) {
      if (!plot.harvested && !found) {
        found = plot.id;
      }
    });
    return found;
  }

  function startHarvest(plotId, clickX, clickY) {
    if (!plotId || state.phase !== "produce") {
      return;
    }
    commit(Nexus.beginHarvestPlot(state, plotId));
    if (state.phase === "spinning") {
      scheduleCompleteHarvest(clickX, clickY);
    }
  }

  function fillIcons() {
    Array.prototype.forEach.call(document.querySelectorAll(".token-icon"), function (node) {
      node.innerHTML = Nexus.RESOURCE_ICONS[node.getAttribute("data-res")];
    });
    Array.prototype.forEach.call(document.querySelectorAll(".mode-icon"), function (node) {
      node.innerHTML = Nexus.MODE_ICONS[node.getAttribute("data-mode")];
    });
  }

  document.getElementById("btn-harvest-all").addEventListener("click", function () {
    if (state.phase !== "produce") {
      return;
    }
    autoQueue = true;
    startHarvest(findNextPlotId());
  });

  document.getElementById("btn-end-round").addEventListener("click", function () {
    autoQueue = false;
    commit(Nexus.endRound(state));
  });

  document.getElementById("district-svg").addEventListener("click", function (event) {
    var owned = event.target.closest(".hex-owned.is-ready");
    if (owned && state.phase === "produce") {
      autoQueue = false;
      startHarvest(owned.getAttribute("data-plot"), event.clientX, event.clientY);
      return;
    }

    var empty = event.target.closest(".hex-empty.is-open");
    if (!empty || state.phase !== "build") {
      return;
    }
    ui.expandSlot = {
      q: Number(empty.getAttribute("data-q")),
      r: Number(empty.getAttribute("data-r"))
    };
    ui.inspectedDevice = null;
    Nexus.render(state, ui);
  });

  document.getElementById("expand-choices").addEventListener("click", function (event) {
    var button = event.target.closest("[data-resource]");
    if (!button || button.disabled || !ui.expandSlot) {
      return;
    }
    var slot = ui.expandSlot;
    ui.expandSlot = null;
    commit(Nexus.buyPlot(state, slot.q, slot.r, button.getAttribute("data-resource")));
    Nexus.pushToast("Feld erweitert", "#3fd0c9");
  });

  document.getElementById("btn-expand-cancel").addEventListener("click", function () {
    ui.expandSlot = null;
    Nexus.closeModal(document.getElementById("expand-modal"));
    Nexus.render(state, ui);
  });

  document.getElementById("device-list").addEventListener("click", function (event) {
    var room = event.target.closest("[data-device]");
    if (!room) {
      return;
    }
    var id = room.getAttribute("data-device");
    ui.inspectedDevice = ui.inspectedDevice === id ? null : id;
    Nexus.render(state, ui);
  });

  function tryBuild(mode) {
    if (!ui.inspectedDevice || state.phase !== "build") {
      return;
    }
    var id = ui.inspectedDevice;
    var next = Nexus.buildDevice(state, id, mode);
    if (next === state) {
      return;
    }
    commit(next);
    Nexus.pushToast(Nexus.DEVICES_BY_ID[id].shortName + " · " + mode, mode === "cloud" ? "#4ea1ef" : "#7bcf4a");
  }

  document.getElementById("mode-cloud").addEventListener("click", function () {
    tryBuild("cloud");
  });

  document.getElementById("mode-local").addEventListener("click", function () {
    tryBuild("local");
  });

  document.getElementById("event-choices").addEventListener("click", function (event) {
    var button = event.target.closest("[data-choice]");
    if (!button || button.disabled) {
      return;
    }
    var choiceId = button.getAttribute("data-choice");
    var eventCard = state.pendingEvent;
    var choice =
      eventCard &&
      eventCard.choices.filter(function (item) {
        return item.id === choiceId;
      })[0];
    if (choice && choice.needsResourcePick) {
      ui.investorAwaitingResource = true;
      Nexus.render(state, ui);
      return;
    }
    commit(Nexus.applyEventChoice(state, choiceId));
  });

  document.getElementById("event-resource-pick").addEventListener("click", function (event) {
    var button = event.target.closest("[data-resource]");
    if (!button) {
      return;
    }
    commit(Nexus.applyEventChoice(state, "a", { resource: button.getAttribute("data-resource") }));
  });

  document.getElementById("btn-restart").addEventListener("click", function () {
    window.clearTimeout(harvestTimer);
    autoQueue = false;
    ui = {
      expandSlot: null,
      inspectedDevice: null,
      investorAwaitingResource: false
    };
    commit(Nexus.createInitialState());
  });

  window.addEventListener("resize", function () {
    Nexus.render(state, ui);
  });

  fillIcons();
  Nexus.render(state, ui);
})();
