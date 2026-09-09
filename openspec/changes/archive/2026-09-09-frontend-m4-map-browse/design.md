## Context

- Backend `GET /api/shelters?source=ALL|REGISTRY|USER` is complete (no paging, ACTIVE rows only,
  Estonia-scale = hundreds of points). The API contract is fixed and already mirrored
  field-for-field in `frontend/src/app/core/models.ts` (`ShelterDto`, `ShelterSource`,
  `ShelterSourceFilter`).
- Frontend M1–M3 established the conventions this milestone must reuse: typed `ApiClient` (throws
  `ApiError`), gateways as the only door to the API, thin components delegating to gateways,
  `BannerComponent` for errors, Vitest + hand-written fakes.
- `MapPage` currently is an M2 placeholder (no map, no data). `leaflet` is not yet a dependency.
- The app is Angular 22 **zoneless** — no `zone.js` change-detection safety net around external
  DOM libraries.

## Goals / Non-Goals

**Goals:**

- Reuse the existing ApiClient/gateway/error conventions rather than introducing new HTTP or
  error plumbing.
- Wrap leaflet in a small, page-scoped service so the component never touches the leaflet API
  directly and no map leaks between visits.
- Keep the component thin: state in signals, layout in the template, business behaviour in the
  service/gateway — the same split M1–M3 used.

**Non-Goals:**

- No detail page, review UI, or submission (M5). `/shelters/:id` is only a routing stub in this
  milestone.
- No clustering library, no paging, no "nearest by location" sorting (backend fetch-all, name
  sort — documented deferrals).
- No status filter UI (v1 lists ACTIVE rows only).
- No ngx-leaflet or MapLibre GL.
- No backend or auth changes.

## Decisions

1. **Call leaflet directly behind `LeafletService`, no ngx-leaflet wrapper.**
   Rationale: the milestone context pins this ("the wrapper stays ~1 release behind Angular
   majors"); direct usage keeps a single dependency and lets `LeafletService` own all lifecycle.
   Alternative considered: ngx-leaflet — rejected for lag/abstraction cost.

2. **`L.divIcon` markers colored by source instead of fixing Leaflet's default icon assets.**
   Rationale: default marker icons break under bundlers (asset-path pitfall); `divIcon` is
   CSS-driven, avoids asset config entirely, and makes REGISTRY=blue / USER=green trivial.
   Alternative considered: patching `L.Icon.Default` paths — rejected as more brittle.

3. **`LeafletService` is page-scoped, one instance per visit, destroyed in `ngOnDestroy`.**
   Rationale: zoneless Angular gives no automatic cleanup; a leaked map keeps DOM/tile listeners
   alive. `create()` on init, `destroy()` on leave, with `renderShelters` replacing markers
   (clear layer group, re-add) on each fetch/filter change.
   Alternative considered: a shared singleton service — rejected; concurrent page instances
   would collide on one container.

4. **Server-side filtering: chips refetch with `?source=`.**
   Rationale: backend already supports the param and owns ACTIVE-row semantics; the UI stays a
   dumb presenter. Alternative considered: fetch-all + client filter — rejected; duplicates
   backend logic and drifts on future server-side rules.

5. **Marker ↔ row sync via a shared selected-shelter signal.**
   `MapPage` holds `selectedShelterId` state; `LeafletService` exposes a `markerClick` callback
   and a `flyTo(lat, lng)`; the list sets selection + flies, markers set selection. Keeps leaflet
   knowledge inside the service and UI state in the component.

6. **`import 'leaflet/dist/leaflet.css'` in `src/styles.scss`.**
   Rationale: global, one-time stylesheet import; marker/tile rendering needs it before first
   paint of the map component. Component-scoped styles cannot safely own a global library css.

7. **`/shelters/:id` stub route now.**
   M5 will replace it with the real detail page; landing it in M4 makes marker/list navigation
   testable end-to-end (`RouterLink` to `/shelters/{id}`).

## Risks / Trade-offs

- [Leaflet tiles require network; offline dev shows grey map] → error/empty states still render;
  page chrome and sidebar (data-driven) work regardless; map tiles failing is not treated as a
  page error.
- [Zoneless + external event callbacks] → leaflet events are DOM-driven (fire outside zone);
  wrap any signal updates in plain handlers (no `NgZone.run` needed), verified by component tests
  that assert state, not zone behaviour.
- [divIcon markers are styled DOM — CSS specificity/leak risk] → scope marker CSS under the
  map page's component styles / dedicated marker class names; legend reuses the same classes so
  visual consistency is single-sourced.
- [Fetch-all at hundreds of rows is fine; thousands would lag] → documented deferral to
  clustering/paging if >5k rows; no action in v1.
- [Map instance recreation churn on rapid filter clicks] → filter changes re-render markers, not
  the map; `destroy()` only on route leave. Refetch is serialized against out-of-order responses
  (stale filter response must not overwrite a newer one).
