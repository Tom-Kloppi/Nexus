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

  var ROLE_PORTRAIT = {
    climate: "assets/portraits/mira.webp",
    privacy: "assets/portraits/isabella.webp",
    investor: "assets/portraits/maria.webp",
    visionary: "assets/portraits/juergen.webp",
    networker: "assets/portraits/thomas.webp",
    controller: "assets/portraits/heinz.webp"
  };

  Nexus.roleAvatarSvg = function (roleId, size) {
    var src = ROLE_PORTRAIT[roleId] || ROLE_PORTRAIT.climate;
    var s = size || 48;
    return (
      '<img class="role-avatar-svg" src="' +
      src +
      '" width="' +
      s +
      '" height="' +
      s +
      '" alt="" />'
    );
  };

  Nexus.ROLE_AVATAR = ROLE_AVATAR;

  /* Einheitliche Terminologie für Ziele / Spuren */
  Nexus.GOAL_GLOSSARY = {
    spur: {
      title: "Spur",
      text: "Image, Komfort, Umwelt oder Sicherheit. Die Zahl steht an der Person, die sie bekommt."
    },
    stufe: {
      title: "Ziel",
      text: "Haben / brauchen. Jeder Schritt zählt die Zahl auf der Karte. Zehn Punkte gewinnen."
    },
    prozent: {
      title: "Stand",
      text: "Punkte / 10. Zehn Punkte sind der Sieg nach einer vollen Runde, sonst die meisten Punkte."
    },
    unterziel: {
      title: "Rechnung",
      text: "Eine Spur oder eine Tat. Du siehst, wie viel du hast und wie viel fehlt."
    },
    sieg: {
      title: "Sieg",
      text: "Zehn Punkte nach einer vollen Runde, sonst die meisten Punkte am Ende."
    }
  };

  Nexus.ROLE_DOSSIERS = {
    climate: {
      blurb: "Solar ernten und eine Linie ohne Diesel fahren.",
      strength: "Umwelt 6, Öko-Halte 2",
      special: "Jeder Solar-Zug gibt 1 Umwelt"
    },
    privacy: {
      blurb: "Rechnen vor Ort, nicht in der Wolke.",
      strength: "3 lokale Geräte, 2 sichere Rechenzentren",
      special: "Lokal zählt 2, die Wolke zählt nicht"
    },
    investor: {
      blurb: "Tauschen, was die anderen brauchen.",
      strength: "Handel 8, Komfort 2",
      special: "Die Menge im Handel ist der Punkt"
    },
    visionary: {
      blurb: "Assistenz an der Linie, Komfort in der Stadt.",
      strength: "Assistenz 3, Komfort 4",
      special: "Die Zahl steht an der Linie"
    },
    networker: {
      blurb: "Fremde Halte anbinden und handeln.",
      strength: "Image 5, Handel 5",
      special: "Ein fremder Halt gibt Image"
    },
    controller: {
      blurb: "Parken und Linien, die den Alltag leicht machen.",
      strength: "Komfort 6, Parken 2",
      special: "Parkhaus zählt 2"
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
    return (goal.label || "Ziel") + ": du hast die Zahl, du brauchst " + (goal.need || "?") + ", jeder Schritt zählt " + (goal.worth || 1) + ".";
  };
})(window.Nexus);
