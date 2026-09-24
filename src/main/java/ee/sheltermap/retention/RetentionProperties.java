package ee.sheltermap.retention;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Data-retention horizons + job switch, bound from
 * {@code app.retention.*} in application.yml (env: RETENTION_ENABLED,
 * RETENTION_INACTIVE_ACCOUNT_MONTHS, RETENTION_AUDIT_MONTHS).
 *
 * <p>{@code enabled} is the deployment gate: OFF by default, so the
 * destructive job ships dark and whoever operates a deployment turns it
 * on (this repository's dev config stays non-destructive). The month
 * horizons are the owner's product decision (24/24).
 */
@ConfigurationProperties(prefix = "app.retention")
public record RetentionProperties(
        boolean enabled,
        int inactiveAccountMonths,
        int auditMonths,
        String cron,
        String zone) {
}
