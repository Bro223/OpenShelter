package ee.sheltermap.retention;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Retention job gating (retention-pruning): with
 * {@code app.retention.enabled=true} (RETENTION_ENABLED in a deployment)
 * the scheduler bean exists and the daily cron is armed. The cron
 * (default 03:30 Europe/Tallinn) will not fire during a test run, so
 * asserting bean presence is the whole contract here.
 */
@TestPropertySource(properties = "app.retention.enabled=true")
class RetentionSchedulerIT extends AbstractPersistenceIT {

    @Autowired
    ApplicationContext context;

    @Test
    void theSchedulerBeanIsPresentWhenRetentionIsEnabled() {
        assertThat(context.getBeanNamesForType(RetentionScheduler.class)).isNotEmpty();
    }
}
