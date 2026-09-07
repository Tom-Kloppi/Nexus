window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createSetupState();
  var ui = {
    expandSlot: null,
    inspectedDevice: null,
    investorAwaitingResource: false
  };
  var harvestTimer = null;
  var autoQueue = false;

  function commit(next) {
    state = next;
    if (state.turnPhase !== "build") {
      ui.expandSlot = null;
    }
    if (state.turnPhase !== "event") {
      ui.investorAwaitingResource = false;
    }
    Nexus.render(state, ui);
  }

  function findNextZoneId() {
    var player = Nexus.currentPlayer(state);
    var found = null;
    Nexus.playerZones(state, player.id).forEach(function (zone) {
      if (!zone.harvested && !found) {
        found = zone.id;
      }
    });
    return found;
  }

  function scheduleCompleteHarvest(clickX, clickY) {
    window.clearTimeout(harvestTimer);
    harvestTimer = window.setTimeout(function () {
      var outcome = state.spinningOutcome;
      commit(Nexus.completeHarvestZone(state));
      if (outcome && clickX != null) {
        Nexus.spawnFloat(outcome.yield.primary.resource, outcome.yield.primary.amount, clickX, clickY);
      }
      if (outcome) {
        var text = "+" + outcome.yield.primary.amount + " " + Nexus.RESOURCE_LABELS[outcome.yield.primary.resource];
        if (outcome.yield.secondary) {
          text += " · +" + outcome.yield.secondary.amount + " " + Nexus.RESOURCE_LABELS[outcome.yield.secondary.resource];
        }
        Nexus.pushToast(text, Nexus.RESOURCE_COLORS[outcome.yield.primary.resource]);
      }
      if (autoQueue && state.turnPhase === "produce" && Nexus.remainingHarvestCount(state) > 0) {
        window.setTimeout(function () {
          startHarvest(findNextZoneId());
        }, Nexus.CONSTANTS.HARVEST_STAGGER_MS);
      } else {
        autoQueue = false;
      }
    }, Nexus.CONSTANTS.TILE_SPIN_MS);
  }

  function startHarvest(zoneId, clickX, clickY) {
    if (!zoneId || state.turnPhase !== "produce") {
      return;
    }
    commit(Nexus.beginHarvestZone(state, zoneId));
    if (state.turnPhase === "spinning") {
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

  /* ---------- Setup-Screen ---------- */

  var setupChoice = { count: 3, lengthId: "standard" };

  function renderSetupScreen() {
    Array.prototype.forEach.call(document.querySelectorAll("#setup-player-count .setup-choice"), function (btn) {
      btn.classList.toggle("is-selected", Number(btn.getAttribute("data-count")) === setupChoice.count);
    });
    Array.prototype.forEach.call(document.querySelectorAll("#setup-length .setup-choice"), function (btn) {
      btn.classList.toggle("is-selected", btn.getAttribute("data-length") === setupChoice.lengthId);
    });
  }

  document.getElementById("setup-player-count").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-count]");
    if (!btn) {
      return;
    }
    setupChoice.count = Number(btn.getAttribute("data-count"));
    renderSetupScreen();
  });

  document.getElementById("setup-length").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-length]");
    if (!btn) {
      return;
    }
    setupChoice.lengthId = btn.getAttribute("data-length");
    renderSetupScreen();
  });

  function startNewGame() {
    ui = { expandSlot: null, inspectedDevice: null, investorAwaitingResource: false };
    autoQueue = false;
    window.clearTimeout(harvestTimer);
    Nexus.closeModal(document.getElementById("setup-screen"));
    commit(Nexus.startGame(setupChoice.count, setupChoice.lengthId));
  }

  document.getElementById("btn-start-game").addEventListener("click", startNewGame);

  /* ---------- Spielaktionen ---------- */

  document.getElementById("btn-harvest-all").addEventListener("click", function () {
    if (state.turnPhase !== "produce") {
      return;
    }
    autoQueue = true;
    startHarvest(findNextZoneId());
  });

  document.getElementById("btn-end-round").addEventListener("click", function () {
    autoQueue = false;
    commit(Nexus.endTurn(state));
  });

  document.getElementById("district-svg").addEventListener("click", function (event) {
    var owned = event.target.closest(".hex-owned.is-ready");
    if (owned && state.turnPhase === "produce") {
      autoQueue = false;
      startHarvest(owned.getAttribute("data-zone"), event.clientX, event.clientY);
      return;
    }

    var empty = event.target.closest(".hex-empty.is-open");
    if (!empty || state.turnPhase !== "build") {
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
    var button = event.target.closest("[data-zone-type]");
    if (!button || button.disabled || !ui.expandSlot) {
      return;
    }
    var slot = ui.expandSlot;
    ui.expandSlot = null;
    commit(Nexus.buyZone(state, slot.q, slot.r, button.getAttribute("data-zone-type")));
    Nexus.pushToast("Zone erweitert", "#3fd0c9");
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
    if (!ui.inspectedDevice || state.turnPhase !== "build") {
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
    var player = Nexus.currentPlayer(state);
    var eventCard = player.pendingEvent;
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
    Nexus.closeModal(document.getElementById("end-screen"));
    state = Nexus.createSetupState();
    Nexus.openModal(document.getElementById("setup-screen"));
  });

  window.addEventListener("resize", function () {
    if (state.screen === "game") {
      Nexus.render(state, ui);
    }
  });

  fillIcons();
  renderSetupScreen();
  Nexus.openModal(document.getElementById("setup-screen"));
})();
