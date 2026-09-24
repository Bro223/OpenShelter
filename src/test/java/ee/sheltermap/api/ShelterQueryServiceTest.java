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
import ee.sheltermap.domain.BoundingBox;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterOpenStatusReport;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
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

import static ee.sheltermap.domain.Provenance.COMMUNITY_REPORTED;
import static ee.sheltermap.domain.Provenance.OFFICIAL;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the read side of the shelter API: source-filter mapping
 * (REGISTRY/USER/ALL → repository source sets), DTO mapping that never leaks
 * the entity, and the trust-layer
 * derivations (shelter-trust-and-reports): report counts, the
 * fresh open/closed block, the fresh occupancy block, the ACTIVE-only
 * public list and the in-memory trust filters.
 */
class ShelterQueryServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-11T12:00:00Z");
    private static final Clock FIXED = Clock.fixed(NOW, ZoneOffset.UTC);

    private InMemoryShelterRepository shelters;
    private InMemoryUserRepository users;
    private InMemoryShelterReportRepository reports;
    private InMemoryShelterOccupancyRepository occupancy;
    private InMemoryShelterOpenStatusRepository openStatus;
    private InMemoryDataImportLog importLog;
    private InMemoryModerationAuditLog audit;
    private InMemoryShelterInfoRequestLog infoRequests;
    private ShelterQueryService service;

    private Shelter userShelter;
    private Shelter registryShelter;
    private Shelter municipalityShelter;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        users = new InMemoryUserRepository();
        reports = new InMemoryShelterReportRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        openStatus = new InMemoryShelterOpenStatusRepository();
        importLog = new InMemoryDataImportLog();
        audit = new InMemoryModerationAuditLog(FIXED);
        infoRequests = new InMemoryShelterInfoRequestLog(FIXED);
        service = new ShelterQueryService(shelters, users, reports, occupancy,
                openStatus, importLog, audit,
                new ReporterTrustEvaluator(shelters, audit),
                infoRequests, FIXED);

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
        reports.save(new ShelterReport(shelterId, userId, type, null, NOW));
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
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.USER, null, null);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactly("User House");
        assertThat(dtos).extracting(ShelterDto::source)
                .containsOnly(ShelterSource.USER);
    }

    @Test
    void filterRegistryReturnsOnlyImportedRows() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.REGISTRY, null, null);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactlyInAnyOrder("Paasteamet House", "City House");
        assertThat(dtos).extracting(ShelterDto::source)
                .containsOnly(ShelterSource.PAASETEAMET, ShelterSource.MUNICIPALITY);
    }

    @Test
    void filterAllReturnsEverything() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL, null, null);

        assertThat(dtos).hasSize(3);
    }

    @Test
    void publicListExcludesInactiveSheltersButMineKeepsThem() {
        Shelter hidden = save("Peidetud varjend", ShelterSource.USER);
        hidden.setStatus(ShelterStatus.INACTIVE);
        shelters.save(hidden);
        hidden.setCreatedBy(7L);

        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null))
                .extracting(ShelterDto::name)
                .doesNotContain("Peidetud varjend");
        // the owner list keeps hidden rows and carries their derived state
        ShelterDto mine = service.findByCreatedBy(7L).get(0);
        assertThat(mine.name()).isEqualTo("Peidetud varjend");
        assertThat(mine.status()).isEqualTo(ShelterStatus.INACTIVE);
    }

    // ---------- trust derivations (shelter-trust-and-reports) ----------

    @Test
    void nonexistentReportsDefaultToZero() {
        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.nonexistentReports()).isZero();
        assertThat(dto.openStatus()).isNull();
        assertThat(dto.occupancy()).isNull();
        assertThat(dto.yourOccupancyBand()).isNull();
        assertThat(dto.yourOpenStatus()).isNull();
    }

    @Test
    void nonexistentReportsCountOnlyThatType() {
        report(userShelter.getId(), 1L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 2L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 3L, ShelterReportType.WRONG_LOCATION);
        report(userShelter.getId(), 4L, ShelterReportType.OPEN_CONFIRMED);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.nonexistentReports()).isEqualTo(2);
    }

    @Test
    void aDismissedReportCountsNothingInTheDisplayedCounts() {
        report(userShelter.getId(), 1L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 2L, ShelterReportType.NON_EXISTENT);
        report(userShelter.getId(), 3L, ShelterReportType.CLOSED);
        // the admin judged the CLOSED report invalid: it stops counting
        reports.findByShelterId(userShelter.getId()).stream()
                .filter(r -> r.getType() == ShelterReportType.CLOSED)
                .findFirst().orElseThrow()
                .markDismissed(NOW);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.nonexistentReports()).isEqualTo(2);
        // the dismissed report is excluded from the total as well
        assertThat(dto.reportCount()).isEqualTo(2);
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

    // ---------- live open/closed block (same level as capacity) ----------

    @Test
    void loneFreshOpenStatusTapIsDisplayed() {
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(12))));

        ShelterDto.OpenStatus block = service.findById(userShelter.getId()).orElseThrow().openStatus();

        assertThat(block).isNotNull();
        assertThat(block.state()).isEqualTo("OPEN");
        assertThat(block.reportCount()).isEqualTo(1);
        assertThat(block.reportedAt()).isEqualTo(NOW.minus(Duration.ofMinutes(12)));
    }

    @Test
    void theLatestOpenStatusTapWinsAndOnlyAgreeingTapsCount() {
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(30))));
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 2L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(20))));
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 3L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(5))));

        ShelterDto.OpenStatus block = service.findById(userShelter.getId()).orElseThrow().openStatus();

        assertThat(block.state()).isEqualTo("CLOSED");
        assertThat(block.reportCount()).isEqualTo(1); // only the latest agrees with itself
        assertThat(block.reportedAt()).isEqualTo(NOW.minus(Duration.ofMinutes(5)));
    }

    @Test
    void agreeingFreshTapsAreCountedAgainstTheWinningState() {
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 1L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(30))));
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 2L, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(25))));
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 3L, OpenStatusState.OPEN, NOW.minus(Duration.ofMinutes(12))));

        ShelterDto.OpenStatus block = service.findById(userShelter.getId()).orElseThrow().openStatus();

        assertThat(block.state()).isEqualTo("OPEN"); // the latest tap wins
        assertThat(block.reportCount()).isEqualTo(2); // the two OPEN taps agree
        assertThat(block.reportedAt()).isEqualTo(NOW.minus(Duration.ofMinutes(12)));
    }

    @Test
    void staleOpenStatusDisappears() {
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), 1L, OpenStatusState.OPEN, NOW.minus(Duration.ofHours(3))));

        assertThat(service.findById(userShelter.getId()).orElseThrow().openStatus()).isNull();
    }

    @Test
    void detailCarriesTheCallersOwnOpenStatusAndListDoesNot() {
        long reporterId = saveUser("Mari", "mari@example.ee", true);
        openStatus.save(new ShelterOpenStatusReport(
                userShelter.getId(), reporterId, OpenStatusState.CLOSED, NOW.minus(Duration.ofMinutes(1))));

        // detail for the reporter: their live state
        assertThat(service.findById(userShelter.getId(), reporterId).orElseThrow()
                .yourOpenStatus()).isEqualTo("CLOSED");
        // the same read for another user / nobody: null
        assertThat(service.findById(userShelter.getId(), saveUser("Jaan", "jaan@example.ee", true))
                .orElseThrow().yourOpenStatus()).isNull();
        assertThat(service.findById(userShelter.getId()).orElseThrow().yourOpenStatus()).isNull();
        // the list projection never carries it (detail-only field)
        assertThat(service.findAll(ShelterSourceFilter.USER, null, null).get(0).yourOpenStatus())
                .isNull();
    }

    @Test
    void detailCarriesTheCallersOwnBandAndListDoesNot() {
        long reporterId = saveUser("Mari", "mari@example.ee", true);
        occupancy.save(new ShelterOccupancyReport(
                userShelter.getId(), reporterId, OccupancyBand.GETTING_FULL, NOW.minus(Duration.ofMinutes(1))));

        // detail for the reporter: their live band (even though it alone is fresh)
        assertThat(service.findById(userShelter.getId(), reporterId).orElseThrow()
                .yourOccupancyBand()).isEqualTo(OccupancyBand.GETTING_FULL);
        // the same read for another user / nobody: null
        assertThat(service.findById(userShelter.getId(), saveUser("Jaan", "jaan@example.ee", true))
                .orElseThrow().yourOccupancyBand()).isNull();
        assertThat(service.findById(userShelter.getId()).orElseThrow().yourOccupancyBand()).isNull();
        // the list projection never carries it (detail-only field)
        assertThat(service.findAll(ShelterSourceFilter.USER, null, null).get(0).yourOccupancyBand())
                .isNull();
    }

    @Test
    void hasCapacityFilterKeepsSheltersWithCapacityData() {
        Shelter withCapacity = new Shelter("Mahupolu varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 40);
        shelters.save(withCapacity);

        List<ShelterDto> withCap = service.findAll(ShelterSourceFilter.ALL, true, null);

        assertThat(withCap).extracting(ShelterDto::name).containsExactly("Mahupolu varjend");

        List<ShelterDto> withoutCap = service.findAll(ShelterSourceFilter.ALL, false, null);
        assertThat(withoutCap).extracting(ShelterDto::name).doesNotContain("Mahupolu varjend");
    }

    @Test
    void trustFiltersComposeWithTheSourceFilter() {
        // USER + capacity: only the capacity row qualifies — the other USER
        // row has no capacity data.
        Shelter qualified = new Shelter("Kvalifitseeritud", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 40);
        shelters.save(qualified);
        Shelter without = new Shelter("Ilma Mahtuta", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, null);
        shelters.save(without);

        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.USER, true, null);

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

    // ---------- information request on the /mine projection ----------

    @Test
    void theMineProjectionCarriesTheInfoRequestButThePublicReadsDoNot() {
        long authorId = saveUser("Mari", "mari@example.ee", true);
        userShelter.setCreatedBy(authorId);
        infoRequests.request(userShelter.getId(), "Kas varjend on avatud?", 9L);

        ShelterDto mine = service.findByCreatedBy(authorId).get(0);
        assertThat(mine.infoRequest()).isNotNull();
        assertThat(mine.infoRequest().message()).isEqualTo("Kas varjend on avatud?");
        assertThat(mine.infoRequest().requestedAt()).isEqualTo(NOW);
        assertThat(mine.infoRequest().replyMessage()).isNull();

        // The exchange is private between the admin and the author — it must
        // not leak on the public list or the detail read.
        ShelterDto publicRow = service.findAll(ShelterSourceFilter.ALL, null, null)
                .stream().filter(dto -> dto.id().equals(userShelter.getId())).findFirst().orElseThrow();
        assertThat(publicRow.infoRequest()).isNull();
        assertThat(service.findById(userShelter.getId()).orElseThrow().infoRequest()).isNull();
    }

    @Test
    void theMineProjectionShowsTheReplyOnceAnswered() {
        long authorId = saveUser("Priit", "priit@example.ee", true);
        userShelter.setCreatedBy(authorId);
        infoRequests.request(userShelter.getId(), "Kas varjend on avatud?", 9L);
        infoRequests.reply(userShelter.getId(), "Jah, avatud on.", authorId);

        ShelterDto mine = service.findByCreatedBy(authorId).get(0);
        assertThat(mine.infoRequest().replyMessage()).isEqualTo("Jah, avatud on.");
        assertThat(mine.infoRequest().repliedAt()).isEqualTo(NOW);
    }

    @Test
    void aRowWithoutARequestCarriesNullInfoRequest() {
        long authorId = saveUser("Kaja", "kaja@example.ee", true);
        userShelter.setCreatedBy(authorId);

        ShelterDto mine = service.findByCreatedBy(authorId).get(0);

        assertThat(mine.infoRequest()).isNull();
    }

    @Test
    void registryShelterHasSubmitterVerifiedFalse() {
        ShelterDto dto = service.findById(registryShelter.getId()).orElseThrow();

        assertThat(dto.submitterVerified()).isFalse();
        // No author at all — nothing to describe, so the depth is absent.
        assertThat(dto.submitterVerification()).isNull();
    }

    @Test
    void verifiedCreatorGetsSubmitterVerifiedTrue() {
        // The PRE-V31 shape (the fixture leaves submitterVerifiedAtCreation
        // null): the standing is live-derived from the author — a row stays
        // exactly as it always read until the V31 snapshot column is written.
        userShelter.setCreatedBy(saveUser("Mari", "mari@example.ee", true));

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();
        assertThat(dto.submitterVerified()).isTrue();
        // The fixture confirms the E-MAIL channel only: one channel is the
        // PARTIAL tier, and the depth names which channel it is.
        assertThat(dto.submitterVerification()).isEqualTo(SubmitterVerification.EMAIL);
    }

    @Test
    void theInaccurateCountSumsWrongLocationAndOtherExcludingDismissed() {
        // report semantics: the "inaccurate information" count is the
        // open WRONG_LOCATION + OTHER reports — the community "the data is
        // wrong" kinds. NON_EXISTENT keeps its own count, and a dismissed
        // report stops counting in EVERY count (the admin's invalid verdict
        // is the dismissal, the batched per-type counts exclude it).
        report(userShelter.getId(), 1L, ShelterReportType.WRONG_LOCATION);
        report(userShelter.getId(), 2L, ShelterReportType.OTHER);
        report(userShelter.getId(), 3L, ShelterReportType.NON_EXISTENT);
        ShelterReport dismissed = new ShelterReport(userShelter.getId(), 4L,
                ShelterReportType.WRONG_LOCATION, null, NOW);
        dismissed.markDismissed(NOW);
        reports.save(dismissed);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.nonexistentReports()).isEqualTo(1);
        assertThat(dto.inaccurateReports()).isEqualTo(2); // 1 WRONG_LOCATION + 1 OTHER; the dismissed one excluded
    }

    @Test
    void theDepthUpgradesWhenTheAuthorConfirmsASecondChannel() {
        // A row submitted at 1/2 verification...
        RegisteredUser author = new RegisteredUser("Mari", "mari@example.ee", "+3725550001");
        author.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp",
                "mari@example.ee", NOW));
        users.save(author);
        userShelter.setCreatedBy(author.getId());

        assertThat(service.findById(userShelter.getId()).orElseThrow().submitterVerification())
                .isEqualTo(SubmitterVerification.EMAIL);

        // ...must read as FULL once the SAME author confirms the second
        // channel, with nothing rewritten on the shelter: the depth is derived
        // per read, never stored on the row (the owner's requirement).
        author.addVerification(new VerificationClaim(VerificationLevel.PHONE, "sms",
                "+3725550001", NOW));
        users.save(author);

        assertThat(service.findById(userShelter.getId()).orElseThrow().submitterVerification())
                .isEqualTo(SubmitterVerification.FULL);
    }

    @Test
    void unverifiedCreatorGetsSubmitterVerifiedFalse() {
        userShelter.setCreatedBy(saveUser("Priit", "priit@example.ee", false));

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();
        assertThat(dto.submitterVerified()).isFalse();
        assertThat(dto.submitterVerification()).isNull();
    }

    @Test
    void missingCreatorRowGetsSubmitterVerifiedFalse() {
        userShelter.setCreatedBy(99L); // author id present but no such user row

        assertThat(service.findById(userShelter.getId()).orElseThrow().submitterVerified()).isFalse();
    }

    @Test
    void deletedCreatorRendersAtTheUnverifiedLevel() {
        // Erasure-trust guard: a USER row whose author row is gone (the
        // ON DELETE SET NULL orphan, or a dangling pre-V7 id) renders at the
        // UNVERIFIED level — the flag is false, the depth (the cue behind the
        // "verified yellow" marker) is absent, and the provenance is the
        // ordinary community value, never the registry/partner standing.
        //
        // backfill boundary: this is the PRE-V31 shape (the snapshot
        // column is null on the fixture), so the read falls back to the live
        // author and an orphaned pre-existing row resolves UNVERIFIED.
        // Backfilling those rows is an explicit OWNER DECISION left open by
        // the plan — the write-time standing is no longer recoverable from
        // the row, so no backfill is implemented; when it is approved it is
        // a one-line UPDATE against submitter_verified_at_creation and only
        // the backfilled rows change behaviour.
        userShelter.setCreatedBy(99L); // author id present but no such user row

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.submitterVerified()).isFalse();
        assertThat(dto.submitterVerification()).isNull();
        // USER + CONFIRMED (the fixture default) is the plain community value.
        assertThat(dto.provenance()).isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void theV31SnapshotSurvivesAuthorErasure() {
        // part 2 (the erasure fix): a row written after V31 carries the
        // submitter's standing AS AT WRITE TIME. Account erasure NULLs
        // created_by (V7 ON DELETE SET NULL) and the live derivation dies
        // with the author — the snapshot must survive it, so the row keeps
        // its verified marker. The DEPTH stays live-derived (the claim set
        // is re-read per request), so it is absent without the author, and
        // the provenance is untouched (trust flag, not standing).
        userShelter.setCreatedBy(99L); // the author row is gone (erasure)
        userShelter.setSubmitterVerifiedAtCreation(Boolean.TRUE);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.submitterVerified()).isTrue();
        assertThat(dto.submitterVerification()).isNull();
        assertThat(dto.provenance()).isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void aFalseSnapshotWinsOverTheLiveVerifiedAuthor() {
        // The snapshot is THE answer when present — even when the live
        // author still reads as verified (they may have confirmed a channel
        // AFTER the write). A row written by an unverified submitter stays
        // unverified; upgrading it is a re-review decision, not a read side
        // effect. (The inverse — snapshot null with a live verified author
        // deriving true — is the pre-V31 fallback, pinned by
        // verifiedCreatorGetsSubmitterVerifiedTrue, whose fixture leaves the
        // snapshot null.)
        userShelter.setCreatedBy(saveUser("Mari", "mari@example.ee", true));
        userShelter.setSubmitterVerifiedAtCreation(Boolean.FALSE);

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.submitterVerified()).isFalse();
        // The live depth still renders — only the boolean is snapshotted.
        assertThat(dto.submitterVerification()).isEqualTo(SubmitterVerification.EMAIL);
    }

    @Test
    void registryRowKeepsOfficialProvenanceWithNoCreator() {
        // Scoping guard: registry rows have NO creator by nature, and the
        // absent-author -> unverified rule must NOT strip their standing. The
        // official tone comes from the row's own source-derived provenance,
        // never from the submitterVerified flag.
        ShelterDto dto = service.findById(registryShelter.getId()).orElseThrow();

        assertThat(dto.provenance()).isEqualTo(OFFICIAL);
        // The submitter fields stay unverified for the no-author case — the
        // OFFICIAL standing is provenance, not submitterVerified.
        assertThat(dto.submitterVerified()).isFalse();
        assertThat(dto.submitterVerification()).isNull();
    }

    @Test
    void twoVerifiedCreatorsAreBothTrueInOneListing() {
        // pins the batch map, not just the first creator
        userShelter.setCreatedBy(saveUser("Mari", "mari@example.ee", true));
        Shelter second = save("Second User House", ShelterSource.USER);
        second.setCreatedBy(saveUser("Jaan", "jaan@example.ee", true));

        Map<String, Boolean> byName = service.findAll(ShelterSourceFilter.USER, null, null).stream()
                .collect(Collectors.toMap(ShelterDto::name, ShelterDto::submitterVerified));

        assertThat(byName).containsEntry("User House", true)
                .containsEntry("Second User House", true);
    }

    @Test
    void dtoNeverLeaksTheEntity() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL, null, null);
        // the returned objects are records (DTOs), not the domain Shelter
        assertThat(dtos).allMatch(dto -> dto instanceof ShelterDto);
        // and the repo still holds exactly the domain entities
        assertThat(shelters.findAll()).hasSize(3);
    }

    // ---------- last-verified meta (last-verified-meta) ----------

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
        audit.record(userShelter.getId(), null, 9L, ModerationAuditLog.Action.CONFIRM, null,
                ReviewStatus.NEW, ReviewStatus.CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW);
    }

    @Test
    void aStaleAdminConfirmAloneVerifiesUntilACommunityCheckSupersedes() {
        userShelter.setCreatedBy(1L);
        // the fixed audit clock stamps NOW; a later community check wins
        audit.record(userShelter.getId(), null, 9L, ModerationAuditLog.Action.CONFIRM, null,
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
        audit.record(userShelter.getId(), null, 9L, ModerationAuditLog.Action.REJECT, null,
                ReviewStatus.NEW, ReviewStatus.REJECTED);
        audit.record(userShelter.getId(), null, 9L, ModerationAuditLog.Action.REPORT_DISMISS, null,
                ReviewStatus.CONFIRMED, ReviewStatus.CONFIRMED);

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
    }

    @Test
    void aDismissedOpenConfirmedReportStopsVerifyingTheRow() {
        userShelter.setCreatedBy(1L);
        ShelterReport confirmation = new ShelterReport(userShelter.getId(), 2L,
                ShelterReportType.OPEN_CONFIRMED, null, NOW.minus(Duration.ofHours(3)));
        reports.save(confirmation);
        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt())
                .isEqualTo(NOW.minus(Duration.ofHours(3)));

        // The admin's dismissal is the invalid verdict: the report stops
        // influencing anything — the "Last verified" stamp included.
        confirmation.markDismissed(NOW);
        reports.save(confirmation);

        assertThat(service.findById(userShelter.getId()).orElseThrow().lastVerifiedAt()).isNull();
    }

    // ---------- viewport + paging (shelter-bbox-paging) ----------

    /** A fixture row at explicit coordinates (the default fixtures sit at (59.4, 24.7)). */
    private Shelter saveAt(String name, ShelterSource source, double lat, double lng) {
        Shelter shelter = new Shelter(name, new GeoPoint(lat, lng), ShelterStatus.ACTIVE,
                "ext-" + name, source);
        shelters.save(shelter);
        return shelter;
    }

    private static final BoundingBox BOX = new BoundingBox(57.999, 23.0, 59.2, 27.0);

    @Test
    void theViewportKeepsInsideRowsInclusivelyOfTheEdges() {
        // the fixture rows (59.4, 24.7) are outside the box
        saveAt("Sees", ShelterSource.USER, 58.5, 25.0);
        saveAt("Aarel", ShelterSource.USER, 57.999, 25.0); // exactly ON the minLat edge
        saveAt("Valjas", ShelterSource.USER, 57.9, 25.0);  // one leg outside

        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL, null, null, BOX, null, null);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactly("Sees", "Aarel"); // id-ascending, inclusive edge, outside excluded
    }

    @Test
    void theViewportCombinesWithTheSourceFilter() {
        saveAt("Kasutaja sees", ShelterSource.USER, 58.5, 25.0);
        saveAt("Reg sees", ShelterSource.PAASETEAMET, 58.6, 25.1);

        assertThat(service.findAll(ShelterSourceFilter.USER, null, null, BOX, null, null))
                .extracting(ShelterDto::name)
                .containsExactly("Kasutaja sees");
        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, BOX, null, null))
                .extracting(ShelterDto::name)
                .containsExactly("Kasutaja sees", "Reg sees");
    }

    @Test
    void limitAndOffsetSliceTheStableIdOrder() {
        // the fixture: three rows, ids in insertion order
        List<Long> allIds = service.findAll(ShelterSourceFilter.ALL, null, null, null, null, null)
                .stream().map(ShelterDto::id).toList();
        assertThat(allIds).hasSize(3);

        // limit truncates from the start, offset skips, the two compose
        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, 2, null))
                .extracting(ShelterDto::id).containsExactlyElementsOf(allIds.subList(0, 2));
        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, null, 1))
                .extracting(ShelterDto::id).containsExactlyElementsOf(allIds.subList(1, 3));
        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, 1, 1))
                .extracting(ShelterDto::id).containsExactly(allIds.get(1));
        // an offset past the end is an empty page, never an error
        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, 1, 3)).isEmpty();
        // deterministic over the stable id order — the same call twice, the same page
        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, 2, null))
                .extracting(ShelterDto::id)
                .isEqualTo(service.findAll(ShelterSourceFilter.ALL, null, null, null, 2, null)
                        .stream().map(ShelterDto::id).toList());
    }

    @Test
    void theTrustFiltersApplyBeforeTheSlice() {
        // the fixture rows have no capacity data; one capacity row joins LATER
        // (a higher id) — the filtered list's first row is NOT the unfiltered one
        Shelter withCap = new Shelter("Maht", new GeoPoint(58.5, 25.0), ShelterStatus.ACTIVE,
                null, ShelterSource.USER, null, null, null, null, null, null, 40);
        shelters.save(withCap);

        assertThat(service.findAll(ShelterSourceFilter.ALL, null, null, null, 1, null))
                .extracting(ShelterDto::name).doesNotContain("Maht");
        // the page of the FILTERED list: its first row, not the first row filtered out
        assertThat(service.findAll(ShelterSourceFilter.ALL, true, null, null, 1, null))
                .extracting(ShelterDto::name).containsExactly("Maht");
    }

    @Test
    void theBoundingBoxRecordSelfValidates() {
        // defense in depth — the API's friendly 400s come from the controller first
        assertThatThrownBy(() -> new BoundingBox(60.0, 23.0, 57.0, 27.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("minLat must be <= maxLat");
        assertThatThrownBy(() -> new BoundingBox(57.0, 23.0, 59.0, 190.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Longitude must be between -180 and 180");
        assertThatThrownBy(() -> new BoundingBox(Double.NaN, 23.0, 59.0, 27.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Bounding box coordinates must be finite numbers");
        // the containment is inclusive of the edges, like the SQL BETWEEN
        assertThat(BOX.contains(57.999, 27.0)).isTrue();
        assertThat(BOX.contains(57.998, 25.0)).isFalse();
    }
}
