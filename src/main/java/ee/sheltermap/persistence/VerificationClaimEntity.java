package ee.sheltermap.persistence;

import ee.sheltermap.domain.VerificationLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code verification_claims} — a history table: revoked
 * claims stay in place ({@code revokedAt} set), so re-verification of a
 * level inserts a new row rather than violating a uniqueness rule.
 */
@Entity
@Table(name = "verification_claims")
public class VerificationClaimEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private VerificationLevel level;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "external_ref", nullable = false, length = 255)
    private String externalRef;

    @Column(name = "verified_at", nullable = false)
    private Instant verifiedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public VerificationLevel getLevel() {
        return level;
    }

    public void setLevel(VerificationLevel level) {
        this.level = level;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(Instant verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }
}
