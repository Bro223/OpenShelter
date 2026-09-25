package ee.sheltermap.security;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the blind-index MESSAGE FRAMING (V34): the HMAC input
 * must be an unambiguous function of the (domain, value) pair — no two
 * pairs may frame to the same message, so domain separation can never
 * rely on the tag set staying prefix-free. Pure unit — no Spring
 * context, no database.
 */
class PiiCryptoFramingTest {

    private static final String AES_KEY = base64Key(11);
    private static final String HMAC_KEY = base64Key(12);

    private final PiiCrypto pii = new PiiCrypto(new PiiKeys(AES_KEY, HMAC_KEY));

    /**
     * The exact collision the raw {@code domain ‖ value} concatenation
     * allows: the tag {@code users} is a prefix of {@code users.email},
     * so any value that starts with the difference ({@code ".email"})
     * merges across the boundary —
     * {@code "users" ‖ ".emailmari@x.com"} and
     * {@code "users.email" ‖ "mari@x.com"} are the SAME byte string
     * ({@code users.emailmari@x.com}) — one HMAC message, one index.
     * Under the length-prefix framing the two pairs must index
     * differently. (Canonicalisation is trim + lower-case only — no
     * structural e-mail validation — so {@code .emailmari@x.com} is a
     * legal canonical contact string.)
     */
    @Test
    void aPrefixRelatedDomainPairCannotCollide() {
        assertThat(pii.blindIndex("users", ".emailmari@x.com"))
                .isNotEqualTo(pii.blindIndex("users.email", "mari@x.com"));
    }

    @Test
    void theFramedIndexDiffersFromTheLegacyConcatenation() {
        // the framing change must actually change the derived index —
        // that is what forces the V34 reframe migration
        assertThat(pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee"))
                .isNotEqualTo(pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee"));
    }

    @Test
    void theFramedIndexStaysDeterministicHex64() {
        String a = pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee");
        String b = pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee");
        assertThat(a).isEqualTo(b);
        assertThat(a).matches("[0-9a-f]{64}");
    }

    @Test
    void framingStillSeparatesTheExistingDomainTags() {
        String emailIndex = pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "1234567890");
        String phoneIndex = pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, "1234567890");
        assertThat(emailIndex).isNotEqualTo(phoneIndex);
    }

    @Test
    void anOversizedPartFailsClosedInsteadOfWrappingTheLengthPrefix() {
        String tooLong = "x".repeat(65536);
        assertThatThrownBy(() -> pii.blindIndex("users.email", tooLong))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("65535");
        assertThatThrownBy(() -> pii.blindIndex(tooLong, "mari@example.ee"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("65535");
    }

    @Test
    void theLegacyFramingStillComputesTheOldRawConcatenation() {
        // pin: the transitional method reproduces exactly the pre-V34
        // message, so the read fallback and the migration tests can
        // recognise legacy rows — including the cross-domain collision
        // the framing removes
        String legacy = pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee");
        assertThat(legacy).matches("[0-9a-f]{64}");
        assertThat(pii.legacyBlindIndex("users", ".emailmari@x.com"))
                .isEqualTo(pii.legacyBlindIndex("users.email", "mari@x.com"));
    }

    private static String base64Key(int seed) {
        byte[] bytes = new byte[32];
        for (int i = 0; i < 32; i++) {
            bytes[i] = (byte) (seed * (i + 7));
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
}
