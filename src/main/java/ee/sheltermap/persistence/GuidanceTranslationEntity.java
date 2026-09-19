package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code guidance_post_translations} (V26, bilingual-guidance).
 * One row per (post, locale); the (post_id, locale) and (locale, slug)
 * uniquenesses are enforced by the database constraints, and the post_id FK
 * cascades a hard delete of the post onto its translations. Every mapped column
 * exists in V26 with the same shape (ddl-auto=validate stays green).
 */
@Entity
@Table(name = "guidance_post_translations")
public class GuidanceTranslationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The owning post; the FK's ON DELETE CASCADE erases the row with the post. */
    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(nullable = false, length = 5)
    private String locale;

    /** Unique within the locale (V26 {@code uq_..._locale_slug}). */
    @Column(nullable = false, length = 200)
    private String slug;

    @Column(nullable = false, length = 255)
    private String title;

    /** The server-sanitized body for this locale (D2). */
    @Column(name = "body_html", nullable = false)
    private String bodyHtml;

    /** Per-locale hero alt; {@code null} when the post has no hero. */
    @Column(name = "hero_image_alt", length = 300)
    private String heroImageAlt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Moves on every write (the JPA repository stamps it, like the post). */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBodyHtml() {
        return bodyHtml;
    }

    public void setBodyHtml(String bodyHtml) {
        this.bodyHtml = bodyHtml;
    }

    public String getHeroImageAlt() {
        return heroImageAlt;
    }

    public void setHeroImageAlt(String heroImageAlt) {
        this.heroImageAlt = heroImageAlt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
