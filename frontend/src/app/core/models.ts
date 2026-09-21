/**
 * Field-for-field TypeScript mirror of the backend DTOs/request records.
 *
 * Contract source: docs/agent/02-CONTEXT-API.md, verified against the real
 * Spring controllers/records in src/main/java/ee/sheltermap. JSON is
 * camelCase and maps 1:1 — nothing is renamed or reshaped here.
 *
 * NOTE (deliberate deviation): 02-CONTEXT-API.md
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

/**
 * The map's source filter — the server-side `?source=` param. REGISTRY =
 * PAASETEAMET + MUNICIPALITY rows; USER = community submissions.
 */
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
 *  No national ID code is collected anywhere (remove-national-id). */
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
 * path so create/update cannot drift. Only these fields are writable;
 * status/source/registry fields/createdAt/createdBy are never.
 */
export interface UpdateShelterRequest {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  capacity?: number;
  /**
   * The private-home declaration (community-review-queue D7): absent/null
   * keeps the row's current value (backend contract). The shared form
   * (M5) always sends it explicitly — checked = PRIVATE, unchecked =
   * PUBLIC — exactly like the create payload.
   */
  locationKind?: LocationKind;
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

/**
 * The write outcome of a shelter report (POST /api/shelters/{id}/reports)
 * (community-self-moderation D4): `damped` is true when the stored
 * report is a self-interested rival vote (the reporter holds their own
 * other USER listing of the same place) — recorded and flagged in the
 * admin queue, counting zero toward the weighted auto-hide tally.
 */
export interface ShelterReportResult {
  damped: boolean;
}

/**
 * The fresh (≤ 2 h) open/closed aggregate (M9 community pulse): the PLAIN
 * fresh-tap counts + the server-derived TRUST-WEIGHTED share of votes that
 * say OPEN (0..1; 0.5 = an exact equal split → the gauge's straight-up
 * needle). `null` on the detail = nothing fresh (the explicit empty state).
 */
export interface CommunityPulseOpenClosed {
  /** Fresh OPEN taps (plain count). */
  openReports: number;
  /** Fresh CLOSED taps (plain count). */
  closedReports: number;
  /** Trust-weighted share of fresh open/closed votes for OPEN (0..1). */
  openShare: number;
}

/**
 * The fresh (≤ 2 h) how-full aggregate (M9 community pulse): the PLAIN
 * fresh-report counts per band + the server-derived TRUST-WEIGHTED
 * position from empty to full (SPACE = 0, GETTING_FULL = 0.5, FULL = 1;
 * 0.5 = an exact empty/full tie → the gauge's straight-up needle).
 * `null` on the detail = nothing fresh.
 */
export interface CommunityPulseOccupancy {
  /** Fresh SPACE reports (plain count). */
  spaceReports: number;
  /** Fresh GETTING_FULL reports (plain count). */
  gettingFullReports: number;
  /** Fresh FULL reports (plain count). */
  fullReports: number;
  /** Trust-weighted position from empty to full (0..1). */
  fullness: number;
}

/**
 * One recent-report log entry (M9 community pulse): what was reported
 * (the OPEN/CLOSED taps, the SPACE/GETTING_FULL/FULL bands) and when.
 * NO reporter identity — the public surface says "a community member".
 */
export interface CommunityPulseRecentReport {
  kind: 'OPEN' | 'CLOSED' | 'SPACE' | 'GETTING_FULL' | 'FULL';
  /** ISO-8601 instant of the report. */
  reportedAt: string;
}

/**
 * The community pulse (M9 — report aggregation UI): the detail-read fresh
 * (≤ 2 h) aggregates behind the detail page's gauges + recent log. The
 * plain counts feed the visible count lines (the accessible equivalent of
 * the needle); the weighted shares feed the needle angles. `null`
 * sub-blocks = nothing fresh (the UI renders the explicit empty state,
 * never a neutral gauge). Detail-read only — absent/null on list rows and
 * from an older BE (treat as null, the same FE-ships-ahead rule as
 * `openStatus`).
 */
export interface CommunityPulse {
  openClosed: CommunityPulseOpenClosed | null;
  occupancy: CommunityPulseOccupancy | null;
  /** The merged recent log (newest first, capped at 10 server-side). */
  recentReports: CommunityPulseRecentReport[];
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

/** The shelter's current open/closed state (fresh-report derived). */
export type OpenState = 'OPEN' | 'CLOSED';

/**
 * PUT /api/shelters/{id}/open-status body: the caller's live open/closed
 * report (one per user, latest edit wins — the same upsert contract as the
 * occupancy band). Verified accounts only (403), 404 unknown shelter.
 */
export interface PutOpenStatusRequest {
  state: OpenState;
}

/**
 * Server-derived open/closed block — computed at read
 * time over the last 2 h of open-status reports, the same window and
 * reportCount semantics as the occupancy block: 1 = the UI hedges
 * ("Reported closed"), >= 2 = firm ("Closed")). `null` on the DTO =
 * nothing fresh — the UI falls back to the lifecycle status. On ALL list
 * rows and the detail projection.
 */
export interface OpenStatusDto {
  /** The latest fresh state. */
  state: OpenState;
  /** ISO-8601 instant of the latest report in the window. */
  reportedAt: string;
  /** Fresh reports agreeing with `state` (1 = lone, >= 2 = firm). */
  reportCount: number;
}

/**
 * Optional trust filters for GET /api/shelters (D5) — composable with the
 * source filter. Absent fields are omitted from the query string entirely.
 * (The `reviewed` filter is gone with the review model; "Open" is a
 * client-side chip — the BE has no param for it.)
 */
export interface ShelterTrustFilter {
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

/**
 * The submitter's verification depth (submitter-verification-badge): the
 * single confirmed channel, or 'FULL' at two or more. Server-derived on every
 * read — see {@link ShelterDto.submitterVerification}.
 */
export type SubmitterVerification = 'EMAIL' | 'PHONE' | 'SMART_ID' | 'FULL';

export interface ShelterDto {
  id: number;
  /** null for USER-submitted rows — registry rows always carry one. */
  address: string | null;
  name: string;
  latitude: number;
  longitude: number;
  status: ShelterStatus;
  source: ShelterSource;
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
   * The submitter's verification DEPTH (submitter-verification-badge),
   * backend-derived on every read from the author's CURRENT claims: 'EMAIL' /
   * 'PHONE' / 'SMART_ID' when exactly one channel is confirmed, 'FULL' at two
   * or more, null when there is nothing to describe (registry rows, a deleted
   * account, an author with no confirmed channel yet). A row added at one
   * channel upgrades to 'FULL' the moment the author confirms a second —
   * nothing is stored on the row, so the badge cannot go stale.
   *
   * Optional on purpose: the UI treats absent and null identically (no badge),
   * so an older backend that omits the field renders exactly as before.
   */
  submitterVerification?: SubmitterVerification | null;
  /**
   * Non-existence reports (D1): 0 when none, > 0 = the orange reported
   * state (marker + "Reported" badge). Five reach auto-hide server-side —
   * the public list simply no longer contains the row.
   */
  nonexistentReports: number;
  /** Fresh open/closed; null = nothing fresh in the last 2 h. */
  openStatus: OpenStatusDto | null;
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
  /**
   * TOTAL community shelter-report count, all types (last-verified-meta
   * backend-computed) — the `nonexistentReports` subset is what drives
   * the orange "Reported" badge; this is the whole community-signal count.
   */
  reportCount: number;
  /**
   * Per-entry "last verified" stamp (last-verified-meta, backend-
   * computed, ISO-8601): registry rows carry the newest non-failed import
   * of their source (a NOT_MODIFIED 304 re-check verifies; FAILED/SKIPPED
   * do not); community rows the newest non-submitter OPEN_CONFIRMED check
   * or confirming moderation action. `null` = never verified (the
   * "not yet verified" signal for NEW community rows).
   */
  lastVerifiedAt: string | null;
  /**
   * "Mark inaccurate" moderator flag (moderation-dashboard-completion
   * backend-computed from the V20 stamp): a marked row stays
   * visible with status and trust state untouched — the UI renders the
   * single-sourced warning on the unverified-treatment surfaces.
   */
  inaccurate: boolean;
}

/**
 * Detail projection (GET /api/shelters/{id}): every list field plus the
 * CALLER's own live reports — the "Report how full" picker's pre-select
 * (`yourOccupancyBand`) and the "Report open/closed" picker's pre-select
 * (`yourOpenStatus`). Both null for guests and anonymous users (and for a
 * user without a live report for this shelter).
 */
export interface ShelterDetailDto extends ShelterDto {
  yourOccupancyBand: OccupancyBand | null;
  yourOpenStatus: OpenState | null;
  /**
   * The community pulse (M9 — detail read only): the fresh-window gauge
   * aggregates + the anonymized recent-report log. Undefined from an
   * older BE — treat as null (the FE ships ahead of the API safely).
   */
  communityPulse?: CommunityPulse | null;
}

/**
 * The owner's view of one of their own shelters (GET /api/shelters/mine):
 * the public list projection (incl. reviewStatus + locationKind) plus the
 * admin's `reviewNote` — the REJECT reason, stored server-side and shown
 * under the row's status badge (community-review-queue D2) — and the row's
 * moderator→submitter information request (`infoRequest`;
 * null when none). The exchange is private: the public list/detail DTOs
 * carry it as null and this surface is the only place it renders for the
 * submitter.
 */
export interface MineShelterDto extends ShelterDto {
  /** The admin's REJECT reason; null when none. */
  reviewNote: string | null;
  /** The pending (or answered) moderator question; null when none. */
  infoRequest: InfoRequestDto | null;
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

/**
 * The moderator→submitter information request of a row:
 * the admin asks a question on a USER shelter, the submitter answers ONCE
 * on their own row, and the row is kept after the reply (audit posture —
 * never deleted). `replyMessage`/`repliedAt` are null while the request is
 * still open.
 */
export interface InfoRequestDto {
  /** The moderator's question (≤ 2000 chars). */
  message: string;
  /** ISO-8601 instant the admin asked. */
  requestedAt: string;
  /** The submitter's one-time answer; null = still open. */
  replyMessage: string | null;
  /** ISO-8601 instant of the answer; null = still open. */
  repliedAt: string | null;
}

/**
 * The admin's view of the information request (GET /admin/shelters):
 * the exchange plus the asking admin's profile name ("Unknown" after the
 * account's erasure — no FK server-side).
 */
export interface AdminInfoRequestDto extends InfoRequestDto {
  requestedByName: string;
}

// ---------------------------------------------------------------------------
// Admin moderation (admin-moderation D3): the /admin/* DTOs. Every field is
// admin-only data (hidden rows, reporter identity) — never rendered outside
// the /admin feature.
// ---------------------------------------------------------------------------

/**
 * Fresh-occupancy block of the admin shelter list — the SAME wire record
 * as the public list's `ShelterOccupancy` (`ShelterDto.Occupancy`:
 * `{band, reportCount, lastReportedAt}`), same 2 h window, same semantics
 * (reportCount 1 = hedged copy, >= 2 = firm). The field names must match
 * the API byte for byte: this block used to read a `reportedAt` the API
 * never sends, so every row rendered "just now" (reviews/11 F1) —
 * `core/models-contract.spec.ts` now pins the field set against the
 * OpenAPI snapshot so the drift cannot return.
 */
export interface AdminOccupancy {
  band: OccupancyBand;
  /** ISO-8601 instant of the latest report in the window (wire field
   *  `lastReportedAt` — the API sends no `reportedAt`). */
  lastReportedAt: string;
  reportCount: number;
}

/**
 * The admin's view of one account (GET /admin/users):
 * REGISTERED + ADMIN rows only (guests have no credentials to suspend,
 * so the backend skips them). `suspendedAt` null = active. E-mail is
 * admin-only data — never rendered outside the /admin feature.
 */
export interface AdminUserDto {
  id: number;
  name: string | null;
  email: string | null;
  kind: 'GUEST' | 'REGISTERED' | 'ADMIN';
  suspendedAt: string | null;
}

/**
 * The admin's view of one shelter row (GET /admin/shelters): the public
 * projection's trust fields plus what the public list hides — INACTIVE rows
 * included, the submitter's name, and the raw capacity. The backend is
 * id-ordered (auto-increment id = creation order) and carries NO creation
 * timestamp on this projection (verified against the live API) — the
 * Unconfirmed queue orders by id, newest first.
 */
export interface AdminShelterDto {
  id: number;
  name: string;
  /** null for USER-submitted rows — registry rows always carry one. */
  address: string | null;
  source: ShelterSource;
  /** Includes INACTIVE — the public list never contains them. */
  status: ShelterStatus;
  nonexistentReports: number;
  occupancy: AdminOccupancy | null;
  capacity: number | null;
  /** The submitting user's profile name (USER rows only). */
  submitter: string | null;
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
  /**
   * "Mark inaccurate" moderator flag — the same value as on
   * the public DTO; the admin list is where the mark is managed.
   */
  inaccurate: boolean;
  /** The row's moderator→submitter information request;
   *  null when none. Carries the submitter's reply once given (the row is
   *  kept after the reply — audit posture). */
  infoRequest: AdminInfoRequestDto | null;
}

/** Optional filters for GET /admin/shelters (absent = omitted from the URL). */
export interface AdminShelterFilters {
  status?: ShelterStatus;
  /** The frontend-facing source grouping the backend now speaks
   *  (REGISTRY = Päästeamet + municipality imports; USER = community
   *  submissions) — the same grouping as the public map filter. */
  source?: ShelterSourceFilter;
  /** Name/address substring. */
  q?: string;
  /** Optional page size: 1..200; absent = no paging. */
  limit?: number;
  /** Optional offset into the (filtered) list: >= 0. */
  offset?: number;
}

/** A paged admin list result: the page's rows PLUS the un-paged total
 *  the server reports in the X-Total-Count header (the admin Shelters +
 *  Guidance lists — the page count is derived from the total, so an
 *  out-of-range page can be told apart from a truly empty scope). */
export interface PagedRows<T> {
  /** The rows of the requested page (empty when the page is past the end). */
  rows: T[];
  /** The number of rows in the (search-filtered) scope, WITHOUT paging. */
  total: number;
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
  /** Dampened self-interested negative vote: stored + flagged, counts 0. */
  damped: boolean;
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
  | 'REJECT'
  | 'USER_SUSPEND'
  | 'USER_UNSUSPEND'
  | 'MARK_INACCURATE'
  | 'CLEAR_INACCURATE'
  // Guidance/media rows (crisis-guidance D12): the subject is the row's
  // subjectLabel snapshot (both shelterId and subjectUserId are null) —
  // the tab's "Subject" column renders it as the shelterName text.
  | 'GUIDANCE_PUBLISH'
  | 'GUIDANCE_UNPUBLISH'
  | 'GUIDANCE_DELETE'
  // Manual ordering (guidance-manual-order D6): one row per changing
  // reorder, the subject is the fixed label "Guidance post order".
  | 'GUIDANCE_REORDER'
  | 'MEDIA_DELETE';

/**
 * One row of GET /admin/audit (newest first; the backend returns the
 * newest 100 by default, optional limit 1..200). `shelterName` is
 * resolved at READ time by the backend — a deleted shelter's rows carry
 * the resolved "Deleted shelter" text, so the field is a plain string.
 * `previousStatus`/`newStatus` are the review_status transition (DELETE:
 * previous = review_status, new = null) — null when the action has no
 * status pair to show (e.g. report dismiss).
 *
 * The trail is append-only — a row persists after the subject is resolved,
 * so the UI renders "(after reply)" when the shelter is already back on the
 * map. `action` reflects the transition at the time the row was written (or
 * a bulk import). The review-model values (REVIEW_HIDE / REVIEW_RESTORE)
 * can never reach the tab: V21 deleted exactly those moderation rows when
 * it dropped the review model — the union keeps the values only for the
 * label map's vocabulary.
 */
export interface AdminAuditRow {
  id: number;
  /** null on user-scoped rows (USER_SUSPEND / USER_UNSUSPEND). */
  shelterId: number | null;
  /** Resolved at read time: a shelter row's name ("Deleted shelter" when
   *  the row is gone) OR the suspended account ("Account: name (email)" /
   *  "Deleted account") — the tab's "Subject" column. */
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

/** One server-parsed field change of an EDITED history row.
 *  `from`/`to` are display strings — null = the field was absent
 *  (e.g. a first-set description). */
export interface AdminShelterHistoryFieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

/**
 * One row of GET /admin/shelters/{id}/history (ascending over
 * the shelter's lifecycle): CREATED on submission, EDITED on an owner PUT
 * that moved fields (the changes are parsed server-side — the UI renders,
 * never parses JSON), DELETED on a user or admin hard delete. The history
 * of a deleted shelter still serves (the rows' shelter_id dangles
 * legally); `shelterName` is the SNAPSHOT at event time (a rename does not
 * rewrite the earlier rows). `actorName` is "Unknown" after the actor's
 * account was erased (no FK).
 */
export interface AdminShelterHistoryEvent {
  id: number;
  /** The shelter's name as it was when the event happened. */
  shelterName: string;
  actorName: string;
  action: 'CREATED' | 'EDITED' | 'DELETED';
  /** Empty for CREATED/DELETED; exactly the moved fields for EDITED. */
  changes: AdminShelterHistoryFieldChange[];
  /** ISO-8601 instant. */
  createdAt: string;
}

/**
 * The throttle/abuse alert kinds (GET /admin/alerts, abuse-limits) — the
 * closed backend vocabulary.
 */
export type AdminAlertKind = 'submission-daily-cap' | 'otp-contact-cap' | 'near-duplicate';

/**
 * One row of GET /admin/alerts (the admin alerts, newest first).
 * The ring is IN-MEMORY on the backend (cleared on a restart), so
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

/** One shelter the caller owns, as returned by GET /account/export. */
export interface DataExportShelter {
  id: number;
  name: string;
  /** null for USER submissions — a registry-only field. */
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  status: string;
  reviewStatus: string;
  locationKind: string;
  description: string | null;
  capacity: number | null;
  /** ISO-8601 instant. */
  createdAt: string;
}

/** GET /account/export — the caller's own data in one document. */
export interface DataExportResponse {
  profile: {
    name: string;
    email: string;
    /** null for the provisioned admin (no phone route). */
    phone: string | null;
    levels: VerificationLevel[];
  };
  shelters: DataExportShelter[];
}

/** One data_imports audit row — the newest (GET /api/data-source). */
export interface DataSourceLastImport {
  /** ISO-8601 instant. */
  at: string;
  /** OK | FAILED | NOT_MODIFIED | SKIPPED */
  status: string;
  /** Upstream version stamp (HTTP Last-Modified / ETag), when published. */
  sourceVersion: string | null;
  recordsAdded: number;
  recordsUpdated: number;
  recordsRemoved: number;
}

/** GET /api/data-source — where the map's official data comes from. */
export interface DataSourceDto {
  sourceName: string;
  officialUrl: string;
  lastImport: DataSourceLastImport | null;
}

// ---------------------------------------------------------------------------
// Crisis guidance (public /blog reads — crisis-guidance D3/D4)
// ---------------------------------------------------------------------------

/**
 * The public guidance post — GET /api/guidance (the index: PUBLISHED only,
 * pinned first, then publishedAt descending; `bodyHtml` is null on the
 * index rows) and GET /api/guidance/{slug} (one published post by slug,
 * `bodyHtml` carried). A draft slug and an unknown slug answer the SAME
 * 404 — a draft's existence is never revealed.
 */
export interface GuidancePostDto {
  slug: string;
  title: string;
  /**
   * The stored (server-sanitized, jsoup allowlist) HTML body. The index
   * does not expose it (null); the detail carries it for the [innerHTML]
   * render (which auto-sanitizes again client-side).
   */
  bodyHtml: string | null;
  /** The serving URL of the hero image; null when the post has none. */
  heroImageUrl: string | null;
  /** The stored hero alt text; null when the post has no hero. */
  heroImageAlt: string | null;
  /** Pinned posts sort first in the public index. */
  pinned: boolean;
  /**
   * The SERVED translation's locale (bilingual-guidance): the language the
   * reader is actually reading. The post's own locale unless the reader
   * asked for one the post lacks — then the default-locale translation is
   * served with `localeFallback` set (a 200 with the flag, never a 404).
   */
  locale: string;
  /** ISO-8601 instant. */
  publishedAt: string;
  /** ISO-8601 instant. */
  updatedAt: string;
  /**
   * Each locale that HAS a translation, mapped to that translation's slug
   * (bilingual-guidance) — the field a language switcher follows to open
   * the same post in another language. Populated on the detail; `null` on
   * the index (kept lean). The map only carries locales that have a
   * translation, so the values are never null.
   */
  alternates: Record<string, string> | null;
  /**
   * `true` when the reader's requested locale had NO translation and the
   * server served the default-locale one instead (bilingual-guidance) —
   * a 200 with the flag, never a 404: a language switch must not dead-end
   * on a "no such page" error.
   */
  localeFallback: boolean;
}

// ---------------------------------------------------------------------------
// Crisis guidance (admin authoring — crisis-guidance D3/D8/D9): the
// /admin/guidance* + /admin/media* DTOs. Every field is admin-only data
// (drafts, hero references, asset inventory) — never rendered outside the
// /admin feature.
// ---------------------------------------------------------------------------

/** The publication state of a guidance post (backend GuidanceStatus). */
export type GuidanceStatus = 'DRAFT' | 'PUBLISHED';

/**
 * The admin's view of one guidance post (GET /admin/guidance — unscoped:
 * every post, drafts included, in the stored manual order; scoped via
 * `?locale=` (admin-locale-scope): only the posts that HAVE content in that
 * locale — a translation row there or the post's home being it — carrying
 * that locale's content — and GET /admin/guidance/{id}, the id-keyed detail
 * the admin form edits by, the same optional `?locale=` serving that
 * locale's content). `bodyHtml` is the STORED (server-sanitized) HTML —
 * the editor round-trips exactly what is stored. The hero fields are the
 * full reference: `heroImageId` (the media-library picker's key), the
 * serving `heroImageUrl` and the stored alt — all three null when the post
 * has no hero. NOTE: the admin projection carries NO `publishedAt` (the
 * publication instant is public state — the /api/guidance index is where
 * it lives).
 */
export interface AdminGuidancePostDto {
  id: number;
  slug: string;
  title: string;
  /** The stored (sanitized) HTML body. */
  bodyHtml: string;
  /**
   * The CONTENT locale of this row: the locale being shown/edited. In an
   * unscoped (or home-scoped) read it equals {@link homeLocale}; in a
   * foreign-locale-scoped read it is that locale (the row's).
   */
  locale: string;
  /**
   * The post's OWN (home) locale — never the content locale of a scoped
   * read (admin-locale-scope). A foreign-locale edit never moves the home
   * (400); only the post's own-locale edit can.
   */
  homeLocale: string;
  status: GuidanceStatus;
  /** Pinned posts sort first in the public index. */
  pinned: boolean;
  /**
   * The shared stored manual position (guidance-manual-order). UNSCOPED
   * renumber writes keep this a dense 1..N; a LOCALE-SCOPED reorder is
   * slot-preserving (the visible posts take the submitted order in their
   * slots of the global order, the other languages' posts keep their
   * values) — after one, the values are no longer a contiguous 1..N. The
   * admin table shows it as the post's position (admin-locale-scope).
   */
  sortOrder: number;
  /** The media-library key of the hero image; null = no hero. */
  heroImageId: number | null;
  heroImageUrl: string | null;
  /** The stored hero alt; null when the post has no hero. */
  heroImageAlt: string | null;
  /**
   * The PENDING hero import (guidance-hero-import): the admin-supplied
   * remote URL stored with the draft, fetched, validated and stored by
   * the server at the next publish (null when the hero is a plain library
   * reference — a published post always carries none; the V25 CHECK makes
   * a pending URL on a published post impossible).
   */
  heroImportUrl: string | null;
  /** The author's user id; null after the account's erasure. */
  createdBy: number | null;
  /** ISO-8601 instant. */
  createdAt: string;
  /** ISO-8601 instant. */
  updatedAt: string;
}

/**
 * PUT /admin/guidance/order body (guidance-manual-order D5; admin-locale-scope
 * extends it with the optional `?locale=`). UNSCOPED: the FULL ordered id
 * list of every guidance post, in exactly the order the admin table shows
 * it (pinned block first, then the rest) — the server validates it as a
 * permutation of all post ids before writing (an unknown, duplicate or
 * stale list 400s and changes nothing), then renumbers 1..N in one
 * transaction. SCOPED: the FULL ordered id list of the posts VISIBLE IN the
 * locale (a subset, not a permutation of every post) — the visible posts are
 * rewritten into their slots of the GLOBAL order (slot-preserving; the other
 * languages' posts are untouched). Resubmitting the confirmed order is a
 * no-op (204, no audit row).
 */
export interface ReorderGuidanceRequest {
  postIds: number[];
}

/**
 * POST /admin/guidance body (crisis-guidance D3/D4/D5/D11). `title` +
 * `body` are required (400 otherwise); `slug` omitted = the server derives
 * one from the title (a given slug is used exactly as given — collision →
 * 409 naming it); `locale` omitted = the server default (D11); the alt is
 * MANDATORY IFF a hero is set (the cross-field 400 rule); an explicit
 * `status` PUBLISHED makes the create a one-shot write-and-publish
 * (DRAFT otherwise).
 */
export interface CreateGuidancePostRequest {
  /** Required, at most 255 characters. */
  title: string;
  /** Omitted when blank (the server derives it from the title). */
  slug?: string;
  /** Required (the stored value is the sanitizer output). */
  body: string;
  /** At most 5 characters (a language code like `en`/`et`). */
  locale?: string;
  pinned: boolean;
  /** null = no hero (the alt must be null too — the 400 pairing rule). */
  heroImageId: number | null;
  /** At most 300 characters; null when there is no hero. */
  heroImageAlt: string | null;
  /**
   * The pending hero import (guidance-hero-import): omitted when blank
   * (no pending import). An http(s) URL the server fetches, validates and
   * stores at publish time instead of picking a library asset — the alt is
   * mandatory iff a hero of EITHER kind is set (the 400 pairing rule). A
   * one-shot PUBLISHED create imports it in the create call itself (a
   * failed import fails the create: 400 policy/non-image, 413 over cap,
   * 502 unfetchable).
   */
  heroImportUrl?: string;
  /** DRAFT by default; an explicit PUBLISHED publishes in one call. */
  status: GuidanceStatus;
}

/**
 * PUT /admin/guidance/{id} body: a FULL replace of the editable fields,
 * same constraints as create. `slug` omitted = KEEP the current one (a
 * given slug that another post holds → 409). `status` is deliberately ABSENT
 * — the publication state moves only through the publish/unpublish
 * endpoints (their stamps own publishedAt).
 */
export interface UpdateGuidancePostRequest {
  title: string;
  /** Omitted when blank (the post keeps its current slug). */
  slug?: string;
  body: string;
  locale?: string;
  pinned: boolean;
  /** null = clear the hero (the previous asset stays in the library, D8). */
  heroImageId: number | null;
  /** null when there is no hero (the 400 pairing rule, both directions). */
  heroImageAlt: string | null;
  /**
   * The pending hero import (guidance-hero-import): omitted (or null) when
   * blank — that CLEARS a pending import (the PUT is a full replace). A
   * non-null URL on an already-published post is a 400 (unpublish first —
   * the V25 CHECK); the import is consumed at the next publish, where it
   * supersedes `heroImageId`.
   */
  heroImportUrl?: string;
}

/**
 * One guidance translation (bilingual-guidance, V26) — the row set behind
 * GET /admin/guidance/{id}/translations (in locale order; the post's
 * own-locale row is always present — the source of the public detail's
 * `alternates` map) and the response of the create / update endpoints.
 * `bodyHtml` is the stored (server-sanitized) HTML — the editor
 * round-trips exactly what is stored. `heroImageAlt` is the per-locale alt
 * for the post's SHARED hero image (the image reference itself is
 * post-level — it is not a translation field).
 */
export interface GuidanceTranslationDto {
  id: number;
  postId: number;
  /** The translation's locale (a language code like `en`/`et`). */
  locale: string;
  /** The public slug of THIS translation (unique within the locale). */
  slug: string;
  /** At most 255 characters. */
  title: string;
  /** The stored (sanitized) HTML body. */
  bodyHtml: string;
  /** The per-locale hero alt; null when the post has no hero. */
  heroImageAlt: string | null;
  /** ISO-8601 instant. */
  createdAt: string;
  /** ISO-8601 instant. */
  updatedAt: string;
}

/**
 * POST /admin/guidance/{id}/translations body (bilingual-guidance) —
 * creates a translation of the post in a NEW locale. `locale` is required
 * (at most 5 characters; the post must NOT already have a translation
 * there — 409); `slug` omitted = the server generates one from the title
 * (a given slug must be free WITHIN the locale — 409 naming it); the alt
 * is the per-locale alt for the post's shared hero (null = none).
 */
export interface CreateGuidanceTranslationRequest {
  /** Required, at most 5 characters (a language code like `en`/`et`). */
  locale: string;
  /** Omitted when blank (the server generates it from the title). */
  slug?: string;
  /** Required, at most 255 characters. */
  title: string;
  /** Required (the stored value is the sanitizer output). */
  body: string;
  /** At most 300 characters; null when there is no hero. */
  heroImageAlt: string | null;
}

/**
 * PUT /admin/guidance/{id}/translations/{locale} body (bilingual-guidance)
 * — a FULL replace of the translation named by the PATH locale (the locale
 * never moves here). `slug` omitted = KEEP the current one (a given slug
 * another translation in the locale holds → 409 naming it); the body is
 * re-sanitized server-side; `heroImageAlt` null clears the per-locale alt.
 */
export interface UpdateGuidanceTranslationRequest {
  /** Omitted when blank (the translation keeps its current slug). */
  slug?: string;
  /** Required, at most 255 characters. */
  title: string;
  /** Required (the stored value is the sanitizer output). */
  body: string;
  /** At most 300 characters; null clears the per-locale alt. */
  heroImageAlt: string | null;
}

/**
 * One media-library asset (crisis-guidance D8): GET /admin/media (every
 * asset, newest first), POST /admin/media (201 — the stored asset), and
 * DELETE /admin/media/{id} (200 — the pre-delete snapshot). `url` is the
 * public serving URL (`/api/media/<stored filename>`) — the admin
 * thumbnails and the public pages both load it. `originalFilename` is the
 * client-supplied display metadata (never part of a path); `storedFilename`
 * is the server-generated name. `reusedBy` = the number of guidance posts
 * currently using the asset as their hero image (0 for an unused asset —
 * it is listed like any other).
 */
export interface MediaAssetDto {
  id: number;
  /** The public serving URL (`/api/media/<stored filename>`). */
  url: string;
  /** The server-generated name (32 hex + sniffed extension). */
  storedFilename: string;
  /** The client-supplied display metadata. */
  originalFilename: string;
  /** image/jpeg | image/png | image/webp (the sniffed type). */
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
  /** ISO-8601 instant. */
  createdAt: string;
  /** How many posts use the asset as their hero image (0 = unused). */
  reusedBy: number;
}

/* ------------------------------------------------------------------ */
/* Site texts (site_texts: the admin-editable popup/header/footer copy) */
/* ------------------------------------------------------------------ */

/** One admin edit (PUT /admin/site-texts entry). `value` blank = reset
    that (key, locale) to the shipped default (the server deletes the
    row). `url` only for the link keys (footer.rescueBoard /
    footer.ministry): https-validated server-side; `''` = back to the
    shipped default URL; absent = leave the stored URL alone. The public
    read shape (GET /api/site-texts) is `SiteTextsByLocale` from
    core/i18n/site-texts.ts. */
export interface SiteTextEntryDto {
  key: string;
  locale: 'en' | 'et' | 'ru';
  value: string;
  url?: string | null;
}
