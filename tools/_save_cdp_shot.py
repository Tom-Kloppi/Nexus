import json, base64, pathlib, sys
src = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])
dst.parent.mkdir(parents=True, exist_ok=True)
data = json.loads(src.read_text(encoding="utf-8"))
b64 = data.get("data")
if not b64 and isinstance(data.get("result"), dict):
    b64 = data["result"].get("data")
if not b64:
    raise SystemExit("no data in " + str(src))
dst.write_bytes(base64.b64decode(b64))
print(dst, dst.stat().st_size)
