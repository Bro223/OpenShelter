package ee.sheltermap.persistence;

import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.MediaAssetRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * JPA implementation of {@link MediaAssetRepository} (approach B).
 * Uniqueness of the stored filename is enforced by the database
 * constraint {@code uq_media_assets_filename} (the generated name makes
 * a collision a storage bug, not a client outcome).
 *
 * <p>Assets are immutable once stored: the update path of {@link #save}
 * only re-persists the same values (idempotent save).
 */
@Repository
public class JpaMediaAssetRepository implements MediaAssetRepository {

    private final SpringDataMediaAssetRepository assets;
    private final SpringDataGuidancePostRepository posts;

    public JpaMediaAssetRepository(SpringDataMediaAssetRepository assets,
                                   SpringDataGuidancePostRepository posts) {
        this.assets = Objects.requireNonNull(assets, "assets");
        this.posts = Objects.requireNonNull(posts, "posts");
    }

    @Override
    @Transactional
    public MediaAsset save(MediaAsset asset) {
        MediaAssetEntity entity;
        if (asset.getId() != null) {
            // Assets are immutable; the update path only re-persists the
            // same values against the managed row (no fresh-entity merge
            // against the primary key).
            entity = assets.findById(asset.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save media asset with unknown id " + asset.getId()));
        } else {
            entity = new MediaAssetEntity();
        }
        MediaAssetMapper.toEntity(entity, asset);
        assets.save(entity);
        asset.setId(entity.getId());
        return asset;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MediaAsset> findById(long id) {
        return assets.findById(id).map(MediaAssetMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MediaAsset> findByStoredFilename(String storedFilename) {
        return assets.findByFilename(storedFilename).map(MediaAssetMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MediaAsset> findAll() {
        return assets.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(MediaAssetMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, Long> referencedCountsByAssetId() {
        // ONE batched group-by over guidance_posts (no N+1): the library
        // listing and the in-use check read the same counts; assets no
        // post references are absent from the result (count 0).
        return posts.countsByHeroImageId().stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()));
    }

    @Override
    @Transactional
    public void delete(MediaAsset asset) {
        assets.deleteById(asset.getId());
        // Force the SQL DELETE (and its ON DELETE SET NULL onto
        // guidance_posts.hero_image_id) to run NOW, not at an arbitrary
        // later auto-flush: a follow-up read of the posts in the same
        // transaction must already see the reference cleared (D8).
        assets.flush();
    }
}
