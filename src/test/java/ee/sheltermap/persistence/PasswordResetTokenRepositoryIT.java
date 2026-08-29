package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.PasswordResetToken;
import ee.sheltermap.auth.PasswordResetTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class PasswordResetTokenRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    PasswordResetTokenRepository tokens;

    @Autowired
    UserRepository users;

    @Test
    void saveAndFindRoundTrip() {
        Long userId = saveUser(users).getId();

        PasswordResetToken token = new PasswordResetToken(
                userId, "reset-hash-1", Instant.now().plus(15, MINUTES));
        tokens.save(token);
        assertThat(token.getId()).isNotNull();

        PasswordResetToken loaded = tokens.findByTokenHash("reset-hash-1");
        assertThat(loaded).isNotNull();
        assertThat(loaded.getUserId()).isEqualTo(userId);
        assertThat(loaded.getTokenHash()).isEqualTo("reset-hash-1");
        assertThat(loaded.isUsed()).isFalse();
        assertThat(loaded.isExpired(Instant.now())).isFalse();
    }

    @Test
    void markUsedSetsUsedAt() {
        Long userId = saveUser(users).getId();
        PasswordResetToken token = new PasswordResetToken(
                userId, "reset-hash-1", Instant.now().plus(15, MINUTES));
        tokens.save(token);

        tokens.markUsed(token.getId());

        PasswordResetToken loaded = tokens.findByTokenHash("reset-hash-1");
        assertThat(loaded.isUsed()).isTrue();
    }

    @Test
    void unknownHashReturnsNull() {
        assertThat(tokens.findByTokenHash("nope")).isNull();
    }
}
