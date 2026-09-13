package ee.sheltermap.app;

import ee.sheltermap.domain.User;
import ee.sheltermap.domain.RegisteredUser;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Persistence seam for {@link User}. Real implementation in
 * {@code ee.sheltermap.persistence} (Step 3); tests use an in-memory fake.
 */
public interface UserRepository {

    void save(User user);

    /**
     * Deletes the user row (legal-recovery M4 slice 2 — account erasure).
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
     * Batched lookup by ids (hardening: removes the N+1 author lookup in
     * review listings). Missing ids are simply absent from the result map.
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
     * Whether the row behind {@code userId} is suspended (M10 slice 1) —
     * the COLUMN-ONLY read the JWT filter uses per token-bearing request
     * (no domain mapping, no PII decrypt; unknown ids are {@code false},
     * the same convention as {@link #isAdmin} — a deleted account's token
     * keeps authenticating, the erasure contract from legal-recovery M4
     * slice 2: the JWT stays valid until expiry). Suspension is the only
     * case where a valid token authenticates nothing.
     */
    boolean isSuspended(long userId);

    /**
     * Every user row (moderation-dashboard-completion M10 slice 1 — the
     * admin Users tab lists REGISTERED + ADMIN accounts; the projection
     * filters the kinds, the seam returns all of them so the "the list is
     * the whole account population" invariant stays in one place).
     * Ordered by id for a stable tab.
     */
    List<User> findAll();
}
