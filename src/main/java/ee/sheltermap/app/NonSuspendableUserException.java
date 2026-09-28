package ee.sheltermap.app;

/**
 * Mapped to 409 by {@link ee.sheltermap.api.ApiErrorHandler} — a
 * suspend/unsuspend targeted at a GUEST account (no credentials exist
 * to stop). The provisioned admin is refused earlier, with the 403
 * {@link ProvisionedAdminProtectedException}. Plain-spoken message;
 * nothing changes.
 */
public class NonSuspendableUserException extends RuntimeException {

    public NonSuspendableUserException(String message) {
        super(message);
    }
}
