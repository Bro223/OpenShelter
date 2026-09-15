package ee.sheltermap.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Startup guard for the OpenAPI documentation —
 * <strong>fails closed, same rule as {@link ProdJwtGuard} and
 * {@link DevEndpointsGuard}.</strong>
 *
 * <p>{@code GET /v3/api-docs} + the Swagger UI are a complete map of the
 * HTTP surface — the admin endpoints and their payload shapes included.
 * They are gated by {@code springdoc.api-docs.enabled} /
 * {@code springdoc.swagger-ui.enabled} (both default off, both driven by
 * the single {@code SPRINGDOC_ENABLED} environment flag) — but the flags
 * are NOT profile-gated: a production deploy that copies the dev
 * {@code .env} ({@code SPRINGDOC_ENABLED=true}) would publish the API map
 * on the public surface.
 *
 * <p>The rule is profile-keyed, not name-keyed (dev parity, like
 * {@link DevEndpointsGuard}) — read from the resolved {@link Environment}
 * active set, not the raw property:
 *
 * <ul>
 *   <li>When the ENTIRE active profile set (the resolved set) is a
 *       subset of exactly {@code dev} and {@code test} (and non-blank) →
 *       no check — the document exists precisely to be read locally. A
 *       mixed set like {@code production,dev} is NOT exempt —
 *       an any-match rule would let one stray entry disable the
 *       guard.</li>
 *   <li>Otherwise (blank profile, {@code production}, {@code prod-*},
 *       anything else) → refuse to boot when EITHER flag is enabled.</li>
 * </ul>
 *
 * <p>Layering: the security chain keeps the docs URLs behind
 * {@code anyRequest().authenticated()} outside dev/test, but this
 * guard is what makes a copied {@code .env} fail the boot instead of the
 * first page load.
 */
@Component
public class ApiDocsGuard {

    private static final Logger log = LoggerFactory.getLogger(ApiDocsGuard.class);

    public ApiDocsGuard(Environment env,
                        @Value("${springdoc.api-docs.enabled:false}") boolean apiDocsEnabled,
                        @Value("${springdoc.swagger-ui.enabled:false}") boolean uiEnabled) {
        // The resolved active profile set (profile groups and
        // spring.profiles.default only materialize in the ENVIRONMENT, not
        // in the raw property).
        if (Profiles.isDevTestOnly(env) || (!apiDocsEnabled && !uiEnabled)) {
            return; // dev/test parity, or no documentation surface is activated at all
        }
        String flags = enabledFlagNames(apiDocsEnabled, uiEnabled);
        // Loud log + loud rejection — never boot with the API map published
        // on a non-dev/test profile.
        log.error("REFUSING TO START — OpenAPI documentation {} enabled on a non-dev/test "
                        + "profile: active profiles={}.", flags, Arrays.toString(env.getActiveProfiles()));
        throw new IllegalStateException(
                "PRODUCTION REFUSED TO START: OpenAPI documentation " + flags
                        + " enabled with active profiles=" + Arrays.toString(env.getActiveProfiles())
                        + ". The API document and Swagger UI are dev-only — unset SPRINGDOC_ENABLED, "
                        + "or run with SPRING_PROFILES_ACTIVE=dev/test for local development.");
    }

    private static String enabledFlagNames(boolean apiDocsEnabled, boolean uiEnabled) {
        if (apiDocsEnabled && uiEnabled) {
            return "springdoc.api-docs.enabled + springdoc.swagger-ui.enabled";
        }
        return apiDocsEnabled ? "springdoc.api-docs.enabled" : "springdoc.swagger-ui.enabled";
    }
}
