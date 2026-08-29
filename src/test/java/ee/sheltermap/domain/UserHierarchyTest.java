package ee.sheltermap.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bird-rule test (Step 1 acceptance): guest can watch / can't write,
 * admin can write, RegisteredUser.levels() reflects add/revoke.
 */
class UserHierarchyTest {

    private static final String NAME = "Aleks";
    private static final String EMAIL = "aleks@example.com";
    private static final String PHONE = "+37250000000";
    private static final String NATIONAL_ID = "12345678901";

    private static VerificationClaim claim(VerificationLevel level, String externalRef) {
        return new VerificationClaim(level, "dev-" + level.name().toLowerCase(), externalRef, Instant.now());
    }

    @Test
    void guestCanWatchButCannotWrite() {
        User guest = new GuestUser();
        assertThat(guest.canWatch()).isTrue();
        assertThat(guest.canWrite()).isFalse();
        assertThat(guest.getData().levels()).isEmpty();
    }

    @Test
    void adminCanWrite() {
        User admin = new AdminUser();
        assertThat(admin.canWatch()).isTrue();
        assertThat(admin.canWrite()).isTrue();
    }

    @Test
    void registeredUserLevelsReflectAddAndRevoke() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE, NATIONAL_ID);

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();

        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));
        assertThat(user.levels()).containsExactly(VerificationLevel.EMAIL);
        assertThat(user.canWrite()).isTrue();

        user.addVerification(claim(VerificationLevel.SMART_ID, NATIONAL_ID));
        assertThat(user.levels()).containsExactlyInAnyOrder(VerificationLevel.EMAIL, VerificationLevel.SMART_ID);

        user.revoke(VerificationLevel.EMAIL);
        assertThat(user.levels()).containsExactly(VerificationLevel.SMART_ID);
        assertThat(user.canWrite()).isTrue(); // still verified via SMART_ID
    }

    @Test
    void revokingTheOnlyClaimDisablesWrite() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE, NATIONAL_ID);
        user.addVerification(claim(VerificationLevel.PHONE, PHONE));

        user.revoke(VerificationLevel.PHONE);

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();
    }

    @Test
    void userDataIsAnImmutableSnapshot() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE, NATIONAL_ID);
        UserData snapshot = user.getData();

        assertThat(snapshot.name()).isEqualTo(NAME);
        assertThat(snapshot.email()).isEqualTo(EMAIL);
        assertThat(snapshot.phone()).isEqualTo(PHONE);
        assertThat(snapshot.nationalIdCode()).isEqualTo(NATIONAL_ID);
        assertThat(snapshot.levels()).isEmpty();

        // snapshot is frozen; later claims only show up in a fresh snapshot
        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));
        assertThat(snapshot.levels()).isEmpty();
        assertThat(user.getData().levels()).containsExactly(VerificationLevel.EMAIL);
    }

    @Test
    void deleteAccountClearsVerifications() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE, NATIONAL_ID);
        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));
        user.addVerification(claim(VerificationLevel.SMART_ID, NATIONAL_ID));

        user.deleteAccount();

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();
    }
}
