# Split portability — can the SPA and the API live on different hosts?

**Lane:** SPLIT-PORTABILITY (branch `feature/frontend`).
**Owner requirement (verbatim):** "it is currently local so they are in same place but they should be able to work on different hosts **in theory**."

**Bottom line.** The architecture is one seam away from split-ready, and this lane closed the gap: every
mechanism (API base, CORS, auth, CSP, media) has a configuration point; what was missing was a
**build flag for a split-origin SPA**, **media URLs that break across origins**, **CSP tooling with no
same-origin-ness escape hatch**, and a comment pointing at a README section that never documented the
switch. A split deployment is now, end to end: **one file value + one env var + one script flag — no
code change**, and the same-origin default is byte-for-byte untouched.

---

## 1. The API base URL

**Build-time, single place, same-origin-by-implicit-`''`.**

- Every API call flows through one client: `frontend/src/app/core/api-client.ts:22` —
  `private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '')`; `request`/`getWithHeaders`
  prefix `baseUrl` unless the path is already absolute (`api-client.ts:37,57`). The HTTP stack is
  `provideHttpClient(withInterceptors([apiInterceptor]))` (`src/app/app.config.ts:11`). The one
  deliberate exception is the Nominatim geocoder, called with an absolute URL by design
  (`src/app/gateways/geocode-gateway.ts:28`) — it already crosses to a third-party origin and is on
  the CSP allow-list.
- Which file supplies the value: `frontend/angular.json:61-66` (`fileReplacements`) — the
  `development` build swaps `src/environments/environment.ts` for
  `src/environments/environment.development.ts`; a plain `ng build` (production, the
  `defaultConfiguration`) ships `environment.ts`, whose `apiUrl` is `''`
  (`frontend/src/environments/environment.ts:25`).
- **`apiUrl: ''` means same-origin implicitly**: an empty prefix yields root-relative URLs, which the
  browser resolves against the document's origin. So "same place" today is a build-time default, not
  a runtime decision and not a requirement of the code.
- **Could a split-origin build be produced *today*, before this lane? No.** The only path was editing
  `environment.ts` (a source change) and rebuilding — no build configuration, no flag. This is the
  gap `reviews/polish/deploy-readiness.md` §4/B4 called out ("the origin must be baked into
  `environment.ts` and **rebuilt** … known and deferred").
- **After this lane: yes.** `ng build --configuration split-api` (new configuration,
  `frontend/angular.json:68-84`: the production budgets + `outputHashing: all` + a
  `fileReplacements` entry) compiles the new `src/environments/environment.split.ts` instead — set
  its `apiUrl` (line 25) to the public API origin and the origin is baked in. Verified empirically
  (§9): a test build's bundle carried
  `var O={production:!0,apiUrl:`https://split-check.example.ee`}; … baseUrl=O.apiUrl.replace(/\/+$/,…)`.
- **Dead end recorded so nobody re-tries it:** the `@angular/build:application` builder does expose a
  `define` option (schema), which would have made the switch pure JSON — but empirically it does not
  apply: the build pipeline mangles the imported `environment` binding before `define` is evaluated,
  so the member expression `environment.apiUrl` no longer matches (the test origin never reached the
  bundle; the property access survived minified). The dedicated environment file + configuration is
  the standard Angular mechanism and the one that works.

## 2. CORS

**Already fully configurable by environment. No backend change exists to make — and this lane made none.**

- `src/main/java/ee/sheltermap/config/SecurityConfig.java:177-191` — the `corsConfigurationSource`
  bean: exact origins from `app.cors.allowed-origins` (default `http://localhost:5173,
  http://localhost:3000`, bound at `src/main/resources/application.yml:116-120` to the env var
  **`CORS_ALLOWED_ORIGINS`**, parsed by `CommaSeparated.parseList`, `:180`); methods
  GET/POST/PUT/DELETE/OPTIONS (`:181`); all request headers (`:182`); `X-Total-Count` exposed by
  name (`:188` — without it a cross-origin frontend silently degrades to page-length pagination,
  per the in-code comment `:183-187`); `setAllowCredentials(true)` (`:189`); registered for `/**`
  (`:191`) and wired into the chain before authorization (`:219`, preflight handled by Spring
  Security's CORS filter).
- **With a split origin, the exact setting that must change is one env var:**
  `CORS_ALLOWED_ORIGINS=https://<public-SPA-origin>` (comma-separated for several). Configuration
  alone — no property to invent, no code.
- Caveat (documented in the new split section): **exact origins only** — Spring refuses `*` together
  with credentials, and this configuration sets credentials (`:189`).

## 3. Cookies and credentials

**Verified, not assumed: nothing is cookie-based, and no request sends credentials a split deploy
would block.**

- Backend: grep for `Set-Cookie` / `addCookie` / `ResponseCookie` across `src/main/java` —
  **zero hits**. `SecurityConfig.java:214-220` — "Stateless Bearer-token auth (Authorization:
  Bearer, no cookie sessions)"; `SessionCreationPolicy.STATELESS` (`:220`); CSRF disabled by design
  (`:218`, rationale in `docs/security/threat-model.md`).
- Frontend: no `withCredentials` anywhere in `frontend/src`; the refresh token lives in
  `localStorage` (`src/app/core/token-store.ts:12,28,41,52`) and the access token is attached as an
  `Authorization` header by the interceptor. Nothing in the request path is a cookie, so a
  cross-origin deployment blocks nothing cookie-wise.
- The only cross-origin exposure is therefore **transport**: the tokens in localStorage ride
  whatever scheme the edge serves — both origins must be TLS (documented in the new split section).
- `setAllowCredentials(true)` (`SecurityConfig.java:189`) is inert while auth stays Bearer-only; it
  is exactly what forces the exact-origin rule in §2. Left untouched (changing it would be a
  behaviour change to a reviewed decision).

## 4. CSP

**The build's CSP step contains no origin at all; the policy's same-origin-ness was an *unexpressed
assumption* in the operator tooling — now a flag.**

- What the build runs: `npm run build` = `ng build` + the `postbuild` hook
  (`frontend/package.json:8-9`) → `frontend/scripts/postbuild-csp.mjs`. That script contains **no
  policy and no origin** — it only rewrites the builder's `onload=` stylesheet swap (an inline event
  handler, which CSP hashes cannot allow-list) into a plain `<link>` so the hash-only `script-src`
  the operator applies at the proxy doesn't leave the SPA unstyled. Idempotent, no-op-safe,
  origin-agnostic.
- The real policy is a **proxy response header** (deliberately no `<meta>` —
  `docs/deploy/spa-csp.md`, "Why not a `<meta …>`"), computed by `scripts/spa-csp.py` from the built
  `index.html`. It is **not frozen into the built artefact** — the artefact carries only the two
  pre-paint inline scripts whose hashes the script recomputes.
- **Did it hardcode a `connect-src` that would break a split API?** Implicitly yes:
  `connect-src 'self' https://nominatim.openstreetmap.org` (pre-edit `scripts/spa-csp.py:32`; now
  `:43`) — `'self'` is the SPA's own origin, so a cross-origin API XHR is blocked by the browser
  before any CORS question arises; `img-src 'self' …` (`:42`) likewise blocked cross-origin media.
  The value was a frozen constant in the script (not derived from any configuration), and the
  docstring asserted the directives were "constants of the app's load profile" — a comment that
  misstated the mechanism for exactly the split case.
- **Fix:** `scripts/spa-csp.py` now accepts an optional `--api-origin ORIGIN` (validated as an exact
  origin — scheme+host[:port], no path — exit 2 otherwise) that appends the origin to `connect-src`
  and `img-src` only (`directives_for`, `:53-68`). **Without the flag the output is byte-identical to
  the previous script** (verified by diffing old-vs-new on the same fixture and on a real build
  output). The docstring now says the `'self'` entries assume a same-origin API and how to break that
  assumption.
- The app's own `SecurityHeadersFilter` CSP (`default-src 'self'`, defense in depth) rides on **API**
  responses; in the designed topology it never shares a response with the proxy's full policy, and a
  CSP in an XHR response does not govern the document — split changes nothing there (the
  intersection caveat is already documented in `docs/deploy/spa-csp.md:12-19`).

## 5. Media URLs

**Relative, server-minted, and NOT derived from the API base — a split deployment would have produced
broken images. Now resolved at render time, identity for every build we ship today.**

- The backend mints them: `MediaService.java:62` (`MEDIA_URL_PREFIX = "/api/media/"`), served by
  `MediaController.java:69` (`GET/HEAD /api/media/**` permitAll — `SecurityConfig.java:275-276`,
  unguessable 32-hex names are the access control); projected in the DTOs
  (`GuidancePostDto.java:38,47` — `heroImageUrl` + `heroImageSrcset`; `MediaAssetDto.java:9` — `url`
  + `srcset`).
- The SPA rendered them raw (`[src]="…"`), so the browser resolved them against **the SPA's origin**
  — correct same-origin, 404 in a split. There are exactly six `<img>` sites (repo-wide
  `[src]` grep): guidance-detail `:44`, guidance-list `:74`, guidance-order-list `:81`,
  guidance-editor `:144` (hero slot) and `:205` (picker), media-panel `:70` — each with a matching
  `[attr.srcset]` sibling. The guidance **body** can never carry a media URL: the Quill editor's
  format list has no `image` (`guidance-editor.ts:228-238`, a subset of the BodySanitizer allowlist),
  so no HTML-string rewriting was ever in scope.
- **Fix:** new `frontend/src/app/core/api-url.ts` — pure `prefixApiUrl(url, apiBase)` /
  `prefixApiSrcset(srcset, apiBase)` (srcset: each entry's URL prefixed, its `96w` descriptor
  untouched) plus two pipes, `apiUrl` and `apiSrcset`, applied at all six `[src]` and six
  `[attr.srcset]` sites. The base is `environment.apiUrl` (trailing-slash-stripped) — **`''` for the
  plain production and development builds, i.e. every deployment shape that exists today — where
  both functions are the identity and the rendered URLs are byte-for-byte what the API returned**
  (pinned by the new spec). Only a split build gains the prefix.
- A split CSP must still allow the API origin in `img-src` — that is the `--api-origin` flag (§4).

## 6. The development proxy — what it must not become a dependency of

`frontend/proxy.conf.js` (loaded via `--proxy-config`, `package.json:6-7`) forwards `/api`, `/auth`,
`/account`, `/verify/`, `/admin/` to `http://localhost:8080` (`:27`) and keys the `/account`
route-vs-API disambiguation on the request (a browser navigation gets `index.html` — the JS `bypass`
at `:40`). It exists to **fake same-origin in dev only**. It must not become a dependency of:

1. **Any production topology.** It is a dev-server JavaScript module; a reverse proxy cannot load
   it. A production same-origin proxy must forward the same five prefixes itself and re-implement
   the `/account` route-vs-API rule (the file header documents both failure modes of getting it
   wrong — a production proxy that forwards `/account` unconditionally breaks SPA deep links).
2. **The correctness of the `apiUrl: ''` default.** The default only works in production when the
   *production* proxy forwards the API prefixes; the dev proxy is the reason same-origin feels
   natural locally, not the mechanism that would carry it to production.
3. **The CORS dev default.** `CORS_ALLOWED_ORIGINS` defaults to the dev origins
   (`application.yml:120`) because some dev flows (the SPA opened from another host/port, e.g.
   `npm run start:host` from a container) call the backend directly — those defaults must not
   survive into production (deploy-readiness §1.5/B4 flags it as unguarded).

## 7. The exact switch — a split deployment as a configuration exercise

Documented in `docs/deploy/spa-csp.md` ("Split-origin deployment", new section) and pointed at from
the frontend README's Deploy bullet:

1. **Frontend (the build flag):** set `apiUrl` in
   `frontend/src/environments/environment.split.ts:25` to the public API origin (e.g.
   `'https://api.example.ee'`) → `ng build --configuration split-api`. Both environment files commit
   with `''`, so a split-api build made *without* setting the origin is a same-origin build — no
   silent half-configuration.
2. **Backend (the property):** `CORS_ALLOWED_ORIGINS=https://<public-SPA-origin>`
   (`app.cors.allowed-origins`, `application.yml:120`). Exact origin(s), not `*`.
3. **Proxy CSP (the script flag):**
   `python3 scripts/spa-csp.py frontend/dist/frontend/browser/index.html --api-origin https://<api-origin>`
   → use the printed one-liner (API origin added to `connect-src` + `img-src`).
4. **Media:** nothing — resolved automatically against the baked-in base (§5).
5. **Both origins `https`** — `upgrade-insecure-requests` forces https on the cross-origin loads and
   the Bearer tokens must not ride plain HTTP.

## 8. What changed, and why it cannot affect local

| File | Change | Local impact |
| --- | --- | --- |
| `frontend/angular.json` (+21) | new `split-api` configuration (`:68-84`) | `production`, `development` and the defaults are byte-identical; `DocumentationFactsTest` reads only the `production` budgets — untouched and green |
| `frontend/src/environments/environment.split.ts` (new, 27) | split-origin environment file | compiled by no existing build — only the new configuration references it |
| `frontend/src/environments/environment.ts` (2/2) | comment-only, line-count preserving | the old comment said "must set this … (see README) before building" — the README documented no such procedure and no build-flag path existed; it now points at the real switch |
| `frontend/src/app/core/api-url.ts` + `api-url.spec.ts` (new) | resolver + `apiUrl`/`apiSrcset` pipes + 7 tests | identity for the `''` base every shipped build uses (spec-pinned) |
| 5 templates (12 one-line edits) + 5 component import lists | pipe application at the six media `<img>` sites | line-count preserving in the templates; with `''` the pipes return their input unchanged — 1590/1590 green including every guidance/admin component spec |
| `scripts/spa-csp.py` (+53/−8) | optional `--api-origin` flag + corrected docstring | flagless output byte-identical to the previous script (old-vs-new diff on the same fixture and a real build) |
| `docs/deploy/spa-csp.md` (+50/−2) | load-table rows for the API XHR + media, the "Split-origin deployment" section, stale hash pair re-derived | documentation only |
| `frontend/README.md` (+6/−1) | Deploy bullet now names the actual switch | documentation only; the guarded `N.NN kB raw` / SCSS-figure / proxy-mention checks re-verified green |

**Why local cannot change:** (a) every default build compiles the same environment value (`''`);
(b) both resolvers are the identity at `''` — byte-for-byte URLs, spec-pinned; (c) the flagless
`spa-csp.py` output is byte-identical — diff-pinned; (d) the `production`/`development` angular
configurations are byte-identical; (e) no backend file touched; (f) the full frontend suite passed
at baseline + exactly the 7 new tests.

## 9. Gates (all detached, exit files read)

- `cd frontend && npx ng test --watch=false` → **exit 0 — 1590/1590 passed, 66 files** (baseline
  1583 + 7 new; baseline 65 files + the new spec; nothing deleted or weakened).
- `npx ng build` (default = production) → **exit 0** (the standing 15-component SCSS budget warnings
  only — the documented, unchanged set).
- `npx ng build --configuration split-api` → **exit 0** — twice: once with a test origin (the origin
  verifiably baked into the bundle, §1) and once at the committed `''` (the shipped dist carries
  `apiUrl: `` `).
- Backend sources untouched → the full Maven gate was not owed; as a safety net for the
  README/`angular.json`/doc edits that `DocumentationFactsTest` inspects,
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp test -Dtest=DocumentationFactsTest` → **exit 0 —
  21/21, BUILD SUCCESS**.
- All gates ran on the combined tree: concurrent lane WIP was present
  (`admin-page.html/spec`, the guidance-list pin marker, `unconfirmed-view.ts`,
  `docs/security/operations.md`, `SourceVocabularyTest`) — disjoint hunks verified for
  `guidance-list-page.html` (mine at `:74/:76`, theirs at `:92+`); zero failures attributable to
  this lane's files.

## 10. Unverified / left for others

- **A real two-host deployment.** Untestable without a deployment target; each seam is verified in
  isolation (build seam — origin in bundle; CORS seam — property already env-driven; CSP seam —
  flag output; media seam — resolver pinned by spec).
- **`define` as a pure-JSON build switch** — empirically dead end (§1), recorded to save the next
  attempt.
- **Cross-lane finding (fixed in-lane, flagged for the docs lane):** the `script-src` hash pair in
  `docs/deploy/spa-csp.md` had gone stale against the committed `frontend/src/index.html` (last
  touched at `9795154`). This lane already claimed the file and the doc names the script as source
  of truth, so both hash lines were re-derived from the script's own output against
  `src/index.html` and a fresh build: `sha256-3Wmiy+…/sha256-uRaocgOj…` →
  `sha256-DLjLq71u…/sha256-8BqtEG4c…`. An operator pasting the old pair would have blocked the
  pre-paint scripts.
- **`upgrade-insecure-requests` interaction** (https SPA + http API ⇒ the browser upgrades the API
  load) is documented in the split section, not separately testable.

## Files for the parent's commit

`frontend/angular.json`, `frontend/src/environments/environment.ts`,
`frontend/src/environments/environment.split.ts` (new), `frontend/src/app/core/api-url.ts` (new),
`frontend/src/app/core/api-url.spec.ts` (new), the five guidance/admin templates
(`guidance-detail-page.html`, `guidance-list-page.html`, `guidance-order-list.html`,
`guidance-editor.html`, `media-panel.html`), the five matching components
(`guidance-detail-page.ts`, `guidance-list-page.ts`, `guidance-order-list.ts`,
`guidance-editor.ts`, `media-panel.ts`), `scripts/spa-csp.py`, `docs/deploy/spa-csp.md`,
`frontend/README.md`, this report, and the `CODE-REVIEW-NOTES.md` board line.
