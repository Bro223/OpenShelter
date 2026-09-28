package ee.sheltermap.api;

import ee.sheltermap.app.ReporterTrustEvaluator;
import ee.sheltermap.app.ShelterOccupancyRepository;
import ee.sheltermap.app.ShelterOpenStatusRepository;
import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.ReporterTrust;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterOpenStatusReport;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * The community pulse (report aggregation UI), DETAIL-read only — the
 * pulse seam extracted from {@link ShelterQueryService}: the fresh-window
 * fetch of the shelter's taps + bands and the three derivations (the
 * trust-weighted open/closed share, the empty→full position, and the
 * capped, identity-free recent log) it runs over them.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code
 * ShelterQueryService} (whose ten-argument constructor the unit suite
 * freezes) constructs it from its own tap/band repositories, the trust
 * evaluator and the clock, and the read-side methods remain the public
 * surface. The pulse is computed inside the caller's read path (no
 * transaction of its own) over the SAME read-time 2 h window the
 * occupancy and open/closed blocks use.
 *
 * <p>The fresh window is the SAME 2 h read-time window as the occupancy
 * and open/closed taps (clock minus the window, applied at read — no
 * cleanup job). The plain counts are unweighted; the shares are
 * trust-weighted with the SAME derived weight the auto-hide tally uses.
 * Taps and bands carry no damp flag (damping is a NON_EXISTENT-report
 * concept), so every fresh report contributes at least the baseline
 * weight. The recent log is the merged fresh taps + bands, newest first,
 * capped — it carries NO reporter identity (privacy: the public log says
 * "a community member", never who).
 */
public class CommunityPulseAggregator {

    /** The recent-report log length the community pulse answers: newest first, the rest scroll away. */
    public static final int RECENT_REPORTS_CAP = 10;

    private final ShelterOpenStatusRepository openStatusRepository;
    private final ShelterOccupancyRepository occupancyRepository;
    private final ReporterTrustEvaluator trustEvaluator;
    private final Clock clock;

    public CommunityPulseAggregator(ShelterOpenStatusRepository openStatusRepository,
                                    ShelterOccupancyRepository occupancyRepository,
                                    ReporterTrustEvaluator trustEvaluator,
                                    Clock clock) {
        this.openStatusRepository = Objects.requireNonNull(openStatusRepository, "openStatusRepository");
        this.occupancyRepository = Objects.requireNonNull(occupancyRepository, "occupancyRepository");
        this.trustEvaluator = Objects.requireNonNull(trustEvaluator, "trustEvaluator");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * One shelter's community pulse: the fresh taps + bands (the 2 h
     * window already applied in SQL), the trust weight of every fresh
     * reporter in ONE derived-weight pass, and the three derivations
     * over them.
     */
    public ShelterDto.CommunityPulse pulseFor(long shelterId) {
        Instant freshSince = clock.instant().minus(ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW);
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
    public static ShelterDto.CommunityPulse.OpenClosed deriveOpenClosedPulse(
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
    public static ShelterDto.CommunityPulse.OccupancyBands deriveOccupancyPulse(
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
    public static List<ShelterDto.CommunityPulse.RecentReport> deriveRecentReports(
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
}
