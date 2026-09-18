# Design: guidance-manual-order

## Context

The surfaces this change leans on, all shipped:

- **The guidance model and authoring API** (`crisis-guidance`):
  `guidance_posts` (V23) with `status`, `pinned`, `published_at`,
  `updated_at`; the admin authoring surface `GET/POST/PUT
  /admin/guidance*` behind the fresh per-request `UserKind.ADMIN` lookup
  (401 anonymous / 403 non-admin, no role claim in the JWT); the uniform
  `ErrorResponse` body for every error; the moderation audit trail
  (crisis-guidance D12) written in the same transaction as the action it
  records.
- **Today's ordering** (crisis-guidance D6): the public index reads
  `pinned DESC, published_at DESC, id DESC` (backed by the V23 partial
  index `(pinned DESC, published_at DESC) WHERE status = 'PUBLISHED'`),
  and the admin list reads `updatedAt DESC, id DESC`.
- **The single env-provisioned admin** (`admin-moderation`):
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` seed exactly one ADMIN account on first
  start and never touch it afterwards; the kind is granted no other way by
  the application.
- **The locale layer** (`i18n-et-en` slice 1): the typed `Messages`
  catalog with the en/et key-parity guard; new chrome keys must go through
  it in BOTH catalogs.
- **Narrow-width discipline** (`mobile-responsive-polish` M13): 360px with
  no page-level horizontal overflow, 48px action targets, `overflow-x:
  auto` table wrappers, keyboard-operable native buttons with visible
  focus.
- **The no-new-dependency habit**: `frontend/package.json` carries 8
  runtime dependencies and no drag-and-drop library (verified 2026-09-18);
  Quill was VENDORed (`frontend/src/vendor/quill/`) rather than installed —
  the precedent this change's UI follows.

Repo conventions this plan follows: Flyway migrations with
`ddl-auto: validate` staying green (every mapped column must exist with the
same shape); domain + entity/mapper/repository per aggregate; the
stable-order discipline (same-value rows must not reorder between calls);
Testcontainers-backed backend tests and vitest frontend tests.

Next free Flyway version: **V25** — verified against the repo, not
assumed: `ls src/main/resources/db/migration | sort -V` ends at
`V24__retention_last_activity.sql` (`V23.1` is a V23 sub-version). New
migration name: `V25__guidance_manual_order.sql`.

## D1 — `sort_order`: an integer, NOT NULL, backfilled, NOT uniqueness-constrained

`V25` adds `sort_order INT NOT NULL` to `guidance_posts` and backfills
EVERY existing row in one statement, ranking the rows in the order the
public index produces today, with the rows that are not visible there
today (drafts) ranked after them:

```sql
UPDATE guidance_posts gp
SET sort_order = ordered.n
FROM (
    SELECT id,
           row_number() OVER (
               ORDER BY pinned DESC,
                        published_at DESC NULLS LAST,
                        id DESC
           ) AS n
    FROM guidance_posts
) ordered
WHERE gp.id = ordered.id;
```

- **The published rows receive 1..k in exactly their current public
  order** (the pinned block first, in its current relative order, then the
  non-pinned block), so the visible index is identical the instant the
  migration runs — deploying changes nothing visible. **Drafts take the
  tail** in `id DESC`; their relative positions are invisible today, and
  "a draft enters the index where the admin put it" is the only
  later-visible consequence of where they sit.
- The V23 partial index is **replaced** by
  `(pinned DESC, sort_order ASC, published_at DESC, id DESC) WHERE status
  = 'PUBLISHED'`, so the public read stays index-served under the new
  order (the `published_at`/`id` columns ride in the index because the
  ORDER BY names them).
- **No UNIQUE constraint on `sort_order`.** A renumber assigns 1..N in a
  single pass; with a UNIQUE index, row A's update to 2 would collide with
  row B while B still holds 2, forcing two-phase (offset) values or an
  order-sensitive update plan inside the transaction. The value is unique
  in practice — create appends `max + 1`, and a reorder is a strict
  permutation — and a duplicate, if it could ever exist, is HARMLESS
  because the order contract (D2) totals on the tie-breakers. Uniqueness
  is a property the writers guarantee; the index does not need to enforce
  a property only the writers can break.
- An integer (dense 1..N after every reorder) rather than the alternatives
  — see "Considered and rejected".

## D2 — The public order contract: `pinned DESC, sort_order ASC, published_at DESC, id DESC`

Every read that lists posts for reading orders by those four keys:

| Key | Why it is there |
| --- | --- |
| `pinned DESC` | Pinning keeps its EXISTING meaning — "always first". Pinned posts form a head block ABOVE every non-pinned post regardless of `sort_order`; within the head block, `sort_order` decides. |
| `sort_order ASC` | The manual order. It decides every non-pinned position — this is the feature. |
| `published_at DESC` | `sort_order` is not uniqueness-constrained (D1), so the order must stay total and deterministic for ANY row state, not only the states the API writes. The publication instant is the last editorially meaningful signal a row carries, and it is the tie-breaker for that (prevented-in-practice, defined-in-any-case) state. |
| `id DESC` | `published_at` can legitimately coincide (same-instant publication is a live state the existing spec already covers). `id` is the final tie-breaker, so two rows sharing BOTH values still have exactly one unambiguous relative order, and repeated calls return the same order — the repo's stable-order discipline (the same id tie-break crisis-guidance D6 established). |

**The consequence, stated honestly: publishing no longer moves a post.**
In the old order, re-publishing stamped a fresh `published_at` and the
post re-entered the list at the top of the non-pinned block. Under this
contract `published_at` is only a tie-breaker, so a post's slot IS its
`sort_order`, and publish/unpublish never move it. An admin who wants a
re-issued instruction at the top moves it to the top — the explicit control
this change exists to provide replaces the timestamp-driven re-entry.

**The admin list changes with it**: `GET /admin/guidance` reads
`sort_order ASC, id DESC` instead of `updatedAt DESC, id DESC`. The table
becomes the live preview of the public order (pinned posts sit at their own
slot, flagged in the pinned column) — "drag it into position in the admin
table" requires the table to BE the order.

## D3 — One endpoint: `PUT /admin/guidance/order`, full ordered id list, one transaction

- **Route** — `PUT /admin/guidance/order`. PUT because a full replacement
  of one state (the order) is the repo's PUT idiom (`PUT
  /admin/guidance/{id}` replaces a post's fields; the POSTs are state
  transitions). The literal `order` segment outranks the `/{id}` template
  in Spring's mapping, so there is no ambiguity with the update route.
- **Authorization** — the existing ADMIN-kind guard, unchanged: the
  security chain's `/admin/**` rule plus the in-handler fresh per-request
  `UserKind.ADMIN` lookup. Anonymous → 401, authenticated non-admin → 403,
  no guidance data in either body.
- **Body** — `{ "postIds": [...] }`: the FULL ordered list of post ids,
  drafts and published alike.
- **Validation** — the list must be a PERMUTATION of every current post id:
  an unknown id → 400, a duplicate id → 400, a list that does not contain
  every current post (a stale list — e.g. a post was created or deleted
  after the admin loaded the table) → 400. Every rejection uses the
  uniform `ErrorResponse` body and changes NOTHING. An empty list is a 400
  whenever any post exists (it is then "missing"); with no posts at all it
  is a 204 no-op.
- **Success** — the service renumbers every post to 1..N in the submitted
  order in ONE `@Transactional` method — all-or-nothing: a failure mid-
  transaction rolls the whole renumber back, so no partial order can ever
  be observed. 204 No Content (the repo's idiom for admin state changes).
- **Idempotence** — resubmitting the current order changes no value; the
  call is a no-op and, like the publish/unpublish no-ops, writes NO audit
  row.
- **Audit** — a reorder that actually changes the order writes exactly ONE
  `GUIDANCE_REORDER` row to the moderation audit trail in the same
  transaction (crisis-guidance D12 idiom, the `recordLabeled` overload,
  label `Guidance post order` — a snapshot that stays readable).
- **Concurrency — last write wins, stated, not hidden.** There is no
  version column and no optimistic lock. Two reorders in flight: both
  validate against the set as it stood, the later commit wins, and the
  final order is one complete list one admin chose — never an interleaving
  or a partial renumber. That is acceptable here because the environment
  provisions exactly ONE admin account (the `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  seeder; the kind is granted no other way), so a genuine conflict is the
  same credential open in two tabs or browsers; the reorder is bounded,
  cheap and fully reversible — any outcome is a valid total order, and the
  "loser"'s intent is one more click; and the DANGEROUS conflict — a
  create or delete landing between the table load and the reorder — is
  already caught by the set-mismatch 400, which forces a refresh instead
  of silently dropping or duplicating a row.

## D4 — New posts append at the end; slots survive status changes

- `create` assigns `sort_order = max(sort_order) + 1` (computed in the
  same transaction as the insert): a new draft sits LAST in the admin
  table; a created-and-published post sits at the END of the public
  non-pinned block (below any pinned posts). The owner then moves it where
  they want it — the ask was "I want it third", and a silent default (the
  old behaviour put the newest post on top as a side-effect of its
  timestamp) is exactly the unpredictability this change removes.
- `publish` / `unpublish` / `delete` NEVER touch `sort_order`. A draft's
  slot survives its later publication (the spec scenario), and deleting a
  post leaves GAPS in the numbering — harmless, because order is by value,
  not adjacency; the next reorder re-densifies.
- The appended value is a STARTING position, not a lock: any subsequent
  reorder may move the post anywhere.

## D5 — The UI: two mechanisms over the one endpoint, in a decided order

- **PRIMARY — per-row move controls**: move-to-top, move-up, move-down —
  native `<button>`s in the row's action cell (the existing
  `btn btn--ghost` idiom), Tab-reachable, activated by Enter or Space,
  with accessible names (naming the post and the direction), ≥48px
  targets, disabled at the list boundaries (top row: move-to-top/move-up
  disabled; bottom row: move-down disabled). They work on touch because
  they are buttons — a tap is the whole interaction, no drag involved.
- **SECONDARY — native HTML5 drag-and-drop** as progressive enhancement:
  rows are `draggable`, the table shows a drop-position indicator, and a
  completed drop sends the SAME full-ordered-list call. Where native DnD
  is unavailable, or the user never uses it, the primary controls are the
  complete feature.
- **The reason for that order, recorded as decided**: drag alone cannot be
  driven by the keyboard (native HTML5 DnD has no keyboard operation path
  — a keyboard-working admin would lose the feature entirely); native drag
  events do not fire for touch (verified 2026-09-18: the native HTML5
  Drag-and-Drop API has no built-in mobile touch support — which is
  precisely why the rejected libraries exist); and a failed drop leaves
  the user unsure whether it saved (a native drop has no visible
  confirmation round-trip; the buttons are atomic single moves whose
  server answer the UI waits for and surfaces).
- **Both mechanisms are thin**: each computes the new full id list
  client-side (one swap, one insertion, or a move-to-front) and submits it
  to `PUT /admin/guidance/order`; the table re-renders FROM the server's
  answer, so the visible order is always the stored order. A failed reorder
  surfaces the server's error message and leaves the table in the last
  confirmed order — no half-applied row, no ghost drag state.
- **NO NEW RUNTIME DEPENDENCY.** `@angular/cdk/drag-drop`, `SortableJS` and
  `ngx-drag-drop` were considered and rejected because they are runtime
  dependencies and this project deliberately chooses vendoring over
  dependencies — Quill is vendored at `frontend/src/vendor/quill/`, and
  `frontend/package.json` (8 runtime deps, verified 2026-09-18) carries no
  drag-and-drop library. The rejection is on the dependency policy, not on
  capability: the two mechanisms above deliver the dependable outcome
  without any of them. Verified capability notes (checked 2026-09-18, so
  the record stays accurate if the decision is ever revisited):
  `@angular/cdk/drag-drop` is the official Angular CDK's drag-and-drop
  module (`cdkDrag`/`cdkDropList` reorderable-list directives);
  `SortableJS` is a lightweight, framework-agnostic reorderable-list
  library with native touch support; `ngx-drag-drop` is a set of Angular
  directives wrapping the native HTML5 Drag-and-Drop API.
- **360px + keyboard**: the controls live in the existing row action cell
  (which already wraps inside the M13 `overflow-x: auto` table wrapper),
  every target is ≥48px, and every control is focus-visible on the global
  tokens — the same audit the other admin tabs passed.

## Considered and rejected

- **A free-text order key** (a slug-like string the admin types):
  lexicographic order is opaque about insertion points — between "b" and
  "c" the admin must invent "b2", then "b3", and "b10" sorts between "b1"
  and "b2" — so the very act of placing a post becomes a key-invention
  puzzle, exactly the unpredictability the owner refused. Dense integers
  1..N keep the position explicit and the renumber unambiguous.
- **Per-neighbour reordering** (server-side move-up / move-down swaps):
  "up" is ambiguous at the pinned boundary (up across into the pinned
  block? not?), each move is a separate round-trip — moving a post ten
  places is ten requests, each of which can race a concurrent create or
  delete — and a failure mid-sequence leaves a half-moved post with no
  "undo to start" call. The full-list form makes every reorder ONE atomic,
  self-describing operation; the UI's move buttons are just that form with
  one swap computed client-side.
- **An explicit `position` typed by the admin** (the admin types "3"): a
  typed number is a claim, not a result — it does not say what happens to
  the post currently third, and the only sane interpretation ("shift
  everything else") is exactly what the full-list renumber computes
  unambiguously. It adds a bounds/duplicate validation surface with no
  expressiveness the list lacks, and it is the same failure family as the
  free-text key: the admin's input can describe an order the table cannot
  show.
- **Reusing `pinned` as a sort field** (a rank column, or "pinned =
  priority N"): pinning is deliberately the boolean "always first"
  (crisis-guidance D6: "a rank column would be a richer model than the
  ask"). Merging the two would collapse a prominence flag into an ordering
  mechanism, break the head-block contract, and leave no slots for the
  actual ask — the order among the rest. Two orthogonal axes stay two
  columns.
- **A client-side order in `localStorage`**: not shared (a second
  browser/device renders the old order), lost on storage clear or machine
  change, and — decisively — it cannot reach the public index, which the
  server renders from `GET /api/guidance`: the admin's local order and the
  public order would silently diverge. The order is content: it must be
  server state, which is what this change makes it.

## Consequences

- **The public order contract changes** (pinned, then
  `publishedAt`-descending → pinned, then the manual order, with the two
  tie-breakers) and **the admin list order changes** (newest-updated →
  manual order). Both are the point of the change; the backfill makes the
  first deploy a visible no-op; the in-flight `crisis-guidance` delta
  carries the pre-change wording — a sync item, reported in the proposal,
  not edited here.
- **Publishing no longer re-enters a post at the top** (D2). An admin who
  relied on the old side-effect learns the explicit move; the trade is
  deliberate.
- **Deletions leave gaps** in `sort_order` until the next reorder (D4) —
  order-by-value makes gaps invisible.
- **The audit vocabulary grows by one value** (`GUIDANCE_REORDER`): the
  frontend `AdminAuditAction` union and its label map gain the member (a
  type error until they do), like the four crisis-guidance values.
- **Follow-ups, explicitly out of scope** (each additive, none blocks this
  change): reordering per-locale (v1 has no per-locale index at all), a
  bulk "reset to newest-first" action (a single full-list submit could
  express it), auto-closing numbering gaps (a cosmetic concern).
