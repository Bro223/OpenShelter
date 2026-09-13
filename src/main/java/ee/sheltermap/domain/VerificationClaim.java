package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * A single verified channel claim (email / phone / Smart-ID).
 *
 * <p>Verification is DATA, not inheritance: a user never changes class; a
 * claim is added when verified and revoked later. {@code revokedAt} is
 * {@code null} while the claim is active.
 */
public class VerificationClaim {

    private Long id;
    private final VerificationLevel level;
    private final String provider;
    private final String externalRef;
    private final Instant verifiedAt;
    private Instant revokedAt;

    public VerificationClaim(VerificationLevel level, String provider, String externalRef, Instant verifiedAt) {
        this.level = Objects.requireNonNull(level, "level");
        this.provider = Objects.requireNonNull(provider, "provider");
        // May be null: a legacy row whose stored ref is blank (pre-M1 dev
        // DB) carries no external reference.
        this.externalRef = externalRef;
        this.verifiedAt = Objects.requireNonNull(verifiedAt, "verifiedAt");
    }

    /**
     * Full-state constructor used by the persistence layer (Step 3) to
     * restore a previously revoked claim from storage.
     */
    public VerificationClaim(VerificationLevel level, String provider, String externalRef,
                             Instant verifiedAt, Instant revokedAt) {
        this(level, provider, externalRef, verifiedAt);
        this.revokedAt = revokedAt;
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    public VerificationLevel getLevel() {
        return level;
    }

    public String getProvider() {
        return provider;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
