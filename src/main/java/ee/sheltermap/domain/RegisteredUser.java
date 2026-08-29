package ee.sheltermap.domain;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Account holder (Penguin) — becomes verified over time via
 * {@link VerificationClaim claims} (data, never subclasses).
 */
public class RegisteredUser extends User {

    private static final VerificationPolicy DEFAULT_POLICY = new VerificationPolicy(VerificationRules.ofDefaults());

    private final String name;
    private final String email;
    private final String phone;
    private final String nationalIdCode;
    private final Set<VerificationClaim> verifications = new LinkedHashSet<>();

    public RegisteredUser(String name, String email, String phone, String nationalIdCode) {
        this.name = Objects.requireNonNull(name, "name");
        this.email = Objects.requireNonNull(email, "email");
        this.phone = Objects.requireNonNull(phone, "phone");
        this.nationalIdCode = Objects.requireNonNull(nationalIdCode, "nationalIdCode");
    }

    /** Adds a verified claim (called by the verification service on success). */
    public void addVerification(VerificationClaim claim) {
        verifications.add(Objects.requireNonNull(claim, "claim"));
    }

    /**
     * Read access to the full claim set, revoked ones included — needed by
     * the persistence layer (Step 3) to store the aggregate. Business code
     * should prefer {@link #levels()}.
     */
    public Set<VerificationClaim> claims() {
        return Collections.unmodifiableSet(verifications);
    }

    /** Revokes the active claim for {@code level}, if any. No-op otherwise. */
    public void revoke(VerificationLevel level) {
        verifications.stream()
                .filter(c -> c.getLevel() == level && !c.isRevoked())
                .findFirst()
                .ifPresent(VerificationClaim::revoke);
    }

    /** Derived, never stored: levels of all non-revoked claims. */
    public Set<VerificationLevel> levels() {
        Set<VerificationLevel> active = verifications.stream()
                .filter(c -> !c.isRevoked())
                .map(VerificationClaim::getLevel)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return Collections.unmodifiableSet(active);
    }

    @Override
    public boolean canWrite() {
        return DEFAULT_POLICY.allows(levels(), Capability.SUBMIT_SHELTER);
    }

    @Override
    public UserData getData() {
        return new UserData(name, email, phone, nationalIdCode, levels());
    }

    @Override
    public void deleteAccount() {
        // Domain-level cascade: drop all verification claims.
        // Service-level cascade (reviews, credentials, tokens) is later steps.
        verifications.clear();
    }
}
