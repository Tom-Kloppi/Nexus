window.Nexus = window.Nexus || {};

/* Stadtakte an Abgabe: Karma/SP/Ressourcen — kein Risiko/DC/SAE. */
(function (Nexus) {
  var AKTEN = [
    {
      id: "heat-pump",
      kind: "briefing",
      name: "Wärmepumpen-Förderung",
      category: "green",
      text: "Quartier heizt elektrisch. Öko und ein Schluck Energie.",
      effects: { eco: 0, energy: 2, karma: 1 }
    },
    {
      id: "pv-facade",
      kind: "briefing",
      name: "Fassaden-Solar",
      category: "green",
      text: "Pilotfläche an der Wand. Energie ohne Geldrückfluss.",
      effects: { energy: 2, karma: 0 }
    },
    {
      id: "green-ppa",
      kind: "briefing",
      name: "Grünstrom-Deal",
      category: "green",
      text: "Langfristig Ökostrom — planbar für den Leitstand.",
      effects: { energy: 2, money: 1 }
    },
    {
      id: "storage-dispatch",
      kind: "briefing",
      name: "Speicher-Dispatch",
      category: "green",
      text: "Batterien schlucken Spitzen. Das Netz atmet durch.",
      effects: { energy: 1, bandwidth: 1 }
    },
    {
      id: "load-shift",
      kind: "briefing",
      name: "Nachtverbrauch",
      category: "green",
      text: "Last verschieben statt neu bauen.",
      effects: { energy: 1, karma: 1 }
    },
    {
      id: "zero-trust",
      kind: "briefing",
      name: "Zero-Trust-Zaun",
      category: "privacy",
      text: "Jeder Zugriff braucht Ausweis. Weniger Cloud-Druck.",
      effects: { karma: 1, bandwidth: 1 }
    },
    {
      id: "on-device-ai",
      kind: "briefing",
      name: "Hirn im Gerät",
      category: "privacy",
      text: "Auswertung bleibt lokal.",
      effects: { karma: 1, energy: 1 }
    },
    {
      id: "data-minimization",
      kind: "briefing",
      name: "Datensparsamkeit",
      category: "privacy",
      text: "Nur nötige Daten speichern.",
      effects: { karma: 2 }
    },
    {
      id: "v2g-pilot",
      kind: "briefing",
      name: "Auto als Batterie",
      category: "mobility",
      text: "Parkende E-Autos speisen zurück.",
      effects: { energy: 1, money: 1 }
    },
    {
      id: "taxi-dispatch",
      kind: "briefing",
      name: "Taxi-Leitsoftware",
      category: "mobility",
      text: "Zentrale Disposition für E-Taxis.",
      effects: { money: 1, bandwidth: 1 }
    },
    {
      id: "maas",
      kind: "briefing",
      name: "Alles-Ticket",
      category: "mobility",
      text: "Eine App für den Alltag.",
      effects: { money: 1, karma: 0 }
    },
    {
      id: "civic-tech",
      kind: "briefing",
      name: "Mitmach-App",
      category: "general",
      text: "Bürger melden Ideen. Daten und Image-Flavor.",
      effects: { bandwidth: 1, karma: 1 }
    },
    {
      id: "campus-5g",
      kind: "briefing",
      name: "Campus-Funk",
      category: "general",
      text: "Lokales Netz für Wohnen und Server.",
      effects: { bandwidth: 2 }
    },
    {
      id: "digital-twin",
      kind: "briefing",
      name: "Stadt-Doppelgänger",
      category: "general",
      text: "Quartier als Modell — testen vor dem Bau.",
      effects: { bandwidth: 1, energy: 1 }
    },
    {
      id: "scandal-brief",
      kind: "briefing",
      name: "Skandal-Notiz",
      category: "general",
      text: "Heikle Schlagzeile — du verlierst 1 own-SP (min 0) und Karma−1.",
      effects: { ownSp: -1, karma: -1 }
    },
    {
      id: "image-care",
      kind: "briefing",
      name: "Imagepflege",
      category: "general",
      text: "Öffentliche Geste. Karma+2.",
      effects: { karma: 2 }
    },
    {
      id: "free-tile",
      kind: "briefing",
      name: "Freifeld-Gutschein",
      category: "general",
      text: "Nächster Bau kostenlos (ein Feld).",
      effects: { freeZoneClaim: 1 }
    },

    {
      id: "mandate-solar",
      kind: "mandate",
      name: "Solar-Auftrag",
      category: "green",
      text: "Bau 2 Solarfarmen. Abschluss: Energie und Karma.",
      mandate: {
        need: { buildType: "energy", buildVariant: "solar", count: 2 },
        reward: { energy: 2, karma: 1 }
      }
    },
    {
      id: "mandate-taxi",
      kind: "mandate",
      name: "Mobilitäts-Auftrag",
      category: "mobility",
      text: "Baue 1 E-Taxistand. Abschluss: Geld.",
      mandate: {
        need: { tileId: "data-taxi", count: 1 },
        reward: { money: 2, karma: 0 }
      }
    },
    {
      id: "mandate-server",
      kind: "mandate",
      name: "Daten-Auftrag",
      category: "privacy",
      text: "Baue 1 Serverfarm. Abschluss: Daten und Karma.",
      mandate: {
        need: { tileId: "data-server", count: 1 },
        reward: { bandwidth: 2, karma: 1 }
      }
    },
    {
      id: "mandate-upgrade",
      kind: "mandate",
      name: "Ausbau-Auftrag",
      category: "general",
      text: "Werte 2 Felder auf. Abschluss: Geld.",
      mandate: {
        need: { upgrade: true, count: 2 },
        reward: { money: 2 }
      }
    },
    {
      id: "mandate-park",
      kind: "mandate",
      name: "Grün-Auftrag",
      category: "green",
      text: "Lege 1 Park an. Abschluss: Karma.",
      mandate: {
        need: { tileId: "misc-park", count: 1 },
        reward: { karma: 1, money: 1 }
      }
    },

    {
      id: "pressure-audit",
      kind: "pressure",
      name: "Datenleck-Vorwurf",
      category: "privacy",
      text: "Ziel zahlt 2 Daten oder Karma−2. Du +1 Karma bei Zahlung.",
      pressure: { pay: { bandwidth: 2 }, orKarma: 2, karmaGain: 1 }
    },
    {
      id: "pressure-hearing",
      kind: "pressure",
      name: "Bürgerhearing",
      category: "general",
      text: "Ziel zahlt 2 Geld oder Karma−2. Zahlung: du +1 Karma.",
      pressure: { pay: { money: 2 }, orKarma: 2, karmaGain: 1 }
    },
    {
      id: "pressure-grid",
      kind: "pressure",
      name: "Netzengpass-Klage",
      category: "green",
      text: "Ziel gibt 2 Energie ab oder Karma−2.",
      pressure: { pay: { energy: 2 }, orKarma: 2, karmaGain: 0 }
    },
    {
      id: "pressure-press",
      kind: "pressure",
      name: "Presse-Anfrage",
      category: "mobility",
      text: "Ziel zahlt 1 Geld + 1 Daten oder Karma−2.",
      pressure: { pay: { money: 1, bandwidth: 1 }, orKarma: 2, karmaGain: 1 }
    }
  ];

  Nexus.STADT_AKTEN = AKTEN;
  Nexus.STADT_AKTEN_BY_ID = {};
  AKTEN.forEach(function (card) {
    Nexus.STADT_AKTEN_BY_ID[card.id] = card;
  });

  Nexus.STADT_AKTE_KIND_LABELS = {
    briefing: "Briefing",
    mandate: "Mandat",
    pressure: "Druckstück"
  };

  Nexus.INNOVATION_CARDS = AKTEN.filter(function (card) {
    return card.kind === "briefing";
  });
  Nexus.INNOVATION_CARDS_BY_ID = {};
  Nexus.INNOVATION_CARDS.forEach(function (card) {
    Nexus.INNOVATION_CARDS_BY_ID[card.id] = card;
  });
  Object.keys(Nexus.STADT_AKTEN_BY_ID).forEach(function (id) {
    Nexus.INNOVATION_CARDS_BY_ID[id] = Nexus.STADT_AKTEN_BY_ID[id];
  });

  Nexus.INNOVATION_CATEGORY_LABELS = {
    green: "Grün",
    privacy: "Datenschutz",
    mobility: "Mobilität",
    general: "Allgemein"
  };
})(window.Nexus);
