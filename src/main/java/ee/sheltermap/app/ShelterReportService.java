package ee.sheltermap.app;

import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

/**
 * Typed shelter reports + live occupancy (shelter-trust-and-reports D1/D4).
 *
 * <p>Every write requires a verified registered user (the same
 * {@code canWrite()} gate as submissions), a known shelter (404), and —
 * for shelter reports — passes the per-target unique bound (409 on a
 * repeat (shelter, user, type) BEFORE any throttle budget is consumed,
 * mirroring the verification already-verified guard). All report-type
 * actions count against the per-user rolling-hour throttle (429).
 *
 * <p>Auto-hide (D1): on the insert that brings the {@code NON_EXISTENT}
 * count from exactly 4 to 5, an {@code ACTIVE} shelter whose
 * {@code auto_hide_disarmed} is {@code false} becomes {@code INACTIVE}.
 * The trigger fires only on that one 4→5 insert; after a manual status
 * change (admin restore, later change) the count is already past 4, so
 * later reports increment it but never re-hide. No other path auto-hides.
 */
@Service
public class ShelterReportService {

    /**
     * 403 message for unverified report/occupancy writes — the same
     * sentence-case vocabulary as submissions and reviews.
     */
    public static final String REPORTING_MESSAGE = "Reporting requires a verified account";

    /** NON_EXISTENT reports that trigger the auto-hide (D1). */
    public static final int AUTO_HIDE_THRESHOLD = 5;

    private final ShelterRepository shelters;
    private final ShelterReportRepository reports;
    private final ShelterOccupancyRepository occupancy;
    private final ReportActionLog actionLog;
    private final Clock clock;

    public ShelterReportService(ShelterRepository shelters,
                                ShelterReportRepository reports,
                                ShelterOccupancyRepository occupancy,
                                ReportActionLog actionLog,
                                Clock clock) {
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.reports = Objects.requireNonNull(reports, "reports");
        this.occupancy = Objects.requireNonNull(occupancy, "occupancy");
        this.actionLog = Objects.requireNonNull(actionLog, "actionLog");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * Stores the user's report for a shelter.
     *
     * @throws NotVerifiedException         guest or unverified registered user (→ 403)
     * @throws ShelterNotFoundException     unknown shelter id (→ 404)
     * @throws DuplicateReportException     the user already reported this
     *                                      shelter with this type (→ 409)
     * @throws ReportThrottledException     the per-hour report budget is
     *                                      exhausted (→ 429)
     */
    @Transactional
    public void reportShelter(User caller, long shelterId, ShelterReportType type, String detail) {
        RegisteredUser user = requireVerified(caller);
        Shelter shelter = requireShelter(shelterId);
        if (reports.existsByShelterIdAndUserIdAndType(shelterId, user.getId(), type)) {
            throw new DuplicateReportException();
        }
        actionLog.record(user.getId(), ReportActionLog.Action.SHELTER_REPORT);
        boolean reachesAutoHide = type == ShelterReportType.NON_EXISTENT
                && reports.countByShelterIdAndType(shelterId, ShelterReportType.NON_EXISTENT)
                == AUTO_HIDE_THRESHOLD - 1;
        try {
            reports.save(new ShelterReport(
                    shelterId, user.getId(), type, detailFor(type, detail)));
        } catch (DataIntegrityViolationException e) {
            // Lost a race with an identical concurrent report — the unique
            // constraint is the authority; same semantics as the pre-check.
            throw new DuplicateReportException();
        }
        if (reachesAutoHide) {
            autoHideIfEligible(shelter);
        }
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
     * The 4→5 auto-hide, the ONLY path that auto-hides (D1): an ACTIVE
     * shelter whose disarm flag is still {@code false} becomes INACTIVE.
     * A manual status change or a disarmed flag leaves the shelter alone.
     */
    private void autoHideIfEligible(Shelter shelter) {
        if (shelter.getStatus() == ShelterStatus.ACTIVE && !shelter.isAutoHideDisarmed()) {
            shelter.setStatus(ShelterStatus.INACTIVE);
            shelters.save(shelter);
        }
    }

    /** {@code detail} is free text for {@code OTHER} reports, ignored otherwise. */
    private static String detailFor(ShelterReportType type, String detail) {
        return type == ShelterReportType.OTHER ? detail : null;
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
