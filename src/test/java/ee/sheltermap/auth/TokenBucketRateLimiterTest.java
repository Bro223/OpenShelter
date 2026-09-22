package ee.sheltermap.auth;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class TokenBucketRateLimiterTest {

    @Test
    void allowsBurstUpToCapacityThenDenies() {
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 1.0, new MutableClock(Instant.parse("2026-08-23T12:00:00Z")));

        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isFalse();
    }

    @Test
    void refillsOverTime() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 1.0, clock);
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");
        assertThat(limiter.tryAcquire("a").acquired()).isFalse();

        clock.advance(Duration.ofSeconds(1));
        assertThat(limiter.tryAcquire("a").acquired()).isTrue(); // refilled 1 token
        assertThat(limiter.tryAcquire("a").acquired()).isFalse();

        clock.advance(Duration.ofSeconds(2));
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isFalse();
    }

    @Test
    void keysAreIndependent() {
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(1, 0.0, new MutableClock(Instant.parse("2026-08-23T12:00:00Z")));
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isFalse();
        assertThat(limiter.tryAcquire("b").acquired()).isTrue();
    }

    @Test
    void zeroRefillNeverRecovers() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(3, 0.0, clock);
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
        clock.advance(Duration.ofHours(1));
        assertThat(limiter.tryAcquire("a").acquired()).isFalse();
    }

    @Test
    void throttleCarriesAnHonestRetryAfterCountdown() {
        // capacity 2, refill 0.5/s (one token per 2s): the 429 must tell the
        // client the whole seconds until the next token, not just "retry".
        MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 0.5, clock);
        limiter.tryAcquire("a"); // 2 -> 1
        limiter.tryAcquire("a"); // 1 -> 0

        RateLimiter.Result throttled = limiter.tryAcquire("a");
        assertThat(throttled.acquired()).isFalse();
        // bucket empty, refilling one token per 2s -> a whole 2s to the next token
        assertThat(throttled.retryAfterSeconds()).isEqualTo(2);

        clock.advance(Duration.ofSeconds(1)); // 0 -> 0.5 tokens
        RateLimiter.Result halfRefilled = limiter.tryAcquire("a");
        assertThat(halfRefilled.acquired()).isFalse();
        assertThat(halfRefilled.retryAfterSeconds()).isEqualTo(1);

        clock.advance(Duration.ofSeconds(1)); // 0.5 -> 1.0 tokens
        assertThat(limiter.tryAcquire("a").acquired()).isTrue();
    }

    @Test
    void zeroRefillThrottleHasNoRetryAfter() {
        // A bucket that never refills has no honest countdown: once drained
        // it is drained, so the 429 omits Retry-After (the ops doc says so).
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 0.0,
                new MutableClock(Instant.parse("2026-08-23T12:00:00Z")));
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");
        RateLimiter.Result throttled = limiter.tryAcquire("a");
        assertThat(throttled.acquired()).isFalse();
        assertThat(throttled.retryAfterSeconds()).isNull();
    }
}
