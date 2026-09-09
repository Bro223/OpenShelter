# user-contributions Specification

## Purpose

A signed-in user can list, edit and delete their own shelters and reviews — author linkage at the
schema level, author-scoped shelter mutations, and a cross-shelter "my reviews" listing, surfaced
in one account-page panel.

## Requirements

### Requirement: Shelters are linked to their author

User-submitted shelters SHALL be linked to the account that created them. The link SHALL be
nullable: registry rows and USER submissions made before the author column existed have no author
and are unmanageable by anyone (readable publicly, editable/deletable by no one).

#### Scenario: New submission records the author

- **WHEN** a verified user submits a shelter
- **THEN** the stored shelter carries that user's id as its author

#### Scenario: Registry and legacy rows have no author

- **WHEN** a registry import creates a shelter, or a pre-author-column USER row is read
- **THEN** the shelter's author is null and no user can edit or delete it

### Requirement: The user can list their own shelters

The application SHALL provide an authenticated endpoint returning the caller's own shelters using
the same lean read projection as the public shelter list. The list SHALL contain only shelters the
caller created — never other users' shelters, never registry rows.

#### Scenario: Own shelters listed

- **WHEN** a user who submitted two shelters calls the "my shelters" endpoint
- **THEN** the response contains exactly those two shelters

#### Scenario: No leakage of others' shelters

- **WHEN** user A calls the endpoint and user B has submitted shelters
- **THEN** B's shelters do not appear in A's response

### Requirement: The user can update their own shelter

The application SHALL let the author update the editable fields of their own shelter (name,
description, capacity, location) with the same validation and Estonia bounding-box check as
creation. Any user other than the author — and any registry or legacy row — SHALL be rejected
without modification.

#### Scenario: Author updates fields

- **WHEN** the author submits a valid update for their shelter
- **THEN** the fields change, the bounding-box and field-bound validation applies, and the updated
  shelter is returned

#### Scenario: Not the author

- **WHEN** a user who did not create a shelter attempts to update it
- **THEN** the request is rejected (403) and nothing changes

#### Scenario: Registry or legacy shelter

- **WHEN** any user attempts to update a registry row or a legacy author-less USER row
- **THEN** the request is rejected (403) and nothing changes

#### Scenario: Invalid update payload

- **WHEN** the update's location is outside Estonia or a field violates its bounds
- **THEN** the request is rejected (400) and nothing changes

### Requirement: The user can delete their own shelter

The application SHALL let the author delete their own shelter. Deletion SHALL remove the shelter
and cascade to its reviews (existing database cascade). Non-authors and registry/legacy rows SHALL
be rejected.

#### Scenario: Author deletes

- **WHEN** the author deletes their shelter
- **THEN** the shelter is gone from the public list and its reviews no longer exist

#### Scenario: Not the author / registry row

- **WHEN** a non-author (or anyone, for a registry row) attempts deletion
- **THEN** the request is rejected (403) and the shelter is untouched

### Requirement: The user can list their own reviews across shelters

The application SHALL provide an authenticated endpoint returning the caller's reviews across all
shelters, each carrying the shelter's id and name (for navigation) plus rating, comment and
timestamps. The existing per-shelter author-only review update/delete endpoints remain the way to
modify them.

#### Scenario: Own reviews listed with shelter context

- **WHEN** a user who reviewed two different shelters calls the "my reviews" endpoint
- **THEN** both reviews are returned, each with the correct shelter id and name

#### Scenario: No reviews yet

- **WHEN** a user with no reviews calls the endpoint
- **THEN** the response is an empty list

### Requirement: Contributions management in the account UI

The account page SHALL show a "My contributions" panel with both lists. Each shelter row SHALL
offer view, inline edit (name/description/capacity/location with client-side validation mirroring
the backend) and two-step-confirmed deletion. Each review row SHALL offer navigation to the
shelter, inline edit (rating + comment) and two-step-confirmed deletion. Each list SHALL have
loading, empty (with a "submit a shelter" affordance for the empty shelter list) and error states.

#### Scenario: Full happy path in the UI

- **WHEN** a user with one shelter and one review opens the account page
- **THEN** both appear in the contributions panel, editing the shelter and saving persists the
  change (row updates without a full page reload), and deleting with confirmation removes the row

#### Scenario: Rejected mutation

- **WHEN** an edit or delete is rejected by the backend
- **THEN** an inline error is shown and the row remains in its previous state
