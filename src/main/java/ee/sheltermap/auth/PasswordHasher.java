package ee.sheltermap.auth;

/**
 * Password hashing seam (03-auth.puml). Implementations must never store or
 * log plaintext passwords. {@code verify} must be safe against {@code null}
 * inputs (returns {@code false}).
 */
public interface PasswordHasher {

    String hash(String plain);

    boolean verify(String plain, String hash);
}
