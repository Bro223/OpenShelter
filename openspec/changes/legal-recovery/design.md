# Design — legal-recovery slice 2: account deletion

## The split erasure rule (owner decision, 2026-09-13)

The blanket "purge own data" reading of the roadmap was ambiguous against
the V7 schema comment ("if account deletion ever lands, shelters are
orphaned, never cascade-deleted — map data outlives accounts"). The owner
chose a SPLIT, not a blanket purge or a blanket orphan:

1. **PURGE** (hard delete) every shelter row where `created_by = user`
   AND `location_kind = 'PRIVATE'`. A declared private home is the
   submitter's personal data; retaining it after an erasure request is
   the single worst privacy outcome in this app.
2. **ORPHAN** the rest — `UPDATE shelters SET created_by = NULL` on the
   user's PUBLIC rows. A public, community-confirmed shelter is
   community/crisis data, not personal data. V7's deliberate
   `created_by ON DELETE SET NULL` is the authority for orphaning public
   rows.
3. **Cascade** the account: every child `user_id` FK is already
   `ON DELETE CASCADE` (credentials, verification claims, pending
   verifications + contact changes, refresh + password-reset tokens,
   reviews, reports, report actions). Deleting the user row does it — no
   re-implemented deletes.
4. **Audit rows keep dangling ids** (the admin-delete convention),
   unchanged.

## Details that would have bitten

- **`moderation_actions.moderator_id` was the one `users` FK WITHOUT a
  cascade** (`NOT NULL REFERENCES users(id)`, i.e. RESTRICT). AUTO_CONFIRM
  rows name the REPORTING user (a regular account, not an admin) as the
  actor of record, so erasing that account would have failed the user-row
  delete. **V14** relaxes it: column nullable + `ON DELETE SET NULL`.
  `ModerationActionEntity.moderatorId` drops `nullable=false`; the admin
  read already renders `moderator == null → "Unknown"` (no new NPE
  surface).
- **Orphaning must not demote trust.** The orphan is a pure
  `created_by = NULL` (+ `review_note` redaction, below) — `review_status`
  is untouched, so a CONFIRMED row stays CONFIRMED with no author, and a
  newly-NULL creator is NOT a signal to re-review.
- **NULL-creator provenance rendering.** `ShelterDto.submitterVerified`
  already computes `author != null && …` and the admin `submitter` field
  already renders `null` for "creators whose account no longer exists"
  (accessibility-and-provenance D3) — so an orphaned row renders as a
  plain community-reported shelter with no submitter label, no NPE, no
  "Unknown user". `AccountDeletionIT` pins it (`submitterVerified: false`
  on the orphaned row, admin `moderatorName` "Unknown" on the dangling
  audit row).
- **Entity-level, not bulk-JPQL, shelter mutation.** The first attempt
  used bulk `@Modifying` JPQL delete/update; a same-transaction
  follow-up read then saw the rows through the (stale) persistence
  context — the private row's `findById` still returned it. The erasure
  loop now deletes/updates per row through the existing `deleteById` /
  `save` seams (managed-entity mutation), so follow-up reads in the same
  transaction are correct. The service reads the user's rows ONCE and
  mutates them in place.
- **PII redaction in the same transaction (the supervisor's catch).** Two
  free-text fields could echo the erased user's contacts and survive:
  - `shelters.review_note` — the admin's REJECT note, shown to the
    submitter in `/mine`. Its only audience is the erased submitter, and
    it can name their home address or contact. Nulled on the orphaned
    public rows in the same statement.
  - `moderation_actions.reason` — the REJECT note mirrored into the audit
    row. `clearReasonByShelterIds(user's shelter ids)` nulls the `reason`
    on the user's shelters' audit rows; the ACTION rows themselves
    survive (audit integrity) with the id dangling.

    Both redactions are best-effort string erasure of free text the admin
    typed about the user's own rows; they are documented here because they
    are a deliberate audit-integrity trade for erasure. Structured PII
    (ciphertext + blind index) is removed outright by the cascade, not
    redacted.
- **Blind index.** The M2 `email_hash`/`phone_hash` are columns on the
  `users` row, so deleting the row removes them — no orphaned blind-index
  entry can later match the erased e-mail/phone. `AccountDeletionIT`
  asserts the `users` row count for both hashes is 0 AND that
  re-registration with the exact same contacts returns 201.
- **Idempotency.** `JwtAuthenticationFilter` validates the JWT and sets
  the user-id principal WITHOUT loading the row, so a still-valid token
  for an erased user still reaches the controller. The controller
  resolves the row; `!(user instanceof RegisteredUser)` → 204 no-op
  (not 404, not 400). This is what makes a double-click / retry safe.
- **The verified-user gate** mirrors the review/submission gates
  (`canWrite()` → `NotVerifiedException` → 403). An account that never
  verified a claim cannot erase itself through this endpoint.

## What is NOT done here (later slices / other milestones)

- Retention periods for dormant accounts — owner product call (slice 4).
- Privacy policy / terms copy (slice 3).
- No e-mail "your account was deleted" notification (non-goal).
