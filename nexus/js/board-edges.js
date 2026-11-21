window.Nexus = window.Nexus || {};

/* Hex-Kanten-Frame + Parkbuchten-Zuweisung. Kein DOM, kein Three, keine Spielregeln. */
(function (Nexus) {
  var DEFAULT_ROAD_W = 2.472;
  var PARALLEL_US = [0.24, 0.76];
  var PERP_SLOT_N = 4;
  /* Knapp hinter dem Bordstein — kein Graustreifen zwischen Straße und Bucht. */
  var PAD_INSET = 0.04;
  /*
   * Stall-Tiefe (Richtung Tile): >= Fahrzeuglänge (Van ~2.05) bzw. Breite (Parallel).
   * Zu flach = Autos stehen über die Markierung hinaus.
   */
  /* Van ~2.05 lang — 2.45 gibt Luft ohne die Feldmitte zu fressen. */
  var PARALLEL_PAD_W = 1.5;
  var PERP_PAD_W = 2.45;
  var EDGE_MARGIN = 0.08;

  /* Gleichmäßig über q/r/salt — alte XOR-Variante bevorzugte immer dieselbe Kante/Typ. */
  function hash01(q, r, salt) {
    var n = (q * 374761393 + r * 668265263 + (salt | 0) * 1274126177) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967296;
  }

  function edgeDirIndex(frame) {
    var ang = Math.atan2(frame.along.x, frame.along.z);
    var i = Math.round(ang / (Math.PI / 3));
    return ((i % 6) + 6) % 6;
  }

  function edgeIdOf(aKey, bKey) {
    return aKey < bKey ? aKey + "|" + bKey : bKey + "|" + aKey;
  }

  function sideKey(edgeId, fromKey, toKey) {
    return edgeId + "|" + fromKey + ">" + toKey;
  }

  function unit(dx, dz) {
    var len = Math.hypot(dx, dz) || 1;
    return { x: dx / len, z: dz / len, len: len };
  }

  /* Frame: along = Kante, out = von Straßenmitte ins Tile (Parkfläche außerhalb Fahrbahn). */
  function edgeFrame(fromNode, toNode, tileCenter) {
    if (!fromNode || !toNode || !tileCenter) {
      return null;
    }
    var along = unit(toNode.x - fromNode.x, toNode.z - fromNode.z);
    var mid = {
      x: (fromNode.x + toNode.x) * 0.5,
      z: (fromNode.z + toNode.z) * 0.5
    };
    var toTileX = tileCenter.x - mid.x;
    var toTileZ = tileCenter.z - mid.z;
    var rightX = -along.z;
    var rightZ = along.x;
    var fromKey = fromNode.key;
    var toKey = toNode.key;
    if (toTileX * rightX + toTileZ * rightZ < 0) {
      along = { x: -along.x, z: -along.z, len: along.len };
      rightX = -along.z;
      rightZ = along.x;
      fromKey = toNode.key;
      toKey = fromNode.key;
    }
    return {
      from: fromKey,
      to: toKey,
      fromNode: fromKey === fromNode.key ? fromNode : toNode,
      toNode: toKey === toNode.key ? toNode : fromNode,
      along: { x: along.x, z: along.z },
      out: { x: rightX, z: rightZ },
      mid: mid,
      len: along.len,
      edgeId: edgeIdOf(fromNode.key, toNode.key)
    };
  }

  function usableLen(frame) {
    return Math.max(0.8, frame.len * (1 - 2 * EDGE_MARGIN));
  }

  function roadYaw(frame) {
    return Math.atan2(frame.along.x, frame.along.z);
  }

  function outYaw(frame) {
    return Math.atan2(frame.out.x, frame.out.z);
  }

  function slotWorld(frame, slot) {
    var span = usableLen(frame);
    return {
      x: frame.mid.x + frame.along.x * (slot.u - 0.5) * span + frame.out.x * slot.depth,
      z: frame.mid.z + frame.along.z * (slot.u - 0.5) * span + frame.out.z * slot.depth,
      ang: slot.yaw,
      u: slot.u,
      depth: slot.depth,
      reverse: !!slot.reverse
    };
  }

  function makeSlots(kind, frame, q, r, roadW) {
    var slots = [];
    var baseDepth = roadW * 0.5 + PAD_INSET;
    var i;
    if (kind === "parallel") {
      var depth = baseDepth + PARALLEL_PAD_W * 0.5;
      var yaw = roadYaw(frame);
      for (i = 0; i < PARALLEL_US.length; i++) {
        slots.push({
          u: PARALLEL_US[i],
          depth: depth,
          yaw: yaw,
          reverse: false
        });
      }
      return slots;
    }
    if (kind === "perpendicular") {
      var pDepth = baseDepth + PERP_PAD_W * 0.5;
      var face = outYaw(frame);
      for (i = 0; i < PERP_SLOT_N; i++) {
        /* Zellenmitte: (i+0.5)/N — Trenner liegen bei i/N (gleicher Span wie slotWorld). */
        var u = (i + 0.5) / PERP_SLOT_N;
        var reverse = hash01(q, r, 40 + i) < 0.5;
        slots.push({
          u: u,
          depth: pDepth,
          yaw: reverse ? face + Math.PI : face,
          reverse: reverse
        });
      }
      return slots;
    }
    /* bus_stop: Hook — Layout später. */
    return slots;
  }

  function makePad(kind, frame, roadW) {
    var span = usableLen(frame);
    var width = kind === "perpendicular" ? PERP_PAD_W : PARALLEL_PAD_W;
    if (kind === "bus_stop") {
      width = PARALLEL_PAD_W * 1.15;
    }
    var depthCenter = roadW * 0.5 + PAD_INSET + width * 0.5;
    /* Parallel-2er: volle nutzbare Kante — sonst wirken die Buchten wie Einzelslots. */
    var len = kind === "perpendicular" ? span * 0.98 : span * 0.98;
    return {
      center: {
        x: frame.mid.x + frame.out.x * depthCenter,
        z: frame.mid.z + frame.out.z * depthCenter
      },
      len: len,
      width: width,
      yaw: roadYaw(frame)
    };
  }

  function tileCenterOf(tile, axialFn) {
    if (tile.x != null && tile.z != null) {
      return { x: tile.x, z: tile.z };
    }
    if (axialFn) {
      return axialFn(tile.q, tile.r);
    }
    return { x: 0, z: 0 };
  }

  function edgesForTile(tile, net, axialFn) {
    var center = tileCenterOf(tile, axialFn);
    var list = [];
    var seen = {};
    Object.keys(net.edges || {}).forEach(function (ek) {
      var e = net.edges[ek];
      var tiles = e.tiles || [];
      var hit = false;
      var t;
      for (t = 0; t < tiles.length; t++) {
        if (tiles[t].q === tile.q && tiles[t].r === tile.r) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        return;
      }
      var frame = edgeFrame(e.a, e.b, center);
      if (!frame || seen[frame.edgeId]) {
        return;
      }
      seen[frame.edgeId] = true;
      list.push(frame);
    });
    return list;
  }

  function buildFeature(frame, tile, kind, roadW) {
    var slots = makeSlots(kind, frame, tile.q, tile.r, roadW);
    return {
      id: frame.edgeId + "@" + tile.q + "," + tile.r,
      edgeId: frame.edgeId,
      from: frame.from,
      to: frame.to,
      tile: { q: tile.q, r: tile.r },
      kind: kind,
      slots: slots,
      pad: makePad(kind, frame, roadW),
      frame: {
        along: frame.along,
        out: frame.out,
        mid: frame.mid,
        len: frame.len
      }
    };
  }

  function adoptFeature(feature, features, byEdge, byTile, claimedSide, busStopHooks) {
    if (!feature || !feature.tile) {
      return;
    }
    var tileKey = feature.tile.q + "," + feature.tile.r;
    byTile[tileKey] = feature;
    features.push(feature);
    claimedSide[sideKey(feature.edgeId, feature.from, feature.to)] = feature.id;
    if (!byEdge[feature.edgeId]) {
      byEdge[feature.edgeId] = [];
    }
    byEdge[feature.edgeId].push(feature);
    busStopHooks.push({
      edgeId: feature.edgeId,
      from: feature.from,
      to: feature.to,
      tile: feature.tile,
      kind: "bus_stop",
      ready: false
    });
  }

  function dropFeatureIndexes(catalog, feature) {
    if (!catalog || !feature) {
      return;
    }
    var sk = sideKey(feature.edgeId, feature.from, feature.to);
    if (catalog.claimedSide && catalog.claimedSide[sk] === feature.id) {
      delete catalog.claimedSide[sk];
    }
    if (catalog.byEdge && catalog.byEdge[feature.edgeId]) {
      catalog.byEdge[feature.edgeId] = catalog.byEdge[feature.edgeId].filter(function (f) {
        return f !== feature && f.id !== feature.id;
      });
    }
    if (catalog.byTile && feature.tile) {
      var tk = feature.tile.q + "," + feature.tile.r;
      if (catalog.byTile[tk] === feature) {
        delete catalog.byTile[tk];
      }
    }
  }

  /* Kante, die am stärksten in faceDir vom Tile-Zentrum zeigt (Spieler-/Modell-Front). */
  function pickFacingFrame(tile, net, axialFn, faceX, faceZ, claimedSide) {
    var candidates = edgesForTile(tile, net, axialFn);
    if (!candidates.length) {
      return null;
    }
    var center = tileCenterOf(tile, axialFn);
    var best = null;
    var bestScore = -1e12;
    var i;
    for (i = 0; i < candidates.length; i++) {
      var frame = candidates[i];
      var sk = sideKey(frame.edgeId, frame.from, frame.to);
      if (claimedSide && claimedSide[sk]) {
        continue;
      }
      var score =
        (frame.mid.x - center.x) * faceX + (frame.mid.z - center.z) * faceZ;
      if (score > bestScore) {
        bestScore = score;
        best = frame;
      }
    }
    return best;
  }

  /* Alten Parkplatz auf neue Kante schieben — kind/id bleiben, nur Frame/Slots/Pad. */
  function relocateFeatureInPlace(feature, frame, roadW) {
    if (!feature || !frame) {
      return feature;
    }
    var kind = feature.kind || "parallel";
    if (kind === "none" || kind === "bus_stop") {
      return feature;
    }
    var rebuilt = buildFeature(frame, feature.tile, kind, roadW);
    feature.edgeId = rebuilt.edgeId;
    feature.from = rebuilt.from;
    feature.to = rebuilt.to;
    feature.slots = rebuilt.slots;
    feature.pad = rebuilt.pad;
    feature.frame = rebuilt.frame;
    return feature;
  }

  /* Typ wechseln (z. B. E-Taxi → immer 4er Querparken), Frame behalten. */
  function forceFeatureKind(feature, kind, roadW) {
    if (!feature || !kind || feature.kind === kind) {
      return feature;
    }
    if (kind === "none" || kind === "bus_stop") {
      return feature;
    }
    roadW = roadW != null ? roadW : DEFAULT_ROAD_W;
    var frame = {
      edgeId: feature.edgeId,
      from: feature.from,
      to: feature.to,
      along: feature.frame && feature.frame.along,
      out: feature.frame && feature.frame.out,
      mid: feature.frame && feature.frame.mid,
      len: feature.frame && feature.frame.len
    };
    if (!frame.along || !frame.out || !frame.mid) {
      return feature;
    }
    var rebuilt = buildFeature(frame, feature.tile, kind, roadW);
    feature.kind = kind;
    feature.slots = rebuilt.slots;
    feature.pad = rebuilt.pad;
    feature.frame = rebuilt.frame;
    return feature;
  }

  function orientFeatureToFacing(catalog, q, r, net, opts) {
    opts = opts || {};
    if (!catalog || !catalog.byTile) {
      return null;
    }
    var tileKey = q + "," + r;
    var feature = catalog.byTile[tileKey];
    if (!feature || feature.kind === "none" || feature.kind === "bus_stop") {
      return null;
    }
    var roadW = opts.roadW != null ? opts.roadW : DEFAULT_ROAD_W;
    var tile = { q: q, r: r, x: opts.tileX, z: opts.tileZ };
    var frame = pickFacingFrame(tile, net, opts.axial, opts.faceX, opts.faceZ, null);
    if (!frame) {
      return null;
    }
    if (feature.edgeId === frame.edgeId && feature.from === frame.from && feature.to === frame.to) {
      return null;
    }
    dropFeatureIndexes(catalog, feature);
    relocateFeatureInPlace(feature, frame, roadW);
    catalog.byTile[tileKey] = feature;
    catalog.claimedSide = catalog.claimedSide || {};
    catalog.claimedSide[sideKey(feature.edgeId, feature.from, feature.to)] = feature.id;
    catalog.byEdge = catalog.byEdge || {};
    if (!catalog.byEdge[feature.edgeId]) {
      catalog.byEdge[feature.edgeId] = [];
    }
    catalog.byEdge[feature.edgeId].push(feature);
    return feature;
  }

  /* Max. 1 Parkbucht pro Tile; Kante+Typ seeded; Kanten-Seite nicht doppelt. */
  function assignParkingFeatures(playTiles, net, opts) {
    opts = opts || {};
    var roadW = opts.roadW != null ? opts.roadW : DEFAULT_ROAD_W;
    var axialFn = opts.axial;
    var preserve = opts.preserve || null;
    var preservedByTile = (preserve && preserve.byTile) || {};
    var facingByTile = opts.facingByTile || {};
    var features = [];
    var byEdge = {};
    var byTile = {};
    var claimedSide = {};
    var busStopHooks = [];
    var playKeys = {};

    (playTiles || []).forEach(function (tile) {
      playKeys[tile.q + "," + tile.r] = tile;
    });

    /* Zuerst alte Buchten festnageln — bei Besitz ggf. an Spieler-Kante schieben. */
    Object.keys(preservedByTile).forEach(function (tileKey) {
      if (!playKeys[tileKey]) {
        return;
      }
      var feature = preservedByTile[tileKey];
      var face = facingByTile[tileKey];
      if (face && feature) {
        var frameKeep = pickFacingFrame(
          playKeys[tileKey],
          net,
          axialFn,
          face.x,
          face.z,
          claimedSide
        );
        if (frameKeep) {
          relocateFeatureInPlace(feature, frameKeep, roadW);
        }
      }
      adoptFeature(feature, features, byEdge, byTile, claimedSide, busStopHooks);
    });

    (playTiles || []).forEach(function (tile) {
      var tileKey = tile.q + "," + tile.r;
      if (byTile[tileKey]) {
        return;
      }
      var face = facingByTile[tileKey];
      var pick = null;
      if (face) {
        pick = pickFacingFrame(tile, net, axialFn, face.x, face.z, claimedSide);
      }
      if (!pick) {
        var candidates = edgesForTile(tile, net, axialFn);
        if (!candidates.length) {
          return;
        }
        var order = candidates
          .map(function (frame) {
            /* Kante + Richtung mischen, damit nicht eine Hex-Seite systematisch gewinnt. */
            var dir = edgeDirIndex(frame);
            var edgeSalt = 0;
            var id = frame.edgeId || "";
            var ci;
            for (ci = 0; ci < id.length; ci++) {
              edgeSalt = (edgeSalt * 33 + id.charCodeAt(ci)) | 0;
            }
            return {
              frame: frame,
              h: hash01(tile.q, tile.r, 200 + dir * 47 + (edgeSalt & 1023))
            };
          })
          .sort(function (a, b) {
            return a.h - b.h;
          });
        var i;
        for (i = 0; i < order.length; i++) {
          var frame = order[i].frame;
          var sk = sideKey(frame.edgeId, frame.from, frame.to);
          if (claimedSide[sk]) {
            continue;
          }
          pick = frame;
          break;
        }
      }
      if (!pick) {
        return;
      }
      var kindRoll = hash01(tile.q, tile.r, 33);
      var kind = kindRoll < 0.5 ? "parallel" : "perpendicular";
      var feature = buildFeature(pick, tile, kind, roadW);
      adoptFeature(feature, features, byEdge, byTile, claimedSide, busStopHooks);
    });

    return {
      features: features,
      byEdge: byEdge,
      byTile: byTile,
      claimedSide: claimedSide,
      busStopHooks: busStopHooks
    };
  }

  function featureSlotPose(feature, slotIndex) {
    if (!feature || !feature.slots || !feature.slots[slotIndex]) {
      return null;
    }
    var frame = {
      along: feature.frame.along,
      out: feature.frame.out,
      mid: feature.frame.mid,
      len: feature.frame.len
    };
    return slotWorld(frame, feature.slots[slotIndex]);
  }

  function allSlots(catalog) {
    var out = [];
    if (!catalog || !catalog.features) {
      return out;
    }
    catalog.features.forEach(function (feature) {
      if (feature.kind === "none" || feature.kind === "bus_stop") {
        return;
      }
      feature.slots.forEach(function (slot, index) {
        out.push({
          feature: feature,
          slotIndex: index,
          slot: slot,
          pose: featureSlotPose(feature, index),
          id: feature.id + "#" + index
        });
      });
    });
    return out;
  }

  /* Sichtbare Tilekante (Pad-Rand zur Straße), Ecken — nicht auf der Fahrbahn. */
  function cornerSignSites(feature, roadW) {
    if (!feature || !feature.frame) {
      return [];
    }
    roadW = roadW != null ? roadW : DEFAULT_ROAD_W;
    var frame = feature.frame;
    /* Von Hex-Nodes weg, damit Schilder nicht im Kreuz stehen. */
    var alongOff = Math.max(0.35, frame.len * 0.5 - 0.62);
    /* Auf die sichtbare Tilekante (Pad-Rand), klar hinter dem Bordstein. */
    var off = roadW * 0.5 + 0.92;
    return [
      {
        x: frame.mid.x - frame.along.x * alongOff + frame.out.x * off,
        z: frame.mid.z - frame.along.z * alongOff + frame.out.z * off,
        yaw: outYaw(frame) + Math.PI
      },
      {
        x: frame.mid.x + frame.along.x * alongOff + frame.out.x * off,
        z: frame.mid.z + frame.along.z * alongOff + frame.out.z * off,
        yaw: outYaw(frame) + Math.PI
      }
    ];
  }

  function findFeatureOnEdge(catalog, fromKey, toKey) {
    if (!catalog || !catalog.features) {
      return null;
    }
    var id = edgeIdOf(fromKey, toKey);
    var list = catalog.byEdge[id] || [];
    var i;
    for (i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.from === fromKey && f.to === toKey) {
        return f;
      }
    }
    for (i = 0; i < list.length; i++) {
      if (list[i].kind !== "none" && list[i].kind !== "bus_stop") {
        return list[i];
      }
    }
    return null;
  }

  Nexus.BoardEdges = {
    ROAD_W: DEFAULT_ROAD_W,
    /* Damit board3d Pads/Puls vor der Bucht stoppt (eine Quelle). */
    PARK: {
      inset: PAD_INSET,
      parallel: PARALLEL_PAD_W,
      perpendicular: PERP_PAD_W
    },
    edgeFrame: edgeFrame,
    edgeIdOf: edgeIdOf,
    assignParkingFeatures: assignParkingFeatures,
    featureSlotPose: featureSlotPose,
    allSlots: allSlots,
    cornerSignSites: cornerSignSites,
    findFeatureOnEdge: findFeatureOnEdge,
    buildFeature: buildFeature,
    pickFacingFrame: pickFacingFrame,
    relocateFeatureInPlace: relocateFeatureInPlace,
    forceFeatureKind: forceFeatureKind,
    orientFeatureToFacing: orientFeatureToFacing,
    /* Hook: Straßenrand-Taxistand (Bank) / frühere bus_stop — nicht spielbar. */
    BUS_STOP_KIND: "bus_stop"
  };
})(window.Nexus);
