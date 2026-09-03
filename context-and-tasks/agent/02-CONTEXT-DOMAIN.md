# Context — Domain Core

**Source diagram:** `docs/uml/01-user-verification.puml` (package `domain`)
**Used by steps:** 1 (create), 3 (persist). Referenced by: verification, auth, ingestion, api.

## Purpose

The domain is the stable core of the system — **it depends on nothing** and every other package
depends on it. It answers "what is this app about": users, verification claims, shelters, reviews.

## Classes to create (all in `ee.sheltermap.domain`)

| Type | Kind | Key members / notes |
|---|---|---|
| `User` | abstract class | `id: Long`; `getData(): UserData`, `canWrite(): boolean`, `deleteAccount(): void`. Common to ALL user kinds. (`canWatch()` was removed in the review-fix pass — the map is public via the `VIEW_MAP` baseline, not a method.) |
| `GuestUser` | class | Anonymous viewer, never persisted. `canWrite()` = `false`, `deleteAccount()` = no-op. |
| `RegisteredUser` | class | `name, email, phone, nationalIdCode: String`, `verifications: Set<VerificationClaim>`; ctor `(name, email, phone, nationalIdCode)`; `levels(): Set<VerificationLevel>` (derived from claims — only non-revoked), `canWrite()` delegates to `VerificationPolicy`, `deleteAccount()` cascades. |
| `UserData` | record | `name, email, phone, nationalIdCode, levels: Set<VerificationLevel>` — immutable snapshot, never live fields. |
| `VerificationLevel` | enum | `EMAIL, PHONE, SMART_ID`. |
| `VerificationClaim` | class | `id, level, provider: String, externalRef: String, verifiedAt: Instant, revokedAt: Instant` (nullable until revoked). |
| `VerificationPolicy` | class | holds `rules: VerificationRules`; `allows(levels: Set<VerificationLevel>, capability: Capability): boolean`. |
| `VerificationRules` | record | `baseline: Set<Capability>`, `byLevel: Map<VerificationLevel, Set<Capability>>`, `ofDefaults(): VerificationRules`. |
| `Capability` | enum | `VIEW_MAP, SUBMIT_SHELTER` (`PUBLISH_INSTANTLY` removed in the review-fix pass). |
| `Shelter` | class | `id, name, status: ShelterStatus, location: GeoPoint, externalId: String, source: ShelterSource, address, county, municipality, dataAsOf, sourceAttribution, description: String, capacity: Integer`. User submissions: `externalId = null`, `source = USER`. Registry rows carry the FULL published record; `description`/`capacity` are USER-submission details (stored since V3 — previously validated then silently dropped). |
| `ShelterStatus` | enum | `ACTIVE, INACTIVE` (`PENDING`/`REJECTED` removed in the review-fix pass). |
| `ShelterSource` | enum | `PAASETEAMET, MUNICIPALITY, USER`. |
| `GeoPoint` | record | `lat: double, lng: double`. |
| `ShelterReview` | class | `id, shelterId, userId, rating: int (1..5), comment: String (≤500), createdAt, updatedAt`. **Unique (shelterId, userId)** — one review per user per shelter. |
| `ShelterReviewRepository` | interface | `save, findById, findByShelterId, findByShelterIdAndUserId, delete, findRatingAggregates(ids): List<RatingAggregate>` (one batched query — no N+1 on listings). |

Repository interfaces `UserRepository`, `ShelterRepository` live in the **`app` package** per the
diagram (see `03-CONTEXT-VERIFICATION.md` note / `01` puml package `app`).

## Design decisions (do not silently change)

1. **Verification is data, not inheritance.** A user can become verified *after* creation and
   claims can be revoked — an object never changes class. Hence `Set<VerificationClaim>` on
   `RegisteredUser`, and `levels()` is derived, never stored.
2. **The Bird Rule (TIJ Ch 1).** `User` is abstract = "Bird"; subclasses are kinds fixed at
   creation: `GuestUser` = Pigeon, `RegisteredUser` = Penguin (the Parrot, `AdminUser`, was
   removed in the review-fix pass). Subclasses
   override base methods; they never add methods that a `User` reference cannot see (i.e. no
   `getVerifiedLevels()` only on `RegisteredUser` used via casting — derive from the base contract).
3. **Policy = rules as data.** `VerificationRules.ofDefaults()`: `VIEW_MAP` → baseline (no claims;
   guests can watch); `SUBMIT_SHELTER` → `EMAIL | PHONE | SMART_ID`. Answer for `allows()` =
   baseline ∪ (union of `byLevel[l]` for each active level). (`PUBLISH_INSTANTLY` was removed —
   nothing consulted it; user submissions publish instantly by design.)
   Changing "who can write" = changing data, not code.
4. **No moderator.** User shelters are `ACTIVE` immediately; community rating (reviews) governs
   quality. Do not build moderation logic anywhere.
5. **No PENDING/REJECTED.** v1 has no moderation lifecycle — shelters are `ACTIVE` or
   `INACTIVE` only (`PENDING`/`REJECTED` were removed in the review-fix pass).

## Contracts with other contexts

- `app.ShelterService` checks `user.canWrite()` **before** creating a shelter (no moderator, so the
  policy gate is the only gate).
- `api.ShelterReviewService` requires a **verified** user (any claim) to review; update/delete are
  author-only (compares `review.userId`).
- `ingestion.ShelterImportService` reads/writes shelters with `source = PAASETEAMET/MUNICIPALITY`
  only and never touches `source = USER` rows.

## Testing notes

- Policy matrix test: for each capability, assert allowed/denied for `{}`, `{EMAIL}`, `{PHONE}`,
  `{SMART_ID}`, `{PHONE, EMAIL}`.
- Bird-rule test: `GuestUser.canWrite() == false` (watching = public `VIEW_MAP` baseline);
   `RegisteredUser.canWrite() ==
  true`; `RegisteredUser.levels()` reflects added/revoked claims.
- Review invariants: rating bounds, comment length, uniqueness constraint surfaces as an error on
  duplicate (shelterId, userId).
