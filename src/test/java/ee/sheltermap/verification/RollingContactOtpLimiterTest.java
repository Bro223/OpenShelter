package ee.sheltermap.verification;

import ee.sheltermap.auth.MutableClock;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The rolling per-contact cap: window expiry,
 * per-contact isolation, key normalization, the honest Retry-After, the
 * disabled ({@code max <= 0}) mode, and that a rejected acquire records
 * nothing.
 */
class RollingContactOtpLimiterTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-09-13T00:00:00Z"));

    @Test
    void allowsUpToMaxThenThrottlesWithFullWindowRetryAfter() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(2, Duration.ofHours(1), clock);

        assertThat(limiter.tryAcquire("a@example.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
        assertThat(limiter.tryAcquire("a@example.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
        RollingContactOtpLimiter.Result throttled = limiter.tryAcquire("a@example.ee");
        assertThat(throttled.decision()).isEqualTo(RollingContactOtpLimiter.Decision.THROTTLED);
        assertThat(throttled.retryAfterSeconds()).isEqualTo(3600);
    }

    @Test
    void windowExpiryFreesTheBudget() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(1, Duration.ofHours(1), clock);
        limiter.tryAcquire("a@example.ee");
        clock.advance(Duration.ofMinutes(59));
        assertThat(limiter.tryAcquire("a@example.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.THROTTLED);
        clock.advance(Duration.ofSeconds(61)); // the first event is now 1h01s old — out of the window
        assertThat(limiter.tryAcquire("a@example.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
    }

    @Test
    void contactsAreIsolated() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(1, Duration.ofHours(1), clock);
        assertThat(limiter.tryAcquire("+37250000001").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
        assertThat(limiter.tryAcquire("+37250000002").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
        assertThat(limiter.tryAcquire("+37250000001").decision()).isEqualTo(RollingContactOtpLimiter.Decision.THROTTLED);
    }

    @Test
    void emailKeyIsTrimmedAndLowercased() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(1, Duration.ofHours(1), clock);
        assertThat(limiter.tryAcquire("  Foo@Bar.ee ").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
        assertThat(limiter.tryAcquire("foo@bar.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.THROTTLED);
    }

    @Test
    void retryAfterCountsDownToTheOldestInWindowEvent() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(2, Duration.ofHours(1), clock);
        limiter.tryAcquire("a@example.ee");                       // t0
        clock.advance(Duration.ofMinutes(10));
        limiter.tryAcquire("a@example.ee");                       // t0 + 10 min
        clock.advance(Duration.ofMinutes(10));                    // t0 + 20 min
        // the t0 event leaves the 1 h window 40 min from now
        assertThat(limiter.tryAcquire("a@example.ee").retryAfterSeconds()).isEqualTo(3600 - 20 * 60);
    }

    @Test
    void rejectedAcquireRecordsNothing() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(1, Duration.ofHours(1), clock);
        limiter.tryAcquire("a@example.ee");                       // t0
        clock.advance(Duration.ofMinutes(5));
        limiter.tryAcquire("a@example.ee");                       // throttled — must NOT record
        clock.advance(Duration.ofMinutes(56));                    // t0 + 61 min: only t0 has expired
        assertThat(limiter.tryAcquire("a@example.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
    }

    @Test
    void nonPositiveMaxDisablesTheCap() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(0, Duration.ofHours(1), clock);
        for (int i = 0; i < 10; i++) {
            assertThat(limiter.tryAcquire("a@example.ee").decision()).isEqualTo(RollingContactOtpLimiter.Decision.OK);
        }
    }

    @Test
    void nullContactIsRejected() {
        RollingContactOtpLimiter limiter = new RollingContactOtpLimiter(1, Duration.ofHours(1), clock);
        assertThatThrownBy(() -> limiter.tryAcquire(null))
                .isInstanceOf(NullPointerException.class);
    }
}
