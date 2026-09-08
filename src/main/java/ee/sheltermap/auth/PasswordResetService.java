package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.SmtpSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Password reset (03-auth.puml): a 6-digit one-time code e-mailed to the
 * account address (no URL link), 15 min TTL, stored SHA-256-hashed,
 * single-use, 5 failed attempts per code. {@link #requestReset} always
 * "succeeds" — never reveals whether an email is registered (no
 * enumeration); a new request invalidates the previous code (one active
 * code per user). A successful reset revokes <em>all</em> refresh tokens
 * for the user (old sessions die).
 *
 * <p>The confirm side finds the pending code by the account (the e-mail
 * from the request, which the reset page still has) and compares the code
 * hash constant-time — the same discipline as verification and
 * contact-change codes: a wrong code is counted as a failed attempt and
 * five failures lock the code out, so a 6-digit code cannot be
 * brute-forced. Every failure mode is indistinguishable to the caller.
 */
@Service
public class PasswordResetService {

    static final Duration CODE_TTL = Duration.ofMinutes(15);
    static final int MAX_ATTEMPTS = 5;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final UserCredentialsRepository credentials;
    private final PasswordResetTokenRepository tokens;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordHasher passwordHasher;
    private final SmtpSender smtpSender;
    private final Clock clock;

    public PasswordResetService(UserRepository users,
                                UserCredentialsRepository credentials,
                                PasswordResetTokenRepository tokens,
                                RefreshTokenRepository refreshTokens,
                                PasswordHasher passwordHasher,
                                SmtpSender smtpSender,
                                Clock clock) {
        this.users = Objects.requireNonNull(users, "users");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.tokens = Objects.requireNonNull(tokens, "tokens");
        this.refreshTokens = Objects.requireNonNull(refreshTokens, "refreshTokens");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.smtpSender = Objects.requireNonNull(smtpSender, "smtpSender");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * E-mails a 6-digit reset code to the account with {@code email} and
     * stores its SHA-256 hash for 15 minutes, invalidating any earlier
     * active code for the same user (one active code per user). For
     * unknown emails this is a silent no-op — callers cannot distinguish
     * it from success.
     */
    public void requestReset(String email) {
        Objects.requireNonNull(email, "email");
        RegisteredUser user = users.findByEmail(email);
        if (user == null || user.getId() == null) {
            return;
        }
        Instant now = clock.instant();
        tokens.deleteActiveByUserId(user.getId(), now);
        String code = sixDigitCode();
        tokens.save(new PasswordResetToken(user.getId(), Hashes.sha256Hex(code), now.plus(CODE_TTL)));
        smtpSender.send(user.getData().email(),
                "Shelter Map password reset code: " + code + " (valid 15 min)");
    }

    /**
     * Validates the code for the account {@code email}, sets the new
     * password, marks the code used and revokes every refresh token of the
     * user — all in ONE transaction.
     *
     * <p>Checks, in order: an active code exists (never requested, used or
     * expired codes are not active) → attempts &lt; {@link #MAX_ATTEMPTS} →
     * hash match (constant-time). A wrong code increments the stored
     * attempts (persisted); ANY failure is indistinguishable to the caller,
     * so the UI shows one generic "invalid or expired" message.
     *
     * @return {@code true} only when the code was valid, unused and unexpired.
     */
    @Transactional
    public boolean reset(String email, String code, String newPassword) {
        Objects.requireNonNull(email, "email");
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(newPassword, "newPassword");
        RegisteredUser user = users.findByEmail(email);
        if (user == null || user.getId() == null) {
            return false;
        }
        PasswordResetToken stored = tokens.findActiveByUserId(user.getId(), clock.instant());
        if (stored == null) {
            return false;
        }
        if (stored.getAttempts() >= MAX_ATTEMPTS) {
            return false; // locked out — no further attempt churn
        }
        if (!MessageDigest.isEqual(stored.getTokenHash().getBytes(StandardCharsets.UTF_8),
                Hashes.sha256Hex(code).getBytes(StandardCharsets.UTF_8))) {
            stored.recordAttempt();
            tokens.save(stored);
            return false;
        }
        credentials.updateHash(user.getId(), passwordHasher.hash(newPassword));
        tokens.markUsed(stored.getId());
        refreshTokens.revokeAllForUser(user.getId());
        return true;
    }

    private static String sixDigitCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
