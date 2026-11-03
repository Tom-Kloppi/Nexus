/* Lädt die Spiellogik in Node, ohne DOM und ohne Three. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

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
  "roles.js",
  "state.js"
];

global.window = global;
global.Nexus = {};

files.forEach(function (file) {
  var code = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInThisContext(code, { filename: file });
});

module.exports = global.Nexus;
