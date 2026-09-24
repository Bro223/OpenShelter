package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterHistoryLog;
import org.springframework.stereotype.Repository;

import java.time.Clock;
import java.util.List;
import java.util.Objects;

/**
 * JPA implementation of {@link ShelterHistoryLog} (moderation-dashboard-
 * completion) — a plain JPA save in the CALLER's
 * transaction: every lifecycle event runs inside its {@code @Transactional}
 * service method, so the history row commits or rolls back with the event
 * it records (same-transaction write, no JdbcTemplate, no separate
 * transaction, no async).
 */
@Repository
public class JpaShelterHistoryLog implements ShelterHistoryLog {

    private final SpringDataShelterHistoryRepository history;
    private final Clock clock;

    public JpaShelterHistoryLog(SpringDataShelterHistoryRepository history, Clock clock) {
        this.history = Objects.requireNonNull(history, "history");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public void record(Long shelterId, String shelterName, Long actorUserId, Action action, String changesJson) {
        ShelterHistoryEntity entity = new ShelterHistoryEntity();
        entity.setShelterId(shelterId);
        entity.setShelterName(shelterName);
        entity.setActorUserId(actorUserId);
        entity.setAction(action);
        entity.setChanges(changesJson);
        entity.setCreatedAt(clock.instant());
        history.save(entity);
    }

    @Override
    public List<Event> findByShelterId(long shelterId) {
        return history.findByShelterIdOrderByIdAsc(shelterId).stream()
                .map(entity -> new Event(entity.getId(), entity.getShelterId(), entity.getShelterName(),
                        entity.getActorUserId(), entity.getAction(), entity.getChanges(),
                        entity.getCreatedAt()))
                .toList();
    }
}
