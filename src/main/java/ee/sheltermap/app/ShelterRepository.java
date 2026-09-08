package ee.sheltermap.app;

import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link Shelter}. Real implementation in
 * {@code ee.sheltermap.persistence} (Step 3); tests use an in-memory fake.
 */
public interface ShelterRepository {

    void save(Shelter shelter);

    Optional<Shelter> findByExternalId(String externalId);

    /** Reads one shelter by id (contract from 05-shelter-api.puml). */
    Optional<Shelter> findById(Long id);

    void saveAll(List<Shelter> shelters);

    /** Deletes rows of {@code source} whose externalId is NOT in the keep-list; returns count. */
    int deleteBySourceAndExternalIdNotIn(ShelterSource source, List<String> externalIds);

    List<Shelter> findAll();

    List<Shelter> findAllBySourceIn(List<ShelterSource> sources);

    /** All shelters created by {@code userId} — the author-scoped "my shelters" query (V7). */
    List<Shelter> findByCreatedBy(Long userId);

    /** Batched read by id (one query — name resolution without N+1). */
    List<Shelter> findByIds(Collection<Long> ids);

    /** Deletes the row with {@code id} (a no-op when absent); reviews cascade via the DB. */
    void deleteById(Long id);
}
