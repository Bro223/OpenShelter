package ee.sheltermap.guidance;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.domain.PublicGuidanceView;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

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
 * <p>Hero import (guidance-hero-import): a post may carry a PENDING hero
 * import — an admin-supplied http(s) URL in {@code heroImportUrl} instead
 * of a library reference. The URL is consumed at the moment the post
 * TRANSITIONS to PUBLISHED: {@link #publish} (and the one-shot
 * create-and-publish) run {@link HeroImageImportService} inside the
 * publish transaction and link the stored asset as the hero. A failed
 * fetch or validation fails the publish (400/413/502 vocabulary, readable
 * message) and the post stays a DRAFT with the URL intact — a post is
 * never published with a hero that could not be fetched and validated.
 * A published post cannot TAKE a pending URL (the V25 CHECK is
 * structural; setting one is a 400 — unpublish first).
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

    /** The locale column width (V23 {@code guidance_posts.locale VARCHAR(5)}) — the service bound. */
    public static final int MAX_LOCALE_LENGTH = 5;

    /** The pending-import URL column width (V25 {@code hero_import_url VARCHAR(2048)}). */
    public static final int MAX_HERO_IMPORT_URL_LENGTH = 2048;

    /** The serving-URL prefix for hero images (D7: the path sits under /api/ on purpose). */
    public static final String MEDIA_URL_PREFIX = "/api/media/";

    private final GuidancePostRepository posts;
    private final MediaAssetRepository mediaAssets;
    private final ModerationAuditLog audit;
    private final Clock clock;
    /** The app's primary language (D11: mirrors the frontend's DEFAULT_LOCALE). */
    private final String defaultLocale;
    /** The remote-hero importer (guidance-hero-import) — runs inside the publish transaction. */
    private final HeroImageImportService heroImport;
    /** The per-locale translation rows (bilingual-guidance, V26). */
    private final GuidanceTranslationRepository translations;

    public GuidanceService(GuidancePostRepository posts,
                           MediaAssetRepository mediaAssets,
                           ModerationAuditLog audit,
                           Clock clock,
                           @Value("${app.guidance.default-locale:en}") String defaultLocale,
                           HeroImageImportService heroImport,
                           GuidanceTranslationRepository translations) {
        this.posts = Objects.requireNonNull(posts, "posts");
        this.mediaAssets = Objects.requireNonNull(mediaAssets, "mediaAssets");
        this.audit = Objects.requireNonNull(audit, "audit");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.defaultLocale = Objects.requireNonNull(defaultLocale, "defaultLocale");
        this.heroImport = Objects.requireNonNull(heroImport, "heroImport");
        this.translations = Objects.requireNonNull(translations, "translations");
    }

    // ------------------------------------------------------------- reads

    /**
     * The public index (D6): PUBLISHED-only and ONE locale — both filters
     * live in the query, so no code path can leak a draft or the other
     * language's text — pinned first, then {@code publishedAt} descending,
     * id descending as the stable tie-break. {@code locale} is the
     * reader's requested language or {@code null} for the parameter-absent
     * call, which falls back to the configured default locale (existing
     * callers keep their behaviour). A PRESENT but blank or over-long
     * value is a 400 ({@link #resolveLocale}). Empty (nothing published in
     * that locale) is an empty list, never an error.
     *
     * @throws GuidanceValidationException 400 — a blank or over-long locale
     */
    @Transactional(readOnly = true)
    public List<PublicGuidanceView> listPublic(String locale) {
        String requested = resolveLocale(locale);
        // The translation rows of PUBLISHED posts in the locale, already in the
        // public index order (pinned first, publishedAt desc, id desc). The
        // posts are batch-loaded once for the hero image, pinned and published
        // stamp — one extra read, no per-row N+1.
        List<GuidanceTranslation> rows = translations.findPublishedInLocale(requested);
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> postIds = rows.stream().map(GuidanceTranslation::getPostId).distinct().toList();
        Map<Long, GuidancePost> postById = new HashMap<>();
        for (long id : postIds) {
            posts.findById(id).ifPresent(p -> postById.put(id, p));
        }
        List<PublicGuidanceView> views = new ArrayList<>(rows.size());
        for (GuidanceTranslation row : rows) {
            GuidancePost post = postById.get(row.getPostId());
            if (post != null) {
                views.add(PublicGuidanceView.of(post, row, false, null, false));
            }
        }
        return views;
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
     * The public detail read (D4): PUBLISHED-only by slug, in ONE locale.
     * A slug held by a DRAFT answers the SAME 404 as an unknown slug — the
     * response must not reveal that a draft exists.
     *
     * <p>A slug whose PUBLISHED post lives in ANOTHER locale answers the
     * same 404: a bilingual site must not serve the other language's text
     * at a URL — a reader who switches language must not land on a post
     * that is not in their language (the reader's own re-fetch after the
     * switch is what resolves the slug in their language). A parameter-
     * absent call resolves against the default locale, so existing links
     * keep working. A PRESENT but blank or over-long locale is a 400.
     *
     * @throws GuidanceNotFoundException     404 — unknown slug, a draft slug,
     *                                       or a post in another locale
     * @throws GuidanceValidationException   400 — a blank or over-long locale
     */
    @Transactional(readOnly = true)
    public PublicGuidanceView getByPublicSlug(String slug, String locale) {
        String requested = resolveLocale(locale);
        // 1. The URL slug names a translation row (a slug is unique within its
        //    locale). Resolve it to the owning post; a slug held by no row — or
        //    by rows of MORE THAN ONE post (a data anomaly) — is a 404.
        List<GuidanceTranslation> rows = translations.findBySlug(slug);
        if (rows.isEmpty()) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        Set<Long> postIds = new LinkedHashSet<>();
        for (GuidanceTranslation row : rows) {
            postIds.add(row.getPostId());
        }
        if (postIds.size() > 1) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        long postId = postIds.iterator().next();
        GuidancePost post = requirePost(postId);
        // 2. A DRAFT post's slug answers the SAME 404 as an unknown slug (D4) —
        //    the response must not reveal that a draft exists.
        if (!post.isPublished()) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        // 3. Serve the requested locale if the post has it; otherwise serve the
        //    default-locale translation with the fallback flag (a 200, never a
        //    404 — the language switch must not dead-end); otherwise 404.
        List<GuidanceTranslation> all = translations.findAllByPostId(postId);
        GuidanceTranslation served = findByLocale(all, requested).orElse(null);
        boolean fallback = false;
        if (served == null) {
            served = findByLocale(all, defaultLocale).orElse(null);
            fallback = served != null;
        }
        if (served == null) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        Map<String, String> alternates = new LinkedHashMap<>();
        for (GuidanceTranslation row : all) {
            alternates.put(row.getLocale(), row.getSlug());
        }
        return PublicGuidanceView.of(post, served, true, alternates, fallback);
    }

    private static Optional<GuidanceTranslation> findByLocale(List<GuidanceTranslation> rows, String locale) {
        return rows.stream().filter(r -> r.getLocale().equals(locale)).findFirst();
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
     * The stored body is the sanitizer output (D2). A pending hero import
     * ({@code heroImportUrl}) is carried by the draft and consumed at
     * publish — except in the one-shot PUBLISHED create, where it is
     * imported BEFORE the post is written, so a failed fetch fails the
     * whole create (nothing is stored).
     *
     * @throws GuidanceValidationException 400 — missing/oversized title or body, a
     *                                     malformed custom slug, a malformed heroImportUrl,
     *                                     alt without a hero (or a hero without alt)
     * @throws SlugAlreadyUsedException    409 — an admin-supplied slug another post holds
     * @throws GuidanceNotFoundException   404 — a heroImageId with no such asset
     * @throws HeroImportRefusedException      400 — the one-shot import was refused by policy
     * @throws HeroImportUnreachableException  502 — the one-shot import could not be fetched
     * @throws MediaTooLargeException          413 — the one-shot import exceeded the cap
     * @throws UnsupportedImageException       400 — the one-shot import is not a readable image
     */
    @Transactional
    public GuidancePost create(long adminId, String title, String slug, String body,
                               String locale, boolean pinned, Long heroImageId,
                               String heroImageAlt, String heroImportUrl,
                               GuidanceStatus requestedStatus) {
        Instant now = clock.instant();
        String cleanTitle = requireTitle(title);
        String cleanBody = sanitize(body);
        String cleanLocale = localeOrDefault(locale);
        String cleanImportUrl = normalizeImportUrl(heroImportUrl);
        Long heroId = heroImageId;
        // A one-shot "write and publish" carrying a pending hero import
        // publishes with the imported asset: the import runs BEFORE the
        // post is written, so a failed fetch or validation fails the
        // whole create — the same rule as the publish endpoint.
        if (requestedStatus == GuidanceStatus.PUBLISHED && cleanImportUrl != null) {
            MediaAsset imported = heroImport.importHero(adminId, cleanImportUrl);
            heroId = imported.getId();
            cleanImportUrl = null; // consumed
        }
        requireHeroPairing(heroId, heroImageAlt, cleanImportUrl);
        String heroAlt = heroImageAlt == null ? null : heroImageAlt.trim();
        String finalSlug = slug == null || slug.isBlank()
                ? nextGeneratedSlug(cleanTitle)
                : resolveSuppliedSlug(slug, null);

        GuidancePost post = GuidancePost.draft(finalSlug, cleanTitle, cleanBody, cleanLocale,
                pinned, heroId, heroAlt, cleanImportUrl, adminId, now);
        if (requestedStatus == GuidanceStatus.PUBLISHED) {
            // One-shot "write and publish" (D4) — the same stamp the
            // publish endpoint would write. This is a CREATE, not a
            // lifecycle transition: no separate publish audit row.
            post.publish(now);
        }
        GuidancePost saved = posts.save(post);
        // Every post owns at least one translation row — its own (the V26
        // backfill's invariant, kept for new posts too) — so the public reads
        // (which key off translations) see it in its own locale.
        saveOwnTranslation(saved, now);
        return saved;
    }

    /**
     * Full replace of the editable fields (D3): title, body, locale,
     * pinned, hero (id + alt + pending import URL). The slug is kept when omitted; when given,
     * it is validated and must not collide with ANOTHER post (409 naming
     * the slug). The stored body is re-sanitized (D2) — the sanitizer
     * runs on update exactly as on create. A pending import URL is stored as-is (consumed at
     * the NEXT publish) — except on an already-published post, where it is a 400: a published
     * post carries no pending import (the V25 CHECK), so the workflow is unpublish → edit →
     * publish.
     *
     * @throws GuidanceValidationException 400 — same vocabulary as {@link #create},
     *                                     plus a pending import URL on a published post
     * @throws SlugAlreadyUsedException    409 — the given slug is held by another post
     * @throws GuidanceNotFoundException   404 — unknown post id, or a heroImageId
     *                                     with no such asset
     */
    @Transactional
    public GuidancePost update(long id, String title, String slug, String body,
                               String locale, boolean pinned, Long heroImageId,
                               String heroImageAlt, String heroImportUrl) {
        GuidancePost post = requirePost(id);
        Instant now = clock.instant();
        String cleanTitle = requireTitle(title);
        String cleanBody = sanitize(body);
        String cleanLocale = localeOrDefault(locale);
        String cleanImportUrl = normalizeImportUrl(heroImportUrl);
        if (post.isPublished() && cleanImportUrl != null) {
            // A published post cannot take a pending import (the V25
            // CHECK makes this structural — a live post's hero is always
            // a live asset or nothing): unpublishing first is the
            // workflow, so the 400 says so instead of letting the DB
            // reject the write with an integrity error.
            throw new GuidanceValidationException(
                    "A published post cannot take a pending hero import — unpublish it "
                            + "first, or pick a hero from the media library");
        }
        requireHeroPairing(heroImageId, heroImageAlt, cleanImportUrl);
        String heroAlt = heroImageAlt == null ? null : heroImageAlt.trim();
        String finalSlug = resolveSuppliedSlug(slug, post.getSlug());
        String oldLocale = post.getLocale();

        post.update(finalSlug, cleanTitle, cleanBody, cleanLocale, pinned, heroImageId,
                heroAlt, cleanImportUrl, now);
        GuidancePost saved = posts.save(post);
        if (!oldLocale.equals(cleanLocale)) {
            // The post's home locale moved: drop the old own-locale row so the
            // post is not left "public" in a locale it no longer claims.
            translations.findByPostIdAndLocale(post.getId(), oldLocale).ifPresent(translations::delete);
        }
        // Re-sync the (possibly new) own-locale translation from the post's
        // home content — the V26 invariant, kept on every update.
        saveOwnTranslation(saved, now);
        return saved;
    }

    /**
     * Publish (D4): stamps {@code publishedAt} from the injected Clock
     * and records GUIDANCE_PUBLISH in this transaction. Idempotent — an
     * already-published post is a no-op that writes NO audit row and
     * keeps its earlier stamp (the 204 is the controller's answer).
     *
     * <p>A pending hero import (guidance-hero-import) is consumed HERE,
     * inside this transaction: the import runs first, and only a
     * SUCCESSFUL import links the asset. Any failure — a refused URL,
     * an unfetchable host, an oversized body, a non-image body, an
     * over-pixel body, a storage failure — propagates, the transaction
     * rolls back, and the post stays a DRAFT with the URL intact.
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     * @throws HeroImportRefusedException      400 — the import was refused by policy /
     *                                          the URL is broken
     * @throws HeroImportUnreachableException  502 — the import could not be fetched
     * @throws MediaTooLargeException          413 — the import exceeded the cap
     * @throws UnsupportedImageException       400 — the import is not a readable image
     */
    @Transactional
    public void publish(long adminId, long id) {
        GuidancePost post = requirePost(id);
        boolean wasPublished = post.isPublished();
        boolean hadPendingImport = post.getHeroImportUrl() != null;
        if (hadPendingImport) {
            MediaAsset imported = heroImport.importHero(adminId, post.getHeroImportUrl());
            post.linkImportedHero(imported.getId());
        }
        if (wasPublished && !hadPendingImport) {
            // Idempotent no-op: no save, NO audit row (the D4 rule).
            return;
        }
        if (!wasPublished) {
            post.publish(clock.instant());
        }
        posts.save(post);
        if (!wasPublished) {
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
        // The post's translation rows die with it (the V26 FK cascades in the
        // DB; the explicit delete keeps the in-memory twin honest too, D8).
        translations.deleteAllByPostId(post.getId());
        posts.delete(post);
    }

    // ------------------------------------------------------------- guards

    /**
     * The reader's requested locale, or the configured default when the
     * parameter is ABSENT ({@code null}). A PRESENT but blank value is a
     * 400 (an explicit {@code ?locale=} is a request, not an absence), and
     * a value longer than the VARCHAR(5) column is a 400 too: it cannot
     * match any stored row, so the 400 is the honest answer instead of a
     * silent empty list. The value is trimmed — a stray space is a client
     * typo, not a locale.
     */
    private String resolveLocale(String locale) {
        if (locale == null) {
            return defaultLocale;
        }
        String trimmed = locale.trim();
        if (trimmed.isEmpty()) {
            throw new GuidanceValidationException("locale must not be blank");
        }
        if (trimmed.length() > MAX_LOCALE_LENGTH) {
            throw new GuidanceValidationException("locale must be at most " + MAX_LOCALE_LENGTH + " characters");
        }
        return trimmed;
    }

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
     * Alt mandatory iff a hero is set — a hero being a stored-asset
     * reference OR a pending import URL (both directions 400; the V23
     * CHECK mirrors the reference half). A hero id must name a live
     * asset (unknown id → 404).
     */
    private void requireHeroPairing(Long heroImageId, String heroImageAlt, String heroImportUrl) {
        boolean hasHero = heroImageId != null || heroImportUrl != null;
        boolean hasAlt = heroImageAlt != null && !heroImageAlt.isBlank();
        if (hasHero && !hasAlt) {
            throw new GuidanceValidationException("heroImageAlt is required when a hero image is set");
        }
        if (!hasHero && hasAlt) {
            throw new GuidanceValidationException(
                    "heroImageAlt requires a hero image (heroImageId or heroImportUrl)");
        }
        if (heroImageId != null && mediaAssets.findById(heroImageId).isEmpty()) {
            throw new GuidanceNotFoundException(ASSET_NOT_FOUND_MESSAGE);
        }
    }

    /**
     * The admin-supplied pending-import URL, normalized (trimmed) and
     * shape-checked BEFORE it is stored (the fetch-time policy
     * re-validates everything — this is the early 400 that saves the
     * admin a publish round-trip): a parseable absolute http(s) URL
     * with a host and no embedded credentials. Blank means "no pending
     * import" (null) — clearing a hero URL is a null, like clearing the
     * hero id.
     *
     * @throws GuidanceValidationException 400 — a malformed, non-http(s),
     *                                       hostless or credentialed URL
     */
    private static String normalizeImportUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.length() > MAX_HERO_IMPORT_URL_LENGTH) {
            throw new GuidanceValidationException("heroImportUrl must be at most "
                    + MAX_HERO_IMPORT_URL_LENGTH + " characters");
        }
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException e) {
            throw new GuidanceValidationException("heroImportUrl must be a valid http(s) URL");
        }
        if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new GuidanceValidationException(
                    "heroImportUrl must use http or https (got '"
                            + (uri.getScheme() == null ? "<none>" : uri.getScheme()) + "')");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new GuidanceValidationException("heroImportUrl must name a host");
        }
        if (uri.getUserInfo() != null) {
            throw new GuidanceValidationException(
                    "heroImportUrl must not carry credentials (user:pass@)");
        }
        return trimmed;
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

    // ------------------------------------------------- translation linking (bilingual-guidance)

    /**
     * Creates a translation for a post in a locale it does not already have.
     * The slug is generated from the title when omitted (D5, the same shape
     * rules); an explicit slug is validated and must be free WITHIN the locale
     * (409 naming it). The stored body is the sanitizer output (D2).
     *
     * @throws GuidanceNotFoundException   404 — unknown post id
     * @throws GuidanceValidationException 400 — missing/oversized title or body,
     *                                     a malformed custom slug, a blank or
     *                                     over-long locale
     * @throws GuidanceValidationException 409 — the post already has a
     *                                     translation in this locale
     * @throws SlugAlreadyUsedException    409 — the (locale, slug) pair is taken
     */
    @Transactional
    public GuidanceTranslation createTranslation(long postId, String locale, String slug,
                                                 String title, String body, String heroImageAlt) {
        requirePost(postId);
        Instant now = clock.instant();
        String cleanLocale = requireLocale(locale);
        String cleanTitle = requireTitle(title);
        String cleanBody = sanitize(body);
        String cleanAlt = heroImageAlt == null ? null : heroImageAlt.trim();
        if (translations.existsByPostIdAndLocale(postId, cleanLocale)) {
            throw new GuidanceValidationException(
                    "post already has a " + cleanLocale + " translation — update or delete it first");
        }
        String finalSlug = slug == null || slug.isBlank()
                ? nextGeneratedTranslationSlug(cleanLocale, cleanTitle)
                : resolveTranslationSlug(cleanLocale, slug, null);
        return translations.save(GuidanceTranslation.forPost(postId, cleanLocale, finalSlug,
                cleanTitle, cleanBody, cleanAlt, now));
    }

    /**
     * Full replace of a translation's content (the locale is the KEY — it never
     * moves here). The slug is kept when omitted; the body is re-sanitized (D2).
     *
     * @throws GuidanceNotFoundException   404 — unknown post, or no translation
     *                                     in this locale
     * @throws GuidanceValidationException 400 — same vocabulary as create
     * @throws SlugAlreadyUsedException    409 — the given (locale, slug) is held
     *                                     by another translation
     */
    @Transactional
    public GuidanceTranslation updateTranslation(long postId, String locale, String slug,
                                                 String title, String body, String heroImageAlt) {
        requirePost(postId);
        String cleanLocale = requireLocale(locale);
        GuidanceTranslation translation = translations.findByPostIdAndLocale(postId, cleanLocale)
                .orElseThrow(() -> new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE));
        Instant now = clock.instant();
        String cleanTitle = requireTitle(title);
        String cleanBody = sanitize(body);
        String cleanAlt = heroImageAlt == null ? null : heroImageAlt.trim();
        String finalSlug = resolveTranslationSlug(cleanLocale, slug, translation.getSlug());
        translation.update(finalSlug, cleanTitle, cleanBody, cleanAlt, now);
        return translations.save(translation);
    }

    /**
     * Deletes a post's translation in a locale. A post's HOME-locale
     * translation cannot be deleted — it is the post's own content (unpublish
     * or delete the post instead). Deleting a linked locale's translation
     * simply unlinks it.
     *
     * @throws GuidanceNotFoundException   404 — unknown post, or no translation
     *                                     in this locale
     * @throws GuidanceValidationException 400 — deleting the home-locale translation
     */
    @Transactional
    public void deleteTranslation(long postId, String locale) {
        GuidancePost post = requirePost(postId);
        String cleanLocale = requireLocale(locale);
        GuidanceTranslation translation = translations.findByPostIdAndLocale(postId, cleanLocale)
                .orElseThrow(() -> new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE));
        if (cleanLocale.equals(post.getLocale())) {
            throw new GuidanceValidationException(
                    "the post's own-locale (" + cleanLocale + ") translation cannot be deleted — "
                            + "unpublish or delete the post instead");
        }
        translations.delete(translation);
    }

    /** A post's translations, in locale order (the admin detail / alternates editor). */
    @Transactional(readOnly = true)
    public List<GuidanceTranslation> listTranslations(long postId) {
        requirePost(postId);
        return translations.findAllByPostId(postId);
    }

    /**
     * The "attach an existing post as a translation" convenience: re-parents
     * the source post's home-locale translation onto the target post. It is a
     * MOVE, not a copy — the (locale, slug) pair travels with the row, so the
     * V26 uniqueness holds and the source stops claiming the slug publicly
     * (the source is left a shell with no translations, which the admin may
     * hard-delete). The target must not already have a translation in that
     * locale (409).
     *
     * @throws GuidanceNotFoundException   404 — unknown target or source post
     * @throws GuidanceValidationException 400 — source == target
     * @throws GuidanceValidationException 409 — the target already has a
     *                                     translation in the source's locale
     */
    @Transactional
    public GuidanceTranslation attachExistingPostAsTranslation(long targetPostId, long sourcePostId) {
        if (targetPostId == sourcePostId) {
            throw new GuidanceValidationException("source and target must be different posts");
        }
        requirePost(targetPostId);
        GuidancePost source = requirePost(sourcePostId);
        String locale = source.getLocale();
        if (translations.existsByPostIdAndLocale(targetPostId, locale)) {
            throw new GuidanceValidationException(
                    "target already has a " + locale + " translation — update or delete it first");
        }
        Instant now = clock.instant();
        return translations.findByPostIdAndLocale(sourcePostId, locale)
                .map(t -> {
                    t.reparentTo(targetPostId, now);
                    return translations.save(t);
                })
                .orElseGet(() -> translations.save(GuidanceTranslation.forPost(
                        targetPostId, locale, source.getSlug(), source.getTitle(),
                        source.getBodyHtml(), source.getHeroImageAlt(), now)));
    }

    /**
     * Keeps the post's own-locale translation in sync with its home content
     * columns (the V26 invariant: every post owns at least one translation
     * row, in its own locale). An existing row is upserted, not duplicated.
     */
    private void saveOwnTranslation(GuidancePost post, Instant now) {
        translations.findByPostIdAndLocale(post.getId(), post.getLocale())
                .ifPresentOrElse(
                        existing -> {
                            existing.update(post.getSlug(), post.getTitle(), post.getBodyHtml(),
                                    post.getHeroImageAlt(), now);
                            translations.save(existing);
                        },
                        () -> translations.save(GuidanceTranslation.forPost(post.getId(),
                                post.getLocale(), post.getSlug(), post.getTitle(),
                                post.getBodyHtml(), post.getHeroImageAlt(), now)));
    }

    /** Locale required, trimmed, and bounded by the VARCHAR(5) column (400). */
    private String requireLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            throw new GuidanceValidationException("locale is required");
        }
        String trimmed = locale.trim();
        if (trimmed.length() > MAX_LOCALE_LENGTH) {
            throw new GuidanceValidationException(
                    "locale must be at most " + MAX_LOCALE_LENGTH + " characters");
        }
        return trimmed;
    }

    /**
     * A translation's admin-supplied slug, used exactly as given: validated to
     * the generated shape (400) and refused on a collision within the locale
     * (409 naming the slug). A blank slug keeps the current one (an update
     * no-op); a slug equal to the current one is not a collision.
     */
    private String resolveTranslationSlug(String locale, String supplied, String currentSlug) {
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
        if (translations.existsByLocaleAndSlug(locale, slug)) {
            throw new SlugAlreadyUsedException(slug);
        }
        return slug;
    }

    /**
     * The auto-generated translation slug: from the title; a collision WITHIN
     * the locale takes {@code -2}, {@code -3}, ... and takes the first free value.
     */
    private String nextGeneratedTranslationSlug(String locale, String title) {
        String base = SlugFactory.of(title);
        if (!translations.existsByLocaleAndSlug(locale, base)) {
            return base;
        }
        for (int suffix = 2; ; suffix++) {
            String candidate = base + "-" + suffix;
            if (!translations.existsByLocaleAndSlug(locale, candidate)) {
                return candidate;
            }
        }
    }
}
