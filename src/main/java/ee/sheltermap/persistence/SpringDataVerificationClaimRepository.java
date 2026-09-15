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
     * Removes exactly the claim rows with the given ids (diff-based
     * save: only REMOVED claims go away — kept rows keep their ids).
     *
     * <p>Must be a BULK delete ({@code @Modifying}): a derived delete would
     * queue {@code EntityManager.remove} in the persistence context, and
     * Hibernate flushes INSERTs BEFORE DELETEs — so the re-inserted claims
     * would hit the still-present active row and violate
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
