package ee.sheltermap.migration;

import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.verification.PhoneNumbers;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.migration.Context;
import org.flywaydb.core.api.migration.JavaMigration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Objects;

/**
 * V13 — PII at rest (M2). One atomic Flyway Java migration:
 *
 * <ol>
 *   <li>widen the five PII text columns to {@code VARCHAR(1024)} (the
 *       {@code v1:} envelope is longer than the plaintext it replaces);</li>
 *   <li>add {@code users.email_hash} / {@code users.phone_hash}
 *       ({@code VARCHAR(64)} blind-index columns — VARCHAR, like every
 *       other stored hash in this schema, so {@code ddl-auto=validate}
 *       matches the entity column type);</li>
 *   <li>convert every existing row IN PLACE to ciphertext + blind index —
 *       idempotent: rows already carrying the {@code v1:} prefix are
 *       skipped, and blank values (absent contacts, e.g. the provisioned
 *       admin's phone / a legacy empty claim ref) are left as-is — they
 *       are never encrypted and get no blind index, so a failed-then-
 *       {@code flyway repair}-ed rerun is safe (Flyway does not
 *       auto-rollback a failed migration);</li>
 *   <li>replace the plaintext unique indexes {@code uq_users_email_ci} /
 *       {@code uq_users_phone} with unique indexes on the hashes.</li>
 * </ol>
 *
 * <p>A pre-existing row pair whose canonical contacts collide (e.g. a
 * legacy {@code Foo@x.com} next to {@code foo@x.com} — legal under the old
 * case-SENSITIVE unique index, impossible after the P2 normalization)
 * makes step 4 impossible: the migration then fails loudly with the
 * colliding rows instead of silently destroying data. Dedupe first, then
 * {@code flyway repair} + rerun (fresh databases convert zero rows).
 *
 * <p>Java (not .sql) because the conversion needs the app's env key —
 * SQL cannot hold it. Implements {@link JavaMigration} directly (instead of
 * extending {@code BaseJavaMigration}): the class name is descriptive, not
 * a versioned migration name, so the version (13) + description are
 * declared explicitly. The bean is constructed by Spring with
 * {@link PiiCrypto} injected (see {@link PiiMigrationConfig}).
 */
public class V13PiiEncryptionMigration implements JavaMigration {

    private final PiiCrypto piiCrypto;

    public V13PiiEncryptionMigration(PiiCrypto piiCrypto) {
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
    }

    @Override
    public MigrationVersion getVersion() {
        return MigrationVersion.fromVersion("13");
    }

    @Override
    public String getDescription() {
        return "pii encryption";
    }

    @Override
    public Integer getChecksum() {
        return null; // Java migration: Flyway computes it
    }

    @Override
    public boolean canExecuteInTransaction() {
        return true;
    }

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        exec(connection, "ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(1024)");
        exec(connection, "ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(1024)");
        exec(connection, "ALTER TABLE verification_claims ALTER COLUMN external_ref TYPE VARCHAR(1024)");
        exec(connection, "ALTER TABLE pending_verifications ALTER COLUMN contact TYPE VARCHAR(1024)");
        exec(connection, "ALTER TABLE pending_contact_changes ALTER COLUMN target TYPE VARCHAR(1024)");

        exec(connection, "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64)");
        exec(connection, "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64)");

        convertUsers(connection);
        convertColumn(connection, "verification_claims", "external_ref");
        convertColumn(connection, "pending_verifications", "contact");
        convertColumn(connection, "pending_contact_changes", "target");

        ensureNoHashCollisions(connection, "email_hash", "e-mail");
        ensureNoHashCollisions(connection, "phone_hash", "phone");

        // All DDL is idempotent (IF NOT EXISTS / IF EXISTS) so a failed-
        // then-`flyway repair`-ed rerun can start from the top — the same
        // guarantee the row conversion gets from the `v1:` guard.
        exec(connection, "DROP INDEX IF EXISTS uq_users_email_ci");
        exec(connection, "DROP INDEX IF EXISTS uq_users_phone");
        exec(connection, "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_hash ON users (email_hash) WHERE email_hash IS NOT NULL");
        exec(connection, "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_hash ON users (phone_hash) WHERE phone_hash IS NOT NULL");
    }

    /**
     * users: encrypt email/phone in place + fill the blind index. Ciphertext
     * and hash are written in ONE update per row, so a row is never
     * half-converted; the hash-only backfill covers a rerun that
     * interrupted between the two.
     */
    private void convertUsers(Connection connection) throws SQLException {
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT id, email, phone, email_hash, phone_hash FROM users")) {
            ResultSet rs = select.executeQuery();
            while (rs.next()) {
                long id = rs.getLong(1);
                String email = rs.getString(2);
                String phone = rs.getString(3);
                // A blank contact means "absent" (the provisioned admin's
                // phone, legacy rows) — it stays as-is: PiiCrypto fails
                // closed on empties, and an absent contact has no index.
                boolean emailBlank = email == null || email.isBlank();
                boolean phoneBlank = phone == null || phone.isBlank();
                if ((email != null && !emailBlank && !piiCrypto.isEncrypted(email))
                        || (phone != null && !phoneBlank && !piiCrypto.isEncrypted(phone))) {
                    String newEmail = email != null && !emailBlank && !piiCrypto.isEncrypted(email)
                            ? piiCrypto.encrypt(email) : null;
                    String emailHash = !emailBlank
                            ? piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL,
                                    PiiCrypto.canonicalEmail(piiCrypto.unwrapForHash(email))) : null;
                    String newPhone = phone != null && !phoneBlank && !piiCrypto.isEncrypted(phone)
                            ? piiCrypto.encrypt(phone) : null;
                    String phoneHash = !phoneBlank
                            ? piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_PHONE,
                                    PhoneNumbers.normalizeE164(piiCrypto.unwrapForHash(phone))) : null;
                    try (PreparedStatement update = connection.prepareStatement(
                            "UPDATE users SET email = COALESCE(?, email), phone = COALESCE(?, phone), "
                                    + "email_hash = COALESCE(?, email_hash), "
                                    + "phone_hash = COALESCE(?, phone_hash) WHERE id = ?")) {
                        update.setString(1, newEmail);
                        update.setString(2, newPhone);
                        update.setString(3, emailHash);
                        update.setString(4, phoneHash);
                        update.setLong(5, id);
                        update.executeUpdate();
                    }
                }
                // Rerun backfill: encrypted but hash missing (interrupted earlier).
                if (email != null && piiCrypto.isEncrypted(email) && rs.getString(4) == null) {
                    backfillHash(connection, "email_hash", id,
                            piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL,
                                    PiiCrypto.canonicalEmail(piiCrypto.decrypt(email))));
                }
                if (phone != null && piiCrypto.isEncrypted(phone) && rs.getString(5) == null) {
                    backfillHash(connection, "phone_hash", id,
                            piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_PHONE,
                                    PhoneNumbers.normalizeE164(piiCrypto.decrypt(phone))));
                }
            }
        }
    }

    private void backfillHash(Connection connection, String hashColumn, long id, String hash)
            throws SQLException {
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE users SET " + hashColumn + " = ? WHERE id = ?")) {
            update.setString(1, hash);
            update.setLong(2, id);
            update.executeUpdate();
        }
    }

    /** Encrypts every un-encrypted non-null value of a copy column (no index needed there). */
    private void convertColumn(Connection connection, String table, String column) throws SQLException {
        try (PreparedStatement select = connection.prepareStatement(
                        "SELECT id, " + column + " FROM " + table);
             PreparedStatement update = connection.prepareStatement(
                        "UPDATE " + table + " SET " + column + " = ? WHERE id = ?")) {
            ResultSet rs = select.executeQuery();
            while (rs.next()) {
                String value = rs.getString(2);
                // null and blank mean "absent" (e.g. a legacy empty claim
                // ref) — leave as-is, there is nothing to encrypt.
                if (value == null || value.isBlank() || piiCrypto.isEncrypted(value)) {
                    continue;
                }
                update.setString(1, piiCrypto.encrypt(value));
                update.setLong(2, rs.getLong(1));
                update.executeUpdate();
            }
        }
    }

    /**
     * A hash collision means two rows canonicalize to the same contact —
     * the unique index could not exist. Fail loudly (no data mutation)
     * so the operator can dedupe, then repair + rerun.
     */
    private void ensureNoHashCollisions(Connection connection, String hashColumn,
                                        String label) throws SQLException {
        try (PreparedStatement check = connection.prepareStatement(
                "SELECT count(*) FROM (SELECT " + hashColumn
                        + " FROM users WHERE " + hashColumn + " IS NOT NULL "
                        + "GROUP BY " + hashColumn + " HAVING count(*) > 1) collisions")) {
            ResultSet rs = check.executeQuery();
            if (rs.next() && rs.getInt(1) > 0) {
                throw new SQLException(
                        "V13: blind-index collision on " + label + " — pre-existing rows canonicalize "
                                + "to the same " + label + " (e.g. case variants under the old "
                                + "case-sensitive unique index). Dedupe the rows, then run "
                                + "`flyway repair` and restart to rerun V13.");
            }
        }
    }

    private static void exec(Connection connection, String sql) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.execute();
        }
    }
}
