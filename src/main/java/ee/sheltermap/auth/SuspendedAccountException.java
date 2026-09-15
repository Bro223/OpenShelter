package ee.sheltermap.auth;

/**
 * A suspended account attempted to authenticate — the
 * account exists and the credentials are correct, but the account is
 * suspended by an admin. Distinct from {@link InvalidCredentialsException}
 * (401): this is a 403 the user can act on ("my account was suspended"),
 * and it is only ever thrown AFTER the password verify so an
 * unauthenticated caller can never distinguish "suspended" from
 * "wrong password" (no account-state oracle).
 */
public class SuspendedAccountException extends RuntimeException {

    public SuspendedAccountException() {
        super("This account is currently suspended");
    }
}
