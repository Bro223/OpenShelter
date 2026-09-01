package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from VerificationClaimEntity v where v.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
