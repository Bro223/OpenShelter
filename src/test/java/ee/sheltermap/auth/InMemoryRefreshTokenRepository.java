package ee.sheltermap.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** In-memory fake of {@link RefreshTokenRepository} for tests. */
public class InMemoryRefreshTokenRepository implements RefreshTokenRepository {

    private final Map<String, RefreshTokenRecord> store = new LinkedHashMap<>();
    private final Clock clock;

    public InMemoryRefreshTokenRepository(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void save(String tokenHash, Long userId, Instant expiresAt) {
        store.put(tokenHash, new RefreshTokenRecord(userId, tokenHash, expiresAt, null));
    }

    @Override
    public RefreshTokenRecord findByTokenHash(String tokenHash) {
        return store.get(tokenHash);
    }

    @Override
    public void revoke(String tokenHash) {
        RefreshTokenRecord record = store.get(tokenHash);
        if (record != null) {
            store.put(tokenHash, new RefreshTokenRecord(record.userId(), record.tokenHash(), record.expiresAt(), clock.instant()));
        }
    }

    @Override
    public void revokeAllForUser(Long userId) {
        store.replaceAll((hash, record) ->
                record.userId().equals(userId) && record.revokedAt() == null
                        ? new RefreshTokenRecord(record.userId(), record.tokenHash(), record.expiresAt(), clock.instant())
                        : record);
    }

    public List<RefreshTokenRecord> all() {
        return List.copyOf(store.values());
    }
}
