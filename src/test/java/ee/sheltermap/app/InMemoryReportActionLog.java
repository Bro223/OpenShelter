package ee.sheltermap.app;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * In-memory fake of {@link ReportActionLog} for tests: same trailing-hour
 * window semantics as the JPA log, with a configurable cap and the
 * injected clock (deterministic throttle tests).
 */
public class InMemoryReportActionLog implements ReportActionLog {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final Clock clock;
    private int maxPerHour = 10;
    private final List<LoggedAction> log = new ArrayList<>();

    public InMemoryReportActionLog(Clock clock) {
        this.clock = clock;
    }

    /** Overrides the per-hour cap (0 disables the throttle, like the JPA log). */
    public void setMaxPerHour(int maxPerHour) {
        this.maxPerHour = maxPerHour;
    }

    @Override
    public synchronized void record(long userId, Action action) {
        if (maxPerHour <= 0) {
            return;
        }
        Instant now = clock.instant();
        long withinWindow = log.stream()
                .filter(a -> a.userId() == userId && a.at().isAfter(now.minus(WINDOW)))
                .count();
        if (withinWindow >= maxPerHour) {
            throw new ReportThrottledException();
        }
        log.add(new LoggedAction(userId, action, now));
    }

    public List<LoggedAction> actions() {
        return List.copyOf(log);
    }

    public void clear() {
        log.clear();
    }

    public record LoggedAction(long userId, Action action, Instant at) {
    }
}
