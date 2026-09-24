package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryDataImportLog;
import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterInfoRequestLog;
import ee.sheltermap.app.InMemoryShelterOccupancyRepository;
import ee.sheltermap.app.InMemoryShelterOpenStatusRepository;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReportRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ReporterTrustEvaluator;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterOpenStatusReport;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the community pulse (report aggregation UI): the
 * fresh-window aggregate queries (the plain counts + the recent log over
 * the SAME 2 h read-time window as the occupancy / open-status taps),
 * the damping-weighted share (the trust-weighted share that drives the
 * gauge arrow — equal split → 0.5, all-one-way → the extremes, zero data
 * → the null empty state) and the log's privacy (no reporter identity).
 *
 * <p>Same in-memory fake setup as {@link ShelterQueryServiceTest} — the
 * read side in isolation, no Spring, no database.
 */
class CommunityPulseTest {

    private static final Instant NOW = Instant.parse("2026-09-11T12:00:00Z");
    private static final Clock FIXED = Clock.fixed(NOW, ZoneOffset.UTC);

    private InMemoryShelterRepository shelters;
    private InMemoryUserRepository users;
    private InMemoryShelterReportRepository reports;
    private InMemoryShelterOccupancyRepository occupancy;
    private InMemoryShelterOpenStatusRepository openStatus;
    private InMemoryModerationAuditLog audit;
    private InMemoryShelterInfoRequestLog infoRequests;
    private ShelterQueryService service;

    private Shelter shelter;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        users = new InMemoryUserRepository();
        reports = new InMemoryShelterReportRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        openStatus = new InMemoryShelterOpenStatusRepository();
        InMemoryDataImportLog importLog = new InMemoryDataImportLog();
        audit = new InMemoryModerationAuditLog(FIXED);
        infoRequests = new InMemoryShelterInfoRequestLog(FIXED);
        service = new ShelterQueryService(shelters, users, reports, occupancy,
                openStatus, importLog, audit,
                new ReporterTrustEvaluator(shelters, audit),
                infoRequests, FIXED);

        shelter = new Shelter("Pulsed Shelter", new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                "ext-pulsed", ShelterSource.USER);
        shelters.save(shelter);
    }

    private void tap(long userId, OpenStatusState state, Instant at) {
        openStatus.save(new ShelterOpenStatusReport(shelter.getId(), userId, state, at));
    }

    private void band(long userId, OccupancyBand band, Instant at) {
        occupancy.save(new ShelterOccupancyReport(shelter.getId(), userId, band, at));
    }

    /** A verified user with ≥ 1 CONFIRMED USER submission — trust weight 2. */
    private long trustedUser() {
        RegisteredUser user = new RegisteredUser("Trusted", "trusted@example.ee", "+3725100");
        users.save(user);
        Shelter own = new Shelter("Trusted Own Row", new GeoPoint(59.5, 24.8), ShelterStatus.ACTIVE,
                "ext-trusted-own", ShelterSource.USER);
        own.setCreatedBy(user.getId());
        own.setReviewStatus(ReviewStatus.CONFIRMED);
        shelters.save(own);
        return user.getId();
    }

    /** A verified user with a CONFIRMED submission AND two own AUTO_CONFIRM
     *  actions — the capped trust weight 3. */
    private long doublyTrustedUser() {
        long userId = trustedUser();
        audit.record(shelter.getId(), null, userId, ModerationAuditLog.Action.AUTO_CONFIRM, null,
                ReviewStatus.NEW, ReviewStatus.CONFIRMED);
        audit.record(shelter.getId(), null, userId, ModerationAuditLog.Action.AUTO_CONFIRM, null,
                ReviewStatus.NEW, ReviewStatus.CONFIRMED);
        return userId;
    }

    // ---------- empty state (zero data) ----------

    @Test
    void noFreshReportsIsTheExplicitEmptyState() {
        ShelterDto dto = service.findById(shelter.getId()).orElseThrow();

        assertThat(dto.communityPulse()).isNotNull();
        assertThat(dto.communityPulse().openClosed()).isNull();
        assertThat(dto.communityPulse().occupancy()).isNull();
        assertThat(dto.communityPulse().recentReports()).isEmpty();
    }

    @Test
    void reportsOutsideTheTwoHourWindowAreSilentLikeEveryOtherBlock() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofHours(3)));
        band(2L, OccupancyBand.FULL, NOW.minus(Duration.ofHours(3)));

        ShelterDto dto = service.findById(shelter.getId()).orElseThrow();

        assertThat(dto.communityPulse().openClosed()).isNull();
        assertThat(dto.communityPulse().occupancy()).isNull();
        assertThat(dto.communityPulse().recentReports()).isEmpty();
    }

    // ---------- aggregate queries (plain counts) ----------

    @Test
    void freshTapsAggregateToPlainCountsAndTheLogIsNewestFirst() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(30)));
        tap(2L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(10)));
        tap(3L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(5)));
        band(4L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(1)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        assertThat(pulse.openClosed().openReports()).isEqualTo(2);
        assertThat(pulse.openClosed().closedReports()).isEqualTo(1);
        assertThat(pulse.occupancy().fullReports()).isEqualTo(1);
        assertThat(pulse.occupancy().spaceReports()).isZero();
        assertThat(pulse.occupancy().gettingFullReports()).isZero();
        // merged log, newest first
        assertThat(pulse.recentReports())
                .extracting(ShelterDto.CommunityPulse.RecentReport::kind)
                .containsExactly("FULL", "CLOSED", "OPEN", "OPEN");
        assertThat(pulse.recentReports().get(0).reportedAt())
                .isEqualTo(NOW.minus(Duration.ofMinutes(1)));
    }

    @Test
    void theLogCapsAtTenNewestEntries() {
        for (int i = 1; i <= 12; i++) {
            tap(i, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(12 - i)));
        }

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        // the timestamps run NOW … NOW-11m; the ten newest survive, the
        // two oldest (NOW-10m, NOW-11m) are cut
        assertThat(pulse.recentReports()).hasSize(ShelterQueryService.RECENT_REPORTS_CAP);
        assertThat(pulse.recentReports().get(0).reportedAt()).isEqualTo(NOW);
        assertThat(pulse.recentReports().get(9).reportedAt())
                .isEqualTo(NOW.minus(Duration.ofMinutes(9)));
        assertThat(pulse.recentReports())
                .allSatisfy(entry -> assertThat(entry.reportedAt())
                        .isAfterOrEqualTo(NOW.minus(Duration.ofMinutes(9))));
    }

    @Test
    void theLogCarriesOnlyWhatAndWhenNeverWho() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(10)));
        band(2L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(5)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        // the entry's entire surface is (kind, reportedAt) — the record
        // has no user component, and the kinds are the state/band names
        // (never a name, never an id)
        assertThat(pulse.recentReports()).extracting(
                ShelterDto.CommunityPulse.RecentReport::kind)
                .containsExactlyInAnyOrder("OPEN", "FULL");
        assertThat(ShelterDto.CommunityPulse.RecentReport.class.getRecordComponents())
                .extracting(java.lang.reflect.RecordComponent::getName)
                .containsExactly("kind", "reportedAt");
    }

    @Test
    void listAndMineProjectionsCarryNoPulse() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(10)));
        // the owner's row: /mine reads pulse-free too
        shelter.setCreatedBy(1L);
        shelters.save(shelter);

        assertThat(service.findAll(ShelterSourceFilter.USER, null, null))
                .allSatisfy(dto -> assertThat(dto.communityPulse()).isNull());
        assertThat(service.findByCreatedBy(1L))
                .allSatisfy(dto -> assertThat(dto.communityPulse()).isNull());
    }

    @Test
    void thePulseIsPublicForGuestsAndAuthenticatedCallersAlike() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(10)));

        // guest (null caller) and an authenticated caller both read it
        assertThat(service.findById(shelter.getId(), null).orElseThrow().communityPulse())
                .isNotNull();
        RegisteredUser caller = new RegisteredUser("Caller", "caller@example.ee", "+3725101");
        users.save(caller);
        assertThat(service.findById(shelter.getId(), caller.getId()).orElseThrow().communityPulse())
                .isNotNull();
    }

    @Test
    void theExistingSingleReportHedgeBehaviourStaysUntouched() {
        // one fresh CLOSED tap: the latest-wins block still hedges at one
        // (the instant-flip display the gauge sits BESIDE, not replacing)
        tap(1L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(10)));

        ShelterDto dto = service.findById(shelter.getId()).orElseThrow();

        assertThat(dto.openStatus()).isNotNull();
        assertThat(dto.openStatus().state()).isEqualTo("CLOSED");
        assertThat(dto.openStatus().reportCount()).isEqualTo(1);
    }

    // ---------- the damping-weighted share (trust-weighted) ----------

    @Test
    void anEqualSplitIsOneHalfRegardlessOfCounts() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(20)));
        tap(2L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(15)));
        tap(3L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(10)));
        tap(4L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(5)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        assertThat(pulse.openClosed().openShare()).isEqualTo(0.5);
    }

    @Test
    void allOneWayReachesTheExtremeShare() {
        tap(1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(20)));
        tap(2L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(10)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        assertThat(pulse.openClosed().openShare()).isEqualTo(1.0);
        assertThat(pulse.openClosed().closedReports()).isZero();
    }

    @Test
    void theShareWeightsVotesWithTheAutoHideTallyDerivation() {
        // trusted (weight 2) OPEN vs baseline (weight 1) CLOSED → 2/3
        long trusted = trustedUser();
        tap(trusted, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(20)));
        tap(2L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(10)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        // plain counts stay 1:1 — the share is where the weight lives
        assertThat(pulse.openClosed().openReports()).isEqualTo(1);
        assertThat(pulse.openClosed().closedReports()).isEqualTo(1);
        assertThat(pulse.openClosed().openShare())
                .isCloseTo(2.0 / 3.0, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void theCappedWeightThreeMovesTheShareFurther() {
        // capped (weight 3) OPEN vs baseline (weight 1) CLOSED → 3/4
        long capped = doublyTrustedUser();
        tap(capped, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(20)));
        tap(2L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(10)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        assertThat(pulse.openClosed().openShare())
                .isCloseTo(0.75, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void theOccupancyShareWeightsTheEmptyToFullScale() {
        // trusted FULL (2) + baseline FULL (1) + baseline SPACE (1) → 3/4
        long trusted = trustedUser();
        band(trusted, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(20)));
        band(2L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(15)));
        band(3L, OccupancyBand.SPACE, NOW.minus(Duration.ofMinutes(10)));

        ShelterDto.CommunityPulse pulse = service.findById(shelter.getId()).orElseThrow().communityPulse();

        assertThat(pulse.occupancy().fullness())
                .isCloseTo(0.75, org.assertj.core.data.Offset.offset(1e-9)); // (2 + 1 + 0)/4
        // one more baseline SPACE: (2 + 1 + 0 + 0)/5
        occupancy.save(new ShelterOccupancyReport(shelter.getId(), 4L, OccupancyBand.SPACE,
                NOW.minus(Duration.ofMinutes(5))));
        ShelterDto.CommunityPulse afterTie = service.findById(shelter.getId()).orElseThrow().communityPulse();
        assertThat(afterTie.occupancy().fullness())
                .isCloseTo(0.6, org.assertj.core.data.Offset.offset(1e-9));
    }

    // ---------- the derivations, unit-tested directly ----------

    @Test
    void theOpenClosedDerivationAnswersNullOnZeroData() {
        assertThat(ShelterQueryService.deriveOpenClosedPulse(List.of(), Map.of())).isNull();
    }

    @Test
    void theOpenClosedDerivationMapsTheSplitsToShares() {
        // equal split → 0.5; all-one-way → the extremes
        ShelterOpenStatusReport open = new ShelterOpenStatusReport(1L, 1L, OpenStatusState.OPEN, NOW);
        ShelterOpenStatusReport closed = new ShelterOpenStatusReport(1L, 2L, OpenStatusState.CLOSED, NOW);

        assertThat(ShelterQueryService.deriveOpenClosedPulse(
                List.of(open, closed), Map.of()).openShare()).isEqualTo(0.5);
        assertThat(ShelterQueryService.deriveOpenClosedPulse(
                List.of(open), Map.of()).openShare()).isEqualTo(1.0);
        assertThat(ShelterQueryService.deriveOpenClosedPulse(
                List.of(closed), Map.of()).openShare()).isEqualTo(0.0);
    }

    @Test
    void theOccupancyDerivationScoresGettingFullAtHalfAndNullsOnZeroData() {
        assertThat(ShelterQueryService.deriveOccupancyPulse(List.of(), Map.of())).isNull();
        ShelterOccupancyReport gettingFull = new ShelterOccupancyReport(
                1L, 1L, OccupancyBand.GETTING_FULL, NOW);
        assertThat(ShelterQueryService.deriveOccupancyPulse(
                List.of(gettingFull), Map.of()).fullness()).isEqualTo(0.5);

        // the middle band at half weight: one SPACE + one FULL ties at 0.5
        ShelterOccupancyReport space = new ShelterOccupancyReport(1L, 2L, OccupancyBand.SPACE, NOW);
        ShelterOccupancyReport full = new ShelterOccupancyReport(1L, 3L, OccupancyBand.FULL, NOW);
        assertThat(ShelterQueryService.deriveOccupancyPulse(
                List.of(space, full), Map.of()).fullness()).isEqualTo(0.5);
    }

    @Test
    void theRecentReportDerivationOrdersNewestFirstWithADeterministicTieBreak() {
        // same instant: the kind name breaks the tie (deterministic output)
        List<ShelterDto.CommunityPulse.RecentReport> log = ShelterQueryService
                .deriveRecentReports(
                        List.of(new ShelterOpenStatusReport(1L, 1L, OpenStatusState.OPEN, NOW),
                                new ShelterOpenStatusReport(1L, 2L, OpenStatusState.CLOSED, NOW)),
                        List.of(new ShelterOccupancyReport(1L, 3L, OccupancyBand.FULL, NOW)));

        assertThat(log).extracting(ShelterDto.CommunityPulse.RecentReport::kind)
                .containsExactly("CLOSED", "FULL", "OPEN");
    }
}
