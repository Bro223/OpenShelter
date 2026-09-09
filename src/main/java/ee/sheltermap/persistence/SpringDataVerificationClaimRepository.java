package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Spring Data repository for {@link VerificationClaimEntity} — internal to the persistence layer. */
public interface SpringDataVerificationClaimRepository extends JpaRepository<VerificationClaimEntity, Long> {

    List<VerificationClaimEntity> findByUserId(Long userId);

    /**
     * Removes all claims of a user (used by the replace-all save strategy).
     *
     * <p>Must be a BULK delete ({@code @Modifying}): a derived delete queues
     * {@code EntityManager.remove} in the persistence context, and Hibernate
     * flushes INSERTs BEFORE DELETEs — so re-inserting the claims would hit
     * the still-present active row and violate
     * {@code uq_verification_claims_user_level_active} (V3). A bulk delete
     * runs immediately in SQL, before the queued inserts.
     *
     * <p>{@code clearAutomatically} (N11): the bulk delete bypasses the
     * persistence context, so claim rows loaded earlier in the same
     * transaction would otherwise linger as stale managed entities and a
     * later in-tx read could see stale + fresh rows. The clear is safe:
     * {@code flushAutomatically} runs first (no writes are lost — the claim
     * re-inserts happen AFTER this call), and the entity model has no JPA
     * associations, so evicting managed entities cannot break lazy state.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from VerificationClaimEntity v where v.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    /**
     * Removes exactly the claim rows with the given ids (N10 diff-based
     * save: only REMOVED claims go away — kept rows keep their ids).
     *
     * <p>Same BULK-delete rationale as {@link #deleteByUserId}: a queued
     * entity removal would be flushed AFTER the new claim INSERTs and hit
     * the still-present active row, violating
     * {@code uq_verification_claims_user_level_active} (V3). A bulk delete
     * runs immediately in SQL, before the re-inserts. {@code
     * clearAutomatically} keeps the same stale-plus-fresh guarantee for
     * in-tx reads; the ids of KEPT rows are copied onto the domain claims
     * before this call, so the clear cannot lose them.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from VerificationClaimEntity v where v.id in :ids")
    void deleteByIds(@Param("ids") Collection<Long> ids);

    /** Batched claims lookup (used by {@code JpaUserRepository.findByIds}). */
    List<VerificationClaimEntity> findByUserIdIn(Collection<Long> userIds);
}
