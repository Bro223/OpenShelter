package ee.sheltermap.auth;

/** Deterministic stand-in for {@link PasswordHasher} — keeps unit tests fast. */
public class StubPasswordHasher implements PasswordHasher {

    @Override
    public String hash(String plain) {
        return "h(" + plain + ")";
    }

    @Override
    public boolean verify(String plain, String hash) {
        return hash != null && hash.equals(hash(plain));
    }
}
