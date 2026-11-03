/* Bot-Partien. Ausgabe: Siegquoten, Ereignisse, Sackgassen. */
var Nexus = require("./boot.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function choiceFor(state) {
  var player = Nexus.currentPlayer(state);
  var event = player && player.pendingEvent;
  if (!event) {
    return null;
  }
  var best = null;
  (event.choices || []).forEach(function (choice) {
    if (!Nexus.canChooseEventOption(state, choice.id)) {
      return;
    }
    var risk = (choice.effects && choice.effects.risk) || 0;
    var score = player.roleId === "privacy" || player.roleId === "climate" ? -risk : 1;
    if (!best || score > best.score) {
      best = { id: choice.id, score: score, needs: choice.needsResourcePick };
    }
  });
  return best;
}

function tryBuild(state, type, variant) {
  var player = Nexus.currentPlayer(state);
  var home = null;
  (state.zones || []).forEach(function (zone) {
    if (zone.ownerId === player.id) {
      home = home || zone;
    }
  });
  if (!home) {
    return state;
  }
  var pick = null;
  (Nexus.boardSlots() || []).some(function (slot) {
    if (Nexus.isExpandableSlot(state, slot.q, slot.r)) {
      var offer = Nexus.getExpandOffer(state, slot.q, slot.r, type, variant);
      if (offer.allowed) {
        pick = slot;
        return true;
      }
    }
    return false;
  });
  if (!pick) {
    return state;
  }
  return Nexus.buyZone(state, pick.q, pick.r, type, variant);
}

function tryProject(state) {
  var i;
  for (i = 0; i < (state.projectMarket || []).length; i++) {
    var card = state.projectMarket[i];
    var want =
      !card ||
      (Nexus.currentPlayer(state).roleId === "climate" && card.category === "green") ||
      (Nexus.currentPlayer(state).roleId === "privacy" && card.category === "privacy") ||
      card.category === "mobility" ||
      card.category === "general";
    if (want && Nexus.Projects.offer(state, i).allowed) {
      return Nexus.takeProject(state, i);
    }
  }
  return state;
}

function tryMobility(state) {
  var player = Nexus.currentPlayer(state);
  var ownStops = [];
  var foreign = [];
  (state.zones || []).forEach(function (zone) {
    if (zone.busStop || zone.trafficMode === "depot") {
      if (zone.ownerId === player.id) {
        ownStops.push(zone);
      } else {
        foreign.push(zone);
      }
    }
  });
  if (!player.hasDepot) {
    var traffic = null;
    (state.zones || []).some(function (zone) {
      if (zone.ownerId === player.id && zone.type === "traffic" && zone.trafficMode !== "depot") {
        traffic = zone;
        return true;
      }
      return false;
    });
    if (traffic) {
      var depot = Nexus.setTrafficMode(state, traffic.id, "depot");
      if (depot !== state) {
        return depot;
      }
    }
  }
  var bare = null;
  (state.zones || []).some(function (zone) {
    if (zone.ownerId === player.id && zone.type !== "home" && !zone.busStop && zone.type !== "traffic") {
      bare = zone;
      return true;
    }
    return false;
  });
  if (bare && (player.resources.money || 0) >= 2) {
    var stopped = Nexus.placeBusStop(state, bare.id);
    if (stopped !== state) {
      return stopped;
    }
  }
  if (player.hasDepot && ownStops.length >= 1) {
    var second = player.roleId === "networker" && foreign[0] ? foreign[0] : ownStops[1] || foreign[0];
    if (ownStops[0] && second && ownStops[0].id !== second.id) {
      var propulsion = player.roleId === "climate" ? "renewable" : player.roleId === "controller" ? "diesel" : "electric";
      var lined = Nexus.openBusLine(state, [ownStops[0].id, second.id], propulsion);
      if (lined !== state) {
        return lined;
      }
      if (propulsion !== "diesel" && player.roleId !== "climate") {
        return Nexus.openBusLine(state, [ownStops[0].id, second.id], "diesel");
      }
    }
  }
  if (player.roleId === "controller") {
    var lot = null;
    (state.zones || []).some(function (zone) {
      if (zone.ownerId === player.id && zone.type === "traffic" && zone.trafficMode === "lot") {
        lot = zone;
        return true;
      }
      return false;
    });
    if (lot) {
      var garage = Nexus.setTrafficMode(state, lot.id, "garage");
      if (garage !== state) {
        return garage;
      }
    }
  }
  if (Nexus.canUpgradeSae(state)) {
    return Nexus.upgradeSae(state);
  }
  return state;
}

function preferredBuild(roleId) {
  if (roleId === "climate" || roleId === "visionary") {
    return ["energy", "solar"];
  }
  if (roleId === "privacy") {
    return ["datacenter", "secure"];
  }
  if (roleId === "investor" || roleId === "networker") {
    return ["residential", null];
  }
  if (roleId === "controller") {
    return ["traffic", null];
  }
  return ["energy", "transformer"];
}

function act(state) {
  if (state.turnPhase === "role_reveal") {
    return Nexus.acknowledgeRoleReveal(state);
  }
  if (state.turnPhase === "handoff") {
    return Nexus.acknowledgeHandoff(state);
  }
  if (state.turnPhase === "produce") {
    Nexus.Dice.fillSync(8, 100);
    return Nexus.beginHarvestAllSimultaneous(state);
  }
  if (state.turnPhase === "spinning") {
    return Nexus.completeHarvestAll(state);
  }
  if (state.turnPhase === "risk") {
    return Nexus.confirmRiskRoll(state);
  }
  if (state.turnPhase === "event") {
    var picked = choiceFor(state);
    if (!picked) {
      return state;
    }
    return Nexus.applyEventChoice(state, picked.id, picked.needs ? { resource: "energy" } : {});
  }
  if (state.turnPhase === "trade_respond") {
    var offerId = state.tradeSession && state.tradeSession.offerId;
    var offer = null;
    (state.tradeOffers || []).forEach(function (item) {
      if (item.id === offerId) {
        offer = item;
      }
    });
    if (!offer) {
      offer = (state.tradeOffers || [])[0] || null;
    }
    if (!offer) {
      return Object.assign({}, state, { turnPhase: "build", tradeSession: null });
    }
    var accepted = Nexus.respondTrade(state, offer.id, true);
    if (accepted !== state) {
      return accepted;
    }
    return Nexus.respondTrade(state, offer.id, false);
  }
  if (state.turnPhase !== "build") {
    return state;
  }
  if (!Nexus.canEndTurn(state)) {
    var pref = preferredBuild(Nexus.currentPlayer(state).roleId);
    var built = tryBuild(state, pref[0], pref[1]);
    if (built === state) {
      built = tryBuild(state, "residential", null);
    }
    if (built === state) {
      built = tryBuild(state, "energy", "solar");
    }
    return built;
  }
  function countOwn(type) {
    var owner = Nexus.currentPlayer(state).id;
    var n = 0;
    (state.zones || []).forEach(function (zone) {
      if (zone.ownerId === owner && zone.type === type) {
        n += 1;
      }
    });
    return n;
  }
  var roleNow = Nexus.currentPlayer(state).roleId;
  var prefNow = preferredBuild(roleNow);
  var stepped = state;
  if (countOwn(prefNow[0]) < 2) {
    stepped = tryBuild(state, prefNow[0], prefNow[1]);
    if (stepped !== state) {
      return stepped;
    }
  }
  if (countOwn("traffic") < 1) {
    stepped = tryBuild(state, "traffic", null);
    if (stepped !== state) {
      return stepped;
    }
  }
  if ((roleNow === "climate" || roleNow === "visionary" || roleNow === "networker") && countOwn("energy") < 1) {
    stepped = tryBuild(state, "energy", "solar");
    if (stepped !== state) {
      return stepped;
    }
  }
  if (roleNow === "privacy" && countOwn("datacenter") < 1) {
    stepped = tryBuild(state, "datacenter", "secure");
    if (stepped !== state) {
      return stepped;
    }
  }
  var moneyNow = Nexus.currentPlayer(state).resources.money || 0;
  if (moneyNow >= 5 && (state.round || 1) % 2 === 0) {
    stepped = tryProject(state);
    if (stepped !== state) {
      return stepped;
    }
  }
  if (Nexus.currentPlayer(state).roleId === "privacy" && !Nexus.currentPlayer(state).devices.v2x && countOwn("traffic") > 0) {
    var radio = Nexus.buildDevice(state, "v2x", "local");
    if (radio !== state) {
      return radio;
    }
  }
  if (Nexus.currentPlayer(state).roleId === "privacy" && !Nexus.currentPlayer(state).devices.lock) {
    var locked = Nexus.buildDevice(state, "lock", "local");
    if (locked !== state) {
      return locked;
    }
  }
  if ((roleNow === "investor" || roleNow === "visionary") && !Nexus.currentPlayer(state).devices.thermostat) {
    var heat = Nexus.buildDevice(state, "thermostat", "local");
    if (heat !== state) {
      return heat;
    }
  }
  if (roleNow === "visionary" && !Nexus.currentPlayer(state).devices.lock) {
    var bolted = Nexus.buildDevice(state, "lock", "local");
    if (bolted !== state) {
      return bolted;
    }
  }
  if (Nexus.currentPlayer(state).roleId === "visionary" && !Nexus.currentPlayer(state).devices.v2x) {
    var linked = Nexus.buildDevice(state, "v2x", "local");
    if (linked !== state) {
      return linked;
    }
  }
  stepped = tryMobility(state);
  if (stepped !== state) {
    return stepped;
  }
  var pref2 = preferredBuild(Nexus.currentPlayer(state).roleId);
  stepped = tryBuild(state, pref2[0], pref2[1]);
  if (stepped !== state) {
    return stepped;
  }
  stepped = tryBuild(state, "residential", null);
  if (stepped !== state) {
    return stepped;
  }
  var rich = Nexus.currentPlayer(state);
  if ((rich.resources.money || 0) >= 8) {
    var zone = null;
    (state.zones || []).some(function (item) {
      if (item.ownerId === rich.id && (item.upgradeLevel || 0) < 2) {
        zone = item;
        return true;
      }
      return false;
    });
    if (zone && Nexus.describeZoneUpgrade(state, zone.id).allowed) {
      return Nexus.upgradeZone(state, zone.id);
    }
  }
  var pendingOwn = (state.tradeOffers || []).some(function (offer) {
    return offer.fromId === rich.id && offer.status === "pending";
  });
  var trader = rich.roleId === "investor" || rich.roleId === "networker";
  if (trader && (rich.resources.energy || 0) >= 3 && state.players.length > 1 && !pendingOwn) {
    var partner = state.players[(state.currentPlayerIndex + 1) % state.players.length];
    var traded = Nexus.proposeTrade(state, partner.id, "energy", 1, "money", 1);
    if (traded !== state) {
      var offer = traded.tradeOffers[traded.tradeOffers.length - 1];
      return Nexus.beginTradeInterrupt(traded, offer.id);
    }
  }
  return Nexus.endTurn(state);
}

function playOne(seed, players, lengthId) {
  Nexus.Dice.seed(seed);
  resultStuckPhase = "";
  var state = Nexus.startGame(players, lengthId, { difficulty: "normal", beginner: false });
  var guard = 0;
  var events = 0;
  var quiet = 0;
  var stuck = 0;
  var last = "";
  var max = (state.maxRounds + 2) * players * 40;
  while (state.turnPhase !== "gameover" && guard < max) {
    var before = state.turnPhase + ":" + state.round + ":" + state.currentPlayerIndex + ":" + ((state.log && state.log[0] && state.log[0].text) || "");
    var next = act(state);
    if (next === state) {
      stuck += 1;
      if (state.turnPhase === "build") {
        next = Nexus.endTurn(state);
      } else if (state.turnPhase === "event") {
        var fallback = choiceFor(state);
        next = fallback ? Nexus.applyEventChoice(state, fallback.id, { resource: "money" }) : state;
      }
      if (next === state) {
        resultStuckPhase = state.turnPhase;
        break;
      }
    }
    if (next.turnPhase === "event" && state.turnPhase === "risk") {
      events += 1;
    }
    if (next.turnPhase === "build" && state.turnPhase === "risk") {
      quiet += 1;
    }
    state = next;
    last = state.turnPhase + ":" + state.round + ":" + state.currentPlayerIndex + ":" + guard;
    guard += 1;
  }
  return {
    over: state.turnPhase === "gameover",
    rounds: state.round,
    winner: state.winnerId,
    roles: (state.players || []).map(function (p) {
      return p.roleId;
    }),
    scores: (state.finalScores || []).map(function (row) {
      return {
        role: row.roleId,
        pct: row.totalPercent,
        parts: (row.subGoals || []).map(function (goal) {
          return goal.id + ":" + goal.currentPercent + "@" + goal.metricValue;
        })
      };
    }),
    events: events,
    quiet: quiet,
    actions: guard,
    stuck: state.turnPhase !== "gameover",
    stuckPhase: typeof resultStuckPhase === "string" ? resultStuckPhase : ""
  };
}

function run(games) {
  var wins = {};
  var seats = {};
  Nexus.ALL_ROLE_IDS.forEach(function (id) {
    wins[id] = 0;
    seats[id] = 0;
  });
  var finished = 0;
  var events = 0;
  var checks = 0;
  var stuck = 0;
  var i;
  for (i = 0; i < games; i++) {
    var result = playOne(1000 + i * 17, 3, "short");
    if (result.over) {
      finished += 1;
    } else {
      stuck += 1;
    }
    events += result.events;
    checks += result.events + result.quiet;
    result.roles.forEach(function (role) {
      seats[role] += 1;
    });
    (result.scores || []).forEach(function (row) {
      if (result.winner && row.role) {
        var winnerRole = null;
        result.scores.forEach(function (item) {
          if (!winnerRole && result.scores) {
            /* filled below */
          }
        });
      }
    });
    if (result.winner) {
      var role = null;
      result.scores.forEach(function (row) {
        /* winner id is not on the row; match via players order stored in roles only if unique */
      });
      result.roles.forEach(function (id, index) {
        if ("p" + (index + 1) === result.winner) {
          role = id;
        }
      });
      if (role) {
        wins[role] += 1;
      }
    }
  }
  var lines = [];
  lines.push("games " + games + " finished " + finished + " stuck " + stuck);
  lines.push("event rate " + (checks ? (events / checks).toFixed(3) : "0") + " (" + events + "/" + checks + " risk checks)");
  Nexus.ALL_ROLE_IDS.forEach(function (id) {
    var rate = seats[id] ? wins[id] / seats[id] : 0;
    lines.push(id + " wins " + wins[id] + "/" + seats[id] + " = " + (rate * 100).toFixed(1) + "%");
  });
  return lines.join("\n");
}

if (require.main === module) {
  var games = Number(process.argv[2] || 24);
  console.log(Nexus.runSmokeCheck());
  console.log(run(games));
}
