package ee.sheltermap.verification;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/**
 * Orchestrates verification: dispatches to the right
 * {@link VerificationProvider} by level and <strong>owns all persistence</strong>
 * — saves {@link PendingVerification} on request, saves + attaches a
 * {@link VerificationClaim} on successful confirmation.
 *
 * <p>Providers stay pure channel adapters; they never touch the database.
 * (Claim revocation is pure domain state — {@code RegisteredUser.revoke} —
 * with no HTTP surface, so there is no service method for it.)
 *
 * <p>Anti-spam, checked in this order on every request:
 * <ol>
 *   <li>level already verified → 409, before any code is sent or throttle
 *       budget is consumed;</li>
 *   <li>per (user, level): the resend cooldown, then the per-UTC-day cap,
 *       on the durable {@link VerificationSendLog} → 429;</li>
 *   <li>per contact (e-mail / E.164 phone): the rolling
 *       {@link RollingContactOtpLimiter} — the volume valve on REAL sends
 *       (Twilio/SMTP cost) → 429, with the admin alert ring entry.</li>
 * </ol>
 * The daily slot is consumed only when the channel ACCEPTS the send (see
 * {@link #requestVerification}). Violations raise
 * {@link VerificationThrottledException} (→ 429); the checks deliberately
 * say nothing about the contact's existence.
 */
public class VerificationService {

    private final Map<VerificationLevel, VerificationProvider> providers;
    private final PendingVerificationRepository pendingRepository;
    private final VerificationSendLog sendLog;
    private final RollingContactOtpLimiter contactLimiter;
    private final VerificationProperties properties;
    private final Clock clock;
    private final ThrottleAlertRecorder alerts;

    /**
     * @param providers          provider per level; a level without a provider is rejected
     * @param pendingRepository  persistence seam for pending codes
     * @param sendLog            durable send log behind the cooldown + daily cap
     * @param contactLimiter     rolling per-contact cap;
     *                           {@code maxPerWindow <= 0} disables it
     * @param properties         throttle config ({@code cooldownSeconds}, {@code maxPerDay})
     * @param clock              time source (injectable for deterministic tests)
     * @param alerts             the admin alert ring — the
     *                           per-contact cap events land here
     */
    public VerificationService(Map<VerificationLevel, VerificationProvider> providers,
                               PendingVerificationRepository pendingRepository,
                               VerificationSendLog sendLog,
                               RollingContactOtpLimiter contactLimiter,
                               VerificationProperties properties,
                               Clock clock,
                               ThrottleAlertRecorder alerts) {
        this.providers = new EnumMap<>(VerificationLevel.class);
        if (providers != null) {
            this.providers.putAll(providers);
        }
        this.pendingRepository = Objects.requireNonNull(pendingRepository, "pendingRepository");
        this.sendLog = Objects.requireNonNull(sendLog, "sendLog");
        this.contactLimiter = Objects.requireNonNull(contactLimiter, "contactLimiter");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.alerts = Objects.requireNonNull(alerts, "alerts");
    }

    /**
     * Starts verification for {@code level}: the provider generates + sends
     * the code, the service persists the pending verification. Any previous
     * active code for the same user+level is invalidated (one code at a
     * time).
     *
     * <p>Why the contact cap runs AFTER the user-level gate: a
     * cooldown/daily-cap reject then records nothing in the contact's
     * window; and if the contact cap fires, the user-level send-log entry
     * stays (bounded over-count — e-mail and phone are unique per user, so
     * the contact's budget was spent by this same user's real sends).
     *
     * <p>The durable daily slot is consumed ONLY when the channel ACCEPTS
     * the send (throwaway-then-record): the cooldown/cap decision is a
     * read-only check, the {@link VerificationSendLog#record record} happens
     * after the provider's send succeeds. A channel outage must not burn a
     * slot the user never gets a code for — and the pattern stays safe
     * because the check is bounded by the ATOMIC per-contact rolling cap
     * (the hard burst valve on real sends): a concurrent burst that slips
     * past the unrecorded reads can overcount the daily cap by at most the
     * in-flight window, and every ACCEPTED send is recorded, so a failing
     * channel can never be used to bypass the cap (refused sends are never
     * recorded, accepted ones always are — the daily cap still bounds real,
     * costing deliveries).
     *
     * <p>Transaction boundary: the channel send and the file-based send log
     * happen BEFORE any database work in this method, so the lazy
     * connection is only held for the final read-delete-save — not for the
     * network call. That read-delete-save is ONE transaction: a failure
     * between the delete and the save must not leave the old code alive
     * under the new one.
     *
     * @throws VerificationThrottledException when the cooldown has not elapsed
     *                                        or the daily cap is reached (→ 429,
     *                                        with {@code Retry-After} when computable)
     */
    @Transactional
    public void requestVerification(RegisteredUser user, VerificationLevel level) {
        if (user.levels().contains(level)) {
            throw new AlreadyVerifiedException(level);
        }
        VerificationProvider provider = providerFor(level);
        long userId = user.getId();
        Instant now = clock.instant();
        String contact = contactFor(user, level);

        requireUserThrottleAllows(userId, level, now);
        requireContactCapAllows(contact);

        PendingVerification pending;
        try {
            pending = provider.request(user);
        } catch (CodeSendFailedException channelRefused) {
            // The channel did not accept the message (the sender logged it).
            // Anti-enumeration: the endpoint still answers its plain ack —
            // nothing about the outcome may reach the client. Honesty: no
            // pending code is persisted for a code nobody received, no
            // daily slot is consumed (the outage is not the user's fault),
            // and the operator sees it in the alert ring.
            alerts.codeSendFailure(contact, provider.providerCode());
            return;
        }

        // The channel accepted the send — it is REAL now (it costs
        // Twilio/SMTP money), so the durable record is made for it: the
        // daily cap counts sends that happened.
        sendLog.record(userId, level, contact, now);
        replacePending(userId, level, now, pending);
    }

    /**
     * The per-(user, level) gate, read-only: the resend cooldown first,
     * then the per-UTC-day cap — the same decision and silent-skip rules as
     * the send log's atomic {@code tryRecord} ({@code cooldownSeconds <= 0}
     * skips the cooldown, {@code maxPerDay <= 0} skips the cap). A
     * throttled decision records nothing and throws the generic 429 (which
     * throttle fired is never revealed) with the exact seconds a retry may
     * wait.
     */
    private void requireUserThrottleAllows(long userId, VerificationLevel level, Instant now) {
        VerificationSendLog.SendDecision decision = userThrottleDecision(userId, level, now);
        if (decision == VerificationSendLog.SendDecision.OK) {
            return;
        }
        throw new VerificationThrottledException(VerificationThrottledException.DEFAULT_MESSAGE,
                retryAfterSeconds(decision, userId, level, now));
    }

    private VerificationSendLog.SendDecision userThrottleDecision(long userId,
                                                                  VerificationLevel level,
                                                                  Instant now) {
        Instant lastSentAt = sendLog.lastSentAt(userId, level);
        if (properties.cooldownSeconds() > 0
                && lastSentAt != null
                && now.isBefore(lastSentAt.plusSeconds(properties.cooldownSeconds()))) {
            return VerificationSendLog.SendDecision.COOLDOWN;
        }
        if (properties.maxPerDay() > 0
                && sendLog.countToday(userId, level) >= properties.maxPerDay()) {
            return VerificationSendLog.SendDecision.DAILY_CAP;
        }
        return VerificationSendLog.SendDecision.OK;
    }

    /**
     * The rolling per-contact cap — the volume valve on REAL sends
     * (Twilio/SMTP cost). The "verify:" namespace keeps it independent of
     * the "register:" attempt cap (registering an account must not eat its
     * verification-send budget). ATOMIC check-and-acquire — the burst valve
     * that keeps the throwaway-then-record pattern from amplifying
     * concurrent sends past the per-contact window. A throttled contact
     * lands in the admin alert ring before the 429 goes out.
     */
    private void requireContactCapAllows(String contact) {
        RollingContactOtpLimiter.Result contactResult = contactLimiter.tryAcquire("verify:" + contact);
        if (contactResult.decision() != RollingContactOtpLimiter.Decision.THROTTLED) {
            return;
        }
        alerts.otpContactCap(contact, contactResult.retryAfterSeconds());
        throw new VerificationThrottledException(VerificationThrottledException.DEFAULT_MESSAGE,
                contactResult.retryAfterSeconds());
    }

    /**
     * One code at a time: the still-active code for user+level is deleted
     * and the new one saved in the same transaction (see
     * {@link #requestVerification}).
     */
    private void replacePending(long userId, VerificationLevel level, Instant now,
                                PendingVerification pending) {
        pendingRepository.findActiveByUserAndLevel(userId, level, now)
                .ifPresent(pendingRepository::delete);
        pendingRepository.save(pending);
    }

    /**
     * The honest "seconds until a resend is allowed" for a throttled
     * decision, computed from the SAME clock the decision used: the cooldown
     * path counts down from the last recorded send, the daily-cap path
     * counts down to the next UTC midnight where the cap resets (rounded up
     * — waiting that long guarantees the reset; the frontend formats long
     * durations).
     */
    private int retryAfterSeconds(VerificationSendLog.SendDecision decision, long userId,
                                  VerificationLevel level, Instant now) {
        return switch (decision) {
            case COOLDOWN -> {
                Instant lastSentAt = sendLog.lastSentAt(userId, level);
                long secondsSince = lastSentAt == null
                        ? 0 : Duration.between(lastSentAt, now).getSeconds();
                yield (int) Math.max(0, properties.cooldownSeconds() - secondsSince);
            }
            case DAILY_CAP -> (int) Math.max(0, secondsUntilNextUtcMidnight(now));
            case OK -> throw new IllegalStateException("no retry-after for an allowed send");
        };
    }

    /** Seconds from {@code now} to the next UTC midnight, rounded up. */
    private static long secondsUntilNextUtcMidnight(Instant now) {
        Instant nextMidnight = LocalDate.now(ZoneOffset.UTC).plusDays(1)
                .atStartOfDay(ZoneOffset.UTC).toInstant();
        long millis = nextMidnight.toEpochMilli() - now.toEpochMilli();
        return (millis + 999) / 1000;
    }

    /**
     * The channel contact the send log records for a level — the same value
     * the provider sends the code to (E.164 phone for PHONE, the e-mail for
     * EMAIL). SMART_ID has no stored-code channel (stub); the e-mail stands
     * in, and the controller rejects SMART_ID before any send.
     */
    private static String contactFor(RegisteredUser user, VerificationLevel level) {
        if (level == VerificationLevel.PHONE) {
            return PhoneNumbers.normalizeE164(user.getData().phone());
        }
        return user.getData().email();
    }

    /**
     * Confirms {@code code} for {@code level}. On success: persists a
     * {@link VerificationClaim}, attaches it to the user and consumes the
     * one-time pending code. Returns {@code false} on wrong/expired/exhausted
     * code or when no active code exists — never reveals which.
     *
     * <p>Re-confirming an already-verified level is an idempotent no-op
     * ({@code true}): without the guard, the second confirm re-inserts an
     * active claim row and violates the V3 partial unique index.
     *
     * <p>Transaction boundary: the pending read, the attempt-count save
     * (wrong code) and the consuming delete (right code) run in ONE
     * transaction. The read degrades on a legacy duplicate pair (a racy
     * double send; the table's (user_id, level) index is non-unique) —
     * {@code findFirst}, the {@code PasswordResetService} idiom — instead of
     * 500-ing with {@code IncorrectResultSizeDataAccessException}.
     */
    @Transactional
    public boolean confirmVerification(RegisteredUser user, VerificationLevel level, String code) {
        if (user.levels().contains(level)) {
            return true;
        }
        VerificationProvider provider = providerFor(level);
        PendingVerification pending = pendingRepository
                .findActiveByUserAndLevel(user.getId(), level, clock.instant())
                .orElse(null);
        if (pending == null) {
            return false;
        }
        if (!provider.confirm(user, pending, code)) {
            // Persist the attempt count: the JPA repo re-maps a fresh object on
            // every request, so without this save the attempts limit would never
            // hold across HTTP calls (the attempts limit is deliberate).
            pendingRepository.save(pending);
            return false;
        }
        VerificationClaim claim = new VerificationClaim(
                level, provider.providerCode(), pending.getContact(), clock.instant());
        user.addVerification(claim);
        pendingRepository.delete(pending);
        return true;
    }

    private VerificationProvider providerFor(VerificationLevel level) {
        VerificationProvider provider = providers.get(Objects.requireNonNull(level, "level"));
        if (provider == null) {
            throw new IllegalArgumentException("no verification provider for " + level);
        }
        return provider;
    }
}
