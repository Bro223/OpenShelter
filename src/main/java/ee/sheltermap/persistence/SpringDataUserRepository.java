package ee.sheltermap.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
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
     * Paged admin Users tab read: the tab's kinds only (GUEST rows
     * are excluded in the SQL, so a page never loads — and never
     * decrypts — the whole account population), id-ordered, exact
     * OFFSET/LIMIT (Hibernate 6 JPQL).
     */
    @Query("select u from UserEntity u where u.kind in :kinds order by u.id asc "
            + "offset :offset fetch first :limit rows only")
    List<UserEntity> findAccountPage(@Param("kinds") Collection<UserKind> kinds,
                                     @Param("offset") long offset, @Param("limit") int limit);

    /** The tab's population count (X-Total-Count — same kinds as the page). */
    @Query("select count(u) from UserEntity u where u.kind in :kinds")
    long countAccounts(@Param("kinds") Collection<UserKind> kinds);

    /**
     * Retention-pruning: the REGISTERED-kind accounts idle since before
     * the cutoff — the prune candidates (ADMIN is never a candidate).
     */
    List<UserEntity> findAllByKindAndLastActivityAtBefore(UserKind kind, Instant lastActivityAt);

    /** Retention-pruning: column-only activity stamp (no aggregate load). */
    @Modifying
    @Query("update UserEntity u set u.lastActivityAt = :at where u.id = :id")
    int markLastActivityById(@Param("id") Long id, @Param("at") Instant at);

    /**
     * PESSIMISTIC_WRITE ({@code SELECT ... FOR UPDATE}) on the user row —
     * the per-user submission serialization lock (see
     * {@code UserRepository.lockForUpdate}). The result is not needed by
     * the caller; the lock itself is the effect. Empty for unknown ids.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserEntity u where u.id = :id")
    Optional<UserEntity> findByIdForUpdate(@Param("id") Long id);
}
