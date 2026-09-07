window.Nexus = window.Nexus || {};

Nexus.EVENTS = [
  {
    id: "software-update",
    title: "Kritisches Software-Update",
    text: "Ein Sicherheitspatch steht bereit. Sofort einspielen kostet Bandbreite, Aufschieben erhöht das Risiko.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Sofort einspielen",
        summary: "−1 Konnektivität, −1 Risiko",
        effects: { spend: { connectivity: 1 }, risk: -1 }
      },
      {
        id: "b",
        label: "Verzögern",
        summary: "+2 Risiko, keine Kosten",
        effects: { risk: 2 }
      }
    ]
  },
  {
    id: "power-outage",
    title: "Stromausfall",
    text: "Das Netz bricht kurz weg. Cloud-Geräte liefern diese Runde keinen Effekt. Lokale Geräte laufen weiter.",
    auto: true,
    requiresCloudCamera: false,
    choices: [
      {
        id: "ok",
        label: "Verstanden",
        summary: "Cloud-Effekte diese Runde aus",
        effects: { cloudDisabled: true }
      }
    ]
  },
  {
    id: "data-leak",
    title: "Datenleck bei ungesicherter Kamera",
    text: "Aufnahmen aus der Cloud-Kamera sind nach außen gedrungen. Öffentlich machen oder vertuschen?",
    auto: false,
    requiresCloudCamera: true,
    choices: [
      {
        id: "a",
        label: "Vorfall öffentlich machen",
        summary: "−2 Daten, −3 Risiko",
        effects: { spend: { data: 2 }, risk: -3 }
      },
      {
        id: "b",
        label: "Vertuschen",
        summary: "+3 Risiko, keine Kosten",
        effects: { risk: 3 }
      }
    ]
  },
  {
    id: "bandwidth",
    title: "Bandbreiten-Engpass",
    text: "Das Netz ist überlastet. Du kannst Cloud-Dienste priorisieren oder die Drosselung hinnehmen.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Konnektivität priorisieren",
        summary: "−1 Energie, Cloud läuft normal",
        effects: { spend: { energy: 1 } }
      },
      {
        id: "b",
        label: "Nichts tun",
        summary: "Cloud-Geräte: nur halber Effekt",
        effects: { cloudHalfEffect: true }
      }
    ]
  },
  {
    id: "local-hub-funding",
    title: "Förderprogramm für lokale Hubs",
    text: "Die Stadt fördert lokale Verarbeitung. Du kannst den Zuschuss annehmen oder dir Innovationspunkte sichern.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Annehmen",
        summary: "Nächster lokaler Bau: −1 Bauteile, +1 grüne Innovationskarte",
        effects: { localHardwareDiscount: true, greenInnovation: 1 }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "+1 Innovationspunkt",
        effects: { innovation: 1 }
      }
    ]
  },
  {
    id: "green-grant",
    title: "Grüne Innovationsförderung",
    text: "Ein Energie-Startup bietet eine offene Innovationskarte für nachhaltige Smart-City-Lösungen.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Karte annehmen",
        summary: "+1 grüne Innovationskarte",
        effects: { greenInnovation: 1 }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Effekt",
        effects: {}
      }
    ]
  },
  {
    id: "evasion-update",
    title: "Ausweichmanöver-Update",
    text: "Ein Fahrassistenz-Update zwingt zur Priorität: Insassen oder alle Verkehrsteilnehmer?",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Insassensicherheit priorisieren",
        summary: "+1 Effizienz, −1 Datenschutzbonus",
        effects: { efficiency: 1, privacy: -1 }
      },
      {
        id: "b",
        label: "Alle Verkehrsteilnehmer priorisieren",
        summary: "−1 Effizienz, +1 Datenschutzbonus",
        effects: { efficiency: -1, privacy: 1 }
      }
    ]
  },
  {
    id: "investor",
    title: "Investoren-Anfrage",
    text: "Ein Konzern bietet Ressourcen im Tausch gegen mehr Cloud-Abhängigkeit.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Annehmen",
        summary: "+2 einer Ressource, +2 Risiko",
        needsResourcePick: true,
        pickAmount: 2,
        effects: { risk: 2 }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Effekt",
        effects: {}
      }
    ]
  },
  {
    id: "maintenance",
    title: "Wartungsintervall",
    text: "Geplante Wartung steht an. Durchführen kostet Rechenleistung, Aufschieben erhöht das Risiko.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Durchführen",
        summary: "−1 Rechenleistung, −1 Risiko",
        effects: { spend: { compute: 1 }, risk: -1 }
      },
      {
        id: "b",
        label: "Aufschieben",
        summary: "+1 Risiko",
        effects: { risk: 1 }
      }
    ]
  }
];

Nexus.EVENTS_BY_ID = {};
Nexus.EVENTS.forEach(function (event) {
  Nexus.EVENTS_BY_ID[event.id] = event;
});
