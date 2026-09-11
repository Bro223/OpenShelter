package ee.sheltermap.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed JWT secret guard (S3 — 2026-09-08 review
 * W3): the check keys on the ACTIVE PROFILES, not on the literal word
 * "prod" — a blank profile or any non-dev/test profile gets the same
 * refusal as {@code production}.
 */
class ProdJwtGuardTest {

    private static final String DEV_DEFAULT = ProdJwtGuard.DEV_DEFAULT_SECRET;
    /** 32 bytes, not the published default. */
    private static final String STRONG = "0123456789abcdef0123456789abcdef0123";

    @Test
    void devAndTestProfilesBootWithTheDefaultSecret() {
        assertThatCode(() -> new ProdJwtGuard("dev", DEV_DEFAULT)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard("test", DEV_DEFAULT)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard("dev, test", DEV_DEFAULT)).doesNotThrowAnyException();
        // trimmed + comma-listed entries — the WHOLE set is dev/test (M2)
        assertThatCode(() -> new ProdJwtGuard(" dev , test ", DEV_DEFAULT)).doesNotThrowAnyException();
    }

    @Test
    void mixedProfileWithAProductionEntryIsChecked() {
        // M2 (2026-09-10 review): "production,dev" is NOT a dev deploy — the
        // exemption needs the entire active set to be a subset of {dev, test}.
        assertThatThrownBy(() -> new ProdJwtGuard("production,dev", DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
        assertThatThrownBy(() -> new ProdJwtGuard("dev,prod", DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        // the check itself still only refuses weak secrets — strong passes
        assertThatCode(() -> new ProdJwtGuard("production,dev", STRONG)).doesNotThrowAnyException();
    }

    @Test
    void devProfileMatchIsExact() {
        // "devfoo" / "developer" are not the dev profile — the check applies
        assertThatThrownBy(() -> new ProdJwtGuard("devfoo", DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ProdJwtGuard("developer,test2", DEV_DEFAULT))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void nonDevProfilesRejectTheDefaultSecret() {
        for (String profiles : new String[]{"", "production", "prod", "prod-eu", "staging"}) {
            assertThatThrownBy(() -> new ProdJwtGuard(profiles, DEV_DEFAULT))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("JWT_SECRET");
        }
    }

    @Test
    void nonDevProfilesRequireAStrongNonDefaultSecret() {
        assertThatCode(() -> new ProdJwtGuard("", STRONG)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard("production", STRONG)).doesNotThrowAnyException();
        assertThatCode(() -> new ProdJwtGuard("prod-eu", STRONG)).doesNotThrowAnyException();
    }

    @Test
    void anyNonDevTestProfileRejectsAShortSecret() {
        assertThatThrownBy(() -> new ProdJwtGuard("production", "too-short"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("bytes");
        // 31 bytes — one under the HS256 minimum
        assertThatThrownBy(() -> new ProdJwtGuard("", "0123456789abcdef0123456789abcde"))
                .isInstanceOf(IllegalStateException.class);
        // blank secret
        assertThatThrownBy(() -> new ProdJwtGuard("staging", ""))
                .isInstanceOf(IllegalStateException.class);
    }
}
