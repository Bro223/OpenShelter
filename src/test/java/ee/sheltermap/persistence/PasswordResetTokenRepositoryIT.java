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
        assertThat(loaded.getAttempts()).isZero(); // attempts column defaults to 0
    }

    @Test
    void attemptsColumnPersistsAcrossLoads() {
        Long userId = saveUser(users).getId();
        PasswordResetToken token = new PasswordResetToken(
                userId, "reset-hash-1", Instant.now().plus(15, MINUTES));
        tokens.save(token);

        token.recordAttempt();
        token.recordAttempt();
        tokens.save(token);

        PasswordResetToken loaded = tokens.findByTokenHash("reset-hash-1");
        assertThat(loaded.getAttempts()).isEqualTo(2);
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

    @Test
    void findActiveByUserIdReturnsOnlyTheUnusedUnexpiredRow() {
        Long userA = saveUser(users, "a@example.ee", "+37250000010").getId();
        Long userB = saveUser(users, "b@example.ee", "+37250000011").getId();
        Instant now = Instant.now();

        PasswordResetToken activeA = new PasswordResetToken(
                userA, "hash-a-active", now.plus(15, MINUTES));
        PasswordResetToken expiredA = new PasswordResetToken(
                userA, "hash-a-expired", now.minus(1, MINUTES));
        PasswordResetToken usedA = new PasswordResetToken(
                userA, "hash-a-used", now.plus(15, MINUTES));
        PasswordResetToken activeB = new PasswordResetToken(
                userB, "hash-b-active", now.plus(15, MINUTES));
        for (PasswordResetToken t : new PasswordResetToken[]{activeA, expiredA, usedA, activeB}) {
            tokens.save(t);
        }
        tokens.markUsed(usedA.getId());

        PasswordResetToken activeOfA = tokens.findActiveByUserId(userA, now);
        assertThat(activeOfA).isNotNull();
        assertThat(activeOfA.getTokenHash()).isEqualTo("hash-a-active");
        assertThat(tokens.findActiveByUserId(userB, now).getTokenHash()).isEqualTo("hash-b-active");
    }

    @Test
    void deleteActiveByUserIdRemovesOnlyTheActiveRowOfThatUser() {
        Long userA = saveUser(users, "a@example.ee", "+37250000010").getId();
        Long userB = saveUser(users, "b@example.ee", "+37250000011").getId();
        Instant now = Instant.now();

        PasswordResetToken activeA = new PasswordResetToken(
                userA, "hash-a-active", now.plus(15, MINUTES));
        PasswordResetToken expiredA = new PasswordResetToken(
                userA, "hash-a-expired", now.minus(1, MINUTES));
        PasswordResetToken usedA = new PasswordResetToken(
                userA, "hash-a-used", now.plus(15, MINUTES));
        PasswordResetToken activeB = new PasswordResetToken(
                userB, "hash-b-active", now.plus(15, MINUTES));
        for (PasswordResetToken t : new PasswordResetToken[]{activeA, expiredA, usedA, activeB}) {
            tokens.save(t);
        }
        tokens.markUsed(usedA.getId());

        tokens.deleteActiveByUserId(userA, now);

        assertThat(tokens.findActiveByUserId(userA, now)).isNull();
        // used/expired rows may stay (harmless — expiry/used are enforced at confirm)
        assertThat(tokens.findByTokenHash("hash-a-used")).isNotNull();
        assertThat(tokens.findByTokenHash("hash-a-expired")).isNotNull();
        // other users are untouched
        assertThat(tokens.findActiveByUserId(userB, now)).isNotNull();
    }
}
