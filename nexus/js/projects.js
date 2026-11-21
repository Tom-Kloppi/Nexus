window.Nexus = window.Nexus || {};

/* Ausschreibungen: 3 offene Briefings. Kauf = sofort ausspielen. */
(function (Nexus) {
  function costFor(card, state) {
    var category = card && card.category;
    var cost = { money: 2 };
    if (category === "privacy") {
      cost = { bandwidth: 1, money: 1 };
    } else if (category === "mobility") {
      cost = { money: 1, bandwidth: 1 };
    } else if (category === "green") {
      cost = { money: 2 };
    }
    if (state && state.beginner && cost.money) {
      cost = Object.assign({}, cost, { money: Math.max(1, cost.money - 1) });
    }
    return cost;
  }

  function afford(resources, cost) {
    if (resources && resources.unlimited) {
      return true;
    }
    return (Nexus.RESOURCE_KEYS || []).every(function (key) {
      return (resources[key] || 0) >= (cost[key] || 0);
    });
  }

  function pay(resources, cost) {
    if (resources && resources.unlimited) {
      return Object.assign({}, resources);
    }
    var next = Object.assign({}, resources);
    (Nexus.RESOURCE_KEYS || []).forEach(function (key) {
      next[key] = (next[key] || 0) - (cost[key] || 0);
    });
    return next;
  }

  function asCard(entry) {
    if (!entry) {
      return null;
    }
    if (typeof entry === "string") {
      return (
        (Nexus.STADT_AKTEN_BY_ID && Nexus.STADT_AKTEN_BY_ID[entry]) ||
        (Nexus.INNOVATION_CARDS_BY_ID && Nexus.INNOVATION_CARDS_BY_ID[entry]) ||
        null
      );
    }
    return entry;
  }

  function isBriefing(card) {
    return !!(card && (card.kind === "briefing" || !card.kind));
  }

  /* Preis-Ressource darf nicht in effects vorkommen (kein Refund). */
  function effectsRespectCost(card, cost) {
    var effects = (card && card.effects) || {};
    return (Nexus.RESOURCE_KEYS || []).every(function (key) {
      if (!(cost[key] > 0)) {
        return true;
      }
      return !(effects[key] > 0);
    });
  }

  function drawOne(state) {
    var deck = (state.innovationDeck || []).slice();
    var discard = (state.innovationDiscard || []).slice();
    if (!deck.length && discard.length) {
      deck = discard.slice();
      discard = [];
      /* Fisher-Yates light */
      var i;
      for (i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = deck[i];
        deck[i] = deck[j];
        deck[j] = tmp;
      }
    }
    if (!deck.length) {
      return { card: null, innovationDeck: deck, innovationDiscard: discard };
    }
    var skipped = [];
    var card = null;
    while (deck.length && !card) {
      var id = deck[0];
      deck = deck.slice(1);
      var cand = asCard(id);
      if (isBriefing(cand) && effectsRespectCost(cand, costFor(cand, state))) {
        card = cand;
      } else {
        skipped.push(id);
      }
    }
    deck = deck.concat(skipped);
    return { card: card, innovationDeck: deck, innovationDiscard: discard };
  }

  function ensureMarket(state) {
    var market = (state.projectMarket || []).slice();
    var next = state;
    var guard = 0;
    while (market.length < 3 && guard < 24) {
      guard += 1;
      var drawn = drawOne(next);
      next = Object.assign({}, next, {
        innovationDeck: drawn.innovationDeck,
        innovationDiscard: drawn.innovationDiscard
      });
      if (!drawn.card) {
        break;
      }
      market.push(drawn.card);
    }
    return Object.assign({}, next, { projectMarket: market });
  }

  function applyEffects(player, card) {
    var effects = card.effects || {};
    var resources = Object.assign({}, player.resources);
    (Nexus.RESOURCE_KEYS || []).forEach(function (key) {
      if (effects[key]) {
        resources[key] = (resources[key] || 0) + effects[key];
      }
    });
    var scores = Object.assign({}, player.scores || {});
    (Nexus.SCORE_KEYS || []).forEach(function (key) {
      if (effects[key]) {
        scores[key] = Math.max(0, (scores[key] || 0) + effects[key]);
      }
    });
    var shock = Math.max(0, (player.riskShock || 0) + (effects.risk || 0));
    return Object.assign({}, player, {
      resources: resources,
      scores: scores,
      riskShock: shock,
      greenInnovationCards: (player.greenInnovationCards || 0) + (card.category === "green" ? 1 : 0),
      innovationCardsTotal: (player.innovationCardsTotal || 0) + 1,
      playedCards: (player.playedCards || []).concat([
        {
          id: card.id,
          name: card.name,
          category: card.category,
          kind: "briefing",
          text: card.text
        }
      ])
    });
  }

  function take(state, index) {
    if (!state || state.turnPhase !== "build") {
      return state;
    }
    if (state.pendingPressure) {
      return state;
    }
    var player = state.players[state.currentPlayerIndex];
    var market = state.projectMarket || [];
    if (!player || index < 0 || index >= market.length) {
      return state;
    }
    var card = market[index];
    if (!isBriefing(card)) {
      return state;
    }
    var cost = costFor(card, state);
    if (!afford(player.resources, cost)) {
      return state;
    }
    if (!effectsRespectCost(card, cost)) {
      return state;
    }
    var nextPlayer = applyEffects(player, card);
    nextPlayer = Object.assign({}, nextPlayer, { resources: pay(nextPlayer.resources, cost) });
    var discard = (state.innovationDiscard || []).concat([card.id]);
    var remaining = market.slice(0, index).concat(market.slice(index + 1));
    var next = Object.assign({}, state, {
      projectMarket: remaining,
      innovationDiscard: discard,
      players: state.players.map(function (item) {
        return item.id === player.id ? nextPlayer : item;
      })
    });
    next = ensureMarket(next);
    next.log = [
      {
        round: state.round,
        playerName: player.name,
        text: "Ausschreibung: " + card.name + ". " + (card.text || "")
      }
    ]
      .concat(next.log || [])
      .slice(0, 40);
    return next;
  }

  function offer(state, index) {
    var market = (state && state.projectMarket) || [];
    var card = market[index];
    if (!card) {
      return { allowed: false, reason: "Keine Karte.", cost: {} };
    }
    var cost = costFor(card, state);
    if (state.turnPhase !== "build") {
      return { allowed: false, reason: "Nur in der Bauphase.", cost: cost, card: card };
    }
    if (state.pendingPressure) {
      return { allowed: false, reason: "Zuerst Druckstück klären.", cost: cost, card: card };
    }
    var player = state.players[state.currentPlayerIndex];
    if (!player || !afford(player.resources, cost)) {
      return { allowed: false, reason: "Ressourcen fehlen.", cost: cost, card: card };
    }
    return { allowed: true, reason: "", cost: cost, card: card };
  }

  Nexus.Projects = {
    costFor: costFor,
    ensureMarket: ensureMarket,
    take: take,
    offer: offer
  };
})(window.Nexus);
