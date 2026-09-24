# TEST-QUALITY-API — read-pass + mutation pass over `src/test/java/ee/sheltermap/api/**`

**Lane:** TEST-QUALITY-API · **Branch:** `code-review` (no commits) · **Scope (exclusive):** `src/test/java/ee/sheltermap/api/**` — 45 files, ~15.4 KLOC. `DocumentationFactsTest`/`SourceVocabularyTest` (both under `config/`) excluded per the lane brief, as are `persistence/**` base classes, main sources and frontend.
**Method:** full manual read-pass of all 45 files; a lexical scanner for comment-swallowing (validated against the pre-fix `HeroImageImportIT` shape from cb57d84); mutation testing of 8 significant behaviours in a throwaway worktree (`/tmp/test-quality-api/mut`, detached at cb57d84, every mutation reverted, worktree removed; evidence logs `/tmp/test-quality-api/runA.log`, `runB.log`, `runC.log`).

---

## 1. Read-pass findings (file:line evidence)

### 1.1 Vacuous assertion — `instanceof` on a statically-typed list (FIXED)

`api/ShelterQueryServiceTest.java:617-621` — `dtoNeverLeaksTheEntity`:

```java
List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL, null, null);
assertThat(dtos).allMatch(dto -> dto instanceof ShelterDto);
```

`dtos` is statically `List<ShelterDto>`: the `instanceof` can never be false, so the
test's headline claim — the DTO "never leaks the entity" — was guarded by an assertion
that cannot fail (the §7 recurring defect: a guard that passes while checking nothing).
The sibling assertion (`shelters.findAll()` size 3) only proved the repo was untouched,
not the projection.

**Fix (strengthened, nothing removed):** the test now pins what "value projection, not
the entity" observably means — the DTO fields are the entity's values at read time
(status/source/lat/lng asserted on the "User House" row) AND a post-read mutation of the
entity (`setStatus(INACTIVE)` + re-save) does not change the already-returned DTO
(a projection that wrapped the entity would leak it). The repo-size assertion is kept.

### 1.2 Vacuous assertion — `isNotNull()` on a boxed primitive (FIXED)

`api/AdminModerationIT.java:333` (tail of `theAdminListFiltersByStatusSourceAndQuery`):

```java
long active = seedShelter("Otsitav A", ShelterSource.USER);   // line 282, primitive
...
assertThat(active).isNotNull();                                // line 333
```

`assertThat(long)` auto-boxes; a boxed primitive is never null — the assertion can never
fail. It sat at the end of the "filters compose" block as if it verified the composed
result.

**Fix (strengthened, nothing removed):** the composed-filter call now pins the answer
row BY ID — `.andExpect(jsonPath("$[0].id").value(active))` — so the `active` seed id
is used for what it is (the row identity) and a wrong row from the composed filter
fails the test.

### 1.3 Documented no-op lifecycle hook (REMOVED)

`api/ShelterApiIT.java:69-72`:

```java
@BeforeEach
void cleanShelterTable() {
    // no-op: @Transactional rolls each test back; kept for clarity
}
```

A `@BeforeEach` whose entire body is the comment that it does nothing — the silent
no-op cleanup class from the defect list (documented, so not "silent", but dead weight
and a false affordance for the next reader). Isolation is actually proven by the class
annotation (`@Transactional` + `AbstractPersistenceIT`), which every passing test
already exercises. **Removed** the method and its now-unused `BeforeEach` import; all 20
class tests unchanged.

### 1.4 Coverage gap proven by mutation — the POST half of the shared bbox gate (FIXED)

`api/ShelterApiIT.java` `putOutsideEstoniaIs400AndChangesNothing` pins the bbox gate on
the **PUT** path and comments "Paris — same bbox gate as POST, shared so create/update
cannot drift". No test exercised the gate on the **POST** path. Mutation B1 (delete the
`requireInsideEstonia` call in `ShelterController.create` only) survived all 20
`ShelterApiIT` tests and every other test in the run (survivor in §2).

**Fix (added, mutation-verified):** `postOutsideEstoniaIs400AndCreatesNothing` — a
verified caller POSTs Paris coordinates, expects the uniform 400, and the public list
must not contain the name (nothing created). Re-ran with B1 applied: the new test goes
red (`expected:<400> but was:<201>`, runC.log). The two halves of the shared gate now
each have their own pin, so a create-side removal can no longer drift silently.

### 1.5 Message pinning asymmetry in the conflict-family (STRENGTHENED)

`api/ApiErrorHandlerTest.java` `staleStateDeeperInTheCauseChainStillMapsToConflict`
asserted only the 409 status, while both sibling conflict tests also pin
`CONFLICT_MESSAGE`. A regression that answered 409 with the wrong (e.g. the 500
fallback's) message would have passed. Added the `CONFLICT_MESSAGE` assertion —
consistent with the siblings; mutation A2 (§2) confirms both assertions pin the
behaviour.

### 1.6 Cosmetic (FIXED)

`api/ShelterBboxPagingIT.java:107` — section comment `// ---------- the viewport ()
----------` (empty parentheses). Cleaned to `// ---------- the viewport ----------`.

### 1.7 What the read-pass found NO evidence of

- **Comment-swallowing (the cb57d84 defect class):** a lexical scanner (block-comment
  state machine that flags any comment swallowing non-comment lines or running to EOF;
  it reproduces the pre-fix `HeroImageImportIT` failure on the cb57d84~ shape) reports
  **0 findings** across the whole `ee.sheltermap` test tree today.
- **`@AfterAll`/`@BeforeAll` not compiling in:** all lifecycle annotations in the tree
  are on real, reachable methods (verified per file; the scanner above additionally
  proves no annotation line sits inside an unterminated comment).
- **Stub-echo hollowness ("passes only because the stub returns the expected value"):**
  no Mockito/`@MockBean` in the tree at all. The hand-rolled fakes
  (`FakeJavaMailSender` in `EmailTestControllerIT`/`EmailTestControllerAllowlistIT`,
  `RecordingSmtpSender` in `ShelterApiE2EIT`, `StubbedUpstream` in `LocationResolveIT`,
  `AcceptingSender`/`RefusingSender` in `SmsTestControllerTest`) are all CAPTURING
  doubles and the assertions read the CAPTURED state (`mail.last.getTo()/getSubject()/
  getText()`, the verification code parsed out of the recorded mail body, the hop URL
  the stub reports) — not the value the test asked for. None hollow.
- **`assume*`/skips that could hide failures:** none.
- **Unreachable assertions:** the two in §1.1/§1.2 (both fixed); no others.

## 2. Mutation table (throwaway worktree, all reverted)

8 mutations of significant behaviours; "Killed by" = tests that went red with the
mutation applied. 7 of 8 killed out of the box; the 1 survivor was a real coverage gap
(fixed and re-verified, §1.4).

| # | Mutation (production file) | Behaviour removed | Killed by |
|---|---|---|---|
| A1 | `api/ShelterQueryService.callerView` — occupancy lookup for the caller replaced with `null` | the detail read carries the CALLER's own live occupancy band | `ShelterQueryServiceTest.detailCarriesTheCallersOwnBandAndListDoesNot:330` (band read null) |
| A2 | `api/ApiErrorHandler.transactionSystem` — stale-state detection disabled (`if (false)`) | commit-time `StaleStateException` → 409 conflict | `ApiErrorHandlerTest.commitTimeStaleStateWrappedInTransactionSystemExceptionMapsToConflict:76` and `staleStateDeeperInTheCauseChainStillMapsToConflict:89` (500 instead of 409); the 500-fallback sibling correctly stayed green |
| B1 | `api/ShelterController.create` — `requireInsideEstonia` call removed | the POST create bbox gate | **SURVIVED** (only the PUT half was pinned) → gap fixed by the new `postOutsideEstoniaIs400AndCreatesNothing`, which kills it: `expected:<400> but was:<201>` (runC.log) |
| B2 | `persistence/JpaReportActionLog.record` — cap compared against `Integer.MAX_VALUE` | the per-user per-hour report budget (11th action 429) | `ReportThrottleIT.eleventhReportTypeActionIs429:127` (`expected:<429> but was:<204>`), `theLimitIsPerUser:203` (`expected:<429> but was:<200>`), `openStatusTapsAreNotThrottledAndConsumeNoBudget:232` (`expected:<429> but was:<200>`) |
| B3 | `app/ShelterService.addPlace` — daily-cap guard disabled (`if (false)`) | the rolling-24 h per-user submission cap (6th → 429 + Retry-After) | `ShelterDailyLimitIT.theSixthSubmissionWithin24hIs429WithRetryAfter:124` and `deletingARowFreesItsDailyCapSlot:143` (both `expected:<429> but was:<201>`) |
| B4 | `guidance/GuidanceService` — `listPublic` + `getByPublicSlug` resolve the DEFAULT locale, ignoring the request | the public index/detail locale filter | `GuidanceLocaleFilterIT.theIndexFiltersByLocaleAndTheTwoSetsAreDisjointAndNonEmpty` (en slugs served for `locale=et`), `theDetailServesTheRequestedLocaleAndFallsBackToTheDefaultWhenAbsent:172` (`expected:<200> but was:<404>`), `aBlankOrOverlongLocaleIsAUniform400OnIndexAndDetail:159` (`expected:<400> but was:<200>` — the bound was never seen) |
| B5 | `config/SecurityConfig` — ERROR-dispatch `permitAll()` → `denyAll()` | the ERROR dispatcher type reaching the public error page | `ErrorDispatchPublicEndpointIT.aFailedPublicEndpointAnswersItsRealStatusAndTheOriginalPath:69` and `theOriginalPathIsReportedForAnyForwardedStatus:93` (both `expected:<414|400> but was:<401>` — the original defect's exact signature) |
| B6 | `api/ApiErrorHandler.mediaTypeNotSupported` — answers the 500 fallback | the 415 client-error mapping for a JSON body on the multipart endpoint | `AdminMediaClientErrorsIT.aJsonBodyOnTheMultipartEndpointAnswers415Not500:100` (`expected:<415> but was:<500>`) |

**Not hollow by mutation:** 8 mutation instances, 1 survivor, 0 after the §1.4 fix.
Every sampled behaviour in the tree is pinned by at least one real assertion; the
samples span the query service, both throttle layers, the error-mapping advice, the
public locale filter, the security error-dispatch rule and the client-mistake 4xx
family.

## 3. Fixes applied (5 test files, nothing else in scope)

| File | Change | Coverage effect |
|---|---|---|
| `api/ShelterQueryServiceTest.java` | `dtoNeverLeaksTheEntity` now asserts mapped field values + snapshot semantics under a post-read entity mutation (§1.1) | strengthened |
| `api/AdminModerationIT.java` | vacuous `isNotNull()` on a boxed primitive → composed-filter row pinned by id (§1.2) | strengthened |
| `api/ShelterApiIT.java` | no-op `@BeforeEach cleanShelterTable` removed (§1.3); **new test** `postOutsideEstoniaIs400AndCreatesNothing` (§1.4) | −0 (no test lost), +1 (new pin) |
| `api/ShelterBboxPagingIT.java` | broken section comment (§1.6) | cosmetic |
| `api/ApiErrorHandlerTest.java` | missing `CONFLICT_MESSAGE` assertion on the deep-cause 409 test (§1.5) | strengthened |

No assertion was weakened or deleted anywhere; no test was deleted. No production code
was changed by this lane (working-tree diff confined to the five files above; the
`ShelterController`/`ShelterService` modifications in the shared tree belong to the
SIMPLIFY-SHELTER-CTRL lane, the `frontend/` changes to the frontend lanes — see the
board entries in `docs/autopilot/CODE-REVIEW-NOTES.md`).

**Production bugs proven: none.** The single mutation survivor was a missing test, not
a production defect — the production code behaved correctly; the create-side gate
simply had no pin.

## 4. Gate

Run detached under the shared lock (`flock /tmp/openshelter-mvn.lock`), logs kept at
`/tmp/test-quality-api/gate1.log` / `gate2.log`.

| Gate | Command | Result |
|---|---|---|
| 1 (full) | `mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 1** — `Tests run: 1339, Failures: 1` — the single failure is the FOREIGN `config/DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode:1642` (stale `paging.ts` anchors in `00-CURRENT-STATE.md` from the SIMPLIFY-SHARED in-flight rewrite; fix owned by the doc lane per the board entries — §5). Every other test green, including all five files this lane touched. |
| 2 (full scope minus that one foreign method) | `mvn -B -ntp verify -Dtest="!DocumentationFactsTest#theCurrentStateDocAnchorsStillPointAtTheCode" -Ddependency-check.skip=true` | **exit 0** — `Tests run: 1338, Failures: 0, Errors: 0` — PMD clean, jacoco 0.93 LINE floor met (`All coverage checks have been met`), OpenApiSnapshotIT green. |

**Test count: 1332 (lane baseline) → 1339 = +7**, accounted for:

- **+1 this lane:** `ShelterApiIT.postOutsideEstoniaIs400AndCreatesNothing` (the new
  POST bbox pin, §1.4) — a new test, not a replacement; nothing deleted.
- **+6 foreign:** SIMPLIFY-SHELTER-CTRL's new service-level tests
  (`app/ShelterServiceTest`, `app/ShelterServiceOwnershipTest` — their board entry
  reports gate 1 at 1338 runs on this same tree before this lane's addition).

## 5. Foreign / out-of-scope observations (named per run rule 4)

- `frontend/src/app/shared/pagination.html` — pi-lens inline blocker `L3 Expected }
  but found <` fired repeatedly during this lane. It is NOT in this lane's scope
  (frontend excluded) and is already recorded by SIMPLIFY-SHARED as a known false
  positive (generic HTML parser vs Angular `@if`; authoritative compiler + runtime
  specs green — their report §9). No backend impact; no action taken here.
- `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` — the shared
  gate red carried by other lanes' reports: the in-flight `paging.ts` rewrite
  (SIMPLIFY-SHARED) outruns the committed doc anchors in `00-CURRENT-STATE.md`. Fix
  belongs to the doc lane (re-derive the three `paging.ts` citations per the
  SIMPLIFY-SHARED board entry); `DocumentationFactsTest` is outside this lane's file
  set.
- `docs/autopilot/CODE-REVIEW-NOTES.md` shows other lanes' board entries (foreign,
  untouched by this lane except its own row).

## 6. Unverified / residual

- The mutation sample is 8 of the tree's significant behaviours (deliberate subset per
  the brief): throttle, caps, bbox, locale filter, error dispatch, 415 mapping,
  commit-time 409, caller-band projection. Behaviours not sampled include the
  occupancy-tap derivation (freshness window, agreeing-report counting), the
  last-verified meta chain, the X-Total-Count paging headers and the provenance
  derivation — all read and found to assert concrete values (no red flags in the
  read-pass), but they were not mutation-verified by this lane.
- B4 mutated both public reads (`listPublic` + `getByPublicSlug`) in one instance; the
  three kills above each trace to that single "locale filter ignored" behaviour.
