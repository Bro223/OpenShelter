package ee.sheltermap.persistence;

import ee.sheltermap.auth.PasswordResetToken;
import ee.sheltermap.auth.PasswordResetTokenRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

/**
 * JPA implementation of {@link PasswordResetTokenRepository}.
 * Codes are stored hashed (SHA-256); single-use is enforced by
 * {@code usedAt} + the service logic.
 */
@Repository
public class JpaPasswordResetTokenRepository implements PasswordResetTokenRepository {

    private final SpringDataPasswordResetTokenRepository tokens;

    public JpaPasswordResetTokenRepository(SpringDataPasswordResetTokenRepository tokens) {
        this.tokens = Objects.requireNonNull(tokens, "tokens");
    }

    @Override
    @Transactional
    public void save(PasswordResetToken token) {
        PasswordResetTokenEntity entity = toEntity(token);
        PasswordResetTokenEntity saved = tokens.save(entity);
        token.setId(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public PasswordResetToken findByTokenHash(String tokenHash) {
        return tokens.findByTokenHash(tokenHash).map(JpaPasswordResetTokenRepository::toDomain).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public PasswordResetToken findActiveByUserId(Long userId, Instant now) {
        return tokens.findFirstByUserIdAndUsedAtIsNullAndExpiresAtGreaterThan(userId, now)
                .map(JpaPasswordResetTokenRepository::toDomain)
                .orElse(null);
    }

    @Override
    @Transactional
    public void deleteActiveByUserId(Long userId, Instant now) {
        tokens.deleteActiveByUserId(userId, now);
    }

    @Override
    @Transactional
    public void markUsed(Long id) {
        tokens.markUsed(id, Instant.now());
    }

    private static PasswordResetTokenEntity toEntity(PasswordResetToken token) {
        PasswordResetTokenEntity entity = new PasswordResetTokenEntity();
        entity.setId(token.getId());
        entity.setUserId(token.getUserId());
        entity.setTokenHash(token.getTokenHash());
        entity.setExpiresAt(token.getExpiresAt());
        entity.setUsedAt(token.getUsedAt());
        entity.setAttempts(token.getAttempts());
        return entity;
    }

    private static PasswordResetToken toDomain(PasswordResetTokenEntity entity) {
        PasswordResetToken token = new PasswordResetToken(
                entity.getUserId(), entity.getTokenHash(), entity.getExpiresAt(),
                entity.getUsedAt(), entity.getAttempts());
        token.setId(entity.getId());
        return token;
    }
}
