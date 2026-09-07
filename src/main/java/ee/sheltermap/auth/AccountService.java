package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * The account surface behind {@code GET /account/me} +
 * {@code PUT /account/profile} (04-CONTEXT-AUTH.md): the authenticated
 * user's real profile (name, email, phone, national ID + the real verified
 * claim set) and the password-confirmed identity edit.
 *
 * <p>Email/phone are NOT editable here — they stay on the cross-channel
 * change flows ({@link ContactChangeService}). Identity fields have no
 * second channel to prove against, so possession of the current password is
 * the gate: a stolen session cannot rewrite the identity anchor.
 */
@Service
public class AccountService {

    private final UserRepository userRepository;
    private final UserCredentialsRepository credentials;
    private final PasswordHasher passwordHasher;

    public AccountService(UserRepository userRepository,
                          UserCredentialsRepository credentials,
                          PasswordHasher passwordHasher) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
    }

    /** Real profile snapshot for GET /account/me — never an optimistic mirror. */
    @Transactional(readOnly = true)
    public MeResponse profile(RegisteredUser user) {
        return MeResponse.from(user);
    }

    /**
     * PUT /account/profile: verifies the current password BEFORE any update
     * (wrong → {@link InvalidProfilePasswordException} → 401, nothing is
     * written), then replaces name + nationalIdCode and returns the fresh
     * {@link MeResponse} so the client adopts it in one round trip.
     *
     * <p>Validation is deliberately identical to registration (blank-only,
     * values stored as given — see {@link ProfileUpdateRequest}); no
     * checksum is re-invented here.
     *
     * <p>Updating the national ID does NOT clear or add verification claims:
     * SMART-ID is a stub in v1. Follow-up — when SMART-ID lands, a code
     * change must invalidate any pending/active SMART-ID claim.
     */
    @Transactional
    public MeResponse updateProfile(RegisteredUser user, ProfileUpdateRequest request) {
        Objects.requireNonNull(request, "request");
        UserCredentials stored = credentials.findByUserId(user.getId());
        if (stored == null || !passwordHasher.verify(request.currentPassword(), stored.getPasswordHash())) {
            throw new InvalidProfilePasswordException();
        }
        user.changeName(request.name());
        user.changeNationalIdCode(request.nationalIdCode());
        userRepository.save(user);
        return MeResponse.from(user);
    }
}
