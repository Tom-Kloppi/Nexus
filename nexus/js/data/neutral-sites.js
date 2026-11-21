window.Nexus = window.Nexus || {};

/* Neutrale Randfelder: Typen und Bau-Hooks vorbereitet.
   Noch nicht auf dem Brett platziert — buildOneSlot und Regeln bleiben unberührt. */
(function (Nexus) {
  Nexus.NEUTRAL_SITE_TYPES = [
    {
      id: "supermarket",
      label: "Supermarkt",
      art: "artNeutralSupermarket"
    },
    {
      id: "parking",
      label: "Garagen",
      art: "artNeutralParking"
    },
    {
      id: "park",
      label: "Park",
      art: "artNeutralPark"
    },
    {
      id: "gas",
      label: "Tankstelle",
      art: "artNeutralGas"
    },
    {
      id: "plaza",
      label: "Platz",
      art: "artNeutralPlaza"
    }
  ];

  Nexus.NeutralSites = {
    types: Nexus.NEUTRAL_SITE_TYPES,
    byId: {},
    /* Später: Kandidaten auf dem äußeren Ring wählen. */
    candidates: function () {
      return [];
    },
    /* Später: Modelle setzen. */
    place: function () {
      return false;
    }
  };

  Nexus.NEUTRAL_SITE_TYPES.forEach(function (site) {
    Nexus.NeutralSites.byId[site.id] = site;
  });
})(window.Nexus);
