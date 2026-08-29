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

    void revoke(String tokenHash);

    void revokeAllForUser(Long userId);
}
