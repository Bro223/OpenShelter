package ee.sheltermap.api;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.NonSuspendableUserException;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.app.ReportNotFoundException;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterHistoryChanges;
import ee.sheltermap.app.ShelterHistoryLog;
import ee.sheltermap.app.ShelterInfoRequestLog;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserNotFoundException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewDecision;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The admin moderation surface (admin-moderation) — manual
 * hide/restore of user shelters, hard delete of user shelters, and the two
 * report queues with their single-row moderation actions.
 *
 * <p>Authorization is the controller's job (fresh kind lookup per
 * request); this service assumes an authenticated admin and owns the
 * guard rails instead:
 * <ul>
 *   <li>USER rows only — status changes and deletes on {@code source !=
 * USER} are 409 (import-owned, the registry import rebuilds its
 *       rows as ACTIVE on every run, so an admin edit would silently
 *       revert);</li>
 *   <li>a restore (INACTIVE → ACTIVE) is the manual status change that
 * DISARMS auto-hide (shelter-trust-and-reports — once a human has
 *       set the status, the 5th NON_EXISTENT report never re-hides);</li>
 *   <li>all writes are single-row transactions; no bulk endpoints; every
 *       unknown id is a 404.</li>
 * </ul>
 *
 * <p>Lives in {@code api} (like {@link ShelterQueryService}, which its
 * list endpoint reuses) so the admin shelter list is the SAME batched
 * trust projection as the public list — no N+1, one SQL surface.
 * Reporter identity in the queues is the user's profile name + email —
 * admin-only data, never exposed outside {@code /admin/*}.
 *
 * <p>Every moderation-relevant WRITE is recorded in the moderation audit
 * trail (community-review-queue v2) in the SAME transaction as the
 * action: status change, delete, report dismiss,
 * and the admin CONFIRM/REJECT decisions (the automatic AUTO_CONFIRM
 * promotion is recorded by the report service itself). The moderator's
 * user id (the controller's fresh kind lookup) is the actor of record.
 * Idempotent no-op calls (re-dismiss, same-status change)
 * record NOTHING — the audit row marks the change, not the request.
 */
@Service
public class AdminModerationService {

    /** The audit list's page default (the cap is the shared {@link Pagination#MAX_PAGE_SIZE}). */
    public static final int AUDIT_DEFAULT_LIMIT = 100;

    /** The read-time rendering of a gone shelter's name in the audit trail. */
    public static final String DELETED_SHELTER_NAME = "Deleted shelter";

    /** The read-time rendering of a gone subject account in the audit trail. */
    public static final String DELETED_ACCOUNT_NAME = "Deleted account";

    /**
     * The read-time rendering of a referent whose name no longer resolves
     * (the literal was inlined five times across this class and
     * {@code ShelterQueryService}): an erased actor's name in the queue /
     * audit rows, a vanished shelter's name in the report queue, and an
     * account whose profile name is blank.
     */
    public static final String UNKNOWN_NAME = "Unknown";

    /** Plain-spoken 409 for a suspend/unsuspend of a GUEST account (no credentials). */
    public static final String NON_REGISTERED_SUSPENSION_MESSAGE =
            "Only registered user accounts can be suspended";

    /**
     * Plain-spoken 403 for a suspend/unsuspend of the provisioned ADMIN
     * account: the environment-provisioned administrator is the
     * deployment's access path — disabling it is a lockout vector, and the
     * env vars (not the app) own the account.
     */
    public static final String PROVISIONED_ADMIN_SUSPENSION_MESSAGE =
            "The environment-provisioned administrator account cannot be suspended or unsuspended";

    private final ShelterQueryService queryService;
    private final ShelterRepository shelters;
    private final ShelterReportRepository shelterReports;
    private final UserRepository users;
    private final Clock clock;
    private final ModerationAuditLog audit;
    private final ShelterService shelterService;
    private final ShelterHistoryLog history;
    private final ShelterInfoRequestLog infoRequests;

    public AdminModerationService(ShelterQueryService queryService,
                                  ShelterRepository shelters,
                                  ShelterReportRepository shelterReports,
                                  UserRepository users,
                                  Clock clock,
                                  ModerationAuditLog audit,
                                  ShelterService shelterService,
                                  ShelterHistoryLog history,
                                  ShelterInfoRequestLog infoRequests) {
        this.queryService = Objects.requireNonNull(queryService, "queryService");
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.shelterReports = Objects.requireNonNull(shelterReports, "shelterReports");
        this.users = Objects.requireNonNull(users, "users");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.audit = Objects.requireNonNull(audit, "audit");
        this.shelterService = Objects.requireNonNull(shelterService, "shelterService");
        this.history = Objects.requireNonNull(history, "history");
        this.infoRequests = Objects.requireNonNull(infoRequests, "infoRequests");
    }

    /**
     * GET /admin/shelters — every shelter, ALL statuses (auto-hidden rows
     * included), id-ordered, filterable by exact status/source and by the
     * case-insensitive name/address substring {@code q}. Same batched
     * trust derivations as the public list plus the submitter's profile
     * name (the trust projection, reused — no N+1).
     *
     * <p>Paging: absent {@code limit}/{@code offset} = the unpaged
     * read (byte-identical to the pre-change path). Present, the filters
     * and the slice run in SQL, the batches run over the page's ids only,
     * and the answer's {@link Pagination.Paged#total()} is the filtered
     * length WITHOUT paging (the always-present X-Total-Count header
     * value, the controller's job to publish).
     */
    @Transactional(readOnly = true)
    public Pagination.Paged<AdminShelterDto> listShelters(ShelterStatus status, ShelterSourceFilter source,
                                                          String q, Integer limit, Integer offset) {
        return queryService.findAllForAdmin(status, source, q, limit, offset);
    }

    /**
     * POST /admin/shelters/{id}/status — manual hide/restore. USER rows
     * only (registry rows → 409, import-owned); unknown id → 404. A
     * restore is the manual change that disarms auto-hide. The change
     * (a no-op same-status call writes nothing, audit included) is
     * recorded in the moderation audit trail.
     *
     * <p>Restoring a REJECTED row reverts its review state to NEW
     * (community-review-queue v2 — it starts over; a rejected row
     * does not come back as CONFIRMED).
     */
    @Transactional
    public void setShelterStatus(long moderatorId, long shelterId, ShelterStatus target) {
        Shelter shelter = shelterService.requireShelter(shelterId);
        shelterService.requireUserOwned(shelter);
        if (shelter.getStatus() == target) {
            return; // a no-op same-status call writes nothing, audit included
        }
        ReviewStatus previousReview = shelter.getReviewStatus();
        if (target == ShelterStatus.ACTIVE) {
            // The restore (shelter-trust-and-reports): once a human
            // has set the status, the NON_EXISTENT reports increment
            // their count but never re-hide this shelter.
            shelter.setAutoHideDisarmed(true);
            // A rejected row starts over as NEW (community-review-queue
            // v2).
            if (shelter.getReviewStatus() == ReviewStatus.REJECTED) {
                shelter.setReviewStatus(ReviewStatus.NEW);
            }
        }
        shelter.setStatus(target);
        shelters.save(shelter);
        // The audit row joins this transaction (community-review-queue
        // v2). previous/new carry the review_status — it moves only
        // on a restore of a REJECTED row; otherwise the action string
        // says what moved.
        audit.record(shelterId, null, moderatorId, ModerationAuditLog.Action.STATUS_CHANGE, null,
                previousReview, shelter.getReviewStatus());
    }

    /**
     * DELETE /admin/shelters/{id} — hard delete of a USER shelter; the DB
     * cascades its shelter reports and occupancy
     * rows (V1/V9 FKs are all ON DELETE CASCADE). USER rows only
     * (registry → 409); unknown id → 404.
     *
     * <p>The audit row is recorded BEFORE the delete: the same
     * transaction commits both, and the dangling shelter_id keeps the row
     * readable — the name renders "Deleted shelter" at read time. The
     * delete also appends the DELETED edit-history row
     * actor-attributed to the moderating admin, through the same service
     * choke point as the author route.
     */
    @Transactional
    public void deleteShelter(long moderatorId, long shelterId) {
        Shelter shelter = shelterService.requireShelter(shelterId);
        shelterService.requireUserOwned(shelter);
        audit.record(shelterId, null, moderatorId, ModerationAuditLog.Action.DELETE, null,
                shelter.getReviewStatus(), null);
        // The delete runs through the service boundary: the
        // 404/409 import-owned guard is enforced there too, so a future
        // caller cannot bypass it; the DELETED history row (actor = the
        // moderating admin) joins the transaction through the same choke
        // point as the author route.
        shelterService.deletePlaceByAdmin(moderatorId, shelterId);
    }

    /**
     * POST /admin/shelters/{id}/request-info — store the
     * moderator→submitter information request on a USER shelter: the
     * submitter sees it on their own row (/mine) and answers ONCE; the
     * admin sees the request with the reply on this list. USER rows only
     * (registry → 409, import-owned, same guard as the other admin
     * writes); unknown id → 409 is impossible here — a shelter without a
     * row is a 404. One exchange per shelter: a second request for the
     * same row (replied or not — the row is KEPT after the reply, audit
     * posture) answers 409.
     *
     * <p>Deliberately NOT audited (the spec delta requires no audit row
     * for it — the request row itself is the record; the moderation trail
     * stays reserved for moderation decisions).
     */
    @Transactional
    public void requestInfo(long moderatorId, long shelterId, String message) {
        Shelter shelter = shelterService.requireShelter(shelterId);
        shelterService.requireUserOwned(shelter);
        infoRequests.request(shelterId, message.trim(), moderatorId);
    }

    /**
     * POST /admin/shelters/{id}/mark-inaccurate — set the
     * public "reported inaccurate" flag on a USER shelter. The row stays
     * visible: status and provenance are untouched, only the V20 stamp is
     * written (the reason, when given, rides on the audit row — the mark is
     * a boolean state, the trail is the record). USER rows only (registry
     * → 409, import-owned, same guard as the other admin writes); unknown
     * id → 404. Idempotent like every other admin moderation action:
     * re-marking an already-marked row is a no-op that records no audit
     * row; a fresh mark records MARK_INACCURATE in this transaction.
     */
    @Transactional
    public void markInaccurate(long moderatorId, long shelterId, String reason) {
        Shelter shelter = shelterService.requireShelter(shelterId);
        shelterService.requireUserOwned(shelter);
        if (shelter.getInaccurateMarkedAt() != null) {
            return; // already marked: a no-op records no audit row
        }
        shelter.setInaccurateMarkedAt(clock.instant());
        shelter.setInaccurateMarkedBy(moderatorId);
        shelters.save(shelter);
        audit.record(shelterId, null, moderatorId,
                ModerationAuditLog.Action.MARK_INACCURATE, normalizeReason(reason),
                shelter.getReviewStatus(), shelter.getReviewStatus());
    }

    /**
     * POST /admin/shelters/{id}/clear-inaccurate — clear the
     * flag (idempotent: clearing an unmarked row is a no-op that records no
     * audit row). Same 404/409 guards as {@link #markInaccurate}; a fresh
     * clear records CLEAR_INACCURATE in this transaction.
     */
    @Transactional
    public void clearInaccurate(long moderatorId, long shelterId) {
        Shelter shelter = shelterService.requireShelter(shelterId);
        shelterService.requireUserOwned(shelter);
        if (shelter.getInaccurateMarkedAt() == null) {
            return; // unmarked: a no-op records no audit row
        }
        shelter.setInaccurateMarkedAt(null);
        shelter.setInaccurateMarkedBy(null);
        shelters.save(shelter);
        audit.record(shelterId, null, moderatorId,
                ModerationAuditLog.Action.CLEAR_INACCURATE, null,
                shelter.getReviewStatus(), shelter.getReviewStatus());
    }

    /**
     * GET /admin/reports — the shelter report queue, newest first. With
     * {@code shelterId} that shelter's queue (unknown shelter → 404);
     * without, the global queue. {@code limit} is 1..{@link Pagination#MAX_PAGE_SIZE}
     * (default {@value #AUDIT_DEFAULT_LIMIT}, anything
     * else a 400) and {@code offset} is the non-negative page start
     * (both bounds are the shared paging vocabulary). The paging
     * is the OFFSET/LIMIT clauses (the table is append-only — nothing
     * deletes rows except the shelter cascade — so the queue must stay
     * bounded in SQL). The answer's {@link Pagination.Paged#total()} is
     * the queue's length WITHOUT paging (the X-Total-Count value).
     * Shelter name/status and the reporter's profile name + email resolve
     * in ONE batched lookup each (no N+1) over the RETURNED page only.
     */
    @Transactional(readOnly = true)
    public Pagination.Paged<AdminShelterReportDto> listShelterReports(Long shelterId, Integer limit,
                                                                      Integer offset) {
        return listShelterReports(shelterId, false, limit, offset);
    }

    /**
     * The queue with the dismiss filter (the moderator's "hide dismissed"
     * control). {@code excludeDismissed=true} renders the OPEN scope only
     * (the dismissed rows are the resolved verdicts — its rule: a
     * dismissed report stops influencing the counts, and the filtered list
     * agrees with them: its X-Total-Count IS the sum of the per-shelter
     * open counts the pins read). Absent/{@code false} renders EVERYTHING
     * (the dismissed rows stay in, dimmed — nothing is hidden silently,
     * and the audit posture is preserved: dismissal records the resolution,
     * it never deletes the report).
     */
    @Transactional(readOnly = true)
    public Pagination.Paged<AdminShelterReportDto> listShelterReports(Long shelterId,
                                                                      boolean excludeDismissed,
                                                                      Integer limit,
                                                                      Integer offset) {
        int size = Pagination.requireDefaultedLimit(limit, AUDIT_DEFAULT_LIMIT);
        long from = offset == null ? 0 : offset;
        if (shelterId != null) {
            shelterService.requireShelter(shelterId);
        }
        List<ShelterReport> reports = queuePage(shelterId, excludeDismissed, from, size);
        long total = queueTotal(shelterId, excludeDismissed);
        if (reports.isEmpty()) {
            return new Pagination.Paged<>(List.of(), total);
        }
        return new Pagination.Paged<>(toReportDtos(reports), total);
    }

    /**
     * The queue's page: the OPEN scope filters the dismissed rows out of
     * the bounded store pages; the default scope is the store's own
     * newest-first page (the queue's table is append-only — the bound is
     * in the SQL, not an in-memory trim).
     */
    private List<ShelterReport> queuePage(Long shelterId, boolean excludeDismissed, long from, int size) {
        if (excludeDismissed) {
            return openReportPage(shelterId, from, size);
        }
        return shelterId == null
                ? shelterReports.findLatest(from, size)
                : shelterReports.findLatestByShelterId(shelterId, from, size);
    }

    /**
     * The queue's length WITHOUT paging (the X-Total-Count): the OPEN
     * scope counts the dismissed-excluded rows; the default scope counts
     * everything (nothing hidden silently).
     */
    private long queueTotal(Long shelterId, boolean excludeDismissed) {
        if (excludeDismissed) {
            return openReportCount(shelterId);
        }
        return shelterId == null
                ? shelterReports.countAll()
                : shelterReports.countByShelterId(shelterId);
    }

    /**
     * The page's rows with their shelter + reporter identity: ONE batched
     * lookup each (no N+1) over the RETURNED page only; a gone shelter
     * renders {@link #UNKNOWN_NAME}, an erased reporter its
     * {@link #UNKNOWN_NAME} fallback.
     */
    private List<AdminShelterReportDto> toReportDtos(List<ShelterReport> reports) {
        Map<Long, Shelter> sheltersById = shelters
                .findByIds(reports.stream().map(ShelterReport::getShelterId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Shelter::getId, Function.identity()));
        Map<Long, User> reporters = users.findByIds(reports.stream()
                .map(ShelterReport::getUserId).collect(Collectors.toSet()));
        return reports.stream()
                .map(report -> {
                    Shelter shelter = sheltersById.get(report.getShelterId());
                    User reporter = reporters.get(report.getUserId());
                    return new AdminShelterReportDto(
                            report.getId(),
                            report.getShelterId(),
                            shelter == null ? UNKNOWN_NAME : shelter.getName(),
                            shelter == null ? null : shelter.getStatus(),
                            report.getType(),
                            report.getDetail(),
                            reporter == null ? UNKNOWN_NAME : reporter.getData().name(),
                            reporter == null ? null : reporter.getData().email(),
                            report.getCreatedAt(),
                            report.isDamped(),
                            report.isDismissed());
                })
                .toList();
    }

    /**
     * The OPEN (non-dismissed) queue page: bounded store reads in the
     * queue's newest-first order (the same (created_at, id) tie-break as
     * the unfiltered read), the dismissed rows dropped in the domain, until
     * the requested window is filled or the table runs out. Every single
     * read is a bounded SQL page (the queue's store-level paging,
     * no unbounded statement), and the scan stops at the window's end: the
     * cost is the dismissed rows NEWER than the requested window (the
     * backlog the moderator already resolved), never the whole table in
     * one read. A dismissal landing between two reads can only surface one
     * row on the next load (eventually consistent — the same posture the
     * unfiltered page has for a concurrent insert).
     */
    private List<ShelterReport> openReportPage(Long shelterId, long from, int size) {
        long need = from + size;
        List<ShelterReport> open = new ArrayList<>();
        long read = 0;
        while (open.size() < need) {
            List<ShelterReport> batch = shelterId == null
                    ? shelterReports.findLatest(read, Pagination.MAX_PAGE_SIZE)
                    : shelterReports.findLatestByShelterId(shelterId, read, Pagination.MAX_PAGE_SIZE);
            if (batch.isEmpty()) {
                break;
            }
            for (ShelterReport report : batch) {
                if (!report.isDismissed()) {
                    open.add(report);
                }
            }
            read += batch.size();
            if (batch.size() < Pagination.MAX_PAGE_SIZE) {
                break; // a short batch is the end of the table
            }
        }
        int start = (int) Math.min(from, open.size());
        int end = (int) Math.min(need, open.size());
        return List.copyOf(open.subList(start, end));
    }

    /**
     * The OPEN queue's length WITHOUT paging (the filtered view's
     * X-Total-Count): the dismissed-excluded count the pins read,
     * summed over the queue's scope. A store-level COUNT, never a
     * read: the global scope must not pay for the shelter table (or the
     * report rows) — reports of deleted shelters cascade away with the
     * shelter, so the undismissed count covers the whole table by itself.
     */
    private long openReportCount(Long shelterId) {
        if (shelterId == null) {
            return shelterReports.countOpen();
        }
        return shelterReports.countByTypeForShelterIds(List.of(shelterId)).stream()
                .mapToLong(ShelterReportRepository.ReportTypeCount::count)
                .sum();
    }

    /**
     * POST /admin/reports/{id}/dismiss — mark a shelter report resolved
     * (idempotent: a re-dismiss is a no-op, the stamp is set once, and a
     * no-op records no audit row). The row is KEPT — dismissing records
     * the resolution, it never deletes the report. Unknown id → 404.
     */
    @Transactional
    public void dismissReport(long moderatorId, long reportId) {
        ShelterReport report = shelterReports.findById(reportId)
                .orElseThrow(() -> new ReportNotFoundException(reportId));
        if (report.isDismissed()) {
            return; // already resolved: a no-op records no audit row, the stamp is set once
        }
        report.markDismissed(clock.instant());
        shelterReports.save(report);
        ReviewStatus reviewStatus = reviewStatusOf(report.getShelterId());
        audit.record(report.getShelterId(), null, moderatorId,
                ModerationAuditLog.Action.REPORT_DISMISS, null, reviewStatus, reviewStatus);
    }

    /**
     * POST /admin/shelters/{id}/review — the community review decision
     * (community-review-queue v2) — the rare manual override; the
     * primary trust flow is the automatic community one (AUTO_CONFIRM).
     * USER rows only (registry → 409, import-owned); unknown id → 404.
     *
     * <p>CONFIRM: review_status=CONFIRMED, the note is cleared, the
     * status is untouched (a CONFIRM of an INACTIVE row does not
     * un-hide it — visibility is the status endpoint's job). REJECT:
     * review_status=REJECTED AND status=INACTIVE (the existing hide
     * mechanism), and the reason, when given, becomes the note.
     *
     * <p>Deliberately NOT a manual status change: CONFIRM does not
     * disarm auto-hide (shelter-trust-and-reports) — the row is
     * community-reported and unverified, so the trust layer may hide it
     * on the 5th NON_EXISTENT report just like any other community row.
     *
     * <p>The decision is recorded in the moderation audit trail in this
     * transaction with the previous/new review_status pair and the
     * moderator's id.
     */
    @Transactional
    public void reviewShelter(long moderatorId, long shelterId, ReviewDecision decision, String reason) {
        Shelter shelter = shelterService.requireShelter(shelterId);
        shelterService.requireUserOwned(shelter);
        ReviewStatus previous = shelter.getReviewStatus();
        String note = normalizeReason(reason);
        switch (decision) {
            case CONFIRM -> {
                shelter.setReviewStatus(ReviewStatus.CONFIRMED);
                shelter.setReviewNote(null);
            }
            case REJECT -> {
                shelter.setReviewStatus(ReviewStatus.REJECTED);
                shelter.setStatus(ShelterStatus.INACTIVE);
                shelter.setReviewNote(note);
            }
        }
        shelters.save(shelter);
        // The audit reason is the stored note — only REJECT stores one
        // (CONFIRM clears the note and ignores the reason).
        audit.record(shelterId, null, moderatorId, auditAction(decision),
                decision == ReviewDecision.REJECT ? note : null, previous,
                shelter.getReviewStatus());
    }

    /**
     * GET /admin/audit — the moderation audit trail, newest first
     * (community-review-queue). {@code limit} is
     * 1..{@link Pagination#MAX_PAGE_SIZE} (default
     * {@value #AUDIT_DEFAULT_LIMIT}); anything else is a 400 (the shared
     * paging bound vocabulary). {@code offset} is the non-negative page
     * start. The answer's {@link Pagination.Paged#total()} is the
     * trail's length WITHOUT paging (the X-Total-Count value). Shelter
     * names and moderator names resolve in ONE batched lookup each (no
     * N+1); a gone shelter renders {@link #DELETED_SHELTER_NAME} (the row
     * outlives a hard delete).
     */
    @Transactional(readOnly = true)
    public Pagination.Paged<AdminAuditDto> listAudit(Integer limit, Integer offset) {
        int size = Pagination.requireDefaultedLimit(limit, AUDIT_DEFAULT_LIMIT);
        long from = offset == null ? 0 : offset;
        List<ModerationAuditLog.Row> rows = audit.findLatest(from, size);
        long total = audit.countAll();
        if (rows.isEmpty()) {
            return new Pagination.Paged<>(List.of(), total);
        }
        return new Pagination.Paged<>(toAuditDtos(rows), total);
    }

    /**
     * The trail's rows with their subject + moderator names: user-scoped
     * rows carry a null shelterId + a subjectUserId, and both reference
     * sets resolve in ONE batched lookup each (no N+1), dangling ids
     * included (rendered at read time — "Deleted shelter" / "Deleted
     * account").
     */
    private List<AdminAuditDto> toAuditDtos(List<ModerationAuditLog.Row> rows) {
        Set<Long> shelterIds = rows.stream()
                .map(ModerationAuditLog.Row::shelterId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> subjectIds = rows.stream()
                .map(ModerationAuditLog.Row::subjectUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, String> shelterNames = shelters.findByIds(shelterIds)
                .stream().collect(Collectors.toMap(Shelter::getId, Shelter::getName));
        Map<Long, User> subjects = users.findByIds(subjectIds);
        Map<Long, User> moderators = users.findByIds(rows.stream()
                .map(ModerationAuditLog.Row::moderatorId).filter(Objects::nonNull).collect(Collectors.toSet()));
        return rows.stream()
                .map(row -> {
                    // V14: moderation_actions.moderator_id is ON DELETE SET NULL,
                    // so a row can outlive its moderator with a null id. The lookup
                    // must not take that null key — an immutable map throws on
                    // get(null) instead of answering null — hence the guard, and the
                    // "Unknown" fallback the spec promises for an erased moderator.
                    Long moderatorId = row.moderatorId();
                    User moderator = moderatorId == null ? null : moderators.get(moderatorId);
                    return new AdminAuditDto(
                            row.id(),
                            row.shelterId(),
                            auditSubjectName(row, shelterNames, subjects),
                            row.action(),
                            row.reason(),
                            row.previousStatus(),
                            row.newStatus(),
                            moderator == null ? UNKNOWN_NAME : moderator.getData().name(),
                            row.createdAt());
                })
                .toList();
    }

    /**
     * GET /admin/shelters/{id}/history — the shelter's edit history, ASCENDING
     * (moderation-dashboard-completion): CREATED on
     * submission, EDITED on an owner PUT that moved fields (server-parsed
     * {@code {field, from, to}} tuples — the FE renders, never parses),
     * DELETED on a user or admin hard delete. Actor names resolve in ONE
     * batched user lookup (dangling actors render "Unknown").
     *
     * <p>404 ONLY when the shelter is absent AND no history rows exist — a
     * deleted shelter's history still serves (the rows' shelter_id dangles
     * legally; every row carries its own name snapshot). Registry import
     * rows answer an empty list (the import keeps its own data_imports
     * audit and writes no history rows).
     */
    @Transactional(readOnly = true)
    public List<AdminShelterHistoryDto> shelterHistory(long shelterId) {
        List<ShelterHistoryLog.Event> events = history.findByShelterId(shelterId);
        if (events.isEmpty() && shelters.findById(shelterId).isEmpty()) {
            throw new ShelterNotFoundException(shelterId);
        }
        if (events.isEmpty()) {
            return List.of();
        }
        return toHistoryDtos(events);
    }

    /**
     * The history rows with their actor names: ONE batched user lookup
     * (no N+1); a dangling actor renders "Unknown".
     */
    private List<AdminShelterHistoryDto> toHistoryDtos(List<ShelterHistoryLog.Event> events) {
        Map<Long, User> actors = users.findByIds(events.stream()
                .map(ShelterHistoryLog.Event::actorUserId).filter(Objects::nonNull)
                .collect(Collectors.toSet()));
        return events.stream()
                .map(event -> {
                    User actor = event.actorUserId() == null ? null : actors.get(event.actorUserId());
                    return new AdminShelterHistoryDto(
                            event.id(),
                            event.shelterName(),
                            actor == null ? UNKNOWN_NAME : actor.getData().name(),
                            event.action(),
                            ShelterHistoryChanges.parse(event.changes()),
                            event.createdAt());
                })
                .toList();
    }

    /**
     * The audit row's subject text: a shelter row renders
     * the shelter name (or "Deleted shelter" once the row is gone); a
     * user-scoped row renders "Account: name (email)" (or "Deleted
     * account" after the target's erasure). A guidance/media row
     * (crisis-guidance) resolves its stored {@code subjectLabel}
     * FIRST — the label snapshot that outlives the deleted target; only
     * a NULL label (every pre-V23 row) falls through to the shelter /
     * account resolution, so no existing row changes behaviour. The DTO
     * shape is unchanged — this text occupies the existing shelter-name
     * slot, which the frontend labels "Subject".
     */
    private static String auditSubjectName(ModerationAuditLog.Row row,
                                           Map<Long, String> shelterNames,
                                           Map<Long, User> subjects) {
        if (row.subjectLabel() != null) {
            return row.subjectLabel();
        }
        if (row.shelterId() != null) {
            return shelterNames.getOrDefault(row.shelterId(), DELETED_SHELTER_NAME);
        }
        // Same dangling-id hazard as the moderator slot: the subject lookup may be
        // an immutable empty map, so a null key must never reach it.
        Long subjectId = row.subjectUserId();
        User subject = subjectId == null ? null : subjects.get(subjectId);
        if (subject == null) {
            return DELETED_ACCOUNT_NAME;
        }
        String name = subject.getData().name();
        String email = subject.getData().email();
        String base = (name == null || name.isBlank()) ? UNKNOWN_NAME : name;
        return "Account: " + base + (email == null || email.isBlank() ? "" : " (" + email + ")");
    }

    /**
     * GET /admin/users — the account list behind the Users tab:
     * every REGISTERED and ADMIN account, id-ordered, with its
     * suspension state. GUEST rows never reach the read (no credentials
     * to suspend) — they are excluded IN THE SQL, so a page never loads
     * — and never decrypts — the whole account population.
     *
     * <p>Paged like the other admin lists (the owner's "every admin
     * list pages" rule): {@code limit} is 1..{@link Pagination#MAX_PAGE_SIZE}
     * (default {@value #AUDIT_DEFAULT_LIMIT}, anything else a 400) and
     * {@code offset} is the non-negative page start (both bounds are the
     * shared paging vocabulary, the controller's checks run BEFORE the
     * read). The answer's {@link Pagination.Paged#total()} is the tab's
     * population WITHOUT paging (the X-Total-Count value).
     */
    @Transactional(readOnly = true)
    public Pagination.Paged<AdminUserDto> listUsers(Integer limit, Integer offset) {
        int size = Pagination.requireDefaultedLimit(limit, AUDIT_DEFAULT_LIMIT);
        long from = offset == null ? 0 : offset;
        List<AdminUserDto> dtos = users.findAccountPage(from, size).stream()
                .map(AdminModerationService::toUserDto)
                .toList();
        return new Pagination.Paged<>(dtos, users.countAccounts());
    }

    /** The tab's row: the account identity it needs plus the suspension state. */
    private static AdminUserDto toUserDto(User user) {
        return AdminUserDto.of(user.getData(), kindName(user), user.getSuspendedAt(), user.getId());
    }

    /**
     * POST /admin/users/{id}/suspend — set the suspension
     * stamp on a REGISTERED account (idempotent: re-suspending an
     * already-suspended account is a no-op that records no audit row).
     * Unknown id → 404; ADMIN → 403 (the provisioned admin is a lockout
     * vector — it cannot be disabled at all); GUEST → 409 (no
     * credentials). The audit row joins this transaction with the account
     * as subject (shelterless row).
     */
    @Transactional
    public void suspendUser(long moderatorId, long userId) {
        User user = requireSuspendableUser(userId);
        if (user.isSuspended()) {
            return; // already suspended: a no-op records no audit row
        }
        user.suspend(clock.instant());
        users.save(user);
        audit.record(null, userId, moderatorId, ModerationAuditLog.Action.USER_SUSPEND,
                null, null, null);
    }

    /**
     * POST /admin/users/{id}/unsuspend — clear the stamp
     * (idempotent: unsuspending an active account is a no-op that records
     * no audit row). The same guards as {@link #suspendUser}: 404 unknown
     * id, 403 the provisioned admin (it is never suspended — there is
     * nothing to lift), 409 guest.
     */
    @Transactional
    public void unsuspendUser(long moderatorId, long userId) {
        User user = requireSuspendableUser(userId);
        if (!user.isSuspended()) {
            return; // not suspended: a no-op records no audit row
        }
        user.unsuspend();
        users.save(user);
        audit.record(null, userId, moderatorId, ModerationAuditLog.Action.USER_UNSUSPEND,
                null, null, null);
    }

    /**
     * The suspension guards, in order: 404 the unknown id, 403 the
     * provisioned admin (the deployment's access path — a lockout vector,
     * it cannot be disabled at all), 409 the guest (no credentials).
     */
    private User requireSuspendableUser(long userId) {
        User user = requireUser(userId);
        if (user instanceof AdminUser) {
            throw new ProvisionedAdminProtectedException(PROVISIONED_ADMIN_SUSPENSION_MESSAGE);
        }
        if (!isRegistered(user)) {
            throw new NonSuspendableUserException(NON_REGISTERED_SUSPENSION_MESSAGE);
        }
        return user;
    }

    private User requireUser(long userId) {
        User user = users.findById(userId);
        if (user == null) {
            throw new UserNotFoundException(userId);
        }
        return user;
    }

    /**
     * REGISTERED only — the kind truth is the domain class (the in-memory
     * fake mirrors the JPA impl's users.kind column the same way).
     * AdminUser IS-A RegisteredUser, so it is excluded explicitly (the
     * ADMIN kind is already refused above with the 403 — only GUEST
     * reaches this guard today).
     */
    private static boolean isRegistered(User user) {
        return user instanceof RegisteredUser && !(user instanceof AdminUser);
    }

    private static String kindName(User user) {
        if (user instanceof AdminUser) {
            return "ADMIN";
        }
        if (user instanceof RegisteredUser) {
            return "REGISTERED";
        }
        return "GUEST";
    }

    /** The target shelter's review state for the audit row (the FK guarantees the row exists). */
    private ReviewStatus reviewStatusOf(long shelterId) {
        return shelters.findById(shelterId)
                .map(Shelter::getReviewStatus)
                .orElseThrow(() -> new ShelterNotFoundException(shelterId));
    }

    /** A blank reason stores NULL (the note is absent, not empty). */
    private static String normalizeReason(String reason) {
        return reason == null || reason.isBlank() ? null : reason.trim();
    }

    /** The decision's audit action (the names are the same on purpose). */
    private static ModerationAuditLog.Action auditAction(ReviewDecision decision) {
        return switch (decision) {
            case CONFIRM -> ModerationAuditLog.Action.CONFIRM;
            case REJECT -> ModerationAuditLog.Action.REJECT;
        };
    }
}
