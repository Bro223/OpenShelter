import { HttpErrorResponse } from '@angular/common/http';

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
    default:
      return `HTTP ${status}`;
  }
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

  private constructor(fields: ErrorResponseBody) {
    super(fields.message);
    this.name = 'ApiError';
    this.timestamp = fields.timestamp;
    this.status = fields.status;
    this.error = fields.error;
    this.message = fields.message;
    this.path = fields.path;
  }

  /** Build from a real HTTP error response. Prefers the uniform ErrorResponse body. */
  static fromHttp(status: number, payload: unknown, url?: string | null): ApiError {
    if (isErrorResponseBody(payload)) {
      return new ApiError(payload);
    }
    const message =
      typeof payload === 'string' && payload.length > 0
        ? payload
        : `Request failed with status ${status}`;
    return new ApiError({
      timestamp: new Date().toISOString(),
      status,
      error: reasonPhrase(status),
      message,
      path: url ?? '',
    });
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
    return ApiError.fromHttp(error.status, error.error, error.url);
  }
  return ApiError.fromNetwork();
}
