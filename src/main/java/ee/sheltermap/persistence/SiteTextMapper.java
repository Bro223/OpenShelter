package ee.sheltermap.persistence;

import ee.sheltermap.domain.SiteText;

/**
 * Domain <-> entity copies for {@link SiteText} (site_texts, V27). Field
 * names match 1:1; there is no shape difference to normalize.
 */
final class SiteTextMapper {

    private SiteTextMapper() {
    }

    static void toEntity(SiteTextEntity entity, SiteText domain) {
        entity.setKey(domain.getKey());
        entity.setLocale(domain.getLocale());
        entity.setValue(domain.getValue());
        entity.setUrl(domain.getUrl());
    }

    static SiteText toDomain(SiteTextEntity entity) {
        SiteText domain = new SiteText(entity.getKey(), entity.getLocale(),
                entity.getValue(), entity.getUrl());
        domain.setId(entity.getId());
        return domain;
    }
}
