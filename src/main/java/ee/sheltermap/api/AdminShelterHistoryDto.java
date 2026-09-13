package ee.sheltermap.api;

import ee.sheltermap.app.ShelterHistoryLog;

import java.time.Instant;
import java.util.List;

/**
 * One row of a shelter's edit history (moderation-dashboard-completion M10
 * slice 2, D4) — ascending over the row's lifecycle events.
 *
 * <p>{@code shelterName} is the SNAPSHOT at event time (renames do not
 * rewrite history — an EDITED row after a rename shows the name as it was
 * when the event happened); {@code actorName} is the acting account's
 * profile name ("Unknown" after erasure — no FK on actor_user_id);
 * {@code changes} is the server-parsed {@code {field, from, to}} list of an
 * EDITED row (the frontend renders, never parses the stored JSON) and empty
 * for CREATED/DELETED.
 */
public record AdminShelterHistoryDto(
        Long id,
        String shelterName,
        String actorName,
        ShelterHistoryLog.Action action,
        List<ShelterHistoryLog.FieldChange> changes,
        Instant createdAt) {
}
