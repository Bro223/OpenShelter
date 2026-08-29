package ee.sheltermap.domain;

/**
 * Lifecycle of a shelter. User submissions are created {@code ACTIVE}
 * immediately (no moderator); {@code PENDING}/{@code REJECTED} are reserved
 * for future use — no code path creates them in v1.
 */
public enum ShelterStatus {
    ACTIVE,
    INACTIVE,
    PENDING,
    REJECTED
}
