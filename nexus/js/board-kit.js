window.Nexus = window.Nexus || {};

/* Prozeduraler Baukasten. Zone bestimmt den Typ, der Seed nur Maße. Keine Regeln. */
(function (Nexus) {
  function unit(q, r, salt) {
    var h = ((q + 32) * 73856093) ^ ((r + 32) * 19349663) ^ ((salt || 3) * 83492791);
    return (h >>> 0) / 4294967296;
  }

  function archetype(zone, q, r) {
    if (!zone) {
      return "lot";
    }
    var roll = unit(q, r, 17);
    if (zone.type === "residential") {
      var names = ["block", "houses", "school", "bakery", "clinic", "supermarket"];
      return names[Math.floor(roll * names.length)];
    }
    if (zone.type === "energy") {
      if (zone.variant === "transformer") {
        return "substation";
      }
      return roll < 0.22 ? "wind" : "solar";
    }
    if (zone.type === "datacenter") {
      return "datacenter";
    }
    if (zone.type === "traffic") {
      if (
        zone.trafficMode === "taxi" ||
        zone.variant === "taxi" ||
        zone.trafficMode === "depot" ||
        zone.variant === "depot"
      ) {
        return "depot";
      }
      if (zone.trafficMode === "garage" || zone.variant === "garage") {
        return "garage";
      }
      return "garage";
    }
    if (zone.type === "home") {
      return "hall";
    }
    return "lot";
  }

  function build(group, ctx) {
    if (!ctx || !ctx.zone || !ctx.addBox || !ctx.mats) {
      return false;
    }
    var kind = archetype(ctx.zone, ctx.q, ctx.r);
    var q = ctx.q;
    var r = ctx.r;
    var level = ctx.level || 0;
    var th = ctx.TILE_H;
    var m = ctx.mats;
    var box = ctx.addBox;
    var cyl = ctx.addCyl;
    var tall = 2.4 + unit(q, r, 4) * 4.2 + level * 3.2;
    var wide = 2.6 + unit(q, r, 5) * 1.4 + level * 0.35;
    var roof = unit(q, r, 6) < 0.5 ? m.roof : m.slate;
    var wall = m["facade" + (Math.abs(q * 3 + r * 7) % 3)] || m.concrete;

    function windows(x, y, z, rows) {
      var i;
      for (i = 0; i < rows; i++) {
        box(group, m.cream, wide * 0.72, 0.12, 0.08, x, y + 0.7 + i * 0.85, z, 0);
      }
    }

    if (kind === "block") {
      box(group, wall, wide, tall, wide * 0.85, 0, th, 0, 0);
      box(group, roof, wide + 0.2, 0.2, wide * 0.9, 0, th + tall, 0, 0);
      windows(0, th + 0.4, wide * 0.44, 2 + level);
      if (unit(q, r, 8) < 0.7) {
        box(group, m.concrete, 1.4, tall * 0.45, 1.3, wide * 0.55, th, 0.4, 0);
      }
    } else if (kind === "houses") {
      var i;
      for (i = 0; i < 3; i++) {
        var hx = -1.8 + i * 1.8;
        var hh = 1.6 + unit(q + i, r, 9) * 1.1 + level * 1.05;
        box(group, wall, 1.5, hh, 1.6, hx, th, 0.2, 0);
        box(group, roof, 1.7, 0.35, 1.8, hx, th + hh, 0.2, 0);
      }
      box(group, m.grass, 1.2, 0.08, 1.2, 0, th, 2.1, 0);
    } else if (kind === "school") {
      box(group, m.concrete, 4.6, 2.2 + level * 0.95, 2.4, 0, th, -0.6, 0);
      box(group, roof, 4.8, 0.16, 2.6, 0, th + 2.2 + level * 0.95, -0.6, 0);
      box(group, m.grass, 3.2, 0.08, 2.2, 0, th, 1.8, 0);
      box(group, m.cream, 0.15, 1.4, 0.15, -1.2, th, 1.6, 0);
      box(group, m.cream, 0.15, 1.4, 0.15, 1.2, th, 1.6, 0);
    } else if (kind === "bakery") {
      box(group, m.cream, 3.2, 2.1, 2.4, 0, th, 0, 0);
      box(group, roof, 3.5, 0.45, 2.6, 0, th + 2.1, 0, 0);
      box(group, m.glass || m.steel, 1.6, 0.9, 0.08, 0, th + 0.4, 1.22, 0);
      box(group, m.bench || m.slate, 1.4, 0.08, 0.5, 1.8, th, 1.5, 0.2);
    } else if (kind === "clinic") {
      box(group, m.concrete, 4.2, 2.8 + level * 1.1, 3, 0, th, 0, 0);
      box(group, m.plus || m.cream, 0.9, 0.16, 0.16, 0, th + 3 + level * 1.1, 1.2, 0);
      box(group, m.plus || m.cream, 0.16, 0.9, 0.16, 0, th + 2.6 + level * 1.1, 1.2, 0);
    } else if (kind === "supermarket") {
      box(group, m.concrete, 5.2, 1.8, 3.4, -0.4, th, -0.2, 0);
      box(group, roof, 5.4, 0.12, 3.6, -0.4, th + 1.8, -0.2, 0);
      box(group, m.lot, 2.4, 0.06, 2.2, 2.2, th, 1.4, 0);
      box(group, m.car, 0.9, 0.28, 0.45, 1.6, th, 1.2, 0.3);
      box(group, m.car, 0.9, 0.28, 0.45, 2.6, th, 1.6, -0.2);
    } else if (kind === "solar") {
      cyl(group, m.lot, 3.2, 3.2, 0.1, 0, th, 0, 12);
      var row;
      var col;
      for (row = 0; row < 3; row++) {
        for (col = 0; col < 3; col++) {
          var pan = box(group, m.pv, 1.3, 0.08, 0.9, -1.8 + col * 1.5, th + 0.5, -1.6 + row * 1.2, 0);
          if (pan) {
            pan.rotation.x = -0.5;
          }
        }
      }
    } else if (kind === "wind") {
      cyl(group, m.steel, 0.16, 0.22, 6 + level, 0, th, 0, 8);
      box(group, m.cream, 0.12, 2.4, 0.35, 0, th + 6 + level, 0, 0);
      box(group, m.cream, 2.4, 0.12, 0.35, 0, th + 6 + level, 0, 0);
      cyl(group, m.lot, 2.4, 2.4, 0.08, 0, th, 0, 12);
    } else if (kind === "substation") {
      box(group, m.concrete, 3.4, 2.2 + level * 0.95, 2.6, -0.6, th, 0, 0);
      cyl(group, m.steel, 0.45, 0.45, 1.6, 1.6, th, 0.8, 10);
      cyl(group, m.steel, 0.35, 0.35, 1.3, 2.2, th, -0.6, 10);
      box(group, m.housing || m.slate, 3.6, 0.08, 0.08, 0.4, th + 2.6, 0.2, 0);
    } else if (kind === "datacenter") {
      var dh = 3.2 + level * 1.45;
      box(group, ctx.zone.variant === "secure" ? m.steel : m.slate, 5.2, dh, 3.2, 0, th, 0, 0);
      box(group, wall, 5.2, dh * 0.55, 0.1, 0, th + 0.4, 1.65, 0);
      box(group, m.steel, 1.2, 0.4, 0.8, -1.4, th + dh, 0.4, 0);
      box(group, m.steel, 1.2, 0.4, 0.8, 1.2, th + dh, -0.2, 0);
    } else if (kind === "depot") {
      /* Busbahnhof: Asphalt, Bahnsteig, Dach, Ausfahrt zur Straße (+Z). */
      box(group, m.asphalt || m.lot || m.slate, 5.6, 0.1, 5.2, 0, th, 0.15, 0);
      box(group, m.asphalt || m.lot || m.slate, 1.8, 0.08, 2.6, 0, th + 0.01, 3.35, 0);
      box(group, m.concrete, 4.8, 0.22, 1.1, 0, th, -1.55, 0);
      box(group, m.steel, 5.2, 0.1, 2.4, 0, th + 2.35, -0.2, 0);
      box(group, m.steel, 0.16, 2.2, 0.16, -2.3, th, -0.9, 0);
      box(group, m.steel, 0.16, 2.2, 0.16, 2.3, th, -0.9, 0);
      box(group, m.steel, 0.16, 2.2, 0.16, -2.3, th, 0.6, 0);
      box(group, m.steel, 0.16, 2.2, 0.16, 2.3, th, 0.6, 0);
      box(group, m.glass || m.cream, 1.8, 1.1, 1.2, -1.9, th, 1.7, 0.1);
      box(group, m.cream, 0.12, 1.5, 0.12, 1.6, th, 1.9, 0);
      box(group, m.cream, 0.7, 0.08, 0.5, 1.6, th + 1.55, 1.9, 0);
      box(group, m.mark || m.cream, 0.9, 0.03, 3.4, -1.1, th + 0.06, 0.4, 0);
      box(group, m.mark || m.cream, 0.9, 0.03, 3.4, 1.1, th + 0.06, 0.4, 0);
      if (level >= 1) {
        box(group, m.steel, 5.2, 0.1, 1.6, 0, th + 2.35, 1.4, 0);
      }
      if (level >= 2) {
        box(group, m.concrete, 2.2, 1.4, 1.4, 2.0, th, -1.8, 0);
      }
    } else if (kind === "garage") {
      /* Parkhaus: offene Etagen, Rampe, Solardach — kein Wohnhaus. */
      var floors = 2 + Math.min(2, level);
      var f;
      box(group, m.asphalt || m.lot || m.slate, 5.2, 0.08, 4.6, 0, th, 0.2, 0);
      for (f = 0; f < floors; f++) {
        box(group, m.concrete, 4.6, 0.14, 3.6, 0, th + 0.85 + f * 1.05, 0, 0);
        box(group, m.steel, 0.18, 0.95, 0.18, -2.15, th + f * 1.05, -1.6, 0);
        box(group, m.steel, 0.18, 0.95, 0.18, 2.15, th + f * 1.05, -1.6, 0);
        box(group, m.steel, 0.18, 0.95, 0.18, -2.15, th + f * 1.05, 1.6, 0);
        box(group, m.steel, 0.18, 0.95, 0.18, 2.15, th + f * 1.05, 1.6, 0);
      }
      box(group, m.asphalt || m.lot || m.slate, 1.4, 0.1, 2.2, 2.4, th + 0.05, 2.4, 0.35);
      box(group, m.pv || m.steel, 4.4, 0.08, 3.4, 0, th + floors * 1.05 + 0.2, 0, 0);
      box(group, m.gizmoLock || m.cream, 0.28, 0.65, 0.18, 1.9, th, 2.0, 0);
    } else if (kind === "hall") {
      box(group, wall, 4.4, 3.4 + level * 1.35, 3.6, 0, th, 0, 0);
      box(group, roof, 4.8, 0.7, 4, 0, th + 3.4 + level * 1.35, 0, 0);
      box(group, m.cream, 1.2, 1.6, 0.12, 0, th, 1.85, 0);
      cyl(group, m.steel, 0.08, 0.08, 2.2, -1.8, th + 3.2, -1.2, 6);
    } else if (kind === "lot") {
      /* Parkplatz: Asphalt, Trennlinien, Zufahrt — kein Haus. */
      box(group, m.asphalt || m.lot || m.slate, 5.5, 0.1, 5.0, 0, th, 0.1, 0);
      box(group, m.asphalt || m.lot || m.slate, 1.6, 0.08, 2.5, 0, th + 0.01, 3.25, 0);
      var mark = m.mark || m.cream;
      var bayN = 4;
      var span = 5.0;
      var pitch = span / bayN;
      var bay;
      box(group, mark, span + 0.2, 0.03, 0.07, 0, th + 0.07, -1.85, 0);
      box(group, mark, span + 0.2, 0.03, 0.07, 0, th + 0.07, 0.75, 0);
      for (bay = 0; bay <= bayN; bay++) {
        box(group, mark, 0.07, 0.03, 2.55, -span / 2 + bay * pitch, th + 0.07, -0.55, 0);
      }
      for (bay = 0; bay < 3; bay++) {
        box(group, m.car, 0.95, 0.3, 0.46, -1.9 + bay * 1.5, th + 0.08, -0.45, bay % 2 ? 0.06 : -0.05);
      }
      box(group, m.concrete, 1.15, 0.95 + level * 0.4, 1.05, -2.2, th, 1.85, 0);
      box(group, m.cream, 0.12, 1.35, 0.12, 2.1, th, 1.7, 0);
      box(group, m.cream, 0.55, 0.08, 0.4, 2.1, th + 1.4, 1.7, 0);
      if (level >= 1) {
        box(group, m.gizmoLock || m.cream, 0.25, 0.55, 0.2, 1.5, th, 2.0, 0);
        box(group, m.gizmoLock || m.cream, 0.25, 0.55, 0.2, 2.0, th, 2.3, 0);
      }
      if (level >= 2) {
        box(group, m.pv || m.steel, 2.2, 0.08, 1.4, 1.7, th + 1.7, 2.0, 0);
      }
    } else {
      box(group, m.lot, 4.4, 0.08, 3.2, 0, th, 0, 0);
      box(group, m.concrete, 1.6, 1.2, 1.4, -1.4, th, -0.4, 0);
      box(group, m.car, 1, 0.28, 0.45, 0.8, th, 0.6, 0.4);
      box(group, m.car, 1, 0.28, 0.45, 1.6, th, -0.8, -0.2);
    }
    if (ctx.dressDevices) {
      ctx.dressDevices();
    }
    return true;
  }

  Nexus.BoardKit = {
    archetype: archetype,
    build: build
  };
})(window.Nexus);
