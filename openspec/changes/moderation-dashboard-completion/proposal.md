# M10: moderation dashboard completion

## Why

The admin dashboard (admin-moderation, community-review-queue v2, M3
alerts) can hide/restore/review/delete shelters and work the report
queues, but four of the named moderation jobs still have no surface: a
moderator cannot stop an abusive ACCOUNT (only its rows), cannot ask a
submitter for missing details, cannot mark a listing factually
inaccurate without hiding it, and cannot see what was edited after the
fact (nothing is versioned — a PUT silently replaces the five fields).
"Delete abusive content" already exists (hard delete of a USER shelter,
confirm-gated in the UI) and is carried over unchanged.

## What Changes

Slice-delivered, one gate per slice (same pattern as M3/M4):

- **Slice 1 — suspend user.** `users.suspended_at` (V17). Admin
  `GET /admin/users` (registered + admin accounts, batched), `POST
  /admin/users/{id}/suspend` / `unsuspend` (REGISTERED only — admin and
  guest rows answer 409; idempotent like dismiss/hide). Enforcement at
  all three credential doors: login refuses a suspended account AFTER
  the password verify (403 `SuspendedAccountException` — no
  enumeration oracle before the verify), refresh rotation refuses
  (same 403), and the JWT filter's fresh per-request lookup leaves a
  suspended user unauthenticated (401 on every protected route,
  including `/admin/*`). Suspension is AUDITED: `moderation_actions`
  gains a nullable `subject_user_id` (and `shelter_id` becomes
  nullable) so user-scoped rows join the same trail with actions
  `USER_SUSPEND` / `USER_UNSUSPEND`; the audit tab's "Shelter" column
  becomes "Subject" and renders "Account: name (email)" /
  "Deleted account". A suspended account's shelters STAY on the map —
  suspension stops the account, content moderation stays a separate
  row-level decision. FE: a Users tab (before the audit tab, which
  stays last) with a Suspended badge, dimmed rows and two-tap
  Suspend / Unsuspend.
- **Slice 2 — edit-history viewer.** Append-only `shelter_history`
  (V18): `shelter_id` (ON DELETE SET NULL — the log outlives a hard
  delete, name snapshotted per row), `actor_user_id` (no FK — the row
  outlives user erasure, same dangling idiom), `action`
  (CREATED/EDITED/DELETED), `changes` (compact JSON
  `{"field": [old, new]}` — only fields that actually moved; NULL for
  CREATED/DELETED). Recorded in the SAME transaction at
  `ShelterService.addPlace` / `updatePlace` (a no-op PUT with no field
  movement records nothing) / `deletePlace` (both call sites pass the
  actor: the submitter or the moderating admin). `GET
  /admin/shelters/{id}/history` serves a row's history with batched
  actor names and server-parsed field changes — for a DELETED shelter
  too (dangling id + snapshot), 404 only when there is neither. FE: a
  per-row "History" button in the Shelters tab opening an inline event
  list (works for registry rows — read-only view of import runs'
  create events).
- **Slice 3 — request-info.** `POST /admin/shelters/{id}/request-info
  {message}` (USER rows only) stores a moderator→submitter request on
  the shelter; the submitter sees it on their own row (contribution
  surface) and answers once via `POST
  /api/shelters/{id}/info-request/reply {message}`; the admin sees the
  reply in the shelter's request dialog. The request row is kept after
  a reply (audit posture — never deleted).
- **Slice 4 — mark inaccurate.** `shelters.inaccurate_marked_at` +
  `inaccurate_marked_by` (V20). `POST
  /admin/shelters/{id}/mark-inaccurate {reason?}` /
  `POST /admin/shelters/{id}/clear-inaccurate` (USER rows only,
  audited). A marked shelter STAYS visible (no hide, no provenance
  change — the map keeps the entry, the honesty is in the label) but
  carries `inaccurate: true` on the public DTO and renders the
  single-sourced "Reported inaccurate — details may be wrong" warning
  next to the unverified treatment.

## Capabilities

### Modified Capabilities

- `admin-moderation`: user suspension API + Users tab, the shelter
  history endpoint + viewer, the request-info exchange, the
  inaccurate mark, and the audit trail's user-scoped rows.

### Unchanged (carried over, verified, not re-done)

- Delete abusive content: `DELETE /admin/shelters/{id}` (hard delete,
  cascade, registry 409, two-tap confirm in the UI) — already shipped
  in admin-moderation.

## Non-goals

- No suspension of admin or guest accounts (409 — a guest has no
  credentials to stop; an admin suspension is a lockout vector).
- No automatic suspension — every suspension is a manual admin act
  with an audit row (auto-trust posture, locked decision).
- No versioning of admin actions (the moderation audit trail already
  is that history); `shelter_history` covers content lifecycle only.
- No e-mail/notify on request-info or suspension (no public inbox
  exists — owner-owed, M4 leftover).
