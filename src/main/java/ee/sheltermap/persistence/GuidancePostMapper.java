package ee.sheltermap.persistence;

import ee.sheltermap.domain.GuidancePost;

/**
 * Maps between the domain {@link GuidancePost} and
 * {@link GuidancePostEntity} (approach B: the domain stays pure Java,
 * all persistence concerns live in this package).
 *
 * <p>Deliberately does NOT touch {@code id} or {@code updated_at}: the
 * id is managed by the primary key, and the update-path stamp is owned
 * by {@link JpaGuidancePostRepository} — one writer for every write
 * ({@code updated_at} moves on every write).
 */
final class GuidancePostMapper {

    private GuidancePostMapper() {
    }

    /** Copies every writable domain field onto the entity (insert or update). */
    static void toEntity(GuidancePostEntity entity, GuidancePost post) {
        entity.setSlug(post.getSlug());
        entity.setTitle(post.getTitle());
        entity.setBodyHtml(post.getBodyHtml());
        entity.setLocale(post.getLocale());
        entity.setStatus(post.getStatus());
        entity.setPinned(post.isPinned());
        entity.setHeroImageId(post.getHeroImageId());
        entity.setHeroImageAlt(post.getHeroImageAlt());
        entity.setHeroImportUrl(post.getHeroImportUrl());
        entity.setSortOrder(post.getSortOrder());
        entity.setPublishedAt(post.getPublishedAt());
        entity.setCreatedBy(post.getCreatedBy());
        entity.setCreatedAt(post.getCreatedAt());
    }

    /** Restores a stored row (the V23 CHECKs guarantee the stored invariants). */
    static GuidancePost toDomain(GuidancePostEntity entity) {
        return GuidancePost.restored(
                entity.getId(), entity.getSlug(), entity.getTitle(), entity.getBodyHtml(),
                entity.getLocale(), entity.getStatus(), entity.isPinned(),
                entity.getHeroImageId(), entity.getHeroImageAlt(), entity.getHeroImportUrl(),
                entity.getSortOrder(),
                entity.getPublishedAt(), entity.getCreatedBy(), entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
