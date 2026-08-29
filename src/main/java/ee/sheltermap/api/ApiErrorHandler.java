package ee.sheltermap.api;

import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.auth.InvalidCredentialsException;
import ee.sheltermap.auth.InvalidRefreshTokenException;
import ee.sheltermap.auth.InvalidResetTokenException;
import ee.sheltermap.auth.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
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
                .orElse("validation failed");
        return error(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler({
            ConstraintViolationException.class,
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> malformed(Exception ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "malformed request", request);
    }

    @ExceptionHandler(InvalidResetTokenException.class)
    ResponseEntity<ErrorResponse> invalidResetToken(InvalidResetTokenException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler({
            InvalidCredentialsException.class,
            InvalidAccessTokenException.class,
            InvalidRefreshTokenException.class})
    ResponseEntity<ErrorResponse> unauthorized(RuntimeException ex, HttpServletRequest request) {
        return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
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

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> internal(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} ({})", request.getMethod(), request.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "internal server error", request);
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
