package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link MediaAssetEntity} — internal to the persistence layer. */
public interface SpringDataMediaAssetRepository extends JpaRepository<MediaAssetEntity, Long> {

    /** The stored filename (32 hex + extension) is unique (the V23 constraint). */
    Optional<MediaAssetEntity> findByFilename(String filename);

    /** The library listing: newest first (D7); the id tie-break is the stable-order discipline. */
    List<MediaAssetEntity> findAllByOrderByCreatedAtDescIdDesc();

    /**
     * A page of the library listing (W2-A): the SAME newest-first order,
     * exact OFFSET/LIMIT (Hibernate 6 JPQL), no hidden count query.
     */
    @Query("select a from MediaAssetEntity a order by a.createdAt desc, a.id desc "
            + "offset :offset fetch first :limit rows only")
    List<MediaAssetEntity> findPage(@Param("offset") long offset, @Param("limit") int limit);
}
