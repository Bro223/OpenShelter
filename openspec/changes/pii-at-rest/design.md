# Design: pii-at-rest

## Context

Plaintext identity contacts live in five columns across four tables:
`users.email`, `users.phone`, `verification_claims.external_ref`,
`pending_verifications.contact`, `pending_contact_changes.target`.
Login (`AuthService.login`) resolves a contact by e-mail (case-insensitive)
or phone (E.164-normalized); registration and the admin seeder pre-check
uniqueness on the same values; V3 hardening added UNIQUE indexes on
`users.email` / `users.phone` as the race-safe duplicate backstop (409).
Everything else — domain model, API DTOs, frontend — already works with
plain values in memory.

## Decisions

- **D1 — In-place encryption, versioned envelope.**
  `users.email` / `users.phone` (and the copy columns) store
  `v1:` + Base64URL(12-byte nonce ‖ AES-GCM ciphertext+tag) instead of
  plaintext. No parallel `*_enc` columns: a second column would keep
  plaintext at rest and violates the milestone. The `v1:` prefix is the
  key-slot/version tag — it makes ciphertexts self-describing (the
  migration's idempotency guard keys on it) and is the hook for
  rotation (see D6). Columns are widened to `VARCHAR(1024)`: a 254-char
  e-mail produces a ~430-char envelope, which the old `VARCHAR(255)`
  cannot hold.
- **D2 — HMAC-SHA256 blind index for uniqueness + lookup.**
  `email_hash` / `phone_hash` (`VARCHAR(64)` hex — VARCHAR like every
  other stored hash in this schema, so `ddl-auto=validate` matches the
  entity) hold
  `HMAC-SHA256(key, "users.email" | "users.phone" || canonicalValue)`.
  Deterministic (same contact ⇒ same hash), keyed (an attacker with the
  DB cannot rainbow-table the hashes), domain-separated (an e-mail and a
  phone with identical byte strings hash differently). Canonical forms
  match the existing normalizations: e-mail lower-cased + trimmed, phone
  E.164. The `uq_users_*` plaintext indexes are replaced by UNIQUE
  indexes on the hashes (partial-unique not needed: guests have NULLs
  and PostgreSQL treats NULLs as distinct).
- **D3 — Crypto boundary = persistence package only.**
  `PiiCrypto` (new `ee.sheltermap.security` package) is consumed ONLY by
  `UserMapper` (encrypt on `toEntity`, decrypt on `toDomain`, including
  claim `external_ref`) and the pending-verification / pending-contact-change
  JPA repositories. `UserRepository` (app seam), the domain hierarchy,
  `AuthService`/`UserService`/`AccountService`/`AdminSeeder` and the API
  keep their plaintext contracts untouched — so the in-memory test fakes
  and every API-level IT stay valid, and the frontend needs zero changes.
  Lookup normalization (lower-case e-mail) moves into
  `JpaUserRepository` so every call site gets case-insensitive
  resolution exactly as `findByEmailIgnoreCase` did.
- **D4 — V13 as a Flyway JAVA migration (bean-injected).**
  One atomic migration does: widen columns → add hash columns → convert
  every un-encrypted row (skip `v1:` rows: idempotent) → drop the old
  unique indexes → create the hash unique indexes. A plain `.sql` file
cannot encrypt with the app's env key, and an app-bootstrapper doing
DDL would fight Flyway + `ddl-auto=validate`. The migration class
implements `JavaMigration` directly (descriptive class name, explicit
`getVersion()` = 13 + `getDescription()` — `BaseJavaMigration` would
reject the non-`V<ver>__<desc>` name at construction) and gets
`PiiCrypto` via constructor (Spring Boot resolves Java-migration bean
dependencies). A failed migration is retried after `flyway repair`
and is safe because of the `v1:` guard (Flyway does not auto-rollback).
  Fresh databases simply convert zero rows.
- **D5 — Keys are env-only and fail closed.**
  `PII_AES_KEY` + `PII_HMAC_KEY`, 32-byte base64, wired through
  `app.pii.aes-key` / `app.pii.hmac-key` in both `application.yml` files
  (main + test mirror). No committed default: `PiiKeys` validates at
  bean creation and the app refuses to boot with a clear message
  (pattern: `ProdJwtGuard`). The IT suite supplies fixed test keys via
  `AbstractPersistenceIT`'s `@DynamicPropertySource`. Local dev keys go
  into the gitignored `.env`.
- **D6 — Rotation (documented procedure, v1 hook only).**
  The envelope's `v1:` tag is the key slot. Rotation of the AES key:
  (1) set the new key under the next slot and run a one-off re-encrypting
  migration that rewrites each row as `v2:` with the new key (old rows
  stay decryptable under the slot tag until rewritten); (2) once every
  row is re-encrypted, drop support for the old slot. Rotation of the
  HMAC key MUST be done in the same migration pass (rehash every row,
  atomically) — a hash lookup fails against a stale hash, so the two
  keys rotate together, never independently. This pass implements the
  single active slot + the tag mechanism; the re-encryption tooling is
  deliberately NOT built until a rotation is actually scheduled
  (no speculative scaffolding).
- **D7 — Scope of "email+phone at rest".**
  All persistent DB copies of the contacts are covered (D1/D2/D3 above),
  including the TTL-bounded `pending_*` rows and the claim `external_ref`
  (which also carries the provisioned admin's e-mail). The durable
  `data/verification-send.log` TSV (anti-spam daily cap) is a
  file-backed dev/ops artifact, not the app's data store; it keeps its
  format in this change and is listed as a residual item for the M15
  security pass. JWTs carry no e-mail/phone claims (verified).

## Risks / trade-offs

- A lost key = unrecoverable PII (accounts unloginable by contact).
  Mitigation: the key-management doc mandates an offline backup of both
  keys; the DB dump itself no longer helps an attacker, so the key is
  the single thing worth protecting — document that trade explicitly.
- `VARCHAR(1024)` widens four columns: negligible at this scale.
- The blind index is keyed HMAC, not a salted hash: two different
  deployments with different keys produce different hash columns —
  expected and desired (no cross-DB correlation).
