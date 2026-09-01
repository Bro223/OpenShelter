package ee.sheltermap.auth;

import ee.sheltermap.domain.ContactChangeType;

import java.time.Instant;
import java.util.Objects;

/**
 * One pending email/phone change per user per type, awaiting verification
 * via the OTHER channel. Code discipline mirrors {@code PendingVerification}:
 * stored <strong>hashed</strong> (SHA-256), attempts-limited and expiring.
 */
public class PendingContactChange {

    private Long id;
    private final Long userId;
    private final ContactChangeType type;
    private final String target;
    private final String codeHash;
    private int attempts;
    private final Instant expiresAt;
    private final Instant createdAt;

    public PendingContactChange(Long userId, ContactChangeType type, String target,
                                String codeHash, Instant expiresAt, Instant createdAt) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.type = Objects.requireNonNull(type, "type");
        this.target = Objects.requireNonNull(target, "target");
        this.codeHash = Objects.requireNonNull(codeHash, "codeHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public ContactChangeType getType() {
        return type;
    }

    public String getTarget() {
        return target;
    }

    public String getCodeHash() {
        return codeHash;
    }

    public int getAttempts() {
        return attempts;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean isAttemptExhausted(int maxAttempts) {
        return attempts >= maxAttempts;
    }

    public void registerFailedAttempt() {
        attempts++;
    }
}
