package ee.sheltermap.persistence;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.ReviewStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.time.Clock;
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
    public void record(long shelterId, long moderatorId, Action action, String reason,
                       ReviewStatus previousStatus, ReviewStatus newStatus) {
        ModerationActionEntity entity = new ModerationActionEntity();
        entity.setShelterId(shelterId);
        entity.setModeratorId(moderatorId);
        entity.setAction(action);
        entity.setReason(reason);
        entity.setPreviousStatus(previousStatus);
        entity.setNewStatus(newStatus);
        entity.setCreatedAt(clock.instant());
        actions.save(entity);
    }

    @Override
    public List<Row> findLatest(int limit) {
        // Newest first; the id tie-break keeps same-timestamp rows
        // deterministic (the stable-order discipline, B7a).
        var page = actions.findAll(
                PageRequest.of(0, limit, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        return page.getContent().stream()
                .map(entity -> new Row(entity.getId(), entity.getShelterId(), entity.getModeratorId(),
                        entity.getAction(), entity.getReason(), entity.getPreviousStatus(),
                        entity.getNewStatus(), entity.getCreatedAt()))
                .toList();
    }
}
