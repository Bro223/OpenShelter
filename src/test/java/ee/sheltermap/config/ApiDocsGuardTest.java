package ee.sheltermap.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed OpenAPI-documentation guard —
 * the same shape as {@link ProdJwtGuardTest} and
 * {@link DevEndpointsGuardTest}: the check keys on the ACTIVE PROFILES —
 * the ENVIRONMENT's resolved set (profile groups/defaults are only
 * visible there, not in the raw property string) — not on the literal
 * word "prod": a blank profile set or any non-dev/test profile with a
 * docs flag enabled gets the same refusal as {@code production}.
 */
class ApiDocsGuardTest {

    /** The resolved active profile set, as the guards now see it. */
    private static Environment env(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void devAndTestProfilesBootWithEitherFlagEnabled() {
        for (Environment env : new Environment[]{env("dev"), env("test"), env("dev", "test")}) {
            assertThatCode(() -> new ApiDocsGuard(env, true, true)).doesNotThrowAnyException();
            assertThatCode(() -> new ApiDocsGuard(env, true, false)).doesNotThrowAnyException();
            assertThatCode(() -> new ApiDocsGuard(env, false, true)).doesNotThrowAnyException();
        }
    }

    @Test
    void mixedProfileWithAProductionEntryIsChecked() {
        // "production,dev" is NOT a dev deploy — the
        // exemption needs the entire active set to be a subset of {dev, test}.
        for (Environment env : new Environment[]{env("production", "dev"), env("dev", "prod")}) {
            assertThatThrownBy(() -> new ApiDocsGuard(env, true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("springdoc.api-docs.enabled");
            assertThatThrownBy(() -> new ApiDocsGuard(env, false, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("springdoc.swagger-ui.enabled");
        }
        // a fully dev/test set stays exempt
        assertThatCode(() -> new ApiDocsGuard(env("dev", "test"), true, true)).doesNotThrowAnyException();
    }

    @Test
    void devProfileMatchIsExactAndCaseSensitive() {
        // "devfoo" / "developer" are not the dev profile, and "Dev" is not
        // "dev" (case-sensitive exact match) — the check applies
        assertThatThrownBy(() -> new ApiDocsGuard(env("devfoo"), true, false))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ApiDocsGuard(env("developer", "test2"), false, true))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ApiDocsGuard(env("Dev"), true, false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void blankOrNonDevProfilesRefuseTheApiDocsFlag() {
        for (Environment env : new Environment[]{
                env(), env("production"), env("prod"), env("prod-eu"), env("staging")}) {
            assertThatThrownBy(() -> new ApiDocsGuard(env, true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("springdoc.api-docs.enabled")
                    .hasMessageContaining("SPRINGDOC_ENABLED");
        }
    }

    @Test
    void blankOrNonDevProfilesRefuseTheSwaggerUiFlag() {
        for (Environment env : new Environment[]{
                env(), env("production"), env("prod-eu")}) {
            assertThatThrownBy(() -> new ApiDocsGuard(env, false, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("springdoc.swagger-ui.enabled")
                    .hasMessageContaining("SPRINGDOC_ENABLED");
        }
    }

    @Test
    void nonDevProfilesRefuseWhenBothFlagsAreEnabled() {
        assertThatThrownBy(() -> new ApiDocsGuard(env("production"), true, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("springdoc.api-docs.enabled")
                .hasMessageContaining("springdoc.swagger-ui.enabled");
    }

    @Test
    void nonDevProfilesBootWhenBothFlagsAreOff() {
        // the default-off state is the safe default — nothing to refuse
        assertThatCode(() -> new ApiDocsGuard(env(), false, false)).doesNotThrowAnyException();
        assertThatCode(() -> new ApiDocsGuard(env("production"), false, false)).doesNotThrowAnyException();
        assertThatCode(() -> new ApiDocsGuard(env("staging"), false, false)).doesNotThrowAnyException();
    }
}
