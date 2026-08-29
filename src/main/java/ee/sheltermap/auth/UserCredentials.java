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

    public UserCredentials(Long userId, String passwordHash) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash");
        this.createdAt = Instant.now();
        this.changedAt = this.createdAt;
    }

    /**
     * Full-state constructor used by the persistence layer (Step 3) to
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

    /** Replaces the hash and stamps the change (password rotation / reset). */
    public void updateHash(String newHash) {
        this.passwordHash = Objects.requireNonNull(newHash, "newHash");
        this.changedAt = Instant.now();
    }
}
