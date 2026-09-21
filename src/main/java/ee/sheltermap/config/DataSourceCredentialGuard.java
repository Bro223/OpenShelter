package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Startup guard for the PUBLISHED dev datasource credentials —
 * <strong>fails closed, same profile rule as {@link ProdJwtGuard},
 * {@link DevSenderGuard} and {@link DevEndpointsGuard}.</strong>
 *
 * <p>{@code spring.datasource.password} defaults to the value committed in
 * this repository ({@code application.yml} and {@code docker-compose.yml}),
 * which is exactly what makes a fresh clone runnable — and what makes the
 * default dangerous: outside dev/test an operator who simply forgets
 * {@code DB_PASSWORD} connects to a database whose password is public, and
 * that database holds the PII ciphertext, the blind-index hashes and the
 * OTP / password-reset code hashes. Every other committed dev secret already
 * fails the boot (JWT, senders, dev endpoints, docs); this is the datasource
 * pair closing the same door.
 *
 * <p>The rule is profile-keyed (the resolved {@link Environment} active set,
 * not the raw property string — exempt only when the ENTIRE set is a subset
 * of {@code dev, test}) and reads the RESOLVED password the datasource itself
 * uses ({@code spring.datasource.password}, so a {@code DB_PASSWORD}
 * environment override is what is judged):
 *
 * <ul>
 *   <li>When the ENTIRE active profile set (the resolved set) is a subset of
 *       exactly {@code dev} and {@code test} (and non-blank) → no check — the
 *       published default is the point there (the compose database the README
 *       tells you to start). A mixed set like {@code production,dev} is NOT
 *       exempt — an any-match rule would let one stray entry disable the
 *       guard.</li>
 *   <li>Otherwise (blank profile, {@code production}, {@code prod-*}, anything
 *       else) → refuse to boot when the password is blank or still the
 *       published dev default ({@link #DEV_DEFAULT_PASSWORD}).</li>
 * </ul>
 *
 * <p>The check keys on the PASSWORD: it is the secret. A non-default password
 * on a dev-default username is not a published credential, and a blank
 * username fails the connection on its own.
 */
@Component
public class DataSourceCredentialGuard {

    /** The datasource password committed in application.yml and docker-compose.yml. */
    static final String DEV_DEFAULT_PASSWORD = "sheltermap";

    private static final Logger log = LoggerFactory.getLogger(DataSourceCredentialGuard.class);

    public DataSourceCredentialGuard(Environment env,
                                     @Value("${spring.datasource.password:}") String password) {
        // The resolved active profile set (groups/defaults only
        // materialize in the ENVIRONMENT, not in the raw property). Exempt
        // only when the WHOLE active set is dev/test — "production,dev"
        // is not a dev deploy.
        if (Profiles.isDevTestOnly(env)) {
            return; // dev/test parity: the published dev database password is expected here
        }
        if (isRealPassword(password)) {
            return; // a real, non-default password — nothing published is in use
        }
        String reason = DEV_DEFAULT_PASSWORD.equals(password)
                ? "spring.datasource.password is still the published dev default"
                : "spring.datasource.password is blank";
        // Loud log + loud rejection — a misconfigured deploy must fail the
        // boot, never run against a database whose password is in the repo.
        log.error("REFUSING TO START — {}: active profiles={}. Set DB_PASSWORD to a strong "
                        + "non-default value (the dev database started by docker-compose.yml "
                        + "uses the published default) or run with SPRING_PROFILES_ACTIVE=dev/test "
                        + "for local development.",
                reason, Arrays.toString(env.getActiveProfiles()));
        throw new IllegalStateException(
                "PRODUCTION REFUSED TO START: " + reason + ". Set DB_PASSWORD to a strong "
                        + "non-default value (the dev database started by docker-compose.yml uses "
                        + "the published default), or run with SPRING_PROFILES_ACTIVE=dev/test for "
                        + "local development.");
    }

    /** A password that is neither blank nor the published dev default. */
    private static boolean isRealPassword(String password) {
        return password != null && !password.isBlank() && !DEV_DEFAULT_PASSWORD.equals(password);
    }
}
