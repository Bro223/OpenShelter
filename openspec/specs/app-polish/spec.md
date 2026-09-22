# app-polish Specification

## Purpose

The product-level presentation and packaging contract for the Angular app: a single visual
token system, responsive behavior, per-route document titles and a project favicon, audited
loading/empty/error states on every route, and a documented, working production build — so the
app is presentable and shippable rather than feature-complete-but-scaffold-styled.

## Requirements

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
content, and the map + sidebar arrangement degrades gracefully. Native form controls
(checkboxes, radios) SHALL keep their native glyph size inside flex form rows — the global
form-control width rule SHALL NOT stretch them into wide flex items that displace the row's
label text.

#### Scenario: Narrow viewport on the map page

- **WHEN** the map page is viewed at a mobile width
- **THEN** the map and the sidebar list are arranged for the narrow screen (e.g. stacked or
  otherwise reflowed) and remain usable without horizontal scrolling

#### Scenario: Narrow viewport on forms and detail pages

- **WHEN** a form or the shelter detail page is viewed at a mobile width
- **THEN** the layout reflows to the narrow screen and all controls remain reachable and
  operable

#### Scenario: Checkbox and radio rows at any width

- **WHEN** a form row pairs a native checkbox or radio with a text label (the /submit
  private-home declaration, the report-type options)
- **THEN** the control renders at its native size (the app's 18px glyph) directly beside the
  label, the label wraps below/after it on narrow widths, and the row stays left-aligned
  without a stretched control box

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

- **WHEN** a user traverses the happy path (browse → register → login → verify → submit a
  shelter)
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
- **THEN** it explicitly lists the true deferred items (server-side
  nearest search — the viewport bbox filter + paging are shipped
  (`shelter-bbox-paging`) —, i18n for the remaining feature pages (app
  chrome is trilingual EN/ET/RU — `core/i18n`, the translate pipe, the
  language switcher, pre-paint locale), MapLibre migration, httpOnly-cookie
  auth, SSR/prerender, e2e framework) as deferrals rather than implying they exist —
  while `GET /account/me` is documented as a SHIPPED feature (implemented with the
  account-profile change), not a deferral

### Requirement: Outgoing user messages SHALL carry the product name

Every e-mail and SMS the app sends (verification, OTP, password reset,
contact change, SMTP subject) SHALL identify the product as
"OpenShelter" via a single shared backend constant. The legacy working
name "Shelter Map" SHALL NOT appear in any user-received message.

#### Scenario: Verification e-mail

- **WHEN** the app sends an email verification code
- **THEN** the message body and the subject name "OpenShelter" (not
  "Shelter Map")

### Requirement: User-facing messages SHALL be free of internal jargon

Exception messages rendered to users SHALL NOT contain internal
identifiers (enum names like SMART_ID) or process notes ("stub in v1").
Internal implementation facts belong in code comments only.

#### Scenario: eID request

- **WHEN** a caller requests a verification channel that is not
  implemented
- **THEN** the 400 message is plain user language
  ("eID verification is not available yet.") with no enum token or
  stub note

### Requirement: Banner text SHALL be sentence case regardless of origin

Backend user-facing messages echoed by the frontend banner SHALL start
with a capital letter, matching the sentence-case frontend copy, so the
same banner component never flips capitalization between sources.

#### Scenario: Backend message in banner

- **WHEN** a backend 400/403 message ("a verified account is required…"
  class) is rendered in the app banner
- **THEN** it renders sentence-case like every other banner string

### Requirement: Verification terminology SHALL be consistent across channels

The e-mail that delivers the verification value and the UI field that
receives it SHALL use the same term ("code") and the same length
constant, named in both languages with an explicit mirror comment
(backend provider constant; FE `EMAIL_CODE_LENGTH = 8`), so a length
change cannot drift silently.

#### Scenario: User follows the e-mail

- **WHEN** the user reads the verification e-mail and enters the value
- **THEN** the e-mail called it a "code" of the same length the UI asks
  for

### Requirement: User-facing strings SHALL not be duplicated or intensifier-laden

Repeating user-facing strings (≥2 occurrences) SHALL be named
constants in their owning module. The map home subtitle ("Find
registered and community-submitted bomb shelters in Estonia.") and
the meta description ("Find registered and community-reported bomb
shelters in Estonia.") SHALL both name the project and its scope
(no soft intensifier like "every").
User-visible copy SHALL not use the em-dash as its default clause
joiner: of the current 12 em-dash clauses, the most formulaic ~6 SHALL
become separate sentences or commas (remaining natural uses allowed;
code comments untouched).

#### Scenario: Duplicated string

- **WHEN** the same user-facing message appears in ≥2 places in one
  module
- **THEN** it is a named constant referenced from both places

#### Scenario: 404 detail copy

- **WHEN** a shelter ID does not exist
- **THEN** the detail text refers to "this ID" (the route key), not
  "this address"

### Requirement: Touch target and numeric legibility

Primary/secondary (`.btn`) buttons and list-row buttons SHALL have a
minimum height of 48px. Coordinate and count readouts SHALL use tabular
numerals (`font-variant-numeric: tabular-nums`) so digits do not shift
while they update.

#### Scenario: small-screen target size

- **WHEN** the app is rendered on a 360px-wide viewport
- **THEN** every primary/secondary (`.btn`) button and list-row button is
  at least 48px tall

### Requirement: High-contrast theme

The application SHALL offer a high-contrast theme toggled from the app
shell, persisted across sessions, and applied before first paint. The
theme SHALL override the existing design tokens (same token names) rather
than introducing parallel styles; the default theme SHALL remain the
existing light theme.

#### Scenario: toggle persists

- **WHEN** the user enables high contrast and reloads the app
- **THEN** the high-contrast theme is active before the first paint

#### Scenario: default is light

- **WHEN** a user with no stored preference opens the app
- **THEN** the light theme is shown

### Requirement: Localization (Estonian/English/Russian)

The application chrome (header nav, header actions, footer, document
titles) SHALL be available in English (`en`), Estonian (`et`) and Russian
(`ru`). A language switcher SHALL let the user choose the active locale;
the choice SHALL persist across reloads and the document language
(`<html lang>`) SHALL reflect the active locale from before first paint.
The default locale (no stored preference) SHALL be `en`, preserving the
existing first-load behavior.

The three locale catalogs SHALL stay key-complete: every message key
present in one catalog SHALL be present in the other two (no
untranslated/empty strings may silently ship) — enforced at compile time
by the shared `Messages` interface and at runtime by the catalog-parity
guard.

The Russian catalog SHALL be marked, in a header comment, as
machine-assisted and NOT reviewed by a native speaker; the repository
docs SHALL state that a native speaker's review is required before the
site is genuinely public-facing. The six Russian crisis-guidance posts
SHALL be stored as DRAFTS until that review is done.

#### Scenario: Switching language re-renders the chrome

- **WHEN** the user selects the Estonian option in the header language
  switcher
- **THEN** the nav labels, header actions, footer notice, legal links and
  data-provenance line render in Estonian, `<html lang>` becomes `et`, and
  the choice is persisted so a reload starts in Estonian

#### Scenario: Switching to Russian re-renders the chrome

- **WHEN** the user selects the Russian (RU) option in the header
  language switcher
- **THEN** the nav labels, header actions, footer notice, legal links and
  data-provenance line render in Russian, `<html lang>` becomes `ru`, and
  the choice is persisted so a reload starts in Russian with the
  pre-paint `<html lang>` already `ru`

#### Scenario: No stored preference keeps the default

- **WHEN** the app loads with no stored locale preference
- **THEN** the chrome renders in English and `<html lang>` is `en`

#### Scenario: Catalogs stay in lockstep

- **WHEN** a message key is added to one locale catalog
- **THEN** the key-parity guard fails unless all three catalogs carry the
  same key with a non-empty value

#### Scenario: A missing Russian key cannot ship

- **WHEN** a `Messages` key has no Russian value
- **THEN** the compile (typed catalog) and the parity guard both fail, and
  the route-title check fails for any route whose `data.title` key lacks
  the Russian value
