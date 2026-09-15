## 1. Backend: V7 migration + domain author link

- [x] 1.1 Add `V7__shelter_created_by.sql`: `ALTER TABLE shelters ADD COLUMN created_by BIGINT REFERENCES users (id) ON DELETE SET NULL;` + `CREATE INDEX idx_shelters_created_by ON shelters (created_by);` — match existing migration style; verify it applies cleanly (mvn test / flyway)
- [x] 1.2 `ShelterEntity` gains `createdBy` (nullable column); domain `Shelter` gains `Long createdBy` with getter/setter (like `id`/`createdAt`); `ShelterService.addPlace` sets `createdBy = user.getId()` before save; verify it compiles + existing shelter tests still pass

## 2. Backend: author-scoped shelter endpoints

- [x] 2.1 `UpdateShelterRequest { name, latitude, longitude, description, capacity }` with constraints identical to `CreateShelterRequest`; `ShelterController` gains `PUT /api/shelters/{id}` → resolve shelter (404 if absent) → author check `source == USER && createdBy != null && createdBy == me` (else 403 — check `ApiErrorHandler` for an existing 403 exception, else add one) → bbox re-check (`GeoPoint.inEstonia`, 400) → update the five fields only → return updated `ShelterDto` (200); prefer a small shared validation helper with `POST` so create/update can't drift; verify it compiles
- [x] 2.2 `ShelterController` gains `DELETE /api/shelters/{id}` → 404 if absent, same author check (403), then delete (reviews cascade via DB); 204
- [x] 2.3 `ShelterController` gains `GET /api/shelters/mine` (Bearer required) → the caller's shelters as `ShelterDto[]` (reuse the existing mapping; repository query by `createdBy`); never other users' or registry rows
- [x] 2.4 Unit/IT: `addPlace` records the author; `GET /mine` returns only own shelters (multi-user IT); PUT by author updates fields + bbox violation → 400; PUT by non-author → 403 + unchanged; PUT on registry row → 403; DELETE by author removes shelter + its reviews; DELETE by non-author → 403 + untouched; verify the suite stays green

## 3. Backend: my reviews listing

- [x] 3.1 `MyReviewDto { long shelterId, String shelterName, int rating, String comment, Instant createdAt, Instant updatedAt }`; `AccountController` gains `GET /account/reviews/mine` → the caller's reviews across shelters, shelter names resolved in ONE batched query (no N+1); empty list when none
- [x] 3.2 IT: user with reviews of two shelters sees both with correct shelter names; user with none gets `[]`; another user's reviews never appear; verify it passes

## 4. Frontend: gateways + models

- [x] 4.1 `models.ts`: `UpdateShelterRequest`, `MyReviewDto`; verify it type-checks
- [x] 4.2 `ShelterGateway.mine() / update(id, req) / remove(id)`; `AccountGateway.myReviews()`; update/extend the gateway specs (hand-written fakes) pinning the URLs + bodies; verify the specs pass

## 5. Frontend: contributions panel on the account page

- [x] 5.1 New `features/contributions/` component (embedded in the account page template as a "My contributions" `change-panel`-style section, after the existing panels): loads both lists in parallel; per-list loading/empty/error states (empty shelters: "You haven't submitted any shelters yet" + link to `/submit`; empty reviews: plain copy); design tokens only; OnPush + signals
- [x] 5.2 Shelter rows: name, created date, rating/review count, View (routerLink `/shelters/{id}`), Edit (inline expanding form: name/description/capacity/latitude/longitude with client-side required + bounds mirroring the backend) → `ShelterGateway.update`, Delete (two-step confirm, copy notes that its reviews are removed too) → `ShelterGateway.remove`; success updates the row in place (or removes it); 400/403/404 → row-level or banner error via the existing `bannerMessage`/`error-copy` pattern, row unchanged
- [x] 5.3 Review rows: shelter name (routerLink), stars (read-only `RatingStars`), comment, updated date, Edit (inline rating 1-5 + comment form) → `ReviewGateway.updateMine`, Delete (two-step) → `ReviewGateway.deleteMine`; same error/refresh behavior; verify it type-checks
- [x] 5.4 `account-page.spec.ts` + new contributions spec: both lists render; empty states; shelter edit submit calls the gateway and updates the row; shelter delete requires confirmation then removes the row; review edit/delete likewise; a 403 keeps the row and shows an error; verify the suite stays green (303 + new)

## 6. Docs/puml sync (repo rule — never silently drift)

- [x] 6.1 Update `context-and-tasks/05-shelter-api.puml` (new endpoints in the controller list + a `created_by` note) and re-render its `out/` PNG/SVG the same way M2 regenerated `03-auth.png/svg`; update `06-CONTEXT-API.md` (endpoint table + authorization semantics), `02-CONTEXT-DOMAIN.md` (Shelter.createdBy), frontend `docs/agent/06-CONTEXT-SHELTER.md` (gateway table + the "GET /reviews/mine is a deferred item" note at line ~38 is now BUILT — revise it), `frontend/docs/05-shelter-review-flow.puml` only if it depicts the review lifecycle (then re-render), both READMEs' feature lines, and a short STEPS note in `context-and-tasks/agent/07-STEPS.md` following the M2 note shape (~line 216); report exactly what changed
- [x] 6.2 Update the OpenSpec change task list to checked/complete as work lands

## 7. Milestone acceptance

- [x] 7.1 Run `mvn -q test` (backend) — all green, note count; `cd frontend && npx ng test --watch=false` + both `tsc --noEmit` configs — all green, note count; `npx prettier --check` on every touched file (write only files you touched)
- [x] 7.2 Live check against the running backend :8080 / frontend :5173: as a signed-in user submit a shelter + review a shelter, then open the account page — verify both appear; edit the shelter (name/description) and confirm the change on the detail page; delete the shelter and confirm it + its review disappear; wrong-author and registry-row attempts via the API return 403; report exactly what you verified (screenshots where possible)
