package ee.sheltermap.verification;

import ee.sheltermap.config.VerificationProperties;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;

import java.time.Clock;
import java.time.Instant;
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
     *                                        or the daily cap is reached (→ 429)
     */
    public void requestVerification(RegisteredUser user, VerificationLevel level) {
        VerificationProvider provider = providerFor(level);
        long userId = Objects.requireNonNull(user, "user").getId();
        Instant now = clock.instant();

        long cooldownSeconds = properties.cooldownSeconds();
        if (cooldownSeconds > 0) {
            Instant lastSentAt = sendLog.lastSentAt(userId, level);
            if (lastSentAt != null && now.isBefore(lastSentAt.plusSeconds(cooldownSeconds))) {
                throw new VerificationThrottledException();
            }
        }
        int maxPerDay = properties.maxPerDay();
        if (maxPerDay > 0 && sendLog.countToday(userId, level) >= maxPerDay) {
            throw new VerificationThrottledException();
        }

        PendingVerification pending = provider.request(user);
        pendingRepository.findActiveByUserAndLevel(userId, level)
                .ifPresent(pendingRepository::delete);
        pendingRepository.save(pending);
        sendLog.record(userId, level, pending.getContact(), now);
    }

    /**
     * Confirms {@code code} for {@code level}. On success: persists a
     * {@link VerificationClaim}, attaches it to the user and consumes the
     * one-time pending code. Returns {@code false} on wrong/expired/exhausted
     * code or when no active code exists — never reveals which.
     */
    public boolean confirmVerification(RegisteredUser user, VerificationLevel level, String code) {
        VerificationProvider provider = providerFor(level);
        PendingVerification pending = pendingRepository
                .findActiveByUserAndLevel(user.getId(), level)
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
                level, provider.providerCode(), pending.getContact(), Instant.now());
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
