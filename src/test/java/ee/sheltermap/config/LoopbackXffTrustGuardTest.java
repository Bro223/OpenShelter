package ee.sheltermap.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Unit tests for the loopback X-Forwarded-For trust warning: it fires
 * OUTSIDE dev/test (the resolved active set — profile groups/defaults are
 * only visible in the ENVIRONMENT, the same rule as the fail-closed
 * guards) whenever loopback XFF trust is active, and stays quiet in
 * dev/test (where the trust default exists to serve the local dev proxy)
 * and when the trust is explicitly disabled. It is a warning, never a
 * refusal — the default must keep the documented dev workflow working.
 */
class LoopbackXffTrustGuardTest {

    /** The resolved active profile set, as the guard sees it. */
    private static Environment env(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void warnsOutsideDevTestWhenLoopbackTrustIsActive() {
        // Blank profile set is NOT a dev deploy (fail closed), and any
        // non-dev/test profile arms the warning.
        for (Environment env : new Environment[]{
                env(), env("production"), env("prod"), env("prod-eu"), env("staging")}) {
            assertThat(LoopbackXffTrustGuard.shouldWarn(env, true)).isTrue();
        }
    }

    @Test
    void staysQuietInDevAndTest() {
        // The dev/test deploy is where the trust default exists to serve
        // the local Angular proxy — no warning there.
        for (Environment env : new Environment[]{env("dev"), env("test"), env("dev", "test")}) {
            assertThat(LoopbackXffTrustGuard.shouldWarn(env, true)).isFalse();
        }
    }

    @Test
    void staysQuietWhenLoopbackTrustIsDisabled() {
        // An operator who flipped RATELIMIT_TRUST_LOOPBACK=false has made
        // the choice — nothing to warn about on any profile.
        for (Environment env : new Environment[]{env(), env("production"), env("dev")}) {
            assertThat(LoopbackXffTrustGuard.shouldWarn(env, false)).isFalse();
        }
    }

    @Test
    void aMixedProfileSetIsNotExempt() {
        // "production,dev" is not a dev deploy — one stray non-dev entry
        // arms the warning (the Profiles subset rule).
        assertThat(LoopbackXffTrustGuard.shouldWarn(env("production", "dev"), true)).isTrue();
        assertThat(LoopbackXffTrustGuard.shouldWarn(env("dev", "prod"), true)).isTrue();
    }

    @Test
    void constructionIsBootSafeOnEveryCombination() {
        // The guard WARNS, it never refuses the boot: every combination
        // of profiles x trust flag must construct cleanly (the default
        // keeps the dev workflow working, and a real deploy stays up with
        // a loud warning instead of a crash).
        for (Environment env : new Environment[]{env(), env("dev"), env("test"), env("production")}) {
            assertThatCode(() -> new LoopbackXffTrustGuard(env, true)).doesNotThrowAnyException();
            assertThatCode(() -> new LoopbackXffTrustGuard(env, false)).doesNotThrowAnyException();
        }
    }
}
