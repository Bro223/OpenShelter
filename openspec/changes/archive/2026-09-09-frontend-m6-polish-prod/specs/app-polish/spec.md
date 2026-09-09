## Purpose

The product-level presentation and packaging contract for the Angular app: a single visual
token system, responsive behavior, per-route document titles and a project favicon, audited
loading/empty/error states on every route, and a documented, working production build — so the
app is presentable and shippable rather than feature-complete-but-scaffold-styled.

## ADDED Requirements

### Requirement: Unified design tokens

The application SHALL source all visual styling (colors, typography, spacing, radii) from a
shared token set defined once, so component styles reference tokens instead of introducing
new hardcoded color/type/spacing values.

#### Scenario: A component needs a color or spacing value

- **WHEN** a component style needs a color, font, or spacing value
- **THEN** it uses the shared token (CSS custom property), and no new literal color/type value is
  introduced in component styles for a value the token set already covers

#### Scenario: Token set is the single source

- **WHEN** the token set changes a value
- **THEN** the change propagates to every component that referenced that token, without per-
  component edits

### Requirement: Responsive layout

The application SHALL remain usable at narrow (mobile) widths: the primary page layouts (map,
detail, forms, auth pages) stack or reflow so no horizontal scrolling is required for core
content, and the map + sidebar arrangement degrades gracefully.

#### Scenario: Narrow viewport on the map page

- **WHEN** the map page is viewed at a mobile width
- **THEN** the map and the sidebar list are arranged for the narrow screen (e.g. stacked or
  otherwise reflowed) and remain usable without horizontal scrolling

#### Scenario: Narrow viewport on forms and detail pages

- **WHEN** a form or the shelter detail page is viewed at a mobile width
- **THEN** the layout reflows to the narrow screen and all controls remain reachable and
  operable

### Requirement: Route titles and favicon

The application SHALL give every route a meaningful document title (visible in the browser tab)
and SHALL ship a project-specific favicon rather than the framework default.

#### Scenario: Navigating to a route

- **WHEN** the user navigates to any route
- **THEN** the browser tab title reflects that route's page (e.g. "Map — OpenShelter",
  "Shelter detail — OpenShelter")

#### Scenario: Tab and favicon

- **WHEN** the app is open in a browser tab
- **THEN** the tab shows the project favicon and the route's title

### Requirement: Loading, empty, and error states on every route

Every route SHALL show an explicit loading state while fetching, an empty state when the data is
empty, and an error state (per the shared error conventions) when the backend is unreachable or
rejects — with the page chrome (header/nav) intact in all three states, and no console errors on
the happy path.

#### Scenario: Fetching routes

- **WHEN** any data-driven route is fetching
- **THEN** a loading indicator is shown and no empty or error state is displayed

#### Scenario: Empty data

- **WHEN** a data-driven route has no data to show
- **THEN** an explicit empty state is shown instead of a blank region

#### Scenario: Backend down or rejecting

- **WHEN** a request fails (network or HTTP error)
- **THEN** the route shows an error banner with the error message and the page chrome stays
  intact

#### Scenario: Happy path is quiet

- **WHEN** a user traverses the happy path (browse → register → login → verify → submit →
  review)
- **THEN** no errors appear in the browser console

### Requirement: Production build

The application SHALL build for production with `ng build` succeeding and a sane output, and
SHALL document production configuration (API URL) in the environment file so a deployment can
supply it without code changes.

#### Scenario: Production build

- **WHEN** the project is built for production
- **THEN** the build succeeds and produces the production bundle without exceeding the error
  budget

#### Scenario: Deployed API URL

- **WHEN** the app is built for production and deployed
- **THEN** the API base URL comes from the production environment configuration, documented so a
  deployer knows where to set it

### Requirement: Project documentation

The repository SHALL document how to run the full product (backend + frontend), the frontend
stack and structure, the token-storage tradeoff, and the honest v1 deferrals, in a README that
replace(s) the framework boilerplate.

#### Scenario: New developer onboarding

- **WHEN** a developer follows the README to run the product
- **THEN** the steps to start the backend and frontend work and the deferrals are stated
  explicitly

#### Scenario: Deferrals are honest

- **WHEN** the README describes v1 scope
- **THEN** it explicitly lists deferred items (`GET /me`, `GET /reviews/mine`, review paging,
  i18n, MapLibre migration, httpOnly-cookie auth) as deferrals rather than implying they exist
