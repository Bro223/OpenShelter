# Agent 12 — Summary of the eleven-review sweep (run 2, 2026-09-21)

Read-only synthesis. The only file created is this one. I did **not** re-review the code and did **not**
re-run either suite: every `file:line` citation below is reproduced from the report that made it, and
every count, verdict and severity is attributed to its source. Where two reports disagree I say which
evidence I find stronger and why — I did not adjudicate by re-measuring.

Inputs: `reviews/01-architecture.md` … `reviews/11-integration-devops.md`, plus `reviews/BRIEFS.md`
for the agent-12 deliverable definition. A previous synthesised copy is preserved in
`reviews/run1-2026-09-21/12-summary.md`; this file replaces the top-level one.

**The tree moved under the sweep.** `HEAD` is `d247007`; between the first agent (21:08) and the last
(23:12) the working tree gained the admin-list lane, the owner's focus-ring/i18n fixes, the CORS fix
that closes agent 6's blocker, and two new ITs. Agent 9 and agent 10 both document concurrent writers
mid-run. That single fact explains most numeric disagreements below, and it is the first thing a
delivery owner should internalise (see *Top 5*).

---

## How to read the merged list

Agents used two severity scales and mapped them inconsistently. Normalised here:

| Scale in the reports | Normalised |
| --- | --- |
| Critical / P0 | **P0** — blocks merge |
| High / P1 | **P1** — fix before release |
| Medium / P2 (and agent 6's "Medium (P1)") | **P2** — plan it |
| Low / P2, Low / P3 | **P3** — report only |

Where I place an entry at a different level than its source, the source's own level is named in the
entry, so a reader can disagree with my weighting without losing the report's judgement. Raw findings
across the eleven reports: **~117**; after de-duplication: **8 P1 entries, 16 P2 entries, 7 P3 groups**
(≈45 individual low items).

---

## Evidence grades — which findings are falsifiable, which are argued

This is the load-bearing section for trusting the merge. All eleven agents executed *something*; they
differ in whether the execution could have failed.

| Agent | What it actually ran | Grade |
| --- | --- | --- |
| 1 architecture | Tarjan SCC over the import graph of **345 Java + 128 TS files**; a full production `ng build` (exit 0); package/injection scans; probe compiles | **Mechanical, reproducible claims.** The cycle/layering/entity-boundary claims are strong (a scan either finds a cycle or does not). The frontend-drift claims are grep-verified, not mutation-tested. |
| 2 backend clean code | `mvn -o test-compile` (exit 0); **normalised-body hashing across the tree** to prove three `requireLimit` bodies byte-identical; whole-tree greps for dead members (private-member occurrence scan) | **Strong on duplication and dead code** — two of its findings are proven by hashes, not by eye. Its "no dead private member exists" claim is a script over the whole tree. |
| 3 backend tests | Backend suite **five ways**: pristine working-tree copy → 1139 green (JDK 27); reversed class order → green; JDK 21 spot-run → green; `git archive HEAD` clean checkout → **1125, 1 failure**; scripted analysis of all 1111 test methods | **The strongest execution evidence in the sweep.** The HIGH is a red test reproduced in a clean checkout and made green by a one-line change — falsifiable in both directions. |
| 4 backend security | Live read-only probes against `:8080` (headers, statuses, CORS preflight); offline *resolved* dependency listing; `SELECT`-only DB checks | **Executed probes**, and it contradicts a run-1 claim *from measurement* (the `Cache-Control` live probe). Advisory reachability is argued from config reading — correctly labelled as such. |
| 5 db/perf | Live measurement: `pg_stat_user_tables` deltas around N identical requests (two independent batches, identical results), `pg_indexes`/`pg_constraint` dumps, decompiled `HibernateJpaDialect` | **Quantitative and independently reproducible.** The F1 "308 rows read for a 1-row page" is a measurement, not an estimate; the mechanism behind the earlier send-ordering fix is verified at the framework level. |
| 6 api/errors/logging | Live probes for status/content-type/log-header behaviour; read `/tmp/backend.log` and measured a **byte-for-byte zero log delta** after 7 throttled/unauthorised requests | **Executed.** Its "XML is served" and "no log line appears" claims are observed facts; its CORS blocker was later confirmed fixed by agent 11. |
| 7 frontend clean code | Scripted whole-repo scans (imports, `imports:` entries, exports, npm deps); compile probes with the repo's own TS 6.0.3 / compiler-cli 22.1.5; `wc -l` + `git show HEAD:` comparisons | **Mechanical.** Its "the earlier `strict` report is wrong" adjudication is a compile probe with a control (adding `strict: false` removes the diagnostics). |
| 8 angular/rxjs | Read the **installed** framework bundles to adjudicate framework-behaviour claims (`_router-chunk.mjs`, `rxjs-interop.mjs`); `tsc --noEmit`; `ng build`; full frontend suite | **Best available evidence for framework-invariant claims** — it checked the shipped router/core source rather than asserting from memory. Its own `strict` finding was disproved by its own probe (self-falsification). |
| 9 frontend tests | Ran the suite; **three mutation experiments on `/tmp` copies** (neuter `normalizeListParams` → 1395 green; append a `@media` `display` → 107/107 green; delete the quill asset entry → 71/71 green) | **The only agent that falsified its own claims by mutation.** Its P1s are the most trustworthy test-gap findings in the sweep. |
| 10 frontend sec/perf/a11y | Production build with `--stats-json`; ran the suite (**2 failures**); ran the CSP post-build regex and `scripts/spa-csp.py` against the real emitted HTML (hashes matched); recomputed contrast ratios with the WCAG formula | **Executed, with artifacts.** Its red-suite finding is a reproduction with the exact failing assertion text; its a11y claims are computed ratios. |
| 11 integration/devops | Ran the frontend suite (**1398 green**); ran the three backend classes touching this lane's contract (31 tests, green); ran `DocumentationFactsTest` in **both** a `git archive HEAD` checkout and the working tree; live contract probes with an admin JWT | **Executed, both sides of the contract.** Its H1 is the same clean-checkout failure agent 3 found, independently reproduced. |

**What this means for the merge.** (a) The three test-gap findings with mutation proof (agent 9) and the
clean-checkout failure (agents 3 and 11, independently) are the entries I would act on first — they are
*proven absent*, not merely unobserved. (b) The two live-measured cost findings (agent 5) are real but
scale-dependent (308 rows today); their severity is a judgement, not a measurement. (c) Findings that
are argued from reading produce the bulk of P3 and should be weighted accordingly. (d) Agent 8's
mechanism-verification approach means its *framework-invariant* corrections (agent 8 F5: the router does
**not** complete `paramMap` on deactivate) should be believed over any report that assumed otherwise.

---

## Executive summary

**Backend — 7/10. Frontend — 6.5/10.** No P0 exists: nothing corrupts data, no live unauthenticated
write path, no leaked secret, and both suites are green **on this machine**. What holds both below 8 is
a set of P1 items that are individually small but release-gating, plus one structural fact the sweep
makes uncomfortable: **nothing in this repository is mechanically enforced** — no CI, no static
analysis, no coverage gate, no dependency scan, no equivalent of the backend's documentation guard on
the frontend. Every P1 and P2 below was catchable by a machine that runs on a merge.

### Backend — 7/10

*Why it is high.* The engineering quality is better than typical for this size, and it is *verified*
rather than asserted: 0 class- and 0 package-level cycles across 345 main Java files; no
`persistence` import outside `persistence/`; every controller returns a DTO record; constructor-only
injection (6 `@Autowired`, all on constructors; 50 `@Value`, none field-level); a framework-free
`domain/` (34 files, only `java.*` imports); fail-closed profiles with no `@Profile` anywhere; one
`@RestControllerAdvice` covering 55 exception types. Security is the strongest single area: all 32
`/admin/**` handlers re-check admin per request from a column read, no IDOR found across 16 controllers,
all 22 `@Query` statements bind named parameters, mass assignment has no path, SSRF defences are
per-hop on **every** redirect, PII is AES-256-GCM with a keyed domain-separated blind index, and the
previous sweep's two correctness defects (leaked moderator note, missing write-path transaction
boundaries) are fixed and re-verified. The suite is broad and honest: 1139 tests, no mocking framework,
no assertion-free test, green under **reversed class order**.

*Why not 8.* Three things. (1) **The new paging feature does not do what it says** — a 1-row page reads
all 308 shelter rows and runs all 13 statements, measured byte-identical to the unpaged request
(P1-1). (2) **The error/contract surface has two pre-existing defects that affect all 64 operations**
(XML/XHTML negotiation against a JSON-only contract; `/error` behind authentication so a public
endpoint answers `401` with `path:"/error"`, P1-7) plus a snapshot that now documents a 400 as an array
(P2-5). (3) **A clean checkout of `d247007` is red** (P1-6) — today's green is environment-dependent.

*Why not 6.* Nothing found is a data-integrity or authorization defect. The P1s are local, cheap and
well-located, and the architecture does not need to change to fix any of them.

### Frontend — 6.5/10

*Why it is high.* Type and structure discipline is excellent and mechanically checked: **zero `any`,
zero `@ts-ignore`, zero unused imports, zero unused npm dependencies, zero unused components/routes**;
26/26 production components `OnPush`; zero NgModules; every `@for` carries `track`; one `HttpClient`
owner with one `catchError`; typed DTO promises throughout; guards driven through a real router in
tests; **1398 tests green** with no `.only`/`.skip`/`fakeAsync`; contract guards that compare gateway
URLs and DTO fields against the committed OpenAPI snapshot; no production source maps; a CSP whose two
hashes were verified against the actually emitted HTML; catalogs lazy with a measured 141 kB reduction.

*Why not 7.* The frontend's weaknesses are concentrated where user-visible behaviour lands. (1) The
**admin surface bypasses every i18n seam** — 29 `bannerMessage` calls without the callback, 10
hardcoded English success banners, three `EN[...]`-frozen constants, two helpers re-exposed without
`translate` — so an Estonian or Russian moderator reads English while the public pages are translated
(P1-4). (2) **Two state bugs in the lane that just shipped** (P1-5: a query-param change during an
in-flight fetch is dropped and unrecoverable; the shelters list has no fetch-sequence guard). (3) **The
guard class the repo has now hit four times**: a spec that passes while the behaviour is gone, proven by
mutation for the paging clamp and the `<td>`-class scan (P1-1, P1-8). (4) A **documented WCAG 2.4.7
deviation was introduced, not inherited** (the global `*:focus { outline: none }`), and its own record
undercounts its scope (P2-x/agent 10 F2). (5) The design rules this project wrote down are not enforced
anywhere: the architecture diagram is five revisions stale and the frontend has no guard (P2-1).

*Why not 6.* Zero XSS sinks, no secrets in environments, guards fail closed, the accessibility contrast
suite is real and passing, and the new lane's paging *logic* survived six traced interleavings plus a
full read of its URL→state→load paths. The problems are fixable in days, not weeks.

---

## Resolved during the sweep — record these as CLOSED, not open

Two findings were raised as blockers by one agent and were **already fixed in the working tree** by the
time a later agent looked. A third case needs a precise statement.

**1. CORS exposure of `X-Total-Count` — CLOSED (verified fixed).** Agent 6 **BLOCKED** on this
(`reviews/06-*.md`, Finding 3: `SecurityConfig.java:167-177` sets allowed origins/methods/headers and
`allowCredentials` but no `setExposedHeaders`; zero `exposedHeaders` hits repo-wide at that time; proven
live with no `Access-Control-Expose-Headers` on a paged GET), and agent 8 filed the same defect
independently (F11: `pagedResult` degrades to `body.length`, a full last page then reports one page,
the control disappears). Agent 11 later verified the fix: `SecurityConfig.java:178`
`setExposedHeaders(List.of("X-Total-Count"))`, plus a **new** `CorsExposedHeadersIT` that asserts
exposure present for the configured origin and absent for a foreign one — run green by agent 11
(31 tests across the three lane classes, exit 0). **Verdict: closed; do not carry it into the merged
list as open.** Residual: the *test-gap* aspect (agent 3 Finding 6: "CORS is security-relevant
configuration with zero assertions", `grep -i cors src/test` → 0 hits at 21:23) is now partially
answered by that IT — it asserts the exposure pair, not the preflight/credential behaviour agent 3
asked for. Note the timeline (agent 3's grep precedes agent 6's live probe), so agent 3's "zero hits"
and agent 11's "IT exists" are both true about different revisions.

**2. `DocumentationFactsTest` on a clean checkout — CLOSED in the tree, but REAL at `HEAD`.** Agent 3
rated it **HIGH** and agent 11 filed the same as **H1**. Both reproduced it the same way: `git archive
HEAD` into a clean directory → `Tests run: 1125, Failures: 1`, the failure being
`[README.md cites repository paths that do not exist] Expecting empty but was:
["docs/code-review/2026-09-08-review-output.md"]` — `README.md:645` backticks a path that
`docs/code-review/.gitignore:5` deliberately excludes, and the guard
(`DocumentationFactsTest.everyRepositoryPathCitedInTheReadmeExists`, `:60-66`, `:123-141`) asserts
`Files.exists` for every backticked `docs/…` path, allowing only `data/`, `dist/`, `target/` as runtime
prefixes. Agent 3 additionally proved causality: repointing that one citation at a tracked sibling makes
the test green (4/4). **Precise statement: the committed tree `d247007` cannot pass a clean checkout on
any machine; the working tree passes (4/4) only because the uncommitted README edit rewrites the
citations and because the ignored file happens to exist on this machine.** So this is *closed in the
working tree*, and it must land **with** this lane — otherwise CI can never be green and today's
"1139 green" remains a local artefact.

**3. Frontend suite redness — resolved by a later run, with a caveat.** Agent 10 measured the suite
**RED** at 22:43:11 (`Tests 2 failed | 1396 passed (1398)`, both failures in `design-tokens.spec.ts:523`
and `:531`: `high-contrast tokens missing from :root: ['--color-surface-overlay']`), caused by
`frontend/src/styles.scss:33-37` re-wrapping the `--color-surface-overlay` declaration across five lines
while `colorTokens()` (`:247`) reads one line at a time — a regression of the fix in `f47e106`, and
[uncommitted]. Agent 11's later run of the same suite is **1398 passed, exit 0** (and agent 1 reported
1398 passing too), so the wrap was repaired before agent 11 looked. **Verdict: closed by later
evidence — recorded as a resolved incident, not an open finding**, with the standing lesson kept (this
is the same "a formatting change reads as a missing token" class as agent 9's F2; the parser should be
hardened so it cannot recur). This is also the clearest example of the tree moving mid-sweep.

**Other run-1 findings the sweep re-verified as fixed** (worth recording so they are not re-filed):
the leaked moderator note (agent 4 C1, gated at `ShelterQueryService.java:464-466`, all four
projections correct); `requireAdmin()` consolidation (agent 2 — one `AdminAccess` implementation, 32
call sites, one `isAdmin(` API-site left); the trust-weight duplication, `MEDIA_URL_PREFIX`,
`ASSET_NOT_FOUND_MESSAGE`, `MAX_ATTEMPTS` ×3, `constantTimeEquals`/`sha256Hex`, `truncate`/`requireText`,
the slug policy (agent 2, each by call-site search); the test-config mirror replaced by a delta overlay
+ `TestConfigOverlayTest` (agents 1, 11); the JDK-27 `JdkHeroImageFetchClientTest` failure (agent 3,
fixed by `670f43d`, green on JDK 21 **and** 27); `POST /dev/sms-test` truthfulness (agent 4 C2);
contact-change code persisted before send (agent 4 C5); `Cache-Control: no-store` (agent 4 **C4
contradicts** run-1 F7 with a live probe — drop it); the `/account` proxy fix done properly (agent 11);
read-model/API-debt items fixed (agents 5, 8, 10, 11).

---

## Merged findings — sorted by severity, de-duplicated

### P0 — Critical: **none.**

### P1 — High (fix before release) — 8 merged entries

**P1-1 — The paging feature is imprecise on the server and unverified on the client.**
*(merges agent 5 F1 + F7, agent 1 A13, agent 6 F14 (ordering half), agent 9 F1, agent 7 F7)*
A 1-row page costs exactly what the full list costs: `AdminController.java:139-146` calls
`moderation.listShelters(...)` then `GuidanceService.slice(...)`, and `ShelterQueryService.java:516-527`
loads **all** shelters plus 11 batched trust/provenance lookups over every id, measured at
`shelters seq +1.0 tupr +308.0` per `GET /admin/shelters?limit=1&offset=0`, **byte-identical to the
unpaged request** across two independent measurement batches (wall clock 20–21 ms paged vs 20 ms
unpaged, payload 7 080 B vs 109 410 B). The frontend pages this endpoint at 20 rows, so walking the
Shelters tab turns one pipeline into ~16, and every moderation action additionally refetches the
**un-paged** list (`admin-page.ts:845-860`, called from five action paths; the lane's own spec changed
`toHaveBeenCalledTimes(2)` → `(4)`), agent 7 F7. The public, unauthenticated `GET /api/shelters` has the
same shape and no rate limit (agent 5: 20× `?limit=5` and 20× unpaged both = `seq_scan +160`,
`seq_tup_read +9 440`). On the client, the guard that keeps the size `<select>` and the URL in lockstep
has **no test at all**: neutering `normalizeListParams` (`admin-page.ts:564-607`, `:2042-2063`) in a
`/tmp` copy leaves **1395/1395 green** (agent 9 F1, with a probe showing the feature does work today —
and that `?source=BOGUS` is sanitized for the request but left un-normalized in the URL, against the
code's own comment). A rejected `limit`/`offset` also performs the whole pipeline before answering 400
(agent 5 F7, agent 6 F14, measured). **Fix:** push `limit`/`offset` into SQL with a count query over the
same filter+order and run the batches over the page's ids only (P1-1 → LR1); call the bounds check
before the read; add the 4–6 clamping cases. **Effort: S (reorder + tests) / M (SQL push-down).**
*Severity note: agent 5 F1 = High/P1; agent 1 A13 = Low/P2 (it deferred cost to agent 5); agent 6 F14 =
Low/P2; agent 9 F1 = Medium/P1. I keep the merged entry at P1 on agent 5's measurement and agent 9's
mutation proof.*

**P1-2 — The guidance lists pay per-row and whole-library costs before the slice.**
*(merges agent 5 F2 + F3)*
`GuidanceService.java:213-221` issues one `findById(id)` per published post while its own javadoc
(`:211-214`) claims a batch — measured `guidance_posts seq +9.0/req, seq_tup_read +72.0/req` for an
anonymous `GET /api/guidance?limit=1`, i.e. before the slice. A correctly-batched alternative already
exists and is **dead code**: `GuidancePostRepository.findPublished(locale)` has no production caller.
Separately, both guidance lists load the **entire** media library per request
(`GuidanceController.java:133` + `:211-217` → `mediaAssets.findAll()`; the admin twin at
`AdminGuidanceController.java:165` + `:662-668`, whose `List<GuidancePost> posts` parameter is never
used — the leftover of exactly the fix). Measured: `media_assets seq +1.0/req, seq_tup_read +8.0/req`
per request, page-size independent, on a table that grows with admin uploads. The public index is
permit-all and unthrottled, so the per-request cost is attacker-addressable. **Fix:** one `findByIdIn`
batch (or wire `findPublished`), one `findByIds` over the page's hero ids. **Effort: M.**
*Agent 5's own levels: F2 Medium/P1, F3 Medium/P2.*

**P1-3 — The paging policy is duplicated on the backend and on the frontend.**
*(merges agent 2 F1 + F2, agent 7 F2, agent 1 A2, agent 6 F14, agent 5 F10 — plus agent 2 L2/L3)*
Backend: `requireLimit`/`requireOffset` exist **four times** and three bodies are byte-identical after
whitespace normalisation (`AdminController.java:153-171` (in flight), `AdminGuidanceController.java:231-249`,
`GuidanceController.java:144-162`, `ShelterController.java:530-548`), the fourth reading the bound from
the constant that the other three ignore; the message `"limit must be between 1 and 200"` is hardcoded at
**six** sites while `ShelterQueryService.MAX_PAGE_SIZE` is used at **one**; two exception vocabularies
express one rule, and `GuidanceValidationException`'s own javadoc calls it "a rejected guidance/media
**write** while a shelter **read** now throws it (agent 1 A2, agent 2 F1/L3). Added by the lane ~1 commit
after `101dbe4` removed exactly this pattern for `requireAdmin()`. The generic `slice` is likewise
implemented twice (`GuidanceService.java:243-250` vs `ShelterQueryService.java:188-195`, identical
bodies), and a **shelter** controller imports `guidance.GuidanceService` + `GuidanceValidationException`
for a pure list utility (`AdminController.java:6-10`), as do the two guidance controllers (agent 2 F2,
agent 5 F10, agent 1 A2). `X-Total-Count` + the count/slice/header block is repeated three times (agent 2
L2). Frontend (agent 7 F2, "P1 for the in-flight lane: fix it before this lands"): `parseListPage`/
`parseListSize` (`admin-page.ts:2042-2056`) are **byte-identical, comments included**, to `parsePage`/
`parseSize` (`guidance-list-page.ts:188-203`); the "last page at the new size" clamp appears 6×; the
`X-Total-Count → total` fallback is duplicated (`admin-gateway.ts:557-568` vs `guidance-gateway.ts:93-97`);
two result types model one header contract (`PagedRows<T>` vs `GuidancePageResult`); the out-of-range
markup appears 3× and its CSS twice verbatim; the navigate/sync/goto routines are duplicated pairs — and
the **Shelters** tab's page size is imported from the **blog** feature
(`admin-page.ts:42-43` ← `gateways/guidance-gateway.ts`), so the admin list changes behaviour if the blog
page size ever changes, while `Pagination` already declares that range (the `[sizes]` bindings are
no-ops). **Why it matters:** the cap and the page-size vocabulary must not diverge between four
endpoints and two pages; today a single edit moves one and silently leaves five. **Fix:** one
`PageBounds`/`Pagination` helper with one 400 exception (backend), one `shared/paging.ts` + one result
type + constants moved to the control's home (frontend). **Effort: S–M.** *Agent levels: 2 F1 Medium,
7 F2 Medium/(P1-for-lane), 1 A2 Medium/P1, 5 F10 Low/P2, 6 F14 Low/P2.*

**P1-4 — The admin surface bypasses every i18n seam, and the admin search keeps two sources of truth.**
*(merges agent 7 F1 + agent 1 A12 + agent 8 F7)*
Agent 7 rates this **High/P1**; agent 1 rates the same defect Low/P2 and defers it to the admin lane. The
admin page is a fully catalogued surface (`messages.ts` carries the `admin.*` family; its guidance/media
tabs already translate) and is reachable in all three locales. Four holes: (a) **29** `bannerMessage()`
calls without the translate callback (`admin-page.ts:755,773,810,838,974,…,2015`; `error-copy.ts:126-131`
then falls back to the English `CLIENT_COPY` table) where all 18 production call sites **outside** that
file pass the callback; (b) **10** hardcoded English success banners in the same class
(`:768,805,972,1005,1068,1119,1142,1224,1250,1311`) while 10 sibling sites in the same file use the
catalog; (c) three copy constants consumed only by the admin can never localize —
`PRIVATE_LOCATION_BADGE = EN['shelter.privateBadge']` (`shelter-copy.ts:135`),
`INACCURATE_WARNING = EN['account.contrib.inaccurate']` (`:170`, although the key **is** translated in
`et.ts:531`/`ru.ts:544`) and the keyless literal `INACCURATE_BADGE = 'Inaccurate'` (`:178`) — so the same
badge reads in Estonian on the public map and English in the admin; (d) two seam-aware helpers
re-exposed without the callback (`admin-page.ts:476,492` vs `map-page.ts:235,242` /
`shelter-detail-page.ts:190,197`). Seven spec pins currently lock the English literals
(`admin-page.spec.ts:599,642,772,908,1087,1160,1520`), so the drift looks intentional. Agent 8 F7 adds
the same shape for the new search: `guidanceSearch` (the `FormControl`) and `guidanceQuery`/`?q=` are
synced only on the two handler paths, so opening `/admin?q=foo` or switching content language can show
an input that disagrees with the applied filter. **Fix:** pass `(key) => this.i18n.t(key)` at 29 sites,
add 10 keys, replace 3 constants with `MessageKey`s, pass the callback at the two helpers, write the
control inside the sync, update the 7 pins. **Effort: S (mechanical).**

**P1-5 — Two state bugs in the lane that just shipped: a dropped in-flight reload and a missing
fetch-sequence guard.** *(agent 8 F1 + F2, both [in-flight])*
`admin-page.ts:643-645` (shelters) and `:623-625` (guidance): `const live = rows() !== null || loadError()
!== null; if (!firstVisit && (!live || key === viewKey)) return;` — `!live` means "a fetch is in flight",
and any query-param change in that window returns early **without** updating state or reloading, and
nothing re-checks the URL when the promise settles. Repro (traced): first visit to the Shelters tab, click
the **Community** chip while the paged list loads → the URL becomes `?source=USER` while `shelterSource()`
stays `'ALL'` and the in-flight unfiltered rows render with All active; re-clicking does not recover,
because the router skips a same-URL navigation (`onSameUrlNavigation = 'ignore'`). This voids the lane's
own stated contract ("URL is the state: every control lives in the route query; no component-local hidden
state") and the reported "the chip/search relies on the URL emission" fixes. No spec can catch it — every
helper awaits. Separately, `loadShelters`/`refreshShelters` (`:822-861`) have **no** fetch-sequence guard
while the sibling guidance path 40 lines below does (`guidanceFetchSeq`, `:1356/1371/1381`), so the last
response to *arrive* wins and a superseded filter's rows can stick permanently — a stale-data risk in a
moderation tool. **Fix:** compare only the view key (or re-run the sync from the load's `then`/`catch`);
one monotonic counter per list. **Effort: S (both two-line changes).**

**P1-6 — The committed tree is red on a clean checkout.**
*(agent 3 HIGH + agent 11 H1; agent 1's addendum cross-checks it)*
See the *Resolved* section above: reproduced twice from `git archive HEAD` (`1125 tests, 1 failure`),
caused by `README.md:645` citing the gitignored `docs/code-review/2026-09-08-review-output.md`; the
working tree passes only because of uncommitted bytes and a locally present ignored file. Agent 1
independently confirmed the citation, the `.gitignore:5` line and the tracked-file list. **Why it
matters:** it decides whether CI can be green at all, and it is the failure a CI job would have caught
(P2-16). **Fix:** land the README edit (already written) + P2-16. **Effort: S.** *This is the only entry
whose source severity is High at HEAD and closed in the tree — treat it as "must land with the lane".*

**P1-7 — The published contract is not what the API does: XML/XHTML is served for JSON-only operations,
and `/error` is behind authentication so a public endpoint can answer 401.**
*(agent 6 Finding 1 + Finding 2; pre-existing, both rated Medium/P1)*
No `produces` anywhere in `src/main/java`; `jackson-dataformat-xml` arrives transitively via
`springdoc-openapi-starter-webmvc-ui` (`pom.xml:53-57`, unconditional, no `<profiles>`); no content
negotiation config. Live: `GET /api/guidance` with a browser `Accept` → `200 Content-Type:
application/xhtml+xml` with an XML body; the **error** body has the same second wire form
(`<ErrorResponse>`), so "one uniform error shape" is not one on the wire; `application/xhtml+xml` is
served from endpoints returning user-submitted content (mitigated only by `X-Content-Type-Options:
nosniff`). The SPA is unaffected (Angular prefers JSON). Consequence: **every one of the 64 operations**
has an inaccurate machine-readable contract. Second half: there is no `/error` matcher in the chain
(`SecurityConfig.java:200-202`, `:241`), so Spring Security authorises the ERROR dispatch by default —
live, `GET /api/guidance`, `/api/shelters` and `/api/shelters/{id}` (all `permitAll`) answer
`401 {"…","message":"Authentication required","path":"/error"}` when `Accept` is unsatisfiable, and an
over-long URI turns a container 414 into a 401; the error envelope's `path` is documented as "the request
path that failed" and reports the internal dispatch path instead. **Fix:** pin
`produces = application/json` (or narrow `ContentNegotiationConfigurer.mediaTypes`), which removes most
of the second defect's trigger; permit the error dispatch and use
`jakarta.servlet.error.request_uri`. **Effort: S.** *This is the reason agent 6's own verdict is BLOCK
scoped to its area — the blocker it named (CORS) is closed, but these two P1s remain open.*

**P1-8 — The `<td>`-class design-token guard still passes while the behaviour is gone
(mutation-proven).** *(agent 9 F2, Medium/P1, plus agent 10's identical class)*
`design-tokens.spec.ts:826-834` uses `String.match` (first occurrence only, not brace-balanced, unlike
the `balancedBlock` helper introduced two tests above) and `if (!block) continue`, making "unchecked"
indistinguishable from "clean". Mutation proof: appending
`@media (max-width: 900px) { .admin-cell--name { display: flex } }` to
`features/admin/_admin-shared.scss` — exactly the defect the guard's own comment describes and the
row-separator regression the lane just repaired (`_admin-shared.scss:36-78`) — leaves
`design-tokens.spec.ts` **107/107 green**. This is the fourth instance of the class in this repo (two
were fixed by adopting `balancedBlock`; the paging clamp of P1-1 and the wrapped-token regression of the
*Resolved* section are the others). **Fix:** reuse `balancedBlock`, iterate **every** occurrence, fail on
a missing rule. **Effort: S.**

### P2 — Medium (plan it) — 16 merged entries

**P2-1 — `AdminPage` is the repo's largest file, grew in this lane, and contradicts the frontend's own
written rule.** *(agent 1 A3 + A10, confirmed by agent 7)* `features/admin/admin-page.ts` is **2 072
lines** in the working tree (1 640 committed — the lane *added* 432), ~140 members (88 methods + 52
signal/inject fields), 26 gateway calls, 26 + 9 tabs; `admin-page.html` 1 223 lines; ≈3 577 lines with
SCSS. `frontend/docs/01-frontend-architecture.puml:8-9` — the file that declares this project's
structure rules — says "Components are thin shells … **Zero business logic**", and that same diagram says
"**SIX tabs**" against nine `AdminTab` values, omits `features/guidance` and `core/i18n` entirely,
lists no `/blog` route and undercounts the gateways. The pattern that fixes it is already proven in the
same directory (three panels extracted). **Effort: M** (extract one panel per remaining tab) + **S**
(bring the puml current and add the guard the backend already knows how to write — a spec that fails when
a `features/*` directory or `AdminTab` value has no counterpart). *Note the backend's own guard is the
model but is currently red at HEAD (P1-6).*

**P2-2 — `GuidanceService` is a god service and it originates the duplication in P1-3.**
*(merges agent 1 A4 + agent 2 F5, with the duplication it spawns and the earlier sweep's extraction
plan)* 1 290–1 291 lines (agent 1 / agent 2 — a one-line counting difference), **25–26 public methods**,
**7 constructor dependencies**, 22 `@Transactional` methods, longest method 72 lines; four
responsibilities (post lifecycle, translations/locale scope, ordering, generic list utilities) and the
two reorder methods duplicate the same validation loop, stale-list check and no-op short-circuit. Its
static helpers (`searchableBody:129`, `matchesSearch:144`, `slice:243`) are the de-facto **cross-feature
utility API**, which is why a shelter controller imports a guidance service (P1-3). **Extraction plan
(unchanged from the earlier sweep, incremental, no behaviour change):** a `GuidanceSearch`
(`searchableBody` + `matchesSearch` + `MAX_SEARCH_LENGTH`), the neutral list helper for `slice`, a
`GuidanceOrderingService` sharing one parameterised validation walk, and a package-private
`GuidanceValidation`, leaving post CRUD + publish lifecycle in place. Existing `GuidanceServiceTest`
mostly keeps working. **Effort: M.** *Both sources rate it Medium.*

**P2-3 — The authenticated-user primitive is still copy-pasted five times; only the admin half was
consolidated.** *(merges agent 2 F3 + agent 1 A5)* `api/AdminAccess.java:47-50` is the extracted one;
`ShelterController.java:591-595` and `:598-602`, `AccountController.java:245-251` (inline, duplicating
its own `currentUser()` at `:268-276`) and `VerificationController.java:161-165` repeat it. Drift is
already observable: the "principal is not a registered user" branch answers three different exceptions
(`InvalidAccessTokenException("Unknown user")`, `InvalidContactChangeException("Account not found")`,
`VerificationFailedException("Account not found")`). This is the *same root cause* the previous sweep
rated High for the admin copies — the area is not closed. **Fix:** one `requireUserId()` next to
`AdminAccess` (agent 2 F3). **Effort: S.** *Agent 2 Medium, agent 1 Low/P2.*

**P2-4 — Small duplicated helpers/policies survived the refactor.**
*(agent 2 L7)* byte-identical `requireShelter(long)` in two classes
(`ShelterReportService.java:320`, `AdminModerationService.java:616`); identical contact `normalize` in
two classes with the same normalisation inlined 7 more times — including `security/PiiCrypto.java:143`,
which feeds the **email hash used for lookups**; identical `inTransaction(Supplier)` in two auth
services; the dangling-actor string `"Unknown"` inlined 6× while the neighbouring case has a constant
(`AdminModerationService.java:88`); `"Authentication required"` inlined 4×. **Effort: S.** Per-item low,
but they are why "is this the same rule?" is still expensive.

**P2-5 — The committed OpenAPI snapshot regressed the 400 error body for the endpoint this lane
changed.** *(merges agent 11 M2 + agent 6 F9)* `AdminController.java:116-117` adds a method-level
`@ApiResponse(responseCode = "400")` with no `content`; the global customizer only attaches the uniform
body to statuses the operation does *not* declare (`OpenApiConfig.java:133-137` `attachIfAbsent`), so
springdoc fell back to the return type — the regenerated `docs/api/openapi.json` now documents that 400
as `*/*: array of AdminShelterDto` where HEAD documented `application/json: $ref ErrorResponse`, and the
live body is the uniform `ErrorResponse`. The sibling `/admin/guidance` and `/api/guidance` 400s share
the flaw, and `415`/`405` appear on **no** operation although the runtime returns both with the uniform
body. The frontend's two contract gates read that snapshot. **Fix:** add
`content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))`
— the repo's own idiom at `ShelterController.java:181-184` — plus `attachIfAbsent` for 415/405;
regenerate. **Effort: S.** *Agent 11 Medium, agent 6 Low for the 415/405 half.*

**P2-6 — The human contract (README) no longer matches the endpoints it documents, and one parameter
changed meaning under an unchanged name.** *(merges agent 6 Finding 4 + Finding 10 + agent 11 M1)*
`grep -c X-Total-Count README.md` → **0** although three endpoints return it and the frontend depends on
it; `limit`/`offset` are missing from the `GET /api/guidance`, `GET /admin/guidance` and
`GET /admin/shelters` rows (the lane updated only the `GET /api/shelters` row);
`GET /admin/reports?limit=` is documented nowhere; and `README.md:392` still advertises
"`status`/`source` **exact-match filters**" while the enum is now `REGISTRY|USER|ALL` — live,
`GET /admin/shelters?source=PAASETEAMET` (legal before the lane, still the documented vocabulary) answers
**400 "Malformed request"** with no hint. Within one file the javadoc/`@Operation` on that parameter still
says exact-match while the `@Parameter` two lines away says grouping, so the README/OpenAPI pair is
untrustworthy. (`DocumentationFactsTest` guards only that *paths* appear, never params, so nothing
fails.) **Fix:** update the rows, add the `X-Total-Count` sentence, state the new vocabulary and the
break; or accept the legacy values as deprecated aliases. **Effort: S.** *Agent 6 rated it P1; agent 11
Medium. It is documentation, but it is the documentation a client follows — placed here and flagged
because the break is real.*

**P2-7 — The 429 contract promises `Retry-After` that handlers do not send, and throttling/auth failures
leave no log line although the runbook says to monitor them.** *(merges agent 6 Finding 5 + Finding 7)*
`OpenApiConfig.java:150` attaches "429 — `Retry-After` in seconds" to every operation without a
per-operation 429 (58 of 64, plus 6 per-operation claims such as `LocationController.java:92-93`,
`AuthController.java:135,217`, `ShelterController.java:338`, `README.md:341`), while only
`ApiErrorHandler.java:473-499` sets the header (conditionally) — live, 7 calls to `POST /api/geo/resolve`
produced 429s with **no** `Retry-After`, and the snapshot regeneration did not drop the false claim.
Separately, four 429 handlers and all auth failures write **nothing**: after 7 throttled/unauthorised
requests the `/tmp/backend.log` delta was byte-for-byte empty (whole log 87 lines, all boot), while
`docs/security/operations.md:192-218` tells operators to monitor exactly those lines; the reset-cooldown
skip is DEBUG at `PasswordResetService.java:228` where the doc says INFO. **Effort: S** (send the header
or delete the claim; one WARN per throttle kind). *Agent 6 rated Finding 5 P1; both placed here because
neither changes behaviour — they change whether the documented contract and the runbook are true.*

**P2-8 — Backend test gaps: four untested error mappings, one untested outbound client, one
unreachable branch, one untested security guarantee.** *(agent 3 Findings 2–5 and 8)*
`HttpUrlRedirectClient` (`:32-64`) has **zero** test references while its four security-relevant
promises (non-`http(s)` rejection, never auto-follow, 3 s/5 s timeouts, fixed User-Agent) are the reason
the geo-resolve path cannot be redirected into SSRF — and its sibling `JdkHeroImageFetchClient` has
exactly that test, so this is an asymmetry, not a house style. `ShelterReportService.java:155-160`'s
lost-race → `DuplicateReportException` branch (the case its javadoc calls "the authority") is
unreachable: the in-memory fake is a plain `Map.put` and no test substitutes a throwing repository.
**Four** `ApiErrorHandler` mappings are asserted nowhere, directly or end-to-end — `dataIntegrity` → 400,
`heroImportUnreachable` → 502, `locationUpstream` → 502, `locationResolve` → 400 (`grep` for
`isBadGateway|BAD_GATEWAY|502` in tests → 3 hits, all comments) — and the two 502s are a
frontend-consumed contract ("retry later" vs "your link is broken"). The JWT filter's "a demoted admin's
existing token loses `ADMIN`" guarantee (`JwtAuthenticationFilter.java:73-80`) is untested although its
two sibling branches have tests. Small units with no direct test: `Tokens`, `Codes`,
`VerificationRules`' compact constructor, `CommaSeparated`, `DnsHeroAddressResolver`, `TextTruncation`,
`TextValidation`. **Effort: S each** (agent 3's prioritised list is directly actionable).
*The CORS item in the same list (agent 3 Finding 6) is now partly answered — see the Resolved section.*

**P2-9 — Media: full-size originals into 40–72 px thumbnails, two unpaged admin lists, and
origin-relative URLs that break the documented cross-origin deployment.** *(merges agent 10 F3 + agent 5
F4 + agent 11 M3 + the CSP half of agent 10 F5)*
The admin Media tab renders one full-size `<img>` per asset (`admin-page.html:1083-1091` 40×40,
`guidance-order-list.html:69-76`, `guidance-editor.html:133-140`/`:187-196`) with no variant URL and no
`srcset` (0 hits repo-wide), so N uploads means N original downloads to fill thumbnail boxes;
`loading="lazy"` bounds which images load, not the bytes each. `GET /admin/media` and `GET /admin/users`
are still unpaged whole-table reads, and the user path **AES-GCM-decrypts PII for every row** before
filtering GUEST rows in memory (measured: `users seq +4.0/req` for 62 accounts). Media URLs are
origin-relative (`MediaService.java:50` `MEDIA_URL_PREFIX = "/api/media/"`, live
`heroImageUrl: "/api/media/….jpg"`) and bound straight into `[src]`, while only `ApiClient` prefixes
`environment.apiUrl` — so in the deployment `environment.ts:8-25` and `frontend/README.md:140-145`
tell operators to configure, **every JSON call works and every image 404s**; no test covers it. Agent 10
F5 adds the same assumption in the shipped CSP: `docs/deploy/spa-csp.md:41`'s one-liner has
`connect-src 'self'` / `img-src 'self'` with no slot for the API origin, so following both documents
correctly yields a page whose API calls and images are blocked (console-only failure). **Effort: M**
(`?w=`/derived thumbnail + `srcset`, page the two lists, one URL-mapping helper or make same-origin
mandatory) **+ S** (one sentence in the CSP doc).

**P2-10 — The build budgets are permanently red, the auth/account surface is still eager, and the numbers
documenting both are stale.** *(merges agent 10 F4 + agent 1's drift note + agent 11 L1)*
Measured initial bundle **720.85–720.87 kB raw / 175.40 kB transfer** — **160.85 kB over the 560 kB warn
budget** — plus 8 component-style warnings (map-page 8.29, admin-page 6.68, shelter-detail 6.08,
page-shell 4.92, guidance-editor 4.27, submit-shelter 4.11, guidance-translations 4.08,
guidance-order-list 4.04 vs the 4 kB warn): 9 warnings printed. The warn budgets are therefore
permanently red and guard nothing until the 1 MB error line. `app.routes.ts:39-70` still routes
`MapPage`, `LoginPage`, `RegisterPage`, `ResetPage`, `VerifyPage`, `AccountPage` eagerly — ≈**111 kB of
`main-*.js` output** no first-paint visitor needs (~15 % of the initial bundle) — while the surrounding
route comments cite bundle budget. The READMEs still document 670.83 kB / "four component SCSS budgets
warn" (2026-09-18). **Effort: S** (`loadComponent` for five routes, one line each) **+ S** (re-baseline
the warn budgets to measured numbers).

**P2-11 — A new developer still cannot run the project from the README as written.** *(agent 11 M4)*
(1) There is **no `.env` step although it is mandatory in every profile**: `PiiKeys.java:34-40,46-51`
throws on a blank key fed by `application.yml:104-105` (`${PII_AES_KEY:}`), no `.env.example` ships
(`README.md:540` only "reserves" the convention), and `dev-start.sh` checks Postgres but never the keys —
so the quickstart's step 4 dies with `IllegalStateException: PII_AES_KEY is not set` while the same
section claims "steps 1, 4 and 6 are all it takes". (2) No Node requirement in the root README, and the
frontend's "Node 22+" is **wrong**: `@angular/build@22.1.7` engines are
`^22.22.3 || ^24.15.0 || >=26.0.0` and `frontend/package.json` has no `engines` field, so Node
22.0–22.21 passes the documented check then fails cryptically. (3) Two stale strings: `frontend/README.md:47`
names `--proxy-config proxy.conf.json` (the file is `proxy.conf.js`) and `README.md:492` lists the
pre-fix `/account/` prefix. **Effort: S.**

**P2-12 — Security hygiene: the three items the security agent would fix before a release, despite
rating them Low.** *(agent 4 F1 + F2 + F4 + F8)* (a) **6-digit one-time codes are stored as an unkeyed,
unsalted, single-round SHA-256** (`PasswordResetService.java:199,278`, `ContactChangeService.java:169,248`,
`PhoneVerificationProvider.java:62`, primitive `CodeHashes.java:33-41`) — a 10⁶ space, so anyone with read
access to a dump, backup or replica credential recovers a live code in under a second per row, while the
**neighbouring** secret in the same tables is AES-256-GCM under an env-only key with a **keyed**
domain-separated blind index (`PiiCrypto.java:52-80,126-140`). Impact path given honestly: a code plus
the 15-minute TTL → `POST /auth/password-reset/confirm` → password replacement; the online defences
(5-attempt lockout, single-use, per-(IP,e-mail) bucket) do not apply offline. Fix uses a primitive
already in the tree (`PiiCrypto.blindIndex` + a `v2:` slot tag). (b) **HSTS never fires in the documented
deploy shape** (`SecurityHeadersFilter.java:47-49` gates on `request.isSecure()`, no forward-header
handling anywhere; live `X-Forwarded-Proto: https` → no HSTS) while `operations.md:101-103` claims the
opposite; the IT cannot catch it because it sets the scheme on MockMvc. Fix by honouring
`X-Forwarded-Proto` from **trusted** peers only — explicitly **not**
`forward-headers-strategy: framework`, which would defeat `ClientIps`. (c) Three artifacts are behind
advisories that only configuration keeps unreachable (`tomcat-embed-core 10.1.55` ×3, `jackson-databind
2.21.4`, direct `bcprov-jdk18on 1.78.1`) — no `RewriteValve`, no cluster, no `@JsonView`, no BC provider
registered, so nothing is exploitable today; two version properties + a bump and a scanning gate fix the
class. (d) The published dev DB credentials have no fail-closed guard and `docker-compose.yml:13`
publishes `5432:5432` on every interface while the rest of the config fails closed. **Effort: S each**
(bcprov 1.85+, two properties, the HMAC swap, one guard) — and see P2-16.

**P2-13 — Data-layer cost and hygiene at scale.** *(agent 5 F5, F6, F8, F9, F11 + agent 11 L4)* The
public permalink lookup has **no usable index** (`findBySlugOrderByLocaleAscIdAsc` cannot use
`uq_guidance_post_translations_locale_slug (locale, slug)` — leading column `locale`; every `/blog/{slug}`
view scans twice); four `ON DELETE SET NULL` FK columns added in V19/V23 still lack the index V30 gave
`moderation_actions.moderator_id`, so each retention erasure adds four sequential scans; `findLatest`
goes through `PageRequest`, so a **full** page costs an extra `count(*)` the audit trail never uses; a
hero-import publish holds a pooled connection across the remote fetch (bounded by the 10 s import budget,
pool 20, timeout 5 s — the class comment acknowledges it, and it is the shape the earlier send-ordering
fix does **not** cover); registry import does a read-modify-write per row (not worth restructuring —
`IDENTITY` ids make JDBC batching impossible, and a set-based upsert is larger than the benefit at 300
rows); and `GET /admin/reports?limit=` is implemented, validated and snapshotted but the UI never sends
it, so the one remaining unbounded admin list cannot report truncation. **Effort: S each** (one migration
with five indexes; one signature change; one reorder).

**P2-14 — Production-dead `VerificationSendLog.tryRecord` whose javadoc advertises an atomicity the
shipped path replaced.** *(merges agent 2 F4 + agent 4 F5/C6)* `tryRecord` has **no production caller**
(`grep -rn tryRecord src/main` → two declarations and a comment; callers are
`VerificationServiceTest.java:328-345` and `FileVerificationSendLogTest.java:147`), while production
reads (`VerificationService.java:121`, `countToday` `:128`) and records later (`:178`) — the exact
read-read-record pattern the interface javadoc still says the method exists to prevent. Consequence: the
suite's strongest concurrency test certifies a path that is not shipped, and the "one send per cooldown
window" property now rests on the atomic `RollingContactOtpLimiter` acquire (`:143`) alone. Agent 4's
adjudication of the run-1 disagreement is the correct reading (the two sweeps were describing different
objects: test quality vs production call graph). **Fix:** delete or `@Deprecated`-annotate + rewrite the
javadoc; add a concurrency IT asserting the bounded overcount as a test rather than a comment.
**Effort: S.**

**P2-15 — Frontend test gaps: one new gateway method with no test, one component with no spec, one
unasserted design decision, two lazily-settled locale assertions, and no e2e layer.**
*(agent 9 F4, F5, F6, F7 + F8-ish)* `AdminGateway.listGuidancePostsPage` (`admin-gateway.ts:267-275`,
path builder `:539-556`, `pagedResult` `:561-568`) has **0** references in `admin-gateway.spec.ts`
while its twin `listShelters` has 5 covering the identical contract — and the page specs call a **fake**
gateway, so the URL builder and the header mapping are never executed anywhere. `GuidanceTranslations`
(`features/admin/guidance-translations.ts:23-29`) is the only decorated class in `src/app` with no spec
reference (its three extracted siblings and the new `Pagination` all have one); its own contract
(`armed()`, `translationTarget()` gating, the `busy()` label swap, the four emitted outputs) is covered
nowhere. The lane's stated key decision — "the review queue is never paged" — has no assertion (only
call counts), so a future `{limit, offset}` on the queue leg would silently show page 1 to moderators
with a green suite. Two locale-switch tests settle on a microtask and rely on the lazy catalog arriving
inside `whenStable()` instead of awaiting `ensureCatalog('et')` (they pass today; every other site awaits
explicitly). E2E is still absent (documented deferral) — the five browser-only flows remain unverified.
**Effort: XS–S each; e2e L.**

**P2-16 — No CI, no application image, no static analysis, no coverage gate, no dependency scan.**
*(merges agent 11 L6 + agent 2 L8 + agent 4 F4's scanning half)* `find` over the tree returns **no**
`Dockerfile*`, no `.github/`, no `.gitlab-ci.yml`/`Jenkinsfile`, no `mvnw`/`.mvn/wrapper`; the pom
declares only `spring-boot-maven-plugin` and `maven-surefire-plugin`
(`grep -in "jacoco|spotbugs|pmd|checkstyle|enforcer"` → no hits); `README.md:717`'s "Production
deployment" is a manual checklist. **This is the structural reason every other entry in this report
could recur unnoticed**: P1-6 is exactly the failure a CI job catches, P2-5/P2-6/P2-10 are docs nobody
re-measures, and both suites are green only on a machine that happens to have JDK 21 + Maven + Docker +
Node ≥22.22 + the ignored files + a `.env`. **Effort: M–L** (`mvn -B -ntp test` + `npm ci && ng test`
jobs, a multi-stage image, then SpotBugs/PMD + coverage + a dependency gate).

### P3 — Low / report-only — 7 groups (≈45 items)

**P3-A — Backend structure & configuration drift.** `api` holds 16 controllers **and** two `@Service`
classes (`ShelterQueryService.java` 780 lines, `AdminModerationService.java` 647) while `app` is the
residual bucket (18 exception classes, ports, helpers, and an HTTP adapter at
`app/HttpUrlRedirectClient.java:30`) — and the rule for choosing between the horizontal layers and the
vertical feature slices is **written down nowhere**, so "where does the new service go?" is a guess
(agent 1 A1). The fail-closed boot guards are the same template four times with one helper duplicated
verbatim (`ApiDocsGuard.java:71` == `DevEndpointsGuard.java:66`; agent 1 A6). The trusted-proxy pair is
parsed by hand in four controllers while `RateLimitProperties.java:11-15` documents it as deliberately
outside the record (agent 1 A7). `@EnableScheduling` hangs off two unrelated feature flags
(`RegistryScheduler.java:25-26`, `RetentionScheduler.java:25-26`), so a third `@Scheduled` bean or a
config removing both carriers silently disables scheduling (agent 1 A8). `ShelterController` injects
repository ports and assembles aggregates positionally (`:99-101`, `:259`, `:419-447`) and the "who may
modify a shelter" policy has **one** enforcement point — the controller (`NotAuthorException`'s only
throw site, `:480`) — while the admin path enforces a different rule at its own call site (agent 1 A9,
correcting run-1 F10, which claimed the service also checks). Component file naming keeps the legacy
suffix in three of 24 files (`shared/*.component.ts`; agent 1 A11). **Effort: S each.**

**P3-B — Backend security, report-only.** `/auth/refresh` and `/auth/logout` are the only
unauthenticated, DB-touching, **unthrottled** endpoints (`SecurityConfig.java:208`,
`AuthController.java:143-160` — no `requireRate(...)` unlike every sibling; agent 4 F6). The committed
`docs/api/openapi.json` publishes the whole `/admin/*` surface that `ApiDocsGuard` exists to withhold
(agent 4 F7 — no runtime exposure; the file is also the frontend contract). Loopback `X-Forwarded-For`
trust is on by default and the guard only warns, so a loopback-reachable process can rotate
self-declared IPs to evade every per-IP throttle **and** grow the bucket map (its memory consequence is
not in the guard text; agent 4 F9). The HEAD-rules-GET fix was applied only to `/api/media/**`
(`SecurityConfig.java:227-235`), so `HEAD /api/shelters` and `HEAD /api/guidance` answer 401 while
`HEAD /api/media/….jpg` answers 200 — deny-by-default, but the config comment now overstates what it
does (agent 4 F10). `AdminSeeder.java:96,110` logs the environment-provisioned admin's **full e-mail** at
INFO on every boot while every other contact log site masks (agent 6 Finding 11; observed in the live
log). **Effort: S each.**

**P3-C — Backend API/logging polish.** Nine `log.error` sites pass `e.getMessage()`/`e.toString()`
instead of the throwable, dropping stack traces (`FileVerificationSendLog.java:117,138,158`,
`ShelterImportService.java:136,218`, `RetentionService.java:112`, `TwilioSmsSender.java:102`,
`SmtpPulseSmtpSender.java:61`, the two dev test controllers) — and `operations.md:197` asks operators to
alert on ERROR volume (agent 6 Finding 12). The one `@ExceptionHandler` outside the advice still
duplicates the error-body builder and has an unused parameter
(`AdminSiteTextController.java:68,88-97`; agent 6 Finding 13). The "malformed request" family answers a
bare `"Malformed request"` naming nothing while the paging bounds next to it are precise — live,
`?limit=abc` and `?source=PAASETEAMET` both give the same unhelpful 400 (agent 6 Finding 8). **Effort: S.**

**P3-D — Backend dead code & hygiene.** One unused import newly introduced by the lane
(`AdminController.java:4`, the only one left in `src/main`; agent 2 L1). `ShelterLimitExceededException`'s
409 message hardcodes the bound it talks about (`:12` vs `ShelterService.java:67`);
`MAX_REDIRECT_HOPS`/`DEFAULT_BUDGET` are duplicated **and disagree** (3 fetches vs 4, with a message
saying "more than 3") across `LocationResolveService.java:66,72` and `HeroImageImportService.java:79,82`;
a no-op null guard on a primitive (`ReporterTrust.java:53`); `spring-security-crypto` declared although
the starter brings it in (`pom.xml:83-86`, verified transitive chain); the lane's new test block writes
fully-qualified names inline while its sibling IT uses static imports (`AdminModerationIT.java:354-390`);
one unused test import (`GuidanceServiceTest.java:24`). Test hygiene beyond that is clean: **no**
`System.out`/`printStackTrace`/TODO/FIXME/commented-out code in `src/main`, no `Optional` abuse, no
`parallelStream`, no orphan beans or dead private members (agent 2). **Effort: S each.**

**P3-E — Frontend dead code, duplication and template hygiene.** Dead/unused: `AdminGateway.listGuidancePosts`
(`admin-gateway.ts:253`, superseded by the paged method, spec-only callers) with its `guidanceListPath`
helper; `updateGuidanceTranslation` (`:428`, spec-only — and its absence from the UI means an existing
translation cannot be corrected, only deleted and re-created); four `shelter-copy.ts` constants
(`:143,155,291,301`, each with a comment saying the live surface uses the `t` pipe); `readCoordinate`
(`form-helpers.ts:22`, spec-only — the earlier sweep's "used by both forms" is wrong);
`AdminShelterFilters.status` (`models.ts:582`, never set); plus the re-confirmed `ThemeRoot`,
`isSiteTextKey`, `BODY_EDITOR_HEADER_VALUES` (agent 7 F3). Copy-pasted styles: the lane added a second
`.chip` (`admin-page.scss:75-94` == `map-page.scss:323-342`) and a second out-of-range block
(`admin-page.scss:100-110` == `guidance-list-page.scss:99-109`) in a repo whose `styles.scss` already
owns `.btn`/`.field`, and the `.badge` base is still copy-pasted in **four** stylesheets while
`styles.scss` defines none (agent 7 F4). URL contract as ~20 bare string literals in one file
(`'guidancePage'` ×5, `'guidanceSize'` ×5, `'shelterPage'` ×4, `'shelterSize'` ×4, `'q'` ×4, `'source'`
×3; agent 7 F5), and the bare `q` is the **guidance** search's key on a route where everything else is
namespaced (`shelterPage`/`guidancePage`) while the shelters search is deliberately tab-local — a latent
collision for the natural next step (agent 7 F6). Component-perf/correctness nits: `index(row)` is a
linear scan called 3× per rendered row (O(3n²), moved by the extraction to
`guidance-order-list.ts:118-120`, now partly short-circuited); route query params are read once at
construction on components the router reuses (`login-page.ts:49-52`, `verify-page.ts:148-154`,
`submit-shelter-page.ts:312`); two files' comments claim `paramMap` completes on deactivate, which is
**false** in router 22.1.5 (`shelter-detail-page.ts:475-480`, `guidance-detail-page.ts:114-119`); the
impure `t` pipe's "the chrome is the only pipe consumer" is false by ~2 orders of magnitude (160 bindings
in `admin-page.html` alone, ~375 repo-wide); `ResendCountdown.active` is a plain boolean read by 15
template bindings, correct only by an unstated invariant (`remaining` always changes with it); the two
paged tabs refetch on **every** tab switch against the file's own documented lazy rule
(`admin-page.ts:706,722` with `firstVisit` hard-coded `true`); time-dependent formatting is called from
templates with a fresh `Date.now()` default (`admin-page.html:331,653`), which is the one class of
"heavy logic in templates" that is non-idempotent; admin thumbnails repeat the adjacent filename in `alt`
(agent 10 F7). The interceptor remains origin-blind and logout is not cross-tab (agent 10 F8, F9 — both
confirmed still open from run 1). **Effort: S each.**

**P3-F — Integration leftovers.** `admin-gateway.ts:36` claims "The twenty-nine endpoints, 1:1" while the
class has 32 methods, the list has 31 lines with `GET /admin/guidance` twice and `PUT /admin/site-texts`
missing (agent 11 L2). `POST /admin/guidance/{id}/translations/attach` has no frontend consumer, so the
documented "pair two existing posts as translations" flow is unreachable (agent 11 L3). `ShelterDto.provenance`
and `MediaAssetDto.sourceUrl` are still unconsumed (agent 11 L5) — the server's `Provenance.of(...)` is
documented as the single source of truth while the admin badges derive it client-side, so a change in
server precedence changes no pixel. The CSP-safe `index.html` is produced only by the npm `postbuild`
hook, so a direct `ng build` (what `openspec`/autopilot docs and ad-hoc shells use) emits the
CSP-hostile `onload=` swap with exit 0 (agent 10 F6). **Effort: S each.**

**P3-G — Test-suite hygiene.** Two ITs boot the full app + Postgres to assert bean presence
(`RetentionSchedulerIT.java:19,26`, `RetentionDisabledByDefaultIT.java:17,24-25` —
`ApplicationContextRunner` would do; agent 3 Finding 7). Stale counts in the guards' own docs: the i18n
template guard's comment says "23 files" while `EXPECTED_TEMPLATES` and the walk both say 26 (agent 9 F8);
three lane files write fully-qualified test/BC names where imports exist (agent 2 L10); the quill-asset
pin omits the `assets` entry that actually copies the theme, so deleting it keeps 71/71 green while the
built editor loses its styling (agent 9 F3 — XS). **Effort: XS–S.**

---

## The four backend test counts, reconciled

Four different numbers circulated in the sweep. Agent 3 reconciled them mechanically; this is the
authoritative version:

| Figure | What it actually is | How it was established |
| --- | --- | --- |
| **1139** | **The current working tree** — the number to quote, after `mvn clean test` | Fresh target, pristine rsync copy, JDK 27: `Tests run: 1139, Failures: 0, Errors: 0, Skipped: 0` (1:57), and again green with `-Dsurefire.runOrder=reversealphabetical` |
| **1125** | **The committed `HEAD` tree — red** | `git archive HEAD` → `1125, Failures: 1` (`DocumentationFactsTest`); 1139 − 1125 = 14 = the uncommitted lane's 9 + 5 new tests |
| **1150** | **The stale `target/` on this machine** | 135 surefire XMLs = 132 live classes **+ 3 orphan XMLs** for classes deleted in `670f43d` (11 phantom tests); `1150 − 11 = 1139` exactly. `mvn clean` removes the trap |
| **1111** | **Not reproducible from any state of this repository** | Neither HEAD, the working tree nor a stale target yields it; the nearest neighbours differ by 14/28. Likely a partial/aborted run or an earlier commit |

Frontend counts moved for the same reason: **1395** (agent 9, 22:14) → **1397** (agent 9, 22:31) →
**1396 passed / 2 failed of 1398** (agent 10, 22:43, the red-suite incident) → **1398 passed** (agent 11,
23:12; agent 1 the same). Tests were being added and a CSS token re-wrapped/repaired while agents ran.

---

## Contradictions between reports (and how I read each)

**1. The TypeScript `strict` flag — three independent disproofs; excluded from the merged list.**
Run-1 (`run1/07` P1-6, `run1/01` F12) claimed `strict`/`strictTemplates` were absent so the compiler
enforced neither null-safety nor implicit `any`. Disproved three times: agent 1 read the installed
Angular 22.1.5 compiler source (`strictTemplates` defaults **on**, opt-out required) and compiled a probe
with the repo's own tsconfig (adding `"strict": false` is what makes `TS7006`/`TS2322`/`TS2564`/`TS18046`
disappear); agent 7 verified the same two mechanisms and additionally compiled a virtual probe with
`typescript@6.0.3`; agent 8 **flagged the finding, then disproved its own claim** with a no-config probe.
Agent 8 also notes `tsc --showConfig` not printing `strict` is not evidence of absence (it prints only
explicitly-set options). **Adjudicated: not a finding. The only residual is a Low documentation note
that `"strict": true` is not written down, so the posture depends on compiler defaults across upgrades —
it must NOT appear as a finding in the merged list.**

**2. Is the frontend suite green?** Agent 10 (22:43) measured **RED**, 2 failures in
`design-tokens.spec.ts:523,531`, with the exact assertion text and a second confirming run; agent 1
(22:36), agent 9 (22:31) and agent 11 (23:12) report 1397–1398 passing. **Not a factual conflict:
different minutes of a moving tree.** Resolved as an incident (the wrap was repaired) — see the
*Resolved* section. Worth keeping because the failure mode is a formatting change that reads as a
missing token, which is the same class as agent 9's F2.

**3. "CORS has zero assertions" (agent 3) vs "the new `CorsExposedHeadersIT` runs green" (agent 11).**
Agent 3's `grep -i cors src/test` → **0 hits** at 21:23; agent 11 ran a *new, untracked*
`CorsExposedHeadersIT` at 23:12. **Both true at their revisions** — the IT was added between them (after
agent 6's live probe of the missing header). Neither is wrong; the resolution is the timeline. Note the
two tests assert different things (agent 11's IT: exposure present/absent; agent 3's ask: preflight +
credential behaviour + a foreign origin getting no ACAO), so the residual gap is real but narrow.

**4. Severity of the paging cost/duplication: agent 5 High vs agent 1 Low vs agent 6 Low vs agents 2/7
Medium.** Same defects, four ratings. **Adjudicated at P1** for the cost and the duplication (agent 5's
measurement and agent 9's mutation proof are the strongest evidence in the sweep; agent 7 explicitly
marks the frontend duplication "fix it before this lands"), with agent 1's and agent 6's lower ratings
recorded in the entries so the disagreement survives.

**5. `GuidanceService` size: agent 1 "1 290 lines, 26 public methods" vs agent 2 "1 291 lines, 666 code
lines, 25 public methods, 7 collaborators".** A one-line, one-method counting difference (body lines vs
total, and how the field-accessor methods are counted). Agent 2 additionally corrects run-1's "1 236 /
40 public methods" and shows the lane **grew** the class by ~55 lines. **Not substantive** — the merged
entry states the range.

**6. "XML negotiation is not our problem" (run-1, MockMvc standalone) vs agent 6's live 401 with
`path:"/error"`.** Agent 6 explicitly **contradicts** the earlier probe, which used MockMvc standalone
without the security chain: through the real chain an unsatisfiable `Accept` on a *public* endpoint
answers 401. **Agent 6 is right** — it tested the real chain; the earlier claim tested the controller.

**7. Does the verification throttle still enforce exactly one send per window?** Run-1 said yes; agent 2
and agent 4 both say the atomic helper is production-dead. Agent 4's adjudication is the one I keep:
"Both sweeps were describing different objects (test quality vs production call graph) — agent 4's
reading is the one that matches the code". Consequence recorded honestly: `FileVerificationSendLogTest`'s
concurrency test now gives **false confidence** about production (merged as P2-14).

**8. `Cache-Control: no-store` (run-1 F7) vs agent 4's live probe.** Agent 4 shows the default Spring
Security header writer already emits `no-cache, no-store, max-age=0, must-revalidate` + `Pragma` +
`Expires: 0` on every chained response, measured on four endpoints, with the single deliberate exception
being the public hero image. **Agent 4 is right; the run-1 finding should be dropped** (agent 4 asks for
exactly that).

**9. Mockito "present" (agent 4's resolved-classpath listing) vs "zero mocking" (agent 3).** Not a
conflict: the dependency is on the test classpath via `spring-boot-starter-test`; `grep` finds **0**
Mockito/`@MockBean`/`@SpyBean` uses. Recorded so nobody re-litigates it.

**10. The focus suppression: accepted deviation (agent 1) vs undercounted scope (agent 10).** Agent 1
records the owner's decision (global `*:focus { outline: none }`, documented in
`qa/accessibility-checklist.md` §3 and `frontend/README.md`, pinned by a new `design-tokens.spec`
assertion) as a deliberate, recorded WCAG 2.4.7 deviation. Agent 10 accepts the decision but shows the
**record undercounts**: the deviation says "the six `tabindex="0"` admin table regions" while the
evidence lists **seven**, and it lands on a **public** control (the `/blog` page-size `<select>`,
`shared/pagination.html:28`). **Both are right; agent 10's correction is the actionable half** — and its
proposed retirement (add `select:focus-visible` + `.admin-table-wrap:focus-visible` to the token ring,
which cannot bring back the original complaint) is one line. Carried as part of the QW6 item.

**11. Component-style warning counts: agent 1 "nine component stylesheets" vs agent 10 "(8 style
warnings)" vs agent 11 "eight component-style warnings" + nine printed.** Reconciliation from agent 10's
own list: **8** `anyComponentStyle` warnings **+ 1** initial-bundle warning = **9 printed warnings**.
Agent 1's "nine component stylesheets" is a mislabel. Minor, recorded so the merge does not propagate a
wrong count.

**12. Frontend bundle size: agent 1 720.40 kB, agent 10 720.85 kB, agent 11 720.87 kB.** Hashing/measure
noise on builds of near-identical trees; all three agree on the ~160 kB overrun vs the 560 kB warn. Not a
conflict.

**13. The frontend's own "no dead code" clean claim vs agent 7's dead-code list.** Agent 7 resolves this
itself: the clean claim is about *imports, dependencies, components, routes and models*; the dead items it
finds are *exported constants and two gateway methods*, each kept alive only by its own spec. **Both
statements are true about different sets** — the merged P3-E entry names the specific items.

---

## Top-10 action plan

### Quick wins (hours each; low risk)

| # | Action | Effort | Sources |
| --- | --- | --- | --- |
| **QW1** | **Land the repo/contract fixes that unblock a clean checkout and the published contract**: the README citation (P1-6) + the three paging rows + `X-Total-Count` + the `source` vocabulary and the 400 break (P2-6) + the 400 `content` on the three paged reads + `415`/`405` in the snapshot (P2-5) + regenerate. | **S** | 3 HIGH, 11 H1/M1/M2, 6 F4/F9/F10 |
| **QW2** | **One frontend commit fixing the lane's bugs and its two guard holes**: drop the `!live` clause (P1-5a), add the shelters fetch-sequence guard (P1-5b), replace the `<td>` first-match scan with a brace-balanced all-occurrence scan that fails on a missing rule (P1-8), pin the quill `assets` entry, add the 4–6 URL-clamping cases (P1-1 client half). | **S** | 8 F1/F2, 9 F1/F2/F3 |
| **QW3** | **Close the admin i18n bypass**: pass `(key) => this.i18n.t(key)` at the 29 sites + the two helpers, add the 10 keys, convert the 3 constants, write `guidanceSearch` inside the sync, update the 7 spec pins. | **S** | 7 F1, 1 A12, 8 F7 |
| **QW4** | **Backend one-rule fixes**: one `Pagination` helper (one 400 exception, one message, one `MAX_PAGE_SIZE`) replacing the 4 validator copies + 6 hardcoded messages + the duplicate `slice`; call the bounds **before** the read; delete the unused import; and key the one-time codes with the existing `PiiCrypto.blindIndex` + `v2:` slot tag (P2-12a). | **S** | 2 F1/F2/L1, 6 F14, 5 F7/F10, 1 A2, 4 F1 |
| **QW5** | **Fix the two contract defects and assert the four untested error paths**: pin `produces = application/json` (and narrow content negotiation), permit the `/error` dispatch and use the original request URI, then add the 4 handler assertions + `HttpUrlRedirectClientTest` + the lost-race 409 test + the demotion test. | **S** | 6 F1/F2, 3 F2–F5 |
| **QW6** | **Small hardening/hygiene batch**: tomcat 10.1.57 + jackson-bom 2.21.5 + bcprov 1.85+, bind the compose DB to loopback + a datasource-credential guard, `.env.example` + Node `engines` + the two stale strings, `select:focus-visible`/`.admin-table-wrap:focus-visible` to retire the focus deviation and fix its six→seven count, re-baseline the bundle warn budgets, `loadComponent` the five auth/account routes, and correct the documented bundle numbers. | **S** | 4 F4/F8, 11 M4/L1, 10 F2/F4, 1 |

### Larger refactors

| # | Action | Effort | Sources |
| --- | --- | --- | --- |
| **LR1** | **Make paging real.** Push `limit`/`offset` into the repository query with a `count(*)` twin over the same filter+order and run the batched trust/provenance lookups over the page's ids only; do the same for the public `GET /api/shelters`. Then the guidance-side cost: `findByIdIn` (or wire the dead `findPublished`), media by the page's hero ids, and page `GET /admin/media` + `GET /admin/users` (predicate GUEST rows instead of decrypting them). | **M–L** | 5 F1/F2/F3/F4, 1 A13, 10 F3 |
| **LR2** | **Extract the frontend paging layer and the shared control styles.** `shared/paging.ts` (`parsePage`/`parseSize`/`lastPage`/`parseTotal`), one result type (`PagedRows<T>`), size constants moved to `shared/pagination.ts`, one out-of-range component, and `.chip`/`.badge`/out-of-range CSS moved next to `.btn`/`.field` in `styles.scss`; then the route-lazy/budget work from QW6 can land on a measured baseline. | **M** | 7 F2/F4/F5/F6, 2 F1/F2, 5 F10 |
| **LR3** | **Split `GuidanceService` by seam and write the backend placement rule.** `GuidanceSearch`, `GuidanceOrderingService`, package-private `GuidanceValidation`, the neutral list helper, post CRUD left in place; then the rule in `README`/package-info, a `CurrentCaller` (the 5-copy primitive), a `FailClosedGuard` template (4 copies), `trustedProxies`/`trustLoopback` into the properties record, `@EnableScheduling` moved to the application class, and shelter ownership moved into `ShelterService` (`requireOwnedBy`/`updateOwned`/`deletePlaceByAdmin`). | **M–L** | 1 A1/A4–A9, 2 F3/F5/L7 |
| **LR4** | **Re-shrink the admin page and make the rules enforced.** Extract the remaining seven tab panels after the `GuidanceEditor` precedent; bring `01-frontend-architecture.puml` current and add the guard that fails when a `features/*` directory or `AdminTab` value has no counterpart; stand up CI (backend + frontend jobs), a multi-stage `Dockerfile`, then SpotBugs/PMD, a coverage gate and a dependency scan. | **L** | 1 A3/A10, 11 L6, 2 L8, 4 F4 |

---

## Areas found clean (union of the eleven reports' explicit clean lists)

**Backend.** Dependency structure: **0** class-level and **0** package-level cycles over 345 main Java
files; the only cross-package direction is inward; **no** `persistence` import outside `persistence/`;
no entity type in any non-persistence signature; every controller returns a record (the one binary
`ResponseEntity<FileSystemResource>` excepted); `domain/` is framework-free (34 files, `java.*` only);
repositories contain no domain rules beyond two documented port-level ones; injection is
constructor-only (6 `@Autowired` all on constructors, 50 `@Value` none field-level, no `@Inject`); no
orphan beans or missing implementations; no dead private member anywhere. Configuration: one dev/test
rule (`Profiles.isDevTestOnly`), four fail-closed guards, no `@Profile`, no production
`application-*.yml`, `ddl-auto: validate`, `open-in-view: false`, explicit Hikari sizing, secrets as
env-var placeholders only, no tracked `.env`, PII keys validated fail-closed. Security: **all 32**
`/admin/**` handlers re-check admin per request from a column read (never a token claim); **no IDOR and
no unguarded mutation found** across 16 controllers; HS256 with a ≥32-byte key built at construction,
algorithm pinned via `verifyWith`, no role claim, suspended accounts lose authentication on the next
request, refresh rotation is an atomic conditional `UPDATE`, a successful reset revokes every refresh
token; Argon2id + the timing equalizer + the post-verify existence guard; all 22 `@Query` statements use
bound parameters and the two native queries are parameterless; no mass-assignment path; no secret,
token, OTP, code or request body in any of 38 log statements; error responses leak no stack trace, SQL,
column or constraint; actuator exposes `health,info` only; CORS is an explicit origin list (verified live:
foreign origin → 403 with no ACAO); CSRF correctly disabled for a stateless bearer API; file upload and
public media serving are hardened (byte cap, magic-byte sniff, UUID names, path-escape refusal, the
`^[a-f0-9]{32}\.(jpg|png|webp)$` serve contract); stored XSS in admin-authored guidance is neutralised by
a jsoup allowlist on both write paths; SSRF is defended per hop on every redirect with an address policy
covering loopback/link-local/metadata/RFC1918/IPv4-mapped forms, and the one residual (resolve→connect
TOCTOU) is documented and accepted; PII crypto is AES-256-GCM with a keyed domain-separated blind index.
Data layer: **zero associations** in the entity model (no lazy loading, no N+1 from relations, no
cascade bugs, no `equals`/`hashCode` overrides anywhere); transaction flags consistent across all 24
repository implementations (every read `readOnly`, every write read-write, the unannotated ones joining
a caller's transaction by design — verified against their callers); V1–V30 all applied and honest; every
read except one resolves against an existing index; paging **correctness** (bounds, 400s, past-the-end
empty page, `X-Total-Count` semantics, total order tiling) implemented and covered by the new ITs; the
sends-outside-the-transaction fix verified at the Spring mechanism level. Tests: no assertion-free,
status-only or "should create" test (all 1111 methods parsed; the 26 without inline assertions all
delegate to assertion helpers); no randomness, no `@Disabled`/assumptions, `Skipped: 0`, clocks
injected, two `Thread.sleep` (one in a fake server handler, one retry backoff), concurrency via
latches/barriers; **zero** Mockito/`@MockBean`/`@SpyBean`; `@SpringBootTest` exactly once (the IT base),
no `@WebMvcTest`/`@DataJpaTest` misuse; no silently skipped test class; the shared container + per-JVM
send-log isolation + explicit per-IT table cleanup make the reverse-order run green.

**Frontend.** **Zero** `any`/`@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` (strict family on by default
and verified to be on); zero unused imports, unused `imports:` entries, unused npm dependencies, unused
components/pipes/routes/models; no commented-out code, one `console.*` (Angular's canonical bootstrap
handler), no TODO/FIXME; no dead `@Injectable` method; all 26 production components `OnPush`; zoneless
with no `zone.js`/polyfills entry; zero NgModules/`CommonModule`; every `@for` carries `track`; typed
`nonNullable` reactive forms (no `ngModel`); HTTP confined to one `ApiClient` with one central
`catchError` and typed gateways; the interceptor uses `from(refresh()).pipe(mergeMap(...))` with a direct
`next(retried)` so no refresh loop and no nested subscribe; all 13 non-spec subscriptions torn down (11
unsubscribed, 2 documented, `toObservable` self-completes); the `toObservable(sig).pipe(skip(1))` idiom
verified correct against the installed core; templates free of business logic; API paths single-sourced
per gateway; hardcoded external URLs bounded and identifiable; the lane's locale-switch race traced
through six interleavings and correct; the lane's paging logic itself functionally sound (URL→state→load,
no double fetch, no lost update, monotonic counters on the guidance path); no `bypassSecurityTrust*`, no
`DomSanitizer`, exactly one annotated `[innerHTML]`, Quill's paste path inert, dynamic URLs sanitized by
Angular, `rel="noopener"` on all 7 `_blank`; no secrets in environments; guards fail closed; refresh
token in `localStorage` as the documented trade-off; no production source maps; Quill confined to the
admin chunk; only two external origins. Accessibility: the three-theme contrast spec is real and passes
(every pair, plus "exemptions are honest"); no unbound literal `aria-label` remains; all 42 `<th>` carry
`scope`; all 6 `<img>` carry dimensions + lazy/async; no duplicate `<h1>` per state; the new admin
surfaces are clean (real buttons with `aria-pressed`, labelled groups and search inputs, `role="status"`
for out-of-range, labelled pagination nav, no new contrast risk — `.chip--active` 5.77:1 light). Tests:
no `.only`/`.skip`/`xit`/`fakeAsync`/`waitForAsync`/`test.todo`; guards driven through a real Router;
`HttpTestingController` with `verify()`; a table-driven exhaustive status×surface error-copy spec;
per-test isolation of `localStorage`/`isSecureContext`/`geolocation`; the i18n template guard rebuilt
with full discovery + a completeness pin + a "has teeth" synthetic test + staleness-tested allow-lists;
the api-contract and models-contract guards are non-vacuous; drag-and-drop/reorderability behaviour
tested against real DOM. Build: CSP hashes verified against the real emitted HTML; catalogs lazy with a
measured reduction; initial bundle composition understood.

**Integration.** All 59 literal gateway calls resolve to real endpoints with the right verb (0
mismatches); request DTOs match field-for-field with **zero** FE-only fields; the new paging contract
agrees on both sides and was proven live (308 / 300 / 8, tiling, past-the-end empty, 400 vocabulary);
`source` enum equality across the boundary; the OpenAPI snapshot is in sync with the sources
(`OpenApiSnapshotIT`); `.gitignore`/repo hygiene clean and `frontend/package-lock.json` tracked (so
`npm ci` is viable); dev setup good (`docker-compose.yml` + healthcheck, `dev-start.sh` with a Postgres
pre-flight, a well-commented method/`Accept`-aware proxy config); dependencies current with no EOL
concern other than the two pinned libs of P2-12c.

---

## Top 5 things a delivery owner should know

1. **You are reviewing a moving target, and every number in this sweep is revision-specific.** The owner
   landed fixes *during* the sweep (the ET copy defect, two focus-ring fixes then the blanket
   suppression, the CORS exposure + its IT), and the lane was mid-flight throughout. That is why the
   frontend suite is quoted as 1395 / 1396-red / 1397 / 1398, and the backend as 1139 / 1125 / 1150.
   **Pin a commit, then act** — otherwise "green" and "closed" mean nothing six hours later. The two
   reconciliations you can rely on: backend **1139** on the working tree, and **four** backend figures
   explained (1139 working tree, 1125 HEAD, 1150 stale target, 1111 unreproducible).

2. **`d247007` cannot pass a clean checkout, and the fix is uncommitted.** One README line cites a
   deliberately gitignored file, so `DocumentationFactsTest` fails on every fresh clone while this
   machine reports green. It is already fixed in the working tree — **land it with this lane**, because
   until then "the suite is green" describes this laptop, not the repository.

3. **The paging feature ships the appearance of paging, not the cost model.** Measured: a one-row page
   reads all 308 shelter rows and runs the same 13 statements, byte-identical to the unpaged request;
   the frontend pages at 20 rows and additionally refetches the full list on every moderation action;
   the public, unauthenticated list has the same shape with no rate limit. Its client-side clamping has
   **no test at all** (deleting it keeps 1395 green), and the same "guard passes while the behaviour is
   gone" pattern appears in the design-token suite (mutation-proven). The paging semantics are correct
   and tested; the cost and the guards are not.

4. **Nothing is enforced.** There is no CI, no Dockerfile for the app, no static analysis, no coverage
   gate and no dependency scanning — and the frontend has no equivalent of the backend's documentation
   guard. Every P1 and P2 in this report was catchable by a machine (a clean-checkout test job catches
   P1-6; a `grep`-based duplication or static-analysis pass catches P1-3 and the dead code; a resolver
   test catches P2-12c; a CI job running both suites catches all of it). Fixing the individual items
   without fixing this leaves the same list to be re-derived next sweep.

5. **Two user-facing quality gaps are gating for the product's stated goals, and both are cheap.**
   (a) An Estonian or Russian moderator reads **English** in the admin UI — 29 untranslated error
   banners, 10 hardcoded success banners, three copy constants frozen to English (so the same "private
   home" badge reads Estonian on the public map and English in the admin), two helpers re-exposed
   without the translate callback. (b) The blanket `*:focus { outline: none }` removed the visible focus
   indicator from a **public** control (the `/blog` page-size selector) and from seven scroll regions,
   not the six the deviation record claims — a WCAG 2.4.7 deviation that was *introduced*, not
   inherited. Both are mechanical fixes measured in hours, and both are the kind of thing that ends up in
   a user complaint rather than a bug tracker.

---

## Merge verdict

**OK with notes — no P0.** Eight release-gating P1 entries, sixteen P2, and ~45 report-only items. The
architecture, layering, security posture and test *quality* are genuinely strong and independently
verified; the failures are concentration points, not foundations: one feature whose cost model does not
match its contract, one surface (the admin page) left outside the i18n/a11y/architecture discipline the
rest of the project follows, a handful of proven-absent test guards, two pre-existing contract defects
that affect all 64 operations, and a repository in which none of it is mechanically enforced. Two
blockers raised during the sweep (the CORS `X-Total-Count` exposure, agent 6's BLOCK, and the
clean-checkout `DocumentationFactsTest` failure, agent 3's HIGH) are fixed in the working tree — the
first verified with a new IT by agent 11, the second verified as real at `HEAD` and repaired only in
uncommitted bytes. One finding was raised, disputed by three independent disproofs, and **excluded**:
the TypeScript `strict` flag.
