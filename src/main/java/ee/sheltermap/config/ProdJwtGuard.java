package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * Startup guard (hardening pass, reworked for the 2026-09-08 review W3) —
 * <strong>fails closed on the secret, not the profile name.</strong>
 *
 * <p>The old guard only refused to boot when a profile was literally
 * {@code prod}; a deploy that shipped with a BLANK profile (or any
 * non-{@code prod} name) and the dev-only default secret would still start
 * and silently sign forgeable tokens. The rule now is inverted:
 *
 * <ul>
 *   <li>When the ENTIRE active profile set (comma list, trimmed) is a
 *       subset of exactly {@code dev} and {@code test} (and non-blank) →
 *       no check (dev parity — the published default secret is the point
 *       there). A mixed list like {@code production,dev} is NOT exempt
 *       (2026-09-10 review M2: the old any-match let one stray entry
 *       disable the guard).</li>
 *   <li>Otherwise (blank profile, {@code production}, {@code prod-*},
 *       anything else) → refuse to boot when {@code app.jwt.secret} equals
 *       the published dev default ({@link #DEV_DEFAULT_SECRET}) <em>or</em>
 *       is shorter than 32 bytes (unfit for HS256).</li>
 * </ul>
 *
 * <p>The default is published in the repo (it must be — it is the
 * local-development value), so a production deploy that forgets to set
 * {@code JWT_SECRET} is caught at boot, not at the first forged token.
 */
@Component
public class ProdJwtGuard {

    static final String DEV_DEFAULT_SECRET = "dev-only-secret-change-me-sheltermap-0123456789abcdef";

    /** HS256 needs a >= 256-bit (32-byte) key; anything shorter is rejected. */
    static final int MIN_SECRET_BYTES = 32;

    private static final Logger log = LoggerFactory.getLogger(ProdJwtGuard.class);

    public ProdJwtGuard(@Value("${spring.profiles.active:}") String profiles,
                        @Value("${app.jwt.secret:}") String secret) {
        List<String> active = Arrays.stream(profiles.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        // M2: exempt only when the WHOLE active set is a subset of
        // {dev, test} — "production,dev" is not a dev deploy.
        boolean devLike = !active.isEmpty()
                && active.stream().allMatch(p -> p.equals("dev") || p.equals("test"));
        if (devLike) {
            return; // dev/test parity: the published default secret is expected here
        }
        if (DEV_DEFAULT_SECRET.equals(secret)
                || (secret == null ? 0 : secret.getBytes(StandardCharsets.UTF_8).length) < MIN_SECRET_BYTES) {
            String reason = DEV_DEFAULT_SECRET.equals(secret)
                    ? "app.jwt.secret is still the published dev-only default"
                    : "app.jwt.secret is shorter than " + MIN_SECRET_BYTES + " bytes (HS256 minimum)";
            // Loud log + loud rejection — a misconfigured deploy must fail the
            // boot, never run with a forgeable signing key.
            log.error("REFUSING TO START — {}: active profiles=[{}]. Set JWT_SECRET to a strong random value "
                    + "(>= {} bytes, not the published dev default) or run with SPRING_PROFILES_ACTIVE=dev.",
                    reason, profiles, MIN_SECRET_BYTES);
            throw new IllegalStateException(
                    "PRODUCTION REFUSED TO START: " + reason + ". Set JWT_SECRET to a strong random value "
                            + "(>= " + MIN_SECRET_BYTES + " bytes, not the published dev default), or run with "
                            + "SPRING_PROFILES_ACTIVE=dev/test for local development.");
        }
    }
}
