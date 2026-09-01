package ee.sheltermap.persistence;

import ee.sheltermap.domain.ContactChangeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Spring Data repository for {@link PendingContactChangeEntity} — internal to the persistence layer. */
public interface SpringDataPendingContactChangeRepository extends JpaRepository<PendingContactChangeEntity, Long> {

    Optional<PendingContactChangeEntity> findByUserIdAndType(Long userId, ContactChangeType type);
}
