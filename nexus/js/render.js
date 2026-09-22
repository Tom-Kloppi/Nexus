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
      { id: "solar", label: "Solarfarm" },
      { id: "transformer", label: "Umspannwerk" }
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
    if (zone.type === "home" && zone.lastYield && zone.lastYield.homeBundle) {
      var homeAmt = zone.lastYield.homeBundle.energy || 1;
      return "+" + homeAmt + " aller Ressourcen";
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
     Steilere Aufsicht (Stadtplan von oben) mit leichter Prismenkante.
     Straßen liegen auf den Kanten jedes Felds; Verkehrskacheln sind
     Gebäude auf dem Grundstück, kein Straßennetz. Reine Darstellung. */

  var VIEW = {
    squash: 0.78,
    thickness: 11,
    waterDrop: 0,
    decoRings: 1,
    depthX: 7,
    depthY: -5,
    streetOuter: 0.99,
    streetInner: 0.82
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

  function hexVerts(cx, cy, sx, sy) {
    return [
      [cx, cy - sy],
      [cx + sx, cy - sy / 2],
      [cx + sx, cy + sy / 2],
      [cx, cy + sy],
      [cx - sx, cy + sy / 2],
      [cx - sx, cy - sy / 2]
    ];
  }

  function pathFromVerts(verts, close) {
    var d = verts
      .map(function (p, i) {
        return (i ? "L" : "M") + n(p[0]) + " " + n(p[1]);
      })
      .join("");
    return close ? d + "Z" : d;
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
    var h = 8;
    var lean = 4;
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
    traffic: { key: "traffic", label: "Verkehrsinfrastruktur", swatch: "--lu-traffic-top" },
    home: { key: "home", label: "Kontrollbüro", swatch: "--lu-home-top" }
  };

  /* Legende nach Materialfamilie: die Variante liest man am Bau, nicht am Boden */
  var LEGEND_ROWS = [
    { label: "Wohnen", note: "ein Wohnungsblock", top: "--lu-res-top", side: "--lu-res-side", glyph: "house" },
    { label: "Energie", note: "Solarfarm · Umspannwerk", top: "--lu-solar-top", side: "--lu-solar-side", glyph: "energy" },
    { label: "Datenzentrum", note: "eine Halle, Ausbau sichtbar", top: "--lu-dcopen-top", side: "--lu-dcopen-side", glyph: "data" },
    { label: "Verkehr", note: "Busbahnhof · Parkplatz", top: "--lu-traffic-top", side: "--lu-traffic-side", glyph: "bus" },
    { label: "Kontrollbüro", note: "Leitstand · Startfeld", top: "--lu-home-top", side: "--lu-home-side", glyph: "home" },
    { label: "Park & Wiese", note: "frei bebaubar", top: "--lu-grass-top", side: "--lu-grass-side", glyph: "tree" },
    { label: "Umland", note: "Felder · Hügel · Berge", top: "--lu-farm-top", side: "--lu-farm-side", glyph: "tree" }
  ];

  var LEGEND_GLYPHS = {
    house: '<path d="M3 12 V5 h8 v7 H3z M5 7 h2 v2 H5z M9 7 h2 v5"/>',
    energy: '<path d="M7 1 L3.5 7.5 H6.5 L5.5 13 L10.5 6 H7.5 L9 1 Z"/>',
    data: '<path d="M2.5 2.5h9v3h-9z M2.5 6.5h9v3h-9z M2.5 10.5h9v2.5h-9z"/>',
    bus: '<path d="M2 4.2 h10 v6.2 H2z M3.2 10.6 h1.8 v1.6 H3.2z M9 10.6 h1.8 v1.6 H9z M3.2 5.4 h3.2 v2 H3.2z M7.6 5.4 h3.2 v2 H7.6z"/>',
    home: '<path d="M4 12 V6.5 h6 V12 H4z M6 8 h2 v2 H6z M7 3.2 L11 6.2 H3z"/>',
    tree: '<path d="M7 1 L11 8 H3 Z M6.2 8 h1.6 v5 h-1.6 z"/>',
    wave: '<path d="M1 5q3-2.2 6 0t6 0v2q-3 2.2-6 0t-6 0z"/>',
    shield: '<path d="M7 1 L12 3v4.2C12 10.3 9.9 12.4 7 13.2 4.1 12.4 2 10.3 2 7.2V3Z"/>',
    solar: '<path d="M2 10 L5.2 4 H12.5 L9.3 10 Z M6.5 11.1h1.3v2H6.5z M4.3 13h5.7v0.9H4.3z"/>',
    pylon: '<path d="M7 1 L10.7 13.2 H9 L7 5.3 L5 13.2 H3.3 Z M4.6 8.2h4.8v1.1H4.6z M5.4 5.3h3.2v1.1H5.4z"/>'
  };

  /* Feldtyp-Auswahl spricht dieselbe Sprache wie das Brett */
  var PICK_PREVIEW = {
    residential: { top: "--lu-res-top", side: "--lu-res-side", glyph: "house" },
    energy: { top: "--lu-solar-top", side: "--lu-solar-side", glyph: "energy" },
    datacenter: { top: "--lu-dcopen-top", side: "--lu-dcopen-side", glyph: "data" },
    traffic: { top: "--lu-traffic-top", side: "--lu-traffic-side", glyph: "bus" },
    "energy-solar": { top: "--lu-solar-top", side: "--lu-solar-side", glyph: "solar" },
    "energy-transformer": { top: "--lu-trafo-top", side: "--lu-trafo-side", glyph: "pylon" },
    "datacenter-insecure": { top: "--lu-dcopen-top", side: "--lu-dcopen-side", glyph: "data" },
    "datacenter-secure": { top: "--lu-dcsafe-top", side: "--lu-dcsafe-side", glyph: "shield" }
  };

  function pickHex(key) {
    var entry = PICK_PREVIEW[key];
    if (!entry) {
      return "";
    }
    return (
      '<span class="pick-hex" style="--sw: var(' +
      entry.top +
      "); --sd: var(" +
      entry.side +
      ')"><svg viewBox="0 0 14 14" aria-hidden="true">' +
      (LEGEND_GLYPHS[entry.glyph] || "") +
      "</svg></span>"
    );
  }

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

  function carSprite(x, y, ang, parked) {
    return (
      '<g class="' +
      (parked ? "parked-car" : "car-body-wrap") +
      '" transform="translate(' +
      n(x) +
      " " +
      n(y) +
      ") rotate(" +
      n(ang || 0) +
      ')">' +
      '<rect class="car-body" x="-6.4" y="-2.3" width="12.8" height="4.6" rx="1.5"/>' +
      '<rect class="car-glass" x="-1.8" y="-1.5" width="5.4" height="3" rx="0.7"/>' +
      "</g>"
    );
  }

  function hvacUnit(x, y) {
    return (
      '<g class="hvac">' +
      '<rect class="steel-dark" x="' +
      n(x) +
      '" y="' +
      n(y) +
      '" width="7" height="5" rx="0.8"/>' +
      '<rect class="steel" x="' +
      n(x + 1) +
      '" y="' +
      n(y + 1.2) +
      '" width="5" height="1.2"/>' +
      "</g>"
    );
  }

  function cameraPole(x, y) {
    return (
      '<g class="cam-gizmo">' +
      '<path class="antenna" d="M' +
      n(x) +
      " " +
      n(y) +
      "v-7" +
      '"/>' +
      '<circle class="badge-disc" cx="' +
      n(x) +
      '" cy="' +
      n(y - 8) +
      '" r="2.2"/>' +
      "</g>"
    );
  }

  function dish(x, y) {
    return (
      '<g class="roof-dish">' +
      '<path class="antenna" d="M' +
      n(x) +
      " " +
      n(y) +
      "v-8" +
      '"/>' +
      '<ellipse class="steel" cx="' +
      n(x + 3) +
      '" cy="' +
      n(y - 8) +
      '" rx="5" ry="2.2"/>' +
      "</g>"
    );
  }

  function curbBays(cx, cy, sx, sy, rand) {
    var inner = hexVerts(cx, cy, sx * VIEW.streetInner, sy * VIEW.streetInner);
    var out = "";
    var i;
    for (i = 0; i < 6; i++) {
      if (rand() > 0.72) {
        continue;
      }
      var a = inner[i];
      var b = inner[(i + 1) % 6];
      var mx = (a[0] + b[0]) / 2;
      var my = (a[1] + b[1]) / 2;
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = (-dy / len) * 3.2;
      var ny = (dx / len) * 3.2;
      out +=
        '<path class="stall-line" d="M' +
        n(mx - dx * 0.12) +
        " " +
        n(my - dy * 0.12) +
        "L" +
        n(mx - dx * 0.12 + nx) +
        " " +
        n(my - dy * 0.12 + ny) +
        "M" +
        n(mx + dx * 0.12) +
        " " +
        n(my + dy * 0.12) +
        "L" +
        n(mx + dx * 0.12 + nx) +
        " " +
        n(my + dy * 0.12 + ny) +
        '"/>';
    }
    return out;
  }

  function parkedAlongCurb(cx, cy, sx, sy, rand, extra) {
    var inner = hexVerts(cx, cy, sx * VIEW.streetInner, sy * VIEW.streetInner);
    var out = "";
    var count = 1 + (extra ? 2 : 0);
    var i;
    for (i = 0; i < 6 && count > 0; i++) {
      if (rand() > 0.55 && !extra) {
        continue;
      }
      var a = inner[i];
      var b = inner[(i + 1) % 6];
      var t = 0.22 + rand() * 0.5;
      var x = a[0] + (b[0] - a[0]) * t;
      var y = a[1] + (b[1] - a[1]) * t;
      var ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      out += carSprite(x, y, ang, true);
      count -= 1;
    }
    return out;
  }

  function cruiseCars(cx, cy, sx, sy, rand, count) {
    var midScale = (VIEW.streetOuter + VIEW.streetInner) / 2;
    var mid = hexVerts(cx, cy, sx * midScale, sy * midScale);
    var d = pathFromVerts(mid, true);
    var now = Date.now();
    var out = "";
    var i;
    for (i = 0; i < count; i++) {
      var dur = 16 + Math.floor(rand() * 10);
      var delay = -((now / 1000 + rand() * dur) % dur);
      out +=
        '<g class="cruise-car" style="offset-path: path(\'' +
        d +
        "'); --cruise-dur:" +
        dur +
        "s; --cruise-delay:" +
        delay.toFixed(2) +
        's">' +
        carSprite(0, 0, 0, false) +
        "</g>";
    }
    return out;
  }

  function parcelGimmicks(cx, cy, sy, rand, level) {
    var out = "";
    if (rand() < 0.85) {
      out += tree(cx - 26 + rand() * 8, cy + sy * 0.18, 0.55, rand() < 0.5);
    }
    if (rand() < 0.55 || level >= 1) {
      out += tree(cx + 22, cy + sy * 0.08, 0.48, true);
    }
    if (rand() < 0.4) {
      out +=
        '<ellipse class="bush" cx="' +
        n(cx - 8) +
        '" cy="' +
        n(cy + sy * 0.34) +
        '" rx="4.4" ry="2.6"/>';
    }
    return out;
  }

  function streetRing(cx, cy, sx, sy, rand, opts) {
    opts = opts || {};
    var outer = hexVerts(cx, cy, sx * VIEW.streetOuter, sy * VIEW.streetOuter);
    var inner = hexVerts(cx, cy, sx * VIEW.streetInner, sy * VIEW.streetInner);
    var midScale = (VIEW.streetOuter + VIEW.streetInner) / 2;
    var mid = hexVerts(cx, cy, sx * midScale, sy * midScale);
    var out =
      '<path class="street-ring" fill-rule="evenodd" d="' +
      pathFromVerts(outer, true) +
      pathFromVerts(inner, true) +
      '"/>';
    out += '<path class="street-dash" d="' + pathFromVerts(mid, true) + '"/>';
    var i;
    for (i = 0; i < 6; i++) {
      if (rand() < 0.2) {
        out += streetLamp(mid[i][0], mid[i][1], 11);
      }
    }
    out += curbBays(cx, cy, sx, sy, rand);
    out += parkedAlongCurb(cx, cy, sx, sy, rand, !!opts.extraParking);
    var movers = opts.busy ? 2 : rand() < 0.65 ? 1 : 0;
    if (movers) {
      out += cruiseCars(cx, cy, sx, sy, rand, movers);
    }
    return out;
  }

  function trafficKindFor(q, r) {
    return tileRandom(q, r, 3)() < 0.5 ? "bus" : "parking";
  }

  function artResidential(cx, cy, sy, rand, level, gizmos) {
    level = level || 0;
    gizmos = gizmos || {};
    var h = 30 + level * 8;
    var w = 38;
    var baseY = cy + sy * 0.2;
    var out = building(cx - w * 0.55, baseY, w, h, {
      cls: "w-steel r-slate",
      roof: "flat",
      depth: 1.2,
      rand: rand,
      windows: { cols: 5, rows: 3 + level, lit: 0.38 }
    });
    if (level >= 1) {
      out += building(cx + 8, baseY - 2, 16, h - 8, {
        cls: "w-concrete r-copper",
        roof: "flat",
        depth: 0.9,
        rand: rand,
        windows: { cols: 2, rows: 2 + level, lit: 0.4 }
      });
    }
    out += hvacUnit(cx - 10, baseY - h - 6);
    if (level >= 2 || gizmos.camera) {
      out += cameraPole(cx + 12, baseY - 4);
      out += cameraPole(cx - 22, baseY - 2);
    }
    if (gizmos.lock || level >= 2) {
      out +=
        '<rect class="steel" x="' +
        n(cx - 4) +
        '" y="' +
        n(baseY - 9) +
        '" width="5" height="7" rx="1"/>';
    }
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function artSolar(cx, cy, sy, rand, level) {
    level = level || 0;
    var baseY = cy + sy * 0.22;
    var h = 14 + level * 4;
    var out = building(cx - 8, baseY, 22, h, {
      cls: "w-concrete r-flat",
      roof: "flat",
      rand: rand,
      windows: { cols: 3, rows: 1, lit: 0.3 }
    });
    var rows = 1 + (level >= 1 ? 1 : 0);
    var row;
    var col;
    for (row = 0; row < rows; row++) {
      for (col = 0; col < 3; col++) {
        out += pvArray(cx - 30 + col * 14, cy - sy * 0.12 + row * 12, 12);
      }
    }
    if (level >= 2) {
      out += pvArray(cx - 4, baseY - h - 2, 14);
    }
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function transformerTank(x, y, w, h) {
    return (
      dropShadow(x + w / 2, y, w) +
      '<rect class="steel" x="' +
      n(x) +
      '" y="' +
      n(y - h) +
      '" width="' +
      n(w) +
      '" height="' +
      n(h) +
      '" rx="2.4"/>' +
      '<ellipse class="fc-top steel" cx="' +
      n(x + w / 2) +
      '" cy="' +
      n(y - h) +
      '" rx="' +
      n(w / 2) +
      '" ry="2.2"/>' +
      '<rect class="steel-dark" x="' +
      n(x + w * 0.12) +
      '" y="' +
      n(y - h * 0.55) +
      '" width="' +
      n(w * 0.76) +
      '" height="3" rx="1"/>'
    );
  }

  function artTransformer(cx, cy, sy, rand, level) {
    level = level || 0;
    var baseY = cy + sy * 0.28;
    var h = 16 + level * 5;
    var out = '<ellipse class="gravel" cx="' + n(cx) + '" cy="' + n(cy + 2) + '" rx="28" ry="' + n(sy * 0.48) + '"/>';
    out += building(cx - 22, baseY, 28, h, {
      cls: "w-concrete r-flat",
      roof: "flat",
      depth: 1.1,
      rand: rand,
      windows: { cols: 4, rows: 1 + (level > 0 ? 1 : 0), lit: 0.22 }
    });
    out += transformerTank(cx + 12, baseY + 4, 11, 11 + level * 2);
    if (level >= 1) {
      out += transformerTank(cx + 22, baseY + 6, 9, 10);
    }
    out +=
      '<path class="gantry" d="M' +
      n(cx - 10) +
      " " +
      n(baseY - h - 4) +
      "H" +
      n(cx + 24) +
      '"/>';
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function artDatacenter(cx, cy, sy, rand, secure, level, gizmos) {
    level = level || 0;
    gizmos = gizmos || {};
    var baseY = cy + sy * 0.26;
    var h = 22 + level * 7;
    var out = building(cx - 24, baseY, 40, h, {
      cls: secure ? "w-steel r-slate" : "w-slate r-flat",
      roof: "flat",
      depth: 1.25,
      rand: rand,
      windows: { cols: 6, rows: 2 + level, lit: secure ? 0.2 : 0.16 }
    });
    if (level >= 1) {
      out += building(cx + 10, baseY - 3, 18, h - 6, {
        cls: "w-concrete r-slate",
        roof: "flat",
        depth: 0.85,
        rand: rand,
        windows: { cols: 3, rows: 1 + level, lit: 0.18 }
      });
    }
    out += hvacUnit(cx - 8, baseY - h - 6);
    out += hvacUnit(cx + 4, baseY - h - 5);
    if (secure || gizmos.lock || level >= 1) {
      out +=
        '<circle class="badge-disc" cx="' +
        n(cx - 8) +
        '" cy="' +
        n(baseY - 10) +
        '" r="5"/>' +
        '<path class="shield-badge" d="M' +
        n(cx - 11) +
        " " +
        n(baseY - 12) +
        "l3 -1.4 3 1.4v2.8q0 2.8 -3 4.2 -3 -1.4 -3 -4.2z" +
        '"/>';
    }
    if (!secure && level < 1) {
      out +=
        '<ellipse class="lamp-glow" cx="' +
        n(cx + 14) +
        '" cy="' +
        n(baseY - 16) +
        '" rx="8" ry="6" fill="url(#nx-warn)"/>';
    }
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function busVehicle(x, y) {
    return (
      dropShadow(x + 11, y + 4, 22) +
      '<rect class="bus-body" x="' +
      n(x) +
      '" y="' +
      n(y) +
      '" width="22" height="8" rx="2"/>' +
      '<rect class="bus-stripe" x="' +
      n(x + 1) +
      '" y="' +
      n(y + 3.2) +
      '" width="20" height="1.6"/>' +
      '<rect class="car-glass" x="' +
      n(x + 13) +
      '" y="' +
      n(y + 1.2) +
      '" width="7" height="3.4" rx="0.8"/>'
    );
  }

  function artBusDepot(cx, cy, sy, rand, level) {
    level = level || 0;
    var baseY = cy + sy * 0.24;
    var h = 16 + level * 5;
    var out = building(cx - 20, baseY, 32 + level * 4, h, {
      cls: "w-concrete r-flat",
      roof: "flat",
      depth: 1.1,
      rand: rand,
      windows: { cols: 4 + level, rows: 1, lit: 0.35 }
    });
    out +=
      '<path class="canopy" d="M' +
      n(cx - 24) +
      " " +
      n(baseY - h - 2) +
      "H" +
      n(cx + 24) +
      "L" +
      n(cx + 20) +
      " " +
      n(baseY - h + 3) +
      "H" +
      n(cx - 20) +
      'Z"/>';
    out += busVehicle(cx - 18, baseY + 2);
    if (level >= 1) {
      out += busVehicle(cx + 2, baseY + 8);
    }
    out += streetLamp(cx + 20, baseY - 4, 14);
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function charger(x, y) {
    return (
      '<rect class="charger-post" x="' +
      n(x) +
      '" y="' +
      n(y - 9) +
      '" width="3.2" height="9" rx="0.8"/>' +
      '<rect class="ok-glow" x="' +
      n(x - 0.4) +
      '" y="' +
      n(y - 11.2) +
      '" width="4" height="2.4" rx="0.6"/>'
    );
  }

  function artParkingLot(cx, cy, sy, rand, level) {
    level = level || 0;
    var out =
      '<ellipse class="lot-pad" cx="' +
      n(cx) +
      '" cy="' +
      n(cy + 2) +
      '" rx="' +
      n(26 + level * 3) +
      '" ry="' +
      n(sy * 0.46) +
      '"/>';
    var i;
    for (i = 0; i < 3 + level; i++) {
      out +=
        '<path class="stall-line" d="M' +
        n(cx - 20) +
        " " +
        n(cy - sy * 0.2 + i * 8) +
        "H" +
        n(cx + 20) +
        '"/>';
    }
    out += charger(cx - 16, cy - 2);
    out += charger(cx + 4, cy + 6);
    if (level >= 1) {
      out += charger(cx + 16, cy - 4);
    }
    out += building(cx + 8, cy - sy * 0.12, 16, 10 + level * 3, {
      cls: "w-concrete r-flat",
      roof: "flat",
      rand: rand,
      windows: { cols: 2, rows: 1, lit: 0.5 }
    });
    out += carSprite(cx - 8, cy + 6, 8, true);
    out += carSprite(cx + 6, cy + 12, -6, true);
    if (level >= 2) {
      out += carSprite(cx - 14, cy + 14, 4, true);
    }
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function artTraffic(cx, cy, sy, rand, kind, level) {
    if (kind === "parking") {
      return artParkingLot(cx, cy, sy, rand, level);
    }
    return artBusDepot(cx, cy, sy, rand, level);
  }

  function artHome(cx, cy, sy, rand, level) {
    level = level || 0;
    var baseY = cy + sy * 0.22;
    var h = 28 + level * 7;
    var out = building(cx - 18, baseY, 36, h, {
      cls: "w-steel r-slate",
      roof: "flat",
      depth: 1.2,
      rand: rand,
      door: true,
      windows: { cols: 4, rows: 3 + level, lit: 0.7 }
    });
    if (level >= 1) {
      out += building(cx + 10, baseY - 2, 14, h - 8, {
        cls: "w-sand r-copper",
        roof: "flat",
        depth: 0.9,
        rand: rand,
        windows: { cols: 2, rows: 2, lit: 0.65 }
      });
    }
    out += dish(cx + 6, baseY - h);
    out +=
      '<path class="flag-pole" d="M' +
      n(cx - 20) +
      " " +
      n(baseY - 2) +
      "v-22" +
      '"/>' +
      poly(
        pts([
          [cx - 20, baseY - 24],
          [cx - 9, baseY - 21],
          [cx - 20, baseY - 18]
        ]),
        "flag-cloth"
      );
    if (level >= 2) {
      out += cameraPole(cx - 16, baseY - 2);
      out += hvacUnit(cx - 4, baseY - h - 6);
    } else {
      out += hvacUnit(cx - 6, baseY - h - 5);
    }
    out += parcelGimmicks(cx, cy, sy, rand, level);
    return out;
  }

  function artPark(cx, cy, sx, sy, rand) {
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
      var x0 = cx - sx * 0.74;
      var y0 = cy + sy * 0.44;
      var x1 = cx + sx * 0.74;
      var y1 = cy - sy * 0.3;
      out +=
        '<path class="park-path" d="M' +
        n(x0) +
        " " +
        n(y0) +
        "Q" +
        n(cx - sx * 0.05) +
        " " +
        n(cy + sy * 0.34) +
        " " +
        n(x1) +
        " " +
        n(y1) +
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

  function artFarm(cx, cy, sx, sy, rand) {
    var out = "";
    var row;
    for (row = 0; row < 4; row++) {
      var y = cy - sy * 0.38 + row * (sy * 0.24);
      out +=
        '<path class="farm-furrow" d="M' +
        n(cx - sx * 0.62) +
        " " +
        n(y) +
        "Q" +
        n(cx) +
        " " +
        n(y + 3) +
        " " +
        n(cx + sx * 0.62) +
        " " +
        n(y) +
        '"/>';
    }
    if (rand() < 0.7) {
      out +=
        '<rect class="farm-barn" x="' +
        n(cx + 8) +
        '" y="' +
        n(cy - 8) +
        '" width="12" height="8" rx="1"/>';
    }
    if (rand() < 0.5) {
      out += tree(cx - 22, cy + sy * 0.2, 0.55, true);
    }
    return out;
  }

  function artHill(cx, cy, sx, sy, rand) {
    var out =
      '<ellipse class="hill-mound" cx="' +
      n(cx) +
      '" cy="' +
      n(cy + sy * 0.08) +
      '" rx="' +
      n(sx * 0.55) +
      '" ry="' +
      n(sy * 0.32) +
      '"/>';
    if (rand() < 0.6) {
      out += tree(cx - 10, cy + sy * 0.18, 0.7, rand() < 0.5);
    }
    if (rand() < 0.45) {
      out += tree(cx + 16, cy + sy * 0.05, 0.5, true);
    }
    return out;
  }

  function artRidge(cx, cy, sx, sy, rand) {
    var peak = cy - sy * 0.22 - rand() * 6;
    return (
      poly(
        pts([
          [cx - sx * 0.7, cy + sy * 0.35],
          [cx - sx * 0.15, peak],
          [cx + sx * 0.2, cy - sy * 0.02],
          [cx + sx * 0.72, cy + sy * 0.32]
        ]),
        "ridge-face"
      ) +
      poly(
        pts([
          [cx - sx * 0.15, peak],
          [cx + sx * 0.08, peak + 10],
          [cx + sx * 0.2, cy - sy * 0.02]
        ]),
        "ridge-snow"
      )
    );
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
      return "Solarfarm: Würfel-Energie (variabel) · Umwelt +1 beim Bau";
    }
    if (zone.type === "datacenter" && zone.variant === "insecure") {
      return "Bandbreite + Risiko — Gate für Wohn-Bandbreite";
    }
    if (zone.type === "traffic") {
      return "Stub: wenig Geld · +1 Komfort beim Bau. Straßen liegen auf den Kanten aller Felder.";
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

  function bumpModalToken(shell) {
    shell._nxCloseToken = (shell._nxCloseToken || 0) + 1;
    return shell._nxCloseToken;
  }

  function openModal(shell) {
    if (!shell) {
      return;
    }
    bumpModalToken(shell);
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
    var token = bumpModalToken(shell);
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
      if (shell._nxCloseToken !== token) {
        return;
      }
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

  function hideModalNow(shell) {
    if (!shell) {
      return;
    }
    bumpModalToken(shell);
    var card = shell.querySelector(".t-modal");
    shell.classList.remove("is-open", "is-closing");
    if (card) {
      card.classList.remove("is-open", "is-closing");
    }
    shell.hidden = true;
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

  function renderGoalPanel(state, ui) {
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
    var redactGoals = !!(ui && ui.tutorialRedact);
    document.getElementById("goal-role-name").textContent = redactGoals ? "Nur für dich" : progress.role.name;
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
    if (redactGoals) {
      document.getElementById("goal-list").innerHTML =
        '<li class="goal-item"><p class="goal-meta">Unterziele stehen hier nur auf deinem Zug. In der Übung bleiben sie verdeckt.</p></li>';
    } else {
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
  }

  function renderRoleRevealModal(state, ui) {
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
    var progress = role ? Nexus.computeRoleProgress(state, player) : null;
    document.getElementById("role-reveal-player").textContent = player.name;
    document.getElementById("role-reveal-hint").textContent =
      state.roleRevealIndex < state.players.length - 1
        ? "Nur du darfst dein Wahlversprechen sehen. Gib das Gerät an den nächsten Stadtteilmanager weiter."
        : "Das war das letzte Wahlversprechen. Danach beginnt Spieler 1.";
    var okBtn = document.getElementById("btn-role-reveal-ok");
    okBtn.textContent =
      state.roleRevealIndex < state.players.length - 1 ? "Verstanden – weiter" : "Spiel beginnen";
    /* Anleitung am gemeinsamen Tisch: Struktur zeigen, Unterziele nicht auslesen. */
    if (ui && ui.tutorialRedact) {
      document.getElementById("role-reveal-body").innerHTML =
        '<p class="role-reveal-label">Wahlversprechen</p>' +
        "<p>Nur die Person am Gerät liest ihre Unterziele. In dieser Übung bleiben sie verdeckt, damit niemand mitliest.</p>";
    } else if (role && progress) {
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
    }
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
    if (state.tradeSession && state.tradeSession.phase === "to_partner") {
      document.getElementById("handoff-hint").textContent =
        "Ein Handelsangebot wartet. Versprechen und Geldbörsen der anderen Person bleiben verdeckt.";
    } else if (state.tradeSession && state.tradeSession.phase === "to_owner") {
      document.getElementById("handoff-hint").textContent =
        "Das Angebot ist beantwortet. Gerät zurück — danach geht der Zug weiter.";
    } else {
      document.getElementById("handoff-hint").textContent =
        owned === 0
          ? "Du besitzt noch keine Felder. Die Produktion wird übersprungen."
          : factories === 0
            ? "Nur dein Kontrollbüro produziert in dieser Runde. Danach kannst du den Startcoupon einlösen."
            : "Nur du darfst dein Wahlversprechen und deine Ressourcen sehen. Wenn du bereit bist, startet die Produktion.";
    }
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
      '<stop offset="0%" stop-color="#3d4a28" stop-opacity="0.28"/>' +
      '<stop offset="100%" stop-color="#3d4a28" stop-opacity="0"/>' +
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
      var decoRoll = tileRandom(tile.q, tile.r, 5)();
      if (tile.dist >= view.playRadius + 1 && decoRoll < 0.34) {
        use = "ridge";
        art = artRidge(cx, cy, sx, sy, rand);
      } else if (decoRoll < 0.62) {
        use = "farm";
        art = artFarm(cx, cy, sx, sy, rand);
      } else {
        use = "hill";
        art = artHill(cx, cy, sx, sy, rand);
      }
      thickness = use === "ridge" ? 13 : 10;
      classes.push("tile--" + use);
    } else if (zone) {
      use = landUseKey(zone);
      var owner = state.players.filter(function (p) {
        return p.id === zone.ownerId;
      })[0];
      var isMine = zone.ownerId === player.id;
      var isHome = zone.type === "home";
      var level = (Nexus.zoneUpgradeLevel && Nexus.zoneUpgradeLevel(zone)) || zone.upgradeLevel || 0;
      var gizmos = {};
      if (owner) {
        if (owner.devices.camera === "cloud" || (isMine && owner.devices.camera === "local")) {
          gizmos.camera = true;
        }
        if (owner.devices.lock === "cloud" || (isMine && owner.devices.lock === "local")) {
          gizmos.lock = true;
        }
      }
      classes.push("tile--" + use);
      classes.push("is-clickable");
      classes.push(isMine ? "is-mine" : "is-foreign");
      classes.push(isHome ? "hex-home" : "hex-owned");
      if (level > 0) {
        classes.push("is-upgraded");
      }
      style += "--owner-color:" + playerColor(owner) + ";";
      attrs +=
        ' data-mine="' +
        (isMine ? "1" : "0") +
        '"' +
        (isHome
          ? ' data-home="' + zone.id + '" data-owner="' + zone.ownerId + '"'
          : ' data-zone="' + zone.id + '"');
      var variantLabel = "";
      if (zone.variant) {
        var vDef = zone.type === "energy"
          ? Nexus.ENERGY_VARIANTS && Nexus.ENERGY_VARIANTS[zone.variant]
          : zone.type === "datacenter"
            ? Nexus.DATACENTER_VARIANTS && Nexus.DATACENTER_VARIANTS[zone.variant]
            : null;
        variantLabel = (vDef && vDef.label) || zone.variant;
      }
      var trafficKind = zone.type === "traffic" ? trafficKindFor(tile.q, tile.r) : null;
      title =
        (Nexus.ZONE_TYPES[zone.type] || {}).label +
        (variantLabel ? " · " + variantLabel : "") +
        (level ? " · Ausbau " + level : "") +
        (trafficKind === "bus"
          ? " · Busbahnhof"
          : trafficKind === "parking"
            ? " · Parkplatz mit Ladestationen"
            : "") +
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
        art = artHome(cx, cy, sy, rand, level);
        overlay += homeDevicePips(owner, cx, cy + sy * 0.46, !isMine);
      } else if (use === "residential") {
        art = artResidential(cx, cy, sy, rand, level, gizmos);
      } else if (use === "energy-solar") {
        art = artSolar(cx, cy, sy, rand, level);
      } else if (use === "energy-transformer") {
        art = artTransformer(cx, cy, sy, rand, level);
      } else if (use === "datacenter-secure") {
        art = artDatacenter(cx, cy, sy, rand, true, level, gizmos);
      } else if (use === "datacenter-insecure") {
        art = artDatacenter(cx, cy, sy, rand, false, level, gizmos);
      } else if (use === "traffic") {
        art = artTraffic(cx, cy, sy, rand, trafficKind, level);
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
      art = use === "park" ? artPark(cx, cy, sx, sy, rand) : artMeadow(cx, cy, sy, rand);
      if (expandable) {
        classes.push("tile--open", "hex-empty", "is-open", "is-clickable");
        if (affordable) {
          classes.push("tile--affordable", "is-buyable", "is-coupon-pulse");
        }
        if (
          ctx.recommendSlot &&
          ctx.recommendSlot.q === tile.q &&
          ctx.recommendSlot.r === tile.r
        ) {
          classes.push("is-recommended");
        }
        attrs += ' data-q="' + tile.q + '" data-r="' + tile.r + '"';
        title = affordable
          ? ctx.recommendSlot && ctx.recommendSlot.q === tile.q && ctx.recommendSlot.r === tile.r
            ? "Empfohlenes Feld — bebaubar"
            : "Freies Feld — bebaubar"
          : "Freies Feld";
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
    if (!isDeco) {
      inner += streetRing(cx, cy, sx, sy, tileRandom(tile.q, tile.r, 19), {
        extraParking: !!(zone && zone.type === "traffic"),
        busy: !!(zone && zone.type === "traffic")
      });
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
    if (state.turnPhase === "handoff" && state.tradeSession) {
      return "Gerät weitergeben — Handelsangebot, Bildschirm bleibt verdeckt.";
    }
    if (state.turnPhase === "handoff") {
      return "Gerät an <b>" + player.name + "</b> weitergeben — Bildschirm bleibt verdeckt.";
    }
    if (state.turnPhase === "trade_respond") {
      return player.name + ": Handelsangebot annehmen oder ablehnen.";
    }
    if (state.turnPhase === "role_reveal") {
      return "Wahlversprechen werden einzeln gezeigt — nur die Person am Gerät liest mit.";
    }
    if (state.turnPhase === "produce" || state.turnPhase === "spinning") {
      if (ownedCount === 0) {
        return player.name + ": keine Felder — Produktion wird übersprungen.";
      }
      if (factoryCount === 0) {
        return player.name + ": <b>Kontrollbüro</b> liefert Ressourcen …";
      }
      return player.name + ": Produktion läuft — Solarfarmen würfeln, Umspannwerke zahlen.";
    }
    if (state.turnPhase === "event") {
      return player.name + ": ein Ereignis wartet.";
    }
    if (state.turnPhase === "build") {
      var waiting = Nexus.pendingTradeOffersFor ? Nexus.pendingTradeOffersFor(state, player.id) : [];
      if (waiting.length) {
        return player.name + ": ein Handelsangebot wartet — annehmen oder ablehnen.";
      }
      if ((player.freeZoneClaims || 0) > 0) {
        return (
          "<b>Startcoupon:</b> ein Nachbarfeld (+) ist gratis. Das Startfeld ist dein Kontrollbüro. Wohnen bringt erst mit eigenem Datenzentrum Bandbreite."
        );
      }
      if (state.round <= 1 && factoryCount <= 1) {
        return "<b>Erste Erweiterung:</b> Solarfarm würfelt, Umspannwerk zahlt Geld pro Energie — Datenzentrum schaltet Wohn-Bandbreite frei.";
      }
      return "Feld antippen für Details · eigenes Kontrollbüro öffnet die Geräte · dann Zug beenden.";
    }
    return "";
  }

  function renderLegend() {
    var list = document.querySelector("#board-legend .legend-list");
    if (!list) {
      return;
    }
    if (list.dataset.legendRev === "farm-3d-1") {
      return;
    }
    list.dataset.legendRev = "farm-3d-1";
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
    var recSlot = Nexus.recommendExpandSlot ? Nexus.recommendExpandSlot(state) : null;
    var ctx = {
      spinning: {},
      stagger: {},
      placePopId: (ui && ui.placePopZoneId) || null,
      showYield: !!(ui && ui.yieldPops),
      recommendSlot: recSlot
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

    /* Blockiert statt disabled: der Klick soll den Grund zeigen, nicht verpuffen */
    var endBtn = document.getElementById("btn-end-round");
    var endBlocked = !Nexus.canEndTurn(state);
    endBtn.disabled = state.turnPhase !== "build";
    endBtn.classList.toggle("is-blocked", endBlocked && !endBtn.disabled);
    endBtn.setAttribute("aria-disabled", endBlocked ? "true" : "false");
    endBtn.title = endBtn.disabled
      ? "Produktion läuft — kurz warten."
      : endBlocked
        ? "Startcoupon: erst ein Nachbarfeld platzieren."
        : "Zug beenden";
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
        var typeLabel = (Nexus.ZONE_TYPES[inspectedZone.type] || {}).label || inspectedZone.type;
        if (inspectedZone.variant) {
          var catalog =
            inspectedZone.type === "energy"
              ? Nexus.ENERGY_VARIANTS
              : inspectedZone.type === "datacenter"
                ? Nexus.DATACENTER_VARIANTS
                : null;
          var vLab = catalog && catalog[inspectedZone.variant] && catalog[inspectedZone.variant].label;
          if (vLab) {
            typeLabel += " · " + vLab;
          }
        }
        if (inspectedZone.type === "traffic") {
          typeLabel +=
            trafficKindFor(inspectedZone.q, inspectedZone.r) === "bus"
              ? " · Busbahnhof"
              : " · Parkplatz mit Ladestationen";
        }
        var level = inspectedZone.upgradeLevel || 0;
        if (level) {
          typeLabel += " · Ausbau " + level;
        }
        document.getElementById("zone-inspect-type").textContent = typeLabel;
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
            ? "Kontrollbüro produziert ohne Würfel"
            : "Noch kein Wurf in dieser Runde";
        var actions = document.getElementById("zone-inspect-actions");
        var impact = document.getElementById("zone-inspect-impact");
        if (actions) {
          actions.innerHTML = "";
          if (isMineZone && state.turnPhase === "build") {
            var up = Nexus.describeZoneUpgrade(state, inspectedZone.id);
            var down = Nexus.describeDemolish(state, inspectedZone.id);
            var html = "";
            if (up.flags && up.flags.maxed) {
              html += '<p class="pick-con">Maximal ausgebaut.</p>';
            } else {
              html +=
                '<button type="button" class="btn" id="btn-zone-upgrade"' +
                (up.allowed ? "" : ' disabled title="' + escapeAttr(upgradeReasonText(up.reason)) + '"') +
                ">Ausbauen" +
                (up.cost && Object.keys(up.cost).length ? " · " + Nexus.formatCost(up.cost) : "") +
                "</button>";
            }
            html +=
              '<button type="button" class="btn ghost" id="btn-zone-demolish"' +
              (down.allowed ? "" : ' disabled title="' + escapeAttr(demolishReasonText(down.reason)) + '"') +
              ">Abreißen" +
              (down.refund && down.refund.money ? " · +" + down.refund.money + " Geld" : "") +
              "</button>";
            actions.innerHTML = html;
          }
        }
        if (impact) {
          var bits = [];
          if (isMineZone && state.turnPhase === "build") {
            var up2 = Nexus.describeZoneUpgrade(state, inspectedZone.id);
            if (up2.production) {
              if (up2.production.resource === "all") {
                bits.push(
                  '<span class="pick-pro">Ausbau: +' +
                    up2.production.toAmount +
                    " aller Ressourcen</span>"
                );
              } else {
                var resN =
                  (Nexus.RESOURCE_SHORT && Nexus.RESOURCE_SHORT[up2.production.resource]) ||
                  up2.production.resource;
                bits.push(
                  '<span class="pick-pro">Ausbau: ' +
                    up2.production.fromAmount +
                    "→" +
                    up2.production.toAmount +
                    " " +
                    resN +
                    "</span>"
                );
              }
              if (up2.flags.transformerUpkeep) {
                bits.push('<span class="pick-con">mehr Energie kostet mehr Geld</span>');
              }
              if (up2.flags.residentialNeedsDc) {
                bits.push('<span class="pick-con">ohne Datenzentrum: Bandbreite 0</span>');
              }
            }
            var down2 = Nexus.describeDemolish(state, inspectedZone.id);
            if (down2.refund && down2.refund.money) {
              bits.push('<span class="pick-pro">Abriss +' + down2.refund.money + " Geld</span>");
            }
            if (down2.lostProduction) {
              bits.push(
                '<span class="pick-con">weg: ' +
                  down2.lostProduction.amount +
                  " " +
                  ((Nexus.RESOURCE_SHORT && Nexus.RESOURCE_SHORT[down2.lostProduction.resource]) ||
                    down2.lostProduction.resource) +
                  "</span>"
              );
            }
            if (down2.flags.disconnects) {
              bits.push('<span class="pick-con">Netz würde reißen</span>');
            }
          }
          impact.innerHTML = bits.join(" ");
        }
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
          player.standardsChoice === "proprietary"
            ? "Proprietär: Tausch nur mit anderem Proprietär, kein Rabatt. Offen dagegen = blockiert (Lock-in). Streak " +
              (player.standardStreak || 0) +
              "."
            : "Offen: Tausch nur mit anderem Offen. Rabatt, wenn du Ware abgibst, die du nicht selbst kürzlich erzeugt hast. Gemischt = blockiert. Streak " +
              (player.standardStreak || 0) +
              ".";
      }
    }

    var homeTitle = document.getElementById("home-modal-title");
    if (homeTitle) {
      homeTitle.textContent = "Geräte am Leitstand";
    }
    var homeKicker = document.querySelector("#home-modal .modal-kicker");
    if (homeKicker) {
      homeKicker.textContent = "Kontrollbüro";
    }
    var homeUpWrap = document.getElementById("home-upgrade-wrap");
    if (homeUpWrap) {
      var homeZone = null;
      state.zones.forEach(function (zone) {
        if (zone.type === "home" && zone.ownerId === player.id) {
          homeZone = zone;
        }
      });
      if (homeZone && state.turnPhase === "build") {
        var homeUp = Nexus.describeZoneUpgrade(state, homeZone.id);
        homeUpWrap.hidden = false;
        homeUpWrap.innerHTML =
          '<p class="setup-label">Leitstand Stufe ' +
          (homeZone.upgradeLevel || 0) +
          "/" +
          ((Nexus.CONSTANTS && Nexus.CONSTANTS.ZONE_UPGRADE_MAX) || 2) +
          "</p>" +
          (homeUp.production
            ? '<p class="expand-impact"><span class="pick-pro">+' +
              homeUp.production.toAmount +
              " aller Ressourcen / Runde</span>" +
              (homeUp.cost && Object.keys(homeUp.cost).length
                ? ' <span class="pick-con">kostet ' + Nexus.formatCost(homeUp.cost) + "</span>"
                : "") +
              "</p>"
            : "") +
          '<button type="button" class="btn" id="btn-home-upgrade"' +
          (homeUp.allowed ? "" : ' disabled title="' + escapeAttr(upgradeReasonText(homeUp.reason)) + '"') +
          ">Büro ausbauen</button>";
      } else if (homeUpWrap) {
        homeUpWrap.hidden = true;
        homeUpWrap.innerHTML = "";
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
        fan.classList.remove("is-dense");
        fan.innerHTML = shield
          ? ""
          : '<li class="hand-empty">' +
            '<span class="hand-ghost" aria-hidden="true"></span>' +
            '<span class="hand-ghost" aria-hidden="true"></span>' +
            "<span class=\"hand-empty-text\">Keine Handkarten — Innovationen kommen beim Ernten oder über <b>Nachziehen</b>.</span>" +
            "</li>";
      } else {
        var n = cards.length;
        /* Flacher Fächer: die Karten dürfen nicht unter die Trayleiste schwenken */
        var spread = n > 6 ? 2.5 : 3;
        fan.classList.toggle("is-dense", n > 5);
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

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function signedDelta(amount, label) {
    var sign = amount > 0 ? "+" : "";
    return sign + amount + " " + label;
  }

  function pickImpactBits(preview) {
    var bits = [];
    if (preview.production) {
      var res =
        (Nexus.RESOURCE_SHORT && Nexus.RESOURCE_SHORT[preview.production.resource]) ||
        preview.production.resource;
      if (preview.production.dice) {
        bits.push(
          '<span class="pick-pro">~' + preview.production.amount + " " + res + "/Runde (Würfel)</span>"
        );
      } else {
        bits.push(
          '<span class="pick-pro">+' + preview.production.amount + " " + res + "/Runde</span>"
        );
      }
      if (preview.production.stable && preview.production.moneyPerEnergy) {
        bits.push(
          '<span class="pick-con">−' +
            preview.production.moneyPerEnergy +
            " Geld je Energie</span>"
        );
      }
    }
    var scores = preview.onBuild || {};
    (Nexus.SCORE_KEYS || []).forEach(function (key) {
      if (!scores[key]) {
        return;
      }
      var label = (Nexus.SCORE_LABELS && Nexus.SCORE_LABELS[key]) || key;
      var cls = scores[key] > 0 ? "pick-pro" : "pick-con";
      bits.push('<span class="' + cls + '">' + signedDelta(scores[key], label) + "</span>");
    });
    if (preview.riskOnBuild) {
      bits.push('<span class="pick-con">+' + preview.riskOnBuild + " Risiko</span>");
    }
    if (preview.flags && preview.flags.residentialNeedsDc) {
      bits.push('<span class="pick-con">ohne Datenzentrum: Bandbreite 0</span>');
    }
    if (preview.flags && preview.flags.insecureRisk) {
      bits.push('<span class="pick-con">ungesichert</span>');
    }
    if (preview.flags && preview.flags.dcUnlocksBandwidth) {
      bits.push('<span class="pick-pro">schaltet Wohn-Bandbreite frei</span>');
    }
    if (preview.flags && preview.flags.trafficInfrastructure) {
      bits.push('<span class="pick-pro">Busbahnhof oder Parkplatz</span>');
    }
    return bits.join("");
  }

  function recommendReasonText(rec) {
    if (!rec) {
      return "";
    }
    if (rec.reasonKey === "low_energy") {
      return "Empfohlen: dir fehlt Energie.";
    }
    if (rec.reasonKey === "low_money") {
      return "Empfohlen: dir fehlt Geld.";
    }
    if (rec.reasonKey === "need_dc") {
      return "Empfohlen: ohne Datenzentrum bleibt Wohn-Bandbreite 0.";
    }
    if (rec.reasonKey === "low_bandwidth") {
      return "Empfohlen: dir fehlt Bandbreite.";
    }
    return "Empfohlen für dein Netz.";
  }

  function tradeReasonText(reason) {
    var map = {
      wrong_phase: "Handel nur in der Bauphase.",
      bad_partner: "Ungültiger Handelspartner.",
      mixed_standard: "Unterschiedliche Standards: kein Handel (Lock-in).",
      no_standard: "Beide brauchen eine Standards-Wahl.",
      bad_amount: "Menge muss größer als 0 sein.",
      cannot_afford: "Nicht genug von der abzugebenden Ressource.",
      partner_short: "Gegenüber hat nicht genug von der gewünschten Ressource."
    };
    return map[reason] || reason || "";
  }

  function upgradeReasonText(reason) {
    var map = {
      wrong_phase: "Ausbauen nur in der Bauphase.",
      not_owner: "Nur eigene Felder.",
      maxed: "Maximal ausgebaut.",
      cannot_afford: "Nicht genug Ressourcen.",
      missing_zone: "Feld fehlt."
    };
    return map[reason] || reason || "";
  }

  function demolishReasonText(reason) {
    var map = {
      wrong_phase: "Abriss nur in der Bauphase.",
      not_owner: "Nur eigene Felder.",
      is_home: "Das Kontrollbüro bleibt stehen.",
      disconnects: "Würde andere Felder vom Netz abschneiden.",
      missing_zone: "Feld fehlt."
    };
    return map[reason] || reason || "";
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
    var impactEl = document.getElementById("expand-impact");

    var rec = Nexus.recommendExpandType ? Nexus.recommendExpandType(state) : null;
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
        variantRow.classList.toggle("pick-grid-2", variants.length >= 2);
        variantRow.innerHTML = variants
          .map(function (variant) {
            var id = variant.id || variant.key || variant;
            var label = variant.label || variant.shortLabel || id;
            var preview = Nexus.describeZoneBuild(state, pendingType, id);
            var recVar = rec && rec.type === pendingType && rec.variant === id;
            return (
              '<button type="button" class="tile-pick zone-pick zone-pick--impact' +
              (recVar ? " is-recommended" : "") +
              '" data-zone-variant="' +
              id +
              '">' +
              pickHex(pendingType + "-" + id) +
              '<span class="pick-copy"><small>' +
              label +
              "</small>" +
              pickImpactBits(preview) +
              "</span></button>"
            );
          })
          .join("");
      }
      if (impactEl) {
        impactEl.hidden = false;
        impactEl.innerHTML =
          "<p>Vor- und Nachteile stehen auf den Kacheln. Ausbau später macht das Gebäude größer und den Ertrag höher.</p>";
      }
    } else {
      if (stepLabel) {
        stepLabel.textContent = "Feldtyp — 2×2, Ertrag vor dem Bauen";
      }
      choices.hidden = false;
      choices.classList.add("pick-grid-2");
      if (variantRow) {
        variantRow.hidden = true;
        variantRow.innerHTML = "";
      }
      choices.innerHTML = Nexus.ZONE_TYPE_KEYS.map(function (key) {
        var offer = Nexus.getExpandOffer(state, slot.q, slot.r, key);
        var typeDef = Nexus.ZONE_TYPES[key];
        var preview = Nexus.describeZoneBuild(state, key);
        var isRec = rec && rec.type === key;
        return (
          '<button type="button" class="tile-pick zone-pick zone-pick--impact' +
          (isRec ? " is-recommended" : "") +
          '" data-zone-type="' +
          key +
          '"' +
          (offer.allowed ? "" : ' disabled title="' + escapeAttr(offer.reason || "Nicht bezahlbar") + '"') +
          ">" +
          pickHex(key) +
          '<span class="pick-copy"><small>' +
          typeDef.shortLabel +
          (isRec ? " · Tipp" : "") +
          "</small>" +
          pickImpactBits(preview) +
          "</span></button>"
        );
      }).join("");
      if (impactEl) {
        impactEl.hidden = false;
        impactEl.innerHTML =
          "<p>" +
          (rec ? recommendReasonText(rec) + " " : "") +
          "Ein Gebäude pro Feld. Straßen umringen die Kanten.</p>";
      }
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

  function renderEndScreen(state, ui) {
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
        var redactScores = !!(ui && ui.tutorialRedact);
        var goalsHtml = redactScores
          ? "<span>Unterziele in der Übung verdeckt</span>"
          : entry.subGoals
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
          (redactScores ? "Versprechen verdeckt" : role ? role.name : "") +
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
    pick.giveAmount = pick.giveAmount || 1;
    pick.wantAmount = pick.wantAmount || 1;
    var hint = "Angebot: Kurs und Menge. Der Partner nimmt an oder lehnt ab — sofort (Gerät übergeben) oder in seinem Zug.";
    var offer = null;
    if (pick.partnerId && pick.giveKey && pick.wantKey) {
      offer = Nexus.getTradeOffer(
        state,
        pick.partnerId,
        pick.giveKey,
        pick.giveAmount,
        pick.wantKey,
        pick.wantAmount
      );
      if (!offer.allowed) {
        hint = tradeReasonText(offer.reason);
      } else {
        var bits = [];
        bits.push(
          "Du gibst " +
            offer.giveCost +
            " " +
            Nexus.RESOURCE_SHORT[pick.giveKey] +
            " für " +
            offer.wantGain +
            " " +
            Nexus.RESOURCE_SHORT[pick.wantKey] +
            "."
        );
        if (offer.flags && offer.flags.openDiscount) {
          bits.push("Offen+Offen: Rabatt auf den Aufpreis.");
        }
        if (offer.flags && offer.flags.premiumSurcharge && !(offer.flags.openDiscount)) {
          bits.push("Nicht selbst erzeugt: doppelter Einsatz.");
        }
        hint = bits.join(" ");
      }
    }
    document.getElementById("trade-hint").textContent = hint;
    document.getElementById("trade-partners").innerHTML = state.players
      .filter(function (p) {
        return p.id !== player.id;
      })
      .map(function (p) {
        var blocked = p.standardsChoice && player.standardsChoice && p.standardsChoice !== player.standardsChoice;
        return (
          '<button type="button" class="btn setup-choice' +
          (pick.partnerId === p.id ? " is-selected" : "") +
          '" data-partner="' +
          p.id +
          '">' +
          p.name +
          (p.standardsChoice === "open" ? " · offen" : " · proprietär") +
          (blocked ? " · kein Tausch" : "") +
          "</button>"
        );
      })
      .join("");
    function resourceButtons(selectedKey, dataAttr) {
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
    document.getElementById("trade-give").innerHTML = resourceButtons(pick.giveKey, "give");
    document.getElementById("trade-want").innerHTML = resourceButtons(pick.wantKey, "want");
    var giveAmt = document.getElementById("trade-give-amount");
    var wantAmt = document.getElementById("trade-want-amount");
    if (giveAmt) {
      giveAmt.value = String(pick.giveAmount);
    }
    if (wantAmt) {
      wantAmt.value = String(pick.wantAmount);
    }
    var impact = document.getElementById("trade-impact");
    if (impact) {
      if (offer && offer.allowed) {
        impact.innerHTML =
          '<span class="pick-pro">bei Annahme: +' +
          offer.wantGain +
          " " +
          Nexus.RESOURCE_SHORT[pick.wantKey] +
          "</span> " +
          '<span class="pick-con">−' +
          offer.giveCost +
          " " +
          Nexus.RESOURCE_SHORT[pick.giveKey] +
          "</span>";
      } else {
        impact.innerHTML = '<span class="pick-con">Noch kein gültiges Angebot</span>';
      }
    }
    var confirm = document.getElementById("btn-trade-confirm");
    var interrupt = document.getElementById("btn-trade-interrupt");
    var lastOffer = (state.tradeOffers || []).filter(function (item) {
      return item.status === "pending" && item.fromId === player.id;
    }).slice(-1)[0];
    if (confirm) {
      confirm.disabled = !(offer && offer.allowed);
      confirm.textContent = "Angebot senden";
    }
    if (interrupt) {
      interrupt.disabled = !lastOffer;
      interrupt.hidden = false;
    }
    if (shell.hidden || !shell.classList.contains("is-open")) {
      openModal(shell);
    }
  }

  function renderTradeRespondModal(state, ui) {
    var shell = document.getElementById("trade-respond-modal");
    if (!shell) {
      return;
    }
    var player = Nexus.currentPlayer(state);
    var incoming = [];
    if (player && Nexus.pendingTradeOffersFor) {
      incoming = Nexus.pendingTradeOffersFor(state, player.id);
    }
    var shouldOpen =
      (state.turnPhase === "trade_respond" && incoming.length) ||
      (state.turnPhase === "build" && incoming.length && !(ui && ui.tradeOpen) && !(ui && ui.expandSlot));
    if (!shouldOpen) {
      if (!shell.hidden) {
        closeModal(shell);
      }
      return;
    }
    var offer = incoming[0];
    var from = state.players.filter(function (p) {
      return p.id === offer.fromId;
    })[0];
    document.getElementById("trade-respond-title").textContent =
      "Angebot von " + (from ? from.name : "Mitspieler");
    document.getElementById("trade-respond-body").innerHTML =
      "<p>Du erhältst <b>" +
      offer.giveCost +
      " " +
      Nexus.RESOURCE_SHORT[offer.giveKey] +
      "</b> und gibst <b>" +
      offer.wantAmount +
      " " +
      Nexus.RESOURCE_SHORT[offer.wantKey] +
      "</b>.</p>" +
      '<p class="expand-impact"><span class="pick-pro">+' +
      offer.giveCost +
      " " +
      Nexus.RESOURCE_SHORT[offer.giveKey] +
      '</span> <span class="pick-con">−' +
      offer.wantAmount +
      " " +
      Nexus.RESOURCE_SHORT[offer.wantKey] +
      "</span></p>" +
      "<p>Wahlversprechen bleiben verdeckt. Nur dieses Angebot ist sichtbar.</p>";
    var accept = document.getElementById("btn-trade-accept");
    var decline = document.getElementById("btn-trade-decline");
    if (accept) {
      accept.setAttribute("data-offer", offer.id);
    }
    if (decline) {
      decline.setAttribute("data-offer", offer.id);
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
    renderGoalPanel(state, ui);
    renderDistrict(state, ui);
    renderHome(state, ui);
    renderExpandModal(state, ui);
    renderTradeModal(state, ui);
    renderTradeRespondModal(state, ui);
    renderEventModal(state, ui);
    renderRoleRevealModal(state, ui);
    renderHandoffModal(state);
    renderPublicPlayerModal(state, ui);
    renderEndScreen(state, ui);
  };

  function tutorialSheetMode() {
    return window.matchMedia("(max-width: 880px), (max-height: 560px)").matches;
  }

  function tutorialElVisible(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      if (node.nodeType === 1 && node.hasAttribute("hidden")) {
        return false;
      }
      if (node.nodeType === 1) {
        var style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
      }
      node = node.parentElement;
    }
    var rect = el.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  }

  function resolveTutorialTarget(step) {
    var selectors = [];
    if (tutorialSheetMode() && step.targetSheet) {
      selectors.push(step.targetSheet);
    }
    if (step.target) {
      selectors.push(step.target);
    }
    if (step.fallback) {
      selectors.push(step.fallback);
    }
    var i;
    var fallbackEl = null;
    for (i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (!el) {
        continue;
      }
      if (!fallbackEl) {
        fallbackEl = el;
      }
      if (tutorialElVisible(el)) {
        return el;
      }
    }
    return fallbackEl;
  }

  function scrollTutorialTarget(el) {
    var parent = el.parentElement;
    while (parent && parent !== document.body) {
      var style = window.getComputedStyle(parent);
      var canScroll = /(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 4;
      if (canScroll) {
        var parentRect = parent.getBoundingClientRect();
        var rect = el.getBoundingClientRect();
        if (rect.top < parentRect.top + 8) {
          parent.scrollTop += rect.top - parentRect.top - 8;
        } else if (rect.bottom > parentRect.bottom - 8) {
          parent.scrollTop += rect.bottom - parentRect.bottom + 8;
        }
      }
      parent = parent.parentElement;
    }
  }

  function tutorialOverlapArea(a, b) {
    var x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    var y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y;
  }

  function fillTutorialToc(activeId, options) {
    options = options || {};
    var list = document.getElementById("tutorial-toc-list");
    if (!list) {
      return;
    }
    var steps = Nexus.TUTORIAL_STEPS || [];
    var sections = Nexus.TUTORIAL_SECTIONS || [];
    var skipSetup = !!options.skipSetup;
    var html = "";
    var s;
    for (s = 0; s < sections.length; s++) {
      var section = sections[s];
      if (skipSetup && section.id === "setup") {
        continue;
      }
      var items = "";
      var i;
      for (i = 0; i < steps.length; i++) {
        var step = steps[i];
        if ((step.section || "setup") !== section.id) {
          continue;
        }
        if (skipSetup && step.scene === "setup") {
          continue;
        }
        items +=
          '<button type="button" class="tutorial-toc-item' +
          (step.id === activeId ? " is-current" : "") +
          '" data-tutorial-index="' +
          i +
          '"><span class="tutorial-toc-num">' +
          (i + 1) +
          "</span><span>" +
          step.title +
          "</span></button>";
      }
      if (!items) {
        continue;
      }
      html +=
        '<div class="tutorial-toc-section"><p class="tutorial-toc-heading">' +
        section.title +
        "</p>" +
        items +
        "</div>";
    }
    list.innerHTML = html;
  }

  Nexus.placeTutorial = function (step, index, total, meta) {
    meta = meta || {};
    var root = document.getElementById("tutorial-root");
    var ring = document.getElementById("tutorial-ring");
    var card = document.getElementById("tutorial-card");
    var stepView = document.getElementById("tutorial-step-view");
    var toc = document.getElementById("tutorial-toc");
    if (!root || !ring || !card) {
      return null;
    }
    root.hidden = false;
    document.body.classList.add("is-tutorial");
    if (meta.pick) {
      document.body.classList.add("is-tutorial-pick");
    } else {
      document.body.classList.remove("is-tutorial-pick");
    }

    var tocOpen = !!meta.tocOpen;
    var skipSetup = !!meta.skipSetup;
    var live = !!meta.live;
    var kicker = live ? "Hilfe" : "Anleitung";
    if (meta.pick) {
      kicker = "Hilfe · Tippen";
    } else if (tocOpen) {
      kicker = (live ? "Hilfe" : "Anleitung") + " · Inhalt";
    } else if (step) {
      kicker += " · " + (index + 1) + " / " + total;
    }
    document.getElementById("tutorial-kicker").textContent = kicker;

    if (stepView) {
      stepView.hidden = tocOpen || meta.pick;
    }
    if (toc) {
      toc.hidden = !tocOpen;
    }
    if (tocOpen) {
      fillTutorialToc(step ? step.id : "", { skipSetup: skipSetup });
    }

    if (step && !tocOpen && !meta.pick) {
      document.getElementById("tutorial-title").textContent = step.title;
      document.getElementById("tutorial-body").textContent = step.body;
      card.setAttribute("data-step", step.id);
    } else if (meta.pick) {
      document.getElementById("tutorial-title").textContent = "Element tippen";
      document.getElementById("tutorial-body").textContent =
        "Tippe auf ein Bedienelement auf dem Tisch. Die kurze Erklärung erscheint hier. Inhalt springt zu einem Thema.";
      if (stepView) {
        stepView.hidden = false;
      }
      card.removeAttribute("data-step");
    } else {
      card.removeAttribute("data-step");
    }

    var back = document.getElementById("btn-tutorial-back");
    var next = document.getElementById("btn-tutorial-next");
    var tocBtn = document.getElementById("btn-tutorial-toc");
    var pickBtn = document.getElementById("btn-tutorial-pick");
    if (back) {
      back.disabled = tocOpen || meta.pick || index <= 0;
      back.hidden = tocOpen || meta.pick;
    }
    if (next) {
      next.hidden = tocOpen || meta.pick;
      next.textContent = index >= total - 1 ? "Fertig" : "Weiter";
    }
    if (tocBtn) {
      tocBtn.setAttribute("aria-expanded", tocOpen ? "true" : "false");
      tocBtn.textContent = tocOpen ? "Schritt" : "Inhalt";
      tocBtn.hidden = !!meta.pick;
    }
    if (pickBtn) {
      pickBtn.hidden = !live;
      pickBtn.textContent = meta.pick ? "Abbrechen" : "Tippen";
      pickBtn.setAttribute("aria-pressed", meta.pick ? "true" : "false");
    }

    var target = null;
    var rect = null;
    if (!tocOpen && !meta.pick && step) {
      target = resolveTutorialTarget(step);
      if (target) {
        scrollTutorialTarget(target);
      }
      var pad = 8;
      rect = target ? target.getBoundingClientRect() : null;
      if (!rect || rect.width < 2 || rect.height < 2) {
        ring.hidden = true;
        rect = null;
      } else {
        ring.hidden = false;
        var top = Math.max(4, rect.top - pad);
        var left = Math.max(4, rect.left - pad);
        var right = Math.min(window.innerWidth - 4, rect.right + pad);
        var bottom = Math.min(window.innerHeight - 4, rect.bottom + pad);
        ring.style.top = top + "px";
        ring.style.left = left + "px";
        ring.style.width = Math.max(12, right - left) + "px";
        ring.style.height = Math.max(12, bottom - top) + "px";
        rect = { top: top, left: left, right: right, bottom: bottom, width: right - left, height: bottom - top };
      }
    } else {
      ring.hidden = true;
    }

    var margin = 10;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (tocOpen) {
      card.classList.add("tutorial-card--toc");
    } else {
      card.classList.remove("tutorial-card--toc");
    }
    card.style.top = margin + "px";
    card.style.left = margin + "px";
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;
    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
    if (tocOpen || meta.pick || !rect) {
      /* Inhalt und Tippen: Karte unten, damit die Topbar und der Tisch frei tippbar bleiben. */
      card.style.top = clamp(vh - ch - margin, margin, Math.max(margin, vh - ch - margin)) + "px";
      card.style.left = clamp((vw - cw) / 2, margin, Math.max(margin, vw - cw - margin)) + "px";
      return target;
    }
    var hole = rect;
    var cx = clamp(hole.left + hole.width / 2 - cw / 2, margin, Math.max(margin, vw - cw - margin));
    var cy = clamp(hole.top, margin, Math.max(margin, vh - ch - margin));
    var options = [
      { top: hole.bottom + margin, left: cx },
      { top: hole.top - ch - margin, left: cx },
      { top: cy, left: hole.right + margin },
      { top: cy, left: hole.left - cw - margin },
      { top: vh - ch - margin, left: margin },
      { top: margin, left: margin }
    ];
    var best = null;
    var bestScore = Infinity;
    var i;
    for (i = 0; i < options.length; i++) {
      var raw = options[i];
      var option = {
        top: clamp(raw.top, margin, Math.max(margin, vh - ch - margin)),
        left: clamp(raw.left, margin, Math.max(margin, vw - cw - margin))
      };
      var box = {
        top: option.top,
        left: option.left,
        right: option.left + cw,
        bottom: option.top + ch
      };
      var area = tutorialOverlapArea(box, hole);
      var shift = Math.abs(option.top - raw.top) + Math.abs(option.left - raw.left);
      var score = area + shift * 80;
      if (score < bestScore) {
        bestScore = score;
        best = option;
      }
    }
    card.style.top = best.top + "px";
    card.style.left = best.left + "px";
    return target;
  };

  Nexus.resolveTutorialTarget = resolveTutorialTarget;
  Nexus.tutorialElVisible = tutorialElVisible;

  Nexus.clearTutorial = function () {
    var root = document.getElementById("tutorial-root");
    if (root) {
      root.hidden = true;
    }
    document.body.classList.remove("is-tutorial");
    document.body.classList.remove("is-tutorial-pick");
    var card = document.getElementById("tutorial-card");
    if (card) {
      card.classList.remove("tutorial-card--toc");
    }
  };

  Nexus.openModal = openModal;
  Nexus.closeModal = closeModal;
  Nexus.hideModalNow = hideModalNow;
  Nexus.pushToast = pushToast;
  Nexus.boardView = boardView;
  Nexus.chipsHtml = chipsHtml;
  Nexus.playerColor = playerColor;
})(window.Nexus);
