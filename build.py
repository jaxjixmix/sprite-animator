#!/usr/bin/env python3
"""Build app.js from app.template.js:
   - inlines the vendored gifenc ESM (converted to a classic script)
   - embeds samples/demo-sprite.png as a base64 data URI
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TPL = ROOT / "app.template.js"
OUT = ROOT / "app.js"
GIFENC = Path("/tmp/gifenc.esm.js")
DEMO = ROOT / "samples" / "demo-sprite.png"

def classic_gifenc(src: str) -> str:
    # cut the ESM export statement and expose the names we need on window
    body, _, _tail = src.rpartition("export{")
    # keep nothing after 'export{' (minified export list runs to the end)
    return (
        "(function () {\n"
        + body
        + "\nwindow.Gifenc = { GIFEncoder: ct, quantize: H, applyPalette: nt, prequantize: et };\n})();\n"
    )

def main() -> None:
    tpl = TPL.read_text()
    gif = classic_gifenc(GIFENC.read_text())
    demo_b64 = base64.b64encode(DEMO.read_bytes()).decode()
    js = tpl.replace("/*__GIFENC_SRC__*/", gif).replace("__DEMO_B64__", demo_b64)
    OUT.write_text(js)
    print(f"wrote {OUT} ({len(js)} bytes, gifenc {len(gif)} bytes, demo {len(demo_b64)} b64)")

if __name__ == "__main__":
    main()
