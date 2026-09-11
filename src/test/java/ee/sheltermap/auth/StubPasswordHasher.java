package ee.sheltermap.auth;

/**
 * Deterministic stand-in for {@link PasswordHasher} — keeps unit tests
 * fast. Mirrors the real Argon2 hasher on the one path the login timing
 * equalizer depends on: the literal password {@code "dummy"} verifies
 * against {@link AuthService#DUMMY_PASSWORD_HASH} (S1, 2026-09-11 review) —
 * the dummy constant is a real Argon2 hash of "dummy" (pinned by
 * {@code Argon2PasswordHasherTest}), so a stub that forgot this case would
 * exercise a different unknown-contact code path than production.
 */
public class StubPasswordHasher implements PasswordHasher {

    @Override
    public String hash(String plain) {
        return "h(" + plain + ")";
    }

    @Override
    public boolean verify(String plain, String hash) {
        if (plain == null || hash == null) {
            return false;
        }
        if (AuthService.DUMMY_PASSWORD_HASH.equals(hash)) {
            return "dummy".equals(plain);
        }
        return hash.equals(hash(plain));
    }
}
