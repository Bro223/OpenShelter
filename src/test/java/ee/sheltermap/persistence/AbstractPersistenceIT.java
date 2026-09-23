package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.security.PiiCrypto;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

/**
 * Base class for persistence integration tests (Step 3).
 *
 * <p><strong>Default:</strong> Testcontainers spins up {@code postgres:16}.
 * Flyway migrates it on context start and {@code ddl-auto=validate} runs
 * against it — so a green context IS the "Flyway migrates a fresh DB with
 * validate" acceptance check.
 *
 * <p><strong>No-Docker fallback</strong> (CI sandboxes): pass
 * {@code -Dit.db.url=jdbc:postgresql://host:port/db -Dit.db.username=u -Dit.db.password=p}
 * to run the identical tests against an external PostgreSQL 16.
 *
 * <p><strong>The "test" profile</strong> is activated here, on the one and
 * only {@code @SpringBootTest} base, so every IT context gets it without
 * repeating the annotation: (a) the fail-closed boot guards (ProdJwtGuard)
 * accept the dev-default JWT secret only on exactly "dev" or "test",
 * and (b) it activates {@code src/test/resources/application-test.yml} —
 * the test-profile OVERLAY of the main {@code application.yml} (a few
 * documented deltas; no same-named application.yml may reappear on the
 * test classpath, it would shadow the main file —
 * {@code config/TestConfigOverlayTest} fails the build if it does).
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class AbstractPersistenceIT {

    /**
     * Fixed PII keys for the IT suite — TEST-ONLY values; production
     * keys come from the environment and are never committed. All zeros:
     * the tests exercise the encryption path, not key strength.
     */
    static final String TEST_PII_AES_KEY =
            Base64.getEncoder().encodeToString(new byte[32]);
    static final String TEST_PII_HMAC_KEY =
            Base64.getEncoder().encodeToString(new byte[32]);

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("sheltermap_it");

    static {
        if (System.getProperty("it.db.url") == null) {
            POSTGRES.start();
        }
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        if (System.getProperty("it.db.url") == null) {
            registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
            registry.add("spring.datasource.username", POSTGRES::getUsername);
            registry.add("spring.datasource.password", POSTGRES::getPassword);
        } else {
            registry.add("spring.datasource.url", () -> System.getProperty("it.db.url"));
            registry.add("spring.datasource.username", () -> System.getProperty("it.db.username", "sheltermap"));
            registry.add("spring.datasource.password", () -> System.getProperty("it.db.password", "sheltermap"));
        }
        // One Spring context per IT (property/config variants) keeps its own Hikari
        // pool alive against the SAME single Testcontainers Postgres. With the
        // default pool size (10) the IT suite crosses Postgres' 100-connection
        // ceiling ("too many clients already") — tests are single-threaded and
        // @Transactional, so a small pool is plenty and keeps the suite green.
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "4");
        registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
        // PII-at-rest: the app is fail-closed without the keys — every
        // IT context gets the fixed test keys here.
        registry.add("app.pii.aes-key", () -> TEST_PII_AES_KEY);
        registry.add("app.pii.hmac-key", () -> TEST_PII_HMAC_KEY);
    }

    /**
     * Isolates the durable verification send log per JVM run.
     *
     * <p>The prod config points {@code app.verification.send-log-path} at
     * {@code data/verification-send.log}, which is meant to survive restarts
     * (anti-spam daily cap is a product decision). Every test run spins up a
     * <em>fresh</em> Postgres, so fixture users keep landing on the same low
     * ids — but the file keeps accumulating their sends across runs, until
     * {@code countToday() >= max-per-day} trips a spurious 429 (observed in
     * {@code AccountControllerIT.verificationClaimsSurviveAnEmailChange} after
     * a few same-day runs). Pointing tests at a throwaway temp file makes each
     * run start from an empty log, so the daily cap only ever counts sends
     * from the current run. {@code VerificationThrottleIT} swaps in an
     * in-memory log and clears it per test, so it is unaffected.
     */
    @DynamicPropertySource
    static void verificationSendLog(DynamicPropertyRegistry registry) {
        registry.add("app.verification.send-log-path", () -> sendLogPath().toString());
    }

    private static Path sendLogPath() {
        try {
            return Files.createTempFile("sheltermap-it-verification-send", ".log");
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create temp verification send log", e);
        }
    }

    /** Persists a fresh registered user and returns it (with id assigned). */
    protected final RegisteredUser saveUser(UserRepository users) {
        return saveUser(users, "mari@example.ee", "+37250000001");
    }

    /**
     * Variant with explicit contact — for tests that need TWO users in one
     * test method (email/phone are UNIQUE since the V3 hardening migration,
     * so a second call must use different contacts).
     */
    protected final RegisteredUser saveUser(UserRepository users, String email, String phone) {
        RegisteredUser user = new RegisteredUser("Mari Maasikas", email, phone);
        users.save(user);
        return user;
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PiiCrypto piiCrypto;

    @Autowired
    private AdminSeeder adminSeeder;

    /**
     * Re-runs the env-provisioned admin seeder ({@link AdminSeeder#run}).
     *
     * <p><strong>Why per test, not only at context start:</strong> every IT
     * context pools against the ONE shared database, and the race ITs are
     * deliberately NOT {@code @Transactional} — they commit their own
     * fixture rows and clean them up in {@code @AfterEach} (scoped deletes
     * per the CLEANUP_CONTRACT comment below in this class). The seeder is create-if-absent and
     * idempotent, so re-running it before every test makes admin presence
     * self-healing — it recreates the row if ANYTHING ever removed it —
     * and keeps the suite order-independent: a new IT class that logs in as
     * admin inherits this protection without per-class code. In
     * {@code @Transactional} classes the seeder joins the test transaction
     * and rolls back with it (the INSERT is immediate —
     * {@code UserEntity} uses IDENTITY ids — so raw-JDBC lookups in
     * {@code @BeforeEach} see the row); in the non-transactional race ITs
     * it commits in its own transaction. Historically a class-order wipe of
     * the shared {@code users} table turned the next class's admin login
     * into a generic 401 (first observed in {@code SiteTextsApiIT}); the
     * per-test reseed closed that, and the scoped cleanup contract below
     * removed the destruction itself.
     */
    protected final void seedAdmin() {
        adminSeeder.run(null);
    }

    /**
     * The per-test admin reseed: JUnit runs superclass
     * {@code @BeforeEach} methods first, so this runs before every test of
     * every IT subclass, before any subclass setup or admin login.
     * Self-healing backstop for the provisioned admin rows — see
     * {@link #seedAdmin()} and the cleanup contract below.
     */
    @BeforeEach
    void reseedProvisionedAdmin() {
        seedAdmin();
    }

    /**
     * PII-at-rest: raw-JDBC user lookup by the e-mail's blind index —
     * the {@code users.email} column holds ciphertext, never plaintext.
     */
    protected final long userIdByEmail(String email) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email_hash = ?",
                Long.class,
                piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, PiiCrypto.canonicalEmail(email)));
    }

    /*
     * CLEANUP_CONTRACT — the rule for the ITs that are DELIBERATELY not
     * @Transactional (race tests: the workers run in their own committed
     * transactions, so their rows would otherwise leak into other ITs' row
     * counts on the shared database). Clean up in @AfterEach ONLY the rows
     * THIS class committed — the class-unique root rows (users, shelters,
     * guidance posts) — and nothing else:
     *
     *   1. FK children of users/shelters cascade on delete (user_credentials,
     *      verification_claims, refresh_tokens, pending_verifications,
     *      pending_contact_changes, password_reset_tokens, shelter_reports
     *      and the other report tables, shelter_open_status,
     *      shelter_info_requests), so deleting the class' own root rows is
     *      enough for everything except the two audit-log exceptions:
     *   2. moderation_actions has NO FK on shelter_id (dangling id = deleted
     *      shelter, by design) and its guidance rows carry a NULL
     *      shelter_id — a class that committed audit rows deletes them
     *      explicitly (scoped by its own shelter ids / moderator id);
     *   3. guidance_post_translations must be deleted before its
     *      guidance_posts (the translation FK).
     *
     * NEVER wipe tables or rows the class did not write. Every context's
     * provisioned admin row coexists in this ONE shared database, and the
     * blanket TRUNCATE that used to live here (wipeAllTables) destroyed the
     * admin rows the OTHER contexts had seeded — self-healed for the admin
     * login only by reseedProvisionedAdmin(), never for anything else a
     * class might have depended on, and with RESTART IDENTITY it also reset
     * every identity sequence in the database. See
     * ShelterPagingCostIT#wipeOwnRows() for the idiom.
     */
}
