window.Nexus = window.Nexus || {};

(function (Nexus) {
  function shuffle(list) {
    var arr = list.slice();
    var i;
    for (i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function assignRoles(playerCount) {
    return shuffle(Nexus.ALL_ROLE_IDS).slice(0, playerCount);
  }

  function evaluateSubGoal(subGoal, metricValue) {
    var need = subGoal.need || (subGoal.steps && subGoal.steps[subGoal.steps.length - 1].metricValue) || 10;
    var worth = subGoal.worth || 1;
    var haveRaw = metricValue || 0;
    var units = Math.max(0, Math.min(haveRaw, need));
    var points = units * worth;
    var percent = Math.min(subGoal.maxContribution || 100, points * 10);
    return {
      id: subGoal.id,
      label: subGoal.label,
      metricValue: haveRaw,
      have: units,
      need: need,
      worth: worth,
      points: points,
      maxPoints: Math.round((subGoal.maxContribution || 100) / 10),
      currentStage: points > 0 ? 1 : 0,
      currentPercent: percent,
      maxContribution: subGoal.maxContribution || 100,
      higherIsBetter: true
    };
  }

  function replacePlayerSafe(state, playerId, nextPlayer) {
    return Object.assign({}, state, {
      players: (state.players || []).map(function (item) {
        return item.id === playerId ? nextPlayer : item;
      })
    });
  }

  function awardRolePoints(state, playerId, amount, reason, opts) {
    if (!amount) {
      return state;
    }
    opts = opts || {};
    var player = null;
    (state.players || []).forEach(function (item) {
      if (item.id === playerId) {
        player = item;
      }
    });
    if (!player) {
      return state;
    }
    var target = Nexus.ROLE_POINT_TARGET || 10;
    /* Konten/Skandal/Protest: kein letzter Siegpunkt durch so etwas. */
    var cap = opts.contest && amount > 0 ? target - 1 : target;
    var have = player.rolePoints || 0;
    var nextPts = Math.max(0, Math.min(cap, have + amount));
    var delta = nextPts - have;
    if (!delta) {
      return state;
    }
    return replacePlayerSafe(
      state,
      playerId,
      Object.assign({}, player, {
        rolePoints: nextPts,
        lastRolePointDelta: delta,
        lastRolePointReason: reason || "",
        contestHitRound: amount < 0 ? (state && state.round) || player.contestHitRound : player.contestHitRound
      })
    );
  }

  function computeRoleProgress(state, player) {
    var role = Nexus.ROLES_BY_ID[player.roleId];
    if (!role) {
      return { role: null, subGoals: [], totalPercent: 0, points: 0, target: 10 };
    }
    var target = Nexus.ROLE_POINT_TARGET || 10;
    var points = Math.max(0, Math.min(target, player.rolePoints || 0));
    var subGoals = (role.subGoals || []).map(function (subGoal) {
      return evaluateSubGoal(subGoal, points);
    });
    return {
      role: role,
      subGoals: subGoals,
      totalPercent: points * 10,
      points: points,
      target: target,
      pointKey: role.pointKey,
      pointLabel: role.pointLabel,
      pointColor: role.pointColor
    };
  }

  function formatMetricValue(subGoal, metricValue) {
    return String(metricValue);
  }

  function nextStepHint(subGoal, metricValue) {
    var need = subGoal.need || 10;
    var have = Math.max(0, Math.min(metricValue || 0, need));
    if (have >= need) {
      return have + "/" + need + " voll";
    }
    return have + "/" + need;
  }

  Nexus.assignRoles = assignRoles;
  Nexus.computeRoleProgress = computeRoleProgress;
  Nexus.awardRolePoints = awardRolePoints;
  Nexus.formatMetricValue = formatMetricValue;
  Nexus.nextStepHint = nextStepHint;
})(window.Nexus);
