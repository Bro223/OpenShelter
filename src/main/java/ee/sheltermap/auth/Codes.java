package ee.sheltermap.auth;

import java.security.SecureRandom;

/**
 * One-time code generation shared by all auth code flows (W15 — 2026-09-08
 * review): password reset (6-digit) and contact change (6-digit) used to
 * carry two private copies of the same generator.
 *
 * <p>Kept in {@code auth} on purpose: the {@code verification} package must
 * not depend on {@code auth} (01-TASK.md §4 dependency rule — auth already
 * imports verification), so the verification providers generate their own
 * channel-specific codes (6-digit OTP / 8-char e-mail token).
 *
 * <p>All draws go through one {@link SecureRandom}; leading zeros of
 * numeric codes are preserved ("000042" stays 6 characters).
 */
final class Codes {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Codes() {
    }

    /** A 6-digit one-time code, leading zeros preserved. */
    static String sixDigitCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    /** {@code length} random characters drawn from {@code alphabet}. */
    static String randomToken(int length, String alphabet) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
