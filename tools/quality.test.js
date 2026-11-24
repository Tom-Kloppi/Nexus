/* Governor- und Stufen-Tests. node tools/quality.test.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..", "nexus", "js");
global.window = global;
global.Nexus = {};
vm.runInThisContext(fs.readFileSync(path.join(root, "quality.js"), "utf8"), { filename: "quality.js" });

var Q = global.Nexus.Quality;
var failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + message);
  }
}

function frames(ms, n) {
  var i;
  var snap = null;
  for (i = 0; i < n; i++) {
    snap = Q.pushFrame(ms, i * 16);
  }
  return snap;
}

Q.boot({ cores: 8, memory: 16, dpr: 1, pixels: 1920 * 1080, renderer: "NVIDIA" }, { manual: "high" }, "");
Q.resetLog();
var stable = frames(12, 300);
assert(Q.state().tier === "high", "stable tier drifted: " + Q.state().tier);
assert(stable.scale >= 0.9, "stable scale dropped " + stable.scale);

Q.boot({ cores: 8, memory: 8, dpr: 1, pixels: 1e6, renderer: "NVIDIA" }, null, "");
Q.setManual("high");
Q.resetLog();
frames(40, 40);
var loaded = Q.state();
assert(loaded.scale < 1, "sustained load did not ease scale " + loaded.scale);
assert(loaded.tier === "high", "preset should stay high under load, got " + loaded.tier);

Q.setManual("high");
Q.resetLog();
frames(16, 30);
Q.pushFrame(220, 5000);
var afterSpike = Q.state();
assert(afterSpike.tier === "high", "single spike dropped tier to " + afterSpike.tier);

Q.setManual("medium");
Q.resetLog();
var i;
var flips = 0;
var prev = Q.state().tier;
for (i = 0; i < 80; i++) {
  Q.pushFrame(i % 2 === 0 ? 10 : 40, i * 16);
  if (Q.state().tier !== prev) {
    flips += 1;
    prev = Q.state().tier;
  }
}
assert(flips === 0, "oscillation flipped tier " + flips + " times");

Q.boot({ software: true, renderer: "Google SwiftShader" }, null, "");
assert(Q.state().tier === "low", "software renderer not low: " + Q.state().tier);

Q.boot(
  { cores: 8, memory: 16, dpr: 1, pixels: 1e6, renderer: "NVIDIA" },
  {
    crashed: true,
    tier: "high",
    cap: "high",
    manual: "high",
    fingerprint: Q.fingerprint({ cores: 8, memory: 16, dpr: 1, w: 0, h: 0, renderer: "NVIDIA" })
  },
  ""
);
assert(Q.ORDER.indexOf(Q.state().tier) <= Q.ORDER.indexOf("medium"), "crash guard stayed high: " + Q.state().tier);

Q.boot({ cores: 4, memory: 8, dpr: 1, pixels: 1e6 }, null, "?quality=minimal");
assert(Q.state().tier === "low", "url minimal not mapped to low: " + Q.state().tier);
assert(Q.snapshot().fpsCap === 30, "low preset fpsCap wrong");
assert(Q.snapshot().shadows === false, "shadows should stay off");

assert(Q.clampTier("ultra") === "high", "ultra legacy map");
assert(Q.clampTier("auto") === "medium", "auto legacy map");

Q.setManual("low");
Q.setCap("low");
Q.resetLog();
frames(8, 400);
assert(Q.state().tier === "low", "manual low drifted to " + Q.state().tier);

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("quality ok");
