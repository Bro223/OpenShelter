package ee.sheltermap.retention;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V24 backfill test — the safety property the
 * migration's comment is written around: the job prunes by comparing
 * {@code last_activity_at} against the horizon, so a NULL there reads as
 * "inactive since forever" and the FIRST enabled run would delete every
 * account. The backfill must leave NO row NULL.
 *
 * <p>Exercised against a throwaway Postgres (separate from the shared IT
 * container — the manual Flyway run must not touch the Spring context's
 * schema history): the real V1→V23 SQL migrations build the legacy
 * schema (the Java V13 PII migration is absent from the file set — V24
 * does not depend on its output), legacy rows are inserted the way they
 * would exist pre-V24, and then V24 is applied.
 */
class RetentionBackfillIT {

    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16").withDatabaseName("sheltermap_v24_backfill");

    @BeforeAll
    static void start() {
        POSTGRES.start();
    }

    @AfterAll
    static void stop() {
        POSTGRES.stop();
    }

    @Test
    void backfillSeedsEveryRowAndTheColumnStaysNotNull() throws Exception {
        Path dir = Files.createTempDirectory("v24-backfill");
        Path migrations = Path.of("src", "main", "resources", "db", "migration");
        for (Path f : Files.list(migrations).toList()) {
            if (f.getFileName().toString().endsWith(".sql")) {
                Files.copy(f, dir.resolve(f.getFileName().toString()));
            }
        }

        String url = POSTGRES.getJdbcUrl();
        Flyway to23 = Flyway.configure()
                .dataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("filesystem:" + dir)
                .target(MigrationVersion.fromVersion("23"))
                .load();
        to23.migrate();

        // Legacy rows as they exist pre-V24: two accounts with
        // credentials (creation stamps 2024 / 2025) and one legacy GUEST
        // row with no credentials at all.
        try (Connection c = connection(); Statement s = c.createStatement()) {
            s.executeUpdate("INSERT INTO users (kind, name, email) VALUES ('REGISTERED', 'Old', 'old-legacy@example.ee')");
            s.executeUpdate("INSERT INTO user_credentials (user_id, password_hash, created_at, changed_at) "
                    + "VALUES (1, 'legacy', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')");
            s.executeUpdate("INSERT INTO users (kind, name, email) VALUES ('REGISTERED', 'Newer', 'newer-legacy@example.ee')");
            s.executeUpdate("INSERT INTO user_credentials (user_id, password_hash, created_at, changed_at) "
                    + "VALUES (2, 'legacy', '2025-06-01T00:00:00Z', '2025-06-01T00:00:00Z')");
            s.executeUpdate("INSERT INTO users (kind, name) VALUES ('GUEST', 'Ghost')");
        }

        Flyway to24 = Flyway.configure()
                .dataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("filesystem:" + dir)
                .target(MigrationVersion.fromVersion("24"))
                .load();
        to24.migrate();

        try (Connection c = connection()) {
            // 1) Existing rows are backfilled from the account-creation
            // stamp — the idle clock starts at creation, not at the
            // migration moment.
            assertThat(instantOf(c, "SELECT last_activity_at FROM users WHERE id = 1"))
                    .isEqualTo(Instant.parse("2024-01-01T00:00:00Z"));
            assertThat(instantOf(c, "SELECT last_activity_at FROM users WHERE id = 2"))
                    .isEqualTo(Instant.parse("2025-06-01T00:00:00Z"));
            // 2) The credentials-less legacy row still ends up non-null.
            assertThat(instantOf(c, "SELECT last_activity_at FROM users WHERE id = 3")).isNotNull();
            // 3) THE property: no row is NULL — the first enabled run
            // cannot read any account as idle-since-forever.
            try (PreparedStatement p = c.prepareStatement(
                    "SELECT count(*) FROM users WHERE last_activity_at IS NULL");
                 ResultSet rs = p.executeQuery()) {
                rs.next();
                assertThat(rs.getLong(1)).isZero();
            }
            // 4) The DEFAULT now() backstop: a future insert that omits
            // the column (no auth-path stamp) still lands non-null.
            try (Statement s = c.createStatement()) {
                s.executeUpdate("INSERT INTO users (kind, name) VALUES ('REGISTERED', 'Fresh')");
            }
            assertThat(instantOf(c, "SELECT last_activity_at FROM users WHERE name = 'Fresh'")).isNotNull();
            // 5) The NOT NULL constraint is live: an explicit NULL is
            // refused, so no future path can smuggle a NULL in.
            assertThatThrownBy(() -> {
                try (Connection c2 = connection(); Statement s = c2.createStatement()) {
                    s.executeUpdate(
                            "INSERT INTO users (kind, name, last_activity_at) VALUES ('GUEST', 'Null', NULL)");
                }
            }).isInstanceOf(SQLException.class).hasMessageContaining("null value");
        }
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(),
                POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static Instant instantOf(Connection c, String sql) throws SQLException {
        try (PreparedStatement p = c.prepareStatement(sql); ResultSet rs = p.executeQuery()) {
            assertThat(rs.next()).as(sql).isTrue();
            return rs.getTimestamp(1).toInstant();
        }
    }
}
