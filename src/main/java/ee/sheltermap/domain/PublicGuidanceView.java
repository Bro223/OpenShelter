package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/**
 * The PUBLIC read of one guidance post in one locale (bilingual-guidance).
 *
 * <p>A post's content in a locale lives on a translation row; this view is
 * the post (lifecycle: hero image, pinned, published stamp) fused with the
 * translation that the reader is actually served (slug, title, body, per-locale
 * hero alt, locale). The index serves it body-less ({@code bodyHtml} {@code null});
 * the detail carries the stored (sanitized) {@code bodyHtml}.
 *
 * <p>{@code alternates} maps each locale that has a translation to that
 * translation's slug ({@code {"en": "three-minutes", "et": "kolm-minutit",
 * "ru": null}}) — the field the frontend language switcher follows. It is
 * populated on the detail read; on the index it is {@code null} (kept lean, no
 * per-row N+1). {@code localeFallback} is {@code true} when the reader asked
 * for a locale the post does NOT have a translation in and the server served
 * the default-locale translation instead (a 200 with the flag, never a 404 —
 * the reader's language switch must not dead-end on a "no such page" error).
 *
 * <p>Immutable value object; pure Java, no Spring imports (domain invariant).
 */
public final class PublicGuidanceView {

    private final long id;
    private final String slug;
    private final String title;
    private final String bodyHtml;
    private final Long heroImageId;
    private final String heroImageAlt;
    private final boolean pinned;
    private final String locale;
    private final Instant publishedAt;
    private final Instant updatedAt;
    private final Map<String, String> alternates;
    private final boolean localeFallback;

    private PublicGuidanceView(long id, String slug, String title, String bodyHtml, Long heroImageId,
                               String heroImageAlt, boolean pinned, String locale, Instant publishedAt,
                               Instant updatedAt, Map<String, String> alternates, boolean localeFallback) {
        this.id = id;
        this.slug = slug;
        this.title = title;
        this.bodyHtml = bodyHtml;
        this.heroImageId = heroImageId;
        this.heroImageAlt = heroImageAlt;
        this.pinned = pinned;
        this.locale = locale;
        this.publishedAt = publishedAt;
        this.updatedAt = updatedAt;
        this.alternates = alternates;
        this.localeFallback = localeFallback;
    }

    /**
     * Builds a view for one served translation. {@code post} supplies the
     * lifecycle fields (id, hero image, pinned, published stamp); {@code served}
     * supplies the per-locale content (slug, title, body, alt, locale).
     *
     * @param withBody     true for the detail (the stored body), false for the index
     * @param alternates   the locale-&gt;slug map, or {@code null} for the index
     * @param localeFallback true when the served locale is the default-locale
     *                     fallback, not the reader's requested locale
     */
    public static PublicGuidanceView of(GuidancePost post, GuidanceTranslation served,
                                        boolean withBody, Map<String, String> alternates,
                                        boolean localeFallback) {
        Objects.requireNonNull(post, "post");
        Objects.requireNonNull(served, "served");
        return new PublicGuidanceView(
                post.getId(),
                served.getSlug(),
                served.getTitle(),
                withBody ? served.getBodyHtml() : null,
                post.getHeroImageId(),
                post.getHeroImageId() == null ? null : served.getHeroImageAlt(),
                post.isPinned(),
                served.getLocale(),
                post.getPublishedAt(),
                served.getUpdatedAt(),
                alternates,
                localeFallback);
    }

    public long getId() {
        return id;
    }

    /** The SERVED translation's slug (what this response's URL resolves to). */
    public String getSlug() {
        return slug;
    }

    public String getTitle() {
        return title;
    }

    /** The served translation's stored (sanitized body; {@code null} on the index. */
    public String getBodyHtml() {
        return bodyHtml;
    }

    /** The post-level hero image reference; {@code null} when the post has no hero. */
    public Long getHeroImageId() {
        return heroImageId;
    }

    /** The SERVED translation's hero alt; {@code null} when the post has no hero. */
    public String getHeroImageAlt() {
        return heroImageAlt;
    }

    public boolean isPinned() {
        return pinned;
    }

    /** The SERVED translation's locale (what the reader is actually reading). */
    public String getLocale() {
        return locale;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Each locale that has a translation, mapped to that translation's slug
     * ({@code null} value would mean "no translation" — but the map only carries
     * locales that DO have one, so values are non-null; the frontend renders a
     * switcher entry per key and a {@code null}/absent locale is simply not
     * offered). {@code null} on the index.
     */
    public Map<String, String> getAlternates() {
        return alternates;
    }

    /** True when the reader's requested locale had no translation and the default-locale one was served. */
    public boolean isLocaleFallback() {
        return localeFallback;
    }
}
