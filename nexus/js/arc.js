window.Nexus = window.Nexus || {};

/* Spielbogen, Schlussbilanz, Entscheidungs-Warum. */
(function (Nexus) {
  var CHAPTERS = [
    {
      id: "supply",
      title: "Grundversorgung",
      goal: "Energie und ein Dach über dem Leitstand. Solar oder Transformator, bevor das Netz wächst."
    },
    {
      id: "network",
      title: "Vernetzung",
      goal: "Datenzentrum und Geräte. Bandbreite aus Wohnen gibt es nur mit eigenem Rechenzentrum."
    },
    {
      id: "mobility",
      title: "Mobilität",
      goal: "Halten, Linie oder SAE. Verkehr wird vom Bild zur Regel."
    },
    {
      id: "resilience",
      title: "Resilienz",
      goal: "Ein Großereignis prüft, was lokal noch läuft, wenn Cloud und Netz ausfallen."
    }
  ];

  function chapterFor(round, maxRounds) {
    var max = maxRounds || 20;
    var t = (Math.max(1, round) - 1) / max;
    var index = t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.75 ? 2 : 3;
    return Object.assign({ index: index + 1 }, CHAPTERS[index]);
  }

  function owns(state, player, pred) {
    return (state.zones || []).some(function (zone) {
      return zone.ownerId === player.id && pred(zone);
    });
  }

  function milestone(state, player) {
    var chapter = chapterFor(state.round, state.maxRounds);
    var done = false;
    var text = chapter.goal;
    if (chapter.id === "supply") {
      done = owns(state, player, function (zone) {
        return zone.type === "energy" || (zone.type === "home" && (zone.upgradeLevel || 0) > 0);
      });
      text = done ? "Grundversorgung steht." : "Dir fehlt eigene Energie oder ein ausgebauter Leitstand.";
    } else if (chapter.id === "network") {
      var devices = 0;
      Object.keys(player.devices || {}).forEach(function (id) {
        if (player.devices[id]) {
          devices += 1;
        }
      });
      done = owns(state, player, function (zone) {
        return zone.type === "datacenter";
      }) || devices >= 2;
      text = done ? "Das Quartier ist vernetzt." : "Noch kein Datenzentrum und zu wenige Geräte.";
    } else if (chapter.id === "mobility") {
      done =
        (player.saeLevel || 0) >= 1 ||
        owns(state, player, function (zone) {
          return zone.busStop || zone.type === "traffic";
        });
      text = done ? "Mobilität ist im Spiel." : "Haltestelle, Verkehrsfeld oder SAE 1 fehlen.";
    } else {
      done = !!state.majorFired || !!player.survivedMajor;
      text = state.majorFired ? "Das Großereignis ist passiert. Die Bilanz zeigt, was gehalten hat." : "Die Resilienzprüfung kommt in diesem Kapitel.";
    }
    return { id: chapter.id, title: chapter.title, index: chapter.index, done: done, text: text, goal: chapter.goal };
  }

  function stamp(state) {
    var chapter = chapterFor(state.round || 1, state.maxRounds);
    var majorArmed = state.majorArmed;
    if (chapter.id === "resilience" && !state.majorFired) {
      majorArmed = true;
    }
    return Object.assign({}, state, {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterIndex: chapter.index,
      majorArmed: majorArmed
    });
  }

  function share(part, whole) {
    if (!whole) {
      return part > 0 ? 100 : 0;
    }
    return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
  }

  function evaluate(state) {
    return (state.players || []).map(function (player) {
      var solar = 0;
      var transformer = 0;
      var local = 0;
      var built = 0;
      var demand = 0;
      var supply = 0;
      (state.zones || []).forEach(function (zone) {
        if (zone.ownerId !== player.id) {
          return;
        }
        if (zone.type === "energy" && zone.variant === "transformer") {
          transformer += 1;
          supply += 2;
        } else if (zone.type === "energy") {
          solar += 1;
          supply += 3;
        }
        if (zone.type === "residential") {
          demand += 2;
        }
      });
      (Nexus.DEVICES || []).forEach(function (device) {
        var mode = player.devices && player.devices[device.id];
        if (!mode) {
          return;
        }
        built += 1;
        if (mode === "local") {
          local += 1;
        } else {
          demand += 1;
        }
      });
      if (player.devices && player.devices.storage_battery) {
        supply += 3;
      }
      var lines = (state.busLines || []).filter(function (line) {
        return line.ownerId === player.id;
      });
      var renewableLines = lines.filter(function (line) {
        return line.propulsion === "renewable";
      }).length;
      var dieselLines = lines.filter(function (line) {
        return line.propulsion === "diesel";
      }).length;
      var progress = Nexus.computeRoleProgress ? Nexus.computeRoleProgress(state, player) : { totalPercent: 0 };
      var renewable = share(solar + renewableLines, solar + transformer + renewableLines + dieselLines);
      var autarky = share(supply, Math.max(demand, supply));
      var privacy = built ? Math.round((local / built) * 100) : 0;
      var comfort = (player.scores && player.scores.comfort) || 0;
      var resilience = Math.max(
        0,
        Math.min(
          100,
          40 +
            (player.devices && player.devices.storage_battery ? 15 : 0) +
            local * 8 +
            solar * 8 -
            ((player.risk || 0) > 18 ? 20 : 0)
        )
      );
      return {
        playerId: player.id,
        playerName: player.name,
        roleId: player.roleId,
        totalPercent: progress.totalPercent,
        renewableShare: renewable,
        autarky: autarky,
        privacy: privacy,
        comfort: comfort,
        resilience: resilience,
        narrative:
          player.name +
          ": Erneuerbare " +
          renewable +
          " %, Autarkie " +
          autarky +
          " %, lokale Geräte " +
          privacy +
          " %, Komfort " +
          comfort +
          ", Resilienz " +
          resilience +
          ". " +
          (privacy >= 50
            ? "Datenschutz wurde erkauft, meist mit höheren Baukosten. "
            : "Komfort und Cloud gingen vor lokalem Betrieb. ") +
          (renewable >= 50 ? "Der Strom kommt überwiegend aus der Fläche. " : "Der Strom hängt noch am Transformator oder am Diesel. ") +
          (resilience >= 60 ? "Ein Ausfall träfe nicht alles." : "Ein Ausfall träfe vor allem die Cloud.")
      };
    });
  }

  Nexus.WHY = {
    residential: "Wohnen ist Bandbreite, aber nur mit eigenem Datenzentrum. Sonst steht das Feld und liefert 0.",
    solar: "Solar ist erneuerbar und schwankt mit dem offenen Würfel. Es senkt Netzstress.",
    transformer: "Der Transformator ist stabil und kostet Geld pro Einheit. Er zählt nicht als erneuerbar.",
    secure: "Ein gesichertes Datenzentrum schaltet Wohn-Bandbreite frei und senkt Cyber.",
    insecure: "Ein offenes Datenzentrum ist billig und hebt die Cyber-Exposition.",
    traffic: "Verkehrsfläche ist Parkplatz, später Parkhaus oder Busbahnhof. Beim Bau +1 Komfort.",
    local: "Lokal bleibt beim Gerät. Teurer, weniger Cyber, läuft bei Stromausfall weiter.",
    cloud: "Cloud ist günstiger und braucht Bandbreite als Upkeep. Bei Ausfall ist der Effekt weg."
  };

  Nexus.Arc = {
    chapters: CHAPTERS,
    chapterFor: chapterFor,
    milestone: milestone,
    stamp: stamp,
    evaluate: evaluate
  };
})(window.Nexus);
