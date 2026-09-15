package ee.sheltermap.security;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the PII-at-rest crypto core: the AES-GCM {@code v1:}
 * envelope, the HMAC-SHA256 blind index, and the fail-closed key
 * validation. Pure unit — no Spring context, no database.
 */
class PiiCryptoTest {

    private static final String AES_KEY = base64Key(1);
    private static final String HMAC_KEY = base64Key(2);
    private static final String OTHER_HMAC_KEY = base64Key(3);

    private final PiiCrypto pii = new PiiCrypto(new PiiKeys(AES_KEY, HMAC_KEY));

    @Test
    void encryptThenDecryptRoundTrips() {
        String envelope = pii.encrypt("mari@example.ee");
        assertThat(envelope).startsWith("v1:");
        assertThat(pii.decrypt(envelope)).isEqualTo("mari@example.ee");
    }

    @Test
    void encryptionIsRandomizedPerCall() {
        // fresh 12-byte nonce every call — two envelopes of the same
        // plaintext must differ (deterministic encryption would leak
        // equality at rest)
        String a = pii.encrypt("+37250000001");
        String b = pii.encrypt("+37250000001");
        assertThat(a).isNotEqualTo(b);
        assertThat(pii.decrypt(a)).isEqualTo(pii.decrypt(b));
    }

    @Test
    void decryptFailsClosedOnPlaintextOrForeignVersion() {
        assertThatThrownBy(() -> pii.decrypt("mari@example.ee"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not a v1: envelope");
        assertThatThrownBy(() -> pii.decrypt("v2:" + pii.encrypt("x").substring(3)))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> pii.decrypt(null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aTamperedEnvelopeFailsTheGcmTag() {
        String envelope = pii.encrypt("mari@example.ee");
        // flip one base64url character in the middle of the payload — a
        // significant 6-bit position (the last char can encode padding
        // bits only, so it must not be used)
        char[] chars = envelope.toCharArray();
        int i = chars.length / 2;
        chars[i] = chars[i] == 'A' ? 'B' : 'A';
        String tampered = new String(chars);
        assertThatThrownBy(() -> pii.decrypt(tampered))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("decryption failed");
        // truncated envelope (nonce or less)
        assertThatThrownBy(() -> pii.decrypt("v1:AAAA"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void isEncryptedOnlyMatchesTheActiveSlot() {
        assertThat(pii.isEncrypted(pii.encrypt("x@example.ee"))).isTrue();
        assertThat(pii.isEncrypted("x@example.ee")).isFalse();
        assertThat(pii.isEncrypted(null)).isFalse();
    }

    @Test
    void unwrapForHashPassesPlaintextThroughAndDecryptsEnvelopes() {
        assertThat(pii.unwrapForHash("legacy@example.ee")).isEqualTo("legacy@example.ee");
        assertThat(pii.unwrapForHash(pii.encrypt("legacy@example.ee")))
                .isEqualTo("legacy@example.ee");
    }

    @Test
    void theBlindIndexIsDeterministicHex64() {
        String a = pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee");
        String b = pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee");
        assertThat(a).isEqualTo(b);
        assertThat(a).matches("[0-9a-f]{64}");
    }

    @Test
    void theBlindIndexIsDomainSeparated() {
        // identical byte string, different domain tag ⇒ different index
        String emailIndex = pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "1234567890");
        String phoneIndex = pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, "1234567890");
        assertThat(emailIndex).isNotEqualTo(phoneIndex);
    }

    @Test
    void theBlindIndexIsKeyed() {
        // a dump without the HMAC key cannot reproduce (or rainbow-table)
        // the index: a different key yields a different index
        PiiCrypto other = new PiiCrypto(new PiiKeys(AES_KEY, OTHER_HMAC_KEY));
        assertThat(pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee"))
                .isNotEqualTo(other.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "mari@example.ee"));
    }

    @Test
    void canonicalEmailIsTrimmedAndLowerCased() {
        assertThat(PiiCrypto.canonicalEmail("  Mari@Example.EE ")).isEqualTo("mari@example.ee");
    }

    @Test
    void missingKeyFailsClosedAtConstruction() {
        assertThatThrownBy(() -> new PiiKeys("", HMAC_KEY))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PII_AES_KEY");
        assertThatThrownBy(() -> new PiiKeys(AES_KEY, "   "))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PII_HMAC_KEY");
    }

    @Test
    void malformedOrWrongSizedKeyFailsClosed() {
        assertThatThrownBy(() -> new PiiKeys("!!!not-base64!!!", HMAC_KEY))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not valid base64");
        // 16 bytes instead of 32
        String shortKey = Base64.getEncoder().encodeToString(new byte[16]);
        assertThatThrownBy(() -> new PiiKeys(shortKey, HMAC_KEY))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("exactly 32 bytes");
    }

    private static String base64Key(int seed) {
        byte[] bytes = new byte[32];
        for (int i = 0; i < 32; i++) {
            bytes[i] = (byte) (seed * (i + 7));
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
}
