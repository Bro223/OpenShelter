package ee.sheltermap.auth;

import ee.sheltermap.app.UserService;
import ee.sheltermap.domain.RegisteredUser;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Authentication orchestration (03-auth.puml): registration, login with
 * generic errors (no enumeration), refresh/logout via {@link TokenService},
 * and password reset delegated to {@link PasswordResetService}.
 */
@Service
public class AuthService {

    private final UserService users;
    private final PasswordHasher passwordHasher;
    private final UserCredentialsRepository credentials;
    private final TokenService tokens;
    private final PasswordResetService passwordReset;

    public AuthService(UserService users,
                       PasswordHasher passwordHasher,
                       UserCredentialsRepository credentials,
                       TokenService tokens,
                       PasswordResetService passwordReset) {
        this.users = Objects.requireNonNull(users, "users");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.tokens = Objects.requireNonNull(tokens, "tokens");
        this.passwordReset = Objects.requireNonNull(passwordReset, "passwordReset");
    }

    /** Creates the profile (no claims yet) and stores the Argon2id password hash. */
    public void register(RegisterRequest request) {
        Objects.requireNonNull(request, "request");
        RegisteredUser user = users.register(request.name(), request.email(), request.phone(), request.nationalIdCode());
        credentials.save(new UserCredentials(user.getId(), passwordHasher.hash(request.password())));
    }

    /**
     * Login by email or phone. One generic error for unknown user and wrong
     * password — the API never reveals which.
     */
    public TokenResponse login(LoginRequest request) {
        RegisteredUser user = users.findByEmailOrPhone(request.emailOrPhone());
        UserCredentials stored = user == null ? null : credentials.findByUserId(user.getId());
        if (stored == null || !passwordHasher.verify(request.password(), stored.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return tokens.issue(user);
    }

    public TokenResponse refresh(RefreshRequest request) {
        return tokens.refresh(request.refreshToken());
    }

    public void logout(String refreshToken) {
        tokens.revoke(refreshToken);
    }

    public void requestPasswordReset(String email) {
        passwordReset.requestReset(email);
    }

    public void resetPassword(String token, String newPassword) {
        if (!passwordReset.reset(token, newPassword)) {
            throw new InvalidResetTokenException();
        }
    }
}
