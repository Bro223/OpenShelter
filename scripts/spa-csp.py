#!/usr/bin/env python3
"""Recompute the SPA's Content-Security-Policy from a built index.html.

The Angular build (frontend/dist/frontend/browser/index.html) carries two
pre-paint inline <script> blocks (theme + locale) that must be allow-listed
by sha256 hash — 'unsafe-inline' is deliberately NOT part of the policy
(docs/deploy/spa-csp.md). After EVERY frontend rebuild, run this script and
update the `script-src` line in your proxy's CSP header with what it prints:

    python3 scripts/spa-csp.py frontend/dist/frontend/browser/index.html

For a SPLIT deployment (the SPA served from a different origin than the
API), pass the API origin so its XHRs (connect-src) and its /api/media/**
images (img-src) are allow-listed too:

    python3 scripts/spa-csp.py frontend/dist/frontend/browser/index.html \
        --api-origin https://api.example.ee

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
# docs/deploy/spa-csp.md). Only the hashes below change per build. The
# 'self' entries assume the API is SAME-ORIGIN (the designed topology);
# a split deployment gets the API origin folded into connect-src and
# img-src via --api-origin (directives_for below) — without it the
# browser blocks every API call and every media image.
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


def directives_for(api_origin: str) -> list[str]:
    """The static directives, with the API origin folded in when given.

    '' (no --api-origin) returns them verbatim — the same-origin policy.
    A split deployment appends the API origin to connect-src (the XHRs)
    and img-src (the /api/media/** images); no other directive loads
    from the API origin.
    """
    if not api_origin:
        return list(STATIC_DIRECTIVES)
    folded = []
    for directive in STATIC_DIRECTIVES:
        if directive.startswith(("connect-src ", "img-src ")):
            directive += " " + api_origin
        folded.append(directive)
    return folded


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
    args = sys.argv[1:]
    api_origin = ""
    if "--api-origin" in args:
        i = args.index("--api-origin")
        if i + 1 >= len(args):
            print("error: --api-origin needs a value (scheme://host[:port])", file=sys.stderr)
            return 2
        api_origin = args[i + 1]
        del args[i : i + 2]
    if api_origin and not re.fullmatch(r"https?://[^/\s]+", api_origin):
        print(
            "error: --api-origin must be an exact origin (scheme://host[:port]), got: "
            + repr(api_origin),
            file=sys.stderr,
        )
        return 2
    if len(args) != 1:
        print("usage: " + sys.argv[0] + " <built-index.html> [--api-origin ORIGIN]", file=sys.stderr)
        return 2
    try:
        with open(args[0], encoding="utf-8") as f:
            html = f.read()
    except OSError as e:
        print(f"error: cannot read {args[0]}: {e}", file=sys.stderr)
        return 2
    scripts = inline_scripts(html)
    if not scripts:
        print(f"error: no inline <script> found in {args[0]} — "
              "unexpected for this app's pre-paint theme/locale blocks", file=sys.stderr)
        return 2

    hashes = [
        "sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode()
        for s in scripts
    ]
    script_src = "script-src 'self' " + " ".join(hashes)

    print(f"# {args[0]}: {len(scripts)} inline script(s) hashed")
    print()
    print(script_src)
    print()
    print("Full header value for the proxy (one line):")
    print()
    print("; ".join([script_src, *directives_for(api_origin)]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
