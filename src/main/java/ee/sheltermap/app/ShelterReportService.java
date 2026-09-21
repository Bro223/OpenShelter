package ee.sheltermap.app;

import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterOpenStatusReport;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

/**
 * Typed shelter reports + live occupancy + live open/closed state
 * (shelter-trust-and-reports D1/D4).
 *
 * <p>Every write requires a verified registered user (the same
 * {@code canWrite()} gate as submissions), a known shelter (404), and —
 * for shelter reports — passes the per-target unique bound (409 on a
 * repeat (shelter, user, type) BEFORE any throttle budget is consumed,
 * mirroring the verification already-verified guard). All report-type
 * actions count against the per-user rolling-hour throttle (429); the
 * open/closed state tap does NOT count — a tap is a state, not a report
 * action, so it records nothing in the action log.
 *
 * <p>Auto-hide (D1, trust-weighted since community-self-moderation):
 * an {@code ACTIVE} shelter whose {@code auto_hide_disarmed} is
 * {@code false} becomes {@code INACTIVE} on the {@code NON_EXISTENT}
 * report insert that brings the shelter's trust-weighted hide tally —
 * the sum of the distinct reporters' derived weights, dampened reports
 * contributing 0 and admin-dismissed reports excluded entirely (the
 * dismissal is the admin's invalid verdict — the report stops
 * influencing anything) — from below {@code AUTO_HIDE_THRESHOLD} to at
 * least that value. Five baseline (weight-1) reporters still hide on the
 * fifth report; trusted reporters reach the consensus faster. The
 * trigger fires only on the crossing insert; after a manual status
 * change (admin restore, later change) the tally is already at or above
 * the threshold, so later reports increment it but never re-hide. No
 * other path auto-hides.
 *
 * <p>Auto-confirm (community-review-queue v2 D2): when an
 * {@code OPEN_CONFIRMED} report is successfully recorded for a USER row
 * in review state NEW, by a user who is NOT the row's submitter, the
 * row is promoted NEW→CONFIRMED in the SAME transaction and an
 * AUTO_CONFIRM row is written to the moderation audit trail (the
 * reporting user is the actor of record). The submitter's own positive
 * report never promotes; registry and already-confirmed rows are
 * untouched. This is the primary trust flow — no human in the loop —
 * and trust weighting never gates the positive side.
 *
 * <p>Duplicate dampening (D3): a {@code NON_EXISTENT} report is
 * stored {@code damped} when the reporter holds their own other USER
 * listing of the same place (same normalized name within
 * {@code app.limits.duplicate-coord-meters} haversine, any status) — a
 * self-interested vote that contributes 0 to the tally. The report
 * stays stored and visible in the admin queue (flagged), never deleted.
 *
 * <p>Live open/closed state (same level as capacity): one row per
 * (shelter, user), a tap upserts it (latest state wins, created_at
 * refreshed), display-only and NOT throttled. A successful OPEN tap
 * runs the SAME auto-confirm as the {@code OPEN_CONFIRMED} report path
 * (a USER row in review state NEW, by a user other than the submitter,
 * is promoted NEW→CONFIRMED with an AUTO_CONFIRM audit row).
 */
@Service
public class ShelterReportService {

    /**
     * 403 message for unverified report/occupancy writes — the same
     * sentence-case vocabulary as submissions.
     */
    public static final String REPORTING_MESSAGE = "Reporting requires a verified account";

    private final ShelterRepository shelters;
    private final ShelterReportRepository reports;
    private final ShelterOccupancyRepository occupancy;
    private final ShelterOpenStatusRepository openStatus;
    private final ReportActionLog actionLog;
    private final ModerationAuditLog audit;
    private final ReporterTrustEvaluator trust;
    private final Clock clock;
    /** The near-duplicate haversine tolerance — one spelling of the duplicate rule (D3). */
    private final double duplicateCoordMeters;

    public ShelterReportService(ShelterRepository shelters,
                                ShelterReportRepository reports,
                                ShelterOccupancyRepository occupancy,
                                ShelterOpenStatusRepository openStatus,
                                ReportActionLog actionLog,
                                ModerationAuditLog audit,
                                ReporterTrustEvaluator trust,
                                Clock clock,
                                @Value("${app.limits.duplicate-coord-meters:100}") double duplicateCoordMeters) {
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.reports = Objects.requireNonNull(reports, "reports");
        this.occupancy = Objects.requireNonNull(occupancy, "occupancy");
        this.openStatus = Objects.requireNonNull(openStatus, "openStatus");
        this.actionLog = Objects.requireNonNull(actionLog, "actionLog");
        this.audit = Objects.requireNonNull(audit, "audit");
        this.trust = Objects.requireNonNull(trust, "trust");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.duplicateCoordMeters = duplicateCoordMeters;
    }

    /**
     * Stores the user's report for a shelter.
     *
     * @return {@code true} when the stored report was dampened (D3)
     *         — recorded, flagged in the admin queue, contributing 0 to
     *         the weighted hide tally
     * @throws NotVerifiedException         guest or unverified registered user (→ 403)
     * @throws ShelterNotFoundException     unknown shelter id (→ 404)
     * @throws DuplicateReportException     the user already reported this
     *                                      shelter with this type (→ 409)
     * @throws ReportThrottledException     the per-hour report budget is
     *                                      exhausted (→ 429)
     */
    @Transactional
    public boolean reportShelter(User caller, long shelterId, ShelterReportType type, String detail) {
        RegisteredUser user = requireVerified(caller);
        Shelter shelter = requireShelter(shelterId);
        if (reports.existsByShelterIdAndUserIdAndType(shelterId, user.getId(), type)) {
            throw new DuplicateReportException();
        }
        actionLog.record(user.getId(), ReportActionLog.Action.SHELTER_REPORT);
        boolean damped = false;
        boolean reachesAutoHide = false;
        if (type == ShelterReportType.NON_EXISTENT) {
            // The negative half of the self-moderation loop is
            // trust-weighted and dampened; the positive half below is
            // untouched (the locked auto-trust).
            damped = isDampenedFor(user.getId(), shelter);
            long tallyBefore = hideTally(shelterId);
            long myPoints = damped ? 0 : trust.weight(user.getId());
            reachesAutoHide = tallyBefore < ShelterReport.AUTO_HIDE_THRESHOLD
                    && tallyBefore + myPoints >= ShelterReport.AUTO_HIDE_THRESHOLD;
        }
        ShelterReport report = new ShelterReport(shelterId, user.getId(), type, detailFor(type, detail),
                clock.instant());
        if (damped) {
            report.markDamped();
        }
        try {
            reports.save(report);
        } catch (DataIntegrityViolationException e) {
            // Lost a race with an identical concurrent report — the unique
            // constraint is the authority; same semantics as the pre-check.
            throw new DuplicateReportException();
        }
        if (reachesAutoHide) {
            autoHideIfEligible(shelter);
        }
        if (type == ShelterReportType.OPEN_CONFIRMED) {
            autoConfirmIfEligible(shelter, user);
        }
        return damped;
    }

    /**
     * Upserts the user's live occupancy report (D4): one row per
     * (shelter, user), re-reporting refreshes the band and
     * {@code updated_at}. Display is derived at read time; this write
     * never affects visibility, status or filters.
     *
     * @throws NotVerifiedException     guest or unverified registered user (→ 403)
     * @throws ShelterNotFoundException unknown shelter id (→ 404)
     * @throws ReportThrottledException the per-hour report budget is
     *                                  exhausted (→ 429)
     */
    @Transactional
    public void reportOccupancy(User caller, long shelterId, OccupancyBand band) {
        RegisteredUser user = requireVerified(caller);
        requireShelter(shelterId);
        actionLog.record(user.getId(), ReportActionLog.Action.OCCUPANCY);
        Instant now = clock.instant();
        ShelterOccupancyReport existing = occupancy
                .findByShelterIdAndUserId(shelterId, user.getId())
                .orElse(null);
        if (existing != null) {
            existing.update(band, now);
        } else {
            existing = new ShelterOccupancyReport(shelterId, user.getId(), band, now);
        }
        occupancy.save(existing);
    }

    /**
     * Upserts the user's live open/closed state (same level as
     * capacity): one row per (shelter, user), a new tap replaces the
     * previous state and refreshes {@code created_at}. Display-only —
     * this write never affects visibility, status or filters. NOT
     * throttled: a tap is a state, not a report action, so it records
     * nothing in the action log and consumes no budget.
     *
     * <p>A successful OPEN tap runs the SAME auto-confirm as the
     * {@code OPEN_CONFIRMED} report path: a USER row in review state
     * NEW is promoted NEW→CONFIRMED (AUTO_CONFIRM audit, the tapping
     * user as actor of record) when the tapping user is NOT the row's
     * submitter. A CLOSED tap never confirms; the submitter's own tap
     * never confirms.
     *
     * @throws NotVerifiedException     unverified registered user (→ 403)
     * @throws ShelterNotFoundException unknown shelter id (→ 404)
     */
    @Transactional
    public void putOpenStatus(RegisteredUser user, long shelterId, OpenStatusState state) {
        if (!user.canWrite()) {
            throw new NotVerifiedException(REPORTING_MESSAGE);
        }
        Shelter shelter = requireShelter(shelterId);
        Instant now = clock.instant();
        ShelterOpenStatusReport existing = openStatus
                .findByShelterIdAndUserId(shelterId, user.getId())
                .orElse(null);
        if (existing != null) {
            existing.update(state, now);
        } else {
            existing = new ShelterOpenStatusReport(shelterId, user.getId(), state, now);
        }
        openStatus.save(existing);
        if (state == OpenStatusState.OPEN) {
            autoConfirmIfEligible(shelter, user);
        }
    }

    /**
     * The shelter's current trust-weighted hide tally (D2) — the sum
     * of the weights of its distinct {@code NON_EXISTENT} reporters,
     * dampened reports contributing 0, admin-dismissed reports excluded
     * entirely (one row per reporter by the (shelter, user, type)
     * uniqueness).
     */
    private long hideTally(long shelterId) {
        return reports.reportersByShelterIdAndType(shelterId, ShelterReportType.NON_EXISTENT).stream()
                .mapToLong(entry -> entry.damped() ? 0 : trust.weight(entry.userId()))
                .sum();
    }

    /**
     * The duplicate dampening (D3): {@code true} when the reporter
     * holds their OWN other USER listing of the same place — the same
     * normalized name within {@code duplicateCoordMeters} haversine of
     * the reported shelter, the reporter's row in ANY status (a deleted
     * row is simply gone, so it cannot damp), the target row itself
     * excluded. Reuses the duplicate rule's statics — one spelling of
     * "duplicate" in the codebase.
     */
    private boolean isDampenedFor(long reporterId, Shelter target) {
        return shelters.findByCreatedBy(reporterId).stream()
                .filter(existing -> existing.getId() != null
                        && !existing.getId().equals(target.getId()))
                .filter(existing -> existing.getSource() == ShelterSource.USER)
                .filter(existing -> ShelterService.normalizedNamesEqual(
                        existing.getName(), target.getName()))
                .filter(existing -> ShelterService.haversineMeters(
                        existing.getLocation(), target.getLocation()) <= duplicateCoordMeters)
                .findAny().isPresent();
    }

    /**
     * The 4→5 auto-hide (the weighted-tally crossing), the ONLY path
     * that auto-hides (D1): an ACTIVE shelter whose disarm flag is still
     * {@code false} becomes INACTIVE. A manual status change or a
     * disarmed flag leaves the shelter alone.
     */
    private void autoHideIfEligible(Shelter shelter) {
        if (shelter.getStatus() == ShelterStatus.ACTIVE && !shelter.isAutoHideDisarmed()) {
            shelter.setStatus(ShelterStatus.INACTIVE);
            shelters.save(shelter);
        }
    }

    /**
     * The NEW→CONFIRMED promotion (community-review-queue v2 D2) — the
     * ONLY automatic path: a USER row in review state NEW, confirmed by a
     * positive report from a user other than the submitter (a legacy
     * USER row without an author counts as unclaimed — any reporter
     * qualifies). The promotion joins this report's transaction and the
     * audit row's actor is the reporting user (AUTO_CONFIRM).
     */
    private void autoConfirmIfEligible(Shelter shelter, RegisteredUser reporter) {
        boolean byOtherUser = shelter.getCreatedBy() == null
                || !shelter.getCreatedBy().equals(reporter.getId());
        if (shelter.getSource() == ShelterSource.USER
                && shelter.getReviewStatus() == ReviewStatus.NEW
                && byOtherUser) {
            shelter.setReviewStatus(ReviewStatus.CONFIRMED);
            shelters.save(shelter);
            audit.record(shelter.getId(), null, reporter.getId(),
                    ModerationAuditLog.Action.AUTO_CONFIRM, null,
                    ReviewStatus.NEW, ReviewStatus.CONFIRMED);
        }
    }

    /**
     * {@code detail} is the factual substance
     * of the factual report types — the "when" of a {@code CLOSED} report,
     * the actual address of a {@code WRONG_LOCATION} report, the free text
     * of {@code OTHER} — and is stored for them. The binary types
     * {@code NON_EXISTENT} / {@code OPEN_CONFIRMED} keep ignoring it: the
     * type alone is the claim.
     */
    private static String detailFor(ShelterReportType type, String detail) {
        return type == ShelterReportType.CLOSED
                || type == ShelterReportType.WRONG_LOCATION
                || type == ShelterReportType.OTHER ? detail : null;
    }

    private Shelter requireShelter(long shelterId) {
        return shelters.findById(shelterId)
                .orElseThrow(() -> new ShelterNotFoundException(shelterId));
    }

    private static RegisteredUser requireVerified(User user) {
        if (!(user instanceof RegisteredUser registered) || !registered.canWrite()) {
            throw new NotVerifiedException(REPORTING_MESSAGE);
        }
        return registered;
    }
}
