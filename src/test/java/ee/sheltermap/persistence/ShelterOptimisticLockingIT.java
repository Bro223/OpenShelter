package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleObjectStateException;
import org.hibernate.StaleStateException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * B7b: the {@code shelters.version} column (V8) backs optimistic locking.
 * Saving a row whose version was bumped underneath the reader must fail with
 * an optimistic-lock error instead of silently clobbering the concurrent
 * write — the error then propagates up to the API layer's 409 mapping.
 *
 * <p>Each step runs in its OWN transaction (deliberately not {@code
 * @Transactional}): the reader's entity must be detached before the
 * concurrent writer commits.
 */
class ShelterOptimisticLockingIT extends AbstractPersistenceIT {

    @Autowired
    ShelterRepository shelters;

    @Autowired
    SpringDataShelterRepository entities;

    @Autowired
    PlatformTransactionManager txManager;

    @AfterEach
    void cleanUpCommittedRows() {
        wipeAllTables();
    }

    @Test
    void staleVersionSaveFailsWithOptimisticLock() {
        Shelter shelter = new Shelter("Optimistic varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, "optlock-1", ShelterSource.PAASETEAMET);
        shelters.save(shelter);
        Long id = shelter.getId();

        TransactionTemplate tx = new TransactionTemplate(txManager);

        // Reader A loads the row (version 0) and keeps its (now detached) entity.
        ShelterEntity stale = tx.execute(status -> entities.findById(id).orElseThrow());
        assertThat(stale.getVersion()).isNotNull();

        // A concurrent writer commits first: version 0 -> 1.
        tx.execute(status -> {
            entities.findById(id).orElseThrow().setName("concurrent writer");
            return null;
        });

        // Writer A now saves its stale entity: the UPDATE matches zero rows.
        assertThatThrownBy(() -> tx.execute(status -> {
            stale.setName("stale writer");
            entities.save(stale);
            entities.flush();
            return null;
        }))
                .satisfies(failure -> assertThat(hasOptimisticLockCause(failure))
                        .as("expected an optimistic-lock failure, got: %s", failure)
                        .isTrue());
    }

    @Test
    void normalSaveSucceedsAndBumpsTheVersion() {
        Shelter shelter = new Shelter("Optimistic varjend 2", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, "optlock-2", ShelterSource.PAASETEAMET);
        shelters.save(shelter);

        TransactionTemplate tx = new TransactionTemplate(txManager);
        Long before = tx.execute(status -> entities.findById(shelter.getId()).orElseThrow().getVersion());
        tx.execute(status -> {
            entities.findById(shelter.getId()).orElseThrow().setName("updated");
            return null;
        });
        Long after = tx.execute(status -> entities.findById(shelter.getId()).orElseThrow().getVersion());

        assertThat(before).isNotNull();
        assertThat(after).isEqualTo(before + 1);
    }

    /**
     * Accepts the optimistic-lock failure however Spring/Hibernate wraps it
     * across the repository/commit boundary: the raw JPA exception, Spring's
     * DataAccessException translation, or Hibernate's flush-time state error.
     */
    private static boolean hasOptimisticLockCause(Throwable failure) {
        for (Throwable t = failure; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (t instanceof OptimisticLockException
                    || t instanceof OptimisticLockingFailureException
                    || t instanceof StaleStateException
                    || t instanceof StaleObjectStateException) {
                return true;
            }
            String message = t.getMessage();
            if (message != null && message.contains("Row was updated or deleted")) {
                return true;
            }
        }
        return false;
    }
}
