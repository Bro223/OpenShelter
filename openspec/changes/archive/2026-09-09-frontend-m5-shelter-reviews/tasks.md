## 1. Review gateway

- [x] 1.1 Implement `ReviewGateway` (`src/app/gateways/review-gateway.ts`): `list(shelterId)`, `add(shelterId, rating, comment)`, `updateMine(shelterId, rating, comment)`, `deleteMine(shelterId)` against `/api/shelters/{id}/reviews[/mine]` via the existing `ApiClient` (following `ShelterGateway`/`AuthGateway` patterns: typed Promises, `ApiError` on failure); verify it type-checks
- [x] 1.2 Add `review-gateway.spec.ts` with hand-written `ApiClient` fakes: `list` GETs the shelter's reviews; `add` POSTs the review body; `updateMine` PUTs to `/mine`; `deleteMine` DELETEs `/mine`; non-2xx rejects with `ApiError`; verify the spec passes

## 2. RatingStars + ReviewForm

- [x] 2.1 Implement `RatingStars` (`src/app/features/shelter/rating-stars.*`): display mode with half-star averages + numeric value, `role="img"` and aria-label "4.2 out of 5"; input mode with keyboard-operable 1–5 selection; verify it type-checks
- [x] 2.2 Add `rating-stars.spec.ts`: whole/fractional/null display, aria-label correctness, input click + keyboard changes selection; verify the spec passes
- [x] 2.3 Implement `ReviewForm` (`src/app/features/shelter/review-form.*`): star picker (1–5) + comment (≤ 500 chars) with counter, emits a save event with `{rating, comment}`; verify it type-checks
- [x] 2.4 Add `review-form.spec.ts`: required rating, comment length enforcement, save emission; verify the spec passes

## 3. Shelter detail page

- [x] 3.1 Implement `ShelterDetailPage` (`src/app/features/shelter/shelter-detail-page.*`) replacing the M4 placeholder at `/shelters/:id`: parallel fetch of shelter + reviews (via `ShelterGateway.get` + `ReviewGateway.list`) into signals; header (name, source badge, address when present, rating summary via `RatingStars`, description/capacity when USER); loading/empty/404/error states per shared conventions; review list (author, rating, comment, date); "My review" area branched on `AuthStore` (anonymous → login prompt with returnUrl; unverified → verify banner + link; verified → `ReviewForm`); after add/update/delete → refetch shelter + reviews; verify it type-checks
- [x] 3.2 Add `shelter-detail-page.spec.ts` with fake gateways + real `AuthStore`-shaped fakes: renders shelter + reviews; null address/averageRating render safely ("No ratings yet"); anonymous sees login prompt; unverified sees verify prompt; verified sees the form; a submitted review appears after refetch (201 add / 200 update both handled); delete removes it; 404 shows not-found; gateway rejection shows the error banner with chrome intact; verify the spec passes

## 4. Submit page + guard

- [x] 4.1 Add `VerifiedGuard` to `src/app/core/guards.ts` (functional guard awaiting `AuthStore.init()`, `isVerified()` → allow, else redirect `/verify?returnUrl=…`); add a guard spec for the three branches; verify tests pass
- [x] 4.2 Implement `SubmitShelterPage` (`src/app/features/shelter/submit-shelter-page.*`) at `/submit` (AuthGuard + VerifiedGuard): name (required, ≤200), description (≤2000), capacity (optional 1–100 000), location picked on a mini-map via a page-scoped `LeafletService` instance (click → lat/lng signals, sync numeric inputs), client-side Estonia bbox pre-check for instant feedback; on `ShelterGateway.create` 201 → navigate(`/shelters/{newId}`); on 401/403/400 → error banner with input preserved; verify it type-checks
- [x] 4.3 Add `submit-shelter-page.spec.ts` with a fake gateway: valid submit navigates to the new shelter; out-of-Estonia point shows an inline error without sending; out-of-range capacity is rejected inline; backend 400/403 surfaces as a banner with input preserved; verify the spec passes

## 5. Routes + puml/docs sync

- [x] 5.1 Update `app.routes.ts`: `/shelters/:id` → `ShelterDetailPage` (real page, same path), add `/submit` with `AuthGuard` + `VerifiedGuard` (before the `**` fallback); verify M4's marker/list navigation still reaches the detail route
- [x] 5.2 Reconcile `frontend/docs/agent/06-CONTEXT-SHELTER.md`, `frontend/docs/01-frontend-architecture.puml`, and `frontend/docs/05-shelter-review-flow.puml` with the implemented classes/routes/flows — update the puml/docs to reflect any real deviation (never silently drift), re-render diagrams with `./render.sh` if needed, and report exactly what changed

## 6. Milestone acceptance

- [x] 6.1 Run `npx ng test --watch=false` green across the whole suite (existing M1–M4 + new specs) and confirm TypeScript is clean; note the count delta vs the M4 baseline
- [x] 6.2 Manual live check against the backend on :8080 (if reachable): browse to a registry shelter detail, register → verify EMAIL via dev sender → submit a community shelter → review it → see the rating summary update → delete the review; report results
