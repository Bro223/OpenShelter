package ee.sheltermap.persistence;

import ee.sheltermap.app.ReportActionLog;
import ee.sheltermap.app.ReportProperties;
import ee.sheltermap.app.ReportThrottledException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * JPA implementation of {@link ReportActionLog} (D3) — the durable
 * timestamped table behind the per-user rolling-hour throttle (same
 * table family and window style as
 * {@code password_reset_tokens.created_at}): count this user's rows in
 * the trailing hour; at the cap, reject WITHOUT recording (a throttled
 * decision must not extend itself); otherwise record the action.
 *
 * <p>Concurrency: the check-and-record is serialized per user with a
 * transaction-scoped advisory lock (DB-scoped — the
 * log is durable, unlike the file-based verification send log). Two
 * concurrent report actions from the same user can therefore never both
 * read the pre-increment count. The lock releases when the surrounding
 * transaction commits, i.e. exactly the critical section.
 */
@Repository
public class JpaReportActionLog implements ReportActionLog {

    /** The rolling window: a trailing hour of report-type actions. */
    private static final Duration WINDOW = Duration.ofHours(1);

    private final SpringDataReportActionRepository actions;
    private final ReportProperties properties;
    private final Clock clock;
    private final JdbcTemplate jdbc;

    public JpaReportActionLog(SpringDataReportActionRepository actions,
                              ReportProperties properties,
                              Clock clock,
                              JdbcTemplate jdbc) {
        this.actions = Objects.requireNonNull(actions, "actions");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc");
    }

    @Override
    @Transactional
    public void record(long userId, Action action) {
        int cap = properties.maxActionsPerHour();
        if (cap <= 0) {
            return; // throttle disabled (same silent-skip style as the verification throttle)
        }
        // Serialize the check-and-record for this user (see class javadoc).
        // pg_advisory_xact_lock(bigint) is void — run the statement, ignore
        // the (empty) result row.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?::text, 0))",
                new Object[] {"os-report-actions:" + userId}, (rs, rowNum) -> Boolean.TRUE);
        Instant now = clock.instant();
        if (actions.countByUserIdAndCreatedAtAfter(userId, now.minus(WINDOW)) >= cap) {
            // Throttled: the exact countdown is anchored on the OLDEST in-window
            // action (it leaves the trailing hour at oldest + WINDOW). null —
            // no honest header — if the window is somehow empty (should not
            // happen at the cap, but fail safe to the header-less 429).
            Instant oldest = actions.minCreatedAtByUserIdAndCreatedAtAfter(userId, now.minus(WINDOW));
            Integer retryAfter = null;
            if (oldest != null) {
                long retryAfterMillis = oldest.plus(WINDOW).toEpochMilli() - now.toEpochMilli();
                retryAfter = (int) Math.max(1, (retryAfterMillis + 999) / 1000);
            }
            throw new ReportThrottledException(retryAfter);
        }
        ReportActionEntity entity = new ReportActionEntity();
        entity.setUserId(userId);
        entity.setAction(action);
        entity.setCreatedAt(now);
        actions.save(entity);
    }
}
