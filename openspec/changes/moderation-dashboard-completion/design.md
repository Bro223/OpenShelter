# Design: moderation dashboard completion (M10)

## D1 — Suspension state lives on the domain, enforced at the three doors

`User.suspendedAt` (Instant, null = active) is a first-class account
attribute: `UserEntity.suspended_at` (V17), mapped both ways by
`UserMapper`, exposed as `isSuspended()` + `suspend(Instant)` /
`unsuspend()` on the `User` base. The admin suspend writes the domain
object through the existing `UserRepository.save` — no second
persistence path.

Enforcement is at every credential door, each with a FRESH lookup
(the admin-moderation D2 idiom — never a JWT claim, so the effect is
immediate):

| Door | Check | Answer |
| --- | --- | --- |
| `AuthService.login` | after password verify + existence guard | 403 `SuspendedAccountException` |
| `JwtTokenService.refresh` | after the refresh-token claim, on the loaded user | 403 `SuspendedAccountException` |
| `JwtAuthenticationFilter` | `UserRepository.findById` after `validateAccessToken` | unauthenticated → 401 |

The login check is deliberately AFTER the Argon2 verify: refusing a
suspended account BEFORE the verify would let an unauthenticated
caller distinguish "suspended" from "wrong password" (an
account-state oracle). A suspended user's in-flight access tokens die
on the next request (the filter), their refresh rotation is refused
(so no silent renewal), and their login gets the plain 403.

The `JwtAuthenticationFilter` gains the `UserRepository` dependency
(wired in `SecurityConfig` where the filter is constructed — it is
not a `@Component`). One extra indexed `users` read per
token-bearing request: the cost is the same order as the per-request
fresh kind lookup `/admin/*` already pays, and the table is small.

## D2 — Suspension stops the account, not the content

A suspended user's shelters remain exactly as they are (visible,
reportable, admin-moderable). Deletion of content stays the
explicit `DELETE /admin/shelters/{id}`. This keeps the two moderation
axes independent (account abuse vs. content abuse) and matches the
auto-trust posture: the map is not rewritten as a side effect of an
account decision. The submitter-scoped routes (`/api/shelters/mine`,
PUT, DELETE, reports) all sit behind the JWT filter, so a suspended
user cannot manage their rows while suspended — their rows are
inert until the suspension lifts.

Suspend/unsuspend are idempotent like every other admin moderation
action: re-acting on an already-suspended (already-active) user is a
no-op that records NO audit row. Only `kind = REGISTERED` rows can be
suspended — ADMIN (lockout of the provisioned account) and GUEST (no
credentials exist) answer 409 with a plain-spoken message; unknown id
answers 404.

## D3 — User-scoped rows join the ONE audit trail

`moderation_actions` is the single moderation trail; user-scope
actions reuse it instead of a second table:

- `shelter_id` drops NOT NULL (user actions have no shelter),
- new `subject_user_id BIGINT NULL` names the target account (NO FK —
  an account erasure must not erase the audit; a dangling id renders
  "Deleted account" at read time, same convention as the dangling
  `shelter_id`),
- new actions `USER_SUSPEND` / `USER_UNSUSPEND` (moderator_id = the
  acting admin, reason = the stored reason or NULL).

The `Row` record gains `subjectUserId`; `record(...)` takes
`Long shelterId` (was `long`) + `Long subjectUserId` — the eight
existing call sites pass `Long.valueOf(id)` / null. The audit
projection resolves BOTH the shelter name and the subject user in
batched lookups and puts the display text in the existing
`shelterName` slot: a shelter row renders the shelter name (or
"Deleted shelter"), a user row renders "Account: name (email)" (or
"Deleted account"). The DTO shape is unchanged; the FE renames the
column header "Shelter" → "Subject" and gains the two audit labels.

## D4 — History: append-only, snapshot-named, transaction-joined

`shelter_history` (V18) is written in the SAME transaction as the
lifecycle event (the moderation-audit idiom — a rolled-back edit
leaves no row):

- `shelter_id BIGINT NULL REFERENCES shelters(id) ON DELETE SET NULL`
  — a hard delete nulls the reference on the row it just appended, so
  the history of a deleted shelter survives and stays findable by the
  (now dangling) id; every row snapshots `shelter_name` at event time
  (renames don't rewrite history),
- `actor_user_id BIGINT NULL` with NO FK — user erasure orphans the
  actor (renders "Unknown", the existing projection convention),
- `changes TEXT NULL` — compact JSON `{"field": [old, new], ...}` over
  exactly the fields that MOVED on a PUT (name, description, capacity,
  latitude, longitude, locationKind); a PUT that changes nothing
  records no row (no edit-spam history); CREATED/DELETED rows carry
  NULL.

Recording points (all inside `ShelterService`, the single choke
point): `addPlace` (CREATED, actor = submitter), `updatePlace`
(EDITED — reads the old row first; this also tightens the
concurrent-delete race: an absent row is a plain 404 before any
diff), `deletePlace(shelterId, actorUserId)` (DELETED — the two call
sites pass the actor: the submitter in `ShelterController.delete`,
the moderator in `AdminModerationService.deleteShelter`). Registry
import rows are written through `ShelterImportService` (not
`ShelterService.addPlace`), so import runs do NOT create history rows
in this slice — the import already keeps its own `data_imports`
audit; documenting the seam keeps the history = human-edited
posture. (The FE button therefore only promises a history for USER
rows; registry rows answer an empty list.)

`GET /admin/shelters/{id}/history` (admin, ascending): resolves actor
names in ONE batched user lookup and parses `changes` into
`{field, from, to}` tuples server-side (the FE renders, never
parses). 404 only when the shelter is absent AND no history rows
exist — a deleted shelter with history still serves it.

## D5 — Slice order and carry-over

Slices commit green, one gate pair each, milestone id M10:

1. **suspend user** (this pass target) — V17, three doors, Users tab.
2. **edit-history viewer** — V18, `shelter_history`, Shelters-tab
   dialog.
3. **request-info** — V19 `shelter_info_requests`, submitter reply
   on the contribution surface.
4. **mark inaccurate** — V20 `shelters.inaccurate_marked_*`, public
   `inaccurate` flag + single-sourced warning.

"Delete abusive content" is already shipped (admin-moderation hard
delete + two-tap confirm) and is NOT re-done — the M10 spec delta
marks it satisfied-by-existing.

## Risks / notes

- The JWT filter lookup is the only new per-request cost; it is one
  primary-key read and matches the existing fresh-lookup convention.
- `users.suspended_at` is a single timestamp (no end date): an
  indefinite suspension the admin lifts manually. An automatic
  expiry would be policy the owner has not set — left out.
- No notification to a suspended account (M4's public-inbox leftover
  applies): the 403 message is the only signal until an inbox exists.
