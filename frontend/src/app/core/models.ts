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

/**
 * Community trust state (community-review-queue D1/D2): where a USER row
 * stands in the trust lifecycle. NEW rows are public IMMEDIATELY (amber
 * "just added" treatment, unverified warning); CONFIRMED rows are the
 * checked community rows (green); REJECTED rows are hidden (status
 * INACTIVE) with the admin's reason in `reviewNote`. Registry rows carry
 * CONFIRMED (the column is NOT NULL; the value is informational — the FE
 * only reads review_status on USER rows). There is NO blocking queue:
 * promotion is automatic (a positive community report, audited
 * AUTO_CONFIRM) or the rare admin CONFIRM.
 */
export type ReviewStatus = 'NEW' | 'CONFIRMED' | 'REJECTED';

/**
 * Submitter-declared location kind (community-review-queue D7): PRIVATE =
 * the submitter declared the location is a private home or private shelter offered
 * as a refuge. PRIVATE rows are NOT demoted or hidden — every surface
 * (list row, detail, admin list) shows a "Private location" badge and the
 * detail page carries the resident-offered note. Default PUBLIC.
 */
export type LocationKind = 'PUBLIC' | 'PRIVATE';

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

/** Profile edit (PUT /account/profile): name only, password-confirmed.
 *  Email/phone are deliberately absent — they stay on the cross-channel flows.
 *  No national ID code is collected anywhere (remove-national-id M1). */
export interface ProfileUpdateRequest {
  name: string;
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
  /**
   * The private-home declaration (community-review-queue D7): 'PRIVATE'
   * when the submitter ticks the declaration checkbox, 'PUBLIC' otherwise
   * (the default). Always sent explicitly.
   */
  locationKind?: LocationKind;
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
  levels: VerificationLevel[];
  /**
   * True for the ADMIN-kind account (admin-moderation D1/D2). The kind is
   * the truth (fresh lookup server-side, never a JWT claim); ALWAYS present
   * — false for every regular user.
   */
  isAdmin: boolean;
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
  /**
   * Community trust state (community-review-queue): NEW/CONFIRMED for USER
   * rows (amber/green marker + "Newly added" / "Community-checked" badge);
   * CONFIRMED for registry rows (informational — the label logic only reads
   * it on USER rows). REJECTED rows are never in the public list (INACTIVE).
   */
  reviewStatus: ReviewStatus;
  /** Submitter-declared: PRIVATE rows carry the "Private location" badge. */
  locationKind: LocationKind;
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

/**
 * The owner's view of one of their own shelters (GET /api/shelters/mine):
 * the public list projection (incl. reviewStatus + locationKind) plus the
 * admin's `reviewNote` — the REJECT reason, stored server-side and shown
 * under the row's status badge (community-review-queue D2).
 */
export interface MineShelterDto extends ShelterDto {
  /** The admin's REJECT reason; null when none. */
  reviewNote: string | null;
}

/**
 * POST /admin/shelters/{id}/review body (community-review-queue D2):
 * the rare MANUAL override — the primary trust flow is the automatic
 * community one (AUTO_CONFIRM). CONFIRM sets review_status=CONFIRMED
 * (status untouched); REJECT sets review_status=REJECTED +
 * status=INACTIVE and stores the reason as review_note. `reason` is
 * optional at the wire level — the admin UI requires it for REJECT. 200
 * `{ok:true}`; 404 unknown id; 409 for a non-USER (registry) row.
 */
export interface ReviewShelterRequest {
  action: 'CONFIRM' | 'REJECT';
  reason?: string;
}

/** POST /admin/shelters/{id}/review response body. */
export interface ReviewShelterResponse {
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Admin moderation (admin-moderation D3): the /admin/* DTOs. Every field is
// admin-only data (hidden rows, reporter identity) — never rendered outside
// the /admin feature.
// ---------------------------------------------------------------------------

/**
 * Fresh-occupancy block of the admin shelter list — the contract's
 * `{band, reportedAt, reportCount}` shape (`reportedAt` is what the public
 * ShelterOccupancy calls `lastReportedAt`; same 2 h window, same semantics:
 * reportCount 1 = hedged copy, >= 2 = firm).
 */
export interface AdminOccupancy {
  band: OccupancyBand;
  /** ISO-8601 instant of the latest report in the window. */
  reportedAt: string;
  reportCount: number;
}

/**
 * The admin's view of one shelter row (GET /admin/shelters): the public
 * projection's trust fields plus what the public list hides — INACTIVE rows
 * included, the submitter's name, and the raw capacity.
 */
export interface AdminShelterDto {
  id: number;
  name: string;
  /** null for USER-submitted rows — registry rows always carry one. */
  address: string | null;
  source: ShelterSource;
  /** Includes INACTIVE — the public list never contains them. */
  status: ShelterStatus;
  /** null = no visible reviews yet (NOT 0). */
  rating: number | null;
  reviewCount: number;
  nonexistentReports: number;
  statusFlag: ShelterStatusFlag | null;
  occupancy: AdminOccupancy | null;
  capacity: number | null;
  /** The submitting user's profile name (USER rows only). */
  submitter: string | null;
  /** ISO creation instant — the Unconfirmed queue's "created (newest
   *  first)" column (community-review-queue). */
  createdAt: string;
  /**
   * Community trust state (community-review-queue): the Unconfirmed tab is
   * the client-side `source === 'USER' && reviewStatus === 'NEW'` filter
   * over this list. Registry rows carry CONFIRMED (backfill) — never
   * unconfirmed.
   */
  reviewStatus: ReviewStatus;
  /** The admin's REJECT reason; null when none. */
  reviewNote: string | null;
  /** PRIVATE rows carry the "Private location" badge on this surface too. */
  locationKind: LocationKind;
}

/** Optional filters for GET /admin/shelters (absent = omitted from the URL). */
export interface AdminShelterFilters {
  status?: ShelterStatus;
  source?: ShelterSource;
  /** Name/address substring. */
  q?: string;
}

/**
 * One row of GET /admin/reports (shelter-report queue, newest first).
 * Reporter identity is the user's profile name + email (admin-only data).
 */
export interface AdminShelterReportDto {
  id: number;
  shelterId: number;
  shelterName: string;
  /** The shelter's LIVE status — drives the "restore shelter" shortcut. */
  shelterStatus: ShelterStatus;
  type: ShelterReportType;
  /** Free text for OTHER. */
  detail: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  /** ISO-8601 instant. */
  createdAt: string;
  /** Dismissed rows stay in the queue, dimmed (the admin's audit trail). */
  dismissed: boolean;
}

/**
 * The recorded moderation actions (GET /admin/audit, community-review-
 * queue D4). The trust transitions are CONFIRM (admin manual) and
 * AUTO_CONFIRM (the automatic promotion by a positive community report —
 * the row's actor is the reporting user); the rest are the pre-existing
 * admin actions that all write an audit row in the same transaction.
 */
export type AdminAuditAction =
  | 'STATUS_CHANGE'
  | 'DELETE'
  | 'REPORT_DISMISS'
  | 'REVIEW_HIDE'
  | 'REVIEW_RESTORE'
  | 'CONFIRM'
  | 'AUTO_CONFIRM'
  | 'REJECT';

/**
 * One row of GET /admin/audit (newest first; the backend returns the
 * newest 100 by default, optional limit 1..200). `shelterName` is
 * resolved at READ time by the backend — a deleted shelter's rows carry
 * the resolved "Deleted shelter" text, so the field is a plain string.
 * `previousStatus`/`newStatus` are the review_status transition (DELETE:
 * previous = review_status, new = null) — null when the action has no
 * status pair to show (e.g. report dismiss, review hide/restore).
 */
export interface AdminAuditRow {
  id: number;
  shelterId: number;
  /** Resolved at read time ("Deleted shelter" when the row is gone). */
  shelterName: string;
  action: AdminAuditAction;
  /** The reason given with the action (REJECT, status change). */
  reason: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  /** The actor's profile name (the admin, or the reporting user for
   * AUTO_CONFIRM). */
  moderatorName: string;
  /** ISO-8601 instant. */
  createdAt: string;
}

/**
 * The M3 throttle/abuse alert kinds (GET /admin/alerts, abuse-limits slice
 * 4) — the closed backend vocabulary.
 */
export type AdminAlertKind =
  | 'submission-daily-cap'
  | 'otp-contact-cap'
  | 'near-duplicate';

/**
 * One row of GET /admin/alerts (the M3 admin alerts, newest first).
 * The ring is IN-MEMORY on the backend (W16 — cleared on a restart), so
 * this is a triage view, not a durable log. `subject` is the flagged
 * account or contact ('user:<id>' / 'contact:<value>');
 * `retryAfterSeconds` is present only for the 429 alerts.
 */
export interface AdminAlertRow {
  /** Ring-local monotonic id (row key; resets on backend restart). */
  id: number;
  kind: AdminAlertKind;
  subject: string;
  /** The plain-spoken event (the 409 row names the existing shelter id). */
  detail: string;
  /** The Retry-After the client received (429 alerts only). */
  retryAfterSeconds: number | null;
  /** ISO-8601 instant. */
  at: string;
}

/**
 * One row of GET /admin/review-reports (review-report queue, newest first).
 * The action targets the REVIEW's id (`reviewId`), not this row's id.
 */
export interface AdminReviewReportDto {
  id: number;
  shelterId: number;
  shelterName: string;
  reviewId: number;
  /** 1..5 */
  reviewRating: number;
  reviewComment: string | null;
  reviewHidden: boolean;
  reason: ReviewReportReason;
  /** Free text for the report (any reason). */
  detail: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  /** ISO-8601 instant. */
  createdAt: string;
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
