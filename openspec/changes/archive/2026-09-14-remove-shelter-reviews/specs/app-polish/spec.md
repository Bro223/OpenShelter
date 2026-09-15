# Spec Delta: app-polish (remove-shelter-reviews)

## MODIFIED Requirements

### Requirement: Loading, empty, and error states on every route

Every route SHALL show an explicit loading state while fetching, an empty
state when the data is empty, and an error state (per the shared error
conventions) when the backend is unreachable or rejects — with the page
chrome (header/nav) intact in all three states, and no console errors on
the happy path.

#### Scenario: Fetching routes

- **WHEN** any data-driven route is fetching
- **THEN** a loading indicator is shown and no empty or error state is
  displayed

#### Scenario: Empty data

- **WHEN** a data-driven route has no data to show
- **THEN** an explicit empty state is shown instead of a blank region

#### Scenario: Backend down or rejecting

- **WHEN** a request fails (network or HTTP error)
- **THEN** the route shows an error banner with the error message and the
  page chrome stays intact

#### Scenario: Happy path is quiet

- **WHEN** a user traverses the happy path (browse → register → login →
  verify → submit a shelter)
- **THEN** no errors appear in the browser console

### Requirement: Project documentation

The repository SHALL document how to run the full product (backend +
frontend), the frontend stack and structure, the token-storage tradeoff,
and the honest v1 deferrals, in a README that replace(s) the framework
boilerplate.

#### Scenario: New developer onboarding

- **WHEN** a developer follows the README to run the product
- **THEN** the steps to start the backend and frontend work and the
  deferrals are stated explicitly

#### Scenario: Deferrals are honest

- **WHEN** the README describes v1 scope
- **THEN** it explicitly lists the true deferred items (paging /
  nearest-bbox search, i18n, MapLibre migration, httpOnly-cookie auth,
  SSR/prerender, e2e framework) as deferrals rather than implying they
  exist — while `GET /account/me` is documented as a SHIPPED feature
  (implemented with the account-profile change), not a deferral
