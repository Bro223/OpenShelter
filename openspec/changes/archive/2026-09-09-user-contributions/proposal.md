## Why

Users can submit shelters and write reviews, but they cannot see, edit, or delete their own
contributions afterwards — `ShelterEntity` has no author link at all (user submissions are
`source=USER, externalId=NULL` with no reference to the creating account), so "my shelters" is
unanswerable. Reviews DO have an author link (`shelter_reviews.user_id`) and per-shelter
author-only `PUT/DELETE /api/shelters/{id}/reviews/mine`, but there is no cross-shelter list, so a
user can only manage a review by navigating back to the exact shelter page.

This milestone (3 of 3 for the account feature set) closes the loop: a signed-in user can see all
their own shelters and reviews in one place on the account page, and edit or delete any of them.

## What Changes

Backend (Spring Boot):

- `V7__shelter_created_by.sql`: `shelters.created_by BIGINT REFERENCES users(id) ON DELETE SET
  NULL` (nullable — registry rows and pre-V7 legacy USER rows have no author) + index.
- `Shelter` domain + `ShelterEntity` gain `createdBy` (nullable); `ShelterService.addPlace` sets it
  to the submitting user's id.
- New author-scoped endpoints (Bearer JWT required):
  - `GET /api/shelters/mine` → `ShelterDto[]` of the caller's shelters (same lean public DTO).
  - `PUT /api/shelters/{id}` → update the caller's OWN USER-source shelter
    (`UpdateShelterRequest { name, latitude, longitude, description, capacity }` — identical
    validation + Estonia bbox re-check as `POST /api/shelters`) → `ShelterDto`.
  - `DELETE /api/shelters/{id}` → 204; reviews cascade via the existing DB
    `ON DELETE CASCADE`.
  - `GET /account/reviews/mine` → `MyReviewDto[]` — the caller's reviews across all shelters
    (`{ shelterId, shelterName, rating, comment, createdAt, updatedAt }`).
- Authorization: not found → 404; exists but not the caller's shelter (or a registry/legacy row)
  → 403. Shelter ids are public (public GET), so 403-vs-404 leaks nothing.

Frontend (Angular):

- `AccountPage` gains a **My contributions** panel: two lists —
  - **Shelters**: name, created date, rating/review count, "View" (→ `/shelters/{id}`), **Edit**
    (inline form: name/description/capacity + lat/lng with client-side validation) and **Delete**
    (two-step confirm).
  - **Reviews**: shelter name (link), stars, comment, updated date, **Edit** (inline
    rating+comment reusing existing patterns) and **Delete** (two-step confirm).
- Loading/empty/error states per list (empty: "You haven't submitted any shelters yet" + link to
  `/submit`; reviews: empty copy).
- Gateways/models: `ShelterGateway.mine() / update(id, req) / remove(id)`; `AccountGateway.
  myReviews()`; models `UpdateShelterRequest`, `MyReviewDto`.

Docs/puml: `05-shelter-api.puml` (+ rendered out/), `06-CONTEXT-API.md`, `02-CONTEXT-DOMAIN.md`
(Shelter.createdBy), frontend `06-CONTEXT-SHELTER.md` (gateway table), `05-shelter-review-flow.
puml` (if it depicts the review lifecycle), both READMEs, and a short STEPS note following the M2
precedent. Diagrams re-rendered.

## Capabilities

### New Capabilities

- `user-contributions`: a signed-in user can list, edit and delete their own shelters and
  reviews — author linkage at the schema level, author-scoped shelter mutations, and a
  cross-shelter "my reviews" listing, all surfaced in one account-page panel.

### Modified Capabilities

## Impact

- Backend: V7 migration, `Shelter`/`ShelterEntity` (+createdBy), `ShelterService.addPlace`
  (sets author), `ShelterController` (+3 endpoints), new `UpdateShelterRequest` + `MyReviewDto`,
  `AccountController` (+reviews/mine), service-level author checks, unit + IT tests. 236 backend
  tests stay green + new coverage.
- Frontend: `account-page.{ts,html,scss,spec}` (contributions panel), `shelter-gateway.ts` +
  `account-gateway.ts` + `models.ts`, new specs. 303 frontend tests stay green + new cases.
- Docs: 05-shelter-api.puml + rendered outputs, 06-CONTEXT-API.md, 02-CONTEXT-DOMAIN.md, frontend
  06-CONTEXT-SHELTER.md (+ 05-shelter-review-flow.puml if applicable), READMEs, STEPS note.
- NOT in this change: account deletion, admin/moderator tools, editing registry shelters (never —
  they stay owned by the registry import), notification e-mails on edits.
