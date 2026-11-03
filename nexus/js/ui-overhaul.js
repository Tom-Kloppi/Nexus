window.Nexus = window.Nexus || {};

/* Oberfläche für Markt, Feldmenü, Hilfe, Speicher, Debug. Keine Regeln. */
(function (Nexus) {
  var api = null;
  var menu;
  var tip;
  var guide;
  var debugPanel;
  var fan;
  var inbox;
  var chapter;
  var tipTimer = 0;
  var holdTimer = 0;
  var lineDraft = [];
  var difficulty = "normal";
  var beginner = false;
  var audio;
  var lastPhase = "";
  var suppressClose = false;
  var winPlayed = false;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function beep(freq, dur) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + dur);
    } catch (err) {
      /* ohne Audio bleibt das Spiel still */
    }
  }

  Nexus.Sfx = {
    muted: false,
    play: function (name) {
      if (Nexus.Sfx.muted) {
        return;
      }
      if (name === "build") {
        beep(520, 0.08);
      } else if (name === "card") {
        beep(660, 0.07);
      } else if (name === "roll") {
        beep(340, 0.12);
      } else if (name === "error") {
        beep(180, 0.14);
      } else if (name === "win") {
        beep(720, 0.16);
      }
    }
  };

  function place(node, x, y) {
    var width = node.offsetWidth || 220;
    var height = node.offsetHeight || 80;
    var left = Math.min(window.innerWidth - width - 8, Math.max(8, x));
    var top = Math.min(window.innerHeight - height - 8, Math.max(8, y));
    node.style.left = left + "px";
    node.style.top = top + "px";
  }

  function figureMarkup(kind) {
    var paths = {
      bolt: "M13 2 L6 14 H12 L10 22 L18 10 H12 Z",
      coin: "M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4",
      arrows: "M12 3 V21 M8 7 L12 3 L16 7 M8 17 L12 21 L16 17",
      shield: "M12 3 L19 6 V12 C19 17 12 21 12 21 C12 21 5 17 5 12 V6 Z",
      bus: "M6 6 H18 V16 H6 Z M8 16 V19 M16 16 V19 M9 9 H15",
      link: "M9 12 H15 M8 9 H10 A3 3 0 0 1 10 15 H8 M16 9 H14 A3 3 0 0 0 14 15 H16",
      leaf: "M6 18 C6 10 12 4 20 4 C18 12 12 18 6 18 Z"
    };
    var d = paths[kind] || paths.bolt;
    return "<svg class='nx-fig' viewBox='0 0 24 24' aria-hidden='true'><path d='" + d + "'/></svg>";
  }

  function showTip(title, body, example, x, y, figure) {
    tip.hidden = false;
    tip.innerHTML = figureMarkup(figure || "bolt");
    tip.appendChild(el("strong", "", title));
    tip.appendChild(el("p", "", body));
    if (example) {
      tip.appendChild(el("p", "ex", example));
    }
    place(tip, x + 14, y + 16);
  }

  function hideTip() {
    tip.hidden = true;
  }

  function bindTips() {
    document.body.addEventListener("mouseover", function (event) {
      var host = event.target.closest("[data-gloss], [data-help]");
      if (!host) {
        return;
      }
      window.clearTimeout(tipTimer);
      tipTimer = window.setTimeout(function () {
        var gloss = host.getAttribute("data-gloss");
        var entry = gloss && Nexus.glossaryEntry ? Nexus.glossaryEntry(gloss) : null;
        var help = host.getAttribute("data-help") || "";
        if (entry) {
          showTip(entry.title, entry.short, entry.example, event.clientX, event.clientY, entry.figure);
        } else if (help) {
          showTip(host.getAttribute("data-help-title") || "Hinweis", help, "", event.clientX, event.clientY, "bolt");
        }
      }, 280);
    });
    document.body.addEventListener("mouseout", function (event) {
      if (event.target.closest("[data-gloss], [data-help]")) {
        window.clearTimeout(tipTimer);
        hideTip();
      }
    });
    document.body.addEventListener("pointerdown", function (event) {
      var host = event.target.closest("[data-gloss], [data-help]");
      if (!host) {
        return;
      }
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(function () {
        host.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: event.clientX, clientY: event.clientY }));
      }, 450);
    });
    document.body.addEventListener("pointerup", function () {
      window.clearTimeout(holdTimer);
    });
  }

  function closeMenu() {
    menu.hidden = true;
    menu.innerHTML = "";
  }

  function applyAction(action) {
    var state = api.getState();
    if (!action.enabled) {
      Nexus.Sfx.play("error");
      if (Nexus.pushToast) {
        Nexus.pushToast(action.reason || "Geht gerade nicht.");
      }
      return;
    }
    if (action.id === "line-add") {
      var zone = Nexus.FieldActions.zoneAtHit(state, action.hit);
      if (!zone) {
        return;
      }
      if (lineDraft.indexOf(zone.id) < 0) {
        lineDraft.push(zone.id);
      }
      if (lineDraft.length < 2) {
        if (Nexus.pushToast) {
          Nexus.pushToast("Zweiter Halt für die Linie.");
        }
        closeMenu();
        return;
      }
      openPropulsion(action);
      return;
    }
    var base = Nexus.pushUndo ? Nexus.pushUndo(state) : state;
    var next = base;
    if (action.id === "build") {
      next = Nexus.buyZone(base, action.payload.q, action.payload.r, action.payload.type, action.payload.variant);
    } else if (action.id === "upgrade") {
      next = Nexus.upgradeZone(base, action.zoneId);
    } else if (action.id === "demolish") {
      next = Nexus.demolishZone(base, action.zoneId);
    } else if (action.id === "bus-stop") {
      next = Nexus.placeBusStop(base, action.zoneId);
    } else if (action.id === "depot" || action.id === "garage") {
      next = Nexus.setTrafficMode(base, action.zoneId, action.id);
    } else if (action.id === "sae") {
      next = Nexus.upgradeSae(base);
    } else if (action.id === "devices") {
      openDeviceMenu();
      return;
    } else if (action.id === "device") {
      next = Nexus.buildDevice(base, action.payload.deviceId, action.payload.mode);
    } else if (action.id === "line") {
      next = Nexus.openBusLine(base, action.stops, action.propulsion);
      lineDraft = [];
    }
    if (next === base || next === state) {
      Nexus.Sfx.play("error");
      return;
    }
    Nexus.Sfx.play(action.id === "line" ? "card" : "build");
    closeMenu();
    api.commit(next);
  }

  function openPropulsion(action) {
    menu.innerHTML = "";
    ["diesel", "electric", "renewable"].forEach(function (mode) {
      var button = el("button", "", mode === "diesel" ? "Diesel" : mode === "electric" ? "Elektro" : "Elektro, erneuerbar");
      button.addEventListener("click", function () {
        applyAction({
          id: "line",
          enabled: true,
          stops: lineDraft.slice(),
          propulsion: mode,
          zoneId: action.zoneId
        });
      });
      menu.appendChild(button);
    });
  }

  function openDeviceMenu() {
    var offers = Nexus.FieldActions.deviceOffers(api.getState());
    menu.innerHTML = "";
    if (!offers.length) {
      closeMenu();
      return;
    }
    offers.forEach(function (action) {
      var button = document.createElement("button");
      button.disabled = !action.enabled;
      button.appendChild(document.createTextNode(action.label));
      if (action.why || action.reason) {
        button.appendChild(el("span", "why", action.enabled ? action.why : action.reason));
      }
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        if (action.id === "devices-home") {
          api.getUi().homeOpen = true;
          api.commit(api.getState());
          closeMenu();
          return;
        }
        applyAction(action);
      });
      menu.appendChild(button);
    });
    menu.hidden = false;
  }

  function openMenu(x, y, actions, hit) {
    menu.innerHTML = "";
    if (!actions.length) {
      closeMenu();
      return;
    }
    actions.forEach(function (action) {
      var button = document.createElement("button");
      button.disabled = !action.enabled;
      button.innerHTML = "";
      button.appendChild(document.createTextNode(action.label));
      if (action.why || action.reason) {
        button.appendChild(el("span", "why", action.enabled ? action.why : action.reason));
      }
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        action.hit = hit;
        var zone = Nexus.FieldActions.zoneAtHit(api.getState(), hit);
        action.zoneId = zone && zone.id;
        applyAction(action);
      });
      menu.appendChild(button);
    });
    menu.hidden = false;
    place(menu, x, y);
  }

  function renderFan(state) {
    fan.innerHTML = "";
    var market = state.projectMarket || [];
    market.forEach(function (card, index) {
      var offer = Nexus.Projects ? Nexus.Projects.offer(state, index) : { allowed: false, cost: {}, reason: "" };
      var button = document.createElement("button");
      button.className = "project-card";
      button.style.setProperty("--tilt", (index - 1) * 4 + "deg");
      button.disabled = !offer.allowed;
      var costBits = [];
      Object.keys(offer.cost || {}).forEach(function (key) {
        if (offer.cost[key]) {
          costBits.push(offer.cost[key] + " " + (Nexus.RESOURCE_SHORT[key] || key));
        }
      });
      button.innerHTML =
        "<strong>" +
        card.name +
        "</strong><small>" +
        (card.text || "") +
        "</small><span class='project-cost'>" +
        (costBits.join(", ") || "kostenlos") +
        "</span>";
      button.setAttribute("data-help-title", card.name);
      button.setAttribute("data-help", (card.text || "") + (offer.reason ? " " + offer.reason : ""));
      button.addEventListener("click", function () {
        if (!offer.allowed) {
          Nexus.Sfx.play("error");
          return;
        }
        var base = Nexus.pushUndo(api.getState());
        var next = Nexus.takeProject(base, index);
        if (next !== base) {
          Nexus.Sfx.play("card");
          api.commit(next);
        }
      });
      fan.appendChild(button);
    });
    inbox.innerHTML = "";
    var hand = (Nexus.currentPlayer(state) && Nexus.currentPlayer(state).handCards) || [];
    hand.forEach(function (card, index) {
      var button = el("button", "project-card", card.name);
      button.addEventListener("click", function () {
        var next = Nexus.playInnovationCard(api.getState(), index);
        if (next !== api.getState()) {
          Nexus.Sfx.play("card");
          api.commit(next);
        }
      });
      inbox.appendChild(button);
    });
  }

  function renderChapter(state) {
    if (!state || state.screen !== "game" || !Nexus.Arc) {
      chapter.hidden = true;
      return;
    }
    var player = Nexus.currentPlayer(state);
    var mark = player ? Nexus.Arc.milestone(state, player) : null;
    chapter.hidden = false;
    chapter.innerHTML = "<strong>" + (state.chapterIndex || "") + " " + (state.chapterTitle || "") + "</strong> " + (mark ? mark.text : "");
  }

  function renderEnd(state) {
    var host = document.getElementById("end-eval");
    if (!host) {
      return;
    }
    host.innerHTML = "";
    if (!state || state.turnPhase !== "gameover" || !state.evaluation) {
      winPlayed = false;
      return;
    }
    if (!winPlayed) {
      winPlayed = true;
      Nexus.Sfx.play("win");
    }
    state.evaluation.forEach(function (row) {
      host.appendChild(el("p", "", row.narrative));
    });
  }

  function renderGuide(which) {
    var body = document.getElementById("guide-body");
    var pages = {
      bogen:
        "Vier Kapitel: Grundversorgung, Vernetzung, Mobilität, Resilienz. Im letzten Kapitel würfelt ein Großereignis gegen eure Vorbereitung.",
      risiko:
        "Vier Zahlen vor dem Wurf: Cyber, Netz, Abhängigkeit, Verkehr. Der d100 ist offen. Die Karte sagt, warum es dich trifft und was geholfen hätte.",
      mobil:
        "Haltestelle, Busbahnhof, dann eine Linie wie ein Ticket. Diesel, Elektro oder erneuerbar. Höhere SAE braucht Technik und ist störanfälliger."
    };
    body.textContent = pages[which] || pages.bogen;
  }

  function stampHelp(state) {
    document.querySelectorAll(".wallet-item").forEach(function (node) {
      var key = node.getAttribute("data-res");
      if (key === "energy") {
        node.setAttribute("data-gloss", "energie");
      }
      if (key === "money") {
        node.setAttribute("data-gloss", "geld");
      }
      if (key === "bandwidth") {
        node.setAttribute("data-gloss", "bandbreite");
      }
    });
    var risk = document.querySelector(".risk-pill");
    if (risk) {
      risk.setAttribute("data-gloss", "cyber");
    }
    var preview = state && state.riskPreview;
    if (preview && risk) {
      risk.setAttribute("data-help-title", "Risiko " + preview.total);
      risk.setAttribute("data-help", preview.summary);
    }
  }

  function sync(state) {
    if (!state) {
      return;
    }
    renderFan(state);
    renderChapter(state);
    renderEnd(state);
    stampHelp(state);
    if (state.turnPhase !== lastPhase && state.turnPhase === "risk") {
      Nexus.Sfx.play("roll");
    }
    lastPhase = state.turnPhase || "";
    var undo = document.getElementById("btn-undo");
    if (undo) {
      undo.disabled = !(state.undoStack && state.undoStack.length) || state.turnPhase !== "build";
    }
    if (debugPanel && !debugPanel.hidden && Nexus.Board3D && Nexus.Board3D.debugSnapshot) {
      var snap = Nexus.Board3D.debugSnapshot();
      var fps = document.getElementById("debug-fps");
      if (fps) {
        fps.textContent = "Knoten " + (snap.graphNodes || 0) + " · Autos " + ((snap.cars && snap.cars.length) || 0);
      }
    }
  }

  function setupOptions() {
    return { difficulty: difficulty, beginner: beginner };
  }

  function install(nextApi) {
    api = nextApi;
    menu = el("div", "field-menu");
    menu.hidden = true;
    tip = el("div", "nx-tip");
    tip.hidden = true;
    tip.setAttribute("role", "tooltip");
    guide = el("aside", "guide-panel");
    guide.hidden = true;
    guide.innerHTML =
      "<h2>Überblick</h2><div class='guide-tabs'>" +
      "<button type='button' data-guide='bogen'>Bogen</button>" +
      "<button type='button' data-guide='risiko'>Risiko</button>" +
      "<button type='button' data-guide='mobil'>Mobilität</button>" +
      "</div><p id='guide-body'></p><button type='button' id='btn-dialog-placeholder'>Intro-Platzhalter</button>" +
      "<p><button type='button' id='btn-save'>Speichern</button> <button type='button' id='btn-load'>Laden</button></p>";
    fan = el("div", "project-fan");
    fan.id = "project-fan";
    inbox = el("div", "inbox-fan");
    chapter = el("div", "chapter-chip");
    chapter.hidden = true;
    document.body.appendChild(menu);
    document.body.appendChild(tip);
    document.body.appendChild(guide);
    var tray = document.querySelector(".tray-grid");
    if (tray) {
      tray.insertBefore(fan, tray.firstChild);
      tray.insertBefore(inbox, fan.nextSibling);
    }
    var top = document.querySelector(".topbar-row--main");
    if (top) {
      top.insertBefore(chapter, top.querySelector(".wallet"));
    }
    var dock = document.getElementById("dock");
    if (dock) {
      dock.classList.add("is-tab-goals");
      var tabs = el("div", "dock-tabs");
      [["goals", "Ziele"], ["field", "Feld"], ["city", "Stadt"]].forEach(function (pair) {
        var button = el("button", "btn", pair[1]);
        button.type = "button";
        button.addEventListener("click", function () {
          dock.classList.remove("is-tab-goals", "is-tab-field", "is-tab-city");
          dock.classList.add("is-tab-" + pair[0]);
        });
        tabs.appendChild(button);
      });
      dock.insertBefore(tabs, dock.firstChild);
    }
    var end = document.querySelector(".end-card");
    if (end) {
      var evalNode = el("div", "end-eval");
      evalNode.id = "end-eval";
      end.insertBefore(evalNode, document.getElementById("btn-restart"));
    }
    if (window.location.search.indexOf("debug") !== -1) {
      debugPanel = el("aside", "debug-panel");
      debugPanel.innerHTML =
        "<p id='debug-fps'>Debug</p>" +
        "<button type='button' id='debug-cam'>Kamera-Extrem</button>" +
        "<button type='button' id='debug-night'>Tag/Nacht</button>" +
        "<button type='button' id='debug-biome'>Biom</button>" +
        "<label>Dichte <input id='debug-density' type='range' min='0' max='2' step='1' value='1'></label>" +
        "<button type='button' id='debug-wire'>Wireframe</button>";
      document.body.appendChild(debugPanel);
      var density = document.getElementById("debug-density");
      if (density) {
        density.addEventListener("input", function (event) {
          if (Nexus.Board3D && Nexus.Board3D.setDensity) {
            Nexus.Board3D.setDensity(Number(event.target.value));
          }
        });
      }
      debugPanel.addEventListener("click", function (event) {
        var id = event.target.id;
        if (!Nexus.Board3D) {
          return;
        }
        if (id === "debug-cam" && Nexus.Board3D.debugCamera) {
          Nexus.Board3D.debugCamera();
        }
        if (id === "debug-night") {
          var root = document.documentElement;
          root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
          if (Nexus.Board3D.setTheme) {
            Nexus.Board3D.setTheme();
          }
        }
        if (id === "debug-biome" && Nexus.Board3D.setBiome) {
          var order = ["grass", "desert", "water"];
          var current = order.indexOf(document.body.getAttribute("data-biome") || "grass");
          var nextBiome = order[(current + 1) % order.length];
          document.body.setAttribute("data-biome", nextBiome);
          Nexus.Board3D.setBiome(nextBiome);
        }
        if (id === "debug-wire" && Nexus.Board3D.setWirePick) {
          Nexus.Board3D.setWirePick();
        }
      });
    }
    document.getElementById("setup-difficulty").addEventListener("click", function (event) {
      var button = event.target.closest("[data-difficulty]");
      if (!button) {
        return;
      }
      difficulty = button.getAttribute("data-difficulty");
      document.querySelectorAll("#setup-difficulty .setup-choice").forEach(function (node) {
        node.classList.toggle("is-selected", node === button);
      });
    });
    document.getElementById("setup-beginner").addEventListener("change", function (event) {
      beginner = !!event.target.checked;
    });
    document.getElementById("btn-guide").addEventListener("click", function () {
      guide.hidden = !guide.hidden;
      renderGuide("bogen");
    });
    guide.addEventListener("click", function (event) {
      var key = event.target.getAttribute && event.target.getAttribute("data-guide");
      if (key) {
        renderGuide(key);
      }
      if (event.target.id === "btn-dialog-placeholder" && Nexus.Dialog) {
        var step = Nexus.Dialog.start();
        if (step && Nexus.pushToast) {
          Nexus.pushToast(step.speaker + ": " + step.text);
        }
      }
      if (event.target.id === "btn-save") {
        var raw = JSON.stringify(api.getState());
        window.localStorage.setItem("nexus-save", raw);
        if (Nexus.pushToast) {
          Nexus.pushToast("Partie gespeichert.");
        }
      }
      if (event.target.id === "btn-load") {
        var saved = window.localStorage.getItem("nexus-save");
        if (!saved) {
          return;
        }
        api.commit(JSON.parse(saved));
      }
    });
    document.getElementById("btn-undo").addEventListener("click", function () {
      var next = Nexus.undo(api.getState());
      if (next !== api.getState()) {
        api.commit(next);
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        guide.hidden = true;
      }
      if (event.key === "u" && api) {
        var undone = Nexus.undo(api.getState());
        if (undone !== api.getState()) {
          api.commit(undone);
        }
      }
    });
    var viewport = document.getElementById("map-viewport");
    if (viewport) {
      viewport.addEventListener(
        "click",
        function (event) {
          if (!api || !Nexus.Board3D || !Nexus.Board3D.pick) {
            return;
          }
          var state = api.getState();
          var ui = api.getUi();
          if (!state || state.turnPhase !== "build" || (ui.map && ui.map.moved)) {
            return;
          }
          var hit = Nexus.Board3D.pick(event.clientX, event.clientY);
          if (!hit) {
            closeMenu();
            return;
          }
          event.stopPropagation();
          event.stopImmediatePropagation();
          suppressClose = true;
          var actions = Nexus.FieldActions.forHit(state, hit);
          openMenu(event.clientX, event.clientY, actions, hit);
          if (hit.open === false && hit.blockedReason && Nexus.pushToast) {
            Nexus.pushToast(hit.blockedReason);
          }
        },
        true
      );
      viewport.addEventListener("pointermove", function (event) {
        if (!api || !Nexus.Board3D || !Nexus.Board3D.pick) {
          return;
        }
        var state = api.getState();
        if (!state || state.turnPhase !== "build") {
          return;
        }
        window.clearTimeout(tipTimer);
        tipTimer = window.setTimeout(function () {
          var hit = Nexus.Board3D.pick(event.clientX, event.clientY);
          if (hit && hit.blockedReason) {
            showTip("Geht nicht", hit.blockedReason, "Bauen nur auf freien Nachbarfeldern in der Bauphase.", event.clientX, event.clientY, "link");
          }
        }, 280);
      });
    }
    document.addEventListener("click", function (event) {
      if (suppressClose) {
        suppressClose = false;
        return;
      }
      if (!menu.hidden && !menu.contains(event.target)) {
        closeMenu();
      }
    });
    bindTips();
    var previous = Nexus.render;
    Nexus.render = function (state, ui) {
      if (previous) {
        previous(state, ui);
      }
      sync(state);
    };
  }

  Nexus.UIOverhaul = {
    install: install,
    setupOptions: setupOptions,
    sync: sync
  };
})(window.Nexus);
