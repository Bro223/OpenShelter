package ee.sheltermap.auth;

/**
 * Rate limiting seam (03-auth.puml) — token-bucket style. Implementations
 * must be safe for concurrent use.
 */
public interface RateLimiter {

    /** {@code true} if a token was consumed, {@code false} if the bucket is empty. */
    boolean tryAcquire(String key);
}
