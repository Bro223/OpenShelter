package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for {@link RetentionRunEntity} — internal to the persistence layer. */
public interface SpringDataRetentionRunRepository extends JpaRepository<RetentionRunEntity, Long> {
}
