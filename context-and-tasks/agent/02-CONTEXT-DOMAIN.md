# Context — Domain Core

**Source diagram:** `../01-user-verification.puml` (package `domain`)
**Used by steps:** 1 (create), 3 (persist). Referenced by: verification, auth, ingestion, api.

## Purpose

The domain is the stable core of the system — **it depends on nothing** and every other package
depends on it. It answers "what is this app about": users, verification claims, shelters, reports, provenance.

## Classes to create (all in `ee.sheltermap.domain`)

| Type | Kind | Key members / notes |
|---|---|---|
| `User` | abstract class | `id: Long`; `getData(): UserData`, `canWrite(): boolean`, `deleteAccount(): void`. Common to ALL user kinds. (`canWatch()` was removed in the review-fix pass — the map is public via the `VIEW_MAP` baseline, not a method.) |
| `GuestUser` | class | Anonymous viewer, never persisted. `canWrite()` = `false`, `deleteAccount()` = no-op. |
| `RegisteredUser` | class | `name, email, phone: String`, `verifications: Set<VerificationClaim>`; ctor `(name, email, phone)` (no national ID code — remove-national-id M1); `levels(): Set<VerificationLevel>` (derived from claims — only non-revoked), `canWrite()` delegates to `VerificationPolicy`, `deleteAccount()` cascades. |
| `UserData` | record | `name, email, phone, levels: Set<VerificationLevel>` — immutable snapshot, never live fields. |
| `AdminUser` | class | The third fixed kind (admin-moderation D1 — revived from the review-fix pass, where it was dead code): `extends RegisteredUser`; persistence ctor `(name, email, phone)` (the stored claims are restored by `UserMapper`, NOT pre-set — a reload reflects the stored claim state). `provisioned(name, email)` is the `AdminSeeder` factory ONLY: `phone = null` (no phone route — null is outside the partial unique index, so it can never collide or be a login contact), no national ID code stored (M1 — the pre-set SMART_ID claim carries the e-mail as its external ref), and EVERY verification claim pre-set (`EMAIL`, `PHONE`, `SMART_ID` — the mailbox does not exist by design, so `canWrite()` is true from the first request). The row's `kind = ADMIN` column is the authorization truth (fresh lookup per `/admin/*` request — D2); the class itself grants nothing. |
| `VerificationLevel` | enum | `EMAIL, PHONE, SMART_ID`. |
| `VerificationClaim` | class | `id, level, provider: String, externalRef: String, verifiedAt: Instant, revokedAt: Instant` (nullable until revoked). |
| `VerificationPolicy` | class | holds `rules: VerificationRules`; `allows(levels: Set<VerificationLevel>, capability: Capability): boolean`. |
| `VerificationRules` | record | `baseline: Set<Capability>`, `byLevel: Map<VerificationLevel, Set<Capability>>`, `ofDefaults(): VerificationRules`. |
| `Capability` | enum | `VIEW_MAP, SUBMIT_SHELTER` (`PUBLISH_INSTANTLY` removed in the review-fix pass). |
| `Shelter` | class | `id, name, status: ShelterStatus, location: GeoPoint, externalId: String, source: ShelterSource, address, county, municipality, dataAsOf, sourceAttribution, description: String, capacity: Integer`. User submissions: `externalId = null`, `source = USER`. Registry rows carry the FULL published record; `description`/`capacity` are USER-submission details (stored since V3 — previously validated then silently dropped). **`createdBy: Long` (M8, V7)** — the author of a USER submission (set by `ShelterService.addPlace` to the submitting user's id); `null` for registry rows and pre-V7 legacy USER rows, which are unmanageable by anyone. **`autoHideDisarmed: boolean` (V9, default `false`)** — the auto-hide disarm flag: an `ACTIVE` shelter whose flag is still `false` can be auto-hidden by the 5th `NON_EXISTENT` report; the admin restore (`POST /admin/shelters/{id}/status` → `ACTIVE`, admin-moderation D3) sets it `true` so later reports never re-hide. **`reviewStatus: ReviewStatus` (V11, community-review-queue v2, default `NEW`)** — the community trust state: new USER rows are created `NEW` (public IMMEDIATELY — no blocking queue) and reach `CONFIRMED` automatically (an `OPEN_CONFIRMED` report from a user OTHER than the submitter, in the same transaction) or via the rare admin CONFIRM; `REJECTED` (admin REJECT, with a required reason) hides the row by flipping `status = INACTIVE`, and restoring it reverts the review state to `NEW` (it starts over). V11 backfill: USER rows → `NEW` (no confirmation evidence yet), registry rows → `CONFIRMED` (official data — informational, behaviour unchanged). **`reviewNote: String` (≤500, nullable, V11)** — the admin's REJECT reason, shown to the submitter in `GET /api/shelters/mine`. **`locationKind: LocationKind` (V11, default `PUBLIC`)** — the submitter's private-home declaration (the submission-form checkbox); private rows are NOT hidden or demoted — every surface shows the "Private location" badge instead. Getter/setter like `id`/`createdAt`; the rest of the record stays immutable-final. |
| `ShelterStatus` | enum | `ACTIVE, INACTIVE` (`PENDING`/`REJECTED` removed in the review-fix pass). `INACTIVE` is also the auto-hidden state (V9) — a report-triggered soft hide, restorable later by an admin only. |
| `ShelterStatusFlag` | enum | `REPORTED_CLOSED, CONFIRMED_OPEN` (V9) — the CLOSED vs OPEN_CONFIRMED net, a **display-only** flag computed at read time and carried on `ShelterDto` (`null` = no flag); it never changes status or visibility. |
| `ReviewStatus` | enum | `NEW, CONFIRMED, REJECTED` (V11, community-review-queue v2) — the community trust lifecycle WITHOUT a blocking queue: `NEW` = just added (public, amber "Newly added" treatment, unverified warning on detail), `CONFIRMED` = community-checked (a positive report from a non-submitter, audited `AUTO_CONFIRM`, or the admin CONFIRM), `REJECTED` = admin REJECT (hides via `status = INACTIVE`; restore reverts to `NEW`). The owner does not actively moderate — the community report mechanism is the primary promotion path, the admin endpoints are the rare fallback, and every transition is audit-logged. |
| `LocationKind` | enum | `PUBLIC, PRIVATE` (V11, community-review-queue v2) — the submitter's private-home declaration; **display-only** (the "Private location" badge on list/detail/admin) — it never hides, demotes or recolors the row. |
| `ShelterReport` | class | `id, shelterId, userId, type: ShelterReportType, detail: String (≤500, free text for`OTHER`only), createdAt`. **Unique (shelterId, userId, type)** (V9) — the per-target abuse bound; the `type` routes the consequence (auto-hide / display flag / admin queue only). **`dismissedAt: Instant` (nullable, V10, admin-moderation D3)** — the admin dismissal stamp: set ONCE by `POST /admin/reports/{id}/dismiss` (a re-dismiss is a no-op — idempotent); NULL while unresolved. Dismissing never deletes the row — the report stays recorded as resolved (the queue's `dismissed` marker). |
| `ShelterReportType` | enum | `NON_EXISTENT, CLOSED, OPEN_CONFIRMED, WRONG_LOCATION, OTHER` (V9). |
| `ShelterOccupancyReport` | class | `id, shelterId, userId, band: OccupancyBand, updatedAt`. **Unique (shelterId, userId)** (V9) — ONE live report per user per shelter; a re-report updates the row (latest band wins, `updatedAt` refreshed). Display-only: never hides, recolors or filters. |
| `OccupancyBand` | enum | `SPACE, GETTING_FULL, FULL` (V9). |
| `ShelterSource` | enum | `PAASETEAMET, MUNICIPALITY, USER`. |
| `GeoPoint` | record | `lat: double, lng: double`. |

Repository interfaces `UserRepository`, `ShelterRepository` live in the **`app` package** per the
diagram (see `03-CONTEXT-VERIFICATION.md` note / `01` puml package `app`).

## Design decisions (do not silently change)

1. **Verification is data, not inheritance.** A user can become verified *after* creation and
   claims can be revoked — an object never changes class. Hence `Set<VerificationClaim>` on
   `RegisteredUser`, and `levels()` is derived, never stored.
2. **The Bird Rule (TIJ Ch 1).** `User` is abstract = "Bird"; subclasses are kinds fixed at
   creation: `GuestUser` = Pigeon, `RegisteredUser` = Penguin, `AdminUser` = the third kind
   (admin-moderation D1 — the env-provisioned admin; it was removed as dead code in the
   review-fix pass and came back with a real provisioning path, `AdminSeeder` — never the
   registration flow). Subclasses
   override base methods; they never add methods that a `User` reference cannot see (i.e. no
   `getVerifiedLevels()` only on `RegisteredUser` used via casting — derive from the base contract).
3. **Policy = rules as data.** `VerificationRules.ofDefaults()`: `VIEW_MAP` → baseline (no claims;
   guests can watch); `SUBMIT_SHELTER` → `EMAIL | PHONE | SMART_ID`. Answer for `allows()` =
   baseline ∪ (union of `byLevel[l]` for each active level). (`PUBLISH_INSTANTLY` was removed —
   nothing consulted it; user submissions publish instantly by design.)
   Changing "who can write" = changing data, not code.
4. **No moderator.** User shelters are `ACTIVE` immediately; community reports + confirmation
   (the `ReviewStatus` lifecycle on the shelter) govern quality. Do not build moderation logic anywhere.
5. **No PENDING/REJECTED.** v1 has no moderation lifecycle — shelters are `ACTIVE` or
   `INACTIVE` only (`PENDING`/`REJECTED` were removed in the review-fix pass).
6. **The trust layer is community-derived, not a moderator** (shelter-trust-and-reports).
   Reports are data whose consequences are DERIVED at read time in the API projection
   (`nonexistentReports`, the `statusFlag` net, fresh occupancy) — nothing is stored
   except the report rows themselves, plus the deliberate state writes: the
   auto-hide (exactly on the 4→5 `NON_EXISTENT` insert of an `ACTIVE` shelter whose
   `autoHideDisarmed` is `false`), the report's `dismissedAt` stamp (V10 — the admin's
   dismissal, set once),
   and — V11 (community-review-queue v2) — the `review_status` transitions (the
   `OPEN_CONFIRMED` NEW→CONFIRMED promotion in the SAME transaction as the report,
   the admin CONFIRM/REJECT, the restore's REJECTED→NEW) and the append-only
   `moderation_actions` audit row written with each of them (see the contracts
   below). `CLOSED` never touches status; `OPEN_CONFIRMED` now ALSO carries the
   `NEW → CONFIRMED` promotion (it still never touches `status`); occupancy never
   touches anything but the display.
7. **No blocking queue; the audit trail IS the moderation record** (community-review-queue
v2). Community rows publish immediately as `NEW` — nothing waits on a human, and the
admin panel is a rare fallback, not a gate. `app.ModerationAuditLog` (V11) records
every moderation-relevant action (status change, hard delete, report dismiss,
CONFIRM, AUTO_CONFIRM, REJECT) as one row in `moderation_actions`, in
   the SAME transaction as the action (no async, no separate call). `shelter_id` has
   deliberately NO FK: a delete records its audit row in the same transaction, so the id
   dangles after the delete and the read-time name join renders "Deleted shelter".

## Contracts with other contexts

- `app.ShelterService` checks `user.canWrite()` **before** creating a shelter (no moderator, so the
  policy gate is the only gate).
- `ingestion.ShelterImportService` reads/writes shelters with `source = PAASETEAMET/MUNICIPALITY`
  only and never touches `source = USER` rows.
- `app.ModerationAuditLog` (V11, community-review-queue v2): `record(shelterId, actorId,
  action, reason, previousStatus, newStatus)` — append-only, same-transaction; the JPA
  implementation is `persistence.JpaModerationAuditLog` (table `moderation_actions`, V11;
  `shelter_id` FK-free by design — decision 7).

## Testing notes

- Policy matrix test: for each capability, assert allowed/denied for `{}`, `{EMAIL}`, `{PHONE}`,
  `{SMART_ID}`, `{PHONE, EMAIL}`.
- Bird-rule test: `GuestUser.canWrite() == false` (watching = public `VIEW_MAP` baseline);
   `RegisteredUser.canWrite() ==
  true`; `RegisteredUser.levels()` reflects added/revoked claims.
- Trust invariants (V9): report uniqueness per (shelter, user, type);
  the 4→5 auto-hide fires once and not when disarmed or not `ACTIVE`; the `statusFlag` net
  (closed > confirmed → `REPORTED_CLOSED`; both ≥ 1 → `CONFIRMED_OPEN`, tie included;
  otherwise none); occupancy derivation (latest fresh band wins, agreeing count, 2 h window).
- Throttle (V9): `ReportActionLog.record` rejects at the cap WITHOUT recording, and the
  check-and-record is atomic per user (no concurrent pair both reads the pre-increment count).
