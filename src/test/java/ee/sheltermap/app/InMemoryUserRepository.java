package ee.sheltermap.app;

import ee.sheltermap.domain.User;
import ee.sheltermap.domain.RegisteredUser;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** In-memory fake of {@link UserRepository} for tests. */
public class InMemoryUserRepository implements UserRepository {

    private final Map<Long, User> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(User user) {
        if (user.getId() == null) {
            user.setId(nextId++);
        }
        store.put(user.getId(), user);
    }

    @Override
    public User findById(Long id) {
        return store.get(id);
    }

    @Override
    public RegisteredUser findByEmail(String email) {
        return store.values().stream()
                .filter(u -> u instanceof RegisteredUser r && email != null && email.equalsIgnoreCase(r.getData().email()))
                .map(u -> (RegisteredUser) u)
                .findFirst()
                .orElse(null);
    }

    @Override
    public RegisteredUser findByPhone(String phone) {
        return store.values().stream()
                .filter(u -> u instanceof RegisteredUser r && phone != null && phone.equals(r.getData().phone()))
                .map(u -> (RegisteredUser) u)
                .findFirst()
                .orElse(null);
    }

    @Override
    public Map<Long, User> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, User> result = new LinkedHashMap<>();
        for (Long id : ids) {
            User user = store.get(id);
            if (user != null) {
                result.put(id, user);
            }
        }
        return result;
    }

    public List<User> findAll() {
        return List.copyOf(store.values());
    }
}
