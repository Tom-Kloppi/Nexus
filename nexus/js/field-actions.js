window.Nexus = window.Nexus || {};

/* Aktionen am angeklickten Feld. Regeln bleiben in den bestehenden Funktionen. */
(function (Nexus) {
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

  function buildFx(state, zoneType, variant, cost) {
    var bits = costFx(cost);
    var preview = Nexus.describeZoneBuild ? Nexus.describeZoneBuild(state, zoneType, variant) : null;
    if (preview && preview.production && preview.production.amount) {
      var amount = preview.production.amount;
      if (zoneType === "residential" && preview.flags && preview.flags.residentialNeedsDc) {
        amount = 0;
      }
      bits.push({ key: preview.production.resource, amount: amount });
    }
    if (preview && preview.upkeep) {
      ["money", "energy", "bandwidth"].forEach(function (key) {
        if (preview.upkeep[key]) {
          bits.push({ key: key, amount: -preview.upkeep[key] });
        }
      });
    }
    if (preview && preview.harvestScoreHint) {
      ["image", "comfort", "environment", "security"].forEach(function (key) {
        if (preview.harvestScoreHint[key]) {
          bits.push({ key: key, amount: preview.harvestScoreHint[key] });
        }
      });
    }
    if (preview && preview.onBuild) {
      ["image", "comfort", "environment", "security"].forEach(function (key) {
        if (preview.onBuild[key]) {
          bits.push({ key: key, amount: preview.onBuild[key] });
        }
      });
    }
    if (preview && preview.riskOnBuild) {
      bits.push({ key: "risk", amount: preview.riskOnBuild });
    }
    return bits;
  }

  /* Zwei-Layer-Baumenü: Layer 1 = Ressourcen + …, Layer 2 = Felder darunter. */
  function buildMenuTree(state, hit) {
    if (!hit || hit.q == null) {
      return { kind: "build-tree", hit: hit, groups: [], recommendGroup: null };
    }
    var q = Number(hit.q);
    var r = Number(hit.r);
    var player = Nexus.currentPlayer(state);
    var cap =
      player && Nexus.datacenterCapInfo ? Nexus.datacenterCapInfo(state, player.id) : null;
    var rec = Nexus.recommendExpandType ? Nexus.recommendExpandType(state) : null;

    function make(type, variant, label, why) {
      var offer = Nexus.getExpandOffer
        ? Nexus.getExpandOffer(state, q, r, type, variant)
        : { allowed: false, reason: "" };
      var action = item(
        "build",
        label,
        offer.allowed,
        offer.reason,
        why,
        { type: type, variant: variant, q: q, r: r },
        buildFx(state, type, variant, offer.cost)
      );
      action.hit = hit;
      if (
        rec &&
        rec.type === type &&
        (rec.variant == null || rec.variant === variant || (!variant && !rec.variant))
      ) {
        action.recommended = true;
      }
      return action;
    }

    var energyItems = [
      make("energy", "solar", "Solar", "2 Energie fest, Umwelt+."),
      make("energy", "transformer", "Umspannwerk", "3 Energie fest, 1 Geld je Einheit."),
      make("energy", "nuclear", "Atom", "5 Energie, hohes Risiko, Umwelt−−.")
    ];
    var moneyItems = [
      make("commerce", "factory", "Fabrik", "Geld +1 je angrenzendem Wohnfeld."),
      make(
        "commerce",
        "enterprise",
        "Unternehmen",
        "Aufbau 1→3→5, Reife 5→3→1 je weiterem Unternehmen."
      )
    ];
    var dcOpen = make(
      "datacenter",
      "insecure",
      "Offen",
      (cap ? cap.label + ". " : "") + "Daten, billiger, mehr Risiko."
    );
    var dcClosed = make(
      "datacenter",
      "secure",
      "Geschlossen",
      (cap ? cap.label + ". " : "") + "Daten + schaltet Wohn-Daten frei. Teurer, +Sicherheit."
    );
    var dcHub = item(
      "dc-hub",
      "Rechenzentrum",
      !!(dcOpen.enabled || dcClosed.enabled),
      dcOpen.enabled || dcClosed.enabled ? "" : dcOpen.reason || dcClosed.reason || "Geht gerade nicht.",
      (cap ? cap.label + ". " : "") +
        "Wohn-Daten freischalten. Offen = günstig/Risiko, geschlossen = teurer/sicher.",
      null,
      []
    );
    dcHub.kind = "dc-hub";
    dcHub.capLabel = cap ? cap.label : "";
    dcHub.dcModes = [dcOpen, dcClosed];
    if (
      rec &&
      rec.type === "datacenter"
    ) {
      dcHub.recommended = true;
    }
    var dataItems = [
      make("residential", null, "Wohnen", "Daten aus dem Quartier. Ohne eigenes Rechenzentrum = 0."),
      dcHub
    ];
    /* … immer da: Garagen / E-Taxi / Park / Werkstatt. */
    var moreItems = [
      make("traffic", "garage", "Garagen", "Erstes Verkehrsfeld +1 Komfort. Kein Ressourcen-Primary."),
      make(
        "traffic",
        "taxi",
        "E-Taxi-Station",
        "Je Ernte +2 Geld und +1 Komfort. Kostet 1 Energie und 1 Daten."
      ),
      make("park", null, "Park", "Grünfläche: +Komfort und +Umwelt, kein Ertrag."),
      make("workshop", null, "Werkstatt", "Nächstes Gerät −1 Geld. +Image.")
    ];

    var groups = [
      {
        id: "energy",
        label: "Energie",
        figure: "bolt",
        hint: "Strom erzeugen",
        items: energyItems
      },
      {
        id: "money",
        label: "Geld",
        figure: "money",
        hint: "Kasse füllen",
        items: moneyItems
      },
      {
        id: "data",
        label: "Daten",
        figure: "arrows",
        hint: "Netz & Rechenzentren",
        items: dataItems
      },
      {
        id: "more",
        label: "Weiteres",
        figure: "more",
        hint: "Garagen, E-Taxi, Park, Werkstatt",
        items: moreItems
      }
    ];

    var recommendGroup = null;
    if (rec) {
      if (rec.type === "energy") {
        recommendGroup = "energy";
      } else if (rec.type === "commerce" || rec.resource === "money") {
        recommendGroup = "money";
      } else if (rec.type === "residential" || rec.type === "datacenter" || rec.resource === "bandwidth") {
        recommendGroup = "data";
      } else {
        recommendGroup = "more";
      }
    }

    groups.forEach(function (group) {
      group.recommended = group.id === recommendGroup;
      group.anyEnabled = group.items.some(function (it) {
        return it.enabled;
      });
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

  function forOwned(state, zone) {
    var actions = [];
    var player = Nexus.currentPlayer(state);
    var mine = player && zone.ownerId === player.id;
    if (!mine) {
      actions.push(
        item(
          "look",
          "Fremdes Feld",
          false,
          "Du baust nur auf deinen Feldern.",
          "Besitz und Ziel sind offen. Bauen darfst du hier nicht."
        )
      );
      return actions;
    }
    if (zone.type === "datacenter") {
      var toSecure = zone.variant !== "secure";
      var switchCost = toSecure ? { money: 2, bandwidth: 1 } : { money: 1 };
      var canSwitch =
        state.turnPhase === "build" &&
        player.resources &&
        (player.resources.money || 0) >= (switchCost.money || 0) &&
        (player.resources.bandwidth || 0) >= (switchCost.bandwidth || 0);
      actions.push(
        item(
          "dc-mode",
          toSecure ? "Rechenzentrum schließen" : "Rechenzentrum öffnen",
          canSwitch,
          canSwitch ? "" : "Kosten oder Phase fehlen.",
          toSecure
            ? "Geschlossen: sicherer, teurer Wechsel. Icon wird blau."
            : "Offen: günstiger Wechsel, mehr Risiko. Icon wird orange.",
          { variant: toSecure ? "secure" : "insecure", zoneId: zone.id },
          costFx(switchCost).concat(toSecure ? [{ key: "security", amount: 1 }] : [{ key: "risk", amount: 2 }])
        )
      );
    }
    /* Straßenrand-Taxistand (Bank) später — Hook offen, nicht spielbar. */
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
    var upBlock = {
      cannot_afford: "Zu teuer.",
      maxed: "Schon Stufe 2.",
      wrong_phase: "Nur in der Bauphase.",
      not_owner: "Nur eigene Felder.",
      missing_zone: "Feld fehlt."
    };
    actions.push(
      item(
        "upgrade",
        "Ausbau",
        !!up.allowed,
        up.allowed ? "" : upBlock[up.reason] || "Geht gerade nicht.",
        up.allowed
          ? "Stufe " + (up.fromLevel || 0) + " → " + (up.toLevel || 1) + ". Mehr Ertrag am Gebäude."
          : "Ausbau nur in der Bauphase, auf eigenen Feldern, bis Stufe 2.",
        { zoneId: zone.id },
        costFx(up.cost || {}).concat(upFx)
      )
    );
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
