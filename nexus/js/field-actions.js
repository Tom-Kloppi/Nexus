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

  function forEmpty(state, hit) {
    var actions = [];
    if (!hit || hit.q == null) {
      return actions;
    }
    var specs = [
      ["residential", null, "Wohnen", "Bandbreite, aber 0 ohne eigenes Rechenzentrum."],
      ["energy", "solar", "Solar", "Jede Runde +3 Energie. Die Ernte gibt höchstens +1 Umwelt."],
      ["energy", "transformer", "Umspannwerk", "Stabile Energie, 1 Geld pro Einheit."],
      ["datacenter", "secure", "Rechenzentrum", "Schaltet Wohn-Bandbreite frei. +1 Sicherheit."],
      ["datacenter", "insecure", "Rechenzentrum offen", "Billiger, hebt das Risiko."],
      ["traffic", null, "Parkplatz", "Erstes Verkehrsfeld +1 Komfort. Danach Halt, Bahnhof oder Linie."]
    ];
    specs.forEach(function (spec) {
      var offer = Nexus.getExpandOffer ? Nexus.getExpandOffer(state, Number(hit.q), Number(hit.r), spec[0], spec[1]) : { allowed: false, reason: "" };
      actions.push(item(
        "build",
        spec[2],
        offer.allowed,
        offer.reason,
        spec[3],
        { type: spec[0], variant: spec[1], q: Number(hit.q), r: Number(hit.r) },
        buildFx(state, spec[0], spec[1], offer.cost)
      ));
    });
    return actions;
  }

  function forOwned(state, zone) {
    var actions = [];
    var player = Nexus.currentPlayer(state);
    var mine = player && zone.ownerId === player.id;
    if (!mine) {
      if (zone.busStop) {
        actions.push(item("line-add", "Halt an die Linie", state.turnPhase === "build", "", "Fremder Halt gibt Image, wenn die Linie ihn mitnimmt."));
      } else {
        actions.push(item("look", "Fremdes Feld", false, "Du baust nur auf deinen Feldern.", "Besitz und Ziel sind offen. Bauen darfst du hier nicht."));
      }
      return actions;
    }
    if (zone.type !== "home" && !zone.busStop) {
      var stopCost = state.beginner ? 1 : 2;
      var money = player.resources.money || 0;
      actions.push(
        item(
          "bus-stop",
          "Halt",
          state.turnPhase === "build" && money >= stopCost,
          money >= stopCost ? "" : "Dafür fehlt Geld.",
          "Ohne Halt keine Linie.",
          null,
          [{ key: "money", amount: -stopCost }]
        )
      );
    }
    if (zone.type === "traffic" && zone.trafficMode !== "depot" && !player.hasDepot) {
      var depotOk = (player.resources.money || 0) >= 3 && (player.resources.bandwidth || 0) >= 1;
      actions.push(
        item(
          "depot",
          "Busbahnhof",
          state.turnPhase === "build" && depotOk,
          depotOk ? "" : "Dafür fehlen Geld oder Bandbreite.",
          "Erst der Bahnhof schaltet Linien frei.",
          null,
          [{ key: "money", amount: -3 }, { key: "bandwidth", amount: -1 }]
        )
      );
    }
    if (zone.type === "traffic" && zone.trafficMode !== "garage") {
      var garageOk = (player.resources.money || 0) >= 4 && (player.resources.energy || 0) >= 2;
      actions.push(
        item(
          "garage",
          "Parkhaus",
          state.turnPhase === "build" && garageOk,
          garageOk ? "" : "Dafür fehlen Geld oder Energie.",
          "Solardach und Ladesäule. Einmal +1 Komfort und +1 Umwelt.",
          null,
          [{ key: "money", amount: -4 }, { key: "energy", amount: -2 }, { key: "comfort", amount: 1 }, { key: "environment", amount: 1 }]
        )
      );
    }
    if (zone.busStop || zone.trafficMode === "depot") {
      actions.push(item(
        "line-add",
        "An die Linie",
        state.turnPhase === "build" && !!player.hasDepot,
        player.hasDepot ? "" : "Zuerst einen Busbahnhof.",
        "Zwei Halte, dann Antrieb. Die Linie liegt danach auf der Straße.",
        null,
        []
      ));
    }
    if (zone.type === "home") {
      actions.push(item("devices", "Gerät", true, "", "Cloud fällt bei Stromausfall aus. Lokal bleibt und gibt Sicherheit.", null, []));
      var sae = Nexus.Mobility ? Nexus.Mobility.saeOffer(state, player) : { allowed: false, reason: "Assistenz fehlt.", why: "", cost: {} };
      var saeFx = costFx(sae.cost);
      if (sae.next === 2 || sae.next === 4 || sae.next === 5) {
        saeFx.push({ key: "comfort", amount: 1 });
      }
      if (sae.next >= 4) {
        saeFx.push({ key: "risk", amount: 1 });
      }
      actions.push(item(
        "sae",
        "Assistenz " + (sae.next || ((player.saeLevel || 0) + 1)),
        sae.allowed,
        sae.reason,
        "Die Zahl steht an deiner Linie. Ab 4 wird der Ausfall riskanter.",
        null,
        saeFx
      ));
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
        var why = mode === "local"
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
            device.shortName + (mode === "local" ? " lokal" : " Cloud"),
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
    if (!state || state.turnPhase !== "build") {
      return [];
    }
    var zone = zoneAtHit(state, hit);
    if (!zone && hit && (hit.kind === "empty" || hit.q != null)) {
      if (hit.open === false) {
        return [item("build", "Bauen", false, hit.blockedReason || "Nicht an deinem Netz.", "Neue Felder müssen an dein Netz grenzen.")];
      }
      return forEmpty(state, hit);
    }
    if (!zone) {
      return [];
    }
    return forOwned(state, zone);
  }

  Nexus.FieldActions = {
    forHit: forHit,
    zoneAtHit: zoneAtHit,
    deviceOffers: deviceOffers
  };
})(window.Nexus);
