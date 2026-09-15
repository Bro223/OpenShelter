package ee.sheltermap.auth;

import ee.sheltermap.domain.ContactChangeType;

import java.util.Optional;

/**
 * Persistence seam for {@link PendingContactChange}. Real implementation in
 * {@code ee.sheltermap.persistence}; tests use an in-memory fake.
 */
public interface PendingContactChangeRepository {

    /** The pending change for user+type, if any (at most one — unique constraint). */
    Optional<PendingContactChange> findByUserIdAndType(Long userId, ContactChangeType type);

    /**
     * Atomically increments the attempts counter of the row with the given
     * id — the increment happens IN THE STORE (a single conditional UPDATE),
     * not as a read-modify-write round trip, so a concurrent burst of
     * wrong-code confirms cannot lose each other's counts: a read-modify-write
     * cycle would add one attempt per burst, not N).
     *
     * @param id          the pending change row
     * @param maxAttempts increment only while the stored counter is below
     *                    this cap
     * @return the number of rows updated — 0 when the row is already at (or
     *         past) the cap, or no longer exists
     */
    int incrementAttempts(Long id, int maxAttempts);

    PendingContactChange save(PendingContactChange change);

    void delete(PendingContactChange change);
}
