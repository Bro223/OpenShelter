package ee.sheltermap.auth;

/**
 * Persistence seam for {@link UserCredentials}. Real implementation in
 * {@code ee.sheltermap.persistence} (Step 3); tests may use a fake.
 */
public interface UserCredentialsRepository {

    void save(UserCredentials credentials);

    /** {@code null} if this user has no credentials. */
    UserCredentials findByUserId(Long userId);

    /** Replaces the password hash and stamps {@code changedAt}. */
    void updateHash(Long userId, String newHash);
}
