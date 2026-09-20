package ee.sheltermap.persistence;

import ee.sheltermap.domain.VerificationLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

/** Spring Data repository for {@link PendingVerificationEntity} — internal to the persistence layer. */
public interface SpringDataPendingVerificationRepository extends JpaRepository<PendingVerificationEntity, Long> {

    // findFirst (not a single-result Optional): if two active rows ever
    // coexist for one (user, level) — a pre-fix double send, the
    // (user_id, level) index is NON-unique — confirm degrades to the
    // newest code (the one the user last received: highest expires_at,
    // the per-level TTL is fixed so expires_at orders the sends; id
    // breaks same-instant ties) instead of a 500 from
    // IncorrectResultSizeDataAccessException. The same findFirst idiom the
    // password-reset token read uses (SpringDataPasswordResetTokenRepository).
    Optional<PendingVerificationEntity> findFirstByUserIdAndLevelAndExpiresAtGreaterThanOrderByExpiresAtDescIdDesc(
            Long userId, VerificationLevel level, Instant now);
}
