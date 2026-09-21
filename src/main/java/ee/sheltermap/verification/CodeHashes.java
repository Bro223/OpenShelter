package ee.sheltermap.verification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * SHA-256 + constant-time comparison — the ONE spelling of the
 * code/token-at-rest primitive (01-TASK.md §4 dependency rule:
 * {@code verification} sits below {@code auth}, so the authority lives
 * here and {@code auth.Hashes} delegates to it rather than a third copy
 * existing in {@code auth}). Used by the e-mail/phone verification
 * providers (code hashing + the confirm compare), {@link
 * PendingVerification}'s at-rest code hash and the auth-side token
 * hashes — a hardening of the compare (e.g. a length-safe variant) is
 * made in exactly this one place.
 */
public final class CodeHashes {

    private CodeHashes() {
    }

    /** SHA-256 hex digest — the one-way hash used for all codes/tokens at rest. */
    public static String sha256Hex(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /**
     * Constant-time string comparison — no early exit on the first
     * differing byte, so hash comparisons leak no prefix-length timing
     * channel. Use for every stored-vs-presented code/token hash compare.
     */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
