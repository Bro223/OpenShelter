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
    public int revoke(String tokenHash) {
        // Mirrors the conditional UPDATE semantics (S4): claims revocation of
        // an UNKNOWN or ALREADY-REVOKED token claim 0 rows.
        RefreshTokenRecord record = store.get(tokenHash);
        if (record == null || record.revokedAt() != null) {
            return 0;
        }
        store.put(tokenHash, new RefreshTokenRecord(record.userId(), record.tokenHash(), record.expiresAt(), clock.instant()));
        return 1;
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
