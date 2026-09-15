# Context — Backend API Contract

**Source of truth:** the real Spring controllers/DTOs in `src/main/java/ee/sheltermap/`
(verified against the codebase — do not invent endpoints). JSON is camelCase.
**Machine-readable companion:** the OpenAPI document — served at `/swagger-ui` in dev/test and
committed as `docs/api/openapi.json` (the complete, current endpoint inventory; this table is the
FE-facing summary).
**Used by:** every milestone. Read this before writing any gateway or model.

## Base URL & CORS

- Base URL from `environment.development.ts` → `''` (same-origin) in dev; the dev
  server proxies `/api`, `/auth`, `/account`, `/verify` to `http://localhost:8080`
  (`proxy.conf.json`) — never hardcode a URL anywhere else.
- Backend CORS allows `http://localhost:5173` (dev, direct testing only). No auth header needed on public GETs.

## Error shape (uniform — every non-2xx is this)

`ErrorResponse`: `timestamp` (ISO-8601), `status` (int), `error` (reason phrase), `message`,
`path`. The frontend `ApiError` mirrors it exactly.

| Status | Meaning                                                                                                                                                                                                                                        | Frontend UX                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 400    | validation / invalid code / invalid token / bad request                                                                                                                                                                                        | show `message`                                                                          |
| 401    | unauthenticated or bad/expired access token                                                                                                                                                                                                    | interceptor: single-flight refresh, retry once, else logout                             |
| 403    | verified account required / not the author / not an admin (any `/admin/*` call by a non-admin)                                                                                                                                                 | banner + link to `/verify` or "author only"; the admin page surfaces the server message |
| 404    | shelter/report not found                                                                                                                                                                                                                       | show "not found" state                                                                  |
| 409    | duplicate email/phone, already-verified level, duplicate target contact, duplicate shelter report (shelter/user/type), 10-active-shelter cap, near-duplicate submission, import-owned registry row (admin status/delete on a registry shelter) | informational banner (the server message)                                               |
| 429    | rate limited (login/register/verify/contact-change, geo resolve, report throttle)                                                                                                                                                              | "slow down" message + retry hint                                                        |
| 500    | internal (never expected)                                                                                                                                                                                                                      | generic error                                                                           |
| 502    | geo resolve: upstream short-link chain timed out / failed (generic — no upstream detail)                                                                                                                                                       | generic "try again later" error                                                         |

> Anti-enumeration: login always says generic "invalid credentials"; password-reset request
> always returns success even for unknown emails; verify/confirm never reveals whether a code was
> valid for a contact that exists. Do not add UX that implies enumeration.

## Endpoints

### Public read (no auth)

| Method + path            | Query/body                                                                                                                                                                                                                                                       | Response                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/shelters`      | `source` = `ALL` (default) \| `REGISTRY` \| `USER`; optional filters `hasCapacity` = `true` and `provenance` = enum value (else 400) — composable with `source`, applied server-side. A stray `minRating` param is ignored (the rating model was removed in V21) | `ShelterDto[]` (**ACTIVE rows only** — auto-hidden shelters are absent)                                                                                         |
| `GET /api/shelters/{id}` | —                                                                                                                                                                                                                                                                | `ShelterDetailDto` or 404 — **all statuses** (the public detail read includes auto-hidden rows and carries the caller's `yourOccupancyBand` + `yourOpenStatus`) |

### Location resolution (`/api/geo`) — JWT required, per-IP rate-limited (5/min)

| Method + path           | Body    | Success                                                                                                                                 | Errors                                                                                                                                                                        |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/geo/resolve` | `{url}` | 200 `{latitude, longitude}` (`LocationResolved`) — 200 only for `maps.app.goo.gl` links whose redirect chain ends in an in-Estonia pair | 400 (ONE generic "could not find coordinates" — no pair / outside Estonia / non-whitelisted host, never enumerated), 401, 429 (per-IP 5/60 s), 502 (generic upstream failure) |

> Only `maps.app.goo.gl` is ever sent (long-form map URLs are parsed client-side
> by `shared/location-input.ts` and NEVER reach this endpoint). The backend follows
> ≤3 redirects and extracts the pair with the same Estonia-bbox rule + auto-swap as
> the frontend parser — the two parsers share one fixture table (their test suites
> must stay in sync).
> Frontend mirror: `GeoGateway.resolve(url)` in `gateways/geo-gateway.ts` (its own
> gateway for its own controller group — kept separate from `ShelterGateway`).

### External: OSM Nominatim (client-side only — shelter-address-search + location-navigation)

NOT a backend endpoint: the `/submit` location section's address search (capture)
and the `/map` address-search anchor (location-navigation M12 — the browse
fallback for the geolocation CTA) call OSM Nominatim DIRECTLY from the browser
(no JWT, no backend hop, no API key). Both consumers go through the same
gateway, so the usage-policy contract is enforced once.

| Method + URL                                     | Query                                               | Success                                                               | Errors                                                                         |
| ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `GET https://nominatim.openstreetmap.org/search` | `format=jsonv2&limit=5&countrycodes=ee&q=<encoded>` | 200 `[{ display_name, lat, lon, type, … }]` (lat/lon are **strings**) | 429 (1 req/s usage policy — the client spaces requests ≥1000 ms), network/CORS |

> The ONLY module that knows this URL is `gateways/geocode-gateway.ts` — it returns
> `GeocodeResult[]` (`core/models.ts`: `{ displayName, latitude, longitude, type }`,
> numbers) and throws `ApiError` (429 / network) the page maps to inline copy.
> The browser sends `Referer`/`Accept-Language` with every fetch (Nominatim's
> app-identification expectation); every search box always renders the required
> attribution "© OpenStreetMap contributors" (openstreetmap.org/copyright) next to
> it, success or failure. A failed /submit search never blocks form submission;
> a failed /map search sets no anchor and changes nothing else.

### Shelter writes & author-scoped (`/api/shelters`) — JWT required

| Method + path               | Body                                                                                       | Success                                                                                                                                                          | Errors                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/shelters`        | `CreateShelterRequest`                                                                     | 201 + `Location` + `ShelterDto` (stored `ACTIVE`/`USER`, `created_by` = caller)                                                                                  | 400 (bbox/fields), 403 (not verified), 409 (caller already has 10 ACTIVE USER shelters — the server message; ADMIN exempt) |
| `GET /api/shelters/mine`    | —                                                                                          | 200 `MineShelterDto[]` (= `ShelterDto` + `reviewNote: string \| null` + `infoRequest: InfoRequestDto \| null`; the caller's USER rows only — NOT part of the public GETs; **ALL statuses**, auto-hidden rows included — the contributions panel marks them) | 401 |
| `PUT /api/shelters/{id}`    | `UpdateShelterRequest` (five writable fields, same constraints as create; bbox re-checked) | 200 updated `ShelterDto`                                                                                                                                         | 400 (bbox/fields), 401, 403 (not the author — registry/legacy rows unmanageable by anyone), 404                            |
| `DELETE /api/shelters/{id}` | —                                                                                          | 204 (the shelter's reports and occupancy cascade)                                                                                                                | 401, 403, 404                                                                                                              |

### Trust reports (shelter / occupancy / open status) — JWT + verified account

The report and occupancy endpoints require a verified registered user (the same gate and 403
vocabulary as submissions) and share ONE per-user throttle: **10 report-type actions per rolling
hour** across every action type (429 — "slow down" copy; a duplicate that 409s consumes no
budget — the duplicate check runs first). The open-status tap requires a verified registered user
too but is deliberately NOT throttled (a tap is a state, not a report action).
`ShelterGateway.report` / `ShelterGateway.reportOccupancy` / `ShelterGateway.putOpenStatus`
are the only door.

| Method + path                        | Body                     | Success                | Errors                                                                                                                                                          |
| ------------------------------------ | ------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/shelters/{id}/reports`    | `ReportShelterRequest`   | 200 `{"damped": bool}` | 400 (validation), 403 (not verified), 404 (unknown shelter), 409 (already reported this shelter with this type — "This report has already been submitted"), 429 |
| `PUT /api/shelters/{id}/occupancy`   | `ReportOccupancyRequest` | 204                    | 403 (not verified), 404 (unknown shelter), 429 — **no 409**: a re-PUT is the update (one live band per user per shelter, latest wins)                           |
| `PUT /api/shelters/{id}/open-status` | `PutOpenStatusRequest`   | 204                    | 400 (bad enum), 403 (not verified), 404 (unknown shelter) — **not throttled**                                                                                   |

> Server-side effects the frontend never computes (the UI renders what the DTO carries —
> never re-derives trust state): the 5th trust-weighted `NON_EXISTENT` shelter report auto-hides
> an ACTIVE shelter (it simply disappears from `GET /api/shelters` and the map); the live
> open/closed signal is the `openStatus` block derived from the open-status taps; occupancy and
> open status are display-only (2 h freshness, latest wins) and never hide, recolor or filter.

### Auth (`/auth`) — all six public (permitAll); five token buckets

| Method + path                       | Body                         | Success                                                                                                                                                      | Errors                                                                                                                                                                  |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`               | `RegisterRequest`            | 201, empty body                                                                                                                                              | 400, 409 (dup email/phone), 429 (per-IP bucket)                                                                                                                         |
| `POST /auth/login`                  | `LoginRequest`               | 200 `TokenResponse`                                                                                                                                          | 401 generic, 429 (per-(IP, contact) **and** per-IP aggregate buckets — both must pass)                                                                                  |
| `POST /auth/refresh`                | `{refreshToken}`             | 200 `TokenResponse` (rotated pair)                                                                                                                           | 401 (revoked/expired)                                                                                                                                                   |
| `POST /auth/logout`                 | `{refreshToken}`             | 204                                                                                                                                                          | 400                                                                                                                                                                     |
| `POST /auth/password-reset/request` | `{email}`                    | 200 `CodeSentDto` always (anti-enumeration; a 6-digit code is e-mailed to a registered account; re-issues throttled per user: 60 s cooldown + 5/UTC-day cap, silent no-op) | 429 (per-(IP, email) bucket)                                                                                                                                            |
| `POST /auth/password-reset/confirm` | `{email, code, newPassword}` | 200                                                                                                                                                          | 400 generic (wrong/expired/used/over-limit/unknown email — indistinguishable), 429 (own per-(IP, email) anti-guess bucket — a 6-digit code must not be brute-forceable) |

> Refresh **rotates**: every refresh issues a new pair and invalidates the old refresh token.
> Password reset revokes **all** refresh tokens for the user.

### Verify (`/verify`) — JWT required, per-IP rate-limited, 60 s cooldown + 5/day cap

| Method + path          | Body                              | Success   | Errors                                                      |
| ---------------------- | --------------------------------- | --------- | ----------------------------------------------------------- |
| `POST /verify/request` | `{level: EMAIL\|PHONE\|SMART_ID}` | 202 + `CodeSentDto` (`{"resendAvailableAfterSeconds": int}`) | 400 (SMART_ID stub), 409 (already verified), 429 (throttle) |
| `POST /verify/confirm` | `{level, code}`                   | 200 empty | 400 wrong/expired, 429                                      |

> Codes: EMAIL = 8-char token, PHONE = 6-digit OTP. Dev senders log to backend console; smtp-pulse
> delivers real email; Twilio delivers real SMS once `.env` credentials are set.

### Account contact change (`/account`) — JWT required, per-IP rate-limited

| Method + path                        | Body         | Success                                    | Errors                                       |
| ------------------------------------ | ------------ | ------------------------------------------ | -------------------------------------------- |
| `POST /account/email-change/request` | `{newEmail}` | 202 `CodeSentDto` — **SMS code → current phone**   | 400 same-as-current, 409 dup, 429            |
| `POST /account/email-change/confirm` | `{code}`     | 200 empty                                  | 400 wrong/expired, 409 dup claimed meanwhile |
| `POST /account/phone-change/request` | `{newPhone}` | 202 `CodeSentDto` — **email code → current email** | 400 same-as-current, 409 dup, 429            |
| `POST /account/phone-change/confirm` | `{code}`     | 200 empty                                  | 400 wrong/expired, 409 dup claimed meanwhile |

> Contact change does **not** revoke sessions (only password reset does).

### Account profile & my data (`/account`) — JWT required, user resolved from the token

| Method + path     | Body | Success                                                                                                                                                     | Errors |
| ----------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `GET /account/me` | —    | 200 `MeResponse` — the REAL profile + REAL verified claims + `isAdmin` (the frontend's single source of truth for name/email/phone/levels + the admin gate) | 401    |
| `PUT /account/profile` | `ProfileUpdateRequest` | 200 fresh `MeResponse` (current password verified against the stored hash BEFORE any write) | 400 (blank name/ID), 401 (wrong current password — nothing updated), 401 unauthenticated |
| `GET /account/export` | —    | 200 `DataExportResponse` (legal/recovery) | 401    |
| `DELETE /account` | —    | 204 (legal/recovery) | 401    |

### Admin moderation (`/admin`) — JWT + ADMIN kind required (admin-moderation)

Every endpoint requires the Bearer JWT **and** the caller's `kind = ADMIN` — the backend
loads the user on EVERY request (a fresh kind lookup, never a JWT claim — a demotion takes
effect on the next request): **401** anonymous → **403** authenticated non-admin → **404**
unknown id → **409** a write on a registry row (import-owned) → **400** malformed body.
All list endpoints answer **200** with a JSON array; all writes answer **204** with no body
EXCEPT `POST /admin/shelters/{id}/review`, which answers 200 `{"ok": true}` (single-row,
idempotent where marked). Reporter identity (profile name + email) is
admin-only data — never rendered outside the `/admin` feature. `AdminGateway` is the only
door.

| Method + path                      | Body / query                                                                                                  | Success                                                                                                                                                                                                                                                      | Errors                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `GET /admin/shelters`              | optional `status`, `source` (exact match) + `q` (name/address substring) — absent fields omitted from the URL | 200 `AdminShelterDto[]` — **every shelter incl. hidden** (id-ordered: `id, name, address, source, status, nonexistentReports, occupancy, capacity, submitter, reviewStatus, reviewNote, locationKind, inaccurate, infoRequest`) | 401, 403                                                                                 |
| `POST /admin/shelters/{id}/status` | `{status: 'ACTIVE' \| 'INACTIVE'}`                                                                            | 204 — manual hide/restore (USER rows only; a **restore disarms auto-hide permanently**)                                                                                                                                                                      | 400 (missing/unknown status), 404, 409 (registry row)                                    |
| `POST /admin/shelters/{id}/review` | `{action: 'CONFIRM' \| 'REJECT', reason?}`                                                                    | 200 `{"ok": true}` — the rare MANUAL trust override: CONFIRM promotes the row to CONFIRMED (status untouched), REJECT hides it (REJECTED + INACTIVE, reason stored as the note)                                                                              | 404, 409 (registry row)                                                                  |
| `DELETE /admin/shelters/{id}`      | —                                                                                                             | 204 — hard delete (reports and occupancy cascade)                                                                                                                                                                                                            | 404, 409 (registry row)                                                                  |
| `GET /admin/reports`               | optional `shelterId`                                                                                          | 200 `AdminShelterReportDto[]` — the shelter-report queue, **newest first**, with the shelter's LIVE status + the reporter's name/email                                                                                                                       | 401, 403, 404 (unknown `shelterId`)                                                      |
| `POST /admin/reports/{id}/dismiss` | —                                                                                                             | 204 — mark resolved (**idempotent**; the row is KEPT, stamped once)                                                                                                                                                                                          | 404                                                                                      |
| `GET /admin/shelters/{id}/history` | —                                                                                                             | 200 `AdminShelterHistoryDto[]` — the row's append-only CREATED/EDITED/DELETED trail, ascending (snapshot name + actor per event)                                                                                                                    | 401, 403, 404                                                            |
| `GET /admin/audit`                 | optional `limit`                                                                                              | 200 `AdminAuditDto[]` — the append-only moderation audit trail, newest first (default 100, limit 1..200)                                                                                                                                                     | 400 (limit), 401, 403                                                    |
| `GET /admin/alerts`                | optional `limit`                                                                                              | 200 `AdminAlertDto[]` — the in-memory throttle/abuse alert ring, newest first (default 50, limit 1..200)                                                                                                                                                     | 400 (limit), 401, 403                                                    |
| `GET /admin/users`                 | —                                                                                                             | 200 `AdminUserDto[]` — every REGISTERED + ADMIN account (id, name, email, kind, suspendedAt)                                                                                                                                                                 | 401, 403                                                                 |
| `POST /admin/users/{id}/suspend`   | —                                                                                                             | 204 — sets `suspended_at` (**idempotent**; REGISTERED only)                                                                                                                                                                                               | 404, 409                                                                 |
| `POST /admin/users/{id}/unsuspend` | —                                                                                                             | 204 — clears `suspended_at` (**idempotent**)                                                                                                                                                                                                              | 404, 409                                                                 |
| `POST /admin/shelters/{id}/request-info` | `{message}`                                                                                             | 204 — the moderator→submitter information request (one exchange per shelter; the reply arrives via `POST /api/shelters/{id}/info-request/reply`)                                                                                                    | 400 (blank), 404, 409 (registry row)                                     |
| `POST /admin/shelters/{id}/mark-inaccurate` | `{reason?}`                                                                                             | 204 — sets the public inaccurate flag (the row STAYS visible; **idempotent**)                                                                                                                                                                             | 400 (reason > 500), 404, 409 (registry row)                              |
| `POST /admin/shelters/{id}/clear-inaccurate` | —                                                                                                        | 204 — clears the flag (**idempotent**)                                                                                                                                                                                                                    | 404, 409 (registry row)                                                  |

## Request models (TS mirrors)

```ts
interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}
interface LoginRequest {
  emailOrPhone: string;
  password: string;
} // phone may be local or +372 form
interface RefreshRequest {
  refreshToken: string;
}
interface PasswordResetRequest {
  email: string;
}
interface PasswordResetConfirmRequest {
  email: string;
  code: string;
  newPassword: string;
}
interface VerifyRequest {
  level: 'EMAIL' | 'PHONE' | 'SMART_ID';
}
interface VerifyConfirmRequest {
  level: 'EMAIL' | 'PHONE' | 'SMART_ID';
  code: string;
}
interface ChangeEmailRequest {
  newEmail: string;
}
interface ChangePhoneRequest {
  newPhone: string;
}
interface ConfirmChangeRequest {
  code: string;
}
interface ProfileUpdateRequest {
  name: string;
  currentPassword: string;
}
interface CreateShelterRequest {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  capacity?: number;
}

interface LocationResolved {
  // POST /api/geo/resolve response — a maps.app.goo.gl short link's resolved pair
  latitude: number;
  longitude: number;
}
interface UpdateShelterRequest {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  capacity?: number;
}
interface ReviewShelterRequest {
  action: 'CONFIRM' | 'REJECT';
  reason?: string; // required by the admin UI for REJECT
}
interface ReportShelterRequest {
  type: ShelterReportType;
  detail?: string; // free text for WRONG_LOCATION / OTHER, ≤500 chars
}
type OccupancyBand = 'SPACE' | 'GETTING_FULL' | 'FULL';
interface ReportOccupancyRequest {
  band: OccupancyBand; // one live band per user per shelter — a re-PUT updates it
}
interface PutOpenStatusRequest {
  state: 'OPEN' | 'CLOSED'; // one live state per user per shelter — a re-PUT updates it
}
```

## Response models (TS mirrors, field-for-field)

```ts
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface MeResponse {
  name: string;
  email: string;
  phone: string;
  levels: VerificationLevel[]; // REAL verified claims, enum order (empty = none)
  isAdmin: boolean; // admin-moderation: always present — true only for the ADMIN-kind
  // account (the backend's fresh kind, never a token claim); gates the nav item
  // + the /admin route; the account page's "Admin" badge
}

interface ShelterDto {
  id: number;
  name: string;
  address: string | null; // null for USER rows — registry rows always carry one
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'INACTIVE'; // the public list is ACTIVE-only; /mine + the detail read carry both
  source: 'PAASETEAMET' | 'MUNICIPALITY' | 'USER';
  createdAt: string; // ISO-8601 (V5)
  description: string | null; // USER submissions only
  capacity: number | null; // USER submissions only
  submitterVerified: boolean; // backend-computed (creator has a completed verification;
  // registry rows false) — the four-valued provenance badge reads THIS, never re-derived
  nonexistentReports: number; // the NON_EXISTENT subset of the community reports (> 0 = the
  // orange reported state: marker + "Reported" badge); five reach auto-hide server-side
  openStatus: OpenStatusDto | null; // fresh (≤ 2 h) open/closed block; null = nothing fresh
  occupancy: ShelterOccupancy | null; // fresh (≤ 2 h) occupancy block; null = show nothing
  reviewStatus: 'NEW' | 'CONFIRMED' | 'REJECTED'; // community trust state (registry rows carry
  // CONFIRMED; REJECTED rows are absent from the ACTIVE-only public list)
  locationKind: 'PUBLIC' | 'PRIVATE'; // submitter's private-home declaration (display-only badge)
  reportCount: number; // the TOTAL community shelter-report count (all types)
  lastVerifiedAt: string | null; // per-entry verification stamp; null = never verified
  inaccurate: boolean; // moderator "mark inaccurate" flag (the row stays visible)
}

interface OpenStatusDto {
  state: 'OPEN' | 'CLOSED'; // the latest fresh state
  reportedAt: string; // ISO-8601
  reportCount: number; // fresh reports agreeing with it: 1 = hedged copy, 2+ = firm
}

interface ShelterOccupancy {
  band: OccupancyBand; // the latest fresh band (ties: user id)
  reportCount: number; // fresh reports agreeing with it: 1 = hedged copy, 2+ = firm
  lastReportedAt: string; // ISO-8601 — the recency suffix ("12 min ago") formats this
}

interface ShelterDetailDto extends ShelterDto {
  // GET /api/shelters/{id} (the detail read): the CALLER's own live reports — the
  // pickers' pre-select; null for guests, anonymous callers and no-report users
  yourOccupancyBand: OccupancyBand | null;
  yourOpenStatus: 'OPEN' | 'CLOSED' | null;
}

interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

interface AdminOccupancy {
  // the fresh (<= 2 h) occupancy block of the ADMIN shelter list — the same
  // contract shape as ShelterOccupancy, except the field is reportedAt
  // (what the public projection calls lastReportedAt); same window, same
  // semantics (reportCount 1 = hedged copy, >= 2 = firm)
  band: OccupancyBand;
  reportedAt: string; // ISO-8601
  reportCount: number;
}

interface AdminShelterDto {
  // GET /admin/shelters — every shelter, ALL statuses (INACTIVE included);
  // the public projection's trust fields plus what the public list hides
  id: number;
  name: string;
  address: string | null; // null for USER rows — registry rows always carry one
  source: ShelterSource;
  status: 'ACTIVE' | 'INACTIVE';
  nonexistentReports: number;
  occupancy: AdminOccupancy | null;
  capacity: number | null;
  submitter: string | null; // the creator's profile name (USER rows only)
  reviewStatus: 'NEW' | 'CONFIRMED' | 'REJECTED';
  reviewNote: string | null; // the admin's REJECT reason
  locationKind: 'PUBLIC' | 'PRIVATE';
  inaccurate: boolean;
  infoRequest: AdminInfoRequestDto | null; // the moderator→submitter exchange
}

interface AdminShelterFilters {
  status?: 'ACTIVE' | 'INACTIVE'; // exact match; absent = omitted from the URL
  source?: ShelterSource;
  q?: string; // name/address substring (server-side)
}

interface AdminShelterReportDto {
  // one row of GET /admin/reports (newest first); reporter identity is admin-only
  id: number;
  shelterId: number;
  shelterName: string;
  shelterStatus: 'ACTIVE' | 'INACTIVE'; // the shelter's LIVE status — drives the restore shortcut
  type: ShelterReportType;
  detail: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  createdAt: string; // ISO-8601
  dismissed: boolean; // dismissed rows stay in the queue, dimmed (the audit trail)
}
```

Notes:

- `SmsTestController`/`EmailTestController` (`/dev/*`) are **dev-only diagnostics** — never
  surfaced in the UI.
- Registry rows carry `address` and no description/capacity; USER rows carry description/capacity
  and no external registry id. UI must render `null` gracefully.
- `GET /api/shelters` fetches all ACTIVE rows (no paging) — hundreds of points, fine for the
  map. Auto-hidden (INACTIVE) rows are absent from the public list and the map; `GET
/api/shelters/mine` and `GET /api/shelters/{id}` still carry them (the contributions panel
  marks the owner's hidden rows; the detail read is public for all statuses).
