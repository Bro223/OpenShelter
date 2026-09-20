package ee.sheltermap.verification;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The reachable 500 on {@code POST /verify/confirm}: a double send
 * (concurrent {@code /verify/request} submissions; the cooldown log is only
 * written AFTER the channel accepts, so a burst can interleave) leaves TWO
 * unexpired rows in {@code pending_verifications} — the table has a
 * NON-unique index on (user_id, level), so the DB allows it. The confirm
 * path then reads the pair through a single-row {@code Optional} and throws
 * {@code IncorrectResultSizeDataAccessException} — no handler maps it, so
 * the user's only recovery is a fresh code for a 500.
 *
 * <p>The fix degrades the duplicate (the {@code findFirst} idiom
 * {@code PasswordResetService} already uses): the newest code — the one the
 * user last received — wins, and confirm succeeds. These two tests are the
 * regression: they FAIL with {@code IncorrectResultSizeDataAccessException}
 * while the read is a plain single-row {@code Optional}.
 *
 * <p>Deliberately NOT {@code @Transactional}: the fixture rows are plain
 * committed rows (the duplicate is exactly the state a racy double send
 * commits), and {@link #cleanUpCommittedRaceRows()} wipes the shared
 * container afterwards.
 */
class PendingVerificationDuplicateIT extends AbstractPersistenceIT {

    @Autowired
    UserRepository users;

    @Autowired
    PendingVerificationRepository pending;

    @Autowired
    VerificationService verificationService;

    @AfterEach
    void cleanUpCommittedRaceRows() {
        wipeAllTables();
    }

    @Test
    void twoActiveRowsForOneUserAndLevelReadAsOneInsteadOf500() {
        RegisteredUser user = saveUser(users, "dup-read@example.ee", "+37250006661");
        Instant now = Instant.now();
        savePending(user.getId(), "111111", now.plusSeconds(300));
        savePending(user.getId(), "222222", now.plusSeconds(310));

        // The /verify/confirm read. Before the fix this threw
        // IncorrectResultSizeDataAccessException (a 500 — the documented
        // contract for a bad code is a generic false/400).
        PendingVerification active = pending.findActiveByUserAndLevel(
                user.getId(), VerificationLevel.PHONE, now).orElseThrow();

        // The newest code is the one the user last received — it wins.
        assertThat(active.getCodeHash()).isEqualTo(PendingVerification.sha256("222222"));
    }

    @Test
    void confirmSucceedsWithTheNewestCodeWhenDuplicatesCoexist() {
        RegisteredUser user = saveUser(users, "dup-confirm@example.ee", "+37250006662");
        Instant now = Instant.now();
        savePending(user.getId(), "111111", now.plusSeconds(300));
        savePending(user.getId(), "222222", now.plusSeconds(310));

        // Before the fix: IncorrectResultSizeDataAccessException on the
        // pending read (the 500). After: the newest code verifies, the
        // level is claimed on the user, the used row is consumed.
        boolean ok = verificationService.confirmVerification(
                user, VerificationLevel.PHONE, "222222");

        assertThat(ok).isTrue();
        assertThat(user.levels()).contains(VerificationLevel.PHONE);
    }

    private void savePending(long userId, String code, Instant expiresAt) {
        pending.save(new PendingVerification(userId, VerificationLevel.PHONE,
                "+37250006661", PendingVerification.sha256(code), expiresAt));
    }
}
