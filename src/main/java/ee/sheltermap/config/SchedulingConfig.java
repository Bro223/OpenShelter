package ee.sheltermap.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * The app's scheduling machinery — {@code @EnableScheduling} for the
 * {@code @Scheduled} jobs (the weekly registry sync, the daily retention
 * run, and any future job).
 *
 * <p>Deliberate separation: the feature flags gate each job's BEAN
 * ({@code app.registry.schedule-enabled} on {@link RegistryScheduler},
 * {@code app.retention.enabled} on {@code RetentionScheduler}), never the
 * machinery itself. While the annotation hung off the two job classes,
 * a configuration that disabled both jobs — or a job living outside
 * either flag's reach — silently disarmed scheduling for the whole app.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
