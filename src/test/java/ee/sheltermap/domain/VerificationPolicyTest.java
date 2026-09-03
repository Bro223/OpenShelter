package ee.sheltermap.domain;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Policy matrix (Step 1 acceptance): every capability x every level-set from
 * the context testing notes ({}, {EMAIL}, {PHONE}, {SMART_ID}, {PHONE, EMAIL}).
 */
class VerificationPolicyTest {

    private final VerificationPolicy policy = VerificationPolicy.defaults();

    private static final Set<VerificationLevel> NONE = Set.of();
    private static final Set<VerificationLevel> EMAIL = Set.of(VerificationLevel.EMAIL);
    private static final Set<VerificationLevel> PHONE = Set.of(VerificationLevel.PHONE);
    private static final Set<VerificationLevel> SMART_ID = Set.of(VerificationLevel.SMART_ID);
    private static final Set<VerificationLevel> PHONE_EMAIL = Set.of(VerificationLevel.PHONE, VerificationLevel.EMAIL);

    @Test
    void viewMapAllowedForEveryoneIncludingNoClaims() {
        assertThat(policy.allows(NONE, Capability.VIEW_MAP)).isTrue();
        assertThat(policy.allows(EMAIL, Capability.VIEW_MAP)).isTrue();
        assertThat(policy.allows(PHONE, Capability.VIEW_MAP)).isTrue();
        assertThat(policy.allows(SMART_ID, Capability.VIEW_MAP)).isTrue();
        assertThat(policy.allows(PHONE_EMAIL, Capability.VIEW_MAP)).isTrue();
    }

    @Test
    void submitShelterDeniedWithoutAnyClaim() {
        assertThat(policy.allows(NONE, Capability.SUBMIT_SHELTER)).isFalse();
    }

    @Test
    void submitShelterAllowedForEachSingleClaim() {
        assertThat(policy.allows(EMAIL, Capability.SUBMIT_SHELTER)).isTrue();
        assertThat(policy.allows(PHONE, Capability.SUBMIT_SHELTER)).isTrue();
        assertThat(policy.allows(SMART_ID, Capability.SUBMIT_SHELTER)).isTrue();
        assertThat(policy.allows(PHONE_EMAIL, Capability.SUBMIT_SHELTER)).isTrue();
    }

}
