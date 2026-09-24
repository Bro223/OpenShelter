package ee.sheltermap.app;

/**
 * Durable log behind the per-user report throttle (shelter-trust-and-
 * reports) — the same table family and window style as the
 * password-reset rotation guard (timestamped rows counted over a window)
 * and the verification send log (one row per action, checked-and-recorded
 * in the same step).
 *
 * <p>One row per report-type ACTION (any target, any type): shelter
 * reports and occupancy re-PUTs all count, because an
 * occupancy re-PUT updates one row and would be uncountable from the
 * report tables alone. A rejected duplicate (409) records NOTHING — a
 * user cannot burn their own budget by resubmitting (same discipline as
 * the verification already-verified guard).
 */
public interface ReportActionLog {

    /** Which report-family action a log row records. */
    enum Action {
        SHELTER_REPORT,
        OCCUPANCY
    }

    /**
     * Check-and-record one report-family action for {@code userId}: the
     * user's actions within the trailing hour are counted; when the cap
     * is already reached the action is NOT recorded and
     * {@link ReportThrottledException} is thrown (→ 429).
     *
     * <p>Implementations SHALL make the check-and-record atomic per user
     * (no concurrent pair of calls may both read the pre-increment
     * count and both record).
     *
     * @throws ReportThrottledException when the per-hour cap is reached
     */
    void record(long userId, Action action);
}
