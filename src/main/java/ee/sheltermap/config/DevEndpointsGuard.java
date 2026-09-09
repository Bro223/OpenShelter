package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Startup guard for the {@code /dev/*} diagnostic endpoints (wave-2, W17) —
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
 * {@link ProdJwtGuard}):
 *
 * <ul>
 *   <li>When at least one active profile entry (comma list, trimmed) is
 *       exactly {@code dev} or {@code test} → no check — the flags exist
 *       precisely to exercise the real channels locally.</li>
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

    public DevEndpointsGuard(@Value("${spring.profiles.active:}") String profiles,
                             @Value("${app.dev-email-test.enabled:false}") boolean emailTestEnabled,
                             @Value("${app.dev-sms-test.enabled:false}") boolean smsTestEnabled) {
        List<String> active = Arrays.stream(profiles.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        boolean devLike = active.stream().anyMatch(p -> p.equals("dev") || p.equals("test"));
        if (devLike || (!emailTestEnabled && !smsTestEnabled)) {
            return; // dev/test parity, or no dev diagnostic surface is activated at all
        }
        String flags = enabledFlagNames(emailTestEnabled, smsTestEnabled);
        // Loud log + loud rejection — never boot with an authenticated
        // e-mail/SMS relay on a non-dev/test profile.
        log.error("REFUSING TO START — dev diagnostic endpoint(s) {} enabled on a non-dev/test "
                        + "profile: active profiles=[{}].", flags, profiles);
        throw new IllegalStateException(
                "PRODUCTION REFUSED TO START: dev diagnostic endpoint(s) " + flags
                        + " enabled with active profiles=[" + profiles
                        + "]. The /dev/* test endpoints are dev-only — unset DEV_EMAIL_TEST_ENABLED / "
                        + "DEV_SMS_TEST_ENABLED, or run with SPRING_PROFILES_ACTIVE=dev/test for local "
                        + "development.");
    }

    private static String enabledFlagNames(boolean emailTestEnabled, boolean smsTestEnabled) {
        if (emailTestEnabled && smsTestEnabled) {
            return "app.dev-email-test.enabled + app.dev-sms-test.enabled";
        }
        return emailTestEnabled ? "app.dev-email-test.enabled" : "app.dev-sms-test.enabled";
    }
}
