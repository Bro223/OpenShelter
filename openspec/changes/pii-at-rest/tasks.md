# Tasks: pii-at-rest

## Phase 1 — Crypto core + migration

- [x] `PiiCrypto` (new `ee.sheltermap.security` package): AES-256-GCM
      encrypt/decrypt with `v1:` Base64URL(nonce‖ct+tag) envelope,
      HMAC-SHA256 blind index (domain-separated `users.email`/`users.phone`),
      `isEncrypted` guard, tamper detection
- [x] `PiiKeys`: load `app.pii.aes-key` / `app.pii.hmac-key`
      (env `PII_AES_KEY` / `PII_HMAC_KEY`), validate 32-byte base64,
      fail closed at boot with a clear message
- [x] V13 Flyway Java migration (bean-injected `PiiCrypto`): widen the
      five PII text columns to VARCHAR(1024), add `users.email_hash` /
      `phone_hash` VARCHAR(64), convert all rows in place (idempotent
      `v1:` guard), replace `uq_users_email_ci` / `uq_users_phone` with
      unique indexes on the hashes
- [x] `application.yml` + test mirror: `app.pii.aes-key` /
      `app.pii.hmac-key` placeholders (no defaults)
- [x] `PiiCryptoTest`: round-trip, nonce uniqueness, deterministic +
      domain-separated blind index, tamper detection, key validation

## Phase 2 — Persistence boundary

- [x] `UserEntity`: `emailHash` / `phoneHash` columns; email/phone
      length 1024
- [x] `UserMapper`: encrypt on `toEntity`, decrypt on `toDomain`
      (users + claim `external_ref`), takes `PiiCrypto`
- [x] `SpringDataUserRepository`: `findByEmailHash` / `findByPhoneHash`
      replace the plaintext finders
- [x] `JpaUserRepository`: lookups via blind index (e-mail
      lower-cased at the boundary, phone as canonical E.164),
      `PiiCrypto` injected
- [x] `JpaPendingVerificationRepository` + entity: `contact` stored
      encrypted, decrypted on load
- [x] `JpaPendingContactChangeRepository` + entity: `target` stored
      encrypted, decrypted on load
- [x] `VerificationClaimEntity` / `PendingVerificationEntity` /
      `PendingContactChangeEntity`: column lengths 1024
- [x] IT keys: `AbstractPersistenceIT` `@DynamicPropertySource` supplies
      fixed test keys to every IT context
- [x] ITs with direct plaintext `users` queries switch to hash lookups
      (AdminSeederIT, AdminModerationIT, CommunityReviewIT)

## Phase 3 — Verification

- [x] `PiiAtRestIT`: register → ciphertext + hash at rest, login by
      e-mail (case-insensitive) + phone, duplicate 409, `/account/me`
      returns plaintext; V13 conversion test (plaintext rows seeded
      pre-migration on a fresh database ⇒ converted + unique-indexed)
- [x] Full `mvn -q test` green (existing auth/account/verification ITs
      are the transparent-boundary regression suite)
- [x] `npx ng test` green (frontend untouched — tree health check)

## Phase 4 — Docs + close-out

- [x] README: env table gains `PII_AES_KEY` / `PII_HMAC_KEY` (+
      generation command); PII-at-rest section: what is encrypted where,
      key management + rotation procedure (D6), lost-key consequence
- [x] BE context docs: users-table + auth-storage descriptions synced
- [x] Tick this file, commit `M2: PII at rest`
