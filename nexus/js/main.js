window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createSetupState();
  var ui = {
    expandSlot: null,
    inspectedDevice: null,
    investorAwaitingResource: false,
    homeSelected: true,
    tradeOpen: false,
    tradePick: { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "data", wantAmount: 1 },
    map: { scale: 1, tx: 0, ty: 0, dragging: false, moved: false, lastX: 0, lastY: 0, pointerId: null, userAdjusted: false }
  };
  var harvestTimer = null;

  function commit(next, options) {
    options = options || {};
    state = next;
    if (state.turnPhase !== "build") {
      ui.expandSlot = null;
    }
    if (state.turnPhase !== "event") {
      ui.investorAwaitingResource = false;
    }
    Nexus.render(state, ui);
    if (!options.skipAutoHarvest) {
      triggerAutoHarvest();
    }
    if (state.screen === "game") {
      requestAnimationFrame(function () {
        fitMapToView(false);
      });
    }
  }

  function clearHarvestTimer() {
    window.clearTimeout(harvestTimer);
    harvestTimer = null;
  }

  function triggerAutoHarvest() {
    if (state.screen !== "game") {
      return;
    }
    if (state.turnPhase !== "produce") {
      return;
    }
    if (Nexus.remainingHarvestCount(state) === 0) {
      return;
    }
    if (state.spinningOutcomes) {
      return;
    }
    clearHarvestTimer();
    state = Nexus.beginHarvestAllSimultaneous(state);
    Nexus.render(state, ui);
    harvestTimer = window.setTimeout(function () {
      var next = Nexus.completeHarvestAll(state);
      commit(next, { skipAutoHarvest: true });
      var player = Nexus.currentPlayer(next);
      var gained = Nexus.RESOURCE_KEYS.filter(function (key) {
        return player.lastProduction[key] > 0;
      })
        .map(function (key) {
          return "+" + player.lastProduction[key] + " " + Nexus.RESOURCE_LABELS[key];
        })
        .join(" · ");
      if (gained) {
        Nexus.pushToast("Produktion: " + gained, "#3fd0c9");
      }
    }, Nexus.harvestAnimationMs(state));
  }

  function applyMapTransform() {
    var viewport = document.getElementById("map-viewport");
    if (!viewport) {
      return;
    }
    viewport.style.transformOrigin = "0 0";
    viewport.style.transform =
      "translate(" + ui.map.tx + "px," + ui.map.ty + "px) scale(" + ui.map.scale + ")";
  }

  function fitMapToView(force) {
    if (ui.map.userAdjusted && !force) {
      applyMapTransform();
      return;
    }
    var plane = document.querySelector(".city-plane");
    var board = document.getElementById("map-board");
    if (!plane || !board || !board.offsetWidth) {
      applyMapTransform();
      return;
    }
    var pw = plane.clientWidth;
    var ph = plane.clientHeight;
    var bw = board.offsetWidth;
    var bh = board.offsetHeight;
    var scale = Math.min(pw / bw, ph / bh) * Nexus.CONSTANTS.MAP_FIT_PADDING;
    ui.map.scale = clampMapScale(scale);
    ui.map.tx = (pw - bw * ui.map.scale) / 2;
    ui.map.ty = (ph - bh * ui.map.scale) / 2;
    applyMapTransform();
  }

  function clampMapScale(scale) {
    return Math.min(Nexus.CONSTANTS.MAP_MAX_SCALE, Math.max(Nexus.CONSTANTS.MAP_MIN_SCALE, scale));
  }

  function setupMapControls() {
    var plane = document.querySelector(".city-plane");
    if (!plane) {
      return;
    }

    plane.addEventListener(
      "wheel",
      function (event) {
        if (state.screen !== "game") {
          return;
        }
        event.preventDefault();
        var factor = event.deltaY > 0 ? 0.92 : 1.08;
        ui.map.scale = clampMapScale(ui.map.scale * factor);
        ui.map.userAdjusted = true;
        applyMapTransform();
      },
      { passive: false }
    );

    plane.addEventListener("pointerdown", function (event) {
      if (state.screen !== "game") {
        return;
      }
      if (event.target.closest(".map-controls")) {
        return;
      }
      if (event.button !== 0 && event.pointerType !== "touch") {
        return;
      }
      ui.map.dragging = true;
      ui.map.moved = false;
      ui.map.pointerId = event.pointerId;
      ui.map.lastX = event.clientX;
      ui.map.lastY = event.clientY;
      plane.setPointerCapture(event.pointerId);
    });

    plane.addEventListener("pointermove", function (event) {
      if (!ui.map.dragging || event.pointerId !== ui.map.pointerId) {
        return;
      }
      ui.map.tx += event.clientX - ui.map.lastX;
      ui.map.ty += event.clientY - ui.map.lastY;
      if (Math.abs(event.clientX - ui.map.lastX) > 4 || Math.abs(event.clientY - ui.map.lastY) > 4) {
        ui.map.moved = true;
        plane.classList.add("is-dragging");
      }
      ui.map.lastX = event.clientX;
      ui.map.lastY = event.clientY;
      ui.map.userAdjusted = true;
      applyMapTransform();
    });

    function endDrag(event) {
      if (event.pointerId !== ui.map.pointerId) {
        return;
      }
      ui.map.dragging = false;
      ui.map.pointerId = null;
      plane.classList.remove("is-dragging");
      try {
        plane.releasePointerCapture(event.pointerId);
      } catch (err) {
        /* ignore */
      }
    }

    plane.addEventListener("pointerup", endDrag);
    plane.addEventListener("pointercancel", endDrag);

    document.getElementById("btn-map-zoom-in").addEventListener("click", function () {
      ui.map.scale = clampMapScale(ui.map.scale * 1.12);
      ui.map.userAdjusted = true;
      applyMapTransform();
    });

    document.getElementById("btn-map-zoom-out").addEventListener("click", function () {
      ui.map.scale = clampMapScale(ui.map.scale * 0.88);
      ui.map.userAdjusted = true;
      applyMapTransform();
    });

    document.getElementById("btn-map-reset").addEventListener("click", function () {
      ui.map.userAdjusted = false;
      fitMapToView(true);
    });
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
    clearHarvestTimer();
    ui = {
      expandSlot: null,
      inspectedDevice: null,
      investorAwaitingResource: false,
      homeSelected: true,
      tradeOpen: false,
      tradePick: { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "data", wantAmount: 1 },
      map: { scale: 1, tx: 0, ty: 0, dragging: false, moved: false, lastX: 0, lastY: 0, pointerId: null, userAdjusted: false }
    };
    Nexus.closeModal(document.getElementById("setup-screen"));
    commit(Nexus.startGame(setupChoice.count, setupChoice.lengthId));
  }

  document.getElementById("btn-start-game").addEventListener("click", startNewGame);

  /* ---------- Spielaktionen ---------- */

  document.getElementById("btn-role-reveal-ok").addEventListener("click", function () {
    commit(Nexus.acknowledgeRoleReveal(state));
  });

  document.getElementById("btn-trade").addEventListener("click", function () {
    if (state.turnPhase !== "build") {
      return;
    }
    ui.tradeOpen = true;
    Nexus.render(state, ui);
  });

  document.getElementById("btn-trade-cancel").addEventListener("click", function () {
    ui.tradeOpen = false;
    Nexus.closeModal(document.getElementById("trade-modal"));
    Nexus.render(state, ui);
  });

  document.getElementById("trade-partners").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-partner]");
    if (!btn) {
      return;
    }
    ui.tradePick.partnerId = btn.getAttribute("data-partner");
    Nexus.render(state, ui);
  });

  document.getElementById("trade-give").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-give]");
    if (!btn) {
      return;
    }
    ui.tradePick.giveKey = btn.getAttribute("data-give");
    Nexus.render(state, ui);
  });

  document.getElementById("trade-want").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-want]");
    if (!btn) {
      return;
    }
    ui.tradePick.wantKey = btn.getAttribute("data-want");
    Nexus.render(state, ui);
  });

  document.getElementById("btn-trade-confirm").addEventListener("click", function () {
    var pick = ui.tradePick;
    if (!pick.partnerId || !pick.giveKey || !pick.wantKey) {
      return;
    }
    var next = Nexus.executeTrade(state, pick.partnerId, pick.giveKey, pick.giveAmount || 1, pick.wantKey, pick.wantAmount || 1);
    if (next === state) {
      Nexus.pushToast("Handel nicht möglich", "#ff8fb0");
      return;
    }
    ui.tradeOpen = false;
    commit(next);
    Nexus.pushToast("Handel abgeschlossen", "#3fd0c9");
  });

  document.getElementById("btn-standard-open").addEventListener("click", function () {
    commit(Nexus.setStandardsChoice(state, "open"));
  });

  document.getElementById("btn-standard-proprietary").addEventListener("click", function () {
    commit(Nexus.setStandardsChoice(state, "proprietary"));
  });

  document.getElementById("btn-sae-upgrade").addEventListener("click", function () {
    var next = Nexus.upgradeSae(state);
    if (next !== state) {
      commit(next);
      Nexus.pushToast("SAE ausgebaut", "#c084fc");
    }
  });

  document.getElementById("btn-end-round").addEventListener("click", function () {
    clearHarvestTimer();
    commit(Nexus.endTurn(state), { skipAutoHarvest: true });
  });

  document.getElementById("district-svg").addEventListener("click", function (event) {
    if (ui.map.moved) {
      ui.map.moved = false;
      return;
    }

    var home = event.target.closest(".hex-home[data-mine='1']");
    if (home && state.turnPhase === "build") {
      ui.homeSelected = true;
      ui.expandSlot = null;
      Nexus.render(state, ui);
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
    clearHarvestTimer();
    Nexus.closeModal(document.getElementById("end-screen"));
    state = Nexus.createSetupState();
    Nexus.openModal(document.getElementById("setup-screen"));
  });

  window.addEventListener("resize", function () {
    if (state.screen === "game") {
      Nexus.render(state, ui);
      fitMapToView(false);
    }
  });

  fillIcons();
  renderSetupScreen();
  setupMapControls();
  Nexus.openModal(document.getElementById("setup-screen"));
})();
