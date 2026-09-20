package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

/**
 * JPA entity for the single {@code users} table. Separate from the domain
 * {@code User} hierarchy (approach B) — the kind column discriminates.
 *
 * <p>PII-at-rest: {@code email} / {@code phone} hold the
 * {@code v1:} AES-GCM envelope (ciphertext), never plaintext — the
 * {@code v13} V13 migration converted the legacy rows. {@code email_hash}
 * / {@code phone_hash} hold the HMAC blind index of the canonical value
 * (e-mail lower-cased, phone E.164); uniqueness and login lookups run on
 * the hashes (unique index {@code uq_users_email_hash} /
 * {@code uq_users_phone_hash}). All crypto lives in
 * {@code ee.sheltermap.security.PiiCrypto}, applied by {@link UserMapper}.
 */
@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserKind kind;

    @Column(length = 255)
    private String name;

    @Column(length = 1024)
    private String email;

    @Column(length = 64)
    private String phone;

    @Column(name = "email_hash", length = 64)
    private String emailHash;

    @Column(name = "phone_hash", length = 64)
    private String phoneHash;

    /** Suspension stamp; NULL while the account is active. */
    @Column(name = "suspended_at")
    private Instant suspendedAt;

    /**
     * Last sign-in-activity stamp (retention-pruning, V24). NOT NULL —
     * the retention job prunes accounts by this column, and a NULL would
     * read as "inactive since forever" (the V24 backfill + the auth-path
     * stamps + the DB default keep it filled; see the migration).
     */
    @Column(name = "last_activity_at", nullable = false)
    private Instant lastActivityAt;

    /**
     * Optimistic-lock counter (V29): the whole-row save from a
     * request-time snapshot carries the version the snapshot was read
     * with, so a row committed in the meantime (the material case: an
     * admin suspension) makes the UPDATE match zero rows and the flush
     * raise an optimistic-lock failure (→ the API layer's existing 409)
     * instead of silently reverting that write. The domain
     * {@code User} carries the stamp across the request (the mapper
     * round-trips it) — unlike {@code Shelter}, where the domain stays
     * version-free and the save mutates the managed row in place. The
     * column-only last_activity_at stamps do NOT bump this.
     */
    @Version
    @Column(name = "version")
    private Long version;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserKind getKind() {
        return kind;
    }

    public void setKind(UserKind kind) {
        this.kind = kind;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    /** Stored ciphertext ({@code v1:} envelope); see {@link UserMapper}. */
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    /** Stored ciphertext ({@code v1:} envelope); see {@link UserMapper}. */
    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    /** HMAC blind index of the canonical e-mail; NULL for guests. */
    public String getEmailHash() {
        return emailHash;
    }

    public void setEmailHash(String emailHash) {
        this.emailHash = emailHash;
    }

    /** HMAC blind index of the canonical (E.164) phone; NULL when no phone. */
    public String getPhoneHash() {
        return phoneHash;
    }

    public void setPhoneHash(String phoneHash) {
        this.phoneHash = phoneHash;
    }

    public Instant getSuspendedAt() {
        return suspendedAt;
    }

    public void setSuspendedAt(Instant suspendedAt) {
        this.suspendedAt = suspendedAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
