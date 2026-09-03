package ee.sheltermap.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Startup guard (hardening pass): refuses to boot in the {@code prod} profile
 * while {@code app.jwt.secret} is still the dev-only default from
 * application.yml. The default is published in the repo (it must be — it is
 * the local-development value), so a production deploy that forgets to set
 * {@code JWT_SECRET} would otherwise silently sign forgeable tokens.
 */
@Component
public class ProdJwtGuard {

    static final String DEV_DEFAULT_SECRET = "dev-only-secret-change-me-sheltermap-0123456789abcdef";

    public ProdJwtGuard(@Value("${spring.profiles.active:}") String profiles,
                        @Value("${app.jwt.secret:}") String secret) {
        boolean prod = Arrays.stream(profiles.split(","))
                .map(String::trim)
                .anyMatch("prod"::equals);
        if (prod && DEV_DEFAULT_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "PRODUCTION REFUSED TO START: app.jwt.secret is still the dev-only default. "
                            + "Set JWT_SECRET to a strong random value before deploying with the prod profile.");
        }
    }
}
