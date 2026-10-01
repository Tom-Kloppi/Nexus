window.Nexus = window.Nexus || {};

(function (Nexus) {
  var ROLE_AVATAR = {
    climate: {
      skin: "#f0c8a0",
      hair: "#3a6b3a",
      shirt: "#3d9a5c",
      accent: "#8fd46a",
      accessory: "leaf"
    },
    privacy: {
      skin: "#e8c4a8",
      hair: "#2a2a32",
      shirt: "#4a5a78",
      accent: "#c8d4e8",
      accessory: "glasses"
    },
    investor: {
      skin: "#f2d2b0",
      hair: "#6a4830",
      shirt: "#c4902a",
      accent: "#f0d080",
      accessory: "tie"
    },
    visionary: {
      skin: "#ecc0a0",
      hair: "#5a3a68",
      shirt: "#6a4a98",
      accent: "#c8a0e8",
      accessory: "antenna"
    },
    networker: {
      skin: "#f0d0b0",
      hair: "#8a4030",
      shirt: "#3d8ea8",
      accent: "#7ec8e0",
      accessory: "headset"
    },
    controller: {
      skin: "#e8c8b0",
      hair: "#3a3a48",
      shirt: "#5a6270",
      accent: "#b0b8c8",
      accessory: "badge"
    }
  };

  function accessoryMarkup(kind, accent) {
    if (kind === "leaf") {
      return (
        '<ellipse cx="38" cy="18" rx="7" ry="4" fill="' +
        accent +
        '" transform="rotate(-35 38 18)"/>' +
        '<path d="M38 18 L38 28" stroke="' +
        accent +
        '" stroke-width="1.5"/>'
      );
    }
    if (kind === "glasses") {
      return (
        '<circle cx="20" cy="26" r="4.5" fill="none" stroke="' +
        accent +
        '" stroke-width="1.6"/>' +
        '<circle cx="30" cy="26" r="4.5" fill="none" stroke="' +
        accent +
        '" stroke-width="1.6"/>' +
        '<path d="M24.5 26h1" stroke="' +
        accent +
        '" stroke-width="1.6"/>'
      );
    }
    if (kind === "tie") {
      return '<path d="M24 40 L28 40 L26 52 Z" fill="' + accent + '"/>';
    }
    if (kind === "antenna") {
      return (
        '<path d="M26 8 L26 14" stroke="' +
        accent +
        '" stroke-width="1.6"/>' +
        '<circle cx="26" cy="7" r="2.2" fill="' +
        accent +
        '"/>'
      );
    }
    if (kind === "headset") {
      return (
        '<path d="M14 28 a12 12 0 0 1 24 0" fill="none" stroke="' +
        accent +
        '" stroke-width="2"/>' +
        '<rect x="12" y="28" width="4" height="8" rx="1" fill="' +
        accent +
        '"/>' +
        '<rect x="36" y="28" width="4" height="8" rx="1" fill="' +
        accent +
        '"/>'
      );
    }
    if (kind === "badge") {
      return (
        '<circle cx="34" cy="44" r="4" fill="' +
        accent +
        '"/>' +
        '<circle cx="34" cy="44" r="2" fill="#fff"/>'
      );
    }
    return "";
  }

  Nexus.roleAvatarSvg = function (roleId, size) {
    var conf = ROLE_AVATAR[roleId] || ROLE_AVATAR.controller;
    var s = size || 48;
    return (
      '<svg class="role-avatar-svg" viewBox="0 0 52 56" width="' +
      s +
      '" height="' +
      Math.round(s * 1.08) +
      '" aria-hidden="true">' +
      '<circle cx="26" cy="26" r="24" fill="' +
      conf.accent +
      '" opacity="0.35"/>' +
      '<ellipse cx="26" cy="48" rx="16" ry="10" fill="' +
      conf.shirt +
      '"/>' +
      '<circle cx="26" cy="24" r="12" fill="' +
      conf.skin +
      '"/>' +
      '<path d="M12 22 Q26 6 40 22 Q34 14 26 14 Q18 14 12 22Z" fill="' +
      conf.hair +
      '"/>' +
      accessoryMarkup(conf.accessory, conf.accent) +
      "</svg>"
    );
  };

  Nexus.ROLE_AVATAR = ROLE_AVATAR;

  /* Einheitliche Terminologie für Ziele / Spuren */
  Nexus.GOAL_GLOSSARY = {
    spur: {
      title: "Spur",
      text: "Eine von vier öffentlichen Stadtspuren: Image, Komfort, Umwelt, Sicherheit. Werte steigen durch Bauen, Karten und Ereignisse."
    },
    stufe: {
      title: "Stufe",
      text: "Jedes Unterziel hat bis zu 5 Stufen. Erreichst du den Schwellenwert einer Stufe, zählt der zugehörige Prozentanteil."
    },
    prozent: {
      title: "Prozent",
      text: "Dein Wahlversprechen-Fortschritt (0–100 %). Summe der Beiträge aller Unterziele. Bei ≥ 100 % nach einer vollen Runde gewinnst du."
    },
    unterziel: {
      title: "Unterziel",
      text: "Privater Baustein deines Versprechens. Misst eine Spur oder eine abgeleitete Metrik (z. B. lokaler Geräteanteil)."
    },
    sieg: {
      title: "Sieg",
      text: "Sofortsieg bei ≥ 100 % nach einer vollen Runde, sonst höchster Prozentstand am Rundenende."
    }
  };

  Nexus.ROLE_DOSSIERS = {
    climate: {
      blurb: "Macht die Stadt grüner und sichtbarer nachhaltig.",
      strength: "Umwelt- und Image-Spuren, grüne Karten",
      special: "Belohnt Solar, Parks und grüne Innovationen"
    },
    privacy: {
      blurb: "Schützt Daten und hält das Risiko niedrig.",
      strength: "Sicherheits-Spur, lokale Geräte",
      special: "Lokale Verarbeitung und geringes Risiko zahlen sich aus"
    },
    investor: {
      blurb: "Maximaler Geldfluss und wirtschaftliches Image.",
      strength: "Geld-Durchsatz, Image",
      special: "Handel und Erträge füllen die Kasse"
    },
    visionary: {
      blurb: "Mobilität und SAE-Ausbau stehen im Mittelpunkt.",
      strength: "Komfort, Verkehr, SAE",
      special: "V2X, Ladenetz und SAE-Stufen"
    },
    networker: {
      blurb: "Vernetzt Spieler und Standards.",
      strength: "Handelspartner, offene Standards",
      special: "Offene Standards und viele Partner"
    },
    controller: {
      blurb: "Kontrolliert Flächen und zentrale Infrastruktur.",
      strength: "Feldkontrolle, Datenzentren",
      special: "Viele eigene Felder und sichere Rechenzentren"
    }
  };

  function clarifySubGoalLabel(raw) {
    if (!raw) {
      return "";
    }
    return String(raw)
      .replace(/\(Fahrradstadt, Solarpflicht, Begrünung, Öffis\)/g, "")
      .replace(/\(sichtbare Begrünung \/ Öffis\)/g, "")
      .replace(/\(Cyberabwehr\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  Nexus.clarifySubGoalLabel = clarifySubGoalLabel;

  Nexus.subGoalExplain = function (goal) {
    if (!goal) {
      return "";
    }
    var dir = goal.higherIsBetter === false ? "Niedriger Wert ist besser." : "Höherer Wert ist besser.";
    var max = goal.maxContribution != null ? " Bis zu " + goal.maxContribution + " % am Versprechen." : "";
    return dir + max + " Stufen schalten Prozentanteile frei, sobald die Metrik den Schwellenwert erreicht.";
  };
})(window.Nexus);
