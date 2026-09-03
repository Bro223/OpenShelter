package ee.sheltermap.auth;

import ee.sheltermap.app.UserService;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.PhoneNumbers;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
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

    /**
     * Creates the profile (no claims yet) and stores the Argon2id password hash.
     *
     * <p>Hardening: email and phone are unique (V3). A duplicate is rejected
     * with {@link DuplicateAccountException} → 409 — pre-checked to give a
     * clean error, and the DB unique index is the race-safe backstop (a
     * concurrent duplicate surfaces as {@link DataIntegrityViolationException},
     * converted to the same 409). The whole register is one transaction:
     * profile + credentials are created atomically.
     */
    @Transactional
    public void register(RegisterRequest request) {
        Objects.requireNonNull(request, "request");
        // Canonical email identity (P2 fix): lower-case BEFORE the uniqueness
        // check. The V3 unique index is case-sensitive, so without this,
        // "Foo@x.com" and "foo@x.com" could both be stored (the pre-check is
        // case-insensitive) and login would later hit IncorrectResultSize.
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmail(email) != null) {
            throw new DuplicateAccountException("an account with this email already exists");
        }
        // Canonical phone identity (hardening): normalize to E.164 BEFORE the
        // uniqueness check so "+37250000000" and "50000000" collide → 409.
        String phone = PhoneNumbers.normalizeE164(request.phone());
        if (users.findByPhone(phone) != null) {
            throw new DuplicateAccountException("an account with this phone already exists");
        }
        try {
            RegisteredUser user = users.register(request.name(), email, phone, request.nationalIdCode());
            credentials.save(new UserCredentials(user.getId(), passwordHasher.hash(request.password())));
        } catch (DataIntegrityViolationException e) {
            // concurrent duplicate slipped past the pre-check — same 409
            throw new DuplicateAccountException("an account with this email or phone already exists");
        }
    }

    /**
     * Login by email or phone. One generic error for unknown user and wrong
     * password — the API never reveals which.
     */
    public TokenResponse login(LoginRequest request) {
        // P2 fix: normalize the phone before lookup so "51234567" matches an
        // account registered as "+37251234567" (the phone is canonical E.164).
        String contact = request.emailOrPhone();
        if (contact != null && !contact.contains("@")) {
            contact = PhoneNumbers.normalizeE164(contact);
        }
        RegisteredUser user = users.findByEmailOrPhone(contact);
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
