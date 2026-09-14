package ee.sheltermap.persistence;

import ee.sheltermap.auth.RefreshTokenRecord;
import ee.sheltermap.auth.RefreshTokenRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

/**
 * JPA implementation of {@link RefreshTokenRepository} (approach B). Tokens
 * are stored hashed (SHA-256); revocation is a timestamp update, never a
 * delete — sessions die by being revoked, not by disappearing. The stamp
 * comes from the injected {@link Clock} (the codebase-wide convention, so
 * tests can pin it).
 */
@Repository
public class JpaRefreshTokenRepository implements RefreshTokenRepository {

    private final SpringDataRefreshTokenRepository tokens;
    private final Clock clock;

    public JpaRefreshTokenRepository(SpringDataRefreshTokenRepository tokens, Clock clock) {
        this.tokens = Objects.requireNonNull(tokens, "tokens");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    @Transactional
    public void save(String tokenHash, Long userId, Instant expiresAt) {
        tokens.save(new RefreshTokenEntity(tokenHash, userId, expiresAt));
    }

    @Override
    @Transactional(readOnly = true)
    public RefreshTokenRecord findByTokenHash(String tokenHash) {
        return tokens.findByTokenHash(tokenHash)
                .map(e -> new RefreshTokenRecord(e.getUserId(), e.getTokenHash(), e.getExpiresAt(), e.getRevokedAt()))
                .orElse(null);
    }

    @Override
    @Transactional
    public int revoke(String tokenHash) {
        return tokens.revokeByTokenHash(tokenHash, clock.instant());
    }

    @Override
    @Transactional
    public void revokeAllForUser(Long userId) {
        tokens.revokeAllByUserId(userId, clock.instant());
    }
}
