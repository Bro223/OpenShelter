# Change: community-self-moderation (M9)

## Why

Roadmap M9: complete the community self-moderation loop. The positive
half is already live (M0: one cross-user `OPEN_CONFIRMED` report
promotes a NEW row to CONFIRMED, no human in the loop) and the raw
negative half exists too (5 `NON_EXISTENT` reports auto-hide). What the
loop is missing is that both halves weigh reporters equally — a fresh
throwaway account and a long-verified contributor cast the same vote,
and a displaced rival (their own listing of the same place was
rejected/hidden) can out-vote the current listing with a negative
report that is self-interested by construction.

## What Changes

- **Reporter trust (derived, never stored)** — a reporter's weight is
  1 (baseline verified account), +1 when the reporter has at least one
  USER submission that reached CONFIRMED (their own content was
  cross-verified), +1 when the reporter's own `OPEN_CONFIRMED` reports
  caused at least two AUTO_CONFIRM promotions (their positive calls
  kept coming true). Capped at 3. No new user column, no new table —
  the weight is re-derived from the rows that already exist, in the
  report-write transaction.
- **Trust-weighted auto-hide ("5 stays")** — the `NON_EXISTENT`
  auto-hide threshold becomes **5 trust-weighted points** instead of 5
  raw reports: each reporter's report contributes their current weight
  (dampened reports contribute 0). Five baseline reporters still hide
  on the fifth report — the shipped behaviour is exactly preserved for
  baseline users; trusted reporters reach the consensus faster (e.g.
  three weight-2 reporters hide on the third report).
- **Duplicate dampening** — a `NON_EXISTENT` report is stored with
  `damped = true` (V16 column) when the reporter holds their OWN
  other USER listing of the same place (same normalized name within
  `app.limits.duplicate-coord-meters` haversine, any status — a
  fully deleted row is gone and cannot damp). A dampened report is
  still recorded, still visible in the admin queue (flagged), and
  still counts for the raw "Reported (n)" badge — it contributes
  **0 points** to the hide tally. Only `NON_EXISTENT` reports are
  dampened: a rival's positive report helps the map, and the other
  types have no automatic consequence.
- **API** — `POST /api/shelters/{id}/reports` answers `200` with
  `{"damped": true|false}` (was an empty 200) so the reporter learns
  when their vote was dampened.
- **Admin queue** — `GET /admin/reports` rows gain `damped`; the admin
  page shows a "dampened" marker on such rows (evidence, never
  deleted).
- **Detail page** — after a dampened report the success notice reads
  the dampened variant (single-sourced copy): the report was recorded
  with reduced weight because the reporter has their own similar
  listing.

## Non-goals (deferred)

- No trust weighting on the positive side: the auto-confirm promotion
  stays exactly as shipped (one cross-user positive report promotes —
  the locked auto-trust decision; M8 last-verified already reads the
  same reports).
- No multi-account detection (there is no same-person signal beyond
  the unique phone/email; the damp rule covers the single-account
  rival vector only).
- `CLOSED` / `OPEN_CONFIRMED` display-flag netting, dismissal
  semantics, and the 2 h occupancy window are untouched.
