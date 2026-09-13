package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/**
 * The append-only moderation audit trail (community-review-queue v2
 * D4) — one row per moderation-relevant action: admin status change,
 * hard delete, shelter report dismiss, the admin CONFIRM/REJECT decisions,
 * CONFIRM/REJECT decisions, and the automatic AUTO_CONFIRM promotion
 * (the reporting user is its actor of record). The row is written in
 * the SAME JPA transaction as the action it records (no separate call,
 * no async) — a rolled-back action leaves no row, and a committed
 * action always leaves exactly one.
 *
 * <p>Unlike {@link ReportActionLog} (the per-user throttle budget), this
 * is a plain fact log — no check-and-record, no locking.
 * {@code shelter_id} has no FK: a delete records its audit row first, and
 * the id must dangle after the delete — the name is resolved at read time
 * ("Deleted shelter" once the row is gone).
 */
public interface ModerationAuditLog {

    /** Which moderation-relevant action a log row records. */
    enum Action {
        STATUS_CHANGE,
        DELETE,
        REPORT_DISMISS,
        CONFIRM,
        AUTO_CONFIRM,
        REJECT,
        // User-scoped rows (moderation-dashboard-completion M10 slice 1):
        // the action has no shelter (shelterId null) and names the target
        // account in subjectUserId.
        USER_SUSPEND,
        USER_UNSUSPEND,
        // Mark-inaccurate pair (moderation-dashboard-completion M10 slice 4):
        // shelter-scoped actions on the public `inaccurate` flag (the stamp
        // itself lives on the shelter row, the trail records the decision).
        MARK_INACCURATE,
        CLEAR_INACCURATE
    }

    /** One audit row as read by the admin projection. */
    record Row(Long id, Long shelterId, Long subjectUserId, Long moderatorId, Action action, String reason,
               ReviewStatus previousStatus, ReviewStatus newStatus, Instant createdAt) {
    }

    /**
     * The newest confirming action ({@code CONFIRM} or {@code AUTO_CONFIRM})
     * per shelter for a batch of ids in ONE query (last-verified-meta M8)
     * — a verification stamp on the row. Shelters without a confirming
     * action are absent from the result.
     */
    record LatestConfirmation(long shelterId, Instant latestAt) {
    }

    /**
     * Records one moderation-relevant action in the caller's
     * transaction.
     *
     * <p>{@code previousStatus}/{@code newStatus} are the shelter's
     * review_status before and after the action: equal for actions that
     * do not move the review state (status change, dismiss, review
     * hide/restore — the action string says what moved; a restore of a
     * REJECTED row is the exception — REJECTED→NEW) and
     * {@code newStatus = null} for DELETE (the row is gone).
     *
     * <p>User-scoped rows (M10 slice 1): {@code shelterId} is null and
     * {@code subjectUserId} names the target account (USER_SUSPEND /
     * USER_UNSUSPEND); shelter-scoped rows pass a non-null {@code
     * shelterId} and a null {@code subjectUserId}.
     */
    void record(Long shelterId, Long subjectUserId, long moderatorId, Action action, String reason,
                ReviewStatus previousStatus, ReviewStatus newStatus);

    /**
     * The reporter's own rows of one action — the second input of the
     * derived trust weight (community-self-moderation M9, D1): how many of
     * the reporter's positive reports caused an AUTO_CONFIRM promotion.
     */
    long countByModeratorAndAction(long moderatorId, Action action);

    /**
     * Erasure redaction (legal-recovery M4 slice 2): nulls the free-text
     * {@code reason} on the rows for the given shelters — the note is
     * written to the (possibly erased) submitter and may echo their
     * contacts. The action rows themselves survive (audit integrity).
     * Returns the number of redacted rows.
     */
    int clearReasonByShelterIds(Collection<Long> shelterIds);

    /**
     * The newest rows first (created_at descending, id descending as the
     * same-timestamp tie-break), at most {@code limit} of them.
     */
    List<Row> findLatest(int limit);

    /** Batched newest CONFIRM / AUTO_CONFIRM action per shelter — the "last verified" input (M8). */
    List<LatestConfirmation> latestConfirmationByShelterIds(Collection<Long> shelterIds);
}
