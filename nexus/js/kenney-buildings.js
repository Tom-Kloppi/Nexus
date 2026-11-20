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
  /* Fußmaße: KEEP = Upgrade/Trafo (passt), BUILD = Basis-Selbstbau (nachziehen). */
  var ZONE_KEEP = 7.6;
  /* Basis-Selbstbau (Wohnen/Leitstand/Solar/DC/Depot) — Upgrades/Trafo bleiben KEEP. */
  var ZONE_BUILD = 10.2;
  var FILLER_FOOT = 5.4;
  var PROP_FOOT = 0.72;
  var HEX_FIT = 0.94;

  /*
   * Zone → Basis / Upgrade (eine Stufe).
   * Parkplatz/Garage: kein Kenney (BoardKit/artParking).
   * DC-Basis: Skyscraper E; Upgrade: D.
   */
  var CATALOG = {
    "home|0": { path: "commercial/building-a.glb", yaw: 0, foot: ZONE_BUILD },
    "home|1": { path: "commercial/building-f.glb", yaw: 0, foot: ZONE_KEEP },
    "residential|0": { path: "commercial/building-l.glb", yaw: Math.PI / 6, foot: ZONE_BUILD },
    "residential|1": { path: "commercial/building-j.glb", yaw: Math.PI / 6, foot: ZONE_KEEP },
    "energy-solar|0": { path: "industrial/solar-panel-portrait-group.glb", yaw: 0.15, foot: ZONE_BUILD },
    "energy-solar|1": {
      path: "industrial/solar-panel-portrait-group.glb",
      yaw: 0.15,
      foot: ZONE_KEEP,
      extras: [{ path: "industrial/solar-panel-portrait-group.glb", x: 3.4, z: 0, yaw: 0.15 }]
    },
    "energy-transformer|0": { path: "industrial/building-c.glb", yaw: -0.35, foot: ZONE_KEEP },
    "energy-transformer|1": {
      path: "industrial/building-c.glb",
      yaw: -0.35,
      foot: ZONE_KEEP,
      extras: [{ path: "industrial/detail-tank-large.glb", x: 2.9, z: 1.5 }]
    },
    "datacenter|0": { path: "commercial/building-skyscraper-e.glb", yaw: 0.2, foot: ZONE_BUILD },
    "datacenter|1": { path: "commercial/building-skyscraper-d.glb", yaw: 0.2, foot: ZONE_KEEP },
    "traffic|0": { path: "industrial/building-a.glb", yaw: 0.1, foot: ZONE_BUILD },
    "traffic|1": { path: "industrial/building-p.glb", yaw: 0.1, foot: ZONE_KEEP }
  };

  /* Filler: Suburban-Häuser + Industrial d/f/i/j/k/o (keine Container, kein Bus-A). */
  var FILLERS = [
    "suburban/building-type-a.glb",
    "suburban/building-type-b.glb",
    "suburban/building-type-c.glb",
    "suburban/building-type-d.glb",
    "suburban/building-type-e.glb",
    "suburban/building-type-f.glb",
    "industrial/building-d.glb",
    "industrial/building-f.glb",
    "industrial/building-i.glb",
    "industrial/building-j.glb",
    "industrial/building-k.glb",
    "industrial/building-o.glb"
  ];

  var PROPS = {
    treeSmall: { path: "suburban/tree-small.glb", foot: 0.72 },
    treeLarge: { path: "suburban/tree-large.glb", foot: 0.95 },
    lamp: { path: "roads/light-square.glb", foot: 0.85 },
    lampCurved: { path: "roads/light-curved.glb", foot: 0.95 },
    signStreet: { path: "roads/road-sign-street.glb", foot: 0.62 },
    signStop: { path: "roads/road-sign-stop.glb", foot: 0.62 },
    signWarning: { path: "roads/road-sign-warning.glb", foot: 0.62 }
  };

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
      var variant = zone.variant === "transformer" ? "transformer" : "solar";
      return "energy-" + variant + "|" + lv;
    }
    if (zone.type === "datacenter") {
      return "datacenter|" + lv;
    }
    if (zone.type === "traffic") {
      /* Nur Busdepot — Parkplatz/Garage bleiben BoardKit/artParking. */
      if (zone.trafficMode !== "depot") {
        return null;
      }
      return "traffic|" + lv;
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
        add(ex.path, foot);
      });
    });
    FILLERS.forEach(function (path) {
      add(path, FILLER_FOOT);
    });
    Object.keys(PROPS).forEach(function (id) {
      add(PROPS[id].path, PROPS[id].foot || PROP_FOOT);
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
        return loadOne(job.path, job.foot);
      })
    )
      .then(function () {
        ready = true;
        failed = false;
        loading = false;
        notify();
        return true;
      })
      .catch(function (err) {
        console.warn("NEXUS Kenney: Modelle nicht geladen", err);
        failed = true;
        loading = false;
        notify();
        return false;
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

  function placeEntry(group, entry, tileH, shadows) {
    if (!entry || !entry.path) {
      return false;
    }
    var foot = entry.foot || ZONE_KEEP;
    var root = cloneTemplate(entry.path, foot);
    if (!root) {
      return false;
    }
    var mul = entry.scaleMul || 1;
    root.scale.multiplyScalar(mul);
    root.position.y = tileH;
    root.rotation.y = entry.yaw || 0;
    applyShadows(root, shadows);
    group.add(root);
    (entry.extras || []).forEach(function (ex) {
      var extra = cloneTemplate(ex.path, foot);
      if (!extra) {
        return;
      }
      extra.position.set(ex.x || 0, tileH, ex.z || 0);
      if (ex.yaw != null) {
        extra.rotation.y = ex.yaw;
      }
      applyShadows(extra, shadows);
      group.add(extra);
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
    return placeEntry(group, entry, ctx.TILE_H || 0, !!ctx.shadows);
  }

  function buildFiller(group, ctx) {
    if (!ready || failed || !group) {
      return false;
    }
    var tier = (ctx && ctx.qualityTier) || "medium";
    if (!qualityAllowsKenney(tier)) {
      return false;
    }
    var roll = ctx && ctx.roll != null ? ctx.roll : Math.random();
    var path = FILLERS[Math.floor(roll * FILLERS.length) % FILLERS.length];
    var root = cloneTemplate(path, FILLER_FOOT);
    if (!root) {
      return false;
    }
    root.position.y = (ctx && ctx.TILE_H) || 0;
    root.rotation.y = (ctx && ctx.yaw) || roll * Math.PI * 2;
    applyShadows(root, !!(ctx && ctx.shadows));
    group.add(root);
    group.userData.kenneyBuilt = true;
    return true;
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
    applyShadows(root, !!opts.shadows);
    group.add(root);
    return true;
  }

  function isReady() {
    return ready && !failed;
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
    isReady: isReady,
    whenReady: whenReady,
    qualityAllows: qualityAllowsKenney,
    catalog: CATALOG,
    fillers: FILLERS,
    props: PROPS,
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
