# Design: community-review-queue

## D1 — Extend the existing model; do not replace it

The realism review's proposed 6-value `source_type/verification_status`
maps onto the existing schema: `source` separates official from
community, `status` (ACTIVE/INACTIVE) + `auto_hide_disarmed` covers
reported-inactive. The missing dimension is the community trust state —
add ONE column (`review_status`) + the audit table + `location_kind`
instead of migrating to a new schema.

## D2 — Auto-publish with a trust lifecycle; no blocking queue (v2)

The owner will not actively moderate, so submissions MUST NOT wait on a
human: new community rows publish immediately as `NEW`. Trust moves
forward automatically — a positive community report
(`OPEN_CONFIRMED`… i.e. type `OPEN_CONFIRMED`) from a user other than
the submitter promotes NEW→CONFIRMED inside the report-write
transaction (audited AUTO_CONFIRM). Trust moves backward through the
existing community channel too: 5× NON_EXISTENT auto-hides (status
INACTIVE) exactly as today. Admin actions (CONFIRM / REJECT) are the
rare manual override. REJECT sets status=INACTIVE + stores the reason
in review_note; restoring a rejected row uses the existing admin
status endpoint and reverts review_status to NEW (it starts over).

## D3 — Grandfather existing USER rows as NEW

Existing community rows have no confirmation evidence yet, so they
backfill to NEW (the amber "just added" treatment is the honest one).
Registry rows backfill CONFIRMED (official data — the value is
informational for them; the FE only reads review_status on USER rows).

## D4 — One audit table, written inside the same transaction

`moderation_actions` is append-only, written in the same JPA
transaction as the action it records. Actions: STATUS_CHANGE, DELETE,
REPORT_DISMISS, REVIEW_HIDE, REVIEW_RESTORE, CONFIRM, AUTO_CONFIRM,
REJECT. previous/new store the review_status transition (DELETE:
previous = review_status, new = null). Shelter name resolves at read
time; a deleted row renders "Deleted shelter".

## D5 — Marker palette: trust state gets its own colour

Blue = registry (unchanged). Community: amber (NEW) vs green
(CONFIRMED) — new design token `--color-new` (amber family, distinct
from the safety-orange `--color-reported`). Reported rows keep the
orange override (reported beats trust colour). Grey/hidden rows never
reach the public map. Legend: Registry / New community / Confirmed
community / Reported.

## D6 — "Around you", not "nearest", and honest distance

The CTA is browser-geolocation only (verified: no IP geolocation
anywhere in the codebase) — GPS drift is the inaccuracy source, so the
copy stops promising precision: "Show shelters around you". The result
line shows the straight-line distance already computed for ranking:
"≈ N km straight line" (metres below 1 km), never a walking route.
Community rows in that result carry the unverified warning line.

## D7 — Private homes: declaration, not detection

Detecting "this address is a private home" from data we don't have is
unreliable; instead the submitter declares it (checkbox, stored as
location_kind=PRIVATE). Private rows are NOT demoted or hidden — a
resident may legitimately offer their home as a refuge for people far
from home (the product idea) — but every surface (list row, detail,
admin) shows a "Private location" badge + a detail note that it is a
resident-offered location, not an official facility.
