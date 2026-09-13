package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for {@link ModerationActionEntity} — internal to the persistence layer. */
public interface SpringDataModerationActionRepository extends JpaRepository<ModerationActionEntity, Long> {
}
