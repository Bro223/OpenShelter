# Agent 11 — Integration (FE↔BE) and DevOps (setup)

READ-ONLY review. The only file I created is this report. Every claim below was verified against **both**
sides of the contract — and, where possible, against the running services (`:8080`, `:5173`) — or by running
the gate that guards it. Where I could not verify something I say so instead of guessing.

Tree judged: `d247007` **plus the uncommitted admin-lane work** (`git status`: 41 modified files — the admin
lane's sources/docs, this sweep's other review reports, `qa/accessibility-checklist.md` — and 5 untracked
paths: the two new ITs, the lane report and the two earlier review-run directories), treated as
landed-but-uncommitted.

## Versions detected first (baseline for every judgement below)

| Side | Version | Source |
| --- | --- | --- |
| Java (target) | 21 (property) — local runtime Temurin 21.0.7; the running app uses JDK 27.0.0 | `pom.xml:21`, local toolchain, `ps` |
| Spring Boot | **3.5.16** | `pom.xml:10` |
| springdoc / jjwt / jsoup / bcprov / proj4j / twilio / spring-dotenv | 2.8.17 / 0.12.7 / 1.23.2 / 1.78.1 / 1.3.0 / 10.9.2 / 4.0.0 | `pom.xml:21-33,56,148` |
| Testcontainers | 2.0.5 (property override of the Boot-managed BOM version) | `pom.xml:23`, live classpath |
| Persistence | PostgreSQL 16, Flyway 11.7.2, Hibernate 6.6.53, Spring Data JPA 3.5.13 | live classpath |
| Angular / CLI | 22.1.x (`@angular/build` 22.1.7) | `frontend/package.json:13-25` |
| TypeScript / rxjs / Leaflet | ~6.0.2 / 7.8 / 1.9.4 | `frontend/package.json:16-24` |
| FE test stack | Vitest 4.0.8 + jsdom 28, `@angular/build:unit-test`, no e2e framework | `frontend/package.json:24-28`, `frontend/angular.json:80-85` |
| Node (required) | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` (installed: v26.8.2, npm 11.19.1) | `frontend/node_modules/@angular/build/package.json` engines |

**Suites re-run by me on this tree** (not taken on trust):
`npx ng test --watch=false` → **59 files / 1398 tests passed, exit 0**.
`mvn -Dtest=CorsExposedHeadersIT,AdminModerationIT,AdminGuidanceSearchPagingIT test` → **exit 0,
surefire 2+20+9 = 31 tests, 0 failures** (the new paging + CORS gates are genuinely green).

---

## Review

### Correct (checked and clean — with the evidence that makes it a fact, not an opinion)

1. **Every frontend call resolves to a real backend endpoint with the right verb — clean.** I extracted all
   `this.api.<verb>(<literal>)` call sites from `frontend/src/app/gateways/*-gateway.ts` and normalised them
   exactly like the committed gate does: **59 literal-argument calls, 0 mismatches** (path exists *and* the
   OpenAPI operation for that path carries the same verb). The four helper-built paths
   (`adminSheltersPath`, `guidanceListPath`, `guidanceListPagePath`, shelter `listPath`) are all GET and their
   snapshot paths are `get`. No frontend call hits a non-existent endpoint and none uses a wrong verb. The
   only HTTP surface outside `ApiClient` is the external Nominatim fetch (`gateways/geocode-gateway.ts:67`).
2. **Request-body DTOs match field-for-field — clean.** I mechanically compared **every** same-named FE
   interface in `core/models.ts` against its OpenAPI schema (fields, not prose): the only differences are
   *API-only* fields (deliberate extras), and **zero FE-only fields anywhere** — i.e. no request or response
   DTO declares a field the API does not send. That covers `RegisterRequest`, `LoginRequest`,
   `PasswordReset*`, `Verify*`, `Change*`, `ProfileUpdateRequest`, `Create/UpdateShelterRequest`,
   `ReportShelterRequest`, `ReportOccupancyRequest`, `PutOpenStatusRequest`, `ReviewShelterRequest`,
   `Create/UpdateGuidancePostRequest`, `Create/UpdateGuidanceTranslationRequest`, `ReorderGuidanceRequest`,
   `SiteTextEntryDto`.
3. **The new admin paging contract agrees on both sides — clean.** `limit`/`offset` (names, int types),
   `X-Total-Count` (name, presence, semantics), and the `source` filter. Live proof against the running
   backend (admin JWT):

   ```text
   GET /admin/shelters?limit=2&offset=0                  -> 200, 2 rows, X-Total-Count: 308
   GET /admin/shelters?source=REGISTRY&limit=1&offset=0   -> 200, 1 row,  X-Total-Count: 300
   GET /admin/guidance?limit=2&offset=500                 -> 200, [] ,    X-Total-Count: 8
   GET /admin/shelters?limit=0|201 / offset=-1            -> 400 "limit must be between 1 and 200" /
                                                                 "offset must be non-negative"
   ```
   The frontend reads the header through `ApiClient.getWithHeaders` (`core/api-client.ts:36-45`, the only
   caller of `observe:'response'`), converts it in `pagedResult` (`gateways/admin-gateway.ts:557-566`) and
   degrades to the page length when the header is absent; the FE's size selector clamps to 10…100
   (`admin-page.ts:2044-2053`), inside the backend's 1…200. `source` enum equality:
   `models.ts:50` `'ALL'|'REGISTRY'|'USER'` = `api/ShelterSourceFilter.java:10-12`, and REGISTRY = PÄÄSTEAMET
   + MUNICIPALITY on the server (`ShelterSourceFilter.sources()`), which the live 300 + 8 = 308 confirms.
4. **The new CORS exposure of `X-Total-Count` is real and gated.** `SecurityConfig.java:178` sets
   `setExposedHeaders(List.of("X-Total-Count"))` on the `/**` configuration; `CorsExposedHeadersIT` (new)
   asserts the full chain with a real `Origin` header (exposure present for the configured origin, absent for
   a foreign one) — I ran it green, and the running (pre-change) instance already returns
   `Access-Control-Allow-Origin` on `/admin/shelters`, so the exposure applies to the admin paths too, not
   only the `/api/guidance` path the IT exercises.
5. **The committed OpenAPI snapshot is in sync with these sources.** `OpenApiSnapshotIT` fails when the
   snapshot is stale; the working-tree `docs/api/openapi.json` diff is confined to `GET /admin/shelters`
   (params, header, description, the `source` enum), and the frontend's two contract gates read that same
   file — so both contract gates agree with the working tree.
6. **`models-contract.spec.ts` (new) closes the F1 class mechanically.** 29 FE response interfaces are pinned
   subset-wise against the snapshot schemas (I walked the `PINNED` table); `AdminOccupancy` and
   `ShelterOccupancy` both pin to `Occupancy`, with an explicit second assertion for that pairing.
7. **The three response shapes the new spec does *not* pin are nonetheless correct** (verified by hand
   against the snapshot, which is why I do not report them): `ReviewShelterResponse{ok}` ↔
   `AdminController.java:290` `Map.of("ok", true)` (snapshot: `additionalProperties: boolean`);
   `AdminShelterHistoryEvent`/`AdminShelterHistoryFieldChange` ↔ `AdminShelterHistoryDto`/`FieldChange`
   (identical six/three fields); `LocationResolved{latitude,longitude}` ↔ `LocationResolvedDto`
   (identical, and the schema's own description names the FE model as the contract).
8. **`.gitignore` / repo hygiene — clean.** `.env` is ignored and untracked (`.gitignore:38-40`), no
   `target/`, `dist/`, `.angular/`, `.vitest/` or bytecode is tracked, `frontend/package-lock.json` **is**
   tracked (so `npm ci` is viable for CI), and the only ignored-but-cited docs are the two
   `docs/code-review/2026-09-08-*` files — see H1, which is now handled.
9. **The dev setup that exists is good.** `docker-compose.yml` (postgres:16 + healthcheck), `dev-start.sh`
   (profile pinning + a Postgres pre-flight with an actionable message) and README steps 1/5 match reality
   (`/actuator/health` → `{"status":"UP"}`, `:5173` → 200). `frontend/proxy.conf.js` is method/`Accept`-aware
   for the `/account` route-or-API ambiguity and is well commented.
10. **Dependencies are current; no EOL or known-vulnerability concern found.** Boot 3.5.16, Angular 22.1,
    TS 6.0, Vitest 4, jsdom 28, postgres 16, Flyway 11.7.2, Tomcat 10.1.55, logback 1.5.34. The only dated
    libs are `proj4j 1.3.0` and `bcprov-jdk18on 1.78.1` (both still maintained, no advisory) — the real gap
    is that nothing scans them (see H1/L6: no CI at all).

### Confirmed fixed by earlier agents (verified by me, not re-reported as findings)

| Earlier finding | Status on this tree | Evidence |
| --- | --- | --- |
| F1 `AdminOccupancy.reportedAt` vs API `lastReportedAt` | **Fixed** | `models.ts:515-519` declares `lastReportedAt` with the history in a comment; `models-contract.spec.ts` + `gateways/admin-gateway.spec.ts:25` fixtures updated |
| F3 `DELETE /account` not proxied | **Fixed, properly** | `proxy.conf.js:40` keys `/account` with a navigation bypass (not the naive `"/account"` swap) |
| F2 bilingual machinery had zero consumers | **Mostly fixed** | `guidance-detail-page.html:58-64` renders the `localeFallback` notice and links `alternates`; 4 of the 5 translation endpoints are reachable from the admin UI (`admin-page.ts:1806,1630,1854`). Two pieces remain unused — see L3 |
| F5 test profile shadowed the main yml | **Fixed, with a new guard** | `src/test/resources/application-test.yml` (overlay) + `config/TestConfigOverlayTest` (delta allow-list, fails the build on a shadow) + `@ActiveProfiles("test")` on `AbstractPersistenceIT:43` |
| F8 `PII` keys / Node in the README | **Partly fixed** — keys are in the config table (`README.md:572`), Node still missing | see M4 |
| F10 tail — `MediaAssetDto.sourceUrl`, `ShelterDto.provenance` unread | **Still true** | see L5 |

### Fixed

None — read-only review; no source file was modified. I created only this report.

---

## Findings

Severity uses the COMMON-RULES scale. Mapping: Critical/P0 = blocks merge; High/P1 = fix before release;
Medium/P2 = plan it; Low/P2 = report only.

### High

#### H1 — The backend suite fails on a CLEAN CHECKOUT at `d247007`: the README cites a gitignored document (fixed in the working tree, but only there)

* **Where (HEAD).** `README.md:645` (`git show HEAD:README.md`) cites
  `` `docs/code-review/2026-09-08-review-output.md` ``; that file is **gitignored**
  (`docs/code-review/.gitignore:5`) and not in `git ls-files`. The guard is
  `DocumentationFactsTest.everyRepositoryPathCitedInTheReadmeExists` (`src/test/java/ee/sheltermap/config/DocumentationFactsTest.java:129-141`),
  which fails on any path cited in backticks that does not exist on disk.
* **Proof (a clean checkout, not a guess).** I exported the committed tree with
  `git archive HEAD | tar -x -C /tmp/cleancheck` and ran the test there:

  ```text
  [ERROR] Tests run: 4, Failures: 1, Errors: 0, Skipped: 0 <<< FAILURE! -- in ee.sheltermap.config.DocumentationFactsTest
  [ERROR] ee.sheltermap.config.DocumentationFactsTest.everyRepositoryPathCitedInTheReadmeExists
  java.lang.AssertionError:
  [README.md cites repository paths that do not exist]
  Expecting empty but was: ["docs/code-review/2026-09-08-review-output.md"]
  ```
  (Two of the four lines are re-ordered for brevity; the failure text is verbatim.)
  The same test in the working tree: **4 tests, 0 failures** (the uncommitted README edit rewrites the two
  citations to the tracked `docs/code-review/README.md`, `README.md:67-68` and `:646-648`).
* **Why it matters.** This is the answer to "can CI be green at all": **not against `d247007`** — a fresh
  clone fails a backend test on every machine, before any CI runner config is even relevant. Today it is
  masked because every existing checkout still has the ignored file on disk.
* **Suggested fix.** Land the README edit (it is already written) and, while doing so, add the CI job (L6) so
  the class of failure is caught by a runner rather than by a reviewer; a clone-without-ignored-files check
  (`git clean -xdn`-style) in that job is the durable guard.

### Medium

#### M1 — The README's API table no longer documents the paging contract the frontend depends on, and the `source` parameter changed meaning under a documented URL

* **Where.** `README.md:392` (`GET /admin/shelters`) still reads "`status`/`source` **exact-match filters**"
  with no `limit`/`offset` and no header; `README.md:371` (`GET /api/guidance`) documents neither its
  `limit`/`offset` nor its paging semantics; `README.md:395` (`GET /admin/reports`) omits the `limit` that
  exists in the snapshot. The string `X-Total-Count` appears **0 times** in `README.md`
  (`grep -c` = 0) although three endpoints return it and the frontend relies on it
  (`gateways/guidance-gateway.ts:89-95`, `gateways/admin-gateway.ts:85,271`).
* **Behaviour change, live:** `GET /admin/shelters?source=PAASETEAMET` — legal before this lane, still
  documented as the vocabulary on `README.md:392` — now answers **400 `Malformed request`** (the enum is
  `REGISTRY|USER|ALL`). Verified against the running backend. Any bookmark, script or stale doc link using
  the old exact-source values breaks, and the only place that records the change is the OpenAPI snapshot.
* **Why it matters.** The README is the human contract (`DocumentationFactsTest` guards the *mappings* only,
  never params), and it now teaches the wrong filter vocabulary for one endpoint while hiding the paging
  contract of three. The failure mode for a reader is a 400 they cannot explain from the docs.
* **Suggested fix.** Update the three rows and add one sentence on `X-Total-Count` (the snapshot's own
  wording is good: "the number of rows in the (filtered) scope WITHOUT the paging applied, always present");
  state that `source` is the public-list grouping `REGISTRY|USER` and that the pre-change exact values are
  now a 400.

#### M2 — The new 400 `@ApiResponse` silently dropped the uniform error body from the committed snapshot for `GET /admin/shelters`

* **Where.** `AdminController.java:116-117` adds a method-level
  `@ApiResponse(responseCode = "400", description = …)` with **no `content`**. The global customizer only
  attaches the uniform body to a status the operation does *not* declare
  (`config/OpenApiConfig.java:133-137`, `attachIfAbsent`), so springdoc fell back to the operation's return
  type. The regenerated snapshot (`docs/api/openapi.json`) now documents the 400 as
  `*/*: {type: array, items: $ref AdminShelterDto}` where HEAD documented
  `application/json: $ref ErrorResponse`.
* **Proof.** `git diff -- docs/api/openapi.json` on this tree, hunk `@@ -4402,17 +4420,30 @@`; the live 400
  body is the uniform `ErrorResponse` (`{"timestamp":…,"status":400,"error":"Bad Request","message":"limit
  must be between 1 and 200","path":"/admin/shelters"}`), not an array.
* **Why it matters.** The committed snapshot is the machine-readable contract (and the only artifact the
  frontend gates read); it currently tells any consumer that a 400 returns shelter rows. The sibling
  `/admin/guidance` and `/api/guidance` operations share the same flaw, so the fix is worth making general.
* **Suggested fix.** Add
  `content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))`
  to the 400 — the repo's own idiom, already used for exactly this case at `api/ShelterController.java:181-184`
  (`GET /api/shelters`, whose snapshot 400 is correctly `application/json: $ref ErrorResponse`) — and satisfy
  the same for the two guidance 400s, then regenerate with
  `mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`.

#### M3 — Media URLs are still origin-relative, so the cross-origin deployment the docs describe renders every image as 404

* **Where.** `guidance/MediaService.java:50` `MEDIA_URL_PREFIX = "/api/media/"`; live
  `GET /api/guidance?locale=en` returns `heroImageUrl: "/api/media/2540786f….jpg"`. The frontend binds those
  strings straight into `[src]` (`features/guidance/guidance-detail-page.html:27`,
  `features/guidance/guidance-list-page.html:50`, `features/admin/guidance-editor.html:135,188`,
  `features/admin/admin-page.html:1085`, `features/admin/guidance-order-list.html:67`); only `ApiClient`
  prefixes `environment.apiUrl` (`core/api-client.ts:22`).
* **Why it matters.** `frontend/src/environments/environment.ts:8-25` and `frontend/README.md:140-145` tell a
  deployment with the API on another origin to set `apiUrl` to that origin — in exactly that configuration
  every JSON call works while **every hero image and admin thumbnail 404s** against the SPA's origin. No
  test covers it (the FE never prefixes these fields; the BE never absolutizes them).
* **Suggested fix.** One mapping helper on the frontend applied where DTOs are adopted (or a configured
  public base on the backend); alternatively state that same-origin is mandatory and delete the cross-origin
  instruction from `environment.ts`/`frontend/README.md`.

#### M4 — A new developer still cannot run the project from the README as written

* **Where / what is wrong.**
  1. **No `.env` step, and it is mandatory.** `PiiKeys` throws on a blank key in **every** profile
     (`security/PiiKeys.java:34-40,46-51`), fed by `application.yml:104-105` (`${PII_AES_KEY:}`); no
     `.env.example` ships (`ls .env*` → only the gitignored `.env`; `README.md:540` merely "reserves" the
     convention). `./dev-start.sh` checks Postgres but never the keys, so step 4 of the quickstart
     (`README.md:463-498`) dies on `IllegalStateException: PII_AES_KEY is not set` on a fresh clone — while
     the same section claims "steps 1, 4 and 6 are all it takes to run the application".
  2. **No Node requirement, and the one that exists elsewhere is wrong.** `README.md:465` lists
     "JDK 21, Maven 3.9+, Docker (Compose)"; `frontend/README.md:29` says "Node 22+", but
     `@angular/build@22.1.7` engines are `^22.22.3 || ^24.15.0 || >=26.0.0` and
     `frontend/package.json` has **no** `engines` field, so Node 22.0–22.21 passes the documented check and
     then fails cryptically.
  3. **Two stale setup strings:** `frontend/README.md:47` names `--proxy-config proxy.conf.json` (the file is
     `proxy.conf.js`, `frontend/package.json:6-7`), and `README.md:492` still lists the proxied prefix as
     `/account/` — the exact spelling that was the pre-fix bug (the config now keys `/account` with a bypass).
* **Why it matters.** "Can a new developer run this from the README today?" — not without reverse-engineering
  a `.env` from a section 100 lines further down, and not on the Node versions the doc admits.
* **Suggested fix.** Add `.env.example` (with `openssl rand -base64 32` placeholders for
  `PII_AES_KEY`/`PII_HMAC_KEY`, `JWT_SECRET`, `ADMIN_*`), reference it as step 0, add
  `Node.js 22.22+ (or 24/26)` to the requirements line plus an `engines` field, and correct the two strings.

### Low

#### L1 — `frontend/README.md` bundle numbers are stale (measured today: 720.87 kB and eight style warnings)

* **Where.** `frontend/README.md:152-155`: "Measured initial total on a fresh build (2026-09-18): **670.83 kB
  raw / 165.10 kB transfer** … a fresh build prints a bundle-budget warning (four component SCSS budgets warn
  as well: **admin-page, shelter-detail-page, map-page, page-shell**)".
* **Measured by me on this tree** (`npx ng build`, exit 0): **Initial total 720.87 kB raw / 175.40 kB
  transfer**, and **eight** component-style budget warnings — the listed four **plus**
  `guidance-order-list.scss`, `guidance-translations.scss`, `guidance-editor.scss`, `submit-shelter-page.scss`
  (nine warnings printed including the initial-bundle one, which is presumably where the earlier "nine"
  came from; the lane's own note says seven). Budgets themselves are unchanged
  (`frontend/angular.json:44-56`).
* **Why it matters.** The date makes the number "historical", but the parenthetical is a present-tense claim
  about which files warn, and the arithmetic derived from 670.83 ("exceeds by 110.83 kB") is wrong now. A
  contributor chasing the warning hunts four files instead of eight.
* **Suggested fix.** Re-measure and restate (or rephrase to "the initial bundle exceeds the 560 kB warning
  budget, and eight component stylesheets exceed the 4 kB one" and drop the now-meaningless delta).

#### L2 — `admin-gateway.ts` claims "The twenty-nine endpoints, 1:1"; the file has 32 methods (31 doc lines, two of them the same endpoint, `PUT /admin/site-texts` missing)

* **Where.** `frontend/src/app/gateways/admin-gateway.ts:36` (the count) and the list at `:38-68`. The class
  implements **32** methods; the backend has **32** `/admin/*` operations in the snapshot; the doc list has
  31 lines but lists `GET /admin/guidance` **twice** (bare and with its params) and omits
  `PUT /admin/site-texts`, while `putSiteTexts` is a method of the class.
* **Why it matters.** The block is the reader's map of the admin API; a wrong count and a missing endpoint
  make it unreliable exactly where a reviewer looks first.
* **Suggested fix.** Say "the thirty-two endpoints, 1:1", merge the two guidance lines, add the
  `PUT /admin/site-texts` line.

#### L3 — Two translation surfaces still have no caller

* **Where / who calls what.** `updateGuidanceTranslation` (`admin-gateway.ts:428-434`) is called **only** from
  `admin-gateway.spec.ts:657-660`; production edits go through the locale-scoped
  `updateGuidancePost(id, request, contentLocale)` (`admin-page.ts:1639-1644`), which the backend routes into
  that locale's translation row. `POST /admin/guidance/{id}/translations/attach`
  (`api/AdminGuidanceController.java:637-658`) has **no frontend consumer at all** — it is the only backend
  path besides `/api/media/{filename}` (which is bound indirectly through DTO `src` URLs) that no gateway
  literal references.
* **Why it matters.** The earlier "five unused translation endpoints" finding is now down to these two, but a
  spec-only gateway method is dead weight that reads as a live capability, and the "attach an existing post
  as a translation" flow (the documented way to pair two existing posts) is unreachable from the product.
* **Suggested fix.** Either use `updateGuidanceTranslation` from the translation editor (or delete it if the
  scoped post update is the intended seam) and add the attach action to the translation panel, or mark both
  as intentionally deferred in the gateway doc.

#### L4 — `GET /admin/reports?limit=` is implemented and snapshotted but never sent, and undocumented

* **Where.** The param exists and is validated (`docs/api/openapi.json` `/admin/reports` → `limit` 1…200
  default 100); the gateway sends only `shelterId` (`admin-gateway.ts:202-205`); `README.md:395` documents
  only `?shelterId=`.
* **Why it matters.** The report queue is the one admin list that is still unbounded from the UI, and its
  server-side cap is invisible; the API's own answer ("exactly `limit` rows means the queue was truncated")
  cannot be acted on by the UI.
* **Suggested fix.** Send the cap (e.g. 100) and surface truncation, or document why the UI ignores it.

#### L5 — `ShelterDto.provenance` and `MediaAssetDto.sourceUrl` are still unconsumed (the surviving half of the earlier F10)

* **Where.** Neither is declared in `frontend/src/app/core/models.ts` (`models-contract.spec.ts` lists both as
  deliberate API-only extras); the FE's `provenance` hits are the unrelated footer "data provenance" copy
  (`shared/page-shell.ts:58`, `i18n/messages.ts:69`) and the badge labels are still derived from
  `source` + `reviewStatus` in `shared/shelter-copy.ts`. The server still computes `Provenance.of(...)` for
  every row (`ShelterQueryService.java`, `api/ShelterDto.java:207-215`) and documents it as the single source
  of truth.
* **Why it matters.** Two vocabularies for "where did this row come from" — a server-side taxonomy the admin
  badges are documented to use and a client-side derivation that cannot express `REPORTED_INACTIVE`. A change
  in the server's precedence changes no pixel.
* **Suggested fix.** Consume `provenance` in the badge logic and delete the duplicated derivation, or drop
  the field (and `sourceUrl`) from the API.

#### L6 — No CI, no application image, and no dependency scanning (unchanged; now clearly the top setup gap)

* **Where.** `find` over the tree (excluding `node_modules`/`.git`) returns **no** `Dockerfile*`, no
  `.github/`, no `.gitlab-ci.yml`/`Jenkinsfile`, no `*.tf`; `docker-compose.yml` contains only the dev
  database; `README.md:717` ("## Production deployment") is a manual deploy checklist. No `mvnw`/`.mvn/wrapper`
  either.
* **Evidence this matters today.** H1 is exactly the failure a CI job would have caught, and M1/L1 are docs
  nobody re-measures. Both suites are green *only* on machines that happen to have JDK 21 + Maven + Docker +
  Node 22.22+, and the PII keys of M4/1 are the difference between "green" and "cannot boot".
* **Suggested fix.** A minimal job: `mvn -B -ntp test` (Testcontainers needs Docker) +
  `cd frontend && npm ci && npx ng test --watch=false` (the frontend gates read the committed snapshot, so
  order does not matter as long as both run), plus a multi-stage `Dockerfile` (JDK 21 build → JRE 21 run,
  `SPRING_PROFILES_ACTIVE=prod`, no `.env` copied). Add Dependabot/OWASP dependency-check if scanning is
  wanted, since nothing currently watches Boot/Angular CVEs.

---

## Notes on verification limits (so nobody re-derives them)

* The **running** backend (`:8080`, started 20:35) predates the working tree's `SecurityConfig` edit (22:43),
  so its responses still lack `Access-Control-Expose-Headers` on paged endpoints. That is a stale process,
  **not** a defect: `CorsExposedHeadersIT` (run green by me) proves the change, and the pre-change instance
  already returns `Access-Control-Allow-Origin` on `/admin/shelters`, i.e. the CORS filter does process
  admin requests. Restart before re-probing.
* I re-ran `npx ng build` and the frontend suite myself (counts above). I did **not** re-run the full backend
  suite (1139 claimed); I ran the three classes that touch this lane's contract (31 tests, green) plus the
  decisive `DocumentationFactsTest` in both the clean HEAD archive and the working tree.
* Sandbox note: my `ng build`/probes wrote only to `/tmp` and to gitignored build output (`frontend/dist`,
  `target/`); no tracked file was touched.

## Merge verdict

**OK with notes.** The integration itself is in good shape: 59/59 frontend calls match real endpoints with
the right verbs, request DTOs match field-for-field, the new admin/guidance paging contract
(`limit`/`offset`/`X-Total-Count`/`source`) agrees on both sides and is proven live, the CORS exposure the
frontend needs is added *and* gated, both suites are green on this tree, and the F1/F3/F5 fixes from the
previous sweep are real and verified (F3 in particular was fixed properly, not patched). Nothing here
corrupts data or leaks anything, so there is no P0 in the working tree.

Two things keep it out of a clean "OK": **H1** — the committed HEAD cannot pass a clean checkout, and the
fix lives only in uncommitted bytes, so it must land with this lane; and **M1/M2** — the documented contract
(README prose end-to-end, and the OpenAPI error body for the endpoint this lane changed) is now wrong or
silent where the frontend depends on it. M3/M4 are the standing DX debts (cross-origin images, un-runnable
quickstart), and L6 is the reason all of them can recur unnoticed.

## Top 5 findings

1. **H1 — a clean checkout of `d247007` fails `DocumentationFactsTest`** (`README.md:645` HEAD cites the
   gitignored `docs/code-review/2026-09-08-review-output.md`; proven by running the test in
   `git archive HEAD` → 1 failure; the working tree passes because the uncommitted README edit rewrites the
   citation). This decides whether CI can be green: it cannot, until that edit lands.
2. **M1 — the README's API table no longer matches the paging contract**: `X-Total-Count` appears 0 times,
   `limit`/`offset` are missing from `GET /api/guidance`, `GET /admin/shelters` and `limit` from
   `GET /admin/reports`, and `GET /admin/shelters` still advertises "exact-match" `source` values that now
   answer **400** (`?source=PAASETEAMET`, verified live: `{"timestamp":…,"status":400,"error":"Bad
   Request","message":"Malformed request","path":"/admin/shelters"}`).
3. **M2 — the new 400 annotation silently replaced the uniform `ErrorResponse` with "an array of
   AdminShelterDto" in the committed snapshot** (`AdminController.java:116-117` + `OpenApiConfig.java:133-137`
   `attachIfAbsent`; the live body is the uniform error, and `ShelterController.java:181-184` shows the idiom the
   fix should copy). The frontend gates read that snapshot.
4. **M3 — media URLs are origin-relative** (`MediaService.java:50`, live `heroImageUrl: /api/media/….jpg`,
   bound straight into `[src]`), so the documented cross-origin deployment (`environment.ts:8-25`,
   `frontend/README.md:140-145`) breaks every hero image and admin thumbnail with no test to catch it.
5. **M4 — the quickstart is still not runnable as written**: no `.env` step although `PiiKeys` fails closed
   in every profile (`PiiKeys.java:34-51`, `application.yml:104-105`, no `.env.example`), no Node requirement
   in `README.md:465` and a wrong one in `frontend/README.md:29` ("Node 22+" vs `^22.22.3 || ^24.15.0 ||
   >=26.0.0`, no `engines` field) — with **L6** (no CI, no app image) as the structural reason none of this
   is caught.
