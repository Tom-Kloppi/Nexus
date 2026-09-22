window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createSetupState();
  var ui = {
    expandSlot: null,
    inspectedDevice: null,
    inspectedPlayerId: null,
    inspectedZoneId: null,
    investorAwaitingResource: false,
    homeOpen: false,
    tradeOpen: false,
    tradePick: { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "money", wantAmount: 1 },
    map: { scale: 1, tx: 0, ty: 0, dragging: false, panning: false, moved: false, lastX: 0, lastY: 0, startX: 0, startY: 0, pointerId: null, userAdjusted: false }
  };
  var harvestTimer = null;
  var prefs = {
    theme: localStorage.getItem("nexus-theme") || "light",
    uiScale: Number(localStorage.getItem("nexus-ui-scale") || "1"),
    camPitch: Number(localStorage.getItem("nexus-cam-pitch") || "58")
  };
  if (prefs.uiScale < 0.8 || prefs.uiScale > 1.25 || Number.isNaN(prefs.uiScale)) {
    prefs.uiScale = 1;
  }
  if (!Number.isFinite(prefs.camPitch)) {
    prefs.camPitch = 58;
  }
  prefs.camPitch = Math.max(0, Math.min(100, prefs.camPitch));

  /* Klick auf einen gesperrten Knopf: wackeln und den Grund nennen, nicht schweigen */
  document.addEventListener(
    "pointerdown",
    function (event) {
      if (!document.elementsFromPoint) {
        return;
      }
      var stack = document.elementsFromPoint(event.clientX, event.clientY);
      var i;
      for (i = 0; i < stack.length; i++) {
        var el = stack[i];
        if (el.tagName !== "BUTTON") {
          continue;
        }
        if (!el.disabled) {
          return;
        }
        triggerControlShake(el);
        var reason = el.getAttribute("title") || el.getAttribute("aria-label");
        if (reason) {
          Nexus.pushToast(reason);
        }
        return;
      }
    },
    true
  );

  function triggerControlShake(el) {
    if (!el || !el.classList) {
      return;
    }
    el.classList.remove("is-shaking");
    void el.offsetWidth;
    el.classList.add("is-shaking");
    window.setTimeout(function () {
      el.classList.remove("is-shaking");
    }, 320);
  }

  function applyAppearance() {
    document.documentElement.setAttribute("data-theme", prefs.theme);
    document.documentElement.style.setProperty("--ui-scale", String(prefs.uiScale));
    var isLight = prefs.theme === "light";
    Array.prototype.forEach.call(document.querySelectorAll(".js-theme-toggle"), function (toggle) {
      toggle.setAttribute("data-on", isLight ? "true" : "false");
      toggle.setAttribute("aria-checked", isLight ? "true" : "false");
      toggle.setAttribute("aria-label", isLight ? "Tageslicht" : "Nachtstadt");
    });
    Array.prototype.forEach.call(document.querySelectorAll(".settings-row > span"), function (label) {
      if (label.textContent === "Tageslicht" || label.textContent === "Nachtstadt") {
        label.textContent = isLight ? "Tageslicht" : "Nachtstadt";
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".js-ui-scale"), function (slider) {
      slider.value = String(prefs.uiScale);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".js-cam-pitch"), function (slider) {
      slider.value = String(prefs.camPitch);
    });
    if (Nexus.setCameraPitch) {
      Nexus.setCameraPitch(prefs.camPitch);
    }
    if (Nexus.Board3D && Nexus.Board3D.setTheme) {
      Nexus.Board3D.setTheme();
    }
    localStorage.setItem("nexus-theme", prefs.theme);
    localStorage.setItem("nexus-ui-scale", String(prefs.uiScale));
    localStorage.setItem("nexus-cam-pitch", String(prefs.camPitch));
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
    if (state.turnPhase !== "build") {
      ui.tradeOpen = false;
    }
    if (state.turnPhase !== "event") {
      ui.investorAwaitingResource = false;
    }
    if (
      state.screen === "game" &&
      prev &&
      prev.currentPlayerIndex !== state.currentPlayerIndex
    ) {
      if (Nexus.Board3D) {
        Nexus.Board3D.onSeatChange(!!ui.map.userAdjusted);
      }
    }
    toastNewLogs(prev, state);
    Nexus.render(state, ui);
    if (Nexus.syncDockScrollHint) {
      Nexus.syncDockScrollHint();
    }
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
      ui.yieldPops = true;
      commit(next, { skipAutoHarvest: true });
    }, Nexus.harvestAnimationMs(state));
  }

  function applyMapTransform() {
    if (Nexus.Board3D) {
      Nexus.Board3D.fit(false);
    }
  }

  function zoomAt(clientX, clientY, factor) {
    if (!Nexus.Board3D) {
      return;
    }
    Nexus.Board3D.zoomAt(clientX, clientY, factor);
    ui.map.userAdjusted = true;
    Nexus.Board3D.setUserAdjusted(true);
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
    if (!Nexus.Board3D) {
      return;
    }
    if (ui.map.userAdjusted && !force) {
      Nexus.Board3D.fit(false);
      return;
    }
    Nexus.Board3D.fit(true);
  }

  function setupMapControls() {
    var plane = document.querySelector(".city-plane");
    if (!plane) {
      return;
    }

    plane.addEventListener(
      "contextmenu",
      function (event) {
        event.preventDefault();
      },
      true
    );

    plane.addEventListener(
      "auxclick",
      function (event) {
        if (event.button === 1) {
          event.preventDefault();
        }
      },
      true
    );

    plane.addEventListener(
      "mousedown",
      function (event) {
        if (event.button === 1 || event.button === 2) {
          event.preventDefault();
        }
      },
      true
    );

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
      if (event.button !== 0 && event.button !== 1 && event.button !== 2) {
        return;
      }
      if (event.button === 1 || event.button === 2) {
        event.preventDefault();
      }
      ui.map.dragging = true;
      ui.map.panning = false;
      ui.map.orbiting = event.button === 1 || event.button === 2;
      ui.map.moved = false;
      ui.map.pointerId = event.pointerId;
      ui.map.lastX = event.clientX;
      ui.map.lastY = event.clientY;
      ui.map.startX = event.clientX;
      ui.map.startY = event.clientY;
      ui.map.button = event.button;
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    });

    plane.addEventListener("pointermove", function (event) {
      if (!ui.map.dragging || event.pointerId !== ui.map.pointerId) {
        return;
      }
      var dist = Math.hypot(event.clientX - ui.map.startX, event.clientY - ui.map.startY);
      if (!ui.map.panning && !ui.map.didOrbit) {
        if (dist < 8) {
          return;
        }
        ui.map.moved = true;
        try {
          plane.setPointerCapture(event.pointerId);
        } catch (err) {
          /* ignore */
        }
        ui.map.lastX = event.clientX;
        ui.map.lastY = event.clientY;
        if (ui.map.orbiting) {
          ui.map.didOrbit = true;
          plane.classList.add("is-orbiting");
        } else {
          ui.map.panning = true;
          ui.map.userAdjusted = true;
          if (Nexus.Board3D) {
            Nexus.Board3D.setUserAdjusted(true);
          }
          plane.classList.add("is-dragging");
        }
        return;
      }
      var dx = event.clientX - ui.map.lastX;
      var dy = event.clientY - ui.map.lastY;
      ui.map.lastX = event.clientX;
      ui.map.lastY = event.clientY;
      if (ui.map.orbiting || ui.map.didOrbit) {
        if (Nexus.Board3D) {
          Nexus.Board3D.orbit(dx, dy);
        }
      } else if (Nexus.Board3D) {
        Nexus.Board3D.pan(dx, dy);
      }
    });

    function endDrag(event) {
      if (event.pointerId !== ui.map.pointerId) {
        return;
      }
      ui.map.dragging = false;
      ui.map.panning = false;
      ui.map.orbiting = false;
      ui.map.didOrbit = false;
      ui.map.pointerId = null;
      plane.classList.remove("is-dragging");
      plane.classList.remove("is-orbiting");
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
      if (Nexus.Board3D) {
        Nexus.Board3D.setUserAdjusted(false);
      }
      fitMapToView(true);
    });
  }

  function fillIcons() {
    Array.prototype.forEach.call(document.querySelectorAll(".token-icon"), function (node) {
      var key = node.getAttribute("data-res");
      node.innerHTML = (Nexus.RESOURCE_ICONS && Nexus.RESOURCE_ICONS[key]) || "";
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
      homeOpen: false,
      tradeOpen: false,
      tradePick: { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "money", wantAmount: 1 },
      map: { scale: 1, tx: 0, ty: 0, dragging: false, panning: false, moved: false, lastX: 0, lastY: 0, startX: 0, startY: 0, pointerId: null, userAdjusted: false }
    };
    Nexus.closeModal(document.getElementById("setup-screen"));
    if (Nexus.Board3D) {
      Nexus.Board3D.setUserAdjusted(false);
    }
    commit(Nexus.startGame(setupChoice.count, setupChoice.lengthId));
  }

  document.getElementById("btn-start-game").addEventListener("click", startNewGame);

  /* ---------- Spielaktionen ---------- */

  document.getElementById("btn-role-reveal-ok").addEventListener("click", function () {
    commit(Nexus.acknowledgeRoleReveal(state));
  });

  document.getElementById("btn-handoff-ok").addEventListener("click", function () {
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
    var next = Nexus.proposeTrade(state, pick.partnerId, pick.giveKey, pick.giveAmount || 1, pick.wantKey, pick.wantAmount || 1);
    if (next === state) {
      Nexus.pushToast(tradeFailToast(state, pick));
      triggerControlShake(document.getElementById("btn-trade-confirm"));
      return;
    }
    commit(next);
  });

  document.getElementById("btn-trade-interrupt").addEventListener("click", function () {
    var pending = (state.tradeOffers || []).filter(function (item) {
      return item.status === "pending" && item.fromId === Nexus.currentPlayer(state).id;
    }).slice(-1)[0];
    if (!pending) {
      triggerControlShake(document.getElementById("btn-trade-interrupt"));
      Nexus.pushToast("Zuerst ein Angebot senden.");
      return;
    }
    ui.tradeOpen = false;
    var next = Nexus.beginTradeInterrupt(state, pending.id);
    if (next === state) {
      triggerControlShake(document.getElementById("btn-trade-interrupt"));
      return;
    }
    commit(next);
  });

  function tradeFailToast(state, pick) {
    var offer = Nexus.getTradeOffer(state, pick.partnerId, pick.giveKey, pick.giveAmount || 1, pick.wantKey, pick.wantAmount || 1);
    if (offer.reason === "mixed_standard") {
      return "Unterschiedliche Standards — kein Handel.";
    }
    return "Angebot nicht möglich.";
  }

  ["trade-give-amount", "trade-want-amount"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) {
      return;
    }
    el.addEventListener("change", function () {
      var value = Math.max(1, Math.min(9, Number(el.value) || 1));
      el.value = String(value);
      if (id === "trade-give-amount") {
        ui.tradePick.giveAmount = value;
      } else {
        ui.tradePick.wantAmount = value;
      }
      Nexus.render(state, ui);
    });
  });

  document.getElementById("btn-trade-accept").addEventListener("click", function () {
    var id = document.getElementById("btn-trade-accept").getAttribute("data-offer");
    if (!id) {
      return;
    }
    commit(Nexus.respondTrade(state, id, true));
  });

  document.getElementById("btn-trade-decline").addEventListener("click", function () {
    var id = document.getElementById("btn-trade-decline").getAttribute("data-offer");
    if (!id) {
      return;
    }
    commit(Nexus.respondTrade(state, id, false));
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
    } else {
      triggerControlShake(document.getElementById("btn-sae-upgrade"));
      Nexus.pushToast("SAE braucht V2X oder Ladenetz auf einem Verkehrsfeld.");
    }
  });

  document.getElementById("btn-end-round").addEventListener("click", function () {
    if (!Nexus.canEndTurn(state)) {
      triggerControlShake(document.getElementById("btn-end-round"));
      Nexus.pushToast("Startcoupon: erst ein Nachbarfeld platzieren.");
      return;
    }
    clearHarvestTimer();
    ui.expandSlot = null;
    ui.tradeOpen = false;
    ui.inspectedPlayerId = null;
    commit(Nexus.endTurn(state), { skipAutoHarvest: true });
  });

  document.getElementById("map-viewport").addEventListener("click", function (event) {
    if (ui.map.moved) {
      ui.map.moved = false;
      return;
    }
    if (!Nexus.Board3D || !Nexus.Board3D.pick) {
      return;
    }
    var hit = Nexus.Board3D.pick(event.clientX, event.clientY);
    if (!hit) {
      return;
    }

    if (hit.kind === "home") {
      ui.expandSlot = null;
      ui.inspectedZoneId = null;
      ui.inspectedDevice = null;
      if (hit.mine) {
        ui.homeOpen = true;
        ui.inspectedPlayerId = null;
      } else {
        ui.homeOpen = false;
        ui.inspectedPlayerId = hit.ownerId;
      }
      Nexus.render(state, ui);
      return;
    }

    if (hit.kind === "owned" && hit.zoneId) {
      ui.inspectedZoneId = hit.zoneId;
      ui.homeOpen = false;
      ui.expandSlot = null;
      ui.inspectedDevice = null;
      Nexus.render(state, ui);
      if (isDockSheet()) {
        setDockOpen(true);
      }
      return;
    }

    if (hit.kind !== "empty" || !hit.open || state.turnPhase !== "build") {
      return;
    }
    ui.expandSlot = {
      q: Number(hit.q),
      r: Number(hit.r),
      type: null
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
    var type = button.getAttribute("data-zone-type");
    var variants =
      (Nexus.ZONE_VARIANTS && Nexus.ZONE_VARIANTS[type]) ||
      (Nexus.ZONE_TYPES[type] && Nexus.ZONE_TYPES[type].variants) ||
      (type === "energy"
        ? [{ id: "solar" }, { id: "transformer" }]
        : type === "datacenter"
          ? [{ id: "insecure" }, { id: "secure" }]
          : []);
    if (variants.length) {
      ui.expandSlot = {
        q: ui.expandSlot.q,
        r: ui.expandSlot.r,
        type: type
      };
      Nexus.render(state, ui);
      return;
    }
    var slot = ui.expandSlot;
    ui.expandSlot = null;
    var next = Nexus.buyZone(state, slot.q, slot.r, type, null);
    if (next !== state) {
      ui.placePopZoneId = "zone-" + slot.q + "-" + slot.r;
      commit(next);
    }
  });

  document.getElementById("expand-variants").addEventListener("click", function (event) {
    var button = event.target.closest("[data-zone-variant]");
    if (!button || button.disabled || !ui.expandSlot || !ui.expandSlot.type) {
      return;
    }
    var slot = ui.expandSlot;
    var variant = button.getAttribute("data-zone-variant");
    ui.expandSlot = null;
    var next = Nexus.buyZone(state, slot.q, slot.r, slot.type, variant);
    if (next !== state) {
      ui.placePopZoneId = "zone-" + slot.q + "-" + slot.r;
      commit(next);
    }
  });

  document.getElementById("btn-expand-cancel").addEventListener("click", function () {
    if (ui.expandSlot && ui.expandSlot.type) {
      ui.expandSlot = { q: ui.expandSlot.q, r: ui.expandSlot.r, type: null };
      Nexus.render(state, ui);
      return;
    }
    ui.expandSlot = null;
    Nexus.closeModal(document.getElementById("expand-modal"));
    Nexus.render(state, ui);
  });

  document.getElementById("zone-inspect-actions").addEventListener("click", function (event) {
    var up = event.target.closest("#btn-zone-upgrade");
    if (up) {
      if (!ui.inspectedZoneId) {
        return;
      }
      var upgraded = Nexus.upgradeZone(state, ui.inspectedZoneId);
      if (upgraded === state) {
        triggerControlShake(up);
        Nexus.pushToast("Ausbau nicht möglich.");
        return;
      }
      commit(upgraded);
      return;
    }
    var down = event.target.closest("#btn-zone-demolish");
    if (down) {
      if (!ui.inspectedZoneId) {
        return;
      }
      var razed = Nexus.demolishZone(state, ui.inspectedZoneId);
      if (razed === state) {
        triggerControlShake(down);
        Nexus.pushToast("Abriss würde das Netz trennen oder ist nicht erlaubt.");
        return;
      }
      ui.inspectedZoneId = null;
      commit(razed);
    }
  });

  document.getElementById("home-upgrade-wrap").addEventListener("click", function (event) {
    var btn = event.target.closest("#btn-home-upgrade");
    if (!btn) {
      return;
    }
    var homeZone = null;
    state.zones.forEach(function (zone) {
      if (zone.type === "home" && zone.ownerId === Nexus.currentPlayer(state).id) {
        homeZone = zone;
      }
    });
    if (!homeZone) {
      return;
    }
    var next = Nexus.upgradeZone(state, homeZone.id);
    if (next === state) {
      triggerControlShake(btn);
      Nexus.pushToast("Leitstand-Ausbau nicht möglich.");
      return;
    }
    commit(next);
  });

  document.getElementById("device-list").addEventListener("click", function (event) {
    var room = event.target.closest("[data-device]");
    if (!room) {
      return;
    }
    var id = room.getAttribute("data-device");
    ui.inspectedDevice = ui.inspectedDevice === id ? null : id;
    ui.inspectedZoneId = null;
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

  function setCamPitch(value) {
    prefs.camPitch = Math.max(0, Math.min(100, Number(value)));
    if (!Number.isFinite(prefs.camPitch)) {
      prefs.camPitch = 58;
    }
    applyAppearance();
    if (state.screen === "game") {
      Nexus.render(state, ui);
      fitMapToView(true);
    }
  }

  function closeSettingsPanels(exceptWrap) {
    Array.prototype.forEach.call(document.querySelectorAll(".settings-wrap"), function (wrap) {
      var panel = wrap.querySelector(".settings-panel");
      if (panel && wrap !== exceptWrap) {
        panel.hidden = true;
      }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".js-settings-btn"), function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      var wrap = btn.closest(".settings-wrap");
      var panel = wrap && wrap.querySelector(".settings-panel");
      if (!panel) {
        return;
      }
      closeSettingsPanels(wrap);
      panel.hidden = !panel.hidden;
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".js-theme-toggle"), function (toggle) {
    toggle.addEventListener("click", function () {
      this.classList.add("is-init");
      prefs.theme = prefs.theme === "light" ? "dark" : "light";
      applyAppearance();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".js-ui-scale"), function (slider) {
    slider.addEventListener("input", function () {
      setUiScale(this.value);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".js-cam-pitch"), function (slider) {
    slider.addEventListener("input", function () {
      setCamPitch(this.value);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".scale-presets"), function (presets) {
    presets.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-ui-scale]");
      if (!btn) {
        return;
      }
      setUiScale(btn.getAttribute("data-ui-scale"));
    });
  });

  document.addEventListener("click", function (event) {
    var insideSettings = event.target.closest(".settings-wrap");
    if (!insideSettings) {
      closeSettingsPanels(null);
    }
  });

  /* ---------- Dock: Rail auf dem Desktop, Sheet auf schmalen Geräten ---------- */

  var dockSheetQuery = window.matchMedia("(max-width: 880px), (max-height: 560px)");

  function isDockSheet() {
    return dockSheetQuery.matches;
  }

  function setDockOpen(open) {
    var dock = document.getElementById("dock");
    var toggle = document.getElementById("btn-dock-toggle");
    if (!dock) {
      return;
    }
    dock.classList.toggle("is-open", !!open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  document.getElementById("btn-dock-toggle").addEventListener("click", function () {
    var dock = document.getElementById("dock");
    setDockOpen(!dock.classList.contains("is-open"));
  });

  document.getElementById("btn-dock-close").addEventListener("click", function () {
    setDockOpen(false);
  });

  dockSheetQuery.addEventListener("change", function () {
    setDockOpen(false);
    refreshMapAfterChrome();
  });

  /* Verblassende Unterkante nur zeigen, wenn im Dock wirklich etwas unter der Kante liegt */
  var dockScroll = document.querySelector(".dock-scroll");

  function syncDockScrollHint() {
    var dock = document.getElementById("dock");
    if (!dock || !dockScroll) {
      return;
    }
    var hidden = dockScroll.scrollHeight - dockScroll.clientHeight;
    var atEnd = dockScroll.scrollTop + dockScroll.clientHeight >= dockScroll.scrollHeight - 4;
    dock.classList.toggle("is-scrollable", hidden > 6 && !atEnd);
  }

  if (dockScroll) {
    dockScroll.addEventListener("scroll", syncDockScrollHint, { passive: true });
    if (window.ResizeObserver) {
      new window.ResizeObserver(syncDockScrollHint).observe(dockScroll);
    } else {
      window.addEventListener("resize", syncDockScrollHint);
    }
  }
  Nexus.syncDockScrollHint = syncDockScrollHint;

  /* Legende ist Lernhilfe: auf flachen Fenstern zu, sonst offen — Wahl bleibt gespeichert */
  var legendEl = document.getElementById("board-legend");
  if (legendEl) {
    var storedLegend = localStorage.getItem("nexus-legend-open");
    legendEl.open =
      storedLegend === null ? window.innerHeight >= 860 || isDockSheet() : storedLegend === "1";
    legendEl.addEventListener("toggle", function () {
      localStorage.setItem("nexus-legend-open", legendEl.open ? "1" : "0");
      syncDockScrollHint();
    });
  }

  applyAppearance();
  fillIcons();
  renderSetupScreen();
  setupMapControls();
  Nexus.openModal(document.getElementById("setup-screen"));

  if (/\bqa=1\b/.test(location.search || "")) {
    Nexus.__qa = {
      getState: function () {
        return state;
      },
      getUi: function () {
        return ui;
      },
      commit: commit,
      fillCity: function () {
        var next = state;
        var existing = {};
        (next.zones || []).forEach(function (zone) {
          existing[zone.q + "," + zone.r] = true;
        });
        var types = [
          ["residential", null],
          ["energy", "solar"],
          ["energy", "transformer"],
          ["datacenter", "secure"],
          ["datacenter", "insecure"],
          ["traffic", null]
        ];
        var extra = (next.zones || []).slice();
        Nexus.boardSlots().forEach(function (slot, index) {
          if (existing[slot.key]) {
            return;
          }
          var spec = types[index % types.length];
          var owner = next.players[index % next.players.length];
          extra.push({
            id: "zone-" + slot.q + "-" + slot.r,
            q: slot.q,
            r: slot.r,
            type: spec[0],
            variant: spec[1],
            ownerId: owner.id,
            upgradeLevel: index % 3,
            harvested: true,
            lastYield: null
          });
        });
        next = Object.assign({}, next, {
          zones: extra,
          screen: "game",
          turnPhase: "build"
        });
        commit(next, { skipAutoHarvest: true });
      }
    };
  }
})();
