package ee.sheltermap.app;

import java.time.Instant;
import java.util.List;

/**
 * The append-only shelter edit history (moderation-dashboard-completion M10
 * slice 2, design D4) — one immutable row per USER-shelter lifecycle event:
 * CREATED on submission, EDITED on an owner PUT that moved at least one
 * editable field, DELETED on a user or admin hard delete. The row is written
 * in the SAME transaction as the event it records (the moderation-audit
 * idiom — no separate call, no async): a rolled-back or failed event leaves
 * no row, a committed event leaves exactly one.
 *
 * <p>Unlike the {@link ModerationAuditLog} (moderation actions), this is the
 * EDIT trail: who changed WHAT, field by field. {@code shelter_id} has no FK
 * (the V11 convention) — the delete's own DELETED row dangles after the
 * cascade and stays findable by the (now gone) shelter id; every row
 * snapshots {@code shelter_name} at event time (renames do not rewrite
 * history). {@code actor_user_id} has no FK either — an account erasure
 * orphans the actor (rendered "Unknown" at read time).
 *
 * <p>{@code changes} is compact JSON {@code {"field": [old, new], ...}} over
 * exactly the fields that MOVED on a PUT (canonical field order); a PUT that
 * changes nothing records no row (no edit-spam history), and CREATED/DELETED
 * rows carry {@code null}. Registry import rows never appear here — the
 * import writes through {@code ShelterImportService} and keeps its own
 * {@code data_imports} audit.
 */
public interface ShelterHistoryLog {

    /** Which lifecycle event a history row records. */
    enum Action {
        CREATED,
        EDITED,
        DELETED
    }

    /** One rendered field change of an EDITED row (server-parsed — the FE
     *  renders, never parses). {@code from}/{@code to} are display strings;
     *  null = the field was absent (e.g. description first set). */
    record FieldChange(String field, String from, String to) {
    }

    /** One history row as read by the admin projection. */
    record Event(Long id, Long shelterId, String shelterName, Long actorUserId, Action action,
                 String changes, Instant createdAt) {
    }

    /**
     * Records one lifecycle event in the caller's transaction.
     *
     * @param changesJson compact JSON of the moved fields (canonical order),
     *                    {@code null} for CREATED/DELETED
     */
    void record(Long shelterId, String shelterName, Long actorUserId, Action action, String changesJson);

    /**
     * The shelter's events in ASCENDING order (created_at asc, id asc as the
     * same-timestamp tie-break — the stable-order discipline, B7a). Includes
     * rows whose shelter_id dangles (the shelter is deleted) — those are the
     * point: a deleted shelter's history still serves.
     */
    List<Event> findByShelterId(long shelterId);
}
