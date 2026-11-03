window.Nexus = window.Nexus || {};

/* Platzhalter für ein späteres Dialog-Intro. Keine finalen Inhalte. */
(function (Nexus) {
  var script = [];
  var index = -1;

  var PLACEHOLDER = [
    {
      id: "placeholder",
      speaker: "Lotse",
      text: "Intro-Platzhalter. Hier spricht später eine Figur, mit Textblase und Markierung eines UI-Elements. Kein finaler Text.",
      highlight: "#stat-round"
    }
  ];

  function start(steps) {
    script = (steps && steps.length ? steps : PLACEHOLDER).slice();
    index = 0;
    return current();
  }

  function current() {
    if (index < 0 || index >= script.length) {
      return null;
    }
    return Object.assign({ index: index, total: script.length }, script[index]);
  }

  function advance() {
    if (index < 0) {
      return null;
    }
    index += 1;
    if (index >= script.length) {
      index = -1;
      script = [];
      return null;
    }
    return current();
  }

  function stop() {
    index = -1;
    script = [];
  }

  Nexus.Dialog = {
    placeholder: PLACEHOLDER,
    start: start,
    current: current,
    advance: advance,
    stop: stop
  };
})(window.Nexus);
