/**
 * Field-for-field TypeScript mirror of the backend DTOs/request records.
 *
 * Contract source: docs/agent/02-CONTEXT-API.md, verified against the real
 * Spring controllers/records in src/main/java/ee/sheltermap. JSON is
 * camelCase and maps 1:1 — nothing is renamed or reshaped here.
 *
 * NOTE (deliberate deviation, reported in the M1 hand-off): 02-CONTEXT-API.md
 * types `ShelterDto.address` as `string`, but the backend stores `null` for
 * USER-submitted rows (ShelterController passes null for all registry fields
 * and the Shelter entity keeps that null) — so the honest type here is
 * `string | null`. UI must render it null-safe.
 */

/** The verification channels a user can earn (backend domain enum). */
export type VerificationLevel = 'EMAIL' | 'PHONE' | 'SMART_ID';

/** Lifecycle of a shelter row. */
export type ShelterStatus = 'ACTIVE' | 'INACTIVE';

/** Where a shelter record came from. */
export type ShelterSource = 'PAASETEAMET' | 'MUNICIPALITY' | 'USER';

/** Frontend-facing source filter for GET /api/shelters?source=... */
export type ShelterSourceFilter = 'ALL' | 'REGISTRY' | 'USER';

// ---------------------------------------------------------------------------
// Request bodies (records on the backend, `interface`s here)
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  nationalIdCode: string;
  password: string;
}

export interface LoginRequest {
  /** Phone may be local (`5xxxxxxx`) or +372 form; email is lowercase. */
  emailOrPhone: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  /** The e-mail from the request step — scopes the code to its account. */
  email: string;
  /** The 6-digit code from the e-mail (single-use, 15-min TTL, 5 attempts). */
  code: string;
  newPassword: string;
}

export interface VerifyRequest {
  level: VerificationLevel;
}

export interface VerifyConfirmRequest {
  level: VerificationLevel;
  code: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
}

export interface ChangePhoneRequest {
  newPhone: string;
}

export interface ConfirmChangeRequest {
  code: string;
}

/** Profile edit (PUT /account/profile): identity only, password-confirmed.
 *  Email/phone are deliberately absent — they stay on the cross-channel flows. */
export interface ProfileUpdateRequest {
  name: string;
  nationalIdCode: string;
  currentPassword: string;
}

/**
 * POST /api/geo/resolve (shelter-location-input): the backend-resolved pair
 * of a maps.app.goo.gl short link. Field names match the backend
 * LocationResolvedDto exactly (the parallel backend child owns the record).
 */
export interface LocationResolved {
  latitude: number;
  longitude: number;
}

/**
 * One row of an OSM Nominatim address search (shelter-address-search).
 * NOT a backend DTO: Nominatim is a client-side external service called
 * directly by `GeocodeGateway` (Estonia-restricted). Nominatim jsonv2
 * returns lat/lon as STRINGS — the gateway parses them, so this type is
 * what crosses the gateway boundary (numbers only).
 */
export interface GeocodeResult {
  /** e.g. "Lossi 2, 81001 Tartu, Tartumaa, Estonia" — what the UI shows. */
  displayName: string;
  latitude: number;
  longitude: number;
  /** Nominatim's place type, e.g. "house" / "residential" (shown next to the name). */
  type: string;
}

export interface CreateShelterRequest {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  capacity?: number;
}

/**
 * PUT /api/shelters/{id} (user-contributions): the author's edit of their
 * OWN USER-source shelter. Constraints are field-for-field identical to
 * CreateShelterRequest — the backend keeps them in one shared validation
 * path so create/update cannot drift. Only these five fields are writable;
 * status/source/registry fields/createdAt/createdBy are never.
 */
export interface UpdateShelterRequest {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  capacity?: number;
}

export interface ReviewRequest {
  /** 1..5 */
  rating: number;
  /** <= 500 chars; absent = no comment. */
  comment?: string;
}

// ---------------------------------------------------------------------------
// Trust layer: typed reports + occupancy (shelter-trust-and-reports D1/D2/D4)
// ---------------------------------------------------------------------------

/** Typed shelter report (POST /api/shelters/{id}/reports — verified only). */
export type ShelterReportType =
  'NON_EXISTENT' | 'CLOSED' | 'OPEN_CONFIRMED' | 'WRONG_LOCATION' | 'OTHER';

export interface ReportShelterRequest {
  type: ShelterReportType;
  /** Free text for OTHER (<= 500 chars); ignored by the backend for other types. */
  detail?: string;
}

/** Review-report reasons (POST /api/shelters/{id}/reviews/{reviewId}/reports). */
export type ReviewReportReason = 'FALSY_DATA' | 'NOT_RELEVANT' | 'SPAM' | 'OTHER';

export interface ReportReviewRequest {
  reason: ReviewReportReason;
  /** Free text (<= 500 chars) — the honest detail for any reason. */
  detail?: string;
}

/** Live occupancy bands (PUT /api/shelters/{id}/occupancy — one per user). */
export type OccupancyBand = 'SPACE' | 'GETTING_FULL' | 'FULL';

export interface ReportOccupancyRequest {
  band: OccupancyBand;
}

/**
 * Server-derived occupancy block (D4 — computed at read time over the last
 * 2 h of updated_at). `reportCount` is the number of fresh reports agreeing
 * with `band`: 1 = the UI hedges ("Reported full"), >= 2 = firm ("Full").
 * `null` on the DTO = nothing fresh — the UI shows nothing.
 */
export interface ShelterOccupancy {
  /** The latest fresh band. */
  band: OccupancyBand;
  /** Fresh reports agreeing with that band (1 = lone, >= 2 = firm). */
  reportCount: number;
  /** ISO-8601 instant of the latest report in the window. */
  lastReportedAt: string;
}

/** Display-only flag netting CLOSED vs OPEN_CONFIRMED (D1) — never status. */
export type ShelterStatusFlag = 'REPORTED_CLOSED' | 'CONFIRMED_OPEN';

/**
 * Optional trust filters for GET /api/shelters (D5) — composable with the
 * source filter. Absent fields are omitted from the query string entirely.
 */
export interface ShelterTrustFilter {
  /** reviewed=true — at least one visible (non-hidden) review. */
  reviewed?: boolean;
  /** Minimum average rating (1..5); a shelter with 0 reviews never matches. */
  minRating?: number;
  /** hasCapacity=true — capacity data present. */
  hasCapacity?: boolean;
}

// ---------------------------------------------------------------------------
// Response bodies (DTOs)
// ---------------------------------------------------------------------------

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
}

/**
 * The authenticated user's real profile (GET /account/me) plus the REAL
 * verified claim set (EMAIL/PHONE actually verified, never optimistic).
 * Also the response of PUT /account/profile (the fresh state to adopt).
 */
export interface MeResponse {
  name: string;
  email: string;
  phone: string;
  nationalIdCode: string;
  levels: VerificationLevel[];
}

export interface ShelterDto {
  id: number;
  /** null for USER-submitted rows — registry rows always carry one. */
  address: string | null;
  name: string;
  latitude: number;
  longitude: number;
  status: ShelterStatus;
  source: ShelterSource;
  /** null = no reviews yet (NOT 0). */
  averageRating: number | null;
  reviewCount: number;
  /** ISO-8601 instant. */
  createdAt: string;
  /** USER submissions only. */
  description: string | null;
  /** USER submissions only. */
  capacity: number | null;
  /**
   * True when the shelter's creator exists and has a completed verification;
   * false for registry shelters (no author) and for creators whose account
   * no longer exists (accessibility-and-provenance D3, backend-computed —
   * the UI never re-derives it).
   */
  submitterVerified: boolean;
  /**
   * Non-existence reports (D1): 0 when none, > 0 = the orange reported
   * state (marker + "Reported" badge). Five reach auto-hide server-side —
   * the public list simply no longer contains the row.
   */
  nonexistentReports: number;
  /** CLOSED vs OPEN_CONFIRMED net (D1) — display-only, null = no flag. */
  statusFlag: ShelterStatusFlag | null;
  /** Fresh occupancy (D4); null = nothing fresh in the last 2 h (show nothing). */
  occupancy: ShelterOccupancy | null;
}

/**
 * Detail projection (GET /api/shelters/{id}): every list field plus the
 * CALLER's own occupancy band — the "Report how full" picker's pre-select.
 * Null for guests and anonymous users (and for a user without a live
 * report for this shelter).
 */
export interface ShelterDetailDto extends ShelterDto {
  yourOccupancyBand: OccupancyBand | null;
}

export interface ShelterReviewDto {
  id: number;
  authorName: string;
  /** 1..5 */
  rating: number;
  comment: string | null;
  /** ISO-8601 instant. */
  createdAt: string;
  /**
   * Hidden by five review reports (D2): excluded from the public list,
   * the average and the count. Hidden reviews are NEVER returned to
   * non-authors — the author sees their own row with this flag true and
   * renders it marked "Hidden".
   */
  hidden: boolean;
}

/**
 * One row of GET /account/reviews/mine (user-contributions): the caller's
 * review of a shelter across ALL shelters, carrying the shelter's id + name
 * for navigation plus the review's own fields. A review whose shelter was
 * deleted cannot occur (shelter deletion cascades), so shelterName always
 * resolves.
 */
export interface MyReviewDto {
  shelterId: number;
  shelterName: string;
  /** 1..5 */
  rating: number;
  /** null = no comment. */
  comment: string | null;
  /** ISO-8601 instant. */
  createdAt: string;
  /** ISO-8601 instant. */
  updatedAt: string;
}
