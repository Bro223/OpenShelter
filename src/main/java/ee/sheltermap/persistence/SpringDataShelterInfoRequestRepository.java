package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterInfoRequestEntity} — internal to the persistence layer. */
public interface SpringDataShelterInfoRequestRepository extends JpaRepository<ShelterInfoRequestEntity, Long> {

    /** The shelter's single request row (the UNIQUE bound), if any. */
    Optional<ShelterInfoRequestEntity> findByShelterId(Long shelterId);

    /** The request rows for a batch of shelters in ONE lookup (no N+1). */
    List<ShelterInfoRequestEntity> findByShelterIdIn(Collection<Long> shelterIds);
}
