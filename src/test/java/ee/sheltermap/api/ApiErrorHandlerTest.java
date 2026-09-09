package ee.sheltermap.api;

import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleStateException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.TransactionSystemException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Direct-handler tests for the optimistic-lock 409 mapping (wave-2 OLE
 * hardening): a version conflict on an in-place mutation can surface in
 * THREE shapes — the raw JPA exception, the Spring DataAccessException
 * form, and the commit-time {@link TransactionSystemException} wrapping
 * Hibernate's {@link StaleStateException} (the {@code JpaTransactionManager}
 * commit path, where no repository-call translation happens). All three are
 * client conflicts; anything else that reaches the commit handler stays a
 * 500.
 */
class ApiErrorHandlerTest {

    private static final String CONFLICT_MESSAGE = "The resource changed under you; reload and retry";

    private final ApiErrorHandler handler = new ApiErrorHandler();
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
}
