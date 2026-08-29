package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/**
 * Orchestrates verification: dispatches to the right
 * {@link VerificationProvider} by level and <strong>owns all persistence</strong>
 * — saves {@link PendingVerification} on request, saves + attaches a
 * {@link VerificationClaim} on successful confirmation, revokes on demand.
 *
 * <p>Providers stay pure channel adapters; they never touch the database.
 */
public class VerificationService {

    private final Map<VerificationLevel, VerificationProvider> providers;
    private final PendingVerificationRepository pendingRepository;

    /**
     * @param providers        provider per level; a level without a provider is rejected
     * @param pendingRepository persistence seam for pending codes
     */
    public VerificationService(Map<VerificationLevel, VerificationProvider> providers,
                               PendingVerificationRepository pendingRepository) {
        this.providers = new EnumMap<>(VerificationLevel.class);
        if (providers != null) {
            this.providers.putAll(providers);
        }
        this.pendingRepository = Objects.requireNonNull(pendingRepository, "pendingRepository");
    }

    /**
     * Starts verification for {@code level}: the provider generates + sends
     * the code, the service persists the pending verification. Any previous
     * active code for the same user+level is invalidated (one code at a time).
     */
    public void requestVerification(RegisteredUser user, VerificationLevel level) {
        VerificationProvider provider = providerFor(level);
        PendingVerification pending = provider.request(user);
        pendingRepository.findActiveByUserAndLevel(user.getId(), level)
                .ifPresent(pendingRepository::delete);
        pendingRepository.save(pending);
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
            return false;
        }
        VerificationClaim claim = new VerificationClaim(
                level, provider.providerCode(), pending.getContact(), Instant.now());
        user.addVerification(claim);
        pendingRepository.delete(pending);
        return true;
    }

    /** Revokes the active claim for {@code level} (no-op if none). */
    public void revoke(RegisteredUser user, VerificationLevel level) {
        user.revoke(level);
    }

    private VerificationProvider providerFor(VerificationLevel level) {
        VerificationProvider provider = providers.get(Objects.requireNonNull(level, "level"));
        if (provider == null) {
            throw new IllegalArgumentException("no verification provider for " + level);
        }
        return provider;
    }
}
