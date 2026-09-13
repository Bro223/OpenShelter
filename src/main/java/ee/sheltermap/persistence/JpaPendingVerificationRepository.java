package ee.sheltermap.persistence;

import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.verification.PendingVerification;
import ee.sheltermap.verification.PendingVerificationRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link PendingVerificationRepository} (approach B).
 * "Active" = not expired; consumed codes are deleted on confirmation.
 * PII-at-rest (M2): the channel {@code contact} is stored encrypted — the
 * domain object keeps the plain value.
 */
@Repository
public class JpaPendingVerificationRepository implements PendingVerificationRepository {

    private final SpringDataPendingVerificationRepository pendings;
    private final PiiCrypto piiCrypto;

    public JpaPendingVerificationRepository(SpringDataPendingVerificationRepository pendings,
                                             PiiCrypto piiCrypto) {
        this.pendings = Objects.requireNonNull(pendings, "pendings");
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
    }

    @Override
    @Transactional
    public void save(PendingVerification pending) {
        PendingVerificationEntity entity = toEntity(pending);
        PendingVerificationEntity saved = pendings.save(entity);
        pending.setId(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PendingVerification> findActiveByUserAndLevel(Long userId, VerificationLevel level,
                                                                  Instant now) {
        return pendings.findByUserIdAndLevelAndExpiresAtGreaterThan(userId, level, now)
                .map(this::toDomain);
    }

    @Override
    @Transactional
    public void delete(PendingVerification pending) {
        if (pending.getId() != null) {
            pendings.deleteById(pending.getId());
        }
    }

    private PendingVerificationEntity toEntity(PendingVerification pending) {
        PendingVerificationEntity entity = new PendingVerificationEntity();
        entity.setId(pending.getId());
        entity.setUserId(pending.getUserId());
        entity.setLevel(pending.getLevel());
        entity.setContact(piiCrypto.encrypt(pending.getContact()));
        entity.setCodeHash(pending.getCodeHash());
        entity.setAttempts(pending.getAttempts());
        entity.setExpiresAt(pending.getExpiresAt());
        return entity;
    }

    private PendingVerification toDomain(PendingVerificationEntity entity) {
        PendingVerification pending = new PendingVerification(
                entity.getUserId(), entity.getLevel(), piiCrypto.decrypt(entity.getContact()),
                entity.getCodeHash(), entity.getExpiresAt());
        pending.setId(entity.getId());
        for (int i = 0; i < entity.getAttempts(); i++) {
            pending.recordAttempt();
        }
        return pending;
    }
}
