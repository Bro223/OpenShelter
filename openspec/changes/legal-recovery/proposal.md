# Change: legal-recovery

## Why

The owner-approved roadmap (M4) adds the legal/recovery surface: a data
export, account deletion, privacy policy + terms copy, retention rules,
the "why we collect e-mail/phone" explanation and explicit geolocation
consent. These are data-protection duties the app owes users from day one
(we already store e-mail + phone as PII — pii-at-rest M2), and the export
is the mechanical half of every deletion/retention decision.

Delivered in slices; **slice 1 (data export) is this pass** — the smallest
complete, gate-green piece.

## What Changes

### Slice 1 — data export (done)

- **`GET /account/export`** (same auth rule as `GET /account/me` — valid
  JWT, user from the token; a cheap read, no rate bucket): one
  self-describing JSON document with everything tied to the caller:
  - `profile` — name, e-mail, phone (decrypted at the persistence
    boundary — the domain layer carries plaintext) + verified levels
  - `shelters` — EVERY author-scoped row (`ShelterRepository.
    findByCreatedBy`), all statuses incl. auto-hidden/REJECT: the export
    mirrors what the account actually submitted (name, address,
    coordinates, source, status, review status, location kind,
    description, capacity, createdAt)
- **`reviews`/`myReviews` were dropped** with the review model
  (`V21__drop_reviews.sql`): the export now carries profile + shelters only.
- **FE** — a "Your data" panel on the account page: "Download my data
  (JSON)" fetches the document and hands the browser a client-side Blob
  download named `openshelter-data-export-<YYYY-MM-DD>.json` (the server
  never streams a file).
- **IT** — `AccountDataExportIT`: anonymous 401; authenticated 200 with
  decrypted profile + the user's own shelters (another user's row stays
  out); user without contributions gets empty lists.

### Slice 2 — account deletion (split erasure rule — owner decision 2026-09-13)

- `DELETE /account` (verified-user gate, 403 without a claim; a repeat
  call is an idempotent 204 no-op). One transaction:
  1. **PURGE** every shelter row where `created_by = user` AND
     `location_kind = 'PRIVATE'` (hard delete, reports cascade). A
     declared private home is the submitter's personal data and must not
     outlive the erasure request.
  2. **ORPHAN** the rest: `created_by = NULL` on the user's PUBLIC rows
     (map data outlives accounts — the V7 `created_by ON DELETE SET NULL`
     comment is the authority), plus the submitter-facing `review_note`
     redacted. Trust state is untouched: a CONFIRMED row stays CONFIRMED
     with no author; a newly-NULL creator is not a re-review signal.
     Registry rows have no creator and are untouched.
  3. Redact the free-text `moderation_actions.reason` on the user's
     shelters (the note is written to the erased submitter and may echo
     their contacts); the action rows survive — the admin-delete
     convention (dangling ids, "Unknown" moderator).
  4. Erase the user row: the DB cascades credentials, verification
     claims, pending verifications + contact changes, refresh +
     password-reset tokens, reports, report actions
     (every `user_id` FK is `ON DELETE CASCADE`); V14 relaxes
     `moderation_actions.moderator_id` to nullable + `ON DELETE SET NULL`
     (AUTO_CONFIRM rows name the REPORTING user, who may be the erased
     account). The M2 blind-index columns die with the row — the erased
     e-mail/phone can be re-registered.
- The blanket "purge own data" reading is superseded by the split above:
  purge PRIVATE rows, orphan PUBLIC rows.
- **FE** — a "Delete account" panel on the account page: type-to-confirm
  (type DELETE), then the local session ends and the page leaves for the
  map.
- **IT** — `AccountDeletionIT`: anonymous 401; unverified 403; private
  row hard-deleted, public row kept with NULL `created_by` AND unchanged
  review status; claims/tokens/reports gone (re-login 401,
  refresh 401); audit rows retained (surviving moderator kept, erased
  moderator dangling); second DELETE idempotent; export → delete →
  export yields no user data; no blind-index entry remains matchable for
  the erased contact (re-registration with it succeeds).

### Slice 3 — privacy policy + terms (this pass)

- Static FE pages (no backend): `/privacy` + `/terms` (lazy routes,
  titleGuard, public) + the "why we collect e-mail/phone" copy on the
  register form (e-mail: verification code + password resets; phone:
  verification code + later login). Footer links on every page via the
  shell. The copy states the app's ACTUAL behavior (encryption at rest +
  one-way index/hash, client-side nearest, no IP geolocation,
  self-service export/deletion) and does NOT assert a retention schedule
  (owner product call — see slice 4).

### Slice 4 — retention rules + explicit geolocation consent (partial — retention owner-owed)

- Geolocation consent (done): the user-initiated "Show shelters around
  you" CTA stays the only trigger and is now paired with a standing
  consent line (browser asks first; location never sent to the servers —
  the nearest ranking is client-side); never IP geolocation.
- Retention rules (owner product call, logged, not decided): whether to
  run any calendar-based retention / auto-deletion. The privacy policy
  states the current behavior only (life of the account, no auto-deletion
  today).

## Non-goals (this change)

- No CAPTCHA, no IP geolocation, ratings stay (locked decisions).
- No e-mail notification of the export, no export history/audit trail
  (the export is a plain read; a durable export log is not in M4's text).
