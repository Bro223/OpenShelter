# SIMPLIFY-LOCATION — location-resolution lane

**Lane:** SIMPLIFY-LOCATION · **Branch:** `code-review` · **Mode:** behaviour-preserving simplification, no commit (parent commits).
**Scope (exclusive):** `src/main/java/ee/sheltermap/api/LocationController.java` + the location-resolution classes it delegates to (`app/LocationResolveService.java`, `app/RedirectClient.java`, `app/HttpUrlRedirectClient.java`, `app/MapsUrlCoordinates.java`, `app/LocationResolveException.java`, `app/LocationUpstreamException.java`, `api/LocationResolveRequest.java`, `api/LocationResolvedDto.java`) + the four test files pinning them. Nothing else.

**Standard applied:** `docs/autopilot/CODE-REVIEW-RUN.md` (rule 1 behaviour-preserving, rule 6 anchors, rule 7 lock, the readability standard), skills `clean-code`, `code-review`, `test-driven-development` from `docs/skills/`, targets from `reviews/code-review/be-recon.md`.

---

## 1. What was changed

Seven of the nine in-scope main files; `RedirectClient.java` and `LocationResolvedDto.java` needed no change (see §3). Zero test files touched, zero annotation text touched (OpenAPI snapshot gate proves it).

### 1.1 `app/LocationResolveService.java` — 249 → 281 lines (the recon's "deep nesting" target)

The `resolve` method carried the whole feature: entry parse + whitelist + normalize, the redirect-walk loop (budget check, fetch with a 3-type catch, the 5xx/terminal split, the per-hop re-validation), and the extraction — five levels of nesting in one method. It is now a flat four-step narrative; each step is a named private method with an early return:

| Method | Before (lines) | After (lines) |
|---|---|---|
| `resolve` | 53 (L97–149) | **15** (L97–111) |
| `validEntry` (new) | — | 14 (L119–132) |
| `followRedirects` (new) | — | 25 (L144–168) |
| `fetch` (new, the catch wrapper) | — | 7 (L172–178) |
| `budgetExhausted` (new) | — | 3 (L181–183) |
| `validatedHopTarget` | 21 (L190, 3 params) | **19** (L225, **2 params**) |
| `normalizeEntry` | 13 | 13 (unchanged body) |

Structure, behaviour-identical:

- `resolve`: `validEntry → null ⇒ NotFound`; `followRedirects → null ⇒ UpstreamFailure`; extract → `null ⇒ NotFound`; else `Resolved(lat, lng)`. The sealed `Outcome` vocabulary, `INSTANCE` singletons and all three constructors are untouched.
- `validEntry` = the old inline block verbatim (parse, `isHttpScheme` + `WHITELISTED_HOST.equalsIgnoreCase` + `getPort() != -1`, then `normalizeEntry`) — same check order, same comments, same `NotFound` mapping.
- `followRedirects` = the old loop with `return null` where the loop `return Outcome.UpstreamFailure` / `break` used to be: budget check **before** every fetch (including hop 0), the exact catch set `IOException | ClassCastException | IllegalArgumentException`, the `status >= 500 ⇒ UpstreamFailure` split, the re-validate-**before**-fetch order, and `return current` both on the terminal response and when the hop cap is reached.
- **Dead parameter removed:** `validatedHopTarget(current, currentScheme, location)` — `currentScheme` was assigned `"https"` once in `resolve` and **never reassigned** (the entry is normalized to https and scheme changes are rejected, so every URL in the walk is https). The effective check was always "target scheme is https"; it is now written that way (`!"https".equalsIgnoreCase(target.getScheme())`) with the pinned-https constraint commented. Verified equivalent hop-by-hop against every re-validation test (§2).
- Class javadoc: "design decision 4" id out; the hop bullet now states the effective rule ("an https scheme — the walk is pinned to the normalized entry's scheme") instead of the dead-parameter phrasing; the now-redundant "The https-only enforcement on HOPS is unchanged" sentence deleted. All guard rationale (whitelist + default port, ≤3 hops, re-validate-before-fetch, the Google host set, the 10 s budget rationale, the no-enumeration outcome vocabulary) kept verbatim.

### 1.2 `api/LocationController.java` — 112 → 111 lines

- `resolve` 17 → **9 lines**: acquire the per-IP permit (429 throw on miss), then `toResponse(resolveService.resolve(...))`.
- New named step `toResponse` (11 lines, L100–110): the sealed-outcome → HTTP-contract switch, moved out of the handler so the endpoint reads rate-limit → resolve → map. The 400/502 exception messages are byte-identical.
- Class javadoc: the 200/400/429/502 `<ul>` — a verbatim duplicate of the `@Operation`/`@ApiResponses` text (which is the OpenAPI surface) — cut to a pointer at the contract; the JWT/rate-limit/`ClientIps` constraints kept. The pointer-comment method javadoc ("see class docs") deleted (the `@Operation` summary names the method's job).
- All annotations byte-identical (`OpenApiSnapshotIT` green, §4).

### 1.3 `app/HttpUrlRedirectClient.java` — 65 → 74 lines

- `fetch` 26 → **16 lines**: a flat configure-connection → read-status-sequence. The URL pre-flight (parse + the http(s)-only scheme check, both `IOException("unfetchable redirect target: …")` paths — the test-pinned messages) moved to a named `fetchableTarget` (13 lines, L61–73) whose javadoc states the constraint (non-http(s)/malformed ⇒ the generic 502 vocabulary, never a 500).
- "design decision 4" id out of the class javadoc; all five guard bullets (timeouts, no auto-follow, no cookies, User-Agent, scheme gate) kept.
- `CONNECT_TIMEOUT_MILLIS` / `READ_TIMEOUT_MILLIS` / `USER_AGENT` names unchanged (package-private, referenced by `HttpUrlRedirectClientTest`).

### 1.4 Comment-to-constraint trims (no code lines)

- `app/MapsUrlCoordinates.java`: "design decision 4" out; "the 2026-09 `maps.app.goo.gl` redirect target" (×2) → "the **current** `maps.app.goo.gl` redirect target" (the date is history; the constraint is the current redirect shape). The pattern-order/decimal-comma/no-decoding constraints all kept — this file was otherwise already at the standard.
- `api/LocationResolveRequest.java`, `app/LocationResolveException.java`, `app/LocationUpstreamException.java`: the unresolvable "design decision 4" / "decision 4" references cut (no in-repo document defines that numbering); the 400/502 single-message contract statements kept.

Residual planning-id / dated-history references in scope: **0** (grep `design decision|decision 4|2026-09` → no hits).

## 2. What was deliberately left, and why

- **All guards, byte-for-byte in effect** (rule 1 of the brief): entry host whitelist + default-port check + http(s) scheme; entry normalization (http→https upgrade, userInfo drop, raw path/query/fragment preserved); the ≤3-hop cap; the per-hop re-validation **before** every fetch (https scheme / default port / `maps.app.goo.gl`+`google.com`+`*.google.com` host set, case-insensitive); the monotonic 10 s budget checked before every hop; the `IOException | ClassCastException | IllegalArgumentException` catch set; the 3 s/5 s connect/read timeouts; `setInstanceFollowRedirects(false)`; the never-read-the-body discipline; the one-generic-400 / one-generic-502 vocabulary and both exception messages; the 429 bucket and its keying via `ClientIps`.
- **`MapsUrlCoordinates.firstPair`'s three matcher blocks** — they look like "repeated switches" (exclamation / at / search each: match → decimal-comma check → fallback) but they are **not** interchangeable: `EXCLAMATION_PAIR` has *no* decimal-comma check because a comma decimal cannot match that pattern structurally (the regex requires `!4d` immediately after the first group), while `AT_PAIR` and `SEARCH_PAIR` need the check + the generic-fallback pass-through. Unifying them would trade the stated constraint for a conditional flag — exactly the terseness-for-clarity trade the run doc forbids. Left as is.
- **Null sentinels from the new private helpers** (`validEntry`, `followRedirects`, `fetch`, `validatedHopTarget`) — each javadoc states exactly what `null` means and which outcome it maps to. The alternative (a wrapper result type per private method) is a heavy construct for a two-way branch; the sealed `Outcome` stays at the public boundary where it belongs.
- **`RedirectClient.java`, `LocationResolvedDto.java`** — already at the standard (interface + record with a constraint javadoc; a 2-field DTO whose field names are the frontend contract — "do not rename"). Zero diff.
- **`GeoPoint`** (domain package) — out of scope, untouched.
- **The recon's §3.8 four-controller client-IP trio** (`ClientIps.resolve` + the two `@Value` fields repeated in `AuthController:236`, `AccountController:260`, `VerificationController:110`, `LocationController:97`) — de-duplication needs a shared component outside my scope; filed as a notes-board observation, not fixed.
- **No test file modified** — the four pinning suites plus `ApiErrorHandlerTest` are the evidence, read-only.

## 3. Guard evidence — every guard test passed unmodified

Test files in scope: byte-identical to HEAD (`git status` shows no modification under `src/test/java/ee/sheltermap/{app,api}/` for any location file; the only changed test file in the tree at gate time was the foreign in-flight `sitetexts/SiteTextsServiceTest.java`).

Per-class results from the post-change full gate (all green):

| Suite | Tests | What it pins |
|---|---|---|
| `app/LocationResolveServiceTest` | **26/26** | host whitelist (non-whitelisted host / non-http scheme / non-default port ⇒ 400, never fetched); http→https entry upgrade; userInfo drop; ≤3-hop cap (4th hop never fetched); **all seven re-validation cases** (cloud-metadata IP, loopback+port, http scheme change, protocol-relative foreign host, malformed `Location` ⇒ 502 not 500, `file:` scheme); 10 s budget stops the walk; timeout/network/`ClassCastException` ⇒ 502; 5xx ⇒ 502 / 4xx ⇒ 400; Estonia bbox + auto-swap; the 2026-09 `/search/` target shape |
| `api/LocationResolveIT` | **3/3** | 401 unauthenticated; 200 `{latitude, longitude}`; 429 per-IP 5/min bucket |
| `app/HttpUrlRedirectClientTest` | **8/8** | redirect reported not followed (target never fetched); polite User-Agent; deterministic status pass-through; 301 pass-through; non-http(s)/malformed ⇒ `IOException` with the pinned message; **the 3 s/5 s timeouts** |
| `app/MapsUrlCoordinatesTest` | **2/2** | the full URL→pair fixture table (incl. decimal-comma parity rows) + null URL |
| `api/ApiErrorHandlerTest` | **12/12** | the 400/502 exception→status mapping |
| `api/OpenApiSnapshotIT` | **1/1** | `docs/api/openapi.json` byte-identical — proof every annotation in scope survived verbatim |
| `config/DocumentationFactsTest` | **21/21** | the guarded-anchor guard, green in the gate |

## 4. Gates

| Run | Command | Result |
|---|---|---|
| Baseline (pristine tree, before any edit) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — 1349/1349, BUILD SUCCESS, 2:42 (log `/tmp/simplify-location-baseline.log`). Compilation finished 22:00:28; my first file write landed 22:02:12 — the baseline provably ran the pristine tree. |
| Post-change (final) | same | **exit 0** — **1349/1349, 0 failures**, `pmd:check` clean (no violations reported), `jacoco:check` "All coverage checks have been met" (0.93 LINE floor), BUILD SUCCESS 2:57 (log `/tmp/simplify-location-postgate.log`). No wall of missing-class errors. |

Test count 1349 → 1349: no test added, deleted or weakened.

One self-inflicted incident, for the record: my first post-change gate attempt (22:06:30) was killed by my own `pkill` while it was mid-`clean` ("Failed to delete …/target"), exit 1 — a tooling accident, not a code failure; the run above is the evidence.

## 5. Anchors (rule 6)

**None owed.** `docs/agent/00-CURRENT-STATE.md` cites no file in this scope (grep-verified for all nine file names plus `Location`/`geo`/`resolve`/`goo.gl`/`Redirect`/`MapsUrl` — zero hits), and `DocumentationFactsTest` references only the `LocationResolvedDto` *schema name* (MIRROR_ALIASES), which is unchanged. The file still exists with the same name and fields. The 21/21 guard pass in the gate confirms no citation shifted.

## 6. Foreign state observed at gate time

The working tree carried another lane's in-flight work at both gate times: five frontend files (`api-client.ts`, `i18n-template-guard-scanner.ts`, `locale.ts`, `account-page.ts`, `submit-shelter-page.ts` — Maven-irrelevant) and `sitetexts/{SiteTextsService,SiteTextKeys}.java` + `SiteTextsServiceTest.java` (a sitetexts lane, in its mutation-verification phase, files stable since 22:05:30). All of it was green in my post-change gate (incl. `SiteTextsServiceTest` 15/15) — **no foreign failures** to name. The previously shared-red `DocumentationFactsTest` theme-tokens anchor was already re-derived upstream (commit `e4ea68e`); both my gates show it green.

## 7. Unverified / not covered

- No live `maps.app.goo.gl` request was made — the upstream behaviour is pinned at the `RedirectClient` seam (the design's own boundary; `LocationResolveIT` stubs the seam for the same reason). The 2026-09 `/search/` target shape is pinned by the live-verified fixture, untouched.
- The dead-`currentScheme`-parameter removal is proven by the seven re-validation tests above, not by a standalone diff argument — I traced every test case against both formulations, but a reviewer may want to double-check the `https`-pinned phrasing in `validatedHopTarget` against the class javadoc.
- The `LocationController`/`app` files' OpenAPI descriptions were verified byte-identical by the snapshot gate, but I did not independently diff the generated document (the test normalizes and compares it — that is the sanctioned check).
- Frontend half of the feature (`shared/location-input.ts` parity): out of scope, untouched; the parser-parity claim rests on the existing fixture-table tests, which passed.

**Files for the parent's commit:** the seven modified main files listed in §1 + this report + one notes-board claim line. Nothing else.
