/* Abgabe-DoD Smoke: Sieg/Karma/Ziele/Stall/Transfer/Bau/Wohnen + §2.B.8 strukturell.
 * node tools/abgabe-smoke.js
 */
var Nexus = require("./boot.js");

var failed = 0;
var results = [];

function pass(name) {
  results.push({ name: name, ok: true });
  console.log("PASS  " + name);
}

function fail(name, detail) {
  failed += 1;
  results.push({ name: name, ok: false, detail: detail || "" });
  console.log("FAIL  " + name + (detail ? " — " + detail : ""));
}

function assert(cond, name, detail) {
  if (cond) {
    pass(name);
  } else {
    fail(name, detail);
  }
}

function rich(state, idx) {
  return Object.assign({}, state, {
    players: state.players.map(function (p, i) {
      if (i !== idx) {
        return p;
      }
      return Object.assign({}, p, {
        resources: { energy: 80, money: 80, bandwidth: 80 },
        freeZoneClaims: 0
      });
    })
  });
}

function withRole(state, idx, roleId) {
  return Object.assign({}, state, {
    players: state.players.map(function (p, i) {
      if (i !== idx) {
        return p;
      }
      return Object.assign({}, p, {
        roleId: roleId,
        goalProgress: Nexus.Goals.ensureProgress(p)
      });
    })
  });
}

function injectAdjacentForeign(state, ownerId, nearPlayerId, tileId) {
  var home = null;
  state.zones.forEach(function (z) {
    if (z.ownerId === nearPlayerId && z.type === "home") {
      home = z;
    }
  });
  var nbr = null;
  Nexus.HEX_DIRS.forEach(function (d) {
    var q = home.q + d.q;
    var r = home.r + d.r;
    if (!nbr && !state.zones.some(function (z) {
      return z.q === q && z.r === r;
    })) {
      nbr = { q: q, r: r };
    }
  });
  var def = Nexus.BUILD_TILES[tileId];
  var zone = {
    id: "zone-smoke-" + tileId + "-" + nbr.q + "-" + nbr.r,
    q: nbr.q,
    r: nbr.r,
    type: def.type,
    variant: def.variant || null,
    tileId: tileId,
    ownerId: ownerId,
    upgradeLevel: 0,
    harvested: true
  };
  return Object.assign({}, state, { zones: state.zones.concat([zone]) });
}

function costUnits(cost) {
  cost = cost || {};
  return (cost.energy || 0) + (cost.money || 0) + (cost.bandwidth || 0);
}

/* --- Track-B baseline --- */
try {
  var baseline = Nexus.runSmokeCheck();
  assert(baseline === "ok", "Track-B runSmokeCheck", String(baseline));
} catch (err) {
  fail("Track-B runSmokeCheck", err.message);
}

/* --- 1) Win at 10 own-SP --- */
(function () {
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, {
    players: s.players.map(function (p, i) {
      return Object.assign({}, p, { rolePoints: i === 0 ? 10 : 3, karma: 0 });
    })
  });
  var win = Nexus.checkInstantWinAtRoundEnd(s);
  assert(
    win && win.winnerId === s.players[0].id && win.turnPhase === "gameover",
    "win at 10 own-SP"
  );
  s = Object.assign({}, s, {
    players: s.players.map(function (p, i) {
      return Object.assign({}, p, { rolePoints: i === 0 ? 9 : 3, karma: 5 });
    })
  });
  assert(Nexus.checkInstantWinAtRoundEnd(s) === null, "no instant win under 10");
})();

/* --- 2) Karma tiebreak --- */
(function () {
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, {
    players: s.players.map(function (p, i) {
      return Object.assign({}, p, {
        rolePoints: 10,
        karma: i === 0 ? 1 : 3
      });
    })
  });
  var win = Nexus.checkInstantWinAtRoundEnd(s);
  assert(win && win.winnerId === s.players[1].id, "karma tiebreak at 10/10");
})();

/* --- 3) Goals tick + Abriss-Reset --- */
(function () {
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", screen: "game", currentPlayerIndex: 0 });
  s = rich(s, 0);
  s = withRole(s, 0, "climate");
  var home = s.zones.filter(function (z) {
    return z.ownerId === s.players[0].id;
  })[0];
  var pick = null;
  Nexus.HEX_DIRS.forEach(function (d) {
    var q = home.q + d.q;
    var r = home.r + d.r;
    if (!pick && Nexus.isExpandableSlot(s, q, r)) {
      pick = { q: q, r: r };
    }
  });
  s = Nexus.buyZone(s, pick.q, pick.r, null, null, "energy-wind");
  var built = s.zones.filter(function (z) {
    return z.q === pick.q && z.r === pick.r;
  })[0];
  var gp = s.players[0].goalProgress || {};
  assert(gp.buildMetric === 1, "goals tick buildMetric");
  assert((gp.sameType && gp.sameType["energy-wind"]) === 1, "goals tick sameType");
  s = Nexus.demolishZone(s, built.id);
  gp = s.players[0].goalProgress || {};
  assert(gp.buildMetric === 0, "Abriss-Reset buildMetric");
  assert((gp.sameType && gp.sameType["energy-wind"]) === 0, "Abriss-Reset sameType");
})();

/* --- 4) Karma clamp + event roll --- */
(function () {
  assert(Nexus.clampKarma(99) === 5 && Nexus.clampKarma(-99) === -5, "karma clamp ±5");
  assert(
    Nexus.KARMA_GENERIC_EVENTS &&
      Nexus.KARMA_GENERIC_EVENTS.length &&
      Nexus.KARMA_EXTREME_GOOD &&
      Nexus.KARMA_EXTREME_BAD,
    "karma event pools loaded"
  );
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, {
    turnPhase: "produce",
    currentPlayerIndex: 0,
    players: s.players.map(function (p, i) {
      if (i) {
        return p;
      }
      return Object.assign({}, p, { karma: 4, pendingEvent: null });
    })
  });
  var rolled = Nexus.maybeRollKarmaEvent(s);
  assert(
    rolled.turnPhase === "event" && rolled.players[0].pendingEvent,
    "karma event roll at +4 (100%)"
  );
  s = Object.assign({}, s, {
    players: s.players.map(function (p, i) {
      if (i) {
        return p;
      }
      return Object.assign({}, p, { karma: 0, pendingEvent: null });
    })
  });
  assert(Nexus.maybeRollKarmaEvent(s) === s, "no karma event at 0");
  s = Object.assign({}, s, {
    players: s.players.map(function (p, i) {
      if (i) {
        return p;
      }
      return Object.assign({}, p, { karma: 5, pendingEvent: null });
    })
  });
  var extreme = Nexus.maybeRollKarmaEvent(s);
  assert(
    extreme.turnPhase === "event" &&
      extreme.players[0].pendingEvent &&
      extreme.players[0].pendingEvent.id === Nexus.KARMA_EXTREME_GOOD.id,
    "karma extreme +5 event"
  );
})();

/* --- 5) Stall accept limit 2 --- */
(function () {
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", currentPlayerIndex: 0 });
  s = rich(s, 0);
  s = rich(s, 1);
  var offer = {
    give: { kind: "resource", resource: "energy", amount: 1 },
    want: { kind: "resource", resource: "money", amount: 1 }
  };
  s = Nexus.setStallSlot(s, 0, offer);
  s = Nexus.setStallSlot(s, 1, offer);
  s = Nexus.setStallSlot(s, 2, offer);
  s = Object.assign({}, s, { currentPlayerIndex: 1 });
  s = Nexus.acceptStall(s, s.players[0].id, 0);
  s = Nexus.acceptStall(s, s.players[0].id, 1);
  assert(s.players[1].stallAcceptsThisTurn === 2, "stall accepts reach 2");
  var blocked = Nexus.acceptStall(s, s.players[0].id, 2);
  assert(
    blocked.players[1].stallAcceptsThisTurn === 2 &&
      (blocked === s || blocked.players[1].resources.energy === s.players[1].resources.energy),
    "stall accept limit blocks #3"
  );
})();

/* --- 6) Transfer gift / buy / reject --- */
(function () {
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", currentPlayerIndex: 1 });
  s = rich(s, 0);
  s = rich(s, 1);
  s = injectAdjacentForeign(s, s.players[0].id, s.players[1].id, "energy-wind");
  var zone = s.zones[s.zones.length - 1];
  var can = Nexus.canRequestTransfer(s, zone.id);
  assert(can.allowed, "transfer request allowed when adjacent");
  s = Nexus.requestTransfer(s, zone.id);
  var tid = s.pendingTransfers[0].id;
  var windCost = Nexus.BUILD_TILES["energy-wind"].cost;
  assert(
    s.pendingTransfers[0].cost.energy === windCost.energy &&
      s.pendingTransfers[0].cost.money === windCost.money,
    "transfer cost from BUILD_TILES"
  );

  s = Object.assign({}, s, { currentPlayerIndex: 0 });
  var rej = Nexus.resolveTransfer(s, tid, "reject", { rejectMode: "karma" });
  assert(rej.players[0].karma === -1, "transfer reject karma −1");
  assert(!(rej.pendingTransfers || []).length, "transfer reject clears queue");

  /* gift */
  s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", currentPlayerIndex: 1 });
  s = rich(s, 0);
  s = rich(s, 1);
  s = withRole(s, 0, "climate");
  s = injectAdjacentForeign(s, s.players[0].id, s.players[1].id, "energy-wind");
  zone = s.zones[s.zones.length - 1];
  s = Nexus.requestTransfer(s, zone.id);
  tid = s.pendingTransfers[0].id;
  s = Object.assign({}, s, { currentPlayerIndex: 0 });
  var gift = Nexus.resolveTransfer(s, tid, "gift");
  var gifted = gift.zones.filter(function (z) {
    return z.id === zone.id;
  })[0];
  assert(gifted.ownerId === s.players[1].id, "transfer gift ownership");
  assert(
    (gift.players[0].rolePoints || 0) >= 1,
    "transfer gift awards own-metric SP (or goal)"
  );

  /* buy */
  s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", currentPlayerIndex: 1 });
  s = rich(s, 0);
  s = rich(s, 1);
  s = injectAdjacentForeign(s, s.players[0].id, s.players[1].id, "energy-coal");
  zone = s.zones[s.zones.length - 1];
  s = Nexus.requestTransfer(s, zone.id);
  tid = s.pendingTransfers[0].id;
  var coalCost = Nexus.BUILD_TILES["energy-coal"].cost;
  var buyerMoney = s.players[1].resources.money;
  var ownerMoney = s.players[0].resources.money;
  s = Object.assign({}, s, { currentPlayerIndex: 0 });
  var bought = Nexus.resolveTransfer(s, tid, "buy");
  var bz = bought.zones.filter(function (z) {
    return z.id === zone.id;
  })[0];
  assert(bz.ownerId === s.players[1].id, "transfer buy ownership");
  assert(
    bought.players[1].resources.money === buyerMoney - (coalCost.money || 0),
    "transfer buy deducts buyer"
  );
  assert(
    bought.players[0].resources.money === ownerMoney + (coalCost.money || 0),
    "transfer buy pays owner"
  );

  /* reject resource mode */
  s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", currentPlayerIndex: 1 });
  s = rich(s, 0);
  s = rich(s, 1);
  s = injectAdjacentForeign(s, s.players[0].id, s.players[1].id, "energy-wind");
  zone = s.zones[s.zones.length - 1];
  s = Nexus.requestTransfer(s, zone.id);
  tid = s.pendingTransfers[0].id;
  var penalty =
    (Nexus.REJECT_OFFER_COST && Nexus.REJECT_OFFER_COST.resources) || { money: 1 };
  var before = s.players[0].resources.money;
  s = Object.assign({}, s, { currentPlayerIndex: 0 });
  var resRej = Nexus.resolveTransfer(s, tid, "reject", { rejectMode: "resource" });
  assert(
    resRej.players[0].resources.money === before - (penalty.money || 0) &&
      resRej.players[0].karma === 0,
    "transfer reject resource cost"
  );
})();

/* --- 7) buyZone tileId + BUILD_TILES costs --- */
(function () {
  var s = Nexus.startGame(2, "short");
  s = Object.assign({}, s, { turnPhase: "build", currentPlayerIndex: 0 });
  s = rich(s, 0);
  var home = s.zones.filter(function (z) {
    return z.ownerId === s.players[0].id;
  })[0];
  var pick = null;
  Nexus.HEX_DIRS.forEach(function (d) {
    var q = home.q + d.q;
    var r = home.r + d.r;
    if (!pick && Nexus.isExpandableSlot(s, q, r)) {
      pick = { q: q, r: r };
    }
  });
  var offer = Nexus.getExpandOffer(s, pick.q, pick.r, null, null, "commerce-recycle");
  var def = Nexus.BUILD_TILES["commerce-recycle"];
  assert(
    offer.allowed &&
      offer.tileId === "commerce-recycle" &&
      offer.cost.energy === def.cost.energy &&
      offer.cost.money === def.cost.money,
    "buyZone/getExpandOffer tileId + BUILD_TILES costs"
  );
  s = Nexus.buyZone(s, pick.q, pick.r, null, null, "commerce-recycle");
  var built = s.zones.filter(function (z) {
    return z.q === pick.q && z.r === pick.r;
  })[0];
  assert(built && built.tileId === "commerce-recycle", "buyZone stores tileId");
})();

/* --- 8) No DC-gate on Wohnen --- */
(function () {
  var s = Nexus.startGame(2, "short");
  var player = Object.assign({}, s.players[0], {
    resources: { energy: 10, money: 10, bandwidth: 0 }
  });
  var zone = {
    type: "residential",
    variant: null,
    tileId: "data-residential",
    upgradeLevel: 0,
    ownerId: player.id
  };
  var y = Nexus.produceForZone
    ? Nexus.produceForZone(zone, 0, player, { zones: [zone] })
    : null;
  /* produceForZone may be internal — fall back via describe / smoke path */
  if (!y && Nexus.describeZoneBuild) {
    var preview = Nexus.describeZoneBuild(s, "residential", null);
    assert(
      preview &&
        preview.production &&
        preview.production.amount > 0 &&
        !(preview.flags && preview.flags.residentialNeedsDc),
      "Wohnen yield without DC (preview)"
    );
  } else {
    assert(
      y && y.primary && y.primary.resource === "bandwidth" && y.primary.amount > 0,
      "Wohnen yield without DC"
    );
  }
})();

/* --- §2.B.8 testable structural checks (7–8 + catalog sanity) --- */
(function () {
  var ids = Nexus.BUILD_TILE_IDS || Object.keys(Nexus.BUILD_TILES || {});
  assert(ids.length === 15, "15 BUILD_TILES", "got " + ids.length);

  var metrics = ["eco", "innovation", "trust", "comfort", "image", "finance"];
  var portfolio = {};
  metrics.forEach(function (m) {
    portfolio[m] = ids.filter(function (id) {
      return Nexus.tileMatchesMetric(id, m);
    });
    assert(portfolio[m].length >= 3, "§2.B.8 metric portfolio ≥3: " + m, String(portfolio[m]));
  });

  /* 7: Metrik-Rush Kostenband — Summe CostUnits der Metrik-Tiles nahe beieinander */
  var rushCosts = metrics.map(function (m) {
    var sum = 0;
    portfolio[m].forEach(function (id) {
      sum += costUnits(Nexus.BUILD_TILES[id].cost);
    });
    return { m: m, sum: sum };
  });
  var mean =
    rushCosts.reduce(function (a, b) {
      return a + b.sum;
    }, 0) / rushCosts.length;
  var maxDev = Math.max.apply(
    null,
    rushCosts.map(function (r) {
      return Math.abs(r.sum - mean) / mean;
    })
  );
  assert(
    maxDev <= 0.45,
    "§2.B.8.7 Metrik-Rush Kostenband (±45%)",
    "maxDev=" + maxDev.toFixed(3) + " " + JSON.stringify(rushCosts)
  );

  /* 8: Wirtschafts-Engine strukturell unabhängig von Metrik — jede Lane hat A–D */
  var lanes = {
    energy: ["energy-wind", "energy-nuclear", "energy-coal", "energy-solar"],
    commerce: ["commerce-small", "commerce-large", "commerce-factory", "commerce-recycle"],
    data: ["data-residential", "data-server", "data-taxi", "data-admin"]
  };
  Object.keys(lanes).forEach(function (lane) {
    var missing = lanes[lane].filter(function (id) {
      return !Nexus.BUILD_TILES[id];
    });
    assert(!missing.length, "§2.B.8.8 lane complete: " + lane, missing.join(","));
  });
  var laneMeans = Object.keys(lanes).map(function (lane) {
    var sum = 0;
    lanes[lane].forEach(function (id) {
      sum += costUnits(Nexus.BUILD_TILES[id].cost);
    });
    return sum / lanes[lane].length;
  });
  var laneMean =
    laneMeans.reduce(function (a, b) {
      return a + b;
    }, 0) / laneMeans.length;
  var laneDev = Math.max.apply(
    null,
    laneMeans.map(function (v) {
      return Math.abs(v - laneMean) / laneMean;
    })
  );
  assert(
    laneDev <= 0.4,
    "§2.B.8.8 Lane-Mix CostUnits nahe (±40%)",
    "laneDev=" + laneDev.toFixed(3)
  );
})();

console.log("");
console.log(failed ? failed + " failed" : "all scenarios passed");
process.exit(failed ? 1 : 0);
