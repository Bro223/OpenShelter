package ee.sheltermap.auth;

/**
 * Rate limiting seam (03-auth.puml) — token-bucket style. Implementations
 * must be safe for concurrent use.
 */
public interface RateLimiter {

    /**
     * Outcome of {@link #tryAcquire(String)}: whether a token was consumed
     * and — when throttled — the exact seconds until a token may be
     * available again, carried so the caller can surface an honest
     * {@code Retry-After} countdown. {@code retryAfterSeconds} is
     * {@code null} only when the bucket cannot compute one (it never
     * refills), in which case the header is omitted. Mirrors
     * {@link ee.sheltermap.verification.RollingContactOtpLimiter.Result}.
     */
    record Result(boolean acquired, Integer retryAfterSeconds) {

        static Result passed() {
            return new Result(true, null);
        }

        static Result throttled(Integer retryAfterSeconds) {
            return new Result(false, retryAfterSeconds);
        }
    }

    /**
     * Consumes one token for {@code key}. Throttled (the bucket is empty)
     * with an honest countdown — or {@code null} when the bucket never
     * refills — when it cannot be served.
     */
    Result tryAcquire(String key);
}
