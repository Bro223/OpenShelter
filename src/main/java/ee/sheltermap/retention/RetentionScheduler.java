package ee.sheltermap.retention;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.Objects;

/**
 * Daily retention run. Mirrors the registry sync's
 * scheduling choice — Spring's built-in {@code @Scheduled} (the app is a
 * single instance with no clustering or distributed-lock needs) — with
 * the default INVERTED: {@code matchIfMissing = false} means the bean,
 * and with it the whole job, exists ONLY when
 * {@code app.retention.enabled=true} (RETENTION_ENABLED). Off in this
 * repository's dev config; whoever operates a deployment enables it.
 *
 * <p>The cron (default 03:30 Europe/Tallinn, offset from the registry
 * import's 03:00) and zone are overridable via {@code app.retention.cron}
 * / {@code app.retention.zone}.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.retention.enabled", havingValue = "true", matchIfMissing = false)
public class RetentionScheduler {

    private final RetentionService retention;
    private final Clock clock;

    public RetentionScheduler(RetentionService retention, Clock clock) {
        this.retention = Objects.requireNonNull(retention, "retention");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Scheduled(cron = "${app.retention.cron:0 30 3 * * *}", zone = "${app.retention.zone:Europe/Tallinn}")
    public void runScheduledRetention() {
        // The service logs its own one-line summary and writes its own
        // durable run row — the scheduler stays a one-line trigger,
        // exactly like RegistryScheduler.
        retention.prune(clock.instant());
    }
}
