window.Nexus = window.Nexus || {};

/* Straßengraph, Haltestellen, Linien, SAE-Tore. Kein DOM, kein Three. */
(function (Nexus) {
  function dist(q, r) {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  function keyOf(q, r) {
    return q + "," + r;
  }

  function parseKey(key) {
    var parts = String(key).split(",");
    return { q: Number(parts[0]), r: Number(parts[1]) };
  }

  function buildGraph(radius) {
    var nodes = {};
    function ensure(k) {
      if (!nodes[k]) {
        nodes[k] = [];
      }
    }
    function link(a, b) {
      ensure(a);
      ensure(b);
      if (nodes[a].indexOf(b) < 0) {
        nodes[a].push(b);
      }
      if (nodes[b].indexOf(a) < 0) {
        nodes[b].push(a);
      }
    }
    (Nexus.allSlots(radius) || []).forEach(function (slot) {
      var k = keyOf(slot.q, slot.r);
      (Nexus.HEX_DIRS || []).forEach(function (dir) {
        var nq = slot.q + dir.q;
        var nr = slot.r + dir.r;
        if (dist(nq, nr) <= radius) {
          var nk = keyOf(nq, nr);
          if (k < nk) {
            link(k, nk);
          }
        }
      });
    });
    var corners = Nexus.HEX_CORNER_AXIAL ? Nexus.HEX_CORNER_AXIAL(radius) : [];
    var first = null;
    var prev = null;
    corners.forEach(function (corner, index) {
      var rim = "rim-" + index;
      link(rim, keyOf(corner.q, corner.r));
      if (prev) {
        link(prev, rim);
      }
      if (!first) {
        first = rim;
      }
      prev = rim;
    });
    if (prev && first) {
      link(prev, first);
    }
    return { radius: radius, nodes: nodes };
  }

  function pathKeys(graph, from, to) {
    if (!graph.nodes[from] || !graph.nodes[to]) {
      return null;
    }
    var queue = [from];
    var prev = {};
    prev[from] = "";
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      if (cur === to) {
        break;
      }
      graph.nodes[cur].forEach(function (next) {
        if (prev[next] === undefined) {
          prev[next] = cur;
          queue.push(next);
        }
      });
    }
    if (prev[to] === undefined) {
      return null;
    }
    var out = [to];
    var walk = to;
    while (walk !== from) {
      walk = prev[walk];
      out.push(walk);
    }
    out.reverse();
    return out;
  }

  function zoneByKey(state, key) {
    var pos = parseKey(key);
    var found = null;
    (state.zones || []).forEach(function (zone) {
      if (zone.q === pos.q && zone.r === pos.r) {
        found = zone;
      }
    });
    return found;
  }

  function playerById(state, id) {
    var found = null;
    (state.players || []).forEach(function (player) {
      if (player.id === id) {
        found = player;
      }
    });
    return found;
  }

  function replace(state, player) {
    return Object.assign({}, state, {
      players: state.players.map(function (item) {
        return item.id === player.id ? player : item;
      })
    });
  }

  function afford(resources, cost) {
    var keys = Nexus.RESOURCE_KEYS || ["energy", "money", "bandwidth"];
    return keys.every(function (key) {
      return (resources[key] || 0) >= (cost[key] || 0);
    });
  }

  function pay(resources, cost) {
    var next = Object.assign({}, resources);
    (Nexus.RESOURCE_KEYS || []).forEach(function (key) {
      next[key] = (next[key] || 0) - (cost[key] || 0);
    });
    return next;
  }

  function current(state) {
    return state.players[state.currentPlayerIndex];
  }

  function note(state, name, text) {
    var log = [{ round: state.round, playerName: name, text: text }].concat(state.log || []);
    return log.slice(0, 40);
  }

  function bump(scores, hint) {
    var next = Object.assign({}, scores || {});
    Object.keys(hint || {}).forEach(function (key) {
      next[key] = Math.max(0, (next[key] || 0) + hint[key]);
    });
    return next;
  }

  function hasSecureDc(state, playerId) {
    return (state.zones || []).some(function (zone) {
      return zone.ownerId === playerId && zone.type === "datacenter" && zone.variant === "secure";
    });
  }

  function hasDc(state, playerId) {
    return (state.zones || []).some(function (zone) {
      return zone.ownerId === playerId && zone.type === "datacenter";
    });
  }

  function hasSolar(state, playerId) {
    return (state.zones || []).some(function (zone) {
      return zone.ownerId === playerId && zone.type === "energy" && zone.variant !== "transformer";
    });
  }

  function saeOffer(state, player) {
    player = player || current(state);
    var level = (player && player.saeLevel) || 0;
    var cost = { money: 2, bandwidth: 0, energy: 0 };
    var why =
      "Höhere Stufen ersetzen den Fahrer. Sie brauchen Technik und fallen über Cyber und Netz aus, wenn die Technik fehlt.";
    var reason = "";
    if (!player || state.turnPhase !== "build") {
      return { allowed: false, reason: "Nur in der Bauphase.", cost: cost, why: why, level: level };
    }
    if (level >= 5) {
      return { allowed: false, reason: "SAE 5 ist erreicht.", cost: cost, why: why, level: level };
    }
    if (level === 0) {
      cost = { money: state.beginner ? 1 : 2, bandwidth: 0, energy: 0 };
      why = "Stufe 1 ist Assistenz. Noch kein Netz, schon ein Komfort- und Sicherheitsgewinn im Stadtbild.";
    } else if (level === 1) {
      cost = { money: 2, bandwidth: 1, energy: 0 };
      why = "Stufe 2 hält die Spur, braucht aber Augen: Kamera oder V2X.";
      if (!(player.devices && (player.devices.camera || player.devices.v2x))) {
        reason = "Stufe 2 braucht Sensorik (Kamera oder V2X).";
      }
    } else if (level === 2) {
      cost = { money: 3, bandwidth: 1, energy: 1 };
      why = "Stufe 3 fährt in festen Gebieten und braucht Rechenleistung im eigenen Datenzentrum.";
      if (!hasDc(state, player.id)) {
        reason = "Stufe 3 braucht ein eigenes Datenzentrum.";
      }
    } else if (level === 3) {
      cost = { money: 3, bandwidth: 2, energy: 1 };
      why = "Stufe 4 spricht mit der Kreuzung. Ohne V2X fehlt die Funkstrecke.";
      if (!(player.devices && player.devices.v2x)) {
        reason = "Stufe 4 braucht V2X.";
      }
    } else {
      cost = { money: 4, bandwidth: 3, energy: 1 };
      why = "Stufe 5 ist vollautomatisch und nur tragbar mit lokalem V2X oder gesichertem Rechenzentrum.";
      var localV2x = player.devices && player.devices.v2x === "local";
      if (!localV2x && !hasSecureDc(state, player.id)) {
        reason = "Stufe 5 braucht lokales V2X oder ein gesichertes Datenzentrum.";
      }
    }
    if (!reason && !afford(player.resources, cost)) {
      reason = "Ressourcen fehlen für SAE " + (level + 1) + ".";
    }
    return {
      allowed: !reason,
      reason: reason,
      cost: cost,
      why: why,
      level: level,
      next: level + 1
    };
  }

  function applySae(state) {
    var player = current(state);
    var offer = saeOffer(state, player);
    if (!offer.allowed) {
      return state;
    }
    var scores = bump(player.scores, offer.next === 2 || offer.next === 4 ? { comfort: 1 } : {});
    if (offer.next === 5) {
      scores = bump(scores, { comfort: 1 });
    }
    var shock = player.riskShock || 0;
    if (offer.next >= 4) {
      shock += offer.next === 5 ? 2 : 1;
    }
    var nextPlayer = Object.assign({}, player, {
      resources: pay(player.resources, offer.cost),
      saeLevel: offer.next,
      scores: scores,
      riskShock: shock
    });
    var next = replace(state, nextPlayer);
    next.log = note(
      next,
      player.name,
      "SAE " +
        offer.next +
        ". " +
        offer.why +
        (offer.next >= 4 ? " Die Stufe ist störanfälliger (Schock +" + (offer.next === 5 ? 2 : 1) + ")." : "")
    );
    return next;
  }

  function placeBusStop(state, zoneId) {
    var player = current(state);
    if (!player || state.turnPhase !== "build") {
      return state;
    }
    var zone = null;
    (state.zones || []).forEach(function (item) {
      if (item.id === zoneId) {
        zone = item;
      }
    });
    if (!zone || zone.ownerId !== player.id || zone.type === "home") {
      return state;
    }
    if (zone.busStop) {
      return state;
    }
    var cost = { money: state.beginner ? 1 : 2 };
    if (!afford(player.resources, cost)) {
      return state;
    }
    var zones = state.zones.map(function (item) {
      if (item.id !== zoneId) {
        return item;
      }
      return Object.assign({}, item, { busStop: true });
    });
    var nextPlayer = Object.assign({}, player, { resources: pay(player.resources, cost) });
    var next = replace(Object.assign({}, state, { zones: zones }), nextPlayer);
    next.log = note(next, player.name, "Haltestelle gesetzt. Warum: Nur am Halt kann eine Linie Komfort, Geld und weniger Autoverkehr bringen.");
    return next;
  }

  function setTrafficMode(state, zoneId, mode) {
    var player = current(state);
    if (!player || state.turnPhase !== "build") {
      return state;
    }
    if (mode !== "depot" && mode !== "garage") {
      return state;
    }
    var zone = null;
    (state.zones || []).forEach(function (item) {
      if (item.id === zoneId) {
        zone = item;
      }
    });
    if (!zone || zone.ownerId !== player.id || zone.type !== "traffic") {
      return state;
    }
    if (zone.trafficMode === mode) {
      return state;
    }
    var cost = mode === "depot" ? { money: 3, bandwidth: 1 } : { money: 4, energy: 2 };
    if (mode === "depot" && player.hasDepot) {
      return state;
    }
    if (!afford(player.resources, cost)) {
      return state;
    }
    var scores = player.scores;
    if (mode === "garage") {
      var hasGarage = (state.zones || []).some(function (item) {
        return item.ownerId === player.id && item.trafficMode === "garage";
      });
      if (!hasGarage) {
        scores = bump(scores, { comfort: 1, environment: 1 });
      }
    }
    var zones = state.zones.map(function (item) {
      if (item.id !== zoneId) {
        return item;
      }
      return Object.assign({}, item, { trafficMode: mode, busStop: mode === "depot" ? true : item.busStop });
    });
    var nextPlayer = Object.assign({}, player, {
      resources: pay(player.resources, cost),
      scores: scores,
      hasDepot: mode === "depot" ? true : player.hasDepot
    });
    var next = replace(Object.assign({}, state, { zones: zones }), nextPlayer);
    var why =
      mode === "depot"
        ? "Warum: Der Busbahnhof schaltet Linien frei, so wie das Datenzentrum Bandbreite freischaltet."
        : "Warum: Parkhaus mit Ladesäule und Solardach nimmt Autos aus der Fläche und speist ein wenig Strom.";
    next.log = note(next, player.name, (mode === "depot" ? "Busbahnhof." : "Parkhaus.") + " " + why);
    return next;
  }

  function stopKeyForZone(zone) {
    return keyOf(zone.q, zone.r);
  }

  function openLine(state, stopZoneIds, propulsion) {
    var player = current(state);
    if (!player || state.turnPhase !== "build") {
      return state;
    }
    propulsion = propulsion || "diesel";
    if (propulsion !== "diesel" && propulsion !== "electric" && propulsion !== "renewable") {
      return state;
    }
    if (!player.hasDepot) {
      return state;
    }
    if (propulsion === "electric" && !(player.devices && (player.devices.charger || player.devices.charging_network)) && !state.zones.some(function (zone) {
      return zone.ownerId === player.id && (zone.type === "energy" || zone.trafficMode === "garage");
    })) {
      return state;
    }
    if (propulsion === "renewable" && !hasSolar(state, player.id) && !(player.devices && player.devices.storage_battery)) {
      return state;
    }
    var stops = [];
    (stopZoneIds || []).forEach(function (id) {
      (state.zones || []).forEach(function (zone) {
        if (zone.id === id && (zone.busStop || zone.trafficMode === "depot")) {
          stops.push(zone);
        }
      });
    });
    if (stops.length < 2) {
      return state;
    }
    var stopSet = stops
      .map(function (zone) {
        return zone.id;
      })
      .sort()
      .join("|");
    var duplicate = (state.busLines || []).some(function (line) {
      return (
        line.ownerId === player.id &&
        (line.stopIds || []).slice().sort().join("|") === stopSet &&
        line.propulsion === propulsion
      );
    });
    if (duplicate) {
      return state;
    }
    var graph = buildGraph(state.hexRadius || Nexus.CONSTANTS.HEX_RADIUS);
    var full = [];
    var h;
    for (h = 0; h < stops.length - 1; h++) {
      var leg = pathKeys(graph, stopKeyForZone(stops[h]), stopKeyForZone(stops[h + 1]));
      if (!leg) {
        return state;
      }
      if (h > 0) {
        leg = leg.slice(1);
      }
      full = full.concat(leg);
    }
    var hops = Math.max(1, full.length - 1);
    var cost = {
      money: (state.beginner ? 1 : 2) + hops,
      bandwidth: 1 + ((player.saeLevel || 0) >= 3 ? 1 : 0)
    };
    if (!afford(player.resources, cost)) {
      return state;
    }
    var residential = 0;
    var foreign = 0;
    stops.forEach(function (zone) {
      if (zone.type === "residential") {
        residential += 1;
      }
      if (zone.ownerId !== player.id) {
        foreign += 1;
      }
    });
    var scores = bump(player.scores, { comfort: Math.min(2, residential) });
    if (propulsion === "renewable") {
      scores = bump(scores, { environment: 1 });
    } else if (propulsion === "diesel") {
      scores = bump(scores, { comfort: 1 });
    } else {
      scores = bump(scores, { environment: 0 });
    }
    if (foreign > 0) {
      scores = bump(scores, { image: 1 });
    }
    var line = {
      id: "line-" + (state.round || 1) + "-" + player.id + "-" + ((state.busLines || []).length + 1),
      ownerId: player.id,
      stopIds: stops.map(function (zone) {
        return zone.id;
      }),
      stopKeys: stops.map(stopKeyForZone),
      pathKeys: full,
      propulsion: propulsion,
      saeAtOpen: player.saeLevel || 0,
      hops: hops
    };
    var nextPlayer = Object.assign({}, player, {
      resources: pay(player.resources, cost),
      scores: scores
    });
    var next = replace(Object.assign({}, state, { busLines: (state.busLines || []).concat([line]) }), nextPlayer);
    next.log = note(
      next,
      player.name,
      "Linie (" +
        propulsion +
        ", " +
        hops +
        " Kanten). Warum: Verbundene Felder sparen Autoverkehr, Gewerbe an Halten nimmt Geld ein, Wohnen gewinnt Komfort. Höhere SAE macht das ertragreicher und über Cyber störanfälliger."
    );
    return next;
  }

  function applyTick(state) {
    var player = current(state);
    if (!player) {
      return state;
    }
    var lines = (state.busLines || []).filter(function (line) {
      return line.ownerId === player.id;
    });
    var energy = 0;
    var money = 0;
    if (player.hasDepot) {
      lines.forEach(function (line) {
        var n = (line.stopKeys || []).length;
        if (line.propulsion !== "diesel") {
          energy += Math.floor(n / 2);
        }
        if (n >= 2) {
          money += 1;
        }
        var residential = 0;
        (line.stopKeys || []).forEach(function (key) {
          var zone = zoneByKey(state, key);
          if (zone && zone.type === "residential") {
            residential += 1;
          }
        });
        money += Math.floor(residential / 2);
      });
    }
    (state.zones || []).forEach(function (zone) {
      if (zone.ownerId === player.id && zone.trafficMode === "garage") {
        energy += 1;
      }
    });
    energy = Math.min(3, energy);
    money = Math.min(2, money);
    var imageGain = 0;
    lines.forEach(function (line) {
      (line.stopKeys || []).forEach(function (key) {
        var zone = zoneByKey(state, key);
        if (zone && zone.ownerId !== player.id) {
          imageGain = 1;
        }
      });
    });
    if (imageGain && (player.scores.image || 0) >= 8) {
      imageGain = 0;
    }
    if (!energy && !money && !imageGain) {
      return state;
    }
    var resources = Object.assign({}, player.resources);
    resources.energy = (resources.energy || 0) + energy;
    resources.money = (resources.money || 0) + money;
    var scores = imageGain ? bump(player.scores, { image: imageGain }) : player.scores;
    var nextPlayer = Object.assign({}, player, { resources: resources, scores: scores });
    var next = replace(state, nextPlayer);
    next.log = note(
      next,
      player.name,
      "Mobilität: +" +
        energy +
        " Energie, +" +
        money +
        " Geld" +
        (imageGain ? ", +1 Image (fremder Halt)." : ".") +
        " Warum: Weniger Autoverkehr und Solardächer. Ein fremder Halt zeigt Zusammenarbeit, bis Image 8."
    );
    return next;
  }

  function metrics(state, player) {
    var lines = (state.busLines || []).filter(function (line) {
      return line.ownerId === player.id;
    });
    var renewable = 0;
    var commerce = 0;
    var others = {};
    lines.forEach(function (line) {
      var weight = line.propulsion === "renewable" ? 1 : 0;
      (line.stopKeys || []).forEach(function (key) {
        if (weight) {
          renewable += 1;
        }
        var zone = zoneByKey(state, key);
        if (zone && zone.type === "residential") {
          commerce += 1;
        }
        if (zone && zone.ownerId !== player.id) {
          others[zone.ownerId] = true;
        }
      });
    });
    var othersN = Math.max(0, (state.players || []).length - 1);
    var linkCount = Object.keys(others).length;
    var parking = 0;
    (state.zones || []).forEach(function (zone) {
      if (zone.ownerId !== player.id || zone.type !== "traffic") {
        return;
      }
      if (zone.trafficMode === "garage") {
        parking += 2;
      } else if (zone.trafficMode === "depot") {
        parking += 1;
      }
    });
    var sae = player.saeLevel || 0;
    var shielded = 0;
    if (sae > 0 && ((player.devices && player.devices.v2x === "local") || (sae <= 3 && hasSecureDc(state, player.id)))) {
      shielded = sae;
    }
    return {
      renewableMobility: renewable,
      commerceServed: commerce,
      linkPartnerRatio: othersN ? Math.round((linkCount / othersN) * 100) : 0,
      parkingSites: parking,
      shieldedSae: shielded,
      saeLevel: sae
    };
  }

  function lineOffer(state, stopZoneIds, propulsion) {
    var before = (state.busLines || []).length;
    var trial = openLine(state, stopZoneIds, propulsion);
    return {
      allowed: trial !== state && (trial.busLines || []).length > before,
      reason: trial === state ? "Linie nicht möglich (Bahnhof, Halte, Weg, Antrieb oder Ressourcen)." : ""
    };
  }

  Nexus.Mobility = {
    buildGraph: buildGraph,
    pathKeys: pathKeys,
    saeOffer: saeOffer,
    applySae: applySae,
    placeBusStop: placeBusStop,
    setTrafficMode: setTrafficMode,
    openLine: openLine,
    lineOffer: lineOffer,
    applyTick: applyTick,
    metrics: metrics,
    hasSecureDc: hasSecureDc,
    zoneByKey: zoneByKey
  };
})(window.Nexus);
