window.Nexus = window.Nexus || {};

(function (Nexus) {
  var HEX_DIRS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
  ];

  function plotKey(q, r) {
    return q + "," + r;
  }

  function axialToPixel(q, r, size) {
    return {
      x: size * Math.sqrt(3) * (q + r / 2),
      y: size * 1.5 * r
    };
  }

  function allSlots(radius) {
    var slots = [];
    var q;
    var r;
    for (q = -radius; q <= radius; q++) {
      var r1 = Math.max(-radius, -q - radius);
      var r2 = Math.min(radius, -q + radius);
      for (r = r1; r <= r2; r++) {
        slots.push({ q: q, r: r, key: plotKey(q, r) });
      }
    }
    return slots;
  }

  function gridSlots(cols, rows) {
    var slots = [];
    var q;
    var r;
    for (r = 0; r < rows; r++) {
      for (q = 0; q < cols; q++) {
        slots.push({ q: q, r: r, key: plotKey(q, r) });
      }
    }
    return slots;
  }

  function boardSlots() {
    return allSlots(Nexus.CONSTANTS.HEX_RADIUS);
  }

  function isAdjacent(a, b) {
    return HEX_DIRS.some(function (dir) {
      return a.q + dir.q === b.q && a.r + dir.r === b.r;
    });
  }

  Nexus.plotKey = plotKey;
  Nexus.axialToPixel = axialToPixel;
  Nexus.allSlots = allSlots;
  Nexus.gridSlots = gridSlots;
  Nexus.boardSlots = boardSlots;
  Nexus.isAdjacent = isAdjacent;
  Nexus.HEX_DIRS = HEX_DIRS;
})(window.Nexus);
