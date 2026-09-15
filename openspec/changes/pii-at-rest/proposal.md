# Change: pii-at-rest

## Why

User e-mail and phone numbers are stored in plaintext in several tables
(`users.email`, `users.phone`, `verification_claims.external_ref`,
`pending_verifications.contact`, `pending_contact_changes.target`). A
stolen DB dump or a compromised backup would expose every account's
identity contacts in clear text. The owner-approved roadmap (M2) makes
this PII useless at rest: AES-GCM encryption with an env-provided key,
plus an HMAC blind index so uniqueness and login lookups keep working
without ever storing or scanning plaintext. Passwords are untouched —
they already use Argon2id (kept).

## What Changes

- **V13 migration (Flyway Java migration):**
  - `users` gains `email_hash VARCHAR(64)` + `phone_hash VARCHAR(64)`; the
    PII text columns are widened to `VARCHAR(1024)` (the `v1:` ciphertext
    envelope is longer than the plaintext it replaces).
  - Every existing row is converted IN PLACE inside the migration
    transaction: `email`/`phone` (and the copy columns above) become
    `v1:`-prefixed AES-GCM ciphertext, the hash columns are filled with
    the HMAC blind index. Conversion is idempotent (rows already carrying
    the `v1:` prefix are skipped) so a failed-then-repaired rerun is safe.
  - The old plaintext unique indexes `uq_users_email` / `uq_users_phone`
    are replaced by unique indexes on `email_hash` / `phone_hash`
    (uniqueness + lookup now run on the blind index).
- **Crypto boundary:** new `ee.sheltermap.security` package
  (`PiiCrypto`, key loading/validation). Encryption lives ONLY in the
  persistence layer: `UserMapper` encrypts on save and decrypts on load,
  `JpaUserRepository` looks up by blind index, and the pending-verification /
  pending-contact-change / verification-claim entities store ciphertext.
  The domain, app, auth and API layers keep working with plaintext values
  — no API contract change, no frontend change.
- **Keys:** `PII_AES_KEY` + `PII_HMAC_KEY` (32-byte base64, env vars,
  never committed). Missing/invalid key ⇒ the app fails closed at boot
  (same pattern as `ProdJwtGuard`).
- **Lookups:** login/register/duplicate-check/admin-seeder resolve
  e-mail/phone by HMAC blind index (e-mail canonicalized lower-case,
  phone canonicalized E.164 — both normalizations already exist).
- **Key management + rotation:** documented in the README and
  `design.md` — versioned ciphertext envelope (`v1:`) makes a
  re-encrypting migration possible without downtime of the lookup path.
- **Docs:** README env table + PII-at-rest section; BE context docs
  (users table + auth storage) synced.

## Impact

- Backend: V13 Java migration; new `security` package;
  `UserEntity`/`UserMapper`/`JpaUserRepository`/`SpringDataUserRepository`;
  `JpaPendingVerificationRepository`, `JpaPendingContactChangeRepository`,
  `VerificationClaimEntity`, `PendingVerificationEntity`,
  `PendingContactChangeEntity`; `application.yml` (+ test mirror) gain
  `app.pii.*`; ITs that queried `users` by plaintext e-mail now query by
  hash (AdminSeederIT, AdminModerationIT, CommunityReviewIT); new
  `PiiCryptoTest` + `PiiAtRestIT` (including a V13 plaintext→ciphertext
  conversion test on a seeded DB).
- Frontend: no change (the API returns the same plaintext fields to the
  owner of the data; nothing client-side touches storage).
- Dev environment: `.env` (gitignored) must carry the two new keys; the
  protected dev server picks them up on its next (owner-owed) restart.
