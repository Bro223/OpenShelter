package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

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
 */
@SpringBootTest
public abstract class AbstractPersistenceIT {

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
        RegisteredUser user = new RegisteredUser("Mari Maasikas", email, phone, "49001010001");
        users.save(user);
        return user;
    }
}
