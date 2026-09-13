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
  - `reviews` — every review the user wrote, with the shelter id + name
    batch-resolved in one read (same idiom as `/account/reviews/mine`);
    hidden reviews are included (the author always sees their own)
- **FE** — a "Your data" panel on the account page: "Download my data
  (JSON)" fetches the document and hands the browser a client-side Blob
  download named `openshelter-data-export-<YYYY-MM-DD>.json` (the server
  never streams a file).
- **IT** — `AccountDataExportIT`: anonymous 401; authenticated 200 with
  decrypted profile + the user's own shelters/reviews (another user's row
  stays out); user without contributions gets empty lists.

### Slice 2 — account deletion (not started)

- `DELETE /account` (verified-user gate): purges the account's own data —
  USER-source shelters, reviews, verification claims — keeping audit rows
  with dangling ids (the admin-delete convention). Purge-vs-anonymize is
  decided as: purge own data, keep audit rows.

### Slice 3 — privacy policy + terms (not started)

- Static FE pages (no backend) + the "why we collect e-mail/phone" copy
  (verification + account recovery).

### Slice 4 — retention rules + explicit geolocation consent (not started)

- Retention documentation/decisions (owner product call candidates —
  e.g. how long inactive accounts are kept — LOG IT, do not decide).
- Geolocation consent = the user-initiated "Show shelters around you" CTA
  (the browser prompt IS the consent); never IP geolocation.

## Non-goals (this change)

- No CAPTCHA, no IP geolocation, ratings stay (locked decisions).
- No e-mail notification of the export, no export history/audit trail
  (the export is a plain read; a durable export log is not in M4's text).
