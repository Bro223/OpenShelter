package ee.sheltermap.api;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.Pagination;
import ee.sheltermap.app.ShelterHistoryChanges;
import ee.sheltermap.app.ShelterHistoryLog;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.User;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The moderation audit trail and the shelter edit history — the read
 * projections extracted from {@link AdminModerationService}.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code
 * AdminModerationService} (whose constructor the unit suite freezes at
 * its nine collaborators) constructs it from its own audit log,
 * repositories and history log, and its public {@code listAudit} /
 * {@code shelterHistory} methods are called from the service's
 * {@code @Transactional(readOnly = true)} delegates — the bean methods
 * keep the transaction boundary and the public surface.
 *
 * <p>The read rules (unchanged by the extraction): the trail is newest
 * first and its total is the trail's length WITHOUT paging (the
 * X-Total-Count value); the subject and moderator names resolve in ONE
 * batched lookup each (no N+1) over the RETURNED page only — a gone
 * shelter renders {@link #DELETED_SHELTER_NAME} (the row outlives a
 * hard delete), a gone actor {@link AdminModerationService#UNKNOWN_NAME}.
 * The audit subject prefers the stored {@code subjectLabel} (V23+) and
 * falls through to the shelter / account resolution only for a NULL
 * label (every pre-V23 row). The history is ASCENDING and still serves
 * a deleted shelter's rows (the shelter_id dangles legally — 404 ONLY
 * when the shelter is absent AND no history rows exist).
 */
public class AdminAuditTrail {

    /** The read-time rendering of a gone shelter's name in the audit trail. */
    public static final String DELETED_SHELTER_NAME = "Deleted shelter";

    /** The read-time rendering of a gone subject account in the audit trail. */
    public static final String DELETED_ACCOUNT_NAME = "Deleted account";

    private final ModerationAuditLog audit;
    private final ShelterRepository shelters;
    private final UserRepository users;
    private final ShelterHistoryLog history;

    public AdminAuditTrail(ModerationAuditLog audit, ShelterRepository shelters,
                           UserRepository users, ShelterHistoryLog history) {
        this.audit = Objects.requireNonNull(audit, "audit");
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.users = Objects.requireNonNull(users, "users");
        this.history = Objects.requireNonNull(history, "history");
    }

    /**
     * The audit trail page, newest first. {@code from}/{@code size} are
     * the already-normalized page window (the 400 vocabulary and the
     * default limit run in the service delegate, BEFORE the read), and
     * the total is the trail's length WITHOUT paging (the
     * X-Total-Count value).
     */
    public Pagination.Paged<AdminAuditDto> listAudit(long from, int size) {
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
                            moderator == null ? AdminModerationService.UNKNOWN_NAME : moderator.getData().name(),
                            row.createdAt());
                })
                .toList();
    }

    /**
     * GET /admin/shelters/{id}/history — the shelter's edit history, ASCENDING:
     * CREATED on
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
                            actor == null ? AdminModerationService.UNKNOWN_NAME : actor.getData().name(),
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
     * resolves its stored {@code subjectLabel} FIRST — the label snapshot
     * that outlives the deleted target; only a NULL label (every pre-V23
     * row) falls through to the shelter /
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
        String base = (name == null || name.isBlank()) ? AdminModerationService.UNKNOWN_NAME : name;
        return "Account: " + base + (email == null || email.isBlank() ? "" : " (" + email + ")");
    }
}
