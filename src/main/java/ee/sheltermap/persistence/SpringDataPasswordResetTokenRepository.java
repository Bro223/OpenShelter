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

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PasswordResetTokenEntity t set t.usedAt = :now where t.id = :id")
    void markUsed(@Param("id") Long id, @Param("now") Instant now);
}
