# LAST-MICRO — report

Lane LAST-MICRO, branch `code-review`, baseline `bf119ac` (clean tree at start — the parent
had committed the FINISH lanes). Three owner-issued items, all comment/citation precision.
No code, no assertions, no translation values touched. Nothing committed (parent commits).

## Item 1 — the stale malformed-request literal in the error-copy comment — **FIXED**

`frontend/src/app/shared/error-copy.ts:69` (the bullet inside the
`FIELD_VALIDATION_PREFIXES` javadoc) still quoted the pre-FINISH-P3-BE contract.

**As it was:**
```text
 *  - the malformed-body 400s say "Malformed request" (no field prefix);
```

**As it is (one line, same line number — no shift):**
```text
 *  - the malformed-body 400s are per-type sentences that all begin "The" and never with a request-payload field name (no field prefix);
```

**The current contract it now describes, verified against
`src/main/java/ee/sheltermap/api/ApiErrorHandler.java` (`malformed` +
`malformedMessage`):** the five caught exception types map to per-type text, and every
reachable message begins "The":

| Exception | Message |
| --- | --- |
| `HttpMessageNotReadableException` | "The request body is not valid JSON" |
| `MissingServletRequestParameterException` | "The request is missing the required parameter \<name\>" |
| `MissingServletRequestPartException` | "The request is missing the required part \<name\>" |
| `MethodArgumentTypeMismatchException` | "The parameter \<name\> has an invalid value" |
| `ConstraintViolationException` | "The value of \<propertyPath\> is invalid" / "The request contains an invalid value" |

**Anti-enumeration invariant kept true:** the handler's own javadoc states "The message
never starts with a request-payload field name", and the new bullet keeps the
"(no field prefix)" claim explicitly — so the documented failure direction of
`isFieldValidation400` (a malformed 400 can never be misread as a field-validation 400)
is still exactly what the code guarantees.

**Precision footnote (no action, per the no-code rule):** `malformedMessage` ends with a
dead-code fallback `return "Malformed request";` — unreachable, because the
`@ExceptionHandler` list names exactly the five types the if-chain covers. The "all begin
'The'" claim is the reachable contract.

**Residuals:** `grep 'Malformed request' frontend/src` → 0 hits after the fix. The other
stale quote the P3-F report flagged (`:684`, a different file) was **not in my assigned
set** and is left to its owning pass.

## Item 2 — the dead change-name slug in `frontend/src/index.html:98` — **FIXED**

**As it was (line 98, inside the pre-paint locale `<script>` comment block):**
```text
      // bundle-lazy-i18n — why this script stays catalog-free: it runs
```

**As it is (same line number — no shift):**
```text
      // Why this script stays catalog-free: it runs
```

The slug name is removed; every sentence of the constraint it introduced ("it runs before
any app bundle exists, so it must never need i18n data … the catalog itself is lazy") is
untouched. Census: `bundle-lazy-i18n` had exactly one remaining occurrence in
`frontend/src` (this line) — all other tree hits are historical records in
`docs/autopilot/CODE-REVIEW-NOTES.md` and the lane reports, which are not live citations
and were left as-is. `prepaint.spec.ts` evaluates the inline script source against a fake
DOM rather than diffing comment text, and asserts only the script count and behaviour —
a comment-line edit cannot break it (the gate below confirms).

## Item 3 — the `design-tokens.spec.ts` anchor precision check — **NO EDIT NEEDED; found and verified**

**What I found:** the `:855-865` citation **no longer exists in
`docs/agent/00-CURRENT-STATE.md` in any form** — no dash/colon/space variant survives
(grep `855-865|855–865|855 - 865|:855` across `docs/` hits only the *record of the
change* in `CODE-REVIEW-NOTES.md:199-200` and historical review reports). The reason the
owner's match failed: the citation had **already been re-derived to its new form** by the
FINISH-P3-BE lane, attributed in `CODE-REVIEW-NOTES.md:199-200` and
`reviews/code-review/finish-p3-be.md` ("Concurrency note"). The live citation, as it is
actually written (doc line 329):

```text
   (`frontend/src/app/design-tokens.spec.ts:866-876`). Lesson: a green guard
```

**Verification that `:866-876` is the range the clause actually needs** (the clause quotes
"the token pairs above pass while the mix can still fail"):

- Spec line 866 = the `/** Computed mix pairs — … */` block's opening line; line 876 =
  its closing `*/`. The cited range is the comment block exactly.
- The quoted phrase sits at spec line 869 — inside 866-876.
- Arithmetic check: FINISH-P3-FE's `color-scheme` pin inserted +11 lines at spec
  ~497-507 (the block is at 866-876, i.e. 855+11 / 865+11); that is the only intervening
  change, and it is fully accounted for. No further drift is owed.

**The other two deltas (applied, and now verified to point at the right lines):**

| Doc line | Citation | Spec line carries |
| --- | --- | --- |
| 94 | `design-tokens.spec.ts:924` | `it('the unified verified family is ONE value per theme: --color-new === --color-verified (owner decision)')` ✓ |
| 100 | `design-tokens.spec.ts:960` | `it('the marker colours keep their meanings (owner decision: green=verified, yellow=community, blue=registry, red-orange=reported, teal=picked)')` ✓ |

And `design-tokens.spec.ts:64-66,73-88` (doc line 322) lies **before** the insertion —
unchanged, and still the line-by-line parsing loops (`violations()` at 63-66,
`blockLines()` at 73-88). No other anchor is affected by anything in this lane.

**Why `DocumentationFactsTest` is green either way (precision, not red):** the guard
(`theCurrentStateDocAnchorsStillPointAtTheCode`, `DocumentationFactsTest.java`) checks
each citation structurally (file exists, range in-bounds, cited lines carry content), and
*additionally* — when the citation's clause window (back to the previous line/citation,
≤4 wrapped lines) carries a machine-derivable token — that at least one token appears at
the cited lines. For the mix-pairs citation the window contains only the verbatim quoted
phrase (no backticked identifier survives the window), so the phrase check is decisive:
the post-shift range `:855-865` (tail of the contrast-exemption entries) does **not**
contain the phrase — that is the red FINISH-P3-BE met and fixed — while `:866-876` does.
The doc already carries the green form, so the test passes with or without this lane
making a change; this item resolved as verification, not repair.

## Anchor-shift record (run rule 6)

**None owed.** Both edits are one-line-for-one-line swaps (`git diff --stat`: 2 files,
1 insertion + 1 deletion each); no line number in either file moved, so no citation in
`docs/agent/00-CURRENT-STATE.md` (or anywhere else) shifted, and no doc edit was made.

## Gates (all detached, exit files read)

| Gate | Command | Result |
| --- | --- | --- |
| Frontend test | `cd frontend && npx ng test --watch=false` | **exit 0** — `Tests 1583 passed (1583)`, `Test Files 65 passed (65)` |
| Frontend build | `cd frontend && npx ng build` | **exit 0** (two pre-existing SCSS 4 kB budget warnings, non-fatal, unchanged) |
| Backend full | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — `Tests run: 1359, Failures: 0, Errors: 0, Skipped: 0`, BUILD SUCCESS |

Evidence: exit files `/tmp/last-micro-{ngtest,ngbuild,mvn}.exit`; logs
`/tmp/last-micro-{ngtest,ngbuild,mvn}.log`. The Maven run held the lock the whole time
(rule 7); no concurrent unlocked build was observed, and the run shows no
missing-class wall.

## Unverified / residual

- **None on this lane's surface** — every claim above was checked against the settled
  tree (the guard's window logic by reading `DocumentationFactsTest.java` directly, the
  backend messages by reading `ApiErrorHandler.java`, the slug and stale-literal censuses
  by tree-wide grep).
- Not touched, per the assignment: the P3-F-flagged stale `:684` quote (different file,
  different pass), the ET/RU translation values (awaiting native review), and any
  behaviour of the malformed-400 handler itself (backend lane's committed work, `bf119ac`).

**Files for the parent's commit (2):** `frontend/src/app/shared/error-copy.ts`,
`frontend/src/index.html` — plus this report.
