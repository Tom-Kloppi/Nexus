window.Nexus = window.Nexus || {};

/* Offener Dreier-Markt. Karte kaufen heißt sie sofort ausspielen. */
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
    return (Nexus.RESOURCE_KEYS || []).every(function (key) {
      return (resources[key] || 0) >= (cost[key] || 0);
    });
  }

  function pay(resources, cost) {
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
      return (Nexus.INNOVATION_CARDS_BY_ID && Nexus.INNOVATION_CARDS_BY_ID[entry]) || null;
    }
    return entry;
  }

  function drawOne(state) {
    var deck = (state.innovationDeck || []).slice();
    var discard = (state.innovationDiscard || []).slice();
    if (!deck.length && discard.length) {
      deck = discard;
      discard = [];
    }
    if (!deck.length) {
      return { card: null, innovationDeck: deck, innovationDiscard: discard };
    }
    var id = deck[0];
    deck = deck.slice(1);
    return { card: asCard(id), innovationDeck: deck, innovationDiscard: discard };
  }

  function ensureMarket(state) {
    var market = (state.projectMarket || []).slice();
    var next = state;
    while (market.length < 3) {
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
        { id: card.id, name: card.name, category: card.category, text: card.text }
      ])
    });
  }

  function take(state, index) {
    if (!state || state.turnPhase !== "build") {
      return state;
    }
    var player = state.players[state.currentPlayerIndex];
    var market = state.projectMarket || [];
    if (!player || index < 0 || index >= market.length) {
      return state;
    }
    var card = market[index];
    var cost = costFor(card, state);
    if (!afford(player.resources, cost)) {
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
        text: "Projekt: " + card.name + ". " + (card.text || "") + " Sofort gespielt, keine Hand."
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
    if (state.turnPhase !== "build") {
      return { allowed: false, reason: "Nur in der Bauphase.", cost: costFor(card, state), card: card };
    }
    var player = state.players[state.currentPlayerIndex];
    var cost = costFor(card, state);
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
