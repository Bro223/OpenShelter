package ee.sheltermap.persistence;

import ee.sheltermap.domain.VerificationLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

/** Spring Data repository for {@link PendingVerificationEntity} — internal to the persistence layer. */
public interface SpringDataPendingVerificationRepository extends JpaRepository<PendingVerificationEntity, Long> {

    /** The still-valid (not expired) pending verification for user+level, if any. */
    Optional<PendingVerificationEntity> findByUserIdAndLevelAndExpiresAtGreaterThan(
            Long userId, VerificationLevel level, Instant now);
}
