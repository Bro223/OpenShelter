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
 * V34 — blind-index framing. The V13 blind index framed its HMAC
 * message as raw {@code domain ‖ value} concatenation: domain separation
 * held only while the fixed tag set stayed prefix-free. This migration
 * recomputes every stored index under the unambiguous length-prefix
 * framing ({@code uint16be(len) ‖ part} for the domain AND the value) —
 * see {@link PiiCrypto#blindIndex}.
 *
 * <p>The index is DERIVED, not secret state: each row's canonical
 * contact is decrypted with the existing key, the framed index is
 * recomputed and written back in place. No re-encryption, no key
 * change — the {@code v1:} envelopes are byte-identical after the
 * migration.
 *
 * <p>Idempotent: a row whose stored index already equals the framed
 * recomputation is left untouched, so a failed-then-
 * {@code flyway repair}-ed rerun is safe (Flyway does not auto-rollback
 * a failed migration).
 *
 * <p>Reads stay correct throughout the transition: while a row still
 * holds its legacy index, the lookup path ({@code JpaUserRepository})
 * tries the framed index first and falls back to the legacy one. Once
 * V34 has rewritten every row and no older instance is writing legacy
 * indexes, that fallback can be retired deliberately.
 *
 * <p>Uniqueness is guarded by the V13 unique indexes
 * ({@code uq_users_email_hash} / {@code uq_users_phone_hash}), which
 * exist throughout: a reframe that would land on another row's index
 * fails the UPDATE, and the transactional migration rolls back with a
 * loud duplicate-key error — no half-mixed state. A duplicate is only
 * reachable if two rows already canonicalized to the same contact
 * (impossible while the legacy index was live — same canonical ⇒ same
 * legacy index ⇒ the index already refused it).
 *
 * <p>Java (not .sql) for the same reason as V13: the recomputation
 * needs the app's env key — SQL cannot hold it.
 */
public class V34BlindIndexFramingMigration implements JavaMigration {

    private final PiiCrypto piiCrypto;

    public V34BlindIndexFramingMigration(PiiCrypto piiCrypto) {
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
    }

    @Override
    public MigrationVersion getVersion() {
        return MigrationVersion.fromVersion("34");
    }

    @Override
    public String getDescription() {
        return "blind index framing";
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
        reframeUsers(context.getConnection());
    }

    /**
     * Recomputes {@code email_hash} / {@code phone_hash} from the
     * decrypted PII for every non-blank contact. A blank contact means
     * "absent" (V13 left it as-is: never encrypted, never indexed) and
     * has nothing to reframe.
     */
    private void reframeUsers(Connection connection) throws SQLException {
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT id, email, phone, email_hash, phone_hash FROM users")) {
            ResultSet rs = select.executeQuery();
            while (rs.next()) {
                long id = rs.getLong(1);
                if (!isAbsent(rs.getString(2))) {
                    reframe(connection, id, "email_hash", rs.getString(4),
                            piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL,
                                    PiiCrypto.canonicalEmail(decryptOrRefuse(rs.getString(2), id, "e-mail"))));
                }
                if (!isAbsent(rs.getString(3))) {
                    reframe(connection, id, "phone_hash", rs.getString(5),
                            piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_PHONE,
                                    PhoneNumbers.normalizeE164(decryptOrRefuse(rs.getString(3), id, "phone"))));
                }
            }
        }
    }

    /**
     * Writes the reframed index unless the row already carries it
     * (idempotent rerun). A write that lands on another row's index
     * fails against the V13 unique index — the migration then aborts
     * and the transaction rolls back (see the class javadoc).
     */
    private void reframe(Connection connection, long id, String hashColumn,
                         String stored, String framed) throws SQLException {
        if (framed.equals(stored)) {
            return; // already reframed — nothing to do
        }
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE users SET " + hashColumn + " = ? WHERE id = ?")) {
            update.setString(1, framed);
            update.setLong(2, id);
            update.executeUpdate();
        }
    }

    /** A non-blank contact must be a {@code v1:} envelope — fail loudly otherwise. */
    private String decryptOrRefuse(String stored, long id, String label) throws SQLException {
        if (!piiCrypto.isEncrypted(stored)) {
            throw new SQLException(
                    "V34: user " + id + " holds a non-blank unencrypted " + label
                            + " — the V13 conversion never ran on this row");
        }
        return piiCrypto.decrypt(stored);
    }

    private static boolean isAbsent(String stored) {
        return stored == null || stored.isBlank();
    }
}
