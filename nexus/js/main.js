window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createSetupState();
  var ui = {
    expandSlot: null,
    inspectedDevice: null,
    inspectedPlayerId: null,
    inspectedZoneId: null,
    investorAwaitingResource: false,
    homeSelected: false,
    homeOpen: false,
    tradeOpen: false,
    tradePick: { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "data", wantAmount: 1 },
    map: { scale: 1, tx: 0, ty: 0, dragging: false, panning: false, moved: false, lastX: 0, lastY: 0, startX: 0, startY: 0, pointerId: null, userAdjusted: false }
  };
  var harvestTimer = null;
  var prefs = {
    theme: localStorage.getItem("nexus-theme") || "dark",
    uiScale: Number(localStorage.getItem("nexus-ui-scale") || "1")
  };
  if (prefs.uiScale < 0.8 || prefs.uiScale > 1.25 || Number.isNaN(prefs.uiScale)) {
    prefs.uiScale = 1;
  }

  function applyAppearance() {
    document.documentElement.setAttribute("data-theme", prefs.theme);
    document.documentElement.style.setProperty("--ui-scale", String(prefs.uiScale));
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      var isLight = prefs.theme === "light";
      toggle.setAttribute("data-on", isLight ? "true" : "false");
      toggle.setAttribute("aria-checked", isLight ? "true" : "false");
    }
    var slider = document.getElementById("ui-scale");
    if (slider) {
      slider.value = String(prefs.uiScale);
    }
    localStorage.setItem("nexus-theme", prefs.theme);
    localStorage.setItem("nexus-ui-scale", String(prefs.uiScale));
  }

  function toastNewLogs(prev, next) {
    var prevFirst = prev && prev.log && prev.log[0];
    if (!next || !next.log || !next.log.length || next.log[0] === prevFirst) {
      return;
    }
    var fresh = [];
    var i;
    for (i = 0; i < next.log.length; i++) {
      if (next.log[i] === prevFirst) {
        break;
      }
      fresh.push(next.log[i]);
    }
    fresh.reverse().forEach(function (entry) {
      var prefix = entry.playerName ? entry.playerName + ": " : "";
      Nexus.pushToast(prefix + entry.text);
    });
  }

  function commit(next, options) {
    options = options || {};
    var prev = state;
    state = next;
    if (state.turnPhase !== "build") {
      ui.expandSlot = null;
      ui.homeOpen = false;
    }
    if (Nexus.isHotSeatShield(state) || state.turnPhase === "gameover") {
      ui.inspectedPlayerId = null;
      ui.inspectedZoneId = null;
      ui.tradeOpen = false;
      ui.homeOpen = false;
      ui.inspectedDevice = null;
    }
    if (state.turnPhase !== "event") {
      ui.investorAwaitingResource = false;
    }
    toastNewLogs(prev, state);
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
    if (state.spinningOutcomes) {
      return;
    }
    if (Nexus.remainingHarvestCount(state) === 0) {
      commit(Nexus.skipEmptyProduce(state), { skipAutoHarvest: true });
      return;
    }
    clearHarvestTimer();
    state = Nexus.beginHarvestAllSimultaneous(state);
    if (state.turnPhase !== "spinning") {
      commit(state, { skipAutoHarvest: true });
      return;
    }
    Nexus.render(state, ui);
    harvestTimer = window.setTimeout(function () {
      var next = Nexus.completeHarvestAll(state);
      commit(next, { skipAutoHarvest: true });
    }, Nexus.harvestAnimationMs(state));
  }

  function mapSafeRect() {
    var plane = document.querySelector(".city-plane");
    if (!plane) {
      return { x: 0, y: 0, w: 1, h: 1, pw: 1, ph: 1 };
    }
    var pw = plane.clientWidth;
    var ph = plane.clientHeight;
    var planeBox = plane.getBoundingClientRect();
    var hud = document.querySelector(".hud");
    var tray = document.querySelector(".card-tray");
    var dock = document.querySelector(".dock");
    var controls = document.querySelector(".map-controls");
    var settings = document.getElementById("btn-settings");
    var top = 16;
    var bottom = 16;
    var left = 56;
    var right = 16;
    function overlapInset(el, edge) {
      if (!el || el.hidden) {
        return 0;
      }
      var box = el.getBoundingClientRect();
      if (box.right < planeBox.left || box.left > planeBox.right || box.bottom < planeBox.top || box.top > planeBox.bottom) {
        return 0;
      }
      if (edge === "top") {
        return Math.max(0, box.bottom - planeBox.top);
      }
      if (edge === "bottom") {
        return Math.max(0, planeBox.bottom - box.top);
      }
      if (edge === "left") {
        return Math.max(0, box.right - planeBox.left);
      }
      return Math.max(0, planeBox.right - box.left);
    }
    top = Math.max(top, overlapInset(hud, "top") + 10);
    bottom = Math.max(bottom, overlapInset(tray, "bottom") + 10);
    left = Math.max(left, overlapInset(controls, "left") + 10);
    if (dock && !dock.hidden) {
      right = Math.max(right, overlapInset(dock, "right") + 12);
    }
    if (settings) {
      top = Math.max(top, overlapInset(settings, "top") + 8);
      right = Math.max(right, overlapInset(settings, "right") + 8);
    }
    return {
      x: left,
      y: top,
      w: Math.max(140, pw - left - right),
      h: Math.max(140, ph - top - bottom),
      pw: pw,
      ph: ph
    };
  }

  function applyMapTransform() {
    var viewport = document.getElementById("map-viewport");
    if (!viewport) {
      return;
    }
    clampMapPan();
    viewport.style.transformOrigin = "0 0";
    viewport.style.transform =
      "translate(" + ui.map.tx + "px," + ui.map.ty + "px) scale(" + ui.map.scale + ")";
  }

  function zoomAt(clientX, clientY, factor) {
    var plane = document.querySelector(".city-plane");
    if (!plane) {
      return;
    }
    var rect = plane.getBoundingClientRect();
    var px = clientX - rect.left;
    var py = clientY - rect.top;
    var worldX = (px - ui.map.tx) / ui.map.scale;
    var worldY = (py - ui.map.ty) / ui.map.scale;
    ui.map.scale = clampMapScale(ui.map.scale * factor);
    ui.map.tx = px - worldX * ui.map.scale;
    ui.map.ty = py - worldY * ui.map.scale;
    ui.map.userAdjusted = ui.map.scale > minMapScale() + 0.002;
    applyMapTransform();
  }

  function zoomTowardCenter(factor) {
    var plane = document.querySelector(".city-plane");
    if (!plane) {
      return;
    }
    var rect = plane.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
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
    var safe = mapSafeRect();
    var bw = board.offsetWidth;
    var bh = board.offsetHeight;
    var scale = Math.min(safe.w / bw, safe.h / bh) * Nexus.CONSTANTS.MAP_FIT_PADDING;
    ui.map.scale = clampMapScale(scale);
    ui.map.tx = safe.x + (safe.w - bw * ui.map.scale) / 2;
    ui.map.ty = safe.y + (safe.h - bh * ui.map.scale) / 2;
    applyMapTransform();
  }

  function minMapScale() {
    var plane = document.querySelector(".city-plane");
    var board = document.getElementById("map-board");
    if (!plane || !board || !board.offsetWidth) {
      return Nexus.CONSTANTS.MAP_MIN_SCALE;
    }
    var safe = mapSafeRect();
    var pad = Nexus.CONSTANTS.MAP_FIT_PADDING || 0.96;
    return Math.min(safe.w / board.offsetWidth, safe.h / board.offsetHeight) * pad;
  }

  function clampMapScale(scale) {
    return Math.min(Nexus.CONSTANTS.MAP_MAX_SCALE, Math.max(minMapScale(), scale));
  }

  function clampMapPan() {
    var plane = document.querySelector(".city-plane");
    var board = document.getElementById("map-board");
    if (!plane || !board || !board.offsetWidth) {
      return;
    }
    var safe = mapSafeRect();
    var scale = ui.map.scale;
    var fit = minMapScale();
    if (scale <= fit + 0.002) {
      ui.map.tx = safe.x + (safe.w - board.offsetWidth * scale) / 2;
      ui.map.ty = safe.y + (safe.h - board.offsetHeight * scale) / 2;
      ui.map.userAdjusted = false;
      return;
    }
    var layout = Nexus.boardLayout();
    var minCx = Infinity;
    var maxCx = -Infinity;
    var minCy = Infinity;
    var maxCy = -Infinity;
    layout.hexes.forEach(function (hex) {
      minCx = Math.min(minCx, hex.x);
      maxCx = Math.max(maxCx, hex.x);
      minCy = Math.min(minCy, hex.y);
      maxCy = Math.max(maxCy, hex.y);
    });
    var midX = safe.x + safe.w / 2;
    var midY = safe.y + safe.h / 2;
    var txMin = midX - maxCx * scale;
    var txMax = midX - minCx * scale;
    var tyMin = midY - maxCy * scale;
    var tyMax = midY - minCy * scale;
    ui.map.tx = Math.min(txMax, Math.max(txMin, ui.map.tx));
    ui.map.ty = Math.min(tyMax, Math.max(tyMin, ui.map.ty));
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
        zoomAt(event.clientX, event.clientY, factor);
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
      ui.map.panning = false;
      ui.map.moved = false;
      ui.map.pointerId = event.pointerId;
      ui.map.lastX = event.clientX;
      ui.map.lastY = event.clientY;
      ui.map.startX = event.clientX;
      ui.map.startY = event.clientY;
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    });

    plane.addEventListener("pointermove", function (event) {
      if (!ui.map.dragging || event.pointerId !== ui.map.pointerId) {
        return;
      }
      var dist = Math.hypot(event.clientX - ui.map.startX, event.clientY - ui.map.startY);
      if (!ui.map.panning) {
        if (dist < 8) {
          return;
        }
        if (ui.map.scale <= minMapScale() + 0.002) {
          return;
        }
        ui.map.panning = true;
        ui.map.moved = true;
        ui.map.userAdjusted = true;
        plane.classList.add("is-dragging");
        try {
          plane.setPointerCapture(event.pointerId);
        } catch (err) {
          /* ignore */
        }
        ui.map.lastX = event.clientX;
        ui.map.lastY = event.clientY;
        return;
      }
      ui.map.tx += event.clientX - ui.map.lastX;
      ui.map.ty += event.clientY - ui.map.lastY;
      ui.map.lastX = event.clientX;
      ui.map.lastY = event.clientY;
      applyMapTransform();
    });

    function endDrag(event) {
      if (event.pointerId !== ui.map.pointerId) {
        return;
      }
      ui.map.dragging = false;
      ui.map.panning = false;
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

    document.addEventListener("selectstart", function (event) {
      if (ui.map.dragging || (event.target && event.target.closest && event.target.closest(".city-plane"))) {
        event.preventDefault();
      }
    });

    document.getElementById("btn-map-zoom-in").addEventListener("click", function () {
      zoomTowardCenter(1.12);
    });

    document.getElementById("btn-map-zoom-out").addEventListener("click", function () {
      zoomTowardCenter(0.88);
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
      inspectedPlayerId: null,
      inspectedZoneId: null,
      investorAwaitingResource: false,
      homeSelected: false,
      homeOpen: false,
      tradeOpen: false,
      tradePick: { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "data", wantAmount: 1 },
      map: { scale: 1, tx: 0, ty: 0, dragging: false, panning: false, moved: false, lastX: 0, lastY: 0, startX: 0, startY: 0, pointerId: null, userAdjusted: false }
    };
    Nexus.closeModal(document.getElementById("setup-screen"));
    commit(Nexus.startGame(setupChoice.count, setupChoice.lengthId));
  }

  document.getElementById("btn-start-game").addEventListener("click", startNewGame);

  /* ---------- Spielaktionen ---------- */

  document.getElementById("btn-role-reveal-ok").addEventListener("click", function () {
    commit(Nexus.acknowledgeRoleReveal(state));
  });

  document.getElementById("btn-handoff-ok").addEventListener("click", function () {
    ui.homeSelected = true;
    ui.expandSlot = null;
    ui.tradeOpen = false;
    ui.inspectedPlayerId = null;
    commit(Nexus.acknowledgeHandoff(state));
  });

  document.getElementById("turn-row").addEventListener("click", function (event) {
    var chip = event.target.closest("[data-player-id]");
    if (!chip || Nexus.isHotSeatShield(state) || state.turnPhase === "gameover") {
      return;
    }
    ui.inspectedPlayerId = chip.getAttribute("data-player-id");
    ui.tradeOpen = false;
    Nexus.render(state, ui);
  });

  document.getElementById("btn-public-player-close").addEventListener("click", function () {
    ui.inspectedPlayerId = null;
    Nexus.closeModal(document.getElementById("public-player-modal"));
    Nexus.render(state, ui);
  });

  document.getElementById("btn-trade").addEventListener("click", function () {
    if (state.turnPhase !== "build") {
      return;
    }
    ui.tradeOpen = true;
    ui.inspectedPlayerId = null;
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
    var next = Nexus.recordBlockedTradeAttempt(state, ui.tradePick.partnerId);
    if (next !== state) {
      commit(next);
      return;
    }
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
      Nexus.pushToast("Handel nicht möglich");
      return;
    }
    ui.tradeOpen = false;
    commit(next);
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
    }
  });

  document.getElementById("btn-end-round").addEventListener("click", function () {
    clearHarvestTimer();
    ui.homeSelected = true;
    ui.expandSlot = null;
    ui.tradeOpen = false;
    ui.inspectedPlayerId = null;
    commit(Nexus.endTurn(state), { skipAutoHarvest: true });
  });

  document.getElementById("district-svg").addEventListener("click", function (event) {
    if (ui.map.moved) {
      ui.map.moved = false;
      return;
    }

    var home = event.target.closest(".hex-home");
    if (home) {
      ui.expandSlot = null;
      ui.inspectedZoneId = null;
      ui.inspectedDevice = null;
      if (home.getAttribute("data-mine") === "1") {
        ui.homeOpen = true;
        ui.homeSelected = true;
        ui.inspectedPlayerId = null;
      } else {
        ui.homeOpen = false;
        ui.homeSelected = false;
        ui.inspectedPlayerId = home.getAttribute("data-owner");
      }
      Nexus.render(state, ui);
      return;
    }

    var owned = event.target.closest(".hex-owned[data-zone]");
    if (owned) {
      ui.inspectedZoneId = owned.getAttribute("data-zone");
      ui.homeSelected = false;
      ui.homeOpen = false;
      ui.expandSlot = null;
      ui.inspectedDevice = null;
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
    ui.inspectedZoneId = null;
    ui.homeOpen = false;
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
    ui.inspectedZoneId = null;
    ui.homeSelected = true;
    ui.homeOpen = true;
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

  document.getElementById("btn-draw-deck").addEventListener("click", function () {
    var next = Nexus.drawInnovationCard(state);
    if (next === state) {
      return;
    }
    commit(next);
  });

  document.getElementById("hand-fan").addEventListener("click", function (event) {
    var item = event.target.closest("[data-card-index]");
    if (!item || item.disabled) {
      return;
    }
    var index = Number(item.getAttribute("data-card-index"));
    var next = Nexus.playInnovationCard(state, index);
    if (next === state) {
      return;
    }
    commit(next);
  });

  function closeHomeModal() {
    ui.homeOpen = false;
    ui.inspectedDevice = null;
    Nexus.closeModal(document.getElementById("home-modal"));
    Nexus.render(state, ui);
  }

  document.getElementById("btn-home-close").addEventListener("click", closeHomeModal);
  document.getElementById("home-modal").addEventListener("click", function (event) {
    if (event.target === event.currentTarget) {
      closeHomeModal();
    }
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

  function refreshMapAfterChrome() {
    if (state.screen !== "game") {
      return;
    }
    requestAnimationFrame(function () {
      fitMapToView(!ui.map.userAdjusted);
    });
  }

  function setUiScale(value) {
    prefs.uiScale = Math.max(0.8, Math.min(1.25, Number(value) || 1));
    applyAppearance();
    refreshMapAfterChrome();
  }

  document.getElementById("btn-settings").addEventListener("click", function (event) {
    event.stopPropagation();
    var panel = document.getElementById("settings-panel");
    panel.hidden = !panel.hidden;
  });

  document.getElementById("theme-toggle").addEventListener("click", function () {
    this.classList.add("is-init");
    prefs.theme = prefs.theme === "light" ? "dark" : "light";
    applyAppearance();
  });

  document.getElementById("ui-scale").addEventListener("input", function () {
    setUiScale(this.value);
  });

  document.querySelector(".scale-presets").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-ui-scale]");
    if (!btn) {
      return;
    }
    setUiScale(btn.getAttribute("data-ui-scale"));
  });

  document.addEventListener("click", function (event) {
    var wrap = document.querySelector(".settings-wrap");
    var panel = document.getElementById("settings-panel");
    if (!wrap || !panel || panel.hidden) {
      return;
    }
    if (!wrap.contains(event.target)) {
      panel.hidden = true;
    }
  });

  applyAppearance();
  fillIcons();
  renderSetupScreen();
  setupMapControls();
  Nexus.openModal(document.getElementById("setup-screen"));
})();
