package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * One row of the admin shelter-report queue (admin-moderation D3) — the
 * reporter's identity (profile name + email) is admin-only data, never
 * exposed outside {@code /admin/*}. {@code dismissed} is the queue's
 * resolved marker ({@code dismissed_at != null}); dismissed rows stay in
 * the list, recorded as resolved. {@code damped} flags the self-interested
 * negative votes (community-self-moderation M9, D3) — recorded and shown,
 * contributing 0 to the weighted auto-hide tally.
 */
@Schema(description = "One row of the admin shelter-report queue. The "
        + "reporter's identity (profile name + e-mail) is admin-only data, "
        + "never exposed outside /admin/*. dismissed is the queue's resolved "
        + "marker (dismissed_at != null); dismissed rows stay in the list, "
        + "recorded as resolved. damped flags the self-interested negative "
        + "votes (recorded and shown, contributing 0 to the weighted "
        + "auto-hide tally).")
public record AdminShelterReportDto(
        Long id,
        Long shelterId,
        String shelterName,
        ShelterStatus shelterStatus,
        ShelterReportType type,
        String detail,
        @Schema(description = "admin-only: the reporter's profile name — "
                + "reporter identity, never exposed outside /admin/*.")
        String reporterName,
        @Schema(description = "admin-only: the reporter's e-mail — reporter "
                + "identity, never exposed outside /admin/*.")
        String reporterEmail,
        Instant createdAt,
        @Schema(description = "The self-interested negative-vote flag "
                + "(community self-moderation): recorded and shown, "
                + "contributing 0 to the weighted auto-hide tally.")
        boolean damped,
        @Schema(description = "The queue's resolved marker (dismissed_at != "
                + "null); dismissed rows stay in the list, recorded as "
                + "resolved.")
        boolean dismissed) {
}
