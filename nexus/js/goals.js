window.Nexus = window.Nexus || {};

/* Dauerziele / Siegpunkte der eigenen Metrik. Kein DOM. */
(function (Nexus) {
  function roleOf(player) {
    return Nexus.ROLES_BY_ID && Nexus.ROLES_BY_ID[player.roleId];
  }

  function metricOf(player) {
    var role = roleOf(player);
    return role && role.pointKey ? role.pointKey : null;
  }

  function ensureProgress(player) {
    return Object.assign(
      {
        sameType: {},
        buildMetric: 0,
        upgradeMetric: 0,
        neighborMetric: 0,
        trades3: 0,
        gift1: 0,
        karma4Active: false,
        karma5Active: false,
        completedOnce: {}
      },
      player.goalProgress || {}
    );
  }

  function awardOwn(state, playerId, amount, reason) {
    if (!amount || !Nexus.awardRolePoints) {
      return state;
    }
    return Nexus.awardRolePoints(state, playerId, amount, reason || "Ziel");
  }

  function tileMatchesPlayer(tileId, player) {
    var m = metricOf(player);
    return m && Nexus.tileMatchesMetric && Nexus.tileMatchesMetric(tileId, m);
  }

  function countAdjacentForeign(state, zone, ownerId) {
    if (!Nexus.neighbors) {
      return false;
    }
    return Nexus.neighbors(zone.q, zone.r).some(function (n) {
      var z = null;
      (state.zones || []).forEach(function (item) {
        if (item.q === n.q && item.r === n.r) {
          z = item;
        }
      });
      return z && z.ownerId && z.ownerId !== ownerId;
    });
  }

  function replacePlayer(state, playerId, nextPlayer) {
    return Object.assign({}, state, {
      players: (state.players || []).map(function (p) {
        return p.id === playerId ? nextPlayer : p;
      })
    });
  }

  function findPlayer(state, playerId) {
    var found = null;
    (state.players || []).forEach(function (p) {
      if (p.id === playerId) {
        found = p;
      }
    });
    return found;
  }

  /* Nach Bau: Zähler + ggf. SP. opts: { upgraded: bool, demolishDelta: number } */
  function onBuild(state, playerId, tileId, zone) {
    var player = findPlayer(state, playerId);
    if (!player || !tileMatchesPlayer(tileId, player)) {
      return { state: state, gained: 0 };
    }
    var progress = ensureProgress(player);
    var gained = 0;
    var reasons = [];

    progress.buildMetric = (progress.buildMetric || 0) + 1;
    while (progress.buildMetric >= 5) {
      progress.buildMetric -= 5;
      gained += 1;
      reasons.push("5 Metrik-Felder");
    }

    var typeKey = tileId;
    progress.sameType[typeKey] = (progress.sameType[typeKey] || 0) + 1;
    while (progress.sameType[typeKey] >= 3) {
      progress.sameType[typeKey] -= 3;
      gained += 1;
      reasons.push("3× gleicher Typ");
    }

    if (countAdjacentForeign(state, zone, playerId)) {
      progress.neighborMetric = (progress.neighborMetric || 0) + 1;
      while (progress.neighborMetric >= 3) {
        progress.neighborMetric -= 3;
        gained += 1;
        reasons.push("3 neben Nachbarn");
      }
    }

    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { goalProgress: progress })
    );
    if (gained) {
      next = awardOwn(next, playerId, gained, reasons.join(" · "));
    }
    return { state: next, gained: gained, reasons: reasons };
  }

  function onUpgrade(state, playerId, tileId) {
    var player = findPlayer(state, playerId);
    if (!player || !tileMatchesPlayer(tileId, player)) {
      return { state: state, gained: 0 };
    }
    var progress = ensureProgress(player);
    var gained = 0;
    progress.upgradeMetric = (progress.upgradeMetric || 0) + 1;
    progress.sameType[tileId] = (progress.sameType[tileId] || 0) + 1;
    var reasons = [];
    while (progress.upgradeMetric >= 3) {
      progress.upgradeMetric -= 3;
      gained += 1;
      reasons.push("3 Ausbauten");
    }
    while (progress.sameType[tileId] >= 3) {
      progress.sameType[tileId] -= 3;
      gained += 1;
      reasons.push("3× gleicher Typ");
    }
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { goalProgress: progress })
    );
    if (gained) {
      next = awardOwn(next, playerId, gained, reasons.join(" · "));
    }
    return { state: next, gained: gained, reasons: reasons };
  }

  function onDemolish(state, playerId, tileId, level) {
    var player = findPlayer(state, playerId);
    if (!player || !tileMatchesPlayer(tileId, player)) {
      return state;
    }
    var progress = ensureProgress(player);
    var delta = level >= 1 ? 2 : 1;
    progress.buildMetric = Math.max(0, (progress.buildMetric || 0) - delta);
    progress.sameType[tileId] = Math.max(0, (progress.sameType[tileId] || 0) - delta);
    if (level >= 1) {
      progress.upgradeMetric = Math.max(0, (progress.upgradeMetric || 0) - 1);
    }
    return replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { goalProgress: progress })
    );
  }

  function onStallAccept(state, playerId) {
    var player = findPlayer(state, playerId);
    if (!player) {
      return { state: state, gained: 0 };
    }
    var progress = ensureProgress(player);
    if (progress.completedOnce.trades3) {
      return { state: state, gained: 0 };
    }
    progress.trades3 = (progress.trades3 || 0) + 1;
    var gained = 0;
    if (progress.trades3 >= 3) {
      progress.completedOnce.trades3 = true;
      gained = 1;
    }
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { goalProgress: progress })
    );
    if (gained) {
      next = awardOwn(next, playerId, gained, "3 Stall-Annahmen");
    }
    return { state: next, gained: gained };
  }

  function onGiftApprove(state, playerId) {
    var player = findPlayer(state, playerId);
    if (!player) {
      return { state: state, gained: 0 };
    }
    var progress = ensureProgress(player);
    if (progress.completedOnce.gift1) {
      return { state: state, gained: 0 };
    }
    progress.completedOnce.gift1 = true;
    var next = replacePlayer(
      state,
      playerId,
      Object.assign({}, player, { goalProgress: progress })
    );
    next = awardOwn(next, playerId, 1, "Schenkung genehmigt");
    return { state: next, gained: 1 };
  }

  function syncKarmaGoals(state, playerId) {
    var player = findPlayer(state, playerId);
    if (!player) {
      return state;
    }
    var progress = ensureProgress(player);
    var karma = player.karma || 0;
    var next = state;
    var gained = 0;
    if (karma >= 4 && !progress.karma4Active) {
      progress.karma4Active = true;
      gained += 1;
    } else if (karma < 4 && progress.karma4Active) {
      progress.karma4Active = false;
      next = awardOwn(next, playerId, -1, "Karma unter +4");
    }
    if (karma >= 5 && !progress.karma5Active) {
      progress.karma5Active = true;
      gained += 1;
    } else if (karma < 5 && progress.karma5Active) {
      progress.karma5Active = false;
      next = awardOwn(next, playerId, -1, "Karma unter +5");
    }
    player = findPlayer(next, playerId) || player;
    next = replacePlayer(
      next,
      playerId,
      Object.assign({}, player, { goalProgress: progress })
    );
    if (gained) {
      next = awardOwn(next, playerId, gained, "Karma-Ziel");
    }
    return next;
  }

  function previewBuildPoints(state, player, tileId, zoneStub) {
    if (!player || !tileMatchesPlayer(tileId, player)) {
      return 0;
    }
    var progress = ensureProgress(player);
    var n = 0;
    if ((progress.buildMetric || 0) + 1 >= 5) {
      n += 1;
    }
    if ((progress.sameType[tileId] || 0) + 1 >= 3) {
      n += 1;
    }
    if (zoneStub && countAdjacentForeign(state, zoneStub, player.id)) {
      if ((progress.neighborMetric || 0) + 1 >= 3) {
        n += 1;
      }
    }
    return n;
  }

  /* previewBuildPoints: Badge-Hilfe für Baumenü (D1) — keine Regeländerung. */
  Nexus.Goals = {
    onBuild: onBuild,
    onUpgrade: onUpgrade,
    onDemolish: onDemolish,
    onStallAccept: onStallAccept,
    onGiftApprove: onGiftApprove,
    syncKarmaGoals: syncKarmaGoals,
    previewBuildPoints: previewBuildPoints,
    metricOf: metricOf,
    ensureProgress: ensureProgress
  };
})(window.Nexus);
