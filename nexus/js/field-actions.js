window.Nexus = window.Nexus || {};

/* Aktionen am angeklickten Feld. Regeln bleiben in den bestehenden Funktionen. */
(function (Nexus) {
  var TAB_FIGURE = {
    energy: "bolt",
    commerce: "money",
    data: "arrows",
    misc: "more"
  };

  var TAB_HINT = {
    energy: "Strom erzeugen",
    commerce: "Kasse füllen",
    data: "Daten & Netz",
    misc: "Park, Lager, Bahnhof"
  };

  var RES_LABEL = {
    money: "Geld",
    energy: "Energie",
    bandwidth: "Daten"
  };

  function zoneAtHit(state, hit) {
    if (!hit) {
      return null;
    }
    if (hit.zoneId && Nexus.zoneAt) {
      var found = null;
      (state.zones || []).forEach(function (zone) {
        if (zone.id === hit.zoneId) {
          found = zone;
        }
      });
      return found;
    }
    if (hit.q != null && Nexus.zoneAt) {
      return Nexus.zoneAt(state, Number(hit.q), Number(hit.r));
    }
    return null;
  }

  function item(id, label, enabled, reason, why, payload, fx) {
    return {
      id: id,
      label: label,
      enabled: !!enabled,
      reason: reason || "",
      why: why || "",
      payload: payload || null,
      fx: fx || []
    };
  }

  function costFx(cost) {
    var bits = [];
    ["money", "energy", "bandwidth"].forEach(function (key) {
      if (cost && cost[key]) {
        bits.push({ key: key, amount: -cost[key] });
      }
    });
    return bits;
  }

  function playerMetric(player) {
    if (Nexus.Goals && Nexus.Goals.metricOf) {
      return Nexus.Goals.metricOf(player);
    }
    var role = player && Nexus.ROLES_BY_ID && Nexus.ROLES_BY_ID[player.roleId];
    return role && role.pointKey ? role.pointKey : null;
  }

  function tileWhy(tile) {
    if (!tile) {
      return "";
    }
    var parts = [];
    if (tile.primary && tile.primaryBase) {
      parts.push("+" + tile.primaryBase + " " + (RES_LABEL[tile.primary] || tile.primary));
    }
    if (tile.secondary && tile.secondaryBase) {
      parts.push("+" + tile.secondaryBase + " " + (RES_LABEL[tile.secondary] || tile.secondary));
    }
    if (tile.upkeep) {
      var up = [];
      ["energy", "money", "bandwidth"].forEach(function (key) {
        if (tile.upkeep[key]) {
          up.push("−" + tile.upkeep[key] + " " + (RES_LABEL[key] || key));
        }
      });
      if (up.length) {
        parts.push("Upkeep " + up.join(" "));
      }
    }
    if (tile.karmaOnBuild) {
      parts.push("Karma" + (tile.karmaOnBuild > 0 ? "+" : "") + tile.karmaOnBuild);
    }
    if (tile.adjacentResidentialBonus) {
      parts.push("Bonus neben Wohnen");
    }
    if (tile.enterpriseCurve) {
      parts.push("Reife-Kurve");
    }
    if (!tile.primary) {
      parts.push("Kein Ressourcen-Ertrag");
    }
    if (tile.metrics && tile.metrics.length) {
      parts.push("Metrik: " + tile.metrics.join(", "));
    }
    return parts.join(". ") || tile.label || "";
  }

  function buildFx(state, zoneType, variant, cost) {
    var bits = costFx(cost);
    var preview = Nexus.describeZoneBuild ? Nexus.describeZoneBuild(state, zoneType, variant) : null;
    if (preview && preview.production && preview.production.amount) {
      bits.push({ key: preview.production.resource, amount: preview.production.amount });
      if (preview.production.secondary && preview.production.secondaryBase) {
        bits.push({
          key: preview.production.secondary,
          amount: preview.production.secondaryBase
        });
      }
    }
    if (preview && preview.upkeep) {
      ["money", "energy", "bandwidth"].forEach(function (key) {
        if (preview.upkeep[key]) {
          bits.push({ key: key, amount: -preview.upkeep[key] });
        }
      });
    }
    if (preview && preview.flags && preview.flags.karmaOnBuild) {
      bits.push({ key: "karma", amount: preview.flags.karmaOnBuild });
    }
    return bits;
  }

  /* Bau-Menü: 4 Tabs aus BUILD_TABS, alle Tiles aus BUILD_TILES. */
  function buildMenuTree(state, hit) {
    if (!hit || hit.q == null) {
      return { kind: "build-tree", hit: hit, groups: [], recommendGroup: null };
    }
    var q = Number(hit.q);
    var r = Number(hit.r);
    var player = Nexus.currentPlayer(state);
    var metric = playerMetric(player);
    var tabs = Nexus.BUILD_TABS || [];

    function makeFromTile(tile) {
      var offer = Nexus.getExpandOffer
        ? Nexus.getExpandOffer(state, q, r, tile.type, tile.variant, tile.id)
        : { allowed: false, reason: "" };
      var ownMetric = !!(
        metric &&
        Nexus.tileMatchesMetric &&
        Nexus.tileMatchesMetric(tile.id, metric)
      );
      var previewPts = 0;
      if (ownMetric && Nexus.Goals && Nexus.Goals.previewBuildPoints && player) {
        previewPts = Nexus.Goals.previewBuildPoints(state, player, tile.id, {
          q: q,
          r: r,
          ownerId: player.id
        }) || 0;
      }
      var fx = buildFx(state, tile.type, tile.variant, offer.cost);
      if (previewPts > 0 && metric) {
        fx.push({ key: metric, amount: previewPts });
      }
      var action = item(
        "build",
        tile.shortLabel || tile.label,
        offer.allowed,
        offer.reason,
        tileWhy(tile),
        {
          type: tile.type,
          variant: tile.variant,
          tileId: tile.id,
          q: q,
          r: r
        },
        fx
      );
      action.hit = hit;
      action.tileId = tile.id;
      action.ownMetric = ownMetric;
      action.recommended = ownMetric;
      action.pointsPreview = previewPts;
      return action;
    }

    var recommendGroup = null;
    var groups = tabs.map(function (tab) {
      var tiles = Nexus.tilesForTab ? Nexus.tilesForTab(tab.id) : [];
      var items = tiles.map(makeFromTile);
      var hasOwn = items.some(function (it) {
        return it.ownMetric;
      });
      if (hasOwn && !recommendGroup) {
        recommendGroup = tab.id;
      }
      return {
        id: tab.id,
        label: tab.label,
        figure: TAB_FIGURE[tab.id] || "more",
        hint: TAB_HINT[tab.id] || tab.label,
        items: items,
        recommended: hasOwn,
        anyEnabled: items.some(function (it) {
          return it.enabled;
        })
      };
    });

    return {
      kind: "build-tree",
      hit: hit,
      groups: groups,
      recommendGroup: recommendGroup
    };
  }

  function forEmpty(state, hit) {
    return buildMenuTree(state, hit);
  }

  function previewUpgradePoints(state, player, tileId) {
    if (!player || !tileId || !Nexus.Goals || !Nexus.Goals.ensureProgress) {
      return 0;
    }
    if (!Nexus.tileMatchesMetric || !Nexus.Goals.metricOf) {
      return 0;
    }
    var metric = Nexus.Goals.metricOf(player);
    if (!metric || !Nexus.tileMatchesMetric(tileId, metric)) {
      return 0;
    }
    var progress = Nexus.Goals.ensureProgress(player);
    var n = 0;
    if ((progress.upgradeMetric || 0) + 1 >= 3) {
      n += 1;
    }
    if ((progress.sameType[tileId] || 0) + 1 >= 3) {
      n += 1;
    }
    return n;
  }

  function transferReasonText(reason) {
    return (
      {
        wrong_phase: "Nur in der Bauphase.",
        missing_zone: "Feld fehlt.",
        is_home: "Kontrollbüro nicht übertragbar.",
        own_or_empty: "Kein fremdes Feld.",
        already_requested: "Diese Woche schon angefragt.",
        blocked: "Übertragung blockiert.",
        not_adjacent: "Muss an dein Netz angrenzen."
      }[reason] || "Geht gerade nicht."
    );
  }

  function forOwned(state, zone) {
    var actions = [];
    var player = Nexus.currentPlayer(state);
    var mine = player && zone.ownerId === player.id;
    if (!mine) {
      var xfer = Nexus.canRequestTransfer
        ? Nexus.canRequestTransfer(state, zone.id)
        : { allowed: false, reason: "own_or_empty" };
      var costLabel =
        xfer.cost && Nexus.formatCost ? Nexus.formatCost(xfer.cost) : "";
      actions.push(
        item(
          "transfer-request",
          "Übertragung anfragen",
          !!xfer.allowed,
          xfer.allowed ? "" : transferReasonText(xfer.reason),
          xfer.allowed
            ? "Eigentümer kann schenken oder verkaufen" +
                (costLabel ? " (Kaufpreis " + costLabel + ")" : "") +
                "."
            : "Nur angrenzend an dein Netz, einmal pro Feld und Zug.",
          { zoneId: zone.id },
          []
        )
      );
      if (!xfer.allowed) {
        actions.push(
          item(
            "look",
            "Fremdes Feld",
            false,
            transferReasonText(xfer.reason) || "Du baust nur auf deinen Feldern.",
            "Besitz ist offen. Bauen darfst du hier nicht."
          )
        );
      }
      return actions;
    }
    if (zone.type === "home") {
      actions.push(
        item(
          "devices",
          "Gerät",
          true,
          "",
          "Cloud fällt bei Stromausfall aus. Lokal bleibt und gibt Sicherheit.",
          null,
          []
        )
      );
    }
    var up = Nexus.describeZoneUpgrade ? Nexus.describeZoneUpgrade(state, zone.id) : { allowed: false, reason: "" };
    var upFx = [];
    if (up.production && up.production.resource === "all") {
      upFx.push({ key: "money", amount: 1 }, { key: "energy", amount: 1 }, { key: "bandwidth", amount: 1 });
    } else if (up.production && up.production.resource) {
      upFx.push({ key: up.production.resource, amount: 1 });
    }
    var tileId =
      zone.tileId || (Nexus.tileIdFromZone ? Nexus.tileIdFromZone(zone) : null);
    var upPts = previewUpgradePoints(state, player, tileId);
    var metric = playerMetric(player);
    if (upPts > 0 && metric) {
      upFx.push({ key: metric, amount: upPts });
    }
    var upBlock = {
      cannot_afford: "Zu teuer.",
      maxed: "Schon Stufe 2.",
      wrong_phase: "Nur in der Bauphase.",
      not_owner: "Nur eigene Felder.",
      missing_zone: "Feld fehlt."
    };
    var upAction = item(
      "upgrade",
      "Ausbau",
      !!up.allowed,
      up.allowed ? "" : upBlock[up.reason] || "Geht gerade nicht.",
      up.allowed
        ? "Stufe " + (up.fromLevel || 0) + " → " + (up.toLevel || 1) + ". Mehr Ertrag am Gebäude."
        : "Ausbau nur in der Bauphase, auf eigenen Feldern, bis Stufe 2.",
      { zoneId: zone.id },
      costFx(up.cost || {}).concat(upFx)
    );
    upAction.pointsPreview = upPts;
    upAction.ownMetric = upPts > 0;
    actions.push(upAction);
    if (zone.type !== "home") {
      var down = Nexus.describeDemolish ? Nexus.describeDemolish(state, zone.id) : { allowed: false, reason: "" };
      actions.push(
        item(
          "demolish",
          "Abreißen",
          !!down.allowed,
          down.reason || "",
          "Nur wenn das Netz zum Kontrollbüro verbunden bleibt. Geld zurück: " +
            ((down.refund && down.refund.money) || 0) +
            ".",
          { zoneId: zone.id },
          down.refund && down.refund.money ? [{ key: "money", amount: down.refund.money }] : []
        )
      );
    }
    return actions;
  }

  function deviceOffers(state) {
    var player = Nexus.currentPlayer(state);
    var actions = [];
    if (!player || !Nexus.DEVICES || !Nexus.getBuildOffer) {
      return actions;
    }
    var shown = 0;
    Nexus.DEVICES.forEach(function (device) {
      if (shown >= 6) {
        return;
      }
      var current = player.devices[device.id];
      var modes = [];
      if (!current && !device.localOnly) {
        modes.push("cloud");
      }
      if (current !== "local") {
        modes.push("local");
      }
      modes.forEach(function (mode) {
        if (shown >= 6) {
          return;
        }
        var offer = Nexus.getBuildOffer(state, device.id, mode);
        if (!offer.allowed && current !== "cloud") {
          return;
        }
        var why =
          mode === "local"
            ? "Bleibt bei Stromausfall an. " + (device.effectText || "")
            : "Fällt bei Stromausfall aus und hebt das Risiko. " + (device.effectText || "");
        var fx = costFx(offer.cost);
        if (mode === "local" && device.scoreGain) {
          Object.keys(device.scoreGain).forEach(function (key) {
            if (device.scoreGain[key]) {
              fx.push({ key: key, amount: device.scoreGain[key] });
            }
          });
        }
        actions.push(
          item(
            "device",
            device.label + (mode === "local" ? " · lokal" : " · Cloud"),
            offer.allowed,
            offer.reason,
            why,
            { deviceId: device.id, mode: mode },
            fx
          )
        );
        shown += 1;
      });
    });
    return actions;
  }

  function forHit(state, hit) {
    if (!hit || state.turnPhase !== "build") {
      return [];
    }
    if (hit.open === false) {
      return [
        item("blocked", "Gesperrt", false, hit.blockedReason || "Nicht bebaubar.", hit.blockedReason || "", null, [])
      ];
    }
    var zone = zoneAtHit(state, hit);
    if (!zone) {
      return buildMenuTree(state, hit);
    }
    return forOwned(state, zone);
  }

  Nexus.FieldActions = {
    forHit: forHit,
    forEmpty: forEmpty,
    forOwned: forOwned,
    buildMenuTree: buildMenuTree,
    deviceOffers: deviceOffers,
    zoneAtHit: zoneAtHit
  };
})(window.Nexus);
