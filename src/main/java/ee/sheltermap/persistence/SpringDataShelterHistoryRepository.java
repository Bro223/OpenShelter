package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Spring Data repository for {@link ShelterHistoryEntity} — internal to the persistence layer. */
public interface SpringDataShelterHistoryRepository extends JpaRepository<ShelterHistoryEntity, Long> {

    /**
     * A shelter's history in ASCENDING order (id asc = created_at asc for a
     * monotonic identity sequence; the stable-order discipline, B7a).
     * Dangling shelter_id rows (a deleted shelter) match too — that is the
     * point (D4: the delete's own row outlives the cascade).
     */
    List<ShelterHistoryEntity> findByShelterIdOrderByIdAsc(Long shelterId);
}
