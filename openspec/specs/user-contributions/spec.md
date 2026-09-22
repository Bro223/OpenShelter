# user-contributions Specification

## Purpose

A signed-in user can list, edit and delete their own shelters — author linkage at the schema level,
author-scoped shelter mutations, surfaced in one account-page panel.

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
caller created — never other users' shelters, never registry rows. Unlike the public list, the
owner's list SHALL include auto-hidden (status `INACTIVE`) shelters; each shelter's response SHALL
carry its status and its `nonexistentReports` count so the UI can show hidden ones as
"Hidden — reported by the community (n reports)". Hidden shelters SHALL NOT be restorable from
the user UI (admin only).

#### Scenario: Own shelters listed

- **WHEN** a user who submitted two shelters calls the "my shelters" endpoint
- **THEN** the response contains exactly those two shelters

#### Scenario: No leakage of others' shelters

- **WHEN** user A calls the endpoint and user B has submitted shelters
- **THEN** B's shelters do not appear in A's response

#### Scenario: Hidden own shelter is visible to its owner

- **WHEN** the user's shelter was auto-hidden by five non-existence reports
- **THEN** the /mine list shows it, marked hidden with the report count, and offers no
  restore action in the UI

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

The application SHALL let the author delete their own shelter. Non-authors and registry/legacy rows
SHALL be rejected.

#### Scenario: Author deletes

- **WHEN** the author deletes their shelter
- **THEN** the shelter is gone from the public list

#### Scenario: Not the author / registry row

- **WHEN** a non-author (or anyone, for a registry row) attempts deletion
- **THEN** the request is rejected (403) and the shelter is untouched

### Requirement: Contributions management in the account UI

The account page SHALL show a "My contributions" panel listing the caller's own shelters. Each
shelter row SHALL offer view, an edit entry and two-step-confirmed deletion. Editing SHALL open
the shared /submit form in edit mode (`/submit?edit=<id>`) — the SAME full creation form
prefilled with the row's values — where save is `PUT /api/shelters/{id}`; the account area
hosts no inline edit form of its own, and a saved edit publishes immediately with the
pending-verification (NEW) trust state. The list SHALL have loading,
empty (with a "submit a shelter" affordance) and error states.

#### Scenario: Full happy path in the UI

- **WHEN** a user with one shelter opens the account page
- **THEN** the shelter appears in the contributions panel, editing through the
  `/submit?edit=<id>` form and saving persists the change, and deleting with
  confirmation removes the row

#### Scenario: Rejected mutation

- **WHEN** an edit or delete is rejected by the backend
- **THEN** an inline error is shown and the row remains in its previous state
