package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code shelter_info_requests} (V19,
 * moderation-dashboard-completion) — the moderator→submitter
 * information request: ONE row per shelter (the UNIQUE bound), kept after
 * the reply (audit posture).
 */
@Entity
@Table(name = "shelter_info_requests")
public class ShelterInfoRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The shelter the request is about. ON DELETE CASCADE (V1 convention
     *  — the exchange is about this shelter; a hard delete takes it). */
    @Column(name = "shelter_id", nullable = false)
    private Long shelterId;

    /** The moderator's question (≤ 2000 chars). */
    @Column(nullable = false, length = 2000)
    private String message;

    /** The moderating admin who asked. SET NULL on account erasure (V14
     *  convention) — the exchange outlives the account. */
    @Column(name = "requested_by")
    private Long requestedBy;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    /** The submitter's ONE-TIME reply; NULL until answered. */
    @Column(name = "reply_message", length = 2000)
    private String replyMessage;

    /** The submitter who answered. SET NULL on account erasure. */
    @Column(name = "replied_by")
    private Long repliedBy;

    @Column(name = "replied_at")
    private Instant repliedAt;

    public Long getId() {
        return id;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(Long requestedBy) {
        this.requestedBy = requestedBy;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(Instant requestedAt) {
        this.requestedAt = requestedAt;
    }

    public String getReplyMessage() {
        return replyMessage;
    }

    public void setReplyMessage(String replyMessage) {
        this.replyMessage = replyMessage;
    }

    public Long getRepliedBy() {
        return repliedBy;
    }

    public void setRepliedBy(Long repliedBy) {
        this.repliedBy = repliedBy;
    }

    public Instant getRepliedAt() {
        return repliedAt;
    }

    public void setRepliedAt(Instant repliedAt) {
        this.repliedAt = repliedAt;
    }
}
