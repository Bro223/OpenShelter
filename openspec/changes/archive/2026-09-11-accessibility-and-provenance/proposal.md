# Change: High-contrast theme and shelter provenance badges

## Why

Two validated recommendations remain. (1) High-contrast mode: a small
share of users (low vision, direct sunlight on outdoor phones — the
crisis-usage condition) needs higher contrast than the light theme
provides; kriis.ee proves a black/yellow high-contrast variant is the
right shape. It is an accessibility option, not a redesign. (2) Provenance:
shelters from the official registry and shelters submitted by users carry
different trust levels, and the UI currently signals this only through the
source filter and marker color; the detail view and rows should say it
plainly, including whether a user shelter was submitted by a verified
account.

## What Changes

- A persisted high-contrast theme: `data-theme="high-contrast"` on
  `documentElement` overriding the same design tokens (near-black surfaces,
  white text, brighter primary, yellow focus ring), toggled from the shell
  header, applied before first paint (no flash), defaulting to the existing
  light theme.
- `ShelterDto.submitterVerified` (backend): whether the shelter's creator
  has a completed verification at read time (false for registry shelters).
- Provenance badges: detail page + list rows show the source plainly —
  "Paasteamet registry" / "Municipal registry" / "Verified user" /
  "User-submitted" — replacing the need to interpret marker colors.

## Impact

- Affected specs: app-polish (high-contrast theme), shelter-submission
  (provenance display), shelter-detail (badge on detail) — deltas under
  app-polish + shelter-submission.
- Affected code: backend `ShelterQueryService`/`ShelterDto`/user lookup +
  tests; frontend `styles.scss` (theme block), `shared/page-shell.*`
  (toggle), `app.ts` or bootstrap (apply before paint), detail page + list
  row (badges), shelter type, specs; docs sync.
