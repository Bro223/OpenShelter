## Purpose

The public detail view of a single shelter (rating summary, description/capacity when present,
community reviews) and the verified-user review surface — read for everyone, write only for
authenticated verified accounts, with backend-enforced upsert and author-only semantics.

## ADDED Requirements

### Requirement: Shelter detail page

The application SHALL expose a public shelter detail page at `/shelters/{id}` showing the shelter
name, source, address (when present), rating summary, and — for community submissions — its
description and capacity. It SHALL require no authentication to view.

#### Scenario: Anonymous user opens a shelter detail

- **WHEN** any user opens `/shelters/{id}` for an existing shelter
- **THEN** the page shows the shelter information and its review list without prompting for login

#### Scenario: Shelter has no reviews

- **WHEN** the shelter's average rating is null and its review count is zero
- **THEN** the page shows an explicit "no ratings yet" indication instead of an invented zero

#### Scenario: Unknown shelter id

- **WHEN** the user opens `/shelters/{id}` for a shelter that does not exist (backend 404)
- **THEN** the page shows a not-found state, not a blank or error-storm

#### Scenario: Loading and backend-down states

- **WHEN** the page is fetching, or the backend is unreachable
- **THEN** a loading indicator, then an error banner (per shared error conventions), are shown
  while the page chrome stays intact

### Requirement: Community review list

The detail page SHALL render the shelter's reviews (author name, rating, comment when present,
date) as a read-only list for everyone. No delete or edit UI SHALL be offered for reviews that are
not provably the viewer's own (the v1 DTO carries no author identity; the backend enforces
author-only writes).

#### Scenario: Reviews exist

- **WHEN** the detail page loads and the shelter has reviews
- **THEN** each review shows its author name, rating, optional comment, and date

#### Scenario: No reviews

- **WHEN** the shelter has no reviews
- **THEN** the page shows an explicit empty state for the review section

### Requirement: Add or update your own review (upsert)

The application SHALL let an authenticated, verified user add a review (1–5 stars, optional
comment up to 500 chars) on a shelter, where a second review by the same user for the same shelter
updates the first rather than creating a duplicate (the backend returns 201 for a new review and
200 for an update).

#### Scenario: Anonymous user attempts to review

- **WHEN** a signed-out user attempts to review a shelter
- **THEN** they are prompted to log in, preserving the shelter as the return destination

#### Scenario: Signed-in but unverified user attempts to review

- **WHEN** an authenticated user without any verification claim attempts to review
- **THEN** the page shows a verify prompt with a link to the verification flow instead of the
  review form

#### Scenario: Verified user adds a first review

- **WHEN** a verified user submits a valid review for a shelter they have not reviewed
- **THEN** the review appears in the list, the rating summary refetches, and the page reflects
  that the user now has a review

#### Scenario: Verified user reviews a second time

- **WHEN** a verified user submits a review for a shelter they already reviewed
- **THEN** the existing review is updated, not duplicated, and the rating summary refetches

### Requirement: Delete your own review

The application SHALL let a verified user delete their own review on a shelter via the
author-only endpoint, then refetch so the list and rating summary update.

#### Scenario: Author deletes own review

- **WHEN** a verified user who has a review on the shelter deletes it
- **THEN** the review is removed, the summary refetches, and the page returns to the no-review
  state for that user

### Requirement: Rating presentation

Ratings SHALL render accessibly: numeric value and an accessible star representation (e.g.
`role="img"` with an aria-label such as "4.2 out of 5") that supports half-star averages.

#### Scenario: Whole and fractional averages

- **WHEN** a shelter has reviews yielding a whole or fractional average rating
- **THEN** the page shows the numeric rating plus accessible stars representing that average
