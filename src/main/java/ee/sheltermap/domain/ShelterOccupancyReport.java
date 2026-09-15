package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * The caller's live occupancy report for a shelter (shelter-trust-and-reports
 * D4). One row per (shelter, user): re-reporting UPDATES the row
 * ({@code updated_at} refreshed, latest band wins) — never a new row.
 *
 * <p>{@code updatedAt} (not a creation time) is what the 2 h freshness
 * window is checked against at read time.
 */
public class ShelterOccupancyReport {

    private Long id;
    private final Long shelterId;
    private final Long userId;
    private OccupancyBand band;
    private Instant updatedAt;

    public ShelterOccupancyReport(Long shelterId, Long userId, OccupancyBand band, Instant updatedAt) {
        this.shelterId = Objects.requireNonNull(shelterId, "shelterId");
        this.userId = Objects.requireNonNull(userId, "userId");
        setBand(band);
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    /** Re-reporting = update, not insert (latest band wins). */
    public void update(OccupancyBand newBand, Instant newUpdatedAt) {
        setBand(newBand);
        this.updatedAt = Objects.requireNonNull(newUpdatedAt, "newUpdatedAt");
    }

    private void setBand(OccupancyBand band) {
        this.band = Objects.requireNonNull(band, "band");
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

    public OccupancyBand getBand() {
        return band;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
