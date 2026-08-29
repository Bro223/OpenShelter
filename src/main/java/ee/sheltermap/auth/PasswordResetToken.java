package ee.sheltermap.auth;

import java.time.Instant;
import java.util.Objects;

/**
 * Single-use, expiring password-reset token (03-auth.puml).
 *
 * <p>Stored <strong>hashed</strong> (SHA-256); the plaintext token travels
 * only in the reset email URL. {@code usedAt} is {@code null} while unused.
 */
public class PasswordResetToken {

    private Long id;
    private final Long userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private Instant usedAt;

    public PasswordResetToken(Long userId, String tokenHash, Instant expiresAt) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
    }

    /**
     * Full-state constructor used by the persistence layer (Step 3) to
     * restore a used token from storage.
     */
    public PasswordResetToken(Long userId, String tokenHash, Instant expiresAt, Instant usedAt) {
        this(userId, tokenHash, expiresAt);
        this.usedAt = usedAt;
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

    public void markUsed() {
        this.usedAt = Instant.now();
    }
}
