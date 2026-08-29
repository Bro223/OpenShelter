package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Spring Data repository for {@link VerificationClaimEntity} — internal to the persistence layer. */
public interface SpringDataVerificationClaimRepository extends JpaRepository<VerificationClaimEntity, Long> {

    List<VerificationClaimEntity> findByUserId(Long userId);

    /** Removes all claims of a user (used by the replace-all save strategy). */
    void deleteByUserId(Long userId);
}
