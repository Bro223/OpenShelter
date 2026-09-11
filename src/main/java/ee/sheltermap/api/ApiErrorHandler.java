package ee.sheltermap.api;

import ee.sheltermap.app.LocationResolveException;
import ee.sheltermap.app.LocationUpstreamException;
import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.OwnReviewReportException;
import ee.sheltermap.app.ReportThrottledException;
import ee.sheltermap.app.ShelterLimitExceededException;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.DuplicateReportException;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.auth.DuplicateAccountException;
import ee.sheltermap.auth.InvalidContactChangeException;
import ee.sheltermap.auth.InvalidCredentialsException;
import ee.sheltermap.auth.InvalidRefreshTokenException;
import ee.sheltermap.auth.InvalidProfilePasswordException;
import ee.sheltermap.auth.InvalidResetTokenException;
import ee.sheltermap.auth.RateLimitExceededException;
import ee.sheltermap.auth.VerificationFailedException;
import ee.sheltermap.verification.AlreadyVerifiedException;
import ee.sheltermap.verification.VerificationThrottledException;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.hibernate.StaleStateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;

/**
 * The one global {@code @RestControllerAdvice} — every error response is a
 * uniform {@link ErrorResponse} (01-TASK.md §8): 400 validation/malformed,
 * 401 unauthenticated/invalid token, 403 not verified / not author,
 * 404 not found, 429 rate limited, 500 fallback.
 *
 * <p>Replaces the Step-4-local {@code AuthErrorHandler} (deleted).
 */
@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + " " + fe.getDefaultMessage())
                .orElse("Validation failed");
        return error(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler({
            ConstraintViolationException.class,
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> malformed(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Malformed request", request);
    }

    @ExceptionHandler(InvalidResetTokenException.class)
    ResponseEntity<ErrorResponse> invalidResetToken(InvalidResetTokenException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(VerificationFailedException.class)
    ResponseEntity<ErrorResponse> verificationFailed(VerificationFailedException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidContactChangeException.class)
    ResponseEntity<ErrorResponse> invalidContactChange(InvalidContactChangeException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidShelterException.class)
    ResponseEntity<ErrorResponse> invalidShelter(InvalidShelterException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /**
     * Short-link resolver not-found (shelter-location-input): ONE generic
     * 400 for invalid input / non-whitelisted host / no extractable pair /
     * outside Estonia — the service never enumerates the reason.
     */
    @ExceptionHandler(LocationResolveException.class)
    ResponseEntity<ErrorResponse> locationResolve(LocationResolveException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(DuplicateAccountException.class)
    ResponseEntity<ErrorResponse> duplicateAccount(DuplicateAccountException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * A report the user already made (shelter-trust-and-reports D1/D2):
     * the per-target unique bound — same (shelter, user, type) or same
     * (review, user). 409 so the client knows nothing was stored.
     */
    @ExceptionHandler(DuplicateReportException.class)
    ResponseEntity<ErrorResponse> duplicateReport(DuplicateReportException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * The per-user active-shelter cap (shelter-trust-and-reports D3):
     * the 11th ACTIVE USER shelter is a conflict, plain-spoken.
     */
    @ExceptionHandler(ShelterLimitExceededException.class)
    ResponseEntity<ErrorResponse> shelterLimit(ShelterLimitExceededException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(AlreadyVerifiedException.class)
    ResponseEntity<ErrorResponse> alreadyVerified(AlreadyVerifiedException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler({
            InvalidCredentialsException.class,
            InvalidAccessTokenException.class,
            InvalidRefreshTokenException.class,
            InvalidProfilePasswordException.class})
    ResponseEntity<ErrorResponse> unauthorized(RuntimeException ex, HttpServletRequest request) {
        return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    /**
     * A value that slipped past bean validation and hit a DB integrity
     * constraint (oversized column, uniqueness, null, ...) is a client input
     * problem → 400. The message is deliberately field-neutral: echoing the
     * column/constraint back to the client leaks schema. NOTE: duplicate
     * <em>registration</em> is pre-converted to 409 inside
     * {@code AuthService.register} (its {@code DataIntegrityViolationException}
     * is caught service-side and becomes a {@code DuplicateAccountException}),
     * so it never reaches this handler — 409 stays 409.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> dataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Data integrity violation on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return error(HttpStatus.BAD_REQUEST, "Request failed due to invalid input", request);
    }

    /**
     * Optimistic-lock conflict on a concurrent update (@Version, V8
     * {@code shelters.version}) → 409 so the client can re-read and retry.
     * Both the raw JPA exception (thrown at commit) and the Spring
     * DataAccessException form (thrown inside a repository call) are mapped.
     */
    @ExceptionHandler({
            OptimisticLockException.class,
            OptimisticLockingFailureException.class})
    ResponseEntity<ErrorResponse> optimisticLock(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "The resource changed under you; reload and retry", request);
    }

    /**
     * Commit-time optimistic-lock failure (in-place mutation nuance): with
     * {@code JpaShelterRepository.save} updating a managed entity in place,
     * a version-mismatched UPDATE can fail at the FLUSH during transaction
     * commit — outside the repository call path where Spring would already
     * translate it — and surfaces as a {@link TransactionSystemException}
     * wrapping Hibernate's {@link StaleStateException}. Same client-visible
     * outcome as the direct OLE shapes above → 409. Any OTHER commit-time
     * system failure is not a client conflict and falls back to the 500
     * handler. (TransactionSystemException is a sibling of
     * DataIntegrityViolationException, so this handler cannot shadow the
     * 400 mapping.)
     */
    @ExceptionHandler(TransactionSystemException.class)
    ResponseEntity<ErrorResponse> transactionSystem(TransactionSystemException ex, HttpServletRequest request) {
        if (containsStaleStateException(ex)) {
            return error(HttpStatus.CONFLICT, "The resource changed under you; reload and retry", request);
        }
        return internal(ex, request);
    }

    /** Cycle-safe cause-chain walk for Hibernate's stale-state failures. */
    private static boolean containsStaleStateException(Throwable throwable) {
        for (Throwable t = throwable; t != null; ) {
            if (t instanceof StaleStateException) {
                return true;
            }
            Throwable cause = t.getCause();
            t = (cause != null && cause != t) ? cause : null;
        }
        return false;
    }

    /**
     * A user reporting their OWN review (shelter-trust-and-reports D2 —
     * own content is edited or deleted, not reported). Same 403 family
     * as the not-verified / not-author gates.
     */
    @ExceptionHandler(OwnReviewReportException.class)
    ResponseEntity<ErrorResponse> ownReviewReport(OwnReviewReportException ex, HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler({NotVerifiedException.class, NotAuthorException.class})
    ResponseEntity<ErrorResponse> forbidden(RuntimeException ex, HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler({
            ShelterNotFoundException.class,
            ShelterReviewNotFoundException.class,
            NoResourceFoundException.class})
    ResponseEntity<ErrorResponse> notFound(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<ErrorResponse> rateLimit(RateLimitExceededException ex, HttpServletRequest request) {
        return error(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request);
    }

    /**
     * The per-user report throttle (shelter-trust-and-reports D3): 10
     * report-type actions per rolling hour (any target, any type) — the
     * standard throttle body (429 + uniform ErrorResponse), same
     * vocabulary as the verification and password-reset throttles.
     */
    @ExceptionHandler(ReportThrottledException.class)
    ResponseEntity<ErrorResponse> reportThrottled(ReportThrottledException ex, HttpServletRequest request) {
        return error(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request);
    }

    /**
     * Short-link resolver upstream failure (shelter-location-input):
     * connect/read timeout, network failure or a 5xx from the short-link
     * service → ONE generic 502 retry-later message, no upstream detail.
     */
    @ExceptionHandler(LocationUpstreamException.class)
    ResponseEntity<ErrorResponse> locationUpstream(LocationUpstreamException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), request);
    }

    @ExceptionHandler(VerificationThrottledException.class)
    ResponseEntity<ErrorResponse> verificationThrottled(VerificationThrottledException ex, HttpServletRequest request) {
        return error(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> internal(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} ({})", request.getMethod(), request.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", request);
    }

    private static ResponseEntity<ErrorResponse> error(HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI()));
    }
}
