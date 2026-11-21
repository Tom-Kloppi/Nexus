window.Nexus = window.Nexus || {};

/* Legacy-Einstieg: Katalog lebt in stadtakten.js (Briefing/Mandat/Druckstück). */
(function (Nexus) {
  if (Nexus.STADT_AKTEN && Nexus.STADT_AKTEN.length) {
    return;
  }
  /* Fallback nur wenn stadtakten.js fehlt. */
  Nexus.INNOVATION_CARDS = Nexus.INNOVATION_CARDS || [];
  Nexus.INNOVATION_CARDS_BY_ID = Nexus.INNOVATION_CARDS_BY_ID || {};
})(window.Nexus);
