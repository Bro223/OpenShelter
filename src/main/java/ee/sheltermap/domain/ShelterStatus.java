package ee.sheltermap.domain;

/**
 * Lifecycle of a shelter. User submissions are created {@code ACTIVE}
 * immediately (no moderator).
 */
public enum ShelterStatus {
    ACTIVE,
    INACTIVE
}
