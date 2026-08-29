package ee.sheltermap.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * {@link PasswordHasher} backed by Spring Security's {@code Argon2PasswordEncoder}
 * (Argon2id — salt embedded in the hash string, no salt column).
 */
@Service
public class Argon2PasswordHasher implements PasswordHasher {

    private final PasswordEncoder encoder;

    public Argon2PasswordHasher(PasswordEncoder encoder) {
        this.encoder = Objects.requireNonNull(encoder, "encoder");
    }

    @Override
    public String hash(String plain) {
        return encoder.encode(Objects.requireNonNull(plain, "plain"));
    }

    @Override
    public boolean verify(String plain, String hash) {
        if (plain == null || hash == null) {
            return false;
        }
        return encoder.matches(plain, hash);
    }
}
