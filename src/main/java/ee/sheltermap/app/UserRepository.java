package ee.sheltermap.app;

import ee.sheltermap.domain.User;
import ee.sheltermap.domain.RegisteredUser;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Persistence seam for {@link User}. Real implementation in
 * {@code ee.sheltermap.persistence}; tests use an in-memory fake.
 */
public interface UserRepository {

    void save(User user);

    /**
     * Deletes the user row (legal-recovery — account erasure).
     * The JPA implementation relies on the DB FK policy — every child
     * {@code user_id} is ON DELETE CASCADE and {@code shelters.created_by}
     * is ON DELETE SET NULL (the erasure service orphans the public rows
     * explicitly first); the in-memory fake removes the user row only.
     */
    void delete(Long userId);

    /** {@code null} if no user has this id (contract from 01-user-verification.puml). */
    User findById(Long id);

    /**
     * Registered user by exact email (case-insensitive match); {@code null} if
     * none. Contract from 03-auth.puml (login + password-reset lookups).
     */
    RegisteredUser findByEmail(String email);

    /** Registered user by exact phone; {@code null} if none (03-auth.puml). */
    RegisteredUser findByPhone(String phone);

    /**
     * Batched lookup by ids — removes the N+1 author lookup in
     * shelter listings). Missing ids are simply absent from the result map.
     */
    Map<Long, User> findByIds(Collection<Long> ids);

    /**
     * Whether the row behind {@code userId} is of ADMIN kind (the
     * per-user active-shelter cap is skipped for admins —
     * shelter-trust-and-reports D3). v1 has no admin accounts (the domain
     * hierarchy predates them), so the JPA impl answers from the
     * {@code users.kind} column and every other impl answers {@code false};
     * unknown ids are {@code false}.
     */
    boolean isAdmin(long userId);

    /**
     * Whether the row behind {@code userId} is suspended —
     * the COLUMN-ONLY read the JWT filter uses per token-bearing request
     * (no domain mapping, no PII decrypt; unknown ids are {@code false},
     * the same convention as {@link #isAdmin} — a deleted account's token
     * keeps authenticating, the erasure contract from legal-recovery: the
     * JWT stays valid until expiry). Suspension is the only
     * case where a valid token authenticates nothing.
     */
    boolean isSuspended(long userId);

    /**
     * Whether a row with {@code userId} exists —
     * the COLUMN-ONLY read the PUBLIC detail read uses per token-bearing
     * request (no domain mapping, no PII decrypt, no claims load — the
     * projection only ever needs the caller's id). Unknown ids are
     * {@code false}, the same convention as {@link #isSuspended} — a
     * deleted account's token keeps authenticating (legal-recovery), and
     * the read degrades to the guest projection for it.
     */
    boolean existsById(long userId);

    /**
     * Every user row (moderation-dashboard-completion — the
     * admin Users tab lists REGISTERED + ADMIN accounts; the projection
     * filters the kinds, the seam returns all of them so the "the list is
     * the whole account population" invariant stays in one place).
     * Ordered by id for a stable tab.
     */
    List<User> findAll();

    /**
     * Stamps sign-in activity (retention-pruning): a registration,
     * a successful login, or a refresh rotation. Column-only write —
     * the auth paths must not pay a full aggregate re-save (PII
     * re-encryption, claim diff) on every credential use. Unknown ids
     * are a no-op (the same convention as the column-only reads above).
     */
    void markActive(long userId, Instant at);

    /**
     * Acquires a row-level lock on the user row for the duration of the
     * CALLER's transaction (the per-user serialization seam for the
     * read-check-write shelter caps in {@code ShelterService.addPlace}).
     * The JPA implementation is {@code SELECT ... FOR UPDATE}: a concurrent
     * submission by the same user blocks until the first one's transaction
     * commits, then its cap checks run against the committed row — exactly
     * one winner. A count cap (and the fuzzy 100 m near-duplicate rule)
     * cannot be expressed as a DB constraint, so the row lock is the guard.
     * Must be called from a {@code @Transactional} method — outside a
     * transaction the lock is released immediately and serializes nothing.
     * Unknown ids are a no-op (the row is gone; nothing to serialize
     * against), the same convention as the column-only writes.
     */
    void lockForUpdate(long userId);

    /**
     * The REGISTERED-kind accounts whose last sign-in activity is
     * strictly before {@code cutoff} — the retention job's prune
     * candidates. ADMIN rows never qualify (the job must NEVER prune an
     * admin, no matter how idle) and GUEST rows have no sign-in route,
     * so neither kind is returned. Ordered by id for a deterministic run.
     */
    List<User> findInactiveBefore(Instant cutoff);
}
