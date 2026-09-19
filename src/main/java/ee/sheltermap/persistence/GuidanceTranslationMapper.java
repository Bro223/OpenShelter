package ee.sheltermap.persistence;

import ee.sheltermap.domain.GuidanceTranslation;

/**
 * Maps between the domain {@link GuidanceTranslation} and
 * {@link GuidanceTranslationEntity} (approach B: the domain stays pure Java,
 * all persistence concerns live in this package).
 *
 * <p>Deliberately does not touch {@code id}: the id is managed by the primary
 * key. The update-path {@code updatedAt} stamp is owned by
 * {@link JpaGuidanceTranslationRepository} (the domain's write methods carry
 * their own instants, and the persistence layer keeps the stored stamp as the
 * authority — the {@code GuidancePostMapper} idiom).
 */
final class GuidanceTranslationMapper {

    private GuidanceTranslationMapper() {
    }

    /** Copies every writable domain field onto the entity (insert or update). */
    static void toEntity(GuidanceTranslationEntity entity, GuidanceTranslation translation) {
        entity.setPostId(translation.getPostId());
        entity.setLocale(translation.getLocale());
        entity.setSlug(translation.getSlug());
        entity.setTitle(translation.getTitle());
        entity.setBodyHtml(translation.getBodyHtml());
        entity.setHeroImageAlt(translation.getHeroImageAlt());
        entity.setCreatedAt(translation.getCreatedAt());
    }

    /** Restores a stored row (the V26 constraints guarantee the stored invariants). */
    static GuidanceTranslation toDomain(GuidanceTranslationEntity entity) {
        return GuidanceTranslation.restored(
                entity.getId(), entity.getPostId(), entity.getLocale(), entity.getSlug(),
                entity.getTitle(), entity.getBodyHtml(), entity.getHeroImageAlt(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
