# Design: admin-moderation

## D1 — Admin comes from env, not from the registration flow

Two env vars following the repo's existing convention (`DB_URL`,
`SMTP_HOST`, `CORS_ALLOWED_ORIGINS` — bare names, empty defaults):
`ADMIN_EMAIL` and `ADMIN_PASSWORD`. Semantics:

- **Either unset → no admin exists.** No admin user is created,
  `/admin/*` answers 403 for everyone (including a user who happens to
  hold the email string as a normal account — kind is the truth), and
  the app behaves exactly as today. This keeps dev boxes without the
  vars working and prod opt-in.
- **Seeder**: an `ApplicationRunner` at startup. If both vars are set and
  no user with `email = ADMIN_EMAIL` exists → create one: kind `ADMIN`,
  name "Admin", the configured email/phone, all verification claims
  pre-added (`canWrite()` true without the email/SMS flow — the mailbox
  does not exist by design). Password = Argon2 hash of `ADMIN_PASSWORD`,
  same encoder as registration.
- **Create-if-absent only.** If a user with that email already exists,
  the seeder does nothing — it never re-hashes, never flips kind, never
  touches claims. Consequences: an in-app password change by the admin
  survives restarts/deployments; de-provisioning = remove the env vars
  (and delete the row if desired) — the seeder will not resurrect
  credentials for a deleted account on the *same email* only if the row
  was deleted; documented ops note.
- **Login is the normal `/auth/login`** (emailOrPhone + password). No
  special endpoint, no backdoor path, same JWT shape as every other user
  (principal = userId). Audit: the existing login/verification logging
  applies unchanged.

## D2 — Authorization: fresh lookup, no JWT claim

`/admin/*` checks `UserKind.ADMIN` by loading the user for the JWT's
userId on every request (one indexed PK lookup — trivial at this scale).
No role claim in the JWT: a JWT minted before a demotion/deletion would
otherwise carry admin rights until expiry, and the lookup keeps the
"kind is the truth" invariant used everywhere else (the same reason the
app checks `canWrite()` fresh instead of trusting claims). 403 for
authenticated non-admins, 401 for anonymous — the existing vocabulary.

## D3 — API surface and guard rails

| Endpoint | Action | Guard rails |
|---|---|---|
| `GET /admin/shelters?status=&source=&q=` | list all incl. hidden, with `nonexistentReports`, `statusFlag`, occupancy, review counts | q = name/address substring |
| `POST /admin/shelters/{id}/status` body `{status}` | manual hide/restore | USER rows only; registry rows → 409 (import-owned, D4); restore sets the manual-change marker that disarms auto-hide (reports change) |
| `DELETE /admin/shelters/{id}` | hard delete (cascade: reviews, reports, occupancy) | USER rows only; registry rows → 409; 404 unknown |
| `GET /admin/reports?shelterId=` | shelter report queue, newest first, with shelter + reporter name | dismissible rows |
| `POST /admin/reports/{id}/dismiss` | mark shelter report resolved | idempotent (second call → 200 no-op) |
| `GET /admin/review-reports` | review report queue, newest first, incl. hidden reviews with their 5th-report markers | — |
| `POST /admin/reviews/{id}/hide` | immediate hide | idempotent |
| `POST /admin/reviews/{id}/restore` | clear `hidden_at` | idempotent; restores rating/count participation |

All writes are single-row transactions; no bulk endpoints. Reporter
identity in queues is the user's profile name + email (admin-only data;
never exposed outside `/admin/*`).

## D4 — Registry rows stay import-owned

`POST /admin/shelters/{id}/status` and `DELETE /admin/shelters/{id}` on
`source != USER` → 409 with a plain message. Rationale: the registry
import rebuilds its rows as `ACTIVE` on every run (provenance: "the
registry published it, so it exists") — an admin-hidden PAASETEAMET row
would silently resurrect on the next import, so the admin UI offers no
actions for registry rows at all (they render read-only). The lever for
bad registry data is upstream (Päästeamet), not in-app.

## D5 — Admin UI

New feature `features/admin/` (own folder — the no-cross-feature-imports
rule holds), route `/admin` guarded by `isAdmin` from the session store
(non-admin → redirect to `/`). Nav: a single "Admin" item rendered only
when `isAdmin` (no top-nav clutter for regular users). Three tabs, each
a table with 48px action targets on existing tokens:

1. **Shelters** — all rows (user rows actionable: Hide/Activate,
   Delete with confirm dialog; registry rows read-only), columns: name,
   source, status, rating, review count, report count, occupancy,
   submitter. Text search box over name/address.
2. **Shelter reports** — queue rows: shelter (link), type, reporter,
   age, dismiss button; hidden-shelter rows highlighted with the restore
   shortcut.
3. **Review reports** — queue rows: shelter, review excerpt, reason(s),
   reporter(s), hidden badge when hidden; Hide/Restore actions.

`/account/me` DTO + session store gain `isAdmin`; the account page shows
an "Admin" provenance-style badge for the admin (consistency with the
provenance-badge system).
