package ee.sheltermap.persistence;

import ee.sheltermap.auth.PendingContactChange;
import ee.sheltermap.auth.PendingContactChangeRepository;
import ee.sheltermap.domain.ContactChangeType;
import ee.sheltermap.security.PiiCrypto;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link PendingContactChangeRepository} (approach B —
 * plain domain class + separate entity, mirroring {@code PendingVerification}).
 * PII-at-rest: the target contact is stored encrypted — the domain
 * object keeps the plain value.
 */
@Repository
public class JpaPendingContactChangeRepository implements PendingContactChangeRepository {

    private final SpringDataPendingContactChangeRepository changes;
    private final PiiCrypto piiCrypto;

    public JpaPendingContactChangeRepository(SpringDataPendingContactChangeRepository changes,
                                             PiiCrypto piiCrypto) {
        this.changes = Objects.requireNonNull(changes, "changes");
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
    }

    @Override
    @Transactional
    public PendingContactChange save(PendingContactChange change) {
        PendingContactChangeEntity saved = changes.save(toEntity(change));
        change.setId(saved.getId());
        return change;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PendingContactChange> findByUserIdAndType(Long userId, ContactChangeType type) {
        return changes.findByUserIdAndType(userId, type)
                .map(this::toDomain);
    }

    @Override
    @Transactional
    public int incrementAttempts(Long id, int maxAttempts) {
        // The conditional UPDATE is the atomic increment — row count 0
        // means "already at the cap" (another confirm won the race) or the
        // row is gone.
        return changes.incrementAttempts(id, maxAttempts);
    }

    @Override
    @Transactional
    public void delete(PendingContactChange change) {
        if (change.getId() != null) {
            changes.deleteById(change.getId());
        }
    }

    private PendingContactChangeEntity toEntity(PendingContactChange change) {
        PendingContactChangeEntity entity = new PendingContactChangeEntity();
        entity.setId(change.getId());
        entity.setUserId(change.getUserId());
        entity.setType(change.getType());
        entity.setTarget(piiCrypto.encrypt(change.getTarget()));
        entity.setCodeHash(change.getCodeHash());
        entity.setAttempts(change.getAttempts());
        entity.setExpiresAt(change.getExpiresAt());
        entity.setCreatedAt(change.getCreatedAt());
        return entity;
    }

    private PendingContactChange toDomain(PendingContactChangeEntity entity) {
        PendingContactChange change = new PendingContactChange(
                entity.getUserId(), entity.getType(), piiCrypto.decrypt(entity.getTarget()),
                entity.getCodeHash(), entity.getExpiresAt(), entity.getCreatedAt());
        change.setId(entity.getId());
        for (int i = 0; i < entity.getAttempts(); i++) {
            change.registerFailedAttempt();
        }
        return change;
    }
}
