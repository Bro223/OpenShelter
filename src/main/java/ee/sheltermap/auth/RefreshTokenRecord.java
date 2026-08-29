package ee.sheltermap.auth;

import java.time.Instant;

/**
 * Immutable view of a stored refresh-token row (03-auth.puml).
 * {@code revokedAt} is {@code null} while the token is active.
 */
public record RefreshTokenRecord(Long userId, String tokenHash, Instant expiresAt, Instant revokedAt) {
}
