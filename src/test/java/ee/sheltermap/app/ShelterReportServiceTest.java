package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the shelter report + occupancy service
 * (shelter-trust-and-reports D1/D3/D4): the verified gate, 404s, the
 * per-target duplicate 409 (before any throttle budget is consumed), the
 * per-hour throttle 429, the exactly-on-5 auto-hide (and the no-re-hide
 * after a manual restore / disarmed flag), and the occupancy upsert.
 */
class ShelterReportServiceTest {

    private static final Clock FIXED = Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC);

    private InMemoryShelterRepository shelters;
    private InMemoryShelterReportRepository reports;
    private InMemoryShelterOccupancyRepository occupancy;
    private InMemoryReportActionLog actionLog;
    private InMemoryModerationAuditLog audit;
    private InMemoryUserRepository users;
    private ShelterReportService service;

    private RegisteredUser verified;
    private RegisteredUser unverified;
    private Shelter shelter;
    private int phoneCounter = 0;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        reports = new InMemoryShelterReportRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        actionLog = new InMemoryReportActionLog(FIXED);
        audit = new InMemoryModerationAuditLog(FIXED);
        users = new InMemoryUserRepository();
        service = new ShelterReportService(shelters, reports, occupancy, actionLog, audit, FIXED);

        verified = user("Mari", true);
        unverified = user("Priit", false);

        shelter = new Shelter("Kesklinna varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelters.save(shelter);
    }

    private RegisteredUser user(String name, boolean verified) {
        phoneCounter++;
        RegisteredUser user = new RegisteredUser(name, name.toLowerCase() + "@example.ee",
                "+372500" + String.format("%04d", phoneCounter));
        if (verified) {
            user.addVerification(new VerificationClaim(
                    VerificationLevel.EMAIL, "smtp", user.getData().email(), Instant.now()));
        }
        users.save(user);
        return user;
    }

    // ---------- gates and errors ----------

    @Test
    void guestAndUnverifiedCannotReport() {
        assertThatThrownBy(() -> service.reportShelter(new GuestUser(), shelter.getId(),
                ShelterReportType.NON_EXISTENT, null))
                .isInstanceOf(NotVerifiedException.class);
        assertThatThrownBy(() -> service.reportShelter(unverified, shelter.getId(),
                ShelterReportType.NON_EXISTENT, null))
                .isInstanceOf(NotVerifiedException.class);
        assertThatThrownBy(() -> service.reportOccupancy(new GuestUser(), shelter.getId(),
                OccupancyBand.FULL))
                .isInstanceOf(NotVerifiedException.class);
        assertThatThrownBy(() -> service.reportOccupancy(unverified, shelter.getId(),
                OccupancyBand.FULL))
                .isInstanceOf(NotVerifiedException.class);
        assertThat(reports.findAll()).isEmpty();
        assertThat(occupancy.findAll()).isEmpty();
        // a rejected gate consumes no throttle budget
        assertThat(actionLog.actions()).isEmpty();
    }

    @Test
    void unknownShelterIsNotFound() {
        assertThatThrownBy(() -> service.reportShelter(verified, 999_999L,
                ShelterReportType.NON_EXISTENT, null))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThatThrownBy(() -> service.reportOccupancy(verified, 999_999L, OccupancyBand.FULL))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThat(reports.findAll()).isEmpty();
    }

    @Test
    void duplicateShelterReportIsRejectedWithoutConsumingBudget() {
        service.reportShelter(verified, shelter.getId(), ShelterReportType.NON_EXISTENT, null);

        assertThatThrownBy(() -> service.reportShelter(verified, shelter.getId(),
                ShelterReportType.NON_EXISTENT, null))
                .isInstanceOf(DuplicateReportException.class);

        assertThat(reports.countByShelterIdAndType(shelter.getId(), ShelterReportType.NON_EXISTENT))
                .isEqualTo(1);
        // one action recorded (the first report), the duplicate consumed nothing
        assertThat(actionLog.actions()).hasSize(1);

        // a DIFFERENT type for the same shelter is allowed
        service.reportShelter(verified, shelter.getId(), ShelterReportType.CLOSED, null);
        assertThat(reports.countByShelterIdAndType(shelter.getId(), ShelterReportType.CLOSED)).isEqualTo(1);
    }

    @Test
    void otherReportKeepsItsDetailAndOtherTypesDropIt() {
        service.reportShelter(verified, shelter.getId(), ShelterReportType.OTHER, "põhjendus");
        service.reportShelter(verified, shelter.getId(), ShelterReportType.NON_EXISTENT, "ära unune");

        assertThat(reports.findAll().stream()
                        .filter(r -> r.getType() == ShelterReportType.OTHER)
                        .findFirst().orElseThrow().getDetail())
                .isEqualTo("põhjendus");
        assertThat(reports.findAll().stream()
                        .filter(r -> r.getType() == ShelterReportType.NON_EXISTENT)
                        .findFirst().orElseThrow().getDetail())
                .isNull();
    }

    @Test
    void eleventhReportTypeActionIsThrottled() {
        actionLog.setMaxPerHour(3);
        // three different actions pass: shelter report, occupancy, another report
        service.reportShelter(verified, shelter.getId(), ShelterReportType.NON_EXISTENT, null);
        service.reportOccupancy(verified, shelter.getId(), OccupancyBand.FULL);
        service.reportShelter(verified, shelter.getId(), ShelterReportType.CLOSED, null);

        // the fourth (any family) is throttled — nothing recorded for it
        assertThatThrownBy(() -> service.reportOccupancy(verified, shelter.getId(), OccupancyBand.SPACE))
                .isInstanceOf(ReportThrottledException.class);
        assertThat(actionLog.actions()).hasSize(3);
    }

    // ---------- auto-hide (D1) ----------

    @Test
    void oneToFourNonExistentReportsOnlyFlagAndStayActive() {
        for (int i = 0; i < 4; i++) {
            service.reportShelter(user("Reporter" + i, true), shelter.getId(),
                    ShelterReportType.NON_EXISTENT, null);
        }

        assertThat(shelters.findById(shelter.getId()).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);
        assertThat(reports.countByShelterIdAndType(shelter.getId(), ShelterReportType.NON_EXISTENT))
                .isEqualTo(4);
    }

    @Test
    void theFifthNonExistentReportAutoHidesAnActiveShelter() {
        for (int i = 0; i < 4; i++) {
            service.reportShelter(user("Reporter" + i, true), shelter.getId(),
                    ShelterReportType.NON_EXISTENT, null);
        }
        service.reportShelter(user("ReporterX", true), shelter.getId(),
                ShelterReportType.NON_EXISTENT, null);

        assertThat(shelters.findById(shelter.getId()).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.INACTIVE);
    }

    @Test
    void aDisarmedShelterIsNeverAutoHiddenEvenAtFive() {
        shelter.setAutoHideDisarmed(true);
        shelters.save(shelter);

        for (int i = 0; i < 5; i++) {
            service.reportShelter(user("Reporter" + i, true), shelter.getId(),
                    ShelterReportType.NON_EXISTENT, null);
        }

        assertThat(shelters.findById(shelter.getId()).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);
    }

    @Test
    void noReHideAfterAManualRestore() {
        // first round: 5 reports → hidden
        for (int i = 0; i < 5; i++) {
            service.reportShelter(user("Reporter" + i, true), shelter.getId(),
                    ShelterReportType.NON_EXISTENT, null);
        }
        assertThat(shelters.findById(shelter.getId()).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.INACTIVE);

        // admin restore (the admin-moderation change owns the write path;
        // here we simulate the resulting status change)
        Shelter restored = shelters.findById(shelter.getId()).orElseThrow();
        restored.setStatus(ShelterStatus.ACTIVE);
        shelters.save(restored);

        // later reports increment the count (6, 7) but never re-hide
        service.reportShelter(user("ReporterLate1", true), shelter.getId(),
                ShelterReportType.NON_EXISTENT, null);
        service.reportShelter(user("ReporterLate2", true), shelter.getId(),
                ShelterReportType.NON_EXISTENT, null);

        assertThat(shelters.findById(shelter.getId()).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);
        assertThat(reports.countByShelterIdAndType(shelter.getId(), ShelterReportType.NON_EXISTENT))
                .isEqualTo(7);
    }

    @Test
    void closedAndOpenConfirmedReportsNeverHide() {
        for (int i = 0; i < 5; i++) {
            service.reportShelter(user("Closed" + i, true), shelter.getId(),
                    ShelterReportType.CLOSED, null);
        }
        for (int i = 0; i < 5; i++) {
            service.reportShelter(user("Open" + i, true), shelter.getId(),
                    ShelterReportType.OPEN_CONFIRMED, null);
        }

        assertThat(shelters.findById(shelter.getId()).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);
    }

    // ---------- occupancy (D4) ----------

    @Test
    void occupancyUpsertsOneRowPerUserWithTheLatestBand() {
        service.reportOccupancy(verified, shelter.getId(), OccupancyBand.SPACE);
        service.reportOccupancy(verified, shelter.getId(), OccupancyBand.FULL);

        assertThat(occupancy.findAll()).hasSize(1);
        ShelterOccupancyReport stored = occupancy.findAll().get(0);
        assertThat(stored.getBand()).isEqualTo(OccupancyBand.FULL);
        assertThat(stored.getUpdatedAt()).isEqualTo(FIXED.instant());
    }

    @Test
    void twoUsersKeepTwoOccupancyRows() {
        service.reportOccupancy(verified, shelter.getId(), OccupancyBand.SPACE);
        service.reportOccupancy(user("Jaan", true), shelter.getId(), OccupancyBand.FULL);

        assertThat(occupancy.findAll()).hasSize(2);
    }

    // ---------- auto-confirm (community-review-queue v2 D2) ----------

    @Test
    void aPositiveReportFromAnotherUserConfirmsANewRow() {
        RegisteredUser submitter = user("Submitter", true);
        shelter.setCreatedBy(submitter.getId());
        shelter.setReviewStatus(ReviewStatus.NEW);

        service.reportShelter(verified, shelter.getId(), ShelterReportType.OPEN_CONFIRMED, null);

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(audit.rows()).hasSize(1);
        ModerationAuditLog.Row row = audit.rows().get(0);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.AUTO_CONFIRM);
        assertThat(row.shelterId()).isEqualTo(shelter.getId());
        assertThat(row.moderatorId()).isEqualTo(verified.getId());
        assertThat(row.previousStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(row.newStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(row.reason()).isNull();
    }

    @Test
    void theSubmittersOwnPositiveReportDoesNotConfirm() {
        RegisteredUser submitter = user("Submitter", true);
        shelter.setCreatedBy(submitter.getId());
        shelter.setReviewStatus(ReviewStatus.NEW);

        service.reportShelter(submitter, shelter.getId(), ShelterReportType.OPEN_CONFIRMED, null);

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void onlyNewUserRowsAreAutoConfirmed() {
        // a registry row (CONFIRMED by default): untouched, no audit
        Shelter registry = new Shelter("Registri", new GeoPoint(58.9, 26.3),
                ShelterStatus.ACTIVE, "ext-reg", ShelterSource.PAASETEAMET,
                "Pikakaevu 3", "Harjumaa", "Tallinn linn", "01.01.2026", "SMIT");
        shelters.save(registry);
        service.reportShelter(verified, registry.getId(), ShelterReportType.OPEN_CONFIRMED, null);
        assertThat(registry.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(audit.rows()).isEmpty();

        // an already-confirmed USER row: stays CONFIRMED, no audit
        Shelter confirmed = new Shelter("Kinnitatud", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        confirmed.setCreatedBy(user("S2", true).getId());
        shelters.save(confirmed);
        service.reportShelter(verified, confirmed.getId(), ShelterReportType.OPEN_CONFIRMED, null);
        assertThat(confirmed.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(audit.rows()).isEmpty();

        // a REJECTED USER row: stays REJECTED, no audit
        Shelter rejected = new Shelter("Keeldatud", new GeoPoint(59.4, 24.7),
                ShelterStatus.INACTIVE, null, ShelterSource.USER);
        rejected.setReviewStatus(ReviewStatus.REJECTED);
        shelters.save(rejected);
        service.reportShelter(verified, rejected.getId(), ShelterReportType.OPEN_CONFIRMED, null);
        assertThat(rejected.getReviewStatus()).isEqualTo(ReviewStatus.REJECTED);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aNonPositiveReportNeverConfirms() {
        RegisteredUser submitter = user("Submitter", true);
        shelter.setCreatedBy(submitter.getId());
        shelter.setReviewStatus(ReviewStatus.NEW);

        service.reportShelter(verified, shelter.getId(), ShelterReportType.CLOSED, null);
        service.reportShelter(verified, shelter.getId(), ShelterReportType.WRONG_LOCATION, null);

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(audit.rows()).isEmpty();
    }
}
