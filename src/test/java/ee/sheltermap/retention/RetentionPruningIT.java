package ee.sheltermap.retention;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AccountService;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Acceptance IT for the retention prune (retention-pruning) against
 * real Postgres + the JPA seams: the 24/24-month horizons, the
 * DELETE /account erasure semantics on pruned accounts, the admin
 * carve-out, the audit-row horizon, and the durable run row.
 *
 * <p>{@code @Transactional} like the neighbouring ITs — the prune runs
 * inside the test transaction and rolls back at the end, so the shared
 * container stays clean. The run time is a fixed instant; nothing sleeps.
 */
@Transactional
class RetentionPruningIT extends AbstractPersistenceIT {

    private static final Instant NOW = Instant.parse("2026-09-16T03:30:00Z");

    /** Calendar-month arithmetic — the same cut the service makes (UTC-anchored). */
    private static Instant monthsBefore(Instant from, long months) {
        return ZonedDateTime.ofInstant(from, ZoneOffset.UTC).minusMonths(months).toInstant();
    }

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    ModerationAuditLog moderationAudit;

    @Autowired
    RetentionRunLog runLog;

    @Autowired
    AccountService accountService;

    @Autowired
    JdbcTemplate jdbc;

    private RetentionService service(boolean enabled) {
        return new RetentionService(
                new RetentionProperties(enabled, 24, 24, "0 30 3 * * *", "Europe/Tallinn"),
                users, accountService, moderationAudit, runLog);
    }

    /** A registered user with the retention clock pinned to {@code stamp}. */
    private RegisteredUser saveIdleUser(String email, String phone, Instant stamp) {
        RegisteredUser user = saveUser(users, email, phone);
        users.markActive(user.getId(), stamp);
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

    private void insertAuditRow(long shelterId, Instant createdAt) {
        jdbc.update("INSERT INTO moderation_actions (shelter_id, moderator_id, action, created_at) "
                + "VALUES (?, NULL, 'CONFIRM', ?)", shelterId, Timestamp.from(createdAt));
    }

    @Test
    void prunesTheIdleAccountWithTheErasureSemanticsAndKeepsTheActiveOne() {
        RegisteredUser idle25 = saveIdleUser("retention-old-1@example.ee", "+37250000011", monthsBefore(NOW, 25));
        Shelter privateHome = saveShelter("Kodu", idle25.getId(), LocationKind.PRIVATE);
        Shelter publicShelter = saveShelter("Varjupaik", idle25.getId(), LocationKind.PUBLIC);
        RegisteredUser idle23 = saveIdleUser("retention-fresh-1@example.ee", "+37250000012", monthsBefore(NOW, 23));

        RetentionService.RetentionReport report = service(true).prune(NOW);

        // Erased through DELETE /account semantics — private row purged,
        // public row orphaned (created_by NULL), account + credentials gone.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Long.class,
                idle25.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_credentials WHERE user_id = ?",
                Long.class, idle25.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM shelters WHERE id = ?", Long.class,
                privateHome.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT created_by FROM shelters WHERE id = ?", Long.class,
                publicShelter.getId())).isNull();
        // The 23-month account is inside the horizon — untouched.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Long.class,
                idle23.getId())).isOne();
        assertThat(report).isEqualTo(new RetentionService.RetentionReport(1, 0));
    }

    @Test
    void neverPrunesAnAdminNoMatterHowIdle() {
        AdminUser admin = new AdminUser("Admin", "retention-admin-1@example.ee", null);
        users.save(admin);
        users.markActive(admin.getId(), monthsBefore(NOW, 60));
        RegisteredUser idle25 = saveIdleUser("retention-old-2@example.ee", "+37250000021", monthsBefore(NOW, 25));

        service(true).prune(NOW);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Long.class,
                admin.getId())).isOne();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Long.class,
                idle25.getId())).isZero();
    }

    @Test
    void anAccountIdleForExactlyTheHorizonIsKept() {
        // The candidate query is strict-before: last_activity_at ==
        // cutoff (exactly 24 months idle) is NOT a candidate. A flip to
        // <= would delete exactly-horizon accounts one month early.
        RegisteredUser exact = saveIdleUser("retention-exact-1@example.ee", "+37250000051", monthsBefore(NOW, 24));

        RetentionService.RetentionReport report = service(true).prune(NOW);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Long.class,
                exact.getId())).isOne();
        assertThat(report.accountsPruned()).isZero();
    }

    @Test
    void anAuditRowExactlyAtTheHorizonIsKept() {
        // The audit horizon delete is strict-before too: a row stamped
        // exactly monthsBefore(NOW, 24) survives.
        insertAuditRow(91005L, monthsBefore(NOW, 24));

        RetentionService.RetentionReport report = service(true).prune(NOW);

        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM moderation_actions WHERE shelter_id = ?", Long.class,
                91005L)).isOne();
        assertThat(report.auditRowsPruned()).isZero();
    }

    @Test
    void prunesAuditRowsOlderThanTheHorizonAndKeepsTheNewerOnes() {
        insertAuditRow(91001L, monthsBefore(NOW, 25));
        insertAuditRow(91002L, monthsBefore(NOW, 1));

        RetentionService.RetentionReport report = service(true).prune(NOW);

        assertThat(report.auditRowsPruned()).isEqualTo(1);
        List<Long> surviving = jdbc.queryForList(
                "SELECT shelter_id FROM moderation_actions ORDER BY shelter_id", Long.class);
        assertThat(surviving).containsExactly(91002L);
    }

    @Test
    void theCandidateQueryLeavesAdminRowsOut() {
        // The FIRST gate of the admin carve-out, pinned on its own: the
        // candidate query is REGISTERED-kind only, so an admin never even
        // reaches the service's domain-kind re-check. (The service-side
        // re-check is pinned in RetentionServiceTest — together the two
        // gates each have a test that fails when only that gate is gone.)
        AdminUser admin = new AdminUser("Admin", "retention-admin-2@example.ee", null);
        users.save(admin);
        users.markActive(admin.getId(), monthsBefore(NOW, 60));

        List<User> candidates = users.findInactiveBefore(monthsBefore(NOW, 24));

        assertThat(candidates).extracting(User::getId).doesNotContain(admin.getId());
    }

    @Test
    void disabledJobPrunesNothingAndWritesNoRunRow() {
        RegisteredUser idle25 = saveIdleUser("retention-old-3@example.ee", "+37250000031", monthsBefore(NOW, 25));
        insertAuditRow(91003L, monthsBefore(NOW, 25));

        RetentionService.RetentionReport report = service(false).prune(NOW);

        assertThat(report).isEqualTo(new RetentionService.RetentionReport(0, 0));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Long.class,
                idle25.getId())).isOne();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM moderation_actions WHERE shelter_id = ?",
                Long.class, 91003L)).isOne();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM retention_runs", Long.class)).isZero();
    }

    @Test
    void recordsADurableRunRowWithThePrunedCounts() {
        saveIdleUser("retention-old-4@example.ee", "+37250000041", monthsBefore(NOW, 25));
        insertAuditRow(91004L, monthsBefore(NOW, 25));

        service(true).prune(NOW);

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT accounts_pruned, audit_rows_pruned, status FROM retention_runs "
                        + "ORDER BY id DESC LIMIT 1");
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get("accounts_pruned")).isEqualTo(1);
        assertThat(rows.get(0).get("audit_rows_pruned")).isEqualTo(1);
        assertThat(rows.get(0).get("status")).isEqualTo("OK");
    }

    @Test
    void everyPersistedUserRowCarriesALastActivityStamp() {
        // The NOT NULL invariant the backfill + the save backstop exist
        // for: a row saved through the repo without an explicit stamp
        // still ends up stamped (JpaUserRepository fills the gap).
        RegisteredUser stamped = saveUser(users, "retention-stamp-1@example.ee", "+3725000007");

        assertThat(jdbc.queryForObject("SELECT last_activity_at FROM users WHERE id = ?",
                Instant.class, stamped.getId())).isNotNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE last_activity_at IS NULL",
                Long.class)).isZero();
    }
}
