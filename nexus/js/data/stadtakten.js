window.Nexus = window.Nexus || {};

/* Stadtakte: Briefing (sofort), Mandat (Progression), Druckstück (Ziel wählt). */
(function (Nexus) {
  var AKTEN = [
    /* ——— Briefings (Ausschreibungen / Hand) ——— */
    {
      id: "heat-pump",
      kind: "briefing",
      name: "Wärmepumpen-Förderung",
      category: "green",
      text: "Förderbescheid: Quartier heizt elektrisch. Umwelt und ein Schluck Energie.",
      effects: { environment: 2, energy: 1 }
    },
    {
      id: "pv-facade",
      kind: "briefing",
      name: "Fassaden-Solar",
      category: "green",
      text: "Pilotfläche an der Wand. Energie und Umwelt, ohne Geld zurück.",
      effects: { energy: 2, environment: 1 }
    },
    {
      id: "green-ppa",
      kind: "briefing",
      name: "Grünstrom-Deal",
      category: "green",
      text: "Langfristig Ökostrom — planbar für den Leitstand.",
      effects: { energy: 2, environment: 1 }
    },
    {
      id: "storage-dispatch",
      kind: "briefing",
      name: "Speicher-Dispatch",
      category: "green",
      text: "Batterien schlucken Spitzen. Das Netz atmet durch.",
      effects: { environment: 2, energy: 1 }
    },
    {
      id: "load-shift",
      kind: "briefing",
      name: "Nachtverbrauch",
      category: "green",
      text: "Last verschieben statt neu bauen. Umwelt freut sich.",
      effects: { environment: 2 }
    },
    {
      id: "zero-trust",
      kind: "briefing",
      name: "Zero-Trust-Zaun",
      category: "privacy",
      text: "Jeder Zugriff braucht Ausweis. Weniger Risiko, mehr Sicherheit.",
      effects: { risk: -2, security: 1 }
    },
    {
      id: "on-device-ai",
      kind: "briefing",
      name: "Hirn im Gerät",
      category: "privacy",
      text: "Auswertung bleibt lokal. Sicherheit und etwas Energie.",
      effects: { risk: -1, energy: 1, security: 1 }
    },
    {
      id: "data-minimization",
      kind: "briefing",
      name: "Datensparsamkeit",
      category: "privacy",
      text: "Nur nötige Daten speichern. Kleiner Angriffsraum.",
      effects: { risk: -2, security: 1 }
    },
    {
      id: "v2g-pilot",
      kind: "briefing",
      name: "Auto als Batterie",
      category: "mobility",
      text: "Parkende E-Autos speisen zurück. Energie und Komfort.",
      effects: { energy: 1, comfort: 1 }
    },
    {
      id: "taxi-dispatch",
      kind: "briefing",
      name: "Taxi-Leitsoftware",
      category: "mobility",
      text: "Zentrale Disposition für E-Taxis. Komfort ohne Daten-Refund.",
      effects: { comfort: 2, image: 1 }
    },
    {
      id: "maas",
      kind: "briefing",
      name: "Alles-Ticket",
      category: "mobility",
      text: "Eine App für den Alltag. Image und Komfort.",
      effects: { comfort: 1, image: 1 }
    },
    {
      id: "civic-tech",
      kind: "briefing",
      name: "Mitmach-App",
      category: "general",
      text: "Bürger melden Löcher und Ideen. Image und Daten.",
      effects: { bandwidth: 1, image: 1 }
    },
    {
      id: "campus-5g",
      kind: "briefing",
      name: "Campus-Funk",
      category: "general",
      text: "Lokales Netz für Wohnen und RZ. Mehr Daten.",
      effects: { bandwidth: 2 }
    },
    {
      id: "digital-twin",
      kind: "briefing",
      name: "Stadt-Doppelgänger",
      category: "general",
      text: "Quartier als Modell. Du testest, bevor du baust.",
      effects: { bandwidth: 1, energy: 1 }
    },

    /* ——— Mandate ——— */
    {
      id: "mandate-solar",
      kind: "mandate",
      name: "Solar-Auftrag",
      category: "green",
      text: "Bau 2 Solarfarmen. Abschluss: Umwelt und Energie.",
      mandate: {
        need: { buildType: "energy", buildVariant: "solar", count: 2 },
        reward: { environment: 1, energy: 2 }
      }
    },
    {
      id: "mandate-taxi",
      kind: "mandate",
      name: "Mobilitäts-Auftrag",
      category: "mobility",
      text: "Baue 1 E-Taxi-Station. Abschluss: Komfort und Image.",
      mandate: {
        need: { buildType: "traffic", buildVariant: "taxi", count: 1 },
        reward: { comfort: 1, image: 1 }
      }
    },
    {
      id: "mandate-dc",
      kind: "mandate",
      name: "Daten-Auftrag",
      category: "privacy",
      text: "Baue 1 Rechenzentrum. Abschluss: Sicherheit und Daten.",
      mandate: {
        need: { buildType: "datacenter", count: 1 },
        reward: { security: 1, bandwidth: 2 }
      }
    },
    {
      id: "mandate-upgrade",
      kind: "mandate",
      name: "Ausbau-Auftrag",
      category: "general",
      text: "Werte 2 Felder auf. Abschluss: Geld und Image.",
      mandate: {
        need: { upgrade: true, count: 2 },
        reward: { money: 2, image: 1 }
      }
    },
    {
      id: "mandate-park",
      kind: "mandate",
      name: "Grün-Auftrag",
      category: "green",
      text: "Lege 1 Park an. Abschluss: Umwelt und Komfort.",
      mandate: {
        need: { buildType: "park", count: 1 },
        reward: { environment: 1, comfort: 1 }
      }
    },

    /* ——— Druckstücke ——— */
    {
      id: "pressure-audit",
      kind: "pressure",
      name: "Datenleck-Vorwurf",
      category: "privacy",
      text: "Ziel zahlt 2 Daten oder nimmt +2 Risiko. Du +1 Image bei Zahlung.",
      pressure: { pay: { bandwidth: 2 }, orRisk: 2, imageGain: 1 }
    },
    {
      id: "pressure-hearing",
      kind: "pressure",
      name: "Bürgerhearing",
      category: "general",
      text: "Ziel zahlt 2 Geld oder +2 Risiko. Zahlung: du +1 Image.",
      pressure: { pay: { money: 2 }, orRisk: 2, imageGain: 1 }
    },
    {
      id: "pressure-grid",
      kind: "pressure",
      name: "Netzengpass-Klage",
      category: "green",
      text: "Ziel gibt 2 Energie ab oder +2 Risiko.",
      pressure: { pay: { energy: 2 }, orRisk: 2, imageGain: 0 }
    },
    {
      id: "pressure-press",
      kind: "pressure",
      name: "Presse-Anfrage",
      category: "mobility",
      text: "Ziel zahlt 1 Geld + 1 Daten oder +2 Risiko. Zahlung: du +1 Image.",
      pressure: { pay: { money: 1, bandwidth: 1 }, orRisk: 2, imageGain: 1 }
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

  /* Alias: Briefings = bisherige Innovationsliste für Markt/Smoke. */
  Nexus.INNOVATION_CARDS = AKTEN.filter(function (card) {
    return card.kind === "briefing";
  });
  Nexus.INNOVATION_CARDS_BY_ID = {};
  Nexus.INNOVATION_CARDS.forEach(function (card) {
    Nexus.INNOVATION_CARDS_BY_ID[card.id] = card;
  });
  /* Volle ID-Map inkl. Mandate/Druck für Hand-Draw. */
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
