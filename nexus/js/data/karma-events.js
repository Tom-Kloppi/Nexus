window.Nexus = window.Nexus || {};

/* Karma-Events zu Zugbeginn: Charakter-Pools + generisch. Keine Regeln. */
(function (Nexus) {
  function choice(id, label, summary, effects) {
    return { id: id, label: label, summary: summary, effects: effects || {} };
  }

  function evt(def) {
    return Object.assign(
      {
        auto: false,
        major: false,
        source: "karma",
        resumePhase: "produce"
      },
      def
    );
  }

  /* polarity: "good" | "bad" — Pool je nach Karma-Vorzeichen */
  Nexus.KARMA_GENERIC_EVENTS = [
    evt({
      id: "karma-weather-good",
      polarity: "good",
      title: "Sonniges Bürgerwetter",
      text: "Die Stadt ist gut gelaunt. Spende oder nimm den Image-Schub.",
      choices: [
        choice("a", "Kleine Spende", "−1 Geld, Karma +1", { spend: { money: 1 }, karma: 1 }),
        choice("b", "Applaus mitnehmen", "+1 Geld", { money: 1 })
      ]
    }),
    evt({
      id: "karma-assembly-good",
      polarity: "good",
      title: "Bürgerversammlung",
      text: "Offene Ohren im Saal. Du kannst Ressourcen teilen oder behalten.",
      choices: [
        choice("a", "Zuhören & helfen", "−1 Energie, Karma +1", { spend: { energy: 1 }, karma: 1 }),
        choice("b", "Kurz erscheinen", "+1 Daten", { bandwidth: 1 })
      ]
    }),
    evt({
      id: "karma-supply-bad",
      polarity: "bad",
      title: "Lieferengpass",
      text: "Knappheit im Netz. Du kannst nachlegen oder den Engpass aussitzen.",
      choices: [
        choice("a", "Notreserve freigeben", "−1 Geld −1 Energie", { spend: { money: 1, energy: 1 } }),
        choice("b", "Aussitzen", "Karma −1", { karma: -1 })
      ]
    }),
    evt({
      id: "karma-scandal-rumor",
      polarity: "bad",
      title: "Gerüchteküche",
      text: "Halbwahrheiten kursieren. Klarstellen kostet, Schweigen schadet dem Karma.",
      choices: [
        choice("a", "Klarstellen", "−2 Daten", { spend: { bandwidth: 2 } }),
        choice("b", "Ignorieren", "Karma −1", { karma: -1 })
      ]
    })
  ];

  Nexus.KARMA_CHARACTER_EVENTS = {
    climate: [
      evt({
        id: "mira-wind-funding",
        polarity: "good",
        title: "Fördergeld Wind",
        text: "Ein Zuschuss für Öko-Projekte steht bereit.",
        choices: [
          choice("a", "Annehmen", "+2 Energie, Karma +1", { energy: 2, karma: 1 }),
          choice("b", "Ablehnen zugunsten Reserve", "+1 Geld", { money: 1 })
        ]
      }),
      evt({
        id: "mira-coal-protest",
        polarity: "bad",
        title: "Protest gegen Kohle",
        text: "Demonstrationen vor dem Rathaus.",
        choices: [
          choice("a", "Zugeständnis", "−1 Geld, Karma +1", { spend: { money: 1 }, karma: 1 }),
          choice("b", "Aussitzen", "Karma −2", { karma: -2 })
        ]
      }),
      evt({
        id: "mira-park",
        polarity: "good",
        title: "Park-Initiative",
        text: "Bürger wollen Grünflächen.",
        choices: [
          choice("a", "Unterstützen", "−1 Energie, Karma +1", { spend: { energy: 1 }, karma: 1 }),
          choice("b", "Verschieben", "+1 Daten", { bandwidth: 1 })
        ]
      })
    ],
    privacy: [
      evt({
        id: "isa-audit",
        polarity: "good",
        title: "Sicherheitsaudit",
        text: "Ein Audit stärkt Vertrauen.",
        choices: [
          choice("a", "Audit zahlen", "−1 Daten, Karma +1", { spend: { bandwidth: 1 }, karma: 1 }),
          choice("b", "Intern prüfen", "+1 Geld", { money: 1 })
        ]
      }),
      evt({
        id: "isa-leak-guard",
        polarity: "bad",
        title: "Leak-Abwehr",
        text: "Verdächtige Zugriffe. Patchen oder hoffen?",
        choices: [
          choice("a", "Sofort patchen", "−2 Daten", { spend: { bandwidth: 2 } }),
          choice("b", "Risiko eingehen", "Karma −2", { karma: -2 })
        ]
      }),
      evt({
        id: "isa-admin-reform",
        polarity: "good",
        title: "Verwaltungs-Reform",
        text: "Effizienzprogramm in der Verwaltung.",
        choices: [
          choice("a", "Reform anstoßen", "−1 Geld, Karma +1", { spend: { money: 1 }, karma: 1 }),
          choice("b", "Status quo", "+1 Energie", { energy: 1 })
        ]
      })
    ],
    investor: [
      evt({
        id: "maria-pitch",
        polarity: "good",
        title: "Investorenpitch",
        text: "Kapital sucht Projekte.",
        choices: [
          choice("a", "Pitch halten", "+3 Geld", { money: 3 }),
          choice("b", "Konditionen ablehnen", "Karma +1", { karma: 1 })
        ]
      }),
      evt({
        id: "maria-tax",
        polarity: "bad",
        title: "Steuerdeal",
        text: "Ein zwielichtiger Deal liegt auf dem Tisch.",
        choices: [
          choice("a", "Annehmen", "+2 Geld, Karma −2", { money: 2, karma: -2 }),
          choice("b", "Ablehnen", "−1 Geld", { spend: { money: 1 } })
        ]
      }),
      evt({
        id: "maria-contract",
        polarity: "good",
        title: "Großauftrag",
        text: "Ein Auftrag bringt Liquidität.",
        choices: [
          choice("a", "Annehmen", "+2 Geld −1 Daten", { money: 2, spend: { bandwidth: 1 } }),
          choice("b", "Delegieren", "+1 Energie", { energy: 1 })
        ]
      })
    ],
    visionary: [
      evt({
        id: "juergen-demo",
        polarity: "good",
        title: "Tech-Demo",
        text: "Presse und Fachpublikum sind da.",
        choices: [
          choice("a", "Demo fahren", "−1 Energie +2 Daten", { spend: { energy: 1 }, bandwidth: 2 }),
          choice("b", "Absagen", "Karma +1", { karma: 1 })
        ]
      }),
      evt({
        id: "juergen-moratorium",
        polarity: "bad",
        title: "Atom-Moratorium",
        text: "Druck gegen Hochrisiko-Strom.",
        choices: [
          choice("a", "Zugestehen", "−1 Energie, Karma +1", { spend: { energy: 1 }, karma: 1 }),
          choice("b", "Kontern", "Karma −2", { karma: -2 })
        ]
      }),
      evt({
        id: "juergen-factory",
        polarity: "good",
        title: "Fabrik-Automatisierung",
        text: "Effizienzsteigerung möglich.",
        choices: [
          choice("a", "Investieren", "−2 Geld +1 Energie", { spend: { money: 2 }, energy: 1 }),
          choice("b", "Später", "+1 Daten", { bandwidth: 1 })
        ]
      })
    ],
    networker: [
      evt({
        id: "thomas-press",
        polarity: "good",
        title: "Presse-Tour",
        text: "Kameras begleiten dich durch den Distrikt.",
        choices: [
          choice("a", "Tour machen", "−1 Geld, Karma +1", { spend: { money: 1 }, karma: 1 }),
          choice("b", "Kurzstatement", "+1 Daten", { bandwidth: 1 })
        ]
      }),
      evt({
        id: "thomas-fest",
        polarity: "good",
        title: "Nachbarschaftsfest",
        text: "Ein Fest stärkt das Image.",
        choices: [
          choice("a", "Fest finanzieren", "−2 Geld, Karma +1", { spend: { money: 2 }, karma: 1 }),
          choice("b", "Nur erscheinen", "+1 Energie", { energy: 1 })
        ]
      }),
      evt({
        id: "thomas-wohn",
        polarity: "bad",
        title: "Wohnkampagne unter Druck",
        text: "Kritik an Wohnpolitik.",
        choices: [
          choice("a", "Kampagne nachschärfen", "−1 Daten −1 Geld", { spend: { bandwidth: 1, money: 1 } }),
          choice("b", "Ignorieren", "Karma −1", { karma: -1 })
        ]
      })
    ],
    controller: [
      evt({
        id: "heinz-commute",
        polarity: "good",
        title: "Pendler-Petition",
        text: "Komfort im Alltag gefordert.",
        choices: [
          choice("a", "Entgegenkommen", "−1 Geld, Karma +1", { spend: { money: 1 }, karma: 1 }),
          choice("b", "Prüfen lassen", "+1 Energie", { energy: 1 })
        ]
      }),
      evt({
        id: "heinz-solar",
        polarity: "good",
        title: "Solar auf Dächern",
        text: "Förderung für Dachflächen.",
        choices: [
          choice("a", "Fördern", "−1 Geld +1 Energie", { spend: { money: 1 }, energy: 1 }),
          choice("b", "Ablehnen", "Karma +1", { karma: 1 })
        ]
      }),
      evt({
        id: "heinz-taxi",
        polarity: "bad",
        title: "Taxi-Konzession",
        text: "Streit um Konzessionen.",
        choices: [
          choice("a", "Regeln verschärfen", "−1 Daten", { spend: { bandwidth: 1 } }),
          choice("b", "Lobby nachgeben", "+1 Geld, Karma −2", { money: 1, karma: -2 })
        ]
      })
    ]
  };

  Nexus.KARMA_EXTREME_GOOD = evt({
    id: "karma-extreme-good",
    polarity: "good",
    extreme: true,
    auto: true,
    title: "Stadtweite Anerkennung",
    text: "Dein Ansehen bringt eine große Ressourcenspende.",
    choices: [
      choice("ok", "Annehmen", "+4 Energie +4 Geld +4 Daten", {
        energy: 4,
        money: 4,
        bandwidth: 4
      })
    ]
  });

  Nexus.KARMA_EXTREME_BAD = evt({
    id: "karma-extreme-bad",
    polarity: "bad",
    extreme: true,
    auto: true,
    title: "Leak / Erpressung",
    text: "Ein Leak droht. Bei Siegnähe werden Punkte auf 9 gedrückt; solange Karma −5 gilt Anzeige-Malus.",
    choices: [
      choice("ok", "Zur Kenntnis", "Blackmail falls ≥10 SP; Anzeige −1 solange Karma −5", {
        blackmail: true
      })
    ]
  });

  Nexus.KARMA_EVENT_CHANCE = {
    0: 0,
    1: 0,
    2: 0.25,
    3: 0.5,
    4: 1,
    5: 1
  };
})(window.Nexus);
