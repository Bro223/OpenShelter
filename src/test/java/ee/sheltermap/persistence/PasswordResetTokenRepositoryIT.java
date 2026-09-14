package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.PasswordResetToken;
import ee.sheltermap.auth.PasswordResetTokenRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The persistence behaviour of password reset codes, asserted through the
 * PRODUCTION paths only: reads go through {@code findActiveByUserId} and
 * the created-at queries, consumption through the confirm path's own
 * sequence — stamp {@code usedAt} on the domain token
 * ({@link PasswordResetToken#markUsed}) and {@code save} it, exactly what
 * {@code PasswordResetService.reset} does.
 */
@Transactional
class PasswordResetTokenRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    PasswordResetTokenRepository tokens;

    @Autowired
    UserRepository users;

    @Autowired
    EntityManager entityManager;

    @Test
    void savedRowIsTheUsersActiveToken() {
        Long userId = saveUser(users).getId();
        Instant now = Instant.now();

        PasswordResetToken token = new PasswordResetToken(
                userId, "reset-hash-1", now.plus(15, MINUTES));
        tokens.save(token);
        assertThat(token.getId()).isNotNull();

        PasswordResetToken loaded = tokens.findActiveByUserId(userId, now);
        assertThat(loaded).isNotNull();
        assertThat(loaded.getUserId()).isEqualTo(userId);
        assertThat(loaded.getTokenHash()).isEqualTo("reset-hash-1");
        assertThat(loaded.isUsed()).isFalse();
        assertThat(loaded.isExpired(now)).isFalse();
        assertThat(loaded.getAttempts()).isZero(); // attempts column defaults to 0
    }

    @Test
    void noPendingCodeMeansNoActiveToken() {
        Long userId = saveUser(users).getId();

        assertThat(tokens.findActiveByUserId(userId, Instant.now())).isNull();
    }

    @Test
    void attemptsColumnPersistsAcrossLoads() {
        Long userId = saveUser(users).getId();
        Instant now = Instant.now();
        PasswordResetToken token = new PasswordResetToken(
                userId, "reset-hash-1", now.plus(15, MINUTES));
        tokens.save(token);

        token.recordAttempt();
        token.recordAttempt();
        tokens.save(token);

        // a genuine reload: flush the pending write, then clear the
        // persistence context, so the row (attempts included) comes back
        // from the DB
        entityManager.flush();
        entityManager.clear();
        PasswordResetToken loaded = tokens.findActiveByUserId(userId, now);
        assertThat(loaded).isNotNull();
        assertThat(loaded.getAttempts()).isEqualTo(2);
    }

    @Test
    void usedTokenStopsBeingActiveButItsRowSurvives() {
        Long userId = saveUser(users).getId();
        Instant now = Instant.now();
        PasswordResetToken token = new PasswordResetToken(
                userId, "reset-hash-1", now.plus(15, MINUTES));
        tokens.save(token);

        // the confirm path: the stamp is set on the domain object, then saved
        token.markUsed(now);
        tokens.save(token);

        entityManager.flush();
        entityManager.clear();
        assertThat(tokens.findActiveByUserId(userId, now)).isNull();
        // the row stays as issued-code history (the per-day reissue cap
        // counts codes sent, used ones included), it is only no longer active
        assertThat(tokens.findLatestCreatedAtByUserId(userId)).isNotNull();
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
        usedA.markUsed(now);
        tokens.save(usedA);

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
        usedA.markUsed(now);
        tokens.save(usedA);

        // three issued rows for user A — the count the reissue cap sees
        // (the UTC day comes from the stored created_at, not the wall clock)
        LocalDate utcDay = tokens.findLatestCreatedAtByUserId(userA)
                .atZone(ZoneOffset.UTC).toLocalDate();
        assertThat(tokens.countCreatedOnUtcDayByUserId(userA, utcDay)).isEqualTo(3);

        tokens.deleteActiveByUserId(userA, now);

        assertThat(tokens.findActiveByUserId(userA, now)).isNull();
        // used/expired rows may stay (harmless — expiry/used are enforced at confirm)
        assertThat(tokens.countCreatedOnUtcDayByUserId(userA, utcDay)).isEqualTo(2);
        // other users are untouched
        assertThat(tokens.findActiveByUserId(userB, now)).isNotNull();
    }
}
