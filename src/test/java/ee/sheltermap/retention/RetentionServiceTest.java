package ee.sheltermap.retention;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AccountService;
import ee.sheltermap.auth.InMemoryUserCredentialsRepository;
import ee.sheltermap.auth.MutableClock;
import ee.sheltermap.auth.StubPasswordHasher;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.Shelter;
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
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test for the retention prune (retention-pruning): the owner's
 * 24/24-month horizons, the admin carve-out, the erasure-reuse rule, and
 * the disabled-job no-op. Hand-written fakes only (the project has no
 * mocking framework); the run time is a fixed instant, no sleeping.
 */
class RetentionServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-16T03:30:00Z");
    private static final RetentionProperties ON =
            new RetentionProperties(true, 24, 24, "0 30 3 * * *", "Europe/Tallinn");
    private static final RetentionProperties OFF =
            new RetentionProperties(false, 24, 24, "0 30 3 * * *", "Europe/Tallinn");

    /** Calendar-month arithmetic — the same cut the service makes (UTC-anchored). */
    private static Instant monthsBefore(Instant from, long months) {
        return ZonedDateTime.ofInstant(from, ZoneOffset.UTC).minusMonths(months).toInstant();
    }

    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private InMemoryUserRepository users;
    private InMemoryShelterRepository shelters;
    private InMemoryModerationAuditLog audit;
    private InMemoryRetentionRunLog runLog;

    @BeforeEach
    void setUp() {
        users = new InMemoryUserRepository();
        shelters = new InMemoryShelterRepository();
        audit = new InMemoryModerationAuditLog(clock);
        runLog = new InMemoryRetentionRunLog();
    }

    private RetentionService service(RetentionProperties props, ShelterRepository shelterRepo) {
        AccountService accountService = new AccountService(users,
                new InMemoryUserCredentialsRepository(clock), new StubPasswordHasher(),
                shelterRepo, audit);
        return new RetentionService(props, users, accountService, audit, runLog);
    }

    private RegisteredUser saveUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+37250000000");
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, NOW));
        users.save(user);
        return user;
    }

    private Shelter saveShelter(String name, Long ownerId, LocationKind kind) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4370, 24.7536),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelter.setCreatedBy(ownerId);
        shelter.setLocationKind(kind);
        shelters.save(shelter);
        return shelter;
    }

    @Test
    void prunesTheAccountIdleBeyondTheHorizonAndKeepsTheOneInsideIt() {
        RegisteredUser idle25 = saveUser("Old", "old@example.ee");
        users.markActive(idle25.getId(), monthsBefore(NOW, 25));
        Shelter privateHome = saveShelter("Kodu", idle25.getId(), LocationKind.PRIVATE);
        Shelter publicShelter = saveShelter("Varjupaik", idle25.getId(), LocationKind.PUBLIC);
        RegisteredUser idle23 = saveUser("Fresh", "fresh@example.ee");
        users.markActive(idle23.getId(), monthsBefore(NOW, 23));

        RetentionService.RetentionReport report = service(ON, shelters).prune(NOW);

        // The 25-month-idle account is erased with the DELETE /account
        // semantics: private row purged, public row orphaned, account gone.
        assertThat(users.findById(idle25.getId())).isNull();
        assertThat(shelters.findById(privateHome.getId())).isEmpty();
        assertThat(shelters.findById(publicShelter.getId()))
                .hasValueSatisfying(s -> assertThat(s.getCreatedBy()).isNull());
        // The 23-month-idle account is inside the horizon — untouched.
        assertThat(users.findById(idle23.getId())).isNotNull();
        assertThat(report).isEqualTo(new RetentionService.RetentionReport(1, 0));
    }

    @Test
    void neverPrunesAnAdminNoMatterHowIdle() {
        AdminUser admin = new AdminUser("Admin", "admin@example.ee", null);
        users.save(admin);
        users.markActive(admin.getId(), monthsBefore(NOW, 60));
        RegisteredUser idle25 = saveUser("Old", "old@example.ee");
        users.markActive(idle25.getId(), monthsBefore(NOW, 25));

        RetentionService.RetentionReport report = service(ON, shelters).prune(NOW);

        assertThat(users.findById(admin.getId())).isNotNull();
        assertThat(users.findById(idle25.getId())).isNull();
        assertThat(report.accountsPruned()).isEqualTo(1);
    }

    /**
     * The second gate on its own: the candidate query's kind filter is the
     * first gate, but this fake bypasses it (a simulated query regression
     * — every idle row, admin included, is a candidate). AdminUser is-a
     * RegisteredUser, so without the service's domain-kind check the
     * erasure path would run on the admin. Both gates are pinned
     * individually — the combined admin test cannot see a single gate
     * failing while the other holds.
     */
    @Test
    void anAdminLeakingIntoTheCandidateQueryIsNeverErased() {
        AdminUser admin = new AdminUser("Admin", "admin-leak@example.ee", null);
        users.save(admin);
        users.markActive(admin.getId(), monthsBefore(NOW, 60));
        RegisteredUser idle25 = saveUser("Old", "old@example.ee");
        users.markActive(idle25.getId(), monthsBefore(NOW, 25));

        // A candidate query that ignores the kind filter: every idle row
        // is a candidate, the admin among them.
        UserRepository leakingQuery = new InMemoryUserRepository() {
            @Override
            public List<User> findInactiveBefore(Instant cutoff) {
                return users.findAll().stream()
                        .filter(u -> u.getLastActivityAt() != null
                                && u.getLastActivityAt().isBefore(cutoff))
                        .toList();
            }
        };

        RetentionService.RetentionReport report = new RetentionService(ON, leakingQuery,
                        new AccountService(users, new InMemoryUserCredentialsRepository(clock),
                                new StubPasswordHasher(), shelters, audit),
                        audit, runLog).prune(NOW);

        assertThat(users.findById(admin.getId())).isNotNull();
        assertThat(users.findById(idle25.getId())).isNull();
        assertThat(report).isEqualTo(new RetentionService.RetentionReport(1, 0));
    }

    @Test
    void anAccountOneDayInsideTheHorizonIsKept() {
        // The early-deletion direction of the account horizon: an account
        // one day INSIDE the 23-month mark (23 months + 1 day idle) must
        // survive a 24-month window. A horizon narrowed by one month
        // would delete it a month early.
        RegisteredUser inside = saveUser("Inside", "inside@example.ee");
        users.markActive(inside.getId(), monthsBefore(NOW, 23).minus(Duration.ofDays(1)));

        RetentionService.RetentionReport report = service(ON, shelters).prune(NOW);

        assertThat(users.findById(inside.getId())).isNotNull();
        assertThat(report).isEqualTo(new RetentionService.RetentionReport(0, 0));
    }

    @Test
    void anAuditRowOneDayInsideTheHorizonIsKept() {
        // Same early-deletion direction for the audit horizon: a row
        // stamped 23 months + 1 day ago must survive a 24-month window.
        MutableClock auditClock = new MutableClock(monthsBefore(NOW, 23).minus(Duration.ofDays(1)));
        InMemoryModerationAuditLog audit2 = new InMemoryModerationAuditLog(auditClock);
        RetentionService service =
                new RetentionService(ON, users,
                        new AccountService(users, new InMemoryUserCredentialsRepository(clock),
                                new StubPasswordHasher(), shelters, audit2),
                        audit2, runLog);

        audit2.record(44L, null, 7L, ModerationAuditLog.Action.CONFIRM, "inside note", null, null);

        RetentionService.RetentionReport report = service.prune(NOW);

        assertThat(report.auditRowsPruned()).isZero();
        assertThat(audit2.rows())
                .extracting(ModerationAuditLog.Row::shelterId)
                .containsExactly(44L);
    }

    @Test
    void prunesAuditRowsOlderThanTheHorizonAndKeepsTheNewerOnes() {
        // Rows stamped at NOW-25 months and NOW-1 month via the fake's
        // clock (the audit log stamps at record time).
        MutableClock auditClock = new MutableClock(monthsBefore(NOW, 25));
        InMemoryModerationAuditLog audit2 = new InMemoryModerationAuditLog(auditClock);
        RetentionService service =
                new RetentionService(ON, users,
                        new AccountService(users, new InMemoryUserCredentialsRepository(clock),
                                new StubPasswordHasher(), shelters, audit2),
                        audit2, runLog);

        audit2.record(42L, null, 7L, ModerationAuditLog.Action.CONFIRM, "old note", null, null);
        auditClock.advance(Duration.between(auditClock.instant(), monthsBefore(NOW, 1))); // now at NOW-1 month
        audit2.record(43L, null, 7L, ModerationAuditLog.Action.REJECT, "new note", null, null);

        RetentionService.RetentionReport report = service.prune(NOW);

        assertThat(report.auditRowsPruned()).isEqualTo(1);
        assertThat(audit2.rows())
                .extracting(ModerationAuditLog.Row::shelterId)
                .containsExactly(43L);
    }

    @Test
    void disabledJobPrunesNothingAndWritesNoRunRow() {
        RegisteredUser idle25 = saveUser("Old", "old@example.ee");
        users.markActive(idle25.getId(), monthsBefore(NOW, 25));
        audit.record(42L, null, 7L, ModerationAuditLog.Action.CONFIRM, "old note", null, null);

        RetentionService.RetentionReport report = service(OFF, shelters).prune(NOW);

        assertThat(report).isEqualTo(new RetentionService.RetentionReport(0, 0));
        assertThat(users.findById(idle25.getId())).isNotNull();
        assertThat(audit.rows()).hasSize(1);
        assertThat(runLog.rows()).isEmpty();
    }

    @Test
    void recordsADurableRunRowWithThePrunedCounts() {
        RegisteredUser idle25 = saveUser("Old", "old@example.ee");
        users.markActive(idle25.getId(), monthsBefore(NOW, 25));

        service(ON, shelters).prune(NOW);

        assertThat(runLog.rows()).hasSize(1);
        RetentionRunLog.Row row = runLog.rows().get(0);
        assertThat(row.ranAt()).isEqualTo(NOW);
        assertThat(row.accountsPruned()).isEqualTo(1);
        assertThat(row.auditRowsPruned()).isEqualTo(0);
        assertThat(row.status()).isEqualTo("OK");
        assertThat(row.errorMessage()).isNull();
    }

    @Test
    void aFailingAccountErasureRecordsAFailedRunRowWithThePartialCount() {
        RegisteredUser first = saveUser("First", "first@example.ee");
        users.markActive(first.getId(), monthsBefore(NOW, 25));
        RegisteredUser second = saveUser("Second", "second@example.ee");
        users.markActive(second.getId(), monthsBefore(NOW, 25));
        // The second account's erasure blows up (e.g. a DB outage) — the
        // first one must stay erased and the run must land a FAILED row.
        ShelterRepository exploding = new InMemoryShelterRepository() {
            @Override
            public List<Shelter> findByCreatedBy(Long userId) {
                if (userId.equals(second.getId())) {
                    throw new IllegalStateException("simulated db outage");
                }
                return super.findByCreatedBy(userId);
            }
        };

        RetentionService.RetentionReport report = service(ON, exploding).prune(NOW);

        assertThat(users.findById(first.getId())).isNull();
        assertThat(users.findById(second.getId())).isNotNull();
        assertThat(report).isEqualTo(new RetentionService.RetentionReport(1, 0));
        assertThat(runLog.rows()).hasSize(1);
        RetentionRunLog.Row row = runLog.rows().get(0);
        assertThat(row.status()).isEqualTo("FAILED");
        assertThat(row.accountsPruned()).isEqualTo(1);
        assertThat(row.auditRowsPruned()).isZero();
        assertThat(row.errorMessage()).contains("simulated db outage");
    }
}
