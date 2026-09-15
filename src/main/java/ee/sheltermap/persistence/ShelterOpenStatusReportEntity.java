package ee.sheltermap.persistence;

import ee.sheltermap.domain.OpenStatusState;
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
 * JPA entity for {@code shelter_open_status} (V22 — live open/closed
 * state, same level as capacity). The unique constraint
 * {@code (shelter_id, user_id)} — one live state per user per shelter —
 * is enforced by the database; {@code created_at} (refreshed by every
 * re-tap) anchors the 2 h read-time freshness window.
 */
@Entity
@Table(name = "shelter_open_status")
public class ShelterOpenStatusReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shelter_id", nullable = false)
    private Long shelterId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OpenStatusState state;

    @Column(name = "created_at", nullable = false)
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

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public OpenStatusState getState() {
        return state;
    }

    public void setState(OpenStatusState state) {
        this.state = state;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
