package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterStatus;

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
public record AdminShelterReportDto(
        Long id,
        Long shelterId,
        String shelterName,
        ShelterStatus shelterStatus,
        ShelterReportType type,
        String detail,
        String reporterName,
        String reporterEmail,
        Instant createdAt,
        boolean damped,
        boolean dismissed) {
}
