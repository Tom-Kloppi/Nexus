window.Nexus = window.Nexus || {};

(function (Nexus) {
  var C = Nexus.CONSTANTS;
  var lastResourceSnapshot = null;
  var lastPlayerId = null;
  var lastScoreSnapshot = null;

  function formatNumber(value) {
    if (typeof value === "number" && value % 1 !== 0) {
      return String(Math.round(value * 10) / 10);
    }
    return String(value);
  }

  var DEFAULT_SCORE_KEYS = ["image", "comfort", "environment", "security"];
  /* Nur Darstellung: Schienenlänge der Stadtspuren, keine Regelgrenze */
  var TRACK_RAIL_MAX = 20;
  var DEFAULT_SCORE_LABELS = {
    image: "Image",
    comfort: "Komfort",
    environment: "Umwelt",
    security: "Sicherheit"
  };
  var DEFAULT_ZONE_VARIANTS = {
    energy: [
      { id: "solar", label: "Solar" },
      { id: "transformer", label: "Transformator" }
    ],
    datacenter: [
      { id: "insecure", label: "Unsicher" },
      { id: "secure", label: "Sicher" }
    ]
  };

  function scoreKeys() {
    return Nexus.SCORE_KEYS || Nexus.TRACK_KEYS || DEFAULT_SCORE_KEYS;
  }

  function scoreLabel(key) {
    var labels = Nexus.SCORE_LABELS || Nexus.TRACK_LABELS || DEFAULT_SCORE_LABELS;
    return labels[key] || key;
  }

  function zoneVariantsFor(type) {
    var fromData = Nexus.ZONE_VARIANTS && Nexus.ZONE_VARIANTS[type];
    if (fromData && fromData.length) {
      return fromData;
    }
    var typeDef = Nexus.ZONE_TYPES && Nexus.ZONE_TYPES[type];
    var ids = typeDef && typeDef.variants;
    if (ids && ids.length) {
      var catalog =
        type === "energy"
          ? Nexus.ENERGY_VARIANTS
          : type === "datacenter"
            ? Nexus.DATACENTER_VARIANTS
            : null;
      return ids.map(function (id) {
        return (catalog && catalog[id]) || { id: id, label: id };
      });
    }
    return DEFAULT_ZONE_VARIANTS[type] || [];
  }

  function tradeFallbackKey(preferred) {
    var keys = Nexus.RESOURCE_KEYS || [];
    if (preferred && keys.indexOf(preferred) !== -1) {
      return preferred;
    }
    return keys[0] || "energy";
  }

  function playerColor(player) {
    return Nexus.PLAYER_COLORS[player.colorIndex % Nexus.PLAYER_COLORS.length];
  }

  function setDigitGroup(el, value, animate) {
    if (!el) {
      return;
    }
    var str = String(value);
    el.classList.remove("is-animating");
    el.replaceChildren();
    var chars = str.split("");
    chars.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "t-digit";
      span.textContent = ch;
      if (i === chars.length - 2) {
        span.dataset.stagger = "1";
      } else if (i === chars.length - 1) {
        span.dataset.stagger = "2";
      }
      el.appendChild(span);
    });
    if (animate) {
      void el.offsetHeight;
      el.classList.add("is-animating");
    }
  }

  function chipsHtml(cost) {
    return Nexus.RESOURCE_KEYS.filter(function (key) {
      return (cost[key] || 0) > 0;
    })
      .map(function (key) {
        var label =
          (Nexus.RESOURCE_LABELS && Nexus.RESOURCE_LABELS[key]) ||
          (Nexus.RESOURCE_SHORT && Nexus.RESOURCE_SHORT[key]) ||
          key;
        return (
          '<span class="chip chip-' +
          key +
          '" title="' +
          label +
          '">' +
          ((Nexus.RESOURCE_ICONS && Nexus.RESOURCE_ICONS[key]) || "") +
          "<b>" +
          cost[key] +
          "</b></span>"
        );
      })
      .join("");
  }

  function bindCardFanOnce() {
    var root = document.getElementById("hand-fan");
    if (!root || root.dataset.hoverBound) {
      return;
    }
    root.dataset.hoverBound = "1";

    function num(name, fallback) {
      var value = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    }

    function ease(name, fallback) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    function avatars() {
      return Array.prototype.slice.call(root.querySelectorAll(".t-avatar"));
    }

    function setShifts(activeIdx, phase) {
      var lift = num("--avatar-lift", -42);
      var falloff = num("--avatar-falloff", 0.32);
      var scale = num("--avatar-scale", 1.08);
      var timing =
        phase === "out"
          ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
          : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
      avatars().forEach(function (el, i) {
        el.style.transitionTimingFunction = timing;
        if (activeIdx == null) {
          el.style.setProperty("--shift", "0px");
          el.style.setProperty("--scale-active", "1");
          el.style.removeProperty("--fan-rot-live");
          el.style.zIndex = "";
          return;
        }
        var distance = Math.abs(i - activeIdx);
        el.style.setProperty("--shift", (lift * Math.pow(falloff, distance)).toFixed(3) + "px");
        el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
        if (i === activeIdx) {
          el.style.setProperty("--fan-rot-live", "0deg");
          el.style.zIndex = "20";
        } else {
          el.style.removeProperty("--fan-rot-live");
          el.style.zIndex = String(10 - distance);
        }
      });
    }

    root.addEventListener("mouseover", function (event) {
      var item = event.target.closest(".t-avatar");
      if (!item || !root.contains(item)) {
        return;
      }
      if (event.relatedTarget && item.contains(event.relatedTarget)) {
        return;
      }
      var idx = avatars().indexOf(item);
      if (idx < 0) {
        return;
      }
      setShifts(idx, "in");
    });

    root.addEventListener("mouseout", function (event) {
      var item = event.target.closest(".t-avatar");
      if (!item) {
        return;
      }
      var next = event.relatedTarget;
      if (next && item.contains(next)) {
        return;
      }
      if (next && root.contains(next) && next.closest(".t-avatar")) {
        return;
      }
      setShifts(null, "out");
    });
  }

  function formatZoneYield(zone) {
    if (!zone || !zone.lastYield) {
      return "Noch nicht produziert";
    }
    if (zone.type === "home" && zone.lastYield.homeBundle) {
      return "+1 aller Ressourcen";
    }
    var yieldData = zone.lastYield;
    if (!yieldData.primary) {
      return "Noch nicht produziert";
    }
    var text =
      "+" + yieldData.primary.amount + " " + Nexus.RESOURCE_SHORT[yieldData.primary.resource];
    if (yieldData.secondary) {
      text +=
        " · +" +
        yieldData.secondary.amount +
        " " +
        Nexus.RESOURCE_SHORT[yieldData.secondary.resource];
    }
    return text;
  }

  function riskPips(count) {
    var html = "";
    var i;
    for (i = 0; i < count; i++) {
      html += '<span class="pip"></span>';
    }
    return html || '<span class="pip" style="opacity:0.15"></span>';
  }

  /* ==================== Stadt-Präsentation ====================
     Projektion: Bodenebene vertikal gestaucht (Axonometrie-Anmutung),
     Kacheln als Prisma mit Kantenhöhe, Gebäude als Körper mit fester
     Tiefenrichtung nach rechts-oben. Reine Darstellung, keine Regeln. */

  var VIEW = {
    squash: 0.6,
    thickness: 17,
    waterDrop: 8,
    decoRings: 1,
    depthX: 13,
    depthY: -10
  };

  var viewCache = null;

  function axialDistance(q, r) {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  function boardView() {
    if (viewCache) {
      return viewCache;
    }
    var size = C.HEX_SIZE;
    var playRadius = C.HEX_RADIUS;
    var sx = (size * Math.sqrt(3)) / 2;
    var sy = size * VIEW.squash;
    var padTop = sy + 68;
    var padBottom = sy + VIEW.thickness + 28;
    var padSide = sx + 18;
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;
    var raw = Nexus.allSlots(playRadius + VIEW.decoRings).map(function (slot) {
      var p = Nexus.axialToPixel(slot.q, slot.r, size);
      var tile = {
        q: slot.q,
        r: slot.r,
        key: slot.key,
        dist: axialDistance(slot.q, slot.r),
        x: p.x,
        y: p.y * VIEW.squash
      };
      minX = Math.min(minX, tile.x);
      maxX = Math.max(maxX, tile.x);
      minY = Math.min(minY, tile.y);
      maxY = Math.max(maxY, tile.y);
      return tile;
    });
    var ox = padSide - minX;
    var oy = padTop - minY;
    var fx0 = Infinity;
    var fx1 = -Infinity;
    var fy0 = Infinity;
    var fy1 = -Infinity;
    var tiles = raw.map(function (tile) {
      tile.x += ox;
      tile.y += oy;
      if (tile.dist <= playRadius) {
        fx0 = Math.min(fx0, tile.x);
        fx1 = Math.max(fx1, tile.x);
        fy0 = Math.min(fy0, tile.y);
        fy1 = Math.max(fy1, tile.y);
      }
      return tile;
    });
    tiles.sort(function (a, b) {
      return a.r !== b.r ? a.r - b.r : a.q - b.q;
    });
    viewCache = {
      size: size,
      sx: sx,
      sy: sy,
      thickness: VIEW.thickness,
      playRadius: playRadius,
      width: Math.ceil(maxX - minX + padSide * 2),
      height: Math.ceil(maxY - minY + padTop + padBottom),
      tiles: tiles,
      /* Sichtfenster: Spielfeld, Deko-Ring darf angeschnitten werden */
      focus: {
        x: fx0 - sx - 4,
        y: fy0 - sy - 34,
        w: fx1 - fx0 + sx * 2 + 8,
        h: fy1 - fy0 + sy * 2 + 50
      }
    };
    return viewCache;
  }

  /* ---- Geometrie-Helfer ---- */

  function n(value) {
    return Math.round(value * 10) / 10;
  }

  function pts(list) {
    return list
      .map(function (p) {
        return n(p[0]) + "," + n(p[1]);
      })
      .join(" ");
  }

  function poly(points, cls, extra) {
    return '<polygon class="' + cls + '" points="' + points + '"' + (extra || "") + "/>";
  }

  function rectPts(x, y, w, h) {
    return pts([
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h]
    ]);
  }

  function hexTopPts(cx, cy, sx, sy) {
    return pts([
      [cx, cy - sy],
      [cx + sx, cy - sy / 2],
      [cx + sx, cy + sy / 2],
      [cx, cy + sy],
      [cx - sx, cy + sy / 2],
      [cx - sx, cy - sy / 2]
    ]);
  }

  function hexSkirtPts(cx, cy, sx, sy, t) {
    return pts([
      [cx - sx, cy - sy / 2],
      [cx - sx, cy + sy / 2],
      [cx, cy + sy],
      [cx + sx, cy + sy / 2],
      [cx + sx, cy - sy / 2],
      [cx + sx, cy - sy / 2 + t],
      [cx + sx, cy + sy / 2 + t],
      [cx, cy + sy + t],
      [cx - sx, cy + sy / 2 + t],
      [cx - sx, cy - sy / 2 + t]
    ]);
  }

  function tileRandom(q, r, salt) {
    var h = (q + 32) * 73856093 ^ (r + 32) * 19349663 ^ (salt || 7) * 83492791;
    h = h >>> 0;
    return function () {
      h = (h * 1664525 + 1013904223) % 4294967296;
      return h / 4294967296;
    };
  }

  function pick(rand, list) {
    return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  }

  /* ---- Bau-Primitive ---- */

  function dropShadow(cx, baseY, w) {
    return (
      '<ellipse class="drop" cx="' +
      n(cx + 2) +
      '" cy="' +
      n(baseY + 1) +
      '" rx="' +
      n(w * 0.58) +
      '" ry="' +
      n(Math.max(2, w * 0.14)) +
      '"/>'
    );
  }

  function windowGrid(ax, ay, w, h, cols, rows, rand, litChance) {
    if (cols < 1 || rows < 1) {
      return "";
    }
    var padX = Math.max(2.5, w * 0.13);
    var ww = (w - padX * (cols + 1)) / cols;
    var padY = 3.4;
    var wh = Math.min(5.6, (h - padY * (rows + 1)) / rows);
    if (ww < 1.6 || wh < 1.6) {
      return "";
    }
    var out = "";
    var ri;
    var ci;
    for (ri = 0; ri < rows; ri++) {
      for (ci = 0; ci < cols; ci++) {
        var lit = rand() < (litChance === undefined ? 0.62 : litChance) ? " is-lit" : "";
        out +=
          '<rect class="win' +
          lit +
          '" x="' +
          n(ax + padX + ci * (ww + padX)) +
          '" y="' +
          n(ay - h + padY + ri * (wh + padY)) +
          '" width="' +
          n(ww) +
          '" height="' +
          n(wh) +
          '" rx="0.8"/>';
      }
    }
    return out;
  }

  /* Körper mit Front-, Seiten- und Dachflächen. ax/ay = vordere untere Ecke. */
  function building(ax, ay, w, h, opts) {
    opts = opts || {};
    var depth = opts.depth === undefined ? 1 : opts.depth;
    var dx = VIEW.depthX * depth;
    var dy = VIEW.depthY * depth;
    var top = ay - h;
    var roof = opts.roof || "flat";
    var out = '<g class="bld ' + (opts.cls || "w-cream r-terra") + '">';
    if (opts.shadow !== false) {
      out += dropShadow(ax + w / 2, ay, w + Math.abs(dx));
    }
    out += poly(
      pts([
        [ax + w, ay],
        [ax + w + dx, ay + dy],
        [ax + w + dx, top + dy],
        [ax + w, top]
      ]),
      "fc-side"
    );
    if (roof === "gable") {
      var rh = opts.roofH || Math.max(8, w * 0.38);
      var apex = [ax + w / 2, top - rh];
      out += poly(
        pts([
          [ax, top],
          apex,
          [apex[0] + dx, apex[1] + dy],
          [ax + dx, top + dy]
        ]),
        "rf-a"
      );
      out += poly(
        pts([
          apex,
          [ax + w, top],
          [ax + w + dx, top + dy],
          [apex[0] + dx, apex[1] + dy]
        ]),
        "rf-b"
      );
      out += poly(rectPts(ax, top, w, h), "fc-front");
      out += poly(
        pts([
          [ax, top],
          [ax + w, top],
          apex
        ]),
        "rf-front"
      );
    } else if (roof === "saw") {
      out += poly(
        pts([
          [ax, top],
          [ax + w, top],
          [ax + w + dx, top + dy],
          [ax + dx, top + dy]
        ]),
        "fc-top"
      );
      out += poly(rectPts(ax, top, w, h), "fc-front");
      var teeth = Math.max(2, Math.round(w / 14));
      var tw = w / teeth;
      var i;
      for (i = 0; i < teeth; i++) {
        out += poly(
          pts([
            [ax + i * tw + dx * 0.5, top + dy * 0.5],
            [ax + (i + 1) * tw + dx * 0.5, top + dy * 0.5],
            [ax + (i + 1) * tw + dx * 0.5, top + dy * 0.5 - 6]
          ]),
          "rf-b"
        );
      }
    } else {
      out += poly(
        pts([
          [ax, top],
          [ax + w, top],
          [ax + w + dx, top + dy],
          [ax + dx, top + dy]
        ]),
        "fc-top"
      );
      out += poly(rectPts(ax, top, w, h), "fc-front");
      if (opts.parapet !== false) {
        out += poly(rectPts(ax, top - 2.2, w, 2.4), "rf-a");
      }
    }
    if (opts.windows) {
      out += windowGrid(
        ax,
        ay,
        w,
        h,
        opts.windows.cols,
        opts.windows.rows,
        opts.rand || Math.random,
        opts.windows.lit
      );
    }
    if (opts.door) {
      out +=
        '<rect class="door" x="' +
        n(ax + w * 0.5 - 3) +
        '" y="' +
        n(ay - 8.5) +
        '" width="6" height="8.5" rx="1.4"/>';
    }
    out += poly(rectPts(ax, top, w, h), "fc-line");
    out += "</g>";
    return out;
  }

  function tree(x, groundY, scale, alt) {
    var s = scale || 1;
    return (
      '<g class="tree">' +
      dropShadow(x, groundY, 15 * s) +
      '<rect class="tree-trunk" x="' +
      n(x - 1.4 * s) +
      '" y="' +
      n(groundY - 9 * s) +
      '" width="' +
      n(2.8 * s) +
      '" height="' +
      n(9 * s) +
      '" rx="1"/>' +
      '<circle class="' +
      (alt ? "tree-crown-2" : "tree-crown") +
      '" cx="' +
      n(x) +
      '" cy="' +
      n(groundY - 13 * s) +
      '" r="' +
      n(7 * s) +
      '"/>' +
      '<circle class="' +
      (alt ? "tree-crown" : "tree-crown-2") +
      '" cx="' +
      n(x - 4 * s) +
      '" cy="' +
      n(groundY - 9.5 * s) +
      '" r="' +
      n(4.6 * s) +
      '"/>' +
      '<circle class="' +
      (alt ? "tree-crown" : "tree-crown-2") +
      '" cx="' +
      n(x + 4.2 * s) +
      '" cy="' +
      n(groundY - 10 * s) +
      '" r="' +
      n(4.2 * s) +
      '"/>' +
      "</g>"
    );
  }

  function streetLamp(x, groundY, h) {
    var height = h || 20;
    return (
      '<g class="lamp">' +
      '<ellipse class="lamp-glow" cx="' +
      n(x + 2) +
      '" cy="' +
      n(groundY + 2) +
      '" rx="24" ry="10" fill="url(#nx-glow)"/>' +
      '<path class="antenna" d="M' +
      n(x) +
      " " +
      n(groundY) +
      "V" +
      n(groundY - height) +
      "q0 -4 5 -4" +
      '"/>' +
      '<circle class="lamp-head" cx="' +
      n(x + 5.5) +
      '" cy="' +
      n(groundY - height - 3.4) +
      '" r="2.6"/>' +
      "</g>"
    );
  }

  function pvArray(x, groundY, w) {
    var h = 13;
    var lean = 9;
    var top = pts([
      [x, groundY],
      [x + w, groundY],
      [x + w + lean, groundY - h],
      [x + lean, groundY - h]
    ]);
    var out = '<g class="pv">' + dropShadow(x + w / 2 + 3, groundY + 1, w * 0.9);
    out += '<path class="antenna" d="M' + n(x + 3) + " " + n(groundY) + "l" + n(lean * 0.4) + " " + n(-h * 0.5) + '"/>';
    out += '<path class="antenna" d="M' + n(x + w - 3) + " " + n(groundY) + "l" + n(lean * 0.4) + " " + n(-h * 0.5) + '"/>';
    out += poly(top, "pv-panel");
    out += poly(
      pts([
        [x + lean, groundY - h],
        [x + lean + w * 0.42, groundY - h],
        [x + w * 0.42, groundY],
        [x, groundY]
      ]),
      "pv-shine"
    );
    out +=
      '<path class="pv-frame" d="M' +
      n(x + w * 0.33) +
      " " +
      n(groundY) +
      "l" +
      n(lean) +
      " " +
      n(-h) +
      "M" +
      n(x + w * 0.66) +
      " " +
      n(groundY) +
      "l" +
      n(lean) +
      " " +
      n(-h) +
      '"/>';
    out += "</g>";
    return out;
  }

  /* ---- Landnutzung ---- */

  var LAND_USE = {
    residential: { key: "residential", label: "Wohngebiet", swatch: "--lu-res-top" },
    "energy-solar": { key: "energy-solar", label: "Energie · Solar", swatch: "--lu-solar-top" },
    "energy-transformer": { key: "energy-transformer", label: "Energie · Transformator", swatch: "--lu-trafo-top" },
    "datacenter-insecure": { key: "datacenter-insecure", label: "Datenzentrum · offen", swatch: "--lu-dcopen-top" },
    "datacenter-secure": { key: "datacenter-secure", label: "Datenzentrum · sicher", swatch: "--lu-dcsafe-top" },
    traffic: { key: "traffic", label: "Verkehr", swatch: "--lu-traffic-top" },
    home: { key: "home", label: "Smart Home", swatch: "--lu-home-top" }
  };

  /* Legende nach Materialfamilie: die Variante liest man am Bau, nicht am Boden */
  var LEGEND_ROWS = [
    { label: "Wohngebiet", note: "Häuser, Gärten", top: "--lu-res-top", side: "--lu-res-side", glyph: "house" },
    { label: "Energie", note: "Solar · Transformator", top: "--lu-solar-top", side: "--lu-solar-side", glyph: "energy" },
    { label: "Datenzentrum", note: "offen · sicher", top: "--lu-dcopen-top", side: "--lu-dcopen-side", glyph: "data" },
    { label: "Verkehr", note: "Straße, Laternen", top: "--lu-traffic-top", side: "--lu-traffic-side", glyph: "road" },
    { label: "Smart Home", note: "dein Startfeld", top: "--lu-home-top", side: "--lu-home-side", glyph: "home" },
    { label: "Park & Wiese", note: "frei bebaubar", top: "--lu-grass-top", side: "--lu-grass-side", glyph: "tree" },
    { label: "Wasser", note: "Distriktgrenze", top: "--lu-water-top", side: "--lu-water-side", glyph: "wave" }
  ];

  var LEGEND_GLYPHS = {
    house: '<path d="M2 7 L7 3 L12 7 V12 H2 Z"/>',
    energy: '<path d="M7 1 L3.5 7.5 H6.5 L5.5 13 L10.5 6 H7.5 L9 1 Z"/>',
    data: '<path d="M2.5 2.5h9v3h-9z M2.5 6.5h9v3h-9z M2.5 10.5h9v2.5h-9z"/>',
    road: '<path d="M4 1 L2 13 H5.5 L6.3 1 Z M7.7 1 L8.5 13 H12 L10 1 Z"/>',
    home: '<path d="M7 1.5 L12.5 6 H11 V12.5 H3 V6 H1.5 Z"/>',
    tree: '<path d="M7 1 L11 8 H3 Z M6.2 8 h1.6 v5 h-1.6 z"/>',
    wave: '<path d="M1 5q3-2.2 6 0t6 0v2q-3 2.2-6 0t-6 0z"/>'
  };

  function landUseKey(zone) {
    if (!zone) {
      return "grass";
    }
    if (zone.variant && LAND_USE[zone.type + "-" + zone.variant]) {
      return zone.type + "-" + zone.variant;
    }
    if (zone.type === "energy") {
      return "energy-solar";
    }
    if (zone.type === "datacenter") {
      return "datacenter-insecure";
    }
    return zone.type;
  }

  /* Wohnhäuser: 2–3 Baukörper, Dachfarben aus der Palette */
  function artResidential(cx, cy, sy, rand) {
    var walls = ["w-cream", "w-sand", "w-clay", "w-mint"];
    var roofs = ["r-terra", "r-sage", "r-slate", "r-tile", "r-copper"];
    var lots = [
      { x: cx - 34, y: cy + sy * 0.34, w: 27, h: 15 + rand() * 7 },
      { x: cx + 2, y: cy + sy * 0.42, w: 24, h: 13 + rand() * 6 },
      { x: cx - 13, y: cy - sy * 0.04, w: 25, h: 18 + rand() * 10 }
    ];
    if (rand() < 0.35) {
      lots.splice(2, 1);
    }
    lots.sort(function (a, b) {
      return a.y - b.y;
    });
    var out = "";
    lots.forEach(function (lot, index) {
      var gable = rand() < 0.75;
      out += building(lot.x, lot.y, lot.w, lot.h, {
        cls: pick(rand, walls) + " " + pick(rand, roofs),
        roof: gable ? "gable" : "flat",
        roofH: 8 + rand() * 5,
        rand: rand,
        door: index === lots.length - 1,
        windows: { cols: 2, rows: lot.h > 22 ? 2 : 1, lit: 0.55 }
      });
    });
    out += tree(cx + 30, cy + sy * 0.3, 0.85, rand() < 0.5);
    if (rand() < 0.6) {
      out += tree(cx - 42, cy + sy * 0.06, 0.62, true);
    }
    return out;
  }

  function artSolar(cx, cy, sy, rand) {
    var out = "";
    out += pvArray(cx - 40, cy + sy * 0.42, 30);
    out += pvArray(cx - 4, cy + sy * 0.42, 30);
    out += pvArray(cx - 22, cy + sy * 0.02, 30);
    out += building(cx + 26, cy + sy * 0.12, 17, 12, {
      cls: "w-concrete r-flat",
      roof: "flat",
      rand: rand,
      windows: { cols: 1, rows: 1, lit: 0.4 }
    });
    return out;
  }

  function artTransformer(cx, cy, sy, rand) {
    var baseY = cy + sy * 0.4;
    var out = "";
    /* Gittermast */
    out +=
      '<path class="antenna" d="M' +
      n(cx + 22) +
      " " +
      n(baseY - 2) +
      "L" +
      n(cx + 29) +
      " " +
      n(baseY - 42) +
      "M" +
      n(cx + 40) +
      " " +
      n(baseY - 2) +
      "L" +
      n(cx + 33) +
      " " +
      n(baseY - 42) +
      "M" +
      n(cx + 24) +
      " " +
      n(baseY - 14) +
      "L" +
      n(cx + 38) +
      " " +
      n(baseY - 14) +
      "M" +
      n(cx + 26) +
      " " +
      n(baseY - 26) +
      "L" +
      n(cx + 36) +
      " " +
      n(baseY - 26) +
      "M" +
      n(cx + 22) +
      " " +
      n(baseY - 2) +
      "L" +
      n(cx + 38) +
      " " +
      n(baseY - 14) +
      "M" +
      n(cx + 40) +
      " " +
      n(baseY - 2) +
      "L" +
      n(cx + 24) +
      " " +
      n(baseY - 14) +
      "M" +
      n(cx + 24) +
      " " +
      n(baseY - 42) +
      "L" +
      n(cx + 38) +
      " " +
      n(baseY - 42) +
      '"/>';
    out += building(cx - 36, baseY, 40, 22, {
      cls: "w-concrete r-flat",
      roof: "flat",
      rand: rand,
      windows: { cols: 2, rows: 1, lit: 0.35 }
    });
    out +=
      '<rect class="warn-stripe" x="' +
      n(cx - 34) +
      '" y="' +
      n(baseY - 6) +
      '" width="36" height="3.2"/>';
    /* Trafo-Zylinder */
    out += dropShadow(cx + 6, baseY, 20);
    out +=
      '<rect class="steel" x="' +
      n(cx - 2) +
      '" y="' +
      n(baseY - 17) +
      '" width="11" height="17" rx="3"/>' +
      '<ellipse class="fc-top steel" cx="' +
      n(cx + 3.5) +
      '" cy="' +
      n(baseY - 17) +
      '" rx="5.5" ry="2.4"/>' +
      '<rect class="steel-dark" x="' +
      n(cx + 10) +
      '" y="' +
      n(baseY - 13) +
      '" width="8" height="13" rx="2.6"/>';
    return out;
  }

  function artDatacenter(cx, cy, sy, rand, secure) {
    var baseY = cy + sy * 0.4;
    var out = "";
    var i;
    if (secure) {
      out += building(cx - 24, baseY, 42, 32, {
        cls: "w-steel r-slate",
        roof: "flat",
        rand: rand,
        windows: { cols: 3, rows: 1, lit: 0.28 }
      });
      /* Kühlrippen auf dem Dach */
      for (i = 0; i < 3; i++) {
        out +=
          '<rect class="steel-dark" x="' +
          n(cx - 17 + i * 12) +
          '" y="' +
          n(baseY - 41) +
          '" width="8" height="8" rx="1.5"/>';
      }
      /* Sicherheitsplakette */
      out +=
        '<circle class="badge-disc" cx="' +
        n(cx + 2) +
        '" cy="' +
        n(baseY - 16) +
        '" r="7.5"/>' +
        '<path class="shield-badge" d="M' +
        n(cx - 2.5) +
        " " +
        n(baseY - 19.5) +
        "l4.5 -2 4.5 2v4q0 4 -4.5 6 -4.5 -2 -4.5 -6z" +
        '"/>';
      /* geschlossene Mauer davor */
      out +=
        '<rect class="steel" x="' +
        n(cx - 30) +
        '" y="' +
        n(baseY - 6) +
        '" width="56" height="6.5" rx="2"/>';
    } else {
      out += building(cx - 26, baseY, 44, 19, {
        cls: "w-slate r-flat",
        roof: "saw",
        rand: rand
      });
      /* Lüftungsschlitze statt Fenster */
      out +=
        '<path class="fc-line" d="M' +
        n(cx - 22) +
        " " +
        n(baseY - 13) +
        "h36M" +
        n(cx - 22) +
        " " +
        n(baseY - 9) +
        "h36M" +
        n(cx - 22) +
        " " +
        n(baseY - 5) +
        "h36" +
        '"/>';
      /* offener Zaun = ungesichert */
      out +=
        '<path class="cage" d="M' +
        n(cx - 34) +
        " " +
        n(baseY + 7) +
        "v-9h62v9" +
        '"/>';
      for (i = 0; i < 5; i++) {
        out +=
          '<path class="cage" d="M' +
          n(cx - 34 + i * 15.5) +
          " " +
          n(baseY + 7) +
          "v-9" +
          '"/>';
      }
      out +=
        '<ellipse class="lamp-glow" cx="' +
        n(cx + 16) +
        '" cy="' +
        n(baseY - 25) +
        '" rx="12" ry="9" fill="url(#nx-warn)"/>';
      out += '<path class="antenna" d="M' + n(cx + 16) + " " + n(baseY - 20) + "v-5" + '"/>';
      out += '<circle class="pip-warn" cx="' + n(cx + 16) + '" cy="' + n(baseY - 26) + '" r="2.8"/>';
    }
    return out;
  }

  function artTraffic(cx, cy, sx, sy, rand) {
    var half = 11;
    var out = "";
    out += poly(rectPts(cx - sx, cy - half - 3, sx * 2, 3), "kerb");
    out += poly(rectPts(cx - sx, cy + half, sx * 2, 3), "kerb");
    out += poly(rectPts(cx - sx, cy - half, sx * 2, half * 2), "asphalt");
    out +=
      '<path class="marking marking--dash" d="M' +
      n(cx - sx + 4) +
      " " +
      n(cy) +
      "H" +
      n(cx + sx - 4) +
      '"/>';
    var i;
    if (rand() < 0.45) {
      /* Zebrastreifen als Quartiers-Detail, nicht auf jedem Feld */
      for (i = 0; i < 4; i++) {
        out += poly(rectPts(cx + 22 + i * 5, cy - half + 1.5, 2.4, half * 2 - 3), "marking-solid");
      }
    }
    out += streetLamp(cx - 34, cy - half - 2, 20);
    out += streetLamp(cx + 8, cy - half - 2, 20);
    if (rand() < 0.8) {
      var carX = cx - 26 + rand() * 20;
      out += dropShadow(carX + 8, cy + half - 3, 18);
      out +=
        '<rect class="car-body" x="' +
        n(carX) +
        '" y="' +
        n(cy + half - 11) +
        '" width="17" height="6.5" rx="2.6"/>' +
        '<rect class="car-glass" x="' +
        n(carX + 4) +
        '" y="' +
        n(cy + half - 13.6) +
        '" width="8.5" height="3.6" rx="1.4"/>';
    }
    out += tree(cx + 38, cy - half - 6, 0.5, true);
    return out;
  }

  function artHome(cx, cy, sy, rand) {
    var baseY = cy + sy * 0.36;
    var out = "";
    out += building(cx - 24, baseY, 34, 24, {
      cls: "w-cream r-slate",
      roof: "gable",
      roofH: 13,
      rand: rand,
      door: true,
      windows: { cols: 2, rows: 2, lit: 0.8 }
    });
    out += building(cx + 12, baseY - 1, 18, 14, {
      cls: "w-mint r-sage",
      roof: "gable",
      roofH: 7,
      rand: rand,
      windows: { cols: 1, rows: 1, lit: 0.7 }
    });
    out +=
      '<path class="flag-pole" d="M' +
      n(cx - 30) +
      " " +
      n(baseY - 2) +
      "v-40" +
      '"/>' +
      poly(
        pts([
          [cx - 30, baseY - 42],
          [cx - 14, baseY - 38],
          [cx - 30, baseY - 33]
        ]),
        "flag-cloth"
      );
    out += tree(cx + 34, baseY - 2, 0.7, true);
    return out;
  }

  /* Parks und Wiesen sind Deko — keine Punkte, nur Lesbarkeit und Ruhe */
  function artPark(cx, cy, sy, rand) {
    var out = "";
    var pond = rand() < 0.45;
    if (pond) {
      out +=
        '<ellipse class="pond" cx="' +
        n(cx + 10) +
        '" cy="' +
        n(cy + sy * 0.26) +
        '" rx="21" ry="9"/>';
    } else {
      out +=
        '<path class="park-path" d="M' +
        n(cx - 36) +
        " " +
        n(cy + sy * 0.4) +
        "q20 -14 34 -4t34 -10" +
        '"/>';
    }
    var spots = [
      [cx - 26, cy + sy * 0.34, 0.95],
      [cx + 4, cy - sy * 0.12, 0.8],
      [cx + 26, cy + sy * 0.1, 0.66]
    ];
    spots.forEach(function (spot, index) {
      if (rand() < 0.14) {
        return;
      }
      out += tree(spot[0], spot[1], spot[2], index % 2 === 0);
    });
    return out;
  }

  function artMeadow(cx, cy, sy, rand) {
    var out = "";
    if (rand() < 0.45) {
      out += tree(cx - 16 + rand() * 30, cy + sy * 0.28, 0.6, rand() < 0.5);
    }
    if (rand() < 0.6) {
      out +=
        '<ellipse class="bush" cx="' +
        n(cx - 28 + rand() * 56) +
        '" cy="' +
        n(cy + sy * 0.1 + rand() * sy * 0.3) +
        '" rx="5.4" ry="3.2"/>';
    }
    if (rand() < 0.3) {
      out +=
        '<ellipse class="rock" cx="' +
        n(cx - 22 + rand() * 44) +
        '" cy="' +
        n(cy - sy * 0.18) +
        '" rx="4" ry="2.2"/>';
    }
    return out;
  }

  /* Wasser: kurze Kräusel-Striche statt Wellenlinien — ruhiger im Raster */
  function artWater(cx, cy, sx, sy, rand) {
    var rows = [-0.42, -0.1, 0.22, 0.5];
    var out =
      '<ellipse class="water-glint" cx="' +
      n(cx - sx * 0.1) +
      '" cy="' +
      n(cy - sy * 0.24) +
      '" rx="' +
      n(sx * 0.4) +
      '" ry="' +
      n(sy * 0.17) +
      '"/>';
    rows.forEach(function (ry, row) {
      var count = row === 0 || row === 3 ? 1 : 2;
      var i;
      for (i = 0; i < count; i++) {
        if (rand() < 0.3) {
          continue;
        }
        var len = 6 + rand() * 8;
        var wx = cx - sx * 0.45 + rand() * (sx * 0.9 - len);
        var wy = cy + sy * ry + rand() * 3;
        out +=
          '<line class="ripple" x1="' +
          n(wx) +
          '" y1="' +
          n(wy) +
          '" x2="' +
          n(wx + len) +
          '" y2="' +
          n(wy) +
          '"/>';
      }
    });
    return out;
  }

  function playerHasDatacenter(state, playerId) {
    var found = false;
    state.zones.forEach(function (z) {
      if (z.ownerId === playerId && z.type === "datacenter") {
        found = true;
      }
    });
    return found;
  }

  function cloudDeviceCount(player) {
    var count = 0;
    if (!player) {
      return 0;
    }
    Nexus.DEVICES.forEach(function (device) {
      if (player.devices[device.id] === "cloud") {
        count += 1;
      }
    });
    return count;
  }

  function zoneInspectYieldText(state, zone, viewerId) {
    if (!zone) {
      return "";
    }
    if (zone.type === "residential" && viewerId && !playerHasDatacenter(state, viewerId)) {
      return "Erwartet: Bandbreite 0 — kein eigenes Datenzentrum";
    }
    if (zone.type === "energy" && zone.variant === "transformer") {
      var per = Nexus.CONSTANTS.TRANSFORMER_MONEY_PER_ENERGY || 1;
      return "Stabil: Energie · −" + per + " Geld pro Einheit beim Ernten";
    }
    if (zone.type === "energy" && zone.variant === "solar") {
      return "Solar: Würfel-Energie (variabel) · Umwelt +1 beim Bau";
    }
    if (zone.type === "datacenter" && zone.variant === "insecure") {
      return "Bandbreite + Risiko — Gate für Wohn-Bandbreite";
    }
    return formatZoneYield(zone);
  }

  function dieWeightTotal() {
    return Nexus.PRODUCTION_DICE.reduce(function (sum, die) {
      return sum + die.weight;
    }, 0);
  }

  function dieSettleRatio(dieId) {
    var total = dieWeightTotal();
    var before = 0;
    var width = 0;
    Nexus.PRODUCTION_DICE.forEach(function (die) {
      if (die.id === dieId) {
        before = total;
        width = die.weight;
      }
      total += die.weight;
    });
    return (before + width / 2) / total;
  }

  function openModal(shell) {
    if (!shell) {
      return;
    }
    shell.hidden = false;
    var card = shell.querySelector(".t-modal");
    shell.classList.remove("is-closing");
    if (card) {
      card.classList.remove("is-closing");
    }
    requestAnimationFrame(function () {
      shell.classList.add("is-open");
      if (card) {
        card.classList.add("is-open");
      }
    });
  }

  function closeModal(shell, done) {
    if (!shell || shell.hidden) {
      if (done) {
        done();
      }
      return;
    }
    var card = shell.querySelector(".t-modal");
    shell.classList.remove("is-open");
    shell.classList.add("is-closing");
    if (card) {
      card.classList.remove("is-open");
      card.classList.add("is-closing");
    }
    var ms =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")) ||
      150;
    setTimeout(function () {
      shell.classList.remove("is-closing");
      if (card) {
        card.classList.remove("is-closing");
      }
      shell.hidden = true;
      if (done) {
        done();
      }
    }, ms);
  }

  var toastBanners = [];
  var toastSpreadBound = false;

  function toastMs(name, fallback) {
    var value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function bindToastSpreadOnce() {
    var stack = document.getElementById("toast-stack");
    if (!stack || toastSpreadBound) {
      return;
    }
    toastSpreadBound = true;
    var spreadHeight = function () {
      return (stack.offsetHeight + toastMs("--stack-spread-gap", 8)) * 2;
    };
    var within = function (event, above) {
      var rect = stack.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY <= rect.bottom &&
        event.clientY >= rect.top - above
      );
    };
    document.addEventListener("pointermove", function (event) {
      if (stack.classList.contains("is-spread")) {
        if (!within(event, spreadHeight())) {
          stack.classList.remove("is-spread");
        }
      } else if (within(event, 0)) {
        stack.classList.add("is-spread");
      }
    });
  }

  function dismissToastBanner(el) {
    if (!el || el.classList.contains("is-leaving")) {
      return;
    }
    el.classList.add("is-leaving");
    setTimeout(function () {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      toastBanners = toastBanners.filter(function (item) {
        return item !== el;
      });
      toastBanners.forEach(function (banner, index) {
        if (!banner.classList.contains("is-leaving")) {
          banner.setAttribute("data-depth", String(index));
        }
      });
    }, toastMs("--stack-close", 250) + 60);
  }

  function pushToast(text) {
    var stack = document.getElementById("toast-stack");
    if (!stack || !text) {
      return;
    }
    bindToastSpreadOnce();
    var el = document.createElement("div");
    el.className = "t-stack-banner is-enter";
    el.setAttribute("data-depth", "0");
    el.textContent = text;
    toastBanners.unshift(el);
    stack.appendChild(el);
    toastBanners.forEach(function (banner, index) {
      if (index === 0) {
        return;
      }
      if (index > 2) {
        dismissToastBanner(banner);
      } else {
        banner.setAttribute("data-depth", String(index));
      }
    });
    toastBanners = toastBanners.slice(0, 3).concat(
      toastBanners.slice(3).filter(function (banner) {
        return banner.classList.contains("is-leaving");
      })
    );
    void el.offsetWidth;
    el.classList.remove("is-enter");
    setTimeout(function () {
      dismissToastBanner(el);
    }, 3200);
  }

  function renderTurnRow(state) {
    var row = document.getElementById("turn-row");
    if (!row) {
      return;
    }
    row.innerHTML = state.players
      .map(function (player, index) {
        var zoneCount = Nexus.playerZones(state, player.id).length;
        var role = Nexus.ROLES_BY_ID[player.roleId];
        var alignment = role ? role.alignment : "—";
        var standardLabel =
          player.standardsChoice === "open"
            ? " · Offen"
            : player.standardsChoice === "proprietary"
              ? " · Prop."
              : "";
        var colorName = Nexus.PLAYER_COLOR_NAMES[player.colorIndex % Nexus.PLAYER_COLOR_NAMES.length];
        var isActive =
          index === state.currentPlayerIndex &&
          state.turnPhase !== "gameover" &&
          !Nexus.isHotSeatShield(state);
        return (
          '<button type="button" class="turn-chip' +
          (isActive ? " is-active" : "") +
          '" style="--player-color:' +
          playerColor(player) +
          '" data-player-id="' +
          player.id +
          '" title="' +
          player.name +
          " · " +
          colorName +
          " · " +
          alignment +
          " · " +
          zoneCount +
          " Zone" +
          (zoneCount === 1 ? "" : "n") +
          '">' +
          '<span class="turn-avatar">' +
          (index + 1) +
          "</span>" +
          '<span class="turn-meta">' +
          '<span class="turn-name">' +
          player.name +
          "</span>" +
          '<span class="turn-alignment">' +
          alignment +
          standardLabel +
          "</span></span></button>"
        );
      })
      .join("");
  }

  function renderGoalPanel(state) {
    var panel = document.getElementById("goal-panel");
    var pill = document.getElementById("goal-pill");
    var tracks = document.getElementById("score-tracks");
    var tracksCard = document.getElementById("tracks-card");
    if (!panel || !pill) {
      return;
    }
    function hideTracks() {
      if (tracksCard) {
        tracksCard.hidden = true;
      }
      if (tracks) {
        tracks.innerHTML = "";
      }
    }
    if (Nexus.isHotSeatShield(state)) {
      panel.hidden = true;
      pill.hidden = true;
      hideTracks();
      return;
    }
    var player = Nexus.currentPlayer(state);
    var progress = Nexus.computeRoleProgress(state, player);
    if (!progress.role) {
      panel.hidden = true;
      pill.hidden = true;
      hideTracks();
      return;
    }
    panel.hidden = false;
    pill.hidden = false;
    document.getElementById("goal-role-name").textContent = progress.role.name;
    document.getElementById("goal-total").textContent = progress.totalPercent + "%";
    document.getElementById("stat-goal-total").textContent = progress.totalPercent;
    var ring = document.getElementById("goal-total-ring");
    if (ring) {
      ring.style.setProperty("--pct", String(Math.min(100, progress.totalPercent)));
    }
    var pillFill = document.getElementById("goal-pill-fill");
    if (pillFill) {
      pillFill.style.width = Math.min(100, progress.totalPercent) + "%";
    }

    if (tracks) {
      var scores = player.scores || {};
      var scoreChanged = false;
      if (!lastScoreSnapshot || lastPlayerId !== player.id) {
        lastScoreSnapshot = {};
      }
      if (tracksCard) {
        tracksCard.hidden = false;
      }
      tracks.innerHTML = scoreKeys()
        .map(function (key) {
          var value = scores[key];
          if (value == null) {
            value = 0;
          }
          if (lastScoreSnapshot[key] !== value) {
            scoreChanged = true;
          }
          lastScoreSnapshot[key] = value;
          var fill = Math.max(0, Math.min(100, (value / TRACK_RAIL_MAX) * 100));
          return (
            '<div class="score-track track-' +
            key +
            '"><span class="track-label">' +
            scoreLabel(key) +
            '</span><span class="track-rail"><i style="width:' +
            n(fill) +
            '%"></i></span><strong class="t-digit-group">' +
            value +
            "</strong></div>"
          );
        })
        .join("");
      if (scoreChanged) {
        Array.prototype.forEach.call(tracks.querySelectorAll(".t-digit-group"), function (el) {
          setDigitGroup(el, el.textContent, true);
        });
      }
    }

    var roleDef = progress.role;
    document.getElementById("goal-list").innerHTML = progress.subGoals
      .map(function (goal, index) {
        var subDef = roleDef.subGoals[index];
        var metricText = Nexus.formatMetricValue(subDef, goal.metricValue);
        var hint = Nexus.nextStepHint(subDef, goal.metricValue, state.players.length);
        var bar = Math.round((goal.currentPercent / goal.maxContribution) * 100);
        return (
          '<li class="goal-item">' +
          '<div class="goal-item-head">' +
          "<span>" +
          goal.label +
          "</span>" +
          "<strong>" +
          goal.currentPercent +
          "%</strong>" +
          "</div>" +
          '<div class="goal-bar"><span style="width:' +
          bar +
          '%"></span></div>' +
          '<p class="goal-meta">Wert: ' +
          metricText +
          " · " +
          hint +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderRoleRevealModal(state) {
    var shell = document.getElementById("role-reveal-modal");
    if (!shell) {
      return;
    }
    var shouldOpen = state.turnPhase === "role_reveal";
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var player = Nexus.roleRevealPlayer(state);
    if (!player) {
      return;
    }
    var role = Nexus.ROLES_BY_ID[player.roleId];
    var progress = Nexus.computeRoleProgress(state, player);
    document.getElementById("role-reveal-player").textContent = player.name;
    document.getElementById("role-reveal-hint").textContent =
      state.roleRevealIndex < state.players.length - 1
        ? "Nur du darfst dein Wahlversprechen sehen. Gib das Gerät an den nächsten Stadtteilmanager weiter."
        : "Das war das letzte Wahlversprechen. Danach beginnt Spieler 1.";
    var okBtn = document.getElementById("btn-role-reveal-ok");
    okBtn.textContent =
      state.roleRevealIndex < state.players.length - 1 ? "Verstanden – weiter" : "Spiel beginnen";
    document.getElementById("role-reveal-body").innerHTML =
      '<p class="role-alignment-pill">' +
      role.alignment +
      " · " +
      role.name +
      "</p>" +
      '<p class="role-reveal-label">Wahlversprechen</p>' +
      progress.subGoals
        .map(function (goal, index) {
          var subDef = role.subGoals[index];
          return (
            '<div class="role-reveal-goal">' +
            "<strong>" +
            goal.label +
            "</strong>" +
            "<span>max. " +
            goal.maxContribution +
            "% · " +
            Nexus.nextStepHint(subDef, goal.metricValue, state.players.length) +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderHandoffModal(state) {
    var shell = document.getElementById("handoff-modal");
    if (!shell) {
      return;
    }
    var shouldOpen = state.turnPhase === "handoff";
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var player = Nexus.currentPlayer(state);
    if (!player) {
      return;
    }
    var owned = Nexus.playerZones(state, player.id).length;
    var factories = Nexus.playerFactoryZones(state, player.id).length;
    document.getElementById("handoff-player").textContent = player.name + " ist dran";
    document.getElementById("handoff-hint").textContent =
      owned === 0
        ? "Du besitzt noch keine Felder. Die Produktion wird übersprungen."
        : factories === 0
          ? "Nur dein Home produziert in dieser Runde (+1 aller Ressourcen). Danach kannst du den Startcoupon einlösen."
          : "Nur du darfst dein Wahlversprechen und deine Ressourcen sehen. Wenn du bereit bist, startet die Produktion.";
    document.getElementById("btn-handoff-ok").textContent = "Ich bin " + player.name;
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderPublicPlayerModal(state, ui) {
    var shell = document.getElementById("public-player-modal");
    if (!shell) {
      return;
    }
    var shouldOpen =
      !!(ui && ui.inspectedPlayerId) &&
      !Nexus.isHotSeatShield(state) &&
      state.turnPhase !== "gameover";
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var view = Nexus.getPublicPlayerView(state, ui.inspectedPlayerId);
    if (!view) {
      closeModal(shell);
      return;
    }
    var standardText =
      view.standardsChoice === "proprietary" ? "Proprietäres System" : "Offener Standard";
    document.getElementById("public-player-name").textContent = view.name;
    document.getElementById("public-player-meta").textContent =
      view.alignment +
      " · " +
      standardText +
      " · " +
      view.zoneCount +
      " Zone" +
      (view.zoneCount === 1 ? "" : "n") +
      " · SAE " +
      view.saeLevel +
      "/5";
    var grid = document.getElementById("public-player-devices");
    if (!view.devices.length) {
      grid.innerHTML = '<p class="hand-empty">Keine Cloud-Geräte sichtbar.</p>';
    } else {
      grid.innerHTML = view.devices
        .map(function (device) {
          return (
            '<div class="public-device">' +
            '<span class="public-device-icon">' +
            Nexus.DEVICE_ICONS[device.id] +
            "</span>" +
            "<strong>" +
            device.shortName +
            "</strong>" +
            "<small>Cloud</small>" +
            "</div>"
          );
        })
        .join("");
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderWallet(state) {
    var player = Nexus.currentPlayer(state);
    if (Nexus.isHotSeatShield(state)) {
      Nexus.RESOURCE_KEYS.forEach(function (key) {
        setDigitGroup(document.getElementById("res-" + key), "–", false);
        var expect = document.getElementById("expect-" + key);
        if (expect) {
          expect.textContent = "";
        }
      });
      setDigitGroup(document.getElementById("stat-round"), state.round > state.maxRounds ? state.maxRounds : state.round, false);
      document.querySelector(".day-max").textContent = "/ " + state.maxRounds;
      setDigitGroup(document.getElementById("stat-risk"), "–", false);
      lastResourceSnapshot = null;
      lastPlayerId = null;
      return;
    }
    var expected = Nexus.expectedByResource(state);
    var playerChanged = lastPlayerId !== player.id;
    Nexus.RESOURCE_KEYS.forEach(function (key) {
      var el = document.getElementById("res-" + key);
      var changed = !playerChanged && lastResourceSnapshot && lastResourceSnapshot[key] !== player.resources[key];
      setDigitGroup(el, player.resources[key], changed);
      var expect = document.getElementById("expect-" + key);
      if (expect) {
        expect.textContent = "~" + formatNumber(expected[key]);
      }
    });
    setDigitGroup(document.getElementById("stat-round"), state.round > state.maxRounds ? state.maxRounds : state.round, false);
    document.querySelector(".day-max").textContent = "/ " + state.maxRounds;
    var riskChanged =
      !lastResourceSnapshot || lastPlayerId !== player.id || lastResourceSnapshot.__risk !== player.risk;
    setDigitGroup(document.getElementById("stat-risk"), player.risk, riskChanged);
    document.getElementById("risk-meter").style.setProperty("--risk", Math.min(20, player.risk));
    lastResourceSnapshot = Object.assign({}, player.resources);
    lastResourceSnapshot.__risk = player.risk;
    lastPlayerId = player.id;
  }

  /* Öffentliche Cloud-Geräte als Sockel-Chips, lokale nur für die Besitzerin */
  function homeDevicePips(owner, cx, baseY, publicOnly) {
    if (!owner) {
      return "";
    }
    var built = [];
    Nexus.DEVICES.forEach(function (device) {
      var mode = owner.devices[device.id];
      if (!mode) {
        return;
      }
      if (publicOnly && mode !== "cloud") {
        return;
      }
      built.push({ name: device.shortName, mode: mode });
    });
    if (!built.length) {
      return "";
    }
    var cols = Math.min(5, built.length);
    var gap = 7.5;
    var startX = cx - ((cols - 1) * gap) / 2;
    var out =
      '<rect class="pip-plinth" x="' +
      n(startX - 6) +
      '" y="' +
      n(baseY - 1) +
      '" width="' +
      n((cols - 1) * gap + 12) +
      '" height="' +
      n(4 + Math.ceil(built.length / cols) * 6) +
      '" rx="2.5"/>';
    out += built
      .map(function (item, index) {
        var col = index % cols;
        var row = Math.floor(index / cols);
        return (
          '<circle class="pip-' +
          item.mode +
          '" cx="' +
          n(startX + col * gap) +
          '" cy="' +
          n(baseY + 3 + row * 6) +
          '" r="2.6"><title>' +
          item.name +
          (item.mode === "cloud" ? " · Cloud" : " · Lokal") +
          "</title></circle>"
        );
      })
      .join("");
    return out;
  }

  function boardDefs() {
    return (
      "<defs>" +
      '<linearGradient id="nx-light" x1="0.1" y1="0" x2="0.75" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>' +
      '<stop offset="62%" stop-color="#ffffff" stop-opacity="0.04"/>' +
      '<stop offset="100%" stop-color="#000000" stop-opacity="0.07"/>' +
      "</linearGradient>" +
      '<radialGradient id="nx-glow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#ffdf9e" stop-opacity="0.8"/>' +
      '<stop offset="55%" stop-color="#ffd07a" stop-opacity="0.3"/>' +
      '<stop offset="100%" stop-color="#ffc864" stop-opacity="0"/>' +
      "</radialGradient>" +
      '<radialGradient id="nx-warn" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#ff8a6a" stop-opacity="0.85"/>' +
      '<stop offset="100%" stop-color="#ff6a4a" stop-opacity="0"/>' +
      "</radialGradient>" +
      '<radialGradient id="nx-island" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#0b1a12" stop-opacity="0.3"/>' +
      '<stop offset="100%" stop-color="#0b1a12" stop-opacity="0"/>' +
      "</radialGradient>" +
      "</defs>"
    );
  }

  function rollChip(cx, cy, zone, staggerMs) {
    var barW = 46;
    var barH = 9;
    var barX = cx - barW / 2;
    var barY = cy - 7;
    var total = dieWeightTotal();
    var cursor = barX;
    var bands = "";
    Nexus.PRODUCTION_DICE.forEach(function (die) {
      var w = (die.weight / total) * barW;
      bands +=
        '<rect x="' +
        n(cursor) +
        '" y="' +
        n(barY) +
        '" width="' +
        n(w) +
        '" height="' +
        barH +
        '" fill="' +
        die.color +
        '" rx="1.5"/>';
      cursor += w;
    });
    var settle = zone.lastDieId ? dieSettleRatio(zone.lastDieId) : 0.5;
    return (
      '<g class="roll-chip">' +
      '<rect class="roll-chip-bg" x="' +
      n(barX - 4) +
      '" y="' +
      n(barY - 4) +
      '" width="' +
      n(barW + 8) +
      '" height="' +
      n(barH + 8) +
      '" rx="6"/>' +
      bands +
      '<g transform="translate(' +
      n(barX) +
      "," +
      n(barY) +
      ')"><g class="gacha-needle" style="--settle-x:' +
      n(settle * barW) +
      "px;--bar-w:" +
      barW +
      "px;--spin-delay:" +
      staggerMs +
      'ms"><polygon class="roll-chip-mark" points="-4,-6 4,-6 0,5"/></g></g>' +
      "</g>"
    );
  }

  function yieldPop(cx, cy, zone) {
    var data = zone.lastYield;
    if (!data) {
      return "";
    }
    var label;
    var iconKey;
    if (zone.type === "home" && data.homeBundle) {
      label = "+1 alle";
      iconKey = "money";
    } else if (data.primary) {
      label = (data.primary.amount >= 0 ? "+" : "") + data.primary.amount;
      iconKey = data.primary.resource;
    } else {
      return "";
    }
    var w = label.length > 3 ? 56 : 44;
    var top = cy - 26;
    return (
      '<g class="yield-pop" style="--reveal-delay:' +
      (zone.revealDelay || 0) +
      'ms">' +
      '<rect class="yield-pop-bg" x="' +
      n(cx - w / 2) +
      '" y="' +
      n(top) +
      '" width="' +
      w +
      '" height="21" rx="10.5"/>' +
      '<g transform="translate(' +
      n(cx - w / 2 + 5) +
      "," +
      n(top + 4) +
      ') scale(0.56)">' +
      Nexus.iconGroup(iconKey, "currentColor") +
      "</g>" +
      '<text class="yield-pop-text" x="' +
      n(cx + 7) +
      '" y="' +
      n(top + 15.5) +
      '">' +
      label +
      "</text>" +
      "</g>"
    );
  }

  function tileMarkup(state, ui, view, tile, player, ctx) {
    var cx = tile.x;
    var cy = tile.y;
    var sx = view.sx;
    var sy = view.sy;
    var isDeco = tile.dist > view.playRadius;
    var zone = isDeco ? null : Nexus.zoneAt(state, tile.q, tile.r);
    var rand = tileRandom(tile.q, tile.r, 11);
    var classes = ["tile"];
    var attrs = "";
    var style = "";
    var thickness = view.thickness;
    var art = "";
    var overlay = "";
    var title = "";
    var use;

    if (isDeco) {
      use = "water";
      cy += VIEW.waterDrop;
      thickness = 9;
      classes.push("tile--water");
      art = artWater(cx, cy, sx, sy, rand);
    } else if (zone) {
      use = landUseKey(zone);
      var owner = state.players.filter(function (p) {
        return p.id === zone.ownerId;
      })[0];
      var isMine = zone.ownerId === player.id;
      var isHome = zone.type === "home";
      classes.push("tile--" + use);
      classes.push("is-clickable");
      classes.push(isMine ? "is-mine" : "is-foreign");
      classes.push(isHome ? "hex-home" : "hex-owned");
      style += "--owner-color:" + playerColor(owner) + ";";
      attrs +=
        ' data-mine="' +
        (isMine ? "1" : "0") +
        '"' +
        (isHome
          ? ' data-home="' + zone.id + '" data-owner="' + zone.ownerId + '"'
          : ' data-zone="' + zone.id + '"');
      title =
        (Nexus.ZONE_TYPES[zone.type] || {}).label +
        (zone.variant ? " · " + zone.variant : "") +
        " · " +
        (owner ? owner.name : "");
      if (ctx.spinning[zone.id]) {
        classes.push("is-spinning");
      }
      if (ui && ui.inspectedZoneId === zone.id) {
        classes.push("is-selected");
      }
      if (isHome && isMine && ui && ui.homeOpen) {
        classes.push("is-selected");
      }
      if (ctx.placePopId === zone.id) {
        classes.push("is-place-pop");
      }
      if (isHome) {
        art = artHome(cx, cy, sy, rand);
        overlay += homeDevicePips(owner, cx, cy + sy * 0.46, !isMine);
      } else if (use === "residential") {
        art = artResidential(cx, cy, sy, rand);
      } else if (use === "energy-solar") {
        art = artSolar(cx, cy, sy, rand);
      } else if (use === "energy-transformer") {
        art = artTransformer(cx, cy, sy, rand);
      } else if (use === "datacenter-secure") {
        art = artDatacenter(cx, cy, sy, rand, true);
      } else if (use === "datacenter-insecure") {
        art = artDatacenter(cx, cy, sy, rand, false);
      } else if (use === "traffic") {
        art = artTraffic(cx, cy, sx, sy, rand);
      }
      if (ctx.spinning[zone.id]) {
        overlay += rollChip(cx, cy - sy * 0.75, zone, ctx.stagger[zone.id] || 0);
      } else if (ctx.showYield && isMine && zone.lastYield) {
        overlay += yieldPop(cx, cy - sy * 0.7, zone);
      }
    } else {
      var expandable =
        Nexus.isExpandableSlot(state, tile.q, tile.r) && state.turnPhase === "build";
      var affordable = expandable && Nexus.canAffordExpandSlot(state, tile.q, tile.r);
      use = tile.dist <= 1 ? "park" : "grass";
      classes.push("tile--" + use);
      classes.push("g-" + (1 + Math.floor(rand() * 3)));
      art = use === "park" ? artPark(cx, cy, sy, rand) : artMeadow(cx, cy, sy, rand);
      if (expandable) {
        classes.push("tile--open", "hex-empty", "is-open", "is-clickable");
        if (affordable) {
          classes.push("tile--affordable", "is-buyable", "is-coupon-pulse");
        }
        attrs += ' data-q="' + tile.q + '" data-r="' + tile.r + '"';
        title = affordable ? "Freies Feld — bebaubar" : "Freies Feld";
        overlay +=
          '<g class="plus-pin">' +
          '<path class="antenna" d="M' +
          n(cx) +
          " " +
          n(cy + 2) +
          "V" +
          n(cy - 14) +
          '"/>' +
          '<circle class="plus-pin-body" cx="' +
          n(cx) +
          '" cy="' +
          n(cy - 25) +
          '" r="10.5"/>' +
          '<text class="plus-pin-glyph" x="' +
          n(cx) +
          '" y="' +
          n(cy - 19.5) +
          '">+</text>' +
          "</g>";
      }
      if (ui && ui.expandSlot && ui.expandSlot.q === tile.q && ui.expandSlot.r === tile.r) {
        classes.push("is-selected");
      }
    }

    var inner =
      poly(hexSkirtPts(cx, cy, sx, sy, thickness), "tile-skirt") +
      poly(hexTopPts(cx, cy, sx, sy), "tile-top") +
      poly(hexTopPts(cx, cy, sx, sy), "tile-light", ' fill="url(#nx-light)"');
    if (zone) {
      inner +=
        poly(hexTopPts(cx, cy, sx * 0.965, sy * 0.965), "tile-owner-ring") +
        poly(hexTopPts(cx, cy, sx * 0.9, sy * 0.9), "tile-owner-ring-inner");
    }
    inner += art + overlay;
    inner += poly(hexTopPts(cx, cy, sx, sy), "tile-hit");

    return (
      '<g class="' +
      classes.join(" ") +
      '"' +
      attrs +
      (style ? ' style="' + style + '"' : "") +
      ">" +
      (title ? "<title>" + title + "</title>" : "") +
      inner +
      "</g>"
    );
  }

  function coachText(state, player) {
    var factoryCount = Nexus.playerFactoryZones(state, player.id).length;
    var ownedCount = Nexus.playerZones(state, player.id).length;
    if (state.turnPhase === "handoff") {
      return "Gerät an <b>" + player.name + "</b> weitergeben — Bildschirm bleibt verdeckt.";
    }
    if (state.turnPhase === "role_reveal") {
      return "Wahlversprechen werden einzeln gezeigt — nur die Person am Gerät liest mit.";
    }
    if (state.turnPhase === "produce" || state.turnPhase === "spinning") {
      if (ownedCount === 0) {
        return player.name + ": keine Felder — Produktion wird übersprungen.";
      }
      if (factoryCount === 0) {
        return player.name + ": <b>Home</b> liefert +1 aller Ressourcen …";
      }
      return player.name + ": Produktion läuft — Solarfelder würfeln, Transformatoren zahlen.";
    }
    if (state.turnPhase === "event") {
      return player.name + ": ein Ereignis wartet.";
    }
    if (state.turnPhase === "build") {
      if ((player.freeZoneClaims || 0) > 0) {
        return (
          "<b>Startcoupon:</b> ein Nachbarfeld (+) ist gratis. Wohnen bringt erst mit eigenem Datenzentrum Bandbreite."
        );
      }
      if (state.round <= 1 && factoryCount <= 1) {
        return "<b>Erste Erweiterung:</b> Solar würfelt, Transformator zahlt Geld pro Energie — Datenzentrum schaltet Wohn-Bandbreite frei.";
      }
      return "Feld antippen für Details · eigenes Home öffnet die Geräte · dann Zug beenden.";
    }
    return "";
  }

  function renderLegend() {
    var list = document.querySelector("#board-legend .legend-list");
    if (!list || list.childElementCount) {
      return;
    }
    list.innerHTML = LEGEND_ROWS.map(function (row) {
      return (
        '<li title="' +
        row.label +
        " · " +
        row.note +
        '"><span class="legend-swatch" style="--sw: var(' +
        row.top +
        "); --sd: var(" +
        row.side +
        ')"><svg viewBox="0 0 14 14" aria-hidden="true">' +
        (LEGEND_GLYPHS[row.glyph] || "") +
        "</svg></span>" +
        '<span class="legend-text"><b>' +
        row.label +
        "</b><i>" +
        row.note +
        "</i></span></li>"
      );
    }).join("");
    var ownerNote = document.getElementById("legend-owner-note");
    if (ownerNote) {
      ownerNote.innerHTML = Nexus.PLAYER_COLORS.map(function (color, index) {
        return '<span class="legend-owner" style="--oc:' + color + '">' + (index + 1) + "</span>";
      }).join("");
    }
  }

  function renderDistrict(state, ui) {
    var svg = document.getElementById("district-svg");
    var board = document.getElementById("map-board");
    var view = boardView();
    if (board) {
      board.style.width = view.width + "px";
      board.style.height = view.height + "px";
    }
    svg.setAttribute("viewBox", "0 0 " + view.width + " " + view.height);
    svg.setAttribute("width", String(view.width));
    svg.setAttribute("height", String(view.height));

    var player = Nexus.currentPlayer(state);
    var ctx = {
      spinning: {},
      stagger: {},
      placePopId: (ui && ui.placePopZoneId) || null,
      showYield: !!(ui && ui.yieldPops)
    };
    (state.spinningOutcomes || []).forEach(function (outcome) {
      ctx.spinning[outcome.zoneId] = true;
      ctx.stagger[outcome.zoneId] = (outcome.staggerIndex || 0) * C.HARVEST_STAGGER_MS;
    });

    var html = boardDefs();
    html +=
      '<ellipse class="island-shade" cx="' +
      n(view.width / 2) +
      '" cy="' +
      n(view.height * 0.58) +
      '" rx="' +
      n(view.width * 0.48) +
      '" ry="' +
      n(view.height * 0.4) +
      '" fill="url(#nx-island)"/>';
    view.tiles.forEach(function (tile) {
      html += tileMarkup(state, ui, view, tile, player, ctx);
    });
    svg.innerHTML = html;

    var frame = document.querySelector(".city-frame");
    if (frame) {
      frame.classList.toggle(
        "is-veiled",
        state.turnPhase === "handoff" || state.turnPhase === "role_reveal"
      );
    }
    if (ui && ui.placePopZoneId) {
      ui.placePopZoneId = null;
    }
    if (ui && ui.yieldPops) {
      ui.yieldPops = false;
    }

    document.getElementById("btn-end-round").disabled = !Nexus.canEndTurn(state);
    var tradeBtn = document.getElementById("btn-trade");
    if (tradeBtn) {
      tradeBtn.disabled = state.turnPhase !== "build";
    }

    var hint = document.getElementById("table-hint");
    if (hint) {
      hint.innerHTML = coachText(state, player);
    }
    renderLegend();
  }

  function renderHome(state, ui) {
    var player = Nexus.currentPlayer(state);
    var list = document.getElementById("device-list");
    var inspected = ui && ui.inspectedDevice;
    var inspectedZone = null;
    if (ui && ui.inspectedZoneId) {
      state.zones.forEach(function (zone) {
        if (zone.id === ui.inspectedZoneId) {
          inspectedZone = zone;
        }
      });
    }
    var dockTitle = document.getElementById("dock-title");
    if (dockTitle) {
      dockTitle.textContent = "Feld";
    }
    var inspectEmpty = document.getElementById("inspect-empty");
    if (inspectEmpty) {
      inspectEmpty.hidden = !!inspectedZone;
    }

    var homeModal = document.getElementById("home-modal");
      var shouldOpenHome =
      !!(ui && ui.homeOpen) &&
      !(ui && ui.expandSlot) &&
      !Nexus.isHotSeatShield(state) &&
      state.turnPhase !== "gameover";
    if (homeModal) {
      if (!shouldOpenHome) {
        if (!homeModal.hidden) {
          closeModal(homeModal);
        }
      } else if (homeModal.hidden) {
        openModal(homeModal);
      }
    }

    var zoneInspect = document.getElementById("zone-inspect");
    if (zoneInspect) {
      if (!inspectedZone) {
        zoneInspect.hidden = true;
      } else {
        zoneInspect.hidden = false;
        var owner = state.players.filter(function (p) {
          return p.id === inspectedZone.ownerId;
        })[0];
        var isMineZone = owner && player && owner.id === player.id;
        document.getElementById("zone-inspect-type").textContent =
          (Nexus.ZONE_TYPES[inspectedZone.type] || {}).label || inspectedZone.type;
        document.getElementById("zone-inspect-owner").textContent = owner
          ? isMineZone
            ? "Dein Feld"
            : owner.name + " · öffentlich sichtbar"
          : "";
        document.getElementById("zone-inspect-yield").textContent = zoneInspectYieldText(
          state,
          inspectedZone,
          isMineZone ? player.id : null
        );
        var die = inspectedZone.lastDieId
          ? Nexus.PRODUCTION_DICE.filter(function (item) {
              return item.id === inspectedZone.lastDieId;
            })[0]
          : null;
        document.getElementById("zone-inspect-die").textContent = die
          ? die.label + (die.modifier ? " (" + (die.modifier > 0 ? "+" : "") + die.modifier + ")" : "")
          : inspectedZone.type === "home"
            ? "Home produziert ohne Würfel"
            : "Noch kein Wurf in dieser Runde";
      }
    }

    var visibleDevices = Nexus.DEVICES;
    var canBuildDevices = state.turnPhase === "build" && !Nexus.isHotSeatShield(state);

    list.innerHTML = visibleDevices
      .map(function (device) {
      var mode = player.devices[device.id];
      var buyable = canBuildDevices && Nexus.canBuyDevice(state, device.id);
      var classes = ["room", "t-tt-wrap"];
      if (mode === "cloud") {
        classes.push("is-cloud");
      }
      if (mode === "local") {
        classes.push("is-local");
      }
      if (!mode) {
        classes.push("is-empty");
      }
      if (buyable) {
        classes.push("is-buyable");
      }
      if (inspected === device.id) {
        classes.push("is-open");
      }
      return (
        '<button type="button" class="' +
        classes.join(" ") +
        '" data-device="' +
        device.id +
        '" aria-label="' +
        device.name +
        '">' +
        '<span class="room-icon">' +
        Nexus.DEVICE_ICONS[device.id] +
        "</span>" +
        (mode
          ? '<span class="mode-badge t-icon-swap" data-state="' +
            (mode === "cloud" ? "a" : "b") +
            '"><span class="t-icon" data-icon="a">' +
            Nexus.MODE_ICONS.cloud +
            '</span><span class="t-icon" data-icon="b">' +
            Nexus.MODE_ICONS.local +
            "</span></span>"
          : "") +
        (buyable ? '<span class="buy-dot"></span>' : "") +
        (device.isSpecial ? '<span class="special-tag">Zone</span>' : "") +
        '<span class="t-tt" role="tooltip">' +
        device.shortName +
        "</span>" +
        "</button>"
      );
    })
      .join("");

    var standardsBar = document.getElementById("standards-bar");
    if (standardsBar) {
      var showStandards = state.turnPhase === "build";
      standardsBar.hidden = !showStandards;
      var openBtn = document.getElementById("btn-standard-open");
      var propBtn = document.getElementById("btn-standard-proprietary");
      if (openBtn) {
        openBtn.classList.toggle("is-selected", player.standardsChoice === "open");
      }
      if (propBtn) {
        propBtn.classList.toggle("is-selected", player.standardsChoice === "proprietary");
      }
      var hint = document.getElementById("standards-hint");
      if (hint) {
        hint.textContent =
          (player.standardsChoice === "proprietary" ? "Proprietär" : "Offen") +
          " · Streak: " +
          (player.standardStreak || 0) +
          " Runden";
      }
    }

    var saePanel = document.getElementById("sae-panel");
    if (saePanel) {
      var canSae = !!(player.devices.v2x || player.devices.charging_network);
      saePanel.hidden = !canSae || state.turnPhase !== "build";
      var saeLevel = document.getElementById("sae-level");
      if (saeLevel) {
        saeLevel.textContent = String(player.saeLevel || 0);
      }
      var saeBtn = document.getElementById("btn-sae-upgrade");
      if (saeBtn) {
        saeBtn.disabled = !Nexus.canUpgradeSae(state);
        var saeCost = Nexus.getSaeUpgradeCost(player.saeLevel || 0, player);
        saeBtn.textContent = "SAE ausbauen · " + Nexus.formatCost(saeCost);
      }
    }

    var inspect = document.getElementById("inspect-card");
    if (inspect && inspectedZone) {
      inspect.hidden = true;
    } else if (!inspected || state.turnPhase === "event") {
      inspect.hidden = true;
    } else {
      var device = Nexus.DEVICES_BY_ID[inspected];
      inspect.hidden = false;
      document.getElementById("inspect-icon").innerHTML = Nexus.DEVICE_ICONS[device.id];
      document.getElementById("inspect-title").textContent = device.name;
      document.getElementById("inspect-effect").textContent = device.effectText;
      document.getElementById("inspect-local-cost").innerHTML = chipsHtml(
        Nexus.getBuildOffer(state, device.id, "local").cost
      );
      var cloudBtn = document.getElementById("mode-cloud");
      var localBtn = document.getElementById("mode-local");
      var upkeepEl = document.getElementById("inspect-cloud-upkeep");
      cloudBtn.hidden = !!device.localOnly;
      if (device.localOnly) {
        document.getElementById("inspect-cloud-cost").textContent = "nicht verfügbar";
        document.getElementById("inspect-cloud-risk").innerHTML = "";
        if (upkeepEl) {
          upkeepEl.textContent = "";
        }
        cloudBtn.disabled = true;
        cloudBtn.classList.add("is-disabled");
      } else {
        document.getElementById("inspect-cloud-cost").innerHTML = chipsHtml(
          Nexus.getBuildOffer(state, device.id, "cloud").cost
        );
        document.getElementById("inspect-cloud-risk").innerHTML = riskPips(device.cloudRiskPerRound);
        if (upkeepEl) {
          var upkeepAmt = device.cloudUpkeep || 0;
          upkeepEl.textContent = upkeepAmt
            ? "laufend " + upkeepAmt + " Konnekt./Zug"
            : "";
        }
        var cloudOk = Nexus.getBuildOffer(state, device.id, "cloud").allowed;
        cloudBtn.disabled = !cloudOk;
        cloudBtn.classList.toggle("is-disabled", !cloudOk);
      }
      var localOk = Nexus.getBuildOffer(state, device.id, "local").allowed;
      localBtn.disabled = !localOk;
      localBtn.classList.toggle("is-disabled", !localOk);
    }

    var flags = [];
    var upkeep = Nexus.cloudUpkeepCost(player);
    if (upkeep > 0) {
      flags.push("Cloud −" + upkeep + " Konnekt./Zug");
    }
    if (player.hubDiscountPending) {
      flags.push("Hub-Rabatt");
    }
    if (player.localHardwareDiscountPending) {
      flags.push("Förderung");
    }
    document.getElementById("build-flags").textContent = flags.join(" · ");

    var shield = Nexus.isHotSeatShield(state);
    var cards = shield ? [] : player.handCards || [];
    var played = shield ? [] : player.playedCards || [];
    var canPlay = state.turnPhase === "build" && !shield;
    var fan = document.getElementById("hand-fan");
    if (fan) {
      if (!cards.length) {
        fan.innerHTML = shield
          ? ""
          : '<li class="hand-empty">' +
            '<span class="hand-ghost" aria-hidden="true"></span>' +
            '<span class="hand-ghost" aria-hidden="true"></span>' +
            "<span class=\"hand-empty-text\">Keine Handkarten — Innovationen kommen beim Ernten oder über <b>Nachziehen</b>.</span>" +
            "</li>";
      } else {
        var n = cards.length;
        var spread = n > 6 ? 5 : 7;
        fan.innerHTML = cards
          .map(function (card, index) {
            var effects = Nexus.formatEffects(card.effects);
            var rot = (index - (n - 1) / 2) * spread;
            var title = canPlay
              ? "Ausspielen: " + (effects || card.name)
              : "Nur in der Bauphase ausspielbar";
            return (
              '<li class="t-avatar" style="--fan-i:' +
              index +
              "; --fan-n:" +
              n +
              "; --fan-rot:" +
              rot +
              'deg">' +
              '<button type="button" class="play-card cat-' +
              card.category +
              '" data-card-index="' +
              index +
              '" title="' +
              title +
              '"' +
              (canPlay ? "" : " disabled") +
              ">" +
              '<span class="play-card-cat">' +
              (Nexus.INNOVATION_CATEGORY_LABELS[card.category] || card.category) +
              "</span>" +
              '<strong class="play-card-name">' +
              card.name +
              "</strong>" +
              '<span class="play-card-text">' +
              (card.text || "") +
              "</span>" +
              (effects ? '<span class="play-card-fx">' + effects + "</span>" : "") +
              "</button></li>"
            );
          })
          .join("");
      }
    }

    var playedStack = document.getElementById("played-stack");
    var playedCount = document.getElementById("played-count");
    if (playedCount) {
      playedCount.textContent = String(played.length);
    }
    if (playedStack) {
      if (!played.length) {
        playedStack.innerHTML = '<span class="pile-layer pile-empty"></span>';
      } else {
        var shown = played.slice(-3);
        playedStack.innerHTML = shown
          .map(function (card, index) {
            var isTop = index === shown.length - 1;
            return (
              '<span class="pile-layer' +
              (isTop ? " pile-face cat-" + card.category : "") +
              '">' +
              (isTop ? '<span class="pile-face-name">' + card.name + "</span>" : "") +
              "</span>"
            );
          })
          .join("");
      }
    }

    var drawBtn = document.getElementById("btn-draw-deck");
    var drawCount = document.getElementById("draw-count");
    var deckLeft = (state.innovationDeck || []).length;
    if (drawCount) {
      drawCount.textContent = String(deckLeft);
    }
    if (drawBtn) {
      var drawOffer = Nexus.getInnovationDrawOffer(state);
      drawBtn.disabled = !drawOffer.allowed;
      drawBtn.title = drawOffer.allowed
        ? "Karte ziehen (Hand unter " + Nexus.CONSTANTS.HAND_LIMIT + ")"
        : drawOffer.reason;
      drawBtn.setAttribute("aria-label", drawBtn.title);
    }

    bindCardFanOnce();
  }

  function renderExpandModal(state, ui) {
    var shell = document.getElementById("expand-modal");
    var slot = ui && ui.expandSlot;
    var shouldOpen = !!(slot && state.turnPhase === "build");
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var cost = Nexus.getExpandCost(state);
    var player = Nexus.currentPlayer(state);
    var free = player && (player.freeZoneClaims || 0) > 0;
    var kicker = document.querySelector("#expand-modal .modal-kicker");
    if (kicker) {
      kicker.textContent = free ? "Startfeld (Coupon)" : "Neues Feld";
    }
    document.getElementById("expand-cost").innerHTML = free
      ? '<span class="chip">kostenlos</span>'
      : chipsHtml(cost);

    var pendingType = slot.type || null;
    var variants = pendingType ? zoneVariantsFor(pendingType) : [];
    var stepLabel = document.getElementById("expand-step-label");
    var choices = document.getElementById("expand-choices");
    var variantRow = document.getElementById("expand-variants");

    if (pendingType && variants.length) {
      if (stepLabel) {
        var typeDef = Nexus.ZONE_TYPES[pendingType];
        stepLabel.textContent =
          "Variante · " + ((typeDef && (typeDef.shortLabel || typeDef.label)) || pendingType);
      }
      choices.hidden = true;
      choices.innerHTML = "";
      if (variantRow) {
        variantRow.hidden = false;
        variantRow.innerHTML = variants
          .map(function (variant) {
            var id = variant.id || variant.key || variant;
            var label = variant.label || variant.shortLabel || id;
            return (
              '<button type="button" class="tile-pick zone-pick" data-zone-variant="' +
              id +
              '" style="--zone-color:' +
              (Nexus.ZONE_TYPE_COLORS[pendingType] || "rgba(255,255,255,0.12)") +
              '">' +
              "<small>" +
              label +
              "</small></button>"
            );
          })
          .join("");
      }
    } else {
      if (stepLabel) {
        stepLabel.textContent = "Feldtyp";
      }
      choices.hidden = false;
      if (variantRow) {
        variantRow.hidden = true;
        variantRow.innerHTML = "";
      }
      choices.innerHTML = Nexus.ZONE_TYPE_KEYS.map(function (key) {
        var offer = Nexus.getExpandOffer(state, slot.q, slot.r, key);
        var typeDef = Nexus.ZONE_TYPES[key];
        var iconKey = typeDef && typeDef.primary;
        var iconHtml =
          iconKey && Nexus.RESOURCE_MARKUP[iconKey]
            ? Nexus.iconGroup(iconKey, "#071018")
            : "";
        return (
          '<button type="button" class="tile-pick zone-pick" data-zone-type="' +
          key +
          '" style="--zone-color:' +
          Nexus.ZONE_TYPE_COLORS[key] +
          '"' +
          (offer.allowed ? "" : " disabled") +
          ">" +
          iconHtml +
          "<small>" +
          typeDef.shortLabel +
          "</small></button>"
        );
      }).join("");
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderEventModal(state, ui) {
    var shell = document.getElementById("event-modal");
    var player = Nexus.currentPlayer(state);
    var event = player.pendingEvent;
    var shouldOpen = state.turnPhase === "event" && event;
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    document.getElementById("event-title").textContent = player.name + " – " + event.title;
    document.getElementById("event-text").textContent = event.text;
    var choices = document.getElementById("event-choices");
    var pick = document.getElementById("event-resource-pick");
    var showPick = !!(ui && ui.investorAwaitingResource);
    pick.hidden = !showPick;
    choices.hidden = showPick;
    if (showPick) {
      pick.innerHTML = Nexus.RESOURCE_KEYS.map(function (key) {
        return (
          '<button type="button" class="tile-pick chip-' +
          key +
          '" data-resource="' +
          key +
          '">' +
          Nexus.RESOURCE_ICONS[key] +
          "</button>"
        );
      }).join("");
    } else {
      choices.innerHTML = event.choices
        .map(function (choice) {
          var disabled = !Nexus.canChooseEventOption(state, choice.id);
          return (
            '<button type="button" class="btn" data-choice="' +
            choice.id +
            '"' +
            (disabled ? " disabled" : "") +
            ">" +
            choice.label +
            "<small>" +
            choice.summary +
            "</small></button>"
          );
        })
        .join("");
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderEndScreen(state) {
    var shell = document.getElementById("end-screen");
    var ended = state.turnPhase === "gameover";
    if (!ended) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    if (!state.finalScores) {
      return;
    }
    var best = state.finalScores.reduce(function (max, entry) {
      return entry.totalPercent > max ? entry.totalPercent : max;
    }, -Infinity);
    var winner = state.players.filter(function (p) {
      return p.id === state.winnerId;
    })[0];
    var title = document.getElementById("end-screen-title");
    var reason = document.getElementById("end-screen-reason");
    if (title) {
      title.textContent =
        state.winReason === "instant" ? "Sofortsieg!" : "Spiel beendet";
    }
    if (reason) {
      reason.textContent = winner
        ? (state.winReason === "instant"
            ? winner.name + " hat 100 % des Wahlversprechens erreicht."
            : winner.name + " war am nächsten dran (" + best + "%).")
        : "";
    }
    document.getElementById("score-players").innerHTML = state.finalScores
      .map(function (entry) {
        var player = state.players.filter(function (p) {
          return p.id === entry.playerId;
        })[0];
        var role = Nexus.ROLES_BY_ID[player.roleId];
        var isWinner = entry.playerId === state.winnerId;
        var goalsHtml = entry.subGoals
          .map(function (goal) {
            return "<span>" + goal.label + " <b>" + goal.currentPercent + "%</b></span>";
          })
          .join("");
        return (
          '<div class="score-player' +
          (isWinner ? " is-winner" : "") +
          '" style="--player-color:' +
          playerColor(player) +
          '">' +
          '<div class="score-player-head"><span><span class="dot"></span>' +
          entry.playerName +
          " · " +
          (role ? role.alignment : "") +
          "</span><span>" +
          (isWinner ? "🏆 " : "") +
          entry.totalPercent +
          "%</span></div>" +
          '<p class="score-role-name">' +
          (role ? role.name : "") +
          "</p>" +
          '<div class="score-player-rows">' +
          goalsHtml +
          "</div></div>"
        );
      })
      .join("");
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderTradeModal(state, ui) {
    var shell = document.getElementById("trade-modal");
    var open = !!(ui && ui.tradeOpen && state.turnPhase === "build");
    if (!open) {
      if (shell && !shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var player = Nexus.currentPlayer(state);
    var pick = ui.tradePick || { partnerId: null, giveKey: null, giveAmount: 1, wantKey: null, wantAmount: 1 };
    var hint = player.name + " tauscht Ressourcen (Standards beachten).";
    if (pick.partnerId) {
      var selected = state.players.filter(function (p) {
        return p.id === pick.partnerId;
      })[0];
      if (selected) {
        var compat = Nexus.getTradeOffer(
          state,
          selected.id,
          pick.giveKey || tradeFallbackKey("energy"),
          pick.giveAmount || 1,
          pick.wantKey || tradeFallbackKey("money"),
          pick.wantAmount || 1
        );
        if (!compat.allowed) {
          hint = compat.reason;
        }
      }
    }
    document.getElementById("trade-hint").textContent = hint;
    document.getElementById("trade-partners").innerHTML = state.players
      .filter(function (p) {
        return p.id !== player.id;
      })
      .map(function (p) {
        var compat = Nexus.getTradeOffer(state, p.id, pick.giveKey || tradeFallbackKey("energy"), pick.giveAmount || 1, pick.wantKey || tradeFallbackKey("money"), pick.wantAmount || 1);
        var blocked = p.standardsChoice && player.standardsChoice && p.standardsChoice !== player.standardsChoice;
        return (
          '<button type="button" class="btn setup-choice' +
          (pick.partnerId === p.id ? " is-selected" : "") +
          '" data-partner="' +
          p.id +
          '">' +
          p.name +
          (blocked ? " · ✕" : "") +
          "</button>"
        );
      })
      .join("");
    function resourceButtons(prefix, selectedKey, dataAttr) {
      return Nexus.RESOURCE_KEYS.map(function (key) {
        var shortLabel =
          (Nexus.RESOURCE_SHORT && Nexus.RESOURCE_SHORT[key]) ||
          (Nexus.RESOURCE_LABELS && Nexus.RESOURCE_LABELS[key]) ||
          key;
        return (
          '<button type="button" class="tile-pick chip-' +
          key +
          (selectedKey === key ? " is-selected" : "") +
          '" data-' +
          dataAttr +
          '="' +
          key +
          '">' +
          (Nexus.RESOURCE_ICONS[key] || "") +
          "<small>" +
          shortLabel +
          "</small></button>"
        );
      }).join("");
    }
    document.getElementById("trade-give").innerHTML = resourceButtons("give", pick.giveKey, "give");
    document.getElementById("trade-want").innerHTML = resourceButtons("want", pick.wantKey, "want");
    var confirm = document.getElementById("btn-trade-confirm");
    if (pick.partnerId && pick.giveKey && pick.wantKey) {
      var offer = Nexus.getTradeOffer(state, pick.partnerId, pick.giveKey, pick.giveAmount || 1, pick.wantKey, pick.wantAmount || 1);
      confirm.disabled = !offer.allowed;
    } else {
      confirm.disabled = true;
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  Nexus.render = function (state, ui) {
    if (!state || state.screen !== "game") {
      return;
    }
    renderTurnRow(state);
    renderWallet(state);
    renderGoalPanel(state);
    renderDistrict(state, ui);
    renderHome(state, ui);
    renderExpandModal(state, ui);
    renderTradeModal(state, ui);
    renderEventModal(state, ui);
    renderRoleRevealModal(state);
    renderHandoffModal(state);
    renderPublicPlayerModal(state, ui);
    renderEndScreen(state);
  };

  Nexus.openModal = openModal;
  Nexus.closeModal = closeModal;
  Nexus.pushToast = pushToast;
  Nexus.boardView = boardView;
  Nexus.chipsHtml = chipsHtml;
  Nexus.playerColor = playerColor;
})(window.Nexus);
