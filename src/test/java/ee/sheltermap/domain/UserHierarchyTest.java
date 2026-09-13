package ee.sheltermap.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bird-rule test (Step 1 acceptance): guest can't write,
 * RegisteredUser.levels() reflects add/revoke.
 */
class UserHierarchyTest {

    private static final String NAME = "Aleks";
    private static final String EMAIL = "aleks@example.com";
    private static final String PHONE = "+37250000000";

    private static VerificationClaim claim(VerificationLevel level, String externalRef) {
        return new VerificationClaim(level, "dev-" + level.name().toLowerCase(), externalRef, Instant.now());
    }

    @Test
    void guestCannotWrite() {
        User guest = new GuestUser();
        assertThat(guest.canWrite()).isFalse();
        assertThat(guest.getData().levels()).isEmpty();
    }

    @Test
    void registeredUserLevelsReflectAddAndRevoke() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE);

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();

        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));
        assertThat(user.levels()).containsExactly(VerificationLevel.EMAIL);
        assertThat(user.canWrite()).isTrue();

        // SMART_ID claim: the external ref is what the (future) PKI flow
        // supplies — no ID code is stored on the user.
        user.addVerification(claim(VerificationLevel.SMART_ID, "smart-id-ext-ref"));
        assertThat(user.levels()).containsExactlyInAnyOrder(VerificationLevel.EMAIL, VerificationLevel.SMART_ID);

        user.revoke(VerificationLevel.EMAIL);
        assertThat(user.levels()).containsExactly(VerificationLevel.SMART_ID);
        assertThat(user.canWrite()).isTrue(); // still verified via SMART_ID
    }

    @Test
    void revokingTheOnlyClaimDisablesWrite() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE);
        user.addVerification(claim(VerificationLevel.PHONE, PHONE));

        user.revoke(VerificationLevel.PHONE);

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();
    }

    @Test
    void userDataIsAnImmutableSnapshot() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE);
        UserData snapshot = user.getData();

        assertThat(snapshot.name()).isEqualTo(NAME);
        assertThat(snapshot.email()).isEqualTo(EMAIL);
        assertThat(snapshot.phone()).isEqualTo(PHONE);
        assertThat(snapshot.levels()).isEmpty();

        // snapshot is frozen; later claims only show up in a fresh snapshot
        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));
        assertThat(snapshot.levels()).isEmpty();
        assertThat(user.getData().levels()).containsExactly(VerificationLevel.EMAIL);
    }

    @Test
    void nameIsEditableWithoutTouchingClaims() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE);
        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));

        user.changeName("Uus Nimi");

        assertThat(user.getData().name()).isEqualTo("Uus Nimi");
        assertThat(user.levels()).containsExactly(VerificationLevel.EMAIL);
    }

    @Test
    void deleteAccountClearsVerifications() {
        RegisteredUser user = new RegisteredUser(NAME, EMAIL, PHONE);
        user.addVerification(claim(VerificationLevel.EMAIL, EMAIL));
        user.addVerification(claim(VerificationLevel.SMART_ID, "smart-id-ext-ref"));

        user.deleteAccount();

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();
    }
}
