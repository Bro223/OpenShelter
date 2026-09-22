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
forward automatically — when the row's tally of distinct community
confirmers (verified users other than the submitter with an open
`OPEN_CONFIRMED` report or a current OPEN tap, each counted once) reaches
three, the row promotes NEW→CONFIRMED inside the crossing action's
transaction (audited AUTO_CONFIRM, the crossing user as actor — one
cross-user report at V11, three distinct confirmers since
community-self-moderation). Trust moves backward through the
existing community channel too: the trust-weighted `NON_EXISTENT`
tally (the distinct reporters' derived weights, dampened reports 0,
dismissed excluded) reaching 5 points auto-hides (status INACTIVE) —
five baseline reporters, the fifth report. Admin actions (CONFIRM /
REJECT) are the
rare manual override. REJECT sets status=INACTIVE + stores the reason
in review_note; restoring a rejected row uses the existing admin
status endpoint and reverts review_status to NEW (it starts over).

## D3 — Grandfather existing USER rows as NEW

Existing community rows have no confirmation evidence yet, so they
backfill to NEW (the unified-yellow "Newly added" treatment — one value
with the verified yellow — is the honest one).
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

Blue = registry (unchanged). Community: one unified yellow tone for
USER rows (`--color-new`, since unified with `--color-verified` — one
value per theme, distinct from the safety-orange `--color-reported`);
NEW is not a marker tone (the "Newly added" badge says NEW, never the
pin — the pin carries the submitter's verification depth as shape:
triangle at one confirmed channel, circle at two+). Reported rows keep
the orange override (reported beats trust colour; either open report
kind). Grey/hidden rows never
reach the public map. Legend (since wave 7 the legend IS the pin-tone
filter): Registry / Confirmed by community (the community tone) /
Added by a partially verified user (triangle) / Added by a fully
verified user (circle) / Reported — the five toggle entries, display-
only `?tones=` URL state — plus the inert searched-address anchor entry.

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
admin) shows a "Private home (declared)" badge + a detail note that it
is a resident-offered location, not an official facility.

D7a — the declaration is a building-type CLAIM, never an access claim
(option A, owner decision): locationKind is never used to render
"publicly available: yes/no" or any access policy — the app collects no
access data, so claiming it would fabricate facts in a crisis context.
No map filter hides PRIVATE rows (hiding the scarcest refuge resource
inverts the feature); the badge is the only public/private surface.
The detail practical block shows only what the data supports: the
reported open/closed status.
