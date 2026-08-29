package ee.sheltermap.auth;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class TokenBucketRateLimiterTest {

    @Test
    void allowsBurstUpToCapacityThenDenies() {
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 1.0, new MutableClock(Instant.parse("2026-08-23T12:00:00Z")));

        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isFalse();
    }

    @Test
    void refillsOverTime() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 1.0, clock);
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");
        assertThat(limiter.tryAcquire("a")).isFalse();

        clock.advance(Duration.ofSeconds(1));
        assertThat(limiter.tryAcquire("a")).isTrue(); // refilled 1 token
        assertThat(limiter.tryAcquire("a")).isFalse();

        clock.advance(Duration.ofSeconds(2));
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isFalse();
    }

    @Test
    void keysAreIndependent() {
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(1, 0.0, new MutableClock(Instant.parse("2026-08-23T12:00:00Z")));
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isFalse();
        assertThat(limiter.tryAcquire("b")).isTrue();
    }

    @Test
    void zeroRefillNeverRecovers() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(3, 0.0, clock);
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isTrue();
        clock.advance(Duration.ofHours(1));
        assertThat(limiter.tryAcquire("a")).isFalse();
    }
}
