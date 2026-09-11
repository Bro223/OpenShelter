package ee.sheltermap.persistence;

import ee.sheltermap.domain.ContactChangeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Spring Data repository for {@link PendingContactChangeEntity} — internal to the persistence layer. */
public interface SpringDataPendingContactChangeRepository extends JpaRepository<PendingContactChangeEntity, Long> {

    Optional<PendingContactChangeEntity> findByUserIdAndType(Long userId, ContactChangeType type);

    /**
     * S2 (2026-09-11 review): atomic attempts increment — the ROW is the
     * lock. A concurrent burst of wrong-code confirms each bumps the counter
     * once instead of all writing attempts=k+1 from a stale read. Updates 0
     * rows when the row is already at (or past) the cap.
     *
     * <p>{@code clearAutomatically} drops the persistence context after the
     * bulk UPDATE so the next read in the same transaction sees the fresh
     * counter — a managed row loaded before the increment would otherwise
     * keep serving its stale value (the IT's single test-transaction across
     * MockMvc calls exposes exactly that). The increment runs only on the
     * wrong-code path, which returns immediately after it, so the clear has
     * no other effect in the confirm flow.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE PendingContactChangeEntity e SET e.attempts = e.attempts + 1 "
            + "WHERE e.id = :id AND e.attempts < :maxAttempts")
    int incrementAttempts(@Param("id") Long id, @Param("maxAttempts") int maxAttempts);
}
