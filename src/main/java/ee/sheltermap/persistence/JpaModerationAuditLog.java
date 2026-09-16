package ee.sheltermap.persistence;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.ReviewStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * JPA implementation of {@link ModerationAuditLog} (community-review-queue
 * D4) — a plain JPA save in the CALLER's transaction: every admin action
 * runs inside its {@code @Transactional} service method, so the audit row
 * commits or rolls back with the action it records (same-transaction
 * write, no JdbcTemplate, no separate transaction, no async).
 */
@Repository
public class JpaModerationAuditLog implements ModerationAuditLog {

    private final SpringDataModerationActionRepository actions;
    private final Clock clock;

    public JpaModerationAuditLog(SpringDataModerationActionRepository actions, Clock clock) {
        this.actions = Objects.requireNonNull(actions, "actions");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public void record(Long shelterId, Long subjectUserId, long moderatorId, Action action, String reason,
                       ReviewStatus previousStatus, ReviewStatus newStatus) {
        ModerationActionEntity entity = new ModerationActionEntity();
        entity.setShelterId(shelterId);
        entity.setSubjectUserId(subjectUserId);
        entity.setModeratorId(moderatorId);
        entity.setAction(action);
        entity.setReason(reason);
        entity.setPreviousStatus(previousStatus);
        entity.setNewStatus(newStatus);
        entity.setCreatedAt(clock.instant());
        actions.save(entity);
    }

    @Override
    public void recordLabeled(long moderatorId, Action action, String subjectLabel, String reason) {
        // Crisis-guidance D12: a guidance/media row — no shelter, no
        // subject account; the subjectLabel snapshot is the subject (it
        // outlives the deleted target). Same-transaction write, like every
        // other row in this log.
        ModerationActionEntity entity = new ModerationActionEntity();
        entity.setShelterId(null);
        entity.setSubjectUserId(null);
        entity.setModeratorId(moderatorId);
        entity.setAction(action);
        entity.setReason(reason);
        entity.setSubjectLabel(subjectLabel);
        entity.setCreatedAt(clock.instant());
        actions.save(entity);
    }

    @Override
    public long countByModeratorAndAction(long moderatorId, Action action) {
        return actions.countByModeratorIdAndAction(moderatorId, action);
    }

    @Override
    public List<Row> findLatest(int limit) {
        // Newest first; the id tie-break keeps same-timestamp rows
        // deterministic (the stable-order discipline, B7a).
        var page = actions.findAll(
                PageRequest.of(0, limit, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        return page.getContent().stream()
                .map(entity -> new Row(entity.getId(), entity.getShelterId(), entity.getSubjectUserId(),
                        entity.getModeratorId(),
                        entity.getAction(), entity.getReason(), entity.getPreviousStatus(),
                        entity.getNewStatus(), entity.getCreatedAt(), entity.getSubjectLabel()))
                .toList();
    }

    @Override
    public int clearReasonByShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return 0;
        }
        // Runs in the caller's transaction (the erasure service is @Transactional).
        return actions.clearReasonByShelterIds(shelterIds);
    }

    @Override
    @Transactional
    public int deleteOlderThan(Instant cutoff) {
        Objects.requireNonNull(cutoff, "cutoff");
        // The background retention job — its OWN transaction (the caller
        // is the scheduler, not an action service), so a prune failure
        // rolls back only the prune, never an admin action.
        return actions.deleteOlderThan(cutoff);
    }

    @Override
    public List<LatestConfirmation> latestConfirmationByShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return List.of();
        }
        return actions.latestConfirmingByShelterIds(shelterIds,
                List.of(Action.CONFIRM, Action.AUTO_CONFIRM)).stream()
                .map(row -> new LatestConfirmation(((Number) row[0]).longValue(),
                        (Instant) row[1]))
                .toList();
    }
}
