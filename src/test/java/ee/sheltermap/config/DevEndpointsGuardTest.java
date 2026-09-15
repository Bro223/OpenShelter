package ee.sheltermap.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed dev-endpoint guard: the check
 * keys on the ACTIVE PROFILES — the ENVIRONMENT's resolved set (profile
 * groups/defaults are only visible there, not in
 * the raw property string) — not on the literal word "prod": a blank
 * profile set or any non-dev/test profile with a dev diagnostic flag enabled
 * is refused the same way {@code production} is.
 */
class DevEndpointsGuardTest {

    /** The resolved active profile set, as the guards now see it. */
    private static Environment env(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void devAndTestProfilesBootWithEitherFlagEnabled() {
        for (Environment env : new Environment[]{env("dev"), env("test"), env("dev", "test")}) {
            assertThatCode(() -> new DevEndpointsGuard(env, true, true)).doesNotThrowAnyException();
            assertThatCode(() -> new DevEndpointsGuard(env, true, false)).doesNotThrowAnyException();
            assertThatCode(() -> new DevEndpointsGuard(env, false, true)).doesNotThrowAnyException();
        }
    }

    @Test
    void mixedProfileWithAProductionEntryIsChecked() {
        // "production,dev" is NOT a dev deploy — the
        // exemption needs the entire active set to be a subset of {dev, test}.
        for (Environment env : new Environment[]{env("production", "dev"), env("dev", "prod")}) {
            assertThatThrownBy(() -> new DevEndpointsGuard(env, true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-email-test.enabled");
            assertThatThrownBy(() -> new DevEndpointsGuard(env, false, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-sms-test.enabled");
        }
        // a fully dev/test set stays exempt
        assertThatCode(() -> new DevEndpointsGuard(env("dev", "test"), true, true)).doesNotThrowAnyException();
    }

    @Test
    void devProfileMatchIsExactAndCaseSensitive() {
        // "devfoo" / "developer" are not the dev profile, and "Dev" is not
        // "dev" (case-sensitive exact match) — the check applies
        assertThatThrownBy(() -> new DevEndpointsGuard(env("devfoo"), true, false))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevEndpointsGuard(env("developer", "test2"), false, true))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevEndpointsGuard(env("Dev"), true, false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void blankOrNonDevProfilesRefuseTheEmailTestFlag() {
        for (Environment env : new Environment[]{
                env(), env("production"), env("prod"), env("prod-eu"), env("staging")}) {
            assertThatThrownBy(() -> new DevEndpointsGuard(env, true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-email-test.enabled")
                    .hasMessageContaining("DEV_EMAIL_TEST_ENABLED");
        }
    }

    @Test
    void blankOrNonDevProfilesRefuseTheSmsTestFlag() {
        for (Environment env : new Environment[]{env(), env("production"), env("prod-eu")}) {
            assertThatThrownBy(() -> new DevEndpointsGuard(env, false, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-sms-test.enabled")
                    .hasMessageContaining("DEV_SMS_TEST_ENABLED");
        }
    }

    @Test
    void nonDevProfilesRefuseWhenBothFlagsAreEnabled() {
        assertThatThrownBy(() -> new DevEndpointsGuard(env("production"), true, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.dev-email-test.enabled")
                .hasMessageContaining("app.dev-sms-test.enabled");
    }

    @Test
    void nonDevProfilesBootWhenBothFlagsAreOff() {
        // the default-off state is the safe default — nothing to refuse
        assertThatCode(() -> new DevEndpointsGuard(env(), false, false)).doesNotThrowAnyException();
        assertThatCode(() -> new DevEndpointsGuard(env("production"), false, false)).doesNotThrowAnyException();
        assertThatCode(() -> new DevEndpointsGuard(env("staging"), false, false)).doesNotThrowAnyException();
    }
}
