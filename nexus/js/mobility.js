window.Nexus = window.Nexus || {};

/* Straßengraph + SAE-Tore. Buslinien/Haltestellen/Depots sind raus (E-Taxi in state.js). */
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
      (graph.nodes[cur] || []).forEach(function (nb) {
        if (prev[nb] == null) {
          prev[nb] = cur;
          queue.push(nb);
        }
      });
    }
    if (prev[to] == null && from !== to) {
      return null;
    }
    var out = [];
    var walk = to;
    while (walk) {
      out.unshift(walk);
      if (walk === from) {
        break;
      }
      walk = prev[walk];
    }
    return out;
  }

  function zoneByKey(state, key) {
    var parts = parseKey(key);
    var found = null;
    (state.zones || []).forEach(function (zone) {
      if (zone.q === parts.q && zone.r === parts.r) {
        found = zone;
      }
    });
    return found;
  }

  /* DC-Sonderlogik entfernt — immer false. */
  function hasSecureDc() {
    return false;
  }

  /* No-Ops: Linien/Haltestellen/Depots entfernt. */
  function placeBusStop(state) {
    return state;
  }

  function setTrafficMode(state) {
    return state;
  }

  function openLine(state) {
    return state;
  }

  function applyTick(state) {
    return state;
  }

  function metrics(state, player) {
    var parking = 0;
    (state.zones || []).forEach(function (zone) {
      if (zone.ownerId !== player.id || zone.type !== "traffic") {
        return;
      }
      var mode = Nexus.normalizeTrafficMode
        ? Nexus.normalizeTrafficMode(zone)
        : zone.trafficMode || zone.variant;
      if (mode === "garage") {
        parking += 2;
      } else if (mode === "taxi") {
        parking += 1;
      }
    });
    return {
      renewableMobility: 0,
      commerceServed: 0,
      linkPartnerRatio: 0,
      parkingSites: parking
    };
  }

  function lineOffer() {
    return { allowed: false, reason: "Linien sind entfernt." };
  }

  Nexus.Mobility = {
    buildGraph: buildGraph,
    pathKeys: pathKeys,
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
