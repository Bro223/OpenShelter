# Change: entry-verification-meta (M8)

## Why

Roadmap M8: per-entry **last-verified**, **report counts**, and
**under-review** visibility. M6/M7 already single-source the provenance
label ("Proposed" / "Community-reported"), but the user has no answer to
"when was this row last checked, and by whom?", and the "Reported" badge
hides its count. The detail page of a Proposed row says it is unverified
without saying how long it has been waiting.

## What Changes

- **DTO (server-derived, batched — no N+1)** — `ShelterDto` gains:
  - `reportCount` — the TOTAL community shelter-report count, all types
    (summed over the existing per-type batched counts;
    `nonexistentReports` stays the NON_EXISTENT subset that drives the
    orange badge).
  - `lastVerifiedAt` — the per-entry verification stamp (nullable):
    - **registry rows** (PAASETEAMET / MUNICIPALITY): the newest
      **verifying** import run of their source — `OK` or
      `NOT_MODIFIED` (a 304 re-check is a verification); `FAILED` /
      `SKIPPED` verify nothing;
    - **community rows**: the newest of (a) `OPEN_CONFIRMED` reports by
      a user **other than the submitter** (a self-confirm never
      verifies — the auto-confirm rule; a legacy unclaimed row accepts
      any reporter) and (b) `CONFIRM` / `AUTO_CONFIRM` moderation
      audit actions (the admin's manual confirm verifies too);
    - `null` = never verified — the under-review signal.
- **Map row** — the orange badge gains its count: "Reported (2)".
- **Detail header** — a new meta line under the coordinates:
  - verified row: "Last verified 2 h ago" (relative under 7 days,
    concrete date beyond — "12 Sep 2026");
  - UNDER_REVIEW row: "Proposed 3 d ago — not yet verified" (the line
    IS the under-review signal, pairing proposal age with the missing
    check);
  - other rows without a record: "No verification record yet".
  The community report count rides on the same line when present:
  "· 3 community reports".

## Non-goals (deferred)

- `/mine` and the admin list do NOT render the new meta in this
  milestone (M10 owns the moderation dashboard completion).
- No per-type report breakdown in the UI (the total + the badge's
  NON_EXISTENT subset carry the signal; the admin queue already lists
  individual reports).
- Occupancy reports are not verification events (they answer "how full",
  not "does it exist"); the derivation ignores them.
