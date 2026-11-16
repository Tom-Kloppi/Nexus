/* Smartphone unten links: nur die unsichtbare Halterung.
   Hover, Apps und das Umziehen von Handel/Darstellung kommen später.
   Nichts hier ändert die sichtbare Oberfläche. */
(function (Nexus) {
  var APPS = [
    { id: "trade", title: "Handeln" },
    { id: "settings", title: "Darstellung" },
    { id: "goals", title: "Ziele" },
    { id: "guide", title: "Überblick" }
  ];

  function prepare() {
    if (!document.body || document.getElementById("phone-dock")) {
      return;
    }
    var dock = document.createElement("div");
    dock.id = "phone-dock";
    dock.hidden = true;
    dock.setAttribute("data-phone", "planned");
    dock.setAttribute("aria-hidden", "true");
    APPS.forEach(function (app) {
      var pane = document.createElement("div");
      pane.id = "phone-app-" + app.id;
      pane.hidden = true;
      pane.setAttribute("data-phone-app", app.id);
      dock.appendChild(pane);
    });
    document.body.appendChild(dock);
  }

  Nexus.Phone = {
    apps: APPS,
    prepare: prepare
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prepare);
  } else {
    prepare();
  }
})(window.Nexus);
