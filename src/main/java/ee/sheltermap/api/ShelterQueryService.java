package ee.sheltermap.api;

import ee.sheltermap.app.ShelterOccupancyRepository;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterReportRepository.ReportTypeCount;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.ShelterReviewRepository.RatingAggregate;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.OccupancyBand;
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
    private final Clock clock;

    public ShelterQueryService(ShelterRepository shelterRepository,
                               ShelterReviewRepository reviewRepository,
                               UserRepository userRepository,
                               ShelterReportRepository reportRepository,
                               ShelterOccupancyRepository occupancyRepository,
                               Clock clock) {
        this.shelterRepository = shelterRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.occupancyRepository = occupancyRepository;
        this.clock = clock;
    }

    /**
     * The public list: ACTIVE rows only (D5), with the optional trust
     * filters applied in-memory. {@code reviewed} keeps shelters with at
     * least one VISIBLE review (hidden ones don't count); {@code minRating}
     * compares the visible average — a shelter with 0 reviews never
     * matches (its average is null); {@code hasCapacity} keeps shelters
     * with capacity data. A {@code false} boolean is the negation.
     */
    public List<ShelterDto> findAll(ShelterSourceFilter source, Boolean reviewed,
                                    Integer minRating, Boolean hasCapacity) {
        List<ShelterDto> dtos = toDtos(shelterRepository.findAllActiveBySourceIn(source.sources()), null);
        return applyTrustFilters(dtos, reviewed, minRating, hasCapacity);
    }

    /** The single-shelter read without a caller (internal projections). */
    public Optional<ShelterDto> findById(long id) {
        return findById(id, null);
    }

    /**
     * The detail read: the same projection, additionally carrying the
     * caller's own live band ({@code yourOccupancyBand}) so the occupancy
     * picker can pre-select — null for guests, anonymous callers and
     * callers without a report.
     */
    public Optional<ShelterDto> findById(long id, User caller) {
        return shelterRepository.findById(id)
                .map(shelter -> toDtos(List.of(shelter), caller).get(0));
    }

    /** The caller's own shelters, all statuses (D5: the owner list keeps hidden rows). */
    public List<ShelterDto> findByCreatedBy(long userId) {
        return toDtos(shelterRepository.findByCreatedBy(userId), null);
    }

    /** Maps a batch of shelters in ONE aggregate pass (no N+1). */
    private List<ShelterDto> toDtos(List<Shelter> shelters, User caller) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        Batches batches = batchesFor(shelters);
        // The caller's own band is a DETAIL-only field (D5): one indexed
        // lookup, and only for the single-shelter read — the list paths
        // (public + /mine) pass a null caller and stay pure batch queries.
        Map<Long, OccupancyBand> callerBands = callerBands(shelters, caller);
        return shelters.stream()
                .map(shelter -> toDto(shelter, batches, callerBands.get(shelter.getId())))
                .toList();
    }

    /**
     * The four batched trust lookups (one query each — no N+1) shared by
     * the public list and the admin list projections: rating aggregates,
     * creators (the provenance/trust submitter join), report counts by
     * type, and the fresh occupancy rows.
     */
    private Batches batchesFor(List<Shelter> shelters) {
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
        return new Batches(aggregates, authors, reportCounts, occupancy);
    }

    /** The shared batched inputs of both shelter projections. */
    private record Batches(
            Map<Long, RatingAggregate> aggregates,
            Map<Long, User> authors,
            Map<Long, Map<ShelterReportType, Long>> reportCounts,
            Map<Long, ShelterDto.Occupancy> occupancy) {
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
                yourOccupancyBand);
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
        Batches batches = batchesFor(shelters);
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
                author == null ? null : author.getData().name());
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

    /** D5: the trust filters over the projected list (absent = no filter). */
    private static List<ShelterDto> applyTrustFilters(List<ShelterDto> dtos, Boolean reviewed,
                                                      Integer minRating, Boolean hasCapacity) {
        if (reviewed == null && minRating == null && hasCapacity == null) {
            return dtos;
        }
        return dtos.stream()
                .filter(dto -> reviewed == null || (dto.reviewCount() > 0) == reviewed)
                .filter(dto -> minRating == null
                        || (dto.averageRating() != null && dto.averageRating() >= minRating))
                .filter(dto -> hasCapacity == null || (dto.capacity() != null) == hasCapacity)
                .toList();
    }
}
