# Change: community-review-queue

## Why

Community submissions currently carry the same visual weight as official
registry data. The owner will NOT actively moderate, so the design must
work without a human in the loop: community locations publish
immediately but are visibly distinguished by trust state, the map shows
different colours for checked vs just-added community rows, and the
existing community report mechanism (not an admin) is what moves a
location from "new" toward "checked" — or hides it when the community
agrees it is gone. The admin panel remains as a rare fallback, and every
action (admin or automatic) is recorded in an audit trail. The UI also
stops over-claiming: "nearest" becomes "around you" (it is browser GPS,
never IP), the straight-line distance is shown, community rows carry an
unverified warning, and submitters can declare a location a private
home so others see it as such.

Part of the realism/trust program. Factual report types (item 5),
national-ID de-collection (item 9) and import traceability (item 2) are
separate later waves.

## What Changes

- `shelters.review_status`: NEW / CONFIRMED / REJECTED (NEW default for
  new community rows; existing USER rows backfilled NEW, registry rows
  CONFIRMED). NEW and CONFIRMED rows are public; REJECTED flips
  status=INACTIVE (hidden). No blocking queue — nothing waits on a
  human.
- NEW→CONFIRMED promotion: automatic when a positive report
  (`OPEN_CONFIRMED`) arrives from a user other than the submitter, or
  manually via the admin CONFIRM action. Both paths are audited
  (AUTO_CONFIRM / CONFIRM).
- `shelters.location_kind`: PUBLIC / PRIVATE — submitter declares "this
  is a private home or private shelter offered as a refuge". Private
  rows show a "Private home (declared)" badge (list, detail, admin);
  marker colour stays the trust colour; no access policy is ever
  derived from the declaration (design D7a).
- `moderation_actions` audit table + `GET /admin/audit`; admin
  `POST /admin/shelters/{id}/review` accepts CONFIRM / REJECT (reason).
- Display: legend grows to Registry / New community (yellow — since
  unified with the verified yellow, one value per theme) /
  Confirmed community (green) / Reported (orange); NEW community rows
  get a "Newly added" badge + unverified warning on the detail page;
  CONFIRMED get "Community-checked". Nearest CTA renamed "Show shelters
  around you"; result shows "≈ N km straight line"; unverified warning
  when the nearest row is a community row.
- Submission form gains the private-location declaration.

## Impact

- Backend: V11 migration, domain (ReviewStatus, LocationKind),
  submission/query/report/admin services, DTOs, AdminController (+2
  endpoints), ITs.
- Frontend: marker tone logic + legend + new yellow token (since
  unified with the verified yellow), list/detail
  badges, map CTA copy + distance, submission form checkbox, admin
  (Unconfirmed + Audit tabs), contributions badges, gateways + specs.
- Registry rows: value CONFIRMED, behaviour unchanged.
