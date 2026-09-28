# SPA Content-Security-Policy (operator-facing)

OpenShelter ships the security headers it **can** set from the app itself
(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, cache rules,
and a minimal defense-in-depth CSP —
`ee.sheltermap.config.SecurityHeadersFilter`). The app's own CSP is the
one-line fallback `Content-Security-Policy: default-src 'self'` on every
response. **The SPA's real policy must come from the reverse proxy**, because
a CSP is a document-level policy that must describe everything the page
*loads*, and only the deployment knows the full answer to that (the bundle is
same-origin here, but operators may serve the SPA behind a CDN, under a
different origin, with self-hosted tiles, etc.). In the designed topology the
proxy serves the SPA's document and static assets directly, so the app's
fallback header never shares a response with the full policy — which matters,
because browsers apply MULTIPLE CSP headers on one response as an
intersection, and the app's `default-src 'self'` would silently cut the proxy
policy's cross-origin tile and data:/blob: allowances. (If your topology
serves the SPA document *through* the app, strip the app's CSP header at the
proxy before adding the full one.)

So the policy ships as a ready-to-use configuration for your reverse proxy,
derived from what the built app actually loads:

| Load | Origin | Directive |
|---|---|---|
| own bundle (`main-*.js`, `styles-*.css`) + versioned Quill stylesheet `/vendor/quill/2.0.3/dist/quill.snow.css` (injected as a runtime `<link>` when the admin editor initialises) | same origin | `'self'` |
| the two pre-paint inline scripts (theme + locale, in `frontend/src/index.html`) | inline | `sha256-` hashes (below) |
| critical CSS inlined at build time (beasties) + Angular's runtime-injected component `<style>` tags | inline | `style-src 'unsafe-inline'` |
| map tiles (Leaflet → OpenStreetMap) | `https://tile.openstreetmap.org` | `img-src` |
| Nominatim geocoder (search) | `https://nominatim.openstreetmap.org` | `connect-src` |
| API calls (XHR/fetch — every page's data) | the API origin — `'self'` in the designed topology (SPA and API on one origin) | `connect-src` |
| hero images and media thumbnails (served by the API at `/api/media/**`; the URLs are API-relative) | the API origin — `'self'` in the designed topology | `img-src` |
| the transparent-gif image fallback inside the bundle | `data:` | `img-src` |
| app-created object URLs (the account JSON-export download) — defensive, a page's own blob: URL is not otherwise a CSP load | `blob:` | `img-src` |

The app loads **no fonts at all** (a system font stack; no `@font-face` in the
built sheet or in the vendored Quill theme), so `font-src 'self'` — no
`data:` allowance. (The vendored `quill.snow.css` carries neither data: URIs
nor `url()` references; its backgrounds are plain colors.)

## The header

Apply this as the `Content-Security-Policy` response header on the SPA's
document and static assets, at the proxy:

```
script-src 'self' sha256-DLjLq71u6uWa0CSMi1WQwnMP4HxHVpIS0nAYDjfGmAE= sha256-8BqtEG4ckIJfyonVQ++PbjRG1Cht6hDTeCs93kny2d4=; default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' https://nominatim.openstreetmap.org; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

Notes on the non-obvious parts:

- **`script-src` has no `'unsafe-inline'`** — the only inline scripts are the
  two pre-paint blocks, allow-listed by exact hash. A hash miss is a loud
  browser-console failure, which is exactly how you notice a rebuild.
  (That is also why the build must emit the stylesheet as a plain
  `<link>`: the builder's critical-CSS swap normally uses an inline
  `onload="…"` **event handler**, and event handlers are governed by
  `script-src` but can only be allowed by `'unsafe-inline'` — never by
  hash. The `postbuild` hook — `frontend/scripts/postbuild-csp.mjs`,
  part of `npm run build` — rewrites the swap to a plain render-blocking
  link, so the hash-only `script-src` above is complete as shipped.)
- **`style-src 'unsafe-inline'` is deliberate**, not an oversight: the build
  inlines critical CSS, and the Angular runtime injects component styles as
  `<style>` elements at runtime — hashing those is impossible (they change
  with every navigation). In modern browsers `'unsafe-inline'` in
  `style-src` does NOT re-enable inline scripts (that requires the separate
  `script-src` keyword), so the XSS-relevant surface stays closed.
- **`frame-ancestors 'none'`** complements the app's own `X-Frame-Options:
  DENY`: the SPA is never meant to be embedded.
- **`upgrade-insecure-requests`** is included so plain-HTTP origin deploys
  also force the https tile/geocoder URLs; remove it only if you know why.

## The hashes change per frontend build

The two inline scripts live in `frontend/src/index.html` and are carried into
every build. If they are ever edited, the hashes must be recomputed — or the
theme/locale scripts will be blocked and the app will render (but unthemed
and in English for one paint). Recompute with the committed helper:

```
python3 scripts/spa-csp.py frontend/dist/frontend/browser/index.html
```

It prints the current `script-src` directive and the full one-line header —
paste the new header into your proxy config and reload. (The values above
are correct for the current build; the script is the source of truth.)

## Split-origin deployment (SPA on a different host than the API)

Everything above describes the designed topology: the SPA and the API on ONE
origin, the proxy forwarding `/api`, `/auth`, `/account`, `/verify/`,
`/admin/` to the backend. The dev-server proxy
(`frontend/proxy.conf.js`) fakes exactly this same-origin-ness in dev and is
part of NO production path — a production proxy must forward the same five
prefixes itself (and keep the `/account` route-vs-API rule from that file).
To serve the two from different hosts:

1. **Bake the API origin into the SPA build.** Set `apiUrl` in
   `frontend/src/environments/environment.split.ts` to the public API origin
   (e.g. `'https://api.example.ee'`), then
   `ng build --configuration split-api` (that configuration compiles
   `environment.split.ts` instead of `environment.ts`). Both files ship
   with `apiUrl: ''` — the same-origin build; a same-origin deployment
   never touches this.
2. **Allow the SPA origin on the API.** Set `CORS_ALLOWED_ORIGINS` to the
   exact public SPA origin(s), comma-separated (property
   `app.cors.allowed-origins`, bound in `SecurityConfig`). Exact origins
   only: the CORS configuration sets credentials, and Spring refuses `*`
   together with credentials. No backend code or build change is involved.
3. **Extend the proxy's CSP** — recompute it with the API origin so the
   browser allows the cross-origin XHRs and the cross-origin media images:

   ```
   python3 scripts/spa-csp.py frontend/dist/frontend/browser/index.html \
       --api-origin https://api.example.ee
   ```

   The printed header gains the API origin in `connect-src` and `img-src`.
   Without it the browser blocks every API call and every `/api/media/**`
   image — the site looks dead while the API sees only prefetched 403s or
   nothing at all.
4. **Media needs no configuration.** The SPA resolves the API-relative
   `/api/media/...` URLs it renders (heroes, thumbnails, the admin media
   library) against the baked-in API base (`apiUrl`/`apiSrcset` pipes);
   same-origin builds pass them through byte-for-byte unchanged.

Both origins must be `https`: `upgrade-insecure-requests` forces https on
the cross-origin loads, and the Bearer tokens (localStorage, no cookies)
must not ride plain HTTP. Rate limiting and HSTS behind the SPA's own proxy
are backend-side switches (`RATELIMIT_TRUSTED_PROXIES` /
`RATELIMIT_TRUST_LOOPBACK`) — see the deploy-readiness review, not this
policy.

## nginx example

```nginx
server {
    # ... your existing SPA serving (root, try_files, /vendor passthrough) ...

    add_header Content-Security-Policy
        "script-src 'self' sha256-DLjLq71u6uWa0CSMi1WQwnMP4HxHVpIS0nAYDjfGmAE= sha256-8BqtEG4ckIJfyonVQ++PbjRG1Cht6hDTeCs93kny2d4=; default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' https://nominatim.openstreetmap.org; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
        always;
}
```

Caddy: `header { Content-Security-Policy <the same one-liner> }`.
Kubernetes ingress: `nginx.ingress.kubernetes.io/annotation-value` under
`http-response-header` / your ingress's CSP annotation.

## Why not a `<meta http-equiv="Content-Security-Policy">` in index.html?

Tempting (zero operator work), and this app is *designed* for operator
deployment via a proxy — but the meta tag is the wrong instrument here:

1. **It is a per-document policy that the operator cannot override.** The
   header can be set (and tightened/relaxed) at the edge per deployment —
   CDN origin, custom tile server, additional analytics. A meta tag baked
   into the served HTML forces every deployment to run the app's default
   policy, and changing it requires rebuilding and redeploying the SPA.
2. **It only covers the document that contains it.** Cross-document loads
   (e.g. `frame-src`/`child-src` scenarios) are governed by the response
   header of the *loading* response; the header form is the complete
   instrument, the meta form is the degraded one.
3. **It applies at parse time, after the first network round-trip**, and
   browsers report its violations per-document, which splits the policy
   surface across the app bundle and the proxy — one policy, two places, is
   how policies drift.
4. The app's own header filter already owns the CSP-adjacent headers
   (`X-Frame-Options`, `Referrer-Policy`); keeping CSP at the same layer
   (the proxy, which is also where TLS termination happens for
   `upgrade-insecure-requests`) keeps the security surface in one place.

If you are running **without** a reverse proxy (rare; direct static hosting),
the fallback is the platform's static-header feature (S3/GitHub Pages/Netlify
custom headers) with the same one-liner — still not a meta tag.
