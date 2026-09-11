package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;

/**
 * Channel adapter for one verification method (TIJ Ch 9).
 *
 * <p>Providers are <strong>pure channel adapters — they never touch the
 * database</strong>. They generate, send and validate codes;
 * {@link VerificationService} owns all persistence ({@link PendingVerification}
 * and verification claims).
 *
 * <p>One class per verification method, because each method needs different
 * collaborators injected (SMTP client vs Twilio SDK vs Smart-ID SDK).
 */
public interface VerificationProvider {

    /** Stable code recorded on claims produced by this provider (e.g. "sms", "smtp"). */
    String providerCode();

    /** The verification level this provider proves. */
    VerificationLevel level();

    /**
     * Starts verification: generates a code/token, sends it via the channel
     * and returns the pending verification. The code is stored <em>hashed</em>
     * ({@link PendingVerification#getCodeHash()}), never plaintext.
     */
    PendingVerification request(RegisteredUser user);

    /**
     * Validates {@code code} against {@code pending} (hash + attempts limit +
     * expiry). Providers never persist anything — callers decide what happens
     * on success.
     */
    boolean confirm(RegisteredUser user, PendingVerification pending, String code);
}
