package ee.sheltermap.persistence;

import ee.sheltermap.domain.ShelterSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterEntity} — internal to the persistence layer. */
public interface SpringDataShelterRepository extends JpaRepository<ShelterEntity, Long> {

    Optional<ShelterEntity> findByExternalId(String externalId);

    /** Stable order between requests (B7a): id-ascending, no arbitrary heap order. */
    List<ShelterEntity> findAllBySourceInOrderByIdAsc(Collection<ShelterSource> sources);

    /** Stable order between requests (B7a): id-ascending, no arbitrary heap order. */
    List<ShelterEntity> findByCreatedByOrderByIdAsc(Long createdBy);

    List<ShelterEntity> findByIdIn(Collection<Long> ids);

    /**
     * Bulk-deletes rows of {@code source} whose {@code externalId} is NOT in
     * the keep-list. Rows with NULL {@code externalId} never match (SQL NULL
     * semantics), so USER submissions are safe by construction.
     */
    @Modifying
    @Query("delete from ShelterEntity s where s.source = :source and s.externalId not in :externalIds")
    int deleteBySourceAndExternalIdNotIn(@Param("source") ShelterSource source,
                                         @Param("externalIds") Collection<String> externalIds);
}
