package ee.sheltermap.persistence;

import ee.sheltermap.auth.UserCredentials;
import ee.sheltermap.auth.UserCredentialsRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

/**
 * JPA implementation of {@link UserCredentialsRepository} (approach B).
 * {@code userId} is the primary key — one credential row per user.
 */
@Repository
public class JpaUserCredentialsRepository implements UserCredentialsRepository {

    private final SpringDataUserCredentialsRepository credentials;

    public JpaUserCredentialsRepository(SpringDataUserCredentialsRepository credentials) {
        this.credentials = Objects.requireNonNull(credentials, "credentials");
    }

    @Override
    @Transactional
    public void save(UserCredentials c) {
        UserCredentialsEntity entity = credentials.findById(c.getUserId()).orElse(null);
        if (entity == null) {
            entity = new UserCredentialsEntity();
            entity.setUserId(c.getUserId());
            entity.setCreatedAt(c.getCreatedAt());
        }
        entity.setPasswordHash(c.getPasswordHash());
        entity.setChangedAt(c.getChangedAt());
        credentials.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public UserCredentials findByUserId(Long userId) {
        return credentials.findById(userId).map(JpaUserCredentialsRepository::toDomain).orElse(null);
    }

    @Override
    @Transactional
    public void updateHash(Long userId, String newHash) {
        UserCredentialsEntity entity = credentials.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("no credentials for user " + userId));
        entity.setPasswordHash(newHash);
        entity.setChangedAt(Instant.now());
        credentials.save(entity);
    }

    private static UserCredentials toDomain(UserCredentialsEntity entity) {
        return new UserCredentials(entity.getUserId(), entity.getPasswordHash(),
                entity.getCreatedAt(), entity.getChangedAt());
    }
}
