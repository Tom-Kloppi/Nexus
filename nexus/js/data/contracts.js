window.Nexus = window.Nexus || {};

/* Sonderaufträge + Handkarten-Stubs (C5). Keine Regeln. */
(function (Nexus) {
  Nexus.CONTRACT_DEFAULT_WEEKS = 4;

  Nexus.CONTRACTS = [
    {
      id: "donate-energy-10",
      kind: "donate",
      label: "Spende 10 Energie",
      resource: "energy",
      amount: 10,
      weeks: 4,
      rewardSp: 1,
      rewardKarma: 1,
      failKarma: -1
    },
    {
      id: "donate-money-10",
      kind: "donate",
      label: "Spende 10 Geld",
      resource: "money",
      amount: 10,
      weeks: 4,
      rewardSp: 1,
      rewardKarma: 1,
      failKarma: -1
    },
    {
      id: "donate-data-10",
      kind: "donate",
      label: "Spende 10 Daten",
      resource: "bandwidth",
      amount: 10,
      weeks: 4,
      rewardSp: 1,
      rewardKarma: 1,
      failKarma: -1
    },
    {
      id: "build-metric-3",
      kind: "buildMetric",
      label: "Baue 3 Felder deiner Metrik",
      need: 3,
      weeks: 4,
      rewardSp: 1,
      failKarma: -1
    },
    {
      id: "build-on-foreign-2",
      kind: "transfersIn",
      label: "2 Übertragungen an dich abschließen",
      need: 2,
      weeks: 4,
      rewardSp: 1,
      failKarma: -1
    },
    {
      id: "upgrade-2",
      kind: "upgradeMetric",
      label: "Baue 2 Metrik-Felder aus",
      need: 2,
      weeks: 4,
      rewardSp: 1,
      failKarma: -1
    },
    {
      id: "karma-plus",
      kind: "karmaHold",
      label: "Karma ≥ +3 halten (2 Wochen)",
      needKarma: 3,
      holdWeeks: 2,
      weeks: 4,
      rewardSp: 1,
      failKarma: -1
    }
  ];

  Nexus.CONTRACTS_BY_ID = {};
  Nexus.CONTRACTS.forEach(function (c) {
    Nexus.CONTRACTS_BY_ID[c.id] = c;
  });

  /* Handkarten-Typen (Arbeitstitel) — Resolve in state stubs. */
  Nexus.HAND_CARD_DEFS = [
    {
      id: "hand-res-energy",
      type: "resourceGift",
      name: "Energiespende",
      text: "+3 Energie",
      effects: { energy: 3 }
    },
    {
      id: "hand-res-money",
      type: "resourceGift",
      name: "Geldspende",
      text: "+3 Geld",
      effects: { money: 3 }
    },
    {
      id: "hand-res-data",
      type: "resourceGift",
      name: "Datenspende",
      text: "+3 Daten",
      effects: { bandwidth: 3 }
    },
    {
      id: "hand-convert-eg",
      type: "convert",
      name: "Umwandlung E→G",
      text: "2 Energie → 2 Geld",
      effects: { spend: { energy: 2 }, money: 2 }
    },
    {
      id: "hand-free-upgrade",
      type: "freeUpgrade",
      name: "Zufalls-Ausbau",
      text: "Ein eigenes Feld +1 Stufe gratis (wenn möglich)",
      effects: { freeUpgrade: true }
    },
    {
      id: "hand-free-build",
      type: "freeBuild",
      name: "Freifeld",
      text: "Nächster Bau −100 % Kosten",
      effects: { freeZoneClaim: 1 }
    },
    {
      id: "hand-scandal",
      type: "scandal",
      name: "Skandal",
      text: "Ziel −1 SP (min 0) und Karma −1; du Karma −1",
      effects: { scandal: true }
    },
    {
      id: "hand-image",
      type: "imageCare",
      name: "Imagepflege",
      text: "Karma +2",
      effects: { karma: 2 }
    },
    {
      id: "hand-contract",
      type: "contractOffer",
      name: "Auftragsangebot",
      text: "Ziehe 1 Auftrag zur Annahme",
      effects: { offerContract: true }
    },
    {
      id: "hand-block-xfer",
      type: "blockTransfer",
      name: "Blockieren",
      text: "Verhindere 1 Übertragung diese Woche",
      effects: { blockTransfer: true }
    },
    {
      id: "hand-double-harvest",
      type: "doubleHarvest",
      name: "Doppelernte",
      text: "Ein Feld nochmals Ernte-Ertrag",
      effects: { doubleHarvest: true }
    }
  ];

  Nexus.HAND_CARD_DEFS_BY_ID = {};
  Nexus.HAND_CARD_DEFS.forEach(function (c) {
    Nexus.HAND_CARD_DEFS_BY_ID[c.id] = c;
  });

  Nexus.HAND_CARD_LIMIT = 5;
  Nexus.REJECT_OFFER_COST = {
    karma: -1,
    resources: { money: 1 }
  };
})(window.Nexus);
