package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleObjectStateException;
import org.hibernate.StaleStateException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The {@code users.version} column (V29) backs optimistic locking for
 * whole-row user saves. Every user save is a whole-row merge from a
 * request-time snapshot ({@code currentUser()} at request start), so an
 * in-flight save loaded BEFORE a concurrent commit used to silently
 * revert it — the material case: an admin suspension landing while the
 * user's own request is in flight, written back with
 * {@code suspended_at = NULL}. The snapshot now carries the version it
 * was read with, so the {@code UPDATE ... WHERE version = <stale>}
 * matches zero rows instead.
 *
 * <p>Each step runs in its OWN transaction (deliberately not {@code
 * @Transactional}): the reader's snapshot must be detached (and stale)
 * before the concurrent writer commits — the same shape as
 * {@code ShelterOptimisticLockingIT} for V8's shelters.version.
 * {@link #cleanUpCommittedRows()} removes only THIS class' own users
 * afterwards (the base cleanup contract) — the shared database keeps
 * everyone else's state, provisioned admin rows included.
 */
class UserOptimisticLockingIT extends AbstractPersistenceIT {

    @Autowired
    UserRepository users;

    @Autowired
    PlatformTransactionManager txManager;

    @Autowired
    JdbcTemplate jdbc;

    /** This class' own committed users (the cleanup deletes exactly these). */
    private final List<Long> ownUserIds = new ArrayList<>();

    @AfterEach
    void cleanUpCommittedRows() {
        // Scoped (base cleanup contract): credentials / claims / suspension
        // state all cascade from users.
        for (Long id : ownUserIds) {
            jdbc.update("DELETE FROM users WHERE id = ?", id);
        }
        ownUserIds.clear();
    }

    @Test
    void staleWholeRowSaveCannotClobberASuspension() {
        RegisteredUser saved = saveUser(users, "stale-suspension@example.ee", "+37250009999");
        ownUserIds.add(saved.getId());
        String originalName = saved.getData().name();
        TransactionTemplate tx = new TransactionTemplate(txManager);

        // An in-flight request loads the row (version 0, not suspended)
        // and keeps its snapshot — the controller's currentUser() shape.
        User snapshot = tx.execute(status -> users.findById(saved.getId()));
        assertThat(snapshot).isNotNull();
        assertThat(snapshot.isSuspended()).isFalse();

        // A concurrent writer commits first: the admin suspends (0 -> 1).
        tx.execute(status -> {
            User adminView = users.findById(saved.getId());
            adminView.suspend(Instant.now());
            users.save(adminView);
            return null;
        });

        // The in-flight request now saves the whole row from its stale
        // snapshot (its suspendedAt is still null): the @Version UPDATE
        // matches zero rows, the flush raises the optimistic-lock
        // failure, and the save's transaction rolls back.
        assertThatThrownBy(() -> tx.execute(status -> {
            ((RegisteredUser) snapshot).changeName("Stale rename");
            users.save(snapshot);
            return null;
        }))
                .satisfies(failure -> assertThat(hasOptimisticLockCause(failure))
                        .as("expected an optimistic-lock failure, got: %s", failure)
                        .isTrue());

        // The suspension (and the name) survived the stale save.
        User fresh = tx.execute(status -> users.findById(saved.getId()));
        assertThat(fresh.isSuspended())
                .as("the admin's suspension survived the stale whole-row save")
                .isTrue();
        assertThat(fresh.getData().name()).isEqualTo(originalName);
    }

    @Test
    void aFreshSnapshotSavesAndBumpsTheVersion() {
        RegisteredUser saved = saveUser(users, "version-bump@example.ee", "+37250009998");
        ownUserIds.add(saved.getId());
        TransactionTemplate tx = new TransactionTemplate(txManager);

        Long initial = tx.execute(status -> users.findById(saved.getId()).getVersion());
        assertThat(initial).isZero();

        // A save from the CURRENT version succeeds and bumps the stamp —
        // so legitimate re-read-then-save flows (profile edit, claim
        // attach, contact confirm) keep working.
        tx.execute(status -> {
            User current = users.findById(saved.getId());
            ((RegisteredUser) current).changeName("Bumped name");
            users.save(current);
            return null;
        });

        User fresh = tx.execute(status -> users.findById(saved.getId()));
        assertThat(fresh.getVersion()).isEqualTo(1L);
        assertThat(fresh.getData().name()).isEqualTo("Bumped name");
    }

    /**
     * Accepts the optimistic-lock failure however Spring/Hibernate wraps
     * it across the repository/commit boundary: the raw JPA exception,
     * Spring's DataAccessException translation, or Hibernate's flush-time
     * state error (the same helper shape as ShelterOptimisticLockingIT).
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
