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

Q.boot({ cores: 8, memory: 16, dpr: 1, pixels: 1920 * 1080, renderer: "NVIDIA" }, null, "");
Q.resetLog();
var stable = frames(12, 300);
assert(Q.state().tier === "high" || Q.state().tier === "ultra" || Q.state().tier === "medium", "stable tier drifted: " + Q.state().tier);
assert(stable.scale >= 0.9, "stable scale dropped " + stable.scale);

Q.boot({ cores: 8, memory: 8, dpr: 1, pixels: 1e6, renderer: "NVIDIA" }, null, "");
Q.setManual("high");
Q.resetLog();
frames(40, 40);
var loaded = Q.state();
assert(loaded.scale < 1 || loaded.tier !== "high", "sustained load did not ease " + loaded.tier + " " + loaded.scale);

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
assert(flips <= 1, "oscillation flipped tier " + flips + " times");

Q.boot({ software: true, renderer: "Google SwiftShader" }, null, "");
assert(Q.state().tier === "minimal", "software renderer not minimal: " + Q.state().tier);

Q.boot({ cores: 8, memory: 16, dpr: 1, pixels: 1e6, renderer: "NVIDIA" }, { crashed: true, tier: "ultra", cap: "ultra", fingerprint: Q.fingerprint({ cores: 8, memory: 16, dpr: 1, w: 0, h: 0, renderer: "NVIDIA" }) }, "");
assert(Q.ORDER.indexOf(Q.state().tier) <= Q.ORDER.indexOf("medium"), "crash guard stayed high: " + Q.state().tier);

Q.boot({ cores: 4, memory: 8, dpr: 1, pixels: 1e6 }, null, "?quality=minimal&fps=30");
assert(Q.state().tier === "minimal", "url tier ignored");
assert(Q.snapshot().fpsCap === 30, "url fps ignored");

var cal = Q.calibrate([40, 42, 41, 39, 55, 38], { cores: 8, memory: 8, dpr: 1, pixels: 1e6 });
assert(Q.ORDER.indexOf(cal.tier) < Q.ORDER.indexOf(Q.deviceTier({ cores: 8, memory: 8, dpr: 1, pixels: 1e6 })), "calibration did not lower a slow sample");

Q.setManual("low");
Q.setCap("low");
Q.resetLog();
frames(8, 400);
assert(Q.ORDER.indexOf(Q.state().tier) <= Q.ORDER.indexOf("low"), "rose above cap " + Q.state().tier);

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("quality ok");
