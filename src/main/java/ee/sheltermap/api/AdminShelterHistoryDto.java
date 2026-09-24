package ee.sheltermap.api;

import ee.sheltermap.app.ShelterHistoryLog;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

/**
 * One row of a shelter's edit history — ascending over the row's
 * lifecycle events.
 *
 * <p>{@code shelterName} is the SNAPSHOT at event time (renames do not
 * rewrite history — an EDITED row after a rename shows the name as it was
 * when the event happened); {@code actorName} is the acting account's
 * profile name ("Unknown" after erasure — no FK on actor_user_id);
 * {@code changes} is the server-parsed {@code {field, from, to}} list of an
 * EDITED row (the frontend renders, never parses the stored JSON) and empty
 * for CREATED/DELETED.
 */
@Schema(description = "One row of a shelter's edit history — ascending over "
        + "the row's lifecycle events (CREATED / EDITED / DELETED).")
public record AdminShelterHistoryDto(
        Long id,
        @Schema(description = "The SNAPSHOT at event time — renames do not "
                + "rewrite history (an EDITED row after a rename shows the "
                + "name as it was when the event happened).")
        String shelterName,
        @Schema(description = "The acting account's profile name; 'Unknown' "
                + "after erasure (no FK on actor_user_id).")
        String actorName,
        ShelterHistoryLog.Action action,
        @Schema(description = "The server-parsed {field, from, to} list of an "
                + "EDITED row (the frontend renders, never parses the stored "
                + "JSON); empty for CREATED/DELETED.")
        List<ShelterHistoryLog.FieldChange> changes,
        Instant createdAt) {
}
