window.Nexus = window.Nexus || {};

(function (Nexus) {
  var HEX = 10;
  var TILE_H = 1.15;
  var ROAD_W = 1.72;
  var ROAD_Y = TILE_H + 0.06;
  var DECO_RINGS = 1;
  var HEX_YAW = 0;
  var CAM_DIST_MIN = 30;
  var CAM_DIST_MAX = 290;
  var FOG_NEAR = 400;
  var FOG_FAR = 760;
  var CAR_COUNT = 16;
  var MAX_LIGHTS = 16;
  var MAX_LAMPS = 18;
  var MAX_TREES = 28;
  var MAX_BINS = 12;
  var MAX_BENCHES = 3;

  var QUALITY_PRESETS = {
    quality: {
      pixelRatioCap: 1.5,
      renderScale: 1,
      antialias: true,
      rafStep: 1,
      carCount: 16,
      maxLights: 16,
      maxLamps: 18,
      maxTrees: 28,
      maxBins: 12,
      maxBenches: 3,
      decoKeep: 1,
      lightInterval: 0,
      pixelLook: false
    },
    balance: {
      pixelRatioCap: 1.2,
      renderScale: 0.92,
      antialias: true,
      rafStep: 1,
      carCount: 12,
      maxLights: 10,
      maxLamps: 12,
      maxTrees: 16,
      maxBins: 8,
      maxBenches: 2,
      decoKeep: 0.55,
      lightInterval: 0.14,
      pixelLook: true
    },
    performance: {
      pixelRatioCap: 1,
      renderScale: 0.8,
      antialias: false,
      rafStep: 2,
      carCount: 6,
      maxLights: 6,
      maxLamps: 8,
      maxTrees: 8,
      maxBins: 4,
      maxBenches: 1,
      decoKeep: 0.28,
      lightInterval: 0.22,
      pixelLook: true
    }
  };

  var qualityChoice = "auto";
  var resolvedPreset = "";
  var qualityReady = false;
  var activeQuality = QUALITY_PRESETS.quality;
  var gpuProbe = null;
  var rendererAntialias = true;
  var rafId = 0;
  var rafN = 0;
  var lastLightPulse = -1;
  var lastLampNight = null;
  var visibilityBound = false;

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
  var carMesh = null;
  var carCabin = null;
  var dummy = null;
  var lights = [];
  var lamps = [];
  var dressingCounts = { trees: 0, lamps: 0, bins: 0, benches: 0 };
  var plusPins = [];
  var overlays = [];

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
    userAdjusted: false
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
    return 0.26 + t * 0.84;
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
    if (value === "quality" || value === "balance" || value === "performance" || value === "auto") {
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
    return out;
  }

  function pickAutoPreset() {
    var gpu = probeGpu();
    var dpr = window.devicePixelRatio || 1;
    var cores = navigator.hardwareConcurrency || 4;
    var ua = navigator.userAgent || "";
    var mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    var gpuName = gpu.renderer || "";
    var mobileGpu = /mali|adreno|powervr/i.test(gpuName);
    var igpu = /intel hd|intel uhd|intel iris/i.test(gpuName);
    if (gpu.software || gpu.caveat || gpu.maxTextureSize < 4096) {
      return "performance";
    }
    if (cores <= 2) {
      return "performance";
    }
    if (mobile || mobileGpu) {
      return dpr >= 2.5 ? "performance" : "balance";
    }
    if (dpr >= 2.5) {
      return "balance";
    }
    if (igpu && dpr >= 2) {
      return "balance";
    }
    if (cores <= 4 && dpr >= 2) {
      return "balance";
    }
    return "quality";
  }

  function applyQualityCounts() {
    var q = activeQuality;
    CAR_COUNT = q.carCount;
    MAX_LIGHTS = q.maxLights;
    MAX_LAMPS = q.maxLamps;
    MAX_TREES = q.maxTrees;
    MAX_BINS = q.maxBins;
    MAX_BENCHES = q.maxBenches;
  }

  function resolveQuality(choice, forceProbe) {
    qualityChoice = normalizeQuality(choice);
    var next;
    if (qualityChoice === "auto") {
      next = forceProbe || !QUALITY_PRESETS[resolvedPreset] ? pickAutoPreset() : resolvedPreset;
    } else {
      next = qualityChoice;
    }
    resolvedPreset = QUALITY_PRESETS[next] ? next : "quality";
    activeQuality = QUALITY_PRESETS[resolvedPreset];
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
      powerPreference: resolvedPreset === "performance" ? "low-power" : "high-performance"
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
    var playTiles = Nexus.allSlots(Nexus.CONSTANTS.HEX_RADIUS);
    buildRoads(playTiles);
    lastFp = "";
    rebuildTiles(lastState, lastUi);
    lastFp = fingerprint(lastState, lastUi);
    applyCamera();
    startLoop();
  }

  function setBoardQuality(choice) {
    var nextChoice = normalizeQuality(choice);
    var changed = !qualityReady || nextChoice !== qualityChoice;
    var prevResolved = resolvedPreset;
    resolveQuality(nextChoice, nextChoice === "auto" && changed);
    qualityReady = true;
    if (!changed && resolvedPreset === prevResolved && renderer) {
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
      polygonOffsetFactor: opts.polygonOffsetFactor || 0
    });
  }

  function basic(color, opts) {
    opts = opts || {};
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite
    });
  }

  function buildGeos() {
    geo.box = new THREE.BoxGeometry(1, 1, 1);
    geo.cyl6 = new THREE.CylinderGeometry(1, 1, 1, 6);
    geo.cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
    geo.cyl12 = new THREE.CylinderGeometry(1, 1, 1, 12);
    geo.sphere = new THREE.SphereGeometry(1, 10, 8);
    geo.cone = new THREE.ConeGeometry(1, 1, 6);
    geo.plane = new THREE.PlaneGeometry(1, 1);
    geo.car = new THREE.BoxGeometry(0.85, 0.48, 1.85);
    geo.cabin = new THREE.BoxGeometry(0.72, 0.34, 0.92);
  }

  function buildMaterials() {
    var night = isNight();
    mats = {};
    mats.asphalt = lambert(css("--asphalt", "#6d747b"));
    mats.lot = lambert(night ? "#3a3f46" : "#8b9198");
    mats.grass = lambert(css("--lu-park-top", "#8ac95c"));
    mats.grassDeep = lambert(css("--lu-park-side", "#5f9440"));
    mats.concrete = lambert(css("--w-concrete", "#dfe3e6"));
    mats.steel = lambert(css("--w-steel", "#b9c4ce"));
    mats.slate = lambert(css("--w-slate", "#c9d3dc"));
    mats.cream = lambert(css("--w-cream", "#fbf4e6"));
    mats.sand = mats.cream;
    mats.roof = lambert(css("--r-slate", "#5d7285"));
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
    mats.road = lambert(night ? "#2a2e33" : "#5c636b");
    mats.mark = lambert(css("--marking", "#f4e7bb"));
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
      emissiveIntensity: night ? 1.4 : 0.18
    });
    mats.lampPole = lambert(night ? "#2b3036" : "#6a7178");
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
    function pastelOf(hex) {
      var c = new THREE.Color(hex);
      var wash = new THREE.Color(night ? "#27343c" : "#f3efe6");
      c.lerp(wash, night ? 0.5 : 0.6);
      return lambert(c);
    }
    mats.ownerPad0 = pastelOf(Nexus.PLAYER_COLORS[0]);
    mats.ownerPad1 = pastelOf(Nexus.PLAYER_COLORS[1]);
    mats.ownerPad2 = pastelOf(Nexus.PLAYER_COLORS[2]);
    mats.hit = basic("#ffffff", { transparent: true, opacity: 0, depthWrite: false });
    mats.bin = lambert(night ? "#3c444c" : "#6b737a");
    mats.bench = lambert(night ? "#5a4634" : "#b08962");
    mats.car = lambert("#f4f0ea");
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
    mats.island = lambert(css("--lu-farm-top", "#c4beb4"));
    mats.waterless = lambert(css("--lu-hill-deep", "#5a6558"));
    var uses = {
      residential: "--lu-res-top",
      "energy-solar": "--lu-solar-top",
      "energy-transformer": "--lu-trafo-top",
      "datacenter-insecure": "--lu-dcopen-top",
      "datacenter-secure": "--lu-dcsafe-top",
      traffic: "--lu-traffic-top",
      home: "--lu-home-top",
      grass: "--lu-grass-top",
      park: "--lu-park-top"
    };
    Object.keys(uses).forEach(function (key) {
      mats["pad-" + key] = lambert(css(uses[key], "#c8cfd6"));
    });
    mats.facade0 = lambert("#d7dee5", { map: makeFacadeTexture(1), emissiveMap: makeFacadeTexture(1), emissive: "#ffd27a", emissiveIntensity: night ? 0.85 : 0.05 });
    mats.facade1 = mats.facade0;
    mats.facade2 = mats.facade0;
  }

  function applyLightsTheme() {
    var night = isNight();
    if (extras.hemi) {
      extras.hemi.color.set(night ? "#8aa4c8" : "#e8f3ff");
      extras.hemi.groundColor.set(night ? "#1a2230" : "#c9d6c0");
      extras.hemi.intensity = night ? 0.32 : 0.72;
    }
    if (extras.sun) {
      extras.sun.color.set(night ? "#9bb6e0" : "#fff4d4");
      extras.sun.intensity = night ? 0.28 : 0.95;
      extras.sun.position.set(night ? -40 : 55, night ? 38 : 70, night ? -20 : 30);
    }
    if (extras.ambient) {
      extras.ambient.intensity = night ? 0.16 : 0.28;
    }
    scene.background = new THREE.Color(css(night ? "--sky-mid" : "--sky-mid", night ? "#12303a" : "#9bd6d4"));
    scene.fog = new THREE.Fog(scene.background, FOG_NEAR, FOG_FAR);
  }

  function addBox(parent, mat, w, h, d, x, y0, z, ry) {
    var mesh = new THREE.Mesh(geo.box, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y0 + h / 2, z);
    if (ry) {
      mesh.rotation.y = ry;
    }
    parent.add(mesh);
    return mesh;
  }

  function addCyl(parent, mat, rTop, rBot, h, x, y0, z, segs) {
    var g = segs === 6 ? geo.cyl6 : segs === 8 ? geo.cyl8 : geo.cyl12;
    var mesh = new THREE.Mesh(g, mat);
    mesh.scale.set(rTop, h, rBot || rTop);
    mesh.position.set(x, y0 + h / 2, z);
    if (segs === 6) {
      mesh.rotation.y = Math.PI / 6;
    }
    parent.add(mesh);
    return mesh;
  }

  function addSphere(parent, mat, r, x, y, z) {
    var mesh = new THREE.Mesh(geo.sphere, mat);
    mesh.scale.set(r, r, r);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
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

  function tree(parent, x, z, s, alt) {
    addCyl(parent, mats.trunk, 0.18 * s, 0.22 * s, 0.9 * s, x, TILE_H, z, 8);
    addSphere(parent, alt ? mats.tree2 : mats.tree, 0.7 * s, x, TILE_H + 1.15 * s, z);
    addSphere(parent, alt ? mats.tree : mats.tree2, 0.48 * s, x + 0.35 * s, TILE_H + 0.85 * s, z - 0.1 * s);
  }

  function lampPost(parent, x, z, tall) {
    var h = tall || 2.4;
    addCyl(parent, mats.lampPole, 0.07, 0.09, h, x, TILE_H, z, 8);
    return addSphere(parent, mats.lamp, 0.16, x, TILE_H + h + 0.08, z);
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

  function landUseKey(zone) {
    if (!zone) {
      return "grass";
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
    return mats["ownerPad" + (index % 3)] || mats.ownerPad0;
  }

  function facadeMat(q, r) {
    var n = Math.abs(q * 3 + r * 7) % 3;
    return mats["facade" + n];
  }

  function trafficKind(q, r) {
    return seeded(q, r, 3)() < 0.5 ? "bus" : "parking";
  }

  function gizmosFor(state, zone, viewer) {
    var out = {};
    if (!zone) {
      return out;
    }
    var owner = state.players.filter(function (p) {
      return p.id === zone.ownerId;
    })[0];
    if (!owner || !owner.devices) {
      return out;
    }
    var mine = viewer && zone.ownerId === viewer.id;
    (Nexus.DEVICES || []).forEach(function (device) {
      var mode = owner.devices[device.id];
      if (mode === "cloud" || (mine && mode === "local")) {
        out[device.id] = true;
      }
    });
    return out;
  }

  function dressDevices(group, kind, gizmos) {
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
    var h = 2.6 + level * 0.55;
    addBox(group, mats.concrete, 4.4, h, 3.2, 0, TILE_H, -0.4, 0);
    addBox(group, mats.steel, 5.2, 0.12, 2.2, 0, TILE_H + h, 1.1, 0);
    busBody(group, -1.4, 1.6, 0);
    if (level >= 1) {
      busBody(group, 1.1, 1.85, 0.1);
    }
    if (level >= 2) {
      busBody(group, -0.2, 2.4, -0.08);
      mast(group, 1.8, -1.2, h + 1.8);
    }
    lampPost(group, 2.4, 2.0, 2.2);
    dressDevices(group, "traffic", gizmos);
  }

  function artParking(group, level, gizmos) {
    addCyl(group, mats.lot, 2.6, 2.6, 0.08, 0, TILE_H, 0, 12);
    addBox(group, mats.concrete, 1.8, 1.4 + level * 0.35, 1.6, -1.6, TILE_H, -0.6, 0);
    charger(group, 1.6, -1.2);
    charger(group, 2.2, 0.2);
    if (level >= 1) {
      charger(group, 2.2, 1.5);
    }
    addBox(group, mats.car, 1.1, 0.35, 0.5, 0.4, TILE_H, 1.6, 0.4);
    if (level >= 2) {
      addBox(group, mats.steel, 1.1, 0.35, 0.5, 1.1, TILE_H, 2.2, -0.2);
      mast(group, -2.2, 1.4, 2.8);
    }
    dressDevices(group, "traffic", gizmos);
  }

  function artPark(group, rand) {
    addBox(group, mats.concrete, 1.6, 1.2, 1.4, 1.1, TILE_H, -0.4, 0.2);
    tree(group, -2.2, 1.4, 1.05, false);
    tree(group, 0.3, 2.0, 0.8, true);
    tree(group, 2.1, 0.6, 0.7, false);
    if (rand() < 0.4) {
      addCyl(group, mats.glass, 1.4, 1.4, 0.08, 0.8, TILE_H, 1.3, 12);
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

  function artWarehouse(group, rand) {
    var h = 2.2 + (rand() < 0.5 ? 1.1 : 0);
    addBox(group, mats.concrete, 4.6, h, 3.4, 0, TILE_H, 0, 0);
    addBox(group, mats.roof, 4.8, 0.16, 3.6, 0, TILE_H + h, 0, 0);
  }

  function artHill(group, rand) {
    var hill = new THREE.Mesh(geo.sphere, mats.hill);
    var s = 2.6 + rand() * 0.8;
    hill.scale.set(s, s * 0.55, s);
    hill.position.set(0, TILE_H + s * 0.15, 0);
    group.add(hill);
    if (rand() < 0.4) {
      tree(group, -1.4, 1.1, 0.7, true);
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

  function clearGroup(g) {
    while (g.children.length) {
      g.remove(g.children[0]);
    }
  }

  function buildStaticCity() {
    clearGroup(roots.static);
    var island = new THREE.Mesh(geo.cyl6, mats.island);
    island.scale.set(HEX * 8.6, 1.6, HEX * 8.6);
    island.position.y = -0.15;
    island.rotation.y = HEX_YAW;
    roots.static.add(island);
    var disc = new THREE.Mesh(geo.cyl12, mats.waterless);
    disc.scale.set(HEX * 14, 0.6, HEX * 14);
    disc.position.y = -0.85;
    roots.static.add(disc);
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
          edges[ek] = { a: nodes[ka], b: nodes[kb] };
        }
      }
    });
    return { edges: edges, nodes: nodes };
  }

  function buildRoads(playTiles) {
    clearGroup(roots.roads);
    lights = [];
    lamps = [];
    var net = uniqueEdges(playTiles);
    graph.nodes = net.nodes;
    graph.keys = Object.keys(net.nodes);
    var roadPoses = [];
    var dashPoses = [];
    Object.keys(net.edges).forEach(function (ek) {
      var e = net.edges[ek];
      var dx = e.b.x - e.a.x;
      var dz = e.b.z - e.a.z;
      var len = Math.hypot(dx, dz) || 1;
      var mx = (e.a.x + e.b.x) / 2;
      var mz = (e.a.z + e.b.z) / 2;
      var heading = Math.atan2(dx, dz);
      roadPoses.push({ x: mx, y: ROAD_Y, z: mz, sx: ROAD_W, sy: 0.12, sz: len + ROAD_W * 0.62, ry: heading });
      dashPoses.push({ x: mx, y: ROAD_Y + 0.07, z: mz, sx: 0.12, sy: 0.04, sz: len * 0.55, ry: heading });
    });
    var capPoses = [];
    Object.keys(net.nodes).forEach(function (k) {
      var n = net.nodes[k];
      capPoses.push({
        x: n.x,
        y: ROAD_Y,
        z: n.z,
        sx: ROAD_W * 0.64,
        sy: 0.13,
        sz: ROAD_W * 0.64,
        ry: 0
      });
    });
    addInstances(geo.box, mats.road, roadPoses, roots.roads);
    addInstances(geo.cyl12, mats.road, capPoses, roots.roads);
    addInstances(geo.box, mats.mark, dashPoses, roots.roads);
    var lightKeys = graph.keys.filter(function (k) {
      return graph.nodes[k].next.length >= 3 && keyRand(k, 19) < 0.32;
    });
    var i;
    for (i = 0; i < lightKeys.length && lights.length < MAX_LIGHTS; i++) {
      var n = graph.nodes[lightKeys[i]];
      var g = new THREE.Group();
      var pull = Math.hypot(n.x, n.z) || 1;
      g.position.set(n.x - (n.x / pull) * 1.42, 0, n.z - (n.z / pull) * 1.42);
      addCyl(g, mats.lampPole, 0.08, 0.1, 3.1, 0, TILE_H, 0, 8);
      addBox(g, mats.housing, 0.38, 0.95, 0.28, 0, TILE_H + 2.85, 0, 0);
      var red = addSphere(g, mats.red.clone(), 0.13, 0, TILE_H + 3.55, 0.16);
      var yel = addSphere(g, mats.yellow.clone(), 0.13, 0, TILE_H + 3.28, 0.16);
      var gre = addSphere(g, mats.green.clone(), 0.13, 0, TILE_H + 3.02, 0.16);
      roots.roads.add(g);
      lights.push({ node: n.key, red: red, yel: yel, gre: gre, phase: i * 1.37, shown: "", night: null });
    }
    scatterStreetDressing(net);
    spawnCars();
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

  function scatterStreetDressing(net) {
    var treeCands = [];
    var lampCands = [];
    var binCands = [];
    var benchCands = [];
    var kerb = ROAD_W * 0.5 + 0.62;
    var edgeKeys = Object.keys(net.edges);
    var i;
    for (i = 0; i < edgeKeys.length; i++) {
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
      if (roll < 0.2) {
        var s = 0.52 + keyRand(ek, 73) * 0.38;
        var tx = px + nx * (kerb + 0.45);
        var tz = pz + nz * (kerb + 0.45);
        var c1 = { x: tx, y: TILE_H + 1.12 * s, z: tz, sx: 0.7 * s, sy: 0.7 * s, sz: 0.7 * s, ry: 0 };
        var c2 = {
          x: tx + 0.28 * s,
          y: TILE_H + 0.82 * s,
          z: tz - 0.12 * s,
          sx: 0.46 * s,
          sy: 0.46 * s,
          sz: 0.46 * s,
          ry: 0
        };
        var swap = keyRand(ek, 74) < 0.5;
        treeCands.push({
          key: ek,
          trunk: { x: tx, y: TILE_H + 0.45 * s, z: tz, sx: 0.18 * s, sy: 0.9 * s, sz: 0.2 * s, ry: 0 },
          c1: swap ? c1 : c2,
          c2: swap ? c2 : c1
        });
      } else if (roll < 0.34) {
        var lx = px + nx * kerb;
        var lz = pz + nz * kerb;
        var h = 2.25 + keyRand(ek, 75) * 0.25;
        lampCands.push({
          key: ek,
          pole: { x: lx, y: TILE_H + h / 2, z: lz, sx: 0.07, sy: h, sz: 0.09, ry: 0 },
          head: { x: lx, y: TILE_H + h + 0.08, z: lz, sx: 0.16, sy: 0.16, sz: 0.16, ry: 0 }
        });
      } else if (roll < 0.44) {
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
      } else if (roll > 0.975) {
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
    treeCands = takeHashed(treeCands, MAX_TREES, 201);
    lampCands = takeHashed(lampCands, MAX_LAMPS, 202);
    binCands = takeHashed(binCands, MAX_BINS, 203);
    benchCands = takeHashed(benchCands, MAX_BENCHES, 204);
    var treeTrunks = [];
    var crownsA = [];
    var crownsB = [];
    var lampPoles = [];
    var lampHeads = [];
    var bins = [];
    var benchSeats = [];
    var benchBacks = [];
    for (i = 0; i < treeCands.length; i++) {
      treeTrunks.push(treeCands[i].trunk);
      crownsA.push(treeCands[i].c1);
      crownsB.push(treeCands[i].c2);
    }
    for (i = 0; i < lampCands.length; i++) {
      lampPoles.push(lampCands[i].pole);
      lampHeads.push(lampCands[i].head);
    }
    for (i = 0; i < binCands.length; i++) {
      bins.push(binCands[i].pose);
    }
    for (i = 0; i < benchCands.length; i++) {
      benchSeats.push(benchCands[i].seat);
      benchBacks.push(benchCands[i].back);
    }
    addInstances(geo.cyl8, mats.trunk, treeTrunks, roots.roads);
    addInstances(geo.sphere, mats.tree, crownsA, roots.roads);
    addInstances(geo.sphere, mats.tree2, crownsB, roots.roads);
    addInstances(geo.cyl8, mats.lampPole, lampPoles, roots.roads);
    var heads = addInstances(geo.sphere, mats.lamp, lampHeads, roots.roads);
    addInstances(geo.box, mats.bin, bins, roots.roads);
    addInstances(geo.box, mats.bench, benchSeats, roots.roads);
    addInstances(geo.box, mats.bench, benchBacks, roots.roads);
    lamps = heads ? [heads] : [];
    dressingCounts = {
      trees: treeTrunks.length,
      lamps: lampPoles.length,
      bins: bins.length,
      benches: benchSeats.length
    };
  }

  function pickNext(fromKey, avoidKey) {
    var node = graph.nodes[fromKey];
    if (!node || !node.next.length) {
      return avoidKey || fromKey;
    }
    var opts = node.next.filter(function (k) {
      return k !== avoidKey;
    });
    if (!opts.length) {
      opts = node.next;
    }
    return opts[Math.floor(Math.random() * opts.length)];
  }

  function spawnCars() {
    cars = [];
    if (!graph.keys.length) {
      return;
    }
    var i;
    for (i = 0; i < CAR_COUNT; i++) {
      var from = graph.keys[i % graph.keys.length];
      var to = pickNext(from, null);
      cars.push({
        from: from,
        to: to,
        u: Math.random(),
        speed: 0.22 + Math.random() * 0.2,
        hold: 0,
        color: new THREE.Color().setHSL((i % 5) * 0.08, 0.55, isNight() ? 0.42 : 0.62)
      });
    }
    if (carMesh) {
      roots.cars.remove(carMesh);
      roots.cars.remove(carCabin);
    }
    dummy = dummy || new THREE.Object3D();
    carMesh = new THREE.InstancedMesh(geo.car, mats.car, CAR_COUNT);
    carCabin = new THREE.InstancedMesh(geo.cabin, mats.cabin, CAR_COUNT);
    carMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    carCabin.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    var carR = HEX * (((Nexus.CONSTANTS && Nexus.CONSTANTS.HEX_RADIUS) || 3) + DECO_RINGS + 2) * 2.15;
    var carBound = new THREE.Sphere(new THREE.Vector3(0, ROAD_Y, 0), carR);
    carMesh.boundingSphere = carBound;
    carCabin.boundingSphere = carBound.clone();
    carMesh.frustumCulled = true;
    carCabin.frustumCulled = true;
    for (i = 0; i < CAR_COUNT; i++) {
      carMesh.setColorAt(i, cars[i].color);
    }
    carMesh.instanceColor.needsUpdate = true;
    roots.cars.add(carMesh);
    roots.cars.add(carCabin);
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
          bulb.material.emissiveIntensity = night ? 1.5 : 0.14;
        }
      });
    }
  }

  function updateCars(dt, time) {
    if (!carMesh) {
      return;
    }
    var i;
    for (i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.hold > 0) {
        car.hold -= dt;
      } else {
        car.u += car.speed * dt;
        while (car.u >= 1) {
          if (lightIsRed(car.to, time) && car.u < 1.08) {
            car.u = 0.98;
            car.hold = 0.45;
            break;
          }
          car.u -= 1;
          var prev = car.from;
          car.from = car.to;
          car.to = pickNext(car.from, prev);
        }
      }
      var a = graph.nodes[car.from];
      var b = graph.nodes[car.to];
      if (!a || !b) {
        continue;
      }
      var x = a.x + (b.x - a.x) * car.u;
      var z = a.z + (b.z - a.z) * car.u;
      var ang = Math.atan2(b.x - a.x, b.z - a.z);
      dummy.position.set(x, ROAD_Y + 0.38, z);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.y = ROAD_Y + 0.68;
      dummy.position.x += Math.sin(ang) * 0.22;
      dummy.position.z += Math.cos(ang) * 0.22;
      dummy.updateMatrix();
      carCabin.setMatrixAt(i, dummy.matrix);
    }
    carMesh.instanceMatrix.needsUpdate = true;
    carCabin.instanceMatrix.needsUpdate = true;
  }

  function fingerprint(state, ui) {
    var player = Nexus.currentPlayer(state);
    var rec = Nexus.recommendExpandSlot ? Nexus.recommendExpandSlot(state) : null;
    var parts = [
      player && player.id,
      state.turnPhase,
      state.currentPlayerIndex,
      ui && ui.inspectedZoneId,
      ui && ui.homeOpen ? 1 : 0,
      ui && ui.expandSlot ? ui.expandSlot.q + "," + ui.expandSlot.r : "",
      rec ? rec.q + "," + rec.r : "",
      document.documentElement.getAttribute("data-theme"),
      resolvedPreset
    ];
    (state.zones || []).forEach(function (z) {
      parts.push(z.id, z.type, z.variant || "", z.ownerId, z.upgradeLevel || 0, z.lastDieId || "");
    });
    (state.players || []).forEach(function (p) {
      Object.keys(p.devices || {}).forEach(function (id) {
        var mode = p.devices[id];
        if (mode === "cloud" || (player && p.id === player.id && mode === "local")) {
          parts.push(p.id, id, mode);
        }
      });
    });
    (state.spinningOutcomes || []).forEach(function (o) {
      parts.push("spin", o.zoneId);
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

  function rebuildTiles(state, ui) {
    clearGroup(roots.tiles);
    plusPins = [];
    overlays = [];
    var player = Nexus.currentPlayer(state);
    var rec = Nexus.recommendExpandSlot ? Nexus.recommendExpandSlot(state) : null;
    var play = [];
    var radius = Nexus.CONSTANTS.HEX_RADIUS;
    Nexus.allSlots(radius + DECO_RINGS).forEach(function (slot) {
      var dist = axialDist(slot.q, slot.r);
      var pos = axial(slot.q, slot.r);
      var group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      var zone = dist <= radius ? Nexus.zoneAt(state, slot.q, slot.r) : null;
      var rand = seeded(slot.q, slot.r, 11);
      var padKey = "grass";
      var padR = HEX * 0.9;
      var owner = null;
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
        if (zone.type === "home") {
          artHome(group, level, giz, slot.q, slot.r);
        } else if (zone.type === "residential") {
          artResidential(group, level, giz, slot.q, slot.r);
        } else if (zone.type === "energy" && zone.variant === "transformer") {
          artTransformer(group, level, giz);
        } else if (zone.type === "energy") {
          artSolar(group, level, giz);
        } else if (zone.type === "datacenter") {
          artDatacenter(group, level, giz, zone.variant === "secure", slot.q, slot.r);
        } else if (zone.type === "traffic") {
          if (trafficKind(slot.q, slot.r) === "parking") {
            artParking(group, level, giz);
          } else {
            artBus(group, level, giz);
          }
        }
        var ownerMatch = state.players.filter(function (p) {
          return p.id === zone.ownerId;
        })[0];
        owner = ownerMatch || null;
        var selected =
          (ui && ui.inspectedZoneId === zone.id) ||
          (zone.type === "home" && ui && ui.homeOpen && player && zone.ownerId === player.id);
        if (selected) {
          var halo = new THREE.Mesh(geo.cyl6, mats.select);
          halo.scale.set(HEX * 0.9, 0.08, HEX * 0.9);
          halo.position.y = TILE_H + 0.2;
          halo.rotation.y = HEX_YAW;
          group.add(halo);
        }
      } else {
        padKey = dist <= 1 ? "park" : "grass";
        if (padKey === "park") {
          artPark(group, rand);
        } else {
          artLot(group, rand);
        }
        var expandable = Nexus.isExpandableSlot(state, slot.q, slot.r) && state.turnPhase === "build";
        if (expandable) {
          var recHere = rec && rec.q === slot.q && rec.r === slot.r;
          var pin = new THREE.Group();
          addCyl(pin, mats.lampPole, 0.07, 0.07, 2.1, 0, TILE_H, 0, 8);
          var head = addSphere(pin, recHere ? mats.plusRec : mats.plus, 0.55, 0, TILE_H + 2.4, 0);
          addBox(pin, mats.cream, 0.55, 0.1, 0.1, 0, TILE_H + 2.35, 0, 0);
          addBox(pin, mats.cream, 0.1, 0.55, 0.1, 0, TILE_H + 2.12, 0, 0);
          group.add(pin);
          plusPins.push({ group: pin, rec: recHere, head: head });
          if (ui && ui.expandSlot && ui.expandSlot.q === slot.q && ui.expandSlot.r === slot.r) {
            var sh = new THREE.Mesh(geo.cyl6, mats.select);
            sh.scale.set(HEX * 0.88, 0.08, HEX * 0.88);
            sh.position.y = TILE_H + 0.18;
            sh.rotation.y = HEX_YAW;
            group.add(sh);
          }
        }
      }
      var padMat = owner
        ? ownerPadMat(owner.colorIndex || 0)
        : mats["pad-" + padKey] || mats.asphalt;
      var pad = new THREE.Mesh(geo.cyl6, padMat);
      pad.scale.set(padR, TILE_H, padR);
      pad.position.y = TILE_H / 2;
      pad.rotation.y = HEX_YAW;
      group.add(pad);
      var hit = new THREE.Mesh(geo.cyl6, mats.hit);
      hit.scale.set(HEX * 0.92, 8, HEX * 0.92);
      hit.position.y = 4;
      hit.rotation.y = HEX_YAW;
      var pick = tilePickData({ q: slot.q, r: slot.r, dist: dist }, zone, state, ui, player);
      if (pick) {
        hit.userData.pick = pick;
        group.userData.pick = pick;
        group.add(hit);
      }
      roots.tiles.add(group);
      if (dist <= radius) {
        play.push({ q: slot.q, r: slot.r });
      }
      if (zone && ui && ui.placePopZoneId === zone.id) {
        group.scale.set(0.02, 0.02, 0.02);
        overlays.push({ type: "pop", group: group, t: 0 });
      }
      if (zone && state.spinningOutcomes) {
        var spinning = state.spinningOutcomes.some(function (o) {
          return o.zoneId === zone.id;
        });
        if (spinning) {
          var chip = addBox(group, mats.cream, 1.1, 0.18, 1.1, 0, TILE_H + 9, 0, 0);
          overlays.push({ type: "spin", mesh: chip });
        }
      }
    });
    return play;
  }

  function playerHome(state) {
    if (!state || !state.zones) {
      return null;
    }
    var player = Nexus.currentPlayer(state);
    if (!player) {
      return null;
    }
    var home = null;
    state.zones.forEach(function (z) {
      if (z.type === "home" && z.ownerId === player.id) {
        home = z;
      }
    });
    return home;
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
    cam.polar = polarFromSlider(cam.pitchSlider);
    cam.distance = defaultDistance();
    cam.userYaw = 0;
    var home = playerHome(state);
    if (!home) {
      cam.panX = 0;
      cam.panZ = 0;
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
    cam.seatTarget = Math.atan2(p.x, p.z);
    if (snap) {
      cam.seatYaw = cam.seatTarget;
    }
    applyCamera();
  }

  function applyCamera() {
    if (!camera) {
      return;
    }
    var a = cam.seatYaw + cam.userYaw;
    var p = cam.polar;
    var d = cam.distance;
    camera.position.set(
      cam.panX + d * Math.sin(p) * Math.sin(a),
      cam.panY + d * Math.cos(p),
      cam.panZ + d * Math.sin(p) * Math.cos(a)
    );
    camera.lookAt(cam.panX, cam.panY, cam.panZ);
  }

  function defaultDistance() {
    if (!viewport) {
      return 108;
    }
    var h = Math.max(1, viewport.clientHeight);
    return clamp(96 * (720 / h), 88, 168);
  }

  function fitCamera(force) {
    if (!force && cam.userAdjusted) {
      applyCamera();
      return;
    }
    frameHome(lastState, !!force);
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

  function tick() {
    rafId = 0;
    if (!shouldAnimate()) {
      running = false;
      return;
    }
    rafId = requestAnimationFrame(tick);
    rafN += 1;
    if (activeQuality.rafStep > 1 && rafN % activeQuality.rafStep !== 0) {
      return;
    }
    var dt = Math.min(0.05, clock.getDelta());
    var time = clock.elapsedTime;
    cam.seatYaw = lerpAngle(cam.seatYaw, cam.seatTarget, 1 - Math.pow(0.0008, dt));
    applyCamera();
    updateCars(dt, time);
    updateLights(time);
    plusPins.forEach(function (pin) {
      var s = pin.rec ? 1 + Math.sin(time * 4) * 0.08 : 1;
      pin.group.scale.set(s, s, s);
    });
    overlays.forEach(function (item) {
      if (item.type === "spin" && item.mesh) {
        item.mesh.rotation.y += dt * 3.2;
      }
      if (item.type === "pop" && item.group) {
        item.t += dt;
        var k = Math.min(1, item.t / 0.28);
        var e = 1 - Math.pow(1 - k, 3);
        var bounce = 1 + Math.sin(k * Math.PI) * 0.08;
        item.group.scale.set(e * bounce, e * bounce, e * bounce);
      }
    });
    renderer.render(scene, camera);
  }

  function ensure() {
    if (renderer) {
      return true;
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
    } catch (err) {
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
    buildMaterials();
    roots.static = new THREE.Group();
    roots.roads = new THREE.Group();
    roots.tiles = new THREE.Group();
    roots.cars = new THREE.Group();
    scene.add(roots.static);
    scene.add(roots.roads);
    scene.add(roots.tiles);
    scene.add(roots.cars);
    extras.hemi = new THREE.HemisphereLight(0xe8f3ff, 0xc9d6c0, 0.7);
    extras.sun = new THREE.DirectionalLight(0xfff4d4, 0.95);
    extras.sun.position.set(55, 70, 30);
    extras.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(extras.hemi);
    scene.add(extras.sun);
    scene.add(extras.ambient);
    applyLightsTheme();
    buildStaticCity();
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
    startLoop();
    return true;
  }

  function sync(state, ui) {
    lastState = state;
    lastUi = ui;
    if (!state || state.screen !== "game") {
      running = false;
      return;
    }
    if (!ensure()) {
      return;
    }
    startLoop();
    var theme = document.documentElement.getAttribute("data-theme") || "light";
    var themeChanged = theme !== lastTheme;
    if (themeChanged) {
      lastTheme = theme;
      buildMaterials();
      applyLightsTheme();
      lastFp = "";
    }
    cam.seatTarget = seatTargetFromState(state);
    var fp = fingerprint(state, ui);
    var playTiles = Nexus.allSlots(Nexus.CONSTANTS.HEX_RADIUS);
    if (!graph.keys.length || themeChanged) {
      buildRoads(playTiles);
    }
    if (fp !== lastFp) {
      lastFp = fp;
      rebuildTiles(state, ui);
    }
    applyCamera();
  }

  function pickAt(clientX, clientY) {
    if (!ensure()) {
      return null;
    }
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObject(roots.tiles, true);
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

  Nexus.Board3D = {
    sync: sync,
    setPitch: function (value) {
      cam.pitchSlider = Math.max(0, Math.min(100, Number(value) || 58));
      if (!cam.userAdjusted) {
        cam.polar = polarFromSlider(cam.pitchSlider);
      } else {
        cam.polar = polarFromSlider(cam.pitchSlider);
      }
      applyCamera();
    },
    onSeatChange: function () {
      cam.userAdjusted = false;
      cam.userYaw = 0;
      frameHome(lastState, true);
    },
    setUserAdjusted: function (value) {
      cam.userAdjusted = !!value;
    },
    isUserAdjusted: function () {
      return !!cam.userAdjusted;
    },
    pan: function (dx, dy) {
      var h = (viewport && viewport.clientHeight) || 600;
      var scale = cam.distance / Math.max(220, h);
      var a = cam.seatYaw + cam.userYaw;
      var rx = Math.cos(a);
      var rz = -Math.sin(a);
      var fx = -Math.sin(a);
      var fz = -Math.cos(a);
      cam.panX += (-dx * rx + dy * fx) * scale;
      cam.panZ += (-dx * rz + dy * fz) * scale;
      applyCamera();
    },
    orbit: function (dx, dy) {
      cam.userYaw -= dx * 0.0055;
      cam.polar = clamp(cam.polar + dy * 0.0045, 0.18, 1.22);
      applyCamera();
    },
    zoomAt: function (clientX, clientY, factor) {
      var before = groundHit(clientX, clientY);
      cam.distance = clamp(cam.distance / factor, CAM_DIST_MIN, CAM_DIST_MAX);
      applyCamera();
      var after = groundHit(clientX, clientY);
      if (before && after) {
        cam.panX += before.x - after.x;
        cam.panZ += before.z - after.z;
        applyCamera();
      }
    },
    fit: function (force) {
      fitCamera(!!force);
    },
    resize: resize,
    pick: pickAt,
    setQuality: setBoardQuality,
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
