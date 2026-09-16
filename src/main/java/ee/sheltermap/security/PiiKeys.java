package ee.sheltermap.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

/**
 * Loads and validates the PII-at-rest keys. Env-only, fail closed:
 * a missing or malformed key fails context startup, so the app can never
 * silently run with PII unprotected (same pattern as {@code ProdJwtGuard}).
 *
 * <p>Both keys are 32 bytes, base64-encoded. Generate with
 * {@code openssl rand -base64 32} (once per key). The values live in the
 * environment / gitignored {@code .env} — never in the repo.
 *
 * <p>Key management and rotation: see README ("PII at rest") and
 * {@code openspec/changes/archive/2026-09-16-pii-at-rest/design.md}. A lost key makes the
 * affected accounts unloginable by contact — keep an offline backup.
 */
@Component
public class PiiKeys {

    /** 256-bit AES-GCM data key. */
    private final SecretKey aesKey;

    /** 256-bit HMAC key for the blind index. */
    private final SecretKey hmacKey;

    public PiiKeys(@Value("${app.pii.aes-key:}") String aesKeyB64,
                   @Value("${app.pii.hmac-key:}") String hmacKeyB64) {
        this.aesKey = new SecretKeySpec(requireBytes("PII_AES_KEY", aesKeyB64), "AES");
        this.hmacKey = new SecretKeySpec(requireBytes("PII_HMAC_KEY", hmacKeyB64), "HmacSHA256");
    }

    public SecretKey aesKey() {
        return aesKey;
    }

    public SecretKey hmacKey() {
        return hmacKey;
    }

    private static byte[] requireBytes(String envName, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    envName + " is not set — PII-at-rest (M2) is fail-closed. "
                            + "Generate a key with `openssl rand -base64 32` and set "
                            + envName + " (see README, 'PII at rest').");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(value.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    envName + " is not valid base64 (expected 32 raw bytes, e.g. from "
                            + "`openssl rand -base64 32`)");
        }
        if (bytes.length != 32) {
            throw new IllegalStateException(
                    envName + " must decode to exactly 32 bytes (got " + bytes.length
                            + ") — use `openssl rand -base64 32`");
        }
        return bytes;
    }
}
