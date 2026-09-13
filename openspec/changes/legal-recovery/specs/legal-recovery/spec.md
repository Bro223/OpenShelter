# Spec Delta: legal-recovery (new capability)

## ADDED Requirements

### Requirement: Account data export

The backend SHALL provide `GET /account/export` for authenticated users,
returning the caller's own data as one JSON document: the profile (name,
e-mail, phone — decrypted at the persistence boundary — plus the verified
levels), every shelter row the user created (all statuses, author-scoped),
and every review the user wrote (with the shelter's id and name). The
endpoint SHALL require a valid JWT (401 anonymous) and SHALL NOT add a
rate bucket beyond the standard `/account` rules. Another user's rows
SHALL NOT appear in the document.

#### Scenario: Anonymous export

- **WHEN** `GET /account/export` arrives without a valid JWT
- **THEN** the API answers 401 and no data is returned

#### Scenario: User with contributions

- **WHEN** a verified user who submitted one shelter and wrote one review
  on it calls the endpoint
- **THEN** the API answers 200 with `profile` (decrypted e-mail/phone +
  verified levels), `shelters` containing exactly the user's row and
  `reviews` containing the review with the shelter's id + name

#### Scenario: Author scoping

- **WHEN** user A exports while user B has also submitted a shelter
- **THEN** A's document contains only A's rows — B's shelter and reviews
  are absent

#### Scenario: User without contributions

- **WHEN** a verified user with no shelters and no reviews calls the
  endpoint
- **THEN** the API answers 200 with `shelters: []` and `reviews: []`

### Requirement: Account deletion

The backend SHALL provide `DELETE /account` for a verified user (valid
JWT + at least one verification claim; 401 anonymous, 403 without a
claim). In one transaction it SHALL: hard-delete every shelter row where
`created_by` is the user and `location_kind = 'PRIVATE'`; set
`created_by = NULL` on the user's remaining (PUBLIC) shelter rows and
null their `review_note` without changing any other field (a CONFIRMED
row stays CONFIRMED — a newly-NULL creator is not a re-review signal);
null the `reason` of every `moderation_actions` row for the user's
shelter ids (the action rows themselves survive); and delete the user
row. The DB FK policy completes the erasure: every child `user_id` is
`ON DELETE CASCADE` (credentials, verification claims, pending
verifications and contact changes, refresh and password-reset tokens,
reviews, reports, report actions) and `moderation_actions.moderator_id`
is `ON DELETE SET NULL` (V14) — audit rows survive with dangling ids and
render "Unknown" for an erased moderator. The M2 blind-index columns
(email_hash/phone_hash) die with the user row, so the erased contacts
can be re-registered. A second `DELETE /account` with the still-valid
JWT SHALL be an idempotent 204 no-op.

#### Scenario: Anonymous deletion

- **WHEN** `DELETE /account` arrives without a valid JWT
- **THEN** the API answers 401 and nothing is erased

#### Scenario: Unverified account

- **WHEN** a registered user without any verification claim calls the
  endpoint
- **THEN** the API answers 403 and the account still exists

#### Scenario: Private rows purged, public rows orphaned

- **WHEN** a user with one PUBLIC shelter (CONFIRMED via a community
  report) and one PRIVATE shelter deletes the account
- **THEN** the PRIVATE row is hard-deleted (GET on it → 404) and the
  PUBLIC row remains with `created_by = NULL` and its review status
  unchanged (CONFIRMED stays CONFIRMED), rendered to the map as
  `submitterVerified: false` with no submitter label

#### Scenario: The account cascades

- **WHEN** the deletion commits
- **THEN** the user's credentials, claims, pending verifications and
  contact changes, refresh and password-reset tokens, reviews and
  reports are gone — re-login answers 401, a stored refresh token no
  longer refreshes, and no `users` row (ciphertext or blind index)
  matches the erased e-mail or phone

#### Scenario: Audit rows survive with dangling ids

- **WHEN** an AUTO_CONFIRM audit row was recorded with the deleted user
  as the reporting actor of record
- **THEN** the audit row survives with `moderator_id = NULL`, while a
  row whose actor is another (surviving) user keeps that id

#### Scenario: Idempotent repeat

- **WHEN** `DELETE /account` is called twice with the same (still valid)
  JWT
- **THEN** both calls answer 204 and the second is a no-op

#### Scenario: No user data after erasure

- **WHEN** the user exports data, deletes the account, then requests the
  export again with the same JWT
- **THEN** no data document is returned (the account no longer exists
  behind the token) and the erased contact can be re-registered
