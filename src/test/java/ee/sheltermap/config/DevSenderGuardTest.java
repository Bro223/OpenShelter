package ee.sheltermap.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed dev-sender guard (2026-09-10 review H3):
 * the check keys on the ACTIVE PROFILES — a blank profile or any
 * non-dev/test profile with a dev (or blank) mail/sms provider is refused,
 * the same way {@code production} is.
 */
class DevSenderGuardTest {

    @Test
    void devAndTestProfilesBootWithDevSenders() {
        for (String profiles : new String[]{"dev", "test", "dev, test", "dev,test"}) {
            assertThatCode(() -> new DevSenderGuard(profiles, "dev", "dev")).doesNotThrowAnyException();
            assertThatCode(() -> new DevSenderGuard(profiles, "dev", "twilio")).doesNotThrowAnyException();
            assertThatCode(() -> new DevSenderGuard(profiles, "smtp-pulse", "dev")).doesNotThrowAnyException();
            assertThatCode(() -> new DevSenderGuard(profiles, "", "")).doesNotThrowAnyException();
        }
    }

    @Test
    void productionWithADevSenderIsRefused() {
        // either channel on the dev sender is enough to refuse
        assertThatThrownBy(() -> new DevSenderGuard("production", "dev", "twilio"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.provider");
        assertThatThrownBy(() -> new DevSenderGuard("production", "smtp-pulse", "dev"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.sms.provider");
        // blank = matchIfMissing = the dev sender wins
        assertThatThrownBy(() -> new DevSenderGuard("production", "", "twilio"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevSenderGuard("production", "smtp-pulse", ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevSenderGuard("production", "", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.provider + app.sms.provider");
    }

    @Test
    void blankProfileWithDevSendersIsRefused() {
        // a blank profile is NOT a dev deploy (fail closed, like the other guards)
        assertThatThrownBy(() -> new DevSenderGuard("", "dev", "dev"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PRODUCTION REFUSED TO START");
        assertThatThrownBy(() -> new DevSenderGuard("", "smtp-pulse", "dev"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void mixedProfileWithAProductionEntryIsRefused() {
        // M2: "production,dev" is not a dev deploy — the exemption needs the
        // ENTIRE active set to be a subset of {dev, test}.
        assertThatThrownBy(() -> new DevSenderGuard("production,dev", "dev", "dev"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevSenderGuard("dev,prod", "dev", "dev"))
                .isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> new DevSenderGuard("dev,test", "dev", "dev")).doesNotThrowAnyException();
    }

    @Test
    void productionWithRealSendersBoots() {
        assertThatCode(() -> new DevSenderGuard("production", "smtp-pulse", "twilio")).doesNotThrowAnyException();
        assertThatCode(() -> new DevSenderGuard("staging", "smtp-pulse", "twilio")).doesNotThrowAnyException();
    }
}
