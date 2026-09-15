import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';

/**
 * The one uniform error body of the whole backend (ErrorResponse in
 * docs/agent/02-CONTEXT-API.md) — every non-2xx carries exactly these fields.
 */
export interface ErrorResponseBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

/** Network failures carry HTTP status 0 (no HTTP response at all). */
const NETWORK_STATUS = 0;

function reasonPhrase(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return `HTTP ${status}`;
  }
}

/**
 * Parse a Retry-After header value into whole seconds. Only a plain
 * non-negative integer counts (the backend sends the cooldown in seconds);
 * HTTP-date form, fractions, junk, or an absent header all give null.
 */
function parseRetryAfterSeconds(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const value = raw.trim();
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) ? seconds : null;
}

function isErrorResponseBody(payload: unknown): payload is ErrorResponseBody {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return (
    typeof record['timestamp'] === 'string' &&
    typeof record['status'] === 'number' &&
    typeof record['error'] === 'string' &&
    typeof record['message'] === 'string' &&
    typeof record['path'] === 'string'
  );
}

/**
 * The frontend's one error type (01-TASK.md §4: one uniform error path).
 * Mirrors the backend ErrorResponse exactly; pages surface `message` through
 * the banner. 401 mid-session is handled once in the interceptor, never here.
 */
export class ApiError extends Error {
  readonly timestamp: string;
  readonly status: number;
  readonly error: string;
  /** The request path that failed ('' for network errors). */
  readonly path: string;

  /**
   * Seconds until the server accepts the same request again — the
   * `Retry-After` header of a cooldown 429. Null everywhere else: token-
   * bucket 429s send no header, and neither do other statuses / network
   * errors.
   */
  readonly retryAfterSeconds: number | null;

  private constructor(fields: ErrorResponseBody, retryAfterSeconds: number | null = null) {
    super(fields.message);
    this.name = 'ApiError';
    this.timestamp = fields.timestamp;
    this.status = fields.status;
    this.error = fields.error;
    this.message = fields.message;
    this.path = fields.path;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** Build from a real HTTP error response. Prefers the uniform ErrorResponse body. */
  static fromHttp(
    status: number,
    payload: unknown,
    url?: string | null,
    headers?: HttpHeaders | null,
  ): ApiError {
    const retryAfterSeconds = parseRetryAfterSeconds(headers?.get('Retry-After') ?? null);
    if (isErrorResponseBody(payload)) {
      return new ApiError(payload, retryAfterSeconds);
    }
    const message =
      typeof payload === 'string' && payload.length > 0
        ? payload
        : `Request failed with status ${status}`;
    return new ApiError(
      {
        timestamp: new Date().toISOString(),
        status,
        error: reasonPhrase(status),
        message,
        path: url ?? '',
      },
      retryAfterSeconds,
    );
  }

  /** Build for a network failure — the backend is unreachable (dev backend may be off). */
  static fromNetwork(): ApiError {
    return new ApiError({
      timestamp: new Date().toISOString(),
      status: NETWORK_STATUS,
      error: 'Network Error',
      message: 'Cannot reach the backend. It may be offline — please try again later.',
      path: '',
    });
  }

  /** True when the backend never answered (offline / dev server not running). */
  get isNetworkError(): boolean {
    return this.status === NETWORK_STATUS;
  }
}

/**
 * Map any thrown value (HttpErrorResponse from Angular or an already-built
 * ApiError) into the one error type. Used by ApiClient's catchError.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return ApiError.fromNetwork();
    }
    return ApiError.fromHttp(error.status, error.error, error.url, error.headers);
  }
  return ApiError.fromNetwork();
}
