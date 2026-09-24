package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ReporterTrust;
import ee.sheltermap.domain.ShelterSource;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * The single implementation of the reporter's derived trust weight,
 * shared by the auto-hide tally in
 * {@link ShelterReportService} and the community-pulse projection in
 * {@code api.ShelterQueryService} so the two can never drift apart —
 * the weight is the multiplier of the {@code NON_EXISTENT} tally that
 * auto-hides a shelter, and the same multiplier the public pulse shows.
 *
 * <p>The weight is NEVER stored: it is re-derived from the rows that
 * already exist (the reporter's own submissions + the moderation audit
 * trail), so it cannot drift and a rolled-back report leaves no score
 * behind.
 */
@Component
public class ReporterTrustEvaluator {

    private final ShelterRepository shelters;
    private final ModerationAuditLog audit;

    public ReporterTrustEvaluator(ShelterRepository shelters, ModerationAuditLog audit) {
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.audit = Objects.requireNonNull(audit, "audit");
    }

    /**
     * The derived weight for a reporter: baseline 1, +1 a cross-verified
     * own submission (a USER row in review state CONFIRMED), +1 two own
     * AUTO_CONFIRM moderation actions (one is not yet a pattern), capped
     * at 3 ({@link ReporterTrust}).
     */
    public int weight(long userId) {
        boolean crossVerifiedSubmission = shelters.countByCreatedByAndSourceAndReviewStatus(
                userId, ShelterSource.USER, ReviewStatus.CONFIRMED) > 0;
        int ownAutoConfirms = (int) audit.countByModeratorAndAction(userId,
                ModerationAuditLog.Action.AUTO_CONFIRM);
        return ReporterTrust.of(crossVerifiedSubmission, ownAutoConfirms).weight();
    }
}
