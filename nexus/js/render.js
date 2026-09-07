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

  function pushToast(text, tone) {
    var stack = document.getElementById("toast-stack");
    if (!stack) {
      return;
    }
    var node = document.createElement("div");
    node.className = "toast-item t-toast";
    if (tone) {
      node.style.color = tone;
    }
    node.textContent = text;
    stack.appendChild(node);
    requestAnimationFrame(function () {
      node.classList.add("is-open");
    });
    setTimeout(function () {
      node.classList.remove("is-open");
      setTimeout(function () {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }, 280);
    }, 1600);
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
        var isActive =
          index === state.currentPlayerIndex &&
          state.turnPhase !== "gameover" &&
          state.turnPhase !== "role_reveal";
        return (
          '<span class="turn-chip' +
          (isActive ? " is-active" : "") +
          '" style="--player-color:' +
          playerColor(player) +
          '">' +
          '<span class="dot"></span>' +
          player.name +
          '<span class="turn-alignment">' +
          alignment +
          "</span>" +
          '<span class="zone-count">· ' +
          zoneCount +
          " Zone" +
          (zoneCount === 1 ? "" : "n") +
          "</span></span>"
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
    if (state.turnPhase === "role_reveal") {
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
        var hint = Nexus.nextStepHint(subDef, goal.metricValue);
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
            Nexus.nextStepHint(subDef, goal.metricValue) +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderWallet(state) {
    var player = Nexus.currentPlayer(state);
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

  function renderDistrict(state, ui) {
    var svg = document.getElementById("district-svg");
    var plane = document.querySelector(".city-plane");
    var slots = Nexus.allSlots(C.HEX_RADIUS);
    var availW = (plane && plane.clientWidth) || 900;
    var availH = (plane && plane.clientHeight) || 620;
    var span = 2 * C.HEX_RADIUS + 0.95;
    var size = Math.floor(
      Math.min(availW / (Math.sqrt(3) * span), availH / (1.5 * span))
    );
    size = Math.max(64, Math.min(size, 130));
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    slots.forEach(function (slot) {
      var pos = Nexus.axialToPixel(slot.q, slot.r, size);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });
    var pad = size * 0.55;
    var width = maxX - minX + pad * 2;
    var height = maxY - minY + pad * 2;
    var originX = pad - minX;
    var originY = pad - minY;
    svg.setAttribute("viewBox", "0 0 " + Math.ceil(width) + " " + Math.ceil(height));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

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
      var pos = Nexus.axialToPixel(slot.q, slot.r, size);
      var cx = originX + pos.x;
      var cy = originY + pos.y;
      var zone = Nexus.zoneAt(state, slot.q, slot.r);
      var expandable = Nexus.isExpandableSlot(state, slot.q, slot.r) && state.turnPhase === "build";
      var isSelected = selected && selected.q === slot.q && selected.r === slot.r;

      if (zone) {
        var typeDef = Nexus.ZONE_TYPES[zone.type];
        var color = Nexus.ZONE_TYPE_COLORS[zone.type];
        var owner = state.players.filter(function (p) {
          return p.id === zone.ownerId;
        })[0];
        var isMine = zone.ownerId === player.id;
        var spinning = !!spinningSet[zone.id];
        var staggerMs = (staggerByZone[zone.id] || 0) * C.HARVEST_STAGGER_MS;
        var done = !!zone.harvested;
        var barW = size * 1.2;
        var barH = 10;
        var barX = cx - barW / 2;
        var barY = cy + size * 0.42;
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
        var showAmount = done && zone.lastYield;
        var amountText = "";
        if (showAmount && zone.lastYield) {
          amountText = "+" + zone.lastYield.primary.amount;
          if (zone.lastYield.secondary) {
            amountText += " / +" + zone.lastYield.secondary.amount;
          }
        }
        html +=
          '<g class="hex hex-owned' +
          (done ? " is-done" : "") +
          (spinning ? " is-spinning" : "") +
          (isMine ? "" : " is-foreign") +
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
          '<polygon points="' +
          hexPoints(cx, cy, size - 2) +
          '" fill="' +
          color +
          '"></polygon>' +
          '<g class="hex-icon" transform="translate(' +
          (cx - 14) +
          "," +
          (cy - 30) +
          ')">' +
          Nexus.iconGroup(typeDef.primary) +
          "</g>" +
          '<text class="hex-type" x="' +
          cx +
          '" y="' +
          (cy + size * 0.2) +
          '">' +
          typeDef.shortLabel +
          "</text>" +
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
          (showAmount
            ? '<text class="hex-amount" x="' + cx + '" y="' + (cy + 10) + '">' + amountText + "</text>"
            : "") +
          "</g>";
      } else {
        html +=
          '<g class="hex hex-empty' +
          (expandable ? " is-open" : "") +
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

    var hint = document.getElementById("table-hint");
    if (state.turnPhase === "produce" || state.turnPhase === "spinning") {
      hint.textContent = player.name + ": Produktion läuft auf allen Zonen …";
    } else if (state.turnPhase === "role_reveal") {
      hint.textContent = "Rollen werden einzeln vorbereitet …";
    } else if (state.turnPhase === "event") {
      hint.textContent = player.name + ": ein Ereignis wartet";
    } else if (state.turnPhase === "build") {
      hint.textContent = player.name + ": Geräte bauen, Zonen erweitern oder Zug beenden";
    } else {
      hint.textContent = "";
    }
  }

  function renderHome(state, ui) {
    var player = Nexus.currentPlayer(state);
    var list = document.getElementById("device-list");
    var inspected = ui && ui.inspectedDevice;
    list.innerHTML = Nexus.DEVICES.map(function (device) {
      var mode = player.devices[device.id];
      var buyable = Nexus.canBuyDevice(state, device.id);
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
        '<span class="t-tt" role="tooltip">' +
        device.shortName +
        "</span>" +
        "</button>"
      );
    }).join("");

    var inspect = document.getElementById("inspect-card");
    if (!inspected || state.turnPhase === "event") {
      inspect.hidden = true;
    } else {
      var device = Nexus.DEVICES_BY_ID[inspected];
      inspect.hidden = false;
      document.getElementById("inspect-icon").innerHTML = Nexus.DEVICE_ICONS[device.id];
      document.getElementById("inspect-title").textContent = device.name;
      document.getElementById("inspect-effect").textContent = device.effectText;
      document.getElementById("inspect-cloud-cost").innerHTML = chipsHtml(
        Nexus.getBuildOffer(state, device.id, "cloud").cost
      );
      document.getElementById("inspect-local-cost").innerHTML = chipsHtml(
        Nexus.getBuildOffer(state, device.id, "local").cost
      );
      document.getElementById("inspect-cloud-risk").innerHTML = riskPips(device.cloudRiskPerRound);
      var cloudBtn = document.getElementById("mode-cloud");
      var localBtn = document.getElementById("mode-local");
      var cloudOk = Nexus.getBuildOffer(state, device.id, "cloud").allowed;
      var localOk = Nexus.getBuildOffer(state, device.id, "local").allowed;
      cloudBtn.disabled = !cloudOk;
      localBtn.disabled = !localOk;
      cloudBtn.classList.toggle("is-disabled", !cloudOk);
      localBtn.classList.toggle("is-disabled", !localOk);
    }

    var flags = [];
    if (player.hubDiscountPending) {
      flags.push("Hub-Rabatt");
    }
    if (player.localHardwareDiscountPending) {
      flags.push("Förderung");
    }
    document.getElementById("build-flags").textContent = flags.join(" · ");
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
    document.getElementById("expand-cost").innerHTML = chipsHtml(Nexus.getExpandCost(state));
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

  function renderLog(state) {
    document.getElementById("log-list").innerHTML = state.log
      .slice(0, 6)
      .map(function (entry) {
        var prefix = entry.playerName ? entry.playerName + ": " : "";
        return "<li>" + prefix + entry.text + "</li>";
      })
      .join("");
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
    renderEventModal(state, ui);
    renderRoleRevealModal(state);
    renderLog(state);
    renderEndScreen(state);
  };

  Nexus.openModal = openModal;
  Nexus.closeModal = closeModal;
  Nexus.pushToast = pushToast;
  Nexus.spawnFloat = spawnFloat;
  Nexus.chipsHtml = chipsHtml;
  Nexus.playerColor = playerColor;
})(window.Nexus);
