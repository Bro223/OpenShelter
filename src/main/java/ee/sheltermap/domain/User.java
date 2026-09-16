package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

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

    /**
     * Suspension stamp (moderation-dashboard-completion) —
     * non-null while the account is suspended. An INDEFINITE suspension
     * an admin lifts manually (no expiry policy exists); the state is a
     * plain account attribute, enforced by fresh lookups at the three
     * credential doors (login, refresh, JWT filter), never a JWT claim.
     */
    private Instant suspendedAt;

    /**
     * Last sign-in activity (retention-pruning): registration, a
     * successful login, or a refresh-token rotation stamps it. The
     * retention job prunes accounts idle beyond the owner's horizon by
     * this column, so a persisted row always carries a value (V24 is
     * NOT NULL — a NULL would read as "inactive since forever" and the
     * first run would erase every account).
     */
    private Instant lastActivityAt;


    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    /** Immutable snapshot of this user's data — never live internals. */
    public abstract UserData getData();

    public abstract boolean canWrite();

    public abstract void deleteAccount();

    /** The suspension stamp; {@code null} while the account is active. */
    public Instant getSuspendedAt() {
        return suspendedAt;
    }

    /**
     * Persistence boundary only (the mapper restores the stored stamp on
     * load); business code uses {@link #suspend(Instant)} /
     * {@link #unsuspend()}.
     */
    public void setSuspendedAt(Instant suspendedAt) {
        this.suspendedAt = suspendedAt;
    }

    /** Whether the account is suspended (login/refresh/tokens refuse it). */
    public boolean isSuspended() {
        return suspendedAt != null;
    }

    /** Suspends the account (idempotent — an already-set stamp is kept). */
    public void suspend(Instant when) {
        if (this.suspendedAt == null) {
            this.suspendedAt = Objects.requireNonNull(when, "when");
        }
    }

    /** Lifts the suspension (a no-op on an active account). */
    public void unsuspend() {
        this.suspendedAt = null;
    }

    /** The last sign-in-activity stamp (never null for a persisted row). */
    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    /**
     * Persistence boundary only (the mapper restores the stored stamp on
     * load); business code uses {@link #markActive(Instant)}.
     */
    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    /**
     * Records sign-in activity (register / login / refresh) — the stamp
     * starts (or restarts) the account's retention idle clock.
     */
    public void markActive(Instant when) {
        this.lastActivityAt = Objects.requireNonNull(when, "when");
    }
}
