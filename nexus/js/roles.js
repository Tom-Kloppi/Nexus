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

  function localDeviceCount(player) {
    var count = 0;
    Nexus.DEVICES.forEach(function (device) {
      if (player.devices[device.id] === "local") {
        count += 1;
      }
    });
    return count;
  }

  function tradePartnerRatio(state, player) {
    var others = state.players.length - 1;
    if (others <= 0) {
      return 0;
    }
    var partners = (player.tradePartners || []).length;
    return Math.round((partners / others) * 100);
  }

  function builtDeviceCount(player) {
    var count = 0;
    Nexus.DEVICES.forEach(function (device) {
      if (player.devices[device.id]) {
        count += 1;
      }
    });
    return count;
  }

  function localDeviceRatio(player) {
    var built = builtDeviceCount(player);
    if (built === 0) {
      return 0;
    }
    var local = 0;
    Nexus.DEVICES.forEach(function (device) {
      if (player.devices[device.id] === "local") {
        local += 1;
      }
    });
    return Math.round((local / built) * 100);
  }

  function zoneControlCount(state, playerId) {
    return Nexus.playerFactoryZones(state, playerId).length;
  }

  function readMetric(state, player, metricKey) {
    switch (metricKey) {
      case "energyEfficiency":
        return Math.floor(player.efficiencyPoints || 0);
      case "localProcessingRatio":
        return localDeviceRatio(player);
      case "greenInnovationCards":
        return player.greenInnovationCards || 0;
      case "ownRiskScore":
        return player.risk || 0;
      case "privacyShieldEvents":
        return player.privacyShieldEvents || 0;
      case "totalResourceThroughput":
        return player.cumulativeProduction || 0;
      case "tradeVolume":
        return player.tradeVolume || 0;
      case "zoneControlCount":
        return zoneControlCount(state, player.id);
      case "saeLevel":
        return player.saeLevel || 0;
      case "localDeviceCount":
        return localDeviceCount(player);
      case "innovationCardsTotal":
        return player.innovationCardsTotal || 0;
      case "openStandardStreak":
        return player.standardsChoice === "open" ? player.standardStreak || 0 : 0;
      case "proprietaryStandardStreak":
        return player.standardsChoice === "proprietary" ? player.standardStreak || 0 : 0;
      case "tradePartnerRatio":
        return tradePartnerRatio(state, player);
      case "standardsBonusVolume":
        return player.standardsBonusVolume || 0;
      case "zoneMonopolyCount":
        return Nexus.countResourceMonopolies(state, player.id);
      case "blockedTradesCaused":
        return player.blockedTradesCaused || 0;
      default:
        return 0;
    }
  }

  function evaluateSubGoal(subGoal, metricValue) {
    var stage = 0;
    var percent = 0;
    var i;
    for (i = 0; i < subGoal.steps.length; i++) {
      var step = subGoal.steps[i];
      var met = subGoal.higherIsBetter
        ? metricValue >= step.metricValue
        : metricValue <= step.metricValue;
      if (met) {
        stage = step.stage;
        percent = step.cumulativePercent;
      }
    }
    return {
      id: subGoal.id,
      label: subGoal.label,
      metricValue: metricValue,
      currentStage: stage,
      currentPercent: percent,
      maxContribution: subGoal.maxContribution,
      higherIsBetter: subGoal.higherIsBetter
    };
  }

  function computeRoleProgress(state, player) {
    var role = Nexus.ROLES_BY_ID[player.roleId];
    if (!role) {
      return { role: null, subGoals: [], totalPercent: 0 };
    }
    var subGoals = role.subGoals.map(function (subGoal) {
      var metricValue = readMetric(state, player, subGoal.metricKey);
      return evaluateSubGoal(subGoal, metricValue);
    });
    var totalPercent = subGoals.reduce(function (sum, goal) {
      return sum + goal.currentPercent;
    }, 0);
    return {
      role: role,
      subGoals: subGoals,
      totalPercent: totalPercent
    };
  }

  function formatMetricValue(subGoal, metricValue) {
    if (subGoal.id === "local_processing_ratio") {
      return metricValue + "%";
    }
    if (subGoal.id === "own_risk_score") {
      return String(metricValue);
    }
    return String(metricValue);
  }

  function nextStepHint(subGoal, metricValue) {
    var i;
    for (i = 0; i < subGoal.steps.length; i++) {
      var step = subGoal.steps[i];
      var met = subGoal.higherIsBetter
        ? metricValue >= step.metricValue
        : metricValue <= step.metricValue;
      if (!met) {
        var need = subGoal.higherIsBetter
          ? step.metricValue
          : "≤ " + step.metricValue;
        return "Stufe " + step.stage + ": " + need;
      }
    }
    return "Max. Stufe erreicht";
  }

  Nexus.assignRoles = assignRoles;
  Nexus.computeRoleProgress = computeRoleProgress;
  Nexus.formatMetricValue = formatMetricValue;
  Nexus.nextStepHint = nextStepHint;
  Nexus.localDeviceRatio = localDeviceRatio;
})(window.Nexus);
