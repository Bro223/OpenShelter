# guidance-manual-order Specification

## Purpose
Stored manual ordering for guidance posts: a NOT NULL `sort_order` with an
order-preserving backfill, one atomic full-list reorder endpoint, buttons-
primary / drag-and-drop-secondary admin controls, and the
`pinned DESC, sort_order ASC, published_at DESC, id DESC` public order
contract.

## Requirements

### Requirement: Stored manual order with an order-preserving backfill

Every guidance post SHALL carry a `sort_order` integer that is NOT NULL.
The migration introducing the column SHALL backfill EVERY existing row in
a single statement, ranking the rows in the order the public index
produces before the change — pinned first, then `published_at` descending,
id descending — with the rows that are not visible in the public index
today (drafts) ranked after them. The visible public order SHALL be
identical before and after the migration: deploying changes nothing
visible. `sort_order` SHALL NOT carry a UNIQUE constraint: the atomic
renumber performed by the reorder endpoint assigns 1..N in a single pass
and must not transiently violate a uniqueness check, and the order
contract's tie-breakers make a duplicate value — which no API write can
produce — harmless in any case. The order SHALL be read from the stored
column by the server; no client-side state SHALL participate in it.

#### Scenario: The backfill leaves the visible index unchanged

- **WHEN** the migration runs against a database holding published and
  draft posts, some pinned and some sharing a publication instant
- **THEN** every row has a non-null `sort_order`, the published rows hold
  positions 1..k in exactly the order `GET /api/guidance` returned before
  the change, and the endpoint's response order is identical after the
  change

#### Scenario: Every existing row is assigned a position

- **WHEN** the migration runs with drafts present
- **THEN** every draft also receives a `sort_order`, ranked after all
  published rows, so no row is left without a position

#### Scenario: The order survives a restart

- **WHEN** an admin reorders the posts, the backend process is later
  restarted, and a client with no prior local state requests
  `GET /api/guidance`
- **THEN** the index returns the posts in the manually ordered positions —
  the order is read from the stored column, not computed or remembered in
  any client

### Requirement: Public index order

`GET /api/guidance` SHALL order its PUBLISHED posts by
`pinned DESC, sort_order ASC, published_at DESC, id DESC`. Pinning SHALL
keep its existing meaning: a pinned post SHALL appear in a head block
ABOVE every non-pinned post regardless of its `sort_order`, and within
each block `sort_order` SHALL decide. The `published_at` tie-breaker SHALL
exist because `sort_order` is not uniqueness-constrained, so the order
must stay total and deterministic for any row state, not only the states
the API writes. The `id` tie-breaker SHALL exist so that rows sharing BOTH
`sort_order` and `published_at` (same-instant publication is a state the
API can produce) still have exactly one unambiguous relative order;
repeated calls SHALL return the same order. Publishing or unpublishing a
post SHALL NOT change its `sort_order` — a post's slot is its position in
the manual order.

#### Scenario: A reorder changes the index order

- **WHEN** the admin applies a reorder that moves a post from the first
  non-pinned position to the third
- **THEN** `GET /api/guidance` lists that post third among the non-pinned
  posts, the other posts shift to keep their relative order, and the
  pinned block is untouched

#### Scenario: Pinning still floats a post above manually ordered ones

- **WHEN** a post at the last manual position is pinned
- **THEN** the public index lists it in the head block, above every
  non-pinned post, ahead of posts with smaller `sort_order` values

#### Scenario: A draft's position is respected when it is later published

- **WHEN** the admin moves a draft to the third position in the manual
  order and then publishes it
- **THEN** the post enters the public index at that third position among
  the non-pinned posts, without the publication stamping moving it
  elsewhere

#### Scenario: Publishing does not move a post

- **WHEN** a published post at the third manual position is unpublished and
  then re-published
- **THEN** it re-enters the public index at the same third position — not
  at the top of the non-pinned block

#### Scenario: The tie-breakers keep the order deterministic

- **WHEN** two published posts end up carrying the same `sort_order`
  value, one of them with an older `published_at`
- **THEN** the index orders the newer-published one first, and two rows
  sharing `published_at` as well are ordered by id descending, with
  repeated calls returning the same order

### Requirement: Atomic full-list reorder endpoint

The backend SHALL provide `PUT /admin/guidance/order` behind the existing
ADMIN-kind authorization (a fresh per-request user lookup; anonymous
callers receive 401 and authenticated non-admins 403, with no guidance
data in the response). The request body SHALL carry the FULL ordered list
of post ids (`postIds`), drafts and published alike. The list SHALL be a
permutation of every current post id: an unknown id, a duplicate id, or a
list that does not contain every current post SHALL each be rejected with
400 in the API's uniform error body and SHALL change nothing; an empty
list SHALL be rejected with 400 whenever any post exists. A valid reorder
SHALL renumber every post's `sort_order` to 1..N in the submitted order in
a SINGLE transaction — all-or-nothing, so a failure leaves no partial
renumbering — and SHALL answer 204. Resubmitting the current order SHALL
be a no-op (identical state, no audit row). A reorder that changes the
order SHALL write exactly one `GUIDANCE_REORDER` row to the moderation
audit trail in the same transaction. Concurrent reorders SHALL resolve
last-write-wins (no version check): the final order SHALL equal one
complete submitted list, never an interleaving, and a list that predates a
concurrent create or delete SHALL be rejected by the set-mismatch
validation instead of silently dropping a row.

#### Scenario: A valid reorder renumbers atomically

- **WHEN** an admin submits the full post list with one post moved to the
  third position
- **THEN** the API answers 204, every post's `sort_order` is renumbered
  1..N in the submitted order, and `GET /api/guidance` reflects the new
  order

#### Scenario: Sending the same order twice is a no-op

- **WHEN** an admin submits a valid order and then submits the identical
  order again
- **THEN** the second call answers 204, no `sort_order` value differs from
  before it, and no second audit row is written

#### Scenario: An unknown id is rejected

- **WHEN** a reorder request lists an id that is not a post
- **THEN** the API answers 400 in the uniform error body and no post's
  `sort_order` changes

#### Scenario: A duplicate id is rejected

- **WHEN** a reorder request lists the same post id twice
- **THEN** the API answers 400 in the uniform error body and no post's
  `sort_order` changes

#### Scenario: A stale list is rejected

- **WHEN** a post is created while an admin's table is open, and that
  admin then submits a reorder from the stale table, whose list is missing
  the new post's id
- **THEN** the API answers 400 and the new post keeps its appended
  position, forcing the admin to refresh and reorder again

#### Scenario: A non-admin caller is rejected

- **WHEN** a verified non-admin account calls `PUT /admin/guidance/order`
- **THEN** the request fails with 403, carries no guidance data, and no
  post's `sort_order` changes

#### Scenario: An anonymous caller is rejected

- **WHEN** `PUT /admin/guidance/order` arrives without a valid access
  token
- **THEN** the API answers 401 and nothing changes

#### Scenario: A changing reorder leaves one audit row

- **WHEN** an admin applies a reorder that changes the order and then reads
  `GET /admin/audit`
- **THEN** the newest row carries the `GUIDANCE_REORDER` action, the
  acting admin, and a subject label that stays readable

#### Scenario: Concurrent reorders resolve last-write-wins

- **WHEN** two reorder requests with different orders pass validation and
  commit concurrently
- **THEN** the final stored order equals exactly one of the two submitted
  lists — the later commit — and no interleaved or partial order is
  observable

### Requirement: New posts append at the end of the manual order

Creating a post SHALL assign it `sort_order = max(existing sort_order) +
1` in the same transaction as the insert, so a new draft SHALL sit at the
bottom of the admin list and a created-and-published post SHALL sit at the
END of the non-pinned block of the public index (below any pinned posts).
The appended position SHALL be a starting position: any subsequent reorder
MAY move the post anywhere.

#### Scenario: A new draft lands last

- **WHEN** the admin creates a draft post
- **THEN** the draft receives the highest `sort_order` and sits at the
  bottom of the admin list

#### Scenario: A create-and-publish lands last in the public index

- **WHEN** the admin creates a post with an explicit PUBLISHED status
- **THEN** the public index lists it at the end of the non-pinned block,
  below any pinned posts

### Requirement: Admin reorder controls (buttons primary, drag-and-drop secondary)

The admin guidance tab SHALL render the post list in the stored manual
order (`sort_order` ascending — the table is a live preview of the public
order) and SHALL provide TWO mechanisms over the single reorder endpoint,
in a fixed order of primacy: (a) PRIMARY — per-row move-to-top, move-up
and move-down controls, native buttons that are keyboard operable
(Tab-reachable, activated by Enter or Space, with accessible names, at
least 48px targets, disabled at the list boundaries) and activatable on
touch; (b) SECONDARY — native HTML5 drag-and-drop of a row to a new
position as progressive enhancement. The primacy order is fixed because
drag alone cannot be driven by the keyboard, native drag events do not
fire for touch, and a failed drop leaves the user unsure whether it saved.
Both mechanisms SHALL compute the new full ordered id list and submit it
to `PUT /admin/guidance/order`, and the table SHALL re-render from the
server's answer so the visible order is always the stored order. A failed
reorder SHALL surface the server's error and SHALL leave the table in the
last confirmed order — no half-applied row and no residual drag state. The
tab SHALL remain usable at a 360px-wide viewport with no horizontal
scrolling.

#### Scenario: Keyboard-only reordering

- **WHEN** the admin moves a post using the keyboard alone (Tab to the
  row's move control, Enter or Space to activate)
- **THEN** the reorder is submitted, the server confirms it, and the table
  shows the new order without a pointer ever being used

#### Scenario: The move controls work on touch

- **WHEN** the admin taps a row's move-down control on a touch device
- **THEN** the post moves one position and the confirmed order is
  reflected in the table — no drag gesture required

#### Scenario: Drag-and-drop applies the same reorder

- **WHEN** on a desktop with pointer support the admin drags a row to a new
  position and drops it
- **THEN** the table submits the full ordered id list to the reorder
  endpoint and re-renders from the server's answer

#### Scenario: A failed drop leaves no uncertainty

- **WHEN** a drag is dropped but the reorder request fails (for example a
  400 because a post was created in another session)
- **THEN** the table keeps the last confirmed order, shows the server's
  error, and offers the same controls to retry

#### Scenario: The reorder controls at 360px

- **WHEN** the guidance tab is rendered at a 360px-wide viewport
- **THEN** the row controls remain usable with no page-level horizontal
  scrolling and every action target is at least 48px tall
