window.Nexus = window.Nexus || {};

(function (Nexus) {
  var HEX_AXIAL = {
    1: { q: 0, r: 0 },
    2: { q: 1, r: 0 },
    3: { q: -1, r: 1 },
    4: { q: 0, r: 1 },
    5: { q: 1, r: 1 },
    6: { q: 0, r: 2 }
  };

  var RESOURCE_COLORS = {
    energy: "#f0c14b",
    data: "#5b9dff",
    compute: "#c084fc",
    hardware: "#fb923c",
    connectivity: "#2dd4bf"
  };

  function hexPoints(cx, cy, size) {
    var points = [];
    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 180) * (60 * i - 30);
      points.push(cx + size * Math.cos(angle) + "," + (cy + size * Math.sin(angle)));
    }
    return points.join(" ");
  }

  function axialToPixel(q, r, size) {
    return {
      x: size * Math.sqrt(3) * (q + r / 2),
      y: size * 1.5 * r
    };
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text === undefined || text === null ? "" : String(text);
    }
  }

  function formatNumber(value) {
    if (typeof value === "number" && value % 1 !== 0) {
      return String(Math.round(value * 10) / 10);
    }
    return String(value);
  }

  function phaseLabel(phase) {
    if (phase === "roll") {
      return "Würfeln";
    }
    if (phase === "event") {
      return "Ereignis";
    }
    if (phase === "build") {
      return "Bauen";
    }
    return "Ende";
  }

  function renderResources(state) {
    Nexus.RESOURCE_KEYS.forEach(function (key) {
      setText("res-" + key, state.resources[key]);
    });
    setText("stat-round", state.round > Nexus.CONSTANTS.MAX_ROUNDS ? Nexus.CONSTANTS.MAX_ROUNDS : state.round);
    setText("stat-round-max", Nexus.CONSTANTS.MAX_ROUNDS);
    setText("stat-risk", state.risk);
    setText("stat-phase", phaseLabel(state.phase));
  }

  function renderDistrict(state) {
    var svg = document.getElementById("district-svg");
    if (!svg) {
      return;
    }
    var size = 54;
    var originX = 210;
    var originY = 78;
    var html = "";

    Nexus.DISTRICT_TILES.forEach(function (tile) {
      var axial = HEX_AXIAL[tile.id];
      var pos = axialToPixel(axial.q, axial.r, size);
      var cx = originX + pos.x;
      var cy = originY + pos.y;
      var active = state.producedTiles.indexOf(tile.id) !== -1;
      var color = RESOURCE_COLORS[tile.resource];
      html +=
        '<g class="hex' +
        (active ? " hex-active" : "") +
        '" data-tile="' +
        tile.id +
        '">' +
        '<polygon points="' +
        hexPoints(cx, cy, size - 2) +
        '" fill="' +
        color +
        '" fill-opacity="' +
        (active ? "0.95" : "0.78") +
        '"></polygon>' +
        '<text x="' +
        cx +
        '" y="' +
        (cy - 10) +
        '" class="hex-label">' +
        Nexus.RESOURCE_SHORT[tile.resource] +
        "</text>" +
        '<text x="' +
        cx +
        '" y="' +
        (cy + 16) +
        '" class="hex-number">' +
        tile.number +
        "</text></g>";
    });
    svg.innerHTML = html;

    var d1 = state.dice[0];
    var d2 = state.dice[1];
    setText("dice-1", d1 === null ? "–" : d1);
    setText("dice-2", d2 === null ? "–" : d2);
    setText("dice-sum", state.lastSum === null ? "" : "Summe " + state.lastSum);

    var rollBtn = document.getElementById("btn-roll");
    if (rollBtn) {
      rollBtn.disabled = state.phase !== "roll";
    }
    var endBtn = document.getElementById("btn-end-round");
    if (endBtn) {
      endBtn.disabled = !Nexus.canEndRound(state);
    }
  }

  function renderHomeBoard(state) {
    var list = document.getElementById("device-list");
    if (!list) {
      return;
    }
    var html = "";
    Nexus.DEVICES.forEach(function (device) {
      var mode = state.devices[device.id];
      var status = "Nicht gebaut";
      var statusClass = "is-empty";
      if (mode === "cloud") {
        status = "Cloud aktiv";
        statusClass = "is-cloud";
      } else if (mode === "local") {
        status = "Lokal aktiv";
        statusClass = "is-local";
      }
      html +=
        '<article class="device-card ' +
        statusClass +
        '" data-device="' +
        device.id +
        '">' +
        "<h3>" +
        device.name +
        "</h3>" +
        '<p class="device-effect">' +
        device.effectText +
        "</p>" +
        '<p class="device-cost">Cloud: ' +
        Nexus.formatCost(device.costs.cloud) +
        " · Risiko +" +
        device.cloudRiskPerRound +
        "/Runde</p>" +
        '<p class="device-cost">Lokal: ' +
        Nexus.formatCost(device.costs.local) +
        " · Risiko 0</p>" +
        '<p class="device-status">' +
        status +
        "</p>" +
        '<button type="button" class="btn device-open" data-device="' +
        device.id +
        '"' +
        (state.phase === "build" && mode !== "local" ? "" : " disabled") +
        ">" +
        (mode === "cloud" ? "Aufwerten" : "Bauen") +
        "</button></article>";
    });
    list.innerHTML = html;

    var hints = [];
    if (state.hubDiscountPending) {
      hints.push("Hub-Rabatt: nächster Bau −1 Ressource");
    }
    if (state.localHardwareDiscountPending) {
      hints.push("Förderung: nächster lokaler Bau −1 Bauteile");
    }
    setText("build-hints", hints.join(" · "));
  }

  function renderLog(state) {
    var list = document.getElementById("log-list");
    if (!list) {
      return;
    }
    list.innerHTML = state.log
      .map(function (entry) {
        return "<li><span class=\"log-round\">R" + entry.round + "</span> " + entry.text + "</li>";
      })
      .join("");
  }

  function renderBuildModal(state, ui) {
    var modal = document.getElementById("build-modal");
    if (!modal) {
      return;
    }
    var open = !!(ui && ui.buildDeviceId) && state.phase === "build";
    modal.hidden = !open;
    if (!open) {
      return;
    }
    var device = Nexus.DEVICES_BY_ID[ui.buildDeviceId];
    setText("build-modal-title", device.name);

    ["cloud", "local"].forEach(function (mode) {
      var offer = Nexus.getBuildOffer(state, device.id, mode);
      var btn = document.getElementById("btn-build-" + mode);
      var detail = document.getElementById("build-detail-" + mode);
      var label = mode === "cloud" ? "Cloud bauen" : offer.isUpgrade ? "Auf lokal aufwerten" : "Lokal bauen";
      btn.textContent = label + (offer.cost && Nexus.formatCost(offer.cost) ? " (" + Nexus.formatCost(offer.cost) + ")" : "");
      btn.disabled = !offer.allowed;
      detail.textContent = offer.allowed ? device.effectText : offer.reason;
    });
  }

  function renderEventModal(state, ui) {
    var modal = document.getElementById("event-modal");
    if (!modal) {
      return;
    }
    var event = state.pendingEvent;
    var open = state.phase === "event" && event;
    modal.hidden = !open;
    if (!open) {
      return;
    }
    setText("event-title", event.title);
    setText("event-text", event.text);
    var choices = document.getElementById("event-choices");
    var pick = document.getElementById("event-resource-pick");
    var showPick = !!(ui && ui.investorAwaitingResource);
    pick.hidden = !showPick;
    choices.hidden = showPick;

    if (showPick) {
      pick.innerHTML =
        "<p>Wähle die Ressource für +2:</p>" +
        Nexus.RESOURCE_KEYS.map(function (key) {
          return (
            '<button type="button" class="btn" data-resource="' +
            key +
            '">' +
            Nexus.RESOURCE_LABELS[key] +
            "</button>"
          );
        }).join("");
      return;
    }

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
          (disabled ? " (nicht genug Ressourcen)" : "") +
          "</small></button>"
        );
      })
      .join("");
  }

  function renderEndScreen(state) {
    var screen = document.getElementById("end-screen");
    if (!screen) {
      return;
    }
    var ended = state.phase === "ended";
    screen.hidden = !ended;
    if (!ended || !state.score) {
      return;
    }
    setText("score-efficiency", formatNumber(state.score.efficiency));
    setText("score-privacy", formatNumber(state.score.privacy));
    setText("score-innovation", formatNumber(state.score.innovation));
    setText("score-total", formatNumber(state.score.total));
    setText(
      "score-detail",
      "Risiko " +
        state.score.risk +
        " → Datenschutz max(0, 20 − Risiko" +
        (state.privacyAdjustment ? " + Anpassung " + state.privacyAdjustment : "") +
        ")."
    );
  }

  Nexus.render = function (state, ui) {
    renderResources(state);
    renderDistrict(state);
    renderHomeBoard(state);
    renderLog(state);
    renderBuildModal(state, ui);
    renderEventModal(state, ui);
    renderEndScreen(state);
  };
})(window.Nexus);
