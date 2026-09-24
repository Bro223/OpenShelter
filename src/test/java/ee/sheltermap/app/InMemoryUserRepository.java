package ee.sheltermap.app;

import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.RegisteredUser;

import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
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
    public void delete(Long userId) {
        store.remove(userId);
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

    @Override
    public boolean isAdmin(long userId) {
        // The in-memory domain hierarchy now HAS an admin kind (AdminUser) —
        // answer from the domain class, the mirror
        // of the JPA impl's users.kind-column check.
        return store.get(userId) instanceof AdminUser;
    }

    @Override
    public boolean isSuspended(long userId) {
        // Unknown ids are false (the JPA convention): a deleted account's
        // token keeps authenticating until expiry.
        User user = store.get(userId);
        return user != null && user.isSuspended();
    }

    @Override
    public boolean existsById(long userId) {
        return store.containsKey(userId);
    }

    @Override
    public List<User> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public List<User> findAccountPage(long offset, int limit) {
        // Mirrors the JPA query: the tab's kinds only (REGISTERED + ADMIN
        // — GUEST rows have no credentials to suspend), id-ordered,
        // OFFSET/LIMIT (the JPA impl excludes GUESTs in the SQL; the fake
        // excludes them here so a page never loads the whole population).
        return store.values().stream()
                .filter(u -> u instanceof AdminUser || u instanceof RegisteredUser)
                .sorted(Comparator.comparing(User::getId))
                .skip(offset)
                .limit(limit)
                .toList();
    }

    @Override
    public long countAccounts() {
        return store.values().stream()
                .filter(u -> u instanceof AdminUser || u instanceof RegisteredUser)
                .count();
    }

    @Override
    public void markActive(long userId, Instant at) {
        User user = store.get(userId);
        if (user != null) {
            user.markActive(at);
        }
    }

    @Override
    public void lockForUpdate(long userId) {
        // The lock is a DB-level serialization (SELECT ... FOR UPDATE held
        // until the caller's transaction commits); the in-memory fake has
        // no concurrency to serialize — no-op.
    }

    @Override
    public List<User> findInactiveBefore(Instant cutoff) {
        // Mirrors the JPA query: REGISTERED-kind only (AdminUser is-a
        // RegisteredUser — it is the domain mirror of the kind column and
        // must be excluded here too), and an unstamped row cannot occur
        // (the column is NOT NULL; the JPA impl only ever sees stamped
        // rows, so a null stamp is filtered out rather than pruned).
        return store.values().stream()
                .filter(u -> u instanceof RegisteredUser)
                .filter(u -> !(u instanceof AdminUser))
                .filter(u -> u.getLastActivityAt() != null && u.getLastActivityAt().isBefore(cutoff))
                .toList();
    }
}
