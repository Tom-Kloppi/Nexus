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

  function boardSlots() {
    return allSlots(Nexus.CONSTANTS.HEX_RADIUS);
  }

  function boardLayout() {
    var size = Nexus.CONSTANTS.HEX_SIZE;
    var shadowDy = Nexus.CONSTANTS.HEX_SHADOW_DY || 8;
    var slots = boardSlots();
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var positions = slots.map(function (slot) {
      var pos = axialToPixel(slot.q, slot.r, size);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
      return pos;
    });
    var pad = size + shadowDy + 6;
    var originX = pad - minX;
    var originY = pad - minY;
    return {
      size: size,
      shadowDy: shadowDy,
      pad: pad,
      originX: originX,
      originY: originY,
      width: Math.ceil(maxX - minX + pad * 2),
      height: Math.ceil(maxY - minY + pad * 2 + shadowDy),
      hexes: slots.map(function (slot, index) {
        return {
          q: slot.q,
          r: slot.r,
          key: slot.key,
          x: originX + positions[index].x,
          y: originY + positions[index].y
        };
      })
    };
  }

  function isAdjacent(a, b) {
    return HEX_DIRS.some(function (dir) {
      return a.q + dir.q === b.q && a.r + dir.r === b.r;
    });
  }

  Nexus.plotKey = plotKey;
  Nexus.axialToPixel = axialToPixel;
  Nexus.allSlots = allSlots;
  Nexus.boardSlots = boardSlots;
  Nexus.boardLayout = boardLayout;
  Nexus.isAdjacent = isAdjacent;
  Nexus.HEX_DIRS = HEX_DIRS;
})(window.Nexus);
