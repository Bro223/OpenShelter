package ee.sheltermap.auth;

import java.time.Instant;

/**
 * Persistence seam for hashed refresh tokens (03-auth.puml). Real
 * implementation in {@code ee.sheltermap.persistence} (Step 3); tests may
 * use a fake.
 */
public interface RefreshTokenRepository {

    void save(String tokenHash, Long userId, Instant expiresAt);

    /** {@code null} if no token has this hash. */
    RefreshTokenRecord findByTokenHash(String tokenHash);

    /**
     * Atomically claims revocation: a conditional
     * {@code UPDATE ... SET revoked_at=now WHERE token_hash=? AND revoked_at IS NULL}.
     * Concurrent racers serialize on the row lock — exactly one of them gets
     * {@code 1}, the rest get {@code 0} (the rotation TOCTOU fix, S4).
     *
     * @return the number of rows revoked ({@code 1} claimed, {@code 0} if
     *         the token was unknown or already revoked)
     */
    int revoke(String tokenHash);

    void revokeAllForUser(Long userId);

    /** How many of the user's tokens are still active (unrevoked). */
    int countActiveByUserId(Long userId);
}
