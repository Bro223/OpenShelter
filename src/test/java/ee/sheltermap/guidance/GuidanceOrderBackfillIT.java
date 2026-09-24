package ee.sheltermap.guidance;

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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V28 backfill test — the safety property the
 * migration's comment is written around: the backfill must rank every row
 * in the order the public index produced BEFORE the change (pinned first,
 * then published_at DESC, id DESC — drafts, invisible today, ranked after
 * the published rows), so the visible index is IDENTICAL the instant the
 * migration runs: deploying is a visible no-op.
 *
 * <p>Exercised against a throwaway Postgres (separate from the shared IT
 * container — the manual Flyway run must not touch the Spring context's
 * schema history), the same shape as {@link
 * ee.sheltermap.retention.RetentionBackfillIT}: the real V1→V27 SQL
 * migrations build the legacy schema (the Java V13 PII migration is absent
 * from the file set — V28 does not depend on its output), legacy posts are
 * inserted the way they would exist pre-V28 (mixed pinned / non-pinned /
 * drafts, two sharing a publication instant), and then V28 is applied.
 */
class GuidanceOrderBackfillIT {

    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16").withDatabaseName("sheltermap_v28_backfill");

    @BeforeAll
    static void start() {
        POSTGRES.start();
    }

    @AfterAll
    static void stop() {
        POSTGRES.stop();
    }

    @Test
    void theBackfillReproducesTodaysPublicOrderAndTheIndexIsUnchanged() throws Exception {
        Path dir = Files.createTempDirectory("v28-backfill");
        Path migrations = Path.of("src", "main", "resources", "db", "migration");
        for (Path f : Files.list(migrations).toList()) {
            if (f.getFileName().toString().endsWith(".sql")) {
                Files.copy(f, dir.resolve(f.getFileName().toString()));
            }
        }

        String url = POSTGRES.getJdbcUrl();
        Flyway to27 = Flyway.configure()
                .dataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("filesystem:" + dir)
                .target(MigrationVersion.fromVersion("27"))
                .load();
        to27.migrate();

        // Legacy posts as they exist pre-V28 (inserted in id order):
        //   1  published, PINNED,  2026-01-05
        //   2  published,          2026-01-03
        //   3  published,          2026-01-04
        //   4  published,          2026-01-04  (same instant as 3 — id DESC
        //                                       tie-break: 4 ahead of 3)
        //   5  draft (NULL stamp, larger id — ranks behind draft 6? No:
        //                                       drafts rank id DESC: 6 ahead of 5)
        //   6  draft (NULL stamp)
        // The pre-change public order is therefore [1, 4, 3, 2], and the
        // (invisible) drafts rank [6, 5].
        try (Connection c = connection(); Statement s = c.createStatement()) {
            s.executeUpdate("INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned, published_at) "
                    + "VALUES ('backfill-1', 'Backfill 1', '<p>b</p>', 'en', 'PUBLISHED', true, '2026-01-05T00:00:00Z')");
            s.executeUpdate("INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned, published_at) "
                    + "VALUES ('backfill-2', 'Backfill 2', '<p>b</p>', 'en', 'PUBLISHED', false, '2026-01-03T00:00:00Z')");
            s.executeUpdate("INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned, published_at) "
                    + "VALUES ('backfill-3', 'Backfill 3', '<p>b</p>', 'en', 'PUBLISHED', false, '2026-01-04T00:00:00Z')");
            s.executeUpdate("INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned, published_at) "
                    + "VALUES ('backfill-4', 'Backfill 4', '<p>b</p>', 'en', 'PUBLISHED', false, '2026-01-04T00:00:00Z')");
            s.executeUpdate("INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned) "
                    + "VALUES ('backfill-5', 'Backfill 5', '<p>b</p>', 'en', 'DRAFT', false)");
            s.executeUpdate("INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned) "
                    + "VALUES ('backfill-6', 'Backfill 6', '<p>b</p>', 'en', 'DRAFT', false)");
        }

        Flyway to28 = Flyway.configure()
                .dataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("filesystem:" + dir)
                .target(MigrationVersion.fromVersion("28"))
                .load();
        to28.migrate();

        try (Connection c = connection()) {
            // 1) EVERY row — published AND draft — holds a position.
            assertThat(rows(c, "SELECT id, sort_order FROM guidance_posts ORDER BY id")).containsExactly(
                    new Object[]{1L, 1},   // pinned, first
                    new Object[]{2L, 4},   // oldest published, last of the published block
                    new Object[]{3L, 3},   // same-instant pair: id DESC → 4 ahead of 3
                    new Object[]{4L, 2},
                    new Object[]{5L, 6},   // drafts rank after the published rows
                    new Object[]{6L, 5});

            // 2) THE property: the visible index is unchanged. The
            // pre-change order and the new order (pinned DESC, sort_order
            // ASC, published_at DESC, id DESC) name the SAME rows in the
            // SAME order.
            List<Long> before = ids(c, "SELECT id FROM guidance_posts WHERE status = 'PUBLISHED' "
                    + "ORDER BY pinned DESC, published_at DESC, id DESC");
            List<Long> after = ids(c, "SELECT id FROM guidance_posts WHERE status = 'PUBLISHED' "
                    + "ORDER BY pinned DESC, sort_order ASC, published_at DESC, id DESC");
            assertThat(after).containsExactly(1L, 4L, 3L, 2L);
            assertThat(after).isEqualTo(before);

            // 3) The NOT NULL constraint is live: a NULL sort_order is
            // refused, so no future path can leave a row without a position.
            assertThatThrownBy(() -> {
                try (Connection c2 = connection(); Statement s = c2.createStatement()) {
                    s.executeUpdate("INSERT INTO guidance_posts "
                            + "(slug, title, body_html, locale, status, pinned, sort_order) "
                            + "VALUES ('backfill-null', 'Null', '<p>b</p>', 'en', 'DRAFT', false, NULL)");
                }
            }).isInstanceOf(SQLException.class).hasMessageContaining("null value");

            // 4) The V23 partial index was REPLACED: one index of the same
            // name, now carrying the new order keys.
            List<String> defs = strings(c,
                    "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_guidance_posts_published_order'");
            assertThat(defs).hasSize(1);
            assertThat(defs.get(0))
                    // (ascending sort_order is rendered bare — ASC is the
                    //  btree default and Postgres drops it from indexdef; the
                    //  predicate is cast to text by the renderer)
                    .contains("pinned DESC")
                    .contains("sort_order, ")
                    .contains("published_at DESC")
                    .contains("id DESC")
                    .contains("status)")
                    .contains("'PUBLISHED'");

            // 5) NO unique constraint on sort_order (the atomic renumber
            // must not transiently violate one).
            assertThat(readCount(c, "SELECT count(*) FROM pg_indexes "
                    + "WHERE tablename = 'guidance_posts' AND indexdef ILIKE '%UNIQUE%sort_order%'")
            ).isZero();
        }
    }

    private static long readCount(Connection c, String sql) throws SQLException {
        try (PreparedStatement p = c.prepareStatement(sql); ResultSet rs = p.executeQuery()) {
            rs.next();
            return rs.getLong(1);
        }
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(),
                POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static List<Object[]> rows(Connection c, String sql) throws SQLException {
        List<Object[]> out = new ArrayList<>();
        try (PreparedStatement p = c.prepareStatement(sql); ResultSet rs = p.executeQuery()) {
            while (rs.next()) {
                out.add(new Object[]{rs.getObject(1), rs.getObject(2)});
            }
        }
        return out;
    }

    private static List<Long> ids(Connection c, String sql) throws SQLException {
        List<Long> out = new ArrayList<>();
        try (PreparedStatement p = c.prepareStatement(sql); ResultSet rs = p.executeQuery()) {
            while (rs.next()) {
                out.add(rs.getLong(1));
            }
        }
        return out;
    }

    private static List<String> strings(Connection c, String sql) throws SQLException {
        List<String> out = new ArrayList<>();
        try (PreparedStatement p = c.prepareStatement(sql); ResultSet rs = p.executeQuery()) {
            while (rs.next()) {
                out.add(rs.getString(1));
            }
        }
        return out;
    }
}
