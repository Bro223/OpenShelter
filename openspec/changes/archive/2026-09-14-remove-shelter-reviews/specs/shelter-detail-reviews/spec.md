# Spec Delta: shelter-detail-reviews (remove-shelter-reviews)

## REMOVED Requirements

### Requirement: Community review list

**Reason:** The review model is gone by owner decision: V21 drops
`shelter_reviews` + `review_reports`, no review endpoint, DTO or entity
exists under `src/main/java`, and the detail page carries no review list
(`shelter-detail-page.ts:100-104`). A requirement describing a read-only
review list describes a surface that no longer exists.

**Migration:** None needed. The community moderation channel is the
shelter REPORT system (`shelter_reports`, V9) — reports, occupancy and
open status — which the detail page and the map row still surface.

### Requirement: Add or update your own review (upsert)

**Reason:** There is no review write surface and no review endpoint; the
verified-user review form is gone with the model.

**Migration:** A verified user's remaining contribution surfaces are
submitting a shelter (`/submit`) and reporting listed locations'
occupancy/open status from the detail page.

### Requirement: Delete your own review

**Reason:** No review exists to delete; the author-only per-review delete
endpoint was removed with the model.

**Migration:** None — the account page's contributions panel lists the
caller's own shelters, not reviews.

### Requirement: Rating presentation

**Reason:** No rating is collected, stored or returned anywhere; the
accessible star representation had nothing left to render.

**Migration:** None — the shelter payload carries no rating fields and
the map row and detail page show identity/trust/status information only.

## MODIFIED Requirements

### Requirement: Shelter detail page

The application SHALL expose a public shelter detail page at
`/shelters/{id}` showing the shelter name, source, address (when
present), and — for community submissions — its description and capacity.
It SHALL require no authentication to view.

#### Scenario: Anonymous user opens a shelter detail

- **WHEN** any user opens `/shelters/{id}` for an existing shelter
- **THEN** the page shows the shelter information without prompting for
  login

#### Scenario: Unknown shelter id

- **WHEN** the user opens `/shelters/{id}` for a shelter that does not
  exist (backend 404)
- **THEN** the page shows a not-found state, not a blank or error-storm

#### Scenario: Loading and backend-down states

- **WHEN** the page is fetching, or the backend is unreachable
- **THEN** a loading indicator, then an error banner (per shared error
  conventions), are shown while the page chrome stays intact
