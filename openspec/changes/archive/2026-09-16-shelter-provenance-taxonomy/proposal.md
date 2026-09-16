# Change: shelter-provenance-taxonomy (M6)

## Why

The map answers "where do I shelter?" but not "how much should I trust
this pin?". Today the UI derives that answer client-side from two
unrelated fields (`source` + `reviewStatus`) through the
`provenanceLabel`/`communityBadgeClass` split, so a reported-away or
rejected row has no vocabulary of its own, the legend describes markers
by source instead of standing, and the filter chips (All / Registry /
User) are one level coarser than the taxonomy the roadmap locks in.

Roadmap M6: a first-class provenance taxonomy — OFFICIAL,
PARTNER_VERIFIED, COMMUNITY_REPORTED, UNDER_REVIEW, REPORTED_INACTIVE,
REJECTED — with coloured markers, a legend, and a filter.

## What Changes

- **`Provenance` (new domain enum) + `Provenance.of(...)`** — the
  derivation, computed server-side at read time from the row's stored
  fields (source, review_status, status, live NON_EXISTENT count) and
  never stored. Precedence: REJECTED > REPORTED_INACTIVE (INACTIVE +
  ≥ 5 NON_EXISTENT reports) > OFFICIAL (PAASETEAMET) > PARTNER_VERIFIED
  (MUNICIPALITY) > UNDER_REVIEW (USER + NEW) > COMMUNITY_REPORTED.
- **DTOs** — `ShelterDto` and `AdminShelterDto` gain `provenance` (the
  FE never re-derives it). All six values are reachable on the detail
  read, `/mine` and the admin list; only the four visible values occur in
  the ACTIVE-only public list.
- **`?provenance=` filter** — optional param on `GET /api/shelters`,
  in-memory over the projected list (same Estonia-scale precedent as the
  trust filters), composable with `source` and the trust filters; an
  invalid value is a 400 (Spring enum binding). The backend keeps
  `?source=` for compatibility.
- **Markers** — the tone follows the provenance: OFFICIAL blue (the
  existing registry pin), PARTNER_VERIFIED yellow (new),
  COMMUNITY_REPORTED green, UNDER_REVIEW amber, plus the existing
  reported-state orange override; the hidden tones (grey
  REPORTED_INACTIVE, red REJECTED) render only on the detail page's
  static pin.
- **Legend** — five entries for the public map (Official / Partner /
  Community / New community / Reported); the grey/red tones are
  documented as never appearing there.
- **Filter chips** — the map's source chips (All / Registry / User) are
  replaced by provenance chips (All / Official / Partner / Community /
  New community): provenance strictly subdivides source, so the finer
  filter supersedes the coarser one and no confusing source×provenance
  combinations remain in the UI.
- **Surfaces** — map row, detail header, /mine badges and the admin list
  all read the server value via the single-sourced `provenanceText` /
  `provenanceBadgeClass` (the old `provenanceLabel` /
  `communityBadgeClass` / `communityTrustLabel` are deleted); a new
  muted `badge--inactive` tone marks reported-away rows on /mine, the
  detail page and the admin list.
- **Constant move** — `AUTO_HIDE_THRESHOLD` (5) moves from
  `ShelterReportService` (app) to `ShelterReport` (domain): it is a
  domain fact the provenance derivation needs, and the dependency rule
  forbids the reverse edge.

## Non-goals (this change)

- No new migration — provenance is derived, never stored.
- No CAPTCHA, no moderation queue, no rating changes (M11 territory).
- `?source=` is not removed from the API (compat), only unused by the FE.
- The reported-state orange marker/affordance (shelter-trust-and-reports
  D1) is kept unchanged; it still beats the provenance colour.
