package ee.sheltermap.persistence;

import ee.sheltermap.auth.PendingContactChange;
import ee.sheltermap.auth.PendingContactChangeRepository;
import ee.sheltermap.domain.ContactChangeType;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link PendingContactChangeRepository} (approach B —
 * plain domain class + separate entity, mirroring {@code PendingVerification}).
 */
@Repository
public class JpaPendingContactChangeRepository implements PendingContactChangeRepository {

    private final SpringDataPendingContactChangeRepository changes;

    public JpaPendingContactChangeRepository(SpringDataPendingContactChangeRepository changes) {
        this.changes = Objects.requireNonNull(changes, "changes");
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
                .map(JpaPendingContactChangeRepository::toDomain);
    }

    @Override
    @Transactional
    public int incrementAttempts(Long id, int maxAttempts) {
        // S2: the conditional UPDATE is the atomic increment — row count 0
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

    private static PendingContactChangeEntity toEntity(PendingContactChange change) {
        PendingContactChangeEntity entity = new PendingContactChangeEntity();
        entity.setId(change.getId());
        entity.setUserId(change.getUserId());
        entity.setType(change.getType());
        entity.setTarget(change.getTarget());
        entity.setCodeHash(change.getCodeHash());
        entity.setAttempts(change.getAttempts());
        entity.setExpiresAt(change.getExpiresAt());
        entity.setCreatedAt(change.getCreatedAt());
        return entity;
    }

    private static PendingContactChange toDomain(PendingContactChangeEntity entity) {
        PendingContactChange change = new PendingContactChange(
                entity.getUserId(), entity.getType(), entity.getTarget(),
                entity.getCodeHash(), entity.getExpiresAt(), entity.getCreatedAt());
        change.setId(entity.getId());
        for (int i = 0; i < entity.getAttempts(); i++) {
            change.registerFailedAttempt();
        }
        return change;
    }
}
