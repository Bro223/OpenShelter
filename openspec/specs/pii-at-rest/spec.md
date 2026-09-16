# pii-at-rest Specification

## Purpose
TBD - created by archiving change pii-at-rest. Update Purpose after archive.

## Requirements

### Requirement: Identity contacts are encrypted at rest

The backend SHALL store user e-mail and phone numbers only as
version-tagged AES-GCM ciphertext (`v1:` envelope, key from the
`PII_AES_KEY` environment variable) in `users.email` / `users.phone`,
and SHALL store ciphertext copies in every other column that persists a
contact value (`verification_claims.external_ref`,
`pending_verifications.contact`, `pending_contact_changes.target`).
No e-mail or phone plaintext SHALL be written to any database column
after the V13 migration. Password storage is unaffected (Argon2id).

#### Scenario: New registration

- **WHEN** a user registers with an e-mail and phone
- **THEN** the persisted `users` row contains ciphertext (not plaintext)
  in `email` and `phone` and the matching blind-index values in
  `email_hash` and `phone_hash`

#### Scenario: Database dump

- **WHEN** an attacker obtains a full database dump but not the
  encryption key
- **THEN** no e-mail or phone value in any table is readable, and the
  hash columns do not reveal the contact values

#### Scenario: Missing key

- **WHEN** the application starts without `PII_AES_KEY` / `PII_HMAC_KEY`
- **THEN** startup fails closed with a clear error and no request is
  served

### Requirement: Blind index preserves uniqueness and lookup

The backend SHALL derive `email_hash` / `phone_hash` as an
HMAC-SHA256 blind index of the canonical contact value (e-mail
lower-cased, phone E.164) under `PII_HMAC_KEY`, and SHALL perform
login, duplicate-registration, and admin-seeder lookups through those
indexes. E-mail resolution SHALL stay case-insensitive, phone
resolution SHALL stay E.164-canonical, and duplicate contacts SHALL
still be rejected with 409 with the unique hash indexes as the
race-safe backstop.

#### Scenario: Login by e-mail in any case

- **WHEN** a user logs in with `User@Example.EE` for an account
  registered as `user@example.ee`
- **THEN** login succeeds via the blind index

#### Scenario: Duplicate registration

- **WHEN** a second account is registered with an e-mail or phone whose
  blind index already exists
- **THEN** the request fails with 409 (pre-check or unique-index
  backstop)

### Requirement: V13 migrates existing rows safely

The V13 migration SHALL convert every pre-existing row in place to
ciphertext + blind index within one Flyway migration, SHALL be
idempotent (rows already carrying the `v1:` prefix are skipped, so a
failed-then-repaired rerun is safe), and SHALL replace the plaintext
unique indexes with unique indexes on the hash columns. Fresh
databases (no pre-existing rows) SHALL migrate with no data change.

#### Scenario: Conversion of an existing deployment

- **WHEN** V13 runs against a database containing plaintext users,
  verification claims, and pending verification / contact-change rows
- **THEN** every row holds ciphertext + (where applicable) its blind
  index, the old plaintext unique indexes are gone, the hash unique
  indexes exist, and the affected users can still log in by e-mail or
  phone

#### Scenario: Fresh database

- **WHEN** V13 runs against a fresh schema with no user rows
- **THEN** the migration completes with the widened columns, the hash
  columns, and the hash unique indexes in place

### Requirement: Key management and rotation are documented

The README and the change design SHALL document: where the keys come
from (env only, never committed), how to generate them, the
backup/offline-storage requirement, the consequence of a lost key
(accounts unloginable by contact), and the rotation procedure
(re-encrypting migration under the next envelope version tag; the HMAC
key rotates in the same atomic pass as the rehash).

#### Scenario: Operator rotates the keys

- **WHEN** the operator follows the documented rotation procedure
- **THEN** all rows are re-encrypted/rehashed under the new keys and
  lookups succeed against the new blind indexes with no plaintext
  window
