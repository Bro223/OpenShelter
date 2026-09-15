package ee.sheltermap.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed dev-sender guard:
 * the check keys on the ACTIVE PROFILES — the ENVIRONMENT's resolved set
 * (profile groups/defaults are only visible there,
 * not in the raw property string) — a blank profile set or any non-dev/test
 * profile with a dev (or blank) mail/sms provider is refused, the same way
 * {@code production} is.
 */
class DevSenderGuardTest {

    /** The resolved active profile set, as the guards now see it. */
    private static Environment env(String... profiles) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void devAndTestProfilesBootWithDevSenders() {
        for (Environment env : new Environment[]{env("dev"), env("test"), env("dev", "test")}) {
            assertThatCode(() -> new DevSenderGuard(env, "dev", "dev")).doesNotThrowAnyException();
            assertThatCode(() -> new DevSenderGuard(env, "dev", "twilio")).doesNotThrowAnyException();
            assertThatCode(() -> new DevSenderGuard(env, "smtp-pulse", "dev")).doesNotThrowAnyException();
            assertThatCode(() -> new DevSenderGuard(env, "", "")).doesNotThrowAnyException();
        }
    }

    @Test
    void productionWithADevSenderIsRefused() {
        // either channel on the dev sender is enough to refuse
        assertThatThrownBy(() -> new DevSenderGuard(env("production"), "dev", "twilio"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.provider");
        assertThatThrownBy(() -> new DevSenderGuard(env("production"), "smtp-pulse", "dev"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.sms.provider");
        // blank = matchIfMissing = the dev sender wins
        assertThatThrownBy(() -> new DevSenderGuard(env("production"), "", "twilio"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevSenderGuard(env("production"), "smtp-pulse", ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevSenderGuard(env("production"), "", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.provider + app.sms.provider");
    }

    @Test
    void blankProfileWithDevSendersIsRefused() {
        // a blank profile set is NOT a dev deploy (fail closed, like the other guards)
        assertThatThrownBy(() -> new DevSenderGuard(env(), "dev", "dev"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PRODUCTION REFUSED TO START");
        assertThatThrownBy(() -> new DevSenderGuard(env(), "smtp-pulse", "dev"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void mixedProfileWithAProductionEntryIsRefused() {
        // "production,dev" is not a dev deploy — the exemption needs the
        // ENTIRE active set to be a subset of {dev, test}.
        assertThatThrownBy(() -> new DevSenderGuard(env("production", "dev"), "dev", "dev"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevSenderGuard(env("dev", "prod"), "dev", "dev"))
                .isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> new DevSenderGuard(env("dev", "test"), "dev", "dev")).doesNotThrowAnyException();
    }

    @Test
    void productionWithRealSendersBoots() {
        assertThatCode(() -> new DevSenderGuard(env("production"), "smtp-pulse", "twilio")).doesNotThrowAnyException();
        assertThatCode(() -> new DevSenderGuard(env("staging"), "smtp-pulse", "twilio")).doesNotThrowAnyException();
    }
}
