# Context — Shelter Detail, Reviews & Submission (M5–M6, M8 contributions)

**Source diagrams:** `01-frontend-architecture.puml` (`ShelterDetailPage`, `SubmitShelterPage`,
`ReviewForm`, `RatingStars`, `ReviewGateway`, `/shelters/:id` + `/submit` routes),
`05-shelter-review-flow.puml` (sequence).
**Used by:** M5. M6 polish notes at the end.

## Purpose

- **Detail page** (public): one shelter with its rating summary, description/capacity (USER rows),
  registry meta when present, and the community reviews.
- **Reviews** (authenticated **and verified** users): 1–5 stars + optional comment. One review per
  user per shelter — the backend **upserts** (`POST` → 201 new or 200 updated); `PUT /mine` and
  `DELETE /mine` are author-only.
- **Submission** (verified users): add a USER shelter with name, location, description,
  capacity. The location section (shelter-location-input) captures the point four ways —
  a smart text input (coordinate string / DMS / long-form map URL, parsed client-side by
  `shared/location-input.ts`), a "Use my location" geolocation button, a
  `maps.app.goo.gl` short link (resolved by `POST /api/geo/resolve`), or the mini-map
  click/drag — all writing ONE shared location signal; resolved coordinates are shown
  read-only. The backend enforces the Estonia bbox (400) and stores it ACTIVE immediately
  (no moderator — ratings are the moderation).

## Classes to create

| Type                | Kind                                                   | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReviewGateway`     | service (`gateways/`)                                  | `list(shelterId)`, `add(shelterId, rating, comment)` (POST), `updateMine(shelterId, rating, comment)` (PUT), `deleteMine(shelterId)` (DELETE).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `RatingStars`       | component (`features/shelter/`)                        | display-only stars (half-star for averages) + numeric; accessible `role="img"` + aria-label "4.2 out of 5".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `ReviewForm`        | component                                              | input mode for the signed-in user's own review: star picker (1–5, keyboard operable) + comment ≤ 500 chars. Emits `save {rating, comment}` and `deleteReview`; the parent (detail page) calls the gateway.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ShelterDetailPage` | component (route `/shelters/:id`, public)              | Fetches shelter + reviews in parallel. Header: name, source badge, address, rating summary (`averageRating null` → "no ratings yet"), description/capacity when present. **Location section**: a small static map (page-scoped `LeafletService`, flown to the shelter at `SHELTER_ZOOM` 16, one non-interactive marker — no picking, no marker navigation). Reviews list (author name + date). "My review" section (the page owns this branch): anonymous → "log in to review" (`/login?returnUrl=`); unverified → banner + link `/verify`; else `ReviewForm` (add mode; edit mode once the user's review is known this session).                                                                                                                                                                                                                                                                                                                                                                             |
| `SubmitShelterPage` | component (route `/submit`, AuthGuard + VerifiedGuard) | Form: name (≤200), description (≤2000), capacity (1–100000, optional), location — ONE shared location signal (shelter-location-input) written by four capture modes: (1) smart text input (coordinate strings, DMS, labels, long-form map URLs — Google `q`/`ll`/`daddr`/`saddr`/`!3d…!4d…`/`/@lat,lng`, Apple `ll=`, Bing `q=` — parsed client-side by the pure `parseLocationInput` in `shared/location-input.ts`; `maps.app.goo.gl` short links instead resolve via `GeoGateway.resolve` → POST /api/geo/resolve with a pending "Resolving…" state), (2) "Use my location" geolocation (high accuracy, 10 s timeout, no cache; per-error-code inline messages + an https-only guard), (3) mini-map click/drag (page-scoped `LeafletService`), (4) read-only coordinate readout + source/swapped/accuracy hints. A FAILED capture clears the pin (never a silent stale pin); the Estonia bbox pre-check is instant inline feedback (backend re-checks). On 201 → navigate to the new shelter's detail page. |

## Key decisions

1. **The backend owns correctness; the UI owns clarity.** Duplicate/race 409s, 403s, bbox 400s
   surface as banners from the ApiError message. The form validates eagerly (lengths, bbox,
   rating range) but never hides a server rejection.
2. **Review "mine" detection.** The review list has no `isMine`/userId field (v1 contract) — the
   UI shows the editable form to every verified user; PUT/DELETE /mine on a nonexistent review →
   backend 404. Handle by: show the form in "add" mode after a user's first review (if the POST
   returns 200 "updated", it was an edit), and offer "delete my review" only when the user has
   actually submitted one (track locally per session). _(M8 — RESOLVED: the deferred_
   `GET /reviews/mine` _endpoint is now BUILT as_
   `GET /account/reviews/mine` _(backend, `/account` group) — the account page's
   "My contributions" panel lists the user's reviews across ALL shelters with shelter id + name,
   so cross-shelter management no longer needs per-session tracking.)_
3. **Rating average is null, not 0** — display "no ratings yet" instead of 0 stars.
4. **Author-only, server-enforced.** Never render delete buttons for other people's reviews —
   there is no author identity in the DTO (v1), so the safest UI is: reviews are read-only lists
   plus a personal upsert form. This matches "the rating system IS the moderation".
5. **Submission is verified-gated in the UI AND the backend.** `VerifiedGuard` on `/submit`
   mirrors the 403. If a 403 still arrives (claim expired), banner → `/verify`.
6. **USER vs REGISTRY rendering.** Registry rows: address + (eventually) county metadata; USER
   rows: description/capacity + "added by the community". _(M8 supersedes the "never show a
   delete/flag UI on shelters in v1" caveat for the AUTHOR: their own USER-source shelters get
   edit/delete in the account page's contributions panel — registry rows stay read-only for
   everyone.)_
7. **After review/submit success, refetch** the shelter (rating summary changed) — cheap at this
   scale and always consistent.
8. **Location: one shared state, one pure parser** (shelter-location-input). Every capture mode
   (typed / link / geolocation / map pick) writes the single `location` signal; the marker and
   the read-only readout read it. `parseLocationInput` (shared) is pure + fixture-table-tested,
   the bbox gate is the safety net, and a failed capture clears the pin so the form can never
   submit a stale point. Short links are the ONLY network path (backend resolves them);
   long-form URLs are never fetched client-side.

## M8 — My contributions (account page, `user-contributions`)

One new **panel on the account page** (`/account`), not a new route — the account stays the
single place for "what's mine" (M8 design decision 6). A dedicated `ContributionsPanel`
component is embedded in the account page template after the existing change panels;
`AccountPage` stays lean. _(2026-09-08 arch pass: the panel's files now live in
`features/account/` — the original `features/contributions/` folder was deleted to kill all
cross-feature imports.)_

| Type                 | Kind                                             | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ShelterGateway`     | service (`gateways/`, extended)                  | M8 adds `mine()` (GET `/api/shelters/mine`), `update(id, request)` (PUT `/api/shelters/{id}`), `remove(id)` (DELETE `/api/shelters/{id}` → 204) alongside `list`/`get`/`create`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `AccountGateway`     | service (`gateways/`, extended)                  | M8 adds `myReviews()` (GET `/account/reviews/mine` → `MyReviewDto[]`) alongside the M1 profile/verification methods.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ContributionsPanel` | component (`features/account/` — see note above) | Two lists, loaded in parallel, each with its own loading/empty/error states: **shelters** (name, created date, rating/review count, View → `/shelters/{id}`, inline-expanding edit form — name/description/capacity/lat/lng with client-side required + bounds mirroring the backend → `update`, two-step delete whose copy notes the reviews are removed too → `remove`) and **reviews** (shelter name link, read-only `RatingStars`, comment, updated date, inline rating 1–5 + comment edit → `ReviewGateway.updateMine`, two-step delete → `deleteMine`). Empty shelter list: "You haven't submitted any shelters yet" + link to `/submit`. Success updates the row in place from the response; 400/403/404 surface via the existing `bannerMessage` pattern with the row unchanged. OnPush + signals, design tokens only. |

## M6 polish notes (expanded in 07-STEPS)

- Design tokens (colors/type/spacing) applied consistently; responsive (map on desktop,
  stacked on mobile).
- Empty/loading/error states audited across all pages; favicon + `<title>` per route; language:
  English copy for v1 with an i18n seam if cheap.
- Prod build: `environment.ts` (production) gets the deployed API URL; `ng build` output goes to
  `dist/`; a deploy (nginx serving static + proxying `/api`) is a follow-up outside this pack.

## Contracts with other contexts

- Auth gating: `AuthStore.authenticated()/isVerified()` (M2), guards in `01 puml`.
- Public read endpoints and DTO fields: `02-CONTEXT-API.md`.
- Map (M4) reaches here via the selected row's "View details" link (a
  marker/row click itself only zooms the map and stays on /map); after submit,
  navigate to `/shelters/{id}`.
