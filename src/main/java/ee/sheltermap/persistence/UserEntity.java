package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * JPA entity for the single {@code users} table. Separate from the domain
 * {@code User} hierarchy (approach B) — the kind column discriminates.
 *
 * <p>PII-at-rest (M2): {@code email} / {@code phone} hold the
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
}
