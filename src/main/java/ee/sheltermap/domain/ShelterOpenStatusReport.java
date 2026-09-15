package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * The caller's live open/closed state for a shelter (same level as
 * capacity). One row per (shelter, user): a new tap UPDATES the row
 * ({@code created_at} refreshed, latest state wins) — never a new row.
 *
 * <p>{@code createdAt} (not the original insert time — a re-tap refreshes
 * it) is what the 2 h freshness window is checked against at read time.
 */
public class ShelterOpenStatusReport {

    private Long id;
    private final Long shelterId;
    private final Long userId;
    private OpenStatusState state;
    private Instant createdAt;

    public ShelterOpenStatusReport(Long shelterId, Long userId, OpenStatusState state, Instant createdAt) {
        this.shelterId = Objects.requireNonNull(shelterId, "shelterId");
        this.userId = Objects.requireNonNull(userId, "userId");
        setState(state);
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    /** Re-tap = update, not insert (latest state wins, created_at refreshed). */
    public void update(OpenStatusState newState, Instant newCreatedAt) {
        setState(newState);
        this.createdAt = Objects.requireNonNull(newCreatedAt, "newCreatedAt");
    }

    private void setState(OpenStatusState state) {
        this.state = Objects.requireNonNull(state, "state");
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public Long getUserId() {
        return userId;
    }

    public OpenStatusState getState() {
        return state;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
