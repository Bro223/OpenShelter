package ee.sheltermap.app;

/**
 * Mapped to 409 by {@link ee.sheltermap.api.ApiErrorHandler} (M10 slice
 * 1) — a suspend/unsuspend targeted at an account kind that cannot be
 * suspended: ADMIN (suspending the provisioned admin is a lockout vector)
 * or GUEST (no credentials exist to stop). Plain-spoken message; nothing
 * changes.
 */
public class NonSuspendableUserException extends RuntimeException {

    public NonSuspendableUserException(String message) {
        super(message);
    }
}
