package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ShelterInfoRequestLog;
import ee.sheltermap.app.ShelterOccupancyRepository;
import ee.sheltermap.app.ShelterOpenStatusRepository;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterReportRepository.ReportTypeCount;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterOpenStatusReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.User;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The batched per-shelter trust lookups (the no-N+1 engine) — the lookup
 * seam extracted from {@link ShelterQueryService}: given a list of
 * shelters and the two projection flags, it runs ONE query per side-
 * lookup and assembles the {@link Batches} the row mappers read.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code
 * ShelterQueryService} (whose ten-argument constructor the unit suite
 * freezes) constructs it from its own repositories, logs, the
 * {@link CommunityPulseAggregator} and the clock, and the service's read
 * methods remain the public surface. The lookups run inside the caller's
 * read path (no transaction of their own).
 *
 * <p>Each lookup is a named step in {@link #lookup}, in this order, over
 * the whole batch — creators, per-type report counts, the fresh
 * occupancy and open/closed taps (the 2 h window applied in SQL), the
 * last-verified stamp, and — only when the projection asks — the
 * information-request rows + requesting admins and the detail-only
 * community pulse. No {@code findByShelterId} per shelter.
 */
public class ShelterTrustBatch {

    private final UserRepository userRepository;
    private final ShelterReportRepository reportRepository;
    private final ShelterOccupancyRepository occupancyRepository;
    private final ShelterOpenStatusRepository openStatusRepository;
    private final DataImportLog dataImportLog;
    private final ModerationAuditLog moderationAudit;
    private final ShelterInfoRequestLog infoRequests;
    private final Clock clock;
    private final CommunityPulseAggregator pulse;

    public ShelterTrustBatch(UserRepository userRepository,
                             ShelterReportRepository reportRepository,
                             ShelterOccupancyRepository occupancyRepository,
                             ShelterOpenStatusRepository openStatusRepository,
                             DataImportLog dataImportLog,
                             ModerationAuditLog moderationAudit,
                             ShelterInfoRequestLog infoRequests,
                             Clock clock,
                             CommunityPulseAggregator pulse) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.reportRepository = Objects.requireNonNull(reportRepository, "reportRepository");
        this.occupancyRepository = Objects.requireNonNull(occupancyRepository, "occupancyRepository");
        this.openStatusRepository = Objects.requireNonNull(openStatusRepository, "openStatusRepository");
        this.dataImportLog = Objects.requireNonNull(dataImportLog, "dataImportLog");
        this.moderationAudit = Objects.requireNonNull(moderationAudit, "moderationAudit");
        this.infoRequests = Objects.requireNonNull(infoRequests, "infoRequests");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.pulse = Objects.requireNonNull(pulse, "pulse");
    }

    /**
     * The side-lookups a projection reads over a batch of shelters — one
     * query per lookup, no N+1. Each lookup is a named step below, in
     * this order; the two flags decide which of the optional lookups
     * (information requests, community pulse) run at all.
     */
    public Batches lookup(List<Shelter> shelters, boolean includeInfoRequests,
                          boolean includeCommunityPulse) {
        List<Long> shelterIds = shelters.stream().map(Shelter::getId).toList();
        Map<Long, User> authors = creatorsFor(shelters);
        Map<Long, Map<ShelterReportType, Long>> reportCounts = reportCountsFor(shelterIds);
        Map<Long, ShelterDto.Occupancy> occupancy = freshOccupancyFor(shelterIds);
        Map<Long, ShelterDto.OpenStatus> openStatus = freshOpenStatusFor(shelterIds);
        Map<Long, Instant> lastVerified = lastVerifiedFor(shelters, shelterIds);
        // Fetched ONLY for the /mine and admin projections (the
        // information-request exchange rows + the requesting admin).
        Map<Long, ShelterInfoRequestLog.InfoRequest> infoRequestRows = includeInfoRequests
                ? infoRequests.findByShelterIds(shelterIds)
                : Map.of();
        Map<Long, User> infoRequesters = includeInfoRequests
                ? infoRequestersFor(infoRequestRows)
                : Map.of();
        // DETAIL-read only: the fresh-window aggregates + recent log.
        Map<Long, ShelterDto.CommunityPulse> communityPulse = includeCommunityPulse
                ? shelters.stream()
                        .collect(Collectors.toMap(Shelter::getId,
                                shelter -> pulse.pulseFor(shelter.getId())))
                : Map.of();
        return new Batches(authors, reportCounts, occupancy, openStatus,
                lastVerified, infoRequestRows, infoRequesters, communityPulse);
    }

    /** The shared batched lookups of both shelter projections. */
    public record Batches(
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
                shelterIds, clock.instant().minus(ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW)));
    }

    /**
     * The fresh open/closed taps for the whole batch in ONE query (the
     * same 2 h window as occupancy); latest tap wins, agreeing count,
     * newest timestamp.
     */
    private Map<Long, ShelterDto.OpenStatus> freshOpenStatusFor(List<Long> shelterIds) {
        return deriveOpenStatus(openStatusRepository.findFreshByShelterIds(
                shelterIds, clock.instant().minus(ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW)));
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
}
