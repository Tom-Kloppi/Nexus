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

  function item(id, label, enabled, reason, why, payload) {
    return {
      id: id,
      label: label,
      enabled: !!enabled,
      reason: reason || "",
      why: why || "",
      payload: payload || null
    };
  }

  function forEmpty(state, hit) {
    var actions = [];
    if (!hit || hit.q == null) {
      return actions;
    }
    var specs = [
      ["residential", null, "Wohnen bauen", Nexus.WHY && Nexus.WHY.residential],
      ["energy", "solar", "Solar bauen", Nexus.WHY && Nexus.WHY.solar],
      ["energy", "transformer", "Umspannwerk", Nexus.WHY && Nexus.WHY.transformer],
      ["datacenter", "secure", "Datenzentrum gesichert", Nexus.WHY && Nexus.WHY.secure],
      ["datacenter", "insecure", "Datenzentrum offen", Nexus.WHY && Nexus.WHY.insecure],
      ["traffic", null, "Verkehrsfläche", Nexus.WHY && Nexus.WHY.traffic]
    ];
    specs.forEach(function (spec) {
      var offer = Nexus.getExpandOffer ? Nexus.getExpandOffer(state, Number(hit.q), Number(hit.r), spec[0], spec[1]) : { allowed: false, reason: "" };
      actions.push(item("build", spec[2], offer.allowed, offer.reason, spec[3], { type: spec[0], variant: spec[1], q: Number(hit.q), r: Number(hit.r) }));
    });
    return actions;
  }

  function forOwned(state, zone) {
    var actions = [];
    var player = Nexus.currentPlayer(state);
    var mine = player && zone.ownerId === player.id;
    if (!mine) {
      actions.push(item("look", "Fremdes Feld", false, "Du baust nur auf deinen Feldern.", "Besitz ist öffentlich, die Kasse nicht."));
      if (zone.busStop) {
        actions.push(item("line-foreign", "Halt liegt an deiner möglichen Linie", true, "", "Fremde Halte zählen fürs Gemeinwohl, wenn du sie anbindest."));
      }
      return actions;
    }
    if (Nexus.describeZoneUpgrade) {
      var up = Nexus.describeZoneUpgrade(state, zone.id);
      actions.push(item("upgrade", "Ausbauen", up.allowed, up.reason, "Jede Stufe hebt den Ertrag des Feldes um 1."));
    }
    if (zone.type !== "home" && Nexus.describeDemolish) {
      var down = Nexus.describeDemolish(state, zone.id);
      actions.push(item("demolish", "Abreißen", down.allowed, down.reason, "Nur wenn der Rest am Leitstand hängen bleibt."));
    }
    if (zone.type !== "home" && !zone.busStop) {
      var stopCost = state.beginner ? 1 : 2;
      var money = player.resources.money || 0;
      actions.push(
        item(
          "bus-stop",
          "Haltestelle (" + stopCost + " Geld)",
          state.turnPhase === "build" && money >= stopCost,
          money >= stopCost ? "" : "Geld fehlt.",
          "Ohne Halt keine Linie und kein Verkehrsabzug."
        )
      );
    }
    if (zone.type === "traffic" && zone.trafficMode !== "depot" && !player.hasDepot) {
      actions.push(
        item(
          "depot",
          "Busbahnhof",
          state.turnPhase === "build",
          "",
          "Schaltet Linien frei. Kostet 3 Geld und 1 Bandbreite."
        )
      );
    }
    if (zone.type === "traffic" && zone.trafficMode !== "garage") {
      actions.push(
        item(
          "garage",
          "Parkhaus mit Solardach",
          state.turnPhase === "build",
          "",
          "Ladesäulen und Dach-Solar. Kostet 4 Geld und 2 Energie, +1 Komfort und +1 Umwelt."
        )
      );
    }
    if (zone.busStop || zone.trafficMode === "depot") {
      actions.push(item("line-add", "In Linie aufnehmen", state.turnPhase === "build" && !!player.hasDepot, player.hasDepot ? "" : "Zuerst einen Busbahnhof bauen.", "Zwei Halte verbinden, Antrieb wählen."));
    }
    if (zone.type === "home") {
      actions.push(item("devices", "Cloud oder lokal", true, "", Nexus.WHY && Nexus.WHY.cloud));
      var sae = Nexus.Mobility ? Nexus.Mobility.saeOffer(state, player) : { allowed: false, reason: "SAE fehlt.", why: "" };
      actions.push(item("sae", "SAE " + ((player.saeLevel || 0) + 1), sae.allowed, sae.reason, sae.why));
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
        var why = mode === "local" ? (Nexus.WHY && Nexus.WHY.local) : (Nexus.WHY && Nexus.WHY.cloud);
        actions.push(
          item(
            "device",
            device.shortName + (mode === "local" ? " lokal" : " Cloud"),
            offer.allowed,
            offer.reason,
            why,
            { deviceId: device.id, mode: mode }
          )
        );
        shown += 1;
      });
    });
    actions.push(item("devices-home", "Alle Geräte im Leitstand", true, "", "Dort stehen Voraussetzungen und Kosten vollständig."));
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
