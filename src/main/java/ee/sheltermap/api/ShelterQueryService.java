package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ShelterOccupancyRepository;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterReportRepository.ReportTypeCount;
import ee.sheltermap.app.ShelterInfoRequestLog;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.ShelterReviewRepository.RatingAggregate;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.ShelterStatusFlag;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read side of the shelter API. Returns <strong>DTOs only, never
 * entities</strong> (05-shelter-api.puml). Rating aggregates, creator
 * verification state, report counts and fresh occupancy are each computed
 * in <strong>one batched query</strong> per listing — no N+1 (hardening
 * pass; previously one {@code findByShelterId} per shelter; the creator
 * batch is accessibility-and-provenance D3; the trust batch is
 * shelter-trust-and-reports D1/D4).
 *
 * <p>Trust derivations are computed HERE, server-side, never client-
 * computed from raw report lists: {@code nonexistentReports} (0 when
 * none), {@code statusFlag} (the CLOSED vs OPEN_CONFIRMED net — both
 * ≥ 1 required; more closed → REPORTED_CLOSED, confirmed ≥ closed →
 * CONFIRMED_OPEN) and the fresh occupancy block (latest band wins,
 * hedged at one agreeing report, firm at two+, silent past 2 h).
 *
 * <p>D5: the public list projection is ACTIVE-only (auto-hidden shelters
 * disappear from the map and list); the trust filters ({@code reviewed},
 * {@code minRating}, {@code hasCapacity}) are applied in-memory over the
 * already-fetched list (Estonia-scale data; the ratings/counts are
 * computed here anyway — no new SQL surface).
 *
 * <p>Community trust (community-review-queue v2 D2): the public list and
 * detail reads are UNCHANGED by the review model — there is no blocking
 * queue. {@code reviewStatus} is display/trust data on the DTOs (NEW
 * community rows are public, carrying the unverified treatment); only
 * REJECTED rows are hidden, and that through the existing status
 * INACTIVE mechanism.
 *
 * <p>Last-verified meta (last-verified-meta M8): every DTO also carries
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

    /** Occupancy freshness window (D4): reports older than this are silent. */
    public static final Duration OCCUPANCY_FRESHNESS_WINDOW = Duration.ofHours(2);

    private final ShelterRepository shelterRepository;
    private final ShelterReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ShelterReportRepository reportRepository;
    private final ShelterOccupancyRepository occupancyRepository;
    private final DataImportLog dataImportLog;
    private final ModerationAuditLog moderationAudit;
    private final ShelterInfoRequestLog infoRequests;
    private final Clock clock;

    public ShelterQueryService(ShelterRepository shelterRepository,
                               ShelterReviewRepository reviewRepository,
                               UserRepository userRepository,
                               ShelterReportRepository reportRepository,
                               ShelterOccupancyRepository occupancyRepository,
                               DataImportLog dataImportLog,
                               ModerationAuditLog moderationAudit,
                               ShelterInfoRequestLog infoRequests,
                               Clock clock) {
        this.shelterRepository = shelterRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.occupancyRepository = occupancyRepository;
        this.dataImportLog = dataImportLog;
        this.moderationAudit = moderationAudit;
        this.infoRequests = infoRequests;
        this.clock = clock;
    }

    /**
     * The public list: ACTIVE rows only (D5) — with the optional trust
     * filters applied in-memory. {@code reviewed} keeps shelters with at
     * least one VISIBLE review (hidden ones don't count); {@code minRating}
     * compares the visible average — a shelter with 0 reviews never
     * matches (its average is null); {@code hasCapacity} keeps shelters
     * with capacity data. A {@code false} boolean is the negation.
     * NEW community rows are listed like any other ACTIVE row
     * (community-review-queue v2 D2 — no visibility gate).
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean reviewed,
                                    Integer minRating, Boolean hasCapacity, Provenance provenance) {
        List<ShelterDto> dtos = toDtos(shelterRepository.findAllActiveBySourceIn(source.sources()), null);
        return applyTrustFilters(dtos, reviewed, minRating, hasCapacity, provenance);
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
     * by id exactly as any other INACTIVE row (ids are public); the
     * review model adds no detail-read rule.
     */
    public Optional<ShelterDto> findById(long id, User caller) {
        return shelterRepository.findById(id)
                .map(shelter -> toDtos(List.of(shelter), caller).get(0));
    }

    /** The caller's own shelters, all statuses and all review states (D5: the owner list keeps hidden rows).
     *  The /mine projection additionally carries each row's moderator→submitter
     *  information request (M10 slice 3) — the exchange is private, so the
     *  public list and detail reads never fetch it. */
    public List<ShelterDto> findByCreatedBy(long userId) {
        return toDtos(shelterRepository.findByCreatedBy(userId), null, true);
    }

    /** Maps a batch of shelters in ONE aggregate pass (no N+1). */
    private List<ShelterDto> toDtos(List<Shelter> shelters, User caller) {
        return toDtos(shelters, caller, false);
    }

    private List<ShelterDto> toDtos(List<Shelter> shelters, User caller, boolean withInfoRequests) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        Batches batches = batchesFor(shelters, withInfoRequests);
        // The caller's own band is a DETAIL-only field (D5): one indexed
        // lookup, and only for the single-shelter read — the list paths
        // (public + /mine) pass a null caller and stay pure batch queries.
        Map<Long, OccupancyBand> callerBands = callerBands(shelters, caller);
        return shelters.stream()
                .map(shelter -> toDto(shelter, batches, callerBands.get(shelter.getId())))
                .toList();
    }

    /**
     * The batched trust lookups (one query each — no N+1) shared by the
     * public list and the admin list projections: rating aggregates,
     * creators (the provenance/trust submitter join), report counts by
     * type, the fresh occupancy rows, and the last-verified stamp (M8).
     */
    private Batches batchesFor(List<Shelter> shelters) {
        return batchesFor(shelters, false);
    }

    private Batches batchesFor(List<Shelter> shelters, boolean withInfoRequests) {
        List<Long> ids = shelters.stream().map(Shelter::getId).toList();
        Map<Long, RatingAggregate> aggregates = reviewRepository.findRatingAggregates(ids).stream()
                .collect(Collectors.toMap(RatingAggregate::shelterId, Function.identity()));
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
        // Last verified (M8): the per-shelter verification stamp (see the
        // lastVerifiedFor derivation comment).
        Map<Long, Instant> lastVerified = lastVerifiedFor(shelters, ids);
        // Information request (M10 slice 3): the per-shelter exchange row
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
        return new Batches(aggregates, authors, reportCounts, occupancy, lastVerified,
                infoRequestRows, infoRequesters);
    }

    /** The shared batched inputs of both shelter projections. */
    private record Batches(
            Map<Long, RatingAggregate> aggregates,
            Map<Long, User> authors,
            Map<Long, Map<ShelterReportType, Long>> reportCounts,
            Map<Long, ShelterDto.Occupancy> occupancy,
            Map<Long, Instant> lastVerified,
            Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequests,
            Map<Long, User> infoRequesters) {
    }

    /**
     * M8: the per-entry "last verified" stamp. Registry rows carry the
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

    private ShelterDto toDto(Shelter shelter, Batches batches, OccupancyBand yourOccupancyBand) {
        RatingAggregate aggregate = batches.aggregates().get(shelter.getId());
        // null key: registry row / pre-V7 legacy row — no author lookup
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        double average = aggregate == null ? 0 : aggregate.average();
        long count = aggregate == null ? 0 : aggregate.count();
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
                count == 0 ? null : average,
                (int) count,
                shelter.getCreatedAt(),
                shelter.getDescription(),
                shelter.getCapacity(),
                submitterVerified,
                (int) nonExistent,
                statusFlagOf(typeCounts),
                batches.occupancy().get(shelter.getId()),
                yourOccupancyBand,
                shelter.getReviewStatus(),
                shelter.getReviewNote(),
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent),
                reportTotal,
                batches.lastVerified().get(shelter.getId()),
                toInfoRequest(batches.infoRequests().get(shelter.getId())));
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
        RatingAggregate aggregate = batches.aggregates().get(shelter.getId());
        // null key: registry row / pre-V7 legacy row — no submitter name
        Long createdById = shelter.getCreatedBy();
        User author = createdById == null ? null : batches.authors().get(createdById);
        double average = aggregate == null ? 0 : aggregate.average();
        long count = aggregate == null ? 0 : aggregate.count();
        Map<ShelterReportType, Long> typeCounts =
                batches.reportCounts().getOrDefault(shelter.getId(), Map.of());
        long nonExistent = typeCounts.getOrDefault(ShelterReportType.NON_EXISTENT, 0L);
        return new AdminShelterDto(
                shelter.getId(),
                shelter.getName(),
                shelter.getAddress(),
                shelter.getSource(),
                shelter.getStatus(),
                count == 0 ? null : average,
                (int) count,
                (int) nonExistent,
                statusFlagOf(typeCounts),
                batches.occupancy().get(shelter.getId()),
                shelter.getCapacity(),
                author == null ? null : author.getData().name(),
                shelter.getReviewStatus(),
                shelter.getReviewNote(),
                shelter.getLocationKind(),
                Provenance.of(shelter.getSource(), shelter.getReviewStatus(),
                        shelter.getStatus(), nonExistent),
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
     * D1: the derived reported state — counts are small, computed at
     * read time, never stored. REPORTED_CLOSED when closed > confirmed
     * (confirmed may be 0 — the "2 CLOSED, nobody confirmed" scenario);
     * CONFIRMED_OPEN when confirmed ≥ closed with BOTH sides present
     * (a tie is a confirmed open); otherwise no flag.
     */
    private static ShelterStatusFlag statusFlagOf(Map<ShelterReportType, Long> typeCounts) {
        long closed = typeCounts.getOrDefault(ShelterReportType.CLOSED, 0L);
        long confirmed = typeCounts.getOrDefault(ShelterReportType.OPEN_CONFIRMED, 0L);
        if (closed > confirmed) {
            return ShelterStatusFlag.REPORTED_CLOSED;
        }
        if (closed >= 1 && confirmed >= 1) {
            return ShelterStatusFlag.CONFIRMED_OPEN;
        }
        return null;
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

    /** D5: the trust filters over the projected list (absent = no filter).
     *  {@code provenance} (shelter-provenance-taxonomy M6) keeps the rows
     *  whose derived taxonomy value matches — in-memory over the projected
     *  list, the same Estonia-scale precedent as the trust filters. */
    private static List<ShelterDto> applyTrustFilters(List<ShelterDto> dtos, Boolean reviewed,
                                                      Integer minRating, Boolean hasCapacity,
                                                      Provenance provenance) {
        if (reviewed == null && minRating == null && hasCapacity == null && provenance == null) {
            return dtos;
        }
        return dtos.stream()
                .filter(dto -> reviewed == null || (dto.reviewCount() > 0) == reviewed)
                .filter(dto -> minRating == null
                        || (dto.averageRating() != null && dto.averageRating() >= minRating))
                .filter(dto -> hasCapacity == null || (dto.capacity() != null) == hasCapacity)
                .filter(dto -> provenance == null || dto.provenance() == provenance)
                .toList();
    }
}
