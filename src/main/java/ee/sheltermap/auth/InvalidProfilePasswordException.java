package ee.sheltermap.auth;

/**
 * Rejected profile edit: the supplied current password does not match the
 * stored Argon2 hash. Maps to 401 (uniform {@code ErrorResponse}) via the
 * global exception handler — the message is surfaced inline as "current
 * password is incorrect" (the UI never says "wrong password", mirroring the
 * login anti-enumeration copy discipline).
 */
public class InvalidProfilePasswordException extends RuntimeException {

    public InvalidProfilePasswordException() {
        super("current password is incorrect");
    }
}
