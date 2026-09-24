package ee.sheltermap.persistence;

import ee.sheltermap.domain.GuidanceStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code guidance_posts} (V23).
 * The unique slug ({@code uq_guidance_posts_slug} — across drafts and
 * published posts alike), the hero/alt pairing and the
 * status/{@code published_at} pairing are enforced by the database
 * CHECKs; every mapped column exists in V23 with the same shape
 * (ddl-auto=validate stays green).
 */
@Entity
@Table(name = "guidance_posts")
public class GuidancePostEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String slug;

    @Column(nullable = false, length = 255)
    private String title;

    /** The server-sanitized body — the stored value is always the sanitizer's output. */
    @Column(name = "body_html", nullable = false)
    private String bodyHtml;

    @Column(nullable = false, length = 5)
    private String locale;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private GuidanceStatus status;

    @Column(nullable = false)
    private boolean pinned;

    /** The hero image is a REFERENCE to media_assets (never a URL): the
     *  FK's ON DELETE SET NULL is what keeps every page image-free-safe. */
    @Column(name = "hero_image_id")
    private Long heroImageId;

    /** Mandatory iff a hero image is set (the V23 CHECK). */
    @Column(name = "hero_image_alt", length = 300)
    private String heroImageAlt;

    /** The hero's source URL (V25, fetched at save time — the V25 pending-import CHECK was dropped in V33). */
    @Column(name = "hero_import_url", length = 2048)
    private String heroImportUrl;

    /**
     * The stored manual position (V28). NOT
     * uniqueness-constrained on purpose — the atomic renumber must not
     * transiently violate a uniqueness check, and the public order
     * contract's tie-breakers make a duplicate harmless. The V28 partial
     * index rides on it (pinned DESC, sort_order ASC, ...).
     */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** Stamped on publish, cleared on unpublish — paired with status by the V23 CHECK. */
    @Column(name = "published_at")
    private Instant publishedAt;

    /** The authoring account; dangles after an erasure (FK ON DELETE SET NULL, V7 precedent). */
    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Moves on every write — stamped by the update path of the JPA repository. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public GuidanceStatus getStatus() {
        return status;
    }

    public void setStatus(GuidanceStatus status) {
        this.status = status;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public Long getHeroImageId() {
        return heroImageId;
    }

    public void setHeroImageId(Long heroImageId) {
        this.heroImageId = heroImageId;
    }

    public String getHeroImageAlt() {
        return heroImageAlt;
    }

    public void setHeroImageAlt(String heroImageAlt) {
        this.heroImageAlt = heroImageAlt;
    }

    public String getHeroImportUrl() {
        return heroImportUrl;
    }

    public void setHeroImportUrl(String heroImportUrl) {
        this.heroImportUrl = heroImportUrl;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
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
