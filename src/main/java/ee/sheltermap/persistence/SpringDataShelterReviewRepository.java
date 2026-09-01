package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterReviewEntity} — internal to the persistence layer. */
public interface SpringDataShelterReviewRepository extends JpaRepository<ShelterReviewEntity, Long> {

    List<ShelterReviewEntity> findByShelterId(Long shelterId);

    Optional<ShelterReviewEntity> findByShelterIdAndUserId(Long shelterId, Long userId);

    /** One row per shelter id: [shelterId, avg(rating), count]. */
    @Query("select r.shelterId, avg(r.rating), count(r) from ShelterReviewEntity r " +
            "where r.shelterId in :ids group by r.shelterId")
    List<Object[]> findRatingAggregates(@Param("ids") Collection<Long> ids);
}
