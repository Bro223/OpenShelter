# 15 — Delivery Audit (wave-5 independent auditor)

**Audited.** `187e697..47d2ce8` — eight batches, 20 commits on 2026-09-22 (02:12–12:15):
the 17 named commits plus three the task list omits — `2a3fe47` (three distinct
confirmers + L-EST97 axis-order fix), `60e7cb9` (pin = verification depth, reported-OR,
NEW ring removed), `4208538` (legend-as-filter, last two srcset slots). All three are
landed day work and are included in every verdict below.

**Method.** Read-only against the live tree, plus a throwaway `git archive` copy at
`/tmp/openshelter-mut` for every mutation and one production build. Live probes of the
running backend (`:8080`, not restarted) and dev server (`:5173`) saved under
`/tmp/delivery-audit/`. No source/test/doc edits in the real tree; the real test suites
were not run here (the mutation runs executed only the named guard specs in the throwaway
copy).

**Verdicts up front**

| Question | Verdict |
|---|---|
| 1. Does it work? | **Yes.** Backend and frontend both serve the HEAD behaviour end to end. One operational caveat: the served registry rows predate the L-EST97 fix (§4). |
| 2. Do the new guards fail when their behaviour is removed? | **Yes — 5/5 selected guards went red** when the behaviour they name was removed in the throwaway copy. One guard (the marker-shape absence pin) has a text-level escape hatch that lets a *nested or re-spaced* re-addition pass (§2, M7/M8). |
| 3. Did each lane respect its stated limits / are claims true? | **Yes, for every surviving document.** Every spot-checked "verified/measured/proven red" claim in the surviving reports and specs was confirmed against the tree. The per-wave lane reports themselves were never committed and no longer exist on disk (§5, F1) — the claims behind them were verified against code, not against report text. |
| 4. What is left undone? | Registry re-import (owner action), 5 propose-and-wait items, the doc-lane fix batch currently sitting **uncommitted** in the working tree, `SUMMARY.md` untracked, W4-D/Wave-7 plan staleness, the absence-pin escape hatch (§4). |
| 5. False claims in documents? | **Three commit messages claim "wave-N reports" that are not in the commits** (§5, F1); the frontend README's budget paragraph carries now-stale measured numbers (§5, F2). No false claim was found in any surviving review/plan document. |

---

## 1. Does it work?

**Backend `:8080` (freshly restarted by the owner, probed, not touched otherwise).**

| Probe | Result |
|---|---|
| `GET /api/shelters?limit=3` | 200; every row carries `inaccurateReports` (the W2-B field the stale JVM had masked) |
| Private-field leak scan over public payloads (`email|phone|password|token|secret|nationalId`) | 0 hits |
| `GET /api/guidance` | 200; **every post carries `heroImageSrcset`** (one of the "last two srcset slots" wired by `4208538`) |
| Paging bounds (uniform policy from `187e697`) | `limit=0` → 400, `limit=1000` → 400, `limit=200` → 200, JSON error bodies (json-only, no HTML) |
| `X-Total-Count` | present on the paginated public guidance read |
| Authorization boundary, no credentials | `401` JSON on all of `/api/admin/{shelters,reports,audit,users,media,alerts,guidance,site-texts}` and `/api/account/me`; bogus bearer also 401. (Positive admin session not testable without credentials — noted as a probe limitation, not a finding.) |
| Served contract vs committed | `/v3/api-docs` ≡ `docs/api/openapi.json`: 64 operations, no path/method/param/response-code diff |
| `GET /api/data-source` | `lastImport=2026-09-22T07:54:44Z` — **before** `2a3fe47`'s L-EST97 fix (11:31). The re-import has not run (§4, U1). |

**Frontend `:5173` (dev server; `:5174` is down and unused).** `GET /` → 200. The served
bundle reflects the current source, verified against the live chunk graph rather than the
compiled tree: the served Leaflet chunk contains the `60e7cb9` reported-OR exactly
(`nonexistentReports > 0 || (shelter.inaccurateReports ?? 0) > 0`), and the served
`main.js` contains the `4208538` legend-as-filter (`legend-item--toggle` ×8, `toggleTone`
×12, legend keys `registry / confirmed / fullVerified / partialVerified / hint`).

**Production build** (throwaway copy, `npm run build`): exit 0 in ~8 s. Initial total
**610.01 kB raw / 157.22 kB transfer** — under the 741,401 b warning budget, so a fresh
build prints **no** initial-budget warning (the invariant `4f72321`'s README claims).
Fifteen component SCSS budgets warn against the 4 kB warning (largest: map-page 7.42 kB);
none reaches the 10 kB error.

**Conclusion.** Both halves of the app serve the day's landed behaviour. The one user-visible
stale artefact is data, not code: the served registry pins are still produced by the
pre-`Lest97AxisOrder` transformation (see U1).

---

## 2. Do the new guards fail when the behaviour they name is removed?

All mutations in the throwaway copy; baseline first (180 frontend guard tests green:
design-tokens 137, i18n-template 39, architecture 4; backend `DocumentationFactsTest`
green). The test that matters for the repo's hollow-guard history: **remove the behaviour,
keep the guard as-is, does the guard go red?**

| # | Guard | Mutation (behaviour removed, guard untouched) | Result | Verdict |
|---|---|---|---|---|
| M1 | Architecture guard — feature-directory reference | Added unreferenced `features/zghost/` | **Red** — "every feature directory is referenced by the routing table" | **Real** |
| M2 | Architecture guard — AdminTab floor | Removed `'audit'` from the union *and* its button/panel refs so the build still compiled | **Red** — "parses 8 AdminTab values (floor 9)" | **Real** (naive removal also fails on TS template types — double-covered) |
| M3 | Architecture guard — phantom tab | Added `'ghosttab'` to the union with no button/panel | **Red** — "every AdminTab value has a tab button and a rendered panel" | **Real** |
| M4 | i18n template guard — hardcoded copy | Injected `<p>Hardcoded Audit Probe</p>` into `map-page.html` | **Red** — template carries no hardcoded user-visible copy | **Real** |
| M5 | i18n template guard — new template | Added `probe-template.html` | **Red** — completeness check names the new template | **Real** |
| M6 | Contrast list floor | Emptied `TEXT_PAIRS` | **Red** — non-vacuity/floor check | **Real** |
| M6b | Contrast floor (real regression) | Light `--color-warning` `#965a00 → #c9a86a` | **Red** — WCAG pair check | **Real** |
| M7 | Marker-shape absence pin (`60e7cb9` spec-pinned absence of `.shelter-marker--new`) | Re-added the canonical top-level rule | **Red** | **Real for the canonical form** |
| M7b | same pin, escape A | Re-added as nested `.shelter-marker { &.shelter-marker--new { … } }` | **Green** (137/137) | **Escape hatch** — the guard is a text pattern over raw SCSS; nesting compiles to the same forbidden rule |
| M7c | same pin, escape B | Re-added with two spaces before `{` | **Green** (137/137) | **Escape hatch** — whitespace-variant |
| M8 | `DocumentationFactsTest` `CLASS_MAPPING` matched-count floor | Pattern replaced with `@@@NEVER_MATCH@@@` | **Red** — `everyControllerMappingAppearsInTheReadme` fails (0 controllers matched) | **Real** (the form-check fires before the floor 12, so the floor is a backstop, not the only tripwire) |

Restore check: all files reverted → 180/180 green.

**Conclusion.** No hollow guard of the class documented in the 13-audit: each selected
guard catches the removal of the behaviour it names. The one quality gap is the absence
pin's **text-level matching** (M7b/M7c): a rule that compiles identically to the
forbidded one can be re-introduced through nesting or spacing without tripping the pin.
Logged as U6 (harden by normalizing/compiling the SCSS before the check).

---

## 3. Lane-claim spot-checks (prioritised: most damaging if false)

Surviving, committed lane documents: `reviews/QW-report.md`,
`docs/autopilot/list-page-paging/ADMIN-LANE-REPORT.md`, `reviews/stale-decisions/SD-1..3`,
`docs/autopilot/{BACKLOG-PLAN,STALE-DECISION-AUDIT}.md`, `frontend/README.md`,
`.github/workflows/ci.yml` comments, and the commit messages.

| Claim (source) | Check at HEAD | Result |
|---|---|---|
| CI "clean checkout — guards against `git archive`, not the working tree"; coverage floor 0.93; architecture + mapping floors (c8f95b2, ci.yml) | `ci.yml:100` `git archive HEAD \| tar -x`; clean-checkout job runs `DocumentationFactsTest,TestConfigOverlayTest` + FE architecture guard from the archive; `pom.xml` JaCoCo `minimum 0.93` | **True** — closes the 13-audit P3-6 local-state-drift gap |
| "budget at the measured 741401 bytes" (4f72321) | `angular.json` `maximumWarning: "741401b"` ✓; fresh build §1: no initial warning ✓ | **True for the invariant** (the *numbers* in the README paragraph have since drifted — §5 F2) |
| "Twelve routes are `loadComponent`-lazy: the five auth/account routes…" (frontend README) | `app.routes.ts`: exactly 12 lazy routes incl. login/register/reset/verify/account (the 13th `loadComponent` hit is a comment) | **True** |
| "paging on every admin list" + `X-Total-Count` (5473b1c) | OpenAPI: `limit` on all 7 admin list endpoints + both public lists; `X-Total-Count` emitted across 17 main-source files | **True** |
| "json-only responses, uniform paging bounds" (187e697) | Live probes §1 (400/401/400-JSON) | **True** |
| "real SQL paging, trust snapshotted on the row, both report kinds reported" (7cbe178) | `ShelterQueryService` real `LIMIT/offset`; `V31__shelter_submitter_verified_snapshot.sql`; both `nonexistentReports` + `inaccurateReports` served | **True** |
| "one current-caller, one shelter guard, FailClosedGuard, auth hardening" (e137331) | `auth/CurrentCaller.java` single class; `FailClosedGuard` in `ProdJwtGuard`/`DevEndpointsGuard`/`DevSenderGuard`; `V32__otp_code_hash_keyed_widen.sql` | **True** |
| "quote-aware header, require the same columns" (7b7ff32) | `RegistryCsvParser`: header run through the same quote-aware splitter, 5 column names in order, still throws on mismatch; tests added | **True** |
| "three distinct confirmers verify a community row" (2a3fe47) | `ShelterReport.AUTO_CONFIRM_THRESHOLD` = 3, distinct non-submitter tally in `app/ShelterReportService`; `Lest97AxisOrderTest` pins detection on **real live values** (Pärnu Hotell transposed row, Liivalaia unswapped row, both-ambiguous → null) — the missing dedicated test SD-3 §3.10 flagged | **True** |
| QW-report: "29 `bannerMessage(error, 'shelter')` sites … all now pass a translate fallback" (QW-report.md:61-63) | Mechanism verified in code (translate callback at all sites; 37 `bannerMessage(error, …)` call sites tree-wide today). The "29" is a point-in-time lane count — not independently re-verifiable, but same population and magnitude | **Not contradicted** (historical count, noted) |
| ADMIN-LANE-REPORT: locale-scoped tag-stripped `q` search; `X-Total-Count` = filtered-scope length before paging; `AdminGuidanceSearchPagingIT` | `GuidanceSearch.matchesSearch/searchableBody` present; controller sets `X-Total-Count` from `filtered.size()` **before** the slice; the IT file exists | **True** |
| SD-1/SD-2 fixes attributed to `60e7cb9` (SUMMARY §2) — `--color-verified` pre-paint, `badge--rejected`, `--color-accent` removal (all 4 homes), 26 dead keys, both `Kusta`→`Kustuta`, `.field-label`, amber comment cleanups | All re-grepped at HEAD: present/absent exactly as claimed | **True** (12 of the "16 of 34 resolved" spot-checked, all confirmed) |
| SUMMARY's two new defects — **N1** `--color-new` orphaned (0 live `var()` consumers); **N2** `07-STEPS:501-504` points at the deleted `shelter-marker--new` class | `grep 'var(--color-new)'` over non-spec src → 0 consumers; HEAD `07-STEPS.md` text verified | **True** |
| "served-contract drift cleared by the restart" (SD-3 §2.1, SUMMARY) | Served rows carry `inaccurateReports`; served ≡ committed OpenAPI | **True** |

**The eight spec-versus-code contradictions (SD-3 T1–T8):** at the last commit (`47d2ce8`)
**all eight were still unfixed in the committed tree** — e.g. `community-self-moderation`
still forbade the shipped single-confirmation promotion as "exactly as shipped",
`shelter-reports` still said raw "exactly 5", `account-profile` still carried
`nationalIdCode` claims against its own "no national ID" lines, `legal-recovery` still
said the CTA is the ONLY geolocation trigger, `admin-moderation` still "two tabs".
**During this audit the doc lane applied all eight fixes as uncommitted working-tree
changes** (11 modified openspec files, matching the SUMMARY §3.2 file-for-file lane
layout, plus `context-and-tasks` rewrites and FE i18n/map-page edits). They are correct
against the code where checked (T1 three confirmers, T3 weighted 5-point tally, T4
three-trigger geolocation, T6 no national ID, T8 reported-OR) — but they are **not yet
committed**, so the audited deliverable (HEAD) still contains the contradictions. See U3.

---

## 4. Left undone (explicit list)

**U1 — Registry re-import (owner action, user-visible).** The served 302 registry rows
were imported 07:54:44Z, before `Lest97AxisOrder` landed (11:31). Until the import
re-runs, transposed rows (e.g. Pärnu Hotell) still render at wrong pins. The code fix and
its test are in; the data is not regenerated. Tracked in SUMMARY §2.

**U2 — Propose-and-wait (owner/native-speaker input, 5 items).** P-1 legal privacy copy
under-enumerates geolocation triggers ("Map and search only" — the detail-page
"Distance from you" trigger is missing from the legal sentence in all three catalogs —
the only HIGH user-visible item); P-2 English machine-value labels live in the ET/RU
admin (`admin-copy.ts`, 4 label maps + `Unknown` fallback); P-3 `title: 'Selected
location'` hardcoded on the /submit pick marker (`leaflet-service.ts:287`); P-4
`admin.reports.dismiss` = `Arvelda` (`et.ts:717`); P-5 orphaned `--color-new` token —
keep-as-anchor or delete-with-its-test-legs owner call.

**U3 — The doc-lane fix batch is uncommitted.** At audit time the working tree held the
in-flight fixes for all 8 SD-3 spec contradictions + the context-and-tasks doc rewrites +
FE i18n/map-page edits (file mtimes 11:50+, lane actively editing during this audit),
plus the untracked `reviews/stale-decisions/SUMMARY.md`. Needs one commit (or batches) so
the committed tree stops contradicting the code — and a quick re-sweep to confirm the
rewrites.

**U4 — `BACKLOG-PLAN.md` staleness (doc-only).** W4-D (lines 222–232) still commissions
"a distinct marker shape for NEW (a ring or notch)" — that shape was commissioned
(`7cfed66`), shipped, and then **removed by owner decision** (`60e7cb9`, "the pin carries
verification depth, not recency"); the plan carries no supersession note. Wave 7
(legend = filter) is marked "(owner request, queued)" but shipped in `4208538`.

**U5 — Per-wave lane reports missing (§5 F1).** The evidence documents for 8 of the 20
commits no longer exist anywhere; only the code-level claims survive for verification.

**U6 — Marker-absence pin escape hatch.** M7b/M7c: the spec-pinned absence of
`.shelter-marker--new` is enforced by text pattern; a nested (`&.shelter-marker--new`)
or re-spaced re-addition compiles to the forbidden rule yet passes 137/137. Harden the
guard (normalize whitespace, flatten nesting, or assert against compiled CSS).

**U7 — Stale README budget numbers (§5 F2).** Initial total is now 610.01 kB (was
607.60 kB at `23d834`) and 15 SCSS budgets warn (README says ten, with five since-added
admin panels absent from the list).

**U8 — Standing (not day-scoped).** 7 active `openspec/changes/` remain unarchived
(community-review-queue, crisis-guidance, guidance-hero-import, guidance-manual-order,
i18n-ru, retention-pruning, shelter-meta-truth); no flaky-test list was found at HEAD
(none were known at the SD-sweep time); the `guidance-editor.ts` slot returning
`srcset: null` for a current hero without srcset is a **documented graceful degradation**,
characterised as wired-and-degrading, not a hole.

---

## 5. False / unsupported claims

**F1 (process, the significant one) — three commit messages promise "wave-N reports" that
the commits do not contain, and the reports do not exist anywhere.**

- `74065f2` "docs: wave-two reports and the batch plan" → diff is
  `dependency-check-suppressions.xml`, `pmd-exclude-from-failure.properties`,
  `pmd-ruleset.xml` only. No report, no plan (the batch plan was committed in `1b6bb29`
  and `47d2ce8`).
- `136c916` "docs: wave-three reports" → diff is `dependency-check-suppressions.xml` +
  `pom.xml` only.
- `23d834` "docs: wave-four reports, lazy auth routes, measured numbers" → merge commit
  whose diff carries `ci.yml` + `README.md` (the lazy routes came via the merged `7cfed66`,
  the measured numbers are the README edit — so two-thirds of the message is honest, the
  "reports" third is not).

The per-wave report files that the batch flow evidently produced (`187e697-…`,
`240b5f9-…`, `4f72321-…`, `5473b1c-…`, `74065f2-…`, `7cfed66-…`, `23d834-…`,
`e137331-…`, `47d2ce8-stale-decision-sweep.md`, `1b6bb29-ADMIN-LANE-REPORT.md` in
`reviews/`) are **not in any commit, not dangling in the object store, and not on disk**
(`find` across repo + /tmp + home; `reviews/` mtime 09:54:01 shows no entry changes
since; `git ls-files`/`fsck` clean of them). The only lane reports that survive and are
committed are `QW-report.md`, `ADMIN-LANE-REPORT.md` (both `1b6bb29`), SD-1/SD-2
(`84891d7`) and SD-3 (`47d2ce8`). **Consequence:** the "verified / measured / proven
red" claims of the per-wave lanes can no longer be audited as documents — this audit
verified the *behaviour behind* those claims instead (§3), and every one held. The
gating lane should recover or regenerate these reports (or note in the batch record that
they were discarded) before the push.

**F2 (doc-only, minor) — `frontend/README.md` budget paragraph.** "Measured initial total
on a fresh build (2026-09-22, …): **607.60 kB raw / 156.76 kB transfer** … (ten component
SCSS budgets warn instead…)" — measured at `23d834`; a fresh build at HEAD yields
**610.01 / 157.22 kB and fifteen** SCSS warnings (five admin panels added after the
measurement now warn too). The load-bearing sentence — "a fresh build prints no
initial-budget warning" — remains **true**. Same-day drift of a dated measurement,
exactly the class the 13-audit P2-4 flagged; fix in the U3/Wave-8 doc pass.

**Not false (checked, held):** every surviving review/plan claim above (§3). SD-3's
severity framing, SUMMARY's "16 of 34 resolved / 20 survive / 0 fix-now" accounting
(sampled), the ci.yml rationale comments, the `4208538` claim that the DTO **and**
`docs/api/openapi.json` moved in the same commit (confirmed — `heroImageSrcset` in both),
and `84891d7`'s message ("two missed Kusta survivors" — both `Kustuta` at `et.ts:544,967`).
SUMMARY's own header "Working tree at 47d2ce8 (clean, committed)" was true when written
and is stale now that the doc lane is mid-batch — inherent to a live tree, not a claim error.

**No public endpoint leaks private fields** (regex + schema scan, §1). **No new fully
hollow guard** was introduced by the day's work — the M7b/M7c escape is a residual
hardening gap in one real guard, not a hollow one (it still catches the canonical
re-addition, which is what the spec's threat model names).

---

## 6. Process notes (audit transparency)

- **Constraint compliance:** read-only against the real tree except this report. One
  self-inflicted slip: a production build was launched in the real `frontend/` by
  mistake and killed within ~10 s; it could only have written to gitignored
  `frontend/dist/` and `frontend/.angular/` (both confirmed gitignored; no tracked file
  touched, no server affected). All subsequent builds/mutations ran in
  `/tmp/openshelter-mut` (git archive of HEAD, node_modules symlinked).
- **No servers restarted or stopped; no DB access** (all backend observations via the
  running HTTP API, which is read-only for these probes).
- **Directory-view anomaly:** the session's initial directory view listed the ten wave
  report files with sizes, but disk/git evidence (mtime, `ls-files`, `fsck`, `find`)
  proves they were gone before the audit began; the view was a stale cache. Disk and git
  are treated as authoritative throughout.
- **Live tree:** the doc lane edited ~25 files (specs, context-and-tasks, FE i18n/map)
  between 11:50 and the end of this audit. Where a file moved mid-audit, both states are
  noted; all HEAD-verdicts refer to the committed tree at `47d2ce8`.
- **Evidence index:** `/tmp/delivery-audit/` — `api-shelters.json`, `api-guidance.json`,
  `api-datasource.json`, auth-boundary probe outputs, `mutation-results.txt`,
  `be-baseline.log` / `be-mutated.log`, `ng-build-tmp.log`, served-chunk fetches.

**Bottom line.** The day's work lands: it builds, it serves, the guards bite (5/5
mutation-confirmed, one with a documented escape hatch), and every surviving document's
claims held under re-verification. The open items are the uncommitted doc-fix batch, the
owner-queue (re-import + 5 propose-and-wait), three mislabelled commit messages, and the
lost per-wave reports — none of them hides a false behaviour claim.
