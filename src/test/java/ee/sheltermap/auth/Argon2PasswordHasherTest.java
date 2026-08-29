package ee.sheltermap.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class Argon2PasswordHasherTest {

    private final Argon2PasswordHasher hasher = new Argon2PasswordHasher(Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());

    @Test
    void hashDiffersFromPlaintext() {
        assertThat(hasher.hash("s3cret")).isNotEqualTo("s3cret");
    }

    @Test
    void verifyAcceptsCorrectPlaintext() {
        String hash = hasher.hash("s3cret");
        assertThat(hasher.verify("s3cret", hash)).isTrue();
    }

    @Test
    void verifyRejectsWrongPlaintext() {
        String hash = hasher.hash("s3cret");
        assertThat(hasher.verify("nope", hash)).isFalse();
    }

    @Test
    void hashesAreSaltedSoTwoHashesDiffer() {
        assertThat(hasher.hash("s3cret")).isNotEqualTo(hasher.hash("s3cret"));
    }

    @Test
    void verifyIsNullSafe() {
        assertThat(hasher.verify(null, "x")).isFalse();
        assertThat(hasher.verify("x", null)).isFalse();
    }
}
