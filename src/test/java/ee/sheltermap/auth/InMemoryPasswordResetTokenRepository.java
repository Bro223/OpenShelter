package ee.sheltermap.auth;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** In-memory fake of {@link PasswordResetTokenRepository} for tests. */
public class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {

    private final Map<String, PasswordResetToken> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(PasswordResetToken token) {
        if (token.getId() == null) {
            token.setId(nextId++);
        }
        store.put(token.getTokenHash(), token);
    }

    @Override
    public PasswordResetToken findByTokenHash(String tokenHash) {
        return store.get(tokenHash);
    }

    @Override
    public void markUsed(Long id) {
        store.values().stream()
                .filter(t -> id.equals(t.getId()))
                .findFirst()
                .ifPresent(PasswordResetToken::markUsed);
    }

    public List<PasswordResetToken> all() {
        return List.copyOf(store.values());
    }
}
