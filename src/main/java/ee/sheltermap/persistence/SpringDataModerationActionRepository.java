package ee.sheltermap.persistence;

import ee.sheltermap.app.ModerationAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/** Spring Data repository for {@link ModerationActionEntity} — internal to the persistence layer. */
public interface SpringDataModerationActionRepository extends JpaRepository<ModerationActionEntity, Long> {

    /** The reporter's own rows of one action — derived trust input (community-self-moderation, D1). */
    long countByModeratorIdAndAction(Long moderatorId, ModerationAuditLog.Action action);

    /** Erasure redaction (legal-recovery) — rows survive, only the free text goes. */
    @Modifying
    @Query("update ModerationActionEntity e set e.reason = null "
            + "where e.shelterId in :shelterIds and e.reason is not null")
    int clearReasonByShelterIds(@Param("shelterIds") Collection<Long> shelterIds);

    /** Retention-pruning: the bulk horizon delete (runs in its own transaction). */
    @Modifying
    @Query("delete from ModerationActionEntity a where a.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);

    /** One row per shelter: [shelterId, newest createdAt] over the given confirming actions. */
    @Query("select a.shelterId, max(a.createdAt) from ModerationActionEntity a "
            + "where a.shelterId in :ids and a.action in :actions group by a.shelterId")
    List<Object[]> latestConfirmingByShelterIds(@Param("ids") Collection<Long> ids,
                                                @Param("actions") Collection<ModerationAuditLog.Action> actions);
}
