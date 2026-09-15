package ee.sheltermap.api;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.app.InMemoryDataImportLog;
import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterHistoryLog;
import ee.sheltermap.app.InMemoryShelterInfoRequestLog;
import ee.sheltermap.app.InMemoryShelterOccupancyRepository;
import ee.sheltermap.app.InMemoryShelterOpenStatusRepository;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReportRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ImportOwnedShelterException;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.NonSuspendableUserException;
import ee.sheltermap.app.ShelterHistoryChanges;
import ee.sheltermap.app.ShelterHistoryLog;
import ee.sheltermap.app.ShelterInfoRequestLog;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.DuplicateInfoRequestException;
import ee.sheltermap.app.UserNotFoundException;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewDecision;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    private InMemoryShelterOccupancyRepository occupancy;
    private InMemoryShelterOpenStatusRepository openStatus;
    private InMemoryUserRepository users;
    private InMemoryModerationAuditLog audit;
    private InMemoryShelterHistoryLog history;
    private InMemoryShelterInfoRequestLog infoRequests;
    private AdminModerationService service;

    private long adminId;
    private long submitterId;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        shelterReports = new InMemoryShelterReportRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        openStatus = new InMemoryShelterOpenStatusRepository();
        users = new InMemoryUserRepository();
        audit = new InMemoryModerationAuditLog(FIXED);
        history = new InMemoryShelterHistoryLog(FIXED);
        infoRequests = new InMemoryShelterInfoRequestLog(FIXED);
        ShelterQueryService queryService =
                new ShelterQueryService(shelters, users, shelterReports, occupancy,
                        openStatus,
                        new InMemoryDataImportLog(), audit, infoRequests, FIXED);
        service = new AdminModerationService(queryService, shelters, shelterReports,
                users, FIXED,
                audit,
                new ShelterService(shelters, users, 1_000, 100.0, new ThrottleAlertRecorder(128),
                        history, FIXED),
                history,
                infoRequests);

        adminId = saveAdmin("Admin", "admin@example.ee");
        submitterId = saveUser("Autor", "autor@example.ee");
    }

    private long saveAdmin(String name, String email) {
        ee.sheltermap.domain.AdminUser user = new ee.sheltermap.domain.AdminUser(name, email, null);
        users.save(user);
        return user.getId();
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
                1L, shelter.getId(), null, adminId, ModerationAuditLog.Action.CONFIRM, null,
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
                1L, shelter.getId(), null, adminId, ModerationAuditLog.Action.REJECT, "Pole varjend",
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
                1L, shelter.getId(), null, adminId, ModerationAuditLog.Action.STATUS_CHANGE, null,
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

    // ---------- delete / dismiss audit rows ----------

    @Test
    void aDeleteAuditsWithNullNewStatusAndRemovesTheShelter() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.deleteShelter(adminId, shelter.getId());

        assertThat(shelters.findById(shelter.getId())).isEmpty();
        assertThat(audit.rows()).containsExactly(new ModerationAuditLog.Row(
                1L, shelter.getId(), null, adminId, ModerationAuditLog.Action.DELETE, null,
                ReviewStatus.NEW, null, NOW));
    }

    @Test
    void aDismissAuditsAndAnIdempotentReDismissDoesNot() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        shelterReports.save(new ShelterReport(shelter.getId(), submitterId,
                ShelterReportType.NON_EXISTENT, null, NOW));
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

    // ---------- user suspension (M10 slice 1) ----------

    @Test
    void suspendingARegisteredUserSetsTheStampAndAuditsWithTheAccountAsSubject() {
        service.suspendUser(adminId, submitterId);

        assertThat(users.findById(submitterId).isSuspended()).isTrue();
        assertThat(users.findById(submitterId).getSuspendedAt()).isEqualTo(NOW);
        List<ModerationAuditLog.Row> rows = audit.rows();
        assertThat(rows).hasSize(1);
        ModerationAuditLog.Row row = rows.get(0);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.USER_SUSPEND);
        assertThat(row.shelterId()).isNull();
        assertThat(row.subjectUserId()).isEqualTo(submitterId);
        assertThat(row.moderatorId()).isEqualTo(adminId);

        // The audit list renders the account in the subject slot.
        List<AdminAuditDto> dtos = service.listAudit(null);
        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).shelterName()).isEqualTo("Account: Autor (autor@example.ee)");
        assertThat(dtos.get(0).moderatorName()).isEqualTo("Admin");
    }

    @Test
    void reSuspendingAnAlreadySuspendedUserIsANoOpWithoutAnAuditRow() {
        service.suspendUser(adminId, submitterId);
        Instant first = users.findById(submitterId).getSuspendedAt();

        service.suspendUser(adminId, submitterId);

        assertThat(users.findById(submitterId).getSuspendedAt()).isEqualTo(first);
        assertThat(audit.rows()).hasSize(1);
    }

    @Test
    void unsuspendingClearsTheStampAndAudits() {
        service.suspendUser(adminId, submitterId);
        service.unsuspendUser(adminId, submitterId);

        assertThat(users.findById(submitterId).isSuspended()).isFalse();
        List<ModerationAuditLog.Row> rows = audit.rows();
        assertThat(rows).hasSize(2);
        assertThat(rows.get(1).action()).isEqualTo(ModerationAuditLog.Action.USER_UNSUSPEND);
        assertThat(rows.get(1).subjectUserId()).isEqualTo(submitterId);
    }

    @Test
    void unsuspendingAnActiveUserIsANoOpWithoutAnAuditRow() {
        service.unsuspendUser(adminId, submitterId);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void suspendingAnAdminAccountIsRefusedWith409() {
        assertThatThrownBy(() -> service.suspendUser(adminId, adminId))
                .isInstanceOf(NonSuspendableUserException.class)
                .hasMessage(AdminModerationService.NON_REGISTERED_SUSPENSION_MESSAGE);
        assertThat(users.findById(adminId).isSuspended()).isFalse();
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void suspendingAnUnknownUserIsA404() {
        assertThatThrownBy(() -> service.suspendUser(adminId, 999L))
                .isInstanceOf(UserNotFoundException.class);
        assertThatThrownBy(() -> service.unsuspendUser(adminId, 999L))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void theUserListCarriesTheSuspensionStateAndSkipsGuests() {
        // A guest row (no email) must not appear in the list.
        users.save(new ee.sheltermap.domain.GuestUser());

        List<AdminUserDto> rows = service.listUsers();

        assertThat(rows).hasSize(2); // admin + submitter, id-ordered
        assertThat(rows.get(0).id()).isEqualTo(adminId);
        assertThat(rows.get(0).kind()).isEqualTo("ADMIN");
        assertThat(rows.get(1).id()).isEqualTo(submitterId);
        assertThat(rows.get(1).kind()).isEqualTo("REGISTERED");
        assertThat(rows.get(1).email()).isEqualTo("autor@example.ee");
        assertThat(rows.get(1).suspendedAt()).isNull();

        service.suspendUser(adminId, submitterId);
        AdminUserDto suspended = service.listUsers().get(1);
        assertThat(suspended.suspendedAt()).isEqualTo(NOW);
    }

    @Test
    void theAuditListRendersADeletedAccountSubject() {
        service.suspendUser(adminId, submitterId);
        users.delete(submitterId);

        List<AdminAuditDto> rows = service.listAudit(null);
        assertThat(rows.get(0).shelterName())
                .isEqualTo(AdminModerationService.DELETED_ACCOUNT_NAME);
    }

    // ---------- edit-history projection (M10 slice 2, D4) ----------

    @Test
    void historyOfAnAbsentShelterWithNoRowsIsA404() {
        assertThatThrownBy(() -> service.shelterHistory(999L))
                .isInstanceOf(ShelterNotFoundException.class);
    }

    @Test
    void historyOfAnExistingShelterWithoutRowsIsEmpty() {
        // a registry import row: present, but the import writes no history
        // (it keeps its own data_imports audit)
        Shelter registry = registryShelter();

        assertThat(service.shelterHistory(registry.getId())).isEmpty();
    }

    @Test
    void aDeletedSheltersHistoryStillServesTheDanglingRows() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        long id = shelter.getId();
        history.record(id, "Oma varjend", submitterId, ShelterHistoryLog.Action.CREATED, null);
        history.record(id, "Uus nimi", submitterId, ShelterHistoryLog.Action.EDITED, null);
        history.record(id, "Uus nimi", adminId, ShelterHistoryLog.Action.DELETED, null);
        shelters.deleteById(id);

        List<AdminShelterHistoryDto> rows = service.shelterHistory(id);

        assertThat(rows).extracting(AdminShelterHistoryDto::action)
                .containsExactly(ShelterHistoryLog.Action.CREATED,
                        ShelterHistoryLog.Action.EDITED, ShelterHistoryLog.Action.DELETED);
        // snapshot names per event — the rename does not rewrite the CREATED row
        assertThat(rows).extracting(AdminShelterHistoryDto::shelterName)
                .containsExactly("Oma varjend", "Uus nimi", "Uus nimi");
        assertThat(rows).extracting(AdminShelterHistoryDto::actorName)
                .containsExactly("Autor", "Autor", "Admin");
    }

    @Test
    void editedRowChangesAreParsedServerSideIntoFieldTuples() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        history.record(shelter.getId(), "Oma varjend", submitterId, ShelterHistoryLog.Action.EDITED,
                ShelterHistoryChanges.toJson(movedFields(
                        new Object[]{"name", new Object[]{"Oma varjend", "Uus nimi"}},
                        new Object[]{"capacity", new Object[]{null, 40}})));

        List<AdminShelterHistoryDto> rows = service.shelterHistory(shelter.getId());

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).changes()).containsExactly(
                new ShelterHistoryLog.FieldChange("name", "Oma varjend", "Uus nimi"),
                new ShelterHistoryLog.FieldChange("capacity", null, "40"));
        assertThat(rows.get(0).createdAt()).isEqualTo(NOW);
    }

    @Test
    void aDanglingActorRendersUnknownInTheHistory() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        history.record(shelter.getId(), "Oma varjend", submitterId, ShelterHistoryLog.Action.CREATED, null);
        history.record(shelter.getId(), "Oma varjend", 999_999L, ShelterHistoryLog.Action.DELETED, null);

        List<AdminShelterHistoryDto> rows = service.shelterHistory(shelter.getId());

        assertThat(rows.get(0).actorName()).isEqualTo("Autor");
        assertThat(rows.get(1).actorName()).isEqualTo("Unknown");
    }

    /** An ordered moved-field map (canonical order — Map.of is unordered). */
    @SafeVarargs
    private static Map<String, Object[]> movedFields(Object[]... pairs) {
        // pairs: [fieldName, value], [fieldName, value], ...
        Map<String, Object[]> moved = new LinkedHashMap<>();
        for (Object[] pair : pairs) {
            moved.put((String) pair[0], (Object[]) pair[1]);
        }
        return moved;
    }

    // ---------- request-info (M10 slice 3) ----------

    @Test
    void aRequestInfoStoresTheExchangeOnTheRow() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.requestInfo(adminId, shelter.getId(), "  Kas varjend on avatud?  ");

        ShelterInfoRequestLog.InfoRequest row = infoRequests.findByShelterId(shelter.getId())
                .orElseThrow();
        assertThat(row.message()).isEqualTo("Kas varjend on avatud?");
        assertThat(row.requestedBy()).isEqualTo(adminId);
        assertThat(row.requestedAt()).isEqualTo(NOW);
        assertThat(row.replyMessage()).isNull();
        assertThat(row.repliedBy()).isNull();
        // Deliberately NOT audited (the spec delta requires no audit row —
        // the request row itself is the record).
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aSecondRequestForTheSameShelterIsAConflict() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        service.requestInfo(adminId, shelter.getId(), "Esimene");

        assertThatThrownBy(() -> service.requestInfo(adminId, shelter.getId(), "Teine"))
                .isInstanceOf(DuplicateInfoRequestException.class);
        assertThat(infoRequests.findByShelterId(shelter.getId()).orElseThrow().message())
                .isEqualTo("Esimene");
    }

    @Test
    void requestsOnRegistryRowsAreConflictsAndUnknownIdsAre404() {
        Shelter registry = registryShelter();

        assertThatThrownBy(() -> service.requestInfo(adminId, registry.getId(), "Kust?"))
                .isInstanceOf(ImportOwnedShelterException.class);
        assertThatThrownBy(() -> service.requestInfo(adminId, 999_999L, "Kust?"))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThat(infoRequests.rows()).isEmpty();
    }

    // ---------- mark inaccurate (M10 slice 4) ----------

    @Test
    void aMarkStampsTheRowAndAuditsWithTheReason() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.markInaccurate(adminId, shelter.getId(), "  Uks on suletud  ");

        assertThat(shelter.getInaccurateMarkedAt()).isEqualTo(NOW);
        assertThat(shelter.getInaccurateMarkedBy()).isEqualTo(adminId);
        // The row stays visible: status and review state untouched.
        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(shelter.getReviewStatus()).isEqualTo(ReviewStatus.NEW);
        assertThat(audit.rows()).containsExactly(new ModerationAuditLog.Row(
                1L, shelter.getId(), null, adminId, ModerationAuditLog.Action.MARK_INACCURATE,
                "Uks on suletud", ReviewStatus.NEW, ReviewStatus.NEW, NOW));
    }

    @Test
    void aBlankReasonStoresNullOnTheAuditRow() {
        Shelter shelter = userShelter(ReviewStatus.CONFIRMED);

        service.markInaccurate(adminId, shelter.getId(), "   ");

        assertThat(audit.rows()).hasSize(1);
        assertThat(audit.rows().get(0).reason()).isNull();
    }

    @Test
    void aSecondMarkIsANoOp() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        service.markInaccurate(adminId, shelter.getId(), "Esimene");

        service.markInaccurate(adminId, shelter.getId(), "Teine");

        assertThat(shelter.getInaccurateMarkedAt()).isEqualTo(NOW);
        assertThat(shelter.getInaccurateMarkedBy()).isEqualTo(adminId);
        // Idempotent: the second mark writes nothing, audit included.
        assertThat(audit.rows()).hasSize(1);
        assertThat(audit.rows().get(0).reason()).isEqualTo("Esimene");
    }

    @Test
    void aClearRemovesTheStampAndAudits() {
        Shelter shelter = userShelter(ReviewStatus.NEW);
        service.markInaccurate(adminId, shelter.getId(), "Uks on suletud");

        service.clearInaccurate(adminId, shelter.getId());

        assertThat(shelter.getInaccurateMarkedAt()).isNull();
        assertThat(shelter.getInaccurateMarkedBy()).isNull();
        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(audit.rows()).extracting(ModerationAuditLog.Row::action)
                .containsExactly(ModerationAuditLog.Action.MARK_INACCURATE,
                        ModerationAuditLog.Action.CLEAR_INACCURATE);
        assertThat(audit.rows().get(1).reason()).isNull();
    }

    @Test
    void aClearOfAnUnmarkedRowIsANoOp() {
        Shelter shelter = userShelter(ReviewStatus.NEW);

        service.clearInaccurate(adminId, shelter.getId());

        assertThat(shelter.getInaccurateMarkedAt()).isNull();
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void marksOnRegistryRowsAreConflictsAndUnknownIdsAre404() {
        Shelter registry = registryShelter();

        assertThatThrownBy(() -> service.markInaccurate(adminId, registry.getId(), "Kust?"))
                .isInstanceOf(ImportOwnedShelterException.class);
        assertThatThrownBy(() -> service.clearInaccurate(adminId, registry.getId()))
                .isInstanceOf(ImportOwnedShelterException.class);
        assertThatThrownBy(() -> service.markInaccurate(adminId, 999_999L, "Kust?"))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThatThrownBy(() -> service.clearInaccurate(adminId, 999_999L))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThat(registry.getInaccurateMarkedAt()).isNull();
        assertThat(audit.rows()).isEmpty();
    }
}
