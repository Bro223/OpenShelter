package ee.sheltermap.verification;

import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.testutil.TestPiiCrypto;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the bounded V34 confirm fallback: a {@code v2:}
 * one-time-code hash issued under the LEGACY raw-concat framing must
 * keep verifying until its TTL (natural expiry — the same migration
 * path the pre-v2 unkeyed codes use), and nothing else is accepted.
 * Pure unit — no Spring context, no database.
 */
class CodeHashesFramingFallbackTest {

    private static final String DOMAIN = PiiCrypto.DOMAIN_CODE_PASSWORD_RESET;

    private final PiiCrypto pii = TestPiiCrypto.newTest();

    @Test
    void aV2CodeIssuedUnderTheFramedSlotConfirms() {
        String stored = pii.codeHash(DOMAIN, "123456");
        assertThat(CodeHashes.matches(pii, stored, DOMAIN, "123456")).isTrue();
    }

    @Test
    void anInFlightV2CodeIssuedUnderTheLegacyFramingStillConfirms() {
        // issued by a pre-V34 instance, presented after the cutover —
        // the bounded window: verified until the code's TTL expires
        String stored = pii.legacyCodeHash(DOMAIN, "123456");
        assertThat(CodeHashes.matches(pii, stored, DOMAIN, "123456")).isTrue();
    }

    @Test
    void aWrongCodeFailsUnderBothFramings() {
        assertThat(CodeHashes.matches(pii, pii.codeHash(DOMAIN, "123456"), DOMAIN, "654321"))
                .isFalse();
        assertThat(CodeHashes.matches(pii, pii.legacyCodeHash(DOMAIN, "123456"), DOMAIN, "654321"))
                .isFalse();
    }

    @Test
    void aV2CodeFromAnotherDomainFailsUnderBothFramings() {
        // the framing must not blur the slot separation: a password-reset
        // code must not confirm under the contact-change domain
        assertThat(CodeHashes.matches(pii, pii.codeHash(DOMAIN, "123456"),
                PiiCrypto.DOMAIN_CODE_CONTACT_CHANGE, "123456")).isFalse();
        assertThat(CodeHashes.matches(pii, pii.legacyCodeHash(DOMAIN, "123456"),
                PiiCrypto.DOMAIN_CODE_CONTACT_CHANGE, "123456")).isFalse();
    }

    @Test
    void theUnkeyedLegacyAcceptanceIsUntouched() {
        // the pre-v2 unkeyed SHA-256 form keeps verifying until expiry —
        // the V34 transition must not disturb that acceptance
        String stored = CodeHashes.sha256Hex("123456");
        assertThat(CodeHashes.matches(pii, stored, DOMAIN, "123456")).isTrue();
        assertThat(CodeHashes.matches(pii, stored, DOMAIN, "654321")).isFalse();
    }
}
