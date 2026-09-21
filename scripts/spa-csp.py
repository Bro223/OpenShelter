#!/usr/bin/env python3
"""Recompute the SPA's Content-Security-Policy from a built index.html.

The Angular build (frontend/dist/frontend/browser/index.html) carries two
pre-paint inline <script> blocks (theme + locale) that must be allow-listed
by sha256 hash — 'unsafe-inline' is deliberately NOT part of the policy
(docs/deploy/spa-csp.md). After EVERY frontend rebuild, run this script and
update the `script-src` line in your proxy's CSP header with what it prints:

    python3 scripts/spa-csp.py frontend/dist/frontend/browser/index.html

The policy is applied at the REVERSE PROXY (nginx/caddy/ingress) as the
`Content-Security-Policy` response header on the SPA's document and static
assets — never as a <meta> tag inside index.html (see the doc for why).

Exit status: 0 = ok, 2 = no index.html / no inline scripts found (a build
with neither is suspicious for this app and should fail the deploy loudly).
"""

import base64
import hashlib
import re
import sys

# The policy's other directives are constants of the app's load profile
# (own origin, OpenStreetMap tiles, OSM Nominatim geocoder — see
# docs/deploy/spa-csp.md). Only the hashes below change per build.
STATIC_DIRECTIVES = (
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    "connect-src 'self' https://nominatim.openstreetmap.org",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
)


def inline_scripts(html: str) -> list[str]:
    """Script elements WITHOUT a src attribute (inline bodies), in order.

    The bodies are returned EXACTLY as delivered (leading/trailing
    whitespace included) — a CSP sha256 hash covers the script content
    byte-for-byte as the browser receives it.
    """
    return [
        m.group(1)
        for m in re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S)
        if m.group(1).strip()
    ]


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: " + sys.argv[0] + " <built-index.html>", file=sys.stderr)
        return 2
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            html = f.read()
    except OSError as e:
        print(f"error: cannot read {sys.argv[1]}: {e}", file=sys.stderr)
        return 2
    scripts = inline_scripts(html)
    if not scripts:
        print(f"error: no inline <script> found in {sys.argv[1]} — "
              "unexpected for this app's pre-paint theme/locale blocks", file=sys.stderr)
        return 2

    hashes = [
        "sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode()
        for s in scripts
    ]
    script_src = "script-src 'self' " + " ".join(hashes)

    print(f"# {sys.argv[1]}: {len(scripts)} inline script(s) hashed")
    print()
    print(script_src)
    print()
    print("Full header value for the proxy (one line):")
    print()
    print("; ".join([script_src, *STATIC_DIRECTIVES]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
