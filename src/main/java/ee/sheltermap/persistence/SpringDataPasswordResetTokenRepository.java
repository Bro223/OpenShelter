package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

/** Spring Data repository for {@link PasswordResetTokenEntity} — internal to the persistence layer. */
public interface SpringDataPasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

    // findFirst (not a single-result Optional): if two active rows ever coexist
    // (e.g. a pre-V6 row that outlived a migration), confirm degrades to a
    // generic 400 instead of a 500 from IncorrectResultSizeDataAccessException.
    Optional<PasswordResetTokenEntity> findFirstByUserIdAndUsedAtIsNullAndExpiresAtGreaterThan(
            Long userId, Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from PasswordResetTokenEntity t where t.userId = :userId and t.usedAt is null"
            + " and t.expiresAt > :now")
    void deleteActiveByUserId(@Param("userId") Long userId, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PasswordResetTokenEntity t set t.usedAt = :now where t.id = :id")
    void markUsed(@Param("id") Long id, @Param("now") Instant now);
}
