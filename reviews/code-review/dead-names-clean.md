# Dead-names-clean — the two dead change names outside the guard's list, the limiter test seam, and the stale QA citations

Lane: `DEAD-NAMES-CLEAN` · branch `code-review` (HEAD `959e91c` at start) · 2026-09-25
Scope: (1) the dead names `admin-locale-split` and `admin-locale-scope` in comments — comment-only
replacement with the constraint each name stood for; (2) deletion of
`RollingContactOtpLimiter.clear()` and its single reference, with unreachability proof;
(3) the two stale QA citations filed by DEAD-TRYRECORD. No commits (parent commits).
No behaviour change: (1) is comments, (2) is the owner-decided deletion with the
`tryRecord` precedent, (3) is a document correction. No migrations, no guards, no
backend packages other than the limiter, no `frontend/src` file beyond the named
comment lines.

Filed by: `reviews/code-review/snapshot-clean.md` §Job 3 (the two dead names, "parent call,
same class the main sweep left the seven snapshot strings for") and
`reviews/code-review/dead-tryrecord.md` §5 (`clear()`, "reported, not deleted — outside my
authorised target") + the notes-board line `CODE-REVIEW-NOTES.md:121` (the two QA citations).

---

## 1. The two dead change names, comment-only

**Why they survived three sweeps.** Neither name resolves: `ls openspec/changes/archive/` has
no `admin-locale-*` directory (the main sweep report's claim that `admin-locale-scope` was
"archived 2026-09-13" is wrong — no such directory exists, as SNAPSHOT-CLEAN already
reported), and the only live change is `community-review-queue`. `SourceVocabularyTest`
derives its refused set from the archive, so it cannot refuse these two; the sweeps'
refused sets likewise never contained them. Re-verified in this lane.

**What each name stood for** — the constraints the replacements state:

- `admin-locale-scope`: the admin guidance reads are optionally scoped to a **content
  locale** by `?locale=` — a scoped read returns only the posts that HAVE content in that
  locale (a translation row there, or the post's home being it); a post without content in
  the locale 404s; a foreign-locale edit never moves the post's home (400); absent = the
  legacy locale-blind read.
- `admin-locale-split`: the admin **UI language** (chrome — the header switcher's domain)
  and the admin **content language** (the one admin-controlled select, on the Guidance tab)
  are independent: the content language scopes the list/detail/save/reorder calls and
  prefills new posts; a UI-language switch changes the chrome only and does not re-fetch
  the list.

Every occurrence was reworded so the comment states that constraint directly, with the
surrounding sentence kept — the same pattern the change-name sweeps and SNAPSHOT-CLEAN used
(`(name)` citation dropped, constraint sentence retained). No description's meaning
changed; every line is a comment (Javadoc, `//`, `/* */` or `<!-- -->`).

### 1a. Test tree — the 2 comment lines

| Location | Before | After |
|---|---|---|
| `src/test/java/ee/sheltermap/guidance/GuidanceValidationTest.java:63` | `// admin-locale-scope: absent = the legacy locale-blind read.` | `// An absent locale means the legacy locale-blind read.` |
| `src/test/java/ee/sheltermap/guidance/InMemoryGuidancePostRepository.java:41` | `/** The GLOBAL stored manual order (admin-locale-scope): sortOrder asc, …` | `/** The GLOBAL stored manual order: sortOrder asc, …` (the constraint is already the comment's own last sentence: the locale-scoped list and reorder both walk this order) |

### 1b. Frontend — 12 files, 34 occurrences

The parent named "11 frontend files" for `admin-locale-scope`; the current tree contains
**10** (the snapshot-clean report's own parenthetical lists exactly these 10 — the "11"
appears to be a miscount in its prose). All occurrences were found and edited; nothing
missing. Union with the 5 `admin-locale-split` files (3 shared) = **12 files, 34 lines**
(18 `admin-locale-scope` + 16 `admin-locale-split`; `guidance-order-list.html:22` and
`guidance-editor.ts:764` carried both names on one line).

| File | Lines (pre-edit) | Edit shape |
|---|---|---|
| `frontend/src/app/core/models.ts` | 945, 971, 984 | `(admin-locale-scope)` token dropped from 3 DTO Javadocs; the scoping rule, home-locale 400 rule and position semantics are the sentences' own text |
| `frontend/src/app/gateways/admin-gateway.ts` | 287, 326, 519 | `Scoped (admin-locale-scope, `locale` given)` → `Scoped (`locale` given)` (×2); `The optional `?locale=` scope (admin-locale-scope) —` → `The optional `?locale=` scope —` |
| `frontend/src/app/core/i18n/i18n.spec.ts` | 78 | `/* The admin content language (admin-locale-split): the locale the` → `/* The admin content language: the locale the` |
| `frontend/src/app/features/admin/guidance-panel.scss` | 22 | `/* The content-language select (admin-locale-scope): the ONE admin-controlled` → `/* The content-language select: the ONE admin-controlled` |
| `frontend/src/app/features/admin/guidance-order-list.scss` | 11 | `/* admin-locale-scope: the language line above the table —` → `/* The language line above the table —` |
| `frontend/src/app/features/admin/guidance-editor.scss` | 30 | `/* admin-locale-scope: the language line —` → `/* The language line —` |
| `frontend/src/app/features/admin/guidance-order-list.html` | 22 | `<!-- admin-locale-scope + admin-locale-split: the list is the CONTENT` → `<!-- The list is the CONTENT language's —` (both names on the line; constraint retained) |
| `frontend/src/app/features/admin/guidance-order-list.ts` | 38 | `/** The CONTENT language this list belongs to (admin-locale-scope) —` → `… this list belongs to —` |
| `frontend/src/app/features/admin/guidance-editor.ts` | 764, 787, 1116+1119 | create-mode comment: `(admin-locale-scope + admin-locale-split — the language line names it)` → `(the language line names it)`; home-declaration comment: `(admin-locale-scope: a scoped read serves` → `(a scoped read serves`; LANGUAGE LINE Javadoc: `(admin-locale-scope)` and `(admin-locale-split — not the admin UI language)` → `(not the admin UI language)` |
| `frontend/src/app/features/admin/guidance-editor.html` | 15 | `<!-- admin-locale-scope: the language line —` → `<!-- The language line —` |
| `frontend/src/app/features/admin/guidance-panel.html` | 1 | `<!-- admin-locale-split: the content language — the ONE admin-controlled` → `<!-- The content language — the ONE admin-controlled` |
| `frontend/src/app/features/admin/admin-page.spec.ts` | 1642, 1656, 1698–1701, 1703–1707, 2081 | 5 comment blocks (see below) |

`admin-page.spec.ts` comment blocks, before → after:

- `:1642` `// admin-locale-scope: the list is fetched for the active UI language.` → `// The list is fetched for the active UI language.`
- `:1656` `// The Position column shows the shared sortOrder (admin-locale-scope).` → `// The Position column shows the shared sortOrder.`
- `:1698` (4 lines) the "replaced the pre-split behavior this used to spec …" block → 3 lines stating the constraint only: `// A UI language switch no longer re-fetches the list (the list is the // CONTENT language's, not the UI language's) — the specs below cover // both directions.` (the "pre-split behavior" history reference went with the name — it is the task-id-history comment shape the runbook forbids)
- `:1703` (5 lines) `// ---- admin-locale-split: the admin UI language and the content language are INDEPENDENT…` → `// ---- The admin UI language and the content language are INDEPENDENT…` (5 lines, reflowed)
- `:2081` `// admin-locale-scope: the detail fetch is scoped to the active UI` → `// The detail fetch is scoped to the active UI`

### 1c. Reported rather than edited — 8 test/describe names

Per the rule "where a change name appears in a string literal or a test name, report it
rather than editing it" — these 8 are `it()`/`describe()` titles (renaming one is a spec
change, not a comment edit):

| File:line (post-edit) | Title |
|---|---|
| `admin-page.spec.ts:1708` | `a UI language switch changes the admin chrome but leaves the listed content untouched (admin-locale-split)` |
| `admin-page.spec.ts:1741` | `a UI language switch leaves the scoped empty state on the CONTENT locale (admin-locale-split)` |
| `admin-page.spec.ts:1765` | `a content language switch changes the listed content and leaves the chrome untouched (admin-locale-split)` |
| `admin-page.spec.ts:1796` | `the editor detail fetch and save scope to the content locale (admin-locale-split)` |
| `admin-page.spec.ts:1837` | `reorder submits the content locale the rendered list came from (admin-locale-split)` |
| `admin-page.spec.ts:1877` | `the admin-language select is gone and the header switcher still changes the chrome (admin-locale-split)` |
| `admin-page.spec.ts:1906` | `the content-language control sits on the Guidance tab, re-scopes the list there, and leaves the chrome untouched (admin-locale-split)` |
| `i18n.spec.ts:84` | `describe('contentLocale (admin-locale-split)')` |

Guard impact: none — the names are not in the refused set, and `SourceVocabularyTest`
(2/2) + the full gate stayed green with these titles intact.

### 1d. Line counts and anchors

Line-count neutral everywhere except `admin-page.spec.ts` (9/10, net −1, from the
4→3-line block above). `docs/agent/00-CURRENT-STATE.md` cites **no file I touched**
(grep-verified: `RollingContactOtpLimiter|OtpContactCapIT|GuidanceValidationTest|
InMemoryGuidancePostRepository|admin-page.spec|i18n.spec|guidance-editor|
guidance-order-list|guidance-panel|admin-gateway|models.ts` → 0 hits), so no anchor shift
is owed; `DocumentationFactsTest` 21/21 in-gate confirms it.

---

## 2. `RollingContactOtpLimiter.clear()` — deletion with proof

### 2a. Unreachability evidence

Every search ran over the whole repo root or the named tree, pre-edit. No live reference
exists anywhere:

| # | Place looked | Command / method | Result |
|---|---|---|---|
| 1 | Call sites (exact) | `rg -n 'contactLimiter\.clear\(\)' src/` | **One**: `OtpContactCapIT.java:89` — the only reference in the tree. |
| 2 | Every `.clear()` in production | `rg -n '\.clear\(\)' src/main/java` | Three hits, all **collection** clears: `ThrottleAlertRecorder.java:133` (`ring.clear()`, a Deque), `RegisteredUser.java:122` (`verifications.clear()`, a Map), and the limiter's own `events.clear()` *inside* `clear()`. Zero calls of the limiter method. |
| 3 | Every reference to the class | `rg -n 'RollingContactOtpLimiter' src/` | 22 hits, all constructor + `tryAcquire`: production wiring (`SecurityConfig.rollingContactOtpLimiter` `@Bean` :150, `AuthController` :59/:71/:111/:112, `VerificationService` :48/:67/:196/:197, `VerificationConfig` :35); tests **construct fresh instances** (`RollingContactOtpLimiterTest` — one per test, never `clear()`, `VerificationServiceTest` :61/:70/:71/:229, `VerificationFlowTest` :76) or wire through the config method (`SecurityConfigRateLimiterWiringTest:74`). Zero call `.clear()`. |
| 4 | Reflection / string-based lookup | `rg 'Class\.forName\|getDeclaredMethod\|getMethod\(' src/main/java` | **NONE** — no `Class.forName`, no reflective method lookup anywhere in main (the only `getMethod()` in the tree is `HttpServletRequest`'s HTTP verb). `rg -n '"clear"' src/` → **NONE**. No SpEL, `@Scheduled` or AOP references method names on this bean (plain `@Bean` constructor injection). |
| 5 | ServiceLoader / auto-configuration | `find src -path '*META-INF*' -o -name 'spring.factories' -o -name '*.imports'` | **Zero** — no service file, no factory entry anywhere under `src`. |
| 6 | Configuration / resources / migrations | `rg -i clear src/main/resources` | Prose only: the `application.yml:260` "cleared on restart" comment and V9/V20 migration comments about shelter visibility marks — no property, no SQL, nothing resolving to this method. |
| 7 | Frontend / scripts / CI / qa | repo-root grep (covers `frontend/src`, `scripts/`, `.github/`, `qa/`, `pom.xml`) | Zero — the SPA couples over HTTP only; no script or workflow references the method. |
| 8 | Documentation | repo-root grep | The only mention is the notes-board line (`CODE-REVIEW-NOTES.md:119`, DEAD-TRYRECORD's own report) — a historical record, not a reference. No doc cites the method. |

**Conclusion: unreachable from the running product by every mechanism checked — code,
reflection, service loading, configuration, templates (none exist), migrations, scripts,
CI. Deletion proceeded per the owner decision (same shape as `tryRecord`, same run).**

### 2b. What it was for

Born with the limiter itself in `39c708c` (2026-09-13, "M3: per-contact OTP caps — rolling
24 h per e-mail/phone, 429 + Retry-After (slice 2)"). A **test seam**: the limiter is a
shared singleton `@Bean` whose rolling windows live in process memory — `@Transactional`
IT rollback covers the database, not in-memory state — so `OtpContactCapIT.clearFakes()`
used it to start each test with empty windows. Self-documented as such:
`/** Clears all windows (test seam). */`. From the day the IT was written it had exactly
one caller, in the test tree.

### 2c. Why the IT does not need a replacement reset

"If the IT needs a different way to reset state, use whatever it already has" — it does
not need one, on two independent grounds:

1. **Within the class:** the three tests use **disjoint contact keys** —
   `verify:+37250007777` (phone test), `verify:otp-email@example.ee` (e-mail test), and
   `register:repeat-reg@example.ee` (registration test; the `registerAndLogin` helpers
   additionally consume `register:otp-phone@example.ee` / `register:otp-email@example.ee`).
   No window can carry over between the tests, so the reset was belt-and-braces, not load.
2. **Across classes:** limiter state can only leak across classes through a **shared
   Spring context**, which requires identical context keys. `OtpContactCapIT` pins nine
   specific `@TestPropertySource` properties (including `app.limits.otp-per-contact-max=2`)
   plus its own three `@Primary` `@TestConfiguration` beans. The only other class pinning
   the cap to 2 (`AdminAlertsIT`) has a **different** property set (no
   `app.ratelimit.verify-*` pair, extra `app.admin.*`) → separate cached context →
   separate limiter instance. The shared phone `+37250007777` that five other ITs use
   (`RefreshRotationRaceIT`, `AccountControllerIT`, `VerificationThrottleIT`,
   `SessionLifecycleThrottleIT`, `EmailTestController(Allowlist)IT`) runs in the default
   test-profile contexts (`otp-per-contact-max: 100`, `application-test.yml:47`) —
   different limiter instances entirely.

The IT's other fakes keep their own `clear()`s (`InMemoryVerificationSendLog`,
`RecordingSmtpSender`, `RecordingSmsSender` are test doubles — legitimate seams). A
two-line constraint comment now sits where the call was, so a future reader does not
"restore" a reset: *"The shared in-memory contact limiter needs no reset: the tests below
use disjoint contacts, so no window carries over."*

### 2d. What went

| File | What went | Lines |
|---|---|---:|
| `src/main/java/ee/sheltermap/verification/RollingContactOtpLimiter.java` (was :112–116) | the `clear()` method + its `(test seam)` javadoc. The `lastSweepMillis` field **stays** — constructor and `maybeSweep` use it | −6 |
| `src/test/java/ee/sheltermap/auth/OtpContactCapIT.java` | the `import ee.sheltermap.verification.RollingContactOtpLimiter;`, the `@Autowired RollingContactOtpLimiter contactLimiter;` field, and the `contactLimiter.clear();` call in `clearFakes()` (replaced by the 2-line constraint comment) | −5 / +2 |

No test was deleted or weakened: `OtpContactCapIT` still has its 3 tests (the
`clearFakes()` helper is `@BeforeEach`, not a test), and no other fixture, script or
config served `clear()`. Deletions left **uncommitted** for the parent, per the run
convention.

---

## 3. The two stale QA citations

Both cited `FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly`,
deleted by the DEAD-TRYRECORD lane. The underlying claims (60 s cooldown + 5 sends/UTC day
on the durable file log; 6th send same UTC day → 429 until midnight) **stay true** and
remain pinned; the citations now point at surviving pins (method existence
grep-verified pre-edit):

| Location | Before (stale fragment) | After |
|---|---|---|
| `qa/security-checklist.md:57` | `…tests test/auth/VerificationThrottleIT, VerificationDailyCapIT, verification/FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly.` | `…verification/FileVerificationSendLogTest.countsOnlySendsFromToday` (same file, the surviving UTC-day-boundary pin of the file log — `FileVerificationSendLogTest.java:108`) |
| `qa/test-plan.md:70` | `…, verification/FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly` | `…, verification/VerificationServiceTest.dailyCapBlocksFurtherSends` (the surviving unit pin that the per-(user, level) cap blocks further sends — `VerificationServiceTest.java:189`); the end-to-end `VerificationDailyCapIT.dailyCapThrottleCarriesRetryAfterUntilUtcMidnight` citation on the same row is untouched |

No guard parses either file (no test reads them), so nothing was red either way — this is
truth-maintenance, matching the DEAD-TRYRECORD filing.

**Reported rather than edited:** `docs/code-review/2026-09-14-p2-audit.md:61` also
mentions the file-based send log's "atomic `tryRecord`" — a dated historical audit record
stating what it verified on 2026-09-14. Rewriting a past audit's findings would falsify
the record; outside my target list, so it stands.

---

## 4. GATE

| Gate | Result |
|---|---|
| `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** (`/tmp/dead-names-clean-mvn.exit`; log `/tmp/dead-names-clean-mvn.log`, 02:46) — `Tests run: 1361, Failures: 0, Errors: 0, Skipped: 0`; PMD 7.27.0 ran; `All coverage checks have been met`; BUILD SUCCESS |
| `cd frontend && npx ng test --watch=false` | **exit 0** (`/tmp/dead-names-clean-ngtest.exit`) — **Test Files 65 passed (65), Tests 1581 passed (1581)** — exactly the stated baseline, unchanged |
| `cd frontend && npx ng build` | **exit 0** (`/tmp/dead-names-clean-ngbuild.exit`) |

**Test count: 1361, unchanged from the 1361 baseline** (DEAD-TRYRECORD's authoritative
gate) — as expected: my diff removes zero test methods (the IT's reset helper is
`@BeforeEach`; `OtpContactCapIT` 3/3, `RollingContactOtpLimiterTest` 8/8,
`GuidanceValidationTest` 10/10, `SourceVocabularyTest` 2/2 and
`DocumentationFactsTest` 21/21 all green in-gate). No rule-7 wall: no missing-class
errors, and the foreign DTO lane's files were idle ≥ 90 s before the backend gate
started (below).

---

## 5. Foreign state, named

1. **In-flight foreign edits in the shared tree (not mine, not touched by me):**
   `src/main/java/ee/sheltermap/api/AdminAlertDto.java`, `AdminAuditDto.java`,
   `AdminShelterDto.java` — the SIMPLIFY-DTOS lane (notes-board line present), active
   until ~03:33, after my run began. Their files compiled clean inside my green gate
   (1361/1361 includes everything in the tree at gate time). Named here so the parent's
   commit of my 18 files does not sweep theirs in by accident.
2. **A lost edit, detected and repaired (this lane's own anomaly, disclosed):** my first
   `edit` of `admin-page.spec.ts` (5 comment blocks) reported success, but the file's
   mtime never changed and the subsequent `git diff --stat` omitted the file — the write
   did not land (tool/environment anomaly; the file's mtime proves no writer of any kind
   touched it after 00:37:25, well before my run, and HEAD did not move during my run).
   I re-applied the same 5 blocks at 03:33:21 and verified persistence three ways
   (mtime updated; `rg` count now 8 = exactly the report-only titles; `git diff` shows
   the 5 hunks, numstat 9/10). The green frontend gate (start 03:34:31) ran **against
   the re-applied state** — `admin-page.spec.ts` 132/132 passed in it. No other file
   showed the same symptom (all 17 others verified in `git diff` before gating).

## 6. Unverified

- The "11 frontend files" figure the parent (and snapshot-clean's prose) carried does not
  match the tree — 10 files held `admin-locale-scope` at start. Every occurrence in every
  found file was edited; if a file was expected that the tree does not contain, it is
  absent, not missed — a fresh repo-wide grep for both names now returns **exactly the 8
  report-only test/describe titles** and the historical review records.
- The mechanism of the lost `admin-page.spec.ts` write is unexplained (no writer
  identified; the file was demonstrably untouched by anything after 00:37:25 until my
  re-apply). The re-apply's persistence is verified as above; a second occurrence is
  unprovable either way.
- Item (2)'s safety argument rests on the two stated grounds (disjoint in-class contacts;
  context-key separation from `AdminAlertsIT`), which I verified by grep and property-set
  comparison rather than by instrumenting the Spring context cache. The in-gate
  `OtpContactCapIT` 3/3 green under the reset-free `clearFakes()` is the empirical
  confirmation.

**Files for the parent's commit (this lane, 18):** the 4 Java files, the 12 frontend
files, `qa/security-checklist.md`, `qa/test-plan.md` — plus this report and the
notes-board line.
