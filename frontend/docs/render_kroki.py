#!/usr/bin/env python3
"""Render PlantUML .puml files to PNG+SVG using the free Kroki server.
Fallback used by render.sh when neither Docker nor Java is available.
Usage: python3 render_kroki.py [file.puml ...]   (default: all *.puml in cwd)
Outputs go to ./out/.

PNG note: Kroki's PlantUML PNG output is capped at 4096 px wide - wider
diagrams get clipped (the right side is cut off). SVGs are vector and
unaffected. To keep the PNG complete we render the SVG first, read its true
width from the viewBox, and if it exceeds 4000 px we inject a `scale`
directive for the PNG request only (the SVG and the .puml source stay at
full size).
"""
import base64, glob, json, os, re, sys, time, urllib.request, urllib.error, zlib

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
KROKI = "https://kroki.io/plantuml"
PNG_MAX_W = 4000  # keep comfortably under Kroki's 4096 px cap
RETRIES = 4


def enc(text: str) -> str:
    return base64.urlsafe_b64encode(zlib.compress(text.encode("utf-8"), 9)).decode().rstrip("=")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def fetch_post(fmt: str, text: str) -> bytes:
    """POST the diagram source as JSON - no URL length limit (handles big diagrams)."""
    payload = json.dumps({
        "diagram_source": text,
        "diagram_type": "plantuml",
        "output_format": fmt,
    }).encode("utf-8")
    req = urllib.request.Request(f"{KROKI}/{fmt}", data=payload,
                                 headers={**UA, "Content-Type": "application/json"},
                                 method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def render_one(text: str, fmt: str) -> bytes:
    """POST first (no URL limit) with retries + backoff; GET fallback last."""
    last = None
    for i in range(RETRIES):
        try:
            return fetch_post(fmt, text)
        except Exception as ex:
            last = ex
            if i < RETRIES - 1:
                time.sleep(1 + i)
    try:
        return fetch(f"{KROKI}/{fmt}/{enc(text)}")
    except Exception:
        raise last


def svg_size(svg: bytes):
    m = re.search(rb'viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"', svg)
    if not m:
        return None
    return float(m.group(1)), float(m.group(2))


def inject_scale(text: str, width: float) -> str:
    scale = (PNG_MAX_W - 80) / width  # small margin; never >= cap
    # "scale" is only honoured INSIDE @startuml..@enduml; insert it right
    # after @startuml. Idempotent: replaces an existing scale line first.
    existing = re.search(r'(?m)^\s*scale\s+[\d.]+\s*$', text)
    if existing:
        return text[:existing.start()] + f"scale {scale:.2f}\n" + text[existing.end():]
    m = re.search(r'(?m)^@startuml\b.*$', text)
    if m:
        return text[:m.end()] + f"\nscale {scale:.2f}\n" + text[m.end():]
    # No @startuml marker: fall back to inserting after the first line.
    head, sep, rest = text.partition("\n")
    return f"{head}\nscale {scale:.2f}\n{rest}"


def png_size(png: bytes):
    if png[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big")
    return None


def main(argv):
    files = argv[1:] or sorted(glob.glob("*.puml"))
    if not files:
        print("No .puml files found in", os.getcwd())
        return 1
    os.makedirs("out", exist_ok=True)
    failed = []
    for puml in files:
        base = os.path.splitext(os.path.basename(puml))[0]
        text = open(puml, encoding="utf-8").read()
        try:
            svg = render_one(text, "svg")
        except Exception as ex:
            print(f"FAIL {base}.svg: {ex}")
            failed.append(f"{base}.svg")
            continue
        with open(os.path.join("out", f"{base}.svg"), "wb") as f:
            f.write(svg)
        print(f"OK  {base}.svg ({len(svg)}B)")
        try:
            size = svg_size(svg)
            dim = max(size) if size else None
            png_src = inject_scale(text, dim) if dim and dim > PNG_MAX_W else text
            png = render_one(png_src, "png")
            if png[:4] != b"\x89PNG":
                raise RuntimeError(f"unexpected response ({len(png)}B)")
            with open(os.path.join("out", f"{base}.png"), "wb") as f:
                f.write(png)
            note = f" (auto-scaled x{dim:.0f}->{PNG_MAX_W - 80})" if dim and dim > PNG_MAX_W else ""
            size = png_size(png)
            warn = f"  !! {size} - AT/OVER 4096 CAP, CROPPED" if size and (size[0] >= 4096 or size[1] >= 4096) else ""
            print(f"OK  {base}.png ({len(png)}B) {size}{note}{warn}")
        except Exception as ex:
            print(f"FAIL {base}.png: {ex}")
            failed.append(f"{base}.png")
    if failed:
        print("ERRORS:", ", ".join(failed))
        return 1
    print("Done. Outputs in", os.path.abspath("out"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
