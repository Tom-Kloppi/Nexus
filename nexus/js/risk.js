window.Nexus = window.Nexus || {};

/* Risiko = Stadtdruck. Intern mehrere Ursachen, am Tisch nur Zahl + Top-Ursache. */
(function (Nexus) {
  var EVENT_THRESHOLD = 8;

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function zonesOf(state, playerId) {
    return (state.zones || []).filter(function (zone) {
      return zone.ownerId === playerId && zone.type !== "home";
    });
  }

  function deviceCount(player, mode) {
    var n = 0;
    (Nexus.DEVICES || []).forEach(function (device) {
      var have = player.devices && player.devices[device.id];
      if (!have) {
        return;
      }
      if (!mode || have === mode) {
        n += 1;
      }
    });
    return n;
  }

  function factorsFor(state, player) {
    var zones = zonesOf(state, player.id);
    var cloud = deviceCount(player, "cloud");
    var local = deviceCount(player, "local");
    var insecure = 0;
    var secure = 0;
    var solar = 0;
    var transformer = 0;
    var nuclear = 0;
    var residential = 0;
    var traffic = 0;
    var garages = 0;
    zones.forEach(function (zone) {
      if (zone.type === "datacenter" && zone.variant === "insecure") {
        insecure += 1;
      }
      if (zone.type === "datacenter" && zone.variant === "secure") {
        secure += 1;
      }
      if (zone.type === "energy" && zone.variant === "solar") {
        solar += 1;
      }
      if (zone.type === "energy" && zone.variant === "transformer") {
        transformer += 1;
      }
      if (zone.type === "energy" && zone.variant === "nuclear") {
        nuclear += 1;
      }
      if (zone.type === "residential") {
        residential += 1;
      }
      if (zone.type === "traffic") {
        traffic += 1;
        if (zone.trafficMode === "garage") {
          garages += 1;
        }
      }
    });
    /* Assistenz/SAE und Standards-Wahl sind raus — Cyber/Abhängigkeit ohne diese Hebel. */
    var cyber =
      cloud * 3 +
      insecure * 4 +
      nuclear * 5 -
      local * 2 -
      (secure ? 3 : 0) -
      (player.devices && player.devices.hub === "local" ? 2 : 0) -
      (player.devices && player.devices.lock === "local" ? 2 : 0);
    cyber = clamp(cyber, 0, 16);

    var demand = residential * 2 + cloud + Math.max(0, traffic - garages);
    var supply =
      solar * 3 +
      transformer * 2 +
      nuclear * 5 +
      (player.devices && player.devices.storage_battery ? 3 : 0) +
      garages;
    var grid = clamp(Math.max(0, demand - supply), 0, 12);

    /* Abhängigkeit fließt in Cyber (Technik-Vertrauen), nicht als eigene Spur. */
    var dependency =
      (cloud > 0 && local === 0 ? 4 : 0) +
      (transformer > 0 && solar === 0 ? 2 : 0);
    dependency = clamp(dependency, 0, 10);
    cyber = clamp(cyber + Math.round(dependency * 0.75), 0, 18);

    var stops = 0;
    var mitigated = 0;
    (state.busLines || []).forEach(function (line) {
      if (line.ownerId !== player.id) {
        return;
      }
      (line.stopKeys || []).forEach(function () {
        stops += 1;
      });
      mitigated += (line.stopKeys || []).length * (line.propulsion === "diesel" ? 1 : 2);
    });
    var trafficLoad = 0;
    if (traffic > 0) {
      trafficLoad = clamp(traffic * 2 + Math.max(0, 2 - stops) - mitigated - garages, 0, 12);
    }
    /* Verkehr zählt zur Netz-Last — eine Ursache am Tisch, kein eigener Balken. */
    var cityLoad = clamp(grid + Math.round(trafficLoad * 0.85), 0, 18);

    return {
      cyber: {
        id: "cyber",
        label: "Cyber",
        value: cyber,
        why:
          "Cloud, offene Rechenzentren und einseitige Technik. Lokal, Schloss, Hub und geschlossenes Rechenzentrum ziehen ab.",
        counter: "Geräte lokal schalten, Rechenzentrum schließen, eigene Solarfläche statt nur Trafo."
      },
      grid: {
        id: "grid",
        label: "Netz",
        value: cityLoad,
        why:
          "Strombedarf " +
          demand +
          " gegen Erzeugung/Speicher " +
          supply +
          (trafficLoad ? "; Verkehrslast " + trafficLoad : "") +
          ".",
        counter: "Solar, Speicher, Garagen und E-Taxi-Stationen."
      },
      demand: demand,
      supply: supply,
      trafficLoad: trafficLoad,
      gridRaw: grid,
      dependencyRaw: dependency
    };
  }

  function totalOf(pack) {
    return pack.cyber.value + pack.grid.value;
  }

  function preview(state, player) {
    var pack = factorsFor(state, player);
    var base = totalOf(pack);
    var shock = Math.max(0, player.riskShock || 0);
    var shown = clamp(base + shock, 0, 40);
    var diff = state.difficulty || "normal";
    var neg = clamp(6 + Math.round(base * 1.35), 6, 42);
    var pos = clamp(18 - Math.round(base * 0.7), 4, 22);
    if (diff === "easy") {
      neg = Math.max(4, Math.round(neg * 0.75));
    }
    if (diff === "hard") {
      neg = Math.min(55, Math.round(neg * 1.2));
      pos = Math.max(3, pos - 4);
    }
    var major = !!(state.majorArmed && !state.majorFired);
    if (major) {
      neg = Math.min(70, neg + 18);
    }
    var top = [pack.cyber, pack.grid].sort(function (a, b) {
      return b.value - a.value;
    })[0];
    /* Event-Familie feiner wählen, Anzeige bleibt Cyber/Netz. */
    var eventFamily = top.id;
    if (top.id === "grid" && (pack.trafficLoad || 0) > (pack.gridRaw || 0)) {
      eventFamily = "traffic";
    } else if (top.id === "cyber" && (pack.dependencyRaw || 0) >= 4) {
      eventFamily = "dependency";
    }
    return {
      factors: [pack.cyber, pack.grid],
      base: base,
      shock: shock,
      total: shown,
      threshold: EVENT_THRESHOLD,
      pNeg: neg,
      pPos: pos,
      major: major,
      top: top,
      eventFamily: eventFamily,
      demand: pack.demand,
      supply: pack.supply,
      summary: (function () {
        if (!top.value) {
          return "Stadtdruck niedrig. Ab " + EVENT_THRESHOLD + " kommt ein Ereignis.";
        }
        return (
          top.label +
          " " +
          top.value +
          " · Schwelle " +
          EVENT_THRESHOLD +
          ". " +
          (top.counter || "")
        );
      })()
    };
  }

  function hasCloudCamera(player) {
    return player.devices && player.devices.camera === "cloud";
  }

  function annotate(event, preview, roll, hit) {
    var top = preview.top;
    var copy = Object.assign({}, event, {
      cause: event.cause || top.why,
      counter: event.counter || top.counter,
      factorId: event.family || top.id,
      roll: roll,
      threshold: hit === "neg" ? preview.pNeg : preview.pNeg + preview.pPos,
      hit: hit
    });
    copy.text = event.text;
    return copy;
  }

  function pool(hit, family) {
    var neg = {
      cyber: ["data-leak", "software-update"],
      grid: ["power-outage", "bandwidth", "maintenance"],
      dependency: ["investor", "standard-split"],
      traffic: ["evasion-update", "bandwidth"]
    };
    var pos = {
      cyber: ["local-hub-funding", "civic-hearing"],
      grid: ["green-grant", "overproduction"],
      dependency: ["local-hub-funding", "standard-split"],
      traffic: ["green-grant", "civic-hearing"]
    };
    var major = {
      cyber: ["major-breach"],
      grid: ["major-blackout"],
      dependency: ["major-blackout"],
      traffic: ["major-jam"]
    };
    if (hit === "major") {
      return major[family] || major.grid;
    }
    return (hit === "pos" ? pos : neg)[family] || ["maintenance"];
  }

  function chooseEvent(state, player, hit, view, roll) {
    var family = view.eventFamily || (view.top && view.top.id) || "grid";
    var ids = pool(view.major && hit === "neg" ? "major" : hit, family);
    var i;
    for (i = 0; i < ids.length; i++) {
      var def = Nexus.EVENTS_BY_ID && Nexus.EVENTS_BY_ID[ids[i]];
      if (!def) {
        continue;
      }
      if (def.requiresCloudCamera && !hasCloudCamera(player)) {
        continue;
      }
      return annotate(def, view, roll, hit);
    }
    var fallback = Nexus.EVENTS_BY_ID && Nexus.EVENTS_BY_ID[hit === "pos" ? "green-grant" : "maintenance"];
    return fallback ? annotate(fallback, view, roll, hit) : null;
  }

  function syncState(state, options) {
    options = options || {};
    var players = (state.players || []).map(function (player) {
      var shock = Math.max(0, player.riskShock || 0);
      if (options.decay) {
        shock = Math.max(0, shock - 1);
      }
      var view = preview(Object.assign({}, state, { players: state.players }), Object.assign({}, player, { riskShock: shock }));
      return Object.assign({}, player, {
        riskShock: shock,
        risk: view.total,
        riskView: {
          total: view.total,
          threshold: view.threshold || EVENT_THRESHOLD,
          topId: view.top ? view.top.id : "grid",
          topLabel: view.top ? view.top.label : "Netz",
          topValue: view.top ? view.top.value : 0,
          why: view.top ? view.top.why : "",
          counter: view.top ? view.top.counter : "",
          summary: view.summary,
          factors: view.factors.map(function (factor) {
            return { id: factor.id, label: factor.label, value: factor.value };
          })
        }
      });
    });
    return Object.assign({}, state, { players: players });
  }

  function resolve(state, player, roll) {
    var view = preview(state, player);
    var hit = "none";
    if (roll <= view.pNeg) {
      hit = "neg";
    } else if (roll <= view.pNeg + view.pPos) {
      hit = "pos";
    }
    var event = hit === "none" ? null : chooseEvent(state, player, hit, view, roll);
    if (event && event.id === "major-blackout" && player.devices && player.devices.storage_battery) {
      event = Object.assign({}, event, {
        text: event.text + " Der Batteriespeicher fängt 1 Energie auf.",
        choices: (event.choices || []).map(function (choice) {
          var effects = Object.assign({}, choice.effects || {}, { energy: 1 });
          return Object.assign({}, choice, { effects: effects, summary: choice.summary + ", +1 Energie aus dem Speicher" });
        })
      });
    }
    var next = syncState(state, { decay: false });
    if (view.major && hit === "neg") {
      next = Object.assign({}, next, { majorFired: true, majorArmed: false });
    }
    var log =
      "Wurf " +
      roll +
      "/100. Negativ ≤ " +
      view.pNeg +
      ", positiv ≤ " +
      (view.pNeg + view.pPos) +
      ". " +
      (event ? event.title + "." : "Kein Ereignis.") +
      " " +
      view.summary;
    return { state: next, event: event, log: log, preview: view, hit: hit };
  }

  function cityEvent(state, player) {
    var view = preview(state, player);
    if (!view.major && (view.total || 0) < EVENT_THRESHOLD) {
      return null;
    }
    return chooseEvent(state, player, "neg", view, 0);
  }

  Nexus.Risk = {
    EVENT_THRESHOLD: EVENT_THRESHOLD,
    factorsFor: factorsFor,
    preview: preview,
    syncState: syncState,
    resolve: resolve,
    cityEvent: cityEvent
  };
})(window.Nexus);
