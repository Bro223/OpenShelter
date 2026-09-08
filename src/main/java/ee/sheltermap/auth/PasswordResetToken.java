package ee.sheltermap.auth;

import java.time.Instant;
import java.util.Objects;

/**
 * Single-use, expiring password-reset CODE (03-auth.puml).
 *
 * <p>Code discipline mirrors verification: the 6-digit code is stored
 * <strong>hashed</strong> (SHA-256) — the plaintext code travels only in the
 * reset e-mail; failed confirmations are attempts-limited (brute-force
 * guard); {@code usedAt} is {@code null} while unused.
 */
public class PasswordResetToken {

    private Long id;
    private final Long userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private Instant usedAt;
    private int attempts;

    public PasswordResetToken(Long userId, String tokenHash, Instant expiresAt) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
    }

    /**
     * Full-state constructor used by the persistence layer to restore a
     * token (incl. used state and the failed-attempt count) from storage.
     */
    public PasswordResetToken(Long userId, String tokenHash, Instant expiresAt,
                              Instant usedAt, int attempts) {
        this(userId, tokenHash, expiresAt);
        this.usedAt = usedAt;
        this.attempts = attempts;
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    /** Failed confirm attempts so far (brute-force guard). */
    public int getAttempts() {
        return attempts;
    }

    /** Registers a failed attempt; returns the new count. */
    public int recordAttempt() {
        return ++attempts;
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }
}
