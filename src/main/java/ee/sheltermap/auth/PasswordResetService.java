package ee.sheltermap.auth;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.verification.CodeHashes;
import ee.sheltermap.verification.CodePolicy;
import ee.sheltermap.verification.SmtpSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Objects;
import java.util.function.Supplier;

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
 * active code valid, so the endpoint still answers the identical 200 ack
 * (no enumeration, no rotation oracle). The confirm path is
 * additionally rate-limited per (IP, e-mail) at the controller (S1a).
 *
 * <p>The provisioned admin (kind {@code ADMIN}) is the ONE exception to
 * the anti-enumeration uniformity: both the request and the confirm are
 * refused with 403 naming the environment provisioning — its password is
 * set by the deployment environment (ADMIN_PASSWORD), not by the app.
 */
@Service
public class PasswordResetService {

    static final Duration CODE_TTL = Duration.ofMinutes(15);

    /**
     * The 403 refusal for the provisioned admin's password change: its
     * credentials are the deployment environment's (ADMIN_PASSWORD), not
     * the app's — the reset flow must never be able to re-write them.
     */
    public static final String PROVISIONED_ADMIN_RESET_MESSAGE =
            "The environment-provisioned administrator account cannot use password reset — "
                    + "its password is set by the deployment environment";

    /** Min gap between two reissues for the same user (S1b). */
    static final Duration REISSUE_COOLDOWN = Duration.ofSeconds(60);
    /** Max reissues per user per UTC day (S1b). */
    static final int MAX_REISSUES_PER_UTC_DAY = 5;

    /** The reissue cooldown in whole seconds — the value the request ack body tells clients to count down. */
    static int reissueCooldownSeconds() {
        return (int) REISSUE_COOLDOWN.getSeconds();
    }

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserRepository users;
    private final UserCredentialsRepository credentials;
    private final PasswordResetTokenRepository tokens;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordHasher passwordHasher;
    private final SmtpSender smtpSender;
    private final PiiCrypto piiCrypto;
    private final Clock clock;
    /** Null in plain unit tests (in-memory repos are not transactional). */
    private final TransactionTemplate tx;

    /** Unit-test constructor — no transaction manager. */
    public PasswordResetService(UserRepository users,
                                UserCredentialsRepository credentials,
                                PasswordResetTokenRepository tokens,
                                RefreshTokenRepository refreshTokens,
                                PasswordHasher passwordHasher,
                                SmtpSender smtpSender,
                                PiiCrypto piiCrypto,
                                Clock clock) {
        this(users, credentials, tokens, refreshTokens, passwordHasher, smtpSender, piiCrypto, clock, null);
    }

    @Autowired
    public PasswordResetService(UserRepository users,
                                UserCredentialsRepository credentials,
                                PasswordResetTokenRepository tokens,
                                RefreshTokenRepository refreshTokens,
                                PasswordHasher passwordHasher,
                                SmtpSender smtpSender,
                                PiiCrypto piiCrypto,
                                Clock clock,
                                PlatformTransactionManager txManager) {
        this.users = Objects.requireNonNull(users, "users");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.tokens = Objects.requireNonNull(tokens, "tokens");
        this.refreshTokens = Objects.requireNonNull(refreshTokens, "refreshTokens");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.smtpSender = Objects.requireNonNull(smtpSender, "smtpSender");
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.tx = txManager == null ? null : new TransactionTemplate(txManager);
    }

    /**
     * Runs {@code work} in one transaction when a transaction manager is
     * present; in plain unit tests (in-memory fakes) it runs directly.
     * This is the ShelterImportService idiom — the boundary belongs to the
     * service, because the send between the two phases must sit OUTSIDE
     * any transaction.
     */
    private <T> T inTransaction(Supplier<T> work) {
        if (tx == null) {
            return work.get();
        }
        return tx.execute(status -> work.get());
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
     * code valid — the answer is the identical ack success, and a
     * rotation brute-force window never opens.
     *
     * <p>Send-first-then-commit (reviews F2): this method is deliberately
     * NOT {@code @Transactional} — the SMTP exchange must not hold a
     * pooled database connection, and this endpoint is unauthenticated,
     * so a slow provider could otherwise pin the pool with ordinary
     * traffic. The shape is the codebase's own
     * VerificationService throwaway-then-record idiom:
     * <ol>
     *   <li>ONE transaction runs the read-side decision (user lookup,
     *       the admin refusal, the expiry prune, the cooldown and the
     *       per-UTC-day cap). A vetoed request commits only the prune —
     *       exactly what the old single transaction would have committed
     *       (the sender reports failures by returning false, it never
     *       threw, so a refused send never rolled the prune back);
     *       a refused send commits NOTHING else.</li>
     *   <li>the send happens OUTSIDE any transaction — no connection is
     *       checked out for the network call;</li>
     *   <li>ONLY after the provider accepts, ONE transaction writes the
     *       row: the delete-then-insert that keeps ONE active code per
     *       user must stay atomic, so the pair lives in the same
     *       transaction (the V8 delete-then-insert contract).</li>
     * </ol>
     * A refused send therefore writes NO token row and anchors NO
     * cooldown — the user may retry immediately instead of being
     * throttled for a code nobody received. An after-commit callback is
     * the wrong tool here on purpose: it would commit the token BEFORE
     * the send outcome is known, inverting the failure semantics (a
     * committed token + cooldown anchor suppressing the user's retry).
     */
    public void requestReset(String email) {
        Objects.requireNonNull(email, "email");
        // Phase 1 — the decision, one consistent snapshot (read + prune).
        ResetDecision decision = inTransaction(() -> decide(email));
        if (decision == null || decision.recipient == null) {
            return; // unknown e-mail / admin refusal threw / cooldown / cap
        }
        // Phase 2 — the send, outside any transaction.
        String code = Codes.sixDigitCode();
        boolean accepted = smtpSender.send(decision.recipient,
                AppInfo.APP_DISPLAY_NAME + " password reset code: " + code + " (valid 15 min)");
        if (!accepted) {
            // The channel logged the error. Honesty: no token row is
            // written for a code nobody received, and the cooldown/cap
            // anchors are untouched — the outage costs the user nothing
            // and the retry is not suppressed. Anti-enumeration holds:
            // the endpoint still answered the identical ack.
            log.info("Reset code send refused by the channel — no token row "
                    + "written, no cooldown anchored (user may retry)");
            return;
        }
        // Phase 3 — the write, one transaction (atomic one-active-code).
        inTransaction(() -> {
            tokens.deleteActiveByUserId(decision.userId, clock.instant());
            tokens.save(new PasswordResetToken(decision.userId,
                    piiCrypto.codeHash(PiiCrypto.DOMAIN_CODE_PASSWORD_RESET, code),
                    clock.instant().plus(CODE_TTL)));
            return null;
        });
    }

    /** The read-side decision of {@link #requestReset}, or its veto. */
    private ResetDecision decide(String email) {
        RegisteredUser user = users.findByEmail(email);
        if (user == null || user.getId() == null) {
            return new ResetDecision(null, null);
        }
        // The env-provisioned admin is the one non-uniform answer: its
        // password is the environment's (ADMIN_PASSWORD), and a code e-mailed
        // to its address would let anyone who finds the mailbox re-key the
        // deployment's access path. Refused, named, 403.
        if (user instanceof AdminUser) {
            throw new ProvisionedAdminProtectedException(PROVISIONED_ADMIN_RESET_MESSAGE);
        }
        Instant now = clock.instant();
        // Prune this user's rows past expiry first (S1c — bounds table
        // growth for active users; a global prune of dormant users' old
        // rows is a scheduler job, not per-request work). Pruned BEFORE
        // the latest/cap reads, as in the pre-refactor single transaction:
        // the order is the observable contract (an expired row neither
        // anchors the cooldown window nor counts against the day cap).
        tokens.deleteExpiredByUserId(user.getId(), now);
        Instant latest = tokens.findLatestCreatedAtByUserId(user.getId());
        if (latest != null && Duration.between(latest, now).compareTo(REISSUE_COOLDOWN) < 0) {
            log.debug("Reset re-issue skipped (cooldown): userId={}, latest={}", user.getId(), latest);
            return new ResetDecision(user.getId(), null);
        }
        LocalDate utcDay = now.atZone(ZoneOffset.UTC).toLocalDate();
        if (tokens.countCreatedOnUtcDayByUserId(user.getId(), utcDay) >= MAX_REISSUES_PER_UTC_DAY) {
            log.info("Reset re-issue skipped (per-UTC-day cap): userId={}, day={}", user.getId(), utcDay);
            return new ResetDecision(user.getId(), null);
        }
        return new ResetDecision(user.getId(), user.getData().email());
    }

    /** Phase 1's outcome: {@code recipient == null} means the request was vetoed (silent no-op). */
    private record ResetDecision(Long userId, String recipient) {
    }

    /**
     * Validates the code for the account {@code email}, sets the new
     * password, marks the code used and revokes every refresh token of the
     * user — all in ONE transaction.
     *
     * <p>Checks, in order: an active code exists (never requested, used or
     * expired codes are not active) → attempts &lt; {@link CodePolicy#MAX_ATTEMPTS} →
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
        // Defense in depth: no code can be ISSUED for the provisioned admin
        // (requestReset refuses), but a direct confirm must not rewrite the
        // environment's credentials either — same 403, same message.
        if (user instanceof AdminUser) {
            throw new ProvisionedAdminProtectedException(PROVISIONED_ADMIN_RESET_MESSAGE);
        }
        PasswordResetToken stored = tokens.findActiveByUserId(user.getId(), clock.instant());
        if (stored == null) {
            return false;
        }
        if (stored.getAttempts() >= CodePolicy.MAX_ATTEMPTS) {
            return false; // locked out — no further attempt churn
        }
        if (!CodeHashes.matches(piiCrypto, stored.getTokenHash(),
                PiiCrypto.DOMAIN_CODE_PASSWORD_RESET, code)) {
            stored.recordAttempt();
            tokens.save(stored);
            return false;
        }
        credentials.updateHash(user.getId(), passwordHasher.hash(newPassword));
        // The usedAt stamp comes from the injected Clock, not the
        // wall clock inside the domain object.
        stored.markUsed(clock.instant());
        tokens.save(stored);
        refreshTokens.revokeAllForUser(user.getId());
        return true;
    }
}
