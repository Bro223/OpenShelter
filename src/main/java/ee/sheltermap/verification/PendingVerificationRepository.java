package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

import java.time.Instant;
import java.util.Optional;

/**
 * Persistence seam for {@link PendingVerification}. Real implementation in
 * {@code ee.sheltermap.persistence}; tests use an in-memory fake.
 */
public interface PendingVerificationRepository {

    void save(PendingVerification pending);

    /**
     * The still-valid (not expired) pending verification for user+level, if any.
     *
     * @param now the reference "now" (callers pass their injected clock,
     *            never a wall-clock read inside the repository)
     */
    Optional<PendingVerification> findActiveByUserAndLevel(Long userId, VerificationLevel level, Instant now);

    void delete(PendingVerification pending);
}
