package ee.sheltermap.auth;

import java.util.LinkedHashMap;
import java.util.Map;

/** In-memory fake of {@link UserCredentialsRepository} for tests. */
public class InMemoryUserCredentialsRepository implements UserCredentialsRepository {

    private final Map<Long, UserCredentials> store = new LinkedHashMap<>();

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
        credentials.updateHash(newHash);
    }

    public Map<Long, UserCredentials> all() {
        return Map.copyOf(store);
    }
}
