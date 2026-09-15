package ee.sheltermap.auth;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * In-memory fake of {@link PasswordResetTokenRepository} for tests. Rows
 * carry a {@code created_at} stamp (V8) taken from the injected clock, so
 * the rotation cooldown / per-UTC-day cap logic is testable deterministically.
 */
public class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {

    private final Map<String, PasswordResetToken> store = new LinkedHashMap<>();
    /** V8 created_at per stored row (keyed by token hash). */
    private final Map<String, Instant> createdAtByHash = new LinkedHashMap<>();
    private final Clock clock;
    private long nextId = 1;

    public InMemoryPasswordResetTokenRepository(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void save(PasswordResetToken token) {
        if (token.getId() == null) {
            token.setId(nextId++);
        }
        Instant createdAt = createdAtByHash.get(token.getTokenHash());
        if (createdAt == null) {
            createdAt = clock.instant();
            createdAtByHash.put(token.getTokenHash(), createdAt);
        }
        if (token.getCreatedAt() == null) {
            token.setCreatedAt(createdAt);
        }
        store.put(token.getTokenHash(), token);
    }

    @Override
    public PasswordResetToken findActiveByUserId(Long userId, Instant now) {
        return store.values().stream()
                .filter(t -> userId.equals(t.getUserId()))
                .filter(t -> !t.isUsed())
                .filter(t -> !t.isExpired(now))
                .findFirst()
                .orElse(null);
    }

    @Override
    public void deleteActiveByUserId(Long userId, Instant now) {
        store.values().stream()
                .filter(t -> userId.equals(t.getUserId()))
                .filter(t -> !t.isUsed())
                .filter(t -> !t.isExpired(now))
                .map(PasswordResetToken::getTokenHash)
                .forEach(createdAtByHash::remove);
        store.values().removeIf(t -> userId.equals(t.getUserId())
                && !t.isUsed()
                && !t.isExpired(now));
    }

    @Override
    public Instant findLatestCreatedAtByUserId(Long userId) {
        return store.values().stream()
                .filter(t -> userId.equals(t.getUserId()))
                .map(PasswordResetToken::getTokenHash)
                .map(createdAtByHash::get)
                .filter(java.util.Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
    }

    @Override
    public long countCreatedOnUtcDayByUserId(Long userId, LocalDate utcDay) {
        return store.values().stream()
                .filter(t -> userId.equals(t.getUserId()))
                .map(PasswordResetToken::getTokenHash)
                .map(createdAtByHash::get)
                .filter(java.util.Objects::nonNull)
                .filter(createdAt -> createdAt.atZone(ZoneOffset.UTC).toLocalDate().equals(utcDay))
                .count();
    }

    @Override
    public void deleteExpiredByUserId(Long userId, Instant now) {
        store.values().stream()
                .filter(t -> userId.equals(t.getUserId()))
                .filter(t -> t.getExpiresAt().isBefore(now))
                .map(PasswordResetToken::getTokenHash)
                .forEach(createdAtByHash::remove);
        store.values().removeIf(t -> userId.equals(t.getUserId())
                && t.getExpiresAt().isBefore(now));
    }

    public List<PasswordResetToken> all() {
        return List.copyOf(store.values());
    }
}
