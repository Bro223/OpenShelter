package ee.sheltermap.auth;

/** The caller exceeded the token bucket for an auth endpoint. */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException() {
        super("too many requests");
    }
}
