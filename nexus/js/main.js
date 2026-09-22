window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createSetupState();
  /* Anleitung ist UI-Zustand, keine Spielfase.
     mode "tour": Übungsdistrikt vom Setup oder aus der Hilfe.
     mode "live": Hilfe über der laufenden Partie (Inhalt / Tippen).
     resumeState: echte Partie, die nach der Übung wiederhergestellt wird. */
  var tutorial = {
    active: false,
    index: 0,
    practiceBase: null,
    practiceKey: "",
    mode: "tour",
    tocOpen: false,
    pick: false,
    resumeState: null,
    resumeUi: null
  };
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
    uiScale: Number(localStorage.getItem("nexus-ui-scale") || "1")
  };
  if (prefs.uiScale < 0.8 || prefs.uiScale > 1.25 || Number.isNaN(prefs.uiScale)) {
    prefs.uiScale = 1;
  }

  /* Klick auf einen gesperrten Knopf: wackeln und den Grund nennen, nicht schweigen */
  document.addEventListener(
    "pointerdown",
    function (event) {
      if (tutorial.active || !document.elementsFromPoint) {
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
    /* Während der Anleitung keine echten Züge buchen. Szenen setzt showTutorialStep direkt. */
    if (tutorial.active && !options.allowDuringTutorial) {
      return;
    }
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

  /* Das Board hat eine eigene Grid-Zelle — hier nur Luft für Kartensteuerung
     und Coach-Zeile, keine Overlay-Messung mehr. */
  function mapSafeRect() {
    var plane = document.querySelector(".city-plane");
    if (!plane) {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
    var pad = { top: 12, right: 12, bottom: 50, left: 12 };
    return {
      x: pad.left,
      y: pad.top,
      w: Math.max(120, plane.clientWidth - pad.left - pad.right),
      h: Math.max(120, plane.clientHeight - pad.top - pad.bottom)
    };
  }

  function boardFocus() {
    return Nexus.boardView().focus;
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

  function centerOnFocus(scale) {
    var safe = mapSafeRect();
    var focus = boardFocus();
    ui.map.tx = safe.x + safe.w / 2 - (focus.x + focus.w / 2) * scale;
    ui.map.ty = safe.y + safe.h / 2 - (focus.y + focus.h / 2) * scale;
  }

  function fitMapToView(force) {
    if (ui.map.userAdjusted && !force) {
      applyMapTransform();
      return;
    }
    var plane = document.querySelector(".city-plane");
    if (!plane || !plane.clientWidth) {
      applyMapTransform();
      return;
    }
    ui.map.scale = clampMapScale(minMapScale());
    centerOnFocus(ui.map.scale);
    applyMapTransform();
  }

  function minMapScale() {
    var plane = document.querySelector(".city-plane");
    if (!plane || !plane.clientWidth) {
      return Nexus.CONSTANTS.MAP_MIN_SCALE;
    }
    var safe = mapSafeRect();
    var focus = boardFocus();
    var pad = Nexus.CONSTANTS.MAP_FIT_PADDING || 0.96;
    return Math.min(safe.w / focus.w, safe.h / focus.h) * pad;
  }

  function clampMapScale(scale) {
    return Math.min(Nexus.CONSTANTS.MAP_MAX_SCALE, Math.max(minMapScale(), scale));
  }

  function clampMapPan() {
    var plane = document.querySelector(".city-plane");
    if (!plane || !plane.clientWidth) {
      return;
    }
    var scale = ui.map.scale;
    if (scale <= minMapScale() + 0.002) {
      centerOnFocus(scale);
      ui.map.userAdjusted = false;
      return;
    }
    var safe = mapSafeRect();
    var focus = boardFocus();
    var midX = safe.x + safe.w / 2;
    var midY = safe.y + safe.h / 2;
    ui.map.tx = Math.min(midX - focus.x * scale, Math.max(midX - (focus.x + focus.w) * scale, ui.map.tx));
    ui.map.ty = Math.min(midY - focus.y * scale, Math.max(midY - (focus.y + focus.h) * scale, ui.map.ty));
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
        ui.inspectedPlayerId = null;
      } else {
        ui.homeOpen = false;
        ui.inspectedPlayerId = home.getAttribute("data-owner");
      }
      Nexus.render(state, ui);
      return;
    }

    var owned = event.target.closest(".hex-owned[data-zone]");
    if (owned) {
      ui.inspectedZoneId = owned.getAttribute("data-zone");
      ui.homeOpen = false;
      ui.expandSlot = null;
      ui.inspectedDevice = null;
      Nexus.render(state, ui);
      if (isDockSheet()) {
        setDockOpen(true);
      }
      return;
    }

    var empty = event.target.closest(".hex-empty.is-open");
    if (!empty || state.turnPhase !== "build") {
      return;
    }
    ui.expandSlot = {
      q: Number(empty.getAttribute("data-q")),
      r: Number(empty.getAttribute("data-r")),
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
    if (tutorial.active) {
      requestAnimationFrame(placeCurrentTutorial);
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
    if (tutorial.active) {
      return;
    }
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

  var TUTORIAL_MODALS = [
    "trade-modal",
    "home-modal",
    "expand-modal",
    "trade-respond-modal",
    "event-modal",
    "role-reveal-modal",
    "handoff-modal",
    "public-player-modal",
    "end-screen"
  ];

  function dismissTutorialModals() {
    TUTORIAL_MODALS.forEach(function (id) {
      if (Nexus.hideModalNow) {
        Nexus.hideModalNow(document.getElementById(id));
      }
    });
  }

  function tutorialStep() {
    return (Nexus.TUTORIAL_STEPS || [])[tutorial.index] || null;
  }

  function resetTutorialUi() {
    ui.expandSlot = null;
    ui.inspectedDevice = null;
    ui.inspectedPlayerId = null;
    ui.inspectedZoneId = null;
    ui.homeOpen = false;
    ui.tradeOpen = false;
    ui.investorAwaitingResource = false;
    ui.tutorialRedact = !!tutorial.active;
    ui.tradePick = { partnerId: null, giveKey: "energy", giveAmount: 1, wantKey: "money", wantAmount: 1 };
  }

  function openTutorialSettings(which) {
    closeSettingsPanels(null);
    var sel = which === "hud" ? "#app .settings-wrap--hud .settings-panel" : "#setup-screen .settings-panel";
    var panel = document.querySelector(sel);
    if (panel) {
      panel.hidden = false;
    }
  }

  function tutorialWantsDock(step) {
    if (!step || !isDockSheet()) {
      return false;
    }
    var sel = step.targetSheet || step.target || "";
    if (sel.indexOf("btn-dock-toggle") !== -1) {
      return false;
    }
    if (step.dock) {
      return true;
    }
    return /goal-panel|tracks-card|zone-inspect|standards-bar|board-legend|btn-dock-close/.test(sel);
  }

  function ensurePracticeBase() {
    var key = setupChoice.count + ":" + setupChoice.lengthId;
    if (!tutorial.practiceBase || tutorial.practiceKey !== key) {
      tutorial.practiceBase = Nexus.startGame(setupChoice.count, setupChoice.lengthId);
      tutorial.practiceKey = key;
      ui.map.userAdjusted = false;
    }
    return tutorial.practiceBase;
  }

  function firstExpandSlot(view) {
    var rec = Nexus.recommendExpandSlot(view);
    if (rec) {
      return rec;
    }
    var found = null;
    Nexus.boardSlots().forEach(function (slot) {
      if (found) {
        return;
      }
      if (Nexus.isExpandableSlot(view, slot.q, slot.r)) {
        found = slot;
      }
    });
    return found;
  }

  function applyTutorialScene(step) {
    resetTutorialUi();
    if (!step || step.scene === "setup") {
      dismissTutorialModals();
      Nexus.openModal(document.getElementById("setup-screen"));
      if (step && step.settings) {
        openTutorialSettings(step.settings);
      } else {
        closeSettingsPanels(null);
      }
      setDockOpen(false);
      return;
    }
    ensurePracticeBase();
    if (Nexus.hideModalNow) {
      Nexus.hideModalNow(document.getElementById("setup-screen"));
    }
    dismissTutorialModals();
    state = Nexus.tutorialView(tutorial.practiceBase, step.scene);
    var player = Nexus.currentPlayer(state);
    if (step.scene === "zone" && player) {
      var home = null;
      state.zones.forEach(function (zone) {
        if (!home && zone.type === "home" && zone.ownerId === player.id) {
          home = zone;
        }
      });
      if (home) {
        ui.inspectedZoneId = home.id;
      }
    }
    if (step.scene === "expand" || step.scene === "expand-variant") {
      var slot = firstExpandSlot(state);
      if (slot) {
        ui.expandSlot = { q: slot.q, r: slot.r };
        if (step.scene === "expand-variant") {
          ui.expandSlot.type = "energy";
        }
      }
    }
    if (step.scene === "home" || step.scene === "home-device" || step.scene === "sae") {
      ui.homeOpen = true;
    }
    if (step.scene === "home-device") {
      ui.inspectedDevice = "thermostat";
    }
    if (step.scene === "trade" && player) {
      var partner = null;
      state.players.forEach(function (candidate) {
        if (!partner && candidate.id !== player.id) {
          partner = candidate;
        }
      });
      ui.tradeOpen = true;
      ui.tradePick = {
        partnerId: partner ? partner.id : null,
        giveKey: "energy",
        giveAmount: 1,
        wantKey: "money",
        wantAmount: 1
      };
    }
    if (step.scene === "public" && player) {
      var other = null;
      state.players.forEach(function (candidate) {
        if (!other && candidate.id !== player.id) {
          other = candidate;
        }
      });
      ui.inspectedPlayerId = other ? other.id : null;
    }
    if (step.legend) {
      var legend = document.getElementById("board-legend");
      if (legend) {
        legend.open = true;
      }
    }
    if (isDockSheet()) {
      setDockOpen(tutorialWantsDock(step));
    }
    if (step.settings) {
      openTutorialSettings(step.settings);
    } else {
      closeSettingsPanels(null);
    }
    Nexus.render(state, ui);
    if (Nexus.syncDockScrollHint) {
      Nexus.syncDockScrollHint();
    }
  }

  function tutorialMeta() {
    return {
      tocOpen: tutorial.tocOpen,
      pick: tutorial.pick,
      live: tutorial.mode === "live",
      skipSetup: tutorial.mode === "live" || !!tutorial.resumeState
    };
  }

  function firstPlayableTutorialIndex() {
    var steps = Nexus.TUTORIAL_STEPS || [];
    var i;
    for (i = 0; i < steps.length; i++) {
      if (steps[i].scene !== "setup") {
        return i;
      }
    }
    return 0;
  }

  function snapshotUiForResume() {
    return {
      expandSlot: ui.expandSlot,
      inspectedDevice: ui.inspectedDevice,
      inspectedPlayerId: ui.inspectedPlayerId,
      inspectedZoneId: ui.inspectedZoneId,
      investorAwaitingResource: ui.investorAwaitingResource,
      homeOpen: ui.homeOpen,
      tradeOpen: ui.tradeOpen,
      tradePick: {
        partnerId: ui.tradePick.partnerId,
        giveKey: ui.tradePick.giveKey,
        giveAmount: ui.tradePick.giveAmount,
        wantKey: ui.tradePick.wantKey,
        wantAmount: ui.tradePick.wantAmount
      },
      map: {
        scale: ui.map.scale,
        tx: ui.map.tx,
        ty: ui.map.ty,
        userAdjusted: ui.map.userAdjusted
      }
    };
  }

  function restoreUiFromResume(snap) {
    if (!snap) {
      return;
    }
    ui.expandSlot = snap.expandSlot;
    ui.inspectedDevice = snap.inspectedDevice;
    ui.inspectedPlayerId = snap.inspectedPlayerId;
    ui.inspectedZoneId = snap.inspectedZoneId;
    ui.investorAwaitingResource = snap.investorAwaitingResource;
    ui.homeOpen = snap.homeOpen;
    ui.tradeOpen = snap.tradeOpen;
    ui.tradePick = snap.tradePick || ui.tradePick;
    if (snap.map) {
      ui.map.scale = snap.map.scale;
      ui.map.tx = snap.map.tx;
      ui.map.ty = snap.map.ty;
      ui.map.userAdjusted = snap.map.userAdjusted;
    }
  }

  function placeCurrentTutorial() {
    if (!tutorial.active || !Nexus.placeTutorial) {
      return;
    }
    var step = tutorialStep();
    if (!tutorial.tocOpen && !tutorial.pick && !step) {
      return;
    }
    Nexus.placeTutorial(step, tutorial.index, Nexus.TUTORIAL_STEPS.length, tutorialMeta());
    var card = document.getElementById("tutorial-card");
    if (card && document.activeElement !== card && !tutorial.pick) {
      card.focus({ preventScroll: true });
    }
  }

  function showTutorialStep() {
    var step = tutorialStep();
    if (!step && !tutorial.tocOpen && !tutorial.pick) {
      return;
    }
    document.body.classList.add("is-tutorial");
    if (tutorial.mode === "live") {
      ui.tutorialRedact = false;
      if (tutorial.tocOpen || tutorial.pick) {
        placeCurrentTutorial();
        return;
      }
      if (step && tryRevealLiveChrome(step)) {
        Nexus.render(state, ui);
      }
      requestAnimationFrame(placeCurrentTutorial);
      return;
    }
    if (tutorial.tocOpen && !step) {
      placeCurrentTutorial();
      return;
    }
    applyTutorialScene(step);
    if (step.scene === "setup") {
      placeCurrentTutorial();
      return;
    }
    requestAnimationFrame(function () {
      fitMapToView(false);
      requestAnimationFrame(placeCurrentTutorial);
    });
  }

  function tryRevealLiveChrome(step) {
    var changed = false;
    if (step.dock && isDockSheet() && !document.body.classList.contains("dock-open")) {
      setDockOpen(true);
      changed = true;
    }
    if (step.settings) {
      openTutorialSettings(step.settings);
      changed = true;
    }
    if (step.legend) {
      var legend = document.getElementById("board-legend");
      if (legend && !legend.open) {
        legend.open = true;
        changed = true;
      }
    }
    return changed;
  }

  function liveTargetVisible(step) {
    if (!step || !Nexus.resolveTutorialTarget) {
      return false;
    }
    tryRevealLiveChrome(step);
    var el = Nexus.resolveTutorialTarget(step);
    return !!(el && Nexus.tutorialElVisible(el));
  }

  function enterPracticeFromHelp(index) {
    if (!tutorial.resumeState) {
      tutorial.resumeState = state;
      tutorial.resumeUi = snapshotUiForResume();
    }
    tutorial.mode = "tour";
    tutorial.pick = false;
    tutorial.tocOpen = false;
    tutorial.index = index;
    tutorial.practiceBase = null;
    tutorial.practiceKey = "";
    ui.tutorialRedact = true;
    showTutorialStep();
  }

  function jumpToTutorial(index) {
    var steps = Nexus.TUTORIAL_STEPS || [];
    if (index < 0 || index >= steps.length) {
      return;
    }
    var step = steps[index];
    tutorial.tocOpen = false;
    tutorial.pick = false;
    tutorial.index = index;
    if (tutorial.mode === "live") {
      if (step.scene === "setup") {
        return;
      }
      if (liveTargetVisible(step)) {
        showTutorialStep();
        return;
      }
      /* Thema ist in der laufenden Partie nicht offen: kurze Übung, Partie bleibt gespeichert. */
      enterPracticeFromHelp(index);
      return;
    }
    showTutorialStep();
  }

  function toggleTutorialToc() {
    if (!tutorial.active || tutorial.pick) {
      return;
    }
    tutorial.tocOpen = !tutorial.tocOpen;
    placeCurrentTutorial();
  }

  function toggleTutorialPick() {
    if (!tutorial.active || tutorial.mode !== "live") {
      return;
    }
    tutorial.pick = !tutorial.pick;
    tutorial.tocOpen = false;
    placeCurrentTutorial();
  }

  function matchTutorialPick(event) {
    var steps = Nexus.TUTORIAL_STEPS || [];
    var best = -1;
    var bestArea = Infinity;
    var i;
    for (i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (step.scene === "setup") {
        continue;
      }
      var el = Nexus.resolveTutorialTarget ? Nexus.resolveTutorialTarget(step) : null;
      if (!el || !Nexus.tutorialElVisible(el)) {
        continue;
      }
      if (!el.contains(event.target) && event.target !== el) {
        continue;
      }
      var rect = el.getBoundingClientRect();
      var area = Math.max(1, rect.width * rect.height);
      if (area < bestArea) {
        bestArea = area;
        best = i;
      }
    }
    return best;
  }

  function startTutorial() {
    tutorial.active = true;
    tutorial.mode = "tour";
    tutorial.index = 0;
    tutorial.practiceBase = null;
    tutorial.practiceKey = "";
    tutorial.tocOpen = false;
    tutorial.pick = false;
    tutorial.resumeState = null;
    tutorial.resumeUi = null;
    ui.tutorialRedact = true;
    showTutorialStep();
  }

  function startInGameHelp() {
    if (tutorial.active) {
      return;
    }
    if (state.screen !== "game") {
      return;
    }
    if (Nexus.isHotSeatShield(state)) {
      Nexus.pushToast("Hilfe erst nach der Übergabe.");
      return;
    }
    closeSettingsPanels(null);
    tutorial.active = true;
    tutorial.mode = "live";
    tutorial.index = firstPlayableTutorialIndex();
    tutorial.practiceBase = null;
    tutorial.practiceKey = "";
    tutorial.tocOpen = true;
    tutorial.pick = false;
    tutorial.resumeState = null;
    tutorial.resumeUi = null;
    ui.tutorialRedact = false;
    showTutorialStep();
  }

  function exitTutorial() {
    var resume = tutorial.resumeState;
    var resumeUi = tutorial.resumeUi;
    var wasLiveOnly = tutorial.mode === "live" && !resume;
    tutorial.active = false;
    tutorial.index = 0;
    tutorial.practiceBase = null;
    tutorial.practiceKey = "";
    tutorial.mode = "tour";
    tutorial.tocOpen = false;
    tutorial.pick = false;
    tutorial.resumeState = null;
    tutorial.resumeUi = null;
    clearHarvestTimer();
    ui.tutorialRedact = false;
    dismissTutorialModals();
    closeSettingsPanels(null);
    if (Nexus.clearTutorial) {
      Nexus.clearTutorial();
    }
    if (resume) {
      /* Hilfe aus der Partie: Übungsansicht weg, echte Partie wiederherstellen. */
      state = resume;
      restoreUiFromResume(resumeUi);
      Nexus.render(state, ui);
      if (Nexus.syncDockScrollHint) {
        Nexus.syncDockScrollHint();
      }
      requestAnimationFrame(function () {
        fitMapToView(false);
      });
      return;
    }
    if (wasLiveOnly) {
      /* Live-Hilfe ohne Übung: Partie und UI unverändert lassen. */
      Nexus.render(state, ui);
      return;
    }
    /* Tour vom Setup: Übungsdistrikt verwerfen. */
    resetTutorialUi();
    setDockOpen(false);
    state = Nexus.createSetupState();
    renderSetupScreen();
    Nexus.openModal(document.getElementById("setup-screen"));
  }

  function nextTutorial() {
    if (!tutorial.active || tutorial.tocOpen || tutorial.pick) {
      return;
    }
    if (tutorial.index >= Nexus.TUTORIAL_STEPS.length - 1) {
      exitTutorial();
      return;
    }
    tutorial.index += 1;
    if (tutorial.mode === "live") {
      jumpToTutorial(tutorial.index);
      return;
    }
    showTutorialStep();
  }

  function prevTutorial() {
    if (!tutorial.active || tutorial.tocOpen || tutorial.pick || tutorial.index <= 0) {
      return;
    }
    tutorial.index -= 1;
    if (tutorial.mode === "live") {
      jumpToTutorial(tutorial.index);
      return;
    }
    showTutorialStep();
  }

  function swallowTutorialPointer(event) {
    if (!tutorial.active) {
      return;
    }
    if (event.target && event.target.closest && event.target.closest("#tutorial-card")) {
      return;
    }
    if (tutorial.pick) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "pointerdown") {
        var hit = matchTutorialPick(event);
        if (hit >= 0) {
          jumpToTutorial(hit);
        }
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  document.addEventListener("pointerdown", swallowTutorialPointer, true);
  document.addEventListener("click", swallowTutorialPointer, true);

  document.addEventListener(
    "keydown",
    function (event) {
      if (!tutorial.active) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (tutorial.pick) {
          tutorial.pick = false;
          placeCurrentTutorial();
          return;
        }
        if (tutorial.tocOpen && tutorial.mode === "tour" && !tutorial.resumeState) {
          tutorial.tocOpen = false;
          placeCurrentTutorial();
          return;
        }
        exitTutorial();
      } else if (event.key === "ArrowRight" || event.key === "Enter") {
        if (tutorial.tocOpen || tutorial.pick) {
          return;
        }
        event.preventDefault();
        nextTutorial();
      } else if (event.key === "ArrowLeft") {
        if (tutorial.tocOpen || tutorial.pick) {
          return;
        }
        event.preventDefault();
        prevTutorial();
      }
    },
    true
  );

  document.getElementById("btn-tutorial").addEventListener("click", startTutorial);
  document.getElementById("btn-help").addEventListener("click", startInGameHelp);
  document.getElementById("btn-tutorial-next").addEventListener("click", nextTutorial);
  document.getElementById("btn-tutorial-back").addEventListener("click", prevTutorial);
  document.getElementById("btn-tutorial-exit").addEventListener("click", exitTutorial);
  document.getElementById("btn-tutorial-toc").addEventListener("click", toggleTutorialToc);
  document.getElementById("btn-tutorial-pick").addEventListener("click", toggleTutorialPick);
  document.getElementById("tutorial-toc-list").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-tutorial-index]");
    if (!btn) {
      return;
    }
    var index = Number(btn.getAttribute("data-tutorial-index"));
    if (Number.isNaN(index)) {
      return;
    }
    jumpToTutorial(index);
  });

  applyAppearance();
  fillIcons();
  renderSetupScreen();
  setupMapControls();
  Nexus.openModal(document.getElementById("setup-screen"));
})();
