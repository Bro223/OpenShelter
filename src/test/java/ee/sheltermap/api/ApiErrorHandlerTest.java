package ee.sheltermap.api;

import ee.sheltermap.app.LocationResolveException;
import ee.sheltermap.app.LocationUpstreamException;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleStateException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Direct-handler tests for the optimistic-lock 409 mapping: a version
 * conflict on an in-place mutation can surface in THREE shapes — the raw
 * JPA exception, the Spring DataAccessException form, and the commit-time
 * {@link TransactionSystemException} wrapping
 * Hibernate's {@link StaleStateException} (the {@code JpaTransactionManager}
 * commit path, where no repository-call translation happens). All three are
 * client conflicts; anything else that reaches the commit handler stays a
 * 500.
 *
 * <p>Plus the client-mistake 4xx family that the MVC layer raises OUTSIDE
 * the handler body (415 wrong Content-Type, 400 missing multipart part,
 * 413 over the servlet-container upload cap): without their dedicated
 * handlers the catch-all below the 405 would flatten them to 500s.
 */
class ApiErrorHandlerTest {

    private static final String CONFLICT_MESSAGE = "The resource changed under you; reload and retry";

    private final ApiErrorHandler handler = new ApiErrorHandler(
            Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
    private final MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/shelters/42");

    @Test
    void jpaOptimisticLockExceptionMapsToConflict() {
        ResponseEntity<ErrorResponse> response =
                handler.optimisticLock(new OptimisticLockException("row locked"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().message()).isEqualTo(CONFLICT_MESSAGE);
    }

    @Test
    void springOptimisticLockingFailureMapsToConflict() {
        ResponseEntity<ErrorResponse> response =
                handler.optimisticLock(new OptimisticLockingFailureException("row locked"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().message()).isEqualTo(CONFLICT_MESSAGE);
    }

    @Test
    void commitTimeStaleStateWrappedInTransactionSystemExceptionMapsToConflict() {
        // the commit shape: Hibernate's stale-state failure at flush/commit,
        // wrapped by the JpaTransactionManager — no repository call in between
        TransactionSystemException ex = new TransactionSystemException(
                "Could not commit JPA EntityManager transaction",
                new StaleStateException("Row not found: [shelters][42]"));

        ResponseEntity<ErrorResponse> response = handler.transactionSystem(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().message()).isEqualTo(CONFLICT_MESSAGE);
    }

    @Test
    void staleStateDeeperInTheCauseChainStillMapsToConflict() {
        TransactionSystemException ex = new TransactionSystemException(
                "Could not commit JPA EntityManager transaction",
                new RuntimeException("wrapper",
                        new StaleStateException("Row was updated or deleted by a concurrent transaction")));

        ResponseEntity<ErrorResponse> response = handler.transactionSystem(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().message()).isEqualTo(CONFLICT_MESSAGE);
    }

    @Test
    void wrongMethodOnAMappedPathMapsTo405Not500() {
        // a wrong method on a mapped path (e.g. DELETE /api/shelters/42) is
        // a plain client mistake — the catch-all must not turn it into a 500
        ResponseEntity<ErrorResponse> response = handler.methodNotSupported(
                new HttpRequestMethodNotSupportedException("DELETE"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(405);
        assertThat(response.getBody().message()).isEqualTo("Method not allowed");
    }

    @Test
    void wrongContentTypeOnAMultipartEndpointMapsTo415Not500() {
        // a JSON body on POST /admin/media (consumes multipart/form-data) is
        // rejected before any handler code runs — 415, not a 500
        ResponseEntity<ErrorResponse> response = handler.mediaTypeNotSupported(
                new HttpMediaTypeNotSupportedException(MediaType.APPLICATION_JSON_VALUE), request);

        assertThat(response.getStatusCode().value()).isEqualTo(415);
        assertThat(response.getBody().message()).isEqualTo("Unsupported media type");
    }

    @Test
    void missingMultipartPartMapsTo400Not500() {
        // a multipart body without the required "file" part is a plain
        // client mistake — the same 400 vocabulary as the malformed group
        ResponseEntity<ErrorResponse> response = handler.malformed(
                new MissingServletRequestPartException("file"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().message()).isEqualTo("Malformed request");
    }

    @Test
    void uploadOverTheContainerCapMapsTo413Not500() {
        // what the servlet container throws when the received bytes pass
        // spring.servlet.multipart.max-file-size (6 MB — deliberately above
        // the app's 5 MiB cap): the documented 413 with the cap named,
        // the same vocabulary as the app-level MediaTooLargeException
        ResponseEntity<ErrorResponse> response = handler.uploadSizeExceeded(
                new MaxUploadSizeExceededException(6L * 1024 * 1024), request);

        assertThat(response.getStatusCode().value()).isEqualTo(413);
        assertThat(response.getBody().message())
                .isEqualTo("The uploaded file exceeds the maximum size of 6291456 bytes");
    }

    @Test
    void transactionSystemExceptionWithoutStaleCauseFallsBackTo500() {
        // a plain commit-time system failure is NOT a client conflict
        TransactionSystemException ex = new TransactionSystemException(
                "Could not commit JPA EntityManager transaction",
                new RuntimeException("connection reset"));

        ResponseEntity<ErrorResponse> response = handler.transactionSystem(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().message()).isEqualTo("Internal server error");
    }

    @Test
    void dataIntegrityViolationMapsTo400() {
        // a duplicate/invalid-input violation is a client error, not a 500
        DataIntegrityViolationException ex = new DataIntegrityViolationException("duplicate key");

        ResponseEntity<ErrorResponse> response = handler.dataIntegrity(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().message()).isEqualTo("Request failed due to invalid input");
    }

    @Test
    void locationUpstreamExceptionMapsTo502WithTheReason() {
        LocationUpstreamException ex = new LocationUpstreamException("maps host failed");

        ResponseEntity<ErrorResponse> response = handler.locationUpstream(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(502);
        assertThat(response.getBody().message()).isEqualTo("maps host failed");
    }

    @Test
    void locationResolveExceptionMapsTo400WithTheReason() {
        LocationResolveException ex = new LocationResolveException("no coordinates in page");

        ResponseEntity<ErrorResponse> response = handler.locationResolve(ex, request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().message()).isEqualTo("no coordinates in page");
    }
}
