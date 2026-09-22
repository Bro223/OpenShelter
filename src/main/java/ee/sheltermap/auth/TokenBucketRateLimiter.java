package ee.sheltermap.auth;

import java.time.Clock;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token-bucket rate limiter (SDI Ch 4), keyed per caller. A bucket starts
 * full ({@code capacity}) and refills continuously at {@code refillPerSecond}.
 * Idle buckets are swept after an hour once the map grows past a threshold.
 *
 * <p><strong>Single-instance constraint:</strong> buckets live in process
 * memory, so this limiter is correct for a single application instance only.
 * Running N replicas multiplies the effective capacity per key by N (each
 * replica keeps its own full bucket), and every restart resets all buckets
 * to full. Rate-limiting across a scaled deployment needs a shared backend.
 */
public class TokenBucketRateLimiter implements RateLimiter {

    private static final long SWEEP_INTERVAL_MILLIS = 60_000L;
    private static final long IDLE_EXPIRY_MILLIS = 60L * 60 * 1000;
    private static final int SWEEP_THRESHOLD = 1024;

    private final int capacity;
    private final double refillPerSecond;
    private final Clock clock;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private long lastSweepMillis;

    public TokenBucketRateLimiter(int capacity, double refillPerSecond) {
        this(capacity, refillPerSecond, Clock.systemUTC());
    }

    public TokenBucketRateLimiter(int capacity, double refillPerSecond, Clock clock) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be > 0");
        }
        if (refillPerSecond < 0) {
            throw new IllegalArgumentException("refillPerSecond must be >= 0");
        }
        this.capacity = capacity;
        this.refillPerSecond = refillPerSecond;
        this.clock = clock;
        this.lastSweepMillis = clock.millis();
    }

    @Override
    public Result tryAcquire(String key) {
        long now = clock.millis();
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(now));
        Result result = bucket.tryAcquire(now);
        maybeSweep(now);
        return result;
    }

    private void maybeSweep(long now) {
        if (buckets.size() < SWEEP_THRESHOLD || now - lastSweepMillis < SWEEP_INTERVAL_MILLIS) {
            return;
        }
        lastSweepMillis = now;
        Iterator<Map.Entry<String, Bucket>> it = buckets.entrySet().iterator();
        while (it.hasNext()) {
            if (now - it.next().getValue().lastAccessMillis > IDLE_EXPIRY_MILLIS) {
                it.remove();
            }
        }
    }

    private final class Bucket {

        private double tokens;
        private long lastRefillMillis;
        private long lastAccessMillis;

        Bucket(long nowMillis) {
            this.tokens = capacity;
            this.lastRefillMillis = nowMillis;
            this.lastAccessMillis = nowMillis;
        }

        synchronized Result tryAcquire(long nowMillis) {
            refill(nowMillis);
            lastAccessMillis = nowMillis;
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return Result.passed();
            }
            // Empty: the whole seconds until one token is available again
            // (the client counts down instead of spam-clicking into repeated
            // 429s). null — no honest countdown — when the bucket never
            // refills (refillPerSecond == 0): once drained it is drained.
            if (refillPerSecond > 0) {
                long seconds = (long) Math.ceil((1.0 - tokens) / refillPerSecond);
                return Result.throttled((int) Math.max(1, seconds));
            }
            return Result.throttled(null);
        }

        private void refill(long nowMillis) {
            double elapsedSeconds = (nowMillis - lastRefillMillis) / 1000.0;
            if (elapsedSeconds > 0) {
                tokens = Math.min(capacity, tokens + elapsedSeconds * refillPerSecond);
                lastRefillMillis = nowMillis;
            }
        }
    }
}
