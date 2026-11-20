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
        summary: "−1 Bandbreite, −1 Risiko, +1 Sicherheit",
        effects: { spend: { bandwidth: 1 }, risk: -1, security: 1 }
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
        summary: "−2 Bandbreite, −3 Risiko, −1 Image",
        effects: { spend: { bandwidth: 2 }, risk: -3, image: -1 }
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
        label: "Bandbreite priorisieren",
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
    text: "Die Stadt fördert lokale Verarbeitung. Du kannst den Zuschuss annehmen oder eine Innovationskarte ziehen.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Annehmen",
        summary: "Nächster lokaler Bau: −1 Geld, +1 grüne Innovationskarte",
        effects: { localMoneyDiscount: true, greenInnovation: 1 }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "+1 Innovationskarte",
        effects: { innovationCard: 1 }
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
        summary: "+1 Umwelt, +1 Risiko, +1 Komfort",
        effects: { environment: 1, risk: 1, comfort: 1 }
      },
      {
        id: "b",
        label: "Alle Verkehrsteilnehmer priorisieren",
        summary: "−1 Umwelt, −1 Risiko, +1 Image",
        effects: { environment: -1, risk: -1, image: 1 }
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
    text: "Geplante Wartung steht an. Durchführen kostet Energie, Aufschieben erhöht das Risiko.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Durchführen",
        summary: "−1 Energie, −1 Risiko",
        effects: { spend: { energy: 1 }, risk: -1 }
      },
      {
        id: "b",
        label: "Aufschieben",
        summary: "+1 Risiko",
        effects: { risk: 1 }
      }
    ]
  },
  {
    id: "overproduction",
    title: "Überproduktion",
    text: "Ein Boom im Netz setzt Kapazität frei. Du kannst eine Innovationskarte ziehen oder die Energie puffern.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Innovation nutzen",
        summary: "+1 Innovationskarte",
        effects: { innovationCard: 1 }
      },
      {
        id: "b",
        label: "Energie puffern",
        summary: "+2 Energie",
        effects: { energy: 2 }
      }
    ]
  },
  {
    id: "civic-hearing",
    title: "Bürgeranhörung",
    text: "Das Quartier diskutiert Transparenz. Offene Daten oder geschützte Profile?",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Daten offenlegen",
        summary: "+1 Bandbreite, +1 Risiko, +1 Image",
        effects: { bandwidth: 1, risk: 1, image: 1 }
      },
      {
        id: "b",
        label: "Profile schützen",
        summary: "−1 Risiko, +1 Sicherheit",
        effects: { risk: -1, security: 1 }
      }
    ]
  },
    {
    id: "major-blackout",
    title: "Großereignis: Netzblackout",
    text: "Die Last übersteigt die stabile Erzeugung. Cloud-Geräte stehen. Lokale Geräte laufen weiter.",
    cause: "Netzstress: Bedarf lag über Solar, Transformator und Speicher.",
    counter: "Mehr Solar, ein Batteriespeicher oder weniger Cloud-Last. Lokale Geräte wären weitergelaufen.",
    family: "grid",
    major: true,
    auto: true,
    requiresCloudCamera: false,
    choices: [
      {
        id: "ok",
        label: "Ausfall hinnehmen",
        summary: "Cloud-Effekte diese Runde aus",
        effects: { cloudDisabled: true }
      }
    ]
  },
  {
    id: "major-breach",
    title: "Großereignis: Datenabfluss",
    text: "Viele Cloud-Geräte ohne lokale Absicherung. Ein Abfluss trifft das Quartier.",
    cause: "Cyber-Exposition aus Cloud-Geräten und offenen Rechenzentren.",
    counter: "Geräte lokal stellen und das Rechenzentrum schließen.",
    family: "cyber",
    major: true,
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Offenlegen und abdichten",
        summary: "−2 Bandbreite, −2 Schock, +1 Sicherheit",
        effects: { spend: { bandwidth: 2 }, risk: -2, security: 1 }
      },
      {
        id: "b",
        label: "Aussitzen",
        summary: "+2 Schock",
        effects: { risk: 2 }
      }
    ]
  },
  {
    id: "major-jam",
    title: "Großereignis: Verkehrskollaps",
    text: "Parken ohne Linien legt die Ringe lahm. Angebundene Halte bleiben nutzbar.",
    cause: "Verkehrslast: Flächen ohne Haltestelle und ohne elektrischen Bus.",
    counter: "Busbahnhof, Haltestellen und eine Linie. Parkhaus mit Ladesäule nimmt Fläche aus dem Stau.",
    family: "traffic",
    major: true,
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Notlinien finanzieren",
        summary: "−2 Geld, +1 Image",
        effects: { spend: { money: 2 }, image: 1 }
      },
      {
        id: "b",
        label: "Stau aussitzen",
        summary: "−1 Komfort",
        effects: { comfort: -1 }
      }
    ]
  },
  {
    id: "standard-split",
    title: "Protokoll-Zoff",
    text: "Zwei Hersteller streiten ums Home-Board. Offen hält Partner, proprietär bringt Geld und Risiko.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Offen bleiben",
        summary: "+1 Bandbreite",
        effects: { bandwidth: 1 }
      },
      {
        id: "b",
        label: "Proprietär bleiben",
        summary: "+1 Geld, +1 Risiko",
        effects: { money: 1, risk: 1 }
      }
    ]
  },
  {
    id: "role-eco-rain",
    title: "Regen-Dilemma (Öko)",
    text: "Nasser Morgen. Auto wäre bequem, Rad und Bus sind sauberer. Kleine Entscheidung, sichtbare Ökopunkte.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Rad / ÖPNV",
        summary: "+1 Ökopunkt",
        effects: { pointKey: "eco", rolePoints: 1, environment: 1 }
      },
      {
        id: "b",
        label: "Auto nehmen",
        summary: "−1 Ökopunkt",
        effects: { pointKey: "eco", rolePoints: -1 }
      }
    ]
  },
  {
    id: "role-trust-patch",
    title: "Hacker-Alarm",
    text: "Ein Scan zeigt Lücken. Sofort patchen kostet Bandbreite und stärkt Verlässlichkeit.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Sofort härten",
        summary: "−1 Bandbreite, +1 Verlässlichkeit",
        effects: { spend: { bandwidth: 1 }, pointKey: "trust", rolePoints: 1, security: 1 }
      },
      {
        id: "b",
        label: "Später",
        summary: "−1 Verlässlichkeit, +1 Risiko",
        effects: { pointKey: "trust", rolePoints: -1, risk: 1 }
      }
    ]
  },
  {
    id: "role-finance-boom",
    title: "Handelstag",
    text: "Die Marktlage ist günstig. Wer handelt, sichert Finanzpunkte — ohne Würfelglück.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Aktiv handeln",
        summary: "+1 Finanzpunkt (wenn Dealmacherin)",
        effects: { pointKey: "finance", rolePoints: 1, money: 1 }
      },
      {
        id: "b",
        label: "Abwarten",
        summary: "Kein Effekt",
        effects: {}
      }
    ]
  },
  {
    id: "role-innovation-demo",
    title: "Technik-Demo",
    text: "Die Presse will eine Zukunftsidee sehen. Linie oder Projekt zeigen = Innovationspunkt.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Demo starten",
        summary: "−1 Geld, +1 Innovation",
        effects: { spend: { money: 1 }, pointKey: "innovation", rolePoints: 1 }
      },
      {
        id: "b",
        label: "Absagen",
        summary: "−1 Image",
        effects: { image: -1 }
      }
    ]
  },
  {
    id: "role-image-hearing",
    title: "Bürgerversammlung",
    text: "Minderheiten wollen gehört werden. Zuhören stärkt Imagepunkte.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Zuhören und einbinden",
        summary: "+1 Imagepunkt",
        effects: { pointKey: "image", rolePoints: 1, image: 1 }
      },
      {
        id: "b",
        label: "Übergehen",
        summary: "−1 Imagepunkt",
        effects: { pointKey: "image", rolePoints: -1 }
      }
    ]
  },
  {
    id: "role-comfort-lanes",
    title: "Spurstreit",
    text: "Busspur oder mehr Parkraum? Komfort hängt davon ab, wen du bevorzugst.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Parkraum erweitern",
        summary: "+1 Komfortpunkt",
        effects: { pointKey: "comfort", rolePoints: 1, comfort: 1 }
      },
      {
        id: "b",
        label: "Busspur schützen",
        summary: "+1 Umwelt, −1 Komfortpunkt",
        effects: { environment: 1, pointKey: "comfort", rolePoints: -1 }
      }
    ]
  },
  {
    id: "skandal",
    title: "Skandal-Schlagzeile",
    text: "Die Lokalpresse wittert Blut. Du kannst eine Gegenkandidatin anprangern — höchstens ein Rollenpunktverlust pro Person und Tag. So etwas bringt dich nicht auf 10.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Anprangern",
        summary: "−1 Bandbreite; Ziel −1 Rollenpunkt",
        needsPlayerPick: true,
        effects: { spend: { bandwidth: 1 }, contestStripTarget: 1 }
      },
      {
        id: "b",
        label: "Schweigen",
        summary: "Kein Effekt",
        effects: {}
      }
    ]
  },
  {
    id: "presse-deal",
    title: "Presse-Deal",
    text: "Ein Blatt bietet dir eine Story: Du opferst einen eigenen Rollenpunkt, eine andere Person verliert einen. Teuer, kein Siegpunkt daraus.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Deal machen",
        summary: "−1 eigener Punkt, Ziel −1 Punkt, −1 Geld",
        needsPlayerPick: true,
        effects: { spend: { money: 1 }, spendOwnRolePoints: 1, contestStripTarget: 1 }
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
    id: "field-sabotage",
    title: "Baustellen-Blockade",
    text: "Irgendwo im Distrikt hängt eine Lieferung. Ein zufälliges fremdes Feld liefert den nächsten Tag nichts — kein Abriss, nur Pause.",
    auto: false,
    requiresCloudCamera: false,
    choices: [
      {
        id: "a",
        label: "Blockade ausnutzen",
        summary: "Zufälliges Fremdfeld gestört",
        effects: { sabotageForeign: true }
      },
      {
        id: "b",
        label: "Ignorieren",
        summary: "Kein Effekt",
        effects: {}
      }
    ]
  },
  {
    id: "buergerprotest",
    title: "Bürgerprotest",
    text: "Die Straße ist voll. Unausweichlich: jede Figur verliert einen Rollenpunkt. Zusätzlich gerät die Führende unter Extra-Druck, das Schlusslicht verliert Energie.",
    auto: true,
    requiresCloudCamera: false,
    choices: [
      {
        id: "ok",
        label: "Aushalten",
        summary: "Alle −1 Punkt; Führende nochmals −1; Schlusslicht −1 Energie",
        effects: { protestSweep: true }
      }
    ]
  },
  {
    id: "lobby-solar",
    title: "Solar-Lobby",
    text: "Ein Energieverband winkt mit Förderung — geheim, nur für dich. Drei neue Solarfelder in drei Tagen, dann fließt die Prämie. Schon ein Deal aktiv? Dann gibt’s dieses Angebot nicht.",
    auto: false,
    requiresCloudCamera: false,
    sideDealOnly: true,
    choices: [
      {
        id: "a",
        label: "Deal annehmen",
        summary: "3× Solar in 3 Tagen → Ressourcen +1 Rollenpunkt",
        effects: { acceptSideDeal: "lobby-solar" }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Deal",
        effects: {}
      }
    ]
  },
  {
    id: "lobby-trade",
    title: "Makler-Tipp",
    text: "Ein Zwischenhändler will Bewegung sehen. Schließe innerhalb von zwei Tagen einen Handel ab — die Prämie ist privat. Handel allein gibt sonst keine Siegpunkte.",
    auto: false,
    requiresCloudCamera: false,
    sideDealOnly: true,
    choices: [
      {
        id: "a",
        label: "Tipp annehmen",
        summary: "1× Handel in 2 Tagen → Geld +1 Rollenpunkt",
        effects: { acceptSideDeal: "lobby-trade" }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Deal",
        effects: {}
      }
    ]
  },
  {
    id: "lobby-upgrade",
    title: "Bauausschuss",
    text: "Der Ausschuss will sichtbare Verdichtung. Zwei Ausbauten in drei Tagen — geheim belohnt. Scheiterst du, knallt es am eigenen Stand.",
    auto: false,
    requiresCloudCamera: false,
    sideDealOnly: true,
    choices: [
      {
        id: "a",
        label: "Auftrag annehmen",
        summary: "2× Ausbau in 3 Tagen → Bandbreite +1 Rollenpunkt",
        effects: { acceptSideDeal: "lobby-upgrade" }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Deal",
        effects: {}
      }
    ]
  },
  {
    id: "lobby-housing",
    title: "Wohnungsinitiative",
    text: "Eine Bürgerinitiative will Quartiere. Zwei neue Wohnfelder in drei Tagen — privat. Erfolg füllt die Kasse und den Stand.",
    auto: false,
    requiresCloudCamera: false,
    sideDealOnly: true,
    choices: [
      {
        id: "a",
        label: "Initiative stützen",
        summary: "2× Wohnen in 3 Tagen → Bandbreite +1 Rollenpunkt",
        effects: { acceptSideDeal: "lobby-housing" }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Deal",
        effects: {}
      }
    ]
  },
  {
    id: "lobby-line",
    title: "Elektro-Sponsor",
    text: "Ein Sponsor will eine Elektro-Linie im Distrikt. Eine in drei Tagen — und du darfst damit sogar auf 10 Punkte kommen.",
    auto: false,
    requiresCloudCamera: false,
    sideDealOnly: true,
    choices: [
      {
        id: "a",
        label: "Sponsoring annehmen",
        summary: "1× Elektro-Linie in 3 Tagen → Image-Ressourcen +1 Rollenpunkt",
        effects: { acceptSideDeal: "lobby-line" }
      },
      {
        id: "b",
        label: "Ablehnen",
        summary: "Kein Deal",
        effects: {}
      }
    ]
  }
];

Nexus.SIDE_DEALS = {
  "lobby-solar": {
    id: "lobby-solar",
    title: "Solar-Lobby",
    days: 3,
    need: 3,
    track: "buildSolar",
    rewardResources: { energy: 3, money: 2 },
    rewardRolePoints: 1,
    failRolePoints: 1
  },
  "lobby-trade": {
    id: "lobby-trade",
    title: "Makler-Tipp",
    days: 2,
    need: 1,
    track: "trade",
    rewardResources: { money: 3 },
    rewardRolePoints: 1,
    failRolePoints: 1,
    failResources: { money: 1 }
  },
  "lobby-upgrade": {
    id: "lobby-upgrade",
    title: "Bauausschuss",
    days: 3,
    need: 2,
    track: "upgrade",
    rewardResources: { bandwidth: 2, money: 1 },
    rewardRolePoints: 1,
    failRolePoints: 1
  },
  "lobby-housing": {
    id: "lobby-housing",
    title: "Wohnungsinitiative",
    days: 3,
    need: 2,
    track: "buildResidential",
    rewardResources: { bandwidth: 3 },
    rewardRolePoints: 1,
    failRolePoints: 1
  },
  "lobby-line": {
    id: "lobby-line",
    title: "Elektro-Sponsor",
    days: 3,
    need: 1,
    track: "lineElectric",
    rewardResources: { energy: 1, money: 2 },
    rewardRolePoints: 1,
    failRolePoints: 1
  }
};

Nexus.EVENT_DECK_SPEC = [
  { id: "software-update", count: 2 },
  { id: "power-outage", count: 2 },
  { id: "data-leak", count: 1 },
  { id: "bandwidth", count: 2 },
  { id: "local-hub-funding", count: 1 },
  { id: "green-grant", count: 1 },
  { id: "evasion-update", count: 1 },
  { id: "investor", count: 1 },
  { id: "maintenance", count: 2 },
  { id: "overproduction", count: 1 },
  { id: "civic-hearing", count: 1 },
  { id: "standard-split", count: 1 },
  { id: "role-eco-rain", count: 2 },
  { id: "role-trust-patch", count: 2 },
  { id: "role-finance-boom", count: 2 },
  { id: "role-innovation-demo", count: 2 },
  { id: "role-image-hearing", count: 2 },
  { id: "role-comfort-lanes", count: 2 },
  { id: "skandal", count: 2 },
  { id: "presse-deal", count: 2 },
  { id: "field-sabotage", count: 3 },
  { id: "buergerprotest", count: 2 },
  { id: "lobby-solar", count: 2 },
  { id: "lobby-trade", count: 2 },
  { id: "lobby-upgrade", count: 2 },
  { id: "lobby-housing", count: 2 },
  { id: "lobby-line", count: 1 }
];

Nexus.EVENT_LESSONS = {
  "software-update": "Sofort patchen kostet Bandbreite, Warten lässt das Risiko im Netz.",
  "power-outage": "Cloud fällt mit dem Netz aus, lokal bleibt der Betrieb stehen.",
  "data-leak": "Offenlegen schützt Vertrauen, Vertuschen spart Kosten und erhöht das Risiko.",
  bandwidth: "Priorität hält Cloud am Laufen, Drosseln schont Energie und bremst Dienste.",
  "local-hub-funding": "Förderung verbilligt lokale Technik, die Karte stärkt Innovation statt Betrieb.",
  "green-grant": "Eine grüne Karte verschiebt den Fortschritt, Ablehnen lässt die Chance liegen.",
  "evasion-update": "Insassenschutz und Rücksicht auf alle anderen lassen sich nicht gleichzeitig maximieren.",
  investor: "Fremdes Kapital bringt Ressourcen und mehr Abhängigkeit von der Cloud.",
  maintenance: "Wartung kostet Energie jetzt, Aufschieben wird später teurer im Risiko.",
  overproduction: "Überschuss kann Innovation oder Speicher füttern, nicht beides.",
  "civic-hearing": "Offene Daten bringen Image und Angriffsfläche, Schutz senkt das Risiko.",
  "major-blackout": "Ohne eigene Erzeugung und Speicher fällt die Cloud aus, lokale Geräte nicht.",
  "major-breach": "Viele Cloud-Geräte ohne lokale Sicherung machen einen Abfluss teuer.",
  "major-jam": "Parkfläche ohne Linie erzeugt Stau, ÖPNV nimmt Last aus den Ringen.",
  "standard-split": "Offen verbindet Partner, proprietär bringt Geld und schließt andere aus.",
  skandal: "Anprangern kostet Bandbreite und trifft nur einmal pro Tag. Der letzte Siegpunkt kommt nie aus Kontern.",
  "presse-deal": "Du zahlst mit dem eigenen Stand, um jemanden zurückzuwerfen — kein Abkürzungsweg zum Amt.",
  "field-sabotage": "Ein Tag ohne Ertrag trifft den Plan, zerstört aber keine Felder.",
  buergerprotest: "Protest trifft alle. Wer führt, spürt mehr Druck; wer hinten liegt, verliert Ressourcen.",
  "lobby-solar": "Hinterzimmer: drei Solar in drei Tagen. Erfolg darf siegen, Fail trifft privat.",
  "lobby-trade": "Handel allein gibt keine Siegpunkte — dieser Deal schon.",
  "lobby-upgrade": "Zwei Ausbauten unter der Frist, sonst knallt der eigene Stand.",
  "lobby-housing": "Zwei Wohnfelder für die Initiative — geheim belohnt.",
  "lobby-line": "Eine Elektro-Linie für den Sponsor. Deal-Punkte dürfen auf 10."
};

Nexus.EVENTS_BY_ID = {};
Nexus.EVENTS.forEach(function (event) {
  Nexus.EVENTS_BY_ID[event.id] = event;
});
