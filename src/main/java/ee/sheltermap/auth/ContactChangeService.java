package ee.sheltermap.auth;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.ContactChangeType;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.PhoneNumbers;
import ee.sheltermap.verification.SmsSender;
import ee.sheltermap.verification.SmtpSender;
import ee.sheltermap.verification.VerificationThrottledException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Supplier;

/**
 * Cross-channel contact changes (product decision, see 04-CONTEXT-AUTH.md):
 * <ul>
 *   <li>changing the <strong>email</strong> requires an SMS code sent to the
 *       current phone</li>
 *   <li>changing the <strong>phone</strong> requires an email code sent to the
 *       current email</li>
 * </ul>
 *
 * <p>Stealing only one channel is not enough to hijack the account: an
 * attacker who holds the email cannot change it (needs the phone) and one who
 * holds the phone cannot change it (needs the email).
 *
 * <p>Discipline mirrors verification: code hashed (SHA-256) at rest, 15-min
 * TTL, 5-attempt limit, one pending change per (user, type) — a new request
 * replaces the old. Requests are additionally throttled per client IP at the
 * controller and by a resend cooldown anchored on the pending row.
 *
 * <p>The provisioned admin (kind {@code ADMIN}) is refused at every entry
 * point with 403: its contacts are the environment's — the e-mail is the
 * provisioning anchor the startup seeder keys on (re-pointing it would fork
 * the env identity into a second admin row), and the account has no phone
 * route by design.
 */
@Service
public class ContactChangeService {

    /**
     * The 403 refusal for the provisioned admin's contact change: the
     * environment-provisioned administrator's contacts are set by the
     * deployment environment, not the account.
     */
    public static final String PROVISIONED_ADMIN_CONTACT_MESSAGE =
            "The environment-provisioned administrator account's contacts are set by the "
                    + "deployment environment and cannot be changed from the app";

    private final UserRepository userRepository;
    private final PendingContactChangeRepository changes;
    private final SmsSender smsSender;
    private final SmtpSender smtpSender;
    private final ContactChangeProperties properties;
    private final Clock clock;
    /** Null in plain unit tests (in-memory repos are not transactional). */
    private final TransactionTemplate tx;

    private static final Logger log = LoggerFactory.getLogger(ContactChangeService.class);

    /** Unit-test constructor — no transaction manager. */
    public ContactChangeService(UserRepository userRepository,
                                PendingContactChangeRepository changes,
                                SmsSender smsSender,
                                SmtpSender smtpSender,
                                ContactChangeProperties properties,
                                Clock clock) {
        this(userRepository, changes, smsSender, smtpSender, properties, clock, null);
    }

    @Autowired
    public ContactChangeService(UserRepository userRepository,
                                PendingContactChangeRepository changes,
                                SmsSender smsSender,
                                SmtpSender smtpSender,
                                ContactChangeProperties properties,
                                Clock clock,
                                PlatformTransactionManager txManager) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.changes = Objects.requireNonNull(changes, "changes");
        this.smsSender = Objects.requireNonNull(smsSender, "smsSender");
        this.smtpSender = Objects.requireNonNull(smtpSender, "smtpSender");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.tx = txManager == null ? null : new TransactionTemplate(txManager);
    }

    /**
     * Runs {@code work} in one transaction when a transaction manager is
     * present; in plain unit tests (in-memory fakes) it runs directly.
     * The boundary belongs to the service because the provider send must
     * sit OUTSIDE any transaction (send-first-then-commit, reviews F2).
     */
    private <T> T inTransaction(Supplier<T> work) {
        if (tx == null) {
            return work.get();
        }
        return tx.execute(status -> work.get());
    }

    // ---- Email change (verified by SMS to the current phone) ----

    /**
     * Starts an email change: checks the target, enforces the cooldown,
     * then sends an SMS code to the current phone and persists the pending
     * change — send-first-then-commit (reviews F2/F5): the send happens
     * OUTSIDE any transaction, and the pending row is written ONLY after
     * the provider accepts. A refused send therefore leaves NO pending
     * row and anchors NO cooldown — the user may retry immediately
     * instead of being throttled for a code nobody received (the
     * persist-before-send order armed the cooldown with an undelivered
     * code; the verification flow was already send-first).
     *
     * <p>Transaction shape: the read-side checks run in ONE transaction
     * (a consistent snapshot), the send runs with no transaction at all,
     * and the pending-row replace (delete + insert under the unique
     * (user_id, type) constraint) runs in ONE transaction.
     *
     * @throws DuplicateAccountException      the new email is already in use (409)
     * @throws InvalidContactChangeException  the new email equals the current one (400)
     * @throws VerificationThrottledException resend too soon (429)
     */
    public void requestEmailChange(RegisteredUser user, String newEmail) {
        requireNotProvisionedAdmin(user);
        String target = newEmail.trim().toLowerCase(Locale.ROOT);
        // Phase 1 — the checks, one read-side transaction.
        inTransaction(() -> {
            if (target.equalsIgnoreCase(user.getData().email())) {
                throw new InvalidContactChangeException("New email equals the current email");
            }
            if (userRepository.findByEmail(target) != null) {
                throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_EMAIL_MESSAGE);
            }
            enforceCooldown(user.getId(), ContactChangeType.EMAIL_CHANGE);
            return null;
        });
        // Phase 2 — the send, outside any transaction (no pooled connection
        // is held across the SMS exchange; the channel is a third party).
        String code = Codes.sixDigitCode();
        Instant now = clock.instant();
        boolean accepted = smsSender.send(user.getData().phone(),
                AppInfo.APP_DISPLAY_NAME + " change-email code: " + code + " (valid " + codeTtlMinutes() + " min)");
        if (!accepted) {
            // The channel logged the error. Honesty: the pending row is the
            // cooldown anchor — refusing to write it means the outage costs
            // the user nothing and the retry is not suppressed.
            log.info("Email-change code send refused by the channel — no pending "
                    + "row written, no cooldown anchored (user may retry)");
            return;
        }
        // Phase 3 — the write, one transaction.
        inTransaction(() -> {
            replacePending(new PendingContactChange(user.getId(), ContactChangeType.EMAIL_CHANGE,
                    target, Hashes.sha256Hex(code), now.plusSeconds(properties.codeTtlSeconds()), now));
            return null;
        });
    }

    /**
     * Completes an email change once the SMS code is verified.
     *
     * <p>Mirrors {@code AuthService.resetPassword}:
     * the code failure is returned, not thrown — this transaction then
     * COMMITS the failed-attempt increment instead of rolling it back, so
     * the 5-attempt lockout actually holds across HTTP calls. The
     * controller turns a failed result into the 400.
     *
     * @throws InvalidContactChangeException no pending request (400)
     * @throws DuplicateAccountException     the new email is already in use (409)
     */
    @Transactional
    public ContactChangeResult confirmEmailChange(RegisteredUser user, String code) {
        requireNotProvisionedAdmin(user);
        PendingContactChange change = requirePending(user.getId(), ContactChangeType.EMAIL_CHANGE);
        String failure = verifyCode(change, code);
        if (failure != null) {
            return ContactChangeResult.failure(failure);
        }
        String target = change.getTarget();
        // The target may have been claimed by another account between request
        // and confirm (it was checked at request time only) — re-check, and
        // convert a DB-level race into the same 409.
        if (userRepository.findByEmail(target) != null) {
            throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_EMAIL_MESSAGE);
        }
        user.changeEmail(target);
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException race) {
            throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_EMAIL_MESSAGE);
        }
        changes.delete(change);
        return ContactChangeResult.success();
    }

    // ---- Phone change (verified by email to the current email) ----

    /**
     * Starts a phone change: normalizes E.164, checks the target, enforces the
     * cooldown, then sends an email code to the current email and persists the
     * pending change. Send-first-then-commit, exactly as
     * {@link #requestEmailChange}: the pending row (the cooldown anchor) is
     * written only after the provider accepts the send, and the SMTP exchange
     * never holds a pooled connection.
     */
    public void requestPhoneChange(RegisteredUser user, String newPhone) {
        requireNotProvisionedAdmin(user);
        String target = PhoneNumbers.normalizeE164(newPhone);
        // Phase 1 — the checks, one read-side transaction.
        inTransaction(() -> {
            if (target.equals(user.getData().phone())) {
                throw new InvalidContactChangeException("New phone equals the current phone");
            }
            if (userRepository.findByPhone(target) != null) {
                throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_PHONE_MESSAGE);
            }
            enforceCooldown(user.getId(), ContactChangeType.PHONE_CHANGE);
            return null;
        });
        // Phase 2 — the send, outside any transaction.
        String code = Codes.sixDigitCode();
        Instant now = clock.instant();
        boolean accepted = smtpSender.send(user.getData().email(),
                AppInfo.APP_DISPLAY_NAME + " change-phone code: " + code + " (valid " + codeTtlMinutes() + " min)");
        if (!accepted) {
            log.info("Phone-change code send refused by the channel — no pending "
                    + "row written, no cooldown anchored (user may retry)");
            return;
        }
        // Phase 3 — the write, one transaction.
        inTransaction(() -> {
            replacePending(new PendingContactChange(user.getId(), ContactChangeType.PHONE_CHANGE,
                    target, Hashes.sha256Hex(code), now.plusSeconds(properties.codeTtlSeconds()), now));
            return null;
        });
    }

    /**
     * Completes a phone change once the email code is verified (same
     * return-the-failure shape as {@link #confirmEmailChange}).
     */
    @Transactional
    public ContactChangeResult confirmPhoneChange(RegisteredUser user, String code) {
        requireNotProvisionedAdmin(user);
        PendingContactChange change = requirePending(user.getId(), ContactChangeType.PHONE_CHANGE);
        String failure = verifyCode(change, code);
        if (failure != null) {
            return ContactChangeResult.failure(failure);
        }
        String target = change.getTarget();
        // Re-check the target (claimed between request and confirm?)
        // and convert a DB-level race into the same 409.
        if (userRepository.findByPhone(target) != null) {
            throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_PHONE_MESSAGE);
        }
        user.changePhone(target);
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException race) {
            throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_PHONE_MESSAGE);
        }
        changes.delete(change);
        return ContactChangeResult.success();
    }

    // ---- Internals ----

    /**
     * The provisioned admin's contacts belong to the environment: the
     * e-mail is the provisioning anchor (the seeder keys on it at every
     * startup) and the account has no phone route by design. Refused at
     * every entry point, before any check or side effect (403).
     */
    private static void requireNotProvisionedAdmin(RegisteredUser user) {
        if (user instanceof AdminUser) {
            throw new ProvisionedAdminProtectedException(PROVISIONED_ADMIN_CONTACT_MESSAGE);
        }
    }

    /**
     * Cooldown anchored on the pending row: while one exists, a new request is
     * rejected until {@code cooldownSeconds} after it was created. Once the
     * cooldown has elapsed the old pending change is replaced (unique
     * (user, type) constraint — never two at once).
     */
    private void enforceCooldown(Long userId, ContactChangeType type) {
        changes.findByUserIdAndType(userId, type).ifPresent(existing -> {
            Instant now = clock.instant();
            Instant earliest = existing.getCreatedAt().plusSeconds(properties.cooldownSeconds());
            if (now.isBefore(earliest)) {
                // Same generic message as before; the countdown is anchored on
                // the pending row's creation (the cooldown anchor).
                long remaining = Duration.between(now, earliest).getSeconds();
                throw new VerificationThrottledException(VerificationThrottledException.DEFAULT_MESSAGE,
                        (int) Math.max(0, remaining));
            }
        });
    }

    private void replacePending(PendingContactChange change) {
        changes.findByUserIdAndType(change.getUserId(), change.getType())
                .ifPresent(changes::delete);
        changes.save(change);
    }

    private PendingContactChange requirePending(Long userId, ContactChangeType type) {
        return changes.findByUserIdAndType(userId, type)
                .orElseThrow(() -> new InvalidContactChangeException("No pending contact-change request"));
    }

    /**
     * Checks the code against the pending change. A WRONG code increments
     * the attempts ATOMICALLY at the store (a conditional UPDATE: a
     * read-modify-write would lose updates under a
     * concurrent wrong-code burst, every request reading attempts=k and
     * writing k+1) and returns the user-facing message — the failure is
     * then committed by the enclosing transaction (the method returns, it
     * never throws for it), which is what makes the lockout persist across
     * HTTP calls: throwing inside the transaction would
     * roll the increment back on every wrong code.
     *
     * @return {@code null} when the code verifies; otherwise the 400 message
     *         ("Invalid code" / "Code expired, request a new one" /
     *         "Too many attempts, request a new code")
     */
    private String verifyCode(PendingContactChange change, String code) {
        Instant now = clock.instant();
        if (change.isExpired(now)) {
            return "Code expired, request a new one";
        }
        // Fast path — the already-persisted counter decides before any write.
        if (change.isAttemptExhausted(properties.maxAttempts())) {
            return "Too many attempts, request a new code";
        }
        if (!Hashes.constantTimeEquals(change.getCodeHash(), Hashes.sha256Hex(code))) {
            // The row-level UPDATE is the lock: 0 rows updated means another
            // confirm already reached the cap (or the row is gone) — straight
            // to the lockout message, never past the counter.
            int updated = changes.incrementAttempts(change.getId(), properties.maxAttempts());
            if (updated == 0) {
                return "Too many attempts, request a new code";
            }
            return "Invalid code";
        }
        return null;
    }

    /**
     * The user-facing validity window, derived from the configured code TTL
     * (the copy must not hardcode a TTL that is configurable).
     */
    private long codeTtlMinutes() {
        return properties.codeTtlSeconds() / 60;
    }
}
