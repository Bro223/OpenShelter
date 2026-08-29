package ee.sheltermap.app;

import ee.sheltermap.domain.User;
import ee.sheltermap.domain.RegisteredUser;

/**
 * Persistence seam for {@link User}. Real implementation in
 * {@code ee.sheltermap.persistence} (Step 3); tests use an in-memory fake.
 */
public interface UserRepository {

    void save(User user);

    /** {@code null} if no user has this id (contract from 01-user-verification.puml). */
    User findById(Long id);

    /**
     * Registered user by exact email (case-insensitive match); {@code null} if
     * none. Contract from 03-auth.puml (login + password-reset lookups).
     */
    RegisteredUser findByEmail(String email);

    /** Registered user by exact phone; {@code null} if none (03-auth.puml). */
    RegisteredUser findByPhone(String phone);
}
