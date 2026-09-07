window.Nexus = window.Nexus || {};

(function (Nexus) {
  var C = Nexus.CONSTANTS;
  var lastResourceSnapshot = null;
  var lastPlayerId = null;

  function formatNumber(value) {
    if (typeof value === "number" && value % 1 !== 0) {
      return String(Math.round(value * 10) / 10);
    }
    return String(value);
  }

  function playerColor(player) {
    return Nexus.PLAYER_COLORS[player.colorIndex % Nexus.PLAYER_COLORS.length];
  }

  function setDigitGroup(el, value, animate) {
    if (!el) {
      return;
    }
    var str = String(value);
    el.classList.remove("is-animating");
    el.replaceChildren();
    var chars = str.split("");
    chars.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "t-digit";
      span.textContent = ch;
      if (i === chars.length - 2) {
        span.dataset.stagger = "1";
      } else if (i === chars.length - 1) {
        span.dataset.stagger = "2";
      }
      el.appendChild(span);
    });
    if (animate) {
      void el.offsetHeight;
      el.classList.add("is-animating");
    }
  }

  function chipsHtml(cost) {
    return Nexus.RESOURCE_KEYS.filter(function (key) {
      return (cost[key] || 0) > 0;
    })
      .map(function (key) {
        return (
          '<span class="chip chip-' +
          key +
          '" title="' +
          Nexus.RESOURCE_LABELS[key] +
          '">' +
          Nexus.RESOURCE_ICONS[key] +
          "<b>" +
          cost[key] +
          "</b></span>"
        );
      })
      .join("");
  }

  function bindCardFanOnce() {
    var root = document.getElementById("hand-fan");
    if (!root || root.dataset.hoverBound) {
      return;
    }
    root.dataset.hoverBound = "1";

    function num(name, fallback) {
      var value = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    }

    function ease(name, fallback) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    function avatars() {
      return Array.prototype.slice.call(root.querySelectorAll(".t-avatar"));
    }

    function setShifts(activeIdx, phase) {
      var lift = num("--avatar-lift", -42);
      var falloff = num("--avatar-falloff", 0.32);
      var scale = num("--avatar-scale", 1.08);
      var timing =
        phase === "out"
          ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
          : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
      avatars().forEach(function (el, i) {
        el.style.transitionTimingFunction = timing;
        if (activeIdx == null) {
          el.style.setProperty("--shift", "0px");
          el.style.setProperty("--scale-active", "1");
          el.style.removeProperty("--fan-rot-live");
          el.style.zIndex = "";
          return;
        }
        var distance = Math.abs(i - activeIdx);
        el.style.setProperty("--shift", (lift * Math.pow(falloff, distance)).toFixed(3) + "px");
        el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
        if (i === activeIdx) {
          el.style.setProperty("--fan-rot-live", "0deg");
          el.style.zIndex = "20";
        } else {
          el.style.removeProperty("--fan-rot-live");
          el.style.zIndex = String(10 - distance);
        }
      });
    }

    root.addEventListener("mouseover", function (event) {
      var item = event.target.closest(".t-avatar");
      if (!item || !root.contains(item)) {
        return;
      }
      if (event.relatedTarget && item.contains(event.relatedTarget)) {
        return;
      }
      var idx = avatars().indexOf(item);
      if (idx < 0) {
        return;
      }
      setShifts(idx, "in");
    });

    root.addEventListener("mouseout", function (event) {
      var item = event.target.closest(".t-avatar");
      if (!item) {
        return;
      }
      var next = event.relatedTarget;
      if (next && item.contains(next)) {
        return;
      }
      if (next && root.contains(next) && next.closest(".t-avatar")) {
        return;
      }
      setShifts(null, "out");
    });
  }

  function formatZoneYield(zone) {
    if (!zone || !zone.lastYield) {
      return "Noch nicht produziert";
    }
    if (zone.type === "home" && zone.lastYield.homeBundle) {
      return "+1 aller Ressourcen";
    }
    var yieldData = zone.lastYield;
    if (!yieldData.primary) {
      return "Noch nicht produziert";
    }
    var text =
      "+" + yieldData.primary.amount + " " + Nexus.RESOURCE_SHORT[yieldData.primary.resource];
    if (yieldData.secondary) {
      text +=
        " · +" +
        yieldData.secondary.amount +
        " " +
        Nexus.RESOURCE_SHORT[yieldData.secondary.resource];
    }
    return text;
  }

  function riskPips(count) {
    var html = "";
    var i;
    for (i = 0; i < count; i++) {
      html += '<span class="pip"></span>';
    }
    return html || '<span class="pip" style="opacity:0.15"></span>';
  }

  function hexPoints(cx, cy, size) {
    var points = [];
    var i;
    for (i = 0; i < 6; i++) {
      var angle = (Math.PI / 180) * (60 * i - 30);
      points.push(cx + size * Math.cos(angle) + "," + (cy + size * Math.sin(angle)));
    }
    return points.join(" ");
  }

  function dieWeightTotal() {
    return Nexus.PRODUCTION_DICE.reduce(function (sum, die) {
      return sum + die.weight;
    }, 0);
  }

  function dieSettleRatio(dieId) {
    var total = dieWeightTotal();
    var before = 0;
    var width = 0;
    Nexus.PRODUCTION_DICE.forEach(function (die) {
      if (die.id === dieId) {
        before = total;
        width = die.weight;
      }
      total += die.weight;
    });
    return (before + width / 2) / total;
  }

  function openModal(shell) {
    if (!shell) {
      return;
    }
    shell.hidden = false;
    var card = shell.querySelector(".t-modal");
    shell.classList.remove("is-closing");
    if (card) {
      card.classList.remove("is-closing");
    }
    requestAnimationFrame(function () {
      shell.classList.add("is-open");
      if (card) {
        card.classList.add("is-open");
      }
    });
  }

  function closeModal(shell, done) {
    if (!shell || shell.hidden) {
      if (done) {
        done();
      }
      return;
    }
    var card = shell.querySelector(".t-modal");
    shell.classList.remove("is-open");
    shell.classList.add("is-closing");
    if (card) {
      card.classList.remove("is-open");
      card.classList.add("is-closing");
    }
    var ms =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")) ||
      150;
    setTimeout(function () {
      shell.classList.remove("is-closing");
      if (card) {
        card.classList.remove("is-closing");
      }
      shell.hidden = true;
      if (done) {
        done();
      }
    }, ms);
  }

  var toastBanners = [];
  var toastSpreadBound = false;

  function toastMs(name, fallback) {
    var value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function bindToastSpreadOnce() {
    var stack = document.getElementById("toast-stack");
    if (!stack || toastSpreadBound) {
      return;
    }
    toastSpreadBound = true;
    var spreadHeight = function () {
      return (stack.offsetHeight + toastMs("--stack-spread-gap", 8)) * 2;
    };
    var within = function (event, above) {
      var rect = stack.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY <= rect.bottom &&
        event.clientY >= rect.top - above
      );
    };
    document.addEventListener("pointermove", function (event) {
      if (stack.classList.contains("is-spread")) {
        if (!within(event, spreadHeight())) {
          stack.classList.remove("is-spread");
        }
      } else if (within(event, 0)) {
        stack.classList.add("is-spread");
      }
    });
  }

  function dismissToastBanner(el) {
    if (!el || el.classList.contains("is-leaving")) {
      return;
    }
    el.classList.add("is-leaving");
    setTimeout(function () {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      toastBanners = toastBanners.filter(function (item) {
        return item !== el;
      });
      toastBanners.forEach(function (banner, index) {
        if (!banner.classList.contains("is-leaving")) {
          banner.setAttribute("data-depth", String(index));
        }
      });
    }, toastMs("--stack-close", 250) + 60);
  }

  function pushToast(text) {
    var stack = document.getElementById("toast-stack");
    if (!stack || !text) {
      return;
    }
    bindToastSpreadOnce();
    var el = document.createElement("div");
    el.className = "t-stack-banner is-enter";
    el.setAttribute("data-depth", "0");
    el.textContent = text;
    toastBanners.unshift(el);
    stack.appendChild(el);
    toastBanners.forEach(function (banner, index) {
      if (index === 0) {
        return;
      }
      if (index > 2) {
        dismissToastBanner(banner);
      } else {
        banner.setAttribute("data-depth", String(index));
      }
    });
    toastBanners = toastBanners.slice(0, 3).concat(
      toastBanners.slice(3).filter(function (banner) {
        return banner.classList.contains("is-leaving");
      })
    );
    void el.offsetWidth;
    el.classList.remove("is-enter");
    setTimeout(function () {
      dismissToastBanner(el);
    }, 3200);
  }

  function spawnFloat(resource, amount, clientX, clientY) {
    var layer = document.getElementById("float-layer");
    var plane = document.querySelector(".city-plane");
    if (!layer || !plane) {
      return;
    }
    var rect = plane.getBoundingClientRect();
    var node = document.createElement("div");
    node.className = "float-gain chip-" + resource;
    node.textContent = amount > 0 ? "+" + amount : "–";
    node.style.left = clientX - rect.left + "px";
    node.style.top = clientY - rect.top + "px";
    layer.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }, 950);
  }

  function renderTurnRow(state) {
    var row = document.getElementById("turn-row");
    if (!row) {
      return;
    }
    row.innerHTML = state.players
      .map(function (player, index) {
        var zoneCount = Nexus.playerZones(state, player.id).length;
        var role = Nexus.ROLES_BY_ID[player.roleId];
        var alignment = role ? role.alignment : "—";
        var standardLabel =
          player.standardsChoice === "open"
            ? " · Offen"
            : player.standardsChoice === "proprietary"
              ? " · Prop."
              : "";
        var isActive =
          index === state.currentPlayerIndex &&
          state.turnPhase !== "gameover" &&
          !Nexus.isHotSeatShield(state);
        return (
          '<button type="button" class="turn-chip' +
          (isActive ? " is-active" : "") +
          '" style="--player-color:' +
          playerColor(player) +
          ";--turn-i:" +
          index +
          '" data-player-id="' +
          player.id +
          '" title="' +
          player.name +
          '">' +
          '<span class="turn-avatar">' +
          (index + 1) +
          "</span>" +
          '<span class="turn-meta">' +
          '<span class="turn-name">' +
          player.name +
          "</span>" +
          '<span class="turn-alignment">' +
          alignment +
          standardLabel +
          "</span>" +
          '<span class="zone-count">· ' +
          zoneCount +
          " Zone" +
          (zoneCount === 1 ? "" : "n") +
          "</span></span></button>"
        );
      })
      .join("");
  }

  function renderGoalPanel(state) {
    var panel = document.getElementById("goal-panel");
    var pill = document.getElementById("goal-pill");
    if (!panel || !pill) {
      return;
    }
    if (Nexus.isHotSeatShield(state)) {
      panel.hidden = true;
      pill.hidden = true;
      return;
    }
    var player = Nexus.currentPlayer(state);
    var progress = Nexus.computeRoleProgress(state, player);
    if (!progress.role) {
      panel.hidden = true;
      pill.hidden = true;
      return;
    }
    panel.hidden = false;
    pill.hidden = false;
    document.getElementById("goal-role-name").textContent = progress.role.name;
    document.getElementById("goal-total").textContent = progress.totalPercent + "%";
    document.getElementById("stat-goal-total").textContent = progress.totalPercent;

    var roleDef = progress.role;
    document.getElementById("goal-list").innerHTML = progress.subGoals
      .map(function (goal, index) {
        var subDef = roleDef.subGoals[index];
        var metricText = Nexus.formatMetricValue(subDef, goal.metricValue);
        var hint = Nexus.nextStepHint(subDef, goal.metricValue, state.players.length);
        var bar = Math.round((goal.currentPercent / goal.maxContribution) * 100);
        return (
          '<li class="goal-item">' +
          '<div class="goal-item-head">' +
          "<span>" +
          goal.label +
          "</span>" +
          "<strong>" +
          goal.currentPercent +
          "%</strong>" +
          "</div>" +
          '<div class="goal-bar"><span style="width:' +
          bar +
          '%"></span></div>' +
          '<p class="goal-meta">Wert: ' +
          metricText +
          " · " +
          hint +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderRoleRevealModal(state) {
    var shell = document.getElementById("role-reveal-modal");
    if (!shell) {
      return;
    }
    var shouldOpen = state.turnPhase === "role_reveal";
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var player = Nexus.roleRevealPlayer(state);
    if (!player) {
      return;
    }
    var role = Nexus.ROLES_BY_ID[player.roleId];
    var progress = Nexus.computeRoleProgress(state, player);
    document.getElementById("role-reveal-player").textContent = player.name;
    document.getElementById("role-reveal-hint").textContent =
      state.roleRevealIndex < state.players.length - 1
        ? "Nur du darfst diese Ziele sehen. Gib das Gerät an den nächsten Spieler weiter."
        : "Das war die letzte Rolle. Danach beginnt Spieler 1.";
    var okBtn = document.getElementById("btn-role-reveal-ok");
    okBtn.textContent =
      state.roleRevealIndex < state.players.length - 1 ? "Verstanden – weiter" : "Spiel beginnen";
    document.getElementById("role-reveal-body").innerHTML =
      '<p class="role-alignment-pill">' +
      role.alignment +
      " · " +
      role.name +
      "</p>" +
      progress.subGoals
        .map(function (goal, index) {
          var subDef = role.subGoals[index];
          return (
            '<div class="role-reveal-goal">' +
            "<strong>" +
            goal.label +
            "</strong>" +
            "<span>max. " +
            goal.maxContribution +
            "% · " +
            Nexus.nextStepHint(subDef, goal.metricValue, state.players.length) +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderHandoffModal(state) {
    var shell = document.getElementById("handoff-modal");
    if (!shell) {
      return;
    }
    var shouldOpen = state.turnPhase === "handoff";
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var player = Nexus.currentPlayer(state);
    if (!player) {
      return;
    }
    var owned = Nexus.playerZones(state, player.id).length;
    var factories = Nexus.playerFactoryZones(state, player.id).length;
    document.getElementById("handoff-player").textContent = player.name + " ist dran";
    document.getElementById("handoff-hint").textContent =
      owned === 0
        ? "Du besitzt noch keine Felder. Die Produktion wird übersprungen."
        : factories === 0
          ? "Nur dein Home produziert in dieser Runde (+1 aller Ressourcen). Danach kannst du den Startcoupon einlösen."
          : "Nur du darfst deine Ziele und Ressourcen sehen. Wenn du bereit bist, startet die Produktion.";
    document.getElementById("btn-handoff-ok").textContent = "Ich bin " + player.name;
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderPublicPlayerModal(state, ui) {
    var shell = document.getElementById("public-player-modal");
    if (!shell) {
      return;
    }
    var shouldOpen =
      !!(ui && ui.inspectedPlayerId) &&
      !Nexus.isHotSeatShield(state) &&
      state.turnPhase !== "gameover";
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var view = Nexus.getPublicPlayerView(state, ui.inspectedPlayerId);
    if (!view) {
      closeModal(shell);
      return;
    }
    var standardText =
      view.standardsChoice === "proprietary" ? "Proprietäres System" : "Offener Standard";
    document.getElementById("public-player-name").textContent = view.name;
    document.getElementById("public-player-meta").textContent =
      view.alignment +
      " · " +
      standardText +
      " · " +
      view.zoneCount +
      " Zone" +
      (view.zoneCount === 1 ? "" : "n") +
      " · SAE " +
      view.saeLevel +
      "/5";
    var grid = document.getElementById("public-player-devices");
    if (!view.devices.length) {
      grid.innerHTML = '<p class="hand-empty">Keine Cloud-Geräte sichtbar.</p>';
    } else {
      grid.innerHTML = view.devices
        .map(function (device) {
          return (
            '<div class="public-device">' +
            '<span class="public-device-icon">' +
            Nexus.DEVICE_ICONS[device.id] +
            "</span>" +
            "<strong>" +
            device.shortName +
            "</strong>" +
            "<small>Cloud</small>" +
            "</div>"
          );
        })
        .join("");
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderWallet(state) {
    var player = Nexus.currentPlayer(state);
    if (Nexus.isHotSeatShield(state)) {
      Nexus.RESOURCE_KEYS.forEach(function (key) {
        setDigitGroup(document.getElementById("res-" + key), "–", false);
        var expect = document.getElementById("expect-" + key);
        if (expect) {
          expect.textContent = "";
        }
      });
      setDigitGroup(document.getElementById("stat-round"), state.round > state.maxRounds ? state.maxRounds : state.round, false);
      document.querySelector(".day-max").textContent = "/ " + state.maxRounds;
      setDigitGroup(document.getElementById("stat-risk"), "–", false);
      lastResourceSnapshot = null;
      lastPlayerId = null;
      return;
    }
    var expected = Nexus.expectedByResource(state);
    var playerChanged = lastPlayerId !== player.id;
    Nexus.RESOURCE_KEYS.forEach(function (key) {
      var el = document.getElementById("res-" + key);
      var changed = !playerChanged && lastResourceSnapshot && lastResourceSnapshot[key] !== player.resources[key];
      setDigitGroup(el, player.resources[key], changed);
      var expect = document.getElementById("expect-" + key);
      if (expect) {
        expect.textContent = "~" + formatNumber(expected[key]);
      }
    });
    setDigitGroup(document.getElementById("stat-round"), state.round > state.maxRounds ? state.maxRounds : state.round, false);
    document.querySelector(".day-max").textContent = "/ " + state.maxRounds;
    setDigitGroup(document.getElementById("stat-risk"), player.risk, false);
    document.getElementById("risk-meter").style.setProperty("--risk", Math.min(20, player.risk));
    lastResourceSnapshot = Object.assign({}, player.resources);
    lastPlayerId = player.id;
  }

  function homeDevicePips(owner, cx, cy, publicOnly) {
    if (!owner) {
      return "";
    }
    var built = [];
    Nexus.DEVICES.forEach(function (device) {
      var mode = owner.devices[device.id];
      if (!mode) {
        return;
      }
      if (publicOnly && mode !== "cloud") {
        return;
      }
      built.push({ name: device.shortName, mode: mode });
    });
    if (!built.length) {
      return "";
    }
    var cols = Math.min(4, built.length);
    var gap = 10;
    var startX = cx - ((cols - 1) * gap) / 2;
    var startY = cy + 16;
    return built
      .map(function (item, index) {
        var col = index % cols;
        var row = Math.floor(index / cols);
        var x = startX + col * gap;
        var y = startY + row * 10;
        return (
          '<circle class="home-device-pip is-' +
          item.mode +
          '" cx="' +
          x +
          '" cy="' +
          y +
          '" r="3.6"><title>' +
          item.name +
          (item.mode === "cloud" ? " · Cloud" : " · Lokal") +
          "</title></circle>"
        );
      })
      .join("");
  }

  function renderDistrict(state, ui) {
    var svg = document.getElementById("district-svg");
    var board = document.getElementById("map-board");
    var layout = Nexus.boardLayout();
    var size = layout.size;
    var shadowDy = layout.shadowDy;
    var width = layout.width;
    var height = layout.height;
    var slots = layout.hexes;
    if (board) {
      board.style.width = width + "px";
      board.style.height = height + "px";
    }
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("overflow", "visible");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.width = width + "px";
    svg.style.height = height + "px";

    slots.sort(function (a, b) {
      if (a.r !== b.r) {
        return a.r - b.r;
      }
      return a.q - b.q;
    });

    var player = Nexus.currentPlayer(state);
    var html = "";
    var selected = ui && ui.expandSlot;
    var totalWeight = dieWeightTotal();
    var spinningSet = {};
    var staggerByZone = {};
    (state.spinningOutcomes || []).forEach(function (outcome) {
      spinningSet[outcome.zoneId] = true;
      staggerByZone[outcome.zoneId] = outcome.staggerIndex;
    });

    slots.forEach(function (slot) {
      var cx = slot.x;
      var cy = slot.y;
      var zone = Nexus.zoneAt(state, slot.q, slot.r);
      var expandable = Nexus.isExpandableSlot(state, slot.q, slot.r) && state.turnPhase === "build";
      var buyable = expandable && Nexus.canAffordExpandSlot(state, slot.q, slot.r);
      var isSelected = selected && selected.q === slot.q && selected.r === slot.r;

      if (zone) {
        var isHome = zone.type === "home";
        var typeDef = Nexus.ZONE_TYPES[zone.type];
        var color = isHome ? Nexus.ZONE_TYPE_COLORS.home : Nexus.ZONE_TYPE_COLORS[zone.type];
        var owner = state.players.filter(function (p) {
          return p.id === zone.ownerId;
        })[0];
        var isMine = zone.ownerId === player.id;
        var spinning = !!spinningSet[zone.id];
        var staggerMs = (staggerByZone[zone.id] || 0) * C.HARVEST_STAGGER_MS;
        var done = !!zone.harvested;
        var isHomeActive = isHome && isMine && ui && ui.homeOpen;
        html +=
          '<polygon class="hex-shadow" points="' +
          hexPoints(cx, cy + shadowDy, size - 2) +
          '"></polygon>';

        if (isHome) {
          html +=
            '<g class="hex hex-home' +
            (isMine ? " is-mine" : " is-foreign") +
            (isHomeActive ? " is-selected" : "") +
            (done ? " is-done" : "") +
            (spinning ? " is-spinning" : "") +
            '" data-home="' +
            zone.id +
            '" data-owner="' +
            zone.ownerId +
            '" data-mine="' +
            (isMine ? "1" : "0") +
            '" style="--owner-color:' +
            playerColor(owner) +
            ";--spin-delay:" +
            staggerMs +
            'ms">' +
            "<title>Smart Home</title>" +
            '<polygon points="' +
            hexPoints(cx, cy, size - 2) +
            '" fill="' +
            color +
            '" opacity="0.88"></polygon>' +
            '<g class="hex-icon" transform="translate(' +
            (cx - 12) +
            "," +
            (cy - 14) +
            ')">' +
            Nexus.homeIconGroup("#1b140c") +
            "</g>" +
            homeDevicePips(owner, cx, cy, !isMine) +
            "</g>";
          return;
        }

        var barW = size * 1.05;
        var barH = 8;
        var barX = cx - barW / 2;
        var barY = cy + size * 0.38;
        var xCursor = barX;
        var bands = "";
        Nexus.PRODUCTION_DICE.forEach(function (die) {
          var w = (die.weight / totalWeight) * barW;
          bands +=
            '<rect x="' +
            xCursor +
            '" y="' +
            barY +
            '" width="' +
            w +
            '" height="' +
            barH +
            '" fill="' +
            die.color +
            '" rx="2"></rect>';
          xCursor += w;
        });
        var settle = zone.lastDieId ? dieSettleRatio(zone.lastDieId) : 0.5;
        var needleX = barX + settle * barW;
        html +=
          '<g class="hex hex-owned' +
          (done ? " is-done" : "") +
          (spinning ? " is-spinning" : "") +
          (isMine ? "" : " is-foreign") +
          (ui && ui.inspectedZoneId === zone.id ? " is-selected" : "") +
          '" data-zone="' +
          zone.id +
          '" data-mine="' +
          (isMine ? "1" : "0") +
          '" style="--owner-color:' +
          playerColor(owner) +
          ";--spin-delay:" +
          staggerMs +
          "ms;--reveal-delay:" +
          (zone.revealDelay || 0) +
          'ms">' +
          "<title>" +
          typeDef.label +
          "</title>" +
          '<polygon points="' +
          hexPoints(cx, cy, size - 2) +
          '" fill="' +
          color +
          '"></polygon>' +
          '<g class="hex-icon" transform="translate(' +
          (cx - 12) +
          "," +
          (cy - 22) +
          ')">' +
          Nexus.iconGroup(typeDef.primary) +
          "</g>" +
          bands +
          '<rect x="' +
          barX +
          '" y="' +
          barY +
          '" width="' +
          barW +
          '" height="' +
          barH +
          '" fill="none" stroke="rgba(7,16,24,0.45)" rx="2"></rect>' +
          '<g transform="translate(' +
          barX +
          "," +
          barY +
          ')">' +
          '<g class="gacha-needle" style="--settle-x:' +
          (needleX - barX) +
          "px;--bar-w:" +
          barW +
          "px;--spin-delay:" +
          staggerMs +
          'ms">' +
          '<polygon points="-5,-6 5,-6 0,10" fill="#071018"></polygon></g></g>' +
          "</g>";
      } else {
        html +=
          '<g class="hex hex-empty' +
          (expandable ? " is-open" : "") +
          (buyable ? " is-buyable" : "") +
          (isSelected ? " is-selected" : "") +
          '" data-q="' +
          slot.q +
          '" data-r="' +
          slot.r +
          '">' +
          '<polygon points="' +
          hexPoints(cx, cy, size - 2) +
          '"></polygon>' +
          (expandable
            ? '<text class="hex-plus" x="' + cx + '" y="' + (cy + 8) + '">+</text>'
            : "") +
          "</g>";
      }
    });
    svg.innerHTML = html;

    document.getElementById("btn-end-round").disabled = !Nexus.canEndTurn(state);
    var tradeBtn = document.getElementById("btn-trade");
    if (tradeBtn) {
      tradeBtn.disabled = state.turnPhase !== "build";
    }

    var hint = document.getElementById("table-hint");
    var factoryCount = Nexus.playerFactoryZones(state, player.id).length;
    var ownedCount = Nexus.playerZones(state, player.id).length;
    if (state.turnPhase === "handoff") {
      hint.textContent = "Gerät an " + player.name + " weitergeben …";
    } else if (state.turnPhase === "produce" || state.turnPhase === "spinning") {
      if (ownedCount === 0) {
        hint.textContent = player.name + ": keine Felder — Produktion wird übersprungen";
      } else if (factoryCount === 0) {
        hint.textContent = player.name + ": Home produziert +1 aller Ressourcen …";
      } else {
        hint.textContent = player.name + ": Produktion läuft auf allen Zonen …";
      }
    } else if (state.turnPhase === "role_reveal") {
      hint.textContent = "Rollen werden einzeln vorbereitet …";
    } else if (state.turnPhase === "event") {
      hint.textContent = player.name + ": ein Ereignis wartet";
    } else if (state.turnPhase === "build") {
      if ((player.freeZoneClaims || 0) > 0) {
        hint.textContent = player.name + ": Startcoupon — wähle ein Feld am Home (kostenlos)";
      } else {
        hint.textContent = player.name + ": bauen, Karten ausspielen oder Zug beenden";
      }
    } else {
      hint.textContent = "";
    }
  }

  function renderHome(state, ui) {
    var player = Nexus.currentPlayer(state);
    var list = document.getElementById("device-list");
    var inspected = ui && ui.inspectedDevice;
    var inspectedZone = null;
    if (ui && ui.inspectedZoneId) {
      state.zones.forEach(function (zone) {
        if (zone.id === ui.inspectedZoneId) {
          inspectedZone = zone;
        }
      });
    }
    var dockTitle = document.getElementById("dock-title");
    if (dockTitle) {
      if (inspectedZone) {
        var typeDef = Nexus.ZONE_TYPES[inspectedZone.type] || { label: inspectedZone.type };
        dockTitle.textContent = typeDef.label;
      } else {
        dockTitle.textContent = "Distrikt";
      }
    }

    var homeModal = document.getElementById("home-modal");
      var shouldOpenHome =
      !!(ui && ui.homeOpen) &&
      !(ui && ui.expandSlot) &&
      !Nexus.isHotSeatShield(state) &&
      state.turnPhase !== "gameover";
    if (homeModal) {
      if (!shouldOpenHome) {
        if (!homeModal.hidden) {
          closeModal(homeModal);
        }
      } else if (homeModal.hidden) {
        openModal(homeModal);
      }
    }

    var zoneInspect = document.getElementById("zone-inspect");
    if (zoneInspect) {
      if (!inspectedZone) {
        zoneInspect.hidden = true;
      } else {
        zoneInspect.hidden = false;
        var owner = state.players.filter(function (p) {
          return p.id === inspectedZone.ownerId;
        })[0];
        var isMineZone = owner && player && owner.id === player.id;
        document.getElementById("zone-inspect-type").textContent =
          (Nexus.ZONE_TYPES[inspectedZone.type] || {}).label || inspectedZone.type;
        document.getElementById("zone-inspect-owner").textContent = owner
          ? isMineZone
            ? "Dein Feld"
            : owner.name + " · öffentlich sichtbar"
          : "";
        document.getElementById("zone-inspect-yield").textContent = formatZoneYield(inspectedZone);
        var die = inspectedZone.lastDieId
          ? Nexus.PRODUCTION_DICE.filter(function (item) {
              return item.id === inspectedZone.lastDieId;
            })[0]
          : null;
        document.getElementById("zone-inspect-die").textContent = die
          ? die.label + (die.modifier ? " (" + (die.modifier > 0 ? "+" : "") + die.modifier + ")" : "")
          : inspectedZone.type === "home"
            ? "Home produziert ohne Würfel"
            : "Noch kein Wurf in dieser Runde";
      }
    }

    var visibleDevices = Nexus.DEVICES;
    var canBuildDevices = state.turnPhase === "build" && !Nexus.isHotSeatShield(state);

    list.innerHTML = visibleDevices
      .map(function (device) {
      var mode = player.devices[device.id];
      var buyable = canBuildDevices && Nexus.canBuyDevice(state, device.id);
      var classes = ["room", "t-tt-wrap"];
      if (mode === "cloud") {
        classes.push("is-cloud");
      }
      if (mode === "local") {
        classes.push("is-local");
      }
      if (!mode) {
        classes.push("is-empty");
      }
      if (buyable) {
        classes.push("is-buyable");
      }
      if (inspected === device.id) {
        classes.push("is-open");
      }
      return (
        '<button type="button" class="' +
        classes.join(" ") +
        '" data-device="' +
        device.id +
        '" aria-label="' +
        device.name +
        '">' +
        '<span class="room-icon">' +
        Nexus.DEVICE_ICONS[device.id] +
        "</span>" +
        (mode
          ? '<span class="mode-badge t-icon-swap" data-state="' +
            (mode === "cloud" ? "a" : "b") +
            '"><span class="t-icon" data-icon="a">' +
            Nexus.MODE_ICONS.cloud +
            '</span><span class="t-icon" data-icon="b">' +
            Nexus.MODE_ICONS.local +
            "</span></span>"
          : "") +
        (buyable ? '<span class="buy-dot"></span>' : "") +
        (device.isSpecial ? '<span class="special-tag">Zone</span>' : "") +
        '<span class="t-tt" role="tooltip">' +
        device.shortName +
        "</span>" +
        "</button>"
      );
    })
      .join("");

    var standardsBar = document.getElementById("standards-bar");
    if (standardsBar) {
      var showStandards = state.turnPhase === "build";
      standardsBar.hidden = !showStandards;
      var openBtn = document.getElementById("btn-standard-open");
      var propBtn = document.getElementById("btn-standard-proprietary");
      if (openBtn) {
        openBtn.classList.toggle("is-selected", player.standardsChoice === "open");
      }
      if (propBtn) {
        propBtn.classList.toggle("is-selected", player.standardsChoice === "proprietary");
      }
      var hint = document.getElementById("standards-hint");
      if (hint) {
        hint.textContent =
          (player.standardsChoice === "proprietary" ? "Proprietär" : "Offen") +
          " · Streak: " +
          (player.standardStreak || 0) +
          " Runden";
      }
    }

    var saePanel = document.getElementById("sae-panel");
    if (saePanel) {
      var canSae = !!(player.devices.v2x || player.devices.charging_network);
      saePanel.hidden = !canSae || state.turnPhase !== "build";
      var saeLevel = document.getElementById("sae-level");
      if (saeLevel) {
        saeLevel.textContent = String(player.saeLevel || 0);
      }
      var saeBtn = document.getElementById("btn-sae-upgrade");
      if (saeBtn) {
        saeBtn.disabled = !Nexus.canUpgradeSae(state);
      }
    }

    var inspect = document.getElementById("inspect-card");
    if (inspect && inspectedZone) {
      inspect.hidden = true;
    } else if (!inspected || state.turnPhase === "event") {
      inspect.hidden = true;
    } else {
      var device = Nexus.DEVICES_BY_ID[inspected];
      inspect.hidden = false;
      document.getElementById("inspect-icon").innerHTML = Nexus.DEVICE_ICONS[device.id];
      document.getElementById("inspect-title").textContent = device.name;
      document.getElementById("inspect-effect").textContent = device.effectText;
      document.getElementById("inspect-local-cost").innerHTML = chipsHtml(
        Nexus.getBuildOffer(state, device.id, "local").cost
      );
      var cloudBtn = document.getElementById("mode-cloud");
      var localBtn = document.getElementById("mode-local");
      var upkeepEl = document.getElementById("inspect-cloud-upkeep");
      cloudBtn.hidden = !!device.localOnly;
      if (device.localOnly) {
        document.getElementById("inspect-cloud-cost").textContent = "nicht verfügbar";
        document.getElementById("inspect-cloud-risk").innerHTML = "";
        if (upkeepEl) {
          upkeepEl.textContent = "";
        }
        cloudBtn.disabled = true;
        cloudBtn.classList.add("is-disabled");
      } else {
        document.getElementById("inspect-cloud-cost").innerHTML = chipsHtml(
          Nexus.getBuildOffer(state, device.id, "cloud").cost
        );
        document.getElementById("inspect-cloud-risk").innerHTML = riskPips(device.cloudRiskPerRound);
        if (upkeepEl) {
          var upkeepAmt = device.cloudUpkeep || 0;
          upkeepEl.textContent = upkeepAmt
            ? "laufend " + upkeepAmt + " Konnekt./Zug"
            : "";
        }
        var cloudOk = Nexus.getBuildOffer(state, device.id, "cloud").allowed;
        cloudBtn.disabled = !cloudOk;
        cloudBtn.classList.toggle("is-disabled", !cloudOk);
      }
      var localOk = Nexus.getBuildOffer(state, device.id, "local").allowed;
      localBtn.disabled = !localOk;
      localBtn.classList.toggle("is-disabled", !localOk);
    }

    var flags = [];
    var upkeep = Nexus.cloudUpkeepCost(player);
    if (upkeep > 0) {
      flags.push("Cloud −" + upkeep + " Konnekt./Zug");
    }
    if (player.hubDiscountPending) {
      flags.push("Hub-Rabatt");
    }
    if (player.localHardwareDiscountPending) {
      flags.push("Förderung");
    }
    document.getElementById("build-flags").textContent = flags.join(" · ");

    var shield = Nexus.isHotSeatShield(state);
    var cards = shield ? [] : player.handCards || [];
    var played = shield ? [] : player.playedCards || [];
    var canPlay = state.turnPhase === "build" && !shield;
    var fan = document.getElementById("hand-fan");
    if (fan) {
      if (!cards.length) {
        fan.innerHTML = shield
          ? ""
          : '<li class="hand-empty">Keine Handkarten</li>';
      } else {
        var n = cards.length;
        var spread = n > 6 ? 5 : 7;
        fan.innerHTML = cards
          .map(function (card, index) {
            var effects = Nexus.formatEffects(card.effects);
            var rot = (index - (n - 1) / 2) * spread;
            var title = canPlay
              ? "Ausspielen: " + (effects || card.name)
              : "Nur in der Bauphase ausspielbar";
            return (
              '<li class="t-avatar" style="--fan-i:' +
              index +
              "; --fan-n:" +
              n +
              "; --fan-rot:" +
              rot +
              'deg">' +
              '<button type="button" class="play-card cat-' +
              card.category +
              '" data-card-index="' +
              index +
              '" title="' +
              title +
              '"' +
              (canPlay ? "" : " disabled") +
              ">" +
              '<span class="play-card-cat">' +
              (Nexus.INNOVATION_CATEGORY_LABELS[card.category] || card.category) +
              "</span>" +
              '<strong class="play-card-name">' +
              card.name +
              "</strong>" +
              '<span class="play-card-text">' +
              (card.text || "") +
              "</span>" +
              (effects ? '<span class="play-card-fx">' + effects + "</span>" : "") +
              "</button></li>"
            );
          })
          .join("");
      }
    }

    var playedStack = document.getElementById("played-stack");
    var playedCount = document.getElementById("played-count");
    if (playedCount) {
      playedCount.textContent = String(played.length);
    }
    if (playedStack) {
      if (!played.length) {
        playedStack.innerHTML = '<span class="pile-layer pile-empty"></span>';
      } else {
        var shown = played.slice(-3);
        playedStack.innerHTML = shown
          .map(function (card, index) {
            var isTop = index === shown.length - 1;
            return (
              '<span class="pile-layer' +
              (isTop ? " pile-face cat-" + card.category : "") +
              '">' +
              (isTop ? '<span class="pile-face-name">' + card.name + "</span>" : "") +
              "</span>"
            );
          })
          .join("");
      }
    }

    var drawBtn = document.getElementById("btn-draw-deck");
    var drawCount = document.getElementById("draw-count");
    var deckLeft = (state.innovationDeck || []).length;
    if (drawCount) {
      drawCount.textContent = String(deckLeft);
    }
    if (drawBtn) {
      var drawOffer = Nexus.getInnovationDrawOffer(state);
      drawBtn.disabled = !drawOffer.allowed;
      drawBtn.title = drawOffer.allowed
        ? "Karte ziehen (Hand unter " + Nexus.CONSTANTS.HAND_LIMIT + ")"
        : drawOffer.reason;
      drawBtn.setAttribute("aria-label", drawBtn.title);
    }

    var dock = document.querySelector(".dock");
    var dockHead = document.querySelector(".dock-head");
    var goalPanel = document.getElementById("goal-panel");
    var zoneInspect = document.getElementById("zone-inspect");
    var standardsBar = document.getElementById("standards-bar");
    if (dockHead) {
      dockHead.hidden = !zoneInspect || zoneInspect.hidden;
    }
    if (dock) {
      dock.hidden =
        (!goalPanel || goalPanel.hidden) &&
        (!zoneInspect || zoneInspect.hidden) &&
        (!standardsBar || standardsBar.hidden);
    }
    bindCardFanOnce();
  }

  function renderExpandModal(state, ui) {
    var shell = document.getElementById("expand-modal");
    var slot = ui && ui.expandSlot;
    var shouldOpen = !!(slot && state.turnPhase === "build");
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var cost = Nexus.getExpandCost(state);
    var player = Nexus.currentPlayer(state);
    var free = player && (player.freeZoneClaims || 0) > 0;
    var kicker = document.querySelector("#expand-modal .modal-kicker");
    if (kicker) {
      kicker.textContent = free ? "Startfeld (Coupon)" : "Neues Feld";
    }
    document.getElementById("expand-cost").innerHTML = free
      ? '<span class="chip">kostenlos</span>'
      : chipsHtml(cost);
    document.getElementById("expand-choices").innerHTML = Nexus.ZONE_TYPE_KEYS.map(function (key) {
      var offer = Nexus.getExpandOffer(state, slot.q, slot.r, key);
      var typeDef = Nexus.ZONE_TYPES[key];
      return (
        '<button type="button" class="tile-pick zone-pick" data-zone-type="' +
        key +
        '" style="--zone-color:' +
        Nexus.ZONE_TYPE_COLORS[key] +
        '"' +
        (offer.allowed ? "" : " disabled") +
        ">" +
        Nexus.iconGroup(typeDef.primary, "#071018") +
        '<small>' + typeDef.shortLabel + '</small>' +
        "</button>"
      );
    }).join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderEventModal(state, ui) {
    var shell = document.getElementById("event-modal");
    var player = Nexus.currentPlayer(state);
    var event = player.pendingEvent;
    var shouldOpen = state.turnPhase === "event" && event;
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    document.getElementById("event-title").textContent = player.name + " – " + event.title;
    document.getElementById("event-text").textContent = event.text;
    var choices = document.getElementById("event-choices");
    var pick = document.getElementById("event-resource-pick");
    var showPick = !!(ui && ui.investorAwaitingResource);
    pick.hidden = !showPick;
    choices.hidden = showPick;
    if (showPick) {
      pick.innerHTML = Nexus.RESOURCE_KEYS.map(function (key) {
        return (
          '<button type="button" class="tile-pick chip-' +
          key +
          '" data-resource="' +
          key +
          '">' +
          Nexus.RESOURCE_ICONS[key] +
          "</button>"
        );
      }).join("");
    } else {
      choices.innerHTML = event.choices
        .map(function (choice) {
          var disabled = !Nexus.canChooseEventOption(state, choice.id);
          return (
            '<button type="button" class="btn" data-choice="' +
            choice.id +
            '"' +
            (disabled ? " disabled" : "") +
            ">" +
            choice.label +
            "<small>" +
            choice.summary +
            "</small></button>"
          );
        })
        .join("");
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderEndScreen(state) {
    var shell = document.getElementById("end-screen");
    var ended = state.turnPhase === "gameover";
    if (!ended) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    if (!state.finalScores) {
      return;
    }
    var best = state.finalScores.reduce(function (max, entry) {
      return entry.totalPercent > max ? entry.totalPercent : max;
    }, -Infinity);
    var winner = state.players.filter(function (p) {
      return p.id === state.winnerId;
    })[0];
    var title = document.getElementById("end-screen-title");
    var reason = document.getElementById("end-screen-reason");
    if (title) {
      title.textContent =
        state.winReason === "instant" ? "Sofortsieg!" : "Spiel beendet";
    }
    if (reason) {
      reason.textContent = winner
        ? (state.winReason === "instant"
            ? winner.name + " hat 100 % des Zielprofils erreicht."
            : winner.name + " war am nächsten dran (" + best + "%).")
        : "";
    }
    document.getElementById("score-players").innerHTML = state.finalScores
      .map(function (entry) {
        var player = state.players.filter(function (p) {
          return p.id === entry.playerId;
        })[0];
        var role = Nexus.ROLES_BY_ID[player.roleId];
        var isWinner = entry.playerId === state.winnerId;
        var goalsHtml = entry.subGoals
          .map(function (goal) {
            return "<span>" + goal.label + " <b>" + goal.currentPercent + "%</b></span>";
          })
          .join("");
        return (
          '<div class="score-player' +
          (isWinner ? " is-winner" : "") +
          '" style="--player-color:' +
          playerColor(player) +
          '">' +
          '<div class="score-player-head"><span><span class="dot"></span>' +
          entry.playerName +
          " · " +
          (role ? role.alignment : "") +
          "</span><span>" +
          (isWinner ? "🏆 " : "") +
          entry.totalPercent +
          "%</span></div>" +
          '<p class="score-role-name">' +
          (role ? role.name : "") +
          "</p>" +
          '<div class="score-player-rows">' +
          goalsHtml +
          "</div></div>"
        );
      })
      .join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderTradeModal(state, ui) {
    var shell = document.getElementById("trade-modal");
    var open = !!(ui && ui.tradeOpen && state.turnPhase === "build");
    if (!open) {
      if (shell && !shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var player = Nexus.currentPlayer(state);
    var pick = ui.tradePick || { partnerId: null, giveKey: null, giveAmount: 1, wantKey: null, wantAmount: 1 };
    var hint = player.name + " tauscht Ressourcen (Standards beachten).";
    if (pick.partnerId) {
      var selected = state.players.filter(function (p) {
        return p.id === pick.partnerId;
      })[0];
      if (selected) {
        var compat = Nexus.getTradeOffer(
          state,
          selected.id,
          pick.giveKey || "energy",
          pick.giveAmount || 1,
          pick.wantKey || "data",
          pick.wantAmount || 1
        );
        if (!compat.allowed) {
          hint = compat.reason;
        }
      }
    }
    document.getElementById("trade-hint").textContent = hint;
    document.getElementById("trade-partners").innerHTML = state.players
      .filter(function (p) {
        return p.id !== player.id;
      })
      .map(function (p) {
        var compat = Nexus.getTradeOffer(state, p.id, pick.giveKey || "energy", pick.giveAmount || 1, pick.wantKey || "data", pick.wantAmount || 1);
        var blocked = p.standardsChoice && player.standardsChoice && p.standardsChoice !== player.standardsChoice;
        return (
          '<button type="button" class="btn setup-choice' +
          (pick.partnerId === p.id ? " is-selected" : "") +
          '" data-partner="' +
          p.id +
          '">' +
          p.name +
          (blocked ? " · ✕" : "") +
          "</button>"
        );
      })
      .join("");
    function resourceButtons(prefix, selectedKey, dataAttr) {
      return Nexus.RESOURCE_KEYS.map(function (key) {
        return (
          '<button type="button" class="tile-pick chip-' +
          key +
          (selectedKey === key ? " is-selected" : "") +
          '" data-' +
          dataAttr +
          '="' +
          key +
          '">' +
          Nexus.RESOURCE_ICONS[key] +
          "<small>" +
          Nexus.RESOURCE_SHORT[key] +
          "</small></button>"
        );
      }).join("");
    }
    document.getElementById("trade-give").innerHTML = resourceButtons("give", pick.giveKey, "give");
    document.getElementById("trade-want").innerHTML = resourceButtons("want", pick.wantKey, "want");
    var confirm = document.getElementById("btn-trade-confirm");
    if (pick.partnerId && pick.giveKey && pick.wantKey) {
      var offer = Nexus.getTradeOffer(state, pick.partnerId, pick.giveKey, pick.giveAmount || 1, pick.wantKey, pick.wantAmount || 1);
      confirm.disabled = !offer.allowed;
    } else {
      confirm.disabled = true;
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  Nexus.render = function (state, ui) {
    if (!state || state.screen !== "game") {
      return;
    }
    renderTurnRow(state);
    renderWallet(state);
    renderGoalPanel(state);
    renderDistrict(state, ui);
    renderHome(state, ui);
    renderExpandModal(state, ui);
    renderTradeModal(state, ui);
    renderEventModal(state, ui);
    renderRoleRevealModal(state);
    renderHandoffModal(state);
    renderPublicPlayerModal(state, ui);
    renderEndScreen(state);
  };

  Nexus.openModal = openModal;
  Nexus.closeModal = closeModal;
  Nexus.pushToast = pushToast;
  Nexus.spawnFloat = spawnFloat;
  Nexus.chipsHtml = chipsHtml;
  Nexus.playerColor = playerColor;
})(window.Nexus);
