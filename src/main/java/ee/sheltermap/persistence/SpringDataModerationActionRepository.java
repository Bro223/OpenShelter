package ee.sheltermap.persistence;

import ee.sheltermap.app.ModerationAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Spring Data repository for {@link ModerationActionEntity} — internal to the persistence layer. */
public interface SpringDataModerationActionRepository extends JpaRepository<ModerationActionEntity, Long> {

    /** Erasure redaction (legal-recovery M4 slice 2) — rows survive, only the free text goes. */
    @Modifying
    @Query("update ModerationActionEntity e set e.reason = null "
            + "where e.shelterId in :shelterIds and e.reason is not null")
    int clearReasonByShelterIds(@Param("shelterIds") Collection<Long> shelterIds);

    /** One row per shelter: [shelterId, newest createdAt] over the given confirming actions (M8). */
    @Query("select a.shelterId, max(a.createdAt) from ModerationActionEntity a "
            + "where a.shelterId in :ids and a.action in :actions group by a.shelterId")
    List<Object[]> latestConfirmingByShelterIds(@Param("ids") Collection<Long> ids,
                                                @Param("actions") Collection<ModerationAuditLog.Action> actions);
}
