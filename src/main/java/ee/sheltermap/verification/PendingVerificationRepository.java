package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

import java.util.Optional;

/**
 * Persistence seam for {@link PendingVerification}. Real implementation in
 * {@code ee.sheltermap.persistence} (Step 3); tests use an in-memory fake.
 */
public interface PendingVerificationRepository {

    void save(PendingVerification pending);

    /** The still-valid (not expired) pending verification for user+level, if any. */
    Optional<PendingVerification> findActiveByUserAndLevel(Long userId, VerificationLevel level);

    void delete(PendingVerification pending);
}
