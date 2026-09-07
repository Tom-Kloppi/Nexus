window.Nexus = window.Nexus || {};

(function (Nexus) {
  var C = Nexus.CONSTANTS;
  var lastResourceSnapshot = null;

  function formatNumber(value) {
    if (typeof value === "number" && value % 1 !== 0) {
      return String(Math.round(value * 10) / 10);
    }
    return String(value);
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

  function bandSettleRatio(bandId) {
    var total = 0;
    var before = 0;
    var width = 0;
    C.PRODUCTION_BANDS.forEach(function (band) {
      if (band.id === bandId) {
        before = total;
        width = band.weight;
      }
      total += band.weight;
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

  function renderWallet(state) {
    var expected = Nexus.expectedByResource(state);
    Nexus.RESOURCE_KEYS.forEach(function (key) {
      var el = document.getElementById("res-" + key);
      var changed = !lastResourceSnapshot || lastResourceSnapshot[key] !== state.resources[key];
      setDigitGroup(el, state.resources[key], changed && !!lastResourceSnapshot);
      var expect = document.getElementById("expect-" + key);
      if (expect) {
        expect.textContent = "~" + formatNumber(expected[key]);
      }
    });
    setDigitGroup(
      document.getElementById("stat-round"),
      state.round > C.MAX_ROUNDS ? C.MAX_ROUNDS : state.round,
      false
    );
    setDigitGroup(document.getElementById("stat-risk"), state.risk, false);
    document.getElementById("risk-meter").style.setProperty("--risk", Math.min(20, state.risk));
    lastResourceSnapshot = Object.assign({}, state.resources);
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

    var html = "";
    var selected = ui && ui.expandSlot;
    var totalWeight = C.PRODUCTION_BANDS.reduce(function (sum, band) {
      return sum + band.weight;
    }, 0);

    slots.forEach(function (slot) {
      var pos = Nexus.axialToPixel(slot.q, slot.r, size);
      var cx = originX + pos.x;
      var cy = originY + pos.y;
      var plot = Nexus.plotAt(state, slot.q, slot.r);
      var expandable = Nexus.isExpandableSlot(state, slot.q, slot.r) && state.phase === "build";
      var isSelected = selected && selected.q === slot.q && selected.r === slot.r;

      if (plot) {
        var color = Nexus.RESOURCE_COLORS[plot.resource];
        var spinning = state.spinningPlotId === plot.id;
        var ready = state.phase === "produce" && !plot.harvested;
        var done = !!plot.harvested;
        var barW = size * 1.2;
        var barH = 10;
        var barX = cx - barW / 2;
        var barY = cy + size * 0.42;
        var xCursor = barX;
        var bands = "";
        C.PRODUCTION_BANDS.forEach(function (band) {
          var w = (band.weight / totalWeight) * barW;
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
            band.color +
            '" rx="2"></rect>';
          xCursor += w;
        });
        var settle = plot.lastBand ? bandSettleRatio(plot.lastBand) : 0.42;
        var needleX = barX + settle * barW;
        var showAmount = plot.harvested || spinning;
        html +=
          '<g class="hex hex-owned' +
          (ready ? " is-ready" : "") +
          (done ? " is-done" : "") +
          (spinning ? " is-spinning" : "") +
          '" data-plot="' +
          plot.id +
          '" data-owned="1">' +
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
          Nexus.iconGroup(plot.resource) +
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
          'px">' +
          '<polygon points="-5,-6 5,-6 0,10" fill="#071018"></polygon></g></g>' +
          (showAmount
            ? '<text class="hex-amount" x="' +
              cx +
              '" y="' +
              (cy + 10) +
              '">' +
              (plot.lastAmount > 0 ? "+" + plot.lastAmount : "–") +
              "</text>"
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

    var left = Nexus.remainingHarvestCount(state);
    var harvestBtn = document.getElementById("btn-harvest-all");
    harvestBtn.disabled = state.phase !== "produce" || left === 0;
    harvestBtn.textContent = left > 0 ? "Alles ernten (" + left + ")" : "Alles ernten";
    document.getElementById("btn-end-round").disabled = !Nexus.canEndRound(state);

    var hint = document.getElementById("table-hint");
    if (state.phase === "produce") {
      hint.textContent = left + " Feld" + (left === 1 ? "" : "er") + " bereit – tippen zum Ernten";
    } else if (state.phase === "spinning") {
      hint.textContent = "Produktion läuft …";
    } else if (state.phase === "event") {
      hint.textContent = "Ein Ereignis wartet";
    } else if (state.phase === "build") {
      hint.textContent = "Baue Geräte, erweitere Felder oder beende den Tag";
    } else {
      hint.textContent = "";
    }
  }

  function renderHome(state, ui) {
    var list = document.getElementById("device-list");
    var inspected = ui && ui.inspectedDevice;
    list.innerHTML = Nexus.DEVICES.map(function (device) {
      var mode = state.devices[device.id];
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
    if (!inspected || state.phase === "event") {
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
    if (state.hubDiscountPending) {
      flags.push("Hub-Rabatt");
    }
    if (state.localHardwareDiscountPending) {
      flags.push("Förderung");
    }
    document.getElementById("build-flags").textContent = flags.join(" · ");
  }

  function renderExpandModal(state, ui) {
    var shell = document.getElementById("expand-modal");
    var slot = ui && ui.expandSlot;
    var shouldOpen = !!(slot && state.phase === "build");
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    document.getElementById("expand-cost").innerHTML = chipsHtml(Nexus.getExpandCost(state));
    document.getElementById("expand-choices").innerHTML = Nexus.RESOURCE_KEYS.map(function (key) {
      var offer = Nexus.getExpandOffer(state, slot.q, slot.r, key);
      return (
        '<button type="button" class="tile-pick chip-' +
        key +
        '" data-resource="' +
        key +
        '"' +
        (offer.allowed ? "" : " disabled") +
        ">" +
        Nexus.RESOURCE_ICONS[key] +
        "</button>"
      );
    }).join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderEventModal(state, ui) {
    var shell = document.getElementById("event-modal");
    var event = state.pendingEvent;
    var shouldOpen = state.phase === "event" && event;
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    document.getElementById("event-title").textContent = event.title;
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
      .slice(0, 5)
      .map(function (entry) {
        return "<li>" + entry.text + "</li>";
      })
      .join("");
  }

  function renderEndScreen(state) {
    var shell = document.getElementById("end-screen");
    var ended = state.phase === "ended";
    if (!ended) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    if (!state.score) {
      return;
    }
    document.getElementById("score-efficiency").textContent = formatNumber(state.score.efficiency);
    document.getElementById("score-privacy").textContent = formatNumber(state.score.privacy);
    document.getElementById("score-innovation").textContent = formatNumber(state.score.innovation);
    document.getElementById("score-total").textContent = formatNumber(state.score.total);
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  Nexus.render = function (state, ui) {
    renderWallet(state);
    renderDistrict(state, ui);
    renderHome(state, ui);
    renderExpandModal(state, ui);
    renderEventModal(state, ui);
    renderLog(state);
    renderEndScreen(state);
  };

  Nexus.openModal = openModal;
  Nexus.closeModal = closeModal;
  Nexus.pushToast = pushToast;
  Nexus.spawnFloat = spawnFloat;
  Nexus.chipsHtml = chipsHtml;
})(window.Nexus);
