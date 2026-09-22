package ee.sheltermap.api;

import ee.sheltermap.app.DuplicateInfoRequestException;
import ee.sheltermap.app.InfoRequestAlreadyAnsweredException;
import ee.sheltermap.app.InfoRequestNotFoundException;
import ee.sheltermap.app.LocationResolveException;
import ee.sheltermap.app.LocationUpstreamException;
import ee.sheltermap.app.NotAuthorException;
import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.NonSuspendableUserException;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.app.ReportNotFoundException;
import ee.sheltermap.app.ReportThrottledException;
import ee.sheltermap.app.ShelterDuplicateException;
import ee.sheltermap.app.ShelterLimitExceededException;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterSubmissionThrottledException;
import ee.sheltermap.app.UserNotFoundException;
import ee.sheltermap.app.AdminAccessException;
import ee.sheltermap.app.DuplicateReportException;
import ee.sheltermap.app.ImportOwnedShelterException;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.auth.DuplicateAccountException;
import ee.sheltermap.auth.InvalidContactChangeException;
import ee.sheltermap.auth.InvalidCredentialsException;
import ee.sheltermap.auth.InvalidRefreshTokenException;
import ee.sheltermap.auth.InvalidProfilePasswordException;
import ee.sheltermap.auth.InvalidResetTokenException;
import ee.sheltermap.auth.RateLimitExceededException;
import ee.sheltermap.auth.SuspendedAccountException;
import ee.sheltermap.auth.VerificationFailedException;
import ee.sheltermap.verification.AlreadyVerifiedException;
import ee.sheltermap.verification.VerificationThrottledException;
import ee.sheltermap.guidance.GuidanceNotFoundException;
import ee.sheltermap.guidance.GuidanceValidationException;
import ee.sheltermap.guidance.HeroImportRefusedException;
import ee.sheltermap.guidance.HeroImportUnreachableException;
import ee.sheltermap.guidance.MediaAssetInUseException;
import ee.sheltermap.guidance.MediaTooLargeException;
import ee.sheltermap.guidance.SlugAlreadyUsedException;
import ee.sheltermap.guidance.UnsupportedImageException;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.hibernate.StaleStateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Clock;
import java.util.Objects;

/**
 * The one global {@code @RestControllerAdvice} — every error response is a
 * uniform {@link ErrorResponse} (01-TASK.md §8): 400 validation/malformed,
 * 401 unauthenticated/invalid token, 403 not verified / not author,
 * 404 not found, 429 rate limited, 500 fallback.
 */
@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

    private final Clock clock;

    /** The error-body timestamps come from the injected Clock (the only time seam, tests pin it). */
    public ApiErrorHandler(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

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
            MissingServletRequestPartException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> malformed(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Malformed request", request);
    }

    /**
     * A body in a Content-Type the endpoint does not consume (e.g. JSON on
     * {@code POST /admin/media}, which consumes multipart/form-data): the
     * rejection happens before any handler code runs, and without this
     * handler the catch-all below would turn a plain client mistake into a
     * 500. 415 is the honest answer — the same precedent as the 405 below.
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ErrorResponse> mediaTypeNotSupported(HttpMediaTypeNotSupportedException ex,
                                                        HttpServletRequest request) {
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported media type", request);
    }

    /**
     * A wrong HTTP method on a MAPPED path (e.g. DELETE on
     * {@code /api/shelters/{id}/occupancy}): the DispatcherServlet throws
     * before any controller runs, and without this handler the catch-all
     * below would turn a plain client mistake into a 500. 405 is the
     * honest answer.
     */    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorResponse> methodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                     HttpServletRequest request) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed", request);
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
     * A paging bound violation (limit outside 1..200, a negative offset)
     * on any of the paged reads — the uniform 400, the one message
     * ({@link Pagination} is the single source of both).
     */
    @ExceptionHandler(PagingBoundsException.class)
    ResponseEntity<ErrorResponse> pagingBounds(PagingBoundsException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /**
     * A rejected guidance/media write (crisis-guidance D4/D5/D8) — the
     * cross-field 400 vocabulary: missing/oversized title or body, a
     * malformed admin-supplied slug, alt without a hero (or a hero
     * without alt) and the delete-without-confirm refusal.
     */
    @ExceptionHandler(GuidanceValidationException.class)
    ResponseEntity<ErrorResponse> guidanceValidation(GuidanceValidationException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /**
     * A refused media upload (crisis-guidance D7) — magic bytes that are
     * not a readable JPEG/PNG/WebP (SVG included), unreadable dimensions,
     * or a declared part type that contradicts the sniffed bytes.
     * Also the 400 for a refused hero import (guidance-hero-import):
     * a URL that does not serve a readable JPEG/PNG/WebP, or whose header
     * claims dimensions over the pixel cap.
     */
    @ExceptionHandler(UnsupportedImageException.class)
    ResponseEntity<ErrorResponse> unsupportedImage(UnsupportedImageException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /**
     * A hero import refused by the address/scheme policy
     * (guidance-hero-import): a non-http(s) URL, a URL with credentials,
     * a host resolving to a loopback/private/link-local/unique-local/
     * multicast/cloud-metadata address (on the entry OR a redirect
     * target), a disallowed redirect, the redirect hop cap, or a remote
     * 4xx (the URL is broken — no retry will fix it). 400, readable
     * message; the publish that carried the import fails and the post
     * stays a DRAFT with the URL intact.
     */
    @ExceptionHandler(HeroImportRefusedException.class)
    ResponseEntity<ErrorResponse> heroImportRefused(HeroImportRefusedException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /**
     * A hero import that could not be fetched (guidance-hero-import):
     * DNS failure, connect/read timeout or stall, network failure, or a
     * 5xx from the remote host — transient, a retry may succeed → 502
     * (the same retry-later vehicle as the geo resolver's upstream
     * failure). The publish that carried the import fails and the post
     * stays a DRAFT with the URL intact.
     */
    @ExceptionHandler(HeroImportUnreachableException.class)
    ResponseEntity<ErrorResponse> heroImportUnreachable(HeroImportUnreachableException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), request);
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
     * the per-target unique bound — same (shelter, user, type). 409 so the
     * client knows nothing was stored.
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

    /**
     * Near-duplicate shelter submission (abuse-limits): an
     * ACTIVE USER row with the same normalized name within the configured
     * coordinate tolerance already exists. 409 — the message carries the
     * existing row id so the client can point at it (the uniform
     * {@code ErrorResponse} shape is kept).
     */
    @ExceptionHandler(ShelterDuplicateException.class)
    ResponseEntity<ErrorResponse> shelterDuplicate(ShelterDuplicateException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(AlreadyVerifiedException.class)
    ResponseEntity<ErrorResponse> alreadyVerified(AlreadyVerifiedException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * An admin-supplied slug another guidance post already holds
     * (crisis-guidance D5) — 409 naming the slug; it is never silently
     * rewritten (an auto-generated collision takes the -2/-3 suffix
     * instead). Uniqueness spans drafts and published posts.
     */
    @ExceptionHandler(SlugAlreadyUsedException.class)
    ResponseEntity<ErrorResponse> slugAlreadyUsed(SlugAlreadyUsedException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * A media asset still referenced as a hero image, deleted without
     * confirm=true (crisis-guidance D8) — 409; the body carries the
     * affected posts (title + slug) so the admin UI can turn the answer
     * into the confirm dialog.
     */
    @ExceptionHandler(MediaAssetInUseException.class)
    ResponseEntity<ErrorResponse> mediaAssetInUse(MediaAssetInUseException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * An upload over the configured size cap (crisis-guidance D7) — 413,
     * the message names the cap, and no partial file is left behind (the
     * cap is checked before the file touches disk).
     */
    @ExceptionHandler(MediaTooLargeException.class)
    ResponseEntity<ErrorResponse> mediaTooLarge(MediaTooLargeException ex, HttpServletRequest request) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, ex.getMessage(), request);
    }

    /**
     * An upload over the SERVLET-CONTAINER cap (spring.servlet.multipart
     * .max-file-size — deliberately ABOVE the app cap, see application.yml):
     * the container throws while parsing the body, before the controller
     * runs, and without this handler the catch-all below would answer 500
     * where the documented contract is the SAME 413 the app-level
     * {@code MediaTooLargeException} answers — same vocabulary, the cap
     * named.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorResponse> uploadSizeExceeded(MaxUploadSizeExceededException ex,
                                                     HttpServletRequest request) {
        long maxBytes = ex.getMaxUploadSize();
        String message = maxBytes >= 0
                ? "The uploaded file exceeds the maximum size of " + maxBytes + " bytes"
                : "The uploaded file exceeds the maximum size";
        return error(HttpStatus.PAYLOAD_TOO_LARGE, message, request);
    }

    /**
     * A registry row under an admin moderation write (admin-moderation
     * D4): the registry import owns those rows and rebuilds them as ACTIVE
     * on every run, so the edit would silently revert — plain-spoken 409.
     */
    @ExceptionHandler(ImportOwnedShelterException.class)
    ResponseEntity<ErrorResponse> importOwnedShelter(ImportOwnedShelterException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * A suspend/unsuspend of an account kind that cannot be suspended
     * (ADMIN lockout vector, GUEST has no credentials) —
     * 409, plain-spoken.
     */
    @ExceptionHandler(NonSuspendableUserException.class)
    ResponseEntity<ErrorResponse> nonSuspendableUser(NonSuspendableUserException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * A second information request for a shelter that already has one
     * (one exchange per shelter; the replied row is kept,
     * so a re-request collides). 409, plain-spoken.
     */
    @ExceptionHandler(DuplicateInfoRequestException.class)
    ResponseEntity<ErrorResponse> duplicateInfoRequest(DuplicateInfoRequestException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /** A second reply to an already-answered information request. 409. */
    @ExceptionHandler(InfoRequestAlreadyAnsweredException.class)
    ResponseEntity<ErrorResponse> infoRequestAlreadyAnswered(InfoRequestAlreadyAnsweredException ex,
                                                              HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler({
            InvalidCredentialsException.class,
            InvalidAccessTokenException.class,
            InvalidRefreshTokenException.class,
            InvalidProfilePasswordException.class})
    ResponseEntity<ErrorResponse> unauthorized(RuntimeException ex, HttpServletRequest request) {
        // One WARN per failed authentication so a credential-stuffing /
        // token-spray burst is visible in the log (operations.md §5: alert on
        // volume). The line carries the method + path only — never the
        // presented credential, e-mail or token.
        log.warn("401 authentication failure on {} {}", request.getMethod(), request.getRequestURI());
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
     * {@code shelters.version}, V29 {@code users.version}) → 409 so the
     * client can re-read and retry. The users mapping is what stops a
     * request-snapshot whole-row save from silently reverting a
     * concurrently committed write (e.g. an admin suspension). Both the
     * raw JPA exception (thrown at commit) and the Spring
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
     * The 403 family: not verified, not the author, not an admin, a
     * suspended account — and the provisioned-admin protection (the
     * environment-provisioned administrator account cannot be deleted,
     * suspended, password-reset or contact-changed from the app; the
     * message names the environment provisioning).
     */
    @ExceptionHandler({NotVerifiedException.class, NotAuthorException.class, AdminAccessException.class,
            SuspendedAccountException.class, ProvisionedAdminProtectedException.class})
    ResponseEntity<ErrorResponse> forbidden(RuntimeException ex, HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler({
            ShelterNotFoundException.class,
            UserNotFoundException.class,
            ReportNotFoundException.class,
            InfoRequestNotFoundException.class,
            GuidanceNotFoundException.class,
            NoResourceFoundException.class})
    ResponseEntity<ErrorResponse> notFound(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    /**
     * A token-bucket throttle (login, reset, registration, verification,
     * contact-change and the geo resolver). 429 + the uniform body, with the
     * exact {@code Retry-After} countdown the bucket computed (omitted only
     * when the bucket never refills), and one WARN so a burst is visible in
     * the log (operations.md §5: alert on throttle volume).
     */
    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<ErrorResponse> rateLimit(RateLimitExceededException ex, HttpServletRequest request) {
        return throttle("token-bucket", ex.getMessage(), request, ex.retryAfterSeconds());
    }

    /**
     * The per-user report throttle (shelter-trust-and-reports D3): 10
     * report-type actions per rolling hour (any target, any type) — 429 +
     * the uniform body, the exact {@code Retry-After} (the oldest in-window
     * action leaves the trailing hour) and one WARN.
     */
    @ExceptionHandler(ReportThrottledException.class)
    ResponseEntity<ErrorResponse> reportThrottled(ReportThrottledException ex, HttpServletRequest request) {
        return throttle("report", ex.getMessage(), request, ex.retryAfterSeconds());
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

    /**
     * The verification / contact-change anti-spam throttle (→ 429, uniform
     * ErrorResponse — the body is deliberately unchanged): the exact
     * {@code Retry-After} countdown the thrower computed, and one WARN.
     */
    @ExceptionHandler(VerificationThrottledException.class)
    ResponseEntity<ErrorResponse> verificationThrottled(VerificationThrottledException ex, HttpServletRequest request) {
        return throttle("verification", ex.getMessage(), request, ex.retryAfterSeconds());
    }

    /**
     * The per-user DAILY shelter-submission cap (abuse-limits): 429, with
     * the exact {@code Retry-After} countdown (when the thrower knows when
     * the oldest in-window submission leaves the 24 h window), and one WARN.
     */
    @ExceptionHandler(ShelterSubmissionThrottledException.class)
    ResponseEntity<ErrorResponse> shelterSubmissionThrottled(ShelterSubmissionThrottledException ex,
                                                             HttpServletRequest request) {
        return throttle("shelter-submission", ex.getMessage(), request, ex.retryAfterSeconds());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> internal(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} ({})", request.getMethod(), request.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", request);
    }

    /**
     * The one 429 shape: the uniform body + an exact {@code Retry-After}
     * (seconds) when the thrower can compute one, and ONE WARN per throttle
     * kind so a burst is visible in the log (operations.md §5). The method
     * + path identify the throttled endpoint; no PII crosses into the line.
     */
    private ResponseEntity<ErrorResponse> throttle(String kind, String message,
                                                   HttpServletRequest request, Integer retryAfterSeconds) {
        log.warn("429 {} throttle on {} {}", kind, request.getMethod(), request.getRequestURI());
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS);
        if (retryAfterSeconds != null) {
            builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
        }
        return builder.body(new ErrorResponse(
                clock.instant(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                message,
                request.getRequestURI()));
    }

    private ResponseEntity<ErrorResponse> error(HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ErrorResponse(
                clock.instant(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI()));
    }
}
