package ee.sheltermap.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed datasource-credential guard: the check keys
 * on the ACTIVE PROFILES — the ENVIRONMENT's resolved set (profile
 * groups/defaults are only visible there, not in the raw property string) —
 * so a blank profile set or any non-dev/test profile gets the same refusal as
 * {@code production} while the published dev password (or a blank one) is in
 * use.
 */
class DataSourceCredentialGuardTest {

    private static final String DEV_DEFAULT = DataSourceCredentialGuard.DEV_DEFAULT_PASSWORD;
    /** A real password: not blank and not the published default. */
    private static final String REAL = "s3cret-not-the-published-default";

    /** The resolved active profile set, as the guards now see it. */
    private static Environment env(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void devAndTestProfilesBootWithThePublishedDevPassword() {
        assertThatCode(() -> new DataSourceCredentialGuard(env("dev"), DEV_DEFAULT)).doesNotThrowAnyException();
        assertThatCode(() -> new DataSourceCredentialGuard(env("test"), DEV_DEFAULT)).doesNotThrowAnyException();
        // multi-entry set, the WHOLE set dev/test
        assertThatCode(() -> new DataSourceCredentialGuard(env("dev", "test"), DEV_DEFAULT)).doesNotThrowAnyException();
        // dev parity is about the profile, not the value — a real password passes too
        assertThatCode(() -> new DataSourceCredentialGuard(env("dev"), REAL)).doesNotThrowAnyException();
    }

    @Test
    void mixedProfileWithAProductionEntryIsRefused() {
        // "production,dev" is NOT a dev deploy — the exemption needs the
        // ENTIRE active set to be a subset of {dev, test}.
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("production", "dev"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DB_PASSWORD");
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("dev", "prod"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void blankOrNonDevProfilesRefuseThePublishedDevPassword() {
        for (Environment env : new Environment[]{
                env(), env("production"), env("prod"), env("prod-eu"), env("staging")}) {
            assertThatThrownBy(() -> new DataSourceCredentialGuard(env, DEV_DEFAULT))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("PRODUCTION REFUSED TO START")
                    .hasMessageContaining("DB_PASSWORD");
        }
    }

    @Test
    void nonDevProfilesRefuseABlankPassword() {
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("production"), ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("blank");
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env(), null))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("staging"), "   "))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void nonDevProfilesBootWithARealNonDefaultPassword() {
        assertThatCode(() -> new DataSourceCredentialGuard(env(), REAL)).doesNotThrowAnyException();
        assertThatCode(() -> new DataSourceCredentialGuard(env("production"), REAL)).doesNotThrowAnyException();
        assertThatCode(() -> new DataSourceCredentialGuard(env("prod-eu"), REAL)).doesNotThrowAnyException();
    }

    @Test
    void devProfileMatchIsExactAndCaseSensitive() {
        // "devfoo" / "developer" are not the dev profile, and "Dev" is not
        // "dev" (case-sensitive exact match) — the check applies
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("devfoo"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("developer", "test2"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DataSourceCredentialGuard(env("Dev"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
    }
}
