package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * One community shelter report (shelter-trust-and-reports D1).
 *
 * <p>At most one report of a given type per user per shelter (unique
 * {@code shelterId + userId + type}, enforced by the database).
 * {@code detail} is the factual substance of the factual report types
 * (M11): the "when" of a {@code CLOSED} report, the actual address of a
 * {@code WRONG_LOCATION} report, the free text of {@code OTHER} —
 * {@code null} for the binary types {@code NON_EXISTENT} /
 * {@code OPEN_CONFIRMED}.
 */
public class ShelterReport {

    public static final int MAX_DETAIL_LENGTH = 500;
    /**
     * The trust-weighted {@code NON_EXISTENT} hide tally at which an ACTIVE
     * shelter is auto-hidden (shelter-trust-and-reports D1 — the 4→5
     * transition; community-self-moderation M9 made the tally trust-
     * weighted: each distinct reporter contributes their derived weight,
     * dampened reports 0 — five baseline reporters still hide on the
     * fifth report). A domain fact: the trust service enforces it, and
     * the provenance taxonomy (shelter-provenance-taxonomy) derives
     * REPORTED_INACTIVE from it.
     */
    public static final int AUTO_HIDE_THRESHOLD = 5;

    private Long id;
    private final Long shelterId;
    private final Long userId;
    private final ShelterReportType type;
    private final String detail;
    private final Instant createdAt;
    /** When an admin dismissed this report (V10, admin-moderation D3); {@code null} while unresolved. */
    private Instant dismissedAt;
    /**
     * Dampened flag (community-self-moderation M9, D3): set once at write
     * time when the reporter holds their own other USER listing of the
     * same place — a self-interested {@code NON_EXISTENT} vote that
     * contributes 0 to the weighted auto-hide tally. The report stays
     * stored and visible in the admin queue (flagged), never deleted.
     */
    private boolean damped;

    public ShelterReport(Long shelterId, Long userId, ShelterReportType type, String detail) {
        this(shelterId, userId, type, detail, Instant.now());
    }

    /**
     * Full-state constructor used by the persistence layer to restore an
     * existing report from storage (dismissal stamp included).
     */
    public ShelterReport(Long shelterId, Long userId, ShelterReportType type, String detail,
                         Instant createdAt) {
        this.shelterId = Objects.requireNonNull(shelterId, "shelterId");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.type = Objects.requireNonNull(type, "type");
        this.detail = normalizeDetail(detail);
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    private static String normalizeDetail(String detail) {
        if (detail == null) {
            return null;
        }
        if (detail.length() > MAX_DETAIL_LENGTH) {
            throw new IllegalArgumentException("detail must be at most " + MAX_DETAIL_LENGTH + " chars");
        }
        return detail;
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

    public ShelterReportType getType() {
        return type;
    }

    /** Factual detail (M11): stored for {@code CLOSED} / {@code WRONG_LOCATION} / {@code OTHER}; {@code null} for the binary types. */
    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /** {@code true} once an admin dismissed this report (the queue's resolved marker). */
    public boolean isDismissed() {
        return dismissedAt != null;
    }

    public Instant getDismissedAt() {
        return dismissedAt;
    }

    /**
     * Dismisses the report (admin-moderation D3). Set ONCE — a second call
     * is a no-op, so a re-dismiss can never double-stamp the row. Dismissing
     * never deletes: the report stays recorded as resolved.
     */
    public void markDismissed(Instant dismissedAt) {
        if (this.dismissedAt == null) {
            this.dismissedAt = Objects.requireNonNull(dismissedAt, "dismissedAt");
        }
    }

    /** {@code true} once the report was stored dampened (M9, D3). */
    public boolean isDamped() {
        return damped;
    }

    /**
     * Marks the report dampened (M9, D3). Set ONCE at write time — a
     * second call is a no-op, mirroring {@link #markDismissed}; the damp
     * decision never un-damps a stored row.
     */
    public void markDamped() {
        this.damped = true;
    }
}
