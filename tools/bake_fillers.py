#!/usr/bin/env python3
"""Bake inbox GLBs into nexus/js/data/fillers.js. No runtime GLTF library.

Reads nexus/assets/fillers/inbox/*.glb (one mesh, no skin, no animation).
Writes position/normal/index arrays the board instances directly.
"""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "nexus" / "assets" / "fillers" / "inbox"
OUT = ROOT / "nexus" / "js" / "data" / "fillers.js"
MAX_TRIS = 2000


def read_glb(path):
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise SystemExit(path.name + " ist kein GLB")
    length = struct.unpack_from("<I", data, 8)[0]
    off = 12
    js = bin_blob = None
    while off < length:
        chunk_len, chunk_type = struct.unpack_from("<I4s", data, off)
        off += 8
        chunk = data[off : off + chunk_len]
        off += chunk_len
        if chunk_type == b"JSON":
            js = json.loads(chunk)
        elif chunk_type == b"BIN\x00":
            bin_blob = chunk
    if js is None or bin_blob is None:
        raise SystemExit(path.name + " ohne JSON/BIN")
    return js, bin_blob


def accessor(js, blob, index):
    acc = js["accessors"][index]
    view = js["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    ctype = acc["componentType"]
    ncomp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    fmt = {5123: "<H", 5125: "<I", 5126: "<f"}[ctype]
    size = struct.calcsize(fmt)
    stride = view.get("byteStride", size * ncomp)
    out = []
    for i in range(count):
        base = start + i * stride
        out.append(struct.unpack_from(fmt * ncomp, blob, base))
    return out


def mesh_from(path):
    js, blob = read_glb(path)
    prim = js["meshes"][0]["primitives"][0]
    pos = accessor(js, blob, prim["attributes"]["POSITION"])
    norm = accessor(js, blob, prim["attributes"]["NORMAL"]) if "NORMAL" in prim["attributes"] else []
    idx = accessor(js, blob, prim["indices"]) if "indices" in prim else []
    tris = (len(idx) if idx else len(pos)) // 3
    if tris > MAX_TRIS:
        raise SystemExit(path.name + " hat " + str(tris) + " Dreiecke, Limit " + str(MAX_TRIS))
    flat = lambda rows: [n for row in rows for n in row]
    return {
        "positions": flat(pos),
        "normals": flat(norm),
        "indices": [n[0] for n in idx] if idx else [],
    }


def main():
    INBOX.mkdir(parents=True, exist_ok=True)
    meshes = {}
    for path in sorted(INBOX.glob("*.glb")):
        meshes[path.stem] = mesh_from(path)
    header = open(OUT).read().split("meshes: {", 1)[0]
    body = "    meshes: " + json.dumps(meshes) + ",\n"
    rest = open(OUT).read().split("meshes: {", 1)[1]
    rest = rest.split("},", 1)[1]
    # ponytail: replace the meshes object only; upgrade if the file shape changes
    text = header + "meshes: " + json.dumps(meshes) + "," + rest
    OUT.write_text(text)
    print("baked", len(meshes), "meshes")


if __name__ == "__main__":
    main()
