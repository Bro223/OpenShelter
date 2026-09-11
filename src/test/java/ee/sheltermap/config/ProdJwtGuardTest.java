package ee.sheltermap.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed JWT secret guard (S3 — 2026-09-08 review
 * W3): the check keys on the ACTIVE PROFILES — the ENVIRONMENT's resolved
 * set (S3, 2026-09-11 review: profile groups/defaults are only visible
 * there, not in the raw property string) — not on the literal word "prod":
 * a blank profile set or any non-dev/test profile gets the same refusal as
 * {@code production}.
 */
class ProdJwtGuardTest {

    private static final String DEV_DEFAULT = ProdJwtGuard.DEV_DEFAULT_SECRET;
    /** 32 bytes, not the published default. */
    private static final String STRONG = "0123456789abcdef0123456789abcdef0123";

    /** The resolved active profile set, as the guards now see it. */
    private static Environment env(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void devAndTestProfilesBootWithTheDefaultSecret() {
        assertThatCode(() -> new ProdJwtGuard(env("dev"), DEV_DEFAULT)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard(env("test"), DEV_DEFAULT)).doesNotThrowAnyException();
        // multi-entry set, the WHOLE set dev/test (M2)
        assertThatCode(() -> new ProdJwtGuard(env("dev", "test"), DEV_DEFAULT)).doesNotThrowAnyException();
    }

    @Test
    void mixedProfileWithAProductionEntryIsChecked() {
        // M2 (2026-09-10 review): "production,dev" is NOT a dev deploy — the
        // exemption needs the entire active set to be a subset of {dev, test}.
        assertThatThrownBy(() -> new ProdJwtGuard(env("production", "dev"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
        assertThatThrownBy(() -> new ProdJwtGuard(env("dev", "prod"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        // the check itself still only refuses weak secrets — strong passes
        assertThatCode(() -> new ProdJwtGuard(env("production", "dev"), STRONG)).doesNotThrowAnyException();
    }

    @Test
    void devProfileMatchIsExactAndCaseSensitive() {
        // "devfoo" / "developer" are not the dev profile, and "Dev" is not
        // "dev" (case-sensitive exact match) — the check applies
        assertThatThrownBy(() -> new ProdJwtGuard(env("devfoo"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ProdJwtGuard(env("developer", "test2"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ProdJwtGuard(env("Dev"), DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void blankOrNonDevProfilesRejectTheDefaultSecret() {
        for (Environment env : new Environment[]{
                env(), env("production"), env("prod"), env("prod-eu"), env("staging")}) {
            assertThatThrownBy(() -> new ProdJwtGuard(env, DEV_DEFAULT))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("JWT_SECRET");
        }
    }

    @Test
    void nonDevProfilesRequireAStrongNonDefaultSecret() {
        assertThatCode(() -> new ProdJwtGuard(env(), STRONG)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard(env("production"), STRONG)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard(env("prod-eu"), STRONG)).doesNotThrowAnyException();
    }

    @Test
    void anyNonDevTestProfileRejectsAShortSecret() {
        assertThatThrownBy(() -> new ProdJwtGuard(env("production"), "too-short"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("bytes");
        // 31 bytes — one under the HS256 minimum
        assertThatThrownBy(() -> new ProdJwtGuard(env(), "0123456789abcdef0123456789abcde"))
                .isInstanceOf(IllegalStateException.class);
        // blank secret
        assertThatThrownBy(() -> new ProdJwtGuard(env("staging"), ""))
                .isInstanceOf(IllegalStateException.class);
    }
}
