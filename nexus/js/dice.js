window.Nexus = window.Nexus || {};

/* Transparente Würfel. Server füllt den Beutel, sonst lokal und sichtbar markiert. */
(function (Nexus) {
  var seed = 1;
  var seeded = false;
  var bag = [];
  var source = "local";

  function nextSeeded() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function randomUnit() {
    if (seeded) {
      return nextSeeded();
    }
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function rollInt(sides) {
    var n = Math.max(2, sides | 0);
    return 1 + Math.floor(randomUnit() * n);
  }

  function mapProduction(roll) {
    var dice = Nexus.PRODUCTION_DICE || [];
    var total = 0;
    var i;
    for (i = 0; i < dice.length; i++) {
      total += dice[i].weight;
    }
    if (!total) {
      return { id: "normal", modifier: 0, weight: 1, label: "Normalbetrieb", roll: roll, sides: 100 };
    }
    var cursor = ((roll - 1) / 100) * total;
    var acc = 0;
    for (i = 0; i < dice.length; i++) {
      acc += dice[i].weight;
      if (cursor < acc) {
        return Object.assign({}, dice[i], { roll: roll, sides: 100, weightTotal: total });
      }
    }
    return Object.assign({}, dice[dice.length - 1], { roll: roll, sides: 100, weightTotal: total });
  }

  function fillSync(count, sides) {
    var n = Math.max(1, count || 1);
    var s = sides || 100;
    var i;
    var made = [];
    for (i = 0; i < n; i++) {
      made.push(rollInt(s));
    }
    bag = bag.concat(made);
    if (source !== "server") {
      source = seeded ? "seed" : "local";
    }
    return made;
  }

  function prepare(count, sides) {
    var n = Math.max(1, count || 1);
    var s = sides || 100;
    function local() {
      fillSync(n, s);
      return Promise.resolve({ rolls: bag.slice(-n), source: source });
    }
    if (typeof fetch !== "function") {
      return local();
    }
    var url = "/api/roll?n=" + n + "&sides=" + s;
    var timer = new Promise(function (resolve) {
      setTimeout(function () {
        resolve(null);
      }, 400);
    });
    var req = fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .catch(function () {
        return null;
      });
    return Promise.race([req, timer]).then(function (data) {
      if (data && data.rolls && data.rolls.length) {
        bag = bag.concat(data.rolls.map(function (value) {
          return Math.max(1, Math.min(s, value | 0));
        }));
        source = "server";
        return { rolls: data.rolls, source: "server" };
      }
      return local();
    });
  }

  function consume(sides) {
    if (!bag.length) {
      fillSync(1, sides || 100);
    }
    return bag.shift();
  }

  Nexus.Dice = {
    seed: function (n) {
      seed = (n >>> 0) || 1;
      seeded = true;
      source = "seed";
      bag = [];
    },
    clearSeed: function () {
      seeded = false;
      source = "local";
    },
    rollInt: rollInt,
    mapProduction: mapProduction,
    fillSync: fillSync,
    prepare: prepare,
    consume: consume,
    peekSource: function () {
      return source;
    },
    resetBag: function () {
      bag = [];
    }
  };
})(window.Nexus);
