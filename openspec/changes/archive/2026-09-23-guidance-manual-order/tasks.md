# Tasks: guidance-manual-order

Next free Flyway version: **V28** — this line previously said V25, which
was correct when written (`V24__retention_last_activity.sql` was then the
last migration) but is now FALSE: `V25__guidance_hero_import.sql` was
committed by the guidance-hero-import change afterwards, and V26
(guidance post translations) and V27 (site_texts) are reserved by changes
in flight. RE-VERIFY before writing the file — never trust this number
from memory:

    ls src/main/resources/db/migration | sort -V | tail -3

New migration name: `V28__guidance_manual_order.sql`. Every `V25`
reference in the phases below means "the version number you just
verified", and must be read as V28 unless the verification says otherwise.

## Phase 1 — Migration + domain (D1)

- [x] `V25__guidance_manual_order.sql` (D1): add `sort_order INT NOT NULL`
      to `guidance_posts` (add nullable or with a temporary default,
      backfill, then enforce NOT NULL), backfilling EVERY row in one
      statement — `row_number() OVER (ORDER BY pinned DESC,
      published_at DESC NULLS LAST, id DESC)` — so the published rows hold
      1..k in exactly today's public order and drafts hold the tail;
      REPLACE the V23 partial index `idx_guidance_posts_published_order`
      with `(pinned DESC, sort_order ASC, published_at DESC, id DESC)
      WHERE status = 'PUBLISHED'`; NO unique constraint (D1: the atomic
      renumber must not transiently violate one); migration header comment
      in the repo's V23 style: WHY the backfill is the exact pre-change
      public order (deploy is a visible no-op), WHY no UNIQUE, the
      `ddl-auto=validate` note
- [x] Domain: `GuidancePost` gains `sortOrder` (both the `draft(...)` and
      `restored(...)` factories), `GuidancePostEntity` +
      `GuidancePostMapper` both directions — every mapped column present
      in V25 with the same shape, so `ddl-auto=validate` stays green

## Phase 2 — Repository ordering (D1, D2)

- [x] `GuidancePostRepository` contract: `findPublished()` →
      `pinned DESC, sort_order ASC, published_at DESC, id DESC`;
      `findAllForAdmin()` → `sort_order ASC, id DESC` (the admin list
      becomes the live preview of the public order — D2); interface javadoc
      updated to the new contract
- [x] `JpaGuidancePostRepository`: derived queries (or JPQL where a
      derived name gets unreadable) for both orderings
- [x] `InMemoryGuidancePostRepository` (test fake): mirror both orderings
      exactly — the service tests depend on it

## Phase 3 — Service (D3, D4)

- [x] `GuidanceService.create`: assign `sort_order = max(sort_order) + 1`
      in the same transaction as the insert (append — D4)
- [x] `GuidanceService.reorder(adminId, List<Long> postIds)` (D3), ONE
      `@Transactional` method: validate the permutation FIRST (unknown id
      → 400 via `GuidanceValidationException`, duplicate id → 400, a
      current post missing from the list → 400; empty list → 400 when any
      post exists) — nothing written on a rejection; compare against the
      current order (equal → return, NO audit row); renumber 1..N; write
      ONE `GUIDANCE_REORDER` audit row through the existing
      `recordLabeled` overload (label `Guidance post order`) in the same
      transaction
- [x] `ModerationAuditLog`: the `GUIDANCE_REORDER` action value
- [x] publish / unpublish / delete: verify they stay untouched by the
      change (a comment each — `sort_order` is never written there; D4)

## Phase 4 — Endpoint + contract (D3)

- [x] `ReorderGuidanceRequest` DTO (`postIds: List<Long>`) +
      `PUT /admin/guidance/order` on `AdminGuidanceController` with the
      existing `requireAdmin()` and springdoc annotations (204 on success;
      400 / 401 / 403 documented)
- [x] `ApiErrorHandler`: the reorder validation failures map to the
      uniform `ErrorResponse` 400 (no new body shape)
- [x] `OpenApiContractIT`: add `PUT /admin/guidance/order` to the expected
      path+method inventory (ADMIN-only expectation included); regenerate
      `docs/api/openapi.json` with `-Dopenapi.update=true` so
      `OpenApiSnapshotIT` stays green

## Phase 5 — Backend tests (behaviour, not just wiring)

- [x] Backfill (Testcontainers): seed a mixed state (pinned + non-pinned,
      drafts, two posts sharing a `published_at`), assert the published
      rows receive 1..k in exactly the order the pre-V25 ordering produced
      and the public endpoint's order is unchanged by the migration
- [x] Order contract: a pinned post with the LARGEST `sort_order` still
      leads the index; a draft's slot is respected when it is published;
      the `published_at`/`id` tie-breaks (force equal `sort_order` rows in
      the test); repeated calls return the same order
- [x] Append-on-create: a new draft receives `max + 1` and sits last in
      the admin list; a created-and-published post lands at the end of the
      non-pinned block
- [x] Endpoint: a valid reorder renumbers 1..N (204) and the public order
      follows; the same order twice is a no-op (no value changes, NO
      audit row); unknown id → 400 + no change; duplicate id → 400 + no
      change; a stale list (missing a concurrently created post) → 400 +
      no change; an empty list with posts present → 400; a changing
      reorder writes exactly one `GUIDANCE_REORDER` row; a forced
      mid-transaction failure renumbers NOTHING (all-or-nothing)
- [x] Authorization: anonymous 401 and a verified non-admin 403 on
      `PUT /admin/guidance/order`
- [x] Migration gate: the app boots against V25 with `ddl-auto=validate`
      green (the existing Testcontainers context-load test)

## Phase 6 — Admin UI (D5)

- [x] `core/models.ts`: the reorder request type; the `AdminAuditAction`
      union gains `GUIDANCE_REORDER` + its label-map entry (a type error
      until it does)
- [x] `gateways/admin-gateway.ts`: `reorderGuidanceOrder(postIds:
      number[])` → `PUT /admin/guidance/order` (204, no body), in the
      documented-list style
- [x] Guidance tab: the list renders in the API's (now manual) order;
      per-row move-to-top / move-up / move-down native buttons (the
      existing `btn btn--ghost` idiom, accessible names naming the post
      and the direction, disabled at the list boundaries, ≥48px, inside
      the M13 `overflow-x: auto` wrapper); each control computes the new
      FULL id list (one swap, one insertion, or a move-to-front) and
      submits it; the table re-renders from the server's answer
- [x] Native HTML5 drag-and-drop (progressive enhancement): `draggable`
      rows + a drop-position indicator; a completed drop submits the SAME
      full list; where DnD is unsupported the primary controls are the
      complete feature
- [x] Failed reorder: surface the server's error message, keep the last
      confirmed order, no half-applied row, no residual drag state
- [x] i18n: the new `admin.guidance.*` keys in `messages.ts` + `en` + `et`
      (the parity guard makes a one-sided key a failing test) — the
      move-to-top / move-up / move-down labels, the "this table's order is
      the public order (pinned posts float above)" hint, and the reorder
      error surface
- [x] NO NEW npm dependency: `git diff frontend/package.json` must be
      empty (the Quill-vendoring precedent — D5)

## Phase 7 — Frontend tests

- [x] The tab renders rows in API order; move-up / move-down /
      move-to-top compute the correct full list and call the endpoint; a
      204 re-renders in the new order; a 400 keeps the last confirmed
      order and shows the server message
- [x] Keyboard: every move control Tab-reachable and Enter/Space-
      activatable; DnD: the drop handler submits the full list (drive the
      handler in jsdom — real drag events do not fire there)
- [x] 360px: no page-level horizontal overflow; 48px targets for the new
      controls (48px: covered — the buttons are plain `.btn` (48px min-height
      global rule) and the spec asserts the class; the 360px overflow check is
      a manual browser item, not verifiable in jsdom — ARCHIVE-PASS 2026-09-23:
      closed at archive; owner re-check optional)
- [x] The audit tab renders the `GUIDANCE_REORDER` label;
      `i18n.spec.ts` parity passes with the new keys
- [x] Gate: `tsc` (both configs) + full `ng test` + prettier clean

## Phase 8 — Docs, validation

- [x] `README.md`: the API-table row for `PUT /admin/guidance/order`
      (JWT + ADMIN kind; the full ordered id list; 204; 400 unknown /
      duplicate / stale; 403 non-admin) and the "Crisis guidance"
      section's ordering sentence — pinned first, then the admin's manual
      order, `published_at`/`id` tie-breakers, new posts appended last,
      publishing does not move a post
- [x] `docs/whitepaper.md`: the guidance paragraph gains the manual-
      ordering sentence (stored order, one atomic endpoint, buttons
      primary + native DnD secondary, no new dependency)
- [x] Backend agent pack `context-and-tasks/agent/06-CONTEXT-API.md`: the
      new endpoint + the two changed orderings; frontend agent pack
      `frontend/docs/agent/02-CONTEXT-API.md`: the gateway method + the
      two UI mechanisms
- [x] `openspec validate guidance-manual-order --strict` passes, then
      (ARCHIVE-PASS 2026-09-23: both validate runs green in the archive lane)
      `openspec validate --all` (no previously-valid change regressed);
      the reported spec-sync item for the in-flight `crisis-guidance`
      delta (its "Public guidance index" ordering clause) is re-stated in
      the archive notes (do NOT edit that change's artifacts) — carried by
      this change's MODIFIED delta (`specs/crisis-guidance/spec.md`), which
      applies when this change archives after `crisis-guidance`
