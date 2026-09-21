# Agent 12 — Summary of the eleven-review sweep

Read-only synthesis. The only file created is this one; no other file was modified, no suite was
re-run, and no finding below was re-derived from the code. The two exceptions are called out
explicitly in "Contradictions": two reports made mutually exclusive factual claims about the
installed toolchain and about the recorded suite reports, so I ran the two cheapest possible
read-only checks to settle them (a one-line `tsc` probe and reading `target/surefire-reports/*.txt`).
Everything else is synthesis of what the other eleven agents wrote.

Inputs: `reviews/01-architecture.md` … `reviews/11-integration-devops.md`, plus `reviews/BRIEFS.md`
for the agent-12 deliverable definition.

---

## Correct — what the eleven reports get right (basis for this synthesis)

- **The sweep is not redundant.** The eleven reports landed on genuinely different surfaces:
  131 raw findings, of which only ~35 are cross-referenced by more than one report. The overlaps
  that do exist are the *substantive* ones (transaction boundaries, the test config, i18n, the
  error advice), which is what makes the de-duplication below worth doing rather than mechanical.
- **Several findings are proven, not asserted.** Two agents wired the *real* production class into a
  probe (agent 6: the actual `ApiErrorHandler` under MockMvc standalone; agent 7: a byte-identical
  `frontend/src` copy compiled under stricter settings); another drove the running stack end to end
  and reproduced its findings with `curl` against live `:8080` and `:5198` (agent 11); another
  reproduced both of its test-guard defects on `/tmp` copies (agent 9); another ran the backend suite
  on two JDKs and isolated the failure to one method with a standalone JVM probe (agent 3).
- **The reports agree on the big picture.** All eleven converge on the same shape: an unusually
  well-layered, well-tested codebase whose weaknesses are *local* (a handful of small, well-located
  defects plus an unevenly-applied i18n/a11y/hardening layer), not architectural. Ten of eleven end
  "OK with notes"; the one "BLOCK" (agent 6, scoped to its own area) is about a bug the other agents
  independently confirm.
- **No agent manufactured severity.** Every High is traceable to a named file/line, and the two
  High-severity claims I could adjudicate against an installed toolchain turned out to be the
  *contradicted* ones (see Contradiction 1) — i.e. the sweep's High list survives scrutiny except
  where two agents explicitly disagreed.

**Fixed:** nothing. This report is synthesis only; no source file was touched.

---

## Executive summary

**Overall health: Backend 7/10, Frontend 7/10.** No P0 exists anywhere in the sweep: nothing corrupts
data, nothing is a live unauthenticated write path, and both suites are green on JDK 21
(1098/1098 backend — verified in `target/surefire-reports/` for this summary; 1263/1263 frontend,
run by agents 9 and 10). What holds both scores below 8 is a set of P1-class defects that are
individually small but collectively release-blocking, plus one structural fact the sweep makes
uncomfortable: the two live *functional* defects it found (agent 11's admin recency field and the
unreachable `/account` proxy) both sit in a blind spot of a contract gate that everything else trusts.

### Backend — 7/10

**Why it is high.** The architecture is better than typical for this size, and three agents verified
that independently rather than repeating a claim: `domain/` is genuinely framework-free, persistence
sits behind ports, no `api/` class imports `ee.sheltermap.persistence`, there are no package or class
cycles over 491 Java files, and injection is constructor-only (4 `@Autowired`, all on constructors,
zero field injection, 45 `@Value` all on constructor parameters) — agent 1 (SCC + hashes), agent 2
(repo-wide greps), agent 5 (schema/index inventory) and agent 6 (all 15 controllers) all corroborate
pieces of it. Security engineering is the strongest area: SQL/JPQL injection is clean (every `@Query`
binds named parameters, the only two native queries are parameterless), mass assignment is
structurally impossible (33 `@RequestBody` sites, all request records, no entity binding), the admin
surface is gated twice with a DB-backed per-request kind lookup, Argon2id + constant-time code
comparison + hashed OTP storage, fail-closed boot guards keyed on the *resolved* profile set, and
stored-XSS/SSRF/upload controls that agent 4 confirms against agent 4's own threat-model review. Data
access has no N+1 by construction (zero JPA associations anywhere, verified by search), consistent
`readOnly` boundaries, `@Version` on `shelters` mapped to 409, and migrations V1–V28 that each carry a
rationale and a validate-note. 1098 tests run green, with no mocking framework, no assertion-free
tests, and no flakiness by construction (injected `Clock`, latch/barrier-synchronised concurrency
tests, zero skipped).

**Why not 8+.** Five P1-class defects, four of them independently reproduced or enumerated:
an anonymous data-exposure defect — the moderator's `reviewNote` is emitted by the projection shared
by the public list/detail (agent 4 F1, code-read, with the existing IT identified that would catch it
if extended); the app's main mutation path runs with **no transaction boundary**, contradicting an
invariant its own code documents (agents 1 and 5, independently, with agent 5 adding a concrete
`/verify/confirm` → 500 path); the error advice flattens Spring's own 415/400/413 client errors into
`500` (agent 6, probed with the real class; agent 11, reproduced live against the running backend);
and the dependency line is pinned to an OSS-EOL Spring Boot 3.3.13, so transitive security fixes have
stopped arriving (agent 4 F3). Plus operational debt that is cheap to fix but not fixed: blocking
SMTP/Twilio sends **inside** transactions on a default 10-connection pool against 200 Tomcat threads
(agent 5 F2), no explicit Hikari sizing, no CI, no prod profile (dev defaults on the production code
path, agent 11 F7 / agent 4 F10), and a test `application.yml` that *shadows* rather than overlays the
production file — so the limits the suite exercises are not the limits production runs (agents 1 and
11, verified in this summary against the recorded reports).

### Frontend — 7/10

**Why it is high.** The hygiene claims are compiler-enforced, not eyeballed: zero `any`, zero
`@ts-ignore`/`@ts-expect-error`, zero unused imports/locals/parameters (verified with
`noUnusedLocals`/`noUnusedParameters` over all 70 app + 123 spec files), zero `NgModule`s, zero
deprecated APIs, `OnPush` on all 22 non-spec components, `track` on all 31 `@for` blocks, typed
non-nullable forms, one `HttpClient` consumer and one `catchError` that converts everything to
`ApiError`, and no nested subscribes. Tests are unusually strong: every component/service/store/
guard/interceptor/pipe/gateway has a sibling spec, there is not a single "should create" test, the
guards are driven through a real `Router` (including the fail-closed admin path), `safeReturnUrl` is
hardened and pinned, and `HttpTestingController` is used with `verify()`. Accessibility is not
checkbox-driven — there is a real WCAG 2.1 implementation with computed ratios and honest-exemption
tests for three themes, plus complete dialog focus management, a skip link, landmarks, labelled
controls and scoped table headers. No XSS sink: the single `[innerHTML]` is Angular-sanitized and the
server re-sanitizes; every `target="_blank"` carries `rel="noopener"`; no secrets in `environment*.ts`;
no production source maps. The FE↔BE contract holds on everything usually broken (URLs, verbs,
request bodies, enums, error shape — agent 11: 54/54 verb+path pairs, field-for-field DTO parity).

**Why not 8+.** Two live functional defects sit in the gate's blind spot: the admin shelter list reads
`AdminOccupancy.reportedAt` where the API sends `lastReportedAt`, so the moderator's recency column
always renders "just now" (agent 11 F1, verified against the live 307-row response and the committed
OpenAPI snapshot; the fixtures encode the same wrong field, so 1263 green tests hide it), and
`DELETE /account` never reaches Spring through the documented dev proxy because `"/account/"` does not
prefix-match `/account` (agent 11 F3, reproduced live: `404 text/html "Cannot DELETE /account"` while
`/account/me` proxies). Localization is applied unevenly across at least four surfaces, and the
project's own i18n guard structurally cannot see the worst of it (guard covers 4 of ~20 templates and
skips `{{ }}` interpolations, agents 8 and 9); five catalog keys used by the admin editor exist in no
catalog, so a rejected hero-image URL shows the admin a **blank** explanation (agent 8). Two High a11y
defects: form-level validation errors are not programmatically exposed on `/login`, `/register`,
`/reset`, `/account` (agent 10), and in the black-and-yellow theme Leaflet's unthemed light chrome
makes the map's links and zoom glyphs 1.14–1.30:1 (agent 10, self-flagged as an unrendered
CSS-cascade inference). The SPA ships with no CSP while a 30-day refresh token lives in
`localStorage`; the initial bundle is 300 kB over its own budget and carries all three catalogs
(≈61 kB gzip of it unused by any given visitor); and two of the layout guards can pass while the
behaviour they guard is deleted (agent 9, both reproduced on `/tmp` copies). Structurally, `AdminPage`
is a 1654-line, 9-tab component with triplicated tab plumbing.

**Tie-break.** The scores are equal but the deductions differ in kind: the backend's P1s include a
data-exposure defect (worse by nature) and a self-contradicting audit invariant, while the frontend's
P1s are correctness/UX defects with one-line fixes — and the backend's are equally cheap (one
`@Transactional`, three exception mappings, one null-check on the projection). If the parent wants a
release-readiness sub-score rather than a health score, the frontend is the *closer* of the two: its
two functional defects are a field rename and a proxy key, and the backend needs both a security fix
and a transaction boundary before the write path can be trusted.

---

## Evidence grades — how much to trust each report

The brief for this report asked for this explicitly, and it changes the weighting: 5 of 11 reports
ran something that could falsify their claim, 2 argue purely from reading, and the rest sit in
between. Severity in the merged list below carries the strongest grade available for that finding.

| Report | Grade | What it actually executed |
|---|---|---|
| 11 integration/devops | **E1 — strongest** | Ran the real backend on `:8080` and `ng serve` on `:5198`; live `curl` repros (DELETE `/account` → 404 text/html; 7 MB → 500 / 5.6 MB → 413); ran `OpenApiSnapshotIT` green; compared 54/54 gateway verbs+paths against the snapshot. |
| 03 backend tests | **E1 — strongest on suite state** | Full `mvn -o test` on JDK 21 (**1088/1088 green**, 91 s) and JDK 27 (**1 failure, reproduced 5/5**), plus standalone `/tmp` JVM probes proving the JDK-27 root cause. |
| 06 api/errors | **E1** | MockMvc standalone probe wiring the **real** `ApiErrorHandler` → 4-row status matrix (415/400/413 → 500); parsed the committed `openapi.json` with a script. |
| 09 frontend tests | **E1** | Ran `ng test` (56 files / 1263 green); reproduced both unbounded-regex guard defects on `/tmp` copies of the SCSS. |
| 10 fe sec/perf/a11y | **E1, with one self-flagged caveat** | Ran `ng build -c production --stats-json` (measured 859.73 kB raw / 200.94 kB transfer vs the 560 kB budget) and `ng test`. Its Leaflet-contrast finding is explicitly *not* a browser measurement ("a CSS cascade conclusion"). |
| 07 frontend clean code | **E1 (compiler-verified)** | Compiled a byte-identical copy of `frontend/src` under stricter settings (`ngc`/`tsc`, 0 errors), with a deliberate-defect harness validation. Its *strictness* conclusion is nevertheless the one contradicted below. |
| 02 backend clean code | **E1/E2** | Ran `mvn -o compile`, `mvn -o test-compile` (exit 0) and `mvn -o dependency:tree`; dead-code claims are repo-wide greps and body-hashes. |
| 08 angular/rxjs | **E1/E2** | Compiled a TypeScript probe (settles the `strict` question); read the installed `@angular/{core,router}` bundles to falsify an in-code comment about `paramMap`. |
| 04 backend security | **E2 + compile** | `mvn -o test-compile` only (exit 0); did not run tests. Its CVE table is built from upstream advisories and its own reachability analysis, not verified against this build — treat the CVE *identifiers* as unverified, the *pinning* as verified. |
| 01 architecture | **E2** | No execution: SCC over 491 Java + 125 TS files, md5 of duplicated method bodies, targeted greps. |
| 05 db/performance | **E2** | No execution: derived each query shape from the repository methods and compared it against the `CREATE INDEX`/constraint inventory in the Flyway files. |

Two consequences for the parent: (a) every "sequence/transaction/index" conclusion (05, 01) is a
reading, not a measurement — the two cheapest ones to falsify are the pool-exhaustion scenario
(05-F2) and the race conclusions; (b) everything with a live repro (11-F1/F3/F4, 06-F1, 03-1, 09-F1/F2)
should be treated as established.

---

## Findings — merged and de-duplicated, by severity

131 raw findings across the eleven reports collapse to **57 merged entries** below. Where a finding
appears more than once the sources are all cited and the count of independent confirmations is given.
Severity is normalised to the reports' own words; the P-band mapping is
**Critical = P0 (none), High = P1, Medium = P2, Low = P3/report-only**.

### P0 — Critical: none

No report found a defect that corrupts data, exposes an unauthenticated write path, or breaks the
build. Agent 6's "BLOCK" is a scoped gate recommendation for its own area (one P1 bug), not a P0; see
Contradiction 10.

### P1 — High (9 merged entries)

| # | Finding | Sources | Evidence | Note |
|---|---|---|---|---|
| **P1-1** | **The moderator's REJECT `reviewNote` is serialized to anonymous callers.** `ShelterQueryService`'s public detail/list projection sets the field unconditionally; `GET /api/shelters/**` is `permitAll` and a REJECTED row stays readable by sequential id. Contradicts `ShelterDto`'s own doc ("owner-scoped") and the FE contract; the existing IT asserts `INACTIVE`/`REJECTED` but not the note. | 04-F1 (High) | E2 code-read; the IT that would catch it is named | Fix = owner-gate the field + extend `CommunityReviewIT`; ~5 lines. **Highest-value security fix in the sweep.** |
| **P1-2** | **The core shelter write path has no transaction boundary.** `ShelterService.addPlace/updatePlace/deletePlace` contain no `@Transactional`; each repository call is its own transaction, so `deletePlace` commits the `DELETED` history row **before** the delete, and the active/daily/duplicate caps are read-check-write across transactions. Falsifies the invariant documented in `JpaShelterHistoryLog`/`V18`. Agent 5 adds: `VerificationService.requestVerification/confirmVerification` likewise unbounded, and `pending_verifications` has only a non-unique `(user_id, level)` index whose reader maps one row through `Optional` → a second concurrent send yields `IncorrectResultSizeDataAccessException`, which nothing maps → **500**. | **01-F1 (High) + 05-F1 (High)** — 2 independent confirmations | E2 both (schema + call-graph reading); agent 5's 500 path is a derivation, not a repro | Fix = `@Transactional` on the three + two methods, move the history write after the state change, switch the reader to `findFirst…` (the `PasswordResetService` idiom). DB constraints only if the caps must hold under concurrency. |
| **P1-3** | **The error advice turns routine client mistakes into 500s.** The catch-all `@ExceptionHandler(Exception.class)` outranks Spring's own resolvers, so a JSON body on the `multipart/form-data` endpoint → **415 becomes 500**, a missing/renamed `file` part → **400 becomes 500**, an upload over the 6 MB container cap → **413 becomes 500** (the status `application.yml` says the admin should see). Each also logs a full ERROR stack, inflating the ERROR signal the ops doc says to alert on. | **06-F1 (High, probed) + 11-F4 (Medium, live)** — 2 independent reproductions | **E1 both** (MockMvc probe with the real advice class; live `7 000 000 B → 500` / `5 600 000 B → 413`) | Fix = mirror the existing 405 handler: `MaxUploadSizeExceededException`/`MultipartException` → 413, `HttpMediaTypeNotSupportedException` → 415, `MissingServletRequestPartException` → 400; add the 4-row probe matrix as a test. |
| **P1-4** | **Admin shelter list reads the wrong occupancy timestamp, so the recency column always says "just now".** FE `AdminOccupancy.reportedAt` vs API `Occupancy.lastReportedAt`; `Date.parse(undefined)` → `NaN` → the literal "just now" for a 1 h 55 m old report. Fixtures encode the same wrong field, so the 1263 green FE tests hide it. | 11-F1 (High) | **E1** (live 307-row admin response + OpenAPI snapshot + a backend IT pinning `lastReportedAt`) | Fix = rename the field + 3 fixtures; the real fix is P2-16 (field-level contract gate). |
| **P1-5** | **`DELETE /account` never reaches Spring in the documented local setup.** `frontend/proxy.conf.json` keys `"/account/"`, Vite matches with `startsWith`, so `/account` misses; the README repeats the broken list. Reproduced live: `404 text/html "Cannot DELETE /account"` while `/account/me` proxies. The GDPR/legal-recovery erasure flow is unreachable in the only environment a developer uses. | 11-F3 (High) | **E1** (live `ng serve` + `curl`, plus a minimal-Vite non-match reproduction) | Fix = `"/account"` + correct `README.md:491`; ~2 lines. |
| **P1-6** | **Bilingual guidance is a shipped backend feature with no consumer, and a fallback-language post renders as if it were the reader's language.** `alternates`/`localeFallback` exist in the contract and live responses, in no FE type; the five `/admin/guidance/{id}/translations*` endpoints are called by nothing; the FE gateway doc claims a cross-locale slug 404s, which is false for the detail endpoint. A post gets exactly one translation row at creation, so second languages can only be authored through those unused endpoints. | 11-F2 (High) | **E1** (live `GET /api/guidance?locale=en` shows `localeFallback=true`; zero non-spec FE hits) | Fix = consume it (switcher + "shown in Estonian" notice) **or** delete the fields/endpoints and 404; do not leave both. |
| **P1-7** | **The backend suite is red on JDK 27.** `JdkHeroImageFetchClientTest.aStalledBodyIsAbortedAtTheReadTimeout` fails 5/5 on JDK 27 (the environment's `JAVA_HOME`) because the production code legitimately takes the head-deadline branch while the test pins the stall-watchdog message; root cause proven by a standalone probe (JDK 21 completes the response future in 92 ms, JDK 27 not in 3 s). Green on JDK 21 (1088/1088). | 03-1 (HIGH) | **E1 — the strongest single finding in the sweep** | Fix = flush one body byte in the fixture *or* assert the shared contract (both branches fire at the read timeout). Do **not** treat the suite as green for CI until this is decided. |
| **P1-8** | **Field-level validation errors are invisible to assistive tech on the critical account flows.** No `aria-invalid`, no `aria-describedby`/`aria-errormessage`, no live region on any `field-error` paragraph in `/login`, `/register`, `/reset`, `/account` — while `/submit` already does it correctly (`role="alert"`). WCAG 2.1 4.1.3; a screen-reader user submitting a bad form gets no announcement of which field failed. | 10-1 (High) | E2 (template grep: `aria-invalid` → 0 hits; `aria-describedby` only in the two dialogs) | Fix = one shared helper in `form-helpers.ts`. |
| **P1-9** | **In the two accessibility themes, Leaflet's unthemed light chrome becomes unreadable on the home route.** The page-wide `[data-theme='black-and-yellow'] a` rule wins a specificity tie against Leaflet's `.leaflet-bar a`/attribution rules (component styles are injected later), repainting links/glyphs `#ffe066` on white (1.30:1, ≈1.14:1 on tiles), and the focus ring is 2.05–2.10:1 against the light map surface — below the 3:1 floor. Includes the OSM attribution link the tile policy requires to stay visible. | 10-2 (High) | **E2, self-flagged**: "a CSS cascade conclusion, not a browser measurement" | Fix = scoped overrides next to the existing B&Y exceptions + a focus-ring override; verify in a browser once. Contradicts a comment in `styles.scss` (Contradiction 11). |

### P2 — Medium (22 merged entries)

| # | Finding | Sources | Evidence |
|---|---|---|---|
| **P2-1** | **The test `application.yml` is not the mirror it claims: because it shadows rather than overlays the production file, the limits under test are not production's.** Concrete drifts: `reset-confirm 5 / 0.084` in test vs `10 / 0.2` in main; `otp-per-contact-max 100` in test vs `5` in main (so the per-contact OTP cap is effectively disabled in every test that does not override it); `app.retention.*` and `app.media.import-*` absent entirely from the test file; `app.admin.*` pinned to empty literals. Nothing asserts the two files agree. | **01-F2 (Medium) + 11-F5 (Medium)** — 2 confirmations, same numbers | E2 both; I confirmed the recorded suite state separately (see Contradiction 4) |
| **P2-2** | **i18n hardcoded copy that duplicates already-translated catalog values** (the `shelter-copy.ts` cluster): ~36–42 user-facing literals in `shelter-copy.ts`, of which 9 plain strings are byte-identical twins of translated `account.contrib.*` / `detail.band.*` / `detail.pulse.kind.*` keys used elsewhere in the same views; `DISTANCE_COPY` byte-identical to `map.nearest.*`; the Leaflet anchor pin title `'Searched address'` vs the translated `map.searched`; three report notices hardcoded next to the shared `REPORT_SUBMITTED` constants. An ET/RU user sees the same fact in two languages in one view. | **01-F4 + 07-P1-1 + 07-P1-3 + 10-6 (partial) + 08-P1-2 (partial)** — the most cross-referenced finding in the sweep | E1 (agent 7 compiler/copy-verified; agent 1 by reading the catalogs) |
| **P2-3** | **`bannerMessage()` is called without its `translate` callback on most sites, making 9 fully-translated `error.*` keys unreachable.** Agent 7 counts 14 sites plus ~20 in `admin-page.ts`; agent 1 counts 24 including 13 in admin. English 5xx/429/409 banners on `/map`, `/shelters/:id`, `/submit`, `/login`, `/register`, `/reset`, `/blog`. The i18n review doc claims this surface is already catalog-driven. | **01-F4(b) + 07-P1-2** — 2 confirmations (counts differ; see Contradiction 9) | E2 both |
| **P2-4** | **The i18n template guard covers 4 of ~20 templates and skips `{{ }}` interpolations, so live untranslated copy is invisible to it.** Untranslated `aria-label`s in `map-page.html` (4), `page-shell.html` (2) and `admin-page.html` (2) sit beside translated siblings in the same files; the detail page hardcodes English *inside* interpolations. Specs pin the English literals, so the suite locks the gap in. | **08-P1-2 + 09-F3 + 10-6** — 3 confirmations, same 8 labels | E2 (agent 9 read the guard's scanner source; would-be fix is test-first) |
| **P2-5** | **Five catalog keys used by the admin guidance editor exist in no catalog → blank copy.** `admin.guidance.editor.hero.{importLabel,importHint,importInvalid,none,importNote}`; the `as MessageKey` cast hides it from the compiler and the parity tests; the site-text allowlist has no such keys either. Worst effect: the validation line for a rejected hero-image URL renders **empty**, and a checkbox is unlabelled. | 08-P1-1 | E1 (read the catalogs + `t()`'s `undefined` fallback) |
| **P2-6** | **`AdminPage` is a 1654-line, 9-tab component with only 2 tabs extracted and triplicated tab plumbing** (9 near-identical tab buttons, 7 identical `switchTab` cases, 6 identical loader bodies, 6 parallel signal pairs) — plus O(3n²) `findIndex` work per change-detection pass in the guidance table. | **01-F3 + 07-P1-7 + 08-P2-3** — 3 confirmations | E1 (agent 7 compiler/lint-verified sizes; agent 8 read the template) |
| **P2-7** | **The admin authorization policy is copy-pasted into four controllers** (three byte-identical `requireAdmin()`, one `void` variant), on top of the chain-level rule. No live hole (agent 4 enumerated 15/15 + 13/13 + 3/3 handlers and the additive chain rule). | **02-H1 (High) + 01-F6 (Low)** — severity contested (Contradiction 5) | E2 both; agent 4's enumeration is the strongest evidence and supports "no hole today" |
| **P2-8** | **Blocking SMTP/Twilio sends inside `@Transactional` handlers on a default 10-connection Hikari pool** (vs 200 Tomcat request threads; no `hikari.maximum-pool-size` anywhere; the Twilio SDK has no app-configured timeout). Ten slow third-party exchanges pin the whole pool; `POST /auth/password-reset/request` is unauthenticated and reachable. Same shape in the hero import (bounded and documented there). | 05-F2 | E2 (derivation from config + pool defaults) — the cheapest P2 to falsify, and the most plausible outage path |
| **P2-9** | **`GET /admin/reports` has no bound on an append-only table** (`findAll()` → DTO per row incl. AES-GCM decrypted reporter e-mail), unlike the sibling audit endpoint's `1..200`. Response size and heap grow with the moderation backlog. | 05-F3 | E2 |
| **P2-10** | **`users` has no optimistic locking and every user save is a whole-row merge from a request-time snapshot**, so an in-flight user request can write `suspendedAt = null` back over an admin's suspension (and roll back a fresher `lastActivityAt`). The codebase already avoids this shape on purpose elsewhere (`markActive` is a column-only UPDATE). | 05-F4 | E2 (maps the two transactions) |
| **P2-11** | **`moderation_actions` has no index on `moderator_id`** — so `countByModeratorIdAndAction` (called per distinct fresh reporter on the **public** detail read, and by the auto-hide tally) full-scans, and the FK's `ON DELETE SET NULL` scans per erased account in the retention loop. | 05-F5 | E2 (index inventory vs query shapes) |
| **P2-12** | **The verification throttle lost its atomicity, and the old atomic helper is now production-dead.** The single `synchronized` check-and-record (`tryRecord`) was replaced by read → send → record, so N concurrent `POST /verify/request` calls can all pass the cooldown check and all send; the daily cap can be overcounted by the in-flight window. Bounded by the still-atomic per-contact limiter. The dead `tryRecord` leaves a duplicated rule that can drift. | 04-F4 + 02 (independent note) | E2 (call-graph read both times) — see Contradiction 3 for the conflicting evidence |
| **P2-13** | **`POST /dev/sms-test` now always answers `sent: true`** because the handler discards the new `boolean` from `SmsSender.send`; the catch block is unreachable for the production sender. Its sibling `EmailTestController` still reports truthfully, so the two "mirror" diagnostics now disagree. A regression introduced by the in-flight send-order change. | 04-F2 | E2 (interface diff + the sibling's stated contract) |
| **P2-14** | **Dependencies are pinned to the OSS-EOL Spring Boot 3.3.13 line**, freezing Tomcat 10.1.42 / Spring Security 6.3.10 / Spring Framework 6.1.21 / postgresql 42.7.7 / commons-lang3 3.14.0 / Jackson 2.17.3 — so transitive security fixes cannot arrive. Per-CVE reachability is limited and the finding is the pinning, not an exploit; jsoup (the sanitizer) is current and unaffected. | 04-F3 | E2; the CVE identifiers are *not* verified in-repo (see Evidence grades) |
| **P2-15** | **"429 + `Retry-After`" is published for 9 endpoints that never send the header** (blanket OpenAPI text × 64 operations + per-endpoint javadoc + README), because the two exception classes carry no countdown. The SPA already counts down a fabricated 60 s from a token-bucket 429, and a third artifact tells a third story. | 06-F2 | E2 (parsed snapshot + read the handlers) |
| **P2-16** | **One condition, three status codes: a valid JWT whose user row was erased answers 400 "Account not found" on `/account/**` and `/verify/**`, but 401 on `/api/shelters/mine`.** The FE's only session-recovery path keys on 401 and the profile fetch swallows the 400, so the user stays in an authenticated shell with a null profile. Reachable in normal operation via retention erasure. | 06-F3 | E2 (cross-controller comparison, FE consumer read) |
| **P2-17** | **The FE↔BE contract gate is URL-only**, which is exactly the blind spot P1-4/P1-5/P1-6/P2-18 live in — no field, type, nullability, enum-member, verb, query-param or proxy-table comparison exists, on either side. | 11-F11 (+ 11-F1/F2/F3/F6 as its instances) | E1 (read the spec; the misses are reproduced live) |
| **P2-18** | **DTO media URLs are origin-relative**, so in the README's own documented cross-origin deployment every hero image and admin thumbnail 404s against the SPA origin while all JSON works. | 11-F6 | E2 |
| **P2-19** | **No profile-specific Spring configuration**: dev defaults (published dev JWT default, `smtp-pulse.com` host, localhost Postgres with `sheltermap/sheltermap`) ride the production code path, and the datasource credentials are the one sensitive pair with **no** fail-closed guard, unlike every other dev default. | **11-F7 + 04-F10** — 2 confirmations | E2 both |
| **P2-20** | **The README quickstart cannot be completed as written**: no Node requirement (Angular 22.1.7 needs Node `^22.22.3`, `^24.15.0` or `>=26`, and `package.json` declares no `engines`), and no `.env` step even though `PiiKeys` throws in **every** profile when the PII keys are blank — so `./dev-start.sh` cannot boot on a fresh clone. | 11-F8 | E2 (read the guard + the engines field) |
| **P2-21** | **No CSP on the SPA document while a 30-day refresh token lives in `localStorage`**; the backend's CSP is explicitly API-only and nothing in the repo serves `frontend/dist`. Prevention, not a live exploit (today's sinks are clean). | 10-4 | E2 |
| **P2-22** | **The initial bundle is 300 kB over its own budget and carries all three languages** (measured 859.73 kB raw / 200.94 kB transfer vs 560 kB warn; ≈61 kB gzip is catalogs a given visitor does not need; the whole eager auth/account surface ships to anonymous visitors). The budget is permanently red, so it no longer guards anything. | 10-3 | **E1** (production build with `--stats-json`) |

### P3 — Low / report-only (26 merged entries, grouped)

The Low band is large because several agents were thorough on hygiene. Items that are *not* worth a
dedicated PR are bundled; each bundle cites its sources so the parent can expand it.

| # | Bundle | Sources |
|---|---|---|
| **P3-1** | **Missing DB indexes / redundant indexes**: `shelter_reports(created_at DESC, id DESC)` absent though the admin queue orders by it (and would back P2-9); guidance slug-only lookup can't use `UNIQUE(locale, slug)`; four `ON DELETE SET NULL` FK columns unindexed (erasure scans); and four unused/redundant indexes (`idx_shelters_county`, `idx_media_assets_source_url`, `idx_site_texts_key`, `idx_pending_contact_changes_user`) with comments claiming queries that do not exist. | 05-F9, 05-F10, 05-F11, 05-F12 |
| **P3-2** | **Read-path efficiency**: `ShelterQueryService` opens 8–10 transactions per list request (no service-level `readOnly` boundary, non-atomic snapshot); the community-pulse detail read has a per-reporter query loop; the list path AES-GCM-decrypts author PII it discards; registry import does per-row read-modify-write with an extra SELECT inside `save`. | 05-F6, 05-F7, 05-F8, 05-F13 |
| **P3-3** | **Duplicated service-layer logic in the backend**: `requireAdmin()` ×4 (P2-7); the trust-weight rule implemented twice in two packages, driving auto-hide; `MediaService.MEDIA_URL_PREFIX` duplicated and one copy dead; `ASSET_NOT_FOUND_MESSAGE` duplicated with both copies live; `MAX_ATTEMPTS = 5` declared three times (security-relevant); `constantTimeEquals` ×3 / `sha256Hex` ×2; four slug helpers implementing two rules; 7 copies of the comma-separated-config parse. | 01-F6, 02-M1, 02-M2, 02-M4, 02-M5, 02-L9 |
| **P3-4** | **`GuidanceService` is a 1 236-line god class** (645 code lines, 40 public methods, five responsibilities, 7 collaborators, the backend's longest methods) — the cause of several duplications in P3-3. | 02-M3 |
| **P3-5** | **Dead code (backend)**: 14 unused imports in 13 files; six dead declarations (`GuidanceService.MEDIA_URL_PREFIX`, `SiteTextKeys.DEFAULT_*`, `ShelterHistoryChanges.FIELDS`, `ShelterService.findMine`, `ShelterDuplicateException.getExistingShelterId`, `ReporterTrust.isBaseline`); a no-op `requireNonNull(Boolean.valueOf(primitive))`; `VerificationSendLog.tryRecord` production-dead. **And no static analysis in the build**, which is why none of it was caught. | 02-L1, 02-L2, 02-L3, 02-L11, 04-F4 (secondary), 02 (in-flight note) |
| **P3-6** | **The only exception mapped outside the advice** (a controller-local handler duplicating the shared `ErrorResponse` builder, with the mapping for a type thrown 7× in the service layer) — a latent trap: a future caller outside that controller gets a 500. | 06-8 |
| **P3-7** | **No log line for any 429 or auth failure, though the ops doc tells the operator to monitor "the 429 log lines"**, and the reset-cooldown skip it calls an INFO abuse signal is DEBUG. Failed logins, invalid tokens and 403 admin denials are invisible. | 06-4 |
| **P3-8** | **ERROR logs that drop the stack trace** (5 files pass `e.getMessage()` instead of the throwable), and the two dev relays log the recipient in clear text while the real senders mask it. | 06-7, 06-9 |
| **P3-9** | **OpenAPI/API-shape debt**: the deliberately implemented 405 is absent from the contract; create semantics mix 200 and 201+`Location`; two URL prefix families and no version marker. | 06-5, 06-6 |
| **P3-10** | **Security hardening residue (backend)**: `/auth/refresh` and `/auth/logout` are the only unauthenticated DB-touching endpoints and are unthrottled; no `Cache-Control: no-store` on token/PII responses; contact-change codes are persisted **before** the send (a refused send arms the cooldown with a code nobody received, and records no operator alert); the committed 271 KB `openapi.json` publishes 26 admin paths, partly undoing the stated rationale of `ApiDocsGuard`; the dev DB password has no fail-closed guard (P2-19). | 04-F6, 04-F7, 04-F5, 04-F8, 04-F10 |
| **P3-11** | **`MarkdownToHtml` is production-dead but is the one main-package HTML producer that bypasses `BodySanitizer`** — the next author who needs markdown finds it first and calls it unsanitized. Agent 2 declines to call it dead (documented as the migration engine/reference) but asks for its patterns to be de-duplicated; see Contradiction 6. | 04-F9 + 02-L10 |
| **P3-12** | **FE dead code**: three exported symbols with zero references (`ThemeRoot`, `isSiteTextKey`, `BODY_EDITOR_HEADER_VALUES` — the last restated three times in the same file). | 07-P2-1 + 09-F10 (same symbol) |
| **P3-13** | **FE duplication**: `AccountPage` duplicates the whole email/phone change flow (~80 lines, precedent for the fix already in `verify-page`); `MapPage.sorted()` duplicates the distance-sort branch; `recencyText`/`verifiedAgoText` re-implement the same branches; `.badge` base copy-pasted into 4 stylesheets (`styles.scss` has no `.badge` although it hosts `.btn`); default resend cooldown `60` duplicated 7×; storage-key literals in 4 places; the interceptor duplicates its own endpoint patterns and the session-death redirect; five `armed()!` assertions in one template region. | 07-P2-2 … 07-P2-10 |
| **P3-14** | **Naming inconsistency**: three of 24 component files keep the legacy `.component` suffix (`shared/accessibility-dialog.component.ts`, `banner.component.ts`, `consent-banner.component.ts`) while the other 21 drop it; the file/class split is three-way for shared components. | 01-F11 + 07-P2-7 |
| **P3-15** | **Frontend architecture diagram no longer describes the shipped frontend** (six tabs vs nine, no `guidance/`/`legal/` features, no `/blog` routes, and the word i18n appears zero times) while the backend equivalent is machine-guarded. | 01-F5 |
| **P3-16** | **`/register` does not enforce the backend's 8-character password floor and its comment states the opposite** (it claims there is no policy "beyond non-blank"); a 3-character password round-trips to a 400 banner instead of an inline field error, while `/reset` does it correctly. | 07-P1-5 |
| **P3-17** | **Untranslated admin feedback**: 28 English label entries + 10 English success banners in `admin-page.ts`, in a class that already routes its guidance/media tabs through `i18n.t(...)`; spec pins lock the inconsistency in. | 07-P1-4 |
| **P3-18** | **Backend boot/degenerate-graph debt**: three boot guards are the same fail-closed template with a duplicated helper; `@EnableScheduling` hangs off two conditionally-created components (a future flag combination silently disables scheduling); `trusted-proxies`/`trust-loopback` are parsed by hand in four controllers although a `@ConfigurationProperties` record covers the same yml block; `localeOrDefault` skips the `MAX_LOCALE_LENGTH` check the other three locale helpers apply (a DTO-bypass would 500 rather than 400). | 01-F7, 01-F8, 01-F9, 02-L4 |
| **P3-19** | **`ShelterController` bypasses the service layer** (injects repositories, runs its own ownership lookup and builds 5-/15-field domain objects positionally) while its own javadoc claims "thin shell"; ownership now lives in two places. Boolean-flag `toDtos` overloads make the projection call sites unreadable. | 01-F10 + 02-L5 |
| **P3-20** | **`ApiErrorHandler` is 36 near-identical handlers** and the error body is hand-built in three further places although a grouping idiom already exists in the same file (~60 lines removable, identical responses). | 02-L8 |
| **P3-21** | **Magic strings/bounds next to constants that exist**: `"Unknown"` ×6, `"Authentication required"` ×9, the shelter-limit 409 message hardcoding 10, global lat/lng bounds re-typed in 6 places, `" characters"` in 6 validation messages. | 02-L6, 02-L7 |
| **P3-22** | **FE change-detection/route hygiene**: the impure `t` pipe is used at 834 sites although its comment says "the chrome only"; `route.paramMap`'s "completes on deactivate" rationale is false for Angular 22 (verified in the installed router bundle) so safety rests on GC; query-param state is read once and goes stale on component reuse; `ResendCountdown.active` is a non-signal read from 8 bindings in a zoneless app; `track $index` on refreshing lists; dead `en-GB` locale registration while admin date cells ignore the active locale; `ContributionsPanel` relies on an undeclared `ngOnDestroy`. | 08-P2-4 … 08-P2-10 |
| **P3-23** | **Assertions that block refactors**: five `armed()!` non-null assertions; ~40 stylesheet assertions encode exact formatting (a pure Prettier reflow can fail a test with a misleading message). | 07-P2-10 + 09 (judgement section) |
| **P3-24** | **Missing tests, backend** (each small): `HttpUrlRedirectClient` has no test at all (the only outbound client on the anonymous resolve path, while its sibling client has exactly that test); the report-dedup lost-race → 409 branch is unreachable by any test; three documented `ApiErrorHandler` mappings unasserted; `Codes`/`Tokens`/`VerificationRules`/`TokenBucketRateLimiter` validation+idle-sweep/`DnsHeroAddressResolver` untested; write-only test scaffolding; `LocationResolveIT` order-dependence; one fixed sleep guarding a negative assertion; IT scope heavier than needed in two places. | 03-2 … 03-9 |
| **P3-25** | **Missing tests / test-honesty, frontend**: the root-app spec wires the real `HttpClient` (no testing backend); 35 wall-clock settle ticks + 30 fixed-iteration polls; exact copy assertions on the live clock (±30 s); the real bootstrap (`app.config.ts`/`main.ts`) never exercised; the page-scoped `LeafletService` provider is deleted in every spec that mounts those pages; `geolocation.ts` has no direct spec; `ng test` prints a `scrollIntoView` TypeError per admin-editor spec (and the unguarded call can cost a keyboard user the focus guarantee). | 09-F5 … 09-F10 + 10-12 |
| **P3-26** | **No e2e layer (documented deferral) and its consequences**: real Leaflet map/markers, geolocation permission/insecure context, pre-paint no-flash on reload, 320/900 px layout + focus order and real Quill paste have no behavioural coverage at any level — accepted instead from SCSS/source text. Also: no CI and no application image, so the green suites are only green on this machine. | **09-F4 + 11-F9** — 2 confirmations |

**Cross-cutting pattern worth naming:** eleven of the entries above are *the same shape* — a rule, a
label or a bound that exists in two places where one would do, in a codebase that is otherwise
single-sourced on purpose. The reports show the fix pattern exists in each case (the repo already
writes drift-guard tests, already has a `Profiles` single source, already has `ReporterTrust.of`, already
has `form-helpers.ts`); what is missing is enforcement, which is the through-line of the action plan.

---

## Contradictions between reports

Eleven contradictions were found. Two are factual and mutually exclusive; I settled those with the two
cheapest read-only checks (marked **adjudicated**). The rest are severity/recommendation conflicts
recorded with both positions.

### 1. TypeScript `strict` — **adjudicated: agent 8 is right; agent 7's P1-6 and agent 1's F12 are false positives**

- **Agent 1 (F12, Low)** and **agent 7 (P1-6 + appendix A3, Medium)**: `frontend/tsconfig.json` sets
  neither `strict` nor `strictTemplates`, so `strictNullChecks`/`noImplicitAny` are **off** and null flows
  go unchecked; agent 7 adds that enabling both is "provably free" (0 errors over 70 app + 123 spec files).
- **Agent 8 (versions table)**: TS 6.0 **enables `strict` by default**, "verified by compiling a probe
  file: `let x: string = null` → `TS2322`, implicit-any param → `TS7006`. The missing `"strict": true` in
  `tsconfig.json` is therefore *not* a finding". Agent 9's stack table likewise lists `strict` as in
  effect.
- **Adjudication (my check).** With the repo's own compiler (TypeScript **6.0.3**), a probe file
  `let x: string = null; function f(y) {…}` reports **`TS2322` and `TS7006` with no flags at all**, and
  is clean only under `--strict false`. Separately, `@angular/compiler-cli/src/ngtsc/core/src/compiler.d.ts`
  states: *"strictTemplate is `true` by default. Explicit opt-out is required to disable strictness"*
  (bundled form: `strictTemplates !== false`). So **both** halves are already on by default for the
  installed versions.
- **Which is better evidenced:** agent 8. Agent 7's measurement is real but cannot distinguish "off"
  from "on by default" — adding flags that are already on trivially yields 0 errors, and its
  deliberate-defect harness rejecting a wrong `severity` binding is consistent with (in fact explained
  by) `strictTemplates` defaulting to true.
- **Consequence:** delete this finding, and delete "enable strict" from the action plan — it is not a
  win, it is a no-op. Evidence grade for the *original* claim: E2 for agent 1, E1-but-misattributed for
  agent 7, E1 for agent 8 (plus this summary's corroboration).

### 2. Which limiter values the test config should mirror — **not a factual conflict; the two reports disagree on the target model**

- **Agent 1 (F2)** reads the numbers as: `reset-confirm 5 / 0.084` in test vs `10 / 0.2` in main, and
  states the **test copy is the stale side** (main's own comment explains why it was raised to
  ≈12/min), while the test file's `otp-per-contact-max: 100` is a deliberate, inline-explained override
  "precisely the kind of override the header forbids". Its prescription: keep a mirror but add a
  drift-guard test with an explicit allow-list of the real deltas, or turn the file into an
  `application-test.yml` overlay holding only the deltas.
- **Agent 11 (F5)** reads the identical numbers (5/0.084 vs 10/0.2; 100 vs 5; plus retention and
  media-import blocks absent entirely and `app.admin.*` pinned to empty literals) but frames the
  impact differently — the per-contact OTP cap is "effectively disabled in every test that does not
  override it" — and prescribes "a test that parses both files and asserts **identical key sets and
  values**", moving genuinely intended overrides onto the test class.
- **Where they diverge:** the target model. Agent 1 accepts deliberate per-test deltas inside an
  allow-list; agent 11's literal prescription would forbid them. They do **not** disagree about the
  code: both read the same two files. No report anywhere argues the test values are the correct ones
  to mirror, so the direction is settled by main's own comments: main is authoritative
  (`10 / 0.2`; OTP cap `5`).
- **Which is better evidenced:** agent 11 on impact (it names exactly which tests override and which
  limits are unexercised); agent 1 on direction and on the least-disruptive remedy. **Recommended
  synthesis:** adopt agent 1's overlay + allow-list guard, and use agent 11's per-test
  `@TestPropertySource` idiom (which `AuthApiIT` already uses) for overrides that are genuinely
  intentional. One guard, one model, both concerns satisfied.

### 3. The rate-limit property the send-ordering change removed — **both are true; they describe different objects**

- **Agent 3 (allowlist of things done well / "no flakiness by construction")** cites
  `FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly` (50 threads, one latch,
  bounded await, "exactly 2 OKs") as a genuine atomicity invariant of the suite.
- **Agent 4 (F4, with an independent note from agent 2)** says the in-flight send-ordering change moved
  the single `synchronized` check-and-record **off the production path**: `VerificationService` now
  reads → sends → records, so "the 'exactly one send per cooldown window' property that the old code
  provided no longer holds", and `VerificationSendLog.tryRecord` is production-dead (only tests call
  it). Agent 4 explicitly flags that it "partially contradicts the prior pass's premise" and rates the
  residual Low because the per-contact limiter still bounds the loss.
- **Adjudication:** no factual conflict. Agent 3 verified that the *test* passes and is well built;
  agent 4 verified that the *tested helper is no longer on the shipped path*. The two statements are
  jointly satisfiable and the pair is exactly the failure mode worth recording: **the suite's
  strongest concurrency test now gives false confidence about production.** Better evidenced: agent 4
  on the production path (it reads the current call graph and ordering) and agent 2 independently by
  grep; agent 3 on the test's own quality. **Action:** add the concurrency IT agent 4 asks for
  (asserting the bounded overcount explicitly) and delete or annotate `tryRecord`.

### 4. Is the backend suite green? — **adjudicated: green on JDK 21, red on JDK 27; 1088 vs 1098 is tree growth**

- **Agent 3 (finding 1, HIGH)**: `mvn test` is red with this environment's `JAVA_HOME` (JDK 27) —
  reproduced 5/5, isolated to one method, root cause proven with a standalone probe — and states the
  repo's own `target/surefire-reports` XML, "written by a run before I touched anything", shows the
  identical failure; it reports **1088** executed tests and 1088/1088 green under JDK 21.
- **Agent 11 (header)**: "The prior full run in `target/surefire-reports/` reports **1098 tests /
  0 failures / 0 errors / 0 skipped**" and "both suites are green".
- **Adjudication (my check).** The reports on disk as of this summary (directory mtime
  2026-09-21 00:23, i.e. after both agents had finished) aggregate to
  `tests=1098 failures=0 errors=0 skipped=0`, and
  `ee.sheltermap.guidance.JdkHeroImageFetchClientTest.txt` reads
  `Tests run: 6, Failures: 0, Errors: 0, Skipped: 0`. So (a) agent 11's reading is accurate **for the
  file as it stands**; (b) agent 3's citation of a pre-existing XML showing the failure can no longer
  be confirmed and is contradicted by the current file — consistent with a later JDK-21 run
  overwriting it; (c) the 1088 → 1098 delta is explained by the three in-flight test classes agent 3
  itself lists (`ShelterControllerDetailReadTest`, `LoopbackXffTrustGuardTest`, `RegistryPropertiesTest`).
- **Which is better evidenced:** agent 3 for the substantive claim (a live 5/5 reproduction plus a
  standalone JVM probe beats a summary line read from a report directory), agent 11 for the recorded
  totals. **Operational conclusion for the parent: treat the backend suite as green-on-21 /
  red-on-27, and do not quote "1098 green" as release evidence until P1-7 is decided.**

### 5. Severity of the duplicated `requireAdmin()` — **contested; settled at P2**

- **Agent 2 (H1, High)**: an authorization check with no single point of truth is the highest-priority
  item — a future hardening applied to the copy in front of the reviewer would be silently missed in
  the other three.
- **Agent 1 (F6, Low)**: the second line of defence is deliberate, the chain-level rule has a test, and
  the duplication is a maintainability smell.
- **Agent 4 (authorization coverage, clean apart from F1)**: enumerated every handler and confirms the
  check *is* present everywhere today (15/15, 13/13, 3/3) and that the chain rule is additive.
- **Which is better evidenced:** agent 4 for the "no live hole" half (an endpoint-by-endpoint
  enumeration), agent 2 for the drift-risk half (byte-identical bodies, md5-verified). **Resolved:
  P2-7.** The conflict is about risk appetite, not behaviour — record both and do not quote agent 2's
  "High" in a release gate.

### 6. `MarkdownToHtml` — dead to remove, or deliberate to keep?

- **Agent 2 (L10)**: explicitly **not** calling it dead — the javadoc documents it as the one-shot
  migration engine and reference implementation of the content rules; the ask is only to de-duplicate
  its patterns with the test-scope driver.
- **Agent 4 (F9, Low)**: production-dead and the one main-package HTML producer that bypasses
  `BodySanitizer`, so the next author who needs markdown finds it first and calls it unsanitized.
- **Which is better evidenced:** agent 4 for the risk (both agents agree there is no production
  caller, so the disagreement is about what to do, not about the facts); agent 2 for the documented
  intent. **Resolved: P3-11** — move it to test scope, which satisfies both readings.

### 7. "Frontend dead code: none" vs three dead exports — **wording too broad, both true**

- **Agent 7 (clean section)**: "Unused components, pipes, directives, routes, models: none", and "no
  unused imports / locals / parameters" (compiler-verified).
- **Agent 7 (P2-1) itself** lists three exported symbols with zero references; **agent 9 (F10)**
  independently reports `isSiteTextKey` has no caller; **agent 8 (P1-1)** independently reports five
  catalog keys that resolve to nothing.
- **Adjudication:** no conflict in fact — the clean claim is about components/pipes/routes/deps, the
  dead list is about exported symbols. The clean wording is nevertheless misleading and one agent's
  "clean" should not be quoted as "no dead code". Better evidenced: the compiler-verified export scans
  (agent 7's own, plus agent 8 and agent 9's independent hits).

### 8. Mockito present or not — **not a conflict**

Agent 3 states "**none** — no Mockito, no `@MockBean`/`@SpyBean` anywhere (grep → prose comments only)";
agent 4's resolved-dependency table lists `Mockito 5.11.0` among test artifacts. Reconciled: Mockito is
on the test classpath transitively via `spring-boot-starter-test` but has **zero usages** (agent 3's
grep is the operative fact). Recorded so the parent does not read agent 4's table as contradicting the
architectural claim.

### 9. Counts of `bannerMessage()` sites without the callback — **same finding, different totals**

Agent 1 counts 24 including 13 in `admin-page.ts`; agent 7 counts "14 … plus ~20 sites in
`admin-page.ts`". Both agree on the mechanism and that the admin file dominates. Better evidenced:
agent 7 (mechanical grep over `frontend/src`, with named line numbers on both sides). No action beyond
using agent 7's count.

### 10. "BLOCK" (agent 6) vs "OK with notes" (the other ten) — **scope, not fact**

Agent 6 closes its area with "**BLOCK** (one P1 bug: Finding 1)" while the other ten recommend
merge-with-notes and none reports a P0. Reconciled: agent 6's BLOCK is a scoped gate recommendation
for the error-handling area, and its P1 (the catch-all → 500) is independently reproduced live by
agent 11. **Resolved: P1-3, fix before release; not a repository-level blocker.**

### 11. Doc-vs-code conflicts recorded by the agents themselves (not report-vs-report)

- Agent 10 flags that `styles.scss` claims Leaflet's light chrome "stays readable in both themes and
  needs no `.leaflet-…` override", which its own finding 2 contradicts for links and the focus ring
  (see P1-9; the inherited-text-colour half of the comment is correct).
- Agent 1 flags that `frontend/docs/01-frontend-architecture.puml` no longer matches the tree (P3-15)
  while the backend equivalent *is* machine-guarded — the asymmetry is the finding.
- Agent 2 flags that a DTO javadoc claims the service "re-checks everything — it is the authority"
  while `localeOrDefault` skips the length bound (P3-18).
- Agent 1 / agent 7 / agent 11 flag four different documents (`docs/i18n-review.md`,
  `frontend/README.md`, `README.md`'s API/viewport sections, the gateway source comment) as asserting
  behaviour the code no longer has. These are the same class as P2-2/P2-4/P2-17 and are listed here so
  they are not re-derived as new findings.

---

## Top-10 action plan

Ten items: 5 quick wins (S — each well under a day, four of them under an hour) and 5 larger refactors
(M/L). Effort is the *implementation* effort; every item names its merged findings.

### Quick wins

| # | Action | Findings | Effort |
|---|---|---|---|
| **QW1** | **Owner-scope `reviewNote`** in the shared public projection (emit only when `callerId == createdBy`; keep the admin projection), and add the missing `jsonPath("$.reviewNote").doesNotExist()` to the anonymous detail read. The single highest-value fix in the sweep, and the test that would have caught it already exists. | P1-1 | **S** (~1 h incl. test) |
| **QW2** | **Rename `AdminOccupancy.reportedAt` → `lastReportedAt`** in `models.ts`, drop/simplify the admin-page shim, update the three fixtures. Immediately stops the moderator's recency column from lying. | P1-4 | **S** (<1 h) |
| **QW3** | **Fix the dev proxy key `"/account/"` → `"/account"`** and correct the README's proxy list. Makes the GDPR erasure flow reachable in the documented setup. | P1-5 | **XS** (2 lines) |
| **QW4** | **Add the transaction boundaries**: `@Transactional` on `ShelterService.addPlace/updatePlace/deletePlace` with the `deletePlace` history write moved *after* the state change, and on `VerificationService.requestVerification/confirmVerification` with the pending-verification read switched to `findFirst…` (the `PasswordResetService` idiom). Restores the documented audit invariant and removes the `/verify/confirm` → 500 path. Add the DB constraints only if the caps must hold under concurrency. | P1-2 | **S** (annotations + ordering + one reader change) |
| **QW5** | **Close the error-contract one-liners**: add `MaxUploadSizeExceededException`/`MultipartException` → 413, `HttpMediaTypeNotSupportedException` → 415, `MissingServletRequestPartException` → 400 to the advice (copying the existing 405 handler); honour `SmsSender.send`'s boolean in `SmsTestController`; bound the two unbounded test regexes in `design-tokens.spec.ts` and add the missing templates + interpolation scanning to the i18n guard (test-first, then key the 8 aria-labels); add the 5 missing hero catalog keys; add the `/register` 8-character floor. All are S-or-smaller and independently verified. | P1-3, P1-8→(P2-5, P2-4, P3-16 partly) | **S** each, **M** if batched |

### Larger refactors

| # | Action | Findings | Effort |
|---|---|---|---|
| **LR1** | **Single-source the localization layer.** Route `shelter-copy.ts`'s ~36–42 literals through the catalog (the 9 already-translated twins map onto existing keys; add keys only for what has none), make `bannerMessage()`'s `translate` argument **required** so no call site can regress to English, convert the admin label maps to `Record<…, MessageKey>`, and fix `DISTANCE_COPY`/the anchor pin title/`RECENT_KIND_KEYS`. Then widen the i18n guard so it cannot re-drift (all `*.html` enumerated, interpolations scanned). This is the sweep's most cross-referenced finding and its only "the same fact is rendered twice in two languages in one view" defect. | P2-2, P2-3, P2-4, P3-17, (P2-5 closed by QW5) | **M** |
| **LR2** | **Split `AdminPage`**: a `TABS` registry (key, label key, rows signal, error signal, loader) driving both the tab bar and `switchTab`, one generic `loadInto<T>()` for the six loader bodies, then extract the remaining seven tabs per the existing `GuidanceEditor`/`SiteTextsPanel` precedent; use the loop `$index`/a computed id→index map for the quadratic guidance lookups. Removes the 5-edits-per-tab cost and the O(3n²) template work. | P2-6, (P3-13 partly) | **L** |
| **LR3** | **Release-engineering foundation**: move off the OSS-EOL Boot 3.3.x line (with the springdoc bump the pom comment already anticipates) or override the reachable managed versions as an interim; add the CI job (`mvn -B -ntp test` + `npm ci && npx ng test`), the multi-stage application Dockerfile, a `prod` profile / no-default `@Validated` datasource+SMTP binding (or the missing `DataSourceCredentialGuard`), and `.env.example` + the Node requirement + `engines`. Green-on-this-machine is not evidence. | P2-14, P2-19, P2-20, P3-26 (CI half) | **M–L** (Boot jump is the long pole) |
| **LR4** | **Data-layer hardening**: move SMTP/Twilio sends after commit (the `VerificationService` throwaway-then-record idiom, a `TransactionSynchronization` or an outbox) and set an explicit `hikari.maximum-pool-size` + connection timeout + a finite Twilio timeout; fix the `markActive`-style write for users (column-scoped writes or `@Version` + V29) so a profile save cannot revert a suspension; add the missing indexes (`moderation_actions(moderator_id, action)`, `shelter_reports(created_at DESC, id DESC)`) and drop the four redundant/unused ones; bound `GET /admin/reports`. Together these close the most plausible outage path, the one silent security-action revert, and the growth ceiling. | P2-8, P2-9, P2-10, P2-11, P3-1 | **M** |
| **LR5** | **Contract-gate and accessibility program**: extend the FE gate beyond URL-only to fields/types/nullability/enums/verbs/query params/proxy table (this is the only structural fix that would have caught P1-4, P1-5, P1-6 and P2-18); then resolve the dead contract surface it exposes (`provenance`, `alternates`/`localeFallback`, `MediaAssetDto.sourceUrl` — consume or delete, and correct the README claims); and close the a11y/perf tranche: `aria-invalid`/`aria-describedby`/`role="alert"` on the auth/account forms, the Leaflet theme overrides, `autoCsp` (with the two inline `<script>` blocks hash-allowlisted or externalised), lazy-loaded `ET`/`RU` catalogs + lazy auth routes with re-baselined budgets, and responsive image variants. | P2-17, P1-6, P1-8, P1-9, P2-21, P2-22, P3 (images), P3-15 | **L** |

**Deliberately *not* in the plan:** adding `"strict": true` / `"strictTemplates": true` (Contradiction 1
— both are already on by default for the installed versions, so this is a no-op, not a win). Also
deferred: the `resource()`/`httpResource()` migration (agent 8 flags it as the frontend's biggest
available simplification but not a defect), and the Low-band hygiene bundles in P3-3/P3-5/P3-13/P3-20
(worth one "reduce duplication" PR, not a release gate) — with the exception of adding a static-analysis
plugin (agent 2's L11), which is the one Low item that *prevents recurrence* of ~27 others and is
therefore cheapest inside LR3's CI job.

---

## Areas found clean

Consolidated from all eleven reports' explicit clean sections. Each line names the verifying report(s)
and, where the agent gave one, the instrument (not just an assertion of cleanliness).

**Backend architecture and structure (01)**
- Framework-free `domain/` (only `java.*` + package-internal imports over all 33 files); persistence
  behind ports; **no** `api/` class imports `ee.sheltermap.persistence` and no controller returns a
  `*Entity`; every HTTP payload is a record DTO. Instruments: import scan, `grep`, package/class SCC.
- **No cycles** at class, package or frontend-module level (491 Java + 125 TS files).
- **Constructor injection only**: 4 `@Autowired` (all on constructors), 45 `@Value` (all on
  constructor parameters), zero field injection — verified programmatically.
- One `@RestControllerAdvice` for error handling; fail-closed boot configuration centralised in one
  dev/test rule reused by all four guards and the security chain; `ddl-auto: validate`,
  `open-in-view: false`; secrets as env placeholders only, `.env` never tracked.
- Frontend: all-standalone, no cross-feature imports, `HttpClient` confined to one module, one route
  table with `titleGuard` everywhere, lazy routes with written rationale; 23k lines of specs to 17.9k
  lines of source.
- Accepted trade-offs, verified as deliberate rather than accidental: vendored Quill (licence, tarball
  integrity and omissions recorded), the Smart-ID throwing stub, the services living in the `api`
  package (justified in place).

**Backend clean code and dead code (02)**
- No debug leftovers (`System.out`/`err`/`printStackTrace`: 0 hits), no TODO/FIXME/XXX/HACK, no
  commented-out code, no `Optional.get()`, no stream misuse (55 × `Stream.toList()`, 0 ×
  `Collectors.toList()`, no parallel streams), no unused beans, no unused `app.*` property, no orphan
  class (all 491 types referenced), no unused dependency or version property, max brace depth 7, no
  `@SuppressWarnings`/`System.exit`, naming consistent.

**Backend tests (03, corroborated by this summary)**
- 1098 tests green on JDK 21 (recorded reports verified here); no assertion-free tests (1060 methods
  parsed); no mocking framework in use; no flakiness by construction (0 × `Math.random`, 0 ×
  `@Disabled`/assumptions, 2 × `Thread.sleep`, injected `Clock`, latch/barrier concurrency);
  no scope misuse (`@SpringBootTest` only in the IT base class); security surface genuinely covered
  (PII crypto, all four boot guards incl. the mixed-profile case, XFF trust matrix, sanitizer, SSRF
  classifier incl. IPv4-mapped smuggling, magic bytes, Argon2, refresh rotation race, the OpenAPI
  public-vs-authenticated split); endpoint coverage complete; 9 repository ITs; high-quality IT base
  class.

**Backend security (04)** — 16 named clean areas, each read in source
SQL/JPQL injection (all bound parameters; the only two native queries are parameterless); mass
assignment (structurally impossible: 33/33 request records, server-owned fields copied or overwritten);
validation wiring and bounds mirroring DB columns; per-endpoint authorization (enumerated 15/15, 13/13,
3/3 + the additive chain rule + the `/mine` matcher ordering); JWT/session handling (≥32-byte HS256
key, no role claim, fresh column reads killing suspended/demoted tokens on the next request, dummy-hash
timing equalizer, atomic refresh rotation); password hashing and OTP handling (Argon2id, `SecureRandom`,
hashed at rest, constant-time compare, persisted lockouts, single-use, TTLs); CSRF correctly disabled
*on evidence* (`Set-Cookie` absence asserted); CORS (explicit origins, no `*`); secrets hygiene;
logging (no request bodies/passwords/tokens/codes; real senders mask recipients); error responses (no
stack/SQL/schema leakage); actuator surface (health/info only, springdoc off by default and boot-refused
outside dev/test); uploads and public media serving (byte cap before disk, magic-byte sniffing, SVG
refused, server-generated names, normalized-parent containment check); stored-XSS in admin guidance
(jsoup allowlist on create *and* update); outbound-fetch SSRF controls confirmed, including agreement
with the corrected threat-model entry (the resolve→connect TOCTOU is real and documented as a bounded,
admin-only residual).

**Backend data access and performance (05)**
- The list path is genuinely batched by design — one query per lookup kind, each served by an existing
  index (authors, report counts by type, occupancy, open status, last-verified stamps, info requests);
  **no per-row N+1 anywhere**.
- `readOnly` set on every repository read and every service read that has a boundary at all; `@Version`
  optimistic locking on `shelters` mapped to 409 in both exception shapes; no `equals`/`hashCode`
  reliance (all cross-references id-keyed); **zero JPA associations**, so the lazy-loading/N+1/cascade
  class of problems does not exist and `open-in-view: false` is safe; the viewport index is the index
  the query needs; migration quality (V1–V28 with the V13 gap legitimately filled by a transactional
  Java migration, dotted `V23.1` ordering, per-migration rationale + validate note, the PII migration
  replacing plaintext unique indexes with the hash indexes the code queries); only two background jobs,
  with the registry fetch deliberately outside the transaction and per-account commits in retention.
- Documented trade-offs verified and *not* defects (listed so they are not re-derived): the spec-mandated
  full-list read with in-memory paging, B-tree instead of PostGIS, in-memory trust filters/duplicate scan
  with written scale justifications, no caching (single instance, tiny indexed reads), and the
  per-request `isSuspended` lookup.

**API design, error handling and logging (06)**
One uniform error shape with no leakage (stack/class/SQL/path — verified against the advice's javadoc,
including the deliberately field-neutral integrity mapping); every request-reachable custom exception
mapped (a mechanical sweep of all exception classes found exactly 3 outside the advice, all explained);
narrow catch blocks with the two broad ones documented and justified, interrupt flags restored, cleanup
before rethrow, no empty bodies except two documented best-effort cases; SLF4J used consistently with
correct placeholder/argument counts and the throwable passed where it should be; no secrets/tokens/codes
in logs; no entity leakage or mass assignment; validation wired and answering 400 with the uniform body;
`Retry-After` logic correct where implemented; per-endpoint status codes matching the README table
(~20 rows spot-checked).

**Frontend clean code (07)** — compiler-verified
Zero `any`/`unknown as any`/`as any`/`$any`/`@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` in `src/`;
zero unused imports/locals/parameters (checked with both flags on, app + specs); no commented-out code,
no `debugger`, no TODO/FIXME/HACK, no stray `console.*`; no unused component/pipe/directive/route/model;
no unused npm dependency; no business logic in templates (no arithmetic, sorting, filtering or domain
predicates — only named members and `| t`); domain rules single-sourced where it counts
(`isOpenRow`/`hasReports`/`hasTrustBadges`/`shelterStatusText` plus only 4 inline status checks for
distinct presentation decisions); shared form rules in `form-helpers.ts` with boundary specs; each API
path appears exactly once, inside its owning gateway; the pre-paint duplication is mitigated by a spec
that evaluates the inline script's source against the typed functions.

**Frontend Angular/RxJS (08)**
Subscribe/unsubscribe discipline complete (20 sites read, no nested subscribes, all 8
`toObservable(locale)+skip(1)` subscriptions unsubscribed, router/listener teardown in the shell);
the hand-rolled `toObservable + skip(1)` idiom is correct (verified against the installed
`rxjs-interop` bundle); `track` on all 31 `@for` blocks; `OnPush` on all 22 components; standalone
only, no `NgModule`/`CommonModule`/`.toPromise()`/`@ViewChild`/decorator inputs — **no deprecated API
found**; typed non-nullable forms (one documented nullable capacity field); one `ApiClient` with typed
DTOs and a single `catchError`, zero untyped responses; interceptor correctness (Bearer exclusions,
centralised 401, no refresh loop, single-flight refresh with epoch guards); no stream without an error
path; Quill teardown verified leak-free against the vendored bundle; Leaflet and timer cleanup complete;
consistent state management; thin templates.

**Frontend tests (09)**
Every component/service/store/guard/interceptor/pipe/gateway has a spec; zero "should create" tests
(`rg "should create"` → 0); no `as any`/`@ts-ignore` in 23k lines of specs; guards driven through a real
`Router` including the fail-closed admin path and the `AuthStore.init()` race; `safeReturnUrl` hardened
and pinned; `HttpTestingController` used with `verify()` on the specs that need it; no `fakeAsync`
misuse; no skipped/focused/assertion-less tests; per-test isolation (`localStorage.clear()`,
re-stubbed `isSecureContext`, reset geolocation, restored `document.title`); real cross-cutting drift
guards (FE↔BE path contract with a non-vacuity assertion, route-title completeness for all three
catalogs, catalog parity, the design-token colour audit); numeric Haversine behaviour pinned through the
pages. Plus the report's own judgement that the "assert stylesheet invariants from SCSS text" pattern is
defensible *where* it is brace-balanced and anchored — which is most of it.

**Frontend security, performance, accessibility (10)**
Single sanitized `[innerHTML]` and no `bypassSecurityTrust*`/`outerHTML`/`eval`/`new Function`/
`document.write`; dynamic URL bindings sanitized by Angular and fed only numeric/encoded values;
`rel="noopener"` on all 6 `target="_blank"`; no secrets or absolute URLs in `environment*.ts`; token
storage matching the documented tradeoff with `try/catch` on every access and single-flight
cross-tab-aware refresh; no token reachable by a third-party origin today; no production source maps;
deliberate image markup (dimensions, lazy/async, `fetchpriority`, failure placeholder, alt from stored
alt or deliberate empty); a *real* WCAG 2.1 contrast spec (3 themes, computed ratios, honest-exemption
test, plus focus-visible, 48 px targets and the UA-colour bug class); complete dialog focus management
(10 specs); sound semantic structure (one `<h1>` per rendered state, landmarks, skip link handing focus
to `main`, 49/49 `<th scope>`, every control labelled, `aria-pressed` toggles, live regions for banners/
loading/async, closed mobile menu out of the tab order); lazy loading verified in the emitted bundle
(Quill stays out of `main`); open-redirect protection on both `returnUrl` consumers; defensive storage
in the theme/locale/consent stores.

**Integration and setup (11)**
FE→BE URLs *and verbs* 54/54 against the committed snapshot; request-body DTOs field-for-field 1:1;
enums as string unions equal to the backend members (incl. the alert kinds pinned by a backend IT and
the two deliberate extra audit labels); the error shape consistent on both sides and re-validated
defensively by the FE; validation constants consistent in both layers today (a drift risk, not a
defect); `.gitignore` clean (no tracked build artefacts, `.env` never tracked and ignored, nothing that
should be ignored/tracked is wrong); `dev-start.sh` + `docker-compose.yml` correct and matching the
README's steps; the documented endpoints and health check answering as documented on the running
instance; the OpenAPI snapshot in sync with the tree (re-run green).

**Sweep-level observation.** Across 131 findings, only two areas were reported clean by *every* agent
that touched them and also survived an independent instrument: (a) the inner/outer dependency structure
(no cycles, no entity leakage, constructor injection — verified three ways) and (b) the absence of
`any`/`@ts-ignore`/unused imports on the frontend (compiler-verified). Those are the two claims worth
quoting without qualification in any release note.

---

## Merge verdict

**OK with notes** — no P0. Twelve P1-class items (9 merged entries, several with multiple instances)
should be fixed before release; of those, **QW1–QW5 in the plan are all under a day's work combined**
for the four that matter most (the anonymous `reviewNote` leak, the admin recency field, the dev-proxy
erasure path, the missing transaction boundaries), which is the sweep's most actionable result: the
highest-severity defects are also the cheapest. The dependency-line question (P2-14) and the operational
foundation (no CI, no prod profile, no image) are the two items that cannot be fixed by an annotation
and therefore deserve a scheduling decision rather than a commit. One nested caveat for the parent:
before quoting suite health as release evidence, decide P1-7 (the JDK-27 failure) — the recorded reports
say 1098/0 and the reproduction says 5/5 red, and both are true on different JDKs.
