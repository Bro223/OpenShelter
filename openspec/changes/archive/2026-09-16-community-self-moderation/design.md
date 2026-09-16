# Design: community-self-moderation

## D1 — Reporter trust is derived, never stored

`ReporterTrust` (domain record) carries a `weight` in {1, 2, 3}:

```
weight = 1                                    (baseline verified account)
       + 1   if the user has ≥ 1 USER submission with
            review_status = CONFIRMED         (own content cross-verified)
       + 1   if the user's own AUTO_CONFIRM audit actions ≥ 2
            (own positive reports kept coming true)
       (capped at 3)
```

- Inputs are the rows that already exist:
  `shelters` (created_by + source + review_status) and
  `moderation_actions` (actor + action) — two count queries per
  reporter, inside the report-write transaction (report writes are
  throttled to 10/hour per user, so this is cheap).
- No new user column, no new table, no background scoring: the weight
  is a read-time derivation, so it can never drift out of sync and a
  rolled-back report leaves no score behind.
- The threshold "own AUTO_CONFIRM ≥ 2" (not ≥ 1): one accidental
  confirmation should not upgrade a brand-new account; two is the
  first sign of a pattern.
- Trust only ever **helps reach the negative consensus faster** — it
  is never a gate on the positive side (auto-trust is locked: a single
  cross-user positive report still promotes NEW→CONFIRMED).

## D2 — The auto-hide threshold counts points, not rows

`ShelterReport.AUTO_HIDE_THRESHOLD` keeps its value (5) but now bounds
the **trust-weighted hide tally** for a shelter's `NON_EXISTENT`
reports: `tally = Σ weight(reporter)` over the distinct (shelter,
user) `NON_EXISTENT` reporters, damped reporters contributing 0. The uniqueness constraint makes one
report per (shelter, user, type), so a reporter appears at most once.

- The trigger fires on the insert that brings the tally from
  below 5 to ≥ 5 — the same exactly-once posture as the raw count:
  after any manual status change the tally is already ≥ 5, so later
  reports increment it but never re-hide.
- Backward compatibility is exact: weight-1 reporters tally 1 point
  each, so 5 baseline reporters still hide on the fifth report and
  1–4 keep the shelter ACTIVE (the pinned M0/trust-layer tests are
  unchanged).
- Trusted reporters accelerate: weight 2+2+1 hides on the third
  report; weight 3 alone hides on the second report together with any
  baseline reporter.
- The raw `nonexistentReports` count (orange "Reported (n)" badge) and
  the per-type display flags are untouched — they are the raw evidence
  counts; only the hiding decision is weighted.

## D3 — Duplicate dampening: self-interested negative votes count zero

A `NON_EXISTENT` report is **dampened** when the reporter holds their
own OTHER USER listing of the same place: same normalized name (the
M3 duplicate rule) AND within `app.limits.duplicate-coord-meters`
(default 100 m) haversine of the reported shelter — any status of the
reporter's row; the target row itself is excluded, and a deleted row
is simply gone (nothing to compare, nothing to damp).

- The check runs at report-write time over `findByCreatedBy(reporter)`
  (one indexed query + a Java-side scan, the same seam
  `ShelterService.findNearDuplicate` uses) and reuses the M3 statics
  (`normalizedNamesEqual`, `haversineMeters`) — one spelling of the
  duplicate rule in the codebase.
- The damp decision is stored (`shelter_reports.damped BOOLEAN NOT
  NULL DEFAULT FALSE`, V16 — existing rows stay FALSE): the flag is
  the durable evidence for the admin queue and for the weighted tally,
  so neither recomputes a second opinion later.
- Dampened reports are NEVER deleted or suppressed from the admin
  queue: they render with a "dampened" marker. The admin still sees
  the full pattern; the tally just does not let a rival vote down the
  row they themselves listed.
- Scope: `NON_EXISTENT` only. An `OPEN_CONFIRMED` from a rival helps
  the map (promotes the row) — dampening it would punish helpful
  behaviour; `CLOSED` / `WRONG_LOCATION` / `OTHER` have no automatic
  consequence, so a zero vote changes nothing.
- Why the vector is real despite M3's cross-user duplicate 409:
  (a) the rival's own row can be REJECTED / auto-hidden (INACTIVE) —
  the displaced rival then re-contests the new listing of the same
  place; (b) `PUT /api/shelters/{id}` (the author's edit) can move or
  rename a row into the duplicate cell without re-running the 409
  check, so two ACTIVE near-duplicates can coexist after an edit.

## D4 — API, admin and UI surfaces

- `POST /api/shelters/{id}/reports` → `200 {"damped": false|true}`
  (was empty 200). The service returns the fact (`boolean damped`);
  the api layer shapes `ShelterReportResult`. The 403/404/409/429
  mappings are unchanged.
- `AdminShelterReportDto` gains `damped` (admin queue + the FE model);
  the admin queue row shows a muted "dampened" chip next to the type
  when set.
- Detail page: the report success notice picks its text from the
  result — plain "Your report was submitted." vs the dampened variant
  (single-sourced in `shelter-copy.ts`): "Your report was recorded
  with reduced weight — you have your own listing of a similar
  location."
