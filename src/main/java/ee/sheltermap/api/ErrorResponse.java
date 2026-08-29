package ee.sheltermap.api;

import java.time.Instant;

/**
 * The one uniform error shape for the whole API (01-TASK.md §8):
 * every error response — validation, 401, 403, 404, 429, 500 — is this record.
 *
 * @param timestamp when the error occurred
 * @param status    the HTTP status code
 * @param error     the HTTP reason phrase ("Bad Request", "Unauthorized", ...)
 * @param message   a human-readable detail
 * @param path      the request path that failed
 */
public record ErrorResponse(Instant timestamp, int status, String error, String message, String path) {
}
