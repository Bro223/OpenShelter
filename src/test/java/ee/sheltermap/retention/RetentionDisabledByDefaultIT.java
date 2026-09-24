package ee.sheltermap.retention;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Retention job gating: in this repository's dev
 * configuration the job is OFF — the scheduler bean does not exist, so
 * no daily prune is ever scheduled. The service bean is present
 * (a direct call with the flag off is a no-op — unit-tested in
 * {@link RetentionServiceTest}).
 */
class RetentionDisabledByDefaultIT extends AbstractPersistenceIT {

    @Autowired
    ApplicationContext context;

    @Test
    void theSchedulerBeanIsAbsentWhenRetentionIsDisabled() {
        assertThat(context.getBeanNamesForType(RetentionScheduler.class)).isEmpty();
        assertThat(context.getBeanNamesForType(RetentionService.class)).isNotEmpty();
    }
}
