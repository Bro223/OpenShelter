package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.SmtpSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Password reset (03-auth.puml): 32-char URL token, 15 min TTL, stored
 * SHA-256-hashed, single-use. {@link #requestReset} always "succeeds" — never
 * reveals whether an email is registered (no enumeration). A successful reset
 * revokes <em>all</em> refresh tokens for the user (old sessions die).
 */
@Service
public class PasswordResetService {

    static final int TOKEN_LENGTH = 32;
    static final Duration TOKEN_TTL = Duration.ofMinutes(15);

    private final UserRepository users;
    private final UserCredentialsRepository credentials;
    private final PasswordResetTokenRepository tokens;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordHasher passwordHasher;
    private final SmtpSender smtpSender;
    private final Clock clock;
    private final String resetUrlPrefix;

    public PasswordResetService(UserRepository users,
                                UserCredentialsRepository credentials,
                                PasswordResetTokenRepository tokens,
                                RefreshTokenRepository refreshTokens,
                                PasswordHasher passwordHasher,
                                SmtpSender smtpSender,
                                Clock clock,
                                @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.users = Objects.requireNonNull(users, "users");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.tokens = Objects.requireNonNull(tokens, "tokens");
        this.refreshTokens = Objects.requireNonNull(refreshTokens, "refreshTokens");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.smtpSender = Objects.requireNonNull(smtpSender, "smtpSender");
        this.clock = Objects.requireNonNull(clock, "clock");
        String base = frontendBaseUrl == null || frontendBaseUrl.isBlank()
                ? "http://localhost:5173"
                : frontendBaseUrl.replaceAll("/+$", "");
        this.resetUrlPrefix = base + "/reset?token=";
    }

    /**
     * Issues a reset token for the account with {@code email} and e-mails the
     * reset link (built from {@code app.frontend.base-url}, never a hardcoded
     * domain — hardening pass). For unknown emails this is a silent no-op —
     * callers cannot distinguish it from success.
     */
    public void requestReset(String email) {
        Objects.requireNonNull(email, "email");
        RegisteredUser user = users.findByEmail(email);
        if (user == null || user.getId() == null) {
            return;
        }
        String token = Tokens.random(TOKEN_LENGTH);
        Instant now = clock.instant();
        tokens.save(new PasswordResetToken(user.getId(), Hashes.sha256Hex(token), now.plus(TOKEN_TTL)));
        smtpSender.send(user.getData().email(), resetUrlPrefix + token);
    }

    /**
     * Validates the token, sets the new password, marks the token used and
     * revokes every refresh token of the user — all in ONE transaction
     * (hardening pass: previously three separate transactions; a failure
     * mid-way could leave the token replayable).
     *
     * @return {@code true} only when the token was valid, unused and unexpired.
     */
    @Transactional
    public boolean reset(String token, String newPassword) {
        Objects.requireNonNull(token, "token");
        Objects.requireNonNull(newPassword, "newPassword");
        PasswordResetToken stored = tokens.findByTokenHash(Hashes.sha256Hex(token));
        Instant now = clock.instant();
        if (stored == null || stored.isUsed() || stored.isExpired(now)) {
            return false;
        }
        credentials.updateHash(stored.getUserId(), passwordHasher.hash(newPassword));
        tokens.markUsed(stored.getId());
        refreshTokens.revokeAllForUser(stored.getUserId());
        return true;
    }
}
