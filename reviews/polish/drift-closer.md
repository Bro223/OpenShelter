# DRIFT-CLOSER — close the three-times-verified doc-vs-code defect class

**Lane:** DRIFT-CLOSER · **Branch:** `feature/frontend` · **No commit** — the parent commits.
**Inputs:** `reviews/polish/unread-backend.md` §4 (F1, F2, F3), `reviews/polish/unread-frontend.md`
§5.1 (the `media-panel.ts` shadow). **Skills:** `docs/skills/clean-code.md`, `docs/skills/code-review.md`.
**Rules:** `docs/autopilot/CODE-REVIEW-RUN.md` — rule 1 (behaviour-preserving), rule 6 (anchors),
rule 7 (Maven lock on every invocation).

**Bottom line:** both F1 claims verified false in the code (GUEST is excluded in the SQL; the
provisioned-admin suspension refusal answers **403**, not 409). All fixes landed — the DTO's
twin `@Schema` descriptions, the `ApiErrorHandler` 409-family entry (F2), the two test-tree
dangling citations (F3) **plus one more main-source instance of the same class found during
verification** (`ContactChangeService.java:114`, filed by no lane), and the confirmed
`media-panel.ts` local rename. The regenerated OpenAPI snapshot diff is exactly the two
corrected descriptions and nothing else. Both gates green at the exact baselines (1370 / 1590).
Zero behaviour change, zero user-visible strings, zero test files' assertions touched.

---

## 1. Task 1 — the verified-correct statements (established from the code, before any edit)

### Claim (a) — "`GUEST` is in the `kind` value space of `AdminUserDto`" — **FALSE**

The only values `kind` can hold are **`REGISTERED` and `ADMIN`**. Evidence chain:

- `JpaUserRepository.findAccountPage` (`src/main/java/ee/sheltermap/persistence/JpaUserRepository.java:187-191`)
  and `countAccounts` (`:195-197`) both pass `List.of(UserKind.REGISTERED, UserKind.ADMIN)`
  into the read.
- The JPQL behind it (`SpringDataUserRepository.java:38-41`):
  `select u from UserEntity u where u.kind in :kinds order by u.id asc …` — the GUEST
  exclusion is **in the SQL**; a page never loads, and never decrypts, GUEST rows.
- `AdminUserModeration.listUsers` javadoc (`api/AdminUserModeration.java:66-71`) states the
  same: "every REGISTERED and ADMIN account (the guest exclusion is IN THE SQL…)".

**Correct statement:** *the tab lists every REGISTERED and ADMIN account; GUEST rows are
excluded in the SQL, so a guest never appears in the list — `kind` is `REGISTERED | ADMIN`
only.*

### Claim (b) — "an admin suspension refusal answers 409" — **FALSE** — it answers **403**

Evidence chain:

- The guard order is 404 → 403 → 409, in `AdminUserModeration.requireSuspendableUser`
  (`api/AdminUserModeration.java:125-135`): an `AdminUser` is refused at `:130` with
  `ProvisionedAdminProtectedException`; only a non-registered (i.e. GUEST) account reaches
  the `:133` throw of `NonSuspendableUserException`. `isRegistered` (`:149-151`) explicitly
  excludes `AdminUser` as well, so the 409 is **GUEST-only in every case today**.
- `grep` over all of `src/main/java`: `NonSuspendableUserException` has exactly ONE throw
  site (`AdminUserModeration:133`); `ProvisionedAdminProtectedException` has five
  (`AccountService:158`, `PasswordResetService:209,262`, `ContactChangeService:286`,
  `AdminUserModeration:130`).
- Handler families in `api/ApiErrorHandler.java`: `ProvisionedAdminProtectedException` is in
  the **403** `forbidden` list (`:397`); `NonSuspendableUserException` is in the **409**
  `conflict` list (`:274`).

**Correct statement:** *suspending or unsuspending the provisioned ADMIN account is refused
with 403 (`ProvisionedAdminProtectedException`, handler 403 family); `NonSuspendableUserException`
(409) is the GUEST-only refusal — no credentials exist to stop. The admin is refused EARLIER
than the kind check, with the 403, never with the 409.*

No ambiguity: both claims resolve to fact from the code; nothing here depends on intent.
No stop-and-report was owed.

## 2. Fixes (7 files — each with file:line)

| file:line | Filing | Change |
|---|---|---|
| `src/main/java/ee/sheltermap/api/AdminUserDto.java:17-22` | F1 | Class-level `@Schema`: `(GUEST \| REGISTERED \| ADMIN)` → `(REGISTERED \| ADMIN)` and `suspendable (409)` → `suspendable (403)`. The class javadoc above it (already fixed by UNREAD-BACKEND) and the annotation now agree. |
| `src/main/java/ee/sheltermap/api/AdminUserDto.java:31` | F1 | `kind` field `@Schema`: `not suspendable (409)` → `not suspendable (403)`. (The field's value-space wording `REGISTERED \| ADMIN` was already correct.) |
| `src/main/java/ee/sheltermap/api/ApiErrorHandler.java:255-257` | F2 | 409-family javadoc entry: "an account kind that cannot be suspended (the ADMIN lockout vector; GUEST has no credentials)" → "a GUEST account (no credentials exist to stop); the provisioned ADMIN is refused earlier with the 403 {@link ProvisionedAdminProtectedException}" — the stale ADMIN attribution dropped, matching the exception's own (already-fixed) javadoc. |
| `src/test/java/ee/sheltermap/auth/PasswordResetServiceTest.java:64` | F3 | `// Send-first-then-commit (reviews F2): …` → `// Send-first-then-commit: …` — the dangling citation dropped, the self-contained mechanism wording kept (the main-tree precedent, `Transactions.java`, fixed the same way). |
| `src/test/java/ee/sheltermap/auth/ContactChangeServiceTest.java:133` | F3 | `// Send-first-then-commit (reviews F2/F5): …` → `// Send-first-then-commit: …`. |
| `src/main/java/ee/sheltermap/auth/ContactChangeService.java:114` | **not filed — found in this lane** | `change — send-first-then-commit (reviews F2/F5): the send happens` → `change — send-first-then-commit: the send happens` — a THIRD instance of the same dangling citation, in MAIN source, in the same package, cited by no lane (UNREAD-BACKEND's 100-file scope did not include this service; the test files are, per that report, the copy-paste SOURCE, and this is the other copy). Same one-line shape, fixed the same way. Flagged here for the parent's awareness beyond the filed F3. |
| `frontend/src/app/features/admin/media-panel.ts:100,103-104` | UNREAD-FRONTEND §5.1 | `const input = event.target as HTMLInputElement` → `const fileInput = …` (+ the two in-method uses). Javadoc `:97-98` reworded "the input value resets FIRST" → "the file input's value resets FIRST" so the comment tracks the identifier. |
| `docs/api/openapi.json:344,355` | F1 (regenerated) | Not hand-edited — regenerated with the sanctioned command (§3). |

**Citation-dangling verification (why the parentheticals were dropped, not corrected):**
`reviews/04-backend-security.md:142` F2 = "HSTS is never sent" (not the mechanism); its
`213` F5 = "the verification throttle's atomicity" (not the mechanism); the mechanism is
run-1 F5 — `reviews/run1-2026-09-21/04-backend-security.md:177` "contact-change codes are
persisted BEFORE the send" — and `reviews/04-backend-security.md:73` (C5) documents the fix
as "run-1 F5". A bare "F2/F5" resolves to nothing unique in the reviews tree (five documents
each carry an F5), so the citation is dangling in the same class the sibling lane dropped in
`Transactions.java`. Dropping it (mechanism wording is self-contained) matches the precedent.

**Line deltas:** every edit is line-count-neutral (7 files, all insertions == deletions) —
net 0 everywhere.

## 3. Task 3 — the snapshot regeneration and its diff

Command (rule 7, under the lock, detached, exit file):
`flock /tmp/openshelter-mvn.lock mvn -q -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`
→ **exit 0** (`/tmp/dc/snapshot.exit`, log `/tmp/dc/snapshot.log`).

`git diff --stat docs/api/openapi.json` → **`1 file changed, 2 insertions(+), 2 deletions(-)`**:

- `:344` (the `AdminUserDto` schema description): `…kind is the machine value
  (GUEST | REGISTERED | ADMIN); … visible but not suspendable (409).` → `…kind is the
  machine value (REGISTERED | ADMIN); … visible but not suspendable (403).`
- `:355` (the `kind` property description): `…an ADMIN row is not suspendable (409).` →
  `…an ADMIN row is not suspendable (403).`

Nothing else in the 344-line-relevant region or the file changed — the regenerated snapshot
moves **exactly** the two corrected descriptions and no other byte. A repo-wide grep for the
stale strings (`GUEST | REGISTERED | ADMIN`, `suspendable (409)`) after the regen returns
**zero hits** in `src/`, `docs/`, `frontend/src/`.

## 4. Task 5 — the frontend shadow: confirmation and the rename

**Shadowing is real:** `media-panel.ts:1` imports `input` (the Angular signal factory) from
`@angular/core`; `onFileChange` declared `const input = event.target as HTMLInputElement` —
a method-local that shadowed the import for the method body, while the import is called 8
times at class scope (`rows`, `loadError`, `busy`, `page`, `pages`, `size`, `outOfRange`,
`deleteInUse`). Post-rename, `input` as an identifier appears ONLY at `:1` (import) and
`:44-63` (the class-scope signal declarations) — the shadow is gone and the import's uses
are untouched.

**Rename is safe (template check, done before editing):** `media-panel.html:6-11` binds the
file input as `<input id="media-upload-file" … (change)="onFileChange($event)"
[disabled]="busy()">` — the only bindings on that element are the `change` handler (bound by
METHOD NAME) and `busy()`. No template expression references an identifier `input` anywhere
in the template, and a method-local cannot be template-bound at all (templates see class
members only; the class has no member named `input`). Nothing else in the file, the spec,
or the tree refers to the local. Renamed to `fileInput` — the one permitted identifier
change in this lane. No stop-and-report was owed.

## 5. Task 2's already-fixed halves (verified, not re-touched)

- `AdminUserDto.java:8-12` (class javadoc) and `app/NonSuspendableUserException.java:3-9`:
  UNREAD-BACKEND fixed both on this tree (committed in `c0f969f`). I re-verified both against
  the evidence chain in §1 — accurate as written; left byte-identical.
- `AppInfo.java`, `Transactions.java`, `ShelterMapApplication.java` (the lane's other three
  fixes) were out of my scope and untouched.

## 6. Gates (detached, exit files — both at the exact baselines)

- **Backend** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  → **exit 0** (`/tmp/dc/backend-gate.exit`; log `/tmp/dc/backend-gate.log`):
  **Tests run: 1370, Failures: 0, Errors: 0, Skipped: 0** (baseline 1370 — exact),
  BUILD SUCCESS. Named guards in the run: `DocumentationFactsTest` 21/21 (no anchor rot),
  `SourceVocabularyTest` 5/5 (no refused id or name introduced), PMD ran clean,
  "All coverage checks have been met" (the 0.93 floor).
- **Frontend** `cd frontend && npx ng test --watch=false` → **exit 0**
  (`/tmp/dc/frontend-gate.exit`; log `/tmp/dc/frontend-gate.log`): **1590 passed (1590)**,
  66 test files (baseline 1590 — exact). `OpenApiSnapshotIT` (which pins the snapshot)
  passed in the backend gate, so the regenerated snapshot and the live `/v3/api-docs` agree.

The two gates ran in parallel (disjoint toolchains: Maven+JVM vs Node+vitest); both exit
files were read before this report. If the parent wants zero-attribution doubt either can be
re-run solo — nothing in either toolchain was shared.

## 7. Anchors (rule 6)

A grep of `docs/agent/00-CURRENT-STATE.md` for every touched file (`AdminUserDto`,
`ApiErrorHandler`, `ContactChangeService`, `PasswordResetServiceTest`,
`ContactChangeServiceTest`, `media-panel`, `openapi.json`) finds **zero citations** — and
every edit is line-count-neutral anyway. **No anchor shift is owed; the document is not
touched.**

## 8. Not changed / observations (for the parent)

1. **`src/main/java/ee/sheltermap/app/ShelterService.java:40`** — "Write-path transaction
   boundary (reviews F1): …". A DIFFERENT citation class from F3 (F1, not F2/F5) and it is
   **resolvable**: `reviews/run1-2026-09-21/01-architecture.md:99` F1 = "the core shelter
   write path runs without a transaction boundary". Left untouched — outside this task's
   filings and the citation is not dangling.
2. **`ContactChangeService.java:114` was fixed** (see §2) although it was not among the
   filed F3 instances — it is the identical `(reviews F2/F5)` string in main source. If the
   parent prefers lane discipline over class closure, that one line is trivially reversible;
   I judge leaving a verified-dangling citation in place against this lane's purpose.
3. No behaviour change anywhere: the diff is annotation/comment text + one method-local
   rename. No user-visible string, no i18n value, no migration, no test assertion.
4. The `@Schema` strings are the **published OpenAPI contract** — correcting them is a
   contract-documentation change, not a UI copy change; the regenerated snapshot is the
   single source of the truth for what is published, and it now matches the code.
5. `ShelterService.java:3-4` importing `api.SubmitterVerification` (UNREAD-BACKEND's F4
   observation) — unchanged, still an owner item.
6. Tree state at start: clean (siblings' work committed in `c0f969f`); at report time the
   only uncommitted diff is this lane's 7 files.

**Files for the parent's commit:** the 7 modified files above + this report.
