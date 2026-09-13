package ee.sheltermap.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.migration.V13PiiEncryptionMigration;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.PhoneNumbers;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.Configuration;
import org.flywaydb.core.api.migration.Context;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.core.env.Environment;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for PII at rest (M2): a registered contact is stored as
 * {@code v1:} ciphertext + HMAC blind index, lookups still resolve
 * (e-mail case-insensitive, phone E.164), duplicates still 409, and
 * {@code /account/me} still returns plaintext. The V13 migration tests run
 * against throwaway fresh databases on the same Testcontainers Postgres:
 * V1–V12 from the classpath, then the Java V13 executed directly on a
 * seeded plaintext database (in-place conversion + idempotency + the
 * canonical-collision guard).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class PiiAtRestIT extends AbstractPersistenceIT {

    private static final String EMAIL = "mari@example.ee";
    private static final String PHONE = "+37250000001";
    private static final String PASSWORD = "s3cret";

    @Autowired
    MockMvc mvc;

    @Autowired
    Environment env;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PiiCrypto pii;

    // ---------- at rest: ciphertext + blind index ----------

    @Test
    void aRegisteredUserIsStoredAsCiphertextWithBlindIndex() throws Exception {
        register("Mari", EMAIL, PHONE);
        long id = userIdByEmail(EMAIL); // the blind-index lookup resolves

        Map<String, Object> row = jdbc.queryForMap(
                "SELECT email, phone, email_hash, phone_hash FROM users WHERE id = ?", id);
        String storedEmail = (String) row.get("email");
        String storedPhone = (String) row.get("phone");

        assertThat(storedEmail).startsWith("v1:").doesNotContain("mari");
        assertThat(storedPhone).startsWith("v1:").doesNotContain("50000001");
        assertThat(pii.decrypt(storedEmail)).isEqualTo(EMAIL);
        assertThat(pii.decrypt(storedPhone)).isEqualTo(PHONE);

        assertThat((String) row.get("email_hash"))
                .matches("[0-9a-f]{64}")
                .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL,
                        PiiCrypto.canonicalEmail(EMAIL)));
        assertThat((String) row.get("phone_hash"))
                .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE,
                        PhoneNumbers.normalizeE164(PHONE)));
    }

    @Test
    void loginResolvesByBlindIndexCaseInsensitiveEmailAndPhone() throws Exception {
        register("Mari", EMAIL, PHONE);

        // case-variant e-mail (the old findByEmailIgnoreCase contract)
        assertThat(login("MARI@EXAMPLE.EE")).isNotBlank();
        // registered E.164 phone
        assertThat(login(PHONE)).isNotBlank();
        // local-format phone normalizes to the stored E.164
        assertThat(login("50000001")).isNotBlank();
        // unknown contact stays a generic 401
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"nobody@example.ee\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateContactStillReturns409() throws Exception {
        register("Mari", EMAIL, PHONE);

        // case-variant e-mail of an existing account → 409
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mari\",\"email\":\"MARI@EXAMPLE.EE\","
                                + "\"phone\":\"+37250000002\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isConflict());
        // national-format phone variant of the stored E.164 → 409
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mari\",\"email\":\"mari2@example.ee\","
                                + "\"phone\":\"50000001\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void accountMeStillReturnsPlaintextContacts() throws Exception {
        register("Mari", EMAIL, PHONE);
        String token = login(EMAIL);

        mvc.perform(get("/account/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.phone").value(PHONE));
    }

    // ---------- V13: plaintext → ciphertext conversion on a fresh DB ----------

    @Test
    void theV13MigrationConvertsPlaintextRowsInPlace() throws Exception {
        String dbName = "sheltermap_v13_ok";
        String v13Url = hostPortUrl() + "/" + dbName;
        try (Connection admin = DriverManager.getConnection(dataSourceUrl(), dbUser(), dbPass());
             Statement statement = admin.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS " + dbName);
            statement.execute("CREATE DATABASE " + dbName);
        }
        migrateLegacySchema(v13Url, dbUser(), dbPass());

        try (Connection conn = DriverManager.getConnection(v13Url, dbUser(), dbPass())) {
            conn.setAutoCommit(true);
            seedLegacyPlaintext(conn);
            SingleConnectionDataSource ds = new SingleConnectionDataSource(conn, true);
            JdbcTemplate j13 = new JdbcTemplate(ds);

            new V13PiiEncryptionMigration(pii).migrate(migrationContext(conn));

            Map<String, Object> legacy = j13.queryForMap(
                    "SELECT email, phone, email_hash, phone_hash FROM users WHERE name = 'Legacy'");
            assertThat((String) legacy.get("email")).startsWith("v1:");
            assertThat(pii.decrypt((String) legacy.get("email"))).isEqualTo("legacy@example.ee");
            assertThat((String) legacy.get("phone")).startsWith("v1:");
            assertThat((String) legacy.get("email_hash"))
                    .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, "legacy@example.ee"));
            assertThat((String) legacy.get("phone_hash"))
                    .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, "+37250000001"));

            // guest row: NULL e-mail stays NULL, phone converts, no e-mail hash
            Map<String, Object> guest = j13.queryForMap(
                    "SELECT email, email_hash, phone, phone_hash FROM users WHERE name = 'Guest'");
            assertThat(guest.get("email")).isNull();
            assertThat(guest.get("email_hash")).isNull();
            assertThat((String) guest.get("phone")).startsWith("v1:");
            assertThat((String) guest.get("phone_hash"))
                    .isEqualTo(pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, "+37250000002"));

            // the copy columns converted too (no index needed there)
            String claimRef = j13.queryForObject(
                    "SELECT external_ref FROM verification_claims WHERE user_id = 1", String.class);
            assertThat(claimRef).startsWith("v1:");
            assertThat(pii.decrypt(claimRef)).isEqualTo("legacy@example.ee");
            String pendingContact = j13.queryForObject(
                    "SELECT contact FROM pending_verifications WHERE user_id = 1", String.class);
            assertThat(pii.decrypt(pendingContact)).isEqualTo("legacy@example.ee");
            String pendingTarget = j13.queryForObject(
                    "SELECT target FROM pending_contact_changes WHERE user_id = 1", String.class);
            assertThat(pii.decrypt(pendingTarget)).isEqualTo("new@example.ee");

            // the plaintext unique indexes are gone, the hash ones are live
            List<String> indexes = j13.queryForList(
                    "SELECT indexname FROM pg_indexes WHERE tablename = 'users'", String.class);
            assertThat(indexes).contains("uq_users_email_hash", "uq_users_phone_hash")
                    .doesNotContain("uq_users_email_ci", "uq_users_phone");

            // idempotent rerun: already-converted rows are skipped untouched
            String emailBefore = (String) legacy.get("email");
            String phoneBefore = (String) legacy.get("phone");
            new V13PiiEncryptionMigration(pii).migrate(migrationContext(conn));
            Map<String, Object> after = j13.queryForMap(
                    "SELECT email, phone, email_hash, phone_hash FROM users WHERE name = 'Legacy'");
            assertThat(after.get("email")).isEqualTo(emailBefore);
            assertThat(after.get("phone")).isEqualTo(phoneBefore);
            assertThat(after.get("email_hash")).isEqualTo(legacy.get("email_hash"));
            assertThat(after.get("phone_hash")).isEqualTo(legacy.get("phone_hash"));

            // the hash unique index is the duplicate backstop now
            assertThatThrownBy(() -> j13.update(
                            "INSERT INTO users (kind, name, email, email_hash) "
                                    + "VALUES ('GUEST', 'Dup', NULL, ?)",
                            legacy.get("email_hash")))
                    .isInstanceOf(DuplicateKeyException.class);

            ds.destroy();
        }
    }

    @Test
    void theV13MigrationFailsLoudlyOnCanonicalCollisions() throws Exception {
        String dbName = "sheltermap_v13_collision";
        String v13Url = hostPortUrl() + "/" + dbName;
        try (Connection admin = DriverManager.getConnection(dataSourceUrl(), dbUser(), dbPass());
             Statement statement = admin.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS " + dbName);
            statement.execute("CREATE DATABASE " + dbName);
        }
        migrateLegacySchema(v13Url, dbUser(), dbPass());

        try (Connection conn = DriverManager.getConnection(v13Url, dbUser(), dbPass())) {
            conn.setAutoCommit(true);
            // both legal under the legacy lower(email) index (leading space
            // differs) but canonicalizing (trim + lower) makes them twins
            try (Statement statement = conn.createStatement()) {
                statement.execute(
                        "INSERT INTO users (kind, name, email, phone) "
                                + "VALUES ('REGISTERED', 'TwinA', 'Twin@x.com', NULL), "
                                + "('REGISTERED', 'TwinB', ' twin@x.com', NULL)");
            }
            assertThatThrownBy(() ->
                            new V13PiiEncryptionMigration(pii).migrate(migrationContext(conn)))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("blind-index collision");
        }
    }

    // ---------- helpers ----------

    /** V1–V12 from the classpath on a fresh database (V13 is a Spring bean, not a script). */
    private static void migrateLegacySchema(String url, String user, String password) {
        Flyway.configure()
                .dataSource(url, user, password)
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    /** The pre-M2 data: plaintext contacts in every column the V13 touches. */
    private static void seedLegacyPlaintext(Connection conn) throws SQLException {
        String hex64 = "0".repeat(64);
        try (Statement statement = conn.createStatement()) {
            statement.execute(
                    "INSERT INTO users (kind, name, email, phone) VALUES "
                            + "('REGISTERED', 'Legacy', 'legacy@example.ee', '+37250000001'), "
                            + "('GUEST', 'Guest', NULL, '+37250000002')");
            statement.execute(
                    "INSERT INTO verification_claims (user_id, level, provider, external_ref, verified_at) "
                            + "VALUES (1, 'EMAIL', 'EMAIL', 'legacy@example.ee', now())");
            statement.execute(
                    "INSERT INTO pending_verifications (user_id, level, contact, code_hash, expires_at) "
                            + "VALUES (1, 'EMAIL', 'legacy@example.ee', '" + hex64 + "', now())");
            statement.execute(
                    "INSERT INTO pending_contact_changes (user_id, type, target, code_hash, expires_at, created_at) "
                            + "VALUES (1, 'EMAIL_CHANGE', 'new@example.ee', '" + hex64 + "', now(), now())");
        }
    }

    /** Flyway's migration callback with nothing but the connection (V13 only uses it). */
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

    private void register(String name, String email, String phone) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email
                                + "\",\"phone\":\"" + phone + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isCreated());
    }

    private String login(String contact) throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + contact + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode node = new ObjectMapper().readTree(result.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }
}
