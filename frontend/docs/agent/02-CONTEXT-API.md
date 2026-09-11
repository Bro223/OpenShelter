# Context — Backend API Contract

**Source of truth:** the real Spring controllers/DTOs in `src/main/java/ee/sheltermap/`
(verified against the codebase — do not invent endpoints). JSON is camelCase.
**Used by:** every milestone. Read this before writing any gateway or model.

## Base URL & CORS

- Base URL from `environment.development.ts` → `''` (same-origin) in dev; the dev
  server proxies `/api`, `/auth`, `/account`, `/verify` to `http://localhost:8080`
  (`proxy.conf.json`) — never hardcode a URL anywhere else.
- Backend CORS allows `http://localhost:5173` (dev, direct testing only). No auth header needed on public GETs.

## Error shape (uniform — every non-2xx is this)

`ErrorResponse`: `timestamp` (ISO-8601), `status` (int), `error` (reason phrase), `message`,
`path`. The frontend `ApiError` mirrors it exactly.

| Status | Meaning                                                                                  | Frontend UX                                                 |
| ------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 400    | validation / invalid code / invalid token / bad request                                  | show `message`                                              |
| 401    | unauthenticated or bad/expired access token                                              | interceptor: single-flight refresh, retry once, else logout |
| 403    | verified account required / not the author / cannot report your own review               | banner + link to `/verify` or "author only"                 |
| 404    | shelter/review not found                                                                 | show "not found" state                                      |
| 409    | duplicate email/phone, already-verified level, duplicate target contact, duplicate report (shelter/user/type or review/user), 10-active-shelter cap | informational banner (the server message) |
| 429    | rate limited (login/register/verify/contact-change, geo resolve, report throttle)        | "slow down" message + retry hint                            |
| 500    | internal (never expected)                                                                | generic error                                               |
| 502    | geo resolve: upstream short-link chain timed out / failed (generic — no upstream detail) | generic "try again later" error                             |

> Anti-enumeration: login always says generic "invalid credentials"; password-reset request
> always returns success even for unknown emails; verify/confirm never reveals whether a code was
> valid for a contact that exists. Do not add UX that implies enumeration.

## Endpoints

### Public read (no auth)

| Method + path                           | Query/body                                                                                                                        | Response                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /api/shelters`                     | `source` = `ALL` (default) \| `REGISTRY` \| `USER`; optional trust filters `reviewed` = `true`, `minRating` = `1..5` (else 400), `hasCapacity` = `true` — composable with `source`, applied server-side | `ShelterDto[]` (**ACTIVE rows only** — auto-hidden shelters are absent)                    |
| `GET /api/shelters/{id}`                | —                                                                                                                                 | `ShelterDetailDto` or 404 — **all statuses** (the public detail read includes auto-hidden)  |
| `GET /api/shelters/{shelterId}/reviews` | —                                                                                                                                 | `ShelterReviewDto[]` (hidden reviews excluded, except the caller's own — marked `hidden`)   |

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

### External: OSM Nominatim (client-side only — shelter-address-search)

NOT a backend endpoint: the `/submit` location section's address search calls OSM
Nominatim DIRECTLY from the browser (no JWT, no backend hop, no API key).

| Method + URL                                     | Query                                               | Success                                                               | Errors                                                                         |
| ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `GET https://nominatim.openstreetmap.org/search` | `format=jsonv2&limit=5&countrycodes=ee&q=<encoded>` | 200 `[{ display_name, lat, lon, type, … }]` (lat/lon are **strings**) | 429 (1 req/s usage policy — the client spaces requests ≥1000 ms), network/CORS |

> The ONLY module that knows this URL is `gateways/geocode-gateway.ts` — it returns
> `GeocodeResult[]` (`core/models.ts`: `{ displayName, latitude, longitude, type }`,
> numbers) and throws `ApiError` (429 / network) the page maps to inline copy.
> The browser sends `Referer`/`Accept-Language` with every fetch (Nominatim's
> app-identification expectation); the UI always renders the required attribution
> "© OpenStreetMap contributors" (openstreetmap.org/copyright) next to the search
> box, success or failure. A search failure never blocks form submission.

### Shelter writes & author-scoped (`/api/shelters`) — JWT required

| Method + path               | Body                                                                                       | Success                                                                         | Errors                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/shelters`        | `CreateShelterRequest`                                                                     | 201 + `Location` + `ShelterDto` (stored `ACTIVE`/`USER`, `created_by` = caller) | 400 (bbox/fields), 403 (not verified), 409 (caller already has 10 ACTIVE USER shelters — the server message; ADMIN exempt) |
| `GET /api/shelters/mine`    | —                                                                                          | 200 `ShelterDto[]` (the caller's USER rows only — NOT part of the public GETs; **ALL statuses**, auto-hidden rows included — the contributions panel marks them)  | 401                                                                                             |
| `PUT /api/shelters/{id}`    | `UpdateShelterRequest` (five writable fields, same constraints as create; bbox re-checked) | 200 updated `ShelterDto`                                                        | 400 (bbox/fields), 401, 403 (not the author — registry/legacy rows unmanageable by anyone), 404 |
| `DELETE /api/shelters/{id}` | —                                                                                          | 204 (the shelter's reviews cascade)                                             | 401, 403, 404                                                                                   |

### Review writes — JWT + verified account

| Method + path                                   | Body            | Success                                                                       | Errors                                |
| ----------------------------------------------- | --------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| `POST /api/shelters/{shelterId}/reviews`        | `ReviewRequest` | 201 (created) or 200 (upsert adopted an existing review) + `ShelterReviewDto` | 400 (bounds), 403 (not verified), 404 |
| `PUT /api/shelters/{shelterId}/reviews/mine`    | `ReviewRequest` | 200 `ShelterReviewDto`                                                        | 400, 403 (not the author), 404        |
| `DELETE /api/shelters/{shelterId}/reviews/mine` | —               | 204                                                                           | 403, 404                              |

### Trust reports (shelter / review / occupancy) — JWT + verified account

All three require a verified registered user (the same gate and 403 vocabulary as
submissions), all three return **204 No Content** on success, and all three share ONE
per-user throttle: **10 report-type actions per rolling hour** across every action type
(429 — "slow down" copy; a duplicate that 409s consumes no budget — the duplicate check
runs first). `ShelterGateway.report` / `ShelterGateway.reportOccupancy` and
`ReviewGateway.reportReview` are the only door.

| Method + path                                         | Body                     | Success | Errors                                                                                                                                  |
| ----------------------------------------------------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/shelters/{id}/reports`                     | `ReportShelterRequest`   | 204     | 403 (not verified), 404 (unknown shelter), 409 (already reported this shelter with this type — "This report has already been submitted"), 429 |
| `PUT /api/shelters/{id}/occupancy`                    | `ReportOccupancyRequest` | 204     | 403 (not verified), 404 (unknown shelter), 429 — **no 409**: a re-PUT is the update (one live band per user per shelter, latest wins) |
| `POST /api/shelters/{id}/reviews/{reviewId}/reports`  | `ReportReviewRequest`    | 204     | 403 (not verified, or the caller's OWN review — "You cannot report your own review"), 404 (unknown shelter/review), 409 (already reported this review), 429 |

> Server-side effects the frontend never computes (the UI renders what the DTO carries —
> never re-derives trust state): the 5th `NON_EXISTENT` shelter report auto-hides an ACTIVE
> shelter (it simply disappears from `GET /api/shelters` and the map); `CLOSED` /
> `OPEN_CONFIRMED` net to the display-only `statusFlag`; the 5th review report sets
> `hidden_at` (the review drops out of the list, the average and the count — the author
> still sees it, marked hidden); occupancy is display-only (2 h freshness, latest band
> wins) and never hides, recolors or filters.

### Auth (`/auth`) — all six public (permitAll); five token buckets

| Method + path                       | Body                         | Success                                                                                                                                                      | Errors                                                                                                                                                                  |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`               | `RegisterRequest`            | 201, empty body                                                                                                                                              | 400, 409 (dup email/phone), 429 (per-IP bucket)                                                                                                                         |
| `POST /auth/login`                  | `LoginRequest`               | 200 `TokenResponse`                                                                                                                                          | 401 generic, 429 (per-(IP, contact) **and** per-IP aggregate buckets — both must pass)                                                                                  |
| `POST /auth/refresh`                | `{refreshToken}`             | 200 `TokenResponse` (rotated pair)                                                                                                                           | 401 (revoked/expired)                                                                                                                                                   |
| `POST /auth/logout`                 | `{refreshToken}`             | 204                                                                                                                                                          | 400                                                                                                                                                                     |
| `POST /auth/password-reset/request` | `{email}`                    | 200 always (anti-enumeration; a 6-digit code is e-mailed to a registered account; re-issues throttled per user: 60 s cooldown + 5/UTC-day cap, silent no-op) | 429 (per-(IP, email) bucket)                                                                                                                                            |
| `POST /auth/password-reset/confirm` | `{email, code, newPassword}` | 200                                                                                                                                                          | 400 generic (wrong/expired/used/over-limit/unknown email — indistinguishable), 429 (own per-(IP, email) anti-guess bucket — a 6-digit code must not be brute-forceable) |

> Refresh **rotates**: every refresh issues a new pair and invalidates the old refresh token.
> Password reset revokes **all** refresh tokens for the user.

### Verify (`/verify`) — JWT required, per-IP rate-limited, 60 s cooldown + 5/day cap

| Method + path          | Body                              | Success   | Errors                                                      |
| ---------------------- | --------------------------------- | --------- | ----------------------------------------------------------- |
| `POST /verify/request` | `{level: EMAIL\|PHONE\|SMART_ID}` | 202 empty | 400 (SMART_ID stub), 409 (already verified), 429 (throttle) |
| `POST /verify/confirm` | `{level, code}`                   | 200 empty | 400 wrong/expired, 429                                      |

> Codes: EMAIL = 8-char token, PHONE = 6-digit OTP. Dev senders log to backend console; smtp-pulse
> delivers real email; Twilio delivers real SMS once `.env` credentials are set.

### Account contact change (`/account`) — JWT required, per-IP rate-limited

| Method + path                        | Body         | Success                                    | Errors                                       |
| ------------------------------------ | ------------ | ------------------------------------------ | -------------------------------------------- |
| `POST /account/email-change/request` | `{newEmail}` | 202 empty — **SMS code → current phone**   | 400 same-as-current, 409 dup, 429            |
| `POST /account/email-change/confirm` | `{code}`     | 200 empty                                  | 400 wrong/expired, 409 dup claimed meanwhile |
| `POST /account/phone-change/request` | `{newPhone}` | 202 empty — **email code → current email** | 400 same-as-current, 409 dup, 429            |
| `POST /account/phone-change/confirm` | `{code}`     | 200 empty                                  | 400 wrong/expired, 409 dup claimed meanwhile |

> Contact change does **not** revoke sessions (only password reset does).

### Account profile & my data (`/account`) — JWT required, user resolved from the token

| Method + path               | Body                   | Success                                                                                                                                   | Errors                                                                                   |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /account/me`           | —                      | 200 `MeResponse` — the REAL profile + REAL verified claims (the frontend's single source of truth for name/email/phone/nationalId/levels) | 401                                                                                      |
| `PUT /account/profile`      | `ProfileUpdateRequest` | 200 fresh `MeResponse` (current password verified against the stored hash BEFORE any write)                                               | 400 (blank name/ID), 401 (wrong current password — nothing updated), 401 unauthenticated |
| `GET /account/reviews/mine` | —                      | 200 `MyReviewDto[]` — the caller's reviews across ALL shelters (shelterId + shelterName for navigation; empty list when none)             | 401                                                                                      |

## Request models (TS mirrors)

```ts
interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  nationalIdCode: string;
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
  nationalIdCode: string;
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
interface ReviewRequest {
  rating: number;
  comment?: string;
} // 1..5, ≤500 chars
type ShelterReportType = 'NON_EXISTENT' | 'CLOSED' | 'OPEN_CONFIRMED' | 'WRONG_LOCATION' | 'OTHER';
interface ReportShelterRequest {
  type: ShelterReportType;
  detail?: string; // free text for OTHER, ≤500 chars
}
type ReviewReportReason = 'FALSY_DATA' | 'NOT_RELEVANT' | 'SPAM' | 'OTHER';
interface ReportReviewRequest {
  reason: ReviewReportReason;
  detail?: string; // optional detail for any reason, ≤500 chars
}
type OccupancyBand = 'SPACE' | 'GETTING_FULL' | 'FULL';
interface ReportOccupancyRequest {
  band: OccupancyBand; // one live band per user per shelter — a re-PUT updates it
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
  nationalIdCode: string;
  levels: VerificationLevel[]; // REAL verified claims, enum order (empty = none)
}

interface ShelterDto {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'INACTIVE'; // the public list is ACTIVE-only; /mine + the detail read carry both
  source: 'PAASETEAMET' | 'MUNICIPALITY' | 'USER';
  averageRating: number | null; // null = no reviews yet (NOT 0)
  reviewCount: number;
  createdAt: string; // ISO-8601 (V5)
  description: string | null; // USER submissions only
  capacity: number | null; // USER submissions only
  submitterVerified: boolean; // backend-computed (creator has a completed verification;
  // registry rows false) — the four-valued provenance badge reads THIS, never re-derived
  nonexistentReports: number; // community "does not exist" reports (> 0 = the orange
  // reported state: marker + "Reported" badge); five reach auto-hide server-side
  statusFlag: 'REPORTED_CLOSED' | 'CONFIRMED_OPEN' | null; // closed/confirmed net — display only
  occupancy: ShelterOccupancy | null; // fresh (≤ 2 h) occupancy block; null = show nothing
}

interface ShelterOccupancy {
  band: OccupancyBand; // the latest fresh band (ties: user id)
  reportCount: number; // fresh reports agreeing with it: 1 = hedged copy, 2+ = firm
  lastReportedAt: string; // ISO-8601 — the recency suffix ("12 min ago") formats this
}

interface ShelterDetailDto extends ShelterDto {
  // GET /api/shelters/{id} (the detail read): the CALLER's own live band — the
  // "Report how full" picker's pre-select; null for guests, anonymous callers and
  // no-report users
  yourOccupancyBand: OccupancyBand | null;
}

interface ShelterReviewDto {
  id: number;
  authorName: string;
  rating: number; // 1..5
  comment: string | null;
  createdAt: string;
  hidden: boolean; // community-hidden (5th report); hidden rows are returned to the
  // AUTHOR ONLY (marked) — excluded from list, average and count for everyone else
}

interface MyReviewDto {
  // one row of GET /account/reviews/mine
  shelterId: number;
  shelterName: string;
  rating: number; // 1..5
  comment: string | null;
  createdAt: string;
  updatedAt: string; // ISO-8601
}

interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
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
