package ee.sheltermap.auth;

/**
 * Persistence seam for {@link PasswordResetToken} (03-auth.puml). Real
 * implementation in {@code ee.sheltermap.persistence} (Step 3); tests may
 * use a fake.
 */
public interface PasswordResetTokenRepository {

    void save(PasswordResetToken token);

    /** {@code null} if no token has this hash. */
    PasswordResetToken findByTokenHash(String tokenHash);

    void markUsed(Long id);
}
