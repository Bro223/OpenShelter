package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.ModerationAuditLog;
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
 * batch is accessibility-and-provenance D3; the trust batch is
 * shelter-trust-and-reports D1/D4).
 *
 * <p>Trust derivations are computed HERE, server-side, never client-
 * computed from raw report lists: {@code nonexistentReports} (0 when
 * none), the live open/closed block (latest fresh tap wins, same 2 h
 * freshness window as occupancy) and the fresh occupancy block (latest
 * band wins, hedged at one agreeing report, firm at two+, silent past 2
 * h). Admin-dismissed reports count in neither.
 *
 * <p>D5: the public list projection is ACTIVE-only (auto-hidden shelters
 * disappear from the map and list); the trust filter
 * ({@code hasCapacity}) is applied in-memory over the
 * already-fetched list (Estonia-scale data). (Rating demotion, completed
 * by V21: the {@code minRating} query parameter no longer exists on the
 * model — an unknown {@code minRating} parameter is ignored for API
 * compatibility.)
 *
 * <p>Community trust (community-review-queue v2 D2): the public list and
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

    /** Freshness window for the live state blocks (occupancy D4, and the open/closed tap on the same level): reports older than this are silent. */
    public static final Duration OCCUPANCY_FRESHNESS_WINDOW = Duration.ofHours(2);

    /** The largest page the public list answers (shelter-bbox-paging D1): beyond it the caller narrows the viewport. */
    public static final int MAX_PAGE_SIZE = 200;

    /** The recent-report log length the community pulse answers (M9): newest first, the rest scroll away. */
    public static final int RECENT_REPORTS_CAP = 10;

    private final ShelterRepository shelterRepository;
    private final UserRepository userRepository;
    private final ShelterReportRepository reportRepository;
    private final ShelterOccupancyRepository occupancyRepository;
    private final ShelterOpenStatusRepository openStatusRepository;
    private final DataImportLog dataImportLog;
    private final ModerationAuditLog moderationAudit;
    private final ShelterInfoRequestLog infoRequests;
    private final Clock clock;

    public ShelterQueryService(ShelterRepository shelterRepository,
                               UserRepository userRepository,
                               ShelterReportRepository reportRepository,
                               ShelterOccupancyRepository occupancyRepository,
                               ShelterOpenStatusRepository openStatusRepository,
                               DataImportLog dataImportLog,
                               ModerationAuditLog moderationAudit,
                               ShelterInfoRequestLog infoRequests,
                               Clock clock) {
        this.shelterRepository = shelterRepository;
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.occupancyRepository = occupancyRepository;
        this.openStatusRepository = openStatusRepository;
        this.dataImportLog = dataImportLog;
        this.moderationAudit = moderationAudit;
        this.infoRequests = infoRequests;
        this.clock = clock;
    }

    /**
     * The public list: ACTIVE rows only (D5) — with the optional trust
     * filter applied in-memory.
     * {@code hasCapacity} keeps shelters with capacity data.
     * A {@code false} boolean is the negation. (V21: no {@code minRating}
     * parameter exists any more — an unknown {@code minRating} is ignored for
     * API compatibility.)
     * NEW community rows are listed like any other ACTIVE row
     * (community-review-queue v2 D2 — no visibility gate).
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
     * paging (shelter-bbox-paging D2):
     *
     * <ol>
     * <li>SQL: the ACTIVE rows of the source set, inside the inclusive
     * {@code bbox} when one is given, {@code ORDER BY id ASC} — the stable
     * order every list answer uses (the id is unique, so the order is
     * total and paging over it is deterministic);</li>
     * <li>the batched DTO mapping (no N+1) over exactly that set;</li>
     * <li>the in-memory trust filters ({@code hasCapacity},
     * {@code provenance}) — unchanged semantics;</li>
     * <li>the {@code offset}/{@code limit} slice LAST, over the filtered
     * stably-ordered list — a page never contains a row the filters would
     * drop, and consecutive pages tile the filtered list without overlap
     * or skipped rows.</li>
     * </ol>
     *
     * <p>Omitting the bbox and both paging params answers byte-identical
     * to the pre-change endpoint (the no-viewport repository query is the
     * untouched one, so the SQL is unchanged too).
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean hasCapacity,
                                    Provenance provenance, BoundingBox bbox,
                                    Integer limit, Integer offset) {
        List<Shelter> shelters = bbox == null
                ? shelterRepository.findAllActiveBySourceIn(source.sources())
                : shelterRepository.findAllActiveBySourceInWithin(source.sources(), bbox);
        List<ShelterDto> dtos = toDtos(shelters, null);
        List<ShelterDto> filtered = applyTrustFilters(dtos, hasCapacity, provenance);
        return slice(filtered, offset, limit);
    }

    /**
     * The offset/limit slice over the stably-ordered list
     * (shelter-bbox-paging D2). Paging without a stable order is
     * meaningless — this runs over the id-ascending answer and nowhere
     * else. Nulls mean "no paging" (the offset defaults to 0); an offset
     * past the end answers an empty page, never an error. The bounds
     * themselves (1…{@link #MAX_PAGE_SIZE}, non-negative offset) are the
     * controller's validation, so this never sees a negative offset.
     */
    static List<ShelterDto> slice(List<ShelterDto> rows, Integer offset, Integer limit) {
        int from = offset == null ? 0 : offset;
        if (from >= rows.size()) {
            return List.of();
        }
        int to = limit == null ? rows.size() : Math.min(rows.size(), from + limit);
        return List.copyOf(rows.subList(from, to));
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
     * <p>M9 community pulse: the detail read is ALSO the only projection
     * that carries {@code communityPulse} (the fresh-window aggregates +
     * recent log behind the detail page's gauges) — it is public (guests
     * read it too) and is NOT caller-scoped.
     */
    public Optional<ShelterDto> findById(long id, User caller) {
        Shelter shelter = shelterRepository.findById(id).orElse(null);
        if (shelter == null) {
            return Optional.empty();
        }
        return Optional.of(toDtos(List.of(shelter), caller, true).get(0));
    }

    /** The caller's own shelters, all statuses and all review states (D5: the owner list keeps hidden rows).
     *  The /mine projection additionally carries each row's moderator→submitter
     *  information request — the exchange is private, so the
     *  public list and detail reads never fetch it. */
    public List<ShelterDto> findByCreatedBy(long userId) {
        return toDtos(shelterRepository.findByCreatedBy(userId), null, true, false);
    }

    /** Maps a batch of shelters in ONE aggregate pass (no N+1). */
    private List<ShelterDto> toDtos(List<Shelter> shelters, User caller) {
        return toDtos(shelters, caller, false, false);
    }

    /** The detail read: the shared projection + the community pulse (M9). */
    private List<ShelterDto> toDtos(List<Shelter> shelters, User caller, boolean withPulse) {
        return toDtos(shelters, caller, false, withPulse);
    }

    private List<ShelterDto> toDtos(List<Shelter> shelters, User caller, boolean withInfoRequests,
                                    boolean withPulse) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        Batches batches = batchesFor(shelters, withInfoRequests, withPulse);
        // The caller's own live states are DETAIL-only fields (D5): one
        // indexed lookup each, and only for the single-shelter read — the
        // list paths (public + /mine) pass a null caller and stay pure
        // batch queries.
        Map<Long, OccupancyBand> callerBands = callerBands(shelters, caller);
        Map<Long, String> callerOpenStatuses = callerOpenStatuses(shelters, caller);
        return shelters.stream()
                .map(shelter -> toDto(shelter, batches, callerBands.get(shelter.getId()),
                        callerOpenStatuses.get(shelter.getId())))
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
        // Provenance (accessibility-and-provenance D3): the batch's creators in
        // ONE lookup — distinct non-null author ids; missing ids (deleted users)
        // simply stay absent from the returned map.
        Set<Long> authorIds = shelters.stream()
                .map(Shelter::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> authors = userRepository.findByIds(authorIds);
        // Trust layer (D1): report counts by type for the whole batch in ONE query.
        Map<Long, Map<ShelterReportType, Long>> reportCounts = reportRepository
                .countByTypeForShelterIds(ids).stream()
                .collect(Collectors.groupingBy(ReportTypeCount::shelterId,
                        Collectors.toMap(ReportTypeCount::type, ReportTypeCount::count)));
        // Trust layer (D4): the fresh occupancy rows for the whole batch in
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
        // Community pulse (M9 — report aggregation UI): the fresh-window
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
    private Map<Long, OccupancyBand> callerBands(List<Shelter> shelters, User caller) {
        Long callerId = caller == null ? null : caller.getId();
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
    private Map<Long, String> callerOpenStatuses(List<Shelter> shelters, User caller) {
        Long callerId = caller == null ? null : caller.getId();
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
                             String yourOpenStatus) {
        // null key: registry row / pre-V7 legacy row — no author lookup
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        // "Completed verification" = at least one active (non-revoked) claim;
        // a null author (registry row or a deleted user) is never verified.
        boolean submitterVerified = author != null && !author.getData().levels().isEmpty();
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
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
                (int) nonExistent,
                batches.openStatus().get(shelter.getId()),
                batches.occupancy().get(shelter.getId()),
                yourOccupancyBand,
                yourOpenStatus,
                shelter.getReviewStatus(),
                shelter.getReviewNote(),
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent),
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
     * The admin shelter list (admin-moderation D3): every shelter, ALL
     * statuses (auto-hidden rows included), id-ordered, with the same
     * batched trust derivations as the public list plus the submitter's
     * profile name (the provenance join — one batched lookup, no N+1).
     * {@code status}/{@code source} are exact-match filters (absent = no
     * filter); {@code q} is a case-insensitive substring over name OR
     * address, applied in-memory over the projected list (Estonia-scale
     * data — same precedent as the trust filters).
     */
    public List<AdminShelterDto> findAllForAdmin(ShelterStatus status, ShelterSource source, String q) {
        List<Shelter> shelters = shelterRepository.findAll().stream()
                .filter(s -> status == null || s.getStatus() == status)
                .filter(s -> source == null || s.getSource() == source)
                .sorted(Comparator.comparing(Shelter::getId))
                .toList();
        if (shelters.isEmpty()) {
            return List.of();
        }
        Batches batches = batchesFor(shelters, true);
        List<AdminShelterDto> dtos = shelters.stream()
                .map(shelter -> toAdminDto(shelter, batches))
                .toList();
        if (q == null || q.isBlank()) {
            return dtos;
        }
        String needle = q.trim().toLowerCase(Locale.ROOT);
        return dtos.stream()
                .filter(dto -> (dto.name() != null && dto.name().toLowerCase(Locale.ROOT).contains(needle))
                        || (dto.address() != null && dto.address().toLowerCase(Locale.ROOT).contains(needle)))
                .toList();
    }

    private AdminShelterDto toAdminDto(Shelter shelter, Batches batches) {
        // null key: registry row / pre-V7 legacy row — no submitter name
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
        return new AdminShelterDto(
                shelter.getId(),
                shelter.getName(),
                shelter.getAddress(),
                shelter.getSource(),
                shelter.getStatus(),
                (int) nonExistent,
                batches.occupancy().get(shelter.getId()),
                shelter.getCapacity(),
                author == null ? null : author.getData().name(),
                shelter.getReviewStatus(),
                shelter.getReviewNote(),
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent),
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
                requester == null ? "Unknown" : requester.getData().name(),
                request.replyMessage(), request.repliedAt());
    }

    /**
     * D4 over the fresh rows (the 2 h window already applied in SQL):
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
     * occupancy D4): the MOST RECENT tap's state wins — the tie-break is
     * exactly the occupancy D4 derivation (ties broken by user id — the
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

    // ---- community pulse (M9 — report aggregation UI) -----------------------

    /**
     * The community pulse (M9 — report aggregation UI), DETAIL-read only.
     *
     * <p>The fresh window is the SAME 2 h read-time window as the occupancy
     * D4 and open/closed taps (clock minus the window, applied at read —
     * no cleanup job). The plain counts are unweighted; the shares are
     * trust-weighted with the SAME derived weight the auto-hide tally uses
     * (community-self-moderation D1 — see {@code ShelterReportService});
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
        reporters.forEach(userId -> weights.put(userId, trustWeight(userId)));
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

    /**
     * The reporter's derived trust weight — the SAME derivation the
     * auto-hide tally uses (community-self-moderation D1, see
     * {@code ShelterReportService#trustWeight}): re-derived from the rows
     * that already exist (the reporter's own submissions + the moderation
     * audit trail), never stored — baseline 1, +1 a cross-verified own
     * submission, +1 two own AUTO_CONFIRM actions, capped at 3.
     */
    private int trustWeight(long userId) {
        boolean crossVerifiedSubmission = shelterRepository
                .countByCreatedByAndSourceAndReviewStatus(
                        userId, ShelterSource.USER, ReviewStatus.CONFIRMED) > 0;
        int ownAutoConfirms = (int) moderationAudit.countByModeratorAndAction(userId,
                ModerationAuditLog.Action.AUTO_CONFIRM);
        return ReporterTrust.of(crossVerifiedSubmission, ownAutoConfirms).weight();
    }

    /** A reporter absent from the weight map gets the baseline weight (defensive — the map is built over every reporter). */
    private static int weightOf(Map<Long, Integer> weights, long userId) {
        return weights.getOrDefault(userId, ReporterTrust.BASELINE);
    }

    /** D5: the trust filters over the projected list (absent = no filter).
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
