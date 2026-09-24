package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ReporterTrustEvaluator;
import ee.sheltermap.app.ShelterOccupancyRepository;
import ee.sheltermap.app.ShelterOpenStatusRepository;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterReportRepository.ReportTypeCount;
import ee.sheltermap.app.ShelterInfoRequestLog;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.BoundingBox;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.ReporterTrust;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterOpenStatusReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Read side of the shelter API. Returns <strong>DTOs only, never
 * entities</strong> (05-shelter-api.puml). Creator verification state,
 * report counts and fresh live state are each computed in
 * <strong>one batched query</strong> per listing instead of one
 * {@code findByShelterId} per shelter — no N+1.
 *
 * <p>Trust derivations are computed HERE, server-side, never
 * client-computed from raw report lists: {@code nonexistentReports} (0
 * when none), the live open/closed block (latest fresh tap wins, same 2 h
 * freshness window as occupancy) and the fresh occupancy block (latest
 * band wins, hedged at one agreeing report, firm at two+, silent past 2
 * h). Admin-dismissed reports count in neither.
 *
 * <p>The public list projection is ACTIVE-only (auto-hidden shelters
 * disappear from the map and list); the trust filter ({@code
 * hasCapacity}) and the provenance filter are applied in-memory over the
 * already-fetched list (Estonia-scale data). The {@code minRating} query
 * parameter no longer exists on the model — an unknown {@code minRating}
 * parameter is ignored for API compatibility.
 *
 * <p>Community trust: the public list and detail reads are UNCHANGED by
 * the trust model — there is no blocking queue. {@code reviewStatus} is
 * display/trust data on the DTOs (NEW community rows are public, carrying
 * the unverified treatment); only REJECTED rows are hidden, and that
 * through the existing status INACTIVE mechanism.
 *
 * <p>Last-verified meta: every DTO also carries {@code reportCount} (the
 * TOTAL community report count — all types, summed over the batched
 * per-type counts) and {@code lastVerifiedAt} (registry rows: the newest
 * non-failed import of their source; community rows: the newest
 * non-submitter OPEN_CONFIRMED report or CONFIRM / AUTO_CONFIRM
 * moderation action; null = never verified). Both are batched — one
 * import lookup per distinct registry source in the batch (at most
 * two), one report lookup, one audit lookup.
 */
@Service
public class ShelterQueryService {

    /** Freshness window for the live state blocks (occupancy, and the open/closed tap on the same level): reports older than this are silent. */
    public static final Duration OCCUPANCY_FRESHNESS_WINDOW = Duration.ofHours(2);

    /** The recent-report log length the community pulse answers: newest first, the rest scroll away. */
    public static final int RECENT_REPORTS_CAP = 10;

    private final ShelterRepository shelterRepository;
    private final UserRepository userRepository;
    private final ShelterReportRepository reportRepository;
    private final ShelterOccupancyRepository occupancyRepository;
    private final ShelterOpenStatusRepository openStatusRepository;
    private final DataImportLog dataImportLog;
    private final ModerationAuditLog moderationAudit;
    private final ReporterTrustEvaluator trustEvaluator;
    private final ShelterInfoRequestLog infoRequests;
    private final Clock clock;

    public ShelterQueryService(ShelterRepository shelterRepository,
                               UserRepository userRepository,
                               ShelterReportRepository reportRepository,
                               ShelterOccupancyRepository occupancyRepository,
                               ShelterOpenStatusRepository openStatusRepository,
                               DataImportLog dataImportLog,
                               ModerationAuditLog moderationAudit,
                               ReporterTrustEvaluator trustEvaluator,
                               ShelterInfoRequestLog infoRequests,
                               Clock clock) {
        this.shelterRepository = shelterRepository;
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.occupancyRepository = occupancyRepository;
        this.openStatusRepository = openStatusRepository;
        this.dataImportLog = dataImportLog;
        this.moderationAudit = moderationAudit;
        this.trustEvaluator = trustEvaluator;
        this.infoRequests = infoRequests;
        this.clock = clock;
    }

    /**
     * The four reads this class serves, and what extra data each
     * carries — a named value instead of booleans threaded through the
     * mappers. The only combinations that exist are the four readers
     * themselves.
     *
     * @param includeInfoRequests the batch fetches the information-request
     *        rows and the requesting admins (the /mine and admin lists)
     * @param includeCommunityPulse the batch fetches the community pulse
     *        (the detail read only)
     * @param callerOwnsEveryRow every row is the caller's own, so the
     *        owner-only {@code reviewNote} is emitted unscoped (the /mine
     *        list)
     */
    private record Projection(boolean includeInfoRequests, boolean includeCommunityPulse,
                              boolean callerOwnsEveryRow) {
        /** The public list: the shared projection, nothing extra. */
        static Projection publicList() {
            return new Projection(false, false, false);
        }

        /** The single-shelter detail read: + the community pulse. */
        static Projection detail() {
            return new Projection(false, true, false);
        }

        /** The caller's own list: + the information requests; every row is the caller's. */
        static Projection mine() {
            return new Projection(true, false, true);
        }

        /** The admin list: + the information requests. */
        static Projection admin() {
            return new Projection(true, false, false);
        }
    }

    /**
     * The reader of a row: the caller id (null for guests) plus the
     * caller's own live taps on that shelter (null when the caller has no
     * tap). Only the detail read fills the taps — the list projections
     * read with {@link #ANONYMOUS}.
     */
    private record CallerView(Long callerId, OccupancyBand yourOccupancyBand,
                              String yourOpenStatus) {
        /** A reader without a caller: the list projections and guest detail reads. */
        static final CallerView ANONYMOUS = new CallerView(null, null, null);
    }

    // ---- the public list --------------------------------------------------

    /**
     * The public list: ACTIVE rows only — with the optional trust
     * filter applied in-memory. {@code hasCapacity} keeps shelters with
     * capacity data; a {@code false} boolean is the negation. An unknown
     * {@code minRating} parameter is ignored for API compatibility (no
     * such parameter exists on the model any more). NEW community rows
     * are listed like any other ACTIVE row — no visibility gate.
     *
     * <p>No viewport, no paging: delegates to the full overload with
     * everything omitted — exactly the pre-paging behaviour, the
     * backward-compatibility contract.
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean hasCapacity,
                                    Provenance provenance) {
        return findAll(source, hasCapacity, provenance, null, null, null);
    }

    /**
     * The public list with the optional viewport filter and offset/limit
     * paging — the unpaged read when both paging params are absent, the
     * SQL-paged read otherwise.
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean hasCapacity,
                                    Provenance provenance, BoundingBox bbox,
                                    Integer limit, Integer offset) {
        if (limit == null && offset == null) {
            return publicListUnpaged(source, hasCapacity, provenance, bbox);
        }
        return publicListPaged(source, hasCapacity, provenance, bbox, limit, offset);
    }

    /**
     * The unpaged public read: the full ACTIVE projection (inside the
     * inclusive {@code bbox} when one is given, id-ascending), the
     * batched DTO mapping, the in-memory trust filters ({@code
     * hasCapacity}, {@code provenance}) — exactly the pre-paging
     * behaviour, the backward-compatibility contract.
     */
    private List<ShelterDto> publicListUnpaged(ShelterSourceFilter source, Boolean hasCapacity,
                                               Provenance provenance, BoundingBox bbox) {
        List<Shelter> shelters = bbox == null
                ? shelterRepository.findAllActiveBySourceIn(source.sources())
                : shelterRepository.findAllActiveBySourceInWithin(source.sources(), bbox);
        return applyTrustFilters(toDtos(shelters, Projection.publicList()), hasCapacity, provenance);
    }

    /**
     * The paged public read: the filters ride INTO the SQL and the slice
     * IS the LIMIT/OFFSET — the page's rows come back from the DB already
     * filtered, and the batched trust lookups run over the page's ids
     * only (the read no longer loads the corpus per page). The
     * in-memory filters are re-applied over the page-sized result as a
     * second line of defence, so the semantics stay identical to the
     * unpaged path even if a future derivation change outgrows the
     * pushdown. A page never contains a row the filters would drop, and
     * consecutive pages tile the filtered stably-ordered list without
     * overlap or skipped rows.
     */
    private List<ShelterDto> publicListPaged(ShelterSourceFilter source, Boolean hasCapacity,
                                             Provenance provenance, BoundingBox bbox,
                                             Integer limit, Integer offset) {
        ProvenancePushdown pushdown = pushdownForProvenance(provenance);
        if (pushdown == null) {
            // Unreachable in the ACTIVE-only projection (the derivation
            // requires an INACTIVE row) — an empty page without
            // touching the DB.
            return List.of();
        }
        List<Shelter> page = shelterRepository.findActivePage(
                source.sources(), bbox, hasCapacity,
                pushdown.source(), pushdown.reviewStatus(),
                offset == null ? 0L : offset, limit == null ? Integer.MAX_VALUE : limit);
        return applyTrustFilters(toDtos(page, Projection.publicList()), hasCapacity, provenance);
    }

    /**
     * A provenance value as a (source, review_status) column pair — the
     * exact derivation inputs of {@link Provenance#of} for that value
     * within the ACTIVE-only public projection:
     *
     * <ul>
     * <li>OFFICIAL → (PAASETEAMET, any review state)</li>
     * <li>PARTNER_VERIFIED → (MUNICIPALITY, any review state)</li>
     * <li>UNDER_REVIEW → (USER, NEW)</li>
     * <li>COMMUNITY_REPORTED → (USER, CONFIRMED)</li>
     * </ul>
     *
     * @return the column pair, or {@code null} for a value unreachable
     *         in the ACTIVE-only projection (REJECTED and
     *         REPORTED_INACTIVE both require an INACTIVE row) — the
     *         caller answers an empty page
     */
    private static ProvenancePushdown pushdownForProvenance(Provenance provenance) {
        // No provenance requested: no pushdown (the source filter still applies).
        if (provenance == null) {
            return new ProvenancePushdown(null, null);
        }
        return switch (provenance) {
            case OFFICIAL -> new ProvenancePushdown(ShelterSource.PAASETEAMET, null);
            case PARTNER_VERIFIED -> new ProvenancePushdown(ShelterSource.MUNICIPALITY, null);
            case UNDER_REVIEW -> new ProvenancePushdown(ShelterSource.USER, ReviewStatus.NEW);
            case COMMUNITY_REPORTED -> new ProvenancePushdown(ShelterSource.USER, ReviewStatus.CONFIRMED);
            case REJECTED, REPORTED_INACTIVE -> null;
        };
    }

    /** The (source, review_status) column pair of a provenance pushdown. */
    private record ProvenancePushdown(ShelterSource source, ReviewStatus reviewStatus) {
    }

    // ---- the detail read --------------------------------------------------

    /** The single-shelter read without a caller (internal projections). */
    public Optional<ShelterDto> findById(long id) {
        return findById(id, null);
    }

    /**
     * The detail read: the shared projection, additionally carrying the
     * caller's own live taps ({@code yourOccupancyBand},
     * {@code yourOpenStatus}) so the occupancy picker can pre-select —
     * null for guests, anonymous callers and callers without a tap.
     * Rejected (INACTIVE) rows stay readable by id exactly as any other
     * INACTIVE row (ids are public); no trust rule blocks a detail read.
     *
     * <p>Caller id, not a caller object: the projection uses ONLY the id
     * (two indexed caller-scoped lookups), so the read path never pays a
     * domain mapping for the caller (PII decrypt, claims load) — the
     * {@code JwtAuthenticationFilter} column-only rule applied to reads.
     * The id also gates the OWNER-scoped {@code reviewNote} (see
     * {@link #reviewNoteFor}): the moderator's REJECT reason reaches the
     * submitter's own detail read only — an anonymous or other-user
     * detail read gets null (ids are sequential, so an unscoped note
     * would be enumerable).
     *
     * <p>Community pulse: the detail read is ALSO the only projection
     * that carries {@code communityPulse} (the fresh-window aggregates +
     * recent log behind the detail page's gauges) — it is public (guests
     * read it too) and is NOT caller-scoped.
     */
    public Optional<ShelterDto> findById(long id, Long callerId) {
        Shelter shelter = shelterRepository.findById(id).orElse(null);
        if (shelter == null) {
            return Optional.empty();
        }
        Projection projection = Projection.detail();
        Batches batches = batchedLookupsFor(List.of(shelter), projection);
        return Optional.of(toDto(shelter, batches, callerView(shelter.getId(), callerId), projection));
    }

    /**
     * The caller's own live taps on the detail shelter — one indexed
     * lookup each, and only when there is a caller: the list paths stay
     * pure batch reads. A guest (or a caller without a tap) reads the
     * anonymous view.
     */
    private CallerView callerView(long shelterId, Long callerId) {
        if (callerId == null) {
            return CallerView.ANONYMOUS;
        }
        OccupancyBand yourOccupancyBand = occupancyRepository
                .findByShelterIdAndUserId(shelterId, callerId)
                .map(ShelterOccupancyReport::getBand)
                .orElse(null);
        String yourOpenStatus = openStatusRepository
                .findByShelterIdAndUserId(shelterId, callerId)
                .map(report -> report.getState().name())
                .orElse(null);
        return new CallerView(callerId, yourOccupancyBand, yourOpenStatus);
    }

    // ---- the caller's own list ---------------------------------------------

    /**
     * The caller's own shelters, all statuses and all review states
     * (the owner list keeps hidden rows). The /mine projection
     * additionally carries each row's moderator→submitter information
     * request and the moderator's REJECT reason ({@code reviewNote}) —
     * both are owner-only, so the public list and detail reads never
     * fetch them (the detail read gates the note on the caller being
     * the submitter).
     */
    public List<ShelterDto> findByCreatedBy(long userId) {
        return toDtos(shelterRepository.findByCreatedBy(userId), Projection.mine());
    }

    // ---- the shared row mapping ---------------------------------------------

    /**
     * Maps a batch of shelters for a list projection in ONE aggregate
     * pass (no N+1). List projections have no caller, so the
     * caller-scoped fields stay null.
     */
    private List<ShelterDto> toDtos(List<Shelter> shelters, Projection projection) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        Batches batches = batchedLookupsFor(shelters, projection);
        return shelters.stream()
                .map(shelter -> toDto(shelter, batches, CallerView.ANONYMOUS, projection))
                .toList();
    }

    /**
     * One shelter row of the shared projection. The report counts come
     * from the batched per-type counts: {@code nonExistent} is that
     * type alone; the open "inaccurate information" count is
     * WRONG_LOCATION + OTHER — open means not dismissed (the batched
     * per-type count already excludes dismissed reports), so a dismissed
     * report stops counting; {@code reportTotal} is the sum over all
     * types.
     */
    private ShelterDto toDto(Shelter shelter, Batches batches, CallerView caller,
                             Projection projection) {
        // null key: a registry row, or a row whose submitter's account
        // was erased — no author lookup.
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        // "Completed verification": rows written after the trust-snapshot
        // column exists carry the submitter's standing AS AT WRITE TIME —
        // account erasure cannot change it, so the snapshot is the answer
        // when present. When it is null (rows from before that column,
        // registry rows) the derivation stays honest and live: the author
        // exists and has at least one active (non-revoked) claim — a
        // missing author (an erased account) is never verified, and an
        // orphaned pre-snapshot row resolves UNVERIFIED (the standing
        // such a row inherits is an owner backfill decision).
        Boolean snapshot = shelter.getSubmitterVerifiedAtCreation();
        boolean submitterVerified = snapshot != null
                ? snapshot
                : (author != null && !author.getData().levels().isEmpty());
        // The depth behind that boolean: the single channel when there is
        // one, FULL at two or more. Live by construction — the claim set
        // is re-read on every request, so a row confirmed on one channel
        // upgrades itself once the second is, with no backfill and no
        // stored flag to go stale.
        SubmitterVerification submitterVerification = author == null
                ? null
                : SubmitterVerification.of(author.getData().levels());
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
        long inaccurate = typeCounts.getOrDefault(ShelterReportType.WRONG_LOCATION, 0L)
                + typeCounts.getOrDefault(ShelterReportType.OTHER, 0L);
        int reportTotal = typeCounts.values().stream().mapToInt(Long::intValue).sum();
        return new ShelterDto(
                shelter.getId(),
                shelter.getName(),
                shelter.getAddress(),
                shelter.getLocation().lat(),
                shelter.getLocation().lng(),
                shelter.getStatus(),
                shelter.getSource(),
                shelter.getCreatedAt(),
                shelter.getDescription(),
                shelter.getCapacity(),
                submitterVerified,
                submitterVerification,
                (int) nonExistent,
                (int) inaccurate,
                batches.openStatus().get(shelter.getId()),
                batches.occupancy().get(shelter.getId()),
                caller.yourOccupancyBand(),
                caller.yourOpenStatus(),
                shelter.getReviewStatus(),
                reviewNoteFor(shelter, caller, projection),
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent, inaccurate),
                reportTotal,
                batches.lastVerified().get(shelter.getId()),
                shelter.getInaccurateMarkedAt() != null,
                toInfoRequest(batches.infoRequests().get(shelter.getId())),
                batches.communityPulse().get(shelter.getId()));
    }

    /**
     * The moderator's REJECT reason ({@code reviewNote}) is
     * OWNER-SCOPED (the DTO contract): it reaches the submitter's
     * surfaces only — the /mine list (every row there is the caller's)
     * and the submitter's own detail read. The public list and every
     * other caller's detail read get null: ids are sequential, so an
     * unscoped note would be enumerable.
     */
    private static String reviewNoteFor(Shelter shelter, CallerView caller, Projection projection) {
        boolean submitterSurface = projection.callerOwnsEveryRow()
                || (caller.callerId() != null && caller.callerId().equals(shelter.getCreatedBy()));
        return submitterSurface ? shelter.getReviewNote() : null;
    }

    /** The /mine projection's info-request field (null when the row has none). */
    private static ShelterDto.InfoRequest toInfoRequest(ShelterInfoRequestLog.InfoRequest request) {
        return request == null ? null
                : new ShelterDto.InfoRequest(request.message(), request.requestedAt(),
                        request.replyMessage(), request.repliedAt());
    }

    // ---- the batched trust lookups -------------------------------------------

    /**
     * The side-lookups the projections read over a batch of shelters —
     * one query per lookup, no N+1. Each lookup is a named step below,
     * in this order; the projection decides which of the optional
     * lookups (information requests, community pulse) run at all.
     */
    private Batches batchedLookupsFor(List<Shelter> shelters, Projection projection) {
        List<Long> shelterIds = shelters.stream().map(Shelter::getId).toList();
        Map<Long, User> authors = creatorsFor(shelters);
        Map<Long, Map<ShelterReportType, Long>> reportCounts = reportCountsFor(shelterIds);
        Map<Long, ShelterDto.Occupancy> occupancy = freshOccupancyFor(shelterIds);
        Map<Long, ShelterDto.OpenStatus> openStatus = freshOpenStatusFor(shelterIds);
        Map<Long, Instant> lastVerified = lastVerifiedFor(shelters, shelterIds);
        // Fetched ONLY for the /mine and admin projections (the
        // information-request exchange rows + the requesting admin).
        Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequestRows = projection.includeInfoRequests()
                ? infoRequests.findByShelterIds(shelterIds)
                : Map.of();
        Map<Long, User> infoRequesters = projection.includeInfoRequests()
                ? infoRequestersFor(infoRequestRows)
                : Map.of();
        // DETAIL-read only: the fresh-window aggregates + recent log.
        Map<Long, ShelterDto.CommunityPulse> pulse = projection.includeCommunityPulse()
                ? shelters.stream()
                        .collect(Collectors.toMap(Shelter::getId,
                                shelter -> communityPulse(shelter.getId())))
                : Map.of();
        return new Batches(authors, reportCounts, occupancy, openStatus,
                lastVerified, infoRequestRows, infoRequesters, pulse);
    }

    /** The shared batched lookups of both shelter projections. */
    private record Batches(
            Map<Long, User> authors,
            Map<Long, Map<ShelterReportType, Long>> reportCounts,
            Map<Long, ShelterDto.Occupancy> occupancy,
            Map<Long, ShelterDto.OpenStatus> openStatus,
            Map<Long, Instant> lastVerified,
            Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequests,
            Map<Long, User> infoRequesters,
            Map<Long, ShelterDto.CommunityPulse> communityPulse) {
    }

    /**
     * The batch's creators in ONE lookup — distinct non-null author ids;
     * missing ids (deleted users) simply stay absent from the returned
     * map.
     */
    private Map<Long, User> creatorsFor(List<Shelter> shelters) {
        Set<Long> authorIds = shelters.stream()
                .map(Shelter::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return userRepository.findByIds(authorIds);
    }

    /** The report counts by type for the whole batch in ONE query. */
    private Map<Long, Map<ShelterReportType, Long>> reportCountsFor(List<Long> shelterIds) {
        return reportRepository.countByTypeForShelterIds(shelterIds).stream()
                .collect(Collectors.groupingBy(ReportTypeCount::shelterId,
                        Collectors.toMap(ReportTypeCount::type, ReportTypeCount::count)));
    }

    /**
     * The fresh occupancy rows for the whole batch in ONE query (the 2 h
     * window is applied in SQL); the derivation — latest band wins,
     * agreeing count, newest timestamp — is in memory.
     */
    private Map<Long, ShelterDto.Occupancy> freshOccupancyFor(List<Long> shelterIds) {
        return deriveOccupancy(occupancyRepository.findFreshByShelterIds(
                shelterIds, clock.instant().minus(OCCUPANCY_FRESHNESS_WINDOW)));
    }

    /**
     * The fresh open/closed taps for the whole batch in ONE query (the
     * same 2 h window as occupancy); latest tap wins, agreeing count,
     * newest timestamp.
     */
    private Map<Long, ShelterDto.OpenStatus> freshOpenStatusFor(List<Long> shelterIds) {
        return deriveOpenStatus(openStatusRepository.findFreshByShelterIds(
                shelterIds, clock.instant().minus(OCCUPANCY_FRESHNESS_WINDOW)));
    }

    /**
     * The per-entry "last verified" stamp. Registry rows carry the
     * newest VERIFYING import of their source (OK or NOT_MODIFIED — a 304
     * re-check is a verification; FAILED / SKIPPED runs verify nothing;
     * one lookup per distinct source in the batch, at most two). USER
     * rows carry the newest of (a) OPEN_CONFIRMED reports by a user
     * OTHER than the submitter (a self-confirm never verifies — the
     * auto-confirm rule; a legacy unclaimed row with a null author
     * accepts any reporter, same precedent) and (b) CONFIRM /
     * AUTO_CONFIRM moderation actions (the admin's manual confirm is a
     * verification too). Null = never verified — the UNDER_REVIEW
     * "not yet verified" signal.
     */
    private Map<Long, Instant> lastVerifiedFor(List<Shelter> shelters, List<Long> shelterIds) {
        Map<Long, List<ShelterReportRepository.ConfirmedAt>> confirmedByShelter = reportRepository
                .latestOpenConfirmedByShelterIds(shelterIds).stream()
                .collect(Collectors.groupingBy(ShelterReportRepository.ConfirmedAt::shelterId));
        Map<Long, Instant> confirmingActions = moderationAudit
                .latestConfirmationByShelterIds(shelterIds).stream()
                .collect(Collectors.toMap(ModerationAuditLog.LatestConfirmation::shelterId,
                        ModerationAuditLog.LatestConfirmation::latestAt));
        Map<ShelterSource, Instant> importVerifiedAt = importVerifiedAtFor(shelters);
        Map<Long, Instant> result = new HashMap<>();
        for (Shelter shelter : shelters) {
            Instant verified = shelter.getSource() == ShelterSource.USER
                    ? latestCommunityVerification(shelter,
                            confirmedByShelter.get(shelter.getId()),
                            confirmingActions.get(shelter.getId()))
                    : importVerifiedAt.get(shelter.getSource());
            if (verified != null) {
                result.put(shelter.getId(), verified);
            }
        }
        return result;
    }

    /**
     * The newest verifying import per distinct non-user source in the
     * batch — one lookup per source (at most two: Päästeamet and
     * municipality).
     */
    private Map<ShelterSource, Instant> importVerifiedAtFor(List<Shelter> shelters) {
        Map<ShelterSource, Instant> bySource = new HashMap<>();
        shelters.stream().map(Shelter::getSource)
                .filter(source -> source != ShelterSource.USER)
                .distinct()
                .forEach(source -> bySource.put(source,
                        dataImportLog.findLatestVerifiedBySource(source.name())
                                .map(DataImportLog.Row::importedAt)
                                .orElse(null)));
        return bySource;
    }

    /** The newest of the non-submitter OPEN_CONFIRMED reports and the confirming audit action. */
    private static Instant latestCommunityVerification(Shelter shelter,
                                                       List<ShelterReportRepository.ConfirmedAt> reports,
                                                       Instant confirmingActionAt) {
        Instant best = confirmingActionAt;
        Long createdById = shelter.getCreatedBy();
        if (reports == null) {
            return best;
        }
        for (ShelterReportRepository.ConfirmedAt report : reports) {
            // The submitter's own OPEN_CONFIRMED never verifies (the
            // auto-confirm rule); a legacy unclaimed row (null author)
            // accepts any reporter.
            if (createdById != null && createdById.equals(report.userId())) {
                continue;
            }
            if (best == null || report.latestAt().isAfter(best)) {
                best = report.latestAt();
            }
        }
        return best;
    }

    /**
     * The requesting admins behind the batch's information-request rows
     * in ONE lookup — the admin projection renders the name; the /mine
     * list ignores it.
     */
    private Map<Long, User> infoRequestersFor(
            Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequestRows) {
        Set<Long> requesterIds = infoRequestRows.values().stream()
                .map(ShelterInfoRequestLog.InfoRequest::requestedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return userRepository.findByIds(requesterIds);
    }

    /**
     * over the fresh rows (the 2 h window already applied in SQL):
     * the MOST RECENT report's band wins (ties broken by user id — the
     * timestamptz precision makes ties vanishingly rare, but the output
     * stays deterministic), {@code reportCount} is the number of fresh
     * reports agreeing with that band (1 = the UI hedges, 2+ = firm), and
     * {@code lastReportedAt} is the newest fresh report's time.
     */
    private static Map<Long, ShelterDto.Occupancy> deriveOccupancy(List<ShelterOccupancyReport> fresh) {
        Map<Long, List<ShelterOccupancyReport>> byShelter = fresh.stream()
                .collect(Collectors.groupingBy(ShelterOccupancyReport::getShelterId));
        Map<Long, ShelterDto.Occupancy> result = new HashMap<>();
        byShelter.forEach((shelterId, rows) -> {
            ShelterOccupancyReport latest = rows.stream()
                    .max(Comparator.comparing(ShelterOccupancyReport::getUpdatedAt)
                            .thenComparing(ShelterOccupancyReport::getUserId))
                    .orElseThrow();
            OccupancyBand band = latest.getBand();
            long agreeing = rows.stream().filter(r -> r.getBand() == band).count();
            Instant lastReportedAt = rows.stream()
                    .map(ShelterOccupancyReport::getUpdatedAt)
                    .max(Instant::compareTo)
                    .orElseThrow();
            result.put(shelterId, new ShelterDto.Occupancy(band, (int) agreeing, lastReportedAt));
        });
        return result;
    }

    /**
     * Live open/closed state (same level as capacity) over the fresh rows
     * (the 2 h window already applied in SQL, the same window as
     * occupancy): the MOST RECENT tap's state wins — the tie-break is
     * exactly the occupancy derivation (ties broken by user id — the
     * timestamptz precision makes ties vanishingly rare, but the output
     * stays deterministic), {@code reportCount} is the number of fresh
     * taps agreeing with that state, and {@code reportedAt} is the newest
     * fresh tap's time. Null (absent) when nothing is fresh.
     */
    private static Map<Long, ShelterDto.OpenStatus> deriveOpenStatus(List<ShelterOpenStatusReport> fresh) {
        Map<Long, List<ShelterOpenStatusReport>> byShelter = fresh.stream()
                .collect(Collectors.groupingBy(ShelterOpenStatusReport::getShelterId));
        Map<Long, ShelterDto.OpenStatus> result = new HashMap<>();
        byShelter.forEach((shelterId, rows) -> {
            ShelterOpenStatusReport latest = rows.stream()
                    .max(Comparator.comparing(ShelterOpenStatusReport::getCreatedAt)
                            .thenComparing(ShelterOpenStatusReport::getUserId))
                    .orElseThrow();
            OpenStatusState state = latest.getState();
            long agreeing = rows.stream().filter(r -> r.getState() == state).count();
            Instant reportedAt = rows.stream()
                    .map(ShelterOpenStatusReport::getCreatedAt)
                    .max(Instant::compareTo)
                    .orElseThrow();
            result.put(shelterId, new ShelterDto.OpenStatus(state.name(), reportedAt, (int) agreeing));
        });
        return result;
    }

    // ---- the admin shelter list ------------------------------------------------

    /**
     * The admin shelter list: every shelter, ALL statuses (auto-hidden
     * rows included), id-ordered, with the same batched trust
     * derivations as the public list plus the submitter's profile name
     * (the provenance join — one batched lookup, no N+1).
     * {@code status}/{@code source} are filters (absent = no filter) —
     * the source is the frontend-facing {@link ShelterSourceFilter}
     * vocabulary (REGISTRY = Päästeamet + municipality imports, USER =
     * user submissions — the same grouping as the public list); {@code
     * q} is a case-insensitive substring over name OR address.
     *
     * <p>Paging: absent {@code limit}/{@code offset} = the unpaged read
     * (the full projection, in-memory filters); present, the filters and
     * the slice ride into the SQL (LIKE with the caller-trimmed,
     * lowercased, escaped needle), the batches run over the page's ids
     * only, and the answer carries {@link Pagination.Paged#total()} —
     * the filtered length WITHOUT paging (the always-present
     * X-Total-Count header value). The in-memory search filter is
     * re-applied over the page as a second line of defence (identical
     * semantics to the unpaged path).
     */
    public Pagination.Paged<AdminShelterDto> findAllForAdmin(ShelterStatus status,
                                                             ShelterSourceFilter source,
                                                             String q, Integer limit, Integer offset) {
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase(Locale.ROOT);
        List<ShelterSource> sources = source == null ? List.of(ShelterSource.values()) : source.sources();
        if (limit == null && offset == null) {
            return adminListUnpaged(status, sources, needle);
        }
        return adminListPaged(status, sources, needle, limit, offset);
    }

    /** The unpaged admin read: the full projection, the filters in memory, the total the filtered length. */
    private Pagination.Paged<AdminShelterDto> adminListUnpaged(ShelterStatus status,
                                                               List<ShelterSource> sources,
                                                               String needle) {
        List<Shelter> shelters = shelterRepository.findAll().stream()
                .filter(shelter -> status == null || shelter.getStatus() == status)
                .filter(shelter -> sources.contains(shelter.getSource()))
                .sorted(Comparator.comparing(Shelter::getId))
                .toList();
        if (shelters.isEmpty()) {
            return new Pagination.Paged<>(List.of(), 0L);
        }
        List<AdminShelterDto> dtos = applyAdminSearch(toAdminDtos(shelters), needle);
        return new Pagination.Paged<>(dtos, dtos.size());
    }

    /**
     * The paged admin read: the filters and the slice are in the SQL,
     * the batches run over the page's ids only — not the corpus. An
     * offset without a limit pages "the rest of the list": the SQL
     * limit is unbounded (the remaining rows), never an NPE.
     */
    private Pagination.Paged<AdminShelterDto> adminListPaged(ShelterStatus status,
                                                             List<ShelterSource> sources,
                                                             String needle,
                                                             Integer limit, Integer offset) {
        String pattern = needle == null ? null : likePattern(needle);
        List<Shelter> page = shelterRepository.findAdminPage(status, sources, pattern,
                offset == null ? 0L : offset, limit == null ? Integer.MAX_VALUE : limit);
        long total = shelterRepository.countAdminPage(status, sources, pattern);
        if (page.isEmpty()) {
            return new Pagination.Paged<>(List.of(), total);
        }
        List<AdminShelterDto> dtos = applyAdminSearch(toAdminDtos(page), needle);
        return new Pagination.Paged<>(dtos, total);
    }

    /** The batched admin mapping over a batch of shelters (no N+1). */
    private List<AdminShelterDto> toAdminDtos(List<Shelter> shelters) {
        Batches batches = batchedLookupsFor(shelters, Projection.admin());
        return shelters.stream()
                .map(shelter -> toAdminDto(shelter, batches))
                .toList();
    }

    /**
     * The in-memory search filter (the unpaged path's semantics,
     * verbatim); an absent needle keeps every row.
     */
    private static List<AdminShelterDto> applyAdminSearch(List<AdminShelterDto> dtos, String needle) {
        if (needle == null) {
            return dtos;
        }
        return dtos.stream()
                .filter(dto -> (dto.name() != null && dto.name().toLowerCase(Locale.ROOT).contains(needle))
                        || (dto.address() != null && dto.address().toLowerCase(Locale.ROOT).contains(needle)))
                .toList();
    }

    /**
     * The LIKE pattern for a case-insensitive substring search: the needle
     * (already trimmed and lowercased by the caller) wrapped in the %
     * wildcards, with the LIKE metacharacters escaped (the SQL uses
     * {@code ESCAPE '\'}), so a user's literal {@code %}/{@code _} can't
     * widen the match.
     */
    static String likePattern(String needle) {
        return "%" + needle.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    private AdminShelterDto toAdminDto(Shelter shelter, Batches batches) {
        // null key: a registry row, or a row whose submitter's account
        // was erased — no submitter name.
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
        // The open "inaccurate information" count (WRONG_LOCATION +
        // OTHER), same derivation as the public DTO.
        long inaccurate = typeCounts.getOrDefault(ShelterReportType.WRONG_LOCATION, 0L)
                + typeCounts.getOrDefault(ShelterReportType.OTHER, 0L);
        return new AdminShelterDto(
                shelter.getId(),
                shelter.getName(),
                shelter.getAddress(),
                shelter.getSource(),
                shelter.getStatus(),
                (int) nonExistent,
                (int) inaccurate,
                batches.occupancy().get(shelter.getId()),
                shelter.getCapacity(),
                author == null ? null : author.getData().name(),
                shelter.getReviewStatus(),
                shelter.getReviewNote(),
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent, inaccurate),
                shelter.getInaccurateMarkedAt() != null,
                toAdminInfoRequest(batches.infoRequests().get(shelter.getId()),
                        batches.infoRequesters()));
    }

    /** The admin projection's info-request field (null when the row has none);
     *  the requesting admin's profile name — "Unknown" after the account's
     *  erasure (no FK on requested_by). */
    private static AdminShelterDto.InfoRequest toAdminInfoRequest(
            ShelterInfoRequestLog.InfoRequest request, Map<Long, User> requesters) {
        if (request == null) {
            return null;
        }
        User requester = request.requestedBy() == null ? null : requesters.get(request.requestedBy());
        return new AdminShelterDto.InfoRequest(request.message(), request.requestedAt(),
                requester == null ? AdminModerationService.UNKNOWN_NAME : requester.getData().name(),
                request.replyMessage(), request.repliedAt());
    }

    // ---- community pulse (report aggregation UI) -------------------------------

    /**
     * The community pulse (report aggregation UI), DETAIL-read only.
     *
     * <p>The fresh window is the SAME 2 h read-time window as the occupancy
     * and open/closed taps (clock minus the window, applied at read —
     * no cleanup job). The plain counts are unweighted; the shares are
     * trust-weighted with the SAME derived weight the auto-hide tally uses
     * (see {@code ShelterReportService}); taps and bands carry no damp
     * flag (damping is a NON_EXISTENT-report concept), so every fresh
     * report contributes at least the baseline weight. The recent log is
     * the merged fresh taps + bands, newest first, capped — it carries NO
     * reporter identity (privacy: the public log says "a community
     * member", never who).
     */
    private ShelterDto.CommunityPulse communityPulse(long shelterId) {
        Instant freshSince = clock.instant().minus(OCCUPANCY_FRESHNESS_WINDOW);
        List<ShelterOpenStatusReport> taps =
                openStatusRepository.findFreshByShelterIds(List.of(shelterId), freshSince);
        List<ShelterOccupancyReport> bands =
                occupancyRepository.findFreshByShelterIds(List.of(shelterId), freshSince);
        Set<Long> reporters = new HashSet<>();
        taps.forEach(tap -> reporters.add(tap.getUserId()));
        bands.forEach(band -> reporters.add(band.getUserId()));
        Map<Long, Integer> weights = new HashMap<>();
        reporters.forEach(userId -> weights.put(userId, trustEvaluator.weight(userId)));
        return new ShelterDto.CommunityPulse(
                deriveOpenClosedPulse(taps, weights),
                deriveOccupancyPulse(bands, weights),
                deriveRecentReports(taps, bands));
    }

    /**
     * The fresh open/closed aggregate: the PLAIN counts per state and the
     * trust-weighted share of votes that say OPEN (0..1 — 0.5 is an exact
     * equal split, the gauge's straight-up needle). Null when nothing is
     * fresh — the UI renders an explicit empty state, never a neutral
     * arrow.
     */
    static ShelterDto.CommunityPulse.OpenClosed deriveOpenClosedPulse(
            List<ShelterOpenStatusReport> fresh, Map<Long, Integer> weights) {
        if (fresh.isEmpty()) {
            return null;
        }
        long open = 0;
        long closed = 0;
        double weightedOpen = 0;
        double weightedClosed = 0;
        for (ShelterOpenStatusReport tap : fresh) {
            int weight = weightOf(weights, tap.getUserId());
            if (tap.getState() == OpenStatusState.OPEN) {
                open++;
                weightedOpen += weight;
            } else {
                closed++;
                weightedClosed += weight;
            }
        }
        // Non-empty fresh input + baseline weight ≥ 1 → the sum is ≥ 1.
        double openShare = weightedOpen / (weightedOpen + weightedClosed);
        return new ShelterDto.CommunityPulse.OpenClosed((int) open, (int) closed, openShare);
    }

    /**
     * The fresh how-full aggregate: the PLAIN counts per band and the
     * trust-weighted position on the empty→full scale — SPACE = 0,
     * GETTING_FULL = 0.5, FULL = 1 (the gauge's straight-up needle is an
     * exact empty/full tie). Null when nothing is fresh.
     */
    static ShelterDto.CommunityPulse.OccupancyBands deriveOccupancyPulse(
            List<ShelterOccupancyReport> fresh, Map<Long, Integer> weights) {
        if (fresh.isEmpty()) {
            return null;
        }
        long space = 0;
        long gettingFull = 0;
        long full = 0;
        double weightedPosition = 0;
        double weightedTotal = 0;
        for (ShelterOccupancyReport band : fresh) {
            int weight = weightOf(weights, band.getUserId());
            weightedTotal += weight;
            switch (band.getBand()) {
                case SPACE -> space++;
                case GETTING_FULL -> {
                    gettingFull++;
                    weightedPosition += 0.5 * weight;
                }
                case FULL -> {
                    full++;
                    weightedPosition += weight;
                }
            }
        }
        return new ShelterDto.CommunityPulse.OccupancyBands(
                (int) space, (int) gettingFull, (int) full, weightedPosition / weightedTotal);
    }

    /**
     * The recent-report log: the merged fresh taps + bands, newest first
     * (ties broken by kind — timestamptz precision makes ties vanishingly
     * rare, but the output stays deterministic), capped at
     * {@link #RECENT_REPORTS_CAP}. Privacy: an entry carries ONLY what was
     * reported and when — never a reporter id or name (the UI says "a
     * community member").
     */
    static List<ShelterDto.CommunityPulse.RecentReport> deriveRecentReports(
            List<ShelterOpenStatusReport> taps, List<ShelterOccupancyReport> bands) {
        List<ShelterDto.CommunityPulse.RecentReport> merged =
                new ArrayList<>(taps.size() + bands.size());
        taps.forEach(tap -> merged.add(new ShelterDto.CommunityPulse.RecentReport(
                tap.getState().name(), tap.getCreatedAt())));
        bands.forEach(band -> merged.add(new ShelterDto.CommunityPulse.RecentReport(
                band.getBand().name(), band.getUpdatedAt())));
        merged.sort(Comparator.comparing(ShelterDto.CommunityPulse.RecentReport::reportedAt)
                .reversed()
                .thenComparing(ShelterDto.CommunityPulse.RecentReport::kind));
        return merged.size() <= RECENT_REPORTS_CAP
                ? List.copyOf(merged)
                : List.copyOf(merged.subList(0, RECENT_REPORTS_CAP));
    }

    /** A reporter absent from the weight map gets the baseline weight (defensive — the map is built over every reporter). */
    private static int weightOf(Map<Long, Integer> weights, long userId) {
        return weights.getOrDefault(userId, ReporterTrust.BASELINE);
    }

    /**
     * The in-memory trust filters over the projected list (absent = no
     * filter). {@code provenance} keeps the rows whose derived taxonomy
     * value matches — in-memory over the projected list, the same
     * Estonia-scale precedent as {@code hasCapacity}.
     */
    private static List<ShelterDto> applyTrustFilters(List<ShelterDto> dtos, Boolean hasCapacity,
                                                      Provenance provenance) {
        if (hasCapacity == null && provenance == null) {
            return dtos;
        }
        return dtos.stream()
                .filter(dto -> hasCapacity == null || (dto.capacity() != null) == hasCapacity)
                .filter(dto -> provenance == null || dto.provenance() == provenance)
                .toList();
    }
}
