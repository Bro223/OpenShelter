package ee.sheltermap.auth;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** In-memory fake of {@link UserCredentialsRepository} for tests. */
public class InMemoryUserCredentialsRepository implements UserCredentialsRepository {

    private final Map<Long, UserCredentials> store = new LinkedHashMap<>();
    private final Clock clock;

    public InMemoryUserCredentialsRepository(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public void save(UserCredentials credentials) {
        store.put(credentials.getUserId(), credentials);
    }

    @Override
    public UserCredentials findByUserId(Long userId) {
        return store.get(userId);
    }

    @Override
    public void updateHash(Long userId, String newHash) {
        UserCredentials credentials = store.get(userId);
        if (credentials == null) {
            throw new IllegalArgumentException("no credentials for user " + userId);
        }
        credentials.updateHash(newHash, clock.instant());
    }

    public Map<Long, UserCredentials> all() {
        return Map.copyOf(store);
    }
}
