package ee.sheltermap.domain;

/**
 * Abstract base of ALL users — every kind IS-A {@code User} (the "Bird",
 * TIJ Ch 1). Kinds are fixed at creation; verification is claims (data),
 * never subclasses.
 *
 * <p>Subclasses override the base contract; they never add methods that a
 * {@code User} reference cannot see.
 */
public abstract class User {

    private Long id;

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    /** Immutable snapshot of this user's data — never live internals. */
    public abstract UserData getData();

    /** {@code VIEW_MAP} is baseline: everyone, including guests, can watch. */
    public boolean canWatch() {
        return true;
    }

    public abstract boolean canWrite();

    public abstract void deleteAccount();
}
