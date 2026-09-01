package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

import java.time.Instant;

/**
 * Durable record of verification-code sends — the store behind the
 * anti-spam throttle (cooldown + per-user daily cap).
 *
 * <p>Implementations must be safe for concurrent use and must never throw
 * on {@link #record} — a logging failure must not break the verification
 * flow.
 */
public interface VerificationSendLog {

    /**
     * How many codes were sent to {@code level} for {@code userId} since the
     * start of today (UTC day boundary).
     */
    long countToday(long userId, VerificationLevel level);

    /**
     * The most recent send time for {@code (userId, level)}, or {@code null}
     * if nothing was ever sent for that pair.
     */
    Instant lastSentAt(long userId, VerificationLevel level);

    /** Records one send. Must not throw. */
    void record(long userId, VerificationLevel level, String contact, Instant sentAt);
}
