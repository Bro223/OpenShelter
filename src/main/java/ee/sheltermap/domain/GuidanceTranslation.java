package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * One locale-specific translation of a {@link GuidancePost} (V26).
 *
 * <p>A post is a logical article; it carries one translation row per locale.
 * Each row owns its {@code locale}, {@code slug}, {@code title},
 * {@code bodyHtml} and {@code heroImageAlt}. The post row keeps the lifecycle
 * (status, pinned, hero image, published stamp) and its HOME-locale content
 * columns; the post's own-locale translation is kept in sync with those
 * columns by the service, so every post has at least its own translation.
 *
 * <p>Uniqueness is structural (the V26 constraints): a post has at most one
 * translation per locale ({@code post_id, locale}), and a slug is unique within
 * a locale ({@code locale, slug}).
 *
 * <p>Pure Java — no Spring imports in {@code domain/} (a repo invariant). The
 * caller (the guidance service) owns the creation/update stamps (its injected
 * Clock); the domain never reaches for the wall clock.
 */
public class GuidanceTranslation {

    private Long id;
    private Long postId;
    private String locale;
    private String slug;
    private String title;
    private String bodyHtml;
    private String heroImageAlt;
    private Instant createdAt;
    private Instant updatedAt;

    private GuidanceTranslation() {
    }

    /**
     * Creates a fresh translation row for a post. The caller passes the owning
     * post id (already persisted) and the caller's instant for BOTH stamps
     * (a new row's created and updated stamps are the same instant, the
     * {@code GuidancePost.draft} idiom).
     */
    public static GuidanceTranslation forPost(long postId, String locale, String slug, String title,
                                              String bodyHtml, String heroImageAlt, Instant now) {
        GuidanceTranslation t = new GuidanceTranslation();
        t.postId = Objects.requireNonNull(postId, "postId");
        t.locale = TextValidation.requireText(locale, "locale");
        t.slug = TextValidation.requireText(slug, "slug");
        t.title = TextValidation.requireText(title, "title");
        t.bodyHtml = TextValidation.requireText(bodyHtml, "bodyHtml");
        t.heroImageAlt = heroImageAlt;
        Instant stamped = Objects.requireNonNull(now, "now");
        t.createdAt = stamped;
        t.updatedAt = stamped;
        return t;
    }

    /**
     * Restores a stored row (persistence round-trip): the full field set
     * including the id. The V26 uniqueness constraints guarantee the stored
     * invariants, so this does not re-validate them.
     */
    public static GuidanceTranslation restored(Long id, Long postId, String locale, String slug, String title,
                                               String bodyHtml, String heroImageAlt,
                                               Instant createdAt, Instant updatedAt) {
        GuidanceTranslation t = new GuidanceTranslation();
        t.id = id;
        t.postId = Objects.requireNonNull(postId, "postId");
        t.locale = Objects.requireNonNull(locale, "locale");
        t.slug = Objects.requireNonNull(slug, "slug");
        t.title = Objects.requireNonNull(title, "title");
        t.bodyHtml = Objects.requireNonNull(bodyHtml, "bodyHtml");
        t.heroImageAlt = heroImageAlt;
        t.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        t.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
        return t;
    }

    /**
     * Full replace of the editable content (a PUT of one translation). The
     * owning post and {@code locale} never move here (a translation is
     * identified by post + locale); {@code updatedAt} moves to the caller's
     * instant.
     */
    public void update(String slug, String title, String bodyHtml, String heroImageAlt, Instant now) {
        this.slug = TextValidation.requireText(slug, "slug");
        this.title = TextValidation.requireText(title, "title");
        this.bodyHtml = TextValidation.requireText(bodyHtml, "bodyHtml");
        this.heroImageAlt = heroImageAlt;
        this.updatedAt = Objects.requireNonNull(now, "now");
    }

    /**
     * The "attach an existing post" linking move: re-parent this translation
     * row to a different post. The (locale, slug) pair is untouched, so the
     * V26 {@code (locale, slug)} uniqueness is preserved by moving the row
     * rather than copying it (a copy would collide while the source's row
     * still holds the same pair). The caller (the service) owns the stamp.
     */
    public void reparentTo(long newPostId, Instant now) {
        this.postId = Objects.requireNonNull(newPostId, "newPostId");
        this.updatedAt = Objects.requireNonNull(now, "now");
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Persistence sync (the persistence layer only): after an update save, the
     * stored {@code updated_at} stamp (the repository's Clock) is the authority,
     * and the in-memory object mirrors it (the {@code GuidancePost} idiom).
     */
    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public long getPostId() {
        return postId;
    }

    public String getLocale() {
        return locale;
    }

    public String getSlug() {
        return slug;
    }

    public String getTitle() {
        return title;
    }

    /** The stored (sanitized) body for this locale. */
    public String getBodyHtml() {
        return bodyHtml;
    }

    /** The per-locale hero alt; {@code null} when the post has no hero. */
    public String getHeroImageAlt() {
        return heroImageAlt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
