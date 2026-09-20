package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Boot-time WARNING (not a refusal) for the loopback {@code X-Forwarded-For}
 * trust default — same resolved-profile rule as the fail-closed guards
 * ({@link Profiles}: the ENVIRONMENT's resolved active set, exempt only
 * when the entire set is a subset of {@code dev, test}).
 *
 * <p>{@code app.ratelimit.trust-loopback} defaults to {@code true} on
 * purpose: the local Angular dev proxy runs on loopback, and without the
 * trust every dev request shares one rate-limit bucket. The cost of the
 * default: with a loopback proxy in front, ANY process that can reach
 * the app's loopback interface can set {@code X-Forwarded-For} and choose
 * its own rate-limit bucket — the per-IP throttles (auth, verify,
 * geo-resolve, submissions) can then be evaded by rotating self-declared
 * IPs from loopback. The default is correct for a dev machine and wrong
 * for a real deploy, so it is named loudly at boot outside dev/test —
 * and left to the operator (the warning names the
 * {@code RATELIMIT_TRUST_LOOPBACK} env var), never refused: refusing
 * would break the documented dev workflow the default exists for.
 */
@Component
public class LoopbackXffTrustGuard {

    private static final Logger log = LoggerFactory.getLogger(LoopbackXffTrustGuard.class);

    public LoopbackXffTrustGuard(Environment env,
                                 @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        if (shouldWarn(env, trustLoopback)) {
            log.warn("app.ratelimit.trust-loopback is ACTIVE on a non-dev/test deploy "
                            + "(active profiles={}): with a loopback proxy in front, ANY process "
                            + "that can reach the app's loopback interface can set X-Forwarded-For "
                            + "and choose its own rate-limit bucket — the per-IP throttles (auth, "
                            + "verify, geo-resolve, submissions) can be evaded by rotating "
                            + "self-declared IPs from loopback. Keep the default only while the "
                            + "local dev proxy is the only loopback client; set "
                            + "RATELIMIT_TRUST_LOOPBACK=false behind a real proxy/load balancer.",
                    Arrays.toString(env.getActiveProfiles()));
        }
    }

    /**
     * The warn decision (test seam — the constructor only logs): trust
     * active AND not a dev/test deploy (the whole resolved profile set,
     * the {@link Profiles} rule — a blank set or a mixed set like
     * {@code production,dev} both arm the warning).
     */
    static boolean shouldWarn(Environment env, boolean trustLoopback) {
        return trustLoopback && !Profiles.isDevTestOnly(env);
    }
}
