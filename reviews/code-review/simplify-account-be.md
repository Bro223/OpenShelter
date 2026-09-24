# SIMPLIFY-ACCOUNT-BE — account lifecycle readability pass

Scope: `src/main/java/ee/sheltermap/auth/AccountService.java`, `auth/AccountController.java`
and the tests pinning them. Rules per `docs/autopilot/CODE-REVIEW-RUN.md`; skills
`docs/skills/clean-code.md`, `code-review.md`, `test-driven-development.md`; target per
`docs/autopilot/CODE-REVIEW-STATUS.md` and `reviews/code-review/be-recon.md` (the account
lifecycle: data export, deletion with its erasure semantics, profile reads).

The deletion gate (no verified-status requirement) was settled by a prior lane and is
pinned — treated here as fixed behaviour, expression-only changes around it.

## 1. What was flattened and split (before → after, method spans incl. signature)

### `AccountService.java` — 185 → 191 lines

| Method | Before | After |
|---|---|---|
| `profile` | 67–69 (3) | 66–68 (3) — untouched body |
| `updateProfile` | 82–91 (10) | 81–90 (10) — comment trim only |
| `dataExport` | 103–121 (19) | 101–113 (13) + new `exportedShelter` 116–124 (9) |
| `deleteAccount` | 150–184 (35) | 148–172 (25) + new `purgePrivateHomesAndOrphanPublicRows` 180–190 (11) |

- `dataExport`: the 13-line inline positional-record construction left the stream body —
  it is now one named row mapper, `exportedShelter` (`private static`), and the stream is
  `.map(AccountService::exportedShelter)`. Field order and the location-null lat/lng
  handling were moved verbatim: the field set is the export contract, so nothing was
  reordered, added or dropped.
- `deleteAccount`: the per-row shelter step became the named method
  `purgePrivateHomesAndOrphanPublicRows`; the numbered step comments (`1 + 2.`, `3.`, `4.`)
  are gone — the step names plus one constraint comment each carry the same information.
  The javadoc's numbered `<ol>` was compressed into one constraint paragraph (entity-level
  delete rationale, V7 ON-DELETE-SET-NULL intent, audit free-text redaction, FK cascade
  list) — same constraints, no list.
- Comment trims: class doc loses the `(04-CONTEXT-AUTH.md)` pointer; `updateProfile` loses
  the `(remove-national-id)` tag (the constraint sentence itself stays). The
  `legal-recovery` label stays — it is the pinned domain marker for the erasure
  mechanism (be-recon §5.10).
- The file grew 6 lines net because two named steps each carry their own signature +
  short constraint javadoc; both long methods themselves shrank (35→25, 19→13).

### `AccountController.java` — 273 → 245 lines

| Method | Before | After |
|---|---|---|
| `me` | 106–108 (3) | 82–84 (3) — untouched body |
| `updateProfile` | 125–127 (3) | 102–104 (3) |
| `requestEmailChange` | 137–141 (5) | 114–118 (5) |
| `confirmEmailChange` | 149–157 (9) | 126–128 (3) |
| `requestPhoneChange` | 168–172 (5) | 139–143 (5) |
| `confirmPhoneChange` | 180–185 (6) | 151–153 (3) |
| `dataExport` | 204–206 (3) | 172–174 (3) |
| `deleteAccount` | 247–257 (11) | 209–218 (10) |
| `requireRate` | 259–264 (6) | 220–225 (6) |
| `currentUser` | 266–272 (7) | 238–244 (7) |
| — new `requireSucceeded` | — | 232–236 (5) |

- Class javadoc 33 → 8 lines: the seven per-endpoint bullets duplicated every method's
  own `@Operation` text — removed ("each endpoint's own annotations carry its rule");
  kept are the two layering constraints not visible from any single method (user resolved
  from the token, never the body; request endpoints IP-throttled, confirms
  code-verified/attempt-limited instead). The `(01-TASK.md §7)` pointer is gone.
- `confirmEmailChange`/`confirmPhoneChange`: the duplicated result-check-and-throw lifted
  into one private `requireSucceeded(ContactChangeResult)`. The "the 400 is thrown
  after the failed-attempt commit" constraint comment now exists once, on the helper —
  previously it was on the email leg only (the phone leg carried the same constraint
  with no comment).
- `deleteAccount` javadoc 15 → 10 lines, inline comment 4 → 3: the fix-name history
  ("narrowed in the DELETE-UNVERIFIED fix") is gone; the settled no-verified-gate rule is
  stated as a constraint. **No behaviour change** — the gate question was settled by an
  earlier lane and is untouched.
- No public or HTTP-facing member renamed or re-signatured; the only new symbol is the
  private `requireSucceeded`.

## 2. Deliberately left (pinned mechanisms, expression unchanged)

- **Erasure sequence verbatim** (be-recon §5.10, must-stay): provisioned-admin guard
  FIRST (before any read); the user's shelters read ONCE and mutated in place as managed
  entities; private → `deleteById`, public → `created_by NULL` + `reviewNote NULL` +
  `save` (trust state untouched); audit redaction over the **full original id set —
  purged private homes included**, not just survivors; then `user.deleteAccount()` →
  `userRepository.delete(userId)` in that order. Same `@Transactional` boundaries, same
  ordering. (The "full original set" scope is the subtle part — the helper carries it in
  a comment now that the numbered steps are gone.)
- **Export field set + row order** — `ExportedShelter` positional construction copied
  verbatim into the mapper; `findByCreatedBy` order preserved.
- **The whole OpenAPI surface**: every `@Tag`/`@Operation`/`@ApiResponse` string, every
  mapping and handler signature is byte-identical (git diff on the controller is
  javadoc/comments + the two confirm bodies + the new private helper only).
- **`currentUser()`'s refusal** of a missing user via
  `InvalidContactChangeException("Account not found")` — a contact-change exception used
  as the generic "account gone behind a still-valid JWT" guard. Semantically odd, but the
  4xx shape is what `anExportAfterDeletionYieldsNoUserData` pins; changing the exception
  type is a behaviour change, not a readability one. Left alone.
- `requireRate`/`ClientIps` wiring — cross-lane duplication, filed (notes board).

## 3. Evidence the pinned semantics hold — tests passed UNMODIFIED

No test file in scope was touched (zero diff). All counts from the final gate log:

| Class | Result | Pins |
|---|---|---|
| `auth/AccountServiceTest` | 7/7 (also run standalone in-lock before the gate) | export carries profile + every authored shelter (both statuses, field set); private purged / public orphaned with review+open status and `created_by`/`reviewNote` exactly as pinned; audit reasons redacted, rows kept; user row removed; other users' shelters + audit notes untouched (scope); provisioned admin refused with the exact `PROVISIONED_ADMIN_DELETE_MESSAGE` and NOTHING erased; ordinary REGISTERED account still fully erasable |
| `auth/AccountDeletionIT` | 6/6 (full-stack: security chain, JWT filter, Postgres) | anonymous 401; admin 403 + message + still able to log in; **`anUnverifiedUserCanDelete` — the settled deletion gate (204 + full erasure, no verified claim)**; `deletionPurgesPrivateOrphansPublicAndCascadesTheAccount` — private purged (404 on re-read), public orphaned with `CONFIRMED` trust state + V31 write-time verification snapshot surviving, other author untouched, audit rows survive with the dangled moderator id (V14), credentials/refresh/blind-index gone, erased contact re-registrable; repeat call = idempotent 204 (JWT valid until expiry); export after deletion yields no user data |
| `auth/AccountDataExportIT` | 4/4 | anonymous 401; decrypted profile + own shelters; author scoping (other rows stay out); empty lists for a contribution-less account |
| `auth/AccountControllerIT` | 16/16 | `/me` real profile + real claim set (401 unauthenticated, empty claims before verify, real claims after); `PUT /profile` persisted + fresh profile returned, wrong-password 401 changes nothing, blank name 400, no-token 401, name change leaves claims intact; contact-change request/confirm cross-channel (SMS↔email), wrong-code 400, same-value 400, duplicate 409, 429 + Retry-After cooldown, 5-attempt lockout with persisted increments, race 409, claims survive an email change |
| `api/OpenApiContractIT` | 10/10 | the exact path+method inventory, no secrets/PII in the document (§4) |
| retention (foreign callers) | green in gate | `RetentionService` calls `AccountService.deleteAccount` — the external caller's pins pass, confirming the public contract is intact |
| guards | green in gate | `DocumentationFactsTest`, `SourceVocabularyTest` (plus my own pattern-set self-check: 0 hits on all five in-scope files) |

TDD skill's refactor rule ("keep tests green, don't add behaviour") is what this pass
is: red/green pre-existed (the pins are the suite); only the refactor step ran, watched
green both in the standalone run and the full gate.

## 4. OpenAPI snapshot check

- `OpenApiSnapshotIT` **1/1** in the final gate — the generated document is
  byte-identical to the committed snapshot (`docs/api/openapi.json`, which my diff does
  not touch: `git status` shows only the two source files).
- `OpenApiContractIT` 10/10 (contract inventory + PII scan) in the same run.
- No revert was needed.

## 5. Anchors

`docs/agent/00-CURRENT-STATE.md` cites **neither** file (grep-verified: zero hits for
`AccountService`/`AccountController` across `docs/agent/`; the only `account` mention in
the current-state doc is line 291, the frontend `/account` route — another lane's
surface). **No anchor shift is owed; nothing recorded in the notes file for the anchor
pass.** (My edits do move line numbers within the two files — e.g. `requireRate`
259–264 → 220–225 — but nothing in the guarded document cites those ranges.)

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
(detached, exit file read): **exit 0** — `Tests run: 1349, Failures: 0, Errors: 0,
Skipped: 0`, exactly the 1349 baseline; PMD check ran with `failOnViolation` (priority
≤ 2) — clean; jacoco check passed the 0.93 floor. No foreign failures, no
missing-class wall (the lock was held for the whole run). Log:
`/tmp/simplify-account-be-gate.log`, exit file: `/tmp/simplify-account-be-gate.exit`.

## 7. Unverified / caveats

- Frontend gates not run — this lane touched no frontend file (the account FE surface is
  SIMPLIFY-ACCOUNT-FE's, already done).
- The gate log carries a benign JaCoCo agent warning (`Unsupported class file major
  version 71` while instrumenting `com.sun.net.httpserver` JDK-internal classes) —
  environmental, pre-existing, build green.
- A sibling lane (SIMPLIFY-ADMIN-CTRL) began landing `api/Admin*` source edits at
  22:35:51, ~4 minutes AFTER my gate finished (22:31:35); my gate tree contained
  exactly my two files, so their changes are not covered by my gate — their lane's
  gate owns them. Their report (`reviews/code-review/simplify-admin-ctrl.md`) is
  untracked; not mine, untouched.
- One semantic oddity intentionally NOT changed (behaviour-pinned, not readability):
  `currentUser()` refuses a vanished account with
  `InvalidContactChangeException("Account not found")` — see §2. If the owner wants the
  exception type cleaned up it needs a pin update first.
