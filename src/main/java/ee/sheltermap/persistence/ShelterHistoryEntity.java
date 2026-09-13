package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterHistoryLog;
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
 * JPA entity for {@code shelter_history} (V18,
 * moderation-dashboard-completion M10 slice 2, D4) — one immutable row per
 * USER-shelter lifecycle event, written in the same transaction as the
 * event it records.
 */
@Entity
@Table(name = "shelter_history")
public class ShelterHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The shelter of the event. NO FK in the DB (the V11
     *  moderation_actions convention): the delete's own DELETED row dangles
     *  after the cascade and must stay findable by the id — a referential
     *  action cannot serve that. Nullable so the dangling state is legal. */
    @Column(name = "shelter_id")
    private Long shelterId;

    /** The shelter's name SNAPSHOT at event time (renames do not rewrite
     *  history). */
    @Column(name = "shelter_name", nullable = false, length = 255)
    private String shelterName;

    /** The acting account (submitter, owner, or moderating admin). NO FK:
     *  an account erasure orphans the actor — it renders "Unknown" at read
     *  time. Nullable (legacy rows have no author link). */
    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShelterHistoryLog.Action action;

    /** Compact JSON {"field": [old, new]} over the moved fields (EDITED);
     *  NULL for CREATED/DELETED. */
    @Column(length = 8000)
    private String changes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    public String getShelterName() {
        return shelterName;
    }

    public void setShelterName(String shelterName) {
        this.shelterName = shelterName;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(Long actorUserId) {
        this.actorUserId = actorUserId;
    }

    public ShelterHistoryLog.Action getAction() {
        return action;
    }

    public void setAction(ShelterHistoryLog.Action action) {
        this.action = action;
    }

    public String getChanges() {
        return changes;
    }

    public void setChanges(String changes) {
        this.changes = changes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
