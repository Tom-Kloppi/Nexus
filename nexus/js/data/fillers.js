window.Nexus = window.Nexus || {};

/* Gebackene Filler-Geometrie. Leer, bis tools/bake_fillers.py Meshes schreibt. */
(function (Nexus) {
  var cache = {};

  function geometry(name) {
    if (cache[name]) {
      return cache[name];
    }
    var spec = Nexus.Fillers.meshes[name];
    if (!spec || !spec.positions || typeof THREE === "undefined") {
      return null;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(spec.positions, 3));
    if (spec.normals && spec.normals.length) {
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(spec.normals, 3));
    } else {
      geo.computeVertexNormals();
    }
    if (spec.indices && spec.indices.length) {
      geo.setIndex(spec.indices);
    }
    cache[name] = geo;
    return geo;
  }

  Nexus.Fillers = {
    version: 1,
    meshes: {},
    geometry: geometry,
    scatter: function (group, zoneKey, q, r, count, rand, tileH, color) {
      var names = Object.keys(Nexus.Fillers.meshes);
      if (!names.length || typeof THREE === "undefined") {
        return;
      }
      var i;
      var n = Math.min(names.length, Math.max(1, count || 1));
      for (i = 0; i < n; i++) {
        var name = names[Math.floor(rand() * names.length)];
        var geo = geometry(name);
        if (!geo) {
          continue;
        }
        var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: color || "#c8c2b8" }));
        var ang = rand() * Math.PI * 2;
        var dist = 1.6 + rand() * 2.2;
        mesh.position.set(Math.cos(ang) * dist, tileH || 0, Math.sin(ang) * dist);
        mesh.rotation.y = rand() * Math.PI * 2;
        mesh.userData.prop = true;
        group.add(mesh);
      }
    }
  };
})(window.Nexus);
