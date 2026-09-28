package ee.sheltermap.guidance;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.domain.PublicGuidanceView;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * The crisis guidance authoring surface. The service keeps the {@code
 * @Transactional} boundary of every guidance operation and the
 * post-level writes (create / update / the locale-scoped update); the
 * feature's other seams live in collaborators it constructs from its own
 * repositories — the unit suite freezes this constructor's argument
 * list, so none is an injected bean: {@link GuidanceOrderingService}
 * (the reorder writes), {@link GuidanceLifecycleService} (publish /
 * unpublish / delete and their audit rows),
 * {@link GuidanceTranslationService} (the per-locale translation rows)
 * and {@link HeroSaveResolver} (the save-time hero decision).
 *
 * <p>Lifecycle: a post is created DRAFT (PUBLISHED when the create call
 * explicitly asks, so a one-shot "write and publish" is possible);
 * {@link #publish} stamps {@code publishedAt} from the injected Clock,
 * {@link #unpublish} clears it (a re-publish stamps a FRESH instant — the
 * instruction re-issued today outranks last week's text). Publish and
 * unpublish are idempotent no-ops in the already-there state, and a no-op
 * writes NO audit row (the suspension idiom). Hard delete requires an
 * explicit {@code confirm} (400 without it); deleting a post does not
 * touch its media assets (they belong to the library) and its audit rows
 * keep their label snapshot.
 *
 * <p>Every body write — create AND update — stores the {@link
 * BodySanitizer} OUTPUT: the stored value is the same value every future
 * reader gets, so no rendering path can skip the sanitizer. The admin
 * read returns the stored (sanitized) HTML.
 *
 * <p>Slugs: generated from the title when the request omits one —
 * auto-generated collisions take {@code -2}, {@code -3}, ...; an
 * admin-supplied slug is validated to the generated shape and used EXACTLY
 * as given, a collision answering 409 naming the slug (never silently
 * rewritten). Uniqueness spans drafts and published posts alike (the
 * UNIQUE constraint, {@code existsBySlug}).
 *
 * <p>Ordering lives in the repository contract: the admin list is the
 * stored manual order ({@code sortOrder} ascending, id descending
 * tie-break — the live preview of the public order), the public list
 * PUBLISHED-only, pinned first, then {@code sortOrder} ascending, with the
 * {@code publishedAt}/{@code id} tie-breakers (they keep the order total
 * and deterministic for any row state — {@code sortOrder} is not
 * uniqueness-constrained). Publishing or unpublishing NEVER moves a post:
 * its slot IS its {@code sortOrder}. The reorder WRITES themselves (the
 * atomic full-list renumber, the locale-scoped slot-preserving rewrite)
 * live in {@link GuidanceOrderingService} — this service's
 * {@code reorder}/{@code reorderInLocale} keep the transaction boundary
 * and delegate.
 *
 * <p>Locale scope: the admin UI edits ONE language at a time (its active
 * UI language), so the admin list can be scoped to a locale — only the
 * posts that HAVE content in it are returned. A post "has content in" a
 * locale when it carries a translation row there, or when its HOME locale
 * is the one requested (the post row's own columns are that locale's
 * content). Every post owns its own-locale translation row, so a post
 * visible only through its home columns is a missing-row anomaly the
 * scoped read still surfaces, never a 500. {@code sort_order} is per
 * POST, shared by every translation, so the reorders keep the other
 * languages' slots untouched and lose no post.
 *
 * <p>Hero import: a post's hero may be given as an admin-supplied http(s)
 * URL in {@code heroImportUrl} instead of a library reference; the
 * decision (and its 400s) lives in {@link HeroSaveResolver}.
 * {@link #create}, {@link #update} and {@link #updateInLocale} run
 * {@link HeroImageImportService} at SAVE time — draft or published alike
 * — and link the stored asset as the hero. A re-save with the SAME url whose
 * import already produced the current hero is idempotent (no re-fetch); a
 * CHANGED url re-imports. A failed fetch or validation NEVER blocks the
 * save: the post is stored with the url kept (retryable on the next save)
 * and the failure surfaced against the hero field in the write response
 * ({@link SavedPost#heroImportError()}), the hero falling back to the
 * request's library reference or the previously stored one — a hero is
 * always a validated stored asset or nothing, so no page ever renders
 * from a URL the server has not fetched and validated. {@link #publish}
 * is a pure stamp — it never imports; publishing is never the moment an
 * image can fail for the first time, so no post is unpublishable because
 * of an image problem.
 *
 * <p>Audit: publish / unpublish / delete (the lifecycle, in
 * {@link GuidanceLifecycleService}) call
 * {@link ModerationAuditLog#recordLabeled} inside the {@code
 * @Transactional} methods with the label
 * {@code Guidance post "<title>" (<slug>)} — the same transaction commits
 * action and row, and a rolled-back action leaves no row.
 *
 * <p>Authorization is the controller's job — the same fresh per-request
 * ADMIN kind lookup as the admin moderation API; this service assumes an
 * authenticated admin and receives the acting user id.
 */
@Service
public class GuidanceService {

    /** The uniform 404 message — a draft slug and an unknown slug answer the SAME 404. */
    public static final String POST_NOT_FOUND_MESSAGE = "Guidance post not found";

    /** The title column width ({@code guidance_posts.title VARCHAR(255)}) — home: {@link GuidanceValidation}. */
    public static final int MAX_TITLE_LENGTH = GuidanceValidation.MAX_TITLE_LENGTH;

    /**
     * The locale column width ({@code guidance_posts.locale VARCHAR(5)})
     * — the service bound; the constant's home is
     * {@link GuidanceValidation}, this reference keeps the pre-extraction
     * public surface intact.
     */
    public static final int MAX_LOCALE_LENGTH = GuidanceValidation.MAX_LOCALE_LENGTH;

    /**
     * The body's searchable text (admin-guidance-search) — moved to
     * {@link GuidanceSearch}; this delegate keeps the pre-extraction
     * public surface (the {@code GuidanceServiceTest} seam) intact.
     */
    public static String searchableBody(String bodyHtml) {
        return GuidanceSearch.searchableBody(bodyHtml);
    }

    /**
     * The admin list's search match (admin-guidance-search) — moved to
     * {@link GuidanceSearch}; this delegate keeps the pre-extraction
     * public surface (the {@code GuidanceServiceTest} seam) intact.
     */
    public static boolean matchesSearch(String title, String bodyHtml, String needle) {
        return GuidanceSearch.matchesSearch(title, bodyHtml, needle);
    }

    /** The pending-import URL column width ({@code hero_import_url VARCHAR(2048)}) — home: {@link HeroSaveResolver}. */
    public static final int MAX_HERO_IMPORT_URL_LENGTH = HeroSaveResolver.MAX_HERO_IMPORT_URL_LENGTH;

    private final GuidancePostRepository posts;
    private final Clock clock;
    /** The app's primary language (mirrors the frontend's DEFAULT_LOCALE). */
    private final String defaultLocale;
    /** The per-locale translation rows. */
    private final GuidanceTranslationRepository translations;
    /**
     * The feature's seams — the reorder writes, the post lifecycle, the
     * translation-row writes, and the save-time hero decision, each
     * constructed from this service's own collaborators (the unit suite
     * freezes this constructor's argument list, so the seams are
     * components, not injected beans).
     */
    private final GuidanceOrderingService ordering;
    private final HeroSaveResolver heroResolver;
    private final GuidanceTranslationService translationService;
    private final GuidanceLifecycleService lifecycle;

    public GuidanceService(GuidancePostRepository posts,
                           MediaAssetRepository mediaAssets,
                           ModerationAuditLog audit,
                           Clock clock,
                           @Value("${app.guidance.default-locale:en}") String defaultLocale,
                           HeroImageImportService heroImport,
                           GuidanceTranslationRepository translations) {
        this.posts = Objects.requireNonNull(posts, "posts");
        MediaAssetRepository media = Objects.requireNonNull(mediaAssets, "mediaAssets");
        ModerationAuditLog auditLog = Objects.requireNonNull(audit, "audit");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.defaultLocale = Objects.requireNonNull(defaultLocale, "defaultLocale");
        HeroImageImportService importer = Objects.requireNonNull(heroImport, "heroImport");
        this.translations = Objects.requireNonNull(translations, "translations");
        this.ordering = new GuidanceOrderingService(posts, translations, auditLog);
        this.heroResolver = new HeroSaveResolver(media, importer);
        this.translationService = new GuidanceTranslationService(translations, clock);
        this.lifecycle = new GuidanceLifecycleService(posts, translations, auditLog, clock);
    }

    /**
     * One save's outcome (the save-time hero import): the stored post and
     * the import's failure — {@code null} when no import ran on this
     * save or it succeeded. A non-null error NEVER blocked the save: the
     * post was stored anyway, the URL kept for a retry on the next save,
     * the hero fallen back (the request's library reference, or the
     * previously stored one).
     */
    public record SavedPost(GuidancePost post, String heroImportError) {
    }

    // ------------------------------------------------------------- reads

    /**
     * The public index: PUBLISHED-only and ONE locale — both filters live
     * in the query, so no code path can leak a draft or the other
     * language's text. Pinned first, then {@code sortOrder} ascending
     * (the stored manual order), then {@code publishedAt} descending and
     * {@code id} descending as the deterministic tie-breakers.
     * {@code locale} is the reader's requested language or {@code null}
     * for the parameter-absent call, which falls back to the configured
     * default locale (existing callers keep their behaviour). A PRESENT
     * but blank or over-long value is a 400
     * ({@link GuidanceValidation#resolveLocale}). Empty (nothing published
     * in that locale) is an empty list, never an error.
     *
     * @throws GuidanceValidationException 400 — a blank or over-long locale
     */
    @Transactional(readOnly = true)
    public List<PublicGuidanceView> listPublic(String locale) {
        String requested = GuidanceValidation.resolveLocale(locale, defaultLocale);
        // The translation rows of PUBLISHED posts in the locale, already in
        // the public index order (pinned first, sortOrder asc, publishedAt
        // desc, id desc). The posts are batch-loaded in ONE query over the
        // rows' post ids — one read for the hero image, pin and
        // publication stamp, never a per-row fetch.
        List<GuidanceTranslation> rows = translations.findPublishedInLocale(requested);
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> postIds = rows.stream().map(GuidanceTranslation::getPostId).distinct().toList();
        Map<Long, GuidancePost> postById = new HashMap<>();
        for (GuidancePost post : posts.findByIds(postIds)) {
            postById.put(post.getId(), post);
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
     * The admin list: every post, drafts included, in the stored manual
     * order ({@code sortOrder} ascending, id descending tie-break) — the
     * table is the live preview of the public order.
     */
    @Transactional(readOnly = true)
    public List<GuidancePost> listForAdmin() {
        return posts.findAllForAdmin();
    }

    /**
     * The admin list scoped to ONE locale: only the posts that HAVE
     * content in it — a translation row in the locale, or the post's home
     * locale being the one requested (the home columns are that locale's
     * content). A post that exists in another locale only does NOT appear
     * — that is the filter, not an error. An empty scope (nothing in the
     * locale) is an empty list, never an error. The order is the GLOBAL
     * stored manual order (sortOrder asc, publishedAt desc nulls last, id
     * desc) — the same order the locale-scoped reorder walks, so the
     * rendered rows ARE the slots.
     *
     * @param locale the requested locale, resolved by the caller through
     *               {@link #optionalAdminLocale(String)} (400 on a present
     *               but blank / over-long value)
     * @throws GuidanceValidationException 400 — a blank or over-long locale
     */
    @Transactional(readOnly = true)
    public List<GuidancePost> listForAdmin(String locale) {
        String requested = GuidanceValidation.requireLocale(locale);
        Set<Long> rowPosts = new LinkedHashSet<>();
        for (GuidanceTranslation row : translations.findAllByLocale(requested)) {
            rowPosts.add(row.getPostId());
        }
        List<GuidancePost> visible = new ArrayList<>();
        for (GuidancePost post : posts.findAllInStoredGlobalOrder()) {
            if (rowPosts.contains(post.getId()) || post.getLocale().equals(requested)) {
                visible.add(post);
            }
        }
        return visible;
    }

    /**
     * The translations in ONE locale, keyed by the owning post id — the
     * content source for the locale-scoped admin reads (the list's per-row
     * title/slug/body/alt and the scoped detail). One query, no per-post
     * loop. Posts whose HOME locale is the requested one but which carry
     * no translation row are ABSENT from the map: the caller serves their
     * home columns instead (the missing-row anomaly, handled without
     * failing).
     */
    @Transactional(readOnly = true)
    public Map<Long, GuidanceTranslation> translationsInLocale(String locale) {
        String requested = GuidanceValidation.requireLocale(locale);
        Map<Long, GuidanceTranslation> byPost = new LinkedHashMap<>();
        for (GuidanceTranslation row : translations.findAllByLocale(requested)) {
            byPost.put(row.getPostId(), row);
        }
        return byPost;
    }

    /**
     * Every translation row, keyed by the owning post id (the UNscoped
     * admin list's search: with no {@code ?locale=} the search matches
     * ANY of the post's locale content, any translation row's title or
     * body). One query, no per-post loop. A post's HOME columns are
     * matched separately by the caller (the home row is kept in sync with
     * the columns, but the missing-row anomaly is still covered).
     */
    @Transactional(readOnly = true)
    public Map<Long, List<GuidanceTranslation>> translationsByPost() {
        Map<Long, List<GuidanceTranslation>> byPost = new LinkedHashMap<>();
        for (GuidanceTranslation row : translations.findAll()) {
            byPost.computeIfAbsent(row.getPostId(), k -> new ArrayList<>()).add(row);
        }
        return byPost;
    }

    /**
     * The post's one translation in a locale (the scoped admin detail /
     * update target). Empty when the post has no row in the locale — the
     * caller then falls back to the home columns (when the post's home IS
     * the locale) or answers 404 (an unknown post or locale, the
     * translations vocabulary).
     */
    @Transactional(readOnly = true)
    public Optional<GuidanceTranslation> translationInLocale(long postId, String locale) {
        requirePost(postId);
        return translations.findByPostIdAndLocale(postId, GuidanceValidation.requireLocale(locale));
    }

    /**
     * The public detail read: PUBLISHED-only by slug, in ONE locale. A
     * slug held by a DRAFT answers the SAME 404 as an unknown slug — the
     * response must not reveal that a draft exists.
     *
     * <p>A slug whose PUBLISHED post lives in ANOTHER locale answers the
     * same 404: a bilingual site must not serve the other language's text
     * at a URL — a reader who switches language must not land on a post
     * that is not in their language (the reader's own re-fetch after the
     * switch is what resolves the slug in their language). A
     * parameter-absent call resolves against the default locale, so
     * existing links keep working. A PRESENT but blank or over-long
     * locale is a 400.
     *
     * @throws GuidanceNotFoundException     404 — unknown slug, a draft slug,
     *                                       or a post in another locale
     * @throws GuidanceValidationException   400 — a blank or over-long locale
     */
    @Transactional(readOnly = true)
    public PublicGuidanceView getByPublicSlug(String slug, String locale) {
        String requested = GuidanceValidation.resolveLocale(locale, defaultLocale);
        GuidancePost post = requirePublishedPostForSlug(slug);
        List<GuidanceTranslation> localeRows = translations.findAllByPostId(post.getId());
        // Serve the requested locale if the post has it; otherwise serve the
        // default-locale translation with the fallback flag (a 200, never a
        // 404 — the language switch must not dead-end); otherwise 404.
        GuidanceTranslation served = findByLocale(localeRows, requested).orElse(null);
        boolean fallback = false;
        if (served == null) {
            served = findByLocale(localeRows, defaultLocale).orElse(null);
            fallback = served != null;
        }
        if (served == null) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        return PublicGuidanceView.of(post, served, true, slugsByLocale(localeRows), fallback);
    }

    private static Optional<GuidanceTranslation> findByLocale(List<GuidanceTranslation> rows, String locale) {
        return rows.stream().filter(r -> r.getLocale().equals(locale)).findFirst();
    }

    /**
     * The published post this slug names — or the same 404 an unknown
     * slug gets. A slug held by NO row, by rows of MORE THAN ONE post (a
     * data anomaly) or by a DRAFT post must not be distinguishable in the
     * response, so one answer covers all three: the response must not
     * reveal that a draft exists.
     */
    private GuidancePost requirePublishedPostForSlug(String slug) {
        Set<Long> postIds = new LinkedHashSet<>();
        for (GuidanceTranslation row : translations.findBySlug(slug)) {
            postIds.add(row.getPostId());
        }
        if (postIds.size() != 1) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        GuidancePost post = requirePost(postIds.iterator().next());
        if (!post.isPublished()) {
            throw new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE);
        }
        return post;
    }

    /** Every locale's slug for the post — the alternates the detail view offers. */
    private static Map<String, String> slugsByLocale(List<GuidanceTranslation> rows) {
        Map<String, String> slugs = new LinkedHashMap<>();
        for (GuidanceTranslation row : rows) {
            slugs.put(row.getLocale(), row.getSlug());
        }
        return slugs;
    }

    /** The admin detail read — id-keyed (the admin form edits by id); unknown id → 404. */
    @Transactional(readOnly = true)
    public GuidancePost getById(long id) {
        return requirePost(id);
    }

    // ------------------------------------------------------------- writes

    /**
     * Create a post: DRAFT by default, PUBLISHED when the request
     * explicitly asks (the one-shot "write and publish"). The slug is
     * generated from the title when omitted (auto collisions take
     * {@code -2}, {@code -3}, ...); an explicit slug is validated and
     * used exactly as given (collision → 409). The stored body is the
     * sanitizer output. A hero import URL ({@code heroImportUrl}) is
     * fetched, validated and stored AT SAVE — a draft and the one-shot
     * PUBLISHED create alike: a successful import links the asset as the
     * hero (superseding any {@code heroImageId}); a failed one never
     * blocks the create — the post is stored in the requested status with
     * the URL kept and the error in {@link SavedPost#heroImportError()}.
     *
     * @throws GuidanceValidationException 400 — missing/oversized title or body, a
     *                                     malformed custom slug, a malformed heroImportUrl,
     *                                     alt without a hero (or a hero without alt)
     * @throws SlugAlreadyUsedException    409 — an admin-supplied slug another post holds
     * @throws GuidanceNotFoundException   404 — a heroImageId with no such asset
     */
    @Transactional
    public SavedPost create(long adminId, String title, String slug, String body,
                            String locale, boolean pinned, Long heroImageId,
                            String heroImageAlt, String heroImportUrl,
                            GuidanceStatus requestedStatus) {
        Instant now = clock.instant();
        GuidanceValidation.CleanedContent content = GuidanceValidation.cleanedContent(title, body, heroImageAlt);
        String cleanLocale = GuidanceValidation.localeOrDefault(locale, defaultLocale);
        String cleanImportUrl = heroResolver.normalizeImportUrl(heroImportUrl);
        heroResolver.requireHeroPairing(heroImageId, heroImageAlt, cleanImportUrl);
        String finalSlug = slug == null || slug.isBlank()
                ? GuidanceValidation.nextGeneratedSlug(content.title(), posts::existsBySlug)
                : GuidanceValidation.resolveSuppliedSlug(slug, null, posts::existsBySlug);
        // The save-time hero import runs AFTER every write-time validation
        // above (400/404/409) — a doomed create never spends a network fetch.
        HeroSaveResolver.HeroResolution hero =
                heroResolver.resolveHeroOnSave(adminId, null, heroImageId, cleanImportUrl);

        GuidancePost post = GuidancePost.draft(finalSlug, content.title(), content.bodyHtml(),
                cleanLocale, pinned, hero.heroImageId(), content.heroAlt(), hero.heroImportUrl(),
                posts.maxSortOrder() + 1, adminId, now);
        if (requestedStatus == GuidanceStatus.PUBLISHED) {
            // One-shot "write and publish" — the same stamp the publish
            // endpoint would write. This is a CREATE, not a lifecycle
            // transition: no separate publish audit row. A failed import
            // does not demote the requested status — the post is stored as
            // asked, hero-less where the import failed.
            post.publish(now);
        }
        GuidancePost saved = posts.save(post);
        // Every post owns at least one translation row — its own — so the
        // public reads (which key off translations) see it in its own locale.
        translationService.saveOwnTranslation(saved, now);
        return new SavedPost(saved, hero.error());
    }

    /**
     * Full replace of the editable fields: title, body, locale, pinned,
     * hero (id + alt + import URL). The slug is kept when omitted; when
     * given, it is validated and must not collide with ANOTHER post (409
     * naming the slug). The stored body is re-sanitized. The hero import
     * URL is fetched AT SAVE, draft or published alike: a changed URL
     * re-imports (the new asset supersedes the previous hero — the
     * replaced asset stays in the library); a URL whose import already
     * produced the current hero re-saves without a re-fetch; a failed
     * import never blocks the update — the post is stored with the URL
     * kept and the error in {@link SavedPost#heroImportError()}. Clearing
     * the URL (and the hero id) clears the hero (the imported asset stays
     * in the library).
     *
     * @throws GuidanceValidationException 400 — same vocabulary as {@link #create}
     * @throws SlugAlreadyUsedException    409 — the given slug is held by another post
     * @throws GuidanceNotFoundException   404 — unknown post id, or a heroImageId
     *                                     with no such asset
     */
    @Transactional
    public SavedPost update(long adminId, long id, String title, String slug, String body,
                            String locale, boolean pinned, Long heroImageId,
                            String heroImageAlt, String heroImportUrl) {
        GuidancePost post = requirePost(id);
        Instant now = clock.instant();
        GuidanceValidation.CleanedContent content = GuidanceValidation.cleanedContent(title, body, heroImageAlt);
        String cleanLocale = GuidanceValidation.localeOrDefault(locale, defaultLocale);
        String cleanImportUrl = heroResolver.normalizeImportUrl(heroImportUrl);
        heroResolver.requireHeroPairing(heroImageId, heroImageAlt, cleanImportUrl);
        String finalSlug = GuidanceValidation.resolveSuppliedSlug(slug, post.getSlug(),
                posts::existsBySlug);
        String oldLocale = post.getLocale();
        // The save-time hero import — after every write-time validation, so
        // a doomed update never spends a network fetch.
        HeroSaveResolver.HeroResolution hero =
                heroResolver.resolveHeroOnSave(adminId, post, heroImageId, cleanImportUrl);

        post.update(finalSlug, content.title(), content.bodyHtml(), cleanLocale, pinned, hero.heroImageId(),
                content.heroAlt(), hero.heroImportUrl(), now);
        GuidancePost saved = posts.save(post);
        if (!oldLocale.equals(cleanLocale)) {
            // The post's home locale moved: drop the old own-locale row so
            // the post is not left "public" in a locale it no longer claims.
            translations.findByPostIdAndLocale(post.getId(), oldLocale).ifPresent(translations::delete);
        }
        // Re-sync the (possibly new) own-locale translation from the
        // post's home content.
        translationService.saveOwnTranslation(saved, now);
        return new SavedPost(saved, hero.error());
    }

    /**
     * Full replace of a post's editable fields SCOPED TO THE LOCALE BEING
     * EDITED: the admin UI always edits one language (its active UI
     * language), so the content fields (title, slug, body, hero alt) land
     * on THAT locale's translation row — while the post-level fields
     * (pinned, the hero reference, the pending import URL) are shared by
     * every translation and land on the post.
     *
     * <p>When the edit locale IS the post's home locale this is exactly
     * the unscoped {@link #update} semantics (the home columns take the
     * content and the home-locale move stays available), so an admin
     * editing in the post's own language behaves exactly as before. When
     * it is NOT, the home content columns are untouched (they belong to
     * the home edit) and the post's home locale may NOT move — a blank
     * {@code homeLocale} keeps the current one, a different one is a 400
     * (moving the home is the home-locale edit's job). A missing
     * translation row in the edit locale is a 404 (the unknown-post-or-
     * locale vocabulary — the admin list only ever surfaces posts that
     * have content in the locale, so the editor cannot reach this state).
     *
     * <p>Hero pairing (the CHECK on the post row): the REQUEST's alt (the
     * edit locale's alt) validates against the request's hero exactly as
     * before; the post row's OWN alt keeps its home value — with one
     * exception each way, forced by the CHECK and the pairing rule:
     * setting a hero on a hero-less post takes the request's alt as the
     * new home alt (the home edit can refine it later), and clearing the
     * hero nulls it. The home-locale translation row is re-synced from
     * the post columns in that case.
     *
     * @throws GuidanceNotFoundException   404 — unknown post, a heroImageId
     *                                     with no such asset, or no
     *                                     translation in the edit locale
     * @throws GuidanceValidationException 400 — same vocabulary as {@link #update},
     *                                     plus a home-locale move through a
     * foreign-locale edit
     * @throws SlugAlreadyUsedException    409 — the given (locale, slug) is
     *                                     held by another translation
     */
    @Transactional
    public SavedPost updateInLocale(long adminId, long id, String editLocale, String title, String slug,
                                    String body, String homeLocale, boolean pinned,
                                    Long heroImageId, String heroImageAlt,
                                    String heroImportUrl) {
        GuidancePost post = requirePost(id);
        String validatedEditLocale = GuidanceValidation.requireLocale(editLocale);
        if (validatedEditLocale.equals(post.getLocale())) {
            // Editing in the post's own language: the unscoped full replace
            // (home columns + home-locale move + home row sync).
            return update(adminId, id, title, slug, body, homeLocale, pinned, heroImageId,
                    heroImageAlt, heroImportUrl);
        }
        // A foreign-locale edit never moves the home: a blank declaration
        // keeps the current home, a different one is a 400.
        String declaredHome = homeLocale == null || homeLocale.isBlank()
                ? post.getLocale()
                : homeLocale.trim();
        if (!declaredHome.equals(post.getLocale())) {
            throw new GuidanceValidationException(
                    "the post's home locale (" + post.getLocale() + ") cannot change while "
                            + "editing a " + validatedEditLocale + " translation — the home locale moves "
                            + "only through the post's own-locale edit");
        }
        // The content target, resolved BEFORE anything is written (fail
        // first): a 404 when the post has no row in the edit locale. A
        // foreign-locale save imports a hero URL exactly like the
        // home-locale one — the hero reference is post-level, shared by
        // every translation.
        GuidanceTranslation translation = translations.findByPostIdAndLocale(id, validatedEditLocale)
                .orElseThrow(() -> new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE));
        Instant now = clock.instant();
        GuidanceValidation.CleanedContent content = GuidanceValidation.cleanedContent(title, body, heroImageAlt);
        String cleanImportUrl = heroResolver.normalizeImportUrl(heroImportUrl);
        heroResolver.requireHeroPairing(heroImageId, heroImageAlt, cleanImportUrl);
        boolean hasHero = heroImageId != null || cleanImportUrl != null;
        // The post row's OWN alt (the home alt) moves with the hero — see
        // HeroSaveResolver.homeAltAfterHeroChange.
        String oldHomeAlt = post.getHeroImageAlt();
        String postAlt = HeroSaveResolver.homeAltAfterHeroChange(oldHomeAlt, hasHero, content.heroAlt());
        HeroSaveResolver.HeroResolution hero =
                heroResolver.resolveHeroOnSave(adminId, post, heroImageId, cleanImportUrl);
        post.update(post.getSlug(), post.getTitle(), post.getBodyHtml(), post.getLocale(),
                pinned, hero.heroImageId(), postAlt, hero.heroImportUrl(), now);
        GuidancePost saved = posts.save(post);
        if (!Objects.equals(oldHomeAlt, postAlt)) {
            // The home alt moved with the hero: re-sync the home row (the
            // home translation mirrors the post's home columns).
            translationService.saveOwnTranslation(saved, now);
        }
        // The content lands on the edit locale's translation row (the row
        // was resolved above, before any write).
        String finalSlug = GuidanceValidation.resolveSuppliedSlug(slug, translation.getSlug(),
                candidate -> translations.existsByLocaleAndSlug(validatedEditLocale, candidate));
        translation.update(finalSlug, content.title(), content.bodyHtml(), content.heroAlt(), now);
        translations.save(translation);
        return new SavedPost(saved, hero.error());
    }

    /**
     * Publish: stamps {@code publishedAt} from the injected Clock and
     * records GUIDANCE_PUBLISH in this transaction. Idempotent — an
     * already-published post is a no-op that writes NO audit row and
     * keeps its earlier stamp (the 204 is the controller's answer).
     *
     * <p>Publish is a pure stamp: it never fetches, validates or stores a
     * hero — a post with an unimported or failed hero URL publishes
     * exactly as stored (the URL stays for a retry on the next save), so
     * publishing is never the moment an image can fail for the first
     * time, and no post is unpublishable because of an image problem. The
     * implementation lives in {@link GuidanceLifecycleService#publish};
     * this bean method keeps the {@code @Transactional} boundary and the
     * public surface.
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     */
    @Transactional
    public void publish(long adminId, long id) {
        lifecycle.publish(adminId, id);
    }

    /**
     * Unpublish: back to DRAFT, {@code publishedAt} cleared,
     * GUIDANCE_UNPUBLISH recorded in this transaction. Idempotent —
     * unpublishing a draft is a no-op that writes NO audit row. The
     * implementation lives in {@link GuidanceLifecycleService#unpublish};
     * this bean method keeps the {@code @Transactional} boundary and the
     * public surface.
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     */
    @Transactional
    public void unpublish(long adminId, long id) {
        lifecycle.unpublish(adminId, id);
    }

    /**
     * Hard delete: requires {@code confirm} (400 without it — the admin
     * UI shows a confirm dialog). The GUIDANCE_DELETE audit row joins this
     * transaction with the label snapshot computed BEFORE the row is gone
     * — the trail stays readable after the delete. The post's media assets
     * stay in the library (uploads are inventory, not garbage). The
     * implementation lives in {@link GuidanceLifecycleService#delete};
     * this bean method keeps the {@code @Transactional} boundary and the
     * public surface.
     *
     * @throws GuidanceNotFoundException 404 — unknown id
     * @throws GuidanceValidationException 400 — confirm is false
     */
    @Transactional
    public void delete(long adminId, long id, boolean confirm) {
        lifecycle.delete(adminId, id, confirm);
    }

    /**
     * The atomic full-list reorder — the implementation lives in
     * {@link GuidanceOrderingService#reorder}; this bean method keeps the
     * {@code @Transactional} boundary (all-or-nothing renumber) and the
     * public surface.
     *
     * @throws GuidanceValidationException 400 — an unknown id, a duplicate id,
     *                                     a missing (stale) list or an empty
     *                                     list while posts exist
     */
    @Transactional
    public void reorder(long adminId, List<Long> postIds) {
        ordering.reorder(adminId, postIds);
    }

    /**
     * The atomic LOCALE-SCOPED reorder — the implementation lives in
     * {@link GuidanceOrderingService#reorderInLocale}; this bean method
     * keeps the {@code @Transactional} boundary and the public surface.
     *
     * @throws GuidanceValidationException 400 — a blank or over-long locale,
     *                                     an id not visible in the locale,
     *                                     a duplicate id, a missing (stale)
     *                                     list or an empty list while visible
     *                                     posts exist
     */
    @Transactional
    public void reorderInLocale(long adminId, String locale, List<Long> postIds) {
        ordering.reorderInLocale(adminId, locale, postIds);
    }

    // ------------------------------------------------------------- guards

    /**
     * The OPTIONAL admin locale: {@code null} when the parameter is
     * ABSENT (the admin read stays locale-blind — all languages), a 400
     * when present but blank or over-long. Moved to
     * {@link GuidanceValidation#optionalAdminLocale}; this delegate keeps
     * the pre-extraction public surface (the admin controllers call it).
     */
    public String optionalAdminLocale(String locale) {
        return GuidanceValidation.optionalAdminLocale(locale);
    }

    private GuidancePost requirePost(long id) {
        return posts.findById(id)
                .orElseThrow(() -> new GuidanceNotFoundException(POST_NOT_FOUND_MESSAGE));
    }

    // ------------------------------------------------- translation linking (bilingual-guidance)

    /**
     * Creates a translation for a post in a locale it does not already
     * have. The slug is generated from the title when omitted (the same
     * shape rules); an explicit slug is validated and must be free WITHIN
     * the locale (409 naming it). The stored body is the sanitizer
     * output. The implementation lives in
     * {@link GuidanceTranslationService#createTranslation}; this bean
     * method keeps the {@code @Transactional} boundary and the public
     * surface (the post's 404 runs before the call).
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
        return translationService.createTranslation(postId, locale, slug, title, body, heroImageAlt);
    }

    /**
     * Full replace of a translation's content (the locale is the KEY — it
     * never moves here). The slug is kept when omitted; the body is
     * re-sanitized. The implementation lives in
     * {@link GuidanceTranslationService#updateTranslation}; this bean
     * method keeps the {@code @Transactional} boundary and the public
     * surface (the post's 404 runs before the call).
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
        return translationService.updateTranslation(postId, locale, slug, title, body, heroImageAlt);
    }

    /**
     * Deletes a post's translation in a locale. A post's HOME-locale
     * translation cannot be deleted — it is the post's own content
     * (unpublish or delete the post instead). Deleting a linked locale's
     * translation simply unlinks it. The implementation lives in
     * {@link GuidanceTranslationService#deleteTranslation}; this bean
     * method keeps the {@code @Transactional} boundary and the public
     * surface (the post's 404 runs before the call).
     *
     * @throws GuidanceNotFoundException   404 — unknown post, or no translation
     *                                     in this locale
     * @throws GuidanceValidationException 400 — deleting the home-locale translation
     */
    @Transactional
    public void deleteTranslation(long postId, String locale) {
        GuidancePost post = requirePost(postId);
        translationService.deleteTranslation(postId, locale, post.getLocale());
    }

    /** A post's translations, in locale order (the admin detail / alternates editor). */
    @Transactional(readOnly = true)
    public List<GuidanceTranslation> listTranslations(long postId) {
        requirePost(postId);
        return translationService.listTranslations(postId);
    }

    /**
     * The "attach an existing post as a translation" convenience:
     * re-parents the source post's home-locale translation onto the
     * target post. It is a MOVE, not a copy — the (locale, slug) pair
     * travels with the row, so the locale-slug uniqueness holds and the
     * source stops claiming the slug publicly (the source is left a shell
     * with no translations, which the admin may hard-delete). The target
     * must not already have a translation in that locale (409). The
     * implementation lives in
     * {@link GuidanceTranslationService#attachExistingPostAsTranslation};
     * this bean method keeps the {@code @Transactional} boundary and the
     * public surface (the same-id 400 and both 404s run before the call).
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
        return translationService.attachExistingPostAsTranslation(targetPostId, requirePost(sourcePostId));
    }
}
