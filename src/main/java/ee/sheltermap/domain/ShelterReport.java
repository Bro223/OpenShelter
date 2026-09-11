package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * One community shelter report (shelter-trust-and-reports D1).
 *
 * <p>At most one report of a given type per user per shelter (unique
 * {@code shelterId + userId + type}, enforced by the database).
 * {@code detail} is the optional free text of {@code OTHER} reports —
 * {@code null} for the other types.
 */
public class ShelterReport {

    public static final int MAX_DETAIL_LENGTH = 500;

    private Long id;
    private final Long shelterId;
    private final Long userId;
    private final ShelterReportType type;
    private final String detail;
    private final Instant createdAt;

    public ShelterReport(Long shelterId, Long userId, ShelterReportType type, String detail) {
        this(shelterId, userId, type, detail, Instant.now());
    }

    ShelterReport(Long shelterId, Long userId, ShelterReportType type, String detail, Instant createdAt) {
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

    /** Free text of {@code OTHER} reports; {@code null} otherwise. */
    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
