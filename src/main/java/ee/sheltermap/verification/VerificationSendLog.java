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
     * Result of {@link #tryRecord} — why the send was (not) allowed. Both
     * rejections map to the same 429 in the service; the split exists so a
     * caller (or test) can tell which throttle fired.
     */
    enum SendDecision { OK, COOLDOWN, DAILY_CAP }

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

    /**
     * Atomic check-and-record: decides whether
     * {@code (userId, level)} may send right now — cooldown first, then the
     * per-UTC-day cap — and, when allowed, records the send in the SAME
     * lock-held step — a read-read-record across separately
     * synchronized methods would let a burst pass both reads before either
     * recorded.
     *
     * <p>{@code cooldownSeconds} &le; 0 disables the cooldown check and
     * {@code maxPerDay} &le; 0 disables the cap (silent skip). A
     * {@link SendDecision#COOLDOWN}/{@link SendDecision#DAILY_CAP}
     * decision records nothing.
     */
    SendDecision tryRecord(long userId, VerificationLevel level, String contact,
                           Instant now, long cooldownSeconds, int maxPerDay);
}
