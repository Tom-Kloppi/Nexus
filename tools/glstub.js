/* Minimale THREE- und DOM-Attrappe, damit board3d ohne WebGL zählt. */
function makeGlStub() {
  var counts = { mesh: 0, material: 0, texture: 0, disposed: 0 };
  function vec() {
    var v = { x: 0, y: 0, z: 0 };
    v.set = function (x, y, z) {
      v.x = x;
      v.y = y;
      v.z = z || 0;
      return v;
    };
    v.copy = function (o) {
      v.x = o.x;
      v.y = o.y;
      v.z = o.z;
      return v;
    };
    return v;
  }
  function Node(kind) {
    this.kind = kind;
    this.position = vec();
    this.rotation = vec();
    this.scale = vec();
    this.scale.set(1, 1, 1);
    this.quaternion = { setFromEuler: function () {} };
    this.children = [];
    this.parent = null;
    this.userData = {};
    this.visible = true;
    this.matrix = { elements: new Array(16).fill(0) };
    this.instanceMatrix = { setUsage: function () {}, needsUpdate: false };
    this.instanceColor = { needsUpdate: false };
    this.material = null;
    this.geometry = null;
    this.disposed = false;
    if (kind === "mesh" || kind === "sprite" || kind === "instanced") {
      counts.mesh += 1;
    }
  }
  Node.prototype.add = function (child) {
    if (!child) {
      return this;
    }
    child.parent = this;
    this.children.push(child);
    return this;
  };
  Node.prototype.remove = function (child) {
    var i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
    }
    if (child) {
      child.parent = null;
    }
  };
  Node.prototype.traverse = function (fn) {
    fn(this);
    this.children.forEach(function (child) {
      if (child.traverse) {
        child.traverse(fn);
      }
    });
  };
  Node.prototype.lookAt = function () {};
  Node.prototype.updateMatrix = function () {};
  Node.prototype.setMatrixAt = function () {};
  Node.prototype.setColorAt = function () {};
  Node.prototype.getMatrixAt = function () {};
  Node.prototype.clone = function () {
    var copy = new Node(this.kind);
    copy.material = this.material;
    return copy;
  };
  Node.prototype.dispose = function () {
    if (!this.disposed) {
      this.disposed = true;
      counts.disposed += 1;
    }
  };
  Node.prototype.copy = function () {
    return this;
  };
  Node.prototype.lerp = function () {
    return this;
  };
  Node.prototype.set = function () {
    return this;
  };
  Node.prototype.setHSL = function () {
    return this;
  };
  Node.prototype.multiplyScalar = function () {
    return this;
  };

  function Material() {
    Node.call(this, "material");
    counts.material += 1;
    this.color = new Node("color");
    this.emissive = new Node("color");
    this.opacity = 1;
    this.transparent = false;
    this.depthWrite = true;
    this.wireframe = false;
    this.map = null;
    this.side = 0;
    this.userData = { shared: true };
  }
  Material.prototype = Object.create(Node.prototype);
  Material.prototype.clone = function () {
    var copy = new Material();
    copy.userData = {};
    return copy;
  };

  function makeCtor(kind) {
    function C() {
      Node.call(this, kind);
      if (kind.indexOf("Geometry") >= 0 || kind.indexOf("Geometry") > -1) {
        this.userData.shared = true;
      }
    }
    C.prototype = Object.create(Node.prototype);
    return C;
  }

  var THREE = {
    SRGBColorSpace: "srgb",
    RepeatWrapping: 1,
    DoubleSide: 2,
    DynamicDrawUsage: 3,
    FrontSide: 0,
    Color: function () {
      return new Node("color");
    },
    Vector2: function () {
      return vec();
    },
    Vector3: function () {
      return vec();
    },
    Matrix4: function () {
      return { elements: new Array(16).fill(0) };
    },
    Euler: function () {
      return vec();
    },
    Sphere: function () {
      return new Node("sphere");
    },
    Plane: function () {
      return {};
    },
    Fog: function () {
      return {};
    },
    BoxGeometry: makeCtor("geometry"),
    CylinderGeometry: makeCtor("geometry"),
    SphereGeometry: makeCtor("geometry"),
    ConeGeometry: makeCtor("geometry"),
    PlaneGeometry: makeCtor("geometry"),
    Mesh: function (geo, mat) {
      var mesh = new Node("mesh");
      mesh.geometry = geo;
      mesh.material = mat;
      mesh.isMesh = true;
      return mesh;
    },
    InstancedMesh: function (geo, mat, count) {
      var mesh = new Node("instanced");
      mesh.geometry = geo;
      mesh.material = mat;
      mesh.count = count;
      mesh.isMesh = true;
      return mesh;
    },
    Group: function () {
      return new Node("group");
    },
    Sprite: function (mat) {
      var spr = new Node("sprite");
      spr.material = mat;
      return spr;
    },
    SpriteMaterial: function () {
      return new Material();
    },
    MeshLambertMaterial: function () {
      return new Material();
    },
    MeshBasicMaterial: function () {
      return new Material();
    },
    CanvasTexture: function () {
      counts.texture += 1;
      return new Node("texture");
    },
    Object3D: function () {
      return new Node("object");
    },
    Scene: function () {
      var scene = new Node("scene");
      scene.background = null;
      scene.fog = null;
      return scene;
    },
    PerspectiveCamera: function () {
      var cam = new Node("camera");
      cam.aspect = 1;
      cam.updateProjectionMatrix = function () {};
      return cam;
    },
    Raycaster: function () {
      return { params: { Mesh: {} }, setFromCamera: function () {}, intersectObject: function () { return []; } };
    },
    Clock: function () {
      return { getDelta: function () { return 0.016; }, elapsedTime: 0, start: function () {} };
    },
    HemisphereLight: function () {
      var light = new Node("light");
      light.color = new Node("color");
      light.groundColor = new Node("color");
      return light;
    },
    DirectionalLight: function () {
      var light = new Node("light");
      light.color = new Node("color");
      light.shadow = { mapSize: { set: function () {} }, camera: { near: 0, far: 1, left: 0, right: 0, top: 0, bottom: 0 } };
      return light;
    },
    AmbientLight: function () {
      var light = new Node("light");
      light.color = new Node("color");
      return light;
    },
    WebGLRenderer: function () {
      return {
        outputColorSpace: "",
        shadowMap: { enabled: false },
        setClearColor: function () {},
        setPixelRatio: function () {},
        setSize: function () {},
        render: function () {},
        dispose: function () {},
        getContext: function () {
          return {
            getParameter: function () {
              return 8192;
            },
            getExtension: function (name) {
              if (name === "WEBGL_debug_renderer_info") {
                return { UNMASKED_RENDERER_WEBGL: 1 };
              }
              return null;
            }
          };
        },
        info: { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } }
      };
    }
  };

  var attrs = { "data-theme": "light" };
  var document = {
    documentElement: {
      getAttribute: function (name) {
        return attrs[name] || "";
      },
      setAttribute: function (name, value) {
        attrs[name] = value;
      }
    },
    body: { appendChild: function () {}, setAttribute: function () {} },
    hidden: false,
    createElement: function () {
      return {
        width: 0,
        height: 0,
        getContext: function (kind) {
          if (kind && String(kind).indexOf("webgl") === 0) {
            return {
              MAX_TEXTURE_SIZE: 0x0d33,
              RENDERER: 0x1f01,
              getParameter: function (name) {
                if (name === 1) {
                  return "ANGLE SwiftShader";
                }
                return 8192;
              },
              getExtension: function (name) {
                if (name === "WEBGL_debug_renderer_info") {
                  return { UNMASKED_RENDERER_WEBGL: 1 };
                }
                return null;
              }
            };
          }
          var ctx = { canvas: { width: 64, height: 64 } };
          var proxy = new Proxy(ctx, {
            get: function (target, key) {
              if (!(key in target)) {
                target[key] = function () {
                  return proxy;
                };
              }
              return target[key];
            },
            set: function (target, key, value) {
              target[key] = value;
              return true;
            }
          });
          return proxy;
        },
        style: {},
        classList: { toggle: function () {}, add: function () {}, remove: function () {} },
        addEventListener: function () {},
        getBoundingClientRect: function () {
          return { width: 800, height: 600, left: 0, top: 0 };
        },
        clientWidth: 800,
        clientHeight: 600
      };
    },
    getElementById: function (id) {
      if (id === "map-viewport" || id === "district-canvas") {
        return document.createElement(id);
      }
      if (id === "city-progress") {
        return { hidden: true, style: {}, textContent: "" };
      }
      return null;
    },
    addEventListener: function () {}
  };

  return { THREE: THREE, document: document, counts: counts };
}

module.exports = { makeGlStub: makeGlStub };
