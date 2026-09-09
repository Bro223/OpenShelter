package ee.sheltermap.auth;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.ContactChangeType;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.PhoneNumbers;
import ee.sheltermap.verification.SmsSender;
import ee.sheltermap.verification.SmtpSender;
import ee.sheltermap.verification.VerificationThrottledException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

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
 */
@Service
public class ContactChangeService {

    private final UserRepository userRepository;
    private final PendingContactChangeRepository changes;
    private final SmsSender smsSender;
    private final SmtpSender smtpSender;
    private final ContactChangeProperties properties;
    private final Clock clock;

    public ContactChangeService(UserRepository userRepository,
                                PendingContactChangeRepository changes,
                                SmsSender smsSender,
                                SmtpSender smtpSender,
                                ContactChangeProperties properties,
                                Clock clock) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.changes = Objects.requireNonNull(changes, "changes");
        this.smsSender = Objects.requireNonNull(smsSender, "smsSender");
        this.smtpSender = Objects.requireNonNull(smtpSender, "smtpSender");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    // ---- Email change (verified by SMS to the current phone) ----

    /**
     * Starts an email change: checks the target, enforces the cooldown, then
     * sends an SMS code to the current phone and persists the pending change.
     *
     * @throws DuplicateAccountException      the new email is already in use (409)
     * @throws InvalidContactChangeException  the new email equals the current one (400)
     * @throws VerificationThrottledException resend too soon (429)
     */
    @Transactional
    public void requestEmailChange(RegisteredUser user, String newEmail) {
        String target = newEmail.trim().toLowerCase(Locale.ROOT);
        if (target.equalsIgnoreCase(user.getData().email())) {
            throw new InvalidContactChangeException("New email equals the current email");
        }
        if (userRepository.findByEmail(target) != null) {
            throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_EMAIL_MESSAGE);
        }
        enforceCooldown(user.getId(), ContactChangeType.EMAIL_CHANGE);

        String code = Codes.sixDigitCode();
        Instant now = clock.instant();
        replacePending(new PendingContactChange(user.getId(), ContactChangeType.EMAIL_CHANGE,
                target, Hashes.sha256Hex(code), now.plusSeconds(properties.codeTtlSeconds()), now));
        smsSender.send(user.getData().phone(),
                AppInfo.APP_DISPLAY_NAME + " change-email code: " + code + " (valid " + codeTtlMinutes() + " min)");
    }

    /**
     * Completes an email change once the SMS code is verified.
     *
     * @throws InvalidContactChangeException no pending request, or wrong/
     *                                       expired/exhausted code (400)
     */
    @Transactional
    public void confirmEmailChange(RegisteredUser user, String code) {
        PendingContactChange change = requirePending(user.getId(), ContactChangeType.EMAIL_CHANGE);
        verifyCode(change, code);
        String target = change.getTarget();
        // The target may have been claimed by another account between request
        // and confirm (it was checked at request time only) — re-check, and
        // convert a DB-level race into the same 409 (P2 fix).
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
    }

    // ---- Phone change (verified by email to the current email) ----

    /**
     * Starts a phone change: normalizes E.164, checks the target, enforces the
     * cooldown, then sends an email code to the current email and persists the
     * pending change.
     */
    @Transactional
    public void requestPhoneChange(RegisteredUser user, String newPhone) {
        String target = PhoneNumbers.normalizeE164(newPhone);
        if (target.equals(user.getData().phone())) {
            throw new InvalidContactChangeException("New phone equals the current phone");
        }
        if (userRepository.findByPhone(target) != null) {
            throw new DuplicateAccountException(DuplicateAccountException.DUPLICATE_PHONE_MESSAGE);
        }
        enforceCooldown(user.getId(), ContactChangeType.PHONE_CHANGE);

        String code = Codes.sixDigitCode();
        Instant now = clock.instant();
        replacePending(new PendingContactChange(user.getId(), ContactChangeType.PHONE_CHANGE,
                target, Hashes.sha256Hex(code), now.plusSeconds(properties.codeTtlSeconds()), now));
        smtpSender.send(user.getData().email(),
                AppInfo.APP_DISPLAY_NAME + " change-phone code: " + code + " (valid " + codeTtlMinutes() + " min)");
    }

    /**
     * Completes a phone change once the email code is verified.
     */
    @Transactional
    public void confirmPhoneChange(RegisteredUser user, String code) {
        PendingContactChange change = requirePending(user.getId(), ContactChangeType.PHONE_CHANGE);
        verifyCode(change, code);
        String target = change.getTarget();
        // P2 fix: re-check the target (claimed between request and confirm?)
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
    }

    // ---- Internals ----

    /**
     * Cooldown anchored on the pending row: while one exists, a new request is
     * rejected until {@code cooldownSeconds} after it was created. Once the
     * cooldown has elapsed the old pending change is replaced (unique
     * (user, type) constraint — never two at once).
     */
    private void enforceCooldown(Long userId, ContactChangeType type) {
        changes.findByUserIdAndType(userId, type).ifPresent(existing -> {
            Instant earliest = existing.getCreatedAt().plusSeconds(properties.cooldownSeconds());
            if (clock.instant().isBefore(earliest)) {
                throw new VerificationThrottledException();
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
                .orElseThrow(() -> new InvalidContactChangeException("No pending " + type + " request"));
    }

    private void verifyCode(PendingContactChange change, String code) {
        Instant now = clock.instant();
        if (change.isExpired(now)) {
            throw new InvalidContactChangeException("Code expired, request a new one");
        }
        if (change.isAttemptExhausted(properties.maxAttempts())) {
            throw new InvalidContactChangeException("Too many attempts, request a new code");
        }
        if (!Hashes.constantTimeEquals(change.getCodeHash(), Hashes.sha256Hex(code))) {
            change.registerFailedAttempt();
            changes.save(change);
            throw new InvalidContactChangeException("Invalid code");
        }
    }

    /**
     * The user-facing validity window, derived from the configured code TTL
     * (hardening: the copy must not hardcode a TTL that is configurable).
     */
    private long codeTtlMinutes() {
        return properties.codeTtlSeconds() / 60;
    }
}
