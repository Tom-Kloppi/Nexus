# -*- coding: utf-8 -*-
import re

p = r"c:\Seminarfachprojekt\nexus\Nexus\nexus\index.html"
c = open(p, encoding="utf-8").read()
c = c.replace("js/data/constants.js?v=106", "js/data/constants.js?v=107")
c = c.replace("js/data/roles.js?v=101", "js/data/roles.js?v=102")
ins = '    <script src="js/data/build-tiles.js?v=1"></script>\n'
needle = '    <script src="js/data/roles.js?v=102"></script>'
if "build-tiles.js" not in c:
    c = c.replace(needle, ins + needle)
c = c.replace('data-length="short">10 Tage', 'data-length="short">12 Wochen')
c = c.replace('data-length="standard">14 Tage', 'data-length="standard">16 Wochen')
c = re.sub(
    r'\s*<button type="button" class="btn setup-choice" data-length="long">[^<]*</button>',
    "",
    c,
)
c = c.replace(
    "Hot-Seat am selben Gerät. Sechs Charaktere im Pool — so viele Rollen wie Personen.",
    "Hot-Seat am selben Gerät. Nur wer das Wahlversprechen erfüllt, kommt als Bürgermeisterin in Betracht.",
)
# default selected: short was 10 days with is-selected on standard — keep standard as 16
open(p, "w", encoding="utf-8", newline="\n").write(c)
print("patched")
