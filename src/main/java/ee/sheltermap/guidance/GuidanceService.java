package ee.sheltermap.guidance;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * The crisis-guidance authoring surface (crisis-guidance D3/D4/D5/D6/D11).
 *
 * <p>Lifecycle (D4): a post is created DRAFT (PUBLISHED when the create
 * call explicitly asks, so a one-shot "write and publish" is possible);
 * {@link #publish} stamps {@code publishedAt} from the injected Clock,
 * {@link #unpublish} clears it (a re-publish stamps a FRESH instant — the
 * instruction re-issued today outranks last week's text). Publish and
 * unpublish are idempotent no-ops in the already-there state, and a no-op
 * writes NO audit row (the suspension idiom). Hard delete requires an
 * explicit {@code confirm} (400 without it); deleting a post does not
 * touch its media assets (they belong to the library, D8) and its audit
 * rows keep their label snapshot (D12).
 *
 * <p>Every body write — create AND update — stores the {@link
 * BodySanitizer} OUTPUT (D2): the stored value is the same value every
 * future reader gets, so no rendering path can skip the sanitizer. The
 * admin read returns the stored (sanitized) HTML.
 *
 *
 * <p>Slugs (D5): generated from the title when the request omits one —
 * auto-generated collisions take {@code -2}, {@code -3}, ...; an
 * admin-supplied slug is validated to the generated shape and used EXACTLY
 * as given, a collision answering 409 naming the slug (never silently
 * rewritten). Uniqueness spans drafts and published posts alike (the V23
 * UNIQUE constraint, {@code existsBySlug}).
 *
 * <p>Ordering (D6) lives in the repository contract: the admin list is
 * newest-updated first, the public list PUBLISHED-only pinned-first —
 * both with the id-descending tie-break.
 *
 * <p>Audit (D12): publish / unpublish / delete call
 * {@link ModerationAuditLog#recordLabeled} inside this service's
 * {@code @Transactional} method with the label
 * {@code Guidance post "<title>" (<slug>)} — the same transaction commits
 * action and row, and a rolled-back action leaves no row.
 *
 * <p>Authorization is the controller's job (D3 — the same fresh
 * per-request ADMIN kind lookup as the admin moderation API); this service
 * assumes an authenticated admin and receives the acting user id.
 */
@Service
public class GuidanceService {

    /** The uniform 404 message — a draft slug and an unknown slug answer the SAME 404 (D4). */
    public static final String POST_NOT_FOUND_MESSAGE = "Guidance post not found";

    /** The uniform 404 for an unknown media asset (a hero reference or a serving name). */
    public static final String ASSET_NOT_FOUND_MESSAGE = "Media asset not found";

    /** The title column width (V23 {@code guidance_posts.title VARCHAR(255)}) — the service bound. */
    public static final int MAX_TITLE_LENGTH = 255;

    /** The serving-URL prefix for hero images (D7: the path sits under /api/ on purpose). */
    public static final String MEDIA_URL_PREFIX = "/api/media/";

    private final GuidancePostRepository posts;
    private final MediaAssetRepository mediaAssets;
    private final ModerationAuditLog audit;
    private final Clock clock;
    /** The app's primary language (D11: mirrors the frontend's DEFAULT_LOCALE). */
    private final String defaultLocale;

    public GuidanceService(GuidancePostRepository posts,
                           MediaAssetRepository mediaAssets,
                           ModerationAuditLog audit,
                           Clock clock,
                           @Value("${app.guidance.default-locale:en}") String defaultLocale) {
        this.posts = Objects.requireNonNull(posts, "posts");
        this.mediaAssets = Objects.requireNonNull(mediaAssets, "mediaAssets");
        this.audit = Objects.requireNonNull(audit, "audit");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.defaultLocale = Objects.requireNonNull(defaultLocale, "defaultLocale");
    }

    // ------------------------------------------------------------- reads

    /**
     * The public index (D6): PUBLISHED-only — the filter lives in the
     * query, so no code path can leak a draft — pinned first, then
     * {@code publishedAt} descending, id descending as the stable
     * tie-break. Empty (nothing published) is an empty list, never an error.
     */
    @Transactional(readOnly = true)
    public List<GuidancePost> listPublic() {
        return posts.findPublished();
    }

    /**
     * The admin list (D3): every post, drafts included, newest-updated
     * first (id descending tie-break).
     */
    @Transactional(readOnly = true)
    public List<GuidancePost> listForAdmin() {
        return posts.findAllForAdmin();
    }

    /**
     * The public detail read (D4): PUBLISHED-only by slug. A slug held by
     * a DRAFT answers the SAME 404 as an unknown slug — the response must
     * not reveal that a draft exists.
     */
    @Transactional(readOnly = true)
    public GuidancePost getByPublicSlug(String slug) {
        return posts.findPublishedBySlug(slug)
                .orElseThrow(() -> new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE));
    }

    /** The admin detail read — id-keyed (the admin form edits by id); unknown id → 404. */
    @Transactional(readOnly = true)
    public GuidancePost getById(long id) {
        return requirePost(id);
    }

    // ------------------------------------------------------------- writes

    /**
     * Create a post (D4): DRAFT by default, PUBLISHED when the request
     * explicitly asks. The slug is generated from the title when omitted
     * (auto collisions take {@code -2}, {@code -3}, ...); an explicit
     * slug is validated and used exactly as given (collision → 409).
     * The stored body is the sanitizer output (D2).
     *
     * @throws GuidanceValidationException 400 — missing/oversized title or body, a
     *                                     malformed custom slug, alt without a hero
     *                                     or a hero without alt
     * @throws SlugAlreadyUsedException    409 — an admin-supplied slug another post holds
     * @throws GuidanceNotFoundException   404 — a heroImageId with no such asset
     */
    @Transactional
    public GuidancePost create(long adminId, String title, String slug, String body,
                               String locale, boolean pinned, Long heroImageId,
                               String heroImageAlt, GuidanceStatus requestedStatus) {
        Instant now = clock.instant();
        String cleanTitle = requireTitle(title);
        String cleanBody = sanitize(body);
        String cleanLocale = localeOrDefault(locale);
        Long heroId = requireHeroPairing(heroImageId, heroImageAlt);
        String heroAlt = heroImageAlt == null ? null : heroImageAlt.trim();
        String finalSlug = slug == null || slug.isBlank()
                ? nextGeneratedSlug(cleanTitle)
                : resolveSuppliedSlug(slug, null);

        GuidancePost post = GuidancePost.draft(finalSlug, cleanTitle, cleanBody, cleanLocale,
                pinned, heroId, heroAlt, adminId, now);
        if (requestedStatus == GuidanceStatus.PUBLISHED) {
            // One-shot "write and publish" (D4) — the same stamp the
            // publish endpoint would write. This is a CREATE, not a
            // lifecycle transition: no separate publish audit row.
            post.publish(now);
        }
        return posts.save(post);
    }

    /**
     * Full replace of the editable fields (D3): title, body, locale,
     * pinned, hero (id + alt). The slug is kept when omitted; when given,
     * it is validated and must not collide with ANOTHER post (409 naming
     * the slug). The stored body is re-sanitized (D2) — the sanitizer
     * runs on update exactly as on create.
     *
     * @throws GuidanceValidationException 400 — same vocabulary as {@link #create}
     * @throws SlugAlreadyUsedException    409 — the given slug is held by another post
     * @throws GuidanceNotFoundException   404 — unknown post id, or a heroImageId
     *                                     with no such asset
     */
    @Transactional
    public GuidancePost update(long id, String title, String slug, String body,
                               String locale, boolean pinned, Long heroImageId,
                               String heroImageAlt) {
        GuidancePost post = requirePost(id);
        Instant now = clock.instant();
        String cleanTitle = requireTitle(title);
        String cleanBody = sanitize(body);
        String cleanLocale = localeOrDefault(locale);
        Long heroId = requireHeroPairing(heroImageId, heroImageAlt);
        String heroAlt = heroImageAlt == null ? null : heroImageAlt.trim();
        String finalSlug = resolveSuppliedSlug(slug, post.getSlug());

        post.update(finalSlug, cleanTitle, cleanBody, cleanLocale, pinned, heroId, heroAlt, now);
        return posts.save(post);
    }

    /**
     * Publish (D4): stamps {@code publishedAt} from the injected Clock
     * and records GUIDANCE_PUBLISH in this transaction. Idempotent — an
     * already-published post is a no-op that writes NO audit row and
     * keeps its earlier stamp (the 204 is the controller's answer).
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     */
    @Transactional
    public void publish(long adminId, long id) {
        GuidancePost post = requirePost(id);
        if (!post.isPublished()) {
            post.publish(clock.instant());
            posts.save(post);
            audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_PUBLISH,
                    auditLabel(post), null);
        }
    }

    /**
     * Unpublish (D4): back to DRAFT, {@code publishedAt} cleared,
     * GUIDANCE_UNPUBLISH recorded in this transaction. Idempotent —
     * unpublishing a draft is a no-op that writes NO audit row.
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     */
    @Transactional
    public void unpublish(long adminId, long id) {
        GuidancePost post = requirePost(id);
        if (post.isPublished()) {
            post.unpublish();
            posts.save(post);
            audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_UNPUBLISH,
                    auditLabel(post), null);
        }
    }

    /**
     * Hard delete (D4): requires {@code confirm} (400 without it — the
     * admin UI shows a confirm dialog). The GUIDANCE_DELETE audit row
     * joins this transaction with the label snapshot computed BEFORE the
     * row is gone (D12 — the trail stays readable after the delete).
     * The post's media assets stay in the library (uploads are inventory,
     * not garbage, D8).
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     * @throws GuidanceValidationException 400 — confirm is false
     */
    @Transactional
    public void delete(long adminId, long id, boolean confirm) {
        GuidancePost post = requirePost(id);
        if (!confirm) {
            throw new GuidanceValidationException("confirm=true is required to delete a guidance post");
        }
        audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_DELETE,
                auditLabel(post), null);
        posts.delete(post);
    }

    // ------------------------------------------------------------- guards

    /**
     * The D12 subject label — a snapshot of the post's title and slug at
     * the moment of the action (the column has no FK: a deleted post must
     * stay readable in the trail, exactly like a dangling shelter_id).
     */
    private static String auditLabel(GuidancePost post) {
        return "Guidance post \"" + post.getTitle() + "\" (" + post.getSlug() + ")";
    }

    /** Title required and bounded by the column width (400 otherwise). */
    private String requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new GuidanceValidationException("title is required");
        }
        String trimmed = title.trim();
        if (trimmed.length() > MAX_TITLE_LENGTH) {
            throw new GuidanceValidationException("title must be at most " + MAX_TITLE_LENGTH + " characters");
        }
        return trimmed;
    }

    /** Body required, and ALWAYS stored as the sanitizer output (D2). */
    private String sanitize(String body) {
        if (body == null || body.isBlank()) {
            throw new GuidanceValidationException("body is required");
        }
        return BodySanitizer.sanitize(body);
    }

    /** Locale defaults from the configured primary language when omitted (D11). */
    private String localeOrDefault(String locale) {
        return locale == null || locale.isBlank() ? defaultLocale : locale.trim();
    }

    /**
     * Alt mandatory iff a hero image is set — both directions 400 (the
     * V23 CHECK mirrors the rule; the 400 is the friendlier answer).
     * A hero id must name a live asset (unknown id → 404).
     */
    private Long requireHeroPairing(Long heroImageId, String heroImageAlt) {
        boolean hasHero = heroImageId != null;
        boolean hasAlt = heroImageAlt != null && !heroImageAlt.isBlank();
        if (hasHero && !hasAlt) {
            throw new GuidanceValidationException("heroImageAlt is required when a hero image is set");
        }
        if (!hasHero && hasAlt) {
            throw new GuidanceValidationException("heroImageAlt requires a hero image (heroImageId)");
        }
        if (hasHero && mediaAssets.findById(heroImageId).isEmpty()) {
            throw new GuidanceNotFoundException(ASSET_NOT_FOUND_MESSAGE);
        }
        return heroImageId;
    }

    /**
     * The admin-supplied slug, used exactly as given (D5): validated to
     * the generated shape (400) and refused on a collision with ANOTHER
     * post (409 naming the slug). On an update, a blank slug keeps the
     * post's current one, and a slug equal to the current one is a
     * no-op, not a collision.
     */
    private String resolveSuppliedSlug(String supplied, String currentSlug) {
        if (supplied == null || supplied.isBlank()) {
            return currentSlug;
        }
        String slug = supplied.trim();
        if (!SlugFactory.isValidCustomSlug(slug)) {
            throw new GuidanceValidationException(
                    "slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most "
                            + SlugFactory.MAX_SLUG_LENGTH + " characters");
        }
        if (slug.equals(currentSlug)) {
            return slug;
        }
        if (posts.existsBySlug(slug)) {
            throw new SlugAlreadyUsedException(slug);
        }
        return slug;
    }

    /**
     * The auto-generated slug (D5): from the title; a collision — with a
     * draft OR a published post, the uniqueness spans both — takes
     * {@code -2}, {@code -3}, ... and takes the first free value.
     */
    private String nextGeneratedSlug(String title) {
        String base = SlugFactory.of(title);
        if (!posts.existsBySlug(base)) {
            return base;
        }
        for (int suffix = 2; ; suffix++) {
            String candidate = base + "-" + suffix;
            if (!posts.existsBySlug(candidate)) {
                return candidate;
            }
        }
    }

    private GuidancePost requirePost(long id) {
        return posts.findById(id)
                .orElseThrow(() -> new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE));
    }
}
