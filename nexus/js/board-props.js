window.Nexus = window.Nexus || {};

(function (Nexus) {
  function canvas(size) {
    var c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    return c;
  }

  function tex(c) {
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }

  function personSprite(seed) {
    var c = canvas(32);
    var g = c.getContext("2d");
    var hues = ["#4a7ab8", "#c04b6e", "#3d8f6a", "#d6942a", "#7a5ea8", "#5a5a68"];
    var body = hues[seed % hues.length];
    g.fillStyle = "#f0d0b0";
    g.beginPath();
    g.arc(16, 8, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = body;
    g.fillRect(12, 12, 8, 12);
    g.fillStyle = "#2a2a32";
    g.fillRect(12, 24, 3.5, 6);
    g.fillRect(16.5, 24, 3.5, 6);
    return tex(c);
  }

  function bikeSprite() {
    var c = canvas(40);
    var g = c.getContext("2d");
    g.strokeStyle = "#2a2a32";
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(10, 26, 6, 0, Math.PI * 2);
    g.arc(30, 26, 6, 0, Math.PI * 2);
    g.moveTo(10, 26);
    g.lineTo(18, 14);
    g.lineTo(28, 14);
    g.lineTo(30, 26);
    g.moveTo(18, 14);
    g.lineTo(16, 26);
    g.stroke();
    g.fillStyle = "#c04b6e";
    g.fillRect(20, 8, 5, 5);
    return tex(c);
  }

  function dogSprite() {
    var c = canvas(28);
    var g = c.getContext("2d");
    g.fillStyle = "#a87848";
    g.fillRect(6, 12, 14, 8);
    g.fillRect(18, 8, 6, 6);
    g.fillRect(6, 20, 3, 5);
    g.fillRect(16, 20, 3, 5);
    return tex(c);
  }

  function propBox(color) {
    var c = canvas(24);
    var g = c.getContext("2d");
    g.fillStyle = color;
    g.fillRect(4, 6, 16, 14);
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(4, 16, 16, 4);
    return tex(c);
  }

  function hydrantSprite() {
    var c = canvas(24);
    var g = c.getContext("2d");
    g.fillStyle = "#c2503f";
    g.fillRect(8, 8, 8, 12);
    g.fillRect(5, 12, 14, 4);
    g.fillStyle = "#e8e0d0";
    g.fillRect(10, 4, 4, 5);
    return tex(c);
  }

  function mailboxSprite() {
    var c = canvas(24);
    var g = c.getContext("2d");
    g.fillStyle = "#3d6ea8";
    g.fillRect(5, 6, 14, 12);
    g.fillStyle = "#2a4a78";
    g.fillRect(7, 8, 10, 4);
    g.fillStyle = "#6a6a72";
    g.fillRect(10, 18, 4, 4);
    return tex(c);
  }

  function bollardSprite() {
    var c = canvas(16);
    var g = c.getContext("2d");
    g.fillStyle = "#c8c070";
    g.fillRect(5, 2, 6, 12);
    g.fillStyle = "#2a2a32";
    g.fillRect(5, 6, 6, 2);
    return tex(c);
  }

  function signSprite() {
    var c = canvas(28);
    var g = c.getContext("2d");
    g.fillStyle = "#6a6a72";
    g.fillRect(12, 10, 3, 14);
    g.fillStyle = "#3d8fa8";
    g.beginPath();
    g.moveTo(14, 2);
    g.lineTo(24, 10);
    g.lineTo(4, 10);
    g.closePath();
    g.fill();
    return tex(c);
  }

  function cafeSprite() {
    var c = canvas(32);
    var g = c.getContext("2d");
    g.fillStyle = "#b08962";
    g.beginPath();
    g.ellipse(16, 18, 10, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#8a6a48";
    g.fillRect(14, 10, 4, 10);
    return tex(c);
  }

  function kioskSprite() {
    var c = canvas(40);
    var g = c.getContext("2d");
    g.fillStyle = "#d6942a";
    g.fillRect(6, 10, 28, 22);
    g.fillStyle = "#c04b6e";
    g.fillRect(4, 6, 32, 6);
    g.fillStyle = "#88c0e0";
    g.fillRect(10, 16, 20, 8);
    return tex(c);
  }

  function fountainSprite() {
    var c = canvas(40);
    var g = c.getContext("2d");
    g.fillStyle = "#8ab0c8";
    g.beginPath();
    g.ellipse(20, 28, 14, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c8d8e8";
    g.fillRect(17, 10, 6, 16);
    g.beginPath();
    g.arc(20, 10, 5, 0, Math.PI * 2);
    g.fill();
    return tex(c);
  }

  function statueSprite() {
    var c = canvas(28);
    var g = c.getContext("2d");
    g.fillStyle = "#9a9aa8";
    g.fillRect(8, 18, 12, 6);
    g.fillRect(11, 8, 6, 12);
    g.beginPath();
    g.arc(14, 6, 4, 0, Math.PI * 2);
    g.fill();
    return tex(c);
  }

  function parkedCarSprite(seed) {
    var c = canvas(40);
    var g = c.getContext("2d");
    var cols = ["#e8e0d8", "#c04b6e", "#4a74c4", "#3d8f6a", "#2a2a32"];
    g.fillStyle = cols[seed % cols.length];
    g.fillRect(4, 14, 32, 12);
    g.fillStyle = "#88b0c8";
    g.fillRect(10, 10, 18, 6);
    g.fillStyle = "#1a1a22";
    g.fillRect(8, 24, 6, 4);
    g.fillRect(26, 24, 6, 4);
    return tex(c);
  }

  function cacheAll() {
    if (Nexus._propSprites) {
      return Nexus._propSprites;
    }
    var s = {
      person: [personSprite(0), personSprite(1), personSprite(2), personSprite(3)],
      bike: bikeSprite(),
      dog: dogSprite(),
      bin: propBox("#5a626a"),
      bench: propBox("#b08962"),
      hydrant: hydrantSprite(),
      mailbox: mailboxSprite(),
      bollard: bollardSprite(),
      sign: signSprite(),
      cafe: cafeSprite(),
      kiosk: kioskSprite(),
      fountain: fountainSprite(),
      statue: statueSprite(),
      car: [parkedCarSprite(0), parkedCarSprite(1), parkedCarSprite(2)],
      container: propBox("#3d8ea8"),
      phone: propBox("#c04b6e"),
      litfass: propBox("#d6942a"),
      fence: propBox("#8a8478")
    };
    Nexus._propSprites = s;
    return s;
  }

  /* Zone-typical prop recipes: [type, weight] */
  var ZONE_PROPS = {
    residential: [
      ["person", 0.28],
      ["dog", 0.08],
      ["bike", 0.1],
      ["mailbox", 0.08],
      ["bench", 0.08],
      ["bollard", 0.06],
      ["cafe", 0.05],
      ["hydrant", 0.05],
      ["bin", 0.08],
      ["fence", 0.06],
      ["statue", 0.03]
    ],
    energy: [
      ["bollard", 0.2],
      ["sign", 0.15],
      ["bin", 0.1],
      ["fence", 0.2],
      ["person", 0.08],
      ["container", 0.12]
    ],
    datacenter: [
      ["bollard", 0.22],
      ["sign", 0.12],
      ["fence", 0.2],
      ["person", 0.1],
      ["bin", 0.1],
      ["container", 0.12]
    ],
    traffic: [
      ["person", 0.15],
      ["bike", 0.12],
      ["car", 0.18],
      ["sign", 0.12],
      ["bollard", 0.1],
      ["bin", 0.08],
      ["kiosk", 0.08],
      ["hydrant", 0.05],
      ["litfass", 0.05]
    ],
    home: [
      ["person", 0.2],
      ["bollard", 0.12],
      ["sign", 0.1],
      ["bench", 0.1],
      ["statue", 0.08],
      ["fountain", 0.06],
      ["bin", 0.08]
    ],
    empty: [
      ["person", 0.18],
      ["bike", 0.1],
      ["car", 0.12],
      ["bench", 0.08],
      ["bin", 0.08],
      ["kiosk", 0.06],
      ["hydrant", 0.06],
      ["mailbox", 0.06],
      ["bollard", 0.08],
      ["cafe", 0.05],
      ["litfass", 0.04],
      ["phone", 0.03],
      ["statue", 0.03],
      ["fountain", 0.03]
    ],
    park: [
      ["person", 0.2],
      ["dog", 0.12],
      ["bench", 0.18],
      ["fountain", 0.1],
      ["statue", 0.08],
      ["bin", 0.1],
      ["bike", 0.08]
    ]
  };

  function pickProp(list, rand) {
    var total = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      total += list[i][1];
    }
    var roll = rand() * total;
    for (i = 0; i < list.length; i++) {
      roll -= list[i][1];
      if (roll <= 0) {
        return list[i][0];
      }
    }
    return list[0][0];
  }

  function propScale(type) {
    if (type === "person" || type === "dog") {
      return { sx: 0.7, sy: 1.15 };
    }
    if (type === "bike") {
      return { sx: 1.1, sy: 0.85 };
    }
    if (type === "car") {
      return { sx: 1.6, sy: 0.9 };
    }
    if (type === "kiosk" || type === "phone" || type === "litfass") {
      return { sx: 1.2, sy: 1.4 };
    }
    if (type === "fountain" || type === "statue") {
      return { sx: 1.3, sy: 1.5 };
    }
    if (type === "cafe") {
      return { sx: 1.0, sy: 0.8 };
    }
    if (type === "bollard") {
      return { sx: 0.35, sy: 0.55 };
    }
    return { sx: 0.7, sy: 0.85 };
  }

  function mapFor(sprites, type, seed) {
    if (type === "person") {
      return sprites.person[seed % sprites.person.length];
    }
    if (type === "car") {
      return sprites.car[seed % sprites.car.length];
    }
    return sprites[type] || sprites.bin;
  }

  /**
   * Seeded green coverage for a tile.
   * Returns { kind: 'full'|'patch'|'none', patches: [{x,z,r}] }
   */
  function greenPlan(q, r, radius, seededFn) {
    var rand = seededFn(q, r, 91);
    var ring = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
    var parkChance = 0.08 + (1 - ring / Math.max(1, radius)) * 0.12;
    if (rand() < parkChance) {
      return { kind: "full", patches: [] };
    }
    var patches = [];
    var n = rand() < 0.45 ? 1 + Math.floor(rand() * 2) : 0;
    var i;
    for (i = 0; i < n; i++) {
      var ang = rand() * Math.PI * 2;
      var dist = 1.2 + rand() * 3.2;
      patches.push({
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        r: 0.7 + rand() * 1.1
      });
    }
    return { kind: patches.length ? "patch" : "none", patches: patches };
  }

  Nexus.BoardProps = {
    cacheAll: cacheAll,
    ZONE_PROPS: ZONE_PROPS,
    pickProp: pickProp,
    propScale: propScale,
    mapFor: mapFor,
    greenPlan: greenPlan
  };
})(window.Nexus);
