package ee.sheltermap.auth;

import java.time.Instant;
import java.util.Objects;

/**
 * Password credentials for a {@code RegisteredUser} — a SEPARATE aggregate
 * from the user profile on purpose (03-auth.puml): profile PII and password
 * secrets live apart, so a leak of one table does not leak the other.
 *
 * <p>Passwords are stored as an Argon2id hash string (salt embedded — no
 * separate salt column). Plaintext passwords are never stored or logged.
 */
public class UserCredentials {

    private final Long userId;
    private String passwordHash;
    private final Instant createdAt;
    private Instant changedAt;

    /**
     * Fresh credential row: the caller's instant stamps BOTH timestamps
     * (a new row's creation IS its first change) — the domain never
     * reaches for the wall clock (the
     * {@code PasswordResetToken.markUsed(Instant)} idiom).
     */
    public UserCredentials(Long userId, String passwordHash, Instant now) {
        this(userId, passwordHash, now, now);
    }

    /**
     * Full-state constructor used by the persistence layer to
     * restore stored timestamps.
     */
    public UserCredentials(Long userId, String passwordHash, Instant createdAt, Instant changedAt) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.changedAt = Objects.requireNonNull(changedAt, "changedAt");
    }

    public Long getUserId() {
        return userId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getChangedAt() {
        return changedAt;
    }

    /** Replaces the hash and stamps the change with the caller's instant (password rotation / reset). */
    public void updateHash(String newHash, Instant now) {
        this.passwordHash = Objects.requireNonNull(newHash, "newHash");
        this.changedAt = Objects.requireNonNull(now, "now");
    }
}
