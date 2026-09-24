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
 * entities</strong> (05-shelter-api.puml). Creator
 * verification state, report counts and fresh occupancy are each computed
 * in <strong>one batched query</strong> per listing instead of one
 * {@code findByShelterId} per shelter — no N+1 (the creator
 * batch is accessibility-and-provenance; the trust batch is
 * shelter-trust-and-reports).
 *
 * <p>Trust derivations are computed HERE, server-side, never client-
 * computed from raw report lists: {@code nonexistentReports} (0 when
 * none), the live open/closed block (latest fresh tap wins, same 2 h
 * freshness window as occupancy) and the fresh occupancy block (latest
 * band wins, hedged at one agreeing report, firm at two+, silent past 2
 * h). Admin-dismissed reports count in neither.
 *
 * <p>the public list projection is ACTIVE-only (auto-hidden shelters
 * disappear from the map and list); the trust filter
 * ({@code hasCapacity}) is applied in-memory over the
 * already-fetched list (Estonia-scale data). (Rating demotion, completed
 * by V21: the {@code minRating} query parameter no longer exists on the
 * model — an unknown {@code minRating} parameter is ignored for API
 * compatibility.)
 *
 * <p>Community trust (community-review-queue v2): the public list and
 * detail reads are UNCHANGED by the trust model — there is no blocking
 * queue. {@code reviewStatus} is display/trust data on the DTOs (NEW
 * community rows are public, carrying the unverified treatment); only
 * REJECTED rows are hidden, and that through the existing status
 * INACTIVE mechanism.
 *
 * <p>Last-verified meta (last-verified-meta): every DTO also carries
 * {@code reportCount} (the TOTAL community report count — all types,
 * summed over the existing batched per-type counts) and
 * {@code lastVerifiedAt} (registry rows: the newest non-failed import of
 * their source; community rows: the newest non-submitter OPEN_CONFIRMED
 * report or CONFIRM / AUTO_CONFIRM moderation action; null = never
 * verified). Both are batched — one import lookup per distinct registry
 * source in the batch (at most two), one report lookup, one audit lookup.
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
     * The public list: ACTIVE rows only — with the optional trust
     * filter applied in-memory.
     * {@code hasCapacity} keeps shelters with capacity data.
     * A {@code false} boolean is the negation. (V21: no {@code minRating}
     * parameter exists any more — an unknown {@code minRating} is ignored for
     * API compatibility.)
     * NEW community rows are listed like any other ACTIVE row
     * (community-review-queue v2 — no visibility gate).
     *
     * <p>No viewport, no paging (shelter-bbox-paging): delegates to the
     * full overload with everything omitted, which is EXACTLY the
     * pre-paging behaviour — the backward-compatibility contract.
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean hasCapacity,
                                    Provenance provenance) {
        return findAll(source, hasCapacity, provenance, null, null, null);
    }

    /**
     * The public list with the optional viewport filter and offset/limit
     * paging (shelter-bbox-paging, real paging since):
     *
     * <p>UNPAGED (both paging params absent) — byte-identical to the
     * pre-behaviour: the full ACTIVE projection (inside the inclusive
     * {@code bbox} when one is given, id-ascending), the batched DTO
     * mapping, the in-memory trust filters ({@code hasCapacity},
     * {@code provenance}).
     *
     * <p>PAGED — the filters ride INTO the SQL and the slice IS the
     * LIMIT/OFFSET: the page's rows come back from the DB already
     * filtered, and the batched trust lookups run over the page's ids
     * only (the pipeline no longer loads the corpus per page). The
     * in-memory filters are re-applied over the page-sized result as a
     * second line of defence, so the semantics stay byte-identical to
     * the unpaged path even if a future derivation change outgrows the
     * column-pair pushdown. A page never contains a row the filters
     * would drop, and consecutive pages tile the filtered stably-ordered
     * list without overlap or skipped rows.
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean hasCapacity,
                                    Provenance provenance, BoundingBox bbox,
                                    Integer limit, Integer offset) {
        if (limit == null && offset == null) {
            List<Shelter> shelters = bbox == null
                    ? shelterRepository.findAllActiveBySourceIn(source.sources())
                    : shelterRepository.findAllActiveBySourceInWithin(source.sources(), bbox);
            return applyTrustFilters(toDtos(shelters, null), hasCapacity, provenance);
        }
        ProvenanceFilter pushed = provenanceFilterFor(provenance);
        if (pushed == null) {
            // Unreachable in the ACTIVE-only public projection (the
            // derivation requires an INACTIVE row) — an empty page without
            // touching the DB.
            return List.of();
        }
        List<Shelter> page = shelterRepository.findActivePage(
                source.sources(), bbox, hasCapacity,
                pushed.provenanceSource(), pushed.provenanceReviewStatus(),
                offset == null ? 0L : offset, limit == null ? Integer.MAX_VALUE : limit);
        return applyTrustFilters(toDtos(page, null), hasCapacity, provenance);
    }

    /**
     * The provenance filter as a (source, review_status) column pair —
     * the exact derivation inputs of {@link Provenance#of} for the
     * requested value within the ACTIVE-only public projection (REJECTED
     * rows are INACTIVE by construction, and REPORTED_INACTIVE requires
     * INACTIVE, so both are unreachable there):
     *
     * <ul>
     * <li>OFFICIAL → (PAASETEAMET, any review state)</li>
     * <li>PARTNER_VERIFIED → (MUNICIPALITY, any review state)</li>
     * <li>UNDER_REVIEW → (USER, NEW)</li>
     * <li>COMMUNITY_REPORTED → (USER, CONFIRMED)</li>
     * </ul>
     *
     * @return the column pair, or {@code null} for a value unreachable in
     *         the ACTIVE-only projection (the caller answers empty)
     */
    private static ProvenanceFilter provenanceFilterFor(Provenance provenance) {
        // No provenance requested: no pushdown (the source filter still applies).
        if (provenance == null) {
            return new ProvenanceFilter(null, null);
        }
        return switch (provenance) {
            case OFFICIAL -> new ProvenanceFilter(ShelterSource.PAASETEAMET, null);
            case PARTNER_VERIFIED -> new ProvenanceFilter(ShelterSource.MUNICIPALITY, null);
            case UNDER_REVIEW -> new ProvenanceFilter(ShelterSource.USER, ReviewStatus.NEW);
            case COMMUNITY_REPORTED -> new ProvenanceFilter(ShelterSource.USER, ReviewStatus.CONFIRMED);
            case REJECTED, REPORTED_INACTIVE -> null;
        };
    }

    /** The (source, review_status) column pair of a provenance pushdown. */
    private record ProvenanceFilter(ShelterSource provenanceSource, ReviewStatus provenanceReviewStatus) {
    }

    /** The single-shelter read without a caller (internal projections). */
    public Optional<ShelterDto> findById(long id) {
        return findById(id, null);
    }

    /**
     * The detail read: the same projection, additionally carrying the
     * caller's own live band ({@code yourOccupancyBand}) so the occupancy
     * picker can pre-select — null for guests, anonymous callers and
     * callers without a report. Rejected (INACTIVE) rows stay readable
     * by id exactly as any other INACTIVE row (ids are public); no trust
     * rule blocks a detail read.
     *
     * <p>Caller id, not a caller object: the projection uses ONLY the id
     * (the two indexed caller-scoped lookups), so the read path never pays
     * a domain mapping for the caller (PII decrypt, claims load) — the
     * {@code JwtAuthenticationFilter} column-only rule applied to reads.
     * The id also gates the OWNER-scoped {@code reviewNote}: the
     * moderator's REJECT reason reaches the submitter's own detail read
     * only — an anonymous or other-user detail read gets null (ids are
     * sequential, so an unscoped note would be enumerable).
     *
     * <p>community pulse: the detail read is ALSO the only projection
     * that carries {@code communityPulse} (the fresh-window aggregates +
     * recent log behind the detail page's gauges) — it is public (guests
     * read it too) and is NOT caller-scoped.
     */
    public Optional<ShelterDto> findById(long id, Long callerId) {
        Shelter shelter = shelterRepository.findById(id).orElse(null);
        if (shelter == null) {
            return Optional.empty();
        }
        return Optional.of(toDtos(List.of(shelter), callerId, true).get(0));
    }

    /** The caller's own shelters, all statuses and all review states (the owner list keeps hidden rows).
     *  The /mine projection additionally carries each row's moderator→submitter
     *  information request and the moderator's REJECT reason ({@code reviewNote})
     *  — both are owner-only, so the
     *  public list and detail reads never fetch them (the detail read gates
     *  the note on the caller being the submitter). */
    public List<ShelterDto> findByCreatedBy(long userId) {
        return toDtos(shelterRepository.findByCreatedBy(userId), null, true, false, true);
    }

    /** Maps a batch of shelters in ONE aggregate pass (no N+1). */
    private List<ShelterDto> toDtos(List<Shelter> shelters, Long callerId) {
        return toDtos(shelters, callerId, false, false, false);
    }

    /** The detail read: the shared projection + the community pulse. */
    private List<ShelterDto> toDtos(List<Shelter> shelters, Long callerId, boolean withPulse) {
        return toDtos(shelters, callerId, false, withPulse, false);
    }

    /**
     * {@code ownSurface}: the projection is the caller's OWN surface (the
     * {@code /mine} list — every row there is the caller's, so the
     * owner-only {@code reviewNote} is emitted unconditionally). The
     * public list and the detail read pass {@code false} and the note is
     * gated per row on {@code callerId == createdBy} (the detail read
     * only, where the caller may or may not be the submitter).
     */
    private List<ShelterDto> toDtos(List<Shelter> shelters, Long callerId, boolean withInfoRequests,
                                    boolean withPulse, boolean ownSurface) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        Batches batches = batchesFor(shelters, withInfoRequests, withPulse);
        // The caller's own live states are DETAIL-only fields: one
        // indexed lookup each, and only for the single-shelter read — the
        // list paths (public + /mine) pass a null caller and stay pure
        // batch queries.
        Map<Long, OccupancyBand> callerBands = callerBands(shelters, callerId);
        Map<Long, String> callerOpenStatuses = callerOpenStatuses(shelters, callerId);
        return shelters.stream()
                .map(shelter -> toDto(shelter, batches, callerBands.get(shelter.getId()),
                        callerOpenStatuses.get(shelter.getId()), callerId, ownSurface))
                .toList();
    }

    /**
     * The batched trust lookups (one query each — no N+1) shared by the
     * public list and the admin list projections:
     * creators (the provenance/trust submitter join), report counts by
     * type, the fresh occupancy rows, and the last-verified stamp.
     */
    private Batches batchesFor(List<Shelter> shelters) {
        return batchesFor(shelters, false, false);
    }

    private Batches batchesFor(List<Shelter> shelters, boolean withInfoRequests) {
        return batchesFor(shelters, withInfoRequests, false);
    }

    private Batches batchesFor(List<Shelter> shelters, boolean withInfoRequests, boolean withPulse) {
        List<Long> ids = shelters.stream().map(Shelter::getId).toList();
        // Provenance (accessibility-and-provenance): the batch's creators in
        // ONE lookup — distinct non-null author ids; missing ids (deleted users)
        // simply stay absent from the returned map.
        Set<Long> authorIds = shelters.stream()
                .map(Shelter::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> authors = userRepository.findByIds(authorIds);
        // Trust layer: report counts by type for the whole batch in ONE query.
        Map<Long, Map<ShelterReportType, Long>> reportCounts = reportRepository
                .countByTypeForShelterIds(ids).stream()
                .collect(Collectors.groupingBy(ReportTypeCount::shelterId,
                        Collectors.toMap(ReportTypeCount::type, ReportTypeCount::count)));
        // Trust layer: the fresh occupancy rows for the whole batch in
        // ONE query (the 2 h window is applied in SQL); the derivation —
        // latest band wins, agreeing count, newest timestamp — is in memory.
        Map<Long, ShelterDto.Occupancy> occupancy = deriveOccupancy(occupancyRepository
                .findFreshByShelterIds(ids, clock.instant().minus(OCCUPANCY_FRESHNESS_WINDOW)));
        // Live open/closed state (same level as capacity): the fresh taps
        // for the whole batch in ONE query (the same 2 h window as
        // occupancy); latest tap wins, agreeing count, newest timestamp.
        Map<Long, ShelterDto.OpenStatus> openStatus = deriveOpenStatus(openStatusRepository
                .findFreshByShelterIds(ids, clock.instant().minus(OCCUPANCY_FRESHNESS_WINDOW)));
        // Last verified: the per-shelter verification stamp (see the
        // lastVerifiedFor derivation comment).
        Map<Long, Instant> lastVerified = lastVerifiedFor(shelters, ids);
        // Information request: the per-shelter exchange row
        // (at most one per shelter — the UNIQUE bound) + the requesting
        // admin (batched — the admin projection renders the name; /mine
        // ignores it). Fetched ONLY for the /mine and admin projections.
        Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequestRows = withInfoRequests
                ? infoRequests.findByShelterIds(ids)
                : Map.of();
        Map<Long, User> infoRequesters = withInfoRequests
                ? userRepository.findByIds(infoRequestRows.values().stream()
                        .map(ShelterInfoRequestLog.InfoRequest::requestedBy)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet()))
                : Map.of();
        // Community pulse (report aggregation UI): the fresh-window
        // aggregates + recent log, DETAIL-read only. The distinct-reporter
        // trust weights are per-reporter lookups over the (small) fresh set,
        // so the batched list/mine/admin reads stay pulse-free (no N+1).
        Map<Long, ShelterDto.CommunityPulse> pulses = withPulse
                ? shelters.stream()
                        .collect(Collectors.toMap(Shelter::getId, shelter -> communityPulse(shelter.getId())))
                : Map.of();
        return new Batches(authors, reportCounts, occupancy, openStatus, lastVerified,
                infoRequestRows, infoRequesters, pulses);
    }

    /** The shared batched inputs of both shelter projections. */
    private record Batches(
            Map<Long, User> authors,
            Map<Long, Map<ShelterReportType, Long>> reportCounts,
            Map<Long, ShelterDto.Occupancy> occupancy,
            Map<Long, ShelterDto.OpenStatus> openStatus,
            Map<Long, Instant> lastVerified,
            Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequests,
            Map<Long, User> infoRequesters,
            Map<Long, ShelterDto.CommunityPulse> pulses) {
    }

    /**
     * The per-entry "last verified" stamp. Registry rows carry the
     * newest VERIFYING import of their source (OK or NOT_MODIFIED — a 304
     * re-check is a verification; FAILED / SKIPPED runs verify nothing;
     * one lookup per distinct source in the batch, at most two). USER rows
     * carry the newest of (a) OPEN_CONFIRMED reports by a user OTHER than
     * the submitter (a self-confirm never verifies — the auto-confirm
     * rule; a legacy unclaimed row with a null author accepts any
     * reporter, same precedent) and (b) CONFIRM / AUTO_CONFIRM moderation
     * actions (the admin's manual confirm is a verification too). Null =
     * never verified — the UNDER_REVIEW "not yet verified" signal.
     */
    private Map<Long, Instant> lastVerifiedFor(List<Shelter> shelters, List<Long> ids) {
        Map<Long, List<ShelterReportRepository.ConfirmedAt>> confirmedByShelter = reportRepository
                .latestOpenConfirmedByShelterIds(ids).stream()
                .collect(Collectors.groupingBy(ShelterReportRepository.ConfirmedAt::shelterId));
        Map<Long, Instant> confirmingActions = moderationAudit
                .latestConfirmationByShelterIds(ids).stream()
                .collect(Collectors.toMap(ModerationAuditLog.LatestConfirmation::shelterId,
                        ModerationAuditLog.LatestConfirmation::latestAt));
        Map<ShelterSource, Instant> importVerifiedAt = new HashMap<>();
        shelters.stream().map(Shelter::getSource)
                .filter(source -> source != ShelterSource.USER)
                .distinct()
                .forEach(source -> importVerifiedAt.put(source,
                        dataImportLog.findLatestVerifiedBySource(source.name())
                                .map(DataImportLog.Row::importedAt)
                                .orElse(null)));
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

    /** Detail-only: the caller's live band for the single shelter, if any. */
    private Map<Long, OccupancyBand> callerBands(List<Shelter> shelters, Long callerId) {
        if (callerId == null || shelters.size() != 1) {
            return Map.of();
        }
        long shelterId = shelters.get(0).getId();
        Optional<OccupancyBand> band = occupancyRepository
                .findByShelterIdAndUserId(shelterId, callerId)
                .map(ShelterOccupancyReport::getBand);
        return band.map(value -> Map.of(shelterId, value)).orElse(Map.of());
    }

    /** Detail-only: the caller's own live open/closed state for the single shelter, if any. */
    private Map<Long, String> callerOpenStatuses(List<Shelter> shelters, Long callerId) {
        if (callerId == null || shelters.size() != 1) {
            return Map.of();
        }
        long shelterId = shelters.get(0).getId();
        Optional<String> state = openStatusRepository
                .findByShelterIdAndUserId(shelterId, callerId)
                .map(report -> report.getState().name());
        return state.map(value -> Map.of(shelterId, value)).orElse(Map.of());
    }

    private ShelterDto toDto(Shelter shelter, Batches batches, OccupancyBand yourOccupancyBand,
                             String yourOpenStatus, Long callerId, boolean ownSurface) {
        // null key: registry row / pre-V7 legacy row — no author lookup
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        // "Completed verification" (part 2): rows written after V31
        // carry the submitter's standing AS AT WRITE TIME — account
        // erasure (created_by is SET NULL, V7) cannot change it, so the
        // snapshot is the answer when present. When it is null (pre-V31
        // rows, registry rows) the derivation stays honest and live:
        // the author exists and has at least one active (non-revoked)
        // claim — a missing author (a deleted account) is never verified,
        // and an orphaned pre-V31 row resolves UNVERIFIED (the standing
        // such a row inherits is an owner backfill decision).
        Boolean snapshot = shelter.getSubmitterVerifiedAtCreation();
        boolean submitterVerified = snapshot != null
                ? snapshot
                : (author != null && !author.getData().levels().isEmpty());
        // The depth behind that boolean (submitter-verification-badge): the
        // single channel when there is one, FULL at two or more. Live by
        // construction — the claim set is re-read on every request, so a row
        // added at 1/2 verification upgrades itself once the second channel
        // is confirmed, with no backfill and no stored flag to go stale.
        SubmitterVerification submitterVerification = author == null
                ? null
                : SubmitterVerification.of(author.getData().levels());
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
        // report semantics: the open "inaccurate information" count
        // (WRONG_LOCATION + OTHER) — open means not dismissed (the batched
        // per-type count already excludes dismissed reports, the
        // dismiss filter), so a dismissed report stops counting.
        long inaccurate = typeCounts.getOrDefault(ShelterReportType.WRONG_LOCATION, 0L)
                + typeCounts.getOrDefault(ShelterReportType.OTHER, 0L);
        int reportTotal = typeCounts.values().stream().mapToInt(Long::intValue).sum();
        // OWNER-SCOPED (the DTO contract): the moderator's REJECT reason
        // reaches the submitter's surfaces only — the /mine list
        // (ownSurface — every row is the caller's) and the submitter's own
        // detail read (callerId == the row's submitter). The public list
        // and every other caller's detail read get null: ids are
        // sequential, so an unscoped note would be enumerable.
        String reviewNote = ownSurface || (callerId != null && callerId.equals(createdById))
                ? shelter.getReviewNote()
                : null;
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
                yourOccupancyBand,
                yourOpenStatus,
                shelter.getReviewStatus(),
                reviewNote,
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent, inaccurate),
                reportTotal,
                batches.lastVerified().get(shelter.getId()),
                shelter.getInaccurateMarkedAt() != null,
                toInfoRequest(batches.infoRequests().get(shelter.getId())),
                batches.pulses().get(shelter.getId()));
    }

    /** The /mine projection's info-request field (null when the row has none). */
    private static ShelterDto.InfoRequest toInfoRequest(ShelterInfoRequestLog.InfoRequest request) {
        return request == null ? null
                : new ShelterDto.InfoRequest(request.message(), request.requestedAt(),
                        request.replyMessage(), request.repliedAt());
    }

    /**
     * The admin shelter list (admin-moderation): every shelter, ALL
     * statuses (auto-hidden rows included), id-ordered, with the same
     * batched trust derivations as the public list plus the submitter's
     * profile name (the provenance join — one batched lookup, no N+1).
     * {@code status}/{@code source} are filters (absent = no filter) —
     * the source is the frontend-facing {@link ShelterSourceFilter}
     * vocabulary (REGISTRY = Päästeamet + municipality imports, USER =
     * user submissions — the same grouping as the public list); {@code q}
     * is a case-insensitive substring over name OR address.
     *
     * <p>Paging: absent {@code limit}/{@code offset} = the
     * unpaged read, byte-identical to the pre-change path (the full
     * projection, in-memory filters). Present, the filters and the slice
     * ride into the SQL (LIKE with the caller-trimmed, lowercased, escaped
     * needle), the batches run over the page's ids only, and the answer
     * carries {@link Pagination.Paged#total()} — the filtered length
     * WITHOUT paging (the always-present X-Total-Count header value). The
     * in-memory search filter is re-applied over the page as a second
     * line of defence (identical semantics to the unpaged path).
     */
    public Pagination.Paged<AdminShelterDto> findAllForAdmin(ShelterStatus status,
                                                             ShelterSourceFilter source,
                                                             String q, Integer limit, Integer offset) {
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase(Locale.ROOT);
        List<ShelterSource> sources = source == null ? List.of(ShelterSource.values()) : source.sources();
        if (limit == null && offset == null) {
            // The unpaged read — the pre-path, byte-identical.
            List<Shelter> shelters = shelterRepository.findAll().stream()
                    .filter(s -> status == null || s.getStatus() == status)
                    .filter(s -> source == null || source.sources().contains(s.getSource()))
                    .sorted(Comparator.comparing(Shelter::getId))
                    .toList();
            if (shelters.isEmpty()) {
                return new Pagination.Paged<>(List.of(), 0L);
            }
            Batches batches = batchesFor(shelters, true);
            List<AdminShelterDto> dtos = shelters.stream()
                    .map(shelter -> toAdminDto(shelter, batches))
                    .toList();
            if (needle == null) {
                return new Pagination.Paged<>(dtos, dtos.size());
            }
            List<AdminShelterDto> filtered = adminQFilter(dtos, needle);
            return new Pagination.Paged<>(filtered, filtered.size());
        }
        // The paged read: the filters and the slice are in the SQL, the
        // batches run over the page's ids only — not the corpus. An
        // offset without a limit pages "the rest of the list": the SQL
        // limit is unbounded (the remaining rows), never an NPE.
        String pattern = needle == null ? null : likePattern(needle);
        List<Shelter> page = shelterRepository.findAdminPage(status, sources, pattern,
                offset == null ? 0L : offset, limit == null ? Integer.MAX_VALUE : limit);
        long total = shelterRepository.countAdminPage(status, sources, pattern);
        if (page.isEmpty()) {
            return new Pagination.Paged<>(List.of(), total);
        }
        Batches batches = batchesFor(page, true);
        List<AdminShelterDto> dtos = page.stream()
                .map(shelter -> toAdminDto(shelter, batches))
                .toList();
        if (needle != null) {
            dtos = adminQFilter(dtos, needle);
        }
        return new Pagination.Paged<>(dtos, total);
    }

    /** The in-memory search filter (the unpaged path's semantics, verbatim). */
    private static List<AdminShelterDto> adminQFilter(List<AdminShelterDto> dtos, String needle) {
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
        // null key: registry row / pre-V7 legacy row — no submitter name
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
        // report semantics: the open "inaccurate information" count
        // (WRONG_LOCATION + OTHER), same derivation as the public DTO.
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

    // ---- community pulse (report aggregation UI) -----------------------

    /**
     * The community pulse (report aggregation UI), DETAIL-read only.
     *
     * <p>The fresh window is the SAME 2 h read-time window as the occupancy
     * and open/closed taps (clock minus the window, applied at read —
     * no cleanup job). The plain counts are unweighted; the shares are
     * trust-weighted with the SAME derived weight the auto-hide tally uses
     * (community-self-moderation see {@code ShelterReportService});
     * taps and bands carry no damp flag (damping is a NON_EXISTENT-report
     * concept), so every fresh report contributes at least the baseline
     * weight. The recent log is the merged fresh taps + bands, newest
     * first, capped — it carries NO reporter identity (privacy: the
     * public log says "a community member", never who).
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

    /** the trust filters over the projected list (absent = no filter).
     *  {@code provenance} (shelter-provenance-taxonomy) keeps the rows
     *  whose derived taxonomy value matches — in-memory over the projected
     *  list, the same Estonia-scale precedent as the trust filters. */
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
