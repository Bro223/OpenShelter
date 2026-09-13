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
