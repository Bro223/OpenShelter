package ee.sheltermap.app;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Trust-layer settings. Bound from
 * {@code app.reports.*}.
 *
 * @param maxActionsPerHour per-user cap on report-type actions (shelter
 *                          reports + occupancy re-PUTs,
 *                          any target, any type) within a rolling hour;
 *                          {@code 0} disables the throttle
 */
@ConfigurationProperties(prefix = "app.reports")
public record ReportProperties(
        int maxActionsPerHour) {
}
