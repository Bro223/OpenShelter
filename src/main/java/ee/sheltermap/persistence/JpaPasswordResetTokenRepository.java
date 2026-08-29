package ee.sheltermap.persistence;

import ee.sheltermap.auth.PasswordResetToken;
import ee.sheltermap.auth.PasswordResetTokenRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

/**
 * JPA implementation of {@link PasswordResetTokenRepository} (approach B).
 * Tokens are stored hashed (SHA-256); single-use is enforced by
 * {@code usedAt} + the service logic in Step 4.
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
        return entity;
    }

    private static PasswordResetToken toDomain(PasswordResetTokenEntity entity) {
        PasswordResetToken token = new PasswordResetToken(
                entity.getUserId(), entity.getTokenHash(), entity.getExpiresAt(), entity.getUsedAt());
        token.setId(entity.getId());
        return token;
    }
}
