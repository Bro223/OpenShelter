package ee.sheltermap.security;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.migration.V13PiiEncryptionMigration;
import ee.sheltermap.migration.V34BlindIndexFramingMigration;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.PhoneNumbers;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.migration.Context;
import org.flywaydb.core.api.configuration.Configuration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for the V34 blind-index framing transition:
 * <ul>
 *   <li>reads stay correct DURING the fallback window — a row still
 *       holding the legacy raw-concat index resolves through
 *       {@code UserRepository} (framed lookup first, legacy second);</li>
 *   <li>the V34 migration reframes every stored index in place (derived
 *       from the decrypted PII, envelope untouched), lookups resolve
 *       against the framed index afterwards, and a rerun is a no-op.</li>
 * </ul>
 * The V34 migration tests run against throwaway fresh databases on the
 * same Testcontainers Postgres — the V13 test idiom (never the shared
 * IT database, whose state other contexts depend on).
 */
@Transactional
class BlindIndexFramingIT extends AbstractPersistenceIT {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PiiCrypto pii;

    @Autowired
    UserRepository users;

    @Autowired
    Environment env;

    // ---------- reads during the fallback window (shared IT DB, rolled back) ----------

    @Test
    void aLegacyFramedRowStillResolvesDuringTheFallbackWindow() {
        // A row exactly as V13 left it: v1: envelopes + LEGACY
        // raw-concat-framed indexes (pre-V34 world).
        String email = "legacyframed@example.ee";
        String phone = "+37250000077";
        jdbc.update(
                "INSERT INTO users (kind, name, email, phone, email_hash, phone_hash) "
                        + "VALUES ('REGISTERED', 'Legacy Framed', ?, ?, ?, ?)",
                pii.encrypt(email), pii.encrypt(phone),
                pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_EMAIL, PiiCrypto.canonicalEmail(email)),
                pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_PHONE, PhoneNumbers.normalizeE164(phone)));

        // the lookup path resolves it — framed index first, legacy second
        assertThat(users.findByEmail(email)).isNotNull();
        assertThat(users.findByPhone(phone)).isNotNull();

        // the new-framing row (what every NEW write produces) still
        // resolves through the same path
        RegisteredUser fresh = saveUser(users, "freshframed@example.ee", "+37250000078");
        assertThat(users.findByEmail("freshframed@example.ee").getId()).isEqualTo(fresh.getId());
        assertThat(users.findByPhone("+37250000078").getId()).isEqualTo(fresh.getId());

        // the fallback does not loosen the lookup: an unknown contact
        // still resolves to nothing
        assertThat(users.findByEmail("unknown-framed@example.ee")).isNull();
        assertThat(users.findByPhone("+37250000099")).isNull();
    }

    // ---------- V34: the reframe itself (throwaway databases) ----------

    @Test
    void v34ReframesEveryStoredIndexAndLookupsStillResolve() throws Exception {
        String dbName = "sheltermap_v34_ok";
        String url = hostPortUrl() + "/" + dbName;
        try (Connection admin = DriverManager.getConnection(dataSourceUrl(), dbUser(), dbPass());
             Statement statement = admin.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS " + dbName);
            statement.execute("CREATE DATABASE " + dbName);
        }
        migrateFullSchemaThroughV33(url);

        try (Connection conn = DriverManager.getConnection(url, dbUser(), dbPass())) {
            conn.setAutoCommit(true);
            seedPostV13World(conn);
            SingleConnectionDataSource ds = new SingleConnectionDataSource(conn, true);
            JdbcTemplate j34 = new JdbcTemplate(ds);

            new V34BlindIndexFramingMigration(pii).migrate(migrationContext(conn));

            // every stored index is now the framed recomputation —
            // derived from the decrypted PII, the envelope untouched
            Map<String, Object> legacy = j34.queryForMap(
                    "SELECT email, phone, email_hash, phone_hash FROM users WHERE name = 'Legacy'");
            assertThat((String) legacy.get("email")).startsWith("v1:");
            assertThat(pii.decrypt((String) legacy.get("email"))).isEqualTo("legacy@example.ee");
            assertThat((String) legacy.get("email_hash"))
                    .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "legacy@example.ee"));
            assertThat((String) legacy.get("phone_hash"))
                    .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, "+37250000001"));
            Map<String, Object> noPhone = j34.queryForMap(
                    "SELECT email, phone, email_hash, phone_hash FROM users WHERE name = 'NoPhone'");
            assertThat((String) noPhone.get("email_hash"))
                    .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "nophone@example.ee"));
            assertThat(noPhone.get("phone_hash")).isNull(); // blank contact: still no index

            // a lookup by the FRAMED index resolves (raw JDBC — the
            // repository fallback is irrelevant once the row is migrated)
            Long found = j34.queryForObject(
                    "SELECT id FROM users WHERE email_hash = ?", Long.class,
                    pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "legacy@example.ee"));
            assertThat(found).isEqualTo(j34.queryForObject(
                    "SELECT id FROM users WHERE name = 'Legacy'", Long.class));

            // idempotent rerun: every stored value byte-identical
            String emailBefore = (String) legacy.get("email");
            String emailHashBefore = (String) legacy.get("email_hash");
            new V34BlindIndexFramingMigration(pii).migrate(migrationContext(conn));
            Map<String, Object> after = j34.queryForMap(
                    "SELECT email, phone, email_hash, phone_hash FROM users WHERE name = 'Legacy'");
            assertThat(after.get("email")).isEqualTo(emailBefore);
            assertThat(after.get("email_hash")).isEqualTo(emailHashBefore);
            assertThat(after.get("phone_hash")).isEqualTo(legacy.get("phone_hash"));

            ds.destroy();
        }
    }

    @Test
    void v34FailsLoudOnANonBlankUnencryptedContact() throws Exception {
        String dbName = "sheltermap_v34_unconverted";
        String url = hostPortUrl() + "/" + dbName;
        try (Connection admin = DriverManager.getConnection(dataSourceUrl(), dbUser(), dbPass());
             Statement statement = admin.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS " + dbName);
            statement.execute("CREATE DATABASE " + dbName);
        }
        migrateFullSchemaThroughV33(url);

        try (Connection conn = DriverManager.getConnection(url, dbUser(), dbPass())) {
            conn.setAutoCommit(true);
            try (Statement statement = conn.createStatement()) {
                // a row V13 never converted: plaintext contact, no index
                statement.execute(
                        "INSERT INTO users (kind, name, email, phone) "
                                + "VALUES ('REGISTERED', 'Stray', 'stray@example.ee', NULL)");
            }
            assertThatThrownBy(() ->
                            new V34BlindIndexFramingMigration(pii).migrate(migrationContext(conn)))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("unencrypted");
        }
    }

    // ---------- helpers ----------

    /**
     * The full current schema on a fresh database: every classpath SQL
     * migration (V1–V33 minus the Java slots) + the V13 Java migration
     * (which needs the env-keyed PiiCrypto — the reason it is a bean, not
     * a script). V34 is NOT applied here — the tests run it directly.
     */
    private void migrateFullSchemaThroughV33(String url) {
        Flyway.configure()
                .dataSource(url, dbUser(), dbPass())
                .locations("classpath:db/migration")
                .javaMigrations(new V13PiiEncryptionMigration(pii))
                .load()
                .migrate();
    }

    /**
     * The post-V13, pre-V34 world: v1: envelopes + LEGACY-framed
     * indexes (what a pre-change instance stored).
     */
    private void seedPostV13World(Connection conn) throws SQLException {
        String legacyEmail = "legacy@example.ee";
        String legacyPhone = "+37250000001";
        String noPhoneEmail = "nophone@example.ee";
        try (var insert = conn.prepareStatement(
                "INSERT INTO users (kind, name, email, phone, email_hash, phone_hash) VALUES "
                        + "('REGISTERED', 'Legacy', ?, ?, ?, ?), "
                        + "('REGISTERED', 'NoPhone', ?, '', ?, NULL)")) {
            insert.setString(1, pii.encrypt(legacyEmail));
            insert.setString(2, pii.encrypt(legacyPhone));
            insert.setString(3, pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_EMAIL, legacyEmail));
            insert.setString(4, pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_PHONE, legacyPhone));
            insert.setString(5, pii.encrypt(noPhoneEmail));
            insert.setString(6, pii.legacyBlindIndex(PiiCrypto.DOMAIN_USER_EMAIL, noPhoneEmail));
            insert.executeUpdate();
        }
    }

    /** Flyway's migration callback with nothing but the connection (V13/V34 only use it). */
    private static Context migrationContext(Connection connection) {
        return new Context() {
            @Override
            public Configuration getConfiguration() {
                return null;
            }

            @Override
            public Connection getConnection() {
                return connection;
            }
        };
    }

    private String dataSourceUrl() {
        return env.getProperty("spring.datasource.url");
    }

    /** The JDBC URL without the database segment (for CREATE DATABASE targets). */
    private String hostPortUrl() {
        String url = dataSourceUrl();
        return url.substring(0, url.lastIndexOf('/'));
    }

    private String dbUser() {
        return env.getProperty("spring.datasource.username");
    }

    private String dbPass() {
        return env.getProperty("spring.datasource.password");
    }
}
