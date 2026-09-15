## Context

- `shelters` table (V1 + V2/V3/V5 additions): `id, name, latitude, longitude, status, source,
  external_id, address, county, municipality, data_as_of, source_attribution, description,
  capacity, created_at`. **No author column.** USER submissions: `source=USER, external_id=NULL`,
  created `ACTIVE`, via `ShelterController.create` → `ShelterService.addPlace(user, shelter)`
  (already receives the user — it just never persisted the link).
- `shelter_reviews`: `shelter_id` (FK `ON DELETE CASCADE`), `user_id` (FK to users), `rating`,
  `comment`, `created_at`, `updated_at`, `UNIQUE (shelter_id, user_id)`. Author-scoped
  `PUT/DELETE /api/shelters/{id}/reviews/mine` already exist (author-only, verified account).
- `ShelterController` (`/api/shelters`): `GET /?source=`, `GET /{id}` (public), `POST` (Bearer +
  `canWrite()` + `GeoPoint.inEstonia` bbox + `CreateShelterRequest` validation: name
  `@NotBlank @Size(max=200)`, lat/lng decimal bounds, description `@Size(max=2000)`, capacity
  `@Min(1) @Max(100_000)`).
- `AccountController` (`/account`, no `/api` prefix): `GET /me`, `PUT /profile`, contact-change
  flows — the account-scoped controller group (M1).
- `ShelterDto` (public lean projection): `{id, name, address, latitude, longitude, status,
  source, averageRating, reviewCount, createdAt, description, capacity}`.
  `ShelterReviewDto`: `{id, authorName, rating, comment, createdAt}`.
- Migrations end at `V6__password_reset_attempts.sql` → next is **V7**.
- Frontend: `AccountPage` = sections (Identity, Contacts, Change email, Change phone) built on
  signals + `change-panel`/`account-card` classes, OnPush, design tokens only.
  `ShelterGateway {list, get, create}`, `ReviewGateway {list, add, updateMine, deleteMine}`,
  `AccountGateway` (M1 profile/verification methods). Routes: `/account` (AuthGuard),
  `/shelters/:id`, `/submit`.
- Docs: `context-and-tasks/05-shelter-api.puml` (endpoint list, lines ~9-18, ~115-117) + rendered
  `out/05-shelter-api.{png,svg}`; `context-and-tasks/agent/06-CONTEXT-API.md`,
  `02-CONTEXT-DOMAIN.md`; frontend `docs/agent/06-CONTEXT-SHELTER.md` (gateway table),
  `frontend/docs/05-shelter-review-flow.puml`. M2 precedent for a STEPS note:
  `context-and-tasks/agent/07-STEPS.md:216` ("password-reset-email-code: …" one-paragraph note).
- Baseline: 236 backend tests / 303 frontend tests green.

## Goals / Non-Goals

**Goals:**

- Author linkage for user submissions (schema + domain + service).
- Author-scoped shelter read/update/delete + cross-shelter "my reviews" listing.
- One account-page panel managing both lists (inline edit, two-step delete, proper states).
- 236/303 baselines stay green; security properties pinned by tests; docs/puml in sync.

**Non-Goals:**

- No account deletion; no admin/moderator tools.
- Registry shelters are never user-editable/deletable (owned by the registry import).
- Pre-V7 legacy USER shelters (author NULL) stay unmanageable — no guessing/backfill of authors.
- No edit-history, soft-delete, or e-mail notifications on changes.
- No map-picker on the edit form (numeric lat/lng with the same client-side bounds the submit
  page uses; the mini-map picker stays a submit-flow feature).

## Decisions

1. **`created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL` + partial-friendly index.**
   Nullable by necessity (registry rows, legacy rows). `ON DELETE SET NULL` (if account deletion
   ever lands, shelters are orphaned, never cascade-deleted — map data outlives accounts). Index
   `idx_shelters_created_by ON shelters(created_by)` for the mine query. `addPlace` sets
   `createdBy = user.getId()` before save (it already has the user). The `Shelter` domain gets
   `Long createdBy` (nullable, with getter/setter like `id`/`createdAt` — the rest of the record
   stays immutable-final).

2. **Endpoint placement follows the controller-group-per-gateway convention:**
   - `GET /api/shelters/mine`, `PUT /api/shelters/{id}`, `DELETE /api/shelters/{id}` on
     `ShelterController` (same group as `list/get/create`) → `ShelterGateway.mine()/update()/
     remove()`.
   - `GET /account/reviews/mine` on `AccountController` (account-scoped, matches M1's
     `/account` group; a cross-shelter list has no per-shelter parent) → `AccountGateway.
     myReviews()`.
   Rationale: keeps "one gateway per backend controller group" intact; the frontend panel calls
   three gateway methods total.

3. **Authorization semantics for PUT/DELETE:** resolve shelter → 404 if absent;
   `shelter.source != USER || shelter.createdBy == null || !createdBy.equals(me)` → 403 (a
   dedicated exception, e.g. `ShelterNotAuthorizableException` → `ApiErrorHandler` 403; reuse an
   existing 403 exception if one fits — check `ApiErrorHandler` first). Rationale: shelter ids
   are public (public GET), so 403-vs-404 leaks nothing; 403 is the honest status for "exists but
   not yours". The bbox + field-bound checks on PUT mirror `CreateShelterRequest` exactly
   (extract a shared validation path or replicate the checks — prefer a small shared helper so
   create/update can't drift).

4. **`UpdateShelterRequest { name, latitude, longitude, description, capacity }`** — same
   constraints as `CreateShelterRequest` (name `@NotBlank @Size(max=200)`; lat `@DecimalMin(-90)
   @DecimalMax(90)`; lng `@DecimalMin(-180) @DecimalMax(180)`; description `@Size(max=2000)`;
   capacity `@Min(1) @Max(100_000)` nullable). Update = field replacement of those five only;
   `status`/`source`/registry fields/`createdAt`/`createdBy` are never writable. Response: the
   updated `ShelterDto` (200).

5. **`MyReviewDto { long shelterId, String shelterName, int rating, String comment, Instant
   createdAt, Instant updatedAt }`** — resolved in one batched query (fetch the user's reviews,
   then their shelters' names in one `IN` query — no N+1, mirroring `getReviews`' batched author
   lookup). A review whose shelter was deleted can't occur (cascade), so `shelterName` is always
   resolvable.

6. **Frontend: one new panel on the account page, not a new route.** The page already composes
   four `change-panel` sections; a fifth "My contributions" panel (shelters list + reviews list)
   keeps the account as the single place for "what's mine". Implementation: a dedicated
   `contributions` feature folder (component + scss + spec) embedded in the account page template
   (keeps `AccountPage` lean); each list is a small repeatable row with actions. Edit = inline
   expanding form in the row (signals, no modal); delete = two-step confirm (button becomes
   "Confirm delete?" — no `window.confirm`, consistent with the app's inline-banner style).
   Shelter edit form fields: name, description, capacity, latitude, longitude (numeric,
   client-side bounds + Estonian-ness not checked client-side — the backend bbox is the gate;
   surface a 400 as the row error). Review edit: rating (reuse `RatingStars` in interactive mode
   if it supports input, else a 1-5 select consistent with the submit form) + comment textarea.
   After a successful mutation: update the in-memory row from the response (no full refetch).
   Design tokens only; OnPush + signals; hand-written fakes for specs.

7. **Docs/puml (repo rule):** `05-shelter-api.puml` gains the three shelter endpoints +
   `/account/reviews/mine` + a `created_by` note in the schema section; re-render via
   `frontend/docs/render.sh` (or the project's plantuml Docker flow used for `context-and-tasks/
   out/` — check how M2 regenerated `03-auth.png/svg` and use the same). `06-CONTEXT-API.md` +
   `02-CONTEXT-DOMAIN.md` (createdBy) updated; frontend `06-CONTEXT-SHELTER.md` gateway table
   gains `mine/update/remove`; `05-shelter-review-flow.puml` only if it depicts review lifecycle
   (add the author-management lane); README feature lines; a short STEPS note in
   `context-and-tasks/agent/07-STEPS.md` following the M2 note shape (line ~216). Report exactly
   what changed.

## Risks / Open Questions

- **Concurrency on update** (two tabs editing): last-write-wins, acceptable at this scale; no
  optimistic-locking version column (would be over-engineering for v1).
- **Legacy USER shelters** remain unmanageable (author NULL). The UI never shows them in "my
  shelters" — acceptable and documented (pre-M3 data can't be attributed).
- **`/account` vs `/api/account`**: the existing group is `/account` (no prefix) — the new
  endpoint follows the existing base exactly; the frontend `AccountGateway` already knows the
  right prefix (M1 precedent).
- **Cascading review delete**: deleting a shelter removes OTHER users' reviews of it too (DB
  cascade, pre-existing behavior for any shelter deletion). The delete confirm copy should say
  "its reviews will be removed as well".
