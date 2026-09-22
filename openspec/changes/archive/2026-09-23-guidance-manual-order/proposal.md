# Change: guidance-manual-order

## Why

The owner wants editorial control over where a post sits on the public
`/blog` index: after adding a post, they want it to appear, say, **third** —
and to drag it into position in the admin table. Today the only ordering
lever is the `pinned` boolean: everything else sorts by `published_at`
descending (id descending tie-break), so a non-pinned post's position is a
side-effect of when it was published, and the only way to the top is to pin
it. There is no way to place a post third, and pinning cannot express
"prominent but not first".

The owner accepted a non-drag mechanism if drag is unreliable, but the
outcome must be dependable. This change therefore gives the admin table an
explicit, STORED order (per-row move controls primary, native
drag-and-drop secondary) and makes the public index follow it — with
deterministic tie-breakers so the order can never be ambiguous, and a
backfill so deploying changes nothing visible.

## What Changes

- **Stored manual order** (`V28__guidance_manual_order.sql`): a
  `sort_order INT NOT NULL` column on `guidance_posts`, backfilled from the
  order the public index uses today (pinned first, then `published_at`
  DESC, id DESC — so the visible index is identical after deploy), with the
  V23 partial index replaced by one matching the new order. The column
  is deliberately **NOT** uniqueness-constrained: the atomic renumber must
  not transiently violate a uniqueness check, and the order's tie-breakers
  make a duplicate — which no API write can produce — harmless anyway.
- **The public index order contract changes**: `GET /api/guidance` becomes
  `pinned DESC, sort_order ASC, published_at DESC, id DESC`. Pinning keeps
  its existing meaning (a head block, "always first"); `sort_order` decides
  everything else; `published_at` and `id` remain as deterministic
  tie-breakers (each exists for a stated reason, `design.md` D2). Honest
  consequence: publishing no longer floats a post — a post's slot is its
  `sort_order`, and publish/unpublish never move it.
- **New posts append (last position)** on create
  (`sort_order = max + 1`), whether created as a draft or created-and-
  published.
- **ONE admin endpoint** — `PUT /admin/guidance/order`, behind the existing
  ADMIN-kind guard (fresh per-request lookup) — takes the **FULL ordered
  list of post ids** (drafts + published) and renumbers 1..N in a **single
  transaction** (all-or-nothing), answering 204. Idempotent: resubmitting
  the current order is a no-op that writes no audit row. Validation: an
  unknown id, a duplicate id, or a set that does not match the current
  posts → **400 in the API's uniform error body**, nothing changed;
  anonymous → 401; non-admin → 403. A reorder that changes the order writes
  one `GUIDANCE_REORDER` audit row in the same transaction. Concurrency
  position, stated honestly: two concurrent reorders resolve **last write
  wins** — acceptable here because the environment provisions exactly one
  admin account (rationale in `design.md` D3).
- **Admin UI — TWO mechanisms over that ONE endpoint**, in a fixed order of
  primacy: (a) **PRIMARY** — per-row move-to-top / move-up / move-down
  controls, native buttons, keyboard operable (Tab + Enter/Space,
  accessible names, ≥48px) and working on touch; (b) **SECONDARY** — native
  HTML5 drag-and-drop as progressive enhancement. The reason for that order
  is recorded in `design.md` D5: drag alone cannot be driven by the
  keyboard, native drag events do not fire for touch, and a failed drop
  leaves the user unsure whether it saved. The admin list renders in the
  stored manual order — the table is a live preview of the public order.
- **NO NEW RUNTIME DEPENDENCY.** `frontend/package.json` stays unchanged
  (verified 2026-09-18: it carries no drag-and-drop library).
  `@angular/cdk/drag-drop`, `SortableJS` and `ngx-drag-drop` were
  considered and rejected because they are runtime dependencies and this
  project deliberately chooses vendoring over dependencies — Quill is
  vendored at `frontend/src/vendor/quill/`.
**- i18n**: the new control labels and hints go through the message
  catalogs (written for the en/et pair when designed; the ru catalog
  landed with the Russian slice afterwards, so all THREE catalogs —
  en/et/ru — carry the keys, and the key-parity guard makes a
  one-sided key a failing test).

## Capabilities

### New Capabilities

- `guidance-manual-order`: the stored manual order (column + order-
  preserving backfill + index), the new public index order contract, the
  atomic full-list reorder endpoint, append-on-create, and the admin
  reorder UI (move controls primary, native drag-and-drop secondary).

### Modified Capabilities

- `crisis-guidance` — the "Public guidance index" requirement: this
  change's D2 supersedes its ordering clause (pinned first, then
  `published_at` descending) with the manual order contract (`pinned DESC,
  sort_order ASC, published_at DESC, id DESC`). Carried as a MODIFIED sync
  delta in `specs/crisis-guidance/spec.md` (added 2026-09-22): it requires
  `crisis-guidance` to be archived **first** — `openspec archive` refuses a
  MODIFIED whose main spec does not exist yet — so the two deltas can never
  apply in the wrong order. The new capability's own spec
  (`specs/guidance-manual-order/spec.md`) states the full order contract;
  the sync item stays recorded in Impact below.

## Impact

- Affected specs: `guidance-manual-order` (new). Reported for later sync,
  not edited here: `crisis-guidance` (in-flight delta — its "Public
  guidance index" requirement orders by `publishedAt` descending with no
  `sort_order`, its "Same publication instant" scenario and the republish
  consequence in "Post lifecycle and prominence" predate manual order;
  reconcile when that change archives).
- Affected code — backend: `db/migration/V28__guidance_manual_order.sql`
  (column + backfill + index replacement); `domain/GuidancePost`
  (+`sortOrder`, both factories) and `GuidancePostEntity`/
  `GuidancePostMapper` (the `ddl-auto=validate` pairing); the
  `GuidancePostRepository` contract (`findPublished` → the new order,
  `findAllForAdmin` → the manual order) with the JPA implementation's
  derived queries and the in-memory test fake; `GuidanceService` (create
  appends `max + 1`; new `reorder` — permutation validation + single-
  transaction renumber + audit row; publish/unpublish/delete explicitly
  never touch `sort_order`); `ModerationAuditLog` gains `GUIDANCE_REORDER`;
  `AdminGuidanceController` gains `PUT /admin/guidance/order` (+
  `ReorderGuidanceRequest` DTO, springdoc annotations); the
  `ApiErrorHandler` 400 mapping for the reorder validation;
  `OpenApiContractIT` path inventory + `docs/api/openapi.json`
  regeneration.
- Affected code — frontend: `gateways/admin-gateway.ts` (one new method),
  `core/models.ts` (reorder request type + the `AdminAuditAction` union
  member + its label-map entry), `features/admin/admin-page.{ts,html,scss}`
  (list renders in the manual order; per-row move controls; native HTML5
  DnD; refresh-from-response; failed-reorder handling),
  `core/i18n/{messages,en,et,ru}.ts` (new `admin.guidance.*` keys in all
  catalogs — the parity guard covers the three locales). `frontend/package.json` is UNCHANGED.
- Config: none — no new environment variables.
- Docs sync: `README.md` (API table row + the "Crisis guidance" section's
  ordering sentence), `docs/whitepaper.md` (one sentence), the backend
  agent pack (`context-and-tasks/agent/06-CONTEXT-API.md`) and the frontend
  one (`frontend/docs/agent/02-CONTEXT-API.md`).
- The public order contract changes, but the backfill makes the deploy a
  visible no-op: the instant the migration runs, the index returns the
  same rows in the same order. The reorder endpoint is additive; no other
  route changes behaviour.
