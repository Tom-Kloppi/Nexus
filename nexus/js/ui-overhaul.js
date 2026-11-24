window.Nexus = window.Nexus || {};

/* Oberfläche für Markt, Feldmenü, Hilfe, Speicher, Debug. Keine Regeln. */
(function (Nexus) {
  var api = null;
  var menu;
  var tip;
  var guide;
  var debugPanel;
  var devRunPanel;
  var fan;
  var inbox;
  var drawBtn;
  var pressureHost;
  var chapter;
  var tipTimer = 0;
  var holdTimer = 0;
  var lineDraft = [];
  var devRun = false;
  var difficulty = "normal";
  var beginner = false;
  var audio;
  var lastPhase = "";
  var suppressClose = false;
  var winPlayed = false;
  var buildMenuState = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function beep(freq, dur) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + dur);
    } catch (err) {
      /* ohne Audio bleibt das Spiel still */
    }
  }

  Nexus.Sfx = {
    muted: false,
    play: function (name) {
      if (Nexus.Sfx.muted) {
        return;
      }
      if (name === "build") {
        beep(520, 0.08);
      } else if (name === "card") {
        beep(660, 0.07);
      } else if (name === "roll") {
        beep(340, 0.12);
      } else if (name === "error") {
        beep(180, 0.14);
      } else if (name === "win") {
        beep(720, 0.16);
      }
    }
  };

  function place(node, x, y) {
    var width = node.offsetWidth || 220;
    var height = node.offsetHeight || 80;
    var left = Math.min(window.innerWidth - width - 8, Math.max(8, x));
    var top = Math.min(window.innerHeight - height - 8, Math.max(8, y));
    node.style.left = left + "px";
    node.style.top = top + "px";
  }

  function figureMarkup(kind) {
    /* Geld: gleiches Markup wie Ressourcen-Chip (Kreis + S), nicht leerer Ring. */
    if ((kind === "money" || kind === "coin") && Nexus.RESOURCE_MARKUP && Nexus.RESOURCE_MARKUP.money) {
      return (
        "<svg class='nx-fig' viewBox='0 0 24 24' aria-hidden='true'><g fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>" +
        Nexus.RESOURCE_MARKUP.money +
        "</g></svg>"
      );
    }
    if (kind === "bolt" && Nexus.RESOURCE_MARKUP && Nexus.RESOURCE_MARKUP.energy) {
      return (
        "<svg class='nx-fig' viewBox='0 0 24 24' aria-hidden='true'><g fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>" +
        Nexus.RESOURCE_MARKUP.energy +
        "</g></svg>"
      );
    }
    if (kind === "arrows" && Nexus.RESOURCE_MARKUP && Nexus.RESOURCE_MARKUP.bandwidth) {
      return (
        "<svg class='nx-fig' viewBox='0 0 24 24' aria-hidden='true'><g fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>" +
        Nexus.RESOURCE_MARKUP.bandwidth +
        "</g></svg>"
      );
    }
    if (kind === "more") {
      return (
        "<svg class='nx-fig nx-fig--more' viewBox='0 0 24 24' aria-hidden='true'>" +
        "<circle cx='5' cy='12' r='2' fill='currentColor' stroke='none'/>" +
        "<circle cx='12' cy='12' r='2' fill='currentColor' stroke='none'/>" +
        "<circle cx='19' cy='12' r='2' fill='currentColor' stroke='none'/>" +
        "</svg>"
      );
    }
    var paths = {
      bolt: "M13 2 L6 14 H12 L10 22 L18 10 H12 Z",
      coin: "M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 M12 8 V16",
      money: "M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 M12 8 V16",
      arrows: "M12 3 V21 M8 7 L12 3 L16 7 M8 17 L12 21 L16 17",
      shield: "M12 3 L19 6 V12 C19 17 12 21 12 21 C12 21 5 17 5 12 V6 Z",
      bus: "M6 6 H18 V16 H6 Z M8 16 V19 M16 16 V19 M9 9 H15",
      link: "M9 12 H15 M8 9 H10 A3 3 0 0 1 10 15 H8 M16 9 H14 A3 3 0 0 0 14 15 H16",
      leaf: "M6 18 C6 10 12 4 20 4 C18 12 12 18 6 18 Z"
    };
    var d = paths[kind] || paths.bolt;
    return "<svg class='nx-fig' viewBox='0 0 24 24' aria-hidden='true'><path d='" + d + "'/></svg>";
  }

  function showTip() {
    if (tip) {
      tip.hidden = true;
    }
    return;
  }

  function hideTip() {
    tip.hidden = true;
  }

  function bindTips() {
    document.body.addEventListener("mouseover", function (event) {
      var host = event.target.closest("[data-gloss], [data-help]");
      if (!host) {
        return;
      }
      window.clearTimeout(tipTimer);
      tipTimer = window.setTimeout(function () {
        var gloss = host.getAttribute("data-gloss");
        var entry = gloss && Nexus.glossaryEntry ? Nexus.glossaryEntry(gloss) : null;
        var help = host.getAttribute("data-help") || "";
        if (entry) {
          showTip(entry.title, entry.short, entry.example, event.clientX, event.clientY, entry.figure);
        } else if (help) {
          showTip(host.getAttribute("data-help-title") || "Hinweis", help, "", event.clientX, event.clientY, "bolt");
        }
      }, 280);
    });
    document.body.addEventListener("mouseout", function (event) {
      var host = event.target.closest("[data-gloss], [data-help]");
      if (!host || host.contains(event.relatedTarget)) {
        return;
      }
      window.clearTimeout(tipTimer);
      hideTip();
    });
    document.body.addEventListener("pointerdown", function (event) {
      if (menu && !menu.hidden && !menu.contains(event.target)) {
        closeMenu();
      }
      var host = event.target.closest("[data-gloss], [data-help]");
      if (!host) {
        return;
      }
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(function () {
        host.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: event.clientX, clientY: event.clientY }));
      }, 450);
    });
    document.body.addEventListener("pointerup", function () {
      window.clearTimeout(holdTimer);
    });
  }

  function closeMenu() {
    menu.hidden = true;
    menu.innerHTML = "";
    menu.classList.remove("field-menu--build", "field-menu--layer2", "field-menu--layer3");
    buildMenuState = null;
  }

  function applyAction(action) {
    var state = api.getState();
    if (!action.enabled) {
      Nexus.Sfx.play("error");
      if (Nexus.pushToast) {
        Nexus.pushToast(action.reason || "Geht gerade nicht.");
      }
      return;
    }
    if (action.id === "line-add") {
      var zone = Nexus.FieldActions.zoneAtHit(state, action.hit);
      if (!zone) {
        return;
      }
      if (lineDraft.indexOf(zone.id) < 0) {
        lineDraft.push(zone.id);
      }
      if (lineDraft.length < 2) {
        if (Nexus.pushToast) {
          Nexus.pushToast("Zweiter Halt für die Linie.");
        }
        closeMenu();
        return;
      }
      openPropulsion(action);
      return;
    }
    var base = state;
    var next = base;
    if (action.id === "build") {
      next = Nexus.buyZone(
        base,
        action.payload.q,
        action.payload.r,
        action.payload.type,
        action.payload.variant,
        action.payload.tileId || action.tileId
      );
    } else if (action.id === "upgrade") {
      next = Nexus.upgradeZone(base, action.zoneId || (action.payload && action.payload.zoneId));
    } else if (action.id === "demolish") {
      next = Nexus.demolishZone(base, action.zoneId || (action.payload && action.payload.zoneId));
    } else if (action.id === "transfer-request") {
      next = Nexus.requestTransfer(
        base,
        (action.payload && action.payload.zoneId) || action.zoneId
      );
    } else if (action.id === "bus-stop") {
      next = Nexus.placeBusStop(base, action.zoneId);
    } else if (action.id === "depot" || action.id === "garage") {
      next = Nexus.setTrafficMode(base, action.zoneId, action.id);
    } else if (action.id === "dc-mode") {
      next = Nexus.setDatacenterMode(base, action.payload.zoneId || action.zoneId, action.payload.variant);
    } else if (action.id === "devices") {
      openDeviceMenu();
      return;
    } else if (action.id === "device") {
      next = Nexus.buildDevice(base, action.payload.deviceId, action.payload.mode);
    } else if (action.id === "line") {
      next = Nexus.openBusLine(base, action.stops, action.propulsion);
      lineDraft = [];
    }
    if (next === base || next === state) {
      Nexus.Sfx.play("error");
      return;
    }
    Nexus.Sfx.play(action.id === "line" ? "card" : "build");
    if (action.id === "build" && action.payload && api.getUi) {
      var uiRef = api.getUi();
      if (uiRef) {
        uiRef.placePopZoneId = "zone-" + action.payload.q + "-" + action.payload.r;
      }
    }
    if (Nexus.Fx && Nexus.Fx.celebrateBoardAction) {
      var fq = null;
      var fr = null;
      if (action.payload && action.payload.q != null) {
        fq = action.payload.q;
        fr = action.payload.r;
      } else if (action.zoneId && next.zones) {
        next.zones.forEach(function (zone) {
          if (zone.id === action.zoneId) {
            fq = zone.q;
            fr = zone.r;
          }
        });
      }
      var fxKind =
        action.id === "upgrade"
          ? "upgrade"
          : action.id === "demolish"
            ? "demolish"
            : action.id === "line"
              ? "line"
              : "build";
      Nexus.Fx.celebrateBoardAction(fxKind, fq, fr);
    }
    closeMenu();
    api.commit(next);
  }

  var SCORE_FX_KEYS = { image: 1, comfort: 1, environment: 1, security: 1, eco: 1, trust: 1, finance: 1, innovation: 1 };

  function fxMarkup(bits) {
    var state = api && api.getState ? api.getState() : null;
    return (bits || [])
      .map(function (bit) {
        var sign = bit.amount > 0 ? "+" : "";
        var icon;
        if (SCORE_FX_KEYS[bit.key] && Nexus.scoreTrackOwnerColor) {
          icon =
            '<span class="fx-dot" style="--fx-dot:' +
            Nexus.scoreTrackOwnerColor(state, bit.key) +
            '" aria-hidden="true"></span>';
        } else if (Nexus.iconGroup) {
          icon =
            '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
            Nexus.iconGroup(bit.key, "currentColor") +
            "</svg>";
        } else {
          icon = "";
        }
        return '<i class="fx-bit' + (bit.amount < 0 ? " is-down" : " is-up") + '">' + icon + "<b>" + sign + bit.amount + "</b></i>";
      })
      .join("");
  }

  function paintAction(action, onClick, host) {
    var button = document.createElement("button");
    button.type = "button";
    button.className =
      "menu-tile" +
      (action.recommended ? " is-recommended" : "") +
      (action.ownMetric ? " is-own-metric" : "");
    button.disabled = !action.enabled;
    var help = action.enabled ? action.why || "" : action.reason || action.why || "";
    button.setAttribute("data-help-title", action.label);
    button.setAttribute("data-help", help);
    var badge =
      action.pointsPreview > 0
        ? '<span class="sp-badge" title="Siegpunkte-Vorschau">+' + action.pointsPreview + " SP</span>"
        : "";
    button.innerHTML =
      "<strong>" +
      action.label +
      badge +
      "</strong><span class='tile-fx'>" +
      (action.fx && action.fx.length ? fxMarkup(action.fx) : action.enabled ? "" : "<em>" + (action.reason || "Geht nicht") + "</em>") +
      "</span>" +
      (action.why ? "<span class='why'>" + action.why + "</span>" : "");
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      onClick();
    });
    (host || menu).appendChild(button);
  }

  function openPropulsion(action) {
    menu.innerHTML = "";
    var choices = [
      { mode: "diesel", label: "Diesel", fx: [{ key: "comfort", amount: 1 }], why: "Gibt der Linie +1 Komfort." },
      { mode: "electric", label: "Elektro", fx: [{ key: "image", amount: 1 }], why: "Gibt +1 Image. Braucht Stromfläche, Ladesäule oder Parkhaus." },
      { mode: "renewable", label: "Öko-Linie", fx: [{ key: "environment", amount: 1 }], why: "Gibt +1 Umwelt. Braucht Solar oder Speicher. Halte zählen für Mira." }
    ];
    choices.forEach(function (choice) {
      paintAction(
        { label: choice.label, enabled: true, why: choice.why, fx: choice.fx },
        function () {
          applyAction({
            id: "line",
            enabled: true,
            stops: lineDraft.slice(),
            propulsion: choice.mode,
            zoneId: action.zoneId
          });
        }
      );
    });
    menu.hidden = false;
  }

  function openDeviceMenu() {
    var offers = Nexus.FieldActions.deviceOffers(api.getState());
    menu.innerHTML = "";
    if (!offers.length) {
      closeMenu();
      return;
    }
    offers.forEach(function (action) {
      paintAction(action, function () {
        applyAction(action);
      });
    });
    menu.hidden = false;
  }

  function openBuildTree(x, y, tree) {
    if (!tree || !tree.groups || !tree.groups.length) {
      closeMenu();
      return;
    }
    buildMenuState = {
      x: x,
      y: y,
      hit: tree.hit,
      tree: tree,
      groupId: null,
      dcStep: null
    };
    renderBuildTree();
  }

  function renderBuildTree() {
    if (!buildMenuState || !menu) {
      return;
    }
    var tree = buildMenuState.tree;
    var groupId = buildMenuState.groupId;
    var dcStep = buildMenuState.dcStep;
    menu.innerHTML = "";
    menu.classList.add("field-menu--build");
    menu.classList.toggle("field-menu--layer2", !!groupId && !dcStep);
    menu.classList.toggle("field-menu--layer3", !!dcStep);

    if (!groupId) {
      var grid = el("div", "field-menu-grid field-menu-grid--l1");
      tree.groups.forEach(function (group) {
        var button = document.createElement("button");
        button.type = "button";
        button.className =
          "menu-tile menu-tile--group menu-tile--icon-only" +
          (group.recommended ? " is-recommended" : "");
        button.disabled = !group.anyEnabled;
        button.setAttribute("aria-label", group.label);
        button.setAttribute("title", group.label);
        button.setAttribute("data-help-title", group.label);
        button.setAttribute(
          "data-help",
          group.anyEnabled ? group.hint || "" : "Hier gerade nichts baubar."
        );
        button.innerHTML = group.figure
          ? figureMarkup(group.figure)
          : "<span class='menu-more' aria-hidden='true'>…</span>";
        button.addEventListener("click", function (event) {
          event.stopPropagation();
          if (!group.anyEnabled) {
            Nexus.Sfx.play("error");
            return;
          }
          buildMenuState.groupId = group.id;
          buildMenuState.dcStep = null;
          renderBuildTree();
        });
        grid.appendChild(button);
      });
      menu.appendChild(grid);
    } else if (dcStep === "modes") {
      var hub = buildMenuState.dcHub;
      if (!hub || !hub.dcModes || !hub.dcModes.length) {
        buildMenuState.dcStep = null;
        renderBuildTree();
        return;
      }
      var bar3 = el("div", "field-menu-bar");
      var back3 = document.createElement("button");
      back3.type = "button";
      back3.className = "btn ghost field-menu-back";
      back3.textContent = "← Zurück";
      back3.addEventListener("click", function (event) {
        event.stopPropagation();
        buildMenuState.dcStep = null;
        buildMenuState.dcHub = null;
        renderBuildTree();
      });
      var title3 = el("strong", "field-menu-layer-title", hub.label || "Rechenzentrum");
      bar3.appendChild(back3);
      bar3.appendChild(title3);
      menu.appendChild(bar3);
      if (hub.capLabel || hub.why) {
        menu.appendChild(
          el("p", "field-menu-dc-hint", hub.capLabel ? hub.capLabel + " · " + (hub.why || "") : hub.why || "")
        );
      }
      var tabs = el("div", "field-menu-dc-tabs");
      hub.dcModes.forEach(function (mode) {
        var tab = document.createElement("button");
        tab.type = "button";
        tab.className =
          "menu-tile field-menu-dc-tab" + (mode.recommended ? " is-recommended" : "");
        tab.disabled = !mode.enabled;
        tab.setAttribute("data-help-title", mode.label);
        tab.setAttribute(
          "data-help",
          mode.enabled ? mode.why || "" : mode.reason || mode.why || ""
        );
        tab.innerHTML =
          "<strong>" +
          mode.label +
          "</strong><span class='tile-fx'>" +
          (mode.fx && mode.fx.length
            ? fxMarkup(mode.fx)
            : mode.enabled
              ? ""
              : "<em>" + (mode.reason || "Geht nicht") + "</em>") +
          "</span>" +
          (mode.why ? "<span class='why'>" + mode.why + "</span>" : "");
        tab.addEventListener("click", function (event) {
          event.stopPropagation();
          mode.hit = buildMenuState.hit;
          applyAction(mode);
        });
        tabs.appendChild(tab);
      });
      menu.appendChild(tabs);
    } else {
      var group = null;
      tree.groups.forEach(function (g) {
        if (g.id === groupId) {
          group = g;
        }
      });
      if (!group) {
        buildMenuState.groupId = null;
        buildMenuState.dcStep = null;
        renderBuildTree();
        return;
      }
      var bar = el("div", "field-menu-bar");
      var back = document.createElement("button");
      back.type = "button";
      back.className = "btn ghost field-menu-back";
      back.textContent = "← Zurück";
      back.addEventListener("click", function (event) {
        event.stopPropagation();
        buildMenuState.groupId = null;
        buildMenuState.dcStep = null;
        buildMenuState.dcHub = null;
        renderBuildTree();
      });
      var title = el("strong", "field-menu-layer-title", group.label);
      bar.appendChild(back);
      bar.appendChild(title);
      menu.appendChild(bar);
      var list = el("div", "field-menu-grid field-menu-grid--l2");
      group.items.forEach(function (action) {
        paintAction(action, function () {
          if (action.kind === "dc-hub" || action.id === "dc-hub") {
            buildMenuState.dcStep = "modes";
            buildMenuState.dcHub = action;
            renderBuildTree();
            return;
          }
          action.hit = buildMenuState.hit;
          applyAction(action);
        }, list);
      });
      menu.appendChild(list);
    }

    menu.hidden = false;
    placeMenu(buildMenuState.x, buildMenuState.y);
  }

  function openMenu(x, y, actions, hit) {
    menu.innerHTML = "";
    menu.classList.remove("field-menu--build", "field-menu--layer2", "field-menu--layer3");
    if (actions && actions.kind === "build-tree") {
      openBuildTree(x, y, actions);
      return;
    }
    if (!actions || !actions.length) {
      closeMenu();
      return;
    }
    actions.forEach(function (action) {
      paintAction(action, function () {
        action.hit = hit;
        var zone = Nexus.FieldActions.zoneAtHit(api.getState(), hit);
        action.zoneId = zone && zone.id;
        applyAction(action);
      });
    });
    menu.hidden = false;
    placeMenu(x, y);
  }

  function placeMenu(x, y) {
    menu.style.left = "0px";
    menu.style.top = "0px";
    var width = Math.min(menu.offsetWidth || 420, window.innerWidth - 24);
    var height = menu.offsetHeight || 88;
    var left = Math.min(window.innerWidth - width - 12, Math.max(8, x - width / 2));
    var top = y - height - 14;
    var floor = window.innerHeight - 118 - height;
    if (top > floor) {
      top = Math.max(72, floor);
    }
    if (top < 64) {
      top = 64;
    }
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function kindLabel(kind) {
    return (
      (Nexus.STADT_AKTE_KIND_LABELS && Nexus.STADT_AKTE_KIND_LABELS[kind]) ||
      (kind === "mandate" ? "Mandat" : kind === "pressure" ? "Druckstück" : "Briefing")
    );
  }

  function cardFxList(card) {
    var fx = [];
    var source = card.effects || (card.mandate && card.mandate.reward) || {};
    if (card.kind === "pressure" && card.pressure) {
      Object.keys(card.pressure.pay || {}).forEach(function (key) {
        if (card.pressure.pay[key]) {
          fx.push({ key: key, amount: -card.pressure.pay[key] });
        }
      });
      if (card.pressure.orRisk) {
        fx.push({ key: "risk", amount: card.pressure.orRisk });
      }
      return fx;
    }
    Object.keys(source).forEach(function (key) {
      if (source[key]) {
        fx.push({ key: key, amount: source[key] });
      }
    });
    return fx;
  }

  function ensurePressureHost() {
    if (pressureHost) {
      return pressureHost;
    }
    pressureHost = el("div", "akte-pressure");
    pressureHost.id = "akte-pressure";
    pressureHost.hidden = true;
    document.body.appendChild(pressureHost);
    return pressureHost;
  }

  function renderPressure(state) {
    var host = ensurePressureHost();
    var pending = state && state.pendingPressure;
    if (!pending || Nexus.isHotSeatShield(state)) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    var to = null;
    var from = null;
    (state.players || []).forEach(function (p) {
      if (p.id === pending.toId) {
        to = p;
      }
      if (p.id === pending.fromId) {
        from = p;
      }
    });
    var card = pending.card || {};
    var pay = (card.pressure && card.pressure.pay) || {};
    var payBits = Object.keys(pay)
      .filter(function (k) {
        return pay[k];
      })
      .map(function (k) {
        return pay[k] + " " + ((Nexus.RESOURCE_LABELS && Nexus.RESOURCE_LABELS[k]) || k);
      })
      .join(" + ");
    host.hidden = false;
    host.innerHTML =
      "<div class='akte-pressure-card'>" +
      "<p class='akte-pressure-kicker'>Druckstück · Antwort für " +
      (to ? to.name : "Mitspieler") +
      "</p>" +
      "<h3>" +
      (card.name || "Akte") +
      "</h3>" +
      "<p>" +
      (card.text || "") +
      "</p>" +
      "<p class='akte-pressure-from'>von " +
      (from ? from.name : "—") +
      "</p>" +
      "<div class='akte-pressure-actions'>" +
      "<button type='button' class='btn' data-choice='pay'>Zahlen (" +
      (payBits || "—") +
      ")</button>" +
      "<button type='button' class='btn btn-ghost' data-choice='risk'>Risiko +" +
      ((card.pressure && card.pressure.orRisk) || 2) +
      "</button>" +
      "</div></div>";
    host.querySelectorAll("[data-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = Nexus.resolvePressure(api.getState(), btn.getAttribute("data-choice"));
        if (next !== api.getState()) {
          Nexus.Sfx.play("card");
          api.commit(next);
        }
      });
    });
  }

  function openPressureTargetPicker(handIndex, card) {
    var state = api.getState();
    var me = Nexus.currentPlayer(state);
    var host = ensurePressureHost();
    var others = (state.players || []).filter(function (p) {
      return me && p.id !== me.id;
    });
    if (!others.length) {
      Nexus.Sfx.play("error");
      return;
    }
    host.hidden = false;
    host.innerHTML =
      "<div class='akte-pressure-card'>" +
      "<p class='akte-pressure-kicker'>Druckstück · Ziel wählen</p>" +
      "<h3>" +
      (card.name || "Akte") +
      "</h3>" +
      "<p>" +
      (card.text || "") +
      "</p>" +
      "<div class='akte-pressure-actions' id='akte-target-list'></div>" +
      "<button type='button' class='btn btn-ghost' id='akte-target-cancel'>Abbrechen</button>" +
      "</div>";
    var list = host.querySelector("#akte-target-list");
    others.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = p.name;
      b.addEventListener("click", function () {
        var next = Nexus.playInnovationCard(api.getState(), handIndex, { targetId: p.id });
        if (next !== api.getState()) {
          Nexus.Sfx.play("card");
          api.commit(next);
        }
      });
      list.appendChild(b);
    });
    var cancel = host.querySelector("#akte-target-cancel");
    if (cancel) {
      cancel.addEventListener("click", function () {
        host.hidden = true;
        host.innerHTML = "";
      });
    }
  }

  function renderFan(state) {
    fan.innerHTML = "";
    var marketLabel = document.createElement("p");
    marketLabel.className = "akte-fan-label";
    marketLabel.textContent = "Ausschreibungen";
    fan.appendChild(marketLabel);
    var market = state.projectMarket || [];
    market.forEach(function (card, index) {
      var offer = Nexus.Projects ? Nexus.Projects.offer(state, index) : { allowed: false, cost: {}, reason: "" };
      var button = document.createElement("button");
      button.style.setProperty("--tilt", (index - 1) * 4 + "deg");
      button.disabled = !offer.allowed || !!state.pendingPressure;
      var costFx = [];
      Object.keys(offer.cost || {}).forEach(function (key) {
        if (offer.cost[key]) {
          costFx.push({ key: key, amount: -offer.cost[key] });
        }
      });
      button.className =
        "project-card dossier-card kind-briefing cat-" + (card.category || "general");
      button.innerHTML =
        '<span class="card-kind">' +
        kindLabel("briefing") +
        '</span><span class="card-title">' +
        card.name +
        '</span><span class="card-cost">' +
        fxMarkup(costFx) +
        '</span><span class="card-fx">' +
        fxMarkup(cardFxList(card)) +
        "</span>";
      button.setAttribute("data-help-title", card.name);
      button.setAttribute(
        "data-help",
        (card.text || "") + (offer.reason && !offer.allowed ? " " + offer.reason : "")
      );
      button.addEventListener("click", function () {
        if (!offer.allowed || state.pendingPressure) {
          Nexus.Sfx.play("error");
          return;
        }
        var base = api.getState();
        var next = Nexus.takeProject(base, index);
        if (next !== base) {
          Nexus.Sfx.play("card");
          api.commit(next);
        }
      });
      fan.appendChild(button);
    });
    if (drawBtn) {
      var drawOffer = Nexus.getInnovationDrawOffer ? Nexus.getInnovationDrawOffer(state) : { allowed: false };
      drawBtn.disabled = !drawOffer.allowed || !!state.pendingPressure;
      drawBtn.title = drawOffer.reason || "Stadtakte ziehen";
      drawBtn.hidden = Nexus.isHotSeatShield(state) || state.screen !== "game";
    }
    inbox.innerHTML = "";
    var shield = Nexus.isHotSeatShield(state);
    var rawHand = shield ? [] : (Nexus.currentPlayer(state) && Nexus.currentPlayer(state).handCards) || [];
    var catOrder = { green: 0, privacy: 1, mobility: 2, general: 3 };
    var kindOrder = { briefing: 0, mandate: 1, pressure: 2 };
    var hand = rawHand
      .map(function (card, index) {
        return { card: card, index: index };
      })
      .sort(function (a, b) {
        var ca = catOrder[a.card.category] != null ? catOrder[a.card.category] : 9;
        var cb = catOrder[b.card.category] != null ? catOrder[b.card.category] : 9;
        if (ca !== cb) {
          return ca - cb;
        }
        var ka = kindOrder[a.card.kind || "briefing"] != null ? kindOrder[a.card.kind || "briefing"] : 9;
        var kb = kindOrder[b.card.kind || "briefing"] != null ? kindOrder[b.card.kind || "briefing"] : 9;
        if (ka !== kb) {
          return ka - kb;
        }
        return a.index - b.index;
      });
    var group = document.createElement("div");
    group.className = "hand-group";
    hand.forEach(function (entry) {
      var card = entry.card;
      var index = entry.index;
      var button = document.createElement("button");
      button.type = "button";
      var kind = card.kind || "briefing";
      button.className = "uno-card dossier-card kind-" + kind + " cat-" + (card.category || "general");
      button.style.setProperty("--tilt", "0deg");
      var meta = "";
      if (kind === "mandate" && card.mandate && card.mandate.need) {
        meta =
          '<span class="card-meta">Ziel: ' +
          ((card.mandate.need.count || 1) + "×") +
          "</span>";
      }
      button.innerHTML =
        '<span class="card-kind">' +
        kindLabel(kind) +
        '</span><span class="card-title">' +
        card.name +
        "</span>" +
        meta +
        '<span class="card-fx">' +
        fxMarkup(cardFxList(card)) +
        "</span>";
      button.setAttribute("data-help-title", card.name);
      button.setAttribute("data-help", card.text || "");
      button.title = card.text || card.name;
      button.addEventListener("click", function () {
        if (api.getState().pendingPressure) {
          Nexus.Sfx.play("error");
          return;
        }
        if (kind === "pressure") {
          openPressureTargetPicker(index, card);
          return;
        }
        var next = Nexus.playInnovationCard(api.getState(), index);
        if (next !== api.getState()) {
          Nexus.Sfx.play("card");
          api.commit(next);
        }
      });
      group.appendChild(button);
    });
    if (hand.length) {
      inbox.appendChild(group);
    }
    renderPressure(state);
  }

  function renderChapter(state) {
    if (chapter) {
      chapter.hidden = true;
    }
    return;
    if (!state || state.screen !== "game" || !Nexus.Arc) {
      chapter.hidden = true;
      return;
    }
    var player = Nexus.currentPlayer(state);
    var mark = player ? Nexus.Arc.milestone(state, player) : null;
    chapter.hidden = false;
    chapter.innerHTML = "<strong>" + (state.chapterIndex || "") + "</strong> " + (state.chapterTitle || "");
  }

  function renderEnd(state) {
    var host = document.getElementById("end-eval");
    if (!host) {
      return;
    }
    host.innerHTML = "";
    if (!state || state.turnPhase !== "gameover" || !state.evaluation) {
      winPlayed = false;
      return;
    }
    if (!winPlayed) {
      winPlayed = true;
      Nexus.Sfx.play("win");
    }
    state.evaluation.forEach(function (row) {
      host.appendChild(el("p", "", row.narrative));
    });
  }

  function renderGuide(which) {
    var body = document.getElementById("guide-body");
    var pages = {
      bogen:
        "Vier Kapitel: Grundversorgung, Vernetzung, Mobilität, Resilienz. Im letzten Kapitel würfelt ein Großereignis gegen eure Vorbereitung.",
      risiko:
        "Eine Risiko-Zahl plus Ursache (Cyber oder Netz). Ab 8 öffnet die Ereigniskarte mit Ursache und Gegensteuern — kein Würfel.",
      mobil:
        "Haltestelle, Busbahnhof, dann eine Linie wie ein Ticket. Diesel, Elektro oder erneuerbar. Antrieb und Halte machen die Linie lesbar."
    };
    body.textContent = pages[which] || pages.bogen;
  }

  function stampHelp(state) {
    document.querySelectorAll(".wallet-item").forEach(function (node) {
      var key = node.getAttribute("data-res");
      if (key === "energy") {
        node.setAttribute("data-gloss", "energie");
      }
      if (key === "money") {
        node.setAttribute("data-gloss", "geld");
      }
      if (key === "bandwidth") {
        node.setAttribute("data-gloss", "daten");
      }
    });
    var risk = document.getElementById("risk-pill") || document.querySelector(".risk-pill");
    if (risk) {
      risk.setAttribute("data-gloss", "cyber");
      var who = state && Nexus.currentPlayer ? Nexus.currentPlayer(state) : null;
      var view = who && who.riskView;
      if (!view && state && who && Nexus.Risk && Nexus.Risk.preview) {
        view = Nexus.Risk.preview(state, who);
      }
      if (view) {
        risk.setAttribute("data-help-title", "Risiko " + view.total);
        risk.setAttribute(
          "data-help",
          view.summary ||
            (view.topLabel || "Stadtdruck") +
              ". Ab " +
              (view.threshold || 8) +
              " Ereignis."
        );
      }
    }
  }

  function ensureDevRunPanel() {
    if (devRunPanel) {
      return devRunPanel;
    }
    devRunPanel = el("aside", "debug-panel dev-run-panel");
    var events = Nexus.EVENTS || [];
    var options = events
      .map(function (ev) {
        return "<option value='" + ev.id + "'>" + (ev.major ? "★ " : "") + (ev.title || ev.id) + "</option>";
      })
      .join("");
    devRunPanel.innerHTML =
      "<p><strong>Dev-Run</strong></p>" +
      "<label>Ereignis<select id='dev-event-select'>" +
      options +
      "</select></label>" +
      "<button type='button' id='dev-event-fire'>Ereignis starten</button>" +
      "<p>Special einmalig freischalten</p>" +
      "<button type='button' id='dev-tile-stop'>Halt</button>" +
      "<button type='button' id='dev-tile-garage'>Garagen</button>" +
      "<button type='button' id='dev-tile-depot'>E-Taxi</button>" +
      "<button type='button' id='dev-tile-park'>Park</button>" +
      "<button type='button' id='dev-tile-workshop'>Werkstatt</button>" +
      "<button type='button' id='dev-fill-city'>Stadt füllen</button>";
    document.body.appendChild(devRunPanel);
    devRunPanel.addEventListener("click", function (event) {
      if (!api || !api.getState) {
        return;
      }
      var state = api.getState();
      if (!state || !state.devRun) {
        return;
      }
      var id = event.target && event.target.id;
      if (id === "dev-event-fire") {
        var select = document.getElementById("dev-event-select");
        var eventId = select && select.value;
        var next = Nexus.devForceEvent(state, eventId);
        if (next !== state) {
          api.commit(next, { skipAutoHarvest: true });
        }
        return;
      }
      var tileMap = {
        "dev-tile-stop": "taxi",
        "dev-tile-garage": "garage",
        "dev-tile-depot": "taxi",
        "dev-tile-park": "park",
        "dev-tile-workshop": "workshop"
      };
      if (tileMap[id] && Nexus.devForceSpecialTile) {
        var tiled = Nexus.devForceSpecialTile(state, tileMap[id]);
        if (tiled !== state) {
          api.commit(tiled, { skipAutoHarvest: true });
        }
        return;
      }
      if (id === "dev-fill-city" && api.fillCity) {
        api.fillCity();
      }
    });
    return devRunPanel;
  }

  function sync(state) {
    if (!state) {
      return;
    }
    renderFan(state);
    renderChapter(state);
    renderEnd(state);
    stampHelp(state);
    if (state.devRun && state.screen === "game") {
      ensureDevRunPanel().hidden = false;
    } else if (devRunPanel) {
      devRunPanel.hidden = true;
    }
    var note = document.querySelector(".js-gfx-note");
    if (note && Nexus.Quality) {
      var st = Nexus.Quality.state();
      note.textContent = "Stufe " + (Nexus.Quality.LABELS[st.tier] || st.tier) + ", Grenze " + (Nexus.Quality.LABELS[st.cap] || st.cap);
    }
    if (state.turnPhase !== lastPhase && state.turnPhase === "risk") {
      Nexus.Sfx.play("roll");
    }
    lastPhase = state.turnPhase || "";
    if (debugPanel && !debugPanel.hidden && Nexus.Board3D && Nexus.Board3D.debugSnapshot) {
      var snap = Nexus.Board3D.debugSnapshot();
      var fps = document.getElementById("debug-fps");
      if (fps) {
        var tier = Nexus.Quality ? Nexus.Quality.state().tier : "";
        var gov = Nexus.Quality ? Nexus.Quality.log().slice(-1)[0] : null;
        fps.textContent =
          "FPS " +
          (snap.fps || "–") +
          " · " +
          tier +
          " · Knoten " +
          (snap.graphNodes || 0) +
          " · Autos " +
          ((snap.cars && snap.cars.length) || 0) +
          (gov ? " · " + gov.reason : "");
      }
    }
  }

  function setupOptions() {
    return { difficulty: difficulty, beginner: beginner, devRun: devRun };
  }

  function install(nextApi) {
    api = nextApi;
    menu = el("div", "field-menu");
    menu.hidden = true;
    tip = el("div", "nx-tip");
    tip.hidden = true;
    tip.setAttribute("role", "tooltip");
    guide = el("aside", "guide-panel");
    guide.hidden = true;
    guide.innerHTML =
      "<h2>Überblick</h2><div class='guide-tabs'>" +
      "<button type='button' data-guide='bogen'>Bogen</button>" +
      "<button type='button' data-guide='karma'>Karma</button>" +
      "<button type='button' data-guide='mobil'>Mobilität</button>" +
      "</div><p id='guide-body'></p><button type='button' id='btn-dialog-placeholder'>Intro-Platzhalter</button>" +
      "<p><button type='button' id='btn-save'>Speichern</button> <button type='button' id='btn-load'>Laden</button></p>";
    fan = el("div", "project-fan dossier-fan");
    fan.id = "project-fan";
    inbox = el("div", "hand-fan dossier-hand");
    inbox.id = "hand-fan";
    drawBtn = el("button", "btn akte-draw", "Akte ziehen");
    drawBtn.type = "button";
    drawBtn.id = "btn-draw-akte";
    drawBtn.addEventListener("click", function () {
      var base = api.getState();
      var next = Nexus.drawInnovationCard(base);
      if (next !== base) {
        Nexus.Sfx.play("card");
        api.commit(next);
      } else {
        Nexus.Sfx.play("error");
      }
    });
    chapter = el("div", "chapter-chip");
    chapter.hidden = true;
    document.body.appendChild(menu);
    document.body.appendChild(tip);
    document.body.appendChild(guide);
    var cardsRail = document.getElementById("tray-cards-rail") || document.querySelector(".tray-cards-rail");
    if (cardsRail) {
      cardsRail.appendChild(drawBtn);
      cardsRail.appendChild(fan);
      cardsRail.appendChild(inbox);
    } else {
      var tray = document.querySelector(".tray-grid");
      if (tray) {
        tray.insertBefore(fan, tray.firstChild);
        tray.insertBefore(drawBtn, fan.nextSibling);
      } else {
        document.body.appendChild(drawBtn);
      }
      document.body.appendChild(inbox);
    }
    ensurePressureHost();
    var top = document.querySelector(".topbar-row--main");
    if (top) {
      top.insertBefore(chapter, top.querySelector(".wallet"));
    }
    var dock = document.getElementById("dock");
    if (dock) {
      dock.classList.add("is-tab-goals");
      var tabs = el("div", "dock-tabs");
      [["goals", "Ziele"], ["market", "Markt"], ["field", "Feld"], ["city", "Stadt"]].forEach(
        function (pair) {
          var button = el("button", "btn", pair[1]);
          button.type = "button";
          button.addEventListener("click", function () {
            dock.classList.remove("is-tab-goals", "is-tab-field", "is-tab-city", "is-tab-market");
            dock.classList.add("is-tab-" + pair[0]);
          });
          tabs.appendChild(button);
        }
      );
      dock.insertBefore(tabs, dock.firstChild);
    }
    var end = document.querySelector(".end-card");
    if (end) {
      var evalNode = el("div", "end-eval");
      evalNode.id = "end-eval";
      end.insertBefore(evalNode, document.getElementById("btn-restart"));
    }
    if (window.location.search.indexOf("debug") !== -1) {
      debugPanel = el("aside", "debug-panel");
      debugPanel.innerHTML =
        "<p id='debug-fps'>Debug</p>" +
        "<button type='button' id='debug-cam'>Kamera-Extrem</button>" +
        "<button type='button' id='debug-night'>Tag/Nacht</button>" +
        "<button type='button' id='debug-biome'>Biom</button>" +
        "<label>Dichte <input id='debug-density' type='range' min='0' max='2' step='1' value='1'></label>" +
        "<button type='button' id='debug-wire'>Wireframe</button>" +
        "<button type='button' id='debug-copy'>Perf-Bericht kopieren</button>";
      document.body.appendChild(debugPanel);
      var density = document.getElementById("debug-density");
      if (density) {
        density.addEventListener("input", function (event) {
          if (Nexus.Board3D && Nexus.Board3D.setDensity) {
            Nexus.Board3D.setDensity(Number(event.target.value));
          }
        });
      }
      debugPanel.addEventListener("click", function (event) {
        var id = event.target.id;
        if (!Nexus.Board3D) {
          return;
        }
        if (id === "debug-cam" && Nexus.Board3D.debugCamera) {
          Nexus.Board3D.debugCamera();
        }
        if (id === "debug-night") {
          var root = document.documentElement;
          root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
          if (Nexus.Board3D.setTheme) {
            Nexus.Board3D.setTheme();
          }
        }
        if (id === "debug-biome" && Nexus.Board3D.setBiome) {
          var order = ["grass", "desert", "water"];
          var current = order.indexOf(document.body.getAttribute("data-biome") || "grass");
          var nextBiome = order[(current + 1) % order.length];
          document.body.setAttribute("data-biome", nextBiome);
          Nexus.Board3D.setBiome(nextBiome);
        }
        if (id === "debug-wire" && Nexus.Board3D.setWirePick) {
          Nexus.Board3D.setWirePick();
        }
        if (id === "debug-copy") {
          var snap = Nexus.Board3D.debugSnapshot ? Nexus.Board3D.debugSnapshot() : {};
          var report = {
            tier: Nexus.Quality ? Nexus.Quality.state() : null,
            params: Nexus.Quality ? Nexus.Quality.snapshot() : null,
            log: Nexus.Quality ? Nexus.Quality.log() : [],
            board: snap
          };
          var text = JSON.stringify(report);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
          }
          if (Nexus.pushToast) {
            Nexus.pushToast("Perf-Bericht kopiert.");
          }
        }
      });
    }
    document.querySelectorAll(".js-board-quality").forEach(function (host) {
      host.innerHTML = "";
      ["auto", "minimal", "low", "medium", "high", "ultra"].forEach(function (id, i) {
        var label = Nexus.Quality ? Nexus.Quality.LABELS[id] : id;
        var button = el("button", "btn set-level");
        button.type = "button";
        button.style.setProperty("--lvl", String(i + 1));
        button.setAttribute("data-board-quality", id);
        button.setAttribute("aria-label", label);
        button.setAttribute("aria-pressed", (localStorage.getItem("nexus-board-quality") || "auto") === id ? "true" : "false");
        var help = {
          auto: "Misst das Gerät und bleibt unter der Kalibrierungsgrenze.",
          minimal: "Wenig Verkehr, keine Kulisse, 30 FPS. Für schwache Grafik.",
          low: "Kleine Stadt, kein Weichzeichnen.",
          medium: "Alltag. Schatten aus, 60 FPS als Ziel.",
          high: "Volle Props und Weichzeichnen.",
          ultra: "Höchste Auflösung, optional Schatten. Kann ruckeln."
        };
        button.setAttribute("data-help-title", Nexus.Quality ? Nexus.Quality.LABELS[id] : id);
        button.setAttribute("data-help", help[id]);
        host.appendChild(button);
      });
      var extra = el("div", "gfx-row");
      [["30", "30 FPS"], ["60", "60 FPS"]].forEach(function (pair) {
        var button = el("button", "btn", pair[1]);
        button.type = "button";
        button.setAttribute("data-help-title", pair[1]);
        button.setAttribute("data-help", "Obergrenze für die Bildrate. 30 spart Akku und Wärme.");
        button.setAttribute("data-gfx-fps", pair[0]);
        var fpsNow = Nexus.Quality && Nexus.Quality.state ? String(Nexus.Quality.state().fpsTarget) : "60";
        button.classList.toggle("is-selected", fpsNow === pair[0]);
        button.addEventListener("click", function () {
          if (Nexus.Quality) {
            Nexus.Quality.setFps(Number(pair[0]));
            window.localStorage.setItem("nexus-gfx-fps", pair[0]);
            host.parentNode.querySelectorAll("[data-gfx-fps]").forEach(function (node) {
              node.classList.toggle("is-selected", node.getAttribute("data-gfx-fps") === pair[0]);
            });
            if (api && api.refreshGfx) {
              api.refreshGfx();
            }
          }
        });
        extra.appendChild(button);
      });
      var battery = el("button", "btn", "Akku sparen");
      battery.type = "button";
      battery.setAttribute("data-help-title", "Akku sparen");
      battery.setAttribute("data-help", "Deckt die Stufe bei Niedrig und die Bildrate bei 30.");
      if (Nexus.Quality && Nexus.Quality.state) {
        battery.classList.toggle("is-selected", !!Nexus.Quality.state().battery);
      }
      battery.addEventListener("click", function () {
        if (!Nexus.Quality) {
          return;
        }
        var on = !Nexus.Quality.state().battery;
        Nexus.Quality.setBattery(on);
        battery.classList.toggle("is-selected", on);
        if (api && api.refreshGfx) {
          api.refreshGfx();
        }
      });
      extra.appendChild(battery);
      host.parentNode.appendChild(extra);
      var toggles = el("div", "gfx-row");
      [
        ["shadows", "Schatten"],
        ["fog", "Nebel"],
        ["particles", "Partikel"],
        ["traffic", "Verkehr"],
        ["backdrop", "Weichzeichnen"]
      ].forEach(function (pair) {
        var button = el("button", "btn", pair[1]);
        button.type = "button";
        button.setAttribute("data-help-title", pair[1]);
        button.setAttribute("data-help", "Ein Klick schaltet aus, nochmal stellt den Stufen-Standard wieder her.");
        if (Nexus.Quality && Nexus.Quality.state) {
          button.classList.toggle("is-selected", Nexus.Quality.state().toggles[pair[0]] === false);
        }
        button.addEventListener("click", function () {
          if (!Nexus.Quality) {
            return;
          }
          var current = Nexus.Quality.state().toggles[pair[0]];
          var next = current === false ? null : false;
          Nexus.Quality.setToggle(pair[0], next);
          button.classList.toggle("is-selected", next === false);
          if (api && api.refreshGfx) {
            api.refreshGfx();
          }
        });
        toggles.appendChild(button);
      });
      host.parentNode.appendChild(toggles);
      var note = el("p", "gfx-note", "");
      note.classList.add("js-gfx-note");
      host.parentNode.appendChild(note);
    });
    document.getElementById("setup-difficulty").addEventListener("click", function (event) {
      var button = event.target.closest("[data-difficulty]");
      if (!button) {
        return;
      }
      difficulty = button.getAttribute("data-difficulty");
      document.querySelectorAll("#setup-difficulty .setup-choice").forEach(function (node) {
        node.classList.toggle("is-selected", node === button);
      });
    });
    document.getElementById("btn-dev-run").addEventListener("click", function () {
      devRun = !devRun;
      this.classList.toggle("is-selected", devRun);
      this.setAttribute("aria-pressed", devRun ? "true" : "false");
    });
    document.getElementById("setup-beginner").addEventListener("change", function (event) {
      beginner = !!event.target.checked;
    });
    document.getElementById("btn-guide").addEventListener("click", function () {
      guide.hidden = !guide.hidden;
      renderGuide("bogen");
    });
    guide.addEventListener("click", function (event) {
      var key = event.target.getAttribute && event.target.getAttribute("data-guide");
      if (key) {
        renderGuide(key);
      }
      if (event.target.id === "btn-dialog-placeholder" && Nexus.Dialog) {
        var step = Nexus.Dialog.start();
        if (step && Nexus.pushToast) {
          Nexus.pushToast(step.speaker + ": " + step.text);
        }
      }
      if (event.target.id === "btn-save") {
        var raw = JSON.stringify(api.getState());
        window.localStorage.setItem("nexus-save", raw);
        if (Nexus.pushToast) {
          Nexus.pushToast("Partie gespeichert.");
        }
      }
      if (event.target.id === "btn-load") {
        var saved = window.localStorage.getItem("nexus-save");
        if (!saved) {
          return;
        }
        api.commit(JSON.parse(saved));
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        guide.hidden = true;
      }
      if (event.key === "u" && api) {
        var undone = Nexus.undo(api.getState());
        if (undone !== api.getState()) {
          api.commit(undone);
        }
      }
    });
    var viewport = document.getElementById("map-viewport");
    if (viewport) {
      viewport.addEventListener(
        "click",
        function (event) {
          if (!api || !Nexus.Board3D || !Nexus.Board3D.pick) {
            return;
          }
          var state = api.getState();
          var ui = api.getUi();
          if (!state || state.turnPhase !== "build" || (ui.map && ui.map.moved)) {
            return;
          }
          var hit = Nexus.Board3D.pick(event.clientX, event.clientY);
          if (!hit) {
            closeMenu();
            return;
          }
          event.stopPropagation();
          event.stopImmediatePropagation();
          suppressClose = true;
          var actions = Nexus.FieldActions.forHit(state, hit);
          openMenu(event.clientX, event.clientY, actions, hit);
          if (hit.open === false && hit.blockedReason && Nexus.pushToast) {
            Nexus.pushToast(hit.blockedReason);
          }
        },
        true
      );
    }
    document.addEventListener("click", function (event) {
      if (suppressClose) {
        suppressClose = false;
        return;
      }
      if (!menu.hidden && !menu.contains(event.target)) {
        closeMenu();
      }
    });
    bindTips();
    var previous = Nexus.render;
    Nexus.render = function (state, ui) {
      if (previous) {
        previous(state, ui);
      }
      sync(state);
    };
  }

  Nexus.UIOverhaul = {
    install: install,
    setupOptions: setupOptions,
    sync: sync
  };
})(window.Nexus);
