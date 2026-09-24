package ee.sheltermap.security;

import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

/**
 * PII-at-rest crypto: AES-256-GCM encryption with a version-tagged
 * envelope, and the HMAC-SHA256 blind index that keeps uniqueness +
 * login lookups working without storing plaintext.
 *
 * <p>Envelope: {@code v1:} + Base64URL(12-byte nonce ‖ ciphertext+tag).
 * The {@code v1:} prefix is the key-slot tag — it lets the V13 migration
 * detect already-converted rows (idempotent reruns) and is the hook for
 * key rotation (a re-encrypting migration writes the next slot tag). Only
 * the active slot is decryptable by this class; a
 * foreign/unversioned value fails closed instead of being guessed.
 *
 * <p>The blind index is deterministic (same canonical contact ⇒ same
 * hash), keyed (a DB dump alone cannot be reversed) and domain-separated
 * (an e-mail and a phone with identical bytes hash differently).
 * Canonical forms: e-mail lower-cased + trimmed, phone E.164 — the same
 * normalizations the registration/login paths already apply.
 */
@Component
public class PiiCrypto {

    /** Blind-index domain tag for {@code users.email}. */
    public static final String DOMAIN_USER_EMAIL = "users.email";

    /** Blind-index domain tag for {@code users.phone}. */
    public static final String DOMAIN_USER_PHONE = "users.phone";

    /**
     * One-time-code hash slot tag (keyed, domain-separated). The {@code v2:}
     * prefix distinguishes a keyed code hash from a legacy unkeyed SHA-256
     * hex (no prefix): the confirm path accepts BOTH so in-flight codes
     * issued before the slot keep verifying until their TTL, and every NEW
     * code is {@code v2:} (same slot-tag idiom as the {@code v1:} PII
     * envelope — the hook for a future key-rotation rehash).
     */
    public static final String CODE_HASH_PREFIX = "v2:";

    /** Domain tag for password-reset 6-digit codes at rest. */
    public static final String DOMAIN_CODE_PASSWORD_RESET = "otp.password-reset";

    /** Domain tag for contact-change 6-digit codes (email/phone) at rest. */
    public static final String DOMAIN_CODE_CONTACT_CHANGE = "otp.contact-change";

    /** Domain tag for phone-verification 6-digit OTPs at rest. */
    public static final String DOMAIN_CODE_PHONE = "otp.phone";

    /** Domain tag for e-mail-verification tokens at rest. */
    public static final String DOMAIN_CODE_EMAIL = "otp.email";

    private static final String PREFIX = "v1:";
    private static final int NONCE_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PiiKeys keys;

    public PiiCrypto(PiiKeys keys) {
        this.keys = keys;
    }

    /** Encrypts a plain contact value into the {@code v1:} envelope. */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            throw new IllegalArgumentException("PII value must be non-empty");
        }
        byte[] nonce = new byte[NONCE_LENGTH];
        RANDOM.nextBytes(nonce);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keys.aesKey(),
                    new GCMParameterSpec(GCM_TAG_BITS, nonce));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] envelope = new byte[NONCE_LENGTH + ciphertext.length];
            System.arraycopy(nonce, 0, envelope, 0, NONCE_LENGTH);
            System.arraycopy(ciphertext, 0, envelope, NONCE_LENGTH, ciphertext.length);
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(envelope);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("AES-GCM unavailable", e);
        }
    }

    /**
     * Decrypts a {@code v1:} envelope. Fails closed on anything that is
     * not a well-formed envelope of the active slot (a pre-V13 plaintext
     * row or a foreign version) — never a silent passthrough.
     */
    public String decrypt(String stored) {
        if (stored == null || !stored.startsWith(PREFIX)) {
            throw new IllegalStateException(
                    "PII value is not a " + PREFIX + " envelope — row was not converted by V13");
        }
        byte[] envelope;
        try {
            envelope = Base64.getUrlDecoder().decode(stored.substring(PREFIX.length()));
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("PII envelope is not valid base64url", e);
        }
        if (envelope.length <= NONCE_LENGTH) {
            throw new IllegalStateException("PII envelope is truncated");
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keys.aesKey(),
                    new GCMParameterSpec(GCM_TAG_BITS, Arrays.copyOfRange(envelope, 0, NONCE_LENGTH)));
            byte[] plain = cipher.doFinal(Arrays.copyOfRange(envelope, NONCE_LENGTH, envelope.length));
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("PII decryption failed (wrong key or tampered row)", e);
        }
    }

    /** True iff the value is an envelope of the active slot. */
    public boolean isEncrypted(String stored) {
        return stored != null && stored.startsWith(PREFIX);
    }

    /**
     * The plain contact value behind a stored value — decrypted when it is
     * an active-slot envelope, passed through when it is still plaintext.
     * Used by the V13 conversion (idempotent reruns) to compute the blind
     * index from whatever state a row is in.
     */
    public String unwrapForHash(String stored) {
        return isEncrypted(stored) ? decrypt(stored) : stored;
    }

    /**
     * HMAC-SHA256 blind index of {@code canonicalValue} under a
     * domain-separated message ({@code domain || value}), hex-encoded.
     * Deterministic: the same canonical input always yields the same
     * index — that is what makes it usable as a unique index + lookup key.
     */
    public String blindIndex(String domain, String canonicalValue) {
        if (domain == null || canonicalValue == null) {
            throw new IllegalArgumentException("domain and value must be non-null");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(keys.hmacKey());
            mac.update(domain.getBytes(StandardCharsets.UTF_8));
            mac.update(canonicalValue.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(mac.doFinal());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }

    /**
     * Canonical e-mail identity for blind indexing: the shared
     * {@link Contacts#normalize} rule, the same normalization the
     * registration/login paths apply. If this drifts from them, one human
     * splits into two identities — the uniqueness check and the blind-index
     * lookup stop agreeing.
     */
    public static String canonicalEmail(String email) {
        return Contacts.normalize(email);
    }

    /**
     * The keyed, domain-separated one-time-code hash under the active
     * {@code v2:} slot: {@code v2:} + HMAC-SHA256({@code domain || code}).
     * A 6-digit code is a 10<sup>6</sup> space, so an UNKEYED single-round
     * SHA-256 (the legacy form) is reversible from a DB dump in under a
     * second per row; the keyed form is not (a dump alone cannot be
     * reversed). Domain-separated, so a code from one flow never hashes to
     * the value of the same code in another flow. The caller passes the raw
     * code (codes are already canonical — no trim/case needed).
     */
    public String codeHash(String domain, String code) {
        return CODE_HASH_PREFIX + blindIndex(domain, code);
    }
}
