window.Nexus = window.Nexus || {};

(function (Nexus) {
  var BIOMES = {
    grass: {
      id: "grass",
      label: "Gras",
      day: {
        plate: "#6faf4a",
        plateDeep: "#4f8634",
        sky: "#a8e0de",
        fog: "#b8e4dc",
        horizon: "#5a8a4a",
        ridge: "#7a9a6a",
        snow: "#e8efe4",
        hemiSky: "#fff6e8",
        hemiGround: "#c8e0a8",
        sun: "#ffe2a8",
        ambient: 0.42,
        hemi: 0.92,
        sunI: 1.15
      },
      night: {
        plate: "#2a3d28",
        plateDeep: "#1a2818",
        sky: "#1a2a3a",
        fog: "#1c2e3c",
        horizon: "#243428",
        ridge: "#2e3c32",
        snow: "#4a5860",
        hemiSky: "#8eb0d8",
        hemiGround: "#1e2a30",
        sun: "#c8d8f0",
        ambient: 0.38,
        hemi: 0.55,
        sunI: 0.42
      }
    },
    desert: {
      id: "desert",
      label: "Wüste",
      day: {
        plate: "#d4b478",
        plateDeep: "#b89458",
        sky: "#f0d8a8",
        fog: "#edd4a0",
        horizon: "#c4a068",
        ridge: "#a88858",
        snow: "#e8dcc0",
        hemiSky: "#fff0d8",
        hemiGround: "#e0c898",
        sun: "#ffe8b0",
        ambient: 0.48,
        hemi: 0.95,
        sunI: 1.2
      },
      night: {
        plate: "#3a3224",
        plateDeep: "#282018",
        sky: "#1c2434",
        fog: "#1e2636",
        horizon: "#2e2a22",
        ridge: "#3a3428",
        snow: "#4a4850",
        hemiSky: "#9aa8c8",
        hemiGround: "#2a2418",
        sun: "#d0d8e8",
        ambient: 0.4,
        hemi: 0.52,
        sunI: 0.4
      }
    },
    water: {
      id: "water",
      label: "Wasser",
      day: {
        plate: "#4a9ab8",
        plateDeep: "#2e6e88",
        sky: "#9ecfe0",
        fog: "#a8d4e0",
        horizon: "#3a7a90",
        ridge: "#5a8898",
        snow: "#d8e8f0",
        hemiSky: "#e8f4ff",
        hemiGround: "#88b8c8",
        sun: "#fff0c8",
        ambient: 0.44,
        hemi: 0.9,
        sunI: 1.1
      },
      night: {
        plate: "#1a3040",
        plateDeep: "#101e28",
        sky: "#122030",
        fog: "#142434",
        horizon: "#1a2a38",
        ridge: "#243440",
        snow: "#3a4a58",
        hemiSky: "#7a9abe",
        hemiGround: "#142028",
        sun: "#b8c8e0",
        ambient: 0.4,
        hemi: 0.58,
        sunI: 0.44
      }
    }
  };

  function makeCanvas(size) {
    var c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    return c;
  }

  function canvasTexture(canvas, opts) {
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    if (opts && opts.anisotropy) {
      tex.anisotropy = opts.anisotropy;
    }
    return tex;
  }

  function glowSprite(color, size) {
    size = size || 64;
    var c = makeCanvas(size);
    var g = c.getContext("2d");
    var mid = size / 2;
    var grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color.replace(/[\d.]+\)$/, "0.55)").replace("rgb(", "rgba("));
    if (color.indexOf("rgba") < 0 && color.indexOf("#") === 0) {
      grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
      grad.addColorStop(0, "rgba(255,230,160,0.95)");
      grad.addColorStop(0.25, "rgba(255,200,100,0.45)");
      grad.addColorStop(0.55, "rgba(255,180,60,0.12)");
      grad.addColorStop(1, "rgba(255,160,40,0)");
    } else {
      grad.addColorStop(1, "rgba(0,0,0,0)");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return canvasTexture(c);
  }

  function lampGlowTex() {
    return glowSprite("#ffd98a", 64);
  }

  function lightPoolTex() {
    var size = 64;
    var c = makeCanvas(size);
    var g = c.getContext("2d");
    var mid = size / 2;
    var grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
    grad.addColorStop(0, "rgba(255, 220, 140, 0.55)");
    grad.addColorStop(0.4, "rgba(255, 200, 100, 0.22)");
    grad.addColorStop(1, "rgba(255, 180, 80, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return canvasTexture(c);
  }

  function treeSprite(seed, biome) {
    var size = 64;
    var c = makeCanvas(size);
    var g = c.getContext("2d");
    var r = ((seed || 1) * 9301 + 49297) % 233280;
    function rnd() {
      r = (r * 9301 + 49297) % 233280;
      return r / 233280;
    }
    var trunk = biome === "desert" ? "#a87848" : "#6b4a2e";
    var crownA = biome === "desert" ? "#c4a858" : biome === "water" ? "#3d9a6a" : "#3f9a45";
    var crownB = biome === "desert" ? "#a88840" : biome === "water" ? "#2e7a55" : "#2e7a38";
    g.fillStyle = trunk;
    g.fillRect(28, 40, 8, 20);
    g.fillStyle = crownA;
    g.beginPath();
    g.arc(32, 28, 14 + rnd() * 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = crownB;
    g.beginPath();
    g.arc(26 + rnd() * 6, 22, 10, 0, Math.PI * 2);
    g.fill();
    return canvasTexture(c);
  }

  function bushSprite(seed, biome) {
    var size = 48;
    var c = makeCanvas(size);
    var g = c.getContext("2d");
    var col = biome === "desert" ? "#b89850" : "#4a9a48";
    var col2 = biome === "desert" ? "#9a7840" : "#357a35";
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(24, 30, 16, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = col2;
    g.beginPath();
    g.ellipse(18, 28, 10, 8, 0, 0, Math.PI * 2);
    g.fill();
    return canvasTexture(c);
  }

  function flowerSprite(seed) {
    var size = 32;
    var c = makeCanvas(size);
    var g = c.getContext("2d");
    var hues = ["#e85a7a", "#f0c040", "#7ec8e8", "#e87840", "#c070d0"];
    var hue = hues[(seed || 0) % hues.length];
    g.fillStyle = "#4a8a3a";
    g.fillRect(14, 16, 3, 12);
    g.fillStyle = hue;
    var i;
    for (i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(16 + Math.cos(a) * 5, 14 + Math.sin(a) * 5, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#fff2a0";
    g.beginPath();
    g.arc(16, 14, 2.5, 0, Math.PI * 2);
    g.fill();
    return canvasTexture(c);
  }

  function horizonSilhouette(biome, night) {
    var w = 512;
    var h = 128;
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var g = c.getContext("2d");
    var base = night
      ? biome === "desert"
        ? "#1e1c18"
        : biome === "water"
          ? "#101820"
          : "#121a14"
      : biome === "desert"
        ? "#8a7048"
        : biome === "water"
          ? "#3a6a78"
          : "#4a6e42";
    var tip = night
      ? biome === "desert"
        ? "#2a2820"
        : biome === "water"
          ? "#1a2830"
          : "#1c2820"
      : biome === "desert"
        ? "#b89868"
        : biome === "water"
          ? "#5a8898"
          : "#6a8e5a";
    g.clearRect(0, 0, w, h);
    g.fillStyle = base;
    g.beginPath();
    g.moveTo(0, h);
    var x = 0;
    while (x <= w) {
      var peak = 20 + ((Math.sin(x * 0.02) + 1) * 28 + (Math.sin(x * 0.07 + 1.3) + 1) * 18);
      g.lineTo(x, h - peak);
      x += 18;
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.fillStyle = tip;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(0, h);
    x = 0;
    while (x <= w) {
      var peak2 = 12 + ((Math.sin(x * 0.015 + 2) + 1) * 18 + (Math.cos(x * 0.05) + 1) * 10);
      g.lineTo(x, h - peak2);
      x += 22;
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    var tex = canvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function normalizeBiome(value) {
    if (value === "grass" || value === "desert" || value === "water") {
      return value;
    }
    if (value === "random") {
      return "random";
    }
    return "grass";
  }

  function resolveBiome(choice, seed) {
    choice = normalizeBiome(choice);
    if (choice !== "random") {
      return choice;
    }
    var keys = ["grass", "desert", "water"];
    var idx = Math.abs((seed || Date.now()) | 0) % keys.length;
    return keys[idx];
  }

  function themeFor(biomeId, night) {
    var b = BIOMES[biomeId] || BIOMES.grass;
    return night ? b.night : b.day;
  }

  Nexus.BoardLook = {
    BIOMES: BIOMES,
    normalizeBiome: normalizeBiome,
    resolveBiome: resolveBiome,
    themeFor: themeFor,
    lampGlowTex: lampGlowTex,
    lightPoolTex: lightPoolTex,
    treeSprite: treeSprite,
    bushSprite: bushSprite,
    flowerSprite: flowerSprite,
    horizonSilhouette: horizonSilhouette
  };
})(window.Nexus);
