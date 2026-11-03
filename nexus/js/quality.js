window.Nexus = window.Nexus || {};

/* Qualitätsstufen, Kalibrierung, Governor. Kein DOM, kein Three. */
(function (Nexus) {
  var ORDER = ["minimal", "low", "medium", "high", "ultra"];

  var TABLE = {
    minimal: {
      id: "minimal",
      pixelRatioCap: 1,
      renderScale: 0.55,
      antialias: false,
      shadows: false,
      shadowMap: 0,
      shadowEvery: 0,
      fog: false,
      clouds: 0,
      birds: 0,
      turbines: 0,
      villages: 0,
      horizon: 0,
      props: 0.2,
      cars: 4,
      peds: 0,
      buses: 2,
      lamps: 4,
      lights: 2,
      trees: 4,
      bins: 2,
      benches: 0,
      glow: false,
      particles: false,
      uiMotion: false,
      backdrop: false,
      lod: true,
      fpsCap: 30,
      demand: true,
      chunkMs: 8,
      decoKeep: 0.2,
      vehicleStride: 2
    },
    low: {
      id: "low",
      pixelRatioCap: 1,
      renderScale: 0.7,
      antialias: false,
      shadows: false,
      shadowMap: 0,
      shadowEvery: 0,
      fog: true,
      clouds: 2,
      birds: 2,
      turbines: 2,
      villages: 1,
      horizon: 0.35,
      props: 0.4,
      cars: 8,
      peds: 3,
      buses: 4,
      lamps: 8,
      lights: 4,
      trees: 8,
      bins: 4,
      benches: 1,
      glow: false,
      particles: false,
      uiMotion: false,
      backdrop: false,
      lod: true,
      fpsCap: 30,
      demand: true,
      chunkMs: 8,
      decoKeep: 0.4,
      vehicleStride: 1
    },
    medium: {
      id: "medium",
      pixelRatioCap: 1.25,
      renderScale: 0.85,
      antialias: false,
      shadows: false,
      shadowMap: 0,
      shadowEvery: 0,
      fog: true,
      clouds: 4,
      birds: 4,
      turbines: 4,
      villages: 2,
      horizon: 0.7,
      props: 0.7,
      cars: 12,
      peds: 6,
      buses: 8,
      lamps: 12,
      lights: 8,
      trees: 16,
      bins: 8,
      benches: 2,
      glow: true,
      particles: true,
      uiMotion: true,
      backdrop: false,
      lod: true,
      fpsCap: 60,
      demand: true,
      chunkMs: 10,
      decoKeep: 0.7,
      vehicleStride: 1
    },
    high: {
      id: "high",
      pixelRatioCap: 1.5,
      renderScale: 1,
      antialias: true,
      shadows: false,
      shadowMap: 512,
      shadowEvery: 4,
      fog: true,
      clouds: 6,
      birds: 8,
      turbines: 5,
      villages: 4,
      horizon: 1,
      props: 1,
      cars: 16,
      peds: 10,
      buses: 12,
      lamps: 18,
      lights: 12,
      trees: 28,
      bins: 12,
      benches: 3,
      glow: true,
      particles: true,
      uiMotion: true,
      backdrop: true,
      lod: false,
      fpsCap: 60,
      demand: true,
      chunkMs: 12,
      decoKeep: 1,
      vehicleStride: 1
    },
    ultra: {
      id: "ultra",
      pixelRatioCap: 2,
      renderScale: 1,
      antialias: true,
      shadows: true,
      shadowMap: 1024,
      shadowEvery: 2,
      fog: true,
      clouds: 8,
      birds: 10,
      turbines: 6,
      villages: 4,
      horizon: 1,
      props: 1.15,
      cars: 22,
      peds: 14,
      buses: 12,
      lamps: 24,
      lights: 16,
      trees: 36,
      bins: 16,
      benches: 4,
      glow: true,
      particles: true,
      uiMotion: true,
      backdrop: true,
      lod: false,
      fpsCap: 0,
      demand: false,
      chunkMs: 12,
      decoKeep: 1,
      vehicleStride: 1
    }
  };

  var LABELS = {
    auto: "Auto",
    minimal: "Minimal",
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    ultra: "Ultra"
  };

  var manual = null;
  var tier = "medium";
  var cap = "medium";
  var scale = 1;
  var fpsTarget = 60;
  var battery = false;
  var toggles = { shadows: null, fog: null, particles: null, traffic: null, backdrop: null };
  var log = [];
  var bad = 0;
  var good = 0;
  var calm = 0;
  var lastDropAt = 0;
  var samples = [];
  var listenerCount = 0;
  var timerCount = 0;

  function indexOf(id) {
    var i = ORDER.indexOf(id);
    return i < 0 ? 2 : i;
  }

  function clampTier(id) {
    return ORDER.indexOf(id) < 0 ? "medium" : id;
  }

  function drop(id, steps) {
    return ORDER[Math.max(0, indexOf(id) - (steps || 1))];
  }

  function raise(id, steps, ceiling) {
    var top = indexOf(ceiling || "ultra");
    return ORDER[Math.min(top, indexOf(id) + (steps || 1))];
  }

  function deviceTier(info) {
    info = info || {};
    if (info.software) {
      return "minimal";
    }
    if (info.saveData) {
      return "low";
    }
    var score = 0;
    var cores = info.cores || 4;
    var memory = info.memory || 4;
    if (cores >= 8) {
      score += 2;
    } else if (cores >= 4) {
      score += 1;
    } else {
      score -= 1;
    }
    if (memory >= 8) {
      score += 2;
    } else if (memory <= 2) {
      score -= 1;
    }
    if ((info.dpr || 1) >= 2) {
      score -= 1;
    }
    if ((info.pixels || 1) > 2800000) {
      score -= 1;
    }
    if (info.mobile) {
      score -= 1;
    }
    if (info.battery) {
      score -= 1;
    }
    if (score >= 4) {
      return "ultra";
    }
    if (score >= 2) {
      return "high";
    }
    if (score >= 1) {
      return "medium";
    }
    if (score >= 0) {
      return "low";
    }
    return "minimal";
  }

  function percentile(sorted, p) {
    if (!sorted.length) {
      return 0;
    }
    var idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
    return sorted[idx];
  }

  function summarize(frames) {
    var sorted = (frames || []).filter(function (n) {
      return n >= 0 && n < 500;
    }).slice().sort(function (a, b) {
      return a - b;
    });
    return {
      n: sorted.length,
      median: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95)
    };
  }

  function calibrate(frames, info) {
    var stats = summarize(frames);
    var start = deviceTier(info);
    var next = start;
    if (!stats.n) {
      return { tier: start, cap: start, median: 0, p95: 0 };
    }
    if (stats.p95 > 50 || stats.median > 34) {
      next = drop(start, 2);
    } else if (stats.p95 > 28 || stats.median > 22) {
      next = drop(start, 1);
    } else if (stats.median > 0 && stats.median < 12 && stats.p95 < 18) {
      next = raise(start, 1, "high");
    }
    return { tier: next, cap: next, median: stats.median, p95: stats.p95 };
  }

  function note(reason, extra) {
    log.push({ t: log.length, reason: reason, tier: tier, scale: Math.round(scale * 100) / 100, extra: extra || "" });
    if (log.length > 24) {
      log.shift();
    }
  }

  function applyTier(next, reason) {
    next = clampTier(next);
    var ceiling = cap || "ultra";
    if (indexOf(next) > indexOf(ceiling)) {
      next = ceiling;
    }
    if (battery && indexOf(next) > indexOf("low")) {
      next = "low";
    }
    if (next !== tier) {
      tier = next;
      scale = 1;
      note(reason, next);
    }
  }

  function snapshot() {
    var base = Object.assign({}, TABLE[tier] || TABLE.medium);
    base.renderScale = Math.max(0.45, Math.min(1, base.renderScale * scale));
    if (fpsTarget === 30) {
      base.fpsCap = 30;
    } else if (fpsTarget === 60 && base.fpsCap === 0) {
      base.fpsCap = 0;
    } else if (fpsTarget === 60) {
      base.fpsCap = Math.min(base.fpsCap || 60, 60);
    }
    if (toggles.shadows === false) {
      base.shadows = false;
    }
    if (toggles.shadows === true && tier === "ultra") {
      base.shadows = true;
    }
    if (toggles.fog === false) {
      base.fog = false;
    }
    if (toggles.fog === true) {
      base.fog = true;
    }
    if (toggles.particles === false) {
      base.particles = false;
      base.glow = false;
    }
    if (toggles.traffic === false) {
      base.cars = 0;
      base.peds = 0;
      base.buses = 0;
    }
    if (toggles.backdrop === false) {
      base.backdrop = false;
    }
    if (toggles.backdrop === true && indexOf(tier) >= indexOf("high")) {
      base.backdrop = true;
    }
    if (battery) {
      base.fpsCap = 30;
      base.backdrop = false;
      base.particles = false;
    }
    base.tier = tier;
    base.manual = manual;
    base.cap = cap;
    base.scale = scale;
    return base;
  }

  function pushFrame(frameMs, now) {
    now = now || 0;
    var target = fpsTarget === 30 || battery ? 33.4 : 16.7;
    var spike = frameMs > 100;
    if (spike) {
      bad = Math.max(0, bad - 2);
      note("spike", String(Math.round(frameMs)));
      return snapshot();
    }
    if (frameMs > target * 1.35) {
      bad += 1;
      good = 0;
      calm = 0;
    } else if (frameMs < target * 0.75) {
      good += 1;
      bad = 0;
      calm += 1;
    } else {
      bad = Math.max(0, bad - 1);
      good = 0;
    }
    if (bad >= 10 && scale > 0.55) {
      scale = Math.max(0.55, Math.round((scale - 0.1) * 100) / 100);
      bad = 0;
      note("scale-down", String(scale));
    } else if (bad >= 18 && now - lastDropAt > 2500 && indexOf(tier) > 0) {
      applyTier(drop(tier, 1), "tier-down");
      lastDropAt = now;
      bad = 0;
      good = 0;
    }
    if (calm >= 240 && now - lastDropAt > 8000) {
      if (scale < 1) {
        scale = Math.min(1, Math.round((scale + 0.1) * 100) / 100);
        calm = 0;
        note("scale-up", String(scale));
      } else if (manual === null && indexOf(tier) < indexOf(cap)) {
        applyTier(raise(tier, 1, cap), "tier-up");
        calm = 0;
        lastDropAt = now;
      } else {
        calm = 200;
      }
    }
    return snapshot();
  }

  function parseUrl(search) {
    var text = String(search || "");
    var quality = /(?:\?|&)quality=([a-z]+)/.exec(text);
    var fps = /(?:\?|&)fps=(30|60)/.exec(text);
    return {
      tier: quality && (quality[1] === "auto" || ORDER.indexOf(quality[1]) >= 0) ? quality[1] : null,
      fps: fps ? Number(fps[1]) : null
    };
  }

  function fingerprint(info) {
    info = info || {};
    return [info.renderer || "?", info.cores || 0, info.memory || 0, info.w || 0, info.h || 0, info.dpr || 1].join("|");
  }

  function boot(info, stored, search) {
    var url = parseUrl(search);
    var crashed = stored && stored.crashed;
    var remembered = stored && stored.tier;
    var sameDevice = stored && stored.fingerprint === fingerprint(info);
    fpsTarget = url.fps || (stored && stored.fps) || 60;
    battery = !!(stored && stored.battery);
    toggles = { shadows: null, fog: null, particles: null, traffic: null, backdrop: null };
    if (stored && stored.toggles) {
      toggles = Object.assign(toggles, stored.toggles);
    }
    manual = stored && stored.manual ? stored.manual : null;
    if (url.tier === "auto") {
      manual = null;
    }
    if (info && info.software && !(url.tier && url.tier !== "auto")) {
      manual = null;
      tier = "minimal";
      cap = "minimal";
      scale = 1;
      note("software", "minimal");
      return snapshot();
    }
    if (url.tier && url.tier !== "auto") {
      manual = url.tier;
      tier = url.tier;
      cap = "ultra";
      note("url", url.tier);
    } else if (manual) {
      tier = clampTier(manual);
      cap = "ultra";
    } else if (sameDevice && remembered && ORDER.indexOf(remembered) >= 0) {
      tier = remembered;
      cap = (stored && stored.cap) || remembered;
      note("memory", tier);
    } else {
      var guess = deviceTier(info);
      tier = guess;
      cap = guess;
      note("device", guess);
    }
    if (crashed && !url.tier) {
      tier = drop(tier, 2);
      cap = tier;
      manual = null;
      note("crash-guard", tier);
    }
    if (battery) {
      tier = drop(tier, 1);
      if (indexOf(tier) > indexOf("low")) {
        tier = "low";
      }
    }
    scale = 1;
    return snapshot();
  }

  function setManual(id) {
    if (id === "auto") {
      manual = null;
      note("auto", tier);
      return snapshot();
    }
    manual = clampTier(id);
    cap = "ultra";
    applyTier(manual, "manual");
    tier = manual;
    return snapshot();
  }

  function setCap(id) {
    cap = clampTier(id);
    if (indexOf(tier) > indexOf(cap)) {
      applyTier(cap, "cap");
    }
    return snapshot();
  }

  function setFps(n) {
    fpsTarget = Number(n) === 30 ? 30 : 60;
    note("fps", String(fpsTarget));
    return snapshot();
  }

  function setBattery(on) {
    battery = !!on;
    if (battery) {
      applyTier(indexOf(tier) > indexOf("low") ? "low" : tier, "battery");
    }
    note("battery", battery ? "on" : "off");
    return snapshot();
  }

  function setToggle(key, value) {
    if (!Object.prototype.hasOwnProperty.call(toggles, key)) {
      return snapshot();
    }
    toggles[key] = value;
    note("toggle", key);
    return snapshot();
  }

  function acceptCalibration(result) {
    if (!result) {
      return snapshot();
    }
    if (manual) {
      return snapshot();
    }
    cap = result.cap || result.tier;
    applyTier(result.tier, "calibrate");
    tier = ORDER.indexOf(result.tier) > indexOf(cap) ? cap : result.tier;
    return snapshot();
  }

  Nexus.Quality = {
    ORDER: ORDER,
    LABELS: LABELS,
    TABLE: TABLE,
    params: function (id) {
      return Object.assign({}, TABLE[clampTier(id)]);
    },
    deviceTier: deviceTier,
    summarize: summarize,
    calibrate: calibrate,
    drop: drop,
    raise: raise,
    snapshot: snapshot,
    pushFrame: pushFrame,
    parseUrl: parseUrl,
    fingerprint: fingerprint,
    boot: boot,
    setManual: setManual,
    setCap: setCap,
    setFps: setFps,
    setBattery: setBattery,
    setToggle: setToggle,
    acceptCalibration: acceptCalibration,
    log: function () {
      return log.slice();
    },
    resetLog: function () {
      log = [];
      bad = 0;
      good = 0;
      calm = 0;
    },
    noteListeners: function (n) {
      listenerCount = n;
    },
    listeners: function () {
      return listenerCount;
    },
    noteTimers: function (n) {
      timerCount = n;
    },
    timers: function () {
      return timerCount;
    },
    state: function () {
      return { tier: tier, cap: cap, manual: manual, scale: scale, fpsTarget: fpsTarget, battery: battery, toggles: Object.assign({}, toggles) };
    }
  };
})(window.Nexus);
