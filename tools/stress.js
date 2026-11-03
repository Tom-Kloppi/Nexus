/* Rollenwechsel und Szenenaufbau ohne WebGL. node tools/stress.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var stub = require("./glstub.js").makeGlStub();

var root = path.join(__dirname, "..", "nexus", "js");
var files = [
  "data/constants.js",
  "data/tiles.js",
  "data/devices.js",
  "data/events.js",
  "data/cards.js",
  "data/roles.js",
  "glossary.js",
  "dice.js",
  "risk.js",
  "mobility.js",
  "projects.js",
  "arc.js",
  "dialog.js",
  "field-actions.js",
  "quality.js",
  "roles.js",
  "state.js",
  "board-look.js",
  "board-props.js",
  "board-kit.js",
  "board3d.js"
];

var listeners = 0;
stub.document.addEventListener = function () {
  listeners += 1;
};
global.window = global;
global.document = stub.document;
global.THREE = stub.THREE;
global.Nexus = {};
global.navigator = { hardwareConcurrency: 8, userAgent: "node", deviceMemory: 8 };
global.localStorage = { store: {}, getItem: function (k) { return this.store[k] || null; }, setItem: function (k, v) { this.store[k] = String(v); }, removeItem: function (k) { delete this.store[k]; } };
global.getComputedStyle = function () {
  return { getPropertyValue: function () { return ""; } };
};
global.requestAnimationFrame = function () {
  return 1;
};
global.cancelAnimationFrame = function () {};
global.performance = { now: function () { return Date.now(); } };
global.ResizeObserver = null;

files.forEach(function (file) {
  var code = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInThisContext(code, { filename: file });
});

var N = global.Nexus;
if (N.runSmokeCheck) {
  var smoke = N.runSmokeCheck();
  if (smoke !== "ok" && smoke !== true) {
    console.log("smoke", smoke);
  }
}

function meshCount() {
  return stub.counts.mesh;
}

var state = N.startGame(4, "short", { difficulty: "normal", beginner: false });
if (!N.Board3D || !N.Board3D.sync) {
  throw new Error("Board3D missing");
}
var before = meshCount();
var t0 = Date.now();
N.Board3D.sync(state, {});
var revealMeshes = meshCount() - before;
var revealMs = Date.now() - t0;
var clicks = 0;
while (state.turnPhase === "role_reveal" && clicks < 8) {
  var mark = meshCount();
  state = N.acknowledgeRoleReveal(state);
  N.Board3D.sync(state, {});
  clicks += 1;
  if (meshCount() - mark > revealMeshes && state.turnPhase === "role_reveal") {
    console.log("grew during reveal", meshCount() - mark);
  }
}
var afterClicks = meshCount();
var t1 = Date.now();
if (state.turnPhase !== "produce" && state.turnPhase !== "role_reveal") {
  N.Board3D.sync(state, {});
}
var produceMeshes = meshCount() - afterClicks;
var produceMs = Date.now() - t1;

/* Zweiter Aufbau darf die lebendigen Meshes nicht stapeln. */
if (N.Board3D.rebuildForTest) {
  N.Board3D.rebuildForTest();
}
var aliveBefore = N.Board3D.liveNodes ? N.Board3D.liveNodes() : meshCount();
if (N.Board3D.rebuildForTest) {
  var i;
  for (i = 0; i < 6; i++) {
    N.Board3D.rebuildForTest();
  }
}
var aliveAfter = N.Board3D.liveNodes ? N.Board3D.liveNodes() : meshCount();

var report = {
  revealMeshes: revealMeshes,
  revealMs: revealMs,
  clicks: clicks,
  phase: state.turnPhase,
  totalMeshes: meshCount(),
  disposed: stub.counts.disposed,
  produceMeshes: produceMeshes,
  produceMs: produceMs,
  aliveBefore: aliveBefore,
  aliveAfter: aliveAfter,
  listeners: listeners
};
console.log(JSON.stringify(report));

var problems = [];
if (revealMeshes > 40) {
  problems.push("role reveal built " + revealMeshes + " meshes");
}
if (aliveBefore && aliveAfter > aliveBefore * 1.6 + 40) {
  problems.push("scene nodes grew " + aliveBefore + " -> " + aliveAfter + " " + JSON.stringify(N._liveParts || {}));
}
if (process.argv.indexOf("--expect-fix") >= 0 && stub.counts.disposed < 1) {
  problems.push("nothing was disposed");
}
if (problems.length && process.argv.indexOf("--expect-fix") >= 0) {
  console.error(problems.join("; "));
  process.exit(1);
}
if (!problems.length) {
  console.log("stress ok");
}
