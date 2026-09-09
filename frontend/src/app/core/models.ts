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
}

export interface ShelterReviewDto {
  id: number;
  authorName: string;
  /** 1..5 */
  rating: number;
  comment: string | null;
  /** ISO-8601 instant. */
  createdAt: string;
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
