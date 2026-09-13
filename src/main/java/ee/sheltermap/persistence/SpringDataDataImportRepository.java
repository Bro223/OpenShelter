package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Spring Data repository for {@code data_imports} (V15, M5). The id
 * tie-break keeps same-timestamp runs deterministic (the stable-order
 * discipline, B7a).
 */
public interface SpringDataDataImportRepository extends JpaRepository<DataImportEntity, Long> {

    Optional<DataImportEntity> findTopBySourceNameOrderByImportedAtDescIdDesc(String sourceName);

    Optional<DataImportEntity> findTopByOrderByImportedAtDescIdDesc();
}
