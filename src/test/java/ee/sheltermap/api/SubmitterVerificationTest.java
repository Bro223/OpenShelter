package ee.sheltermap.api;

import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The submitter-verification depth policy, in one place: no author or no
 * confirmed channel -> absent, exactly one channel -> that channel named, two
 * or more -> FULL. Pure derivation (no Spring), so the whole table is pinned
 * here and the DTO/IT tests only have to prove it is served.
 */
class SubmitterVerificationTest {

    @Test
    void nothingConfirmedHasNoDepth() {
        assertThat(SubmitterVerification.of(null)).isNull();
        assertThat(SubmitterVerification.of(Set.of())).isNull();
    }

    @Test
    void oneConfirmedChannelNamesThatChannel() {
        assertThat(SubmitterVerification.of(EnumSet.of(VerificationLevel.EMAIL)))
                .isEqualTo(SubmitterVerification.EMAIL);
        assertThat(SubmitterVerification.of(EnumSet.of(VerificationLevel.PHONE)))
                .isEqualTo(SubmitterVerification.PHONE);
        assertThat(SubmitterVerification.of(EnumSet.of(VerificationLevel.SMART_ID)))
                .isEqualTo(SubmitterVerification.SMART_ID);
    }

    @Test
    void twoOrMoreConfirmedChannelsIsFull() {
        assertThat(SubmitterVerification.of(
                EnumSet.of(VerificationLevel.EMAIL, VerificationLevel.PHONE)))
                .isEqualTo(SubmitterVerification.FULL);
        assertThat(SubmitterVerification.of(
                EnumSet.of(VerificationLevel.EMAIL, VerificationLevel.SMART_ID)))
                .isEqualTo(SubmitterVerification.FULL);
        assertThat(SubmitterVerification.of(EnumSet.allOf(VerificationLevel.class)))
                .isEqualTo(SubmitterVerification.FULL);
    }
}
