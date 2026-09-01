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

    PendingContactChange save(PendingContactChange change);

    void delete(PendingContactChange change);
}
