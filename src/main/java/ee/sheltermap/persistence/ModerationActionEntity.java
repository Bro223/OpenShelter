package ee.sheltermap.persistence;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.ReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code moderation_actions} (V11, community-review-queue
 * D4) — one row per admin moderation action, written in the same
 * transaction as the action it records.
 */
@Entity
@Table(name = "moderation_actions")
public class ModerationActionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The target shelter — NO FK in the DB (deliberate): after a shelter
     *  delete the id dangles and the name resolves to "Deleted shelter". */
    @Column(name = "shelter_id", nullable = false)
    private Long shelterId;

    /** The acting admin's user id. */
    @Column(name = "moderator_id", nullable = false)
    private Long moderatorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ModerationAuditLog.Action action;

    /** The REJECT/NEEDS_INFO reason, when given. */
    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private ReviewStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 20)
    private ReviewStatus newStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    public Long getModeratorId() {
        return moderatorId;
    }

    public void setModeratorId(Long moderatorId) {
        this.moderatorId = moderatorId;
    }

    public ModerationAuditLog.Action getAction() {
        return action;
    }

    public void setAction(ModerationAuditLog.Action action) {
        this.action = action;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public ReviewStatus getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(ReviewStatus previousStatus) {
        this.previousStatus = previousStatus;
    }

    public ReviewStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(ReviewStatus newStatus) {
        this.newStatus = newStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
