package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;

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
 * with no HTTP surface in v1, so there is no service method for it.)
 *
 * <p>Anti-spam (Twilio plan): every request is throttled per (user, level)
 * via the durable {@link VerificationSendLog} — a resend cooldown plus a
 * per-user daily cap. Violations raise {@link VerificationThrottledException}
 * (→ 429); the check deliberately says nothing about the contact's existence.
 */
public class VerificationService {

    private final Map<VerificationLevel, VerificationProvider> providers;
    private final PendingVerificationRepository pendingRepository;
    private final VerificationSendLog sendLog;
    private final VerificationProperties properties;
    private final Clock clock;

    /**
     * @param providers          provider per level; a level without a provider is rejected
     * @param pendingRepository  persistence seam for pending codes
     * @param sendLog            durable send log behind the cooldown + daily cap
     * @param properties         throttle config ({@code cooldownSeconds}, {@code maxPerDay})
     * @param clock              time source (injectable for deterministic tests)
     */
    public VerificationService(Map<VerificationLevel, VerificationProvider> providers,
                               PendingVerificationRepository pendingRepository,
                               VerificationSendLog sendLog,
                               VerificationProperties properties,
                               Clock clock) {
        this.providers = new EnumMap<>(VerificationLevel.class);
        if (providers != null) {
            this.providers.putAll(providers);
        }
        this.pendingRepository = Objects.requireNonNull(pendingRepository, "pendingRepository");
        this.sendLog = Objects.requireNonNull(sendLog, "sendLog");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * Starts verification for {@code level}: the provider generates + sends
     * the code, the service persists the pending verification. Any previous
     * active code for the same user+level is invalidated (one code at a time).
     *
     * @throws VerificationThrottledException when the cooldown has not elapsed
     *                                        or the daily cap is reached (→ 429,
     *                                        with {@code Retry-After} when computable)
     */
    public void requestVerification(RegisteredUser user, VerificationLevel level) {
        if (user.levels().contains(level)) {
            // P1 fix: requesting a level that is already verified is a conflict
            // (409). No code is sent and no throttle budget is consumed.
            throw new AlreadyVerifiedException(level);
        }
        VerificationProvider provider = providerFor(level);
        long userId = Objects.requireNonNull(user, "user").getId();
        Instant now = clock.instant();

        // M16 (2026-09-10 review): ONE atomic check-and-record on the send
        // log — the old read-read-record across separately-synchronized
        // methods let a burst pass both reads before either recorded. A
        // throttled decision records nothing; an OK decision has ALREADY
        // recorded the send (so there is no trailing record() call).
        VerificationSendLog.SendDecision decision = sendLog.tryRecord(
                userId, level, contactFor(user, level), now,
                properties.cooldownSeconds(), properties.maxPerDay());
        if (decision != VerificationSendLog.SendDecision.OK) {
            // Same generic message as before (which throttle fired is never
            // revealed); the numeric retry-after is the new part — the client
            // counts down instead of spam-clicking into repeated 429s.
            throw new VerificationThrottledException(VerificationThrottledException.DEFAULT_MESSAGE,
                    retryAfterSeconds(decision, userId, level, now));
        }

        PendingVerification pending = provider.request(user);
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
     * EMAIL). SMART_ID has no stored-code channel in v1 (stub); the e-mail
     * stands in, and the controller rejects SMART_ID before any send.
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
     */
    public boolean confirmVerification(RegisteredUser user, VerificationLevel level, String code) {
        if (user.levels().contains(level)) {
            // P1 fix: re-confirming an already-verified level is an idempotent
            // no-op. Without this guard, the second confirm re-inserts an
            // active claim row and violates the V3 partial unique index.
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
            // hold across HTTP calls (Step-2 key decision: attempts-limited).
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
