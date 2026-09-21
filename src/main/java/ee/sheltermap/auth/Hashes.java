package ee.sheltermap.auth;

import ee.sheltermap.verification.CodeHashes;

/**
 * SHA-256 helpers for tokens-at-rest (refresh/reset tokens are stored
 * hashed). Thin delegate: the implementations live ONCE in
 * {@link CodeHashes} (verification sits below auth in the dependency
 * rule, so the authority is there and every package funnels to it).
 */
final class Hashes {

    private Hashes() {
    }

    static String sha256Hex(String raw) {
        return CodeHashes.sha256Hex(raw);
    }

    /** Constant-time string compare — see {@link CodeHashes#constantTimeEquals}. */
    static boolean constantTimeEquals(String a, String b) {
        return CodeHashes.constantTimeEquals(a, b);
    }
}
