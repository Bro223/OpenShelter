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

- `shelter_id BIGINT NULL` with **NO FK** — a hard delete must leave the
  delete's own DELETED row findable by the shelter id (the spec scenario:
  a deleted shelter's history still serves, 404 only when the shelter is
  absent AND no history exists). A referential action cannot serve that:
  `ON DELETE SET NULL` (the first draft of this bullet) would orphan the
  row from its shelter exactly when it is most needed, and `NO ACTION`
  would block the delete — so the id dangles legally, the V11
  `moderation_actions` convention ("shelter_id deliberately has NO FK").
  The app only ever writes it for an existing shelter in the same
  transaction. Every row snapshots `shelter_name` at event time (renames
  don't rewrite history),
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

1. **suspend user** — V17, three doors, Users tab. (done, 3042674)
2. **edit-history viewer** — V18, `shelter_history`, Shelters-tab
   dialog. (done, c7e9748)
3. **request-info** — V19 `shelter_info_requests`, submitter reply
   on the contribution surface. (done — D6)
4. **mark inaccurate** — V20 `shelters.inaccurate_marked_*`, public
   `inaccurate` flag + single-sourced warning. (next pass target)

"Delete abusive content" is already shipped (admin-moderation hard
delete + two-tap confirm) and is NOT re-done — the M10 spec delta
marks it satisfied-by-existing.

## D6 — Request-info: one exchange per shelter, kept after the reply

`shelter_info_requests` (V19) holds the moderator→submitter
information request: the admin asks on a USER row, the submitter sees
it on their own row and answers ONCE.

- **One exchange per shelter** — `UNIQUE (shelter_id)`. The submitter's
  answer is one-time (`replied_at` set once, a second reply → 409), and
  the row is KEPT after the reply (audit posture — never deleted), so a
  second request for the same shelter is a 409 too (replied or not).
  The spec delta's "answer ONCE" is the contract; re-asking would
  require deleting the audit row, which the posture forbids.
- **`shelter_id` is referential (ON DELETE CASCADE)** — unlike
  `shelter_history` (V18, dangling by design), a deleted shelter has
  no surface left to render the exchange on, so the row goes with the
  shelter (the V1 child-table convention). The FK is also what makes
  the admin write's 404-vs-409 ordering clean (unknown shelter 404
  before the source guard 409).
- **`requested_by` / `replied_by` are ON DELETE SET NULL** (the V14
  moderation_actions convention) — an account erasure must not erase
  the exchange; dangling ids render "Unknown" at read time.
- **Visibility**: the exchange is private between the admin and the
  author. `ShelterDto.infoRequest` is set on the `/mine` projection
  ONLY (null on the public list + detail reads); `AdminShelterDto.
  infoRequest` (with the requester's name) rides on the admin list —
  no dedicated read endpoint (the list already batch-projects every
  row; a new endpoint would be a second SQL surface for one field).
  Both are fetched in the shared batched projection, and ONLY for the
  two projections that need them (public reads never touch the table).
- **Guard vocabulary**: request — 404 unknown shelter, 409 registry
  row (import-owned, the existing admin-write guard), 409 duplicate,
  400 blank message (@NotBlank, the request-record vocabulary). Reply
  — 404/403 (author-only, the exact PUT/DELETE vocabulary via
  `requireOwnedShelter`), 404 no request on the row, 409 answered.
- **Deliberately NOT audited** (the spec delta requires no audit row
  for it): the request row itself is the record. The moderation trail
  stays reserved for moderation decisions. No e-mail/notify either
  (M4's public-inbox leftover — owner-owed): the /mine badge is the
  submitter's only signal.
- The reply write's find + stamp is ONE transaction (the seam's
  `@Transactional` — the admin write joins the service's, the reply
  opens its own from the controller).

## Risks / notes

- The JWT filter lookup is the only new per-request cost; it is one
  primary-key read and matches the existing fresh-lookup convention.
- `users.suspended_at` is a single timestamp (no end date): an
  indefinite suspension the admin lifts manually. An automatic
  expiry would be policy the owner has not set — left out.
- No notification to a suspended account (M4's public-inbox leftover
  applies): the 403 message is the only signal until an inbox exists.
