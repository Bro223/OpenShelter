# Design: entry-verification-meta (M8)

## D1 — The stamp is derived at read time, batched (no N+1, no new table)

`lastVerifiedAt` is computed in `ShelterQueryService.batchesFor` — the
same one-query-per-input discipline as the existing trust batches — and
rides on the DTO. Nothing is stored; there is no new migration.

**Derivation (per row):**

| Row kind | Stamp | Rationale |
| --- | --- | --- |
| `PAASETEAMET` / `MUNICIPALITY` | newest `data_imports` row of the row's own source with status in `OK, NOT_MODIFIED` (else `null`) | An import run — including a 304 no-change re-check — is the registry confirming the row's data is current as of that time. `FAILED` / `SKIPPED` runs never reached the data. The source is part of the row, so each source's rows share its newest verified run. |
| `USER` | max of: newest `OPEN_CONFIRMED` shelter report **by a non-submitter** (null author = unclaimed legacy row → any reporter), and newest `moderation_actions` row with action in `CONFIRM, AUTO_CONFIRM` (else `null`) | A community member (or the admin) affirming the row is the app's "verified" event. The submitter's own `OPEN_CONFIRMED` is excluded because the auto-confirm rule already treats it as non-trustful; the `AUTO_CONFIRM` audit row is written in the same transaction as the promoting report, so the max() over both is exact. |

**Why the audit join matters:** a manually admin-CONFIRMed row (the
rare override path) has no `OPEN_CONFIRMED` report — without the audit
lookup it would read "No verification record yet" while carrying the
"Community-reported" badge.

**Deliberately not verification events:** occupancy reports (a
freshness-of-occupancy signal, not an existence check),
`NON_EXISTENT` / `CLOSED` / `WRONG_LOCATION` / `OTHER` reports
(negative or neutral), admin `REJECT` / `STATUS_CHANGE` /
`REPORT_DISMISS` / review actions (moderation, not verification).

**Query surface (3 additions, all group-by batches over the existing
tables):**

1. `ShelterReportRepository.latestOpenConfirmedByShelterIds(ids)` —
   `SELECT shelter_id, user_id, MAX(created_at) ... WHERE type =
   'OPEN_CONFIRMED' GROUP BY shelter_id, user_id` (the user id rides
   along for the self-confirm exclusion, done in memory).
2. `ModerationAuditLog.latestConfirmationByShelterIds(ids)` —
   `SELECT shelter_id, MAX(created_at) ... WHERE action IN ('CONFIRM',
   'AUTO_CONFIRM') GROUP BY shelter_id`.
3. `DataImportLog.findLatestVerifiedBySource(source)` — newest row of a
   source with `status IN ('OK','NOT_MODIFIED')`; at most one lookup
   per distinct registry source in the batch (≤ 2).

## D2 — `reportCount` is the TOTAL, the badge keeps the subset

`reportCount` = sum of the per-type counts the projection already
computes (zero extra queries). The orange "Reported (n)" badge keeps
`nonexistentReports` as its number — that is the subset the badge's
colour is about (a row with only CLOSED reports is not "reported away").
The detail line uses the total: "· 3 community reports".

## D3 — Under-review visibility

M6/M7 already render the UNDER_REVIEW state (amber marker, "Proposed"
badge, filter chip, legend, pinned unverified warning). M8 adds the
TIME dimension: the detail line "Proposed {age} — not yet verified"
(UNDER_REVIEW rows never carry a stamp — by construction a non-submitter
`OPEN_CONFIRMED` promotes the row in the same transaction). Proposal
age = the row's existing `createdAt` (no new field).

## D4 — Copy + formatting rules (single-sourced, spec-pinned)

- `reportedBadgeText(n)` → "Reported (n)" — map row + detail header.
- `verifiedAgoText(iso, now)` → "just now" / "N min ago" / "N h ago" /
  "N d ago" (rounding), concrete date "D Mon YYYY" (UTC, hand-rolled
  month table — no ICU dependence) at ≥ 7 days.
- `lastVerifiedText({lastVerifiedAt, provenance, createdAt}, now)` →
  the three line shapes (see proposal).
- `communityReportsText(n)` / `hasCommunityReports(dto)` — singular/
  plural + the template predicate (the codebase keeps `>` comparisons
  out of templates).
- All copy lives in `shared/shelter-copy.ts` with pins in
  `shelter-copy.spec.ts` — a copy change is a spec change.

## D5 — Feasibility on the shared dev DB

The read derivation is a plain SELECT — no migration, so no dev-server
restart is needed for this change (the running backend picks it up on
the next `mvn` rebuild only if restarted; the ITs cover the contract).
