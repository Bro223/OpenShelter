package ee.sheltermap.auth;

/** Cryptographically-random token generation (refresh tokens, reset tokens). */
final class Tokens {

    private static final char[] ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toCharArray();

    private Tokens() {
    }

    static String random(int length) {
        // One shared generator for all auth code/token draws.
        return Codes.randomToken(length, new String(ALPHABET));
    }
}
