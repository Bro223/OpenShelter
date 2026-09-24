package ee.sheltermap.app;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * User-submitted shelters.
 *
 * <p>Community trust lifecycle without a blocking queue
 * (community-review-queue v2): {@code addPlace} checks
 * {@code canWrite()} first, then persists the place as
 * {@code ACTIVE}/{@code USER}/{@code NEW} — the row is public
 * IMMEDIATELY (the owner does not actively moderate); NEW simply carries
 * the unverified treatment in the UI. Trust moves forward automatically
 * in the report service (an {@code OPEN_CONFIRMED} report from a user
 * other than the submitter promotes NEW→CONFIRMED, audited
 * AUTO_CONFIRM) or via the rare admin CONFIRM; REJECT (admin) hides the
 * row via status INACTIVE.
 *
 * <p>Write-path transaction boundary (reviews F1): the three write
 * methods are {@code @Transactional} — the audit contract documented by
 * {@code JpaShelterHistoryLog} / {@code V18__shelter_history.sql} (the
 * history row commits or rolls back WITH the event it records) is real
 * for the user-facing endpoints too. The anti-abuse caps in
 * {@link #addPlace} are read-check-write, so that method additionally
 * serializes per user with a row lock ({@code UserRepository
 * .lockForUpdate}) — a count cap is not expressible as a DB constraint,
 * and without the lock two concurrent submissions by one user could
 * both pass the check (reviewed-and-proven race, see
 * {@code ShelterSubmissionCapRaceIT}).
 */
@Service
public class ShelterService {

    /**
     * 403 message for unverified shelter submissions — one public constant
     * shared with {@code api.ShelterController}: the API layer pre-checks the
     * same {@code canWrite()} rule.
     */
    public static final String SUBMIT_SHELTERS_MESSAGE =
            "A verified account is required to submit shelters";

    /**
     * 403 message for the ownership rule — the rule itself moved
     * here from {@code api.ShelterController} (the layer that owns the
     * shelter rows owns the guard), one constant for every owner check:
     * the author's PUT/DELETE/reply route and the owner-scoped service
     * boundary below.
     */
    public static final String NOT_AUTHOR_MESSAGE =
            "Only the author may modify this shelter";

    /**
     * 409 message for import-owned rows (admin-moderation) — moved
     * here from {@code api.AdminModerationService}: the hard-delete
     * boundary below enforces it in the service layer too, so the
     * constant travels with the guard. the admin service's
     * forwarder constant is gone with its private guard copy — every
     * throw site constructs from this one constant.
     */
    public static final String IMPORT_OWNED_MESSAGE =
            "Registry shelters are import-owned and cannot be moderated here";

    /**
     * Per-user spam floor (shelter-trust-and-reports): the max shelters
     * one user may have with {@code source = USER} and {@code status =
     * ACTIVE}; the 11th submission is a 409. Deletions and auto-hidden
     * shelters free the cap; ADMIN-kind users are exempt.
     */
    public static final int MAX_ACTIVE_SHELTERS_PER_USER = 10;

    /** The daily submission window (abuse-limits): a rolling 24 h. */
    static final Duration DAILY_SUBMISSION_WINDOW = Duration.ofHours(24);

    /** Earth mean radius in metres (haversine, abuse-limits). */
    static final double EARTH_RADIUS_METERS = 6_371_000;

    private final ShelterRepository shelterRepository;
    private final UserRepository userRepository;
    private final int dailySubmissionsPerUser;
    private final double duplicateCoordMeters;
    private final ThrottleAlertRecorder alerts;
    private final ShelterHistoryLog history;
    /** Time source for the daily-cap window and the exact Retry-After (injected — the caller owns the clock). */
    private final Clock clock;

    public ShelterService(ShelterRepository shelterRepository,
                          UserRepository userRepository,
                          @Value("${app.limits.daily-submissions-per-user:5}") int dailySubmissionsPerUser,
                          @Value("${app.limits.duplicate-coord-meters:100}") double duplicateCoordMeters,
                          ThrottleAlertRecorder alerts,
                          ShelterHistoryLog history,
                          Clock clock) {
        this.shelterRepository = Objects.requireNonNull(shelterRepository, "shelterRepository");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.dailySubmissionsPerUser = dailySubmissionsPerUser;
        this.duplicateCoordMeters = duplicateCoordMeters;
        this.alerts = Objects.requireNonNull(alerts, "alerts");
        this.history = Objects.requireNonNull(history, "history");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * Publishes {@code place} if the user may write.
     *
     * <p>The author link is recorded here (V7): {@code place.createdBy}
     * becomes {@code user.getId()} before the save, so every USER submission
     * is attributable to its submitting account afterwards.
     *
     * @throws NotVerifiedException   if {@code user.canWrite()} is false
     *                                (guest or unverified registered user)
     *                                — the 403-mapped exception, mirroring
     *                                the API layer (B7c; was a generic 500)
     * @throws ShelterLimitExceededException when the user already has
     *                                  {@link #MAX_ACTIVE_SHELTERS_PER_USER}
     *                                  active USER shelters (→ 409; ADMIN
     * kind is exempt)
     * @throws ShelterSubmissionThrottledException when the user has already
     *                                  submitted {@code app.limits.daily-submissions-per-user}
     *                                  USER shelters in the last 24 h (→ 429 + Retry-After;
     *                                  ADMIN kind is exempt, like the active cap)
     * @throws ShelterDuplicateException when an ACTIVE USER row with the same
     *                                  normalized name lies within
     *                                  {@code app.limits.duplicate-coord-meters} haversine
     *                                  (→ 409, message carries the existing row id;
     *                                  ADMIN kind is exempt, like the caps)
     * @throws IllegalArgumentException if the place is not already
     *                                  {@code ACTIVE}/{@code USER} — user submissions must be
     *                                  created ACTIVE immediately, never imported as USER
     */
    @Transactional
    public void addPlace(User user, Shelter place) {
        Objects.requireNonNull(user, "user");
        Objects.requireNonNull(place, "place");
        if (!user.canWrite()) {
            throw new NotVerifiedException(SUBMIT_SHELTERS_MESSAGE);
        }
        if (place.getStatus() != ShelterStatus.ACTIVE || place.getSource() != ShelterSource.USER) {
            throw new IllegalArgumentException(
                    "user-submitted shelters must be ACTIVE with source USER");
        }
        if (!userRepository.isAdmin(user.getId())) {
            // Per-user serialization of the read-check-write below (the
            // anti-abuse race): lock the user row BEFORE the cap check so
            // two concurrent submissions by the same user cannot both pass
            // the count — the loser blocks on the row lock until the
            // winner's transaction commits, then sees the winner's row and
            // gets the same 409 the sequential path documents. The lock is
            // held until this transaction commits (the insert), which is
            // what makes check-then-write atomic. A count cap (and the
            // fuzzy 100 m near-duplicate rule) is not expressible as a DB
            // constraint, so the row lock is the guard — no migration, no
            // new error shape.
            userRepository.lockForUpdate(user.getId());
            if (shelterRepository.countByCreatedByAndSourceAndStatus(
                    user.getId(), ShelterSource.USER, ShelterStatus.ACTIVE)
                    >= MAX_ACTIVE_SHELTERS_PER_USER) {
                throw new ShelterLimitExceededException();
            }
        }
        // Daily rate cap (abuse-limits): sliding 24 h window on the
        // SUBMITTING act, independent of the active count. Deleting a row
        // frees its slot (the row is gone) — the churn vector stays bounded
        // by the active cap + the admin surface.
        if (!userRepository.isAdmin(user.getId())) {
            Instant windowStart = clock.instant().minus(DAILY_SUBMISSION_WINDOW);
            long submitted = shelterRepository.countByCreatedByAndSourceAndCreatedAtAfter(
                    user.getId(), ShelterSource.USER, windowStart);
            if (submitted >= dailySubmissionsPerUser) {
                Integer retryAfter = retryAfterSeconds(windowStart, user.getId());
                // The throttled account surfaces in the admin alerts ring
                // (in-memory) before the 429 goes out.
                alerts.submissionDailyCap(user.getId(), retryAfter);
                throw new ShelterSubmissionThrottledException(retryAfter);
            }
        }
        // Near-duplicate detection (abuse-limits): an ACTIVE USER
        // row with the same normalized name within the coordinate tolerance
        // means the place is already on the map — 409 with the existing row
        // id (the client can point at it or edit it via PUT). Cross-user by
        // design (the throwaway-account re-report vector); ADMIN kind is
        // exempt, like the caps above.
        if (!userRepository.isAdmin(user.getId())) {
            findNearDuplicate(place)
                    .ifPresent(existing -> {
                        // The re-report vector is an alert row,
                        // not just a 409 — the admin sees the repeat reporter.
                        alerts.nearDuplicate(user.getId(), existing.getId());
                        throw new ShelterDuplicateException(existing.getId());
                    });
        }
        place.setCreatedBy(user.getId());
        // Write-time trust snapshot (V31, part 2 of the erasure fix):
        // freeze the submitter's verified standing AS AT WRITE TIME onto
        // the row — account erasure (created_by is ON DELETE SET NULL, V7)
        // must not change it. "Verified" = at least one active (non-revoked)
        // claim — the exact definition the DTO derives for a live author
        // (addPlace's canWrite gate guarantees this account may submit; a
        // policy that ever allowed writing with no claims would snapshot
        // false, which is the honest answer).
        place.setSubmitterVerifiedAtCreation(!user.getData().levels().isEmpty());
        // community-review-queue v2: new community rows publish
        // immediately with the unverified trust state — the public list
        // is unchanged, the UI shows the "newly added" treatment.
        place.setReviewStatus(ReviewStatus.NEW);
        shelterRepository.save(place);
        // Edit history (moderation-dashboard-completion):
        // CREATED joins this transaction, actor = the submitting account.
        history.record(place.getId(), place.getName(), user.getId(),
                ShelterHistoryLog.Action.CREATED, null);
    }

    /**
     * The first ACTIVE USER row that is a near-duplicate of
     * {@code candidate} (abuse-limits): the same normalized name
     * AND within {@code duplicateCoordMeters} haversine. USER rows carry no
     * address (a registry-only field), so name + coordinates are the whole
     * identity signal; fuzzier re-reports (same place, reworded name) stay
     * bounded by the daily cap. The USER table is small, so a Java-side
     * scan over the ACTIVE USER rows (one indexed query) is the seam — no
     * new repository method.
     */
    Optional<Shelter> findNearDuplicate(Shelter candidate) {
        return shelterRepository.findAllActiveBySourceIn(List.of(ShelterSource.USER)).stream()
                .filter(existing -> normalizedNamesEqual(existing.getName(), candidate.getName()))
                .filter(existing -> haversineMeters(existing.getLocation(), candidate.getLocation())
                        <= duplicateCoordMeters)
                .findFirst();
    }

    /** Case/whitespace-insensitive name comparison (the duplicate rule). */
    static boolean normalizedNamesEqual(String a, String b) {
        return normalizeName(a).equals(normalizeName(b));
    }

    /** Lowercase, trim, collapse internal whitespace runs to one space. */
    static String normalizeName(String name) {
        return name.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    /** Haversine great-circle distance in metres. */
    static double haversineMeters(GeoPoint a, GeoPoint b) {
        double dLat = Math.toRadians(b.lat() - a.lat());
        double dLng = Math.toRadians(b.lng() - a.lng());
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(a.lat())) * Math.cos(Math.toRadians(b.lat()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1.0, Math.sqrt(h)));
    }

    /**
     * Seconds until the oldest in-window submission leaves the 24 h window
     * (the exact Retry-After for the daily cap); {@code null} when the
     * window is somehow empty (the handler then omits the header).
     */
    private Integer retryAfterSeconds(Instant windowStart, long userId) {
        return shelterRepository
                .findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
                        userId, ShelterSource.USER, windowStart)
                .map(Shelter::getCreatedAt)
                .filter(Objects::nonNull)
                .map(oldest -> Duration.between(clock.instant(),
                        oldest.plus(DAILY_SUBMISSION_WINDOW)).getSeconds())
                .filter(seconds -> seconds > 0)
                .map(seconds -> (int) Math.min(seconds, Integer.MAX_VALUE))
                .orElse(null);
    }

    /**
     * The author check on a shelter row (moved here from
     * {@code api.ShelterController.requireOwnedShelter}, which enforced it
     * in the controller): the row must exist (404), be USER-source and
     * authored by {@code userId} (403 otherwise — registry and legacy
     * rows are unmanageable by anyone). Plain read, no transaction of
     * its own: the callers run it inside their own boundary (the
     * controller's per-endpoint check, or the {@code @Transactional}
     * owner boundary below) and the repository read is transaction-safe
     * on its own.
     *
     * @throws ShelterNotFoundException 404 — unknown shelter id
     * @throws NotAuthorException 403 — not the author (registry/legacy/
     *                                another user's row)
     */
    public Shelter requireOwnedBy(long shelterId, long userId) {
        Shelter shelter = requireShelter(shelterId);
        if (shelter.getSource() != ShelterSource.USER
                || shelter.getCreatedBy() == null
                || !shelter.getCreatedBy().equals(userId)) {
            throw new NotAuthorException(NOT_AUTHOR_MESSAGE);
        }
        return shelter;
    }

    /**
     * The 404 half of every shelter-row lookup (the byte-identical
     * private copies in {@code ShelterReportService} and
     * {@code AdminModerationService} are gone): unknown id →
     * {@link ShelterNotFoundException} (404), otherwise the row. Plain
     * read, no transaction of its own (the callers run inside their own
     * boundary, and the repository read is transaction-safe on its own).
     *
     * @throws ShelterNotFoundException 404 — unknown shelter id
     */
    public Shelter requireShelter(long shelterId) {
        return shelterRepository.findById(shelterId)
                .orElseThrow(() -> new ShelterNotFoundException(shelterId));
    }

    /**
     * (admin-moderation): only USER-source rows are admin-manageable;
     * registry rows are import-owned. The ONE guard every admin write on
     * a shelter row goes through (the source check was inlined in
     * {@link #deletePlaceByAdmin} AND copied as a private guard in
     * {@code api.AdminModerationService}; the constant now travels with
     * the single guard, and the admin service's forwarder is gone).
     *
     * @throws ImportOwnedShelterException 409 — a registry row
     */
    public void requireUserOwned(Shelter shelter) {
        if (shelter.getSource() != ShelterSource.USER) {
            throw new ImportOwnedShelterException(IMPORT_OWNED_MESSAGE);
        }
    }

    /**
     * The author's OWN update (the ownership guard now sits on the
     * service boundary, not only in the controller): re-checks
     * {@link #requireOwnedBy} and applies {@link #updatePlace}. The
     * controller still runs {@code requireOwnedBy} BEFORE its own 400
     * validations (the status-code order the API documents: 404/403
     * before a bbox 400); this second check makes the service safe to
     * call from a future caller without the pre-check.
     *
     * @throws ShelterNotFoundException 404 — unknown shelter id
     * @throws NotAuthorException 403 — not the author
     */
    @Transactional
    public void updateOwned(long userId, Shelter place) {
        requireOwnedBy(place.getId(), userId);
        updatePlace(place);
    }

    /**
     * The admin hard-delete boundary (the guard now enforced in
     * the service layer too): the row must exist (404) and be USER-source
     * (409, import-owned, admin-moderation — the registry import
     * rebuilds its rows as ACTIVE on every run, so an admin delete would
     * silently revert). The delete itself is {@link #deletePlace} — the
     * same choke point as the author route (the DELETED history row,
     * actor-attributed to the moderating admin, joins the transaction).
     *
     * @throws ShelterNotFoundException 404 — unknown shelter id
     * @throws ImportOwnedShelterException 409 — a registry row
     */
    @Transactional
    public void deletePlaceByAdmin(long moderatorId, long shelterId) {
        requireUserOwned(requireShelter(shelterId));
        deletePlace(shelterId, moderatorId);
    }

    /**
     * Replaces the editable fields of an existing shelter row — same id,
     * status/source/registry fields, {@code createdAt} and author untouched.
     * Callers own the authorization (author check) and validation (field
     * bounds + the Estonia bbox) before calling this.
     *
     * <p>Owner-edit trust reset (the owner's decision): verification
     * is a STATUS, not a gate in front of the edit. {@code reviewStatus}
     * is decided HERE — the incoming row's value is overwritten in every
     * case, so no request field can carry a trust state through (an owner
     * can never self-confirm by editing):
     * <ul>
     *   <li>A real edit (at least one editable field moved) of a
     *       PUBLISHED row sets {@code ReviewStatus.NEW} — exactly the
     *       unverified state {@link #addPlace} gives a newly added
     *       shelter (the provenance then derives UNDER_REVIEW, the amber
     *       "pending verification" treatment). The row's {@code status}
     *       is preserved by the caller and the save: the shelter stays
     *       published, nothing hides. A verification that follows the
     *       edit (the admin CONFIRM, or a community {@code OPEN_CONFIRMED}
     *       report from a non-submitter — both promote NEW→CONFIRMED)
     *       re-clears it.
     *   <li>A no-op PUT (no editable field moved) leaves the trust state
     *       untouched — unchanged data keeps its standing, mirroring the
     *       no-op writing no history row.
     *   <li>An INACTIVE row (the admin REJECT or the 5-report auto-hide)
     *       keeps its review state: the decision stands — no
     *       republish-by-edit and no demotion of the admin's REJECT.
     *       Republishing is an admin action (the status endpoint, which
     *       starts the review over as NEW per community-review-queue v2).
     *   <li>Registry (PAASETEAMET) and partner (MUNICIPALITY) rows cannot
     *       reach this path with a community author at all (the API layer
     *       requires {@code source = USER} + a matching author link), so
     *       their import-owned standing (provenance OFFICIAL /
     *       PARTNER_VERIFIED) is unaffected by this rule.
     * </ul>
     *
     * <p>Concurrent-DELETE race: if the row was
     * deleted between the caller's read and this save, the repository's
     * unknown-id guard surfaces as {@link IllegalStateException} — mapped
     * HERE (the service boundary) to the same 404 as a plain not-found,
     * never a 500. Mapped by re-reading the row (observable state, not
     * message parsing); the repository keeps its internal guard.
     *
     * <p>Edit history (moderation-dashboard-completion):
     * the old row is read FIRST (the diff needs it) — which tightens the
     * race: an absent row is a plain 404 before any diff, not only at the
     * save-time guard. An EDITED row is appended (this transaction) only
     * when at least one editable field MOVED — a no-op PUT saves the same
     * values but records nothing (no edit-spam history). The actor is the
     * author link (legacy rows have none — the actor renders "Unknown").
     */
    @Transactional
    public void updatePlace(Shelter place) {
        Objects.requireNonNull(place, "place");
        Shelter current = shelterRepository.findById(place.getId())
                .orElseThrow(() -> new ShelterNotFoundException(place.getId()));
        Map<String, Object[]> moved = diffFields(current, place);
        // The owner-edit trust reset — the rule and its documented
        // decisions are in the method javadoc. The incoming row's
        // reviewStatus is server-owned and overwritten in every case.
        place.setReviewStatus(!moved.isEmpty() && current.getStatus() == ShelterStatus.ACTIVE
                ? ReviewStatus.NEW
                : current.getReviewStatus());
        try {
            shelterRepository.save(place);
        } catch (IllegalStateException unknownId) {
            if (place.getId() != null && shelterRepository.findById(place.getId()).isEmpty()) {
                throw new ShelterNotFoundException(place.getId());
            }
            throw unknownId;
        }
        if (!moved.isEmpty()) {
            history.record(place.getId(), current.getName(), current.getCreatedBy(),
                    ShelterHistoryLog.Action.EDITED, ShelterHistoryChanges.toJson(moved));
        }
    }

    /**
     * The editable fields that MOVED between {@code current} and {@code
     * next}, in canonical order: name, description, capacity,
     * latitude, longitude, locationKind. Empty = a no-op PUT (records no
     * history row).
     */
    private static Map<String, Object[]> diffFields(Shelter current, Shelter next) {
        Map<String, Object[]> moved = new LinkedHashMap<>();
        if (!Objects.equals(current.getName(), next.getName())) {
            moved.put("name", new Object[]{current.getName(), next.getName()});
        }
        if (!Objects.equals(current.getDescription(), next.getDescription())) {
            moved.put("description", new Object[]{current.getDescription(), next.getDescription()});
        }
        if (!Objects.equals(current.getCapacity(), next.getCapacity())) {
            moved.put("capacity", new Object[]{current.getCapacity(), next.getCapacity()});
        }
        if (Double.compare(current.getLocation().lat(), next.getLocation().lat()) != 0) {
            moved.put("latitude", new Object[]{current.getLocation().lat(), next.getLocation().lat()});
        }
        if (Double.compare(current.getLocation().lng(), next.getLocation().lng()) != 0) {
            moved.put("longitude", new Object[]{current.getLocation().lng(), next.getLocation().lng()});
        }
        if (current.getLocationKind() != next.getLocationKind()) {
            moved.put("locationKind", new Object[]{current.getLocationKind().name(),
                    next.getLocationKind().name()});
        }
        return moved;
    }

    /**
     * Deletes a shelter row; its reports and occupancy cascade via the DB constraints.
     *
     * <p>Edit history: a DELETED row is appended AFTER the delete, in the
     * SAME transaction — both commit or roll back together, so a failed
     * or rolled-back delete leaves NO DELETED row (the V18 audit
     * contract: "a rolled-back or failed event leaves no row"). The name
     * is read first because the history row needs it. The no-FK
     * {@code shelter_id} dangles legally after the commit, so the deleted
     * shelter's history stays findable. {@code actorUserId} is the acting
     * account — the submitter for the author route, the moderating admin
     * for the admin hard delete.
     */
    @Transactional
    public void deletePlace(long shelterId, Long actorUserId) {
        Shelter existing = shelterRepository.findById(shelterId).orElse(null);
        shelterRepository.deleteById(shelterId);
        if (existing != null) {
            history.record(shelterId, existing.getName(), actorUserId,
                    ShelterHistoryLog.Action.DELETED, null);
        }
    }
}
