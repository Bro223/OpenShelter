package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

/**
 * Spring Data repository for {@code data_imports} (V15). The id
 * tie-break keeps same-timestamp runs deterministic (the stable-order
 * discipline).
 */
public interface SpringDataDataImportRepository extends JpaRepository<DataImportEntity, Long> {

    Optional<DataImportEntity> findTopBySourceNameOrderByImportedAtDescIdDesc(String sourceName);

    Optional<DataImportEntity> findTopByOrderByImportedAtDescIdDesc();

    /** Newest verifying run of one source ("last verified" — OK / NOT_MODIFIED). */
    Optional<DataImportEntity> findTopBySourceNameAndStatusInOrderByImportedAtDescIdDesc(
            String sourceName, Collection<String> statuses);
}
