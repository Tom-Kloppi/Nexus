window.Nexus = window.Nexus || {};

(function (Nexus) {
  var HEX = 10;
  var TILE_H = 1.15;
  var ROAD_W = 2.472; /* +20 % */
  /* Straße sitzt auf der Pad-Oberkante — kein Spalt zum Biom-Boden. */
  var ROAD_Y = TILE_H + 0.04;
  var ROAD_THICK = 0.14;
  /* Drei Straßen im 120°-Winkel lassen ein gleichseitiges Dreieck frei. */
  var JUNCTION_INSET = ROAD_W / (2 * Math.sqrt(3));
  /*
   * HEX_YAW=0: Flats zu den Nachbarn (nicht π/6 — das drehte Spitzen in die Straße).
   * Pad bis Bordstein (Straßenkante), nicht in die Fahrbahn — Puls bleibt auf dem Feld.
   * Parkbuchten liegen höher auf dem Pad-Rand (sichtbar darüber), kein zweites Mini-Tile.
   * Abstand Zentrum→Straßenmitte = HEX·√3/2 (pointy-top).
   */
  var ROAD_MID = (HEX * Math.sqrt(3)) / 2;
  var FIELD_APOTHEM = ROAD_MID - ROAD_W * 0.5 - 0.06;
  var FIELD_R = FIELD_APOTHEM / Math.cos(Math.PI / 6);
  /* Puls-Apothem klar vor Bordstein — sonst liegt das Overlay auf der Fahrbahn. */
  var HIGHLIGHT_R = (FIELD_APOTHEM - 0.22) / Math.cos(Math.PI / 6);
  var BUILDING_FOOT = 5.15;
  var TREE_PARK_MARGIN = 2.75;
  var junctionMat = null;
  var DECO_RINGS = 0;
  var HEX_YAW = 0;
  var CAM_DIST_MIN = 34;
  var CAM_DIST_MAX = 240;
  var CAM_POLAR_MIN = 0.28;
  var CAM_POLAR_MAX = 1.28;
  var CAM_PAN_MARGIN = HEX * 2.4;
  var FOG_NEAR = 95;
  var FOG_FAR = 340;
  var PLATE_RADIUS = HEX * 42;
  var CAR_COUNT = 26;
  var MAX_LIGHTS = 16;
  var MAX_LAMPS = 18;
  var MAX_TREES = 28;
  var MAX_BINS = 12;
  var MAX_BENCHES = 3;
  var MAX_BUSHES = 20;
  var MAX_FLOWERS = 16;
  var biomeChoice = "grass";
  var activeBiome = "grass";
  var spriteTextures = {};
  var billboardSprites = [];

  /* Fallback, falls quality.js fehlt — sonst kommt alles aus Nexus.Quality.snapshot(). */
  var FALLBACK_QUALITY = {
    pixelRatioCap: 1.25,
    renderScale: 0.85,
    antialias: false,
    rafStep: 1,
    carCount: 22,
    maxLights: 8,
    maxLamps: 18,
    maxTrees: 26,
    maxBins: 12,
    maxBenches: 4,
    decoKeep: 0.7,
    lightInterval: 0,
    pixelLook: false
  };

  var qualityChoice = "auto";
  var resolvedPreset = "medium";
  var qualityReady = false;
  var activeQuality = Object.assign({}, FALLBACK_QUALITY);
  var gpuProbe = null;
  var rendererAntialias = true;
  var rafId = 0;
  var rafN = 0;
  var lastLightPulse = -1;
  var lastLampNight = null;
  var visibilityBound = false;
  var webglFailed = false;

  var renderer = null;
  var scene = null;
  var camera = null;
  var canvas = null;
  var viewport = null;
  var raycaster = null;
  var pointer = null;
  var clock = null;
  var running = false;
  var lastTheme = "";
  var lastFp = "";
  var lastState = null;
  var lastUi = null;
  var resizeObs = null;

  var geo = {};
  var mats = {};
  var roots = {};
  var extras = {
    sun: null,
    hemi: null,
    ambient: null
  };

  var graph = { nodes: {}, keys: [] };
  var cars = [];
  var blinkMesh = null;
  var brakeMesh = null;
  var carMesh = null;
  var carCabin = null;
  var pedMesh = null;
  var peds = [];
  var walkSites = [];
  var zebraEdges = {};
  var busMesh = null;
  var busAgents = [];
  var birds = [];
  var clouds = [];
  var turbines = [];
  var densityLevel = 1;
  var wireOn = false;
  var debugCamOn = false;
  var fpsValue = 0;
  var fpsFrames = 0;
  var fpsStamp = 0;
  var frameSamples = [];
  var cityReady = false;
  var cityKenneyWait = 0;
  var cityPhase = null;
  var roadDress = null;
  var lastRoadNet = null;
  var parkingCatalog = null;
  var taxiFleet = {};
  var taxiFleetRoot = null;
  var tileCursor = null;
  var tileBudget = null;
  var batchOn = false;
  var batchItems = [];
  var forceMesh = false;
  var sharedMat = typeof WeakSet === "function" ? new WeakSet() : null;
  var sharedGeo = typeof WeakSet === "function" ? new WeakSet() : null;
  var disposeN = 0;
  var lastDraw = 0;
  var leakPrev = 0;
  var leakHits = 0;
  var dummy = null;
  var lights = [];
  var lamps = [];
  var dressingCounts = { trees: 0, lamps: 0, bins: 0, benches: 0, bushes: 0, flowers: 0 };
  var plusPins = [];
  var overlays = [];
  var animHoldUntil = 0;
  var lampPools = [];
  var buildRings = [];
  var cityStats = { tearDown: 0, rebuildTiles: 0, patchTile: 0 };
  var tileGroups = {};
  var keptBatches = [];
  var lastZoneMap = {};
  var lastLineSig = "";
  var lastStructure = "";
  var grayMats = null;
  var matBackup = null;
  var grayMode = 0;
  var propMode = 0;
  var keepMode = 0;
  var batchSlot = "";
  var fleet = {};
  var headMesh = null;
  var headPoolMesh = null;
  var lineBusLightMesh = null;
  var lineBusPoolMesh = null;
  var lineBusBrakeMesh = null;
  var ownerRims = [];
  var productionMode = false;

  var cam = {
    pitchSlider: 58,
    polar: 0.72,
    seatYaw: 0,
    seatTarget: 0,
    userYaw: 0,
    distance: 78,
    panX: 0,
    panZ: 0,
    panY: 2.2,
    userAdjusted: false,
    targetPanX: 0,
    targetPanZ: 0,
    targetPolar: 0.72,
    targetDistance: 78,
    targetUserYaw: 0
  };

  function css(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function col(name, fallback) {
    return new THREE.Color(css(name, fallback));
  }

  function seeded(q, r, salt) {
    var h = ((q + 32) * 73856093) ^ ((r + 32) * 19349663) ^ ((salt || 7) * 83492791);
    h = h >>> 0;
    return function () {
      h = (h * 1664525 + 1013904223) % 4294967296;
      return h / 4294967296;
    };
  }

  function keyRand(key, salt) {
    var h = ((salt || 7) * 83492791) >>> 0;
    var s = String(key);
    var i;
    for (i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    }
    return h / 4294967296;
  }

  function axial(q, r) {
    return {
      x: HEX * Math.sqrt(3) * (q + r / 2),
      z: HEX * 1.5 * r
    };
  }

  function axialDist(q, r) {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  function corner(q, r, i) {
    var c = axial(q, r);
    var a = (Math.PI / 180) * (60 * i - 30);
    return { x: c.x + HEX * Math.cos(a), z: c.z + HEX * Math.sin(a) };
  }

  function vkey(x, z) {
    return Math.round(x * 6) + "_" + Math.round(z * 6);
  }

  function polarFromSlider(t) {
    t = Math.max(0, Math.min(100, Number(t) || 58)) / 100;
    return CAM_POLAR_MIN + t * (CAM_POLAR_MAX - CAM_POLAR_MIN);
  }

  function panLimit() {
    var radius = (Nexus.CONSTANTS && Nexus.CONSTANTS.HEX_RADIUS) || 3;
    return HEX * (radius + 1.35) + CAM_PAN_MARGIN;
  }

  function clampPan() {
    var lim = panLimit();
    cam.targetPanX = clamp(cam.targetPanX, -lim, lim);
    cam.targetPanZ = clamp(cam.targetPanZ, -lim, lim);
    cam.panX = clamp(cam.panX, -lim, lim);
    cam.panZ = clamp(cam.panZ, -lim, lim);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerpAngle(from, to, t) {
    var d = to - from;
    while (d > Math.PI) {
      d -= Math.PI * 2;
    }
    while (d < -Math.PI) {
      d += Math.PI * 2;
    }
    return from + d * t;
  }

  function isNight() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function normalizeQuality(value) {
    var legacy = { quality: "high", balance: "medium", performance: "low" };
    if (legacy[value]) {
      return legacy[value];
    }
    if (
      value === "auto" ||
      value === "minimal" ||
      value === "low" ||
      value === "medium" ||
      value === "high" ||
      value === "ultra"
    ) {
      return value;
    }
    return "auto";
  }

  function probeGpu() {
    if (gpuProbe) {
      return gpuProbe;
    }
    var out = {
      caveat: false,
      software: false,
      maxTextureSize: 0,
      renderer: "",
      webgl2: false
    };
    var probe = document.createElement("canvas");
    var gl = null;
    try {
      gl =
        probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
        probe.getContext("webgl", { failIfMajorPerformanceCaveat: true });
      if (!gl) {
        out.caveat = true;
        gl = probe.getContext("webgl2") || probe.getContext("webgl");
      }
    } catch (err) {
      out.caveat = true;
    }
    if (!gl) {
      out.caveat = true;
      out.software = true;
      gpuProbe = out;
      return out;
    }
    out.webgl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    out.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    var info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) {
      out.renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "");
    } else {
      out.renderer = String(gl.getParameter(gl.RENDERER) || "");
    }
    out.software = /swiftshader|llvmpipe|softpipe|microsoft basic render|software|mesa offscreen|cpu rasterizer/i.test(
      out.renderer
    );
    var lose = gl.getExtension("WEBGL_lose_context");
    if (lose) {
      lose.loseContext();
    }
    gpuProbe = out;
    if (
      out.software &&
      Nexus.Quality &&
      !(function () {
        var search = window.location && window.location.search;
        var fromUrl = Nexus.Quality.parseUrl(search || "");
        return fromUrl.tier && fromUrl.tier !== "auto";
      })()
    ) {
      Nexus.Quality.setManual("minimal");
      Nexus.Quality.setCap("minimal");
    }
    return out;
  }

  function qualityParams() {
    if (Nexus.Quality && Nexus.Quality.snapshot) {
      return Nexus.Quality.snapshot();
    }
    return null;
  }

  function syncActiveQuality() {
    var tuned = qualityParams();
    if (!tuned) {
      activeQuality = Object.assign({}, FALLBACK_QUALITY);
      resolvedPreset = "medium";
      return activeQuality;
    }
    resolvedPreset = tuned.tier || "medium";
    activeQuality = {
      pixelRatioCap: tuned.pixelRatioCap || 1,
      renderScale: tuned.renderScale || 1,
      antialias: !!tuned.antialias,
      rafStep: tuned.vehicleStride > 1 ? 2 : 1,
      carCount: tuned.cars || 0,
      maxLights: tuned.lights || 0,
      maxLamps: tuned.lamps || 0,
      maxTrees: tuned.trees || 0,
      maxBins: tuned.bins || 0,
      maxBenches: tuned.benches || 0,
      decoKeep: tuned.decoKeep == null ? 1 : tuned.decoKeep,
      lightInterval: tuned.lod ? 0.16 : 0,
      pixelLook: !tuned.antialias && tuned.renderScale < 0.75
    };
    return activeQuality;
  }

  function applyQualityCounts() {
    syncActiveQuality();
    var tuned = qualityParams();
    if (tuned) {
      CAR_COUNT = tuned.cars;
      MAX_LIGHTS = tuned.lights;
      MAX_LAMPS = tuned.lamps;
      MAX_TREES = tuned.trees;
      MAX_BINS = tuned.bins;
      MAX_BENCHES = tuned.benches;
      MAX_BUSHES = Math.max(2, Math.round(MAX_TREES * 0.7));
      MAX_FLOWERS = Math.max(2, Math.round(MAX_TREES * 0.55));
      return;
    }
    var q = activeQuality;
    CAR_COUNT = q.carCount;
    MAX_LIGHTS = q.maxLights;
    MAX_LAMPS = q.maxLamps;
    MAX_TREES = q.maxTrees;
    MAX_BINS = q.maxBins;
    MAX_BENCHES = q.maxBenches;
    MAX_BUSHES = Math.max(4, Math.round(MAX_TREES * 0.7));
    MAX_FLOWERS = Math.max(4, Math.round(MAX_TREES * 0.55));
  }

  function look() {
    return Nexus.BoardLook || null;
  }

  function biomeTheme() {
    var L = look();
    if (!L) {
      return null;
    }
    return L.themeFor(activeBiome, isNight());
  }

  function ensureSprites() {
    var L = look();
    if (!L) {
      return;
    }
    var key = activeBiome + (isNight() ? "-n" : "-d");
    if (spriteTextures.key === key) {
      return;
    }
    spriteTextures = {
      key: key,
      lampGlow: L.lampGlowTex(),
      lightPool: L.lightPoolTex(),
      tree: L.treeSprite(1, activeBiome),
      tree2: L.treeSprite(7, activeBiome),
      bush: L.bushSprite(3, activeBiome),
      flower: L.flowerSprite(0),
      flower2: L.flowerSprite(2),
      flower3: L.flowerSprite(4),
      horizon: L.horizonSilhouette(activeBiome, isNight())
    };
  }

  function spriteMat(map, opts) {
    opts = opts || {};
    return new THREE.SpriteMaterial({
      map: map,
      transparent: true,
      depthWrite: false,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      color: opts.color || 0xffffff,
      fog: opts.fog !== false
    });
  }

  function grayMap(map) {
    if (!map || !map.image) {
      return map;
    }
    if (map.userData && map.userData.gray) {
      return map.userData.gray;
    }
    var img = map.image;
    var c = document.createElement("canvas");
    c.width = img.width || 32;
    c.height = img.height || 32;
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    var data = g.getImageData(0, 0, c.width, c.height);
    var d = data.data;
    var flat = 226;
    var i;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) {
        continue;
      }
      d[i] = d[i + 1] = d[i + 2] = flat;
    }
    g.putImageData(data, 0, 0);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    map.userData = map.userData || {};
    map.userData.gray = tex;
    return tex;
  }

  function addBillboard(parent, map, x, y, z, sx, sy, opacity, forceGray) {
    var useGray = !!(forceGray || grayMode);
    var use = useGray ? grayMap(map) : map;
    var mat = spriteMat(use, {
      opacity: opacity === undefined ? 1 : opacity,
      color: useGray ? 0xb4b4b0 : 0xffffff
    });
    var spr = new THREE.Sprite(mat);
    if (propMode) {
      spr.userData.prop = true;
    }
    spr.position.set(x, y, z);
    spr.scale.set(sx, sy, 1);
    parent.add(spr);
    billboardSprites.push(spr);
    return spr;
  }

  function resolveQuality(choice) {
    qualityChoice = normalizeQuality(choice);
    applyQualityCounts();
    return resolvedPreset;
  }

  function applyCanvasLook() {
    if (!canvas) {
      return;
    }
    canvas.classList.toggle("is-pixel", !!activeQuality.pixelLook);
    canvas.style.imageRendering = activeQuality.pixelLook ? "pixelated" : "auto";
  }

  function shouldAnimate() {
    if (!renderer) {
      return false;
    }
    if (lastState && lastState.turnPhase === "role_reveal") {
      return false;
    }
    if (typeof document.hidden === "boolean" && document.hidden) {
      return false;
    }
    if (lastState && lastState.screen !== "game") {
      return false;
    }
    return true;
  }

  function startLoop() {
    if (rafId) {
      return;
    }
    if (!shouldAnimate()) {
      running = false;
      return;
    }
    running = true;
    if (clock) {
      clock.getDelta();
    }
    rafId = requestAnimationFrame(tick);
  }

  function bindVisibility() {
    if (visibilityBound) {
      return;
    }
    visibilityBound = true;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        running = false;
        return;
      }
      startLoop();
    });
  }

  function createRenderer() {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !!activeQuality.antialias,
      alpha: false,
      powerPreference: resolvedPreset === "minimal" || resolvedPreset === "low" ? "low-power" : "high-performance"
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(col("--sky-mid", isNight() ? "#12303a" : "#9bd6d4"), 1);
    rendererAntialias = !!activeQuality.antialias;
  }

  function applyQualityToEngine(rebuild) {
    applyQualityCounts();
    lastLightPulse = -1;
    lastLampNight = null;
    if (!renderer || !canvas) {
      return;
    }
    if (rendererAntialias !== !!activeQuality.antialias) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      try {
        renderer.dispose();
      } catch (err) {}
      createRenderer();
    }
    applyCanvasLook();
    resize();
    if (!rebuild || !lastState) {
      startLoop();
      return;
    }
    lastStructure = "";
    tearDownCity();
    cityPhase = "static";
    showCityProgress(0.02);
    startLoop();
  }

  function setBoardQuality(choice) {
    var nextChoice = normalizeQuality(choice);
    var prevResolved = resolvedPreset;
    var prevAa = !!activeQuality.antialias;
    var prevCars = CAR_COUNT;
    if (Nexus.Quality) {
      Nexus.Quality.setManual(nextChoice === "auto" ? "auto" : nextChoice);
    }
    var changed = !qualityReady || nextChoice !== qualityChoice;
    resolveQuality(nextChoice);
    qualityReady = true;
    var rebuilt =
      changed ||
      prevResolved !== resolvedPreset ||
      prevAa !== !!activeQuality.antialias ||
      prevCars !== CAR_COUNT;
    if (!rebuilt && renderer) {
      applyQualityCounts();
      resize();
      applyLightsTheme();
      if (cityReady && (qualityParams() || {}).cars === 0) {
        spawnCars();
      }
      return resolvedPreset;
    }
    applyQualityToEngine(!!renderer);
    return resolvedPreset;
  }

  function makeFacadeTexture(seed) {
    var cnv = document.createElement("canvas");
    cnv.width = 64;
    cnv.height = 128;
    var g = cnv.getContext("2d");
    var night = isNight();
    g.fillStyle = night ? "#2a313c" : "#d5dde4";
    g.fillRect(0, 0, 64, 128);
    var rand = seeded(seed, seed * 3, 19);
    var row;
    var col;
    for (row = 0; row < 11; row++) {
      for (col = 0; col < 4; col++) {
        var lit = rand() > (night ? 0.38 : 0.55);
        if (night) {
          g.fillStyle = lit ? "#ffd27a" : "#151920";
        } else {
          g.fillStyle = lit ? "#8aa7bb" : "#6d7c8a";
        }
        g.fillRect(5 + col * 14, 6 + row * 11, 9, 7);
      }
    }
    var tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  function shareMat(material) {
    if (material && sharedMat) {
      sharedMat.add(material);
    }
    return material;
  }

  function shareGeo(geometry) {
    if (geometry && sharedGeo) {
      sharedGeo.add(geometry);
    }
    return geometry;
  }

  function isSharedMat(material) {
    return !!(material && sharedMat && sharedMat.has(material));
  }

  function ownMat(material) {
    if (!material || !material.clone) {
      return material;
    }
    var copy = material.clone();
    if (copy.userData) {
      copy.userData.shared = false;
    }
    return copy;
  }

  function roadTexture() {
    var canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    var g = canvas.getContext("2d");
    g.fillStyle = "#5c636b";
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = "#4e555c";
    g.fillRect(0, 0, 6, 128);
    g.fillRect(58, 0, 6, 128);
    g.fillStyle = "#e6e0d4";
    g.fillRect(29, 16, 6, 22);
    g.fillRect(29, 70, 6, 22);
    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function lambert(color, opts) {
    opts = opts || {};
    return new THREE.MeshLambertMaterial({
      color: color,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0,
      map: opts.map || null,
      emissiveMap: opts.emissiveMap || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite,
      polygonOffset: !!opts.polygonOffset,
      polygonOffsetFactor: opts.polygonOffsetFactor || 0,
      polygonOffsetUnits: opts.polygonOffsetUnits || 0
    });
  }

  function basic(color, opts) {
    opts = opts || {};
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite,
      depthTest: opts.depthTest === undefined ? true : opts.depthTest,
      polygonOffset: !!opts.polygonOffset,
      polygonOffsetFactor: opts.polygonOffsetFactor || 0,
      polygonOffsetUnits: opts.polygonOffsetUnits || 0
    });
  }

  function buildGeos() {
    geo.box = shareGeo(new THREE.BoxGeometry(1, 1, 1));
    geo.cyl6 = shareGeo(new THREE.CylinderGeometry(1, 1, 1, 6));
    geo.cyl8 = shareGeo(new THREE.CylinderGeometry(1, 1, 1, 8));
    geo.cyl12 = shareGeo(new THREE.CylinderGeometry(1, 1, 1, 12));
    geo.junctionTri = shareGeo(new THREE.CylinderGeometry(ROAD_W / Math.sqrt(3), ROAD_W / Math.sqrt(3), 1, 3));
    geo.sphere = shareGeo(new THREE.SphereGeometry(1, 10, 8));
    geo.cone = shareGeo(new THREE.ConeGeometry(1, 1, 6));
    geo.plane = shareGeo(new THREE.PlaneGeometry(1, 1));
    geo.car = shareGeo(new THREE.BoxGeometry(0.85, 0.48, 1.85));
    geo.cabin = shareGeo(new THREE.BoxGeometry(0.72, 0.34, 0.92));
    buildVehicleGeos();
  }

  function mergeParts(parts) {
    var positions = [];
    var normals = [];
    var colors = [];
    var indices = [];
    var offset = 0;
    parts.forEach(function (part) {
      var src = part.geo;
      var pos = src.attributes.position;
      var nor = src.attributes.normal;
      var idx = src.index;
      var m4 = new THREE.Matrix4();
      var quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(part.rx || 0, part.ry || 0, part.rz || 0));
      m4.compose(
        new THREE.Vector3(part.x || 0, part.y || 0, part.z || 0),
        quat,
        new THREE.Vector3(part.sx || 1, part.sy || 1, part.sz || 1)
      );
      var nmat = new THREE.Matrix3().getNormalMatrix(m4);
      var color = new THREE.Color(part.color || "#f4f0ea");
      var i;
      for (i = 0; i < pos.count; i++) {
        var v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m4);
        positions.push(v.x, v.y, v.z);
        var n = new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)).applyMatrix3(nmat).normalize();
        normals.push(n.x, n.y, n.z);
        colors.push(color.r, color.g, color.b);
      }
      if (idx) {
        for (i = 0; i < idx.count; i++) {
          indices.push(idx.getX(i) + offset);
        }
      }
      offset += pos.count;
    });
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    return geometry;
  }

  function axleWheel(x, z, r) {
    return { geo: geo.cyl8, x: x, y: r, z: z, sx: r, sy: 0.12, sz: r, rz: Math.PI / 2, color: "#2c2c30" };
  }

  function buildVehicleGeos() {
    var box = geo.box;
    /* Karosserie weiß: Instance-Farbe steuert Neutral-Grau vs. Linien-Farbe ohne Creme/Blau-Mix. */
    geo.vehCar = shareGeo(mergeParts([
      { geo: box, y: 0.36, sx: 0.86, sy: 0.36, sz: 1.7, color: "#ffffff" },
      { geo: box, y: 0.68, z: -0.12, sx: 0.72, sy: 0.28, sz: 0.78, color: "#ffffff" },
      axleWheel(-0.4, 0.55, 0.16), axleWheel(0.4, 0.55, 0.16), axleWheel(-0.4, -0.55, 0.16), axleWheel(0.4, -0.55, 0.16)
    ]));
    geo.vehVan = shareGeo(mergeParts([
      { geo: box, y: 0.5, sx: 0.94, sy: 0.64, sz: 2.05, color: "#ffffff" },
      { geo: box, y: 0.78, z: 0.42, sx: 0.72, sy: 0.28, sz: 0.5, color: "#ffffff" },
      axleWheel(-0.42, 0.7, 0.18), axleWheel(0.42, 0.7, 0.18), axleWheel(-0.42, -0.7, 0.18), axleWheel(0.42, -0.7, 0.18)
    ]));
    geo.vehBus = shareGeo(mergeParts([
      { geo: box, y: 0.78, sx: 1.15, sy: 1.05, sz: 3.6, color: "#ffffff" },
      { geo: box, y: 0.95, z: 0.05, sx: 1.02, sy: 0.48, sz: 2.5, color: "#d8d8d8" },
      { geo: box, y: 1.22, z: 1.45, sx: 1.05, sy: 0.16, sz: 0.28, color: "#2c3440" },
      { geo: box, y: 0.42, z: 1.72, sx: 0.7, sy: 0.55, sz: 0.08, color: "#3a342c" },
      axleWheel(-0.55, 1.15, 0.24), axleWheel(0.55, 1.15, 0.24), axleWheel(-0.55, -1.05, 0.24), axleWheel(0.55, -1.05, 0.24)
    ]));
    geo.vehBike = shareGeo(mergeParts([
      { geo: box, y: 0.32, sx: 0.1, sy: 0.08, sz: 0.72, color: "#ffffff" },
      axleWheel(0, 0.28, 0.14), axleWheel(0, -0.28, 0.14)
    ]));
    geo.headBulb = shareGeo(new THREE.BoxGeometry(0.22, 0.12, 0.1));
    geo.headPool = shareGeo((function () {
      var plane = new THREE.PlaneGeometry(1, 1);
      plane.rotateX(-Math.PI / 2);
      return plane;
    })());
  }

  function buildMaterials() {
    if (mats) {
      var seen = [];
      Object.keys(mats).forEach(function (key) {
        var material = mats[key];
        if (!material || seen.indexOf(material) >= 0) {
          return;
        }
        seen.push(material);
        if (sharedMat && sharedMat.has(material)) {
          sharedMat.delete(material);
        }
        if (material.dispose) {
          material.dispose();
          disposeN += 1;
        }
      });
    }
    var night = isNight();
    ensureSprites();
    mats = {};
    mats.asphalt = lambert(css("--asphalt", "#6d747b"));
    mats.parkPad = lambert("#3a3d42");
    mats.lot = lambert(night ? "#3a3f46" : "#8b9198");
    mats.grass = lambert(css("--lu-park-top", "#8ac95c"));
    mats.grassDeep = lambert(css("--lu-park-side", "#5f9440"));
    mats.concrete = lambert(css("--w-concrete", "#dfe3e6"));
    mats.steel = lambert(css("--w-steel", "#b9c4ce"));
    mats.slate = lambert(css("--w-slate", "#c9d3dc"));
    mats.cream = lambert(css("--w-cream", "#fbf4e6"));
    mats.sand = mats.cream;
    mats.roof = lambert(css("--r-slate", "#5d7285"));
    mats.neutral = lambert(Nexus.UNCLAIMED_GRAY || "#E2E2E2");
    mats.neutralRoof = mats.neutral;
    mats.pv = lambert(css("--panel-pv", "#2e4a78"));
    mats.pvNight = lambert(css("--panel-pv", "#2e4a78"), {
      emissive: "#1a3358",
      emissiveIntensity: night ? 0.25 : 0
    });
    mats.tree = lambert(css("--tree-crown", "#4c9a49"));
    mats.tree2 = mats.tree;
    mats.trunk = lambert(css("--tree-trunk", "#7c5a3c"));
    mats.hill = lambert(css("--lu-hill-top", "#b7c0b4"));
    mats.ridge = lambert(css("--lu-ridge-side", "#8a7d6a"));
    mats.snow = lambert(css("--lu-ridge-top", "#c4b8a4"));
    /* Dunkelgrau, nicht pechschwarz — muss sich von schwarzen Feldern (#141416) abheben. */
    mats.road = lambert(night ? "#3a414a" : "#4a525c");
    /* Parkbucht = gleiche Farbe wie Fahrbahn. */
    mats.parkBay = mats.road;
    mats.mark = lambert("#f4f4f2");
    /* Parklinien = Straßenmarkierung (gleicher Ton wie Dash/Stop). */
    mats.parkMark = mats.mark;
    mats.signYellow = lambert("#f0c43a");
    mats.signYield = lambert("#e24b3a");
    mats.signRound = lambert("#f7f7f5");
    mats.brake = basic("#ff3030");
    mats.kerb = lambert(night ? "#6a6e74" : "#c5c0b6");
    mats.glass = lambert(css("--glass", "#8bb0c9"), {
      emissive: css("--window-lit", "#ffd88a"),
      emissiveIntensity: night ? 0.55 : 0.04
    });
    mats.windowLit = lambert("#ffd27a", {
      emissive: "#ffd27a",
      emissiveIntensity: night ? 1.15 : 0.08
    });
    mats.lamp = lambert("#ffd98a", {
      emissive: "#ffd98a",
      emissiveIntensity: night ? 1.85 : 0.12
    });
    mats.lampPole = lambert(night ? "#2b3036" : "#6a7178");
    mats.lampPool = basic("#ffd08a", {
      transparent: true,
      opacity: night ? 0.42 : 0,
      depthWrite: false
    });
    if (spriteTextures.lightPool) {
      mats.lampPool.map = spriteTextures.lightPool;
      mats.lampPool.needsUpdate = true;
    }
    mats.red = lambert("#ff4d3a", { emissive: "#ff4d3a", emissiveIntensity: 0.2 });
    mats.yellow = lambert("#ffd14a", { emissive: "#ffd14a", emissiveIntensity: 0.2 });
    mats.green = lambert("#3dce6a", { emissive: "#3dce6a", emissiveIntensity: 0.2 });
    mats.housing = lambert(night ? "#1c1f24" : "#3a3f46");
    mats.plus = lambert("#2a8f8a", { emissive: "#2a8f8a", emissiveIntensity: night ? 0.45 : 0.12 });
    mats.plusRec = lambert("#d6942a", { emissive: "#d6942a", emissiveIntensity: 0.55 });
    mats.gizmoCam = lambert("#f2f6fa", { emissive: "#ff3a2a", emissiveIntensity: night ? 1.35 : 0.72 });
    mats.gizmoLock = lambert("#ffd14a", { emissive: "#ffb000", emissiveIntensity: night ? 1.1 : 0.55 });
    mats.gizmoHot = lambert("#ff8a3a", { emissive: "#ff6a18", emissiveIntensity: night ? 1.15 : 0.5 });
    mats.gizmoCool = lambert("#3ee0c4", { emissive: "#1aa890", emissiveIntensity: night ? 1.05 : 0.42 });
    function colorLuma(hex) {
      var c = new THREE.Color(hex);
      return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    }
    function colorChroma(hex) {
      var c = new THREE.Color(hex);
      return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    }
    /* Nur echtes Schwarz als „dark“. Kräftiges Rot/Blau ist „hot“ — sonst Neon/Schlamm. */
    function colorFlags(hex) {
      var luma = colorLuma(hex);
      var chroma = colorChroma(hex);
      var dark = luma < 0.08;
      var hot = !dark && chroma > 0.48 && luma < 0.42;
      return { luma: luma, chroma: chroma, dark: dark, hot: hot };
    }
    function ownerPadOf(hex) {
      var c = new THREE.Color(hex);
      var flags = colorFlags(hex);
      if (flags.dark) {
        /* Pad bleibt „schwarz“, aber leicht angehoben — Kontur gegen Straße. */
        c.lerp(new THREE.Color("#2c3038"), night ? 0.28 : 0.22);
      } else if (flags.hot) {
        /* Rot/kräftiges Blau: abdunkeln + fast kein Glow — sonst Neon über Asphalt/Parken. */
        c.lerp(new THREE.Color("#1a0c0c"), night ? 0.32 : 0.24);
      } else if (night) {
        c.lerp(new THREE.Color("#1a2430"), 0.14);
      }
      var em = flags.dark ? "#3a4048" : flags.hot ? c.clone().multiplyScalar(0.25) : new THREE.Color(hex);
      return lambert(c, {
        emissive: em,
        emissiveIntensity: night
          ? flags.dark
            ? 0.18
            : flags.hot
              ? 0.04
              : 0.28
          : flags.dark
            ? 0.08
            : flags.hot
              ? 0.015
              : 0.14
      });
    }
    function ownerRimOf(hex) {
      var flags = colorFlags(hex);
      var rim = new THREE.Color(hex);
      if (flags.dark) {
        rim.lerp(new THREE.Color("#9aa3b0"), 0.55);
      } else if (flags.hot) {
        rim.lerp(new THREE.Color("#fff0e8"), 0.18);
      }
      return lambert(rim, {
        emissive: flags.dark ? "#c0c8d4" : flags.hot ? rim.clone().multiplyScalar(0.55) : hex,
        emissiveIntensity: night
          ? flags.dark
            ? 0.55
            : flags.hot
              ? 0.22
              : 0.45
          : flags.dark
            ? 0.32
            : flags.hot
              ? 0.12
              : 0.22,
        transparent: true,
        opacity: 0.95
      });
    }
    function ownerTintOf(hex) {
      var flags = colorFlags(hex);
      var c = new THREE.Color(hex);
      if (flags.dark) {
        c.lerp(new THREE.Color("#6a717c"), 0.42);
      } else if (flags.hot) {
        c.lerp(new THREE.Color("#2a1818"), 0.12);
      }
      return lambert(c, {
        emissive: flags.dark ? "#5a6270" : flags.hot ? c.clone().multiplyScalar(0.4) : hex,
        emissiveIntensity: night
          ? flags.dark
            ? 0.22
            : flags.hot
              ? 0.08
              : 0.16
          : flags.dark
            ? 0.1
            : flags.hot
              ? 0.03
              : 0.06
      });
    }
    var themeColors = Nexus.PLAYER_COLORS || [];
    themeColors.forEach(function (hex, index) {
      /* Pads und Gebäude: volle Figurenfarbe, kaum Auswaschen.
         Dunkle Farben: stärkere Shade-Stufen, sonst verschwinden Volumen.
         Hot (Rot): weniger Glow, sonst frisst die Farbe die Parkbuchten. */
      mats["ownerPad" + index] = ownerPadOf(hex);
      mats["ownerRim" + index] = ownerRimOf(hex);
      mats["ownerTint" + index] = ownerTintOf(hex);
      var flags = colorFlags(hex);
      var shadeSteps = flags.dark
        ? [-0.04, 0.2, 0.36, 0.52]
        : flags.hot
          ? [-0.1, -0.02, 0.04, 0.1]
          : [-0.06, 0, 0.04, 0.09];
      shadeSteps.forEach(function (t, shade) {
        var c = new THREE.Color(hex);
        if (flags.dark) {
          c.lerp(new THREE.Color("#6e7582"), 0.28);
        } else if (flags.hot) {
          c.lerp(new THREE.Color("#1c1010"), 0.1);
        }
        if (t !== 0) {
          c.lerp(
            new THREE.Color(t < 0 ? "#0e0e10" : flags.dark ? "#d8dde6" : "#ffffff"),
            Math.abs(t)
          );
        }
        mats["shade" + index + "_" + shade] = lambert(c, {
          emissive: flags.dark ? "#4a5260" : flags.hot ? c.clone().multiplyScalar(0.35) : hex,
          emissiveIntensity: night
            ? flags.dark
              ? 0.18
              : flags.hot
                ? 0.07
                : 0.12
            : flags.dark
              ? 0.08
              : flags.hot
                ? 0.03
                : 0.05
        });
      });
    });
    if (!mats.ownerPad0) {
      mats.ownerPad0 = ownerPadOf(themeColors[0] || "#1FA83A");
      mats.ownerRim0 = ownerRimOf(themeColors[0] || "#1FA83A");
      mats.ownerTint0 = ownerTintOf(themeColors[0] || "#1FA83A");
    }
    mats.path = lambert(night ? "#8a7f72" : "#d9cfc0");
    mats.zebra = basic("#ffffff");
    mats.pedCloth = lambert("#6b7c8c");
    mats.hit = basic("#ffffff", { transparent: true, opacity: 0, depthWrite: false });
    mats.bin = lambert(night ? "#3c444c" : "#6b737a");
    mats.bench = lambert(night ? "#5a4634" : "#b08962");
    mats.car = lambert(Nexus.UNCLAIMED_GRAY || "#E2E2E2");
    mats.vehicle = new THREE.MeshLambertMaterial({ vertexColors: true });
    mats.headlamp = new THREE.MeshBasicMaterial({
      color: "#fff6d2",
      transparent: true,
      opacity: night ? 0.95 : 0.2,
      depthWrite: false
    });
    mats.headPool = new THREE.MeshBasicMaterial({
      color: "#ffe8a8",
      transparent: true,
      opacity: night ? 0.7 : 0.08,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    if (spriteTextures.lightPool) {
      mats.headPool.map = spriteTextures.lightPool;
      mats.headPool.needsUpdate = true;
    }
    mats.cabin = lambert(css("--glass", "#8bb0c9"), {
      emissive: "#9ec4dc",
      emissiveIntensity: night ? 0.45 : 0.06
    });
    mats.carAccent = lambert(night ? "#c2503f" : "#c04b6e");
    mats.select = lambert("#ffffff", {
      emissive: css("--accent", "#2f7fb5"),
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.35
    });
    /* Basic: harte Kante; depthTest an, damit Puls nicht über Straßen-Pixel malt. */
    mats.buildPulse = basic("#5ee8c8", {
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    mats.tileDim = basic("#0a1218", {
      transparent: true,
      opacity: night ? 0.35 : 0.22,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    mats.island = lambert((biomeTheme() && biomeTheme().plate) || css("--lu-farm-top", "#c4beb4"));
    mats.waterless = lambert((biomeTheme() && biomeTheme().plateDeep) || css("--lu-hill-deep", "#5a6558"));
    mats.horizon = lambert((biomeTheme() && biomeTheme().horizon) || css("--lu-hill-side", "#7e8a7c"));
    mats.plate = lambert((biomeTheme() && biomeTheme().plate) || "#6faf4a");
    mats.plateDeep = lambert((biomeTheme() && biomeTheme().plateDeep) || "#4f8634");
    var uses = {
      residential: "--lu-res-top",
      "energy-solar": "--lu-solar-top",
      "energy-wind": "--lu-solar-top",
      "energy-transformer": "--lu-trafo-top",
      "energy-coal": "--lu-trafo-top",
      "energy-nuclear": "--lu-trafo-top",
      "datacenter-insecure": "--lu-dcopen-top",
      "datacenter-secure": "--lu-dcsafe-top",
      server: "--lu-dcsafe-top",
      admin: "--lu-dcopen-top",
      "commerce-factory": "--lu-traffic-top",
      "commerce-enterprise": "--lu-home-top",
      "commerce-small": "--lu-home-top",
      "commerce-large": "--lu-home-top",
      "commerce-recycle": "--lu-farm-top",
      traffic: "--lu-traffic-top",
      "traffic-garage": "--lu-traffic-top",
      taxi: "--lu-traffic-top",
      yard: "--lu-traffic-top",
      station: "--lu-traffic-top",
      workshop: "--lu-farm-top",
      home: "--lu-home-top",
      park: "--lu-park-top"
    };
    Object.keys(uses).forEach(function (key) {
      mats["pad-" + key] = lambert(css(uses[key], "#c8cfd6"));
    });
    /* Uncontrolled empty lots stay city-gray-green, not pure biome plate. */
    mats["pad-grass"] = lambert(night ? "#4a5560" : "#a8b4a0");
    mats.facade0 = lambert("#d7dee5", {
      map: makeFacadeTexture(1),
      emissiveMap: makeFacadeTexture(1),
      emissive: "#ffd27a",
      emissiveIntensity: night ? 0.85 : 0.05
    });
    mats.facade1 = mats.facade0;
    mats.facade2 = mats.facade0;
    Object.keys(mats).forEach(function (key) {
      shareMat(mats[key]);
    });
    captureGray();
  }

  function applyLightsTheme() {
    var night = isNight();
    var theme = biomeTheme();
    ensureSprites();
    if (extras.hemi) {
      extras.hemi.color.set(theme ? theme.hemiSky : night ? "#8eb0d8" : "#fff6e8");
      extras.hemi.groundColor.set(theme ? theme.hemiGround : night ? "#1e2a30" : "#c8e0a8");
      extras.hemi.intensity = theme ? theme.hemi : night ? 0.55 : 0.92;
    }
    if (extras.sun) {
      extras.sun.color.set(theme ? theme.sun : night ? "#c8d8f0" : "#ffe2a8");
      extras.sun.intensity = theme ? theme.sunI : night ? 0.42 : 1.15;
      extras.sun.position.set(night ? -36 : 58, night ? 48 : 78, night ? -18 : 34);
    }
    if (extras.ambient) {
      extras.ambient.color.set(night ? "#a8b8d0" : "#ffffff");
      extras.ambient.intensity = theme ? theme.ambient : night ? 0.38 : 0.42;
    }
    if (extras.moon && night) {
      extras.moon.intensity = 0.35;
      extras.moon.visible = true;
    } else if (extras.moon) {
      extras.moon.intensity = 0;
      extras.moon.visible = false;
    }
    var skyCol = theme ? theme.sky : night ? "#1a2a3a" : "#a8e0de";
    var fogCol = theme ? theme.fog : night ? "#1c2e3c" : "#b8e4dc";
    scene.background = new THREE.Color(skyCol);
    var tuned = qualityParams();
    if (tuned && tuned.fog === false) {
      scene.fog = null;
    } else {
      scene.fog = new THREE.Fog(new THREE.Color(fogCol), FOG_NEAR, FOG_FAR);
    }
    if (extras.sun) {
      extras.sun.castShadow = !!(tuned && tuned.shadows);
      if (tuned && tuned.shadows && extras.sun.shadow && extras.sun.shadow.mapSize) {
        extras.sun.shadow.mapSize.set(tuned.shadowMap || 512, tuned.shadowMap || 512);
      }
    }
    if (renderer && renderer.shadowMap) {
      renderer.shadowMap.enabled = !!(tuned && tuned.shadows);
    }
    if (renderer) {
      renderer.setClearColor(skyCol, 1);
    }
  }

  function nowMs() {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  function liveParent(parent) {
    var node = parent;
    while (node) {
      if (node.userData && node.userData.live) {
        return true;
      }
      node = node.parent;
    }
    return false;
  }

  function canBatch(parent, mat) {
    if (!batchOn || forceMesh || !mat || liveParent(parent)) {
      return false;
    }
    if (mat === mats.roof || mat === mats.slate) {
      return false;
    }
    return true;
  }

  function batchHandle(item) {
    var rot = { x: 0, y: item.ry || 0, z: 0 };
    item.rot = rot;
    return { rotation: rot, position: { x: item.x, y: item.y, z: item.z }, isMesh: false };
  }

  function rememberBatch(parent, mat, geoKey, x, y, z, sx, sy, sz, ry) {
    var item = { parent: parent, mat: mat, geoKey: geoKey, x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, ry: ry || 0, slot: batchSlot };
    batchItems.push(item);
    return batchHandle(item);
  }

  function addBox(parent, mat, w, h, d, x, y0, z, ry) {
    if (canBatch(parent, mat)) {
      return rememberBatch(parent, mat, "box", x, y0 + h / 2, z, w, h, d, ry);
    }
    var mesh = new THREE.Mesh(geo.box, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y0 + h / 2, z);
    if (ry) {
      mesh.rotation.y = ry;
    }
    if (propMode) {
      mesh.userData.prop = true;
    }
    if (keepMode) {
      mesh.userData.keep = true;
    }
    parent.add(mesh);
    return mesh;
  }

  function addCyl(parent, mat, rTop, rBot, h, x, y0, z, segs) {
    var g = segs === 6 ? geo.cyl6 : segs === 8 ? geo.cyl8 : geo.cyl12;
    if (canBatch(parent, mat)) {
      return rememberBatch(parent, mat, segs === 6 ? "cyl6" : segs === 8 ? "cyl8" : "cyl12", x, y0 + h / 2, z, rTop, h, rBot || rTop, segs === 6 ? Math.PI / 6 : 0);
    }
    var mesh = new THREE.Mesh(g, mat);
    mesh.scale.set(rTop, h, rBot || rTop);
    mesh.position.set(x, y0 + h / 2, z);
    if (segs === 6) {
      mesh.rotation.y = Math.PI / 6;
    }
    if (propMode) {
      mesh.userData.prop = true;
    }
    if (keepMode) {
      mesh.userData.keep = true;
    }
    parent.add(mesh);
    return mesh;
  }

  function addSphere(parent, mat, r, x, y, z) {
    if (canBatch(parent, mat)) {
      return rememberBatch(parent, mat, "sphere", x, y, z, r, r, r, 0);
    }
    var mesh = new THREE.Mesh(geo.sphere, mat);
    mesh.scale.set(r, r, r);
    mesh.position.set(x, y, z);
    if (propMode) {
      mesh.userData.prop = true;
    }
    if (keepMode) {
      mesh.userData.keep = true;
    }
    parent.add(mesh);
    return mesh;
  }

  function worldOf(parent, x, y, z) {
    var node = parent;
    var guard = 0;
    while (node && guard < 16) {
      x += node.position ? node.position.x || 0 : 0;
      y += node.position ? node.position.y || 0 : 0;
      z += node.position ? node.position.z || 0 : 0;
      node = node.parent;
      guard += 1;
    }
    return { x: x, y: y, z: z };
  }

  function flushBatches(reuse) {
    var items;
    if (reuse) {
      items = batchItems;
    } else {
      keptBatches = keptBatches.concat(batchItems);
      items = keptBatches;
    }
    batchItems = [];
    if (!items.length) {
      return;
    }
    if (!roots.batches) {
      roots.batches = new THREE.Group();
      if (scene) {
        scene.add(roots.batches);
      }
    }
    var buckets = [];
    items.forEach(function (item) {
      var found = null;
      buckets.forEach(function (bucket) {
        if (bucket.mat === item.mat && bucket.geoKey === item.geoKey) {
          found = bucket;
        }
      });
      if (!found) {
        found = { mat: item.mat, geoKey: item.geoKey, items: [] };
        buckets.push(found);
      }
      found.items.push(item);
    });
    dummy = dummy || new THREE.Object3D();
    buckets.forEach(function (bucket) {
      var geometry = geo[bucket.geoKey] || geo.box;
      var mesh = new THREE.InstancedMesh(geometry, bucket.mat, bucket.items.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      bucket.items.forEach(function (item, index) {
        var at = worldOf(item.parent, item.x, item.y, item.z);
        var rot = item.rot || { x: 0, y: item.ry || 0, z: 0 };
        dummy.position.set(at.x, at.y, at.z);
        dummy.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
        dummy.scale.set(item.sx, item.sy, item.sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      roots.batches.add(mesh);
    });
  }

  function rebuildBatchMeshes() {
    if (roots.batches) {
      clearGroup(roots.batches);
    }
    batchItems = keptBatches.slice();
    flushBatches(true);
  }

  function pushGray() {
    grayMode += 1;
    if (grayMode === 1 && grayMats) {
      matBackup = mats;
      mats = grayMats;
    }
  }

  function popGray() {
    grayMode = Math.max(0, grayMode - 1);
    if (!grayMode && matBackup) {
      mats = matBackup;
      matBackup = null;
    }
  }

  function captureGray() {
    if (grayMats) {
      Object.keys(grayMats).forEach(function (key) {
        var material = grayMats[key];
        if (material && material.dispose && (!mats || mats[key] !== material)) {
          material.dispose();
        }
      });
    }
    grayMats = {};
    Object.keys(mats).forEach(function (key) {
      var src = mats[key];
      if (!src || !src.color || src.opacity === 0) {
        grayMats[key] = src;
        return;
      }
      var grayHex = Nexus.UNCLAIMED_GRAY || "#E2E2E2";
      /* Leichtes Emissive: gleiche Albedo wirkt unter Licht nicht unterschiedlich warm/kalt. */
      grayMats[key] = lambert(grayHex, {
        transparent: !!src.transparent,
        opacity: src.opacity == null ? 1 : src.opacity,
        depthWrite: src.depthWrite !== false,
        emissive: grayHex,
        emissiveIntensity: isNight() ? 0.08 : 0.18
      });
      shareMat(grayMats[key]);
    });
  }

  function propBudget(base) {
    var tuned = qualityParams();
    var mul = tuned && tuned.props ? tuned.props : 1;
    return Math.max(1, Math.round((base || 3) * mul));
  }

  function addInstances(geom, mat, poses, parent) {
    if (!poses.length) {
      return null;
    }
    dummy = dummy || new THREE.Object3D();
    var mesh = new THREE.InstancedMesh(geom, mat, poses.length);
    var i;
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;
    var minZ = Infinity;
    var maxZ = -Infinity;
    for (i = 0; i < poses.length; i++) {
      var p = poses[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.ry || 0, 0);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    mesh.instanceMatrix.needsUpdate = true;
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;
    var cz = (minZ + maxZ) / 2;
    var span = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2 + 4;
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), span);
    mesh.frustumCulled = true;
    parent.add(mesh);
    return mesh;
  }

  function dropProp(parent, kind, variant, x, z, s, gray) {
    var leaf = gray ? mats.neutral : mats.tree;
    var leaf2 = gray ? mats.neutralRoof : mats.grassDeep;
    var wood = gray ? mats.neutral : mats.roof;
    var metal = gray ? mats.neutral : mats.slate;
    s = s || 1;
    variant = variant % 3;
    if (kind === "bush") {
      if (variant === 0) {
        addSphere(parent, leaf, 0.42 * s, x, TILE_H + 0.32 * s, z);
        addSphere(parent, leaf2, 0.26 * s, x + 0.22 * s, TILE_H + 0.24 * s, z + 0.08 * s);
      } else if (variant === 1) {
        addSphere(parent, leaf2, 0.3 * s, x - 0.16 * s, TILE_H + 0.26 * s, z);
        addSphere(parent, leaf, 0.3 * s, x + 0.16 * s, TILE_H + 0.3 * s, z + 0.06 * s);
        addSphere(parent, leaf, 0.18 * s, x, TILE_H + 0.48 * s, z);
      } else {
        addCyl(parent, wood, 0.07 * s, 0.09 * s, 0.28 * s, x, TILE_H, z, 6);
        addSphere(parent, leaf, 0.36 * s, x, TILE_H + 0.42 * s, z);
        addSphere(parent, leaf2, 0.18 * s, x + 0.16 * s, TILE_H + 0.34 * s, z - 0.1 * s);
      }
      return;
    }
    if (kind === "bin") {
      var yaw = variant * 0.6;
      addBox(parent, metal, 0.32, 0.46, 0.28, x, TILE_H + 0.23, z, yaw);
      addBox(parent, wood, 0.34, 0.06, 0.3, x, TILE_H + 0.48, z, yaw);
      if (variant === 2) {
        addBox(parent, metal, 0.22, 0.34, 0.2, x + 0.28, TILE_H + 0.17, z + 0.08, yaw);
      }
      return;
    }
    if (kind === "bench") {
      addBox(parent, wood, 1.05, 0.08, 0.34, x, TILE_H + 0.28, z, 0);
      addBox(parent, wood, 0.08, 0.28, 0.34, x - 0.46, TILE_H + 0.28, z, 0);
      addBox(parent, wood, 0.08, 0.28, 0.34, x + 0.46, TILE_H + 0.28, z, 0);
      if (variant !== 1) {
        addBox(parent, wood, 1.05, 0.28, 0.06, x, TILE_H + 0.46, z - 0.14, 0);
      }
    }
  }

  function kenneyPropsOk() {
    return !!(
      Nexus.KenneyBuildings &&
      Nexus.KenneyBuildings.isReady &&
      Nexus.KenneyBuildings.isReady() &&
      Nexus.KenneyBuildings.qualityAllows(kenneyTierNow())
    );
  }

  function tree(parent, x, z, s, alt) {
    if (
      kenneyPropsOk() &&
      Nexus.KenneyBuildings.placeProp(parent, alt ? "treeLarge" : "treeSmall", x, TILE_H, z, {
        yaw: (x * 12.3 + z * 7.1) % (Math.PI * 2),
        shadows: !!(qualityParams() && qualityParams().shadows)
      })
    ) {
      return;
    }
    if (kenneyPropsOk()) {
      return;
    }
    var fallback = new THREE.Group();
    fallback.userData.greenProp = true;
    dropProp(fallback, "bush", alt ? 2 : 0, x, z, s || 1, false);
    parent.add(fallback);
  }

  function bush(parent, x, z, s, alt) {
    var propId = alt ? "bushWide" : "bushSmall";
    if (
      kenneyPropsOk() &&
      Nexus.KenneyBuildings.placeProp(parent, propId, x, TILE_H, z, {
        yaw: (x * 9.1 + z * 5.7) % (Math.PI * 2),
        shadows: !!(qualityParams() && qualityParams().shadows)
      })
    ) {
      return;
    }
    if (kenneyPropsOk()) {
      return;
    }
    var fallback = new THREE.Group();
    fallback.userData.greenProp = true;
    dropProp(fallback, "bush", alt ? 1 : 0, x, z, (s || 1) * 0.85, false);
    parent.add(fallback);
  }

  /* Weltpunkt zu nah an einer Parkbucht? (Pad + Slots — nach Umplatzierung). */
  function nearParkingWorld(wx, wz, margin) {
    margin = margin != null ? margin : TREE_PARK_MARGIN;
    if (!parkingCatalog || !parkingCatalog.features || !Nexus.BoardEdges) {
      return false;
    }
    var i;
    for (i = 0; i < parkingCatalog.features.length; i++) {
      var feature = parkingCatalog.features[i];
      if (!feature.pad || feature.kind === "none" || feature.kind === "bus_stop") {
        continue;
      }
      var pad = feature.pad;
      var along = feature.frame.along;
      var out = feature.frame.out;
      var dx = wx - pad.center.x;
      var dz = wz - pad.center.z;
      var u = dx * along.x + dz * along.z;
      var v = dx * out.x + dz * out.z;
      if (Math.abs(u) <= pad.len * 0.5 + margin * 0.55 && Math.abs(v) <= pad.width * 0.5 + margin * 0.65) {
        return true;
      }
      var slots = feature.slots || [];
      var si;
      for (si = 0; si < slots.length; si++) {
        var pose = Nexus.BoardEdges.featureSlotPose(feature, si);
        if (!pose) {
          continue;
        }
        if (Math.hypot(wx - pose.x, wz - pose.z) < 1.35 + margin * 0.2) {
          return true;
        }
      }
    }
    return false;
  }

  function pruneGreensNearParking(q, r) {
    var key = q + "," + r;
    var group = tileGroups[key];
    if (!group || !parkingCatalog) {
      return;
    }
    var center = axial(q, r);
    var doomed = [];
    group.children.forEach(function (ch) {
      if (!(ch.userData && ch.userData.greenProp)) {
        return;
      }
      var wx = center.x + (ch.position.x || 0);
      var wz = center.z + (ch.position.z || 0);
      if (nearParkingWorld(wx, wz, TREE_PARK_MARGIN)) {
        doomed.push(ch);
      }
    });
    doomed.forEach(function (ch) {
      group.remove(ch);
      disposeTree(ch);
    });
  }

  function edgeHasActiveParking(edgeId) {
    if (!edgeId || !parkingCatalog || !parkingCatalog.byEdge) {
      return false;
    }
    var list = parkingCatalog.byEdge[edgeId] || [];
    var i;
    for (i = 0; i < list.length; i++) {
      var kind = list[i].kind;
      if (kind && kind !== "none" && kind !== "bus_stop") {
        return true;
      }
    }
    return false;
  }

  /* Lampen an Kanten mit (oder nach Umparken neu auf) Parkbuchten entfernen. */
  function pruneStreetLampsNearParking() {
    if (!roots.roads) {
      return;
    }
    var doomed = [];
    roots.roads.children.forEach(function (ch) {
      var ud = ch.userData || {};
      if (!ud.streetLamp && !ud.streetLampPool) {
        return;
      }
      var wx = ch.position.x;
      var wz = ch.position.z;
      if (edgeHasActiveParking(ud.edgeKey) || nearParkingWorld(wx, wz, 1.15)) {
        doomed.push(ch);
      }
    });
    doomed.forEach(function (ch) {
      roots.roads.remove(ch);
      disposeTree(ch);
    });
    if (doomed.length && lampPools && lampPools.length) {
      lampPools = lampPools.filter(function (pool) {
        return doomed.indexOf(pool) < 0;
      });
    }
  }

  function treeSpotOkLocal(q, r, lx, lz, mode) {
    var foot = mode === "park" ? 3.4 : BUILDING_FOOT;
    if (mode === "parking") {
      foot = 4.6;
    }
    if (Math.hypot(lx, lz) < foot) {
      return false;
    }
    if (Math.hypot(lx, lz) > FIELD_R - 0.55) {
      return false;
    }
    var c = axial(q, r);
    return !nearParkingWorld(c.x + lx, c.z + lz, TREE_PARK_MARGIN);
  }

  function treeSpotOkWorld(wx, wz) {
    if (nearParkingWorld(wx, wz, TREE_PARK_MARGIN)) {
      return false;
    }
    /* Nicht in die Gebäudemitte eines Tiles. */
    var radius = (Nexus.CONSTANTS && Nexus.CONSTANTS.HEX_RADIUS) || 3;
    var slots = Nexus.allSlots ? Nexus.allSlots(radius + DECO_RINGS) : [];
    var i;
    for (i = 0; i < slots.length; i++) {
      var s = slots[i];
      var c = axial(s.q, s.r);
      var d = Math.hypot(wx - c.x, wz - c.z);
      if (d < BUILDING_FOOT * 0.92) {
        return false;
      }
    }
    return true;
  }

  function lampPost(parent, x, z, tall) {
    if (kenneyPropsOk()) {
      Nexus.KenneyBuildings.placeProp(parent, tall && tall > 2.5 ? "lampCurved" : "lamp", x, TILE_H, z, {
        yaw: (x + z) * 0.3,
        shadows: !!(qualityParams() && qualityParams().shadows)
      });
      if (mats.lampPool) {
        var poolK = new THREE.Mesh(geo.plane, mats.lampPool);
        poolK.rotation.x = -Math.PI / 2;
        poolK.position.set(x, TILE_H + 0.04, z);
        poolK.scale.set(2.4, 2.4, 1);
        poolK.visible = isNight();
        parent.add(poolK);
        lampPools.push(poolK);
      }
      return null;
    }
    var h = tall || 2.4;
    addCyl(parent, mats.lampPole, 0.07, 0.09, h, x, TILE_H, z, 8);
    var head = addSphere(parent, mats.lamp, 0.16, x, TILE_H + h + 0.08, z);
    ensureSprites();
    if (spriteTextures.lampGlow) {
      addBillboard(parent, spriteTextures.lampGlow, x, TILE_H + h + 0.08, z, 1.8, 1.8, isNight() ? 0.85 : 0.08);
    }
    if (mats.lampPool) {
      var pool = new THREE.Mesh(geo.plane, mats.lampPool);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, TILE_H + 0.04, z);
      pool.scale.set(3.2, 3.2, 1);
      pool.visible = isNight();
      parent.add(pool);
      lampPools.push(pool);
    }
    return head;
  }

  function mast(parent, x, z, h) {
    addCyl(parent, mats.steel, 0.06, 0.08, h, x, TILE_H, z, 8);
    addSphere(parent, mats.lamp, 0.1, x, TILE_H + h + 0.08, z);
  }

  function dishMesh(parent, x, y, z) {
    var bowl = new THREE.Mesh(geo.sphere, mats.steel);
    bowl.scale.set(0.55, 0.22, 0.55);
    bowl.position.set(x, y, z);
    bowl.rotation.z = 0.45;
    parent.add(bowl);
    addCyl(parent, mats.steel, 0.05, 0.05, 0.7, x, y - 0.7, z, 8);
  }

  function charger(parent, x, z) {
    addBox(parent, mats.steel, 0.32, 1.15, 0.26, x, TILE_H, z, 0);
    addBox(parent, mats.gizmoLock, 0.4, 0.18, 0.32, x, TILE_H + 1.15, z, 0);
  }

  function hvac(parent, x, y, z) {
    addBox(parent, mats.steel, 0.7, 0.28, 0.5, x, y, z, 0);
  }

  /*
   * Abgabe tileId → visual (Kenney remap / mesh stub). Keine Regeln.
   * energy-wind      → kenney industrial/windmill(-low)
   * energy-nuclear   → kenney energy-nuclear
   * energy-coal      → kenney energy-transformer (Kohle/Halle)
   * energy-solar     → kenney energy-solar
   * commerce-factory → kenney commerce-factory
   * commerce-small   → kenney commerce-enterprise (Büro/Laden)
   * commerce-large   → kenney home (Skyline-Bulk)
   * commerce-recycle → kenney workshop (Schrott/Recycling)
   * data-residential → kenney residential
   * data-server      → kenney datacenter-secure
   * data-taxi        → kenney traffic-taxi
   * data-admin       → kenney datacenter (Büro/Verwaltung)
   * misc-yard        → kenney traffic-garage (Lager/Park)
   * misc-station     → kenney traffic-taxi (Bahnhofshallen)
   * misc-park        → kenney park
   */
  var TILE_PAD_KEYS = {
    "energy-wind": "energy-wind",
    "energy-nuclear": "energy-nuclear",
    "energy-coal": "energy-coal",
    "energy-solar": "energy-solar",
    "commerce-factory": "commerce-factory",
    "commerce-small": "commerce-small",
    "commerce-large": "commerce-large",
    "commerce-recycle": "commerce-recycle",
    "data-residential": "residential",
    "data-server": "server",
    "data-taxi": "taxi",
    "data-admin": "admin",
    "misc-yard": "yard",
    "misc-station": "station",
    "misc-park": "park"
  };

  function boardTileId(zone) {
    if (!zone) {
      return null;
    }
    if (Nexus.tileIdFromZone) {
      return Nexus.tileIdFromZone(zone);
    }
    if (zone.tileId) {
      return zone.tileId;
    }
    return null;
  }

  /* Zone-Shape für KenneyBuildings.catalog / BoardKit — nur Optik. */
  function kenneyAliasZone(zone) {
    var tileId = boardTileId(zone);
    if (tileId === "energy-wind") {
      return { type: "energy", variant: "wind" };
    }
    if (tileId === "energy-nuclear") {
      return { type: "energy", variant: "nuclear" };
    }
    if (tileId === "energy-coal") {
      return { type: "energy", variant: "transformer" };
    }
    if (tileId === "energy-solar") {
      return { type: "energy", variant: "solar" };
    }
    if (tileId === "commerce-factory") {
      return { type: "commerce", variant: "factory" };
    }
    if (tileId === "commerce-small") {
      return { type: "commerce", variant: "enterprise" };
    }
    if (tileId === "commerce-large") {
      return { type: "home" };
    }
    if (tileId === "commerce-recycle") {
      return { type: "workshop" };
    }
    if (tileId === "data-residential") {
      return { type: "residential" };
    }
    if (tileId === "data-server") {
      return { type: "datacenter", variant: "secure" };
    }
    if (tileId === "data-taxi") {
      return { type: "traffic", variant: "taxi", trafficMode: "taxi" };
    }
    if (tileId === "data-admin") {
      return { type: "datacenter" };
    }
    if (tileId === "misc-yard") {
      return { type: "traffic", variant: "garage", trafficMode: "garage" };
    }
    if (tileId === "misc-station") {
      return { type: "traffic", variant: "taxi", trafficMode: "taxi" };
    }
    if (tileId === "misc-park") {
      return { type: "park" };
    }
    /* Legacy / home / unbekannte Typen: unverändert an Kenney. */
    return zone;
  }

  function dressKindForZone(zone) {
    var tileId = boardTileId(zone);
    if (
      tileId === "data-server" ||
      tileId === "data-admin" ||
      zone.type === "server" ||
      zone.type === "admin" ||
      zone.type === "datacenter"
    ) {
      return "datacenter";
    }
    if (
      tileId === "data-taxi" ||
      tileId === "misc-yard" ||
      tileId === "misc-station" ||
      zone.type === "taxi" ||
      zone.type === "yard" ||
      zone.type === "station" ||
      zone.type === "traffic"
    ) {
      return "traffic";
    }
    if (zone.type === "home") {
      return "home";
    }
    if (zone.type === "residential" || tileId === "data-residential") {
      return "residential";
    }
    if (zone.type === "energy" || (tileId && tileId.indexOf("energy-") === 0)) {
      return "energy";
    }
    return zone.type || "empty";
  }

  function landUseKey(zone) {
    if (!zone) {
      return "grass";
    }
    var tileId = boardTileId(zone);
    if (tileId && TILE_PAD_KEYS[tileId]) {
      return TILE_PAD_KEYS[tileId];
    }
    if (zone.type === "server") {
      return "server";
    }
    if (zone.type === "taxi") {
      return "taxi";
    }
    if (zone.type === "admin") {
      return "admin";
    }
    if (zone.type === "yard") {
      return "yard";
    }
    if (zone.type === "station") {
      return "station";
    }
    if (zone.variant) {
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

  function ownerPadMat(index) {
    var count = (Nexus.PLAYER_COLORS || []).length || 1;
    return mats["ownerPad" + (index % count)] || mats.ownerPad0;
  }

  function ownerTintMat(index) {
    var count = (Nexus.PLAYER_COLORS || []).length || 1;
    return mats["ownerTint" + (index % count)] || mats.ownerTint0;
  }

  function ownerRimMat(index) {
    var count = (Nexus.PLAYER_COLORS || []).length || 1;
    return mats["ownerRim" + (index % count)] || mats.ownerRim0;
  }

  function tintOwnedBuildings(group, colorIndex) {
    var count = (Nexus.PLAYER_COLORS || []).length || 1;
    var index = (colorIndex || 0) % count;
    var skipMat = [
      mats.asphalt,
      mats.road,
      mats.mark,
      mats.zebra,
      mats.car,
      mats.lot,
      mats.glass,
      mats.pv,
      mats.pvNight,
      mats.grass,
      mats.grassDeep,
      mats["pad-grass"],
      mats["pad-park"]
    ];
    group.traverse(function (obj) {
      if (!obj.isMesh || !obj.material) {
        return;
      }
      if (
        obj.userData &&
        (obj.userData.prop || obj.userData.keep || obj.userData.kenney || obj.userData.pick || obj.userData.hl)
      ) {
        return;
      }
      if (skipMat.indexOf(obj.material) >= 0) {
        return;
      }
      var y = obj.position ? obj.position.y : 0;
      var shade = y > TILE_H + 6 ? 3 : y > TILE_H + 3 ? 2 : y > TILE_H + 0.5 ? 1 : 0;
      var mat = mats["shade" + index + "_" + shade] || mats["ownerTint" + index];
      if (mat) {
        obj.material = mat;
      }
    });
  }

  function facadeMat(q, r) {
    var n = Math.abs(q * 3 + r * 7) % 3;
    return mats["facade" + n];
  }

  function trafficKind(q, r, zone) {
    if (
      zone &&
      (zone.trafficMode === "taxi" ||
        zone.variant === "taxi" ||
        zone.trafficMode === "depot" ||
        zone.variant === "depot")
    ) {
      return "taxi";
    }
    return "garage";
  }

  function isTaxiZone(zone) {
    if (!zone) {
      return false;
    }
    if (zone.type === "taxi" || boardTileId(zone) === "data-taxi") {
      return true;
    }
    return zone.type === "traffic" && trafficKind(zone.q, zone.r, zone) === "taxi";
  }

  function desaturateGroup(group) {
    var flat = mats.neutral;
    group.traverse(function (obj) {
      if (!obj.isMesh || !obj.material) {
        return;
      }
      if (obj.material === mats.grass || obj.material === mats.grassDeep || obj.material === mats.lot) {
        return;
      }
      obj.material = flat;
    });
  }

  function gizmosFor(state, zone) {
    var out = {};
    if (!zone) {
      return out;
    }
    var owner = state.players.filter(function (p) {
      return p.id === zone.ownerId;
    })[0];
    if (!owner) {
      return out;
    }
    var gadgets = Nexus.boardGadgetsFor ? Nexus.boardGadgetsFor(owner) : owner.devices || {};
    Object.keys(gadgets).forEach(function (id) {
      if (gadgets[id]) {
        out[id] = true;
      }
    });
    return out;
  }

  function dressDevices(group, kind, gizmos) {
    keepMode += 1;
    gizmos = gizmos || {};
    if (kind === "residential" || kind === "home" || kind === "datacenter") {
      if (gizmos.camera) {
        addCyl(group, mats.steel, 0.11, 0.13, 2.35, 2.55, TILE_H, 2.05, 8);
        addSphere(group, mats.gizmoCam, 0.34, 2.55, TILE_H + 2.55, 2.05);
        addBox(group, mats.housing, 0.42, 0.18, 0.22, 2.55, TILE_H + 2.28, 2.22, 0);
      }
      if (gizmos.lock) {
        addBox(group, mats.gizmoLock, 0.52, 0.72, 0.16, 0.2, TILE_H + 0.35, 2.22, 0);
        addSphere(group, mats.housing, 0.12, 0.2, TILE_H + 0.82, 2.3);
      }
    }
    if (kind === "residential" || kind === "home") {
      if (gizmos.thermostat) {
        addBox(group, mats.gizmoHot, 0.55, 0.7, 0.22, -2.15, TILE_H + 1.4, 2.05, 0);
        addBox(group, mats.cream, 0.28, 0.12, 0.08, -2.15, TILE_H + 1.72, 2.16, 0);
      }
    }
    if (kind === "residential") {
      if (gizmos.shutters) {
        addBox(group, mats.gizmoCool, 3.1, 0.14, 0.12, 0, TILE_H + 3.35, 1.72, 0);
        addBox(group, mats.gizmoCool, 3.1, 0.14, 0.12, 0, TILE_H + 3.95, 1.72, 0);
        addBox(group, mats.gizmoCool, 3.1, 0.14, 0.12, 0, TILE_H + 4.55, 1.72, 0);
      }
      if (gizmos.hems) {
        addBox(group, mats.gizmoCool, 0.85, 0.48, 0.55, -1.15, TILE_H + 8.35, 0, 0);
        addSphere(group, mats.gizmoCam, 0.14, -1.15, TILE_H + 8.95, 0.1);
      }
      if (gizmos.peak_load) {
        addBox(group, mats.gizmoHot, 0.7, 1.15, 0.45, 2.05, TILE_H, -1.85, 0);
        addBox(group, mats.gizmoLock, 0.5, 0.12, 0.28, 2.05, TILE_H + 1.15, -1.85, 0);
      }
    }
    if (kind === "home" && gizmos.hub) {
      mast(group, 2.05, -1.55, 4.1);
      addSphere(group, mats.gizmoCool, 0.22, 2.05, TILE_H + 4.35, -1.55);
    }
    if (kind === "energy" && gizmos.storage_battery) {
      addBox(group, mats.gizmoCool, 1.05, 1.35, 0.7, 2.45, TILE_H, 1.55, 0);
      addBox(group, mats.gizmoLock, 0.7, 0.12, 0.4, 2.45, TILE_H + 1.35, 1.55, 0);
    }
    if (kind === "traffic") {
      if (gizmos.v2x) {
        dishMesh(group, 1.75, TILE_H + 4.6, -0.45);
        addSphere(group, mats.gizmoCam, 0.16, 1.75, TILE_H + 5.05, -0.2);
      }
      if (gizmos.charger || gizmos.charging_network) {
        charger(group, 2.65, 1.75);
        addBox(group, mats.gizmoLock, 0.38, 0.18, 0.28, 2.65, TILE_H + 1.15, 1.75, 0);
      }
    }
    keepMode = Math.max(0, keepMode - 1);
  }

  function artResidential(group, level, gizmos, q, r) {
    var h = 8.2 + level * 3.4;
    addBox(group, mats.concrete, 6.4, 1.35, 5.4, 0, TILE_H, 0.1, 0);
    addBox(group, facadeMat(q, r), 3.6, h, 3.2, 0, TILE_H + 1.35, 0.15, 0);
    addBox(group, mats.roof, 3.7, 0.18, 3.3, 0, TILE_H + 1.35 + h, 0.15, 0);
    hvac(group, -0.7, TILE_H + 1.55 + h, 0.4);
    if (level >= 1) {
      addBox(group, mats.slate, 2.2, 1.3, 1.8, 0.3, TILE_H + 1.35 + h, 0.1, 0);
    }
    if (level >= 2) {
      addBox(group, mats.steel, 1.4, 1.1, 1.2, -0.2, TILE_H + 2.6 + h, 0.05, 0);
      mast(group, 0.9, -0.6, h + 3.4);
    }
    dressDevices(group, "residential", gizmos);
  }

  function artHome(group, level, gizmos, q, r) {
    var h = 9.2 + level * 2.8;
    addBox(group, facadeMat(q, r), 4.6, h, 4.2, 0, TILE_H, 0, 0);
    addBox(group, mats.roof, 4.8, 0.2, 4.4, 0, TILE_H + h, 0, 0);
    addBox(group, mats.housing, 0.7, 1.1, 0.12, 0, TILE_H, 2.16, 0);
    addCyl(group, mats.steel, 0.05, 0.05, 2.6, -2.4, TILE_H + h - 0.2, -1.6, 8);
    addBox(group, mats.plus, 0.9, 0.5, 0.08, -1.95, TILE_H + h + 1.7, -1.6, 0.4);
    dishMesh(group, 1.2, TILE_H + h + 0.5, 0.6);
    if (level >= 1) {
      addBox(group, mats.concrete, 2.2, h * 0.62, 2.4, 2.4, TILE_H, 0.4, 0);
    }
    if (level >= 2) {
      addBox(group, mats.slate, 1.8, 1.1, 1.6, 0, TILE_H + h, 0.2, 0);
      mast(group, -1.1, 1.1, h + 2.4);
    }
    dressDevices(group, "home", gizmos);
  }

  function artSolar(group, level, gizmos) {
    addCyl(group, mats.lot, 3.4, 3.4, 0.12, 0, TILE_H, 0, 12);
    var h = 2.6 + level * 0.7;
    addBox(group, mats.steel, 3.1, h, 2.6, 0.6, TILE_H, 0.8, 0);
    var rows = 2 + (level >= 1 ? 1 : 0);
    var row;
    var col;
    for (row = 0; row < rows; row++) {
      for (col = 0; col < 3; col++) {
        var pan = addBox(group, mats.pvNight, 1.5, 0.08, 1.1, -2.4 + col * 1.65, TILE_H + 0.45, -2.3 + row * 1.25, 0);
        pan.rotation.x = -0.55;
      }
    }
    if (level >= 2) {
      addBox(group, mats.pv, 1.6, 0.08, 1.2, 0.5, TILE_H + h + 0.1, 0.8, 0).rotation.x = -0.4;
      mast(group, 1.6, 1.5, h + 1.6);
    }
    dressDevices(group, "energy", gizmos);
  }

  function artTransformer(group, level, gizmos) {
    var h = 2.8 + level * 0.7;
    addCyl(group, mats.lot, 3.3, 3.3, 0.1, 0, TILE_H, 0, 12);
    addBox(group, mats.concrete, 3.6, h, 2.8, -0.8, TILE_H, 0.2, 0);
    addCyl(group, mats.steel, 0.55, 0.55, 1.4 + level * 0.2, 1.8, TILE_H, 0.6, 12);
    if (level >= 1) {
      addCyl(group, mats.steel, 0.42, 0.42, 1.2, 2.5, TILE_H, 1.5, 12);
    }
    if (level >= 2) {
      addCyl(group, mats.steel, 0.38, 0.38, 1.1, 1.1, TILE_H + h, 0.3, 12);
      mast(group, -1.6, -1.2, h + 2);
    }
    addBox(group, mats.housing, 4.2, 0.08, 0.08, 0.4, TILE_H + h + 0.7, 0.4, 0);
    dressDevices(group, "energy", gizmos);
  }

  function artDatacenter(group, level, gizmos, secure, q, r) {
    var h = 3.4 + level * 0.8;
    addBox(group, secure ? mats.steel : mats.slate, 5.6, h, 3.6, 0, TILE_H, 0, 0);
    addBox(group, facadeMat(q, r), 5.6, h * 0.7, 0.12, 0, TILE_H + h * 0.15, 1.86, 0);
    if (level >= 1) {
      addBox(group, mats.concrete, 2.4, h - 0.5, 2.8, 2.6, TILE_H, -0.4, 0);
    }
    hvac(group, -1.2, TILE_H + h, 0.4);
    hvac(group, 0.6, TILE_H + h, -0.3);
    if (level >= 2) {
      addCyl(group, mats.steel, 0.55, 0.7, 1.6, -1.8, TILE_H + h, 0.8, 12);
      addCyl(group, mats.steel, 0.55, 0.7, 1.6, 1.6, TILE_H + h, 0.6, 12);
      dishMesh(group, 0.2, TILE_H + h + 0.7, -0.8);
    }
    if (!secure) {
      addSphere(group, mats.yellow, 0.16, 2.2, TILE_H + h - 0.4, 1.5);
    }
    dressDevices(group, "datacenter", gizmos);
  }

  function busBody(parent, x, z, ry) {
    addBox(parent, mats.plus, 2.2, 0.7, 0.8, x, TILE_H, z, ry);
    addBox(parent, mats.glass, 0.7, 0.32, 0.7, x + (ry ? 0 : 0.55), TILE_H + 0.38, z, ry);
  }

  function artBus(group, level, gizmos) {
    /* Busbahnhof: Asphalt, Bahnsteig, Dach, Ausfahrt zur Straße (+Z). */
    addBox(group, mats.asphalt || mats.road, 5.6, 0.1, 5.2, 0, TILE_H, 0.15, 0);
    addBox(group, mats.asphalt || mats.road, 1.8, 0.08, 2.6, 0, TILE_H + 0.01, 3.35, 0);
    addBox(group, mats.concrete, 4.8, 0.22, 1.1, 0, TILE_H, -1.55, 0);
    addBox(group, mats.steel, 5.2, 0.1, 2.4, 0, TILE_H + 2.35, -0.2, 0);
    addBox(group, mats.steel, 0.16, 2.2, 0.16, -2.3, TILE_H, -0.9, 0);
    addBox(group, mats.steel, 0.16, 2.2, 0.16, 2.3, TILE_H, -0.9, 0);
    addBox(group, mats.steel, 0.16, 2.2, 0.16, -2.3, TILE_H, 0.6, 0);
    addBox(group, mats.steel, 0.16, 2.2, 0.16, 2.3, TILE_H, 0.6, 0);
    addBox(group, mats.glass || mats.cream, 1.8, 1.1, 1.2, -1.9, TILE_H, 1.7, 0.1);
    addBox(group, mats.cream, 0.12, 1.5, 0.12, 1.6, TILE_H, 1.9, 0);
    addBox(group, mats.cream, 0.7, 0.08, 0.5, 1.6, TILE_H + 1.55, 1.9, 0);
    addBox(group, mats.mark || mats.cream, 0.9, 0.03, 3.4, -1.1, TILE_H + 0.06, 0.4, 0);
    addBox(group, mats.mark || mats.cream, 0.9, 0.03, 3.4, 1.1, TILE_H + 0.06, 0.4, 0);
    busBody(group, -1.1, 0.2, 0);
    if (level >= 1) {
      addBox(group, mats.steel, 5.2, 0.1, 1.6, 0, TILE_H + 2.35, 1.4, 0);
      busBody(group, 1.1, 0.35, 0.08);
    }
    if (level >= 2) {
      addBox(group, mats.concrete, 2.2, 1.4, 1.4, 2.0, TILE_H, -1.8, 0);
      mast(group, 1.8, -1.2, 3.4);
    }
    lampPost(group, 2.4, 2.0, 2.2);
    dressDevices(group, "traffic", gizmos);
  }

  function artGarage(group, level, gizmos) {
    var floors = 2 + Math.min(2, level);
    var f;
    addBox(group, mats.asphalt || mats.road, 5.2, 0.08, 4.6, 0, TILE_H, 0.2, 0);
    for (f = 0; f < floors; f++) {
      addBox(group, mats.concrete, 4.6, 0.14, 3.6, 0, TILE_H + 0.85 + f * 1.05, 0, 0);
      addBox(group, mats.steel, 0.18, 0.95, 0.18, -2.15, TILE_H + f * 1.05, -1.6, 0);
      addBox(group, mats.steel, 0.18, 0.95, 0.18, 2.15, TILE_H + f * 1.05, -1.6, 0);
      addBox(group, mats.steel, 0.18, 0.95, 0.18, -2.15, TILE_H + f * 1.05, 1.6, 0);
      addBox(group, mats.steel, 0.18, 0.95, 0.18, 2.15, TILE_H + f * 1.05, 1.6, 0);
    }
    addBox(group, mats.asphalt || mats.road, 1.4, 0.1, 2.2, 2.4, TILE_H + 0.05, 2.4, 0.35);
    addBox(group, mats.pv || mats.steel, 4.4, 0.08, 3.4, 0, TILE_H + floors * 1.05 + 0.2, 0, 0);
    charger(group, 1.9, 2.0);
    dressDevices(group, "traffic", gizmos);
  }

  function paintParkingBays(group, bayCount) {
    var bayMat = mats.mark || mats.zebra || mats.concrete;
    var n = bayCount || 4;
    var span = 5.0;
    var pitch = span / n;
    var bay;
    keepMode += 1;
    addBox(group, bayMat, span + 0.2, 0.03, 0.07, 0, TILE_H + 0.07, -1.85, 0);
    addBox(group, bayMat, span + 0.2, 0.03, 0.07, 0, TILE_H + 0.07, 0.75, 0);
    for (bay = 0; bay <= n; bay++) {
      var lx = -span / 2 + bay * pitch;
      addBox(group, bayMat, 0.07, 0.03, 2.55, lx, TILE_H + 0.07, -0.55, 0);
    }
    keepMode = Math.max(0, keepMode - 1);
  }

  function artParking(group, level, gizmos) {
    /* Asphaltfläche + Zufahrt + klare Stellplatz-Trennlinien. */
    addBox(group, mats.asphalt || mats.road, 5.5, 0.1, 5.0, 0, TILE_H, 0.1, 0);
    addBox(group, mats.asphalt || mats.road, 1.6, 0.08, 2.5, 0, TILE_H + 0.01, 3.25, 0);
    paintParkingBays(group, 4);
    keepMode += 1;
    var bay;
    for (bay = 0; bay < 3; bay++) {
      var bx = -1.9 + bay * 1.5;
      addBox(group, mats.car, 0.95, 0.3, 0.46, bx, TILE_H + 0.08, -0.45, bay % 2 ? 0.06 : -0.05);
    }
    keepMode = Math.max(0, keepMode - 1);
    addBox(group, mats.concrete, 1.15, 0.95 + level * 0.35, 1.05, -2.2, TILE_H, 1.85, 0);
    addBox(group, mats.cream, 0.12, 1.35, 0.12, 2.1, TILE_H, 1.7, 0);
    addBox(group, mats.cream, 0.55, 0.08, 0.4, 2.1, TILE_H + 1.4, 1.7, 0);
    charger(group, 1.8, 1.4);
    charger(group, 2.4, 2.2);
    if (level >= 1) {
      charger(group, 1.2, 2.4);
    }
    if (level >= 2) {
      addBox(group, mats.pv || mats.steel, 2.2, 0.08, 1.4, 1.7, TILE_H + 1.7, 2.0, 0);
      mast(group, 2.2, -2.0, 2.8);
    }
    dressDevices(group, "traffic", gizmos);
  }

  function artNuclear(group, level, gizmos) {
    /* Schornsteine schlank — keine Wasserturm-Klötze. */
    addBox(group, mats.concrete, 3.4, 2.3 + level * 0.45, 2.6, 1.0, TILE_H, 0.5, 0.1);
    addBox(group, mats.roof, 3.55, 0.14, 2.75, 1.0, TILE_H + 2.3 + level * 0.45, 0.5, 0);
    addCyl(group, mats.concrete, 0.42, 0.55, 4.6 + level * 0.5, -2.4, TILE_H, -1.3, 10);
    addCyl(group, mats.concrete, 0.36, 0.48, 4.0 + level * 0.4, -1.2, TILE_H, -2.0, 10);
    addCyl(group, mats.tank || mats.steel, 0.7, 0.7, 1.2, 2.5, TILE_H, -1.6, 10);
    dressDevices(group, "energy", gizmos);
  }

  function artWind(group, level, gizmos) {
    /* Stub: kein Kenney-Turbine-GLB — Mast + Rotor-Kreuz. */
    var mastH = 5.4 + level * 0.9;
    addCyl(group, mats.lot, 2.6, 2.6, 0.1, 0, TILE_H, 0, 12);
    addCyl(group, mats.steel, 0.16, 0.22, mastH, 0, TILE_H, 0, 8);
    addBox(group, mats.cream, 0.12, 2.5 + level * 0.2, 0.35, 0, TILE_H + mastH, 0, 0);
    addBox(group, mats.cream, 2.5 + level * 0.2, 0.12, 0.35, 0, TILE_H + mastH, 0, 0);
    if (level >= 1) {
      addCyl(group, mats.steel, 0.12, 0.16, mastH * 0.72, -2.2, TILE_H, 1.4, 8);
      addBox(group, mats.cream, 1.8, 0.1, 0.28, -2.2, TILE_H + mastH * 0.72, 1.4, 0.4);
      addBox(group, mats.cream, 0.1, 1.8, 0.28, -2.2, TILE_H + mastH * 0.72, 1.4, 0.4);
    }
    dressDevices(group, "energy", gizmos);
  }

  function artCoal(group, level, gizmos) {
    artTransformer(group, level, gizmos);
  }

  function artAdmin(group, level, gizmos, q, r) {
    artDatacenter(group, level, gizmos, false, q, r);
  }

  function artServer(group, level, gizmos, q, r) {
    artDatacenter(group, level, gizmos, true, q, r);
  }

  function artYard(group, level, gizmos) {
    artGarage(group, level, gizmos);
  }

  function artStation(group, level, gizmos) {
    artBus(group, level, gizmos);
  }

  function artRecycle(group, level) {
    artWorkshop(group, level);
  }

  function artTileFallback(group, zone, level, gizmos, q, r) {
    var tileId = boardTileId(zone);
    if (tileId === "energy-wind" || (zone.type === "energy" && zone.variant === "wind")) {
      artWind(group, level, gizmos);
      return;
    }
    if (tileId === "energy-nuclear" || (zone.type === "energy" && zone.variant === "nuclear")) {
      artNuclear(group, level, gizmos);
      return;
    }
    if (
      tileId === "energy-coal" ||
      (zone.type === "energy" && (zone.variant === "coal" || zone.variant === "transformer"))
    ) {
      artCoal(group, level, gizmos);
      return;
    }
    if (tileId === "energy-solar" || zone.type === "energy") {
      artSolar(group, level, gizmos);
      return;
    }
    if (tileId === "commerce-factory" || (zone.type === "commerce" && zone.variant === "factory")) {
      artCommerce(group, level, false);
      return;
    }
    if (tileId === "commerce-large" || (zone.type === "commerce" && (zone.variant === "large" || zone.variant === "enterprise"))) {
      artCommerce(group, level, true);
      return;
    }
    if (tileId === "commerce-recycle" || (zone.type === "commerce" && zone.variant === "recycle")) {
      artRecycle(group, level);
      return;
    }
    if (tileId === "commerce-small" || zone.type === "commerce") {
      artCommerce(group, level, false);
      return;
    }
    if (tileId === "data-residential" || zone.type === "residential") {
      artResidential(group, level, gizmos, q, r);
      return;
    }
    if (tileId === "data-server" || zone.type === "server") {
      artServer(group, level, gizmos, q, r);
      return;
    }
    if (tileId === "data-taxi" || zone.type === "taxi") {
      artBus(group, level, gizmos);
      return;
    }
    if (tileId === "data-admin" || zone.type === "admin") {
      artAdmin(group, level, gizmos, q, r);
      return;
    }
    if (tileId === "misc-yard" || zone.type === "yard") {
      artYard(group, level, gizmos);
      return;
    }
    if (tileId === "misc-station" || zone.type === "station") {
      artStation(group, level, gizmos);
      return;
    }
    if (tileId === "misc-park" || zone.type === "park") {
      artParkZone(group);
      return;
    }
    if (zone.type === "home") {
      artHome(group, level, gizmos, q, r);
      return;
    }
    if (zone.type === "datacenter") {
      artDatacenter(group, level, gizmos, zone.variant === "secure", q, r);
      return;
    }
    if (zone.type === "workshop") {
      artWorkshop(group, level);
      return;
    }
    if (zone.type === "traffic") {
      if (trafficKind(q, r, zone) === "taxi") {
        artBus(group, level, gizmos);
      } else {
        artGarage(group, level, gizmos);
      }
    }
  }

  function artCommerce(group, level, enterprise) {
    var h = (enterprise ? 3.4 : 2.6) + level * 0.8;
    addBox(group, enterprise ? mats.facade0 : mats.concrete, 4.2, h, 3.0, 0, TILE_H, 0, 0.1);
    addBox(group, mats.roof, 4.4, 0.16, 3.2, 0, TILE_H + h, 0, 0);
    if (!enterprise) {
      addBox(group, mats.steel, 1.4, 1.2, 1.2, 2.2, TILE_H, 1.4, 0);
    }
  }

  function artParkZone(group) {
    plantTreeCluster(group, seeded(0, 0, 3), "park");
    plantTreeCluster(group, seeded(1, 2, 7), "open");
  }

  function artWorkshopProps(group) {
    /* Ersatz für Car-/Graveyard-Props: Pylonen, Kisten, Mauerstücke. */
    addBox(group, mats.concrete, 0.35, 1.6, 2.4, -3.2, TILE_H, 0.4, 0.2);
    addBox(group, mats.concrete, 2.2, 1.4, 0.35, 0.6, TILE_H, -3.0, 0);
    addBox(group, mats.steel, 0.18, 2.2, 0.18, 2.8, TILE_H, 2.4, 0);
    addBox(group, mats.steel, 0.18, 2.0, 0.18, 3.2, TILE_H, 2.1, 0);
    addBox(group, mats.slate || mats.steel, 0.9, 0.7, 0.7, 2.2, TILE_H, 1.2, 0.3);
    addBox(group, mats.slate || mats.steel, 0.7, 0.55, 0.7, 1.4, TILE_H, 1.8, -0.2);
  }

  function artWorkshop(group, level) {
    addBox(group, mats.concrete, 3.6, 2.4 + level * 0.5, 3.0, 0, TILE_H, 0, 0.1);
    addBox(group, mats.roof, 3.8, 0.14, 3.2, 0, TILE_H + 2.4 + level * 0.5, 0, 0);
    artWorkshopProps(group);
  }

  function artTileBusStop(group, yaw) {
    /* Kleine Haltestelle am Straßenrand — lang 90° zur Straße. */
    var g = new THREE.Group();
    g.rotation.y = (yaw || 0) + Math.PI / 2;
    addBox(g, mats.steel, 1.4, 0.06, 0.55, 0, TILE_H + 1.2, 2.35, 0);
    addBox(g, mats.steel, 0.07, 1.15, 0.07, -0.6, TILE_H, 2.2, 0);
    addBox(g, mats.steel, 0.07, 1.15, 0.07, 0.6, TILE_H, 2.2, 0);
    addBox(g, mats.glass || mats.cream, 1.3, 0.85, 0.05, 0, TILE_H + 0.15, 2.15, 0);
    addBox(g, mats.bench || mats.slate, 1.1, 0.1, 0.32, 0, TILE_H + 0.32, 2.4, 0);
    addBox(g, mats.plus, 0.1, 1.0, 0.1, 0.85, TILE_H, 2.5, 0);
    addBox(g, mats.plus, 0.32, 0.25, 0.05, 0.85, TILE_H + 1.05, 2.5, 0);
    group.add(g);
  }

  function artPark(group, rand) {
    /* Nur Bäume — kein Standard-Betonklotz mehr. */
    plantTreeCluster(group, rand || seeded(0, 0, 9), "park");
    if (!kenneyPropsOk()) {
      tree(group, -2.2, 1.4, 1.05, false);
      tree(group, 0.3, 2.0, 0.8, true);
      tree(group, 2.1, 0.6, 0.7, false);
    }
  }

  function artLot(group, rand) {
    addCyl(group, mats.lot, 3.1, 3.1, 0.08, 0, TILE_H, 0, 12);
    if (rand() < 0.45) {
      addBox(group, mats.steel, 0.18, 3.4, 0.18, -1.2, TILE_H, 0.4, 0);
      addBox(group, mats.steel, 2.4, 0.12, 0.12, 0, TILE_H + 3.3, 0.4, 0);
    } else {
      addBox(group, mats.concrete, 2.0, 1.1, 1.5, 0.4, TILE_H, 0.2, 0);
    }
  }

  function kenneyTierNow() {
    var live = (qualityParams() || {}).tier || resolvedPreset || "medium";
    return qualityChoice && qualityChoice !== "auto" ? qualityChoice : live;
  }

  function tryKenneyFiller(group, rand) {
    return !!(
      Nexus.KenneyBuildings &&
      Nexus.KenneyBuildings.buildFiller &&
      Nexus.KenneyBuildings.buildFiller(group, {
        TILE_H: TILE_H,
        roll: rand(),
        yaw: rand() * Math.PI * 2,
        qualityTier: kenneyTierNow(),
        shadows: !!(qualityParams() && qualityParams().shadows)
      })
    );
  }

  /**
   * Kleine Baumgruppe an einer Hex-Ecke — außerhalb Gebäude + Parkbuchten,
   * innen vor der Straße (FIELD_R). mode: built | open | park | parking
   */
  function plantTreeCluster(group, rand, mode) {
    propMode += 1;
    var slot = group && group.userData && group.userData.slot;
    var q = 0;
    var r = 0;
    if (slot && typeof slot === "string") {
      var bits = slot.split(",");
      q = Number(bits[0]) || 0;
      r = Number(bits[1]) || 0;
    }
    var spots = [];
    var i;
    var tryN;
    var corner0 = Math.floor(rand() * 6);
    if (mode === "parking") {
      var parkSpots = [
        { x: 3.55, z: 3.2 },
        { x: -3.55, z: 3.2 },
        { x: 3.45, z: -3.25 },
        { x: -3.45, z: -3.25 },
        { x: 0.2, z: 4.1 },
        { x: 0.2, z: -4.1 }
      ];
      for (tryN = 0; tryN < parkSpots.length && spots.length < 2; tryN++) {
        var idx = (Math.floor(rand() * parkSpots.length) + tryN) % parkSpots.length;
        var cand = parkSpots[idx];
        if (treeSpotOkLocal(q, r, cand.x, cand.z, mode)) {
          spots.push(cand);
        }
      }
    } else {
      var nWant;
      var rMin;
      var rMax;
      if (mode === "built") {
        /* Enger Ring: außerhalb Kenney-Fuß, nicht in Parkbuchten am Rand. */
        rMin = BUILDING_FOOT + 0.35;
        rMax = Math.min(FIELD_R - 0.75, BUILDING_FOOT + 1.55);
        nWant = 2 + (rand() < 0.35 ? 1 : 0);
      } else if (mode === "park") {
        rMin = 3.6;
        rMax = Math.min(FIELD_R - 0.7, 6.4);
        nWant = 3;
      } else {
        rMin = 3.4;
        rMax = Math.min(FIELD_R - 0.7, 6.0);
        nWant = 2 + (rand() < 0.4 ? 1 : 0);
      }
      for (tryN = 0; tryN < 18 && spots.length < nWant; tryN++) {
        var corner = (corner0 + tryN) % 6;
        var ang = corner * (Math.PI / 3) + Math.PI / 6 + (rand() - 0.5) * 0.12;
        var rr = rMin + rand() * Math.max(0.2, rMax - rMin);
        var lx = Math.cos(ang) * rr;
        var lz = Math.sin(ang) * rr;
        if (!treeSpotOkLocal(q, r, lx, lz, mode)) {
          continue;
        }
        var clash = false;
        for (i = 0; i < spots.length; i++) {
          if (Math.hypot(lx - spots[i].x, lz - spots[i].z) < 0.85) {
            clash = true;
            break;
          }
        }
        if (!clash) {
          spots.push({ x: lx, z: lz });
        }
      }
    }
    for (i = 0; i < spots.length; i++) {
      if (i % 3 === 2) {
        bush(group, spots[i].x, spots[i].z, 0.9 + (i % 2) * 0.08, i % 2 === 1);
      } else {
        tree(group, spots[i].x, spots[i].z, 0.82 + (i % 2) * 0.08, i % 2 === 1);
      }
    }
    /* Extra-Büsche in engere Lücken — weiterhin nicht in Parkbuchten. */
    var bushTries = mode === "built" ? 5 : 3;
    for (tryN = 0; tryN < bushTries; tryN++) {
      var bang = (corner0 + tryN) * (Math.PI / 3) + Math.PI / 6 + (rand() - 0.5) * 0.35;
      var brr =
        mode === "built"
          ? BUILDING_FOOT + 0.15 + rand() * 1.1
          : 3.2 + rand() * 2.4;
      var bx = Math.cos(bang) * brr;
      var bz = Math.sin(bang) * brr;
      if (!treeSpotOkLocal(q, r, bx, bz, mode)) {
        continue;
      }
      bush(group, bx, bz, 0.85, tryN % 2 === 1);
      break;
    }
    propMode = Math.max(0, propMode - 1);
  }

  /** Uncontrolled playable tiles: already built city fabric, no owner tint. */
  function artUncontrolled(group, rand, q, r) {
    var roll = rand();
    var placed = false;
    var attempt;
    for (attempt = 0; attempt < 6 && !placed; attempt++) {
      placed = tryKenneyFiller(group, rand);
    }
    if (!placed && Nexus.KenneyBuildings && Nexus.KenneyBuildings.buildFiller) {
      placed = !!Nexus.KenneyBuildings.buildFiller(group, {
        TILE_H: TILE_H,
        roll: rand(),
        yaw: rand() * Math.PI * 2,
        qualityTier: kenneyTierNow(),
        shadows: !!(qualityParams() && qualityParams().shadows),
        force: true
      });
    }
    if (placed) {
      if (rand() < 0.55) {
        plantTreeCluster(group, rand, "built");
      }
      if (rand() < 0.35) {
        lampPost(group, 2.2 + rand() * 0.4, -2.0, 2.2);
      }
      return;
    }
    /* Letzter Fallback: immer ein Volumen — nie leeres Feld. */
    var h = 3.2 + rand() * 3.8;
    addBox(group, facadeMat(q, r), 3.0 + rand() * 0.8, h, 2.7 + rand() * 0.6, 0, TILE_H, 0, rand() * Math.PI * 2);
    addBox(group, mats.roof, 3.2, 0.16, 2.9, 0, TILE_H + h, 0, 0);
    if (rand() < 0.45) {
      plantTreeCluster(group, rand, "built");
    }
    if (rand() < 0.35) {
      lampPost(group, 2.2 + rand() * 0.4, -2.0, 2.2);
    }
  }

  function addGreenPatches(group, patches) {
    /* Nur Bäume — keine kreisförmigen Gras-Erhöhungen mehr. */
    propMode += 1;
    var slot = group && group.userData && group.userData.slot;
    var q = 0;
    var r = 0;
    if (slot && typeof slot === "string") {
      var bits = slot.split(",");
      q = Number(bits[0]) || 0;
      r = Number(bits[1]) || 0;
    }
    var i;
    for (i = 0; i < patches.length; i++) {
      var p = patches[i];
      if (p.r <= 0.7) {
        continue;
      }
      var lx = p.x + 0.2;
      var lz = p.z - 0.15;
      if (!treeSpotOkLocal(q, r, lx, lz, "open")) {
        continue;
      }
      if (i % 2 === 0) {
        bush(group, lx, lz, 0.55 + p.r * 0.12, false);
      } else {
        tree(group, lx, lz, 0.55 + p.r * 0.15, true);
      }
    }
    propMode = Math.max(0, propMode - 1);
  }

  function dressTileProps(group, zoneKey, q, r, budget) {
    var rand = seeded(q, r, 55);
    /* Leere Felder: Filler+Bäume kommen aus artUncontrolled — hier nicht nochmal. */
    if (zoneKey === "empty") {
      return;
    }
    var mode = "open";
    if (zoneKey === "park") {
      mode = "park";
    } else if (zoneKey === "traffic") {
      mode = "parking";
    } else if (zoneKey) {
      mode = "built";
    }
    plantTreeCluster(group, rand, mode);
  }

  function artWarehouse(group, rand) {
    if (tryKenneyFiller(group, rand) || tryKenneyFiller(group, rand)) {
      if (rand() < 0.5) {
        plantTreeCluster(group, rand, "built");
      }
      return;
    }
    var h = 2.2 + (rand() < 0.5 ? 1.1 : 0);
    addBox(group, mats.concrete, 4.6, h, 3.4, 0, TILE_H, 0, 0);
    addBox(group, mats.roof, 4.8, 0.16, 3.6, 0, TILE_H + h, 0, 0);
  }

  function artHill(group, rand) {
    /* Rand: Gebäude oder Bäume — nicht nur leere Fläche. */
    if (tryKenneyFiller(group, rand)) {
      if (rand() < 0.55) {
        plantTreeCluster(group, rand, "open");
      }
      return;
    }
    if (rand() < 0.7) {
      plantTreeCluster(group, rand, "open");
    } else {
      var hq = 0;
      var hr = 0;
      if (group.userData && group.userData.slot) {
        var hb = String(group.userData.slot).split(",");
        hq = Number(hb[0]) || 0;
        hr = Number(hb[1]) || 0;
      }
      if (treeSpotOkLocal(hq, hr, -1.4, 1.1, "open")) {
        tree(group, -1.4, 1.1, 0.7, true);
      }
      if (treeSpotOkLocal(hq, hr, 1.2, -0.8, "open")) {
        tree(group, 1.2, -0.8, 0.85, false);
      }
    }
  }

  function artRidge(group, rand) {
    var peak = new THREE.Mesh(geo.cone, mats.ridge);
    peak.scale.set(3.4, 4.2 + rand() * 1.4, 3.4);
    peak.position.set(0, TILE_H + 2.1, 0);
    group.add(peak);
    var cap = new THREE.Mesh(geo.cone, mats.snow);
    cap.scale.set(1.3, 1.1, 1.3);
    cap.position.set(0, TILE_H + 4.3, 0);
    group.add(cap);
  }

  function disposeTree(obj) {
    if (!obj) {
      return;
    }
    var walk = obj.traverse
      ? obj.traverse.bind(obj)
      : function (fn) {
          fn(obj);
        };
    walk(function (node) {
      var materials = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
      materials.forEach(function (material) {
        if (!material || isSharedMat(material)) {
          return;
        }
        if (material.map && material.map.dispose && !(sharedMat && sharedMat.has(material.map))) {
          material.map.dispose();
        }
        if (material.dispose) {
          material.dispose();
          disposeN += 1;
        }
      });
      if (node.geometry && node.geometry.dispose && !(sharedGeo && sharedGeo.has(node.geometry))) {
        node.geometry.dispose();
      }
      if (node.isInstancedMesh && node.dispose) {
        node.dispose();
        disposeN += 1;
      }
    });
  }

  function clearGroup(g) {
    if (!g) {
      return;
    }
    var kids = g.children ? g.children.slice() : [];
    kids.forEach(function (child) {
      disposeTree(child);
      if (g.remove) {
        g.remove(child);
      }
    });
    if (g.children && g.children.length && kids.length) {
      g.children.length = 0;
    }
  }

  function buildStaticCity() {
    clearGroup(roots.static);
    billboardSprites = [];
    ensureSprites();
    var theme = biomeTheme();
    var plateMat = mats.plate || mats.island;
    var deepMat = mats.plateDeep || mats.waterless;
    var plate = new THREE.Mesh(geo.cyl12, plateMat);
    plate.scale.set(PLATE_RADIUS, 1.2, PLATE_RADIUS);
    plate.position.y = -0.55;
    roots.static.add(plate);
    var under = new THREE.Mesh(geo.cyl12, deepMat);
    under.scale.set(PLATE_RADIUS * 1.08, 2.4, PLATE_RADIUS * 1.08);
    under.position.y = -2.2;
    roots.static.add(under);
    var island = new THREE.Mesh(geo.cyl6, mats.island);
    island.scale.set(HEX * 9.2, 1.4, HEX * 9.2);
    island.position.y = -0.05;
    island.rotation.y = HEX_YAW;
    roots.static.add(island);
    var ring = 14;
    var i;
    for (i = 0; i < ring; i++) {
      var a = (i / ring) * Math.PI * 2 + 0.17 + (i % 3) * 0.04;
      var dist = HEX * (15.5 + (i % 5) * 2.4 + (i % 2) * 1.1);
      var ridge = new THREE.Mesh(geo.cone, mats.horizon || mats.ridge);
      var h = 7 + (i % 5) * 3.2 + (i % 3) * 1.4;
      var fat = 5.5 + (i % 4) * 2.2;
      ridge.scale.set(fat, h, fat * (0.7 + (i % 3) * 0.15));
      ridge.position.set(Math.sin(a) * dist, h * 0.28 - 0.6, Math.cos(a) * dist);
      ridge.rotation.y = a * 0.35;
      roots.static.add(ridge);
      if (i % 3 === 0) {
        var foothill = new THREE.Mesh(geo.sphere, mats.horizon || mats.ridge);
        foothill.scale.set(fat * 1.1, 1.6 + (i % 2), fat * 0.85);
        foothill.position.set(Math.sin(a) * (dist - HEX * 2.2), 0.4, Math.cos(a) * (dist - HEX * 2.2));
        roots.static.add(foothill);
      }
      if (theme && theme.snow && i % 2 === 0) {
        var cap = new THREE.Mesh(geo.cone, mats.snow);
        cap.scale.set(fat * 0.38, 2.8 + (i % 2), fat * 0.38);
        cap.position.set(Math.sin(a) * dist, h * 0.62 + 0.3, Math.cos(a) * dist);
        roots.static.add(cap);
      }
    }
    if (spriteTextures.horizon) {
      var silTune = qualityParams();
      var silN = silTune ? Math.round(8 * (silTune.horizon || 0)) : 8;
      for (i = 0; i < silN; i++) {
        var ha = (i / Math.max(1, silN)) * Math.PI * 2 + 0.08;
        var hx = Math.sin(ha) * (HEX * 28);
        var hz = Math.cos(ha) * (HEX * 28);
        var sil = new THREE.Mesh(
          geo.plane,
          new THREE.MeshBasicMaterial({
            map: spriteTextures.horizon,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: true,
            opacity: isNight() ? 0.55 : 0.82
          })
        );
        sil.scale.set(HEX * (14 + (i % 3) * 2), HEX * (3.6 + (i % 2) * 0.8), 1);
        sil.position.set(hx, HEX * 1.35, hz);
        sil.lookAt(0, HEX * 1.35, 0);
        roots.static.add(sil);
      }
    }
    dressHorizon();
  }

  function dressHorizon() {
    birds = [];
    clouds = [];
    turbines = [];
    var tuned = qualityParams();
    var biome = activeBiome || "grass";
    var i;
    var duneN = tuned ? Math.round(7 * (tuned.horizon || 0)) : 7;
    var treeN = tuned ? Math.round(10 * (tuned.horizon || 0)) : 10;
    var turbineN = tuned ? tuned.turbines : 5;
    var villageN = tuned ? tuned.villages : 4;
    var cloudN = tuned ? tuned.clouds : 6;
    var birdN = tuned ? tuned.birds : 8;
    if (!duneN && !treeN && !turbineN && !villageN && !cloudN && !birdN && tuned && tuned.horizon === 0) {
      return;
    }
    if (biome === "water") {
      var lake = new THREE.Mesh(geo.cyl12, mats.plateDeep || mats.neutral);
      lake.scale.set(HEX * 18, 0.25, HEX * 12);
      lake.position.set(HEX * 24, -0.15, HEX * 4);
      roots.static.add(lake);
    } else if (biome === "desert") {
      for (i = 0; i < duneN; i++) {
        var dune = new THREE.Mesh(geo.sphere, mats.sand || mats.cream);
        var ang = (i / 7) * Math.PI * 2;
        dune.scale.set(7, 1.3, 4.2);
        dune.position.set(Math.sin(ang) * HEX * 22, 0.15, Math.cos(ang) * HEX * 22);
        roots.static.add(dune);
      }
    } else {
      var field = new THREE.Mesh(geo.cyl12, mats.grass);
      field.scale.set(HEX * 7, 0.12, HEX * 4.5);
      field.position.set(-HEX * 24, 0.02, HEX * 8);
      roots.static.add(field);
      addBox(roots.static, mats.concrete, 3.2, 2.1, 2.4, -HEX * 22, 0, HEX * 12, 0.2);
      addBox(roots.static, mats.roof, 3.6, 0.4, 2.8, -HEX * 22, 2.1, HEX * 12, 0.2);
      var pond = new THREE.Mesh(geo.cyl12, mats.plateDeep || mats.neutral);
      pond.scale.set(HEX * 4, 0.12, HEX * 3);
      pond.position.set(HEX * 20, 0.02, -HEX * 16);
      roots.static.add(pond);
      if (spriteTextures.tree) {
        var t;
        for (t = 0; t < treeN; t++) {
          var ta = (t / 10) * Math.PI * 2;
          addBillboard(roots.static, spriteTextures.tree, Math.sin(ta) * HEX * 16, 2.2, Math.cos(ta) * HEX * 16, 2.4, 3.2, 1);
        }
      }
    }
    for (i = 0; i < turbineN; i++) {
      var wa = (i / 5) * Math.PI * 2 + 0.5;
      var wd = HEX * (biome === "desert" ? 30 : 27);
      var pole = new THREE.Mesh(geo.cyl8, mats.steel);
      pole.scale.set(0.18, 7, 0.18);
      pole.position.set(Math.sin(wa) * wd, 3.5, Math.cos(wa) * wd);
      roots.static.add(pole);
      var blade = new THREE.Mesh(geo.box, mats.cream);
      blade.scale.set(0.12, 2.8, 0.2);
      blade.position.set(pole.position.x, 7.2, pole.position.z);
      roots.static.add(blade);
      turbines.push(blade);
    }
    for (i = 0; i < villageN; i++) {
      var village = new THREE.Mesh(geo.box, mats.neutral || mats.concrete);
      var va = 0.4 + i * 1.3;
      village.scale.set(2.2, 1.4 + (i % 2), 1.8);
      village.position.set(Math.sin(va) * HEX * 32, 0.8, Math.cos(va) * HEX * 32);
      roots.static.add(village);
    }
    /* Keine Wolkenzeile über dem Distrikt — nur Randnebel außen am Horizont. */
    var fogN = Math.max(cloudN, 6);
    var fogTint = isNight() ? "#6a7f96" : "#e8f4f2";
    for (i = 0; i < fogN; i++) {
      var fa = (i / fogN) * Math.PI * 2 + 0.21;
      var fr = HEX * (19 + (i % 4) * 2.2);
      var bank = new THREE.Mesh(
        geo.sphere,
        basic(fogTint, {
          transparent: true,
          opacity: isNight() ? 0.14 : 0.28,
          depthWrite: false,
          fog: true
        })
      );
      bank.scale.set(9 + (i % 3) * 3.5, 2.2 + (i % 2) * 0.8, 6 + (i % 3) * 2);
      bank.position.set(Math.sin(fa) * fr, 3.2 + (i % 3) * 1.4, Math.cos(fa) * fr);
      roots.static.add(bank);
      clouds.push({ mesh: bank, ang: fa, r: fr, speed: 0.012 + (i % 3) * 0.004, y: bank.position.y });
    }
    for (i = 0; i < birdN; i++) {
      var bird = new THREE.Mesh(geo.box, mats.slate);
      bird.scale.set(0.55, 0.06, 0.16);
      roots.static.add(bird);
      birds.push({ mesh: bird, a: i * 0.7, r: HEX * (12 + (i % 4)), y: 7 + (i % 3) * 1.4, speed: 0.15 + (i % 3) * 0.05 });
    }
  }

  function uniqueEdges(playTiles) {
    var edges = {};
    var nodes = {};
    playTiles.forEach(function (tile) {
      var i;
      for (i = 0; i < 6; i++) {
        var a = corner(tile.q, tile.r, i);
        var b = corner(tile.q, tile.r, (i + 1) % 6);
        var ka = vkey(a.x, a.z);
        var kb = vkey(b.x, b.z);
        if (!nodes[ka]) {
          nodes[ka] = { key: ka, x: a.x, z: a.z, next: [] };
        }
        if (!nodes[kb]) {
          nodes[kb] = { key: kb, x: b.x, z: b.z, next: [] };
        }
        if (nodes[ka].next.indexOf(kb) < 0) {
          nodes[ka].next.push(kb);
        }
        if (nodes[kb].next.indexOf(ka) < 0) {
          nodes[kb].next.push(ka);
        }
        var ek = ka < kb ? ka + "|" + kb : kb + "|" + ka;
        if (!edges[ek]) {
          edges[ek] = { a: nodes[ka], b: nodes[kb], tiles: [] };
        }
        var center = axial(tile.q, tile.r);
        edges[ek].tiles.push({ x: center.x, z: center.z, q: tile.q, r: tile.r });
      }
    });
    return { edges: edges, nodes: nodes };
  }

  function roadTiles() {
    var radius = (Nexus.CONSTANTS && Nexus.CONSTANTS.HEX_RADIUS) || 3;
    return Nexus.allSlots(radius);
  }

  function attachRim(roadPoses) {
    var radius = (Nexus.CONSTANTS && Nexus.CONSTANTS.HEX_RADIUS) || 3;
    var corners = Nexus.HEX_CORNER_AXIAL ? Nexus.HEX_CORNER_AXIAL(radius) : [];
    var added = [];
    corners.forEach(function (c, index) {
      var inner = axial(c.q, c.r);
      var len = Math.hypot(inner.x, inner.z) || 1;
      var ox = inner.x + (inner.x / len) * HEX * 2.6;
      var oz = inner.z + (inner.z / len) * HEX * 2.6;
      var near = null;
      var best = 1e12;
      graph.keys.forEach(function (k) {
        var n = graph.nodes[k];
        var d = (n.x - inner.x) * (n.x - inner.x) + (n.z - inner.z) * (n.z - inner.z);
        if (d < best) {
          best = d;
          near = n;
        }
      });
      var key = "rim-" + index;
      graph.nodes[key] = { key: key, x: ox, z: oz, next: [] };
      if (near) {
        if (near.next.indexOf(key) < 0) {
          near.next.push(key);
        }
        graph.nodes[key].next.push(near.key);
        var dx = ox - near.x;
        var dz = oz - near.z;
        var span = Math.hypot(dx, dz) || 1;
        roadPoses.push({
          x: (near.x + ox) / 2,
          y: ROAD_Y,
          z: (near.z + oz) / 2,
          sx: ROAD_W,
        sy: ROAD_THICK,
        sz: span + ROAD_W * 0.4,
        ry: Math.atan2(dx, dz)
      });
      }
      added.push(key);
    });
    var i;
    for (i = 0; i < added.length; i++) {
      var a = graph.nodes[added[i]];
      var b = graph.nodes[added[(i + 1) % added.length]];
      if (a.next.indexOf(b.key) < 0) {
        a.next.push(b.key);
      }
      if (b.next.indexOf(a.key) < 0) {
        b.next.push(a.key);
      }
      var dx2 = b.x - a.x;
      var dz2 = b.z - a.z;
      roadPoses.push({
        x: (a.x + b.x) / 2,
        y: ROAD_Y,
        z: (a.z + b.z) / 2,
        sx: ROAD_W,
        sy: ROAD_THICK,
        sz: Math.hypot(dx2, dz2) || 1,
        ry: Math.atan2(dx2, dz2)
      });
    }
    graph.keys = Object.keys(graph.nodes);
  }

  function buildRoads(playTiles, skipDress) {
    clearGroup(roots.roads);
    lights = [];
    lamps = [];
    var net = uniqueEdges(playTiles);
    edgeTiles = {};
    Object.keys(net.edges).forEach(function (ek) {
      edgeTiles[ek] = net.edges[ek].tiles || [];
    });
    graph.nodes = net.nodes;
    graph.keys = Object.keys(net.nodes);
    refreshHull();
    var roadPoses = [];
    var dashPoses = [];
    var stopPoses = [];
    Object.keys(net.edges).forEach(function (ek) {
      var e = net.edges[ek];
      var dx = e.b.x - e.a.x;
      var dz = e.b.z - e.a.z;
      var span = Math.hypot(dx, dz) || 1;
      var ix = dx / span;
      var iz = dz / span;
      var insetA = e.a.next.length >= 3 ? JUNCTION_INSET : 0;
      var insetB = e.b.next.length >= 3 ? JUNCTION_INSET : 0;
      var len = Math.max(0.4, span - insetA - insetB);
      var mx = e.a.x + ix * (insetA + len / 2);
      var mz = e.a.z + iz * (insetA + len / 2);
      var heading = Math.atan2(dx, dz);
      roadPoses.push({ x: mx, y: ROAD_Y, z: mz, sx: ROAD_W, sy: ROAD_THICK, sz: len, ry: heading });
      var dash = 0.46;
      var gap = 0.62;
      var cursor = insetA + 0.35;
      while (cursor + dash < span - insetB - 0.2) {
        dashPoses.push({
          x: e.a.x + ix * (cursor + dash * 0.5),
          y: ROAD_Y + 0.075,
          z: e.a.z + iz * (cursor + dash * 0.5),
          sx: 0.13,
          sy: 0.02,
          sz: dash,
          ry: heading
        });
        cursor += dash + gap;
      }
      if (e.b.next.length >= 3) {
        var backB = insetB + 0.2;
        stopPoses.push({
          x: e.b.x - ix * backB + -iz * ROAD_W * 0.22,
          y: ROAD_Y + 0.08,
          z: e.b.z - iz * backB + ix * ROAD_W * 0.22,
          sx: ROAD_W * 0.4,
          sy: 0.02,
          sz: 0.09,
          ry: heading
        });
      }
      if (e.a.next.length >= 3) {
        var backA = insetA + 0.2;
        stopPoses.push({
          x: e.a.x + ix * backA + iz * ROAD_W * 0.22,
          y: ROAD_Y + 0.08,
          z: e.a.z + iz * backA + -ix * ROAD_W * 0.22,
          sx: ROAD_W * 0.4,
          sy: 0.02,
          sz: 0.09,
          ry: heading
        });
      }
    });
    var capPoses = [];
    var triPoses = [];
    Object.keys(net.nodes).forEach(function (k) {
      var n = net.nodes[k];
      if (n.next.length >= 3) {
        var nb = net.nodes[n.next[0]];
        var aim = nb ? Math.atan2(nb.x - n.x, nb.z - n.z) : 0;
        triPoses.push({
          x: n.x,
          y: ROAD_Y + 0.012,
          z: n.z,
          sx: 1,
          sy: ROAD_THICK,
          sz: 1,
          ry: aim + Math.PI
        });
        return;
      }
      capPoses.push({
        x: n.x,
        y: ROAD_Y,
        z: n.z,
        sx: ROAD_W * 0.5,
        sy: ROAD_THICK,
        sz: ROAD_W * 0.5,
        ry: 0
      });
    });
    addInstances(geo.box, mats.road, roadPoses, roots.roads);
    addInstances(geo.junctionTri, mats.road, triPoses, roots.roads);
    addInstances(geo.cyl12, mats.road, capPoses, roots.roads);
    addInstances(geo.box, mats.mark, dashPoses, roots.roads);
    addInstances(geo.box, mats.mark, stopPoses, roots.roads);
    placeEuroSigns(net);
    var lightKeys = takeHashed(
      graph.keys
        .filter(function (k) {
          return graph.nodes[k].next.length >= 3 && String(k).indexOf("rim-") !== 0;
        })
        .map(function (k) {
          return { key: k };
        }),
      Math.max(6, Math.min(MAX_LIGHTS || 8, 10)),
      19
    ).map(function (item) {
      return item.key;
    });
    var i;
    for (i = 0; i < lightKeys.length; i++) {
      var n = graph.nodes[lightKeys[i]];
      var arm = graph.nodes[n.next[0]];
      var fx = arm ? n.x - arm.x : 0;
      var fz = arm ? n.z - arm.z : 1;
      var fl = Math.hypot(fx, fz) || 1;
      fx /= fl;
      fz /= fl;
      var g = new THREE.Group();
      g.position.set(n.x + -fz * 1.6, 0, n.z + fx * 1.6);
      g.rotation.y = Math.atan2(-fx, -fz);
      addCyl(g, mats.lampPole, 0.08, 0.1, 3.1, 0, TILE_H, 0, 8);
      addBox(g, mats.housing, 0.38, 0.95, 0.28, 0, TILE_H + 2.85, 0, 0);
      g.userData.live = true;
      var red = addSphere(g, ownMat(mats.red), 0.13, 0, TILE_H + 3.55, 0.16);
      var yel = addSphere(g, ownMat(mats.yellow), 0.13, 0, TILE_H + 3.28, 0.16);
      var gre = addSphere(g, ownMat(mats.green), 0.13, 0, TILE_H + 3.02, 0.16);
      roots.roads.add(g);
      lights.push({ node: n.key, red: red, yel: yel, gre: gre, phase: i * 1.37, shown: "", night: null });
    }
    lastRoadNet = net;
    buildParkingFeatures(playTiles, net);
    indexCityTiles(playTiles);
    buildWalkways(playTiles, net);
    if (!skipDress) {
      scatterStreetDressing(net);
    }
  }

  function parkingFaceDir(state, ownerId) {
    var yaw = ownerFacingYaw(state, ownerId);
    if (yaw == null || !Number.isFinite(yaw)) {
      return null;
    }
    /* Gleicher Weltvektor wie Kenney-Tür (lokal −Z nach facingYaw). */
    return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  }

  function parkingFacingByTile(state) {
    var map = {};
    if (!state || !state.zones) {
      return map;
    }
    state.zones.forEach(function (zone) {
      if (!zone || !zone.ownerId) {
        return;
      }
      var face = parkingFaceDir(state, zone.ownerId);
      if (!face) {
        return;
      }
      map[zone.q + "," + zone.r] = face;
    });
    return map;
  }

  function ensureParkingRoot() {
    if (!scene) {
      return null;
    }
    if (!roots.parking) {
      roots.parking = new THREE.Group();
      scene.add(roots.parking);
    }
    return roots.parking;
  }

  function remountCarsOnFeature(feature) {
    if (!feature) {
      return;
    }
    var i;
    for (i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.featureId !== feature.id || car.baySlot == null) {
        continue;
      }
      applySlotToCar(
        car,
        feature,
        car.baySlot,
        car.mode === "park" || car.mode === "wait"
      );
    }
  }

  function relocateOwnedParking(state, zone) {
    if (!state || !zone || !zone.ownerId || !parkingCatalog || !Nexus.BoardEdges) {
      return false;
    }
    if (!Nexus.BoardEdges.orientFeatureToFacing) {
      return false;
    }
    var face = parkingFaceDir(state, zone.ownerId);
    if (!face) {
      return false;
    }
    var net = lastRoadNet || uniqueEdges(roadTiles());
    var pos = axial(zone.q, zone.r);
    var moved = Nexus.BoardEdges.orientFeatureToFacing(parkingCatalog, zone.q, zone.r, net, {
      axial: axial,
      roadW: ROAD_W,
      faceX: face.x,
      faceZ: face.z,
      tileX: pos.x,
      tileZ: pos.z
    });
    if (!moved) {
      pruneGreensNearParking(zone.q, zone.r);
      return false;
    }
    remountCarsOnFeature(moved);
    refreshParkingVisuals();
    pruneGreensNearParking(zone.q, zone.r);
    pruneStreetLampsNearParking();
    return true;
  }

  function buildParkingFeatures(playTiles, net) {
    if (!Nexus.BoardEdges || !Nexus.BoardEdges.assignParkingFeatures) {
      parkingCatalog = null;
      return;
    }
    var prev = parkingCatalog;
    parkingCatalog = Nexus.BoardEdges.assignParkingFeatures(playTiles, net, {
      roadW: ROAD_W,
      axial: axial,
      /* Bestehende Buchten je Tile behalten — kein Neu-Würfeln bei Rebuild. */
      preserve: prev,
      facingByTile: parkingFacingByTile(lastState)
    });
    refreshParkingVisuals();
  }

  function refreshParkingVisuals() {
    var host = ensureParkingRoot();
    if (!host) {
      return;
    }
    clearGroup(host);
    renderParkingPads(parkingCatalog);
    placeParkingCornerSigns(parkingCatalog);
  }

  function renderParkingPads(catalog) {
    var host = ensureParkingRoot();
    if (!host || !catalog || !catalog.features || !catalog.features.length) {
      return;
    }
    var padPoses = [];
    var markPoses = [];
    var i;
    for (i = 0; i < catalog.features.length; i++) {
      var feature = catalog.features[i];
      if (!feature.pad || feature.kind === "none" || feature.kind === "bus_stop") {
        continue;
      }
      var pad = feature.pad;
      var along = feature.frame.along;
      /* Bay leicht über Tile-Pad; Markierung liegt auf der Pad-Oberfläche. */
      var baySy = 0.07;
      var bayY = TILE_H + 0.16;
      var markSy = 0.035;
      var markY = bayY + baySy * 0.5 + markSy * 0.5 + 0.008;
      padPoses.push({
        x: pad.center.x,
        y: bayY,
        z: pad.center.z,
        sx: pad.width,
        sy: baySy,
        sz: pad.len,
        ry: pad.yaw
      });
      var slotN = feature.slots && feature.slots.length ? feature.slots.length : 0;
      /* Gleicher Span wie BoardEdges.slotWorld (usableLen ≈ pad.len / 0.98). */
      var span = pad.len / 0.98;
      var s;
      if (feature.kind === "parallel" && slotN >= 2) {
        /* 2er: Quer-Trenner mittig zwischen den beiden u-Slots. */
        markPoses.push({
          x: pad.center.x,
          y: markY,
          z: pad.center.z,
          sx: pad.width * 0.85,
          sy: markSy,
          sz: 0.12,
          ry: pad.yaw
        });
      } else if (feature.kind === "perpendicular" && slotN >= 1) {
        /* Stall-Trenner bei u = s/N — Autos sitzen in (s+0.5)/N. */
        for (s = 0; s <= slotN; s++) {
          var alongOff = (s / slotN - 0.5) * span;
          markPoses.push({
            x: pad.center.x + along.x * alongOff,
            y: markY,
            z: pad.center.z + along.z * alongOff,
            sx: pad.width * 0.94,
            sy: markSy,
            sz: 0.12,
            ry: pad.yaw
          });
        }
      }
    }
    addInstances(geo.box, mats.parkBay || mats.asphalt || mats.road, padPoses, host);
    var markMesh = addInstances(
      geo.box,
      mats.parkMark || mats.zebra || mats.mark,
      markPoses,
      host
    );
    if (markMesh) {
      markMesh.renderOrder = 5;
      markMesh.frustumCulled = false;
    }
  }

  function placeParkingCornerSigns(catalog) {
    var host = ensureParkingRoot();
    if (!host || !catalog || !catalog.features || !kenneyPropsOk()) {
      return;
    }
    var shadows = !!(qualityParams() && qualityParams().shadows);
    var placed = 0;
    var i;
    for (i = 0; i < catalog.features.length && placed < 48; i++) {
      var feature = catalog.features[i];
      if (feature.kind === "none" || feature.kind === "bus_stop") {
        continue;
      }
      if (keyRand(feature.id, 77) > 0.72) {
        continue;
      }
      var sites = Nexus.BoardEdges.cornerSignSites(feature, ROAD_W);
      var si = Math.floor(keyRand(feature.id, 78) * sites.length) % sites.length;
      var site = sites[si];
      if (!site) {
        continue;
      }
      var signId =
        keyRand(feature.id, 79) < 0.34 ? "signStop" : keyRand(feature.id, 80) < 0.5 ? "signWarning" : "signStreet";
      Nexus.KenneyBuildings.placeProp(host, signId, site.x, TILE_H, site.z, {
        yaw: site.yaw,
        shadows: shadows
      });
      placed += 1;
    }
  }

  function buildWalkways() {
    /* Fussgaenger und Zebrastreifen bewusst aus — Parken laeuft ueber Feature-Slots. */
    walkSites = [];
    zebraEdges = {};
  }

  /* Neutrale Randfelder — Modelle vorbereitet, noch nicht gesetzt. */
  function artNeutralSupermarket(group, rand) {
    addBox(group, mats.concrete, 4.2, 2.2, 3.4, 0, TILE_H, 0, 0);
    addBox(group, mats.roof, 4.4, 0.28, 3.6, 0, TILE_H + 2.2, 0, 0);
    addBox(group, mats.glass || mats.cabin, 3.2, 1.1, 0.12, 0, TILE_H + 0.9, 1.72, 0);
  }
  function artNeutralParking(group, rand) {
    addBox(group, mats.asphalt || mats.road, 5.2, 0.18, 5.2, 0, TILE_H, 0, 0);
    addCyl(group, mats.steel, 0.12, 0.12, 2.4, -1.6, TILE_H, -1.6, 8);
    addCyl(group, mats.steel, 0.12, 0.12, 2.4, 1.6, TILE_H, 1.6, 8);
  }
  function artNeutralPark(group, rand) {
    artPark(group, rand || seeded(0, 0, 1));
  }
  function artNeutralGas(group, rand) {
    addBox(group, mats.concrete, 2.4, 1.6, 2.2, 0, TILE_H, 0, 0);
    addBox(group, mats.roof, 3.6, 0.2, 3.2, 0, TILE_H + 2.4, 0, 0);
    addCyl(group, mats.steel, 0.1, 0.1, 2.4, -1.2, TILE_H, 0.8, 8);
    addCyl(group, mats.steel, 0.1, 0.1, 2.4, 1.2, TILE_H, 0.8, 8);
  }
  function artNeutralPlaza(group, rand) {
    addBox(group, mats.path || mats.concrete, 5.4, 0.12, 5.4, 0, TILE_H, 0, 0);
    addCyl(group, mats.bench || mats.concrete, 0.35, 0.35, 0.45, 0, TILE_H, 0, 8);
  }
  Nexus.Board3DArt = Nexus.Board3DArt || {};
  Nexus.Board3DArt.neutral = {
    supermarket: artNeutralSupermarket,
    parking: artNeutralParking,
    park: artNeutralPark,
    gas: artNeutralGas,
    plaza: artNeutralPlaza
  };

  function placeEuroSigns(net) {
    var placed = 0;
    if (!hullRadius) {
      refreshHull();
    }
    var limit = hullRadius - 0.15;
    Object.keys(net.edges).forEach(function (ek) {
      if (placed >= 52 || keyRand(ek, 91) > 0.62) {
        return;
      }
      var e = net.edges[ek];
      var dx = e.b.x - e.a.x;
      var dz = e.b.z - e.a.z;
      var len = Math.hypot(dx, dz) || 1;
      var ix = dx / len;
      var iz = dz / len;
      var along = 0.28 + keyRand(ek, 92) * 0.44;
      var rightOk = shoulderOnBoard(e.a.key, e.b.key);
      var leftOk = shoulderOnBoard(e.b.key, e.a.key);
      var side = 1;
      if (rightOk && leftOk) {
        side = keyRand(ek, 94) > 0.5 ? 1 : -1;
      } else if (leftOk) {
        side = -1;
      } else if (!rightOk) {
        return;
      }
      var off = ROAD_W * 0.5 + 0.7;
      var x = e.a.x + dx * along + -iz * side * off;
      var z = e.a.z + dz * along + ix * side * off;
      if (Math.hypot(x, z) > limit) {
        return;
      }
      var g = new THREE.Group();
      g.position.set(x, 0, z);
      /* Fläche entlang der Trasse (Fahrer), nicht zur Gebäudefront. */
      g.rotation.y = Math.atan2(ix, iz) + (side > 0 ? 0 : Math.PI);
      addCyl(g, mats.steel, 0.04, 0.05, 1.5, 0, TILE_H, 0, 6);
      var kind = Math.floor(keyRand(ek, 93) * 3);
      if (kind === 0) {
        var diamond = new THREE.Mesh(geo.box, mats.signYellow);
        diamond.scale.set(0.42, 0.42, 0.04);
        diamond.position.y = TILE_H + 1.4;
        diamond.rotation.z = Math.PI / 4;
        g.add(diamond);
      } else if (kind === 1) {
        var tri = new THREE.Mesh(geo.junctionTri, mats.signYield);
        tri.scale.set(0.38, 0.05, 0.38);
        tri.position.y = TILE_H + 1.42;
        tri.rotation.x = Math.PI / 2;
        tri.rotation.z = Math.PI;
        g.add(tri);
      } else {
        var disc = new THREE.Mesh(geo.cyl12, mats.signRound);
        disc.scale.set(0.2, 0.04, 0.2);
        disc.position.y = TILE_H + 1.42;
        disc.rotation.x = Math.PI / 2;
        g.add(disc);
        var slash = new THREE.Mesh(geo.box, mats.signYield);
        slash.scale.set(0.28, 0.055, 0.045);
        slash.position.y = TILE_H + 1.42;
        slash.rotation.z = 0.75;
        g.add(slash);
      }
      roots.roads.add(g);
      placed += 1;
    });
  }

  function takeHashed(items, maxCount, salt) {
    if (!items.length || items.length <= maxCount) {
      return items;
    }
    var scored = items.map(function (item) {
      return { item: item, h: keyRand(item.key, salt) };
    });
    scored.sort(function (a, b) {
      return a.h - b.h;
    });
    var out = [];
    var i;
    for (i = 0; i < maxCount; i++) {
      out.push(scored[i].item);
    }
    return out;
  }

  function slotOwned(x, z) {
    if (!lastState || !Nexus.allSlots) {
      return false;
    }
    var radius = lastState.hexRadius || (Nexus.CONSTANTS && Nexus.CONSTANTS.HEX_RADIUS) || 3;
    var slots = Nexus.allSlots(radius);
    var best = 1e12;
    var slot = null;
    var i;
    for (i = 0; i < slots.length; i++) {
      var p = axial(slots[i].q, slots[i].r);
      var d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < best) {
        best = d;
        slot = slots[i];
      }
    }
    if (!slot || best > HEX * HEX) {
      return false;
    }
    var owned = false;
    (lastState.zones || []).forEach(function (zone) {
      if (zone.q === slot.q && zone.r === slot.r) {
        owned = true;
      }
    });
    return owned;
  }

  function scatterStreetDressing(net, from, to) {
    var treeCands = [];
    var lampCands = [];
    var binCands = [];
    var benchCands = [];
    var bushCands = [];
    var flowerCands = [];
      /* Näher an der Tilegrenze (Bordstein), nicht tief ins Feld. */
      var kerb = ROAD_W * 0.5 + 0.28;
    var edgeKeys = Object.keys(net.edges);
    var start = from == null ? 0 : from;
    var end = to == null ? edgeKeys.length : to;
    var i;
    if (start === 0) {
      lampPools = [];
      billboardSprites = billboardSprites.filter(function () {
        return false;
      });
    }
    for (i = start; i < end; i++) {
      var ek = edgeKeys[i];
      var e = net.edges[ek];
      var dx = e.b.x - e.a.x;
      var dz = e.b.z - e.a.z;
      var len = Math.hypot(dx, dz) || 1;
      var nx = -dz / len;
      var nz = dx / len;
      var mx = (e.a.x + e.b.x) / 2;
      var mz = (e.a.z + e.b.z) / 2;
      if (nx * mx + nz * mz > 0) {
        nx = -nx;
        nz = -nz;
      }
      var roll = keyRand(ek, 71);
      var along = 0.28 + keyRand(ek, 72) * 0.44;
      var px = e.a.x + dx * along;
      var pz = e.a.z + dz * along;
      var heading = Math.atan2(dx, dz);
      var sideA = slotOwned(px + nx * HEX * 0.85, pz + nz * HEX * 0.85);
      var sideB = slotOwned(px - nx * HEX * 0.85, pz - nz * HEX * 0.85);
      var wild = !sideA && !sideB;
      var hasPark = edgeHasActiveParking(ek);
      if (roll < 0.28) {
        /* Straßenbäume: etwas weiter vom Fahrbahnrand, nicht in benachbarte Felder. */
        var s = 0.55 + keyRand(ek, 73) * 0.4;
        var treeOff = kerb + (sideA || sideB ? 0.85 : 0.55);
        var tx = px + nx * treeOff;
        var tz = pz + nz * treeOff;
        if (!(sideA || sideB) || keyRand(ek, 78) > 0.22) {
          treeCands.push({
            key: ek,
            x: tx,
            z: tz,
            s: s,
            alt: keyRand(ek, 74) < 0.5,
            wild: wild
          });
          if (keyRand(ek, 79) > 0.62) {
            treeCands.push({
              key: ek + "|b",
              x: tx + nx * 0.4 + (-dz / len) * 0.55,
              z: tz + nz * 0.4 + (dx / len) * 0.55,
              s: s * 0.9,
              alt: !!(keyRand(ek, 74) >= 0.5),
              wild: wild
            });
          }
        }
      } else if (roll < 0.4 && !hasPark) {
        /* Lampen immer Kantenmitte; Arm zur Fahrbahn (−n). */
        var lx = mx + nx * kerb;
        var lz = mz + nz * kerb;
        var h = 2.25 + keyRand(ek, 75) * 0.25;
        lampCands.push({
          key: ek,
          pole: { x: lx, y: TILE_H + h / 2, z: lz, sx: 0.07, sy: h, sz: 0.09, ry: 0 },
          head: { x: lx, y: TILE_H + h + 0.08, z: lz, sx: 0.16, sy: 0.16, sz: 0.16, ry: 0 },
          x: lx,
          z: lz,
          h: h,
          heading: heading,
          nx: nx,
          nz: nz
        });
      } else if (roll < 0.5) {
        if (kenneyPropsOk()) {
          treeCands.push({
            key: ek,
            x: px + nx * (kerb + 0.35),
            z: pz + nz * (kerb + 0.35),
            s: 0.6,
            alt: false,
            wild: wild
          });
        } else {
          binCands.push({
            key: ek,
            pose: {
              x: px + nx * kerb,
              y: TILE_H + 0.22,
              z: pz + nz * kerb,
              sx: 0.28,
              sy: 0.4,
              sz: 0.24,
              ry: heading
            }
          });
        }
      } else if (roll < 0.64) {
        if (kenneyPropsOk()) {
          treeCands.push({
            key: ek,
            x: px + nx * (kerb + 0.2),
            z: pz + nz * (kerb + 0.2),
            s: 0.7 + keyRand(ek, 76) * 0.3,
            alt: keyRand(ek, 76) < 0.4,
            wild: wild
          });
        } else {
          bushCands.push({
            key: ek,
            x: px + nx * (kerb + 0.2),
            z: pz + nz * (kerb + 0.2),
            s: 0.7 + keyRand(ek, 76) * 0.4,
            wild: wild
          });
        }
      } else if (roll < 0.76) {
        if (kenneyPropsOk()) {
          treeCands.push({
            key: ek,
            x: px + nx * (kerb + 0.3),
            z: pz + nz * (kerb + 0.3),
            s: 0.55,
            alt: false,
            wild: wild
          });
        } else {
          flowerCands.push({
            key: ek,
            x: px + nx * (kerb + 0.35),
            z: pz + nz * (kerb + 0.35),
            kind: Math.floor(keyRand(ek, 77) * 3),
            wild: wild
          });
        }
      } else if (roll > 0.94) {
        if (kenneyPropsOk()) {
          treeCands.push({
            key: ek,
            x: px + nx * (kerb + 0.25),
            z: pz + nz * (kerb + 0.25),
            s: 0.65,
            alt: true,
            wild: wild
          });
        } else {
          var bx = px + nx * (kerb + 0.2);
          var bz = pz + nz * (kerb + 0.2);
          benchCands.push({
            key: ek,
            seat: { x: bx, y: TILE_H + 0.2, z: bz, sx: 1.05, sy: 0.08, sz: 0.32, ry: heading },
            back: {
              x: bx + nx * 0.14,
              y: TILE_H + 0.36,
              z: bz + nz * 0.14,
              sx: 1.05,
              sy: 0.28,
              sz: 0.08,
              ry: heading
            }
          });
        }
      }
    }
    treeCands = treeCands.filter(function (tc) {
      return treeSpotOkWorld(tc.x, tc.z);
    });
    bushCands = bushCands.filter(function (bc) {
      return treeSpotOkWorld(bc.x, bc.z);
    });
    flowerCands = flowerCands.filter(function (fc) {
      return treeSpotOkWorld(fc.x, fc.z);
    });
    lampCands = lampCands.filter(function (lc) {
      return !edgeHasActiveParking(lc.key) && !nearParkingWorld(lc.x, lc.z, 1.15);
    });
    treeCands = takeHashed(treeCands, MAX_TREES, 201);
    lampCands = takeHashed(lampCands, MAX_LAMPS, 202);
    binCands = takeHashed(binCands, MAX_BINS, 203);
    benchCands = takeHashed(benchCands, MAX_BENCHES, 204);
    bushCands = takeHashed(bushCands, MAX_BUSHES, 205);
    flowerCands = takeHashed(flowerCands, MAX_FLOWERS, 206);
    ensureSprites();
    var lampPoles = [];
    var lampHeads = [];
    var bins = [];
    var benchSeats = [];
    var benchBacks = [];
    var useKenneyDress = kenneyPropsOk();
    for (i = 0; i < treeCands.length; i++) {
      var tc = treeCands[i];
      tree(roots.roads, tc.x, tc.z, tc.s, tc.alt);
    }
    if (!useKenneyDress) {
      for (i = 0; i < bushCands.length; i++) {
        var bc = bushCands[i];
        dropProp(roots.roads, "bush", 1, bc.x, bc.z, bc.s, bc.wild);
      }
    }
    for (i = 0; i < lampCands.length; i++) {
      var lc = lampCands[i];
      if (useKenneyDress) {
        /* light-curved Arm = −Z; Yaw so dass −Z zur Fahrbahn (−n) zeigt. */
        var snx = lc.nx != null ? lc.nx : 0;
        var snz = lc.nz != null ? lc.nz : 1;
        var lampYaw = Math.atan2(snx, snz);
        Nexus.KenneyBuildings.placeProp(roots.roads, "lampCurved", lc.x, TILE_H, lc.z, {
          yaw: lampYaw,
          shadows: !!(qualityParams() && qualityParams().shadows),
          userData: { streetLamp: true, edgeKey: lc.key }
        });
        if (mats.lampPool) {
          var pool = new THREE.Mesh(geo.plane, ownMat(mats.lampPool));
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(lc.x, TILE_H + 0.05, lc.z);
          pool.scale.set(2.4, 2.4, 1);
          pool.visible = isNight();
          pool.userData.streetLampPool = true;
          pool.userData.edgeKey = lc.key;
          roots.roads.add(pool);
          lampPools.push(pool);
        }
      } else {
        lampPoles.push(lc.pole);
        lampHeads.push(lc.head);
        if (mats.lampPool) {
          var poolLow = new THREE.Mesh(geo.plane, ownMat(mats.lampPool));
          poolLow.rotation.x = -Math.PI / 2;
          poolLow.position.set(lc.x, TILE_H + 0.05, lc.z);
          poolLow.scale.set(3.4, 3.4, 1);
          poolLow.visible = isNight();
          poolLow.userData.streetLampPool = true;
          poolLow.userData.edgeKey = lc.key;
          roots.roads.add(poolLow);
          lampPools.push(poolLow);
        }
      }
    }
    if (!useKenneyDress) {
      for (i = 0; i < binCands.length; i++) {
        bins.push(binCands[i].pose);
      }
      for (i = 0; i < benchCands.length; i++) {
        benchSeats.push(benchCands[i].seat);
        benchBacks.push(benchCands[i].back);
      }
      addInstances(geo.cyl8, mats.lampPole, lampPoles, roots.roads);
      var heads = addInstances(geo.sphere, mats.lamp, lampHeads, roots.roads);
      addInstances(geo.box, mats.bin, bins, roots.roads);
      addInstances(geo.box, mats.bench, benchSeats, roots.roads);
      addInstances(geo.box, mats.bench, benchBacks, roots.roads);
      lamps = heads ? [heads] : [];
    } else {
      lamps = [];
    }
    dressingCounts = {
      trees: treeCands.length,
      lamps: lampCands.length,
      bins: useKenneyDress ? 0 : bins.length,
      benches: useKenneyDress ? 0 : benchSeats.length,
      bushes: useKenneyDress ? 0 : bushCands.length,
      flowers: useKenneyDress ? 0 : flowerCands.length
    };
  }

  function angleDelta(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function turnSignFromDelta(delta) {
    /* Vorzeichen gespiegelt: +delta war links, Blinker saß rechts (Parken setzt turn direkt). */
    if (delta > 0.35) {
      return -1;
    }
    if (delta < -0.35) {
      return 1;
    }
    return 0;
  }

  function setTurnSignal(agent, fromKey, toKey, nextKey) {
    if (!agent) {
      return 0;
    }
    var a = graph.nodes[fromKey];
    var b = graph.nodes[toKey];
    var c = graph.nodes[nextKey];
    if (!a || !b || !c) {
      agent.turn = 0;
      return 0;
    }
    var incoming = Math.atan2(b.x - a.x, b.z - a.z);
    var outgoing = Math.atan2(c.x - b.x, c.z - b.z);
    agent.turn = turnSignFromDelta(angleDelta(outgoing, incoming));
    return agent.turn;
  }

  function chooseNext(fromKey, prevKey, agent) {
    var node = graph.nodes[fromKey];
    if (!node || !node.next.length) {
      return fromKey;
    }
    var prev = prevKey && graph.nodes[prevKey];
    var incoming = prev ? Math.atan2(node.x - prev.x, node.z - prev.z) : 0;
    var bus = agent && agent.kind !== "bus" ? busAhead(agent) : null;
    var pack = agent ? packOnEdge(agent) : 0;
    var wantTurn = agent && (agent.seed || 0) % 4 === 0;
    var best = null;
    var bestScore = 1e9;
    var bestDelta = 0;
    var i;
    for (i = 0; i < node.next.length; i++) {
      var key = node.next[i];
      if (String(key).indexOf("rim-") === 0) {
        continue;
      }
      if (key === prevKey && node.next.length > 1) {
        continue;
      }
      var next = graph.nodes[key];
      if (!next) {
        continue;
      }
      var ang = Math.atan2(next.x - node.x, next.z - node.z);
      var delta = prev ? angleDelta(ang, incoming) : 0;
      var mag = Math.abs(delta);
      var score = wantTurn ? Math.abs(mag - 1.05) : mag;
      score += edgeLoad(fromKey, key) * 1.35;
      if (pack >= 2 && agent && key === leaderPlan(agent)) {
        score += 2.4;
      }
      if (bus && key === bus.plan) {
        score += 6;
      }
      score += (((agent && agent.seed) || 0) + i * 5) % 7 * 0.02;
      if (score < bestScore) {
        bestScore = score;
        best = key;
        bestDelta = delta;
      }
    }
    if (!best) {
      for (i = 0; i < node.next.length; i++) {
        if (String(node.next[i]).indexOf("rim-") !== 0) {
          best = node.next[i];
          break;
        }
      }
    }
    if (agent) {
      agent.turn = turnSignFromDelta(bestDelta);
    }
    return best || prevKey || fromKey;
  }

  /* Kreuzung: nur ein Auto gleichzeitig im Knotenbereich. */
  function junctionContenders(nodeKey) {
    var list = [];
    var i;
    for (i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.mode !== "drive") {
        continue;
      }
      var win = turnWindow(car.kind);
      if (car.to === nodeKey && car.u >= win.inU - 0.12) {
        list.push(car);
      } else if (car.from === nodeKey && car.u <= win.outU + 0.08) {
        list.push(car);
      }
    }
    return list;
  }

  function canEnterJunction(agent) {
    var node = graph.nodes[agent.to];
    if (!node || node.next.length < 3) {
      return true;
    }
    var win = turnWindow(agent.kind);
    if (agent.u < win.inU - 0.1) {
      return true;
    }
    var list = junctionContenders(agent.to);
    if (list.length <= 1) {
      return true;
    }
    var best = null;
    var i;
    for (i = 0; i < list.length; i++) {
      var c = list[i];
      var score = (c.to === agent.to ? c.u : 1 + (1 - c.u)) * 10 + ((c.seed || 0) % 97) * 0.001;
      if (!best || score > best.score) {
        best = { car: c, score: score };
      }
    }
    return !!(best && best.car === agent);
  }

  function edgeLoad(from, to) {
    var n = 0;
    var i;
    for (i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.mode === "park" || car.mode === "wait") {
        continue;
      }
      if (car.from === from && car.to === to) {
        n += 1;
      }
    }
    return n;
  }

  function busAhead(agent) {
    var found = null;
    var best = 0.5;
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === agent || other.kind !== "bus" || other.mode === "park" || other.mode === "wait") {
        continue;
      }
      if (other.from === agent.from && other.to === agent.to && other.u > agent.u + 0.02) {
        var gap = other.u - agent.u;
        if (gap < best) {
          best = gap;
          found = other;
        }
      }
    }
    return found;
  }

  function packOnEdge(agent) {
    var n = 0;
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other.mode === "park" || other.mode === "wait") {
        continue;
      }
      if (other.from === agent.from && other.to === agent.to && Math.abs(other.u - agent.u) < 0.55) {
        n += 1;
      }
    }
    return n;
  }

  function leaderPlan(agent) {
    var leader = null;
    var u = -1;
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === agent || other.mode === "park" || other.mode === "wait") {
        continue;
      }
      if (other.from === agent.from && other.to === agent.to && other.u > u) {
        u = other.u;
        leader = other;
      }
    }
    return leader ? leader.plan : null;
  }

  function carGap(agent) {
    var best = 1;
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === agent || other.mode === "park" || other.mode === "wait") {
        continue;
      }
      if ((other.mode === "in" || other.mode === "out") && other.lane > 1.2) {
        continue;
      }
      if (other.from === agent.from && other.to === agent.to) {
        var ahead = other.u - agent.u;
        if (ahead > 0.02 && ahead < best) {
          best = ahead;
        }
      } else if (agent.u > 0.72 && other.from === agent.to && other.u < 0.28) {
        var across = 1 - agent.u + other.u;
        if (across < best) {
          best = across;
        }
      }
    }
    return best;
  }

  function edgeKey(a, b) {
    return a < b ? a + "|" + b : b + "|" + a;
  }

  function nodeOuter(node) {
    if (!node) {
      return true;
    }
    if (String(node.key).indexOf("rim-") === 0) {
      return true;
    }
    var i;
    for (i = 0; i < node.next.length; i++) {
      if (String(node.next[i]).indexOf("rim-") === 0) {
        return true;
      }
    }
    return false;
  }

  var edgeUses = {};
  var edgeTiles = {};
  var cityTiles = [];
  var hullRadius = 0;

  function refreshHull() {
    var max = 0;
    var i;
    for (i = 0; i < graph.keys.length; i++) {
      var key = graph.keys[i];
      if (String(key).indexOf("rim-") === 0) {
        continue;
      }
      var node = graph.nodes[key];
      if (!node) {
        continue;
      }
      var radius = Math.hypot(node.x, node.z);
      if (radius > max) {
        max = radius;
      }
    }
    hullRadius = max;
  }

  function assignEdgeUse(from, to, use) {
    var id = edgeKey(from, to);
    if (!use) {
      delete edgeUses[id];
      return;
    }
    edgeUses[id] = use;
  }

  function edgeUse(from, to) {
    return edgeUses[edgeKey(from, to)] || null;
  }

  function pickBayEdgeForTile(q, r) {
    var i;
    for (i = 0; i < cityTiles.length; i++) {
      var rec = cityTiles[i];
      if (rec.q === q && rec.r === r && rec.edges && rec.edges.length) {
        var preferred = null;
        var j;
        for (j = 0; j < rec.edges.length; j++) {
          if (edgeUses[rec.edges[j].id] === "stop") {
            return rec.edges[j];
          }
          if (!preferred) {
            preferred = rec.edges[j];
          }
        }
        return preferred;
      }
    }
    var center = axial(q, r);
    var best = null;
    var bestScore = -1;
    Object.keys(edgeTiles).forEach(function (id) {
      var tiles = edgeTiles[id];
      if (!tiles || !tiles.length) {
        return;
      }
      var facing = false;
      var t;
      for (t = 0; t < tiles.length; t++) {
        if (tiles[t].q === q && tiles[t].r === r) {
          facing = true;
          break;
        }
      }
      if (!facing) {
        return;
      }
      var bits = id.split("|");
      var dir = parkHeading(bits[0], bits[1]);
      if (!dir) {
        return;
      }
      var mid = placeOnEdge(dir.from, dir.to, 0.5, 0);
      if (!mid) {
        return;
      }
      var score = 1 / (1 + Math.hypot(mid.x - center.x, mid.z - center.z));
      if (score > bestScore) {
        bestScore = score;
        best = { from: dir.from, to: dir.to, id: id };
      }
    });
    return best;
  }

  function syncEdgeUsesFromState(state) {
    edgeUses = {};
    (state.zones || []).forEach(function (zone) {
      if (!zone || zone.type !== "traffic") {
        return;
      }
      var edge = pickBayEdgeForTile(zone.q, zone.r);
      if (!edge) {
        return;
      }
      /* E-Taxi: Bucht für Stand-Taxis reserviert (kein Filler-Parken). */
      if (isTaxiZone(zone)) {
        assignEdgeUse(edge.from, edge.to, "stop");
      } else {
        assignEdgeUse(edge.from, edge.to, "lot");
      }
    });
  }

  function shoulderOnBoard(fromKey, toKey) {
    if (!fromKey || !toKey || String(fromKey).indexOf("rim-") === 0 || String(toKey).indexOf("rim-") === 0) {
      return false;
    }
    var tiles = edgeTiles[edgeKey(fromKey, toKey)];
    var a = graph.nodes[fromKey];
    var b = graph.nodes[toKey];
    if (!tiles || !tiles.length || !a || !b) {
      return false;
    }
    var dx = b.x - a.x;
    var dz = b.z - a.z;
    var len = Math.hypot(dx, dz) || 1;
    var rx = -dz / len;
    var rz = dx / len;
    var mx = (a.x + b.x) / 2;
    var mz = (a.z + b.z) / 2;
    var facing = null;
    var best = 0.4;
    var i;
    for (i = 0; i < tiles.length; i++) {
      var vx = tiles[i].x - mx;
      var vz = tiles[i].z - mz;
      var dot = vx * rx + vz * rz;
      if (dot > best) {
        best = dot;
        facing = tiles[i];
      }
    }
    if (!facing) {
      return false;
    }
    var pose = placeOnEdge(fromKey, toKey, 0.5, parkLane("car"));
    var mid = placeOnEdge(fromKey, toKey, 0.5, 0);
    if (!pose || !mid) {
      return false;
    }
    var atTile = Math.hypot(pose.x - facing.x, pose.z - facing.z);
    var roadTile = Math.hypot(mid.x - facing.x, mid.z - facing.z);
    return atTile < roadTile - 0.25;
  }

  function shoulderOk(from, to) {
    var use = edgeUse(from, to);
    if (use === "closed") {
      return false;
    }
    return shoulderOnBoard(from, to);
  }

  function parkHeading(a, b) {
    if (shoulderOnBoard(a, b)) {
      return { from: a, to: b };
    }
    if (shoulderOnBoard(b, a)) {
      return { from: b, to: a };
    }
    return null;
  }

  function driveLane(kind) {
    /* Mitte der jeweiligen Fahrtrichtung (±ROAD_W/4 je nach from→to). */
    return ROAD_W / 4;
  }

  function parkLane(kind) {
    if (kind === "bus") {
      return 1.62;
    }
    if (kind === "van") {
      return 1.52;
    }
    return 1.48;
  }

  function parkingSlotsList() {
    if (!Nexus.BoardEdges || !parkingCatalog) {
      return [];
    }
    return Nexus.BoardEdges.allSlots(parkingCatalog);
  }

  function slotOccId(featureId, slotIndex) {
    return featureId + "#" + slotIndex;
  }

  function slotTaken(featureId, slotIndex, ignore) {
    var id = slotOccId(featureId, slotIndex);
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === ignore) {
        continue;
      }
      if (other.mode !== "park" && other.mode !== "wait" && other.mode !== "in") {
        continue;
      }
      if (other.bay === id || (other.featureId === featureId && other.baySlot === slotIndex)) {
        return true;
      }
    }
    return false;
  }

  function applySlotToCar(car, feature, slotIndex, snapLane) {
    var pose = Nexus.BoardEdges.featureSlotPose(feature, slotIndex);
    if (!pose) {
      return false;
    }
    car.from = feature.from;
    car.to = feature.to;
    car.bay = slotOccId(feature.id, slotIndex);
    car.featureId = feature.id;
    car.baySlot = slotIndex;
    car.bayU = pose.u;
    car.parkDepth = pose.depth;
    car.parkPose = { x: pose.x, z: pose.z, ang: pose.ang };
    car.yawOff = 0;
    car.parkReverse = !!pose.reverse;
    car.parkKind = feature.kind || null;
    if (snapLane) {
      car.lane = pose.depth;
      car.u = pose.u;
    }
    return true;
  }

  function turnWindow(kind) {
    if (kind === "bus") {
      return { inU: 0.8, outU: 0.36 };
    }
    if (kind === "van") {
      return { inU: 0.82, outU: 0.28 };
    }
    return { inU: 0.84, outU: 0.26 };
  }

  function bayOf(id) {
    var carsN = 0;
    var bus = false;
    var i;
    for (i = 0; i < cars.length; i++) {
      if (cars[i].bay !== id) {
        continue;
      }
      if (cars[i].kind === "bus") {
        bus = true;
      } else {
        carsN += 1;
      }
    }
    return { cars: carsN, bus: bus };
  }

  function parkSep(kind) {
    return kind === "van" || kind === "bus" ? 3.6 : 2.85;
  }

  function parkedPose(car) {
    if (!car) {
      return null;
    }
    if (car.parkPose) {
      return { x: car.parkPose.x, z: car.parkPose.z, ang: car.parkPose.ang };
    }
    if (car.featureId != null && car.baySlot != null && parkingCatalog && Nexus.BoardEdges) {
      var feature = null;
      var list = parkingCatalog.features || [];
      var fi;
      for (fi = 0; fi < list.length; fi++) {
        if (list[fi].id === car.featureId) {
          feature = list[fi];
          break;
        }
      }
      if (feature) {
        var slotPose = Nexus.BoardEdges.featureSlotPose(feature, car.baySlot);
        if (slotPose) {
          return { x: slotPose.x, z: slotPose.z, ang: slotPose.ang };
        }
      }
    }
    var u = car.bayU != null ? car.bayU : car.u;
    var depth = car.parkDepth != null ? car.parkDepth : parkLane(car.kind);
    return placeOnEdge(car.from, car.to, u, depth);
  }

  /* Weltabstand: Kenney-Modelle länger als alte Boxen — kein Ineinanderparken. */
  function parkClearAtPose(pose, kind, ignore) {
    if (!pose) {
      return false;
    }
    var need = parkSep(kind);
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === ignore) {
        continue;
      }
      if (other.mode !== "park" && other.mode !== "wait" && other.mode !== "in") {
        continue;
      }
      var op = parkedPose(other);
      if (!op) {
        continue;
      }
      var sep = Math.max(need, parkSep(other.kind));
      if (Math.hypot(pose.x - op.x, pose.z - op.z) < sep) {
        return false;
      }
    }
    return true;
  }

  function parkClearAt(from, to, bayU, kind, ignore) {
    var depth = kind === "bus" ? parkLane(kind) : ROAD_W * 0.5 + 0.9;
    var pose = placeOnEdge(from, to, bayU, depth);
    return parkClearAtPose(pose, kind, ignore);
  }

  function featureParkSep(feature, kind) {
    if (feature && feature.kind === "perpendicular") {
      /* 4 Slots auf einer Kante — enger als freies Shoulder-Parken. */
      return kind === "van" ? 1.85 : 1.55;
    }
    if (feature && feature.kind === "parallel") {
      return kind === "van" ? 3.1 : 2.55;
    }
    return parkSep(kind);
  }

  function parkClearSlot(feature, slotIndex, kind, ignore) {
    if (slotTaken(feature.id, slotIndex, ignore)) {
      return false;
    }
    var pose = Nexus.BoardEdges.featureSlotPose(feature, slotIndex);
    if (!pose) {
      return false;
    }
    var need = featureParkSep(feature, kind);
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === ignore) {
        continue;
      }
      if (other.mode !== "park" && other.mode !== "wait" && other.mode !== "in") {
        continue;
      }
      var op = parkedPose(other);
      if (!op) {
        continue;
      }
      var otherNeed = featureParkSep(
        other.parkKind ? { kind: other.parkKind } : feature,
        other.kind
      );
      var sep = Math.max(need, otherNeed);
      if (Math.hypot(pose.x - op.x, pose.z - op.z) < sep) {
        return false;
      }
    }
    return true;
  }

  function bayMidpoint(bay) {
    var a = graph.nodes[bay.a || bay.from];
    var b = graph.nodes[bay.b || bay.to];
    if (!a || !b) {
      return { x: 0, z: 0 };
    }
    return { x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 };
  }

  /* Maximin: gleichmäßig über die Stadt, nicht nur nach Kantenzahl (Mitte). */
  function spreadPick(items, count, xzOf) {
    var pool = items.slice();
    var out = [];
    var guard = 0;
    while (out.length < count && pool.length && guard < items.length + 4) {
      guard += 1;
      var bestI = 0;
      var bestScore = -1;
      var i;
      for (i = 0; i < pool.length; i++) {
        var p = xzOf(pool[i]);
        var score;
        if (!out.length) {
          score = Math.random();
        } else {
          var minD = 1e9;
          var j;
          for (j = 0; j < out.length; j++) {
            var q = xzOf(out[j]);
            var d = Math.hypot(p.x - q.x, p.z - q.z);
            if (d < minD) {
              minD = d;
            }
          }
          score = minD;
        }
        if (score > bestScore) {
          bestScore = score;
          bestI = i;
        }
      }
      out.push(pool.splice(bestI, 1)[0]);
    }
    return out;
  }

  function claimBay(agent) {
    var id = edgeKey(agent.from, agent.to);
    var use = edgeUses[id] || null;
    if (use === "stop" && agent.kind !== "bus") {
      return false;
    }
    if (use === "lot" && agent.kind === "bus") {
      return false;
    }
    if (agent.kind === "bus" || use === "stop") {
      if (!shoulderOk(agent.from, agent.to)) {
        return false;
      }
      var occ = bayOf(id);
      if (occ.bus || occ.cars) {
        return false;
      }
      if (!parkClearAt(agent.from, agent.to, 0.5, agent.kind, agent)) {
        return false;
      }
      agent.bay = id;
      agent.bayU = 0.5;
      agent.featureId = null;
      agent.baySlot = null;
      agent.parkPose = null;
      agent.parkDepth = parkLane(agent.kind);
      return true;
    }
    var feature =
      Nexus.BoardEdges && parkingCatalog
        ? Nexus.BoardEdges.findFeatureOnEdge(parkingCatalog, agent.from, agent.to)
        : null;
    if (!feature || !feature.slots || !feature.slots.length) {
      return false;
    }
    if (feature.from !== agent.from || feature.to !== agent.to) {
      /* Spurrichtung an die Bucht anpassen. */
      agent.from = feature.from;
      agent.to = feature.to;
      agent.u = 1 - Math.max(0.05, Math.min(0.95, agent.u));
    }
    var si;
    for (si = 0; si < feature.slots.length; si++) {
      if (!parkClearSlot(feature, si, agent.kind, agent)) {
        continue;
      }
      return applySlotToCar(agent, feature, si, false);
    }
    return false;
  }

  function laneClear(agent) {
    var i;
    for (i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other === agent || other.mode === "park" || other.mode === "wait" || other.mode === "in") {
        continue;
      }
      var same = other.from === agent.from && other.to === agent.to;
      var opp = other.from === agent.to && other.to === agent.from;
      if (!same && !opp) {
        continue;
      }
      var ou = same ? other.u : 1 - other.u;
      if (Math.abs(ou - agent.u) < 0.4 && other.lane < 1.15) {
        return false;
      }
    }
    return true;
  }

  function bendPose(fromA, toA, uA, fromB, toB, uB, t, lane) {
    var p0 = placeOnEdge(fromA, toA, uA, lane);
    var p1 = placeOnEdge(fromB, toB, uB, lane);
    if (!p0 || !p1) {
      return null;
    }
    var turn = Math.abs(angleDelta(p1.ang, p0.ang));
    if (turn < 0.22) {
      return null;
    }
    var dist = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
    var handle = Math.max(0.55, Math.min(dist * 0.46, 0.7 + turn * 1.25));
    var c0x = p0.x + Math.sin(p0.ang) * handle;
    var c0z = p0.z + Math.cos(p0.ang) * handle;
    var c1x = p1.x - Math.sin(p1.ang) * handle;
    var c1z = p1.z - Math.cos(p1.ang) * handle;
    var s = Math.max(0, Math.min(1, t));
    var o = 1 - s;
    var x = o * o * o * p0.x + 3 * o * o * s * c0x + 3 * o * s * s * c1x + s * s * s * p1.x;
    var z = o * o * o * p0.z + 3 * o * o * s * c0z + 3 * o * s * s * c1z + s * s * s * p1.z;
    var tx = 3 * o * o * (c0x - p0.x) + 6 * o * s * (c1x - c0x) + 3 * s * s * (p1.x - c1x);
    var tz = 3 * o * o * (c0z - p0.z) + 6 * o * s * (c1z - c0z) + 3 * s * s * (p1.z - c1z);
    return {
      x: x,
      z: z,
      ang: Math.hypot(tx, tz) > 0.02 ? Math.atan2(tx, tz) : p1.ang
    };
  }

  /*
   * Querparken (4er): erst ausrichten, dann Nase voraus / rückwärts in die Bucht —
   * kein seitlicher Slide von Straße→Slot.
   * t=0 Straße, t=1 geparkt (Ausparken nutzt 1−maneuver).
   */
  function perpParkPose(agent, tIn) {
    var park = agent.parkPose;
    if (!park) {
      return null;
    }
    var u = agent.bayU != null ? agent.bayU : agent.u;
    var road = placeOnEdge(agent.from, agent.to, u, driveLane(agent.kind));
    if (!road) {
      return { x: park.x, z: park.z, ang: park.ang };
    }
    var t = Math.max(0, Math.min(1, tIn));
    var enterX = road.x + (park.x - road.x) * 0.2;
    var enterZ = road.z + (park.z - road.z) * 0.2;
    var ang0 = road.ang;
    var ang1 = park.ang;
    var dAng = ang1 - ang0;
    while (dAng > Math.PI) {
      dAng -= Math.PI * 2;
    }
    while (dAng < -Math.PI) {
      dAng += Math.PI * 2;
    }
    if (t < 0.3) {
      var s = t / 0.3;
      var ease = s * s * (3 - 2 * s);
      return {
        x: road.x + (enterX - road.x) * ease,
        z: road.z + (enterZ - road.z) * ease,
        ang: ang0 + dAng * ease
      };
    }
    var s2 = (t - 0.3) / 0.7;
    var ease2 = s2 * s2 * (3 - 2 * s2);
    return {
      x: enterX + (park.x - enterX) * ease2,
      z: enterZ + (park.z - enterZ) * ease2,
      ang: ang1
    };
  }

  function poseAgent(agent) {
    var lane = agent.lane;
    var u = Math.max(0, Math.min(0.999, agent.u));
    if (agent.mode === "park" || agent.mode === "wait") {
      var parked = parkedPose(agent);
      if (parked) {
        return parked;
      }
    }
    if (agent.mode === "in" || agent.mode === "out") {
      if (agent.parkKind === "perpendicular" && agent.parkPose) {
        var tp = Math.max(0, Math.min(1, agent.maneuver || 0));
        if (agent.mode === "out") {
          tp = 1 - tp;
        }
        var perpPose = perpParkPose(agent, tp);
        if (perpPose) {
          return perpPose;
        }
      }
      var road = placeOnEdge(agent.from, agent.to, u, lane);
      if (!road) {
        return null;
      }
      if (agent.parkPose) {
        var t = Math.max(0, Math.min(1, agent.maneuver || 0));
        if (agent.mode === "out") {
          t = 1 - t;
        }
        var ang0 = road.ang;
        var ang1 = agent.parkPose.ang;
        var dAng = ang1 - ang0;
        while (dAng > Math.PI) {
          dAng -= Math.PI * 2;
        }
        while (dAng < -Math.PI) {
          dAng += Math.PI * 2;
        }
        return {
          x: road.x + (agent.parkPose.x - road.x) * t,
          z: road.z + (agent.parkPose.z - road.z) * t,
          ang: ang0 + dAng * t + (agent.yaw || 0)
        };
      }
      road.ang += agent.yaw || 0;
      return road;
    }
    var driving = !agent.mode || agent.mode === "drive";
    var win = turnWindow(agent.kind);
    var span = (1 - win.inU) + win.outU;
    if (driving && agent.plan && String(agent.plan).indexOf("rim-") !== 0 && u >= win.inU) {
      var bent = bendPose(agent.from, agent.to, win.inU, agent.to, agent.plan, win.outU, (u - win.inU) / span, lane);
      if (bent) {
        return bent;
      }
    }
    if (driving && agent.prevKey && String(agent.prevKey).indexOf("rim-") !== 0 && u < win.outU) {
      var bentOut = bendPose(agent.prevKey, agent.from, win.inU, agent.from, agent.to, win.outU, ((1 - win.inU) + u) / span, lane);
      if (bentOut) {
        return bentOut;
      }
    }
    return placeOnEdge(agent.from, agent.to, u, lane);
  }

  function densityMul() {
    if (densityLevel <= 0) {
      return 0.3;
    }
    if (densityLevel >= 2) {
      return 1.75;
    }
    return 1;
  }

  /* Linienbus-Fallback-Farbe (kein Antriebs-Tint mehr). */
  function busBodyColor() {
    return new THREE.Color("#3d6ea8");
  }

  function evShare() {
    var state = lastState;
    if (!state) {
      return 0.12;
    }
    var ev = 0;
    var weight = 2;
    (state.busLines || []).forEach(function (line) {
      weight += 1;
      if (line.propulsion && line.propulsion !== "diesel") {
        ev += 1;
      }
    });
    (state.zones || []).forEach(function (zone) {
      if (zone.trafficMode === "garage" || (zone.type === "energy" && zone.variant !== "transformer")) {
        ev += 1;
        weight += 1;
      }
    });
    (state.players || []).forEach(function (player) {
      var devices = player.devices || {};
      if (devices.charger || devices.charging_network) {
        ev += 1;
        weight += 1;
      }
    });
    return Math.max(0.08, Math.min(0.82, ev / weight));
  }

  function vehicleKind(index) {
    if (index % 8 === 0) {
      return "bus";
    }
    if (index % 8 === 3) {
      return "van";
    }
    return "car";
  }

  function vehGeo(kind) {
    if (kind === "bus") return geo.vehBus;
    if (kind === "van") return geo.vehVan;
    if (kind === "bike") return geo.vehBike;
    return geo.vehCar;
  }

  function clearKenneyCarRoots() {
    var i;
    for (i = 0; i < cars.length; i++) {
      var root = cars[i] && cars[i].root;
      if (root && root.parent) {
        root.parent.remove(root);
      }
      if (cars[i]) {
        cars[i].root = null;
      }
    }
  }

  function clearFleet() {
    clearKenneyCarRoots();
    Object.keys(fleet).forEach(function (kind) {
      var mesh = fleet[kind];
      if (mesh && mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    fleet = {};
    if (headMesh && headMesh.parent) {
      headMesh.parent.remove(headMesh);
    }
    headMesh = null;
    if (headPoolMesh && headPoolMesh.parent) {
      headPoolMesh.parent.remove(headPoolMesh);
    }
    headPoolMesh = null;
    if (blinkMesh && blinkMesh.parent) {
      blinkMesh.parent.remove(blinkMesh);
    }
    blinkMesh = null;
    if (brakeMesh && brakeMesh.parent) {
      brakeMesh.parent.remove(brakeMesh);
    }
    brakeMesh = null;
    if (carMesh && carMesh.parent) carMesh.parent.remove(carMesh);
    if (carCabin && carCabin.parent) carCabin.parent.remove(carCabin);
    if (pedMesh && pedMesh.parent) pedMesh.parent.remove(pedMesh);
    carMesh = null;
    carCabin = null;
    pedMesh = null;
  }

  function kenneyCarsOk() {
    return !!(
      Nexus.KenneyBuildings &&
      Nexus.KenneyBuildings.isReady &&
      Nexus.KenneyBuildings.isReady() &&
      Nexus.KenneyBuildings.pickTrafficVehicle &&
      Nexus.KenneyBuildings.cloneVehicle &&
      Nexus.KenneyBuildings.qualityAllows(kenneyTierNow())
    );
  }


  function pedClothes(i) {
    var palette = ["#1f6feb", "#e85d04", "#2a9d8f", "#9b2226", "#7b2cbf", "#ca6702", "#0077b6", "#bc4749"];
    return new THREE.Color(palette[i % palette.length]);
  }

  function pickWalkGoal(fromIndex) {
    if (!walkSites.length) {
      return fromIndex;
    }
    var tries = 0;
    var to = fromIndex;
    while (tries < 12) {
      to = Math.floor(Math.random() * walkSites.length);
      if (to !== fromIndex) {
        return to;
      }
      tries += 1;
    }
    return (fromIndex + 1) % walkSites.length;
  }

  function makePedWaypoints(fromSite, toSite) {
    var pts = [];
    if (!fromSite || !toSite) {
      return pts;
    }
    pts.push({ x: fromSite.door.x, z: fromSite.door.z, y: TILE_H + 0.55, kind: "door" });
    pts.push({ x: fromSite.curb.x, z: fromSite.curb.z, y: TILE_H + 0.42, kind: "curb" });
    if (fromSite.key !== toSite.key) {
      var midX = (fromSite.curb.x + toSite.curb.x) * 0.5;
      var midZ = (fromSite.curb.z + toSite.curb.z) * 0.5;
      var shared = fromSite.edge === toSite.edge;
      var touch =
        fromSite.a === toSite.a ||
        fromSite.a === toSite.b ||
        fromSite.b === toSite.a ||
        fromSite.b === toSite.b;
      if (shared || touch) {
        pts.push({
          x: midX,
          z: midZ,
          y: ROAD_Y + 0.35,
          kind: "cross",
          edge: fromSite.edge,
          a: fromSite.a,
          b: fromSite.b
        });
      } else {
        pts.push({
          x: midX,
          z: midZ,
          y: TILE_H + 0.4,
          kind: "walk",
          edge: fromSite.edge,
          a: fromSite.a,
          b: fromSite.b
        });
        pts.push({
          x: (midX + toSite.curb.x) * 0.5,
          z: (midZ + toSite.curb.z) * 0.5,
          y: ROAD_Y + 0.35,
          kind: "cross",
          edge: toSite.edge,
          a: toSite.a,
          b: toSite.b
        });
      }
    }
    pts.push({ x: toSite.curb.x, z: toSite.curb.z, y: TILE_H + 0.42, kind: "curb" });
    pts.push({ x: toSite.door.x, z: toSite.door.z, y: TILE_H + 0.55, kind: "door" });
    return pts;
  }

  function carsNearEdge(a, b, radius) {
    var na = graph.nodes[a];
    var nb = graph.nodes[b];
    if (!na || !nb) {
      return false;
    }
    var mx = (na.x + nb.x) * 0.5;
    var mz = (na.z + nb.z) * 0.5;
    var i;
    for (i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.mode === "park" || car.mode === "wait") {
        continue;
      }
      var spot = placeOnEdge(car.from, car.to, car.u, car.lane || 0);
      if (!spot) {
        continue;
      }
      if (Math.hypot(spot.x - mx, spot.z - mz) < (radius || 3.4)) {
        return true;
      }
    }
    return false;
  }

  function pedCanCross(pt, time) {
    if (!pt || pt.kind !== "cross") {
      return true;
    }
    var red = lightIsRed(pt.a, time) || lightIsRed(pt.b, time);
    if (red) {
      return true;
    }
    return !carsNearEdge(pt.a, pt.b, 3.6);
  }

  function spawnPedestrians(pedCount) {
    if (!pedCount || !walkSites.length || !geo.box) {
      return;
    }
    var colorMat = new THREE.MeshLambertMaterial({
      color: "#ffffff",
      vertexColors: true
    });
    pedMesh = new THREE.InstancedMesh(geo.box, colorMat, pedCount);
    pedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    pedMesh.frustumCulled = false;
    roots.cars.add(pedMesh);
    var i;
    for (i = 0; i < pedCount; i++) {
      var fromI = i % walkSites.length;
      var toI = pickWalkGoal(fromI);
      var path = makePedWaypoints(walkSites[fromI], walkSites[toI]);
      var color = pedClothes(i);
      pedMesh.setColorAt(i, color);
      var start = path[0] || { x: 0, y: TILE_H, z: 0 };
      peds.push({
        fromI: fromI,
        toI: toI,
        path: path,
        wi: Math.floor(Math.random() * Math.max(1, path.length - 1)),
        u: Math.random() * 0.4,
        speed: 0.7 + (i % 4) * 0.12,
        wait: 0,
        color: color,
        x: start.x,
        y: start.y,
        z: start.z,
        ang: 0,
        dwell: Math.random() * 0.6
      });
    }
    if (pedMesh.instanceColor) {
      pedMesh.instanceColor.needsUpdate = true;
    }
  }

  function retargetPed(ped) {
    if (!walkSites.length) {
      return;
    }
    ped.fromI = ped.toI;
    ped.toI = pickWalkGoal(ped.fromI);
    ped.path = makePedWaypoints(walkSites[ped.fromI], walkSites[ped.toI]);
    ped.wi = 0;
    ped.u = 0;
    ped.wait = 0;
    ped.dwell = 0.5 + Math.random() * 1.6;
  }

  function stepPedestrian(ped, dt, time) {
    if (!ped.path || ped.path.length < 2) {
      retargetPed(ped);
      return;
    }
    if (ped.dwell > 0) {
      ped.dwell -= dt;
      return;
    }
    var a = ped.path[ped.wi];
    var b = ped.path[Math.min(ped.wi + 1, ped.path.length - 1)];
    if (!a || !b) {
      retargetPed(ped);
      return;
    }
    if (b.kind === "cross" && ped.u < 0.08 && !pedCanCross(b, time)) {
      ped.wait += dt;
      if (ped.wait < 8) {
        return;
      }
    }
    ped.wait = 0;
    var dx = b.x - a.x;
    var dz = b.z - a.z;
    var dist = Math.hypot(dx, dz) || 0.001;
    var pace = ped.speed * (b.kind === "cross" ? 0.85 : 1);
    ped.u += (pace * dt) / dist;
    if (ped.u >= 1) {
      ped.u = 0;
      ped.wi += 1;
      if (ped.wi >= ped.path.length - 1) {
        ped.x = b.x;
        ped.y = b.y;
        ped.z = b.z;
        retargetPed(ped);
        return;
      }
      a = ped.path[ped.wi];
      b = ped.path[ped.wi + 1];
    }
    if (!a || !b) {
      return;
    }
    var t = ped.u;
    var s = t * t * (3 - 2 * t);
    ped.x = a.x + (b.x - a.x) * s;
    ped.z = a.z + (b.z - a.z) * s;
    ped.y = a.y + (b.y - a.y) * s;
    ped.ang = Math.atan2(b.x - a.x, b.z - a.z);
  }

  function spawnCars() {
    clearKenneyCarRoots();
    cars = [];
    peds = [];
    clearFleet();
    if (!graph.keys.length || !geo.vehCar || !CAR_COUNT) {
      return;
    }
    refreshHull();
    var count = Math.max(12, Math.round(CAR_COUNT * densityMul() * 2.2));
    var pool = graph.keys.filter(function (key) {
      return String(key).indexOf("rim-") !== 0 && graph.nodes[key] && graph.nodes[key].next.length;
    });
    if (!pool.length) {
      pool = graph.keys.slice();
    }
    var useKenney = kenneyCarsOk();
    var specialBag = {};
    var buckets = { car: [], van: [], bus: [], bike: [] };
    var slotPool = parkingSlotsList().filter(function (entry) {
      var use = edgeUses[entry.feature.edgeId] || null;
      return use !== "stop";
    });
    var driveEdges = [];
    var seenDrive = {};
    pool.forEach(function (key) {
      var node = graph.nodes[key];
      if (!node) {
        return;
      }
      node.next.forEach(function (nb) {
        if (String(nb).indexOf("rim-") === 0) {
          return;
        }
        var id = edgeKey(key, nb);
        if (seenDrive[id]) {
          return;
        }
        seenDrive[id] = true;
        var use = edgeUses[id] || null;
        if (use === "lot" || use === "stop") {
          return;
        }
        driveEdges.push({ a: key, b: nb, id: id });
      });
    });
    var parkedGoal = Math.ceil(count * 0.72);
    var made = [];
    var shadowsOn = !!(qualityParams() && qualityParams().shadows);
    var parkPool = slotPool;
    var drivePool = driveEdges;

    function pickModel() {
      if (!useKenney) {
        return null;
      }
      return Nexus.KenneyBuildings.pickTrafficVehicle(specialBag);
    }

    /* Filler: Kenney-Autos. E-Taxi-Stand separat (syncTaxiFleet). */
    function pushCar(kind, from, to, u, lane, mode, bay, bayU) {
      var model = pickModel();
      var modelKind = model && model.kind ? model.kind : kind;
      var cruise = model && model.slow ? 0.13 + Math.random() * 0.04 : 0.22 + Math.random() * 0.06;
      if (modelKind === "van" && !(model && model.slow)) {
        cruise = 0.18 + Math.random() * 0.05;
      }
      var agent = {
        from: from,
        to: to,
        u: u,
        speed: mode === "drive" ? cruise : 0,
        cruise: cruise,
        hold: 0,
        kind: modelKind,
        modelId: model ? model.id : null,
        rear: model && model.foot ? model.foot * 0.48 : modelKind === "van" ? 1.12 : 0.96,
        fwd: model && model.foot ? model.foot * 0.46 : modelKind === "van" ? 1.15 : 0.92,
        lane: lane,
        laneSign: 1,
        mode: mode,
        parkLeft: 8 + Math.random() * 36,
        brakeHold: mode === "park" ? 0 : 0,
        driveT: 32 + Math.random() * 40,
        slot: buckets[modelKind].length,
        color: busBodyColor(),
        seed: made.length * 13 + 3,
        turn: 0,
        yaw: 0,
        yawOff: 0,
        legs: 0,
        bay: bay,
        bayU: bayU,
        featureId: null,
        baySlot: null,
        parkPose: null,
        parkDepth: null,
        parkReverse: false,
        prevKey: null,
        plan: null,
        edgePlanned: false,
        root: null
      };
      if (model && Nexus.KenneyBuildings.cloneVehicle) {
        agent.root = Nexus.KenneyBuildings.cloneVehicle(model.id, shadowsOn);
        if (agent.root) {
          roots.cars.add(agent.root);
        }
      }
      agent.plan = chooseNext(agent.to, agent.from, agent);
      cars.push(agent);
      buckets[modelKind].push(agent);
      made.push(agent);
      return agent;
    }

    var parkPicks = spreadPick(parkPool, parkedGoal, function (entry) {
      return entry.pose || { x: 0, z: 0 };
    });
    var pi;
    for (pi = 0; pi < parkPicks.length; pi++) {
      var entry = parkPicks[pi];
      var parkKind = Math.random() < 0.2 ? "van" : "car";
      if (!parkClearSlot(entry.feature, entry.slotIndex, parkKind, null)) {
        continue;
      }
      var parked = pushCar(
        parkKind,
        entry.feature.from,
        entry.feature.to,
        entry.slot.u,
        entry.slot.depth,
        "park",
        entry.id,
        entry.slot.u
      );
      applySlotToCar(parked, entry.feature, entry.slotIndex, true);
      parked.speed = 0;
    }

    var driveGoal = Math.min(activeCap(), Math.max(3, Math.round(activeCap() * 0.9)));
    var drivePicks = spreadPick(drivePool, driveGoal * 2, bayMidpoint);
    var driving = 0;
    var di;
    for (di = 0; di < drivePicks.length && driving < driveGoal; di++) {
      var rollBay = drivePicks[di];
      if (!rollBay) {
        continue;
      }
      var kind = Math.random() < 0.2 ? "van" : "car";
      var lane = driveLane(kind);
      var startU = 0.18 + Math.random() * 0.64;
      var roadPose = placeOnEdge(rollBay.a, rollBay.b, startU, lane);
      if (!roadPose || !parkClearAtPose(roadPose, kind, null)) {
        continue;
      }
      var roller = pushCar(kind, rollBay.a, rollBay.b, startU, lane, "drive", null, null);
      roller.goal = pickGoal(roller);
      roller.driveT = 40 + Math.random() * 50;
      driving += 1;
    }
    dummy = dummy || new THREE.Object3D();
    /* Fallback-Boxen nur wenn Kenney-Modelle fehlen. */
    var mat = mats.vehicle || mats.car;
    Object.keys(buckets).forEach(function (kind) {
      var list = buckets[kind].filter(function (car) {
        return !car.root;
      });
      if (!list.length) {
        return;
      }
      var mesh = new THREE.InstancedMesh(vehGeo(kind), mat, list.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      var n;
      for (n = 0; n < list.length; n++) {
        list[n].slot = n;
        mesh.setColorAt(n, list[n].color);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      fleet[kind] = mesh;
      roots.cars.add(mesh);
    });
    var lit = cars.filter(function (car) { return car.kind !== "bike"; }).length;
    if (lit && geo.headBulb && mats.headlamp) {
      headMesh = new THREE.InstancedMesh(geo.headBulb, mats.headlamp, lit);
      headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      headMesh.frustumCulled = false;
      headMesh.visible = isNight();
      roots.cars.add(headMesh);
    }
    if (lit && geo.headPool && mats.headPool) {
      headPoolMesh = new THREE.InstancedMesh(geo.headPool, mats.headPool, lit);
      headPoolMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      headPoolMesh.frustumCulled = false;
      headPoolMesh.renderOrder = 6;
      headPoolMesh.visible = isNight();
      roots.cars.add(headPoolMesh);
    }
    if (cars.length && geo.box && mats.signYellow) {
      blinkMesh = new THREE.InstancedMesh(geo.box, mats.signYellow, cars.length);
      blinkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      blinkMesh.frustumCulled = false;
      roots.cars.add(blinkMesh);
    }
    if (cars.length && geo.box && mats.brake) {
      brakeMesh = new THREE.InstancedMesh(geo.box, mats.brake, cars.length);
      brakeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      brakeMesh.frustumCulled = false;
      roots.cars.add(brakeMesh);
    }
    updateCars(0, 0);
  }

  function lightIsRed(nodeKey, time) {
    var i;
    for (i = 0; i < lights.length; i++) {
      if (lights[i].node === nodeKey) {
        var t = (time + lights[i].phase) % 6.2;
        return t >= 3.3;
      }
    }
    return false;
  }

  function updateLights(time, force) {
    var night = isNight();
    var interval = activeQuality.lightInterval || 0;
    if (!force && interval && time - lastLightPulse < interval) {
      return;
    }
    lastLightPulse = time;
    lights.forEach(function (L) {
      var t = (time + L.phase) % 6.2;
      var phase = t < 2.7 ? "g" : t < 3.3 ? "y" : "r";
      if (!force && L.shown === phase && L.night === night) {
        return;
      }
      L.shown = phase;
      L.night = night;
      function set(mesh, on, live) {
        mesh.material.emissiveIntensity = on ? (night ? 1.8 : 0.7) : night ? 0.08 : 0.04;
        mesh.material.color.set(on ? live : "#2a2a2a");
      }
      set(L.gre, phase === "g", "#3dce6a");
      set(L.yel, phase === "y", "#ffd14a");
      set(L.red, phase === "r", "#ff4d3a");
    });
    if (force || lastLampNight !== night) {
      lastLampNight = night;
      lamps.forEach(function (bulb) {
        if (bulb && bulb.material) {
          bulb.material.emissiveIntensity = night ? 1.85 : 0.1;
        }
      });
      lampPools.forEach(function (pool) {
        if (!pool) {
          return;
        }
        pool.visible = night;
        if (pool.material) {
          pool.material.opacity = night ? 0.42 : 0;
        }
      });
      billboardSprites.forEach(function (spr) {
        if (!spr || !spr.material || !spr.material.map) {
          return;
        }
        var map = spr.material.map;
        if (spriteTextures.lampGlow && map === spriteTextures.lampGlow) {
          spr.material.opacity = night ? 0.9 : 0.06;
        }
      });
    }
  }

  function placeOnEdge(fromKey, toKey, u, lane) {
    var a = graph.nodes[fromKey];
    var b = graph.nodes[toKey];
    if (!a || !b) {
      return null;
    }
    var dx = b.x - a.x;
    var dz = b.z - a.z;
    var len = Math.hypot(dx, dz) || 1;
    var ang = Math.atan2(dx, dz);
    return {
      x: a.x + dx * u + (-dz / len) * lane,
      z: a.z + dz * u + (dx / len) * lane,
      ang: ang
    };
  }

  function indexCityTiles(playTiles) {
    cityTiles = [];
    var map = {};
    (playTiles || []).forEach(function (tile) {
      var c = axial(tile.q, tile.r);
      var rec = { q: tile.q, r: tile.r, x: c.x, z: c.z, edges: [], feature: null };
      map[tile.q + "," + tile.r] = rec;
      cityTiles.push(rec);
    });
    Object.keys(edgeTiles).forEach(function (id) {
      var bits = id.split("|");
      var a0 = graph.nodes[bits[0]];
      var b0 = graph.nodes[bits[1]];
      if (!a0 || !b0) {
        return;
      }
      (edgeTiles[id] || []).forEach(function (t) {
        var rec = map[t.q + "," + t.r];
        if (!rec) {
          return;
        }
        var frame =
          Nexus.BoardEdges && Nexus.BoardEdges.edgeFrame
            ? Nexus.BoardEdges.edgeFrame(a0, b0, { x: t.x, z: t.z })
            : null;
        if (!frame) {
          return;
        }
        rec.edges.push({ from: frame.from, to: frame.to, id: id });
      });
    });
    if (parkingCatalog && parkingCatalog.features) {
      parkingCatalog.features.forEach(function (feature) {
        var rec = map[feature.tile.q + "," + feature.tile.r];
        if (!rec) {
          return;
        }
        rec.feature = feature;
        var has = false;
        var e;
        for (e = 0; e < rec.edges.length; e++) {
          if (rec.edges[e].id === feature.edgeId) {
            rec.edges[e].from = feature.from;
            rec.edges[e].to = feature.to;
            rec.edges[e].featureId = feature.id;
            has = true;
            break;
          }
        }
        if (!has) {
          rec.edges.unshift({
            from: feature.from,
            to: feature.to,
            id: feature.edgeId,
            featureId: feature.id
          });
        }
      });
    }
  }

  function hexDistTiles(a, b) {
    if (!a || !b) {
      return 99;
    }
    var dq = a.q - b.q;
    var dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  function tileForAgent(agent) {
    var tiles = edgeTiles[edgeKey(agent.from, agent.to)] || [];
    var a = graph.nodes[agent.from];
    var b = graph.nodes[agent.to];
    if (!a || !b) {
      return null;
    }
    var mx = (a.x + b.x) / 2;
    var mz = (a.z + b.z) / 2;
    var dx = b.x - a.x;
    var dz = b.z - a.z;
    var len = Math.hypot(dx, dz) || 1;
    var rx = -dz / len;
    var rz = dx / len;
    var best = null;
    var bestD = 1e9;
    var i;
    for (i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if ((t.x - mx) * rx + (t.z - mz) * rz < 0.2) {
        continue;
      }
      var d = (t.x - mx) * (t.x - mx) + (t.z - mz) * (t.z - mz);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    if (!best) {
      return null;
    }
    for (i = 0; i < cityTiles.length; i++) {
      if (cityTiles[i].q === best.q && cityTiles[i].r === best.r) {
        return cityTiles[i];
      }
    }
    return null;
  }

  function pickGoal(agent) {
    var here = tileForAgent(agent);
    var options = [];
    var i;
    for (i = 0; i < cityTiles.length; i++) {
      var tile = cityTiles[i];
      if (!tile.feature || !tile.feature.slots || !tile.feature.slots.length) {
        continue;
      }
      if (here && hexDistTiles(here, tile) < 2) {
        continue;
      }
      options.push(tile);
    }
    if (!options.length) {
      for (i = 0; i < cityTiles.length; i++) {
        if (cityTiles[i].feature && cityTiles[i] !== here) {
          options.push(cityTiles[i]);
        }
      }
    }
    if (!options.length) {
      return null;
    }
    /* Ziel lieber dort, wo gerade wenige Autos sind (leichte Umverteilung). */
    var best = null;
    var bestScore = -1;
    var tries = Math.min(8, options.length);
    for (i = 0; i < tries; i++) {
      var tile = options[Math.floor(Math.random() * options.length)];
      var crowd = 0;
      var free = 0;
      var c;
      for (c = 0; c < cars.length; c++) {
        if (cars[c] === agent) {
          continue;
        }
        var other = tileForAgent(cars[c]);
        if (other && hexDistTiles(other, tile) <= 1) {
          crowd += 1;
        }
      }
      if (tile.feature) {
        var si;
        for (si = 0; si < tile.feature.slots.length; si++) {
          if (!slotTaken(tile.feature.id, si, agent)) {
            free += 1;
          }
        }
      }
      var score = 10 - crowd + free * 1.5 + Math.random() * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = tile;
      }
    }
    var pick = best || options[Math.floor(Math.random() * options.length)];
    var feature = pick.feature;
    return {
      from: feature.from,
      to: feature.to,
      id: feature.edgeId,
      featureId: feature.id,
      q: pick.q,
      r: pick.r
    };
  }

  function distToNode(target) {
    var dist = {};
    var queue = [target];
    dist[target] = 0;
    var head = 0;
    while (head < queue.length) {
      var key = queue[head];
      head += 1;
      var node = graph.nodes[key];
      if (!node) {
        continue;
      }
      var n;
      for (n = 0; n < node.next.length; n++) {
        var nb = node.next[n];
        if (String(nb).indexOf("rim-") === 0 || dist[nb] != null) {
          continue;
        }
        dist[nb] = dist[key] + 1;
        queue.push(nb);
      }
    }
    return dist;
  }

  function nextToward(atKey, prevKey, goal, agent) {
    if (!goal) {
      return chooseNext(atKey, prevKey, agent || null);
    }
    if (atKey === goal.from) {
      if (agent && prevKey) {
        setTurnSignal(agent, prevKey, atKey, goal.to);
      }
      return goal.to;
    }
    var dist = distToNode(goal.from);
    var node = graph.nodes[atKey];
    if (!node) {
      return chooseNext(atKey, prevKey, agent || null);
    }
    var best = null;
    var bestD = 1e9;
    var i;
    for (i = 0; i < node.next.length; i++) {
      var nb = node.next[i];
      if (String(nb).indexOf("rim-") === 0) {
        continue;
      }
      if (nb === prevKey && node.next.length > 1) {
        continue;
      }
      var d = dist[nb];
      if (d == null || d >= bestD) {
        continue;
      }
      bestD = d;
      best = nb;
    }
    if (!best) {
      return chooseNext(atKey, prevKey, agent || null);
    }
    if (agent && prevKey) {
      setTurnSignal(agent, prevKey, atKey, best);
    } else if (agent) {
      agent.turn = 0;
    }
    return best;
  }

  function activeCap() {
    /* Weniger gleichzeitig auf der Fahrbahn — Rest bleibt länger in Buchten. */
    return Math.max(5, Math.round((CAR_COUNT || 26) * densityMul() * 0.55));
  }

  function activeCount() {
    var n = 0;
    var i;
    for (i = 0; i < cars.length; i++) {
      var mode = cars[i].mode;
      if (mode === "drive" || mode === "out" || mode === "in" || (mode === "wait" && cars[i].goal)) {
        n += 1;
      }
    }
    return n;
  }

  function stepAgent(agent, dt, time, slow) {
    if (!slow && String(agent.to).indexOf("rim-") === 0) {
      agent.to = chooseNext(agent.from, agent.prevKey, agent);
      agent.plan = chooseNext(agent.to, agent.from, agent);
      agent.edgePlanned = false;
    }
    if (agent.plan && agent.from && agent.to) {
      setTurnSignal(agent, agent.from, agent.to, agent.plan);
    }
    var dest = graph.nodes[agent.to];
    var red = !slow && dest && dest.next.length >= 3 && lightIsRed(agent.to, time);
    var gap = slow ? 1 : carGap(agent);
    var win = turnWindow(agent.kind);
    var holdAt = win.inU - 0.035;
    if (red && agent.u >= holdAt - 0.16 && agent.u < win.inU) {
      if (agent.u >= holdAt - 0.008) {
        agent.speed = 0;
        return;
      }
      agent.speed = 0.07;
      agent.u = Math.min(holdAt, agent.u + agent.speed * dt);
      return;
    }
    if (!slow && !canEnterJunction(agent) && agent.u >= holdAt - 0.14 && agent.u < win.inU + 0.02) {
      if (agent.u >= holdAt - 0.008) {
        agent.speed = 0;
        return;
      }
      agent.speed = Math.min(agent.speed || 0.08, 0.06);
      agent.u = Math.min(holdAt, agent.u + agent.speed * dt);
      return;
    }
    if (gap < 0.2) {
      agent.speed = Math.max(0, (agent.speed || 0) - dt * 2.4);
    } else {
      var cruise = agent.cruise || 0.22;
      agent.speed = (agent.speed || 0) + (cruise - (agent.speed || 0)) * Math.min(1, dt * 2);
    }
    agent.u += Math.max(0, agent.speed) * dt;
    if (agent.u >= 1) {
      agent.prevKey = agent.from;
      agent.u = 0.004;
      agent.legs = (agent.legs || 0) + 1;
      agent.from = agent.to;
      if (agent.goal && agent.legs > 24) {
        agent.goal = pickGoal(agent);
        agent.legs = 0;
      }
      if (agent.goal) {
        agent.to = nextToward(agent.from, agent.prevKey, agent.goal, agent);
        agent.plan = nextToward(agent.to, agent.from, agent.goal, agent);
      } else {
        agent.to = agent.plan || chooseNext(agent.from, agent.prevKey, agent);
        if (String(agent.to).indexOf("rim-") === 0) {
          agent.to = chooseNext(agent.from, agent.prevKey, agent);
        }
        agent.plan = chooseNext(agent.to, agent.from, agent);
      }
      if (agent.plan) {
        setTurnSignal(agent, agent.from, agent.to, agent.plan);
      } else {
        agent.turn = 0;
      }
      agent.edgePlanned = false;
    }
  }

  function advanceManeuver(car, dt, intoPark) {
    var reverse = !!(car.parkReverse && car.parkPose);
    var perp = car.parkKind === "perpendicular";
    var dur = intoPark
      ? reverse
        ? perp
          ? 3.2
          : 3.1
        : perp
          ? 2.9
          : 2.6
      : reverse
        ? perp
          ? 3.0
          : 2.8
        : perp
          ? 2.7
          : 2.3;
    car.maneuver = Math.min(1, (car.maneuver || 0) + dt / dur);
    var s = car.maneuver;
    if (perp && car.parkPose) {
      /* Pose kommt aus perpParkPose — u/lane nur für Logik an Slot koppeln. */
      car.u = car.bayU != null ? car.bayU : car.u;
      car.lane = intoPark
        ? car.parkDepth != null
          ? car.parkDepth
          : parkLane(car.kind)
        : driveLane(car.kind);
      car.yaw = 0;
      car.turn = intoPark ? 1 : car.lane >= 0 ? -1 : 1;
      return s >= 1;
    }
    var swept = s < 0.34 ? (s / 0.34) * 0.1 : 0.1 + 0.9 * ((s - 0.34) / 0.66);
    swept = Math.max(0, Math.min(1, swept));
    var fromLane = car.maneuverFromLane;
    var toLane = intoPark
      ? car.parkDepth != null
        ? car.parkDepth
        : parkLane(car.kind)
      : driveLane(car.kind);
    car.lane = fromLane + (toLane - fromLane) * swept;
    var targetU = car.bayU != null ? car.bayU : car.maneuverFromU || car.u;
    if (intoPark) {
      car.u = (car.maneuverFromU || car.u) + (targetU - (car.maneuverFromU || car.u)) * s;
    } else {
      var gain = reverse ? -0.06 : 0.2;
      car.u = Math.max(0.05, Math.min(0.93, (car.maneuverFromU || car.u) + s * gain));
    }
    var yawAmp = reverse ? 0.35 : 0.95;
    car.yaw = (intoPark ? -1 : 1) * Math.sin(s * Math.PI) * yawAmp;
    car.turn = intoPark ? 1 : -1;
    return s >= 1;
  }

  function beginManeuver(car, mode) {
    car.mode = mode;
    car.maneuver = 0;
    car.maneuverFromU = car.u;
    car.maneuverFromLane = car.lane;
    if (car.parkKind === "perpendicular" && car.bayU != null) {
      car.u = car.bayU;
    }
    car.yaw = 0;
    car.speed = mode === "in" ? Math.min(car.speed || 0.12, 0.14) : 0.08;
  }

  function updateCars(dt, time) {
    if (!dummy) {
      return;
    }
    var night = isNight();
    if (headMesh) {
      headMesh.visible = !!night;
    }
    if (headPoolMesh) {
      headPoolMesh.visible = !!night;
    }
    var lit = 0;
    var i;
    var pending = [];
    for (i = 0; i < cars.length; i++) {
      var ahead = cars[i];
      if (ahead.mode === "drive" && !ahead.edgePlanned && ahead.u > 0.36 && ahead.u < 0.72) {
        pending.push(ahead);
      }
    }
    pending.sort(function (a, b) { return b.u - a.u; });
    for (i = 0; i < pending.length; i++) {
      if (pending[i].goal) {
        pending[i].plan = nextToward(pending[i].to, pending[i].from, pending[i].goal, pending[i]);
      } else {
        pending[i].plan = chooseNext(pending[i].to, pending[i].from, pending[i]);
      }
      if (pending[i].plan) {
        setTurnSignal(pending[i], pending[i].from, pending[i].to, pending[i].plan);
      }
      pending[i].edgePlanned = true;
    }
    for (i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.mode === "park") {
        car.parkLeft -= dt;
        car.speed = 0;
        car.lane = car.parkDepth != null ? car.parkDepth : parkLane(car.kind);
        car.turn = 0;
        if (car.brakeHold > 0) {
          car.brakeHold -= dt;
        }
        if (car.parkLeft <= 0) {
          if (activeCount() >= activeCap()) {
            car.parkLeft = 3 + Math.random() * 6;
          } else {
            car.goal = pickGoal(car);
            if (!car.goal) {
              car.parkLeft = 8;
            } else {
              car.mode = "wait";
              /* Ausparken: Blinker zur Fahrbahn (lane > 0 = Bordstein → negativ = Straße). */
              car.turn = car.lane >= 0 ? -1 : 1;
              car.yaw = 0;
            }
          }
        }
      } else if (car.mode === "wait") {
        car.speed = 0;
        car.turn = car.lane >= 0 ? -1 : 1;
        car.yaw = 0;
        car.lane = car.parkDepth != null ? car.parkDepth : parkLane(car.kind);
        if (laneClear(car)) {
          beginManeuver(car, "out");
        }
      } else if (car.mode === "out") {
        car.turn = car.lane >= 0 ? -1 : 1;
        if ((car.maneuver || 0) < 0.14 && !laneClear(car)) {
          car.mode = "wait";
          car.lane = car.parkDepth != null ? car.parkDepth : parkLane(car.kind);
          car.u = car.bayU != null ? car.bayU : car.maneuverFromU || car.u;
          car.yaw = 0;
        } else if (advanceManeuver(car, dt, false)) {
          car.mode = "drive";
          car.lane = driveLane(car.kind);
          car.yaw = 0;
          car.bay = null;
          car.featureId = null;
          car.baySlot = null;
          car.parkPose = null;
          car.parkDepth = null;
          car.parkReverse = false;
          car.parkKind = null;
          car.speed = car.cruise || 0.16;
          car.turn = 0;
          car.edgePlanned = false;
          car.legs = 0;
          if (!car.goal) {
            car.goal = pickGoal(car);
          }
          car.plan = car.goal
            ? nextToward(car.to, car.from, car.goal, car)
            : chooseNext(car.to, car.from, car);
          if (car.plan) {
            setTurnSignal(car, car.from, car.to, car.plan);
          }
        }
      } else if (car.mode === "in") {
        car.turn = 1;
        car.speed = Math.max(0.04, (car.speed || 0.1) * 0.92);
        if (advanceManeuver(car, dt, true)) {
          car.mode = "park";
          car.lane = car.parkDepth != null ? car.parkDepth : parkLane(car.kind);
          car.u = car.bayU != null ? car.bayU : car.u;
          car.yaw = 0;
          car.speed = 0;
          car.parkLeft = 26 + Math.random() * 34;
          car.brakeHold = 1.6;
          car.turn = 0;
        }
      } else {
        stepAgent(car, dt, time, false);
        car.yaw = 0;
        if (car.goal && car.from === car.goal.from && car.to === car.goal.to && car.u > 0.32 && car.u < 0.78) {
          if (claimBay(car)) {
            beginManeuver(car, "in");
            car.turn = 1;
          } else {
            car.goal = pickGoal(car);
            car.plan = car.goal ? nextToward(car.to, car.from, car.goal, car) : car.plan;
            car.edgePlanned = true;
          }
        }
      }
      var spot = poseAgent(car);
      if (!spot) {
        continue;
      }
      if (car.root) {
        car.root.position.set(spot.x, ROAD_Y, spot.z);
        car.root.rotation.y = spot.ang + (car.yawOff || 0);
        car.root.visible = true;
      } else {
        var mesh = fleet[car.kind];
        if (!mesh) {
          continue;
        }
        dummy.position.set(spot.x, ROAD_Y + 0.02, spot.z);
        dummy.rotation.set(0, spot.ang, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(car.slot, dummy.matrix);
      }
      if (blinkMesh) {
        /* Ein Blinker: nur bei Abbiegen / Ein-/Ausparken, eine Seite, getaktet. */
        var signal = car.turn || 0;
        var showBlink =
          signal !== 0 &&
          Math.floor(time * 3.2) % 2 === 0 &&
          (car.mode === "in" ||
            car.mode === "out" ||
            car.mode === "wait" ||
            (car.mode === "drive" && car.u >= 0.52));
        if (!showBlink) {
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          blinkMesh.setMatrixAt(i, dummy.matrix);
        } else {
          var nose = Math.sin(spot.ang);
          var noseZ = Math.cos(spot.ang);
          var side = signal > 0 ? 1 : -1;
          var blinkFwd = Math.min(car.fwd || 0.9, 1.05);
          dummy.position.set(
            spot.x + -noseZ * side * 0.48 + nose * blinkFwd,
            ROAD_Y + 0.42,
            spot.z + nose * side * 0.48 + noseZ * blinkFwd
          );
          dummy.rotation.set(0, spot.ang, 0);
          dummy.scale.set(0.12, 0.08, 0.14);
          dummy.updateMatrix();
          blinkMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      if (brakeMesh) {
        var braking =
          car.mode === "in" ||
          car.mode === "wait" ||
          (car.mode === "park" && car.brakeHold > 0) ||
          (car.mode === "drive" && car.speed < (car.cruise || 0.2) * 0.62);
        if (!braking) {
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          brakeMesh.setMatrixAt(i, dummy.matrix);
        } else {
          var rear = car.rear || (car.kind === "bus" ? 1.92 : car.kind === "van" ? 1.12 : 0.96);
          dummy.position.set(
            spot.x - Math.sin(spot.ang) * rear,
            ROAD_Y + 0.58,
            spot.z - Math.cos(spot.ang) * rear
          );
          dummy.rotation.set(0, spot.ang, 0);
          dummy.scale.set(car.kind === "bus" ? 0.95 : 0.62, 0.2, 0.18);
          dummy.updateMatrix();
          brakeMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      if (night && car.kind !== "bike" && car.mode !== "park" && car.mode !== "wait") {
        var fwd = car.fwd || (car.kind === "bus" ? 1.95 : car.kind === "van" ? 1.15 : 0.92);
        var bulbY = car.kind === "bus" ? 0.72 : 0.48;
        var sx = Math.sin(spot.ang);
        var cz = Math.cos(spot.ang);
        if (headMesh) {
          dummy.position.set(spot.x + sx * fwd, ROAD_Y + bulbY, spot.z + cz * fwd);
          dummy.rotation.set(0, spot.ang, 0);
          dummy.scale.set(car.kind === "bus" ? 1.6 : 1, car.kind === "bus" ? 1.3 : 1, 1);
          dummy.updateMatrix();
          headMesh.setMatrixAt(lit, dummy.matrix);
        }
        if (headPoolMesh) {
          var poolLen = car.kind === "bus" ? 4.2 : car.kind === "van" ? 2.6 : 2.1;
          var poolW = car.kind === "bus" ? 1.6 : 1.1;
          dummy.position.set(
            spot.x + sx * (fwd + poolLen * 0.35),
            ROAD_Y + 0.14,
            spot.z + cz * (fwd + poolLen * 0.35)
          );
          dummy.rotation.set(0, spot.ang, 0);
          dummy.scale.set(poolW, 1, poolLen);
          dummy.updateMatrix();
          headPoolMesh.setMatrixAt(lit, dummy.matrix);
        }
        lit += 1;
      }
    }
    Object.keys(fleet).forEach(function (kind) {
      if (fleet[kind]) fleet[kind].instanceMatrix.needsUpdate = true;
    });
    if (blinkMesh) {
      blinkMesh.instanceMatrix.needsUpdate = true;
    }
    if (brakeMesh) {
      brakeMesh.instanceMatrix.needsUpdate = true;
    }
    if (headMesh) {
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      for (i = lit; i < headMesh.count; i++) {
        headMesh.setMatrixAt(i, dummy.matrix);
      }
      headMesh.instanceMatrix.needsUpdate = true;
    }
    if (headPoolMesh) {
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      for (i = lit; i < headPoolMesh.count; i++) {
        headPoolMesh.setMatrixAt(i, dummy.matrix);
      }
      headPoolMesh.instanceMatrix.needsUpdate = true;
    }
    if (!pedMesh) {
      return;
    }
    for (i = 0; i < peds.length; i++) {
      var ped = peds[i];
      stepPedestrian(ped, dt, time);
      dummy.position.set(ped.x, ped.y + 0.12, ped.z);
      dummy.rotation.set(0, ped.ang || 0, 0);
      dummy.scale.set(0.34, 0.95, 0.34);
      dummy.updateMatrix();
      pedMesh.setMatrixAt(i, dummy.matrix);
    }
    pedMesh.instanceMatrix.needsUpdate = true;
  }

  function parseTileKey(key) {
    var parts = String(key || "").split(",");
    if (parts.length !== 2 || isNaN(Number(parts[0])) || isNaN(Number(parts[1]))) {
      return null;
    }
    return { q: Number(parts[0]), r: Number(parts[1]) };
  }

  function roadEdgeBetweenTiles(q1, r1, q2, r2) {
    var id;
    for (id in edgeTiles) {
      if (!Object.prototype.hasOwnProperty.call(edgeTiles, id)) {
        continue;
      }
      var tiles = edgeTiles[id];
      if (!tiles || tiles.length < 2) {
        continue;
      }
      var has1 = false;
      var has2 = false;
      var i;
      for (i = 0; i < tiles.length; i++) {
        if (tiles[i].q === q1 && tiles[i].r === r1) {
          has1 = true;
        }
        if (tiles[i].q === q2 && tiles[i].r === r2) {
          has2 = true;
        }
      }
      if (has1 && has2) {
        var bits = id.split("|");
        return { from: bits[0], to: bits[1], id: id };
      }
    }
    return null;
  }

  function stopBayForTileKey(tileKey) {
    var tile = parseTileKey(tileKey);
    if (!tile) {
      return null;
    }
    var edge = pickBayEdgeForTile(tile.q, tile.r);
    if (!edge) {
      return null;
    }
    var bay = placeOnEdge(edge.from, edge.to, 0.5, parkLane("bus"));
    var road = placeOnEdge(edge.from, edge.to, 0.5, driveLane("bus"));
    if (!bay || !road) {
      return null;
    }
    return {
      bay: { x: bay.x, z: bay.z, ang: bay.ang },
      road: { x: road.x, z: road.z, ang: road.ang },
      from: edge.from,
      to: edge.to,
      id: edge.id
    };
  }

  function pushWp(list, pose, dwell, kind) {
    if (!pose) {
      return;
    }
    var last = list.length ? list[list.length - 1] : null;
    if (last && Math.hypot(last.x - pose.x, last.z - pose.z) < 0.35 && !dwell) {
      return;
    }
    list.push({
      x: pose.x,
      z: pose.z,
      ang: pose.ang,
      dwell: dwell || 0,
      kind: kind || "road"
    });
  }

  function buildLineWaypoints(line) {
    var keys = line.pathKeys || [];
    var stopSet = {};
    (line.stopKeys || []).forEach(function (k) {
      stopSet[k] = true;
    });
    var wps = [];
    if (keys.length < 2) {
      return wps;
    }
    var start = stopBayForTileKey(keys[0]);
    if (start) {
      pushWp(wps, start.bay, 0.7, "bay");
      pushWp(wps, start.road, 0, "depart");
    } else {
      var c0 = parseTileKey(keys[0]);
      if (c0) {
        var a0 = axial(c0.q, c0.r);
        pushWp(wps, { x: a0.x, z: a0.z + 2.8, ang: 0 }, 0.4, "apron");
      }
    }
    var i;
    for (i = 0; i < keys.length - 1; i++) {
      var a = parseTileKey(keys[i]);
      var b = parseTileKey(keys[i + 1]);
      if (!a || !b) {
        continue;
      }
      var edge = roadEdgeBetweenTiles(a.q, a.r, b.q, b.r);
      if (edge) {
        var mid = placeOnEdge(edge.from, edge.to, 0.5, driveLane("bus"));
        pushWp(wps, mid, 0, "road");
      } else {
        var pa = axial(a.q, a.r);
        var pb = axial(b.q, b.r);
        var dx = pb.x - pa.x;
        var dz = pb.z - pa.z;
        pushWp(
          wps,
          { x: (pa.x + pb.x) / 2, z: (pa.z + pb.z) / 2, ang: Math.atan2(dx, dz) },
          0,
          "gap"
        );
      }
      if (stopSet[keys[i + 1]]) {
        var stop = stopBayForTileKey(keys[i + 1]);
        if (stop) {
          pushWp(wps, stop.road, 0, "approach");
          pushWp(wps, stop.bay, i === keys.length - 2 ? 1.2 : 0.95, "bay");
          if (i < keys.length - 2) {
            pushWp(wps, stop.road, 0, "depart");
          }
        }
      }
    }
    return wps;
  }

  function clearBusPresentation() {
    busAgents = [];
    if (busMesh && busMesh.parent) {
      busMesh.parent.remove(busMesh);
      busMesh = null;
    }
    [lineBusLightMesh, lineBusPoolMesh, lineBusBrakeMesh].forEach(function (mesh) {
      if (mesh && mesh.parent) mesh.parent.remove(mesh);
    });
    lineBusLightMesh = null;
    lineBusPoolMesh = null;
    lineBusBrakeMesh = null;
    if (roots.lines) {
      clearGroup(roots.lines);
    }
  }

  /* Buslinien entfernt — nur noch Aufräumen. */
  function syncBuses() {
    clearBusPresentation();
  }

  function ensureTaxiFleetRoot() {
    if (!scene) {
      return null;
    }
    if (!taxiFleetRoot) {
      taxiFleetRoot = new THREE.Group();
      taxiFleetRoot.name = "taxiFleet";
      scene.add(taxiFleetRoot);
    }
    return taxiFleetRoot;
  }

  function disposeTaxiFleet(zoneId) {
    var entry = taxiFleet[zoneId];
    if (!entry) {
      return;
    }
    (entry.meshes || []).forEach(function (mesh) {
      if (mesh && mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    delete taxiFleet[zoneId];
  }

  function clearAllTaxiFleets() {
    Object.keys(taxiFleet).forEach(function (zoneId) {
      disposeTaxiFleet(zoneId);
    });
    taxiFleet = {};
  }

  function taxiStandFeature(zone) {
    if (!zone || !parkingCatalog || !Nexus.BoardEdges) {
      return null;
    }
    var byTile = parkingCatalog.byTile || {};
    var feature = byTile[zone.q + "," + zone.r] || null;
    if (!feature) {
      return null;
    }
    if (Nexus.BoardEdges.forceFeatureKind && feature.kind !== "perpendicular") {
      Nexus.BoardEdges.forceFeatureKind(feature, "perpendicular", ROAD_W);
      if (roots.parking) {
        renderParkingPads(parkingCatalog);
      }
      pruneGreensNearParking(zone.q, zone.r);
    }
    return feature;
  }

  function syncTaxiFleet(state) {
    var host = ensureTaxiFleetRoot();
    if (!host || !state) {
      return;
    }
    var keep = {};
    var shadowsOn = !!(qualityParams() && qualityParams().shadows);
    (state.zones || []).forEach(function (zone) {
      if (!isTaxiZone(zone)) {
        return;
      }
      keep[zone.id] = true;
      var feature = taxiStandFeature(zone);
      if (!feature || !feature.slots || !feature.slots.length) {
        disposeTaxiFleet(zone.id);
        return;
      }
      var existing = taxiFleet[zone.id];
      var need = Math.min(4, feature.slots.length);
      if (existing && existing.featureId === feature.id && (existing.meshes || []).length === need) {
        var i;
        for (i = 0; i < need; i++) {
          var pose = Nexus.BoardEdges.featureSlotPose(feature, i);
          var mesh = existing.meshes[i];
          if (pose && mesh) {
            mesh.position.set(pose.x, ROAD_Y, pose.z);
            mesh.rotation.y = pose.ang || 0;
            mesh.visible = true;
          }
        }
        return;
      }
      disposeTaxiFleet(zone.id);
      var meshes = [];
      var s;
      for (s = 0; s < need; s++) {
        var slotPose = Nexus.BoardEdges.featureSlotPose(feature, s);
        if (!slotPose) {
          continue;
        }
        var root = null;
        if (Nexus.KenneyBuildings && Nexus.KenneyBuildings.cloneVehicle) {
          root = Nexus.KenneyBuildings.cloneVehicle("taxi", shadowsOn);
        }
        if (!root && geo.vehCar) {
          root = new THREE.Mesh(geo.vehCar, mats.vehicle || mats.car);
          root.castShadow = shadowsOn;
        }
        if (!root) {
          continue;
        }
        root.position.set(slotPose.x, ROAD_Y, slotPose.z);
        root.rotation.y = slotPose.ang || 0;
        host.add(root);
        meshes.push(root);
      }
      taxiFleet[zone.id] = { featureId: feature.id, meshes: meshes };
    });
    Object.keys(taxiFleet).forEach(function (zoneId) {
      if (!keep[zoneId]) {
        disposeTaxiFleet(zoneId);
      }
    });
  }

  function worldOfKey(key) {
    if (!key) {
      return null;
    }
    if (graph.nodes[key]) {
      return graph.nodes[key];
    }
    var parts = String(key).split(",");
    if (parts.length !== 2 || isNaN(Number(parts[0]))) {
      return null;
    }
    var p = axial(Number(parts[0]), Number(parts[1]));
    return { x: p.x, z: p.z, key: key };
  }

  function edgePose(keyA, keyB) {
    var a = worldOfKey(keyA);
    var b = worldOfKey(keyB);
    if (!a || !b) {
      return null;
    }
    var dx = b.x - a.x;
    var dz = b.z - a.z;
    return {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      ang: Math.atan2(dx, dz) + Math.PI / 2
    };
  }

  function artWorldStopShelter(parent, pose, tintMat) {
    if (!pose) {
      return;
    }
    var g = new THREE.Group();
    g.position.set(pose.x, 0, pose.z);
    /* Langseite 90° zur Straße (pose.ang = Fahrtrichtung). */
    g.rotation.y = (pose.ang || 0) + Math.PI / 2;
    addBox(g, mats.steel, 1.55, 0.07, 0.65, 0, TILE_H + 1.28, 0, 0);
    addBox(g, mats.steel, 0.07, 1.2, 0.07, -0.68, TILE_H, -0.22, 0);
    addBox(g, mats.steel, 0.07, 1.2, 0.07, 0.68, TILE_H, -0.22, 0);
    addBox(g, mats.glass || mats.cream, 1.4, 0.88, 0.05, 0, TILE_H + 0.18, -0.26, 0);
    addBox(g, mats.bench || mats.slate, 1.15, 0.1, 0.34, 0, TILE_H + 0.34, 0.08, 0);
    addBox(g, tintMat || mats.plus, 0.1, 1.05, 0.1, 0.9, TILE_H, 0.18, 0);
    addBox(g, tintMat || mats.plus, 0.34, 0.26, 0.05, 0.9, TILE_H + 1.1, 0.18, 0);
    parent.add(g);
  }

  function paintLineRibbons() {
    /* Straßenrand-Taxistand (Bank) später — Hook offen, nicht spielbar. */
    if (roots.lines) {
      clearGroup(roots.lines);
    }
  }

  function updateBuses() {
    /* Linienbusse entfernt. */
    return;
    if (!busMesh || !dummy) {
      return;
    }
    var night = isNight();
    var i;
    for (i = 0; i < busAgents.length; i++) {
      var bus = busAgents[i];
      var wps = bus.waypoints;
      if (!wps || wps.length < 2) {
        continue;
      }
      if (bus.hold > 0) {
        bus.hold -= dt;
        var holdPose = wps[bus.seg] || wps[0];
        dummy.position.set(holdPose.x, ROAD_Y + 0.28, holdPose.z);
        dummy.rotation.set(0, holdPose.ang || 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        busMesh.setMatrixAt(i, dummy.matrix);
        bus._pose = holdPose;
        continue;
      }
      var a = wps[bus.seg];
      var b = wps[bus.seg + 1];
      if (!a || !b) {
        bus.seg = 0;
        bus.t = 0;
        continue;
      }
      var dist = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      bus.t += ((bus.speed || 5.5) * dt) / dist;
      if (bus.t >= 1) {
        bus.t = 0;
        bus.seg += 1;
        if (bus.seg >= wps.length - 1) {
          bus.seg = 0;
        }
        if (wps[bus.seg] && wps[bus.seg].dwell) {
          bus.hold = wps[bus.seg].dwell;
        }
        a = wps[bus.seg];
        b = wps[bus.seg + 1] || wps[0];
      }
      var u = Math.min(1, bus.t);
      var s = u * u * (3 - 2 * u);
      var x = a.x + (b.x - a.x) * s;
      var z = a.z + (b.z - a.z) * s;
      var ang = a.ang + angleDelta(b.ang, a.ang) * s;
      var pose = { x: x, z: z, ang: ang };
      dummy.position.set(x, ROAD_Y + 0.28, z);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      busMesh.setMatrixAt(i, dummy.matrix);
      bus._pose = pose;
    }
    busMesh.instanceMatrix.needsUpdate = true;
    if (!lineBusLightMesh && busAgents.length && geo.headBulb && mats.headlamp) {
      lineBusLightMesh = new THREE.InstancedMesh(geo.headBulb, mats.headlamp, busAgents.length);
      lineBusLightMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      lineBusLightMesh.frustumCulled = false;
      roots.cars.add(lineBusLightMesh);
      lineBusPoolMesh = new THREE.InstancedMesh(geo.headPool, mats.headPool, busAgents.length);
      lineBusPoolMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      lineBusPoolMesh.frustumCulled = false;
      roots.cars.add(lineBusPoolMesh);
      lineBusBrakeMesh = new THREE.InstancedMesh(geo.box, mats.brake, busAgents.length);
      lineBusBrakeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      lineBusBrakeMesh.frustumCulled = false;
      roots.cars.add(lineBusBrakeMesh);
    }
    if (lineBusLightMesh) {
      lineBusLightMesh.visible = !!night;
      if (lineBusPoolMesh) lineBusPoolMesh.visible = !!night;
      for (i = 0; i < busAgents.length; i++) {
        var bp = busAgents[i]._pose;
        if (!bp) continue;
        var sx = Math.sin(bp.ang);
        var cz = Math.cos(bp.ang);
        if (night) {
          dummy.position.set(bp.x + sx * 1.95, ROAD_Y + 0.72, bp.z + cz * 1.95);
          dummy.rotation.set(0, bp.ang, 0);
          dummy.scale.set(1.6, 1.3, 1);
          dummy.updateMatrix();
          lineBusLightMesh.setMatrixAt(i, dummy.matrix);
          dummy.position.set(bp.x + sx * 3.2, ROAD_Y + 0.14, bp.z + cz * 3.2);
          dummy.scale.set(1.6, 1, 4.2);
          dummy.updateMatrix();
          if (lineBusPoolMesh) lineBusPoolMesh.setMatrixAt(i, dummy.matrix);
        }
        dummy.position.set(bp.x - sx * 1.92, ROAD_Y + 0.58, bp.z - cz * 1.92);
        dummy.rotation.set(0, bp.ang, 0);
        dummy.scale.set(0.95, 0.2, 0.18);
        dummy.updateMatrix();
        if (lineBusBrakeMesh) lineBusBrakeMesh.setMatrixAt(i, dummy.matrix);
      }
      lineBusLightMesh.instanceMatrix.needsUpdate = true;
      if (lineBusPoolMesh) lineBusPoolMesh.instanceMatrix.needsUpdate = true;
      if (lineBusBrakeMesh) lineBusBrakeMesh.instanceMatrix.needsUpdate = true;
    }
  }

  function updateSky(dt, time) {
    var i;
    for (i = 0; i < birds.length; i++) {
      var bird = birds[i];
      bird.a += bird.speed * dt;
      bird.mesh.position.set(Math.sin(bird.a) * bird.r, bird.y + Math.sin(time * 3 + i) * 0.3, Math.cos(bird.a) * bird.r);
      bird.mesh.rotation.y = -bird.a;
    }
    for (i = 0; i < clouds.length; i++) {
      var bank = clouds[i];
      if (bank.ang == null) {
        continue;
      }
      bank.ang += bank.speed * dt;
      bank.mesh.position.x = Math.sin(bank.ang) * bank.r;
      bank.mesh.position.z = Math.cos(bank.ang) * bank.r;
      bank.mesh.position.y = bank.y + Math.sin(time * 0.35 + i) * 0.35;
    }
    for (i = 0; i < turbines.length; i++) {
      turbines[i].rotation.z += dt * (0.8 + i * 0.1);
    }
  }

  function fingerprint(state, ui) {
    var parts = [
      state.turnPhase === "build" ? "build" : "play",
      ui && ui.inspectedZoneId,
      ui && ui.homeOpen ? 1 : 0,
      document.documentElement.getAttribute("data-theme"),
      resolvedPreset,
      activeBiome
    ];
    (state.zones || []).forEach(function (z) {
      parts.push(
        z.id,
        z.type,
        z.variant || "",
        z.tileId || "",
        z.ownerId,
        z.upgradeLevel || 0,
        z.lastDieId || "",
        z.trafficMode || "",
        z.busStop ? 1 : 0
      );
    });
    (state.busLines || []).forEach(function (line) {
      parts.push("line", line.id, line.propulsion);
    });
    (state.players || []).forEach(function (p) {
      Object.keys(p.devices || {}).forEach(function (id) {
        var mode = p.devices[id];
        if (mode) {
          parts.push(p.id, id, mode);
        }
      });
    });
    return parts.join("|");
  }

  function tilePickData(tile, zone, state, ui, player) {
    if (tile.dist > Nexus.CONSTANTS.HEX_RADIUS) {
      return null;
    }
    if (zone) {
      var mine = player && zone.ownerId === player.id;
      if (zone.type === "home") {
        return { kind: "home", q: tile.q, r: tile.r, zoneId: zone.id, ownerId: zone.ownerId, mine: !!mine };
      }
      return { kind: "owned", q: tile.q, r: tile.r, zoneId: zone.id, ownerId: zone.ownerId, mine: !!mine };
    }
    var expandable = Nexus.isExpandableSlot(state, tile.q, tile.r) && state.turnPhase === "build";
    if (expandable) {
      return { kind: "empty", q: tile.q, r: tile.r, open: true };
    }
    return { kind: "empty", q: tile.q, r: tile.r, open: false };
  }

  function showCityProgress(frac) {
    var node = document.getElementById("city-progress");
    if (!node && document.body && document.createElement) {
      node = document.createElement("div");
      node.id = "city-progress";
      node.className = "city-progress";
      document.body.appendChild(node);
    }
    if (!node) {
      return;
    }
    if (frac == null || frac >= 1) {
      node.hidden = true;
      node.textContent = "";
      return;
    }
    var pct = Math.max(1, Math.min(99, Math.round(frac * 100)));
    node.hidden = false;
    node.textContent = "Stadt wird aufgebaut " + pct + " %";
    if (node.style && node.style.setProperty) {
      node.style.setProperty("--p", pct + "%");
    }
  }

  function buildOneSlot(state, ui, slot, player, rec, play, radius, buildPhase) {
      var dist = axialDist(slot.q, slot.r);
      var pos = axial(slot.q, slot.r);
      var group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      var zone = dist <= radius ? Nexus.zoneAt(state, slot.q, slot.r) : null;
      batchSlot = slot.q + "," + slot.r;
      group.userData.slot = batchSlot;
      tileGroups[batchSlot] = group;
      if (zone) {
        group.userData.live = true;
      }
      var rand = seeded(slot.q, slot.r, 11);
      var padKey = "grass";
      var padR = FIELD_R;
      var owner = null;
      var expandable = false;
      if (dist > radius) {
        var deco = seeded(slot.q, slot.r, 5)();
        var keepRoll = seeded(slot.q, slot.r, 41)();
        if (activeQuality.decoKeep < 1 && keepRoll > activeQuality.decoKeep) {
          padKey = "grass";
        } else if (dist >= radius + 1 && deco < 0.34) {
          artRidge(group, rand);
          padKey = "grass";
        } else if (deco < 0.62) {
          artWarehouse(group, rand);
          padKey = "grass";
        } else {
          artHill(group, rand);
        }
        padR = HEX * 0.72;
      } else if (zone) {
        padKey = landUseKey(zone);
        var level = (Nexus.zoneUpgradeLevel && Nexus.zoneUpgradeLevel(zone)) || zone.upgradeLevel || 0;
        var giz = gizmosFor(state, zone, player);
        /* Menü-Stufe zählt für Kenney (nicht nur Live-Governor) — sonst bleibt Auto/Balance bei Boxen. */
        var liveTier = (qualityParams() || {}).tier || resolvedPreset || "medium";
        var qTier =
          qualityChoice && qualityChoice !== "auto" ? qualityChoice : liveTier;
        var kenneyReady =
          Nexus.KenneyBuildings &&
          Nexus.KenneyBuildings.isReady &&
          Nexus.KenneyBuildings.isReady() &&
          Nexus.KenneyBuildings.qualityAllows(qTier);
        var facingYaw = ownerFacingYaw(state, zone.ownerId);
        var dressKind = dressKindForZone(zone);
        var aliasZone = kenneyAliasZone(zone);
        var kenneyBuilt =
          !!(
            aliasZone &&
            kenneyReady &&
            Nexus.KenneyBuildings.build(group, {
              zone: aliasZone,
              q: slot.q,
              r: slot.r,
              level: level,
              TILE_H: TILE_H,
              qualityTier: qTier,
              shadows: !!(qualityParams() && qualityParams().shadows),
              facingYaw: facingYaw
            })
          );
        if (kenneyBuilt) {
          dressDevices(group, dressKind, giz);
        }
        /* Kenney deckt Parkplatz/Parkhaus ab — BoardKit nur als Fallback. */
        var kitBuilt =
          !kenneyBuilt &&
          !kenneyReady &&
          !!aliasZone &&
          Nexus.BoardKit &&
          Nexus.BoardKit.build &&
          Nexus.BoardKit.build(group, {
            zone: aliasZone,
            q: slot.q,
            r: slot.r,
            level: level,
            mats: mats,
            TILE_H: TILE_H,
            addBox: addBox,
            addCyl: addCyl,
            addSphere: addSphere,
            dressDevices: function () {
              dressDevices(group, dressKind, giz);
            }
          });
        if (!kitBuilt && !kenneyBuilt) {
          artTileFallback(group, zone, level, giz, slot.q, slot.r);
        }
        var ownerMatch = state.players.filter(function (p) {
          return p.id === zone.ownerId;
        })[0];
        owner = ownerMatch || null;
        if (owner && !group.userData.kenneyBuilt) {
          tintOwnedBuildings(group, owner.colorIndex || 0);
        }
        /* Kein Gras-Overlay auf Spielerfarbe — nur Bäume am Rand bei Park. */
        var propKind =
          zone.type === "park" || boardTileId(zone) === "misc-park"
            ? "park"
            : zone.type === "home"
              ? "home"
              : zone.type || "empty";
        dressTileProps(group, propKind, slot.q, slot.r, propKind === "home" ? 2 : 3);
      } else {
        var green =
          Nexus.BoardProps && Nexus.BoardProps.greenPlan
            ? Nexus.BoardProps.greenPlan(slot.q, slot.r, radius, seeded)
            : { kind: "none", patches: [] };
        pushGray();
        /* Keine leeren Park-only-Tiles: immer Kenney-Gebäude, Grün nur als Pad/Bäume. */
        padKey = green.kind === "full" ? "park" : "grass";
        artUncontrolled(group, rand, slot.q, slot.r);
        if (green.kind === "full") {
          plantTreeCluster(group, rand, "park");
        } else if (green.kind === "patch") {
          addGreenPatches(group, green.patches);
        }
        dressTileProps(group, "empty", slot.q, slot.r, 5);
        popGray();
        group.userData.gray = true;
      }
      var padMat = owner
        ? ownerPadMat(owner.colorIndex || 0)
        : group.userData.gray
          ? (grayMats && grayMats["pad-grass"]) || mats["pad-grass"]
          : mats["pad-" + padKey] || mats.asphalt;
      var pad = new THREE.Mesh(geo.cyl6, padMat);
      pad.scale.set(padR, TILE_H, padR);
      pad.position.y = TILE_H / 2;
      pad.rotation.y = HEX_YAW;
      pad.userData.keepInProduction = true;
      group.add(pad);
      /*
       * Kein zweites Rim-Hex mehr: Pad trägt schon ownerPadMat.
       * Der alte helle Rim (0.48–0.94) wirkte wie „kleines Tile in großem Tile“.
       */
      var pick = tilePickData({ q: slot.q, r: slot.r, dist: dist }, zone, state, ui, player);
      if (pick) {
        pick.blockedReason = null;
        if (pick.kind === "empty" && !pick.open && buildPhase) {
          pick.blockedReason = Nexus.isAdjacentToPlayer
            ? "Nicht angrenzend an dein Netz."
            : "Hier kannst du gerade nicht bauen.";
          if (!Nexus.isExpandableSlot(state, slot.q, slot.r)) {
            var adj = false;
            if (Nexus.neighbors) {
              adj = Nexus.neighbors(slot.q, slot.r).some(function (n) {
                var z = Nexus.zoneAt(state, n.q, n.r);
                return z && player && z.ownerId === player.id;
              });
            }
            pick.blockedReason = adj
              ? "Nur in der Bauphase auf freien Nachbarfeldern."
              : "Feld liegt nicht an deinem Distrikt.";
          }
        }
        var hit = new THREE.Mesh(geo.cyl6, mats.hit);
        hit.scale.set(FIELD_R, 0.18, FIELD_R);
        hit.position.set(pos.x, TILE_H + 0.1, pos.z);
        hit.rotation.y = HEX_YAW;
        hit.userData.pick = pick;
        if (roots.picks) {
          roots.picks.add(hit);
        } else {
          group.add(hit);
        }
      }
      roots.tiles.add(group);
      if (dist <= radius) {
        play.push({ q: slot.q, r: slot.r });
      }
      if (zone && ui && ui.placePopZoneId === zone.id) {
        group.scale.set(0.02, 0.02, 0.02);
        overlays.push({ type: "pop", group: group, t: 0 });
        animHoldUntil = Math.max(animHoldUntil, nowMs() + 480);
      }
  }

  function rebuildTiles(state, ui) {
    cityStats.rebuildTiles += 1;
    var budget = tileBudget == null ? 1e9 : tileBudget;
    var started = nowMs();
    if (!tileCursor) {
      clearGroup(roots.tiles);
      if (roots.picks) {
        clearGroup(roots.picks);
      }
      if (roots.batches) {
        clearGroup(roots.batches);
      }
      tileGroups = {};
      keptBatches = [];
      plusPins = [];
      overlays = [];
      buildRings = [];
      ownerRims = [];
      batchItems = [];
      tileCursor = {
        slots: Nexus.allSlots((Nexus.CONSTANTS.HEX_RADIUS || 3) + DECO_RINGS),
        index: 0,
        play: []
      };
      batchOn = true;
    }
    var player = Nexus.currentPlayer(state);
    var rec = Nexus.recommendExpandSlot ? Nexus.recommendExpandSlot(state) : null;
    var play = tileCursor.play;
    var radius = Nexus.CONSTANTS.HEX_RADIUS;
    var buildPhase = state.turnPhase === "build";
    var slice = 0;
    var sliceMax = budget > 50 ? 100000 : 2;
    while (tileCursor.index < tileCursor.slots.length && slice < sliceMax && nowMs() - started < budget) {
      slice += 1;
      var slot = tileCursor.slots[tileCursor.index];
      tileCursor.index += 1;
      buildOneSlot(state, ui, slot, player, rec, play, radius, buildPhase);
    }
    if (tileCursor && tileCursor.index >= tileCursor.slots.length) {
      batchOn = false;
      flushBatches();
      tileCursor = null;
      tileBudget = null;
      showCityProgress(1);
    } else if (tileCursor) {
      showCityProgress(tileCursor.index / tileCursor.slots.length);
    }
    return play;
  }

  function homeZoneForOwner(state, ownerId) {
    if (!state || !state.zones || !ownerId) {
      return null;
    }
    var home = null;
    state.zones.forEach(function (z) {
      if (z.type === "home" && z.ownerId === ownerId) {
        home = z;
      }
    });
    return home;
  }

  function playerHome(state) {
    var player = Nexus.currentPlayer(state);
    if (!player) {
      return null;
    }
    return homeZoneForOwner(state, player.id);
  }

  /**
   * Gebäude-Front zum Spieler: Kenney-Tür zeigt lokal −Z → +π,
   * Richtung = Vektor Zentrum→Home (parallel zur Startkante).
   */
  function ownerFacingYaw(state, ownerId) {
    var home = homeZoneForOwner(state, ownerId);
    if (!home) {
      return null;
    }
    var p = axial(home.q, home.r);
    return Math.atan2(p.x, p.z) + Math.PI;
  }

  function seatTargetFromState(state) {
    var home = playerHome(state);
    if (!home) {
      return 0;
    }
    var p = axial(home.q, home.r);
    return Math.atan2(p.x, p.z);
  }

  function frameHome(state, snap) {
    if (!state) {
      applyCamera();
      return;
    }
    cam.polar = polarFromSlider(cam.pitchSlider);
    cam.targetPolar = cam.polar;
    cam.distance = defaultDistance();
    cam.targetDistance = cam.distance;
    cam.userYaw = 0;
    cam.targetUserYaw = 0;
    var home = playerHome(state);
    if (!home) {
      cam.panX = 0;
      cam.panZ = 0;
      cam.targetPanX = 0;
      cam.targetPanZ = 0;
      cam.seatTarget = 0;
      if (snap) {
        cam.seatYaw = 0;
      }
      applyCamera();
      return;
    }
    var p = axial(home.q, home.r);
    cam.panX = p.x * 0.58;
    cam.panZ = p.z * 0.58;
    cam.targetPanX = cam.panX;
    cam.targetPanZ = cam.panZ;
    cam.seatTarget = Math.atan2(p.x, p.z);
    if (snap) {
      cam.seatYaw = cam.seatTarget;
    }
    applyCamera();
  }

  function applyProductionVisuals() {
    var showCity = !productionMode;
    if (roots.roads) {
      roots.roads.visible = showCity;
    }
    if (roots.parking) {
      roots.parking.visible = showCity;
    }
    if (roots.cars) {
      roots.cars.visible = showCity;
    }
    if (roots.lines) {
      roots.lines.visible = showCity;
    }
    if (roots.batches) {
      roots.batches.visible = showCity;
    }
    Object.keys(tileGroups).forEach(function (key) {
      var group = tileGroups[key];
      if (!group || !group.children) {
        return;
      }
      group.children.forEach(function (child) {
        if (!child) {
          return;
        }
        var keep =
          !productionMode ||
          (child.userData &&
            (child.userData.keepInProduction || child.userData.hl || child.userData.pick));
        child.visible = !!keep;
      });
    });
    plusPins.forEach(function (pin) {
      if (pin && pin.visible !== undefined) {
        pin.visible = showCity;
      } else if (pin && pin.root) {
        pin.root.visible = showCity;
      }
    });
  }

  function setProductionMode(on) {
    productionMode = !!on;
    applyProductionVisuals();
    /* Kamera absichtlich unberührt — nahtloser View-Toggle. */
    if (typeof Nexus.refreshProdLabelPositions === "function") {
      Nexus.refreshProdLabelPositions();
    }
  }

  function applyCamera() {
    if (!camera) {
      return;
    }
    clampPan();
    cam.polar = clamp(cam.polar, CAM_POLAR_MIN, CAM_POLAR_MAX);
    cam.targetPolar = clamp(cam.targetPolar, CAM_POLAR_MIN, CAM_POLAR_MAX);
    cam.distance = clamp(cam.distance, CAM_DIST_MIN, CAM_DIST_MAX);
    cam.targetDistance = clamp(cam.targetDistance, CAM_DIST_MIN, CAM_DIST_MAX);
    var a = cam.seatYaw + cam.userYaw;
    var p = cam.polar;
    var d = cam.distance;
    var minY = 4.5;
    var y = cam.panY + d * Math.cos(p);
    if (y < minY) {
      /* Keep camera above ground: pull polar toward steeper. */
      var cosNeeded = (minY - cam.panY) / Math.max(1, d);
      cam.polar = Math.min(cam.polar, Math.acos(clamp(cosNeeded, 0.05, 0.98)));
      p = cam.polar;
      y = cam.panY + d * Math.cos(p);
    }
    camera.position.set(
      cam.panX + d * Math.sin(p) * Math.sin(a),
      y,
      cam.panZ + d * Math.sin(p) * Math.cos(a)
    );
    camera.lookAt(cam.panX, cam.panY, cam.panZ);
    if (productionMode && typeof Nexus.refreshProdLabelPositions === "function") {
      Nexus.refreshProdLabelPositions();
    }
  }

  function dampCamera(dt) {
    /* Weicher Follow: Targets aus Input, Ist-Werte gleiten nach. */
    var k = 1 - Math.pow(0.04, dt);
    cam.panX += (cam.targetPanX - cam.panX) * k;
    cam.panZ += (cam.targetPanZ - cam.panZ) * k;
    cam.polar += (cam.targetPolar - cam.polar) * k;
    cam.distance += (cam.targetDistance - cam.distance) * k;
    cam.userYaw = lerpAngle(cam.userYaw, cam.targetUserYaw, k);
    applyCamera();
  }

  function defaultDistance() {
    if (!viewport) {
      return 108;
    }
    var h = Math.max(1, viewport.clientHeight);
    return clamp(96 * (720 / h), 88, 168);
  }

  function fitCamera(force) {
    if (!force) {
      applyCamera();
      return;
    }
    frameHome(lastState, true);
  }

  function groundHit(clientX, clientY) {
    if (!canvas || !camera) {
      return null;
    }
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var out = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, out)) {
      return out;
    }
    return null;
  }

  function resize() {
    if (!renderer || !viewport || !camera) {
      return;
    }
    var w = Math.max(1, viewport.clientWidth);
    var h = Math.max(1, viewport.clientHeight);
    var dpr = window.devicePixelRatio || 1;
    var cap = activeQuality.pixelRatioCap || 1;
    var pr = Math.min(cap, dpr);
    if (activeQuality.pixelLook) {
      pr *= activeQuality.renderScale || 1;
    }
    renderer.setPixelRatio(Math.max(0.5, pr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyCamera();
  }

  function tick(stamp) {
    rafId = 0;
    if (!shouldAnimate()) {
      running = false;
      return;
    }
    var tuned = qualityParams();
    var capFps = tuned && tuned.fpsCap ? tuned.fpsCap : 0;
    if (capFps && lastDraw && stamp && stamp - lastDraw < 1000 / capFps - 0.75) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    rafId = requestAnimationFrame(tick);
    rafN += 1;
    if (activeQuality.rafStep > 1 && rafN % activeQuality.rafStep !== 0) {
      return;
    }
    if (cityPhase && cityPhase !== "done" && lastState) {
      try {
        stepCity(lastState, lastUi || {});
      } catch (err) {
        Nexus._cityError = String((err && err.stack) || err);
        cityPhase = "done";
      }
    }
    var dt = Math.min(0.05, clock.getDelta());
    var time = clock.elapsedTime;
    fpsFrames += 1;
    if (!fpsStamp) {
      fpsStamp = time;
    }
    if (time - fpsStamp >= 0.5) {
      fpsValue = Math.round(fpsFrames / (time - fpsStamp));
      fpsFrames = 0;
      fpsStamp = time;
    }
    if (!cam.userAdjusted) {
      cam.seatYaw = lerpAngle(cam.seatYaw, cam.seatTarget, 1 - Math.pow(0.02, dt));
    }
    dampCamera(dt);
    var stride = tuned && tuned.vehicleStride ? tuned.vehicleStride : 1;
    try {
      if (stride <= 1 || rafN % stride === 0) {
        updateCars(dt, time);
        updateBuses(dt);
      }
      updateSky(dt, time);
      updateLights(time);
    } catch (err) {
      Nexus._tickError = String(err && err.stack || err);
    }
    plusPins.forEach(function (pin) {
      var s = pin.rec ? 1 + Math.sin(time * 4) * 0.08 : 1;
      pin.group.scale.set(s, s, s);
    });
    buildRings.forEach(function (ring) {
      if (!ring.mesh || !ring.mesh.material) {
        return;
      }
      var pulse = 0.4 + (Math.sin(time * (ring.rec ? 5 : 3.2)) * 0.5 + 0.5) * 0.45;
      ring.mesh.material.opacity = pulse;
      ring.mesh.material.emissiveIntensity = 0.45 + pulse * 0.55;
      /* Nur Opacity pulsiert — Radius bleibt voll (sonst wirkt das Overlay zu klein). */
      var pulseR = ring.r != null ? ring.r : HIGHLIGHT_R;
      ring.mesh.scale.set(pulseR, 0.1, pulseR);
    });
    var nextOverlays = [];
    overlays.forEach(function (item) {
      if (item.type === "spin" && item.mesh) {
        item.mesh.rotation.y += dt * 3.2;
        nextOverlays.push(item);
        return;
      }
      if (item.type === "pop" && item.group) {
        item.t += dt;
        var k = Math.min(1, item.t / 0.28);
        var e = 1 - Math.pow(1 - k, 3);
        var bounce = 1 + Math.sin(k * Math.PI) * 0.08;
        item.group.scale.set(e * bounce, e * bounce, e * bounce);
        if (item.t < 0.32) {
          nextOverlays.push(item);
        } else {
          item.group.scale.set(1, 1, 1);
        }
        return;
      }
      nextOverlays.push(item);
    });
    overlays = nextOverlays;
    if (Nexus.Quality && dt) {
      var governed = Nexus.Quality.pushFrame(dt * 1000, stamp || nowMs());
      if (governed && tuned && governed.tier !== tuned.tier) {
        applyQualityCounts();
        if (cityReady) {
          spawnCars();
        }
      } else if (governed && tuned && Math.abs(governed.renderScale - tuned.renderScale) > 0.03) {
        resize();
      }
    }
    var yawGap = Math.abs(lerpAngle(cam.userYaw, cam.targetUserYaw, 1) - cam.userYaw);
    var overlaysBusy = overlays.some(function (item) {
      return item.type === "pop" || item.type === "spin";
    });
    var moving =
      (cars && cars.length && !(tuned && tuned.cars === 0)) ||
      busAgents.length > 0 ||
      (cityPhase && cityPhase !== "done") ||
      Math.abs(cam.targetDistance - cam.distance) > 0.2 ||
      Math.abs(cam.targetPolar - cam.polar) > 0.012 ||
      Math.abs(cam.targetPanX - cam.panX) > 0.12 ||
      Math.abs(cam.targetPanZ - cam.panZ) > 0.12 ||
      yawGap > 0.008 ||
      overlaysBusy ||
      nowMs() < animHoldUntil;
    renderer.render(scene, camera);
    lastDraw = stamp || nowMs();
    /* Demand-Sleep nur wenn wirklich idle — nie direkt nach Aufbau die UI „tot“ wirken lassen. */
    if (tuned && tuned.demand && cityReady && !moving && rafN > 120) {
      stopLoop();
    }
  }

  function ensure() {
    if (renderer) {
      return true;
    }
    if (webglFailed) {
      return false;
    }
    if (typeof THREE === "undefined") {
      return false;
    }
    viewport = document.getElementById("map-viewport");
    canvas = document.getElementById("district-canvas");
    if (!viewport || !canvas) {
      return false;
    }
    if (!qualityReady) {
      setBoardQuality(qualityChoice);
    }
    try {
      createRenderer();
      if (!renderer || !renderer.getContext || !renderer.getContext()) {
        throw new Error("WebGL context missing");
      }
    } catch (err) {
      webglFailed = true;
      renderer = null;
      console.error("NEXUS Board3D: WebGL nicht verfügbar", err);
      return false;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(col("--sky-mid", isNight() ? "#12303a" : "#9bd6d4"), 1);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.5, 960);
    raycaster = new THREE.Raycaster();
    raycaster.params.Mesh = { threshold: 0.2 };
    pointer = new THREE.Vector2();
    clock = new THREE.Clock();
    dummy = new THREE.Object3D();
    buildGeos();
    ensureSprites();
    buildMaterials();
    kickKenneyPreload();
    roots.static = new THREE.Group();
    roots.roads = new THREE.Group();
    roots.parking = new THREE.Group();
    roots.lines = new THREE.Group();
    roots.tiles = new THREE.Group();
    roots.picks = new THREE.Group();
    roots.cars = new THREE.Group();
    scene.add(roots.static);
    scene.add(roots.roads);
    scene.add(roots.parking);
    scene.add(roots.lines);
    scene.add(roots.tiles);
    scene.add(roots.picks);
    scene.add(roots.cars);
    extras.hemi = new THREE.HemisphereLight(0xfff6e8, 0xc8e0a8, 0.92);
    extras.sun = new THREE.DirectionalLight(0xffe2a8, 1.15);
    extras.sun.position.set(58, 78, 34);
    extras.ambient = new THREE.AmbientLight(0xffffff, 0.42);
    extras.moon = new THREE.DirectionalLight(0xc8d8f0, 0);
    extras.moon.position.set(-40, 55, -30);
    scene.add(extras.hemi);
    scene.add(extras.sun);
    scene.add(extras.ambient);
    scene.add(extras.moon);
    applyLightsTheme();
    roots.batches = new THREE.Group();
    scene.add(roots.batches);
    cam.polar = polarFromSlider(cam.pitchSlider);
    canvas.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });
    canvas.addEventListener("mousedown", function (event) {
      if (event.button === 1 || event.button === 2) {
        event.preventDefault();
      }
    });
    canvas.addEventListener("auxclick", function (event) {
      if (event.button === 1) {
        event.preventDefault();
      }
    });
    lastTheme = document.documentElement.getAttribute("data-theme") || "light";
    applyCanvasLook();
    resize();
    if (window.ResizeObserver) {
      resizeObs = new ResizeObserver(function () {
        resize();
      });
      resizeObs.observe(viewport);
    }
    bindVisibility();
    clock.start();
    return true;
  }

  function stopLoop() {
    if (rafId && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(rafId);
    }
    rafId = 0;
    running = false;
  }

  function tearDownCity() {
    cityStats.tearDown += 1;
    tileGroups = {};
    keptBatches = [];
    tileCursor = null;
    tileBudget = null;
    batchOn = false;
    batchItems = [];
    cityPhase = null;
    cityReady = false;
    roadDress = null;
    lastRoadNet = null;
    parkingCatalog = null;
    clearAllTaxiFleets();
    if (taxiFleetRoot && taxiFleetRoot.parent) {
      taxiFleetRoot.parent.remove(taxiFleetRoot);
    }
    taxiFleetRoot = null;
    clearGroup(roots.tiles);
    clearGroup(roots.picks);
    clearGroup(roots.roads);
    clearGroup(roots.parking);
    clearGroup(roots.lines);
    clearGroup(roots.cars);
    clearGroup(roots.static);
    clearGroup(roots.batches);
    graph.nodes = {};
    graph.keys = [];
    cars = [];
    peds = [];
    carMesh = null;
    carCabin = null;
    pedMesh = null;
    fleet = {};
    headMesh = null;
    busMesh = null;
    busAgents = [];
    lights = [];
    lamps = [];
    birds = [];
    clouds = [];
    turbines = [];
    plusPins = [];
    overlays = [];
    buildRings = [];
    billboardSprites = [];
    lampPools = [];
  }

  function structureKey() {
    /* qualityChoice (Menü), nicht Live-Governor-Tier — sonst Rebuild-Schleife nach Stadtaufbau. */
    var kenney =
      Nexus.KenneyBuildings && Nexus.KenneyBuildings.isReady && Nexus.KenneyBuildings.isReady() ? "k1" : "k0";
    return (
      (document.documentElement.getAttribute("data-theme") || "light") +
      "|" +
      (qualityChoice || "auto") +
      "|" +
      activeBiome +
      "|" +
      kenney
    );
  }

  function kickKenneyPreload() {
    if (!Nexus.KenneyBuildings || !Nexus.KenneyBuildings.preload) {
      return;
    }
    Nexus.KenneyBuildings.preload().then(function (ok) {
      if (!ok) {
        return;
      }
      lastStructure = "";
      if (lastState && lastState.screen === "game") {
        sync(lastState, lastUi || {});
      }
    });
  }

  function zoneMap(state) {
    var map = {};
    (state.zones || []).forEach(function (z) {
      var giz = gizmosFor(state, z);
      map[z.q + "," + z.r] = [
        z.id,
        z.type,
        z.variant || "",
        z.tileId || "",
        z.ownerId,
        z.upgradeLevel || 0,
        z.trafficMode || "",
        z.busStop ? 1 : 0,
        Object.keys(giz).sort().join(".")
      ].join(":");
    });
    return map;
  }

  function lineSignature(state) {
    var sae = (state.players || [])
      .map(function (player) {
        return player.id + ":" + (player.rolePoints || 0);
      })
      .join(",");
    return (
      sae +
      "|" +
      (state.busLines || [])
        .map(function (line) {
          return line.id + ":" + (line.propulsion || "") + ":" + (line.pathKeys || []).join(".");
        })
        .join("|")
    );
  }

  function dropSlot(key) {
    var group = tileGroups[key];
    if (group) {
      disposeTree(group);
      if (group.parent) {
        group.parent.remove(group);
      }
      delete tileGroups[key];
    }
    if (roots.picks && roots.picks.children) {
      roots.picks.children.slice().forEach(function (hit) {
        var pick = hit.userData && hit.userData.pick;
        if (pick && pick.q + "," + pick.r === key) {
          roots.picks.remove(hit);
        }
      });
    }
    keptBatches = keptBatches.filter(function (item) {
      return item.slot !== key;
    });
  }

  function patchSlot(state, ui, q, r) {
    cityStats.patchTile += 1;
    var key = q + "," + r;
    dropSlot(key);
    /* Parkbucht zuerst zur Spieler-Kante — sonst landen Bäume auf der alten Position. */
    var zone = Nexus.zoneAt(state, q, r);
    if (zone && zone.ownerId) {
      relocateOwnedParking(state, zone);
    }
    var player = Nexus.currentPlayer(state);
    var rec = Nexus.recommendExpandSlot ? Nexus.recommendExpandSlot(state) : null;
    batchOn = true;
    batchSlot = key;
    buildOneSlot(state, ui, { q: q, r: r }, player, rec, [], Nexus.CONSTANTS.HEX_RADIUS, state.turnPhase === "build");
    keptBatches = keptBatches.concat(batchItems);
    batchItems = [];
    batchOn = false;
    rebuildBatchMeshes();
    if (zone && zone.ownerId) {
      pruneGreensNearParking(q, r);
    }
  }

  function playerPastel(player) {
    var colors = Nexus.PLAYER_COLORS || ["#1FA83A"];
    var hex = colors[(player && player.colorIndex) || 0] || colors[0];
    var c = new THREE.Color(hex);
    var chroma = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    /* Rot/kräftige Farben stärker auswaschen — sonst Neon über Parkbuchten. */
    c.lerp(new THREE.Color("#f6f1e8"), chroma > 0.48 ? 0.42 : 0.12);
    return c;
  }

  function refreshHighlights(state, ui) {
    buildRings = [];
    plusPins = [];
    if (!state) {
      return;
    }
    var player = Nexus.currentPlayer(state);
    var pastel = playerPastel(player);
    if (mats.buildPulse) {
      mats.buildPulse.color.copy(pastel);
      if (mats.buildPulse.emissive) {
        mats.buildPulse.emissive.copy(pastel);
      }
      var pulseChroma =
        Math.max(pastel.r, pastel.g, pastel.b) - Math.min(pastel.r, pastel.g, pastel.b);
      mats.buildPulse.emissiveIntensity = pulseChroma > 0.35 ? 0.28 : 0.7;
      mats.buildPulse.opacity = pulseChroma > 0.35 ? 0.38 : 0.55;
    }
    var rec = Nexus.recommendExpandSlot ? Nexus.recommendExpandSlot(state) : null;
    var buildPhase = state.turnPhase === "build";
    var radius = Nexus.CONSTANTS.HEX_RADIUS;
    Object.keys(tileGroups).forEach(function (key) {
      var group = tileGroups[key];
      if (!group) {
        return;
      }
      var old = [];
      group.children.forEach(function (ch) {
        if (ch.userData && ch.userData.hl) {
          old.push(ch);
        }
      });
      old.forEach(function (ch) {
        group.remove(ch);
        disposeTree(ch);
      });
      var bits = key.split(",");
      var q = Number(bits[0]);
      var r = Number(bits[1]);
      if (axialDist(q, r) > radius) {
        return;
      }
      var zone = Nexus.zoneAt(state, q, r);
      var hl = new THREE.Group();
      hl.userData.hl = true;
      hl.userData.live = true;
      if (zone) {
        var selected =
          (ui && ui.inspectedZoneId === zone.id) ||
          (zone.type === "home" && ui && ui.homeOpen && player && zone.ownerId === player.id);
        if (selected) {
          var halo = new THREE.Mesh(geo.cyl6, mats.select);
          halo.scale.set(HIGHLIGHT_R, 0.08, HIGHLIGHT_R);
          /* Unter Straßenoberkante — Überstand wird von der Fahrbahn verdeckt. */
          halo.position.y = TILE_H + 0.05;
          halo.rotation.y = HEX_YAW;
          hl.add(halo);
        }
      } else if (buildPhase) {
        if (Nexus.isExpandableSlot(state, q, r)) {
          var recHere = rec && rec.q === q && rec.r === r;
          var ring = new THREE.Mesh(geo.cyl6, mats.buildPulse);
          ring.scale.set(HIGHLIGHT_R, 0.1, HIGHLIGHT_R);
          ring.position.y = TILE_H + 0.05;
          ring.rotation.y = HEX_YAW;
          ring.renderOrder = 4;
          hl.add(ring);
          buildRings.push({ mesh: ring, rec: recHere, r: HIGHLIGHT_R });
        } else {
          var dim = new THREE.Mesh(geo.cyl6, mats.tileDim);
          dim.scale.set(HIGHLIGHT_R, 0.06, HIGHLIGHT_R);
          dim.position.y = TILE_H + 0.05;
          dim.rotation.y = HEX_YAW;
          dim.renderOrder = 4;
          hl.add(dim);
        }
      }
      if (hl.children.length) {
        group.add(hl);
      }
    });
  }

  function refreshPicks(state, ui) {
    if (!roots.picks || !state) {
      return;
    }
    var player = Nexus.currentPlayer(state);
    var buildPhase = state.turnPhase === "build";
    roots.picks.children.forEach(function (hit) {
      var pick = hit.userData && hit.userData.pick;
      if (!pick) {
        return;
      }
      var zone = Nexus.zoneAt(state, pick.q, pick.r);
      var next = tilePickData({ q: pick.q, r: pick.r, dist: axialDist(pick.q, pick.r) }, zone, state, ui, player);
      if (!next) {
        return;
      }
      next.blockedReason = null;
      if (next.kind === "empty" && !next.open && buildPhase) {
        next.blockedReason = "Feld liegt nicht an deinem Distrikt.";
      }
      hit.userData.pick = next;
    });
  }

  function stepCity(state, ui) {
    var tuned = qualityParams();
    var budget = tuned && tuned.chunkMs ? tuned.chunkMs : 8;
    if (!cityPhase) {
      cityPhase = "static";
    }
    if (cityPhase === "static") {
      buildStaticCity();
      cityPhase = "roads";
      showCityProgress(0.12);
      return;
    }
    if (cityPhase === "roads") {
      buildRoads(roadTiles(), true);
      cityPhase = "dress";
      roadDress = { net: lastRoadNet, index: 0 };
      showCityProgress(0.28);
      return;
    }
    if (cityPhase === "dress") {
      if (!roadDress || !roadDress.net) {
        cityPhase = "tiles";
        showCityProgress(0.4);
        return;
      }
      var edgeKeys = Object.keys(roadDress.net.edges);
      var next = Math.min(edgeKeys.length, roadDress.index + 24);
      scatterStreetDressing(roadDress.net, roadDress.index, next);
      roadDress.index = next;
      showCityProgress(0.28 + 0.22 * (edgeKeys.length ? roadDress.index / edgeKeys.length : 1));
      if (roadDress.index >= edgeKeys.length) {
        cityPhase = "tiles";
      }
      return;
    }
    if (cityPhase === "tiles") {
      /* Warten bis Kenney da ist — sonst bleiben Einzeltiles als Box-Fallback. */
      if (
        Nexus.KenneyBuildings &&
        Nexus.KenneyBuildings.qualityAllows &&
        Nexus.KenneyBuildings.qualityAllows(kenneyTierNow()) &&
        Nexus.KenneyBuildings.isReady &&
        !Nexus.KenneyBuildings.isReady() &&
        !(Nexus.KenneyBuildings.isFailed && Nexus.KenneyBuildings.isFailed())
      ) {
        kickKenneyPreload();
        cityKenneyWait = (cityKenneyWait || 0) + 1;
        if (cityKenneyWait < 120) {
          showCityProgress(0.48);
          return;
        }
      }
      cityKenneyWait = 0;
      tileBudget = budget;
      rebuildTiles(state, ui);
      var total = tileCursor ? tileCursor.slots.length : 1;
      var done = tileCursor ? tileCursor.index : total;
      showCityProgress(0.5 + 0.49 * (done / Math.max(1, total)));
      if (!tileCursor) {
        syncEdgeUsesFromState(state);
        spawnCars();
        syncBuses();
        syncTaxiFleet(state);
        cityPhase = "done";
        cityReady = true;
        lastZoneMap = zoneMap(state);
        lastLineSig = lineSignature(state);
        lastStructure = structureKey();
        refreshHighlights(state, ui);
        refreshPicks(state, ui);
        applyProductionVisuals();
        showCityProgress(1);
      }
    }
  }

  function sync(state, ui) {
    lastState = state;
    lastUi = ui;
    if (!state || state.screen !== "game") {
      stopLoop();
      return;
    }
    if (state.turnPhase === "role_reveal") {
      if (cityReady || cityPhase || (graph.keys && graph.keys.length)) {
        tearDownCity();
      }
      if (!ensure()) {
        return;
      }
      stopLoop();
      showCityProgress(null);
      return;
    }
    if (!ensure()) {
      return;
    }
    applyQualityCounts();
    var theme = document.documentElement.getAttribute("data-theme") || "light";
    var themeChanged = theme !== lastTheme;
    if (themeChanged) {
      lastTheme = theme;
      ensureSprites();
      buildMaterials();
      applyLightsTheme();
      lastStructure = "";
    }
    cam.seatTarget = seatTargetFromState(state);
    if (cityPhase && cityPhase !== "done") {
      startLoop();
      applyCamera();
      return;
    }
    var key = structureKey();
    if (!cityReady || lastStructure !== key) {
      lastStructure = key;
      lastZoneMap = {};
      tearDownCity();
      cityPhase = "static";
      showCityProgress(0.02);
      startLoop();
      applyCamera();
      return;
    }
    var nextMap = zoneMap(state);
    var dirty = [];
    Object.keys(lastZoneMap).forEach(function (slotKey) {
      if (lastZoneMap[slotKey] !== nextMap[slotKey]) {
        dirty.push(slotKey);
      }
    });
    Object.keys(nextMap).forEach(function (slotKey) {
      if (lastZoneMap[slotKey] !== nextMap[slotKey] && dirty.indexOf(slotKey) < 0) {
        dirty.push(slotKey);
      }
    });
    var trafficDirty = false;
    if (dirty.length) {
      dirty.forEach(function (slotKey) {
        var bits = slotKey.split(",");
        patchSlot(state, ui, Number(bits[0]), Number(bits[1]));
        var prev = String(lastZoneMap[slotKey] || "").split(":");
        var next = String(nextMap[slotKey] || "").split(":");
        /* Nur echte Verkehrs-Änderung — nicht jeder Expand (sonst spawnCars = Parkplätze neu). */
        var prevMode = prev[5] || "";
        var nextMode = next[5] || "";
        var prevBus = prev[6] || "0";
        var nextBus = next[6] || "0";
        if (
          (prevMode !== nextMode && (prevMode || nextMode)) ||
          (prevBus !== nextBus && (prevBus === "1" || nextBus === "1"))
        ) {
          trafficDirty = true;
        }
      });
      lastZoneMap = nextMap;
      syncEdgeUsesFromState(state);
      syncTaxiFleet(state);
      if (trafficDirty) {
        syncBuses();
      }
    } else {
      syncTaxiFleet(state);
    }
    var lines = lineSignature(state);
    if (lines !== lastLineSig) {
      lastLineSig = lines;
      syncEdgeUsesFromState(state);
      syncBuses();
    }
    refreshHighlights(state, ui);
    refreshPicks(state, ui);
    applyProductionVisuals();
    startLoop();
    applyCamera();
    if (renderer && renderer.info && renderer.info.memory) {
      var geos = renderer.info.memory.geometries || 0;
      if (geos > leakPrev + 8 && cityReady) {
        leakHits += 1;
        if (leakHits >= 3) {
          console.warn("NEXUS: Geometrien steigen nach Szenenwechseln (" + geos + ").");
          leakHits = 0;
        }
      } else {
        leakHits = 0;
      }
      leakPrev = geos;
    }
  }

  function setBiome(choice, seed) {
    var L = look();
    biomeChoice = L ? L.normalizeBiome(choice) : "grass";
    activeBiome = L ? L.resolveBiome(biomeChoice, seed || Date.now()) : "grass";
    if (!renderer) {
      return activeBiome;
    }
    ensureSprites();
    buildMaterials();
    applyLightsTheme();
    lastStructure = "";
    lastLampNight = null;
    if (lastState) {
      tearDownCity();
      cityPhase = "static";
      showCityProgress(0.02);
      startLoop();
    }
    return activeBiome;
  }

  function pickAt(clientX, clientY) {
    if (!ensure()) {
      return null;
    }
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var target = roots.picks && roots.picks.children.length ? roots.picks : roots.tiles;
    var hits = raycaster.intersectObject(target, true);
    var i;
    for (i = 0; i < hits.length; i++) {
      var obj = hits[i].object;
      while (obj) {
        if (obj.userData && obj.userData.pick) {
          return obj.userData.pick;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  function projectCause(cause) {
    if (!cause || cause.q == null || !camera || !renderer) {
      return null;
    }
    var p = axial(Number(cause.q), Number(cause.r));
    var v = new THREE.Vector3(p.x, TILE_H + 1.6, p.z);
    v.project(camera);
    var rect = renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-v.y * 0.5 + 0.5) * rect.height
    };
  }

  Nexus.Board3D = {
    sync: sync,
    pump: function (steps, carFrames) {
      var n = steps || 30;
      var i;
      for (i = 0; i < n; i++) {
        if (!cityPhase || cityPhase === "done" || !lastState) {
          break;
        }
        stepCity(lastState, lastUi || {});
      }
      try {
        var frames = carFrames == null ? 50 : carFrames;
        var t = 0;
        var s;
        for (s = 0; s < frames; s++) {
          updateCars(0.05, t);
          t += 0.05;
        }
      } catch (err) {
        Nexus._carError = String((err && err.stack) || err);
      }
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      return cityPhase;
    },
    trafficReport: function () {
      var modes = { park: 0, wait: 0, out: 0, "in": 0, drive: 0 };
      var rim = 0;
      var offShoulder = 0;
      var mix = {};
      var offBoard = 0;
      var goals = 0;
      cars.forEach(function (c) {
        if (c.goal) goals += 1;
        modes[c.mode] = (modes[c.mode] || 0) + 1;
        if (String(c.from).indexOf("rim-") === 0 || String(c.to).indexOf("rim-") === 0) {
          rim += 1;
        }
        if ((c.mode === "park" || c.mode === "wait" || c.mode === "in") && !c.featureId && !shoulderOk(c.from, c.to)) {
          offShoulder += 1;
        }
        if (c.mode === "park" || c.mode === "wait") {
          if (!c.featureId && !shoulderOnBoard(c.from, c.to)) {
            offBoard += 1;
          }
        }
        if (c.bay) {
          mix[c.bay] = mix[c.bay] || { cars: 0, bus: 0 };
          if (c.kind === "bus") mix[c.bay].bus += 1;
          else mix[c.bay].cars += 1;
        }
      });
      var badBay = 0;
      Object.keys(mix).forEach(function (id) {
        var b = mix[id];
        if ((b.bus && b.cars) || b.bus > 1 || b.cars > 1) badBay += 1;
      });
      return {
        n: cars.length,
        modes: modes,
        rim: rim,
        offShoulder: offShoulder,
        offBoard: offBoard,
        badBay: badBay,
        parkFeatures: parkingCatalog && parkingCatalog.features ? parkingCatalog.features.length : 0,
        parkSlots: parkingSlotsList().length,
        parkKinds: (function () {
          var tally = { parallel: 0, perpendicular: 0, other: 0 };
          if (!parkingCatalog || !parkingCatalog.features) {
            return tally;
          }
          parkingCatalog.features.forEach(function (f) {
            if (f.kind === "parallel" || f.kind === "perpendicular") {
              tally[f.kind] += 1;
            } else {
              tally.other += 1;
            }
          });
          return tally;
        })(),
        parkDirs: (function () {
          var dirs = [0, 0, 0, 0, 0, 0];
          if (!parkingCatalog || !parkingCatalog.features) {
            return dirs;
          }
          parkingCatalog.features.forEach(function (f) {
            if (!f.frame || !f.frame.along) {
              return;
            }
            var ang = Math.atan2(f.frame.along.x, f.frame.along.z);
            var i = Math.round(ang / (Math.PI / 3));
            i = ((i % 6) + 6) % 6;
            dirs[i] += 1;
          });
          return dirs;
        })(),
        busStopHooks: parkingCatalog && parkingCatalog.busStopHooks ? parkingCatalog.busStopHooks.length : 0,
        bays: Object.keys(mix).length,
        active: activeCount(),
        cap: activeCap(),
        goals: goals,
        peds: peds.length,
        walkSites: walkSites.length,
        zebras: Object.keys(zebraEdges).length,
        parkPadW: (function () {
          if (!parkingCatalog || !parkingCatalog.features || !parkingCatalog.features[0]) {
            return null;
          }
          var f = parkingCatalog.features[0];
          return f.pad ? { kind: f.kind, w: f.pad.width } : null;
        })()
      };
    },
    setEdgeUse: function (fromKey, toKey, use) {
      assignEdgeUse(fromKey, toKey, use);
    },
    edgeUse: function (fromKey, toKey) {
      return edgeUse(fromKey, toKey);
    },
    snapView: function (distance) {
      if (distance) {
        cam.distance = distance;
        cam.targetDistance = distance;
      }
      cam.polar = cam.targetPolar;
      cam.panX = cam.targetPanX;
      cam.panZ = cam.targetPanZ;
      applyCamera();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    },
    /* Nahaufnahme eines Hex: Pan auf Feldzentrum, optionale Distanz (Default eng). */
    focusHex: function (q, r, distance) {
      var p = axial(Number(q) || 0, Number(r) || 0);
      cam.userAdjusted = true;
      cam.panX = p.x;
      cam.panZ = p.z;
      cam.targetPanX = cam.panX;
      cam.targetPanZ = cam.panZ;
      cam.distance = clamp(
        distance == null ? 46 : Number(distance),
        CAM_DIST_MIN,
        CAM_DIST_MAX
      );
      cam.targetDistance = cam.distance;
      cam.polar = clamp(cam.polar, CAM_POLAR_MIN, CAM_POLAR_MAX);
      cam.targetPolar = cam.polar;
      applyCamera();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      return { q: q, r: r, distance: cam.distance, panX: cam.panX, panZ: cam.panZ };
    },
    projectCause: projectCause,
    setPitch: function (value) {
      cam.pitchSlider = Math.max(0, Math.min(100, Number(value) || 58));
      cam.targetPolar = polarFromSlider(cam.pitchSlider);
      if (!cam.userAdjusted) {
        cam.polar = cam.targetPolar;
      }
      applyCamera();
    },
    onSeatChange: function (state) {
      var snap = state || lastState;
      if (snap) {
        lastState = snap;
      }
      cam.userAdjusted = false;
      cam.userYaw = 0;
      cam.targetUserYaw = 0;
      frameHome(snap, true);
      cam.targetPanX = cam.panX;
      cam.targetPanZ = cam.panZ;
      cam.targetPolar = cam.polar;
      cam.targetDistance = cam.distance;
      startLoop();
    },
    setUserAdjusted: function (value) {
      cam.userAdjusted = !!value;
    },
    isUserAdjusted: function () {
      return !!cam.userAdjusted;
    },
    pan: function (dx, dy) {
      startLoop();
      cam.userAdjusted = true;
      var h = (viewport && viewport.clientHeight) || 600;
      var scale = cam.distance / Math.max(280, h);
      var a = cam.seatYaw + cam.userYaw;
      var rx = Math.cos(a);
      var rz = -Math.sin(a);
      var fx = -Math.sin(a);
      var fz = -Math.cos(a);
      cam.targetPanX += (-dx * rx + dy * fx) * scale;
      cam.targetPanZ += (-dx * rz + dy * fz) * scale;
      clampPan();
    },
    orbit: function (dx, dy) {
      startLoop();
      cam.userAdjusted = true;
      cam.targetUserYaw -= dx * 0.0038;
      cam.targetPolar = clamp(cam.targetPolar + dy * 0.0032, CAM_POLAR_MIN, CAM_POLAR_MAX);
    },
    zoomAt: function (clientX, clientY, factor) {
      startLoop();
      cam.userAdjusted = true;
      /* Nur Distanz — kein Cursor-Pan-Korrektur. Mit Damping driftet Zoom-to-point sonst vor/zurück. */
      cam.targetDistance = clamp(cam.targetDistance / factor, CAM_DIST_MIN, CAM_DIST_MAX);
    },
    fit: function (force) {
      fitCamera(!!force);
    },
    resize: resize,
    pick: pickAt,
    project: function (q, r) {
      if (!camera || !canvas) {
        return null;
      }
      var p = axial(q, r);
      var v = new THREE.Vector3(p.x, TILE_H + 1.2, p.z);
      v.project(camera);
      var rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-v.y * 0.5 + 0.5) * rect.height
      };
    },
    setProductionMode: setProductionMode,
    isProductionMode: function () {
      return !!productionMode;
    },
    setQuality: setBoardQuality,
    setBiome: setBiome,
    getBiome: function () {
      return { choice: biomeChoice, active: activeBiome };
    },
    getQuality: function () {
      return {
        choice: qualityChoice,
        resolved: resolvedPreset || "quality",
        animating: running && !!rafId,
        pixelRatio: renderer ? renderer.getPixelRatio() : null,
        antialias: !!activeQuality.antialias,
        rafStep: activeQuality.rafStep,
        pixelLook: !!activeQuality.pixelLook,
        renderScale: activeQuality.renderScale,
        cars: CAR_COUNT,
        maxLights: MAX_LIGHTS,
        maxLamps: MAX_LAMPS,
        maxTrees: MAX_TREES,
        decoKeep: activeQuality.decoKeep,
        gpu: gpuProbe,
        preset: {
          pixelRatioCap: activeQuality.pixelRatioCap,
          carCount: activeQuality.carCount,
          maxLights: activeQuality.maxLights,
          maxLamps: activeQuality.maxLamps
        }
      };
    },
    setTheme: function () {
      if (!renderer) {
        return;
      }
      lastTheme = "";
      if (lastState) {
        sync(lastState, lastUi);
      }
    },
    canvas: function () {
      return canvas;
    },
    debugCamera: function () {
      debugCamOn = !debugCamOn;
      if (debugCamOn) {
        cam.targetPolar = CAM_POLAR_MIN;
        cam.targetDistance = CAM_DIST_MAX;
        cam.targetPanX = 0;
        cam.targetPanZ = 0;
      } else {
        cam.targetPolar = polarFromSlider(cam.pitchSlider);
        cam.targetDistance = defaultDistance();
      }
      cam.userAdjusted = true;
      applyCamera();
    },
    focusWorld: function (x, z, distance) {
      cam.userAdjusted = true;
      cam.panX = Number(x) || 0;
      cam.panZ = Number(z) || 0;
      cam.targetPanX = cam.panX;
      cam.targetPanZ = cam.panZ;
      if (distance) {
        cam.distance = distance;
        cam.targetDistance = distance;
      }
      applyCamera();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    },
    setWirePick: function () {
      wireOn = !wireOn;
      if (mats.hit) {
        mats.hit.wireframe = wireOn;
        mats.hit.opacity = wireOn ? 0.85 : 0;
        mats.hit.transparent = true;
        mats.hit.needsUpdate = true;
      }
    },
    setDensity: function (level) {
      densityLevel = Math.max(0, Math.min(2, Number(level) || 0));
      if (graph.keys.length) {
        spawnCars();
      }
    },
    liveNodes: function () {
      function count(root) {
        var n = 0;
        if (!root || !root.traverse) {
          return 0;
        }
        root.traverse(function () {
          n += 1;
        });
        return n;
      }
      var parts = {
        tiles: count(roots.tiles),
        roads: count(roots.roads),
        static: count(roots.static),
        batches: count(roots.batches),
        cars: count(roots.cars),
        scene: scene && scene.children ? scene.children.length : 0
      };
      Nexus._liveParts = parts;
      return parts.tiles + parts.roads + parts.static + parts.batches + parts.cars;
    },
    rebuildForTest: function () {
      if (!lastState) {
        return;
      }
      tearDownCity();
      cityPhase = "static";
      var guard = 0;
      while (cityPhase !== "done" && guard < 30) {
        stepCity(lastState, lastUi || {});
        guard += 1;
      }
    },
    debugSnapshot: function () {
      return {
        cars: cars.map(function (c) {
          var a = graph.nodes[c.from];
          var b = graph.nodes[c.to];
          var dx = a && b ? b.x - a.x : 0;
          var dz = a && b ? b.z - a.z : 0;
          return {
            from: c.from,
            to: c.to,
            u: Math.round(c.u * 1000) / 1000,
            hold: c.hold,
            heading: Math.atan2(dx, dz),
            dx: Math.round(dx * 100) / 100,
            dz: Math.round(dz * 100) / 100
          };
        }),
        carLongAxis: "z",
        carForward: (function () {
          if (!carMesh || !cars.length) {
            return [];
          }
          var out = [];
          var m = new THREE.Matrix4();
          var i;
          for (i = 0; i < Math.min(cars.length, 6); i++) {
            carMesh.getMatrixAt(i, m);
            var el = m.elements;
            out.push({ zx: Math.round(el[8] * 1000) / 1000, zz: Math.round(el[10] * 1000) / 1000 });
          }
          return out;
        })(),
        graphNodes: graph.keys.length,
        lights: lights.length,
        lamps: dressingCounts.lamps,
        dressing: dressingCounts,
        quality: qualityChoice,
        resolvedQuality: resolvedPreset,
        pixelRatio: renderer ? renderer.getPixelRatio() : null,
        night: isNight(),
        fps: fpsValue,
        triangles: renderer && renderer.info && renderer.info.render ? renderer.info.render.triangles : 0,
        calls: renderer && renderer.info && renderer.info.render ? renderer.info.render.calls : 0,
        cityStats: { tearDown: cityStats.tearDown, rebuildTiles: cityStats.rebuildTiles, patchTile: cityStats.patchTile },
        density: densityLevel,
        wire: wireOn,
        yaw: cam.seatYaw + cam.userYaw,
        polar: cam.polar,
        distance: cam.distance,
        hexYaw: HEX_YAW,
        fogNear: FOG_NEAR,
        fogFar: FOG_FAR,
        camDistMax: CAM_DIST_MAX
      };
    }
  };

  Nexus.setCameraPitch = function (pitch) {
    cam.pitchSlider = Math.max(0, Math.min(100, Number(pitch) || 58));
    if (Nexus.Board3D) {
      Nexus.Board3D.setPitch(cam.pitchSlider);
    }
  };

  Nexus.getCameraPitch = function () {
    return cam.pitchSlider;
  };

  Nexus.boardView = function () {
    return { focus: { x: 0, y: 0, w: 1, h: 1 } };
  };
})(window.Nexus);
