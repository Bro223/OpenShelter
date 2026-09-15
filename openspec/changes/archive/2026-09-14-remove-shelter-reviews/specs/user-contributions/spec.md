# Spec Delta: user-contributions (remove-shelter-reviews)

## REMOVED Requirements

### Requirement: The user can list their own reviews across shelters

**Reason:** The cross-shelter "my reviews" listing endpoint
(`GET /account/reviews/mine`) and its account-page list were removed with
the review model (V21). The endpoint the requirement describes does not
exist.

**Migration:** The account page's "My contributions" panel keeps the
shelters half; the caller's reviews have no replacement surface because
reviews no longer exist.

## MODIFIED Requirements

### Requirement: The user can delete their own shelter

The application SHALL let the author delete their own shelter. Non-authors
and registry/legacy rows SHALL be rejected.

#### Scenario: Author deletes

- **WHEN** the author deletes their shelter
- **THEN** the shelter is gone from the public list

#### Scenario: Not the author / registry row

- **WHEN** a non-author (or anyone, for a registry row) attempts deletion
- **THEN** the request is rejected (403) and the shelter is untouched

### Requirement: Contributions management in the account UI

The account page SHALL show a "My contributions" panel listing the
caller's own shelters. Each shelter row SHALL offer view, inline edit
(name/description/capacity/location with client-side validation mirroring
the backend) and two-step-confirmed deletion. The list SHALL have loading,
empty (with a "submit a shelter" affordance) and error states.

#### Scenario: Full happy path in the UI

- **WHEN** a user with one shelter opens the account page
- **THEN** the shelter appears in the contributions panel, editing and
  saving persists the change (row updates without a full page reload), and
  deleting with confirmation removes the row

#### Scenario: Rejected mutation

- **WHEN** an edit or delete is rejected by the backend
- **THEN** an inline error is shown and the row remains in its previous
  state
