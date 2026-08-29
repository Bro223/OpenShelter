package ee.sheltermap.persistence;

/**
 * Row-level discriminator for the single {@code users} table (approach B:
 * persistence entities are separate from the domain {@code User} hierarchy).
 */
public enum UserKind {
    GUEST,
    REGISTERED,
    ADMIN
}
