package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterReviewEntity} — internal to the persistence layer. */
public interface SpringDataShelterReviewRepository extends JpaRepository<ShelterReviewEntity, Long> {

    List<ShelterReviewEntity> findByShelterId(Long shelterId);

    Optional<ShelterReviewEntity> findByShelterIdAndUserId(Long shelterId, Long userId);
}
