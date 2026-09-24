package ee.sheltermap.guidance;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceTranslation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

/**
 * The guidance manual-order writes (full-list and locale-scoped) —
 * extracted from {@link GuidanceService}:
 * the two reorder methods are the feature's ORDERING seam, and they
 * shared (duplicated) the same null/duplicate-id validation walk and
 * the same stale-list check, which is now the parameterised pair
 * {@link #walkSubmission}/{@link #verifySubmittedSet}.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code GuidanceService}
 * (whose constructor the unit suite freezes at its seven collaborators)
 * constructs it from its own repositories and the audit log, and its
 * public {@code reorder}/{@code reorderInLocale} methods remain the
 * {@code @Transactional} entry points — the transaction boundary is the
 * bean method's, so a failure mid-rewrite still rolls the whole
 * renumber back. The methods here are plain and stateless over their
 * repositories, and the unit suite drives them directly.
 *
 * <p>Ordering policy (unchanged by the extraction): the admin list is
 * the stored manual order ({@code sortOrder} ascending, id descending
 * tie-break — the live preview of the public order), the public list
 * PUBLISHED-only, pinned first, then {@code sortOrder} ascending, with
 * the {@code publishedAt}/{@code id} tie-breakers. Publishing or
 * unpublishing NEVER moves a post: its slot IS its {@code sortOrder}.
 */
public class GuidanceOrderingService {

    private final GuidancePostRepository posts;
    private final GuidanceTranslationRepository translations;
    private final ModerationAuditLog audit;

    public GuidanceOrderingService(GuidancePostRepository posts,
                                   GuidanceTranslationRepository translations,
                                   ModerationAuditLog audit) {
        this.posts = Objects.requireNonNull(posts, "posts");
        this.translations = Objects.requireNonNull(translations, "translations");
        this.audit = Objects.requireNonNull(audit, "audit");
    }

    /**
     * The atomic full-list reorder: renumbers
     * every post's {@code sortOrder} to 1..N in the submitted order in ONE
     * transaction — all-or-nothing, so a failure mid-transaction leaves no
     * partial renumbering observable (the boundary is the caller's —
     * {@link GuidanceService#reorder} is the {@code @Transactional} seam).
     *
     * <p>Validation runs FIRST, before anything is written: the list must
     * be a PERMUTATION of every current post id — an unknown id, a
     * duplicate id, or a current post missing from the list (a stale list:
     * a post was created or deleted after the admin's table was loaded)
     * is a 400 that changes nothing. An empty list is a 400 whenever any
     * post exists; with no posts at all it is a no-op. Concurrency is
     * last-write-wins (no version check — the environment provisions one
     * admin); a list that predates a concurrent create/delete is caught by
     * the set-mismatch 400, which forces a refresh instead of silently
     * dropping or duplicating a row.
     *
     * <p>Idempotence: resubmitting the current order changes no value and
     * writes NO audit row (the publish/unpublish no-op idiom). A reorder
     * that actually changes the order writes exactly ONE
     * {@code GUIDANCE_REORDER} row in the same transaction — the
     * label {@code Guidance post order} is a snapshot that stays readable.
     *
     * @throws GuidanceValidationException 400 — an unknown id, a duplicate id,
     *                                     a missing (stale) list or an empty
     *                                     list while posts exist
     */
    public void reorder(long adminId, List<Long> postIds) {
        List<Long> requested = Objects.requireNonNull(postIds, "postIds");
        // The validation walk runs BEFORE the post read (a rejected
        // submission pays no list load), as the pre-extraction order did.
        Set<Long> submitted = walkSubmission(requested);
        List<GuidancePost> current = posts.findAllForAdmin();
        Set<Long> currentIds = new LinkedHashSet<>();
        for (GuidancePost post : current) {
            currentIds.add(post.getId());
        }
        verifySubmittedSet(submitted, currentIds,
                unknown -> "postIds contains unknown post ids: " + unknown + " — refresh the list",
                "postIds is missing current posts (the list is stale — a post was created or deleted "
                        + "since the table was loaded): refresh the list and retry");
        // The current order (sortOrder asc, id desc — the findAllForAdmin
        // order): resubmitting it is a no-op that writes NO audit row.
        List<Long> currentOrder = current.stream().map(GuidancePost::getId).toList();
        if (requested.equals(currentOrder)) {
            return;
        }
        // Renumber 1..N in the submitted order — one save per post, all in
        // the caller's ONE transaction (a failure rolls the whole renumber
        // back).
        Map<Long, GuidancePost> byId = new HashMap<>();
        for (GuidancePost post : current) {
            byId.put(post.getId(), post);
        }
        int position = 1;
        for (Long id : requested) {
            GuidancePost post = byId.get(id);
            post.setSortOrder(position++);
            posts.save(post);
        }
        audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_REORDER,
                "Guidance post order", null);
    }

    /**
     * The atomic LOCALE-SCOPED reorder (admin-locale-scope): the admin UI
     * reorders the FILTERED list (the posts visible in ONE locale — a
     * subset of every post, so a permutation-of-all validation cannot
     * apply). The {@code postIds} list must be exactly the posts visible
     * in {@code locale}, in the submitted order.
     *
     * <p>The SHARED-slot algorithm ({@code sort_order} is per post, shared
     * by its translations): walk the GLOBAL stored order (sortOrder asc,
     * publishedAt desc nulls last, id desc) once — the visible posts occupy
     * SLOTS in that order — and rewrite the visible posts into exactly
     * those slots, in the submitted order. Posts not visible in the locale
     * are not touched: their {@code sort_order} keeps its value, so the
     * other languages' orders stay consistent (a post's position is
     * shared) and reordering one language cannot disturb the others' drafts
     * or published rows. No post is ever lost, and the visible language's
     * order then equals the submission.
     *
     * <p>The values stop being a contiguous 1..N after a scoped reorder —
     * by design (no unique constraint; the published_at / id tie-breakers
     * keep every read total and deterministic, and the next unscoped
     * reorder re-densifies if wanted).
     *
     * <p>Validation runs FIRST, before anything is written: an id without a
     * {@code locale} translation (or home locale) — an unknown post, a
     * post of another language — a duplicate id, or a visible post missing
     * from the list (stale) is a 400 that changes nothing; an empty list
     * is a 400 whenever any visible post exists (with none, it is a no-op).
     * Idempotence: resubmitting the current visible order changes no value
     * and writes NO audit row; a changing reorder writes exactly ONE
     * {@code GUIDANCE_REORDER} row named with the locale, in this
     * transaction.
     *
     * @throws GuidanceValidationException 400 — a blank or over-long locale,
     *                                     an id not visible in the locale,
     *                                     a duplicate id, a missing (stale)
     *                                     list or an empty list while visible
     *                                     posts exist
     */
    public void reorderInLocale(long adminId, String locale, List<Long> postIds) {
        String resolved = GuidanceValidation.requireLocale(locale);
        List<Long> requested = Objects.requireNonNull(postIds, "postIds");
        // The validation walk runs BEFORE the post read, as above.
        Set<Long> submitted = walkSubmission(requested);
        // The GLOBAL order (sortOrder asc, publishedAt desc nulls last,
        // id desc): the visible posts' slots are their positions in it.
        List<GuidancePost> current = posts.findAllInStoredGlobalOrder();
        Set<Long> visibleIds = new LinkedHashSet<>();
        for (GuidanceTranslation row : translations.findAllByLocale(resolved)) {
            visibleIds.add(row.getPostId());
        }
        for (GuidancePost post : current) {
            // A post whose HOME locale is the requested one has content in
            // it through its own columns (every post owns its
            // own-locale home row — the legacy rows may lack it).
            if (post.getLocale().equals(resolved)) {
                visibleIds.add(post.getId());
            }
        }
        List<GuidancePost> visible = new ArrayList<>();
        for (GuidancePost post : current) {
            if (visibleIds.contains(post.getId())) {
                visible.add(post);
            }
        }
        verifySubmittedSet(submitted, visibleIds,
                unknown -> "postIds contains posts without a " + resolved
                        + " translation: " + unknown + " — refresh the list",
                "postIds is missing current " + resolved
                        + " posts (the list is stale — a post was created or deleted since the "
                        + "table was loaded): refresh the list and retry");
        // The current visible order (the global order, visible only):
        // resubmitting it is a no-op that writes NO audit row.
        List<Long> currentVisibleOrder = visible.stream().map(GuidancePost::getId).toList();
        if (requested.equals(currentVisibleOrder)) {
            return;
        }
        // Rewrite the visible posts into the SAME slots (the slot values in
        // global order), in the submitted order. The slot VALUES are captured
        // first — the walk mutates the very posts it reads from (a post taking
        // another visible post's slot would otherwise hand out the NEW value
        // on the next step). One save per post, all in the caller's ONE
        // transaction (a failure rolls the whole rewrite back).
        Map<Long, GuidancePost> byId = new HashMap<>();
        for (GuidancePost post : visible) {
            byId.put(post.getId(), post);
        }
        List<Integer> slots = new ArrayList<>(visible.size());
        for (GuidancePost post : visible) {
            slots.add(post.getSortOrder());
        }
        for (int i = 0; i < requested.size(); i++) {
            GuidancePost post = byId.get(requested.get(i));
            post.setSortOrder(slots.get(i));
            posts.save(post);
        }
        audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_REORDER,
                "Guidance post order (" + resolved + ")", null);
    }

    /**
     * The null/duplicate-id validation walk of a reorder submission —
     * shared by the unscoped and locale-scoped reorders (the same 400
     * vocabulary the pre-extraction copies of the walk both carried): a
     * null id or an id listed twice is a 400 that changes nothing.
     * Returns the submitted set for the caller's {@link #verifySubmittedSet}
     * against its current (visible) ids.
     */
    private static Set<Long> walkSubmission(List<Long> requested) {
        Set<Long> submitted = new LinkedHashSet<>();
        for (Long id : requested) {
            if (id == null) {
                throw new GuidanceValidationException("postIds must not contain null ids");
            }
            if (!submitted.add(id)) {
                throw new GuidanceValidationException("postIds lists post " + id + " more than once");
            }
        }
        return submitted;
    }

    /**
     * The stale-list check — shared by both reorders: the submitted set
     * must EQUAL the current (visible) set. An id outside the set (an
     * unknown post unscoped; a post without a {@code locale} translation
     * scoped) and a set missing current posts (a stale list) are distinct
     * 400s — each with its endpoint's own message ({@code unknownIdsMessage}
     * sees the unknown ids), and neither changes anything.
     */
    private static void verifySubmittedSet(Set<Long> submitted, Set<Long> currentIds,
                                           Function<List<Long>, String> unknownIdsMessage,
                                           String staleMessage) {
        if (!submitted.equals(currentIds)) {
            List<Long> unknown = new ArrayList<>(submitted);
            unknown.removeAll(currentIds);
            if (!unknown.isEmpty()) {
                throw new GuidanceValidationException(unknownIdsMessage.apply(unknown));
            }
            throw new GuidanceValidationException(staleMessage);
        }
    }
}
