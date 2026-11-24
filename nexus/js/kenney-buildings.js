window.Nexus = window.Nexus || {};

/* Kenney City Kit: wenige .glb, Cache, Clone. Eine Aufwertungsstufe (0 → 1). Keine Regeln. */
(function (Nexus) {
  var BASE = (function () {
    var src = document.currentScript && document.currentScript.src;
    if (src) {
      try {
        return new URL("../vendor/kenney/", src).href;
      } catch (err) {
        /* fall through */
      }
    }
    return "vendor/kenney/";
  })();
  /* Fußmaße: KEEP = Upgrade/Trafo. BUILD = Depot. SLIM = Wohnen/DC. */
  var ZONE_KEEP = 7.6;
  var ZONE_BUILD = 8.15;
  var ZONE_SOLAR = 5.76; /* −20 % ggü. 7.2 */
  var ZONE_TRAFO0 = 6.84; /* −10 % lvl 1 */
  /* Wohnen-Basis + DC: native Footprint klein → sonst ~2× zu groß. */
  var ZONE_SLIM = 4.05;
  var ZONE_RES0 = 4.25; /* +5 % unerweitertes Wohnhaus */
  var ZONE_DC = 4.25; /* +5 % Rechenzentrum */
  var ZONE_NUKE_HALL = 5.35; /* +5 % ggü. 5.1 */
  var ZONE_NUKE_STACK = 1.73; /* +5 % Basis-Schornstein */
  var ZONE_NUKE_PAIR = 3.4; /* Lvl-2-Doppelkühltürme ~2× */
  var ZONE_COMMERCE = 6.4;
  var ZONE_COMMERCE_UP = 6.55; /* Fabrik/Unternehmen Ausbau — nicht ZONE_KEEP */
  var FILLER_FOOT = 5.4;
  var PROP_FOOT = 0.72;
  var HEX_FIT = 0.94;

  /*
   * Zone → Basis / Upgrade (eine Stufe).
   * Atom: Halle + Chimney Large/Medium (Industrial) + Tank — kein Water-Tower.
   * doorYaw: Feinkorrektur, wenn facingYaw vom Board kommt (Türen zum Spieler).
   */
  var CATALOG = {
    "home|0": { path: "commercial/building-skyscraper-e.glb", yaw: 0.15, doorYaw: 0, foot: ZONE_SLIM },
    "home|1": { path: "commercial/building-f.glb", yaw: 0, doorYaw: 0, foot: ZONE_KEEP },
    "residential|0": { path: "commercial/building-l.glb", yaw: Math.PI / 6, doorYaw: 0, foot: ZONE_RES0 },
    "residential|1": { path: "commercial/building-j.glb", yaw: Math.PI / 6, doorYaw: 0, foot: ZONE_KEEP },
    "energy-solar|0": { path: "industrial/solar-panel-portrait-group.glb", yaw: 0.15, doorYaw: 0, foot: ZONE_SOLAR },
    "energy-solar|1": {
      path: "industrial/solar-panel-portrait-group.glb",
      yaw: 0.15,
      doorYaw: 0,
      foot: ZONE_SOLAR,
      x: -2.55,
      z: 0,
      extras: [{ path: "industrial/solar-panel-portrait-group.glb", x: 2.55, z: 0, yaw: 0.15 }]
    },
    /* Kenney Industrial 2.0 Windmill — L0 niedrig, L1 Doppel-Turbinen. */
    "energy-wind|0": {
      path: "industrial/windmill-low.glb",
      yaw: 0.2,
      doorYaw: 0,
      foot: 2.35
    },
    "energy-wind|1": {
      path: "industrial/windmill.glb",
      yaw: 0.15,
      doorYaw: 0,
      foot: 2.55,
      x: -2.1,
      z: 0.4,
      extras: [{ path: "industrial/windmill.glb", x: 2.2, z: -0.35, yaw: -0.25, foot: 2.55 }]
    },
    "energy-transformer|0": { path: "industrial/building-e.glb", yaw: -0.35, doorYaw: 0, foot: ZONE_TRAFO0 },
    "energy-transformer|1": { path: "industrial/building-c.glb", yaw: -0.35, doorYaw: 0, foot: ZONE_KEEP },
    "energy-nuclear|0": {
      path: "industrial/building-e.glb",
      yaw: -0.2,
      doorYaw: 0,
      foot: ZONE_NUKE_HALL,
      x: 1.1,
      z: 0.6,
      extras: [
        { path: "industrial/chimney-large.glb", x: -2.5, z: -1.4, yaw: 0.05, foot: ZONE_NUKE_STACK },
        { path: "industrial/chimney-medium.glb", x: -1.15, z: -2.15, yaw: -0.08, foot: ZONE_NUKE_STACK * 0.92 },
        { path: "industrial/detail-tank.glb", x: 2.55, z: -1.7, yaw: 0.4, foot: 1.42 }
      ]
    },
    "energy-nuclear|1": {
      path: "industrial/building-c.glb",
      yaw: -0.15,
      doorYaw: 0,
      foot: ZONE_NUKE_HALL * 1.05,
      x: 1.15,
      z: 0.7,
      extras: [
        { path: "industrial/chimney-large.glb", x: -3.15, z: -1.85, yaw: 0.05, foot: ZONE_NUKE_PAIR },
        { path: "industrial/chimney-large.glb", x: -1.35, z: -2.95, yaw: -0.05, foot: ZONE_NUKE_PAIR },
        { path: "industrial/detail-tank-large.glb", x: 2.75, z: -1.55, yaw: 0.35, foot: 1.62 },
        { path: "industrial/chimney-small.glb", x: 2.55, z: 1.95, yaw: 0.2, foot: 1.0 }
      ]
    },
    /* Offen/Zu: Assets getauscht — Vibe passt andersrum besser. */
    "datacenter|0": { path: "commercial/building-skyscraper-c.glb", yaw: 0.2, doorYaw: 0, foot: ZONE_DC },
    "datacenter|1": { path: "commercial/building-skyscraper-d.glb", yaw: 0.2, doorYaw: 0, foot: ZONE_DC },
    "datacenter-secure|0": { path: "commercial/building-skyscraper-a.glb", yaw: 0.2, doorYaw: 0, foot: ZONE_DC },
    "datacenter-secure|1": { path: "commercial/building-skyscraper-b.glb", yaw: 0.2, doorYaw: 0, foot: ZONE_DC },
    "commerce-factory|0": { path: "industrial/building-f.glb", yaw: 0.2, doorYaw: 0, foot: ZONE_COMMERCE },
    "commerce-factory|1": { path: "industrial/building-d.glb", yaw: 0.15, doorYaw: 0, foot: ZONE_COMMERCE_UP },
    "commerce-enterprise|0": { path: "commercial/building-g.glb", yaw: 0.1, doorYaw: 0, foot: ZONE_COMMERCE * 0.92 },
    "commerce-enterprise|1": { path: "commercial/building-a.glb", yaw: 0.1, doorYaw: 0, foot: ZONE_COMMERCE_UP },
    /* E-Taxi-Station: bisheriges Depot-/Busbahnhof-Modell. */
    "traffic-taxi|0": { path: "industrial/building-a.glb", yaw: 0.1, doorYaw: 0, foot: ZONE_BUILD },
    "traffic-taxi|1": { path: "industrial/building-p.glb", yaw: 0.1, doorYaw: 0, foot: ZONE_KEEP },
    "traffic-garage|0": { path: "industrial/building-s.glb", yaw: 0.05, doorYaw: 0, foot: ZONE_KEEP },
    /* Ausbau: zweites Gebäude hinter dem ersten, 180° gedreht. */
    "traffic-garage|1": {
      path: "industrial/building-s.glb",
      yaw: 0.05,
      doorYaw: 0,
      foot: ZONE_KEEP,
      x: 0,
      z: 1.2,
      extras: [{ path: "industrial/building-s.glb", x: 0, z: -1.2, yaw: 0.05 + Math.PI }]
    },
    "workshop|0": {
      path: "industrial/building-i.glb",
      yaw: 0.2,
      doorYaw: 0,
      foot: ZONE_COMMERCE,
      extras: [
        { path: "graveyard/brick-wall.glb", x: -3.1, z: 0.2, yaw: 0.15, foot: 2.4 },
        { path: "graveyard/stone-wall.glb", x: 0.8, z: -3.0, yaw: 1.2, foot: 2.2 },
        { path: "car/cone.glb", x: 2.6, z: 2.2, yaw: 0.2, foot: 0.55 },
        { path: "car/box.glb", x: 2.0, z: 1.3, yaw: 0.4, foot: 0.7 },
        { path: "car/debris-tire.glb", x: 1.2, z: 2.4, yaw: -0.5, foot: 0.85 },
        { path: "car/debris-bumper.glb", x: 2.8, z: 0.6, yaw: 0.9, foot: 0.9 }
      ]
    },
    "workshop|1": {
      path: "industrial/building-o.glb",
      yaw: 0.15,
      doorYaw: 0,
      foot: ZONE_KEEP,
      extras: [
        { path: "graveyard/brick-wall-end.glb", x: -3.2, z: -0.4, yaw: 0.1, foot: 2.5 },
        { path: "graveyard/pillar-square.glb", x: 3.0, z: -2.4, yaw: 0, foot: 1.1 },
        { path: "car/cone-flat.glb", x: 2.4, z: 2.0, yaw: 0.3, foot: 0.55 },
        { path: "car/box.glb", x: 1.8, z: 1.5, yaw: -0.3, foot: 0.7 },
        { path: "car/debris-door.glb", x: 2.6, z: 0.8, yaw: 0.7, foot: 0.95 },
        { path: "car/wheel-default.glb", x: 1.1, z: 2.5, yaw: 0.2, foot: 0.75 }
      ]
    },
    "park|0": { path: "suburban/tree-large.glb", yaw: 0, doorYaw: 0, foot: 2.4, x: -1.6, z: 0.8, extras: [
      { path: "suburban/tree-small.glb", x: 1.8, z: -1.0, yaw: 0.5 },
      { path: "suburban/tree-large.glb", x: 0.4, z: 2.0, yaw: -0.3 },
      { path: "suburban/tree-small.glb", x: -2.0, z: -1.6, yaw: 1.1 }
    ] },
    "park|1": { path: "suburban/tree-large.glb", yaw: 0, doorYaw: 0, foot: 2.6, x: -1.8, z: 0.6, extras: [
      { path: "suburban/tree-large.glb", x: 1.9, z: -0.8, yaw: 0.4 },
      { path: "suburban/tree-small.glb", x: 0.2, z: 2.2, yaw: -0.5 },
      { path: "suburban/tree-small.glb", x: -0.6, z: -2.0, yaw: 0.9 }
    ] }
  };

  /* Unowned Tiles: alle Suburban-Häuser a–f, einheitlich auf FILLER_FOOT. */
  var FILLERS = [
    "suburban/building-type-a.glb",
    "suburban/building-type-b.glb",
    "suburban/building-type-c.glb",
    "suburban/building-type-d.glb",
    "suburban/building-type-e.glb",
    "suburban/building-type-f.glb"
  ];

  var PROPS = {
    treeSmall: { path: "suburban/tree-small.glb", foot: 0.72 },
    treeLarge: { path: "suburban/tree-large.glb", foot: 0.95 },
    /* Kein separates Kenney-Busch-GLB — tree-small kompakt als Busch-Varianten. */
    bushSmall: { path: "suburban/tree-small.glb", foot: 0.36, yScale: 0.72 },
    bushWide: { path: "suburban/tree-small.glb", foot: 0.48, yScale: 0.55 },
    lamp: { path: "roads/light-square.glb", foot: 0.85 },
    lampCurved: { path: "roads/light-curved.glb", foot: 0.95 },
    signStreet: { path: "roads/road-sign-street.glb", foot: 0.62 },
    signStop: { path: "roads/road-sign-stop.glb", foot: 0.62 },
    signWarning: { path: "roads/road-sign-warning.glb", foot: 0.62 },
    carBox: { path: "car/box.glb", foot: 0.7 },
    carCone: { path: "car/cone.glb", foot: 0.55 },
    carTire: { path: "car/debris-tire.glb", foot: 0.85 },
    carBumper: { path: "car/debris-bumper.glb", foot: 0.9 },
    wallBrick: { path: "graveyard/brick-wall.glb", foot: 2.4 },
    wallStone: { path: "graveyard/stone-wall.glb", foot: 2.2 },
    pillar: { path: "graveyard/pillar-square.glb", foot: 1.1 }
  };

  /* Straßenflotte: Kenney Car Kit — keine Race/Karts. */
  var VEHICLE_FOOT_CAR = 2.05;
  var VEHICLE_FOOT_VAN = 2.55;
  var VEHICLE_FOOT_TRUCK = 3.15;
  var VEHICLE_SPECIAL = [
    { id: "ambulance", path: "car/ambulance.glb", kind: "van", foot: VEHICLE_FOOT_VAN, max: 1 },
    { id: "firetruck", path: "car/firetruck.glb", kind: "van", foot: VEHICLE_FOOT_TRUCK, max: 1, slow: 1 },
    { id: "garbage-truck", path: "car/garbage-truck.glb", kind: "van", foot: VEHICLE_FOOT_TRUCK, max: 1, slow: 1 },
    { id: "delivery-flat", path: "car/delivery-flat.glb", kind: "van", foot: VEHICLE_FOOT_TRUCK, max: 1, slow: 1 },
    { id: "police", path: "car/police.glb", kind: "car", foot: VEHICLE_FOOT_CAR, max: 1 }
  ];
  var VEHICLE_RARE = [
    { id: "hatchback-sports", path: "car/hatchback-sports.glb", kind: "car", foot: VEHICLE_FOOT_CAR },
    { id: "sedan-sports", path: "car/sedan-sports.glb", kind: "car", foot: VEHICLE_FOOT_CAR },
    { id: "suv-luxury", path: "car/suv-luxury.glb", kind: "car", foot: VEHICLE_FOOT_VAN },
    { id: "tractor", path: "car/tractor.glb", kind: "van", foot: VEHICLE_FOOT_VAN, slow: 1 },
    { id: "tractor-shovel", path: "car/tractor-shovel.glb", kind: "van", foot: VEHICLE_FOOT_VAN, slow: 1 },
    { id: "tractor-police", path: "car/tractor-police.glb", kind: "van", foot: VEHICLE_FOOT_VAN, slow: 1 }
  ];
  var VEHICLE_COMMON = [
    { id: "sedan", path: "car/sedan.glb", kind: "car", foot: VEHICLE_FOOT_CAR },
    { id: "suv", path: "car/suv.glb", kind: "car", foot: VEHICLE_FOOT_VAN },
    { id: "van", path: "car/van.glb", kind: "van", foot: VEHICLE_FOOT_VAN },
    { id: "delivery", path: "car/delivery.glb", kind: "van", foot: VEHICLE_FOOT_VAN },
    { id: "truck", path: "car/truck.glb", kind: "van", foot: VEHICLE_FOOT_TRUCK, slow: 1 },
    { id: "truck-flat", path: "car/truck-flat.glb", kind: "van", foot: VEHICLE_FOOT_TRUCK, slow: 1 }
  ];
  /* Nur E-Taxi-Stand — nicht im Fließverkehr. */
  var VEHICLE_STATION = [
    { id: "taxi", path: "car/taxi.glb", kind: "car", foot: VEHICLE_FOOT_CAR }
  ];
  var VEHICLE_BY_ID = {};
  VEHICLE_SPECIAL.concat(VEHICLE_RARE, VEHICLE_COMMON, VEHICLE_STATION).forEach(function (def) {
    VEHICLE_BY_ID[def.id] = def;
  });

  var cache = {};
  var inflight = {};
  var ready = false;
  var loading = false;
  var failed = false;
  var loader = null;
  var listeners = [];

  function qualityAllowsKenney(tier) {
    return tier === "medium" || tier === "high" || tier === "ultra";
  }

  function visualLevel(level) {
    return (level | 0) >= 1 ? 1 : 0;
  }

  function zoneKey(zone, level) {
    if (!zone) {
      return null;
    }
    var lv = visualLevel(level);
    if (zone.type === "energy") {
      var variant =
        zone.variant === "transformer" || zone.variant === "coal"
          ? "transformer"
          : zone.variant === "nuclear"
            ? "nuclear"
            : zone.variant === "wind"
              ? "wind"
              : "solar";
      return "energy-" + variant + "|" + lv;
    }
    if (zone.type === "datacenter") {
      if (zone.variant === "secure") {
        return "datacenter-secure|" + lv;
      }
      return "datacenter|" + lv;
    }
    if (zone.type === "commerce") {
      var cVar = zone.variant === "enterprise" ? "enterprise" : "factory";
      return "commerce-" + cVar + "|" + lv;
    }
    if (zone.type === "traffic") {
      var mode =
        zone.trafficMode === "taxi" ||
        zone.variant === "taxi" ||
        zone.trafficMode === "depot" ||
        zone.variant === "depot"
          ? "taxi"
          : "garage";
      return "traffic-" + mode + "|" + lv;
    }
    if (zone.type === "workshop") {
      return "workshop|" + lv;
    }
    if (zone.type === "park") {
      return "park|" + lv;
    }
    if (zone.type === "home") {
      return "home|" + lv;
    }
    if (zone.type === "residential") {
      return "residential|" + lv;
    }
    return null;
  }

  function entryFor(zone, level) {
    var key = zoneKey(zone, level);
    return key ? CATALOG[key] || null : null;
  }

  function markKenney(root) {
    root.userData = root.userData || {};
    root.userData.kenney = true;
    root.traverse(function (obj) {
      if (!obj.isMesh) {
        return;
      }
      obj.userData = obj.userData || {};
      obj.userData.kenney = true;
      obj.userData.keep = true;
      obj.castShadow = false;
      obj.receiveShadow = false;
      if (obj.material) {
        var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(function (mat) {
          if (mat && mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
          }
          if (mat) {
            mat.side = THREE.FrontSide;
          }
        });
      }
    });
    return root;
  }

  function fitTemplate(scene, targetFoot) {
    var box = new THREE.Box3().setFromObject(scene);
    var size = new THREE.Vector3();
    box.getSize(size);
    var center = new THREE.Vector3();
    box.getCenter(center);
    var footprint = Math.max(size.x, size.z, 0.001);
    var scale = ((targetFoot || ZONE_KEEP) * HEX_FIT) / footprint;
    var root = new THREE.Group();
    var inner = scene.clone(true);
    inner.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    inner.scale.setScalar(scale);
    root.add(inner);
    root.userData.fitScale = scale;
    root.userData.footprint = footprint * scale;
    root.userData.targetFoot = targetFoot || ZONE_KEEP;
    return markKenney(root);
  }

  function ensureLoader() {
    if (loader) {
      return loader;
    }
    if (typeof THREE === "undefined" || !THREE.GLTFLoader) {
      return null;
    }
    loader = new THREE.GLTFLoader();
    return loader;
  }

  function loadOne(relPath, targetFoot) {
    var foot = targetFoot || ZONE_KEEP;
    var cacheKey = relPath + "|" + foot;
    if (cache[cacheKey]) {
      return Promise.resolve(cache[cacheKey]);
    }
    if (inflight[cacheKey]) {
      return inflight[cacheKey];
    }
    var gl = ensureLoader();
    if (!gl) {
      return Promise.reject(new Error("GLTFLoader fehlt"));
    }
    var url = BASE + relPath;
    inflight[cacheKey] = new Promise(function (resolve, reject) {
      gl.load(
        url,
        function (gltf) {
          try {
            var template = fitTemplate(gltf.scene || gltf.scenes[0], foot);
            cache[cacheKey] = template;
            delete inflight[cacheKey];
            resolve(template);
          } catch (err) {
            delete inflight[cacheKey];
            reject(err);
          }
        },
        undefined,
        function (err) {
          delete inflight[cacheKey];
          reject(err || new Error("load failed " + relPath));
        }
      );
    });
    return inflight[cacheKey];
  }

  function collectPaths() {
    var seen = {};
    var list = [];
    function add(path, foot) {
      var key = path + "|" + foot;
      if (!path || seen[key]) {
        return;
      }
      seen[key] = true;
      list.push({ path: path, foot: foot });
    }
    Object.keys(CATALOG).forEach(function (key) {
      var entry = CATALOG[key];
      var foot = entry.foot || ZONE_KEEP;
      add(entry.path, foot);
      (entry.extras || []).forEach(function (ex) {
        add(ex.path, ex.foot || foot);
      });
    });
    FILLERS.forEach(function (path) {
      add(path, FILLER_FOOT);
    });
    Object.keys(PROPS).forEach(function (id) {
      add(PROPS[id].path, PROPS[id].foot || PROP_FOOT);
    });
    Object.keys(VEHICLE_BY_ID).forEach(function (id) {
      var def = VEHICLE_BY_ID[id];
      add(def.path, def.foot || VEHICLE_FOOT_CAR);
    });
    return list;
  }

  function notify() {
    listeners.splice(0).forEach(function (fn) {
      try {
        fn(ready && !failed);
      } catch (err) {
        /* ignore */
      }
    });
  }

  function preload(force) {
    if (ready && !force) {
      return Promise.resolve(true);
    }
    if (failed && !force) {
      return Promise.resolve(false);
    }
    if (loading) {
      return new Promise(function (resolve) {
        listeners.push(function (ok) {
          resolve(ok);
        });
      });
    }
    if (typeof THREE === "undefined" || !THREE.GLTFLoader) {
      failed = true;
      return Promise.resolve(false);
    }
    loading = true;
    var jobs = collectPaths();
    return Promise.all(
      jobs.map(function (job) {
        return loadOne(job.path, job.foot).then(
          function (tpl) {
            return { ok: true, path: job.path, foot: job.foot, tpl: tpl };
          },
          function (err) {
            console.warn("NEXUS Kenney: Skip", job.path, err && err.message ? err.message : err);
            return { ok: false, path: job.path, foot: job.foot };
          }
        );
      })
    ).then(function (results) {
      var okCount = 0;
      results.forEach(function (r) {
        if (r && r.ok) {
          okCount += 1;
        }
      });
      ready = okCount > 0;
      failed = okCount === 0;
      loading = false;
      if (failed) {
        console.warn("NEXUS Kenney: keine Modelle geladen");
      }
      notify();
      return ready;
    });
  }

  function cloneTemplate(relPath, targetFoot) {
    var cacheKey = relPath + "|" + (targetFoot || ZONE_KEEP);
    var template = cache[cacheKey];
    if (!template) {
      return null;
    }
    var clone = template.clone(true);
    markKenney(clone);
    return clone;
  }

  function applyShadows(root, on) {
    if (!on) {
      return;
    }
    root.traverse(function (obj) {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  function placeEntry(group, entry, tileH, shadows, facingYaw) {
    if (!entry || !entry.path) {
      return false;
    }
    var foot = entry.foot || ZONE_KEEP;
    var root = cloneTemplate(entry.path, foot);
    if (!root) {
      return false;
    }
    var mul = entry.scaleMul || 1;
    var useFacing = facingYaw != null && !isNaN(facingYaw);
    var holder = group;
    if (useFacing || entry.x || entry.z || (entry.extras && entry.extras.length)) {
      holder = new THREE.Group();
      holder.position.y = 0;
      holder.rotation.y = useFacing ? facingYaw : 0;
      group.add(holder);
    }
    root.scale.multiplyScalar(mul);
    root.position.set(entry.x || 0, tileH, entry.z || 0);
    root.rotation.y = useFacing ? entry.doorYaw || 0 : entry.yaw || 0;
    applyShadows(root, shadows);
    holder.add(root);
    (entry.extras || []).forEach(function (ex) {
      var extra = cloneTemplate(ex.path, ex.foot || foot);
      if (!extra) {
        return;
      }
      extra.position.set(ex.x || 0, tileH, ex.z || 0);
      if (useFacing) {
        extra.rotation.y = ex.doorYaw != null ? ex.doorYaw : entry.doorYaw || 0;
      } else if (ex.yaw != null) {
        extra.rotation.y = ex.yaw;
      }
      applyShadows(extra, shadows);
      holder.add(extra);
    });
    group.userData.kenneyBuilt = true;
    return true;
  }

  function build(group, ctx) {
    if (!ready || failed || !ctx || !ctx.zone) {
      return false;
    }
    var tier = ctx.qualityTier || "medium";
    if (!qualityAllowsKenney(tier)) {
      return false;
    }
    var entry = entryFor(ctx.zone, ctx.level || 0);
    if (!entry) {
      return false;
    }
    return placeEntry(group, entry, ctx.TILE_H || 0, !!ctx.shadows, ctx.facingYaw);
  }

  function buildFiller(group, ctx) {
    if (!ready || failed || !group) {
      return false;
    }
    var tier = (ctx && ctx.qualityTier) || "medium";
    if (!qualityAllowsKenney(tier) && !(ctx && ctx.force)) {
      return false;
    }
    var roll = ctx && ctx.roll != null ? ctx.roll : Math.random();
    var preferred = FILLERS.slice();
    var start = Math.floor(roll * preferred.length) % preferred.length;
    var i;
    for (i = 0; i < preferred.length; i++) {
      var path = preferred[(start + i) % preferred.length];
      var foot = FILLER_FOOT;
      var root = cloneTemplate(path, foot);
      if (!root) {
        continue;
      }
      root.position.y = (ctx && ctx.TILE_H) || 0;
      root.rotation.y = (ctx && ctx.yaw) || roll * Math.PI * 2;
      applyShadows(root, !!(ctx && ctx.shadows));
      group.add(root);
      group.userData.kenneyBuilt = true;
      return true;
    }
    return false;
  }

  function placeProp(group, propId, x, y, z, opts) {
    if (!ready || failed || !group) {
      return false;
    }
    var def = PROPS[propId];
    if (!def) {
      return false;
    }
    var root = cloneTemplate(def.path, def.foot || PROP_FOOT);
    if (!root) {
      return false;
    }
    opts = opts || {};
    root.position.set(x || 0, y || 0, z || 0);
    if (opts.yaw) {
      root.rotation.y = opts.yaw;
    }
    var yScale = opts.yScale != null ? opts.yScale : def.yScale;
    if (yScale && yScale !== 1) {
      root.scale.y *= yScale;
    }
    if (opts.scale && opts.scale !== 1) {
      root.scale.multiplyScalar(opts.scale);
    }
    root.userData.greenProp =
      propId.indexOf("tree") === 0 || propId.indexOf("bush") === 0;
    root.userData.propId = propId;
    if (opts.userData) {
      Object.keys(opts.userData).forEach(function (k) {
        root.userData[k] = opts.userData[k];
      });
    }
    applyShadows(root, !!opts.shadows);
    group.add(root);
    return true;
  }

  function vehicleCached(def) {
    return !!cache[def.path + "|" + (def.foot || VEHICLE_FOOT_CAR)];
  }

  /* bag = bereits genutzte Specials (max 1). Mutiert bag. */
  function pickTrafficVehicle(bag) {
    bag = bag || {};
    var open = VEHICLE_SPECIAL.filter(function (def) {
      return !bag[def.id] && vehicleCached(def);
    });
    if (open.length && Math.random() < 0.09) {
      var special = open[Math.floor(Math.random() * open.length)];
      bag[special.id] = true;
      return special;
    }
    var rareReady = VEHICLE_RARE.filter(vehicleCached);
    if (rareReady.length && Math.random() < 0.11) {
      return rareReady[Math.floor(Math.random() * rareReady.length)];
    }
    var commonReady = VEHICLE_COMMON.filter(vehicleCached);
    if (commonReady.length) {
      return commonReady[Math.floor(Math.random() * commonReady.length)];
    }
    return null;
  }

  /* Colormap-Textur + Lambert (Board-Licht). Ohne Map bleiben Autos grau. */
  function prepareVehicleMaterials(root) {
    if (!root) {
      return root;
    }
    root.traverse(function (obj) {
      if (!obj.isMesh || !obj.material) {
        return;
      }
      var srcList = Array.isArray(obj.material) ? obj.material : [obj.material];
      var out = srcList.map(function (mat) {
        if (!mat) {
          return mat;
        }
        var map = mat.map || null;
        if (map) {
          if (map.colorSpace !== undefined) {
            map.colorSpace = THREE.SRGBColorSpace;
          }
          map.flipY = false;
          map.needsUpdate = true;
        }
        return new THREE.MeshLambertMaterial({
          color: 0xffffff,
          map: map,
          transparent: !!mat.transparent,
          opacity: mat.opacity != null ? mat.opacity : 1,
          side: THREE.DoubleSide,
          vertexColors: false,
          alphaTest: mat.alphaTest || 0,
          depthWrite: mat.depthWrite !== false
        });
      });
      obj.material = out.length === 1 ? out[0] : out;
    });
    return root;
  }

  function cloneVehicle(id, shadows) {
    var def = VEHICLE_BY_ID[id];
    if (!def || !ready || failed) {
      return null;
    }
    var root = cloneTemplate(def.path, def.foot || VEHICLE_FOOT_CAR);
    if (!root) {
      return null;
    }
    prepareVehicleMaterials(root);
    applyShadows(root, !!shadows);
    root.userData.vehicleId = id;
    root.userData.vehicleKind = def.kind || "car";
    return root;
  }

  function vehicleDef(id) {
    return VEHICLE_BY_ID[id] || null;
  }

  function isReady() {
    return ready && !failed;
  }

  function isFailed() {
    return !!failed;
  }

  function isLoading() {
    return !!loading && !ready && !failed;
  }

  function whenReady(fn) {
    if (ready || failed) {
      fn(ready && !failed);
      return;
    }
    listeners.push(fn);
  }

  Nexus.KenneyBuildings = {
    preload: preload,
    build: build,
    buildFiller: buildFiller,
    placeProp: placeProp,
    pickTrafficVehicle: pickTrafficVehicle,
    cloneVehicle: cloneVehicle,
    vehicleDef: vehicleDef,
    isReady: isReady,
    isFailed: isFailed,
    isLoading: isLoading,
    whenReady: whenReady,
    qualityAllows: qualityAllowsKenney,
    catalog: CATALOG,
    fillers: FILLERS,
    props: PROPS,
    vehicles: VEHICLE_BY_ID,
    baseUrl: BASE
  };

  if (typeof THREE !== "undefined" && THREE.GLTFLoader) {
    preload();
  } else if (typeof window !== "undefined") {
    window.addEventListener("load", function () {
      if (typeof THREE !== "undefined" && THREE.GLTFLoader) {
        preload();
      }
    });
  }
})(window.Nexus);
