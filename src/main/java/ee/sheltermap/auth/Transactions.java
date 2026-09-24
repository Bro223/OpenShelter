package ee.sheltermap.auth;

import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

/**
 * The service-owned transaction seam (the byte-identical private
 * {@code inTransaction(Supplier)} method was copy-pasted into
 * {@link PasswordResetService} and {@link ContactChangeService}, the
 * ShelterImportService idiom): runs {@code work} in ONE transaction when
 * a transaction manager is present; in plain unit tests (in-memory fakes,
 * null manager) it runs directly.
 *
 * <p>The boundary belongs to the service because the provider send sits
 * OUTSIDE any transaction (send-first-then-commit, reviews F2), so the
 * seam is called per phase, not around the whole flow. Package-private:
 * it is a wiring detail of the auth services, not a public API.
 */
final class Transactions {

    private Transactions() {
    }

    /** Runs {@code work} in one transaction, or directly when {@code tx} is null. */
    static <T> T in(TransactionTemplate tx, Supplier<T> work) {
        if (tx == null) {
            return work.get();
        }
        return tx.execute(status -> work.get());
    }
}
