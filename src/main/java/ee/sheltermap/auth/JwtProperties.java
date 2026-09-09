package ee.sheltermap.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * JWT configuration (Step 4). Bound from {@code app.jwt.*} in application.yml;
 * the signing secret is overridable via the {@code JWT_SECRET} environment
 * variable (dev-only default in yml — never use it outside development).
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration accessTtl, Duration refreshTtl) {
}
