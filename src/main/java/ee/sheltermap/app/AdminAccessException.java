package ee.sheltermap.app;

/**
 * An authenticated caller without the ADMIN kind hit an {@code /admin/*}
 * endpoint (admin-moderation D2) — the 403 family, same plain-spoken
 * vocabulary as the not-verified / not-author gates. The check is a fresh
 * kind lookup per request (never a JWT claim), so this fires the moment a
 * demotion lands, even for a still-valid token.
 */
public class AdminAccessException extends RuntimeException {
    public AdminAccessException(String message) {
        super(message);
    }
}
