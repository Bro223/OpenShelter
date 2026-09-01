package ee.sheltermap.auth;

/**
 * Registration collided with an existing account (same email or phone).
 * Maps to 409 Conflict — never a 500 (hardening pass: email/phone are
 * unique, enforced by the V3 unique indexes and the service pre-check).
 */
public class DuplicateAccountException extends RuntimeException {

    public DuplicateAccountException(String message) {
        super(message);
    }
}
