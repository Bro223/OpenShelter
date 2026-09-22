package ee.sheltermap.testutil;

import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.security.PiiKeys;

import java.util.Base64;

/**
 * A fixed-key {@link PiiCrypto} for unit tests. The keys are deterministic
 * (seeded), not random: tests that assert the exact at-rest form of a keyed
 * code hash or a PII envelope need the SAME {@link PiiCrypto} instance to
 * recompute it, and a seeded key keeps that reproducible across runs and
 * across test classes without leaking a real key. Shared by every unit test
 * that constructs a code-issuing service or provider directly, so the
 * "how do I build a test PiiCrypto" knowledge lives in one place.
 */
public final class TestPiiCrypto {

    private TestPiiCrypto() {
    }

    /**
     * A valid (32-byte AES, 32-byte HMAC) fixed-key {@link PiiCrypto}.
     * Distinct from the keys in {@code PiiCryptoTest} so a cross-test
     * collision is impossible; the exact values are irrelevant to any
     * assertion (tests recompute through the same instance).
     */
    public static PiiCrypto newTest() {
        return new PiiCrypto(new PiiKeys(base64Key(0xA1), base64Key(0xB2)));
    }

    private static String base64Key(int seed) {
        byte[] bytes = new byte[32];
        for (int i = 0; i < 32; i++) {
            bytes[i] = (byte) (seed * (i + 7));
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
}
