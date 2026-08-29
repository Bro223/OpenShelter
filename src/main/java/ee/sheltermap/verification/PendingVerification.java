package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;

/**
 * A one-time, short-lived verification code awaiting confirmation.
 *
 * <p>Code discipline: stored <strong>hashed</strong> (SHA-256), never
 * plaintext; attempts-limited (brute-force guard) and expiring
 * ({@code expiresAt}).
 */
public class PendingVerification {

    private Long id;
    private final Long userId;
    private final VerificationLevel level;
    private final String contact;
    private final String codeHash;
    private int attempts;
    private final Instant expiresAt;

    public PendingVerification(Long userId, VerificationLevel level, String contact,
                               String codeHash, Instant expiresAt) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.level = Objects.requireNonNull(level, "level");
        this.contact = Objects.requireNonNull(contact, "contact");
        this.codeHash = Objects.requireNonNull(codeHash, "codeHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
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

    public VerificationLevel getLevel() {
        return level;
    }

    /** The contact the code was sent to (e-mail address or phone number). */
    public String getContact() {
        return contact;
    }

    /** SHA-256 of the code — never the plaintext code. */
    public String getCodeHash() {
        return codeHash;
    }

    public int getAttempts() {
        return attempts;
    }

    /** Registers a failed attempt; returns the new count. */
    public int recordAttempt() {
        return ++attempts;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    /** SHA-256 hex digest — the one-way hash used for all codes at rest. */
    public static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
