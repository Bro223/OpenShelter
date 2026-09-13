package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryDataImportLog;
import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterOccupancyRepository;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReportRepository;
import ee.sheltermap.app.InMemoryShelterReviewRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.ShelterStatusFlag;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the read side of the shelter API: source-filter mapping
 * (REGISTRY/USER/ALL → repository source sets), DTO mapping that never leaks
 * the entity, rating aggregates computed per request, and the trust-layer
 * derivations (shelter-trust-and-reports D1/D4/D5): report counts, the
 * CLOSED/OPEN_CONFIRMED flag, the fresh occupancy block, the ACTIVE-only
 * public list and the in-memory trust filters.
 */
class ShelterQueryServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-11T12:00:00Z");
    private static final Clock FIXED = Clock.fixed(NOW, ZoneOffset.UTC);

    private InMemoryShelterRepository shelters;
    private InMemoryShelterReviewRepository reviews;
    private InMemoryUserRepository users;
    private InMemoryShelterReportRepository reports;
    private InMemoryShelterOccupancyRepository occupancy;
    private InMemoryDataImportLog importLog;
    private InMemoryModerationAuditLog audit;
    private ShelterQueryService service;

    private Shelter userShelter;
    private Shelter registryShelter;
    private Shelter municipalityShelter;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        reviews = new InMemoryShelterReviewRepository();
        users = new InMemoryUserRepository();
        reports = new InMemoryShelterReportRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        importLog = new InMemoryDataImportLog();
        audit = new InMemoryModerationAuditLog(FIXED);
        service = new ShelterQueryService(shelters, reviews, users, reports, occupancy,
                importLog, audit, FIXED);

        userShelter = save("User House", ShelterSource.USER);
        registryShelter = save("Paasteamet House", ShelterSource.PAASETEAMET);
        municipalityShelter = save("City House", ShelterSource.MUNICIPALITY);
    }

    private Shelter save(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE, "ext-" + name, source);
        shelters.save(shelter);
        return shelter;
    }

    private void report(long shelterId, long userId, ShelterReportType type) {
        reports.save(new ShelterReport(shelterId, userId, type, null));
    }

    /** A report at an explicit instant (deterministic "last verified" assertions). */
    private void reportAt(long shelterId, long userId, ShelterReportType type, Instant at) {
        reports.save(new ShelterReport(shelterId, userId, type, null, at));
    }

    private long saveUser(String name, String email, boolean verified) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725100" + (1 + users.findAll().size()));
        if (verified) {
            user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        }
        users.save(user);
        return user.getId();
    }

    @Test
    void filterUserReturnsOnlyUserRowsAsDtos() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.USER, null, null, null, null);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactly("User House");
        assertThat(dtos).extracting(ShelterDto::source)
                .containsOnly(ShelterSource.USER);
    }

    @Test
    void filterRegistryReturnsOnlyImportedRows() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.REGISTRY, null, null, null, null);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactlyInAnyOrder("Paasteamet House", "City House");
        assertThat(dtos).extracting(ShelterDto::source)
                .containsOnly(ShelterSource.PAASETEAMET, ShelterSource.MUNICIPALITY);
    }

    @Test
    void filterAllReturnsEverything() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL, null, null, null, null);

        assertThat(dtos).hasSize(3);
    }

    @Test
    void publicListExcludesInactiveSheltersButMineKeepsThem() {
        Shelter hidden = save("Peidetud varjend", ShelterSource.USER);
        hidden.setStatus(ShelterStatus.INACTIVE);
        shelters.save(hidden);
        hidden.setCreatedBy(7L);

        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, null))
                .extracting(ShelterDto::name)
                .doesNotContain("Peidetud varjend");
        // the owner list keeps hidden rows (D5) and carries their derived state
        ShelterDto mine = service.findByCreatedBy(7L).get(0);
        assertThat(mine.name()).isEqualTo("Peidetud varjend");
        assertThat(mine.status()).isEqualTo(ShelterStatus.INACTIVE);
    }

    @Test
    void dtoCarriesRatingAggregatesComputedPerRequest() {
        // two reviews: 4 and 5 -> average 4.5, count 2
        reviews.save(new ShelterReview(userShelter.getId(), 1L, 4, "decent"));
        reviews.save(new ShelterReview(userShelter.getId(), 2L, 5, "great"));

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.id()).isEqualTo(userShelter.getId());
        assertThat(dto.name()).isEqualTo("User House");
        assertThat(dto.latitude()).isEqualTo(59.4);
        assertThat(dto.longitude()).isEqualTo(24.7);
        assertThat(dto.status()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(dto.source()).isEqualTo(ShelterSource.USER);
        assertThat(dto.averageRating()).isEqualTo(4.5);
        assertThat(dto.reviewCount()).isEqualTo(2);
        assertThat(dto.address()).isNull(); // lean projection — no address on this row
    }

    @Test
    void dtoWithoutReviewsHasNullAverageAndZeroCount() {
        ShelterDto dto = service.findById(registryShelter.getId()).orElseThrow();

        assertThat(dto.averageRating()).isNull();
        assertThat(dto.reviewCount()).isZero();
    }

    // ---------- trust derivations (shelter-trust-and-reports D1/D4/D5) ----------

    @Test
    void nonexistentReportsDefaultToZero() {
        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.nonexistentReports()).isZero();
        assertThat(dto.statusFlag()).isNull();
        assertThat(dto.occupancy()).isNull();
        assertThat(dto.yourOccupancyBand()).isNull();
    }

    @Test
    void nonexistentReportsCountOnlyThatType() {
        report(userShelter.getId(), 1L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 2L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 3L, ShelterReportType.WRONG_LOCATION);
        report(userShelter.getId(), 4L, ShelterReportType.OPEN_CONFIRMED);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.nonexistentReports()).isEqualTo(2);
        // confirmations without any closed report → no flag (both sides must be present)
        assertThat(dto.statusFlag()).isNull();
    }

    @Test
    void closedWithoutAnyConfirmationIsReportedClosed() {
        // the spec scenario: 2 CLOSED, 0 OPEN_CONFIRMED → "Reported closed"
        report(userShelter.getId(), 1L, ShelterReportType.CLOSED);
        report(userShelter.getId(), 2L, ShelterReportType.CLOSED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().statusFlag())
                .isEqualTo(ShelterStatusFlag.REPORTED_CLOSED);
    }

    @Test
    void moreClosedThanConfirmedFlipsToReportedClosed() {
        report(userShelter.getId(), 1L, ShelterReportType.CLOSED);
        report(userShelter.getId(), 2L, ShelterReportType.CLOSED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().statusFlag())
                .isEqualTo(ShelterStatusFlag.REPORTED_CLOSED);
    }

    @Test
    void confirmedAtLeastClosedFlipsToConfirmedOpen() {
        report(userShelter.getId(), 1L, ShelterReportType.CLOSED);
        report(userShelter.getId(), 2L, ShelterReportType.CLOSED);
        report(userShelter.getId(), 3L, ShelterReportType.OPEN_CONFIRMED);
        report(userShelter.getId(), 4L, ShelterReportType.OPEN_CONFIRMED);
        report(userShelter.getId(), 5L, ShelterReportType.OPEN_CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().statusFlag())
                .isEqualTo(ShelterStatusFlag.CONFIRMED_OPEN);
    }

    @Test
    void tiedClosedAndConfirmedIsConfirmedOpen() {
        report(userShelter.getId(), 1L, ShelterReportType.CLOSED);
        report(userShelter.getId(), 2L, ShelterReportType.OPEN_CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().statusFlag())
                .isEqualTo(ShelterStatusFlag.CONFIRMED_OPEN);
    }

    @Test
    void onlyOpenConfirmedWithoutClosedIsNoFlag() {
        report(userShelter.getId(), 1L, ShelterReportType.OPEN_CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().statusFlag()).isNull();
    }

    @Test
    void loneFreshOccupancyReportIsHedgedWithCountOne() {
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), 1L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(12))));

        ShelterDto.Occupancy block = service.findById(userShelter.getId()).orElseThrow().occupancy();

        assertThat(block).isNotNull();
        assertThat(block.band()).isEqualTo(OccupancyBand.FULL);
        assertThat(block.reportCount()).isEqualTo(1); // the UI hedges at 1
        assertThat(block.lastReportedAt()).isEqualTo(NOW.minus(Duration.ofMinutes(12)));
    }

    @Test
    void agreeingFreshReportsFirmUpWithTheLatestTime() {
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), 1L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(30))));
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), 2L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(12))));

        ShelterDto.Occupancy block = service.findById(userShelter.getId()).orElseThrow().occupancy();

        assertThat(block.band()).isEqualTo(OccupancyBand.FULL);
        assertThat(block.reportCount()).isEqualTo(2); // firm
        assertThat(block.lastReportedAt()).isEqualTo(NOW.minus(Duration.ofMinutes(12)));
    }

    @Test
    void theLatestBandWinsAndOnlyAgreeingReportsCount() {
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), 1L, OccupancyBand.FULL, NOW.minus(Duration.ofMinutes(30))));
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), 2L, OccupancyBand.SPACE, NOW.minus(Duration.ofMinutes(5))));

        ShelterDto.Occupancy block = service.findById(userShelter.getId()).orElseThrow().occupancy();

        assertThat(block.band()).isEqualTo(OccupancyBand.SPACE);
        assertThat(block.reportCount()).isEqualTo(1); // only the latest agrees with itself
    }

    @Test
    void staleOccupancyDisappears() {
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), 1L, OccupancyBand.FULL, NOW.minus(Duration.ofHours(3))));

        assertThat(service.findById(userShelter.getId()).orElseThrow().occupancy()).isNull();
    }

    @Test
    void detailCarriesTheCallersOwnBandAndListDoesNot() {
        long reporterId = saveUser("Mari", "mari@example.ee", true);
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), reporterId, OccupancyBand.GETTING_FULL, NOW.minus(Duration.ofMinutes(1))));

        // detail for the reporter: their live band (even though it alone is fresh)
        assertThat(service.findById(userShelter.getId(), users.findById(reporterId)).orElseThrow()
                .yourOccupancyBand()).isEqualTo(OccupancyBand.GETTING_FULL);
        // the same read for another user / nobody: null
        assertThat(service.findById(userShelter.getId(), users.findById(saveUser("Jaan", "jaan@example.ee", true)))
                .orElseThrow().yourOccupancyBand()).isNull();
        assertThat(service.findById(userShelter.getId()).orElseThrow().yourOccupancyBand()).isNull();
        // the list projection never carries it (detail-only field)
        assertThat(service.findAll(ShelterSourceFilter.USER, null, null, null, null).get(0).yourOccupancyBand())
                .isNull();
    }

    @Test
    void reviewedFilterKeepsOnlySheltersWithVisibleReviews() {
        reviews.save(new ShelterReview(userShelter.getId(), 1L, 4, "hea"));
        long hiddenOnly = save("Peidetud arvustus", ShelterSource.USER).getId();
        ShelterReview hidden = new ShelterReview(hiddenOnly, 2L, 5, "peideta mind");
        hidden.markHidden(NOW);
        reviews.save(hidden);

        List<ShelterDto> reviewed = service.findAll(ShelterSourceFilter.ALL, true, null, null, null);

        assertThat(reviewed).extracting(ShelterDto::name).containsExactly("User House");

        // the negation keeps the unreviewed ones
        List<ShelterDto> unreviewed = service.findAll(ShelterSourceFilter.ALL, false, null, null, null);
        assertThat(unreviewed).extracting(ShelterDto::name)
                .containsExactlyInAnyOrder("Peidetud arvustus", "Paasteamet House", "City House");
    }

    @Test
    void minRatingFilterNeverMatchesReviewlessShelters() {
        reviews.save(new ShelterReview(userShelter.getId(), 1L, 5, ""));
        long lower = save("Madalam", ShelterSource.USER).getId();
        reviews.save(new ShelterReview(lower, 2L, 3, ""));

        List<ShelterDto> atLeastFour = service.findAll(ShelterSourceFilter.ALL, null, 4, null, null);

        assertThat(atLeastFour).extracting(ShelterDto::name).containsExactly("User House");

        // exactly at the bar still matches
        List<ShelterDto> atLeastThree = service.findAll(ShelterSourceFilter.ALL, null, 3, null, null);
        assertThat(atLeastThree).extracting(ShelterDto::name)
                .containsExactlyInAnyOrder("User House", "Madalam");
    }

    @Test
    void hasCapacityFilterKeepsSheltersWithCapacityData() {
        Shelter withCapacity = new Shelter("Mahupolu varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 40);
        shelters.save(withCapacity);

        List<ShelterDto> withCap = service.findAll(ShelterSourceFilter.ALL, null, null, true, null);

        assertThat(withCap).extracting(ShelterDto::name).containsExactly("Mahupolu varjend");

        List<ShelterDto> withoutCap = service.findAll(ShelterSourceFilter.ALL, null, null, false, null);
        assertThat(withoutCap).extracting(ShelterDto::name).doesNotContain("Mahupolu varjend");
    }

    @Test
    void trustFiltersComposeWithTheSourceFilter() {
        // USER + reviewed + ≥ 4 + capacity: only this row qualifies — the
        // other USER rows miss one filter each (no review / no capacity)
        Shelter qualified = new Shelter("Kvalifitseeritud", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 40);
        shelters.save(qualified);
        reviews.save(new ShelterReview(qualified.getId(), 1L, 5, ""));
        Shelter unreviewed = new Shelter("Ilma Arvustuseta", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 10);
        shelters.save(unreviewed);

        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.USER, true, 4, true, null);

        assertThat(dtos).extracting(ShelterDto::name).containsExactly("Kvalifitseeritud");
    }

    @Test
    void findByIdMissingShelterReturnsEmpty() {
        assertThat(service.findById(999_999L)).isEmpty();
    }

    @Test
    void findByCreatedByReturnsOnlyThatAuthorsSheltersAsDtos() {
        userShelter.setCreatedBy(1L);
        Shelter other = save("Other User House", ShelterSource.USER);
        other.setCreatedBy(2L);

        List<ShelterDto> dtos = service.findByCreatedBy(1L);

        assertThat(dtos).extracting(ShelterDto::name).containsExactly("User House");
        assertThat(dtos).extracting(ShelterDto::source).containsOnly(ShelterSource.USER);
    }

    @Test
    void findByCreatedByReturnsEmptyWhenTheUserHasNoShelters() {
        assertThat(service.findByCreatedBy(99L)).isEmpty();
    }

    @Test
    void registryShelterHasSubmitterVerifiedFalse() {
        ShelterDto dto = service.findById(registryShelter.getId()).orElseThrow();

        assertThat(dto.submitterVerified()).isFalse();
    }

    @Test
    void verifiedCreatorGetsSubmitterVerifiedTrue() {
        userShelter.setCreatedBy(saveUser("Mari", "mari@example.ee", true));

        assertThat(service.findById(userShelter.getId()).orElseThrow().submitterVerified()).isTrue();
    }

    @Test
    void unverifiedCreatorGetsSubmitterVerifiedFalse() {
        userShelter.setCreatedBy(saveUser("Priit", "priit@example.ee", false));

        assertThat(service.findById(userShelter.getId()).orElseThrow().submitterVerified()).isFalse();
    }

    @Test
    void missingCreatorRowGetsSubmitterVerifiedFalse() {
        userShelter.setCreatedBy(99L); // author id present but no such user row

        assertThat(service.findById(userShelter.getId()).orElseThrow().submitterVerified()).isFalse();
    }

    @Test
    void twoVerifiedCreatorsAreBothTrueInOneListing() {
        // pins the batch map, not just the first creator
        userShelter.setCreatedBy(saveUser("Mari", "mari@example.ee", true));
        Shelter second = save("Second User House", ShelterSource.USER);
        second.setCreatedBy(saveUser("Jaan", "jaan@example.ee", true));

        Map<String, Boolean> byName = service.findAll(ShelterSourceFilter.USER, null, null, null, null).stream()
                .collect(Collectors.toMap(ShelterDto::name, ShelterDto::submitterVerified));

        assertThat(byName).containsEntry("User House", true)
                .containsEntry("Second User House", true);
    }

    @Test
    void dtoNeverLeaksTheEntity() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL, null, null, null, null);
        // the returned objects are records (DTOs), not the domain Shelter
        assertThat(dtos).allMatch(dto -> dto instanceof ShelterDto);
        // and the repo still holds exactly the domain entities
        assertThat(shelters.findAll()).hasSize(3);
    }

    // ---------- last-verified meta (last-verified-meta M8) ----------

    @Test
    void reportCountSumsAllReportTypes() {
        report(userShelter.getId(), 1L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 2L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 3L, ShelterReportType.CLOSED);
        report(userShelter.getId(), 4L, ShelterReportType.OPEN_CONFIRMED);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.reportCount()).isEqualTo(4);
        assertThat(dto.nonexistentReports()).isEqualTo(2); // the subset stays correct
    }

    @Test
    void noReportsMeansZeroReportCountAndNoVerificationStamp() {
        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.reportCount()).isZero();
        assertThat(dto.lastVerifiedAt()).isNull();
    }

    @Test
    void registryRowCarriesTheNewestVerifyingImport() {
        Instant okAt = NOW.minus(Duration.ofDays(1));
        Instant failedAt = NOW.minus(Duration.ofHours(12));
        Instant notModifiedAt = NOW.minus(Duration.ofHours(1));
        importLog.record(InMemoryDataImportLog.row("PAASETEAMET", okAt, "OK"));
        importLog.record(InMemoryDataImportLog.row("PAASETEAMET", failedAt, "FAILED"));
        importLog.record(InMemoryDataImportLog.row("PAASETEAMET", notModifiedAt, "NOT_MODIFIED"));

        ShelterDto dto = service.findById(registryShelter.getId()).orElseThrow();

        // the FAILED run is skipped; the 304 re-check (NOT_MODIFIED) verifies
        assertThat(dto.lastVerifiedAt()).isEqualTo(notModifiedAt);
    }

    @Test
    void registryRowWithoutAVerifiedImportStaysUnverified() {
        importLog.record(InMemoryDataImportLog.row("PAASETEAMET", NOW.minus(Duration.ofHours(2)), "FAILED"));
        importLog.record(InMemoryDataImportLog.row("PAASETEAMET", NOW.minus(Duration.ofHours(1)), "SKIPPED"));
        importLog.record(InMemoryDataImportLog.row("MUNICIPALITY", NOW.minus(Duration.ofDays(3)), "OK"));

        // FAILED/SKIPPED verify nothing — the Paasteamet row is unverified…
        assertThat(service.findById(registryShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
        // …while the partner row carries its OWN source's newest OK run
        assertThat(service.findById(municipalityShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW.minus(Duration.ofDays(3)));
    }

    @Test
    void communityReportsNeverDateStampRegistryRows() {
        reportAt(registryShelter.getId(), 1L, ShelterReportType.OPEN_CONFIRMED,
                NOW.minus(Duration.ofHours(1)));

        assertThat(service.findById(registryShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
    }

    @Test
    void unconfirmedCommunityRowIsUnverified() {
        userShelter.setCreatedBy(1L);

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
    }

    @Test
    void nonSubmitterOpenConfirmedVerifiesTheRow() {
        userShelter.setCreatedBy(1L);
        reportAt(userShelter.getId(), 2L, ShelterReportType.OPEN_CONFIRMED,
                NOW.minus(Duration.ofHours(3)));

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW.minus(Duration.ofHours(3)));
    }

    @Test
    void theSubmittersOwnOpenConfirmedNeverVerifies() {
        userShelter.setCreatedBy(1L);
        reportAt(userShelter.getId(), 1L, ShelterReportType.OPEN_CONFIRMED,
                NOW.minus(Duration.ofHours(3)));

        // a self-confirm is not a verification (the auto-confirm rule)
        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
    }

    @Test
    void aLegacyUnclaimedRowAcceptsAnyReportersConfirmation() {
        // createdById stays null — the auto-confirm "unclaimed" precedent
        reportAt(userShelter.getId(), 2L, ShelterReportType.OPEN_CONFIRMED,
                NOW.minus(Duration.ofDays(1)));

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW.minus(Duration.ofDays(1)));
    }

    @Test
    void theNewestOfCommunityCheckAndAdminConfirmWins() {
        userShelter.setCreatedBy(1L);
        reportAt(userShelter.getId(), 2L, ShelterReportType.OPEN_CONFIRMED,
                NOW.minus(Duration.ofDays(2)));
        // the fixed audit clock stamps NOW — later than the report
        audit.record(userShelter.getId(), 9L, ModerationAuditLog.Action.CONFIRM, null,
                ReviewStatus.NEW, ReviewStatus.CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW);
    }

    @Test
    void aStaleAdminConfirmAloneVerifiesUntilACommunityCheckSupersedes() {
        userShelter.setCreatedBy(1L);
        // the fixed audit clock stamps NOW; a later community check wins
        audit.record(userShelter.getId(), 9L, ModerationAuditLog.Action.CONFIRM, null,
                ReviewStatus.NEW, ReviewStatus.CONFIRMED);
        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW);
        reportAt(userShelter.getId(), 2L, ShelterReportType.OPEN_CONFIRMED,
                NOW.plus(Duration.ofHours(1)));
        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW.plus(Duration.ofHours(1)));
    }

    @Test
    void nonConfirmingAuditActionsNeverVerify() {
        userShelter.setCreatedBy(1L);
        audit.record(userShelter.getId(), 9L, ModerationAuditLog.Action.REJECT, null,
                ReviewStatus.NEW, ReviewStatus.REJECTED);
        audit.record(userShelter.getId(), 9L, ModerationAuditLog.Action.REPORT_DISMISS, null,
                ReviewStatus.CONFIRMED, ReviewStatus.CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
    }
}
