package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewStatus;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * In-memory fake of {@link ModerationAuditLog} for tests: the same
 * newest-first (created_at desc, id desc tie-break) read as the JPA log,
 * with an injected clock for deterministic ordering.
 */
public class InMemoryModerationAuditLog implements ModerationAuditLog {

    private final Clock clock;
    private long nextId = 1;
    private final List<Row> rows = new ArrayList<>();

    public InMemoryModerationAuditLog(Clock clock) {
        this.clock = clock;
    }

    @Override
    public synchronized void record(Long shelterId, Long subjectUserId, long moderatorId, Action action,
                                    String reason, ReviewStatus previousStatus, ReviewStatus newStatus) {
        rows.add(new Row(nextId++, shelterId, subjectUserId, moderatorId, action, reason,
                previousStatus, newStatus, clock.instant(), null));
    }

    @Override
    public synchronized void recordLabeled(long moderatorId, Action action, String subjectLabel,
                                           String reason) {
        // Crisis-guidance D12: a guidance/media row — no shelter, no subject account.
        rows.add(new Row(nextId++, null, null, moderatorId, action, reason,
                null, null, clock.instant(), subjectLabel));
    }

    /**
     * Records a row whose actor no longer exists — the state V14's
     * {@code moderation_actions.moderator_id ON DELETE SET NULL} produces when a
     * moderator's account is erased. Only the database can make a null actor, so
     * the fake has to be able to as well for the read path to be tested.
     */
    public synchronized void recordWithDanglingModerator(Long shelterId, Long subjectUserId, Action action,
                                                         String reason, ReviewStatus previousStatus,
                                                         ReviewStatus newStatus) {
        rows.add(new Row(nextId++, shelterId, subjectUserId, null, action, reason,
                previousStatus, newStatus, clock.instant(), null));
    }

    @Override
    public synchronized long countByModeratorAndAction(long moderatorId, Action action) {
        return rows.stream()
                .filter(r -> r.moderatorId() == moderatorId)
                .filter(r -> r.action() == action)
                .count();
    }

    @Override
    public synchronized List<Row> findLatest(int limit) {
        return rows.stream()
                .sorted(Comparator.comparing(Row::createdAt).reversed()
                        .thenComparing(Row::id, Comparator.reverseOrder()))
                .limit(limit)
                .toList();
    }

    @Override
    public synchronized int clearReasonByShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return 0;
        }
        int redacted = 0;
        for (int i = 0; i < rows.size(); i++) {
            Row row = rows.get(i);
            if (row.shelterId() != null && shelterIds.contains(row.shelterId()) && row.reason() != null) {
                rows.set(i, new Row(row.id(), row.shelterId(), row.subjectUserId(), row.moderatorId(),
                        row.action(), null, row.previousStatus(), row.newStatus(), row.createdAt(),
                        row.subjectLabel()));
                redacted++;
            }
        }
        return redacted;
    }

    @Override
    public synchronized int deleteOlderThan(Instant cutoff) {
        Objects.requireNonNull(cutoff, "cutoff");
        int before = rows.size();
        rows.removeIf(row -> row.createdAt().isBefore(cutoff));
        return before - rows.size();
    }

    @Override
    public synchronized List<LatestConfirmation> latestConfirmationByShelterIds(Collection<Long> shelterIds) {
        Map<Long, Instant> latest = new HashMap<>();
        for (Row row : rows) {
            if (row.action() != Action.CONFIRM && row.action() != Action.AUTO_CONFIRM) {
                continue;
            }
            if (!shelterIds.contains(row.shelterId())) {
                continue;
            }
            latest.merge(row.shelterId(), row.createdAt(), (a, b) -> a.isAfter(b) ? a : b);
        }
        return latest.entrySet().stream()
                .map(e -> new LatestConfirmation(e.getKey(), e.getValue()))
                .toList();
    }

    /** Every recorded row, in recording order (for assertions). */
    public List<Row> rows() {
        return List.copyOf(rows);
    }

    public void clear() {
        rows.clear();
    }
}
