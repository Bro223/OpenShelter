package ee.sheltermap.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the fail-closed dev-endpoint guard (wave-2, W17): the check
 * keys on the ACTIVE PROFILES, not on the literal word "prod" — a blank
 * profile or any non-dev/test profile with a dev diagnostic flag enabled is
 * refused the same way {@code production} is.
 */
class DevEndpointsGuardTest {

    @Test
    void devAndTestProfilesBootWithEitherFlagEnabled() {
        for (String profiles : new String[]{"dev", "test", "dev, test", "dev,test"}) {
            assertThatCode(() -> new DevEndpointsGuard(profiles, true, true)).doesNotThrowAnyException();
            assertThatCode(() -> new DevEndpointsGuard(profiles, true, false)).doesNotThrowAnyException();
            assertThatCode(() -> new DevEndpointsGuard(profiles, false, true)).doesNotThrowAnyException();
        }
    }

    @Test
    void mixedProfileWithAProductionEntryIsChecked() {
        // M2 (2026-09-10 review): "production,dev" is NOT a dev deploy — the
        // exemption needs the entire active set to be a subset of {dev, test}.
        for (String profiles : new String[]{"production,dev", "dev,prod"}) {
            assertThatThrownBy(() -> new DevEndpointsGuard(profiles, true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-email-test.enabled");
            assertThatThrownBy(() -> new DevEndpointsGuard(profiles, false, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-sms-test.enabled");
        }
        // a fully dev/test set stays exempt
        assertThatCode(() -> new DevEndpointsGuard("dev,test", true, true)).doesNotThrowAnyException();
    }

    @Test
    void devProfileMatchIsExact() {
        // "devfoo" / "developer" are not the dev profile — the check applies
        assertThatThrownBy(() -> new DevEndpointsGuard("devfoo", true, false))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DevEndpointsGuard("developer,test2", false, true))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void nonDevProfilesRefuseTheEmailTestFlag() {
        for (String profiles : new String[]{"", "production", "prod", "prod-eu", "staging"}) {
            assertThatThrownBy(() -> new DevEndpointsGuard(profiles, true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-email-test.enabled")
                    .hasMessageContaining("DEV_EMAIL_TEST_ENABLED");
        }
    }

    @Test
    void nonDevProfilesRefuseTheSmsTestFlag() {
        for (String profiles : new String[]{"", "production", "prod-eu"}) {
            assertThatThrownBy(() -> new DevEndpointsGuard(profiles, false, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("app.dev-sms-test.enabled")
                    .hasMessageContaining("DEV_SMS_TEST_ENABLED");
        }
    }

    @Test
    void nonDevProfilesRefuseWhenBothFlagsAreEnabled() {
        assertThatThrownBy(() -> new DevEndpointsGuard("production", true, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.dev-email-test.enabled")
                .hasMessageContaining("app.dev-sms-test.enabled");
    }

    @Test
    void nonDevProfilesBootWhenBothFlagsAreOff() {
        // the default-off state is the safe default — nothing to refuse
        assertThatCode(() -> new DevEndpointsGuard("", false, false)).doesNotThrowAnyException();
        assertThatCode(() -> new DevEndpointsGuard("production", false, false)).doesNotThrowAnyException();
        assertThatCode(() -> new DevEndpointsGuard("staging", false, false)).doesNotThrowAnyException();
    }
}
