# M11: factual report fields + rating demotion

## Why

Two adjustments to the trust layer's balance. First, community reports
are one click: only `OTHER` carries free text, so a "closed" or
"location is wrong" report has no factual substance for the admin queue
(no "when", no actual address). Second, the rating is framed as the
map's primary trust instrument — a "N★+" filter select sits in the trust
filter row — while the actual trust levers are community reports + admin
moderation. Locked decision: ratings are DEMOTED, not removed — reviews
stay postable, the average keeps displaying (read-only star display),
but the filter goes and the rating-first framing retires.

## What Changes

- **Factual report fields.** `detail` (≤ 500) is STORED for the factual
  types `CLOSED` / `WRONG_LOCATION` (in addition to `OTHER`); the binary
  types `NON_EXISTENT` / `OPEN_CONFIRMED` keep ignoring it. The FE report
  dialog gains a per-type detail field (placeholders: "When did it close,
  if you know?" / "What is the actual address?") shown for the three
  detail-capable types. The admin queue already surfaces `detail` on the
  row — no admin-side change.
- **Rating demotion.** `minRating` is removed from `GET /api/shelters`
  (the parameter, its 400 validation, the in-memory filter) and from the
  map (the "N★+" select, the gateway param, the `TrustFilters` model
  field). A request that still carries `minRating` is silently ignored
  (Spring drops unknown params) — the filter no longer exists.
- **Framing sync.** The API table and the puml design note retire the
  "community rating IS the moderation" line (reports + admin are the
  levers; the rating is context).

## Capabilities

### Modified Capabilities

- `map-browse`: the Source filter loses the rating select and the
  `minRating` parameter; source / `reviewed` / `hasCapacity` are
  unchanged; the star display stays a read-only summary.
- `shelter-reports`: typed reports — `detail` is stored for
  `CLOSED` / `WRONG_LOCATION` / `OTHER`, ignored for the binary types.

## Non-goals

- No removal of reviews or ratings: the write path (create/edit review),
  the aggregates, and the read-only star display all stay.
- No new report types and no structured fields (when/actual-address are
  free text; the admin queue is the consumer).
- No re-sorting: the public list was already id-ordered (it was never
  rating-first in order — the demotion is about the filter and the
  framing, not a sort key).
