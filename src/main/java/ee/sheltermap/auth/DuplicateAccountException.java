package ee.sheltermap.auth;

/**
 * Registration collided with an existing account (same email or phone).
 * Maps to 409 Conflict — never a 500 (hardening pass: email/phone are
 * unique, enforced by the V3 unique indexes and the service pre-check).
 */
public class DuplicateAccountException extends RuntimeException {

    /** 409 message: the e-mail is already in use (register / contact change). */
    public static final String DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists";

    /** 409 message: the phone number is already in use (register / contact change). */
    public static final String DUPLICATE_PHONE_MESSAGE = "An account with this phone already exists";

    public DuplicateAccountException(String message) {
        super(message);
    }
}
