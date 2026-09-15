# Design: shelter-trust-and-reports

## D1 — One report table, types decide consequences

`shelter_reports(id BIGSERIAL PK, shelter_id FK→shelters CASCADE, user_id
FK→users CASCADE, type VARCHAR CHECK IN ('NON_EXISTENT','CLOSED','OPEN_
CONFIRMED','WRONG_LOCATION','OTHER'), detail VARCHAR(500) NULL,
created_at TIMESTAMPTZ,
UNIQUE(shelter_id, user_id, type))`. `detail` is the optional free text
for `OTHER` (same vocabulary as review reports). The type column is what
routes the
consequence; the table, the guard rails (verified-only, one per user per
type, throttle), and the admin queue are shared by all types.

- `NON_EXISTENT` ≥ 5 → shelter status `INACTIVE` (auto-hide). The trigger
  fires exactly once: on the insert that brings the count to exactly 5.
  After any manual status change by an admin (or the author's delete),
  later reports increment the count but never re-hide.
- `CLOSED` / `OPEN_CONFIRMED` net to a display flag only, never status:
  closed > confirmed → `REPORTED_CLOSED`; confirmed ≥ closed ≥ 1 →
  `CONFIRMED_OPEN`; otherwise no flag (a 1-1 tie counts as confirmed open,
per the resolved rule pinned in `ShelterQueryServiceTest`).
- `WRONG_LOCATION` / `OTHER` → admin queue only, no user-facing change.

Display derivations are computed at query time in the list projection
(batched, same no-N+1 pattern as `submitterVerified` and
`averageRating`), never stored — the counts are small and the list is
small (Estonia scale). `ShelterDto` gains: `Integer nonexistentReports`
(0 when none), `String statusFlag` (`REPORTED_CLOSED` / `CONFIRMED_OPEN` /
null) and the occupancy block (D4). Markers: `nonexistentReports > 0` →
orange dot (the single "reported" affordance, distinct from provenance
colors); otherwise provenance color as today.

## D2 — Review reports and hidden reviews

`review_reports(id BIGSERIAL PK, review_id FK→shelter_reviews CASCADE,
user_id FK→users CASCADE, reason VARCHAR CHECK IN ('FALSY_DATA',
'NOT_RELEVANT','SPAM','OTHER'), detail VARCHAR(500), created_at
TIMESTAMPTZ, UNIQUE(review_id, user_id))`. A user cannot report their own
review (403 — own content is edited or deleted, not reported). 5 reports
set `shelter_reviews.hidden_at` (new nullable column, set once, never
cleared automatically). Hidden reviews are excluded from: the detail list
(except the author sees their own hidden review marked "Hidden"), the
average rating + review count (both projections), and the `reviewed`
filter. Only the admin moderation API (change: admin-moderation) can
clear `hidden_at`.

Rationale for hiding rather than deleting: a hidden review is evidence
for the admin queue; deleting destroys the appeal trail. Rationale for
excluding from the average: a review that the community flagged as
false/spam must not keep distorting the rating it attacked.

## D3 — Verified-only, throttled, one-per-target

All three report/occupancy endpoints require a verified registered user
(`canWrite()`, same guard as submissions). The `UNIQUE` constraints are
the per-target abuse bound; on top, a per-user report rate limit reuses
the existing throttle pattern (same table family and window style as the
verification/reset throttles) — 10 report-type actions (any target, any
type) per rolling hour, 429 with the standard `Retry-After`-style error
body. The 10-active-shelter cap on `POST /api/shelters` counts the
submitter's `source=USER AND status=ACTIVE` rows, 409 above 10, and is
skipped for `ADMIN` kind users.

## D4 — Occupancy: bands, 2 h freshness, latest-wins, display-only

`shelter_occupancy_reports(id BIGSERIAL PK, shelter_id FK→shelters
CASCADE, user_id FK→users CASCADE, band VARCHAR CHECK IN ('SPACE',
'GETTING_FULL','FULL'), updated_at TIMESTAMPTZ, UNIQUE(shelter_id,
user_id))`. PUT semantics (one live report per user, edit = update).
Display at query time, window = last 2 h of `updated_at`:

| fresh reports in window | display |
|---|---|
| none | nothing shown |
| exactly 1 | hedged copy: "Reported {space\|getting full\|full}" |
| ≥ 2 agreeing on the latest band | "Full" / "Getting full" / "Space available" |

"Agreeing" = same band as the most recent report. The rule is
deliberately thin — no scoring engine — because the honest answer at this
data density is: show the freshest claim, hedge when it's a lone claim.
Occupancy never affects visibility, status, markers, or filters; it is a
word on the card ("Full · 12 min ago"), 48px-tap input on the detail
page, and it degrades to silence when stale (no cleanup jobs — freshness
is checked at read time).

## D5 — List query extension

`GET /api/shelters` gains optional `reviewed` (bool), `minRating` (int
1..5, invalid → 400), `hasCapacity` (bool), composable with existing
`source`. All three are applied in the in-memory projection over the
already-fetched list (the list is small; the ratings/counts are computed
there today anyway — no new SQL surface, no new repository methods).
`reviewed` counts visible reviews only; `minRating` compares the
computed average (shelters with 0 reviews never pass `minRating ≥ 1`).
The public list query itself SHALL be filtered to `status = ACTIVE`
(auto-hidden shelters disappear from map and list); the owner list
(`/mine`) and the admin list include all statuses, and `findById`
remains available to owner/admins. The detail projection additionally
carries `yourOccupancyBand` (the caller's own band or null — guests and
anonymous users null) so the occupancy picker can pre-select.

## D6 — Frontend presentation rules

- Chip row becomes: `All / Registry / User` (existing, unchanged) +
  toggle chip `Reviewed` + chip `Has capacity` + rating `<select>`
  (`Any rating / 1★+ … 5★+`). All four combine with the source chips.
- List row + detail header badges: orange "Reported" (nonexistent > 0),
  amber "Reported closed" / green "Confirmed open" (statusFlag),
  neutral "Full · X min ago" (occupancy, never green — "space available"
  is not a celebration).
- Detail page: "Report" button (auth-gated, verified-gated with the
  existing redirect) opening a type picker incl. free text for `OTHER`;
  per-review "Report" action with reason + optional text; "Report how
  full" — three big band buttons, one tap, latest-wins, with the user's
  current band pre-selected.
- `/mine`: a hidden own-shelter shows "Hidden — reported by the
  community (n reports)" and is not restorable from the UI.
- 48px targets + existing tokens only; the orange reported-state reuses
  `--color-cta`'s hue family via a new `--color-reported` token added in
  `design-tokens.spec.ts`-policed form (contrast-pinned like its siblings).

## Delta dropped: shelter-detail-reviews (2026-09-15)

This change used to MODIFY the "Community review list" requirement of the
`shelter-detail-reviews` capability. The review model was removed by the archived
change `2026-09-14-remove-shelter-reviews` (`V21__drop_reviews.sql`), so that
requirement no longer exists in the base spec and the archive would refuse the
delta ("Archive would refuse this delta" INFO). The delta file under
`specs/shelter-detail-reviews/` was therefore deleted; this change's surviving
deltas are `shelter-reports`, `map-browse`, `shelter-submission` and
`user-contributions`.
