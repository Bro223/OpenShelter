package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.RefreshTokenRecord;
import ee.sheltermap.auth.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static java.time.temporal.ChronoUnit.DAYS;
import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class RefreshTokenRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    RefreshTokenRepository tokens;

    @Autowired
    UserRepository users;

    private Long newUserId() {
        return saveUser(users).getId();
    }

    private Long newUserId(String email, String phone) {
        return saveUser(users, email, phone).getId();
    }

    @Test
    void saveAndFindByTokenHash() {
        Long userId = newUserId();
        Instant expiresAt = Instant.now().plus(30, DAYS);

        tokens.save("hash-1", userId, expiresAt);

        RefreshTokenRecord record = tokens.findByTokenHash("hash-1");
        assertThat(record).isNotNull();
        assertThat(record.userId()).isEqualTo(userId);
        assertThat(record.tokenHash()).isEqualTo("hash-1");
        assertThat(record.expiresAt()).isEqualTo(expiresAt);
        assertThat(record.revokedAt()).isNull();
    }

    @Test
    void revokeMarksTokenRevoked() {
        Long userId = newUserId();
        tokens.save("hash-1", userId, Instant.now().plus(30, DAYS));

        tokens.revoke("hash-1");

        assertThat(tokens.findByTokenHash("hash-1").revokedAt()).isNotNull();
    }

    @Test
    void revokeAllForUserRevokesOnlyThatUsersTokens() {
        Long userA = newUserId();
        Long userB = newUserId("teet@example.ee", "+37250000002");
        tokens.save("hash-a1", userA, Instant.now().plus(30, DAYS));
        tokens.save("hash-a2", userA, Instant.now().plus(30, DAYS));
        tokens.save("hash-b1", userB, Instant.now().plus(30, DAYS));

        tokens.revokeAllForUser(userA);

        assertThat(tokens.findByTokenHash("hash-a1").revokedAt()).isNotNull();
        assertThat(tokens.findByTokenHash("hash-a2").revokedAt()).isNotNull();
        assertThat(tokens.findByTokenHash("hash-b1").revokedAt()).isNull();
    }

    @Test
    void unknownHashReturnsNull() {
        assertThat(tokens.findByTokenHash("nope")).isNull();
    }
}
