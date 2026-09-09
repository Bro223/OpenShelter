## Context

- Backend contract verified from the real controllers (source of truth; the frontend
  `02-CONTEXT-API.md` only documents the read side): `GET/POST /api/shelters/{shelterId}/reviews`,
  `PUT/DELETE …/reviews/mine`, `POST /api/shelters` (name ≤200, description ≤2000, capacity
  1–100 000, Estonia bbox enforced server-side → 400). Review body: `rating` 1..5 + `comment` ≤500.
  M5 does not change the API — the frontend merely gains the write gateway.
- M4 established the reusable pieces: typed `ApiClient` (throws `ApiError`), `ShelterGateway`
  (list/get), page-scoped `LeafletService` with divIcon pins + flyTo + destroy, signal-driven thin
  components, `BannerComponent`, Vitest with hand-written fakes, `AuthStore.authenticated()/
  isVerified()/levels()`, `authGuard`/`guestGuard` (see M5's needed VerifiedGuard below).
- `MapPage` (M4) already navigates marker/list rows to `/shelters/:id`, currently the M4
  `ShelterPlaceholderPage` stub — M5 swaps in the real page at the same path.

## Goals / Non-Goals

**Goals:**

- Reuse M4's gateway/service/banner/signal conventions without new HTTP or state plumbing.
- Match the backend upsert semantics exactly in the UI copy: a first review is "add", a later
  one "edit" — both go through the same POST (201 vs 200), and author-only writes use
  `/mine`.
- Keep the verified-write UX truthful: the guard and the form both assume the user is verified;
  a 403 that slips through (claim revoked mid-session) surfaces as a banner, never a crash.
- Keep puml/docs in sync: `05-shelter-review-flow.puml` and `01-frontend-architecture.puml` are
  the class/flow contract; if implementation diverges, update the puml and report the deviation.

**Non-Goals:**

- No moderator/admin UI; no per-author review identity in the list (DTO has none, v1).
- No `GET /reviews/mine` (documented backend follow-up, out of scope).
- No shelter delete/flag/edit of community shelters in v1.
- No backend, auth-store, or API-contract changes.

## Decisions

1. **One `ReviewGateway` with four methods** — `list(shelterId)`, `add(shelterId, rating,
   comment)`, `updateMine(...)`, `deleteMine(shelterId)`.
   Rationale: mirrors the four controller endpoints 1:1 (`ShelterGateway` pattern). The page
   decides POST-vs-PUT by whether the user already has a review in the loaded list (v1 "mine"
   detection, 06-CONTEXT decision 2) — locally tracked per session.
   Alternative considered: single `save()` that infers method — rejected; explicit methods keep
   the upsert semantics legible in tests and copy.

2. **The detail page owns branching; forms/gateways stay dumb.**
   `ShelterDetailPage` renders the "my review" area based on `AuthStore`: anonymous → login
   prompt (`/login?returnUrl=…`), unverified → verify banner + link, verified → `ReviewForm`.
   `ReviewForm` emits a save event with {rating, comment}; the page calls the gateway and maps
   the result (201 = added, 200 = updated) to copy + refetch.
   Rationale: mirrors M2/M3 page conventions and keeps the write path testable without deep
   component nesting.

3. **`RatingStars` is a presentational component** — display mode (supports half-stars for
   averages, `role="img"` + aria-label "4.2 out of 5") and input mode (1–5 keyboard-operable
   buttons). Reused in the detail header, review rows, and the form.
   Rationale: one accessible implementation, no duplicated star markup.

4. **Refetch shelter + reviews after any successful write.**
   The backend owns aggregates; a cheap full refetch (`get(id)` + `list(id)`) is always
   consistent (06-CONTEXT decision 7) and avoids optimistic-update drift.

5. **`VerifiedGuard` as a functional guard** (M5 addition to `guards.ts`).
   `await AuthStore.init()` then check `isVerified()`; unverified → `/verify?returnUrl=…`
   (matching the authGuard shape). Mirrors the backend's "verified account required" 403.
   Note: only the /submit route uses it now; the detail-page review area branches in-component
   because the user must still *read* reviews while signed out.

6. **Submit form reuses `LeafletService` for the mini-map pick.**
   The service is page-scoped via DI; `/submit` gets its own instance. Click handler sets lat/lng
   signals + drops one draggable/click marker; numeric inputs stay in sync with the picked point.
   Client-side Estonia bbox pre-check mirrors the backend's `GeoPoint.inEstonia` bounds for
   instant feedback; backend 400 still surfaces as a banner (06-CONTEXT decision 1).

7. **Stub → real page at the same route, no route churn.**
   `app.routes.ts` swaps `ShelterPlaceholderPage` for `ShelterDetailPage` at `/shelters/:id`
   (route comment already anticipates this) and adds `/submit`. Marker/list navigation from M4
   keeps working unchanged.

## Risks / Trade-offs

- [No `isMine` in the DTO → "do I already have a review?" is a local guess] → seed the form's
  add/edit mode from the loaded list (match by nothing but the user's own submitted review this
  session); treat POST-200 "updated" as edit confirmation. `GET /reviews/mine` is the documented
  backend follow-up.
- [403 mid-session after guard passed] → uniform ApiError banner + `/verify` link; form input
  preserved (component keeps state on submit failure).
- [Mini-map in a second page doubles map instances] → service is page-scoped and destroyed in
  ngOnDestroy (M4 decision 3); detail/submit pages never coexist on one route.
- [Leaflet default zoom/attribution drift between pages] → share the tile layer config
  (constants) so map and mini-map render identically.
- [Review list unbounded growth per shelter] → v1 renders all (backend has no review paging);
  documented deferral, cheap at community scale.
