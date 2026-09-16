package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data repository for {@link UserEntity} — internal to the
 * persistence layer.
 *
 * <p>PII-at-rest: lookups run on the HMAC blind indexes
 * ({@code email_hash} / {@code phone_hash}) — the {@code email} /
 * {@code phone} columns hold ciphertext and are never matched against.
 */
public interface SpringDataUserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmailHash(String emailHash);

    Optional<UserEntity> findByPhoneHash(String phoneHash);

    /** Id-ordered full-table read (the admin Users tab). */
    List<UserEntity> findAllByOrderByIdAsc();

    /**
     * Retention-pruning: the REGISTERED-kind accounts idle since before
     * the cutoff — the prune candidates (ADMIN is never a candidate).
     */
    List<UserEntity> findAllByKindAndLastActivityAtBefore(UserKind kind, Instant lastActivityAt);

    /** Retention-pruning: column-only activity stamp (no aggregate load). */
    @Modifying
    @Query("update UserEntity u set u.lastActivityAt = :at where u.id = :id")
    int markLastActivityById(@Param("id") Long id, @Param("at") Instant at);
}
