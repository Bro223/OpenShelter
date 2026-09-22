package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Startup guard for the {@code /dev/*} diagnostic endpoints —
 * <strong>fails closed, same rule as {@link ProdJwtGuard}.</strong>
 *
 * <p>{@code POST /dev/email-test} and {@code POST /dev/sms-test} are gated by
 * {@code app.dev-email-test.enabled} / {@code app.dev-sms-test.enabled}
 * (default off), JWT, and a recipient allowlist — but the flags are NOT
 * profile-gated: a production deploy that copies the dev {@code .env}
 * ({@code DEV_EMAIL_TEST_ENABLED=true} / {@code DEV_SMS_TEST_ENABLED=true})
 * would activate an authenticated e-mail/SMS relay on the public surface.
 *
 * <p>The rule is profile-keyed, not name-keyed (dev parity, like
 * {@link ProdJwtGuard}) — read from the resolved {@link Environment}
 * active set, not the raw property:
 *
 * <ul>
 *   <li>When the ENTIRE active profile set (the resolved set) is a
 *       subset of exactly {@code dev} and {@code test} (and non-blank) →
 *       no check — the flags exist precisely to exercise the real channels
 *       locally. A mixed set like {@code production,dev} is NOT exempt —
 *       an any-match rule would let one stray entry
 *       disable the guard.</li>
 *   <li>Otherwise (blank profile, {@code production}, {@code prod-*},
 *       anything else) → refuse to boot when EITHER dev flag is enabled.</li>
 * </ul>
 *
 * <p>A misconfigured deploy is caught at boot, not at the first test e-mail
 * or SMS it relays.
 */
@Component
public class DevEndpointsGuard {

    private static final Logger log = LoggerFactory.getLogger(DevEndpointsGuard.class);

    public DevEndpointsGuard(Environment env,
                             @Value("${app.dev-email-test.enabled:false}") boolean emailTestEnabled,
                             @Value("${app.dev-sms-test.enabled:false}") boolean smsTestEnabled) {
        // The resolved active profile set (groups/defaults only
        // materialize in the ENVIRONMENT, not the raw property).
        if (Profiles.isDevTestOnly(env) || (!emailTestEnabled && !smsTestEnabled)) {
            return; // dev/test parity, or no dev diagnostic surface is activated at all
        }
        String flags = FailClosedGuard.enabledFlagNames(emailTestEnabled, smsTestEnabled,
                "app.dev-email-test.enabled", "app.dev-sms-test.enabled");
        // Loud log + loud rejection — never boot with an authenticated
        // e-mail/SMS relay on a non-dev/test profile (the fail-closed
        // template, W3-A).
        FailClosedGuard.refuseToBoot(log,
                "REFUSING TO START — dev diagnostic endpoint(s) " + flags
                        + " enabled on a non-dev/test profile: active profiles="
                        + Arrays.toString(env.getActiveProfiles()) + ".",
                "PRODUCTION REFUSED TO START: dev diagnostic endpoint(s) " + flags
                        + " enabled with active profiles=" + Arrays.toString(env.getActiveProfiles())
                        + ". The /dev/* test endpoints are dev-only — unset DEV_EMAIL_TEST_ENABLED / "
                        + "DEV_SMS_TEST_ENABLED, or run with SPRING_PROFILES_ACTIVE=dev/test for local "
                        + "development.");
    }
}
