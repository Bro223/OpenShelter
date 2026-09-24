package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * One crisis guidance post.
 *
 * <p>The hero image is a <b>reference</b> ({@code heroImageId}), never an
 * image URL or a copy: the reference is always either a live media asset
 * or {@code null}, so no broken image can reach a page — deleting the
 * asset nulls the reference (the FK's {@code ON DELETE SET NULL}), and a
 * post with a {@code null} hero renders no image element at all. Alt text
 * is mandatory iff a hero is set (the V23 CHECK mirrors the same rule).
 *
 * <p>The {@code heroImportUrl} is the hero's SOURCE URL: an admin-
 * supplied http(s) URL the server fetches, validates and stores at SAVE
 * time (create and update, draft or published alike). A successful
 * import links the stored asset as the hero and keeps the URL on the
 * post as provenance (the asset's {@code source_url} records the same
 * origin); a failed import leaves the post's previous hero (or no hero)
 * in place and keeps the URL for a retry on the next save. The hero
 * itself is always a stored-asset reference or {@code null} — a page
 * never renders from the URL.
 *
 * <p>Publication state: publishing stamps {@code publishedAt} from
 * the instant the caller passes (the service's injected Clock);
 * unpublishing clears it. {@code updatedAt} moves on every write
 * ({@code createdAt} on create).
 *
 * <p>Manual order: {@code sortOrder} is the post's STORED position — the
 * public index reads pinned first, then {@code sortOrder} ascending (with
 * the {@code publishedAt}/{@code id} tie-breakers), so a post's slot is its
 * {@code sortOrder}: publishing or unpublishing NEVER moves a post. Create
 * appends {@code max + 1} (last position); the reorder endpoint renumbers
 * 1..N. The value is NOT uniqueness-constrained: the writers guarantee
 * uniqueness, the order contract's tie-breakers make a duplicate harmless.
 *
 * <p>Pure Java — no Spring imports in {@code domain/} (a repo invariant).
 */
public class GuidancePost {

    private Long id;
    private String slug;
    private String title;
    private String bodyHtml;
    private String locale;
    private GuidanceStatus status;
    private boolean pinned;
    private Long heroImageId;
    private String heroImageAlt;
    /** The hero's source URL: {@code null} when the hero is a plain library reference (or absent). */
    private String heroImportUrl;
    /** The stored manual position; 1 = first. */
    private int sortOrder;
    private Instant publishedAt;
    private Long createdBy;
    private Instant createdAt;
    private Instant updatedAt;

    private GuidancePost() {
    }

    /**
     * Creates a new DRAFT post — the ONLY way a fresh post comes into
     * being (the persistence layer uses {@link #restored} for stored
     * rows). The caller — the guidance service — owns the creation stamp
     * (its injected Clock), so the domain never reaches for the wall
     * clock. An explicit "create and publish" is a follow-up
     * {@link #publish(Instant)} call on the same object.
     */
    public static GuidancePost draft(String slug, String title, String bodyHtml, String locale,
                                     boolean pinned, Long heroImageId, String heroImageAlt,
                                     String heroImportUrl, int sortOrder, Long createdBy, Instant now) {
        GuidancePost post = new GuidancePost();
        post.slug = TextValidation.requireText(slug, "slug");
        post.title = TextValidation.requireText(title, "title");
        post.bodyHtml = TextValidation.requireText(bodyHtml, "bodyHtml");
        post.locale = TextValidation.requireText(locale, "locale");
        post.pinned = pinned;
        post.heroImageId = heroImageId;
        post.heroImageAlt = heroImageAlt;
        post.heroImportUrl = heroImportUrl;
        post.sortOrder = requireSortOrder(sortOrder);
        requireHeroAltPairing(heroImageId, heroImageAlt, heroImportUrl);
        post.status = GuidanceStatus.DRAFT;
        post.publishedAt = null;
        post.createdBy = createdBy;
        Instant createdAt = Objects.requireNonNull(now, "now");
        post.createdAt = createdAt;
        post.updatedAt = createdAt;
        return post;
    }

    /**
     * Restores a stored row (persistence round-trip): the full field set
     * including the id, the status and its stamped instant. The V23/V25
     * CHECKs guarantee the stored invariants (status/publishedAt pairing,
     * hero/alt pairing, no pending import on a published post), so this
     * does not re-validate them.
     */
    public static GuidancePost restored(Long id, String slug, String title, String bodyHtml,
                                        String locale, GuidanceStatus status, boolean pinned,
                                        Long heroImageId, String heroImageAlt, String heroImportUrl,
                                        int sortOrder, Instant publishedAt, Long createdBy,
                                        Instant createdAt, Instant updatedAt) {
        GuidancePost post = new GuidancePost();
        post.id = id;
        post.slug = slug;
        post.title = title;
        post.bodyHtml = bodyHtml;
        post.locale = locale;
        post.status = Objects.requireNonNull(status, "status");
        post.pinned = pinned;
        post.heroImageId = heroImageId;
        post.heroImageAlt = heroImageAlt;
        post.heroImportUrl = heroImportUrl;
        post.sortOrder = requireSortOrder(sortOrder);
        post.publishedAt = publishedAt;
        post.createdBy = createdBy;
        post.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        post.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
        return post;
    }

    /**
     * Full replace of the editable fields (a PUT keeps the slug the
     * service resolved — passing it here verbatim). The publication
     * state, the author and {@code createdAt} never move here;
     * {@code updatedAt} moves to the caller's instant.
     */
    public void update(String slug, String title, String bodyHtml, String locale, boolean pinned,
                       Long heroImageId, String heroImageAlt, String heroImportUrl, Instant now) {
        this.slug = TextValidation.requireText(slug, "slug");
        this.title = TextValidation.requireText(title, "title");
        this.bodyHtml = TextValidation.requireText(bodyHtml, "bodyHtml");
        this.locale = TextValidation.requireText(locale, "locale");
        this.pinned = pinned;
        this.heroImageId = heroImageId;
        this.heroImageAlt = heroImageAlt;
        this.heroImportUrl = heroImportUrl;
        requireHeroAltPairing(heroImageId, heroImageAlt, heroImportUrl);
        this.updatedAt = Objects.requireNonNull(now, "now");
    }

    /**
     * Publishes: stamps {@code publishedAt} and moves {@code updatedAt}
     * to the caller's instant. Idempotent — a second call on a published
     * post keeps the earlier stamp (the "publishing twice is a no-op"
     * idiom; the service writes no second audit row either).
     */
    public void publish(Instant now) {
        if (status == GuidanceStatus.DRAFT) {
            Instant stamped = Objects.requireNonNull(now, "now");
            this.status = GuidanceStatus.PUBLISHED;
            this.publishedAt = stamped;
            this.updatedAt = stamped;
        }
    }

    /**
     * Unpublishes: back to DRAFT, {@code publishedAt} cleared (the V23
     * CHECK enforces the pairing). Idempotent on a draft. This method
     * carries no instant (frozen signature), so {@code updatedAt} is
     * stamped by the persistence layer on the following save.
     */
    public void unpublish() {
        if (status == GuidanceStatus.PUBLISHED) {
            this.status = GuidanceStatus.DRAFT;
            this.publishedAt = null;
        }
    }

    /**
     * Clears the hero image (id and alt together): the post stays
     * fully renderable — no image element, title and body intact. The
     * asset itself is untouched in the media library. The import URL is
     * left alone when it is present — the next save re-imports it (a
     * delete of one asset does not burn the admin's URL).
     */
    public void clearHero() {
        this.heroImageId = null;
        this.heroImageAlt = null;
    }

    private static int requireSortOrder(int sortOrder) {
        if (sortOrder < 1) {
            throw new IllegalArgumentException("sortOrder must be at least 1");
        }
        return sortOrder;
    }

    /**
     * Alt text mandatory iff a hero is set — a hero being a stored-asset
     * reference OR a pending import URL (the V23 CHECK and the service's
     * 400 enforce the same rule for the reference half; this keeps the
     * domain honest on its own): both directions refuse.
     */
    private static void requireHeroAltPairing(Long heroImageId, String heroImageAlt, String heroImportUrl) {
        boolean hasHero = heroImageId != null || heroImportUrl != null;
        boolean hasAlt = heroImageAlt != null && !heroImageAlt.isBlank();
        if (hasHero && !hasAlt) {
            throw new IllegalArgumentException("heroImageAlt is required when a hero image is set");
        }
        if (!hasHero && hasAlt) {
            throw new IllegalArgumentException("heroImageAlt is meaningless without a hero image");
        }
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Persistence sync (the persistence layer only): after an update
     * save, the stored {@code updated_at} stamp (the repository's Clock)
     * is the authority, and the in-memory object mirrors it.
     */
    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public String getSlug() {
        return slug;
    }

    public String getTitle() {
        return title;
    }

    /** The stored (sanitized) body — the admin read returns it verbatim. */
    public String getBodyHtml() {
        return bodyHtml;
    }

    /** The stored locale (a stored attribute, no translation workflow in v1). */
    public String getLocale() {
        return locale;
    }

    public GuidanceStatus getStatus() {
        return status;
    }

    public boolean isPublished() {
        return status == GuidanceStatus.PUBLISHED;
    }

    /** Pinning floats a published post to the top of the public list. */
    public boolean isPinned() {
        return pinned;
    }

    /**
     * The stored manual position: the public index decides the non-pinned
     * order by this value ascending, and the admin list renders in the
     * same order. Publish/unpublish/delete never move it — the service's
     * reorder is the only writer after create.
     */
    public int getSortOrder() {
        return sortOrder;
    }

    /**
     * Sets the stored manual position: the service's create assigns the
     * appended {@code max + 1}, and the service's reorder renumbers every
     * post to 1..N in the submitted order (one writer, the service — the
     * persistence layer never touches this field itself).
     */
    public void setSortOrder(int sortOrder) {
        this.sortOrder = requireSortOrder(sortOrder);
    }

    /** The hero image's media-asset id; {@code null} when the post has no hero. */
    public Long getHeroImageId() {
        return heroImageId;
    }

    /** The hero image's alt text (mandatory iff a hero is set); {@code null} without a hero. */
    public String getHeroImageAlt() {
        return heroImageAlt;
    }

    /**
     * The hero's source URL: the admin-supplied import URL, fetched at
     * save time; kept after a successful import as the hero's provenance
     * (the imported asset's {@code source_url} records the same origin)
     * and retryable after a failed one. {@code null} when the hero is a
     * plain library reference (or absent). Never exposed on the public
     * surface — admin read only.
     */
    public String getHeroImportUrl() {
        return heroImportUrl;
    }

    /** Stamped by {@link #publish(Instant)}, cleared by {@link #unpublish()}; {@code null} for drafts. */
    public Instant getPublishedAt() {
        return publishedAt;
    }

    /** The authoring account; may dangle after an erasure (FK SET NULL, V7 precedent). */
    public Long getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /** Moves on every write; visible in the admin list only. */
    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
