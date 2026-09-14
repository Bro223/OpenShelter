# shelter-detail-reviews Specification

## Purpose

The public detail view of a single shelter — its name, source, address (when present) and, for
community submissions, description and capacity — read for everyone, with no authentication.

The community review and star-rating half of this capability was removed with the review model
(migration `V21__drop_reviews.sql` drops `shelter_reviews` + `review_reports`): the review list,
review upsert, review delete and rating-presentation requirements are gone, recorded in
`openspec/changes/archive/2026-09-14-remove-shelter-reviews/specs/shelter-detail-reviews/spec.md`.
The surviving requirement is the detail page itself. The capability directory name still says
"reviews" — rename follow-up pending:
`git mv openspec/specs/shelter-detail-reviews openspec/specs/shelter-detail`.

## Requirements

### Requirement: Shelter detail page

The application SHALL expose a public shelter detail page at `/shelters/{id}` showing the shelter
name, source, address (when present), and — for community submissions — its description and
capacity. It SHALL require no authentication to view.

#### Scenario: Anonymous user opens a shelter detail

- **WHEN** any user opens `/shelters/{id}` for an existing shelter
- **THEN** the page shows the shelter information without prompting for login

#### Scenario: Unknown shelter id

- **WHEN** the user opens `/shelters/{id}` for a shelter that does not exist (backend 404)
- **THEN** the page shows a not-found state, not a blank or error-storm

#### Scenario: Loading and backend-down states

- **WHEN** the page is fetching, or the backend is unreachable
- **THEN** a loading indicator, then an error banner (per shared error conventions), are shown
  while the page chrome stays intact
