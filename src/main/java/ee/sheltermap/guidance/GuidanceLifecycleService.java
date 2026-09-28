package ee.sheltermap.guidance;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;

import java.time.Clock;
import java.util.Objects;

/**
 * The guidance post lifecycle — publish / unpublish / delete — the
 * lifecycle seam extracted from {@link GuidanceService}.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code GuidanceService}
 * (whose constructor the unit suite freezes at its seven collaborators)
 * constructs it from its own repositories, audit log and clock, and its
 * public {@code publish}/{@code unpublish}/{@code delete} methods remain
 * the {@code @Transactional} entry points — the audit row joins the SAME
 * transaction as the action, so a rolled-back action leaves no row.
 *
 * <p>The lifecycle (unchanged by the extraction): publish stamps
 * {@code publishedAt} from the injected Clock, unpublish clears it (a
 * re-publish stamps a FRESH instant — the instruction re-issued today
 * outranks last week's text). Both are idempotent no-ops in the
 * already-there state, and a no-op writes NO audit row (the suspension
 * idiom — the audit is a change log, not an access log). A post's slot is
 * its stored {@code sortOrder} — the lifecycle NEVER touches it. Hard
 * delete requires an explicit {@code confirm} (400 without it); deleting
 * a post does not touch its media assets (they belong to the library),
 * its translation rows die with it, and its audit rows keep their label
 * snapshot (the label is taken BEFORE the row is gone — the trail stays
 * readable after the delete).
 */
public class GuidanceLifecycleService {

    private final GuidancePostRepository posts;
    private final GuidanceTranslationRepository translations;
    private final ModerationAuditLog audit;
    private final Clock clock;

    public GuidanceLifecycleService(GuidancePostRepository posts,
                                    GuidanceTranslationRepository translations,
                                    ModerationAuditLog audit, Clock clock) {
        this.posts = Objects.requireNonNull(posts, "posts");
        this.translations = Objects.requireNonNull(translations, "translations");
        this.audit = Objects.requireNonNull(audit, "audit");
        this.clock = Objects.requireNonNull(clock, "clock");
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
     * time, and no post is unpublishable because of an image problem.
     */
    public void publish(long adminId, long id) {
        GuidancePost post = requirePost(id);
        if (post.isPublished()) {
            // Idempotent no-op: no save, NO audit row.
            return;
        }
        // sort_order is NEVER touched here: a re-publish stamps a fresh
        // publishedAt, but the post's slot is its stored manual position —
        // it does not re-enter the list at the top.
        post.publish(clock.instant());
        posts.save(post);
        audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_PUBLISH,
                auditLabel(post), null);
    }

    /**
     * Unpublish: back to DRAFT, {@code publishedAt} cleared,
     * GUIDANCE_UNPUBLISH recorded in this transaction. Idempotent —
     * unpublishing a draft is a no-op that writes NO audit row.
     */
    public void unpublish(long adminId, long id) {
        GuidancePost post = requirePost(id);
        if (!post.isPublished()) {
            return;
        }
        // sort_order is NEVER touched here: the draft's slot survives its
        // (un)publication.
        post.unpublish();
        posts.save(post);
        audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_UNPUBLISH,
                auditLabel(post), null);
    }

    /**
     * Hard delete: requires {@code confirm} (400 without it — the admin
     * UI shows a confirm dialog). The GUIDANCE_DELETE audit row joins this
     * transaction with the label snapshot computed BEFORE the row is gone
     * — the trail stays readable after the delete. The post's media assets
     * stay in the library (uploads are inventory, not garbage).
     */
    public void delete(long adminId, long id, boolean confirm) {
        GuidancePost post = requirePost(id);
        if (!confirm) {
            throw new GuidanceValidationException("confirm=true is required to delete a guidance post");
        }
        audit.recordLabeled(adminId, ModerationAuditLog.Action.GUIDANCE_DELETE,
                auditLabel(post), null);
        // sort_order is NEVER written by a delete: the remaining posts keep
        // their positions and leave GAPS in the numbering — order is by
        // value, not adjacency, so the gaps are invisible until the next
        // reorder re-densifies.
        // The post's translation rows die with it (the FK cascades in the
        // DB; the explicit delete keeps the in-memory twin honest too).
        translations.deleteAllByPostId(post.getId());
        posts.delete(post);
    }

    /**
     * The audit subject label — a snapshot of the post's title and slug
     * at the moment of the action (the column has no FK: a deleted post
     * must stay readable in the trail, exactly like a dangling
     * shelter_id).
     */
    private static String auditLabel(GuidancePost post) {
        return "Guidance post \"" + post.getTitle() + "\" (" + post.getSlug() + ")";
    }

    private GuidancePost requirePost(long id) {
        return posts.findById(id)
                .orElseThrow(() -> new GuidanceNotFoundException(GuidanceService.POST_NOT_FOUND_MESSAGE));
    }
}
