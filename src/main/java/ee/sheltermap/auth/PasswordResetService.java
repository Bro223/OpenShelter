package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.SmtpSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 *
 * <p>Rotation protection (S1b, V8 {@code created_at}): re-issuing a code is
 * throttled per user — a 60-second cooldown and a per-UTC-day cap of 5
 * reissues. Both skip paths are silent no-ops that leave the current
 * active code valid, so the endpoint still answers the identical empty
 * 200 (no enumeration, no rotation oracle). The confirm path is
 * additionally rate-limited per (IP, e-mail) at the controller (S1a).
 */
@Service
public class PasswordResetService {

    static final Duration CODE_TTL = Duration.ofMinutes(15);
    static final int MAX_ATTEMPTS = 5;

    /** Min gap between two reissues for the same user (S1b). */
    static final Duration REISSUE_COOLDOWN = Duration.ofSeconds(60);
    /** Max reissues per user per UTC day (S1b). */
    static final int MAX_REISSUES_PER_UTC_DAY = 5;

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

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
     *
     * <p>Rotation protection (S1b): a re-request inside the {@link
     * #REISSUE_COOLDOWN}, or beyond the {@link #MAX_REISSUES_PER_UTC_DAY}
     * per-UTC-day cap, is a silent no-op that leaves the current active
     * code valid — the answer is the identical empty success, and a
     * rotation brute-force window never opens.
     */
    @Transactional
    public void requestReset(String email) {
        Objects.requireNonNull(email, "email");
        RegisteredUser user = users.findByEmail(email);
        if (user == null || user.getId() == null) {
            return;
        }
        Instant now = clock.instant();
        // Prune this user's rows past expiry first (S1c — bounds table
        // growth for active users; a global prune of dormant users' old
        // rows is a scheduler job, not per-request work).
        tokens.deleteExpiredByUserId(user.getId(), now);
        Instant latest = tokens.findLatestCreatedAtByUserId(user.getId());
        if (latest != null && Duration.between(latest, now).compareTo(REISSUE_COOLDOWN) < 0) {
            log.debug("Reset re-issue skipped (cooldown): userId={}, latest={}", user.getId(), latest);
            return;
        }
        LocalDate utcDay = now.atZone(ZoneOffset.UTC).toLocalDate();
        if (tokens.countCreatedOnUtcDayByUserId(user.getId(), utcDay) >= MAX_REISSUES_PER_UTC_DAY) {
            log.info("Reset re-issue skipped (per-UTC-day cap): userId={}, day={}", user.getId(), utcDay);
            return;
        }
        tokens.deleteActiveByUserId(user.getId(), now);
        String code = Codes.sixDigitCode();
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
        if (!Hashes.constantTimeEquals(stored.getTokenHash(), Hashes.sha256Hex(code))) {
            stored.recordAttempt();
            tokens.save(stored);
            return false;
        }
        credentials.updateHash(user.getId(), passwordHasher.hash(newPassword));
        tokens.markUsed(stored.getId());
        refreshTokens.revokeAllForUser(user.getId());
        return true;
    }
}
