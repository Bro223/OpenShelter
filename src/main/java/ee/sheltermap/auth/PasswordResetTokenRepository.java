package ee.sheltermap.auth;

import java.time.Instant;

/**
 * Persistence seam for {@link PasswordResetToken} (03-auth.puml). Real
 * implementation in {@code ee.sheltermap.persistence}; tests may use a fake.
 *
 * <p>At most ONE active (unused, unexpired) token exists per user — a new
 * request invalidates the previous one ({@link #deleteActiveByUserId}).
 */
public interface PasswordResetTokenRepository {

    void save(PasswordResetToken token);

    /**
     * {@code null} if no token has this hash. The confirm path resolves by
     * account ({@link #findActiveByUserId}); this lookup is currently used
     * only by the persistence tests, kept as a seam capability.
     */
    PasswordResetToken findByTokenHash(String tokenHash);

    /**
     * The user's single active (unused, unexpired) token, or {@code null}
     * when the user has no pending code.
     */
    PasswordResetToken findActiveByUserId(Long userId, Instant now);

    /** Deletes the user's active (unused, unexpired) token, if any. */
    void deleteActiveByUserId(Long userId, Instant now);

    void markUsed(Long id);
}
