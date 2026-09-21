package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.verification.CodeHashes;
import ee.sheltermap.verification.PendingVerification;
import ee.sheltermap.verification.PendingVerificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class PendingVerificationRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    PendingVerificationRepository pendings;

    @Autowired
    UserRepository users;

    @Test
    void saveAndFindActiveRoundTrip() {
        Long userId = saveUser(users).getId();
        String hash = CodeHashes.sha256Hex("123456");

        PendingVerification pending = new PendingVerification(
                userId, VerificationLevel.PHONE, "+37250000001", hash, Instant.now().plus(5, MINUTES));
        pendings.save(pending);
        assertThat(pending.getId()).isNotNull();

        PendingVerification loaded = pendings.findActiveByUserAndLevel(userId, VerificationLevel.PHONE, Instant.now())
                .orElseThrow();
        assertThat(loaded.getUserId()).isEqualTo(userId);
        assertThat(loaded.getLevel()).isEqualTo(VerificationLevel.PHONE);
        assertThat(loaded.getContact()).isEqualTo("+37250000001");
        assertThat(loaded.getCodeHash()).isEqualTo(hash);
        assertThat(loaded.isExpired(Instant.now())).isFalse();

        // wrong level -> not found
        assertThat(pendings.findActiveByUserAndLevel(userId, VerificationLevel.EMAIL, Instant.now())).isEmpty();
    }

    @Test
    void expiredPendingIsNotActive() {
        Long userId = saveUser(users).getId();

        PendingVerification pending = new PendingVerification(
                userId, VerificationLevel.PHONE, "+37250000001",
                CodeHashes.sha256Hex("123456"), Instant.now().minus(1, MINUTES));
        pendings.save(pending);

        assertThat(pendings.findActiveByUserAndLevel(userId, VerificationLevel.PHONE, Instant.now())).isEmpty();
    }

    @Test
    void deleteRemovesPending() {
        Long userId = saveUser(users).getId();
        PendingVerification pending = new PendingVerification(
                userId, VerificationLevel.PHONE, "+37250000001",
                CodeHashes.sha256Hex("123456"), Instant.now().plus(5, MINUTES));
        pendings.save(pending);

        pendings.delete(pending);

        assertThat(pendings.findActiveByUserAndLevel(userId, VerificationLevel.PHONE, Instant.now())).isEmpty();
    }
}
