package ee.sheltermap.persistence;

import ee.sheltermap.domain.MediaAsset;

/**
 * Maps between the domain {@link MediaAsset} and
 * {@link MediaAssetEntity} (approach B: the domain stays pure Java,
 * all persistence concerns live in this package).
 *
 * <p>Deliberately does NOT touch {@code id} (managed by the primary
 * key). Restored rows round-trip through
 * {@link MediaAsset#create(String, String, String, int, int, long, Long, java.time.Instant)}
 * — the V23 CHECKs guarantee the stored values satisfy its bounds.
 */
final class MediaAssetMapper {

    private MediaAssetMapper() {
    }

    /** Copies every domain field onto the entity (insert or re-persist). */
    static void toEntity(MediaAssetEntity entity, MediaAsset asset) {
        entity.setFilename(asset.getStoredFilename());
        entity.setOriginalFilename(asset.getOriginalFilename());
        entity.setContentType(asset.getContentType());
        entity.setWidth(asset.getWidth());
        entity.setHeight(asset.getHeight());
        entity.setSizeBytes(asset.getSizeBytes());
        entity.setUploadedBy(asset.getUploadedBy());
        entity.setCreatedAt(asset.getCreatedAt());
    }

    /** Restores a stored row (assets are immutable — nothing to re-derive). */
    static MediaAsset toDomain(MediaAssetEntity entity) {
        MediaAsset asset = MediaAsset.create(
                entity.getFilename(), entity.getOriginalFilename(), entity.getContentType(),
                entity.getWidth(), entity.getHeight(), entity.getSizeBytes(),
                entity.getUploadedBy(), entity.getCreatedAt());
        asset.setId(entity.getId());
        return asset;
    }
}
