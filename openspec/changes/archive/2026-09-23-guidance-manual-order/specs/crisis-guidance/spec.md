# Spec Delta: crisis-guidance (guidance-manual-order)

> **Sync delta.** The crisis-guidance change's "Public guidance index"
> requirement pinned the pre-manual-order order (pinned first, then
> `published_at` descending, id descending as the stable tie-break).
> This change's D2 supersedes that order contract, so this MODIFIED
> block keeps the two deltas from contradicting each other: the
> ordering line moves to `pinned DESC, sort_order ASC, published_at
> DESC, id DESC`, and the two scenarios that encoded the old order are
> re-stated for the manual order. The requirement's other clauses
> (permit-all, PUBLISHED-only, drafts invisible, no body, empty is
> `[]`) are carried through unchanged. Archive `crisis-guidance`
> before this change, so the main spec this MODIFIED applies onto
> exists when `openspec archive` runs here.

## MODIFIED Requirements

### Requirement: Public guidance index

The backend SHALL provide `GET /api/guidance` as a permit-all (no JWT)
endpoint returning the PUBLISHED guidance posts as JSON — each with its
`slug`, `title`, `pinned` flag, `locale`, `publishedAt`, `updatedAt` and its
hero image reference (`url` + `alt`, or `null`) — ordered **pinned posts
first, then `sort_order` ascending (the stored manual order), then
`publishedAt` descending, with the row id descending as the final
tie-break** (guidance-manual-order D2 — this clause supersedes the
original `publishedAt`-descending order, which the V28 backfill made the
`sort_order` values for the visible rows, so the index is unchanged the
instant the migration lands). Draft posts SHALL NOT appear in the
response in any form. The endpoint SHALL NOT expose the post body. An
empty result SHALL be `200` with `[]`, never an error.

#### Scenario: Published posts are listed pinned-first

- **WHEN** an anonymous caller requests `GET /api/guidance` and three
  posts are published — the oldest one pinned
- **THEN** the API answers 200 with all three, the pinned post first and
  the remaining two in their stored manual order (`sort_order` ascending —
  for rows never reordered, the backfill's `publishedAt`-descending order),
  so the pinned post leads and repeated calls return the same order

#### Scenario: Drafts are invisible

- **WHEN** a draft post exists alongside published posts
- **THEN** the draft does not appear in the index, and its title and slug
  are absent from the response body

#### Scenario: Nothing published yet

- **WHEN** every post is a draft (or none exist)
- **THEN** the API answers 200 with an empty array and no error

#### Scenario: Same publication instant

- **WHEN** two published posts carry the same `publishedAt`
- **THEN** their relative order is their `sort_order` ascending (row id
  descending if they share `sort_order` as well), and repeated calls
  return the same order
