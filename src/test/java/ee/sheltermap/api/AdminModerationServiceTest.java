package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterOccupancyRepository;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReportRepository;
import ee.sheltermap.app.InMemoryShelterReviewRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ImportOwnedShelterException;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewDecision;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the admin moderation surface's community-review part
 * (community-review-queue v2 D2/D4): the CONFIRM/REJECT decisions, the
 * restore-of-a-rejected-row reverting to NEW, and the audit rows every
 * admin write leaves in the (in-memory) moderation audit log — including
 * that idempotent no-ops record nothing.
 */
class AdminModerationServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-11T12:00:00Z");
    private static final Clock FIXED = Clock.fixed(NOW, ZoneOffset.UTC);

    private InMemoryShelterRepository shelters;
    private InMemoryShelterReportRepository shelterReports;
    private InMemoryShelterReviewRepository reviews;
    private InMemoryShelterOccupancyRepository occupancy;
    private InMemoryUserRepository users;
    private InMemoryModerationAuditLog audit;
    private AdminModerationService service;

    private long adminId;
    private long submitterId;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        shelterReports = new InMemoryShelterReportRepository();
        reviews = new InMemoryShelterReviewRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        users = new InMemoryUserRepository();
        audit = new InMemoryModerationAuditLog(FIXED);
        ShelterQueryService queryService =
                new ShelterQueryService(shelters, reviews, users, shelterReports, occupancy, FIXED);
        service = new AdminModerationService(queryService, shelters, shelterReports,
                new ee.sheltermap.app.InMemoryReviewReportRepository(), reviews, users, FIXED, audit);

        adminId = saveUser("Admin", "admin@example.ee");
        submitterId = saveUser("Autor", "autor@example.ee");
    }

    private long saveUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+372500" + nextPhone());
        users.save(user);
        return user.getId();
    }

    private int phoneCounter = 0;

    private int nextPhone() {
        return ++phoneCounter;
    }

    private Shelter userShelter(ReviewStatus reviewStatus) {
        Shelter shelter = new Shelter("Oma varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelter.setCreatedBy(submitterId);
        shelter.setReviewStatus(reviewStatus);
        shelters.save(shelter);
        return shelter;
    }

    private Shelter registryShelter() {
        Shelter shelter = new Shelter("Registri varjend", new GeoPoint(58.9, 26.3),
                ShelterStatus.ACTIVE, "ext-reg", ShelterSource.PAASETEAMET,
                "Pikakaevu 3", "Harjumaa", "Tallinn linn", "01.01.2026", "SMIT");
        shelters.save(shelter);
        return shelter;
    }

    // ---------- CONFIRM ----------

    @Test
    void aConfirmPromotesToConfirmedAndClearsTheNote() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        shelter.setReviewNote("vanem märkus");

        service.reviewShelter(adminId, shelter.getId(), ReviewDecision.CONFIRM, "ignored");

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(shelter.getReviewNote()).isNull();
        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(audit.rows()).containsExactly(new ModerationAuditLog.Row(
                1L, shelter.getId(), adminId, ModerationAuditLog.Action.CONFIRM, null,
                ReviewStatus.NEW, ReviewStatus.CONFIRMED, NOW));
    }

    @Test
    void aConfirmOfAnInactiveRowDoesNotUnHideIt() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        shelter.setStatus(ShelterStatus.INACTIVE);

        service.reviewShelter(adminId, shelter.getId(), ReviewDecision.CONFIRM, null);

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.INACTIVE);
    }

    // ---------- REJECT ----------

    @Test
    void aRejectHidesTheRowAndStoresTheReason() {
        Shelter shelter = userShelter(ReviewStatus.CONFIRMED);

        service.reviewShelter(adminId, shelter.getId(), ReviewDecision.REJECT, "Pole varjend");

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.REJECTED);
        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.INACTIVE);
        assertThat(shelter.getReviewNote()).isEqualTo("Pole varjend");
        assertThat(audit.rows()).containsExactly(new ModerationAuditLog.Row(
                1L, shelter.getId(), adminId, ModerationAuditLog.Action.REJECT, "Pole varjend",
                ReviewStatus.CONFIRMED, ReviewStatus.REJECTED, NOW));
    }

    @Test
    void aRejectWithoutAReasonStoresNull() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.reviewShelter(adminId, shelter.getId(), ReviewDecision.REJECT, "   ");

        assertThat(shelter.getReviewNote()).isNull();
        assertThat(audit.rows().get(0).reason()).isNull();
    }

    @Test
    void decisionsOnRegistryRowsAreConflictsAndUnknownIdsAre404() {
        Shelter registry = registryShelter();
        assertThatThrownBy(() -> service.reviewShelter(adminId, registry.getId(),
                ReviewDecision.CONFIRM, null))
                .isInstanceOf(ImportOwnedShelterException.class);
        assertThat(audit.rows()).isEmpty();

        assertThatThrownBy(() -> service.reviewShelter(adminId, 999_999L,
                ReviewDecision.REJECT, null))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThat(audit.rows()).isEmpty();
    }

    // ---------- restore of a rejected row starts over as NEW ----------

    @Test
    void restoringARejectedRowRevertsItToNew() {
        Shelter shelter = userShelter(ReviewStatus.REJECTED);
        shelter.setStatus(ShelterStatus.INACTIVE);
        shelter.setReviewNote("Pole varjend");

        service.setShelterStatus(adminId, shelter.getId(), ShelterStatus.ACTIVE);

        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(shelter.isAutoHideDisarmed()).isTrue(); // the restore disarms, as before
        assertThat(audit.rows()).containsExactly(new ModerationAuditLog.Row(
                1L, shelter.getId(), adminId, ModerationAuditLog.Action.STATUS_CHANGE, null,
                ReviewStatus.REJECTED, ReviewStatus.NEW, NOW));
    }

    @Test
    void aPlainStatusChangeAuditsWithTheUnchangedReviewState() {
        Shelter shelter = userShelter(ReviewStatus.CONFIRMED);

        service.setShelterStatus(adminId, shelter.getId(), ShelterStatus.INACTIVE);

        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        ModerationAuditLog.Row row = audit.rows().get(0);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.STATUS_CHANGE);
        assertThat(row.previousStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(row.newStatus()).isEqualTo(ReviewStatus.CONFIRMED);
    }

    @Test
    void aSameStatusChangeIsANoOpAndRecordsNothing() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.setShelterStatus(adminId, shelter.getId(), ShelterStatus.ACTIVE);

        assertThat(audit.rows()).isEmpty();
    }

    // ---------- delete / dismiss / review hide-restore audit rows ----------

    @Test
    void aDeleteAuditsWithNullNewStatusAndRemovesTheShelter() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.deleteShelter(adminId, shelter.getId());

        assertThat(shelters.findById(shelter.getId())).isEmpty();
        assertThat(audit.rows()).containsExactly(new ModerationAuditLog.Row(
                1L, shelter.getId(), adminId, ModerationAuditLog.Action.DELETE, null,
                ReviewStatus.NEW, null, NOW));
    }

    @Test
    void aDismissAuditsAndAnIdempotentReDismissDoesNot() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        shelterReports.save(new ShelterReport(shelter.getId(), submitterId,
                ShelterReportType.NON_EXISTENT, null));
        long reportId = shelterReports.findAll().get(0).getId();

        service.dismissReport(adminId, reportId);
        service.dismissReport(adminId, reportId); // no-op

        assertThat(audit.rows()).hasSize(1);
        ModerationAuditLog.Row row = audit.rows().get(0);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.REPORT_DISMISS);
        assertThat(row.shelterId()).isEqualTo(shelter.getId());
        assertThat(row.previousStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(row.newStatus()).isEqualTo(ReviewStatus.NEW);
    }

    @Test
    void aHideAndRestoreAuditTheirReviewState() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        reviews.save(new ShelterReview(shelter.getId(), submitterId, 1, ""));
        long reviewId = reviews.findByShelterId(shelter.getId()).get(0).getId();

        service.hideReview(adminId, reviewId);
        service.hideReview(adminId, reviewId); // no-op
        service.restoreReview(adminId, reviewId);
        service.restoreReview(adminId, reviewId); // no-op

        assertThat(audit.rows()).extracting(ModerationAuditLog.Row::action)
                .containsExactly(ModerationAuditLog.Action.REVIEW_HIDE,
                        ModerationAuditLog.Action.REVIEW_RESTORE);
        assertThat(audit.rows()).allSatisfy(row -> {
            assertThat(row.previousStatus()).isEqualTo(ReviewStatus.NEW);
            assertThat(row.newStatus()).isEqualTo(ReviewStatus.NEW);
            assertThat(row.moderatorId()).isEqualTo(adminId);
        });
    }

    // ---------- the audit list projection ----------

    @Test
    void theAuditListIsNewestFirstWithReadTimeNameResolution() {
        Shelter live = userShelter(ReviewStatus.NEW);
        service.reviewShelter(adminId, live.getId(), ReviewDecision.CONFIRM, null);

        Shelter doomed = new Shelter("Kustutatav", new GeoPoint(59.4, 24.8),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        doomed.setCreatedBy(submitterId);
        doomed.setReviewStatus(ReviewStatus.NEW);
        shelters.save(doomed);
        service.deleteShelter(adminId, doomed.getId());

        List<AdminAuditDto> rows = service.listAudit(null);

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).action()).isEqualTo(ModerationAuditLog.Action.DELETE);
        assertThat(rows.get(0).shelterName()).isEqualTo(AdminModerationService.DELETED_SHELTER_NAME);
        assertThat(rows.get(0).previousStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(rows.get(0).newStatus()).isNull();
        assertThat(rows.get(0).moderatorName()).isEqualTo("Admin");
        assertThat(rows.get(1).action()).isEqualTo(ModerationAuditLog.Action.CONFIRM);
        assertThat(rows.get(1).shelterName()).isEqualTo("Oma varjend");
    }

    @Test
    void theAuditListBoundedLimitIsEnforced() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        service.reviewShelter(adminId, shelter.getId(), ReviewDecision.CONFIRM, null);

        assertThat(service.listAudit(1)).hasSize(1);
        assertThatThrownBy(() -> service.listAudit(0)).isInstanceOf(InvalidShelterException.class);
        assertThatThrownBy(() -> service.listAudit(201)).isInstanceOf(InvalidShelterException.class);
    }
}
