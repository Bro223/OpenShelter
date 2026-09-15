package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link MediaAssetEntity} — internal to the persistence layer. */
public interface SpringDataMediaAssetRepository extends JpaRepository<MediaAssetEntity, Long> {

    /** The stored filename (32 hex + extension) is unique (the V23 constraint). */
    Optional<MediaAssetEntity> findByFilename(String filename);

    /** The library listing: newest first (D7); the id tie-break is the stable-order discipline. */
    List<MediaAssetEntity> findAllByOrderByCreatedAtDescIdDesc();
}
